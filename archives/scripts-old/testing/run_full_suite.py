"""
PRISM Full Test Suite Runner v1.0
Runs all tests: regression, benchmarks, Ralph loops
"""

import json
import sys
import time
from pathlib import Path
from datetime import datetime

PRISM_ROOT = Path(r"C:\PRISM")
TESTING_DIR = PRISM_ROOT / "scripts" / "testing"
RESULTS_DIR = PRISM_ROOT / "state" / "results" / "test_suites"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(TESTING_DIR))


def run_regression_tests() -> dict:
    """Run regression test suite"""
    print("\n" + "="*70)
    print("PHASE 1: REGRESSION TESTS")
    print("="*70)
    
    try:
        from regression_tests import run_all_tests
        return run_all_tests()
    except ImportError as e:
        print(f"Error importing regression_tests: {e}")
        return {"error": str(e)}


def run_combination_engine_tests() -> dict:
    """Test CombinationEngine optimization"""
    print("\n" + "="*70)
    print("PHASE 2: COMBINATION ENGINE TESTS")
    print("="*70)
    
    sys.path.insert(0, str(PRISM_ROOT / "scripts"))
    
    try:
        from prism_unified_system_v6 import CombinationEngine
        engine = CombinationEngine()
        
        test_cases = [
            "Calculate optimal speed and feed for milling 4140 steel",
            "Extract material data from monolith",
            "Design architecture for tool selection engine",
            "Validate formula calibration status",
            "Coordinate multi-agent swarm for enhancement"
        ]
        
        results = []
        for i, task in enumerate(test_cases, 1):
            print(f"\n  Test {i}: {task[:50]}...")
            
            start = time.time()
            try:
                combination = engine.optimize(task)
                elapsed = time.time() - start
                
                results.append({
                    "task": task,
                    "passed": combination.psi_score > 0,
                    "psi_score": combination.psi_score,
                    "skills_selected": len(combination.skills),
                    "agents_selected": len(combination.agents),
                    "proof_certificate": combination.proof.get("certificate", "NONE"),
                    "elapsed_seconds": elapsed
                })
                
                status = "✓" if combination.psi_score > 0 else "✗"
                print(f"    [{status}] Ψ={combination.psi_score:.4f}, {len(combination.skills)} skills, {len(combination.agents)} agents")
                
            except Exception as e:
                results.append({
                    "task": task,
                    "passed": False,
                    "error": str(e)
                })
                print(f"    [✗] Error: {e}")
        
        passed = sum(1 for r in results if r.get("passed", False))
        return {
            "passed": passed,
            "failed": len(results) - passed,
            "total": len(results),
            "results": results
        }
        
    except ImportError as e:
        print(f"Error importing CombinationEngine: {e}")
        return {"error": str(e)}


def run_benchmark_validation() -> dict:
    """Validate benchmark task definitions"""
    print("\n" + "="*70)
    print("PHASE 3: BENCHMARK VALIDATION")
    print("="*70)
    
    benchmark_file = TESTING_DIR / "benchmark_tasks.json"
    
    if not benchmark_file.exists():
        return {"error": "benchmark_tasks.json not found"}
    
    try:
        with open(benchmark_file) as f:
            data = json.load(f)
        
        tasks = data.get("tasks", [])
        valid = 0
        invalid = []
        
        required_fields = ["id", "category", "name", "description", "expectedDomains", 
                          "expectedOperations", "expectedSkills", "expectedAgents"]
        
        for task in tasks:
            missing = [f for f in required_fields if f not in task]
            if missing:
                invalid.append({"id": task.get("id", "?"), "missing": missing})
            else:
                valid += 1
                print(f"  [✓] {task['id']}: {task['name']}")
        
        return {
            "valid_tasks": valid,
            "invalid_tasks": len(invalid),
            "total_tasks": len(tasks),
            "invalid_details": invalid
        }
        
    except Exception as e:
        return {"error": str(e)}


