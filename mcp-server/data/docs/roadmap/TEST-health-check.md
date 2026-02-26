# TEST-health-check — Dispatcher Health Check System
## Version: 1.0.0
## Created: 2026-02-25
## Brief: Add a dispatcher health-check endpoint that reports status of all 32 dispatchers, their action counts, last-call timestamps, and error rates. Include a /health route on the Protocol Bridge and a prism_health dispatcher.

---

## Deliverables Inventory
| # | Path | Type | Unit |
|---|------|------|------|
| 1 | mcp-server/src/dispatchers/healthDispatcher.ts | source | P1-U01 |
| 2 | mcp-server/src/engines/HealthMonitorEngine.ts | source | P1-U02 |
| 3 | mcp-server/src/hooks/health-check-cadence.ts | hook | P1-U03 |
| 4 | skills-consolidated/prism-health-monitor/SKILL.md | skill | P2-U01 |
| 5 | skills-consolidated/prism-health-monitor/metadata.json | config | P2-U01 |
| 6 | mcp-server/src/__tests__/health-dispatcher.test.ts | test | P2-U02 |
| 7 | mcp-server/data/docs/HEALTH_CHECK_SPEC.md | doc | P2-U03 |
| 8 | mcp-server/src/routes/health.ts | source | P3-U01 |
| 9 | mcp-server/data/docs/MASTER_INDEX.md (modified) | doc | P3-U02 |
| 10 | .claude/commands/health-check.md | command | P3-U03 |

## Role Matrix
| Code | Name | Model | Units |
|------|------|-------|-------|
| R1 | Schema Architect | opus-4.6 | 1 |
| R2 | Implementer | sonnet-4.6 | 5 |
| R3 | Test Writer | sonnet-4.6 | 1 |
| R6 | Integrator | sonnet-4.6 | 2 |
| R8 | Documenter | haiku-4.5 | 1 |

## Tool Map
| Tool | Action | Units |
|------|--------|-------|
| prism_dev | build, file_write, file_read | P1-U01, P1-U02, P1-U03, P3-U01 |
| prism_hook | execute, list | P1-U03 |
| prism_skill_script | skill_content | P2-U01 |
| prism_validate | safety, anti_regression | P2-U02, P3-U02 |
| prism_bridge | register_endpoint, health | P3-U01 |

## Dependency Graph
```
P1-U01 (dispatcher) --> P1-U02 (engine) --> P1-U03 (hook)
                                              |
P2-U01 (skill) <-- P1-U02                    |
P2-U02 (tests) <-- P1-U01, P1-U02            v
P2-U03 (docs)  <-- P1-U01, P1-U02       P3-U01 (route)
                                          P3-U02 (index)
                                          P3-U03 (command)
```

## Scrutiny Config
```json
{
  "min_passes": 3,
  "max_passes": 7,
  "convergence_delta": 2,
  "escalation_round": 4,
  "approval_threshold": 0.92
}
```

---

## Phase 1: Core Implementation
**Sessions:** 1-2 | **Primary Role:** R2 Implementer | **Primary Model:** sonnet-4.6

### P1-U01: Create Health Dispatcher
- **Role:** R1 Schema Architect | **Model:** opus-4.6 | **Effort:** 90
- **Steps:**
  1. Design HealthDispatcher with actions: status, detail, history, reset, config (tool_calls: [prism_dev:file_write], validation: "File compiles")
  2. Register dispatcher in dispatcherRegistry (tool_calls: [prism_dev:file_read, prism_dev:file_write], validation: "Registry includes prism_health")
  3. Wire to allDispatchers barrel export (tool_calls: [prism_dev:build], validation: "Build passes")
- **Entry conditions:** ["R0-P4 COMPLETE", "Build passes before starting"]
- **Exit conditions:** ["healthDispatcher.ts exists", "Registered in dispatcherRegistry", "Build passes", "Exports 5 actions"]
- **Deliverables:** [{ path: "mcp-server/src/dispatchers/healthDispatcher.ts", type: "source", description: "Health check dispatcher with 5 actions" }]
- **Dependencies:** []
- **Rollback:** "git checkout -- mcp-server/src/dispatchers/healthDispatcher.ts"
- **Tools:** [{ tool: "prism_dev", action: "file_write" }, { tool: "prism_dev", action: "build" }]
- **creates_skill:** false | **creates_script:** false | **creates_hook:** false | **creates_command:** false

### P1-U02: Create Health Monitor Engine
- **Role:** R2 Implementer | **Model:** sonnet-4.6 | **Effort:** 80
- **Steps:**
  1. Create HealthMonitorEngine that tracks per-dispatcher: call count, last-call timestamp, error count, error rate (tool_calls: [prism_dev:file_write], validation: "File compiles")
  2. Wire to engine barrel export (tool_calls: [prism_dev:build], validation: "Build passes")
