#!/usr/bin/env node
/**
 * cron-registry-reconcile.mjs — CLEANUP-MS0 / U-CLEANUP-G8
 *
 * Drift watcher for the golf hygiene chat's daily cron schedule.
 *
 * The golf chat schedules 5 daily hygiene prompts via Claude's `CronCreate`
 * tool at session start. The canonical list — id, cron expression, prompt —
 * is checked into `state/shared/golf-cron-registry.json` (U-CLEANUP-E2 shipped
 * commit 84154affc). When the golf chat crashes mid-registration or a
 * `CronDelete` slips, the live cron table goes out of sync with the registry;
 * E2's per-cron lockfile gate prevents double-fires but cannot resurrect a
 * missing registration. G8 closes that gap.
 *
 * INPUT MODEL
 *   Claude's `CronList` tool is not callable from Node — it lives in the
 *   harness. So this helper consumes a CronList SNAPSHOT (JSON array OR JSONL,
 *   stdin OR file) and emits an ACTION PLAN that the calling chat applies via
 *   `CronCreate` / `CronDelete`. The action plan is the contract; the helper
 *   itself never touches the cron table directly.
 *
 *   The 15-minute cadence is a property of how the golf chat schedules this
 *   helper (the registry's own `golf-cron-reconcile-self` entry, added in a
 *   follow-up). This script is otherwise event-driven: an operator runs it
 *   on demand by piping `CronList`'s output through stdin.
 *
 * COORDINATION (claim-before-read)
 *   Two golf chats running this helper simultaneously could each compute the
 *   same plan and then race on `CronDelete` + `CronCreate`. We serialize
 *   via a `golf/cron-reconcile` claim in the H8 coordination.db, acquired
 *   BEFORE reading the registry/cron-list and held for the planning + emit
 *   cycle. A second concurrent invocation sees the conflict, exits 1 with
 *   an empty plan, and retries on the next 15-min sweep.
 *
 *   `--no-claim` skips the claim entirely (test mode and bootstrap-time use).
 *   `--dry-run` ALSO skips the claim (no mutation = no contention), but
 *   --session-id is still required for attribution in the result JSON.
 *
 * IDEMPOTENCY
 *   The action plan is computed deterministically from `{registry, cronList}`:
 *     - missing  = registry entries with no matching live cron
 *     - orphaned = live crons whose prompt matches `golf-*` registry shape
 *                  but whose id is NOT in the registry (renamed / removed
 *                  / disabled-but-still-live)
 *     - drifted  = live cron + registry match by id but cronExpr or prompt
 *                  has changed
 *     - ok       = exact match on id + cronExpr + prompt
 *
 *   "golf-*" identification is by three signals (any one is sufficient):
 *     1. live cron's `id`/`jobId` starts with the registry's golf id prefix
 *     2. live cron's `prompt` matches the slash-commands the registry registers
 *        (`/wiki-lint`, `/frontend-merge-plan`, `/close-out-audit`) or the
 *        `Run scripts/golf-*` / `Run node .claude/helpers/...` shapes
 *     3. live cron's `scriptHint` equals one of the registry's known
 *        script-paths
 *   Signal 3 is the most reliable when the harness rewrites prompts.
 *
 * EXIT CODES
 *   0 — success (whether or not the plan is empty)
 *   1 — claim held by another session (race, retry next sweep)
 *   2 — bad args / unreadable input / malformed registry / IO error
 *
 * CLI
 *   node .claude/helpers/cron-registry-reconcile.mjs
 *     [--registry <path>]    default: state/shared/golf-cron-registry.json
 *     [--cron-list <path|->] default: stdin
 *     [--session-id <id>]    required (even with --dry-run)
 *     [--db <path>]          default: state/shared/coordination.db
 *     [--ttl-ms <n>]         claim TTL in ms (default 300000 = 5 min; floor 60000)
 *     [--no-claim]           skip coord_sqlite claim (test / bootstrap)
 *     [--dry-run]            compute + print plan, never claim
 *     [--json]               machine-readable output (default human)
 *     [--now <ISO>]          override clock for hermetic tests
 *
 * Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md (Subsystem G.G8)
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-G8)
 *
 * @see scripts/bootstrap-golf.mjs                            — A6 first-run setup
 * @see state/shared/golf-cron-registry.json                  — E2 registry
 * @see .claude/helpers/golf-cron-lock.mjs                    — per-cron firing lock
 * @see mcp-server/src/engines/CoordinationStoreEngine.ts     — H8 claim store
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hostname as osHostname } from "node:os";

// ─── repo-root derivation (same pattern as handoff-staleness) ───────────────
function deriveRepoRoot() {
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  } catch {
    return "H:/prism";
  }
}
const REPO = process.env.PRISM_REPO_ROOT || deriveRepoRoot();

// ─── defaults / caps ────────────────────────────────────────────────────────
const DEFAULT_REGISTRY = join(REPO, "state/shared/golf-cron-registry.json");
const DEFAULT_DB = join(REPO, "state/shared/coordination.db");
const DEFAULT_TTL_MS = 5 * 60 * 1000;        // 5 min — well below 15-min cadence
const MIN_TTL_MS = 60 * 1000;                // 1 min floor (prevents pathological --ttl-ms 1)
const MAX_STDIN_BYTES = 8 * 1024 * 1024;     // 8 MiB cap; CronList output is ~kB at most
const CLAIM_RESOURCE = "golf/cron-reconcile";
const SCHEMA_VERSION = 1;

// A cron id qualifies as golf-managed when it starts with this prefix. Used
// both by the registry generator and by the drift detector to identify
// orphans without colliding with non-golf crons in the same table.
export const GOLF_ID_PREFIX = "golf-";

// Slash-commands that any of the registered golf crons may use as their
// entire prompt. Matched verbatim against `cron.prompt`. Kept here rather
// than read from the registry's prompt field so a renamed/forked variant
// of the helper still classifies the same set as golf-managed.
const KNOWN_GOLF_SLASH_PROMPTS = new Set([
  "/wiki-lint",
  "/frontend-merge-plan",
  "/close-out-audit",
  "/peer-audit",  // wired in B7
]);

// Regex matches `Run scripts/golf-*` / `Run .claude/helpers/golf-*` and the
// `Run node <path>` flavour used by golf-stale-claim-sweep. The path-segment
// matcher is intentionally broad — the bracketing `Run ` and trailing `.mjs`
// extension prevent false-positives, but ANY path under scripts/ or
// .claude/helpers/ counts (signal 3 — scriptHint equality — is the strict one).
const GOLF_PROMPT_RE = /^Run\s+(?:node\s+)?(?:H:\/prism\/)?(?:scripts|\.claude\/helpers)\//i;

// ─── arg parsing ────────────────────────────────────────────────────────────
/** Pure: parse CLI args. Rejects unknown flags so a typo doesn't silently
 *  fall back to defaults. Accepts both `--flag value` and `--flag=value`. */
