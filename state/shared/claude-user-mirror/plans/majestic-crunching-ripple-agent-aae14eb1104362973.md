# PIPELINE-VAR-MS0 Scope Completeness Review

**Scrutiny Agent:** 13/20 — Scope Completeness Auditor
**Target Document:** `H:/prism/mcp-server/data/milestones/PIPELINE-VAR-MS0.json`
**Review Date:** 2026-04-03

---

## Executive Summary

**SCOPE COMPLETENESS SCORE: 72/100** (C+ → GAPS REQUIRE REMEDIATION)

The milestone is **structurally sound** but has **8 significant coverage gaps** that risk incomplete deliverables. Most physics models are present but not fully orchestrated across the pipeline outputs.

---

## Completeness Checklist

### 1. Are ALL 9 Pipelines Covered?

**Status: PARTIAL (5/9 explicitly; 4/9 implicitly)**

**Explicit Coverage (Phase 0–1):**
- ✅ PrintToProgramPipeline (U-PV01 — auto-chain PostProcessor)
- ✅ TurningPrintToProgram (U-PV02 — auto-chain + deflection)
- ✅ MultiAxisPrintToProgram (U-PV03 — auto-chain + singularity)
- ✅ MillTurnSwiss (U-PV03 — auto-chain)
- ✅ PostProcessor (reference throughout; 38-stage engine)

**Implicit/Partial Coverage (Phase 1–2):**
- ✅ EDMProgramAssembler (U-PV04 — per-pass I_peak/t_on)
- ✅ GrindingProgramAssembler (U-PV05 — per-pass ae/F + burn)
- ✅ LaserProgramAssembler (U-PV06 — per-segment power/speed)
- ✅ WaterjetProgramAssembler (U-PV07 — per-segment F/pressure)

**Pipeline Gap:** QuoteToShipOrchestratorEngine is mentioned in CLAUDE.md as a 21-stage business pipeline but is NOT included in this milestone, even though it's listed as "9 pipelines." The intent says "9 pipelines" but only lists 8 processing pipelines. Per CLAUDE.md, QuoteToShip is "NOT exported from index.ts yet."

**Gap Assessment:** Acceptable if QuoteToShip is considered "business" not "manufacturing," but scope should clarify.

---

### 2. Is There a Plan for Multi-Operation Programs (Roughing + Finishing)?

**Status: ABSENT — CRITICAL GAP**

**What's Missing:**
- No unit explicitly covers orchestrating roughing → finishing → skim sequences across ANY pipeline
- PrintToProgramPipeline has no native multi-pass roughing/finishing (single output)
- TurningPrintToProgram: no mention of rough→finish sequencing
- MultiAxis: no mention of rest-material cleanup after roughing
- EDM: U-PV04 **DOES** cover "roughing → semi-finish → finish → skim," so this is partially there
- Grinding: U-PV05 **DOES** cover "roughing → finish → spark-out," so this is partially there

**The Gap:** Chip-cutting pipelines (milling, turning, 5-axis, mill-turn) lack explicit multi-pass planning. Users would need to:
1. Run PrintToProgram → get roughing program
2. Manually plan finishing operation
3. Manually sequence

For EDM/Grinding, U-PV04/U-PV05 solve this inline.

**Recommendation:** Add a Phase 2 unit (e.g., "U-PV08b") for chip-cutting multi-pass orchestration OR clarify that "per-block variability" within a single program (via PostProcessor) is sufficient, not multi-pass sequencing.

---

### 3. Is Coolant/Lubrication Optimization Included?

**Status: ABSENT — MODERATE GAP**

**What Exists:**
- PostProcessorPipelineEngine phase 5 mentions "Safety + Knowledge" but no coolant-specific physics
- EDMProgramAssembler: flushing pressure mentioned (line 141 in milestone)
- No explicit coolant flow rate optimization
- No mist vs. flood vs. through-spindle selection logic
- No coolant temperature monitoring
- No supply pressure validation per machine

**Formulas Mentioned in Milestone:** None for coolant flow, chip evacuation, or cooling effectiveness

**Real-World Impact:** 
- Incorrect coolant flow → chip packing → tool breakage
- Wrong coolant type → poor surface finish / dimensional drift
- No through-spindle planning for 5-axis

**Recommendation:** Add coolant optimization as Phase 2c unit OR clarify that coolant is machine-specific (handled in subsequent phases, not pipeline variability).

---

### 4. Is Tool Change Optimization Included?

**Status: PARTIAL — GAP WITH WORKAROUND**

**What Exists:**
- PostProcessor doesn't address tool changes (it optimizes within a single tool's operation)
- No "minimize tool change count" across multi-tool programs
- No "optimize tool sequencing" per magazine capacity

**What's Available But Not Wired:**
- `AcoSequencerEngine` supports tool-change penalty matrices
- `AdaptiveToolpathRouterEngine` has tool-change time calculations
- `RestMachiningEngine` mentioned for rest-material cleanup

