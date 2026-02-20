#!/usr/bin/env python3
"""
PRISM COMPREHENSIVE RESOURCE AUDIT
Audits ALL resources: MCP tools, skills, scripts, hooks, agents, formulas, 
algorithms, swarms, parallels, and identifies utilization gaps.
"""
import json
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime

print("=" * 80)
print("PRISM COMPREHENSIVE RESOURCE AUDIT")
print("=" * 80)

# Paths
PRISM_ROOT = Path("C:/PRISM")
SCRIPTS = PRISM_ROOT / "scripts"
CORE = SCRIPTS / "core"
REGISTRIES = PRISM_ROOT / "registries"
SKILLS_LOCAL = PRISM_ROOT / "skills-consolidated"
SKILLS_MNT = Path("/mnt/skills/user")

audit = {
    "timestamp": datetime.now().isoformat(),
    "mcp_server": {},
    "resources": {},
    "utilization": {},
    "gaps": [],
    "recommendations": []
}

# ============================================================================
# 1. MCP SERVER TOOLS
# ============================================================================
print("\n[1/10] AUDITING MCP SERVER TOOLS...")

import sys
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(CORE))

try:
    from prism_mcp_server import PRISMMCPServer
    mcp = PRISMMCPServer()
    mcp_tools = list(mcp.tools.keys())
    
    # Categorize tools
    tool_categories = defaultdict(list)
    for tool in mcp_tools:
        prefix = "_".join(tool.split("_")[:2])
        tool_categories[prefix].append(tool)
    
    audit["mcp_server"] = {
        "total_tools": len(mcp_tools),
        "categories": {k: len(v) for k, v in sorted(tool_categories.items())},
        "tools_by_category": dict(tool_categories)
    }
    print(f"  Total MCP tools: {len(mcp_tools)}")
    print(f"  Categories: {len(tool_categories)}")
except Exception as e:
    print(f"  ERROR: {e}")
    audit["mcp_server"]["error"] = str(e)

# ============================================================================
# 2. SKILLS AUDIT
# ============================================================================
print("\n[2/10] AUDITING SKILLS...")

skills_audit = {"local": [], "mnt": [], "real": 0, "placeholder": 0}

# Local skills
if SKILLS_LOCAL.exists():
    for skill_dir in SKILLS_LOCAL.iterdir():
        if skill_dir.is_dir():
            skill_file = skill_dir / "SKILL.md"
            if skill_file.exists():
                content = skill_file.read_text(encoding='utf-8', errors='ignore')
                lines = len(content.split('\n'))
                is_real = lines >= 80 and content.count("TODO") < 4
                skills_audit["local"].append({
                    "name": skill_dir.name,
                    "lines": lines,
                    "real": is_real
                })
                if is_real:
                    skills_audit["real"] += 1
                else:
                    skills_audit["placeholder"] += 1

audit["resources"]["skills"] = {
    "total": len(skills_audit["local"]),
    "real": skills_audit["real"],
    "placeholder": skills_audit["placeholder"],
    "real_pct": round(skills_audit["real"] / max(1, len(skills_audit["local"])) * 100, 1)
}
print(f"  Total skills: {len(skills_audit['local'])}")
print(f"  Real content: {skills_audit['real']} ({audit['resources']['skills']['real_pct']}%)")

# ============================================================================
# 3. SCRIPTS AUDIT
# ============================================================================
print("\n[3/10] AUDITING SCRIPTS...")

scripts_audit = {"total": 0, "by_type": defaultdict(int), "substantial": 0}

for py_file in SCRIPTS.rglob("*.py"):
    scripts_audit["total"] += 1
    try:
        content = py_file.read_text(encoding='utf-8', errors='ignore')
        lines = len(content.split('\n'))
        if lines >= 50:
            scripts_audit["substantial"] += 1
        
        # Categorize
        if "mcp" in py_file.name.lower():
            scripts_audit["by_type"]["mcp"] += 1
        elif "test" in py_file.name.lower():
            scripts_audit["by_type"]["test"] += 1
        elif "generator" in py_file.name.lower():
            scripts_audit["by_type"]["generator"] += 1
        else:
            scripts_audit["by_type"]["other"] += 1
    except:
        pass

audit["resources"]["scripts"] = dict(scripts_audit)
print(f"  Total scripts: {scripts_audit['total']}")
print(f"  Substantial (50+ lines): {scripts_audit['substantial']}")
print(f"  By type: {dict(scripts_audit['by_type'])}")

