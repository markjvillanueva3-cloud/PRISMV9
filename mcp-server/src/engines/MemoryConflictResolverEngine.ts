/**
 * MemoryConflictResolverEngine.ts — semantic memory-key conflict detection
 * + policy resolution.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-CONFLICT-RESOLUTION (D3).
 *
 * SEMANTIC vs FILE-LEVEL — read this before assuming overlap with the
 * existing guards (D3 exit-condition #5, documented here rather than
 * blocking the autonomous loop on a clarification round-trip):
 *
 *   - `commit-ownership-guard` / `file-claim-guard` are FILE/GIT-LEVEL
 *     *locks*. They run at PreToolUse / pre-commit and PREVENT a second
 *     chat from editing or committing a path another chat has claimed.
 *     They stop the write from ever happening.
 *
 *   - This engine is a SEMANTIC, POST-HOC *reconciliation* layer. Two
 *     chats can legitimately both land a write on the same logical memory
 *     key WITHOUT ever tripping a file-claim: vault-mirror writes
 *     (`memory-mirror-to-vault.mjs`) bypass the claim system entirely,
 *     cross-worktree chats hold independent claim state, and append-style
 *     memo updates race below the granularity a path lock can see. When
 *     that happens the naive outcome is silent last-writer-wins — i.e.
 *     data loss, the exact failure D3 exists to prevent. This engine
 *     detects the divergence AFTER both writes are known (different
 *     SHA-256, different agents) and preserves BOTH versions in
 *     `knowledge/memories/conflicts/<key>.diff.md` with a policy-selected
 *     winner. Complementary to — not a replacement for — the file-level
 *     locks: locks prevent git collisions, this catches the semantic
 *     memory races that slip past locks.
 *
 * DATA-LOSS INVARIANT (drives the design — per-file scrutiny P0):
 * a cross-agent, different-content pair is ALWAYS persisted, regardless
 * of the timestamp window. The `windowMs` only labels the `reason`
 * (`concurrent` = within window, a true race; `superseded` = outside
 * window, a sequential overwrite) and never gates whether the losing
 * version is recorded. Caller clocks are NOT synchronized across
 * hosts/worktrees, so a window-gated DROP would silently lose exactly
 * the cross-host race this engine exists to catch. Preserve-both always
 * (Karpathy R12).
 *
 * PERSISTENCE is append-only and SERIALIZED per key (per-file scrutiny
 * P1, two rounds). Round 1 caught a lost-section race in a
 * read-modify-rewrite design. Round 2 caught that a bare `appendFileSync`
 * is NOT size-atomic: a section embeds two full memo bodies (each bounded
 * at 5 MB), so two concurrent appends to the same key could *interleave*
 * into a torn section — the D4 sibling's append-JSONL model does NOT
 * transfer here because its records are tiny single lines, ours are
 * multi-MB. Fix: every create-or-append for a given key runs inside an
 * advisory per-key lockfile (`<file>.lock`, exclusive `wx`, bounded spin,
 * stale-steal, fail-loud on timeout). Within the lock the header is
 * created once (`wx`) and each section is a single append — serialized,
 * so sections can neither be dropped NOR torn. The readback for
 * `sectionsInFile` is inside the lock too, so the count is exact.
 *
 * Section counting uses an out-of-band HTML-comment SENTINEL, not the
 * human-readable `## Conflict @` heading: hostile memo content can
 * contain a `## Conflict @` line, which would inflate a heading-based
 * count and lie about how many conflicts the file holds (per-file
 * scrutiny P0). Any literal sentinel occurrence inside embedded content
 * is escaped so it cannot be miscounted as a real section boundary.
 *
 * API shape mirrors the D4 sibling (ActionTraceEngine): a pure detector
 * (`detectConflict`) + a side-effecting resolver (`resolveConflict`) +
 * a frozen singleton, path resolved PER CALL so the
 * `PRISM_MEMORY_CONFLICT_DIR` env override is honoured by hermetic tests
 * that set it after import. NOTE: `H:/.claude/rules/engines.md` rule 1
 * ("export a class with static methods") is intentionally WAIVED here to
 * match the D4 memory-layer sibling's functional + frozen-singleton
 * shape — surfaced, not silent (Karpathy R7/R11). The sibling passed the
 * wiring/Stop gate with this exact shape.
 *
 * @module engines/MemoryConflictResolverEngine
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D3
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { PATHS } from "../constants.js";

export const MEMORY_CONFLICT_SCHEMA_VERSION = "1.0.0";
export const MEMORY_CONFLICT_ENGINE_VERSION = "1.0.0";

/** Out-of-band section delimiter. Counted instead of the `## Conflict @`
 *  heading so hostile memo content can't forge a section boundary. Any
 *  occurrence of this exact token inside embedded content is escaped. */
