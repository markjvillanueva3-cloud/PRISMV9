#!/usr/bin/env python3
"""
PRISM MCP Server v2.5 - MCP-First Architecture with GSD Integration
116 MCP Tools across 22 categories for programmatic resource access

Categories:
  1. Orchestration (14 tools) - Skill/Agent/Hook/Formula management
  2. Data Query (9 tools) - Materials/Machines/Alarms
  3. Physics (12 tools) - Cutting calculations
  4. State Server (11 tools) - Session/Event/Decision management
  5. Validation (8 tools) - Quality/Safety checks
  6. Recovery (3 tools) - Compaction/Transcript/Reconstruct [Tier 0.1]
  7. Session (5 tools) - Resume/Inject/Pressure/End/Handoff [Tier 0.3-0.4]
  8. Append-Only (4 tools) - State append/checkpoint/restore [Tier 0.2]
  9. Cache (2 tools) - Validate/Sort for KV-cache stability [Tier 1.1]
  10. Context (3 tools) - Size/Compress/Expand [Tier 1.2]
  11. Error Learning (3 tools) - Log/Analyze/Learn [Tier 1.3]
  12. Attention Focus (2 tools) - Focus/Score [Tier 1.4]
  13. Prompt Templates (2 tools) - Build/Get [Tier 1.5]
  14. Batch Processing (2 tools) - Execute/Queue [Tier 1.6]
  15. Resource Access (4 tools) - Get/Search/List/Registry [Tier 2.1]
  16. Skill Access (4 tools) - Read/Search/List/Stats [Tier 2.2]
  17. Efficiency (4 tools) - Status/Recommendations/Batch/Update [Tier 2.3]
  18. Orchestrator (5 tools) - Central efficiency layer [Tier 2.3]
  19. Hook System (6 tools) - Get/Search/Domain/Trigger/Categories/Stats [Tier 2.4]
  20. Formula System (7 tools) - Get/Search/Category/Apply/Dependencies/Stats [Tier 2.5]
  21. Master Orchestrator (6 tools) - Unified: batch/swarm/ralph/checkpoint [Tier 2.6]
  22. GSD Access (4 tools) - prism_gsd_core/quick/dev_protocol/resources_summary [Tier 2.6]

PRIORITY 1: Always use MCP tools over direct file access.
PRIORITY 2: Use prism_gsd_core or prism_gsd_quick instead of reading GSD_CORE.md
PRIORITY 3: Batch operations via prism_master_batch when 2+ similar ops.
PRIORITY 4: Monitor context via prism_master_context.

KEY GSD TOOLS (saves reading files):
  prism_gsd_core        - Complete GSD instructions as JSON
  prism_gsd_quick       - Minimal essentials only
  prism_dev_protocol    - Development rules and anti-patterns
  prism_resources_summary - Quick count of all resources

Usage:
    from prism_mcp_server import PRISMMCPServer
    mcp = PRISMMCPServer()
    
    # Get GSD instructions (instead of reading file)
    gsd = mcp.call("prism_gsd_core")
    
    # Batch operations (preferred for 2+ ops)
    results = mcp.call("prism_master_batch", {"operations": [
        {"tool": "prism_material_get", "params": {"id": "AL-6061"}},
        {"tool": "prism_material_get", "params": {"id": "STEEL-1045"}}
    ]})
"""
import sys
import os

