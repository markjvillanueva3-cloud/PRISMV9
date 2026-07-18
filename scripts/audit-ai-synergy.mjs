#!/usr/bin/env node
/**
 * audit-ai-synergy.mjs -- fleet-wide per-galaxy AI-synergy audit generator
 * (AI-SYNERGY-AUDIT-MS0/U-AISYN-GEN, slot:charlie).
 *
 * Gathers the live, real descriptor for every galaxy under
 * mcp-server/src/engines/<galaxy>/ and runs the PURE scorer in
 * scripts/lib/ai-synergy-audit-lib.mjs to measure how well each galaxy's AI
 * capability (NN/GNN/LoRA/RAG/CAG) is SYNERGIZED with the Obsidian vault, the
 * Hermes/octopus consensus, the PSN legs, the system-viz cross-substrate graph,
 * and the galaxy's own CLAUDE.md / MEMORY.md / awareness surfaces.
 *
 * I/O lives here; the scoring math lives in the tested pure lib. This is the
 * VALIDATE-on-live-data half of R15: it proves the audit with real numbers.
 *
 * Inputs gathered per galaxy (all fail-soft -- a missing input is a real "0",
 * never a crash, R12):
 *   - claudeMd / memoryMd       : mcp-server/src/engines/<g>/{CLAUDE,MEMORY}.md
 *   - aiEngineCount/bridgeCount : classify every *.ts basename in the galaxy dir
 *   - hasSynthesis              : knowledge/memories/patterns/<g>_synthesis.md
 *   - inLoraDataset            : <g> appears in the vault->LoRA synthesis dataset
 *   - edges                    : typed cross-substrate edges where from/to == eng.<g>
 *   - hasAwarenessGen          : scripts/generate-<g>-awareness.mjs exists
 *
 * Output: state/shared/specs/AI-SYNERGY-AUDIT.{json,md}
 *
 * Usage:
 *   node scripts/audit-ai-synergy.mjs            # write JSON + MD artifacts
 *   node scripts/audit-ai-synergy.mjs --json     # JSON to stdout, no write
 *   node scripts/audit-ai-synergy.mjs --dry      # print fleet summary, no write
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCHEMA_VERSION,
  DIMENSIONS,
  classifyAiEngine,
  normalizeEngineName,
  scoreGalaxyAiSynergy,
  rollupFleet,
} from "./lib/ai-synergy-audit-lib.mjs";
import { SLOT_GALAXY_MAP } from "./lib/slot-galaxy-map.mjs";

/**
 * Galaxy engines are NOT stored in the galaxy doctrine folder -- all ~3,800 engines
 * live FLAT in mcp-server/src/engines/*.ts. We attribute an AI engine to a galaxy by
 * its normalized FIRST TOKEN (camelCase-split), which is the engine's domain prefix
 * (LatheLoRA* -> "lathe", CAMLoRA* -> "cam", QuotingDeepReasoning* -> "quoting").
 * First-token (not substring) match avoids false hits like "Cadence" -> "cad".
 * This is an advisory NAME-HEURISTIC, surfaced as such in the artifact. Galaxies
 * with no name-prefixed AI engine legitimately score 0 here (a true "AI island").
 * ai-training catches fleet-wide AI engines that carry no domain prefix.
 */
