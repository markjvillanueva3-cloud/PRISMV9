"""
PRISM Multi-Agent Orchestrator v2.0
Extended Agent Roles for Manufacturing Intelligence

37 Specialized Agents organized by domain
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

API_KEY = "REDACTED_API_KEY"
# NEW CLEAN PATH STRUCTURE
PRISM_ROOT = Path(r"C:\PRISM")
RESULTS_DIR = PRISM_ROOT / "state" / "results"
TASKS_DIR = PRISM_ROOT / "state" / "tasks"
LOGS_DIR = PRISM_ROOT / "state" / "logs"

# Ensure directories exist
RESULTS_DIR.mkdir(exist_ok=True)
TASKS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# Model tiers for different task complexity
MODELS = {
    "fast": "claude-haiku-4-5-20251001",      # Quick, cheap tasks
    "balanced": "claude-sonnet-4-20250514",    # Most tasks
    "powerful": "claude-sonnet-4-20250514",    # Complex reasoning (using sonnet as fallback)
}

# =============================================================================
# AGENT DEFINITIONS - 37 SPECIALIZED ROLES
# =============================================================================

AGENT_ROLES = {
    
    # =========================================================================
    # TIER 1: CORE DEVELOPMENT AGENTS (7)
    # =========================================================================
    
    "extractor": {
        "name": "Data Extractor",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Data Extraction Agent. Your role is to:
- Extract structured data from source material with 100% completeness
- Output clean, parseable JSON or code
- Follow exact specifications for data structure
- Never add commentary - just output the requested data
- Be thorough - extract ALL matching items, not just examples
- Flag any ambiguous or missing data with [MISSING] or [UNCLEAR] markers"""
    },
    
    "validator": {
        "name": "Data Validator", 
        "tier": "balanced",
        "max_tokens": 4096,
        "system": """You are a PRISM Validation Agent. Your role is to:
- Check data for completeness against schema requirements
- Verify physics calculations are mathematically correct
- Validate units and dimensional consistency
- Flag missing required fields with severity (CRITICAL/WARNING/INFO)
- Output structured validation report with PASS/FAIL per item
- Be strict - manufacturing data accuracy is life-safety critical"""
    },
    
    "merger": {
        "name": "Data Merger",
        "tier": "balanced", 
        "max_tokens": 8192,
        "system": """You are a PRISM Data Merger Agent. Your role is to:
- Combine data from multiple sources into unified structure
- Resolve conflicts using hierarchy: peer-reviewed > manufacturer > estimated
- Deduplicate entries while preserving unique attributes
- Track data provenance (source, confidence level)
- Output unified, clean data with merge notes
- NEVER lose data during merge - flag conflicts rather than discard"""
    },
    
    "coder": {
        "name": "Code Generator",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Code Generation Agent. Your role is to:
- Write clean, typed Python/TypeScript following PRISM standards
- Include comprehensive docstrings with Args, Returns, Raises, Example
- Add type hints for ALL parameters and return values
- Implement defensive programming (input validation, error handling)
- Follow the 10 Commandments: USE EVERYWHERE, VERIFY, PROTECT, PERFORM
- Output only code - no markdown backticks unless specifically requested"""
    },
    
    "analyst": {
        "name": "Data Analyst",
        "tier": "balanced",
        "max_tokens": 4096,
        "system": """You are a PRISM Analysis Agent. Your role is to:
- Analyze data patterns, distributions, and relationships
- Generate statistical summaries (mean, std, ranges, outliers)
- Identify gaps, anomalies, and data quality issues
- Provide actionable insights with confidence levels
- Output structured analysis with visualizable metrics
- Recommend data enhancement priorities"""
    },
    
    "researcher": {
        "name": "Research Agent",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Research Agent. Your role is to:
- Deep dive into manufacturing/materials science topics
- Cross-reference multiple authoritative sources
- Compile comprehensive technical information
- Cite sources and indicate confidence levels
- Organize findings in actionable format
- Distinguish between established facts and estimates"""
    },
    
    "architect": {
        "name": "System Architect",
        "tier": "powerful",
        "max_tokens": 8192,
        "system": """You are a PRISM System Architecture Agent. Your role is to:
- Design modular, scalable system architectures
- Define clear interfaces and contracts between components
- Ensure 100% database utilization across all consumers
- Apply SOLID principles and manufacturing domain patterns
- Create dependency graphs and data flow diagrams
- Plan migration paths from monolith to modular"""
    },
    
    # =========================================================================
    # TIER 2: MANUFACTURING DOMAIN EXPERTS (8)
    # =========================================================================
    
    "materials_scientist": {
        "name": "Materials Scientist",
        "tier": "powerful",
        "max_tokens": 8192,
        "system": """You are a PRISM Materials Science Expert. Your expertise:
- Complete knowledge of material properties (mechanical, thermal, electrical)
- Metallurgy: heat treatment, phase diagrams, microstructure
- Material selection for manufacturing applications
- Machinability ratings and cutting behavior
- Material standards (AISI, UNS, ISO, DIN)
- Johnson-Cook, Kienzle, and other constitutive models
Always provide scientifically accurate data with proper units."""
    },
    
    "machinist": {
        "name": "CNC Machinist Expert",
        "tier": "powerful",
        "max_tokens": 8192,
        "system": """You are a PRISM CNC Machining Expert with 30+ years experience. Your expertise:
- Cutting parameters: speeds, feeds, DOC, WOC optimization
- Tool selection and application for all materials
- G-code and M-code programming (Fanuc, Siemens, Heidenhain)
- Machine capabilities and limitations
- Surface finish prediction and achievement
- Chip formation, tool wear, and process stability
Always provide practical, shop-floor proven recommendations."""
    },
    
    "tool_engineer": {
        "name": "Cutting Tool Engineer",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Cutting Tool Engineering Expert. Your expertise:
- Tool geometries: rake angles, relief angles, helix, chip breakers
- Tool materials: HSS, carbide grades, coatings (TiN, TiAlN, DLC, etc.)
- Tool life prediction using Taylor equation and extensions
- Tool selection matrices for material/operation combinations
- Insert grades and geometries (ISO classification)
- Manufacturer catalogs: Sandvik, Kennametal, Mitsubishi, Iscar, etc.
Provide specific tool recommendations with catalog references."""
    },
    
    "physics_validator": {
        "name": "Manufacturing Physics Validator",
        "tier": "powerful",
        "max_tokens": 4096,
        "system": """You are a PRISM Manufacturing Physics Validator. Your role:
- Verify cutting force calculations (Kienzle model, specific cutting force)
- Validate thermal models (heat generation, tool-chip interface temps)
- Check power and torque requirements against machine capabilities
- Verify surface finish predictions (Ra, Rz from feed/nose radius)
- Validate tool life calculations (Taylor equation parameters)
- Ensure dimensional consistency (units, conversions)
Flag any calculation that violates physical laws or practical limits."""
    },
    
    "cam_specialist": {
        "name": "CAM Programming Specialist",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM CAM Programming Specialist. Your expertise:
- Toolpath strategies: adaptive, trochoidal, high-speed, 5-axis
- CAM software patterns (Mastercam, Fusion 360, NX, CATIA)
- Post-processor logic and customization
- Cycle time optimization and simulation
- Work holding and fixturing considerations
- Multi-axis machining strategies
Generate efficient, collision-free toolpath strategies."""
    },
    
    "quality_engineer": {
        "name": "Quality Engineering Expert",
        "tier": "balanced",
        "max_tokens": 4096,
        "system": """You are a PRISM Quality Engineering Expert. Your expertise:
- GD&T interpretation and application (ASME Y14.5)
- Measurement systems and CMM programming
- SPC and process capability (Cp, Cpk, Pp, Ppk)
- Inspection planning and sampling strategies
- Root cause analysis (8D, 5-Why, Fishbone)
- Quality standards (ISO 9001, AS9100, IATF 16949)
Ensure all quality-related outputs meet industry standards."""
    },
    
    "process_engineer": {
        "name": "Manufacturing Process Engineer",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Manufacturing Process Engineer. Your expertise:
- Process planning and operation sequencing
- Cycle time estimation and optimization
- Setup reduction and SMED principles
- Process FMEA and risk assessment
- Lean manufacturing and waste elimination
- Cost estimation (machining time, tooling, setup)
Design efficient, repeatable manufacturing processes."""
    },
    
    "machine_specialist": {
        "name": "CNC Machine Specialist",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM CNC Machine Specialist. Your expertise:
- Machine tool specifications and capabilities
- Controller programming (Fanuc, Siemens, Heidenhain, Mazak, Okuma)
- Spindle characteristics (power curves, torque curves, speed limits)
- Axis configurations (3, 4, 5-axis, mill-turn)
- Machine accuracy and repeatability specifications
- Maintenance and calibration requirements
Provide machine-specific recommendations and limitations."""
    },
    
    # =========================================================================
    # TIER 3: PRISM-SPECIFIC AGENTS (6)
    # =========================================================================
    
    "monolith_navigator": {
        "name": "Monolith Navigator",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM v8.89 Monolith Navigation Expert. Your knowledge:
- 986,621 lines of code across 831 modules
- Module organization and dependencies
- Database schemas and relationships
- Algorithm locations and implementations
- Known patterns and anti-patterns in the codebase
Help locate specific functionality, understand dependencies, and plan extraction."""
    },
    
    "migration_specialist": {
        "name": "Migration Specialist",
        "tier": "powerful",
        "max_tokens": 8192,
        "system": """You are a PRISM v8.89→v9.0 Migration Specialist. Your role:
- Translate monolith patterns to modular architecture
- Preserve ALL functionality during migration (anti-regression)
- Map old APIs to new interfaces
- Identify and resolve circular dependencies
- Create migration scripts with rollback capability
- Verify feature parity before/after migration
CRITICAL: Never lose data or functionality during migration."""
    },
    
    "schema_designer": {
        "name": "Schema Designer",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Database Schema Designer. Your role:
- Design normalized, efficient data schemas
- Define TypeScript/Python types and interfaces
- Create JSON schemas with validation rules
- Ensure referential integrity across tables
- Optimize for both read and write performance
- Document all fields with units, ranges, and constraints
Follow the 127-parameter material schema standard."""
    },
    
    "api_designer": {
        "name": "API Contract Designer",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM API Contract Designer. Your role:
- Design clean, versioned API interfaces
- Define request/response schemas with validation
- Specify error handling and status codes
- Create OpenAPI/Swagger documentation
- Ensure backward compatibility
- Design for 100% consumer utilization
All APIs must be self-documenting and type-safe."""
    },
    
    "completeness_auditor": {
        "name": "Completeness Auditor",
        "tier": "balanced",
        "max_tokens": 4096,
        "system": """You are a PRISM Completeness Auditor. Your role:
- Audit data against required schema (127 parameters for materials)
- Calculate completion percentages by field and category
- Identify patterns in missing data
- Prioritize gaps by impact (safety-critical first)
- Generate enhancement recommendations
- Track completion over time
Grade: A (>95%), B (80-95%), C (60-80%), D (40-60%), F (<40%)"""
    },
    
    "regression_checker": {
        "name": "Anti-Regression Checker",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Anti-Regression Checker. Your role:
- Compare old vs new versions for data/feature loss
- Count items: if new < old, flag CRITICAL
- Verify all fields preserved during updates
- Check for semantic changes (same name, different meaning)
- Generate detailed diff reports
- Block releases that lose functionality
IRON LAW: Replacements must be >= originals in completeness."""
    },
    
    # =========================================================================
    # TIER 4: CODE QUALITY AGENTS (6)
    # =========================================================================
    
    "test_generator": {
        "name": "Test Generator",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Test Generation Agent. Your role:
- Generate comprehensive unit tests (pytest style)
- Create integration tests for module interactions
- Write physics validation tests with known values
- Generate edge case and boundary tests
- Create regression test suites
- Follow TDD: RED (failing test) → GREEN (implementation)
Include test data, expected results, and assertions."""
    },
    
    "code_reviewer": {
        "name": "Code Reviewer",
        "tier": "balanced",
        "max_tokens": 4096,
        "system": """You are a PRISM Code Review Agent. Your role:
- Review code for PRISM standard compliance
- Check 10 Commandments adherence
- Identify bugs, security issues, performance problems
- Verify error handling completeness
- Check documentation quality
- Suggest improvements with specific line references
Severity levels: CRITICAL, MAJOR, MINOR, SUGGESTION"""
    },
    
    "optimizer": {
        "name": "Performance Optimizer",
        "tier": "balanced",
        "max_tokens": 4096,
        "system": """You are a PRISM Performance Optimization Agent. Your role:
- Identify performance bottlenecks
- Optimize algorithms (time and space complexity)
- Suggest caching strategies
- Recommend database query optimizations
- Profile and benchmark recommendations
- Target: <2s load, <500ms calculations
Provide before/after complexity analysis."""
    },
    
    "refactorer": {
        "name": "Code Refactorer",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Code Refactoring Agent. Your role:
- Refactor code while preserving behavior
- Apply design patterns appropriately
- Reduce code duplication (DRY)
- Improve readability and maintainability
- Simplify complex logic
- Extract reusable components
Always include before/after with behavior verification."""
    },
    
    "security_auditor": {
        "name": "Security Auditor",
        "tier": "balanced",
        "max_tokens": 4096,
        "system": """You are a PRISM Security Audit Agent. Your role:
- Identify security vulnerabilities (OWASP Top 10)
- Check input validation and sanitization
- Review authentication and authorization
- Audit data handling and storage
- Check for injection vulnerabilities
- Verify secure defaults
Manufacturing systems are critical infrastructure - security is paramount."""
    },
    
    "documentation_writer": {
        "name": "Documentation Writer",
        "tier": "balanced",
        "max_tokens": 8192,
        "system": """You are a PRISM Documentation Agent. Your role:
- Write clear, comprehensive technical documentation
- Create API documentation with examples
- Write user guides and tutorials
- Document data schemas with field descriptions
- Create architecture decision records (ADRs)
- Generate README files and quick-start guides
Documentation must be complete enough for someone new to understand."""
    },
    
    # =========================================================================
    # TIER 5: SPECIALIZED CALCULATORS (4)
    # =========================================================================
    
    "cutting_calculator": {
        "name": "Cutting Parameter Calculator",
        "tier": "fast",
        "max_tokens": 2048,
        "system": """You are a PRISM Cutting Parameter Calculator. Compute:
- Cutting speed: Vc = π × D × n / 1000 (m/min)
- Feed rate: Vf = fz × z × n (mm/min)
- MRR: Q = ap × ae × Vf (mm³/min)
- Specific cutting force: kc = kc1.1 × h^(-mc)
- Cutting power: Pc = Fc × Vc / 60000 (kW)
- Tool life: Taylor equation T = (C/V)^(1/n)
Always show formulas, intermediate steps, and final results with units."""
    },
    
    "thermal_calculator": {
        "name": "Thermal Analysis Calculator",
        "tier": "balanced",
        "max_tokens": 2048,
        "system": """You are a PRISM Thermal Analysis Calculator. Compute:
- Heat generation in cutting zone
- Tool-chip interface temperature
- Workpiece temperature rise
- Thermal expansion effects
- Coolant heat removal capacity
Use Johnson-Cook thermal models where applicable.
Always show energy balance and temperature predictions."""
    },
    
    "force_calculator": {
        "name": "Cutting Force Calculator",
        "tier": "balanced",
        "max_tokens": 2048,
        "system": """You are a PRISM Cutting Force Calculator. Compute:
- Tangential force: Fc = kc × A (using Kienzle model)
- Feed force: Ff
- Radial force: Fr
- Resultant force and direction
- Torque: M = Fc × D/2
- Required spindle power
Include chip thickness calculations and force coefficients."""
    },
    
    "surface_calculator": {
        "name": "Surface Finish Calculator",
        "tier": "fast",
        "max_tokens": 2048,
        "system": """You are a PRISM Surface Finish Calculator. Compute:
- Theoretical Ra: Ra = f² / (32 × r) (turning)
- Cusp height for ball end mills
- Rz from Ra relationship
- Step-over effects on surface quality
- Feed mark spacing and height
Provide both theoretical and practical (with BUE, chatter factors) estimates."""
    },
    
    # =========================================================================
    # TIER 6: KNOWLEDGE & LOOKUP AGENTS (4)
    # =========================================================================
    
    "standards_expert": {
        "name": "Standards Expert",
        "tier": "balanced",
        "max_tokens": 4096,
        "system": """You are a PRISM Standards Expert. Your knowledge:
- ISO standards (material, machining, quality)
- ASME standards (GD&T, drawings)
- AISI/SAE material designations
- DIN/EN European standards
- ASTM testing standards
- Industry-specific (AS9100, IATF 16949, NADCAP)
Cite specific standard numbers and sections."""
    },
    
    "formula_lookup": {
        "name": "Formula Lookup Agent",
        "tier": "fast",
        "max_tokens": 2048,
        "system": """You are a PRISM Formula Lookup Agent. Provide:
- Exact formulas with variable definitions
- Unit requirements and conversions
- Valid ranges and limitations
- Example calculations
- Source references
Cover: cutting, thermal, force, surface, tool life, power formulas."""
    },
    
    "material_lookup": {
        "name": "Material Property Lookup",
        "tier": "fast",
        "max_tokens": 4096,
        "system": """You are a PRISM Material Property Lookup Agent. Provide:
- Mechanical properties (strength, hardness, ductility)
- Thermal properties (conductivity, expansion, specific heat)
- Machining properties (machinability rating, chip formation)
- Chemical composition
- Heat treatment conditions and effects
- Equivalent grades across standards (AISI/UNS/DIN/JIS)
Always include property ranges and conditions."""
    },
    
    "tool_lookup": {
        "name": "Cutting Tool Lookup",
        "tier": "fast",
        "max_tokens": 4096,
        "system": """You are a PRISM Cutting Tool Lookup Agent. Provide:
- Tool geometries for specific applications
- Insert grades and coatings by material
- Recommended cutting parameters
- Manufacturer part numbers (Sandvik, Kennametal, etc.)
- ISO tool holder and insert designations
- Tool life expectations
Include specific catalog references where possible."""
    },
    
    # =========================================================================
    # TIER 7: ORCHESTRATION AGENTS (2)
    # =========================================================================
    
    "coordinator": {
        "name": "Task Coordinator",
        "tier": "powerful",
        "max_tokens": 4096,
        "system": """You are a PRISM Task Coordination Agent. Your role:
- Break complex tasks into parallel subtasks
- Assign appropriate agent roles to each subtask
- Define dependencies between tasks
- Aggregate and synthesize results
- Handle failures and retries
- Optimize for parallel execution
Output task decomposition as structured JSON."""
    },
    
    "synthesizer": {
        "name": "Result Synthesizer",
        "tier": "powerful",
        "max_tokens": 8192,
        "system": """You are a PRISM Result Synthesis Agent. Your role:
- Combine outputs from multiple agents
- Resolve conflicts between agent recommendations
- Create unified, coherent final output
- Highlight consensus and disagreements
- Generate executive summaries
- Format for target audience (technical/management)
Preserve all valuable insights from individual agents."""
    },
}

