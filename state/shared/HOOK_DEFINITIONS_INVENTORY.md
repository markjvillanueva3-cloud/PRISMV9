# Hook Definitions Inventory — by automation lifecycle stage

**Generated:** 2026-05-13T13:52:09.677Z
**Source:** `node scripts/inventory-hook-definitions.mjs` (ACP-MS0/P0-U02)

**Existing hook files:** 463
  · wired: 174
  · orphaned (file present but never registered): 289
  · disabled: 0

**Planned hooks** (CCM declarations in milestone envelopes that have no source file yet): 349
**Planned-and-already-built** (declaration matches an existing hook ID): 0

## Stage totals

| Stage | Existing | Planned-only | Total | Description |
|-------|----------|--------------|-------|-------------|
| session-bootstrap | 30 | 0 | 30 | SessionStart — context load, digest inject, env probe. |
| prompt-ingestion | 12 | 0 | 12 | UserPromptSubmit — classify intent, inject context, route prompt. |
| pre-action-gate | 73 | 281 | 354 | PreToolUse — validate the tool call before it runs (block, advise, claim). |
| post-action-observe | 22 | 0 | 22 | PostToolUse — telemetry / linting / read-cache after a tool ran. |
| subagent-lifecycle | 2 | 0 | 2 | SubagentStart + SubagentStop — push context, verify deliverables. |
| session-teardown | 31 | 0 | 31 | Stop — scrutiny gate, handoff, unwired-asset block. |
| context-handoff | 4 | 0 | 4 | PreCompact — capture state before context compaction. |
| infrastructure | 3 | 0 | 3 | Bundle hosts, envelopes, profiling shims — wrapped by other hooks but not directly wired (intentional). |
| unknown | 286 | 68 | 354 | Hook file present but never wired to any event (orphaned source — review periodically). |

## session-bootstrap (30)

> SessionStart — context load, digest inject, env probe.

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `agent-worktree-stale-unlock` | existing | yes | T4 | SessionStart | HARNESS-AUDIT/U-TIER3/#7 (SessionStart) |
| `ai-command-awareness` | existing | yes | T4 | SessionStart | AI Command Awareness — SessionStart Hook |
| `ai-deep-intelligence` | existing | yes | T4 | SessionStart | AI Deep Intelligence — Comprehensive SessionStart Hook |
| `build-state-inject` | existing | yes | T2 | SessionStart | UserPromptSubmit + SessionStart hook. |
| `chat-state-isolator` | existing | yes | T4 | SessionStart | SessionStart hook |
| `claude-brief-inject` | existing | yes | T2 | SessionStart | SessionStart hook |
| `cognitive-budget-allocator` | existing | yes | T4 | SessionStart | U-AI06 Cognitive Budget Allocator |
| `curiosity-explorer` | existing | yes | T4 | SessionStart | U-AI05 Curiosity-Driven Explorer |
| `dotclaude-junctions-guard` | existing | yes | T4 | SessionStart | SessionStart verification for ~/.claude subfolder junctions. |
| `expert-role-inject` | existing | yes | T4 | SessionStart | SessionStart hook |
| `git-health-guard` | existing | yes | T4 | SessionStart | SessionStart guard for git repository health. |
| `git-sync-fetch` | existing | yes | T4 | SessionStart | SessionStart hook for cross-PC continuity. |
| `gsd-inject` | existing | yes | T4 | SessionStart | GSD Inject — SessionStart Hook |
| `inventory-check-guard` | existing | yes | T2 | SessionStart | UserPromptSubmit hook (U-AWARE02, refactored H9). |
| `mcp-daemon-autostart` | existing | yes | T4 | SessionStart | SessionStart Hook |
| `multi-computer-awareness` | existing | yes | T4 | SessionStart | SessionStart hook |
| `nim-autostart` | existing | yes | T4 | SessionStart | SessionStart hook |
| `ollama-autostart` | existing | yes | T4 | SessionStart | SessionStart hook |
| `output-cache-inject` | existing | yes | T4 | SessionStart | SessionStart hook |
| `plugin-path-fixer` | existing | yes | T4 | SessionStart | SessionStart hook |
| `portable-node-guard` | existing | yes | T4 | SessionStart | SessionStart verification for portable Node.js on H:. |
| `portable-python-guard` | existing | yes | T4 | SessionStart | SessionStart verification for portable Python on H:. |
| `roadmap-resume` | existing | yes | T4 | SessionStart | SessionStart hook |
| `session-handoff-load` | existing | yes | T4 | SessionStart | SessionStart hook |
| `session-id-pin` | existing | yes | T4 | SessionStart, UserPromptSubmit | Pins THIS chat's session_id to every PID in the |
| `session-start-goal-inject` | existing | yes | T4 | SessionStart | hook_session_goal_synthesis (PP-0.18 U-AGI1) |
| `session-start-zombie-reap` | existing | yes | T4 | SessionStart | SessionStart hook |
| `settings-baseline-snapshot` | existing | yes | T4 | SessionStart | SessionStart hook |
| `settings-mirror-guard` | existing | yes | T3 | SessionStart | PRISM-STAB-MS0/U-A5 (2026-05-09). |
| `tier1-context-pack` | existing | yes | T4 | SessionStart | U-CTX01 Tier-1 Always-On Context Pack |

## prompt-ingestion (12)

> UserPromptSubmit — classify intent, inject context, route prompt.

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `archived-skill-suggest` | existing | yes | T0 | UserPromptSubmit | UserPromptSubmit hook (HS-06 Phase 2 / smart-recall). |
| `auto-consensus-userprompt` | existing | yes | T2 | UserPromptSubmit | UserPromptSubmit hook. |
| `comprehensive-build-enforce` | existing | yes | T0 | UserPromptSubmit | UserPromptSubmit enforcement hook |
| `local-compute-intent` | existing | yes | T4 | UserPromptSubmit | UserPromptSubmit hook |
| `ollama-auto-router` | existing | yes | T4 | UserPromptSubmit | UserPromptSubmit hook |
| `ollama-task-offloader` | existing | yes | T4 | UserPromptSubmit | UserPromptSubmit hook |
| `prompt-context-inject` | existing | yes | T4 | UserPromptSubmit | UserPromptSubmit hook (PRISM-STAB-MS0/U-C2). |
| `prompt-rewriter-ollama` | existing | yes | T4 | UserPromptSubmit | UserPromptSubmit hook |
| `session-reorient-inject` | existing | yes | T4 | UserPromptSubmit | UserPromptSubmit hook |
| `skill-auto-trigger` | existing | yes | T2 | UserPromptSubmit | UserPromptSubmit hook (Phase D.2 of DEV-VELOCITY-AUTOTRIGGER-MS0). |
| `stale-state-warn` | existing | yes | T2 | UserPromptSubmit | UserPromptSubmit hook (one-line nudge). |
| `token-budget-gate` | existing | yes | T2 | UserPromptSubmit | Token Budget Awareness Hook |

## pre-action-gate (354)

