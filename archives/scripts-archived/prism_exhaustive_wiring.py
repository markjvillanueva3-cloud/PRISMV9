#!/usr/bin/env python3
"""
PRISM EXHAUSTIVE SEMANTIC WIRING SYSTEM
=======================================
TRUE precision wiring with:
1. Formula chains (output→input)
2. Specific formula→engine mappings
3. Engine dependency graphs
4. Cross-domain connections
5. Skill→engine method-level wiring

This is NOT category-based bulk mapping.
This is SEMANTIC PRECISION wiring.
"""

import json
from datetime import datetime
from collections import defaultdict

# ═══════════════════════════════════════════════════════════════════════════════
# FORMULA CHAINS: Output of one formula feeds input of another
# ═══════════════════════════════════════════════════════════════════════════════

FORMULA_CHAINS = {
    # CUTTING FORCE CHAIN
    "cutting_force_chain": {
        "description": "Complete cutting force to power to temperature chain",
        "sequence": [
            {"formula": "F-CUT-001", "output": "Fc", "feeds": ["F-POWER-001", "F-POWER-002", "F-VIB-001"]},
            {"formula": "F-CUT-002", "output": "Ff", "feeds": ["F-POWER-001", "F-DEFL-001"]},
            {"formula": "F-CUT-003", "output": "Fp", "feeds": ["F-POWER-001", "F-FIX-001"]},
            {"formula": "F-POWER-001", "output": "Pc", "feeds": ["F-THERM-001", "F-ECON-001"]},
            {"formula": "F-THERM-001", "output": "T_interface", "feeds": ["F-WEAR-001", "F-MAT-001"]},
            {"formula": "F-WEAR-001", "output": "VB", "feeds": ["F-WEAR-002", "F-SURF-001"]},
        ]
    },
    
    # TOOL LIFE CHAIN
    "tool_life_chain": {
        "description": "Taylor tool life with economic optimization",
        "sequence": [
            {"formula": "F-WEAR-003", "output": "T_life", "feeds": ["F-ECON-005", "F-ECON-006"]},
            {"formula": "F-ECON-005", "output": "Ct_tool", "feeds": ["F-ECON-001", "F-OPT-001"]},
            {"formula": "F-OPT-001", "output": "V_opt", "feeds": ["F-CUT-001", "F-PROC-001"]},
        ]
    },
    
    # VIBRATION STABILITY CHAIN
    "stability_chain": {
        "description": "Chatter prediction and stability lobes",
        "sequence": [
            {"formula": "F-VIB-001", "output": "omega_n", "feeds": ["F-VIB-003", "F-VIB-005"]},
            {"formula": "F-VIB-002", "output": "zeta", "feeds": ["F-VIB-003", "F-VIB-008"]},
            {"formula": "F-VIB-003", "output": "FRF", "feeds": ["F-VIB-005", "F-VIB-006"]},
            {"formula": "F-VIB-005", "output": "b_lim", "feeds": ["F-OPT-003", "F-PROC-005"]},
        ]
    },
    
    # SURFACE FINISH CHAIN
    "surface_chain": {
        "description": "Theoretical to actual surface roughness",
        "sequence": [
            {"formula": "F-SURF-001", "output": "Ra_theoretical", "feeds": ["F-SURF-003", "F-QUAL-001"]},
            {"formula": "F-VIB-008", "output": "Ra_vibration", "feeds": ["F-SURF-003"]},
            {"formula": "F-SURF-003", "output": "Ra_actual", "feeds": ["F-QUAL-001", "F-QUAL-002"]},
        ]
    },
    
    # THERMAL-WEAR CHAIN
    "thermal_wear_chain": {
        "description": "Temperature drives wear mechanisms",
        "sequence": [
            {"formula": "F-THERM-001", "output": "T_tool", "feeds": ["F-THERM-005", "F-WEAR-004"]},
            {"formula": "F-THERM-005", "output": "T_partition", "feeds": ["F-WEAR-005", "F-MAT-003"]},
            {"formula": "F-WEAR-004", "output": "W_diffusion", "feeds": ["F-WEAR-001"]},
            {"formula": "F-WEAR-005", "output": "W_adhesion", "feeds": ["F-WEAR-001"]},
        ]
    },
    
    # MATERIAL FLOW CHAIN
    "material_chain": {
        "description": "Johnson-Cook constitutive to chip formation",
        "sequence": [
            {"formula": "F-MAT-001", "output": "sigma_flow", "feeds": ["F-CHIP-001", "F-CUT-004"]},
            {"formula": "F-CHIP-001", "output": "phi", "feeds": ["F-CHIP-002", "F-CUT-001"]},
            {"formula": "F-CHIP-002", "output": "rc", "feeds": ["F-CHIP-003", "F-THERM-002"]},
        ]
    },
    
    # OPTIMIZATION CHAIN
    "optimization_chain": {
        "description": "Multi-objective optimization flow",
        "sequence": [
            {"formula": "F-OPT-001", "output": "obj_cost", "feeds": ["F-OPT-010", "F-PRM-001"]},
            {"formula": "F-OPT-002", "output": "obj_mrr", "feeds": ["F-OPT-010", "F-PRM-001"]},
            {"formula": "F-OPT-003", "output": "obj_quality", "feeds": ["F-OPT-010", "F-PRM-001"]},
            {"formula": "F-OPT-010", "output": "pareto_front", "feeds": ["F-PRM-002", "F-AI-001"]},
        ]
    },
    
    # AI/ML CHAIN
    "ai_chain": {
        "description": "ML prediction pipeline",
        "sequence": [
            {"formula": "F-AI-001", "output": "loss", "feeds": ["F-AI-002", "F-AI-005"]},
            {"formula": "F-AI-002", "output": "gradient", "feeds": ["F-AI-003"]},
            {"formula": "F-AI-003", "output": "weights_updated", "feeds": ["F-AI-004", "F-AI-010"]},
            {"formula": "F-AI-010", "output": "uncertainty", "feeds": ["F-PRM-003", "F-OPT-015"]},
        ]
    },
    
    # QUALITY CHAIN
    "quality_chain": {
        "description": "SPC capability analysis",
        "sequence": [
            {"formula": "F-QUAL-001", "output": "Cp", "feeds": ["F-QUAL-003", "F-QUAL-005"]},
            {"formula": "F-QUAL-002", "output": "Cpk", "feeds": ["F-QUAL-003", "F-QUAL-005"]},
            {"formula": "F-QUAL-005", "output": "sigma_level", "feeds": ["F-QUAL-006", "F-ECON-010"]},
            {"formula": "F-QUAL-006", "output": "DPMO", "feeds": ["F-ECON-010", "F-PRM-004"]},
        ]
    },
    
    # DIGITAL TWIN CHAIN
    "twin_chain": {
        "description": "State estimation and prediction",
        "sequence": [
            {"formula": "F-DT-001", "output": "x_predicted", "feeds": ["F-DT-002", "F-DT-005"]},
            {"formula": "F-DT-002", "output": "x_updated", "feeds": ["F-DT-003", "F-AI-015"]},
            {"formula": "F-DT-005", "output": "divergence", "feeds": ["F-DT-006", "F-PRM-005"]},
        ]
    },
    
    # ECONOMICS CHAIN
    "economics_chain": {
        "description": "Cost buildup to ROI",
        "sequence": [
            {"formula": "F-ECON-001", "output": "Cp_part", "feeds": ["F-ECON-010", "F-ECON-015"]},
            {"formula": "F-ECON-005", "output": "Ct_tool", "feeds": ["F-ECON-001"]},
            {"formula": "F-ECON-008", "output": "Cm_machine", "feeds": ["F-ECON-001"]},
            {"formula": "F-ECON-010", "output": "margin", "feeds": ["F-ECON-015", "F-ECON-020"]},
            {"formula": "F-ECON-015", "output": "ROI", "feeds": ["F-OPT-020"]},
        ]
    },
    
    # PRISM META CHAIN
    "prism_chain": {
        "description": "PRISM quality scoring cascade",
        "sequence": [
            {"formula": "F-PRM-010", "output": "R_score", "feeds": ["F-PRM-001"]},
            {"formula": "F-PRM-011", "output": "C_score", "feeds": ["F-PRM-001"]},
            {"formula": "F-PRM-012", "output": "P_score", "feeds": ["F-PRM-001"]},
            {"formula": "F-PRM-013", "output": "S_score", "feeds": ["F-PRM-001"]},
            {"formula": "F-PRM-014", "output": "L_score", "feeds": ["F-PRM-001"]},
            {"formula": "F-PRM-001", "output": "Omega", "feeds": ["F-PRM-020", "F-PRM-025"]},
        ]
    },
    
    # HYBRID PHYSICS-ML CHAIN
    "hybrid_chain": {
        "description": "Physics-informed machine learning",
        "sequence": [
            {"formula": "F-HYB-001", "output": "physics_pred", "feeds": ["F-HYB-005", "F-HYB-010"]},
            {"formula": "F-HYB-002", "output": "ml_residual", "feeds": ["F-HYB-005"]},
            {"formula": "F-HYB-005", "output": "hybrid_pred", "feeds": ["F-HYB-010", "F-AI-020"]},
            {"formula": "F-HYB-010", "output": "physics_loss", "feeds": ["F-AI-001"]},
        ]
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# PRECISE FORMULA → ENGINE MAPPINGS (NOT category-based bulk)
# ═══════════════════════════════════════════════════════════════════════════════

PRECISE_FORMULA_ENGINE_MAP = {
    # Cutting formulas → Specific physics engines
    "F-CUT-001": ["E-PHYS-KIENZLE", "E-PHYS-CUTTING-FORCE", "E-CAM-FEEDS-SPEEDS"],
    "F-CUT-002": ["E-PHYS-KIENZLE", "E-PHYS-FEED-FORCE", "E-CAM-FEEDS-SPEEDS"],
    "F-CUT-003": ["E-PHYS-KIENZLE", "E-PHYS-PASSIVE-FORCE"],
    "F-CUT-004": ["E-PHYS-MERCHANT", "E-PHYS-SHEAR-PLANE"],
    "F-CUT-005": ["E-PHYS-OXLEY", "E-PHYS-CUTTING-FORCE"],
    
    # Power formulas → Power/thermal engines
    "F-POWER-001": ["E-PHYS-POWER", "E-PHYS-SPINDLE", "E-CAM-FEEDS-SPEEDS"],
    "F-POWER-002": ["E-PHYS-SPECIFIC-ENERGY", "E-PHYS-POWER"],
    
    # Thermal formulas → Thermal engines + AI
    "F-THERM-001": ["E-PHYS-THERMAL", "E-DT-TEMPERATURE", "E-AI-TEMP-PREDICT"],
    "F-THERM-002": ["E-PHYS-HEAT-PARTITION", "E-PHYS-THERMAL"],
    "F-THERM-005": ["E-PHYS-THERMAL", "E-PHYS-TOOL-TEMP"],
    
    # Wear formulas → Wear engines + economics
    "F-WEAR-001": ["E-PHYS-TAYLOR", "E-PHYS-TOOL-WEAR", "E-BUS-TOOL-COST"],
    "F-WEAR-002": ["E-PHYS-USUI", "E-PHYS-TOOL-WEAR"],
    "F-WEAR-003": ["E-PHYS-TAYLOR", "E-PROC-TOOL-LIFE", "E-BUS-TOOL-COST"],
    
    # Vibration formulas → Stability engines
    "F-VIB-001": ["E-PHYS-CHATTER", "E-PHYS-MODAL", "E-DT-VIBRATION"],
    "F-VIB-002": ["E-PHYS-DAMPING", "E-PHYS-CHATTER"],
    "F-VIB-003": ["E-PHYS-FRF", "E-PHYS-CHATTER", "E-AI-CHATTER-DETECT"],
    "F-VIB-005": ["E-PHYS-STABILITY-LOBE", "E-CAM-CHATTER-AVOID"],
    
    # Surface formulas → Quality engines
    "F-SURF-001": ["E-PHYS-SURFACE", "E-QUAL-ROUGHNESS", "E-CAM-FINISH"],
    "F-SURF-002": ["E-PHYS-SCALLOP", "E-CAM-FINISH"],
    "F-SURF-003": ["E-PHYS-SURFACE", "E-QUAL-ROUGHNESS"],
    
    # Material formulas → Constitutive engines
    "F-MAT-001": ["E-PHYS-JOHNSON-COOK", "E-PHYS-FLOW-STRESS", "E-AI-MATERIAL"],
    "F-MAT-002": ["E-PHYS-ZERILLI", "E-PHYS-FLOW-STRESS"],
    "F-MAT-005": ["E-PHYS-HARDNESS", "E-PROC-MATERIAL-SELECT"],
    
    # Optimization formulas → AI engines
    "F-OPT-001": ["E-AI-PSO", "E-AI-GA", "E-AI-OPTIMIZER", "E-PROC-OPTIMIZE"],
    "F-OPT-002": ["E-AI-PSO", "E-AI-GA", "E-AI-OPTIMIZER"],
    "F-OPT-010": ["E-AI-NSGA2", "E-AI-MOEAD", "E-AI-PARETO"],
    
    # AI/ML formulas → Neural engines
    "F-AI-001": ["E-AI-NEURAL", "E-AI-TRAINER", "E-AI-LOSS"],
    "F-AI-002": ["E-AI-BACKPROP", "E-AI-TRAINER"],
    "F-AI-003": ["E-AI-ADAM", "E-AI-SGD", "E-AI-TRAINER"],
    "F-AI-010": ["E-AI-UNCERTAINTY", "E-AI-BAYESIAN", "E-PRISM-CONFIDENCE"],
    
    # Quality formulas → SPC engines
    "F-QUAL-001": ["E-QUAL-SPC", "E-QUAL-CAPABILITY", "E-PROC-QUALITY"],
    "F-QUAL-002": ["E-QUAL-SPC", "E-QUAL-CAPABILITY"],
    "F-QUAL-005": ["E-QUAL-SIX-SIGMA", "E-QUAL-SPC"],
    
    # Economics formulas → Business engines
    "F-ECON-001": ["E-BUS-COST", "E-BUS-QUOTE", "E-PROC-ECONOMICS"],
    "F-ECON-005": ["E-BUS-TOOL-COST", "E-BUS-COST"],
    "F-ECON-010": ["E-BUS-MARGIN", "E-BUS-QUOTE"],
    "F-ECON-015": ["E-BUS-ROI", "E-BUS-NPV"],
    
    # Digital twin formulas → Twin engines
    "F-DT-001": ["E-DT-KALMAN", "E-DT-STATE-PREDICT", "E-AI-STATE"],
    "F-DT-002": ["E-DT-KALMAN", "E-DT-STATE-UPDATE"],
    "F-DT-005": ["E-DT-DIVERGENCE", "E-PRISM-TWIN-HEALTH"],
    
    # PRISM meta formulas → PRISM engines
    "F-PRM-001": ["E-PRISM-OMEGA", "E-PRISM-QUALITY", "E-PRISM-GATE"],
    "F-PRM-010": ["E-PRISM-REASONING", "E-PRISM-OMEGA"],
    "F-PRM-013": ["E-PRISM-SAFETY", "E-PRISM-OMEGA", "E-PRISM-GATE"],
    
    # Hybrid formulas → Combined engines
    "F-HYB-001": ["E-AI-HYBRID", "E-PHYS-GENERIC", "E-AI-PHYSICS-INFORMED"],
    "F-HYB-005": ["E-AI-HYBRID", "E-PRISM-HYBRID"],
    "F-HYB-010": ["E-AI-PHYSICS-LOSS", "E-AI-HYBRID"],
    
    # Geometric formulas → CAD/CAM engines
    "F-GEOM-001": ["E-CAD-TRANSFORM", "E-CAM-TOOLPATH"],
    "F-GEOM-005": ["E-CAD-NURBS", "E-CAM-SURFACE"],
    
    # Machine formulas → Machine engines
    "F-MACH-001": ["E-CAM-AXIS-DYNAMICS", "E-DT-MACHINE"],
    "F-MACH-005": ["E-CAM-SPINDLE", "E-PHYS-SPINDLE"],
    
    # Tool geometry formulas → Tool engines
    "F-TOOL-001": ["E-CAM-TOOL-ENGAGE", "E-PHYS-TOOL-GEOM"],
    "F-TOOL-005": ["E-CAM-TOOL-SELECT", "E-PROC-TOOLING"],
    
    # Fixture formulas → Fixture engines
    "F-FIX-001": ["E-CAM-FIXTURE", "E-PHYS-CLAMP-FORCE"],
    
    # Coolant formulas → Coolant engines
    "F-COOL-001": ["E-PHYS-COOLANT", "E-PROC-COOLANT"],
    
    # Scheduling formulas → Business engines
    "F-SCHED-001": ["E-BUS-SCHEDULE", "E-PROC-PLANNING"],
    
    # Metrology formulas → Quality engines
    "F-MET-001": ["E-QUAL-MEASURE", "E-DT-METROLOGY"],
    
    # Tribology formulas → Physics engines
    "F-TRIB-001": ["E-PHYS-FRICTION", "E-PHYS-TRIBOLOGY"],
    
    # Signal formulas → AI engines
    "F-SIG-001": ["E-AI-FFT", "E-AI-SIGNAL", "E-DT-MONITOR"],
    "F-SIG-005": ["E-AI-WAVELET", "E-AI-SIGNAL"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# ENGINE DEPENDENCY GRAPH: Engines that require other engines
# ═══════════════════════════════════════════════════════════════════════════════

ENGINE_DEPENDENCIES = {
    # CAM engines depend on physics
    "E-CAM-FEEDS-SPEEDS": ["E-PHYS-KIENZLE", "E-PHYS-POWER", "E-PHYS-TAYLOR"],
    "E-CAM-TOOLPATH": ["E-PHYS-CUTTING-FORCE", "E-CAD-GEOMETRY", "E-AI-OPTIMIZER"],
    "E-CAM-FINISH": ["E-PHYS-SURFACE", "E-PHYS-SCALLOP", "E-AI-PREDICT-SURFACE"],
    "E-CAM-CHATTER-AVOID": ["E-PHYS-STABILITY-LOBE", "E-PHYS-FRF", "E-AI-CHATTER-DETECT"],
    
    # AI engines depend on physics for physics-informed ML
    "E-AI-HYBRID": ["E-PHYS-GENERIC", "E-AI-NEURAL", "E-AI-PHYSICS-LOSS"],
    "E-AI-PHYSICS-INFORMED": ["E-PHYS-KIENZLE", "E-AI-NEURAL"],
    "E-AI-TEMP-PREDICT": ["E-PHYS-THERMAL", "E-AI-LSTM"],
    "E-AI-CHATTER-DETECT": ["E-PHYS-FRF", "E-AI-FFT", "E-AI-CLASSIFIER"],
    
    # Quality engines depend on process data
    "E-QUAL-SPC": ["E-PROC-DATA-COLLECT", "E-AI-STATISTICS"],
    "E-QUAL-ROUGHNESS": ["E-PHYS-SURFACE", "E-DT-MEASURE"],
    
    # Business engines depend on multiple domains
    "E-BUS-QUOTE": ["E-BUS-COST", "E-PROC-TIME", "E-PHYS-TAYLOR"],
    "E-BUS-SCHEDULE": ["E-PROC-PLANNING", "E-AI-OPTIMIZER"],
    
    # Digital twin depends on everything
    "E-DT-MACHINE": ["E-PHYS-ALL", "E-AI-STATE", "E-CAM-DYNAMICS"],
    "E-DT-PROCESS": ["E-PHYS-CUTTING-FORCE", "E-PHYS-THERMAL", "E-AI-PREDICT"],
    
    # PRISM engines orchestrate
    "E-PRISM-OMEGA": ["E-PRISM-REASONING", "E-PRISM-CODE", "E-PRISM-PROCESS", "E-PRISM-SAFETY", "E-PRISM-LEARNING"],
    "E-PRISM-HYBRID": ["E-PHYS-GENERIC", "E-AI-NEURAL", "E-PRISM-CONFIDENCE"],
    
    # Integration engines connect layers
    "E-INTEG-GATEWAY": ["E-ALL-ENGINES"],
    "E-INTEG-ORCHESTRATOR": ["E-PRISM-OMEGA", "E-AI-OPTIMIZER"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-DOMAIN CONNECTIONS: Non-obvious but valid wiring
# ═══════════════════════════════════════════════════════════════════════════════

CROSS_DOMAIN_WIRING = {
    # Physics ↔ AI bidirectional
    ("F-CUT-001", "E-AI-FORCE-PREDICT"): "ML predicts cutting force",
    ("F-THERM-001", "E-AI-TEMP-PREDICT"): "ML predicts temperature",
    ("F-VIB-001", "E-AI-CHATTER-DETECT"): "ML detects chatter onset",
    ("F-WEAR-001", "E-AI-WEAR-PREDICT"): "ML predicts tool wear",
    
    # Economics ↔ AI
    ("F-ECON-001", "E-AI-COST-OPTIMIZE"): "ML optimizes cost",
    ("F-ECON-015", "E-AI-ROI-PREDICT"): "ML predicts ROI",
    
    # Quality ↔ AI
    ("F-QUAL-001", "E-AI-QUALITY-PREDICT"): "ML predicts capability",
    ("F-SURF-001", "E-AI-SURFACE-PREDICT"): "ML predicts roughness",
    
    # Physics ↔ Digital Twin
    ("F-CUT-001", "E-DT-FORCE-MONITOR"): "Twin monitors force",
    ("F-THERM-001", "E-DT-THERMAL-STATE"): "Twin tracks temperature",
    
    # AI ↔ PRISM
    ("F-AI-010", "E-PRISM-CONFIDENCE"): "Uncertainty feeds confidence",
    ("F-OPT-010", "E-PRISM-DECISION"): "Pareto feeds decisions",
    
    # Hybrid connections
    ("F-HYB-001", "E-AI-NEURAL"): "Physics output augments ML",
    ("F-HYB-005", "E-PHYS-GENERIC"): "Hybrid uses physics base",
    
    # Signal ↔ Physics
    ("F-SIG-001", "E-PHYS-FREQUENCY"): "FFT reveals natural freq",
    ("F-SIG-005", "E-PHYS-CHATTER"): "Wavelet detects chatter",
}

def build_exhaustive_wiring():
    """Build the complete semantic wiring graph"""
    
    wiring = {
        "version": "10.0.0",
        "type": "EXHAUSTIVE_SEMANTIC",
        "generatedAt": datetime.now().isoformat(),
        
        # Formula chains (dependency flow)
        "formula_chains": FORMULA_CHAINS,
        
        # Precise mappings (not bulk)
        "precise_formula_engine": PRECISE_FORMULA_ENGINE_MAP,
        
        # Engine dependencies
        "engine_dependencies": ENGINE_DEPENDENCIES,
        
        # Cross-domain wiring
        "cross_domain": {k[0] + "→" + k[1]: v for k, v in CROSS_DOMAIN_WIRING.items()},
    }
    
    # Count unique connections
    formula_engine_pairs = set()
    for fid, engines in PRECISE_FORMULA_ENGINE_MAP.items():
        for eid in engines:
            formula_engine_pairs.add((fid, eid))
    
    chain_steps = sum(len(c["sequence"]) for c in FORMULA_CHAINS.values())
    
    wiring["statistics"] = {
        "formula_chains": len(FORMULA_CHAINS),
        "chain_steps": chain_steps,
        "precise_mappings": len(PRECISE_FORMULA_ENGINE_MAP),
        "unique_formula_engine_pairs": len(formula_engine_pairs),
        "engine_dependencies": len(ENGINE_DEPENDENCIES),
        "cross_domain_connections": len(CROSS_DOMAIN_WIRING),
    }
    
    return wiring

def main():
    print("=" * 80)
    print("PRISM EXHAUSTIVE SEMANTIC WIRING")
    print("=" * 80)
    
    wiring = build_exhaustive_wiring()
    
    print(f"\nFormula Chains: {wiring['statistics']['formula_chains']}")
    print(f"  Total chain steps: {wiring['statistics']['chain_steps']}")
    print(f"\nPrecise Mappings: {wiring['statistics']['precise_mappings']}")
    print(f"  Unique F->E pairs: {wiring['statistics']['unique_formula_engine_pairs']}")
    print(f"\nEngine Dependencies: {wiring['statistics']['engine_dependencies']}")
    print(f"Cross-Domain: {wiring['statistics']['cross_domain_connections']}")
    
    # List all chains
    print(f"\n{'='*60}")
    print("FORMULA CHAINS (Output->Input Flow)")
    print(f"{'='*60}")
    for name, chain in FORMULA_CHAINS.items():
        print(f"\n{name}: {chain['description']}")
        for step in chain["sequence"][:3]:  # Show first 3
            feeds = ", ".join(step["feeds"][:2])
            print(f"  {step['formula']} -> {step['output']} -> [{feeds}...]")
    
    # Save
    output_path = r"C:\PRISM\registries\WIRING_SEMANTIC.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(wiring, f, indent=2)
    
    print(f"\n{'='*60}")
    print("SEMANTIC WIRING COMPLETE")
    print(f"{'='*60}")
    print(f"  Saved: {output_path}")
    print(f"\n  This is PRECISION wiring, not bulk category mapping!")

if __name__ == "__main__":
    main()
