/**
 * R8-MS0: Intent Decomposition Engine Tests
 *
 * Tests entity extraction, plan generation, persona detection, and confidence scoring.
 *
 *   T1:  Full query — Inconel pocket roughing (spec example)
 *   T2:  Material extraction — all ISO groups
 *   T3:  Tool extraction — imperial fractions
 *   T4:  Tool extraction — metric
 *   T5:  Machine extraction — brand names
 *   T6:  Operation extraction
 *   T7:  Feature extraction with depth
 *   T8:  Constraint extraction — aerospace
 *   T9:  Constraint extraction — cost/speed
 *   T10: Persona detection — machinist
 *   T11: Persona detection — programmer
 *   T12: Persona detection — manager
 *   T13: Plan generation — material + tool + operation
 *   T14: Plan dependencies — correct ordering
 *   T15: Confidence scoring
 *   T16: Ambiguity generation
 *   T17: Unit detection
 *   T18: Colloquial language — "forty-one forty", "hog it out"
 *   T19: Dispatcher function
 *   T20: Edge cases — empty query, gibberish
 */

import {
  intentEngine,
  decomposeIntent,
} from '../../src/engines/IntentDecompositionEngine.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  FAIL: ${label}`);
  }
}

// ============================================================================
// T1: FULL QUERY — INCONEL POCKET ROUGHING
// ============================================================================

console.log('\n=== T1: Full query — Inconel pocket roughing ===');

const t1 = decomposeIntent(
  "I need to rough out a 4-inch deep pocket in Inconel 718 on my DMU 50, " +
  "it's going in a turbine so surface finish matters, and I only have a 1/2 inch endmill"
);

assert(t1.entities.material === 'Inconel 718', 'T1.1: material = Inconel 718');
assert(t1.entities.machine !== undefined && t1.entities.machine.includes('DMU'), 'T1.2: machine = DMU 50');
assert(t1.entities.tool_type === 'endmill', 'T1.3: tool type = endmill');
assert(t1.entities.tool_diameter_mm !== undefined && Math.abs(t1.entities.tool_diameter_mm - 12.7) < 0.1, 'T1.4: tool diameter ≈ 12.7mm');
assert(t1.entities.operation === 'roughing', 'T1.5: operation = roughing');
assert(t1.entities.feature?.type === 'pocket', 'T1.6: feature = pocket');
assert(t1.entities.feature?.depth_mm !== undefined && Math.abs(t1.entities.feature.depth_mm - 101.6) < 1, 'T1.7: depth ≈ 101.6mm (4")');
assert(t1.entities.constraints?.application === 'aerospace', 'T1.8: aerospace constraint');
assert(t1.entities.constraints?.surface_finish !== undefined, 'T1.9: surface finish constraint');
assert(t1.plan.length >= 4, 'T1.10: plan has ≥ 4 steps');
assert(t1.confidence >= 0.70, 'T1.11: confidence ≥ 0.70');
assert(t1.persona === 'machinist', 'T1.12: persona = machinist');

// ============================================================================
// T2: MATERIAL EXTRACTION — ALL ISO GROUPS
// ============================================================================

console.log('\n=== T2: Material extraction — all ISO groups ===');

const materials: [string, string, string][] = [
  ['Cut 4140 steel at 200 sfm', 'AISI 4140', 'P'],
  ['Machining 304 stainless', '304 Stainless', 'M'],
  ['Turning cast iron today', 'GG25 Gray Iron', 'K'],
  ['HSM in 7075-T6 aluminum', '7075-T6', 'N'],
  ['Finishing Inconel 718', 'Inconel 718', 'S'],
  ['Hard turning D2 tool steel at 60HRC', 'D2 Tool Steel', 'H'],
  ['Need to cut some mild steel', 'AISI 1018', 'P'],
  ['Working with titanium today', 'Ti-6Al-4V', 'S'],
  ['What speed for 316L?', '316L Stainless', 'M'],
  ['Drilling duplex 2205', 'Duplex 2205', 'M'],
];

for (const [query, expected, _group] of materials) {
  const r = decomposeIntent(query);
  assert(r.entities.material === expected, `T2: "${query}" → ${expected} (got ${r.entities.material})`);
}

// ============================================================================
// T3: TOOL EXTRACTION — IMPERIAL FRACTIONS
// ============================================================================

console.log('\n=== T3: Tool extraction — imperial fractions ===');

const t3a = decomposeIntent('Use a half inch endmill');
assert(t3a.entities.tool_type === 'endmill', 'T3.1: type = endmill');
assert(t3a.entities.tool_diameter_mm !== undefined && Math.abs(t3a.entities.tool_diameter_mm - 12.7) < 0.1, 'T3.2: Ø ≈ 12.7mm');

