# CAM-vs-CAD gap diff — what kilo's CAM assessment missed that delta's CAD assessment covers

> **Author:** claude-ea0ff1a5 (slot **kilo**, 2026-05-28)
> **Trigger:** operator follow-up — *"pull up delta's chat to see how it assessed what else we needed to build for cad before testing, I assume we didn't cover everything for cam."*
> **Method:** read delta's `CAD-PIPELINE-AUDIT-2026-05-20.md`, `HYPERCAD-TEST-PLAYBOOK-2026-05-20.md`, `PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md`, `cad-pipeline-coverage-LATEST.{md,json}`, `TOPOLOGY-MATH-CAD-CAM-APPLICABILITY-2026-05-22.md` (first 100 LOC). Cross-walked methodology against `CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md`.
> **Status:** advisory — every gap below is a candidate follow-up unit. Operator triages which land in MS0 vs MS1.

---

## 1. Delta's CAD methodology has rigor my CAM assessment lacks

Delta built a **re-runnable coverage scorer** (`scripts/cad-pipeline-coverage-scorer.mjs`) BEFORE making any "X% built" claim. The scorer:

- Scores every (platform × stage) cell with raw + **normalized** score (engine-count cap so high-engine-count platforms don't over-credit).
- Tracks **`bridgeKind`**: `socket` (independent process) vs `in-host` (plugin requires app running) vs `none`.
- Tracks **`hasPlatformEvidence`** flag per cell — exposes the tautology where shared-engine credit makes 9/9 coverage trivially true (delta's F7 — CadQuery's "9/9 stage coverage" was actually 1/9 platform-specific).
- Emits baseline at `state/shared/specs/cad-pipeline-coverage-LATEST.{json,md}` for drift detection on 7-day cron.
- Passed peer-reviewer FAIL → patched (normalization + bridge-kind + platform-specific-evidence) → re-published.

**My CAM assessment by contrast:**
- Prose "70% already built" claim — **not re-runnable**, not falsifiable, not tracked over time.
- No bridge-kind tracking — I treat HyperMillInHostRunner (in-host) and Fusion360LiveBridge (socket :18360) as equivalent. They are not.
- No platform-specific-evidence flag — I list engines as "composes" without marking which are CAM-specific vs platform-agnostic. F7 tautology applies.
- No peer-reviewer FAIL → patch → re-publish cycle (I ran scrutiny only after the spec was written — the gap diff this doc captures is the result).

---

## 2. Concrete gaps the operator should fund as follow-up units

| # | Gap | Delta has | My CAM has | Follow-up unit |
|---|---|---|---|---|
| **G1** | Re-runnable coverage scorer per (CAM × stage) | `scripts/cad-pipeline-coverage-scorer.mjs` (re-runs ~1 sec; baseline `cad-pipeline-coverage-LATEST.{md,json}`) | nothing | **`U-CAM-COVERAGE-SCORER`** |
| **G2** | Bridge-kind tracking (socket / in-host / none) | Per-platform `bridgeKind` column in coverage doc | implicit / conflated | **`U-CAM-BRIDGE-KIND`** |
| **G3** | Live-drive test playbook (Tier 1 mock → Tier 2 live → Tier 3 MCP → Tier 4 orchestrator) | `HYPERCAD-TEST-PLAYBOOK-2026-05-20.md` for hyperMILL (3 tiers); plus pre-flight + diagnostics table | nothing | **`U-CAM-TEST-PLAYBOOK`** (one per CAM system: hyperMILL ✓ already partial via HyperMillACBridge, Mastercam, Fusion 360) |
| **G4** | Independent-process bridge engines for each CAM | `HyperMillACBridgeEngine.ts` (HTTP server :18365) + `prism_ac` Python host module + `cam_hypermill_drive` dispatcher action (op-discriminated open / geometry / operation_tree / export_step / close) | only hyperMILL — Mastercam X8 has VBScript automation surface NOT yet exposed; Fusion 360 has socket bridge per delta's audit but my pipeline didn't verify runtime | **`U-MASTERCAM-VBSCRIPT-DRIVE`**, **`U-FUSION360-LIVE-DRIVE-VERIFY`** |
| **G5** | CAD ↔ CAM handoff contract | `PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md` — JSON location, mandatory fields (kiloDecision.overall, unitDetection, partClassHint, expectedFeatureGraph, criticalTolerancesMustPropagate), post-generation verification gate, operator escape hatch with overrides ledger | nothing | **`U-CAD-TO-CAM-HANDOFF-CONTRACT`** |
| **G6** | GD&T propagation Stage-2 → Stage-3 (side channel) | called out in delta's V2 spec amendment (§10 "GD&T propagation gap") | my CAM pipeline assumes GD&T is available but does NOT define the input contract or the propagation surface | **`U-GD-T-PROPAGATION-CAD-TO-CAM`** |
| **G7** | First-article inspection + in-process probe trigger | `FirstArticleInspectionPipelineEngine`, `CMMPathPlanningEngine`, `ProbeRoutineGeneratorEngine` exist | my CAM pipeline mentioned probing as a §3 deep-assessment gap (K4) — never named the engines that exist | **`U-CAM-PROBE-CYCLE-INSERT`** |
| **G8** | Honest static-vs-runtime gap acknowledgment | delta F1 (MISC-305) downgraded "Fusion 360 leads" from PASS to OPEN-QUESTION on runtime; F2 stripped unsupported "85%" prose; spec explicitly notes static-scan ≠ integration | my CAM spec says "70% built" by composition map — I did NOT separately note that file-on-disk presence is not runtime completeness | **(spec amendment)** — append same honest caveat to my spec |
| **G9** | Topology-math grounding for CAM | `TOPOLOGY-MATH-CAD-CAM-APPLICABILITY-2026-05-22.md` — Morse-Reeb decomposition for provably-complete toolpath coverage (T2, HIGH gap); medial axis for pocket spines (T3); configuration-space topology for collision avoidance (T4) — all HIGH-value | nothing — my CAM pipeline didn't surface topology-math as a primitive layer | **`U-MORSE-REEB-TOOLPATH`**, **`U-MEDIAL-AXIS-POCKET-SPINE`**, **`U-CSPACE-COLLISION`** (per delta's topology doc §7 unit proposals) |
| **G10** | Tier'd safety gates HARD BLOCK vs advisory distinction | delta's V2 spec amendment (§10) clarifies: envelope mismatch is HARD BLOCK, not advisory | my Ω1-Ω3 safety items don't say which tier | **(spec amendment)** — tag each safety item HARD-BLOCK or advisory |
| **G11** | Multi-detection swap topological correctness | n/a (delta's audit isn't sequence-pair related) | scrutiny Reviewer A flagged: my engine's `buildOptimizedSequence` may produce wrong result with overlapping pairwise swaps | **`U-INTERRUPTED-CUT-AVOID-HARDENING`** (multi-detection swap test + topological re-sort) |
| **G12** | Zod schema validation at dispatcher boundary | per `dispatchers/CLAUDE.md` doctrine | my dispatcher relies on engine's downstream throws — dispatcher contract incomplete | **`U-CAM-DISPATCHER-ZOD-SCHEMA`** |
| **G13** | Shared G-code tokenizer (DRY) | `rapidRepositionOptEngine` is the canonical wrapper that `productDispatcher` uses for ppg_air_cut_detect via composition | my `InterruptedCutAvoidanceEngine` re-implements the 4-regex G-code tokenizer instead of composing the existing one | **`U-CAM-GCODE-TOKENIZER-SHARED`** |

