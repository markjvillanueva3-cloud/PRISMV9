#!/usr/bin/env python3
"""
COMPREHENSIVE AUDIT: Claude Development Capability Skills
Focus: Context, Tokens, Efficiency, Optimization, Prediction, Planning
"""
import json
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict

PRISM_ROOT = Path("C:/PRISM")
SKILLS_DIRS = [PRISM_ROOT / "skills-consolidated", Path("/mnt/skills/user")]
MCP_SERVER = PRISM_ROOT / "scripts" / "prism_mcp_server.py"
REGISTRIES = PRISM_ROOT / "registries"

# What Claude NEEDS for enhanced capabilities
CAPABILITY_REQUIREMENTS = {
    "CONTEXT_MANAGEMENT": {
        "description": "Context window size tracking, pressure detection, compression triggers",
        "keywords": ["context", "window", "compress", "expand", "pressure", "size", "token"],
        "required_functions": ["size_check", "compress", "expand", "pressure_detect"],
    },
    "TOKEN_EFFICIENCY": {
        "description": "Token counting, budget allocation, waste detection, density optimization",
        "keywords": ["token", "budget", "efficient", "density", "cache", "kv-cache"],
        "required_functions": ["count_tokens", "allocate_budget", "detect_waste"],
    },
    "BATCH_PARALLEL": {
        "description": "Parallel execution, batch processing, queue management",
        "keywords": ["batch", "parallel", "queue", "concurrent", "thread", "async"],
        "required_functions": ["batch_execute", "parallel_run", "queue_manage"],
    },
    "PREDICTION_PLANNING": {
        "description": "Outcome prediction, branch analysis, risk assessment, planning ahead",
        "keywords": ["predict", "plan", "branch", "outcome", "risk", "ahead", "forecast"],
        "required_functions": ["predict_outcome", "analyze_branches", "assess_risk"],
    },
    "OPTIMIZATION": {
        "description": "Mathematical optimization, resource allocation, efficiency maximization",
        "keywords": ["optim", "maximize", "minimize", "allocat", "efficient", "math"],
        "required_functions": ["optimize", "allocate", "maximize_efficiency"],
    },
    "LEARNING_PATTERNS": {
        "description": "Error learning, pattern extraction, improvement loops",
        "keywords": ["learn", "pattern", "error", "improve", "feedback", "loop"],
        "required_functions": ["learn_from_error", "extract_pattern", "improve"],
    },
    "VALIDATION_SCRUTINY": {
        "description": "Output validation, quality gates, anti-regression checks",
        "keywords": ["valid", "gate", "quality", "check", "verify", "scrutin", "regress"],
        "required_functions": ["validate", "check_quality", "verify_output"],
    },
    "STATE_CONTINUITY": {
        "description": "Session persistence, checkpoint/restore, handoff protocols",
        "keywords": ["state", "session", "checkpoint", "restore", "handoff", "persist"],
        "required_functions": ["save_state", "restore_state", "checkpoint", "handoff"],
    },
}

def audit_mcp_server():
    """Audit MCP server tools and their capabilities."""
    if not MCP_SERVER.exists():
        return {"error": "MCP server not found"}
    
    content = MCP_SERVER.read_text(encoding='utf-8')
    
    # Extract tool definitions
    tools = []
    for line in content.split('\n'):
        if 'tools["prism_' in line:
            # Extract tool name
            start = line.find('tools["') + 7
            end = line.find('"]', start)
            if start > 6 and end > start:
                tool_name = line[start:end]
                tools.append(tool_name)
    
    # Categorize tools by capability
    categorized = defaultdict(list)
    for tool in tools:
        tool_lower = tool.lower()
        for cap, info in CAPABILITY_REQUIREMENTS.items():
            for kw in info["keywords"]:
                if kw in tool_lower:
                    categorized[cap].append(tool)
                    break
    
    return {
        "total_tools": len(tools),
        "tools": sorted(set(tools)),
        "by_capability": dict(categorized)
    }

