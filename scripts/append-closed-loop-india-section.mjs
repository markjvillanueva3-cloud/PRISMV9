#!/usr/bin/env node
// PER-SLOT-CLOSED-LOOP-INTEGRATION/U-PSCL02 — append the "Closed-loop
// integration with india" section to each domain galaxy CLAUDE.md per
// the universal template in
// state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md
//
// Idempotent: skips any file that already contains the section marker.
// Run from H:/prism. No args.

import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism/mcp-server/src/engines";
const MARKER = "## Closed-loop integration with india";
const SPEC_REL = "state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md";

// galaxy dir -> { slot, domain }
// 2026-05-28 alpha (U-PSCL04): expanded from the original 11 closed-loop
// consumer/owner slots to include every non-hygiene, non-unallocated slot per
// operator directive "include all other that would need it." Slots feed india
// outcomes via the slot-agnostic outcome-bus-auto-tap PostToolUse hook
// regardless of CLAUDE.md content; the india-wire section gives the chat
// EXPLICIT DOCTRINE via the Bibryam Context Cascade when Claude edits within
// the galaxy subtree. Excluded: golf (hygiene-by-allowlist), november/zulu
// (unallocated u-dea).
const MAP = {
  // Original 11 — closed-loop domains explicitly named by operator (2026-05-28).
  "mill":              { slot: "foxtrot",  domain: "mill" },
  "lathe":             { slot: "whiskey",  domain: "lathe" },
  "wedm":              { slot: "mike",     domain: "wedm" },
  "blueprint-vision":  { slot: "xray",     domain: "blueprint-vision" },
  "quoting":           { slot: "charlie",  domain: "quoting" },
  "business":          { slot: "hotel",    domain: "business" },
  "speed-feed":        { slot: "oscar",    domain: "speed-feed" },
  "post-processor":    { slot: "echo",     domain: "post-processor" },
  "cad":               { slot: "delta",    domain: "cad" },
  "cam":               { slot: "kilo",     domain: "cam" },
  "ai-training":       { slot: "india",    domain: "ai-training" },
  // Expanded 12 — non-hygiene, non-unallocated slots per U-PSCL04.
  "token-optimization": { slot: "alpha",    domain: "token-optimization" },
  "hermes-zebra":       { slot: "bravo",    domain: "hermes-zebra" },
  "database":           { slot: "juliett",  domain: "database" },
  "academy":            { slot: "lima",     domain: "academy" },
  "backend-helper":     { slot: "papa",     domain: "backend-helper" },
  "frontend":           { slot: "quebec",   domain: "frontend" },
  "wiring":             { slot: "romeo",    domain: "wiring" },
  "system-viz":         { slot: "sierra",   domain: "system-viz" },
  "discovery":          { slot: "tango",    domain: "discovery" },
  "bug-hunting":        { slot: "uniform",  domain: "bug-hunting" },
  "dormant-data":       { slot: "victor",   domain: "dormant-data" },
  "orchestrator":       { slot: "zebra",    domain: "orchestrator" },
};

function buildSection(slot, domain) {
  if (slot === "india") {
    return `
${MARKER}

This galaxy **owns the substrate** referenced in
\`${SPEC_REL}\`. The 4 surfaces every other closed-loop slot consumes
live here:

- **OutcomeFeedbackBus** (\`xproc_outcome_*\` + \`state/shared/outcome-bus.jsonl\`)
- **NN-GRAPH wiring-inference + retrain lifecycle** (\`xproc_neural_*\` + \`nn-graph-retrain-lifecycle.mjs\`)
- **RAG / Tribal corpus** (\`prism_knowledge:tribal_*\` + \`xproc_rag_features\`)
- **Calibration monitor + conformal prediction** (\`xproc_calibration_monitor_*\` + \`xproc_conformal_*\`)

India does **not** wire to other slots' surfaces — other slots wire to
india's. Per-slot per-domain optimization stays per-slot; **learning
signal goes through india.** When in doubt about retrain cadence, model
rollout, drift thresholds — this galaxy is the authority.

First ship per agent recommendation #1: \`outcome-bus-auto-tap.mjs\`
PostToolUse hook taps every Edit/Write/Bash outcome into the fleet
OutcomeFeedbackBus as labeled training rows. Unlocks closed-loop for
EVERY domain slot the moment it ships.
`;
  }

  return `
${MARKER}

This galaxy participates in india's fleet-wide learning loop per
\`${SPEC_REL}\`:

- **Outcome publishing:** every ${domain} action publishes via
  \`xproc_outcome_publish {slot: '${slot}', domain: '${domain}'}\`.
  Auto-fired by \`outcome-bus-auto-tap.mjs\` if not manually called.
- **Feature emission:** ${domain} assets emit features via
  \`xproc_kg_project_features\` for india's GNN tier-5 classifier.
- **Tribal capture:** all learnings via \`prism_knowledge:tribal_capture
  slot=${slot}\` — NEVER direct markdown writes to
  \`knowledge/tribal/${domain}-*.md\` (auto-overwritten on regen).
- **Calibration:** every shipped recommendation records actuals via
  \`xproc_calibration_monitor_record\` so india's drift-canary fires
  retrain candidacy at the right time.

When in doubt about retrain triggers, model rollout, or feedback loop
design — defer to india's surfaces; do not roll your own.
`;
}

let appended = 0;
let skipped = 0;
const results = [];

for (const [galaxy, cfg] of Object.entries(MAP)) {
  const file = path.join(ROOT, galaxy, "CLAUDE.md");
  if (!fs.existsSync(file)) {
    results.push(`MISSING ${galaxy}`);
    continue;
  }
  const body = fs.readFileSync(file, "utf8");
  if (body.includes(MARKER)) {
    results.push(`SKIP    ${galaxy} (marker present)`);
    skipped++;
    continue;
  }
  const section = buildSection(cfg.slot, cfg.domain);
  const trailingNL = body.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(file, body + trailingNL + section);
  results.push(`APPEND  ${galaxy} (+${section.length}B  slot=${cfg.slot})`);
  appended++;
}

console.log(results.join("\n"));
console.log(`\nappended=${appended}  skipped=${skipped}`);
