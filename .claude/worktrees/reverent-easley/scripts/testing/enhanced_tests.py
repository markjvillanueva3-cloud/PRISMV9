"""
PRISM Enhanced Test Suite v2.0
Includes: PSI validation, proof certificates, edge cases, constraints, performance, memory
"""

import json
import sys
import time
import tracemalloc
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

PRISM_ROOT = Path(r"C:\PRISM")
sys.path.insert(0, str(PRISM_ROOT / "scripts"))

from prism_unified_system_v6 import CombinationEngine, SKILL_KEYWORDS, AGENT_DEFINITIONS

# =============================================================================
# PHASE 5: PSI SCORE VALIDATION
# =============================================================================

def test_psi_score_bounds() -> Dict:
    """Test that PSI scores are in valid ranges"""
    print("\n" + "="*60)
    print("PHASE 5: PSI SCORE VALIDATION")
    print("="*60)
    
    engine = CombinationEngine()
    test_cases = [
        "Calculate speed and feed for aluminum",
        "Extract module from monolith",
        "Design new architecture",
        "Validate all materials",
        "Complex multi-domain task with optimization and learning"
    ]
    
    results = []
    for task in test_cases:
        combo = engine.optimize(task)
        
        # PSI should be positive
        psi_positive = combo.psi_score >= 0
        
        # Coverage should be 0-1
        coverage_valid = 0 <= combo.coverage_score <= 1
        
        # Synergy should be 0.5-2.0 (reasonable range)
        synergy_valid = 0.5 <= combo.synergy_score <= 2.0
        
        # Cost should be positive
        cost_valid = combo.total_cost >= 0
        
        passed = psi_positive and coverage_valid and synergy_valid and cost_valid
        
        status = "[OK]" if passed else "[X]"
        print(f"  {status} PSI={combo.psi_score:.2f}, Cov={combo.coverage_score:.2f}, "
              f"Syn={combo.synergy_score:.2f}, Cost=${combo.total_cost:.0f}")
        
        results.append({
            "task": task[:40],
            "psi_score": combo.psi_score,
            "coverage": combo.coverage_score,
            "synergy": combo.synergy_score,
            "cost": combo.total_cost,
            "passed": passed
        })
    
    passed = sum(1 for r in results if r["passed"])
    return {"passed": passed, "failed": len(results) - passed, "total": len(results), "results": results}


# =============================================================================
# PHASE 6: PROOF CERTIFICATE VALIDATION
# =============================================================================

def test_proof_certificates() -> Dict:
    """Test that proof certificates are valid"""
    print("\n" + "="*60)
    print("PHASE 6: PROOF CERTIFICATE VALIDATION")
    print("="*60)
    
    engine = CombinationEngine()
    valid_certificates = ["OPTIMAL", "NEAR_OPTIMAL", "GOOD", "HEURISTIC"]
    
    test_tasks = [
        "Simple calculation task",
        "Complex optimization across multiple domains",
        "Material extraction with validation"
    ]
    
    results = []
    for task in test_tasks:
        combo = engine.optimize(task)
        proof = combo.proof
        
        # Check certificate is valid type
        cert_valid = proof.get("certificate") in valid_certificates
        
        # Check bounds are sensible
        bounds_valid = proof.get("lower_bound", 0) <= proof.get("upper_bound", float("inf"))
        
        # Check gap is non-negative percentage
        gap_valid = 0 <= proof.get("gap_percent", 0) <= 100
        
        # Check constraints
        constraints = proof.get("constraints_satisfied", {})
        constraints_valid = all(constraints.values()) if constraints else False
        
        passed = cert_valid and bounds_valid and gap_valid and constraints_valid
        
        status = "[OK]" if passed else "[X]"
        print(f"  {status} Certificate: {proof.get('certificate')}, "
              f"Gap: {proof.get('gap_percent', 0):.1f}%")
        
        results.append({
            "task": task[:40],
            "certificate": proof.get("certificate"),
            "gap": proof.get("gap_percent"),
            "passed": passed
        })
    
    passed = sum(1 for r in results if r["passed"])
    return {"passed": passed, "failed": len(results) - passed, "total": len(results), "results": results}


# =============================================================================
# PHASE 7: EDGE CASE TESTING
# =============================================================================

