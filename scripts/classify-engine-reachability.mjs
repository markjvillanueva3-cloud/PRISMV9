#!/usr/bin/env node
/**
 * classify-engine-reachability.mjs — classifier-aware reachability check for
 * "unwired" engines (slot:romeo, [WIRING]/U-CLASSIFIER-AWARE-HUNT).
 *
 * WHY: the system-viz `ghost.unwired` classifier follows only DIRECT
 * dispatcher→engine edges, so it mis-labels engines that are reachable through
 * a WIRED aggregator wrapper (e.g. MonolithSurfaceFinishDatabaseEngine via
 * CatalogUnifiedQueryEngine) as orphans. 5 such false positives were found in
 * the DB-gen domain alone, polluting the awareness "110 unwired" punch list.
 * See [[reference_wire_exempt_monolith_false_ghost_2026_06_04]].
 *
 * This tool classifies each candidate by 1-level transitive reachability:
 *   DIRECT_WIRED        — a dispatcher references the class or its singleton.
 *   AGGREGATOR_REACHABLE — referenced by another engine that is itself wired
 *                          (WIRE-EXEMPT candidate; report the wrapper).
 *   CONSUMED_BY_UNWIRED — referenced only by other UNWIRED engines (chain
 *                          orphan — wiring the chain root reaches it).
 *   GENUINE_ORPHAN      — no dispatcher ref, no engine consumer. The real
 *                          romeo wire targets.
 * FACADE flag (Port/Layer/Adapter/Facade/Bridge/Singleton/Coordinator/
 * Orchestrator suffix) is advisory — these are often consumed by a higher layer.
 *
 * Usage:
 *   node scripts/classify-engine-reachability.mjs                 # all 110 from the audit
 *   node scripts/classify-engine-reachability.mjs Name1 Name2 ... # explicit names
 *   node scripts/classify-engine-reachability.mjs --json          # JSON artifact only
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DISP_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const ENG_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const AUDIT = path.join(ROOT, "state", "shared", "UNWIRED-ENGINE-AUDIT-2026-05-07.json");
const outFlag = process.argv.find((a) => a.startsWith("--out="));
const OUT = outFlag ? path.resolve(outFlag.slice("--out=".length)) : path.join(ROOT, "state", "shared", "engine-reachability-classification.json");

const FACADE_RE = /(Port|Layer|Adapter|Facade|Bridge|Singleton|Coordinator|Orchestrator)$/;
const jsonOnly = process.argv.includes("--json");
const explicit = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function singletonOf(cls) { return cls.charAt(0).toLowerCase() + cls.slice(1); }

// Recursively collect *.ts under a dir (skipping node_modules/dist/test files for engines).
function walkTs(dir, skipTests) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === "__tests__") continue;
      out.push(...walkTs(full, skipTests));
    } else if (e.name.endsWith(".ts")) {
      if (skipTests && e.name.includes(".test.")) continue;
      out.push(full);
    }
  }
  return out;
}

// Load dispatcher content as one searchable blob (DIRECT check).
function loadDispatcherBlob() {
  let blob = "";
  for (const f of walkTs(DISP_DIR, false)) {
    try { blob += "\n" + readFileSync(f, "utf8"); } catch { /* skip */ }
  }
  return blob;
}

// Load every engine file content once: [{ base, cls, content }].
function loadEngineFiles() {
  const files = walkTs(ENG_DIR, true);
  const out = [];
  for (const f of files) {
    const base = path.basename(f);
    let content = "";
    try { content = readFileSync(f, "utf8"); } catch { /* skip */ }
    out.push({ base, cls: base.replace(/\.ts$/, ""), content });
  }
  return out;
}

// Word-boundary-ish containment (avoid matching FooEngineExtra when searching FooEngine).
function refs(content, term) {
  const re = new RegExp(`(?<![A-Za-z0-9_])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_])`);
  return re.test(content);
}

function getCandidates() {
  if (explicit.length) return explicit;
  if (!existsSync(AUDIT)) return [];
  try {
    const a = JSON.parse(readFileSync(AUDIT, "utf8"));
    const list = a.unwiredEngines || [];
    return list.map((x) => (typeof x === "string" ? x : x.name || x.engine || x.cls)).filter(Boolean);
  } catch { return []; }
}

const dispBlob = loadDispatcherBlob();
const engFiles = loadEngineFiles();
const engByCls = new Map(engFiles.map((e) => [e.cls, e]));

function dispatcherWiresClass(cls) {
  return refs(dispBlob, cls) || refs(dispBlob, singletonOf(cls));
}