const SECTION_SENTINEL = "<!-- prism:conflict-section -->";
const SECTION_SENTINEL_RE = /^<!-- prism:conflict-section -->$/gm;

/**
 * Resolution policy. `last-writer` keeps the chronologically later write,
 * `first-writer` the earlier; `human-arbitrate` auto-selects NO winner —
 * the diff file is written marked unresolved for an operator to settle.
 */
export const ConflictPolicySchema = z
  .enum(["last-writer", "first-writer", "human-arbitrate"])
  .describe(
    "Conflict resolution policy: last-writer | first-writer | human-arbitrate.",
  );

export type ConflictPolicy = z.infer<typeof ConflictPolicySchema>;

/**
 * One side of a memory-key write. `content` MAY be the empty string (an
 * emptied memo is a legitimate — and conflict-worthy — state); `agent`
 * identifies the chat (the conflict unit is the chat, so two writes from
 * the SAME agent id are never a cross-chat conflict). `.strict()` so a
 * fat-fingered extra key fails loud (Karpathy R12).
 */
export const MemoryWriteSchema = z
  .object({
    agent: z
      .string()
      .min(1)
      .max(64)
      .describe("Chat/agent id that produced this write, e.g. claude-c0f06dee"),
    sessionId: z
      .string()
      .min(1)
      .max(64)
      .describe("Stable session id the write happened under"),
    content: z
      .string()
      .max(5_000_000)
      .describe("Full written content of the memory entry (may be empty)"),
    ts: z
      .string()
      .min(1)
      .describe("ISO-8601 timestamp of the write"),
  })
  .strict();

export type MemoryWrite = z.infer<typeof MemoryWriteSchema>;

export interface ConflictDetectionInput {
  /** Logical memory key — sanitized to a basename (no slashes / `..`). */
  key: string;
  /** The write already on record for this key. */
  existing: MemoryWrite;
  /** The new incoming write for the same key. */
  incoming: MemoryWrite;
  /** Concurrency window in ms (default 30000). Within → reason
   *  "concurrent" (a true race); beyond → reason "superseded" (a
   *  sequential overwrite). Either way the conflict IS persisted. */
  windowMs?: number;
  /** Resolution policy (default last-writer). */
  policy?: ConflictPolicy;
}

export type ConflictReason =
  | "concurrent"
  | "superseded"
  | "identical-content"
  | "same-author";

export interface ConflictDetectionResult {
  /** True for concurrent | superseded (both are persisted). */
  conflict: boolean;
  /** concurrent | superseded | identical-content | same-author. */
  reason: ConflictReason;
  /** Sanitized key the detection ran on. */
  key: string;
  /** sha256 of existing.content (full 64 hex). */
  existingHash: string;
  /** sha256 of incoming.content (full 64 hex). */
  incomingHash: string;
  /** |incoming.ts - existing.ts| in ms. */
  deltaMs: number;
  /** Effective window used. */
  windowMs: number;
  /** Effective policy used. */
  policy: ConflictPolicy;
  /** Winning write, or null for human-arbitrate / no-conflict. */
  winner: MemoryWrite | null;
  /** Which side won: "existing" | "incoming" | null. */
  winnerRole: "existing" | "incoming" | null;
}

export interface ConflictResolutionResult extends ConflictDetectionResult {
  /** True when a diff file was written/appended (i.e. a real conflict). */
  written: boolean;
  /** Basename of the conflict file (host path NOT leaked), or null. */
  file: string | null;
  /** Number of conflict sections in the file after this write
   *  (counted via the un-forgeable sentinel). */
  sectionsInFile: number;
  /** True when the per-key lock could not be acquired within the
   *  timeout and the record was preserved to a unique spill file
   *  (`*.diff.locktimeout-*`) instead of the canonical `<key>.diff.md`.
   *  The conflict is NEVER lost — an operator/cron reconciles spills. */
  degraded: boolean;
}

