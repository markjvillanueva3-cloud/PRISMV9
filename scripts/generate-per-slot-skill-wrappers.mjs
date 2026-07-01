#!/usr/bin/env node
// Generates per-slot skill wrappers:
//   1. /galaxy-buildout-<slot>  — load brief + execute 11-step protocol
//   2. /smart-<slot>            — per-slot model router (Opus/Sonnet/Haiku)
//
// Both wrappers live in `.claude/commands/` and are picked up by Claude Code
// slash-command resolution automatically. Operator ask 2026-05-28:
//   (a) "the very first thing each chat does is start building their own galaxy"
//   (b) "we used to have a feature called /smart which instructed you to change
//        to relevant roles and auto change your model depending on task. can we
//        update it for each chat slot for higher efficiency?"
//
// /smart-<slot> classification matrix (per slot, per task type):
//   - HAIKU  — trivial transforms (rename, format, stub-extract)
//   - SONNET — routine code edits, single-file refactors, doc updates, RTK shell
//   - OPUS   — multi-engine wiring, physics math, scrutiny gates, deep reasoning,
//              architecture decisions, safety validations
//
// We can't switch the runtime model from inside a session (that's an operator
// action), but we CAN: (i) surface the recommended model + rationale, (ii)
// record the routing decision via hooks_model-outcome for learning, (iii)
// remind the operator to switch when the task class clearly warrants it.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';

const OUT_DIR = 'H:/prism/.claude/commands';

import { SLOT_GALAXY_MAP } from "./lib/slot-galaxy-map.mjs";

// Shared task classes every slot inherits. Promoted out of per-slot lists per
// reviewer audit 2026-05-28 (P2 finding — sparse haiku tiers fleet-wide).
// Each per-slot tier below is concatenated with the corresponding COMMON_ list
// when building the /smart-<slot> skill.
const COMMON_HAIKU = [
  'rtk command wrap',
  'file glob enumerate',
  'json field extract',
  'memory pointer line emit',
  'HEAD commit subject grep',
  'unit convert (mm/in/SI)',
  'controller dialect detect',
];
const COMMON_SONNET = [
  'scrutiny-batch dispatch (2 parallel reviewers per file)',
  '3-of-3 scrutiny prompt assemble',
  'CLAUDE.md regression-line append',
  'per-slot MEMORY.md pointer add',
];
const COMMON_OPUS = [
  'scrutiny gate 3-of-3 mediation (when arms disagree)',
  'safety predicate authoring (S(x) ≥ 0.70)',
];

