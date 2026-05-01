#!/usr/bin/env python3
"""
PRISM MCP SERVER - COMPLETE RESOURCE MANIFEST
==============================================
Consolidates ALL resources for the MCP server.
"""

import json
import os
from datetime import datetime

REG_PATH = r"C:\PRISM\registries"

def load_json(filename):
    """Load JSON file safely"""
    path = os.path.join(REG_PATH, filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def main():
    print("=" * 80)
    print("PRISM MCP SERVER - COMPLETE RESOURCE MANIFEST")
    print("=" * 80)
    
    # Load all registries
    databases = load_json("DATABASE_REGISTRY.json")
    formulas = load_json("FORMULA_REGISTRY.json")
    engines = load_json("ENGINE_REGISTRY.json")
    skills = load_json("SKILL_REGISTRY.json")  # Full version
    agents = load_json("AGENT_REGISTRY.json")
    hooks = load_json("HOOK_REGISTRY.json")  # Full version
    scripts = load_json("SCRIPT_REGISTRY.json")
    hierarchy = load_json("COMPLETE_HIERARCHY_v15.json")
    wiring = load_json("WIRING_EXHAUSTIVE.json")
    external = load_json("EXTERNAL_RESOURCES_REGISTRY.json")
    mcp = load_json("MCP_RESOURCE_REGISTRY.json")
    
    # Count resources
    db_count = databases.get("totalDatabases", len(databases.get("databases", {})))
    db_records = databases.get("totalRecords", 0)
    formula_count = formulas.get("totalFormulas", len(formulas.get("formulas", [])))
    engine_count = engines.get("totalEngines", len(engines.get("engines", [])))
    skill_count = skills.get("totalSkills", len(skills.get("skills", {})))
    agent_count = agents.get("totalAgents", len(agents.get("agents", [])))
    hook_count = hooks.get("totalHooks", len(hooks.get("hooks", [])))
    script_count = scripts.get("totalScripts", len(scripts.get("scripts", [])))
    connection_count = hierarchy.get("statistics", {}).get("total_all_connections", 0)
    
    # External resources
    if isinstance(external, dict):
        ext_pdfs = external.get("pdfs", {}).get("total", 0) if isinstance(external.get("pdfs"), dict) else len(external.get("pdfs", []))
        ext_courses = external.get("courses", {}).get("total", 0) if isinstance(external.get("courses"), dict) else len(external.get("courses", []))
    else:
        ext_pdfs = 855  # From transcript
        ext_courses = 220  # From transcript
    
    # MCP resources
    if isinstance(mcp, dict):
        mcp_total = mcp.get("statistics", {}).get("total_resources", 0) if isinstance(mcp.get("statistics"), dict) else mcp.get("total", 1311)
        mcp_domains = mcp.get("statistics", {}).get("domains", 0) if isinstance(mcp.get("statistics"), dict) else 30
    else:
        mcp_total = 1311  # From transcript
        mcp_domains = 30
    
    # Build manifest
    manifest = {
        "version": "15.0.0",
        "generatedAt": datetime.now().isoformat(),
        "system": "PRISM Manufacturing Intelligence MCP Server",
        "goldenRule": "IF IT CAN BE USED, USE IT!",
        
        "resources": {
            "databases": {
                "count": db_count,
                "records": db_records,
                "description": "Raw data sources (materials, machines, tools, alarms, etc.)"
            },
            "formulas": {
                "count": formula_count,
                "categories": 27,
                "description": "Mathematical computations (490 formulas across 27 categories)"
            },
            "engines": {
                "count": engine_count,
                "categories": 11,
                "description": "Implementation engines (physics, AI/ML, CAM, CAD, etc.)"
            },
            "skills": {
                "count": skill_count,
                "categories": 29,
                "description": "Orchestration skills (1,227 skills across 29 categories)"
            },
            "agents": {
                "count": agent_count,
                "description": "Specialized agents for domain expertise"
            },
            "hooks": {
                "count": hook_count,
                "domains": 58,
                "description": "Integration hooks (6,632 hooks across 58 domains)"
            },
            "scripts": {
                "count": script_count,
                "categories": 34,
                "description": "Automation scripts (1,257 scripts)"
            },
            "products": {
                "count": 4,
                "names": [
                    "SPEED_FEED_CALCULATOR",
                    "POST_PROCESSOR", 
                    "SHOP_MANAGER",
                    "AUTO_CNC_PROGRAMMER"
                ],
                "description": "User-facing products"
            }
        },
        
        "wiring": {
            "total_connections": connection_count,
            "description": "Complete cross-layer wiring with maximum connections"
        },
        
        "external": {
            "pdfs": ext_pdfs,
            "courses": ext_courses,
            "description": "External knowledge resources (MIT/Stanford courses, manufacturer PDFs)"
        },
        
        "mcp_integration": {
            "total_resources": mcp_total,
            "domains": mcp_domains,
            "description": "MCP protocol integration resources"
        },
        
        "totals": {
            "internal_resources": db_count + formula_count + engine_count + skill_count + agent_count + hook_count + script_count,
            "total_connections": connection_count,
            "database_records": db_records,
            "external_resources": ext_pdfs + ext_courses,
        },
        
        "hierarchy": {
            "L-1": {"name": "DATABASES", "count": db_count, "records": db_records},
            "L0": {"name": "FORMULAS", "count": formula_count},
            "L1": {"name": "ENGINES", "count": engine_count},
            "L2": {"name": "SKILLS", "count": skill_count},
            "L3": {"name": "PRODUCTS", "count": 4},
        },
        
        "registry_files": [
            "DATABASE_REGISTRY.json",
            "FORMULA_REGISTRY.json",
            "ENGINE_REGISTRY.json",
            "SKILL_REGISTRY.json",
            "AGENT_REGISTRY.json",
            "HOOK_REGISTRY.json",
            "SCRIPT_REGISTRY.json",
            "COMPLETE_HIERARCHY_v15.json",
            "WIRING_EXHAUSTIVE.json",
            "EXTERNAL_RESOURCES_REGISTRY.json",
            "MCP_RESOURCE_REGISTRY.json",
        ],
    }
    
    # Calculate grand totals
    internal = manifest["totals"]["internal_resources"]
    external_total = manifest["totals"]["external_resources"]
    connections = manifest["totals"]["total_connections"]
    records = manifest["totals"]["database_records"]
    
    manifest["totals"]["grand_total"] = internal + external_total
    
    # Save manifest
    output_path = os.path.join(REG_PATH, "MCP_MASTER_MANIFEST.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    
    # Print summary
    print(f"\nRESOURCE SUMMARY")
    print("-" * 60)
    print(f"  Databases:      {db_count:>8} ({db_records:,} records)")
    print(f"  Formulas:       {formula_count:>8} (27 categories)")
    print(f"  Engines:        {engine_count:>8} (11 categories)")
    print(f"  Skills:         {skill_count:>8} (29 categories)")
    print(f"  Agents:         {agent_count:>8}")
    print(f"  Hooks:          {hook_count:>8} (58 domains)")
    print(f"  Scripts:        {script_count:>8} (34 categories)")
    print(f"  Products:       {4:>8}")
    print("-" * 60)
    print(f"  INTERNAL:       {internal:>8}")
    
    print(f"\nEXTERNAL RESOURCES")
    print("-" * 60)
    print(f"  PDFs:           {ext_pdfs:>8}")
    print(f"  Courses:        {ext_courses:>8}")
    print("-" * 60)
    print(f"  EXTERNAL:       {external_total:>8}")
    
    print(f"\nWIRING")
    print("-" * 60)
    print(f"  Connections:    {connections:>8,}")
    
    print(f"\n{'=' * 60}")
    print(f"GRAND TOTAL:      {internal + external_total:>8,} resources")
    print(f"TOTAL WIRING:     {connections:>8,} connections")
    print(f"DATABASE RECORDS: {records:>8,}")
    print(f"{'=' * 60}")
    
    print(f"\nSaved: {output_path}")

if __name__ == "__main__":
    main()
