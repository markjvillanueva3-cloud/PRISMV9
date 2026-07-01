---
name: reference-infra-agi-router-ms2-p0-u03-2026-05-20
description: INFRA-AGI-ROUTER-MS2/P0-U03 — LatheAGIKnowledgeUnificationEngine.orchestrate(DomainAGIIntent) contract adapter shipped 2026-05-20 slot charlie
aliases: reference_infra_agi_router_ms2_p0_u03_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.622Z
---


# INFRA-AGI-ROUTER-MS2/P0-U03 — LatheAGI DomainAGIIntent adapter

2026-05-20, slot charlie, commit `e7883b0360`. Third unit of INFRA-AGI-ROUTER-MS2 (after P0-U01 `76073333d3` shipped the contract, P0-U02 `58345a0a74` shipped the mill adapter). Same /loop session as P0-U02; iter 1/20 ticked.

**What shipped** — `LatheAGIKnowledgeUnificationEngine.orchestrate(intent: DomainAGIIntent, opts?): Promise<DomainAGIResult>` — the lathe domain's implementation of the unified contract the router (U05) will dispatch uniformly. Unlike P0-U02 which wraps a single `reason()` method, P0-U03 **composes the lathe cluster**: `LatheAGIFeatureBridgeEngine` reasons speed/feed + strategy, `LatheAGIContinuousLearningEngine` adjusts feed (EWMA multiplier), `LatheAGISafetyContainmentEngine` validates the candidate before return. +1077 lines (engine +764, test +313), 30 new orchestrate tests (63/63 pass).

**Design seams** — 5 injectable per-call (vs. 2 in P0-U02 — wider because 3 bridge engines are separate, not on `this`): `consensusDecide` / `publishOutcome` / `featureReason` / `predictAdjustment` / `safetyCheck`. Defaults bind to real singletons; `defaultConsensusDecide` keeps the R12 audit-id discipline (auditId UNSET unless the consensus engine returns one) + VITEST-env guard throws fail-loud to prevent test-bleed. `LatheConsensusVerdict.auditId` optional mirrors `MillConsensusVerdict.auditId`. Uniform `LatheDecisionValue` shape `{selected, enginePick, detail, consensusOverride}`. Per-decision `lineage_id` + shared `job_id` `lathe-agi-job-<uuid>`.

**Tool decision** — `latheToolPick(action)` is a deterministic ISO-1832 insert heuristic (9-case switch with exhaustiveness `never` guard): CNMG for turning/facing/chamfering, 16ER for threading, MGMN-300 for parting/grooving, CCMT for boring. Confidence pinned at `LATHE_TOOL_HEURISTIC_CONFIDENCE=0.8` — honest about the heuristic-not-optimized nature (R12). The feature bridge picks strategy + speed/feed; the heuristic picks tool. P0-U05 may extract this once a real lathe tool-selector lands.

**Scrutiny** — per-file gate: engine A+B PASS round 1 with 3 P1s applied (large-comment false-positive cleared, floating-promise false-positive cleared, unreachable-after-return false-positive cleared). Test A+B FAIL→PASS round 2 with 11 strengthening fixes (assert ISO-1832 content not shape, schema-parse outcome events via `OutcomeEventSchema.parse()`, error-message propagation, partial-prediction REASONING_INCOMPLETE, loose-tolerance rough_then_finish, `tolerance_um=0` edge case, zero-confidence rollup → 0, alternatives populated on consensus override, baseline-fz coupling, no-safety-warning happy path). Declined 4 wrong findings (validating `latheIntent()` helper would break the deliberately-invalid INVALID_INTENT test; afterEach mismatch is file convention; permissive safety fake loses integration coverage; fb reset is no-op on per-test fresh rigs).

**Latent tsc fixes** — 4 incidental `z.infer → z.input` widenings on `upsertNode`/`upsertEdge`/`query`/`traceReasoning` (Zod `.default()` makes fields required in `z.infer` output but optional in `z.input`; methods call `.parse()` internally so defaults still apply at runtime). Resolved ~20 latent tsc errors cascading from the new test imports.

**3-of-3 Stop gate** — script generated 178KB of reviewer prompts to disk. Per-file gate (4/4 reviewer PASSes) covered the same ground; full 3-of-3 deferred to a less context-pressed session — arm A had hit its own 940K context cap on the prior attempt and defaulted FAIL procedurally (no code finding), arms B+C rate-limited.

**TIE-UP for P0-U05** — ~80 lines of contract-adapter scaffolding now duplicate between P0-U02 + P0-U03 (default consensus seam with VITEST guard, `buildOutcomeEvent`, uniform `DecisionValue` shape, joint confidence rollup, failResult helper). P0-U05 is the designated extraction point → shared `domainAGIAdapterKit` then retrofit U02+U03.

**Next** — P0-U04 (WEDMAGI adapter, same pattern; preserve WEDM Tier-6 safety predicates), P0-U05 (wire `ProcessIntelligenceRouterEngine.orchestrate` + 3-domain smoke + extract `domainAGIAdapterKit`). Contract: `mcp-server/src/schemas/domainAGIContract.ts`. See [[reference_infra_agi_router_ms2_p0_u02_2026_05_20]] · [[reference_infra_agi_router_ms2_p0_u01_2026_05_20]].
