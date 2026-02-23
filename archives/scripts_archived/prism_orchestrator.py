"""
PRISM Multi-Agent Orchestrator
Parallel agent execution using Anthropic API
Runs while Desktop App is open - no conflicts!
"""

import anthropic
import json
import sys
import os
import time
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional

# =============================================================================
# CONFIGURATION
# =============================================================================

API_KEY = "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"
PRISM_ROOT = Path(r"C:\\PRISM")
RESULTS_DIR = PRISM_ROOT / "API_RESULTS"
TASKS_DIR = PRISM_ROOT / "_TASKS"
LOGS_DIR = PRISM_ROOT / "AGENT_LOGS"

# Ensure directories exist
RESULTS_DIR.mkdir(exist_ok=True)
TASKS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# =============================================================================
# AGENT DEFINITIONS
# =============================================================================

AGENT_ROLES = {
    "extractor": {
        "name": "Data Extractor",
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "system": """You are a PRISM Data Extraction Agent. Your role is to:
- Extract structured data from source material
- Output clean, parseable JSON or code
- Follow exact specifications for data structure
- Never add commentary - just output the requested data
- Be thorough - extract ALL matching items, not just examples"""
    },
    
    "validator": {
        "name": "Data Validator", 
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "system": """You are a PRISM Validation Agent. Your role is to:
- Check data for completeness and correctness
- Verify physics calculations are valid
- Flag missing required fields
- Output a validation report with PASS/FAIL for each item
- Be strict - manufacturing data must be accurate"""
    },
    
    "merger": {
        "name": "Data Merger",
        "model": "claude-sonnet-4-20250514", 
        "max_tokens": 8192,
        "system": """You are a PRISM Data Merger Agent. Your role is to:
- Combine data from multiple sources
- Resolve conflicts (prefer more complete/recent data)
- Deduplicate entries
- Output unified, clean data structure
- Preserve all unique information"""
    },
    
    "coder": {
        "name": "Code Generator",
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "system": """You are a PRISM Code Generation Agent. Your role is to:
- Write clean, typed Python/TypeScript code
- Follow PRISM coding standards
- Include docstrings and type hints
- Handle edge cases and errors
- Output only code - no explanations unless requested"""
    },
    
    "analyst": {
        "name": "Data Analyst",
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "system": """You are a PRISM Analysis Agent. Your role is to:
- Analyze data patterns and relationships
- Generate statistical summaries
- Identify gaps or anomalies
- Provide actionable insights
- Output structured analysis reports"""
    },
    
    "researcher": {
        "name": "Research Agent",
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "system": """You are a PRISM Research Agent. Your role is to:
- Deep dive into specific topics
- Cross-reference multiple sources
- Compile comprehensive information
- Organize findings logically
- Output well-structured research reports"""
    }
}

# =============================================================================
# CORE AGENT CLASS
# =============================================================================