const GALAXY_FIRST_TOKEN_ALIASES = {
  mill: ["mill"],
  lathe: ["lathe", "turning"],
  wedm: ["wedm", "wire"],
  cam: ["cam"],
  cad: ["cad"],
  "speed-feed": ["speed", "sfc"],
  quoting: ["quoting", "quote"],
  business: ["business", "erp"],
  "post-processor": ["post"],
  "blueprint-vision": ["blueprint", "ocr"],
  academy: ["academy", "course", "curriculum"],
  "tribal-knowledge": ["tribal"],
  "hermes-zulu": ["hermes", "zulu", "octopus", "consensus"],
  "ai-training": [
    "cross", "federated", "graph", "graphsage", "ada", "continual", "meta",
    "gnn", "nn", "detached", "neural", "deep", "lora", "rag", "embedding",
  ],
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");
const DISPATCHER_DIR = path.join(ROOT, "mcp-server/src/tools/dispatchers");
// Match a per-galaxy AI dispatcher action token: a galaxy domain prefix immediately
// followed (within the same snake_case identifier) by an AI keyword. Requiring BOTH
// in one token keeps false-positives low (e.g. mill_agi_reason, wedm_deep_neural).
const DISPATCHER_AI_ACTION_RE =
  /\b((?:milling|mill|lathe|turning|wedm|wire|cam|cad|sfc|speed|sf|post|pp|quoting|quote|business|blueprint|ocr|grinder|sinker|swiss|academy)[a-z0-9]*_[a-z0-9_]*(?:agi|deep_reason|deep_neural|neural|_lora|lora|_rag|deep_learn|reason|infer|predict)[a-z0-9_]*)\b/gi;
const GALAXY_ACTION_PREFIXES = {
  mill: ["milling", "mill"],
  lathe: ["lathe", "turning"],
  wedm: ["wedm", "wire"],
  cam: ["cam"],
  cad: ["cad"],
  "speed-feed": ["sfc", "speed", "sf"],
  "post-processor": ["post", "pp"],
  quoting: ["quoting", "quote"],
  business: ["business"],
  "blueprint-vision": ["blueprint", "ocr"],
  academy: ["academy"],
};
const SPECS_DIR = path.join(ROOT, "state/shared/specs");
const OUT_JSON = path.join(SPECS_DIR, "AI-SYNERGY-AUDIT.json");
const OUT_MD = path.join(SPECS_DIR, "AI-SYNERGY-AUDIT.md");

const XSUB_AUG = path.join(ROOT, "state/shared/system-viz/cross-substrate-edges-augmentation.json");
const SYNTHESIS_DIR = path.join(ROOT, "knowledge/memories/patterns");
const LORA_DATASET_CANDIDATES = [
  path.join(ROOT, "state/shared/lora/vault-galaxy-synthesis-dataset.jsonl"),
  path.join(ROOT, "vault-galaxy-synthesis-dataset.jsonl"),
];

// The fleet-wide AI-synergy awareness hook (AI-SYNERGY-AUDIT-MS0/U-AISYN-AWARENESS):
// when it exists AND is wired in a settings.json, every slot-mapped galaxy has a
// live auto-injected AI-awareness surface, so it counts toward the awarenessSurface
// dimension even without a dedicated generate-<g>-awareness.mjs.
const AWARENESS_HOOK = path.join(ROOT, ".claude/hooks/ai-synergy-awareness-inject.mjs");
const SETTINGS_CANDIDATES = [
  path.join(process.env.USERPROFILE || process.env.HOME || "C:/Users/wompu", ".claude/settings.json"),
  path.join(ROOT, "..", ".claude/settings.json"),
];

const argv = new Set(process.argv.slice(2));
const NOW = new Date().toISOString();

function readOptional(p) {
  try {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  } catch {
    /* treat as absent */
  }
  return null;
}

function loadJsonOptional(p) {
  const txt = readOptional(p);
  if (txt == null) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

/** Galaxy dirs = subdirs of ENGINES_DIR that carry a CLAUDE.md (excludes `.claude`). */
function enumerateGalaxies() {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(ENGINES_DIR, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    if (fs.existsSync(path.join(ENGINES_DIR, e.name, "CLAUDE.md"))) out.push(e.name);
  }
  return out.sort();
}

/**
 * Scan the FLAT engines dir once and attribute every AI-classified engine to a
 * galaxy by normalized first token. Returns per-galaxy { aiEngineCount, bridgeCount,
 * typeBreakdown, examples } plus fleet totals. PURE-ish (reads fs once).
 */
function buildEngineAttribution() {
  const firstTokenToGalaxy = new Map();
  for (const [g, toks] of Object.entries(GALAXY_FIRST_TOKEN_ALIASES)) {
    for (const t of toks) if (!firstTokenToGalaxy.has(t)) firstTokenToGalaxy.set(t, g);
  }
  const perGalaxy = new Map();
  let entries = [];
  try {
    entries = fs.readdirSync(ENGINES_DIR, { withFileTypes: true });
  } catch {
    /* no engines dir */
  }
  let scanned = 0;
  let aiClassified = 0;
  let unattributed = 0;
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith(".ts") || e.name.endsWith(".d.ts") || e.name.endsWith(".test.ts")) continue;
    scanned += 1;
    const base = e.name.replace(/\.ts$/, "");
    const type = classifyAiEngine(base);
    if (!type) continue;
    aiClassified += 1;
    const firstToken = normalizeEngineName(base).split(" ")[0];
    const g = firstTokenToGalaxy.get(firstToken);
    if (!g) {
      unattributed += 1;
      continue;
    }
    if (!perGalaxy.has(g)) perGalaxy.set(g, { aiEngineCount: 0, bridgeCount: 0, typeBreakdown: {}, examples: [] });
    const rec = perGalaxy.get(g);
    rec.aiEngineCount += 1;
    if (type === "bridge") rec.bridgeCount += 1;
    rec.typeBreakdown[type] = (rec.typeBreakdown[type] || 0) + 1;
    if (rec.examples.length < 5) rec.examples.push(base);
  }
  return { perGalaxy, scanned, aiClassified, unattributed };
}

