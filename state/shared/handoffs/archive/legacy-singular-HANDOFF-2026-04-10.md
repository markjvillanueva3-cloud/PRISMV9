# HANDOFF: Continue From 2026-04-10 Full Audit Session

## INSTRUCTIONS FOR NEXT CLAUDE SESSION

Read this file, then execute the three pending tasks below. All context is on the H:\ drive.

---

## TASK 1: Apply 20-Agent Scrutiny Gap Fixes to Roadmap

**Roadmap files to fix:**
- `H:\PRISM\PRISM-UNIFIED-ROADMAP-v2.md` (narrative roadmap)
- `H:\PRISM\PRISM-UNIFIED-ROADMAP-v2-RGS.md` (RGS-hardened version)
- `H:\PRISM\mcp-server\data\roadmap-index.json` (v9.0.0, 483 milestones)

**44 CRITICAL findings to fix:**

### Safety (Agent 1 — Score 38/100)
1. **Add mandatory collision detection gate to ALL G-code-producing pipelines** (milling, electrode, lathe, laser, waterjet, sinker). Wire `/cnc-simulate` or collision check as blocking pre-output hook.
2. **Add laser safety interlocks** to Lane 8 LASER-PIPE — Class 4 laser hazards, enclosure interlock verification, fume extraction, reflected beam hazards for Al/Cu/brass.
3. **Add waterjet pressure safety** — 60K+ PSI limits, emergency pressure dump, operator exclusion zones, garnet respiratory hazard.
4. **Expand Lane 0 M-code safety to ALL controllers** — currently only covers Haas/Siemens/Mazak/Heidenhain. Must add Hurco WinMAX, Okuma OSP (7 variants!), Fanuc 31i (Roku-Roku), Mitsubishi FP80S/C30EA-2 (sinker EDMs).
5. **Add div-by-zero audit for EDM/laser/waterjet engines** — Lane 0 only covers milling engines.
6. **Add sinker EDM burn parameter limit checks** — max current per electrode area, min flush time, dielectric level safety.
7. **Add graphite dust extraction as Lane 0 safety item** (not just Lane 7 footnote) — NFPA 652/654 combustible dust + respiratory hazard.

### Physics (Agent 2 — Score 72/100)
8. **Fix graphite kc1.1 in RGS document** — currently says "500-800 N/mm²", correct is **100-350 N/mm²** depending on grade. v2 says ~300 which is closer.
9. **Add FRF data requirement for stability lobe diagrams** — SLDs without tap test data are unreliable by 2-3x. Flag output as "estimated — requires tap test confirmation."
10. **Fix sinker EDM finish duty cycle** — SinkerEDMCalculatorEngine uses pulseOff = pulseOn × 0.8 (duty 56%), should be 1.5-2.0 for finishing (duty 33-40%).

### Dependencies (Agent 3 — Score 78/100)
11. **Add missing DAG edges**: Lane 5→Lane 7, Lane 7→Lane 4, Lane 0 re-validation from Lane 5.
12. **Move Lane 2 start to Phase 2** (currently starved until Phase 5 — 100 sessions of work delayed).
13. **Decouple LASER-PIPE and WATER-PIPE from Lane 7** — they don't depend on electrode pipeline, only SINKER-FULL does.
14. **Lane 1 (Frontend Merge) can start Phase 1** — it has no Lane 0 dependency per its own definition.

### Frontend (Agent 4 — Score 38/100)
15. **Fix build output path**: mcp-server expects `mcp-server/dist/web/`, Codex app outputs to `PRISM/dist/web/`. Add explicit units for build path rewiring.
16. **Increase FMERGE from 4 sessions to 8-10** — 51 unique pages, 30+ hooks, 30+ API modules to merge.
17. **Add units for**: API contract unification, test migration (96 files), WEDM Studio vs Wizard UX decision, 3 additional React Contexts (ErpContext, PpgContext, WedmStudioContext).

