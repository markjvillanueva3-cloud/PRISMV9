---
session: claude-49a09a3c
topic: charlie-hooks-automation-v2
written_at: 2026-05-12T12:32:24.050Z
machine: MARKV
family: Claude
session_key: claude-49a09a3c
status: active
---

# HANDOFF: claude-49a09a3c
Updated: 2026-05-12T12:32:24.050Z
Family: Claude | Machine: MARKV | Session: claude-49a09a3c

## STATE
(milestone HOOKS-AUTOMATION-V2-MS0 COMPLETE — 10/10 units; 12 commits this session [9 unit + 1 close + 1 fix + interleaved peer commits like c47ec810c HARNESS/U-HANG-FORKSTORM-V2 and a0638ea73 HARNESS-STABILITY/U-ORPHAN-REAPER-PS]. Slot CHARLIE / claude-49a09a3c, branch cad-fusion-live-ms0, main tree H:/prism.

NEW HOOKS shipped:
- autonomous-loop-defer.mjs — PreToolUse .* rate-limiter; warn/ask/deny ladder; tightens under PRISM_AUTONOMOUS=1; kill PRISM_LOOP_DEFER=0
- permission-denied-retry.mjs — PostToolUse ^(Bash|Read|Edit|Write|MultiEdit)$; turns recoverable tool failures into a corrected-call hint; retry-cap 2; kill PRISM_RETRY_CLASSIFY=0
- ollama-route-pretooluse.mjs — PreToolUse:Read, wired into bundles/read-bundle.mjs READ_HOOKS; nudges bulk-data reads at /ollama-summarize; opt-in auto-substitute PRISM_OLLAMA_ROUTE_AUTO=1; kill PRISM_OLLAMA_ROUTE=0
- subagent-stop-verifier.mjs — SubagentStop; parses deliverable claims, blocks the stop if claimed files missing (only claims with a path separator count, post U-HKA05-FIX); kill PRISM_SUBAGENT_VERIFY=0
- system-viz-live-bridge.mjs — PostToolUse Edit|Write|MultiEdit; fire-and-forget POST to localhost:8765/api/refresh, 180ms timeout, fails open; kill PRISM_VIZ_LIVE=0
- mcp-safety-bridge.mjs — PostToolUse; physics-critical edit -> surfaces a directive to run prism_safety:validate_physics + confirm S(x)>=0.70; soft warn, never blocks; kill PRISM_MCP_SAFETY_BRIDGE=0
- task-created-claim-guard.mjs — PreToolUse ^TaskCreate$; cross-chat dedup via state/shared/task-claims.jsonl TTL ledger; force escapes: metadata.force / [force] in subject / PRISM_TASK_CLAIM_GUARD=0
- post-tool-batch-budget.mjs — PostToolUse '' matcher; sliding-window tool-volume ceiling -> slow-down/compact alarm, snoozed; SELF-TUNING ceiling ~p90x1.4 of observed usage written to .claude/cache/tool-batch-recommendation.json; kill PRISM_TOOL_BATCH_BUDGET=0

NEW SCRIPTS:
- scripts/verify-hookify.mjs — U-HKA06 was verify-only (the hookify plugin was already enabled; 480 rules on disk). Health check: enabled? plugin dir found? rule count by type? priority order vs native hooks documented in the header.
- scripts/retune-tool-batch-ceiling.mjs — the U-HKA10 7d recompute; wire to /loop --interval 7d, or register in mcp-server/data/state/cron-jobs.json via /cron-bootstrap.

settings.json edits (repo copy H:/prism/.claude/settings.json; U-HKA02 also touched the C: canonical):
- PreToolUse .* += autonomous-loop-defer
- new PostToolUse group ^(Bash|Read|Edit|Write|MultiEdit)$ w/ permission-denied-retry
- PostToolUse Edit|Write|MultiEdit += system-viz-live-bridge + mcp-safety-bridge
- PostToolUse '' += post-tool-batch-budget
- new SubagentStop group w/ subagent-stop-verifier
- new PreToolUse ^TaskCreate$ group w/ task-created-claim-guard
- bundles/read-bundle.mjs READ_HOOKS += ollama-route-pretooluse

ALL hooks fail OPEN ({continue:true} on garbled stdin / IO error / disabled) and are import-safe (invokedDirectly guard). The CC 2.1.x harness does NOT support type:http / type:mcp_tool / TaskCreated / PostToolBatch / decision:defer — everything is standard type:command hooks on standard events; the spec's exotic API features were realised that way.

GUARDRAILS — do NOT touch these peer-WIP files (file-claim-guard hard-blocks edits):
- mcp-server/src/tools/dispatchers/hookDispatcher.ts (claude-fe6af473)
- .claude/hooks/auto-lint-post-edit.mjs (claude-671e2b1f)
- .claude/scripts/verify-hook-refs.mjs (claude-ac4ef13f)
- .claude/hooks/node-process-janitor.mjs / stop_on_hook_unregistration.mjs / bundles/lib/hook-runner.mjs (HARNESS-STABILITY chats)
- mcp-server/src/engines/LLMEngine.ts (pre-existing)
~7400 pre-existing dirty state files in the tree are NOT mine. 73 commits ahead of origin (push pending).

LESSON: never put backticks or dollar-signs in a Bash-tool git commit -m / handoff string — bash does command substitution; commit de42774d7's message body has one mangled line because of this. Use temp files + cat-substitution if the content has shell metacharacters, or escape them.)

## RESUME
HOOKS-AUTOMATION-V2-MS0 is COMPLETE — all 10 units shipped. U-HKA01 by claude-52e77d9e (9cdebae79 / 0be46a4ab / 31daabd22). U-HKA02..U-HKA10 + U-HKA-CLOSE + U-HKA05-FIX by this chat (claude-49a09a3c): 44653dc40 (U-HKA02 autonomous-loop-defer), 22479a10d (U-HKA03 permission-denied-retry), 379310995 (U-HKA04 ollama-route-pretooluse), 1f09e94fc (U-HKA05 subagent-stop-verifier), 1d318b215 (U-HKA06 verify-hookify), 9afb338a6 (U-HKA07 system-viz-live-bridge + /api/refresh in _server.cjs), ac59e3c9b (U-HKA08 mcp-safety-bridge), 97593fc17 (U-HKA09 task-created-claim-guard), b18c0af24 (U-HKA10 post-tool-batch-budget + scripts/retune-tool-batch-ceiling.mjs), 3e155fe6a (U-HKA-CLOSE envelope -> completed 10/10), de42774d7 (U-HKA05-FIX bare-basename false-flag). 240+ hook vitest cases pass; each hook smoke-tested live. NOTHING PENDING IN THIS MILESTONE.

NEXT for an alpha/hooks chat: (1) pick the next .claude/hooks/ lane unit from state/shared/atomic-roadmap-chat-1.md (alpha's lane), OR (2) wire the HC-5 MD<->HTML drift-guard (the --check-drift in scripts/emit-spec-html.ts from charlie/claude-58e6d5d4 HTML-COMPANION-MS0) as a per-commit hook — charlie noted that is alpha-lane, left for later, OR (3) move to another milestone.

SCRUTINY: a clean 3-of-3 is NOT obtainable in this env — the Codex+Gemini reviewer CLIs hard-crash (exit 3221226505, not a quota issue). The Opus reviewer agent PASS is recorded in mcp-server/data/state/SCRUTINY_LEDGER.json under claude-49a09a3c. If a Stop hook blocks on the scrutiny gate, the 3-attempts escape hatch covers it; the code is verified by 240+ tests + per-hook smoke checks + the Opus PASS.

NOTE: the BUILD_STATE auto-inject still shows HOOKS-AUTOMATION-V2-MS0 as not_started / in_progress_real — that is a STALE SNAPSHOT (the envelope JSON is committed as completed 10/10 in 3e155fe6a). Refresh with: node scripts/build-state-snapshot.mjs. (Also: 73 commits ahead of origin, push pending — git-sync-stop handles it.)

## CONTEXT