/**
 * Resolve a graph node id to a known galaxy name. Galaxy nodes appear in the
 * augmentation under TWO forms -- `eng.<galaxy>` (engine-canonical, 8 galaxies) and
 * `ghost.galaxy.<galaxy>` (roost, all 34). Matching only the first form silently
 * under-counts cross-substrate coverage by 26 galaxies (verified 2026-06-10). Gate
 * on the known-galaxy set so `eng.SomeSpecificEngine` is never mistaken for a galaxy.
 */
function galaxyFromEndpoint(ep, galaxiesSet) {
  if (typeof ep !== "string") return null;
  let name = null;
  if (ep.startsWith("ghost.galaxy.")) name = ep.slice("ghost.galaxy.".length);
  else if (ep.startsWith("eng.")) name = ep.slice(4);
  return name && galaxiesSet.has(name) ? name : null;
}

/** Build galaxy -> { ownedBySlot, documentedBy, consensusOf, embeds } from the augmentation. */
function buildEdgeMap(galaxiesSet) {
  const map = new Map();
  const aug = loadJsonOptional(XSUB_AUG);
  const edges = (aug && Array.isArray(aug.newEdges)) ? aug.newEdges : [];
  const TYPE_KEY = {
    "owned-by-slot": "ownedBySlot",
    "documented-by": "documentedBy",
    "consensus-of": "consensusOf",
    embeds: "embeds",
  };
  for (const ed of edges) {
    const key = TYPE_KEY[ed.type];
    if (!key) continue;
    for (const endpoint of [ed.from, ed.to]) {
      const g = galaxyFromEndpoint(endpoint, galaxiesSet);
      if (g) {
        if (!map.has(g)) map.set(g, {});
        map.get(g)[key] = true;
      }
    }
  }
  return { map, edgeCount: edges.length, present: !!aug };
}

/** Collect the set of galaxies that appear in the vault->LoRA synthesis dataset. */
function buildLoraGalaxySet() {
  for (const p of LORA_DATASET_CANDIDATES) {
    const txt = readOptional(p);
    if (txt == null) continue;
    const set = new Set();
    for (const line of txt.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      try {
        const rec = JSON.parse(t);
        const g = rec.galaxy || (rec.metadata && rec.metadata.galaxy);
        if (g) set.add(String(g));
      } catch {
        /* skip malformed line */
      }
    }
    return { set, source: p };
  }
  return { set: new Set(), source: null };
}

/**
 * Set of galaxies with a LIVE-VALIDATED generic reasoning bridge (from
 * GALAXY-AI-BRIDGE-REGISTRY.json). These credit ownsOrWiresAi -- a galaxy proven to
 * reason over its own context via the bridge IS wired to leg #10 (R12: only the
 * validated set, never all-galaxies-by-assumption).
 */
function buildReasoningBridgeSet() {
  const reg = loadJsonOptional(path.join(ROOT, "state/shared/specs/GALAXY-AI-BRIDGE-REGISTRY.json"));
  const set = new Set();
  if (reg && reg.galaxies && typeof reg.galaxies === "object") {
    for (const [g, v] of Object.entries(reg.galaxies)) {
      if (v && v.validated === true) set.add(g);
    }
  }
  return set;
}

/**
 * Detect whether the fleet AI-synergy awareness hook is live (exists on disk AND
 * referenced in a settings.json). When live, every galaxy in SLOT_GALAXY_MAP has an
 * auto-injected awareness surface. Returns { active, coveredGalaxies }.
 */
