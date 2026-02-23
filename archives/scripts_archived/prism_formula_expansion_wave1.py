#!/usr/bin/env python3
"""
PRISM FORMULA EXPANSION - EXHAUSTIVE MATHEMATICAL FOUNDATION
=============================================================
From 22 formulas to 500+ covering ALL quantifiable aspects.

DESIGN PRINCIPLES:
1. Formulas FEED INTO other formulas (computational graph)
2. Every output can be an input to something else
3. Uncertainty propagates through the chain
4. Novel formulas derived from first principles
5. Cross-domain fusion formulas

CATEGORIES:
1. CUTTING MECHANICS (force, power, torque)
2. THERMAL (temperature, heat, cooling)
3. TOOL LIFE & WEAR (Taylor, Usui, etc.)
4. VIBRATION & DYNAMICS (stability, chatter)
5. SURFACE QUALITY (roughness, integrity)
6. DEFLECTION & ACCURACY (tool, workpiece, machine)
7. CHIP FORMATION (geometry, breaking)
8. MATERIAL BEHAVIOR (constitutive, flow stress)
9. OPTIMIZATION OBJECTIVES (MRR, cost, time, quality)
10. ECONOMIC (cost, time, efficiency)
11. STATISTICAL (SPC, capability, uncertainty)
12. GEOMETRIC (toolpath, engagement, volume)
13. KINEMATIC (machine motion, velocity, acceleration)
14. ENERGY & SUSTAINABILITY (power, carbon, waste)
15. QUALITY METRICS (Ω components, gates)
16. LEARNING & ADAPTATION (online, transfer)
17. FUSION (cross-domain combinations)
18. META (formulas about formulas)
"""

import json
from datetime import datetime
from dataclasses import dataclass, asdict, field
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
    feeds_into: List[str]  # Other formulas that use this output
    derived_from: List[str]  # Formulas this one depends on
    domain: str
    novelty: str  # STANDARD, ENHANCED, NOVEL, INVENTION
    units: Dict[str, str] = field(default_factory=dict)
    constraints: List[str] = field(default_factory=list)
    uncertainty: str = ""
    reference: str = ""
    
    def to_dict(self):
        return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# 1. CUTTING MECHANICS FORMULAS (50+)
# ═══════════════════════════════════════════════════════════════════════════════

