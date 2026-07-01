---
effort: high
maxTurns: 25
---

# Session Startup Macro

You are initializing a PRISM development session. Run through this checklist to establish context, detect issues, and present the work surface. Execute all steps — do not ask questions until the summary is ready.

## Step 0: Set Effort to MAX (MANDATORY — user requires max effort always)
Tell the user: "Run `/effort max` now if terminal doesn't show max."
Note: `max` cannot be set programmatically or persisted in settings. Settings has `"effortLevel": "high"` as fallback. User ALWAYS wants max for PRISM work.

## Step 1: Load Current Position
Read `H:/PRISM/state/CURRENT_POSITION.md` and extract:
- Current phase and roadmap version
- Milestone completion stats (X/Y complete)
- Last session's work summary

## Step 1B: Reload Last Session (Per-Chat Handoff)
Read THIS chat's per-session handoff via the helper — do NOT read the legacy `H:/PRISM/state/HANDOFF.md` (that is just an index now):

```bash
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal "$STABLE"
```

Interpret the JSON result:
- `matchedBy: "exact"` — your own chat's handoff, use RESUME directly
- `matchedBy: "fuzzy"` | `"family-latest"` | `"global-latest"` — fallback kicked in because the exact session ID rotated (e.g. post-compact). The `fallback_note` explains which handoff was used and how old it is. Treat the RESUME as YOUR resume unless the age is >24h or its instance clearly belongs to a different active chat.
- `ok: false` — no handoff anywhere. Report "Fresh session — no handoff available" and move on.

Extract:
- `## STATE` — last known position
- `## RESUME` — exactly what to do next (Step 7 will execute this)

If age >48h, warn "Handoff is stale ([N]h old) — verify before resuming."

## Step 1C: Load Shared Agent Bridges
Read these shared cross-agent directives:
- `H:/PRISM/state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md`
- `H:/PRISM/state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md`
- `H:/PRISM/state/shared/CLAUDE-CODEX-COMMAND-BRIDGE.md`
- `H:/PRISM/state/shared/CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md`
- `H:/PRISM/state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md`
- `H:/PRISM/state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`
- `H:/PRISM/state/shared/CLAUDE-CODEX-RGS-SYNC-PROTOCOL.md`
- `H:/PRISM/state/shared/CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md`
- `H:/PRISM/state/shared/CLAUDE-CODEX-SPAWNED-AGENT-DIRECTIVE.md`

Report whether each exists. These files are the long-term shared operating directives for Claude/Codex parity on:
- MCP-server development capability usage and relevance rules
- the unified MCP-first utilization directive that replaced the retired development/full-power/full-utilization trio
- SVI / Psi / watch-status behavior
- slash-command mirroring rules, hook-backed command pipelines, and command bridge limits
- shared index-first search behavior, concurrent work discipline, and token economy
- shared workboard/chat coordination so both agents can see current work, next work, and recent completions
- finish-current-delivery-first roadmap sequencing plus the SVI-aware trigger for the next collaborative gap-roadmap pass
- canonical `/rgs-sync` status/sync protocol for roadmap convergence updates across both agent families
- canonical task-queue behavior for dependency-ordered assignment, claims, heartbeat, and completion across both agent families

Also note the registry JSON path for command parity work:
- `H:/PRISM/state/shared/claude-codex-command-registry.json`
And the shared index registry paths:
- `H:/PRISM/state/shared/PRISM_SHARED_INDEX_SURFACES.md`
- `H:/PRISM/state/shared/PRISM_SHARED_INDEX_SURFACES.json`
And the shared coordination surfaces:
- `H:/PRISM/state/shared/AGENT_COORDINATION_STATUS.md`
- `H:/PRISM/state/shared/AGENT_WORKBOARD.md`
- `H:/PRISM/state/shared/AGENT_CHAT.md`
And the roadmap collaboration surface:
- `H:/PRISM/state/shared/ROADMAP_COLLABORATION_STATE.md`
And the task coordination surfaces:
- `H:/PRISM/state/shared/TASK_QUEUE.md`
- `H:/PRISM/state/shared/TASK_COORDINATION_SPEC.md`

## Step 1D: Load Shared Coordination State
Read:
- `H:/PRISM/state/shared/AGENT_COORDINATION_STATUS.md`
- `H:/PRISM/state/shared/AGENT_WORKBOARD.md`
- `H:/PRISM/state/shared/AGENT_CHAT.md`

Report whether another agent has active current/next work or unread coordination notes before replanning.

## Step 1F: Load Shared Task Queue
Read:
- `H:/PRISM/state/shared/CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md`
- `H:/PRISM/state/shared/TASK_COORDINATION_SPEC.md`
- `H:/PRISM/state/shared/TASK_QUEUE.md`

