---
title: feature-gap-dedup-win-reconciler — META audit reconciler
type: architecture
created: 2026-05-19
last_updated: 2026-05-19
unit: FEATURE-GAP-AUDIT-MS0::U-FEATURE-GAP-DEDUP-WIN-RECONCILER
commit: 87a62f1c2b
slot: india
related:
  - reference_feature_gap_dedup_win_reconciler_2026_05_19
  - reference_feature_gap_audit_cad_dedup_wins_2026_05_18
  - feature-gap-audit-2026-05-17
  - reference_u_dispatcher_2026_05_16
  - reference_fleet_reaper_ms1
---

# feature-gap-dedup-win-reconciler — META audit-rot reconciler

A META tool that closes the audit-signal-rot loop. The juliett /forge-audit-v2 2026-05-17 emitted 68 units in `state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json`. Multiple slots have since R8-discovered that the audit's "unwired" / "digest=0, absent" claims are partly stale — engines named as gaps turn out to be on disk, wired, and tested. This reconciler **auto-detects every such dedup-win** so operators can close them out without per-unit manual triage.

## Doctrine context

The same class shipped from delta /loop 2026-05-18 [[reference_feature_gap_audit_cad_dedup_wins_2026_05_18]] — 5/8 CAD/lathe GAP units were R8 dedup-wins. India /loop 2026-05-19 R8-found 4+ post-domain dedup-wins (`BackplotEngine`, `RLPostProcessorEngine`, `JMDieProgramLearningEngine`, all 14 Okuma engines via U-BRIDGE-WIRE-OKUMA). Instead of per-unit close-out for the rest, this tool processes the whole audit in one pass.

## Architecture — pure-core + injected-deps