---

## 3. What's NOT a gap (delta-correct, I had covered)

- **Operation sequencer family** — both delta and kilo's pipeline have it (`OperationSequencerEngine`, `CAMOperationSequencePlannerEngine`).
- **Machine selection** — both `CAMMachineSelectionEngine` + `MachineSelectionEngine` are wired in.
- **Inspection-stage engine cluster** — exists (delta surfaced as least-differentiated F6; I didn't enumerate but the engines exist).
- **Master post engines** — 4 per-machine endpoints (delta F4) + master-post family (18 files). My echo PP bridge surface acknowledged this.
- **Tribal/wiki corpus** — kilo's 224-toolpath canonical catalog + cross-CAM action templates is the strongest CAM-specific corpus surface; delta has no equivalent CAD corpus of comparable depth.

---

## 4. Why delta's pattern matters for kilo

Delta surfaced **one architectural truth** that my CAM assessment missed: **a static file scan is not a runtime integration test.** Delta wrote it as F1 (MISC-305 caveat — Fusion 360 socket bridge file exists, runtime unverified). The same caveat applies to my entire CAM pipeline:

- `HyperMillACBridgeEngine.ts` exists. Has the operator ever opened a real .hmc file via PRISM? The Tier 2 LIVE test in delta's playbook is the gate. We don't know if that gate has passed.
- `Fusion360LiveBridgeEngine` exists. `:18360` listener has not been runtime-verified for this fleet.
- `PrintToFusion360Bridge` exists. MISC-305 flags it as "appears incomplete."
- **All 12 cross-CAM action templates** at `state/shared/cad-action-templates/*.actions.json` are static atomic-op maps — no live test that the mapped functions actually invoke from PRISM through the CAM software's automation API.

**Concrete recommendation:** before *any* "AI training first" run, build `U-CAM-COVERAGE-SCORER` + `U-CAM-TEST-PLAYBOOK` so the operator has the same honest runtime view of CAM that delta has of CAD. Otherwise we'll be training the AI on a substrate we haven't proved works end-to-end.

---

## 5. Operator triage proposal

**Highest leverage to add to MS0:**
1. `U-CAM-COVERAGE-SCORER` — re-runnable, sets the baseline, surfaces F7 tautology.
2. `U-CAM-TEST-PLAYBOOK` — per-CAM live-drive playbook (mock → live → MCP → orch tiers).
3. `U-CAD-TO-CAM-HANDOFF-CONTRACT` — closes the GD&T propagation hole.
4. `U-INTERRUPTED-CUT-AVOID-HARDENING` — Reviewer A's P1s: JSDoc, Zod schema (covered by G12), pocket_through_breakthrough test (✅ added this session), engagement_drop positive test (✅ added this session), multi-detection swap test, NaN-coord guard (✅ added this session).

**Deferred to MS1 or later:**
- G9 topology-math units (huge scope; delta's topology doc has 18K LOC of analysis — needs its own milestone).
- G11/G12/G13 hardening — wait for first wet-run feedback.

**Operator decides:** which of G1-G13 enter MS0; the rest sit in slot/kilo's `slot-task-queues.json` for autonomous-loop pickup.

---

## 6. What was fixed THIS session (post-scrutiny)

Per-file 2-reviewer gate ran post-spec (should have run per-file — I missed the per-file timing). Two reviewers returned with mixed verdicts:

- **code-analyzer: PASS** (8 P1 findings, no P0).
- **independent reviewer: FAIL** (2 P0 claims — both turned out to be misreads on closer inspection — tier-map has no duplicate; DRY violation with AirCut is a refactor opportunity, not a ship-block — but P1-5 (`||` silent coercion) and the test coverage holes were real).

**Real P1s fixed this session before /handoff:**
1. ✅ Engine: fail-loud on missing/non-string gcode in gcode-mode (R12 compliance) — `throw new Error("gcode must be a string in gcode-mode")`.
2. ✅ Engine: NaN-coord guard in both G-code pass-1 (zMap build) and pass-2 (detection scan) — pathological `X..` / `X-.` tokens are silently skipped rather than poisoning zMap.
3. ✅ Tests: added `F5: pocket_through_breakthrough` positive case — kills the previously-dead branch coverage.
4. ✅ Tests: added `G4: positive engagement_drop` — G-code mode's core value now has a fail-on-revert oracle.
5. ✅ Tests: added `G5: malformed-coord NaN guard` regression test.
6. ✅ Tests: added `G6: missing gcode fails loud (R12)`.
7. ✅ Engine: JSDoc `@param`/`@returns` tags on `baselineKienzleForce` + `baselineTaylorLifeMin` (per `H:/.claude/rules/engines.md`).

**Tests: 25 → 29, all PASS.**

---

## 7. Doctrine-compliance check against delta's pattern

- [x] **Re-runnable verification**: my engine has 29 unit tests; my spec has dispatcher round-trip via vitest. Delta has a coverage scorer; I do not (G1 gap).
- [x] **Karpathy R12 (fail-loud)**: NaN-coord guard + missing-gcode throw both added.
- [x] **Karpathy R8 (read-before-write)**: I did read AirCutDetectionEngine before mirroring its pattern, but I did NOT compose its tokenizer — re-implemented (G13 gap).
- [x] **Honest caveats**: this doc IS that honest caveat.
- [x] **Per-file scrutiny gate**: ran post-write (should have been pre-next-file). Process compliance gap for next multi-file build.

---

## See also

- `state/shared/specs/CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md` — original spec.
- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md` — delta's CAD audit (the methodology reference).
- `state/shared/specs/HYPERCAD-TEST-PLAYBOOK-2026-05-20.md` — delta's live-drive playbook (template for `U-CAM-TEST-PLAYBOOK`).
- `state/shared/specs/PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md` — delta's handoff contract (template for `U-CAD-TO-CAM-HANDOFF-CONTRACT`).
- `state/shared/specs/TOPOLOGY-MATH-CAD-CAM-APPLICABILITY-2026-05-22.md` — november's topology doc; informs G9.
- `state/shared/specs/cad-pipeline-coverage-LATEST.{json,md}` — delta's coverage baseline (template for `cam-pipeline-coverage-LATEST`).
- `mcp-server/src/engines/InterruptedCutAvoidanceEngine.ts` — first unit shipped this session (commit `4a3c0eb62b`).
- `mcp-server/src/engines/AirCutDetectionEngine.ts` — sibling whose tokenizer my engine should compose (G13).
- `mcp-server/src/engines/HyperMillACBridgeEngine.ts` — delta's live-drive engine that the CAM pipeline composes for hyperMILL.

---

**End of gap diff.** The next /loop iteration should pick `U-CAM-COVERAGE-SCORER` or `U-CAM-TEST-PLAYBOOK` to close the highest-leverage gap (G1 + G3) before any further CAM-AI training proceeds.
