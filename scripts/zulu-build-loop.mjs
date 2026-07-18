#!/usr/bin/env node
/**
 * zulu-build-loop.mjs -- ZULU autonomous build-loop driver (slot:zulu, 2026-06-15,
 * U-ZULU-BUILDLOOP INCR 2). The cron-safe orchestration tick for "autonomous
 * continuous building".
 *
 * WHAT IT DOES each run:
 *   1. Reads the capability spec + bravo brief (the Obsidian/specs build-queue sources).
 *   2. Computes the ranked PENDING queue + next unit (INCR 1 pure core).
 *   3. Ollama-offloads a 2-sentence digest of the next unit (local qwen, fail-soft).
 *   4. Writes a single-writer pointer state/shared/zulu-build-loop-next.json (atomic)
 *      + appends a ledger row, so a gated builder (bravo /checkin /loop) picks up the
 *      next unit on its next tick.
 *
 * SAFETY (deliberate): this driver NEVER builds, writes engine code, or commits. It
 * only maintains the "what to build next" pointer for a gated builder chat -- the
 * per-unit build+test+3-of-3 scrutiny stays with that chat (the gate caught a real P1
 * this session; an unsupervised auto-committer would bypass it). Governance/
 * operator-gated units are surfaced as BLOCKED and never emitted as the next unit.
 *
 * Knobs: PRISM_ZBL_DISABLE=1 (no-op), PRISM_ZBL_OLLAMA_DISABLE=1 (skip digest),
 *        PRISM_ZBL_OLLAMA_MODEL, PRISM_OLLAMA_URL, PRISM_ROOT.
 * Exit: 0 ok / 0 drained / 0 disabled (never fails a cron); 2 only on unreadable sources.
 * ASCII-only. Uses global fetch (Node 22) for Ollama + a read-only fail-soft `git log`
 * (execFileSync, no shell) for the git-reality shipped signal.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildQueueFromTexts } from "./lib/zulu-build-queue.mjs";
import { acquireExclusiveLock, releaseExclusiveLock } from "./lib/exclusive-file-lock.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const SPEC_PATH = process.env.PRISM_ZBL_SPEC || path.join(ROOT, "state/shared/specs/HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md");
const SPECS_DIR = path.join(ROOT, "state/shared/specs");
const SPEC_GLOB_PREFIX = "HERMES-CAPABILITY-EXPANSION-CANDIDATES-";
const BRIEF_PATH = process.env.PRISM_ZBL_BRIEF || path.join(ROOT, "state/shared/slot-briefs/bravo.md");
const NEXT_PATH = path.join(ROOT, "state/shared/zulu-build-loop-next.json");
const LEDGER_PATH = path.join(ROOT, "state/shared/zulu-build-loop-log.jsonl");
const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";

// Canonical engine artifact per capability unit (U-ZBL-ARTIFACT-SHIPPED, 2026-06-25,
// slot:zulu). A unit whose artifact exists on disk is genuinely shipped EVEN when it
// shipped under an engine-name commit -- on this branch ZERO commit subjects carry a
// literal "C<n>"/[HERMES-CAPABILITY-C<n>] tag, so BOTH the brief-prose and git-subject
// signals miss every unit and the pointer perpetually re-drives a DRAINED queue (a
// recurring regression -- see reference_zulu_build_cron_git_grounded_2026_06_16). The
// engine file existing is the only drift-immune "was this built" signal. C1 was further
// verified COMPLETE (allWaves + computeWaveN incremental driver + dispatcher wiring +
// full multi-wave/cycle/adversarial tests); C2-C8 artifacts verified present on-branch.
// CAVEAT: artifact existence is a weaker signal than the git-subject path -- it CANNOT
// detect a reverted-but-not-deleted engine (a `git revert` of the logic leaves the .ts
// on disk -> still reads "shipped"). Acceptable for the "initial build needed" contract
// since C1-C8 are verified-complete + dispatcher-wired; revert with file-delete (or a
// future min-line/marker gate) is the mitigation if a half-finished engine is committed.
const UNIT_ARTIFACTS = {
  C1: "mcp-server/src/engines/ZuluWaveSchedulerEngine.ts",
  C2: "mcp-server/src/engines/ZuluTaskContinuityEngine.ts",
  C3: "mcp-server/src/engines/ZuluFleetHealthSynthesisEngine.ts",
  C4: "mcp-server/src/engines/ZuluDelegationContractEngine.ts",
  C5: "mcp-server/src/engines/ZuluAdaptiveBackPressureEngine.ts",
  C6: "mcp-server/src/engines/ZuluCapabilityRegistryEngine.ts",
  C7: "mcp-server/src/engines/ZuluCapabilityAttestationEngine.ts",
  C8: "mcp-server/src/engines/ZuluSoulEvolutionAdvisorEngine.ts",
};

/**
 * Reality-grounded shipped set: a unit id is shipped iff its canonical engine
 * artifact exists on disk. Drift-immune (independent of commit-subject form / brief
 * prose). Fail-soft: a stat error on any single artifact is skipped, never thrown.
 * `existsFn` + `root` injectable for tests.
 * @returns {Set<string>}
 */