export function parseArgs(argv) {
  const out = {
    registry: DEFAULT_REGISTRY,
    cronList: null,            // null = stdin
    sessionId: null,
    db: DEFAULT_DB,
    ttlMs: DEFAULT_TTL_MS,
    noClaim: false,
    dryRun: false,
    json: false,
    now: null,                 // null = Date.now()
    help: false,
  };

  // Normalize `--flag=value` → `--flag value` so the single-pass loop below
  // doesn't need a second code path. This is what PowerShell users expect.
  const flat = [];
  for (const tok of argv) {
    if (typeof tok === "string" && tok.startsWith("--") && tok.includes("=")) {
      const eq = tok.indexOf("=");
      flat.push(tok.slice(0, eq), tok.slice(eq + 1));
    } else {
      flat.push(tok);
    }
  }

  for (let i = 0; i < flat.length; i++) {
    const a = flat[i];
    const take = () => {
      const v = flat[i + 1];
      if (v === undefined) throw new Error(`flag ${a} requires a value`);
      i++;
      return v;
    };
    switch (a) {
      case "--registry":   out.registry = take(); break;
      case "--cron-list":  out.cronList = take(); break;
      case "--session-id": out.sessionId = take(); break;
      case "--db":         out.db = take(); break;
      case "--ttl-ms": {
        const v = Number(take());
        if (!Number.isFinite(v) || v <= 0) throw new Error("--ttl-ms must be a positive number");
        // Floor to MIN_TTL_MS — a 1ms TTL would let the next sweep race
        // before this one finished emitting the plan.
        out.ttlMs = Math.max(MIN_TTL_MS, v);
        break;
      }
      case "--no-claim":   out.noClaim = true; break;
      case "--dry-run":    out.dryRun = true; break;
      case "--json":       out.json = true; break;
      case "--now": {
        const v = take();
        const t = Date.parse(v);
        if (!Number.isFinite(t)) throw new Error(`--now: cannot parse ISO ${v}`);
        out.now = t;
        break;
      }
      case "--help":
      case "-h":           out.help = true; break;
      default:             throw new Error(`unknown flag: ${a}`);
    }
  }
  return out;
}

// ─── input loaders ──────────────────────────────────────────────────────────
/** Pure: parse the cron-list snapshot. Accepts a JSON array (`[{...}, ...]`)
 *  or JSONL (`{...}\n{...}\n...`). Empty input → []. Malformed lines in JSONL
 *  mode are collected into `warnings` rather than thrown — a single corrupt
 *  line should not block the rest of the sweep. */
