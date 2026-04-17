#!/usr/bin/env node
// U-LTH04: Physics Constants Inline-Usage Sweep (Lathe)
// Scan Lathe*.ts for inline numeric literals matching known canonical constants.
// Distinguish: (a) engines importing from constants.ts, (b) engines with inline suspects.
// Output: state/shared/lathe-physics-inline-scan.md

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("H:/prism");
const REG = resolve(ROOT, "mcp-server/data/state/lathe-engine-registry.json");
const ENG_DIR = resolve(ROOT, "mcp-server/src/engines");
const CONSTANTS_FILE = resolve(ROOT, "mcp-server/src/physics/constants.ts");
const OUT = resolve(ROOT, "state/shared/lathe-physics-inline-scan.md");

const registry = JSON.parse(readFileSync(REG, "utf8"));

// Canonical constants (values that should come from constants.ts)
// Source: src/physics/constants.ts — ISO group kc1.1 values
const CANONICAL_VALUES = {
  kc11_P: [1800, 2100], // steel / stainless
  kc11_M: [2100],
  kc11_K: [1100], // cast iron
  kc11_N: [700],  // aluminum
  kc11_S: [2800], // nickel/titanium alloys
  kc11_H: [3200], // hardened
};

// Patterns that are SUSPICIOUS when inline:
//   - `kc[_a-zA-Z]*\s*=\s*<number>` where number in canonical list
//   - `taylor(C|n)\s*=\s*<number>`
//   - `density\s*=\s*<number>` (suggests material DB inline)
//   - `specific_?heat\s*=\s*<number>`
//   - `young[s]?_?modulus`
//   - `kc1[._]1\s*=\s*<number>`
const SUSPECT_PATTERNS = [
  {
    name: "kc1.1_inline",
    re: /\bkc(1[_.]1)?\s*[:=]\s*(\d{3,5})(?!\.)/gi,
    whitelist_values: [1800, 2100, 1100, 700, 2800, 3200],
  },
  {
    name: "taylor_n_inline",
    re: /\btaylor[_.]?n\s*[:=]\s*(0?\.\d{2,3}|\d)/gi,
    whitelist_values: [],
  },
  {
    name: "taylor_C_inline",
    re: /\btaylor[_.]?C\s*[:=]\s*(\d{1,5})/gi,
    whitelist_values: [],
  },
  {
    name: "density_inline",
    re: /\bdensity\s*[:=]\s*(\d{3,5})(?!\.)/gi,
    whitelist_values: [7850, 7800, 2700, 4500, 8900, 10220],
  },
  {
    name: "specific_heat_inline",
    re: /\bspecific[_.]?heat\s*[:=]\s*(\d{2,4})(?!\.)/gi,
    whitelist_values: [500, 502, 460, 896, 897, 385],
  },
  {
    name: "youngs_modulus_inline",
    re: /\byoung[s]?[_.]?modulus\s*[:=]\s*(\d{2,3}e[+\-]?\d)/gi,
    whitelist_values: [],
  },
];

// Check for import from constants.ts
function hasConstantsImport(src) {
  return /from\s+["'][^"']*physics\/constants(\.js)?["']/.test(src);
}

// Scan a single file for suspect patterns
function scanFile(path) {
  const src = readFileSync(path, "utf8");
  const imports_constants = hasConstantsImport(src);
  const hits = [];

  for (const pat of SUSPECT_PATTERNS) {
    pat.re.lastIndex = 0;
    let m;
    while ((m = pat.re.exec(src))) {
      const value = parseFloat(m[m.length - 1]);
      const isCanonical = pat.whitelist_values.includes(value);
      // Find line number
      const prefix = src.slice(0, m.index);
      const line = prefix.split("\n").length;
      hits.push({
        pattern: pat.name,
        value,
        line,
        snippet: m[0].trim(),
        is_canonical_value: isCanonical,
      });
    }
  }

  return { src, imports_constants, hits };
}

const results = [];
for (const e of registry.engines) {
  const name = e.file.split("/").pop();
  const path = resolve(ENG_DIR, name);
  const scan = scanFile(path);
  const canonicalHits = scan.hits.filter(h => h.is_canonical_value);
  const nonCanonicalHits = scan.hits.filter(h => !h.is_canonical_value);

  results.push({
    name: e.name,
    imports_constants: scan.imports_constants,
    canonical_hits: canonicalHits,
    non_canonical_hits: nonCanonicalHits,
    total_hits: scan.hits.length,
  });
}

// Classify
const clean = results.filter(r => r.canonical_hits.length === 0);
const flagged = results.filter(r => r.canonical_hits.length > 0);
const importing = results.filter(r => r.imports_constants);

