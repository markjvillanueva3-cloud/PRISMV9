---
title: P0-U06 Post-Processor Cross-Controller Validation Corpus
date: 2026-05-25
type: architecture
status: live
tags: [p0-u06, post-processor, master-post, scenario-corpus, india, launch-readiness]
related:
  - "[[launch-readiness-2026-05-24]]"
  - "[[post-processor-cross-controller-corpus]]"
  - "[[forge-audit-v2]]"
---

# P0-U06 — Post-Processor Cross-Controller Validation Corpus

> Architecture entry for the post-processor cross-controller scenario corpus shipped by slot:india under PRISM-LAUNCH-READINESS-MS0 P0-U06. Specifies the lib + generator + validator APIs, the v1↔v2 schema evolution, and the integration points that fleet-wide consumers should hit.

## Component map

```
                   ┌──────────────────────────────────────────────────────┐
                   │  scripts/lib/post-processor-catalog.mjs              │
                   │  (CONTROLLER_FEATURES · SPINDLE_TAPERS · OPTIONAL_*  │
                   │   featureValidForController · machine loaders)      │
                   └────────────────────┬─────────────────────────────────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  ▼                      ▼                      ▼
┌────────────────────────┐   ┌─────────────────────────┐   ┌────────────────────────┐
│ generate-post-         │   │ post-processor-         │   │ (FUTURE)               │
│ processor-scenarios    │──▶│ validate-corpus.mjs     │──▶│ ghost.post_proc_corpus │
│ .mjs (v1 + v2)         │   │ (structural+runtime)    │   │ viz roost              │
└──────┬─────────────────┘   └──────────┬──────────────┘   └────────────────────────┘
       │                                 │
       ▼                                 ▼
state/shared/scenarios/   state/shared/specs/
post-processor/           POST-PROCESSOR-PROVE-OUT-
batch-NNN/                YYYY-MM-DD.{json,md}
  manifest.json
  index.jsonl
  scenarios/PP-S-*.json
```

## Catalog lib (`scripts/lib/post-processor-catalog.mjs`)

Exports:

| Export | Type | Purpose |
|---|---|---|
| `CONTROLLER_FEATURES` | const | 7-dialect controller feature matrix (sourced from `MasterPostProcessorUnifiedAGIEngine.ts` lines 320-475) — fanuc/siemens/haas/okuma/mazak/heidenhain/mitsubishi with HSM code · TSC presence · probing type · 5-ax TCP mode · SSV · coolant types |
| `CONTROLLER_IDS` | const | Array of 7 dialect keys |
| `SPINDLE_TAPERS` | const | 8 standard tapers (BT30/40/50, CAT40/50, HSK63/100, R8) with drawbar type + typical max rpm + hp class |
| `OPTIONAL_FEATURES` | const | 16 controller-gateable features (tsc, hpc, mql, flood, mist, air, probing_wips, probing_renishaw, probing_heidenhain, ssv, hsm, five_axis_tcp, cas, atc, sub_spindle, live_tooling, bar_feeder, gantry_loader) |
| `featureValidForController(feature, controllerId)` | function | **Structural cross-map guard** — returns true iff controller catalog declares the capability OR feature is controller-agnostic. Per india slot soul §3: STRUCTURAL not textual. |
| `loadMachines()` | function | Cached JSON load of `mcp-server/src/data/gwizard-machines.json` (99 real machines) |
| `filterMachinesByType(type)` | function | Filter by `Mill` / `Lathe` / `Router` |
| `spindleForMachine(machine)` | function | Resolve spindle entry from machine.taperType + taperSize; synthesizes drive_type from rpm_max ≥12000 |
| `controllersForMake(make)` | function | Machine-make → compatible controllers heuristic (Haas→[haas], DMG→[heidenhain, siemens], Mazak→[mazak], default→[fanuc]) |

### Known dedup follow-up

`CONTROLLER_FEATURES` is a partial reimplementation of `ControllerFeatureMatrixEngine.CONTROLLER_MATRIX` (covers 15+ variants — strict superset). The current implementation accepts the drift risk in exchange for a generator-friendly shape. P0-U06.7 should refactor to a thin adapter over the engine catalog. See [[reference_p0_u06_post_processor_corpus_2026_05_25]] §Cross-session impact.

## Generator (`scripts/generate-post-processor-scenarios.mjs`)

Stratified parametric generator. Default v2.0.0 schema; v1.0.0 preserved for batch-001 back-compat.

```bash
node scripts/generate-post-processor-scenarios.mjs \
  --target 200 --seed 42 --batch 001              # v2 default
node scripts/generate-post-processor-scenarios.mjs \
  --target 200 --seed 1 --batch legacy-v1         # explicitly v1 (deprecated)
```

### v1.0.0 schema (batch-001)

5 controllers × 4 envelope classes × cycles × materials × axis_count × dialect_features. 200 scenarios per batch.

### v2.0.0 schema (batch-002+) — adds:

- `machine`: real make/model/type from gwizard catalog
- `spindle`: taper + rpm + hp + drive_type
- `controller`: now 7 dialects (added siemens, mazak)
- `optional_features`: 16 controller-gated; structurally rejected features surfaced as `rejected_features` (never silent drop)

### Stratification — retry-then-force

