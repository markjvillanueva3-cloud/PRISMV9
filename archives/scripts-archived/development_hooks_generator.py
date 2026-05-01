#!/usr/bin/env python3
"""
PRISM Development Hooks Generator v1.0
======================================
Generates EXHAUSTIVE hooks for DEVELOPMENT capabilities only.
NO database stuff. Focus on:
- Development of PRISM
- Claude's development capabilities  
- Skills, scripts, agents, swarms, parallels, batches, hooks, loops
- Superpowers (obra, brainstorming)
- Context window optimization
- Token usage optimization
- Resource management and synergizing
- Manus integration
"""

import json
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Any
from datetime import datetime
from pathlib import Path

@dataclass
class DevHook:
    """Development-focused hook definition"""
    id: str
    name: str
    domain: str
    category: str
    subcategory: str
    trigger: str
    description: str
    priority: int
    canDisable: bool
    isBlocking: bool
    params: List[Dict[str, Any]]
    returns: str
    sideEffects: List[str]
    relatedHooks: List[str]
    relatedSkills: List[str]
    relatedMCPTools: List[str]
    status: str = "ACTIVE"

# ============================================================================
# DOMAIN 1: SKILL UTILIZATION HOOKS
# ============================================================================

SKILL_HOOKS = [
    # Skill Discovery & Selection
    DevHook("SKILL-DISCOVER-INIT", "Skill Discovery Initialize", "SKILL", "DISCOVERY", "INIT",
            "skill:discover:init", "Initializes skill discovery process",
            10, False, False, [{"name": "taskContext", "type": "object"}], "SkillList",
            ["logs_discovery_start"], ["SKILL-DISCOVER-SCAN"], 
            ["prism-skill-orchestrator", "prism-all-skills"], ["prism_skill_list", "prism_skill_search"]),
    
    DevHook("SKILL-DISCOVER-SCAN", "Skill Discovery Scan", "SKILL", "DISCOVERY", "SCAN",
            "skill:discover:scan", "Scans all available skills for relevance",
            20, False, False, [{"name": "query", "type": "string"}, {"name": "context", "type": "object"}], "ScoredSkills",
            ["computes_relevance_scores"], ["SKILL-DISCOVER-RANK"], 
            ["prism-skill-orchestrator", "prism-combination-engine"], ["prism_skill_search", "prism_skill_relevance"]),
    
    DevHook("SKILL-DISCOVER-RANK", "Skill Discovery Rank", "SKILL", "DISCOVERY", "RANK",
            "skill:discover:rank", "Ranks skills by relevance and synergy potential",
            30, False, False, [{"name": "scoredSkills", "type": "array"}], "RankedSkills",
            ["applies_synergy_matrix"], ["SKILL-DISCOVER-SELECT"], 
            ["prism-synergy-calculator", "prism-combination-engine"], ["prism_skill_relevance"]),
    
    DevHook("SKILL-DISCOVER-SELECT", "Skill Discovery Select", "SKILL", "DISCOVERY", "SELECT",
            "skill:discover:select", "Selects optimal skill combination for task",
            40, False, False, [{"name": "rankedSkills", "type": "array"}, {"name": "maxSkills", "type": "int"}], "SelectedSkills",
            ["applies_ILP_optimization"], ["SKILL-LOAD-QUEUE"], 
            ["prism-combination-engine", "prism-resource-optimizer"], ["prism_skill_select"]),

    # Skill Loading
    DevHook("SKILL-LOAD-QUEUE", "Skill Load Queue", "SKILL", "LOADING", "QUEUE",
            "skill:load:queue", "Queues skills for loading in optimal order",
            50, True, False, [{"name": "skills", "type": "array"}], "LoadQueue",
            ["optimizes_load_order"], ["SKILL-LOAD-EXECUTE"], 
            ["prism-kv-cache-optimizer"], ["prism_skill_load"]),
    
    DevHook("SKILL-LOAD-EXECUTE", "Skill Load Execute", "SKILL", "LOADING", "EXECUTE",
            "skill:load:execute", "Executes skill loading with KV-cache optimization",
            50, False, False, [{"name": "queue", "type": "LoadQueue"}], "LoadedSkills",
            ["updates_context_budget", "caches_prefix"], ["SKILL-LOAD-VERIFY"], 
            ["prism-kv-cache-optimizer", "prism-token-density"], ["prism_skill_read"]),
    
    DevHook("SKILL-LOAD-VERIFY", "Skill Load Verify", "SKILL", "LOADING", "VERIFY",
            "skill:load:verify", "Verifies skills loaded correctly",
            60, False, True, [{"name": "loadedSkills", "type": "array"}], "VerificationResult",
            ["validates_integrity"], ["SKILL-APPLY-INIT"], 
            ["prism-validator"], ["prism_cache_validate"]),

    # Skill Application
    DevHook("SKILL-APPLY-INIT", "Skill Apply Initialize", "SKILL", "APPLICATION", "INIT",
            "skill:apply:init", "Initializes skill application context",
            50, False, False, [{"name": "skills", "type": "array"}, {"name": "task", "type": "object"}], "ApplicationContext",
            ["creates_execution_plan"], ["SKILL-APPLY-EXECUTE"], 
            ["prism-sp-planning"], []),
    
    DevHook("SKILL-APPLY-EXECUTE", "Skill Apply Execute", "SKILL", "APPLICATION", "EXECUTE",
            "skill:apply:execute", "Executes skill logic for task",
            50, False, False, [{"name": "context", "type": "ApplicationContext"}], "TaskResult",
            ["applies_skill_logic", "logs_execution"], ["SKILL-APPLY-VERIFY"], 
            ["prism-sp-execution"], []),
    
    DevHook("SKILL-APPLY-VERIFY", "Skill Apply Verify", "SKILL", "APPLICATION", "VERIFY",
            "skill:apply:verify", "Verifies skill application results",
            60, False, True, [{"name": "result", "type": "TaskResult"}], "VerificationResult",
            ["validates_output_quality"], ["SKILL-APPLY-LEARN"], 
            ["prism-sp-verification", "prism-quality-master"], ["prism_quality_omega"]),
    
    DevHook("SKILL-APPLY-LEARN", "Skill Apply Learn", "SKILL", "APPLICATION", "LEARN",
            "skill:apply:learn", "Extracts learning patterns from skill application",
            80, True, False, [{"name": "result", "type": "TaskResult"}], "LearningPatterns",
            ["extracts_patterns", "updates_calibration"], [], 
            ["prism-learning-engines", "prism-prediction-engine"], ["prism_error_learn"]),

    # Skill Combination & Synergy
    DevHook("SKILL-COMBO-ANALYZE", "Skill Combination Analyze", "SKILL", "COMBINATION", "ANALYZE",
            "skill:combo:analyze", "Analyzes potential skill combinations",
            30, True, False, [{"name": "skills", "type": "array"}], "CombinationAnalysis",
            ["computes_synergy_scores"], ["SKILL-COMBO-OPTIMIZE"], 
            ["prism-synergy-calculator", "prism-combination-engine"], []),
    
    DevHook("SKILL-COMBO-OPTIMIZE", "Skill Combination Optimize", "SKILL", "COMBINATION", "OPTIMIZE",
            "skill:combo:optimize", "Optimizes skill combination using ILP (F-PSI-001)",
            40, False, False, [{"name": "analysis", "type": "CombinationAnalysis"}], "OptimalCombination",
            ["applies_ILP_solver", "maximizes_synergy"], ["SKILL-COMBO-VALIDATE"], 
            ["prism-combination-engine", "prism-mathematical-optimization"], []),
    
    DevHook("SKILL-COMBO-VALIDATE", "Skill Combination Validate", "SKILL", "COMBINATION", "VALIDATE",
            "skill:combo:validate", "Validates skill combination doesn't exceed context budget",
            10, False, True, [{"name": "combination", "type": "OptimalCombination"}], "ValidationResult",
            ["checks_token_budget", "validates_compatibility"], [], 
            ["prism-context-pressure", "prism-token-density"], ["prism_context_size"]),

    # Skill Utilization Tracking
    DevHook("SKILL-UTIL-TRACK", "Skill Utilization Track", "SKILL", "UTILIZATION", "TRACK",
            "skill:util:track", "Tracks skill utilization across session",
            100, True, False, [{"name": "skillId", "type": "string"}, {"name": "usage", "type": "object"}], "void",
            ["logs_utilization"], ["SKILL-UTIL-REPORT"], 
            ["prism-utilization"], []),
    
    DevHook("SKILL-UTIL-REPORT", "Skill Utilization Report", "SKILL", "UTILIZATION", "REPORT",
            "skill:util:report", "Generates skill utilization report",
            100, True, False, [], "UtilizationReport",
            ["aggregates_metrics"], [], 
            ["prism-utilization"], ["prism_skill_stats"]),
    
    DevHook("SKILL-UTIL-OPTIMIZE", "Skill Utilization Optimize", "SKILL", "UTILIZATION", "OPTIMIZE",
            "skill:util:optimize", "Suggests skill utilization improvements",
            80, True, False, [{"name": "report", "type": "UtilizationReport"}], "OptimizationSuggestions",
            ["analyzes_gaps", "suggests_improvements"], [], 
            ["prism-utilization", "prism-resource-optimizer"], []),
]

