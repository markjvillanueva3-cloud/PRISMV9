#!/usr/bin/env python3
"""
PRISM Registry Builder - Session R2.2.1
Create RESOURCE_REGISTRY, CAPABILITY_MATRIX, SYNERGY_MATRIX for ILP engine
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

# Paths
SKILLS_PATH = r"C:\PRISM\skills-consolidated"
EXTRACTED_PATH = r"C:\\PRISM\EXTRACTED"
OUTPUT_PATH = r"C:\PRISM\registries"
SCRIPTS_PATH = r"C:\PRISM\scripts"

# Resource categories and their mappings
CAPABILITY_DOMAINS = {
    "MATERIALS": ["material", "alloy", "steel", "aluminum", "titanium", "kienzle", "johnson-cook"],
    "MACHINES": ["machine", "spindle", "axis", "kinematics", "cnc", "lathe", "mill"],
    "TOOLS": ["tool", "cutter", "insert", "holder", "cutting"],
    "CAD": ["cad", "brep", "nurbs", "geometry", "solid", "surface", "mesh"],
    "CAM": ["cam", "toolpath", "machining", "strategy", "roughing", "finishing"],
    "POST": ["post", "gcode", "mcode", "fanuc", "siemens", "heidenhain", "controller"],
    "PHYSICS": ["physics", "force", "thermal", "vibration", "chatter", "mechanics"],
    "AI_ML": ["ai", "ml", "neural", "learning", "deep", "optimization", "bayesian"],
    "QUALITY": ["quality", "validation", "verify", "check", "audit", "safety"],
    "BUSINESS": ["cost", "quote", "schedule", "shop", "pricing"],
    "KNOWLEDGE": ["knowledge", "algorithm", "pattern", "reference"],
    "SESSION": ["session", "state", "handoff", "continuity", "buffer"],
    "INTEGRATION": ["integration", "bridge", "connector", "hub"],
    "FORMULA": ["formula", "equation", "calculation", "math"],
    "ALGORITHM": ["algorithm", "solver", "optimizer", "search"],
    "INFRASTRUCTURE": ["infrastructure", "cache", "storage", "queue", "bus"],
    "LEARNING": ["learning", "adaptive", "continual", "reinforcement"],
    "CORE": ["core", "gateway", "event", "state", "config"],
    "SYSTEMS": ["system", "module", "loader", "resolver"],
    "UNITS": ["unit", "conversion", "measurement"],
    "CONSTANTS": ["constant", "parameter", "config"],
    "WORKHOLDING": ["fixture", "clamp", "vise", "chuck", "workholding"],
}

def scan_skills():
    """Scan all skills and extract metadata"""
    print("Scanning skills...")
    skills = []
    
    for item in os.listdir(SKILLS_PATH):
        skill_dir = os.path.join(SKILLS_PATH, item)
        skill_file = os.path.join(skill_dir, "SKILL.md")
        
        if os.path.isdir(skill_dir) and os.path.exists(skill_file):
            try:
                with open(skill_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = len(content.split('\n'))
                    
                    # Extract description from first paragraph
                    desc_match = re.search(r'^#[^\n]+\n+([^\n#]+)', content)
                    description = desc_match.group(1).strip()[:200] if desc_match else ""
                    
                    # Determine capabilities
                    content_lower = content.lower()
                    capabilities = []
                    for domain, keywords in CAPABILITY_DOMAINS.items():
                        if any(kw in content_lower for kw in keywords):
                            capabilities.append(domain)
                    
                    if not capabilities:
                        capabilities = ["GENERAL"]
                    
                    skills.append({
                        "id": f"SKILL-{item.upper().replace('-', '_')}",
                        "name": item,
                        "type": "SKILL",
                        "path": f"C:\\PRISM\\skills-consolidated\\{item}\\SKILL.md",
                        "lines": lines,
                        "description": description,
                        "capabilities": capabilities,
                        "level": determine_skill_level(item)
                    })
            except Exception as e:
                print(f"  Error scanning {item}: {e}")
    
    print(f"  Found {len(skills)} skills")
    return skills

def determine_skill_level(name):
    """Determine skill level (L0-L3)"""
    if any(x in name for x in ['cognitive-core', 'life-safety', 'master-equation']):
        return "L0"  # Always-on
    elif any(x in name for x in ['universal-formulas', 'reasoning-engine', 'safety-framework', 'code-perfection']):
        return "L1"  # Core processing
    elif any(x in name for x in ['expert-', 'sp-', 'swarm-']):
        return "L2"  # Domain-specific
    else:
        return "L3"  # Task-specific

def scan_scripts():
    """Scan all Python scripts"""
    print("Scanning scripts...")
    scripts = []
    
    for root, dirs, files in os.walk(SCRIPTS_PATH):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        lines = len(content.split('\n'))
                        
                        # Extract docstring
                        doc_match = re.search(r'"""([^"]+)"""', content)
                        description = doc_match.group(1).strip()[:200] if doc_match else ""
                        
                        # Determine capabilities
                        content_lower = content.lower()
                        capabilities = []
                        for domain, keywords in CAPABILITY_DOMAINS.items():
                            if any(kw in content_lower for kw in keywords):
                                capabilities.append(domain)
                        
                        if not capabilities:
                            capabilities = ["AUTOMATION"]
                        
                        scripts.append({
                            "id": f"SCRIPT-{file.upper().replace('.PY', '').replace('-', '_')}",
                            "name": file,
                            "type": "SCRIPT",
                            "path": filepath,
                            "lines": lines,
                            "description": description,
                            "capabilities": capabilities
                        })
                except Exception as e:
                    print(f"  Error scanning {file}: {e}")
    
    print(f"  Found {len(scripts)} scripts")
    return scripts

def scan_extracted_engines():
    """Scan ALL extracted modules and categorize"""
    print("Scanning extracted engines...")
    engines = []
    
    # Scan ALL subdirectories in EXTRACTED folder
    scan_paths = []
    for item in os.listdir(EXTRACTED_PATH):
        item_path = os.path.join(EXTRACTED_PATH, item)
        if os.path.isdir(item_path):
            scan_paths.append(item_path)
    
    print(f"  Scanning {len(scan_paths)} directories: {[os.path.basename(p) for p in scan_paths]}")
    
    for scan_path in scan_paths:
        if not os.path.exists(scan_path):
            continue
        
        for root, dirs, files in os.walk(scan_path):
            for file in files:
                if file.endswith('.js'):
                    filepath = os.path.join(root, file)
                    rel_path = os.path.relpath(filepath, EXTRACTED_PATH)
                    
                    try:
                        size = os.path.getsize(filepath)
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            lines = len(content.split('\n'))
                        
                        # Determine category from path
                        if 'ai_ml' in rel_path or 'ai_complete' in rel_path:
                            category = "AI_ML"
                        elif 'cad_cam' in rel_path or 'cad_complete' in rel_path:
                            category = "CAD_CAM"
                        elif 'optimization' in rel_path:
                            category = "OPTIMIZATION"
                        elif 'simulation' in rel_path:
                            category = "SIMULATION"
                        elif 'post_processor' in rel_path:
                            category = "POST"
                        elif 'algorithm' in rel_path:
                            category = "ALGORITHM"
                        elif 'formula' in rel_path:
                            category = "FORMULA"
                        elif 'knowledge_base' in rel_path:
                            category = "KNOWLEDGE"
                        elif 'learning' in rel_path:
                            category = "LEARNING"
                        elif 'integration' in rel_path:
                            category = "INTEGRATION"
                        elif 'infrastructure' in rel_path:
                            category = "INFRASTRUCTURE"
                        elif 'business' in rel_path:
                            category = "BUSINESS"
                        elif 'core' in rel_path:
                            category = "CORE"
                        elif 'systems' in rel_path:
                            category = "SYSTEMS"
                        elif 'materials' in rel_path:
                            category = "MATERIALS"
                        elif 'machines' in rel_path:
                            category = "MACHINES"
                        elif 'tools' in rel_path:
                            category = "TOOLS"
                        elif 'units' in rel_path:
                            category = "UNITS"
                        elif 'constants' in rel_path:
                            category = "CONSTANTS"
                        elif 'workholding' in rel_path:
                            category = "WORKHOLDING"
                        else:
                            # Determine from filename
                            name_lower = file.lower()
                            if 'thermal' in name_lower or 'heat' in name_lower:
                                category = "THERMAL"
                            elif 'chatter' in name_lower or 'vibration' in name_lower:
                                category = "VIBRATION"
                            elif 'surface' in name_lower or 'finish' in name_lower:
                                category = "SURFACE"
                            elif 'kinematic' in name_lower or 'dynamic' in name_lower:
                                category = "PHYSICS"
                            elif 'cutting' in name_lower or 'force' in name_lower:
                                category = "PHYSICS"
                            elif 'tool' in name_lower:
                                category = "TOOLS"
                            elif 'algorithm' in name_lower or 'solver' in name_lower:
                                category = "ALGORITHM"
                            elif 'formula' in name_lower or 'physics' in name_lower or 'thermal' in name_lower or 'force' in name_lower or 'stress' in name_lower:
                                category = "FORMULA"
                            else:
                                category = "ENGINE"
                        
                        engines.append({
                            "id": f"ENGINE-{file.upper().replace('.JS', '').replace('-', '_')}",
                            "name": file.replace('.js', ''),
                            "type": "ENGINE",
                            "path": filepath,
                            "lines": lines,
                            "size": size,
                            "category": category,
                            "capabilities": [category] if category else ["ENGINE"]
                        })
                    except Exception as e:
                        print(f"  Error scanning {file}: {e}")
    
    print(f"  Found {len(engines)} engines")
    return engines

def define_agents():
    """Define the 64 AI agents"""
    agents = [
        # Core Agents (10)
        {"id": "AGENT-ORCHESTRATOR", "name": "Orchestrator", "role": "Master coordination", "capabilities": ["INTEGRATION", "SESSION"]},
        {"id": "AGENT-VALIDATOR", "name": "Validator", "role": "Quality validation", "capabilities": ["QUALITY"]},
        {"id": "AGENT-EXTRACTOR", "name": "Extractor", "role": "Code extraction", "capabilities": ["KNOWLEDGE"]},
        {"id": "AGENT-AUDITOR", "name": "Auditor", "role": "Compliance audit", "capabilities": ["QUALITY"]},
        {"id": "AGENT-OPTIMIZER", "name": "Optimizer", "role": "Performance optimization", "capabilities": ["AI_ML"]},
        {"id": "AGENT-LEARNER", "name": "Learner", "role": "Continuous learning", "capabilities": ["AI_ML"]},
        {"id": "AGENT-PREDICTOR", "name": "Predictor", "role": "Predictive analysis", "capabilities": ["AI_ML"]},
        {"id": "AGENT-REASONER", "name": "Reasoner", "role": "Logical reasoning", "capabilities": ["AI_ML", "QUALITY"]},
        {"id": "AGENT-PLANNER", "name": "Planner", "role": "Task planning", "capabilities": ["SESSION"]},
        {"id": "AGENT-EXECUTOR", "name": "Executor", "role": "Task execution", "capabilities": ["SESSION"]},
        
        # Domain Experts (10)
        {"id": "AGENT-MACHINIST", "name": "Master Machinist", "role": "Machining expertise", "capabilities": ["MACHINES", "TOOLS", "CAM"]},
        {"id": "AGENT-MATERIALS", "name": "Materials Scientist", "role": "Materials expertise", "capabilities": ["MATERIALS", "PHYSICS"]},
        {"id": "AGENT-CAD-EXPERT", "name": "CAD Expert", "role": "CAD/geometry expertise", "capabilities": ["CAD"]},
        {"id": "AGENT-CAM-PROGRAMMER", "name": "CAM Programmer", "role": "Toolpath generation", "capabilities": ["CAM", "POST"]},
        {"id": "AGENT-POST-PROCESSOR", "name": "Post Processor", "role": "G-code generation", "capabilities": ["POST"]},
        {"id": "AGENT-QUALITY-CONTROL", "name": "Quality Control", "role": "Quality management", "capabilities": ["QUALITY"]},
        {"id": "AGENT-THERMAL", "name": "Thermal Engineer", "role": "Thermal analysis", "capabilities": ["PHYSICS"]},
        {"id": "AGENT-DYNAMICS", "name": "Dynamics Engineer", "role": "Vibration/dynamics", "capabilities": ["PHYSICS"]},
        {"id": "AGENT-COST-ANALYST", "name": "Cost Analyst", "role": "Cost estimation", "capabilities": ["BUSINESS"]},
        {"id": "AGENT-SHOP-MANAGER", "name": "Shop Manager", "role": "Shop optimization", "capabilities": ["BUSINESS"]},
        
        # AI/ML Agents (15)
        {"id": "AGENT-BAYESIAN", "name": "Bayesian Agent", "role": "Probabilistic inference", "capabilities": ["AI_ML"]},
        {"id": "AGENT-NEURAL", "name": "Neural Agent", "role": "Neural networks", "capabilities": ["AI_ML"]},
        {"id": "AGENT-GENETIC", "name": "Genetic Agent", "role": "Evolutionary optimization", "capabilities": ["AI_ML"]},
        {"id": "AGENT-PSO", "name": "PSO Agent", "role": "Swarm optimization", "capabilities": ["AI_ML"]},
        {"id": "AGENT-RL", "name": "RL Agent", "role": "Reinforcement learning", "capabilities": ["AI_ML"]},
        {"id": "AGENT-DQN", "name": "DQN Agent", "role": "Deep Q-learning", "capabilities": ["AI_ML"]},
        {"id": "AGENT-TRANSFORMER", "name": "Transformer Agent", "role": "Attention models", "capabilities": ["AI_ML"]},
        {"id": "AGENT-GNN", "name": "GNN Agent", "role": "Graph neural networks", "capabilities": ["AI_ML"]},
        {"id": "AGENT-LSTM", "name": "LSTM Agent", "role": "Sequence modeling", "capabilities": ["AI_ML"]},
        {"id": "AGENT-AUTOENCODER", "name": "Autoencoder Agent", "role": "Representation learning", "capabilities": ["AI_ML"]},
        {"id": "AGENT-CLUSTERING", "name": "Clustering Agent", "role": "Cluster analysis", "capabilities": ["AI_ML"]},
        {"id": "AGENT-ANOMALY", "name": "Anomaly Agent", "role": "Anomaly detection", "capabilities": ["AI_ML", "QUALITY"]},
        {"id": "AGENT-ENSEMBLE", "name": "Ensemble Agent", "role": "Model ensembling", "capabilities": ["AI_ML"]},
        {"id": "AGENT-XAI", "name": "XAI Agent", "role": "Explainability", "capabilities": ["AI_ML", "QUALITY"]},
        {"id": "AGENT-GRADIENT", "name": "Gradient Agent", "role": "Gradient optimization", "capabilities": ["AI_ML"]},
        
        # Physics Agents (8)
        {"id": "AGENT-KIENZLE", "name": "Kienzle Agent", "role": "Cutting force calculation", "capabilities": ["PHYSICS", "MATERIALS"]},
        {"id": "AGENT-TAYLOR", "name": "Taylor Agent", "role": "Tool life prediction", "capabilities": ["PHYSICS", "TOOLS"]},
        {"id": "AGENT-MERCHANT", "name": "Merchant Agent", "role": "Chip formation", "capabilities": ["PHYSICS"]},
        {"id": "AGENT-STABILITY", "name": "Stability Agent", "role": "Stability analysis", "capabilities": ["PHYSICS"]},
        {"id": "AGENT-THERMAL-SIM", "name": "Thermal Sim Agent", "role": "Thermal simulation", "capabilities": ["PHYSICS"]},
        {"id": "AGENT-FEA", "name": "FEA Agent", "role": "Finite element analysis", "capabilities": ["PHYSICS", "CAD"]},
        {"id": "AGENT-SURFACE", "name": "Surface Agent", "role": "Surface finish prediction", "capabilities": ["PHYSICS", "QUALITY"]},
        {"id": "AGENT-WEAR", "name": "Wear Agent", "role": "Tool wear prediction", "capabilities": ["PHYSICS", "TOOLS"]},
        
        # CAD/CAM Agents (8)
        {"id": "AGENT-FEATURE-REC", "name": "Feature Recognition", "role": "Feature detection", "capabilities": ["CAD"]},
        {"id": "AGENT-TOOLPATH-GEN", "name": "Toolpath Generator", "role": "Toolpath creation", "capabilities": ["CAM"]},
        {"id": "AGENT-COLLISION", "name": "Collision Agent", "role": "Collision detection", "capabilities": ["CAM", "CAD"]},
        {"id": "AGENT-STOCK-SIM", "name": "Stock Simulation", "role": "Material removal sim", "capabilities": ["CAM"]},
        {"id": "AGENT-NURBS", "name": "NURBS Agent", "role": "Surface mathematics", "capabilities": ["CAD"]},
        {"id": "AGENT-TESSELLATOR", "name": "Tessellator Agent", "role": "Mesh generation", "capabilities": ["CAD"]},
        {"id": "AGENT-MULTIAXIS", "name": "Multiaxis Agent", "role": "5-axis toolpaths", "capabilities": ["CAM"]},
        {"id": "AGENT-REST-MACHINING", "name": "Rest Machining", "role": "Rest material detection", "capabilities": ["CAM"]},
        
        # Session/Quality Agents (8)
        {"id": "AGENT-STATE", "name": "State Agent", "role": "State management", "capabilities": ["SESSION"]},
        {"id": "AGENT-CHECKPOINT", "name": "Checkpoint Agent", "role": "Progress tracking", "capabilities": ["SESSION"]},
        {"id": "AGENT-RECOVERY", "name": "Recovery Agent", "role": "Error recovery", "capabilities": ["SESSION", "QUALITY"]},
        {"id": "AGENT-HANDOFF", "name": "Handoff Agent", "role": "Session transitions", "capabilities": ["SESSION"]},
        {"id": "AGENT-SAFETY", "name": "Safety Agent", "role": "Safety verification", "capabilities": ["QUALITY", "PHYSICS"]},
        {"id": "AGENT-REGRESSION", "name": "Anti-Regression Agent", "role": "Regression prevention", "capabilities": ["QUALITY"]},
        {"id": "AGENT-COMPLETENESS", "name": "Completeness Agent", "role": "Coverage verification", "capabilities": ["QUALITY"]},
        {"id": "AGENT-EVIDENCE", "name": "Evidence Agent", "role": "Evidence collection", "capabilities": ["QUALITY"]},
        
        # Integration Agents (5)
        {"id": "AGENT-BRIDGE", "name": "Bridge Agent", "role": "System integration", "capabilities": ["INTEGRATION"]},
        {"id": "AGENT-SYNC", "name": "Sync Agent", "role": "Data synchronization", "capabilities": ["INTEGRATION"]},
        {"id": "AGENT-MAPPER", "name": "Mapper Agent", "role": "Resource mapping", "capabilities": ["INTEGRATION"]},
        {"id": "AGENT-ROUTER", "name": "Router Agent", "role": "Request routing", "capabilities": ["INTEGRATION"]},
        {"id": "AGENT-AGGREGATOR", "name": "Aggregator Agent", "role": "Result aggregation", "capabilities": ["INTEGRATION"]},
    ]
    
    print(f"  Defined {len(agents)} agents")
    return agents

def define_formulas():
    """Define the 22 core formulas"""
    formulas = [
        # Master Equations (3)
        {"id": "F-OMEGA", "name": "Master Quality Equation", "formula": "Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L", "domain": "QUALITY", "type": "FORMULA", "capabilities": ["QUALITY"]},
        {"id": "F-PSI-001", "name": "ILP Combination Engine", "formula": "Ψ = argmax[Σ Cap(r,T) × Syn(R) × Ω(R) × K(R) / Cost(R)]", "domain": "OPTIMIZATION", "type": "FORMULA", "capabilities": ["AI_ML", "QUALITY"]},
        {"id": "F-ALARM", "name": "Alarm Coverage Equation", "formula": "Ψ_ALARM = Σᵢ(Cᵢ × wᵢ) / Σᵢ(Tᵢ × wᵢ)", "domain": "QUALITY", "type": "FORMULA", "capabilities": ["QUALITY", "POST"]},
        
        # Cutting Physics (6)
        {"id": "F-KIENZLE", "name": "Kienzle Cutting Force", "formula": "Fc = kc1.1 × h^mc × b", "domain": "PHYSICS", "type": "FORMULA", "capabilities": ["PHYSICS", "MATERIALS"]},
        {"id": "F-TAYLOR", "name": "Taylor Tool Life", "formula": "VT^n = C", "domain": "PHYSICS", "type": "FORMULA", "capabilities": ["PHYSICS", "TOOLS"]},
        {"id": "F-MERCHANT", "name": "Merchant Shear Angle", "formula": "φ = 45° + α/2 - β/2", "domain": "PHYSICS", "type": "FORMULA", "capabilities": ["PHYSICS", "MATERIALS"]},
        {"id": "F-MRR", "name": "Material Removal Rate", "formula": "MRR = Vc × f × ap", "domain": "PHYSICS", "type": "FORMULA", "capabilities": ["PHYSICS", "CAM"]},
        {"id": "F-POWER", "name": "Cutting Power", "formula": "Pc = Fc × Vc / 60000", "domain": "PHYSICS", "type": "FORMULA", "capabilities": ["PHYSICS", "MACHINES"]},
        {"id": "F-TORQUE", "name": "Spindle Torque", "formula": "T = (Pc × 9549) / n", "domain": "PHYSICS", "type": "FORMULA", "capabilities": ["PHYSICS", "MACHINES"]},
        
        # Thermal (3)
        {"id": "F-HEAT-PARTITION", "name": "Heat Partition", "formula": "R = Qchip / Qtotal", "domain": "THERMAL", "type": "FORMULA", "capabilities": ["PHYSICS", "MATERIALS"]},
        {"id": "F-INTERFACE-TEMP", "name": "Interface Temperature", "formula": "θ = θ0 + ΔT(Vc, f, ap)", "domain": "THERMAL", "type": "FORMULA", "capabilities": ["PHYSICS", "MATERIALS"]},
        {"id": "F-THERMAL-EXPANSION", "name": "Thermal Expansion", "formula": "ΔL = α × L × ΔT", "domain": "THERMAL", "type": "FORMULA", "capabilities": ["PHYSICS", "MACHINES"]},
        
        # Vibration (3)
        {"id": "F-STABILITY-LOBE", "name": "Stability Lobe", "formula": "blim = -1 / (2Kf × Re[G])", "domain": "VIBRATION", "type": "FORMULA", "capabilities": ["PHYSICS", "MACHINES"]},
        {"id": "F-CHATTER-FREQ", "name": "Chatter Frequency", "formula": "fc = fn × (1 + μ/4)", "domain": "VIBRATION", "type": "FORMULA", "capabilities": ["PHYSICS", "TOOLS"]},
        {"id": "F-DAMPING", "name": "Damping Ratio", "formula": "ζ = c / (2√(km))", "domain": "VIBRATION", "type": "FORMULA", "capabilities": ["PHYSICS"]},
        
        # Surface Quality (2)
        {"id": "F-RA-THEORETICAL", "name": "Theoretical Ra", "formula": "Ra = f² / (32 × rε)", "domain": "SURFACE", "type": "FORMULA", "capabilities": ["PHYSICS", "QUALITY"]},
        {"id": "F-RZ", "name": "Rz Calculation", "formula": "Rz ≈ 4 × Ra", "domain": "SURFACE", "type": "FORMULA", "capabilities": ["PHYSICS", "QUALITY"]},
        
        # AI/ML (3)
        {"id": "F-BAYESIAN-UPDATE", "name": "Bayesian Update", "formula": "P(H|E) = P(E|H) × P(H) / P(E)", "domain": "AI_ML", "type": "FORMULA", "capabilities": ["AI_ML"]},
        {"id": "F-GRADIENT-DESCENT", "name": "Gradient Descent", "formula": "θ = θ - α × ∇J(θ)", "domain": "AI_ML", "type": "FORMULA", "capabilities": ["AI_ML"]},
        {"id": "F-REWARD", "name": "RL Reward", "formula": "G = Σ γ^t × r_t", "domain": "AI_ML", "type": "FORMULA", "capabilities": ["AI_ML"]},
        
        # Business (2)
        {"id": "F-CYCLE-TIME", "name": "Cycle Time", "formula": "Tc = Tm + Tnc + Ttc", "domain": "BUSINESS", "type": "FORMULA", "capabilities": ["BUSINESS", "CAM"]},
        {"id": "F-COST-PIECE", "name": "Cost Per Piece", "formula": "Cp = Cm + Ct + Co + Cs", "domain": "BUSINESS", "type": "FORMULA", "capabilities": ["BUSINESS"]},
    ]
    
    print(f"  Defined {len(formulas)} formulas")
    return formulas

def define_hooks():
    """Define hooks for the system"""
    hooks = []
    
    # Cognitive hooks (15)
    cognitive_hooks = [
        ("BAYES-001", ["AI_ML"]), ("BAYES-002", ["AI_ML", "QUALITY"]), ("BAYES-003", ["AI_ML"]),
        ("OPT-001", ["AI_ML"]), ("OPT-002", ["AI_ML"]), ("OPT-003", ["AI_ML"]),
        ("MULTI-001", ["AI_ML"]), ("MULTI-002", ["AI_ML"]), ("MULTI-003", ["AI_ML"]),
        ("GRAD-001", ["AI_ML"]), ("GRAD-002", ["AI_ML"]), ("GRAD-003", ["AI_ML"]),
        ("RL-001", ["AI_ML"]), ("RL-002", ["AI_ML"]), ("RL-003", ["AI_ML"])
    ]
    for hook, caps in cognitive_hooks:
        hooks.append({
            "id": f"HOOK-{hook}",
            "name": hook,
            "type": "HOOK",
            "trigger": "AUTO",
            "level": "L0",
            "capabilities": caps
        })
    
    # System hooks (8)
    system_hooks = [
        ("SYS-LAW1", "LIFE_SAFETY", "Safety check", ["QUALITY"]),
        ("SYS-LAW2", "MICROSESSION", "Session boundary", ["SESSION"]),
        ("SYS-LAW3", "COMPLETENESS", "Coverage check", ["QUALITY"]),
        ("SYS-LAW4", "ANTI_REGRESSION", "Regression check", ["QUALITY"]),
        ("SYS-LAW5", "PREDICTIVE", "Failure prediction", ["AI_ML"]),
        ("SYS-LAW6", "CONTINUITY", "State continuity", ["SESSION"]),
        ("SYS-LAW7", "VERIFICATION", "Evidence verification", ["QUALITY"]),
        ("SYS-LAW8", "MATH_EVOLUTION", "Formula improvement", ["AI_ML", "KNOWLEDGE"]),
    ]
    for hook_id, hook_type, desc, caps in system_hooks:
        hooks.append({
            "id": f"HOOK-{hook_id}",
            "name": hook_id,
            "type": "HOOK",
            "trigger": "MANDATORY",
            "description": desc,
            "capabilities": caps
        })
    
    # Domain hooks (50+)
    domain_categories = [
        ("MATERIAL", 10, ["MATERIALS"]), ("MACHINE", 8, ["MACHINES"]), ("TOOL", 8, ["TOOLS"]),
        ("PHYSICS", 10, ["PHYSICS"]), ("CAD", 8, ["CAD"]), ("CAM", 10, ["CAM"]),
        ("POST", 6, ["POST"]), ("QUALITY", 10, ["QUALITY"]), ("SESSION", 8, ["SESSION"])
    ]
    
    counter = 1
    for category, count, caps in domain_categories:
        for i in range(1, count + 1):
            hooks.append({
                "id": f"HOOK-{category}-{i:03d}",
                "name": f"{category}_{i:03d}",
                "type": "HOOK",
                "trigger": "CONDITIONAL",
                "capabilities": caps
            })
            counter += 1
    
    print(f"  Defined {len(hooks)} hooks")
    return hooks

def define_coefficients():
    """Define the 32 coefficients"""
    coefficients = [
        # Quality weights
        {"id": "COEF-W-R", "name": "Reasoning Weight", "value": 0.25, "domain": "QUALITY", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-W-C", "name": "Code Weight", "value": 0.20, "domain": "QUALITY", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-W-P", "name": "Process Weight", "value": 0.15, "domain": "QUALITY", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-W-S", "name": "Safety Weight", "value": 0.30, "domain": "QUALITY", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-W-L", "name": "Learning Weight", "value": 0.10, "domain": "QUALITY", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        
        # Thresholds
        {"id": "COEF-TH-SAFETY", "name": "Safety Threshold", "value": 0.70, "domain": "THRESHOLD", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-TH-QUALITY", "name": "Quality Threshold", "value": 0.70, "domain": "THRESHOLD", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-TH-COVERAGE", "name": "Coverage Threshold", "value": 0.95, "domain": "THRESHOLD", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        
        # Physics constants
        {"id": "COEF-KC11-STEEL", "name": "kc1.1 Steel Default", "value": 1800, "domain": "PHYSICS", "type": "COEFFICIENT", "capabilities": ["PHYSICS", "MATERIALS"]},
        {"id": "COEF-MC-STEEL", "name": "mc Steel Default", "value": 0.25, "domain": "PHYSICS", "type": "COEFFICIENT", "capabilities": ["PHYSICS", "MATERIALS"]},
        {"id": "COEF-N-TAYLOR", "name": "Taylor n Default", "value": 0.25, "domain": "PHYSICS", "type": "COEFFICIENT", "capabilities": ["PHYSICS", "TOOLS"]},
        
        # Session parameters
        {"id": "COEF-MICRO-MIN", "name": "Microsession Min", "value": 15, "domain": "SESSION", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-MICRO-MAX", "name": "Microsession Max", "value": 25, "domain": "SESSION", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-BUFFER-YELLOW", "name": "Buffer Yellow", "value": 9, "domain": "SESSION", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-BUFFER-RED", "name": "Buffer Red", "value": 15, "domain": "SESSION", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-BUFFER-BLACK", "name": "Buffer Black", "value": 19, "domain": "SESSION", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        
        # AI/ML parameters
        {"id": "COEF-LEARN-RATE", "name": "Learning Rate", "value": 0.001, "domain": "AI_ML", "type": "COEFFICIENT", "capabilities": ["AI_ML"]},
        {"id": "COEF-DISCOUNT", "name": "RL Discount", "value": 0.99, "domain": "AI_ML", "type": "COEFFICIENT", "capabilities": ["AI_ML"]},
        {"id": "COEF-EPSILON", "name": "Exploration Rate", "value": 0.1, "domain": "AI_ML", "type": "COEFFICIENT", "capabilities": ["AI_ML"]},
        {"id": "COEF-BATCH", "name": "Batch Size", "value": 32, "domain": "AI_ML", "type": "COEFFICIENT", "capabilities": ["AI_ML"]},
        
        # More coefficients...
        {"id": "COEF-SYNERGY-BOOST", "name": "Synergy Boost", "value": 1.2, "domain": "OPTIMIZATION", "type": "COEFFICIENT", "capabilities": ["AI_ML"]},
        {"id": "COEF-COVERAGE-WEIGHT", "name": "Coverage Weight", "value": 1.0, "domain": "OPTIMIZATION", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-COST-PENALTY", "name": "Cost Penalty", "value": 0.1, "domain": "OPTIMIZATION", "type": "COEFFICIENT", "capabilities": ["BUSINESS"]},
        {"id": "COEF-MAX-SKILLS", "name": "Max Skills", "value": 8, "domain": "CONSTRAINT", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-MAX-AGENTS", "name": "Max Agents", "value": 20, "domain": "CONSTRAINT", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-MIN-CAPABILITY", "name": "Min Capability Match", "value": 0.6, "domain": "CONSTRAINT", "type": "COEFFICIENT", "capabilities": ["AI_ML"]},
        {"id": "COEF-EVIDENCE-L3", "name": "Evidence Level 3", "value": 3, "domain": "QUALITY", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-EVIDENCE-L5", "name": "Evidence Level 5", "value": 5, "domain": "QUALITY", "type": "COEFFICIENT", "capabilities": ["QUALITY"]},
        {"id": "COEF-RALPH-ITERATIONS", "name": "Ralph Iterations", "value": 3, "domain": "PROCESS", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-API-PARALLEL", "name": "API Parallel Limit", "value": 20, "domain": "PROCESS", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-CONTEXT-LIMIT", "name": "Context Limit", "value": 200000, "domain": "CONSTRAINT", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
        {"id": "COEF-CHECKPOINT-INTERVAL", "name": "Checkpoint Interval", "value": 5, "domain": "SESSION", "type": "COEFFICIENT", "capabilities": ["SESSION"]},
    ]
    
    print(f"  Defined {len(coefficients)} coefficients")
    return coefficients

def define_swarm_patterns():
    """Define the 8 swarm patterns"""
    patterns = [
        {"id": "SWARM-PARALLEL", "name": "Parallel Extraction", "description": "Multiple agents extract in parallel", "agents": 10, "type": "SWARM", "capabilities": ["SESSION", "INTEGRATION"]},
        {"id": "SWARM-PIPELINE", "name": "Pipeline Processing", "description": "Sequential processing chain", "agents": 5, "type": "SWARM", "capabilities": ["SESSION", "INTEGRATION"]},
        {"id": "SWARM-CONSENSUS", "name": "Consensus Voting", "description": "Multiple agents vote on best result", "agents": 7, "type": "SWARM", "capabilities": ["AI_ML", "QUALITY"]},
        {"id": "SWARM-SPECIALIST", "name": "Specialist Assignment", "description": "Assign tasks to domain experts", "agents": 8, "type": "SWARM", "capabilities": ["KNOWLEDGE", "INTEGRATION"]},
        {"id": "SWARM-HIERARCHICAL", "name": "Hierarchical Coordination", "description": "Master-worker hierarchy", "agents": 12, "type": "SWARM", "capabilities": ["SESSION", "INTEGRATION"]},
        {"id": "SWARM-COMPETITIVE", "name": "Competitive Evolution", "description": "Competing solutions evolved", "agents": 10, "type": "SWARM", "capabilities": ["AI_ML"]},
        {"id": "SWARM-COLLABORATIVE", "name": "Collaborative Assembly", "description": "Agents collaborate on parts", "agents": 6, "type": "SWARM", "capabilities": ["INTEGRATION"]},
        {"id": "SWARM-ADAPTIVE", "name": "Adaptive Scaling", "description": "Scale agents based on load", "agents": "DYNAMIC", "type": "SWARM", "capabilities": ["AI_ML", "SESSION"]},
    ]
    
    print(f"  Defined {len(patterns)} swarm patterns")
    return patterns

def build_capability_matrix(resources):
    """Build capability matrix mapping resources to capabilities"""
    print("Building capability matrix...")
    
    matrix = defaultdict(list)
    
    for resource in resources:
        caps = resource.get("capabilities", [])
        res_type = resource.get("type", "UNKNOWN")
        for cap in caps:
            matrix[cap].append({
                "id": resource["id"],
                "name": resource.get("name", resource["id"]),
                "type": res_type
            })
    
    return dict(matrix)

def build_synergy_matrix(resources):
    """Build synergy matrix for resource combinations"""
    print("Building synergy matrix...")
    
    # Define high-synergy combinations
    synergies = {
        "MATERIALS+PHYSICS": 1.3,
        "PHYSICS+TOOLS": 1.25,
        "CAD+CAM": 1.35,
        "CAM+POST": 1.3,
        "AI_ML+OPTIMIZATION": 1.4,
        "QUALITY+SAFETY": 1.5,
        "SESSION+INTEGRATION": 1.2,
        "MACHINES+TOOLS": 1.25,
        "PHYSICS+THERMAL": 1.3,
        "PHYSICS+VIBRATION": 1.3,
        "MATERIALS+THERMAL": 1.25,
        "AI_ML+PHYSICS": 1.2,
        "KNOWLEDGE+AI_ML": 1.3,
    }
    
    return synergies

def main():
    os.makedirs(OUTPUT_PATH, exist_ok=True)
    
    print("=" * 70)
    print("PRISM REGISTRY BUILDER - Session R2.2.1")
    print("=" * 70)
    
    # Scan and collect all resources
    skills = scan_skills()
    scripts = scan_scripts()
    engines = scan_extracted_engines()
    agents = define_agents()
    formulas = define_formulas()
    hooks = define_hooks()
    coefficients = define_coefficients()
    swarm_patterns = define_swarm_patterns()
    
    # Combine all resources
    all_resources = skills + scripts + engines + agents + formulas + hooks + coefficients + swarm_patterns
    
    # Build RESOURCE_REGISTRY
    resource_registry = {
        "version": "1.0.0",
        "timestamp": "2026-01-31T19:40:00Z",
        "summary": {
            "skills": len(skills),
            "scripts": len(scripts),
            "engines": len(engines),
            "agents": len(agents),
            "formulas": len(formulas),
            "hooks": len(hooks),
            "coefficients": len(coefficients),
            "swarm_patterns": len(swarm_patterns),
            "total": len(all_resources)
        },
        "resources": {
            "skills": skills,
            "scripts": scripts,
            "engines": engines,
            "agents": agents,
            "formulas": formulas,
            "hooks": hooks,
            "coefficients": coefficients,
            "swarm_patterns": swarm_patterns
        }
    }
    
    # Build CAPABILITY_MATRIX
    capability_matrix = {
        "version": "1.0.0",
        "timestamp": "2026-01-31T19:40:00Z",
        "matrix": build_capability_matrix(all_resources)
    }
    
    # Build SYNERGY_MATRIX
    synergy_matrix = {
        "version": "1.0.0",
        "timestamp": "2026-01-31T19:40:00Z",
        "synergies": build_synergy_matrix(all_resources),
        "default_synergy": 1.0,
        "description": "Multiplier for capability combinations"
    }
    
    # Save registries
    registry_path = os.path.join(OUTPUT_PATH, "RESOURCE_REGISTRY.json")
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(resource_registry, f, indent=2)
    
    capability_path = os.path.join(OUTPUT_PATH, "CAPABILITY_MATRIX.json")
    with open(capability_path, 'w', encoding='utf-8') as f:
        json.dump(capability_matrix, f, indent=2)
    
    synergy_path = os.path.join(OUTPUT_PATH, "SYNERGY_MATRIX.json")
    with open(synergy_path, 'w', encoding='utf-8') as f:
        json.dump(synergy_matrix, f, indent=2)
    
    # Print summary
    print("\n" + "=" * 70)
    print("REGISTRY BUILD COMPLETE")
    print("=" * 70)
    print(f"\nRESOURCE_REGISTRY: {registry_path}")
    print(f"  Skills:         {len(skills)}")
    print(f"  Scripts:        {len(scripts)}")
    print(f"  Engines:        {len(engines)}")
    print(f"  Agents:         {len(agents)}")
    print(f"  Formulas:       {len(formulas)}")
    print(f"  Hooks:          {len(hooks)}")
    print(f"  Coefficients:   {len(coefficients)}")
    print(f"  Swarm Patterns: {len(swarm_patterns)}")
    print(f"  TOTAL:          {len(all_resources)}")
    
    print(f"\nCAPABILITY_MATRIX: {capability_path}")
    print(f"  Domains: {len(capability_matrix['matrix'])}")
    
    print(f"\nSYNERGY_MATRIX: {synergy_path}")
    print(f"  High-synergy pairs: {len(synergy_matrix['synergies'])}")
    
    return resource_registry, capability_matrix, synergy_matrix

if __name__ == "__main__":
    main()