To honor per-dialect stratum minimums, the generator retries 3× drawing a `machine.make` whose `controllersForMake()` includes the target dialect. If exhausted, FORCE-assigns the dialect — but MUST re-derive every dependent field (see [[post-processor-cross-controller-corpus]] §7-step recipe; this is THE bug class that caught the 29/200 heidenhain regression on first v2 run).

## Validator (`scripts/post-processor-validate-corpus.mjs`)

Two modes:

1. **`--structural-only`** — schema + cross-dialect leak guard + Ω-floor + safety_tier validation. No engine dependency. Run anywhere.
2. **(default) full runtime** — additionally imports the compiled `MasterPostProcessorUnifiedAGIEngine.js` from `mcp-server/dist/` + invokes `generatePost()` per scenario + diffs result against `expected_gcode_shape`.

Per scenario, validates:

- `controller_profile.id` matches scenario controller dialect
- `quality_score` ≥ Ω floor (0.98 — shop_floor PP tier per slot soul §4)
- `line_count` within `[expected_gcode_shape.lines_min, lines_max × 3]` envelope
- `gcode` body does NOT contain any `expected_gcode_shape.must_not_contain` token (structural cross-dialect rejection)
- Engine warnings surfaced as validation warnings

### Runtime gap (P0-U06.5)

`master_post_generate` is a POST-processor — it transforms toolpath SEGMENTS into dialect-correct G-code. Scenarios encode expected OUTPUT, not INPUT. Runtime validation currently 0/N PASS with engine warning `"No segments or G-code provided"`. P0-U06.5 builds the toolpath-stub bridge (per-scenario operation/cycle → minimal segments stub) that lifts runtime PASS rate from 0 toward Ω floor.

## Output artifacts

- `state/shared/scenarios/post-processor/batch-NNN/manifest.json` — batch metadata + coverage matrix
- `state/shared/scenarios/post-processor/batch-NNN/index.jsonl` — compact one-per-scenario index for fast iteration
- `state/shared/scenarios/post-processor/batch-NNN/scenarios/PP-S-NNNNN.json` — per-scenario spec
- `state/shared/specs/POST-PROCESSOR-PROVE-OUT-YYYY-MM-DD.{json,md}` — validator output (latest run only; prior overwritten)

## Coverage matrix axes (v2.0.0 — 9 axes)

1. controller (7 dialects)
2. operation (5 — drilling/milling/turning/threading/boring)
3. cycle (~25 across operations)
4. axis_count (3/4/5)
5. material (6 ISO groups: P/M/K/N/S/H)
6. optional_feature (16 controller-gated)
7. spindle_taper (8 standards)
8. spindle_rpm_class (low <6000 / med 6000-12000 / high ≥12000)
9. machine_type (Mill/Lathe/Router)

Composite coverage in batch-002 (seed=137, 200 scenarios): **91.8%**.

## Safety contract (per india slot soul)

- Default tier: `shop_floor` (Ω≥0.95, S(x)≥0.98)
- Program-emit tier: Ω≥0.98 (encoded as `omega_floor` field on every scenario)
- Every scenario REQUIRES `controller.dialect` resolved before any emit (REJECT on missing)
- Master-post `master_post_generate` is the canonical oracle (NEVER partial-emit; NEVER softened thresholds)
- Cross-controller cross-mapping is STRUCTURAL not textual — `featureValidForController()` is the enforcement gate

## Follow-up sub-units

Tracked in TodoWrite + chat-bus:

| Sub-unit | Description | Owner slot |
|---|---|---|
| P0-U06.5 | Toolpath-stub bridge for runtime validation | india |
| P0-U06.6 | v2 schema (machine × spindle × controller × features) | DONE 2026-05-25 |
| P0-U06.7 | Catalog dedup — thin adapter over `ControllerFeatureMatrixEngine` | india |
| P0-U06.8 | viz roost extension — `ghost.post_processor_corpus` | india |
| P0-U06.9 | Wire 3 dispatcher actions across `prism_cam` + `prism_dev` | india |
| P0-U06.10 | Test plan execution — 43 tests across 3 files (P0 first) | india |
| P0-U06.11 | Machine catalog upgrade — swap gwizard for `machine-post-enriched.ts` + JM-Die join | india |
| P0-U06.12 | Batches 003-005 — reach 800-scenario target | india |

## Related

- [[launch-readiness-2026-05-24]] — parent milestone audit
- [[post-processor-cross-controller-corpus]] — tribal entry capturing the cross-dialect-leak bug class + 7-step re-derive recipe
- [[reference_p0_u06_post_processor_corpus_2026_05_25]] — Obsidian memory pointer
- `mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts` — runtime oracle
- `mcp-server/src/engines/ControllerFeatureMatrixEngine.ts` — canonical controller-feature catalog (dedup target)
- `mcp-server/src/engines/LatheMasterPostRegressionMatrixEngine.ts` — lathe sibling of this mill harness
- `mcp-server/src/data/gwizard-machines.json` — current machine catalog source
- `mcp-server/src/data/machine-post-enriched.ts` — richer machine catalog (P0-U06.11 target)
- `mcp-server/src/data/jm-die-profile.ts` — JM-Die canonical test shop (P0-U06.11 join target)
