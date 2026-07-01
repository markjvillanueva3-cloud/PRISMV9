"""
PRISM Ralph Loop Tester v1.0
Runs iterative improvement loops and measures quality convergence
"""

import json
import sys
import time
from pathlib import Path
from datetime import datetime

PRISM_ROOT = Path(r"C:\PRISM")
RESULTS_DIR = PRISM_ROOT / "state" / "results" / "ralph_tests"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Import orchestrator
sys.path.insert(0, str(PRISM_ROOT / "scripts"))
try:
    from prism_unified_system_v6 import UnifiedOrchestrator, CombinationEngine
    ORCHESTRATOR_AVAILABLE = True
except ImportError:
    ORCHESTRATOR_AVAILABLE = False
    print("Warning: Could not import UnifiedOrchestrator")


def run_ralph_test(agent: str, task: str, iterations: int = 3) -> dict:
    """Run a Ralph loop test and measure improvement"""
    if not ORCHESTRATOR_AVAILABLE:
        return {"error": "Orchestrator not available"}
    
    orchestrator = UnifiedOrchestrator()
    
    results = {
        "agent": agent,
        "task": task,
        "iterations": iterations,
        "started": datetime.now().isoformat(),
        "iteration_results": [],
        "quality_progression": [],
        "convergence_achieved": False
    }
    
    current_output = None
    previous_quality = 0.0
    
    for i in range(iterations):
        print(f"\n--- Iteration {i+1}/{iterations} ---")
        
        # Build enhanced task with previous output
        if current_output:
            enhanced_task = f"{task}\n\nPREVIOUS OUTPUT TO IMPROVE:\n{current_output[:2000]}"
        else:
            enhanced_task = task
        
        # Run agent
        start_time = time.time()
        result = orchestrator.run_single_agent(agent, enhanced_task)
        elapsed = time.time() - start_time
        
        if "error" in result:
            results["iteration_results"].append({
                "iteration": i + 1,
                "error": result["error"],
                "elapsed_seconds": elapsed
            })
            continue
        
        current_output = result.get("result", "")
        
        # Estimate quality (simplified - would use actual quality metrics)
        quality = estimate_quality(current_output, task)
        
        results["iteration_results"].append({
            "iteration": i + 1,
            "output_length": len(current_output),
            "quality_score": quality,
            "improvement": quality - previous_quality,
            "cost": result.get("cost", 0),
            "elapsed_seconds": elapsed
        })
        
        results["quality_progression"].append(quality)
        
        # Check convergence (improvement < 5%)
        if i > 0 and (quality - previous_quality) < 0.05:
            results["convergence_achieved"] = True
            results["converged_at_iteration"] = i + 1
        
        previous_quality = quality
    
    results["completed"] = datetime.now().isoformat()
    results["final_quality"] = previous_quality
    results["total_improvement"] = results["quality_progression"][-1] - results["quality_progression"][0] if results["quality_progression"] else 0
    
    return results


def estimate_quality(output: str, task: str) -> float:
    """Estimate output quality (simplified heuristic)"""
    if not output:
        return 0.0
    
    quality = 0.5  # Base score
    
    # Length bonus (up to 0.2)
    length_score = min(len(output) / 2000, 1.0) * 0.2
    quality += length_score
    
    # Structure bonus (has sections/headers)
    if any(marker in output for marker in ["##", "###", "---", "==="]):
        quality += 0.1
    
    # Completeness indicators
    if any(word in output.lower() for word in ["complete", "verified", "validated", "confirmed"]):
        quality += 0.1
    
    # Mathematical rigor
    if any(symbol in output for symbol in ["±", "+/-", "95%", "confidence"]):
        quality += 0.1
    
    return min(quality, 1.0)


def run_benchmark_suite():
    """Run Ralph tests on all benchmark tasks"""
    benchmark_file = PRISM_ROOT / "scripts" / "testing" / "benchmark_tasks.json"
    
    if not benchmark_file.exists():
        print(f"Error: Benchmark file not found: {benchmark_file}")
        return
    
    with open(benchmark_file) as f:
        benchmarks = json.load(f)
    
    results = {
        "suite": "ralph_benchmark",
        "started": datetime.now().isoformat(),
        "task_results": []
    }
    
    for task in benchmarks["tasks"][:5]:  # Limit to 5 for testing
        print(f"\n{'='*60}")
        print(f"Testing: {task['name']}")
        print(f"{'='*60}")
        
        # Pick first expected agent
        agent = task["expectedAgents"][0] if task["expectedAgents"] else "analyst"
        
        test_result = run_ralph_test(
            agent=agent,
            task=task["description"],
            iterations=3
        )
        
        test_result["benchmark_id"] = task["id"]
        test_result["benchmark_name"] = task["name"]
        test_result["expected_psi"] = task["minPsiScore"]
        
        results["task_results"].append(test_result)
    
    results["completed"] = datetime.now().isoformat()
    
    # Save results
    output_file = RESULTS_DIR / f"ralph_suite_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to: {output_file}")
    return results


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  py -3 ralph_loop_tester.py --single <agent> \"task\" [iterations]")
        print("  py -3 ralph_loop_tester.py --suite")
        return
    
    if sys.argv[1] == "--single" and len(sys.argv) >= 4:
        agent = sys.argv[2]
        task = sys.argv[3]
        iterations = int(sys.argv[4]) if len(sys.argv) >= 5 else 3
        
        result = run_ralph_test(agent, task, iterations)
        print(json.dumps(result, indent=2))
    
    elif sys.argv[1] == "--suite":
        run_benchmark_suite()
    
    else:
        print("Invalid arguments")


if __name__ == "__main__":
    main()
