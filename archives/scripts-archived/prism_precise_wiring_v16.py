#!/usr/bin/env python3
"""
PRISM PRECISE WIRING v16.0
===========================
Hand-curated, semantically meaningful connections.
NOT bulk category mapping. Each connection is INTENTIONAL.

Target: 5-15 engines per formula (not 245!)
"""

import json
import os
from datetime import datetime

OUTPUT_PATH = r"C:\PRISM\registries"

# ═══════════════════════════════════════════════════════════════════════════════
# PRECISE FORMULA -> ENGINE WIRING
# Each formula connects to ONLY the engines that actually implement/use it
# ═══════════════════════════════════════════════════════════════════════════════

FORMULA_ENGINE_WIRING = {
    # ─────────────────────────────────────────────────────────────────────────────
    # CUTTING FORCE FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-CUT-FORCE-KIENZLE": {
        "formula": "Fc = kc1.1 * h^(-mc) * b",
        "inputs": ["kc1_1", "mc", "h", "b"],
        "outputs": ["Fc"],
        "engines": [
            {"id": "KienzleForceEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ForceValidatorEngine", "role": "VALIDATION"},
            {"id": "SafetyValidatorEngine", "role": "SAFETY_CHECK"},
            {"id": "CuttingPowerEngine", "role": "DOWNSTREAM_CONSUMER"},
            {"id": "SpeedFeedOrchestrator", "role": "ORCHESTRATION"},
            {"id": "OmegaCheckEngine", "role": "QUALITY_CHECK"},
        ],
        "database_sources": ["MATERIALS.cutting.KC1_1", "MATERIALS.cutting.MC"],
    },
    "F-CUT-FORCE-MERCHANT": {
        "formula": "phi = pi/4 - beta/2 + alpha/2",
        "inputs": ["beta", "alpha"],
        "outputs": ["phi", "Fc"],
        "engines": [
            {"id": "MerchantForceEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ChipFormationEngine", "role": "CONSUMER"},
            {"id": "ForceValidatorEngine", "role": "VALIDATION"},
            {"id": "KienzleForceEngine", "role": "COMPARISON"},
        ],
        "database_sources": ["TOOLS.geometry.RAKE_ANGLE"],
    },
    "F-CUT-FORCE-OXLEY": {
        "formula": "Complex thermomechanical model",
        "inputs": ["material_props", "cutting_conditions", "tool_geometry"],
        "outputs": ["Fc", "temperature", "stress"],
        "engines": [
            {"id": "OxleyForceEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "AnalyticalThermalEngine", "role": "THERMAL_COUPLING"},
            {"id": "MaterialModelEngine", "role": "MATERIAL_MODEL"},
            {"id": "KienzleForceEngine", "role": "VALIDATION_COMPARISON"},
            {"id": "MerchantForceEngine", "role": "VALIDATION_COMPARISON"},
            {"id": "ForceValidatorEngine", "role": "VALIDATION"},
        ],
        "database_sources": ["MATERIALS.constitutive.*", "MATERIALS.thermal.*"],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # CUTTING POWER FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-CUT-POWER-CUTTING": {
        "formula": "Pc = Fc * Vc / (60 * 1000)",
        "inputs": ["Fc", "Vc"],
        "outputs": ["Pc"],
        "engines": [
            {"id": "CuttingPowerEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "SpindlePowerCheckEngine", "role": "MACHINE_VALIDATION"},
            {"id": "EnergyConsumptionEngine", "role": "CONSUMER"},
            {"id": "SafetyValidatorEngine", "role": "SAFETY_CHECK"},
        ],
        "database_sources": ["MACHINES.spindle.POWER", "MACHINES.spindle.TORQUE"],
    },
    "F-CUT-POWER-SPECIFIC": {
        "formula": "u = Pc / MRR",
        "inputs": ["Pc", "MRR"],
        "outputs": ["u"],
        "engines": [
            {"id": "SpecificEnergyEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "CuttingPowerEngine", "role": "INPUT_PROVIDER"},
            {"id": "MRREngine", "role": "INPUT_PROVIDER"},
            {"id": "SustainabilityEngine", "role": "CONSUMER"},
        ],
        "database_sources": [],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # THERMAL FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-THERMAL-CUTTING": {
        "formula": "T = f(Pc, material, coolant)",
        "inputs": ["Pc", "k", "rho", "cp", "coolant_type"],
        "outputs": ["T_interface", "T_chip", "T_tool", "T_workpiece"],
        "engines": [
            {"id": "AnalyticalThermalEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "HeatPartitionEngine", "role": "SUPPORTING"},
            {"id": "CoolantEffectEngine", "role": "MODIFIER"},
            {"id": "WearThermalEngine", "role": "CONSUMER"},
            {"id": "ThermalValidatorEngine", "role": "VALIDATION"},
        ],
        "database_sources": ["MATERIALS.thermal.*", "COOLANT.*"],
    },
    "F-THERMAL-PARTITION": {
        "formula": "R = f(Vc, k_tool, k_workpiece)",
        "inputs": ["Vc", "k_tool", "k_workpiece"],
        "outputs": ["R_chip", "R_tool", "R_workpiece"],
        "engines": [
            {"id": "HeatPartitionEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "AnalyticalThermalEngine", "role": "CONSUMER"},
        ],
        "database_sources": ["MATERIALS.thermal.CONDUCTIVITY", "TOOLS.material.CONDUCTIVITY"],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # WEAR/TOOL LIFE FORMULAS  
    # ─────────────────────────────────────────────────────────────────────────────
    "F-WEAR-TAYLOR": {
        "formula": "V * T^n = C",
        "inputs": ["V", "n", "C"],
        "outputs": ["T"],
        "engines": [
            {"id": "TaylorWearEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "WearMonitorEngine", "role": "MONITORING"},
            {"id": "ToolLifePredictionEngine", "role": "CONSUMER"},
            {"id": "ToolCostEngine", "role": "ECONOMICS"},
            {"id": "ToolChangeSchedulerEngine", "role": "SCHEDULING"},
            {"id": "WearValidatorEngine", "role": "VALIDATION"},
        ],
        "database_sources": ["MATERIALS.cutting.TAYLOR_N", "MATERIALS.cutting.TAYLOR_C"],
    },
    "F-WEAR-TAYLOR-EXTENDED": {
        "formula": "V * T^n * f^a * d^b = C",
        "inputs": ["V", "f", "d", "n", "a", "b", "C"],
        "outputs": ["T"],
        "engines": [
            {"id": "TaylorWearEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ExtendedTaylorEngine", "role": "EXTENDED_MODEL"},
            {"id": "TaylorCoefficientLearner", "role": "COEFFICIENT_LEARNING"},
            {"id": "ToolLifePredictionEngine", "role": "CONSUMER"},
        ],
        "database_sources": ["MATERIALS.cutting.*"],
    },
    "F-WEAR-USUI": {
        "formula": "dW/dt = A * sigma * V * exp(-B/T)",
        "inputs": ["A", "B", "sigma", "V", "T"],
        "outputs": ["dW_dt", "VB"],
        "engines": [
            {"id": "UsuiWearEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "AnalyticalThermalEngine", "role": "TEMPERATURE_PROVIDER"},
            {"id": "WearMonitorEngine", "role": "MONITORING"},
            {"id": "WearValidatorEngine", "role": "VALIDATION"},
        ],
        "database_sources": ["MATERIALS.tribology.*"],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # VIBRATION/CHATTER FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-VIB-CHATTER-REGEN": {
        "formula": "blim = -1 / (2 * Ks * Re[G(jw)])",
        "inputs": ["Ks", "G_real", "omega"],
        "outputs": ["blim", "stable"],
        "engines": [
            {"id": "StabilityLobeEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ModalAnalysisEngine", "role": "FRF_PROVIDER"},
            {"id": "ChatterDetectionEngine", "role": "MONITORING"},
            {"id": "VibrationValidatorEngine", "role": "VALIDATION"},
            {"id": "SafetyValidatorEngine", "role": "SAFETY_CHECK"},
        ],
        "database_sources": ["MACHINES.dynamics.*", "TOOLS.dynamics.*"],
    },
    "F-VIB-STABILITY-LOBE": {
        "formula": "SLD(n, blim)",
        "inputs": ["FRF", "Kc", "spindle_range"],
        "outputs": ["stability_diagram", "optimal_spindles"],
        "engines": [
            {"id": "StabilityLobeEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ModalAnalysisEngine", "role": "INPUT_PROVIDER"},
            {"id": "SpindleOptimizationEngine", "role": "OPTIMIZATION"},
            {"id": "VisualizationEngine", "role": "VISUALIZATION"},
        ],
        "database_sources": ["MACHINES.dynamics.*"],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # SURFACE QUALITY FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-SURF-RA-THEORETICAL": {
        "formula": "Ra = f^2 / (32 * r)",
        "inputs": ["f", "r"],
        "outputs": ["Ra_theoretical"],
        "engines": [
            {"id": "RoughnessEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "SurfaceQualityEngine", "role": "CONSUMER"},
            {"id": "FinishingPassEngine", "role": "PROCESS_PLANNING"},
        ],
        "database_sources": ["TOOLS.geometry.NOSE_RADIUS"],
    },
    "F-SURF-RA-ACTUAL": {
        "formula": "Ra_actual = Ra_theo * K_bue * K_vib * K_wear",
        "inputs": ["Ra_theoretical", "K_factors"],
        "outputs": ["Ra_actual"],
        "engines": [
            {"id": "RoughnessEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ActualRoughnessEngine", "role": "FACTOR_APPLICATION"},
            {"id": "BUEPredictionEngine", "role": "BUE_FACTOR"},
            {"id": "ChatterDetectionEngine", "role": "VIB_FACTOR"},
            {"id": "WearMonitorEngine", "role": "WEAR_FACTOR"},
            {"id": "MLRoughnessEngine", "role": "ML_PREDICTION"},
        ],
        "database_sources": ["MATERIALS.machinability.*"],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # MATERIAL CONSTITUTIVE FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-MAT-JOHNSON-COOK": {
        "formula": "sigma = (A + B*eps^n)(1 + C*ln(eps_dot))(1 - T*^m)",
        "inputs": ["A", "B", "C", "n", "m", "eps", "eps_dot", "T", "Tm", "Tr"],
        "outputs": ["sigma"],
        "engines": [
            {"id": "JohnsonCookEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "MaterialModelEngine", "role": "MATERIAL_MODEL"},
            {"id": "OxleyForceEngine", "role": "CONSUMER"},
            {"id": "FEMForceEngine", "role": "CONSUMER"},
            {"id": "MaterialValidatorEngine", "role": "VALIDATION"},
        ],
        "database_sources": ["MATERIALS.constitutive.*"],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # DEFLECTION FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-DEFL-TOOL-CANTILEVER": {
        "formula": "delta = F * L^3 / (3 * E * I)",
        "inputs": ["F", "L", "E", "I"],
        "outputs": ["delta"],
        "engines": [
            {"id": "DeflectionEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "StiffnessEngine", "role": "STIFFNESS_CALC"},
            {"id": "ToleranceValidatorEngine", "role": "VALIDATION"},
            {"id": "ToolPathCompensationEngine", "role": "COMPENSATION"},
        ],
        "database_sources": ["TOOLS.geometry.*", "TOOLS.material.MODULUS"],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # ECONOMICS FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-ECON-COST-PER-PART": {
        "formula": "C = C_machine + C_tool + C_labor + C_material",
        "inputs": ["machine_rate", "cycle_time", "tool_cost", "tool_life", "labor_rate", "material_cost"],
        "outputs": ["cost_per_part"],
        "engines": [
            {"id": "CostEstimationEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "MachineCostEngine", "role": "MACHINE_COST"},
            {"id": "ToolCostEngine", "role": "TOOL_COST"},
            {"id": "CycleTimeEngine", "role": "TIME_PROVIDER"},
            {"id": "QuoteGeneratorEngine", "role": "CONSUMER"},
        ],
        "database_sources": ["COSTS.*", "MACHINES.economics.*"],
    },
    "F-ECON-CYCLE-TIME": {
        "formula": "T_cycle = T_cut + T_rapid + T_tool_change + T_load",
        "inputs": ["cutting_length", "feed_rate", "rapid_length", "rapid_rate", "tool_changes"],
        "outputs": ["cycle_time"],
        "engines": [
            {"id": "CycleTimeEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ToolpathAnalysisEngine", "role": "PATH_ANALYSIS"},
            {"id": "CostEstimationEngine", "role": "CONSUMER"},
            {"id": "ScheduleEngine", "role": "CONSUMER"},
        ],
        "database_sources": ["MACHINES.dynamics.RAPID_*"],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # OPTIMIZATION FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-OPT-PSO": {
        "formula": "v = w*v + c1*r1*(pbest-x) + c2*r2*(gbest-x)",
        "inputs": ["w", "c1", "c2", "particles", "objective"],
        "outputs": ["optimal_solution"],
        "engines": [
            {"id": "PSOEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ConstraintHandlerEngine", "role": "CONSTRAINT_HANDLING"},
            {"id": "ObjectiveEvaluatorEngine", "role": "OBJECTIVE_EVAL"},
            {"id": "ConvergenceCheckerEngine", "role": "CONVERGENCE"},
        ],
        "database_sources": [],
    },
    "F-OPT-NSGA2": {
        "formula": "Non-dominated sorting + crowding distance",
        "inputs": ["population", "objectives", "constraints"],
        "outputs": ["pareto_front"],
        "engines": [
            {"id": "NSGA2Engine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "DominanceCheckerEngine", "role": "SORTING"},
            {"id": "CrowdingDistanceEngine", "role": "DIVERSITY"},
            {"id": "ParetoVisualizationEngine", "role": "VISUALIZATION"},
        ],
        "database_sources": [],
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # PRISM META FORMULAS
    # ─────────────────────────────────────────────────────────────────────────────
    "F-PRISM-OMEGA": {
        "formula": "Omega = 0.25*R + 0.20*C + 0.15*P + 0.30*S + 0.10*L",
        "inputs": ["R", "C", "P", "S", "L"],
        "outputs": ["Omega"],
        "engines": [
            {"id": "OmegaCheckEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "ReasoningScoreEngine", "role": "R_CALCULATION"},
            {"id": "CodeScoreEngine", "role": "C_CALCULATION"},
            {"id": "ProcessScoreEngine", "role": "P_CALCULATION"},
            {"id": "SafetyScoreEngine", "role": "S_CALCULATION"},
            {"id": "LearningScoreEngine", "role": "L_CALCULATION"},
            {"id": "QualityValidatorEngine", "role": "VALIDATION"},
        ],
        "database_sources": ["PRISM.thresholds.*", "PRISM.weights.*"],
    },
    "F-PRISM-ILP": {
        "formula": "Psi = argmax[Sum(Cap*Syn*Omega*K) / Cost] s.t. constraints",
        "inputs": ["resources", "task", "constraints"],
        "outputs": ["optimal_combination"],
        "engines": [
            {"id": "ILPCombinationEngine", "role": "PRIMARY_IMPLEMENTATION"},
            {"id": "CapabilityScoreEngine", "role": "CAPABILITY_CALC"},
            {"id": "SynergyScoreEngine", "role": "SYNERGY_CALC"},
            {"id": "ResourceSelectorEngine", "role": "SELECTION"},
        ],
        "database_sources": ["PRISM.resources.*"],
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE -> FORMULA WIRING
# Each database connects to ONLY the formulas that actually consume it
# ═══════════════════════════════════════════════════════════════════════════════

DATABASE_FORMULA_WIRING = {
    # ─────────────────────────────────────────────────────────────────────────────
    # MATERIALS DATABASES
    # ─────────────────────────────────────────────────────────────────────────────
    "MATERIALS.cutting.KC1_1": {
        "description": "Kienzle specific cutting force",
        "formulas": ["F-CUT-FORCE-KIENZLE"],
        "unit": "N/mm2",
    },
    "MATERIALS.cutting.MC": {
        "description": "Kienzle exponent",
        "formulas": ["F-CUT-FORCE-KIENZLE"],
        "unit": "dimensionless",
    },
    "MATERIALS.cutting.TAYLOR_N": {
        "description": "Taylor tool life exponent",
        "formulas": ["F-WEAR-TAYLOR", "F-WEAR-TAYLOR-EXTENDED"],
        "unit": "dimensionless",
    },
    "MATERIALS.cutting.TAYLOR_C": {
        "description": "Taylor constant",
        "formulas": ["F-WEAR-TAYLOR", "F-WEAR-TAYLOR-EXTENDED"],
        "unit": "m/min",
    },
    "MATERIALS.constitutive.JC_A": {
        "description": "Johnson-Cook yield stress",
        "formulas": ["F-MAT-JOHNSON-COOK"],
        "unit": "MPa",
    },
    "MATERIALS.constitutive.JC_B": {
        "description": "Johnson-Cook hardening coefficient",
        "formulas": ["F-MAT-JOHNSON-COOK"],
        "unit": "MPa",
    },
    "MATERIALS.constitutive.JC_C": {
        "description": "Johnson-Cook strain rate coefficient",
        "formulas": ["F-MAT-JOHNSON-COOK"],
        "unit": "dimensionless",
    },
    "MATERIALS.constitutive.JC_N": {
        "description": "Johnson-Cook hardening exponent",
        "formulas": ["F-MAT-JOHNSON-COOK"],
        "unit": "dimensionless",
    },
    "MATERIALS.constitutive.JC_M": {
        "description": "Johnson-Cook thermal softening exponent",
        "formulas": ["F-MAT-JOHNSON-COOK"],
        "unit": "dimensionless",
    },
    "MATERIALS.thermal.CONDUCTIVITY": {
        "description": "Thermal conductivity",
        "formulas": ["F-THERMAL-CUTTING", "F-THERMAL-PARTITION"],
        "unit": "W/(m*K)",
    },
    "MATERIALS.thermal.SPECIFIC_HEAT": {
        "description": "Specific heat capacity",
        "formulas": ["F-THERMAL-CUTTING"],
        "unit": "J/(kg*K)",
    },
    "MATERIALS.physical.DENSITY": {
        "description": "Material density",
        "formulas": ["F-THERMAL-CUTTING", "F-CHIP-FORMATION"],
        "unit": "kg/m3",
    },
    "MATERIALS.tribology.FRICTION_COEF": {
        "description": "Friction coefficient",
        "formulas": ["F-WEAR-USUI", "F-CUT-FORCE-MERCHANT"],
        "unit": "dimensionless",
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # MACHINES DATABASES
    # ─────────────────────────────────────────────────────────────────────────────
    "MACHINES.spindle.POWER": {
        "description": "Spindle power rating",
        "formulas": ["F-CUT-POWER-CUTTING"],
        "unit": "kW",
    },
    "MACHINES.spindle.MAX_RPM": {
        "description": "Maximum spindle speed",
        "formulas": ["F-VIB-STABILITY-LOBE"],
        "unit": "rpm",
    },
    "MACHINES.dynamics.STIFFNESS": {
        "description": "Machine stiffness matrix",
        "formulas": ["F-VIB-CHATTER-REGEN", "F-VIB-STABILITY-LOBE"],
        "unit": "N/m",
    },
    "MACHINES.dynamics.RAPID_X": {
        "description": "X-axis rapid rate",
        "formulas": ["F-ECON-CYCLE-TIME"],
        "unit": "m/min",
    },
    "MACHINES.economics.HOURLY_RATE": {
        "description": "Machine hourly cost",
        "formulas": ["F-ECON-COST-PER-PART"],
        "unit": "$/hr",
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # TOOLS DATABASES
    # ─────────────────────────────────────────────────────────────────────────────
    "TOOLS.geometry.RAKE_ANGLE": {
        "description": "Tool rake angle",
        "formulas": ["F-CUT-FORCE-MERCHANT"],
        "unit": "deg",
    },
    "TOOLS.geometry.NOSE_RADIUS": {
        "description": "Insert nose radius",
        "formulas": ["F-SURF-RA-THEORETICAL"],
        "unit": "mm",
    },
    "TOOLS.geometry.DIAMETER": {
        "description": "Tool diameter",
        "formulas": ["F-DEFL-TOOL-CANTILEVER", "F-VIB-CHATTER-REGEN"],
        "unit": "mm",
    },
    "TOOLS.material.MODULUS": {
        "description": "Tool material elastic modulus",
        "formulas": ["F-DEFL-TOOL-CANTILEVER"],
        "unit": "GPa",
    },
    "TOOLS.material.CONDUCTIVITY": {
        "description": "Tool thermal conductivity",
        "formulas": ["F-THERMAL-PARTITION"],
        "unit": "W/(m*K)",
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # COSTS DATABASE
    # ─────────────────────────────────────────────────────────────────────────────
    "COSTS.tool.PURCHASE": {
        "description": "Tool purchase cost",
        "formulas": ["F-ECON-COST-PER-PART"],
        "unit": "$",
    },
    "COSTS.labor.OPERATOR": {
        "description": "Operator labor rate",
        "formulas": ["F-ECON-COST-PER-PART"],
        "unit": "$/hr",
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# CALCULATE STATISTICS
# ═══════════════════════════════════════════════════════════════════════════════

print("PRECISE WIRING STATISTICS")
print("=" * 60)

# Formula -> Engine stats
total_f_e_connections = sum(len(f["engines"]) for f in FORMULA_ENGINE_WIRING.values())
avg_engines_per_formula = total_f_e_connections / len(FORMULA_ENGINE_WIRING)
print(f"\nFormula -> Engine Wiring:")
print(f"  Total formulas: {len(FORMULA_ENGINE_WIRING)}")
print(f"  Total connections: {total_f_e_connections}")
print(f"  Average engines/formula: {avg_engines_per_formula:.1f}")
print(f"  Target was 5-15, achieved: YES" if 5 <= avg_engines_per_formula <= 15 else f"  Target was 5-15, achieved: NO")

# Database -> Formula stats
total_d_f_connections = sum(len(d["formulas"]) for d in DATABASE_FORMULA_WIRING.values())
avg_formulas_per_db = total_d_f_connections / len(DATABASE_FORMULA_WIRING)
print(f"\nDatabase -> Formula Wiring:")
print(f"  Total database fields: {len(DATABASE_FORMULA_WIRING)}")
print(f"  Total connections: {total_d_f_connections}")
print(f"  Average formulas/db_field: {avg_formulas_per_db:.1f}")

# Unique engines
unique_engines = set()
for f in FORMULA_ENGINE_WIRING.values():
    for e in f["engines"]:
        unique_engines.add(e["id"])
print(f"\nUnique engines referenced: {len(unique_engines)}")

# Save
output = {
    "version": "16.0.0",
    "type": "PRECISE_WIRING",
    "description": "Hand-curated semantic connections, NOT bulk category mapping",
    "statistics": {
        "formulas": len(FORMULA_ENGINE_WIRING),
        "formula_engine_connections": total_f_e_connections,
        "avg_engines_per_formula": round(avg_engines_per_formula, 1),
        "database_fields": len(DATABASE_FORMULA_WIRING),
        "database_formula_connections": total_d_f_connections,
        "unique_engines": len(unique_engines),
    },
    "formula_engine_wiring": FORMULA_ENGINE_WIRING,
    "database_formula_wiring": DATABASE_FORMULA_WIRING,
}

output_path = os.path.join(OUTPUT_PATH, "PRECISE_WIRING_v16.json")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2)
print(f"\nSaved: {output_path}")

# Compare to old bulk wiring
print("\n" + "=" * 60)
print("COMPARISON: PRECISE vs BULK WIRING")
print("=" * 60)
print(f"\nOLD (v15 Bulk):     245 engines/formula average")
print(f"NEW (v16 Precise):  {avg_engines_per_formula:.1f} engines/formula average")
print(f"REDUCTION:          {(1 - avg_engines_per_formula/245)*100:.1f}% fewer connections")
print(f"\nOLD total F->E:     120,248 connections")
print(f"NEW total F->E:     {total_f_e_connections} connections (projected ~2,000-3,000 complete)")
print(f"\nPRECISION GAIN:     Each connection is now MEANINGFUL")
