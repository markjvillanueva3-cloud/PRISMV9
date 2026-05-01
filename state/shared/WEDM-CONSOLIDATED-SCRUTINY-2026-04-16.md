# WEDM-CONSOLIDATED Roadmap — Stage 10 Scrutiny Log (2026-04-16)

**Roadmap under review:** `state/shared/WEDM-CONSOLIDATED-ROADMAP.md` v1.1.0
**Scrutiny pipeline:** `/rgs` Stage 10 (10-agent parallel review)
**Pass threshold:** average ≥ 80, no dimension < 40, any dimension < 70 triggers fix pass.

---

## Scoring Summary

| Agent | Dimension | Pre-fix | Post-fix | Δ |
|-------|-----------|---------|----------|----|
| 1 | Protocol Structure | 74 | 84 | +10 |
| 2 | Unit Naming | 92 | 92 | 0 |
| 3 | Dependency Graph | 78 | 86 | +8 |
| 4 | Exit-Gate Rigor | 68 | 83 | +15 |
| 5 | Completeness Coverage | 92 | 92 | 0 |
| 6 | Physics Rigor | 58 | 82 | +24 |
| 7 | Forge-Triple Ownership | 79 | 88 | +9 |
| 8 | Feature Cascade | 86 | 88 | +2 |
| 9 | MCP Utilization | 82 | 85 | +3 |
| 10 | Cross-Roadmap Coherence | 84 | 88 | +4 |
| — | **Average** | **79.3** | **86.8** | **+7.5** |

**Pre-fix verdict:** CONDITIONAL (avg 79.3; Physics 58 and Exit-Gate 68 both < 70).
**Post-fix verdict:** PASS (avg 86.8; no dimension < 80; zero dimensions < 70).

---

## Agent 1 — Protocol Structure (74 → 84)

**Pre-fix defects:**
- 4-LOOP not expanded per unit in P4/P5/P7/P9/P10 — units inherited by reference instead of listing BUILD → SCRUTINIZE → GAP FILL → TIE UP per unit.
- Rollback blocks absent on P4/P5/P9 units.
- Multi-session milestones (MS-P2, MS-P3-TIER6A, MS-P3-TIER6B, MS-P4-DL-CORE, MS-P5-GNN, MS-P6, MS-P9-WIRE, MS-P10) not split into `SESSION [N]:` sub-blocks.
- `/compact checkpoint` markers not inserted at the 3-unit cadence the RGS spec requires.

**Fixes applied:**
- Session splits declared in MS-P3-TIER6B, MS-P4-DL-CORE, MS-P4-DL-PRED, MS-P5-GNN, MS-P6-VAL30, MS-P9-WIRE, MS-P10-V2LAUNCH.
- Per-unit `FILES_CREATED / FILES_MODIFIED / ABORT / ROLLBACK / EXIT` inlined for U-P1-01/02/03/04, U-P3-T6A-01..07, U-P3-T6B-01..07, U-P4-DL-01..05, U-P4-PR-01..04, U-P5-GNN-01, U-P9-WIRE-01..10, U-P9-INT-01.
- `/compact checkpoint` inserted after every 3-unit block in multi-session milestones.

---

## Agent 2 — Unit Naming (92 → 92, PASS, no fix)

All 112 unit IDs follow `U-{PREFIX}{NN}` convention with zero collisions (verified by grep).

---

## Agent 3 — Dependency Graph (78 → 86)

**Pre-fix defects:**
- Claim `(P4 tail, P6 head)` parallelizable was FALSE — P5 sits between P4 and P6 on the DAG.
- P1 `available_to` listed only [P2, P3, P4, P6, P10] — understated, because `wedm-synthetic-block` hook enforces phase-wide.
- Section 4 ASCII DAG missed P3→P6 and P5→P6 edges.

**Fixes applied:**
- Parallelization claim corrected to `(P4 tail, P5 head)` in §1 Stage 5 and §4.
- P1 `available_to` expanded to `[P2..P10]`.
- §4 DAG redrawn to include P3→P6 and P5→P6 edges; parallelization footnote added.

---

## Agent 4 — Exit-Gate Rigor (68 → 83)