// Per-slot model-routing matrix.
// HAIKU candidates: pure-transform tasks the slot runs repeatedly with no nuance.
// SONNET candidates: routine domain work.
// OPUS candidates: deep reasoning, safety-critical, or architecture-shaping.
//
// 2026-05-28 Opus-overpopulation fixes per reviewer audit: 7 task entries
// moved from opus → sonnet (single-file refactors, doc tasks, schema work
// within a single DB, tsconfig changes, concept-graph populates — all Sonnet-
// class with current PRISM patterns, not Opus-class).
const SLOT_MODEL_MATRIX = {
  alpha: {
    haiku:  ['memory file rename', 'pointer line trim'],
    sonnet: ['budget audit', 'route-suggest tuning', 'ollama-offload reroute', 'cache-control marker placement', 'obsidian sync (memory dir to vault)', 'memory pointer trim'],
    opus:   ['cache-miss strategy design', 'token-economy architecture', 'cross-slot synergy redesign'],
  },
  bravo: {
    haiku:  ['stub-engine detection scan', 'soul-frontmatter lint'],
    sonnet: ['hermes self-reflect populate', 'soul realignment', 'orchestrator delta'],
    opus:   ['cross-slot Hermes synergy redesign', 'orchestrator-fleet topology'],
  },
  charlie: {
    haiku:  ['margin number rounding', 'quote field validation', 'price-break csv emit'],
    sonnet: ['quote estimation', 'bid-to-win calibration', 'customer-bucket assignment', 'customer-knowledge graph synthesis (population)'],
    opus:   ['quote-pipeline redesign', 'customer-knowledge graph schema design'],
  },
  delta: {
    haiku:  ['format detection', 'mime-type triage', 'BREP tessellation parameter clamp'],
    sonnet: ['STEP/IGES parse', 'feature recognition', 'CAD-system bridge call'],
    opus:   ['multi-system CAD synthesis', 'feature-tree reconstruction', 'CAD-CAM bridge design'],
  },
  echo: {
    haiku:  ['gcode tokenize', 'dialect grep', 'controller-flag toggle'],
    sonnet: ['post-processor generation', 'cycle-time estimate', 'subprogram extract', 'multi-channel sync (mill-turn templated)'],
    opus:   ['post-bridge synergy design', 'controller-AI orchestration'],
  },
  foxtrot: {
    haiku:  ['rpm/feed unit convert', 'tool-diameter lookup', 'chip-load default'],
    sonnet: ['Kienzle force calc (per-material)', 'Taylor tool-life predict', 'engagement-angle optimize'],
    opus:   ['multi-physics mill optimize', 'closed-loop adaptive control', 'chatter SLD synthesis'],
  },
  golf: {
    haiku:  ['zombie pid scan', 'orphan claim sweep', 'cron-task heartbeat check'],
    sonnet: ['fleet hygiene audit', 'MCP server health diagnosis', 'scheduled-task install/repair', 'mcp-server upgrade (npm i -g)', 'general fleet maintenance'],
    opus:   ['fleet topology redesign', 'reaper graduated-pressure tuning', 'cross-host coordination'],
  },
  hotel: {
    haiku:  ['payroll calc', 'time-card aggregation', 'invoice-status flip'],
    sonnet: ['ERP record sync', 'KAIZEN cycle analysis', 'HR profile lookup'],
    opus:   ['ERP-architecture redesign', 'compliance-framework synthesis (ISO 9001 / 13485 / IATF)'],
  },
  india: {
    haiku:  ['feature vector emit', 'embedding cache write', 'AUROC threshold check'],
    sonnet: ['LoRA fine-tune setup', 'RAG corpus chunk', 'NN retrain trigger'],
    opus:   ['cross-domain learning architecture', 'meta-learning protocol design', 'deep-reasoning chain'],
  },
  juliett: {
    haiku:  ['schema version bump', 'migration step emit', 'index rebuild trigger'],
    sonnet: ['Qdrant capacity plan', 'sql.js compaction', 'Prometheus query', 'single-DB schema-evolution strategy'],
    opus:   ['multi-DB topology design', 'cross-DB schema evolution', 'data-lineage architecture'],
  },
  kilo: {
    haiku:  ['CAM-system detect', 'strategy-name normalize', 'tool-number remap'],
    sonnet: ['toolpath generation', 'cycle-time predict', 'collision check'],
    opus:   ['multi-axis kinematics synthesis', 'CAM-bridge orchestration', 'cross-CAM strategy translation'],
  },
  lima: {
    haiku:  ['course-id lookup', 'quiz-question render', 'enrollment flip'],
    sonnet: ['MIT-OCW corpus ingest', 'PDF page-by-page extract (pypdf canonical)', 'lesson sequence', 'concept-graph populate (RAG-routine)'],
    opus:   ['curriculum architecture', 'cross-course concept-graph design'],
  },
  mike: {
    haiku:  ['wire spec lookup', 'flush-rate parameter clamp', 'controller dialect detect'],
    sonnet: ['WEDM toolpath plan', 'multi-pass cycle', 'recast-layer predict'],
    opus:   ['WEDM thermal-electrical coupled model', 'fleet-trained wire-break Weibull synthesis'],
  },
  oscar: {
    haiku:  ['SFM units convert', 'rpm calc', 'chip-load default lookup'],
    sonnet: ['speed-feed recommend (per material × tool)', 'stochastic envelope', 'calibration drift check'],
    opus:   ['cross-domain SFC optimization', 'physics-bridge integration'],
  },
  papa: {
    haiku:  ['tsc error grep', 'test-name extract', 'lint rule add'],
    sonnet: ['tsc-fix campaign batch', 'regression test write', 'dispatcher signature design', 'tsconfig edits (mechanical)'],
    opus:   ['build-system architecture', 'test-pyramid strategy'],
  },
  quebec: {
    haiku:  ['component prop rename', 'tailwind class adjust', 'css-var bump'],
    sonnet: ['React component author', 'state-management wire', 'phone-app bridge', 'cross-app component-library synthesis'],
    opus:   ['frontend-architecture redesign'],
  },
  romeo: {
    haiku:  ['action-enum entry add', 'switch-case stub emit', 'engine import insert'],
    sonnet: ['wire 1-5 engines with round-trip tests', 'dispatcher-action authoring', 'WIRE-EXEMPT audit'],
    opus:   ['wiring-architecture redesign', 'cross-dispatcher engine-placement strategy'],
  },
  sierra: {
    haiku:  ['graph node lookup', 'ghost-roost count', 'system-viz query'],
    sonnet: ['regen-viz pass', 'merge-augmentations', 'ghost-roost expansion'],
    opus:   ['system-viz architecture upgrade', 'master-index query-substrate redesign'],
  },
  tango: {
    haiku:  ['ENGINE_DIGEST grep', 'DIRECTORY_DIGEST scan', 'duplicate-asset check'],
    sonnet: ['duplicate engine search', 'orphan inventory triage', 'pipeline-coverage scan', 'duplication-prevention substrate doc-update'],
    opus:   ['discovery-architecture redesign'],
  },
  uniform: {
    haiku:  ['weak-assertion grep', 'inlined-constant scan', 'R12 violation detect', 'silent-failure detect (scan + classify)'],
    sonnet: ['bug-class repro', 'regression test write (test-first)', 'mutation-discipline check'],
    opus:   ['bug-class taxonomy expansion', 'hostile-payload exploit-surface synthesis'],
  },
  victor: {
    haiku:  ['file classify (engine/data/formula/tribal)', 'consumer-grep scan', 'extraction-log dedup'],
    sonnet: ['dormant-asset ledger entry', 'knowledge-conversion lane A/B/C route', 'tribal-tip slot-affinity'],
    opus:   ['cross-extraction-source synthesis', 'extraction-strategy redesign'],
  },
  whiskey: {
    haiku:  ['CSS rpm-cap clamp', 'thread-pitch lookup', 'chuck-jaw force clamp'],
    sonnet: ['lathe toolpath', 'CSS/G50/G96 strategy', 'parting-cycle plan'],
    opus:   ['lathe physics-coupled multi-pass synthesis', 'closed-loop adaptive lathe'],
  },
  xray: {
    haiku:  ['multi-print PDF split', 'unit-normalize to mm', 'OCR confidence-threshold gate'],
    sonnet: ['blueprint OCR + classify', 'CAD file parse (per-format)', 'GD&T datum-schema tie'],
    opus:   ['vision-LLM fallback strategy', 'multi-format CAD synthesis', 'GD&T tolerance-propagation network'],
  },
  zebra: {
    haiku:  ['fleet pid scan', 'chat-bus message route', 'orchestrator heartbeat'],
    sonnet: ['cross-slot synthesis', 'agent-chat fleet status', 'orchestrator-action dispatch'],
    opus:   ['fleet-topology redesign', 'orchestrator-Hermes synergy architecture'],
  },
};