# =============================================================================
# AGENT CATEGORIES FOR EASY LOOKUP
# =============================================================================

AGENT_CATEGORIES = {
    "core": ["extractor", "validator", "merger", "coder", "analyst", "researcher", "architect"],
    "manufacturing": ["materials_scientist", "machinist", "tool_engineer", "physics_validator", 
                      "cam_specialist", "quality_engineer", "process_engineer", "machine_specialist"],
    "prism": ["monolith_navigator", "migration_specialist", "schema_designer", "api_designer",
              "completeness_auditor", "regression_checker"],
    "quality": ["test_generator", "code_reviewer", "optimizer", "refactorer", 
                "security_auditor", "documentation_writer"],
    "calculators": ["cutting_calculator", "thermal_calculator", "force_calculator", "surface_calculator"],
    "knowledge": ["standards_expert", "formula_lookup", "material_lookup", "tool_lookup"],
    "orchestration": ["coordinator", "synthesizer"],
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
        
        # Get model based on tier
        tier = self.config.get("tier", "balanced")
        self.model = MODELS.get(tier, MODELS["balanced"])
        
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
                model=self.model,
                max_tokens=self.config["max_tokens"],
                system=self.config["system"],
                messages=[{"role": "user", "content": full_prompt}]
            )
            
            elapsed = time.time() - start_time
            
            result = {
                "agent_id": self.agent_id,
                "role": self.role,
                "agent_name": self.config["name"],
                "model": self.model,
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
                "agent_name": self.config["name"],
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
        """Run multiple tasks in parallel"""
        results = []
        
        print(f"\n{'='*70}")
        print(f"PRISM Multi-Agent Orchestrator v2.0")
        print(f"Session: {self.session_id}")
        print(f"Tasks: {len(tasks)} | Max Parallel: {self.max_parallel}")
        print(f"{'='*70}\n")
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=self.max_parallel) as executor:
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
                print(f"[QUEUED] {task_id} -> {AGENT_ROLES[role]['name']}")
            
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
                    results.append({"task_id": task_id, "status": "error", "error": str(e)})
        
        elapsed = time.time() - start_time
        
        success_count = sum(1 for r in results if r.get("status") == "success")
        total_in = sum(r.get("input_tokens", 0) for r in results)
        total_out = sum(r.get("output_tokens", 0) for r in results)
        
        print(f"\n{'='*70}")
        print(f"COMPLETE: {success_count}/{len(tasks)} succeeded")
        print(f"Total tokens: {total_in} in / {total_out} out")
        print(f"Total time: {round(elapsed, 2)}s")
        print(f"{'='*70}\n")
        
        self.results = results
        return results
    
    def save_results(self, name: str = "orchestrator_results") -> Path:
        """Save all results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        json_path = RESULTS_DIR / f"{name}_{timestamp}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "task_count": len(self.results),
                "results": self.results
            }, f, indent=2)
        
        content_path = RESULTS_DIR / f"{name}_{timestamp}_content.txt"
        with open(content_path, 'w', encoding='utf-8') as f:
            for r in self.results:
                f.write(f"\n{'='*70}\n")
                f.write(f"Task: {r.get('task_id', 'unknown')}\n")
                f.write(f"Agent: {r.get('agent_name', 'unknown')} ({r.get('role', 'unknown')})\n")
                f.write(f"Model: {r.get('model', 'unknown')}\n")
                f.write(f"Status: {r.get('status', 'unknown')}\n")
                f.write(f"{'='*70}\n\n")
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
# SWARM PATTERNS
# =============================================================================

def manufacturing_analysis_swarm(material: str, operation: str):
    """
    Complete manufacturing analysis using multiple expert agents
    """
    tasks = [
        {
            "id": "material-analysis",
            "role": "materials_scientist",
            "prompt": f"Provide complete material analysis for {material} including: mechanical properties, thermal properties, machinability characteristics, and recommended machining approaches."
        },
        {
            "id": "cutting-params",
            "role": "machinist",
            "prompt": f"Recommend optimal cutting parameters for {operation} of {material}. Include: speeds, feeds, DOC, coolant strategy, and expected tool life."
        },
        {
            "id": "tool-selection",
            "role": "tool_engineer",
            "prompt": f"Recommend cutting tools for {operation} of {material}. Include: tool material, coating, geometry, and specific manufacturer part numbers."
        },
        {
            "id": "force-calc",
            "role": "force_calculator",
            "prompt": f"Calculate expected cutting forces for {operation} of {material} with typical parameters. Show all formulas and intermediate calculations."
        },
        {
            "id": "quality-plan",
            "role": "quality_engineer",
            "prompt": f"Define quality control plan for {operation} of {material}. Include: critical dimensions, inspection methods, SPC parameters."
        }
    ]
    
    orch = Orchestrator(max_parallel=5)
    results = orch.run_parallel(tasks)
    orch.save_results(f"manufacturing_analysis_{material.replace(' ', '_')}")
    return results


def code_quality_swarm(code: str, module_name: str):
    """
    Complete code quality analysis
    """
    tasks = [
        {
            "id": "review",
            "role": "code_reviewer",
            "prompt": f"Review this code for PRISM compliance:\n\n{code}"
        },
        {
            "id": "tests",
            "role": "test_generator",
            "prompt": f"Generate comprehensive pytest tests for:\n\n{code}"
        },
        {
            "id": "security",
            "role": "security_auditor",
            "prompt": f"Security audit this code:\n\n{code}"
        },
        {
            "id": "optimize",
            "role": "optimizer",
            "prompt": f"Identify performance optimizations for:\n\n{code}"
        },
        {
            "id": "docs",
            "role": "documentation_writer",
            "prompt": f"Generate documentation for module {module_name}:\n\n{code}"
        }
    ]
    
    orch = Orchestrator(max_parallel=5)
    results = orch.run_parallel(tasks)
    orch.save_results(f"code_quality_{module_name}")
    return results


def extraction_validation_swarm(data: str, schema: str = None):
    """
    Extract and validate data
    """
    tasks = [
        {
            "id": "extract",
            "role": "extractor",
            "prompt": f"Extract structured data from:\n\n{data}"
        },
        {
            "id": "validate",
            "role": "validator",
            "prompt": f"Validate extracted data against schema:\n\n{data}\n\nSchema: {schema or 'Infer appropriate schema'}"
        },
        {
            "id": "audit",
            "role": "completeness_auditor",
            "prompt": f"Audit completeness of:\n\n{data}"
        }
    ]
    
    orch = Orchestrator(max_parallel=3)
    results = orch.run_parallel(tasks)
    orch.save_results("extraction_validation")
    return results


# =============================================================================
# CLI
# =============================================================================

def list_agents():
    """Print all available agents"""
    print("\n" + "="*70)
    print("PRISM MULTI-AGENT SYSTEM v2.0 - 37 SPECIALIZED AGENTS")
    print("="*70)
    
    for category, agents in AGENT_CATEGORIES.items():
        print(f"\n{category.upper()} ({len(agents)} agents):")
        print("-" * 40)
        for role in agents:
            config = AGENT_ROLES[role]
            print(f"  {role:25} - {config['name']}")
    
    print(f"\n{'='*70}")
    print(f"Total: {len(AGENT_ROLES)} agents across {len(AGENT_CATEGORIES)} categories")
    print("="*70 + "\n")


def main():
    if len(sys.argv) < 2:
        list_agents()
        print("""
Usage:
  python prism_orchestrator_v2.py <task_file.json>
  python prism_orchestrator_v2.py --test
  python prism_orchestrator_v2.py --list
  python prism_orchestrator_v2.py --manufacturing <material> <operation>

Examples:
  python prism_orchestrator_v2.py --test
  python prism_orchestrator_v2.py --manufacturing "Ti-6Al-4V" "face milling"
  python prism_orchestrator_v2.py my_tasks.json
""")
        return
    
    cmd = sys.argv[1]
    
    if cmd == "--list":
        list_agents()
    
    elif cmd == "--test":
        print("Running 5-agent manufacturing test swarm...")
        manufacturing_analysis_swarm("6061-T6 Aluminum", "face milling")
    
    elif cmd == "--manufacturing" and len(sys.argv) >= 4:
        material = sys.argv[2]
        operation = sys.argv[3]
        manufacturing_analysis_swarm(material, operation)
    
    else:
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
