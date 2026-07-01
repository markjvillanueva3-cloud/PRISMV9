"""
PRISM Clone Factory - CORE.3
Enhancement Roadmap v4.0 | 5 hours estimated

Spawn API agents that have "PRISM DNA" - they know the 10 Commandments,
understand S(x) ≥ 0.70, follow anti-regression, and use our skills.

Clone Types:
- materials: Material database validation and enhancement
- physics: Physics calculations and validation
- safety: Safety auditing and score computation
- extraction: Data extraction from documents/code
- code: Codebase navigation and analysis
- cam: G-code analysis and optimization
- alarms: Alarm database management

Each clone has:
- Embedded skills (loaded on spawn)
- Access to MCP tools via proxy
- PRISM DNA (10 Commandments, quality equation, safety rules)
- Current project state awareness

@version 1.0.0
@author PRISM Development Team
"""

import os
import sys
import json
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.agent_mcp_proxy import AgentMCPProxy, AgentResult, ProxyConfig

# ============================================================================
# PRISM DNA - THE CORE IDENTITY
# ============================================================================

PRISM_CLONE_DNA = """You are a PRISM Manufacturing Intelligence developer clone.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL CONTEXT - LIVES DEPEND ON YOUR ACCURACY
═══════════════════════════════════════════════════════════════════════════════

PRISM controls CNC machines where LIVES ARE AT STAKE:
- Wrong calculations = tool explosions, operator injury, death
- Incomplete data = machine crashes, flying debris
- Every shortcut can kill someone

{embedded_skills}

═══════════════════════════════════════════════════════════════════════════════
THE 10 COMMANDMENTS
═══════════════════════════════════════════════════════════════════════════════

1. IF IT EXISTS, USE IT EVERYWHERE - Every database consumed by ALL applicable modules
2. FUSE THE UNFUSABLE - Cross-domain integration maximizes value
3. TRUST BUT VERIFY - Evidence > assumptions, validate all data
4. LEARN FROM EVERYTHING - Every interaction improves the system
5. PREDICT WITH UNCERTAINTY - Flag confidence levels, admit gaps
6. EXPLAIN EVERYTHING - Show work, rationale for decisions
7. FAIL GRACEFULLY - Degrade safely, never crash silently
8. PROTECT EVERYTHING - Security, data integrity, user safety
9. PERFORM ALWAYS - No degradation under load
10. OBSESS OVER USERS - User success is the only metric that matters

═══════════════════════════════════════════════════════════════════════════════
QUALITY EQUATION
═══════════════════════════════════════════════════════════════════════════════

Ω(x) = 0.25·R(x) + 0.20·C(x) + 0.15·P(x) + 0.30·S(x) + 0.10·L(x)

R = Reasoning quality (logical, complete, evidence-based)
C = Code quality (clean, tested, maintainable)
P = Process adherence (checkpoints, validation)
S = Safety score (CRITICAL: S(x) ≥ 0.70 or OUTPUT BLOCKED)
L = Learning captured (patterns, improvements)

HARD CONSTRAINT: S(x) ≥ 0.70 - Below this threshold, output is BLOCKED

═══════════════════════════════════════════════════════════════════════════════
ANTI-REGRESSION PROTOCOL
═══════════════════════════════════════════════════════════════════════════════

Before ANY data modification:
1. Count items in original
2. Create new version
3. VERIFY: new_count >= old_count
4. If smaller → STOP, investigate, never ship

TRIGGERED BY: update, replace, rewrite, merge, consolidate, new version

═══════════════════════════════════════════════════════════════════════════════
PROJECT STATE
═══════════════════════════════════════════════════════════════════════════════

{current_state_summary}

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════════════════

Execute your assigned task with manufacturing-grade rigor.
Use available tools to query data, compute physics, validate results.
Always show your work and explain your reasoning.
If uncertain, say so and explain what additional information would help.

{task_context}
"""

# ============================================================================
# CLONE TYPE DEFINITIONS
# ============================================================================

@dataclass
class CloneType:
    """Definition of a PRISM clone type."""
    name: str
    description: str
    skills: List[str]
    tools: List[str]
    task_context: str