def test_edge_cases() -> Dict:
    """Test edge cases and error handling"""
    print("\n" + "="*60)
    print("PHASE 7: EDGE CASE TESTING")
    print("="*60)
    
    engine = CombinationEngine()
    results = []
    
    # Test 1: Empty task
    try:
        combo = engine.optimize("")
        passed = combo is not None and combo.psi_score >= 0
        print(f"  [{'OK' if passed else 'X'}] Empty task: PSI={combo.psi_score:.2f}")
        results.append({"case": "empty_task", "passed": passed})
    except Exception as e:
        print(f"  [X] Empty task: Exception - {e}")
        results.append({"case": "empty_task", "passed": False, "error": str(e)})
    
    # Test 2: Very long task
    try:
        long_task = "Calculate " + "very complex " * 50 + "optimization"
        combo = engine.optimize(long_task)
        passed = combo is not None and combo.psi_score >= 0
        print(f"  [{'OK' if passed else 'X'}] Long task: PSI={combo.psi_score:.2f}")
        results.append({"case": "long_task", "passed": passed})
    except Exception as e:
        print(f"  [X] Long task: Exception - {e}")
        results.append({"case": "long_task", "passed": False, "error": str(e)})
    
    # Test 3: Unknown domain keywords
    try:
        combo = engine.optimize("xyzzy foobar quux baz")
        passed = combo is not None
        print(f"  [{'OK' if passed else 'X'}] Unknown domains: PSI={combo.psi_score:.2f}")
        results.append({"case": "unknown_domains", "passed": passed})
    except Exception as e:
        print(f"  [X] Unknown domains: Exception - {e}")
        results.append({"case": "unknown_domains", "passed": False, "error": str(e)})
    
    # Test 4: Special characters
    try:
        combo = engine.optimize("Calculate speed/feed for Al-6061-T6 (25% coolant)")
        passed = combo is not None and combo.psi_score >= 0
        print(f"  [{'OK' if passed else 'X'}] Special chars: PSI={combo.psi_score:.2f}")
        results.append({"case": "special_chars", "passed": passed})
    except Exception as e:
        print(f"  [X] Special chars: Exception - {e}")
        results.append({"case": "special_chars", "passed": False, "error": str(e)})
    
    # Test 5: Unicode
    try:
        combo = engine.optimize("Calculate Ψ with uncertainty σ = ±0.5")
        passed = combo is not None
        print(f"  [{'OK' if passed else 'X'}] Unicode: PSI={combo.psi_score:.2f}")
        results.append({"case": "unicode", "passed": passed})
    except Exception as e:
        print(f"  [X] Unicode: Exception - {e}")
        results.append({"case": "unicode", "passed": False, "error": str(e)})
    
    passed = sum(1 for r in results if r.get("passed", False))
    return {"passed": passed, "failed": len(results) - passed, "total": len(results), "results": results}


# =============================================================================
# PHASE 8: CONSTRAINT VALIDATION
# =============================================================================

def test_constraint_enforcement() -> Dict:
    """Test that constraints are properly enforced"""
    print("\n" + "="*60)
    print("PHASE 8: CONSTRAINT ENFORCEMENT")
    print("="*60)
    
    engine = CombinationEngine()
    results = []
    
    # Test various complexity levels
    test_tasks = [
        "Simple lookup",
        "Medium complexity optimization with validation",
        "Highly complex multi-domain coordination swarm optimization learning"
    ]
    
    for task in test_tasks:
        combo = engine.optimize(task)
        
        # Max skills constraint
        skills_ok = len(combo.skills) <= 8
        
        # Max agents constraint  
        agents_ok = len(combo.agents) <= 8
        
        # At least one resource selected
        min_resources = len(combo.skills) + len(combo.agents) >= 1
        
        passed = skills_ok and agents_ok and min_resources
        
        status = "[OK]" if passed else "[X]"
        print(f"  {status} Skills={len(combo.skills)}/8, Agents={len(combo.agents)}/8")
        
        results.append({
            "task": task[:40],
            "skills": len(combo.skills),
            "agents": len(combo.agents),
            "passed": passed
        })
    
    passed = sum(1 for r in results if r["passed"])
    return {"passed": passed, "failed": len(results) - passed, "total": len(results), "results": results}


# =============================================================================
# PHASE 9: PERFORMANCE BENCHMARKS
# =============================================================================

