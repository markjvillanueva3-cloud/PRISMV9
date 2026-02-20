Orchestrated Pre-R2 setup tasks with optimized model allocation strategy
Orchestrated Pre-R2 setup tasks with optimized model allocation strategy





Desktop Commander icon
Desktop Commander
read_file



Recovered. We completed Roadmap v17.0 (2009 lines, committed + pushed). Next: Pre-R2 Setup — create subagent files, hook scripts, test dirs, enable agent teams.

Let me also update the model matrix to include Sonnet 4.5/4.6 properly. Executing now across multiple roles:


Reconciled model versions and strategized optimal subagent configuration approach
Reconciled model versions and strategized optimal subagent configuration approach








Now creating all 3 subagent .md files:


Architected safety enforcement scripts for system integration
Architected safety enforcement scripts for system integration






Now the 5 hook scripts:


Orchestrated environment variables and permissions for experimental infrastructure
Orchestrated environment variables and permissions for experimental infrastructure











Now update .claude/settings.json to enable agent teams:


Hunted for Model & Effort Routing Matrix section to update
Hunted for Model & Effort Routing Matrix section to update






Desktop Commander icon
Desktop Commander
read_file



Now update roadmap model matrix to reflect actual model versions:


Prepared to update progress documentation and resume operations
Prepared to update progress documentation and resume operations











Desktop Commander icon
Desktop Commander
read_file



Desktop Commander icon
Desktop Commander
read_file



Desktop Commander icon
Desktop Commander
read_file



Now update position with completed setup items:


Deliberated hooks configuration placement and session structure
Deliberated hooks configuration placement and session structure







Now wire the hooks into settings.json properly (the scripts exist but need to be registered):


Orchestrated deployment and verification of indexed documentation systems
Orchestrated deployment and verification of indexed documentation systems


Desktop Commander icon
Desktop Commander
read_file



Now commit everything and push:


Used Desktop Commander integration
Used Desktop Commander integration
D


Start Terminal Process
Request

{
  "command": "cd C:\\PRISM\\mcp-server && git add -A && git status --short",
  "timeout_ms": 5000
}
Response

Process started with PID 1876 (shell: powershell.exe)
Initial output:
At line:1 char:24
+ cd C:\PRISM\mcp-server && git add -A && git status --short
+                        ~~
The token '&&' is not a valid statement separator in this version.
At line:1 char:38
+ cd C:\PRISM\mcp-server && git add -A && git status --short
+                                      ~~
The token '&&' is not a valid statement separator in this version.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : InvalidEndOfLine
 
PowerShell doesn't support &&. Use semicolons.

D


Start Terminal Process
Request

{
  "command": "cd C:\\PRISM\\mcp-server; git add -A; git status --short",
  "timeout_ms": 5000
}
Response

