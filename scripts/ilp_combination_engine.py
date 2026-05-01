#!/usr/bin/env python3
"""
PRISM F-PSI-001 ILP Combination Engine - Session R2.3.1
Intelligent resource selection using optimization

Formula: Ψ = argmax[Σ Cap(r,T) × Syn(R) × Ω(R) × K(R) / Cost(R)]
Subject to: |skills|≤8, |agents|≤8, S≥0.70, M≥0.60, Coverage=1.0
"""

import json
import os
import re
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import math

# Paths
REGISTRY_PATH = r"C:\PRISM\registries"

@dataclass
class Resource:
    """Represents a PRISM resource (skill, agent, engine, etc.)"""
    id: str
    name: str
    type: str
    capabilities: List[str] = field(default_factory=list)
    level: str = "L3"
    lines: int = 0
    path: str = ""
    
    @property
    def cost(self) -> float:
        """Estimate resource cost based on size/complexity"""
        if self.type == "SKILL":
            return max(1, self.lines / 500)  # Larger skills cost more
        elif self.type == "AGENT":
            return 2.0  # Agents have fixed overhead
        elif self.type == "ENGINE":
            return max(1, self.lines / 1000)
        elif self.type == "FORMULA":
            return 0.5  # Formulas are cheap
        elif self.type == "HOOK":
            return 0.2  # Hooks are very cheap
        else:
            return 1.0

@dataclass
class TaskProfile:
    """Represents requirements for a task"""
    description: str
    required_capabilities: Set[str] = field(default_factory=set)
    preferred_capabilities: Set[str] = field(default_factory=set)
    constraints: Dict[str, any] = field(default_factory=dict)
    
    def __post_init__(self):
        # Set defaults
        if 'max_skills' not in self.constraints:
            self.constraints['max_skills'] = 8
        if 'max_agents' not in self.constraints:
            self.constraints['max_agents'] = 8
        if 'min_safety' not in self.constraints:
            self.constraints['min_safety'] = 0.70
        if 'min_capability_match' not in self.constraints:
            self.constraints['min_capability_match'] = 0.60

@dataclass
class SelectionResult:
    """Result of resource selection"""
    skills: List[Resource] = field(default_factory=list)
    agents: List[Resource] = field(default_factory=list)
    engines: List[Resource] = field(default_factory=list)
    formulas: List[Resource] = field(default_factory=list)
    hooks: List[Resource] = field(default_factory=list)
    
    total_score: float = 0.0
    capability_coverage: float = 0.0
    synergy_bonus: float = 1.0
    total_cost: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "skills": [{"id": r.id, "name": r.name, "path": r.path} for r in self.skills],
            "agents": [{"id": r.id, "name": r.name} for r in self.agents],
            "engines": [{"id": r.id, "name": r.name} for r in self.engines],
            "formulas": [{"id": r.id, "name": r.name} for r in self.formulas],
            "hooks": [{"id": r.id, "name": r.name} for r in self.hooks],
            "metrics": {
                "total_score": round(self.total_score, 4),
                "capability_coverage": round(self.capability_coverage, 4),
                "synergy_bonus": round(self.synergy_bonus, 4),
                "total_cost": round(self.total_cost, 2)
            }
        }