export function parseCronListSnapshot(text) {
  const warnings = [];
  if (typeof text !== "string") {
    return { items: [], warnings: ["input is not a string"] };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) return { items: [], warnings };

  // Try JSON array first.
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (!Array.isArray(arr)) {
        return { items: [], warnings: [`expected JSON array, got ${typeof arr}`] };
      }
      return { items: arr.filter((x) => x && typeof x === "object"), warnings };
    } catch (e) {
      return { items: [], warnings: [`json-array parse failed: ${(e && e.message) || e}`] };
    }
  }

  // Otherwise JSONL.
  const items = [];
  const lines = trimmed.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === "object") items.push(obj);
      else warnings.push(`line ${i + 1}: not an object`);
    } catch (e) {
      warnings.push(`line ${i + 1}: ${(e && e.message) || e}`);
    }
  }
  return { items, warnings };
}

/** Pure: validate the registry shape. Returns `{ valid: true, entries, meta }`
 *  on success or `{ valid: false, errors }` describing the first few problems.
 *  We require: schemaVersion === 1, crons is an array, each cron has id +
 *  prompt + cronExpr + enabled. Extra registry fields (scheduleUtc, scriptHint,
 *  expectedDurationMs, description, name) are preserved in entries[i].raw AND
 *  surfaced as named properties so buildActionPlan can emit them. Top-level
 *  metadata (lockfileDir, timeBasis, generator, notes) is preserved in
 *  `meta` for forward-compat. */
