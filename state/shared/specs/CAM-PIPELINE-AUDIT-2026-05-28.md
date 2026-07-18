# CAM Pipeline Audit — 2026-05-28

> Slot=**kilo**, claude-ea0ff1a5, applying delta's CAD-domain methodology to CAM. Empirical determination of which CAM platform is the easiest to drive end-to-end through PRISM's 10-stage adaptive-pipeline contract (program intake → machine select → stock → workholding → op order → tool/holder → machine capabilities → post emit → setup sheet → closed-loop feedback). Verification channel: `scripts/cam-pipeline-coverage-scorer.mjs` (re-runnable, scores every (platform × stage) cell with raw + normalized + `bridgeKind` + `hasPlatformEvidence`).
>
> **Methodology mirror:** delta's `CAD-PIPELINE-AUDIT-2026-05-20.md` (AMENDED post peer-review). Same F1-F7 finding shape, same normalization cap (intersect engines ≤ 5, shared engines ≤ 4, dispatcher tokens ≤ 8), same bridge-kind taxonomy, same `hasPlatformEvidence` flag exposing delta's F7 tautology.
>
> **First-pass status:** unreviewed. To match delta's pattern, this audit needs the same peer-reviewer FAIL → patch → re-publish cycle (subagent reviewer-pass queued — see §10).

## 1. Scope statement

I am auditing **which CAM program is the easiest to drive end-to-end through PRISM** for the adaptive-pipeline the operator specified — machine selection (ERP + availability + capability), stock size, first-op workholding (Kurt vise parallels + MiteeBite ROI + soft-jaw generation + vacuum/magnet), operation order (interrupted-cut avoidance + chip thickness + SFC-driven), tool + holder ROI, machine-capability use (taper interface CAT40/BigPlus/BT/HSK/Capto + spindle + kinematics + envelope + controller features + parameter optimization), and post-emit (optimized + cost-efficient + accurate + safe).

Verification: `node scripts/cam-pipeline-coverage-scorer.mjs` (re-runnable in ~1 sec; baseline at `state/shared/specs/cam-pipeline-coverage-LATEST.{md,json}`).

## 2. Headline empirical result

Re-runnable: `node scripts/cam-pipeline-coverage-scorer.mjs`. Engines scanned: 3324 | Dispatchers: 99 | Tests scanned: 3646. Baseline 2026-05-28T02:39:55.080Z.

| Rank | Platform | Raw | **Normalized** | Plat-specific stages | Bridge kind | Autodesk MCP |
|---|---|---|---|---|---|---|
| 1 | HyperMill (+HyperCAD-S) | 461 | **92** | 6/10 | in-host | no |
| 2 | Inventor HSM | 464.5 | **91** | 6/10 | none | yes |
| 3 | Fusion 360 | 451.5 | **79.5** | 3/10 | **socket** | **yes** |
| 4 | Mastercam X8 | 446 | **72.5** | 3/10 | none | no |
| 5 | NX CAM | 445 | **71.5** | 3/10 | none | no |
| 6 | Esprit | 439 | **64** | 2/10 | none | no |
| 7 | SolidCAM | 436 | **61** | 2/10 | none | no |
| 8 | PowerMill | 436 | **61** | 2/10 | none | no |

**Decision splits cleanly:**