class Agent:
    def __init__(self, role: str, agent_id: str = None):
        if role not in AGENT_ROLES:
            raise ValueError(f"Unknown role: {role}. Available: {list(AGENT_ROLES.keys())}")
        
        self.role = role
        self.config = AGENT_ROLES[role]
        self.agent_id = agent_id or f"{role}-{int(time.time())}"
        self.client = anthropic.Anthropic(api_key=API_KEY)
        self.history = []
        
    def execute(self, prompt: str, context: str = None, files: List[str] = None) -> Dict:
        """Execute a task and return results"""
        start_time = time.time()
        
        # Build the full prompt
        full_prompt = ""
        
        # Add file contents if provided
        if files:
            for file_path in files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    full_prompt += f"\n=== FILE: {file_path} ===\n{content}\n=== END FILE ===\n"
                except Exception as e:
                    full_prompt += f"\n=== FILE: {file_path} === ERROR: {e} ===\n"
        
        # Add context if provided
        if context:
            full_prompt += f"\n=== CONTEXT ===\n{context}\n=== END CONTEXT ===\n"
        
        # Add the main prompt
        full_prompt += f"\n{prompt}"
        
        try:
            response = self.client.messages.create(
                model=self.config["model"],
                max_tokens=self.config["max_tokens"],
                system=self.config["system"],
                messages=[{"role": "user", "content": full_prompt}]
            )
            
            elapsed = time.time() - start_time
            
            result = {
                "agent_id": self.agent_id,
                "role": self.role,
                "status": "success",
                "content": response.content[0].text,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "elapsed_seconds": round(elapsed, 2),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            elapsed = time.time() - start_time
            result = {
                "agent_id": self.agent_id,
                "role": self.role,
                "status": "error",
                "error": str(e),
                "elapsed_seconds": round(elapsed, 2),
                "timestamp": datetime.now().isoformat()
            }
        
        self.history.append(result)
        return result

# =============================================================================
# ORCHESTRATOR CLASS
# =============================================================================

class Orchestrator:
    def __init__(self, max_parallel: int = 5):
        self.max_parallel = max_parallel
        self.agents: Dict[str, Agent] = {}
        self.results: List[Dict] = []
        self.session_id = f"session-{int(time.time())}"
        
    def spawn_agent(self, role: str, agent_id: str = None) -> Agent:
        """Spawn a new agent"""
        agent = Agent(role, agent_id)
        self.agents[agent.agent_id] = agent
        return agent
    
    def run_parallel(self, tasks: List[Dict]) -> List[Dict]:
        """
        Run multiple tasks in parallel.
        
        Each task dict should have:
        - role: Agent role to use
        - prompt: The task prompt
        - context: (optional) Additional context
        - files: (optional) List of file paths to include
        - id: (optional) Task identifier
        """
        results = []
        
        print(f"\n{'='*60}")
        print(f"PRISM Multi-Agent Orchestrator")
        print(f"Session: {self.session_id}")
        print(f"Tasks: {len(tasks)} | Max Parallel: {self.max_parallel}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=self.max_parallel) as executor:
            # Submit all tasks
            future_to_task = {}
            for i, task in enumerate(tasks):
                task_id = task.get("id", f"task-{i+1}")
                role = task.get("role", "extractor")
                agent = self.spawn_agent(role, f"{role}-{task_id}")
                
                future = executor.submit(
                    agent.execute,
                    task["prompt"],
                    task.get("context"),
                    task.get("files")
                )
                future_to_task[future] = {"task": task, "task_id": task_id, "agent": agent}
                print(f"[QUEUED] {task_id} -> {role} agent")
            
            # Collect results as they complete
            for future in as_completed(future_to_task):
                task_info = future_to_task[future]
                task_id = task_info["task_id"]
                
                try:
                    result = future.result()
                    result["task_id"] = task_id
                    results.append(result)
                    
                    status = "[OK]" if result["status"] == "success" else "[FAIL]"
                    tokens = f"{result.get('input_tokens', 0)}in/{result.get('output_tokens', 0)}out"
                    print(f"{status} {task_id} completed in {result['elapsed_seconds']}s ({tokens})")
                    
                except Exception as e:
                    print(f"[ERROR] {task_id}: {e}")
                    results.append({
                        "task_id": task_id,
                        "status": "error",
                        "error": str(e)
                    })
        
        elapsed = time.time() - start_time
        
        # Summary
        success_count = sum(1 for r in results if r.get("status") == "success")
        total_in = sum(r.get("input_tokens", 0) for r in results)
        total_out = sum(r.get("output_tokens", 0) for r in results)
        
        print(f"\n{'='*60}")
        print(f"COMPLETE: {success_count}/{len(tasks)} succeeded")
        print(f"Total tokens: {total_in} in / {total_out} out")
        print(f"Total time: {round(elapsed, 2)}s")
        print(f"{'='*60}\n")
        
        self.results = results
        return results
    
    def save_results(self, name: str = "orchestrator_results") -> Path:
        """Save all results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save full JSON
        json_path = RESULTS_DIR / f"{name}_{timestamp}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "task_count": len(self.results),
                "results": self.results
            }, f, indent=2)
        
        # Save just the content outputs
        content_path = RESULTS_DIR / f"{name}_{timestamp}_content.txt"
        with open(content_path, 'w', encoding='utf-8') as f:
            for r in self.results:
                f.write(f"\n{'='*60}\n")
                f.write(f"Task: {r.get('task_id', 'unknown')}\n")
                f.write(f"Agent: {r.get('agent_id', 'unknown')} ({r.get('role', 'unknown')})\n")
                f.write(f"Status: {r.get('status', 'unknown')}\n")
                f.write(f"{'='*60}\n\n")
                if r.get("status") == "success":
                    f.write(r.get("content", ""))
                else:
                    f.write(f"ERROR: {r.get('error', 'unknown')}")
                f.write("\n\n")
        
        print(f"Results saved to:")
        print(f"  {json_path}")
        print(f"  {content_path}")
        
        return json_path

# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def run_extraction_swarm(sources: List[Dict], output_name: str = "extraction") -> List[Dict]:
    """
    Run parallel extraction from multiple sources.
    
    sources: List of dicts with 'file' and/or 'prompt' keys
    """
    tasks = []
    for i, source in enumerate(sources):
        task = {
            "id": f"extract-{i+1}",
            "role": "extractor",
            "prompt": source.get("prompt", "Extract all structured data from the provided content."),
            "files": [source["file"]] if "file" in source else None,
            "context": source.get("context")
        }
        tasks.append(task)
    
    orch = Orchestrator(max_parallel=min(5, len(tasks)))
    results = orch.run_parallel(tasks)
    orch.save_results(output_name)
    return results


def run_validation_swarm(data_items: List[str], schema: str = None) -> List[Dict]:
    """
    Validate multiple data items in parallel.
    """
    tasks = []
    for i, item in enumerate(data_items):
        prompt = f"Validate this data item:\n\n{item}"
        if schema:
            prompt += f"\n\nExpected schema:\n{schema}"
        
        tasks.append({
            "id": f"validate-{i+1}",
            "role": "validator",
            "prompt": prompt
        })
    
    orch = Orchestrator(max_parallel=min(5, len(tasks)))
    results = orch.run_parallel(tasks)
    orch.save_results("validation")
    return results


def run_coding_swarm(specs: List[Dict]) -> List[Dict]:
    """
    Generate multiple code components in parallel.
    
    specs: List of dicts with 'name' and 'spec' keys
    """
    tasks = []
    for spec in specs:
        tasks.append({
            "id": f"code-{spec['name']}",
            "role": "coder",
            "prompt": f"Generate code for: {spec['name']}\n\nSpecification:\n{spec['spec']}"
        })
    
    orch = Orchestrator(max_parallel=min(5, len(tasks)))
    results = orch.run_parallel(tasks)
    orch.save_results("code_generation")
    return results


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    if len(sys.argv) < 2:
        print("""
PRISM Multi-Agent Orchestrator
==============================

Usage:
  python prism_orchestrator.py <task_file.json>
  python prism_orchestrator.py --test

Task file format:
{
  "name": "my_task",
  "max_parallel": 5,
  "tasks": [
    {
      "id": "task-1",
      "role": "extractor|validator|merger|coder|analyst|researcher",
      "prompt": "What to do",
      "context": "Optional context",
      "files": ["optional/file/paths.txt"]
    }
  ]
}

Available roles:
  - extractor: Extract structured data
  - validator: Validate data completeness
  - merger: Combine multiple data sources  
  - coder: Generate code
  - analyst: Analyze data patterns
  - researcher: Deep research tasks
""")
        return
    
    if sys.argv[1] == "--test":
        # Run a quick test
        print("Running test swarm...")
        tasks = [
            {
                "id": "test-1",
                "role": "coder",
                "prompt": "Write a Python function called cutting_speed(diameter_mm: float, rpm: float) -> float that calculates cutting speed in m/min. Include docstring."
            },
            {
                "id": "test-2", 
                "role": "coder",
                "prompt": "Write a Python function called feed_rate(fpt: float, teeth: int, rpm: float) -> float that calculates feed rate in mm/min. Include docstring."
            },
            {
                "id": "test-3",
                "role": "coder", 
                "prompt": "Write a Python function called mrr(width_mm: float, depth_mm: float, feed_mm_min: float) -> float that calculates material removal rate in mm3/min. Include docstring."
            }
        ]
        
        orch = Orchestrator(max_parallel=3)
        results = orch.run_parallel(tasks)
        orch.save_results("test_swarm")
        return
    
    # Load task file
    task_file = sys.argv[1]
    if not os.path.isabs(task_file):
        task_file = TASKS_DIR / task_file
    
    with open(task_file, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    orch = Orchestrator(max_parallel=config.get("max_parallel", 5))
    results = orch.run_parallel(config["tasks"])
    orch.save_results(config.get("name", "orchestrator"))


if __name__ == "__main__":
    main()
