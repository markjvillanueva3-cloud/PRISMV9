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
const DEFAULT_MODEL = process.env.PRISM_OLLAMA_MODEL || "qwen2.5-coder:32b";
const SPECS_DIR = join(ROOT, "state/shared/specs");
const SIDECAR = join(SPECS_DIR, "ZULU-LEDGER-RECONCILE-LATEST.json");
const MS_PER_HOUR = 3.6e6;
const FRESH_AGE_H = 24; // a galaxy synthesis younger than this counts as current
const MIN_FRESH_SYNTHESES = 30; // >=30 of 34 galaxies fresh => reflection arm is live
// The ledger snapshot whose per-item `ledgerSays` the CLAIMS registry was synced against.
// If a NEWER ZULU-MASTER-CONTEXT-LEDGER-*.md exists, the hardcoded ledgerSays values may be
// stale -> findNewestLedger() surfaces it so a maintainer re-syncs CLAIMS (P1-1).
const LEDGER_SNAPSHOT = "ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md";

// ---- deterministic checks (pure, exported for test) ------------------------

/** POST /api/generate with a tiny prompt; proves the GENERATION endpoint (not just
 *  the daemon) is alive. The ledger's #1 ROI blocker was a wedged /api/generate. */
export async function checkOllamaGenerate(url = DEFAULT_OLLAMA_URL, model = DEFAULT_MODEL, timeoutMs = 20000) {
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
      const r = checkSynthesisFreshness(FRESH_AGE_H);
      const ok = r.ok && r.fresh >= MIN_FRESH_SYNTHESES;
      return { verdict: ok ? "SHIPPED" : "OPEN", evidence: `${r.count} synthesis files, ${r.fresh} fresh<${FRESH_AGE_H}h, stalest ${r.stalestH}h` };
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
      // R12-honest (scrutiny P0-1): A-06 asks for a DEDICATED galaxy-brain-read consumer API.
      // No such script exists. slot-context-bundle-inject + galaxy-reasoning-bridge read each
      // galaxy's OWN synthesis/doctrine (galaxy-LOCAL), NOT the top-level master brain -- so
      // they do NOT cover the master-brain consumer read. Verdict OPEN, not COVERED.
      const dedicated = checkFileExists(join(ROOT, "scripts/galaxy-brain-read.mjs")).ok;
      if (dedicated) return { verdict: "SHIPPED", evidence: "galaxy-brain-read.mjs present" };
      return { verdict: "OPEN", evidence: "no galaxy-brain-read.mjs; existing injectors read galaxy-LOCAL synthesis/doctrine (cross-galaxy cards inject partial master context, but not a dedicated master-brain read API)" };
    },
  },
  {
    id: "A-04", ledgerSays: "OPEN", roiRank: 14,
    title: "consensus_ask wired to all 7 domain dispatchers",
    async probe() {
      // Peer-owned per-dispatcher action wiring -- not a deterministic file-presence check.
      // Report UNKNOWN honestly; a PID-keyed handoff signals past INTENT only, never live work
      // (scrutiny P0-2 existsSync guard + P1-4 softened evidence).
      const hdir = join(ROOT, "state/shared/handoffs");
      const handoff = existsSync(hdir) && readdirSync(hdir).find((f) => /infra-consensus-wire/i.test(f));
      return { verdict: "UNKNOWN", evidence: handoff ? `handoff file exists (age unverified): ${handoff}; verify manually` : "no peer handoff found; verify manually" };
    },
  },
];

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
  const newestLedger = findNewestLedger();
  const ledgerSnapshotStale = Boolean(newestLedger && newestLedger !== LEDGER_SNAPSHOT);
  const summary = {
    total: results.length,
    shipped: results.filter((r) => r.verdict === "SHIPPED").length,
    open: results.filter((r) => r.verdict === "OPEN").length,
    covered: results.filter((r) => r.verdict === "COVERED").length,
    unknown: results.filter((r) => r.verdict === "UNKNOWN").length,
    ledgerStaleCount: results.filter((r) => r.ledgerStale).length,
    ledgerSnapshot: LEDGER_SNAPSHOT,
    newestLedger,
    ledgerSnapshotStale, // CLAIMS.ledgerSays was synced against LEDGER_SNAPSHOT; a newer
                         // ledger file exists -> re-sync CLAIMS before trusting --strict.
  };
  return { generatedAt: new Date().toISOString(), summary, results };
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