// De-suffix to the capability root (e.g. ExpandingMandrelEngine -> ExpandingMandrel).
// A distinctive (>=10-char) root appearing in a dispatcher means the CAPABILITY is
// wired even when the exact class name is not — the ExpandingMandrel case, where
// turningDispatcher wires latheWorkholdingEngine.calculateExpandingMandrel().
function capabilityRoot(cls) {
  return cls.replace(/(Engine|Adapter|Bridge|Port|Layer|Facade|Singleton|Coordinator|Orchestrator)$/, "");
}
function capabilityWiredElsewhere(cls) {
  const root = capabilityRoot(cls);
  if (root.length < 10) return null; // short roots (Tool, Shop) over-match — skip
  // SUBSTRING (not word-boundary): the root is often embedded in a method/action name,
  // e.g. turningDispatcher wires `calculateExpandingMandrel` / `lathe_workholding_expanding_mandrel`
  // for ExpandingMandrelEngine. A distinctive >=10-char CamelCase root keeps this precise.
  if (dispBlob.includes(root)) return root;
  // also check the snake_case form (expanding_mandrel) for action-name wiring
  const snake = root.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  return dispBlob.toLowerCase().includes(snake) ? root : null;
}

function classify(name) {
  const cls = name.endsWith(".ts") ? name.replace(/\.ts$/, "") : name;
  const sgl = singletonOf(cls);
  const own = engByCls.get(cls);
  const ownFile = own?.base;
  const facade = FACADE_RE.test(cls);

  // A) phantom audit name — no engine file on disk for this class (stale audit entry).
  if (!own) {
    return { name: cls, verdict: "PHANTOM_NAME", facade, fileExists: false, note: "no EngineName.ts on disk — stale/renamed audit entry, not a wire target" };
  }

  if (dispatcherWiresClass(cls)) {
    return { name: cls, verdict: "DIRECT_WIRED", facade, fileExists: true, note: "dispatcher references class or singleton (FALSE ghost.unwired)" };
  }

  // engines (other than its own file) that reference this class/singleton
  const consumers = engFiles.filter((e) => e.base !== ownFile && (refs(e.content, cls) || refs(e.content, sgl)));
  if (consumers.length === 0) {
    // B) capability may be wired under a different engine+method name (ExpandingMandrel case)
    const capRoot = capabilityWiredElsewhere(cls);
    if (capRoot) {
      return { name: cls, verdict: "CAPABILITY_WIRED_ELSEWHERE", facade, fileExists: true, capabilityRoot: capRoot, note: `root "${capRoot}" appears in a dispatcher — capability likely wired under a different name; verify before wiring (dead-duplicate risk)` };
    }
    return { name: cls, verdict: "GENUINE_ORPHAN", facade, fileExists: true, note: facade ? "no consumer; facade-suffixed (verify not a layer-only construct)" : "no dispatcher ref, no engine consumer, no capability-root in dispatcher" };
  }

  // is any consumer itself wired to a dispatcher?
  const wiredConsumers = consumers.filter((c) => dispatcherWiresClass(c.cls)).map((c) => c.cls);
  if (wiredConsumers.length) {
    return { name: cls, verdict: "AGGREGATOR_REACHABLE", facade, via: wiredConsumers.slice(0, 4), note: "reachable through a WIRED engine wrapper (WIRE-EXEMPT candidate)" };
  }
  return { name: cls, verdict: "CONSUMED_BY_UNWIRED", facade, via: consumers.slice(0, 4).map((c) => c.cls), note: "referenced only by other unwired engines (chain orphan)" };
}

const candidates = getCandidates();
const results = candidates.map(classify);
const byVerdict = results.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] || 0) + 1), m), {});

const artifact = {
  schemaVersion: "1.0.0",
  generatedBy: "scripts/classify-engine-reachability.mjs (slot:romeo)",
  candidateCount: candidates.length,
  dispatcherFilesScanned: walkTs(DISP_DIR, false).length,
  engineFilesScanned: engFiles.length,
  byVerdict,
  results,
};

writeFileSync(OUT, JSON.stringify(artifact, null, 2));

if (!jsonOnly) {
  console.log(`candidates=${candidates.length} dispatchers=${artifact.dispatcherFilesScanned} engines=${engFiles.length}`);
  console.log("byVerdict:", JSON.stringify(byVerdict));
  const genuine = results.filter((r) => r.verdict === "GENUINE_ORPHAN");
  console.log(`\nGENUINE_ORPHAN (${genuine.length}) — real romeo wire targets:`);
  for (const g of genuine) console.log(`  ${g.facade ? "[facade] " : ""}${g.name} — ${g.note}`);
  const falsePos = results.filter((r) => r.verdict === "DIRECT_WIRED" || r.verdict === "AGGREGATOR_REACHABLE");
  console.log(`\nFALSE ghost.unwired (${falsePos.length}): DIRECT_WIRED=${byVerdict.DIRECT_WIRED || 0} AGGREGATOR_REACHABLE=${byVerdict.AGGREGATOR_REACHABLE || 0}`);
}
console.error(`[classify] wrote ${OUT}`);