const DEFAULT_WINDOW_MS = 30_000;
const MAX_KEY_LEN = 200;
/** Per-key advisory lock tuning.
 *
 * `LOCK_STALE_MS` must comfortably EXCEED the worst-case legitimate lock
 * hold so a slow-but-alive owner is never wrongly stolen (round-3 Arm-A
 * P1): a section embeds two memo bodies each capped at 5 MB
 * (MemoryWriteSchema.content.max) → a ~10 MB append + a full-file
 * readback, which on a slow/contended/network volume can take many
 * seconds. 60 s is well above that for any realistic vault volume while
 * still bounding a genuinely crashed/reaped owner (a documented routine
 * failure in this fleet: fleet-reaper, xmalloc fork-storms).
 *
 * `LOCK_TIMEOUT_MS` must be GREATER than `LOCK_STALE_MS` (round-3 Arm-B
 * P0): otherwise a waiter gives up BEFORE a crashed-owner's lock becomes
 * stealable, and the conflict record would be lost — the exact data loss
 * D3 exists to prevent. With timeout > stale, a crashed lock is always
 * stolen within the wait budget. And even on a true timeout the record
 * is NEVER dropped: `resolveConflict` spills it to a unique
 * contention-free `*.diff.locktimeout-*` file (preserve-both invariant).
 * Overridable via env purely so the spill path is unit-testable without
 * a 90 s wait. */
const LOCK_STALE_MS = 60_000;
const LOCK_SPIN_MS = 20;
function lockTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PRISM_MEMORY_CONFLICT_LOCK_TIMEOUT_MS;
  if (raw && raw.trim()) {
    const n = Number(raw.trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 90_000;
}
const ISO_TS_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Resolve the conflicts directory. `PRISM_MEMORY_CONFLICT_DIR` wins so
 * tests get a hermetic temp dir; default is
 * `<PRISM_ROOT>/knowledge/memories/conflicts`. Read per-call so an env
 * set after import still takes effect. The override is `path.resolve`d
 * so a relative override is anchored deterministically (the final file
 * path is containment-checked in resolveConflict).
 */
function conflictDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.PRISM_MEMORY_CONFLICT_DIR;
  if (override && override.trim()) return path.resolve(override.trim());
  return path.join(PATHS.KNOWLEDGE_DIR, "memories", "conflicts");
}

/** Frozen-time override for deterministic tests/audits (mirrors the D4
 *  sibling's frozen-time knob). Falls back to wall clock. */
function nowIso(env: NodeJS.ProcessEnv = process.env): string {
  const frozen = env.PRISM_MEMORY_CONFLICT_FROZEN_TIME;
  if (frozen && frozen.trim()) {
    const d = new Date(frozen.trim());
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Sanitize a raw memory key to a safe filename stem. The conflict file is
 * `<key>.diff.md`; a key with slashes, `..`, or YAML/control characters
 * would either traverse out of the conflicts dir or corrupt the
 * frontmatter. Fail loud on anything outside `[\w.-]+` (Karpathy R12) —
 * silently rewriting a hostile key could collide two distinct keys onto
 * one conflict file and lose data.
 *
 * @param raw caller-supplied key (often a memo basename)
 * @returns the sanitized key (basename, `.md` suffix stripped)
 */
export function sanitizeKey(raw: string): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(
      "MemoryConflictResolverEngine: key must be a non-empty string",
    );
  }
  // Reduce to a basename first so `a/b/c.md` → `c.md`, then drop a single
  // trailing `.md` (the conflict file adds `.diff.md` itself).
  let k = raw.trim().replace(/\\/g, "/");
  k = k.slice(k.lastIndexOf("/") + 1);
  k = k.replace(/\.md$/i, "");
  if (k === "" || k === "." || k === "..") {
    throw new Error(
      `MemoryConflictResolverEngine: key resolves to an unsafe value: ${JSON.stringify(raw)}`,
    );
  }
  if (k.length > MAX_KEY_LEN) {
    throw new Error(
      `MemoryConflictResolverEngine: key too long (${k.length} > ${MAX_KEY_LEN})`,
    );
  }
  if (!/^[\w.-]+$/.test(k)) {
    throw new Error(
      `MemoryConflictResolverEngine: key has unsafe characters (allowed [\\w.-]): ${JSON.stringify(raw)}`,
    );
  }
  return k;
}

/** sha256 hex of content (full 64 — this is an integrity check, not a
 *  compact-line concern, so unlike D4's 16-char prompt hash we keep all
 *  256 bits). */