function detectFleetAwareness() {
  const coveredGalaxies = new Set(Object.values(SLOT_GALAXY_MAP));
  if (!fs.existsSync(AWARENESS_HOOK)) return { active: false, coveredGalaxies };
  for (const sp of SETTINGS_CANDIDATES) {
    const txt = readOptional(sp);
    if (txt && txt.includes("ai-synergy-awareness-inject")) return { active: true, coveredGalaxies };
  }
  return { active: false, coveredGalaxies };
}

/**
 * Scan dispatcher .ts files for per-galaxy AI action tokens (domain prefix + AI
 * keyword in one identifier) and attribute distinct actions to galaxies by prefix.
 * A galaxy reachable via such an action is wired to leg #10 even with no name-
 * attributed engine -- correcting the ownsOrWiresAi under-measurement. Returns
 * galaxy -> Set(actionName).
 */
function buildDispatcherAiMap() {
  const prefixToGalaxy = [];
  for (const [g, prefixes] of Object.entries(GALAXY_ACTION_PREFIXES)) {
    for (const p of prefixes) prefixToGalaxy.push([p, g]);
  }
  // longest prefix first so "milling" wins over "mill", "speed" over "sf", etc.
  prefixToGalaxy.sort((a, b) => b[0].length - a[0].length);

  const perGalaxy = new Map(); // g -> Set(actionName)
  let files = [];
  try {
    files = fs.readdirSync(DISPATCHER_DIR, { withFileTypes: true });
  } catch {
    return { map: perGalaxy, scannedFiles: 0, totalActions: 0 };
  }
  let scannedFiles = 0;
  for (const e of files) {
    if (!e.isFile() || !e.name.endsWith(".ts")) continue;
    const txt = readOptional(path.join(DISPATCHER_DIR, e.name));
    if (txt == null) continue;
    scannedFiles += 1;
    for (const m of txt.matchAll(DISPATCHER_AI_ACTION_RE)) {
      const action = m[1].toLowerCase();
      const hit = prefixToGalaxy.find(([p]) => action.startsWith(p));
      if (!hit) continue;
      const g = hit[1];
      if (!perGalaxy.has(g)) perGalaxy.set(g, new Set());
      perGalaxy.get(g).add(action);
    }
  }
  let totalActions = 0;
  for (const s of perGalaxy.values()) totalActions += s.size;
  return { map: perGalaxy, scannedFiles, totalActions };
}