# ============================================================================
# DOMAIN 2: AGENT ORCHESTRATION HOOKS
# ============================================================================

AGENT_HOOKS = [
    # Agent Selection
    DevHook("AGENT-SELECT-ANALYZE", "Agent Selection Analyze", "AGENT", "SELECTION", "ANALYZE",
            "agent:select:analyze", "Analyzes task requirements for agent selection",
            20, False, False, [{"name": "task", "type": "object"}], "TaskAnalysis",
            ["determines_complexity", "identifies_skills_needed"], ["AGENT-SELECT-MATCH"], 
            ["prism-agent-selector"], ["prism_agent_list"]),
    
    DevHook("AGENT-SELECT-MATCH", "Agent Selection Match", "AGENT", "SELECTION", "MATCH",
            "agent:select:match", "Matches task to optimal agent tier",
            30, False, False, [{"name": "analysis", "type": "TaskAnalysis"}], "AgentMatch",
            ["scores_agents", "considers_cost"], ["AGENT-SELECT-DECIDE"], 
            ["prism-agent-selector"], ["prism_agent_select"]),
    
    DevHook("AGENT-SELECT-DECIDE", "Agent Selection Decide", "AGENT", "SELECTION", "DECIDE",
            "agent:select:decide", "Decides final agent selection (OPUS/SONNET/HAIKU)",
            40, False, False, [{"name": "match", "type": "AgentMatch"}], "SelectedAgent",
            ["applies_tier_rules"], ["AGENT-SPAWN-INIT"], 
            ["prism-agent-selector"], ["prism_agent_select"]),

    # Agent Spawning
    DevHook("AGENT-SPAWN-INIT", "Agent Spawn Initialize", "AGENT", "SPAWNING", "INIT",
            "agent:spawn:init", "Initializes agent spawn with context injection",
            50, False, False, [{"name": "agent", "type": "SelectedAgent"}, {"name": "context", "type": "object"}], "SpawnConfig",
            ["prepares_context", "sets_personality"], ["AGENT-SPAWN-EXECUTE"], 
            ["prism-swarm-coordinator"], ["prism_agent_spawn"]),
    
    DevHook("AGENT-SPAWN-EXECUTE", "Agent Spawn Execute", "AGENT", "SPAWNING", "EXECUTE",
            "agent:spawn:execute", "Executes agent spawn via API",
            50, False, False, [{"name": "config", "type": "SpawnConfig"}], "SpawnedAgent",
            ["calls_api", "injects_context"], ["AGENT-SPAWN-VERIFY"], 
            ["prism-api-acceleration"], ["prism_agent_spawn"]),
    
    DevHook("AGENT-SPAWN-VERIFY", "Agent Spawn Verify", "AGENT", "SPAWNING", "VERIFY",
            "agent:spawn:verify", "Verifies agent spawned correctly",
            60, False, True, [{"name": "spawned", "type": "SpawnedAgent"}], "VerificationResult",
            ["validates_response", "checks_context_injection"], ["AGENT-TASK-ASSIGN"], 
            ["prism-validator"], ["prism_agent_status"]),

    # Agent Task Management
    DevHook("AGENT-TASK-ASSIGN", "Agent Task Assign", "AGENT", "TASK", "ASSIGN",
            "agent:task:assign", "Assigns task to spawned agent",
            50, False, False, [{"name": "agent", "type": "SpawnedAgent"}, {"name": "task", "type": "object"}], "AssignedTask",
            ["creates_task_prompt", "sets_constraints"], ["AGENT-TASK-MONITOR"], 
            ["prism-swarm-coordinator"], []),
    
    DevHook("AGENT-TASK-MONITOR", "Agent Task Monitor", "AGENT", "TASK", "MONITOR",
            "agent:task:monitor", "Monitors agent task progress",
            80, True, False, [{"name": "task", "type": "AssignedTask"}], "TaskProgress",
            ["tracks_progress", "detects_stuck"], ["AGENT-TASK-INTERVENE"], 
            ["prism-swarm-coordinator"], ["prism_agent_status"]),
    
    DevHook("AGENT-TASK-INTERVENE", "Agent Task Intervene", "AGENT", "TASK", "INTERVENE",
            "agent:task:intervene", "Intervenes if agent is stuck or off-track",
            30, False, False, [{"name": "progress", "type": "TaskProgress"}], "Intervention",
            ["corrects_course", "provides_hints"], ["AGENT-TASK-COMPLETE"], 
            ["prism-swarm-coordinator"], []),
    
    DevHook("AGENT-TASK-COMPLETE", "Agent Task Complete", "AGENT", "TASK", "COMPLETE",
            "agent:task:complete", "Handles agent task completion",
            60, False, False, [{"name": "task", "type": "AssignedTask"}], "TaskResult",
            ["collects_output", "validates_quality"], ["AGENT-RESULT-MERGE"], 
            ["prism-swarm-coordinator", "prism-quality-master"], []),

    # Agent Result Handling
    DevHook("AGENT-RESULT-MERGE", "Agent Result Merge", "AGENT", "RESULT", "MERGE",
            "agent:result:merge", "Merges results from multiple agents",
            70, False, False, [{"name": "results", "type": "array"}], "MergedResult",
            ["resolves_conflicts", "combines_outputs"], ["AGENT-RESULT-VALIDATE"], 
            ["prism-swarm-coordinator"], []),
    
    DevHook("AGENT-RESULT-VALIDATE", "Agent Result Validate", "AGENT", "RESULT", "VALIDATE",
            "agent:result:validate", "Validates merged agent results",
            10, False, True, [{"name": "merged", "type": "MergedResult"}], "ValidationResult",
            ["checks_completeness", "validates_quality"], ["AGENT-RESULT-LEARN"], 
            ["prism-sp-verification", "prism-quality-master"], ["prism_quality_omega"]),
    
    DevHook("AGENT-RESULT-LEARN", "Agent Result Learn", "AGENT", "RESULT", "LEARN",
            "agent:result:learn", "Extracts learning from agent execution",
            90, True, False, [{"name": "result", "type": "MergedResult"}], "AgentLearning",
            ["extracts_patterns", "updates_agent_profiles"], [], 
            ["prism-learning-engines"], ["prism_error_learn"]),
]