export function hashContent(content: string): string {
  return crypto
    .createHash("sha256")
    .update(String(content), "utf8")
    .digest("hex");
}

/** Parse a STRICT ISO-8601 ts to epoch ms; throw on unparseable or
 *  loose-but-numeric input (`new Date("2026")` would otherwise coerce).
 *  Fail-loud matches D4's recordTrace ts handling — a bad ts must never
 *  silently window/sort wrong. */
function tsMs(ts: string, side: string): number {
  if (!ISO_TS_RE.test(ts)) {
    throw new Error(
      `MemoryConflictResolverEngine: ${side} ts is not strict ISO-8601 ${JSON.stringify(ts)}`,
    );
  }
  const ms = new Date(ts).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(
      `MemoryConflictResolverEngine: unparseable ${side} ts ${JSON.stringify(ts)}`,
    );
  }
  return ms;
}

/** Internal: parse + classify, returning the parsed writes too so the
 *  resolver reuses them instead of re-parsing (per-file scrutiny P1). */
function classify(input: ConflictDetectionInput): {
  result: ConflictDetectionResult;
  existing: MemoryWrite;
  incoming: MemoryWrite;
} {
  const key = sanitizeKey(input.key);
  const existing = MemoryWriteSchema.parse(input.existing);
  const incoming = MemoryWriteSchema.parse(input.incoming);
  const policy = ConflictPolicySchema.parse(input.policy ?? "last-writer");
  const windowMs =
    input.windowMs === undefined ? DEFAULT_WINDOW_MS : input.windowMs;
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error(
      `MemoryConflictResolverEngine: windowMs must be a positive finite number, got ${String(input.windowMs)}`,
    );
  }

  const existingHash = hashContent(existing.content);
  const incomingHash = hashContent(incoming.content);
  const eMs = tsMs(existing.ts, "existing");
  const iMs = tsMs(incoming.ts, "incoming");
  const deltaMs = Math.abs(iMs - eMs);

  const base = { key, existingHash, incomingHash, deltaMs, windowMs, policy };
  const none = (reason: ConflictReason): ConflictDetectionResult => ({
    ...base,
    conflict: false,
    reason,
    winner: null,
    winnerRole: null,
  });

  // Order: identical content is never a conflict (idempotent re-write /
  // mirror echo). Same agent is never a CROSS-chat conflict (one chat
  // editing its own memo — true regardless of timing, so it takes
  // precedence over the window classification). Only then does the
  // window decide concurrent (race) vs superseded (sequential overwrite)
  // — and BOTH of those are persisted (the data-loss invariant).
  if (existingHash === incomingHash) return { result: none("identical-content"), existing, incoming };
  if (existing.agent === incoming.agent) return { result: none("same-author"), existing, incoming };

  const reason: ConflictReason = deltaMs <= windowMs ? "concurrent" : "superseded";

  let winnerRole: "existing" | "incoming" | null;
  if (policy === "human-arbitrate") {
    winnerRole = null;
  } else if (policy === "last-writer") {
    if (iMs > eMs) winnerRole = "incoming";
    else if (iMs < eMs) winnerRole = "existing";
    else winnerRole = incoming.agent > existing.agent ? "incoming" : "existing";
  } else {
    // first-writer
    if (iMs < eMs) winnerRole = "incoming";
    else if (iMs > eMs) winnerRole = "existing";
    else winnerRole = incoming.agent < existing.agent ? "incoming" : "existing";
  }
  const winner =
    winnerRole === "incoming" ? incoming : winnerRole === "existing" ? existing : null;

  return {
    result: { ...base, conflict: true, reason, winner, winnerRole },
    existing,
    incoming,
  };
}

/**
 * Pure conflict detector. A pair is a CONFLICT (persisted) when content
 * differs (sha256 mismatch) AND the agents differ. The timestamp window
 * only labels the reason — `concurrent` (within window, a true race) vs
 * `superseded` (outside window, a sequential overwrite) — it never gates
 * persistence (the data-loss invariant: caller clocks are unsynchronized
 * across hosts/worktrees, so a window-gated drop would silently lose the
 * cross-host race this engine exists to catch).
 *
 * Non-conflicts: `identical-content` (idempotent re-write / mirror echo),
 * `same-author` (one chat editing its own memo — not a cross-chat race).
 *
 * Winner (concurrent | superseded only):
 *   - last-writer  → later ts; exact-ts tie → GREATER agent id (lexical).
 *   - first-writer → earlier ts; exact-ts tie → LESSER agent id.
 *   - human-arbitrate → winner null (operator settles via the diff file).
 * The exact-ts tiebreak is deterministic so audit replay is reproducible.
 *
 * @param input key + both writes + window/policy
 * @returns full detection result (throws only on bad ts / window / key)
 */
