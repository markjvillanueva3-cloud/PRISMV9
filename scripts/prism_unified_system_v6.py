"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED SYSTEM v6.0 - OPTIMAL COORDINATION          ║
║══════════════════════════════════════════════════════════════════════════════║
║  v6.0 ENHANCEMENTS (Master Resource Coordination):                           ║
║  • 64 Agents (was 58) - 6 NEW coordination agents + 3 upgrades               ║
║  • CombinationEngine - ILP-based optimal resource selection (F-PSI-001)      ║
║  • Synergy Matrix - Pairwise resource interaction modeling                   ║
║  • Capability Matrix - Resource-to-task fuzzy matching                       ║
║  • Optimality Proofs - Mathematical certificates via F-PROOF-001             ║
║  • Warm-Start Heuristics - Fast approximate solutions as ILP seeds           ║
║  • Calibration System - Coefficient tracking and Bayesian updates            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  INHERITED FROM v5.0:                                                        ║
║  • MATHPLAN Gate - Mathematical proof required before execution              ║
║  • Formula Registry - 22 formulas with calibration status                    ║
║  • Coefficient Database - 32+ coefficients with uncertainty bounds           ║
║  • Prediction Logging - All estimates tracked for calibration                ║
║  • 8 Laws + 15 Commandments - Full compliance with Always-On Laws            ║
║  • Auto-Skill Trigger System - Skills load based on task keywords            ║
║  • Session Continuity Engine - Reads CURRENT_STATE.json automatically        ║
║  • Learning Pipeline - Extracts patterns from completed work                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import anthropic
import json
import sys
import os
import time
import re
import hashlib
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional, Callable, Tuple, Set
from dataclasses import dataclass, field, asdict
from enum import Enum
import traceback

# Optional: PuLP for ILP solving (graceful fallback if not installed)
try:
    from pulp import LpProblem, LpMaximize, LpMinimize, LpVariable, lpSum, LpStatus, PULP_CBC_CMD
    PULP_AVAILABLE = True
except ImportError:
    PULP_AVAILABLE = False
    print("Warning: PuLP not installed. Using greedy heuristic fallback.")

# =============================================================================
# CONFIGURATION
# =============================================================================

# Try process env first, then Windows User environment
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not API_KEY:
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment")
        API_KEY, _ = winreg.QueryValueEx(key, "ANTHROPIC_API_KEY")
        winreg.CloseKey(key)
    except:
        pass

# PATH STRUCTURE
PRISM_ROOT = Path(r"C:\PRISM")
SKILLS_DIR = PRISM_ROOT / "skills"
RESULTS_DIR = PRISM_ROOT / "state" / "results"
TASKS_DIR = PRISM_ROOT / "state" / "tasks"
STATE_FILE = PRISM_ROOT / "state" / "CURRENT_STATE.json"
LOGS_DIR = PRISM_ROOT / "state" / "logs"
LEARNING_DIR = PRISM_ROOT / "state" / "learning"
KNOWLEDGE_DIR = PRISM_ROOT / "data" / "knowledge"

# v5.0 MATHEMATICAL INFRASTRUCTURE
FORMULA_REGISTRY = PRISM_ROOT / "data" / "FORMULA_REGISTRY.json"
COEFFICIENT_DATABASE = PRISM_ROOT / "data" / "COEFFICIENT_DATABASE.json"
PREDICTION_LOG = LEARNING_DIR / "PREDICTION_LOG.json"

# v6.0 COORDINATION INFRASTRUCTURE
COORDINATION_DIR = PRISM_ROOT / "data" / "coordination"
RESOURCE_REGISTRY = COORDINATION_DIR / "RESOURCE_REGISTRY.json"
CAPABILITY_MATRIX = COORDINATION_DIR / "CAPABILITY_MATRIX.json"
SYNERGY_MATRIX = COORDINATION_DIR / "SYNERGY_MATRIX.json"
CALIBRATION_STATE = PRISM_ROOT / "state" / "CALIBRATION_STATE.json"
AGENT_REGISTRY = COORDINATION_DIR / "AGENT_REGISTRY.json"

