# AB-locator CLI scan-runner template

Operator (or next session): wrap the iter136/165 pure helpers (`parsePath` + `groupByPart` + `pairAB`) in a CLI that walks `JM DIE/CNC LATHE/**/*.{MIN,nc,PIM}` and emits the full A/B pair corpus.

## Target file

`scripts/scan-jm-die-ab-pairs.mjs` (next to existing scan utilities)

## Skeleton (≤200 LOC target per iter109 design)

```js
#!/usr/bin/env node
// CLI scan-runner for U-LATHE-AB-VERSION-LOCATOR.
// Walks JM-Die archive, pairs A/B versions, emits JSONL corpus + summary report.
//
// Design memo: reference_lathe_ab_version_locator_design_2026_05_27
// Pure helpers: scripts/lib/lathe-ab-version-locator.mjs

import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { parsePath, groupByPart, pairAB } from "./lib/lathe-ab-version-locator.mjs";

const ROOT = process.argv[2] || "H:/PRISM/JM DIE/CNC LATHE";
const OUT_JSONL = process.argv[3] || `mcp-server/data/ingestion_cache/jm-die-ab-pairs-${new Date().toISOString().slice(0,10)}.jsonl`;

console.error(`Scanning ${ROOT} for .MIN/.nc/.PIM files...`);
const files = await glob("**/*.{MIN,nc,PIM,Min,min,Nc,nc,pim}", { cwd: ROOT, nocase: true, absolute: true });
console.error(`Found ${files.length} program files. Parsing paths...`);

const parsed = files.map(parsePath);
const errored = parsed.filter(p => p.parse_error);
const valid = parsed.filter(p => !p.parse_error);
console.error(`Parsed: ${valid.length} valid, ${errored.length} errors`);

const groups = groupByPart(valid);
const pairsAll = pairAB(groups, { includeUnpaired: true });
const paired = pairsAll.filter(p => !p.unpaired);
const unpaired = pairsAll.filter(p => p.unpaired);
console.error(`Pairs: ${paired.length} paired, ${unpaired.length} unpaired singletons`);

// Compute per-pair Δ-score: requires running quality pipeline on both A and B
// Deferred to follow-up unit — emit pairs without scores for now.
const out = fs.createWriteStream(OUT_JSONL);
for (const pair of paired) {
  out.write(JSON.stringify({
    kind: "ab_pair",
    customer: pair.customer,
    part_num: pair.part_num,
    a_path: pair.a.full_path,
    b_path: pair.b.full_path,
    a_count_in_group: pair.a_count,
    b_count_in_group: pair.b_count
  }) + "\n");
}
for (const single of unpaired) {
  out.write(JSON.stringify({
    kind: "unpaired",
    reason: single.unpaired_reason,
    customer: single.customer,
    part_num: single.unpaired_part_num,
    paths: single.records.map(r => r.full_path)
  }) + "\n");
}
out.end();

console.error(`Emitted to ${OUT_JSONL}`);
console.error(`Summary by customer:`);
const byCust = {};
for (const p of pairsAll) {
  const c = p.customer || "UNKNOWN";
  byCust[c] = byCust[c] || { paired: 0, unpaired: 0 };
  if (p.unpaired) byCust[c].unpaired++; else byCust[c].paired++;
}
for (const [c, stats] of Object.entries(byCust).sort()) {
  console.error(`  ${c}: ${stats.paired} paired, ${stats.unpaired} unpaired`);
}
```

## Implementation checklist

- [ ] Add `glob` dependency check (already in repo per package.json)
- [ ] Create `scripts/scan-jm-die-ab-pairs.mjs` with above skeleton
- [ ] Add CLI arg validation + default-path safety
- [ ] Add stderr progress reporting for large scans (15K+ files expected)
- [ ] Add hermetic test with synthetic 10-file tree
- [ ] Add to PRISM-INVENTORY-LATEST.md scripts tally
- [ ] First run: `node scripts/scan-jm-die-ab-pairs.mjs`
- [ ] Validate output JSONL is well-formed + parsable

## Follow-up unit: per-pair Δ-score computation

Once basic pairs are emitted, extend with quality-pipeline scoring:
1. Read A-version program
2. Read B-version program
3. Run `parseProgram` + `validateThreading` + `aggregateQualityScore` on each
4. Compute Δ-score = b_score - a_score
5. Emit lever-engagement diff (which categories the B-version improved)
6. Add `quality_delta` field to JSONL records

This requires composition with iter132 + iter125 + iter140/142 engines.

## Expected output scale

Per iter161 finding (JM-Die fleet sampled = 4 customers visible):
- ~15K total .MIN files claimed (per session-summary)
- Likely ~7-10 customers with PRISM_UPGRADED/ subfolders
- Each customer × Okuma-variant gives ~50-200 paired programs
- Estimate: 1000-3000 A/B pairs after full scan

## R12 acknowledgments

- Don't crash on parse-errors — skip + log to errored count
- Don't silently miss files — every glob hit either pairs OR is logged as unpaired
- Don't auto-modify any .MIN/.nc files — read-only scan
- Output path is timestamped per design memo iter109 (`jm-die-ab-pairs-<date>.jsonl`)

## Related

- `[[reference_lathe_ab_version_locator_design_2026_05_27]]` — iter109 design
- `scripts/lib/lathe-ab-version-locator.mjs` — pure helpers (16 tests + 3 iter166 regression)
- `scripts/lib/__ab-locator-acme-probe.mjs` — manual probe (iter165)
- `[[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]` — corrects assumption about B-version origins