export function validateRegistry(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["registry is not an object"] };
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion: expected ${SCHEMA_VERSION}, got ${raw.schemaVersion}`);
  }
  if (!Array.isArray(raw.crons)) {
    errors.push("crons: not an array");
    return { valid: false, errors };
  }
  const entries = [];
  const seenIds = new Set();
  for (let i = 0; i < raw.crons.length; i++) {
    const c = raw.crons[i];
    if (!c || typeof c !== "object") { errors.push(`crons[${i}]: not an object`); continue; }
    const id = typeof c.id === "string" ? c.id : null;
    const prompt = typeof c.prompt === "string" ? c.prompt : null;
    const cronExpr = typeof c.cronExpr === "string" ? c.cronExpr : null;
    const enabled = c.enabled === undefined ? true : Boolean(c.enabled);
    if (!id) { errors.push(`crons[${i}]: missing id`); continue; }
    if (!prompt) { errors.push(`crons[${i}] ${id}: missing prompt`); continue; }
    if (!cronExpr) { errors.push(`crons[${i}] ${id}: missing cronExpr`); continue; }
    if (seenIds.has(id)) { errors.push(`crons[${i}] ${id}: duplicate id`); continue; }
    seenIds.add(id);
    if (!id.startsWith(GOLF_ID_PREFIX)) {
      errors.push(`crons[${i}] ${id}: id must start with "${GOLF_ID_PREFIX}"`);
      continue;
    }
    entries.push({
      id,
      prompt,
      cronExpr,
      enabled,
      name:                typeof c.name === "string" ? c.name : null,
      scheduleUtc:         typeof c.scheduleUtc === "string" ? c.scheduleUtc : null,
      description:         typeof c.description === "string" ? c.description : null,
      scriptHint:          typeof c.scriptHint === "string" ? c.scriptHint : null,
      expectedDurationMs:  Number.isFinite(Number(c.expectedDurationMs)) ? Number(c.expectedDurationMs) : null,
      raw: c,
    });
  }
  const meta = {
    lockfileDir: typeof raw.lockfileDir === "string" ? raw.lockfileDir : null,
    timeBasis:   typeof raw.timeBasis === "string"   ? raw.timeBasis   : null,
    generator:   typeof raw.generator === "string"   ? raw.generator   : null,
    notes:       typeof raw.notes === "string"       ? raw.notes       : null,
    generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : null,
  };
  return errors.length ? { valid: false, errors } : { valid: true, entries, meta };
}

// ─── golf-managed classification ────────────────────────────────────────────
/** Pure: decide whether a live cron entry should be considered "golf-managed"
 *  for purposes of orphan detection. We match on three signals (any one is
 *  sufficient) so the helper is tolerant to harness changes:
 *    1. `id` or `jobId` starts with the registry's golf id prefix
 *    2. `prompt` matches the registered shapes — slash-commands the registry
 *       uses (`/wiki-lint` etc.), `Run scripts/golf-*`, or `Run node <path>`
 *    3. `scriptHint` references one of the registry's known script paths
 *
 *  Signal 3 is the most reliable. Signal 2 is widened to match the real
 *  registry's prompts (4 of 5 entries use slash-commands or `Run node`). */
export function isGolfManaged(cron, registryEntries) {
  if (!cron || typeof cron !== "object") return false;
  const id = typeof cron.id === "string" ? cron.id
           : typeof cron.jobId === "string" ? cron.jobId
           : "";
  if (id && id.startsWith(GOLF_ID_PREFIX)) return true;

  const prompt = typeof cron.prompt === "string" ? cron.prompt.trim() : "";
  if (prompt) {
    if (KNOWN_GOLF_SLASH_PROMPTS.has(prompt)) return true;
    if (GOLF_PROMPT_RE.test(prompt)) return true;
    // Also match against the registry's actual prompts — if a prompt verbatim
    // equals a registry entry's prompt, that's a golf cron whose jobId was
    // rewritten by the harness.
    if (Array.isArray(registryEntries)) {
      for (const e of registryEntries) {
        if (e.prompt && e.prompt === prompt) return true;
      }
    }
  }

  const scriptHint = typeof cron.scriptHint === "string" ? cron.scriptHint : "";
  if (scriptHint && Array.isArray(registryEntries)) {
    for (const e of registryEntries) {
      if (e.scriptHint && e.scriptHint === scriptHint) return true;
    }
  }
  return false;
}

/** Pure: extract a stable identity from a live cron for matching against the
 *  registry. CronList responses (per Anthropic harness) carry either `id` or
 *  `jobId`; both are accepted. Returns null when neither is present. */
export function cronIdentity(cron) {
  if (!cron || typeof cron !== "object") return null;
  if (typeof cron.id === "string" && cron.id.length > 0) return cron.id;
  if (typeof cron.jobId === "string" && cron.jobId.length > 0) return cron.jobId;
  return null;
}

/** Pure: extract the cron expression from a live cron, tolerating the three
 *  field names the harness has used historically (cronExpr / cron / schedule).
 *  Returns null when none are present — caller must treat null as "drifted,
 *  field missing", not "matches". */
export function liveCronExpr(cron) {
  if (!cron || typeof cron !== "object") return null;
  if (typeof cron.cronExpr === "string") return cron.cronExpr;
  if (typeof cron.cron === "string") return cron.cron;
  if (typeof cron.schedule === "string") return cron.schedule;
  return null;
}

// ─── diff engine ────────────────────────────────────────────────────────────
/** Pure: classify one live cron against the registry. Returns one of:
 *    {status:"ok",       entry}                — exact match
 *    {status:"drifted",  entry, drift: [...]}  — id matches, fields differ
 *    {status:"orphan"}                          — golf-managed, no registry entry
 *    {status:"foreign"}                         — not golf-managed at all
 *  `drift` enumerates the fields that diverged:
 *    "cronExpr"                 — present but different value
 *    "cronExpr-missing-from-live" — registry has one, live has none
 *    "prompt"                   — present but different value
 *    "prompt-missing-from-live" — registry has one, live has none */
export function classifyCron(cron, registryEntries) {
  const id = cronIdentity(cron);
  if (!id) {
    return isGolfManaged(cron, registryEntries)
      ? { status: "orphan", reason: "no-id" }
      : { status: "foreign" };
  }
  const entry = registryEntries.find((e) => e.id === id);
  if (!entry) {
    return isGolfManaged(cron, registryEntries) ? { status: "orphan" } : { status: "foreign" };
  }
  const liveExpr = liveCronExpr(cron);
  const livePrompt = typeof cron.prompt === "string" ? cron.prompt : null;
  const drift = [];
  if (liveExpr === null) drift.push("cronExpr-missing-from-live");
  else if (liveExpr !== entry.cronExpr) drift.push("cronExpr");
  if (livePrompt === null) drift.push("prompt-missing-from-live");
  else if (livePrompt !== entry.prompt) drift.push("prompt");
  return drift.length === 0 ? { status: "ok", entry } : { status: "drifted", entry, drift };
}

/** Pure: full diff. Returns five arrays:
 *    missing   — registry entries with no live cron (need CronCreate)
 *    orphaned  — live golf-managed crons without an enabled registry entry
 *                (CronDelete); also includes live crons whose registry entry
 *                exists but is `enabled:false` (operator wants it torn down).
 *    drifted   — live + registry id match but field-drift (CronDelete + CronCreate)
 *    ok        — exact matches (no action)
 *    foreign   — non-golf live crons we deliberately ignored
 *  The three actionable categories partition the live cron table: every live
 *  cron lands in exactly one of orphaned / drifted / ok / foreign. */
export function diffRegistryVsCronList(registryEntries, cronList) {
  const liveById = new Map();
  for (const c of cronList) {
    const id = cronIdentity(c);
    if (id !== null) liveById.set(id, c);
  }

  const missing = [];
  const drifted = [];
  const ok = [];
  const handledLiveIds = new Set();   // live ids already routed (so they don't double-count as orphan below)

  for (const e of registryEntries) {
    const live = liveById.get(e.id);
    if (!e.enabled) {
      // Disabled registry entry: if a live cron with that id exists, it's an
      // orphan the operator wants torn down. If no live cron, no-op.
      if (live) {
        // Routed by the orphan loop below — we mark it as orphaned with a
        // specific reason there. Pre-mark handled so the foreign sweep skips.
      }
      continue;
    }
    if (!live) { missing.push(e); continue; }
    handledLiveIds.add(e.id);
    const verdict = classifyCron(live, registryEntries);
    if (verdict.status === "drifted") {
      drifted.push({ entry: e, live, drift: verdict.drift });
    } else if (verdict.status === "ok") {
      ok.push({ entry: e, live });
    } else {
      // Identity match exists but classifyCron decided "orphan" / "foreign".
      // That can only happen if isGolfManaged disagrees with the registry on a
      // matching id — surface it loudly as drifted with reason.
      drifted.push({ entry: e, live, drift: [`classifier-mismatch:${verdict.status}`] });
    }
  }

  // Disabled-entry orphan handling: for every registry entry that is
  // disabled, if a live cron exists with the same id, flag orphan with a
  // specific reason. This is the operator's explicit tear-down signal.
  const disabledRegistryIds = new Set(
    registryEntries.filter((e) => !e.enabled).map((e) => e.id),
  );

  const orphaned = [];
  const foreign = [];
  for (const c of cronList) {
    const id = cronIdentity(c);
    if (id !== null && handledLiveIds.has(id)) continue;
    if (id !== null && disabledRegistryIds.has(id)) {
      orphaned.push({ live: c, reason: "registry-entry-disabled" });
      continue;
    }
    const verdict = classifyCron(c, registryEntries);
    if (verdict.status === "orphan") orphaned.push({ live: c, reason: verdict.reason || "id-not-in-registry" });
    else if (verdict.status === "drifted") {
      // id matches an enabled registry entry but it was already handled above
      // (handledLiveIds guard) — this branch only fires if a live cron has
      // an id matching an enabled entry whose live counterpart wasn't found
      // (Map collision; near-impossible). Routed to drifted for safety.
      drifted.push({ entry: verdict.entry, live: c, drift: verdict.drift });
    } else {
      foreign.push({ live: c });
    }
  }

  return { missing, orphaned, drifted, ok, foreign };
}

/** Pure: turn the diff into an emit-ready action plan. Each action is a self-
 *  contained record the operator (or a wired hook) can hand to CronCreate /
 *  CronDelete verbatim.
 *
 *  Order matters: deletes first, then creates. If a registry entry drifted,
 *  the live row is deleted and the registry version is recreated — the
 *  harness's CronCreate is durable=false (session-only), so a delete+create
 *  is the only safe rewrite.
 *
 *  Create actions carry the full registry entry payload (scheduleUtc,
 *  scriptHint, expectedDurationMs, description) so an operator can verify
 *  the create matches the spec before applying. */
export function buildActionPlan(diff) {
  const deletes = [];
  const creates = [];
  for (const o of diff.orphaned) {
    const id = cronIdentity(o.live);
    deletes.push({ kind: "delete", id, reason: o.reason || "orphan" });
  }
  for (const d of diff.drifted) {
    const liveId = cronIdentity(d.live);
    deletes.push({ kind: "delete", id: liveId, reason: `drifted:${d.drift.join(",")}` });
    creates.push({
      kind: "create",
      id: d.entry.id,
      cronExpr: d.entry.cronExpr,
      prompt: d.entry.prompt,
      name: d.entry.name,
      scheduleUtc: d.entry.scheduleUtc,
      description: d.entry.description,
      scriptHint: d.entry.scriptHint,
      expectedDurationMs: d.entry.expectedDurationMs,
      reason: `re-register after drift:${d.drift.join(",")}`,
    });
  }
  for (const m of diff.missing) {
    creates.push({
      kind: "create",
      id: m.id,
      cronExpr: m.cronExpr,
      prompt: m.prompt,
      name: m.name,
      scheduleUtc: m.scheduleUtc,
      description: m.description,
      scriptHint: m.scriptHint,
      expectedDurationMs: m.expectedDurationMs,
      reason: "missing-from-cron-list",
    });
  }
  return { deletes, creates, noopCount: diff.ok.length, foreignCount: diff.foreign.length };
}

// ─── coordination claim wrapper ─────────────────────────────────────────────
/** Acquire a serialization claim on `golf/cron-reconcile`. Cross-machine
 *  attribution uses BOTH `pcName` (env var) and `hostname` (os.hostname()) so
 *  two golf chats on different machines disambiguate reliably. Returns
 *  `{acquired:true,row}` or `{acquired:false,conflict}`. */
export function acquireReconcileClaim({ coord, sessionId, ttlMs }) {
  if (!coord) throw new Error("acquireReconcileClaim: coord (CoordinationStoreEngine) is required");
  if (!sessionId) throw new Error("acquireReconcileClaim: sessionId is required");
  let hn = "";
  try { hn = osHostname() || ""; } catch { /* hostname() can fail in sandboxes */ }
  const result = coord.claim({
    resourcePath: CLAIM_RESOURCE,
    sessionId,
    pcName: process.env.COMPUTERNAME || "",
    hostname: hn,
    pid: process.pid,
    intent: "cron-registry-reconcile",
    ttlMs,
  });
  if (result.acquired) return { acquired: true, row: result.row };
  return { acquired: false, conflict: result };
}

/** Release the reconcile claim. Returns true iff the engine deleted a row.
 *  Logs to stderr on engine error rather than swallowing — operators
 *  debugging a stuck claim need the breadcrumb. */
export function releaseReconcileClaim({ coord, sessionId }) {
  if (!coord || !sessionId) return false;
  try {
    return coord.release({ resourcePath: CLAIM_RESOURCE, sessionId });
  } catch (e) {
    try { process.stderr.write(`[reconcile] release failed: ${(e && e.message) || e}\n`); } catch { /* nothing */ }
    return false;
  }
}

// ─── full orchestrator (dependency-injected for tests) ──────────────────────
/** Pure orchestration with claim-before-read ordering. Inputs:
 *    coordFactory()                 → CoordinationStoreEngine | null (skipped if noClaim/dryRun)
 *    readRegistry(path)             → raw JSON object
 *    readCronList(pathOrNull)       → string (file content or piped stdin)
 *    opts: { registry, cronList, sessionId, ttlMs, noClaim, dryRun, now, db }
 *  Output: `{ result, coord }`.
 *    - `result` is the structured run report (always populated).
 *    - `coord` is the held CoordinationStoreEngine handle the CALLER must
 *      release + close. null if the claim was skipped or factory failed.
 *  Never throws (except programmer errors); IO failures become result.errors[].
 *
 *  Ordering: claim FIRST, then registry+cron-list read, then diff+plan.
 *  When the claim is lost, the plan is empty — the loser never emits a
 *  potentially-stale plan that an operator could apply. */
export async function runReconcile(deps, opts) {
  const errors = [];
  const result = {
    schemaVersion: SCHEMA_VERSION,
    startedAt: new Date(opts.now ?? Date.now()).toISOString(),
    sessionId: opts.sessionId ?? null,
    dryRun: !!opts.dryRun,
    noClaim: !!opts.noClaim,
    registryPath: opts.registry,
    cronListPath: opts.cronList,
    claim: null,
    registry: { entries: 0, errors: [], meta: null },
    cronList: { items: 0, warnings: [] },
    diff: { missing: 0, orphaned: 0, drifted: 0, ok: 0, foreign: 0 },
    plan: { deletes: [], creates: [], noopCount: 0, foreignCount: 0 },
    errors,
  };

  // 1. Acquire claim FIRST (unless skipped). The loser exits with empty plan,
  //    never emitting actions an operator could mistakenly apply.
  let coord = null;
  if (!opts.noClaim && !opts.dryRun) {
    try {
      coord = await deps.coordFactory({ dbPath: opts.db, now: opts.now ? () => opts.now : undefined });
    } catch (e) {
      errors.push(`coord-open:${(e && e.message) || e}`);
      return { result, coord: null };
    }
    if (!coord) {
      result.claim = { acquired: false, reason: "coord-factory-returned-null" };
      errors.push("coord-factory-returned-null");
      return { result, coord: null };
    }
    try {
      const claim = acquireReconcileClaim({
        coord, sessionId: opts.sessionId, ttlMs: opts.ttlMs,
      });
      result.claim = claim;
      if (!claim.acquired) {
        // Loser path — return with empty plan, claim conflict surfaced.
        return { result, coord };
      }
    } catch (e) {
      errors.push(`claim-acquire:${(e && e.message) || e}`);
      return { result, coord };
    }
  } else {
    result.claim = { skipped: true, reason: opts.dryRun ? "dry-run" : "no-claim" };
  }

  // 2. Read + validate registry (only after claim acquired).
  let registryRaw;
  try { registryRaw = deps.readRegistry(opts.registry); }
  catch (e) { errors.push(`registry-read:${(e && e.message) || e}`); return { result, coord }; }
  const reg = validateRegistry(registryRaw);
  if (!reg.valid) {
    result.registry.errors = reg.errors;
    errors.push(`registry-invalid:${reg.errors[0]}`);
    return { result, coord };
  }
  result.registry.entries = reg.entries.length;
  result.registry.meta = reg.meta;

  // 3. Read + parse cron list snapshot.
  let snapshotText;
  try { snapshotText = await deps.readCronList(opts.cronList); }
  catch (e) { errors.push(`cron-list-read:${(e && e.message) || e}`); return { result, coord }; }
  const snap = parseCronListSnapshot(snapshotText);
  result.cronList.items = snap.items.length;
  result.cronList.warnings = snap.warnings;

  // 4. Diff.
  const diff = diffRegistryVsCronList(reg.entries, snap.items);
  result.diff = {
    missing: diff.missing.length,
    orphaned: diff.orphaned.length,
    drifted: diff.drifted.length,
    ok: diff.ok.length,
    foreign: diff.foreign.length,
  };

  // 5. Build plan.
  result.plan = buildActionPlan(diff);

  return { result, coord };
}

// ─── default IO adapters (used by the CLI; tests substitute fakes) ──────────
function defaultReadRegistry(path) {
  if (!existsSync(path)) throw new Error(`registry not found: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

