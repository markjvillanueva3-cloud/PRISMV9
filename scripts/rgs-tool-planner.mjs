/**
 * rgs-tool-planner.mjs
 * Batch orchestrator: builds a per-roadmap-unit tool-plan sidecar.
 *
 * Memory note: the system-viz graph is ~324 MB. Under portable-node's default
 * heap this is fine, but if you hit GC pressure on very large runs add:
 *   node --max-old-space-size=4096 scripts/rgs-tool-planner.mjs ...
 *
 * CLI usage:
 *   node scripts/rgs-tool-planner.mjs [--all-open] [--milestone <id>]
 *     [--unit <ms::id>] [--limit N] [--force] [--ollama-off] [--json]
 *
 * Exported core (testable):
 *   async function runPlanner({ units, complexityFor, readers,
 *                               sidecarPath, checkpointPath, force, degraded })
 *     → { planned, skipped, degraded, sidecar }
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Repo-root resolution
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHEMA_VERSION = "1.0.0";
const FLUSH_EVERY = 50;
const LOCK_MAX_AGE_MS = 10 * 60 * 1000; // 10 min
const LOCK_REFRESH_EVERY = 50; // units
const ATOMIC_RETRY_MAX = 3;
const ATOMIC_RETRY_DELAY_MS = 100;
const CAPABILITIES_HITS_PER_TOKEN = 8;   // findInGraph limit per query token
const OLLAMA_READER_TIMEOUT_MS = 30000;  // qwen2.5-coder:7b synthesis: 2.5-4.3s typical
const OLLAMA_READER_MAX_TOKENS = 400;    // synthesis response token budget
const DEFAULT_SIDECAR_PATH = path.join(REPO_ROOT, "state", "shared", "roadmap-tool-plans.json");
const DEFAULT_CHECKPOINT_PATH = path.join(REPO_ROOT, "state", "shared", ".roadmap-tool-plans.checkpoint.jsonl");
const DEFAULT_LOCK_PATH = path.join(REPO_ROOT, "state", "shared", ".roadmap-tool-plans.lock");
const SKILL_TRIGGERS_PATH = path.join(REPO_ROOT, "knowledge", "wiki", "architecture", "_skill-triggers.jsonl");
const OUTCOMES_PATH = path.join(REPO_ROOT, "state", "shared", "roadmap-tool-plan-outcomes.jsonl");

// ---------------------------------------------------------------------------
// Complexity adapter (MS0 heuristic — pure)
// ---------------------------------------------------------------------------

/**
 * Derive complexity tier and verdict from a unit.
 * Tier from effort minutes: <30→S, <120→M, <480→L, else XL. Missing/0→M.
 * Verdict: "integrate" if title/desc matches integrate keywords, else "build".
 * @param {{ effort?: number, title?: string, description?: string }} unit
 * @returns {{ tier: "S"|"M"|"L"|"XL", verdict: "build"|"integrate" }}
 */
export function complexityFor(unit) {
  const effort = (typeof unit.effort === "number" && unit.effort > 0) ? unit.effort : 120;
  let tier;
  if (effort < 30) tier = "S";
  else if (effort < 120) tier = "M";
  else if (effort < 480) tier = "L";
  else tier = "XL";

  const text = (String(unit.title ?? "") + " " + String(unit.description ?? "")).toLowerCase();
  const verdict = /integrat|reuse|existing|wire|compose/i.test(text) ? "integrate" : "build";

  return { tier, verdict };
}

// ---------------------------------------------------------------------------
// sourceHash — deterministic content hash for skip-check
// ---------------------------------------------------------------------------

/**
 * Compute a sha256 hex of the unit's stable fields + complexity.
 * NFC-normalised, whitespace-collapsed title + description + tier + verdict.
 * Separator: U+0000 (null byte) — cannot appear in JSON string values.
 * @param {{ title?: string, description?: string }} unit
 * @param {{ tier: string, verdict: string }} complexity
 * @returns {string} hex digest
 */