# ============================================================================
# DOMAIN 3: SWARM ORCHESTRATION HOOKS
# ============================================================================

SWARM_HOOKS = [
    # Swarm Planning
    DevHook("SWARM-PLAN-DECOMPOSE", "Swarm Plan Decompose", "SWARM", "PLANNING", "DECOMPOSE",
            "swarm:plan:decompose", "Decomposes task into parallelizable subtasks",
            20, False, False, [{"name": "task", "type": "object"}], "TaskDecomposition",
            ["identifies_parallel_opportunities", "maps_dependencies"], ["SWARM-PLAN-ALLOCATE"], 
            ["prism-swarm-extraction", "prism-sp-planning"], ["prism_master_swarm"]),
    
    DevHook("SWARM-PLAN-ALLOCATE", "Swarm Plan Allocate", "SWARM", "PLANNING", "ALLOCATE",
            "swarm:plan:allocate", "Allocates subtasks to agent tiers",
            30, False, False, [{"name": "decomposition", "type": "TaskDecomposition"}], "AllocationPlan",
            ["matches_complexity_to_tier", "optimizes_cost"], ["SWARM-PLAN-SCHEDULE"], 
            ["prism-agent-selector", "prism-swarm-coordinator"], []),
    
    DevHook("SWARM-PLAN-SCHEDULE", "Swarm Plan Schedule", "SWARM", "PLANNING", "SCHEDULE",
            "swarm:plan:schedule", "Schedules swarm execution respecting dependencies",
            40, False, False, [{"name": "allocation", "type": "AllocationPlan"}], "ExecutionSchedule",
            ["topological_sort", "parallel_grouping"], ["SWARM-EXEC-INIT"], 
            ["prism-swarm-coordinator"], []),

    # Swarm Execution
    DevHook("SWARM-EXEC-INIT", "Swarm Execution Initialize", "SWARM", "EXECUTION", "INIT",
            "swarm:exec:init", "Initializes swarm execution environment",
            50, False, False, [{"name": "schedule", "type": "ExecutionSchedule"}], "SwarmContext",
            ["creates_shared_context", "initializes_sync"], ["SWARM-EXEC-WAVE"], 
            ["prism-swarm-coordinator"], ["prism_master_swarm"]),
    
    DevHook("SWARM-EXEC-WAVE", "Swarm Execution Wave", "SWARM", "EXECUTION", "WAVE",
            "swarm:exec:wave", "Executes parallel wave of agents",
            50, False, False, [{"name": "wave", "type": "array"}, {"name": "context", "type": "SwarmContext"}], "WaveResult",
            ["spawns_parallel_agents", "collects_results"], ["SWARM-EXEC-SYNC"], 
            ["prism-swarm-coordinator", "prism-batch-parallel"], ["prism_master_swarm"]),
    
    DevHook("SWARM-EXEC-SYNC", "Swarm Execution Sync", "SWARM", "EXECUTION", "SYNC",
            "swarm:exec:sync", "Synchronizes results between waves",
            60, False, False, [{"name": "waveResult", "type": "WaveResult"}], "SyncedContext",
            ["merges_results", "updates_shared_state"], ["SWARM-EXEC-NEXT"], 
            ["prism-swarm-coordinator"], []),
    
    DevHook("SWARM-EXEC-NEXT", "Swarm Execution Next", "SWARM", "EXECUTION", "NEXT",
            "swarm:exec:next", "Determines next wave or completion",
            70, False, False, [{"name": "context", "type": "SyncedContext"}], "NextAction",
            ["checks_remaining_tasks", "validates_dependencies"], ["SWARM-EXEC-WAVE", "SWARM-RESULT-COLLECT"], 
            ["prism-swarm-coordinator"], []),

    # Swarm Results
    DevHook("SWARM-RESULT-COLLECT", "Swarm Result Collect", "SWARM", "RESULT", "COLLECT",
            "swarm:result:collect", "Collects all swarm results",
            70, False, False, [{"name": "context", "type": "SwarmContext"}], "SwarmResults",
            ["aggregates_all_outputs"], ["SWARM-RESULT-MERGE"], 
            ["prism-swarm-coordinator"], []),
    
    DevHook("SWARM-RESULT-MERGE", "Swarm Result Merge", "SWARM", "RESULT", "MERGE",
            "swarm:result:merge", "Merges swarm results into coherent output",
            80, False, False, [{"name": "results", "type": "SwarmResults"}], "MergedOutput",
            ["resolves_conflicts", "combines_components"], ["SWARM-RESULT-VALIDATE"], 
            ["prism-swarm-coordinator"], []),
    
    DevHook("SWARM-RESULT-VALIDATE", "Swarm Result Validate", "SWARM", "RESULT", "VALIDATE",
            "swarm:result:validate", "Validates complete swarm output",
            10, False, True, [{"name": "output", "type": "MergedOutput"}], "ValidationResult",
            ["checks_completeness", "validates_coherence"], [], 
            ["prism-sp-verification", "prism-quality-master"], ["prism_quality_omega"]),
]

# ============================================================================
# DOMAIN 4: BATCH/PARALLEL PROCESSING HOOKS
# ============================================================================

BATCH_HOOKS = [
    # Batch Detection & Planning
    DevHook("BATCH-DETECT-OPPORTUNITY", "Batch Detect Opportunity", "BATCH", "DETECTION", "OPPORTUNITY",
            "batch:detect:opportunity", "Detects batch processing opportunities",
            20, True, False, [{"name": "operations", "type": "array"}], "BatchOpportunities",
            ["identifies_similar_ops", "computes_batch_benefit"], ["BATCH-PLAN-GROUP"], 
            ["prism-batch-orchestrator"], ["prism_master_batch"]),
    
    DevHook("BATCH-PLAN-GROUP", "Batch Plan Group", "BATCH", "PLANNING", "GROUP",
            "batch:plan:group", "Groups operations into optimal batches",
            30, False, False, [{"name": "opportunities", "type": "BatchOpportunities"}], "BatchGroups",
            ["maximizes_parallelism", "respects_dependencies"], ["BATCH-PLAN-SIZE"], 
            ["prism-batch-orchestrator", "prism-batch-parallel"], []),
    
    DevHook("BATCH-PLAN-SIZE", "Batch Plan Size", "BATCH", "PLANNING", "SIZE",
            "batch:plan:size", "Determines optimal batch sizes",
            40, False, False, [{"name": "groups", "type": "BatchGroups"}], "SizedBatches",
            ["considers_context_limits", "optimizes_throughput"], ["BATCH-EXEC-INIT"], 
            ["prism-batch-orchestrator", "prism-context-pressure"], []),

    # Batch Execution
    DevHook("BATCH-EXEC-INIT", "Batch Execution Initialize", "BATCH", "EXECUTION", "INIT",
            "batch:exec:init", "Initializes batch execution",
            50, False, False, [{"name": "batches", "type": "SizedBatches"}], "BatchContext",
            ["prepares_executor", "allocates_workers"], ["BATCH-EXEC-PROCESS"], 
            ["prism-batch-parallel-engine"], ["prism_master_batch"]),
    
    DevHook("BATCH-EXEC-PROCESS", "Batch Execution Process", "BATCH", "EXECUTION", "PROCESS",
            "batch:exec:process", "Processes batch with parallel execution",
            50, False, False, [{"name": "batch", "type": "object"}, {"name": "context", "type": "BatchContext"}], "BatchResult",
            ["executes_parallel", "tracks_progress"], ["BATCH-EXEC-COLLECT"], 
            ["prism-batch-parallel-engine"], ["prism_batch_execute"]),
    
    DevHook("BATCH-EXEC-COLLECT", "Batch Execution Collect", "BATCH", "EXECUTION", "COLLECT",
            "batch:exec:collect", "Collects batch execution results",
            60, False, False, [{"name": "results", "type": "array"}], "CollectedResults",
            ["aggregates_outputs", "handles_errors"], ["BATCH-RESULT-VALIDATE"], 
            ["prism-batch-orchestrator"], []),

    # Batch Results
    DevHook("BATCH-RESULT-VALIDATE", "Batch Result Validate", "BATCH", "RESULT", "VALIDATE",
            "batch:result:validate", "Validates batch results",
            10, False, True, [{"name": "collected", "type": "CollectedResults"}], "ValidationResult",
            ["checks_all_succeeded", "validates_outputs"], ["BATCH-RESULT-METRICS"], 
            ["prism-validator"], []),
    
    DevHook("BATCH-RESULT-METRICS", "Batch Result Metrics", "BATCH", "RESULT", "METRICS",
            "batch:result:metrics", "Computes batch performance metrics",
            90, True, False, [{"name": "results", "type": "CollectedResults"}], "BatchMetrics",
            ["computes_speedup", "tracks_efficiency"], [], 
            ["prism-batch-orchestrator"], []),
]