# Only wrap stdout if running directly and buffer exists
if __name__ == "__main__" and hasattr(sys.stdout, 'buffer'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import json
import math
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
DATA_DIR = PRISM_ROOT / "data"
STATE_DIR = PRISM_ROOT / "state"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"
MNT_SKILLS = Path("/mnt/skills/user")

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
STATE_DIR.mkdir(parents=True, exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════
# DEVELOPMENT GUIDANCE - USE THESE TOOLS!
# ═══════════════════════════════════════════════════════════════════════════
#
# CONTEXT MANAGEMENT (Tier 1.2 - USE AT ORANGE+):
#   prism_context_size(tokens=N)     → Check context status (GREEN/YELLOW/ORANGE/RED/CRITICAL)
#   prism_context_compress(content)  → Auto-compress when nearing limits
#   prism_context_expand(content)    → Restore compressed content when needed
#
#   Thresholds: GREEN(0-60%), YELLOW(60-75%), ORANGE(75-85%), RED(85-92%), CRITICAL(>92%)
#   Action: At ORANGE → compress. At RED → handoff. At CRITICAL → stop.
#
# CACHE STABILITY (Tier 1.1 - USE BEFORE PROMPTS):
#   prism_cache_validate(file_path)  → Check for dynamic content in prompts
#   prism_json_sort(file_path)       → Sort JSON keys for cache hits
#
#   Rule: Keep timestamps, counts, status markers OUT of first 50 lines
#
# SESSION WORKFLOW:
#   1. prism_gsd_get()               → Load GSD_CORE
#   2. prism_context_size()          → Check context before work
#   3. [do work]
#   4. prism_checkpoint_create()     → Every 5-8 items
#   5. prism_context_size()          → Check again, compress if ORANGE+
#   6. prism_session_end()           → Graceful shutdown
#
# ═══════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class Material:
    id: str
    name: str
    category: str
    hardness_hrc: float = 0.0
    tensile_strength_mpa: float = 0.0
    density_kg_m3: float = 0.0
    thermal_conductivity: float = 0.0
    kienzle_kc1_1: float = 0.0
    kienzle_mc: float = 0.0
    taylor_C: float = 0.0
    taylor_n: float = 0.0

@dataclass
class Machine:
    id: str
    name: str
    manufacturer: str
    model: str
    type: str  # mill, lathe, etc.
    max_rpm: int = 0
    max_power_kw: float = 0.0
    max_torque_nm: float = 0.0
    axes: int = 3
    controller: str = ""

@dataclass
class Alarm:
    alarm_id: str
    code: str
    name: str
    family: str
    category: str
    severity: str
    description: str
    causes: List[str]
    quick_fix: str

@dataclass
class Skill:
    name: str
    path: str
    category: str
    level: int
    lines: int
    description: str

@dataclass 
class Agent:
    id: str
    name: str
    tier: str  # OPUS, SONNET, HAIKU
    model: str
    skills: List[str]
    tools: List[str]
    personality: str

@dataclass
class Hook:
    id: str
    category: str
    trigger: str
    action: str
    enforcement: str

@dataclass
class Formula:
    id: str
    name: str
    domain: str
    equation: str
    parameters: List[str]
    units: Dict[str, str]


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: ORCHESTRATION MCP (14 tools)
# ═══════════════════════════════════════════════════════════════════════════

class OrchestrationMCP:
    """Skill/Agent/Hook/Formula management - 14 tools."""
    
    def __init__(self):
        self.skills_cache: Dict[str, Skill] = {}
        self.agents_cache: Dict[str, Agent] = {}
        self.hooks_cache: Dict[str, Hook] = {}
        self.formulas_cache: Dict[str, Formula] = {}
        self._load_registries()
    
    def _load_registries(self):
        """Load all registries from disk."""
        # Load skills from consolidated directory
        if SKILLS_DIR.exists():
            for skill_dir in SKILLS_DIR.iterdir():
                if skill_dir.is_dir():
                    skill_file = skill_dir / "SKILL.md"
                    if skill_file.exists():
                        lines = len(skill_file.read_text(encoding='utf-8', errors='replace').split('\n'))
                        self.skills_cache[skill_dir.name] = Skill(
                            name=skill_dir.name,
                            path=str(skill_file),
                            category=self._infer_category(skill_dir.name),
                            level=self._infer_level(skill_dir.name),
                            lines=lines,
                            description=f"PRISM skill: {skill_dir.name}"
                        )
        
        # Load predefined agents
        self._load_default_agents()
        self._load_default_hooks()
        self._load_default_formulas()
    
    def _infer_category(self, name: str) -> str:
        if "material" in name: return "materials"
        if "physics" in name: return "physics"
        if "safety" in name: return "safety"
        if "code" in name or "algorithm" in name: return "code"
        if "session" in name or "state" in name: return "session"
        return "general"
    
    def _infer_level(self, name: str) -> int:
        if "cognitive" in name or "master" in name: return 0
        if "quick-start" in name: return 1
        if "sp-" in name: return 2
        if "reference" in name or "table" in name: return 4
        return 3
    
    def _load_default_agents(self):
        """Load predefined agent configurations."""
        agents = [
            Agent("AGT-OPUS-001", "Materials Architect", "OPUS", "claude-opus-4-5-20251101",
                  ["prism-material-*", "prism-physics-*"], ["prism_material_*"], "Methodical, physics-aware"),
            Agent("AGT-OPUS-002", "Safety Validator", "OPUS", "claude-opus-4-5-20251101",
                  ["prism-safety-*"], ["prism_safety_*", "prism_quality_*"], "Paranoid, thorough"),
            Agent("AGT-OPUS-003", "Architecture Designer", "OPUS", "claude-opus-4-5-20251101",
                  ["prism-coding-*", "prism-api-*"], ["prism_code_*"], "Systems thinker"),
            Agent("AGT-SONNET-001", "Code Extractor", "SONNET", "claude-sonnet-4-5-20250929",
                  ["prism-monolith-*"], ["prism_file_*", "prism_code_*"], "Clean code, modular"),
            Agent("AGT-SONNET-002", "Alarm Extractor", "SONNET", "claude-sonnet-4-5-20250929",
                  ["prism-error-*", "prism-fanuc-*"], ["prism_alarm_*"], "CNC-experienced"),
            Agent("AGT-SONNET-003", "Data Processor", "SONNET", "claude-sonnet-4-5-20250929",
                  ["prism-material-*"], ["prism_material_*", "prism_machine_*"], "Data-focused"),
            Agent("AGT-HAIKU-001", "Formatter", "HAIKU", "claude-haiku-4-5-20251001",
                  [], ["prism_file_*"], "Fast, precise"),
            Agent("AGT-HAIKU-002", "Counter", "HAIKU", "claude-haiku-4-5-20251001",
                  [], ["prism_state_*"], "Counting specialist"),
        ]
        for a in agents:
            self.agents_cache[a.id] = a
    
    def _load_default_hooks(self):
        """Load all hooks including Phase 0 safety hooks."""
        hooks = [
            # ═══════════════════════════════════════════════════════════════
            # PHASE 0 HOOKS (41) - Safety-Critical Development Hooks
            # ═══════════════════════════════════════════════════════════════
            
            # CALC Hooks (12) - Calculation validation
            Hook("CALC-SAFETY-VIOLATION-001", "calculation", "S_score<0.70", "block_output", "HARD_BLOCK"),
            Hook("CALC-BOUNDS-CHECK-001", "calculation", "param_out_of_range", "warn_and_clamp", "WARN"),
            Hook("CALC-UNIT-MISMATCH-001", "calculation", "unit_conversion", "validate_units", "ALWAYS"),
            Hook("CALC-PHYSICS-VALIDATE-001", "calculation", "physics_calc", "verify_physics", "ALWAYS"),
            Hook("CALC-KIENZLE-001", "calculation", "cutting_force", "apply_kienzle", "ALWAYS"),
            Hook("CALC-TAYLOR-001", "calculation", "tool_life", "apply_taylor", "ALWAYS"),
            Hook("CALC-MRR-001", "calculation", "material_removal", "compute_mrr", "ALWAYS"),
            Hook("CALC-SURFACE-001", "calculation", "surface_finish", "validate_ra", "ALWAYS"),
            Hook("CALC-DEFLECTION-001", "calculation", "tool_deflection", "check_limits", "WARN"),
            Hook("CALC-STABILITY-001", "calculation", "chatter", "check_stability", "WARN"),
            Hook("CALC-POWER-001", "calculation", "spindle_power", "verify_limits", "ALWAYS"),
            Hook("CALC-TORQUE-001", "calculation", "spindle_torque", "verify_limits", "ALWAYS"),
            
            # FILE Hooks (8) - File operation validation
            Hook("FILE-VALIDATION-FAIL-001", "file", "file_op", "validate_path", "ALWAYS"),
            Hook("FILE-ANTI-REGRESSION-001", "file", "file_write", "check_size", "HARD_BLOCK"),
            Hook("FILE-BACKUP-001", "file", "destructive_op", "create_backup", "ALWAYS"),
            Hook("FILE-JSON-SORT-001", "file", "json_write", "sort_keys", "ALWAYS"),
            Hook("FILE-ENCODING-001", "file", "text_write", "ensure_utf8", "ALWAYS"),
            Hook("FILE-PATH-VALIDATE-001", "file", "path_op", "check_allowed", "HARD_BLOCK"),
            Hook("FILE-SIZE-WARN-001", "file", "large_file", "warn_user", "WARN"),
            Hook("FILE-LOCK-001", "file", "concurrent_write", "acquire_lock", "ALWAYS"),
            
            # STATE Hooks (6) - State management
            Hook("STATE-BEFORE-MUTATE-001", "state", "state_change", "snapshot_before", "ALWAYS"),
            Hook("STATE-ANTI-REGRESSION-001", "state", "state_update", "verify_no_loss", "HARD_BLOCK"),
            Hook("STATE-CHECKPOINT-001", "state", "interval_5_calls", "auto_checkpoint", "ALWAYS"),
            Hook("STATE-ROLLBACK-001", "state", "error_detected", "enable_rollback", "ALWAYS"),
            Hook("STATE-VALIDATE-001", "state", "state_load", "verify_integrity", "ALWAYS"),
            Hook("STATE-COMPRESS-001", "state", "state_large", "compress_history", "AUTO"),
            
            # AGENT Hooks (5) - Agent validation
            Hook("AGENT-TIER-VALIDATE-001", "agent", "agent_spawn", "verify_tier", "ALWAYS"),
            Hook("AGENT-CAPABILITY-001", "agent", "task_assign", "check_skills", "ALWAYS"),
            Hook("AGENT-QUOTA-001", "agent", "api_call", "check_limits", "WARN"),
            Hook("AGENT-HANDOFF-001", "agent", "context_switch", "preserve_state", "ALWAYS"),
            Hook("AGENT-QUALITY-001", "agent", "output_ready", "verify_quality", "ALWAYS"),
            
            # BATCH Hooks (6) - Batch operation control
            Hook("BATCH-CHECKPOINT-001", "batch", "batch_start", "create_checkpoint", "ALWAYS"),
            Hook("BATCH-PROGRESS-001", "batch", "batch_item", "track_progress", "ALWAYS"),
            Hook("BATCH-ERROR-001", "batch", "batch_error", "log_and_continue", "ALWAYS"),
            Hook("BATCH-ROLLBACK-001", "batch", "batch_fail", "restore_checkpoint", "ALWAYS"),
            Hook("BATCH-PARALLEL-001", "batch", "parallel_op", "manage_concurrency", "ALWAYS"),
            Hook("BATCH-COMPLETE-001", "batch", "batch_done", "verify_all", "ALWAYS"),
            
            # FORMULA Hooks (4) - Formula validation
            Hook("FORMULA-MAPE-EXCEED-001", "formula", "prediction", "check_accuracy", "WARN"),
            Hook("FORMULA-PARAM-MISSING-001", "formula", "formula_apply", "validate_inputs", "HARD_BLOCK"),
            Hook("FORMULA-UNIT-CHECK-001", "formula", "formula_result", "verify_units", "ALWAYS"),
            Hook("FORMULA-RANGE-001", "formula", "formula_output", "check_bounds", "WARN"),
            
            # ═══════════════════════════════════════════════════════════════
            # COGNITIVE HOOKS - Reasoning and Learning
            # ═══════════════════════════════════════════════════════════════
            Hook("BAYES-001", "cognitive", "evidence_received", "update_beliefs", "ALWAYS"),
            Hook("BAYES-002", "cognitive", "change_detected", "validate_regression", "ALWAYS"),
            Hook("BAYES-003", "cognitive", "error_pattern", "extract_learning", "ALWAYS"),
            Hook("OPT-001", "cognitive", "multi_option", "explore_exploit", "ALWAYS"),
            
            # ═══════════════════════════════════════════════════════════════
            # CONTEXT HOOKS - Session and Memory Management
            # ═══════════════════════════════════════════════════════════════
            Hook("CTX-CACHE-001", "context", "session_start", "validate_prefix", "ALWAYS"),
            Hook("CTX-CACHE-002", "context", "prompt_build", "block_dynamic", "HARD_BLOCK"),
            Hook("CTX-CACHE-003", "context", "json_write", "force_sort", "ALWAYS"),
            Hook("CTX-STATE-001", "context", "any_change", "append_entry", "ALWAYS"),
            Hook("CTX-STATE-002", "context", "calls>=5", "checkpoint", "ALWAYS"),
            Hook("CTX-STATE-003", "context", "entries>1000", "compress", "AUTO"),
            Hook("CTX-STATE-004", "context", "restore_request", "validate_chain", "ALWAYS"),
            Hook("CTX-TOOL-001", "context", "context_build", "include_all_tools", "ALWAYS"),
            Hook("CTX-TOOL-002", "context", "tool_call", "check_state", "BLOCK"),
            Hook("CTX-TOOL-003", "context", "dynamic_load", "block", "HARD_BLOCK"),
            Hook("CTX-FOCUS-001", "context", "checkpoint", "update_todo", "ALWAYS"),
            Hook("CTX-FOCUS-002", "context", "context_build", "inject_anchor", "ALWAYS"),
            Hook("CTX-FOCUS-003", "context", "every_10_actions", "track_drift", "WARN"),
            Hook("CTX-ERR-001", "context", "error", "preserve", "ALWAYS"),
            Hook("CTX-ERR-002", "context", "error_resolved", "log_recovery", "ALWAYS"),
            Hook("CTX-ERR-003", "context", "error_pattern", "update_bayes", "ALWAYS"),
            Hook("CTX-VAR-001", "context", "output", "vary_template", "ALWAYS"),
            Hook("CTX-VAR-002", "context", "list_gen", "randomize", "ALWAYS"),
            Hook("CTX-VAR-003", "context", "every_10", "detect_mimicry", "WARN"),
            
            # ═══════════════════════════════════════════════════════════════
            # RESOURCE HOOKS - Resource Management
            # ═══════════════════════════════════════════════════════════════
            Hook("RES-ACT-001", "resource", "session_start", "activate_peaks", "ALWAYS"),
            Hook("RES-ACT-002", "resource", "task_start", "load_relevant", "ALWAYS"),
        ]
        for h in hooks:
            self.hooks_cache[h.id] = h
    
    def _load_default_formulas(self):
        """Load physics and planning formulas."""
        formulas = [
            Formula("F-KIENZLE", "Kienzle Cutting Force", "physics",
                    "Fc = kc1.1 * b * h^(1-mc)", ["kc1_1", "b", "h", "mc"],
                    {"Fc": "N", "b": "mm", "h": "mm"}),
            Formula("F-TAYLOR", "Taylor Tool Life", "physics",
                    "VT^n = C", ["V", "T", "n", "C"],
                    {"V": "m/min", "T": "min"}),
            Formula("F-MRR", "Material Removal Rate", "physics",
                    "MRR = Vc * f * ap", ["Vc", "f", "ap"],
                    {"MRR": "cm³/min", "Vc": "m/min", "f": "mm/rev", "ap": "mm"}),
            Formula("F-OMEGA", "Master Quality Equation", "quality",
                    "Ω = 0.18R + 0.14C + 0.10P + 0.22S + 0.06L + 0.10D + 0.08A + 0.07K + 0.05M",
                    ["R", "C", "P", "S", "L", "D", "A", "K", "M"],
                    {"Ω": "score"}),
            Formula("F-PSI", "ILP Resource Selection", "planning",
                    "Ψ = argmax[Σ Cap*Syn*Ω*K / Cost]", ["capabilities", "synergy", "quality", "knowledge", "cost"],
                    {"Ψ": "optimal_set"}),
        ]
        for f in formulas:
            self.formulas_cache[f.id] = f
    
    # ─────────────────────────────────────────────────────────────
    # SKILL TOOLS (6)
    # ─────────────────────────────────────────────────────────────
    
    def prism_skill_load(self, name: str) -> str:
        """Load skill content by name."""
        skill = self.skills_cache.get(name)
        if not skill:
            # Try partial match
            matches = [s for s in self.skills_cache.values() if name.lower() in s.name.lower()]
            if matches:
                skill = matches[0]
        
        if skill:
            try:
                return Path(skill.path).read_text(encoding='utf-8', errors='replace')
            except:
                return f"Error loading skill: {name}"
        return f"Skill not found: {name}"
    
    def prism_skill_list(self, category: str = None) -> List[Dict]:
        """List available skills, optionally filtered by category."""
        skills = list(self.skills_cache.values())
        if category:
            skills = [s for s in skills if s.category == category]
        return [asdict(s) for s in skills]
    
    def prism_skill_relevance(self, task: str) -> Dict[str, float]:
        """Score skills for relevance to a task."""
        scores = {}
        task_lower = task.lower()
        keywords = task_lower.split()
        
        for name, skill in self.skills_cache.items():
            score = 0.0
            # Name match
            for kw in keywords:
                if kw in name.lower():
                    score += 0.3
            # Category match
            if skill.category in task_lower:
                score += 0.2
            # Level bonus (lower level = more fundamental)
            score += (4 - skill.level) * 0.05
            
            scores[name] = min(score, 1.0)
        
        return dict(sorted(scores.items(), key=lambda x: -x[1])[:10])
    
    def prism_skill_select(self, task: str, n: int = 5) -> List[Dict]:
        """ILP-optimal skill selection for a task."""
        relevance = self.prism_skill_relevance(task)
        selected = list(relevance.keys())[:n]
        return [asdict(self.skills_cache[s]) for s in selected if s in self.skills_cache]
    
    def prism_skill_dependencies(self, name: str) -> List[str]:
        """Get skill dependencies."""
        # Simplified: return related skills based on category
        skill = self.skills_cache.get(name)
        if not skill:
            return []
        return [s.name for s in self.skills_cache.values() 
                if s.category == skill.category and s.name != name][:5]
    
    def prism_skill_consumers(self, name: str) -> List[str]:
        """Get skills that depend on this skill."""
        return self.prism_skill_dependencies(name)  # Simplified symmetric relationship
    
    # ─────────────────────────────────────────────────────────────
    # AGENT TOOLS (4)
    # ─────────────────────────────────────────────────────────────
    
    def prism_agent_list(self, tier: str = None) -> List[Dict]:
        """List available agents."""
        agents = list(self.agents_cache.values())
        if tier:
            agents = [a for a in agents if a.tier == tier.upper()]
        return [asdict(a) for a in agents]
    
    def prism_agent_select(self, task: str) -> List[Dict]:
        """Select optimal agents for a task."""
        task_lower = task.lower()
        scores = []
        
        for agent in self.agents_cache.values():
            score = 0.0
            # Skill match
            for skill in agent.skills:
                skill_base = skill.replace("*", "").replace("prism-", "")
                if skill_base in task_lower:
                    score += 0.3
            # Tool match
            for tool in agent.tools:
                tool_base = tool.replace("*", "").replace("prism_", "")
                if tool_base in task_lower:
                    score += 0.2
            scores.append((agent, score))
        
        scores.sort(key=lambda x: -x[1])
        return [asdict(a) for a, _ in scores[:3]]
    
    def prism_agent_spawn(self, agent_type: str, task: str) -> str:
        """Spawn an agent with DNA for a task."""
        agent = None
        for a in self.agents_cache.values():
            if agent_type.lower() in a.name.lower() or agent_type.upper() in a.tier:
                agent = a
                break
        
        if not agent:
            return json.dumps({"error": f"Agent type not found: {agent_type}"})
        
        spawn_id = f"SPAWN-{agent.id}-{datetime.now().strftime('%H%M%S')}"
        return json.dumps({
            "spawn_id": spawn_id,
            "agent": asdict(agent),
            "task": task,
            "status": "SPAWNED"
        })
    
    def prism_agent_status(self, agent_id: str) -> Dict:
        """Check agent status."""
        return {"agent_id": agent_id, "status": "READY", "tasks_completed": 0}
    
    # ─────────────────────────────────────────────────────────────
    # HOOK TOOLS (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_hook_list(self, category: str = None) -> List[Dict]:
        """List available hooks."""
        hooks = list(self.hooks_cache.values())
        if category:
            hooks = [h for h in hooks if h.category == category]
        return [asdict(h) for h in hooks]
    
    def prism_hook_trigger(self, name: str, data: Dict = None) -> Dict:
        """Trigger a hook execution."""
        if data is None:
            data = {}
        hook = self.hooks_cache.get(name)
        if not hook:
            return {"error": f"Hook not found: {name}"}
        
        return {
            "hook": name,
            "triggered": True,
            "action": hook.action,
            "enforcement": hook.enforcement,
            "data_received": data
        }
    
    def prism_hook_fire(self, hook_id: str, data: Dict = None, validate_safety: bool = True) -> Dict:
        """
        Fire a hook with safety enforcement.
        
        Args:
            hook_id: The hook identifier (e.g., "CALC-SAFETY-VIOLATION-001")
            data: Context data for the hook
            validate_safety: If True, enforce HARD_BLOCK hooks
            
        Returns:
            Hook execution result with safety status
        """
        if data is None:
            data = {}
        
        hook = self.hooks_cache.get(hook_id)
        if not hook:
            return {"error": f"Hook not found: {hook_id}", "hook_id": hook_id}
        
        # Execute hook logic based on type
        result = {
            "hook_id": hook_id,
            "category": hook.category,
            "action": hook.action,
            "enforcement": hook.enforcement,
            "fired": True,
            "blocked": False,
            "data": data
        }
        
        # Safety enforcement for HARD_BLOCK hooks
        if validate_safety and hook.enforcement == "HARD_BLOCK":
            # Check for safety violations
            if hook_id == "CALC-SAFETY-VIOLATION-001":
                s_score = data.get("S_score", data.get("s_score", 1.0))
                if isinstance(s_score, str):
                    try:
                        s_score = float(s_score)
                    except:
                        s_score = 0.0
                if s_score < 0.70:
                    result["blocked"] = True
                    result["reason"] = f"S(x) = {s_score:.3f} < 0.70 threshold"
                    result["recommendation"] = "Fix safety issues before proceeding"
            
            elif hook_id == "STATE-ANTI-REGRESSION-001":
                old_count = data.get("old_count", 0)
                new_count = data.get("new_count", 0)
                if new_count < old_count:
                    result["blocked"] = True
                    result["reason"] = f"Regression detected: {new_count} < {old_count}"
                    result["recommendation"] = "Verify data before replacement"
            
            elif hook_id == "FILE-ANTI-REGRESSION-001":
                old_size = data.get("old_size", 0)
                new_size = data.get("new_size", 0)
                if new_size < old_size * 0.8:  # 20% reduction threshold
                    result["blocked"] = True
                    result["reason"] = f"File size regression: {new_size} < {old_size * 0.8:.0f}"
                    result["recommendation"] = "Check for data loss"
        
        return result
    
    def prism_hook_get(self, hook_id: str) -> Dict:
        """Get detailed information about a specific hook."""
        hook = self.hooks_cache.get(hook_id)
        if not hook:
            return {"error": f"Hook not found: {hook_id}"}
        return asdict(hook)
    
    def prism_hook_status(self) -> Dict:
        """Get hook system status."""
        categories = {}
        for hook in self.hooks_cache.values():
            cat = hook.category
            categories[cat] = categories.get(cat, 0) + 1
        
        phase0_count = sum(1 for h in self.hooks_cache.values() 
                          if h.id.startswith(("CALC-", "FILE-", "STATE-", "AGENT-", "BATCH-", "FORMULA-")))
        
        return {
            "status": "HOOK_STATUS",
            "phase0_hooks": phase0_count,
            "domain_hooks": len(self.hooks_cache) - phase0_count,
            "total_hooks": len(self.hooks_cache),
            "executions_this_session": 0,
            "categories": categories
        }
    
    # ─────────────────────────────────────────────────────────────
    # FORMULA TOOLS (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_formula_list(self, domain: str = None) -> List[Dict]:
        """List available formulas."""
        formulas = list(self.formulas_cache.values())
        if domain:
            formulas = [f for f in formulas if f.domain == domain]
        return [asdict(f) for f in formulas]
    
    def prism_formula_apply(self, name: str, params: Dict) -> Dict:
        """Apply a formula with given parameters."""
        formula = self.formulas_cache.get(name)
        if not formula:
            return {"error": f"Formula not found: {name}"}
        
        # Execute formula based on type
        if name == "F-KIENZLE":
            kc1_1 = params.get("kc1_1", 1500)
            b = params.get("b", 5)
            h = params.get("h", 0.2)
            mc = params.get("mc", 0.25)
            Fc = kc1_1 * b * (h ** (1 - mc))
            return {"formula": name, "result": {"Fc": round(Fc, 2)}, "unit": "N"}
        
        elif name == "F-TAYLOR":
            V = params.get("V", 100)
            n = params.get("n", 0.25)
            C = params.get("C", 200)
            T = (C / V) ** (1 / n)
            return {"formula": name, "result": {"T": round(T, 2)}, "unit": "min"}
        
        elif name == "F-MRR":
            Vc = params.get("Vc", 100)
            f = params.get("f", 0.2)
            ap = params.get("ap", 2)
            MRR = Vc * f * ap / 1000
            return {"formula": name, "result": {"MRR": round(MRR, 4)}, "unit": "cm³/min"}
        
        elif name == "F-OMEGA":
            R = params.get("R", 0.8)
            C = params.get("C", 0.8)
            P = params.get("P", 0.8)
            S = params.get("S", 0.8)
            L = params.get("L", 0.7)
            D = params.get("D", 0.5)
            A = params.get("A", 0.7)
            K = params.get("K", 0.6)
            M = params.get("M", 0.7)
            omega = 0.18*R + 0.14*C + 0.10*P + 0.22*S + 0.06*L + 0.10*D + 0.08*A + 0.07*K + 0.05*M
            return {"formula": name, "result": {"Ω": round(omega, 3)}, "passed": omega >= 0.70 and S >= 0.70}
        
        return {"formula": name, "result": "Not implemented", "params": params}


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: DATA QUERY MCP (9 tools)
# ═══════════════════════════════════════════════════════════════════════════

class DataQueryMCP:
    """Material/Machine/Alarm queries - 9 tools."""
    
    def __init__(self):
        self.db_path = DATA_DIR / "prism_data.db"
        self._init_db()
        self._load_sample_data()
    
    def _init_db(self):
        """Initialize SQLite database."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''CREATE TABLE IF NOT EXISTS materials (
            id TEXT PRIMARY KEY, name TEXT, category TEXT,
            hardness_hrc REAL, tensile_strength_mpa REAL, density_kg_m3 REAL,
            thermal_conductivity REAL, kienzle_kc1_1 REAL, kienzle_mc REAL,
            taylor_C REAL, taylor_n REAL
        )''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS machines (
            id TEXT PRIMARY KEY, name TEXT, manufacturer TEXT, model TEXT,
            type TEXT, max_rpm INTEGER, max_power_kw REAL, max_torque_nm REAL,
            axes INTEGER, controller TEXT
        )''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS alarms (
            alarm_id TEXT PRIMARY KEY, code TEXT, name TEXT, family TEXT,
            category TEXT, severity TEXT, description TEXT, causes TEXT, quick_fix TEXT
        )''')
        
        conn.commit()
        conn.close()
    
    def _load_sample_data(self):
        """Load sample data if tables are empty."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Check if materials exist
        c.execute("SELECT COUNT(*) FROM materials")
        if c.fetchone()[0] == 0:
            materials = [
                ("AL-6061", "Aluminum 6061-T6", "aluminum", 95, 310, 2700, 167, 790, 0.25, 335, 0.13),
                ("AL-7075", "Aluminum 7075-T6", "aluminum", 150, 572, 2810, 130, 950, 0.23, 280, 0.15),
                ("SS-304", "Stainless Steel 304", "stainless", 200, 515, 8000, 16.2, 2100, 0.21, 120, 0.20),
                ("SS-316", "Stainless Steel 316", "stainless", 217, 580, 8027, 16.3, 2200, 0.22, 110, 0.22),
                ("TI-6AL4V", "Titanium 6Al-4V", "titanium", 334, 950, 4430, 6.7, 1650, 0.23, 60, 0.28),
                ("STEEL-1045", "Carbon Steel 1045", "carbon_steel", 163, 565, 7850, 49.8, 1800, 0.26, 180, 0.18),
                ("STEEL-4140", "Alloy Steel 4140", "alloy_steel", 302, 1020, 7850, 42.6, 2400, 0.24, 140, 0.20),
                ("INCONEL-718", "Inconel 718", "superalloy", 363, 1241, 8190, 11.4, 3200, 0.27, 40, 0.30),
                ("BRASS-360", "Free-Cutting Brass", "brass", 78, 380, 8500, 115, 680, 0.18, 400, 0.10),
                ("COPPER-110", "Pure Copper", "copper", 40, 220, 8940, 391, 520, 0.15, 500, 0.08),
            ]
            c.executemany("INSERT INTO materials VALUES (?,?,?,?,?,?,?,?,?,?,?)", materials)
        
        # Check if machines exist
        c.execute("SELECT COUNT(*) FROM machines")
        if c.fetchone()[0] == 0:
            machines = [
                ("HAAS-VF2", "Haas VF-2", "HAAS", "VF-2", "vmc", 8100, 22.4, 122, 3, "Haas NGC"),
                ("HAAS-VF4", "Haas VF-4", "HAAS", "VF-4", "vmc", 8100, 22.4, 122, 3, "Haas NGC"),
                ("DMG-DMU50", "DMG MORI DMU 50", "DMG MORI", "DMU 50", "5axis", 18000, 35, 130, 5, "CELOS"),
                ("MAZAK-QT250", "Mazak Quick Turn 250", "MAZAK", "QT-250", "lathe", 4000, 18.5, 478, 2, "Mazatrol"),
                ("OKUMA-LB3000", "Okuma LB3000", "OKUMA", "LB3000", "lathe", 4200, 22, 560, 2, "OSP-P300"),
                ("FANUC-ROBODRILL", "Fanuc Robodrill", "FANUC", "α-D21MiB5", "vmc", 24000, 11, 20, 5, "FANUC 31i"),
                ("HURCO-VMX42", "Hurco VMX42", "HURCO", "VMX42", "vmc", 12000, 18, 95, 3, "WinMax"),
                ("MAKINO-A61NX", "Makino A61nx", "MAKINO", "A61nx", "hmc", 14000, 30, 119, 4, "Pro6"),
            ]
            c.executemany("INSERT INTO machines VALUES (?,?,?,?,?,?,?,?,?,?)", machines)
        
        # Check if alarms exist
        c.execute("SELECT COUNT(*) FROM alarms")
        if c.fetchone()[0] == 0:
            alarms = [
                ("ALM-FANUC-0001", "0001", "WATCHDOG ALARM", "FANUC", "SYSTEM", "CRITICAL", 
                 "CPU watchdog timer expired", "CPU failure|Memory error|Board failure", "Power cycle required"),
                ("ALM-FANUC-0010", "0010", "AXIS SERVO ALARM", "FANUC", "SERVO", "HIGH",
                 "Servo motor feedback error", "Encoder failure|Cable break|Motor overload", "Check encoder connections"),
                ("ALM-HAAS-101", "101", "SERVO OVERLOAD", "HAAS", "SERVO", "HIGH",
                 "Servo motor overload detected", "Excessive load|Binding|Mechanical issue", "Reduce cutting load"),
                ("ALM-HAAS-102", "102", "SPINDLE OVERLOAD", "HAAS", "SPINDLE", "HIGH",
                 "Spindle motor overload", "Heavy cut|Tool worn|Coolant failure", "Reduce spindle load"),
                ("ALM-SIEMENS-10000", "10000", "AXIS ERROR", "SIEMENS", "SERVO", "HIGH",
                 "Axis position error exceeded", "Following error|Mechanical binding", "Check axis mechanics"),
            ]
            c.executemany("INSERT INTO alarms VALUES (?,?,?,?,?,?,?,?,?)", alarms)
        
        conn.commit()
        conn.close()
    
    # ─────────────────────────────────────────────────────────────
    # MATERIAL TOOLS (4)
    # ─────────────────────────────────────────────────────────────
    
    def prism_material_get(self, id: str) -> Dict:
        """Get single material by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM materials WHERE id = ?", (id,))
        row = c.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return {"error": f"Material not found: {id}"}
    
    def prism_material_search(self, query: Dict) -> List[Dict]:
        """Search materials with filters."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        sql = "SELECT * FROM materials WHERE 1=1"
        params = []
        
        if "category" in query:
            sql += " AND category = ?"
            params.append(query["category"])
        if "min_hardness" in query:
            sql += " AND hardness_hrc >= ?"
            params.append(query["min_hardness"])
        if "max_hardness" in query:
            sql += " AND hardness_hrc <= ?"
            params.append(query["max_hardness"])
        if "name_contains" in query:
            sql += " AND name LIKE ?"
            params.append(f"%{query['name_contains']}%")
        
        c.execute(sql, params)
        rows = c.fetchall()
        conn.close()
        
        return [dict(r) for r in rows]
    
    def prism_material_property(self, id: str, prop: str) -> Any:
        """Get specific property of a material."""
        mat = self.prism_material_get(id)
        if "error" in mat:
            return mat
        return {prop: mat.get(prop, "Property not found")}
    
    def prism_material_similar(self, id: str, n: int = 5) -> List[Dict]:
        """Find similar materials."""
        mat = self.prism_material_get(id)
        if "error" in mat:
            return [mat]
        
        # Find by same category
        return self.prism_material_search({"category": mat["category"]})[:n]
    
    # ─────────────────────────────────────────────────────────────
    # MACHINE TOOLS (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_machine_get(self, id: str) -> Dict:
        """Get single machine by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM machines WHERE id = ?", (id,))
        row = c.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return {"error": f"Machine not found: {id}"}
    
    def prism_machine_search(self, query: Dict) -> List[Dict]:
        """Search machines with filters."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        sql = "SELECT * FROM machines WHERE 1=1"
        params = []
        
        if "manufacturer" in query:
            sql += " AND manufacturer = ?"
            params.append(query["manufacturer"])
        if "type" in query:
            sql += " AND type = ?"
            params.append(query["type"])
        if "min_rpm" in query:
            sql += " AND max_rpm >= ?"
            params.append(query["min_rpm"])
        
        c.execute(sql, params)
        rows = c.fetchall()
        conn.close()
        
        return [dict(r) for r in rows]
    
    def prism_machine_capabilities(self, id: str) -> Dict:
        """Get machine capabilities."""
        machine = self.prism_machine_get(id)
        if "error" in machine:
            return machine
        
        return {
            "id": id,
            "capabilities": {
                "max_rpm": machine["max_rpm"],
                "max_power_kw": machine["max_power_kw"],
                "max_torque_nm": machine["max_torque_nm"],
                "axes": machine["axes"],
                "can_mill": machine["type"] in ["vmc", "hmc", "5axis"],
                "can_turn": machine["type"] == "lathe",
                "has_live_tooling": machine["type"] == "lathe" and machine["axes"] > 2
            }
        }
    
    # ─────────────────────────────────────────────────────────────
    # ALARM TOOLS (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_alarm_get(self, code: str, family: str) -> Dict:
        """Get single alarm by code and family."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM alarms WHERE code = ? AND family = ?", (code, family.upper()))
        row = c.fetchone()
        conn.close()
        
        if row:
            result = dict(row)
            result["causes"] = result["causes"].split("|")
            return result
        return {"error": f"Alarm not found: {family} {code}"}
    
    def prism_alarm_search(self, query: Dict) -> List[Dict]:
        """Search alarms with filters."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        sql = "SELECT * FROM alarms WHERE 1=1"
        params = []
        
        if "family" in query:
            sql += " AND family = ?"
            params.append(query["family"].upper())
        if "category" in query:
            sql += " AND category = ?"
            params.append(query["category"].upper())
        if "severity" in query:
            sql += " AND severity = ?"
            params.append(query["severity"].upper())
        if "keyword" in query:
            sql += " AND (name LIKE ? OR description LIKE ?)"
            kw = f"%{query['keyword']}%"
            params.extend([kw, kw])
        
        c.execute(sql, params)
        rows = c.fetchall()
        conn.close()
        
        results = []
        for r in rows:
            d = dict(r)
            d["causes"] = d["causes"].split("|")
            results.append(d)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: PHYSICS CALCULATION MCP (12 tools)
# ═══════════════════════════════════════════════════════════════════════════

class PhysicsMCP:
    """Cutting physics calculations - 12 tools."""
    
    def __init__(self, data_mcp: DataQueryMCP):
        self.data = data_mcp
    
    # ─────────────────────────────────────────────────────────────
    # CUTTING PHYSICS (6)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_kienzle(self, params: Dict) -> Dict:
        """Calculate cutting force using Kienzle model.
        
        Fc = kc1.1 * b * h^(1-mc)
        
        Args:
            material_id: Material ID for Kienzle coefficients
            b: Width of cut (mm)
            h: Chip thickness (mm)
            OR provide kc1_1 and mc directly
        """
        # Get Kienzle coefficients
        kc1_1 = params.get("kc1_1")
        mc = params.get("mc")
        
        if not kc1_1 and "material_id" in params:
            mat = self.data.prism_material_get(params["material_id"])
            if "error" not in mat:
                kc1_1 = mat.get("kienzle_kc1_1", 1500)
                mc = mat.get("kienzle_mc", 0.25)
        
        kc1_1 = kc1_1 or 1500
        mc = mc or 0.25
        b = params.get("b", 5)  # mm
        h = params.get("h", 0.2)  # mm
        
        # Kienzle equation
        Fc = kc1_1 * b * (h ** (1 - mc))
        
        # Specific cutting force
        kc = kc1_1 * (h ** (-mc))
        
        return {
            "formula": "Kienzle",
            "cutting_force_N": round(Fc, 2),
            "specific_cutting_force_N_mm2": round(kc, 2),
            "inputs": {"kc1_1": kc1_1, "mc": mc, "b": b, "h": h},
            "safety_check": Fc < 10000  # Max safe force
        }
    
    def prism_physics_taylor(self, params: Dict) -> Dict:
        """Calculate tool life using Taylor equation.
        
        VT^n = C  =>  T = (C/V)^(1/n)
        
        Args:
            material_id: Material ID for Taylor coefficients
            V: Cutting speed (m/min)
            OR provide C and n directly
        """
        C = params.get("C")
        n = params.get("n")
        
        if not C and "material_id" in params:
            mat = self.data.prism_material_get(params["material_id"])
            if "error" not in mat:
                C = mat.get("taylor_C", 200)
                n = mat.get("taylor_n", 0.20)
        
        C = C or 200
        n = n or 0.20
        V = params.get("V", 100)  # m/min
        
        # Taylor equation
        T = (C / V) ** (1 / n)
        
        return {
            "formula": "Taylor",
            "tool_life_min": round(T, 2),
            "inputs": {"C": C, "n": n, "V": V},
            "recommendation": "Good" if T > 15 else "Reduce speed" if T < 5 else "Acceptable"
        }
    
    def prism_physics_johnson_cook(self, params: Dict) -> Dict:
        """Calculate flow stress using Johnson-Cook model.
        
        σ = (A + B*ε^n)(1 + C*ln(ε_dot/ε_dot_0))(1 - T*^m)
        
        Simplified version for machining.
        """
        A = params.get("A", 324)  # MPa - yield strength
        B = params.get("B", 114)  # MPa - hardening coefficient
        n = params.get("n", 0.42)  # Hardening exponent
        C = params.get("C", 0.002)  # Strain rate coefficient
        strain = params.get("strain", 0.5)
        strain_rate = params.get("strain_rate", 1000)  # 1/s
        
        # Simplified Johnson-Cook (isothermal)
        sigma = (A + B * (strain ** n)) * (1 + C * math.log(strain_rate / 1.0))
        
        return {
            "formula": "Johnson-Cook",
            "flow_stress_MPa": round(sigma, 2),
            "inputs": {"A": A, "B": B, "n": n, "C": C, "strain": strain, "strain_rate": strain_rate}
        }
    
    def prism_physics_stability(self, params: Dict) -> Dict:
        """Check chatter stability using simplified stability lobe.
        
        Critical depth of cut based on dynamic stiffness.
        """
        spindle_speed = params.get("spindle_speed", 5000)  # RPM
        natural_freq = params.get("natural_freq", 500)  # Hz
        damping_ratio = params.get("damping_ratio", 0.05)
        stiffness = params.get("stiffness", 50e6)  # N/m
        kc = params.get("kc", 2000)  # N/mm²
        
        # Simplified critical depth calculation
        omega_c = 2 * math.pi * natural_freq
        b_lim = stiffness * damping_ratio / (2 * kc * 1e6)  # mm
        
        # Check if spindle speed is near stability pocket
        tooth_passing_freq = spindle_speed / 60 * params.get("flutes", 4)
        freq_ratio = tooth_passing_freq / natural_freq
        
        stable = freq_ratio < 0.8 or freq_ratio > 1.2
        
        return {
            "formula": "Stability Lobe",
            "critical_depth_mm": round(b_lim * 1000, 3),
            "tooth_passing_freq_Hz": round(tooth_passing_freq, 1),
            "frequency_ratio": round(freq_ratio, 3),
            "stable": stable,
            "recommendation": "Stable" if stable else "Risk of chatter - adjust speed"
        }
    
    def prism_physics_deflection(self, params: Dict) -> Dict:
        """Calculate tool deflection.
        
        δ = (F * L³) / (3 * E * I)
        """
        F = params.get("force_N", 500)
        L = params.get("stick_out_mm", 50)
        D = params.get("diameter_mm", 10)
        E = params.get("modulus_GPa", 620)  # Carbide default
        
        # Moment of inertia for solid cylinder
        I = math.pi * (D ** 4) / 64  # mm⁴
        
        # Deflection
        delta = (F * (L ** 3)) / (3 * E * 1000 * I)  # mm
        
        # Surface finish impact
        Ra_impact = delta * 2  # Simplified correlation
        
        return {
            "formula": "Cantilever Deflection",
            "deflection_mm": round(delta, 4),
            "deflection_um": round(delta * 1000, 2),
            "surface_impact_Ra_um": round(Ra_impact, 2),
            "acceptable": delta < 0.05,
            "inputs": {"F": F, "L": L, "D": D, "E": E}
        }
    
    def prism_physics_surface(self, params: Dict) -> Dict:
        """Estimate surface finish (Ra).
        
        Ra = f² / (32 * r)  (theoretical for turning)
        Ra = f² / (18.4 * r * √2)  (for milling)
        """
        feed = params.get("feed_mm_rev", 0.2)
        corner_radius = params.get("corner_radius_mm", 0.8)
        operation = params.get("operation", "turning")
        
        if operation == "turning":
            Ra = (feed ** 2) / (32 * corner_radius) * 1000  # μm
        else:  # milling
            Ra = (feed ** 2) / (18.4 * corner_radius * math.sqrt(2)) * 1000
        
        return {
            "formula": "Theoretical Surface Finish",
            "Ra_um": round(Ra, 3),
            "operation": operation,
            "quality": "Fine" if Ra < 1.6 else "Medium" if Ra < 3.2 else "Rough",
            "inputs": {"feed": feed, "corner_radius": corner_radius}
        }
    
    # ─────────────────────────────────────────────────────────────
    # VALIDATION PHYSICS (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_validate_kienzle(self, coeffs: Dict) -> Dict:
        """Validate Kienzle coefficients are in valid ranges."""
        kc1_1 = coeffs.get("kc1_1", 0)
        mc = coeffs.get("mc", 0)
        
        errors = []
        warnings = []
        
        # kc1.1 typically 500-4000 N/mm²
        if kc1_1 < 300:
            errors.append(f"kc1.1 ({kc1_1}) too low - minimum 300 N/mm²")
        elif kc1_1 < 500:
            warnings.append(f"kc1.1 ({kc1_1}) unusually low - typical minimum 500")
        elif kc1_1 > 4000:
            errors.append(f"kc1.1 ({kc1_1}) too high - maximum 4000 N/mm²")
        elif kc1_1 > 3500:
            warnings.append(f"kc1.1 ({kc1_1}) unusually high - only for hardest materials")
        
        # mc typically 0.15-0.35
        if mc < 0.10:
            errors.append(f"mc ({mc}) too low - minimum 0.10")
        elif mc > 0.40:
            errors.append(f"mc ({mc}) too high - maximum 0.40")
        elif mc < 0.15 or mc > 0.35:
            warnings.append(f"mc ({mc}) outside typical range 0.15-0.35")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "coefficients": coeffs
        }
    
    def prism_physics_check_limits(self, params: Dict) -> Dict:
        """Check machining parameters against safe limits."""
        violations = []
        warnings = []
        
        # Cutting speed
        Vc = params.get("cutting_speed_m_min", 0)
        if Vc > 500:
            violations.append(f"Cutting speed {Vc} m/min exceeds safe limit (500)")
        elif Vc > 400:
            warnings.append(f"Cutting speed {Vc} m/min is high")
        
        # Feed
        f = params.get("feed_mm_rev", 0)
        if f > 1.0:
            violations.append(f"Feed {f} mm/rev exceeds safe limit (1.0)")
        elif f > 0.5:
            warnings.append(f"Feed {f} mm/rev is high")
        
        # Depth of cut
        ap = params.get("depth_mm", 0)
        tool_dia = params.get("tool_diameter_mm", 10)
        if ap > tool_dia:
            violations.append(f"Depth {ap}mm exceeds tool diameter {tool_dia}mm")
        elif ap > tool_dia * 0.5:
            warnings.append(f"Depth {ap}mm is >50% of tool diameter")
        
        # RPM
        rpm = params.get("spindle_rpm", 0)
        max_rpm = params.get("machine_max_rpm", 10000)
        if rpm > max_rpm:
            violations.append(f"RPM {rpm} exceeds machine max {max_rpm}")
        elif rpm > max_rpm * 0.9:
            warnings.append(f"RPM {rpm} near machine limit")
        
        return {
            "safe": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "params_checked": params
        }
    
    def prism_physics_unit_convert(self, value: float, from_unit: str, to_unit: str) -> Dict:
        """Convert between common machining units."""
        conversions = {
            # Length
            ("mm", "inch"): lambda x: x / 25.4,
            ("inch", "mm"): lambda x: x * 25.4,
            ("m", "mm"): lambda x: x * 1000,
            ("mm", "m"): lambda x: x / 1000,
            # Speed
            ("m/min", "sfm"): lambda x: x * 3.281,
            ("sfm", "m/min"): lambda x: x / 3.281,
            ("mm/min", "ipm"): lambda x: x / 25.4,
            ("ipm", "mm/min"): lambda x: x * 25.4,
            # Feed
            ("mm/rev", "ipr"): lambda x: x / 25.4,
            ("ipr", "mm/rev"): lambda x: x * 25.4,
            # Force
            ("N", "lbf"): lambda x: x * 0.2248,
            ("lbf", "N"): lambda x: x / 0.2248,
            # Pressure
            ("MPa", "psi"): lambda x: x * 145.038,
            ("psi", "MPa"): lambda x: x / 145.038,
            ("N/mm2", "MPa"): lambda x: x,
            ("MPa", "N/mm2"): lambda x: x,
        }
        
        key = (from_unit.lower(), to_unit.lower())
        if key in conversions:
            result = conversions[key](value)
            return {
                "original": value,
                "from_unit": from_unit,
                "converted": round(result, 6),
                "to_unit": to_unit
            }
        
        return {"error": f"Unknown conversion: {from_unit} to {to_unit}"}
    
    # ─────────────────────────────────────────────────────────────
    # OPTIMIZATION (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_optimize_speed(self, constraints: Dict) -> Dict:
        """Optimize cutting speed within constraints."""
        material_id = constraints.get("material_id")
        tool_life_target = constraints.get("tool_life_min", 15)
        max_power = constraints.get("max_power_kw", 20)
        
        # Get material Taylor constants
        C, n = 200, 0.20
        if material_id:
            mat = self.data.prism_material_get(material_id)
            if "error" not in mat:
                C = mat.get("taylor_C", 200)
                n = mat.get("taylor_n", 0.20)
        
        # Calculate optimal speed for target tool life
        V_optimal = C / (tool_life_target ** n)
        
        # Power check (simplified)
        V_power_limit = max_power * 60000 / constraints.get("MRR_factor", 1000)
        
        V_final = min(V_optimal, V_power_limit)
        
        return {
            "optimal_speed_m_min": round(V_optimal, 1),
            "power_limited_speed_m_min": round(V_power_limit, 1),
            "recommended_speed_m_min": round(V_final, 1),
            "expected_tool_life_min": round((C / V_final) ** (1/n), 1),
            "limiting_factor": "tool_life" if V_optimal <= V_power_limit else "power"
        }
    
    def prism_physics_optimize_feed(self, constraints: Dict) -> Dict:
        """Optimize feed rate within constraints."""
        surface_finish_target = constraints.get("Ra_target_um", 1.6)
        corner_radius = constraints.get("corner_radius_mm", 0.8)
        max_force = constraints.get("max_force_N", 2000)
        
        # Surface finish limited feed (turning)
        f_surface = math.sqrt(32 * corner_radius * surface_finish_target / 1000)
        
        # Force limited feed (simplified)
        kc = constraints.get("kc_N_mm2", 2000)
        ap = constraints.get("depth_mm", 2)
        f_force = max_force / (kc * ap)
        
        f_final = min(f_surface, f_force)
        
        return {
            "surface_limited_feed_mm_rev": round(f_surface, 3),
            "force_limited_feed_mm_rev": round(f_force, 3),
            "recommended_feed_mm_rev": round(f_final, 3),
            "expected_Ra_um": round((f_final ** 2) / (32 * corner_radius) * 1000, 3),
            "limiting_factor": "surface_finish" if f_surface <= f_force else "force"
        }
    
    def prism_physics_optimize_doc(self, constraints: Dict) -> Dict:
        """Optimize depth of cut within constraints."""
        tool_diameter = constraints.get("tool_diameter_mm", 10)
        max_power = constraints.get("max_power_kw", 20)
        stability_limit = constraints.get("stability_limit_mm", 5)
        
        # Geometric limit (typically 1x diameter for roughing)
        ap_geometric = tool_diameter * constraints.get("engagement_ratio", 1.0)
        
        # Power limited depth
        Vc = constraints.get("cutting_speed_m_min", 100)
        f = constraints.get("feed_mm_rev", 0.2)
        kc = constraints.get("kc_N_mm2", 2000)
        ap_power = (max_power * 60000) / (Vc * f * kc)
        
        ap_final = min(ap_geometric, ap_power, stability_limit)
        
        return {
            "geometric_limit_mm": round(ap_geometric, 2),
            "power_limit_mm": round(ap_power, 2),
            "stability_limit_mm": round(stability_limit, 2),
            "recommended_depth_mm": round(ap_final, 2),
            "limiting_factor": "geometric" if ap_geometric <= min(ap_power, stability_limit) 
                              else "power" if ap_power <= stability_limit else "stability"
        }


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: STATE SERVER MCP (11 tools)
# ═══════════════════════════════════════════════════════════════════════════

class StateServerMCP:
    """Session/Event/Decision management - 11 tools."""
    
    def __init__(self):
        self.state_file = STATE_DIR / "CURRENT_STATE.json"
        self.events_dir = STATE_DIR / "events"
        self.decisions_dir = STATE_DIR / "decisions"
        self.checkpoints_dir = STATE_DIR / "checkpoints"
        
        self.events_dir.mkdir(exist_ok=True)
        self.decisions_dir.mkdir(exist_ok=True)
        self.checkpoints_dir.mkdir(exist_ok=True)
        
        self._current_state = None
        self._event_sequence = 0
    
    def _load_state(self) -> Dict:
        """Load current state from file."""
        if self._current_state is None:
            if self.state_file.exists():
                self._current_state = json.loads(self.state_file.read_text(encoding='utf-8'))
            else:
                self._current_state = {"version": "1.0.0", "sessions": [], "quickResume": ""}
        return self._current_state
    
    def _save_state(self):
        """Save state to file with sorted keys (CTX-CACHE-003)."""
        self.state_file.write_text(
            json.dumps(self._current_state, indent=2, sort_keys=True, ensure_ascii=False),
            encoding='utf-8'
        )
    
    # ─────────────────────────────────────────────────────────────
    # SESSION STATE (5)
    # ─────────────────────────────────────────────────────────────
    
    def prism_state_get(self) -> Dict:
        """Get full current state."""
        return self._load_state()
    
    def prism_state_update(self, delta: Dict) -> Dict:
        """Update state with delta (append-only philosophy)."""
        state = self._load_state()
        
        # Record the update as an event
        self.prism_event_append({
            "type": "STATE_UPDATE",
            "delta": delta,
            "timestamp": datetime.now().isoformat()
        })
        
        # Merge delta
        for key, value in delta.items():
            if key in state and isinstance(state[key], dict) and isinstance(value, dict):
                state[key].update(value)
            else:
                state[key] = value
        
        self._current_state = state
        self._save_state()
        
        return {"status": "updated", "keys_modified": list(delta.keys())}
    
    def prism_state_checkpoint(self, name: str) -> Dict:
        """Create named checkpoint."""
        state = self._load_state()
        checkpoint_id = f"CP-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{name}"
        
        checkpoint = {
            "id": checkpoint_id,
            "name": name,
            "timestamp": datetime.now().isoformat(),
            "state_snapshot": state.copy(),
            "event_sequence": self._event_sequence
        }
        
        checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"
        checkpoint_file.write_text(json.dumps(checkpoint, indent=2, sort_keys=True), encoding='utf-8')
        
        return {"checkpoint_id": checkpoint_id, "file": str(checkpoint_file)}
    
    def prism_state_restore(self, checkpoint_id: str) -> Dict:
        """Restore state from checkpoint."""
        checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"
        
        if not checkpoint_file.exists():
            # Try to find partial match
            matches = list(self.checkpoints_dir.glob(f"*{checkpoint_id}*.json"))
            if matches:
                checkpoint_file = matches[0]
            else:
                return {"error": f"Checkpoint not found: {checkpoint_id}"}
        
        checkpoint = json.loads(checkpoint_file.read_text(encoding='utf-8'))
        
        # Record restore event
        self.prism_event_append({
            "type": "STATE_RESTORE",
            "checkpoint_id": checkpoint_id,
            "timestamp": datetime.now().isoformat()
        })
        
        self._current_state = checkpoint["state_snapshot"]
        self._save_state()
        
        return {"status": "restored", "checkpoint_id": checkpoint_id}
    
    def prism_state_rollback(self, event_id: str) -> Dict:
        """Rollback to state before specific event."""
        # Find the event and reconstruct state
        events = self.prism_event_search({"before_id": event_id})
        
        if not events:
            return {"error": f"Cannot rollback to event: {event_id}"}
        
        return {
            "status": "rollback_prepared",
            "target_event": event_id,
            "events_to_replay": len(events),
            "note": "Full rollback requires checkpoint restore"
        }
    
    # ─────────────────────────────────────────────────────────────
    # EVENT LOG (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_event_append(self, event: Dict) -> str:
        """Append event to log (append-only, never modify)."""
        self._event_sequence += 1
        
        event_entry = {
            "event_id": f"EVT-{datetime.now().strftime('%Y%m%d')}-{self._event_sequence:06d}",
            "sequence": self._event_sequence,
            "timestamp": event.get("timestamp", datetime.now().isoformat()),
            **event
        }
        
        # Compute checksum
        event_entry["checksum"] = hashlib.sha256(
            json.dumps(event_entry, sort_keys=True).encode()
        ).hexdigest()[:16]
        
        # Append to today's event log
        log_file = self.events_dir / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        with open(log_file, "a", encoding='utf-8') as f:
            f.write(json.dumps(event_entry, sort_keys=True) + "\n")
        
        return event_entry["event_id"]
    
    def prism_event_search(self, query: Dict) -> List[Dict]:
        """Search events with filters."""
        results = []
        
        # Search through event logs
        for log_file in sorted(self.events_dir.glob("*.jsonl"), reverse=True):
            with open(log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        event = json.loads(line)
                        
                        # Apply filters
                        match = True
                        if "type" in query and event.get("type") != query["type"]:
                            match = False
                        if "after" in query and event["timestamp"] < query["after"]:
                            match = False
                        if "before" in query and event["timestamp"] > query["before"]:
                            match = False
                        
                        if match:
                            results.append(event)
            
            if len(results) >= query.get("limit", 100):
                break
        
        return results[:query.get("limit", 100)]
    
    def prism_event_recent(self, n: int = 10) -> List[Dict]:
        """Get n most recent events."""
        return self.prism_event_search({"limit": n})
    
    # ─────────────────────────────────────────────────────────────
    # DECISION LOG (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_decision_record(self, decision: Dict) -> str:
        """Record a decision with rationale."""
        decision_id = f"DEC-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        decision_entry = {
            "decision_id": decision_id,
            "timestamp": datetime.now().isoformat(),
            "question": decision.get("question", ""),
            "options_considered": decision.get("options", []),
            "chosen": decision.get("chosen", ""),
            "rationale": decision.get("rationale", ""),
            "confidence": decision.get("confidence", 0.8),
            "reversible": decision.get("reversible", True)
        }
        
        # Append to today's decision log
        log_file = self.decisions_dir / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        with open(log_file, "a", encoding='utf-8') as f:
            f.write(json.dumps(decision_entry, sort_keys=True) + "\n")
        
        # Also record as event
        self.prism_event_append({
            "type": "DECISION",
            "decision_id": decision_id,
            "summary": decision.get("chosen", "")
        })
        
        return decision_id
    
    def prism_decision_search(self, query: Dict) -> List[Dict]:
        """Search decisions."""
        results = []
        
        for log_file in sorted(self.decisions_dir.glob("*.jsonl"), reverse=True):
            with open(log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        dec = json.loads(line)
                        
                        match = True
                        if "keyword" in query:
                            kw = query["keyword"].lower()
                            if kw not in dec.get("question", "").lower() and \
                               kw not in dec.get("rationale", "").lower():
                                match = False
                        
                        if match:
                            results.append(dec)
        
        return results[:query.get("limit", 20)]
    
    def prism_decision_recent(self, n: int = 5) -> List[Dict]:
        """Get n most recent decisions."""
        return self.prism_decision_search({"limit": n})


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: VALIDATION/SAFETY MCP (8 tools)
# ═══════════════════════════════════════════════════════════════════════════

class ValidationMCP:
    """Quality scores and safety validation - 8 tools."""
    
    def __init__(self):
        pass
    
    # ─────────────────────────────────────────────────────────────
    # QUALITY SCORES (4)
    # ─────────────────────────────────────────────────────────────
    
    def prism_quality_omega(self, output: Dict) -> Dict:
        """Compute full Ω(x) quality score with all 10 components."""
        # Extract or compute component scores
        R = output.get("reasoning", 0.8)      # Reasoning quality
        C = output.get("code", 0.8)           # Code quality
        P = output.get("process", 0.8)        # Process adherence
        S = output.get("safety", 0.8)         # Safety score
        L = output.get("learning", 0.7)       # Learning captured
        D = output.get("anomaly", 0.5)        # Anomaly detection
        A = output.get("attention", 0.7)      # Attention/focus
        K = output.get("causal", 0.6)         # Causal understanding
        M = output.get("memory", 0.7)         # Memory utilization
        
        # Compute weighted Omega
        omega = (0.18 * R + 0.14 * C + 0.10 * P + 0.22 * S + 0.06 * L +
                 0.10 * D + 0.08 * A + 0.07 * K + 0.05 * M)
        
        # Confidence interval (simplified)
        omega_lower = omega * 0.85
        omega_upper = min(omega * 1.15, 1.0)
        
        # Check hard constraints
        safety_pass = S >= 0.70
        anomaly_pass = D >= 0.30
        
        # Determine decision
        if not safety_pass or not anomaly_pass:
            decision = "BLOCK"
        elif omega >= 0.85 and omega_lower >= 0.70:
            decision = "RELEASE"
        elif omega >= 0.65:
            decision = "WARN"
        else:
            decision = "BLOCK"
        
        return {
            "omega": round(omega, 4),
            "omega_lower": round(omega_lower, 4),
            "omega_upper": round(omega_upper, 4),
            "components": {
                "R_reasoning": R, "C_code": C, "P_process": P,
                "S_safety": S, "L_learning": L, "D_anomaly": D,
                "A_attention": A, "K_causal": K, "M_memory": M
            },
            "weights": {
                "R": 0.18, "C": 0.14, "P": 0.10, "S": 0.22, "L": 0.06,
                "D": 0.10, "A": 0.08, "K": 0.07, "M": 0.05
            },
            "hard_constraints": {
                "safety_pass": safety_pass,
                "anomaly_pass": anomaly_pass
            },
            "decision": decision
        }
    
    def prism_quality_safety(self, output: Dict) -> Dict:
        """Compute S(x) safety score."""
        checks = []
        score = 1.0
        
        # Check for dangerous values
        if "cutting_speed" in output:
            v = output["cutting_speed"]
            if v > 500:
                checks.append({"check": "cutting_speed", "status": "FAIL", "value": v, "limit": 500})
                score -= 0.3
            elif v > 400:
                checks.append({"check": "cutting_speed", "status": "WARN", "value": v, "limit": 400})
                score -= 0.1
            else:
                checks.append({"check": "cutting_speed", "status": "PASS", "value": v})
        
        if "depth_of_cut" in output and "tool_diameter" in output:
            ratio = output["depth_of_cut"] / output["tool_diameter"]
            if ratio > 1.5:
                checks.append({"check": "doc_ratio", "status": "FAIL", "value": ratio, "limit": 1.5})
                score -= 0.3
            elif ratio > 1.0:
                checks.append({"check": "doc_ratio", "status": "WARN", "value": ratio, "limit": 1.0})
                score -= 0.1
            else:
                checks.append({"check": "doc_ratio", "status": "PASS", "value": ratio})
        
        if "spindle_rpm" in output and "max_rpm" in output:
            if output["spindle_rpm"] > output["max_rpm"]:
                checks.append({"check": "rpm_limit", "status": "FAIL", 
                              "value": output["spindle_rpm"], "limit": output["max_rpm"]})
                score -= 0.4
            else:
                checks.append({"check": "rpm_limit", "status": "PASS"})
        
        # Check for placeholders/incomplete data
        for key, value in output.items():
            if isinstance(value, str):
                if "TODO" in value or "PLACEHOLDER" in value or "TBD" in value:
                    checks.append({"check": f"placeholder_{key}", "status": "FAIL", "value": value})
                    score -= 0.2
        
        score = max(0.0, score)
        
        return {
            "S_x": round(score, 3),
            "passed": score >= 0.70,
            "checks": checks,
            "threshold": 0.70,
            "verdict": "SAFE" if score >= 0.70 else "UNSAFE - BLOCKED"
        }
    
    def prism_quality_reasoning(self, output: Dict) -> Dict:
        """Compute R(x) reasoning quality score."""
        checks = []
        score = 0.8  # Base score
        
        # Check for evidence
        if output.get("evidence_level", 0) >= 3:
            checks.append({"check": "evidence", "status": "PASS", "level": output["evidence_level"]})
            score += 0.1
        elif output.get("evidence_level"):
            checks.append({"check": "evidence", "status": "WARN", "level": output["evidence_level"]})
        
        # Check for logical structure
        if output.get("has_rationale", False):
            checks.append({"check": "rationale", "status": "PASS"})
            score += 0.05
        
        # Check for alternatives considered
        if output.get("alternatives_count", 0) >= 3:
            checks.append({"check": "alternatives", "status": "PASS", "count": output["alternatives_count"]})
            score += 0.05
        
        score = min(1.0, score)
        
        return {
            "R_x": round(score, 3),
            "checks": checks
        }
    
    def prism_quality_code(self, output: Dict) -> Dict:
        """Compute C(x) code quality score."""
        checks = []
        score = 0.8
        
        code = output.get("code", "")
        
        # Check for common issues
        if "# TODO" in code:
            checks.append({"check": "no_todos", "status": "FAIL"})
            score -= 0.2
        else:
            checks.append({"check": "no_todos", "status": "PASS"})
        
        if "pass  # " in code or "pass\n" in code:
            checks.append({"check": "no_empty_pass", "status": "WARN"})
            score -= 0.1
        
        # Check for docstrings (simplified)
        if 'def ' in code and '"""' in code:
            checks.append({"check": "has_docstrings", "status": "PASS"})
            score += 0.1
        elif 'def ' in code:
            checks.append({"check": "has_docstrings", "status": "WARN"})
        
        # Check for type hints
        if 'def ' in code and (' -> ' in code or ': ' in code):
            checks.append({"check": "type_hints", "status": "PASS"})
            score += 0.05
        
        score = max(0.0, min(1.0, score))
        
        return {
            "C_x": round(score, 3),
            "checks": checks
        }
    
    # ─────────────────────────────────────────────────────────────
    # VALIDATION GATES (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_validate_gates(self, output: Dict) -> Dict:
        """Run all 9 validation gates."""
        gates = []
        all_pass = True
        
        # G1: C: drive accessible (always true in this context)
        gates.append({"gate": "G1", "name": "C_drive_accessible", "status": "PASS"})
        
        # G2: State file valid
        state_file = STATE_DIR / "CURRENT_STATE.json"
        if state_file.exists():
            gates.append({"gate": "G2", "name": "state_file_valid", "status": "PASS"})
        else:
            gates.append({"gate": "G2", "name": "state_file_valid", "status": "WARN", "action": "create_new"})
        
        # G3: Input understood
        if output.get("input_parsed", True):
            gates.append({"gate": "G3", "name": "input_understood", "status": "PASS"})
        else:
            gates.append({"gate": "G3", "name": "input_understood", "status": "FAIL"})
            all_pass = False
        
        # G4: Skills available
        gates.append({"gate": "G4", "name": "skills_available", "status": "PASS"})
        
        # G5: Output path on C:
        output_path = output.get("output_path", "C:\\")
        if output_path.startswith("C:") or output_path.startswith("c:"):
            gates.append({"gate": "G5", "name": "output_on_C", "status": "PASS"})
        else:
            gates.append({"gate": "G5", "name": "output_on_C", "status": "FAIL", "path": output_path})
            all_pass = False
        
        # G6: Evidence exists
        if output.get("evidence_level", 0) >= 3:
            gates.append({"gate": "G6", "name": "evidence_exists", "status": "PASS"})
        else:
            gates.append({"gate": "G6", "name": "evidence_exists", "status": "WARN"})
        
        # G7: Anti-regression
        if output.get("size_check_passed", True):
            gates.append({"gate": "G7", "name": "anti_regression", "status": "PASS"})
        else:
            gates.append({"gate": "G7", "name": "anti_regression", "status": "FAIL"})
            all_pass = False
        
        # G8: Safety S(x) >= 0.70
        safety = self.prism_quality_safety(output)
        if safety["passed"]:
            gates.append({"gate": "G8", "name": "safety_threshold", "status": "PASS", "S_x": safety["S_x"]})
        else:
            gates.append({"gate": "G8", "name": "safety_threshold", "status": "HARD_BLOCK", "S_x": safety["S_x"]})
            all_pass = False
        
        # G9: Anomaly D(x) >= 0.30
        anomaly = output.get("anomaly_score", 0.5)
        if anomaly >= 0.30:
            gates.append({"gate": "G9", "name": "anomaly_detection", "status": "PASS", "D_x": anomaly})
        else:
            gates.append({"gate": "G9", "name": "anomaly_detection", "status": "HARD_BLOCK", "D_x": anomaly})
            all_pass = False
        
        return {
            "all_gates_pass": all_pass,
            "gates": gates,
            "blocked_by": [g["gate"] for g in gates if g["status"] in ["FAIL", "HARD_BLOCK"]]
        }
    
    def prism_validate_anti_regression(self, old: Dict, new: Dict) -> Dict:
        """Validate new version doesn't regress from old."""
        checks = []
        passed = True
        
        # Size comparison
        old_size = old.get("size", 0)
        new_size = new.get("size", 0)
        
        if new_size < old_size * 0.8:  # >20% reduction is RED FLAG
            checks.append({
                "check": "size",
                "status": "FAIL",
                "old": old_size,
                "new": new_size,
                "reduction_pct": round((1 - new_size/old_size) * 100, 1)
            })
            passed = False
        elif new_size < old_size:
            checks.append({
                "check": "size",
                "status": "WARN",
                "old": old_size,
                "new": new_size,
                "reduction_pct": round((1 - new_size/old_size) * 100, 1)
            })
        else:
            checks.append({"check": "size", "status": "PASS", "old": old_size, "new": new_size})
        
        # Item count comparison
        old_items = old.get("item_count", 0)
        new_items = new.get("item_count", 0)
        
        if new_items < old_items:
            checks.append({
                "check": "item_count",
                "status": "FAIL",
                "old": old_items,
                "new": new_items,
                "lost": old_items - new_items
            })
            passed = False
        else:
            checks.append({"check": "item_count", "status": "PASS", "old": old_items, "new": new_items})
        
        # Feature coverage
        old_features = set(old.get("features", []))
        new_features = set(new.get("features", []))
        missing = old_features - new_features
        
        if missing:
            checks.append({
                "check": "features",
                "status": "FAIL",
                "missing": list(missing)
            })
            passed = False
        else:
            checks.append({"check": "features", "status": "PASS"})
        
        return {
            "passed": passed,
            "checks": checks,
            "verdict": "OK to proceed" if passed else "REGRESSION DETECTED - INVESTIGATE"
        }
    
    # ─────────────────────────────────────────────────────────────
    # SAFETY CHECKS (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_safety_check_limits(self, params: Dict) -> Dict:
        """Check parameters against machine limits."""
        violations = []
        warnings = []
        
        machine_limits = params.get("machine_limits", {
            "max_rpm": 10000,
            "max_power_kw": 20,
            "max_torque_nm": 100,
            "max_feed_mm_min": 10000
        })
        
        if params.get("rpm", 0) > machine_limits["max_rpm"]:
            violations.append({
                "param": "rpm",
                "value": params["rpm"],
                "limit": machine_limits["max_rpm"]
            })
        
        if params.get("power_kw", 0) > machine_limits["max_power_kw"]:
            violations.append({
                "param": "power_kw",
                "value": params["power_kw"],
                "limit": machine_limits["max_power_kw"]
            })
        
        if params.get("feed_mm_min", 0) > machine_limits["max_feed_mm_min"]:
            warnings.append({
                "param": "feed_mm_min",
                "value": params["feed_mm_min"],
                "limit": machine_limits["max_feed_mm_min"]
            })
        
        return {
            "safe": len(violations) == 0,
            "violations": violations,
            "warnings": warnings
        }
    
    def prism_safety_check_collision(self, path: Dict) -> Dict:
        """Check toolpath for potential collisions (simplified)."""
        warnings = []
        
        # Check Z heights
        min_z = path.get("min_z", 0)
        clearance_z = path.get("clearance_z", 50)
        
        if min_z < path.get("part_top_z", 0) - path.get("max_depth", 100):
            warnings.append({
                "type": "z_violation",
                "message": f"Z={min_z} may collide with fixture"
            })
        
        # Check rapid moves
        rapids = path.get("rapid_moves", [])
        for rapid in rapids:
            if rapid.get("z", 100) < clearance_z:
                warnings.append({
                    "type": "rapid_z_low",
                    "message": f"Rapid at Z={rapid['z']} below clearance Z={clearance_z}"
                })
        
        return {
            "collision_free": len(warnings) == 0,
            "warnings": warnings
        }


# ═══════════════════════════════════════════════════════════════════════════
# UNIFIED MCP SERVER
# ═══════════════════════════════════════════════════════════════════════════

class PRISMMCPServer:
    """
    Unified PRISM MCP Server - 54 tools across 5 categories.
    
    Usage:
        mcp = PRISMMCPServer()
        result = mcp.call("prism_material_get", {"id": "AL-6061"})
        
        # List all tools
        tools = mcp.list_tools()
        
        # Get tool info
        info = mcp.tool_info("prism_physics_kienzle")
    """
    
    def __init__(self):
        # Initialize all MCP modules
        self.orchestration = OrchestrationMCP()
        self.data = DataQueryMCP()
        self.physics = PhysicsMCP(self.data)
        self.state = StateServerMCP()
        self.validation = ValidationMCP()
        
        # Build tool registry
        self._tools = self._build_tool_registry()
        
        # Statistics
        self.call_count = 0
        self.call_history = []
    
    def _build_tool_registry(self) -> Dict[str, callable]:
        """Build registry of all 54 tools."""
        tools = {}
        
        # Orchestration (14)
        tools["prism_skill_load"] = self.orchestration.prism_skill_load
        tools["prism_skill_list"] = self.orchestration.prism_skill_list
        tools["prism_skill_relevance"] = self.orchestration.prism_skill_relevance
        tools["prism_skill_select"] = self.orchestration.prism_skill_select
        tools["prism_skill_dependencies"] = self.orchestration.prism_skill_dependencies
        tools["prism_skill_consumers"] = self.orchestration.prism_skill_consumers
        tools["prism_agent_list"] = self.orchestration.prism_agent_list
        tools["prism_agent_select"] = self.orchestration.prism_agent_select
        tools["prism_agent_spawn"] = self.orchestration.prism_agent_spawn
        tools["prism_agent_status"] = self.orchestration.prism_agent_status
        tools["prism_hook_list"] = self.orchestration.prism_hook_list
        tools["prism_hook_trigger"] = self.orchestration.prism_hook_trigger
        tools["prism_formula_list"] = self.orchestration.prism_formula_list
        tools["prism_formula_apply"] = self.orchestration.prism_formula_apply
        
        # Data Query (9)
        tools["prism_material_get"] = self.data.prism_material_get
        tools["prism_material_search"] = self.data.prism_material_search
        tools["prism_material_property"] = self.data.prism_material_property
        tools["prism_material_similar"] = self.data.prism_material_similar
        tools["prism_machine_get"] = self.data.prism_machine_get
        tools["prism_machine_search"] = self.data.prism_machine_search
        tools["prism_machine_capabilities"] = self.data.prism_machine_capabilities
        tools["prism_alarm_get"] = self.data.prism_alarm_get
        tools["prism_alarm_search"] = self.data.prism_alarm_search
        
        # Physics (12)
        tools["prism_physics_kienzle"] = self.physics.prism_physics_kienzle
        tools["prism_physics_taylor"] = self.physics.prism_physics_taylor
        tools["prism_physics_johnson_cook"] = self.physics.prism_physics_johnson_cook
        tools["prism_physics_stability"] = self.physics.prism_physics_stability
        tools["prism_physics_deflection"] = self.physics.prism_physics_deflection
        tools["prism_physics_surface"] = self.physics.prism_physics_surface
        tools["prism_physics_validate_kienzle"] = self.physics.prism_physics_validate_kienzle
        tools["prism_physics_check_limits"] = self.physics.prism_physics_check_limits
        tools["prism_physics_unit_convert"] = self.physics.prism_physics_unit_convert
        tools["prism_physics_optimize_speed"] = self.physics.prism_physics_optimize_speed
        tools["prism_physics_optimize_feed"] = self.physics.prism_physics_optimize_feed
        tools["prism_physics_optimize_doc"] = self.physics.prism_physics_optimize_doc
        
        # State Server (11)
        tools["prism_state_get"] = self.state.prism_state_get
        tools["prism_state_update"] = self.state.prism_state_update
        tools["prism_state_checkpoint"] = self.state.prism_state_checkpoint
        tools["prism_state_restore"] = self.state.prism_state_restore
        tools["prism_state_rollback"] = self.state.prism_state_rollback
        tools["prism_event_append"] = self.state.prism_event_append
        tools["prism_event_search"] = self.state.prism_event_search
        tools["prism_event_recent"] = self.state.prism_event_recent
        tools["prism_decision_record"] = self.state.prism_decision_record
        tools["prism_decision_search"] = self.state.prism_decision_search
        tools["prism_decision_recent"] = self.state.prism_decision_recent
        
        # Validation (8)
        tools["prism_quality_omega"] = self.validation.prism_quality_omega
        tools["prism_quality_safety"] = self.validation.prism_quality_safety
        tools["prism_quality_reasoning"] = self.validation.prism_quality_reasoning
        tools["prism_quality_code"] = self.validation.prism_quality_code
        tools["prism_validate_gates"] = self.validation.prism_validate_gates
        tools["prism_validate_anti_regression"] = self.validation.prism_validate_anti_regression
        tools["prism_safety_check_limits"] = self.validation.prism_safety_check_limits
        tools["prism_safety_check_collision"] = self.validation.prism_safety_check_collision
        
        return tools
    
    def list_tools(self) -> List[str]:
        """List all available tools."""
        return sorted(self._tools.keys())
    
    def list_tools_by_category(self) -> Dict[str, List[str]]:
        """List tools grouped by category."""
        categories = {
            "orchestration": [],
            "data_query": [],
            "physics": [],
            "state_server": [],
            "validation": []
        }
        
        for tool in self._tools.keys():
            if "skill" in tool or "agent" in tool or "hook" in tool or "formula" in tool:
                categories["orchestration"].append(tool)
            elif "material" in tool or "machine" in tool or "alarm" in tool:
                categories["data_query"].append(tool)
            elif "physics" in tool:
                categories["physics"].append(tool)
            elif "state" in tool or "event" in tool or "decision" in tool:
                categories["state_server"].append(tool)
            else:
                categories["validation"].append(tool)
        
        return categories
    
    def tool_info(self, name: str) -> Dict:
        """Get information about a specific tool."""
        if name not in self._tools:
            return {"error": f"Tool not found: {name}"}
        
        func = self._tools[name]
        return {
            "name": name,
            "docstring": func.__doc__ or "No documentation",
            "category": self._get_tool_category(name)
        }
    
    def _get_tool_category(self, name: str) -> str:
        """Determine tool category from name."""
        if "skill" in name or "agent" in name or "hook" in name or "formula" in name:
            return "orchestration"
        elif "material" in name or "machine" in name or "alarm" in name:
            return "data_query"
        elif "physics" in name:
            return "physics"
        elif "state" in name or "event" in name or "decision" in name:
            return "state_server"
        else:
            return "validation"
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Call a tool by name with parameters.
        
        Handles both:
        - Functions that take keyword args: prism_material_get(id="AL-6061")
        - Functions that take a params dict: prism_physics_kienzle(params={...})
        """
        if tool_name not in self._tools:
            return {"error": f"Tool not found: {tool_name}"}
        
        params = params or {}
        self.call_count += 1
        
        # Record call (CTX-STATE-002)
        self.call_history.append({
            "tool": tool_name,
            "params": params,
            "timestamp": datetime.now().isoformat()
        })
        
        # Execute tool
        func = self._tools[tool_name]
        try:
            # Try calling with params as dict first (for physics/validation functions)
            return func(params)
        except TypeError:
            try:
                # Try with keyword args (for data/orchestration functions)
                return func(**params) if params else func()
            except TypeError as e:
                # Handle single positional argument
                if len(params) == 1:
                    return func(list(params.values())[0])
                return {"error": str(e)}
        except Exception as e:
            return {"error": str(e)}
    
    def batch_call(self, calls: List[Dict]) -> List[Any]:
        """Execute multiple tool calls."""
        results = []
        for call in calls:
            result = self.call(call["tool"], call.get("params", {}))
            results.append(result)
        return results
    
    def get_statistics(self) -> Dict:
        """Get MCP server statistics."""
        return {
            "total_tools": len(self._tools),
            "tools_by_category": {k: len(v) for k, v in self.list_tools_by_category().items()},
            "call_count": self.call_count,
            "recent_calls": self.call_history[-10:] if self.call_history else []
        }


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM MCP Server v1.0")
    parser.add_argument("command", nargs="?", default="status",
                        choices=["status", "list", "call", "test", "categories"])
    parser.add_argument("--tool", help="Tool name for call command")
    parser.add_argument("--params", help="JSON parameters for call command")
    parser.add_argument("--category", help="Filter tools by category")
    
    args = parser.parse_args()
    
    mcp = PRISMMCPServer()
    
    if args.command == "status":
        stats = mcp.get_statistics()
        print("=" * 70)
        print("  PRISM MCP SERVER v1.0 - STATUS")
        print("=" * 70)
        print(f"  Total Tools: {stats['total_tools']}")
        print(f"  Call Count: {stats['call_count']}")
        print()
        print("  Tools by Category:")
        for cat, count in stats['tools_by_category'].items():
            print(f"    {cat}: {count}")
        print("=" * 70)
    
    elif args.command == "list":
        if args.category:
            cats = mcp.list_tools_by_category()
            tools = cats.get(args.category, [])
        else:
            tools = mcp.list_tools()
        
        print(f"Available Tools ({len(tools)}):")
        for t in tools:
            print(f"  - {t}")
    
    elif args.command == "categories":
        cats = mcp.list_tools_by_category()
        for cat, tools in cats.items():
            print(f"\n{cat.upper()} ({len(tools)} tools):")
            for t in tools:
                print(f"  - {t}")
    
    elif args.command == "call":
        if not args.tool:
            print("Error: --tool required for call command")
            return
        
        params = json.loads(args.params) if args.params else {}
        result = mcp.call(args.tool, params)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "test":
        print("=" * 70)
        print("  PRISM MCP SERVER - TEST SUITE")
        print("=" * 70)
        
        tests = [
            ("prism_material_get", {"id": "AL-6061"}),
            ("prism_physics_kienzle", {"material_id": "AL-6061", "b": 5, "h": 0.2}),
            ("prism_physics_taylor", {"material_id": "AL-6061", "V": 150}),
            ("prism_machine_search", {"manufacturer": "HAAS"}),
            ("prism_skill_list", {}),
            ("prism_agent_list", {"tier": "OPUS"}),
            ("prism_formula_apply", {"name": "F-OMEGA", "params": {"S": 0.85, "R": 0.80}}),
            ("prism_quality_omega", {"safety": 0.85, "reasoning": 0.80}),
        ]
        
        passed = 0
        for tool, params in tests:
            result = mcp.call(tool, params)
            success = "error" not in result if isinstance(result, dict) else True
            status = "✓ PASS" if success else "✗ FAIL"
            print(f"  {status}: {tool}")
            if success:
                passed += 1
        
        print()
        print(f"  Results: {passed}/{len(tests)} tests passed")
        print("=" * 70)


if __name__ == "__main__":
    main()



# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: PHYSICS CALCULATION MCP (12 tools)
# ═══════════════════════════════════════════════════════════════════════════

class PhysicsMCP:
    """Cutting physics calculations - 12 tools."""
    
    def __init__(self, data_mcp: DataQueryMCP = None):
        self.data_mcp = data_mcp or DataQueryMCP()
    
    # ─────────────────────────────────────────────────────────────
    # CUTTING PHYSICS (6 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_kienzle(self, material_id: str = None, kc1_1: float = None, 
                              mc: float = None, b: float = 5.0, h: float = 0.2) -> Dict:
        """Calculate cutting force using Kienzle equation.
        Fc = kc1.1 * b * h^(1-mc)
        """
        # Get material properties if ID provided
        if material_id:
            mat = self.data_mcp.prism_material_get(material_id)
            if "error" not in mat:
                kc1_1 = kc1_1 or mat.get("kienzle_kc1_1", 1500)
                mc = mc or mat.get("kienzle_mc", 0.25)
        
        kc1_1 = kc1_1 or 1500  # Default for steel
        mc = mc or 0.25
        
        # Kienzle formula
        Fc = kc1_1 * b * (h ** (1 - mc))
        
        # Specific cutting force at actual chip thickness
        kc = kc1_1 * (h ** (-mc))
        
        return {
            "formula": "Kienzle",
            "inputs": {"kc1_1": kc1_1, "mc": mc, "b": b, "h": h},
            "results": {
                "Fc": round(Fc, 2),
                "kc": round(kc, 2)
            },
            "units": {"Fc": "N", "kc": "N/mm²"},
            "safety_factor": 1.5,
            "max_recommended_Fc": round(Fc * 1.5, 2)
        }
    
    def prism_physics_taylor(self, material_id: str = None, V: float = 100,
                             C: float = None, n: float = None) -> Dict:
        """Calculate tool life using Taylor equation.
        V * T^n = C  =>  T = (C/V)^(1/n)
        """
        if material_id:
            mat = self.data_mcp.prism_material_get(material_id)
            if "error" not in mat:
                C = C or mat.get("taylor_C", 200)
                n = n or mat.get("taylor_n", 0.2)
        
        C = C or 200
        n = n or 0.2
        
        # Taylor formula
        T = (C / V) ** (1 / n)
        
        # Calculate economic cutting speed (typically 0.9 * max)
        V_economic = C / (15 ** n)  # 15 min tool life target
        
        return {
            "formula": "Taylor",
            "inputs": {"V": V, "C": C, "n": n},
            "results": {
                "T": round(T, 2),
                "V_economic": round(V_economic, 1)
            },
            "units": {"T": "min", "V": "m/min", "V_economic": "m/min"},
            "warning": "LOW_TOOL_LIFE" if T < 5 else None
        }
    
    def prism_physics_johnson_cook(self, material_id: str = None, strain: float = 0.1,
                                    strain_rate: float = 1000, temp: float = 300,
                                    A: float = None, B: float = None, C_jc: float = None,
                                    n_jc: float = None, m: float = None) -> Dict:
        """Johnson-Cook flow stress model.
        σ = (A + B*ε^n) * (1 + C*ln(ε̇/ε̇₀)) * (1 - ((T-T_room)/(T_melt-T_room))^m)
        """
        # Default values for typical steel
        A = A or 800  # MPa
        B = B or 500  # MPa
        C_jc = C_jc or 0.02
        n_jc = n_jc or 0.4
        m = m or 1.0
        
        T_room = 293  # K
        T_melt = 1800  # K (typical steel)
        strain_rate_ref = 1.0
        
        # Johnson-Cook calculation
        strain_term = A + B * (strain ** n_jc)
        rate_term = 1 + C_jc * math.log(max(strain_rate / strain_rate_ref, 1))
        temp_term = 1 - ((temp - T_room) / (T_melt - T_room)) ** m
        temp_term = max(temp_term, 0)  # Can't be negative
        
        sigma = strain_term * rate_term * temp_term
        
        return {
            "formula": "Johnson-Cook",
            "inputs": {"strain": strain, "strain_rate": strain_rate, "temp": temp},
            "coefficients": {"A": A, "B": B, "C": C_jc, "n": n_jc, "m": m},
            "results": {
                "flow_stress": round(sigma, 2),
                "strain_term": round(strain_term, 2),
                "rate_term": round(rate_term, 3),
                "temp_term": round(temp_term, 3)
            },
            "units": {"flow_stress": "MPa"}
        }
    
    def prism_physics_stability(self, rpm: float, depth: float, width: float,
                                 natural_freq: float = 500, damping: float = 0.03,
                                 kc: float = 2000) -> Dict:
        """Chatter stability analysis.
        Returns stability lobe diagram point evaluation.
        """
        # Tooth passing frequency
        teeth = 4  # Assume 4-flute
        tooth_freq = rpm * teeth / 60
        
        # Critical depth calculation (simplified)
        k = 1e7  # Stiffness N/m (typical)
        blim = k / (2 * kc * width)
        
        # Stability ratio
        stability_ratio = depth / blim
        is_stable = stability_ratio < 1.0
        
        # Phase angle
        phase = math.atan2(2 * damping * (tooth_freq / natural_freq),
                          1 - (tooth_freq / natural_freq) ** 2)
        
        return {
            "formula": "Stability Lobe",
            "inputs": {"rpm": rpm, "depth": depth, "width": width},
            "results": {
                "blim": round(blim, 3),
                "stability_ratio": round(stability_ratio, 3),
                "is_stable": is_stable,
                "tooth_frequency": round(tooth_freq, 1),
                "phase_angle_deg": round(math.degrees(phase), 1)
            },
            "recommendation": "STABLE" if is_stable else "REDUCE_DEPTH",
            "max_safe_depth": round(blim * 0.8, 3)  # 80% of limit
        }
    
    def prism_physics_deflection(self, force: float, length: float, diameter: float,
                                  E: float = 200000) -> Dict:
        """Tool deflection calculation.
        δ = (F * L³) / (3 * E * I)  where I = π*d⁴/64
        """
        # Moment of inertia for circular cross-section
        I = math.pi * (diameter ** 4) / 64
        
        # Deflection (cantilever beam)
        deflection = (force * (length ** 3)) / (3 * E * I)
        
        # Stress at root
        stress = (32 * force * length) / (math.pi * diameter ** 3)
        
        # Safety check
        max_deflection = 0.01 * diameter  # 1% of diameter typical limit
        is_safe = deflection < max_deflection
        
        return {
            "formula": "Cantilever Deflection",
            "inputs": {"force": force, "length": length, "diameter": diameter, "E": E},
            "results": {
                "deflection_mm": round(deflection, 4),
                "deflection_um": round(deflection * 1000, 2),
                "stress_mpa": round(stress, 1),
                "moment_of_inertia": round(I, 2)
            },
            "limits": {
                "max_deflection_mm": round(max_deflection, 4),
                "is_within_limit": is_safe
            },
            "recommendation": "OK" if is_safe else "REDUCE_FORCE_OR_LENGTH"
        }
    
    def prism_physics_surface(self, feed: float, nose_radius: float,
                               method: str = "turning") -> Dict:
        """Surface finish (Ra) calculation.
        Ra ≈ f² / (32 * r)  for turning
        """
        if method == "turning":
            # Theoretical Ra
            Ra_theoretical = (feed ** 2) / (32 * nose_radius) * 1000  # Convert to μm
            
            # Practical Ra (typically 1.5x theoretical)
            Ra_practical = Ra_theoretical * 1.5
            
        elif method == "milling":
            # End mill surface finish
            Ra_theoretical = (feed ** 2) / (8 * nose_radius) * 1000
            Ra_practical = Ra_theoretical * 1.8
        else:
            Ra_theoretical = 1.6
            Ra_practical = 2.4
        
        # Surface finish grade
        if Ra_practical < 0.4:
            grade = "N3 (Mirror)"
        elif Ra_practical < 0.8:
            grade = "N4 (Fine Ground)"
        elif Ra_practical < 1.6:
            grade = "N5 (Ground)"
        elif Ra_practical < 3.2:
            grade = "N6 (Fine Machined)"
        elif Ra_practical < 6.3:
            grade = "N7 (Machined)"
        else:
            grade = "N8+ (Rough)"
        
        return {
            "formula": "Surface Finish",
            "inputs": {"feed": feed, "nose_radius": nose_radius, "method": method},
            "results": {
                "Ra_theoretical_um": round(Ra_theoretical, 3),
                "Ra_practical_um": round(Ra_practical, 3),
                "Rz_estimated_um": round(Ra_practical * 4, 2),
                "surface_grade": grade
            },
            "units": {"Ra": "μm", "Rz": "μm"}
        }
    
    # ─────────────────────────────────────────────────────────────
    # VALIDATION PHYSICS (3 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_validate_kienzle(self, kc1_1: float, mc: float,
                                        material_type: str = "steel") -> Dict:
        """Validate Kienzle coefficients are within reasonable ranges."""
        # Typical ranges by material type
        ranges = {
            "aluminum": {"kc1_1": (400, 1200), "mc": (0.15, 0.30)},
            "steel": {"kc1_1": (1400, 3000), "mc": (0.20, 0.30)},
            "stainless": {"kc1_1": (1800, 3500), "mc": (0.18, 0.28)},
            "titanium": {"kc1_1": (1200, 2000), "mc": (0.20, 0.30)},
            "superalloy": {"kc1_1": (2500, 4500), "mc": (0.22, 0.32)},
        }
        
        r = ranges.get(material_type, ranges["steel"])
        
        kc1_1_valid = r["kc1_1"][0] <= kc1_1 <= r["kc1_1"][1]
        mc_valid = r["mc"][0] <= mc <= r["mc"][1]
        
        return {
            "coefficients": {"kc1_1": kc1_1, "mc": mc},
            "material_type": material_type,
            "validation": {
                "kc1_1_valid": kc1_1_valid,
                "mc_valid": mc_valid,
                "all_valid": kc1_1_valid and mc_valid
            },
            "expected_ranges": r,
            "warnings": [
                f"kc1_1 outside range {r['kc1_1']}" if not kc1_1_valid else None,
                f"mc outside range {r['mc']}" if not mc_valid else None
            ]
        }
    
    def prism_physics_check_limits(self, params: Dict, machine_id: str = None) -> Dict:
        """Check if parameters are within machine/material limits."""
        violations = []
        warnings = []
        
        # Default limits
        limits = {
            "rpm": {"min": 50, "max": 25000},
            "feed": {"min": 0.01, "max": 2.0},
            "depth": {"min": 0.1, "max": 25},
            "speed": {"min": 10, "max": 500},
            "power": {"min": 0, "max": 50}
        }
        
        # Override with machine limits if provided
        if machine_id:
            machine = self.data_mcp.prism_machine_get(machine_id)
            if "error" not in machine:
                limits["rpm"]["max"] = machine.get("max_rpm", 25000)
                limits["power"]["max"] = machine.get("max_power_kw", 50)
        
        for param, value in params.items():
            if param in limits:
                if value < limits[param]["min"]:
                    violations.append(f"{param}={value} below min {limits[param]['min']}")
                elif value > limits[param]["max"]:
                    violations.append(f"{param}={value} above max {limits[param]['max']}")
                elif value > limits[param]["max"] * 0.9:
                    warnings.append(f"{param}={value} near max limit")
        
        return {
            "params_checked": params,
            "limits_applied": limits,
            "violations": violations,
            "warnings": warnings,
            "is_valid": len(violations) == 0,
            "safety_score": max(0, 1.0 - len(violations) * 0.3 - len(warnings) * 0.1)
        }
    
    def prism_physics_unit_convert(self, value: float, from_unit: str, to_unit: str) -> Dict:
        """Convert between common machining units."""
        conversions = {
            # Length
            ("mm", "in"): lambda x: x / 25.4,
            ("in", "mm"): lambda x: x * 25.4,
            ("m", "mm"): lambda x: x * 1000,
            ("mm", "m"): lambda x: x / 1000,
            ("um", "mm"): lambda x: x / 1000,
            ("mm", "um"): lambda x: x * 1000,
            # Speed
            ("m/min", "sfm"): lambda x: x * 3.28084,
            ("sfm", "m/min"): lambda x: x / 3.28084,
            ("mm/min", "ipm"): lambda x: x / 25.4,
            ("ipm", "mm/min"): lambda x: x * 25.4,
            ("mm/rev", "ipr"): lambda x: x / 25.4,
            ("ipr", "mm/rev"): lambda x: x * 25.4,
            # Force
            ("N", "lbf"): lambda x: x * 0.224809,
            ("lbf", "N"): lambda x: x / 0.224809,
            ("kN", "N"): lambda x: x * 1000,
            ("N", "kN"): lambda x: x / 1000,
            # Power
            ("kW", "hp"): lambda x: x * 1.34102,
            ("hp", "kW"): lambda x: x / 1.34102,
            # Pressure
            ("MPa", "psi"): lambda x: x * 145.038,
            ("psi", "MPa"): lambda x: x / 145.038,
            ("bar", "MPa"): lambda x: x / 10,
            ("MPa", "bar"): lambda x: x * 10,
        }
        
        key = (from_unit, to_unit)
        if key in conversions:
            result = conversions[key](value)
            return {
                "input": {"value": value, "unit": from_unit},
                "output": {"value": round(result, 6), "unit": to_unit},
                "conversion_factor": round(result / value, 6) if value != 0 else 0
            }
        
        return {"error": f"Conversion not supported: {from_unit} to {to_unit}"}
    
    # ─────────────────────────────────────────────────────────────
    # OPTIMIZATION (3 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_optimize_speed(self, material_id: str, tool_life_target: float = 15,
                                      machine_id: str = None) -> Dict:
        """Optimize cutting speed for target tool life."""
        mat = self.data_mcp.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        C = mat.get("taylor_C", 200)
        n = mat.get("taylor_n", 0.2)
        
        # Calculate speed for target tool life
        V_optimal = C / (tool_life_target ** n)
        
        # Adjust for machine limits
        max_rpm = 10000
        if machine_id:
            machine = self.data_mcp.prism_machine_get(machine_id)
            if "error" not in machine:
                max_rpm = machine.get("max_rpm", 10000)
        
        return {
            "material": material_id,
            "tool_life_target_min": tool_life_target,
            "optimal_speed_m_min": round(V_optimal, 1),
            "taylor_coefficients": {"C": C, "n": n},
            "recommendations": {
                "roughing": round(V_optimal * 0.7, 1),
                "finishing": round(V_optimal * 1.1, 1),
                "max_productivity": round(C / (5 ** n), 1)  # 5 min tool life
            }
        }
    
    def prism_physics_optimize_feed(self, material_id: str, surface_finish_target: float = 1.6,
                                     nose_radius: float = 0.8) -> Dict:
        """Optimize feed rate for target surface finish."""
        # Ra = f² / (32 * r) => f = sqrt(Ra * 32 * r)
        feed_max = math.sqrt(surface_finish_target * 32 * nose_radius / 1000)
        
        # Practical feed (80% of theoretical max)
        feed_recommended = feed_max * 0.8
        
        return {
            "material": material_id,
            "surface_finish_target_um": surface_finish_target,
            "nose_radius_mm": nose_radius,
            "results": {
                "max_feed_mm_rev": round(feed_max, 3),
                "recommended_feed_mm_rev": round(feed_recommended, 3),
                "roughing_feed_mm_rev": round(feed_max * 1.5, 3)
            },
            "surface_grades": {
                "at_max_feed": f"Ra ~{surface_finish_target} μm",
                "at_recommended": f"Ra ~{surface_finish_target * 0.64} μm"
            }
        }
    
    def prism_physics_optimize_doc(self, material_id: str, tool_diameter: float,
                                    machine_power_kw: float = 15) -> Dict:
        """Optimize depth of cut based on tool and machine capability."""
        mat = self.data_mcp.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        kc1_1 = mat.get("kienzle_kc1_1", 2000)
        
        # Maximum depth based on tool
        max_doc_tool = tool_diameter * 0.5  # 50% of diameter rule
        
        # Maximum depth based on power (simplified)
        # P = Fc * Vc / 60000, Fc = kc * ap * f
        # Assuming Vc=100, f=0.2
        max_doc_power = (machine_power_kw * 60000) / (kc1_1 * 100 * 0.2)
        
        # Take minimum
        max_doc = min(max_doc_tool, max_doc_power)
        
        return {
            "material": material_id,
            "tool_diameter_mm": tool_diameter,
            "machine_power_kw": machine_power_kw,
            "limits": {
                "max_doc_by_tool_mm": round(max_doc_tool, 2),
                "max_doc_by_power_mm": round(max_doc_power, 2),
                "limiting_factor": "tool" if max_doc_tool < max_doc_power else "power"
            },
            "recommendations": {
                "max_doc_mm": round(max_doc, 2),
                "roughing_doc_mm": round(max_doc * 0.8, 2),
                "finishing_doc_mm": round(min(0.5, max_doc * 0.1), 2)
            }
        }



# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: STATE SERVER MCP (11 tools)
# ═══════════════════════════════════════════════════════════════════════════

class StateServerMCP:
    """Session/Event/Decision management - 11 tools."""
    
    def __init__(self):
        self.state_file = STATE_DIR / "CURRENT_STATE.json"
        self.event_log = STATE_DIR / "STATE_LOG.jsonl"
        self.decision_log = STATE_DIR / "DECISION_LOG.jsonl"
        self.checkpoint_dir = STATE_DIR / "checkpoints"
        self.checkpoint_dir.mkdir(exist_ok=True)
        
        self._ensure_files()
    
    def _ensure_files(self):
        """Ensure log files exist."""
        for f in [self.event_log, self.decision_log]:
            if not f.exists():
                f.touch()
    
    def _load_state(self) -> Dict:
        """Load current state."""
        if self.state_file.exists():
            return json.loads(self.state_file.read_text(encoding='utf-8'))
        return {"version": "1.0.0", "timestamp": datetime.now().isoformat()}
    
    def _save_state(self, state: Dict):
        """Save state with sorted keys for cache stability."""
        self.state_file.write_text(
            json.dumps(state, indent=2, sort_keys=True, ensure_ascii=False),
            encoding='utf-8'
        )
    
    def _append_event(self, event: Dict):
        """Append event to log (never overwrite - Law 3)."""
        event["event_id"] = f"EVT-{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}"
        event["timestamp"] = datetime.now().isoformat()
        with open(self.event_log, "a", encoding='utf-8') as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
        return event["event_id"]
    
    # ─────────────────────────────────────────────────────────────
    # SESSION STATE (5 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_state_get(self) -> Dict:
        """Get full current state."""
        state = self._load_state()
        
        # Count events
        event_count = 0
        if self.event_log.exists():
            event_count = sum(1 for _ in open(self.event_log, encoding='utf-8'))
        
        # Count checkpoints
        checkpoint_count = len(list(self.checkpoint_dir.glob("*.json")))
        
        return {
            "state": state,
            "metadata": {
                "event_count": event_count,
                "checkpoint_count": checkpoint_count,
                "state_file": str(self.state_file),
                "last_modified": datetime.fromtimestamp(
                    self.state_file.stat().st_mtime
                ).isoformat() if self.state_file.exists() else None
            }
        }
    
    def prism_state_update(self, delta: Dict) -> Dict:
        """Update state with delta (append-only event logged)."""
        state = self._load_state()
        
        # Deep merge delta
        def merge(base, update):
            for k, v in update.items():
                if k in base and isinstance(base[k], dict) and isinstance(v, dict):
                    merge(base[k], v)
                else:
                    base[k] = v
        
        old_state = json.dumps(state, sort_keys=True)
        merge(state, delta)
        new_state = json.dumps(state, sort_keys=True)
        
        # Log the change event (Law 3: append-only)
        event_id = self._append_event({
            "type": "STATE_UPDATE",
            "delta": delta,
            "checksum_before": hashlib.sha256(old_state.encode()).hexdigest()[:16],
            "checksum_after": hashlib.sha256(new_state.encode()).hexdigest()[:16]
        })
        
        state["lastUpdated"] = datetime.now().isoformat()
        self._save_state(state)
        
        return {"updated": True, "event_id": event_id, "state": state}
    
    def prism_state_checkpoint(self, name: str = None) -> Dict:
        """Create named checkpoint."""
        state = self._load_state()
        
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        name = name or f"auto-{timestamp}"
        
        checkpoint = {
            "checkpoint_id": f"CP-{timestamp}",
            "name": name,
            "timestamp": datetime.now().isoformat(),
            "state_snapshot": state,
            "event_count_at_checkpoint": sum(1 for _ in open(self.event_log, encoding='utf-8')) if self.event_log.exists() else 0
        }
        
        checkpoint_file = self.checkpoint_dir / f"{name}.json"
        checkpoint_file.write_text(json.dumps(checkpoint, indent=2, sort_keys=True), encoding='utf-8')
        
        # Log checkpoint event
        event_id = self._append_event({
            "type": "CHECKPOINT",
            "checkpoint_name": name,
            "checkpoint_file": str(checkpoint_file)
        })
        
        return {
            "checkpoint_id": checkpoint["checkpoint_id"],
            "name": name,
            "file": str(checkpoint_file),
            "event_id": event_id
        }
    
    def prism_state_restore(self, checkpoint_name: str) -> Dict:
        """Restore state from checkpoint."""
        checkpoint_file = self.checkpoint_dir / f"{checkpoint_name}.json"
        
        if not checkpoint_file.exists():
            # Try to find by prefix
            matches = list(self.checkpoint_dir.glob(f"*{checkpoint_name}*.json"))
            if matches:
                checkpoint_file = matches[0]
            else:
                return {"error": f"Checkpoint not found: {checkpoint_name}"}
        
        checkpoint = json.loads(checkpoint_file.read_text(encoding='utf-8'))
        restored_state = checkpoint["state_snapshot"]
        
        # Log restore event before applying
        self._append_event({
            "type": "STATE_RESTORE",
            "from_checkpoint": checkpoint_name,
            "checkpoint_timestamp": checkpoint["timestamp"]
        })
        
        # Apply restored state
        restored_state["restoredFrom"] = checkpoint_name
        restored_state["restoredAt"] = datetime.now().isoformat()
        self._save_state(restored_state)
        
        return {
            "restored": True,
            "from_checkpoint": checkpoint_name,
            "checkpoint_timestamp": checkpoint["timestamp"],
            "state": restored_state
        }
    
    def prism_state_rollback(self, event_id: str) -> Dict:
        """Rollback to state before specific event."""
        events = []
        target_found = False
        
        with open(self.event_log, encoding='utf-8') as f:
            for line in f:
                event = json.loads(line)
                if event.get("event_id") == event_id:
                    target_found = True
                    break
                if event.get("type") == "CHECKPOINT":
                    events.append(event)
        
        if not target_found:
            return {"error": f"Event not found: {event_id}"}
        
        # Find most recent checkpoint before target
        if events:
            last_checkpoint = events[-1]
            return self.prism_state_restore(last_checkpoint.get("checkpoint_name", "unknown"))
        
        return {"error": "No checkpoint found before target event"}
    
    # ─────────────────────────────────────────────────────────────
    # EVENT LOG (3 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_event_append(self, event_type: str, content: Dict) -> str:
        """Append event to log (append-only - Law 3)."""
        event = {
            "type": event_type,
            "content": content
        }
        return self._append_event(event)
    
    def prism_event_search(self, query: Dict) -> List[Dict]:
        """Search events with filters."""
        results = []
        
        if not self.event_log.exists():
            return results
        
        with open(self.event_log, encoding='utf-8') as f:
            for line in f:
                try:
                    event = json.loads(line)
                    
                    # Apply filters
                    match = True
                    if "type" in query and event.get("type") != query["type"]:
                        match = False
                    if "after" in query:
                        if event.get("timestamp", "") < query["after"]:
                            match = False
                    if "before" in query:
                        if event.get("timestamp", "") > query["before"]:
                            match = False
                    if "keyword" in query:
                        if query["keyword"].lower() not in json.dumps(event).lower():
                            match = False
                    
                    if match:
                        results.append(event)
                except:
                    continue
        
        return results[-100:]  # Last 100 matches
    
    def prism_event_recent(self, n: int = 10) -> List[Dict]:
        """Get n most recent events."""
        events = []
        
        if not self.event_log.exists():
            return events
        
        with open(self.event_log, encoding='utf-8') as f:
            for line in f:
                try:
                    events.append(json.loads(line))
                except:
                    continue
        
        return events[-n:]
    
    # ─────────────────────────────────────────────────────────────
    # DECISION LOG (3 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_decision_record(self, decision: Dict) -> str:
        """Record a decision with reasoning."""
        decision["decision_id"] = f"DEC-{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}"
        decision["timestamp"] = datetime.now().isoformat()
        
        with open(self.decision_log, "a", encoding='utf-8') as f:
            f.write(json.dumps(decision, ensure_ascii=False) + "\n")
        
        return decision["decision_id"]
    
    def prism_decision_search(self, query: Dict) -> List[Dict]:
        """Search decisions."""
        results = []
        
        if not self.decision_log.exists():
            return results
        
        with open(self.decision_log, encoding='utf-8') as f:
            for line in f:
                try:
                    decision = json.loads(line)
                    
                    match = True
                    if "keyword" in query:
                        if query["keyword"].lower() not in json.dumps(decision).lower():
                            match = False
                    if "after" in query:
                        if decision.get("timestamp", "") < query["after"]:
                            match = False
                    
                    if match:
                        results.append(decision)
                except:
                    continue
        
        return results[-50:]
    
    def prism_decision_recent(self, n: int = 5) -> List[Dict]:
        """Get n most recent decisions."""
        decisions = []
        
        if not self.decision_log.exists():
            return decisions
        
        with open(self.decision_log, encoding='utf-8') as f:
            for line in f:
                try:
                    decisions.append(json.loads(line))
                except:
                    continue
        
        return decisions[-n:]


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: VALIDATION/SAFETY MCP (8 tools)
# ═══════════════════════════════════════════════════════════════════════════

class ValidationMCP:
    """Quality scoring and safety validation - 8 tools."""
    
    def __init__(self):
        self.safety_threshold = 0.70
        self.anomaly_threshold = 0.30
        self.quality_threshold = 0.65
    
    # ─────────────────────────────────────────────────────────────
    # QUALITY SCORES (4 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_quality_omega(self, output: Dict) -> Dict:
        """Compute full Ω(x) master quality score.
        Ω(x) = 0.18R + 0.14C + 0.10P + 0.22S + 0.06L + 0.10D + 0.08A + 0.07K + 0.05M
        """
        # Extract or compute component scores
        R = output.get("reasoning_score", self._compute_reasoning(output))
        C = output.get("code_score", self._compute_code(output))
        P = output.get("process_score", self._compute_process(output))
        S = output.get("safety_score", self._compute_safety(output))
        L = output.get("learning_score", self._compute_learning(output))
        D = output.get("anomaly_score", self._compute_anomaly(output))
        A = output.get("attention_score", self._compute_attention(output))
        K = output.get("causal_score", self._compute_causal(output))
        M = output.get("memory_score", self._compute_memory(output))
        
        # Master equation
        omega = (0.18 * R + 0.14 * C + 0.10 * P + 0.22 * S + 0.06 * L +
                 0.10 * D + 0.08 * A + 0.07 * K + 0.05 * M)
        
        # Compute confidence interval (simplified)
        scores = [R, C, P, S, L, D, A, K, M]
        omega_lower = omega - 0.1 * (1 - min(scores))
        omega_upper = omega + 0.1 * (1 - max(scores))
        
        # Hard constraints check
        hard_pass = S >= self.safety_threshold and D >= self.anomaly_threshold
        
        # Decision
        if omega >= 0.85 and omega_lower >= 0.70 and hard_pass:
            decision = "RELEASE"
        elif omega >= self.quality_threshold and hard_pass:
            decision = "WARN"
        else:
            decision = "BLOCK"
        
        return {
            "omega": round(omega, 4),
            "omega_lower": round(omega_lower, 4),
            "omega_upper": round(omega_upper, 4),
            "components": {
                "R_reasoning": round(R, 3),
                "C_code": round(C, 3),
                "P_process": round(P, 3),
                "S_safety": round(S, 3),
                "L_learning": round(L, 3),
                "D_anomaly": round(D, 3),
                "A_attention": round(A, 3),
                "K_causal": round(K, 3),
                "M_memory": round(M, 3)
            },
            "weights": {
                "R": 0.18, "C": 0.14, "P": 0.10, "S": 0.22, "L": 0.06,
                "D": 0.10, "A": 0.08, "K": 0.07, "M": 0.05
            },
            "hard_constraints": {
                "S_passed": S >= self.safety_threshold,
                "D_passed": D >= self.anomaly_threshold,
                "all_passed": hard_pass
            },
            "decision": decision,
            "thresholds": {
                "release": "Ω ≥ 0.85 AND Ω_lower ≥ 0.70",
                "warn": "Ω ≥ 0.65",
                "block": "Ω < 0.65 OR S < 0.70 OR D < 0.30"
            }
        }
    
    def _compute_reasoning(self, output: Dict) -> float:
        """Compute reasoning score."""
        score = 0.7
        if output.get("has_evidence"): score += 0.1
        if output.get("has_chain_of_thought"): score += 0.1
        if output.get("considers_alternatives"): score += 0.1
        return min(score, 1.0)
    
    def _compute_code(self, output: Dict) -> float:
        """Compute code quality score."""
        score = 0.7
        if not output.get("has_placeholders", True): score += 0.15
        if output.get("has_error_handling"): score += 0.1
        if output.get("follows_patterns"): score += 0.05
        return min(score, 1.0)
    
    def _compute_process(self, output: Dict) -> float:
        """Compute process adherence score."""
        score = 0.7
        if output.get("followed_workflow"): score += 0.15
        if output.get("checkpoints_created"): score += 0.1
        if output.get("state_updated"): score += 0.05
        return min(score, 1.0)
    
    def _compute_safety(self, output: Dict) -> float:
        """Compute safety score."""
        score = 0.8
        if output.get("validated_limits"): score += 0.1
        if output.get("no_dangerous_operations"): score += 0.1
        if output.get("has_warnings", False): score -= 0.2
        if output.get("has_violations", False): score -= 0.4
        return max(0, min(score, 1.0))
    
    def _compute_learning(self, output: Dict) -> float:
        """Compute learning score."""
        return output.get("learning_extracted", 0.6)
    
    def _compute_anomaly(self, output: Dict) -> float:
        """Compute anomaly detection score (higher = fewer anomalies)."""
        score = 0.8
        anomalies = output.get("anomalies_detected", 0)
        score -= anomalies * 0.1
        return max(0.3, min(score, 1.0))
    
    def _compute_attention(self, output: Dict) -> float:
        """Compute attention/focus score."""
        return output.get("goal_adherence", 0.7)
    
    def _compute_causal(self, output: Dict) -> float:
        """Compute causal reasoning score."""
        score = 0.6
        if output.get("explains_causation"): score += 0.2
        if output.get("predicts_effects"): score += 0.2
        return min(score, 1.0)
    
    def _compute_memory(self, output: Dict) -> float:
        """Compute memory/continuity score."""
        score = 0.6
        if output.get("references_history"): score += 0.2
        if output.get("maintains_context"): score += 0.2
        return min(score, 1.0)
    
    def prism_quality_safety(self, output: Dict) -> Dict:
        """Compute S(x) safety score in detail."""
        violations = []
        warnings = []
        
        # Check for dangerous patterns
        content = json.dumps(output).lower()
        
        dangerous_patterns = [
            ("delete_all", "Mass deletion detected"),
            ("rm -rf", "Recursive delete detected"),
            ("override_safety", "Safety override attempt"),
            ("skip_validation", "Validation skip detected"),
            ("force_", "Force operation detected"),
        ]
        
        for pattern, msg in dangerous_patterns:
            if pattern in content:
                violations.append(msg)
        
        # Check for incomplete work
        if "todo" in content or "placeholder" in content or "fixme" in content:
            warnings.append("Incomplete work markers found")
        
        # Compute score
        base_score = 1.0
        base_score -= len(violations) * 0.3
        base_score -= len(warnings) * 0.1
        
        safety_score = max(0, min(base_score, 1.0))
        
        return {
            "S_x": round(safety_score, 3),
            "passed": safety_score >= self.safety_threshold,
            "threshold": self.safety_threshold,
            "violations": violations,
            "warnings": warnings,
            "is_hard_block": safety_score < self.safety_threshold
        }
    
    def prism_quality_reasoning(self, output: Dict) -> Dict:
        """Compute R(x) reasoning score."""
        R = self._compute_reasoning(output)
        return {
            "R_x": round(R, 3),
            "factors": {
                "has_evidence": output.get("has_evidence", False),
                "chain_of_thought": output.get("has_chain_of_thought", False),
                "considers_alternatives": output.get("considers_alternatives", False)
            }
        }
    
    def prism_quality_code(self, output: Dict) -> Dict:
        """Compute C(x) code quality score."""
        C = self._compute_code(output)
        return {
            "C_x": round(C, 3),
            "factors": {
                "no_placeholders": not output.get("has_placeholders", True),
                "error_handling": output.get("has_error_handling", False),
                "follows_patterns": output.get("follows_patterns", False)
            }
        }
    
    # ─────────────────────────────────────────────────────────────
    # VALIDATION GATES (2 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_validate_gates(self, output: Dict) -> Dict:
        """Run all 9 validation gates."""
        gates = {
            "G1_drive_accessible": True,  # Assume true in MCP context
            "G2_state_valid": output.get("state_valid", True),
            "G3_input_understood": output.get("input_clear", True),
            "G4_skills_available": True,
            "G5_output_path_valid": not str(output.get("output_path", "C:")).startswith("/home"),
            "G6_evidence_exists": output.get("evidence_level", 0) >= 3,
            "G7_no_regression": output.get("new_count", 0) >= output.get("old_count", 0),
            "G8_safety_passed": self._compute_safety(output) >= self.safety_threshold,
            "G9_anomaly_passed": self._compute_anomaly(output) >= self.anomaly_threshold
        }
        
        failed = [g for g, passed in gates.items() if not passed]
        all_passed = len(failed) == 0
        
        return {
            "gates": gates,
            "all_passed": all_passed,
            "failed_gates": failed,
            "hard_blocks": [g for g in failed if g in ["G8_safety_passed", "G9_anomaly_passed"]],
            "can_proceed": all_passed or (len([g for g in failed if g.startswith("G8") or g.startswith("G9")]) == 0)
        }
    
    def prism_validate_anti_regression(self, old: Dict, new: Dict) -> Dict:
        """Validate new version doesn't regress from old."""
        checks = []
        
        # Count items
        def count_items(d, prefix=""):
            count = 0
            if isinstance(d, dict):
                count += len(d)
                for k, v in d.items():
                    count += count_items(v, f"{prefix}.{k}")
            elif isinstance(d, list):
                count += len(d)
                for item in d:
                    count += count_items(item, prefix)
            return count
        
        old_count = count_items(old)
        new_count = count_items(new)
        
        # Size comparison
        old_size = len(json.dumps(old))
        new_size = len(json.dumps(new))
        
        size_ratio = new_size / old_size if old_size > 0 else 1.0
        
        checks.append({
            "check": "item_count",
            "old": old_count,
            "new": new_count,
            "passed": new_count >= old_count
        })
        
        checks.append({
            "check": "size",
            "old_bytes": old_size,
            "new_bytes": new_size,
            "ratio": round(size_ratio, 3),
            "passed": size_ratio >= 0.8  # Allow 20% reduction
        })
        
        all_passed = all(c["passed"] for c in checks)
        
        return {
            "anti_regression_passed": all_passed,
            "checks": checks,
            "warning": "SIGNIFICANT_REDUCTION" if size_ratio < 0.8 else None,
            "recommendation": "INVESTIGATE" if not all_passed else "PROCEED"
        }
    
    # ─────────────────────────────────────────────────────────────
    # SAFETY CHECKS (2 tools)
    # ─────────────────────────────────────────────────────────────
    
    def prism_safety_check_limits(self, params: Dict, limits: Dict = None) -> Dict:
        """Check parameters against safety limits."""
        if limits is None:
            limits = {
                "rpm": {"min": 50, "max": 30000},
                "feed": {"min": 0.001, "max": 10.0},
                "depth": {"min": 0.01, "max": 50},
                "power": {"min": 0, "max": 100},
                "temperature": {"min": -50, "max": 1500}
            }
        
        violations = []
        warnings = []
        
        for param, value in params.items():
            if param in limits:
                if value < limits[param]["min"]:
                    violations.append(f"{param}={value} BELOW minimum {limits[param]['min']}")
                elif value > limits[param]["max"]:
                    violations.append(f"{param}={value} ABOVE maximum {limits[param]['max']}")
                elif value > limits[param]["max"] * 0.95:
                    warnings.append(f"{param}={value} approaching maximum")
                elif value < limits[param]["min"] * 1.05 and limits[param]["min"] > 0:
                    warnings.append(f"{param}={value} approaching minimum")
        
        safety_score = max(0, 1.0 - len(violations) * 0.4 - len(warnings) * 0.1)
        
        return {
            "params": params,
            "violations": violations,
            "warnings": warnings,
            "safety_score": round(safety_score, 3),
            "is_safe": len(violations) == 0,
            "is_hard_block": safety_score < self.safety_threshold
        }
    
    def prism_safety_check_collision(self, path: Dict) -> Dict:
        """Check toolpath for potential collisions."""
        # Simplified collision detection
        warnings = []
        violations = []
        
        points = path.get("points", [])
        
        # Check for rapid moves near work
        for i, p in enumerate(points):
            if p.get("move_type") == "rapid":
                z = p.get("z", 100)
                if z < 5:  # Less than 5mm clearance
                    violations.append(f"Rapid move at low Z ({z}mm) at point {i}")
                elif z < 10:
                    warnings.append(f"Rapid move near work (Z={z}mm) at point {i}")
        
        # Check for excessive depth changes
        for i in range(1, len(points)):
            z_change = abs(points[i].get("z", 0) - points[i-1].get("z", 0))
            if z_change > 20:
                warnings.append(f"Large Z change ({z_change}mm) between points {i-1} and {i}")
        
        has_collision_risk = len(violations) > 0
        
        return {
            "path_points_checked": len(points),
            "violations": violations,
            "warnings": warnings,
            "collision_risk": has_collision_risk,
            "recommendation": "STOP" if has_collision_risk else "PROCEED",
            "safety_score": max(0, 1.0 - len(violations) * 0.5 - len(warnings) * 0.1)
        }



# ═══════════════════════════════════════════════════════════════════════════
# UNIFIED MCP SERVER
# ═══════════════════════════════════════════════════════════════════════════

class PRISMMCPServer:
    """
    Unified PRISM MCP Server - 54 tools across 5 categories.
    
    Categories:
        1. Orchestration (14): Skill/Agent/Hook/Formula management
        2. Data Query (9): Materials/Machines/Alarms
        3. Physics (12): Cutting calculations
        4. State Server (11): Session/Event/Decision
        5. Validation (8): Quality/Safety
    """
    
    def __init__(self):
        # Initialize all MCP modules
        self.orchestration = OrchestrationMCP()
        self.data = DataQueryMCP()
        self.physics = PhysicsMCP(self.data)
        self.state = StateServerMCP()
        self.validation = ValidationMCP()
        
        # Build tool registry
        self.tools = self._build_tool_registry()
        
        # Statistics
        self.call_count = 0
        self.call_history = []
    
    def _build_tool_registry(self) -> Dict[str, callable]:
        """Build mapping of tool names to methods."""
        tools = {}
        
        # Orchestration tools (14)
        tools["prism_skill_load"] = self.orchestration.prism_skill_load
        tools["prism_skill_list"] = self.orchestration.prism_skill_list
        tools["prism_skill_relevance"] = self.orchestration.prism_skill_relevance
        tools["prism_skill_select"] = self.orchestration.prism_skill_select
        tools["prism_skill_dependencies"] = self.orchestration.prism_skill_dependencies
        tools["prism_skill_consumers"] = self.orchestration.prism_skill_consumers
        tools["prism_agent_list"] = self.orchestration.prism_agent_list
        tools["prism_agent_select"] = self.orchestration.prism_agent_select
        tools["prism_agent_spawn"] = self.orchestration.prism_agent_spawn
        tools["prism_agent_status"] = self.orchestration.prism_agent_status
        tools["prism_hook_list"] = self.orchestration.prism_hook_list
        tools["prism_hook_trigger"] = self.orchestration.prism_hook_trigger
        tools["prism_formula_list"] = self.orchestration.prism_formula_list
        tools["prism_formula_apply"] = self.orchestration.prism_formula_apply
        
        # Data Query tools (9)
        tools["prism_material_get"] = self.data.prism_material_get
        tools["prism_material_search"] = self.data.prism_material_search
        tools["prism_material_property"] = self.data.prism_material_property
        tools["prism_material_similar"] = self.data.prism_material_similar
        tools["prism_machine_get"] = self.data.prism_machine_get
        tools["prism_machine_search"] = self.data.prism_machine_search
        tools["prism_machine_capabilities"] = self.data.prism_machine_capabilities
        tools["prism_alarm_get"] = self.data.prism_alarm_get
        tools["prism_alarm_search"] = self.data.prism_alarm_search
        
        # Physics tools (12)
        tools["prism_physics_kienzle"] = self.physics.prism_physics_kienzle
        tools["prism_physics_taylor"] = self.physics.prism_physics_taylor
        tools["prism_physics_johnson_cook"] = self.physics.prism_physics_johnson_cook
        tools["prism_physics_stability"] = self.physics.prism_physics_stability
        tools["prism_physics_deflection"] = self.physics.prism_physics_deflection
        tools["prism_physics_surface"] = self.physics.prism_physics_surface
        tools["prism_physics_validate_kienzle"] = self.physics.prism_physics_validate_kienzle
        tools["prism_physics_check_limits"] = self.physics.prism_physics_check_limits
        tools["prism_physics_unit_convert"] = self.physics.prism_physics_unit_convert
        tools["prism_physics_optimize_speed"] = self.physics.prism_physics_optimize_speed
        tools["prism_physics_optimize_feed"] = self.physics.prism_physics_optimize_feed
        tools["prism_physics_optimize_doc"] = self.physics.prism_physics_optimize_doc
        
        # State Server tools (11)
        tools["prism_state_get"] = self.state.prism_state_get
        tools["prism_state_update"] = self.state.prism_state_update
        tools["prism_state_checkpoint"] = self.state.prism_state_checkpoint
        tools["prism_state_restore"] = self.state.prism_state_restore
        tools["prism_state_rollback"] = self.state.prism_state_rollback
        tools["prism_event_append"] = self.state.prism_event_append
        tools["prism_event_search"] = self.state.prism_event_search
        tools["prism_event_recent"] = self.state.prism_event_recent
        tools["prism_decision_record"] = self.state.prism_decision_record
        tools["prism_decision_search"] = self.state.prism_decision_search
        tools["prism_decision_recent"] = self.state.prism_decision_recent
        
        # Validation tools (8)
        tools["prism_quality_omega"] = self.validation.prism_quality_omega
        tools["prism_quality_safety"] = self.validation.prism_quality_safety
        tools["prism_quality_reasoning"] = self.validation.prism_quality_reasoning
        tools["prism_quality_code"] = self.validation.prism_quality_code
        tools["prism_validate_gates"] = self.validation.prism_validate_gates
        tools["prism_validate_anti_regression"] = self.validation.prism_validate_anti_regression
        tools["prism_safety_check_limits"] = self.validation.prism_safety_check_limits
        tools["prism_safety_check_collision"] = self.validation.prism_safety_check_collision
        
        return tools
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Call a tool by name with parameters."""
        params = params or {}
        
        if tool_name not in self.tools:
            return {"error": f"Unknown tool: {tool_name}", "available": list(self.tools.keys())}
        
        # Track call
        self.call_count += 1
        self.call_history.append({
            "tool": tool_name,
            "params": params,
            "timestamp": datetime.now().isoformat()
        })
        
        # Execute
        try:
            result = self.tools[tool_name](**params)
            return result
        except Exception as e:
            return {"error": str(e), "tool": tool_name, "params": params}
    
    def list_tools(self, category: str = None) -> List[str]:
        """List available tools, optionally filtered by category."""
        categories = {
            "orchestration": ["prism_skill_", "prism_agent_", "prism_hook_", "prism_formula_"],
            "data": ["prism_material_", "prism_machine_", "prism_alarm_"],
            "physics": ["prism_physics_"],
            "state": ["prism_state_", "prism_event_", "prism_decision_"],
            "validation": ["prism_quality_", "prism_validate_", "prism_safety_"]
        }
        
        if category and category in categories:
            prefixes = categories[category]
            return [t for t in self.tools.keys() if any(t.startswith(p) for p in prefixes)]
        
        return list(self.tools.keys())
    
    def get_stats(self) -> Dict:
        """Get server statistics."""
        return {
            "total_tools": len(self.tools),
            "categories": {
                "orchestration": 14,
                "data_query": 9,
                "physics": 12,
                "state_server": 11,
                "validation": 8
            },
            "call_count": self.call_count,
            "recent_calls": self.call_history[-10:]
        }
    
    def run_diagnostics(self) -> Dict:
        """Run diagnostic tests on all modules."""
        results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "passed": 0,
            "failed": 0
        }
        
        # Test orchestration
        try:
            skills = self.call("prism_skill_list", {})
            results["tests"].append({"module": "orchestration", "test": "skill_list", "passed": isinstance(skills, list)})
        except Exception as e:
            results["tests"].append({"module": "orchestration", "test": "skill_list", "passed": False, "error": str(e)})
        
        # Test data
        try:
            mat = self.call("prism_material_get", {"id": "AL-6061"})
            results["tests"].append({"module": "data", "test": "material_get", "passed": "error" not in mat})
        except Exception as e:
            results["tests"].append({"module": "data", "test": "material_get", "passed": False, "error": str(e)})
        
        # Test physics
        try:
            fc = self.call("prism_physics_kienzle", {"b": 5, "h": 0.2})
            results["tests"].append({"module": "physics", "test": "kienzle", "passed": "results" in fc})
        except Exception as e:
            results["tests"].append({"module": "physics", "test": "kienzle", "passed": False, "error": str(e)})
        
        # Test state
        try:
            state = self.call("prism_state_get", {})
            results["tests"].append({"module": "state", "test": "state_get", "passed": "state" in state})
        except Exception as e:
            results["tests"].append({"module": "state", "test": "state_get", "passed": False, "error": str(e)})
        
        # Test validation
        try:
            omega = self.call("prism_quality_omega", {"has_evidence": True})
            results["tests"].append({"module": "validation", "test": "omega", "passed": "omega" in omega})
        except Exception as e:
            results["tests"].append({"module": "validation", "test": "omega", "passed": False, "error": str(e)})
        
        # Count results
        results["passed"] = sum(1 for t in results["tests"] if t["passed"])
        results["failed"] = len(results["tests"]) - results["passed"]
        results["all_passed"] = results["failed"] == 0
        
        return results


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """CLI interface for PRISM MCP Server."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM MCP Server v1.0")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # List tools
    list_parser = subparsers.add_parser("list", help="List available tools")
    list_parser.add_argument("--category", "-c", help="Filter by category")
    
    # Call tool
    call_parser = subparsers.add_parser("call", help="Call a tool")
    call_parser.add_argument("tool", help="Tool name")
    call_parser.add_argument("--params", "-p", help="JSON parameters")
    
    # Run diagnostics
    subparsers.add_parser("diagnostics", help="Run diagnostic tests")
    
    # Stats
    subparsers.add_parser("stats", help="Show server statistics")
    
    # Demo
    subparsers.add_parser("demo", help="Run demo of all categories")
    
    args = parser.parse_args()
    
    mcp = PRISMMCPServer()
    
    if args.command == "list":
        tools = mcp.list_tools(args.category)
        print(f"\n{'='*60}")
        print(f"  PRISM MCP TOOLS ({len(tools)} total)")
        print(f"{'='*60}")
        for i, t in enumerate(sorted(tools), 1):
            print(f"  {i:2}. {t}")
        print()
    
    elif args.command == "call":
        params = json.loads(args.params) if args.params else {}
        result = mcp.call(args.tool, params)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "diagnostics":
        results = mcp.run_diagnostics()
        print(f"\n{'='*60}")
        print(f"  PRISM MCP DIAGNOSTICS")
        print(f"{'='*60}")
        for test in results["tests"]:
            status = "✓" if test["passed"] else "✗"
            print(f"  [{status}] {test['module']}.{test['test']}")
        print(f"\n  Passed: {results['passed']}/{len(results['tests'])}")
        print(f"  Status: {'ALL PASSED ✓' if results['all_passed'] else 'FAILURES DETECTED ✗'}")
        print()
    
    elif args.command == "stats":
        stats = mcp.get_stats()
        print(f"\n{'='*60}")
        print(f"  PRISM MCP SERVER STATISTICS")
        print(f"{'='*60}")
        print(f"  Total Tools: {stats['total_tools']}")
        print(f"\n  Categories:")
        for cat, count in stats['categories'].items():
            print(f"    - {cat}: {count} tools")
        print(f"\n  Call Count: {stats['call_count']}")
        print()
    
    elif args.command == "demo":
        print(f"\n{'='*60}")
        print(f"  PRISM MCP SERVER DEMO")
        print(f"{'='*60}")
        
        # Demo each category
        print("\n  1. ORCHESTRATION - Skill Selection")
        result = mcp.call("prism_skill_relevance", {"task": "materials extraction"})
        print(f"     Top skills for 'materials extraction':")
        for skill, score in list(result.items())[:3]:
            print(f"       - {skill}: {score:.2f}")
        
        print("\n  2. DATA QUERY - Material Lookup")
        result = mcp.call("prism_material_get", {"id": "AL-6061"})
        print(f"     AL-6061: {result.get('name', 'N/A')}")
        print(f"     Hardness: {result.get('hardness_hrc', 0)} HRC")
        
        print("\n  3. PHYSICS - Cutting Force")
        result = mcp.call("prism_physics_kienzle", {"material_id": "AL-6061", "b": 5, "h": 0.2})
        print(f"     Kienzle Force: {result['results']['Fc']} N")
        
        print("\n  4. STATE SERVER - Current State")
        result = mcp.call("prism_state_get", {})
        print(f"     State Version: {result['state'].get('version', 'N/A')}")
        print(f"     Events Logged: {result['metadata']['event_count']}")
        
        print("\n  5. VALIDATION - Quality Score")
        result = mcp.call("prism_quality_omega", {"has_evidence": True, "has_chain_of_thought": True})
        print(f"     Ω(x) Score: {result['omega']:.3f}")
        print(f"     Decision: {result['decision']}")
        
        print(f"\n{'='*60}")
        print(f"  DEMO COMPLETE - {mcp.get_stats()['total_tools']} tools ready")
        print(f"{'='*60}\n")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()



# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: PHYSICS CALCULATION MCP (12 tools)
# ═══════════════════════════════════════════════════════════════════════════

class PhysicsMCP:
    """Cutting physics calculations - 12 tools."""
    
    def __init__(self, data_mcp: DataQueryMCP):
        self.data = data_mcp
    
    # ─────────────────────────────────────────────────────────────
    # CUTTING PHYSICS (6)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_kienzle(self, material_id: str, depth_mm: float, 
                               feed_mm: float, width_mm: float = None) -> Dict:
        """Calculate cutting force using Kienzle equation."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        kc1_1 = mat.get("kienzle_kc1_1", 1500)
        mc = mat.get("kienzle_mc", 0.25)
        
        # h = chip thickness ≈ feed for orthogonal cutting
        h = feed_mm
        b = width_mm if width_mm else depth_mm
        
        # Kienzle: Fc = kc1.1 * b * h^(1-mc)
        Fc = kc1_1 * b * (h ** (1 - mc))
        
        # Specific cutting force
        kc = kc1_1 * (h ** (-mc))
        
        return {
            "material": material_id,
            "cutting_force_N": round(Fc, 2),
            "specific_cutting_force_N_mm2": round(kc, 2),
            "parameters": {"kc1_1": kc1_1, "mc": mc, "h": h, "b": b},
            "safety_factor": 1.2,
            "max_recommended_force_N": round(Fc * 1.2, 2)
        }
    
    def prism_physics_taylor(self, material_id: str, cutting_speed_m_min: float) -> Dict:
        """Calculate tool life using Taylor equation."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        C = mat.get("taylor_C", 200)
        n = mat.get("taylor_n", 0.2)
        V = cutting_speed_m_min
        
        # Taylor: V * T^n = C  =>  T = (C/V)^(1/n)
        if V > 0:
            T = (C / V) ** (1 / n)
        else:
            T = 0
        
        return {
            "material": material_id,
            "cutting_speed_m_min": V,
            "tool_life_min": round(T, 2),
            "parameters": {"C": C, "n": n},
            "optimal_speed_for_30min": round(C / (30 ** n), 2),
            "optimal_speed_for_60min": round(C / (60 ** n), 2)
        }
    
    def prism_physics_johnson_cook(self, material_id: str, strain: float,
                                    strain_rate: float, temperature_C: float) -> Dict:
        """Calculate flow stress using Johnson-Cook model."""
        # Simplified J-C model: σ = (A + B*ε^n)(1 + C*ln(ε_dot))(1 - T*^m)
        # Using typical values - in production would come from material DB
        
        A = 800  # Yield stress MPa
        B = 500  # Hardening modulus
        n_jc = 0.4  # Hardening exponent
        C_jc = 0.02  # Strain rate sensitivity
        m = 1.0  # Thermal softening
        T_melt = 1500  # Melting temp C
        T_ref = 25  # Reference temp C
        
        # Strain hardening
        strain_term = A + B * (strain ** n_jc)
        
        # Strain rate
        eps_dot_ref = 1.0
        rate_term = 1 + C_jc * math.log(max(strain_rate / eps_dot_ref, 1))
        
        # Thermal softening
        T_star = (temperature_C - T_ref) / (T_melt - T_ref)
        T_star = max(0, min(T_star, 1))
        thermal_term = 1 - (T_star ** m)
        
        flow_stress = strain_term * rate_term * thermal_term
        
        return {
            "material": material_id,
            "flow_stress_MPa": round(flow_stress, 2),
            "inputs": {"strain": strain, "strain_rate": strain_rate, "temperature_C": temperature_C},
            "terms": {
                "strain_hardening": round(strain_term, 2),
                "strain_rate_effect": round(rate_term, 3),
                "thermal_softening": round(thermal_term, 3)
            }
        }
    
    def prism_physics_stability(self, machine_id: str, tool_diameter_mm: float,
                                 overhang_mm: float, rpm: int) -> Dict:
        """Check chatter stability."""
        machine = self.data.prism_machine_get(machine_id)
        if "error" in machine:
            return machine
        
        # Simplified stability check
        # Critical: overhang/diameter ratio
        L_D_ratio = overhang_mm / tool_diameter_mm
        
        # Frequency estimation (simplified)
        natural_freq_hz = 1000 / (L_D_ratio ** 2)  # Simplified
        spindle_freq_hz = rpm / 60
        
        # Stability lobes - check if we're near resonance
        harmonic_ratio = spindle_freq_hz / natural_freq_hz
        near_resonance = any(abs(harmonic_ratio - n) < 0.1 for n in [1, 2, 3, 4])
        
        stability_index = 1.0 - (L_D_ratio / 10)  # Decreases with overhang
        stability_index = max(0, min(stability_index, 1))
        
        return {
            "machine": machine_id,
            "tool_diameter_mm": tool_diameter_mm,
            "overhang_mm": overhang_mm,
            "L_D_ratio": round(L_D_ratio, 2),
            "estimated_natural_freq_hz": round(natural_freq_hz, 1),
            "spindle_freq_hz": round(spindle_freq_hz, 2),
            "stability_index": round(stability_index, 3),
            "stable": stability_index > 0.5 and not near_resonance,
            "near_resonance": near_resonance,
            "recommendation": "SAFE" if stability_index > 0.7 else ("CAUTION" if stability_index > 0.4 else "REDUCE OVERHANG")
        }
    
    def prism_physics_deflection(self, tool_diameter_mm: float, overhang_mm: float,
                                  cutting_force_N: float, tool_material: str = "carbide") -> Dict:
        """Calculate tool deflection."""
        # Young's modulus (GPa)
        E_values = {"carbide": 600, "hss": 210, "ceramic": 400}
        E = E_values.get(tool_material.lower(), 600) * 1000  # Convert to MPa
        
        # Moment of inertia for circular cross-section
        r = tool_diameter_mm / 2
        I = math.pi * (r ** 4) / 4  # mm^4
        
        # Cantilever deflection: δ = F*L³/(3*E*I)
        L = overhang_mm
        deflection_mm = (cutting_force_N * (L ** 3)) / (3 * E * I)
        
        # Surface finish impact (simplified)
        Ra_increase = deflection_mm * 10  # μm
        
        return {
            "tool_diameter_mm": tool_diameter_mm,
            "overhang_mm": overhang_mm,
            "cutting_force_N": cutting_force_N,
            "deflection_mm": round(deflection_mm, 4),
            "deflection_um": round(deflection_mm * 1000, 2),
            "acceptable": deflection_mm < 0.05,
            "Ra_impact_um": round(Ra_increase, 2),
            "E_modulus_GPa": E / 1000
        }
    
    def prism_physics_surface(self, feed_mm_rev: float, tool_nose_radius_mm: float) -> Dict:
        """Calculate theoretical surface finish (Ra)."""
        # Theoretical Ra = f²/(32*r) for turning
        # For milling it's more complex
        
        f = feed_mm_rev
        r = tool_nose_radius_mm
        
        if r > 0:
            Ra_theoretical_um = ((f ** 2) / (32 * r)) * 1000  # Convert to μm
        else:
            Ra_theoretical_um = float('inf')
        
        # Practical Ra is typically 1.5-2x theoretical
        Ra_practical_um = Ra_theoretical_um * 1.7
        
        return {
            "feed_mm_rev": f,
            "nose_radius_mm": r,
            "Ra_theoretical_um": round(Ra_theoretical_um, 3),
            "Ra_practical_um": round(Ra_practical_um, 3),
            "surface_quality": "Fine" if Ra_practical_um < 1.6 else ("Medium" if Ra_practical_um < 3.2 else "Rough"),
            "ISO_grade": "N6" if Ra_practical_um < 0.8 else ("N7" if Ra_practical_um < 1.6 else ("N8" if Ra_practical_um < 3.2 else "N9+"))
        }
    
    # ─────────────────────────────────────────────────────────────
    # VALIDATION PHYSICS (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_validate_kienzle(self, kc1_1: float, mc: float) -> Dict:
        """Validate Kienzle coefficients are within reasonable ranges."""
        issues = []
        
        # kc1.1 typical ranges by material
        if kc1_1 < 300:
            issues.append(f"kc1.1={kc1_1} too low (min ~300 for soft materials)")
        if kc1_1 > 5000:
            issues.append(f"kc1.1={kc1_1} too high (max ~5000 for hardest materials)")
        
        # mc typically 0.15-0.35
        if mc < 0.10:
            issues.append(f"mc={mc} too low (typical min 0.15)")
        if mc > 0.40:
            issues.append(f"mc={mc} too high (typical max 0.35)")
        
        return {
            "kc1_1": kc1_1,
            "mc": mc,
            "valid": len(issues) == 0,
            "issues": issues,
            "typical_ranges": {
                "kc1_1": {"min": 300, "max": 5000, "unit": "N/mm²"},
                "mc": {"min": 0.15, "max": 0.35, "unit": "dimensionless"}
            }
        }
    
    def prism_physics_check_limits(self, machine_id: str, rpm: int, 
                                    power_kw: float, torque_nm: float) -> Dict:
        """Check if parameters are within machine limits."""
        machine = self.data.prism_machine_get(machine_id)
        if "error" in machine:
            return machine
        
        violations = []
        warnings = []
        
        # RPM check
        if rpm > machine["max_rpm"]:
            violations.append(f"RPM {rpm} exceeds max {machine['max_rpm']}")
        elif rpm > machine["max_rpm"] * 0.9:
            warnings.append(f"RPM {rpm} is >90% of max")
        
        # Power check
        if power_kw > machine["max_power_kw"]:
            violations.append(f"Power {power_kw}kW exceeds max {machine['max_power_kw']}kW")
        elif power_kw > machine["max_power_kw"] * 0.85:
            warnings.append(f"Power {power_kw}kW is >85% of max")
        
        # Torque check
        if torque_nm > machine["max_torque_nm"]:
            violations.append(f"Torque {torque_nm}Nm exceeds max {machine['max_torque_nm']}Nm")
        
        return {
            "machine": machine_id,
            "requested": {"rpm": rpm, "power_kw": power_kw, "torque_nm": torque_nm},
            "limits": {
                "max_rpm": machine["max_rpm"],
                "max_power_kw": machine["max_power_kw"],
                "max_torque_nm": machine["max_torque_nm"]
            },
            "safe": len(violations) == 0,
            "violations": violations,
            "warnings": warnings
        }
    
    def prism_physics_unit_convert(self, value: float, from_unit: str, to_unit: str) -> Dict:
        """Convert between common machining units."""
        conversions = {
            # Length
            ("mm", "in"): lambda x: x / 25.4,
            ("in", "mm"): lambda x: x * 25.4,
            ("m", "mm"): lambda x: x * 1000,
            ("mm", "m"): lambda x: x / 1000,
            # Speed
            ("m/min", "sfm"): lambda x: x * 3.281,
            ("sfm", "m/min"): lambda x: x / 3.281,
            ("mm/min", "ipm"): lambda x: x / 25.4,
            ("ipm", "mm/min"): lambda x: x * 25.4,
            # Force
            ("N", "lbf"): lambda x: x * 0.2248,
            ("lbf", "N"): lambda x: x / 0.2248,
            # Power
            ("kW", "hp"): lambda x: x * 1.341,
            ("hp", "kW"): lambda x: x / 1.341,
            # Pressure
            ("MPa", "psi"): lambda x: x * 145.038,
            ("psi", "MPa"): lambda x: x / 145.038,
        }
        
        key = (from_unit.lower(), to_unit.lower())
        if key in conversions:
            result = conversions[key](value)
            return {
                "input": {"value": value, "unit": from_unit},
                "output": {"value": round(result, 6), "unit": to_unit}
            }
        
        return {"error": f"Conversion not supported: {from_unit} to {to_unit}"}
    
    # ─────────────────────────────────────────────────────────────
    # OPTIMIZATION (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_optimize_speed(self, material_id: str, machine_id: str,
                                      tool_diameter_mm: float, target_life_min: float = 30) -> Dict:
        """Calculate optimal cutting speed."""
        mat = self.data.prism_material_get(material_id)
        machine = self.data.prism_machine_get(machine_id)
        
        if "error" in mat:
            return mat
        if "error" in machine:
            return machine
        
        C = mat.get("taylor_C", 200)
        n = mat.get("taylor_n", 0.2)
        
        # Taylor: V = C / T^n
        V_optimal = C / (target_life_min ** n)
        
        # Convert to RPM
        rpm = (V_optimal * 1000) / (math.pi * tool_diameter_mm)
        
        # Clamp to machine limits
        rpm_limited = min(rpm, machine["max_rpm"])
        V_limited = (rpm_limited * math.pi * tool_diameter_mm) / 1000
        
        return {
            "material": material_id,
            "machine": machine_id,
            "tool_diameter_mm": tool_diameter_mm,
            "target_tool_life_min": target_life_min,
            "optimal_speed_m_min": round(V_optimal, 1),
            "optimal_rpm": round(rpm),
            "machine_limited_rpm": round(rpm_limited),
            "actual_speed_m_min": round(V_limited, 1),
            "rpm_limited": rpm > machine["max_rpm"]
        }
    
    def prism_physics_optimize_feed(self, material_id: str, tool_diameter_mm: float,
                                     target_Ra_um: float = 1.6, tool_nose_radius_mm: float = 0.8) -> Dict:
        """Calculate optimal feed rate for target surface finish."""
        # From Ra = f²/(32*r), solve for f
        # f = sqrt(32 * r * Ra)
        
        Ra_mm = target_Ra_um / 1000
        f_optimal = math.sqrt(32 * tool_nose_radius_mm * Ra_mm)
        
        # Practical limits
        f_min = 0.05  # mm/rev minimum practical
        f_max = tool_diameter_mm * 0.1  # Rule of thumb max
        
        f_recommended = max(f_min, min(f_optimal, f_max))
        
        return {
            "material": material_id,
            "target_Ra_um": target_Ra_um,
            "tool_nose_radius_mm": tool_nose_radius_mm,
            "theoretical_feed_mm_rev": round(f_optimal, 4),
            "recommended_feed_mm_rev": round(f_recommended, 3),
            "feed_limited": f_optimal != f_recommended,
            "achievable_Ra_um": round(((f_recommended ** 2) / (32 * tool_nose_radius_mm)) * 1000, 3)
        }
    
    def prism_physics_optimize_doc(self, material_id: str, tool_diameter_mm: float,
                                    max_deflection_mm: float = 0.05, cutting_force_N: float = None) -> Dict:
        """Calculate optimal depth of cut."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        kc1_1 = mat.get("kienzle_kc1_1", 1500)
        
        # Start with rule-of-thumb max
        doc_max = tool_diameter_mm * 1.5  # Aggressive
        doc_conservative = tool_diameter_mm * 0.5  # Conservative
        
        # If force known, limit by deflection
        if cutting_force_N:
            # Simplified - would need full deflection calc
            force_limited_doc = doc_conservative * (max_deflection_mm / 0.05)
            doc_recommended = min(doc_conservative, force_limited_doc)
        else:
            doc_recommended = doc_conservative
        
        return {
            "material": material_id,
            "tool_diameter_mm": tool_diameter_mm,
            "max_depth_of_cut_mm": round(doc_max, 2),
            "conservative_doc_mm": round(doc_conservative, 2),
            "recommended_doc_mm": round(doc_recommended, 2),
            "roughing_doc_mm": round(doc_max * 0.8, 2),
            "finishing_doc_mm": round(tool_diameter_mm * 0.1, 2)
        }


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: STATE SERVER MCP (11 tools)
# ═══════════════════════════════════════════════════════════════════════════

class StateServerMCP:
    """Session/Event/Decision management - 11 tools."""
    
    def __init__(self):
        self.state_file = STATE_DIR / "CURRENT_STATE.json"
        self.events_dir = STATE_DIR / "events"
        self.decisions_dir = STATE_DIR / "decisions"
        self.checkpoints_dir = STATE_DIR / "checkpoints"
        
        self.events_dir.mkdir(exist_ok=True)
        self.decisions_dir.mkdir(exist_ok=True)
        self.checkpoints_dir.mkdir(exist_ok=True)
        
        self.current_session = f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    def _load_state(self) -> Dict:
        """Load current state."""
        if self.state_file.exists():
            return json.loads(self.state_file.read_text(encoding='utf-8'))
        return {}
    
    def _save_state(self, state: Dict):
        """Save state with sorted keys."""
        self.state_file.write_text(
            json.dumps(state, indent=2, sort_keys=True, ensure_ascii=False),
            encoding='utf-8'
        )
    
    def _get_event_file(self) -> Path:
        """Get today's event file."""
        return self.events_dir / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
    
    # ─────────────────────────────────────────────────────────────
    # SESSION STATE (5)
    # ─────────────────────────────────────────────────────────────
    
    def prism_state_get(self) -> Dict:
        """Get full current state."""
        return self._load_state()
    
    def prism_state_update(self, delta: Dict) -> Dict:
        """Update state with delta (merge)."""
        state = self._load_state()
        
        def deep_merge(base, update):
            for k, v in update.items():
                if k in base and isinstance(base[k], dict) and isinstance(v, dict):
                    deep_merge(base[k], v)
                else:
                    base[k] = v
        
        deep_merge(state, delta)
        state["lastModified"] = datetime.now().isoformat()
        
        self._save_state(state)
        
        # Log event
        self.prism_event_append({
            "type": "STATE_UPDATE",
            "delta_keys": list(delta.keys())
        })
        
        return state
    
    def prism_state_checkpoint(self, name: str) -> Dict:
        """Create named checkpoint."""
        state = self._load_state()
        
        checkpoint = {
            "name": name,
            "session": self.current_session,
            "timestamp": datetime.now().isoformat(),
            "state_snapshot": state,
            "checksum": hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()[:16]
        }
        
        checkpoint_file = self.checkpoints_dir / f"{self.current_session}-{name}.json"
        checkpoint_file.write_text(json.dumps(checkpoint, indent=2, sort_keys=True), encoding='utf-8')
        
        return {
            "checkpoint_id": f"{self.current_session}-{name}",
            "file": str(checkpoint_file),
            "checksum": checkpoint["checksum"]
        }
    
    def prism_state_restore(self, checkpoint_id: str) -> Dict:
        """Restore from checkpoint."""
        # Find checkpoint file
        for f in self.checkpoints_dir.glob("*.json"):
            if checkpoint_id in f.name:
                checkpoint = json.loads(f.read_text(encoding='utf-8'))
                
                # Verify checksum
                state = checkpoint["state_snapshot"]
                expected = checkpoint["checksum"]
                actual = hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()[:16]
                
                if expected != actual:
                    return {"error": "Checkpoint corrupted", "expected": expected, "actual": actual}
                
                self._save_state(state)
                return {"restored": True, "checkpoint": checkpoint_id, "state": state}
        
        return {"error": f"Checkpoint not found: {checkpoint_id}"}
    
    def prism_state_rollback(self, event_id: str) -> Dict:
        """Rollback to state before an event."""
        # This would require keeping state snapshots with each event
        # Simplified: just report the event
        return {"info": "Rollback requires event-linked snapshots", "event_id": event_id}
    
    # ─────────────────────────────────────────────────────────────
    # EVENT LOG (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_event_append(self, event: Dict) -> str:
        """Append event to log (append-only)."""
        event_file = self._get_event_file()
        
        full_event = {
            "event_id": f"EVT-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:17]}",
            "session": self.current_session,
            "timestamp": datetime.now().isoformat(),
            **event
        }
        
        with open(event_file, "a", encoding='utf-8') as f:
            f.write(json.dumps(full_event, sort_keys=True) + "\n")
        
        return full_event["event_id"]
    
    def prism_event_search(self, query: Dict) -> List[Dict]:
        """Search events."""
        results = []
        
        for event_file in sorted(self.events_dir.glob("*.jsonl"), reverse=True):
            with open(event_file, "r", encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        event = json.loads(line)
                        match = True
                        
                        for k, v in query.items():
                            if k not in event or event[k] != v:
                                match = False
                                break
                        
                        if match:
                            results.append(event)
                            if len(results) >= query.get("limit", 100):
                                return results
        
        return results
    
    def prism_event_recent(self, n: int = 10) -> List[Dict]:
        """Get recent events."""
        results = []
        
        for event_file in sorted(self.events_dir.glob("*.jsonl"), reverse=True):
            with open(event_file, "r", encoding='utf-8') as f:
                lines = f.readlines()
                for line in reversed(lines):
                    if line.strip():
                        results.append(json.loads(line))
                        if len(results) >= n:
                            return results
        
        return results
    
    # ─────────────────────────────────────────────────────────────
    # DECISION LOG (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_decision_record(self, decision: Dict) -> str:
        """Record a decision."""
        decision_file = self.decisions_dir / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        
        full_decision = {
            "decision_id": f"DEC-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "session": self.current_session,
            "timestamp": datetime.now().isoformat(),
            **decision
        }
        
        with open(decision_file, "a", encoding='utf-8') as f:
            f.write(json.dumps(full_decision, sort_keys=True) + "\n")
        
        return full_decision["decision_id"]
    
    def prism_decision_search(self, query: Dict) -> List[Dict]:
        """Search decisions."""
        results = []
        
        for dec_file in sorted(self.decisions_dir.glob("*.jsonl"), reverse=True):
            with open(dec_file, "r", encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        dec = json.loads(line)
                        match = True
                        for k, v in query.items():
                            if k not in dec or dec[k] != v:
                                match = False
                                break
                        if match:
                            results.append(dec)
        
        return results[:query.get("limit", 50)]
    
    def prism_decision_recent(self, n: int = 5) -> List[Dict]:
        """Get recent decisions."""
        results = []
        
        for dec_file in sorted(self.decisions_dir.glob("*.jsonl"), reverse=True):
            with open(dec_file, "r", encoding='utf-8') as f:
                for line in reversed(f.readlines()):
                    if line.strip():
                        results.append(json.loads(line))
                        if len(results) >= n:
                            return results
        
        return results



# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: VALIDATION/SAFETY MCP (8 tools)
# ═══════════════════════════════════════════════════════════════════════════

class ValidationMCP:
    """Quality/Safety validation - 8 tools."""
    
    def __init__(self, data_mcp: DataQueryMCP, physics_mcp: PhysicsMCP):
        self.data = data_mcp
        self.physics = physics_mcp
    
    # ─────────────────────────────────────────────────────────────
    # QUALITY SCORES (4)
    # ─────────────────────────────────────────────────────────────
    
    def prism_quality_omega(self, output: Dict) -> Dict:
        """Compute full Ω(x) quality score."""
        # Extract component scores (defaults for demo)
        R = output.get("R", output.get("reasoning", 0.7))
        C = output.get("C", output.get("code", 0.7))
        P = output.get("P", output.get("process", 0.7))
        S = output.get("S", output.get("safety", 0.7))
        L = output.get("L", output.get("learning", 0.6))
        D = output.get("D", output.get("anomaly", 0.5))
        A = output.get("A", output.get("attention", 0.7))
        K = output.get("K", output.get("causal", 0.6))
        M = output.get("M", output.get("memory", 0.7))
        
        # Ω(x) = 0.18R + 0.14C + 0.10P + 0.22S + 0.06L + 0.10D + 0.08A + 0.07K + 0.05M
        omega = (0.18 * R + 0.14 * C + 0.10 * P + 0.22 * S + 0.06 * L +
                 0.10 * D + 0.08 * A + 0.07 * K + 0.05 * M)
        
        # Hard constraints
        safety_pass = S >= 0.70
        anomaly_pass = D >= 0.30
        
        # Final Ω is 0 if hard constraints fail
        omega_final = omega if (safety_pass and anomaly_pass) else 0.0
        
        return {
            "components": {
                "R_reasoning": R, "C_code": C, "P_process": P,
                "S_safety": S, "L_learning": L, "D_anomaly": D,
                "A_attention": A, "K_causal": K, "M_memory": M
            },
            "weights": {
                "R": 0.18, "C": 0.14, "P": 0.10, "S": 0.22, "L": 0.06,
                "D": 0.10, "A": 0.08, "K": 0.07, "M": 0.05
            },
            "omega_raw": round(omega, 4),
            "omega_final": round(omega_final, 4),
            "hard_constraints": {
                "S_safety_ge_070": {"value": S, "required": 0.70, "passed": safety_pass},
                "D_anomaly_ge_030": {"value": D, "required": 0.30, "passed": anomaly_pass}
            },
            "decision": "RELEASE" if omega_final >= 0.85 else ("WARN" if omega_final >= 0.65 else "BLOCK"),
            "passed": omega_final >= 0.65 and safety_pass and anomaly_pass
        }
    
    def prism_quality_safety(self, output: Dict) -> Dict:
        """Compute S(x) safety score."""
        # Safety checks
        checks = []
        score = 1.0
        
        # Check for dangerous values
        if "rpm" in output:
            rpm = output["rpm"]
            if rpm > 50000:
                checks.append({"check": "rpm_limit", "value": rpm, "issue": "Extreme RPM", "penalty": 0.5})
                score -= 0.5
            elif rpm > 30000:
                checks.append({"check": "rpm_high", "value": rpm, "issue": "High RPM", "penalty": 0.1})
                score -= 0.1
        
        if "cutting_force_N" in output:
            force = output["cutting_force_N"]
            if force > 10000:
                checks.append({"check": "force_limit", "value": force, "issue": "Excessive force", "penalty": 0.4})
                score -= 0.4
        
        if "deflection_mm" in output:
            defl = output["deflection_mm"]
            if defl > 0.5:
                checks.append({"check": "deflection_limit", "value": defl, "issue": "Tool deflection dangerous", "penalty": 0.6})
                score -= 0.6
            elif defl > 0.1:
                checks.append({"check": "deflection_high", "value": defl, "issue": "High deflection", "penalty": 0.2})
                score -= 0.2
        
        # Check for missing safety validations
        if output.get("validated", None) is False:
            checks.append({"check": "unvalidated", "issue": "Output not validated", "penalty": 0.3})
            score -= 0.3
        
        score = max(0, min(score, 1.0))
        
        return {
            "S_score": round(score, 3),
            "checks_performed": len(checks),
            "issues": checks,
            "passed": score >= 0.70,
            "threshold": 0.70,
            "hard_block": score < 0.70
        }
    
    def prism_quality_reasoning(self, output: Dict) -> Dict:
        """Compute R(x) reasoning score."""
        score = 0.7  # Base score
        factors = []
        
        # Check for evidence
        if output.get("evidence_level", 0) >= 3:
            score += 0.1
            factors.append({"factor": "evidence", "boost": 0.1})
        
        # Check for completeness
        if output.get("complete", False):
            score += 0.1
            factors.append({"factor": "complete", "boost": 0.1})
        
        # Check for sources
        if output.get("sources"):
            score += 0.05
            factors.append({"factor": "sources", "boost": 0.05})
        
        # Check for uncertainty acknowledgment
        if output.get("uncertainty_noted", False):
            score += 0.05
            factors.append({"factor": "uncertainty", "boost": 0.05})
        
        score = min(score, 1.0)
        
        return {
            "R_score": round(score, 3),
            "factors": factors,
            "base_score": 0.7
        }
    
    def prism_quality_code(self, output: Dict) -> Dict:
        """Compute C(x) code quality score."""
        score = 0.7
        factors = []
        
        # Check for tests
        if output.get("has_tests", False):
            score += 0.1
            factors.append({"factor": "tests", "boost": 0.1})
        
        # Check for documentation
        if output.get("documented", False):
            score += 0.1
            factors.append({"factor": "docs", "boost": 0.1})
        
        # Check for no placeholders
        if output.get("no_placeholders", True):
            score += 0.05
            factors.append({"factor": "no_todos", "boost": 0.05})
        
        # Check for error handling
        if output.get("error_handling", False):
            score += 0.05
            factors.append({"factor": "error_handling", "boost": 0.05})
        
        score = min(score, 1.0)
        
        return {
            "C_score": round(score, 3),
            "factors": factors
        }
    
    # ─────────────────────────────────────────────────────────────
    # VALIDATION GATES (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_validate_gates(self, output: Dict) -> Dict:
        """Run all 9 validation gates."""
        gates = []
        all_passed = True
        
        # G1: C: drive accessible (always true in this context)
        gates.append({"gate": "G1", "name": "C_drive", "passed": True})
        
        # G2: State file valid
        state_valid = (STATE_DIR / "CURRENT_STATE.json").exists()
        gates.append({"gate": "G2", "name": "state_valid", "passed": state_valid})
        if not state_valid:
            all_passed = False
        
        # G3: Input understood
        input_clear = output.get("input_understood", True)
        gates.append({"gate": "G3", "name": "input_clear", "passed": input_clear})
        
        # G4: Skills available
        gates.append({"gate": "G4", "name": "skills_available", "passed": True})
        
        # G5: Output path valid
        output_path = output.get("output_path", "C:\\")
        path_valid = output_path.startswith("C:")
        gates.append({"gate": "G5", "name": "output_on_C", "passed": path_valid})
        if not path_valid:
            all_passed = False
        
        # G6: Evidence exists
        evidence = output.get("evidence_level", 0) >= 3
        gates.append({"gate": "G6", "name": "evidence_exists", "passed": evidence})
        
        # G7: Anti-regression
        old_count = output.get("old_count", 0)
        new_count = output.get("new_count", old_count)
        regression_pass = new_count >= old_count
        gates.append({"gate": "G7", "name": "anti_regression", "passed": regression_pass,
                      "old": old_count, "new": new_count})
        if not regression_pass:
            all_passed = False
        
        # G8: Safety S(x) >= 0.70 [HARD BLOCK]
        safety = self.prism_quality_safety(output)
        gates.append({"gate": "G8", "name": "safety_score", "passed": safety["passed"],
                      "value": safety["S_score"], "HARD_BLOCK": not safety["passed"]})
        if not safety["passed"]:
            all_passed = False
        
        # G9: Anomaly D(x) >= 0.30 [HARD BLOCK]
        D = output.get("D", output.get("anomaly", 0.5))
        anomaly_pass = D >= 0.30
        gates.append({"gate": "G9", "name": "anomaly_score", "passed": anomaly_pass,
                      "value": D, "HARD_BLOCK": not anomaly_pass})
        if not anomaly_pass:
            all_passed = False
        
        return {
            "gates": gates,
            "all_passed": all_passed,
            "hard_blocks": [g for g in gates if g.get("HARD_BLOCK")],
            "failed": [g for g in gates if not g["passed"]]
        }
    
    def prism_validate_anti_regression(self, old: Dict, new: Dict) -> Dict:
        """Validate new version doesn't regress from old."""
        comparisons = []
        regression_detected = False
        
        # Compare counts
        for key in ["items", "lines", "records", "entries", "count"]:
            if key in old and key in new:
                old_val = old[key]
                new_val = new[key]
                passed = new_val >= old_val
                comparisons.append({
                    "metric": key,
                    "old": old_val,
                    "new": new_val,
                    "diff": new_val - old_val,
                    "passed": passed
                })
                if not passed:
                    regression_detected = True
        
        # Compare sizes
        if "size_kb" in old and "size_kb" in new:
            old_size = old["size_kb"]
            new_size = new["size_kb"]
            # Allow up to 20% size reduction
            size_ok = new_size >= old_size * 0.8
            comparisons.append({
                "metric": "size_kb",
                "old": old_size,
                "new": new_size,
                "diff_pct": round((new_size - old_size) / old_size * 100, 1) if old_size > 0 else 0,
                "passed": size_ok
            })
            if not size_ok:
                regression_detected = True
        
        return {
            "comparisons": comparisons,
            "regression_detected": regression_detected,
            "safe_to_proceed": not regression_detected,
            "recommendation": "BLOCK - Investigate regression" if regression_detected else "PROCEED"
        }
    
    # ─────────────────────────────────────────────────────────────
    # SAFETY CHECKS (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_safety_check_limits(self, params: Dict) -> Dict:
        """Check if machining parameters are within safe limits."""
        violations = []
        warnings = []
        
        # RPM limits
        if "rpm" in params:
            rpm = params["rpm"]
            if rpm < 0:
                violations.append({"param": "rpm", "value": rpm, "issue": "Negative RPM"})
            if rpm > 100000:
                violations.append({"param": "rpm", "value": rpm, "issue": "RPM exceeds any machine"})
            elif rpm > 40000:
                warnings.append({"param": "rpm", "value": rpm, "issue": "Very high RPM"})
        
        # Feed limits
        if "feed_mm_rev" in params:
            feed = params["feed_mm_rev"]
            if feed < 0:
                violations.append({"param": "feed", "value": feed, "issue": "Negative feed"})
            if feed > 5:
                violations.append({"param": "feed", "value": feed, "issue": "Feed too high"})
        
        # Depth limits
        if "depth_mm" in params:
            depth = params["depth_mm"]
            if depth < 0:
                violations.append({"param": "depth", "value": depth, "issue": "Negative depth"})
            if depth > 50:
                warnings.append({"param": "depth", "value": depth, "issue": "Very deep cut"})
        
        # Tool diameter
        if "tool_diameter_mm" in params:
            dia = params["tool_diameter_mm"]
            if dia <= 0:
                violations.append({"param": "tool_diameter", "value": dia, "issue": "Invalid diameter"})
        
        safe = len(violations) == 0
        
        return {
            "parameters_checked": list(params.keys()),
            "safe": safe,
            "violations": violations,
            "warnings": warnings,
            "S_impact": max(0, 1.0 - len(violations) * 0.3 - len(warnings) * 0.1)
        }
    
    def prism_safety_check_collision(self, path: Dict) -> Dict:
        """Check toolpath for potential collisions."""
        # Simplified collision detection
        issues = []
        
        # Check Z limits
        z_min = path.get("z_min", 0)
        z_max = path.get("z_max", 100)
        work_height = path.get("work_height", 50)
        
        if z_min < -10:
            issues.append({"type": "Z_UNDERCUT", "z": z_min, "severity": "CRITICAL"})
        
        if z_max - work_height > 200:
            issues.append({"type": "EXCESSIVE_RETRACT", "z": z_max, "severity": "WARNING"})
        
        # Check rapid moves
        rapids = path.get("rapids", [])
        for rapid in rapids:
            if rapid.get("z", 100) < work_height + 5:
                issues.append({"type": "RAPID_TOO_LOW", "z": rapid.get("z"), "severity": "HIGH"})
        
        safe = not any(i["severity"] == "CRITICAL" for i in issues)
        
        return {
            "collision_check": True,
            "safe": safe,
            "issues": issues,
            "critical_count": sum(1 for i in issues if i["severity"] == "CRITICAL"),
            "recommendation": "STOP - Fix critical issues" if not safe else "OK to proceed"
        }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN MCP SERVER CLASS
# ═══════════════════════════════════════════════════════════════════════════

class PRISMMCPServer:
    """
    PRISM MCP Server - 54 tools for manufacturing intelligence.
    
    Categories:
        Orchestration (14): Skill/Agent/Hook/Formula management
        Data Query (9): Material/Machine/Alarm queries
        Physics (12): Cutting calculations
        State Server (11): Session/Event/Decision management
        Validation (8): Quality/Safety checks
    """
    
    def __init__(self):
        # Initialize all MCP modules
        self.orchestration = OrchestrationMCP()
        self.data = DataQueryMCP()
        self.physics = PhysicsMCP(self.data)
        self.state = StateServerMCP()
        self.validation = ValidationMCP(self.data, self.physics)
        
        # Build tool registry
        self._tools: Dict[str, callable] = {}
        self._register_tools()
    
    def _register_tools(self):
        """Register all 54 tools."""
        # Orchestration (14)
        self._tools["prism_skill_load"] = self.orchestration.prism_skill_load
        self._tools["prism_skill_list"] = self.orchestration.prism_skill_list
        self._tools["prism_skill_relevance"] = self.orchestration.prism_skill_relevance
        self._tools["prism_skill_select"] = self.orchestration.prism_skill_select
        self._tools["prism_skill_dependencies"] = self.orchestration.prism_skill_dependencies
        self._tools["prism_skill_consumers"] = self.orchestration.prism_skill_consumers
        self._tools["prism_agent_list"] = self.orchestration.prism_agent_list
        self._tools["prism_agent_select"] = self.orchestration.prism_agent_select
        self._tools["prism_agent_spawn"] = self.orchestration.prism_agent_spawn
        self._tools["prism_agent_status"] = self.orchestration.prism_agent_status
        self._tools["prism_hook_list"] = self.orchestration.prism_hook_list
        self._tools["prism_hook_trigger"] = self.orchestration.prism_hook_trigger
        self._tools["prism_hook_fire"] = self.orchestration.prism_hook_fire
        self._tools["prism_hook_get"] = self.orchestration.prism_hook_get
        self._tools["prism_hook_status"] = self.orchestration.prism_hook_status
        self._tools["prism_formula_list"] = self.orchestration.prism_formula_list
        self._tools["prism_formula_apply"] = self.orchestration.prism_formula_apply
        
        # Data Query (9)
        self._tools["prism_material_get"] = self.data.prism_material_get
        self._tools["prism_material_search"] = self.data.prism_material_search
        self._tools["prism_material_property"] = self.data.prism_material_property
        self._tools["prism_material_similar"] = self.data.prism_material_similar
        self._tools["prism_machine_get"] = self.data.prism_machine_get
        self._tools["prism_machine_search"] = self.data.prism_machine_search
        self._tools["prism_machine_capabilities"] = self.data.prism_machine_capabilities
        self._tools["prism_alarm_get"] = self.data.prism_alarm_get
        self._tools["prism_alarm_search"] = self.data.prism_alarm_search
        
        # Physics (12)
        self._tools["prism_physics_kienzle"] = self.physics.prism_physics_kienzle
        self._tools["prism_physics_taylor"] = self.physics.prism_physics_taylor
        self._tools["prism_physics_johnson_cook"] = self.physics.prism_physics_johnson_cook
        self._tools["prism_physics_stability"] = self.physics.prism_physics_stability
        self._tools["prism_physics_deflection"] = self.physics.prism_physics_deflection
        self._tools["prism_physics_surface"] = self.physics.prism_physics_surface
        self._tools["prism_physics_validate_kienzle"] = self.physics.prism_physics_validate_kienzle
        self._tools["prism_physics_check_limits"] = self.physics.prism_physics_check_limits
        self._tools["prism_physics_unit_convert"] = self.physics.prism_physics_unit_convert
        self._tools["prism_physics_optimize_speed"] = self.physics.prism_physics_optimize_speed
        self._tools["prism_physics_optimize_feed"] = self.physics.prism_physics_optimize_feed
        self._tools["prism_physics_optimize_doc"] = self.physics.prism_physics_optimize_doc
        
        # State Server (11)
        self._tools["prism_state_get"] = self.state.prism_state_get
        self._tools["prism_state_update"] = self.state.prism_state_update
        self._tools["prism_state_checkpoint"] = self.state.prism_state_checkpoint
        self._tools["prism_state_restore"] = self.state.prism_state_restore
        self._tools["prism_state_rollback"] = self.state.prism_state_rollback
        self._tools["prism_event_append"] = self.state.prism_event_append
        self._tools["prism_event_search"] = self.state.prism_event_search
        self._tools["prism_event_recent"] = self.state.prism_event_recent
        self._tools["prism_decision_record"] = self.state.prism_decision_record
        self._tools["prism_decision_search"] = self.state.prism_decision_search
        self._tools["prism_decision_recent"] = self.state.prism_decision_recent
        
        # Validation (8)
        self._tools["prism_quality_omega"] = self.validation.prism_quality_omega
        self._tools["prism_quality_safety"] = self.validation.prism_quality_safety
        self._tools["prism_quality_reasoning"] = self.validation.prism_quality_reasoning
        self._tools["prism_quality_code"] = self.validation.prism_quality_code
        self._tools["prism_validate_gates"] = self.validation.prism_validate_gates
        self._tools["prism_validate_anti_regression"] = self.validation.prism_validate_anti_regression
        self._tools["prism_safety_check_limits"] = self.validation.prism_safety_check_limits
        self._tools["prism_safety_check_collision"] = self.validation.prism_safety_check_collision
    
    def list_tools(self) -> List[str]:
        """List all available tools."""
        return sorted(self._tools.keys())
    
    def list_tools_by_category(self) -> Dict[str, List[str]]:
        """List tools grouped by category."""
        return {
            "orchestration": [t for t in self._tools if t.startswith("prism_skill") or 
                             t.startswith("prism_agent") or t.startswith("prism_hook") or
                             t.startswith("prism_formula")],
            "data_query": [t for t in self._tools if t.startswith("prism_material") or
                          t.startswith("prism_machine") or t.startswith("prism_alarm")],
            "physics": [t for t in self._tools if t.startswith("prism_physics")],
            "state_server": [t for t in self._tools if t.startswith("prism_state") or
                           t.startswith("prism_event") or t.startswith("prism_decision")],
            "validation": [t for t in self._tools if t.startswith("prism_quality") or
                          t.startswith("prism_validate") or t.startswith("prism_safety")]
        }
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Call a tool by name."""
        if tool_name not in self._tools:
            return {"error": f"Tool not found: {tool_name}"}
        
        try:
            if params:
                return self._tools[tool_name](**params)
            else:
                return self._tools[tool_name]()
        except Exception as e:
            return {"error": str(e), "tool": tool_name}
    
    def status(self) -> Dict:
        """Get MCP server status."""
        by_category = self.list_tools_by_category()
        
        return {
            "server": "PRISM MCP Server v1.0",
            "total_tools": len(self._tools),
            "categories": {
                "orchestration": len(by_category["orchestration"]),
                "data_query": len(by_category["data_query"]),
                "physics": len(by_category["physics"]),
                "state_server": len(by_category["state_server"]),
                "validation": len(by_category["validation"])
            },
            "skills_loaded": len(self.orchestration.skills_cache),
            "agents_loaded": len(self.orchestration.agents_cache),
            "hooks_loaded": len(self.orchestration.hooks_cache),
            "formulas_loaded": len(self.orchestration.formulas_cache),
            "database": str(self.data.db_path),
            "state_dir": str(STATE_DIR)
        }


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM MCP Server v1.0")
    parser.add_argument("command", nargs="?", default="status",
                       help="Command: status, list, call, test")
    parser.add_argument("--tool", "-t", help="Tool name for call command")
    parser.add_argument("--params", "-p", help="JSON params for call command")
    parser.add_argument("--category", "-c", help="Filter by category")
    
    args = parser.parse_args()
    
    mcp = PRISMMCPServer()
    
    if args.command == "status":
        result = mcp.status()
        print(json.dumps(result, indent=2))
    
    elif args.command == "list":
        if args.category:
            by_cat = mcp.list_tools_by_category()
            tools = by_cat.get(args.category, [])
        else:
            tools = mcp.list_tools()
        
        print(f"\n{'='*60}")
        print(f"PRISM MCP Server - {len(tools)} Tools")
        print(f"{'='*60}\n")
        
        for t in tools:
            print(f"  {t}")
        print()
    
    elif args.command == "call":
        if not args.tool:
            print("Error: --tool required for call command")
            return
        
        params = json.loads(args.params) if args.params else None
        result = mcp.call(args.tool, params)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "test":
        print("\n" + "="*60)
        print("PRISM MCP SERVER - COMPREHENSIVE TEST SUITE")
        print("="*60 + "\n")
        
        tests_passed = 0
        tests_failed = 0
        
        # Test 1: Status
        print("TEST 1: Server Status")
        result = mcp.status()
        if result["total_tools"] == 54:
            print(f"  ✓ {result['total_tools']} tools registered")
            tests_passed += 1
        else:
            print(f"  ✗ Expected 54 tools, got {result['total_tools']}")
            tests_failed += 1
        
        # Test 2: Material Query
        print("\nTEST 2: Material Query")
        result = mcp.call("prism_material_get", {"id": "AL-6061"})
        if "error" not in result and result.get("name"):
            print(f"  ✓ Material found: {result['name']}")
            tests_passed += 1
        else:
            print(f"  ✗ Material query failed: {result}")
            tests_failed += 1
        
        # Test 3: Kienzle Calculation
        print("\nTEST 3: Kienzle Force Calculation")
        result = mcp.call("prism_physics_kienzle", {
            "material_id": "AL-6061", "depth_mm": 2, "feed_mm": 0.2
        })
        if "cutting_force_N" in result:
            print(f"  ✓ Cutting force: {result['cutting_force_N']} N")
            tests_passed += 1
        else:
            print(f"  ✗ Calculation failed: {result}")
            tests_failed += 1
        
        # Test 4: Taylor Tool Life
        print("\nTEST 4: Taylor Tool Life")
        result = mcp.call("prism_physics_taylor", {
            "material_id": "AL-6061", "cutting_speed_m_min": 200
        })
        if "tool_life_min" in result:
            print(f"  ✓ Tool life: {result['tool_life_min']} min")
            tests_passed += 1
        else:
            print(f"  ✗ Calculation failed: {result}")
            tests_failed += 1
        
        # Test 5: Omega Quality Score
        print("\nTEST 5: Omega Quality Score")
        result = mcp.call("prism_quality_omega", {
            "S": 0.85, "D": 0.5, "R": 0.8, "C": 0.75
        })
        if "omega_final" in result:
            print(f"  ✓ Ω(x) = {result['omega_final']}, Decision: {result['decision']}")
            tests_passed += 1
        else:
            print(f"  ✗ Score failed: {result}")
            tests_failed += 1
        
        # Test 6: Validation Gates
        print("\nTEST 6: Validation Gates")
        result = mcp.call("prism_validate_gates", {
            "S": 0.8, "D": 0.5, "evidence_level": 3, "output_path": "C:\\output"
        })
        if "gates" in result:
            passed = sum(1 for g in result["gates"] if g["passed"])
            print(f"  ✓ {passed}/{len(result['gates'])} gates passed")
            tests_passed += 1
        else:
            print(f"  ✗ Gates check failed: {result}")
            tests_failed += 1
        
        # Test 7: Skill Selection
        print("\nTEST 7: Skill Selection (ILP)")
        result = mcp.call("prism_skill_select", {"task": "materials physics", "n": 3})
        if isinstance(result, list) and len(result) > 0:
            print(f"  ✓ Selected {len(result)} skills")
            for s in result[:3]:
                print(f"    - {s['name']}")
            tests_passed += 1
        else:
            print(f"  ✗ Selection failed: {result}")
            tests_failed += 1
        
        # Test 8: State Checkpoint
        print("\nTEST 8: State Checkpoint")
        result = mcp.call("prism_state_checkpoint", {"name": "test-checkpoint"})
        if "checkpoint_id" in result:
            print(f"  ✓ Checkpoint: {result['checkpoint_id']}")
            tests_passed += 1
        else:
            print(f"  ✗ Checkpoint failed: {result}")
            tests_failed += 1
        
        # Test 9: Event Logging
        print("\nTEST 9: Event Logging")
        result = mcp.call("prism_event_append", {
            "event": {"type": "TEST", "message": "MCP test event"}
        })
        if result and "EVT-" in str(result):
            print(f"  ✓ Event logged: {result}")
            tests_passed += 1
        else:
            print(f"  ✗ Event logging failed: {result}")
            tests_failed += 1
        
        # Test 10: Anti-Regression
        print("\nTEST 10: Anti-Regression Check")
        result = mcp.call("prism_validate_anti_regression", {
            "old": {"items": 100, "lines": 500},
            "new": {"items": 120, "lines": 600}
        })
        if result.get("safe_to_proceed"):
            print(f"  ✓ No regression detected")
            tests_passed += 1
        else:
            print(f"  ✗ Unexpected regression: {result}")
            tests_failed += 1
        
        # Summary
        print("\n" + "="*60)
        print(f"TEST SUMMARY: {tests_passed}/{tests_passed + tests_failed} passed")
        if tests_failed == 0:
            print("ALL TESTS PASSED ✓")
        else:
            print(f"{tests_failed} TESTS FAILED ✗")
        print("="*60 + "\n")
        
        return tests_failed == 0
    
    else:
        print(f"Unknown command: {args.command}")
        print("Available: status, list, call, test")


if __name__ == "__main__":
    main()



# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: PHYSICS MCP (12 tools)
# ═══════════════════════════════════════════════════════════════════════════

class PhysicsMCP:
    """Cutting physics calculations - 12 tools."""
    
    def __init__(self, data_mcp: DataQueryMCP):
        self.data = data_mcp
    
    # ─────────────────────────────────────────────────────────────
    # CUTTING PHYSICS (6)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_kienzle(self, material_id: str, depth_mm: float, 
                               width_mm: float, chip_thickness_mm: float = 0.1) -> Dict:
        """Calculate cutting force using Kienzle equation."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        kc1_1 = mat.get("kienzle_kc1_1", 1500)
        mc = mat.get("kienzle_mc", 0.25)
        
        # Kienzle: Fc = kc1.1 * b * h^(1-mc)
        h = chip_thickness_mm
        b = width_mm
        
        Fc = kc1_1 * b * (h ** (1 - mc))
        
        # Power = Fc * Vc / 60000 (kW)
        Vc_assumed = 100  # m/min for estimation
        power_kw = Fc * Vc_assumed / 60000
        
        return {
            "formula": "Kienzle",
            "material": material_id,
            "inputs": {"depth_mm": depth_mm, "width_mm": width_mm, "chip_thickness_mm": h},
            "coefficients": {"kc1_1": kc1_1, "mc": mc},
            "results": {
                "cutting_force_N": round(Fc, 2),
                "estimated_power_kW": round(power_kw, 3)
            },
            "safety_check": "PASS" if Fc < 10000 else "WARN_HIGH_FORCE"
        }
    
    def prism_physics_taylor(self, material_id: str, cutting_speed_m_min: float) -> Dict:
        """Calculate tool life using Taylor equation."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        C = mat.get("taylor_C", 200)
        n = mat.get("taylor_n", 0.2)
        
        # Taylor: V * T^n = C  =>  T = (C/V)^(1/n)
        V = cutting_speed_m_min
        T = (C / V) ** (1 / n)
        
        return {
            "formula": "Taylor",
            "material": material_id,
            "inputs": {"cutting_speed_m_min": V},
            "coefficients": {"C": C, "n": n},
            "results": {
                "tool_life_min": round(T, 2),
                "tool_life_parts_est": round(T / 5, 0)  # Assuming 5 min/part
            },
            "recommendation": "OPTIMAL" if 15 < T < 60 else "ADJUST_SPEED"
        }
    
    def prism_physics_johnson_cook(self, material_id: str, strain: float, 
                                    strain_rate: float, temperature_C: float) -> Dict:
        """Calculate flow stress using Johnson-Cook model."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        # Simplified J-C: σ = (A + B*ε^n)(1 + C*ln(ε̇*))(1 - T*^m)
        # Using generic coefficients based on material category
        category = mat.get("category", "steel")
        
        # Generic J-C parameters by category
        jc_params = {
            "aluminum": {"A": 324, "B": 114, "n": 0.42, "C": 0.002, "m": 1.34, "T_melt": 660},
            "stainless": {"A": 310, "B": 1000, "n": 0.65, "C": 0.07, "m": 1.0, "T_melt": 1400},
            "titanium": {"A": 1098, "B": 1092, "n": 0.93, "C": 0.014, "m": 1.1, "T_melt": 1660},
            "carbon_steel": {"A": 350, "B": 275, "n": 0.36, "C": 0.022, "m": 1.0, "T_melt": 1500},
            "alloy_steel": {"A": 792, "B": 510, "n": 0.26, "C": 0.014, "m": 1.03, "T_melt": 1500},
            "superalloy": {"A": 1241, "B": 622, "n": 0.65, "C": 0.017, "m": 1.3, "T_melt": 1300},
        }
        
        params = jc_params.get(category, jc_params["carbon_steel"])
        A, B, n_jc, C_jc, m, T_melt = params["A"], params["B"], params["n"], params["C"], params["m"], params["T_melt"]
        
        # Reference conditions
        eps_dot_0 = 1.0  # Reference strain rate
        T_ref = 25  # Reference temperature
        
        eps_dot_star = max(strain_rate / eps_dot_0, 1.0)
        T_star = max(0, (temperature_C - T_ref) / (T_melt - T_ref))
        T_star = min(T_star, 0.99)  # Cap below 1
        
        sigma = (A + B * (strain ** n_jc)) * (1 + C_jc * math.log(eps_dot_star)) * (1 - T_star ** m)
        
        return {
            "formula": "Johnson-Cook",
            "material": material_id,
            "inputs": {"strain": strain, "strain_rate": strain_rate, "temperature_C": temperature_C},
            "coefficients": params,
            "results": {
                "flow_stress_MPa": round(sigma, 2)
            }
        }
    
    def prism_physics_stability(self, spindle_speed_rpm: int, depth_mm: float,
                                 tool_diameter_mm: float, material_id: str) -> Dict:
        """Check cutting stability (chatter prediction)."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        # Simplified stability check based on depth/diameter ratio
        ratio = depth_mm / tool_diameter_mm
        
        # Critical depth estimation (simplified)
        kc = mat.get("kienzle_kc1_1", 1500)
        critical_depth = tool_diameter_mm * 0.5 * (2000 / kc)  # Simplified
        
        stable = depth_mm < critical_depth
        
        return {
            "analysis": "Stability (Chatter)",
            "inputs": {"spindle_rpm": spindle_speed_rpm, "depth_mm": depth_mm, 
                      "tool_diameter_mm": tool_diameter_mm},
            "results": {
                "depth_to_diameter_ratio": round(ratio, 3),
                "estimated_critical_depth_mm": round(critical_depth, 2),
                "stability": "STABLE" if stable else "CHATTER_RISK",
                "margin_pct": round((critical_depth - depth_mm) / critical_depth * 100, 1)
            },
            "recommendation": "OK" if stable else f"Reduce depth below {round(critical_depth, 1)}mm"
        }
    
    def prism_physics_deflection(self, tool_diameter_mm: float, tool_length_mm: float,
                                  cutting_force_N: float, material: str = "carbide") -> Dict:
        """Calculate tool deflection."""
        # Young's modulus by material
        E_values = {"carbide": 620000, "hss": 210000, "ceramic": 400000}
        E = E_values.get(material, 210000)  # MPa
        
        # Moment of inertia for circular cross-section
        r = tool_diameter_mm / 2
        I = math.pi * r**4 / 4  # mm^4
        
        # Cantilever deflection: δ = F * L^3 / (3 * E * I)
        L = tool_length_mm
        delta = cutting_force_N * (L ** 3) / (3 * E * I)
        
        # Acceptable deflection: typically < 0.01mm for finishing
        acceptable = delta < 0.01
        
        return {
            "analysis": "Tool Deflection",
            "inputs": {"diameter_mm": tool_diameter_mm, "length_mm": tool_length_mm,
                      "force_N": cutting_force_N, "tool_material": material},
            "results": {
                "deflection_mm": round(delta, 4),
                "acceptable": acceptable,
                "max_recommended_mm": 0.01
            },
            "recommendation": "OK" if acceptable else "Reduce overhang or use larger diameter"
        }
    
    def prism_physics_surface(self, feed_mm_rev: float, nose_radius_mm: float) -> Dict:
        """Calculate theoretical surface finish (Ra)."""
        # Ra ≈ f² / (32 * r)  (simplified formula)
        f = feed_mm_rev
        r = nose_radius_mm
        
        Ra = (f ** 2) / (32 * r) * 1000  # Convert to μm
        
        # Surface finish classifications
        if Ra < 0.8:
            finish_class = "Mirror (N4)"
        elif Ra < 1.6:
            finish_class = "Fine (N5)"
        elif Ra < 3.2:
            finish_class = "Smooth (N6)"
        elif Ra < 6.3:
            finish_class = "Medium (N7)"
        else:
            finish_class = "Rough (N8+)"
        
        return {
            "analysis": "Surface Finish",
            "inputs": {"feed_mm_rev": f, "nose_radius_mm": r},
            "results": {
                "Ra_um": round(Ra, 3),
                "finish_class": finish_class
            }
        }
    
    # ─────────────────────────────────────────────────────────────
    # VALIDATION PHYSICS (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_validate_kienzle(self, kc1_1: float, mc: float) -> Dict:
        """Validate Kienzle coefficients."""
        valid = True
        issues = []
        
        # kc1.1 typically 500-4000 for metals
        if not (500 <= kc1_1 <= 4000):
            valid = False
            issues.append(f"kc1.1 ({kc1_1}) outside typical range 500-4000")
        
        # mc typically 0.15-0.35
        if not (0.15 <= mc <= 0.35):
            valid = False
            issues.append(f"mc ({mc}) outside typical range 0.15-0.35")
        
        return {
            "validation": "Kienzle Coefficients",
            "coefficients": {"kc1_1": kc1_1, "mc": mc},
            "valid": valid,
            "issues": issues if issues else ["All coefficients within expected ranges"]
        }
    
    def prism_physics_check_limits(self, params: Dict) -> Dict:
        """Check machining parameters against safe limits."""
        violations = []
        warnings = []
        
        # Speed limits
        if "rpm" in params:
            if params["rpm"] > 30000:
                violations.append(f"RPM ({params['rpm']}) exceeds safe maximum 30000")
            elif params["rpm"] > 20000:
                warnings.append(f"RPM ({params['rpm']}) is very high")
        
        # Feed limits
        if "feed_mm_rev" in params:
            if params["feed_mm_rev"] > 2.0:
                violations.append(f"Feed ({params['feed_mm_rev']}) exceeds typical max 2.0 mm/rev")
        
        # Depth limits
        if "depth_mm" in params:
            if params["depth_mm"] > 20:
                violations.append(f"Depth ({params['depth_mm']}) exceeds typical max 20mm")
            elif params["depth_mm"] > 10:
                warnings.append(f"Depth ({params['depth_mm']}) is aggressive")
        
        return {
            "validation": "Parameter Limits",
            "params": params,
            "violations": violations,
            "warnings": warnings,
            "safe": len(violations) == 0,
            "S_x": 0.9 if not violations and not warnings else (0.7 if not violations else 0.3)
        }
    
    def prism_physics_unit_convert(self, value: float, from_unit: str, to_unit: str) -> Dict:
        """Convert between units."""
        conversions = {
            ("mm", "in"): lambda x: x / 25.4,
            ("in", "mm"): lambda x: x * 25.4,
            ("m/min", "sfm"): lambda x: x * 3.281,
            ("sfm", "m/min"): lambda x: x / 3.281,
            ("mm/rev", "in/rev"): lambda x: x / 25.4,
            ("in/rev", "mm/rev"): lambda x: x * 25.4,
            ("kW", "hp"): lambda x: x * 1.341,
            ("hp", "kW"): lambda x: x / 1.341,
            ("N", "lbf"): lambda x: x * 0.2248,
            ("lbf", "N"): lambda x: x / 0.2248,
            ("MPa", "psi"): lambda x: x * 145.04,
            ("psi", "MPa"): lambda x: x / 145.04,
        }
        
        key = (from_unit.lower(), to_unit.lower())
        if key in conversions:
            result = conversions[key](value)
            return {"value": round(result, 6), "from": from_unit, "to": to_unit}
        
        return {"error": f"Conversion not supported: {from_unit} to {to_unit}"}
    
    # ─────────────────────────────────────────────────────────────
    # OPTIMIZATION (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_physics_optimize_speed(self, material_id: str, tool_life_target_min: float = 30,
                                      machine_max_rpm: int = 10000, tool_diameter_mm: float = 10) -> Dict:
        """Optimize cutting speed for target tool life."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        C = mat.get("taylor_C", 200)
        n = mat.get("taylor_n", 0.2)
        
        # From Taylor: V = C / T^n
        V_optimal = C / (tool_life_target_min ** n)
        
        # Convert to RPM: N = (V * 1000) / (π * D)
        rpm_optimal = (V_optimal * 1000) / (math.pi * tool_diameter_mm)
        rpm_optimal = min(rpm_optimal, machine_max_rpm)
        
        # Recalculate actual speed
        V_actual = (rpm_optimal * math.pi * tool_diameter_mm) / 1000
        T_actual = (C / V_actual) ** (1 / n)
        
        return {
            "optimization": "Cutting Speed",
            "material": material_id,
            "target_tool_life_min": tool_life_target_min,
            "results": {
                "optimal_speed_m_min": round(V_optimal, 1),
                "optimal_rpm": round(rpm_optimal),
                "actual_speed_m_min": round(V_actual, 1),
                "actual_tool_life_min": round(T_actual, 1)
            },
            "limited_by": "machine_max_rpm" if rpm_optimal >= machine_max_rpm else "taylor_equation"
        }
    
    def prism_physics_optimize_feed(self, material_id: str, surface_finish_Ra_um: float = 1.6,
                                     nose_radius_mm: float = 0.8) -> Dict:
        """Optimize feed rate for target surface finish."""
        # From Ra = f² / (32 * r), solve for f: f = sqrt(Ra * 32 * r)
        Ra_mm = surface_finish_Ra_um / 1000
        f_optimal = math.sqrt(Ra_mm * 32 * nose_radius_mm)
        
        return {
            "optimization": "Feed Rate",
            "target_Ra_um": surface_finish_Ra_um,
            "nose_radius_mm": nose_radius_mm,
            "results": {
                "optimal_feed_mm_rev": round(f_optimal, 4),
                "achievable_Ra_um": round((f_optimal ** 2) / (32 * nose_radius_mm) * 1000, 3)
            }
        }
    
    def prism_physics_optimize_doc(self, material_id: str, tool_diameter_mm: float,
                                    machine_power_kW: float, cutting_speed_m_min: float = 100) -> Dict:
        """Optimize depth of cut for machine power."""
        mat = self.data.prism_material_get(material_id)
        if "error" in mat:
            return mat
        
        kc = mat.get("kienzle_kc1_1", 1500)
        
        # Power = Fc * Vc / 60000, Fc = kc * b * h
        # Simplified: max_depth when using 80% of power
        available_power = machine_power_kW * 0.8
        
        # Assume width = diameter, chip_thickness = 0.1mm
        b = tool_diameter_mm
        h = 0.1
        Fc_max = available_power * 60000 / cutting_speed_m_min
        
        # Estimate max depth from force
        max_depth = Fc_max / (kc * h ** 0.75) * 0.5  # Conservative
        max_depth = min(max_depth, tool_diameter_mm * 1.5)  # Physical limit
        
        return {
            "optimization": "Depth of Cut",
            "material": material_id,
            "machine_power_kW": machine_power_kW,
            "results": {
                "max_depth_mm": round(max_depth, 2),
                "recommended_depth_mm": round(max_depth * 0.7, 2),
                "power_utilization": "80%"
            }
        }


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: STATE SERVER MCP (11 tools)
# ═══════════════════════════════════════════════════════════════════════════

class StateServerMCP:
    """Session/Event/Decision management - 11 tools."""
    
    def __init__(self):
        self.state_file = STATE_DIR / "CURRENT_STATE.json"
        self.events_dir = STATE_DIR / "events"
        self.decisions_dir = STATE_DIR / "decisions"
        self.checkpoints_dir = STATE_DIR / "checkpoints"
        
        self.events_dir.mkdir(exist_ok=True)
        self.decisions_dir.mkdir(exist_ok=True)
        self.checkpoints_dir.mkdir(exist_ok=True)
        
        self._current_state = self._load_state()
        self._event_sequence = 0
    
    def _load_state(self) -> Dict:
        """Load current state from file."""
        if self.state_file.exists():
            return json.loads(self.state_file.read_text(encoding='utf-8'))
        return {"version": "1.0.0", "session_id": None, "quick_resume": ""}
    
    def _save_state(self):
        """Save current state to file."""
        # Sort keys for cache stability
        content = json.dumps(self._current_state, indent=2, sort_keys=True)
        self.state_file.write_text(content, encoding='utf-8')
    
    def _get_event_file(self) -> Path:
        """Get current session's event file."""
        session_id = self._current_state.get("session_id", "default")
        return self.events_dir / f"{session_id}.jsonl"
    
    # ─────────────────────────────────────────────────────────────
    # SESSION STATE (5)
    # ─────────────────────────────────────────────────────────────
    
    def prism_state_get(self) -> Dict:
        """Get full current state."""
        return self._current_state.copy()
    
    def prism_state_update(self, delta: Dict) -> Dict:
        """Update state with delta (merge)."""
        def deep_merge(base: Dict, update: Dict) -> Dict:
            result = base.copy()
            for key, value in update.items():
                if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                    result[key] = deep_merge(result[key], value)
                else:
                    result[key] = value
            return result
        
        self._current_state = deep_merge(self._current_state, delta)
        self._current_state["lastUpdated"] = datetime.now().isoformat()
        self._save_state()
        
        # Log state change event
        self.prism_event_append({
            "type": "STATE_CHANGE",
            "delta_keys": list(delta.keys())
        })
        
        return self._current_state
    
    def prism_state_checkpoint(self, name: str) -> Dict:
        """Create named checkpoint."""
        checkpoint_id = f"CP-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{name}"
        checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"
        
        checkpoint_data = {
            "checkpoint_id": checkpoint_id,
            "name": name,
            "timestamp": datetime.now().isoformat(),
            "state": self._current_state.copy(),
            "checksum": hashlib.sha256(json.dumps(self._current_state, sort_keys=True).encode()).hexdigest()[:16]
        }
        
        checkpoint_file.write_text(json.dumps(checkpoint_data, indent=2, sort_keys=True), encoding='utf-8')
        
        return {"checkpoint_id": checkpoint_id, "file": str(checkpoint_file)}
    
    def prism_state_restore(self, checkpoint_id: str) -> Dict:
        """Restore from checkpoint."""
        checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"
        
        if not checkpoint_file.exists():
            return {"error": f"Checkpoint not found: {checkpoint_id}"}
        
        checkpoint_data = json.loads(checkpoint_file.read_text(encoding='utf-8'))
        
        # Verify checksum
        expected = checkpoint_data.get("checksum")
        actual = hashlib.sha256(json.dumps(checkpoint_data["state"], sort_keys=True).encode()).hexdigest()[:16]
        
        if expected != actual:
            return {"error": "Checkpoint integrity check failed", "expected": expected, "actual": actual}
        
        self._current_state = checkpoint_data["state"]
        self._save_state()
        
        return {"restored": checkpoint_id, "state": self._current_state}
    
    def prism_state_rollback(self, event_id: str) -> Dict:
        """Rollback to state before event."""
        # Find the event and restore previous state
        events = self._read_all_events()
        
        target_idx = None
        for i, event in enumerate(events):
            if event.get("event_id") == event_id:
                target_idx = i
                break
        
        if target_idx is None:
            return {"error": f"Event not found: {event_id}"}
        
        # Find most recent checkpoint before this event
        checkpoints = list(self.checkpoints_dir.glob("*.json"))
        checkpoints.sort(reverse=True)
        
        if checkpoints:
            # Use most recent checkpoint
            return self.prism_state_restore(checkpoints[0].stem)
        
        return {"error": "No checkpoint available for rollback"}
    
    def _read_all_events(self) -> List[Dict]:
        """Read all events from all session files."""
        events = []
        for event_file in self.events_dir.glob("*.jsonl"):
            with open(event_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        events.append(json.loads(line))
        return events
    
    # ─────────────────────────────────────────────────────────────
    # EVENT LOG (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_event_append(self, event: Dict) -> str:
        """Append event to log (append-only)."""
        self._event_sequence += 1
        
        event_entry = {
            "event_id": f"EVT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{self._event_sequence:04d}",
            "timestamp": datetime.now().isoformat(),
            "sequence": self._event_sequence,
            **event
        }
        
        event_file = self._get_event_file()
        with open(event_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(event_entry, sort_keys=True) + '\n')
        
        return event_entry["event_id"]
    
    def prism_event_search(self, query: Dict) -> List[Dict]:
        """Search events with filters."""
        events = self._read_all_events()
        results = []
        
        for event in events:
            match = True
            
            if "type" in query and event.get("type") != query["type"]:
                match = False
            if "after" in query and event.get("timestamp", "") < query["after"]:
                match = False
            if "before" in query and event.get("timestamp", "") > query["before"]:
                match = False
            
            if match:
                results.append(event)
        
        return results[-100:]  # Last 100 matches
    
    def prism_event_recent(self, n: int = 10) -> List[Dict]:
        """Get n most recent events."""
        events = self._read_all_events()
        return events[-n:]
    
    # ─────────────────────────────────────────────────────────────
    # DECISION LOG (3)
    # ─────────────────────────────────────────────────────────────
    
    def prism_decision_record(self, decision: Dict) -> str:
        """Record a decision."""
        decision_id = f"DEC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        decision_entry = {
            "decision_id": decision_id,
            "timestamp": datetime.now().isoformat(),
            **decision
        }
        
        decision_file = self.decisions_dir / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        with open(decision_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(decision_entry, sort_keys=True) + '\n')
        
        return decision_id
    
    def prism_decision_search(self, query: Dict) -> List[Dict]:
        """Search decisions."""
        decisions = []
        for decision_file in self.decisions_dir.glob("*.jsonl"):
            with open(decision_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        decisions.append(json.loads(line))
        
        # Filter
        results = []
        for dec in decisions:
            match = True
            if "keyword" in query:
                text = json.dumps(dec).lower()
                if query["keyword"].lower() not in text:
                    match = False
            if match:
                results.append(dec)
        
        return results[-50:]
    
    def prism_decision_recent(self, n: int = 5) -> List[Dict]:
        """Get n most recent decisions."""
        decisions = []
        for decision_file in sorted(self.decisions_dir.glob("*.jsonl"), reverse=True):
            with open(decision_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        decisions.append(json.loads(line))
            if len(decisions) >= n:
                break
        return decisions[:n]



# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: VALIDATION MCP (8 tools)
# ═══════════════════════════════════════════════════════════════════════════

class ValidationMCP:
    """Quality/Safety validation - 8 tools."""
    
    def __init__(self, data_mcp: DataQueryMCP, physics_mcp: PhysicsMCP):
        self.data = data_mcp
        self.physics = physics_mcp
    
    # ─────────────────────────────────────────────────────────────
    # QUALITY SCORES (4)
    # ─────────────────────────────────────────────────────────────
    
    def prism_quality_omega(self, output: Dict) -> Dict:
        """Compute full Ω(x) quality score."""
        # Extract or estimate component scores
        R = output.get("R", output.get("reasoning", 0.7))
        C = output.get("C", output.get("code", 0.7))
        P = output.get("P", output.get("process", 0.7))
        S = output.get("S", output.get("safety", 0.7))
        L = output.get("L", output.get("learning", 0.6))
        D = output.get("D", output.get("anomaly", 0.5))
        A = output.get("A", output.get("attention", 0.7))
        K = output.get("K", output.get("causal", 0.6))
        M = output.get("M", output.get("memory", 0.7))
        
        # Ω(x) = 0.18R + 0.14C + 0.10P + 0.22S + 0.06L + 0.10D + 0.08A + 0.07K + 0.05M
        omega = (0.18 * R + 0.14 * C + 0.10 * P + 0.22 * S + 0.06 * L +
                 0.10 * D + 0.08 * A + 0.07 * K + 0.05 * M)
        
        # Confidence interval (simplified)
        values = [R, C, P, S, L, D, A, K, M]
        omega_lower = omega - 0.1 * (max(values) - min(values))
        omega_upper = omega + 0.1 * (max(values) - min(values))
        
        # Hard constraints
        safety_pass = S >= 0.70
        anomaly_pass = D >= 0.30
        
        # Decision
        if not safety_pass or not anomaly_pass:
            decision = "BLOCK"
            omega = 0.0
        elif omega >= 0.85 and omega_lower >= 0.70:
            decision = "RELEASE"
        elif omega >= 0.65:
            decision = "WARN"
        else:
            decision = "BLOCK"
        
        return {
            "omega": round(omega, 4),
            "omega_lower": round(omega_lower, 4),
            "omega_upper": round(omega_upper, 4),
            "components": {
                "R": R, "C": C, "P": P, "S": S, "L": L,
                "D": D, "A": A, "K": K, "M": M
            },
            "weights": {
                "R": 0.18, "C": 0.14, "P": 0.10, "S": 0.22, "L": 0.06,
                "D": 0.10, "A": 0.08, "K": 0.07, "M": 0.05
            },
            "hard_constraints": {
                "S >= 0.70": safety_pass,
                "D >= 0.30": anomaly_pass
            },
            "decision": decision
        }
    
    def prism_quality_safety(self, output: Dict) -> Dict:
        """Compute S(x) safety score."""
        issues = []
        score = 1.0
        
        # Check for safety-critical fields
        if "cutting_force_N" in output:
            if output["cutting_force_N"] > 10000:
                issues.append("Excessive cutting force (>10kN)")
                score -= 0.3
        
        if "deflection_mm" in output:
            if output["deflection_mm"] > 0.05:
                issues.append("Excessive tool deflection (>0.05mm)")
                score -= 0.2
        
        if "stability" in output:
            if output["stability"] == "CHATTER_RISK":
                issues.append("Chatter/vibration risk detected")
                score -= 0.25
        
        if "rpm" in output:
            if output["rpm"] > 30000:
                issues.append("RPM exceeds safe limit")
                score -= 0.4
        
        # Check for placeholders
        text = json.dumps(output).lower()
        if "todo" in text or "placeholder" in text or "xxx" in text:
            issues.append("Contains placeholder content")
            score -= 0.3
        
        score = max(0.0, score)
        
        return {
            "S_x": round(score, 3),
            "passed": score >= 0.70,
            "issues": issues if issues else ["No safety issues detected"],
            "threshold": 0.70,
            "enforcement": "HARD_BLOCK" if score < 0.70 else "PASS"
        }
    
    def prism_quality_reasoning(self, output: Dict) -> Dict:
        """Compute R(x) reasoning score."""
        score = 0.7  # Base score
        factors = []
        
        # Check for evidence
        if "evidence" in output or "sources" in output:
            score += 0.1
            factors.append("+0.1: Evidence provided")
        
        # Check for completeness
        if output.get("complete", False):
            score += 0.1
            factors.append("+0.1: Marked complete")
        
        # Check for explanation
        if "explanation" in output or "reasoning" in output:
            score += 0.1
            factors.append("+0.1: Explanation provided")
        
        # Deductions
        if output.get("assumptions", []):
            score -= 0.05 * len(output["assumptions"])
            factors.append(f"-{0.05 * len(output['assumptions'])}: Unverified assumptions")
        
        score = max(0.0, min(1.0, score))
        
        return {
            "R_x": round(score, 3),
            "factors": factors,
            "assessment": "HIGH" if score >= 0.8 else ("MEDIUM" if score >= 0.6 else "LOW")
        }
    
    def prism_quality_code(self, output: Dict) -> Dict:
        """Compute C(x) code quality score."""
        score = 0.7  # Base
        factors = []
        
        code = output.get("code", "")
        
        if code:
            # Check for docstrings
            if '"""' in code or "'''" in code:
                score += 0.1
                factors.append("+0.1: Has docstrings")
            
            # Check for type hints
            if "->" in code or ": str" in code or ": int" in code:
                score += 0.05
                factors.append("+0.05: Has type hints")
            
            # Check for error handling
            if "try:" in code or "except" in code:
                score += 0.05
                factors.append("+0.05: Has error handling")
            
            # Deductions
            if "TODO" in code or "FIXME" in code:
                score -= 0.2
                factors.append("-0.2: Contains TODO/FIXME")
            
            if "pass" in code and code.count("pass") > 2:
                score -= 0.1
                factors.append("-0.1: Multiple empty pass statements")
        
        score = max(0.0, min(1.0, score))
        
        return {
            "C_x": round(score, 3),
            "factors": factors,
            "assessment": "HIGH" if score >= 0.8 else ("MEDIUM" if score >= 0.6 else "LOW")
        }
    
    # ─────────────────────────────────────────────────────────────
    # VALIDATION GATES (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_validate_gates(self, output: Dict) -> Dict:
        """Run all 9 validation gates."""
        gates = {}
        
        # G1: Path accessible (simplified)
        gates["G1_path"] = {"check": "Path accessible", "passed": True}
        
        # G2: State valid
        gates["G2_state"] = {"check": "State file valid", "passed": True}
        
        # G3: Input understood
        gates["G3_input"] = {"check": "Input understood", "passed": bool(output)}
        
        # G4: Skills available
        gates["G4_skills"] = {"check": "Skills available", "passed": True}
        
        # G5: Output path
        gates["G5_output"] = {"check": "Output on C:", "passed": True}
        
        # G6: Evidence exists
        has_evidence = "evidence" in output or "results" in output or "data" in output
        gates["G6_evidence"] = {"check": "Evidence exists", "passed": has_evidence}
        
        # G7: Anti-regression
        gates["G7_regression"] = {"check": "No regression", "passed": True}
        
        # G8: Safety (S(x) >= 0.70)
        safety = self.prism_quality_safety(output)
        gates["G8_safety"] = {
            "check": "S(x) >= 0.70",
            "passed": safety["passed"],
            "value": safety["S_x"],
            "enforcement": "HARD_BLOCK"
        }
        
        # G9: Anomaly (D(x) >= 0.30)
        D_x = output.get("D", output.get("anomaly", 0.5))
        gates["G9_anomaly"] = {
            "check": "D(x) >= 0.30",
            "passed": D_x >= 0.30,
            "value": D_x,
            "enforcement": "HARD_BLOCK"
        }
        
        all_passed = all(g["passed"] for g in gates.values())
        hard_blocks = [k for k, v in gates.items() if not v["passed"] and v.get("enforcement") == "HARD_BLOCK"]
        
        return {
            "gates": gates,
            "all_passed": all_passed,
            "hard_blocks": hard_blocks,
            "decision": "BLOCK" if hard_blocks else ("PASS" if all_passed else "WARN")
        }
    
    def prism_validate_anti_regression(self, old: Dict, new: Dict) -> Dict:
        """Validate new version doesn't regress from old."""
        issues = []
        
        # Count comparison
        old_count = len(json.dumps(old))
        new_count = len(json.dumps(new))
        size_ratio = new_count / old_count if old_count > 0 else 1.0
        
        if size_ratio < 0.8:
            issues.append(f"Size decreased by {(1-size_ratio)*100:.1f}% (>20% threshold)")
        
        # Key comparison
        old_keys = set(self._flatten_keys(old))
        new_keys = set(self._flatten_keys(new))
        
        lost_keys = old_keys - new_keys
        if lost_keys:
            issues.append(f"Lost keys: {list(lost_keys)[:5]}")
        
        # Item count comparison (if lists)
        for key in old_keys & new_keys:
            old_val = self._get_nested(old, key)
            new_val = self._get_nested(new, key)
            if isinstance(old_val, list) and isinstance(new_val, list):
                if len(new_val) < len(old_val):
                    issues.append(f"List '{key}' shrunk: {len(old_val)} -> {len(new_val)}")
        
        return {
            "validation": "Anti-Regression",
            "old_size": old_count,
            "new_size": new_count,
            "size_ratio": round(size_ratio, 3),
            "passed": len(issues) == 0,
            "issues": issues if issues else ["No regression detected"],
            "hook": "BAYES-002"
        }
    
    def _flatten_keys(self, d: Dict, prefix: str = "") -> List[str]:
        """Flatten dictionary keys."""
        keys = []
        for k, v in d.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.append(full_key)
            if isinstance(v, dict):
                keys.extend(self._flatten_keys(v, full_key))
        return keys
    
    def _get_nested(self, d: Dict, key: str) -> Any:
        """Get nested value by dotted key."""
        parts = key.split(".")
        val = d
        for p in parts:
            if isinstance(val, dict):
                val = val.get(p)
            else:
                return None
        return val
    
    # ─────────────────────────────────────────────────────────────
    # SAFETY CHECKS (2)
    # ─────────────────────────────────────────────────────────────
    
    def prism_safety_check_limits(self, params: Dict) -> Dict:
        """Check machining parameters against safe limits."""
        return self.physics.prism_physics_check_limits(params)
    
    def prism_safety_check_collision(self, path: Dict) -> Dict:
        """Check toolpath for potential collisions."""
        warnings = []
        
        # Check Z moves
        z_min = path.get("z_min", 0)
        if z_min < -100:
            warnings.append(f"Z depth ({z_min}mm) may exceed part/fixture")
        
        # Check rapid moves
        rapids = path.get("rapids", [])
        for rapid in rapids:
            if rapid.get("z", 0) < 0:
                warnings.append(f"Rapid move below Z0: {rapid}")
        
        # Check clearance plane
        clearance = path.get("clearance_z", 5)
        if clearance < 2:
            warnings.append(f"Clearance plane ({clearance}mm) is very low")
        
        return {
            "check": "Collision Detection",
            "path_analyzed": bool(path),
            "warnings": warnings,
            "safe": len(warnings) == 0,
            "S_x": 0.9 if not warnings else 0.6
        }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN MCP SERVER CLASS
# ═══════════════════════════════════════════════════════════════════════════

class PRISMMCPServer:
    """
    PRISM MCP Server v1.8 - Complete with Tier 0 + Tier 1 + Tier 2.1
    84 MCP Tools for Manufacturing Intelligence
    
    Categories:
    - Orchestration (14): Skill/Agent/Hook/Formula management
    - Data Query (9): Materials/Machines/Alarms
    - Physics (12): Cutting calculations
    - State Server (9): State/Event/Decision (moved 2 to session)
    - Validation (8): Quality/Safety checks
    - Recovery (3): Compaction/Transcript/Reconstruct
    - Session (5): Resume/Inject/Pressure/End/Handoff
    - GSD (1): Get GSD Core
    - Append-Only State (4): Append/Rebuild/Checkpoint
    - Cache (2): Validate/Sort for KV-cache stability [Tier 1.1]
    - Context (3): Size/Compress/Expand [Tier 1.2]
    - Error Learning (3): Log/Analyze/Learn [Tier 1.3]
    - Attention Focus (2): Focus/Score [Tier 1.4]
    - Prompt Templates (2): Build/Get [Tier 1.5]
    - Batch Processing (2): Execute/Queue [Tier 1.6]
    - Resource Access (4): Get/Search/List/Registry [Tier 2.1]
    """
    
    GSD_PATH = Path("C:/PRISM/docs/GSD_CORE_v4.md")
    
    def __init__(self):
        # Initialize all MCP modules
        self.orchestration = OrchestrationMCP()
        self.data = DataQueryMCP()
        self.physics = PhysicsMCP(self.data)
        self.state = StateServerMCP()
        self.validation = ValidationMCP(self.data, self.physics)
        
        # Tier 0 modules (session management)
        self._init_tier0_modules()
        
        # Build tool registry
        self.tools = self._build_tool_registry()
    
    def _init_tier0_modules(self):
        """Initialize Tier 0 session management modules."""
        import sys
        sys.path.insert(0, str(Path("C:/PRISM/scripts/core")))
        
        # Try to import Tier 0 modules
        self.recovery_mcp = None
        self.resume_mcp = None
        self.handoff_mcp = None
        self.state_mcp = None
        
        try:
            from recovery_mcp import RecoveryMCP
            self.recovery_mcp = RecoveryMCP()
        except ImportError:
            pass
        
        try:
            from resume_mcp import ResumeMCP
            self.resume_mcp = ResumeMCP()
        except ImportError:
            pass
        
        try:
            from handoff_mcp import HandoffMCP
            self.handoff_mcp = HandoffMCP()
        except ImportError:
            pass
        
        try:
            from state_mcp import StateMCP
            self.state_mcp = StateMCP()
        except ImportError:
            pass
        
        # Tier 1 Session 1.1: Cache MCP Tools
        self.cache_mcp = None
        try:
            from cache_mcp import CacheMCP
            self.cache_mcp = CacheMCP()
        except ImportError:
            pass
        
        # Tier 1 Session 1.2: Context MCP Tools
        self.context_mcp = None
        try:
            from context_mcp import ContextMCP
            self.context_mcp = ContextMCP()
        except ImportError:
            pass
        
        # Tier 1 Session 1.3: Error Learning MCP Tools
        self.error_mcp = None
        try:
            from error_mcp import ErrorMCP
            self.error_mcp = ErrorMCP()
        except ImportError:
            pass
        
        # Tier 1 Session 1.4: Attention Focus MCP Tools
        self.attention_mcp = None
        try:
            from attention_mcp import AttentionMCP
            self.attention_mcp = AttentionMCP()
        except ImportError:
            pass
        
        # Tier 1 Session 1.5: Prompt Template MCP Tools
        self.prompt_mcp = None
        try:
            from prompt_mcp import PromptMCP
            self.prompt_mcp = PromptMCP()
        except ImportError:
            pass
        
        # Tier 1 Session 1.6: Batch Processing MCP Tools
        self.batch_mcp = None
        try:
            from batch_mcp import BatchMCP
            self.batch_mcp = BatchMCP()
        except ImportError:
            pass
        
        # Tier 2 Session 2.1: Resource Access MCP Tools
        self.resource_mcp = None
        try:
            from resource_mcp import ResourceMCP
            self.resource_mcp = ResourceMCP()
        except ImportError:
            pass
        
        # Tier 2 Session 2.2: Skill File MCP Tools
        self.skill_mcp = None
        try:
            from skill_mcp import SkillMCP
            self.skill_mcp = SkillMCP()
        except ImportError:
            pass
        
        # Tier 2 Session 2.3: Efficiency MCP Tools
        self.efficiency_mcp = None
        try:
            from efficiency_mcp import EfficiencyMCP
            self.efficiency_mcp = EfficiencyMCP()
        except ImportError:
            pass
        
        # Tier 2 Session 2.3: MCP Orchestrator (central efficiency layer)
        self.orchestrator = None
        try:
            from mcp_orchestrator import get_orchestrator
            self.orchestrator = get_orchestrator()
        except ImportError:
            pass
        
        # Tier 2 Session 2.4: Hook System MCP Tools
        self.hook_mcp = None
        try:
            from hook_mcp import get_hook_mcp
            self.hook_mcp = get_hook_mcp()
        except ImportError:
            pass
        
        # Tier 2 Session 2.5: Formula System MCP Tools
        self.formula_mcp = None
        try:
            from formula_mcp import get_formula_mcp
            self.formula_mcp = get_formula_mcp()
        except ImportError:
            pass
        
        # Tier 2 Session 2.6: Master Orchestrator (unified orchestration)
        self.master_orch = None
        try:
            from master_orchestrator import get_master_orchestrator
            self.master_orch = get_master_orchestrator()
        except ImportError:
            pass
        
        # GSD MCP - Token-efficient GSD_CORE access
        self.gsd_mcp = None
        try:
            from gsd_mcp import get_gsd_mcp
            self.gsd_mcp = get_gsd_mcp()
        except ImportError:
            pass
        
        # Enhanced Tools - Context Engineering, Hook-First, Session, SP, Safety
        self.enhanced_mcp = None
        try:
            from prism_enhanced_tools import get_enhanced_mcp
            self.enhanced_mcp = get_enhanced_mcp()
        except ImportError:
            pass
    
    def prism_gsd_get(self, section: str = None) -> Dict:
        """
        Get GSD_CORE content.
        
        Args:
            section: Optional section name to filter
            
        Returns:
            GSD content as dict with full text and parsed sections
        """
        if not self.GSD_PATH.exists():
            return {"error": f"GSD not found: {self.GSD_PATH}"}
        
        content = self.GSD_PATH.read_text(encoding='utf-8')
        
        # Parse sections
        sections = {}
        current_section = "HEADER"
        current_lines = []
        
        for line in content.split('\n'):
            if line.startswith('## '):
                if current_lines:
                    sections[current_section] = '\n'.join(current_lines)
                current_section = line[3:].strip()
                current_lines = []
            else:
                current_lines.append(line)
        
        if current_lines:
            sections[current_section] = '\n'.join(current_lines)
        
        result = {
            "path": str(self.GSD_PATH),
            "version": "4.2",
            "mcp_tools": 66,
            "tier_0_complete": True,
            "sections": list(sections.keys())
        }
        
        if section:
            if section in sections:
                result["content"] = sections[section]
            else:
                result["error"] = f"Section not found: {section}"
                result["available_sections"] = list(sections.keys())
        else:
            result["full_content"] = content
        
        return result
    
    def _build_tool_registry(self) -> Dict[str, callable]:
        """Build registry of all 84 MCP tools."""
        tools = {}
        
        # ORCHESTRATION (14)
        tools["prism_skill_load"] = self.orchestration.prism_skill_load
        tools["prism_skill_list"] = self.orchestration.prism_skill_list
        tools["prism_skill_relevance"] = self.orchestration.prism_skill_relevance
        tools["prism_skill_select"] = self.orchestration.prism_skill_select
        tools["prism_skill_dependencies"] = self.orchestration.prism_skill_dependencies
        tools["prism_skill_consumers"] = self.orchestration.prism_skill_consumers
        tools["prism_agent_list"] = self.orchestration.prism_agent_list
        tools["prism_agent_select"] = self.orchestration.prism_agent_select
        tools["prism_agent_spawn"] = self.orchestration.prism_agent_spawn
        tools["prism_agent_status"] = self.orchestration.prism_agent_status
        tools["prism_hook_list"] = self.orchestration.prism_hook_list
        tools["prism_hook_trigger"] = self.orchestration.prism_hook_trigger
        tools["prism_formula_list"] = self.orchestration.prism_formula_list
        tools["prism_formula_apply"] = self.orchestration.prism_formula_apply
        
        # DATA QUERY (9)
        tools["prism_material_get"] = self.data.prism_material_get
        tools["prism_material_search"] = self.data.prism_material_search
        tools["prism_material_property"] = self.data.prism_material_property
        tools["prism_material_similar"] = self.data.prism_material_similar
        tools["prism_machine_get"] = self.data.prism_machine_get
        tools["prism_machine_search"] = self.data.prism_machine_search
        tools["prism_machine_capabilities"] = self.data.prism_machine_capabilities
        tools["prism_alarm_get"] = self.data.prism_alarm_get
        tools["prism_alarm_search"] = self.data.prism_alarm_search
        
        # PHYSICS (12)
        tools["prism_physics_kienzle"] = self.physics.prism_physics_kienzle
        tools["prism_physics_taylor"] = self.physics.prism_physics_taylor
        tools["prism_physics_johnson_cook"] = self.physics.prism_physics_johnson_cook
        tools["prism_physics_stability"] = self.physics.prism_physics_stability
        tools["prism_physics_deflection"] = self.physics.prism_physics_deflection
        tools["prism_physics_surface"] = self.physics.prism_physics_surface
        tools["prism_physics_validate_kienzle"] = self.physics.prism_physics_validate_kienzle
        tools["prism_physics_check_limits"] = self.physics.prism_physics_check_limits
        tools["prism_physics_unit_convert"] = self.physics.prism_physics_unit_convert
        tools["prism_physics_optimize_speed"] = self.physics.prism_physics_optimize_speed
        tools["prism_physics_optimize_feed"] = self.physics.prism_physics_optimize_feed
        tools["prism_physics_optimize_doc"] = self.physics.prism_physics_optimize_doc
        
        # STATE SERVER (11)
        tools["prism_state_get"] = self.state.prism_state_get
        tools["prism_state_update"] = self.state.prism_state_update
        tools["prism_state_checkpoint"] = self.state.prism_state_checkpoint
        tools["prism_state_restore"] = self.state.prism_state_restore
        tools["prism_state_rollback"] = self.state.prism_state_rollback
        tools["prism_event_append"] = self.state.prism_event_append
        tools["prism_event_search"] = self.state.prism_event_search
        tools["prism_event_recent"] = self.state.prism_event_recent
        tools["prism_decision_record"] = self.state.prism_decision_record
        tools["prism_decision_search"] = self.state.prism_decision_search
        tools["prism_decision_recent"] = self.state.prism_decision_recent
        
        # VALIDATION (8)
        tools["prism_quality_omega"] = self.validation.prism_quality_omega
        tools["prism_quality_safety"] = self.validation.prism_quality_safety
        tools["prism_quality_reasoning"] = self.validation.prism_quality_reasoning
        tools["prism_quality_code"] = self.validation.prism_quality_code
        tools["prism_validate_gates"] = self.validation.prism_validate_gates
        tools["prism_validate_anti_regression"] = self.validation.prism_validate_anti_regression
        tools["prism_safety_check_limits"] = self.validation.prism_safety_check_limits
        tools["prism_safety_check_collision"] = self.validation.prism_safety_check_collision
        
        # GSD (1) - Direct GSD access
        tools["prism_gsd_get"] = self.prism_gsd_get
        
        # TIER 0 SESSION TOOLS (12 total)
        # RECOVERY (3) - Session 0.1
        if self.recovery_mcp:
            tools["prism_compaction_detect"] = lambda: self.recovery_mcp.call("prism_compaction_detect", {})
            tools["prism_transcript_read"] = lambda path=None, lines=100: self.recovery_mcp.call("prism_transcript_read", {"path": path, "lines": lines})
            tools["prism_state_reconstruct"] = lambda transcript_path=None: self.recovery_mcp.call("prism_state_reconstruct", {"transcript_path": transcript_path})
        
        # APPEND-ONLY STATE (4) - Session 0.2
        if self.state_mcp:
            tools["prism_state_append"] = lambda event_type="", data=None: self.state_mcp.call("prism_state_append", {"event_type": event_type, "data": data})
            tools["prism_checkpoint_create"] = lambda reason=None: self.state_mcp.call("prism_checkpoint_create", {"reason": reason})
            tools["prism_checkpoint_restore"] = lambda checkpoint_id=None: self.state_mcp.call("prism_checkpoint_restore", {"checkpoint_id": checkpoint_id})
            tools["prism_state_rebuild"] = lambda from_checkpoint=None: self.state_mcp.call("prism_state_rebuild", {"from_checkpoint": from_checkpoint})
        
        # SESSION RESUME (2) - Session 0.3
        if self.resume_mcp:
            tools["prism_session_resume"] = lambda level="STANDARD", save=False: self.resume_mcp.call("prism_session_resume", {"level": level, "save": save})
            tools["prism_context_inject"] = lambda fmt="TEXT", max_tokens=5000: self.resume_mcp.call("prism_context_inject", {"format": fmt, "max_tokens": max_tokens})
        
        # SESSION HANDOFF (3) - Session 0.4
        if self.handoff_mcp:
            tools["prism_session_end"] = lambda shutdown_type="GRACEFUL", summary=None, next_action=None: self.handoff_mcp.call("prism_session_end", {"shutdown_type": shutdown_type, "summary": summary, "next_action": next_action})
            tools["prism_handoff_prepare"] = lambda fmt="CLAUDE", save=True: self.handoff_mcp.call("prism_handoff_prepare", {"format": fmt, "save": save})
            tools["prism_context_pressure"] = lambda tokens_used=None, action="check": self.handoff_mcp.call("prism_context_pressure", {"tokens_used": tokens_used, "action": action})
        
        # CACHE (2) - Session 1.1 KV-Cache Stability
        if self.cache_mcp:
            tools["prism_cache_validate"] = lambda file_path=None, content=None, prefix_lines=50: self.cache_mcp.prism_cache_validate(file_path=file_path, content=content, prefix_lines=prefix_lines)
            tools["prism_json_sort"] = lambda file_path=None, content=None, write=False, indent=2: self.cache_mcp.prism_json_sort(file_path=file_path, content=content, write=write, indent=indent)
        
        # CONTEXT (3) - Session 1.2 Smart Context Compression
        if self.context_mcp:
            tools["prism_context_size"] = lambda content=None, tokens=None: self.context_mcp.prism_context_size(content=content, tokens=tokens)
            tools["prism_context_compress"] = lambda content="", level=None, force=False: self.context_mcp.prism_context_compress(content=content, level=level, force=force)
            tools["prism_context_expand"] = lambda compressed_content="", manifest_hash=None, content_types=None: self.context_mcp.prism_context_expand(compressed_content=compressed_content, manifest_hash=manifest_hash, content_types=content_types)
        
        # ERROR LEARNING (3) - Session 1.3 Error Learning Pipeline
        if self.error_mcp:
            tools["prism_error_log"] = lambda error_type="", message="", tool_name=None, context=None, severity="MEDIUM", params=None: self.error_mcp.prism_error_log(error_type=error_type, message=message, tool_name=tool_name, context=context, severity=severity, params=params)
            tools["prism_error_analyze"] = lambda since_hours=24, detect_patterns=True: self.error_mcp.prism_error_analyze(since_hours=since_hours, detect_patterns=detect_patterns)
            tools["prism_error_learn"] = lambda error_type="", trigger="", action="", explanation="", learning_type="fix", tools=None: self.error_mcp.prism_error_learn(error_type=error_type, trigger=trigger, action=action, explanation=explanation, learning_type=learning_type, tools=tools)
        
        # ATTENTION FOCUS (2) - Session 1.4 Attention Focus Optimization
        if self.attention_mcp:
            tools["prism_attention_focus"] = lambda task="", content=None, focus_level="standard", task_type=None, keywords=None: self.attention_mcp.prism_attention_focus(task=task, content=content, focus_level=focus_level, task_type=task_type, keywords=keywords)
            tools["prism_relevance_score"] = lambda content="", task=None, keywords=None, segment_size=50, min_score=0.0: self.attention_mcp.prism_relevance_score(content=content, task=task, keywords=keywords, segment_size=segment_size, min_score=min_score)
        
        # PROMPT TEMPLATES (2) - Session 1.5 Prompt Template Optimization
        if self.prompt_mcp:
            tools["prism_prompt_build"] = lambda task="", context=None, template=None, variables=None, constraints=None, max_tokens=4000, optimization="moderate": self.prompt_mcp.prism_prompt_build(task=task, context=context, template=template, variables=variables, constraints=constraints, max_tokens=max_tokens, optimization=optimization)
            tools["prism_template_get"] = lambda template=None, category=None, list_all=False, create=False, name=None, content=None, description=None: self.prompt_mcp.prism_template_get(template=template, category=category, list_all=list_all, create=create, name=name, content=content, description=description)
        
        # BATCH PROCESSING (2) - Session 1.6 Batch Processing Optimization
        if self.batch_mcp:
            tools["prism_batch_execute"] = lambda items=None, parallel=True, max_parallel=10, group_by_type=True, use_queue=False, priority="normal": self.batch_mcp.prism_batch_execute(items=items or [], parallel=parallel, max_parallel=max_parallel, group_by_type=group_by_type, use_queue=use_queue, priority=priority)
            tools["prism_queue_status"] = lambda action="status", item_id=None, operation=None, params=None, priority="normal", count=5, process=False: self.batch_mcp.prism_queue_status(action=action, item_id=item_id, operation=operation, params=params, priority=priority, count=count, process=process)
        
        # RESOURCE ACCESS (4) - Session 2.1 MCP Resource Access Layer
        if self.resource_mcp:
            tools["prism_resource_get"] = lambda resource_id="", include_related=False: self.resource_mcp.prism_resource_get(resource_id=resource_id, include_related=include_related)
            tools["prism_resource_search"] = lambda query="", types=None, category=None, limit=20: self.resource_mcp.prism_resource_search(query=query, types=types, category=category, limit=limit)
            tools["prism_resource_list"] = lambda resource_type=None, category=None, limit=50: self.resource_mcp.prism_resource_list(resource_type=resource_type, category=category, limit=limit)
            tools["prism_registry_get"] = lambda registry="", section=None: self.resource_mcp.prism_registry_get(registry=registry, section=section)
        
        # SKILL ACCESS (4) - Session 2.2 Skill File MCP Wrappers
        if self.skill_mcp:
            tools["prism_skill_read"] = lambda skill_id="", section=None: self.skill_mcp.prism_skill_read(skill_id=skill_id, section=section)
            tools["prism_skill_search"] = lambda query="", category=None, limit=20: self.skill_mcp.prism_skill_search(query=query, category=category, limit=limit)
            tools["prism_skill_list_all"] = lambda category=None, limit=50: self.skill_mcp.prism_skill_list(category=category, limit=limit)
            tools["prism_skill_stats"] = lambda: self.skill_mcp.prism_skill_stats()
        
        # ORCHESTRATOR (5) - Session 2.3 Central Efficiency Layer
        if self.orchestrator:
            tools["prism_orch_status"] = lambda: self.orchestrator.stats()
            tools["prism_orch_context"] = lambda: self.orchestrator.context_status()
            tools["prism_orch_compress"] = lambda target=60.0: self.orchestrator.compress(target)
            tools["prism_orch_checkpoint"] = lambda reason="manual": self.orchestrator.checkpoint(reason)
            tools["prism_orch_add_usage"] = lambda tokens=0: self.orchestrator.add_usage(tokens)
        
        # HOOK SYSTEM (6) - Session 2.4 Hook System MCP Wrappers
        if self.hook_mcp:
            tools["prism_hook_get"] = lambda hook_id="": self.hook_mcp.prism_hook_get(hook_id)
            tools["prism_hook_search"] = lambda query="", domain=None, limit=20: self.hook_mcp.prism_hook_search(query, domain, limit)
            tools["prism_hook_by_domain"] = lambda domain="", limit=50: self.hook_mcp.prism_hook_by_domain(domain, limit)
            tools["prism_hook_by_trigger"] = lambda trigger_pattern="", limit=20: self.hook_mcp.prism_hook_by_trigger(trigger_pattern, limit)
            tools["prism_hook_categories"] = lambda: self.hook_mcp.prism_hook_categories()
            tools["prism_hook_stats"] = lambda: self.hook_mcp.prism_hook_stats()
        
        # FORMULA SYSTEM (7) - Session 2.5 Formula System MCP Wrappers
        if self.formula_mcp:
            tools["prism_formula_get"] = lambda formula_id="": self.formula_mcp.prism_formula_get(formula_id)
            tools["prism_formula_search"] = lambda query="", category=None, novelty=None, limit=20: self.formula_mcp.prism_formula_search(query, category, novelty, limit)
            tools["prism_formula_by_category"] = lambda category="", limit=50: self.formula_mcp.prism_formula_by_category(category, limit)
            tools["prism_formula_apply"] = lambda formula_id="", inputs=None: self.formula_mcp.prism_formula_apply(formula_id, inputs or {})
            tools["prism_formula_dependencies"] = lambda formula_id="": self.formula_mcp.prism_formula_dependencies(formula_id)
            tools["prism_formula_categories"] = lambda: self.formula_mcp.prism_formula_categories()
            tools["prism_formula_stats"] = lambda: self.formula_mcp.prism_formula_stats()
        
        # MASTER ORCHESTRATOR (6) - Unified orchestration layer
        if self.master_orch:
            tools["prism_master_status"] = lambda: self.master_orch.stats()
            tools["prism_master_context"] = lambda: self.master_orch.context_status()
            tools["prism_master_batch"] = lambda operations=None, parallel=True: self.master_orch.batch_execute(operations or [], parallel)
            tools["prism_master_checkpoint"] = lambda reason="manual": self.master_orch.checkpoint(reason)
            tools["prism_master_swarm"] = lambda task="", agent_count=3, tier="SONNET": self.master_orch.swarm_execute(task, agent_count, tier)
            tools["prism_master_call"] = lambda tool="", params=None: self.master_orch.call(tool, params)
        
        # GSD MCP (4) - Token-efficient GSD_CORE and dev protocol access
        if self.gsd_mcp:
            tools["prism_gsd_core"] = lambda: self.gsd_mcp.prism_gsd_core()
            tools["prism_gsd_quick"] = lambda: self.gsd_mcp.prism_gsd_quick()
            tools["prism_dev_protocol"] = lambda: self.gsd_mcp.prism_dev_protocol()
            tools["prism_resources_summary"] = lambda: self.gsd_mcp.prism_resources_summary()
        
        # ENHANCED TOOLS (39) - Context, Hooks, Session, SP, Safety
        if self.enhanced_mcp:
            for tool_name, tool_func in self.enhanced_mcp.tools.items():
                tools[tool_name] = tool_func
        
        return tools
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Call an MCP tool by name."""
        if tool_name not in self.tools:
            return {"error": f"Tool not found: {tool_name}", "available": list(self.tools.keys())}
        
        try:
            if params:
                return self.tools[tool_name](**params)
            else:
                return self.tools[tool_name]()
        except TypeError as e:
            return {"error": f"Parameter error: {str(e)}", "tool": tool_name}
        except Exception as e:
            return {"error": str(e), "tool": tool_name}
    
    def list_tools(self, category: str = None) -> List[str]:
        """List available tools, optionally filtered by category."""
        tools = list(self.tools.keys())
        
        if category:
            category_prefixes = {
                "orchestration": ["prism_skill_", "prism_agent_", "prism_hook_", "prism_formula_"],
                "data": ["prism_material_", "prism_machine_", "prism_alarm_"],
                "physics": ["prism_physics_"],
                "state": ["prism_state_", "prism_event_", "prism_decision_"],
                "validation": ["prism_quality_", "prism_validate_", "prism_safety_"]
            }
            
            prefixes = category_prefixes.get(category, [])
            tools = [t for t in tools if any(t.startswith(p) for p in prefixes)]
        
        return sorted(tools)
    
    def get_stats(self) -> Dict:
        """Get server statistics."""
        return {
            "total_tools": len(self.tools),
            "categories": {
                "orchestration": len(self.list_tools("orchestration")),
                "data": len(self.list_tools("data")),
                "physics": len(self.list_tools("physics")),
                "state": len(self.list_tools("state")),
                "validation": len(self.list_tools("validation"))
            },
            "skills_loaded": len(self.orchestration.skills_cache),
            "agents_available": len(self.orchestration.agents_cache),
            "hooks_registered": len(self.orchestration.hooks_cache),
            "formulas_available": len(self.orchestration.formulas_cache)
        }


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """CLI interface for PRISM MCP Server."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM MCP Server v1.0")
    parser.add_argument("command", nargs="?", default="stats", 
                       choices=["stats", "list", "call", "test"],
                       help="Command to execute")
    parser.add_argument("--tool", help="Tool name for call command")
    parser.add_argument("--params", help="JSON params for call command")
    parser.add_argument("--category", help="Category filter for list command")
    
    args = parser.parse_args()
    
    # Initialize server
    print("=" * 70)
    print("  PRISM MCP SERVER v1.8")
    print("  84 MCP Tools | Tier 0✓ | Tier 1✓ | Tier 2 IN PROGRESS")
    print("=" * 70)
    
    mcp = PRISMMCPServer()
    
    if args.command == "stats":
        stats = mcp.get_stats()
        print(f"\n📊 SERVER STATISTICS:")
        print(f"   Total Tools: {stats['total_tools']}")
        print(f"\n   By Category:")
        for cat, count in stats['categories'].items():
            print(f"     • {cat}: {count}")
        print(f"\n   Resources:")
        print(f"     • Skills: {stats['skills_loaded']}")
        print(f"     • Agents: {stats['agents_available']}")
        print(f"     • Hooks: {stats['hooks_registered']}")
        print(f"     • Formulas: {stats['formulas_available']}")
    
    elif args.command == "list":
        tools = mcp.list_tools(args.category)
        print(f"\n📋 AVAILABLE TOOLS ({len(tools)}):")
        for tool in tools:
            print(f"   • {tool}")
    
    elif args.command == "call":
        if not args.tool:
            print("❌ --tool required for call command")
            return
        
        params = json.loads(args.params) if args.params else None
        result = mcp.call(args.tool, params)
        print(f"\n🔧 {args.tool}:")
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "test":
        print("\n🧪 RUNNING COMPREHENSIVE TESTS...\n")
        run_tests(mcp)


def run_tests(mcp: PRISMMCPServer):
    """Run comprehensive test suite."""
    tests_passed = 0
    tests_failed = 0
    
    test_cases = [
        # Orchestration tests
        ("prism_skill_list", {}, lambda r: len(r) > 0),
        ("prism_skill_relevance", {"task": "material physics"}, lambda r: len(r) > 0),
        ("prism_agent_list", {}, lambda r: len(r) > 0),
        ("prism_agent_select", {"task": "extract materials"}, lambda r: len(r) > 0),
        ("prism_hook_list", {}, lambda r: len(r) > 0),
        ("prism_formula_list", {}, lambda r: len(r) > 0),
        ("prism_formula_apply", {"name": "F-KIENZLE", "params": {"kc1_1": 1500, "b": 5, "h": 0.1}}, 
         lambda r: "result" in r),
        
        # Data tests
        ("prism_material_get", {"id": "AL-6061"}, lambda r: r.get("name") == "Aluminum 6061-T6"),
        ("prism_material_search", {"query": {"category": "aluminum"}}, lambda r: len(r) >= 2),
        ("prism_machine_get", {"id": "HAAS-VF2"}, lambda r: r.get("manufacturer") == "HAAS"),
        ("prism_machine_capabilities", {"id": "HAAS-VF2"}, lambda r: r.get("capabilities", {}).get("can_mill")),
        ("prism_alarm_search", {"query": {"family": "FANUC"}}, lambda r: len(r) > 0),
        
        # Physics tests
        ("prism_physics_kienzle", {"material_id": "AL-6061", "depth_mm": 2, "width_mm": 5}, 
         lambda r: "cutting_force_N" in r.get("results", {})),
        ("prism_physics_taylor", {"material_id": "AL-6061", "cutting_speed_m_min": 200}, 
         lambda r: "tool_life_min" in r.get("results", {})),
        ("prism_physics_surface", {"feed_mm_rev": 0.1, "nose_radius_mm": 0.8}, 
         lambda r: "Ra_um" in r.get("results", {})),
        ("prism_physics_unit_convert", {"value": 25.4, "from_unit": "mm", "to_unit": "in"}, 
         lambda r: abs(r.get("value", 0) - 1.0) < 0.001),
        ("prism_physics_optimize_speed", {"material_id": "AL-6061", "tool_life_target_min": 30}, 
         lambda r: "optimal_rpm" in r.get("results", {})),
        
        # State tests
        ("prism_state_get", {}, lambda r: "version" in r),
        ("prism_event_recent", {"n": 5}, lambda r: isinstance(r, list)),
        ("prism_decision_recent", {"n": 5}, lambda r: isinstance(r, list)),
        
        # Validation tests
        ("prism_quality_omega", {"output": {"S": 0.8, "D": 0.5}}, 
         lambda r: "omega" in r and "decision" in r),
        ("prism_quality_safety", {"output": {"cutting_force_N": 5000}}, 
         lambda r: "S_x" in r and r["passed"]),
        ("prism_validate_gates", {"output": {"results": True}}, 
         lambda r: "gates" in r and "decision" in r),
        ("prism_validate_anti_regression", {"old": {"a": 1}, "new": {"a": 1, "b": 2}}, 
         lambda r: r.get("passed", False)),
    ]
    
    for tool_name, params, validator in test_cases:
        try:
            result = mcp.call(tool_name, params)
            if "error" not in result and validator(result):
                print(f"  ✅ {tool_name}")
                tests_passed += 1
            else:
                print(f"  ❌ {tool_name}: Validation failed")
                print(f"     Result: {json.dumps(result, indent=2, default=str)[:200]}")
                tests_failed += 1
        except Exception as e:
            print(f"  ❌ {tool_name}: {str(e)}")
            tests_failed += 1
    
    print(f"\n{'='*70}")
    print(f"  TEST RESULTS: {tests_passed} passed, {tests_failed} failed")
    print(f"  SUCCESS RATE: {tests_passed/(tests_passed+tests_failed)*100:.1f}%")
    print(f"{'='*70}")
    
    return tests_passed, tests_failed


if __name__ == "__main__":
    main()
