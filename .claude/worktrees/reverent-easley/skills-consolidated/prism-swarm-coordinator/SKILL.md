---
name: prism-swarm-coordinator
version: "2.0"
level: 1
category: cognitive
description: |
  Multi-agent swarm orchestration using F-SWARM-001 efficiency formula.
  Coordinates parallel agent execution, workload distribution, result aggregation.
  Use when: Complex tasks requiring multiple specialized agents.
  Provides: Swarm patterns, load balancing, conflict resolution, quality verification.
  Key principle: Maximize synergy, minimize coordination overhead.
dependencies:
  - prism-combination-engine
  - prism-agent-selector
  - prism-synergy-calculator
consumers:
  - prism-unified-orchestrator
hooks:
  - swarm:preStart
  - swarm:progress
  - swarm:synthesize
  - swarm:complete
safety_critical: true
---

# PRISM-SWARM-COORDINATOR
## Optimal Multi-Agent Swarm Orchestration | Level 1 Cognitive
### Version 2.0 | F-SWARM-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
Coordinates multi-agent swarm execution for optimal parallel task completion. Selects appropriate swarm patterns, distributes workload, and aggregates results while minimizing coordination overhead.

### When to Use
- Task requires multiple agents working in parallel
- Combination Engine (F-PSI-001) selected swarm execution mode
- Complex tasks benefiting from agent specialization

### Safety Considerations
⚠️ **LIFE-SAFETY**: Swarm outputs affect manufacturing decisions.
- ALL safety-critical outputs require validation_swarm pattern
- physics_validator must be included for any physics calculations
- Conflict resolution escalates safety-related conflicts to OPUS tier
- Never merge conflicting safety data without human review

### Prerequisites
- Optimal combination R* from prism-combination-engine
- Agent pool with defined capabilities
- SYNERGY_MATRIX for agent interaction effects

---

## SECTION 2: SWARM PATTERNS

### Available Patterns (8)
| Pattern | Agents | Best For | Safety Level |
|---------|--------|----------|--------------|
| deep_extraction_swarm | 8 | Complex monolith extraction | Standard |
| architecture_swarm | 5 | System design tasks | Standard |
| code_quality_swarm | 5 | Code review and testing | High |
| materials_enhancement_swarm | 6 | Material data enhancement | **Critical** |
| documentation_swarm | 3 | Documentation generation | Standard |
| validation_swarm | 4 | Multi-level validation | **Critical** |
| intelligent_swarm | auto | Auto-selected based on task | Varies |
| research_swarm | 6 | Research and analysis | Standard |

### Pattern Selection Algorithm
```python
def select_swarm_pattern(task, available_agents):
    """Select optimal swarm pattern for task."""
    
    # Safety-critical tasks require validation
    if task.safety_score > 0.7:
        return "validation_swarm"
    
    # Domain-specific patterns
    if task.complexity > 0.85 and "extraction" in task.operations:
        return "deep_extraction_swarm"
    elif "design" in task.taskType or "architecture" in task.operations:
        return "architecture_swarm"
    elif task.domains.intersection({"code", "testing", "quality"}):
        return "code_quality_swarm"
    elif "materials" in task.domains:
        return "materials_enhancement_swarm"
    elif "documentation" in task.operations:
        return "documentation_swarm"
    elif "validation" in task.operations:
        return "validation_swarm"
    else:
        return "intelligent_swarm"  # Auto-select
```

### Pattern Configurations
```python
SWARM_PATTERNS = {
    "deep_extraction_swarm": {
        "agents": ["architect", "extractor", "validator", "coder", 
                   "analyst", "test_generator", "documentation_writer", "quality_gate"],
        "min_agents": 6,
        "max_agents": 8,
        "requires_opus": True,
        "coordination_overhead": 0.12
    },
    "validation_swarm": {
        "agents": ["physics_validator", "quality_engineer", 
                   "verification_chain", "completeness_auditor"],
        "min_agents": 3,
        "max_agents": 4,
        "requires_opus": True,
        "coordination_overhead": 0.08,
        "safety_critical": True
    },
    "intelligent_swarm": {
        "agents": "auto",  # Selected by F-AGENT-001
        "min_agents": 2,
        "max_agents": 8,
        "requires_opus": "if_complex",
        "coordination_overhead": 0.10
    }
}
```

---

## SECTION 3: SWARM EFFICIENCY (F-SWARM-001)