# ============================================================================
# DOMAIN 5: CONTEXT WINDOW OPTIMIZATION HOOKS
# ============================================================================

CONTEXT_HOOKS = [
    # Context Monitoring
    DevHook("CONTEXT-MONITOR-SIZE", "Context Monitor Size", "CONTEXT", "MONITORING", "SIZE",
            "context:monitor:size", "Monitors current context window usage",
            100, False, False, [], "ContextSize",
            ["computes_token_count"], ["CONTEXT-MONITOR-PRESSURE"], 
            ["prism-context-pressure"], ["prism_context_size"]),
    
    DevHook("CONTEXT-MONITOR-PRESSURE", "Context Monitor Pressure", "CONTEXT", "MONITORING", "PRESSURE",
            "context:monitor:pressure", "Computes context pressure level",
            100, False, False, [{"name": "size", "type": "ContextSize"}], "PressureLevel",
            ["classifies_green_yellow_orange_red"], ["CONTEXT-MONITOR-ALERT"], 
            ["prism-context-pressure"], ["prism_context_pressure"]),
    
    DevHook("CONTEXT-MONITOR-ALERT", "Context Monitor Alert", "CONTEXT", "MONITORING", "ALERT",
            "context:monitor:alert", "Alerts on context pressure thresholds",
            50, False, False, [{"name": "pressure", "type": "PressureLevel"}], "Alert",
            ["triggers_appropriate_action"], ["CONTEXT-COMPRESS-TRIGGER", "CONTEXT-HANDOFF-TRIGGER"], 
            ["prism-context-pressure", "prism-session-buffer"], []),

    # Context Compression
    DevHook("CONTEXT-COMPRESS-TRIGGER", "Context Compress Trigger", "CONTEXT", "COMPRESSION", "TRIGGER",
            "context:compress:trigger", "Triggers context compression at ORANGE level (75-85%)",
            30, False, False, [{"name": "pressure", "type": "PressureLevel"}], "CompressionDecision",
            ["decides_compression_strategy"], ["CONTEXT-COMPRESS-EXECUTE"], 
            ["prism-context-pressure"], ["prism_context_compress"]),
    
    DevHook("CONTEXT-COMPRESS-EXECUTE", "Context Compress Execute", "CONTEXT", "COMPRESSION", "EXECUTE",
            "context:compress:execute", "Executes context compression",
            20, False, False, [{"name": "decision", "type": "CompressionDecision"}], "CompressedContext",
            ["compresses_non_essential", "preserves_critical"], ["CONTEXT-COMPRESS-VERIFY"], 
            ["prism-context-dna"], ["prism_context_compress"]),
    
    DevHook("CONTEXT-COMPRESS-VERIFY", "Context Compress Verify", "CONTEXT", "COMPRESSION", "VERIFY",
            "context:compress:verify", "Verifies compression preserved critical info",
            10, False, True, [{"name": "compressed", "type": "CompressedContext"}], "VerificationResult",
            ["validates_critical_preserved"], [], 
            ["prism-context-dna"], []),

    # Context Handoff
    DevHook("CONTEXT-HANDOFF-TRIGGER", "Context Handoff Trigger", "CONTEXT", "HANDOFF", "TRIGGER",
            "context:handoff:trigger", "Triggers handoff at RED level (85-92%)",
            10, False, True, [{"name": "pressure", "type": "PressureLevel"}], "HandoffDecision",
            ["prepares_handoff"], ["CONTEXT-HANDOFF-PREPARE"], 
            ["prism-session-handoff", "prism-sp-handoff"], ["prism_handoff_prepare"]),
    
    DevHook("CONTEXT-HANDOFF-PREPARE", "Context Handoff Prepare", "CONTEXT", "HANDOFF", "PREPARE",
            "context:handoff:prepare", "Prepares context for next session",
            10, False, False, [{"name": "decision", "type": "HandoffDecision"}], "HandoffPackage",
            ["captures_state", "creates_quick_resume"], ["CONTEXT-HANDOFF-SAVE"], 
            ["prism-sp-handoff", "prism-state-manager"], ["prism_handoff_prepare"]),
    
    DevHook("CONTEXT-HANDOFF-SAVE", "Context Handoff Save", "CONTEXT", "HANDOFF", "SAVE",
            "context:handoff:save", "Saves handoff state to persistent storage",
            10, False, True, [{"name": "package", "type": "HandoffPackage"}], "SaveResult",
            ["writes_state_file", "updates_roadmap"], [], 
            ["prism-state-manager"], ["prism_state_checkpoint"]),

    # KV-Cache Optimization
    DevHook("KVCACHE-OPTIMIZE-ANALYZE", "KV-Cache Optimize Analyze", "CONTEXT", "KVCACHE", "ANALYZE",
            "kvcache:optimize:analyze", "Analyzes KV-cache optimization opportunities",
            80, True, False, [{"name": "context", "type": "object"}], "CacheAnalysis",
            ["identifies_reusable_prefixes"], ["KVCACHE-OPTIMIZE-ORDER"], 
            ["prism-kv-cache-optimizer"], []),
    
    DevHook("KVCACHE-OPTIMIZE-ORDER", "KV-Cache Optimize Order", "CONTEXT", "KVCACHE", "ORDER",
            "kvcache:optimize:order", "Optimizes content order for cache reuse",
            70, True, False, [{"name": "analysis", "type": "CacheAnalysis"}], "OptimizedOrder",
            ["reorders_for_cache_hits"], ["KVCACHE-OPTIMIZE-APPLY"], 
            ["prism-kv-cache-optimizer"], []),
    
    DevHook("KVCACHE-OPTIMIZE-APPLY", "KV-Cache Optimize Apply", "CONTEXT", "KVCACHE", "APPLY",
            "kvcache:optimize:apply", "Applies KV-cache optimizations",
            60, True, False, [{"name": "order", "type": "OptimizedOrder"}], "AppliedOptimization",
            ["reorders_content", "maximizes_cache_hits"], [], 
            ["prism-kv-cache-optimizer"], []),
]