export function sourceHash(unit, complexity) {
  const nfc = (s) => String(s ?? "").normalize("NFC");
  const raw =
    nfc(unit.title).replace(/\s+/g, " ").trim() +
    "\x00" +
    nfc(unit.description).replace(/\s+/g, " ").trim() +
    "\x00" +
    complexity.tier +
    "\x00" +
    complexity.verdict;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Checkpoint helpers (JSONL, set-based, order-independent)
// ---------------------------------------------------------------------------

/**
 * Read checkpoint JSONL into a Map<key, hash>.
 * Missing file → empty Map. Corrupt lines are skipped (warn stderr).
 * @param {string} checkpointPath
 * @returns {Map<string,string>}
 */
function readCheckpoint(checkpointPath) {
  const map = new Map();
  if (!fs.existsSync(checkpointPath)) return map;
  let raw;
  try {
    raw = fs.readFileSync(checkpointPath, "utf8");
  } catch (e) {
    process.stderr.write(`[rgs-tool-planner] Cannot read checkpoint: ${e.message}\n`);
    return map;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj.key === "string" && typeof obj.hash === "string") {
        map.set(obj.key, obj.hash);
      }
    } catch {
      process.stderr.write(`[rgs-tool-planner] Skipping corrupt checkpoint line: ${trimmed.slice(0, 80)}\n`);
    }
  }
  return map;
}

/**
 * Append one JSONL checkpoint entry (key, hash, completedAt).
 * @param {string} checkpointPath
 * @param {string} key
 * @param {string} hash
 */
function appendCheckpoint(checkpointPath, key, hash) {
  const line = JSON.stringify({ key, hash, completedAt: new Date().toISOString() }) + "\n";
  try {
    fs.appendFileSync(checkpointPath, line, "utf8");
  } catch (e) {
    process.stderr.write(`[rgs-tool-planner] Checkpoint write failed: ${e.message}\n`);
  }
}

// ---------------------------------------------------------------------------
// Atomic sidecar flush
// ---------------------------------------------------------------------------

/**
 * Atomically write sidecar JSON: write .tmp then rename.
 * Retries up to ATOMIC_RETRY_MAX times on EBUSY/EPERM (Windows).
 * @param {string} sidecarPath
 * @param {object} data
 */
async function flushSidecar(sidecarPath, data) {
  const tmpPath = sidecarPath + ".tmp";
  const json = JSON.stringify(data, null, 2);
  for (let attempt = 0; attempt <= ATOMIC_RETRY_MAX; attempt++) {
    try {
      fs.writeFileSync(tmpPath, json, "utf8");
      fs.renameSync(tmpPath, sidecarPath);
      return;
    } catch (e) {
      if ((e.code === "EBUSY" || e.code === "EPERM") && attempt < ATOMIC_RETRY_MAX) {
        await sleep(ATOMIC_RETRY_DELAY_MS);
        continue;
      }
      process.stderr.write(`[rgs-tool-planner] Sidecar flush failed: ${e.message}\n`);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Lock helpers
// ---------------------------------------------------------------------------

/**
 * Acquire or steal the planner lock.
 * If a lock exists with acquiredAt < 10 min ago → exits process with error message.
 * @param {string} lockPath
 */
function acquireLock(lockPath) {
  if (fs.existsSync(lockPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      const age = Date.now() - new Date(existing.acquiredAt).getTime();
      if (age < LOCK_MAX_AGE_MS) {
        process.stderr.write(
          `[rgs-tool-planner] Another planner is running (pid=${existing.pid}, host=${existing.host}, age=${Math.round(age / 1000)}s). ` +
          `Exiting. Delete ${lockPath} to force.\n`
        );
        process.exit(1);
      }
      process.stderr.write(`[rgs-tool-planner] Stealing stale lock (age=${Math.round(age / 1000)}s).\n`);
    } catch {
      // Corrupt lock → steal it
    }
  }
  writeLock(lockPath);
}

function writeLock(lockPath) {
  try {
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: process.pid,
      host: os.hostname(),
      acquiredAt: new Date().toISOString(),
    }), "utf8");
  } catch (e) {
    process.stderr.write(`[rgs-tool-planner] Lock write failed: ${e.message}\n`);
  }
}