# ============================================================================
# 4. HOOKS AUDIT
# ============================================================================
print("\n[4/10] AUDITING HOOKS...")

hooks_audit = {"total": 0, "domains": 0, "blocking": 0}
hook_file = REGISTRIES / "HOOK_REGISTRY.json"

if hook_file.exists():
    try:
        data = json.loads(hook_file.read_text(encoding='utf-8'))
        hooks_audit["total"] = data.get("totalHooks", 0)
        hooks_audit["domains"] = len(data.get("summary", {}).get("byDomain", {}))
        for hook in data.get("hooks", []):
            if hook.get("isBlocking"):
                hooks_audit["blocking"] += 1
    except:
        pass

audit["resources"]["hooks"] = hooks_audit
print(f"  Total hooks: {hooks_audit['total']}")
print(f"  Domains: {hooks_audit['domains']}")
print(f"  Blocking: {hooks_audit['blocking']}")

# ============================================================================
# 5. FORMULAS AUDIT
# ============================================================================
print("\n[5/10] AUDITING FORMULAS...")

formulas_audit = {"total": 0, "categories": 0, "by_novelty": {}}
formula_file = REGISTRIES / "FORMULA_REGISTRY.json"

if formula_file.exists():
    try:
        data = json.loads(formula_file.read_text(encoding='utf-8'))
        formulas_audit["total"] = data.get("totalFormulas", 0)
        formulas_audit["categories"] = data.get("totalCategories", 0)
        formulas_audit["by_novelty"] = data.get("byNovelty", {})
    except:
        pass

audit["resources"]["formulas"] = formulas_audit
print(f"  Total formulas: {formulas_audit['total']}")
print(f"  Categories: {formulas_audit['categories']}")
print(f"  By novelty: {formulas_audit['by_novelty']}")

# ============================================================================
# 6. AGENTS AUDIT
# ============================================================================
print("\n[6/10] AUDITING AGENTS...")

agents_audit = {"total": 0, "tiers": {}}
agent_file = REGISTRIES / "AGENT_REGISTRY.json"

if agent_file.exists():
    try:
        data = json.loads(agent_file.read_text(encoding='utf-8'))
        agents = data.get("agents", [])
        agents_audit["total"] = len(agents)
        for agent in agents:
            tier = agent.get("tier", "UNKNOWN")
            agents_audit["tiers"][tier] = agents_audit["tiers"].get(tier, 0) + 1
    except:
        pass

audit["resources"]["agents"] = agents_audit
print(f"  Total agents: {agents_audit['total']}")
print(f"  By tier: {agents_audit['tiers']}")

# ============================================================================
# 7. SPECIAL PATTERNS AUDIT (Swarms, Parallels, Ralph Loops, etc.)
# ============================================================================
print("\n[7/10] AUDITING SPECIAL PATTERNS...")

patterns_audit = {
    "swarm_orchestrator": False,
    "ralph_loops": False,
    "claude_flow": False,
    "api_executor": False,
    "batch_processor": False,
    "parallel_executor": False,
    "manus_integration": False,
    "obsidian_sync": False
}

# Check for pattern implementations
pattern_files = {
    "swarm": ["swarm", "orchestrator", "multi_agent"],
    "ralph": ["ralph", "loop", "iteration"],
    "claude_flow": ["claude_flow", "flow", "pipeline"],
    "api": ["api_executor", "api_swarm", "parallel_api"],
    "batch": ["batch", "queue", "bulk"],
    "parallel": ["parallel", "concurrent", "thread"],
    "manus": ["manus", "external"],
    "obsidian": ["obsidian", "vault", "markdown_sync"]
}

for py_file in SCRIPTS.rglob("*.py"):
    name_lower = py_file.name.lower()
    try:
        content = py_file.read_text(encoding='utf-8', errors='ignore').lower()
        
        for pattern, keywords in pattern_files.items():
            if any(kw in name_lower or kw in content for kw in keywords):
                patterns_audit[f"{pattern}_found"] = True
                if pattern == "swarm":
                    patterns_audit["swarm_orchestrator"] = True
                elif pattern == "ralph":
                    patterns_audit["ralph_loops"] = True
                elif pattern == "claude_flow":
                    patterns_audit["claude_flow"] = True
                elif pattern == "api":
                    patterns_audit["api_executor"] = True
                elif pattern == "batch":
                    patterns_audit["batch_processor"] = True
                elif pattern == "parallel":
                    patterns_audit["parallel_executor"] = True
    except:
        pass