### EDM Process (Agent 5 — Score 72/100)
18. **Fix spark gap disagreement** between SinkerEDMCalculatorEngine (19.5µm) and ElectrodeDesignEngine (30-150µm). Unify on ElectrodeDesignEngine's stage-based values.
19. **Add electrode inspection stage BETWEEN milling and sinker burn** (currently quality check is AFTER burn).
20. **Add multi-cavity programming** as 3 separate units (not bundled) — electrode magazine, cavity mapping, gang electrodes.
21. **Add orbit engine** — circular/square/planetary/random orbits listed but zero implementation exists.
22. **Specify Fusion 360 API strategy** — REST API, Python addin, or STEP export + manual import.

### Data Engineering (Agent 6 — Score 38/100)
23. **Add data licensing/legal review** for web scraping manufacturer specs.
24. **Add dedup strategy** for Lane 5 — no dedup plan exists for 5K machines + 100K tools.
25. **Add data storage architecture** — at 100K+ tools, JSON scan is prohibitive. Define indexing strategy.
26. **Revise targets**: 5,000 machines → 2,500 realistic; "complete cutting data" → "40-60% coverage from published sources, physics fallback for rest."

### Knowledge/ML (Agent 7 — Score 31/100)
27. **Raise PDF table accuracy from 70% to 95%+** for numerical cutting parameters. Add physics plausibility gate.
28. **Add epistemic tags** to extracted knowledge: `{source_type, physics_verified, conflict_status}`.
29. **Add conflict resolution protocol** as dedicated unit (not sub-bullet of quality audit).
30. **Reduce video target from 1,000 to 50-100** curated videos with manual quality verification first.
31. **Add safety gate between extraction pipelines and live registries** — every extracted value must pass physics plausibility bounds before ingestion.

### Scope (Agent 8 — Score 58/100)
32. **Account for 4-loop overhead** — real session count is ~290-330, not 220.
33. **Decompose Lane 2** into session-level blocks (currently a black box with 200+ milestones).
34. **Increase electrode pipeline from 6 to 9 sessions** (already done in velvet-twirling-flute.md plan).

### CAM Strategy (Agent 9 — Score 61/100)
35. **Reduce 18 CAM bridges to tiered model**: Tier 1 (native: Fusion, hyperMILL, Mastercam), Tier 2 (export: NX, PowerMill, SolidCAM), Tier 3 (generic).
36. **Reduce 762-strategy claim to ~80 real strategies** after dedup. 762 is a registry artifact.
37. **Remove Mazatrol from Lane 6** — no Mazak machine in shop. Add Okuma OSP specifics instead.
38. **Add controller-specific HSM parameter names**: G187 (Haas), UltiMotion (Hurco), Super-NURBS/NAVI-G (Okuma).

### DevOps (Agent 10 — Score 28/100)
39. **Add tsc + vitest + build to CI pipeline** — currently CI only validates JSON and lints shell scripts.
40. **Define per-seat git branches** (`seat/2-video`, `seat/3-pdf`, `seat/4-db`) with merge protocol.
41. **Add inter-seat coordination.json** with per-milestone status signaling.
42. **Expand seat-specific CLAUDE.md** from 5 lines to 30+ lines (git workflow, build commands, dependency checking, recovery).

### Quality/Metrology (Agent 14 — Score 18/100)
43. **Add Quality & Metrology lane (QM-MS0 through QM-MS7)**:
  - QM-MS0: SPC engine (X-bar/R, CUSUM, EWMA, Cpk/Ppk)
  - QM-MS1: Gauge R&R (ANOVA, %GRR, ndc)
  - QM-MS2: FAI generator (AS9102 Forms 1/2/3)
  - QM-MS3: GD&T interpreter (ASME Y14.5 tolerance stack-ups)
  - QM-MS4: CMM program bridge (PC-DMIS/Calypso export)
  - QM-MS5: Compliance tracker (AS9100/ISO 13485/NADCAP/IATF)
  - QM-MS6: Quality feedback loop (measured vs predicted → recalibration)
  - QM-MS7: Expand qualityDispatcher to 30+ actions

### Business (Agent 13 — Score 52/100)
44. **Wire electrode cost to quoting** — electrode milling cost + sinker burn cost → QuoteEstimatorEngine.
45. **Add make-vs-buy decision engine** — capacity check, cost comparison, capability check.