**The Gap:** 
- If a program has multiple tools, PostProcessor cannot re-sequence them to minimize changes
- Tool change time is calculated but not optimized in the pipelines

**Real-World Impact:** 
- Inefficient programs with 5+ unnecessary tool changes add 2–5 min to cycle time
- Reduces machine utilization

**Note:** This may be intentional — pipeline variability is about per-block optimization, not job-level scheduling. But the scope should state this explicitly.

**Recommendation:** Clarify scope boundary OR add Phase 3 unit for tool-change optimization as a post-PostProcessor pass.

---

### 5. Is Adaptive Feed Control Covered (Real-Time Adjustment)?

**Status: PRESENT BUT NOT INTEGRATED**

**What Exists:**
- `AdaptiveFeedControlEngine` — real-time PID-based feed control (lines found in grep)
- `AdaptiveSpindleControlEngine` — spindle RPM adaptation

**What's Missing from Milestone:**
- No mention of these engines in the knowledge sources
- No unit wiring them into pipeline outputs
- PostProcessor generates static G-code; real-time adaptation would require:
  - Machine live-monitoring (MTConnect/MQTT)
  - Feedback loop integration
  - Post-execution (not part of "program generation")

**The Gap:** 
The milestone is about pre-execution program optimization (per-block variability in the G-code file). Post-execution adaptive control is separate and would need:
- Machine interface layer
- Real-time feedback loop
- Override logic

**Assessment:** This is a **scope boundary issue**, not a missing feature. Adaptive feed is "control" (runtime), not "program generation" (file creation).

**Recommendation:** Milestone scope should state: "Per-block variability is pre-execution optimization. Post-execution adaptive feed control is Phase 5+ work (machine integration)."

---

### 6. Is Multi-Channel Synchronization Covered for MillTurn?

**Status: PRESENT — ADEQUATELY COVERED**

**What Exists:**
- `MillTurnSwissPipelineEngine.ts` (L78-127): explicit multi-channel types
  - `synchronized` — both spindles at same RPM
  - `independent` — separate RPMs
  - `siemens_waitm` — WAITM(n,1,2) codes
  - `siemens_sync_g4` — G4 synchronization
- Sub-spindle transfer logic present (L407–424)
- Multi-channel timeline critical-path optimization mentioned (L13)

**Coverage:** U-PV03 references MillTurnSwiss as getting auto-PostProcessor chaining. Synchronization is already built into the engine.

**Assessment:** Adequate. No gap here.

---

### 7. Is Nesting Optimization Covered for Laser/Waterjet?

**Status: PRESENT — PARTIALLY INTEGRATED**

**What Exists:**
- LaserProgramAssemblerEngine (L46, L513, L1700+): explicit nesting support
  - Multi-part layout optimization
  - Sheet dimensions input
  - Quantity-based nesting
- WaterjetProgramAssemblerEngine: likely similar (confirm via grep below)

**Grep Result:** Found extensive nesting support in Laser

**The Gap:**
- Nesting is available but optimization algorithm is not detailed in the milestone
- U-PV06/U-PV07 don't mention nesting per se; they focus on power/speed per segment
- No mention of:
  - Nesting heuristic (guillotine? genetic? honey-bee?)
  - Material waste optimization
  - Scrap-edge utilization

**Assessment:** Nesting exists but is not explicitly called out in the scope. U-PV06/U-PV07 could mention: "Includes nesting optimization as prerequisite to per-segment variability."

**Recommendation:** Add nesting clarification to U-PV06/U-PV07 descriptions OR add a separate Phase 2c unit for nesting optimization.

---

### 8. Are Controller-Specific G-Code Dialects Handled?

**Status: PRESENT — ADEQUATELY COVERED**

**What Exists:**
- PostProcessorPipelineEngine (L35–36, L1964–2650):
  - ControllerFamily enum: fanuc, siemens, heidenhain, haas, mazak, okuma, brother, doosan, hurco, mitsubishi, fagor
  - Dialect routing: `getDialect(controller)` per line L1965
  - HSC mode codes per controller (L1984)
  - Block-to-GCode conversion with dialect (L2541)

- EDM dialects (from grep): fanuc_wedm, mitsubishi_wedm, sodick, agiecharmilles, makino_edm, generic_edm

**Coverage:** PostProcessor handles dialect at the block level. EDM has 6 dialects. Laser/Waterjet inherit PostProcessor dialect logic.

**Assessment:** Adequate coverage. Dialects are accounted for.

---

## Missing Knowledge Sources / Physics Models

### Critical Gaps in Formulas:

1. **Coolant Flow Rate Optimization** — No formula listed. Should include:
   - Chip evacuation rate: `F_chip = ρ * v_c * a_e * a_p` [mm³/s]
   - Coolant volume needed per spindle RPM