async function defaultReadCronList(pathOrNull) {
  if (pathOrNull && pathOrNull !== "-") {
    if (!existsSync(pathOrNull)) throw new Error(`cron-list not found: ${pathOrNull}`);
    return readFileSync(pathOrNull, "utf8");
  }
  // stdin — but only if it's not a TTY. A TTY-stdin in this context means the
  // operator forgot to pipe `CronList`; silently treating it as `[]` would
  // generate a "create all 5 crons" plan, which is a footgun. Fail loud.
  if (process.stdin.isTTY) {
    throw new Error(
      "no cron-list source: pipe `CronList`'s output through stdin or pass --cron-list <path>",
    );
  }
  return await new Promise((resolveP, rejectP) => {
    const chunks = [];
    let total = 0;
    let aborted = false;
    process.stdin.on("data", (c) => {
      if (aborted) return;
      total += c.length;
      if (total > MAX_STDIN_BYTES) {
        aborted = true;
        rejectP(new Error(`cron-list stdin exceeds ${MAX_STDIN_BYTES} bytes`));
        return;
      }
      chunks.push(c);
    });
    process.stdin.on("end", () => {
      if (!aborted) resolveP(Buffer.concat(chunks).toString("utf8"));
    });
    process.stdin.on("error", rejectP);
  });
}

