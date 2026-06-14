#!/usr/bin/env node
/**
 * generate-staleness-overlay.mjs — annotate every leaf node in the system-viz
 * graph with a staleness tier so the viz can heatmap dead/stagnant data.
 *
 * For each node that has a `file` field pointing at a real path:
 *   - mtimeDays:  how old is the latest write
 *   - sizeKB:     file size
 *   - tier:       "fresh"  (<7d)
 *                 "recent" (<30d)
 *                 "stale"  (<90d)
 *                 "stagnant" (≥90d)
 *                 "ghost"  (size <200 bytes, regardless of age)
 *                 "missing" (file no longer exists)
 *   - signals:    array of qualitative flags ("no-imports-found",
 *                 "test-only", "stub-suspect")
 *
 * Memories get an additional signal `cold-recall` if not referenced in
 * MEMORY.md or wiki/index.md.
 *
 * Engines get `import-orphan` if no other source file imports them
 * (cheap regex over src/, scripts/, dispatchers).
 *
 * Output: state/shared/system-viz/staleness-overlay-augmentation.json
 *
 * The merge block reads this and:
 *   - sets node.staleness = { tier, mtimeDays, sizeKB, signals }
 *   - keeps a meta.staleness rollup with top-N stagnant per layer
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

// Tightened for an active codebase — PRISM gets touched daily, so 90d
// stagnant catches almost nothing. 45d already means "not opened in 6 weeks".
const FRESH_DAYS = 3;
const RECENT_DAYS = 14;
const STALE_DAYS = 45;
const GHOST_BYTES = 200;
const TOP_N_STAGNANT = 50;

function tierFor(days, sizeBytes, exists, isDir) {
  if (!exists) return "missing";
  // Directories have no real size; skip ghost detection for them.
  if (!isDir && sizeBytes < GHOST_BYTES) return "ghost";
  if (days < FRESH_DAYS) return "fresh";
  if (days < RECENT_DAYS) return "recent";
  if (days < STALE_DAYS) return "stale";
  return "stagnant";
}

function loadMemoryReferences() {
  const refs = new Set();
  for (const file of [
    path.join(ROOT, "knowledge/memories/MEMORY.md"),
    path.join(ROOT, "knowledge/wiki/index.md"),
  ]) {
    if (!fs.existsSync(file)) continue;
    try {
      const c = fs.readFileSync(file, "utf8");
      for (const m of c.matchAll(/\[\[([^\]]+)\]\]|`([^`]+\.md)`|\(([^)]+\.md)\)/g)) {
        const ref = (m[1] || m[2] || m[3] || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (ref.length > 2) refs.add(ref);
      }
    } catch {}
  }
  return refs;
}

function buildEngineImportIndex() {
  // Lightweight scan: read every .ts in mcp-server/src/ and scripts/, collect
  // module specifiers. We mark an engine as "import-orphan" if its base name
  // (e.g. "FooEngine") never appears in any non-self file.
  const index = new Set();
  const dirs = [
    path.join(ROOT, "mcp-server/src"),
    path.join(ROOT, "scripts"),
  ];
  const stack = [];
  for (const d of dirs) if (fs.existsSync(d)) stack.push(d);
  while (stack.length) {
    const cur = stack.pop();
    let ents; try { ents = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", ".cache"].includes(e.name)) continue;
        stack.push(p);
      } else if (e.isFile() && /\.(ts|mjs|js)$/.test(e.name)) {
        try {
          const c = fs.readFileSync(p, "utf8");
          // collect every CapitalizedIdentifier of length 6+ — cheap proxy for engine names
          for (const m of c.matchAll(/\b[A-Z][A-Za-z]{5,}Engine\b/g)) {
            index.add(`${m[0]}|${path.relative(ROOT, p).replace(/\\/g, "/")}`);
          }
        } catch {}
      }
    }
  }
  // Index by engine name → set of files mentioning it
  const byEngine = {};
  for (const entry of index) {
    const [name, file] = entry.split("|");
    (byEngine[name] ??= new Set()).add(file);
  }
  return byEngine;
}

function analyze() {
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const memoryRefs = loadMemoryReferences();
  const engineImports = buildEngineImportIndex();
  const now = Date.now();

  const tally = { fresh: 0, recent: 0, stale: 0, stagnant: 0, ghost: 0, missing: 0, noFile: 0 };
  const perLayer = {};
  const stagnantList = [];
  const annotations = {};

  for (const node of graph.nodes) {
    // Resolve a path to stat. Priority: explicit .file, then derive from
    // sampleFiles (bucket nodes — use OLDEST sample as the bucket's age),
    // then derive from L9 label (e.g. "H:/prism/BOX/"), then registry id
    // (e.g. reg.aisubsystemregistry → mcp-server/src/registries/AISubsystemRegistry.ts).
    let abs = null;
    let bucketChildAges = null;
    if (node.file) {
      abs = path.isAbsolute(node.file) ? node.file : path.join(ROOT, node.file);
    } else if (Array.isArray(node.sampleFiles) && node.sampleFiles.length > 0) {
      // Stat every sample, take the OLDEST mtime (the bucket can't be fresher than its oldest leaf)
      bucketChildAges = [];
      for (const rel of node.sampleFiles) {
        const p = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
        try { bucketChildAges.push({ p, mtime: fs.statSync(p).mtimeMs, size: fs.statSync(p).size }); } catch {}
      }
      if (bucketChildAges.length) {
        bucketChildAges.sort((a, b) => a.mtime - b.mtime);
        abs = bucketChildAges[0].p; // representative oldest sample
      }
    } else if (node.layer === "L9" && node.label && node.label.startsWith("H:/")) {
      // Labels carry a "[children/total]" suffix added by the merge step;
      // strip that, then strip trailing slash + whitespace.
      abs = node.label.replace(/\s*\[[\d/]+\]\s*$/, "").replace(/\/$/, "").trim();
    } else if (node.id && node.id.startsWith("reg.") && node.label) {
      // Registries don't all use "*Registry.ts" naming. Try in order:
      // 1. "<label>.ts"   (e.g. MachineSpindleDefaults.ts)
      // 2. "<label>Registry.ts"
      // 3. anything in registries/ whose lowercased stem starts with the label-lowercased stem
      const labelStem = (node.label || "").replace(/\s.*/, "");
      const regDir = path.join(ROOT, "mcp-server/src/registries");
      const candidates = [
        path.join(regDir, `${labelStem}.ts`),
        path.join(regDir, `${labelStem}Registry.ts`),
      ];
      abs = candidates.find(p => fs.existsSync(p));
      if (!abs && fs.existsSync(regDir)) {
        const target = labelStem.toLowerCase();
        for (const f of fs.readdirSync(regDir)) {
          if (!f.endsWith(".ts") || f.endsWith(".test.ts")) continue;
          if (f.toLowerCase().replace(/\.ts$/, "").startsWith(target)) {
            abs = path.join(regDir, f);
            break;
          }
        }
      }
      if (!abs) abs = candidates[0]; // fall through; will be flagged missing
    } else {
      tally.noFile++; continue;
    }
    let exists = false, sizeBytes = 0, mtimeMs = 0, isDir = false;
    try {
      const st = fs.statSync(abs);
      exists = true;
      isDir = st.isDirectory();
      sizeBytes = isDir ? 0 : st.size;
      mtimeMs = st.mtimeMs;
    } catch {}

    const days = exists ? Math.floor((now - mtimeMs) / 86_400_000) : -1;
    const tier = tierFor(days, sizeBytes, exists, isDir);

    const signals = [];
    if (tier === "ghost") signals.push("stub-suspect");
    if (node.layer === "L8" && /memory_/.test(node.subgroup || "")) {
      const refKey = (node.label || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (refKey && !memoryRefs.has(refKey)) signals.push("cold-recall");
    }
    if (node.layer === "L5" && node.file && /Engine\.ts$/.test(node.file)) {
      const engineName = path.basename(node.file).replace(/\.ts$/, "");
      const importedBy = engineImports[engineName];
      const otherFiles = importedBy ? [...importedBy].filter(f => f !== node.file) : [];
      if (otherFiles.length === 0) signals.push("import-orphan");
    }

    annotations[node.id] = {
      tier,
      mtimeDays: days,
      sizeKB: +(sizeBytes / 1024).toFixed(1),
      exists,
      signals,
    };

    tally[tier]++;
    perLayer[node.layer] ??= { fresh: 0, recent: 0, stale: 0, stagnant: 0, ghost: 0, missing: 0 };
    perLayer[node.layer][tier]++;

    if (tier === "stagnant" || tier === "ghost" || tier === "missing") {
      stagnantList.push({
        id: node.id,
        layer: node.layer,
        label: (node.label || "").slice(0, 80),
        file: node.file,
        tier, mtimeDays: days, sizeKB: +(sizeBytes / 1024).toFixed(1),
        signals,
      });
    }
  }

  stagnantList.sort((a, b) => {
    const order = { missing: 3, ghost: 2, stagnant: 1 };
    if (order[a.tier] !== order[b.tier]) return order[b.tier] - order[a.tier];
    return b.mtimeDays - a.mtimeDays;
  });

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    thresholds: { freshDays: FRESH_DAYS, recentDays: RECENT_DAYS, staleDays: STALE_DAYS, ghostBytes: GHOST_BYTES },
    tally, perLayer,
    topStagnant: stagnantList.slice(0, TOP_N_STAGNANT),
    totalStagnant: stagnantList.length,
    annotations,
  };
}

const result = analyze();
const outPath = path.join(VIZ_DIR, "staleness-overlay-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`Tally: ${JSON.stringify(result.tally)}`);
console.log(`\nPer-layer breakdown:`);
for (const [layer, t] of Object.entries(result.perLayer).sort()) {
  console.log(`  ${layer}  fresh=${t.fresh}  recent=${t.recent}  stale=${t.stale}  stagnant=${t.stagnant}  ghost=${t.ghost}  missing=${t.missing}`);
}
console.log(`\nTop ${Math.min(10, result.topStagnant.length)} of ${result.totalStagnant} flagged nodes:`);
for (const s of result.topStagnant.slice(0, 10)) {
  console.log(`  [${s.tier.padEnd(8)}] ${s.layer} ${s.id.padEnd(35)} ${s.mtimeDays}d ${s.sizeKB}KB ${s.signals.join(",")}`);
}
