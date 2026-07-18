// scripts/generate-per-slot-galaxy-verify.mjs — emit thin /galaxy-verify-<slot> skills
// for every mapped slot (GALAXY-KIT-MS0, slot:bravo 2026-05-29). Single-sourced from
// scripts/lib/slot-galaxy-map.mjs (the whole point of the consolidation). Idempotent.
import fs from 'node:fs';
import { SLOT_GALAXY_MAP } from './lib/slot-galaxy-map.mjs';

const OUT = (process.env.PRISM_REPO || 'H:/prism') + '/.claude/commands';

function render(slot, g) {
  return `---
description: Verify the ${slot} galaxy (${g}) against the canonical galaxy kit — content-level scorecard (doc files, MEMORY sections, master back-pointer, soul, wiki). Read-only. GALAXY-KIT-MS0.
allowed-tools: Bash, Read
---

# /galaxy-verify-${slot} — galaxy completeness scorecard

Runs the canonical-kit content checks for slot **${slot}** (galaxy \`${g}\`):

\`\`\`bash
node H:/prism/scripts/galaxy-verify.mjs ${slot}
\`\`\`

PASS/FAIL per check: 4 doc files · MEMORY master-brain-link / High-ROI≥10 / Known-failure-modes / cross-galaxy-bridges / Initial-state · CLAUDE related-galaxies + closed-loop · master [galaxy:${g}] back-pointer · soul (domain_filter≠any) · wiki≥3. FAIL items are backfill targets per \`state/shared/specs/GALAXY-CANONICAL-KIT-2026-05-29.md\`. Auto-generated; do not hand-edit (re-run scripts/generate-per-slot-galaxy-verify.mjs).
`;
}

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const slot of Object.keys(SLOT_GALAXY_MAP)) {
  fs.writeFileSync(`${OUT}/galaxy-verify-${slot}.md`, render(slot, SLOT_GALAXY_MAP[slot]));
  n++;
}
console.log(`wrote ${n} /galaxy-verify-<slot> skills to ${OUT}`);