# ============================================================================
# DOMAIN 6: TOKEN USAGE OPTIMIZATION HOOKS
# ============================================================================

TOKEN_HOOKS = [
    # Token Budget Management
    DevHook("TOKEN-BUDGET-INIT", "Token Budget Initialize", "TOKEN", "BUDGET", "INIT",
            "token:budget:init", "Initializes token budget for task",
            20, False, False, [{"name": "task", "type": "object"}, {"name": "available", "type": "int"}], "TokenBudget",
            ["allocates_budget"], ["TOKEN-BUDGET-TRACK"], 
            ["prism-token-density"], []),
    
    DevHook("TOKEN-BUDGET-TRACK", "Token Budget Track", "TOKEN", "BUDGET", "TRACK",
            "token:budget:track", "Tracks token consumption",
            100, False, False, [{"name": "consumed", "type": "int"}], "BudgetStatus",
            ["updates_remaining", "logs_usage"], ["TOKEN-BUDGET-ALERT"], 
            ["prism-token-density"], []),
    
    DevHook("TOKEN-BUDGET-ALERT", "Token Budget Alert", "TOKEN", "BUDGET", "ALERT",
            "token:budget:alert", "Alerts on budget thresholds",
            50, False, False, [{"name": "status", "type": "BudgetStatus"}], "BudgetAlert",
            ["triggers_optimization"], ["TOKEN-OPTIMIZE-DENSITY"], 
            ["prism-token-density"], []),

    # Token Density Optimization
    DevHook("TOKEN-OPTIMIZE-DENSITY", "Token Optimize Density", "TOKEN", "OPTIMIZATION", "DENSITY",
            "token:optimize:density", "Optimizes information density per token",
            60, True, False, [{"name": "content", "type": "string"}], "DenseContent",
            ["removes_redundancy", "compresses_representation"], ["TOKEN-OPTIMIZE-VERIFY"], 
            ["prism-token-density", "prism-comprehensive-output"], []),
    
    DevHook("TOKEN-OPTIMIZE-VERIFY", "Token Optimize Verify", "TOKEN", "OPTIMIZATION", "VERIFY",
            "token:optimize:verify", "Verifies optimization preserved meaning",
            10, False, True, [{"name": "dense", "type": "DenseContent"}], "VerificationResult",
            ["validates_semantic_preservation"], [], 
            ["prism-token-density"], []),

    # API Cost Optimization
    DevHook("API-COST-ESTIMATE", "API Cost Estimate", "TOKEN", "API_COST", "ESTIMATE",
            "api:cost:estimate", "Estimates API cost for operation",
            90, True, False, [{"name": "tokens", "type": "int"}, {"name": "model", "type": "string"}], "CostEstimate",
            ["computes_cost"], ["API-COST-OPTIMIZE"], 
            ["prism-api-acceleration"], []),
    
    DevHook("API-COST-OPTIMIZE", "API Cost Optimize", "TOKEN", "API_COST", "OPTIMIZE",
            "api:cost:optimize", "Optimizes for API cost reduction",
            70, True, False, [{"name": "estimate", "type": "CostEstimate"}], "OptimizationPlan",
            ["suggests_model_selection", "batch_opportunities"], [], 
            ["prism-api-acceleration", "prism-agent-selector"], []),
]

# ============================================================================
# DOMAIN 7: LOOP & ITERATION HOOKS
# ============================================================================

LOOP_HOOKS = [
    # Ralph Loop (Iterative Refinement)
    DevHook("RALPH-INIT", "Ralph Loop Initialize", "LOOP", "RALPH", "INIT",
            "ralph:init", "Initializes Ralph iterative refinement loop",
            30, False, False, [{"name": "task", "type": "object"}, {"name": "maxIterations", "type": "int"}], "RalphContext",
            ["sets_convergence_criteria"], ["RALPH-ITERATE"], 
            ["prism-self-reflection"], []),
    
    DevHook("RALPH-ITERATE", "Ralph Loop Iterate", "LOOP", "RALPH", "ITERATE",
            "ralph:iterate", "Executes single Ralph iteration",
            50, False, False, [{"name": "context", "type": "RalphContext"}, {"name": "iteration", "type": "int"}], "IterationResult",
            ["generates_output", "self_critiques"], ["RALPH-EVALUATE"], 
            ["prism-self-reflection", "prism-review"], []),
    
    DevHook("RALPH-EVALUATE", "Ralph Loop Evaluate", "LOOP", "RALPH", "EVALUATE",
            "ralph:evaluate", "Evaluates iteration against criteria",
            60, False, False, [{"name": "result", "type": "IterationResult"}], "EvaluationResult",
            ["scores_quality", "checks_convergence"], ["RALPH-DECIDE"], 
            ["prism-quality-master", "prism-master-equation"], ["prism_quality_omega"]),
    
    DevHook("RALPH-DECIDE", "Ralph Loop Decide", "LOOP", "RALPH", "DECIDE",
            "ralph:decide", "Decides continue or converge",
            70, False, False, [{"name": "evaluation", "type": "EvaluationResult"}], "LoopDecision",
            ["applies_convergence_criteria"], ["RALPH-ITERATE", "RALPH-COMPLETE"], 
            ["prism-self-reflection"], []),
    
    DevHook("RALPH-COMPLETE", "Ralph Loop Complete", "LOOP", "RALPH", "COMPLETE",
            "ralph:complete", "Completes Ralph loop with final output",
            80, False, False, [{"name": "context", "type": "RalphContext"}], "FinalOutput",
            ["selects_best_iteration", "documents_improvements"], [], 
            ["prism-self-reflection", "prism-learning-engines"], []),

    # Generate-Scrutinize-Validate Loop
    DevHook("GSV-GENERATE", "GSV Generate", "LOOP", "GSV", "GENERATE",
            "gsv:generate", "Generates initial output",
            40, False, False, [{"name": "task", "type": "object"}], "GeneratedOutput",
            ["creates_initial_output"], ["GSV-SCRUTINIZE"], 
            ["prism-comprehensive-output"], []),
    
    DevHook("GSV-SCRUTINIZE", "GSV Scrutinize", "LOOP", "GSV", "SCRUTINIZE",
            "gsv:scrutinize", "Scrutinizes generated output",
            50, False, False, [{"name": "output", "type": "GeneratedOutput"}], "ScrutinyResult",
            ["identifies_issues", "suggests_improvements"], ["GSV-VALIDATE"], 
            ["prism-review", "prism-self-reflection"], []),
    
    DevHook("GSV-VALIDATE", "GSV Validate", "LOOP", "GSV", "VALIDATE",
            "gsv:validate", "Validates scrutinized output",
            10, False, True, [{"name": "scrutiny", "type": "ScrutinyResult"}], "ValidationResult",
            ["applies_quality_gates", "checks_completeness"], ["GSV-ITERATE", "GSV-COMPLETE"], 
            ["prism-sp-verification", "prism-quality-master"], ["prism_quality_omega", "prism_quality_safety"]),
    
    DevHook("GSV-ITERATE", "GSV Iterate", "LOOP", "GSV", "ITERATE",
            "gsv:iterate", "Iterates with improvements",
            60, False, False, [{"name": "validation", "type": "ValidationResult"}], "ImprovedOutput",
            ["applies_improvements", "regenerates"], ["GSV-SCRUTINIZE"], 
            ["prism-comprehensive-output"], []),
    
    DevHook("GSV-COMPLETE", "GSV Complete", "LOOP", "GSV", "COMPLETE",
            "gsv:complete", "Completes GSV loop",
            80, False, False, [{"name": "validation", "type": "ValidationResult"}], "FinalOutput",
            ["finalizes_output"], [], 
            ["prism-comprehensive-output", "prism-maximum-completeness"], []),
]

