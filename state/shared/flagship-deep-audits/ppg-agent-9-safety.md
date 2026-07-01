# PPG Deep Audit — Agent 9: Safety

## Safety Gates Wired

**Core Safety Architecture:**
PPG integrates PRISM's 6-dimension SafetyAssessment via `PipelineSafetyOrchestratorEngine`:
1. **Collision risk** — swept volume vs stock/fixture/machine (CollisionEngine)
2. **Overload risk** — Kienzle Fc vs spindle power × 0.85
3. **Chatter probability** — tooth-passing vs natural frequencies
4. **Thermal damage** — Johnson-Cook Tₘ vs material limit
5. **Tool breakage** — deflection stress vs tensile strength × 0.5
6. **Workholding failure** — cutting force vs grip force (Coulomb friction, WorkholdingForceEngine)

**Hard Vetoes (blocking):**
- Power > machine_max × 0.85
- Deflection > tolerance ÷ 3
- P(chatter) > 0.15
- P(collision) > 0
- Workholding SF < 1.5
- Coolant pressure below minimum (deep holes)

**GCode Safety Analyzer** (GCodeSafetyAnalyzerEngine):
- 24 safety rules across 6 CNC controllers (Fanuc, Haas, Siemens, Heidenhain, Mazak, Okuma)
- Detects: NaN/Infinity, machine limit violations, missing safe start, T/H mismatch, zero-feed moves, adversarial inputs
- Modal state tracking for contextual analysis

**PPG-Specific Gates:**
- `ppg_validate` via ProductDispatcher validates G-code for controller syntax
- `ppg_validate_limits` checks envelope compliance
- Safety dispatcher (`prism_safety`) wired for pre-export validation:
  - 8 collision actions (toolpath, fixture, 5-axis clearance, near-miss)
  - 5 coolant actions (flow, TSC adequacy)
  - 6 spindle actions (torque, power, speed, thermal)
  - 5 breakage actions (stress, fatigue, chip load)
  - 5 workholding actions (clamp force, pullout, liftoff moment)

## S(x) Integration

**OmegaSafetyScoreEngine** (canonical safety scorer):
- Maps 6 dimensions → scalar S(x) ∈ [0, 1]
- Scoring: safe=1.0, caution=0.85, warning=0.60, critical=0.25, veto=0
- S(x) = geometric mean of per-dimension scores
- Any single veto → S(x) = 0 (hard block)
- **Gate threshold: S(x) ≥ 0.70** (hard block on failure)
  - Allows: all dimensions caution+, or max one warning + others safe
- Result includes per-dimension scores, vetoed flag, justification, recommendations
- **Integration:** PPG routes call safety dispatcher → OmegaSafetyScoreEngine output blocks G-code export if S(x) < 0.70

## UI Visibility

**Frontend Safety Gate (HookRegistry):**
- Hook ID: `LATHE_DOWNLOAD_GATE` (download-gate tag)
- Handlers:
  - `validateLatheSafetyChecks` (S(x) assessment)
  - `validateCollisionCheck` (swept volume)
  - `validateClampingForce` (grip adequacy)
- **Status:** Active, enabled — hooks BEFORE NC export
- **Operator visibility:** Safety verdict displayed pre-download; violations list recommendations

**PPG Routes:**
- `/ppg/download` — calls prism_cam dispatcher, triggers safety gate before formatting
- `/ppg/download/setup-sheet` — includes operator-readable safety summary
- No raw bypass: download endpoint requires passing safety gate first

## Operator Gate

**Acknowledge Mechanism:**
- HookRegistry download-gate is async=false (synchronous, blocks export)
- Violations trigger descriptive error with recommendations
- Operator must fix underlying conditions (not override)
- Setup sheet includes warnings: "Fix collision before export", "Increase clamp force", etc.
- SafetyBlockError thrown if critical violation; propagates to UI (prevents silent bypass)

**Gap:** No explicit "operator checkbox" — gate is deterministic. However, recommendations are actionable (adjust speed, change tool, increase clamp force).

## Score (0-100)

**Wiring:** 85/100
- ✓ All 6 safety dimensions present
- ✓ OmegaSafetyScoreEngine (S(x) ≥ 0.70 threshold) functional
- ✓ GCodeSafetyAnalyzer catches 24 edge cases
- ✓ Collision, workholding, spindle, coolant engines wired
- ✓ Safety dispatcher (prism_safety) has 29 actions covering all domains
- ✓ Download gate hooks into HookRegistry, visible to UI
- ⚠ PPG route doesn't explicitly call safety dispatcher (delegates to prism_cam)
- ⚠ No explicit aggregate gate count for Mill/Lathe/WEDM (per-engine gates exist but not totaled)

**S(x) Integration:** 90/100
- ✓ Threshold = 0.70 enforced
- ✓ Geometric mean aggregation correct
- ✓ Hard veto logic implemented
- ⚠ Gate threshold not configurable per process (always 0.70)
- ⚠ No per-dimension weighting by risk severity

**UI Visibility:** 80/100
- ✓ Download gate visible, hooks active
- ✓ Setup sheet includes safety summary
- ✓ Violations block export
- ⚠ Frontend component integration not fully traced (MCP envelope only)
- ⚠ No per-dimension S(x) breakdown visible to operator

**Operator Gate:** 75/100
- ✓ SafetyBlockError propagates (no silent bypass)
- ✓ Recommendations provided
- ⚠ No checkbox/acknowledge UI (gate is deterministic, not delegable)
- ⚠ Could benefit from "safety waiver" audit trail for opt-in rework

**Overall:** **82/100** — PPG safety gates wired but aggregation gaps and UI transparency could improve.

