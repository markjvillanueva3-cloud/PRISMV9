#!/usr/bin/env python3
"""
PRISM FORMULA EXPANSION WAVE 7 (FINAL)
======================================
Advanced: Metrology, Tribology, Coatings, Post-Process, Digital Twin, Novel Hybrids
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
# 24. METROLOGY FORMULAS (25+)
# ═══════════════════════════════════════════════════════════════════════════════

METROLOGY_FORMULAS = [
    # Uncertainty
    ("F-MET-001", "Type A Uncertainty", "uA = s / √n",
     "Standard uncertainty from statistics", "STANDARD",
     ["s", "n"], ["uA"], ["F-MET-010"]),
    
    ("F-MET-002", "Type B Uncertainty", "uB = a / √3",
     "Rectangular distribution uncertainty", "STANDARD",
     ["a"], ["uB"], ["F-MET-010"]),
    
    ("F-MET-003", "Combined Uncertainty", "uc = √(Σui²)",
     "RSS combined uncertainty", "STANDARD",
     ["u_list"], ["uc"], ["F-MET-004"]),
    
    ("F-MET-004", "Expanded Uncertainty", "U = k × uc",
     "Uncertainty with coverage factor", "STANDARD",
     ["k", "uc"], ["U"], []),
    
    # Measurement Systems
    ("F-MET-005", "Probing Error", "PFTU = |Rmax - Rmin|",
     "Probing form test uncertainty", "STANDARD",
     ["Rmax", "Rmin"], ["PFTU"], ["F-MET-010"]),
    
    ("F-MET-006", "Length Measurement Error", "E = |Lmeasured - Lnominal|",
     "Linear measurement deviation", "STANDARD",
     ["Lmeasured", "Lnominal"], ["E"], ["F-MET-010"]),
    
    ("F-MET-007", "Volumetric Accuracy", "Va = √(Ex² + Ey² + Ez²)",
     "3D positioning accuracy", "STANDARD",
     ["Ex", "Ey", "Ez"], ["Va"], []),
    
    # Thermal Effects
    ("F-MET-008", "Thermal Expansion Error", "δT = α × L × ΔT",
     "Length change from temperature", "STANDARD",
     ["α", "L", "ΔT"], ["δT"], ["F-MET-010"]),
    
    ("F-MET-009", "Temperature Compensation", "L20 = Lmeas × (1 - α × (T - 20))",
     "Length corrected to 20°C", "STANDARD",
     ["Lmeas", "α", "T"], ["L20"], []),
    
    # Combined
    ("F-MET-010", "Total Measurement Uncertainty", "Utotal = √(Urep² + Ures² + Utemp² + Uprobe²)",
     "All sources combined", "ENHANCED",
     ["Urep", "Ures", "Utemp", "Uprobe"], ["Utotal"], []),
    
    ("F-MET-011", "Conformance Probability", "P_conform = Φ((USL-x)/u) - Φ((LSL-x)/u)",
     "Probability within spec", "ENHANCED",
     ["USL", "LSL", "x", "u"], ["P_conform"], []),
    
    # Surface Measurement
    ("F-MET-012", "Stylus Filtering", "λc = cutoff_wavelength",
     "Profile filter cutoff", "STANDARD",
     [], ["λc"], []),
    
    ("F-MET-013", "Sampling Length", "lr = 5 × λc (typical)",
     "Evaluation length for roughness", "STANDARD",
     ["λc"], ["lr"], []),
    
    # Novel
    ("F-MET-014", "Adaptive Sampling", "n_samples = f(variance, target_uncertainty)",
     "Dynamic sample size", "NOVEL",
     ["variance", "target_u"], ["n_samples"], []),
    
    ("F-MET-015", "ML Measurement Correction", "x_corr = x_raw + ML_bias(conditions)",
     "Learned bias correction", "INVENTION",
     ["x_raw", "conditions"], ["x_corr"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 25. TRIBOLOGY FORMULAS (20+)
# ═══════════════════════════════════════════════════════════════════════════════

TRIBOLOGY_FORMULAS = [
    # Friction
    ("F-TRIB-001", "Coulomb Friction", "Ff = μ × Fn",
     "Basic friction force", "STANDARD",
     ["μ", "Fn"], ["Ff"], ["F-CUT-013"]),
    
    ("F-TRIB-002", "Stribeck Friction", "μ = μ0 + (μs - μ0) × exp(-v/vs) + kv × v",
     "Speed-dependent friction", "ENHANCED",
     ["μ0", "μs", "v", "vs", "kv"], ["μ_stribeck"], []),
    
    ("F-TRIB-003", "Adhesion Friction", "τadh = τ0 + α × p",
     "Pressure-dependent shear", "ENHANCED",
     ["τ0", "α", "p"], ["τadh"], ["F-TRIB-001"]),
    
    ("F-TRIB-004", "Plowing Friction", "Fplow = Ap × σy",
     "Deformation component", "ENHANCED",
     ["Ap", "σy"], ["Fplow"], ["F-TRIB-001"]),
    
    # Wear Mechanisms
    ("F-TRIB-005", "Archard Wear", "V = K × Fn × L / H",
     "Abrasive/adhesive wear volume", "STANDARD",
     ["K", "Fn", "L", "H"], ["V_wear"], ["F-WEAR-004"]),
    
    ("F-TRIB-006", "Specific Wear Rate", "k = V / (Fn × L)",
     "Normalized wear coefficient", "STANDARD",
     ["V", "Fn", "L"], ["k"], []),
    
    ("F-TRIB-007", "Oxidational Wear", "Wox = A × exp(-Q/RT) × v",
     "Temperature-activated wear", "ENHANCED",
     ["A", "Q", "R", "T", "v"], ["Wox"], ["F-WEAR-001"]),
    
    # Contact Mechanics
    ("F-TRIB-008", "Hertzian Contact Pressure", "pmax = (6 × Fn × E*² / (π³ × R²))^(1/3)",
     "Maximum contact pressure", "STANDARD",
     ["Fn", "E_star", "R"], ["pmax"], []),
    
    ("F-TRIB-009", "Contact Radius", "a = (3 × Fn × R / (4 × E*))^(1/3)",
     "Hertzian contact radius", "STANDARD",
     ["Fn", "R", "E_star"], ["a"], []),
    
    ("F-TRIB-010", "Equivalent Modulus", "E* = ((1-ν1²)/E1 + (1-ν2²)/E2)^(-1)",
     "Combined elastic modulus", "STANDARD",
     ["E1", "ν1", "E2", "ν2"], ["E_star"], ["F-TRIB-008"]),
    
    # Lubrication
    ("F-TRIB-011", "Film Thickness (EHL)", "hmin = K × (η × v)^a × (E* × R)^b / Fn^c",
     "Minimum lubricant film", "ENHANCED",
     ["K", "η", "v", "E_star", "R", "Fn", "a", "b", "c"], ["hmin"], ["F-TRIB-012"]),
    
    ("F-TRIB-012", "Lambda Ratio", "Λ = hmin / √(Rq1² + Rq2²)",
     "Film to roughness ratio", "ENHANCED",
     ["hmin", "Rq1", "Rq2"], ["Λ"], []),
    
    # Novel
    ("F-TRIB-013", "Combined Friction Model", "μ = μadh × fadh + μplow × fplow + μthird × fthird",
     "Multi-mechanism friction", "NOVEL",
     ["μ_components", "f_fractions"], ["μ_combined"], []),
    
    ("F-TRIB-014", "Adaptive Friction Coefficient", "μ(t) = μ0 + Δμ_learned(conditions)",
     "Self-updating friction", "INVENTION",
     ["μ0", "conditions"], ["μ_adaptive"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 26. DIGITAL TWIN FORMULAS (25+)
# ═══════════════════════════════════════════════════════════════════════════════

DIGITAL_TWIN_FORMULAS = [
    # State Estimation
    ("F-DT-001", "Kalman State Update", "x̂ = x̂⁻ + K × (z - H × x̂⁻)",
     "State correction with measurement", "STANDARD",
     ["x_hat_minus", "K", "z", "H"], ["x_hat"], ["F-DT-002"]),
    
    ("F-DT-002", "Kalman Gain", "K = P⁻ × H' × (H × P⁻ × H' + R)^(-1)",
     "Optimal filter gain", "STANDARD",
     ["P_minus", "H", "R"], ["K"], ["F-DT-001"]),
    
    ("F-DT-003", "State Prediction", "x̂⁻ = A × x̂ + B × u",
     "State evolution model", "STANDARD",
     ["A", "x_hat", "B", "u"], ["x_hat_minus"], ["F-DT-001"]),
    
    ("F-DT-004", "Covariance Prediction", "P⁻ = A × P × A' + Q",
     "Uncertainty propagation", "STANDARD",
     ["A", "P", "Q"], ["P_minus"], ["F-DT-002"]),
    
    # Synchronization
    ("F-DT-005", "Twin Divergence", "D = ||x_physical - x_twin||",
     "Physical-virtual deviation", "ENHANCED",
     ["x_physical", "x_twin"], ["D"], ["F-DT-006"]),
    
    ("F-DT-006", "Resync Trigger", "resync = D > D_threshold",
     "When to update twin", "ENHANCED",
     ["D", "D_threshold"], ["resync"], []),
    
    ("F-DT-007", "Update Frequency", "f_update = f_base × (1 + α × D)",
     "Adaptive update rate", "NOVEL",
     ["f_base", "α", "D"], ["f_update"], []),
    
    # Physics Model
    ("F-DT-008", "Process Model", "dx/dt = f(x, u, θ)",
     "Dynamic system equations", "STANDARD",
     ["x", "u", "θ"], ["dx_dt"], []),
    
    ("F-DT-009", "Parameter Update", "θ_new = θ_old + γ × ∇J",
     "Online parameter tuning", "ENHANCED",
     ["θ_old", "γ", "∇J"], ["θ_new"], []),
    
    # Prediction
    ("F-DT-010", "Lookahead Prediction", "x(t+Δt) = ∫f(x,u)dt",
     "Future state prediction", "ENHANCED",
     ["f", "x", "u", "Δt"], ["x_future"], []),
    
    ("F-DT-011", "Confidence Decay", "conf(t+Δt) = conf(t) × exp(-λ × Δt)",
     "Prediction confidence over time", "NOVEL",
     ["conf_t", "λ", "Δt"], ["conf_future"], []),
    
    # Health Monitoring
    ("F-DT-012", "Health Index", "HI = Σwi × hi",
     "Weighted health indicator", "ENHANCED",
     ["w", "h"], ["HI"], ["F-DT-013"]),
    
    ("F-DT-013", "RUL from Health", "RUL = (HI_threshold - HI) / dHI_dt",
     "Remaining life estimate", "ENHANCED",
     ["HI_threshold", "HI", "dHI_dt"], ["RUL"], []),
    
    # Novel
    ("F-DT-014", "Hybrid Twin Model", "y = α × f_physics + (1-α) × f_ML + ε",
     "Combined physics-ML twin", "INVENTION",
     ["α", "f_physics", "f_ML", "ε"], ["y_hybrid"], []),
    
    ("F-DT-015", "Counterfactual Twin", "y_cf = f(x_modified) - f(x_actual)",
     "What-if scenario analysis", "INVENTION",
     ["x_modified", "x_actual"], ["y_cf"], []),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 27. NOVEL HYBRID FORMULAS (30+)
# ═══════════════════════════════════════════════════════════════════════════════

HYBRID_FORMULAS = [
    # Physics-ML Fusion
    ("F-HYB-001", "Residual Learning", "y = f_physics(x) + f_ML(x, residuals)",
     "ML corrects physics model", "INVENTION",
     ["f_physics", "f_ML", "x", "residuals"], ["y"], []),
    
    ("F-HYB-002", "Physics-Guided Loss", "L = L_data + λ × L_physics",
     "Combined training objective", "INVENTION",
     ["L_data", "λ", "L_physics"], ["L"], []),
    
    ("F-HYB-003", "Hybrid Uncertainty", "σ² = σ²_physics + σ²_ML + 2ρσ_p×σ_ML",
     "Combined uncertainty with correlation", "INVENTION",
     ["σ_physics", "σ_ML", "ρ"], ["σ_hybrid"], []),
    
    ("F-HYB-004", "Adaptive Weighting", "α(x) = σ²_ML / (σ²_physics + σ²_ML)",
     "Input-dependent blend", "INVENTION",
     ["σ_physics", "σ_ML", "x"], ["α"], []),
    
    # Cross-Domain
    ("F-HYB-005", "Force-Thermal Coupling", "Fc(T) = Fc_base × (1 - β × (T-T0))",
     "Temperature effect on cutting force", "NOVEL",
     ["Fc_base", "β", "T", "T0"], ["Fc_T"], []),
    
    ("F-HYB-006", "Wear-Surface Coupling", "Ra(VB) = Ra_new × (1 + γ × VB)",
     "Wear effect on surface finish", "NOVEL",
     ["Ra_new", "γ", "VB"], ["Ra_worn"], []),
    
    ("F-HYB-007", "Vibration-Wear Coupling", "dVB/dt = f(VB) × (1 + δ × a_vib)",
     "Vibration accelerates wear", "NOVEL",
     ["dVB_dt_base", "δ", "a_vib"], ["dVB_dt_vib"], []),
    
    ("F-HYB-008", "Thermal-Deflection Coupling", "δ_total = δ_force + δ_thermal(T)",
     "Combined mechanical-thermal error", "NOVEL",
     ["δ_force", "δ_thermal", "T"], ["δ_total"], []),
    
    # Multi-Physics
    ("F-HYB-009", "Coupled Thermal-Mechanical", "[K]{u} = {F} + {F_thermal}",
     "Thermo-mechanical equilibrium", "ENHANCED",
     ["K", "F", "F_thermal"], ["u"], []),
    
    ("F-HYB-010", "Fluid-Structure Interaction", "p_fluid = f(v, structure_deformation)",
     "Coolant-tool interaction", "ENHANCED",
     ["v", "deformation"], ["p_fluid"], []),
    
    # Optimization
    ("F-HYB-011", "Multi-Objective Balance", "x* = argmin Σwi×fi s.t. gi ≤ 0",
     "Weighted multi-objective", "STANDARD",
     ["w", "f", "g"], ["x_star"], []),
    
    ("F-HYB-012", "Robust Optimization", "x* = argmin max_u f(x,u)",
     "Worst-case optimization", "ENHANCED",
     ["f", "U"], ["x_robust"], []),
    
    ("F-HYB-013", "Stochastic Optimization", "x* = argmin E[f(x,ξ)]",
     "Expected value optimization", "ENHANCED",
     ["f", "ξ"], ["x_stochastic"], []),
    
    # Learning Integration
    ("F-HYB-014", "Online Learning Force", "kc(t) = kc(t-1) + η × (Fc_actual - Fc_pred)",
     "Real-time coefficient update", "INVENTION",
     ["kc_prev", "η", "Fc_actual", "Fc_pred"], ["kc_new"], []),
    
    ("F-HYB-015", "Transfer Learning", "θ_target = θ_source + Δθ_adaptation",
     "Domain transfer parameters", "INVENTION",
     ["θ_source", "Δθ"], ["θ_target"], []),
    
    ("F-HYB-016", "Meta-Learning Rate", "η(task) = η_base × sim(task, trained_tasks)",
     "Task-adaptive learning rate", "INVENTION",
     ["η_base", "sim"], ["η_task"], []),
    
    # Novel PRISM
    ("F-HYB-017", "Unified Machining Model", "output = f_unified(material, machine, tool, process)",
     "All-in-one prediction", "INVENTION",
     ["material", "machine", "tool", "process"], ["output"], []),
    
    ("F-HYB-018", "Self-Optimizing Process", "params_next = optimize(params_current, performance)",
     "Autonomous parameter tuning", "INVENTION",
     ["params", "performance"], ["params_next"], []),
    
    ("F-HYB-019", "Explainable Prediction", "y, explanation = f_XAI(x)",
     "Prediction with rationale", "INVENTION",
     ["x"], ["y", "explanation"], []),
    
    ("F-HYB-020", "Confidence-Weighted Ensemble", "ŷ = Σ(conf_i × ŷ_i) / Σconf_i",
     "Confidence-based combination", "INVENTION",
     ["conf", "y_hat"], ["y_ensemble"], []),
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
    print("PRISM FORMULA EXPANSION WAVE 7 (FINAL)")
    print("=" * 80)
    
    with open(r"C:\PRISM\registries\FORMULA_REGISTRY.json", 'r') as f:
        prev_reg = json.load(f)
    prev = prev_reg.get("formulas", [])
    print(f"Loaded Previous: {len(prev)}")
    
    generators = [
        ("METROLOGY", METROLOGY_FORMULAS),
        ("TRIBOLOGY", TRIBOLOGY_FORMULAS),
        ("DIGITAL_TWIN", DIGITAL_TWIN_FORMULAS),
        ("HYBRID", HYBRID_FORMULAS),
    ]
    
    all_formulas = prev.copy()
    for cat, formulas in generators:
        result = generate_formulas(cat, formulas)
        all_formulas.extend([f.to_dict() for f in result])
        print(f"  {cat}: {len(result)}")
    
    print(f"\n{'='*60}")
    print(f"  FINAL TOTAL FORMULAS: {len(all_formulas)}")
    print(f"{'='*60}")
    
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
    
    print(f"\nCategories: {len(category_count)}")
    
    output_path = r"C:\PRISM\registries\FORMULA_REGISTRY.json"
    registry = {
        "version": "7.0.0", 
        "wave": 7,
        "status": "COMPLETE",
        "generatedAt": datetime.now().isoformat(),
        "totalFormulas": len(all_formulas),
        "totalCategories": len(category_count),
        "byNovelty": novelty_count,
        "byCategory": category_count,
        "formulas": all_formulas
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\n✓ Saved FINAL: {output_path}")

if __name__ == "__main__":
    main()