function buildGalaxyBuildoutSkill(slot, galaxy) {
  return `---
name: galaxy-buildout-${slot}
description: Per-slot galaxy buildout for ${slot} (galaxy:${galaxy}). Loads state/shared/per-slot-galaxy-buildout/${slot}.md and executes the 11-step protocol so slot:${slot} owns its own galaxy substrate. Auto-fired by slot-tab-boot.ps1 on fresh launch when galaxy is missing/incomplete; also runnable manually.
---

# /galaxy-buildout-${slot}

Auto-build slot:${slot}'s galaxy at \`mcp-server/src/engines/${galaxy}/\` per the operator's 2026-05-28 directive: "the very first thing each chat does is start building their own galaxy."

## What this does

1. Reads \`state/shared/per-slot-galaxy-buildout/${slot}.md\` — your 11-step brief.
2. Reads \`state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md\` — the master protocol.
3. Executes the protocol: realign soul → scaffold → parallel-agent inventory → PATHS.md → MEMORY (3 sub-steps) → TOOLBELT.md → wiki+tribal → custom skill+hook → master graphs → PSN edges + master-brain sync → commit + close.
4. Runs the 11-artifact verification gate before commit.
5. Commits on \`slot/${slot}\` worktree with \`[${slot}] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-${slot.toUpperCase()}\` subject.

## When to invoke manually

- Galaxy partial (some artifacts missing) — verification gate will surface which.
- Galaxy fully built — this command no-ops; run \`/checkin-${slot}\` instead.

## Pre-flight

\`\`\`bash
pwd                        # expect: H:/prism-slot-${slot}
git branch --show-current  # expect: slot/${slot}
\`\`\`

If you're in shared H:/prism, cut over with \`cd H:/prism-slot-${slot} && git checkout slot/${slot}\` first.

## Execute now

Open the brief at \`state/shared/per-slot-galaxy-buildout/${slot}.md\` and follow it step-by-step. Use parallel \`Explore\` agents in Step 3 for token efficiency. Time budget ~95 min wall-clock, ~15-30K tokens.

---

_Generated by \`scripts/generate-per-slot-skill-wrappers.mjs\`. Re-run safely on SLOT_GALAXY_MAP changes._
`;
}