export function detectConflict(
  input: ConflictDetectionInput,
): ConflictDetectionResult {
  return classify(input).result;
}

/** Strip a string to safe single-line Markdown inline-code text: no
 *  backticks (would break the inline span), no CR/LF (would break the
 *  bullet), bounded length. Used for agent/session/ts which the schema
 *  only length-bounds (per-file scrutiny P1 — record-integrity). */
function mdInline(s: string): string {
  return String(s).replace(/[`\r\n]/g, "·").slice(0, 80);
}

/** Replace any literal SECTION_SENTINEL inside embedded memo content so a
 *  hostile/coincidental copy can't be miscounted as a real section
 *  boundary (per-file scrutiny P0). */
function escapeEmbedded(s: string): string {
  return s.split(SECTION_SENTINEL).join("<!-- prism:conflict-section[escaped] -->");
}

/** Render one conflict section (sentinel first, then human-readable
 *  heading + both full versions + a line-level only-in-A/only-in-B
 *  summary; zero-dep, no diff lib). */
function renderSection(
  d: ConflictDetectionResult,
  e: MemoryWrite,
  i: MemoryWrite,
  now: string,
): string {
  const eLines = new Set(e.content.split("\n"));
  const iLines = new Set(i.content.split("\n"));
  const onlyE = [...eLines].filter((l) => !iLines.has(l));
  const onlyI = [...iLines].filter((l) => !eLines.has(l));
  const fence = (s: string) => {
    const esc = escapeEmbedded(s);
    // Fence longer than any backtick run inside so the memo can't break
    // out of the code block.
    const longest = (esc.match(/`+/g) || []).reduce(
      (m, r) => Math.max(m, r.length),
      0,
    );
    const f = "`".repeat(Math.max(3, longest + 1));
    return `${f}\n${esc}\n${f}`;
  };
  return [
    SECTION_SENTINEL,
    `## Conflict @ ${now}`,
    "",
    `- reason: \`${d.reason}\``,
    `- policy: \`${d.policy}\``,
    `- winner: ${d.winnerRole ? `\`${d.winnerRole}\` (agent \`${mdInline(d.winner?.agent ?? "")}\`)` : "**UNRESOLVED — human-arbitrate**"}`,
    `- deltaMs: ${d.deltaMs} (window ${d.windowMs})`,
    `- existing: agent \`${mdInline(e.agent)}\` session \`${mdInline(e.sessionId)}\` @ \`${mdInline(e.ts)}\` sha \`${d.existingHash.slice(0, 12)}\``,
    `- incoming: agent \`${mdInline(i.agent)}\` session \`${mdInline(i.sessionId)}\` @ \`${mdInline(i.ts)}\` sha \`${d.incomingHash.slice(0, 12)}\``,
    "",
    "### Existing version",
    fence(e.content),
    "",
    "### Incoming version",
    fence(i.content),
    "",
    "### Line delta",
    "_Set-based: duplicate lines collapsed. The full versions above are",
    "the authoritative content for operator arbitration._",
    "",
    `Only in existing (${onlyE.length}):`,
    fence(onlyE.join("\n")),
    `Only in incoming (${onlyI.length}):`,
    fence(onlyI.join("\n")),
    "",
  ].join("\n");
}

/** Synchronous sleep via Atomics.wait (allowed on Node's main thread).
 *  Used for the per-key lock spin — keeps the engine fully synchronous
 *  like its D4 sibling (no async leaking into hook/dispatcher callers). */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

type LockOutcome<T> = { acquired: true; value: T } | { acquired: false };