CLONE_TYPES: Dict[str, CloneType] = {
    "materials": CloneType(
        name="Materials Clone",
        description="Material database validation and enhancement",
        skills=[
            "prism-material-schema",
            "prism-material-physics",
            "prism-material-validator",
            "prism-universal-formulas"
        ],
        tools=[
            "query_material",
            "validate_kienzle",
            "compute_kienzle",
            "compute_taylor",
            "check_limits"
        ],
        task_context="""You specialize in material science and machining data.

Key responsibilities:
- Validate material properties (kc1.1, mc, thermal conductivity, etc.)
- Verify Kienzle coefficients are physically plausible
- Check Taylor tool life parameters
- Ensure 127-parameter coverage
- Flag suspicious or missing data

Use physics formulas to cross-validate material properties.
Reference ISO material categories (P, M, K, N, S, H) for expected ranges."""
    ),
    
    "physics": CloneType(
        name="Physics Clone",
        description="Physics calculations and validation",
        skills=[
            "prism-universal-formulas",
            "prism-safety-framework",
            "prism-cutting-force-models"
        ],
        tools=[
            "compute_kienzle",
            "compute_taylor",
            "compute_surface_finish",
            "compute_mrr",
            "compute_safety_score",
            "validate_kienzle",
            "check_limits"
        ],
        task_context="""You specialize in manufacturing physics calculations.

Key responsibilities:
- Compute cutting forces using Kienzle model
- Calculate tool life using Taylor equation
- Predict surface finish
- Validate machining parameters
- Ensure calculations are physically plausible

Core formulas:
- Kienzle: Fc = kc1.1 × h^(1-mc) × b
- Taylor: VT^n = C
- Surface finish: Ra = f²/(32×r)

Always verify inputs are in valid ranges before computing."""
    ),
    
    "safety": CloneType(
        name="Safety Clone",
        description="Safety auditing and score computation",
        skills=[
            "prism-safety-framework",
            "prism-validator",
            "prism-error-catalog"
        ],
        tools=[
            "compute_safety_score",
            "check_limits",
            "validate_kienzle",
            "query_alarm"
        ],
        task_context="""You are the SAFETY GUARDIAN. Your decisions prevent injuries and deaths.

Key responsibilities:
- Compute S(x) safety scores for all outputs
- BLOCK any output with S(x) < 0.70
- Audit parameters against machine limits
- Identify dangerous combinations
- Flag missing safety validations

CRITICAL: If you find a safety issue, report it immediately.
Never approve anything you're uncertain about.
When in doubt, err on the side of caution - lives depend on it."""
    ),
    
    "extraction": CloneType(
        name="Extraction Clone",
        description="Data extraction from documents and code",
        skills=[
            "prism-extraction-orchestrator",
            "prism-pdf-extractor",
            "prism-monolith-navigator"
        ],
        tools=[
            "query_material",
            "query_machine",
            "query_formula",
            "trace_wiring"
        ],
        task_context="""You specialize in extracting structured data from unstructured sources.

Key responsibilities:
- Extract material properties from PDFs/documents
- Parse machine specifications from manuals
- Identify formulas and algorithms in code
- Map relationships between entities
- Validate extracted data against physics

Always provide confidence levels for extracted data.
Flag any values that seem implausible for verification."""
    ),
    
    "code": CloneType(
        name="Code Clone",
        description="Codebase navigation and analysis",
        skills=[
            "prism-monolith-navigator",
            "prism-monolith-index",
            "prism-coding-patterns"
        ],
        tools=[
            "trace_wiring",
            "find_consumers",
            "query_formula"
        ],
        task_context="""You specialize in navigating and understanding the PRISM codebase.

Key responsibilities:
- Find specific functionality in 986K line monolith
- Trace dependencies between modules
- Identify consumers of databases/engines
- Analyze code patterns and quality
- Map cross-references

The monolith has 831 modules across domains:
- Physics engines (Kienzle, Taylor, etc.)
- AI/ML engines (PSO, GA, Neural networks)
- CAD/CAM engines (toolpaths, collision)
- Database managers (materials, machines, tools)"""
    ),
    
    "cam": CloneType(
        name="CAM Clone",
        description="G-code analysis and optimization",
        skills=[
            "prism-gcode-reference",
            "prism-fanuc-programming",
            "prism-toolpath-optimizer"
        ],
        tools=[
            "compute_kienzle",
            "compute_mrr",
            "compute_surface_finish",
            "compute_safety_score",
            "query_machine"
        ],
        task_context="""You specialize in CNC programming and G-code optimization.

Key responsibilities:
- Analyze G-code programs for efficiency
- Validate feeds and speeds
- Identify optimization opportunities
- Check for collision risks
- Ensure machine limits are respected

Support multiple controllers:
- FANUC (most common)
- SIEMENS SINUMERIK
- HAAS
- MAZAK Mazatrol
- OKUMA OSP

Always validate parameters against target machine capabilities."""
    ),
    
    "alarms": CloneType(
        name="Alarms Clone",
        description="CNC alarm database management",
        skills=[
            "prism-error-catalog",
            "prism-fanuc-programming",
            "prism-siemens-programming"
        ],
        tools=[
            "query_alarm",
            "query_machine"
        ],
        task_context="""You specialize in CNC controller alarms and troubleshooting.

Key responsibilities:
- Identify and categorize alarm codes
- Extract alarm information from manuals
- Cross-reference alarms across controllers
- Provide troubleshooting guidance
- Maintain alarm database completeness

Target: 9,200 alarms across 12 controller families:
- FANUC (target: 1,500)
- SIEMENS (target: 1,200)
- HAAS (target: 1,000)
- MAZAK (target: 1,000)
- Others (OKUMA, HEIDENHAIN, MITSUBISHI, etc.)"""
    )
}