> PreToolUse — validate the tool call before it runs (block, advise, claim).

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `acp-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `acp-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `acp-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `acp-ms2b-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `acp-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `acp-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `acp-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `acp-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `acp-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `agent-boundary-guard` | existing | yes | T1 | PreToolUse | Agent Boundary Guard Hook (PreToolUse) |
| `agent-rules-inject` | existing | yes | T1 | PreToolUse | PreToolUse hook for the Task tool |
| `agent-vs-direct` | existing | yes | T1 | PreToolUse | PreToolUse Agent |
| `ai-reasoning-inject` | existing | yes | T1 | PreToolUse | AI Reasoning Inject — PreToolUse Hook for Complex Operations |
| `ai-system-router-inject` | existing | yes | T1 | PreToolUse | AI System Router Injection Hook (PreToolUse) |
| `anti-pattern-detector` | existing | yes | T0 | PreToolUse | PreToolUse hook for Edit/Write/MultiEdit |
| `api-contract-enforcer` | existing | yes | T1 | PreToolUse | PreToolUse hook for Edit/Write/MultiEdit |
| `app-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `arch-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `arch-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `arch-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `asset-deletion-block` | existing | yes | T1 | PreToolUse | PreToolUse hook |
| `auto-consensus-critical-edit` | existing | yes | T1 | PreToolUse | PreToolUse hook for high-stakes file edits. |
| `auto-lint-post-edit` | existing | yes | T3 | PostToolUse, PreToolUse | PostToolUse hook (Edit\|Write\|MultiEdit, via posttool-edit-bundle) |
| `autonomous-loop-defer` | existing | yes | T1 | PreToolUse | PreToolUse rate-limiter ("defer") for runaway loops. |
| `ban-facade-patterns` | existing | yes | T0 | PreToolUse | PreToolUse enforcement hook |
| `bash-bundle` | existing | yes | T1 | PreToolUse | single PreToolUse hook for Bash. Replaces the 6-hook |
| `bash-destructive-guard` | existing | yes | T1 | PreToolUse | PreToolUse Bash |
| `bench-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `bench-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `bench-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `bench-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `box-audit-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `bp-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `build-create-detector` | existing | yes | T1 | PreToolUse | PreToolUse hook (U-AWARE01) |
| `c-to-h-mirror` | existing | yes | T4 | PostToolUse, PreToolUse | PostToolUse hook |
| `cad-cam-master-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cad-complete-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cad-ground-truth-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cad-training-extract-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-agi-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-dagi-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-dagi-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-dagi-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-dagi-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-dagi-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-dagi-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-dagi-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-dagi-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cadcam-deepagi-master-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cam-exhaust-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cam-ml-closedloop-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cam-parity-agi-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms0.3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms0.5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms0.7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms10-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms11-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms13-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms14-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms15-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms17-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-ms9-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p0b-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p0c-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p10-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p11-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p12-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `camx-v17-p8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ext-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ext-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ext-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ext-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ext-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ext-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ext-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms10-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms11-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cc-ms9-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms10-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms11-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms12-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms13-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms14-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms15-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms16-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms17-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ccm-ms9-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `chain-execution-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cli-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `code-completeness-gate` | existing | yes | T0 | PreToolUse | PreToolUse hook for Edit/Write |
| `commit-ownership-guard` | existing | yes | T0 | PreToolUse | Prevents cross-session commit mixing. |
| `consistent-return-checker` | existing | yes | T1 | PreToolUse | PreToolUse hook for Edit/Write/MultiEdit |
| `cpl-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `db-exp-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `db-exp-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `db-exp-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `db-exp-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `db-exp-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `dedup-auto-invoke` | existing | yes | T1 | PreToolUse | PreToolUse hook (HOOK-SYNERGY-MS0 / U-HOOK-COMPRESS H9) |
| `directive-summary-refresh-iooms` | existing | yes | T4 | PostToolUse, PreToolUse | directive-summary-refresh.mjs — PostToolUse hook |
| `dispatcher-import-validator` | existing | yes | T3 | PostToolUse, PreToolUse | PostToolUse hook |
| `duplication-hard-block` | existing | yes | T0 | PreToolUse | PreToolUse hook (U-AWARE07) |
| `edit-batch-detector` | existing | yes | T3 | PostToolUse, PreToolUse | PostToolUse Edit |
| `edit-bundle` | existing | yes | T0 | PostToolUse, PreToolUse | single PreToolUse hook that runs all Edit/Write/MultiEdit |
| `edit-multiedit-suggest` | existing | yes | T3 | PostToolUse, PreToolUse | PostToolUse Edit |
| `edit-old-string-verify` | existing | yes | T1 | PreToolUse | PreToolUse Edit |
| `eigc-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms0a-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms10-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `eigc-ms9-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `elec-pipe-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `elec-pipe-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `elec-pipe-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `encoding-guard` | existing | yes | — | PostToolUse, PreToolUse | PreToolUse hook (Phase A.3 of DEV-VELOCITY-AUTOTRIGGER-MS0). |
| `f360-ap-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ap-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ap-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ap-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ap-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-full-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-full-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-full-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-full-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-full-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-full-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-full-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-full-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms10-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms11-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms12-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `f360-rev-ms9-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `figma-ui-consistency` | existing | yes | T1 | PreToolUse | PreToolUse hook |
| `file-ownership-tracker` | existing | yes | T1 | PreToolUse | Tracks which session is editing which files. |
| `file-read-cache` | existing | yes | T4 | PreCompact, PreToolUse | PreToolUse:Read hard-dedup hook |
| `fmerge-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `fmerge-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `fmerge-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `git-lock-sweeper` | existing | yes | T2 | PreToolUse | HS-02 mid-session stale-lock cleanup. |
| `glob-narrow-path` | existing | yes | T1 | PreToolUse | PreToolUse Glob |
| `grep-index-first` | existing | yes | T1 | PreToolUse | PreToolUse Grep |
| `hm-kc-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms10-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-kc-ms9-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-plg-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-plg-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-plg-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-plg-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-plg-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-plg-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-plg-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hm-plg-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `hook-creation-gate` | existing | yes | T0 | PreToolUse | PreToolUse(Write) advisory dedup gate |
| `hook-cross-worktree-block` | existing | yes | T0 | PreToolUse | Tier-0 PreToolUse firewall |
| `hook-tier-validator` | existing | yes | T1 | PreToolUse | HOOK-SYNERGY-MS0 / U-HOOK-TIERS (H3) |
| `html-companion-guard` | existing | yes | T0 | PreToolUse | per-commit guard for HTML spec/research companions. |
| `import-verifier` | existing | yes | T1 | PreToolUse | PreToolUse hook for Edit/Write/MultiEdit |
| `ingestion-cache-root-guard` | existing | yes | T0 | PostToolUse, PreToolUse | CAM-UIX-INFRA-00/U-CACHEROOT01 |
| `integ-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `intent-classification-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `inventory-on-write` | existing | yes | T3 | PostToolUse, PreToolUse | Inventory On-Write — PostToolUse hook |
| `jm-die-provenance-guard` | existing | yes | T0 | PostToolUse, PreToolUse | CAM-UIX-INFRA-00/U-JMDP01 guard hook |
| `kar-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `l8-p0-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `l8-p1-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `l8-p2-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `l9-p2-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `laser-pipe-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `laser-pipe-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `laser-pipe-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-lora-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-master-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms0.5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-pro-ms-1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `lathe-prod-ready-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `machining-intelligence-orchestrator-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `magic-number-detector` | existing | yes | T1 | PreToolUse | PreToolUse hook for Edit/Write/MultiEdit |
| `master-index-search-gate` | existing | yes | T1 | PreToolUse | PreToolUse hook (U-AWARE03) |
| `mcp-connection-coordinator` | existing | yes | T1 | PreToolUse | PreToolUse hook |
| `mcp-route-suggest` | existing | yes | T4 | PreToolUse | mcp-route-suggest.mjs |
| `memory-mirror-to-vault` | existing | yes | T3 | PostToolUse, PreToolUse | PostToolUse hook |
| `memory-relevance-inject` | existing | yes | T1 | PreToolUse | PreToolUse hook for Edit/Write/MultiEdit. |
| `mf-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mf-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mf-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mf-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mf-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms0a-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms10-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms8-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `mxu-ms9-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `node-process-janitor` | existing | yes | T3 | PreToolUse | Node Process Janitor — PreToolUse \`.*\` (hot path) + scheduled \`--full\` (backstop) |
| `ollama-route-pretooluse` | existing | yes | T1 | PreToolUse | PreToolUse:Read — route trivial bulk reads at the local LLM. |
| `operator-approval-gate-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `opus47-full-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `p2p-fullstack-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pcca-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pcca-ms0a-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pcca-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pcca-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pcca-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pdf-ext-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pdf-ext-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `physics-canonical-constants-guard` | existing | yes | T0 | PostToolUse, PreToolUse | CAM-UIX-INFRA-00/U-PHYSCONST01 |
| `pipe-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `posttool-edit-bundle` | existing | yes | T3 | PostToolUse, PreToolUse | single PostToolUse hook (matcher: Edit\|Write\|MultiEdit). |
| `pp-moat-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pp-moat-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pp-moat-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pp-rev-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pp-rev-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pp-rev-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pre-commit-scenario-smoke.mjs` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pre-edit-lane-guard.mjs (P5-U01)` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pre-shop-floor-commit-consensus.mjs (P4-U03)` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pre-write-roadmap-home.mjs (P0-U01)` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `precompact-auto-trigger` | existing | yes | T0 | PostToolUse, PreToolUse | Enforce /precompact at 160K tokens. |
| `prism-agent-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `prism-max-roadmap-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `prism-product-roadmap-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `proactive-machining-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `prod-gate-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `read-already-have` | existing | yes | T3 | PreToolUse | PreToolUse Read |
| `read-auto-limit` | existing | yes | T1 | PreToolUse | PreToolUse Read |
| `read-bundle` | existing | yes | T1 | PreToolUse | single PreToolUse hook for Read. Replaces the 4-hook |
| `read-once-cache` | existing | yes | T3 | PostToolUse, PreToolUse | PreToolUse Read hook. |
| `recall-counter-track` | existing | yes | T3 | PostToolUse, PreToolUse | PostToolUse hook for Read events on vault files |
| `res-roadmap-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `rtk-auto-suggest` | existing | yes | T1 | PreToolUse | PreToolUse Bash |
| `rx-ms0-resource-extraction-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `safety-veto-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `scimath-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `scimath-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `scimath-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `scimath-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `scimath-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `scimath-ms6-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `scimath-ms7-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `settings-json-addonly-guard` | existing | yes | T0 | PreToolUse | PreToolUse(Edit\|Write) guard |
| `sim-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `sinker-full-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `sinker-full-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `task-created-claim-guard` | existing | yes | T1 | PreToolUse | PreToolUse(TaskCreate) → deny duplicate task creation across chats. |
| `tc-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `test-coverage-enforcer` | existing | yes | T1 | PreToolUse | PreToolUse hook for Write (new files) |
| `test-legitimacy` | existing | yes | T0 | PreToolUse | Phase 1 Tier 5D Workflow Hook |
| `tool-watchdog` | existing | yes | T3 | PostToolUse, PreToolUse | HS-12 + HS-15 tool-call runtime monitor. |
| `tribal-autowire` | existing | yes | T4 | PostToolUse, PreToolUse | L6 of TRIBAL × AI |
| `tribal-inject-on-edit` | existing | yes | T1 | PreToolUse | L4 of TRIBAL × AI |
| `tribal-knowledge-authority-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `tribal-spike` | existing | yes | T1 | PreToolUse | Tribal Spike |
| `type-safety-checker` | existing | yes | T1 | PreToolUse | PreToolUse hook for Edit/Write/MultiEdit |
| `ult-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ult-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ult-ms3-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ult-ms4-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ult-ms5-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `unified-edit-tap` | existing | yes | T3 | PostToolUse, PreToolUse | PRISM-STAB-MS0/U-D2 (2026-05-10). |
| `unified-orchestrator-integration-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ussh-opus47-bolster-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `v6-intelligence-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `v6-roadmap-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `vid-ext-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `vid-ext-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `vid-ext-ms2-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `water-pipe-ms0-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `water-pipe-ms1-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-collision-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-e2e-ci-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-hardcoded-default-guard` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-pcd-conductivity-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-predictor-mae-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-production-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-program-safety-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-tier6-geom-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-unit-tag-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-v2-scope-gate` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `work-claim` | existing | yes | T1 | PreToolUse | Claim Work Before Starting |
| `worktree-commit-route` | existing | yes | T0 | PreToolUse | PreToolUse(Bash) worktree-routing enforcement |
| `write-import-check` | existing | yes | T3 | PostToolUse, PreToolUse | PostToolUse Write |
| `write-tracker` | existing | yes | T3 | PostToolUse, PreToolUse | PostToolUse Write/Edit |

## post-action-observe (22)

> PostToolUse — telemetry / linting / read-cache after a tool ran.

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `agent-pid-tracker` | existing | yes | T4 | PostToolUse | PostToolUse hook for Agent |
| `dsl-output-compressor` | existing | yes | T3 | PostToolUse | PostToolUse hook (any tool). |
| `efficiency-monitor` | existing | yes | T3 | PostToolUse | Efficiency Monitor — PostToolUse Hook |
| `error-learner-hook` | existing | yes | T3 | PostToolUse | Error Learner Hook — PostToolUse Hook |
| `error-recovery-memory` | existing | yes | T3 | PostToolUse | PostToolUse (all tools) |
| `git-output-condenser` | existing | yes | T3 | PostToolUse | PostToolUse Bash hook. |
| `grep-result-cache` | existing | yes | T3 | PostToolUse | PostToolUse Grep |
| `hook-registry-regen` | existing | yes | T2 | PostToolUse | PostToolUse:Edit\|Write\|MultiEdit (HOOK-SYNERGY-MS0 / U-H1 step-4). |
| `loop-detector` | existing | yes | T3 | PostToolUse | PostToolUse hook (any tool). |
| `mcp-safety-bridge` | existing | yes | T3 | PostToolUse | PostToolUse(Edit\|Write\|MultiEdit) → physics edit ⇒ run the safety validator. |
| `meta-learning-trigger` | existing | yes | T3 | PostToolUse | Meta-Learning Trigger — PostToolUse Hook |
| `npm-output-condenser` | existing | yes | T3 | PostToolUse | PostToolUse Bash hook. |
| `ollama-terminal-watcher` | existing | yes | T3 | PostToolUse | PostToolUse hook |
| `path-shortener` | existing | yes | T4 | PostToolUse | PostToolUse hook (any tool). |
| `permission-denied-retry` | existing | yes | T3 | PostToolUse | PostToolUse classifier for denied / failed tool calls. |
| `post-recommendation-capture` | existing | yes | T3 | PostToolUse | PostToolUse hook for U-LEARN-01. |
| `post-tool-batch-budget` | existing | yes | T3 | PostToolUse | PostToolUse — alarm when a session is burning through the tool budget. |
| `posttool-bash-read-bundle` | existing | yes | T3 | PostToolUse | single PostToolUse hook (matcher: Bash\|Read). |
| `posttool-error-explain` | existing | yes | T3 | PostToolUse | PostToolUse Bash hook |
| `system-viz-live-bridge` | existing | yes | T3 | PostToolUse | PostToolUse(Edit\|Write\|MultiEdit) → ping the live system-viz. |
| `tsc-error-dedup` | existing | yes | T3 | PostToolUse | PostToolUse Bash hook. |
| `vitest-output-condenser` | existing | yes | T3 | PostToolUse | PostToolUse Bash hook. |

## subagent-lifecycle (2)

> SubagentStart + SubagentStop — push context, verify deliverables.

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `subagent-start-context` | existing | yes | T4 | SubagentStart | SubagentStart hook |
| `subagent-stop-verifier` | existing | yes | T0 | SubagentStop | SubagentStop hook: verify a subagent's deliverable claims. |

## session-teardown (31)

> Stop — scrutiny gate, handoff, unwired-asset block.

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `always-build-guard` | existing | yes | T4 | Stop | Stop hook to enforce task completion before session end |
| `claim-registry-release` | existing | yes | T4 | Stop | Stop / SessionEnd hook — release this terminal's claims so peers can |
| `commit-pressure-stop-gate` | existing | yes | T4 | Stop | Proactive memory-pressure gate with self-heal |
| `duplication-guard-stop` | existing | yes | T4 | Stop | Stop hook |
| `enforce-roadmap-closeout` | existing | yes | T0 | Stop | Stop hook |
| `git-sync-stop` | existing | yes | T4 | Stop | Stop hook for cross-PC continuity. |
| `linear-roadmap-sync` | existing | yes | T4 | SessionStart, Stop | SessionStart + Stop hooks |
| `output-cache-capture` | existing | yes | T4 | Stop | Stop hook |
| `quality-dashboard-alert` | existing | yes | T0 | PreCompact, Stop | Stop + PreCompact hook |
| `roadmap-checkpoint` | existing | yes | T4 | Stop | Stop hook |
| `session-consolidate-graph` | existing | yes | T4 | Stop | SessionEnd / Stop hook |
| `session-end-peer-share` | existing | yes | T4 | Stop | hook_post_session_peer_share (PP-0.18 U-AGI14) |
| `stop_close_prism_nodes` | existing | yes | T4 | Stop | Stop hook |
| `stop_close_prism_nodes_v2` | existing | yes | T4 | Stop | PRISM-STAB-MS0/U-A3 (2026-05-09). |
| `stop_on_broken_imports` | existing | yes | T4 | Stop | Tier 6 Stop Hook (IMPROVED) |
| `stop_on_build_error` | existing | yes | T4 | Stop | Tier 6 Stop Hook |
| `stop_on_c_drive_write` | existing | yes | T0 | Stop | Stop Hook |
| `stop_on_cutting_calculation_protocol` | existing | yes | T4 | Stop | stop_on_cutting_calculation_protocol.mjs |
| `stop_on_duplicate_created` | existing | yes | T4 | Stop | Tier 6 Stop Hook |
| `stop_on_failing_tests` | existing | yes | T0 | Stop | Stop Hook (SAFETY-CRITICAL, FAIL-CLOSED) |
| `stop_on_hook_unregistration` | existing | yes | T4 | Stop | Stop hook |
| `stop_on_orphan_children` | existing | yes | T4 | Stop | Tier 6 Stop Hook |
| `stop_on_skill_unwired` | existing | yes | T4 | Stop | Tier 6 Stop Hook |
| `stop_on_svi_regression` | existing | yes | T4 | Stop | Tier 6 Stop Hook |
| `stop_on_unsafe_gcode` | existing | yes | T4 | Stop | Tier 6 Stop Hook (IMPROVED) |
| `stop_on_unwired_assets` | existing | yes | T0 | Stop | Stop Hook |
| `stop-auto-wire` | existing | yes | T3 | Stop | Stop hook |
| `stop-consensus-drain` | existing | yes | T4 | Stop | Stop hook that triggers async consensus queue drain. |
| `stop-mark-completed-tasks` | existing | yes | T4 | Stop | Stop hook |
| `stop-obsidian-memory-extract` | existing | yes | T4 | Stop | Stop Hook |
| `supabase-state-sync` | existing | yes | T4 | SessionStart, Stop | SessionStart + Stop hooks |

## context-handoff (4)

> PreCompact — capture state before context compaction.

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `claude-brief-precompact` | existing | yes | T4 | PreCompact | PreCompact hook |
| `compression-precompact` | existing | yes | T4 | PreCompact | Context Compression Before Compact |
| `octopus-provider-probe` | existing | yes | T4 | PreCompact | SessionStart hook |
| `precompact-pending-guard` | existing | yes | T4 | PreCompact | Warn about pending work before compact |

## infrastructure (3)

> Bundle hosts, envelopes, profiling shims — wrapped by other hooks but not directly wired (intentional).

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `_envelope` | existing | no | T3 | — | HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4) |
| `sessionstart-bundle` | existing | no | T4 | — | single SessionStart hook for the context-injector / |
| `stop-bundle` | existing | no | T4 | — | single Stop hook that runs the NON-BLOCKING Stop trackers. |

## unknown (354)

> Hook file present but never wired to any event (orphaned source — review periodically).

| Hook | Kind | Wired | Tier | Events | Description |
|------|------|-------|------|--------|-------------|
| `advisor-auto-enable` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `agent-registry-load` | existing | no | T4 | — | SessionStart hook — surfaces Task-tool agent registry (AGENT_REGISTRY.json) |
| `agent-usage-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `agent-util-log` | existing | no | T4 | — | PostToolUse hook — Task-tool invocation ledger. |
| `agentic-loop-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `aggressive-killer-stop` | existing | no | T4 | — | Stop hook wrapper around 06-aggressive-killer.mjs. |
| `agi-safety-envelope-guard` | existing | no | T0 | — | PreToolUse hook (U-LTH62) |
| `ai-auto-command-router` | existing | no | T4 | — | AI Auto-Command Router — UserPromptSubmit Hook |
| `ai-duplication-guard` | existing | no | T0 | — | AI Duplication Guard — PreToolUse Hook (Phase 0.1 Fix) |
| `ai-feature-recommend` | existing | no | T4 | — | UserPromptSubmit hook (U-AWARE06). |
| `ai-recommendation-validator.mjs — validates AI outputs against physics + tribal knowledge` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ai-session-sync` | existing | no | T4 | — | AI Session Sync — Stop Hook |
| `ai-system-activate` | existing | no | T4 | — | AI System Activation — SessionStart Hook |
| `allow-superseding` | existing | no | T0 | — | Phase 1 Tier 5B |
| `anti-regression-auto-sweep` | existing | no | T3 | — | PostToolUse hook |
| `appdata-junction-guard` | existing | no | T4 | — | SessionStart enforcement for the AppData→H: junction. |
| `appw-commerce-modal-coverage` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `appw-page-sweep-coverage` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `appw-theme-convergence` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `async-pattern-checker` | existing | no | T1 | — | PreToolUse hook for Edit/Write/MultiEdit |
| `auto-bug-hunt-after-build` | existing | no | T3 | — | PostToolUse:Bash hook. |
| `auto-fork-executor` | existing | no | T0 | — | PreToolUse(Bash for git commit) auto-fork hook. |
| `auto-fork-executor.mjs (P5-U02)` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `auto-ingest-on-build` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `auto-postmortem-on-failure-restart` | existing | no | T4 | — | Stop hook |
| `auto-precompact-watchdog` | existing | no | T4 | — | UserPromptSubmit hook |
| `auto-record-tool-call` | existing | no | T3 | — | PostToolUse hook |
| `autonomous-loop-watchdog` | existing | no | T0 | — | Stop hook for autonomous yolo-mode runs. |
| `awareness-bootstrap` | existing | no | T4 | — | Phase 0.13 Awareness Bootstrap |
| `awareness-snapshot` | existing | no | T4 | — | Awareness Snapshot Hook — AI-AWARE-HARDEN/U-AWR11 |
| `awareness-snapshot-inject` | existing | no | T2 | — | SessionStart injector |
| `bash-orphan-cleaner` | existing | no | T4 | — | Stop hook that kills orphaned bash.exe subprocesses |
| `bash-result-cache` | existing | no | T1 | — | Bash Result Cache — PreToolUse Hook |
| `blueprint-accuracy-guard` | existing | no | T4 | — | PostToolUse hook |
| `cad-accuracy-gate` | existing | no | T3 | — | PostToolUse hook |
| `cad-coverage-auto-refresh` | existing | no | T4 | — | SessionStart hook — CAD_COVERAGE_MATRIX.json staleness-gated refresh. |
| `cad-coverage-surface` | existing | no | T4 | — | SessionStart hook — surfaces CAD_COVERAGE_MATRIX.json so every session |
| `cad-geometry-validation` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cad-graph-integrity` | existing | no | T3 | — | CADCAM-DAGI-MS0/U-DAGI02 guard hook |
| `cad-token-vocabulary-guard` | existing | no | T3 | — | CADCAM-DAGI-MS0/U-DAGI01 guard hook |
| `cad-unknown-ext-surface` | existing | no | T4 | — | SessionStart hook — UNKNOWN_CAD_EXTENSIONS.jsonl surface. |
| `cadence-knowledge-reindex` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cam-input-completeness-guard.mjs (CAM-UIX-INFRA-01 U-LP03)` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `canonical-constants` | existing | no | T4 | — | Phase 1 Tier 5C Physics Hook |
| `capability-index-refresh` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `capability-manifest-surface` | existing | no | T4 | — | SessionStart hook — CAPABILITY_MANIFEST.json freshness + surface. |
| `capability-reminder` | existing | no | T4 | — | Capability Reminder — UserPromptSubmit Hook |
| `chat-bus-inject` | existing | no | T2 | — | UserPromptSubmit hook |
| `chat-cleanup-on-stop` | existing | no | T4 | — | Stop hook |
| `chat-slot-heartbeat` | existing | no | T4 | — | PostToolUse hook (all matchers) |
| `checkpoint-auto-trigger` | existing | no | T3 | — | Context Retention Hook |
| `claim-registry-precompact` | existing | no | T4 | — | PreCompact hook — flush this terminal's active claims to status=compacted |
| `claim-registry-surface` | existing | no | T4 | — | SessionStart hook — surfaces other sessions' active roadmap claims in |
| `claim-required` | existing | no | T0 | — | Phase 1 Tier 5D |
| `claude-brief-staleness-check` | existing | no | T2 | — | UserPromptSubmit hook |
| `claude-md-mirror` | existing | no | T4 | — | SessionStart: mirror H:\.claude\CLAUDE.md → ~/.claude/CLAUDE.md. |
| `claudemd-ollama-enforcer` | existing | no | T4 | — | UserPromptSubmit hook |
| `claudemd-section-update` | existing | no | T3 | — | PostToolUse hook |
| `cli-agent-audit-log` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cli-plugin-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `coding-pattern-hint` | existing | no | T4 | — | Coding Standards Auto-Inject |
| `cog-bridge-ai-memory-capture` | existing | no | T3 | — | COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH10 |
| `cog-bridge-awareness-rebuild` | existing | no | T3 | — | COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH10 |
| `cog-bridge-context-auto-compact` | existing | no | T2 | — | COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH10 |
| `commit-draft-suggest` | existing | no | T1 | — | OLLAMA-DEV-03 |
| `compact-interval-warning` | existing | no | T4 | — | Stop |
| `compaction-budget-nudge` | existing | no | T3 | — | PostToolUse hook |
| `compaction-survival-auto` | existing | no | T3 | — | PostToolUse hook |
| `complexity-gate` | existing | no | T1 | — | PreToolUse hook for Edit/Write/MultiEdit |
| `context-priority-coordinator` | existing | no | T4 | — | UserPromptSubmit hook |
| `continuous-learning-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `coordination-startup-banner` | existing | no | T4 | — | coordination-startup-banner.mjs (U-COORD06) |
| `coordination-update-reminder` | existing | no | T3 | — | Coordination Update Reminder Hook (PostToolUse for Bash git commit) |
| `corpus-integrity` | existing | no | T3 | — | CADCAM-DAGI-MS0/U-DAGI03 guard hook |
| `cost-ceiling-stop` | existing | no | T0 | — | Stop hook. |
| `critical-file-guard` | existing | no | T0 | — | Phase 0.16 Safety-Critical File Guard |
| `cross-chat-directive-detector` | existing | no | T2 | — | UserPromptSubmit hook. |
| `cross-chat-directive-detector.mjs (P5-U03)` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `cross-session-awareness` | existing | no | T1 | — | Force Cross-Session Visibility |
| `cross-terminal-conflict` | existing | no | T0 | — | Phase 1 Tier 5D |
| `customer-directory-watcher` | existing | no | T4 | — | U-CUC05 Stop hook |
| `dead-pixel-guard` | existing | no | T4 | — | dead-pixel-guard.mjs (SessionStart advisory hook) |
| `decision-capture` | existing | no | T3 | — | Decision Capture — PostToolUse Hook |
| `deep-reasoning-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `dep-graph-impact` | existing | no | T0 | — | Phase 1 Tier 5D |
| `dev-outcome-tracker` | existing | no | T3 | — | Dev Outcome Tracker — PostToolUse Hook (Bash) |
| `dfm-block` | existing | no | T3 | — | PostToolUse hook |
| `directive-summary-refresh` | existing | no | T3 | — | directive-summary-refresh.mjs |
| `discipline-expert-inject` | existing | no | T4 | — | UserPromptSubmit hook |
| `doc-cascade` | existing | no | T4 | — | Phase 0.15 Documentation Cascade |
| `doc-freshness-check` | existing | no | T4 | — | Phase 0.15 Documentation Freshness Check |
| `document-preserve-guard` | existing | no | T0 | — | Document Preservation Guard — Stop Hook |
| `embed-vault-on-save` | existing | no | T3 | — | embed-vault-on-save.mjs |
| `embedder-inject-qdrant` | existing | no | T4 | — | SessionStart smoke test for Qdrant embedder |
| `embedding-cache-guard` | existing | no | T4 | — | PostToolUse hook |
| `enforce-handoff-topic` | existing | no | T4 | — | Stop hook |
| `erp-quote-variance-guard` | existing | no | T0 | — | PreToolUse hook (U-LTH57 P5) |
| `error-block-capture` | existing | no | T0 | — | PostToolUse hook. |
| `error-block-prewarn` | existing | no | T4 | — | PreToolUse hook. |
| `error-pattern-learner` | existing | no | T3 | — | dual-mode hook. |
| `error-pattern-memory` | existing | no | T3 | — | PostToolUse Hook (Bash, Edit, Write) |
| `error-pattern-promote` | existing | no | T4 | — | Stop hook. |
| `excel-data-validation` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `extended-thinking-auto` | existing | no | T4 | — | Extended Thinking Auto-Switch — UserPromptSubmit Hook |
| `extraction-log-drift` | existing | no | T4 | — | Phase 1 Tier 5B |
| `extraction-to-tribal` | existing | no | T3 | — | Extraction to Tribal Knowledge — PostToolUse Hook |
| `file-claim-commit-guard` | existing | no | T0 | — | PreToolUse Bash hook |
| `file-claim-guard` | existing | no | T0 | — | PreToolUse hook for Edit \| Write \| MultiEdit |
| `fix-stdin-pattern` | existing | no | T0 | — | Batch fix /dev/stdin pattern in hooks for Windows compatibility. |
| `forge-intent-claim` | existing | no | T0 | — | Phase 1 Tier 5D |
| `formula-algorithm-suggest` | existing | no | T4 | — | Formula & Algorithm Suggest — UserPromptSubmit Hook |
| `fusion-cam-write-safety — validate CAM writes against machine envelope before execution` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `git-anti-clobber` | existing | no | T3 | — | Git Anti-Clobber Hook — PreToolUse (Worktree-Aware v2) |
| `git-anti-clobber-release` | existing | no | T3 | — | Git Anti-Clobber Release — PostToolUse (Worktree-Aware v2) |
| `git-commit-checkin` | existing | no | T1 | — | PreToolUse check-in on git commit/push |
| `goal-stack-init` | existing | no | T4 | — | Phase 0.13 Goal Stack Initialization |
| `goal-stack-inject` | existing | no | T4 | — | Phase 0.13 Goal Stack Injection Hook |
| `gsd-section-retrieve` | existing | no | T2 | — | UserPromptSubmit hook |
| `gsd-section-update` | existing | no | T3 | — | PostToolUse hook |
| `h-drive-audit` | existing | no | T4 | — | H: Drive Audit Hook — SessionStart |
| `h-drive-enforcement` | existing | no | T1 | — | H: Drive Enforcement Hook — PreToolUse |
| `harness-audit-staleness` | existing | no | T2 | — | SessionStart hook. |
| `hook-basin-drift` | existing | no | T3 | — | hook_basin_drift — USSH Phase 0.25 |
| `hook-circular-dep-check` | existing | no | T4 | — | hook_circular_dep_check — USSH Phase 0.25 |
| `hook-condition-number` | existing | no | T3 | — | hook_condition_number — USSH Phase 0.25 |
| `hook-modification-justification` | existing | no | T0 | — | PreToolUse:Edit\|Write\|MultiEdit gate. |
| `hook-saturation-alert` | existing | no | T3 | — | hook_saturation_alert — USSH Phase 0.25 |
| `hook-stability-check` | existing | no | T3 | — | hook_stability_check — USSH Phase 0.25 |
| `hook-tla-invariant` | existing | no | T4 | — | hook_tla_invariant — USSH Phase 0.25 |
| `inbox-capture-sharpen` | existing | no | T3 | — | PostToolUse hook |
| `inbox-lag-advisory` | existing | no | T4 | — | Stop hook |
| `inventory-refresh` | existing | no | T4 | — | Inventory Refresh — SessionStart hook |
| `iterate-retrieve-suggest` | existing | no | T1 | — | PreToolUse hook for Agent tool calls. |
| `json-read-summarizer` | existing | no | T1 | — | PreToolUse large-JSON preview |
| `karpathy-discipline-inject` | existing | no | T4 | — | SessionStart hook |
| `kienzle-coeff-check` | existing | no | T4 | — | Phase 1 Tier 5C Physics Hook |
| `lathe-master-post-quality-gate` | existing | no | T4 | — | UserPromptSubmit hook |
| `lathe-p2p-suggest` | existing | no | T4 | — | UserPromptSubmit hook |
| `leave-a-copy-behind-guard` | existing | no | T0 | — | Stop hook |
| `literature-citation` | existing | no | T4 | — | Phase 1 Tier 5C Physics Hook |
| `llm-efficiency-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `managed-block-guard` | existing | no | T4 | — | Phase 0.15 Managed Block Guard |
| `master-coder-protocol` | existing | no | T4 | — | UserPromptSubmit hook |
| `master-index-precheck-inject` | existing | no | T2 | — | UserPromptSubmit injector |
| `mcp-config-resolve` | existing | no | T4 | — | Regenerate ~/.claude/.mcp.json with PC-specific node.exe path. |
| `memory-persist-on-compact` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `memory-rag-inject` | existing | no | T2 | — | UserPromptSubmit hook |
| `memory-system-init` | existing | no | T4 | — | Memory System Init — SessionStart Hook |
| `metacognition-check` | existing | no | T1 | — | Phase 0.13 Metacognition Budget Check |
| `mio-proactive-intelligence` | existing | no | T3 | — | MIO Proactive Intelligence — Auto-Fire Hook |
| `mirror-c-to-h` | existing | no | T3 | — | PostToolUse hook |
| `multi-session-awareness` | existing | no | T1 | — | PreToolUse hook |
| `naming-convention-enforcer` | existing | no | T1 | — | PreToolUse hook for Edit/Write/MultiEdit |
| `neural-ai-optimizer` | existing | no | T4 | — | Neural AI Optimizer — UserPromptSubmit Hook |
| `neural-architecture-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `neural-cad-validation` | existing | no | T3 | — | PostToolUse hook |
| `neural-model-retrain-weekly` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `neural-roadmap-resume-detect` | existing | no | T4 | — | neural-roadmap-resume-detect.mjs |
| `no-re-extract` | existing | no | T0 | — | Phase 1 Tier 5B |
| `no-silent-catch` | existing | no | T4 | — | Phase 1 Tier 5D Workflow Hook |
| `node-orphan-cleaner` | existing | no | T4 | — | Stop hook closeout orchestrator. |
| `ollama-context-aggregator` | existing | no | T4 | — | Single UserPromptSubmit injection point |
| `ollama-engine-api-extractor` | existing | no | T1 | — | PreToolUse hook on Read of engine source files. |
| `ollama-obsidian-rag` | existing | no | T4 | — | UserPromptSubmit hook |
| `ollama-prism-intelligence` | existing | no | T4 | — | UserPromptSubmit hook |
| `ollama-reviewer-second-opinion` | existing | no | T0 | — | PreToolUse hook on Bash for \`git commit\`. |
| `ollama-route-recommender` | existing | no | T4 | — | UserPromptSubmit hook |
| `ollama-schema-engine-sync-gate` | existing | no | T0 | — | PreToolUse hook on Edit/Write of schema files. |
| `ollama-session-continuity` | existing | no | T4 | — | PreCompact hook |
| `ollama-skill-suggester` | existing | no | T4 | — | UserPromptSubmit hook |
| `ollama-unified-semantic-router` | existing | no | T4 | — | UserPromptSubmit hook |
| `omega-floor` | existing | no | T1 | — | Phase 1 Tier 5D Workflow Hook |
| `on-extraction-complete-wire` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `on-extraction-validate-quality` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `on-resource-file-added` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `on-session-start-resource-scan` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `optimal-context-inject` | existing | no | T4 | — | Optimal Context Inject — UserPromptSubmit Hook |
| `orphan-engine-detector` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `orphan-engine-detector — warns when new engines are created without dispatcher wiring` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `orphan-type-detector` | existing | no | T3 | — | Phase 0.9 Specific Orphan Type Detection |
| `path-frequency-tracker` | existing | no | T3 | — | PostToolUse Read/Edit/Write |
| `performance-pattern-detector` | existing | no | T1 | — | PreToolUse hook for Edit/Write/MultiEdit |
| `periodic-checkin` | existing | no | T4 | — | UserPromptSubmit periodic heartbeat + chat poll |
| `planning-algorithm-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `plugin-inventory-surface` | existing | no | T4 | — | SessionStart hook — surfaces PLUGIN_INVENTORY.json (MCP servers + |
| `post-extract-sync` | existing | no | T3 | — | Post-Extract Sync Hook — AI-AWARE-HARDEN/U-AWR24 |
| `post-pipeline-integrity-check` | existing | no | T4 | — | post-pipeline-integrity-check.mjs (CPP-MS5-U-CPP34) |
| `post-tool-p1` | existing | no | T4 | — | Phase 1 Tier 0 |
| `postgen-validator-skip-guard` | existing | no | T0 | — | postgen-validator-skip-guard.mjs |
| `posttool-bayesian-update` | existing | no | T4 | — | U-AI02 Bayesian Posterior Update |
| `posttool-curiosity-tick` | existing | no | T4 | — | hook_idle_curiosity_v2 (PP-0.18 U-AGI5) |
| `posttool-emergence-scan` | existing | no | T4 | — | hook_emergence_scan (PP-0.18 U-AGI11) |
| `posttool-mcp-backend-audit` | existing | no | T3 | — | posttool-mcp-backend-audit.mjs |
| `pp-dialect-completeness — warns when a dialect is missing rigid_tap, probing, or threading cycles` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pp-engine-wiring-check — blocks PP edits that duplicate existing engine logic inline instead of calling the engine` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pp-learning-loop-check — blocks PP edits that hardcode values that should come from calibrated constants` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pp-registry-check — blocks PP engine edits that add hardcoded material/machine/tool defaults instead of registry lookups` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `ppg-ux-quality — warns if PPG page edits remove file I/O or clipboard functionality` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `pre-commit-conflict-sim` | existing | no | T0 | — | hooks/pre-commit-conflict-sim.mjs |
| `pre-compact-p1` | existing | no | T4 | — | Phase 1 Tier 0 |
| `pre-delete-guard` | existing | no | T0 | — | Phase 0.8 Delete Guard Hook |
| `pre-edit-impact-analyzer` | existing | no | T1 | — | DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass. |
| `pre-edit-lane-guard` | existing | no | T0 | — | PreToolUse(Edit \| Write \| MultiEdit) lane gate. |
| `pre-flight-check` | existing | no | T1 | — | Pre-Flight Check — PreToolUse Hook |
| `pre-rename-guard` | existing | no | T0 | — | Phase 0.8 Rename Guard Hook |
| `pre-tool-p1` | existing | no | T0 | — | Phase 1 Tier 0 |
| `pre-write-roadmap-home` | existing | no | T4 | — | DEFERRED IMPLEMENTATION — temporary no-op stub. |
| `precompact-dossier` | existing | no | T4 | — | U-CTX03 Rich PreCompact Dossier |
| `precompact-stale-prune-suggest` | existing | no | T4 | — | PreCompact hook |
| `pretool-causal-trace` | existing | no | T1 | — | hook_pre_tool_causal_trace (PP-0.18 U-AGI2) |
| `pretool-change-radius` | existing | no | T4 | — | PreToolUse Write\|Edit hook |
| `pretool-context-forecast` | existing | no | T4 | — | PreToolUse hook |
| `pretool-gap-predictor` | existing | no | T4 | — | PreToolUse Write\|Edit hook |
| `pretool-world-simulator` | existing | no | T4 | — | U-AI01 WorldSimulator PreTool Hook |
| `prism-awareness-cache` | existing | no | T2 | — | SessionStart hook |
| `prism-awareness-v2` | existing | no | T4 | — | SessionStart hook |
| `prism-http-autostart` | existing | no | T2 | — | SessionStart hook |
| `prism-intelligence-briefing` | existing | no | T4 | — | PRISM Intelligence Briefing — SessionStart Hook |
| `probabilistic-reasoning-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `prompt-rules-inject` | existing | no | T2 | — | UserPromptSubmit hook |
| `protect-document-content` | existing | no | T4 | — | Protect Document Content |
| `publish-pipeline-metrics` | existing | no | T4 | — | publish-pipeline-metrics.mjs (CPP-MS5-U-CPP37) |
| `quality-dashboard-inject` | existing | no | T2 | — | Quality Dashboard Inject — UserPromptSubmit Hook |
| `rag-relevance-guard` | existing | no | T3 | — | PostToolUse hook |
| `reasoning-calibration-weekly` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `reasoning-completeness` | existing | no | T3 | — | PostToolUse hook |
| `reasoning-quality-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `reasoning-trace-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `reference-inject` | existing | no | T4 | — | UserPromptSubmit hook |
| `reference-value-injector` | existing | no | T4 | — | UserPromptSubmit hook |
| `reviewer-fail-latch` | existing | no | T0 | — | Stop hook. |
| `roadmap-completion-logger` | existing | no | T3 | — | PostToolUse roadmap unit tracker |
| `roadmap-reconcile` | existing | no | T4 | — | One-time reconciliation |
| `rtk-path-ensure` | existing | no | T4 | — | SessionStart hook |
| `rtk-prefix-reminder` | existing | no | T1 | — | PreToolUse:Bash |
| `safety-gate-pre-execute` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `schema-version-bump` | existing | no | T4 | — | Phase 1 Tier 5D Workflow Hook |
| `schema-version-read` | existing | no | T4 | — | Phase 1 Tier 5D |
| `script-summary-inject` | existing | no | T1 | — | PreToolUse Bash hook |
| `scrutinize-before-stop` | existing | no | T0 | — | Stop hook (UNIVERSAL ENFORCEMENT). |
| `secret-audit-pre-commit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `self-awareness-enforce` | existing | no | T1 | — | Self-Awareness Enforcement Hook (UserPromptSubmit) |
| `self-improvement-activate` | existing | no | T4 | — | Self-Improvement Activation — SessionStart Hook |
| `session_start_inventory_inject` | existing | no | T4 | — | U-ACT04 Inventory Hydration |
| `session_start_local_compute_warm` | existing | no | T4 | — | SessionStart hook |
| `session-action-memory` | existing | no | T3 | — | Session Action Memory — PostToolUse Hook |
| `session-cleanup` | existing | no | T4 | — | Stop hook to clean up orphaned MCP processes |
| `session-continuity-chain` | existing | no | T1 | — | U-CTX05 Multi-Session Handoff Chain |
| `session-cost-summary` | existing | no | T4 | — | Session Cost Summary — Stop Hook |
| `session-end-goal-synthesis` | existing | no | T4 | — | U-AI04 Autonomous Goal Synthesis |
| `session-end-p1` | existing | no | T4 | — | Phase 1 Tier 0 |
| `session-learning-feedback` | existing | no | T4 | — | Stop Hook |
| `session-reorient-capture` | existing | no | T3 | — | PostToolUse companion to session-reorient-inject.mjs |
| `session-start-causal-trace` | existing | no | T4 | — | U-AI03 Causal Graph SessionStart Hook |
| `session-start-claim-slot` | existing | no | T4 | — | SessionStart hook |
| `session-start-compact-p1` | existing | no | T4 | — | Phase 1 Tier 0 |
| `session-start-p1` | existing | no | T4 | — | Phase 1 Tier 0 |
| `session-state-auto` | existing | no | T3 | — | Session State Auto — PostToolUse Hook |
| `session-write-tracker` | existing | no | T3 | — | PostToolUse per-session write log |
| `sessionstart-critical-path` | existing | no | T4 | — | SessionStart hook |
| `shop-floor-data-sync` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `signature-drift-detector` | existing | no | T3 | — | Phase 0.8 Signature Drift Hook |
| `skill-3q-gate` | existing | no | T0 | — | U-SKU01 (SKILLS-UTILIZATION-MS0) PreToolUse gate. |
| `skill-chain-suggest` | existing | no | T2 | — | Workflow Skill Chaining |
| `skill-lint-stop` | existing | no | T4 | — | U-SKU03 (SKILLS-UTILIZATION-MS0) Stop hook. |
| `skill-usage-tracker` | existing | no | T4 | — | Skill Usage Tracker — UserPromptSubmit Hook |
| `skill-utilization-index` | existing | no | T4 | — | Skill Utilization Index — SessionStart Hook |
| `slash-command-registry-load` | existing | no | T4 | — | SessionStart hook — load SLASH_COMMAND_REGISTRY.json into the AI-routable |
| `smart-skill-suggest` | existing | no | T4 | — | Smart Skill Suggest — UserPromptSubmit Hook |
| `smoke-test` | existing | no | T0 | — | standalone test runner for the hook bundle library. |
| `sparc-optin-gate` | existing | no | T0 | — | UserPromptSubmit hook — SPARC opt-in gate. |
| `spatial-belief-audit` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `staged-hygiene-check` | existing | no | T1 | — | PreToolUse absorption prevention |
| `stale-claim-sweeper` | existing | no | T1 | — | SessionStart + Stop hook. |
| `state-write-watch` | existing | no | T1 | — | PreToolUse concurrent-write detector for state JSONs |
| `stop_on_awareness_degraded` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_circular_deps` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_content_deletion` | existing | no | T4 | — | Stop Hook: Content Deletion Guard |
| `stop_on_dirty_registry` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_extraction_incomplete` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_formula_uncited` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_hook_unregistered` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_incomplete_pipeline` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_missing_tests` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_non_h_roadmap` | existing | no | T4 | — | DEFERRED IMPLEMENTATION — temporary no-op stub. |
| `stop_on_non_h_roadmap.mjs (P0-U02)` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `stop_on_open_claim` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_open_lock` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_orphan_engine` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_repeat_error` | existing | no | T4 | — | Stop hook |
| `stop_on_roadmap_drift` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_session_mistake_digest` | existing | no | T4 | — | Stop hook (non-blocking) |
| `stop_on_stale_handoff` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_sx_fail` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_uncommitted_critical` | existing | no | T0 | — | Tier 6 Stop Hook |
| `stop_on_uncommitted_memory` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_undocumented_action` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_unregistered_asset` | existing | no | T4 | — | Tier 6 Stop Hook |
| `stop_on_user_correction` | existing | no | T4 | — | Stop hook |
| `stop-bash-orphan-cleaner` | existing | no | T4 | — | Stop hook |
| `stop-bg-runner` | existing | no | T4 | — | wrapper that runs a target Stop hook in the background. |
| `stop-index-sync` | existing | no | T4 | — | Stop hook for index synchronization |
| `stop-release-slot` | existing | no | T4 | — | Stop hook |
| `success-pattern-tracker` | existing | no | T3 | — | Success Pattern Tracker — PostToolUse Hook (Bash) |
| `svi-inject` | existing | no | T4 | — | Phase 0.14 SVI Session Injection |
| `svi-projection` | existing | no | T4 | — | Phase 0.14 SVI Impact Projection |
| `svi-regression-guard` | existing | no | T4 | — | SVI Regression Guard Hook (Stop hook) |
| `svi-watch-refresh` | existing | no | T4 | — | Phase 0.14 SVI Watch Refresh |
| `sx-gate` | existing | no | T4 | — | Phase 1 Tier 5C Physics Hook |
| `task-goal-tracker` | existing | no | T2 | — | DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass. |
| `taylor-coeff-check` | existing | no | T4 | — | Phase 1 Tier 5C Physics Hook |
| `telemetry-autofire` | existing | no | T3 | — | telemetry-autofire.mjs |
| `tenant-isolation-verify` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `terminal-title-update` | existing | no | T4 | — | Auto-update terminal title with current task |
| `test-100-percent-gate` | existing | no | T4 | — | Stop Hook |
| `text-to-cad-validation` | existing | no | T3 | — | PostToolUse hook |
| `tier1-data-refresh` | existing | no | T4 | — | Refresh Tier-1 data sources before session_start_tier1_bolster |
| `token-budget-enforcer.mjs — blocks tool calls when estimated session token usage exceeds threshold, forces /compact` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `tolerance-stack-guard` | existing | no | T3 | — | PostToolUse hook |
| `tool-pattern-learner` | existing | no | T3 | — | PostToolUse (all tools) |
| `training-convergence-guard` | existing | no | T4 | — | PostToolUse hook |
| `try-before-asking` | existing | no | T1 | — | UserPromptSubmit Stop Hook |
| `tsc-baseline-regression-gate` | existing | no | T0 | — | PreToolUse hook on Bash. |
| `unified-local-validation` | existing | no | T1 | — | PreToolUse hook for Edit/Write/MultiEdit |
| `unknown-cad-extensions-surface` | existing | no | T4 | — | U-CUC04 SessionStart hook |
| `user-prompt-submit-p1` | existing | no | T4 | — | Phase 1 Tier 0 |
| `video-wiring-validation` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `volume-delta-alert` | existing | no | T3 | — | U-CUC06 PostToolUse hook |
| `warn-redundant-read` | existing | no | T1 | — | PreToolUse hook (Read only) |
| `wedm-awareness-coverage` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-digest-freshness` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-febe-drift-watch` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-full-capability-gate — blocks release if any CRITICAL capability (taper, recast, fatigue, spec compliance) returns unvalidated results` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-full-capability-gate → blocks release if CRITICAL capability (taper, recast, fatigue, spec compliance) returns unvalidated results` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-gnn-rebuild-stale` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-hardening-gate — blocks WEDM engine edits without running affected E2E tests` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-learning-freshness` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-oneshot-spine-complete` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-production-gate — blocks program download if pre-flight checklist not acknowledged` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-program-verify` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-spec-compliance-hook → warns when EDM parameters violate selected industry spec` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-studio-drift-watch` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-studio-quality-gate — blocks /compact if any step component has untested API calls or unhandled error states` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-studio-quality-gate → blocks /compact if step components have untested API calls or unhandled error states` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-synthetic-block` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-tribal-propagation` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-ui-mock-block` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wedm-xai-required` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wiki-link-suggest` | existing | no | T3 | — | PostToolUse hook for memory/wiki writes |
| `wiki-pre-edit.mjs (prevents wiki/* writes without claim_file lock and log.md entry)` | planned | planned | — | — | Planned (declared by milestone envelope; not yet on disk) |
| `wiki-precheck-inject` | existing | no | T4 | — | UserPromptSubmit hook. |
| `wiki-recall-on-read` | existing | no | T3 | — | PostToolUse hook (matcher: Read). |
| `work-broadcast` | existing | no | T4 | — | Cross-Session Work Broadcasting |
| `working-set-awareness` | existing | no | T1 | — | Working Set Awareness — PreToolUse Hook (Write/Edit) |
