#!/usr/bin/env python3
"""Spawn a PRISM extraction swarm - coordinates multiple agents."""

import json
import os
import argparse
from datetime import datetime
from pathlib import Path

LOCAL_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
SWARM_DIR = os.path.join(LOCAL_ROOT, "_SWARM")

# Category assignments for parallel extraction
CATEGORY_GROUPS = {
    'databases': {
        'group_1': ['materials', 'tools'],
        'group_2': ['machines', 'workholding'],
        'group_3': ['post', 'process', 'business'],
        'group_4': ['ai_ml', 'cad_cam', 'manufacturer', 'infrastructure']
    },
    'engines': {
        'group_1': ['cad', 'cam'],
        'group_2': ['physics_1', 'physics_2'],  # Split physics (42 engines)
        'group_3': ['ai_ml_1', 'ai_ml_2', 'ai_ml_3'],  # Split AI/ML (74 engines)
        'group_4': ['optimization', 'signal', 'post', 'collision']
    }
}

def create_multi_agent_plan(category, num_agents):
    """Create the shared coordination document."""
    groups = CATEGORY_GROUPS.get(category, {})
    
    assignments = []
    agent_groups = list(groups.items())[:num_agents]
    
    for i, (group_name, categories) in enumerate(agent_groups):
        assignments.append({
            'agent_id': f'agent_{i+1}',
            'group': group_name,
            'categories': categories,
            'status': 'PENDING',
            'started': None,
            'completed': None
        })
    
    plan = {
        'created': datetime.now().isoformat(),
        'category': category,
        'num_agents': num_agents,
        'assignments': assignments,
        'conflicts': [],
        'merge_queue': [],
        'status': 'READY'
    }
    
    return plan

def write_plan_markdown(plan, output_path):
    """Write plan as Markdown for human readability."""
    md = f"""# PRISM Multi-Agent Extraction Plan
## Created: {plan['created']}
## Category: {plan['category']}

## Agent Assignments

| Agent | Group | Categories | Status |
|-------|-------|------------|--------|
"""
    for a in plan['assignments']:
        cats = ', '.join(a['categories'])
        md += f"| {a['agent_id']} | {a['group']} | {cats} | {a['status']} |\n"
    
    md += """
## Conflicts
None yet.

## Merge Queue
Waiting for agent completion.

## Instructions for Agents

Each agent should:
1. Read this plan to find your assignment
2. Extract only your assigned categories
3. Save to: `_SWARM/outputs/{agent_id}/`
4. Update status in CURRENT_STATE.json
5. Signal completion by creating `_SWARM/outputs/{agent_id}/COMPLETE.flag`

## Queen Coordination

Queen will:
1. Monitor agent progress
2. Resolve conflicts if any
3. Merge all outputs to EXTRACTED/
4. Update final state
"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md)

def main():
    parser = argparse.ArgumentParser(description='Spawn PRISM extraction swarm')
    parser.add_argument('--category', type=str, required=True, choices=['databases', 'engines', 'all'])
    parser.add_argument('--agents', type=int, default=4, help='Number of agents (2-8)')
    args = parser.parse_args()
    
    num_agents = max(2, min(8, args.agents))
    
    print(f"\n[PRISM SWARM ORCHESTRATOR]")
    print(f"Category: {args.category}")
    print(f"Agents: {num_agents}")
    
    # Create swarm directory
    os.makedirs(SWARM_DIR, exist_ok=True)
    os.makedirs(os.path.join(SWARM_DIR, 'outputs'), exist_ok=True)
    
    # Create plan
    plan = create_multi_agent_plan(args.category, num_agents)
    
    # Save as JSON
    plan_json = os.path.join(SWARM_DIR, 'SWARM_PLAN.json')
    with open(plan_json, 'w', encoding='utf-8') as f:
        json.dump(plan, f, indent=2)
    
    # Save as Markdown
    plan_md = os.path.join(LOCAL_ROOT, 'MULTI_AGENT_PLAN.md')
    write_plan_markdown(plan, plan_md)
    
    print(f"\n✓ Swarm plan created:")
    print(f"  JSON: {plan_json}")
    print(f"  Markdown: {plan_md}")
    
    print(f"\nAgent assignments:")
    for a in plan['assignments']:
        print(f"  {a['agent_id']}: {', '.join(a['categories'])}")
    
    print(f"\nNext steps:")
    print(f"  1. Open {num_agents} Claude terminals")
    print(f"  2. Each reads MULTI_AGENT_PLAN.md")
    print(f"  3. Each extracts assigned categories")
    print(f"  4. Queen merges results")
    
    return 0

if __name__ == "__main__":
    exit(main())
