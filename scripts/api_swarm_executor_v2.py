"""
PRISM PARALLEL SWARM EXECUTOR v2.0
True parallel agent execution via Anthropic API
"""
import anthropic
import os
import json
import time
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Model selection - use working models
MODELS = {
    "OPUS": "claude-sonnet-4-20250514",      # Use Sonnet for complex (Opus expensive)
    "SONNET": "claude-sonnet-4-20250514",    # Primary workhorse
    "HAIKU": "claude-3-haiku-20240307",      # Fast validation
}

# Execution limits
MAX_PARALLEL_AGENTS = 4
MAX_TOKENS = 8000
DEFAULT_TIMEOUT = 120

# Output paths
OUTPUT_BASE = Path(r"C:\PRISM\mcp-server")
SKILLS_OUTPUT = Path(r"C:\PRISM\skills-consolidated")

# =============================================================================
# AGENT DEFINITIONS
# =============================================================================

AGENTS = {
    # -------------------------------------------------------------------------
    # PHASE 3: REGISTRY AGENTS (Parallel x4)
    # -------------------------------------------------------------------------
    "registry_materials": {
        "model": "SONNET",
        "temperature": 0.2,
        "max_tokens": 8000,
        "system": """You are a TypeScript expert building a MaterialRegistry for PRISM MCP server.

Create a complete, production-ready MaterialRegistry class that:
1. Extends a generic BaseRegistry<Material> pattern
2. Implements material-specific indexes:
   - By ISO class (P, M, K, N, S, H)
   - By hardness range (HB/HRC)
   - By name (tokenized search)
   - By material ID
3. Provides query methods:
   - getById(id: string): Material | undefined
   - getByISO(isoClass: string): Material[]
   - getByHardnessRange(min: number, max: number): Material[]
   - search(query: string): Material[]
4. Supports the 127-parameter material schema
5. Includes Kienzle coefficient lookups (kc1.1, mc)
6. Has hot-reload capability via file watching

Output ONLY valid TypeScript code. No explanations. No markdown code blocks.
Include all necessary imports and type definitions.""",
    },
    
    "registry_machines": {
        "model": "SONNET",
        "temperature": 0.2,
        "max_tokens": 8000,
        "system": """You are a TypeScript expert building a MachineRegistry for PRISM MCP server.

Create a complete, production-ready MachineRegistry class that:
1. Extends a generic BaseRegistry<Machine> pattern
2. Implements machine-specific indexes:
   - By manufacturer
   - By machine type (mill, lathe, turn-mill, EDM, etc.)
   - By work envelope size
   - By controller type
3. Provides query methods:
   - getById(id: string): Machine | undefined
   - getByManufacturer(mfr: string): Machine[]
   - getByType(type: MachineType): Machine[]
   - getByEnvelope(x: number, y: number, z: number): Machine[]
   - getCompatiblePosts(machineId: string): PostProcessor[]
4. Supports kinematic chain data
5. Has hot-reload capability

Output ONLY valid TypeScript code. No explanations. No markdown code blocks.""",
    },
    
    "registry_tools": {
        "model": "SONNET",
        "temperature": 0.2,
        "max_tokens": 8000,
        "system": """You are a TypeScript expert building a ToolRegistry for PRISM MCP server.

Create a complete, production-ready ToolRegistry class for cutting tools that:
1. Extends a generic BaseRegistry<CuttingTool> pattern
2. Implements tool-specific indexes:
   - By tool type (endmill, drill, tap, insert, etc.)
   - By diameter range
   - By coating type
   - By material compatibility
3. Provides query methods:
   - getById(id: string): CuttingTool | undefined
   - getByType(type: ToolType): CuttingTool[]
   - getByDiameter(min: number, max: number): CuttingTool[]
   - getCompatibleTools(materialId: string, operation: string): CuttingTool[]
   - recommend(material: Material, operation: Operation): CuttingTool[]
4. Includes cutting data (speeds, feeds, DOC, WOC)
5. Has hot-reload capability

Output ONLY valid TypeScript code. No explanations. No markdown code blocks.""",
    },
    
    "registry_alarms": {
        "model": "SONNET",
        "temperature": 0.2,
        "max_tokens": 8000,
        "system": """You are a TypeScript expert building an AlarmRegistry for PRISM MCP server.

Create a complete, production-ready AlarmRegistry class that:
1. Extends a generic BaseRegistry<Alarm> pattern
2. Implements alarm-specific indexes:
   - By controller family (FANUC, HAAS, SIEMENS, etc.)
   - By alarm code
   - By severity level
   - By category (SERVO, SPINDLE, ATC, etc.)
3. Provides query methods:
   - decode(controller: string, code: string): Alarm | undefined
   - getByController(controller: string): Alarm[]
   - getBySeverity(level: Severity): Alarm[]
   - search(description: string): Alarm[]
   - getFixProcedure(alarmId: string): FixProcedure | undefined
4. Supports multi-controller lookup
5. Has hot-reload capability

Output ONLY valid TypeScript code. No explanations. No markdown code blocks.""",
    },
    
    # -------------------------------------------------------------------------
    # PHASE 4: ORCHESTRATION AGENTS (Parallel x2)
    # -------------------------------------------------------------------------
    "orchestration_agent_invoker": {
        "model": "SONNET",
        "temperature": 0.2,
        "max_tokens": 8000,
        "system": """You are a TypeScript expert building an AgentInvoker for PRISM MCP server.

Create a complete AgentInvoker class that:
1. Loads agent definitions from a JSON registry
2. Assembles prompts based on agent role, skills, and context
3. Invokes Anthropic API with appropriate model tier:
   - OPUS for complex reasoning
   - SONNET for code generation
   - HAIKU for validation
4. Parses and validates agent responses
5. Handles errors, retries, and rate limits
6. Tracks token usage and costs

Interface:
- invokeAgent(agentName: string, task: string, context?: any): Promise<AgentResult>
- getAvailableAgents(): AgentDefinition[]
- getAgentCapabilities(agentName: string): string[]

Output ONLY valid TypeScript code. No explanations. No markdown code blocks.""",
    },
    
    "orchestration_swarm": {
        "model": "SONNET",
        "temperature": 0.2,
        "max_tokens": 8000,
        "system": """You are a TypeScript expert building a SwarmCoordinator for PRISM MCP server.

Create a complete SwarmCoordinator class that:
1. Runs multiple agents in parallel
2. Manages task distribution and load balancing
3. Merges and synthesizes agent results
4. Handles partial failures gracefully
5. Tracks swarm execution progress
6. Supports different swarm patterns:
   - parallel_tracks: Independent parallel work
   - pipeline: Sequential with handoffs
   - map_reduce: Distribute, process, aggregate
   - consensus: Multiple agents, vote on result

Interface:
- runSwarm(tasks: SwarmTask[], pattern: SwarmPattern): Promise<SwarmResult>
- getSwarmStatus(): SwarmStatus
- cancelSwarm(): void

Output ONLY valid TypeScript code. No explanations. No markdown code blocks.""",
    },
    
    # -------------------------------------------------------------------------
    # VALIDATION AGENTS (Ralph Loop)
    # -------------------------------------------------------------------------
    "validator_syntax": {
        "model": "HAIKU",
        "temperature": 0.0,
        "max_tokens": 2000,
        "system": """You are a TypeScript syntax validator.

Check the provided code for:
1. Valid TypeScript syntax
2. Proper import statements
3. Correct type annotations
4. No undefined references
5. Proper async/await usage

Output JSON only:
{
  "valid": true/false,
  "errors": [{"line": N, "message": "..."}],
  "warnings": [{"line": N, "message": "..."}]
}""",
    },
    
    "validator_completeness": {
        "model": "HAIKU",
        "temperature": 0.0,
        "max_tokens": 2000,
        "system": """You are a code completeness auditor.

Check if the code implements all required functionality:
1. All interface methods implemented
2. All required indexes created
3. Error handling present
4. Hot-reload support included
5. Query methods complete

Output JSON only:
{
  "complete": true/false,
  "coverage": 0.0-1.0,
  "missing": ["feature1", "feature2"],
  "recommendations": ["suggestion1"]
}""",
    },
}

