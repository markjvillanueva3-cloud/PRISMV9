---
title: Post-Processor Cross-Controller Corpus — silent dialect cross-map class
date: 2026-05-25
type: code-tribal
slot: india
status: live
tags: [post-processor, master-post, cross-dialect, scenario-corpus, fail-loud, slot-india, p0-u06]
related:
  - "[[launch-readiness-2026-05-24]]"
  - "[[feedback_psn_definition]]"
  - "[[forge-audit-v2]]"
---

# Post-Processor Cross-Controller Corpus — tribal class: silent dialect cross-map

> Tribal entry captured 2026-05-25 (slot:india /loop, P0-U06 of PRISM-LAUNCH-READINESS-MS0). The structural cross-dialect guard caught a real bug in the generator's own force-path within minutes of v2 ship. This entry exists so the next chat building a stratified scenario corpus catches the trap **before** re-introducing it.

## The bug class

> **A scenario whose `controller.dialect` is reassigned without re-deriving every derived field that depends on the dialect leaks the previous dialect's tokens into the assertion contract.**

Specifically: in any stratified generator that retries-then-forces a controller assignment to satisfy a per-dialect stratum, the following fields are dialect-coupled and MUST move together with `controller.dialect`:

1. `expected_gcode_shape.must_contain` (dialect-specific G-codes / cycle codes / NCI header tokens)
2. `expected_gcode_shape.must_not_contain` (cross-dialect rejection list — flips when dialect flips)
3. `optional_features` (controller-gated — features valid for old dialect may be invalid for new)
4. `rejected_features` (the partner list — must absorb the now-invalid features)
5. Any feature-augmented tokens added to `must_contain` (HSM code, TSC on/off, SSV codes — all per-controller)

Forget to update any one of these, and the structural cross-dialect guard fires:

```
structural-cross-dialect-leak:expected_G54_in_heidenhain
structural-cross-dialect-leak:expected_G81_in_heidenhain
```

Per india slot soul §3: *"Cross-map dialects explicitly — Fanuc→Okuma is NOT a textual substitution; canned cycles diverge structurally."* This bug class IS the silent dialect cross-map the soul forbids.

## Symptom

Run `node scripts/post-processor-validate-corpus.mjs --batch <NNN> --structural-only`:

```
[validate]   progress 175/200 · pass 146 (83.4%) · fail 29
```

29 failures, ALL clustered in one controller stratum (in our case heidenhain). `by_controller` breakdown reveals 0/29 PASS for the leaked stratum, 29/29 PASS for every other stratum.

`by_error_class` reveals a single class: `structural-cross-dialect-leak`.

## Root cause

In `scripts/generate-post-processor-scenarios.mjs`, function `generateCorpus()` line ~440 implements stratification by re-sampling up to 3× to draw a scenario whose random machine.make → `controllersForMake()` happens to include the strata's dialect. If 3 retries don't hit the target dialect (some machine pools have no path to e.g. heidenhain), the loop FORCES the dialect:

```js
if (s.controller.dialect !== dialect) {
  s.controller = buildControllerInstance(dialect);
  s.metadata.forced_controller = true;
}
```

This is the bug — it flips `dialect` but leaves the previously-derived `expected_gcode_shape` (computed for the original dialect) untouched. The scenario now says "heidenhain" but its `must_contain` still has `G54`, `G81`, `G83` from the previous fanuc/haas attempt.

## The 7-step re-derive recipe

When forcing a dialect reassignment, ALL of the following must execute together:

1. **Capture original-make context** for fail-loud metadata:
   ```js
   const originalMake = s.machine?.make;
   ```
2. **Re-derive controller instance** (vendor/family/market_share from CONTROLLER_FEATURES catalog):
   ```js
   s.controller = buildControllerInstance(dialect);
   ```
3. **Surface the force with reason** (R12 fail-loud — never silent):
   ```js
   s.metadata.forced_controller = true;
   s.metadata.forced_reason = `original_machine_make_${originalMake}_pool_did_not_yield_${dialect}_after_3_retries`;
   ```
4. **Re-derive `expected_gcode_shape`** with the new controller (this is THE bug-fix line):
   ```js
   s.expected_gcode_shape = expectedGCodeShape(s.controller, s.cycle, s.operation, s.axis_count);
   ```
5. **Re-gate `optional_features`** against the new controller (drop now-invalid):
   ```js
   const previouslyOptional = s.optional_features || [];
   s.optional_features = previouslyOptional.filter(f => featureValidForController(f, dialect));
   ```
