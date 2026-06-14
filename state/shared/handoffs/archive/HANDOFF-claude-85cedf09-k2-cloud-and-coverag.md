---
session: claude-85cedf09
topic: k2-cloud-and-coverage-fix
written_at: 2026-05-10T15:13:06.689Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-85cedf09
status: active
---

# HANDOFF: claude-85cedf09
Updated: 2026-05-10T15:13:06.689Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-85cedf09

## STATE
Resumed from compact, hit 1.37M token cap on first tool call. Spec edits still pending. K2 plan = 12 enumerated units; K4.5 (two-pass) is missing 13th. K2.6:cloud designed mid-tier (qwen2.5-coder:7b free local → k2.6:cloud paid mid → Claude Opus paid premium). CronCreate 46e7f9ac fires 2026-05-16 09:34 for 7-day audit re-run. 6 active peer chats.

## RESUME
Execute the two text-only spec edits the user approved as option (a), then start K1 of K2-CLOUD-INTEGRATION-PLAN.md. EDIT 1: H:/prism/state/shared/specs/K2-CLOUD-INTEGRATION-PLAN.md — replace §6 'Open questions for user (before build starts)' with §6 'User-locked decisions (answered 2026-05-10)' table containing: budget-cap=100K tokens/session fail-closed at 90K (~0), routing-posture=AGGRESSIVE (any context>8K escalates qwen→k2.6:cloud, no confidence gate, budget cap is safety valve), safety-policy=TWO-PASS PATTERN (K2 generates → Claude scrutinizes against PRISM SAFETY RAILS, returns PASS|REVISE|FAIL), wave-timing=Wave 5.5 (between cyrilXBT B1-B6 and Company Brain D1-D5). Add §6.5 detailing K4.5 U-K2-CLAUDE-SCRUTINIZE-CHAIN (deps: K3+K4+K7; blocks: K10+K12) with 5-step pseudocode, cost-model (best=K2-only, mid=K2+scrutiny, worst=K2+scrutiny+full-regen), K10 test additions, update unit-count 12→13 / hours 8-12→9-13. EDIT 2: H:/prism/state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md Track K — add K4.5 sub-bullet and append 'User decisions locked 2026-05-10: 100K-token/session budget cap; aggressive escalation (>8K context); two-pass safety pattern (K4.5).' Both files unclaimed. After edits land, K1: read mcp-server/src/engines/AISystemRouterEngine.ts + OllamaHookBridgeEngine.ts and write state/shared/specs/K2-ROUTER-INVENTORY.md per Boris loop+agent doctrine (HARD GATE on verification feedback loop, peer reviewer subagent isolation:worktree). User explicit directive: 'pick up where we left off with the full system utilization building that hand things like boris loop, obsidian, docker etc' — after K1, dispatch parallel forge-team agents on K2-K12 build chain. AVOID claims: claude-99eca613 owns system-viz/_MASTER_ENVELOPE.json + _v3_ENVELOPE_FOLD.md; claude-7b9d1810 owns scripts/hook-smoke-walk.mjs; claude-671e2b1f owns prism-tribal-binder/TribalCardRenderer.test.ts. SAFE: K2 plan files, AISystemRouterEngine.ts, OllamaHookBridgeEngine.ts, new K* assets.

## CONTEXT
Refs: BORIS-LOOP-AGENT-DOCTRINE.md (227 lines), SYSTEM-SYNERGY-AUDIT-2026-05-09.{md,html} (~480 lines HTML companion), K2-CLOUD-INTEGRATION-PLAN.md. Coverage discrepancy still open: BUILD_STATE 2269/3167=72% vs viz coverage-by-domain 2802/3176=88%; root cause generate-system-viz.mjs lines 257-282 hardcoded domainsBuiltIn block (sums 2802) instead of reading buildState.COVERAGE_BY_DOMAIN.rows from build-state-snapshot.mjs (lines 191-228). Fix = one-source-replacement in viz, NOT snapshot extension. CLAUDE.md Recent regressions has 6 entries; D3 docker probe RESOLVED (reviewer hallucination — fileExists() correctly returns false when fs.statSync throws). L11 owned by claude-0413eca6; audit H5 renumbered L11→L13, H3 stays L12. Tribal engine count = 23 (not 9 or 19). AGENT_CHAT.jsonl stub-only — derive agent IDs from HANDOFF-claude-{8hex}-{topic}.md filenames for L12/L13. K1 reads needed: AISystemRouterEngine.ts (10KB, line 27 tier union with claude-opus, lines 107-195 routing logic) + OllamaHookBridgeEngine.ts (12KB unread). K8 needs ollama-offload-stats.json schema 2.0.0→3.0.0 per-model breakdown. NOTE: prior handoff this session went to wrong namespace (HANDOFF-claude-99eca613-k2-cloud-and-coverag.md) due to stable-session-id picking peer instance — that file is OBSOLETE, ignore it (or delete if claude-99eca613 needs to reclaim namespace).