const t3b = decomposeIntent('quarter inch drill bit');
assert(t3b.entities.tool_type === 'drill', 'T3.3: type = drill');
assert(t3b.entities.tool_diameter_mm !== undefined && Math.abs(t3b.entities.tool_diameter_mm - 6.35) < 0.1, 'T3.4: Ø ≈ 6.35mm');

const t3c = decomposeIntent('3-flute endmill, 0.75 inch');
assert(t3c.entities.tool_flutes === 3, 'T3.5: 3 flutes');
assert(t3c.entities.tool_diameter_mm !== undefined && Math.abs(t3c.entities.tool_diameter_mm - 19.05) < 0.1, 'T3.6: Ø ≈ 19.05mm');

const t3d = decomposeIntent('Use a four-flute endmill');
assert(t3d.entities.tool_flutes === 4, 'T3.7: 4 flutes');

// ============================================================================
// T4: TOOL EXTRACTION — METRIC
// ============================================================================

console.log('\n=== T4: Tool extraction — metric ===');

const t4a = decomposeIntent('Ø10mm endmill for finishing');
assert(t4a.entities.tool_type === 'endmill', 'T4.1: type = endmill');
assert(t4a.entities.tool_diameter_mm === 10, 'T4.2: Ø = 10mm');

const t4b = decomposeIntent('12mm diameter drill');
assert(t4b.entities.tool_type === 'drill', 'T4.3: type = drill');
assert(t4b.entities.tool_diameter_mm === 12, 'T4.4: Ø = 12mm');

// ============================================================================
// T5: MACHINE EXTRACTION — BRAND NAMES
// ============================================================================

console.log('\n=== T5: Machine extraction — brand names ===');

const machineTests: [string, string][] = [
  ['On my Haas VF-2', 'Haas VF-2'],
  ['Running the DMU 50', 'DMG Mori DMU 50'],
  ['Using the five-axis', '5-axis CNC'],
  ['On the lathe', 'CNC Lathe'],
  ['Haas ST-10 turning center', 'Haas ST-10'],
];

for (const [query, expected] of machineTests) {
  const r = decomposeIntent(query);
  assert(r.entities.machine === expected, `T5: "${query}" → ${expected} (got ${r.entities.machine})`);
}

// ============================================================================
// T6: OPERATION EXTRACTION
// ============================================================================

console.log('\n=== T6: Operation extraction ===');

const opTests: [string, string][] = [
  ['I need to rough out this part', 'roughing'],
  ['Finish the surface', 'finishing'],
  ['Drill and tap M10', 'drill_and_tap'],
  ['Thread milling operation', 'threading'],
  ['Boring the ID', 'boring'],
  ['Face milling the top', 'facing'],
  ['Profile the outside contour', 'contouring'],
  ['Slot milling 10mm wide', 'slotting'],
  ['Pocket milling', 'pocketing'],
  ['Trochoidal roughing', 'trochoidal_milling'],
];

for (const [query, expected] of opTests) {
  const r = decomposeIntent(query);
  assert(r.entities.operation === expected, `T6: "${query}" → ${expected} (got ${r.entities.operation})`);
}

// ============================================================================
// T7: FEATURE EXTRACTION WITH DEPTH
// ============================================================================

console.log('\n=== T7: Feature extraction with depth ===');

const t7a = decomposeIntent('Mill a pocket 50mm deep');
assert(t7a.entities.feature?.type === 'pocket', 'T7.1: feature = pocket');
assert(t7a.entities.feature?.depth_mm === 50, 'T7.2: depth = 50mm');

const t7b = decomposeIntent('2 inch deep slot');
assert(t7b.entities.feature?.type === 'slot', 'T7.3: feature = slot');
assert(t7b.entities.feature?.depth_mm !== undefined && Math.abs(t7b.entities.feature.depth_mm - 50.8) < 0.1, 'T7.4: depth ≈ 50.8mm (2")');

const t7c = decomposeIntent('Drill a hole');
assert(t7c.entities.feature?.type === 'hole', 'T7.5: feature = hole');

// ============================================================================
// T8: CONSTRAINT EXTRACTION — AEROSPACE
// ============================================================================

console.log('\n=== T8: Constraint extraction — aerospace ===');

const t8 = decomposeIntent('Machining a turbine blade, aerospace quality required, tight tolerance');
assert(t8.entities.constraints?.application === 'aerospace', 'T8.1: aerospace');
assert(t8.entities.constraints?.tolerance_mm !== undefined && t8.entities.constraints.tolerance_mm <= 0.03, 'T8.2: tight tolerance ≤ 0.03mm');

