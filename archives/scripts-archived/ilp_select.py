#!/usr/bin/env python3
"""
PRISM F-PSI-001 CLI - Quick resource selection
Usage: py -3 ilp_select.py "your task description"
"""

import sys
import json
from ilp_combination_engine import ILPCombinationEngine

def main():
    if len(sys.argv) < 2:
        print("Usage: py -3 ilp_select.py \"your task description\"")
        print("\nExamples:")
        print("  py -3 ilp_select.py \"Calculate cutting forces for steel milling\"")
        print("  py -3 ilp_select.py \"Generate FANUC post processor\"")
        print("  py -3 ilp_select.py \"Optimize toolpath for 5-axis machining\"")
        return
    
    task_desc = " ".join(sys.argv[1:])
    
    print("=" * 60)
    print("F-PSI-001 RESOURCE SELECTOR")
    print("=" * 60)
    print(f"\nTask: {task_desc}\n")
    
    engine = ILPCombinationEngine()
    engine.load_registries()
    
    task, result = engine.optimize(task_desc)
    
    print("-" * 60)
    print("ANALYSIS")
    print("-" * 60)
    print(f"Required: {', '.join(task.required_capabilities)}")
    print(f"Preferred: {', '.join(task.preferred_capabilities)}")
    
    print("\n" + "-" * 60)
    print("SELECTED SKILLS (load these)")
    print("-" * 60)
    for s in result.skills:
        print(f"  view /mnt/skills/user/{s.name}/SKILL.md")
    
    if result.agents:
        print("\n" + "-" * 60)
        print("RECOMMENDED AGENTS")
        print("-" * 60)
        for a in result.agents:
            print(f"  - {a.name}")
    
    if result.engines:
        print("\n" + "-" * 60)
        print("RELEVANT ENGINES")
        print("-" * 60)
        for e in result.engines[:8]:
            print(f"  - {e.name}")
    
    if result.formulas:
        print("\n" + "-" * 60)
        print("APPLICABLE FORMULAS")
        print("-" * 60)
        for f in result.formulas[:5]:
            print(f"  - {f.name}")
    
    print("\n" + "-" * 60)
    print("METRICS")
    print("-" * 60)
    print(f"  Score:    {result.total_score:.2f}")
    print(f"  Coverage: {result.capability_coverage:.0%}")
    print(f"  Synergy:  {result.synergy_bonus:.2f}x")
    print(f"  Cost:     {result.total_cost:.1f}")

if __name__ == "__main__":
    main()
