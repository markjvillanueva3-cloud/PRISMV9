---
name: team-dispatch
description: Launch a named agent team with a brief. Coordinates multi-agent workflows for forge, test, and pipeline tasks.
model: sonnet
effort: high
argument-hint: "[forge|test|pipeline] <brief>"
---

# Team Dispatch — Agent Team Orchestrator

Launch and coordinate a named agent team. Each team follows a defined multi-step workflow with sequential handoffs.

## Usage

```
/team-dispatch forge Build a CryogenicMachiningEngine with LN2/CO2 heat transfer models
/team-dispatch test Run full engine test sweep and diagnose failures
/team-dispatch pipeline Integrate SpeedFeedOrchestrator with PostProcessorPipeline
```

## Dispatch Protocol

### 1. Parse Arguments
- First argument: team name (`forge`, `test`, or `pipeline`)
- Remaining text: the brief passed to every agent in the team
- If no team name given, ask the user which team to use

### 2. Load Team Definition
Read the team definition from `~/.claude/agents/teams/{name}-team.md`.
Parse the YAML frontmatter to get:
- `agents`: list of agent names to invoke
- `model`: default model for the team
- Description and orchestration flow from the body

### 3. Prepare Workspace
Clean previous team run artifacts:
```bash
rm -f C:/tmp/prism-team-{name}-step*.json 2>/dev/null
```
Ensure telemetry dir exists:
```bash
mkdir -p ~/.prism/telemetry
```

### 4. Execute Team Steps

For each step defined in the team orchestration flow:

**Step N** — Launch the agent specified for that step:
1. Read previous step output if exists: `C:/tmp/prism-team-{name}-step{N-1}.json`
2. Compose agent prompt:
   ```
   You are step {N} of the {team-name} team.

   BRIEF: {original brief}

   PREVIOUS STEP OUTPUT: {contents of previous step JSON, or "N/A" for step 1}

   Follow your agent instructions. Write your output to:
   C:/tmp/prism-team-{name}-step{N}.json
   ```
3. Invoke via Agent tool with the agent configured model and settings
4. Verify the step output file was created
5. Check for BLOCK/FAIL status — halt pipeline if found

### 5. Aggregate Results

After all steps complete (or pipeline halts):
1. Read all step output files
2. Run the team aggregator:
   ```bash
   python3 ~/.claude/hooks/lib/team-aggregator.py {name}
   ```
3. Compose unified team report

### 6. Report

Output a unified team report:
```
TEAM REPORT: {name}-team
=========================
Brief: {original brief}
Steps completed: {N}/{total}
Status: COMPLETE | HALTED at step {N}

STEP 1 ({agent-name}):
  Status: {status}
  Key findings: {summary}

STEP 2 ({agent-name}):
  Status: {status}
  Key findings: {summary}

STEP 3 ({agent-name}):
  Status: {status}
  Key findings: {summary}

METRICS:
  Total estimated tokens: ~{sum}
  Steps with issues: {count}

ARTIFACTS:
  - C:/tmp/prism-team-{name}-step1.json
  - C:/tmp/prism-team-{name}-step2.json
  - C:/tmp/prism-team-{name}-step3.json
  - ~/.prism/telemetry/team-runs.jsonl (appended)
```

## Error Handling

- If an agent fails to produce its output file, retry once with a reminder prompt
- If a step returns BLOCK status, halt the pipeline and report the blocking issue
- If a step returns FAIL status on build, halt and report build errors
- Always run the aggregator even on partial completion (for telemetry)

## Team Definitions

| Team | Agents | Use Case |
|------|--------|----------|
| forge | archaeologist + wirer + reviewer | Feature development |
| test | runner + hunter + doc-gen | Test sweeps |
| pipeline | archaeologist + build-doctor + runner | Pipeline integration |