# ============================================================================
# DOMAIN 8: SUPERPOWER HOOKS (OBRA, BRAINSTORMING)
# ============================================================================

SUPERPOWER_HOOKS = [
    # OBRA (Observation-Based Reasoning Approach)
    DevHook("OBRA-OBSERVE", "OBRA Observe", "SUPERPOWER", "OBRA", "OBSERVE",
            "obra:observe", "Observes and gathers all relevant information",
            20, False, False, [{"name": "context", "type": "object"}], "Observations",
            ["gathers_facts", "identifies_constraints"], ["OBRA-REASON"], 
            ["prism-cognitive-core", "prism-reasoning-engine"], []),
    
    DevHook("OBRA-REASON", "OBRA Reason", "SUPERPOWER", "OBRA", "REASON",
            "obra:reason", "Applies structured reasoning to observations",
            40, False, False, [{"name": "observations", "type": "Observations"}], "ReasoningResult",
            ["applies_bayesian_inference", "causal_analysis"], ["OBRA-SYNTHESIZE"], 
            ["prism-reasoning-engine", "prism-causal-reasoning", "prism-ai-bayesian"], []),
    
    DevHook("OBRA-SYNTHESIZE", "OBRA Synthesize", "SUPERPOWER", "OBRA", "SYNTHESIZE",
            "obra:synthesize", "Synthesizes reasoning into actionable insights",
            60, False, False, [{"name": "reasoning", "type": "ReasoningResult"}], "Synthesis",
            ["integrates_insights", "generates_recommendations"], ["OBRA-ACT"], 
            ["prism-reasoning-engine", "prism-predictive-thinking"], []),
    
    DevHook("OBRA-ACT", "OBRA Act", "SUPERPOWER", "OBRA", "ACT",
            "obra:act", "Takes action based on synthesis",
            70, False, False, [{"name": "synthesis", "type": "Synthesis"}], "ActionResult",
            ["executes_recommendations"], [], 
            ["prism-sp-execution"], []),

    # Brainstorming
    DevHook("BRAINSTORM-INIT", "Brainstorm Initialize", "SUPERPOWER", "BRAINSTORM", "INIT",
            "brainstorm:init", "Initializes brainstorming session",
            20, False, False, [{"name": "problem", "type": "object"}], "BrainstormContext",
            ["defines_problem_space", "sets_divergent_mode"], ["BRAINSTORM-DIVERGE"], 
            ["prism-sp-brainstorm"], []),
    
    DevHook("BRAINSTORM-DIVERGE", "Brainstorm Diverge", "SUPERPOWER", "BRAINSTORM", "DIVERGE",
            "brainstorm:diverge", "Generates diverse ideas without judgment",
            40, True, False, [{"name": "context", "type": "BrainstormContext"}], "IdeaSet",
            ["generates_many_ideas", "suspends_criticism"], ["BRAINSTORM-EXPAND"], 
            ["prism-sp-brainstorm"], []),
    
    DevHook("BRAINSTORM-EXPAND", "Brainstorm Expand", "SUPERPOWER", "BRAINSTORM", "EXPAND",
            "brainstorm:expand", "Expands ideas with cross-domain fusion",
            50, True, False, [{"name": "ideas", "type": "IdeaSet"}], "ExpandedIdeas",
            ["applies_cross_domain_fusion", "combines_ideas"], ["BRAINSTORM-CONVERGE"], 
            ["prism-sp-brainstorm", "prism-combination-engine"], []),
    
    DevHook("BRAINSTORM-CONVERGE", "Brainstorm Converge", "SUPERPOWER", "BRAINSTORM", "CONVERGE",
            "brainstorm:converge", "Converges on best ideas",
            60, False, False, [{"name": "expanded", "type": "ExpandedIdeas"}], "SelectedIdeas",
            ["evaluates_feasibility", "ranks_by_impact"], ["BRAINSTORM-REFINE"], 
            ["prism-sp-brainstorm", "prism-branch-predictor"], []),
    
    DevHook("BRAINSTORM-REFINE", "Brainstorm Refine", "SUPERPOWER", "BRAINSTORM", "REFINE",
            "brainstorm:refine", "Refines selected ideas",
            70, False, False, [{"name": "selected", "type": "SelectedIdeas"}], "RefinedIdeas",
            ["develops_details", "identifies_risks"], ["BRAINSTORM-DECIDE"], 
            ["prism-sp-brainstorm", "prism-predictive-thinking"], []),
    
    DevHook("BRAINSTORM-DECIDE", "Brainstorm Decide", "SUPERPOWER", "BRAINSTORM", "DECIDE",
            "brainstorm:decide", "Makes final decision with chunked approval",
            80, False, True, [{"name": "refined", "type": "RefinedIdeas"}], "Decision",
            ["presents_for_approval", "awaits_confirmation"], [], 
            ["prism-sp-brainstorm"], []),

    # 7-Lens Optimization
    DevHook("SEVENLENS-CHALLENGE", "Seven Lens Challenge", "SUPERPOWER", "SEVENLENS", "CHALLENGE",
            "sevenlens:challenge", "Challenges assumptions",
            30, True, False, [{"name": "solution", "type": "object"}], "ChallengedAssumptions",
            ["questions_every_assumption"], ["SEVENLENS-MULTIPLY"], 
            ["prism-cognitive-core"], []),
    
    DevHook("SEVENLENS-MULTIPLY", "Seven Lens Multiply", "SUPERPOWER", "SEVENLENS", "MULTIPLY",
            "sevenlens:multiply", "Multiplies alternatives",
            40, True, False, [{"name": "challenged", "type": "ChallengedAssumptions"}], "Alternatives",
            ["generates_3x_alternatives"], ["SEVENLENS-INVERT"], 
            ["prism-cognitive-core", "prism-sp-brainstorm"], []),
    
    DevHook("SEVENLENS-INVERT", "Seven Lens Invert", "SUPERPOWER", "SEVENLENS", "INVERT",
            "sevenlens:invert", "Inverts problem perspective",
            50, True, False, [{"name": "alternatives", "type": "Alternatives"}], "InvertedPerspectives",
            ["views_from_opposite"], ["SEVENLENS-FUSE"], 
            ["prism-cognitive-core"], []),
    
    DevHook("SEVENLENS-FUSE", "Seven Lens Fuse", "SUPERPOWER", "SEVENLENS", "FUSE",
            "sevenlens:fuse", "Fuses cross-domain knowledge",
            60, True, False, [{"name": "inverted", "type": "InvertedPerspectives"}], "FusedSolutions",
            ["applies_cross_domain_fusion"], ["SEVENLENS-TENX"], 
            ["prism-cognitive-core", "prism-combination-engine"], []),
    
    DevHook("SEVENLENS-TENX", "Seven Lens 10X", "SUPERPOWER", "SEVENLENS", "TENX",
            "sevenlens:tenx", "Asks how to 10X improve",
            70, True, False, [{"name": "fused", "type": "FusedSolutions"}], "TenXSolutions",
            ["identifies_10x_opportunities"], ["SEVENLENS-SIMPLIFY"], 
            ["prism-cognitive-core"], []),
    
    DevHook("SEVENLENS-SIMPLIFY", "Seven Lens Simplify", "SUPERPOWER", "SEVENLENS", "SIMPLIFY",
            "sevenlens:simplify", "Simplifies to essence",
            80, True, False, [{"name": "tenx", "type": "TenXSolutions"}], "SimplifiedSolutions",
            ["removes_complexity"], ["SEVENLENS-FUTUREPROOF"], 
            ["prism-cognitive-core"], []),
    
    DevHook("SEVENLENS-FUTUREPROOF", "Seven Lens Future-proof", "SUPERPOWER", "SEVENLENS", "FUTUREPROOF",
            "sevenlens:futureproof", "Future-proofs solution",
            90, True, False, [{"name": "simplified", "type": "SimplifiedSolutions"}], "FinalSolution",
            ["considers_evolution", "plans_extensibility"], [], 
            ["prism-cognitive-core", "prism-predictive-thinking"], []),
]

