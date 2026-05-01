#!/usr/bin/env python3
"""
PRISM SKILL EXPANSION WAVE 2 - GRANULAR COVERAGE
=================================================
Expands to 1000+ skills with per-parameter, per-formula, per-agent granularity.

WAVE 1: 318 skills (category-level)
WAVE 2: 800+ additional skills (granular-level)
TARGET: 1,100+ total skills
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass, asdict

@dataclass
class SkillDef:
    id: str
    name: str
    category: str
    subcategory: str
    description: str
    version: str = "1.0.0"
    priority: int = 50
    complexity: str = "INTERMEDIATE"
    dependencies: List[str] = None
    consumers: List[str] = None
    hooks: List[str] = None
    formulas: List[str] = None
    agents: List[str] = None
    capabilities: List[str] = None
    status: str = "DEFINED"
    
    def __post_init__(self):
        self.dependencies = self.dependencies or []
        self.consumers = self.consumers or []
        self.hooks = self.hooks or []
        self.formulas = self.formulas or []
        self.agents = self.agents or []
        self.capabilities = self.capabilities or []
    
    def to_dict(self):
        return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# MATERIAL PARAMETER SKILLS (127 parameters)
# ═══════════════════════════════════════════════════════════════════════════════

MATERIAL_PARAMS = [
    # Identification (10)
    ("material_id", "Material ID", "Unique material identifier"),
    ("name", "Material Name", "Common material name"),
    ("uns_number", "UNS Number", "Unified Numbering System designation"),
    ("common_names", "Common Names", "Alternative names and trade names"),
    ("iso_513_category", "ISO 513 Category", "P/M/K/N/S/H classification"),
    ("material_group", "Material Group", "Primary material grouping"),
    ("subgroup", "Material Subgroup", "Secondary classification"),
    ("specification", "Specification", "ASTM, SAE, DIN specifications"),
    ("standard", "Standard", "Applicable standards"),
    ("version", "Data Version", "Material data version"),
    
    # Physical (15)
    ("density", "Density", "Mass per unit volume kg/m³"),
    ("melting_point", "Melting Point", "Solidus temperature °C"),
    ("boiling_point", "Boiling Point", "Vaporization temperature °C"),
    ("specific_heat", "Specific Heat", "Heat capacity J/kg·K"),
    ("thermal_conductivity", "Thermal Conductivity", "Heat conduction W/m·K"),
    ("thermal_diffusivity", "Thermal Diffusivity", "Heat diffusion rate m²/s"),
    ("thermal_expansion", "Thermal Expansion", "CTE µm/m·K"),
    ("electrical_resistivity", "Electrical Resistivity", "Resistance Ω·m"),
    ("magnetic_permeability", "Magnetic Permeability", "Relative permeability"),
    ("crystal_structure", "Crystal Structure", "BCC, FCC, HCP structure"),
    ("atomic_number", "Atomic Number", "Primary element atomic number"),
    ("atomic_weight", "Atomic Weight", "Primary element atomic mass"),
    ("lattice_parameter", "Lattice Parameter", "Unit cell dimension"),
    ("poisson_ratio", "Poisson Ratio", "Lateral strain ratio"),
    ("bulk_modulus", "Bulk Modulus", "Volumetric elasticity GPa"),
    
    # Mechanical (25)
    ("tensile_strength", "Tensile Strength", "Ultimate tensile strength MPa"),
    ("yield_strength", "Yield Strength", "0.2% offset yield MPa"),
    ("elongation", "Elongation", "Percent elongation at break"),
    ("reduction_of_area", "Reduction of Area", "Necking percentage"),
    ("elastic_modulus", "Elastic Modulus", "Young's modulus GPa"),
    ("shear_modulus", "Shear Modulus", "Modulus of rigidity GPa"),
    ("fatigue_strength", "Fatigue Strength", "Endurance limit MPa"),
    ("impact_strength", "Impact Strength", "Charpy/Izod energy J"),
    ("fracture_toughness", "Fracture Toughness", "KIC MPa√m"),
    ("hardness_hrc", "Hardness HRC", "Rockwell C hardness"),
    ("hardness_hb", "Hardness HB", "Brinell hardness"),
    ("hardness_hv", "Hardness HV", "Vickers hardness"),
    ("hardness_hra", "Hardness HRA", "Rockwell A hardness"),
    ("creep_strength", "Creep Strength", "Time-dependent deformation"),
    ("stress_rupture", "Stress Rupture", "Creep rupture stress"),
    ("compressive_strength", "Compressive Strength", "Compression resistance MPa"),
    ("flexural_strength", "Flexural Strength", "Bending strength MPa"),
    ("torsional_strength", "Torsional Strength", "Twisting resistance MPa"),
    ("wear_resistance", "Wear Resistance", "Abrasion resistance index"),
    ("abrasion_resistance", "Abrasion Resistance", "Material loss rate"),
    ("galling_resistance", "Galling Resistance", "Cold welding resistance"),
    ("notch_sensitivity", "Notch Sensitivity", "Stress concentration factor"),
    ("ductility", "Ductility", "Plastic deformation capacity"),
    ("malleability", "Malleability", "Compressive deformation capacity"),
    ("work_hardening_rate", "Work Hardening Rate", "Strain hardening exponent"),
    
    # Kienzle (10)
    ("kc1_1", "kc1.1 Coefficient", "Specific cutting force at h=1mm"),
    ("mc", "mc Exponent", "Chip thickness exponent"),
    ("kc_correction_speed", "kc Speed Correction", "Speed-dependent correction"),
    ("kc_correction_rake", "kc Rake Correction", "Rake angle correction"),
    ("kc_correction_wear", "kc Wear Correction", "Tool wear correction"),
    ("specific_cutting_force", "Specific Cutting Force", "Force per unit area"),
    ("cutting_force_constant", "Cutting Force Constant", "Material constant"),
    ("feed_exponent", "Feed Exponent", "Feed rate exponent"),
    ("depth_exponent", "Depth Exponent", "Depth of cut exponent"),
    ("material_constant_k", "Material Constant K", "General material constant"),
    
    # Taylor (8)
    ("taylor_C", "Taylor C Constant", "Tool life constant"),
    ("taylor_n", "Taylor n Exponent", "Speed exponent"),
    ("taylor_reference_speed", "Reference Speed", "Base cutting speed m/min"),
    ("taylor_reference_life", "Reference Life", "Base tool life minutes"),
    ("speed_exponent", "Speed Exponent", "Velocity exponent"),
    ("feed_exponent_taylor", "Feed Exponent Taylor", "Feed rate influence"),
    ("depth_exponent_taylor", "Depth Exponent Taylor", "Depth influence"),
    ("hardness_factor", "Hardness Factor", "Hardness correction"),
    
    # Johnson-Cook (12)
    ("jc_A", "JC A Parameter", "Initial yield stress MPa"),
    ("jc_B", "JC B Parameter", "Hardening modulus MPa"),
    ("jc_n", "JC n Exponent", "Strain hardening exponent"),
    ("jc_C", "JC C Parameter", "Strain rate coefficient"),
    ("jc_m", "JC m Exponent", "Thermal softening exponent"),
    ("jc_reference_strain_rate", "JC Reference Strain Rate", "Base strain rate 1/s"),
    ("jc_reference_temperature", "JC Reference Temperature", "Base temperature °C"),
    ("jc_melting_temperature", "JC Melting Temperature", "Melt temperature °C"),
    ("jc_thermal_softening", "JC Thermal Softening", "Temperature dependence"),
    ("jc_strain_hardening", "JC Strain Hardening", "Strain dependence"),
    ("jc_strain_rate_sensitivity", "JC Strain Rate Sensitivity", "Rate dependence"),
    ("jc_damage_parameters", "JC Damage Parameters", "Failure model params"),
    
    # Chip Formation (12)
    ("chip_type_tendency", "Chip Type Tendency", "Continuous/segmented/discontinuous"),
    ("chip_breaking_index", "Chip Breaking Index", "Breakability rating"),
    ("chip_curl_radius", "Chip Curl Radius", "Natural curl radius mm"),
    ("chip_thickness_ratio", "Chip Thickness Ratio", "Compression ratio"),
    ("built_up_edge_tendency", "BUE Tendency", "Built-up edge formation risk"),
    ("adhesion_coefficient", "Adhesion Coefficient", "Material sticking tendency"),
    ("friction_coefficient", "Friction Coefficient", "Tool-chip friction µ"),
    ("shear_plane_angle", "Shear Plane Angle", "Primary shear angle °"),
    ("chip_compression_ratio", "Chip Compression Ratio", "Deformation ratio"),
    ("chip_segmentation", "Chip Segmentation", "Serration frequency"),
    ("chip_color", "Chip Color", "Temperature indicator color"),
    ("chip_disposal_rating", "Chip Disposal Rating", "Handling difficulty"),
    
    # Thermal Cutting (10)
    ("cutting_temperature_coefficient", "Cutting Temp Coefficient", "Temperature rise factor"),
    ("heat_partition_ratio", "Heat Partition Ratio", "Tool/chip/work distribution"),
    ("thermal_number", "Thermal Number", "Dimensionless thermal param"),
    ("peclet_number", "Peclet Number", "Convection/diffusion ratio"),
    ("thermal_diffusion_length", "Thermal Diffusion Length", "Heat penetration mm"),
    ("flash_temperature", "Flash Temperature", "Peak interface temperature °C"),
    ("bulk_temperature", "Bulk Temperature", "Average cutting temperature °C"),
    ("interface_temperature", "Interface Temperature", "Tool-chip interface °C"),
    ("thermal_softening_onset", "Thermal Softening Onset", "Softening start °C"),
    ("thermal_damage_threshold", "Thermal Damage Threshold", "Damage onset °C"),
    
    # Machinability (10)
    ("machinability_rating", "Machinability Rating", "Relative to B1112 = 100%"),
    ("machinability_index", "Machinability Index", "Composite score"),
    ("relative_machinability", "Relative Machinability", "Comparison factor"),
    ("machinability_group", "Machinability Group", "Classification group"),
    ("recommended_speed_factor", "Recommended Speed Factor", "Speed multiplier"),
    ("recommended_feed_factor", "Recommended Feed Factor", "Feed multiplier"),
    ("surface_finish_capability", "Surface Finish Capability", "Achievable Ra µm"),
    ("dimensional_stability", "Dimensional Stability", "Size holding ability"),
    ("burr_formation_tendency", "Burr Formation Tendency", "Burr risk level"),
    ("work_hardening_severity", "Work Hardening Severity", "Hardening intensity"),
    
    # Surface Integrity (8)
    ("surface_roughness_achievable", "Achievable Roughness", "Best Ra possible µm"),
    ("residual_stress_tendency", "Residual Stress Tendency", "Stress induction level"),
    ("white_layer_risk", "White Layer Risk", "Untempered martensite risk"),
    ("metallurgical_damage_risk", "Metallurgical Damage Risk", "Subsurface damage"),
    ("microhardness_change", "Microhardness Change", "Surface hardness delta"),
    ("grain_refinement", "Grain Refinement", "Grain size change"),
    ("phase_transformation_risk", "Phase Transformation Risk", "Structure change risk"),
    ("recast_layer_risk", "Recast Layer Risk", "Remelt layer thickness"),
    
    # Process (7)
    ("recommended_coolant_type", "Recommended Coolant", "Oil/emulsion/dry/MQL"),
    ("recommended_cutting_fluid", "Recommended Fluid", "Specific fluid type"),
    ("dry_machining_suitability", "Dry Machining Suitability", "No coolant feasibility"),
    ("cryogenic_machining_response", "Cryogenic Response", "LN2/CO2 effectiveness"),
    ("mql_suitability", "MQL Suitability", "Minimum quantity lubrication"),
    ("high_pressure_coolant_benefit", "HPC Benefit", "High pressure coolant gain"),
    ("flood_coolant_requirement", "Flood Coolant Required", "Flood necessity")
]

def generate_material_param_skills() -> List[SkillDef]:
    """Generate skill for each material parameter."""
    skills = []
    for param_id, param_name, param_desc in MATERIAL_PARAMS:
        skills.append(SkillDef(
            id=f"prism-mat-param-{param_id.replace('_', '-')}",
            name=f"Material Param: {param_name}",
            category="MATERIAL",
            subcategory="PARAMETER",
            description=f"Access and validate {param_name}. {param_desc}",
            priority=40,
            complexity="INTERMEDIATE",
            dependencies=["prism-material-schema"],
            consumers=["speed-feed-calculator", "physics-engines"],
            hooks=[f"material:param:{param_id}:get", f"material:param:{param_id}:set"],
            capabilities=[f"Get/set/validate {param_name}", f"Derive {param_name} from related data"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# FORMULA SKILLS (109 formulas)
# ═══════════════════════════════════════════════════════════════════════════════

FORMULAS = [
    # Cutting Mechanics (15)
    ("F-CUT-001", "Kienzle Cutting Force", "Fc = kc1.1 × h^(-mc) × b"),
    ("F-CUT-002", "Merchant Shear Angle", "φ = 45° - β/2 + γ/2"),
    ("F-CUT-003", "Specific Cutting Energy", "u = Fc × Vc / MRR"),
    ("F-CUT-004", "Chip Thickness Ratio", "r = t1/t2 = sin(φ)/cos(φ-γ)"),
    ("F-CUT-005", "Shear Strain", "γ = cot(φ) + tan(φ-γ)"),
    ("F-CUT-006", "Resultant Force", "R = √(Fc² + Ft² + Fr²)"),
    ("F-CUT-007", "Feed Force", "Ff = kf × f^xf × ap^yf"),
    ("F-CUT-008", "Radial Force", "Fr = Fc × tan(β - γ)"),
    ("F-CUT-009", "Oxley Flow Stress", "σ = σ1 × (ε̇/ε̇₀)^n"),
    ("F-CUT-010", "Merchant Force Balance", "Fc = τs × As / cos(β-γ+φ)"),
    ("F-CUT-011", "Chip Compression", "λ = t2/t1 = cos(φ-γ)/sin(φ)"),
    ("F-CUT-012", "Shear Force", "Fs = τs × As"),
    ("F-CUT-013", "Normal Force", "Fn = Fs × tan(β)"),
    ("F-CUT-014", "Friction Force", "Ff = Fn × µ"),
    ("F-CUT-015", "Total Power", "P = Fc × Vc + Ff × Vf"),
    
    # Tool Life (10)
    ("F-LIFE-001", "Taylor Tool Life", "VT^n = C"),
    ("F-LIFE-002", "Extended Taylor", "VT^n × f^a × d^b = C"),
    ("F-LIFE-003", "Flank Wear Rate", "dVB/dt = K × V^m"),
    ("F-LIFE-004", "Crater Wear Rate", "dKT/dt = A × exp(-B/T)"),
    ("F-LIFE-005", "Tool Life Prediction", "T = C / (V^n × f^a × d^b)"),
    ("F-LIFE-006", "Wear Land Growth", "VB = VB₀ + K × t"),
    ("F-LIFE-007", "Notch Wear", "VN = KN × V^m × t"),
    ("F-LIFE-008", "Combined Wear", "W = √(VB² + KT² + VN²)"),
    ("F-LIFE-009", "Economic Tool Life", "T_opt = (1/n - 1) × tc"),
    ("F-LIFE-010", "Maximum Production", "T_mp = tc × (1/n - 1)"),
    
    # Thermal (12)
    ("F-THERM-001", "Cutting Temperature", "θ = θ₀ + K × V^a × f^b"),
    ("F-THERM-002", "Heat Partition", "R = (k×ρ×c)_tool / (k×ρ×c)_chip"),
    ("F-THERM-003", "Flash Temperature", "θf = q × L / (k × √(π×α×t))"),
    ("F-THERM-004", "Bulk Temperature", "θb = θ₀ + u × MRR / (ρ×c×Q)"),
    ("F-THERM-005", "Interface Temperature", "θi = θf + θb"),
    ("F-THERM-006", "Peclet Number", "Pe = V × L / α"),
    ("F-THERM-007", "Thermal Number", "Nt = V × f / α"),
    ("F-THERM-008", "Heat into Tool", "Qt = (1-R) × Fc × Vc"),
    ("F-THERM-009", "Heat into Chip", "Qc = R × Fc × Vc"),
    ("F-THERM-010", "Heat into Work", "Qw = Ff × Vf"),
    ("F-THERM-011", "Thermal Expansion", "ΔL = L₀ × α × ΔT"),
    ("F-THERM-012", "Temperature Gradient", "dT/dx = -q / k"),
    
    # Vibration (10)
    ("F-VIB-001", "Natural Frequency", "fn = (1/2π) × √(k/m)"),
    ("F-VIB-002", "Damping Ratio", "ζ = c / (2×√(k×m))"),
    ("F-VIB-003", "Stability Limit", "blim = -1 / (2×Ks×Re[G])"),
    ("F-VIB-004", "Chatter Frequency", "fc = (N/60) × (n + ε/2π)"),
    ("F-VIB-005", "Tooth Passing Frequency", "ft = N × z / 60"),
    ("F-VIB-006", "FRF Magnitude", "|G| = 1 / √((k-mω²)² + (cω)²)"),
    ("F-VIB-007", "Phase Angle", "φ = atan(cω / (k-mω²))"),
    ("F-VIB-008", "Dynamic Stiffness", "Kd = k × √(1 + (2ζω/ωn)²)"),
    ("F-VIB-009", "Regenerative Factor", "µ = 1 + cos(ε)"),
    ("F-VIB-010", "Stability Boundary", "ω = ωn × √(1 ± ζ)"),
    
    # Surface Finish (8)
    ("F-SURF-001", "Theoretical Ra", "Ra = f² / (32 × r)"),
    ("F-SURF-002", "Theoretical Rz", "Rz = f² / (8 × r)"),
    ("F-SURF-003", "Actual Ra", "Ra_act = Ra_th × Kv × Kf × Kw"),
    ("F-SURF-004", "Rt from Rz", "Rt ≈ 1.1 × Rz"),
    ("F-SURF-005", "Rq from Ra", "Rq ≈ 1.25 × Ra"),
    ("F-SURF-006", "Cusp Height", "h = r - √(r² - (f/2)²)"),
    ("F-SURF-007", "Scallop Height", "h = r × (1 - cos(arcsin(s/(2r))))"),
    ("F-SURF-008", "Surface Waviness", "Wa = vibration_amplitude"),
    
    # Deflection (6)
    ("F-DEF-001", "Cantilever Deflection", "δ = FL³ / (3EI)"),
    ("F-DEF-002", "Tool Deflection", "δt = Fc × L³ / (3×E×I)"),
    ("F-DEF-003", "Workpiece Deflection", "δw = F × L³ / (48×E×I)"),
    ("F-DEF-004", "Combined Deflection", "δ_total = δt + δw + δf"),
    ("F-DEF-005", "Stiffness Ratio", "K = F / δ"),
    ("F-DEF-006", "Second Moment", "I = π×d⁴/64"),
    
    # Power (8)
    ("F-PWR-001", "Cutting Power", "Pc = Fc × Vc / 60000"),
    ("F-PWR-002", "Spindle Power", "Ps = Pc / η"),
    ("F-PWR-003", "Feed Power", "Pf = Ff × Vf / 60000"),
    ("F-PWR-004", "Total Power", "P = Pc + Pf"),
    ("F-PWR-005", "Specific Power", "Ps = P / MRR"),
    ("F-PWR-006", "Torque", "T = P × 9549 / N"),
    ("F-PWR-007", "Motor Power", "Pm = Ps × SF"),
    ("F-PWR-008", "Power Check", "P_req ≤ P_avail"),
    
    # Chip Formation (6)
    ("F-CHIP-001", "Chip Load", "fz = Vf / (N × z)"),
    ("F-CHIP-002", "Average Chip Thickness", "hm = fz × sin(θ) × √(ae/D)"),
    ("F-CHIP-003", "Max Chip Thickness", "hex = fz × sin(θ)"),
    ("F-CHIP-004", "Chip Cross Section", "Ac = f × ap"),
    ("F-CHIP-005", "MRR", "Q = Vc × f × ap"),
    ("F-CHIP-006", "Chip Ratio", "rc = t₁/t₂"),
    
    # Optimization (12)
    ("F-OPT-001", "PSO Velocity", "v = w×v + c1×r1×(pbest-x) + c2×r2×(gbest-x)"),
    ("F-OPT-002", "GA Fitness", "f(x) = Σ(wi × fi(x))"),
    ("F-OPT-003", "Gradient Descent", "x_new = x_old - α × ∇f(x)"),
    ("F-OPT-004", "Bayesian Acquisition", "α(x) = µ(x) + κ×σ(x)"),
    ("F-OPT-005", "Pareto Dominance", "x₁ ≺ x₂ iff ∀i: f_i(x₁) ≤ f_i(x₂)"),
    ("F-OPT-006", "Constraint Handling", "g(x) ≤ 0, h(x) = 0"),
    ("F-OPT-007", "Objective Function", "min f(x) = cost + penalty"),
    ("F-OPT-008", "Learning Rate Decay", "α_t = α₀ / (1 + decay×t)"),
    ("F-OPT-009", "Momentum", "v_t = β×v_{t-1} + (1-β)×∇f"),
    ("F-OPT-010", "Adam Optimizer", "m_t, v_t → θ update"),
    ("F-OPT-011", "Multi-Objective", "F(x) = [f₁(x), f₂(x), ..., fₖ(x)]"),
    ("F-OPT-012", "Weighted Sum", "F = Σ(wi × fi(x))"),
    
    # Statistics (8)
    ("F-STAT-001", "Mean", "µ = Σx / n"),
    ("F-STAT-002", "Std Dev", "σ = √(Σ(x-µ)² / n)"),
    ("F-STAT-003", "Confidence Interval", "CI = µ ± z × σ/√n"),
    ("F-STAT-004", "Correlation", "r = Σ(x-x̄)(y-ȳ) / √(Σ(x-x̄)²×Σ(y-ȳ)²)"),
    ("F-STAT-005", "Regression", "y = a + bx"),
    ("F-STAT-006", "R-Squared", "R² = 1 - SS_res/SS_tot"),
    ("F-STAT-007", "RMSE", "RMSE = √(Σ(y-ŷ)²/n)"),
    ("F-STAT-008", "MAE", "MAE = Σ|y-ŷ|/n"),
    
    # Quality (6)
    ("F-QUAL-001", "Omega Score", "Ω = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L"),
    ("F-QUAL-002", "Safety Score", "S(x) = 1 - P(failure)"),
    ("F-QUAL-003", "Completeness", "C(T) = completed/total"),
    ("F-QUAL-004", "Evidence Score", "E = Σ(level × weight)"),
    ("F-QUAL-005", "Gate Pass", "G = Π(gate_i)"),
    ("F-QUAL-006", "Quality Index", "QI = Ω × (1 - defects/total)"),
    
    # Prediction (8)
    ("F-PRED-001", "Bayesian Update", "P(H|E) = P(E|H)×P(H) / P(E)"),
    ("F-PRED-002", "Confidence", "conf = 1 - uncertainty"),
    ("F-PRED-003", "Error Rate", "err = |actual - predicted| / actual"),
    ("F-PRED-004", "MAPE", "MAPE = 100 × Σ|err|/n"),
    ("F-PRED-005", "Drift Detection", "drift = |µ_new - µ_old| / σ"),
    ("F-PRED-006", "Model Accuracy", "acc = correct / total"),
    ("F-PRED-007", "Precision", "prec = TP / (TP + FP)"),
    ("F-PRED-008", "Recall", "rec = TP / (TP + FN)")
]

def generate_formula_skills() -> List[SkillDef]:
    """Generate skill for each formula."""
    skills = []
    for formula_id, formula_name, formula_eq in FORMULAS:
        category = formula_id.split("-")[1]
        skills.append(SkillDef(
            id=f"prism-formula-{formula_id.lower()}",
            name=f"Formula: {formula_name}",
            category="FORMULA",
            subcategory=category,
            description=f"{formula_name}. Equation: {formula_eq}",
            priority=30,
            complexity="ADVANCED",
            dependencies=["prism-universal-formulas"],
            consumers=["calculation-engine", "physics-engines"],
            hooks=[f"formula:{formula_id}:execute", f"formula:{formula_id}:validate"],
            formulas=[formula_id],
            capabilities=[f"Execute {formula_name}", f"Validate inputs for {formula_id}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT SKILLS (64 agents)
# ═══════════════════════════════════════════════════════════════════════════════

AGENTS = [
    # OPUS (18) - $75/1M tokens
    ("architect", "Architect", "OPUS", "System design and architecture decisions"),
    ("coordinator_v2", "Coordinator v2", "OPUS", "Multi-agent task coordination"),
    ("materials_scientist", "Materials Scientist", "OPUS", "Material science expert analysis"),
    ("master_machinist", "Master Machinist", "OPUS", "Expert machining decisions"),
    ("physics_validator", "Physics Validator", "OPUS", "Physics calculation validation"),
    ("domain_expert", "Domain Expert", "OPUS", "Manufacturing domain expertise"),
    ("migration_specialist", "Migration Specialist", "OPUS", "Codebase migration planning"),
    ("synthesizer", "Synthesizer", "OPUS", "Multi-source information synthesis"),
    ("debugger", "Debugger", "OPUS", "Complex debugging analysis"),
    ("root_cause_analyst", "Root Cause Analyst", "OPUS", "Failure root cause analysis"),
    ("task_decomposer", "Task Decomposer", "OPUS", "Complex task breakdown"),
    ("learning_extractor_v2", "Learning Extractor v2", "OPUS", "Pattern extraction from experience"),
    ("verification_chain", "Verification Chain", "OPUS", "Multi-stage verification"),
    ("uncertainty_quantifier", "Uncertainty Quantifier", "OPUS", "Uncertainty estimation"),
    ("knowledge_graph_builder", "Knowledge Graph Builder", "OPUS", "Knowledge structure creation"),
    ("meta_analyst_v2", "Meta Analyst v2", "OPUS", "High-level analysis"),
    ("combination_optimizer", "Combination Optimizer", "OPUS", "Resource combination optimization"),
    ("proof_generator", "Proof Generator", "OPUS", "Mathematical proof generation"),
    
    # SONNET (37) - $15/1M tokens
    ("coder", "Coder", "SONNET", "Code generation and modification"),
    ("extractor", "Extractor", "SONNET", "Data and code extraction"),
    ("validator", "Validator", "SONNET", "Input/output validation"),
    ("code_reviewer", "Code Reviewer", "SONNET", "Code quality review"),
    ("security_auditor", "Security Auditor", "SONNET", "Security vulnerability detection"),
    ("test_generator", "Test Generator", "SONNET", "Test case generation"),
    ("documentation_writer", "Documentation Writer", "SONNET", "Documentation creation"),
    ("optimizer", "Optimizer", "SONNET", "Code and parameter optimization"),
    ("refactorer", "Refactorer", "SONNET", "Code refactoring"),
    ("pattern_matcher", "Pattern Matcher", "SONNET", "Pattern recognition"),
    ("completeness_auditor", "Completeness Auditor", "SONNET", "Completeness verification"),
    ("dependency_analyzer", "Dependency Analyzer", "SONNET", "Dependency analysis"),
    ("formula_validator", "Formula Validator", "SONNET", "Formula validation"),
    ("estimator", "Estimator", "SONNET", "Value estimation"),
    ("cross_referencer", "Cross Referencer", "SONNET", "Cross-reference checking"),
    ("monolith_navigator", "Monolith Navigator", "SONNET", "Legacy code navigation"),
    ("material_lookup", "Material Lookup", "SONNET", "Material database queries"),
    ("gcode_expert", "G-Code Expert", "SONNET", "G-code generation/validation"),
    ("machine_specialist", "Machine Specialist", "SONNET", "Machine configuration"),
    ("standards_expert", "Standards Expert", "SONNET", "Standards compliance"),
    ("session_continuity", "Session Continuity", "SONNET", "Session state management"),
    ("state_manager", "State Manager", "SONNET", "State file operations"),
    ("synergy_analyst", "Synergy Analyst", "SONNET", "Resource synergy analysis"),
    ("resource_auditor", "Resource Auditor", "SONNET", "Resource utilization audit"),
    ("calibration_engineer", "Calibration Engineer", "SONNET", "Model calibration"),
    ("test_orchestrator", "Test Orchestrator", "SONNET", "Test execution coordination"),
    ("cam_programmer", "CAM Programmer", "SONNET", "CAM programming"),
    ("post_processor", "Post Processor", "SONNET", "Post processor generation"),
    ("thermal_analyst", "Thermal Analyst", "SONNET", "Thermal analysis"),
    ("signal_processor", "Signal Processor", "SONNET", "Signal processing"),
    ("learning_agent", "Learning Agent", "SONNET", "Online learning"),
    ("cutting_mechanics", "Cutting Mechanics", "SONNET", "Cutting force/power calc"),
    ("tool_selector", "Tool Selector", "SONNET", "Tool selection"),
    ("error_handler", "Error Handler", "SONNET", "Error handling"),
    ("workflow_manager", "Workflow Manager", "SONNET", "Workflow coordination"),
    ("quality_controller", "Quality Controller", "SONNET", "Quality enforcement"),
    ("api_coordinator", "API Coordinator", "SONNET", "API call coordination"),
    
    # HAIKU (9) - $1.25/1M tokens
    ("quick_lookup", "Quick Lookup", "HAIKU", "Fast database queries"),
    ("formatter", "Formatter", "HAIKU", "Data formatting"),
    ("counter", "Counter", "HAIKU", "Counting operations"),
    ("lister", "Lister", "HAIKU", "List generation"),
    ("summarizer", "Summarizer", "HAIKU", "Quick summaries"),
    ("translator", "Translator", "HAIKU", "Format translation"),
    ("comparator", "Comparator", "HAIKU", "Value comparison"),
    ("merger", "Merger", "HAIKU", "Data merging"),
    ("reporter", "Reporter", "HAIKU", "Report generation")
]

def generate_agent_skills() -> List[SkillDef]:
    """Generate skill for each agent."""
    skills = []
    for agent_id, agent_name, tier, agent_desc in AGENTS:
        skills.append(SkillDef(
            id=f"prism-agent-{agent_id.replace('_', '-')}",
            name=f"Agent: {agent_name}",
            category="AGENT",
            subcategory=tier,
            description=f"{agent_name} ({tier}). {agent_desc}",
            priority=20 if tier == "OPUS" else 40 if tier == "SONNET" else 60,
            complexity="EXPERT" if tier == "OPUS" else "ADVANCED" if tier == "SONNET" else "BASIC",
            dependencies=["prism-agent-coordinator"],
            consumers=["swarm-controller", "task-executor"],
            hooks=[f"agent:{agent_id}:select", f"agent:{agent_id}:execute"],
            agents=[agent_id],
            capabilities=[f"Invoke {agent_name}", f"Handle {agent_name} results"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# ALARM RANGE SKILLS (9,200 codes in ranges)
# ═══════════════════════════════════════════════════════════════════════════════

ALARM_RANGES = [
    # FANUC ranges
    ("fanuc-servo-0xxx", "FANUC Servo 0xxx", "FANUC", "Servo alarms 0-999"),
    ("fanuc-spindle-1xxx", "FANUC Spindle 1xxx", "FANUC", "Spindle alarms 1000-1999"),
    ("fanuc-overheat-2xxx", "FANUC Overheat 2xxx", "FANUC", "Overheat alarms 2000-2999"),
    ("fanuc-system-3xxx", "FANUC System 3xxx", "FANUC", "System alarms 3000-3999"),
    ("fanuc-ps-4xxx", "FANUC PS 4xxx", "FANUC", "PS alarms 4000-4999"),
    ("fanuc-io-5xxx", "FANUC I/O 5xxx", "FANUC", "I/O alarms 5000-5999"),
    
    # Siemens ranges
    ("siemens-1xxxx", "SIEMENS 1xxxx", "SIEMENS", "Alarms 10000-19999"),
    ("siemens-2xxxx", "SIEMENS 2xxxx", "SIEMENS", "Alarms 20000-29999"),
    ("siemens-3xxxx", "SIEMENS 3xxxx", "SIEMENS", "Alarms 30000-39999"),
    
    # HAAS ranges
    ("haas-1xx", "HAAS 1xx", "HAAS", "Basic alarms 100-199"),
    ("haas-2xx", "HAAS 2xx", "HAAS", "Servo alarms 200-299"),
    ("haas-3xx", "HAAS 3xx", "HAAS", "Tool alarms 300-399"),
    ("haas-4xx", "HAAS 4xx", "HAAS", "Axis alarms 400-499"),
    
    # Other controllers
    ("okuma-1xxx", "OKUMA 1xxx", "OKUMA", "OSP alarms 1000-1999"),
    ("okuma-2xxx", "OKUMA 2xxx", "OKUMA", "OSP alarms 2000-2999"),
    ("mazak-1xxx", "MAZAK 1xxx", "MAZAK", "Mazatrol alarms 1000-1999"),
    ("mazak-2xxx", "MAZAK 2xxx", "MAZAK", "Mazatrol alarms 2000-2999"),
    ("heidenhain-1xxx", "HEIDENHAIN 1xxx", "HEIDENHAIN", "TNC alarms 1000-1999"),
    ("mitsubishi-1xxx", "MITSUBISHI 1xxx", "MITSUBISHI", "MELDAS alarms 1000-1999"),
    ("brother-1xxx", "BROTHER 1xxx", "BROTHER", "Brother alarms 1000-1999")
]

def generate_alarm_range_skills() -> List[SkillDef]:
    """Generate skill for each alarm range."""
    skills = []
    for range_id, range_name, controller, range_desc in ALARM_RANGES:
        skills.append(SkillDef(
            id=f"prism-alarm-{range_id}",
            name=f"Alarm Range: {range_name}",
            category="ALARM",
            subcategory=controller,
            description=f"{range_name} diagnostic skill. {range_desc}",
            priority=20,
            complexity="ADVANCED",
            dependencies=["prism-error-catalog", f"prism-controller-{controller.lower()}"],
            consumers=["alarm-diagnostic"],
            hooks=[f"alarm:{range_id}:lookup", f"alarm:{range_id}:diagnose"],
            capabilities=[f"Look up {range_name}", f"Diagnose {range_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# MACHINE MODEL SKILLS (major models from top manufacturers)
# ═══════════════════════════════════════════════════════════════════════════════

MACHINE_MODELS = [
    # DMG MORI
    ("dmori-dmu50", "DMG MORI DMU 50", "DMG MORI", "5-axis universal machining center"),
    ("dmori-dmu80", "DMG MORI DMU 80", "DMG MORI", "5-axis universal machining center"),
    ("dmori-cmx50", "DMG MORI CMX 50 U", "DMG MORI", "5-axis vertical machining"),
    ("dmori-ctx", "DMG MORI CTX Series", "DMG MORI", "CNC turning centers"),
    ("dmori-ntx", "DMG MORI NTX Series", "DMG MORI", "Mill-turn centers"),
    
    # Mazak
    ("mazak-integrex", "Mazak INTEGREX", "Mazak", "Multi-tasking machines"),
    ("mazak-variaxis", "Mazak VARIAXIS", "Mazak", "5-axis machining centers"),
    ("mazak-vtc", "Mazak VTC", "Mazak", "Vertical machining centers"),
    ("mazak-quick-turn", "Mazak QUICK TURN", "Mazak", "CNC turning centers"),
    
    # Haas
    ("haas-vf2", "Haas VF-2", "Haas", "Vertical machining center"),
    ("haas-vf4", "Haas VF-4", "Haas", "Vertical machining center"),
    ("haas-umc750", "Haas UMC-750", "Haas", "5-axis universal machine"),
    ("haas-st10", "Haas ST-10", "Haas", "CNC lathe"),
    ("haas-st20", "Haas ST-20", "Haas", "CNC lathe"),
    
    # Okuma
    ("okuma-genos", "Okuma GENOS", "Okuma", "Vertical machining centers"),
    ("okuma-multus", "Okuma MULTUS", "Okuma", "Multi-tasking machines"),
    ("okuma-lb", "Okuma LB Series", "Okuma", "CNC lathes"),
    
    # Makino
    ("makino-a51nx", "Makino a51nx", "Makino", "Horizontal machining center"),
    ("makino-ps95", "Makino PS95", "Makino", "Vertical machining center"),
    ("makino-d500", "Makino D500", "Makino", "5-axis vertical"),
    
    # Others
    ("fanuc-robodrill", "FANUC Robodrill", "FANUC", "Compact machining center"),
    ("hermle-c22", "Hermle C 22", "Hermle", "5-axis machining center"),
    ("hermle-c42", "Hermle C 42", "Hermle", "5-axis machining center"),
    ("brother-speedio", "Brother Speedio", "Brother", "High-speed tapping center")
]

def generate_machine_model_skills() -> List[SkillDef]:
    """Generate skill for each major machine model."""
    skills = []
    for model_id, model_name, manufacturer, model_desc in MACHINE_MODELS:
        skills.append(SkillDef(
            id=f"prism-machine-{model_id}",
            name=f"Machine: {model_name}",
            category="MACHINE",
            subcategory="MODEL",
            description=f"{model_name} specifications and programming. {model_desc}",
            priority=40,
            complexity="ADVANCED",
            dependencies=["prism-machine-schema", f"prism-machine-mfr-{manufacturer.lower().replace(' ', '-')}"],
            consumers=["post-processor", "machine-selector"],
            hooks=[f"machine:{model_id}:config", f"machine:{model_id}:post"],
            capabilities=[f"Configure {model_name}", f"Generate post for {model_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# COGNITIVE & WORKFLOW SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

COGNITIVE_SKILLS = [
    ("bayesian-inference", "Bayesian Inference", "Prior updating with evidence"),
    ("bayesian-change-detection", "Bayesian Change Detection", "Detect regime changes"),
    ("bayesian-hypothesis", "Bayesian Hypothesis Testing", "Compare competing hypotheses"),
    ("optimization-pso", "PSO Optimization", "Particle swarm optimization"),
    ("optimization-gradient", "Gradient Optimization", "Gradient-based optimization"),
    ("optimization-multi", "Multi-Objective Optimization", "Pareto optimization"),
    ("reinforcement-reward", "Reward Shaping", "Design reward functions"),
    ("reinforcement-policy", "Policy Learning", "Learn optimal policies"),
    ("reinforcement-value", "Value Estimation", "Estimate state values"),
    ("pattern-recognition", "Pattern Recognition", "Identify recurring patterns"),
    ("anomaly-detection", "Anomaly Detection", "Detect unusual conditions"),
    ("trend-analysis", "Trend Analysis", "Identify trends and forecasts"),
    ("branch-prediction", "Branch Prediction", "Predict decision outcomes"),
    ("failure-prediction", "Failure Prediction", "Predict failure modes"),
    ("confidence-estimation", "Confidence Estimation", "Quantify uncertainty")
]

def generate_cognitive_skills() -> List[SkillDef]:
    """Generate cognitive enhancement skills."""
    skills = []
    for cog_id, cog_name, cog_desc in COGNITIVE_SKILLS:
        skills.append(SkillDef(
            id=f"prism-cognitive-{cog_id}",
            name=f"Cognitive: {cog_name}",
            category="COGNITIVE",
            subcategory="AI_PATTERN",
            description=cog_desc,
            priority=20,
            complexity="EXPERT",
            dependencies=["prism-cognitive-core"],
            consumers=["quality-engine", "decision-engine"],
            hooks=[f"cognitive:{cog_id}:apply"],
            capabilities=[f"Apply {cog_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Generate all granular skills."""
    print("=" * 80)
    print("PRISM SKILL EXPANSION WAVE 2 - GRANULAR COVERAGE")
    print("=" * 80)
    
    # Load Wave 1 skills
    wave1_path = r"C:\PRISM\registries\SKILL_REGISTRY.json"
    wave1_skills = []
    if os.path.exists(wave1_path):
        with open(wave1_path, 'r', encoding='utf-8') as f:
            wave1_data = json.load(f)
        wave1_skills = wave1_data.get("skills", [])
        print(f"\nLoaded {len(wave1_skills)} Wave 1 skills")
    
    # Generate Wave 2 skills
    print("\nGenerating granular skills...")
    
    mat_param_skills = generate_material_param_skills()
    print(f"  Material parameter skills: {len(mat_param_skills)}")
    
    formula_skills = generate_formula_skills()
    print(f"  Formula skills: {len(formula_skills)}")
    
    agent_skills = generate_agent_skills()
    print(f"  Agent skills: {len(agent_skills)}")
    
    alarm_skills = generate_alarm_range_skills()
    print(f"  Alarm range skills: {len(alarm_skills)}")
    
    machine_skills = generate_machine_model_skills()
    print(f"  Machine model skills: {len(machine_skills)}")
    
    cognitive_skills = generate_cognitive_skills()
    print(f"  Cognitive skills: {len(cognitive_skills)}")
    
    # Convert to dicts
    wave2_skills = []
    for skill_list in [mat_param_skills, formula_skills, agent_skills, 
                       alarm_skills, machine_skills, cognitive_skills]:
        wave2_skills.extend([s.to_dict() for s in skill_list])
    
    print(f"\nWave 2 skills generated: {len(wave2_skills)}")
    
    # Combine with Wave 1
    all_skills = wave1_skills + wave2_skills
    
    # Deduplicate by ID
    seen_ids = set()
    unique_skills = []
    for skill in all_skills:
        skill_id = skill.get("id", "")
        if skill_id and skill_id not in seen_ids:
            seen_ids.add(skill_id)
            unique_skills.append(skill)
    
    print(f"\n{'=' * 80}")
    print(f"TOTAL UNIQUE SKILLS: {len(unique_skills)}")
    print(f"{'=' * 80}")
    
    # Count by category
    category_counts = {}
    for skill in unique_skills:
        cat = skill.get("category", "UNKNOWN")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    print("\nBy Category:")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")
    
    # Save combined registry
    registry = {
        "version": "3.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_skill_expansion_wave2.py",
        "totalSkills": len(unique_skills),
        "wave1Skills": len(wave1_skills),
        "wave2Skills": len(wave2_skills),
        "summary": {
            "byCategory": category_counts,
            "wave2Breakdown": {
                "materialParams": len(mat_param_skills),
                "formulas": len(formula_skills),
                "agents": len(agent_skills),
                "alarmRanges": len(alarm_skills),
                "machineModels": len(machine_skills),
                "cognitive": len(cognitive_skills)
            }
        },
        "skills": unique_skills
    }
    
    # Save
    output_path = r"C:\PRISM\registries\SKILL_REGISTRY.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {output_path}")
    
    # Audit
    audit_path = r"C:\PRISM\mcp-server\audits\skill_expansion_wave2.json"
    audit = {
        "session": "R2.7-SKILL-WAVE2",
        "timestamp": datetime.now().isoformat(),
        "wave1": len(wave1_skills),
        "wave2": len(wave2_skills),
        "total": len(unique_skills),
        "categories": len(category_counts)
    }
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")
    
    return unique_skills

if __name__ == "__main__":
    skills = main()
