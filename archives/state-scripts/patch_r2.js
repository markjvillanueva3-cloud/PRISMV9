// Batch-patch missing metadata in PRISM_ROADMAP_v18.1.md
// Fixes: READS_FROM, WRITES_TO, PROVIDES, LAYER, BASH on all 45+ incomplete TASK blocks
const fs = require('fs');
const path = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
let content = fs.readFileSync(path, 'utf8');
let patches = 0;

function patch(oldText, newText, label) {
  if (content.includes(oldText)) {
    content = content.replace(oldText, newText);
    patches++;
    console.log(`✅ ${label}`);
  } else {
    console.log(`⚠️ SKIP (not found): ${label}`);
  }
}

// ============================================================
// R2 PATCHES
// ============================================================

// R2 MS2-GATE: missing WRITES_TO
patch(
`TASK: MS2-GATE
  DEPENDS_ON: [MS2-T1, MS2-T2, MS2-T3, MS2-T4, MS2-T5]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 3
  SUCCESS: ≥30/50 pass (60%), all original 7 retained
  ESCALATION: If <25/50 → identify remaining blockers, plan MS2 extension
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json]
  PROVIDES: [Calibrated engine baseline → MS3 edge cases, MS4 final gate]`,
`TASK: MS2-GATE
  DEPENDS_ON: [MS2-T1, MS2-T2, MS2-T3, MS2-T4, MS2-T5]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 3
  SUCCESS: ≥30/50 pass (60%), all original 7 retained
  ESCALATION: If <25/50 → identify remaining blockers, plan MS2 extension
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json]
  WRITES_TO: [state/CALIBRATION_STATE.json (updated pass rates)]
  PROVIDES: [Calibrated engine baseline → MS3 edge cases, MS4 final gate]`,
'R2 MS2-GATE: +WRITES_TO'
);

// R2 MS3-T2: missing WRITES_TO
patch(
`TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  SUCCESS: ≥16/20 edge cases correct (80%)
  LAYER: 2
  READS_FROM: [tests/r2/edge-case-results.json]
  WRITES_TO: [src/engines/* (targeted safety fixes) ⊗]
  PROVIDES: [Safety boundary definitions → L6 compliance, L14 digital twin limits]`,
`TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  SUCCESS: ≥16/20 edge cases correct (80%)
  LAYER: 2
  READS_FROM: [tests/r2/edge-case-results.json]
  WRITES_TO: [
    src/engines/ManufacturingCalculations.ts (boundary clamps) ⊗,
    src/engines/AdvancedCalculations.ts (edge case guards) ⊗,
    tests/r2/edge-case-results.json (updated results)
  ]
  PROVIDES: [Safety boundary definitions → L6 compliance, L14 digital twin limits]`,
'R2 MS3-T2: +detailed WRITES_TO'
);

// R2 MS4-T1: missing WRITES_TO, add BASH
patch(
`TASK: MS4-T1
  DEPENDS_ON: [MS1-GATE, MS2-GATE, MS3-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [entire codebase]
  WRITES_TO: [dist/ (build output)]
  PROVIDES: [Clean build → MS4-T2 quality scoring]`,
`TASK: MS4-T1
  DEPENDS_ON: [MS1-GATE, MS2-GATE, MS3-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [src/engines/*.ts, src/tools/dispatchers/*.ts, tests/r2/*.ts]
  WRITES_TO: [dist/ (build output), state/pre_build_snapshot.json]
  PROVIDES: [Clean build + snapshot → MS4-T2 quality scoring]`,
'R2 MS4-T1: +detailed READS/WRITES'
);

// R2 MS4-T2: missing READS_FROM, WRITES_TO
patch(
`TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70, benchmarks ≥40/50)
  ESTIMATED_CALLS: 5
  LAYER: 2
  PROVIDES: [Quality scores → R3 entry criteria]`,
`TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Ω ≥ 0.70, S(x) ≥ 0.70, benchmarks ≥40/50)
  ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json, tests/r2/edge-case-results.json, dist/ (build output)]
  WRITES_TO: [state/results/R2_QUALITY_REPORT.json]
  PROVIDES: [Ω score + S(x) score → MS4-T3 tag, R3 entry criteria]`,
'R2 MS4-T2: +READS/WRITES'
);

// R2 MS4-T3: missing PROVIDES, READS_FROM, LAYER
patch(
`TASK: MS4-T3
  DEPENDS_ON: [MS4-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 3
  WRITES_TO: [git tag r2-complete, data/docs/roadmap/CURRENT_POSITION.md]`,
`TASK: MS4-T3
  DEPENDS_ON: [MS4-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 3
  LAYER: 2
  READS_FROM: [state/results/R2_QUALITY_REPORT.json]
  WRITES_TO: [git tag r2-complete, state/CURRENT_POSITION.md, state/ACTION_TRACKER.md]
  PROVIDES: [R2 marked complete → R3-MS0 dependency satisfied]`,
'R2 MS4-T3: +LAYER/READS/PROVIDES'
);

fs.writeFileSync(path, content, 'utf8');
console.log(`\nTotal R2 patches: ${patches}`);