const t8b = decomposeIntent('Medical implant, Ra ≤ 0.8');
assert(t8b.entities.constraints?.application === 'medical', 'T8.3: medical');
assert(t8b.entities.constraints?.surface_finish?.includes('0.8'), 'T8.4: Ra ≤ 0.8');

// ============================================================================
// T9: CONSTRAINT EXTRACTION — COST/SPEED
// ============================================================================

console.log('\n=== T9: Constraint extraction — cost/speed ===');

const t9a = decomposeIntent('Need this done cheap in 4140');
assert(t9a.entities.constraints?.optimize_for === 'cost', 'T9.1: optimize for cost');

const t9b = decomposeIntent('Rush job, need it fast');
assert(t9b.entities.constraints?.optimize_for === 'speed', 'T9.2: optimize for speed');

const t9c = decomposeIntent('Prototype run, batch of 1');
assert(t9c.entities.constraints?.batch_size === 1, 'T9.3: batch = 1 (prototype)');

const t9d = decomposeIntent('Production run of 500 parts');
assert(t9d.entities.constraints?.batch_size === 500, 'T9.4: batch = 500');

// ============================================================================
// T10: PERSONA DETECTION — MACHINIST
// ============================================================================

console.log('\n=== T10: Persona detection — machinist ===');

const t10 = decomposeIntent('What speed should I run 4140 with my half inch endmill on my Haas?');
assert(t10.persona === 'machinist', 'T10.1: machinist persona');

const t10b = decomposeIntent('Hog it out, rough out this pocket');
assert(t10b.persona === 'machinist', 'T10.2: colloquial → machinist');

// ============================================================================
// T11: PERSONA DETECTION — PROGRAMMER
// ============================================================================

console.log('\n=== T11: Persona detection — programmer ===');

const t11 = decomposeIntent('What toolpath strategy and stepover for adaptive HSM in Fusion?');
assert(t11.persona === 'programmer', 'T11.1: programmer persona');

const t11b = decomposeIntent('Need trochoidal toolpath with optimal scallop height');
assert(t11b.persona === 'programmer', 'T11.2: CAM terms → programmer');

// ============================================================================
// T12: PERSONA DETECTION — MANAGER
// ============================================================================

console.log('\n=== T12: Persona detection — manager ===');

const t12 = decomposeIntent('How much will this cost and what is the schedule impact?');
assert(t12.persona === 'manager', 'T12.1: manager persona');

const t12b = decomposeIntent('ROI on new 5-axis investment vs outsourcing');
assert(t12b.persona === 'manager', 'T12.2: ROI → manager');

// ============================================================================
// T13: PLAN GENERATION — MATERIAL + TOOL + OPERATION
// ============================================================================

console.log('\n=== T13: Plan generation ===');

const t13 = decomposeIntent('Mill 4140 with a half inch 4-flute endmill, roughing');
assert(t13.plan.length >= 3, 'T13.1: plan has ≥ 3 steps');

// Should have material lookup
assert(t13.plan.some((s) => s.action.includes('material')), 'T13.2: has material step');
// Should have speed/feed calculation
assert(t13.plan.some((s) => s.action.includes('speed_feed')), 'T13.3: has speed/feed step');
// All steps should have IDs
assert(t13.plan.every((s) => s.id.startsWith('step_')), 'T13.4: all steps have IDs');
// All steps should have descriptions
assert(t13.plan.every((s) => s.description.length > 0), 'T13.5: all steps have descriptions');

// ============================================================================
// T14: PLAN DEPENDENCIES — CORRECT ORDERING
// ============================================================================

console.log('\n=== T14: Plan dependencies ===');

const t14 = decomposeIntent('Rough 4140 on Haas VF-2 with half inch endmill, aerospace');

// Speed/feed should depend on material lookup
const sfStep = t14.plan.find((s) => s.action.includes('speed_feed'));
const matStep = t14.plan.find((s) => s.action.includes('material'));
assert(sfStep !== undefined, 'T14.1: has speed/feed step');
assert(matStep !== undefined, 'T14.2: has material step');
if (sfStep && matStep) {
  assert(sfStep.depends_on.includes(matStep.id), 'T14.3: speed/feed depends on material');
}

// Surface finish step should exist (aerospace)
const sfnStep = t14.plan.find((s) => s.action.includes('surface_finish'));
assert(sfnStep !== undefined, 'T14.4: has surface finish step (aerospace)');

// Chatter stability should exist (machine + material known)
const stabStep = t14.plan.find((s) => s.action.includes('stability'));
assert(stabStep !== undefined, 'T14.5: has stability step (machine known)');

