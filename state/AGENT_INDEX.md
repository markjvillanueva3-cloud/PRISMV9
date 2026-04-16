# PRISM AGENT INDEX v1.0
## 75 Agents | 658 Capabilities | 3 Tiers

---
## 📊 TIER BREAKDOWN
| Tier | Model | Use Case | Count |
|------|-------|----------|-------|
| OPUS | claude-opus-4 | Complex reasoning, architecture, safety-critical | 9 |
| SONNET | claude-sonnet-4 | General dev, extraction, coding | 17 |
| HAIKU | claude-haiku-4 | Quick validations, formatting | 2 |
| CORE | claude-sonnet-4 | Domain experts, coordination | 9 |
| UNDEFINED | - | Need configuration | 40 |

---
## 🔥 CORE AGENTS (Always Available)

### Domain Experts
| Agent | ID | Capabilities |
|-------|----|--------------| 
| Materials Expert | AGT-EXPERT-MATERIALS | material_selection, property_analysis, machinability |
| Machine Expert | AGT-EXPERT-MACHINES | machine_selection, capability_analysis, setup_optimization |
| Tooling Expert | AGT-EXPERT-TOOLING | tool_selection, tool_life_prediction, wear_analysis |

### Coordination
| Agent | ID | Capabilities |
|-------|----|--------------| 
| Orchestrator | AGT-COORD-ORCHESTRATOR | route_task, coordinate_workflow, aggregate_results |
| Validator | AGT-COORD-VALIDATOR | validate_output, check_consistency, verify_safety |

### Cognitive
| Agent | ID | Capabilities |
|-------|----|--------------| 
| Reasoning | AGT-COG-REASONING | analyze_problem, generate_hypotheses, evaluate_options |
| Learning | AGT-COG-LEARNING | learn_from_outcome, update_model, suggest_improvement |

### Task Agents
| Agent | ID | Capabilities |
|-------|----|--------------| 
| Speed & Feed | AGT-TASK-SPEED-FEED | calculate_speed_feed, optimize_parameters |
| Alarm Decoder | AGT-TASK-ALARM-DECODE | decode_alarm, suggest_fix, find_related |

---
## 🎯 BY CATEGORY
- **domain_expert**: 3 agents
- **task_agent**: 28 agents
- **coordination**: 1 agent
- **validation**: 1 agent
- **cognitive**: 2 agents
- **undefined**: 40 agents (need setup)

---
## 🚀 USAGE PATTERNS

### Single Agent Invocation
```
prism:prism_agent_invoke(agent_id="AGT-EXPERT-MATERIALS", task="Select material for aerospace bracket")
```

### Swarm Execution
```
prism:prism_agent_swarm(
  agents=["AGT-EXPERT-MATERIALS", "AGT-EXPERT-TOOLING", "AGT-TASK-SPEED-FEED"],
  pattern="EXPERT_ENSEMBLE",
  tasks=[{id:"optimize", description:"Optimize machining parameters"}]
)
```

### Task Routing
```
prism:agent_find_for_task(task_type="material_selection")
→ Returns: AGT-EXPERT-MATERIALS (confidence: 0.95)
```

---
## 📈 STATISTICS
- **Total Agents:** 75
- **Active & Enabled:** 35 (46.7%)
- **Total Capabilities:** 658
- **Average Confidence:** 0.85-0.98

---
Generated: 2026-02-04 Session 30 | P0-002 Complete
