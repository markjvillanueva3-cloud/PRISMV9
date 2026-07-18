#!/usr/bin/env node
// scripts/reconcile-zulu-ledger.mjs
// ZULU MASTER-BRAIN ledger reconciler (2026-06-11, slot:zulu).
//
// PROBLEM (the master-brain finding): the fleet ships dozens of commits/hour, so a
// hand-curated ZULU-MASTER-CONTEXT-LEDGER-*.md (the categorized open-task queue) goes
// STALE within hours -- it routes the fleet at items already SHIPPED by a peer slot. A
// stale task-queue mis-routes the whole fleet (verified 2026-06-11: >=5 "open/blocked"
// items were actually shipped). The ledger is the orchestrator's persistent-memory of
// "what's left" -- keeping it honest is zulu's core duty.
//
// THIS is the loss function applied to the ledger: instead of re-reading every session to
// decide what's still open, run a DETERMINISTIC probe per checkable claim -- does the named
// artifact now exist? is the named blocker (an Ollama wedge, a missing edge type, a frozen
// slot array) resolved? -- and emit a SHIPPED / OPEN / COVERED / UNKNOWN verdict with the
// exact evidence. Re-runnable, $0 Claude tokens (pure fs + one local Ollama ping).
//
// AXIS NICHE (dedup-verified, R8): complements -- does not duplicate -- the milestone/roadmap
// reconcilers, which reconcile ENVELOPE status vs git:
//   - reconcile-milestones.mjs    : milestone-envelope status vs git-log
//   - reconcile-roadmap-drift.mjs  : roadmap-index vs shipped units
//   - feature-gap-dedup-win-*.mjs  : feature-gap dedup
//   - THIS                         : the free-form lettered ZULU ledger items vs
//                                    deterministic ARTIFACT/HEALTH probes (a different data
//                                    shape: prose claims, not envelope JSON).
//
// Advisory ONLY (R12 surfaces in output; never a Stop gate): exit 0 always unless --strict.
// CLI:  node scripts/reconcile-zulu-ledger.mjs [--json] [--strict]
//   --json    machine-readable verdicts to stdout (sidecar always written)
//   --strict  exit 1 if any claim the ledger calls OPEN is verified SHIPPED (regression of
//             the ledger's accuracy) -- for a cron that should re-curate the ledger.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "H:/prism";
const DEFAULT_OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
// Fast NON-THINKING canary model. The OLLAMA-GEN check only proves the generate ENDPOINT is
// alive -- a small model that cold-loads in <5s avoids a FALSE 'wedged' right after a daemon
// restart (qwen2.5-coder:32b is 20GB -> cold-load >20s -> abort -> false OPEN; 2026-06-23, slot:zulu).
// 1.5b is non-thinking like 32b, so it still dodges the gpt-oss empty-response trap.
const PROBE_MODEL = process.env.PRISM_OLLAMA_PROBE_MODEL || process.env.PRISM_OLLAMA_MODEL || "qwen2.5-coder:1.5b";
// Hermes proxy live-probe target. 127.0.0.1 (NOT localhost) per the fleet localhost-probe fix
// (2026-06-27, U-OLLAMA-LOCALHOST-PROBE-FIX): a `localhost` probe resolves IPv6 ::1 first on this
// box and false-reports DOWN. Short timeout so a SessionStart inject is never blocked.
// Reads the SAME fleet env var the rest of the hermes stack uses (ask-hermes / hermes-proxy-health-inject)
// -- its canonical value is /v1-suffixed; checkHermesProxy origin-strips it via hermesHealthUrl(), so a
// /v1 base still probes the root /health (NOT /v1/health, which 404s -> false DOWN).
const DEFAULT_HERMES_URL = process.env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1";
// 2000ms leaves a full 1s headroom under the meta-systems-health-inject hook's 3000ms harness kill, so the
// verdict is always flushed before SIGTERM. Fleet default 127.0.0.1 answers in <50ms (or refused in ~35ms);
// this bound only matters for a wedged/firewalled proxy. KNOWN P2 (scrutiny arms A+C): against a NON-DEFAULT
// blackhole URL that DROPs SYN, the aborted TCP socket can keep the node process alive ~8s past the verdict
// (OS SYN-retransmit) -- harmless on the SessionStart path (continueOnError + the 3000ms kill reap it; verdict
// already returned), only a transient zombie for a manual CLI run against an unreachable REMOTE proxy.
const HERMES_PROBE_TIMEOUT_MS = Number(process.env.PRISM_HERMES_PROBE_TIMEOUT_MS || 2000);
const SPECS_DIR = join(ROOT, "state/shared/specs");
const SIDECAR = join(SPECS_DIR, "ZULU-LEDGER-RECONCILE-LATEST.json");
const MS_PER_HOUR = 3.6e6;
const FRESH_AGE_H = 24; // a galaxy synthesis younger than this counts as current
const MIN_FRESH_SYNTHESES = 30; // >=30 of 34 galaxies fresh => reflection arm is live
// The ledger snapshot whose per-item `ledgerSays` the CLAIMS registry was synced against.
// If a NEWER ZULU-MASTER-CONTEXT-LEDGER-*.md exists, the hardcoded ledgerSays values may be
// stale -> findNewestLedger() surfaces it so a maintainer re-syncs CLAIMS (P1-1).
const LEDGER_SNAPSHOT = "ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md";