// ============================================================================
// T15: CONFIDENCE SCORING
// ============================================================================

console.log('\n=== T15: Confidence scoring ===');

const t15a = decomposeIntent('Mill 4140 with half inch endmill, roughing');
assert(t15a.confidence >= 0.70, 'T15.1: high confidence with material+tool+operation');

const t15b = decomposeIntent('Need to cut something');
assert(t15b.confidence < 0.50, 'T15.2: low confidence with vague query');

const t15c = decomposeIntent('');
assert(t15c.confidence <= 0.30, 'T15.3: very low confidence for empty query');

// More entities → higher confidence
assert(t15a.confidence > t15b.confidence, 'T15.4: more entities = higher confidence');

// ============================================================================
// T16: AMBIGUITY GENERATION
// ============================================================================

console.log('\n=== T16: Ambiguity generation ===');

const t16a = decomposeIntent('What feed rate?');
assert(t16a.ambiguities.length > 0, 'T16.1: vague query → ambiguities');
assert(t16a.ambiguities.some((a) => a.toLowerCase().includes('material')), 'T16.2: asks about material');
assert(t16a.ambiguities.length <= 3, 'T16.3: max 3 questions');

const t16b = decomposeIntent('Mill 4140 with half inch endmill, roughing on Haas VF-2');
assert(t16b.ambiguities.length === 0, 'T16.4: complete query → no ambiguities');

// ============================================================================
// T17: UNIT DETECTION
// ============================================================================

console.log('\n=== T17: Unit detection ===');

const t17a = decomposeIntent('Run at 500 sfm, 0.005 ipm');
assert(t17a.entities.units === 'imperial', 'T17.1: sfm/ipm → imperial');

const t17b = decomposeIntent('Speed 200 m/min, feed 0.15 mm');
assert(t17b.entities.units === 'metric', 'T17.2: m/min + mm → metric');

// ============================================================================
// T18: COLLOQUIAL LANGUAGE
// ============================================================================

console.log('\n=== T18: Colloquial language ===');

const t18a = decomposeIntent('Hog out some forty-one forty');
assert(t18a.entities.material === 'AISI 4140', 'T18.1: "forty-one forty" → AISI 4140');
assert(t18a.entities.operation === 'roughing', 'T18.2: "hog out" → roughing');

const t18b = decomposeIntent('Clean up this part in aluminum');
assert(t18b.entities.material === '6061-T6', 'T18.3: "aluminum" → 6061-T6');
assert(t18b.entities.operation === 'finishing', 'T18.4: "clean up" → finishing');

// ============================================================================
// T19: DISPATCHER FUNCTION
// ============================================================================

console.log('\n=== T19: Dispatcher function ===');

const t19a = intentEngine('decompose_intent', { query: 'Mill 4140' }) as any;
assert(t19a.entities?.material === 'AISI 4140', 'T19.1: dispatcher routes correctly');
assert(t19a.plan !== undefined, 'T19.2: returns plan');

const t19b = intentEngine('unknown_action', {}) as any;
assert(t19b.error !== undefined, 'T19.3: unknown action returns error');

// ============================================================================
// T20: EDGE CASES
// ============================================================================

console.log('\n=== T20: Edge cases ===');

const t20a = decomposeIntent('');
assert(t20a.plan.length === 0, 'T20.1: empty query → empty plan');
assert(t20a.confidence <= 0.25, 'T20.2: empty → low confidence');

const t20b = decomposeIntent('asdfghjkl xyz 123');
assert(t20b.entities.material === undefined, 'T20.3: gibberish → no material');
assert(t20b.confidence < 0.50, 'T20.4: gibberish → low confidence');

const t20c = decomposeIntent('Just milling');
assert(t20c.entities.operation !== undefined || t20c.entities.tool_type !== undefined, 'T20.5: "milling" detected');

const t20d = decomposeIntent('ball nose endmill finishing pass on 7075');
assert(t20d.entities.tool_type === 'ball_nose', 'T20.6: ball nose detected');
assert(t20d.entities.material === '7075-T6', 'T20.7: 7075 detected');
assert(t20d.entities.operation === 'finishing', 'T20.8: finishing detected');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
if (failures.length > 0) {
  console.log(`R8-MS0 Intent Decomposition Engine Tests: ${passed} PASS, ${failed} FAIL (total ${passed + failed})`);
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
} else {
  console.log(`R8-MS0 Intent Decomposition Engine Tests: ${passed} PASS, ${failed} FAIL (total ${passed + failed})`);
}
console.log('='.repeat(60));

if (failed > 0) process.exit(1);
