---
name: reference_zbl_artifact_shipped_2026_06_25
description: Zulu build-loop pointer now detects shipped C-units by engine-artifact existence (drift-immune) -- fixes the recurring false-pending regression
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.280Z
aliases: reference_zbl_artifact_shipped_2026_06_25
---


# Zulu build-loop: drift-immune artifact-existence shipped-detection (U-ZBL-ARTIFACT-SHIPPED, 2026-06-25, slot:zulu)

Commit `0511a885e8` on `cad-fusion-live-ms0`.

**Recurring bug (3rd occurrence):** the zulu build-loop pointer
(`state/shared/zulu-build-loop-next.json`, written by `scripts/zulu-build-loop.mjs` on the
`PRISM Zulu Build Loop` cron) showed `next:C1 / doneCount:0` while **all 8 capability
engines are built + dispatcher-wired** on this branch. Prior "fixes" ([[reference_zulu_build_cron_git_grounded_2026_06_16]] git-grounding, [[reference_zbl_detect_hermes_format_2026_06_18]] hermes-format) relied on COMMIT SUBJECTS -- but on this branch **ZERO commit subjects carry a literal `C<n>`/`[HERMES-CAPABILITY-C<n>]` tag** (verified: `git log --all | grep -E 'C[1-8]'` empty), so BOTH `parseShipped` (brief prose) and `parseShippedFromCommits` (git subjects) miss every unit. The units shipped under engine-name commits.

**Root-cause-correct fix:** detect shipped by **canonical engine-artifact EXISTENCE on disk**
-- the only drift-immune "was this built" signal. `buildQueueFromTexts` gained a PURE
`opts.extraShipped` union (lib stays fs-free); the IO writer computes the set via a
`UNIT_ARTIFACTS` map (C1->ZuluWaveSchedulerEngine ... C8->ZuluSoulEvolutionAdvisorEngine)
+ fail-soft `shippedByArtifact(root, artifacts, existsFn)`.

**Ground truth:** all 8 engines present on-branch (`ZuluWaveScheduler/TaskContinuity/
FleetHealthSynthesis/DelegationContract/AdaptiveBackPressure/CapabilityRegistry/
CapabilityAttestation/SoulEvolutionAdvisor Engine.ts`), substantial (302-769 lines), wired
into `sessionDispatcher.ts`. C1 further verified COMPLETE (allWaves + computeWaveN
incremental driver + `nextWaveAssignments` dispatcher action + multi-wave/cycle/adversarial
tests). So the queue is genuinely **DRAINED**.

**Proof:** 44/44 tests (8 new); live pointer regenerated `done:0/next:C1` -> `done:8/next:null
DRAINED`; 2-arm scrutiny PASS. **Known tradeoff (arm-C P2, doctrine-caveated):** artifact
existence cannot detect a reverted-but-not-deleted engine (unlike `parseShippedFromCommits`'s
revert-handling) -- acceptable for the "initial build needed" contract; mitigation = revert
with file-delete or a future min-line/marker gate.

**Zulu build queue C1-C8 = DRAINED.** Remaining zulu capability work is the spec's
operator-gated deeper integration (C6/C7/C8 after 4+ weeks of multi-wave running), not
auto-build. See [[feedback_psn_definition]] · [[feedback_synergy_definition]].
