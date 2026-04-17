#!/usr/bin/env node
// U-LTH05: Knowledge Source Completeness Check
// For each P1-P5 feature in LATHE-MASTER.json, verify:
//   1. >=1 tribal tip file exists (src/data/*)
//   2. >=1 reference program set exists (JM DIE/CNC LATHE/*)
//   3. >=1 formula group exists (constants.ts or FormulaRegistry)
// Exit: >=3 knowledge sources per feature.
// Output: state/shared/lathe-knowledge-coverage.md

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("H:/prism");
const ENV = resolve(ROOT, "mcp-server/data/milestones/LATHE-MASTER.json");
const DATA_DIR = resolve(ROOT, "mcp-server/src/data");
const JMDIE_LATHE = resolve(ROOT, "JM DIE/CNC LATHE");
const CONSTANTS = resolve(ROOT, "mcp-server/src/physics/constants.ts");
const OUT = resolve(ROOT, "state/shared/lathe-knowledge-coverage.md");

const env = JSON.parse(readFileSync(ENV, "utf8"));
const constantsSrc = readFileSync(CONSTANTS, "utf8");

const phases = env.phases.filter(p => /^P[1-5]$/.test(p.id));

// Enumerate lathe-relevant data files
const dataFiles = readdirSync(DATA_DIR).filter(f => /lathe|turning|okuma|fanuc|material|iso|tool|kienzle|taylor/i.test(f));

// Enumerate JM Die CNC LATHE customer folders (reference programs)
const jmDieFolders = existsSync(JMDIE_LATHE)
  ? readdirSync(JMDIE_LATHE).filter(f => {
      try { return statSync(resolve(JMDIE_LATHE, f)).isDirectory(); }
      catch { return false; }
    })
  : [];

// Canonical constants.ts symbols (formula groups)
const constantSymbols = [
  "CANONICAL_KIENZLE", "CANONICAL_MATERIAL_DB", "TAYLOR_BASE_CONSTANTS",
  "HONE_RADII", "CHIP_FORM", "THERMAL_DIFFUSIVITY", "TAYLOR_TOOL_LIFE",
  "CUTTING_FORCE_CONST", "DEFLECTION_CONST",
];
const constantsPresent = constantSymbols.filter(s => constantsSrc.includes(s));

// Match data files to feature by keyword
function matchDataFiles(keywords) {
  return dataFiles.filter(f => keywords.some(kw => new RegExp(kw, "i").test(f)));
}

function matchConstants(keywords) {
  return constantsPresent.filter(s => keywords.some(kw => new RegExp(kw, "i").test(s) || new RegExp(kw, "i").test(constantsSrc.split(s)[1]?.slice(0, 500) || "")));
}

// Feature-specific knowledge mapping
const FEATURE_KNOWLEDGE = {
  P1: {
    title: "Speed & Feed Calculator",
    tribal_keywords: ["lathe.*tip", "okuma", "turning.*catalog", "physics.*science"],
    program_keywords: ["ACME", "ALCOA", "AFI", "ATF", "CLENDENIN"],
    formula_keywords: ["KIENZLE", "TAYLOR", "CUTTING_FORCE", "MATERIAL_DB"],
  },
  P2: {
    title: "Post-Processor Generator",
    tribal_keywords: ["okuma.*dialect", "okuma.*macro", "fanuc.*program", "okuma.*program"],
    program_keywords: ["ACME", "ALCOA", "ATF"],
    formula_keywords: ["TAYLOR", "KIENZLE"],
  },
  P3: {
    title: "Master Post-Processor",
    tribal_keywords: ["okuma.*advanced", "okuma.*dialect", "fanuc", "iso"],
    program_keywords: ["ACME", "ALCOA", "ATF", "CLENDENIN", "AFI"],
    formula_keywords: ["KIENZLE", "MATERIAL_DB"],
  },
  P4: {
    title: "Print-to-Program (THE BIG ONE)",
    tribal_keywords: ["lathe", "turning", "okuma", "material", "tool"],
    program_keywords: ["ACME", "ALCOA", "ATF", "CLENDENIN", "AFI", "AGRATI"],
    formula_keywords: ["KIENZLE", "TAYLOR", "MATERIAL_DB", "THERMAL"],
  },
  P5: {
    title: "ERP / Business Management",
    tribal_keywords: ["material", "tool"],
    program_keywords: ["ACME", "ALCOA", "ATF"],
    formula_keywords: ["MATERIAL_DB"],
  },
};