**Pre-fix defects:**
- ≈ 78 % of units inherited exit criteria by reference rather than listing ≥ 3 measurable EXIT items inline.
- `> 3 TS errors` ABORT phrasing was non-specific — not a runnable command.
- ±20 % NC-line-count tolerance in MS-P3-TIER6A was too loose (line count drifts with comment density).
- Fold units U-P1-02/03/04 lacked byte-identical regression gate.
- Machinist-acceptance not required for MS-P2, MS-P3-TIER6A/B, MS-P6, MS-P8, MS-P9.
- Banned-pattern list (no `toBeGreaterThan(0)`, no bare `.includes()`, no ±250 % tolerances) not explicitly enforced.

**Fixes applied:**
- ≥ 3 measurable EXIT items inlined per unit across U-P1-01..04, U-P3-T6A-01..07, U-P3-T6B-01..07, U-P4-DL-01..05, U-P4-PR-01..04, U-P5-GNN-01, U-P9-WIRE-01..10, U-P9-INT-01.
- ABORTs replaced with specific commands: `npx tsc --noEmit returns > 0 errors`, `atomic-value-gate hook rejects`, `wedm-predictor-mae-gate returns fail`, etc.
- ±20 % NC-line-count tightened to ±10 % toolpath-length-mm + G-code structural `toContain('G41')`/`toContain('M00')` assertions.
- SNAPSHOT-DIFF protocol added to U-P1-02/03/04 — bit-exact output across 20 canonical inputs, logged to `data/state/WEDM_FOLD_SNAPSHOT_DIFF.json`.
- Machinist-acceptance clauses added to MS-P2, MS-P3-TIER6A/B, MS-P6, MS-P8, MS-P9.
- `banned-pattern-block` POST-LEVEL hook added to §6 enforcement.

---

## Agent 5 — Completeness Coverage (92 → 92, PASS, no fix)

All 6 WEDM tracks (WEDM-100PCT, WEDM-GAPFILL, WEDM-LAUNCH, WEDM-UNIFIED, WEDM-AGI P1-P4, CAMX-V17-P9) are accounted for. All seven root gaps G1-G7 are mapped to phases P1-P9.

---

## Agent 6 — Physics Rigor (58 → 82)

**Pre-fix defects (machinist-safety severity):**
1. Wire deflection formula written as `F·L²/(8T)` in §5 MS-P1 KNOWLEDGE — wrong for distributed load (uses F not q) and wrong for point load (should be `F·L/(4·T)` not `F·L²/(8·T)`).
2. `Johnson-Cook (PCD conductivity branch)` in §5 MS-P3-TIER6B FORMULAS — Johnson-Cook is a plasticity model, NOT a thermal-conductivity model. PCD k(T) requires ASM Handbook Vol. 16 or Field 1992 interpolation.
3. `WEDMRLPolicyEngine (508 LOC)` cited in §5 MS-P4-DL-CORE KNOWLEDGE — engine does not exist in `src/engines/`; the WEDM_RL_POLICY v1 state file exists but there is no corresponding engine class.
4. Fold units U-P1-02/03/04 lacked SNAPSHOT-DIFF protocol — replacing engines without bit-exact regression is unsafe.
5. AtomicValue enforcement not hooked — `WireEDMSettingsEngine.compute()` returns bare numbers for `first_cut_speed_mm_per_min` et al, violating the `{value, unit, uncertainty, source}` mandate.
6. `/physics-verify` skill not wired into MS-P1, MS-P6, MS-P10 SKILLS lines despite being the canonical physics-rigor invocation.
7. Puertas & Luis 2003 cited for WEDM Ra — but that paper is sinker-EDM. Correct WEDM Ra regression is Puri & Bhattacharyya 2003.
8. Typo `EDMPrefightSafetyEngine` in §1 Stage 3 (should be `Preflight`).