/**
 * Run `fn` while holding an exclusive advisory lock for `file`. The lock
 * is a sidecar `<file>.lock` created with `wx` (atomic exclusive create —
 * the OS guarantees exactly one creator).
 *
 * A crashed/reaped owner leaves a stale lock; one older than
 * `LOCK_STALE_MS` is stolen via an ATOMIC `renameSync` (round-3 Arm-B
 * P1): exactly one racing stealer can rename a given lockfile, the rest
 * get ENOENT and re-loop — so two stealers can never both proceed and
 * tear (the previous `statSync`→`rmSync` steal was a TOCTOU hole).
 *
 * On timeout this returns `{acquired:false}` — it does NOT throw
 * (round-3 Arm-B P0): the caller MUST preserve the record another way
 * (resolveConflict spills to a unique contention-free file). Throwing
 * here would lose the conflict, the exact data loss D3 exists to prevent.
 * A genuine non-EEXIST fs error on the lockfile still throws (real
 * failure, fail-loud). Always releases the lock in `finally`.
 */
function withKeyLock<T>(
  file: string,
  fn: () => T,
  env: NodeJS.ProcessEnv = process.env,
): LockOutcome<T> {
  const lockPath = `${file}.lock`;
  const deadline = Date.now() + lockTimeoutMs(env);
  // Unique per-acquisition ownership token. Written as the FIRST bytes of
  // the lockfile so release can verify it still owns the lock (round-4
  // Arm-B P1): if a legitimately-slow-alive owner is held past
  // LOCK_STALE_MS, a stealer can steal+reacquire; the original owner's
  // `finally` must NOT then delete the NEW owner's lock (which would
  // admit a 3rd concurrent fn() and tear a section). Token-checked
  // release closes that window without weakening anything.
  const lockToken = `${process.pid}:${crypto.randomBytes(8).toString("hex")}`;
  let held = false;
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeSync(fd, `${lockToken} ${new Date().toISOString()}`);
      fs.closeSync(fd);
      held = true;
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      let ageMs = 0;
      try {
        ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
      } catch {
        // Lock vanished between open and stat — owner released it; retry.
        continue;
      }
      if (ageMs > LOCK_STALE_MS) {
        // Crashed/reaped owner — steal ATOMICALLY: rename the stale lock
        // to a unique name. renameSync over an existing path is atomic
        // and only ONE concurrent renamer can win for a given source;
        // losers get ENOENT and simply re-loop (no two-stealer tear).
        const stolen = `${lockPath}.stale-${process.pid}-${crypto
          .randomBytes(4)
          .toString("hex")}`;
        try {
          fs.renameSync(lockPath, stolen);
          fs.rmSync(stolen, { force: true });
        } catch {
          /* another stealer renamed/removed it first — just retry */
        }
        continue;
      }
      if (Date.now() >= deadline) {
        return { acquired: false };
      }
      sleepSync(LOCK_SPIN_MS);
    }
  }
  try {
    return { acquired: true, value: fn() };
  } finally {
    if (held) {
      try {
        // Only delete the lock if it STILL carries our token. If our
        // lock was stale-stolen and reacquired by another holder, the
        // file now starts with THEIR token — deleting it would free a
        // live owner's lock and admit a concurrent fn() (round-4 Arm-B
        // P1). A vanished file (already released) throws → harmless.
        const cur = fs.readFileSync(lockPath, "utf8");
        if (cur.startsWith(lockToken)) {
          fs.rmSync(lockPath, { force: true });
        }
      } catch {
        /* lock vanished (already released/stolen) — nothing to free */
      }
    }
  }
}

/**
 * Detect, and on a real conflict persist `<key>.diff.md`. Append-only BY
 * CONSTRUCTION: the frontmatter header is created exactly once via an
 * exclusive `wx` open; every section is a single `appendFileSync`
 * syscall. No read-modify-write, so two concurrent resolvers on the same
 * key cannot drop each other's section (the per-file-scrutiny P1 race).
 * Both `concurrent` and `superseded` conflicts are persisted (the
 * data-loss invariant). If the per-key lock times out (a crashed/stuck
 * owner), the record is STILL preserved — to a unique contention-free
 * `*.diff.locktimeout-*` spill file with `degraded:true` — never
 * dropped (round-3 Arm-B P0). `file` is a BASENAME — the host path is
 * never leaked through a result a dispatcher might spread (D4 lesson).
 *
 * @param input same shape as detectConflict
 * @param env   process env (PRISM_MEMORY_CONFLICT_DIR / _FROZEN_TIME /
 *              _LOCK_TIMEOUT_MS)
 * @returns detection result + { written, file, sectionsInFile, degraded }
 */