def test_performance_benchmarks() -> Dict:
    """Test optimization performance"""
    print("\n" + "="*60)
    print("PHASE 9: PERFORMANCE BENCHMARKS")
    print("="*60)
    
    engine = CombinationEngine()
    results = []
    
    # Benchmark tasks of varying complexity
    benchmark_tasks = [
        ("simple", "Calculate speed"),
        ("medium", "Extract and validate material data from monolith"),
        ("complex", "Design comprehensive architecture with multi-agent coordination optimization")
    ]
    
    # Target: <500ms for simple, <1000ms for medium, <2000ms for complex
    targets = {"simple": 0.5, "medium": 1.0, "complex": 2.0}
    
    for complexity, task in benchmark_tasks:
        times = []
        for _ in range(5):  # Run 5 times
            start = time.perf_counter()
            engine.optimize(task)
            elapsed = time.perf_counter() - start
            times.append(elapsed)
        
        avg_time = sum(times) / len(times)
        target = targets[complexity]
        passed = avg_time < target
        
        status = "[OK]" if passed else "[X]"
        print(f"  {status} {complexity}: {avg_time*1000:.1f}ms (target <{target*1000:.0f}ms)")
        
        results.append({
            "complexity": complexity,
            "avg_time_ms": avg_time * 1000,
            "target_ms": target * 1000,
            "passed": passed
        })
    
    passed = sum(1 for r in results if r["passed"])
    return {"passed": passed, "failed": len(results) - passed, "total": len(results), "results": results}


# =============================================================================
# PHASE 10: MEMORY USAGE
# =============================================================================

def test_memory_usage() -> Dict:
    """Test memory usage during optimization"""
    print("\n" + "="*60)
    print("PHASE 10: MEMORY USAGE")
    print("="*60)
    
    results = []
    
    # Test memory for engine initialization
    tracemalloc.start()
    engine = CombinationEngine()
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    
    init_passed = peak < 50 * 1024 * 1024  # <50MB for init
    status = "[OK]" if init_passed else "[X]"
    print(f"  {status} Init: current={current/1024/1024:.1f}MB, peak={peak/1024/1024:.1f}MB")
    results.append({"phase": "init", "peak_mb": peak/1024/1024, "passed": init_passed})
    
    # Test memory for optimization
    tracemalloc.start()
    for _ in range(10):
        engine.optimize("Complex multi-domain optimization task")
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    
    opt_passed = peak < 100 * 1024 * 1024  # <100MB for 10 optimizations
    status = "[OK]" if opt_passed else "[X]"
    print(f"  {status} 10 optimizations: peak={peak/1024/1024:.1f}MB")
    results.append({"phase": "optimization_x10", "peak_mb": peak/1024/1024, "passed": opt_passed})
    
    passed = sum(1 for r in results if r["passed"])
    return {"passed": passed, "failed": len(results) - passed, "total": len(results), "results": results}


# =============================================================================
# MAIN RUNNER
# =============================================================================

def run_enhanced_suite() -> Dict:
    """Run all enhanced tests"""
    print("\n")
    print("╔" + "═"*68 + "╗")
    print("║" + " "*12 + "PRISM ENHANCED TEST SUITE v2.0" + " "*12 + "          ║")
    print("╚" + "═"*68 + "╝")
    
    results = {
        "suite_name": "PRISM Enhanced Tests v2.0",
        "started": datetime.now().isoformat(),
        "phases": {}
    }
    
    # Run all test phases
    results["phases"]["psi_validation"] = test_psi_score_bounds()
    results["phases"]["proof_certificates"] = test_proof_certificates()
    results["phases"]["edge_cases"] = test_edge_cases()
    results["phases"]["constraints"] = test_constraint_enforcement()
    results["phases"]["performance"] = test_performance_benchmarks()
    results["phases"]["memory"] = test_memory_usage()
    
    # Summary
    total_passed = sum(p.get("passed", 0) for p in results["phases"].values())
    total_failed = sum(p.get("failed", 0) for p in results["phases"].values())
    
    results["summary"] = {
        "total_passed": total_passed,
        "total_failed": total_failed,
        "success_rate": total_passed / (total_passed + total_failed) if (total_passed + total_failed) > 0 else 0
    }
    
    print("\n" + "="*60)
    print("ENHANCED SUITE SUMMARY")
    print("="*60)
    print(f"  Total Passed:  {total_passed}")
    print(f"  Total Failed:  {total_failed}")
    print(f"  Success Rate:  {results['summary']['success_rate']*100:.1f}%")
    print("="*60)
    
    return results


if __name__ == "__main__":
    run_enhanced_suite()
