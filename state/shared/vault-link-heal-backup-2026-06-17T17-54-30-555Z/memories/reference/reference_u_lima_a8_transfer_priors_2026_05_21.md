---
name: reference-u-lima-a8-transfer-priors-2026-05-21
description: "U-LIMA-A8 — cross-pipeline transfer-priors adapter wraps the RGS outcomes reader (rgs-transfer-priors-adapter.mjs); cold pipelines borrow discounted outcomes from donor-cluster siblings; closes LIMA-ROSTER 8/8"
aliases: reference_u_lima_a8_transfer_priors_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-17T17:52:56.891Z
---


# U-LIMA-A8 U-TRANSFER-PRIORS — final LIMA-ROSTER unit

2026-05-21 lima slot `claude-fe1db0ba`, /loop iter 6. [[reference_rgs_tool_autoinvoke_ms1_2026_05_16|RGS-TOOL-AUTOINVOKE-MS1]]
punch-list P1 item #6, closes LIMA-ROSTER 8/8.

**What shipped:** `scripts/lib/rgs-transfer-priors-adapter.mjs` —
`makeTransferPriorsOutcomes(baseReader, opts)` wraps the planner's
`makeOutcomesReader()`. When a pipeline's own outcomes are `{0,0,0}` (cold
start), the wrapper aggregates outcomes from donor-cluster sibling pipelines
(e.g. cold `/mill` borrows from `/lathe`, `/cam-strategy`, ...) and returns
the `Math.floor`'d, default-0.5x-discounted aggregate. Own-signal always
wins. Pure async-factory → async-closure pattern; the planner's
`fuseSignals` reads it transparently via the same `readers.outcomes`
contract.

**Pipeline clusters (8):** mill, lathe, wedm, cam, cad, knowledge, review,
build. Donor table is small + fixed: mill↔lathe↔cam (cutting-physics
analogy), cad↔knowledge (document-parse analogy), review↔build (creator-
auditor co-evolution), wedm donor set is empty (different physics — do not
borrow from cutting).

**Wiring:** `rgs-tool-planner.mjs main()` default-wires the wrapper;
`PRISM_RGS_TRANSFER_PRIORS=0` reverts to the bare reader. Mirrors the A6 /
A7 kill-switch pattern exactly.

**Key design lesson — punch-list naming mismatch (R7 — surface conflicts).**
The punch-list named this unit "Cross-milestone transfer priors —
`prism_ai:xproc_transfer_*` for cold-start milestones." Reality:
`xproc_transfer_*` is backed by `CrossProcessTransferLearningEngine`, which
transfers neural weights across MATERIAL clusters, not milestones. The
useful scope was at the PIPELINE-cluster level (where the planner's
re-rank multiplier actually couples to outcomes), so A8 ships at THAT scope
and the wiki entry surfaces the mismatch honestly rather than forcing the
literal hint. **Standing rule:** when a punch-list names a tool that's a bad
fit, surface it in the wiki + ship at the right scope.

**Why this can't make the planner less robust:** wrap is per-call, own
signal always wins, every error path falls back to identity, and on a fresh
checkout (no ledger, no outcomes) donor reads all return zeros so the
aggregate is zero — exactly what the bare reader returns.

**Scrutiny:** per-file 2-reviewer gate ×3 files. Adapter 2/2 PASS (5 P2/P3
latent concerns flagged, all acceptable per the fail-soft posture; TRANSFER_PAIRS
inner Sets not frozen — P2 deferred). Test 2/2 PASS (test-review A flagged
2 augmentations on discount=0 + discount=-1 — both applied, suite now 37
cases). Planner wire 2/2 PASS (wiring-review A + reviewer B both clean —
kill-switch naming consistent with A6/A7, cache-isolation verified, direct
runPlanner test imports unaffected).

**Math verification:** all donor-aggregation tests arithmetically checked.
E.g. `/mill` cold + `/lathe`={4,2,0} + `/cam-strategy`={6,0,2} → sum
{10,2,2} → discount 0.5 → floor({5,1,1}) → result `{5,1,1}`. Verified
explicitly in tests 21-23 of `rgs-transfer-priors-adapter.test.mjs`.

See [[reference-rgs-tool-autoinvoke-ms1-2026-05-16]] for the punch-list
context, [[reference-u-lima-a7-calibration-2026-05-20]] for the
calibration sibling. LIMA-ROSTER now 8/8 complete.