export function shippedByArtifact(root = ROOT, artifacts = UNIT_ARTIFACTS, existsFn = fs.existsSync) {
  const out = new Set();
  for (const [id, rel] of Object.entries(artifacts)) {
    try {
      if (existsFn(path.join(root, rel))) out.add(id);
    } catch {
      /* fail-soft: a single bad artifact path never blocks the rest */
    }
  }
  return out;
}

// --- Overlap lock (the cron-overlap fix, slot:bravo) ---
// The driver fires on a ~15-min cron (install-zulu-build-loop-cron.ps1 default -EveryMinutes 15).
// The scheduled task itself uses -MultipleInstances IgnoreNew, so TASK-vs-TASK overlap is already
// blocked; this process lock covers what IgnoreNew does NOT -- a durable-task run overlapping an
// ad-hoc/manual invocation (-RunNow or a direct `node scripts/zulu-build-loop.mjs`) or any second
// launcher. Two such concurrent runs would BOTH spend the (expensive) Ollama call AND race the
// single-writer NEXT_PATH atomic-write + ledger append. This lock makes a concurrent run SKIP so
// only ONE runs at a time; the pointer is durable -> the loser runs on the next tick.
// Resource-protection + write-integrity, NOT fleet-control (skip-if-held, never controls a peer).
const PROCESS_LOCK_PATH = `${NEXT_PATH}.loop-process.lock`;
// Stale headroom is DERIVED so a legitimately-slow run is never stolen as stale -> two parallel runs.
// FLOOR is env-overridable; effective staleMs = max(floor, (ollamaWorst + gitLogWorst) * 1.5).
const PROCESS_STALE_FLOOR_MS = Number(process.env.PRISM_ZBL_PROCESS_STALE_MS) || 180_000;
const OLLAMA_WORST_MS = 60_000; // matches AbortSignal.timeout(60000) in ollamaSummarize
const GIT_LOG_WORST_MS = 15_000; // matches the execFileSync git-log timeout

function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }

/**
 * Resolve the capability spec. Prefer the configured/dated path; if it is missing or empty
 * (the date-stamped file rotated / was renamed), fall back to the LATEST
 * `HERMES-CAPABILITY-EXPANSION-CANDIDATES-*.md` in the specs dir -- so a rotation never makes
 * the cron silently emit `drained=true pending=0` from an empty read (overnight-automation
 * rule: "validate the data source -- a missing source must FAIL LOUD, never garbage-at-scale").
 * Pure-ish: fs is injectable for hermetic tests. Returns { path, text, viaFallback } or null
 * when NO non-empty spec exists anywhere.
 */
export function resolveSpec(configuredPath, opts = {}) {
  const _exists = opts.existsSync || ((p) => fs.existsSync(p));
  const _read = opts.readFileSync || ((p) => fs.readFileSync(p, "utf8"));
  const _readdir = opts.readdirSync || ((d) => fs.readdirSync(d));
  const _specsDir = opts.specsDir || SPECS_DIR;
  const tryRead = (p) => { try { const t = _read(p); return t && String(t).trim() ? String(t) : null; } catch { return null; } };

  if (configuredPath && _exists(configuredPath)) {
    const t = tryRead(configuredPath);
    if (t) return { path: configuredPath, text: t, viaFallback: false };
  }
  // Fallback: the latest DATE-STAMPED spec by lexical name (ISO `YYYY-MM-DD` sorts ==
  // chronological). The candidate filter requires a `-YYYY-MM-DD.md` suffix so a non-dated
  // sibling (e.g. `...-CANDIDATES-FINAL.md`, where 'F' > '2') can never sort ABOVE a real date
  // and get wrongly picked as "latest". The CONFIGURED path above is read by exact path, so a
  // non-dated configured spec still works directly -- only the fallback is date-constrained.
  let names = [];
  try { names = _readdir(_specsDir).filter((n) => n.startsWith(SPEC_GLOB_PREFIX) && /-\d{4}-\d{2}-\d{2}\.md$/.test(n)); } catch { names = []; }
  names.sort();
  for (let i = names.length - 1; i >= 0; i--) {
    const p = path.join(_specsDir, names[i]);
    const t = tryRead(p);
    if (t) return { path: p, text: t, viaFallback: p !== configuredPath };
  }
  return null;
}