// Build report
let md = `# Lathe Physics Constants Inline-Usage Sweep — U-LTH04\n\n`;
md += `**Generated:** ${new Date().toISOString()}\n`;
md += `**Source:** mcp-server/data/state/lathe-engine-registry.json (${registry.engines.length} engines)\n`;
md += `**Canonical source:** mcp-server/src/physics/constants.ts\n\n`;

md += `## Summary\n\n`;
md += `| Metric | Count | Percent |\n`;
md += `|---|---:|---:|\n`;
md += `| Total engines | ${registry.engines.length} | 100% |\n`;
md += `| Importing from constants.ts | ${importing.length} | ${Math.round(100 * importing.length / registry.engines.length)}% |\n`;
md += `| Clean (no canonical-value inlines) | ${clean.length} | ${Math.round(100 * clean.length / registry.engines.length)}% |\n`;
md += `| Flagged (has inline canonical values) | ${flagged.length} | ${Math.round(100 * flagged.length / registry.engines.length)}% |\n\n`;

md += `## Scan Patterns\n\n`;
md += `| Pattern | Description |\n`;
md += `|---|---|\n`;
for (const p of SUSPECT_PATTERNS) {
  md += `| ${p.name} | \`${p.re.source}\` |\n`;
}
md += `\n`;

// Flagged engines
md += `## FLAGGED — Inline Canonical Values (${flagged.length})\n\n`;
if (flagged.length === 0) {
  md += `_None. No lathe engine contains inline values matching canonical Kienzle/density/specific-heat constants._\n\n`;
} else {
  for (const r of flagged) {
    md += `### ${r.name}\n\n`;
    md += `Imports constants.ts: **${r.imports_constants ? "YES" : "NO"}**\n\n`;
    md += `| Pattern | Value | Line | Snippet |\n`;
    md += `|---|---:|---:|---|\n`;
    for (const h of r.canonical_hits) {
      md += `| ${h.pattern} | ${h.value} | ${h.line} | \`${h.snippet}\` |\n`;
    }
    md += `\n`;
  }
}

// Non-canonical matches (these might not need refactor but worth noting)
const flaggedNonCanonical = results.filter(r => r.non_canonical_hits.length > 0);
md += `## NON-CANONICAL Numeric Literals (${flaggedNonCanonical.length} engines)\n\n`;
md += `Suspect pattern matched but value not on canonical whitelist. May be legitimate computed value, but worth review:\n\n`;
if (flaggedNonCanonical.length === 0) {
  md += `_None._\n\n`;
} else {
  md += `| Engine | Hit Count | Sample Patterns |\n`;
  md += `|---|---:|---|\n`;
  for (const r of flaggedNonCanonical) {
    const patterns = [...new Set(r.non_canonical_hits.map(h => h.pattern))].join(", ");
    md += `| ${r.name} | ${r.non_canonical_hits.length} | ${patterns} |\n`;
  }
  md += `\n`;
}

// Exit gate
md += `## Exit Gate Evaluation\n\n`;
md += `Exit conditions per LATHE-MASTER U-LTH04:\n`;
md += `1. **Zero inline physics constants in Lathe*.ts** — ${flagged.length === 0 ? "PASS" : `FAIL (${flagged.length} engines flagged)`}\n`;
md += `2. **Build passes** — deferred to build_verify step\n`;
md += `3. **No test regressions** — deferred to vitest run\n\n`;

if (flagged.length > 0) {
  md += `### Refactor Plan\n\n`;
  md += `For each flagged engine:\n`;
  md += `1. Add import: \`import { KC11, TAYLOR, MATERIAL_DB } from "../physics/constants.js";\`\n`;
  md += `2. Replace inline literal with constants reference\n`;
  md += `3. Run \`npx vitest run <engine>.test.ts\` to verify no regression\n`;
  md += `4. Run \`npm run build:fast\` to verify type correctness\n\n`;
}

md += `---\n\n`;
md += `**Status:** ${flagged.length === 0 ? "PASS — scan complete, no inline canonical constants detected in any lathe engine" : `NEEDS_REFACTOR — ${flagged.length} engines need constants.ts migration`}\n`;

writeFileSync(OUT, md);
console.log(`wrote ${OUT}`);
console.log(`  engines scanned: ${registry.engines.length}`);
console.log(`  importing constants.ts: ${importing.length}`);
console.log(`  flagged (canonical inline): ${flagged.length}`);
console.log(`  non-canonical hits: ${flaggedNonCanonical.length}`);