// Evaluate each feature
const evaluations = [];
for (const phase of phases) {
  const km = FEATURE_KNOWLEDGE[phase.id];
  if (!km) continue;

  const tribalHits = matchDataFiles(km.tribal_keywords);
  const programHits = jmDieFolders.filter(f => km.program_keywords.some(kw => new RegExp(kw, "i").test(f)));
  const formulaHits = matchConstants(km.formula_keywords);

  const sourceCount = (tribalHits.length > 0 ? 1 : 0) + (programHits.length > 0 ? 1 : 0) + (formulaHits.length > 0 ? 1 : 0);
  const pass = sourceCount >= 3;

  evaluations.push({
    id: phase.id,
    title: km.title,
    tribal: tribalHits,
    programs: programHits,
    formulas: formulaHits,
    sourceCount,
    pass,
  });
}

// Build report
let md = `# Lathe Knowledge Source Completeness — U-LTH05\n\n`;
md += `**Generated:** ${new Date().toISOString()}\n`;
md += `**Exit condition:** >=3 knowledge sources per feature (tribal + reference + formula)\n\n`;

md += `## Data Source Pools\n\n`;
md += `| Pool | Count | Path |\n`;
md += `|---|---:|---|\n`;
md += `| Lathe-relevant data files | ${dataFiles.length} | mcp-server/src/data/ |\n`;
md += `| JM Die CNC LATHE customer folders | ${jmDieFolders.length} | JM DIE/CNC LATHE/ |\n`;
md += `| Constants symbols present | ${constantsPresent.length} | mcp-server/src/physics/constants.ts |\n\n`;

md += `## Feature-by-Feature Coverage\n\n`;
md += `| Feature | Tribal Files | Reference Programs | Formula Groups | Sources | Pass? |\n`;
md += `|---|---:|---:|---:|---:|:-:|\n`;
for (const e of evaluations) {
  md += `| ${e.id} ${e.title} | ${e.tribal.length} | ${e.programs.length} | ${e.formulas.length} | ${e.sourceCount}/3 | ${e.pass ? "YES" : "NO"} |\n`;
}
md += `\n`;

// Per-feature detail
for (const e of evaluations) {
  md += `### ${e.id} — ${e.title}\n\n`;
  md += `**Status:** ${e.pass ? "PASS (>=3 sources)" : "NEEDS_MORE_SOURCES"}\n\n`;

  md += `**Tribal tip files (${e.tribal.length}):**\n`;
  if (e.tribal.length === 0) md += `- _none matched_\n`;
  else for (const f of e.tribal) md += `- \`src/data/${f}\`\n`;
  md += `\n`;

  md += `**Reference program folders (${e.programs.length}):**\n`;
  if (e.programs.length === 0) md += `- _none matched_\n`;
  else for (const f of e.programs) md += `- \`JM DIE/CNC LATHE/${f}/\`\n`;
  md += `\n`;

  md += `**Formula groups (${e.formulas.length}):**\n`;
  if (e.formulas.length === 0) md += `- _none matched_\n`;
  else for (const f of e.formulas) md += `- \`${f}\` (constants.ts)\n`;
  md += `\n`;
}

// Overall
const passing = evaluations.filter(e => e.pass).length;
md += `## Overall\n\n`;
md += `- Features evaluated: ${evaluations.length}\n`;
md += `- Passing (>=3 sources): ${passing}\n`;
md += `- Failing: ${evaluations.length - passing}\n\n`;

md += `---\n\n`;
md += `**Exit condition status:** ${passing === evaluations.length ? "PASS" : "FAIL"} — ${passing}/${evaluations.length} features meet the >=3-source threshold.\n`;

writeFileSync(OUT, md);
console.log(`wrote ${OUT}`);
console.log(`  features evaluated: ${evaluations.length}`);
console.log(`  passing: ${passing}`);
console.log(`  data files: ${dataFiles.length}, jm die folders: ${jmDieFolders.length}, constants: ${constantsPresent.length}`);