/**
 * Pure: the structured ledger record. Overnight-automation rule -- every workflow-output row
 * carries the four mandatory fields: timestamp (`at`), `status` (ok|failed|skipped), `source`,
 * and content (the spread `fields`). A failed run is now a DURABLE row (not just stderr), so a
 * monitor reading the ledger distinguishes "drained" from "cron broken".
 */
export function ledgerRecord(nowIso, status, fields = {}) {
  return { at: nowIso, status, source: "zulu-build-loop", ...fields };
}

function appendLedger(record) {
  try {
    fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
    fs.appendFileSync(LEDGER_PATH, JSON.stringify(record) + "\n", "utf8");
  } catch { /* ledger append is best-effort */ }
}

/**
 * Read recent commit subjects for the GIT-REALITY shipped signal. The brief's
 * "## SHIPPED" prose drifts/goes missing (live: bravo.md was unreadable while C1-C8
 * were shipped -> the pointer falsely showed the whole queue pending). Commit subjects
 * (U-ZBL-C<n> / U-ZULU-CAP-C<n>) are the non-drifting ground truth. Fail-soft: any git
 * error (git absent, not a repo, timeout) returns "" so the cron degrades to the
 * brief-only path and NEVER fails. Read-only `git log` -- no mutation.
 */
function readShippedCommitsText() {
  try {
    return execFileSync("git", ["-C", ROOT, "log", "--oneline", "-400"], {
      encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 8 * 1024 * 1024,
    });
  } catch { return ""; }
}

/** Extract the markdown block for a candidate id ("### C4 ..." up to the next "###"). Pure. */
export function extractBlock(specText, id) {
  const text = String(specText || "");
  const i = text.search(new RegExp("^###\\s+" + String(id) + "\\b", "m"));
  if (i < 0) return "";
  const rest = text.slice(i + 1);
  const j = rest.search(/^###\s/m);
  return text.slice(i, j < 0 ? text.length : i + 1 + j).trim();
}

/** Pure: shape the single-writer next-build directive object. */
export function shapeDirective(queue, { summary = "", nowIso, specPath, briefPath }) {
  const next = queue && queue.next;
  return {
    schemaVersion: "1.0.0",
    at: nowIso,
    builder: "bravo",
    drained: !next,
    next: next ? { id: next.id, title: next.title, effort: next.effort, summary } : null,
    pending: (queue.pending || []).map((c) => ({ id: c.id, title: c.title, effort: c.effort })),
    pendingCount: (queue.pending || []).length,
    doneCount: (queue.done || []).length,
    blocked: (queue.blocked || []).map((c) => c.id),
    blockedCount: (queue.blocked || []).length,
    note: next
      ? `Next GATED build for bravo: ${next.id} ${next.title} (effort ${next.effort || "?"}). Pick up via /checkin-bravo /loop -- comprehensive-build floor + per-unit 3-of-3 scrutiny; NEVER auto-commit unreviewed.`
      : "Build queue DRAINED -- all non-gated capability units shipped. Remaining work is operator-gated (governance).",
    sources: { spec: specPath, brief: briefPath },
  };
}

async function ollamaSummarize(blockText) {
  if (process.env.PRISM_ZBL_OLLAMA_DISABLE === "1" || !blockText) return "";
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.PRISM_ZBL_OLLAMA_MODEL || "qwen2.5-coder:1.5b",
        prompt: "In 2 sentences, summarize this build unit: WHAT to build + the key dedup/safety note. Be terse.\n\n" + blockText.slice(0, 4000),
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return "";
    const j = await res.json();
    return String(j.response || "").replace(/\s+/g, " ").trim().slice(0, 600);
  } catch { return ""; }
}

function atomicWriteJson(p, obj) {
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, p);
}

/**
 * Acquire the cron-overlap process lock so only ONE zulu-build-loop run proceeds at a time. A
 * concurrent run SKIPS (acquired:false) immediately rather than waiting out the default ~2.5s retry
 * window -- the pointer is durable, the loser runs on the next ~15-min tick. Exported (injectable
 * path) for hermetic concurrency tests.
 */