**Fixes applied:**
1. §1 Stage 3 P1 row and §5 MS-P1 KNOWLEDGE — wire deflection corrected to `δ = q·L²/(8·T)` (distributed) or `δ = F·L/(4·T)` (midspan point load) per Dauw & Snoeys 1986 *CIRP Annals*.
2. §5 MS-P3-TIER6B FORMULAS — replaced with `modified thermal-conductivity k(T) interpolation for PCD per ASM Handbook Vol. 16, p. 317; diamond-Co composite rule-of-mixtures per Field 1992`.
3. §5 MS-P4-DL-CORE KNOWLEDGE — `WEDMRLPolicyEngine (508 LOC)` struck; replaced with `WEDM_RL_POLICY v1 state snapshot (LinUCB bandit)` which is the real artifact.
4. SNAPSHOT-DIFF protocol inlined in U-P1-02/03/04 — 20 canonical inputs, bit-exact output, logged to `WEDM_FOLD_SNAPSHOT_DIFF.json`, ABORT on any non-bit-exact output.
5. §6 enforcement — `atomic-value-gate` POST-LEVEL hook added, blocks bare-number returns.
6. `/physics-verify` added to MS-P1/P6/P10 SKILLS lines.
7. §1 Stage 3 P1 row — Puri & Bhattacharyya 2003 replaces Puertas & Luis; Puertas & Luis flagged inline as sinker-EDM (do not cross-apply).
8. §1 Stage 3 P2 row — typo fixed.

Citations upgraded with year + journal + page for Klocke, DiBitonto, Kunieda, Carslaw & Jaeger, Sato, Puri & Bhattacharyya, Dauw & Snoeys.

---

## Agent 7 — Forge-Triple Ownership (79 → 88)

**Pre-fix defects:**
- MS-P3-TIER6B, MS-P4-DL-PRED, MS-P9-WIRE, MS-P9-INT lacked forge-triples — violates "every milestone ships one hook + one action + one skill" rule.
- `wedm_verify_quality` and `/wedm-validate` appeared CONSUMED by MS-P6 but were never BUILT anywhere — phantom declarations from WEDM-UNIFIED M6 pull-in.
- §7 table missing 15 ownership rows.
- P7 FEATURE CASCADE still listed "consumed from WEDM-UNIFIED envelopes" in `new_*` lines — should be empty `[]` when CONSUMED.

**Fixes applied:**
- `wedm-pcd-conductivity-gate` + `prism_edm:wedm_validate_pcd` + `/wedm-pcd` — BUILT in MS-P3-TIER6B U-P3-T6B-05.
- `wedm-predictor-mae-gate` + `prism_edm:wedm_predict_ra` + `/wedm-predict` — BUILT in MS-P4-DL-PRED U-P4-PR-01..04.
- `wedm-ui-mock-block` + `prism_edm:wedm_ui_action_ping` + `/wedm-wire` — BUILT in MS-P9-WIRE U-P9-WIRE-01/10.
- `wedm-e2e-ci-gate` + `prism_edm:wedm_e2e_report` + `/wedm-e2e` — BUILT in MS-P9-INT U-P9-INT-01.
- `wedm_verify_quality` and `/wedm-validate` — BUILD ownership claimed by MS-P6-VAL30 (prior WEDM-UNIFIED M6 only DECLARED them).
- P7 FEATURE CASCADE `new_*` set to `[]`; §7 table extended with 15 rows.

**Double-claim check (post-fix):** grepped every `new_hooks`, `new_actions`, `new_skills` entry across 18 milestones — zero duplicates.

---

## Agent 8 — Feature Cascade (86 → 88)

**Pre-fix defects:**
- P7 cascade listed "(consumed from WEDM-UNIFIED envelopes)" in `new_hooks`/`new_actions`/`new_skills` — should be `[]` to match single-ownership rule.
- §7 metrics table counts did not reconcile with §7 ownership table after forge-triple fixes.

**Fixes applied:**
- P7 cascade normalized to `[]` for all three `new_*` fields.
- §7 metrics table counts rebuilt; built-artifact totals line added.

---

## Agent 9 — MCP Utilization (82 → 85)

**Pre-fix defects:**
- Phantom skills cited: `/graph-neighbor` (does not exist) and `/wedm-validate` (not yet built when cited in MS-P6).
- `/scope` missing from MS-P1, MS-P2, MS-P3-TIER6B, MS-P6, MS-P10.
- `/checkpoint` missing from multi-session milestones.
- MS-P3-TIER6B PLUGINS/MCP_LIFECYCLE were "(same as TIER6A)" shortcut — should be expanded.

**Fixes applied:**
- `/graph-neighbor` replaced with `/wedm-reason` (actual built skill) in MS-P5-GNN SKILLS.
- `/wedm-validate` BUILD ownership claimed in MS-P6 so the CONSUMED reference resolves.
- `/scope` added to MS-P1/P2/P3-TIER6B/P6/P10 SKILLS.
- `/checkpoint` added to multi-session milestones.
- MS-P3-TIER6B SKILLS/PLUGINS/MCP_LIFECYCLE fully expanded with session-split block.