// ---- meta-systems utilization (U-ZLR-META-UTIL, 2026-06-22 slot:zulu) -------
// The operator's RECURRING question is not "is X built" but "is X actually USED?"
// (hermes / obsidian / ollama / octopus). The CLAIMS registry above answers
// is-it-built; this section answers is-it-utilized -- a DIFFERENT axis. Each grade
// is a PURE fn (parsed artifact in -> verdict out) reading an EXISTING fleet artifact
// (no new data collection -> no dup of ollama-offload-dashboard / AI-SYNERGY-AUDIT;
// it AGGREGATES their inputs into the orchestrator's own truth sidecar + names the
// deep-dive tool in `action`). status: UTILIZED | UNDER-UTILIZED | DOWN.
const OFFLOAD_STATS_PATH = join(ROOT, "mcp-server/data/state/ollama-offload-stats.json");
const CONSENSUS_QUEUE_PATH = process.env.PRISM_CONSENSUS_QUEUE || join(ROOT, "state/shared/consensus-queue.jsonl");
const CONSENSUS_PROCESSED_PATH = CONSENSUS_QUEUE_PATH.replace(/\.jsonl$/, "-processed.jsonl");
const META_OLLAMA_MIN_OFFLOADS = 1; // >0 offload decisions => the offload lane is live
const META_HERMES_MAX_FAIL_RATE = 0.1; // >10% ask-hermes failures => degraded proxy
const META_OBSIDIAN_MIN_SYNTH = MIN_FRESH_SYNTHESES; // reflection arm populated (count, NOT mtime)
// RECENCY gate (scrutiny P2, both arms): the offload + consensus counters are LIFETIME
// monotonic (offloaded since lastReset; processed.jsonl is append-only, never rotated), so a
// raw count>0 reads UTILIZED FOREVER even if the lane went dead weeks ago. The unit's question
// is "is it USED *now*", a recency question -- so a lane whose last activity is older than this
// window grades UNDER-UTILIZED (gone quiet / drain fell behind), not falsely green.
const META_RECENCY_H = 48;

// ---- deterministic checks (pure, exported for test) ------------------------

/** POST /api/generate with a tiny prompt; proves the GENERATION endpoint (not just
 *  the daemon) is alive. The ledger's #1 ROI blocker was a wedged /api/generate. */
export async function checkOllamaGenerate(url = DEFAULT_OLLAMA_URL, model = PROBE_MODEL, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: "Reply with exactly one word: READY", stream: false, options: { num_predict: 5 } }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, ms: Date.now() - start, response: "", error: `HTTP ${res.status}` };
    const j = await res.json();
    return { ok: true, ms: Date.now() - start, response: String(j.response || "").trim() };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, response: "", error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

/** Derive the proxy's ROOT /health URL from a (possibly /v1-suffixed) API base. The proxy serves
 *  /health at the ORIGIN root, NOT under /v1 -- the OpenAI-compat surface (/chat/completions, /models)
 *  lives under /v1 but /health does not, so `${base}/health` on a /v1 base hits /v1/health -> the proxy
 *  404s ("path_not_allowed") -> a healthy proxy reads DOWN -> the exact false fleet-wide alarm this fix
 *  exists to kill. Mirrors the proven healthUrlFor() in hermes-proxy-health-inject.mjs (2026-06-27,
 *  wiki [[hermes-util-u-hermes-health-root-path-fix]]); MUST stay since the fleet default
 *  PRISM_HERMES_PROXY_URL IS /v1-suffixed (ask-hermes.mjs / hermes-proxy-health-inject.mjs). */
export function hermesHealthUrl(baseUrl) {
  try {
    return `${new URL(baseUrl).origin}/health`;
  } catch {
    // scheme-less host:port (e.g. "127.0.0.1:8645/v1") -> new URL throws; prepend http:// then re-derive.
    const s = String(baseUrl || "").trim();
    const withScheme = /:\/\//.test(s) ? s : `http://${s}`;
    try {
      return `${new URL(withScheme).origin}/health`;
    } catch {
      return `${s.replace(/\/+$/, "").replace(/\/v1$/i, "")}/health`; // last-resort string strip, never throws
    }
  }
}

/** GET /health on the Hermes proxy; proves the managed-OAuth lane is live + authed RIGHT NOW.
 *  This is the live decision-time probe that gates the DOWN verdict (gradeHermesUtilization) so a
 *  recovered transient outage -- a high LIFETIME fail-rate in the offload ledger, but a healthy proxy
 *  now -- never pins a fleet-wide false "HERMES DOWN" alarm. (Doctrine: require positive DOWN evidence
 *  from a live probe at decision time -- the same fix shape as reference_mcp_kickoff_falsepos_liveprobe_fix.)
 *  Returns { ok, httpStatus, authenticated, error }. A timeout/unreachable -> { ok:false } (a proxy that
 *  cannot answer a health GET in the budget IS effectively down). Never throws. */