Process started with PID 24464 (shell: powershell.exe)
Initial output:
warning: in the working copy of 'mcp-server/.claude/settings.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mcp-server/data/docs/roadmap/CURRENT_POSITION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mcp-server/data/docs/roadmap/PRISM_ROADMAP_v17.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mcp-server/state/telemetry/telemetry_snapshot.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/CAPABILITIES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/agents.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/agents/store.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/config.yaml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/daemon-state.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/hive-mind/state.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/metrics/codebase-map.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/metrics/consolidation.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/metrics/learning.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/metrics/performance.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/metrics/security-audit.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/metrics/swarm-activity.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/metrics/test-gaps.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/metrics/v3-progress.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/security/audit-status.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude-flow/tasks/store.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/analysis/analyze-code-quality.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/analysis/code-analyzer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/analysis/code-review/analyze-code-quality.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/architecture/system-design/arch-system-design.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/consensus/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/consensus/byzantine-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/consensus/crdt-synchronizer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/consensus/gossip-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/consensus/performance-benchmarker.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/consensus/quorum-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/consensus/raft-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/consensus/security-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/core/coder.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/core/planner.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/core/researcher.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/core/reviewer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/core/tester.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/custom/test-long-runner.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/data/ml/data-ml-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/development/backend/dev-backend-api.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/development/dev-backend-api.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/devops/ci-cd/ops-cicd-github.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/documentation/api-docs/docs-api-openapi.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/app-store.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/authentication.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/challenges.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/neural-network.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/payments.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/sandbox.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/user-tools.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/flow-nexus/workflow.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/code-review-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/github-modes.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/issue-tracker.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/multi-repo-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/pr-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/project-board-sync.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/release-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/release-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/repo-architect.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/swarm-issue.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/swarm-pr.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/sync-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/github/workflow-automation.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/goal/agent.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/goal/code-goal-planner.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/goal/goal-planner.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/hive-mind/collective-intelligence-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/hive-mind/queen-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/hive-mind/scout-explorer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/hive-mind/swarm-memory-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/hive-mind/worker-specialist.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/optimization/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/optimization/benchmark-suite.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/optimization/load-balancer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/optimization/performance-monitor.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/optimization/resource-allocator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/optimization/topology-optimizer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/payments/agentic-payments.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sona/sona-learning-optimizer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sparc/architecture.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sparc/pseudocode.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sparc/refinement.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sparc/specification.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/specialized/mobile/spec-mobile-react-native.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sublinear/consensus-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sublinear/matrix-optimizer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sublinear/pagerank-analyzer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sublinear/performance-optimizer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/sublinear/trading-predictor.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/swarm/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/swarm/adaptive-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/swarm/hierarchical-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/swarm/mesh-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/automation-smart-agent.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/coordinator-swarm-init.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/github-pr-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/implementer-sparc-coder.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/memory-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/migration-plan.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/orchestrator-task.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/performance-analyzer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/templates/sparc-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/testing/production-validator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/testing/tdd-london-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/testing/unit/tdd-london-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/testing/validation/production-validator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/database-specialist.yaml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/index.yaml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/project-coordinator.yaml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/python-specialist.yaml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/test-architect.yaml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/typescript-specialist.yaml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/v3-integration-architect.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/v3-memory-specialist.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/v3-performance-engineer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/v3-queen-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/agents/v3/v3-security-architect.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/analysis/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/analysis/bottleneck-detect.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/analysis/performance-bottlenecks.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/analysis/performance-report.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/analysis/token-efficiency.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/analysis/token-usage.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/automation/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/automation/auto-agent.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/automation/self-healing.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/automation/session-memory.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/automation/smart-agents.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/automation/smart-spawn.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/automation/workflow-select.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/claude-flow-help.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/claude-flow-memory.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/claude-flow-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/code-review-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/code-review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/github-modes.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/github-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/issue-tracker.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/issue-triage.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/multi-repo-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/pr-enhance.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/pr-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/project-board-sync.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/release-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/release-swarm.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/repo-analyze.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/repo-architect.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/swarm-issue.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/swarm-pr.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/sync-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/github/workflow-automation.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/hooks/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/hooks/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/hooks/post-edit.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/hooks/post-task.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/hooks/pre-edit.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/hooks/pre-task.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/hooks/session-end.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/hooks/setup.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/monitoring/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/monitoring/agent-metrics.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/monitoring/agents.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/monitoring/real-time-view.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/monitoring/status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/monitoring/swarm-monitor.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/optimization/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/optimization/auto-topology.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/optimization/cache-manage.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/optimization/parallel-execute.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/optimization/parallel-execution.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/optimization/topology-optimize.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/analyzer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/architect.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/ask.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/batch-executor.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/code.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/coder.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/debug.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/debugger.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/designer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/devops.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/docs-writer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/documenter.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/innovator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/integration.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/mcp.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/memory-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/optimizer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/orchestrator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/post-deployment-monitoring-mode.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/refinement-optimization-mode.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/researcher.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/reviewer.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/security-review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/sparc-modes.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/sparc.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/spec-pseudocode.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/supabase-admin.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/swarm-coordinator.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/tdd.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/tester.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/tutorial.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/commands/sparc/workflow-manager.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/adr-compliance.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/auto-commit.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/checkpoint-manager.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/daemon-manager.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/ddd-tracker.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/github-safe.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/github-setup.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/guidance-hook.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/guidance-hooks.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/health-monitor.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/learning-hooks.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/learning-optimizer.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/learning-service.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/metrics-db.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/pattern-consolidator.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/perf-worker.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/quick-start.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/security-scanner.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/setup-mcp.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/standard-checkpoint-hooks.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/statusline-hook.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/statusline.cjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/swarm-comms.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/swarm-hooks.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/swarm-monitor.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/sync-v3-metrics.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/update-v3-progress.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/v3-quick-status.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/v3.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/validate-v3-config.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/helpers/worker-manager.sh', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/settings.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/agentdb-advanced/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/agentdb-learning/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/agentdb-memory-patterns/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/agentdb-optimization/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/agentdb-vector-search/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/github-code-review/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/github-multi-repo/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/github-project-management/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/github-release-management/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/github-workflow-automation/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/hooks-automation/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/pair-programming/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/reasoningbank-agentdb/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/reasoningbank-intelligence/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/skill-builder/.claude-flow/metrics/performance.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/skill-builder/.claude-flow/metrics/task-metrics.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/skill-builder/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/sparc-methodology/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/stream-chain/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/swarm-advanced/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/swarm-orchestration/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-cli-modernization/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-core-implementation/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-ddd-architecture/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-integration-deep/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-mcp-optimization/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-memory-unification/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-performance-optimization/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-security-overhaul/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/v3-swarm-coordination/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/skills/verification-quality/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/statusline.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/statusline.sh', LF will be replaced by CRLF the next time Git touches it
warning: adding embedded git repository: .claude/worktrees/gifted-blackwell
hint: You've added another git repository inside your current repository.
hint: Clones of the outer repository will not contain the contents of
hint: the embedded repository and will not know how to obtain it.
hint: If you meant to add a submodule, use:
hint:
hint: 	git submodule add <url> .claude/worktrees/gifted-blackwell
hint:
hint: If you added this path by mistake, you can remove it from the
hint: index with:
hint:
hint: 	git rm --cached .claude/worktrees/gifted-blackwell
hint:
hint: See "git help submodule" for more information.
hint: Disable this message with "git config set advice.addEmbeddedRepo false"
warning: in the working copy of '.swarm/schema.sql', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.swarm/state.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'CLAUDE_PROJECT_SETTINGS.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'SKILLS_AUDIT_REPORT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'SKILLS_GAP_ANALYSIS_v2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'accurate_counts.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'add_headers_1.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'add_quick_refs.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'add_recovery_sections.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'analyze_skills.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply-audit-fixes.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply-fixes-v2.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_da.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_da2.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_da_part1.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r1.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r10.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r11.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r2.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r3.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r3_fix.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r7.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r8.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_r9.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'apply_stubs.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archive_deadweight.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/dev-scripts/fix_encoding.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/dev-scripts/rebuild_section_index.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/ALARM_DB_ROADMAP_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/DEVELOPMENT_ROADMAP_v5.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/DEVELOPMENT_ROADMAP_v6.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/DEV_INFRASTRUCTURE_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/FEATURE_ROADMAP_F1-F8.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/HSS_OPTIMIZATION_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/MCP_ENHANCEMENT_ROADMAP_v2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/MCP_ROUND2_ROADMAP_v3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/MCP_SKILLS_ROADMAP_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/MCP_UNIFIED_PLATFORM_ROADMAP_v2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/MCP_UNIFIED_PLATFORM_ROADMAP_v3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/MEGA_ROADMAP_AUDIT_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/MERGED_ROADMAP_v6.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRIORITY_ROADMAP.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRIORITY_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRIORITY_ROADMAP_V1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_HYBRID_REBUILD_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_INTEGRATED_MEGA_ROADMAP_v2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_MCP_UNIFIED_PLATFORM_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_MEGA_ROADMAP_v2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_Master_Roadmap_v10_0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_ROADMAP_v10_NUMBERED.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_SUPERPOWERS_UPGRADE_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_UNIFIED_MASTER_ROADMAP_v3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_v9_INTEGRATED_MASTER_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_v9_MASTER_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PRISM_v9_MASTER_ROADMAP_v3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PROJECT_ROADMAP_FOR_CLAUDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/PYTHON_ENHANCEMENT_ROADMAP.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/ROADMAP_INSTRUCTIONS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/ROADMAP_TRACKER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_AUDIT_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_COMPLETION_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_CONSOLIDATION_ROADMAP_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_EXPANSION_ROADMAP_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_MICROSESSION_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_UPLOAD_COMPLETE_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_UPLOAD_MASTER_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_UPLOAD_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/SKILL_UTILIZATION_AUDIT_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/TOOLKIT_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/TOOL_HOLDER_DATABASE_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/TOOL_HOLDER_DATABASE_ROADMAP_v4.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/ULTIMATE_ENHANCEMENT_ROADMAP_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/ULTIMATE_ENHANCEMENT_ROADMAP_v2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/UNIFIED_ROADMAP_v8.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/W6_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/W7_GSD_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/WIRING_ROADMAP_W1-W5.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/list_roadmap.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/package_roadmap.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/prism-roadmap-live/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_audit.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/apply_changes.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/check.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/count.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/ASSET_INVENTORY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/CLAUDE_CODE_INTEGRATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/COMPETITIVE_POSITIONING.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/CURRENT_POSITION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/DATA_FLYWHEEL_STRATEGY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/DEPLOYMENT_GUIDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_DA_DEV_ACCELERATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_P0_ACTIVATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R10_REVOLUTION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R11_PRODUCT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R1_REGISTRY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R2_SAFETY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R3_CAMPAIGNS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R3_IMPLEMENTATION_DETAIL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R4_ENTERPRISE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R5_VISUAL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R6_PRODUCTION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R7_INTELLIGENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R8_EXPERIENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_R9_INTEGRATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PHASE_TEMPLATE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PRISM_ASSET_AUDIT_v14_1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PRISM_Cross_Audit_Assessment.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PRISM_MASTER_INDEX.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PRISM_MASTER_INDEX_v14.2.1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PRISM_PROTOCOLS_CORE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/PRISM_PROTOCOLS_REFERENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/ROADMAP_INSTRUCTIONS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/ROADMAP_v14_2_GAP_ANALYSIS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/SKILLS_SCRIPTS_HOOKS_PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/SYSTEMS_ARCHITECTURE_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/SYSTEM_CONTRACT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/SYSTEM_CONTRACT_v14.2.1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/TOOL_UTILIZATION_AUDIT_v13_2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/reference/COMPACTION_PROTOCOL_ASSESSMENT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/reference/MONOLITH_vs_MODULAR_COMPARISON.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/reference/ROADMAP_MODULES_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/orig/roadmap-v14.2.1/reference/TOKEN_OPTIMIZATION_AUDIT_v12.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/ASSET_INVENTORY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/COMPETITIVE_POSITIONING.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/DATA_FLYWHEEL_STRATEGY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_DA_DEV_ACCELERATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_P0_ACTIVATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_R10_REVOLUTION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_R11_PRODUCT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_R3_IMPLEMENTATION_DETAIL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_R4_ENTERPRISE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_R5_VISUAL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_R8_EXPERIENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_R9_INTEGRATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PHASE_TEMPLATE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PRISM_ASSET_AUDIT_v14_1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PRISM_Cross_Audit_Assessment.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/PRISM_PROTOCOLS_REFERENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/ROADMAP_v14_2_GAP_ANALYSIS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/SKILLS_SCRIPTS_HOOKS_PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/SYSTEMS_ARCHITECTURE_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/TOOL_UTILIZATION_AUDIT_v13_2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/reference/COMPACTION_PROTOCOL_ASSESSMENT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/reference/MONOLITH_vs_MODULAR_COMPARISON.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/reference/ROADMAP_MODULES_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/roadmap-v14.2.1/reference/TOKEN_OPTIMIZATION_AUDIT_v12.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/ASSET_INVENTORY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/COMPETITIVE_POSITIONING.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/DATA_FLYWHEEL_STRATEGY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_DA_DEV_ACCELERATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_P0_ACTIVATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_R10_REVOLUTION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_R11_PRODUCT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_R3_IMPLEMENTATION_DETAIL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_R4_ENTERPRISE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_R5_VISUAL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_R8_EXPERIENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_R9_INTEGRATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PHASE_TEMPLATE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PRISM_ASSET_AUDIT_v14_1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PRISM_Cross_Audit_Assessment.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/PRISM_PROTOCOLS_REFERENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/ROADMAP_v14_2_GAP_ANALYSIS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/SKILLS_SCRIPTS_HOOKS_PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/SYSTEMS_ARCHITECTURE_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/TOOL_UTILIZATION_AUDIT_v13_2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/reference/COMPACTION_PROTOCOL_ASSESSMENT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/reference/MONOLITH_vs_MODULAR_COMPARISON.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/reference/ROADMAP_MODULES_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/legacy-roadmaps/roadmap_v14_3/zip_staging/reference/TOKEN_OPTIMIZATION_AUDIT_v12.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/BULLETPROOF_ASSESSMENT_v14.5.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/COMPETITIVE_POSITIONING.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/CONTEXT_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/CONTEXT_BUDGET_LOG.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/HIERARCHICAL_INDEX_SPEC.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/MASTER_ACTION_PLAN_v2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/OPERATIONAL_IMPROVEMENTS_PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/PRISM_AUDIT_v14_3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/PRISM_Cross_Audit_Assessment.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/PRISM_MASTER_INDEX_SLIM.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/ROADMAP_AUDIT_2026-02-17.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/ROADMAP_v14_2_GAP_ANALYSIS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/SYSTEMS_ARCHITECTURE_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/TOOL_UTILIZATION_AUDIT_v13_2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-reference/_AUDIT_FIXES_v14.5.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/count.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/ASSET_INVENTORY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/CLAUDE_CODE_INTEGRATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/COMPETITIVE_POSITIONING.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/CURRENT_POSITION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/DATA_FLYWHEEL_STRATEGY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/DEPLOYMENT_GUIDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_DA_DEV_ACCELERATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_P0_ACTIVATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R10_REVOLUTION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R11_PRODUCT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R1_REGISTRY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R2_SAFETY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R3_CAMPAIGNS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R3_IMPLEMENTATION_DETAIL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R4_ENTERPRISE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R5_VISUAL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R6_PRODUCTION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R7_INTELLIGENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R8_EXPERIENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_R9_INTEGRATION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PHASE_TEMPLATE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PRISM_ASSET_AUDIT_v14_1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PRISM_Cross_Audit_Assessment.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PRISM_MASTER_INDEX.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PRISM_MASTER_INDEX_v14.2.1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PRISM_PROTOCOLS_CORE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/PRISM_PROTOCOLS_REFERENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/ROADMAP_INSTRUCTIONS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/ROADMAP_v14_2_GAP_ANALYSIS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/SKILLS_SCRIPTS_HOOKS_PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/SYSTEMS_ARCHITECTURE_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/SYSTEM_CONTRACT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/SYSTEM_CONTRACT_v14.2.1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/TOOL_UTILIZATION_AUDIT_v13_2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/reference/COMPACTION_PROTOCOL_ASSESSMENT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/reference/MONOLITH_vs_MODULAR_COMPARISON.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/reference/ROADMAP_MODULES_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/roadmap-work/roadmap-v14.2.1/reference/TOKEN_OPTIMIZATION_AUDIT_v12.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.1 (PRISM REBUILD LIVING SYSTEM-FIRST ACTUAL SESSION)/CHANGE_PROPAGATION_RULES.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.1 (PRISM REBUILD LIVING SYSTEM-FIRST ACTUAL SESSION)/DEPENDENCY_GRAPH.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.1 (PRISM REBUILD LIVING SYSTEM-FIRST ACTUAL SESSION)/ENHANCEMENT_QUEUE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.1 (PRISM REBUILD LIVING SYSTEM-FIRST ACTUAL SESSION)/SESSION_LOG.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/MACHINES_INDEX.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/MACHINE_SCHEMA_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_BROTHER_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_CHIRON_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_DMG_MORI_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_DOOSAN_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_FANUC_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_GROB_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_HARDINGE_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_HERMLE_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_HURCO_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_HYUNDAI_WIA_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_KERN_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_MAKINO_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_MAZAK_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_MIKRON_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_OKK_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_SODICK_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_SPINNER_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_TOYODA_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/PRISM_YASDA_MACHINE_DATABASE_ENHANCED_v2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'archives/sessions/SESSION 0.EXT.2 (MACHINES DATABASE)/SESSION_0_EXT_2f_4_HANDOFF.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'artifacts/PRISM_MultiAgent_Orchestrator.jsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_all_phases.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_companion.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_companion_deep.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_companion_r4_r10.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_deps.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_deps2.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_dispatchers.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_folders.bat', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_headers.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_missing.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_orch.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_sessions.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_sizes.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_totals.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audit_transitions.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'audits/MATERIALS_AUDIT_SESSION46.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'autonomous-tasks/materials-db-verified/EXECUTION_LOG.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'autonomous-tasks/materials-db-verified/checkpoints/checkpoint_001.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'autonomous-tasks/materials-db-verified/checkpoints/checkpoint_002.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'autonomous-tasks/smoke-test-latest/ACCEPTANCE_CRITERIA.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'autonomous-tasks/smoke-test-latest/EXECUTION_LOG.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'autonomous-tasks/smoke-test-latest/TASK_MANIFEST.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'autonomous-tasks/smoke-test-latest/WORK_QUEUE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/data/coordination/UNIFIED_PATH_CONFIG.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/deployment/skills_package_v4/prism-python-tools/scripts/prism_paths.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/mcp-server/MCP_TOOL_CONTRACTS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/mcp-server/RESOURCE_CLASSIFICATION.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/scripts/build_level5_databases.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/scripts/context_generator.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/scripts/extract_prism_constants.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/scripts/prism_toolkit.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/scripts/progress_dashboard.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/scripts/sync_all_skills.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/scripts/workflow_validator.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_000924/skills/prism-python-tools/scripts/prism_paths.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/audit_folders.bat', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/deployment/skills_package_v4/prism-development/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/deployment/skills_package_v4/prism-extractor/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/AUTO_BOOTSTRAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/DEVELOPMENT_PROMPT_COMPARISON.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/DEVELOPMENT_PROMPT_v15.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/EVIDENCE_ACTIVATION_RULES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/GAP_ANALYSIS_UTILIZATION_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/GSD_CORE_v3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/GSD_SYSTEM_DESIGN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/INDEX.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_BATTLE_READY_PROMPT_v10_4.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_CONDENSED_PROTOCOL_v15.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_CONDENSED_PROTOCOL_v7.1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_DEVELOPMENT_PROMPT_BOX_ENABLED_v1.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_MASTER_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_QUICK_REFERENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_SKILL_FRAMEWORK.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_ULTIMATE_DEVELOPMENT_MASTER_v3.1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_ULTIMATE_DEVELOPMENT_MASTER_v4.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_ULTIMATE_DEVELOPMENT_MASTER_v5.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/PRISM_v4_UPDATE_PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/docs/ULTIMATE_ENHANCEMENT_ROADMAP_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/extracted/controllers/ALARM_DB_ROADMAP_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/extracted/controllers/PROJECT_ROADMAP_FOR_CLAUDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/logs/sessions/SESSION_0_EXT_2f_6_LOG.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/logs/sessions/session_cognitive_enhancement_v7_complete.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/mcp-server/INTEGRATION_MAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/mcp-server/audits/GAP_ANALYSIS_REPORT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/project-knowledge/PRISM_COMPLETE_SYSTEM_v9.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/scripts/SESSION_START_TEMPLATES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/scripts/TOOLKIT_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/scripts/get_context.bat', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/scripts/verify_skills_complete.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills-consolidated/prism-codebase-packaging/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills-consolidated/prism-dev-utilities/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills-consolidated/prism-session-master/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills-consolidated/prism-sp-execution/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills-consolidated/prism-sp-handoff/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills-consolidated/prism-sp-planning/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills-consolidated/prism-sp-review-spec/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills-consolidated/prism-sp-verification/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/PRISM_ALL_SKILLS_COMBINED.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/SKILL_MICROSESSION_ROADMAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/level2-workflow/prism-sp-execution/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/level2-workflow/prism-sp-handoff/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/level2-workflow/prism-sp-planning/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/level2-workflow/prism-sp-review-spec/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/level2-workflow/prism-sp-verification/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/level3-domain/prism-dev-utilities/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/level3-domain/prism-session-master/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-dev-utilities/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-development/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-extractor/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-session-master/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-sp-execution/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-sp-handoff/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-sp-planning/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-sp-review-spec/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/prism-sp-verification/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/unclassified/prism-all-skills/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/unclassified/prism-development/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002116/skills/unclassified/prism-extractor/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/SEAMLESS_MCP_ARCHITECTURE.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/backups/path_update_20260201_000924/scripts/consolidate_materials.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/backups/path_update_20260201_000924/scripts/consolidate_materials_v2.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/backups/path_update_20260201_000924/scripts/count_existing_materials.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/backups/path_update_20260201_000924/scripts/path_consolidation_updater.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/deployment/skills_package_v4/prism-combination-engine/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/docs/AUDIT_REPORT_v10.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/docs/HOOK_INTEGRATION_GUIDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/mcp-server/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/analyze_material_gaps.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/core/config.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/enhance_physics_accurate.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/enhance_physics_params.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/inject_physics_params.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/prism_hooks.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/verify_accurate.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/verify_consolidated.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/verify_final.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/verify_materials_db.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/scripts/verify_materials_phase1.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/skills-consolidated/prism-combination-engine/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/skills-consolidated/prism-formula-evolution/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/skills/level0-always-on/prism-combination-engine/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_001035/skills/level2-workflow/prism-claude-code-bridge/SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/backups/path_update_20260201_002116/scripts/path_consolidation_v2.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/mcp-server/README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'backups/path_update_20260201_002632/scripts/path_consolidation_v2.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'bulk_delete.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_cross.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_da.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_da_ms.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_da_ms6.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_da_roles.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_deps.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_headers.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_integration.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_integration_state.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_knowledge_refs.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_map.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_mi_da.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_qr.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_r10.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_r10_r11.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_r3.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_r6.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_rc.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_regression.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_remaining.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_spec.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_spec_branches.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_state.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_status.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_stubs.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'check_v14_5.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/CLAUDE_DEV_SKILL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/QUICK_REFERENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/bootstrap.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/context/memory_manager.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/context/pressure_monitor.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/hooks/cognitive_wiring.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/hooks/context_hooks.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/hooks/dev_hooks.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/integration_test.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/orchestration/auto_orchestrator.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/swarms/COMPETITIVE_TEMPLATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/swarms/CONSENSUS_TEMPLATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/swarms/COOPERATIVE_TEMPLATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/swarms/ENSEMBLE_TEMPLATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/swarms/HIERARCHICAL_TEMPLATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/swarms/MAP_REDUCE_TEMPLATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/swarms/PARALLEL_TEMPLATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/swarms/PIPELINE_TEMPLATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'claude-dev/test_orchestrator.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'cleanup_skills.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'compare_versions.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'count_all_courses.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/DEVELOPMENT_HOOKS_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/LEARNING_DATABASE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/coordination/GSD_BUNDLES.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/coordination/SKILL_ACCESS_MAP.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/ACTION_TRACKER', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/ACTION_TRACKER.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/CONTEXT_BUDGET_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/CURRENT_POSITION.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/MASTER_INDEX.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/PHASE_FINDINGS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/R2_CALC_RESULTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/REGISTRY_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/ROADMAP_TRACKER.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/TOOL_ORCHESTRATION_MAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/docs/W4_ASSESSMENT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/hooks/HOOK_AGENT_MATRIX.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/hooks/HOOK_AGENT_MATRIX_v1.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/hooks/HOOK_GAP_AUDIT_v1.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/hooks/HOOK_PERFORMANCE_CONFIG.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/hooks/HOOK_PERFORMANCE_CONFIG_v1.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/hooks/OPERATION_HOOKS_41_v1.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/hooks/OPERATION_HOOKS_COMPLETE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/ALL_MACHINES.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_AWEA_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_BROTHER_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_CHIRON_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_DMG_MORI_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_DOOSAN_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_FANUC_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_FEELER_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_GROB_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v3.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_HARDINGE_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_HERMLE_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_HURCO_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_HYUNDAI_WIA_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_KERN_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_MAKINO_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_MAZAK_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_MHI_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_MIKRON_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_OKK_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_ROKU_ROKU_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_SODICK_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_SPINNER_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_TAKUMI_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_TOYODA_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/machines/ENHANCED/json/PRISM_YASDA_MACHINE_DATABASE_ENHANCED_v2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/armor_ballistic_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/bearing_steel_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/case_hardening_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/chromoly_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/cold_work_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/free_machining_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/gen_v5_hardened_steels.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/high_carbon_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/high_speed_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/hot_work_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/martensitic_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/medium_carbon_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/mold_steel_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/nickel_chromoly_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/oil_hardening_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/shock_resistant_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/spring_steel_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/tool_steel_hrc_variations_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/ultra_high_strength_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/H_HARDENED/water_hardening_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/K_CAST_IRON/GG25_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/K_CAST_IRON/cast_iron_comprehensive_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/K_CAST_IRON/gen_v5_austempered_ductile.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/K_CAST_IRON/gen_v5_compacted_graphite.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/K_CAST_IRON/gen_v5_ductile_iron.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/K_CAST_IRON/gen_v5_gray_iron.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/K_CAST_IRON/gen_v5_white_iron.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/K_CAST_IRON/merged_from_complete.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/Duplex2205_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/austenitic_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/duplex_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/ferritic_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/final_pass3_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/final_pass4_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/final_pass5_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/final_pass_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/free_machining_austenitic_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/free_machining_martensitic_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/gen_v5_austenitic.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/gen_v5_duplex.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/gen_v5_general_stainless.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/gen_v5_martensitic.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/gen_v5_precipitation_hardening.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/lean_duplex_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/martensitic_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/merged_from_complete.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/name_resolved_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/precipitation_hardening_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/stainless_hrc_variations_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/super_austenitic_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/M_STAINLESS/super_duplex_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/aluminum_lithium_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/beryllium_copper_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/brass_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/bronze_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/cast_aluminum_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/common_aluminum_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/final_pass3_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/final_pass4_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/final_pass5_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/final_pass_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/gen_v5_aluminum_cast.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/gen_v5_copper_brass.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/gen_v5_copper_bronze.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/gen_v5_general_nonferrous.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/gen_v5_magnesium.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/gen_v5_titanium.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/magnesium_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/merged_from_complete.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/name_resolved_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/pure_copper_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/N_NONFERROUS/wrought_aluminum_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/bearing_steel_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/case_hardening_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/chromoly_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/cold_work_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/final_pass2_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/final_pass3_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/final_pass4_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/final_pass5_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/final_pass_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/free_machining_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/gen_v5_carbon_steels.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/high_carbon_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/high_speed_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/hot_work_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/low_carbon_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/medium_carbon_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/merged_from_complete.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/mold_steel_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/name_resolved2_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/name_resolved_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/nickel_chromoly_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/oil_hardening_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/shock_resistant_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/spring_steel_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/ultra_high_strength_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/P_STEELS/water_hardening_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/Inconel718_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/advanced_superalloys_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/final_pass5_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/gen_v5_cobalt_base.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/gen_v5_general_superalloys.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/gen_v5_nickel_base.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/incoloy_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/name_resolved_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/nickel_cobalt_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/titanium_alpha_beta_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/titanium_alpha_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/titanium_beta_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/titanium_cp_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/titanium_extended_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/S_SUPERALLOYS/titanium_near_alpha_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/ceramics_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/composites_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_additive_manufacturing.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_ceramics.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_composites.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_general_specialty.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_graphite.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_honeycomb_sandwich.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_polymers.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_rubber_elastomers.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/gen_v5_wood.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/graphite_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials/X_SPECIALTY/plastics_polymers_verified.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/materials_verified/K_CAST_IRON/cast_iron.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/tools/ENDMILL_CATALOGS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/tools/INDEXABLE_MILLING_TOOLHOLDING.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/tools/MANUFACTURER_CATALOGS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/tools/TOOLHOLDERS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/tools/TURNING_HOLDERS_EXPANDED.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'data/tools/TURNING_INSERTS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'deep_search_courses.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'delete_dead.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/00_CONDENSED_PROTOCOL_v5.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/00_CONDENSED_PROTOCOL_v6.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/API_ACCELERATED_BUILD.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/API_INTEGRATION_GUIDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/APPEND_ONLY_STATE_PROTOCOL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/ATCS_MANUS_MERGE_BRAINSTORM.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/AUTOPILOT_V2_GUIDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/AUTO_ACTIVATION_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/AUTO_BOOTSTRAP.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/AUTO_HOOKS_V2_COMPLETE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/CLAUDE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/CONDENSED_PROTOCOL_v14.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/CONTEXT_AUTO_LOADER_V1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/CONTEXT_INJECT_TEMPLATE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/CTX_CACHE_HOOKS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/CTX_HOOKS_COMPLETE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/CTX_STATE_HOOKS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/DEVELOPMENT_INSTRUCTIONS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/DEVELOPMENT_PROMPT_v15.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/DOT_STANDARDS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/DYNAMIC_DATA_ARCHITECTURE.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/EVIDENCE_ACTIVATION_RULES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/EXTRACTION_PRIORITY_BRAINSTORM.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/EXTRACTION_PRIORITY_INTELLIGENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/HOOK_COVERAGE_REPORT_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/INDEX.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/KV_CACHE_PROTOCOL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/MCP_MEGA_CONSOLIDATION_PROMPT_v1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/MCP_SERVER_ASSESSMENT_SESSION27.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/ORCHESTRATOR_INTEGRATION_PROTOCOL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PHASE1_COMPLETION_REPORT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_AUDIT_REPORT_v8.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_BATTLE_READY_PROMPT_v10_4.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_BATTLE_READY_PROMPT_v9.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_BATTLE_READY_PROTOCOL_v9.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_BATTLE_READY_v11.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_CONDENSED_PROTOCOL_v14.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_CONDENSED_PROTOCOL_v15.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_CONDENSED_PROTOCOL_v16.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_CONDENSED_PROTOCOL_v7.1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_DEVELOPMENT_PROMPT_BOX_ENABLED_v1.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_HYBRID_DEVELOPMENT_PROMPT_v1.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_MASTER_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_PROJECT_SETTINGS_BATTLE_READY_v9.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_PROJECT_SETTINGS_PROMPT_v1.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_QUICK_REFERENCE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_SETUP_STATUS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_SKILL_FRAMEWORK.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_ULTIMATE_DEVELOPMENT_MASTER_v3.1.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_ULTIMATE_DEVELOPMENT_MASTER_v4.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_ULTIMATE_DEVELOPMENT_MASTER_v5.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_ULTIMATE_DEVELOPMENT_MASTER_v6.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_ULTIMATE_DEVELOPMENT_MASTER_v7.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_UNIFIED_ECOSYSTEM_v3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_UNIFIED_SYSTEM_v10.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_UNIVERSAL_DEVELOPMENT_PROMPT_v8.0.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PRISM_v4_UPDATE_PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PROJECT_INSTRUCTIONS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PROJECT_INSTRUCTIONS_MINIMAL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PROJECT_INSTRUCTIONS_V10.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PROJECT_INSTRUCTIONS_V9.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PROJECT_INSTRUCTIONS_v10_4.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PROJECT_INSTRUCTIONS_v16.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/PROJECT_INSTRUCTIONS_v2.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/RESOURCE_ACTIVATION_PROTOCOL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/SEAMLESS_ENHANCEMENT_EXAMPLES.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/SKILL_TEMPLATE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/STABLE_PREFIX_TEMPLATE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/TODO_MD_PROTOCOL.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/UPDATE_SUMMARY.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE_CACHE_AUDIT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE_PROJECT_FILE.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE_v3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE_v4.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE_v5.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE_v6.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE_v7.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_CORE_v8.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_SYSTEM_DESIGN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_V9_GAP_ANALYSIS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_v10.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_v11.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/archive/GSD_v9.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/hooks/CTX_COMPACT_HOOKS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/hooks/CTX_GSD_SYNC_HOOKS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/hooks/CTX_HANDOFF_HOOKS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/hooks/CTX_RESUME_HOOKS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/hooks/CTX_STATE_HOOKS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'encode_zip.ps1', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/EXTRACTION_REGISTRY.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/PRISM_CONSOLIDATED_MATERIALS.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/PRISM_ENHANCED_MATERIAL_DATABASE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/PRISM_EXTENDED_MATERIAL_CUTTING_DB.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/PRISM_JOHNSON_COOK_DATABASE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/PRISM_MATERIALS_COMPLETE_SYSTEM.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/PRISM_MATERIALS_MASTER.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/PRISM_MATERIAL_KC_DATABASE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/PRISM_UNIFIED_SCIENTIFIC_MATERIALS.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/SESSION_0_EXT_1_HANDOFF.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/SESSION_LOG.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/_REGISTRY.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/materials_index.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_ALUMINUM_ALLOYS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_CARBON_ALLOY_STEELS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_CARBON_STEELS_EXPANSIONS.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_CARBON_STEELS_ULTIMATE_PART1.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_CARBON_STEELS_V3_ULTIMATE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_CAST_IRONS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_COPPER_ALLOYS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_NICKEL_SUPERALLOYS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_SCIENTIFIC_PARAMETERS_SCHEMA.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_SPECIALTY_METALS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_STAINLESS_STEELS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_TITANIUM_ALLOYS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_TOOL_STEELS_SCIENTIFIC.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/PRISM_ULTIMATE_MATERIALS_MASTER_LIST_v3.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/_ARCHIVE_OLD_MATERIALS/materials/scientific/SCIENTIFIC_MATERIALS_MASTER_PLAN.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/ALARM_SCHEMA.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/CONTROLLER_DATABASE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/CONTROLLER_SCHEMA.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/FIX_PROCEDURE_SCHEMA.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/GCODE_MCODE_DATABASE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/ORCHESTRATION_STATE.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/VERIFIED_FIX_PROCEDURES.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/add_fix_procedures_all_families.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarm_quality_gate.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarm_swarm_generator.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/BROTHER_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/DMG_MORI_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/DOOSAN_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/FAGOR_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/FANUC_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/HAAS_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/HEIDENHAIN_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/HURCO_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/MAZAK_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/MITSUBISHI_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/OKUMA_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/SIEMENS_ALARMS_MASTER.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/BROTHER_ALARMS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/FANUC_ALARMS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/FANUC_ALARMS_EXPANDED.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/HAAS_ALARMS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/HAAS_ALARMS_EXPANDED.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/HEIDENHAIN_ALARMS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/HEIDENHAIN_ALARMS_EXPANDED.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/MAZAK_ALARMS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/MAZAK_ALARMS_EXPANDED.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/MITSUBISHI_ALARMS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/OKUMA_ALARMS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/OKUMA_ALARMS_EXPANDED.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/SIEMENS_ALARMS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/alarms/archive/SIEMENS_ALARMS_EXPANDED.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/audit_alarms.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/autonomous_extraction.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/build_fanuc_accurate.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/build_fanuc_complete.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/build_haas_accurate.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/build_haas_complete.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/build_mazak_complete.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/build_remaining_controllers.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/build_siemens_accurate.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/build_siemens_complete.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/consolidate_accurate.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/consolidate_v2.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase10_doosan_more.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase11_siemens_sinamics_mazak.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase12_mitsubishi_heidenhain_brother.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase13_final.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase14_final_target.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase15_fagor_hurco_brother.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase16_dmg_doosan_siemens.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase17_fanuc_okuma_heidenhain.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase18_mazak_haas_mitsubishi.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase19_final_2500.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase3.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase4.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase5.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase6_haas.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase7_fanuc_okuma.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase8_siemens_mazak.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/expand_phase9_heidenhain_mitsubishi.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/fix_families.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/fix_families_v2.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/rebuild_accurate.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/remove_generic_fix_procedures.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/scripts/add_fix_procedures_phase1_fanuc.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/scripts/add_fix_procedures_phase2_all.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/controllers/strip_generic.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/engines/ai_ml/EXTRACTION_MANIFEST.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/engines/ai_ml/PRISM_ADVANCED_DQN.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/engines/ai_ml/PRISM_DIFFERENTIAL_EVOLUTION.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/engines/ai_ml/PRISM_GA_ENGINE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/engines/ai_ml/PRISM_RL_QLEARNING_ENGINE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/engines/ai_ml/PRISM_SIMULATED_ANNEALING.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/engines/cad_cam/PRISM_CAM_KERNEL_COMPLETE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CONSOLIDATED/ALL_MACHINES.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_LATHE_MACHINE_DB.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_LATHE_MACHINE_DB.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_LATHE_V2_MACHINE_DATABASE_V2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_MACHINE_3D_DATABASE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_MACHINE_3D_MODEL_DATABASE_V2.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_MACHINE_3D_MODEL_DATABASE_V2.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_MACHINE_3D_MODEL_DATABASE_V3.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_OKUMA_MACHINE_CAD_DATABASE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/PRISM_POST_MACHINE_DATABASE.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/CORE/machines_core_index.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/ENHANCED/BATCH10_MAZAK_DEEP.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/ENHANCED/BATCH11_MULTI_DEEP.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/ENHANCED/BATCH12_FINAL_GAPS.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extracted/machines/ENHANCED/BATCH3_MULTI_MFR.json', LF will be replaced by CRLF the next time Git touches it

⏳ Process is running. Use read_process_output to get more output.