### Formula
```
SwarmEff(A) = [Σᵢ Output(aᵢ)] / [|A| × AvgSingleOutput] × (1 - (|A|-1) × k_coord)

Where:
  Output(aᵢ) = quality × completeness of agent i's output
  |A| = number of agents in swarm
  AvgSingleOutput = baseline single-agent output
  k_coord = coordination overhead coefficient (K-COORD-001 = 0.05)
```

### Interpretation
| SwarmEff | Meaning | Action |
|----------|---------|--------|
| < 0.8 | Poor - overhead dominates | Reduce swarm size |
| 0.8-1.0 | Marginal - no synergy benefit | Consider single agent |
| 1.0-1.2 | Good - positive synergy | Optimal zone |
| > 1.2 | Excellent - strong synergy | Capture pattern for reuse |

### Efficiency Optimization
```python
def optimize_swarm_efficiency(agents, task):
    """Iteratively optimize swarm composition."""
    
    current_agents = list(agents)
    best_efficiency = calculate_swarm_efficiency(current_agents, task)
    
    # Try removing low-synergy agents
    for agent in agents:
        test_agents = [a for a in current_agents if a != agent]
        if len(test_agents) >= SWARM_PATTERNS[task.pattern]["min_agents"]:
            eff = calculate_swarm_efficiency(test_agents, task)
            if eff > best_efficiency:
                current_agents = test_agents
                best_efficiency = eff
    
    return current_agents, best_efficiency
```

---

## SECTION 4: WORKLOAD DISTRIBUTION

### Strategy
```python
def distribute_workload(task, agents):
    """Distribute task across agents based on capabilities."""
    
    subtasks = decompose_task(task)
    assignments = {agent: [] for agent in agents}
    
    for subtask in subtasks:
        # Find best-fit agent
        scores = [(a, compute_capability(a, subtask)) for a in agents]
        scores.sort(key=lambda x: x[1], reverse=True)
        
        # Assign to best agent with capacity
        for agent, score in scores:
            if len(assignments[agent]) < max_tasks_per_agent(agent):
                assignments[agent].append(subtask)
                break
    
    # Rebalance if needed
    assignments = rebalance_workload(assignments)
    
    return assignments
```

### Load Balancing Rules
1. No agent should have >40% of total work
2. Each agent should have work matching their top capabilities
3. Dependencies between subtasks respected in assignment
4. Safety-critical subtasks assigned to validated agents only

### Dependency Handling
```python
def order_by_dependencies(subtasks, assignments):
    """Order execution respecting dependencies."""
    
    execution_order = []
    completed = set()
    
    while len(execution_order) < len(subtasks):
        for subtask in subtasks:
            if subtask in completed:
                continue
            
            # Check dependencies satisfied
            deps_satisfied = all(d in completed for d in subtask.dependencies)
            if deps_satisfied:
                execution_order.append(subtask)
                completed.add(subtask)
    
    return execution_order
```

---

## SECTION 5: RESULT AGGREGATION

### Aggregation Pipeline
```python
async def aggregate_results(agent_outputs, task):
    """Full aggregation pipeline with safety checks."""
    
    # 1. Collect
    collected = await collect_all_outputs(agent_outputs)
    
    # 2. Validate
    validation_result = cross_validate(collected)
    if not validation_result.valid:
        await handle_validation_failure(validation_result)
    
    # 3. Detect conflicts
    conflicts = detect_conflicts(collected)
    
    # 4. Resolve conflicts
    if conflicts:
        resolved = await resolve_conflicts(conflicts, task.safety_score)
    else:
        resolved = collected
    
    # 5. Merge
    merged = merge_outputs(resolved)
    
    # 6. Quality check
    quality = compute_output_quality(merged)
    if quality < task.quality_threshold:
        raise QualityThresholdError(quality, task.quality_threshold)
    
    return merged
```

### Conflict Resolution
```python
def resolve_conflicts(conflicts, safety_score):
    """Resolve conflicts with safety-aware escalation."""
    
    resolved = []
    
    for conflict in conflicts:
        if conflict.involves_safety_data and safety_score > 0.5:
            # Safety-critical: escalate to human review
            resolution = escalate_to_human(conflict)
        elif conflict.type == "value_mismatch":
            # Use majority vote
            resolution = majority_vote(conflict.values)
        elif conflict.type == "format_mismatch":
            # Normalize and merge
            resolution = normalize_and_merge(conflict.values)
        elif conflict.type == "critical":
            # Escalate to OPUS agent
            resolution = await escalate_to_opus(conflict)
        else:
            # Default: use highest-confidence value
            resolution = max(conflict.values, key=lambda v: v.confidence)
        
        resolved.append(resolution)
    
    return resolved
```