async function defaultCoordFactory({ dbPath, now }) {
  // Lazy-import the compiled engine so the .mjs helper has no static dep on
  // mcp-server's TS source. Tests substitute this with an in-memory fake.
  const candidates = [
    join(REPO, "mcp-server/dist/engines/CoordinationStoreEngine.js"),
    join(REPO, "mcp-server/dist/mcp-server/src/engines/CoordinationStoreEngine.js"),
  ];
  let mod = null;
  let lastErr = null;
  const tried = [];
  for (const cand of candidates) {
    tried.push(cand);
    if (!existsSync(cand)) continue;
    try {
      // pathToFileURL handles Windows paths with spaces and percent-encoding.
      mod = await import(pathToFileURL(cand).href);
      break;
    } catch (e) { lastErr = e; }
  }
  if (!mod) {
    const triedDetail = tried.map((p) => `  • ${p}${existsSync(p) ? "" : " (not found)"}`).join("\n");
    throw new Error(
      `CoordinationStoreEngine not loadable. Tried:\n${triedDetail}\n` +
      `Run \`npm run build:fast\` from H:/prism/mcp-server/ to produce the dist files.` +
      (lastErr ? `\nLast import error: ${lastErr.message}` : ""),
    );
  }
  const Ctor = mod.CoordinationStoreEngine;
  return new Ctor({ dbPath, now });
}

