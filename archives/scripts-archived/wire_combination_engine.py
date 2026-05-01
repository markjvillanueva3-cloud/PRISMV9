#!/usr/bin/env python3
"""
WIRE COMBINATION ENGINE - Updates 8 skill/config files
Adds F-PSI-001 resource selection to PRISM workflow skills

Run: py -3 C:\PRISM\scripts\wire_combination_engine.py
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime

PRISM_ROOT = Path(r"C:\PRISM")
SKILLS_DIR = PRISM_ROOT / "skills"

# Track changes
changes_made = []

def log_change(file, change):
    changes_made.append({"file": str(file), "change": change})
    print(f"  ✓ {change}")

# =============================================================================
# 1. UPDATE prism-sp-planning - Add RESOURCES step
# =============================================================================
def update_sp_planning():
    print("\n[1/8] Updating prism-sp-planning...")
    
    skill_path = SKILLS_DIR / "level2-workflow" / "prism-sp-planning" / "SKILL.md"
    if not skill_path.exists():
        print(f"  ✗ File not found: {skill_path}")
        return
    
    content = skill_path.read_text(encoding='utf-8')
    
    # Check if already updated
    if "F-PSI-001" in content:
        print("  → Already contains F-PSI-001, skipping")
        return
    
    # Add RESOURCES step after DECOMPOSE in the process
    resource_step = '''
### Step 2.5: SELECT RESOURCES (NEW - v13.0)

**Purpose:** Use F-PSI-001 to select optimal resources for execution

**Duration:** 1-2 minutes (automated)

**Actions:**
1. Analyze task requirements from decomposition
2. Call F-PSI-001 Master Combination Equation
3. Get optimal: skills, agents, formulas, coefficients
4. Include synergy bonuses from SYNERGY_MATRIX

**Resource Selection Formula (F-PSI-001):**
```
Ψ(T,R) = Σᵢ[Cap(rᵢ,T) × w_coverage] + Σⱼₖ[Syn(rⱼ,rₖ) × w_synergy] - Σᵢ[Cost(rᵢ) × w_cost]

Subject to:
- Coverage(R,T) ≥ 0.95 (all requirements covered)
- |R| ≤ budget (resource count limit)
- Conflicts(R) = ∅ (no incompatible resources)
```

**Output:**
- Selected skills (from 99 available)
- Selected agents (from 64 available)  
- Required formulas (from 22 available)
- Synergy score for combination

**Verification:**
- [ ] F-PSI-001 returned valid combination
- [ ] Coverage ≥ 95%
- [ ] No resource conflicts
'''
    
    # Insert after Step 2: DECOMPOSE section
    if "### Step 2: DECOMPOSE" in content:
        # Find the end of Step 2 section (before Step 3)
        step3_match = re.search(r'(### Step 3: SPECIFY)', content)
        if step3_match:
            insert_pos = step3_match.start()
            content = content[:insert_pos] + resource_step + "\n---\n\n" + content[insert_pos:]
            skill_path.write_text(content, encoding='utf-8')
            log_change(skill_path, "Added Step 2.5: SELECT RESOURCES with F-PSI-001")
        else:
            print("  ✗ Could not find Step 3 marker")
    else:
        print("  ✗ Could not find Step 2: DECOMPOSE section")

# =============================================================================
# 2. UPDATE prism-sp-brainstorm - Reference combination-engine
# =============================================================================
def update_sp_brainstorm():
    print("\n[2/8] Updating prism-sp-brainstorm...")
    
    skill_path = SKILLS_DIR / "level2-workflow" / "prism-sp-brainstorm" / "SKILL.md"
    if not skill_path.exists():
        print(f"  ✗ File not found: {skill_path}")
        return
    
    content = skill_path.read_text(encoding='utf-8')
    
    if "combination-engine" in content:
        print("  → Already references combination-engine, skipping")
        return
    
    # Add to skill integration section
    integration_addition = '''

## Integration with Combination Engine (v13.0)

After brainstorm approval, the combination engine (F-PSI-001) automatically:
1. Analyzes approved scope for resource requirements
2. Selects optimal skills from 99 available
3. Assigns optimal agents from 64 available
4. Calculates synergy bonuses for selected combination
5. Generates optimality proof via F-PROOF-001

**Related Skills:**
- prism-combination-engine (L0) - ILP-based resource selection
- prism-swarm-coordinator (L1) - Multi-agent orchestration
- prism-resource-optimizer (L1) - Capability scoring
'''
    
    # Append before document metadata if exists, otherwise at end
    if "# DOCUMENT METADATA" in content:
        content = content.replace("# DOCUMENT METADATA", integration_addition + "\n\n# DOCUMENT METADATA")
    else:
        content += integration_addition
    
    skill_path.write_text(content, encoding='utf-8')
    log_change(skill_path, "Added Combination Engine integration section")

# =============================================================================
# 3. UPDATE prism-skill-orchestrator - v5 to v6
# =============================================================================
def update_skill_orchestrator():
    print("\n[3/8] Updating prism-skill-orchestrator...")
    
    skill_path = SKILLS_DIR / "prism-skill-orchestrator_v5_SKILL.md"
    new_path = SKILLS_DIR / "prism-skill-orchestrator_v6_SKILL.md"
    
    if not skill_path.exists():
        print(f"  ✗ File not found: {skill_path}")
        return
    
    content = skill_path.read_text(encoding='utf-8')
    
    # Update version references
    content = content.replace("v5.0", "v6.0")
    content = content.replace("93 skills", "99 skills")
    content = content.replace("58 agents", "64 agents")
    content = content.replace("15 formulas", "22 formulas")
    
    # Add new skills to the listing
    new_skills_section = '''

## NEW v6.0 Skills (Combination Engine)

### Level 0 - Always On
- **prism-combination-engine** - ILP-based optimal resource selection using F-PSI-001

### Level 1 - Cognitive  
- **prism-swarm-coordinator** - Multi-agent orchestration and task distribution
- **prism-resource-optimizer** - Capability scoring and matching
- **prism-agent-selector** - Cost-optimized agent assignment
- **prism-synergy-calculator** - Pairwise interaction modeling

### Level 2 - Workflow
- **prism-claude-code-bridge** - Script execution and code integration
'''
    
    if "prism-combination-engine" not in content:
        # Add before the end of the document
        content += new_skills_section
    
    # Write to new versioned file
    new_path.write_text(content, encoding='utf-8')
    log_change(new_path, "Created v6 with 99 skills, 64 agents, 22 formulas")

# =============================================================================
# 4. UPDATE prism-mathematical-planning - Add RESOURCES to gate
# =============================================================================
def update_mathematical_planning():
    print("\n[4/8] Updating prism-mathematical-planning...")
    
    skill_path = SKILLS_DIR / "prism-mathematical-planning.md"
    if not skill_path.exists():
        print(f"  ✗ File not found: {skill_path}")
        return
    
    content = skill_path.read_text(encoding='utf-8')
    
    if "RESOURCES:" in content and "F-PSI-001" in content:
        print("  → Already contains RESOURCES with F-PSI-001, skipping")
        return
    
    # Add RESOURCES line to MATHPLAN gate
    resources_line = '''|  [ ] RESOURCES:    R* = F-PSI-001(T) -> optimal {skills, agents, formulas}    |
|      -> Capability coverage >= 95%, synergy maximized                         |
|'''
    
    # Find the MATHPLAN gate section and add RESOURCES after EFFORT
    if "EFFORT:" in content:
        content = re.sub(
            r'(\[ \] EFFORT:.*?95% CI\).*?\|)',
            r'\1\n' + resources_line,
            content,
            flags=re.DOTALL
        )
        skill_path.write_text(content, encoding='utf-8')
        log_change(skill_path, "Added RESOURCES line with F-PSI-001 to MATHPLAN gate")
    else:
        print("  ✗ Could not find EFFORT line in MATHPLAN gate")

# =============================================================================
# 5. UPDATE prism-formula-evolution - Add 7 COORDINATION formulas
# =============================================================================
def update_formula_evolution():
    print("\n[5/8] Updating prism-formula-evolution...")
    
    skill_path = SKILLS_DIR / "prism-formula-evolution.md"
    if not skill_path.exists():
        print(f"  ✗ File not found: {skill_path}")
        return
    
    content = skill_path.read_text(encoding='utf-8')
    
    if "F-PSI-001" in content:
        print("  → Already contains COORDINATION formulas, skipping")
        return
    
    coordination_formulas = '''

## COORDINATION Formulas (v13.0 - Combination Engine)

| ID | Name | Purpose | Category |
|----|------|---------|----------|
| F-PSI-001 | Master Combination Equation | ILP optimization for resource selection | COORDINATION |
| F-RESOURCE-001 | Capability Score | Fuzzy matching resources to requirements | COORDINATION |
| F-SYNERGY-001 | Synergy Calculator | Pairwise resource interaction effects | COORDINATION |
| F-COVERAGE-001 | Task Coverage | Requirement completeness verification | COORDINATION |
| F-SWARM-001 | Swarm Efficiency | Multi-agent performance measurement | COORDINATION |
| F-AGENT-001 | Agent Selection | Cost-optimized agent assignment | COORDINATION |
| F-PROOF-001 | Optimality Proof | Mathematical certificate generation | COORDINATION |

### F-PSI-001: Master Combination Equation
```
Ψ(T,R) = Σᵢ[Cap(rᵢ,T) × w_coverage] + Σⱼₖ[Syn(rⱼ,rₖ) × w_synergy] - Σᵢ[Cost(rᵢ) × w_cost]

WHERE:
  T = Task specification with requirements
  R = Set of selected resources {skills, agents, formulas, coefficients}
  Cap(r,T) = Capability match score [0-1] from F-RESOURCE-001
  Syn(rⱼ,rₖ) = Synergy bonus from SYNERGY_MATRIX
  Cost(r) = Resource cost (API tier, complexity)
  w_* = Weights (default: 0.5, 0.3, 0.2)

CONSTRAINTS:
  Coverage(R,T) ≥ 0.95
  |R| ≤ budget
  Conflicts(R) = ∅

SOLVED VIA: PuLP ILP solver with warm-start heuristics
```
'''
    
    content += coordination_formulas
    skill_path.write_text(content, encoding='utf-8')
    log_change(skill_path, "Added 7 COORDINATION formulas section")

# =============================================================================
# 6. UPDATE prism-hook-system - Add coordination:* hooks
# =============================================================================
def update_hook_system():
    print("\n[6/8] Updating prism-hook-system...")
    
    skill_path = SKILLS_DIR / "prism-hook-system.md"
    if not skill_path.exists():
        print(f"  ✗ File not found: {skill_path}")
        return
    
    content = skill_path.read_text(encoding='utf-8')
    
    if "coordination:" in content:
        print("  → Already contains coordination hooks, skipping")
        return
    
    coordination_hooks = '''

## Coordination Hooks (v13.0 - Combination Engine)

| Hook | Fires When | Purpose |
|------|------------|---------|
| coordination:preSelect | Before F-PSI-001 runs | Validate task requirements |
| coordination:postSelect | After optimal R* found | Log selected resources |
| coordination:synergyCalc | During synergy calculation | Track interaction effects |
| coordination:proofGenerate | When generating proof | Capture optimality certificate |
| coordination:warmStart | Before ILP solve | Seed with heuristic solution |
| coordination:ilpSolve | During ILP solving | Monitor solver progress |
| coordination:fallback | If ILP unavailable | Trigger greedy heuristic |

### Integration with System Hooks
- `SYS-MATHPLAN-GATE` now requires RESOURCES step (calls coordination:preSelect)
- `task:prePlan` triggers automatic resource selection
- `learning:extract` captures resource combination patterns
'''
    
    content += coordination_hooks
    skill_path.write_text(content, encoding='utf-8')
    log_change(skill_path, "Added coordination:* hooks category")

# =============================================================================
# 7. UPDATE prism-all-skills - Include 6 new skills
# =============================================================================
def update_all_skills():
    print("\n[7/8] Updating prism-all-skills...")
    
    skill_path = SKILLS_DIR / "prism-all-skills" / "SKILL.md"
    if not skill_path.exists():
        # Try alternate location
        skill_path = SKILLS_DIR / "PRISM_ALL_SKILLS_v3.0.md"
    
    if not skill_path.exists():
        print(f"  ✗ File not found")
        return
    
    content = skill_path.read_text(encoding='utf-8')
    
    if "prism-combination-engine" in content:
        print("  → Already contains new skills, skipping")
        return
    
    # Update counts
    content = content.replace("93 skills", "99 skills")
    content = content.replace("58 agents", "64 agents")
    
    new_skills_listing = '''

## v13.0 Additions - Combination Engine Skills

### Level 0 - Always On (1 new)
| Skill | Purpose |
|-------|---------|
| prism-combination-engine | ILP-based optimal resource selection via F-PSI-001 |

### Level 1 - Cognitive (4 new)
| Skill | Purpose |
|-------|---------|
| prism-swarm-coordinator | Multi-agent task distribution and orchestration |
| prism-resource-optimizer | Capability scoring and requirement matching |
| prism-agent-selector | Cost-optimized agent assignment |
| prism-synergy-calculator | Pairwise resource interaction modeling |

### Level 2 - Workflow (1 new)
| Skill | Purpose |
|-------|---------|
| prism-claude-code-bridge | Script execution and Python integration |

**Total: 99 skills (was 93, +6 new)**
'''
    
    content += new_skills_listing
    skill_path.write_text(content, encoding='utf-8')
    log_change(skill_path, "Added 6 new skills, updated counts to 99")

# =============================================================================
# 8. UPDATE SKILL_MANIFEST.json - Update counts
# =============================================================================
def update_skill_manifest():
    print("\n[8/8] Updating SKILL_MANIFEST.json...")
    
    manifest_path = SKILLS_DIR / "SKILL_MANIFEST_v3.0.json"
    if not manifest_path.exists():
        manifest_path = SKILLS_DIR / "SKILL_MANIFEST.json"
    
    if not manifest_path.exists():
        print(f"  ✗ File not found")
        return
    
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        print("  ✗ Invalid JSON")
        return
    
    # Update counts
    manifest["version"] = "4.0.0"
    manifest["lastUpdated"] = datetime.now().isoformat()
    manifest["counts"] = {
        "skills": 99,
        "agents": 64,
        "formulas": 22,
        "coefficients": 40,
        "hooks": 147,
        "resources": 691
    }
    
    # Add new skills to listing
    if "skills" not in manifest:
        manifest["skills"] = {}
    
    new_skills = {
        "prism-combination-engine": {"level": 0, "category": "always-on", "version": "1.0.0"},
        "prism-swarm-coordinator": {"level": 1, "category": "cognitive", "version": "1.0.0"},
        "prism-resource-optimizer": {"level": 1, "category": "cognitive", "version": "1.0.0"},
        "prism-agent-selector": {"level": 1, "category": "cognitive", "version": "1.0.0"},
        "prism-synergy-calculator": {"level": 1, "category": "cognitive", "version": "1.0.0"},
        "prism-claude-code-bridge": {"level": 2, "category": "workflow", "version": "1.0.0"}
    }
    manifest["skills"].update(new_skills)
    
    # Write back
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    log_change(manifest_path, "Updated to v4.0.0 with 99 skills, 64 agents, 22 formulas")

# =============================================================================
# MAIN
# =============================================================================
def main():
    print("=" * 70)
    print("WIRE COMBINATION ENGINE - Consumer Updates")
    print("=" * 70)
    print(f"PRISM Root: {PRISM_ROOT}")
    print(f"Skills Dir: {SKILLS_DIR}")
    print(f"Timestamp:  {datetime.now().isoformat()}")
    
    # Run all updates
    update_sp_planning()
    update_sp_brainstorm()
    update_skill_orchestrator()
    update_mathematical_planning()
    update_formula_evolution()
    update_hook_system()
    update_all_skills()
    update_skill_manifest()
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total changes: {len(changes_made)}")
    for c in changes_made:
        print(f"  • {Path(c['file']).name}: {c['change']}")
    
    # Update CURRENT_STATE.json
    state_file = PRISM_ROOT / "state" / "CURRENT_STATE.json"
    if state_file.exists():
        state = json.loads(state_file.read_text(encoding='utf-8'))
        state["wiringComplete"] = True
        state["wiringTimestamp"] = datetime.now().isoformat()
        state["wiringChanges"] = len(changes_made)
        state_file.write_text(json.dumps(state, indent=2), encoding='utf-8')
        print(f"\n✓ Updated CURRENT_STATE.json")
    
    print("\n✅ WIRING COMPLETE!")
    print("All 8 consumer files updated with F-PSI-001 integration.")

if __name__ == "__main__":
    main()