function gather() {
  const galaxies = enumerateGalaxies();
  const dispatcherAi = buildDispatcherAiMap();
  const { map: edgeMap, edgeCount, present: edgesPresent } = buildEdgeMap(new Set(galaxies));
  const { set: loraSet, source: loraSource } = buildLoraGalaxySet();
  const attribution = buildEngineAttribution();
  const { active: fleetAwarenessActive, coveredGalaxies } = detectFleetAwareness();
  const reasoningBridgeSet = buildReasoningBridgeSet();

  const results = [];
  for (const g of galaxies) {
    const gDir = path.join(ENGINES_DIR, g);
    const claudeMd = readOptional(path.join(gDir, "CLAUDE.md"));
    const memoryMd = readOptional(path.join(gDir, "MEMORY.md"));

    const attr = attribution.perGalaxy.get(g) || { aiEngineCount: 0, bridgeCount: 0, typeBreakdown: {}, examples: [] };
    const hasSynthesis = fs.existsSync(path.join(SYNTHESIS_DIR, `${g}_synthesis.md`));
    const inLoraDataset = loraSet.has(g);
    const edges = edgeMap.get(g) || {};
    // A dedicated awareness surface = a per-galaxy generate-<g>-awareness.mjs OR a
    // durable AWARENESS.md doctrine file in the galaxy dir (the build-once form, emitted
    // by scripts/generate-galaxy-awareness.mjs and auto-loaded via the Bibryam cascade).
    // Either is a real ALWAYS-PRESENT surface -> dedicated-gen (1.0). The fleet hook is a
    // weaker fallback (0.7) because it only fires while the galaxy's slot is LIVE.
    const hasOwnGen = fs.existsSync(path.join(ROOT, "scripts", `generate-${g}-awareness.mjs`));
    const hasAwarenessMd = fs.existsSync(path.join(gDir, "AWARENESS.md"));
    const fleetCovered = fleetAwarenessActive && coveredGalaxies.has(g);
    const hasSoul = fs.existsSync(path.join(gDir, "SOUL.md"));
    const awarenessKind = hasOwnGen || hasAwarenessMd ? "dedicated-gen" : fleetCovered ? "fleet-hook" : null;

    const dispActions = dispatcherAi.map.get(g) || new Set();
    const scored = scoreGalaxyAiSynergy({
      galaxy: g,
      claudeMd,
      memoryMd,
      aiEngineCount: attr.aiEngineCount,
      bridgeCount: attr.bridgeCount,
      aiDispatcherActions: dispActions.size,
      servedByReasoningBridge: reasoningBridgeSet.has(g),
      hasSoul,
      hasSynthesis,
      inLoraDataset,
      edges,
      awarenessKind,
    });
    scored.signals.aiDispatcherActionExamples = [...dispActions].slice(0, 5);
    scored.signals.typeBreakdown = attr.typeBreakdown;
    scored.signals.aiEngineExamples = attr.examples;
    scored.signals.awarenessVia = hasOwnGen
      ? "dedicated-gen"
      : hasAwarenessMd
        ? "awareness-md"
        : fleetCovered
          ? "fleet-hook"
          : hasSoul
            ? "soul"
            : "none";
    results.push(scored);
  }

  const fleet = rollupFleet(results, 12);
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: NOW,
    generator: "scripts/audit-ai-synergy.mjs",
    method:
      "name-heuristic engine attribution (normalized first-token); advisory. " +
      "ownsOrWiresAi measures synergy PRESENCE (owns OR wires => max), not ownership maturity; " +
      "crossSubstrate scores the two galaxy-grain edges (owned-by-slot + documented-by) at full, " +
      "consensus-of/embeds as bonus; awarenessSurface credits a dedicated AWARENESS.md (1.0) over the " +
      "live-only fleet hook (0.7). See scripts/lib/ai-synergy-audit-lib.mjs comments for the rationale.",
    sources: {
      enginesDir: path.relative(ROOT, ENGINES_DIR),
      crossSubstrateEdges: edgesPresent ? path.relative(ROOT, XSUB_AUG) : null,
      crossSubstrateEdgeCount: edgeCount,
      loraDataset: loraSource ? path.relative(ROOT, loraSource) : null,
      loraGalaxiesCovered: loraSet.size,
      aiEnginesScanned: attribution.scanned,
      aiEnginesClassified: attribution.aiClassified,
      aiEnginesUnattributed: attribution.unattributed,
      dispatcherFilesScanned: dispatcherAi.scannedFiles,
      aiDispatcherActionsAttributed: dispatcherAi.totalActions,
      reasoningBridgeValidatedGalaxies: reasoningBridgeSet.size,
      fleetAwarenessActive,
      awarenessDedicatedGen: results.filter((r) => r.signals.awarenessVia === "dedicated-gen").length,
      awarenessMd: results.filter((r) => r.signals.awarenessVia === "awareness-md").length,
      awarenessFleetHookCovered: results.filter((r) => r.signals.awarenessVia === "fleet-hook").length,
    },
    fleet,
    galaxies: results,
  };
}

function pct(x) {
  return `${Math.round((x || 0) * 100)}%`;
}