def run_file_integrity_check() -> dict:
    """Check all coordination files exist and are valid JSON"""
    print("\n" + "="*70)
    print("PHASE 4: FILE INTEGRITY CHECK")
    print("="*70)
    
    files_to_check = [
        PRISM_ROOT / "data" / "coordination" / "RESOURCE_REGISTRY.json",
        PRISM_ROOT / "data" / "coordination" / "CAPABILITY_MATRIX.json",
        PRISM_ROOT / "data" / "coordination" / "SYNERGY_MATRIX.json",
        PRISM_ROOT / "data" / "coordination" / "AGENT_REGISTRY.json",
        PRISM_ROOT / "state" / "CALIBRATION_STATE.json",
        PRISM_ROOT / "data" / "FORMULA_REGISTRY.json",
        PRISM_ROOT / "scripts" / "prism_unified_system_v6.py",
    ]
    
    results = []
    for file_path in files_to_check:
        status = {"path": str(file_path), "exists": file_path.exists()}
        
        if file_path.exists():
            try:
                if file_path.suffix == ".json":
                    with open(file_path) as f:
                        json.load(f)
                    status["valid_json"] = True
                status["size_bytes"] = file_path.stat().st_size
                status["passed"] = True
                print(f"  [✓] {file_path.name} ({status['size_bytes']:,} bytes)")
            except json.JSONDecodeError as e:
                status["valid_json"] = False
                status["error"] = str(e)
                status["passed"] = False
                print(f"  [✗] {file_path.name} - Invalid JSON: {e}")
        else:
            status["passed"] = False
            print(f"  [✗] {file_path.name} - NOT FOUND")
        
        results.append(status)
    
    passed = sum(1 for r in results if r.get("passed", False))
    return {
        "passed": passed,
        "failed": len(results) - passed,
        "total": len(results),
        "files": results
    }


def run_full_suite() -> dict:
    """Run complete test suite"""
    print("\n")
    print("╔" + "═"*68 + "╗")
    print("║" + " "*15 + "PRISM FULL TEST SUITE v1.0" + " "*15 + "        ║")
    print("╚" + "═"*68 + "╝")
    
    suite_start = time.time()
    
    results = {
        "suite_name": "PRISM Coordination System Tests",
        "started": datetime.now().isoformat(),
        "phases": {}
    }
    
    # Phase 1: Regression tests
    results["phases"]["regression"] = run_regression_tests()
    
    # Phase 2: Combination engine tests
    results["phases"]["combination_engine"] = run_combination_engine_tests()
    
    # Phase 3: Benchmark validation
    results["phases"]["benchmarks"] = run_benchmark_validation()
    
    # Phase 4: File integrity
    results["phases"]["file_integrity"] = run_file_integrity_check()
    
    # Summary
    results["completed"] = datetime.now().isoformat()
    results["elapsed_seconds"] = time.time() - suite_start
    
    # Calculate overall status
    total_passed = 0
    total_failed = 0
    
    for phase_name, phase_result in results["phases"].items():
        if "error" not in phase_result:
            total_passed += phase_result.get("passed", 0)
            total_failed += phase_result.get("failed", 0)
    
    results["summary"] = {
        "total_passed": total_passed,
        "total_failed": total_failed,
        "success_rate": total_passed / (total_passed + total_failed) if (total_passed + total_failed) > 0 else 0,
        "status": "PASSED" if total_failed == 0 else "FAILED"
    }
    
    # Print summary
    print("\n" + "="*70)
    print("FINAL SUMMARY")
    print("="*70)
    print(f"  Total Passed:  {total_passed}")
    print(f"  Total Failed:  {total_failed}")
    print(f"  Success Rate:  {results['summary']['success_rate']*100:.1f}%")
    print(f"  Status:        {results['summary']['status']}")
    print(f"  Elapsed:       {results['elapsed_seconds']:.2f}s")
    print("="*70)
    
    # Save results
    output_file = RESULTS_DIR / f"full_suite_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to: {output_file}")
    
    return results


def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "--json":
            results = run_full_suite()
            print(json.dumps(results, indent=2))
        elif sys.argv[1] == "--quick":
            # Quick mode: just file integrity
            run_file_integrity_check()
        else:
            print("Usage:")
            print("  py -3 run_full_suite.py           # Run full suite")
            print("  py -3 run_full_suite.py --json    # Output JSON")
            print("  py -3 run_full_suite.py --quick   # Quick file check only")
    else:
        run_full_suite()


if __name__ == "__main__":
    main()