# ============================================================================
# DOMAIN 9: RESOURCE MANAGEMENT & SYNERGY HOOKS
# ============================================================================

RESOURCE_HOOKS = [
    # Resource Discovery
    DevHook("RESOURCE-DISCOVER-ALL", "Resource Discover All", "RESOURCE", "DISCOVERY", "ALL",
            "resource:discover:all", "Discovers all available resources",
            20, False, False, [], "ResourceInventory",
            ["scans_skills_agents_formulas_hooks"], ["RESOURCE-ANALYZE-RELEVANCE"], 
            ["prism-resource-optimizer", "prism-skill-orchestrator"], ["prism_resources_summary"]),
    
    DevHook("RESOURCE-ANALYZE-RELEVANCE", "Resource Analyze Relevance", "RESOURCE", "ANALYSIS", "RELEVANCE",
            "resource:analyze:relevance", "Analyzes resource relevance to task",
            30, False, False, [{"name": "inventory", "type": "ResourceInventory"}, {"name": "task", "type": "object"}], "RelevanceScores",
            ["scores_each_resource"], ["RESOURCE-COMPUTE-SYNERGY"], 
            ["prism-resource-optimizer", "prism-synergy-calculator"], ["prism_relevance_score"]),

    # Synergy Computation
    DevHook("RESOURCE-COMPUTE-SYNERGY", "Resource Compute Synergy", "RESOURCE", "SYNERGY", "COMPUTE",
            "resource:compute:synergy", "Computes synergy between resources",
            40, False, False, [{"name": "scores", "type": "RelevanceScores"}], "SynergyMatrix",
            ["applies_synergy_matrix"], ["RESOURCE-OPTIMIZE-COMBINATION"], 
            ["prism-synergy-calculator", "prism-combination-engine"], []),
    
    DevHook("RESOURCE-OPTIMIZE-COMBINATION", "Resource Optimize Combination", "RESOURCE", "OPTIMIZATION", "COMBINATION",
            "resource:optimize:combination", "Optimizes resource combination using ILP",
            50, False, False, [{"name": "synergy", "type": "SynergyMatrix"}], "OptimalCombination",
            ["applies_F-PSI-001_ILP", "maximizes_value"], ["RESOURCE-VALIDATE-BUDGET"], 
            ["prism-combination-engine", "prism-mathematical-optimization"], []),
    
    DevHook("RESOURCE-VALIDATE-BUDGET", "Resource Validate Budget", "RESOURCE", "VALIDATION", "BUDGET",
            "resource:validate:budget", "Validates combination fits context budget",
            10, False, True, [{"name": "combination", "type": "OptimalCombination"}], "ValidationResult",
            ["checks_token_limit", "validates_feasibility"], ["RESOURCE-LOAD-EXECUTE"], 
            ["prism-context-pressure", "prism-token-density"], ["prism_context_size"]),

    # Resource Loading
    DevHook("RESOURCE-LOAD-EXECUTE", "Resource Load Execute", "RESOURCE", "LOADING", "EXECUTE",
            "resource:load:execute", "Loads optimal resource combination",
            60, False, False, [{"name": "combination", "type": "OptimalCombination"}], "LoadedResources",
            ["loads_in_optimal_order", "caches_prefixes"], [], 
            ["prism-kv-cache-optimizer", "prism-resource-optimizer"], []),

    # Utilization Tracking
    DevHook("RESOURCE-UTIL-TRACK", "Resource Utilization Track", "RESOURCE", "UTILIZATION", "TRACK",
            "resource:util:track", "Tracks resource utilization",
            100, True, False, [{"name": "resource", "type": "object"}, {"name": "usage", "type": "object"}], "void",
            ["logs_usage", "updates_metrics"], ["RESOURCE-UTIL-ENFORCE"], 
            ["prism-utilization"], []),
    
    DevHook("RESOURCE-UTIL-ENFORCE", "Resource Utilization Enforce", "RESOURCE", "UTILIZATION", "ENFORCE",
            "resource:util:enforce", "Enforces 100% utilization rule",
            0, False, True, [{"name": "resources", "type": "array"}], "EnforcementResult",
            ["checks_all_used", "blocks_if_orphaned"], [], 
            ["prism-utilization"], []),
]

# ============================================================================
# DOMAIN 10: MANUS INTEGRATION HOOKS
# ============================================================================

MANUS_HOOKS = [
    # Manus Task Creation
    DevHook("MANUS-TASK-ANALYZE", "Manus Task Analyze", "MANUS", "TASK", "ANALYZE",
            "manus:task:analyze", "Analyzes if task is suitable for Manus delegation",
            20, True, False, [{"name": "task", "type": "object"}], "ManusAnalysis",
            ["checks_autonomous_suitability", "estimates_complexity"], ["MANUS-TASK-CREATE"], 
            [], []),
    
    DevHook("MANUS-TASK-CREATE", "Manus Task Create", "MANUS", "TASK", "CREATE",
            "manus:task:create", "Creates task in Manus",
            40, False, False, [{"name": "analysis", "type": "ManusAnalysis"}, {"name": "prompt", "type": "string"}], "ManusTask",
            ["creates_manus_task", "sets_mode"], ["MANUS-TASK-MONITOR"], 
            [], []),
    
    DevHook("MANUS-TASK-MONITOR", "Manus Task Monitor", "MANUS", "TASK", "MONITOR",
            "manus:task:monitor", "Monitors Manus task progress",
            80, True, False, [{"name": "task", "type": "ManusTask"}], "TaskProgress",
            ["polls_status", "tracks_progress"], ["MANUS-TASK-COMPLETE"], 
            [], []),
    
    DevHook("MANUS-TASK-COMPLETE", "Manus Task Complete", "MANUS", "TASK", "COMPLETE",
            "manus:task:complete", "Handles Manus task completion",
            70, False, False, [{"name": "task", "type": "ManusTask"}], "ManusResult",
            ["retrieves_output", "validates_result"], [], 
            [], []),

    # Manus Web Capabilities
    DevHook("MANUS-WEB-SEARCH", "Manus Web Search", "MANUS", "WEB", "SEARCH",
            "manus:web:search", "Delegates web search to Manus",
            50, True, False, [{"name": "query", "type": "string"}], "SearchResults",
            ["google_search_delegation"], [], 
            [], []),
    
    DevHook("MANUS-WEB-BROWSE", "Manus Web Browse", "MANUS", "WEB", "BROWSE",
            "manus:web:browse", "Delegates web browsing to Manus",
            50, True, False, [{"name": "url", "type": "string"}, {"name": "action", "type": "string"}], "BrowseResult",
            ["navigates_page", "extracts_content"], [], 
            [], []),

    # Manus Code Execution
    DevHook("MANUS-CODE-EXECUTE", "Manus Code Execute", "MANUS", "CODE", "EXECUTE",
            "manus:code:execute", "Delegates code execution to Manus sandbox",
            30, False, False, [{"name": "code", "type": "string"}, {"name": "language", "type": "string"}], "ExecutionResult",
            ["runs_in_sandbox", "captures_output"], [], 
            [], []),
    
    DevHook("MANUS-BASH-EXECUTE", "Manus Bash Execute", "MANUS", "BASH", "EXECUTE",
            "manus:bash:execute", "Delegates bash commands to Manus",
            30, False, False, [{"name": "command", "type": "string"}], "BashResult",
            ["executes_bash", "captures_output"], [], 
            [], []),

    # Manus Workflow Orchestration
    DevHook("MANUS-WORKFLOW-CREATE", "Manus Workflow Create", "MANUS", "WORKFLOW", "CREATE",
            "manus:workflow:create", "Creates multi-step workflow in Manus",
            40, False, False, [{"name": "steps", "type": "array"}], "ManusWorkflow",
            ["creates_workflow", "sets_connectors"], ["MANUS-WORKFLOW-EXECUTE"], 
            [], []),
    
    DevHook("MANUS-WORKFLOW-EXECUTE", "Manus Workflow Execute", "MANUS", "WORKFLOW", "EXECUTE",
            "manus:workflow:execute", "Executes Manus workflow",
            50, False, False, [{"name": "workflow", "type": "ManusWorkflow"}], "WorkflowResult",
            ["executes_steps", "handles_errors"], [], 
            [], []),
]