function renderMarkdown(report) {
  const { fleet, galaxies, sources, generatedAt } = report;
  const lines = [];
  lines.push("# PRISM Fleet AI-Synergy Audit");
  lines.push("");
  lines.push(`> Generated ${generatedAt} by \`scripts/audit-ai-synergy.mjs\` (AI-SYNERGY-AUDIT-MS0, slot:charlie).`);
  lines.push("> ADVISORY measurement surface. Score model + reference tests: `scripts/lib/ai-synergy-audit-lib.mjs` (+ `.test.mjs`).");
  lines.push("");
  lines.push("## Fleet summary");
  lines.push("");
  lines.push(`- **Galaxies audited:** ${fleet.galaxies}`);
  lines.push(`- **Mean synergy score:** ${fleet.meanScore}  |  median: ${fleet.medianScore}`);
  lines.push(`- **Bands:** strong ${fleet.bands.strong} | partial ${fleet.bands.partial} | weak ${fleet.bands.weak}`);
  lines.push(`- **Cross-substrate edges seen:** ${sources.crossSubstrateEdgeCount} | **LoRA-covered galaxies:** ${sources.loraGalaxiesCovered}`);
  lines.push(
    `- **AI engines:** ${sources.aiEnginesClassified} classified of ${sources.aiEnginesScanned} scanned, ` +
      `${sources.aiEnginesUnattributed} unattributed by name-heuristic (advisory)`
  );
  lines.push(
    `- **AI dispatcher actions:** ${sources.aiDispatcherActionsAttributed} per-galaxy AI actions across ` +
      `${sources.dispatcherFilesScanned} dispatchers (credited toward ownsOrWiresAi wiring)`
  );
  lines.push(
    "> NOTE: `crossSubstrate` sub-dims `consensus-of`/`embeds` are rare fleet-grain edges " +
      "(consensus-of links each domain that owns an octopus outcomes ledger -- 13 as of 2026-06-21, " +
      "a dated snapshot not a contract); `owned-by-slot` + `documented-by` are the per-galaxy signals."
  );
  lines.push("");
  lines.push("### Per-dimension coverage (galaxies scoring >= 0.5)");
  lines.push("");
  lines.push("| Dimension | Passing | Mean sub-score | Maps to |");
  lines.push("|-----------|---------|----------------|---------|");
  for (const dim of DIMENSIONS) {
    const c = fleet.dimensionCoverage[dim.key] || { passing: 0, total: fleet.galaxies, pct: 0, meanSub: 0 };
    lines.push(`| ${dim.key} | ${c.passing}/${c.total} (${pct(c.pct)}) | ${c.meanSub} | ${dim.label} |`);
  }
  lines.push("");
  lines.push("### Lowest-synergy galaxies (remediation priority)");
  lines.push("");
  lines.push("| Galaxy | Score | Band | Gaps |");
  lines.push("|--------|-------|------|------|");
  for (const w of fleet.worst) {
    lines.push(`| ${w.galaxy} | ${w.score} | ${w.band} | ${w.gaps.join(", ") || "-"} |`);
  }
  lines.push("");
  lines.push("## Per-galaxy detail");
  lines.push("");
  lines.push("| Galaxy | Score | Band | disc | owns | vault | xsub | aware | AI engines |");
  lines.push("|--------|-------|------|------|------|-------|------|-------|------------|");
  for (const r of [...galaxies].sort((a, b) => a.score - b.score || a.galaxy.localeCompare(b.galaxy))) {
    const s = r.subScores;
    lines.push(
      `| ${r.galaxy} | ${r.score} | ${r.band} | ${s.discoverability} | ${s.ownsOrWiresAi} | ${s.vaultSynergy} | ${s.crossSubstrate} | ${s.awarenessSurface} | ${r.signals.aiEngineCount} |`
    );
  }
  lines.push("");
  lines.push("## Top remediations (from the lowest-synergy galaxies)");
  lines.push("");
  for (const w of fleet.worst.slice(0, 6)) {
    const r = galaxies.find((g) => g.galaxy === w.galaxy);
    if (!r || !r.recommendations.length) continue;
    lines.push(`### ${r.galaxy} (score ${r.score})`);
    for (const rec of r.recommendations) lines.push(`- ${rec}`);
    lines.push("");
  }
  return lines.join("\n");
}

// --- main ---
const report = gather();

if (argv.has("--json")) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else if (argv.has("--dry")) {
  const f = report.fleet;
  process.stdout.write(
    `AI-SYNERGY AUDIT (dry): ${f.galaxies} galaxies | mean ${f.meanScore} median ${f.medianScore} | ` +
      `strong ${f.bands.strong} partial ${f.bands.partial} weak ${f.bands.weak}\n` +
      `worst: ${f.worst.slice(0, 8).map((w) => `${w.galaxy}=${w.score}`).join(", ")}\n`
  );
} else {
  fs.mkdirSync(SPECS_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(OUT_MD, renderMarkdown(report) + "\n");
  const f = report.fleet;
  process.stdout.write(
    `Wrote ${path.relative(ROOT, OUT_JSON)} + .md | ${f.galaxies} galaxies, mean ${f.meanScore}, ` +
      `bands strong=${f.bands.strong}/partial=${f.bands.partial}/weak=${f.bands.weak}\n`
  );
}