---

## Agent 10 — Cross-Roadmap Coherence (84 → 88)

**Pre-fix defects:**
- `CAMX-V17-P9` (40 units) still marked active in `roadmap-index.json` despite its Tier-6 scope being absorbed by MS-P3-TIER6A (14 units) — risks concurrent-modification collision across chat sessions.
- `BASELINE_INVENTORY.json` re-verification not listed as an EXIT requirement on phases P1, P4, P5, P10 — count drift won't surface.

**Fixes applied:**
- U-P0-V04 added to MS-P0: mark CAMX-V17-P9 `status: "DEPRECATED"`, add `superseded_by: ["MS-P3-TIER6A", "MS-P3-TIER6B"]`, write mapping table to `state/shared/CAMX-V17-P9-MIGRATION.md`.
- BASELINE_INVENTORY re-verification added to EXIT GATE of P1, P4, P5, P10.

---

## Outstanding (tracked separately)

1. Write milestone envelope JSONs under `mcp-server/data/milestones/` for MS-P0-V, MS-P1-100PCT, MS-P3-TIER6A, MS-P3-TIER6B, MS-P4-DL-CORE, MS-P4-DL-PRED, MS-P5-GNN, MS-P8-FEBE, MS-P9-WIRE, MS-P9-XAI, MS-P9-INT, MS-P10-V2LAUNCH.
2. Add entries to `mcp-server/data/roadmap-index.json` for each new milestone.
3. Mark `CAMX-V17-P9.json` as DEPRECATED in its envelope header (runs during U-P0-V04).

---

## Re-run schedule

- **MS-P10-V2-04 smoke test** re-runs the 10-agent scrutiny against the final roadmap + accumulated artefacts. Any dimension regressing below 80 blocks V2 launch via `wedm-v2-scope-gate`.

---

**Scrutiny file end. Roadmap v1.1.0 status: PASS (avg 86.8).**

---

## ROUND 4 — Print→CNC One-Shot Readiness (2026-04-16, v1.2.0 patch cycle)

**Trigger:** PRISM-INVENTORY-2026-04-15.md refresh + user directive: *"we're promising print to cnc program in one shot. we need extreme level of intelligence and coordination for this."*

Round 4 scrutiny is scope-orthogonal to Round 3. Round 3 graded the roadmap as a document (structure / citations / DAG / ownership). Round 4 grades whether the roadmap — if executed — actually delivers the print→CNC one-shot promise with deep-learning / deep-logic / deep-reasoning / near-AGI coordination.

**Three convergent-evidence agents** executed in parallel; all three reached independent BLOCK verdicts.

### Agent A — goal-planner (12-stage Print→CNC coverage)

**Score:** 0.47 / 1.0 — NO-GO
**Method:** GOAP precondition graph over 12 pipeline stages (S1 ingestion → S2 geometry → S3 PMI → S4 feature recognition → S5 process selection → S6 fixture → S7 strategy → S8 toolpath → S9 verification → S10 post → S11 simulation → S12 provenance).
**Key findings:**
- **AutoPrintToProgramBridgeEngine has ZERO wire-EDM references** (grep `wire_edm|WEDM|edm` against `src/engines/AutoPrintToProgramBridgeEngine.ts` returns 0 matches). The platform's one-shot entry point cannot route to WEDM at all.
- DWG import missing (only DXF supported); STEP AP242 PMI extraction missing.
- Controller dialects: only Mitsubishi (PPWireEDMPostEngine). Sodick / Makino / AgieCharmilles / Fanuc ROBOCUT absent.
- Wire-path collision detection missing entirely.
- Program verification (G41/G42 pairing, M02/M30, unit consistency) missing.

**Closure requires:** 7 new units spanning ~2,480 LOC → see MS-P1.5-ONESHOT.

### Agent B — collective-intelligence-coordinator (Synergy axis)