- **Entry conditions:** ["P1-U01 complete", "healthDispatcher.ts exists"]
- **Exit conditions:** ["HealthMonitorEngine.ts exists", "Build passes", "Tracks all 32 dispatchers"]
- **Deliverables:** [{ path: "mcp-server/src/engines/HealthMonitorEngine.ts", type: "source", description: "Per-dispatcher health tracking engine" }]
- **Dependencies:** ["P1-U01"]
- **Rollback:** "git checkout -- mcp-server/src/engines/HealthMonitorEngine.ts"
- **Tools:** [{ tool: "prism_dev", action: "file_write" }, { tool: "prism_dev", action: "build" }]
- **creates_skill:** false | **creates_script:** false | **creates_hook:** false | **creates_command:** false

### P1-U03: Create Health Check Cadence Hook
- **Role:** R2 Implementer | **Model:** sonnet-4.6 | **Effort:** 75
- **Steps:**
  1. Create hook that fires on cadence (every 100 calls) to snapshot health state (tool_calls: [prism_dev:file_write, prism_hook:execute], validation: "Hook fires on cadence")
  2. Register in hookRegistry (tool_calls: [prism_dev:file_read, prism_dev:file_write], validation: "Hook appears in list")
- **Entry conditions:** ["P1-U02 complete", "HealthMonitorEngine.ts exists"]
- **Exit conditions:** ["health-check-cadence.ts exists", "Registered in hookRegistry", "Build passes"]
- **Deliverables:** [{ path: "mcp-server/src/hooks/health-check-cadence.ts", type: "hook", description: "Cadence-triggered health snapshot hook" }]
- **Dependencies:** ["P1-U02"]
- **Rollback:** "git checkout -- mcp-server/src/hooks/health-check-cadence.ts"
- **Tools:** [{ tool: "prism_dev", action: "file_write" }, { tool: "prism_hook", action: "execute" }]
- **creates_skill:** false | **creates_script:** false | **creates_hook:** true | **creates_command:** false

### Phase 1 Gate
- **omega_floor:** 0.75 | **safety_floor:** 0.70
- **test_required:** true | **build_required:** true
- **anti_regression:** true | **checkpoint:** true

---

## Phase 2: Quality & Documentation
**Sessions:** 1 | **Primary Role:** R2 Implementer | **Primary Model:** sonnet-4.6

### P2-U01: Create Health Monitor Skill
- **Role:** R2 Implementer | **Model:** sonnet-4.6 | **Effort:** 75
- **Steps:**
  1. Create SKILL.md with usage guide, trigger keywords, action reference (tool_calls: [prism_dev:file_write], validation: "SKILL.md has all sections")
  2. Create metadata.json with triggers and dependencies (tool_calls: [prism_dev:file_write], validation: "JSON valid")
- **Entry conditions:** ["P1-U02 complete"]
- **Exit conditions:** ["SKILL.md exists", "metadata.json exists", "Triggers include 'health check', 'dispatcher status'"]
- **Deliverables:** [{ path: "skills-consolidated/prism-health-monitor/SKILL.md", type: "skill", description: "Health monitor skill reference" }, { path: "skills-consolidated/prism-health-monitor/metadata.json", type: "config", description: "Skill metadata" }]
- **Dependencies:** ["P1-U02"]
- **Rollback:** "rm -rf skills-consolidated/prism-health-monitor/"
- **Tools:** [{ tool: "prism_skill_script", action: "skill_content" }]
- **creates_skill:** true | **creates_script:** false | **creates_hook:** false | **creates_command:** false

### P2-U02: Write Test Suite
- **Role:** R3 Test Writer | **Model:** sonnet-4.6 | **Effort:** 80
- **Steps:**
  1. Write vitest suite covering: dispatcher registration, action routing, health state tracking, error rate calculation (tool_calls: [prism_dev:file_write], validation: "Tests compile")
  2. Run tests (tool_calls: [prism_dev:test_smoke], validation: "All tests pass")
- **Entry conditions:** ["P1-U01 complete", "P1-U02 complete"]
- **Exit conditions:** ["Test file exists", "8+ tests pass", "No regression in baseline"]
- **Deliverables:** [{ path: "mcp-server/src/__tests__/health-dispatcher.test.ts", type: "test", description: "Health dispatcher test suite" }]
- **Dependencies:** ["P1-U01", "P1-U02"]
- **Rollback:** "git checkout -- mcp-server/src/__tests__/health-dispatcher.test.ts"
- **Tools:** [{ tool: "prism_validate", action: "anti_regression" }]
- **creates_skill:** false | **creates_script:** false | **creates_hook:** false | **creates_command:** false