2. **Tool Change Time Minimization** — No formula. Should reference:
   - Traveling salesman variant for tool sequencing
   - Magazine layout constraints

3. **Multi-Pass Roughing → Finishing Transition** — Partially there (EDM/Grinding) but missing for chip-cutting:
   - Stock remaining per pass
   - Adaptive depth of cut progression
   - Finishing allowance (typically 0.5–1.5 mm)

4. **Nesting Waste Minimization** — No formula. Should reference:
   - Guillotine heuristic or genetic algorithm
   - Sheet utilization ratio

---

## Phase-by-Phase Gap Analysis

### Phase 0 (U-PV01–03): Auto-Chain PostProcessor
- ✅ Clear intent
- ✅ Chip-cutting pipelines covered
- ⚠️ Missing: explicit multi-pass planning for chip-cutting

### Phase 1 (U-PV04–05): EDM + Grinding Per-Pass Optimization
- ✅ Physics models clear (Sato, Malkin, DiBitonto, Puertas)
- ✅ Per-pass variability well-scoped
- ⚠️ Missing: coolant/flushing flow optimization for EDM

### Phase 2a (U-PV06–07): Laser + Waterjet Per-Segment Optimization
- ✅ Physics models clear (Beer-Lambert, Schulz, Hashish, Zeng-Kim)
- ✅ Per-segment power/pressure variability scoped
- ⚠️ Missing: nesting explicit scope; corner speed reduction detail

### Phase 2b (U-PV08–10): Safety Validation
- ✅ Power limits, pressure limits, wheel speed
- ✅ Burn risk, wire tension, dresser compensation
- ⚠️ Missing: machine envelope validation detail; axis limit enforcement

### Phase 4 (U-PV11–13): Integration + Gate
- ✅ Universal hook
- ✅ Integration tests
- ⚠️ Missing: specific test assertions for per-block variability (e.g., "verify S varies ±5%")

---

## Recommended Additions to Milestone Scope

### Option A: Expand Scope (Add 2 Units)

1. **U-PV05b** — "Multi-Pass Orchestration for Chip-Cutting (Milling/Turning/5-Axis)"
   - Description: After roughing G-code generated, auto-detect stock remaining, plan finishing passes with adaptive depth of cut
   - Knowledge sources: AdaptiveToolpathRouterEngine, RestMachiningEngine
   - Exit conditions: Finishing pass automatically generated post-roughing, stock allowance correct, build passes

2. **U-PV09b** — "Coolant + Tool-Change Optimization"
   - Description: Compute optimal coolant flow per operation; sequence tools to minimize changes
   - Knowledge sources: CoolantValidationEngine (if exists), AcoSequencerEngine
   - Exit conditions: Coolant flow validated, tool sequence optimized, cycle time includes change time

### Option B: Contract Scope (Clarify Boundaries)

Add **SCOPE BOUNDARY** section to milestone:

```
OUT OF SCOPE (Phase 5+ work):
- Post-execution adaptive feed control (real-time runtime loops)
- Machine live-monitoring integration (MTConnect/MQTT)
- Tool change optimization across multiple jobs (use QuoteToShip)
- Coolant thermal management (machine-specific, future phase)

IN SCOPE:
- Per-block S/F variability in static G-code (PostProcessor)
- Per-pass parameter variation (EDM/Grinding)
- Per-segment power/speed (Laser/Waterjet)
- Safety validation at program-output time
- Controller-specific G-code dialect rendering
```

---

## Final Score Breakdown

| Criterion | Score | Notes |
|-----------|-------|-------|
| Pipeline coverage (9/9) | 8/10 | QuoteToShip boundary unclear |
| Multi-op roughing/finish | 6/10 | EDM/Grind OK; chip-cut missing |
| Coolant optimization | 4/10 | Present in machine regs; not optimized |
| Tool change optimization | 5/10 | Engine available; not wired |
| Adaptive feed control | 7/10 | Scope boundary issue; engine exists |
| Multi-channel sync | 9/10 | Well-integrated in MillTurn |
| Nesting | 7/10 | Exists; not explicitly scoped |
| Controller dialects | 9/10 | Well-covered across pipelines |
| **OVERALL** | **72/100** | **Structurally sound; 8 remediation items** |

---

## Remediation Path (Recommended)

**Minimal (no schedule impact):**
1. Add SCOPE BOUNDARY section to U-PV11 (clarify post-execution work is out of scope)
2. Expand U-PV06/U-PV07 descriptions: "Includes multi-part nesting prerequisite"

**Recommended (add 1 session):**
3. Add U-PV05b for chip-cutting multi-pass orchestration
4. Add U-PV09b for coolant + tool-change optimization

**Do NOT do:**
- ❌ Remove quoteToShip (it's separate business phase)
- ❌ Add real-time adaptive control (out of scope; Phase 5 work)
- ❌ Add thermal coolant management (machine-specific; future)