export function resolveConflict(
  input: ConflictDetectionInput,
  env: NodeJS.ProcessEnv = process.env,
): ConflictResolutionResult {
  const { result: d, existing: e, incoming: i } = classify(input);
  if (!d.conflict) {
    return { ...d, written: false, file: null, sectionsInFile: 0, degraded: false };
  }
  const dir = conflictDir(env);
  const fileName = `${d.key}.diff.md`;
  const full = path.join(dir, fileName);
  // Containment defense-in-depth: fileName has no separators (sanitizeKey
  // guarantees `[\w.-]+`), so this always holds — it makes the guarantee
  // the header comment claims explicit + future-proof against a key-scheme
  // change.
  if (path.dirname(path.resolve(full)) !== path.resolve(dir)) {
    throw new Error(
      "MemoryConflictResolverEngine: resolved conflict path escaped the conflicts dir",
    );
  }

  const now = nowIso(env);
  const section = renderSection(d, e, i, now);

  fs.mkdirSync(dir, { recursive: true });

  // Serialize all create-or-append for THIS key so two concurrent
  // resolvers can neither drop nor TEAR a section (round-2 P1: sections
  // embed multi-MB memo bodies → a bare appendFileSync is not
  // size-atomic). The readback is inside the lock so sectionsInFile is
  // exact, not a racy snapshot.
  const header =
    [
      "---",
      `schemaVersion: ${MEMORY_CONFLICT_SCHEMA_VERSION}`,
      `key: ${d.key}`, // key is [\w.-]+ — always a safe bare YAML scalar
      `firstDetectedAt: ${now}`,
      "kind: memory-conflict",
      "milestone: OBSIDIAN-INTELLIGENCE-MS3/D3",
      "---",
      "",
      `# Memory conflict: \`${d.key}\``,
      "",
      "Two chats wrote different content to this memory key. Each",
      "occurrence is recorded below; the operator (or the chosen policy)",
      "settles the winner. This file is APPEND-ONLY — sections are never",
      "rewritten, so a prior conflict record can never be clobbered.",
      "",
    ].join("\n") + "\n";

  const outcome = withKeyLock(
    full,
    (): { file: string; sectionsInFile: number } => {
      try {
        // Exclusive create: the first writer lays down header + its
        // section. A racing second first-writer gets EEXIST and falls
        // through to a plain append (never a header rewrite).
        fs.writeFileSync(full, header + section, { encoding: "utf8", flag: "wx" });
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
        // Append the section. We hold the per-key lock, so this append
        // is serialized against every other resolver for this key — it
        // can neither be dropped nor interleaved/torn even when the
        // section embeds multi-MB memo bodies (round-2 P1 fix).
        fs.appendFileSync(full, "\n" + section, "utf8");
      }
      // Count via the un-forgeable sentinel (NOT the `## Conflict @`
      // heading, which hostile memo content can spoof). Read is inside
      // the lock, so the count is exact, not a racy snapshot.
      const after = fs.readFileSync(full, "utf8");
      const sectionsInFile = (after.match(SECTION_SENTINEL_RE) || []).length;
      return { file: fileName, sectionsInFile };
    },
    env,
  );

  if (outcome.acquired) {
    return { ...d, written: true, ...outcome.value, degraded: false };
  }

  // Lock timed out (a crashed/stuck owner held it past the wait budget).
  // The conflict MUST NOT be lost (the data-loss invariant — round-3
  // Arm-B P0). Spill the full record to a UNIQUE, contention-free file
  // so no lock is needed and no other writer can collide. An operator /
  // reconcile cron folds `*.diff.locktimeout-*` back into the canonical
  // `<key>.diff.md` later. `wx` guarantees the unique name is fresh.
  const spillName = `${d.key}.diff.locktimeout-${process.pid}-${process.hrtime.bigint().toString()}.md`;
  const spillFull = path.join(dir, spillName);
  fs.writeFileSync(spillFull, header + section, { encoding: "utf8", flag: "wx" });
  return { ...d, written: true, file: spillName, sectionsInFile: 1, degraded: true };
}

/**
 * Singleton accessor — matches the catalog convention for direct API use
 * from skills + hooks + a future PostToolUse mirror-race hook.
 */
export const memoryConflictResolverEngine = Object.freeze({
  version: MEMORY_CONFLICT_ENGINE_VERSION,
  schemaVersion: MEMORY_CONFLICT_SCHEMA_VERSION,
  sanitizeKey,
  hashContent,
  detectConflict,
  resolveConflict,
});