function buildSmartSkill(slot, galaxy) {
  const raw = SLOT_MODEL_MATRIX[slot] ?? { haiku: [], sonnet: [], opus: [] };
  // Concat shared task classes (COMMON_*) so every slot inherits the
  // fleet-wide baseline tiers. Dedup in case a slot duplicated a shared
  // task. Per reviewer audit P2 — sparse haiku tiers fleet-wide.
  const matrix = {
    haiku:  [...new Set([...raw.haiku,  ...COMMON_HAIKU])],
    sonnet: [...new Set([...raw.sonnet, ...COMMON_SONNET])],
    opus:   [...new Set([...raw.opus,   ...COMMON_OPUS])],
  };
  return `---
name: smart-${slot}
description: Per-slot smart router — recommends optimal Claude model (Haiku/Sonnet/Opus) for the next task in slot:${slot}'s domain, plus loads slot context. Operator ask 2026-05-28: per-slot /smart with model routing for token efficiency (don't waste Opus on Sonnet-class work).
---

# /smart-${slot}

Per-slot smart router for slot:${slot} (galaxy:${galaxy}).

## What this does

1. Identifies the next task class for slot:${slot} (from /loop state, /pick-unit suggestion, or operator-stated task).
2. **Recommends the optimal model** per the routing matrix below.
3. **Surfaces the rationale** — why this model class.
4. Loads slot:${slot} context: galaxy CLAUDE.md + soul + recent MEMORY.md + top-3 tribal tips.
5. Records the routing decision via \`hooks_model-outcome\` (for learning + future auto-routing).

## Model routing matrix for slot:${slot}

### HAIKU (fastest, ~50× cheaper than Opus, $0.80/M output)
Use for trivial transforms — pure-function tasks the slot runs repeatedly with no judgment:
${matrix.haiku.map(t => `- ${t}`).join('\n')}

### SONNET (balanced, ~6× cheaper than Opus, $15/M output)
Use for routine domain work — single-file edits, parameter tuning, RTK-wrapped shell, doc updates:
${matrix.sonnet.map(t => `- ${t}`).join('\n')}

### OPUS (deepest reasoning, current default, $75/M output)
Use for deep reasoning, safety-critical decisions, architecture, multi-engine synthesis:
${matrix.opus.map(t => `- ${t}`).join('\n')}

## How operator switches models

Claude Code's model is set per-session by the operator (via \`/config\` or env var). Inside a session, **this skill can recommend but not force** a model switch — the operator either accepts and continues on the current model OR closes + relaunches with a different model.

**Auto-switch suggestion format** (surfaced when task class clearly mismatches current model):
\`\`\`
[smart-${slot}] Task class: <CLASS>. Current model: <CURRENT>. Recommended: <REC>.
Reason: <one-line>
Token savings if you switch: ~<X>× per output token.
To switch: close + relaunch this slot with model <REC> in /config OR pass --model <REC>.
\`\`\`

## Per-slot routing heuristics

- **Default for slot:${slot}**: ${matrix.opus.length > matrix.sonnet.length ? 'Opus' : 'Sonnet'} (based on task-class distribution).
- **Escalate to Opus from Sonnet** when: physics math, safety gate, multi-engine integration, architectural decision.
- **De-escalate to Sonnet from Opus** when: single-file edit, doc-only change, RTK-wrapped shell pipeline, well-trodden code path.
- **Drop to Haiku from Sonnet** when: pure transform with no judgment (rename, format, lookup, dedup-scan).

## Invocation

Run \`/smart-${slot}\` BEFORE picking your next unit. The output names the recommended model so you can decide whether to switch tabs.

Pair with: \`/checkin-${slot}\` (continue work) or \`/galaxy-buildout-${slot}\` (build galaxy first).

---

_Generated by \`scripts/generate-per-slot-skill-wrappers.mjs\`. Routing matrix is per-slot; tune \`SLOT_MODEL_MATRIX\` in the generator and re-run to update all 24 wrappers in one pass._
`;
}

let written = 0;
let skipped = 0;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (const [slot, galaxy] of Object.entries(SLOT_GALAXY_MAP)) {
  for (const [kind, builder] of [
    ['galaxy-buildout', buildGalaxyBuildoutSkill],
    ['smart',           buildSmartSkill],
  ]) {
    const out = `${OUT_DIR}/${kind}-${slot}.md`;
    const content = builder(slot, galaxy);
    if (existsSync(out)) {
      const existing = readFileSync(out, 'utf8');
      if (existing === content) {
        skipped++;
        continue;
      }
    }
    writeFileSync(out, content);
    written++;
  }
}

console.log(`Skill wrappers: ${written} written, ${skipped} unchanged`);
console.log(`Total per-slot skills: ${Object.keys(SLOT_GALAXY_MAP).length} slots × 2 kinds = ${Object.keys(SLOT_GALAXY_MAP).length * 2} skills`);