# =============================================================================
# SWARM EXECUTOR CLASS
# =============================================================================

class PRISMSwarmExecutor:
    """Execute multiple agents in parallel via Anthropic API"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or API_KEY
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.results = {}
        self.usage = {"input_tokens": 0, "output_tokens": 0, "cost": 0.0}
        
    def invoke_agent(self, agent_name: str, task: str, context: str = "") -> Dict[str, Any]:
        """Invoke a single agent with a task"""
        agent = AGENTS.get(agent_name)
        if not agent:
            return {"error": f"Unknown agent: {agent_name}", "success": False}
        
        model = MODELS[agent["model"]]
        
        try:
            start_time = time.time()
            
            message = self.client.messages.create(
                model=model,
                max_tokens=agent.get("max_tokens", MAX_TOKENS),
                temperature=agent.get("temperature", 0.3),
                system=agent["system"],
                messages=[
                    {"role": "user", "content": f"{context}\n\nTASK: {task}" if context else task}
                ]
            )
            
            elapsed = time.time() - start_time
            
            # Track usage
            input_tokens = message.usage.input_tokens
            output_tokens = message.usage.output_tokens
            cost = (input_tokens * 3 + output_tokens * 15) / 1000000  # Sonnet pricing
            
            self.usage["input_tokens"] += input_tokens
            self.usage["output_tokens"] += output_tokens
            self.usage["cost"] += cost
            
            return {
                "agent": agent_name,
                "model": model,
                "content": message.content[0].text,
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost": cost,
                },
                "elapsed_seconds": elapsed,
                "success": True
            }
            
        except anthropic.RateLimitError as e:
            print(f"  Rate limited, waiting 30s...")
            time.sleep(30)
            return self.invoke_agent(agent_name, task, context)  # Retry
            
        except Exception as e:
            return {
                "agent": agent_name,
                "error": str(e),
                "success": False
            }
    
    def run_parallel(self, tasks: List[Dict[str, str]], max_workers: int = None) -> List[Dict[str, Any]]:
        """Run multiple agents in parallel
        
        tasks = [
            {"agent": "registry_materials", "task": "Create MaterialRegistry", "context": "..."},
            {"agent": "registry_machines", "task": "Create MachineRegistry", "context": "..."},
        ]
        """
        workers = max_workers or min(MAX_PARALLEL_AGENTS, len(tasks))
        results = []
        
        print(f"\nStarting parallel execution with {workers} workers...")
        print(f"Tasks: {len(tasks)}")
        print("-" * 50)
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(
                    self.invoke_agent,
                    task["agent"],
                    task["task"],
                    task.get("context", "")
                ): task
                for task in tasks
            }
            
            for future in as_completed(futures):
                task = futures[future]
                agent_name = task["agent"]
                try:
                    result = future.result()
                    results.append(result)
                    
                    if result["success"]:
                        print(f"  [OK] {agent_name} ({result['elapsed_seconds']:.1f}s, ${result['usage']['cost']:.4f})")
                    else:
                        print(f"  [FAIL] {agent_name}: {result.get('error', 'Unknown error')}")
                        
                except Exception as e:
                    results.append({
                        "agent": agent_name,
                        "error": str(e),
                        "success": False
                    })
                    print(f"  [ERROR] {agent_name}: {e}")
        
        elapsed = time.time() - start_time
        
        print("-" * 50)
        print(f"Completed in {elapsed:.1f}s")
        print(f"Total cost: ${self.usage['cost']:.4f}")
        
        return results
    
    def run_ralph_loop(self, code: str, iterations: int = 3) -> Dict[str, Any]:
        """Run Ralph validation loop on code"""
        print(f"\nRunning Ralph Loop ({iterations} iterations)...")
        
        results = []
        current_code = code
        
        for i in range(iterations):
            print(f"\n  Iteration {i+1}/{iterations}")
            
            # Syntax validation
            syntax_result = self.invoke_agent("validator_syntax", 
                f"Validate this TypeScript code:\n\n```typescript\n{current_code}\n```")
            results.append({"iteration": i+1, "type": "syntax", "result": syntax_result})
            
            if not syntax_result["success"]:
                print(f"    Syntax check failed")
                continue
                
            # Completeness check
            comp_result = self.invoke_agent("validator_completeness",
                f"Check completeness of:\n\n```typescript\n{current_code}\n```")
            results.append({"iteration": i+1, "type": "completeness", "result": comp_result})
            
            # Check if we can exit early
            try:
                if "complete" in comp_result.get("content", "").lower():
                    if '"complete": true' in comp_result["content"] or '"complete":true' in comp_result["content"]:
                        print(f"    Validation PASSED")
                        break
            except:
                pass
                
            print(f"    Completed iteration {i+1}")
        
        return {
            "iterations": results,
            "total_cost": self.usage["cost"],
            "final_code": current_code
        }
    
    def save_result(self, result: Dict, output_path: Path):
        """Save agent result to file"""
        if not result.get("success"):
            print(f"Skipping save for failed result: {result.get('agent')}")
            return
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        content = result["content"]
        
        # Clean up markdown code blocks if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"Saved: {output_path}")


# =============================================================================
# PHASE EXECUTION FUNCTIONS
# =============================================================================

def run_phase3_registries(executor: PRISMSwarmExecutor, context: str = "") -> List[Dict]:
    """Run Phase 3: Create all data registries in parallel"""
    tasks = [
        {"agent": "registry_materials", "task": "Create complete MaterialRegistry class", "context": context},
        {"agent": "registry_machines", "task": "Create complete MachineRegistry class", "context": context},
        {"agent": "registry_tools", "task": "Create complete ToolRegistry class", "context": context},
        {"agent": "registry_alarms", "task": "Create complete AlarmRegistry class", "context": context},
    ]
    
    results = executor.run_parallel(tasks)
    
    # Save results
    output_map = {
        "registry_materials": OUTPUT_BASE / "src" / "registries" / "material-registry.ts",
        "registry_machines": OUTPUT_BASE / "src" / "registries" / "machine-registry.ts",
        "registry_tools": OUTPUT_BASE / "src" / "registries" / "tool-registry.ts",
        "registry_alarms": OUTPUT_BASE / "src" / "registries" / "alarm-registry.ts",
    }
    
    for result in results:
        if result["success"]:
            output_path = output_map.get(result["agent"])
            if output_path:
                executor.save_result(result, output_path)
    
    return results


def run_phase4_orchestration(executor: PRISMSwarmExecutor, context: str = "") -> List[Dict]:
    """Run Phase 4: Create orchestration layer in parallel"""
    tasks = [
        {"agent": "orchestration_agent_invoker", "task": "Create complete AgentInvoker class", "context": context},
        {"agent": "orchestration_swarm", "task": "Create complete SwarmCoordinator class", "context": context},
    ]
    
    results = executor.run_parallel(tasks)
    
    # Save results
    output_map = {
        "orchestration_agent_invoker": OUTPUT_BASE / "src" / "orchestration" / "agent-invoker.ts",
        "orchestration_swarm": OUTPUT_BASE / "src" / "orchestration" / "swarm-coordinator.ts",
    }
    
    for result in results:
        if result["success"]:
            output_path = output_map.get(result["agent"])
            if output_path:
                executor.save_result(result, output_path)
    
    return results


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 70)
    print("PRISM PARALLEL SWARM EXECUTOR v2.0")
    print("=" * 70)
    
    # Check API
    if not API_KEY:
        print("\nERROR: ANTHROPIC_API_KEY not found")
        print("Set with: set ANTHROPIC_API_KEY=your-key")
        sys.exit(1)
    
    print(f"\nAPI Key: {API_KEY[:20]}...{API_KEY[-10:]}")
    
    # Parse arguments
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  py -3 api_swarm_executor_v2.py --test")
        print("  py -3 api_swarm_executor_v2.py --phase 3")
        print("  py -3 api_swarm_executor_v2.py --phase 4")
        print("  py -3 api_swarm_executor_v2.py --agent <name> <task>")
        print("\nAvailable agents:")
        for name in AGENTS.keys():
            print(f"  - {name}")
        sys.exit(0)
    
    executor = PRISMSwarmExecutor()
    
    if sys.argv[1] == "--test":
        print("\nRunning API test...")
        result = executor.invoke_agent("validator_syntax", "// Test\nconst x: number = 1;")
        print(f"Result: {result['success']}")
        print(f"Cost: ${result.get('usage', {}).get('cost', 0):.6f}")
        
    elif sys.argv[1] == "--phase":
        phase = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        
        if phase == 3:
            print("\n" + "=" * 70)
            print("PHASE 3: DATA REGISTRIES (Parallel x4)")
            print("=" * 70)
            results = run_phase3_registries(executor)
            
        elif phase == 4:
            print("\n" + "=" * 70)
            print("PHASE 4: ORCHESTRATION (Parallel x2)")
            print("=" * 70)
            results = run_phase4_orchestration(executor)
            
        else:
            print(f"Unknown phase: {phase}")
            
    elif sys.argv[1] == "--agent":
        agent_name = sys.argv[2] if len(sys.argv) > 2 else ""
        task = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else "Execute default task"
        
        if agent_name not in AGENTS:
            print(f"Unknown agent: {agent_name}")
            sys.exit(1)
            
        result = executor.invoke_agent(agent_name, task)
        print(f"\nResult: {'SUCCESS' if result['success'] else 'FAILED'}")
        if result["success"]:
            print(f"Content length: {len(result['content'])} chars")
            print(f"Cost: ${result['usage']['cost']:.4f}")
    
    print(f"\nTotal session cost: ${executor.usage['cost']:.4f}")


if __name__ == "__main__":
    main()
