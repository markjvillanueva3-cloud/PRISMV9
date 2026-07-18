---
name: reference_scimath_dispatcher_contract_mismatch_2026_06_22
description: "prism_scientific_math is ~non-functional: 4/5 actions THROW on schema-valid input -- a systemic schema<->engine PARAM-CONTRACT mismatch (the schema fields don't match the engine input type). New dispatcher-integrity bug class beyond the 61 method-existence mismatches. Empirically confirmed 2026-06-22."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.150Z
aliases: reference_scimath_dispatcher_contract_mismatch_2026_06_22
---


# prism_scientific_math schema<->engine param-contract mismatch (2026-06-22, slot:bravo)

Found while closing zero-test dispatcher gaps. `scientificMathDispatcher.ts` (SCI-MS3, registered index.ts:647) advertises 5 actions with Zod schemas in `scientificMathActionSchemas.ts`, then passes the validated params STRAIGHT to the engine (`eng.analyze(params)` etc.). But each engine's input TYPE differs from its schema -> the action throws/no-ops on schema-valid input.

## EMPIRICALLY CONFIRMED (probe via MockMCPServer round-trip, 2026-06-22)
| action | schema fields | engine reads | result on schema-valid input |
|---|---|---|---|
| stochastic_simulate | method, transition_matrix, initial_state, steps | `input.model`, `input.markov{}`/`wiener{}`/`poisson{}` | **THROW** "Unknown stochastic model: undefined" |
| information_entropy | method, signal, bins, x, y, p, q | `input.signal_x`, `input.measures[]`, `input.n_bins` | **THROW** "Cannot read properties of undefined (reading 'length')" (signal_x) |
| optimal_control | method, segments, constraints, Q_diag, R_scalar, dt_sec | `input.segments[].x`, `input.method`, `input.lqr_Q`/`lqr_R` | **THROW** "Cannot read properties of undefined (reading 'x')" (segment shape) |
| graph_solve | method, nodes, edges | `input.algorithm`, `input.nodes`, `input.edges` | **THROW** "Unknown algorithm: undefined" (nodes/edges DO match; only method->algorithm) |
| fuzzy_neural | method, inputs, rules, training_data, criteria, comparison_matrix | `input.method`, `input.anfis{}`/`taguchi{}`/`type2{}` | graceful warning-only no-op ("Missing anfis input") -- silent non-compute |

So 4/5 THROW, 1/5 silently no-ops. The dispatcher is non-functional as documented. (Sibling suspicion: `multiOpDispatcher` / prism_multi_op -- same CAMK-MS3 author pattern, delegates `eng.analyze/sequence/plan(params)` -- likely the same class; NOT yet probed.)

## Bug class (NEW -- beyond the 61)
This is DISTINCT from the 61 method-existence mismatches in `DISPATCHER-ENGINE-METHOD-AUDIT.md` (those: handler calls a method the engine lacks). Here the METHOD exists; its PARAM SHAPE doesn't match the dispatcher's advertised schema. A method-existence detector cannot catch it. A param-contract detector would need to compare each engine input-type's read fields vs the schema's declared fields.

## Fix (queued, NOT done -- needs a careful dedicated pass)
Per-action param-mapping adapter in the dispatcher (schema shape -> engine input shape), OR rewrite the schemas to match the engine input types. Either way: read all 5 engine input TYPES (StochasticInput/InfoTheoryInput/OptimalControlInput/GraphInput/FuzzyNeuralInput) first, map exactly, then a real round-trip wire-test per action with ENGINE-shaped inputs + math-correct reference values. Getting the mapping wrong yields silently-wrong math (worse than the current honest throw) -- so do NOT rush it. graph_solve is the easiest (just method->algorithm + verify node/edge field shapes); information_entropy needs signal->signal_x + method->measures[] (+ shannon|mutual_info name map) + the kl q->reference_signal.

NOT fixed this session (end-of-session, R8/soul: no rushed math-engine change). Surfaced to chat bus + handoff for a dedicated fix unit.

Related: [[reference_dispatcher_capability_assessment_2026_06_22]] · [[reference_dispatcher_engine_method_audit_2026_06_22]]