---

## SECTION 6: ERROR HANDLING

### Error Types
| Error | Cause | Recovery |
|-------|-------|----------|
| AGENT_TIMEOUT | Agent exceeds time limit | Reassign to backup, continue |
| AGENT_FAILURE | Agent crashes | Restart or skip with warning |
| CONFLICT_UNRESOLVED | Cannot resolve conflict | Escalate to human |
| QUALITY_BELOW_THRESHOLD | Merged output low quality | Re-run with different agents |
| COORDINATION_OVERLOAD | Too much overhead | Reduce swarm size |

### Error Recovery
```python
async def handle_agent_failure(agent, error, task):
    """Handle agent failure with graceful degradation."""
    
    log_error(f"Agent {agent.id} failed: {error}")
    
    # Check if critical
    if agent.role in ["physics_validator", "safety_checker"]:
        # Cannot continue without safety validation
        raise SafetyCriticalAgentFailure(agent, error)
    
    # Find backup agent
    backup = find_backup_agent(agent, available_agents)
    
    if backup:
        # Reassign work to backup
        reassign_workload(agent, backup)
        return {"action": "reassigned", "backup": backup.id}
    else:
        # Continue without this agent
        return {"action": "skipped", "warning": f"No backup for {agent.id}"}
```

---

## SECTION 7: EXAMPLES

### Example 1: Materials Enhancement Swarm
```python
task = Task(
    name="Enhance steel materials database",
    domains=["materials", "physics"],
    operations=["extract", "validate", "enhance"],
    complexity=0.75,
    safety_score=0.8
)

# Execute swarm
coordinator = SwarmCoordinator(pattern="materials_enhancement_swarm")
result = await coordinator.execute(task)

# Result
# {
#   "pattern": "materials_enhancement_swarm",
#   "agents_used": 6,
#   "swarm_efficiency": 1.35,
#   "outputs_merged": 150,
#   "conflicts_resolved": 3,
#   "quality_score": 0.92,
#   "execution_time": "4m 23s"
# }
```

### Example 2: Validation Swarm for Safety-Critical
```python
task = Task(
    name="Validate cutting force calculations",
    domains=["physics", "manufacturing"],
    operations=["validate", "verify", "certify"],
    complexity=0.65,
    safety_score=0.95  # High safety requirement
)

# Auto-selects validation_swarm due to safety_score
coordinator = SwarmCoordinator.from_task(task)
result = await coordinator.execute(task)

# All physics outputs cross-validated by multiple agents
assert result.validation_consensus >= 0.95
```

---

## SECTION 8: INTEGRATION

### With Combination Engine
```python
# Receives optimal agent set from F-PSI-001
optimal_agents = combination_engine.get_agents(R_star)
swarm = SwarmCoordinator(optimal_agents)
await swarm.execute(task)
```

### With Orchestrator v6
```powershell
# Swarm execution via command line
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm deep_extraction_swarm "Extract module"

# Intelligent swarm (auto-selected pattern)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Complex task"
```

### Hooks Integration
```python
# Hooks fire during swarm lifecycle
await executeHooks("swarm:preStart", {"agents": agents, "pattern": pattern})
# ... execution ...
await executeHooks("swarm:progress", {"iteration": i, "progress": pct})
# ... completion ...
await executeHooks("swarm:synthesize", {"outputs": outputs})
await executeHooks("swarm:complete", {"result": result})
```

---

## SECTION 9: QUICK REFERENCE

### Checklist
- [ ] Optimal agents received from Combination Engine
- [ ] Swarm pattern selected (auto or manual)
- [ ] Safety requirements checked
- [ ] Workload distributed
- [ ] Agents executed in parallel
- [ ] Results aggregated
- [ ] Conflicts resolved
- [ ] Quality verified (Ω ≥ threshold)

### Key Metrics
| Metric | Target | Critical |
|--------|--------|----------|
| SwarmEff | > 1.2 | > 1.0 |
| Coordination overhead | < 15% | < 25% |
| Conflict rate | < 5% | < 15% |
| Parallel efficiency | > 80% | > 60% |
| Safety validation | 100% | 100% |

---

**Version:** 2.0 | **Date:** 2026-01-29 | **Level:** 1 (Cognitive)
**Enhanced:** YAML frontmatter, safety integration, error handling, examples, hooks