**Score:** 0.20 / 1.0 — BLOCK
**Method:** Measured 8 synergy axes: {Reasoning→Execution coupling, Awareness middleware adoption, Cross-engine working memory, Tribal knowledge propagation, ReasoningTraceLedger presence, Neural↔formula fusion, Multi-agent orchestration, Feedback loop closure}.
**Key findings:**
- **0 of 87 dispatchers invoke consultAwareness** — the middleware exists (`awarenessMiddleware.ts`, 30s cache, fails-open, <50ms budget) but is orphan.
- Reasoning traces are NOT persisted — each chat starts from zero memory of prior reasoning.
- **4,493 tribal tips unused at runtime** — they exist in corpus files but no engine performs runtime similarity lookup during parameter recommendation.
- **26 of ~2,500 JM Die WEDM programs indexed** (99% of archive unused as training signal).
- LoRA weights are raw JSON — no `.onnx` bridge, no ModelRegistryEngine integration.
- PRISMCreativeReasoningEngine.explore() output is not routed to execution; it terminates in logs.
- No cross-engine working memory / blackboard — engines cannot hand intermediate state to each other without full re-computation.

**Quote:** *"The 2,114 engines are a capability surplus masquerading as intelligence. The ceiling isn't math — it's the lack of a shared cognitive substrate."*

**Closure requires:** 8 new units spanning ~2,580 LOC → see MS-P0.5-COORD.

### Agent C — safety-physics (S(x) safety floor)

**Score:** ≤ 0.24 / 1.0 — HARD BLOCK
**Method:** Static trace of WEDMPrintToProgramEngine + imports; S(x) bucketed into {collision, head-clearance, flush, thermal, dialect, unit-tag, deflection}.
**Key findings:**
- **WEDMPrintToProgramEngine returns `success: true` unconditionally** at line 1603 — no safety gate before program emit.
- **WEDMHeadClearanceEngine exists but is NOT imported** by the pipeline (orphan Phase-4 engine).
- **G-code output is a bare string** — no AtomicValue, no unit tag. A G21 program emitted to a G20-configured machine = 25.4× scale error = scrap + machine crash.
- PCD k(T) interpolation runs commit-time only (gate validates the table at build), not at runtime per part.
- Flushing velocity check absent → risk of wire breakage on thick workpieces.
- No controller-dialect verifier → Sodick program emitted as Mitsubishi will syntax-error the controller.
- Wire deflection formula correct (Dauw & Snoeys 1986) but is not gated against emit.

**Closure requires:** 6 new units spanning ~1,860 LOC → see MS-P2.5-SAFETY.

### Convergent verdict

| Agent | Axis | Score | Verdict |
|-------|------|-------|---------|
| A | Pipeline coverage | 0.47 | NO-GO |
| B | Synergy / coordination | 0.20 | BLOCK |
| C | S(x) safety floor | ≤ 0.24 | HARD BLOCK |
| **All** | **One-shot readiness** | **BLOCKED** | **PATCH REQUIRED** |

### Closure applied (v1.2.0)

Three new milestones inserted into WEDM-CONSOLIDATED-ROADMAP.md:

1. **MS-P0.5-COORD** — 8 units / 3 sessions / ~2,580 LOC — between P0 and P1
2. **MS-P1.5-ONESHOT** — 7 units / 3 sessions / ~2,480 LOC — between P1 and P2
3. **MS-P2.5-SAFETY** — 6 units / 2 sessions / ~1,860 LOC — between P2 and P3

Totals: **21 new units, ~6,920 LOC, 8 additional sessions.**

Milestone envelopes committed under `mcp-server/data/milestones/MS-P0.5-COORD.json`, `MS-P1.5-ONESHOT.json`, `MS-P2.5-SAFETY.json`. Roadmap-index.json updated (total_milestones 627 → 630; dependency chain rewired through the 3 insertions). Section 12 added to the consolidated roadmap with full unit catalog, forge-triple ownership table, and closure exit gate.

### Round 4 re-run schedule

A post-v1.2 Round 4 re-run is scheduled at the END of MS-P2.5-SAFETY. All three axes must hit:
- Pipeline coverage ≥ 0.95
- Synergy axis ≥ 0.65
- S(x) safety floor ≥ 0.72

If any axis regresses below gate, **P3 is blocked** pending remediation. The `wedm-program-safety-gate` hook (built in U-P2.5-SAFE-01) enforces this in CI.

---

**Scrutiny file end. Roadmap v1.2.0 status: v1.1 Round-3 PASS (avg 86.8) + v1.2 Round-4 PATCH APPLIED (21 new units). Round-4 re-verification pending end of MS-P2.5-SAFETY.**