audit["resources"]["patterns"] = patterns_audit
print(f"  Swarm orchestrator: {patterns_audit['swarm_orchestrator']}")
print(f"  Ralph loops: {patterns_audit['ralph_loops']}")
print(f"  Batch processor: {patterns_audit['batch_processor']}")
print(f"  Parallel executor: {patterns_audit['parallel_executor']}")
print(f"  API executor: {patterns_audit['api_executor']}")

# ============================================================================
# 8. REGISTRIES AUDIT
# ============================================================================
print("\n[8/10] AUDITING REGISTRIES...")

registries_audit = {}
if REGISTRIES.exists():
    for reg_file in REGISTRIES.glob("*.json"):
        try:
            data = json.loads(reg_file.read_text(encoding='utf-8'))
            size = reg_file.stat().st_size
            registries_audit[reg_file.stem] = {
                "size_kb": round(size / 1024, 1),
                "keys": len(data) if isinstance(data, dict) else "array"
            }
        except:
            pass

audit["resources"]["registries"] = {
    "count": len(registries_audit),
    "files": list(registries_audit.keys())
}
print(f"  Total registries: {len(registries_audit)}")

# ============================================================================
# 9. UTILIZATION ANALYSIS
# ============================================================================
print("\n[9/10] ANALYZING UTILIZATION...")

# Check what's in MCP vs what exists
mcp_coverage = {
    "hooks": "prism_hook_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "formulas": "prism_formula_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "skills": "prism_skill_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "materials": "prism_material_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "physics": "prism_physics_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "agents": "prism_agent_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "orchestrator": "prism_orch_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "batch": "prism_batch_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "context": "prism_context_" in str(mcp_tools) if 'mcp_tools' in dir() else False,
    "validation": "prism_validate_" in str(mcp_tools) if 'mcp_tools' in dir() else False
}

audit["utilization"]["mcp_coverage"] = mcp_coverage
covered = sum(1 for v in mcp_coverage.values() if v)
print(f"  MCP coverage: {covered}/{len(mcp_coverage)} resource types")

# ============================================================================
# 10. GAP ANALYSIS & RECOMMENDATIONS
# ============================================================================
print("\n[10/10] IDENTIFYING GAPS & RECOMMENDATIONS...")

gaps = []
recommendations = []

# Check for missing MCP integrations
if not mcp_coverage.get("agents"):
    gaps.append("Agents not fully exposed via MCP")
    recommendations.append("Create agent_mcp.py with spawn/list/status tools")

# Check for underutilized patterns
if not patterns_audit.get("swarm_orchestrator"):
    gaps.append("Swarm orchestration not integrated")
    recommendations.append("Integrate swarm patterns into MCP orchestrator")

if not patterns_audit.get("ralph_loops"):
    gaps.append("Ralph iteration loops not standardized")
    recommendations.append("Create standard Ralph loop pattern in MCP")

# Check orchestrator integration
if mcp_coverage.get("orchestrator"):
    recommendations.append("Verify orchestrator uses ALL MCP tools for routing")

audit["gaps"] = gaps
audit["recommendations"] = recommendations

print(f"  Gaps found: {len(gaps)}")
for gap in gaps:
    print(f"    - {gap}")
print(f"  Recommendations: {len(recommendations)}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("AUDIT SUMMARY")
print("=" * 80)

summary = {
    "mcp_tools": audit["mcp_server"].get("total_tools", 0),
    "skills": audit["resources"].get("skills", {}).get("total", 0),
    "skills_real": audit["resources"].get("skills", {}).get("real", 0),
    "scripts": audit["resources"].get("scripts", {}).get("total", 0),
    "hooks": audit["resources"].get("hooks", {}).get("total", 0),
    "formulas": audit["resources"].get("formulas", {}).get("total", 0),
    "agents": audit["resources"].get("agents", {}).get("total", 0),
    "registries": audit["resources"].get("registries", {}).get("count", 0),
    "gaps": len(gaps)
}

audit["summary"] = summary

print(f"""
  MCP Tools:     {summary['mcp_tools']}
  Skills:        {summary['skills']} ({summary['skills_real']} real)
  Scripts:       {summary['scripts']}
  Hooks:         {summary['hooks']}
  Formulas:      {summary['formulas']}
  Agents:        {summary['agents']}
  Registries:    {summary['registries']}
  Gaps:          {summary['gaps']}
""")

# Save audit
audit_path = PRISM_ROOT / "state" / "COMPREHENSIVE_AUDIT.json"
audit_path.write_text(json.dumps(audit, indent=2, default=str), encoding='utf-8')
print(f"Audit saved to: {audit_path}")