Then run:

```powershell
node H:\PRISM\.claude\helpers\task-queue.mjs reap
node H:\PRISM\.claude\helpers\task-queue.mjs next
```

Report:
- top available task for the current family, if any
- whether current family tasks are blocked
- whether another terminal already owns the current family's active task

## Step 1G: Announce Session Start to Coordination
Write session-start signals to the shared coordination surfaces so Codex and the user can immediately see that Claude is active. Run these two commands using the Bash tool:

```bash
node H:/PRISM/.claude/helpers/agent-coordination.mjs post \
  --agent Claude \
  --status ready \
  --lane "session-start" \
  --current "Session starting — loading context from HANDOFF.md" \
  --next "Execute RESUME directive from HANDOFF.md" \
  --message "Session started. Reading handoff, SVI, quality dashboard, and coordination state."
```

```bash
node H:/PRISM/.claude/helpers/roadmap-sync.mjs sync \
  --agent Claude \
  --status active \
  --note "Session starting. Loading coordination state and preparing to execute RESUME."
```

If either command fails (missing helper script, etc.), log the error but do NOT block startup — continue to the next step.

## Step 1E: Load Shared Roadmap Gate
Read:
- `H:/PRISM/state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`
- `H:/PRISM/state/shared/ROADMAP_COLLABORATION_STATE.md`

Report whether the current backend/frontend finish-first gate is still active or whether the next large roadmap pass is allowed to begin.

## Step 2: Check Active Claims
Scan `H:/PRISM/mcp-server/data/claims/` for any existing claim directories.
For each claim found:
- Read `claim.json` to get claimant, timestamp, unit ID
- Check if the claim is stale (older than 5 minutes with no heartbeat update)
- Report: "You have an active claim on [unit]" or "Found stale claim on [unit] — will auto-reap"

Also check `H:/PRISM/state/ACTIVE_CLAIM.json` — if it exists, report what unit is claimed.

## Step 3: Quick Build Health
Run `npm run build 2>&1 | tail -5` from `H:/PRISM/mcp-server/` to check for:
- Build success/failure
- TypeScript error count
- Any new warnings

## Step 4: Check for Roadmap Drift
Read `H:/PRISM/mcp-server/data/roadmap-index.json` and verify:
- `total_milestones` matches actual envelope count in `data/milestones/`
- `completed_milestones` matches entries with `"status": "complete"`
- Report any drift found

## Step 4B: SVI / Reachability Check
Read `H:/PRISM/state/shared/SVI-compact.md` and extract:
- **SVI** display value (e.g., 1.8 x 10^43)
- **Psi (Reachability)** percentage (e.g., 40.8%)
- **Trend** (stable / growing / shrinking)
- Any **Coverage Alerts** listed at the bottom

If Psi decreased from the previous session's handoff value, flag: `SVI REGRESSION: Psi dropped from [old]% to [new]%`

## Step 4C: Quality Dashboard Check
Read `H:/PRISM/state/shared/QUALITY_DASHBOARD.json` if it exists:
- Extract: system_Q, mean_Q, engines_below_70, formula_accuracy.aggregate_accuracy, improvement.patterns_detected, improvement.fixes_promoted, schema_coverage.coverage_pct, tests.pass_rate
- If file doesn't exist or is older than 48 hours: note "Dashboard stale — will refresh"
- If any alerts with severity "critical": flag them immediately
- Show in Step 5 summary as the `Quality:` line

If the file is missing or stale, run `prism_dev:quality_dashboard` to compute a fresh snapshot (this reads from QualityScoreEngine, FormulaValidationEngine, SelfImprovementPatternEngine, AutoFixPipelineEngine, and SVI data — all aggregated into one view).

## Step 4D: Context Pressure Check
Quick context health scan (no detailed audit — use `/context` for that):
1. Count MEMORY.md lines (target <200)
2. Report: `Memory: [N]/200 lines ([LEAN/OK/HEAVY])`
3. If >180 lines: suggest `/context-audit` for full diagnosis, then `/slim` to trim before working

## Step 4E: Background Health Suggestions
Based on session state, suggest background forge tasks the user can launch:
- If no recent audit: "Consider: `/forge-audit quick` in background for quality pulse"
- If roadmap drift found: "Consider: `/forge-drift` in background for full drift analysis"
- If build has warnings: "Consider: `/forge-types report` in background for type coverage"
- Always available: "`/forge-metrics quick` for codebase health dashboard"

These are **suggestions only** — don't auto-launch. Present as optional Quick Actions.

## Step 5: Present Work Surface
Show a compact summary:

```
PRISM Session Startup
=====================
Position:  [phase] | Roadmap v[X] | [X]/[Y] milestones complete
SVI:       [value] | Psi: [N]% | Trend: [stable/growing/shrinking]
Quality:   Q=[system_Q] mean=[mean_Q] | Accuracy: [N] | Schemas: [N]% | [N] alerts
Claim:     [active claim or "none"]
Build:     [pass/fail] | [N] TS errors
Drift:     [clean / N issues found]
Memory:    [N]/200 lines | Handoff: [YES/NO/STALE]

Available Tracks (unblocked):
  SYS-MS0  CLAUDE.md Modular Architecture     [not_started]
  SYS-MS1  Intelligence Mega-Dispatcher        [not_started]
  S3-MS2   SFC Calculator Phase 2              [not_started]
  ...

Quick Actions:
  /pick-task          — Claim a task and start working
  /audit-task scan    — Scan completed work for gaps
  /health             — Detailed system health check
  /commands           — List all available commands
```

## Step 5B: Digest System Check
Verify the file system digest files are current:
- `data/docs/DIRECTORY_DIGEST.md` — 215 directories with purposes (use `/digest-all` to load)
- `data/docs/ENGINE_DIGEST.md` — 879 engines with 1-line descriptions
- `data/docs/DISPATCHER_DIGEST.md` — 66 dispatchers with action counts
- `data/docs/CODE_SYSTEM_INDEX.json` — 1,865 shortcode mappings
- If any are missing: "Run digest generators to rebuild file system index"
- Mention: "Use `/navigate <topic>` for zero-IO file location, `/code-index` for shortcodes"

## Step 5C: Update Coordination with Session Plan
Now that the work surface has been loaded and the session plan is known, update the shared coordination state with the actual plan. Run this command using the Bash tool, substituting the bracketed values with real data gathered from previous steps:

```bash
node H:/PRISM/.claude/helpers/agent-coordination.mjs post \
  --agent Claude \
  --status ready \
  --current "[RESUME directive from HANDOFF.md — what was loaded in Step 1B]" \
  --next "[suggested next action from Step 6 / auto-suggest reasoning]" \
  --message "Session initialized. SVI: Psi=[N]%. Build: [PASS/FAIL]. Quality: Q=[N]. Executing: [RESUME directive]."
```

Replace the bracketed placeholders:
- `[RESUME directive from HANDOFF.md]` — the actual RESUME line from Step 1B
- `[suggested next action]` — what Step 6 will suggest (look-ahead from work surface)
- `[N]%` for Psi — from Step 4B
- `[PASS/FAIL]` — from Step 3
- `Q=[N]` — from Step 4C

If the command fails, log the error but do NOT block startup.

## Step 6: Auto-Suggest
Based on the current state, suggest the most impactful next action:
- If there's an active claim: "Resume work on [unit] — run `/pick-task [unit-id]` to reload context"
- If no claim and CRITICAL findings exist: "Priority: fix open CRITICAL findings"
- If no claim: "Suggested: `/pick-task` to claim your next task"
- If stale claims found: "Clean up stale claims first"

## Step 7: AUTO-CONTINUE (MANDATORY — do NOT skip, do NOT ask)
This step makes startup → continue AUTOMATIC. Execute it every time.

1. **Re-fetch the per-chat handoff now** using the helper (not the legacy HANDOFF.md — that file is just an index):

   ```bash
   STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
   node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal "$STABLE"
   ```

   If the result's `ok` is false, try the global fallback:
   ```bash
   node H:/prism/.claude/helpers/per-agent-handoff.mjs latest --family Claude
   ```

   Extract the `## RESUME` section from the returned content.
2. The RESUME line tells you EXACTLY what to do next
3. **DO IT IMMEDIATELY** — do not ask the user, do not summarize, do not wait
4. If RESUME says "expand 5-Axis knowledge blocks" → start expanding them
5. If RESUME says "Phase 0-PRE Session 1" → start that session
6. If RESUME says "fix 3 TS errors" → start fixing them
7. The ONLY time you stop is if:
   - Build is BROKEN (Step 3 found errors) → fix errors first
   - A CRITICAL finding blocks work → address it first
   - HANDOFF.md doesn't exist → ask user what to work on

**THE POINT OF THIS STEP:** After compaction, you should seamlessly continue
working as if the compaction never happened. The user should NOT need to tell
you what to do — HANDOFF.md already says it. Just read and execute.

This is the auto-continuation infrastructure. It works because:
- /compact saves HANDOFF.md with a RESUME line
- /startup reads HANDOFF.md in Step 1B
- Step 7 executes the RESUME line immediately
- The loop is: work → /compact (saves RESUME) → /startup (reads RESUME) → work

$ARGUMENTS

