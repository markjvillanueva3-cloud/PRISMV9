#!/usr/bin/env python3
"""
PRISM FORMULA EXPANSION WAVE 4
==============================
Quality/SPC, Optimization, Machine/Kinematics, Geometric
"""

import json
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Dict

@dataclass
class FormulaDef:
    id: str
    name: str
    category: str
    subcategory: str
    equation: str
    description: str
    inputs: List[Dict]
    outputs: List[Dict]
    feeds_into: List[str]
    derived_from: List[str]
    domain: str
    novelty: str
    def to_dict(self): return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# 12. QUALITY/SPC FORMULAS (40+)
# ═══════════════════════════════════════════════════════════════════════════════

QUALITY_FORMULAS = [
    # Process Capability
    ("F-QUAL-001", "Cp Index", "Cp = (USL - LSL) / (6×σ)",
     "Potential process capability", "STANDARD",
     ["USL", "LSL", "σ"], ["Cp"], ["F-QUAL-003"]),
    
    ("F-QUAL-002", "Cpk Index", "Cpk = min((USL-μ)/(3σ), (μ-LSL)/(3σ))",
     "Actual process capability", "STANDARD",
     ["USL", "LSL", "μ", "σ"], ["Cpk"], ["F-QUAL-003"]),
    
    ("F-QUAL-003", "Cpm Index", "Cpm = Cp / √(1 + ((μ-T)/σ)²)",
     "Capability with target", "STANDARD",
     ["Cp", "μ", "T", "σ"], ["Cpm"], []),
    
    ("F-QUAL-004", "Ppk Performance", "Ppk = min((USL-x̄)/(3s), (x̄-LSL)/(3s))",
     "Performance index using sample std", "STANDARD",
     ["USL", "LSL", "x_bar", "s"], ["Ppk"], []),
    
    # Control Charts
    ("F-QUAL-005", "X-bar UCL", "UCL = x̄̄ + A2 × R̄",
     "Upper control limit for X-bar", "STANDARD",
     ["x_double_bar", "A2", "R_bar"], ["UCL_xbar"], ["F-QUAL-010"]),
    
    ("F-QUAL-006", "X-bar LCL", "LCL = x̄̄ - A2 × R̄",
     "Lower control limit for X-bar", "STANDARD",
     ["x_double_bar", "A2", "R_bar"], ["LCL_xbar"], ["F-QUAL-010"]),
    
    ("F-QUAL-007", "Range UCL", "UCL_R = D4 × R̄",
     "Upper control limit for Range", "STANDARD",
     ["D4", "R_bar"], ["UCL_R"], ["F-QUAL-010"]),
    
    ("F-QUAL-008", "Range LCL", "LCL_R = D3 × R̄",
     "Lower control limit for Range", "STANDARD",
     ["D3", "R_bar"], ["LCL_R"], ["F-QUAL-010"]),
    
    ("F-QUAL-009", "Sigma from Range", "σ̂ = R̄ / d2",
     "Estimated std from average range", "STANDARD",
     ["R_bar", "d2"], ["σ_hat"], ["F-QUAL-001"]),
    
    ("F-QUAL-010", "Control Chart Decision", "OOC = |x - x̄̄| > 3σ",
     "Out of control condition", "STANDARD",
     ["x", "x_double_bar", "σ"], ["OOC"], []),
    
    # Six Sigma
    ("F-QUAL-011", "DPMO", "DPMO = (Defects / (Units × Opportunities)) × 10⁶",
     "Defects per million opportunities", "STANDARD",
     ["Defects", "Units", "Opportunities"], ["DPMO"], ["F-QUAL-012"]),
    
    ("F-QUAL-012", "Sigma Level", "σ_level = 0.8406 + √(29.37 - 2.221×ln(DPMO))",
     "Process sigma level", "STANDARD",
     ["DPMO"], ["σ_level"], []),
    
    ("F-QUAL-013", "Yield from Sigma", "Y = Φ(σ_level - 1.5)",
     "Yield with 1.5σ shift", "STANDARD",
     ["σ_level"], ["Y"], []),
    
    ("F-QUAL-014", "Rolled Throughput Yield", "RTY = Π(Yi)",
     "Cumulative yield through process", "STANDARD",
     ["Y_steps"], ["RTY"], []),
    
    # Measurement System
    ("F-QUAL-015", "Gage R&R %", "%GRR = σGRR/σtotal × 100",
     "Measurement system variation", "STANDARD",
     ["σGRR", "σtotal"], ["pct_GRR"], []),
    
    ("F-QUAL-016", "Repeatability", "EV = K1 × R̄",
     "Equipment variation", "STANDARD",
     ["K1", "R_bar"], ["EV"], ["F-QUAL-015"]),
    
    ("F-QUAL-017", "Reproducibility", "AV = √((K2×x̄_diff)² - EV²/(n×r))",
     "Appraiser variation", "STANDARD",
     ["K2", "x_bar_diff", "EV", "n", "r"], ["AV"], ["F-QUAL-015"]),
    
    ("F-QUAL-018", "Number of Distinct Categories", "ndc = 1.41 × σpart/σGRR",
     "Discrimination capability", "STANDARD",
     ["σpart", "σGRR"], ["ndc"], []),
    
    # Tolerance Stack
    ("F-QUAL-019", "Worst Case Stack", "Ttotal = Σ|Ti|",
     "Maximum tolerance accumulation", "STANDARD",
     ["T_list"], ["Ttotal_wc"], ["F-QUAL-020"]),
    
    ("F-QUAL-020", "RSS Stack", "Ttotal = √(Σ(Ti²))",
     "Statistical tolerance stack", "STANDARD",
     ["T_list"], ["Ttotal_rss"], []),
    
    # Novel Quality
    ("F-QUAL-021", "Predictive Cpk", "Cpk_pred = Cpk × (1 - α×t)",
     "Forecast capability degradation", "NOVEL",
     ["Cpk", "α", "t"], ["Cpk_pred"], []),
    
    ("F-QUAL-022", "Quality Loss Function", "L(x) = k × (x - T)²",
     "Taguchi loss function", "STANDARD",
     ["k", "x", "T"], ["L"], []),
    
    ("F-QUAL-023", "Dynamic Quality Score", "Qs(t) = Σwi × qi(t)",
     "Time-varying quality metric", "INVENTION",
     ["w", "q", "t"], ["Qs"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 13. OPTIMIZATION FORMULAS (35+)
# ═══════════════════════════════════════════════════════════════════════════════

OPTIMIZATION_FORMULAS = [
    # Objective Functions
    ("F-OPT-001", "Minimize Cost Objective", "min C(x) = Σci×xi",
     "Total cost minimization", "STANDARD",
     ["c", "x"], ["C_obj"], []),
    
    ("F-OPT-002", "Maximize MRR Objective", "max MRR(x) = vc × f × ap",
     "Productivity maximization", "STANDARD",
     ["vc", "f", "ap"], ["MRR_obj"], []),
    
    ("F-OPT-003", "Minimize Time Objective", "min T(x) = Σti(x)",
     "Cycle time minimization", "STANDARD",
     ["t_list"], ["T_obj"], []),
    
    ("F-OPT-004", "Multi-Objective", "min F(x) = [f1(x), f2(x), ..., fk(x)]ᵀ",
     "Vector optimization", "STANDARD",
     ["f_list"], ["F_multi"], []),
    
    ("F-OPT-005", "Weighted Sum", "min W(x) = Σwi × fi(x)",
     "Scalarized multi-objective", "STANDARD",
     ["w", "f_list"], ["W"], []),
    
    # Constraints
    ("F-OPT-006", "Power Constraint", "g1: Pc ≤ Pmax",
     "Spindle power limit", "STANDARD",
     ["Pc", "Pmax"], ["g1"], ["F-OPT-015"]),
    
    ("F-OPT-007", "Force Constraint", "g2: Fc ≤ Fmax",
     "Cutting force limit", "STANDARD",
     ["Fc", "Fmax"], ["g2"], ["F-OPT-015"]),
    
    ("F-OPT-008", "Surface Constraint", "g3: Ra ≤ Ra_spec",
     "Surface finish requirement", "STANDARD",
     ["Ra", "Ra_spec"], ["g3"], ["F-OPT-015"]),
    
    ("F-OPT-009", "Stability Constraint", "g4: ap ≤ blim",
     "Chatter-free requirement", "STANDARD",
     ["ap", "blim"], ["g4"], ["F-OPT-015"]),
    
    ("F-OPT-010", "Deflection Constraint", "g5: δ ≤ δmax",
     "Dimensional accuracy", "STANDARD",
     ["δ", "δmax"], ["g5"], ["F-OPT-015"]),
    
    ("F-OPT-011", "Tool Life Constraint", "g6: T ≥ Tmin",
     "Minimum tool life", "STANDARD",
     ["T", "Tmin"], ["g6"], ["F-OPT-015"]),
    
    ("F-OPT-012", "Torque Constraint", "g7: τ ≤ τmax",
     "Spindle torque limit", "STANDARD",
     ["τ", "τmax"], ["g7"], ["F-OPT-015"]),
    
    # Penalty Methods
    ("F-OPT-013", "Penalty Function", "Φ(x) = f(x) + μ×Σmax(0, gi(x))²",
     "Quadratic penalty", "STANDARD",
     ["f", "μ", "g_list"], ["Φ"], []),
    
    ("F-OPT-014", "Barrier Function", "B(x) = f(x) - μ×Σln(-gi(x))",
     "Log barrier", "STANDARD",
     ["f", "μ", "g_list"], ["B"], []),
    
    ("F-OPT-015", "Lagrangian", "L(x,λ) = f(x) + Σλi×gi(x)",
     "Lagrangian function", "STANDARD",
     ["f", "λ", "g_list"], ["L"], []),
    
    # Pareto
    ("F-OPT-016", "Pareto Dominance", "x1 ≺ x2 ⟺ ∀i: fi(x1) ≤ fi(x2) ∧ ∃j: fj(x1) < fj(x2)",
     "Dominance relation", "STANDARD",
     ["f_x1", "f_x2"], ["dominates"], []),
    
    ("F-OPT-017", "Hypervolume", "HV(P, r) = Λ(∪{[f(x), r] : x ∈ P})",
     "Pareto set quality metric", "ENHANCED",
     ["P", "r"], ["HV"], []),
    
    ("F-OPT-018", "Crowding Distance", "CD(i) = Σ(f_i+1 - f_i-1) / (fmax - fmin)",
     "NSGA-II diversity metric", "ENHANCED",
     ["f_neighbors", "fmax", "fmin"], ["CD"], []),
    
    # Novel
    ("F-OPT-019", "Robust Objective", "min max_{u∈U} f(x, u)",
     "Worst-case optimization", "NOVEL",
     ["f", "U"], ["f_robust"], []),
    
    ("F-OPT-020", "Chance Constraint", "P(g(x,ξ) ≤ 0) ≥ 1 - α",
     "Probabilistic constraint", "NOVEL",
     ["g", "ξ", "α"], ["g_chance"], []),
    
    ("F-OPT-021", "Adaptive Objective", "f_adapt(x,t) = f(x) × (1 + β×Δ(t))",
     "Time-varying objective", "INVENTION",
     ["f", "β", "Δ", "t"], ["f_adapt"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 14. MACHINE/KINEMATICS FORMULAS (30+)
# ═══════════════════════════════════════════════════════════════════════════════

MACHINE_FORMULAS = [
    # Axis Motion
    ("F-MACH-001", "Axis Velocity", "v = dx/dt",
     "Instantaneous axis velocity", "STANDARD",
     ["dx", "dt"], ["v"], ["F-MACH-002"]),
    
    ("F-MACH-002", "Axis Acceleration", "a = dv/dt",
     "Instantaneous axis acceleration", "STANDARD",
     ["dv", "dt"], ["a"], ["F-MACH-003"]),
    
    ("F-MACH-003", "Jerk", "j = da/dt",
     "Rate of change of acceleration", "STANDARD",
     ["da", "dt"], ["j"], ["F-MACH-010"]),
    
    ("F-MACH-004", "Trapezoidal Profile Distance", "s = v×t_coast + 0.5×a×t_accel² + 0.5×a×t_decel²",
     "Motion profile distance", "STANDARD",
     ["v", "t_coast", "a", "t_accel", "t_decel"], ["s"], []),
    
    ("F-MACH-005", "S-Curve Profile Time", "t = t_jerk_in + t_accel + t_coast + t_decel + t_jerk_out",
     "Smooth motion profile time", "ENHANCED",
     ["t_phases"], ["t_total"], []),
    
    # Spindle
    ("F-MACH-006", "Spindle Torque", "T = P × 9549 / n",
     "Torque from power and speed", "STANDARD",
     ["P", "n"], ["T"], ["F-OPT-012"]),
    
    ("F-MACH-007", "Spindle Angular Acceleration", "α = (n2 - n1) × π / (30 × t)",
     "Angular acceleration during ramp", "STANDARD",
     ["n2", "n1", "t"], ["α"], []),
    
    ("F-MACH-008", "Spindle Runout Effect", "δrunout = TIR × sin(θ)",
     "Radial error from runout", "ENHANCED",
     ["TIR", "θ"], ["δrunout"], ["F-DEFL-010"]),
    
    # Multi-axis
    ("F-MACH-009", "5-Axis Tool Orientation", "[i,j,k] = Ry(B) × Rz(C) × [0,0,1]",
     "Tool axis vector from rotary axes", "STANDARD",
     ["B", "C"], ["ijk"], ["F-MACH-010"]),
    
    ("F-MACH-010", "TCP Velocity", "v_TCP = √(vx² + vy² + vz²)",
     "Tool center point velocity", "STANDARD",
     ["vx", "vy", "vz"], ["v_TCP"], []),
    
    ("F-MACH-011", "Rotary Axis Contribution", "v_rotary = r × ω",
     "Linear velocity from rotation", "STANDARD",
     ["r", "ω"], ["v_rotary"], ["F-MACH-010"]),
    
    # Machine Errors
    ("F-MACH-012", "Positioning Error", "δpos = δscale + δbacklash + δthermal",
     "Total positioning error", "ENHANCED",
     ["δscale", "δbacklash", "δthermal"], ["δpos"], ["F-QUAL-001"]),
    
    ("F-MACH-013", "Volumetric Error", "δvol = √(δx² + δy² + δz²)",
     "3D positioning uncertainty", "ENHANCED",
     ["δx", "δy", "δz"], ["δvol"], ["F-QUAL-002"]),
    
    ("F-MACH-014", "Thermal Growth", "δthermal = α × L × ΔT",
     "Linear thermal expansion", "STANDARD",
     ["α", "L", "ΔT"], ["δthermal"], ["F-MACH-012"]),
    
    # Novel
    ("F-MACH-015", "Predictive Positioning", "δpred = f(T, load, position, history)",
     "ML-predicted positioning error", "INVENTION",
     ["T", "load", "position", "history"], ["δpred"], ["F-MACH-012"]),
    
    ("F-MACH-016", "Optimal Feed Profile", "v(t) = argmin(time) s.t. jerk ≤ jmax",
     "Jerk-limited optimal trajectory", "NOVEL",
     ["jmax", "path"], ["v_optimal"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 15. GEOMETRIC/CAM FORMULAS (25+)
# ═══════════════════════════════════════════════════════════════════════════════

GEOMETRIC_FORMULAS = [
    # Tool Engagement
    ("F-GEOM-001", "Radial Engagement Ratio", "ρ = ae / D",
     "Width of cut ratio", "STANDARD",
     ["ae", "D"], ["ρ"], ["F-CUT-016"]),
    
    ("F-GEOM-002", "Entry Angle", "θen = arccos(1 - 2×ae/D)",
     "Tool entry arc", "STANDARD",
     ["ae", "D"], ["θen"], ["F-GEOM-003"]),
    
    ("F-GEOM-003", "Exit Angle", "θex = π - θen (up milling)",
     "Tool exit arc", "STANDARD",
     ["θen"], ["θex"], ["F-CUT-032"]),
    
    ("F-GEOM-004", "Engagement Arc", "θsw = θex - θen",
     "Sweep angle", "STANDARD",
     ["θex", "θen"], ["θsw"], ["F-VIB-010"]),
    
    # Toolpath
    ("F-GEOM-005", "Arc Length", "L = r × θ",
     "Circular arc length", "STANDARD",
     ["r", "θ"], ["L"], ["F-PROC-011"]),
    
    ("F-GEOM-006", "Helix Pitch", "p = π × D × tan(λ)",
     "Helix lead distance", "STANDARD",
     ["D", "λ"], ["p"], []),
    
    ("F-GEOM-007", "Spiral Path Length", "L = n × √((π×D)² + p²)",
     "Helical path length", "STANDARD",
     ["n", "D", "p"], ["L_spiral"], ["F-PROC-011"]),
    
    ("F-GEOM-008", "Trochoidal Path Length", "L ≈ π×D×n_loops + L_linear",
     "Trochoidal milling path", "ENHANCED",
     ["D", "n_loops", "L_linear"], ["L_troch"], ["F-PROC-011"]),
    
    # Volume Calculations
    ("F-GEOM-009", "Pocket Volume", "V = A × depth",
     "Prismatic pocket volume", "STANDARD",
     ["A", "depth"], ["V"], ["F-PROC-001"]),
    
    ("F-GEOM-010", "Cylinder Volume", "V = π × r² × h",
     "Cylindrical feature volume", "STANDARD",
     ["r", "h"], ["V"], ["F-PROC-001"]),
    
    ("F-GEOM-011", "Stock to Remove", "V_remove = V_stock - V_part",
     "Material to be removed", "STANDARD",
     ["V_stock", "V_part"], ["V_remove"], ["F-PROC-001"]),
    
    # Curvature
    ("F-GEOM-012", "Curvature", "κ = 1/r",
     "Path curvature", "STANDARD",
     ["r"], ["κ"], ["F-GEOM-013"]),
    
    ("F-GEOM-013", "Maximum Feed at Curvature", "vf_max = vf_nom × (1 - κ×K)",
     "Feed reduction for curvature", "ENHANCED",
     ["vf_nom", "κ", "K"], ["vf_max"], ["F-PROC-008"]),
    
    # Novel
    ("F-GEOM-014", "Optimal Stepover", "ae_opt = argmax(MRR) s.t. Ra ≤ Ra_spec",
     "Optimal radial engagement", "NOVEL",
     ["MRR_func", "Ra_func", "Ra_spec"], ["ae_opt"], ["F-PROC-002"]),
    
    ("F-GEOM-015", "Adaptive Path Density", "ds = f(curvature, tolerance)",
     "Variable point spacing", "NOVEL",
     ["κ", "tol"], ["ds"], []),
]

def generate_formulas(category, formulas):
    result = []
    for f in formulas:
        fid, name, eq, desc, nov, inputs, outputs, feeds = f
        result.append(FormulaDef(
            id=fid, name=name, category=category, subcategory=category,
            equation=eq, description=desc,
            inputs=[{"name": i, "type": "number"} for i in inputs],
            outputs=[{"name": o, "type": "number"} for o in outputs],
            feeds_into=feeds, derived_from=[], domain="MANUFACTURING", novelty=nov
        ))
    return result

def main():
    print("=" * 80)
    print("PRISM FORMULA EXPANSION WAVE 4")
    print("=" * 80)
    
    with open(r"C:\PRISM\registries\FORMULA_REGISTRY_WAVE3.json", 'r') as f:
        wave3 = json.load(f)
    prev = wave3.get("formulas", [])
    print(f"Loaded Wave 3: {len(prev)}")
    
    generators = [
        ("QUALITY", QUALITY_FORMULAS),
        ("OPTIMIZATION", OPTIMIZATION_FORMULAS),
        ("MACHINE", MACHINE_FORMULAS),
        ("GEOMETRIC", GEOMETRIC_FORMULAS),
    ]
    
    all_formulas = prev.copy()
    for cat, formulas in generators:
        result = generate_formulas(cat, formulas)
        all_formulas.extend([f.to_dict() for f in result])
        print(f"  {cat}: {len(result)}")
    
    print(f"\nTotal Formulas: {len(all_formulas)}")
    
    output_path = r"C:\PRISM\registries\FORMULA_REGISTRY_WAVE4.json"
    registry = {
        "version": "4.0.0", "wave": 4,
        "generatedAt": datetime.now().isoformat(),
        "totalFormulas": len(all_formulas),
        "formulas": all_formulas
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    main()
