# PPG Deep Audit — Agent 6: GD&T

## Symbol Coverage (14 symbols)
**COMPLETE** — GDTCalloutParserEngine recognizes all 14 ASME Y14.5-2018 symbols:
- Form (4): flatness, straightness, roundness, cylindricity ✓
- Orientation (3): parallelism, perpendicularity, angularity ✓
- Location (3): position, concentricity, symmetry ✓
- Profile (2): profile_of_line, profile_of_surface ✓
- Runout (2): circular_runout, total_runout ✓

Parser accepts Unicode (⏥, ⏤, ○, etc.) and ASCII shorthand (FLAT, STR, ROUND, POS, etc.). Validates symbol applicability (e.g., rejects form symbols with datums per ASME Y14.5).

## Datum Reference Frame
**EXTRACTED & PRESERVED** — Parser captures datum references (A, B, C) with material modifiers (M/L/F/RFS). Supports composite FCF (two-line frame with refinement tolerance). Validates position/coaxial controls require primary datum. **Gap**: No explicit DRF precedence validation (A→B→C hierarchy per Y14.5-2018 §4.2) or datum shift accounting in tolerance stack.

## Downstream Propagation
### Tolerance Stack ✓
GDTStackupEngine (worst-case, RSS, Monte Carlo) receives extracted tolerances. Performs 1D linear stack-up, identifies critical contributors via sensitivity analysis. **Limitation**: 1D only—no 2D/3D chain propagation for profile or angular controls.

### Inspection Plan (FAI/CMM) ✓
HyperMillFAIBridge maps toleranced operations to AS9102 Form 3 characteristics. Auto-identifies critical dims (tolerance ≤0.05mm, bore/thread/datum features). Assigns balloon numbers; generates FAI input for FirstArticleInspectionPipelineEngine. **Capability**: CMM method auto-selected for tolerances ≤0.02mm.

### Machine Selection ⚠️
**WEAK** — No direct GD&T→machine mapping engine found. ToleranceExtractionEngine infers machining strategy (grinding for <5μm, fine-finish for <10μm, runout→between-centers). MachineSelectionEngine (EDM domain) exists but not wired to PPG/lathe GD&T pipeline. Position 0.005mm tolerance would require manual multi-axis evaluation—no automation present.

## Architecture Gaps
1. **No PrintToProgram orchestrator** wiring GDT extraction → tolerance stack → FAI → machine selection. Each engine exists in isolation.
2. **1D tolerance stack only** — Position/perpendicularity controls are 2D/3D; stacking logic is linear dimensional only.
3. **No datum precedence hierarchy** — GDT parser captures A/B/C but doesn't validate DRF priority per Y14.5.
4. **No bonus tolerance automation** — Position MMC recognized in parser & extraction, but no automated bonus calculation in stack-up.
5. **Machine selection manual** — Tight GD&T (e.g., 0.005" pos) doesn't auto-recommend 5-axis; user must reason offline.

## Score: 62/100
**Strengths**: All 14 symbols parsed, datum refs extracted, FAI integration solid, tolerance stack-up math correct (WC/RSS/MC).
**Weaknesses**: No PPG orchestrator, 1D stack only, no DRF validation, no machine selection automation, no bonus tolerance automation, no 2D/3D profile/positional chain logic.
**Recommendation**: Wire PrintToProgram → GDT extraction → 2D tolerance chain → machine selector. Add DRF validator. Implement position/profile 2D stackup engine.