def audit_skills():
    """Audit real skills (>80 lines, minimal placeholders)."""
    skills = {}
    
    for skills_dir in SKILLS_DIRS:
        if not skills_dir.exists():
            continue
        
        for skill_dir in skills_dir.iterdir():
            if not skill_dir.is_dir():
                continue
            
            skill_file = skill_dir / "SKILL.md"
            if not skill_file.exists():
                continue
            
            try:
                content = skill_file.read_text(encoding='utf-8')
            except:
                continue
            
            lines = len(content.split('\n'))
            placeholders = content.count("<!-- ")
            
            # Only real skills
            if lines < 80 or placeholders > 4:
                continue
            
            skill_id = skill_dir.name
            content_lower = content.lower()
            
            # Categorize by capability
            categories = []
            for cap, info in CAPABILITY_REQUIREMENTS.items():
                for kw in info["keywords"]:
                    if kw in content_lower or kw in skill_id.lower():
                        categories.append(cap)
                        break
            
            skills[skill_id] = {
                "lines": lines,
                "categories": categories,
                "source": skills_dir.name
            }
    
    return skills

def audit_scripts():
    """Audit Python scripts for capability coverage."""
    scripts_dir = PRISM_ROOT / "scripts"
    if not scripts_dir.exists():
        return {}
    
    scripts = {}
    for py_file in scripts_dir.rglob("*.py"):
        try:
            content = py_file.read_text(encoding='utf-8')
        except:
            continue
        
        lines = len(content.split('\n'))
        if lines < 50:
            continue
        
        content_lower = content.lower()
        categories = []
        for cap, info in CAPABILITY_REQUIREMENTS.items():
            for kw in info["keywords"]:
                if kw in content_lower:
                    categories.append(cap)
                    break
        
        scripts[str(py_file.relative_to(PRISM_ROOT))] = {
            "lines": lines,
            "categories": categories
        }
    
    return scripts

def analyze_gaps(mcp_tools, skills, scripts):
    """Identify capability gaps."""
    gaps = {}
    
    for cap, info in CAPABILITY_REQUIREMENTS.items():
        # Count coverage from each source
        mcp_count = len(mcp_tools.get("by_capability", {}).get(cap, []))
        skill_count = sum(1 for s in skills.values() if cap in s.get("categories", []))
        script_count = sum(1 for s in scripts.values() if cap in s.get("categories", []))
        
        total = mcp_count + skill_count + script_count
        
        gaps[cap] = {
            "description": info["description"],
            "mcp_tools": mcp_count,
            "skills": skill_count,
            "scripts": script_count,
            "total_coverage": total,
            "status": "OK" if total >= 3 else "GAP" if total > 0 else "MISSING"
        }
    
    return gaps

def main():
    print("=" * 80)
    print("COMPREHENSIVE CLAUDE CAPABILITY AUDIT")
    print("=" * 80)
    
    # Audit all sources
    print("\n[1/4] Auditing MCP Server...")
    mcp = audit_mcp_server()
    print(f"    Found {mcp.get('total_tools', 0)} MCP tools")
    
    print("\n[2/4] Auditing Skills...")
    skills = audit_skills()
    print(f"    Found {len(skills)} real skills")
    
    print("\n[3/4] Auditing Scripts...")
    scripts = audit_scripts()
    print(f"    Found {len(scripts)} substantial scripts")
    
    print("\n[4/4] Analyzing Gaps...")
    gaps = analyze_gaps(mcp, skills, scripts)
    
    # Report
    print("\n" + "=" * 80)
    print("CAPABILITY COVERAGE ANALYSIS")
    print("=" * 80)
    
    for cap, info in gaps.items():
        status = info["status"]
        marker = "[OK]  " if status == "OK" else "[GAP] " if status == "GAP" else "[MISS]"
        print(f"\n{marker} {cap}")
        print(f"       {info['description']}")
        print(f"       MCP: {info['mcp_tools']}, Skills: {info['skills']}, Scripts: {info['scripts']} = {info['total_coverage']}")
    
    # Summary
    ok_count = sum(1 for g in gaps.values() if g["status"] == "OK")
    gap_count = sum(1 for g in gaps.values() if g["status"] == "GAP")
    miss_count = sum(1 for g in gaps.values() if g["status"] == "MISSING")
    
    print("\n" + "=" * 80)
    print(f"SUMMARY: {ok_count} OK, {gap_count} GAPS, {miss_count} MISSING")
    print("=" * 80)
    
    # Output detailed JSON
    result = {
        "mcp_tools": mcp,
        "skills_count": len(skills),
        "scripts_count": len(scripts),
        "gaps": gaps,
        "summary": {"ok": ok_count, "gaps": gap_count, "missing": miss_count}
    }
    
    output_path = PRISM_ROOT / "state" / "CAPABILITY_AUDIT.json"
    output_path.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(f"\nDetailed audit saved to: {output_path}")
    
    return result

if __name__ == "__main__":
    main()
