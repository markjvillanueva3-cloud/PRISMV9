# CAD/CAM Audit — Agent 9: Autonomous Safety

## Safety Gates Wired
- **Collision detection**: Nominal — `prism_safety:check_toolpath_collision` available
- **DFM validation**: Implemented — `prism_cad:dfm_check`
- **Workholding force**: Nominal — `prism_safety:calculate_clamp_force_required`
- **Spindle envelope**: Nominal — `prism_safety:check_spindle_power`, `check_spindle_torque`
- **Stock verification**: Nominal — `prism_multi_op:feasibility_simulate`
- **MRR bounds**: Implemented — `prism_calc:mrr` action available

**CRITICAL GAP**: Mill validator returns pre-machine-completeness blocker — `spindle.max_rpm` and `spindle.power` required before safety validation fires. Autonomous routes may bypass this if machine record is incomplete.

## S(x) Integration
- Omega `auto_score` returns Ω=0.82 (RELEASE_READY at hard_constraint S≥0.70)
- **Mismatch**: CLAUDE-BRIEF + omega-thresholds.json require Ω≥0.95 + S(x)≥0.98 for shop-floor autonomous output (five-sigma)
- **Missing**: Explicit S(x)≥0.98 five-sigma gate before NC export
- Frontend displays Ω but **NOT** S(x) confidence breakdown

## Operator-in-loop Confirmation
- **NOT FOUND**: No `prism_safety` action enforces operator acknowledgment before NC write
- **RISK**: Autonomous CAM export proceeds without human sign-off if machine data is complete
- Per CLAUDE-BRIEF: "Operator-in-the-loop is unconditional" — **THIS RULE IS NOT ENFORCED IN CODE**

## Confidence Threshold Logic
- **NOT IMPLEMENTED**: No AI confidence/uncertainty routing to human review
- Low-confidence autonomous outputs (CNN/model uncertainty >threshold) not detected
- No fallback to human review when confidence < threshold
- Conformal prediction engines (RAPS, APS) exist for other domains but NOT wired to autonomous CAD/CAM gate

## Score: 32/100

**Rationale:**
- Static safety gates: 75/100 — collision, DFM, workholding, spindle, stock all wired
- Five-sigma threshold enforcement: 30/100 — Ω≥0.95 + S(x)≥0.98 required, only Ω≥0.70 hard constraint active
- Operator-in-loop: 0/100 — **CRITICAL**: unconditional rule per CLAUDE-BRIEF, not enforced anywhere in code
- Confidence threshold routing: 0/100 — autonomous output bypasses human review regardless of model uncertainty
- UI visibility: 40/100 — Ω shown, S(x) breakdown hidden, no confidence display

## Recommendations (BLOCKING for autonomous CAM production)
1. **Add `prism_safety:safety_gate_open` requiring operator_acknowledge=true flag** before NC write (4h)
2. **Integrate confidence_threshold routing**: if model confidence < 0.95, force human review path (8h)
3. **Display S(x) ≥ 0.98 hard constraint at export UI** with red/yellow/green badge (4h)
4. **Wire conformal prediction (RAPS) into CAD/CAM autonomous gate** for uncertainty quantification (16h)
5. **Five-sigma export lock**: deny NC export if Ω<0.95 OR S(x)<0.98 OR confidence<threshold (4h)

**Total: ~36h to close the autonomous-safety gap.**

**RECOMMEND immediate closure before any autonomous CAM goes to shop floor.** Current state: AI can generate G-code, send to machine, with no human in the loop, with sub-five-sigma safety. This is the highest-severity finding across all flagship audits to date.