// ─── CLI entrypoint ─────────────────────────────────────────────────────────
function printHelp() {
  process.stderr.write(
    [
      "cron-registry-reconcile.mjs — CLEANUP-MS0 / U-CLEANUP-G8",
      "",
      "Usage:",
      "  node .claude/helpers/cron-registry-reconcile.mjs [flags]",
      "",
      "Flags:",
      "  --registry <path>     default: state/shared/golf-cron-registry.json",
      "  --cron-list <path|->  default: stdin (pipe `CronList`'s JSON here)",
      "  --session-id <id>     required (even with --dry-run, for attribution)",
      "  --db <path>           default: state/shared/coordination.db",
      `  --ttl-ms <n>          claim TTL ms (default ${DEFAULT_TTL_MS}, floor ${MIN_TTL_MS})`,
      "  --no-claim            skip coord_sqlite claim (test / bootstrap)",
      "  --dry-run             plan without claiming",
      "  --json                machine-readable output",
      "  --now <ISO>           override clock (tests)",
      "",
    ].join("\n"),
  );
}

function renderHuman(result) {
  const lines = [];
  lines.push(`cron-registry-reconcile @ ${result.startedAt}`);
  lines.push(`  session:   ${result.sessionId || "<none>"}`);
  lines.push(`  registry:  ${result.registryPath}  (${result.registry.entries} enabled entries)`);
  lines.push(`  cron-list: ${result.cronListPath || "<stdin>"}  (${result.cronList.items} items)`);
  if (result.cronList.warnings.length) {
    lines.push(`  warnings:  ${result.cronList.warnings.length}`);
    for (const w of result.cronList.warnings.slice(0, 5)) lines.push(`    * ${w}`);
  }
  lines.push(`  diff:      missing=${result.diff.missing} drifted=${result.diff.drifted} orphaned=${result.diff.orphaned} ok=${result.diff.ok} foreign=${result.diff.foreign}`);
  lines.push(`  plan:      ${result.plan.deletes.length} delete + ${result.plan.creates.length} create`);
  for (const a of result.plan.deletes) lines.push(`    - delete ${a.id} (${a.reason})`);
  for (const a of result.plan.creates) {
    const schedNote = a.scheduleUtc ? `  scheduleUtc=${a.scheduleUtc}` : "";
    lines.push(`    + create ${a.id} (${a.reason})  cronExpr=${a.cronExpr}${schedNote}`);
  }
  if (result.claim) {
    if (result.claim.skipped) lines.push(`  claim:     skipped (${result.claim.reason})`);
    else if (result.claim.acquired) lines.push(`  claim:     ACQUIRED ${CLAIM_RESOURCE} for session ${result.sessionId}`);
    else {
      const peer = result.claim.conflict?.existing?.session_id || "?";
      lines.push(`  claim:     CONFLICT - held by ${peer} (retry next sweep)`);
    }
  }
  if (result.errors.length) {
    lines.push(`  ERRORS:`);
    for (const e of result.errors) lines.push(`    x ${e}`);
  }
  return lines.join("\n") + "\n";
}

