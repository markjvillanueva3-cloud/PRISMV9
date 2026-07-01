# CAD Pipeline Audit — 2026-05-20 (AMENDED post peer-review)

> Slot=echo, claude-3db3fb3d, `/forge-audit-v2`. Empirical determination of the
> easiest CAD platform for the print → 3D → hyperMILL → CAM → sim → post →
> setup-sheet → inspection pipeline, with the existing substrate mapped onto
> the user's brief.
>
> **Status: AMENDED 2026-05-20** following peer-reviewer FAIL. F1, F2, F3, F4
> patched; F7 added (peer-reviewer's strongest missed finding). META artifact
> patched to add normalized score and platform-specific-evidence count.
> Verification commands rewritten without bash builtins so they run on the
> project's native PowerShell shell.

## 1. Scope statement

I am auditing **which CAD program is the easiest to drive end-to-end through
PRISM for the print → inspection pipeline**, looking for **the highest-leverage
CAD-platform choice + the smallest gap between today's substrate and the
user's 9-stage brief**. The verification channel is
`scripts/cad-pipeline-coverage-scorer.mjs` (re-runnable, scores every
(platform × stage) cell with both raw and normalized score + a
`hasPlatformEvidence` flag).

## 2. Headline empirical result (normalized, post peer-review)

Re-runnable measure: `node scripts/cad-pipeline-coverage-scorer.mjs`.

| Rank | Platform | Raw | **Normalized** | Plat-specific stages | Bridge kind | Autodesk MCP |
|---|---|---|---|---|---|---|
| 1 | HyperMill (+HyperCAD-S) | 148.25 | **80.25** | 9/9 | in-host | no |
| 2 | Fusion 360 | 107.75 | **51.75** | 9/9 | **socket** | **yes** |
| 3 | Inventor | 107.25 | **51.25** | 9/9 | none | yes |
| 4 | Mastercam | 106.75 | **50.75** | 9/9 | none | no |
| 5 | SolidWorks | 106.75 | **50.75** | 9/9 | none | no |
| 6 | CadQuery (headless STEP) | 81.75 | **25.75** | **1/9** | none | no |

Two columns shifted post-peer-review:
- **Normalized**: caps per-stage engine credit at 5 intersect-engines and 4
  shared-engines (peer reviewer flagged unnormalized score over-credits
  high-engine-count platforms). HyperMill's lead shrank from 41 points raw
  → 29 normalized; the margin to Fusion 360 is still real but smaller.
- **Plat-specific stages**: counts stages with platform-specific evidence
  (a named PrintTo<Platform>Bridge OR an engine matching the platform
  prefix OR a platform-tokened dispatcher action). CadQuery drops from
  "9/9" to **1/9** — exposing that its earlier "100% coverage" was
  tautological under shared-engine credit (peer reviewer's strongest
  missed finding, now surfaced as F7).
- **Bridge kind**: `socket` = TCP/HTTP independent-process driving;
  `in-host` = plugin/automation inside the host app; `none` = no live
  driving. HyperMill's "live bridge" is `in-host` (HyperMillInHostRunnerEngine)
  — peer reviewer flagged this as a category error vs Fusion 360's `socket`
  bridge at `:18360`. Both are useful; they are not equivalent and the
  audit no longer conflates them.

**Decision splits cleanly:**

- **CAD generation from print → Fusion 360.** Highest normalized score
  among platforms with native CAD modeling (51.75); only platform with
  socket bridge AND Autodesk Claude MCP; validated by canonical memory
  `reference_cad_software_pipeline_recommendation`. F1 caveat applies —
  see §3.
- **CAM downstream → keep hyperMILL.** Empirically dominant CAM
  substrate (80.25 normalized) even after the over-credit cap. The lead
  is over CAM stages (CAM_TRANSFER, CAM_PROG, SIMULATE), not CAD_GEN.
- **Headless STEP fast-path → CadQuery is a NICHE, not a peer.** With
  only 1/9 platform-specific stages, CadQuery covers the CAD-script step
  ONLY. Stages 3–9 are reached through generic shared engines, not
  CadQuery-aware ones. It's a Stage-2 fast-path, not a full pipeline.

## 3. Findings (each with verification channel)

### F1 — Fusion 360 leads CAD generation among CAD-modeling platforms (AMENDED → OPEN-QUESTION on runtime)

- **Claim:** Fusion 360 has the highest normalized score among platforms
  with native CAD modeling and is the only platform with a socket-style
  live bridge AND the Autodesk Claude MCP connector.
- **Verify via:** `node scripts/cad-pipeline-coverage-scorer.mjs --json` then read `.totals.fusion360.normalizedTotalScore`, `.bridgeKind`, `.autodeskMcp`
- **Expected signal:** normalizedTotalScore ≥ 50, bridgeKind = "socket", autodeskMcp = true
- **Re-run cost:** ~1 sec
- **Baseline (2026-05-20):** 51.75, "socket", true
- **OPEN-QUESTION (peer-review):** system-viz `MISC-305` flags
  `Fusion360LiveBridgeEngine + PrintToFusion360Bridge appear incomplete`.
  The scorer is a pure static file scan — it does NOT verify runtime
  socket connectivity at `:18360`. The finding is correct directionally
  (Fusion 360 leads on paper), but **operational readiness of the live
  bridge is unverified by this audit**. Resolving MISC-305 (or running
  a live `:18360` handshake test) is the prerequisite for treating F1
  as production-confident.

### F2 — The 9-stage pipeline has full coverage by scorer's static scan; integration completeness is unverified (AMENDED)

- **Claim:** Every CAD platform shows ≥ 1 engine present per stage by the
  scorer's static file scan. `PrintToProgramPipelineEngine` runs a 5-stage
  flow (intake → features → plan → program → validation).
  `PrintToCADOrchestratorEngine` covers print → CAD (5 stages). The gap is
  the unified operator-facing 9-stage composition.
- **Verify via:** `node scripts/cad-pipeline-coverage-scorer.mjs --json` then read `[.totals[].stagesWithEvidence] | min`
- **Expected signal:** ≥ 9
- **Baseline (2026-05-20):** 9
- **AMENDED (peer-review):** the prior version of this finding claimed
  "85% substrate built" as a prose figure not derived from the scorer.
  Removed. The scorer reports **100% stage coverage by static file scan**;
  it does **not** measure integration completeness. The honest claim is
  "every stage has ≥ 1 engine on disk; how well those engines compose
  end-to-end is a separate wet-run question."

### F3 — HyperMill is the dominant CAM substrate, NOT a peer CAD generator (AMENDED)

- **Claim:** HyperMill leads CAM stages (CAM_TRANSFER score=20,
  CAM_PROG=34, SIMULATE=15 — raw; normalized still ranks #1 overall).
  Its 80+ engines drive CAM-side coverage breadth.
- **Verify via:** `node scripts/cad-pipeline-coverage-scorer.mjs --json` then read `.matrix.hypermill.CAM_TRANSFER.score, .matrix.hypermill.CAM_PROG.score, .matrix.hypermill.SIMULATE.score`
- **Expected signal:** all three ≥ 15 (raw)
- **Baseline (2026-05-20):** 20, 34, 15
- **AMENDED (peer-review):** the prior version implied HyperMill's
  in-host runner was a peer to Fusion 360's socket bridge — peer
  reviewer flagged this as a category error. The scorer now tracks
  `bridgeKind` explicitly (`socket` vs `in-host` vs `none`). Both
  enable PRISM-driven automation but with different deployment shapes;
  socket bridges run independent of the host app, in-host runners
  require the host app to be running with the plugin loaded. This
  matters for batch/cloud workflows.

### F4 — 4 named per-machine master post engines exist (AMENDED)

- **Claim:** 4 per-machine master posts on disk:
  `OkumaB250LatheMasterPostEngine`, `OkumaOSPMillMasterPostEngine`,
  `HurcoV11MillMasterPostEngine`,
  `MitsubishiMV1200RWireEDMMasterPostEngine`. Plus the master-post
  family of orchestration engines.
- **Verify via:** see the file list via Glob `H:/prism/mcp-server/src/engines/*MasterPost*.ts`
- **Expected signal:** at least 18 files match the glob (master-post family); exactly 4 are per-machine endpoints
- **Baseline (2026-05-20):** 18 files match the glob; 4 are per-machine endpoints
- **AMENDED (peer-review):** the prior verification command was
  `grep -l MasterPostEngine` which returns 5, not 18 — the baseline and
  the command didn't match. The corrected version uses the broader
  Glob (`*MasterPost*.ts`) for the 18 family count, and the prose
  separates the broad family (18) from the per-machine endpoints (4)
  so the two numbers are explicit, not conflated.

### F5 — CadQuery is the headless fast-path (PASS, unchanged)

- **Claim:** CadQuery is the only platform with zero app/license/UI
  requirement, suitable for batch processing the JM Die archive (24,545
  files). It covers Stage 2 (CAD_GEN) only — see F7.
- **Verify via:** Read `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts` and search for both `cadquery_execute_script` and `blueprint_to_cadquery_script`
- **Expected signal:** both literals present
- **Baseline (2026-05-20):** both confirmed present in `cadDispatcher.ts`

### F6 — Inspection stage has the least per-platform differentiation (PASS, unchanged)

- **Claim:** INSPECTION cell scores 7 across most platforms (4 for
  CadQuery). `FirstArticleInspectionPipelineEngine`,
  `CMMPathPlanningEngine`, `ProbeRoutineGeneratorEngine` are
  platform-agnostic. Inspection logic implements once, reuses for
  every CAD platform.
- **Verify via:** `node scripts/cad-pipeline-coverage-scorer.mjs --json` then read each platform's `.matrix.<id>.INSPECTION.score`
- **Expected signal:** unique values ≤ 2
- **Baseline (2026-05-20):** {4, 7} — CadQuery=4, all others=7

### F7 — Stage coverage by static scan is tautologically true under shared-engine credit (NEW — peer-reviewer's strongest missed finding)

- **Claim:** The scorer's `shared` term credits every platform for any
  engine that doesn't match a platform prefix. This makes 9/9 stage
  coverage trivially true — any stage with one platform-agnostic engine
  (e.g. `PrintReadingEngine`, `ShopConfigurationEngine`, master-post
  engines) shows coverage > 0 for ALL six CAD platforms. CadQuery's
  "9/9 coverage" was vacuous: it has only **1/9 platform-specific
  stages**.
- **Verify via:** `node scripts/cad-pipeline-coverage-scorer.mjs --json` then read each platform's `.totals.<id>.stagesWithPlatformSpecificEvidence` (added 2026-05-20)
- **Expected signal:** CadQuery = 1/9; Fusion / Mastercam / HyperMill / SolidWorks / Inventor = 9/9 (named PrintTo bridges + per-platform CAM/CAD engines)
- **Baseline (2026-05-20):** 1, 9, 9, 9, 9, 9 respectively
- **Resolution:** future ranking decisions should weight
  `stagesWithPlatformSpecificEvidence` higher than `stagesWithEvidence`.
  The scorer's new `hasPlatformEvidence` flag (per-cell) and
  `stagesWithPlatformSpecificEvidence` (per-platform) close the
  tautology.

## 4. Recommendation — keep existing plan, with corrected confidence

Empirically (post-amendment), the existing plan is correct but with
narrower margins than the pre-amendment audit suggested:
- **hyperMILL stays as first-choice CAM.** Normalized score 80.25
  still leads, even after the engine-count cap.
- **Fusion 360 is the right CAD generator.** Normalized score 51.75 ties
  with the other CAD-native peers numerically (within 1 point of Inventor,
  Mastercam, SolidWorks), but wins on TWO tiebreakers nothing else has:
  socket bridge + Autodesk MCP connector. **Subject to MISC-305 resolution
  for production confidence.**
- **CadQuery is a Stage-2 niche fast-path.** Not a full-pipeline peer.

Actionable gap: a single composition engine — spec'd in
`state/shared/specs/PRINT-TO-INSPECTION-PIPELINE-V2.md` (also amended
post peer-review).

## 5. Regressions detected during audit

**One regression class flagged by peer review:** verification commands
in audit documents use the bash `command` builtin (e.g., `command grep`),
which does not exist in PowerShell — the project's native shell. This
audit's prior F4/F5 verification commands would fail on a fresh PowerShell
session. **Fix this session:** all verification commands rewritten using
plain `node ...` invocations and PRISM tool primitives (Read, Glob) that
work in both shells.

CLAUDE.md back-flow line proposed (patch-sibling, since CLAUDE.md is
peer-locked on this shared tree — see
`state/shared/dashboards/patches/CLAUDE-MD-PATCH-cad-pipeline-audit.md`).

## 6. Compounding-gains tax

META artifact: `scripts/cad-pipeline-coverage-scorer.mjs` (this audit's
score producer). Patched 2026-05-20 to add normalized score, bridge-kind,
platform-specific-evidence tracking. Re-runnable in ~1 sec. Baseline at
`state/shared/specs/cad-pipeline-coverage-LATEST.{md,json}`. Future
audits diff against this baseline and call out any platform whose
NORMALIZED score moves ≥ 10 points or whose
`stagesWithPlatformSpecificEvidence` changes.

## 7. Re-run schedule

7-day cadence — cron job 61361ec9, every Thursday 09:17 local, durable.

## 8. Honest caveats

- Coverage score = engine-file count + dispatcher-action mentions + test
  count; it measures **breadth of substrate**, NOT runtime correctness.
- The normalized score caps engine-count credit; it still does not
  measure integration depth or operator-ready completeness. A wet-run
  pipeline test against real JM Die prints is the next step — out of
  scope for this audit.
- F1's runtime caveat (MISC-305) means the Fusion 360 lead is "on paper
  +socket bridge file exists"; whether the bridge serves requests at
  `:18360` is unverified.
- The HyperMill engine count includes `HyperCAD-S` engines (6) under the
  `/^Hyper(Mill|CAD)/` regex. Splitting them changes HyperMill's
  CAD_GEN score very little (HyperCAD-S has 6 engines vs HyperMill's
  80+); the overall CAM-dominance verdict survives.
- "Autodesk MCP" benefit assumes the official Autodesk Claude connector
  (released 2026-04-28) is reachable. PRISM's own
  `AutodeskFusionMCPProxyEngine` is the JSON-RPC client for it.

## 9. See also

- `state/shared/specs/PRINT-TO-INSPECTION-PIPELINE-V2.md` — pipeline spec (also amended post peer-review)
- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.html` — HTML companion
- `state/shared/specs/cad-pipeline-coverage-LATEST.{json,md}` — baseline data
- `state/shared/dashboards/patches/CLAUDE-MD-PATCH-cad-pipeline-audit.md` — regression back-flow patch sibling
- `knowledge/memories/reference/reference_cad_software_pipeline_recommendation.md` — canonical PRISM CAD recommendation
- `scripts/cad-pipeline-coverage-scorer.mjs` — META artifact (peer-review-patched)

## 10. Peer review verdicts and resolutions (2026-05-20)

Reviewer agent ae9df739c4735b122 returned **OVERALL FAIL** on the original
audit. Resolutions per finding:

| Finding | Original verdict | Resolution |
|---|---|---|
| F1 | FAIL — overstated, MISC-305 contradicts | Downgraded to OPEN-QUESTION; MISC-305 explicitly noted; framing is "leads on paper, runtime unverified" |
| F2 | PASS with caveat — "85%" unsupported | Removed the unsupported 85%; replaced with grounded scorer language (100% by static scan, integration completeness unverified) |
| F3 | OPEN-QUESTION — in-host runner ≠ socket bridge | Scorer now tracks `bridgeKind` explicitly (socket/in-host/none); audit no longer conflates them |
| F4 | FAIL — verification returned 5, claimed baseline 18 | Verification command changed to Glob `*MasterPost*.ts` (matches 18); prose separates family (18) from per-machine endpoints (4) |
| F5 | PASS | Unchanged |
| F6 | PASS | Unchanged |
| (F7) | Strongest missed finding | Added: scorer's shared-engine term made 9/9 coverage tautological. New `stagesWithPlatformSpecificEvidence` metric exposes the truth (CadQuery = 1/9). |
| META — no normalization | FAIL | Added `normalizedTotalScore` (caps engine-count credit); ranking now uses normalized |
| META — verification commands use bash `command` builtin | FAIL | All verification commands rewritten to plain `node ...` / Read / Glob primitives that work in PowerShell |
| V2 — GD&T propagation gap | Valid composition bug | Addressed in V2 spec amendment (Stage 2→3 side-channel) |
| V2 — Stage 4 safety gate downgrade | Valid safety bug | V2 spec amended: HARD BLOCK on envelope mismatch |
| V2 — inspection table missing surface plate / height gauge / optical comparator | Valid metrology gap | V2 spec amendment expands the routing table |
| V2 — delta under-scoped | Valid scope honesty | V2 spec re-labels delta as "net-new orchestration" not "composition only" |

After resolutions, the audit's directional conclusions stand but the
confidence framing is more honest. The V2 spec amendments address all
composition-bug critiques.