- **CAM-substrate dominance → HyperMill.** Normalized 92, 6/10 platform-specific stages. Same outcome delta found for CAD CAM stages (where HyperMill normalized 80.25 was the leader). The CAM-side coverage stays dominant after engine-count normalization.
- **Inventor HSM is a close #2 (91).** Surprise — Inventor's CAM half of HSM has substantial PRISM engine surface that delta's CAD audit treated as a CAD-modeling-only platform. The HSM CAM engines were credited correctly here.
- **Fusion 360 is the live-driveable champion.** Only platform with `socket` bridge (`Fusion360LiveBridgeEngine` listens at `:18360`) AND Autodesk Claude MCP connector (`AutodeskFusionMCPProxyEngine`). Normalized 79.5 is third behind HyperMill + Inventor, but **the socket bridge is operationally distinct from in-host or none** — Fusion can be driven from a headless CI runner; HyperMill cannot. **Subject to MISC-305 (Fusion bridge runtime unverified — delta's open question).**
- **Mastercam X8 (norm 72.5, 3/10) is under-represented.** Mastercam X8 has 95+ programs in JM Die corpus + a full VBScript automation surface (per `[[reference_cam_corpus_locations]]`). The platform-specific evidence is only 3/10 because PRISM has not yet wrapped Mastercam's VBScript surface into a PRISM bridge engine. **High-leverage gap to close** — see F4.
- **Esprit / SolidCAM / PowerMill (2/10 each)** are at the floor — credited only via shared engines (echo's post-processor family + the platform-agnostic SFC stack). No platform-specific bridge code.

## 3. Findings (each with verification channel)

### F1 — HyperMill leads CAM substrate; live-drive runtime is partially verified

- **Claim:** HyperMill has the highest normalized score (92) AND a live-drive bridge (`HyperMillACBridgeEngine` HTTP companion at `:18365` + `prism_ac` Python host module + `cam_hypermill_drive` dispatcher action). 6/10 stages have platform-specific evidence — the highest of any platform tied with Inventor.
- **Verify via:** `node scripts/cam-pipeline-coverage-scorer.mjs --json` then read `.totals.hypermill.normalizedTotalScore` and `.totals.hypermill.stagesWithPlatformSpecificEvidence`.
- **Expected signal:** ≥ 85, ≥ 5/10.
- **Baseline (2026-05-28):** 92, 6/10.
- **OPEN-QUESTION (runtime):** the `HyperMillACBridgeEngine` HTTP server exists in PRISM as a TS source file, but the live Tier 2 test path (`HYPERMILL-MASTERCAM-FUSION-CAM-TEST-PLAYBOOK-2026-05-28.md` Tier 2 LIVE) has not been wet-run against the JM Die hyperMILL workstation with USB key inserted. The finding is correct directionally; **operational readiness of the live bridge is unverified by this static-scan audit**.

### F2 — Mastercam X8 is under-bridged relative to its in-house corpus weight

- **Claim:** Mastercam X8 is JM Die's primary CAM for legacy mill + wire-EDM (95+ `.mcx-8` programs, full VBScript automation at `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/vb/*.vbs` + C-Hook .EQN macros + ATP NetHook DLLs). Despite this corpus weight, **PRISM has zero platform-specific bridge engines for Mastercam** — its score of 72.5 comes mostly from echo's post-processor family + cross-platform tooling, not from Mastercam-aware code.
- **Verify via:** `node scripts/cam-pipeline-coverage-scorer.mjs --json` then read `.matrix.mastercam` cells for `hasPlatformEvidence`. Cross-check: `find H:/prism-slot-kilo/mcp-server/src/engines -name "Mastercam*.ts" | wc -l`.
- **Expected signal:** `stagesWithPlatformSpecificEvidence ≤ 3`.
- **Baseline (2026-05-28):** 3/10.
- **Recommendation:** **`U-MASTERCAM-VBSCRIPT-DRIVE`** is the highest-leverage Mastercam-side build. The C-Hook + ATP NetHook + VBScript surface is the path; the catalog map at `state/shared/cad-action-templates/mastercam.actions.json` (38 atomic ops) is the existing inventory.

### F3 — Fusion 360 wins live-drive but has runtime gap (delta MISC-305)

- **Claim:** Fusion 360 is the only platform with BOTH a `socket` live bridge AND the Autodesk Claude MCP. Score 79.5 normalized; 3/10 platform-specific stages — but **the live-drive multiplier is what matters for batch / cloud / CI workflows.**
- **Verify via:** `node scripts/cam-pipeline-coverage-scorer.mjs --json` then read `.totals.fusion360.bridgeKind = "socket"` AND `.totals.fusion360.autodeskMcp = true`.
- **Expected signal:** both must be true.
- **Baseline (2026-05-28):** confirmed.
- **OPEN-QUESTION:** delta surfaced MISC-305 — `Fusion360LiveBridgeEngine + PrintToFusion360Bridge appear incomplete`. Same caveat applies here: the scorer is static-file-scan; runtime socket connectivity at `:18360` is unverified. **The CAM-TEST-PLAYBOOK Tier 2 Fusion path is the gate.**

### F4 — Closed-loop feedback stage is at the floor across ALL platforms

- **Claim:** Every platform scores **3** (cap-bounded) on the CLOSED_LOOP_FEEDBACK stage. The closed-loop machinery (kilo's 4-engine inner loop: TemplateApplicabilityClassifier + SelfLearningLoopOrchestrator + OutcomeFeedbackWire + ToolpathTipRetriever) is platform-AGNOSTIC. This means the self-learning loop works for ALL CAM systems equally — there's no "HyperMill self-learns better than Mastercam" today.
- **Verify via:** `node scripts/cam-pipeline-coverage-scorer.mjs --json` then read `.matrix.<id>.CLOSED_LOOP_FEEDBACK.normalizedScore` for every platform.
- **Expected signal:** every platform = 3 (all equal).
- **Baseline (2026-05-28):** all 8 platforms = 3.
- **Interpretation:** **good news** — the closed-loop self-training pipeline is platform-neutral. Bad news — there's no per-platform tuning of the corpus / priors. **`U-PER-CAM-CORPUS-PRIORS`** would tune the bandit posteriors per CAM system using the corpus already accumulated (95+ Mastercam, 31+ hyperMILL, 1640 .f3d Fusion, 28 Esprit). Today the priors are shared.

### F5 — Workholding stage shows ZERO platform-specific evidence on any CAM

- **Claim:** WORKHOLDING_FIRSTOP stage shows `hasPlatformEvidence: false` for every platform. Score 6 across all — pure shared-engine credit. The 24 workholding + fixture + clamping engines (`WorkholdingIntelligenceEngine`, `WorkholdingRetrofitAdvisorEngine`, `FixtureDesignEngine`, etc.) are correctly platform-agnostic — workholding doesn't care which CAM made the toolpath.
- **Verify via:** `node scripts/cam-pipeline-coverage-scorer.mjs --json` then read `.matrix.hypermill.WORKHOLDING_FIRSTOP.hasPlatformEvidence`.
- **Expected signal:** `false` for every platform.
- **Baseline (2026-05-28):** confirmed `false`.
- **Interpretation:** correct architecture. Workholding decisions are downstream of CAM choice — the same `WorkholdingIntelligenceEngine.fixture_recommend(...)` call works for every CAM. No follow-up unit needed.

### F6 — Setup sheet generation is the most-covered stage across all platforms

- **Claim:** SETUP_SHEET stage scores 8-16.5 normalized across platforms. **Echo's post-emit family handles setup sheet generation as part of the post-process pipeline** — every per-vendor master-post engine generates a setup sheet.
- **Verify via:** `node scripts/cam-pipeline-coverage-scorer.mjs --json` then read `.matrix.<id>.SETUP_SHEET.normalizedScore`.
- **Expected signal:** unique values across {8, 11, 11.5, 16, 16.5}.
- **Baseline (2026-05-28):** confirmed.

### F7 — Shared-engine credit tautology controlled by `hasPlatformEvidence`

- **Claim:** Many cells show coverage > 0 ONLY because shared engines (echo's post-processor family, oscar's SFC stack, kilo's tribal corpus) credit every platform equally. The `hasPlatformEvidence` flag exposes this — cells without the flag have no platform-specific code.
- **Verify via:** count `false` flags per platform in `.matrix.<id>`. Esprit / SolidCAM / PowerMill have 8/10 cells with `hasPlatformEvidence: false` — they're nearly pure-shared-credit ranks.
- **Expected signal:** Mastercam / NX / Fusion 360 = 7/10 `false`; Esprit / SolidCAM / PowerMill = 8/10 `false`.
- **Baseline (2026-05-28):** confirmed.
- **Resolution:** ranking decisions weight `stagesWithPlatformSpecificEvidence` higher than raw `normalizedTotalScore`. The HyperMill / Inventor lead on both metrics is real; the Fusion 360 / Mastercam ranking gap is narrower than the raw score suggests.

## 4. Recommendation — keep direction, sharpen the live-drive layer

- **HyperMill stays as first-choice CAM substrate.** Normalized 92 + 6/10 platform-specific + the in-host live bridge.
- **Fusion 360 is the live-drive platform of choice for CI / batch / cloud workflows.** Socket bridge + Autodesk MCP. **Subject to MISC-305 Tier 2 runtime gate.**
- **Mastercam X8 is the highest-leverage closing gap.** 95+ JM Die programs but zero platform-specific bridge code. `U-MASTERCAM-VBSCRIPT-DRIVE` ships the missing C-Hook + ATP NetHook + VBScript bridge.
- **Inventor HSM is operationally underused.** Score 91 + Autodesk MCP, but **no live socket bridge yet**. `U-INVENTOR-LIVE-DRIVE` would lift it to Fusion-tier operational readiness.
- **The closed-loop self-training pipeline is platform-neutral** — once `U-ADAPTIVE-PIPELINE-ORCH` ships (per `CAM-ADAPTIVE-PIPELINE-DEEP-ASSESSMENT-2026-05-28.md`), self-learning works across every CAM equally. Per-platform corpus priors (`U-PER-CAM-CORPUS-PRIORS`) is the next sharpening pass.

Actionable gap: the outer orchestrator + live-drive playbook + CAD-to-CAM handoff contract — see §6.

## 5. Regressions detected during audit

**One regression class:** my prior `CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md` (this morning) claimed "~70% built" by composition map — without a re-runnable verification channel. This audit replaces that prose figure with the falsifiable normalized scorer baseline. The "70% built" was directionally honest but not verifiable — the same class of regression delta caught in their F2 (unsupported "85%" prose stripped).

CLAUDE.md back-flow line proposed:

> **2026-05-28** | **CAM coverage scorer baseline established** — `state/shared/specs/cam-pipeline-coverage-LATEST.{md,json}` regenerated by `scripts/cam-pipeline-coverage-scorer.mjs` (re-runnable in ~1 sec). Replaces the prose "70% built" CAM assessment with falsifiable per-(platform × stage) normalized scores. HyperMill leads at norm 92 / 6/10 platform-specific stages; Fusion 360 owns live-drive at socket-bridge + Autodesk MCP. observed-in: this commit. Verify: `node scripts/cam-pipeline-coverage-scorer.mjs` and diff against the baseline.

## 6. Compounding-gains tax

META artifact: `scripts/cam-pipeline-coverage-scorer.mjs` (this audit's score producer). 250 LOC. Re-runnable in ~1 sec. Tracks 8 platforms × 10 stages with raw + normalized + bridgeKind + autodeskMcp + `hasPlatformEvidence`. Future audits diff against the baseline and call out any platform whose normalized score moves ≥ 10 points or whose `stagesWithPlatformSpecificEvidence` changes.

**Companion artifacts shipped this audit cycle:**
- `state/shared/specs/cam-pipeline-coverage-LATEST.{json,md}` — the baseline data (scorer output).
- `state/shared/specs/CAM-TEST-PLAYBOOK-2026-05-28.md` — Tier 1-4 live-drive playbook for hyperMILL + Mastercam + Fusion (mirrors delta's `HYPERCAD-TEST-PLAYBOOK-2026-05-20.md`).
- `state/shared/specs/CAD-TO-CAM-HANDOFF-CONTRACT-2026-05-28.md` — mandatory-fields contract delta CAD → kilo CAM (mirrors delta's `PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md`).

## 7. Re-run schedule

7-day cadence (matching delta's CAD cron). Suggested cron entry (operator to install):

```text
# CAM coverage scorer — drift detection
17 9 * * 4 cd H:/prism && node scripts/cam-pipeline-coverage-scorer.mjs > /dev/null 2>&1
```

## 8. Honest caveats

- Coverage = engine-file count + dispatcher-action mentions + test count; measures **breadth of substrate**, NOT runtime correctness. Same caveat delta added in F2 of the CAD audit.
- Normalization caps engine credit per delta's F7; still does not measure integration depth or operator-ready completeness. The CAM-TEST-PLAYBOOK Tier 2 wet-run is the runtime gate.
- F1's runtime caveat means HyperMill's lead is "on paper + in-host bridge file exists"; whether the AC HTTP server serves requests at `:18365` from a real hyperMILL with USB key is unverified by this audit.
- F3's runtime caveat means Fusion 360's socket-bridge advantage is "file exists at :18360 listener address"; runtime probe deferred to Tier 2.
- The `hasPlatformEvidence` flag depends on PRISM file-naming conventions. A platform with engines named generically (e.g., `CamPlugin*.ts` instead of `Mastercam*.ts`) would be under-credited. This is a known limitation — operators should audit per-CAM engine naming.
- Bridge-kind metadata is currently hand-maintained in the scorer's `PLATFORMS` array. When new bridges land (e.g. `U-MASTERCAM-VBSCRIPT-DRIVE`), update the `bridgeKind` field accordingly.

## 9. See also

- `state/shared/specs/cam-pipeline-coverage-LATEST.{json,md}` — baseline data.
- `state/shared/specs/CAM-TEST-PLAYBOOK-2026-05-28.md` — Tier 1-4 live-drive playbook.
- `state/shared/specs/CAD-TO-CAM-HANDOFF-CONTRACT-2026-05-28.md` — handoff contract.
- `state/shared/specs/CAM-ADAPTIVE-PIPELINE-DEEP-ASSESSMENT-2026-05-28.md` — deep assessment behind this audit.
- `state/shared/specs/CAM-VS-CAD-GAP-DIFF-2026-05-28.md` — original gap diff vs delta's CAD methodology (the precursor to this audit).
- `state/shared/specs/CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md` — first MS0 spec.
- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md` — delta's CAD audit (the methodology reference this audit mirrors).
- `state/shared/specs/cad-pipeline-coverage-LATEST.{json,md}` — delta's CAD scorer baseline (sibling).
- `scripts/cam-pipeline-coverage-scorer.mjs` — META artifact (this audit's score producer).
- `scripts/extract-f3d-feature-trees.py` — kilo-authored .f3d → model.sqlite parser; 1640 .f3d files in `JM DIE/FUSION CAD AND CAM FILES/` are CAM-tree-accessible RIGHT NOW (Fusion-extraction-bottleneck workaround).
- `mcp-server/src/engines/InterruptedCutAvoidanceEngine.ts` — first MS0 unit, shipped earlier this session.
- `mcp-server/src/engines/PrintToProgramPipelineEngine.ts` — 2791 LOC, 5-stage existing pipeline.
- `mcp-server/src/engines/MachineCapabilityIntelligenceEngine.ts` — provenance-tagged machine-capability profile (1203 LOC).
- `mcp-server/src/engines/WorkholdingIntelligenceEngine.ts` — 9-fixture-type recommender (499 LOC).

## 10. Peer review pending

Per delta's pattern (CAD audit went FAIL → patch → re-publish), this audit needs the same scrutiny pass. Recommended dispatch:

- **Reviewer A** (code-analyzer subagent): verify scorer methodology + check for unhandled edge cases in `scoreCell` (e.g. when a platform regex matches an engine name partially but the engine is actually for a different platform — false-positive intersect count).
- **Reviewer B** (independent reviewer): cross-check the F1-F7 findings against the JM Die corpus (95+ Mastercam, 31+ hyperMILL, 1640 .f3d Fusion). Verify that the **bridge-kind metadata** in the `PLATFORMS` array matches the actual engines on disk (`Fusion360LiveBridgeEngine`, `HyperMillACBridgeEngine`).

If either reviewer returns FAIL, patch the scorer + re-run + re-publish per delta's example. This audit's directional conclusions should survive peer review (HyperMill #1, Fusion live-drive winner, Mastercam under-bridged) — but the specifics of the per-stage scoring may shift.

## 11. What's NEXT (unit list)

| Unit | Title | Tier | Depends on |
|---|---|---|---|
| `U-ADAPTIVE-PIPELINE-ORCH` | Outer orchestrator wiring all 10 stages | P0 | InterruptedCutAvoidance (✅ shipped) |
| `U-CAM-AUDIT-PEER-REVIEW` | Run §10 peer-review FAIL→patch cycle on this audit | P0 | this audit |
| `U-ADAPTIVE-PIPELINE-WET-RUN` | Drive ONE JM Die program (Hurco-NC OR f3d OR mcx-8) end-to-end through the orchestrator | P0 | ORCH ships |
| `U-MASTERCAM-VBSCRIPT-DRIVE` | Mastercam X8 PRISM bridge via VBScript/C-Hook/ATP NetHook (F2 closes the 95-program corpus gap) | P1 | (parallelizable) |
| `U-INVENTOR-LIVE-DRIVE` | Inventor HSM live socket bridge (F+Autodesk MCP analog of Fusion 360) | P1 | (parallelizable) |
| `U-PER-CAM-CORPUS-PRIORS` | Per-platform bandit posterior tuning using the 1700+ in-house program corpus | P1 | ORCH + WET-RUN |
| `U-F3D-EXTRACT-BATCH-RUN` | Batch-run `extract-f3d-feature-trees.py` against all 1640 .f3d files to populate the Fusion training corpus immediately (does not wait for post-processing) | P0 | (parallelizable, no PRISM deps) |
| `U-FUSION-MISC-305-RESOLVE` | Wet-run :18360 socket handshake test against a real Fusion 360 instance (resolves delta's MISC-305) | P1 | CAM-TEST-PLAYBOOK Tier 2 |

---

**End of audit.** The single highest-leverage next ship is `U-F3D-EXTRACT-BATCH-RUN` (parallelizable, zero PRISM deps, populates the training corpus immediately) — followed by `U-ADAPTIVE-PIPELINE-ORCH` (the bottleneck that converts "we have all the pieces" into "closed-loop self-training is on"). The audit recommends operator triage on whether to ship the orchestrator inline or queue for next /loop.