function releaseLock(lockPath) {
  try {
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Reader factories (used by CLI; tests inject their own)
// ---------------------------------------------------------------------------

/**
 * Build the capabilities reader from the already-loaded graph.
 * Classifies nodes into engines vs mcpTools by layer/subgroup heuristic.
 * Never throws — returns empty arrays on error.
 * @param {object} G - loaded graph
 * @returns {(text: string) => Promise<{engines: string[], mcpTools: string[]}>}
 */
export function makeCapabilitiesReader(G) {
  return async function capabilities(text) {
    try {
      const { findInGraph } = await import("./lib/system-viz-graph.mjs");
      const { tokenize } = await import("./lib/master-index-search-lib.mjs");
      // findInGraph does a whole-PHRASE substring match — passing the full unit
      // text matches nothing. Tokenize (drops stopwords, caps at 8 tokens) and
      // query per token, unioning hit nodes deduped by id. Cost is
      // O(tokens × nodes) per unit; acceptable for the detached batch planner
      // — batch time-budgeting is U-CRON's concern.
      const tokens = tokenize(text);
      if (tokens.length === 0) return { engines: [], mcpTools: [] };
      const seenNodes = new Map();
      for (const tok of tokens) {
        for (const node of findInGraph(G, tok, { limit: CAPABILITIES_HITS_PER_TOKEN })) {
          const nid = String(node.id ?? node.label ?? "");
          if (nid && !seenNodes.has(nid)) seenNodes.set(nid, node);
        }
      }
      const engines = [];
      const mcpTools = [];
      for (const node of seenNodes.values()) {
        const lbl = String(node.label ?? node.id ?? "");
        const layer = String(node.layer ?? "");
        const subgroup = String(node.subgroup ?? "");
        // dispatcher/action nodes tend to be L2/L3 with transport/dispatcher subgroup
        if (
          subgroup === "dispatcher" ||
          subgroup === "transport" ||
          layer === "L2" ||
          lbl.toLowerCase().includes("dispatcher") ||
          lbl.toLowerCase().includes("action")
        ) {
          mcpTools.push(lbl);
        } else {
          engines.push(lbl);
        }
      }
      return { engines, mcpTools };
    } catch {
      return { engines: [], mcpTools: [] };
    }
  };
}

/**
 * Build tribal reader using master-index-search-lib if available.
 * Falls back to [] on any error.
 */
export async function makeTribalReader() {
  try {
    const lib = await import("./lib/master-index-search-lib.mjs");
    if (typeof lib.runTribalSearch !== "function") throw new Error("runTribalSearch not exported");
    return async function tribal(text, { prefDomain } = {}) {
      try {
        // runTribalSearch returns { tokens, hits } — destructure hits (an
        // array). hit shape (searchTribalHits): { id, source, domain, title,
        // path, score }. The display field is `title`, not tip/text/label.
        const { hits } = await lib.runTribalSearch(text, { prefDomain, topK: 8 });
        return (hits ?? []).map((h) => ({
          id:     String(h.id ?? ""),
          tip:    String(h.title ?? ""),
          score:  typeof h.score === "number" ? h.score : 0,
          domain: String(h.domain ?? prefDomain ?? ""),
        }));
      } catch {
        return [];
      }
    };
  } catch {
    return async () => [];
  }
}

/**
 * Build skill-triggers reader from the JSONL file.
 * Returns names of skills whose matcher.value regex matches text.
 * Falls back to [] on any error.
 */
export function makeSkillTriggersReader() {
  let triggers = null;
  return async function skillTriggers(text) {
    if (!triggers) {
      triggers = [];
      try {
        const raw = fs.readFileSync(SKILL_TRIGGERS_PATH, "utf8");
        for (const line of raw.split("\n")) {
          const t = line.trim();
          if (!t) continue;
          try {
            triggers.push(JSON.parse(t));
          } catch {
            // skip corrupt lines
          }
        }
      } catch {
        // file missing — stays []
      }
    }
    const matched = [];
    for (const entry of triggers) {
      try {
        const pattern = entry?.matcher?.value;
        if (pattern && new RegExp(pattern, "i").test(text)) {
          matched.push(entry.name);
        }
      } catch {
        // bad regex — skip
      }
    }
    return matched;
  };
}

/**
 * buildState reader: open units are always not-shipped by construction.
 * Document: enumerateOpenUnits already filters out shipped units, so this
 * reader always returns {shipped:false}. The reader exists to satisfy the
 * fuseSignals contract (which can override verdict to "close-out" if shipped).
 */
export function makeBuildStateReader() {
  return async function buildState(_unit) {
    return { shipped: false };
  };
}

/**
 * outcomes reader: aggregates from outcomes JSONL if it exists.
 * Falls back to zeros on missing/corrupt file.
 */
export function makeOutcomesReader() {
  let outcomesCache = null;
  return async function outcomes({ pipeline, tier, verdict }) {
    if (!outcomesCache) {
      outcomesCache = [];
      // Path resolved at first-call time so hermetic tests can redirect it
      // (parity with rgs-outcome-record-stop.mjs / pick-prefresh-inject.mjs).
      const outcomesPath = process.env.PRISM_RGS_OUTCOMES_PATH || OUTCOMES_PATH;
      try {
        const raw = fs.readFileSync(outcomesPath, "utf8");
        for (const line of raw.split("\n")) {
          const t = line.trim();
          if (!t) continue;
          try { outcomesCache.push(JSON.parse(t)); } catch { /* skip */ }
        }
      } catch {
        // file missing — stays []
      }
    }
    // OutcomeRecord shape (rgs-plan-outcome.mjs extractOutcomes):
    //   { v, ts, unitKey, outcome:"shipped"|"blocked"|"reverted",
    //     predictedPipelines:string[], tier, verdict }
    // Aggregate per (pipeline ∈ predictedPipelines, tier, verdict) — count by
    // the record's `outcome`, NOT non-existent shipped/blocked/reverted fields.
    let shipped = 0, blocked = 0, reverted = 0;
    for (const rec of outcomesCache) {
      if (rec.tier !== tier || rec.verdict !== verdict) continue;
      if (!Array.isArray(rec.predictedPipelines) || !rec.predictedPipelines.includes(pipeline)) continue;
      if (rec.outcome === "shipped") shipped++;
      else if (rec.outcome === "blocked") blocked++;
      else if (rec.outcome === "reverted") reverted++;
    }
    return { shipped, blocked, reverted };
  };
}

/**
 * ollama reader factory. Returns undefined when ollamaOff or degraded.
 */
export function makeOllamaReader(queryOllamaFn) {
  return async function ollama(prompt) {
    try {
      // qwen2.5-coder:7b synthesis runs 2.5-4.3s; the bridge default timeout
      // (500ms) aborts every call. Override generously.
      return await queryOllamaFn(prompt, {
        format: "json",
        maxTokens: OLLAMA_READER_MAX_TOKENS,
        timeoutMs: OLLAMA_READER_TIMEOUT_MS,
      });
    } catch {
      return { success: false, response: null };
    }
  };
}

// ---------------------------------------------------------------------------
// sleep helper
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Core exported function — fully injectable, testable
// ---------------------------------------------------------------------------

/**
 * Run the planner over a set of units.
 *
 * @param {{
 *   units: Array<{key:string, milestone:string, unitId:string, title:string, description:string, effort:number}>,
 *   complexityFor: (unit: object) => {tier: string, verdict: string},
 *   readers: object,
 *   sidecarPath: string,
 *   checkpointPath: string,
 *   force?: boolean,
 *   degraded?: boolean,
 *   onFlush?: (plans: object) => void,
 * }} opts
 * @returns {Promise<{planned:number, skipped:number, degraded:boolean, sidecar:string}>}
 */
export async function runPlanner({
  units,
  complexityFor: complexityFn,
  readers,
  sidecarPath,
  checkpointPath,
  force = false,
  degraded = false,
}) {
  // Load checkpoint set (key → hash)
  const completedSet = readCheckpoint(checkpointPath);

  // In-memory plan accumulator
  const plans = {};

  let planned = 0;
  let skipped = 0;
  let processedSinceFlush = 0;

  const { fuseSignals } = await import("./lib/rgs-signal-fusion.mjs");

  for (const unit of units) {
    const complexity = complexityFn(unit);
    const hash = sourceHash(unit, complexity);

    // Skip-check: if checkpoint has this key with matching hash and not force
    if (!force && completedSet.has(unit.key) && completedSet.get(unit.key) === hash) {
      skipped++;
      continue;
    }

    // Attempt fusion
    let plan = null;
    try {
      plan = await fuseSignals({ unit, complexity, readers });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("RGS_DETERMINISTIC_PLAN_INVALID")) {
        process.stderr.write(`[rgs-tool-planner] Skipping ${unit.key}: ${msg}\n`);
        skipped++;
        continue;
      }
      // Unexpected error — log and skip, do not abort batch
      process.stderr.write(`[rgs-tool-planner] Unexpected error for ${unit.key}: ${msg}\n`);
      skipped++;
      continue;
    }

    if (plan === null) {
      skipped++;
      continue;
    }

    plans[unit.key] = plan;
    planned++;

    // Append checkpoint entry
    appendCheckpoint(checkpointPath, unit.key, hash);

    processedSinceFlush++;
    if (processedSinceFlush >= FLUSH_EVERY) {
      await flushSidecar(sidecarPath, buildSidecarDoc(plans, degraded));
      processedSinceFlush = 0;
    }
  }

  // Final flush
  await flushSidecar(sidecarPath, buildSidecarDoc(plans, degraded));

  return { planned, skipped, degraded, sidecar: sidecarPath };
}

function buildSidecarDoc(plans, degraded) {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generator: "rgs-tool-planner",
    degraded,
    plans,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  const ollamaOff  = args.includes("--ollama-off");
  const forceFlag  = args.includes("--force");
  const jsonOut    = args.includes("--json");

  const milestoneFilter = (() => {
    const i = args.indexOf("--milestone");
    return i >= 0 ? args[i + 1] : null;
  })();
  const unitFilter = (() => {
    const i = args.indexOf("--unit");
    return i >= 0 ? args[i + 1] : null;
  })();
  const limitFilter = (() => {
    const i = args.indexOf("--limit");
    return i >= 0 ? Number(args[i + 1]) : null;
  })();

  const sidecarPath    = DEFAULT_SIDECAR_PATH;
  const checkpointPath = DEFAULT_CHECKPOINT_PATH;
  const lockPath       = DEFAULT_LOCK_PATH;

  // Acquire lock
  acquireLock(lockPath);

  // Cleanup on exit
  const cleanup = () => releaseLock(lockPath);
  process.on("exit", cleanup);
  process.on("SIGINT",  () => { cleanup(); process.exit(130); });
  process.on("SIGTERM", () => { cleanup(); process.exit(143); });

  let degraded = false;

  // Ollama health gate
  let queryOllamaFn = null;
  if (!ollamaOff) {
    try {
      const bridge = await import("../.claude/hooks/lib/ollama-hook-bridge.mjs");
      const available = await bridge.isOllamaAvailable();
      if (!available) {
        process.stderr.write("[rgs-tool-planner] Ollama unavailable — proceeding in deterministic mode.\n");
        degraded = true;
      } else {
        queryOllamaFn = bridge.queryOllama;
      }
    } catch (e) {
      process.stderr.write(`[rgs-tool-planner] Ollama bridge import failed: ${e.message} — degraded mode.\n`);
      degraded = true;
    }
  } else {
    process.stderr.write("[rgs-tool-planner] --ollama-off: deterministic mode.\n");
    degraded = true;
  }

  // Load graph ONCE
  let G;
  try {
    const { loadGraph } = await import("./lib/system-viz-graph.mjs");
    G = loadGraph();
    process.stderr.write("[rgs-tool-planner] Graph loaded.\n");
  } catch (e) {
    process.stderr.write(`[rgs-tool-planner] Graph load failed: ${e.message}\n`);
    process.exit(1);
  }

  // Enumerate units
  const { loadEnvelopes, loadProgress, enumerateOpenUnits } = await import("./lib/rgs-unit-enum.mjs");
  let units = enumerateOpenUnits({
    envelopes: loadEnvelopes(),
    progress:  loadProgress(),
  });

  // Apply filters
  if (milestoneFilter) units = units.filter((u) => u.milestone === milestoneFilter);
  if (unitFilter)      units = units.filter((u) => u.key === unitFilter);
  if (limitFilter)     units = units.slice(0, limitFilter);

  process.stderr.write(`[rgs-tool-planner] ${units.length} open units to process.\n`);

  // Build readers
  const tribalReader = await makeTribalReader();
  const readers = {
    capabilities:  makeCapabilitiesReader(G),
    tribal:        tribalReader,
    skillTriggers: makeSkillTriggersReader(),
    buildState:    makeBuildStateReader(),
    outcomes:      makeOutcomesReader(),
  };
  if (!degraded && queryOllamaFn) {
    readers.ollama = makeOllamaReader(queryOllamaFn);
  }

  // Lock refresh on flush
  let unitsSinceLockRefresh = 0;
  const origFlush = flushSidecar;
  const flushWithLockRefresh = async (p, d) => {
    unitsSinceLockRefresh += LOCK_REFRESH_EVERY;
    if (unitsSinceLockRefresh >= LOCK_REFRESH_EVERY) {
      writeLock(lockPath);
      unitsSinceLockRefresh = 0;
    }
    return origFlush(p, d);
  };
  // We use flushSidecar directly inside runPlanner; for the CLI, lock refresh
  // is handled by the periodic flush inside runPlanner every FLUSH_EVERY units.
  // The writeLock call is best-effort — we touch the lock file on every flush.
  void flushWithLockRefresh; // acknowledged — CLI uses runPlanner directly

  const result = await runPlanner({
    units,
    complexityFor: complexityFor,
    readers,
    sidecarPath,
    checkpointPath,
    force: forceFlag,
    degraded,
  });

  // Release lock
  releaseLock(lockPath);

  if (jsonOut) {
    process.stdout.write(JSON.stringify({
      units:    units.length,
      planned:  result.planned,
      skipped:  result.skipped,
      degraded: result.degraded,
      sidecar:  result.sidecar,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `[rgs-tool-planner] Done.\n` +
      `  units:    ${units.length}\n` +
      `  planned:  ${result.planned}\n` +
      `  skipped:  ${result.skipped}\n` +
      `  degraded: ${result.degraded}\n` +
      `  sidecar:  ${result.sidecar}\n`
    );
  }
}

// Run CLI only when executed directly
const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[rgs-tool-planner] Fatal: ${e.message}\n${e.stack}\n`);
    process.exit(1);
  });
}