CUTTING_FORMULAS = [
    # Core Kienzle
    ("F-CUT-001", "Kienzle Main Cutting Force", "Fc = kc1.1 × h^(-mc) × b", 
     "Main cutting force from specific cutting force", "STANDARD",
     ["kc1.1", "h", "b", "mc"], ["Fc"], ["F-CUT-002", "F-POW-001"]),
    
    ("F-CUT-002", "Kienzle Feed Force", "Ff = kf1.1 × h^(-mf) × b",
     "Feed force component", "STANDARD",
     ["kf1.1", "h", "b", "mf"], ["Ff"], ["F-CUT-004"]),
    
    ("F-CUT-003", "Kienzle Passive Force", "Fp = kp1.1 × h^(-mp) × b",
     "Passive/radial force component", "STANDARD",
     ["kp1.1", "h", "b", "mp"], ["Fp"], ["F-DEFL-001"]),
    
    ("F-CUT-004", "Resultant Cutting Force", "Fr = √(Fc² + Ff² + Fp²)",
     "Total resultant force magnitude", "STANDARD",
     ["Fc", "Ff", "Fp"], ["Fr"], ["F-DEFL-002", "F-VIB-001"]),
    
    # Corrections
    ("F-CUT-005", "Rake Angle Correction", "Kγ = 1 - (γ - γ₀)/100",
     "Correction for rake angle deviation", "ENHANCED",
     ["γ", "γ₀"], ["Kγ"], ["F-CUT-010"]),
    
    ("F-CUT-006", "Speed Correction Factor", "Kv = (v₀/v)^0.1",
     "Cutting speed influence on force", "ENHANCED",
     ["v", "v₀"], ["Kv"], ["F-CUT-010"]),
    
    ("F-CUT-007", "Wear Correction Factor", "Kw = 1 + 0.015 × VB",
     "Tool wear influence on force", "ENHANCED",
     ["VB"], ["Kw"], ["F-CUT-010"]),
    
    ("F-CUT-008", "Coolant Correction Factor", "Kc = 0.9 for flood, 1.0 dry",
     "Coolant effect on cutting force", "ENHANCED",
     ["coolant_type"], ["Kc"], ["F-CUT-010"]),
    
    ("F-CUT-009", "Edge Radius Correction", "Kr = 1 + 0.5×(rβ/h)",
     "Cutting edge radius effect", "ENHANCED",
     ["rβ", "h"], ["Kr"], ["F-CUT-010"]),
    
    ("F-CUT-010", "Corrected Cutting Force", "Fc_corr = Fc × Kγ × Kv × Kw × Kc × Kr",
     "Fully corrected cutting force", "ENHANCED",
     ["Fc", "Kγ", "Kv", "Kw", "Kc", "Kr"], ["Fc_corr"], ["F-POW-002"]),
    
    # Merchant Model
    ("F-CUT-011", "Merchant Shear Angle", "φ = π/4 - β/2 + α/2",
     "Shear plane angle from Merchant theory", "STANDARD",
     ["β", "α"], ["φ"], ["F-CUT-012"]),
    
    ("F-CUT-012", "Shear Force", "Fs = τs × As / sin(φ)",
     "Force on shear plane", "STANDARD",
     ["τs", "As", "φ"], ["Fs"], ["F-CUT-013"]),
    
    ("F-CUT-013", "Merchant Cutting Force", "Fc = Fs × cos(β-α) / cos(φ+β-α)",
     "Cutting force from Merchant model", "STANDARD",
     ["Fs", "β", "α", "φ"], ["Fc_merchant"], ["F-CUT-004"]),
    
    # Oblique Cutting
    ("F-CUT-014", "Chip Flow Angle", "ηc = arctan(tan(i) × cos(αn - φn) / sin(φn))",
     "Chip flow direction in oblique cutting", "ENHANCED",
     ["i", "αn", "φn"], ["ηc"], ["F-CUT-015"]),
    
    ("F-CUT-015", "Oblique Cutting Force", "Fc_obl = Fc / cos(i)",
     "Force correction for oblique cutting", "ENHANCED",
     ["Fc", "i"], ["Fc_obl"], ["F-POW-001"]),
    
    # Milling Specific
    ("F-CUT-016", "Instantaneous Chip Thickness", "h(θ) = fz × sin(θ) × (ae/D)",
     "Chip thickness variation in milling", "STANDARD",
     ["fz", "θ", "ae", "D"], ["h_inst"], ["F-CUT-001"]),
    
    ("F-CUT-017", "Average Chip Thickness", "hm = fz × √(ae/D)",
     "Mean chip thickness for milling", "STANDARD",
     ["fz", "ae", "D"], ["hm"], ["F-CUT-001"]),
    
    ("F-CUT-018", "Engagement Angle", "θe = arccos(1 - 2×ae/D)",
     "Tool engagement arc", "STANDARD",
     ["ae", "D"], ["θe"], ["F-CUT-019"]),
    
    ("F-CUT-019", "Number of Teeth in Cut", "zc = z × θe / (2π)",
     "Average teeth engaged", "STANDARD",
     ["z", "θe"], ["zc"], ["F-CUT-020"]),
    
    ("F-CUT-020", "Average Milling Force", "Fc_avg = Fc_max × θe / π",
     "Time-averaged milling force", "STANDARD",
     ["Fc_max", "θe"], ["Fc_avg"], ["F-POW-003"]),
    
    # Turning Specific
    ("F-CUT-021", "Uncut Chip Area", "Ac = f × ap",
     "Cross-sectional area of chip", "STANDARD",
     ["f", "ap"], ["Ac"], ["F-CUT-022"]),
    
    ("F-CUT-022", "Specific Cutting Pressure", "Kc = Fc / Ac",
     "Force per unit chip area", "STANDARD",
     ["Fc", "Ac"], ["Kc"], ["F-MAT-010"]),
    
    # Novel/Invented
    ("F-CUT-023", "Hybrid Physics-ML Force", "Fc_hybrid = α×Fc_physics + (1-α)×Fc_ML",
     "Weighted combination of physics and ML prediction", "NOVEL",
     ["Fc_physics", "Fc_ML", "α"], ["Fc_hybrid"], ["F-OPT-001"]),
    
    ("F-CUT-024", "Uncertainty-Aware Force", "Fc_unc = Fc ± σ_Fc",
     "Force with propagated uncertainty", "NOVEL",
     ["Fc", "σ_Fc"], ["Fc_unc"], ["F-QUAL-001"]),
    
    ("F-CUT-025", "Adaptive Force Coefficient", "kc_adapt = kc_base × (1 + λ×ΔFc/Fc)",
     "Self-adjusting cutting coefficient", "INVENTION",
     ["kc_base", "λ", "ΔFc", "Fc"], ["kc_adapt"], ["F-CUT-001"]),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 2. POWER & ENERGY FORMULAS (25+)
# ═══════════════════════════════════════════════════════════════════════════════

POWER_FORMULAS = [
    ("F-POW-001", "Cutting Power", "Pc = Fc × v / 60000",
     "Power consumed in cutting (kW)", "STANDARD",
     ["Fc", "v"], ["Pc"], ["F-POW-004", "F-THERM-001"]),
    
    ("F-POW-002", "Feed Power", "Pf = Ff × vf / 60000",
     "Power for feed motion", "STANDARD",
     ["Ff", "vf"], ["Pf"], ["F-POW-004"]),
    
    ("F-POW-003", "Spindle Power (Milling)", "Ps = Fc × v × zc / (60000 × z)",
     "Spindle power requirement", "STANDARD",
     ["Fc", "v", "zc", "z"], ["Ps"], ["F-POW-004"]),
    
    ("F-POW-004", "Total Machining Power", "Pt = Pc + Pf + Ploss",
     "Total power including losses", "STANDARD",
     ["Pc", "Pf", "Ploss"], ["Pt"], ["F-ECON-005"]),
    
    ("F-POW-005", "Specific Cutting Energy", "u = Pc / MRR",
     "Energy per unit volume removed", "STANDARD",
     ["Pc", "MRR"], ["u"], ["F-SUST-001"]),
    
    ("F-POW-006", "Motor Power Required", "Pm = Pt / η",
     "Motor power accounting for efficiency", "STANDARD",
     ["Pt", "η"], ["Pm"], ["F-MACH-001"]),
    
    ("F-POW-007", "Torque at Spindle", "T = Pc × 9549 / n",
     "Spindle torque requirement", "STANDARD",
     ["Pc", "n"], ["T"], ["F-MACH-002"]),
    
    ("F-POW-008", "Power Utilization Ratio", "η_cut = Pc / Pm_rated",
     "Fraction of available power used", "ENHANCED",
     ["Pc", "Pm_rated"], ["η_cut"], ["F-OPT-010"]),
    
    # Energy Formulas
    ("F-POW-009", "Cutting Energy per Part", "E_part = Pc × tc",
     "Total energy for one part", "STANDARD",
     ["Pc", "tc"], ["E_part"], ["F-SUST-002"]),
    
    ("F-POW-010", "Energy per Unit Volume", "e_v = E_part / V_removed",
     "Specific energy consumption", "STANDARD",
     ["E_part", "V_removed"], ["e_v"], ["F-SUST-003"]),
    
    # Novel
    ("F-POW-011", "Optimal Power Point", "Pc_opt = argmin(Cost/MRR)",
     "Power level minimizing cost per volume", "NOVEL",
     ["Cost_function", "MRR_function"], ["Pc_opt"], ["F-OPT-001"]),
    
    ("F-POW-012", "Regenerative Energy", "E_regen = η_regen × E_decel",
     "Energy recovered during deceleration", "INVENTION",
     ["η_regen", "E_decel"], ["E_regen"], ["F-SUST-004"]),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 3. THERMAL FORMULAS (35+)
# ═══════════════════════════════════════════════════════════════════════════════

THERMAL_FORMULAS = [
    # Temperature
    ("F-THERM-001", "Flash Temperature Rise", "θf = 0.754 × μ × Fc × v / (k × √(ρcv × lc))",
     "Maximum interface temperature", "STANDARD",
     ["μ", "Fc", "v", "k", "ρ", "c", "lc"], ["θf"], ["F-WEAR-001"]),
    
    ("F-THERM-002", "Average Cutting Temperature", "θavg = θ0 + C × v^a × f^b × ap^c",
     "Empirical average temperature", "STANDARD",
     ["θ0", "C", "v", "f", "ap", "a", "b", "c"], ["θavg"], ["F-MAT-005"]),
    
    ("F-THERM-003", "Heat Partition to Chip", "Rchip = 1 / (1 + 0.754×√(kw×ρw×cw / kt×ρt×ct))",
     "Fraction of heat going to chip", "STANDARD",
     ["kw", "ρw", "cw", "kt", "ρt", "ct"], ["Rchip"], ["F-THERM-005"]),
    
    ("F-THERM-004", "Heat Partition to Tool", "Rtool = 1 - Rchip - Rwork",
     "Fraction of heat to tool", "STANDARD",
     ["Rchip", "Rwork"], ["Rtool"], ["F-WEAR-002"]),
    
    ("F-THERM-005", "Heat Generation Rate", "Q = Pc × 1000",
     "Total heat generated (W)", "STANDARD",
     ["Pc"], ["Q"], ["F-THERM-003"]),
    
    ("F-THERM-006", "Chip Temperature", "θchip = θ0 + Rchip × Q / (ρ × c × MRR)",
     "Chip exit temperature", "STANDARD",
     ["θ0", "Rchip", "Q", "ρ", "c", "MRR"], ["θchip"], ["F-CHIP-005"]),
    
    ("F-THERM-007", "Tool Face Temperature", "θtool = θ0 + Rtool × Q / (kt × At)",
     "Tool rake face temperature", "STANDARD",
     ["θ0", "Rtool", "Q", "kt", "At"], ["θtool"], ["F-WEAR-003"]),
    
    ("F-THERM-008", "Workpiece Surface Temperature", "θwork = θ0 + Rwork × Q / (kw × Aw)",
     "Machined surface temperature", "STANDARD",
     ["θ0", "Rwork", "Q", "kw", "Aw"], ["θwork"], ["F-SURF-010"]),
    
    # Cooling
    ("F-THERM-009", "Convective Heat Transfer", "Qconv = h × A × (θs - θ∞)",
     "Heat removed by convection", "STANDARD",
     ["h", "A", "θs", "θ∞"], ["Qconv"], ["F-THERM-012"]),
    
    ("F-THERM-010", "Coolant Heat Absorption", "Qcool = ṁ × cp × Δθ",
     "Heat removed by coolant", "STANDARD",
     ["ṁ", "cp", "Δθ"], ["Qcool"], ["F-THERM-012"]),
    
    ("F-THERM-011", "MQL Cooling Effectiveness", "η_MQL = (θdry - θMQL) / (θdry - θflood)",
     "MQL cooling relative to flood", "ENHANCED",
     ["θdry", "θMQL", "θflood"], ["η_MQL"], ["F-SUST-005"]),
    
    ("F-THERM-012", "Thermal Equilibrium", "Qgen = Qchip + Qtool + Qwork + Qcool",
     "Heat balance equation", "STANDARD",
     ["Qgen", "Qchip", "Qtool", "Qwork", "Qcool"], ["balance"], ["F-THERM-013"]),
    
    # Thermal Damage
    ("F-THERM-013", "White Layer Risk Index", "WLI = (θmax - θtransform) / θtransform",
     "Risk of white layer formation", "NOVEL",
     ["θmax", "θtransform"], ["WLI"], ["F-QUAL-010"]),
    
    ("F-THERM-014", "Burn Risk Index", "BRI = θmax / θburn_threshold",
     "Risk of thermal damage", "NOVEL",
     ["θmax", "θburn_threshold"], ["BRI"], ["F-QUAL-011"]),
    
    # Novel
    ("F-THERM-015", "Cryogenic Temperature Drop", "Δθcryo = h_cryo × A × (θLN2 - θs)",
     "Temperature reduction with LN2", "NOVEL",
     ["h_cryo", "A", "θLN2", "θs"], ["Δθcryo"], ["F-THERM-001"]),
    
    ("F-THERM-016", "Thermal Time Constant", "τ = ρ × c × V / (h × A)",
     "Thermal response time", "ENHANCED",
     ["ρ", "c", "V", "h", "A"], ["τ"], ["F-THERM-017"]),
    
    ("F-THERM-017", "Transient Temperature", "θ(t) = θ∞ + (θ0 - θ∞) × exp(-t/τ)",
     "Time-dependent temperature", "ENHANCED",
     ["θ∞", "θ0", "τ", "t"], ["θ_t"], ["F-DEFL-010"]),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 4. TOOL LIFE & WEAR FORMULAS (30+)
# ═══════════════════════════════════════════════════════════════════════════════

WEAR_FORMULAS = [
    # Taylor
    ("F-LIFE-001", "Taylor Tool Life", "V × T^n = C",
     "Basic Taylor equation", "STANDARD",
     ["V", "n", "C"], ["T"], ["F-ECON-001"]),
    
    ("F-LIFE-002", "Extended Taylor", "V × T^n × f^a × ap^b = C",
     "Taylor with feed and depth", "STANDARD",
     ["V", "T", "f", "ap", "n", "a", "b", "C"], ["T_ext"], ["F-ECON-002"]),
    
    ("F-LIFE-003", "Taylor Exponent", "n = ln(V1/V2) / ln(T2/T1)",
     "Determine n from two tests", "STANDARD",
     ["V1", "V2", "T1", "T2"], ["n"], ["F-LIFE-001"]),
    
    ("F-LIFE-004", "Taylor Constant", "C = V × T^n",
     "Determine C from test data", "STANDARD",
     ["V", "T", "n"], ["C"], ["F-LIFE-001"]),
    
    # Wear Models
    ("F-WEAR-001", "Flank Wear Rate", "dVB/dt = A × exp(-B/θ) × σ^m",
     "Arrhenius-type wear model", "STANDARD",
     ["A", "B", "θ", "σ", "m"], ["dVB_dt"], ["F-WEAR-005"]),
    
    ("F-WEAR-002", "Crater Wear Rate", "dKT/dt = D × v^p × exp(-Q/Rθ)",
     "Diffusion-based crater wear", "STANDARD",
     ["D", "v", "p", "Q", "R", "θ"], ["dKT_dt"], ["F-WEAR-005"]),
    
    ("F-WEAR-003", "Usui Wear Model", "W = A × σn × vs × exp(-B/θ)",
     "Combined adhesive-abrasive wear", "ENHANCED",
     ["A", "σn", "vs", "B", "θ"], ["W"], ["F-WEAR-005"]),
    
    ("F-WEAR-004", "Abrasive Wear", "Wab = K × Fn × L / H",
     "Archard-type abrasive wear", "STANDARD",
     ["K", "Fn", "L", "H"], ["Wab"], ["F-WEAR-005"]),
    
    ("F-WEAR-005", "Total Wear", "VB = VB0 + ∫(dVB/dt)dt",
     "Cumulative flank wear", "STANDARD",
     ["VB0", "dVB_dt", "t"], ["VB"], ["F-LIFE-010"]),
    
    ("F-WEAR-006", "Notch Wear", "VN = Kn × ap × v^m × t",
     "Depth-of-cut notch wear", "ENHANCED",
     ["Kn", "ap", "v", "m", "t"], ["VN"], ["F-LIFE-010"]),
    
    # Tool Life Criteria
    ("F-LIFE-007", "Flank Wear Criterion", "T_VB = t when VB = VB_max",
     "Life at flank wear limit", "STANDARD",
     ["VB", "VB_max"], ["T_VB"], ["F-LIFE-010"]),
    
    ("F-LIFE-008", "Crater Wear Criterion", "T_KT = t when KT = KT_max",
     "Life at crater wear limit", "STANDARD",
     ["KT", "KT_max"], ["T_KT"], ["F-LIFE-010"]),
    
    ("F-LIFE-009", "Surface Finish Criterion", "T_Ra = t when Ra > Ra_max",
     "Life at surface quality limit", "STANDARD",
     ["Ra", "Ra_max"], ["T_Ra"], ["F-LIFE-010"]),
    
    ("F-LIFE-010", "Effective Tool Life", "T_eff = min(T_VB, T_KT, T_Ra, T_force)",
     "Limiting tool life", "STANDARD",
     ["T_VB", "T_KT", "T_Ra", "T_force"], ["T_eff"], ["F-ECON-001"]),
    
    # Novel
    ("F-LIFE-011", "Remaining Useful Life", "RUL = T_eff - t_current",
     "Time remaining before replacement", "NOVEL",
     ["T_eff", "t_current"], ["RUL"], ["F-ECON-010"]),
    
    ("F-LIFE-012", "Wear Rate Adaptation", "dVB/dt_adapt = dVB/dt × (1 + β×ΔVB)",
     "Self-correcting wear model", "INVENTION",
     ["dVB_dt", "β", "ΔVB"], ["dVB_dt_adapt"], ["F-WEAR-005"]),
    
    ("F-LIFE-013", "Probabilistic Tool Life", "P(T > t) = exp(-(t/T_char)^β)",
     "Weibull reliability model", "ENHANCED",
     ["t", "T_char", "β"], ["P_survival"], ["F-ECON-011"]),
]

def generate_formulas(category, formulas):
    result = []
    for f in formulas:
        fid, name, equation, desc, novelty, inputs, outputs, feeds = f
        result.append(FormulaDef(
            id=fid, name=name, category=category, subcategory=category,
            equation=equation, description=desc,
            inputs=[{"name": i, "type": "number"} for i in inputs],
            outputs=[{"name": o, "type": "number"} for o in outputs],
            feeds_into=feeds, derived_from=[],
            domain="MANUFACTURING", novelty=novelty
        ))
    return result

def main():
    print("=" * 80)
    print("PRISM FORMULA EXPANSION WAVE 1")
    print("=" * 80)
    
    generators = [
        ("CUTTING", CUTTING_FORMULAS),
        ("POWER", POWER_FORMULAS),
        ("THERMAL", THERMAL_FORMULAS),
        ("WEAR", WEAR_FORMULAS),
    ]
    
    all_formulas = []
    for cat, formulas in generators:
        result = generate_formulas(cat, formulas)
        all_formulas.extend([f.to_dict() for f in result])
        print(f"  {cat}: {len(result)}")
    
    print(f"\nWave 1 Formulas: {len(all_formulas)}")
    
    # Save
    output_path = r"C:\PRISM\registries\FORMULA_REGISTRY_WAVE1.json"
    registry = {
        "version": "1.0.0", "wave": 1,
        "generatedAt": datetime.now().isoformat(),
        "totalFormulas": len(all_formulas),
        "formulas": all_formulas
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    main()