export async function checkHermesProxy(url = DEFAULT_HERMES_URL, timeoutMs = HERMES_PROBE_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  // HERMES-NVIDIA-LANE (2026-06-30): a DIRECT OpenAI-compatible cloud lane (NVIDIA, when
  // PRISM_HERMES_PROXY_URL is repointed off the dead :8645 OAuth proxy) has NO root /health, so a
  // /health probe 404s -> this would falsely pin "HERMES DOWN" and degrade the fleet (octopus /
  // verified-offload) to Ollama even though the lane serves chat. So: probe /health first (the local
  // proxy's rich auth body), and ONLY when /health is absent/non-2xx fall back to an authed /models
  // probe -- a 200 there proves the lane can serve chat. The local :8645 path is byte-identical.
  const tok = process.env.PRISM_HERMES_TOKEN || process.env.NVIDIA_API_KEY || "";
  const authHdr = tok ? { authorization: `Bearer ${tok}` } : {};
  try {
    let res = null;
    try { res = await fetch(hermesHealthUrl(url), { signal: ctrl.signal }); }
    catch { res = null; /* /health unreachable (cloud lane has none) -> models probe below */ }
    if (res && res.ok) {
      const j = await res.json().catch(() => ({}));
      // Healthy = HTTP 2xx AND the proxy self-reports status "ok" (matches the live /health shape:
      // {status:"ok", upstream:"...", authenticated:true}). A 200 with a non-"ok" body is degraded.
      const ok = String(j.status || "").toLowerCase() === "ok";
      return { ok, httpStatus: res.status, authenticated: Boolean(j.authenticated), error: ok ? null : `status=${j.status ?? "?"}` };
    }
    // No /health (cloud lane) OR a non-2xx /health -> an authed /models probe; a 200 means the lane
    // can serve chat right now (the repointed-NVIDIA case). The base is /v1-suffixed (/models lives there).
    const m = await fetch(`${String(url).replace(/\/+$/, "")}/models`, { headers: authHdr, signal: ctrl.signal });
    return { ok: m.ok, httpStatus: m.status, authenticated: m.ok, error: m.ok ? null : `HTTP ${m.status}` };
  } catch (e) {
    return { ok: false, httpStatus: 0, authenticated: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

/** Is a typed cross-substrate edge present in the frozen EDGE_TYPES whitelist?
 *  Imports the module (robust to formatting) rather than regex-scraping. */
export async function checkEdgeTypeInSchema(typeName, schemaPath = join(ROOT, "scripts/lib/cross-substrate-edge-schema.mjs")) {
  if (!existsSync(schemaPath)) return { ok: false, error: "schema-missing" };
  const mod = await import(`file://${schemaPath.replace(/\\/g, "/")}`);
  const types = mod.EDGE_TYPES || {};
  return { ok: Object.prototype.hasOwnProperty.call(types, typeName), allTypes: Object.keys(types) };
}

/** File existence by absolute path (the simplest "is the named artifact built?" probe). */
export function checkFileExists(absPath) {
  return { ok: existsSync(absPath), path: absPath };
}

/** Does a source file import a symbol (used to verify a value is DYNAMIC, not hardcoded)?
 *  e.g. slot-task-claim was claimed "frozen at 12 slots"; verify it imports SLOT_NAMES. */
export function checkSourceImports(filePath, symbol) {
  if (!existsSync(filePath)) return { ok: false, error: "file-missing" };
  const text = readFileSync(filePath, "utf8");
  // Anchor at line start (m flag): a REAL import statement opens its line. This rejects a
  // string-literal that merely embeds the import syntax (e.g. a log message), which would
  // otherwise be a FALSE SHIPPED verdict (scrutiny B P1-1).
  const re = new RegExp(`^\\s*import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}`, "m");
  return { ok: re.test(text), hasSymbol: text.includes(symbol) };
}

/** Count the dispatcher files that route to the MULTI-MODEL consensus engine -- the engine behind
 *  the prism_ai `consensus_decide` action (A-04 asks for it to be propagated to the domain
 *  dispatchers). DETERMINISTIC replacement for the prior handoff-file-existence heuristic (which
 *  the ledger's own note admitted "signals past INTENT only, never live work"). Returns the wiring
 *  breadth: { ok, total, wired:[filenames] }. dir/marker injectable for fixture tests (pure-ish fs). */
export function countDispatchersRoutingToConsensus(
  dir = join(ROOT, "mcp-server/src/tools/dispatchers"),
  marker = "MultiModelConsensusEngine",
) {
  if (!existsSync(dir)) return { ok: false, total: 0, wired: [], error: "dir-missing" };
  const files = readdirSync(dir).filter((f) => f.endsWith("Dispatcher.ts"));
  const wired = files.filter((f) => {
    try {
      // Match the marker in CODE, not comments: strip each line's // comment tail before testing
      // (the sibling checkSourceImports line-anchors for the same reason). A comment-only mention
      // -- e.g. cadDispatcher's "// ... MultiModelConsensusEngine" -- is NOT a route, so counting
      // it would overstate the wiring breadth in the A-04 evidence (3-of-3 P2, all arms).
      return readFileSync(join(dir, f), "utf8")
        .split(/\r?\n/)
        .some((line) => line.replace(/\/\/.*$/, "").includes(marker));
    } catch {
      return false; // an unreadable dispatcher is not counted as wired (fail-soft, never throw)
    }
  });
  return { ok: true, total: files.length, wired };
}

/** Galaxy reflection-synthesis freshness: count + how many are within maxAgeH. */
export function checkSynthesisFreshness(maxAgeH = FRESH_AGE_H, dir = join(ROOT, "knowledge/memories/patterns")) {
  if (!existsSync(dir)) return { ok: false, count: 0, fresh: 0, error: "dir-missing" };
  const files = readdirSync(dir).filter((f) => f.endsWith("_synthesis.md"));
  const now = Date.now();
  let fresh = 0;
  let stalestH = 0;
  for (const f of files) {
    const ageH = (now - statSync(join(dir, f)).mtimeMs) / MS_PER_HOUR;
    if (ageH < maxAgeH) fresh++;
    if (ageH > stalestH) stalestH = ageH;
  }
  return { ok: files.length > 0, count: files.length, fresh, stalestH: Number(stalestH.toFixed(1)) };
}

/** Parse the AI-synergy audit's mean score + weak-galaxy count. The `weak` count is read
 *  from the bands line ("strong N | partial N | weak N") so a stray "weak" elsewhere in the
 *  doc cannot match (P2-2). A format change surfaces as NaN -> ok:false, never a false 0. */
export function checkAiSynergyMean(auditPath = join(ROOT, "state/shared/specs/AI-SYNERGY-AUDIT.md")) {
  if (!existsSync(auditPath)) return { ok: false, error: "audit-missing" };
  const text = readFileSync(auditPath, "utf8");
  const mean = Number((text.match(/Mean synergy score:\*\*\s*([\d.]+)/) || [])[1] ?? NaN);
  const weak = Number((text.match(/partial\s+\d+\s*\|\s*weak\s+(\d+)/) || [])[1] ?? NaN);
  return { ok: Number.isFinite(mean), mean, weak };
}

/** Find the newest ZULU-MASTER-CONTEXT-LEDGER-*.md in specsDir (lexicographic = date order,
 *  the files are dated YYYY-MM-DD). Lets reconcile() warn when the CLAIMS `ledgerSays`
 *  snapshot is older than the live ledger and needs re-syncing (P1-1). */
export function findNewestLedger(specsDir = SPECS_DIR) {
  if (!existsSync(specsDir)) return null;
  const ledgers = readdirSync(specsDir)
    // Require an ISO YYYY-MM-DD suffix so lexicographic sort == chronological order. A loose
    // suffix (DRAFT/v2) would sort after dates and pick the wrong "newest" (scrutiny C P1-B).
    .filter((f) => /^ZULU-MASTER-CONTEXT-LEDGER-\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort();
  return ledgers.length ? ledgers[ledgers.length - 1] : null;
}

// ---- claim registry (the checkable ledger items) ---------------------------
// Each claim: the ledger's stated status + a probe that determines the REAL status.
// ledgerSays = what ZULU-MASTER-CONTEXT-LEDGER-2026-06-11 asserts; probe returns the
// verified verdict. A mismatch (ledger OPEN but probe SHIPPED) is ledger staleness.

export const CLAIMS = [
  {
    id: "OLLAMA-GEN", ledgerSays: "OPEN", roiRank: 1,
    title: "Ollama /api/generate wedge (gates galaxy reflection A-16/B-06/A-09)",
    async probe() {
      const r = await checkOllamaGenerate();
      return { verdict: r.ok ? "SHIPPED" : "OPEN", evidence: r.ok ? `gen OK ${r.ms}ms -> "${r.response}"` : `gen FAIL: ${r.error}` };
    },
  },
  {
    id: "A-13", ledgerSays: "OPEN", roiRank: 5,
    title: "consensus-of cross-substrate edge materialization",
    async probe() {
      const r = await checkEdgeTypeInSchema("consensus-of");
      return { verdict: r.ok ? "SHIPPED" : "OPEN", evidence: r.ok ? `EDGE_TYPES has consensus-of (${r.allTypes.length} types)` : "absent from EDGE_TYPES" };
    },
  },
  {
    id: "A-16", ledgerSays: "OPEN", roiRank: 1,
    title: "per-galaxy reflection synthesis (patterns/<galaxy>_synthesis.md)",
    async probe() {
      // R12-honest: gate on COUNT (reflection arm populated), NOT mtime `fresh`. Canonical
      // staleness is HASH-based (galaxy-synthesis-refresh.mjs: a galaxy is stale only when its
      // memory CLUSTER changed) -- an old mtime just means "no new memories", not stale content.
      // The old `fresh >= MIN` (mtime<24h) gave a FALSE OPEN when galaxies were quiet but current
      // (live 2026-06-22: 34 present, 0 need re-synthesis, yet only 20 mtime-fresh -> phantom OPEN).
      // Same phantom-OPEN class as the A-06 wrong-path bug this harness exists to kill.
      const r = checkSynthesisFreshness(FRESH_AGE_H);
      const ok = r.ok && r.count >= MIN_FRESH_SYNTHESES;
      return { verdict: ok ? "SHIPPED" : "OPEN", evidence: `${r.count} synthesis files present, ${r.fresh} mtime-fresh<${FRESH_AGE_H}h, stalest ${r.stalestH}h (canonical hash-staleness = galaxy-synthesis-refresh's job)` };
    },
  },
  {
    id: "A-14", ledgerSays: "OPEN", roiRank: 14,
    title: "slot-task-claim VALID_SLOTS frozen at 12 (fleet is 26)",
    async probe() {
      const r = checkSourceImports(join(ROOT, ".claude/helpers/slot-task-claim.mjs"), "SLOT_NAMES");
      return { verdict: r.ok ? "SHIPPED" : "OPEN", evidence: r.ok ? "imports dynamic SLOT_NAMES from chat-slots.mjs" : "no SLOT_NAMES import (still hardcoded?)" };
    },
  },
  {
    id: "AI-SYNERGY", ledgerSays: "OPEN", roiRank: 0,
    title: "AI-synergy across all galaxies (improve weak galaxies)",
    async probe() {
      const r = checkAiSynergyMean();
      const ok = r.ok && r.mean >= 1 && r.weak === 0;
      return { verdict: ok ? "SHIPPED" : "OPEN", evidence: r.ok ? `mean synergy ${r.mean}, weak galaxies ${r.weak}` : `audit unreadable: ${r.error}` };
    },
  },
  {
    id: "A-06", ledgerSays: "OPEN", roiRank: 3,
    title: "galaxy READS master brain (dedicated consumer API)",
    async probe() {
      // R12-honest: A-06 asks for a DEDICATED galaxy-brain-read consumer API. SHIPPED 2026-06-11
      // (commit 2f695f24e9 + 8a90b772f5) at scripts/lib/galaxy-brain-read.mjs -- readGalaxyBrain()
      // reads a galaxy's LOCAL brain PLUS the MASTER brain (back-pointer + 34-galaxy cross-recall),
      // wired into galaxy-reasoning-bridge.mjs. The original probe checked the WRONG path
      // ("scripts/galaxy-brain-read.mjs", no lib/) so it reported phantom-OPEN forever -- the
      // reconciler's OWN meta-stale bug, the exact phantom-blocked-routing class it exists to kill.
      // Fixed 2026-06-20 (slot:zulu) to check the real lib/ location (+ legacy path for resilience).
      const dedicated = ["scripts/lib/galaxy-brain-read.mjs", "scripts/galaxy-brain-read.mjs"]
        .some((p) => checkFileExists(join(ROOT, p)).ok);
      if (dedicated) return { verdict: "SHIPPED", evidence: "galaxy-brain-read.mjs present (scripts/lib/); wired into galaxy-reasoning-bridge" };
      return { verdict: "OPEN", evidence: "no galaxy-brain-read.mjs; injectors read galaxy-LOCAL synthesis only" };
    },
  },
  {
    id: "A-04", ledgerSays: "OPEN", roiRank: 14,
    title: "consensus_decide (multi-model) propagated to the domain dispatchers",
    async probe() {
      // DETERMINISTIC wiring probe (replaces the prior handoff-file-existence heuristic, which the
      // code's own note admitted "signals past INTENT only, never live work" -- the one non-$0-
      // deterministic hole in a reconciler whose entire doctrine is deterministic probes).
      // R12 misnomer fix: the ledger says "consensus_ask" but the real prism_ai action is
      // `consensus_decide`, routing to MultiModelConsensusEngine. A-04 wants that engine reachable
      // from the domain dispatchers; count the wiring breadth from source instead of guessing.
      //
      // Verdict stays UNKNOWN BY DESIGN: per-dispatcher consensus propagation is PEER-OWNED
      // (infra-consensus-wire) AND a genuine architecture-scope call (not every domain dispatcher
      // needs a multi-model vote) -- so it is deliberately NOT surfaced as a zulu-buildable OPEN
      // that would re-route the fleet. The evidence is now deterministic so a peer/maintainer
      // decides scope from facts, not a stale handoff file.
      const OWNER = "aiReasoningDispatcher.ts"; // prism_ai owns the engine; not a "domain" dispatcher
      const r = countDispatchersRoutingToConsensus();
      if (!r.ok) return { verdict: "UNKNOWN", evidence: `dispatcher dir unreadable (${r.error}); verify manually` };
      const domainWired = r.wired.filter((f) => f !== OWNER);
      return {
        verdict: "UNKNOWN",
        evidence: `consensus_decide (MultiModelConsensusEngine) wired in ${r.wired.length}/${r.total} dispatchers [${r.wired.join(", ") || "none"}]; ${domainWired.length} domain dispatcher(s) beyond prism_ai -- per-domain propagation is peer-owned (infra-consensus-wire) + a scope call, verify manually`,
      };
    },
  },
];

// ---- meta-systems utilization grades (pure: parsed artifact -> verdict) -----

/** Read+parse a JSON artifact; null on any error (a missing/torn file is "DOWN", not a throw). */
export function readJsonSafe(absPath) {
  try {
    return JSON.parse(readFileSync(absPath, "utf8"));
  } catch {
    return null;
  }
}

/** Count non-blank lines of a JSONL ledger (append-only consensus queue/processed). 0 on miss. */
export function countJsonlLines(absPath) {
  try {
    return readFileSync(absPath, "utf8").split("\n").filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}

/** Newest record timestamp (epoch ms) in an append-only JSONL ledger, or null if the file is
 *  missing/empty/un-timestamped. Reads the LAST non-blank line (append-only => newest is last).
 *  Used to gate "utilized" on drain RECENCY, not lifetime count (scrutiny P2). */
export function newestJsonlTs(absPath, tsKeys = ["drained_at", "ts", "at", "timestamp"]) {
  try {
    const lines = readFileSync(absPath, "utf8").split("\n").filter((l) => l.trim());
    // Walk BACKWARD to the newest PARSEABLE+timestamped record. Surviving a torn/partial final
    // line (crash mid-append) matters: returning null here disables the octopus recency gate ->
    // a stalled drain would read false-green (the wrong fail-soft direction; scrutiny arm A+C P2).
    for (let i = lines.length - 1; i >= 0; i--) {
      let rec;
      try {
        rec = JSON.parse(lines[i]);
      } catch {
        continue; // torn/partial line -> skip to the prior intact record
      }
      for (const k of tsKeys) {
        if (rec[k]) {
          const ms = Date.parse(rec[k]);
          if (Number.isFinite(ms)) return ms;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Ollama offload: is the local-LLM lane live? Liveness+throughput, NOT the adjusted-rate
 *  (that is ollama-offload-dashboard's job -- named in `action` to avoid duplicating its math). */
export function gradeOllamaUtilization(stats, nowMs = Date.now()) {
  if (!stats || typeof stats !== "object") {
    return { system: "ollama", status: "DOWN", evidence: "offload-stats.json unreadable", action: "check mcp-server/data/state/ollama-offload-stats.json + 127.0.0.1:11434" };
  }
  const offloaded = Number(stats.offloaded || 0);
  const exec = Number(stats.executedOffloads || 0);
  const saved = Number(stats.measuredTokensSaved || 0);
  // Decision-time ESTIMATE: what the offloader's classifier projects it WOULD save if every
  // offload directive were adopted -- distinct from `saved` (the MEASURED in/out delta of work
  // that actually RAN through ask-ollama). Surfacing both keeps the evidence honest: a lane that
  // DECIDES well (high offloaded/estSaved) but is rarely EXECUTED (exec~0) is healthy-but-unadopted,
  // NOT dead. Raw existing counters only -- no rate math (the adjusted rate stays the dashboard's job).
  const estSaved = Number(stats.estimatedTokensSaved || 0);
  // RECENCY: `offloaded` is a lifetime counter (since lastReset) -> count>0 alone reads UTILIZED
  // forever. Gate on lastUpdated freshness too: a stale stats file means the offload hook stack
  // is dormant (no chat recording) = the lane is not actually being used now.
  const updatedMs = stats.lastUpdated ? Date.parse(stats.lastUpdated) : NaN;
  const ageH = Number.isFinite(updatedMs) ? (nowMs - updatedMs) / MS_PER_HOUR : Infinity;
  const live = offloaded >= META_OLLAMA_MIN_OFFLOADS && ageH <= META_RECENCY_H;
  // ADOPTION GAP: the lane is live + DECIDING to offload, but ask-ollama is (almost) never actually
  // run -> the directives are injected and ignored, so the projected savings never materialize.
  // status stays UTILIZED (the lane IS live; both metaUtilized count and meta-systems-health-inject
  // key on status, so don't degrade it) -- but `action` surfaces the gap so the reconcile output
  // flags it. This makes "improve ollama offloading effectiveness" a measurable, actionable signal.
  const adoptionGap = live && offloaded > 0 && exec === 0;
  const status = live ? "UTILIZED" : "UNDER-UTILIZED";
  const ageStr = Number.isFinite(ageH) ? `${ageH.toFixed(1)}h` : "never";
  const action = adoptionGap
    ? `offload DECISIONS firing but 0 executed -- ADOPT the auto-offload directives: run \`node scripts/ask-ollama.mjs <mode> <file>\` (or pipe via \`summarize -\`) instead of re-deriving; ~${estSaved} tok/window left on the table`
    : (live ? null : "route mechanical text ops via ask-ollama.mjs / ollama-task-offloader; rate detail: scripts/ollama-offload-dashboard.mjs");
  return {
    system: "ollama",
    status,
    adoptionGap,
    evidence: `${offloaded} offload decisions (~${estSaved} tok est. if all adopted), ${exec} executed (~${saved} tok measured), last activity ${ageStr} ago`,
    action,
  };
}

/** Hermes proxy: is the stronger-than-Ollama managed lane live + healthy (fail rate) AND recent?
 *  `liveProbe` (optional) is a checkHermesProxy() result injected at decision time. It GATES the DOWN
 *  verdict: a high LIFETIME fail-rate alone must NOT pin DOWN, because the offload-ledger `fail`/`fired`
 *  counters are cumulative-forever -- a transient outage (e.g. the proxy was down 2.4h ago, 9/10 lifetime
 *  calls failed) keeps reading DOWN long after the proxy recovered, until ~80 successes dilute the ratio.
 *  That false fleet-wide alarm is the bug this gate fixes. Semantics:
 *    - liveProbe.ok === true  -> proxy healthy NOW: the failures are historical/recovered, NOT a current
 *                                outage -> grade by recency (fresh=UTILIZED, else UNDER), never DOWN.
 *    - liveProbe.ok === false -> ledger AND live probe agree -> confirmed DOWN.
 *    - liveProbe == null      -> no probe done (pure unit test / non-live caller) -> ledger-only fallback
 *                                (preserves the prior behavior + the fixture-only test contract).
 *  Doctrine: require positive DOWN evidence from a live probe at decision time
 *  (reference_mcp_kickoff_falsepos_liveprobe_fix). */
export function gradeHermesUtilization(stats, nowMs = Date.now(), liveProbe = null) {
  const h = stats && stats.byHook && stats.byHook["ask-hermes"];
  if (!h) {
    return { system: "hermes", status: "UNDER-UTILIZED", evidence: "no ask-hermes activity recorded", action: "route stronger-than-ollama text ops via ask-hermes.mjs (Hermes proxy :8645)" };
  }
  const fired = Number(h.fired || 0);
  const fail = Number((h.bySource && h.bySource.fail) || 0);
  const failRate = fired > 0 ? fail / fired : 1;
  // RECENCY (apply-to-all of the ollama/octopus staleness gate, scrutiny P2): `fired` is a LIFETIME
  // counter, so fired>0 alone reads UTILIZED forever even if the last ask-hermes call was weeks ago
  // and the proxy has since died. Gate on lastUsed too -- a healthy lane quiet past the recency window
  // went DORMANT (under-utilized NOW), distinct from a never-used lane. Missing lastUsed -> can't
  // confirm freshness -> treated as stale (mirrors gradeOllamaUtilization's missing-lastUpdated path).
  const usedMs = h.lastUsed ? Date.parse(h.lastUsed) : NaN;
  const ageH = Number.isFinite(usedMs) ? (nowMs - usedMs) / MS_PER_HOUR : Infinity;
  const fresh = ageH <= META_RECENCY_H;
  const ledgerWouldSayDown = fired > 0 && failRate > META_HERMES_MAX_FAIL_RATE;
  // A high lifetime fail-rate is now only SUSPICION, not proof. When suspicious, the live probe is the
  // arbiter; absent a probe (null) we keep the prior ledger-only DOWN so non-live callers + the fixture
  // tests are unchanged. `recovered` = ledger looked down but the proxy answered healthy right now.
  const probedUp = liveProbe && liveProbe.ok === true;
  const probedDown = liveProbe && liveProbe.ok === false;
  const recovered = ledgerWouldSayDown && probedUp;
  // ledgerWouldSayDown && NOT confirmed-up-by-live-probe -> DOWN (probedDown agrees; null = ledger-only
  // fallback). Otherwise (healthy ledger, OR a recovered lane the live probe found up) -> recency grade.
  let status;
  if (fired === 0) status = "UNDER-UTILIZED";
  else if (ledgerWouldSayDown && !probedUp) status = "DOWN";
  else status = fresh ? "UTILIZED" : "UNDER-UTILIZED";
  const ageStr = Number.isFinite(ageH) ? `${ageH.toFixed(1)}h` : "never";
  // Evidence suffix names WHY a high-fail-rate lane is NOT down (recovered) or HOW down was confirmed.
  const suffix = recovered ? " -- proxy live now (failures historical/recovered)"
    : (status === "DOWN" && probedDown) ? ` -- live probe :8645 failed (${liveProbe.error || "no response"})`
    : "";
  return {
    system: "hermes",
    status,
    evidence: `${fired} ask-hermes calls, ${fail} fail (${(failRate * 100).toFixed(1)}% fail), last activity ${ageStr} ago${suffix}`,
    action: status === "UTILIZED" ? null
      : status === "DOWN" ? "verify Hermes proxy :8645 up + ask-hermes ollama-fallback chain"
      : fired > 0
        ? "ask-hermes lane went quiet (>48h) -- route stronger-than-ollama text ops via ask-hermes.mjs (Hermes proxy :8645)"
        : "route stronger-than-ollama text ops via ask-hermes.mjs (Hermes proxy :8645)",
  };
}

/** Octopus consensus: has the multi-model consensus loop run end-to-end (processed > 0)?
 *  A large QUEUE with processed>0 is EXPECTED (trickle-drain by design = GPU protection),
 *  NOT a fault -- only processed==0 with a non-empty queue is a stalled drain. */
export function gradeOctopusUtilization({ queueCount, processedCount, lastDrainAgeH = null } = {}) {
  const q = Number(queueCount || 0);
  const p = Number(processedCount || 0);
  if (p === 0 && q === 0) {
    return { system: "octopus", status: "UNDER-UTILIZED", evidence: "no consensus asks queued or processed", action: "invoke prism_ai:consensus_decide; verify auto-consensus-userprompt hook fires" };
  }
  if (p === 0 && q > 0) {
    return { system: "octopus", status: "UNDER-UTILIZED", evidence: `${q} queued, 0 processed -- drain stalled`, action: "run .claude/scripts/consensus-queue-drain.mjs; check stop-consensus-drain process-lock" };
  }
  if (q === 0) {
    return { system: "octopus", status: "UTILIZED", evidence: `${p} consensus asks processed, queue empty (fully drained)`, action: null };
  }
  // p>0 && q>0: a deep queue is EXPECTED (trickle-drain by design = GPU protection) ONLY if the
  // drain is still RUNNING. processedCount is lifetime/append-only, so it can't tell a healthy
  // trickle from a 3-day-stalled drain -- gate on drain RECENCY (newest processed ts). A backlog
  // atop a stale last-drain = the drain fell behind (NOT by-design), surfaced honestly.
  const ageStr = lastDrainAgeH == null ? "unknown" : `${Number(lastDrainAgeH).toFixed(1)}h`;
  // Unknown drain recency atop a non-empty queue -> fail to the NEEDS-ATTENTION side, never green.
  // (e.g. a torn processed.jsonl that yields no parseable drain ts -> newestJsonlTs returns null.)
  if (lastDrainAgeH == null) {
    return { system: "octopus", status: "UNDER-UTILIZED", evidence: `${q} queued, drain recency unknown (no parseable drain ts) -- verify drain ran`, action: "run .claude/scripts/consensus-queue-drain.mjs; check stop-consensus-drain process-lock" };
  }
  if (lastDrainAgeH > META_RECENCY_H) {
    return { system: "octopus", status: "UNDER-UTILIZED", evidence: `${q} queued, last drain ${ageStr} ago -- drain fell behind`, action: "run .claude/scripts/consensus-queue-drain.mjs; check stop-consensus-drain process-lock" };
  }
  return { system: "octopus", status: "UTILIZED", evidence: `${p} processed, ${q} queued, last drain ${ageStr} ago (healthy trickle)`, action: null };
}

/** Obsidian reflection arm: is the per-galaxy synthesis corpus BUILT + populated? Gated on
 *  COUNT (mtime is informational only -- see the A-16 probe note for why mtime != staleness). */
export function gradeObsidianUtilization(freshness) {
  if (!freshness || !freshness.ok) {
    return { system: "obsidian", status: "DOWN", evidence: `synthesis dir unreadable: ${freshness?.error || "?"}`, action: "check knowledge/memories/patterns/" };
  }
  const status = freshness.count >= META_OBSIDIAN_MIN_SYNTH ? "UTILIZED" : "UNDER-UTILIZED";
  return {
    system: "obsidian",
    status,
    evidence: `${freshness.count} galaxy syntheses present (${freshness.fresh} mtime<${FRESH_AGE_H}h, stalest ${freshness.stalestH}h -- mtime informational)`,
    action: status === "UTILIZED" ? null : "run galaxy-synthesis-refresh.mjs (incremental) or galaxy-reflection-synthesis.mjs --all",
  };
}

/** Six-domain auto-firing arm: is the per-domain approach-knowledge layer (the goal's
 *  "pull automatically" mechanism) actually FIRING + bundle-wired for every domain?
 *  `coverage` is a buildCoverage() snapshot from six-domain-autofire-coverage.mjs.
 *  A non-firing or un-wired domain = the auto-pull knowledge is silently dead for that
 *  domain (the "green exit hides a dead feature" class) -> surfaces as DOWN. */
export function gradeAutofireCoverage(coverage) {
  if (!coverage || !coverage.rollup || !Array.isArray(coverage.rows)) {
    return { system: "autofire", status: "DOWN", evidence: "six-domain coverage unreadable", action: "node scripts/six-domain-autofire-coverage.mjs" };
  }
  const r = coverage.rollup;
  const broken = coverage.rows.filter((x) => !x.fires).map((x) => x.key);
  const unwired = coverage.rows.filter((x) => !x.bundleWired).map((x) => x.key);
  if (r.allFire && r.allWired) {
    return {
      system: "autofire",
      status: "UTILIZED",
      evidence: `all 6 domains fire + bundle-wired (${r.gatesVerifiedTotal} verified gates, verify-backlog ${r.verifyBacklog})`,
      action: null,
    };
  }
  const parts = [];
  if (broken.length) parts.push(`NOT firing: ${broken.join(", ")}`);
  if (unwired.length) parts.push(`NOT bundle-wired: ${unwired.join(", ")}`);
  return {
    system: "autofire",
    status: "DOWN",
    evidence: `domain auto-firing regressed -- ${parts.join("; ")}`,
    action: "node scripts/six-domain-autofire-coverage.mjs (a domain approach-knowledge lib or its ups-domain-bundle wiring broke)",
  };
}

/** Roll up the meta-systems verdicts (4 always-on + the 5th autofire arm when a coverage
 *  snapshot is supplied). Args injectable (pure, fixture-testable -> no IO in tests). */
export function reconcileMetaSystems({
  stats = readJsonSafe(OFFLOAD_STATS_PATH),
  freshness = checkSynthesisFreshness(FRESH_AGE_H),
  queueCount = countJsonlLines(CONSENSUS_QUEUE_PATH),
  processedCount = countJsonlLines(CONSENSUS_PROCESSED_PATH),
  nowMs = Date.now(),
  // Optional checkHermesProxy() result. null = no live probe (pure/sync callers) -> gradeHermesUtilization
  // falls back to ledger-only DOWN. The async reconcileMetaSystemsLive() supplies it when the ledger
  // fail-rate would otherwise alarm, so a recovered transient outage never false-alarms.
  hermesLiveProbe = null,
  // Optional buildCoverage() snapshot for the six-domain autofire arm. null (pure sync
  // callers / fixtures) -> the 5th substrate is omitted, keeping the array at 4 (no churn).
  autofireCoverage = null,
  lastDrainAgeH = (() => {
    // Key on the DRAIN time only: an enqueue `ts` fallback would understate staleness (a freshly
    // enqueued-but-undrained item reads "recent") -> false-green. Missing drain ts -> null -> the
    // octopus grade treats it as needs-attention (scrutiny arm A P2).
    const ts = newestJsonlTs(CONSENSUS_PROCESSED_PATH, ["drained_at", "processed_at"]);
    return ts == null ? null : (nowMs - ts) / MS_PER_HOUR;
  })(),
} = {}) {
  const out = [
    gradeOllamaUtilization(stats, nowMs),
    gradeHermesUtilization(stats, nowMs, hermesLiveProbe),
    gradeOctopusUtilization({ queueCount, processedCount, lastDrainAgeH }),
    gradeObsidianUtilization(freshness),
  ];
  // 5th substrate only when a coverage snapshot is supplied (the async Live variant
  // computes it). Pure sync callers stay at 4 -> existing fixtures unchanged.
  if (autofireCoverage != null) out.push(gradeAutofireCoverage(autofireCoverage));
  return out;
}

/** Async variant of reconcileMetaSystems that performs ONE live Hermes proxy probe -- but only when the
 *  offload ledger's lifetime fail-rate would otherwise declare the lane DOWN. The healthy/common path
 *  does NO network (a cheap pure pre-grade decides), so this stays as fast as the sync path for a healthy
 *  fleet; the cost (one timeout-bounded GET) is paid only on the rare degraded-ledger session, exactly
 *  when a false alarm would otherwise fire. All other verdicts are identical to the sync path. */
export async function reconcileMetaSystemsLive(opts = {}) {
  const stats = opts.stats !== undefined ? opts.stats : readJsonSafe(OFFLOAD_STATS_PATH);
  const nowMs = opts.nowMs ?? Date.now();
  let hermesLiveProbe = opts.hermesLiveProbe ?? null;
  if (hermesLiveProbe == null) {
    // Pure, cheap pre-grade off the ledger; probe live ONLY if it would alarm DOWN (no IO on the healthy path).
    const pre = gradeHermesUtilization(stats, nowMs);
    if (pre.status === "DOWN") {
      hermesLiveProbe = await checkHermesProxy();
    }
  }
  // Six-domain autofire arm: prove the per-domain approach-knowledge layer fires live.
  // Lazy-imported + fail-soft -- a broken coverage probe must never break meta-health.
  let autofireCoverage = opts.autofireCoverage ?? null;
  if (autofireCoverage == null) {
    try {
      const { buildCoverage } = await import("./six-domain-autofire-coverage.mjs");
      autofireCoverage = await buildCoverage();
    } catch {
      autofireCoverage = null;
    }
  }
  return reconcileMetaSystems({ ...opts, stats, nowMs, hermesLiveProbe, autofireCoverage });
}

// ---- runner ----------------------------------------------------------------

export async function reconcile() {
  // Sequential by design: only OLLAMA-GEN is slow (one local ping); the rest are fast fs
  // reads. A fixed 7-item list does not benefit from parallel fan-out, and ordered output
  // is easier to diff across runs.
  const results = [];
  for (const c of CLAIMS) {
    let out;
    try {
      out = await c.probe();
    } catch (e) {
      out = { verdict: "UNKNOWN", evidence: `probe error: ${String(e?.message || e)}` };
    }
    const stale = c.ledgerSays === "OPEN" && out.verdict === "SHIPPED";
    results.push({ id: c.id, title: c.title, roiRank: c.roiRank, ledgerSays: c.ledgerSays, ...out, ledgerStale: stale });
  }
  const metaSystems = await reconcileMetaSystemsLive();
  const newestLedger = findNewestLedger();
  const ledgerSnapshotStale = Boolean(newestLedger && newestLedger !== LEDGER_SNAPSHOT);
  const summary = {
    total: results.length,
    shipped: results.filter((r) => r.verdict === "SHIPPED").length,
    open: results.filter((r) => r.verdict === "OPEN").length,
    covered: results.filter((r) => r.verdict === "COVERED").length,
    unknown: results.filter((r) => r.verdict === "UNKNOWN").length,
    ledgerStaleCount: results.filter((r) => r.ledgerStale).length,
    metaUtilized: metaSystems.filter((m) => m.status === "UTILIZED").length,
    metaTotal: metaSystems.length,
    ledgerSnapshot: LEDGER_SNAPSHOT,
    newestLedger,
    ledgerSnapshotStale, // CLAIMS.ledgerSays was synced against LEDGER_SNAPSHOT; a newer
                         // ledger file exists -> re-sync CLAIMS before trusting --strict.
  };
  return { generatedAt: new Date().toISOString(), summary, results, metaSystems };
}

function isMain() {
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
}

if (isMain()) {
  const json = process.argv.includes("--json");
  const strict = process.argv.includes("--strict");
  const report = await reconcile();
  try {
    mkdirSync(dirname(SIDECAR), { recursive: true });
    const tmp = `${SIDECAR}.tmp`; // atomic write: tmp + rename (P1-3, no torn JSON on kill)
    writeFileSync(tmp, JSON.stringify(report, null, 2));
    renameSync(tmp, SIDECAR);
  } catch (e) {
    console.error(`[reconcile-zulu-ledger] sidecar write failed: ${e?.message || e}`);
  }
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`ZULU LEDGER RECONCILE -- ${report.generatedAt}`);
    console.log(`  ${report.summary.shipped} SHIPPED | ${report.summary.open} OPEN | ${report.summary.covered} COVERED | ${report.summary.unknown} UNKNOWN`);
    console.log(`  ledger-stale (says OPEN but verified SHIPPED): ${report.summary.ledgerStaleCount}`);
    if (report.summary.ledgerSnapshotStale) {
      console.log(`  [WARN] CLAIMS synced against ${report.summary.ledgerSnapshot} but newest ledger is ${report.summary.newestLedger} -- re-sync CLAIMS.ledgerSays`);
    }
    for (const r of report.results) {
      const flag = r.ledgerStale ? " [STALE]" : "";
      console.log(`  [${r.verdict.padEnd(7)}] ${r.id.padEnd(11)} ${r.title}${flag}`);
      console.log(`              ${r.evidence}`);
    }
    console.log(`META-SYSTEMS UTILIZATION -- ${report.summary.metaUtilized}/${report.summary.metaTotal} utilized (is-it-USED, not is-it-built)`);
    for (const m of report.metaSystems) {
      console.log(`  [${m.status.padEnd(15)}] ${m.system.padEnd(9)} ${m.evidence}`);
      if (m.action) console.log(`              -> ${m.action}`);
    }
    console.log(`  sidecar: ${SIDECAR}`);
  }
  if (strict && report.summary.ledgerStaleCount > 0) {
    if (report.summary.ledgerSnapshotStale) {
      // CLAIMS.ledgerSays may itself be stale vs the newer ledger -> the SHIPPED-vs-OPEN
      // mismatch is a re-sync artifact, not real ledger rot. Warn but do NOT exit 1
      // (scrutiny A/C P1: a cron must not alert on a known-stale CLAIMS registry).
      console.error(`[reconcile-zulu-ledger] --strict: CLAIMS synced against ${report.summary.ledgerSnapshot} but newest ledger is ${report.summary.newestLedger}; re-sync CLAIMS before trusting exit code (not exiting 1)`);
      process.exit(0);
    }
    process.exit(1);
  }
  process.exit(0);
}