### Shop Owner Priority (Agent 20 — Score 72/100)
46. **Move electrode pipeline to Phase 1** (alongside Lane 0 safety, not Phase 4).
47. **Add production scheduling lane** — which machine runs which job, when does each ship.
48. **Add DNC/file transfer** — get programs from PRISM to machine controllers.

---

## TASK 2: Start Electrode Pipeline Implementation

**Plan file**: `H:\PRISM\plans-archive\claude-plans\velvet-twirling-flute.md`

This is approved and ready to build. 10-stage pipeline, 9 sessions, 8 new engines:
- ColdHeadingToolConfiguratorEngine (replaces Excel macro)
- ElectrodePipelineOrchestratorEngine
- RokuRokuPostProcessorEngine (Fanuc 31i-B5)
- ElectrodeCAMStrategyEngine
- System3RWorkPartnerJobEngine
- MitsubishiSinkerProgramEngine (FP80S + C30EA-2)
- ElectrodeSetupDocEngine
- EccentricTurningEngine (trilobe C-axis polar interpolation for Okuma lathes)

Start with Session 1: Graphite physics + parametric configurator.

---

## TASK 3: Eccentric Turning for Trilobe Electrodes

Already included in the electrode pipeline plan (Session 8). Trilobe references found:
- `JM DIE/CNC LATHE/TRILOBE C.2842 - GOOD ONE -M8.mcx-8`
- `JM DIE/CNC LATHE/TRILOBE C.3571 - GOOD ONE-M10.mcx-8`
- `JM DIE/JM DIE COMPANY/JM/ROKU-ROKU/CAM TEMPLATES/TRILOBE TEMPLATE.invhsm-template`

Requires C-axis + X-axis synchronized motion (polar interpolation) on Okuma lathes with C-axis capability (GENOS L300-M, Multus B250II).

---

## CONTEXT FILES ON H:\ DRIVE

| File | Purpose |
|------|---------|
| `H:\PRISM\PRISM-UNIFIED-ROADMAP-v2.md` | Master roadmap (11 lanes, 4 seats) |
| `H:\PRISM\PRISM-UNIFIED-ROADMAP-v2-RGS.md` | RGS-hardened version with corrections |
| `H:\PRISM\SESSION-2026-04-10-FULL-AUDIT.md` | Full session summary |
| `H:\PRISM\HANDOFF-2026-04-10.md` | THIS FILE — handoff instructions |
| `H:\PRISM\plans-archive\claude-plans\` | 101 plan files from all Claude sessions |
| `H:\PRISM\plans-archive\codex-config\` | Codex config, memories, rules, skills |
| `H:\PRISM\mcp-server\data\roadmap-index.json` | v9.0.0, 483 milestones |
| `H:\PRISM\JM DIE\` | 24.3GB reference material (electrodes, programs, models) |
| `H:\Automated Program_Corrected 5-25.xlsm` | Excel macro (SolidWorks configurator, NOT electrode workflow) |

## SHOP MACHINE INVENTORY (21 machines)

**Lathes (7 Okuma):** GENOS L300-M (OSP-P300L-R), GENOS L200E-M (OSP-P200LA-R), LNC8, Crown L1060 (OSP-U10L), GENOS L400II-E (OSP-P300LA-E), LB 3000EX Big Bore (OSP-P500), Multus B250II (OSP-P300SA)

**Mills (5):** Hurco VM30i (WinMAX v10), Okuma M460V-5AX (OSP-P300MA-H), Haas VF-2 (PRE-NGC), Haas OM-2 (PRE-NGC), Roku-Roku HC 658-II (Fanuc 31i-B5 + System 3R WorkPartner 1+ robot)

**Sinker EDMs (2):** Mitsubishi EA12S (FP80S), Mitsubishi EA12D (C30EA-2)

**Wire EDMs (1):** Mitsubishi FA10S (W21FAS-2, W30FAS-2, W31MV-2 controllers, MD+ Pro II + MV1200S wires)
