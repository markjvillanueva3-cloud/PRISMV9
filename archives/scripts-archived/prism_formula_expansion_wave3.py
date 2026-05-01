#!/usr/bin/env python3
"""
PRISM FORMULA EXPANSION WAVE 3
==============================
Material Properties, Process/MRR, Economics
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
    feeds_into: List[str]
    derived_from: List[str]
    domain: str
    novelty: str
    def to_dict(self): return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# 9. MATERIAL PROPERTY FORMULAS (40+)
# ═══════════════════════════════════════════════════════════════════════════════

MATERIAL_FORMULAS = [
    # Johnson-Cook Constitutive
    ("F-MAT-001", "Johnson-Cook Flow Stress", "σ = (A + B×εⁿ)(1 + C×ln(ε̇*)))(1 - T*ᵐ)",
     "Temperature and strain-rate dependent flow stress", "STANDARD",
     ["A", "B", "ε", "n", "C", "ε_dot_star", "T_star", "m"], ["σ_flow"], ["F-CUT-012"]),
    
    ("F-MAT-002", "Homologous Temperature", "T* = (T - Troom) / (Tmelt - Troom)",
     "Normalized temperature", "STANDARD",
     ["T", "Troom", "Tmelt"], ["T_star"], ["F-MAT-001"]),
    
    ("F-MAT-003", "Normalized Strain Rate", "ε̇* = ε̇ / ε̇₀",
     "Strain rate ratio to reference", "STANDARD",
     ["ε_dot", "ε_dot_0"], ["ε_dot_star"], ["F-MAT-001"]),
    
    ("F-MAT-004", "J-C Damage Parameter", "D = Σ(Δε / εf)",
     "Cumulative damage", "STANDARD",
     ["Δε", "εf"], ["D"], ["F-MAT-005"]),
    
    ("F-MAT-005", "J-C Fracture Strain", "εf = (D1 + D2×exp(D3×σ*))(1 + D4×ln(ε̇*))(1 + D5×T*)",
     "Strain to fracture", "STANDARD",
     ["D1", "D2", "D3", "σ_star", "D4", "ε_dot_star", "D5", "T_star"], ["εf"], ["F-MAT-004"]),
    
    # Hardness Conversions
    ("F-MAT-006", "HRC to HB", "HB = (HRC + 99.7) / 0.15",
     "Rockwell C to Brinell", "STANDARD",
     ["HRC"], ["HB"], ["F-MAT-010"]),
    
    ("F-MAT-007", "HV to HB", "HB = 0.95 × HV",
     "Vickers to Brinell", "STANDARD",
     ["HV"], ["HB"], ["F-MAT-010"]),
    
    ("F-MAT-008", "HB to Tensile Strength", "σUTS = 3.45 × HB",
     "Brinell to UTS (MPa) for steel", "STANDARD",
     ["HB"], ["σUTS"], ["F-MAT-011"]),
    
    ("F-MAT-009", "Yield from Hardness", "σy ≈ HV / 3",
     "Yield strength from Vickers", "STANDARD",
     ["HV"], ["σy"], ["F-MAT-011"]),
    
    # Cutting Coefficients
    ("F-MAT-010", "kc1.1 from Hardness", "kc1.1 = K0 + K1×HB + K2×HB²",
     "Specific cutting force estimation", "ENHANCED",
     ["K0", "K1", "K2", "HB"], ["kc1_1"], ["F-CUT-001"]),
    
    ("F-MAT-011", "mc from Material", "mc = 0.14 + 0.0003×HB",
     "Kienzle exponent estimation", "ENHANCED",
     ["HB"], ["mc"], ["F-CUT-001"]),
    
    ("F-MAT-012", "Machinability Index", "MI = V60_material / V60_AISI1212",
     "Relative machinability", "STANDARD",
     ["V60_mat", "V60_ref"], ["MI"], ["F-ECON-010"]),
    
    # Thermal Properties
    ("F-MAT-013", "Thermal Diffusivity", "α = k / (ρ × cp)",
     "Material thermal diffusivity", "STANDARD",
     ["k", "ρ", "cp"], ["α"], ["F-THERM-001"]),
    
    ("F-MAT-014", "Conductivity vs Temperature", "k(T) = k0 × (1 - β×(T - T0))",
     "Temperature-dependent conductivity", "ENHANCED",
     ["k0", "β", "T", "T0"], ["k_T"], ["F-THERM-001"]),
    
    ("F-MAT-015", "Specific Heat vs Temperature", "cp(T) = c0 + c1×T + c2×T²",
     "Polynomial temperature dependence", "ENHANCED",
     ["c0", "c1", "c2", "T"], ["cp_T"], ["F-THERM-001"]),
    
    # Novel Material Relations
    ("F-MAT-016", "Material Similarity Score", "Smat = Σwi × sim(pi, pi')",
     "Cross-material property similarity", "INVENTION",
     ["w", "p", "p_prime"], ["Smat"], ["F-MAT-017"]),
    
    ("F-MAT-017", "Parameter Transfer", "p_new = p_ref × Π(pi_new/pi_ref)^αi",
     "Transfer coefficients between materials", "INVENTION",
     ["p_ref", "p_ratios", "α"], ["p_new"], ["F-CUT-001"]),
    
    ("F-MAT-018", "Missing Property Estimation", "p_missing = ML(p_known)",
     "Estimate unknown from known properties", "INVENTION",
     ["p_known"], ["p_missing"], ["F-MAT-001"]),
    
    # Microstructure Effects
    ("F-MAT-019", "Grain Size Effect (Hall-Petch)", "σy = σ0 + ky/√d",
     "Yield strength from grain size", "STANDARD",
     ["σ0", "ky", "d"], ["σy"], ["F-MAT-001"]),
    
    ("F-MAT-020", "Phase Fraction Effect", "σ = Σ(fi × σi)",
     "Rule of mixtures for multiphase", "STANDARD",
     ["f", "σ_phases"], ["σ"], ["F-MAT-001"]),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 10. PROCESS/MRR FORMULAS (35+)
# ═══════════════════════════════════════════════════════════════════════════════

PROCESS_FORMULAS = [
    # Material Removal Rate
    ("F-PROC-001", "MRR Turning", "MRR = vc × f × ap × 1000",
     "Volume removal rate in turning (mm³/min)", "STANDARD",
     ["vc", "f", "ap"], ["MRR_turn"], ["F-POW-001", "F-ECON-001"]),
    
    ("F-PROC-002", "MRR Milling", "MRR = ae × ap × vf",
     "Volume removal rate in milling (mm³/min)", "STANDARD",
     ["ae", "ap", "vf"], ["MRR_mill"], ["F-POW-001", "F-ECON-001"]),
    
    ("F-PROC-003", "MRR Drilling", "MRR = π×D²/4 × f × n",
     "Volume removal rate in drilling", "STANDARD",
     ["D", "f", "n"], ["MRR_drill"], ["F-POW-001"]),
    
    ("F-PROC-004", "MRR Face Milling", "MRR = ae × ap × vf × Keng",
     "MRR with engagement factor", "ENHANCED",
     ["ae", "ap", "vf", "Keng"], ["MRR_face"], ["F-ECON-001"]),
    
    ("F-PROC-005", "Specific MRR", "Q' = MRR / Pc",
     "MRR per unit power", "STANDARD",
     ["MRR", "Pc"], ["Q_prime"], ["F-ECON-010"]),
    
    # Speeds and Feeds
    ("F-PROC-006", "Cutting Speed", "vc = π × D × n / 1000",
     "Surface speed from RPM (m/min)", "STANDARD",
     ["D", "n"], ["vc"], ["F-CUT-001"]),
    
    ("F-PROC-007", "Spindle Speed", "n = 1000 × vc / (π × D)",
     "RPM from cutting speed", "STANDARD",
     ["vc", "D"], ["n"], ["F-PROC-006"]),
    
    ("F-PROC-008", "Table Feed Rate", "vf = fz × z × n",
     "Feed rate in mm/min", "STANDARD",
     ["fz", "z", "n"], ["vf"], ["F-PROC-002"]),
    
    ("F-PROC-009", "Feed per Revolution", "f = fz × z",
     "Total feed per spindle rev", "STANDARD",
     ["fz", "z"], ["f"], ["F-CUT-001"]),
    
    ("F-PROC-010", "Feed per Tooth", "fz = vf / (z × n)",
     "Chip load per tooth", "STANDARD",
     ["vf", "z", "n"], ["fz"], ["F-CUT-016"]),
    
    # Time Calculations
    ("F-PROC-011", "Machining Time", "tm = (L + La + Lo) / vf",
     "Time for one pass", "STANDARD",
     ["L", "La", "Lo", "vf"], ["tm"], ["F-ECON-020"]),
    
    ("F-PROC-012", "Number of Passes (Depth)", "np = ceil(depth_total / ap)",
     "Required depth passes", "STANDARD",
     ["depth_total", "ap"], ["np"], ["F-PROC-013"]),
    
    ("F-PROC-013", "Number of Passes (Width)", "nw = ceil(width_total / ae)",
     "Required width passes", "STANDARD",
     ["width_total", "ae"], ["nw"], ["F-PROC-014"]),
    
    ("F-PROC-014", "Total Cutting Time", "tc = tm × np × nw",
     "Time for all passes", "STANDARD",
     ["tm", "np", "nw"], ["tc"], ["F-ECON-020"]),
    
    ("F-PROC-015", "Rapid Time", "tr = Lr / vr",
     "Non-cutting travel time", "STANDARD",
     ["Lr", "vr"], ["tr"], ["F-PROC-016"]),
    
    ("F-PROC-016", "Cycle Time", "tcycle = tc + tr + ttool + tload",
     "Total part cycle time", "STANDARD",
     ["tc", "tr", "ttool", "tload"], ["tcycle"], ["F-ECON-020"]),
    
    # Productivity
    ("F-PROC-017", "Production Rate", "Rp = 60 / tcycle",
     "Parts per hour", "STANDARD",
     ["tcycle"], ["Rp"], ["F-ECON-030"]),
    
    ("F-PROC-018", "Cutting Time Ratio", "ηcut = tc / tcycle",
     "Productive time fraction", "ENHANCED",
     ["tc", "tcycle"], ["ηcut"], ["F-ECON-031"]),
    
    # Novel
    ("F-PROC-019", "Optimal MRR", "MRR_opt = argmax(MRR) s.t. constraints",
     "Maximum MRR within constraints", "NOVEL",
     ["constraints"], ["MRR_opt"], ["F-OPT-001"]),
    
    ("F-PROC-020", "Adaptive Feed", "f_adapt = f_nom × (1 + α×ΔP/P)",
     "Self-adjusting feed rate", "INVENTION",
     ["f_nom", "α", "ΔP", "P"], ["f_adapt"], ["F-PROC-008"]),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 11. ECONOMICS FORMULAS (45+)
# ═══════════════════════════════════════════════════════════════════════════════

ECONOMICS_FORMULAS = [
    # Part Cost Breakdown
    ("F-ECON-001", "Total Part Cost", "Cpart = Cmat + Cmach + Ctool + Csetup + COH",
     "Complete part cost", "STANDARD",
     ["Cmat", "Cmach", "Ctool", "Csetup", "COH"], ["Cpart"], []),
    
    ("F-ECON-002", "Material Cost", "Cmat = Vstock × ρ × Ckg",
     "Raw material cost", "STANDARD",
     ["Vstock", "ρ", "Ckg"], ["Cmat"], ["F-ECON-001"]),
    
    ("F-ECON-003", "Material Utilization", "ηmat = Vpart / Vstock",
     "Buy-to-fly ratio", "STANDARD",
     ["Vpart", "Vstock"], ["ηmat"], ["F-SUST-001"]),
    
    ("F-ECON-004", "Machining Cost", "Cmach = Rmach × tcycle",
     "Cost of machining time", "STANDARD",
     ["Rmach", "tcycle"], ["Cmach"], ["F-ECON-001"]),
    
    ("F-ECON-005", "Machine Rate", "Rmach = (Cfixed + Cvariable) / tavailable",
     "Hourly machine rate", "STANDARD",
     ["Cfixed", "Cvariable", "tavailable"], ["Rmach"], ["F-ECON-004"]),
    
    # Tool Cost
    ("F-ECON-006", "Tool Cost per Part", "Ctool_part = Cedge / nparts_edge",
     "Tooling cost allocation", "STANDARD",
     ["Cedge", "nparts_edge"], ["Ctool_part"], ["F-ECON-001"]),
    
    ("F-ECON-007", "Cost per Cutting Edge", "Cedge = Cinsert/nedges + Rmach×tchange",
     "True edge cost including downtime", "STANDARD",
     ["Cinsert", "nedges", "Rmach", "tchange"], ["Cedge"], ["F-ECON-006"]),
    
    ("F-ECON-008", "Parts per Edge", "nparts_edge = T / tc_part",
     "Parts machined per edge", "STANDARD",
     ["T", "tc_part"], ["nparts_edge"], ["F-ECON-006"]),
    
    ("F-ECON-009", "Setup Cost per Part", "Csetup_part = Rsetup × tsetup / nbatch",
     "Setup cost allocation", "STANDARD",
     ["Rsetup", "tsetup", "nbatch"], ["Csetup_part"], ["F-ECON-001"]),
    
    # Optimal Speeds
    ("F-ECON-010", "Minimum Cost Speed", "vmc = C × ((n-1)/n × tchange/Cmach × Cedge)^(-n)",
     "Gilbert's minimum cost speed", "STANDARD",
     ["C", "n", "tchange", "Cmach", "Cedge"], ["vmc"], ["F-OPT-001"]),
    
    ("F-ECON-011", "Maximum Production Speed", "vmp = C × ((n-1)/n × tchange)^(-n)",
     "Maximum output speed", "STANDARD",
     ["C", "n", "tchange"], ["vmp"], ["F-OPT-002"]),
    
    ("F-ECON-012", "Cost-Time Trade-off", "v_opt = α×vmc + (1-α)×vmp",
     "Weighted optimal speed", "ENHANCED",
     ["α", "vmc", "vmp"], ["v_opt"], ["F-OPT-003"]),
    
    # Productivity Metrics
    ("F-ECON-013", "OEE", "OEE = A × P × Q",
     "Overall Equipment Effectiveness", "STANDARD",
     ["A", "P", "Q"], ["OEE"], []),
    
    ("F-ECON-014", "Availability", "A = trun / tplanned",
     "Uptime ratio", "STANDARD",
     ["trun", "tplanned"], ["A"], ["F-ECON-013"]),
    
    ("F-ECON-015", "Performance", "P = tideal × nproduced / trun",
     "Speed efficiency", "STANDARD",
     ["tideal", "nproduced", "trun"], ["P"], ["F-ECON-013"]),
    
    ("F-ECON-016", "Quality Rate", "Q = ngood / ntotal",
     "First-pass yield", "STANDARD",
     ["ngood", "ntotal"], ["Q"], ["F-ECON-013"]),
    
    # Financial
    ("F-ECON-017", "ROI", "ROI = ΔProfit / Investment × 100%",
     "Return on investment", "STANDARD",
     ["ΔProfit", "Investment"], ["ROI"], []),
    
    ("F-ECON-018", "Payback Period", "tpayback = Investment / AnnualSavings",
     "Time to recover investment", "STANDARD",
     ["Investment", "AnnualSavings"], ["tpayback"], []),
    
    ("F-ECON-019", "NPV", "NPV = Σ(CFt / (1+r)^t)",
     "Net present value", "STANDARD",
     ["CF", "r", "t"], ["NPV"], []),
    
    # Cost Per
    ("F-ECON-020", "Cost per Volume", "Cv = Cpart / Vremoved",
     "Cost per unit volume removed", "ENHANCED",
     ["Cpart", "Vremoved"], ["Cv"], ["F-OPT-010"]),
    
    ("F-ECON-021", "Cost per Feature", "Cf = Cpart / nfeatures",
     "Cost per machined feature", "ENHANCED",
     ["Cpart", "nfeatures"], ["Cf"], ["F-OPT-011"]),
    
    # Novel
    ("F-ECON-022", "Dynamic Pricing", "P(t) = P0 × f(demand, capacity, urgency)",
     "Real-time quote pricing", "INVENTION",
     ["P0", "demand", "capacity", "urgency"], ["P_dynamic"], []),
    
    ("F-ECON-023", "ML Cost Prediction", "Cpred = ML(features)",
     "Machine learning cost estimate", "INVENTION",
     ["features"], ["Cpred"], ["F-ECON-001"]),
    
    ("F-ECON-024", "Total Cost of Ownership", "TCO = Cacquisition + Σ(Coperation + Cmaintenance)",
     "Lifecycle cost", "ENHANCED",
     ["Cacquisition", "Coperation", "Cmaintenance"], ["TCO"], []),
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
    print("PRISM FORMULA EXPANSION WAVE 3")
    print("=" * 80)
    
    with open(r"C:\PRISM\registries\FORMULA_REGISTRY_WAVE2.json", 'r') as f:
        wave2 = json.load(f)
    prev = wave2.get("formulas", [])
    print(f"Loaded Wave 2: {len(prev)}")
    
    generators = [
        ("MATERIAL", MATERIAL_FORMULAS),
        ("PROCESS", PROCESS_FORMULAS),
        ("ECONOMICS", ECONOMICS_FORMULAS),
    ]
    
    all_formulas = prev.copy()
    for cat, formulas in generators:
        result = generate_formulas(cat, formulas)
        all_formulas.extend([f.to_dict() for f in result])
        print(f"  {cat}: {len(result)}")
    
    print(f"\nTotal Formulas: {len(all_formulas)}")
    
    output_path = r"C:\PRISM\registries\FORMULA_REGISTRY_WAVE3.json"
    registry = {
        "version": "3.0.0", "wave": 3,
        "generatedAt": datetime.now().isoformat(),
        "totalFormulas": len(all_formulas),
        "formulas": all_formulas
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    main()