# ============================================================================
# DOMAIN 11: CHECKPOINT & STATE MANAGEMENT HOOKS
# ============================================================================

CHECKPOINT_HOOKS = [
    # Checkpoint Creation
    DevHook("CHECKPOINT-TRIGGER-AUTO", "Checkpoint Trigger Auto", "CHECKPOINT", "TRIGGER", "AUTO",
            "checkpoint:trigger:auto", "Auto-triggers checkpoint every 5-8 operations",
            80, False, False, [{"name": "operationCount", "type": "int"}], "CheckpointDecision",
            ["checks_op_count", "decides_checkpoint"], ["CHECKPOINT-CREATE"], 
            ["prism-session-buffer"], ["prism_master_checkpoint"]),
    
    DevHook("CHECKPOINT-CREATE", "Checkpoint Create", "CHECKPOINT", "CREATE", "EXECUTE",
            "checkpoint:create", "Creates checkpoint with full state",
            50, False, False, [{"name": "state", "type": "object"}], "Checkpoint",
            ["captures_state", "writes_to_file"], ["CHECKPOINT-VERIFY"], 
            ["prism-state-manager"], ["prism_checkpoint_create", "prism_state_checkpoint"]),
    
    DevHook("CHECKPOINT-VERIFY", "Checkpoint Verify", "CHECKPOINT", "CREATE", "VERIFY",
            "checkpoint:verify", "Verifies checkpoint integrity",
            10, False, True, [{"name": "checkpoint", "type": "Checkpoint"}], "VerificationResult",
            ["validates_completeness", "checks_readability"], [], 
            ["prism-validator"], ["prism_cache_validate"]),

    # Checkpoint Restoration
    DevHook("CHECKPOINT-RESTORE-FIND", "Checkpoint Restore Find", "CHECKPOINT", "RESTORE", "FIND",
            "checkpoint:restore:find", "Finds latest valid checkpoint",
            30, False, False, [], "FoundCheckpoint",
            ["scans_checkpoints", "validates_integrity"], ["CHECKPOINT-RESTORE-LOAD"], 
            ["prism-state-manager"], ["prism_checkpoint_restore"]),
    
    DevHook("CHECKPOINT-RESTORE-LOAD", "Checkpoint Restore Load", "CHECKPOINT", "RESTORE", "LOAD",
            "checkpoint:restore:load", "Loads checkpoint state",
            50, False, False, [{"name": "checkpoint", "type": "FoundCheckpoint"}], "RestoredState",
            ["loads_state", "rebuilds_context"], ["CHECKPOINT-RESTORE-VERIFY"], 
            ["prism-state-manager"], ["prism_state_restore"]),
    
    DevHook("CHECKPOINT-RESTORE-VERIFY", "Checkpoint Restore Verify", "CHECKPOINT", "RESTORE", "VERIFY",
            "checkpoint:restore:verify", "Verifies restoration success",
            10, False, True, [{"name": "restored", "type": "RestoredState"}], "VerificationResult",
            ["validates_state", "checks_consistency"], [], 
            ["prism-validator"], []),

    # State Management
    DevHook("STATE-UPDATE", "State Update", "CHECKPOINT", "STATE", "UPDATE",
            "state:update", "Updates CURRENT_STATE.json",
            60, False, False, [{"name": "updates", "type": "object"}], "UpdatedState",
            ["merges_updates", "writes_file"], ["STATE-VALIDATE"], 
            ["prism-state-manager"], ["prism_state_update"]),
    
    DevHook("STATE-VALIDATE", "State Validate", "CHECKPOINT", "STATE", "VALIDATE",
            "state:validate", "Validates state file integrity",
            10, False, True, [{"name": "state", "type": "UpdatedState"}], "ValidationResult",
            ["checks_schema", "validates_consistency"], [], 
            ["prism-validator"], []),
]

# ============================================================================
# AGGREGATION & OUTPUT
# ============================================================================

ALL_DEV_HOOKS = (
    SKILL_HOOKS + 
    AGENT_HOOKS + 
    SWARM_HOOKS + 
    BATCH_HOOKS + 
    CONTEXT_HOOKS + 
    TOKEN_HOOKS + 
    LOOP_HOOKS + 
    SUPERPOWER_HOOKS + 
    RESOURCE_HOOKS + 
    MANUS_HOOKS + 
    CHECKPOINT_HOOKS
)

def generate_hook_registry():
    """Generates the complete development hook registry"""
    registry = {
        "version": "1.0.0",
        "generated": datetime.now().isoformat(),
        "description": "PRISM Development Hooks - Focus on development capabilities only",
        "statistics": {
            "total_hooks": len(ALL_DEV_HOOKS),
            "domains": {
                "SKILL": len(SKILL_HOOKS),
                "AGENT": len(AGENT_HOOKS),
                "SWARM": len(SWARM_HOOKS),
                "BATCH": len(BATCH_HOOKS),
                "CONTEXT": len(CONTEXT_HOOKS),
                "TOKEN": len(TOKEN_HOOKS),
                "LOOP": len(LOOP_HOOKS),
                "SUPERPOWER": len(SUPERPOWER_HOOKS),
                "RESOURCE": len(RESOURCE_HOOKS),
                "MANUS": len(MANUS_HOOKS),
                "CHECKPOINT": len(CHECKPOINT_HOOKS),
            },
            "blocking_hooks": len([h for h in ALL_DEV_HOOKS if h.isBlocking]),
            "disableable_hooks": len([h for h in ALL_DEV_HOOKS if h.canDisable]),
        },
        "hooks": [asdict(h) for h in ALL_DEV_HOOKS]
    }
    return registry

def main():
    registry = generate_hook_registry()
    
    # Write to file
    output_path = Path(r"C:\PRISM\data\DEVELOPMENT_HOOKS_REGISTRY.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    
    print(f"Generated {registry['statistics']['total_hooks']} development hooks")
    print(f"Output: {output_path}")
    print("\nDomain breakdown:")
    for domain, count in registry['statistics']['domains'].items():
        print(f"  {domain}: {count} hooks")
    print(f"\nBlocking hooks: {registry['statistics']['blocking_hooks']}")
    print(f"Disableable hooks: {registry['statistics']['disableable_hooks']}")

if __name__ == "__main__":
    main()