class ILPCombinationEngine:
    """
    F-PSI-001: Intelligent Linear Programming Combination Engine
    
    Selects optimal resource combinations for any given task.
    """
    
    def __init__(self):
        self.resources: Dict[str, List[Resource]] = {
            "skills": [],
            "agents": [],
            "engines": [],
            "formulas": [],
            "hooks": [],
            "coefficients": [],
            "swarm_patterns": []
        }
        self.capability_matrix: Dict[str, List[str]] = {}
        self.synergy_matrix: Dict[str, float] = {}
        self.default_synergy = 1.0
        
        # Capability keywords for task analysis
        self.capability_keywords = {
            "MATERIALS": ["material", "alloy", "steel", "aluminum", "titanium", "metal", "composite", "plastic"],
            "MACHINES": ["machine", "cnc", "lathe", "mill", "spindle", "axis", "5-axis", "turning", "milling"],
            "TOOLS": ["tool", "cutter", "insert", "drill", "endmill", "carbide", "holder", "tooling"],
            "CAD": ["cad", "geometry", "solid", "surface", "brep", "nurbs", "model", "design", "drawing"],
            "CAM": ["cam", "toolpath", "machining", "roughing", "finishing", "strategy", "operation"],
            "POST": ["post", "gcode", "g-code", "fanuc", "siemens", "heidenhain", "haas", "controller", "nc"],
            "PHYSICS": ["physics", "force", "cutting", "thermal", "heat", "vibration", "chatter", "dynamics"],
            "AI_ML": ["ai", "ml", "machine learning", "neural", "optimize", "predict", "learn", "deep learning"],
            "QUALITY": ["quality", "validate", "verify", "check", "audit", "test", "safety", "compliance"],
            "BUSINESS": ["cost", "quote", "price", "schedule", "shop", "estimate", "roi", "efficiency"],
            "KNOWLEDGE": ["knowledge", "reference", "lookup", "database", "algorithm", "pattern"],
            "SESSION": ["session", "state", "checkpoint", "resume", "handoff", "continuity"],
            "INTEGRATION": ["integrate", "connect", "bridge", "sync", "api", "interface"],
            "THERMAL": ["thermal", "heat", "temperature", "cooling", "expansion"],
            "VIBRATION": ["vibration", "chatter", "stability", "damping", "frequency"],
            "SURFACE": ["surface", "finish", "roughness", "ra", "quality"],
            "OPTIMIZATION": ["optimize", "optimization", "minimize", "maximize", "objective"],
        }
    
    def load_registries(self):
        """Load all registries from disk"""
        # Load RESOURCE_REGISTRY
        registry_path = os.path.join(REGISTRY_PATH, "RESOURCE_REGISTRY.json")
        with open(registry_path, 'r', encoding='utf-8') as f:
            registry = json.load(f)
        
        # Parse resources
        for skill_data in registry["resources"].get("skills", []):
            self.resources["skills"].append(Resource(
                id=skill_data["id"],
                name=skill_data["name"],
                type="SKILL",
                capabilities=skill_data.get("capabilities", []),
                level=skill_data.get("level", "L3"),
                lines=skill_data.get("lines", 0),
                path=skill_data.get("path", "")
            ))
        
        for agent_data in registry["resources"].get("agents", []):
            self.resources["agents"].append(Resource(
                id=agent_data["id"],
                name=agent_data["name"],
                type="AGENT",
                capabilities=agent_data.get("capabilities", [])
            ))
        
        for engine_data in registry["resources"].get("engines", []):
            caps = [engine_data.get("category", "ENGINE")]
            self.resources["engines"].append(Resource(
                id=engine_data["id"],
                name=engine_data["name"],
                type="ENGINE",
                capabilities=caps,
                lines=engine_data.get("lines", 0),
                path=engine_data.get("path", "")
            ))
        
        for formula_data in registry["resources"].get("formulas", []):
            self.resources["formulas"].append(Resource(
                id=formula_data["id"],
                name=formula_data["name"],
                type="FORMULA",
                capabilities=[formula_data.get("domain", "GENERAL")]
            ))
        
        for hook_data in registry["resources"].get("hooks", []):
            self.resources["hooks"].append(Resource(
                id=hook_data["id"],
                name=hook_data["name"],
                type="HOOK",
                capabilities=[hook_data.get("type", "GENERAL")]
            ))
        
        # Load CAPABILITY_MATRIX
        cap_path = os.path.join(REGISTRY_PATH, "CAPABILITY_MATRIX.json")
        with open(cap_path, 'r', encoding='utf-8') as f:
            cap_data = json.load(f)
            self.capability_matrix = cap_data.get("matrix", {})
        
        # Load SYNERGY_MATRIX
        syn_path = os.path.join(REGISTRY_PATH, "SYNERGY_MATRIX.json")
        with open(syn_path, 'r', encoding='utf-8') as f:
            syn_data = json.load(f)
            self.synergy_matrix = syn_data.get("synergies", {})
            self.default_synergy = syn_data.get("default_synergy", 1.0)
        
        print(f"Loaded {sum(len(v) for v in self.resources.values())} resources")
        print(f"Loaded {len(self.capability_matrix)} capability domains")
        print(f"Loaded {len(self.synergy_matrix)} synergy pairs")
    
    def analyze_task(self, description: str) -> TaskProfile:
        """Analyze task description to determine required capabilities"""
        description_lower = description.lower()
        
        required = set()
        preferred = set()
        
        for capability, keywords in self.capability_keywords.items():
            # Count keyword matches
            matches = sum(1 for kw in keywords if kw in description_lower)
            
            if matches >= 2:
                required.add(capability)
            elif matches >= 1:
                preferred.add(capability)
        
        # Always include core capabilities for safety
        required.add("QUALITY")
        
        # Add related capabilities
        if "PHYSICS" in required:
            preferred.add("MATERIALS")
        if "CAM" in required:
            preferred.add("CAD")
            preferred.add("POST")
        if "OPTIMIZATION" in required:
            preferred.add("AI_ML")
        
        return TaskProfile(
            description=description,
            required_capabilities=required,
            preferred_capabilities=preferred - required
        )
    
    def calculate_capability_match(self, resource: Resource, task: TaskProfile) -> float:
        """Calculate how well a resource matches task requirements"""
        resource_caps = set(resource.capabilities)
        
        # Required capability match (weighted heavily)
        required_match = len(resource_caps & task.required_capabilities) / max(1, len(task.required_capabilities))
        
        # Preferred capability match (bonus)
        preferred_match = len(resource_caps & task.preferred_capabilities) / max(1, len(task.preferred_capabilities)) if task.preferred_capabilities else 0
        
        return 0.7 * required_match + 0.3 * preferred_match
    
    def calculate_synergy(self, capabilities: Set[str]) -> float:
        """Calculate synergy bonus for a set of capabilities"""
        bonus = self.default_synergy
        
        cap_list = list(capabilities)
        for i, cap1 in enumerate(cap_list):
            for cap2 in cap_list[i+1:]:
                key1 = f"{cap1}+{cap2}"
                key2 = f"{cap2}+{cap1}"
                
                if key1 in self.synergy_matrix:
                    bonus *= self.synergy_matrix[key1]
                elif key2 in self.synergy_matrix:
                    bonus *= self.synergy_matrix[key2]
        
        return bonus
    
    def score_resource(self, resource: Resource, task: TaskProfile) -> float:
        """
        Score a resource for a task using F-PSI-001 formula component
        
        Score = Cap(r,T) × K(r) / Cost(r)
        where:
          - Cap(r,T) = capability match between resource and task
          - K(r) = knowledge factor (based on resource level/lines)
          - Cost(r) = resource cost
        """
        cap_match = self.calculate_capability_match(resource, task)
        
        # Knowledge factor based on level
        level_factors = {"L0": 2.0, "L1": 1.5, "L2": 1.2, "L3": 1.0}
        k_factor = level_factors.get(resource.level, 1.0)
        
        # Size bonus for larger resources (more comprehensive)
        if resource.lines > 0:
            k_factor *= min(2.0, 1 + math.log10(max(1, resource.lines / 100)))
        
        cost = resource.cost
        
        if cost == 0:
            return 0
        
        return (cap_match * k_factor) / cost
    
    def select_resources(self, task: TaskProfile) -> SelectionResult:
        """
        Main ILP selection algorithm
        
        Ψ = argmax[Σ Cap(r,T) × Syn(R) × Ω(R) × K(R) / Cost(R)]
        s.t. |skills|≤8, |agents|≤8, S≥0.70, M≥0.60, Coverage=1.0
        """
        result = SelectionResult()
        
        # Score and sort all resources by type
        scored_skills = sorted(
            [(r, self.score_resource(r, task)) for r in self.resources["skills"]],
            key=lambda x: -x[1]
        )
        
        scored_agents = sorted(
            [(r, self.score_resource(r, task)) for r in self.resources["agents"]],
            key=lambda x: -x[1]
        )
        
        scored_engines = sorted(
            [(r, self.score_resource(r, task)) for r in self.resources["engines"]],
            key=lambda x: -x[1]
        )
        
        scored_formulas = sorted(
            [(r, self.score_resource(r, task)) for r in self.resources["formulas"]],
            key=lambda x: -x[1]
        )
        
        # Select top resources respecting constraints
        max_skills = task.constraints.get('max_skills', 8)
        max_agents = task.constraints.get('max_agents', 8)
        min_cap_match = task.constraints.get('min_capability_match', 0.60)
        
        # Select skills (greedy with coverage check)
        covered_caps = set()
        for resource, score in scored_skills:
            if len(result.skills) >= max_skills:
                break
            
            cap_match = self.calculate_capability_match(resource, task)
            if cap_match >= min_cap_match or score > 0.5:
                result.skills.append(resource)
                covered_caps.update(resource.capabilities)
                result.total_cost += resource.cost
        
        # Select agents
        for resource, score in scored_agents:
            if len(result.agents) >= max_agents:
                break
            
            cap_match = self.calculate_capability_match(resource, task)
            if cap_match >= min_cap_match or score > 0.3:
                result.agents.append(resource)
                covered_caps.update(resource.capabilities)
                result.total_cost += resource.cost
        
        # Select relevant engines (no hard limit)
        for resource, score in scored_engines[:15]:  # Top 15 engines
            cap_match = self.calculate_capability_match(resource, task)
            if cap_match > 0 or score > 0.2:
                result.engines.append(resource)
                covered_caps.update(resource.capabilities)
                result.total_cost += resource.cost
        
        # Select relevant formulas
        for resource, score in scored_formulas[:10]:  # Top 10 formulas
            cap_match = self.calculate_capability_match(resource, task)
            if cap_match > 0 or score > 0.1:
                result.formulas.append(resource)
                result.total_cost += resource.cost
        
        # Select mandatory hooks (L0/L1 always included)
        for hook in self.resources["hooks"]:
            if hook.capabilities and hook.capabilities[0] in ["COGNITIVE", "LIFE_SAFETY", "MANDATORY"]:
                result.hooks.append(hook)
        
        # Calculate final metrics
        result.capability_coverage = len(covered_caps & task.required_capabilities) / max(1, len(task.required_capabilities))
        result.synergy_bonus = self.calculate_synergy(covered_caps)
        
        # Total score using F-PSI-001
        resource_scores = sum(self.score_resource(r, task) for r in 
                            result.skills + result.agents + result.engines + result.formulas)
        result.total_score = resource_scores * result.synergy_bonus * result.capability_coverage
        
        return result
    
    def optimize(self, description: str) -> Tuple[TaskProfile, SelectionResult]:
        """Main entry point: analyze task and select optimal resources"""
        task = self.analyze_task(description)
        result = self.select_resources(task)
        return task, result