# ============================================================================
# SKILL LOADER
# ============================================================================

class SkillLoader:
    """Loads skill content for embedding in clone DNA."""
    
    def __init__(self, skills_path: str = r"C:\PRISM\skills-consolidated"):
        self.skills_path = skills_path
        self.skill_cache: Dict[str, str] = {}
    
    def load_skill(self, skill_name: str) -> str:
        """Load a skill's content."""
        if skill_name in self.skill_cache:
            return self.skill_cache[skill_name]
        
        # Try multiple possible locations
        possible_paths = [
            os.path.join(self.skills_path, skill_name, "SKILL.md"),
            os.path.join(self.skills_path, f"{skill_name}.md"),
            os.path.join(self.skills_path, skill_name),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Truncate if too long (keep first 2000 chars)
                        if len(content) > 4000:
                            content = content[:4000] + "\n\n[...truncated for context...]"
                        self.skill_cache[skill_name] = content
                        return content
                except Exception as e:
                    return f"[Error loading {skill_name}: {e}]"
        
        return f"[Skill {skill_name} not found]"
    
    def load_skills(self, skill_names: List[str]) -> str:
        """Load multiple skills and format for embedding."""
        sections = []
        for name in skill_names:
            content = self.load_skill(name)
            sections.append(f"### SKILL: {name}\n\n{content}")
        
        if not sections:
            return "[No skills loaded]"
        
        return "\n\n" + "─" * 40 + "\n\n".join(sections)


# ============================================================================
# STATE LOADER
# ============================================================================

class StateLoader:
    """Loads current project state for clone context."""
    
    def __init__(self, state_path: str = r"C:\\PRISM\CURRENT_STATE.json"):
        self.state_path = state_path
    
    def get_state_summary(self) -> str:
        """Get a summary of current project state."""
        if not os.path.exists(self.state_path):
            return "[State file not found]"
        
        try:
            with open(self.state_path, 'r', encoding='utf-8') as f:
                state = json.load(f)
            
            summary_parts = []
            
            # Version and status
            if "version" in state:
                summary_parts.append(f"State Version: {state['version']}")
            
            # Quick resume info
            if "quickResume" in state:
                summary_parts.append(f"Quick Resume: {state['quickResume'][:500]}")
            
            # Current task
            if "currentTask" in state:
                task = state["currentTask"]
                summary_parts.append(f"Current Task: {task.get('name', 'Unknown')}")
                summary_parts.append(f"Status: {task.get('status', 'Unknown')}")
            
            # Recent decisions
            if "decisions" in state and state["decisions"]:
                recent = state["decisions"][-3:]
                summary_parts.append("Recent Decisions:")
                for d in recent:
                    summary_parts.append(f"  - {d.get('what', '')[:100]}")
            
            return "\n".join(summary_parts) if summary_parts else "[State empty]"
            
        except Exception as e:
            return f"[Error loading state: {e}]"


# ============================================================================
# CLONE FACTORY
# ============================================================================

@dataclass
class CloneResult:
    """Result from a clone execution."""
    clone_id: str
    clone_type: str
    task: str
    success: bool
    result: str
    tool_calls: int
    execution_time_ms: int
    error: Optional[str] = None


class PRISMCloneFactory:
    """
    Factory for spawning specialized PRISM clones.
    
    Each clone has:
    - PRISM DNA (10 Commandments, quality equation, safety rules)
    - Embedded skills relevant to its specialty
    - Access to MCP tools via proxy
    - Current project state awareness
    """
    
    def __init__(self, config: Optional[ProxyConfig] = None):
        self.config = config or ProxyConfig()
        self.proxy = AgentMCPProxy(self.config)
        self.skill_loader = SkillLoader(self.config.skills_path)
        self.state_loader = StateLoader()
        
        self._clone_counter = 0
        self._lock = threading.Lock()
    
    def _get_clone_id(self, clone_type: str) -> str:
        """Generate unique clone ID."""
        with self._lock:
            self._clone_counter += 1
            return f"CLONE-{clone_type.upper()}-{datetime.now().strftime('%H%M%S')}-{self._clone_counter:03d}"
    
    def _build_system_prompt(self, clone_type: CloneType, custom_context: Optional[str] = None) -> str:
        """Build the complete system prompt with DNA and skills."""
        # Load skills
        skills_content = self.skill_loader.load_skills(clone_type.skills)
        
        # Get state summary
        state_summary = self.state_loader.get_state_summary()
        
        # Build task context
        task_context = clone_type.task_context
        if custom_context:
            task_context += f"\n\nADDITIONAL CONTEXT:\n{custom_context}"
        
        # Format the DNA template
        return PRISM_CLONE_DNA.format(
            embedded_skills=skills_content,
            current_state_summary=state_summary,
            task_context=task_context
        )
    
    def spawn_clone(
        self,
        clone_type: str,
        task: str,
        custom_context: Optional[str] = None,
        max_tool_calls: Optional[int] = None
    ) -> CloneResult:
        """
        Spawn a specialized PRISM clone.
        
        Args:
            clone_type: Type of clone (materials, physics, safety, etc.)
            task: Task for the clone to perform
            custom_context: Additional context for this specific task
            max_tool_calls: Override max tool calls
        
        Returns:
            CloneResult with execution details
        """
        if clone_type not in CLONE_TYPES:
            return CloneResult(
                clone_id="ERROR",
                clone_type=clone_type,
                task=task,
                success=False,
                result="",
                tool_calls=0,
                execution_time_ms=0,
                error=f"Unknown clone type: {clone_type}. Valid types: {list(CLONE_TYPES.keys())}"
            )
        
        clone_def = CLONE_TYPES[clone_type]
        clone_id = self._get_clone_id(clone_type)
        
        # Build system prompt with DNA
        system_prompt = self._build_system_prompt(clone_def, custom_context)
        
        # Spawn agent with tools
        start_time = datetime.now()
        agent_result = self.proxy.spawn_agent(
            task=task,
            tools=clone_def.tools,
            system_prompt=system_prompt,
            max_tool_calls=max_tool_calls
        )
        
        return CloneResult(
            clone_id=clone_id,
            clone_type=clone_type,
            task=task,
            success=agent_result.success,
            result=agent_result.result,
            tool_calls=agent_result.tool_calls,
            execution_time_ms=agent_result.execution_time_ms,
            error=agent_result.error
        )
    
    def spawn_swarm(
        self,
        tasks: List[Tuple[str, str, Optional[str]]],
        max_concurrent: Optional[int] = None
    ) -> List[CloneResult]:
        """
        Spawn multiple clones in parallel (swarm execution).
        
        Args:
            tasks: List of (clone_type, task, custom_context) tuples
            max_concurrent: Max concurrent clones
        
        Returns:
            List of CloneResults in same order as tasks
        """
        max_workers = max_concurrent or self.config.parallel_limit
        results = [None] * len(tasks)
        
        def run_clone(index: int, clone_type: str, task: str, context: Optional[str]) -> Tuple[int, CloneResult]:
            result = self.spawn_clone(clone_type, task, context)
            return (index, result)
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            for i, (clone_type, task, context) in enumerate(tasks):
                future = executor.submit(run_clone, i, clone_type, task, context)
                futures.append(future)
            
            for future in as_completed(futures):
                index, result = future.result()
                results[index] = result
        
        return results
    
    def list_clone_types(self) -> Dict[str, Dict[str, Any]]:
        """List all available clone types with their capabilities."""
        return {
            name: {
                "name": ct.name,
                "description": ct.description,
                "skills": ct.skills,
                "tools": ct.tools
            }
            for name, ct in CLONE_TYPES.items()
        }


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """CLI interface for Clone Factory."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM Clone Factory")
    parser.add_argument("--spawn", "-s", help="Clone type to spawn")
    parser.add_argument("--task", "-t", help="Task for the clone")
    parser.add_argument("--context", "-c", help="Additional context")
    parser.add_argument("--swarm", action="store_true", help="Run example swarm")
    parser.add_argument("--list", action="store_true", help="List clone types")
    parser.add_argument("--test", action="store_true", help="Run test execution")
    
    args = parser.parse_args()
    
    factory = PRISMCloneFactory()
    
    if args.list:
        print("\n" + "="*70)
        print("PRISM CLONE TYPES")
        print("="*70)
        for name, info in factory.list_clone_types().items():
            print(f"\n{name}:")
            print(f"  Name: {info['name']}")
            print(f"  Description: {info['description']}")
            print(f"  Skills: {', '.join(info['skills'])}")
            print(f"  Tools: {', '.join(info['tools'])}")
        return
    
    if args.test:
        print("\n" + "="*70)
        print("TESTING CLONE FACTORY")
        print("="*70)
        
        # Test skill loading
        print("\nTesting skill loader...")
        loader = SkillLoader()
        skill = loader.load_skill("prism-universal-formulas")
        print(f"  Loaded skill length: {len(skill)} chars")
        
        # Test state loading
        print("\nTesting state loader...")
        state_loader = StateLoader()
        state = state_loader.get_state_summary()
        print(f"  State summary:\n{state[:500]}...")
        
        print("\n✓ Factory components working")
        return
    
    if args.swarm:
        print("\n" + "="*70)
        print("SWARM EXECUTION EXAMPLE")
        print("="*70)
        
        tasks = [
            ("materials", "Validate kc1.1 for 1045 steel", None),
            ("physics", "Compute cutting force for h=0.2mm, b=3mm, kc1.1=1800, mc=0.25", None),
            ("safety", "Check if spindle speed 15000 RPM is safe for steel machining", None)
        ]
        
        print(f"\nSpawning {len(tasks)} clones in parallel...")
        results = factory.spawn_swarm(tasks)
        
        for result in results:
            print(f"\n{'─'*60}")
            print(f"Clone: {result.clone_id} ({result.clone_type})")
            print(f"Task: {result.task}")
            print(f"Success: {result.success}")
            print(f"Tool Calls: {result.tool_calls}")
            print(f"Time: {result.execution_time_ms}ms")
            if result.error:
                print(f"Error: {result.error}")
            else:
                print(f"Result: {result.result[:300]}...")
        return
    
    if args.spawn and args.task:
        print(f"\nSpawning {args.spawn} clone...")
        result = factory.spawn_clone(args.spawn, args.task, args.context)
        
        print("\n" + "="*70)
        print("CLONE RESULT")
        print("="*70)
        print(f"Clone ID: {result.clone_id}")
        print(f"Type: {result.clone_type}")
        print(f"Success: {result.success}")
        print(f"Tool Calls: {result.tool_calls}")
        print(f"Time: {result.execution_time_ms}ms")
        if result.error:
            print(f"Error: {result.error}")
        else:
            print(f"\nResult:\n{result.result}")
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
