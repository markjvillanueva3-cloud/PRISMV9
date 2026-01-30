"""
PRISM Regression Tests v1.0
Anti-regression verification for databases, formulas, and infrastructure
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple

PRISM_ROOT = Path(r"C:\PRISM")

# Test results
class TestResult:
    def __init__(self, name: str, passed: bool, details: str = ""):
        self.name = name
        self.passed = passed
        self.details = details
        self.timestamp = datetime.now().isoformat()


def test_resource_registry() -> TestResult:
    """Verify RESOURCE_REGISTRY.json has required structure and counts"""
    path = PRISM_ROOT / "data" / "coordination" / "RESOURCE_REGISTRY.json"
    
    try:
        with open(path) as f:
            data = json.load(f)
        
        registry = data.get("resourceRegistry", {})
        metadata = registry.get("metadata", {})
        
        # Check minimum counts
        expected_skills = 99
        expected_agents = 64
        expected_formulas = 22
        
        # Get resources from correct path in JSON structure
        resources = registry.get("resources", {})
        actual_skills = resources.get("skills", {}).get("count", 0)
        actual_agents = resources.get("agents", {}).get("count", 0)
        actual_formulas = resources.get("formulas", {}).get("count", 0)
        
        if actual_skills < expected_skills:
            return TestResult("resource_registry", False, 
                f"Skills count {actual_skills} < expected {expected_skills}")
        if actual_agents < expected_agents:
            return TestResult("resource_registry", False,
                f"Agents count {actual_agents} < expected {expected_agents}")
        if actual_formulas < expected_formulas:
            return TestResult("resource_registry", False,
                f"Formulas count {actual_formulas} < expected {expected_formulas}")
        
        return TestResult("resource_registry", True, 
            f"Skills:{actual_skills}, Agents:{actual_agents}, Formulas:{actual_formulas}")
    
    except Exception as e:
        return TestResult("resource_registry", False, f"Error: {str(e)}")


def test_formula_registry() -> TestResult:
    """Verify FORMULA_REGISTRY.json has all required formulas"""
    path = PRISM_ROOT / "data" / "FORMULA_REGISTRY.json"
    
    required_formulas = [
        "F-PLAN-001", "F-PLAN-002", "F-PLAN-003", "F-PLAN-004", "F-PLAN-005",
        "F-MAT-001", "F-MAT-002",
        "F-QUAL-001", "F-QUAL-002", "F-QUAL-003",
        "F-PHYS-001", "F-PHYS-002", "F-PHYS-003",
        "F-PSI-001", "F-RESOURCE-001", "F-SYNERGY-001", "F-COVERAGE-001",
        "F-SWARM-001", "F-AGENT-001", "F-PROOF-001", "F-VERIFY-001"
    ]
    
    try:
        with open(path) as f:
            data = json.load(f)
        
        registry = data.get("formulaRegistry", {})
        formulas = registry.get("formulas", {})
        missing = [f for f in required_formulas if f not in formulas]
        
        if missing:
            return TestResult("formula_registry", False, f"Missing formulas: {missing}")
        
        return TestResult("formula_registry", True, f"{len(formulas)} formulas present")
    
    except Exception as e:
        return TestResult("formula_registry", False, f"Error: {str(e)}")


def test_capability_matrix() -> TestResult:
    """Verify CAPABILITY_MATRIX.json has resource capability scores"""
    path = PRISM_ROOT / "data" / "coordination" / "CAPABILITY_MATRIX.json"
    
    try:
        with open(path) as f:
            data = json.load(f)
        
        matrix = data.get("capabilityMatrix", {})
        resources = matrix.get("resourceCapabilities", {})
        
        if len(resources) < 20:
            return TestResult("capability_matrix", False, 
                f"Only {len(resources)} resources, expected 20+")
        
        # Check structure
        sample = list(resources.values())[0] if resources else {}
        required_keys = ["domainScores", "operationScores"]
        missing = [k for k in required_keys if k not in sample]
        
        if missing:
            return TestResult("capability_matrix", False, f"Missing keys in resource: {missing}")
        
        return TestResult("capability_matrix", True, f"{len(resources)} resources with capabilities")
    
    except Exception as e:
        return TestResult("capability_matrix", False, f"Error: {str(e)}")


def test_synergy_matrix() -> TestResult:
    """Verify SYNERGY_MATRIX.json has pairwise synergy data"""
    path = PRISM_ROOT / "data" / "coordination" / "SYNERGY_MATRIX.json"
    
    try:
        with open(path) as f:
            data = json.load(f)
        
        matrix = data.get("synergyMatrix", {})
        pairs = matrix.get("pairs", {})
        
        min_pairs = 90  # Updated: expanded to 92+ pairs
        if len(pairs) < min_pairs:
            return TestResult("synergy_matrix", False,
                f"Only {len(pairs)} pairs, expected {min_pairs}+")
        
        # Check structure
        sample = list(pairs.values())[0] if pairs else {}
        if "synergy" not in sample:
            return TestResult("synergy_matrix", False, "Missing 'synergy' field in pairs")
        
        # Check synergy values in valid range [0, 2]
        invalid = [k for k, v in pairs.items() 
                   if not (0 <= v.get("synergy", -1) <= 2)]
        if invalid:
            return TestResult("synergy_matrix", False, f"Invalid synergy values: {invalid[:3]}")
        
        return TestResult("synergy_matrix", True, f"{len(pairs)} synergy pairs")
    
    except Exception as e:
        return TestResult("synergy_matrix", False, f"Error: {str(e)}")


def test_skills_exist() -> TestResult:
    """Verify all 6 new skills have SKILL.md files"""
    required_skills = [
        ("level0-always-on", "prism-combination-engine"),
        ("level1-cognitive", "prism-swarm-coordinator"),
        ("level1-cognitive", "prism-resource-optimizer"),
        ("level1-cognitive", "prism-agent-selector"),
        ("level1-cognitive", "prism-synergy-calculator"),
        ("level2-workflow", "prism-claude-code-bridge"),
    ]
    
    missing = []
    for level, skill in required_skills:
        path = PRISM_ROOT / "skills" / level / skill / "SKILL.md"
        if not path.exists():
            missing.append(f"{level}/{skill}")
    
    if missing:
        return TestResult("skills_exist", False, f"Missing skills: {missing}")
    
    return TestResult("skills_exist", True, f"All {len(required_skills)} new skills present")


def test_orchestrator_v6() -> TestResult:
    """Verify prism_unified_system_v6.py exists and has key components"""
    path = PRISM_ROOT / "scripts" / "prism_unified_system_v6.py"
    
    if not path.exists():
        return TestResult("orchestrator_v6", False, "File not found")
    
    try:
        content = path.read_text(encoding='utf-8')
        
        required_components = [
            "class CombinationEngine",
            "class UnifiedOrchestrator",
            "def optimize",
            "def solve_ilp",
            "AGENT_DEFINITIONS",
            "def main()"
        ]
        
        missing = [c for c in required_components if c not in content]
        
        if missing:
            return TestResult("orchestrator_v6", False, f"Missing components: {missing}")
        
        # Check file size (should be substantial)
        if len(content) < 30000:
            return TestResult("orchestrator_v6", False, 
                f"File too small ({len(content)} bytes), expected 30KB+")
        
        return TestResult("orchestrator_v6", True, 
            f"{len(content)} bytes, all components present")
    
    except Exception as e:
        return TestResult("orchestrator_v6", False, f"Error: {str(e)}")


def test_agent_registry() -> TestResult:
    """Verify AGENT_REGISTRY.json has new agents"""
    path = PRISM_ROOT / "data" / "coordination" / "AGENT_REGISTRY.json"
    
    required_new_agents = [
        "combination_optimizer", "synergy_analyst", "proof_generator",
        "resource_auditor", "calibration_engineer", "test_orchestrator"
    ]
    
    try:
        with open(path) as f:
            data = json.load(f)
        
        new_agents = data.get("agentRegistry", {}).get("newAgents", {})
        missing = [a for a in required_new_agents if a not in new_agents]
        
        if missing:
            return TestResult("agent_registry", False, f"Missing agents: {missing}")
        
        return TestResult("agent_registry", True, f"All {len(required_new_agents)} new agents present")
    
    except Exception as e:
        return TestResult("agent_registry", False, f"Error: {str(e)}")


def run_all_tests() -> Dict[str, Any]:
    """Run all regression tests and return summary"""
    tests = [
        test_resource_registry,
        test_formula_registry,
        test_capability_matrix,
        test_synergy_matrix,
        test_skills_exist,
        test_orchestrator_v6,
        test_agent_registry,
    ]
    
    results = []
    passed = 0
    failed = 0
    
    print("\n" + "="*60)
    print("PRISM REGRESSION TEST SUITE")
    print("="*60 + "\n")
    
    for test_fn in tests:
        result = test_fn()
        results.append({
            "name": result.name,
            "passed": result.passed,
            "details": result.details,
            "timestamp": result.timestamp
        })
        
        status = "✓ PASS" if result.passed else "✗ FAIL"
        print(f"[{status}] {result.name}: {result.details}")
        
        if result.passed:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "-"*60)
    print(f"RESULTS: {passed} passed, {failed} failed, {len(tests)} total")
    print("-"*60)
    
    return {
        "summary": {
            "passed": passed,
            "failed": failed,
            "total": len(tests),
            "success_rate": passed / len(tests) if tests else 0
        },
        "results": results,
        "timestamp": datetime.now().isoformat()
    }


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--json":
        results = run_all_tests()
        print(json.dumps(results, indent=2))
    else:
        run_all_tests()


if __name__ == "__main__":
    main()