The pattern enforced by [[reference_u_dispatcher_2026_05_16]] (hermetic fakes don't prove production wiring): a pure classifier + a real-fs reader bag + a real-data E2E oracle.

```
state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json
            │
            ▼
   buildLedger(units, fs)  ◄──  makeRealFs()   ── walks engines/dispatchers/tests
            │                        │
            ▼                        ▼
       per-unit classifyUnit    fail-loud on empty bag
            │
            ▼
state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.{json,md,html}
       (advisoryOnly:true, mustHumanVerify:true)
```

### Files

| Path | Role | Tests |
|------|------|-------|
| `scripts/lib/feature-gap-classifier.mjs` | Pure classifier (5 exports) | 36 hermetic |
| `scripts/lib/feature-gap-classifier.test.mjs` | Hermetic unit tests | — |
| `scripts/feature-gap-dedup-win-reconciler.mjs` | CLI shell with real-fs reader bag | — |
| `scripts/feature-gap-dedup-win-reconciler.e2e.test.mjs` | Real-data E2E oracle | 11 real-data |
| `state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.json` | Generated ledger (machine-read) | — |
| `state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.md` | Generated ledger (human-read) | — |

### The 7 verdicts

```
DEDUP-WIN         engine + dispatcher + test all present → close out the audit unit
PARTIAL-NO-TESTS  engine + wiring, no tests             → rescope: gap is tests
PARTIAL-NO-WIRING engine + tests, no dispatcher ref     → rescope: gap is wiring
PARTIAL-PORT-ONLY engine on disk, no wiring no tests    → rescope: most work remains
GENUINE-GAP       no engine class matches               → audit was right; build the port
BATCH-WIRE        title is "Wire the ~N unwired X..."   → inspect BUILD_STATE.NEEDS_WIRING
UNKNOWN           title doesn't match audit conventions → human review needed
```

### Candidate generation combinator

Real PRISM engine class names follow several conventions for the same `PRISM_*` audit token:

| Audit token | Real engine class | Variants emitted |
|-------------|-------------------|------------------|
| `PRISM_GCODE_BACKPLOT_ENGINE` | `BackplotEngine` | `GcodeBackplotEngine` (TitleCase) + `GCODEBackplotEngine` (acronym-preserve) + `BackplotEngine` (drop-prefix) |
| `PRISM_FFT_PREDICTIVE_CHATTER_ENGINE` | `FFTPredictiveChatterEngine` | + `PredictiveChatterEngine` (drop-prefix) + `ChatterEngine` |
| `PRISM_RL_POST_PROCESSOR` | `RLPostProcessorEngine` | `RlPostProcessorEngine` + `RLPostProcessorEngine` + `PostProcessorEngine` + `ProcessorEngine` |
| `PRISM_JMDIE_PROGRAM_LEARNING` | `JMDieProgramLearningEngine` | + `JMDieProgramLearningEngine` (2-prefix-split — JM+Die) |

The combinator emits **drop-prefix × acronym-preserve × 2-prefix-split** for every suffix, deduped via a Set. Cost: ≤10 candidates per unit; disk-lookup is cheap.

### Composite + colon-list title shapes

| Title shape | Example | Kind |
|-------------|---------|------|
| Single PRISM token | `Re-modularize PRISM_X from v8.89 monolith` | `remodularize` |
| Composite | `Re-modularize PRISM_X + PRISM_Y from v8.89 monolith` | `remodularize` (both tokens) |
| Colon-list | `Re-modularize v8.89 X engines: A, B, C` | `remodularize-list` |
| Wire-batch | `Wire the ~20 unwired mill engines (E1, E2)` | `wire-batch` |
| Wire-batch (no count) | `Wire 4 unwired Okuma engine(s) to dispatcher(s)` | `wire-batch` |
| Anything else | `Master Post → 6 CAM bridges` | `unknown` |

## Scrutiny gates passed

**4-agent per-file gate on classifier+test** — 2 rounds (initial FAIL/FAIL, fixes, second-pass PASS). P0/P1 fixes covered: composite-PRISM parse, colon-list shape, strongest-match tie-break (tests-worth-more-than-wiring re-weight prevents WIRE-EXEMPT-no-tests shadowing wired+tested non-exempt), VERDICTS deepEqual schema pin (all 7 strings), schemaVersion pin, WIRE-EXEMPT-no-tests test, malformed-unit guard.

**2-agent per-file gate on CLI+E2E** — both PASS overall, 2 convergent P0s: `findTestFiles` substring match (caught 5 false-positive DEDUP-WINs in live run), `countDispatcherRefs` substring match (comment-mention overcount). Both fixed with word-boundary regex anchored at filename boundaries; `findTestFiles` further constrains the engineless-stem fallback to stems ≥8 chars.

Plus: silent empty-reader-bag fail-loud (exit 3), `isCli` via canonical `fileURLToPath`, `parseArgs` path validation, `walkTests` symlink-skip + depth cap 8 + deterministic sort.

## Live ledger first-run

68 audit units → ledger summary:

```
DEDUP-WIN            8   (close out)
PARTIAL-NO-TESTS     9   (rescope to test-coverage units)
PARTIAL-PORT-ONLY    1   (rescope)
GENUINE-GAP         13   (audit was right)
BATCH-WIRE           8   (inspect BUILD_STATE.NEEDS_WIRING)
UNKNOWN             29   (human review needed)
```

The **5 false-positive DEDUP-WINs that the loose-stem matcher would have shipped pre-fix** are now correctly surfaced as PARTIAL-NO-TESTS — exactly the R12 fail-loud signal the reconciler exists to produce.

## How to run

```bash
node scripts/feature-gap-dedup-win-reconciler.mjs                    # writes ledger
node scripts/feature-gap-dedup-win-reconciler.mjs --dry-run          # no writes, summary only
node scripts/feature-gap-dedup-win-reconciler.mjs --json | jq        # stream JSON to stdout
node scripts/feature-gap-dedup-win-reconciler.mjs --input <path>     # override audit input
```

Exit codes: `0` ok, `2` bad CLI args, `3` empty reader bag (engines/dispatchers/tests dir missing or unreadable).

## Tests

```bash
node --test scripts/lib/feature-gap-classifier.test.mjs scripts/feature-gap-dedup-win-reconciler.e2e.test.mjs
# 47/47 PASS (36 hermetic unit + 11 real-data E2E)
```

The E2E suite anchors on `BackplotEngine`, `RLPostProcessorEngine`, `JMDieProgramLearningEngine`, `OkumaRunLogParserEngine` — engines whose state is R8-verified live as of 2026-05-19. A future engine deletion would surface as a failure, which is the R12 fail-loud signal (intended), not a tooling regression.

## Karpathy fit

- **R5** (model for judgment, code for routing): pure classifier never invokes a model; the routing is deterministic.
- **R8** (read before write): the whole point — the audit's claim is checked against disk reality.
- **R9** (tests verify intent): every verdict path has a hermetic test + a real-data E2E anchor; the regression block pins all 7 verdict strings + the schemaVersion + the composite/colon-list/JMDIE/exempt-no-tests invariants.
- **R11** (match conventions): script layout matches `scripts/lib/*.mjs` + `scripts/*.mjs` CLI sibling pattern; test files use `node --test` (the canonical PRISM script-test runner).
- **R12** (fail loud): empty reader bag → exit 3 with the path; malformed unit → UNKNOWN with `findings:["malformed unit"]`; every misclassification surfaces in `findings[]`.

## Cross-references

- Sibling dedup-win run: [[reference_feature_gap_audit_cad_dedup_wins_2026_05_18]] (delta, 8 units)
- Audit source: [[feature-gap-audit-2026-05-17]]
- Pure-core + E2E oracle doctrine: [[reference_u_dispatcher_2026_05_16]], [[reference_fleet_reaper_ms1]]
- Standing rule: [[feedback_prioritize_devtools_backend]]