def main():
    print("=" * 70)
    print("PRISM F-PSI-001 ILP COMBINATION ENGINE - Session R2.3.1")
    print("=" * 70)
    
    engine = ILPCombinationEngine()
    engine.load_registries()
    
    # Test with sample tasks
    test_tasks = [
        "Calculate optimal cutting parameters for titanium milling with thermal analysis",
        "Generate 5-axis toolpath for complex aerospace part with collision detection",
        "Extract and validate material properties from monolith database",
        "Build post processor for FANUC controller with custom M-codes",
        "Analyze chatter stability and predict tool wear for high-speed machining",
    ]
    
    print("\n" + "=" * 70)
    print("RUNNING OPTIMIZATION TESTS")
    print("=" * 70)
    
    results = []
    
    for i, task_desc in enumerate(test_tasks, 1):
        print(f"\n{'-' * 70}")
        print(f"TASK {i}: {task_desc[:60]}...")
        print(f"{'-' * 70}")
        
        task, result = engine.optimize(task_desc)
        
        print(f"\nRequired Capabilities: {', '.join(task.required_capabilities)}")
        print(f"Preferred Capabilities: {', '.join(task.preferred_capabilities)}")
        
        print(f"\nSELECTED RESOURCES:")
        print(f"  Skills ({len(result.skills)}):")
        for s in result.skills[:5]:
            print(f"    - {s.name}")
        if len(result.skills) > 5:
            print(f"    ... and {len(result.skills) - 5} more")
        
        print(f"  Agents ({len(result.agents)}):")
        for a in result.agents[:5]:
            print(f"    - {a.name}")
        if len(result.agents) > 5:
            print(f"    ... and {len(result.agents) - 5} more")
        
        print(f"  Engines ({len(result.engines)}):")
        for e in result.engines[:5]:
            print(f"    - {e.name}")
        if len(result.engines) > 5:
            print(f"    ... and {len(result.engines) - 5} more")
        
        print(f"  Formulas ({len(result.formulas)}):")
        for f in result.formulas[:3]:
            print(f"    - {f.name}")
        
        print(f"\nMETRICS:")
        print(f"  Total Score:         {result.total_score:.4f}")
        print(f"  Capability Coverage: {result.capability_coverage:.2%}")
        print(f"  Synergy Bonus:       {result.synergy_bonus:.2f}x")
        print(f"  Total Cost:          {result.total_cost:.2f}")
        
        results.append({
            "task": task_desc,
            "profile": {
                "required": list(task.required_capabilities),
                "preferred": list(task.preferred_capabilities)
            },
            "selection": result.to_dict()
        })
    
    # Save results
    output_path = os.path.join(REGISTRY_PATH, "ILP_TEST_RESULTS.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({"tests": results}, f, indent=2)
    
    print(f"\n{'=' * 70}")
    print("ILP ENGINE TEST COMPLETE")
    print(f"{'=' * 70}")
    print(f"\nResults saved to: {output_path}")
    
    return engine, results


if __name__ == "__main__":
    main()
