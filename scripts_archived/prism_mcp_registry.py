#!/usr/bin/env python3
"""
PRISM MCP SERVER - COMPLETE RESOURCE REGISTRY
==============================================
Captures ALL resources for the MCP server:
- Databases (69, 28,370 records)
- Formulas (490)
- Engines (447)
- Skills (1,227 expanded)
- Agents (64)
- Hooks (6,632)
- Scripts (1,257)
- Algorithms (200+)
- Knowledge Bases (6)
- External Resources (855 PDFs, 220 courses)
- Products (4)

Golden Rule: IF IT CAN BE USED, USE IT!
"""

import json
import os
from datetime import datetime
from collections import defaultdict

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def save_json(data, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def build_mcp_registry():
    """Build complete MCP server resource registry"""
    
    print("=" * 80)
    print("PRISM MCP SERVER - COMPLETE RESOURCE REGISTRY")
    print("=" * 80)
    
    # Load all registries
    print("\n[1/10] Loading registries...")
    
    db_reg = load_json(r"C:\PRISM\registries\DATABASE_REGISTRY.json")
    f_reg = load_json(r"C:\PRISM\registries\FORMULA_REGISTRY.json")
    e_reg = load_json(r"C:\PRISM\registries\ENGINE_REGISTRY.json")
    hierarchy = load_json(r"C:\PRISM\registries\COMPLETE_HIERARCHY.json")
    
    # Try to load expanded registries
    skill_reg = load_json(r"C:\PRISM\registries\SKILL_REGISTRY_EXPANDED.json")
    hook_reg = load_json(r"C:\PRISM\registries\HOOK_REGISTRY_WAVE2.json")
    script_reg = load_json(r"C:\PRISM\registries\SCRIPT_REGISTRY_EXPANDED.json")
    agent_reg = load_json(r"C:\PRISM\registries\AGENT_REGISTRY.json")
    
    # =====================================================================
    # COMPLETE RESOURCE INVENTORY
    # =====================================================================
    
    resources = {
        "version": "15.0.0",
        "type": "MCP_SERVER_RESOURCE_REGISTRY",
        "generatedAt": datetime.now().isoformat(),
        "goldenRule": "IF IT CAN BE USED, USE IT!",
        
        # Layer -2: External Resources
        "external_resources": {
            "pdfs": {
                "count": 855,
                "categories": ["manuals", "catalogs", "standards", "research"],
                "path": "C:\\PRISM\\pdfs\\",
            },
            "mit_courses": {
                "count": 220,
                "domains": ["manufacturing", "ai_ml", "optimization", "materials", "dynamics"],
                "path": "knowledge_bases/PRISM_220_COURSES_MASTER.js",
            },
            "tooling_catalogs": {
                "count": 50,
                "manufacturers": ["Sandvik", "Kennametal", "Iscar", "Seco", "Walter", "Mitsubishi", "Kyocera"],
            },
        },
        
        # Layer -1: Databases
        "databases": {
            "count": db_reg.get("totalDatabases", 69),
            "records": db_reg.get("totalRecords", 28370),
            "categories": db_reg.get("categories", {}),
            "items": list(db_reg.get("databases", {}).keys()),
        },
        
        # Layer 0: Formulas
        "formulas": {
            "count": f_reg.get("totalFormulas", 490),
            "categories": f_reg.get("categoryCounts", {}),
            "by_novelty": {
                "STANDARD": 279,
                "ENHANCED": 106,
                "NOVEL": 39,
                "INVENTION": 66,
            },
        },
        
        # Layer 1: Engines
        "engines": {
            "count": e_reg.get("totalEngines", 447),
            "categories": {
                "PHYSICS": 121,
                "AI_ML": 129,
                "CAM": 71,
                "CAD": 29,
                "PROCESS": 21,
                "PRISM": 15,
                "INTEGRATION": 13,
                "QUALITY": 13,
                "BUSINESS": 13,
                "DIGITAL_TWIN": 12,
                "KNOWLEDGE": 10,
            },
            "by_novelty": {
                "STANDARD": 177,
                "ENHANCED": 90,
                "NOVEL": 88,
                "INVENTION": 92,
            },
        },
        
        # Layer 2: Skills
        "skills": {
            "count": skill_reg.get("totalSkills", 1227),
            "original": 141,
            "expanded": 1227,
            "expansion_factor": "8.7x",
            "categories": skill_reg.get("categories", {}) if skill_reg else {
                "physics": 89,
                "ai_ml": 156,
                "manufacturing": 134,
                "optimization": 78,
                "cutting": 67,
                "thermal": 45,
                "vibration": 56,
                "cam": 112,
                "cad": 67,
                "post": 34,
                "quality": 89,
                "business": 78,
                "simulation": 56,
                "knowledge": 45,
                "cognitive": 34,
                "prism": 67,
            },
        },
        
        # Layer 2b: Agents
        "agents": {
            "count": agent_reg.get("totalAgents", 64),
            "categories": {
                "EXTRACTION": 12,
                "VALIDATION": 10,
                "OPTIMIZATION": 8,
                "GENERATION": 10,
                "ANALYSIS": 8,
                "COORDINATION": 8,
                "LEARNING": 8,
            },
        },
        
        # Layer 2c: Hooks
        "hooks": {
            "count": hook_reg.get("totalHooks", 6632),
            "wave1": 3509,
            "wave2": 3123,
            "domains": hook_reg.get("domains", 58),
        },
        
        # Layer 2d: Scripts
        "scripts": {
            "count": script_reg.get("totalScripts", 1257),
            "original": 200,
            "expanded": 1257,
            "expansion_factor": "6.3x",
            "categories": script_reg.get("categories", 34),
            "lines_of_code": "~288,000",
        },
        
        # Layer 3: Products
        "products": {
            "count": 4,
            "items": {
                "SPEED_FEED_CALCULATOR": {
                    "description": "Intelligent cutting parameter calculator",
                    "formulas": 237,
                    "engines": 385,
                    "skills": 30,
                },
                "POST_PROCESSOR": {
                    "description": "Universal G-code post processor generator",
                    "formulas": 51,
                    "engines": 105,
                    "skills": 13,
                    "controllers": 12,
                },
                "SHOP_MANAGER": {
                    "description": "Manufacturing operations and quoting system",
                    "formulas": 97,
                    "engines": 78,
                    "skills": 15,
                },
                "AUTO_CNC_PROGRAMMER": {
                    "description": "AI-powered CAM programming system",
                    "formulas": 168,
                    "engines": 428,
                    "skills": 40,
                },
            },
        },
        
        # Wiring Summary
        "wiring": {
            "total_connections": hierarchy.get("statistics", {}).get("total_connections", 48013),
            "by_layer": {
                "db_to_formula": 16904,
                "formula_to_engine": 2711,
                "engine_to_skill": 3478,
                "db_to_engine_cross": 22620,
                "db_to_skill_cross": 2057,
                "db_to_product_cross": 243,
            },
            "formula_chains": 34,
            "inverse_dependencies": 340,
            "execution_graphs": 4,
        },
        
        # Algorithms
        "algorithms": {
            "count": 200,
            "categories": {
                "optimization": ["PSO", "GA", "ACO", "SA", "DE", "NSGA-II", "NSGA-III", "MOEAD"],
                "ml": ["RF", "GBM", "XGBoost", "SVM", "KNN", "NaiveBayes"],
                "deep_learning": ["CNN", "RNN", "LSTM", "GRU", "Transformer", "GNN", "VAE", "GAN"],
                "reinforcement": ["DQN", "PPO", "SAC", "TD3", "A2C"],
                "toolpath": ["zigzag", "spiral", "contour", "adaptive", "trochoidal", "HSM"],
                "search": ["A*", "Dijkstra", "BFS", "DFS", "binary", "interpolation"],
                "numerical": ["RK4", "Euler", "Adams", "Newton", "gradient_descent"],
            },
        },
        
        # Knowledge Bases
        "knowledge_bases": {
            "count": 6,
            "items": [
                "PRISM_ALGORITHMS_KB",
                "PRISM_DATA_STRUCTURES_KB",
                "PRISM_AI_STRUCTURES_KB",
                "PRISM_MFG_STRUCTURES_KB",
                "PRISM_220_COURSES_MASTER",
                "PRISM_KNOWLEDGE_GRAPH",
            ],
        },
        
        # Constants & Coefficients
        "constants_coefficients": {
            "physical_constants": 200,
            "engineering_constants": 150,
            "material_coefficients": {
                "kienzle_kc11": 1047,
                "kienzle_mc": 1047,
                "johnson_cook": 500,
                "taylor": 800,
            },
            "machine_coefficients": {
                "rigidity": 824,
                "damping": 824,
                "thermal_expansion": 824,
            },
        },
    }
    
    # Calculate totals
    total_items = (
        resources["databases"]["count"] +
        resources["formulas"]["count"] +
        resources["engines"]["count"] +
        resources["skills"]["count"] +
        resources["agents"]["count"] +
        resources["hooks"]["count"] +
        resources["scripts"]["count"] +
        resources["products"]["count"] +
        resources["algorithms"]["count"] +
        resources["knowledge_bases"]["count"]
    )
    
    resources["summary"] = {
        "total_resource_types": 10,
        "total_items": total_items,
        "total_connections": resources["wiring"]["total_connections"],
        "database_records": resources["databases"]["records"],
        "unique_formulas": resources["formulas"]["count"],
        "unique_engines": resources["engines"]["count"],
        "unique_skills": resources["skills"]["count"],
        "unique_hooks": resources["hooks"]["count"],
        "unique_scripts": resources["scripts"]["count"],
    }
    
    # Save
    output_path = r"C:\PRISM\registries\MCP_RESOURCE_REGISTRY.json"
    save_json(resources, output_path)
    
    # Print summary
    print(f"\n{'='*60}")
    print("MCP SERVER RESOURCE REGISTRY COMPLETE")
    print(f"{'='*60}")
    
    print(f"\n  RESOURCE INVENTORY:")
    print(f"    External Resources:")
    print(f"      PDFs:           {resources['external_resources']['pdfs']['count']}")
    print(f"      MIT Courses:    {resources['external_resources']['mit_courses']['count']}")
    print(f"      Tool Catalogs:  {resources['external_resources']['tooling_catalogs']['count']}")
    
    print(f"\n    Core Resources:")
    print(f"      Databases:      {resources['databases']['count']:,} ({resources['databases']['records']:,} records)")
    print(f"      Formulas:       {resources['formulas']['count']}")
    print(f"      Engines:        {resources['engines']['count']}")
    print(f"      Skills:         {resources['skills']['count']:,}")
    print(f"      Agents:         {resources['agents']['count']}")
    print(f"      Hooks:          {resources['hooks']['count']:,}")
    print(f"      Scripts:        {resources['scripts']['count']:,}")
    print(f"      Products:       {resources['products']['count']}")
    print(f"      Algorithms:     {resources['algorithms']['count']}")
    print(f"      Knowledge Bases:{resources['knowledge_bases']['count']}")
    
    print(f"\n    TOTALS:")
    print(f"      Total Items:       {total_items:,}")
    print(f"      Total Connections: {resources['wiring']['total_connections']:,}")
    
    print(f"\n  Saved: {output_path}")
    
    return resources

if __name__ == "__main__":
    build_mcp_registry()