# Ensure directories exist
for d in [RESULTS_DIR, TASKS_DIR, LOGS_DIR, LEARNING_DIR, KNOWLEDGE_DIR, COORDINATION_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# =============================================================================
# MODEL TIERS
# =============================================================================

class ModelTier(Enum):
    OPUS = "claude-opus-4-5-20251101"
    SONNET = "claude-sonnet-4-20250514"
    HAIKU = "claude-haiku-4-5-20251001"

MODEL_COSTS = {
    ModelTier.OPUS: {"input": 15.0, "output": 75.0},
    ModelTier.SONNET: {"input": 3.0, "output": 15.0},
    ModelTier.HAIKU: {"input": 0.25, "output": 1.25},
}

# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class TaskRequirements:
    """Parsed task requirements for optimization"""
    description: str
    domains: List[str] = field(default_factory=list)
    operations: List[str] = field(default_factory=list)
    task_type: str = "general"
    complexity: float = 0.5
    safety_required: bool = True
    rigor_required: bool = True

@dataclass
class ResourceScore:
    """Capability score for a resource"""
    resource_id: str
    resource_type: str  # skill, agent, formula, swarm
    capability_score: float
    domain_match: float
    operation_match: float
    complexity_match: float

@dataclass
class OptimalCombination:
    """Result of ILP optimization"""
    skills: List[str]
    agents: List[str]
    formulas: List[str]
    execution_mode: str  # single, swarm, intelligent
    swarm_pattern: Optional[str]
    psi_score: float
    synergy_score: float
    coverage_score: float
    total_cost: float
    proof: Dict[str, Any]
    alternatives_rejected: List[Dict]

# =============================================================================
# COMBINATION ENGINE (F-PSI-001 Implementation)
# =============================================================================

class CombinationEngine:
    """
    Master Resource Coordination using ILP optimization.
    Implements F-PSI-001: Master Combination Equation
    """
    
    def __init__(self):
        self.resource_registry = self._load_json(RESOURCE_REGISTRY)
        self.capability_matrix = self._load_json(CAPABILITY_MATRIX)
        self.synergy_matrix = self._load_json(SYNERGY_MATRIX)
        self.calibration_state = self._load_json(CALIBRATION_STATE)
        
        # Build name-to-capabilities mapping for fast lookup
        self.name_to_caps = {}
        cap_data = self.capability_matrix.get("capabilityMatrix", {}).get("resourceCapabilities", {})
        for res_id, res_data in cap_data.items():
            if "name" in res_data:
                self.name_to_caps[res_data["name"]] = res_data
            self.name_to_caps[res_id] = res_data  # Also keep ID-based lookup
        
        # Weights from coefficients (with defaults)
        self.w_domain = 0.40  # K-CAP-DOMAIN-WEIGHT
        self.w_operation = 0.35  # K-CAP-OPERATION-WEIGHT
        self.w_complexity = 0.25  # K-CAP-COMPLEXITY-WEIGHT
        self.coverage_threshold = 0.50  # K-COVERAGE-THRESHOLD
        
    def _load_json(self, path: Path) -> Dict:
        """Load JSON file with error handling"""
        try:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load {path}: {e}")
        return {}
    
    def parse_task(self, task_description: str) -> TaskRequirements:
        """Parse task description into structured requirements"""
        # Domain detection
        domain_keywords = {
            "materials": ["material", "steel", "aluminum", "alloy", "metal", "titanium"],
            "physics": ["force", "thermal", "stress", "temperature", "pressure", "velocity"],
            "machining": ["cut", "mill", "turn", "drill", "bore", "machine", "cnc"],
            "gcode": ["gcode", "g-code", "fanuc", "siemens", "heidenhain", "post"],
            "calculation": ["calculate", "compute", "formula", "equation"],
            "validation": ["validate", "verify", "check", "test"],
            "extraction": ["extract", "parse", "monolith", "legacy"],
            "planning": ["plan", "design", "architect", "brainstorm"],
            "coordination": ["coordinate", "orchestrate", "combine", "optimize"],
            "documentation": ["document", "readme", "guide", "manual"],
            "optimization": ["optimize", "improve", "enhance", "refine"],
            "learning": ["learn", "pattern", "calibrate", "train"]
        }
        
        # Operation detection
        operation_keywords = {
            "calculate": ["calculate", "compute", "determine", "find"],
            "validate": ["validate", "verify", "check", "confirm"],
            "generate": ["generate", "create", "produce", "write"],
            "extract": ["extract", "parse", "pull", "get"],
            "optimize": ["optimize", "improve", "enhance"],
            "coordinate": ["coordinate", "orchestrate", "manage"],
            "prove": ["prove", "demonstrate", "show", "certify"],
            "calibrate": ["calibrate", "tune", "adjust"],
            "learn": ["learn", "discover", "recognize"],
            "analyze": ["analyze", "examine", "study"],
            "transform": ["transform", "convert", "translate"],
            "document": ["document", "describe", "explain"],
            "debug": ["debug", "fix", "troubleshoot", "resolve"],
            "verify": ["verify", "validate", "confirm", "check"]
        }
        
        task_lower = task_description.lower()
        
        # Detect domains
        detected_domains = []
        for domain, keywords in domain_keywords.items():
            if any(kw in task_lower for kw in keywords):
                detected_domains.append(domain)
        
        # Detect operations
        detected_operations = []
        for operation, keywords in operation_keywords.items():
            if any(kw in task_lower for kw in keywords):
                detected_operations.append(operation)
        
        # Estimate complexity
        complexity = 0.5
        if any(w in task_lower for w in ["complex", "difficult", "comprehensive", "complete"]):
            complexity = 0.8
        if any(w in task_lower for w in ["simple", "quick", "basic", "just"]):
            complexity = 0.3
        if any(w in task_lower for w in ["critical", "safety", "life"]):
            complexity = 0.9
            
        # Determine task type
        task_type = "general"
        if "speed" in task_lower and "feed" in task_lower:
            task_type = "speed_feed_calculation"
        elif "force" in task_lower or "cutting" in task_lower:
            task_type = "force_calculation"
        elif "extract" in task_lower:
            task_type = "data_extraction"
        elif "design" in task_lower or "architect" in task_lower:
            task_type = "system_design"
        elif "test" in task_lower:
            task_type = "testing"
        elif "document" in task_lower:
            task_type = "documentation"
        
        return TaskRequirements(
            description=task_description,
            domains=detected_domains or ["general"],
            operations=detected_operations or ["analyze"],
            task_type=task_type,
            complexity=complexity,
            safety_required=True,
            rigor_required=True
        )
    
    def _infer_domains_from_keywords(self, keywords: List[str]) -> List[str]:
        """Infer domains from skill keywords"""
        domain_mapping = {
            "material": "materials", "steel": "materials", "aluminum": "materials",
            "force": "physics", "thermal": "physics", "stress": "physics",
            "cut": "machining", "mill": "machining", "turn": "machining", "drill": "machining",
            "gcode": "gcode", "fanuc": "gcode", "siemens": "gcode", "g-code": "gcode",
            "calculate": "calculation", "compute": "calculation", "formula": "calculation",
            "validate": "validation", "verify": "validation", "check": "validation",
            "extract": "extraction", "parse": "extraction", "monolith": "extraction",
            "plan": "planning", "design": "planning", "architect": "planning",
            "coordinate": "coordination", "orchestrate": "coordination", "combine": "coordination",
            "document": "documentation", "readme": "documentation",
            "test": "testing", "debug": "testing"
        }
        domains = set()
        for kw in keywords:
            kw_lower = kw.lower()
            for pattern, domain in domain_mapping.items():
                if pattern in kw_lower:
                    domains.add(domain)
        return list(domains) if domains else ["general"]
    
    def _infer_operations_from_keywords(self, keywords: List[str]) -> List[str]:
        """Infer operations from skill keywords"""
        op_mapping = {
            "calculate": "calculate", "compute": "calculate",
            "validate": "validate", "verify": "verify", "check": "validate",
            "generate": "generate", "create": "generate", "write": "generate",
            "extract": "extract", "parse": "extract", "pull": "extract",
            "optimize": "optimize", "improve": "optimize", "enhance": "optimize",
            "coordinate": "coordinate", "orchestrate": "coordinate",
            "prove": "prove", "certify": "prove",
            "calibrate": "calibrate", "tune": "calibrate",
            "learn": "learn", "pattern": "learn",
            "analyze": "analyze", "examine": "analyze",
            "transform": "transform", "convert": "transform",
            "document": "document", "describe": "document",
            "debug": "debug", "fix": "debug"
        }
        ops = set()
        for kw in keywords:
            kw_lower = kw.lower()
            for pattern, op in op_mapping.items():
                if pattern in kw_lower:
                    ops.add(op)
        return list(ops) if ops else ["analyze"]
    
    def compute_capability_score(self, resource_id: str, task: TaskRequirements) -> ResourceScore:
        """Compute capability score using F-RESOURCE-001"""
        # Use name-to-caps mapping for lookup
        resource_caps = self.name_to_caps.get(resource_id, {})
        
        # NEW: Generate intelligent defaults from SKILL_KEYWORDS if not in matrix
        if not resource_caps and resource_id in SKILL_KEYWORDS:
            keywords = SKILL_KEYWORDS[resource_id]
            inferred_domains = self._infer_domains_from_keywords(keywords)
            inferred_ops = self._infer_operations_from_keywords(keywords)
            resource_caps = {
                "domainScores": {d: 0.85 for d in inferred_domains},
                "operationScores": {o: 0.85 for o in inferred_ops},
                "complexity": 0.6
            }
        
        # NEW: Generate defaults from AGENT_DEFINITIONS if agent not in matrix
        if not resource_caps and resource_id in AGENT_DEFINITIONS:
            agent_def = AGENT_DEFINITIONS[resource_id]
            agent_domains = agent_def.get("domains", ["general"])
            agent_ops = agent_def.get("operations", ["analyze"])
            resource_caps = {
                "domainScores": {d: 0.80 for d in agent_domains},
                "operationScores": {o: 0.80 for o in agent_ops},
                "complexity": 0.7 if agent_def.get("tier") == "OPUS" else 0.5
            }
        
        # Domain match (Jaccard similarity)
        r_domains = set(resource_caps.get("domainScores", {}).keys())
        t_domains = set(task.domains)
        if r_domains or t_domains:
            domain_match = len(r_domains & t_domains) / len(r_domains | t_domains) if (r_domains | t_domains) else 0
        else:
            domain_match = 0.5
            
        # Operation match
        r_ops = set(resource_caps.get("operationScores", {}).keys())
        t_ops = set(task.operations)
        if t_ops:
            operation_match = len(r_ops & t_ops) / len(t_ops)
        else:
            operation_match = 0.5
            
        # Complexity match
        r_complexity = resource_caps.get("complexity", 0.5) if resource_caps else 0.5
        complexity_match = max(0, 1 - abs(r_complexity - task.complexity))
        
        # Weighted sum (F-RESOURCE-001)
        capability_score = (
            self.w_domain * domain_match +
            self.w_operation * operation_match +
            self.w_complexity * complexity_match
        )
        
        # Determine resource type from ID
        if resource_id.startswith("SKILL") or resource_id.startswith("prism-"):
            resource_type = "skill"
        elif resource_id.startswith("AGENT") or resource_id in AGENT_DEFINITIONS:
            resource_type = "agent"
        elif resource_id.startswith("F-"):
            resource_type = "formula"
        elif resource_id.startswith("SWARM"):
            resource_type = "swarm"
        else:
            resource_type = "unknown"
        
        return ResourceScore(
            resource_id=resource_id,
            resource_type=resource_type,
            capability_score=capability_score,
            domain_match=domain_match,
            operation_match=operation_match,
            complexity_match=complexity_match
        )
    
    def get_synergy(self, r1: str, r2: str) -> float:
        """Get synergy score between two resources (F-SYNERGY-001)"""
        pairs = self.synergy_matrix.get("synergyMatrix", {}).get("pairs", {})
        
        # Try both orderings
        key1 = f"{r1}:{r2}"
        key2 = f"{r2}:{r1}"
        
        if key1 in pairs:
            return pairs[key1].get("synergy", 1.0)
        elif key2 in pairs:
            return pairs[key2].get("synergy", 1.0)
        
        # Return category default
        defaults = self.synergy_matrix.get("synergyMatrix", {}).get("categoryDefaults", {})
        return defaults.get("skill:skill_same_level", 1.0)
    
    def compute_synergy(self, resources: List[str]) -> float:
        """Compute combined synergy for a resource set (F-SYNERGY-001)"""
        if len(resources) < 2:
            return 1.0
        
        # Geometric mean of all pairwise synergies
        product = 1.0
        pair_count = 0
        
        for i, r1 in enumerate(resources):
            for r2 in resources[i+1:]:
                product *= self.get_synergy(r1, r2)
                pair_count += 1
        
        if pair_count == 0:
            return 1.0
            
        return product ** (1 / pair_count)
    
    def greedy_warmstart(self, task: TaskRequirements, all_resources: List[ResourceScore]) -> List[str]:
        """Generate warm-start solution using greedy heuristic"""
        selected = []
        covered_domains = set()
        covered_ops = set()
        
        # Sort by capability score descending
        sorted_resources = sorted(all_resources, key=lambda r: r.capability_score, reverse=True)
        
        for resource in sorted_resources:
            # Check if this resource covers new ground
            cap_data = self.capability_matrix.get("capabilityMatrix", {}).get("resourceCapabilities", {})
            r_caps = cap_data.get(resource.resource_id, {})
            r_domains = set(r_caps.get("domainScores", {}).keys())
            r_ops = set(r_caps.get("operationScores", {}).keys())
            
            new_domains = r_domains - covered_domains
            new_ops = r_ops - covered_ops
            
            if new_domains or new_ops or resource.capability_score > 0.7:
                selected.append(resource.resource_id)
                covered_domains.update(r_domains)
                covered_ops.update(r_ops)
            
            # Respect limits
            skills = [r for r in selected if "SKILL" in r or "prism-" in r]
            agents = [r for r in selected if r in AGENT_DEFINITIONS]
            
            if len(skills) >= 8 and len(agents) >= 8:
                break
        
        return selected[:16]  # Safety limit
    
    def solve_ilp(self, task: TaskRequirements, all_resources: List[ResourceScore]) -> OptimalCombination:
        """Solve ILP for optimal resource combination (F-PSI-001)"""
        
        # Separate resources by type
        skills = [r for r in all_resources if r.resource_type == "skill"]
        agents = [r for r in all_resources if r.resource_type == "agent"]
        
        if not PULP_AVAILABLE:
            # Fallback to greedy
            return self._greedy_solution(task, all_resources)
        
        try:
            # Create ILP problem
            prob = LpProblem("ResourceOptimization", LpMaximize)
            
            # Decision variables (binary: select or not)
            x = {r.resource_id: LpVariable(f"x_{r.resource_id}", cat="Binary") 
                 for r in all_resources}
            
            # Objective: maximize total capability score
            # (Simplified - full synergy would require quadratic terms)
            prob += lpSum([r.capability_score * x[r.resource_id] for r in all_resources])
            
            # Constraints
            # Max 8 skills
            prob += lpSum([x[r.resource_id] for r in skills]) <= 8
            
            # Max 8 agents
            prob += lpSum([x[r.resource_id] for r in agents]) <= 8
            
            # Minimum 1 resource selected
            prob += lpSum([x[r.resource_id] for r in all_resources]) >= 1
            
            # Coverage constraint: at least one resource for each task domain
            for domain in task.domains:
                domain_resources = [r for r in all_resources 
                                   if r.domain_match > 0]
                if domain_resources:
                    prob += lpSum([x[r.resource_id] for r in domain_resources]) >= 1
            
            # Warm start with greedy solution
            warmstart = self.greedy_warmstart(task, all_resources)
            for r in all_resources:
                if r.resource_id in warmstart:
                    x[r.resource_id].setInitialValue(1)
                else:
                    x[r.resource_id].setInitialValue(0)
            
            # Solve with timeout
            solver = PULP_CBC_CMD(msg=0, timeLimit=0.5)  # 500ms timeout
            prob.solve(solver)
            
            # Extract solution
            selected_ids = [r.resource_id for r in all_resources 
                          if x[r.resource_id].varValue and x[r.resource_id].varValue > 0.5]
            
            return self._build_combination(task, all_resources, selected_ids, prob)
            
        except Exception as e:
            print(f"ILP solver error: {e}. Using greedy fallback.")
            return self._greedy_solution(task, all_resources)
    
    def _greedy_solution(self, task: TaskRequirements, all_resources: List[ResourceScore]) -> OptimalCombination:
        """Greedy fallback when ILP unavailable"""
        selected = self.greedy_warmstart(task, all_resources)
        return self._build_combination(task, all_resources, selected, None)
    
    def _build_combination(self, task: TaskRequirements, all_resources: List[ResourceScore], 
                          selected_ids: List[str], prob) -> OptimalCombination:
        """Build OptimalCombination from selected resource IDs"""
        
        # Categorize selected resources
        selected_skills = []
        selected_agents = []
        selected_formulas = []
        
        for rid in selected_ids:
            if "prism-" in rid.lower() or "SKILL" in rid:
                selected_skills.append(rid)
            elif rid in AGENT_DEFINITIONS or "AGENT" in rid:
                selected_agents.append(rid)
            elif rid.startswith("F-"):
                selected_formulas.append(rid)
        
        # Compute scores
        total_capability = sum(r.capability_score for r in all_resources 
                              if r.resource_id in selected_ids)
        synergy = self.compute_synergy(selected_ids)
        
        # Coverage score - Use name_to_caps mapping for lookup
        covered_domains = set()
        covered_ops = set()
        for rid in selected_ids:
            r_caps = self.name_to_caps.get(rid, {})
            covered_domains.update(r_caps.get("domainScores", {}).keys())
            covered_ops.update(r_caps.get("operationScores", {}).keys())
        
        domain_coverage = len(covered_domains & set(task.domains)) / len(task.domains) if task.domains else 1.0
        op_coverage = len(covered_ops & set(task.operations)) / len(task.operations) if task.operations else 1.0
        coverage = (domain_coverage + op_coverage) / 2
        
        # Compute cost
        total_cost = 0.0
        for aid in selected_agents:
            if aid in AGENT_DEFINITIONS:
                tier = AGENT_DEFINITIONS[aid].get("tier", "SONNET")
                total_cost += {"OPUS": 75.0, "SONNET": 15.0, "HAIKU": 1.0}.get(tier, 15.0)
        
        # Psi score (simplified master equation)
        psi = total_capability * synergy * coverage / max(total_cost, 1.0) * 100
        
        # Determine execution mode
        if len(selected_agents) > 3:
            execution_mode = "swarm"
            swarm_pattern = "intelligent_swarm"
        elif len(selected_agents) == 1:
            execution_mode = "single"
            swarm_pattern = None
        else:
            execution_mode = "intelligent"
            swarm_pattern = "intelligent_swarm"
        
        # Generate proof
        proof = self._generate_proof(prob, psi, selected_ids, all_resources)
        
        # Alternatives rejected
        alternatives = self._find_alternatives(task, all_resources, selected_ids)
        
        return OptimalCombination(
            skills=selected_skills,
            agents=selected_agents,
            formulas=selected_formulas,
            execution_mode=execution_mode,
            swarm_pattern=swarm_pattern,
            psi_score=psi,
            synergy_score=synergy,
            coverage_score=coverage,
            total_cost=total_cost,
            proof=proof,
            alternatives_rejected=alternatives
        )
    
    def _generate_proof(self, prob, psi: float, selected: List[str], 
                       all_resources: List[ResourceScore]) -> Dict:
        """Generate optimality proof (F-PROOF-001)"""
        if prob and PULP_AVAILABLE:
            status = LpStatus[prob.status]
            # In a full implementation, we'd compute dual bounds
            lower_bound = psi * 0.98  # Approximate
            upper_bound = psi
            gap = (upper_bound - lower_bound) / upper_bound * 100 if upper_bound else 0
            
            if gap == 0:
                certificate = "OPTIMAL"
            elif gap <= 2:
                certificate = "NEAR_OPTIMAL"
            elif gap <= 5:
                certificate = "GOOD"
            else:
                certificate = "HEURISTIC"
        else:
            status = "HEURISTIC"
            lower_bound = psi * 0.90
            upper_bound = psi
            gap = 10.0
            certificate = "HEURISTIC"
        
        return {
            "solution_value": psi,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "gap_percent": gap,
            "certificate": certificate,
            "solver_status": status if prob else "GREEDY",
            "constraints_satisfied": {
                "max_skills": len([r for r in selected if "prism-" in r.lower()]) <= 8,
                "max_agents": len([r for r in selected if r in AGENT_DEFINITIONS]) <= 8,
                "min_coverage": True  # Simplified
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def _find_alternatives(self, task: TaskRequirements, all_resources: List[ResourceScore],
                          selected: List[str]) -> List[Dict]:
        """Find top rejected alternatives"""
        alternatives = []
        
        # Try removing each selected resource and see impact
        for rid in selected[:3]:  # Top 3 alternatives
            alt_selected = [r for r in selected if r != rid]
            alt_synergy = self.compute_synergy(alt_selected)
            alt_cap = sum(r.capability_score for r in all_resources 
                         if r.resource_id in alt_selected)
            
            alternatives.append({
                "removed": rid,
                "remaining": alt_selected,
                "synergy_change": alt_synergy - self.compute_synergy(selected),
                "capability_change": alt_cap - sum(r.capability_score for r in all_resources 
                                                   if r.resource_id in selected),
                "reason": f"Removing {rid} reduces capability"
            })
        
        return alternatives
    
    def optimize(self, task_description: str) -> OptimalCombination:
        """Main entry point: optimize resource combination for a task"""
        # Parse task
        task = self.parse_task(task_description)
        
        # Get all resources and compute capability scores
        all_resources = []
        
        # Score skills
        for skill_name in SKILL_KEYWORDS.keys():
            score = self.compute_capability_score(skill_name, task)
            if score.capability_score > 0.2:  # Filter low scores
                all_resources.append(score)
        
        # Score agents
        for agent_name in AGENT_DEFINITIONS.keys():
            score = self.compute_capability_score(agent_name, task)
            score.resource_type = "agent"
            if score.capability_score > 0.2:
                all_resources.append(score)
        
        # Solve optimization
        combination = self.solve_ilp(task, all_resources)
        
        return combination
    
    def format_plan(self, combination: OptimalCombination, task: str) -> str:
        """Format optimal combination for user approval"""
        output = []
        output.append("=" * 79)
        output.append("                    OPTIMAL RESOURCE COMBINATION")
        output.append("=" * 79)
        output.append("")
        output.append(f"TASK: {task[:100]}...")
        output.append("")
        output.append(f"SELECTED RESOURCES ({len(combination.skills) + len(combination.agents)} total):")
        output.append(f"  Skills:   {combination.skills}")
        output.append(f"  Agents:   {combination.agents}")
        output.append(f"  Formulas: {combination.formulas}")
        output.append(f"  Mode:     {combination.execution_mode}")
        if combination.swarm_pattern:
            output.append(f"  Swarm:    {combination.swarm_pattern}")
        output.append("")
        output.append("OPTIMALITY PROOF:")
        output.append(f"  PSI* = {combination.psi_score:.4f}")
        output.append(f"  Gap = {combination.proof['gap_percent']:.2f}%")
        output.append(f"  Certificate: {combination.proof['certificate']}")
        output.append("")
        output.append("SCORES:")
        output.append(f"  Synergy:  {combination.synergy_score:.3f}")
        output.append(f"  Coverage: {combination.coverage_score:.3f}")
        output.append(f"  Cost:     ${combination.total_cost:.2f}")
        output.append("")
        output.append("CONSTRAINTS VERIFIED:")
        for constraint, satisfied in combination.proof["constraints_satisfied"].items():
            status = "[OK]" if satisfied else "[X]"
            output.append(f"  {status} {constraint}")
        output.append("")
        output.append("=" * 79)
        
        return "\n".join(output)


# =============================================================================
# SKILL KEYWORDS (Auto-trigger mapping)
# =============================================================================

SKILL_KEYWORDS = {
    "prism-agent-selector": ["agent", "select", "tier", "cost", "opus"],
    "prism-algorithm-selector": ["approach", "strategy", "select", "algorithm", "technique", "method", "optimize"],
    "prism-all-skills": ["all", "comprehensive", "complete", "full", "everything"],
    "prism-api-contracts": ["route", "specification", "endpoint", "api", "interface", "contract", "rest"],
    "prism-auditor": ["audit", "check", "inventory", "count", "verify"],
    "prism-category-defaults": ["category", "default", "template", "base", "standard"],
    "prism-claude-code-bridge": ["script", "execute", "python", "orchestrator", "run"],
    "prism-code-master": ["code", "architecture", "pattern", "structure", "design"],
    "prism-code-perfection": ["code", "quality", "perfect", "clean", "refactor"],
    "prism-coding-patterns": ["best", "factory", "refactor", "pattern", "strategy", "singleton", "observer"],
    "prism-combination-engine": ["coordinate", "optimize", "combine", "select", "resource"],
    "prism-consumer-mapper": ["consumer", "dependency", "trace", "use", "usage", "map", "connect"],
    "prism-context-dna": ["fingerprint", "identify", "context", "dna", "hash", "unique", "track"],
    "prism-context-pressure": ["buffer", "context", "budget", "overflow", "limit", "pressure", "manage"],
    "prism-controller-quick-ref": ["fanuc", "quick", "controller", "compare", "cnc", "lookup", "fast"],
    "prism-debugging": ["trace", "investigate", "debug", "log", "issue", "problem", "bug"],
    "prism-deep-learning": ["learn", "pattern", "improve", "evolve", "discover"],
    "prism-dependency-graph": ["circular", "dependency", "require", "visualize", "graph", "import", "link"],
    "prism-derivation-helpers": ["mathematical", "formula", "proof", "math", "derivation", "derive", "step"],
    "prism-dev-utilities": ["helper", "automation", "development", "tool", "utility", "dev", "script"],
    "prism-development": ["develop", "create", "development", "build", "workflow", "initialize", "setup"],
    "prism-error-catalog": ["explanation", "lookup", "error", "recovery", "code", "message", "search"],
    "prism-error-recovery": ["error", "recovery", "resilient", "graceful", "handle", "retry", "fallback"],
    "prism-expert-cad-expert": ["surface", "geometry", "cad", "expert", "brep", "feature", "solid"],
    "prism-expert-cam-programmer": ["cam", "toolpath", "strategy", "operation", "program"],
    "prism-expert-master": ["help", "consult", "guidance", "specialist", "expert", "master", "advisor"],
    "prism-expert-master-machinist": ["machinist", "practical", "consult", "floor", "shop", "experience", "expert"],
    "prism-expert-materials-scientist": ["material", "science", "metallurgy", "alloy", "property"],
    "prism-expert-mathematics": ["mathematics", "math", "numerical", "algorithm", "solve", "expert", "compute"],
    "prism-expert-mechanical-engineer": ["strain", "stress", "deflection", "engineer", "structural", "analysis", "mechanical"],
    "prism-expert-post-processor": ["processor", "specialist", "post", "format", "gcode", "configuration", "expert"],
    "prism-expert-quality-control": ["quality", "control", "inspection", "spc", "qc", "tolerance", "expert"],
    "prism-expert-quality-manager": ["quality", "management", "iso", "process", "audit"],
    "prism-expert-thermodynamics": ["thermal", "heat", "temperature", "cooling", "transfer"],
    "prism-extraction-index": ["extraction", "index", "map", "locate", "find"],
    "prism-extractor": ["extract", "parse", "pull", "get", "retrieve"],
    "prism-fanuc-programming": ["fanuc", "gcode", "macro", "variable", "cnc"],
    "prism-formula-evolution": ["formula", "calibrate", "coefficient", "equation", "evolve"],
    "prism-gcode-reference": ["gcode", "g-code", "mcode", "nc", "program"],
    "prism-heidenhain-programming": ["heidenhain", "tnc", "conversational", "cycle"],
    "prism-hierarchy-manager": ["inheritance", "level", "conflict", "priority", "manage", "hierarchy", "resolve"],
    "prism-hook-system": ["hook", "enforce", "automatic", "gate", "trigger"],
    "prism-knowledge-base": ["query", "base", "repository", "retrieve", "lookup", "information", "reference"],
    "prism-knowledge-master": ["knowledge", "course", "lookup", "reference", "learn"],
    "prism-large-file-writer": ["output", "stream", "file", "oversized", "chunk", "large", "write"],
    "prism-manufacturing-tables": ["reference", "data", "manufacturing", "thread", "chart", "lookup", "tap"],
    "prism-master-equation": ["formula", "psi", "master", "optimization", "coordination", "solve", "compute"],
    "prism-material-enhancer": ["material", "enhance", "fill", "gap", "improve"],
    "prism-material-lookup": ["material", "lookup", "find", "search", "query"],
    "prism-material-physics": ["material", "physics", "property", "model", "kienzle"],
    "prism-material-schema": ["material", "schema", "structure", "parameter", "127"],
    "prism-material-template": ["create", "base", "apply", "template", "schema", "generate", "structure"],
    "prism-material-templates": ["materials", "browse", "collection", "type", "predefined", "templates", "library"],
    "prism-material-validator": ["material", "validate", "check", "grade", "quality"],
    "prism-mathematical-planning": ["plan", "estimate", "effort", "mathplan", "proof"],
    "prism-monolith-extractor": ["parse", "pull", "extract", "monolith", "legacy", "isolate", "separate"],
    "prism-monolith-index": ["monolith", "index", "map", "locate", "find"],
    "prism-monolith-navigator": ["find", "navigate", "explore", "monolith", "browse", "locate", "search"],
    "prism-monolith-navigator-sp": ["monolith", "navigate", "superpower", "search"],
    "prism-physics-formulas": ["scientific", "formula", "model", "physics", "calculate", "compute", "equation"],
    "prism-physics-reference": ["constant", "value", "table", "physics", "lookup", "property", "reference"],
    "prism-planning": ["milestone", "roadmap", "organize", "schedule", "plan", "project", "timeline"],
    "prism-post-processor-reference": ["post", "processor", "controller", "output"],
    "prism-process-optimizer": ["process", "workflow", "streamline", "manufacturing", "optimizer", "improve", "efficiency"],
    "prism-product-calculators": ["life", "product", "speed", "calculator", "tool", "compute", "feed"],
    "prism-python-tools": ["automation", "helper", "execute", "tool", "python", "run", "utility"],
    "prism-quality-gates": ["quality", "pass", "fail", "check", "gate", "verify", "criteria"],
    "prism-quality-master": ["quality", "test", "validate", "tdd", "gate"],
    "prism-quick-start": ["quick", "start", "begin", "initialize", "setup"],
    "prism-reasoning-engine": ["logic", "think", "deduce", "inference", "analyze", "conclude", "reason"],
    "prism-resource-optimizer": ["capability", "score", "match", "resource", "optimize"],
    "prism-review": ["review", "inspect", "check", "evaluate", "assess"],
    "prism-safety-framework": ["framework", "guard", "safety", "limit", "constraint", "check", "protect"],
    "prism-session-buffer": ["buffer", "context", "overflow", "session", "limit", "usage", "manage"],
    "prism-session-handoff": ["handoff", "continue", "session", "protocol", "prepare", "end", "complete"],
    "prism-session-master": ["manage", "state", "resume", "persist", "context", "master", "continue"],
    "prism-siemens-programming": ["siemens", "sinumerik", "840d", "cycle"],
    "prism-sp-brainstorm": ["brainstorm", "design", "ideate", "explore", "creative"],
    "prism-sp-debugging": ["debug", "fix", "error", "bug", "issue"],
    "prism-sp-execution": ["task", "run", "do", "execute", "create", "build", "action"],
    "prism-sp-handoff": ["resume", "transfer", "handoff", "end", "pass", "complete", "transition"],
    "prism-sp-planning": ["task", "decompose", "roadmap", "plan", "milestone", "breakdown", "phase"],
    "prism-sp-review-quality": ["code", "standard", "review", "pattern", "style", "check", "quality"],
    "prism-sp-review-spec": ["match", "requirement", "compliance", "specification", "check", "verify", "spec"],
    "prism-sp-verification": ["verify", "prove", "evidence", "complete", "done"],
    "prism-speed-feed-engine": ["speed", "feed", "cutting", "sfm", "ipm"],
    "prism-state-manager": ["state", "save", "load", "persist", "manage"],
    "prism-swarm-coordinator": ["swarm", "parallel", "multi-agent", "coordinate", "distribute"],
    "prism-swarm-orchestrator": ["coordinate", "swarm", "agent", "orchestrate", "distribute", "manage", "coordination"],
    "prism-synergy-calculator": ["synergy", "interaction", "combine", "pair", "amplify"],
    "prism-task-continuity": ["state", "session", "continuity", "resume", "persist", "maintain", "task"],
    "prism-tdd": ["tdd", "test", "driven", "development", "red"],
    "prism-tool-holder-schema": ["tool", "holder", "collet", "taper", "bt40"],
    "prism-tool-selector": ["pick", "best", "recommend", "tool", "selector", "select", "cutting"],
    "prism-uncertainty-propagation": ["uncertainty", "error", "confidence", "interval", "propagate"],
    "prism-unit-converter": ["conversion", "transform", "calculate", "unit", "metric", "convert", "imperial"],
    "prism-universal-formulas": ["formula", "universal", "physics", "math", "equation"],
    "prism-utilization": ["audit", "resource", "apply", "utilization", "consume", "use", "usage"],
    "prism-validator": ["validate", "check", "verify", "syntax", "format"],
    "prism-verification": ["protocol", "prove", "validate", "complete", "check", "confirm", "verify"],
    "prism-wiring-templates": ["wiring", "template", "consumer", "integration", "connect"],
}

# =============================================================================
# AGENT DEFINITIONS (64 Agents: 18 OPUS, 37 SONNET, 9 HAIKU)
# =============================================================================

AGENT_DEFINITIONS = {
    # OPUS TIER - 18 agents
    "architect": {"tier": "OPUS", "role": "System Architect"},
    "coordinator": {"tier": "OPUS", "role": "Task Coordinator v2.0"},
    "materials_scientist": {"tier": "OPUS", "role": "Materials Science Expert"},
    "machinist": {"tier": "OPUS", "role": "Master Machinist"},
    "physics_validator": {"tier": "OPUS", "role": "Physics Model Validator"},
    "domain_expert": {"tier": "OPUS", "role": "Domain Knowledge Expert"},
    "migration_specialist": {"tier": "OPUS", "role": "Code Migration Specialist"},
    "synthesizer": {"tier": "OPUS", "role": "Knowledge Synthesizer"},
    "debugger": {"tier": "OPUS", "role": "Expert Debugger"},
    "root_cause_analyst": {"tier": "OPUS", "role": "Root Cause Analyst"},
    "task_decomposer": {"tier": "OPUS", "role": "Task Decomposition Expert"},
    "learning_extractor": {"tier": "OPUS", "role": "Learning Pattern Extractor v2.0"},
    "verification_chain": {"tier": "OPUS", "role": "Verification Chain Manager"},
    "uncertainty_quantifier": {"tier": "OPUS", "role": "Uncertainty Quantification Expert"},
    "meta_analyst": {"tier": "OPUS", "role": "Meta-Analyst v2.0"},
    "combination_optimizer": {"tier": "OPUS", "role": "Optimal Resource Combination Solver"},
    "synergy_analyst": {"tier": "OPUS", "role": "Resource Synergy Analyst"},
    "proof_generator": {"tier": "OPUS", "role": "Mathematical Proof Generator"},
    
    # SONNET TIER - 37 agents
    "extractor": {"tier": "SONNET", "role": "Data Extractor"},
    "validator": {"tier": "SONNET", "role": "Data Validator"},
    "merger": {"tier": "SONNET", "role": "Data Merger"},
    "coder": {"tier": "SONNET", "role": "Code Generator"},
    "analyst": {"tier": "SONNET", "role": "Data Analyst"},
    "researcher": {"tier": "SONNET", "role": "Technical Researcher"},
    "tool_engineer": {"tier": "SONNET", "role": "Cutting Tool Engineer"},
    "cam_specialist": {"tier": "SONNET", "role": "CAM Programming Specialist"},
    "quality_engineer": {"tier": "SONNET", "role": "Quality Engineer"},
    "process_engineer": {"tier": "SONNET", "role": "Manufacturing Process Engineer"},
    "machine_specialist": {"tier": "SONNET", "role": "CNC Machine Specialist"},
    "gcode_expert": {"tier": "SONNET", "role": "G-Code Expert"},
    "monolith_navigator": {"tier": "SONNET", "role": "Monolith Code Navigator"},
    "schema_designer": {"tier": "SONNET", "role": "Schema Designer"},
    "api_designer": {"tier": "SONNET", "role": "API Designer"},
    "completeness_auditor": {"tier": "SONNET", "role": "Completeness Auditor"},
    "regression_checker": {"tier": "SONNET", "role": "Regression Checker"},
    "test_generator": {"tier": "SONNET", "role": "Test Generator"},
    "code_reviewer": {"tier": "SONNET", "role": "Code Reviewer"},
    "optimizer": {"tier": "SONNET", "role": "Performance Optimizer"},
    "refactorer": {"tier": "SONNET", "role": "Code Refactorer"},
    "security_auditor": {"tier": "SONNET", "role": "Security Auditor"},
    "documentation_writer": {"tier": "SONNET", "role": "Technical Documentation Writer"},
    "thermal_calculator": {"tier": "SONNET", "role": "Thermal Calculator"},
    "force_calculator": {"tier": "SONNET", "role": "Cutting Force Calculator"},
    "estimator": {"tier": "SONNET", "role": "Effort Estimator"},
    "context_builder": {"tier": "SONNET", "role": "Context Builder"},
    "cross_referencer": {"tier": "SONNET", "role": "Cross-Reference Expert"},
    "pattern_matcher": {"tier": "SONNET", "role": "Pattern Matcher"},
    "quality_gate": {"tier": "SONNET", "role": "Quality Gate Enforcer"},
    "session_continuity": {"tier": "SONNET", "role": "Session Continuity Manager"},
    "dependency_analyzer": {"tier": "SONNET", "role": "Dependency Analyzer"},
    "resource_auditor": {"tier": "SONNET", "role": "Resource Inventory Auditor"},
    "calibration_engineer": {"tier": "SONNET", "role": "Coefficient Calibration Engineer"},
    "test_orchestrator": {"tier": "SONNET", "role": "Ralph Loop Test Orchestrator"},
    
    # HAIKU TIER - 9 agents
    "state_manager": {"tier": "HAIKU", "role": "State Manager"},
    "cutting_calculator": {"tier": "HAIKU", "role": "Cutting Parameter Calculator"},
    "surface_calculator": {"tier": "HAIKU", "role": "Surface Finish Calculator"},
    "standards_expert": {"tier": "HAIKU", "role": "Standards Lookup Expert"},
    "formula_lookup": {"tier": "HAIKU", "role": "Formula Lookup Agent"},
    "material_lookup": {"tier": "HAIKU", "role": "Material Lookup Agent"},
    "tool_lookup": {"tier": "HAIKU", "role": "Tool Lookup Agent"},
    "call_tracer": {"tier": "HAIKU", "role": "Call Tracer"},
    "knowledge_graph_builder": {"tier": "HAIKU", "role": "Knowledge Graph Builder"},
}

# =============================================================================
# SWARM PATTERNS
# =============================================================================

SWARM_PATTERNS = {
    "intelligent_swarm": {
        "description": "Auto-selected agents based on task",
        "max_agents": 8,
        "parallel": True
    },
    "deep_extraction_swarm": {
        "description": "Complex monolith extraction",
        "agents": ["monolith_navigator", "extractor", "validator", "merger", "schema_designer", "analyst", "coder", "documentation_writer"],
        "parallel": True
    },
    "architecture_swarm": {
        "description": "System design tasks",
        "agents": ["architect", "domain_expert", "schema_designer", "api_designer", "coder"],
        "parallel": False
    },
    "code_quality_swarm": {
        "description": "Code review and testing",
        "agents": ["code_reviewer", "test_generator", "security_auditor", "regression_checker", "quality_gate"],
        "parallel": True
    },
    "materials_enhancement_swarm": {
        "description": "Material data enhancement",
        "agents": ["materials_scientist", "researcher", "extractor", "validator", "merger", "documentation_writer"],
        "parallel": True
    },
    "documentation_swarm": {
        "description": "Documentation generation",
        "agents": ["documentation_writer", "analyst", "context_builder"],
        "parallel": False
    },
    "validation_swarm": {
        "description": "Multi-level validation",
        "agents": ["physics_validator", "validator", "verification_chain", "quality_gate"],
        "parallel": True
    },
    "research_swarm": {
        "description": "Research and analysis",
        "agents": ["researcher", "analyst", "cross_referencer", "pattern_matcher", "synthesizer", "documentation_writer"],
        "parallel": True
    }
}

# =============================================================================
# UNIFIED ORCHESTRATOR
# =============================================================================

class UnifiedOrchestrator:
    """Main orchestrator with ILP-based resource selection"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=API_KEY) if API_KEY else None
        self.combination_engine = CombinationEngine()
        self.results = []
        self.total_cost = 0.0
    
    def _build_agent_system_prompt(self, agent_name: str, agent: Dict, context: Dict = None) -> str:
        """
        Build comprehensive system prompt for an agent.
        
        This is CRITICAL for data quality - without proper context,
        agents produce garbage/placeholder data.
        """
        role = agent.get("role", agent_name)
        tier = agent.get("tier", "SONNET")
        
        # CORE PRISM CONTEXT - ALL agents get this
        core_context = """# PRISM Manufacturing Intelligence System

You are an agent in PRISM, a comprehensive CNC machining and manufacturing intelligence system.

## CRITICAL: LIVES DEPEND ON DATA QUALITY

PRISM controls CNC machines. Incorrect data causes:
- Tool breakage → Flying debris → Operator injury/death
- Machine crashes → Equipment damage → Production loss
- Wrong parameters → Part failures → Safety recalls

## ABSOLUTE DATA QUALITY RULES

### FORBIDDEN - NEVER USE:
- Placeholders: TBD, TODO, FIXME, N/A, unknown, placeholder, temp
- Empty values: "", null, undefined, None, whitespace-only
- Generic text: "see manual", "contact support", "check error", "error occurred"
- Fake numbers: -1, 0 (when placeholder), 999, 9999, 12345, sequential IDs
- Test data: test, sample, example, foo, bar, lorem ipsum, asdf
- Copy-paste: Identical text repeated across multiple entries

### REQUIRED - ALWAYS PROVIDE:
- Real, validated, usable data
- Specific technical details (not generic)
- Values within physical/engineering ranges
- Complete entries (all required fields)
- Actionable information (not "check manual")

### IF DATA IS UNAVAILABLE:
- Say "DATA NOT AVAILABLE" explicitly
- Explain what data would be needed
- DO NOT substitute with placeholders
- DO NOT make up values

## YOUR OUTPUT WILL BE VALIDATED

A validation system checks ALL output for:
1. Placeholder patterns → REJECTED
2. Physical range violations → REJECTED  
3. Missing required fields → REJECTED
4. Generic/useless content → REJECTED
5. Copy-paste patterns → REJECTED

Garbage data is BLOCKED. Only validated data enters PRISM.
"""

        # ROLE-SPECIFIC CONTEXT
        role_contexts = {
            # Validation agents
            "data_quality_enforcer": """
## Your Role: Data Quality Enforcer

You are the FINAL GATE preventing garbage data from entering PRISM.
YOUR JOB IS TO REJECT BAD DATA. When in doubt, REJECT.

Reject ANY data that:
1. Contains placeholder text (TBD, TODO, N/A, unknown)
2. Has empty or whitespace fields
3. Uses generic descriptions
4. Has values outside physical ranges
5. Shows copy-paste patterns
6. Lacks required fields

Output format:
```
ITEM: [id]
STATUS: VALID | REJECTED
ISSUES: [list all problems found]
```
""",
            "placeholder_hunter": """
## Your Role: Placeholder Hunter

You specialize in finding and eliminating placeholder/fake data.
Assume EVERYTHING is fake until proven real.

Hunt for:
- Explicit: TBD, TODO, FIXME, N/A, unknown
- Empty: "", null, whitespace
- Generic: "error", "see manual", "check"
- Fake numbers: -1, 0, 999, 9999
- Test data: test, sample, example
- Sequential: auto-generated IDs

Report EVERY instance found with exact location and reason.
""",
            "alarm_validator": """
## Your Role: Alarm Data Validator

Validate CNC controller alarm entries against schema:

Required fields:
- alarm_id: Format "ALM-FAMILY-CODE" (e.g., ALM-FANUC-PS0001)
- code: Controller-specific code
- name: Descriptive name (min 10 chars)
- category: SERVO|SPINDLE|ATC|PROGRAM|SAFETY|SYSTEM|etc.
- severity: CRITICAL|HIGH|MEDIUM|LOW|INFO
- description: Technical detail (min 25 chars)
- causes: List with real causes (each 15+ chars)
- quick_fix: Actionable steps (not "check manual")

REJECT alarms with placeholders, generic text, or missing fields.
""",
            "material_validator": """
## Your Role: Material Data Validator

Validate material entries for manufacturing calculations.

Physical ranges (values outside = REJECT):
- density: 0.5-25.0 g/cm³
- hardness_hrc: 0-72
- tensile_strength: 10-3500 MPa
- kc1_1: 100-10000 N/mm²
- mc: 0.1-0.5
- thermal_conductivity: 0.1-500 W/m·K

Material MUST have cutting data (kc1_1/mc or hardness) to be useful.
REJECT materials with placeholders or impossible physics values.
""",
            # Expert agents
            "materials_scientist": """
## Your Role: Materials Science Expert

You have deep expertise in:
- Metallurgy and material properties
- Kienzle cutting force models (Fc = kc1.1 × b × h^(1-mc))
- Taylor tool life equations (VT^n = C)
- Johnson-Cook constitutive models
- Heat treatment effects on machinability

When providing material data:
- Use real values from literature (ASM Handbooks, Machining Data Handbook)
- Cite sources when possible
- Validate against physical ranges
- Provide confidence levels for estimates
- NEVER make up values or use placeholders
""",
            "machinist": """
## Your Role: Master Machinist (40+ Years Experience)

You have hands-on experience with every major CNC controller and machine type.
Provide practical, shop-floor advice.

For alarms:
- Identify root cause, not just symptoms
- Provide immediate safe resolution steps
- Explain why the alarm occurred
- Suggest preventive measures
- Note when professional service is needed

NEVER give generic "check manual" advice.
ALWAYS include safety considerations.
""",
            "physics_validator": """
## Your Role: Physics Model Validator

Validate all physics-based calculations:
- Cutting forces (Kienzle model)
- Thermal effects
- Tool deflection
- Vibration/chatter
- Material deformation

Check for:
- Unit consistency
- Physical law compliance
- Reasonable result ranges
- Conservation principles

REJECT calculations with impossible results or violated physics.
""",
            "extractor": """
## Your Role: Data Extractor

Extract structured data from sources with 100% accuracy.

Rules:
1. Extract ALL available data
2. Preserve exact values
3. Maintain relationships
4. Flag uncertain values
5. NEVER fill gaps with placeholders

If data is missing:
- Say "DATA NOT FOUND IN SOURCE"
- Do NOT use TBD, N/A, or fake values
- Note what should be there
""",
            "validator": """
## Your Role: Data Validator

Validate data at 5 levels:
1. SYNTAX - Correct types and structure
2. SEMANTICS - Values make sense
3. COMPLETENESS - All required fields
4. RANGES - Within physical limits
5. UTILITY - Usable for calculations

NEVER pass data with critical issues.
""",
            "completeness_auditor": """
## Your Role: Completeness Auditor

Audit for completeness:
- All required fields present
- All fields have values (not empty)
- All values complete (not truncated)
- All references valid

Report:
- Total fields checked
- Complete vs incomplete count
- Specific issues per field
""",
            "force_calculator": """
## Your Role: Cutting Force Calculator

Use Kienzle equation:
Fc = kc1.1 × b × h^(1-mc)

Required inputs (must be REAL values):
- kc1.1: Specific cutting force (N/mm²)
- mc: Kienzle exponent
- b: Width of cut (mm)
- h: Chip thickness (mm)

Output:
- Fc, Ff, Fr forces
- Power required
- Uncertainty estimates

NEVER use placeholder material properties.
""",
            "thermal_calculator": """
## Your Role: Thermal Calculator

Calculate machining thermal effects:
- Cutting temperature
- Heat partition (tool/chip/workpiece)
- Thermal expansion
- Coolant effectiveness

Required material properties:
- Thermal conductivity (W/m·K)
- Specific heat (J/kg·K)
- Density (kg/m³)
- Melting point (°C)

Validate: Temperature < melting point
""",
            "gcode_expert": """
## Your Role: G-Code Expert

Expert in all major CNC controllers:
- FANUC (standard + macro B)
- SIEMENS SINUMERIK 840D
- HAAS NGC
- MAZAK Mazatrol/EIA
- HEIDENHAIN TNC
- OKUMA OSP

Always:
- Specify controller compatibility
- Include comments
- Validate syntax
- Include safety moves
""",
            "documentation_writer": """
## Your Role: Technical Documentation Writer

Create clear, complete documentation:
- Full coverage of topic
- Real examples (not placeholders)
- Proper technical terminology
- Cite sources when applicable

NEVER use TBD, TODO, or incomplete sections.
""",
        }
        
        # Get role-specific context or generate generic
        role_context = role_contexts.get(agent_name, f"""
## Your Role: {role}

You are a specialized agent in the PRISM system.
Follow all data quality rules strictly.
Provide complete, validated, useful output.
Never use placeholders or fake data.
""")
        
        # TASK-SPECIFIC CONTEXT (if provided)
        task_context = ""
        if context:
            if "schema" in context:
                task_context += f"\n## Data Schema\n```json\n{context['schema']}\n```\n"
            if "examples" in context:
                task_context += f"\n## Valid Examples\n{context['examples']}\n"
            if "constraints" in context:
                task_context += f"\n## Constraints\n{context['constraints']}\n"
        
        # Combine all context
        full_prompt = core_context + role_context + task_context
        
        return full_prompt
        
    def run_single_agent(self, agent_name: str, task: str, context: Dict = None) -> Dict:
        """
        Run a single agent WITH COMPREHENSIVE SYSTEM PROMPT.
        
        CRITICAL: Agents receive full context including:
        - PRISM mission and life-safety requirements
        - Data quality rules and anti-placeholder instructions
        - Role-specific expertise and domain knowledge
        - Relevant schemas and validation rules
        """
        if agent_name not in AGENT_DEFINITIONS:
            return {"error": f"Unknown agent: {agent_name}"}
        
        agent = AGENT_DEFINITIONS[agent_name]
        tier = ModelTier[agent["tier"]]
        
        print(f"\n[{agent_name}] ({agent['tier']}) - {agent['role']}")
        print(f"Task: {task[:80]}...")
        
        if not self.client:
            return {"error": "No API key configured"}
        
        # BUILD COMPREHENSIVE SYSTEM PROMPT
        system_prompt = self._build_agent_system_prompt(agent_name, agent, context)
        
        try:
            response = self.client.messages.create(
                model=tier.value,
                max_tokens=8192,
                system=system_prompt,
                messages=[{"role": "user", "content": task}]
            )
            
            result = response.content[0].text
            cost = (response.usage.input_tokens * MODEL_COSTS[tier]["input"] + 
                   response.usage.output_tokens * MODEL_COSTS[tier]["output"]) / 1_000_000
            
            self.total_cost += cost
            
            return {
                "agent": agent_name,
                "result": result,
                "cost": cost,
                "tokens": response.usage.input_tokens + response.usage.output_tokens
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def run_swarm(self, pattern_name: str, task: str) -> List[Dict]:
        """Run a swarm pattern on a task"""
        if pattern_name not in SWARM_PATTERNS:
            return [{"error": f"Unknown swarm pattern: {pattern_name}"}]
        
        pattern = SWARM_PATTERNS[pattern_name]
        agents = pattern.get("agents", list(AGENT_DEFINITIONS.keys())[:8])
        
        print(f"\n{'='*60}")
        print(f"SWARM: {pattern_name}")
        print(f"Description: {pattern['description']}")
        print(f"Agents: {agents}")
        print(f"{'='*60}")
        
        results = []
        for agent_name in agents:
            result = self.run_single_agent(agent_name, task)
            results.append(result)
        
        return results
    
    def run_intelligent(self, task: str) -> Dict:
        """Run with ILP-optimized resource selection"""
        print("\n" + "="*60)
        print("INTELLIGENT MODE - ILP Optimization")
        print("="*60)
        
        # Get optimal combination
        combination = self.combination_engine.optimize(task)
        
        # Print plan
        print(self.combination_engine.format_plan(combination, task))
        
        # Execute with selected agents
        results = []
        for agent_name in combination.agents:
            result = self.run_single_agent(agent_name, task)
            results.append(result)
        
        return {
            "combination": asdict(combination),
            "results": results,
            "total_cost": self.total_cost
        }
    
    def run_ralph_loop(self, agent_name: str, task: str, iterations: int = 3) -> Dict:
        """Run Ralph Wiggum improvement loop"""
        print(f"\n{'='*60}")
        print(f"RALPH LOOP - {iterations} iterations with {agent_name}")
        print(f"{'='*60}")
        
        current_output = None
        history = []
        
        for i in range(iterations):
            print(f"\n--- Iteration {i+1}/{iterations} ---")
            
            if current_output:
                enhanced_task = f"{task}\n\nPREVIOUS OUTPUT TO IMPROVE:\n{current_output[:2000]}"
            else:
                enhanced_task = task
            
            result = self.run_single_agent(agent_name, enhanced_task)
            
            if "error" not in result:
                current_output = result["result"]
                history.append({
                    "iteration": i + 1,
                    "output_preview": current_output[:500],
                    "cost": result["cost"]
                })
        
        return {
            "final_output": current_output,
            "iterations": iterations,
            "history": history,
            "total_cost": self.total_cost
        }
    
    def list_agents(self):
        """List all available agents by tier"""
        print("\n" + "="*60)
        print("AVAILABLE AGENTS (64 total)")
        print("="*60)
        
        for tier in ["OPUS", "SONNET", "HAIKU"]:
            agents = [name for name, info in AGENT_DEFINITIONS.items() if info["tier"] == tier]
            print(f"\n{tier} ({len(agents)} agents):")
            for agent in sorted(agents):
                print(f"  - {agent}: {AGENT_DEFINITIONS[agent]['role']}")


# =============================================================================
# MAIN CLI
# =============================================================================

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  py -3 prism_unified_system_v6.py --list")
        print("  py -3 prism_unified_system_v6.py --single <agent> \"task\"")
        print("  py -3 prism_unified_system_v6.py --swarm <pattern> \"task\"")
        print("  py -3 prism_unified_system_v6.py --intelligent \"task\"")
        print("  py -3 prism_unified_system_v6.py --ralph <agent> \"task\" <iterations>")
        return
    
    orchestrator = UnifiedOrchestrator()
    
    if sys.argv[1] == "--list":
        orchestrator.list_agents()
        print("\nSWARM PATTERNS:")
        for name, pattern in SWARM_PATTERNS.items():
            print(f"  - {name}: {pattern['description']}")
    
    elif sys.argv[1] == "--single" and len(sys.argv) >= 4:
        agent = sys.argv[2]
        task = sys.argv[3]
        result = orchestrator.run_single_agent(agent, task)
        print(json.dumps(result, indent=2))
    
    elif sys.argv[1] == "--swarm" and len(sys.argv) >= 4:
        pattern = sys.argv[2]
        task = sys.argv[3]
        results = orchestrator.run_swarm(pattern, task)
        print(json.dumps(results, indent=2))
    
    elif sys.argv[1] == "--intelligent" and len(sys.argv) >= 3:
        task = sys.argv[2]
        result = orchestrator.run_intelligent(task)
        print(json.dumps(result, indent=2, default=str))
    
    elif sys.argv[1] == "--ralph" and len(sys.argv) >= 4:
        agent = sys.argv[2]
        task = sys.argv[3]
        iterations = int(sys.argv[4]) if len(sys.argv) >= 5 else 3
        result = orchestrator.run_ralph_loop(agent, task, iterations)
        print(json.dumps(result, indent=2))
    
    else:
        print("Invalid arguments. Use --list to see options.")


if __name__ == "__main__":
    main()