### P2-U03: Write Health Check Specification
- **Role:** R8 Documenter | **Model:** haiku-4.5 | **Effort:** 60
- **Steps:**
  1. Document the health check system: API contract, response format, metrics tracked, cadence settings (tool_calls: [prism_dev:file_write], validation: "Doc covers all 5 actions")
- **Entry conditions:** ["P1-U01 complete", "P1-U02 complete"]
- **Exit conditions:** ["HEALTH_CHECK_SPEC.md exists", "Covers all 5 dispatcher actions"]
- **Deliverables:** [{ path: "mcp-server/data/docs/HEALTH_CHECK_SPEC.md", type: "doc", description: "Health check system specification" }]
- **Dependencies:** ["P1-U01", "P1-U02"]
- **Rollback:** "git checkout -- mcp-server/data/docs/HEALTH_CHECK_SPEC.md"
- **Tools:** []
- **creates_skill:** false | **creates_script:** false | **creates_hook:** false | **creates_command:** false

### Phase 2 Gate
- **omega_floor:** 0.85 | **safety_floor:** 0.70
- **test_required:** true | **build_required:** true
- **anti_regression:** true | **checkpoint:** true

---

## Phase 3: Integration & Wiring
**Sessions:** 1 | **Primary Role:** R6 Integrator | **Primary Model:** sonnet-4.6

### P3-U01: Create /health Route on Protocol Bridge
- **Role:** R2 Implementer | **Model:** sonnet-4.6 | **Effort:** 80
- **Steps:**
  1. Create express route handler at /health that calls healthDispatcher.status (tool_calls: [prism_dev:file_write, prism_bridge:register_endpoint], validation: "Route responds 200")
  2. Wire route into bridge router (tool_calls: [prism_dev:build], validation: "Build passes")
- **Entry conditions:** ["P1-U03 complete", "All P2 units complete"]
- **Exit conditions:** ["/health route responds 200", "Returns dispatcher status array", "Build passes"]
- **Deliverables:** [{ path: "mcp-server/src/routes/health.ts", type: "source", description: "Health check HTTP route" }]
- **Dependencies:** ["P1-U03", "P2-U02"]
- **Rollback:** "git checkout -- mcp-server/src/routes/health.ts"
- **Tools:** [{ tool: "prism_bridge", action: "register_endpoint" }, { tool: "prism_dev", action: "build" }]
- **creates_skill:** false | **creates_script:** false | **creates_hook:** false | **creates_command:** false

### P3-U02: Register in MASTER_INDEX.md
- **Role:** R6 Integrator | **Model:** sonnet-4.6 | **Effort:** 70
- **Steps:**
  1. Add prism_health dispatcher entry to MASTER_INDEX.md section 1 (tool_calls: [prism_dev:file_read, prism_dev:file_write], validation: "Entry appears in index")
  2. Add /health route to decision tree section 2 (tool_calls: [prism_dev:file_write], validation: "Route listed")
  3. Add health workflow to sequencing guides section 3 (tool_calls: [prism_dev:file_write], validation: "Workflow listed")
- **Entry conditions:** ["P3-U01 complete"]
- **Exit conditions:** ["prism_health listed in dispatchers", "Health workflow in guides", "Build passes"]
- **Deliverables:** [{ path: "mcp-server/data/docs/MASTER_INDEX.md", type: "doc", description: "Index updated with health dispatcher" }]
- **Dependencies:** ["P3-U01"]
- **Rollback:** "git checkout -- mcp-server/data/docs/MASTER_INDEX.md"
- **Tools:** [{ tool: "prism_validate", action: "anti_regression" }]
- **creates_skill:** false | **creates_script:** false | **creates_hook:** false | **creates_command:** false

### P3-U03: Create /health-check Slash Command
- **Role:** R6 Integrator | **Model:** sonnet-4.6 | **Effort:** 70
- **Steps:**
  1. Create slash command that loads health skill and displays status (tool_calls: [prism_dev:file_write], validation: "Command file exists")
- **Entry conditions:** ["P2-U01 complete", "P3-U01 complete"]
- **Exit conditions:** ["health-check.md exists", "References prism_health dispatcher", "Loads health-monitor skill"]
- **Deliverables:** [{ path: ".claude/commands/health-check.md", type: "command", description: "Health check slash command" }]
- **Dependencies:** ["P2-U01", "P3-U01"]
- **Rollback:** "git checkout -- .claude/commands/health-check.md"
- **Tools:** []
- **creates_skill:** false | **creates_script:** false | **creates_hook:** false | **creates_command:** true

### Phase 3 Gate
- **omega_floor:** 1.0 | **safety_floor:** 0.70
- **test_required:** true | **build_required:** true
- **anti_regression:** true | **checkpoint:** true | **learning_save:** true