async function main(argv) {
  let opts;
  try { opts = parseArgs(argv); }
  catch (e) {
    process.stderr.write(`error: ${(e && e.message) || e}\n`);
    printHelp();
    process.exit(2);
  }
  if (opts.help) { printHelp(); process.exit(0); }
  // --session-id required ALWAYS (even with --dry-run / --no-claim) so the
  // result JSON carries attribution for downstream audit consumers.
  if (!opts.sessionId) {
    process.stderr.write("error: --session-id is required (attribution for audit log)\n");
    process.exit(2);
  }

  const deps = {
    readRegistry: defaultReadRegistry,
    readCronList: defaultReadCronList,
    coordFactory: defaultCoordFactory,
  };
  let coord = null;
  let result;
  try {
    const out = await runReconcile(deps, opts);
    result = out.result;
    coord = out.coord;
  } catch (e) {
    process.stderr.write(`fatal: ${(e && e.stack) || e}\n`);
    process.exit(2);
  }

  // Render before deciding exit code so the operator always sees what
  // happened — even when we exit 1 on a claim conflict.
  if (opts.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write(renderHuman(result));

  // Release + close — ONE connection lifecycle owned by main(). We release
  // on every path where we acquired (success OR mid-run error) so the row
  // doesn't sit until TTL expiry.
  if (coord) {
    if (result.claim?.acquired) releaseReconcileClaim({ coord, sessionId: opts.sessionId });
    try { if (typeof coord.close === "function") coord.close(); }
    catch (e) {
      try { process.stderr.write(`[reconcile] coord close failed: ${(e && e.message) || e}\n`); } catch { /* nothing */ }
    }
  }

  if (result.errors.length) process.exit(2);
  if (!opts.noClaim && !opts.dryRun && result.claim && !result.claim.acquired && !result.claim.skipped) {
    process.exit(1); // claim conflict — peer is mid-reconcile
  }
  process.exit(0);
}

// CLI guard — only invoke main() when executed directly, not when imported by
// the test file.
const invokedDirectly = (() => {
  try {
    const here = fileURLToPath(import.meta.url);
    const arg0 = process.argv[1] ? resolve(process.argv[1]) : "";
    return resolve(here) === arg0;
  } catch { return false; }
})();

if (invokedDirectly) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`fatal: ${(e && e.stack) || e}\n`);
    process.exit(2);
  });
}

// ─── exports for tests ──────────────────────────────────────────────────────
export const __INTERNAL__ = {
  CLAIM_RESOURCE,
  DEFAULT_TTL_MS,
  MIN_TTL_MS,
  MAX_STDIN_BYTES,
  DEFAULT_REGISTRY,
  DEFAULT_DB,
  SCHEMA_VERSION,
  GOLF_PROMPT_RE,
  KNOWN_GOLF_SLASH_PROMPTS,
};
