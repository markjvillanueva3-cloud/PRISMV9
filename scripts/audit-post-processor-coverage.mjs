#!/usr/bin/env node
/**
 * audit-post-processor-coverage.mjs — POST-PROCESSOR-COVERAGE-MS0
 *
 * Scans mcp-server/src/engines/ for *MasterPost*Engine.ts files, parses
 * brand + machine + axis-class from class name + JSDoc, cross-references
 * against the canonical "fleet that PRISM intends to support" matrix
 * (small-shop America: Hurco / Haas / Mazak / DMG / Brother / Okuma /
 * Fanuc-generic / Siemens-generic) × machine-class (mill, lathe, mill-turn,
 * 5axis, swiss, wedm-wire, wedm-sinker), and emits a gap matrix.
 *
 * Output:
 *   state/shared/post-processor-coverage.{json,md}
 *
 * Compounds: every chat that runs this sees the coverage matrix. Gap
 * fills are operator-actionable (each missing cell is a master-post-engine
 * milestone).
 *
 * Doctrine:
 *   - Pure-Node script, no engine I/O, no MCP calls
 *   - Bounded scan (~50 engine files max)
 *   - Heuristic brand/machine extraction (regex on class names + JSDoc)
 *   - Caller verifies before flipping any gap to "shipped"
 *
 * @milestone POST-PROCESSOR-COVERAGE-MS0
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ROOT = process.cwd().replace(/\\/g, "/");
const ENGINES_DIR = resolve(PROJECT_ROOT, "mcp-server", "src", "engines");
const OUT_JSON = resolve(PROJECT_ROOT, "state", "shared", "post-processor-coverage.json");
const OUT_MD = resolve(PROJECT_ROOT, "state", "shared", "post-processor-coverage.md");

// Canonical small-shop-America brand × machine-class matrix.
// Cells are the names PRISM SHOULD ship a master post for.
// First-cut matrix; expand as coverage grows.
const CANONICAL_BRANDS = [
  "Hurco", "Haas", "Mazak", "DMG Mori", "Brother", "Okuma",
  "Fanuc (generic)", "Siemens (generic)", "Mitsubishi", "Sodick", "Agie", "Makino",
];

const CANONICAL_MACHINE_CLASSES = [
  "mill (3-axis)", "mill (5-axis)", "lathe", "mill-turn", "swiss", "wedm-wire", "wedm-sinker",
];

// Brand-detection regex (class name OR JSDoc literal).
const BRAND_PATTERNS = {
  "Hurco":             /Hurco/i,
  "Haas":              /Haas/i,
  "Mazak":             /Mazak/i,
  "DMG Mori":          /DMG|MoriSeiki|Mori\s*Seiki|MoriCAD/i,
  "Brother":           /Brother/i,
  "Okuma":             /Okuma|OSP|B250|LB|MB/i,
  "Fanuc (generic)":   /Fanuc/i,
  "Siemens (generic)": /Siemens/i,
  "Mitsubishi":        /Mitsubishi/i,
  "Sodick":            /Sodick/i,
  "Agie":              /Agie/i,
  "Makino":            /Makino/i,
};

// Machine-class-detection regex (combined with brand match).
const MACHINE_CLASS_PATTERNS = {
  "mill (3-axis)":  /Mill(?!.*5)|VMX|VMC|MillMasterPost/i,
  "mill (5-axis)":  /5Axis|FiveAxis|5-Axis|five-axis/i,
  "lathe":          /Lathe|Turning|Turn\b|LB\d|MB\d|B250|OKL/i,
  "mill-turn":      /MillTurn|Multi-?Turning|Mazak.*Integrex|Multus/i,
  "swiss":          /Swiss|Sliding/i,
  "wedm-wire":      /WireEDM|WEDM|WireCut/i,
  "wedm-sinker":    /SinkerEDM|RamEDM|DieSinker/i,
};

function safeStat(p) { try { return statSync(p); } catch { return null; } }

function listEngineFiles() {
  if (!safeStat(ENGINES_DIR)) return [];
  // MS1 fix: original filter missed PPSinkerEDMPostEngine.ts because it ends
  // in `PostEngine` not `PostProcessorEngine`. Broadened to catch any
  // `*Post*Engine.ts` filename that is plausibly a post — exclude clearly
  // unrelated patterns (Postmortem, PostFlight, PostDeploy).
  return readdirSync(ENGINES_DIR)
    .filter(f => {
      if (!/Post.*Engine\.ts$/i.test(f)) return false;
      if (/Postmortem|PostFlight|PostDeploy|PostMortem/i.test(f)) return false;
      // Must be a post-processor flavor: MasterPost, PostProcessor, PostGenerator,
      // PostEngine (the canonical naming), or any of the L4/L5 post-emit engines.
      return /MasterPost|PostProcessor|PostGenerator|^PP|PostEngine|PostLib|PostInvoke|PostSelector|PostNeural|PostKnowledge|PostFineTuning|PostDeep|PostRouter|PostUnified|PostRegression|PostMerge|PostAI/i.test(f);
    })
    .map(f => ({ name: f, path: resolve(ENGINES_DIR, f) }));
}

function readHead(p, bytes = 4096) {
  try { return readFileSync(p, "utf8").slice(0, bytes); } catch { return ""; }
}

function classifyEngine(engine) {
  const head = readHead(engine.path);
  const search = `${engine.name}\n${head}`;
  const brands = [];
  for (const [brand, re] of Object.entries(BRAND_PATTERNS)) {
    if (re.test(search)) brands.push(brand);
  }
  const machineClasses = [];
  for (const [klass, re] of Object.entries(MACHINE_CLASS_PATTERNS)) {
    if (re.test(search)) machineClasses.push(klass);
  }
  return { engine: engine.name, brands, machineClasses };
}

function buildCoverageMatrix(classifications) {
  // matrix[brand][machineClass] = list of engine names covering that cell
  const matrix = {};
  for (const brand of CANONICAL_BRANDS) {
    matrix[brand] = {};
    for (const klass of CANONICAL_MACHINE_CLASSES) {
      matrix[brand][klass] = [];
    }
  }
  for (const c of classifications) {
    for (const brand of c.brands) {
      if (!matrix[brand]) continue;  // unknown brand, skip
      for (const klass of c.machineClasses) {
        if (!matrix[brand][klass]) continue;
        matrix[brand][klass].push(c.engine);
      }
    }
  }
  return matrix;
}

function gapList(matrix) {
  const gaps = [];
  for (const brand of CANONICAL_BRANDS) {
    for (const klass of CANONICAL_MACHINE_CLASSES) {
      if (matrix[brand][klass].length === 0) {
        gaps.push({ brand, machineClass: klass });
      }
    }
  }
  return gaps;
}

function renderMd(classifications, matrix, gaps) {
  let md = `# Post-Processor Coverage Matrix\n\n`;
  md += `Generated: ${new Date().toISOString()}\n`;
  md += `Source: \`scripts/audit-post-processor-coverage.mjs\`\n\n`;
  md += `## Summary\n\n`;
  md += `- Engines scanned: **${classifications.length}**\n`;
  md += `- Canonical cells: ${CANONICAL_BRANDS.length} brands × ${CANONICAL_MACHINE_CLASSES.length} machine-classes = **${CANONICAL_BRANDS.length * CANONICAL_MACHINE_CLASSES.length}**\n`;
  const covered = CANONICAL_BRANDS.length * CANONICAL_MACHINE_CLASSES.length - gaps.length;
  md += `- Covered cells: **${covered}**\n`;
  md += `- Gap cells: **${gaps.length}** (coverage ${Math.round(covered / (CANONICAL_BRANDS.length * CANONICAL_MACHINE_CLASSES.length) * 100)}%)\n\n`;

  md += `## Coverage matrix\n\n`;
  md += `| Brand | ${CANONICAL_MACHINE_CLASSES.join(" | ")} |\n`;
  md += `|---|${CANONICAL_MACHINE_CLASSES.map(() => "---").join("|")}|\n`;
  for (const brand of CANONICAL_BRANDS) {
    const row = CANONICAL_MACHINE_CLASSES.map(klass => {
      const list = matrix[brand][klass];
      if (list.length === 0) return "❌";
      return `✓ ${list.length}`;
    });
    md += `| ${brand} | ${row.join(" | ")} |\n`;
  }
  md += `\n_Legend: ✓ N = N engine(s) cover this cell · ❌ = gap (operator-actionable)._\n\n`;

  md += `## Gap punch list (operator-actionable)\n\n`;
  if (gaps.length === 0) {
    md += `_No gaps — coverage is 100%._\n`;
  } else {
    md += `Each gap is a candidate master-post-engine milestone.\n\n`;
    for (const g of gaps) {
      md += `- **${g.brand} ${g.machineClass}** — no engine matched\n`;
    }
  }

  md += `\n## All scanned engines\n\n`;
  for (const c of classifications) {
    md += `- \`${c.engine}\` — brands=[${c.brands.join(", ") || "?"}] · classes=[${c.machineClasses.join(", ") || "?"}]\n`;
  }
  return md;
}

function main() {
  const engines = listEngineFiles();
  console.log(`Found ${engines.length} candidate post-related engine files`);
  const classifications = engines.map(classifyEngine);
  const matrix = buildCoverageMatrix(classifications);
  const gaps = gapList(matrix);
  console.log(`Coverage: ${CANONICAL_BRANDS.length * CANONICAL_MACHINE_CLASSES.length - gaps.length}/${CANONICAL_BRANDS.length * CANONICAL_MACHINE_CLASSES.length} cells (${gaps.length} gaps)`);

  const json = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    generated_by: "scripts/audit-post-processor-coverage.mjs",
    canonical_brands: CANONICAL_BRANDS,
    canonical_machine_classes: CANONICAL_MACHINE_CLASSES,
    engines: classifications,
    matrix,
    gaps,
    coverage_pct: Math.round((CANONICAL_BRANDS.length * CANONICAL_MACHINE_CLASSES.length - gaps.length) / (CANONICAL_BRANDS.length * CANONICAL_MACHINE_CLASSES.length) * 100),
  };
  writeFileSync(OUT_JSON, JSON.stringify(json, null, 2));
  writeFileSync(OUT_MD, renderMd(classifications, matrix, gaps));
  console.log(`✓ Wrote ${OUT_JSON}`);
  console.log(`✓ Wrote ${OUT_MD}`);
}

main();