export function acquireBuildLoopLock(lockPath = PROCESS_LOCK_PATH) {
  // staleMs must exceed the worst-case single-run hold (Ollama summarize + git log + write) with
  // margin, else a slow-but-ALIVE run gets its lock stolen -> two parallel runs -> duplicate Ollama
  // spend + racing writes (the exact thing this lock prevents). Floored at the env/3-min default.
  const staleMs = Math.max(PROCESS_STALE_FLOOR_MS, Math.ceil((OLLAMA_WORST_MS + GIT_LOG_WORST_MS) * 1.5));
  // retries:2 (NOT 1): the stale-steal path consumes one attempt via `continue`, so >=2 attempts are
  // needed to RECLAIM a crashed holder's lock in the SAME call -- else a stale lock wastes a full
  // ~15-min tick before the next run reclaims it. Two ~1ms attempts still = an immediate SKIP on a
  // LIVE peer. (CQD's drain lock uses retries:1: a one-Stop reclaim delay is negligible at Stop
  // cadence; at the 15-min cron cadence a wasted tick is not -- so this diverges deliberately. R7.)
  return acquireExclusiveLock(lockPath, { retries: 2, retryMs: 1, staleMs });
}
export function releaseBuildLoopLock(lockPath = PROCESS_LOCK_PATH) {
  releaseExclusiveLock(lockPath);
}

async function main() {
  if (process.env.PRISM_ZBL_DISABLE === "1") { console.log("[zbl] disabled (PRISM_ZBL_DISABLE=1)"); return 0; }
  const nowIso = new Date().toISOString();

  // Overlap lock: a concurrent run SKIPS (skip-if-held) rather than duplicating the Ollama call +
  // racing the NEXT_PATH atomic-write / ledger append. A `skipped` ledger row gives a monitor the
  // distinct "overlap deferred" signal (vs ok/failed/drained). The pointer is durable -> the loser
  // runs on the next ~15-min tick. Acquired BEFORE any read so a skipped tick does no wasted work.
  const plk = acquireBuildLoopLock();
  if (!plk.acquired) {
    appendLedger(ledgerRecord(nowIso, "skipped", { reason: "another zulu-build-loop run holds the process lock" }));
    console.log("[zbl] another run holds the process lock; skipping this tick (pointer is durable)");
    return 0;
  }
  try {
    const spec = resolveSpec(SPEC_PATH);
    if (!spec) {
      // FAIL LOUD (overnight rule: never continue/exit silently). Record a DURABLE failure row so
      // a ledger monitor sees "cron broken", not a phantom "drained" from an empty read.
      const reason = `capability spec unreadable + no ${SPEC_GLOB_PREFIX}*.md fallback under ${path.relative(ROOT, SPECS_DIR)}`;
      appendLedger(ledgerRecord(nowIso, "failed", { reason, specPath: path.relative(ROOT, SPEC_PATH) }));
      console.error(`[zbl] FAILED: ${reason}`);
      return 2;
    }
    if (spec.viaFallback) {
      console.error(`[zbl] configured spec missing -- fell back to latest dated spec: ${path.relative(ROOT, spec.path)}`);
    }
    const briefText = readSafe(BRIEF_PATH);
    const gitLogText = readShippedCommitsText();
    const queue = buildQueueFromTexts(spec.text, briefText, { gitLogText, extraShipped: shippedByArtifact() });
    const summary = queue.next ? await ollamaSummarize(extractBlock(spec.text, queue.next.id)) : "";
    const directive = shapeDirective(queue, { summary, nowIso, specPath: spec.path, briefPath: BRIEF_PATH });
    atomicWriteJson(NEXT_PATH, directive);
    appendLedger(ledgerRecord(nowIso, "ok", {
      next: directive.next ? directive.next.id : null,
      pending: directive.pendingCount,
      done: directive.doneCount,
      blocked: directive.blockedCount,
      ollama: summary ? "yes" : "no",
      specViaFallback: spec.viaFallback === true,
    }));
    console.log(`[zbl] ${directive.drained ? "DRAINED" : "next=" + directive.next.id + " (" + directive.next.title + ")"} | pending=${directive.pendingCount} done=${directive.doneCount} blocked=${directive.blockedCount} | ollama=${summary ? "yes" : "no"} -> ${path.relative(ROOT, NEXT_PATH)}`);
    return 0;
  } finally {
    releaseBuildLoopLock();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => process.exit(code || 0)).catch((e) => { console.error("[zbl] fatal:", e && e.message); process.exit(2); });
}