6. **Update `rejected_features`** (the partner list — record what got dropped, never silent):
   ```js
   s.rejected_features = [
     ...(s.rejected_features || []),
     ...previouslyOptional.filter(f => !featureValidForController(f, dialect)),
   ];
   ```
7. **Re-augment dialect-specific tokens** (HSM/TSC/SSV codes the new dialect would emit):
   ```js
   const cfeats = CONTROLLER_FEATURES[dialect].features;
   if (s.optional_features.includes('tsc') && cfeats.tsc?.on) s.expected_gcode_shape.must_contain.push(cfeats.tsc.on);
   if (s.optional_features.includes('ssv') && cfeats.ssv?.on) s.expected_gcode_shape.must_contain.push(cfeats.ssv.on);
   if (s.optional_features.includes('hsm') && cfeats.hsm?.code) {
     const tok = String(cfeats.hsm.code).split(' ')[0];
     if (!s.expected_gcode_shape.must_contain.includes(tok)) s.expected_gcode_shape.must_contain.push(tok);
   }
   ```

Canonical location: `scripts/generate-post-processor-scenarios.mjs:442-464`.

## Anti-regression test (codify this)

```js
test('forced-controller path re-derives expected_gcode_shape with new dialect tokens', () => {
  // Force a heidenhain stratum where machines don't naturally pair (Tormach/Haas/Fadal).
  // Seed must reliably trigger the 3-retry-exhausted branch.
  const corpus = generateCorpus({ target: 28, seed: 137, schemaVersion: '2.0.0' });
  const heidenhain = corpus.scenarios.filter(s => s.controller.dialect === 'heidenhain');
  assert(heidenhain.length >= 1, 'stratum must produce at least 1 heidenhain scenario');
  for (const s of heidenhain) {
    // The forbidden tokens that would leak from a fanuc/haas force-source
    const banned = ['G54', 'G81', 'G83', 'G84', 'G90', 'G15 H', 'G284'];
    for (const tok of banned) {
      assert(
        !s.expected_gcode_shape.must_contain.includes(tok),
        `heidenhain scenario ${s.id} leaks ${tok} (forced from ${s.metadata?.forced_reason ?? 'unknown'})`,
      );
    }
    // Heidenhain native tokens MUST appear
    assert(s.expected_gcode_shape.must_contain.includes('BEGIN PGM') ||
           s.expected_gcode_shape.must_contain.includes('CYCL DEF'),
           `heidenhain scenario ${s.id} missing native dialect header/cycle token`);
  }
});
```

## Fail-loud sentinels

The 2-layer defense (slot soul §4 requires Ω≥0.98 for program-emit, so both layers ship):

1. **Generator-side** (`metadata.forced_controller=true` + `metadata.forced_reason` + `rejected_features` non-empty) — surfaces force events even before validation.
2. **Validator-side** (`validateStructural()` cross-dialect-leak guard in `post-processor-validate-corpus.mjs:80-96`) — catches any forgotten re-derive.

Both layers must remain enabled. Disabling either re-opens the silent-cross-map class.

## Why this matters beyond post-processor

The pattern (re-assignment of one field requires synchronized re-derivation of ≥3 derived fields) generalizes to:

- Lathe scenarios (`controller.dialect` flips → `expected_gcode_shape` + `live_tooling_codes` + `coolant_codes`)
- 5-axis kinematics scenarios (`machine.kinematics_class` flips → `tcp_mode` + `singularity_zones` + `pivot_lengths`)
- Material scenarios (`material.iso_group` flips → `kc1` + `taylor_C` + `flow_stress_constants`)

Any scenario generator with controller/machine/material stratification + retry-then-force is at risk. The 7-step recipe is the template.

## Related

- `[[launch-readiness-2026-05-24]]` — parent milestone (PRISM-LAUNCH-READINESS-MS0)
- `[[feedback_psn_definition]]` — PSN 11-leg taxonomy (this entry is Leg 5 Tribal)
- `[[feedback_parallel_scrutiny_per_file]]` — per-file scrutiny doctrine that surfaced this bug
- `scripts/generate-post-processor-scenarios.mjs` — canonical implementation
- `scripts/lib/post-processor-catalog.mjs` — `featureValidForController()` gate
- `scripts/post-processor-validate-corpus.mjs` — structural guard catches it
- `mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts` — runtime oracle
