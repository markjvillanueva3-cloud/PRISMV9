---
name: prism-workflow-run
description: List and plan multi-step workflows for complex manufacturing tasks.
model: sonnet
effort: high
context: 15%
allowed-tools: ["Read", "Bash", "Agent"]
---

# /workflow — Workflow Orchestration

## Usage
- `/workflow` — List built-in workflows
- `/workflow <id>` — Plan execution for a specific workflow
- `/workflow --create <name>` — Create a custom workflow

## Implementation

1. Call `prism_dev` with action `workflow_list` → show built-in workflows
2. For detail: call `prism_dev` with action `workflow_plan` with `{ "workflow_id": "<id>" }`
3. Display:
```
Built-in Workflows
  forge-engine:      6 steps | serial    | scaffold→implement→typecheck→test→wire→review
  physics-validate:  4 steps | fan-out   | benchmark + formula + cross-pipe → merge
  quote-pipeline:    4 steps | serial    | dfm→cycle time→cost→document

Execution Plan: [workflow name]
  Phase 1: [steps] (parallel: yes/no)
  Phase 2: [steps] (depends on Phase 1)
  ...
  Estimated duration: [N] ms | Parallelism: [%]
```
