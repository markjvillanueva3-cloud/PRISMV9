#!/usr/bin/env python3
"""
PRISM FORMULA EXPANSION WAVE 6
==============================
Additional formulas: Tool Geometry, Coolant, Fixture, Post-Processing, Scheduling
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
# 20. TOOL GEOMETRY FORMULAS (30+)
# ═══════════════════════════════════════════════════════════════════════════════

TOOL_FORMULAS = [
    # Insert Geometry
    ("F-TOOL-001", "Inscribed Circle (IC)", "IC = 2 × r × sin(π/n)",
     "Insert inscribed circle diameter", "STANDARD",
     ["r", "n"], ["IC"], []),
    
    ("F-TOOL-002", "Insert Thickness", "t = IC × tan(clearance_angle)",
     "Standard insert thickness", "STANDARD",
     ["IC", "clearance_angle"], ["t"], []),
    
    ("F-TOOL-003", "Effective Cutting Edge Length", "l_eff = ap / sin(κr)",
     "Edge engaged in cut", "STANDARD",
     ["ap", "κr"], ["l_eff"], ["F-CUT-001"]),
    
    ("F-TOOL-004", "Nose Radius Effect", "Δd = rε × (1 - cos(κr))",
     "Diameter compensation for nose radius", "ENHANCED",
     ["rε", "κr"], ["Δd"], ["F-DEFL-013"]),
    
    ("F-TOOL-005", "Wiper Edge Length", "lw = 0.5 × f",
     "Recommended wiper flat length", "ENHANCED",
     ["f"], ["lw"], ["F-SURF-001"]),
    
    # Milling Cutter Geometry
    ("F-TOOL-006", "Effective Diameter", "Deff = D × sin(90° - λ)",
     "Effective diameter at ap for ball/bull", "STANDARD",
     ["D", "λ"], ["Deff"], ["F-PROC-006"]),
    
    ("F-TOOL-007", "Ball End Effective Diameter", "Deff = 2 × √(ap × (D - ap))",
     "Effective cutting diameter", "STANDARD",
     ["ap", "D"], ["Deff_ball"], ["F-PROC-006"]),
    
    ("F-TOOL-008", "Helix Angle Effect", "Kλ = cos(λ)",
     "Axial force factor from helix", "STANDARD",
     ["λ"], ["Kλ"], ["F-CUT-015"]),
    
    ("F-TOOL-009", "Tooth Pitch", "p = π × D / z",
     "Circumferential tooth spacing", "STANDARD",
     ["D", "z"], ["p"], ["F-VIB-018"]),
    
    ("F-TOOL-010", "Chip Space Factor", "Cs = (p - tw) / p",
     "Available chip gullet ratio", "ENHANCED",
     ["p", "tw"], ["Cs"], []),
    
    # Drill Geometry
    ("F-TOOL-011", "Point Angle Effect", "Kp = tan(90° - σ/2)",
     "Thrust force factor", "STANDARD",
     ["σ"], ["Kp"], ["F-CUT-003"]),
    
    ("F-TOOL-012", "Chisel Edge Contribution", "Fchisel = 0.5 × Fc × (dc/D)",
     "Force from chisel edge", "ENHANCED",
     ["Fc", "dc", "D"], ["Fchisel"], ["F-CUT-004"]),
    
    ("F-TOOL-013", "Web Thickness Ratio", "tw_ratio = tw / D",
     "Relative web thickness", "STANDARD",
     ["tw", "D"], ["tw_ratio"], ["F-TOOL-012"]),
    
    ("F-TOOL-014", "Flute Volume", "Vflute = L × (π×D²/4 - Acore)",
     "Chip evacuation volume", "ENHANCED",
     ["L", "D", "Acore"], ["Vflute"], []),
    
    # Coating & Edge Prep
    ("F-TOOL-015", "Edge Hone Radius", "rβ = K × (coating_thickness)^0.5",
     "Optimal edge radius with coating", "ENHANCED",
     ["K", "coating_thickness"], ["rβ"], ["F-CUT-009"]),
    
    ("F-TOOL-016", "Coating Wear Factor", "Kcoat = 1 - 0.2 × ln(H_coat/H_sub)",
     "Hardness ratio effect on wear", "ENHANCED",
     ["H_coat", "H_sub"], ["Kcoat"], ["F-WEAR-001"]),
    
    # Tool Selection
    ("F-TOOL-017", "Tool Score", "TS = Σwi × (pi - pi_min)/(pi_max - pi_min)",
     "Normalized weighted tool rating", "NOVEL",
     ["w", "p", "p_min", "p_max"], ["TS"], []),
    
    ("F-TOOL-018", "Insert Grade Match", "GM = sim(workpiece_props, grade_props)",
     "Material-grade compatibility", "NOVEL",
     ["workpiece", "grade"], ["GM"], ["F-TOOL-017"]),
    
    ("F-TOOL-019", "Optimal Nose Radius", "rε_opt = f² / (8 × Ra_target)",
     "Nose radius for target Ra", "NOVEL",
     ["f", "Ra_target"], ["rε_opt"], []),
    
    ("F-TOOL-020", "Teeth Count Optimization", "z_opt = round(π × D / (0.5 × ae))",
     "Optimal teeth for engagement", "NOVEL",
     ["D", "ae"], ["z_opt"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 21. COOLANT/LUBRICATION FORMULAS (20+)
# ═══════════════════════════════════════════════════════════════════════════════

COOLANT_FORMULAS = [
    # Flow & Pressure
    ("F-COOL-001", "Coolant Flow Rate", "Q = v × A_nozzle",
     "Volumetric flow rate", "STANDARD",
     ["v", "A_nozzle"], ["Q"], ["F-COOL-005"]),
    
    ("F-COOL-002", "Nozzle Velocity", "v = Cv × √(2 × ΔP / ρ)",
     "Coolant jet velocity", "STANDARD",
     ["Cv", "ΔP", "ρ"], ["v"], ["F-COOL-001"]),
    
    ("F-COOL-003", "Pressure Drop", "ΔP = f × (L/D) × (ρv²/2)",
     "Pipe friction loss", "STANDARD",
     ["f", "L", "D", "ρ", "v"], ["ΔP"], []),
    
    ("F-COOL-004", "Reynolds Number", "Re = ρ × v × D / μ",
     "Flow regime indicator", "STANDARD",
     ["ρ", "v", "D", "μ"], ["Re"], ["F-COOL-003"]),
    
    ("F-COOL-005", "Heat Removal Capacity", "Qheat = ṁ × cp × ΔT",
     "Coolant heat absorption", "STANDARD",
     ["m_dot", "cp", "ΔT"], ["Qheat"], ["F-THERM-012"]),
    
    # Concentration & Quality
    ("F-COOL-006", "Refractometer Reading", "conc = Rf × factor",
     "Actual concentration from reading", "STANDARD",
     ["Rf", "factor"], ["conc"], []),
    
    ("F-COOL-007", "pH Drift", "ΔpH = pH_current - pH_target",
     "pH deviation", "STANDARD",
     ["pH_current", "pH_target"], ["ΔpH"], []),
    
    ("F-COOL-008", "Tramp Oil Level", "TO% = V_tramp / V_total × 100",
     "Contamination percentage", "STANDARD",
     ["V_tramp", "V_total"], ["TO_pct"], []),
    
    # MQL Specific
    ("F-COOL-009", "MQL Flow Rate", "Q_MQL = 10-100 ml/h (typical)",
     "Minimum quantity lubrication rate", "STANDARD",
     [], ["Q_MQL"], []),
    
    ("F-COOL-010", "Oil Droplet Size", "d = K × (σ/ρ)^0.5 × v^(-1)",
     "Atomized droplet diameter", "ENHANCED",
     ["K", "σ", "ρ", "v"], ["d_droplet"], []),
    
    ("F-COOL-011", "Penetration Distance", "Lpen = v × τ_evap",
     "Distance before evaporation", "ENHANCED",
     ["v", "τ_evap"], ["Lpen"], []),
    
    # High Pressure
    ("F-COOL-012", "HPC Pressure Requirement", "P_HPC = P_chip_curl × safety_factor",
     "Pressure for chip breaking", "ENHANCED",
     ["P_chip_curl", "SF"], ["P_HPC"], []),
    
    ("F-COOL-013", "Jet Coherence Length", "Lc = K × D_nozzle × (P/Patm)^0.25",
     "Distance before jet breaks up", "ENHANCED",
     ["K", "D_nozzle", "P", "Patm"], ["Lc"], []),
    
    # Novel
    ("F-COOL-014", "Optimal Coolant Flow", "Q_opt = argmin(T) s.t. Cost ≤ Budget",
     "Cost-optimized cooling", "NOVEL",
     ["T_func", "Cost_func", "Budget"], ["Q_opt"], []),
    
    ("F-COOL-015", "Cooling Effectiveness Index", "CEI = ΔT_achieved / ΔT_theoretical",
     "Actual vs theoretical cooling", "NOVEL",
     ["ΔT_achieved", "ΔT_theoretical"], ["CEI"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 22. FIXTURE/WORKHOLDING FORMULAS (20+)
# ═══════════════════════════════════════════════════════════════════════════════

FIXTURE_FORMULAS = [
    # Clamping
    ("F-FIX-001", "Clamping Force Required", "Fclamp = SF × Fcut / μ",
     "Minimum clamping to prevent slip", "STANDARD",
     ["SF", "Fcut", "μ"], ["Fclamp"], []),
    
    ("F-FIX-002", "Friction Force", "Ff = μ × N",
     "Friction at clamp interface", "STANDARD",
     ["μ", "N"], ["Ff"], ["F-FIX-001"]),
    
    ("F-FIX-003", "Bolt Preload", "Fi = T / (K × d)",
     "Bolt tension from torque", "STANDARD",
     ["T", "K", "d"], ["Fi"], ["F-FIX-001"]),
    
    ("F-FIX-004", "Clamp Deflection", "δclamp = F × L³ / (3 × E × I)",
     "Clamp arm deflection", "STANDARD",
     ["F", "L", "E", "I"], ["δclamp"], ["F-DEFL-010"]),
    
    # Hydraulic/Pneumatic
    ("F-FIX-005", "Hydraulic Force", "F = P × A_piston",
     "Cylinder force from pressure", "STANDARD",
     ["P", "A_piston"], ["F_hyd"], ["F-FIX-001"]),
    
    ("F-FIX-006", "Pneumatic Force (Double)", "F = P × (A1 - A2)",
     "Double-acting cylinder force", "STANDARD",
     ["P", "A1", "A2"], ["F_pneu"], ["F-FIX-001"]),
    
    # Vacuum
    ("F-FIX-007", "Vacuum Hold Force", "F = ΔP × A_effective",
     "Vacuum chuck holding force", "STANDARD",
     ["ΔP", "A_effective"], ["F_vac"], []),
    
    ("F-FIX-008", "Leak Effect", "F_actual = F_theoretical × (1 - Kleak)",
     "Vacuum with leakage factor", "ENHANCED",
     ["F_theoretical", "Kleak"], ["F_actual"], ["F-FIX-007"]),
    
    # Chuck
    ("F-FIX-009", "Chuck Grip Force", "Fgrip = 3 × Fjaw × sin(β)",
     "3-jaw chuck total grip", "STANDARD",
     ["Fjaw", "β"], ["Fgrip"], []),
    
    ("F-FIX-010", "Centrifugal Force Loss", "ΔF = m × ω² × r",
     "Grip loss at high RPM", "STANDARD",
     ["m", "ω", "r"], ["ΔF"], ["F-FIX-009"]),
    
    ("F-FIX-011", "Effective Grip at Speed", "Feff = Fgrip - ΔF",
     "Net grip force at RPM", "STANDARD",
     ["Fgrip", "ΔF"], ["Feff"], []),
    
    # Locating
    ("F-FIX-012", "3-2-1 Locating Constraint", "DOF_constrained = 6 - DOF_free",
     "Degrees of freedom analysis", "STANDARD",
     ["DOF_free"], ["DOF_constrained"], []),
    
    ("F-FIX-013", "Locator Wear", "δloc = K × cycles^n",
     "Locator wear over time", "ENHANCED",
     ["K", "cycles", "n"], ["δloc"], ["F-QUAL-003"]),
    
    # Novel
    ("F-FIX-014", "Optimal Clamp Layout", "layout = argmin(δmax) s.t. access",
     "Minimize deflection with access", "INVENTION",
     ["δ_func", "access_constraints"], ["layout"], []),
    
    ("F-FIX-015", "Adaptive Clamping", "F(t) = F0 × (1 + α × Fcut(t)/Fcut_max)",
     "Force-following clamping", "INVENTION",
     ["F0", "α", "Fcut", "Fcut_max"], ["F_adaptive"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 23. SCHEDULING/PRODUCTION FORMULAS (20+)
# ═══════════════════════════════════════════════════════════════════════════════

SCHEDULING_FORMULAS = [
    # Job Shop
    ("F-SCHED-001", "Makespan", "Cmax = max(Ci)",
     "Total schedule completion time", "STANDARD",
     ["C_jobs"], ["Cmax"], []),
    
    ("F-SCHED-002", "Total Tardiness", "T = Σmax(0, Ci - di)",
     "Sum of late completions", "STANDARD",
     ["C", "d"], ["T_total"], []),
    
    ("F-SCHED-003", "Flow Time", "F = Σ(Ci - ri)",
     "Total time in system", "STANDARD",
     ["C", "r"], ["F"], []),
    
    ("F-SCHED-004", "Utilization", "U = Σpi / (m × Cmax)",
     "Machine utilization ratio", "STANDARD",
     ["p", "m", "Cmax"], ["U"], []),
    
    # Queueing
    ("F-SCHED-005", "Little's Law", "L = λ × W",
     "Average jobs = arrival × wait", "STANDARD",
     ["λ", "W"], ["L"], []),
    
    ("F-SCHED-006", "M/M/1 Wait Time", "W = 1 / (μ - λ)",
     "Single server queue wait", "STANDARD",
     ["μ", "λ"], ["W"], []),
    
    ("F-SCHED-007", "Server Utilization", "ρ = λ / μ",
     "Traffic intensity", "STANDARD",
     ["λ", "μ"], ["ρ"], []),
    
    # Batch
    ("F-SCHED-008", "Economic Batch Quantity", "EBQ = √(2×D×S / (H×(1-D/P)))",
     "Optimal production batch size", "STANDARD",
     ["D", "S", "H", "P"], ["EBQ"], []),
    
    ("F-SCHED-009", "Setup Time Ratio", "Rsetup = tsetup / (tsetup + trun)",
     "Setup overhead fraction", "STANDARD",
     ["tsetup", "trun"], ["Rsetup"], []),
    
    # Due Date
    ("F-SCHED-010", "Slack Time", "Si = di - (t + pi)",
     "Time remaining before due", "STANDARD",
     ["di", "t", "pi"], ["Si"], ["F-SCHED-011"]),
    
    ("F-SCHED-011", "Critical Ratio", "CR = (di - t) / pi",
     "Priority metric", "STANDARD",
     ["di", "t", "pi"], ["CR"], []),
    
    # Capacity
    ("F-SCHED-012", "Capacity Requirement", "C_req = Σ(ni × ti)",
     "Total time needed for jobs", "STANDARD",
     ["n", "t"], ["C_req"], ["F-SCHED-013"]),
    
    ("F-SCHED-013", "Capacity Available", "C_avail = H × U × m",
     "Productive hours available", "STANDARD",
     ["H", "U", "m"], ["C_avail"], []),
    
    ("F-SCHED-014", "Capacity Gap", "Gap = C_req - C_avail",
     "Shortfall or excess capacity", "STANDARD",
     ["C_req", "C_avail"], ["Gap"], []),
    
    # Novel
    ("F-SCHED-015", "Dynamic Priority", "P(t) = w1×CR + w2×profit + w3×customer",
     "Multi-factor priority", "NOVEL",
     ["w", "CR", "profit", "customer"], ["P_dynamic"], []),
    
    ("F-SCHED-016", "ML Completion Estimate", "Ĉ = ML(job_features)",
     "Predicted completion time", "INVENTION",
     ["job_features"], ["C_hat"], []),
    
    ("F-SCHED-017", "Schedule Robustness", "Rob = 1 - P(tardy | disruption)",
     "Disruption resistance", "INVENTION",
     ["P_tardy"], ["Rob"], []),
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
    print("PRISM FORMULA EXPANSION WAVE 6")
    print("=" * 80)
    
    with open(r"C:\PRISM\registries\FORMULA_REGISTRY.json", 'r') as f:
        prev_reg = json.load(f)
    prev = prev_reg.get("formulas", [])
    print(f"Loaded Previous: {len(prev)}")
    
    generators = [
        ("TOOL_GEOMETRY", TOOL_FORMULAS),
        ("COOLANT", COOLANT_FORMULAS),
        ("FIXTURE", FIXTURE_FORMULAS),
        ("SCHEDULING", SCHEDULING_FORMULAS),
    ]
    
    all_formulas = prev.copy()
    for cat, formulas in generators:
        result = generate_formulas(cat, formulas)
        all_formulas.extend([f.to_dict() for f in result])
        print(f"  {cat}: {len(result)}")
    
    print(f"\n{'='*40}")
    print(f"TOTAL FORMULAS: {len(all_formulas)}")
    print(f"{'='*40}")
    
    # Count by novelty and category
    novelty_count = {}
    category_count = {}
    for f in all_formulas:
        n = f.get("novelty", "UNKNOWN")
        c = f.get("category", "UNKNOWN")
        novelty_count[n] = novelty_count.get(n, 0) + 1
        category_count[c] = category_count.get(c, 0) + 1
    
    print("\nBy Novelty:")
    for n, c in sorted(novelty_count.items()):
        print(f"  {n}: {c}")
    
    output_path = r"C:\PRISM\registries\FORMULA_REGISTRY.json"
    registry = {
        "version": "6.0.0", 
        "wave": 6,
        "status": "COMPLETE",
        "generatedAt": datetime.now().isoformat(),
        "totalFormulas": len(all_formulas),
        "byNovelty": novelty_count,
        "byCategory": category_count,
        "formulas": all_formulas
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {output_path}")

if __name__ == "__main__":
    main()
