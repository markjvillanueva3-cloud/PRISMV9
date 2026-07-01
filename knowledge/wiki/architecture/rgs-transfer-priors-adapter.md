---
title: RGS Transfer-Priors Adapter (U-LIMA-A8)
type: architecture
created: 2026-05-21
tags: [rgs, transfer, cold-start, pipeline-cluster, tool-planner, ms1]
status: shipped
---

# RGS Transfer-Priors Adapter

`scripts/lib/rgs-transfer-priors-adapter.mjs` — wraps the RGS tool-planner's
outcomes reader (`makeOutcomesReader` in `rgs-tool-planner.mjs`) so a
cold-start pipeline (a pipeline with zero historical outcomes) inherits a
discounted aggregate of outcomes from related-cluster donor pipelines.
RGS-TOOL-AUTOINVOKE-MS1 punch-list P1 item #6. Final A-series member; sibling
of A6 [[rgs-tool-autoinvoke-ms1]] (complexity) and A7
[[rgs-calibration-adapter]] (confidence calibration).

## Punch-list mismatch (honestly surfaced — R7)

The punch-list item names this unit "Cross-milestone transfer priors —
`prism_ai:xproc_transfer_*` for cold-start milestones." Reality:
`prism_ai:xproc_transfer_*` is backed by `CrossProcessTransferLearningEngine`,
which transfers NEURAL WEIGHTS across MATERIAL clusters (e.g.
carbon_steel → stainless_steel). It has no notion of roadmap milestones and
no outcome-aggregation API. There is no engine in PRISM that maps cleanly
onto the punch-list's literal hint.

What the planner's confidence re-rank actually couples to is the
`(pipeline, tier, verdict)` key in `makeOutcomesReader`. Cold-start at THAT
level — a brand-new pipeline like `/mill` the moment it ships — is the
useful scope. A8 implements pipeline-cluster transfer priors and the
punch-list's `xproc_transfer_*` hint is treated as a conceptual analogy, not
a literal import.

Standing rule: when a punch-list item names a tool that's a bad fit for the
actual problem the unit solves, surface the mismatch in the wiki, ship at
the right scope, and resist forcing the literal hint.

## Mechanism

`makeTransferPriorsOutcomes(baseReader, opts)` returns an async closure with
the same signature as the base reader. Per call:

1. Read own-pipeline outcomes via `baseReader({pipeline, tier, verdict})`.
2. If shipped + blocked + reverted > 0 — pass through unchanged. Own-pipeline
   signal ALWAYS wins; the wrapper never suppresses real evidence.
3. If `opts.discount === 0` — identity pass-through (zero work, no donor
   fetch).
4. Look up the target pipeline's cluster via `pipelineToCluster()` and
   enumerate donor pipelines via `listDonorPipelines()` (drawn from a fixed
   `PIPELINE_CLUSTER_MAP` of ~30 canonical pipelines × 8 clusters, filtered
   through `TRANSFER_PAIRS`).
5. Call `baseReader` once per donor (cache-amortized — the underlying reader
   reads the ledger once and serves all subsequent queries from memory).
6. Sum donor outcomes, apply discount, `Math.floor` each field, return.

## Pipeline clusters

Eight clusters, fixed at module load (`Object.freeze`d):
`mill, lathe, wedm, cam, cad, knowledge, review, build`.

| Target | Donor clusters | Reasoning |
|--------|-----------------|-----------|
| mill   | lathe, cam      | shared metal-cutting physics + CAM tooling |
| lathe  | mill, cam       | symmetric to the above |
| wedm   | (none)          | EDM physics is non-cutting; do not borrow from cutting |
| cam    | mill, lathe     | CAM strategy generalizes from process priors |
| cad    | knowledge       | CAD intake shares document-parse failure modes |
| knowledge | cad          | symmetric — CAD intake is a knowledge form |
| review | build           | reviewing creation work uses build outcomes |
| build  | review          | symmetric — auditors and builders co-evolve |

The empty donor set for `wedm` is intentional: EDM has fundamentally
different process physics from cutting, so borrowing from milling/turning
outcomes would inject bias rather than reduce variance.

## Why Math.floor on the discount (and not round)

`{shipped: 1, blocked: 0, reverted: 0}` * 0.5 → `{0, 0, 0}` is the right
answer. A single donor success at half-weight is honestly less than one full
own success — rounding up would inflate donor evidence. The downside is that
sub-threshold donor signal disappears entirely; the upside is that the
re-rank multiplier never claims donor evidence it doesn't structurally have.

## Graceful degradation (R12 — fail soft)

- `baseReader` throws → return `{0,0,0}`. Never bubble.
- One donor read throws → other donors still aggregated; skip the failing
  donor silently.
- `opts.discount === 0` → identity (no donor fetch at all).
- `opts.discount` non-finite or negative → falls back to `DEFAULT_DISCOUNT`
  (0.5), NOT to identity. Caller is treated as buggy, not as
  "disable transfer."
- `opts.discount > 1` → capped to 1.0 (a >1 discount would AMPLIFY donor
  evidence above its raw signal, which is nonsense).
- Partial / malformed reader return (NaN, negatives, missing fields) →
  normalized to non-negative integers via `safeNonNegInt`.
- Unknown pipeline (not in `PIPELINE_CLUSTER_MAP`) → no transfer prior
  applied; return own outcomes unchanged.

## Default-on with kill switch

`rgs-tool-planner.mjs main()` default-wires the wrapper. The
`PRISM_RGS_TRANSFER_PRIORS=0` env var reverts to the bare reader. Mirrors
A6's `PRISM_RGS_RIE_ADAPTER=0` and A7's `PRISM_RGS_CALIBRATION=0` kill
switches.

## Why this won't make the planner less robust

The wrap is per-call. Own-pipeline signal ALWAYS wins (the wrapper only acts
when own is `{0,0,0}`). On a fresh checkout the outcomes ledger doesn't
exist, so every donor read returns `{0,0,0}` and the discounted aggregate
is `{0,0,0}` — exactly what the bare reader would have returned. The wrapper
is fail-soft along every error path. Default-on with this combination means
the wrapper is a no-op until real signal accumulates AND the cold pipeline
is actually a transfer target.

## Verification

- 37 adapter unit tests (`rgs-transfer-priors-adapter.test.mjs`) including
  2 real-data E2E (compiled `makeOutcomesReader` + temp-ledger end-to-end).
- 27/27 planner regression PASS.
- 9/9 signal-fusion regression PASS.
- Per-file 2-reviewer scrutiny ×3 files:
  - Adapter: reviewer A (code-analyzer) PASS, reviewer B PASS.
  - Test: reviewer A (test-review) PASS w/ 2 augmentations applied, reviewer
    B PASS.
  - Planner wire: reviewer A (wiring-review) PASS, reviewer B PASS.
- End-of-task 3-of-3 Stop scrutiny: deferred to the close-out commit (the
  unit is small + the per-file gates already cleared every diff hunk).
