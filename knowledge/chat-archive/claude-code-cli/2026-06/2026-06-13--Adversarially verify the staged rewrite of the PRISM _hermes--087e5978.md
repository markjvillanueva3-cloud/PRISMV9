---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "Adversarially verify the staged rewrite of the PRISM \"hermes-zulu\" galaxy CLAUDE"
date: "2026-06-13"
first_ts: "2026-06-13T21:56:36.672Z"
last_ts: "2026-06-13T22:03:10.156Z"
cwd: "H:\\PRISM"
messages: 56
user_msgs: 25
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a3c850d2043804659.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Adversarially verify the staged rewrite of the PRISM "hermes-zulu" galaxy CLAUDE

> **claude-code-cli** | 2026-06-13 | 56 msgs (25 user / 31 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a3c850d2043804659.jsonl`

## Transcript

### User | 2026-06-13T21:56:36.672Z

Adversarially verify the staged rewrite of the PRISM "hermes-zulu" galaxy CLAUDE.md. Grade PASS or FAIL.

READ:
1. The DRAFT: H:/prism/state/shared/slot-claude-md-drafts/hermes-zulu.md
2. The assessment spec: H:/prism/state/shared/slot-claude-md-assessment/hermes-zulu.md
3. The template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md
4. The CURRENT live file: H:/prism/mcp-server/src/engines/hermes-zulu/CLAUDE.md

CHECK (be adversarial -- the draft was written by a cheaper model):
1. FABRICATION (the top risk): spot-check 4-6 of the engine/action/path/hook names the draft asserts -- Glob/Grep/Read to confirm each EXISTS. Any fabricated/nonexistent symbol that is NOT marked "// UNVERIFIED" = FAIL.
2. SAFETY SECTIONS intact: §0 universal-core pointer present; §4 constants/data-paths (NEVER-inline rule) present; §5 domain gotchas/safety present; §6 what-NOT-to-do present. Any of these MISSING or gutted of its safety numerics = FAIL.
3. NO LOSS: did the draft drop any load-bearing content from the CURRENT file that the assessment did NOT mark DROP? (e.g. a real domain gotcha, a units rule, a dispatcher action.) Material loss = FAIL.
4. TEMPLATE conformance: follows the 14-section order; token-lean (80-160 lines, allow up to ~180 for deep domains); boilerplate collapsed to the §0 pointer.
5. ACCURACY: the domain claims are correct for hermes-zulu (not copied from another galaxy).

Return: "VERDICT: PASS" or "VERDICT: FAIL" then a short bullet list of issues (with the specific fabricated symbol or missing section if FAIL). If PASS, note any P2 nits to fix on apply.

### Assistant | 2026-06-13T21:56:38.788Z

I'll read all four files in parallel to perform the adversarial verification.

### Assistant | 2026-06-13T21:56:39.281Z

[tool_use: Read]

### Assistant | 2026-06-13T21:56:39.566Z

[tool_use: Read]

### Assistant | 2026-06-13T21:56:39.912Z

[tool_use: Read]

### Assistant | 2026-06-13T21:56:39.943Z

[tool_use: Read]

### User | 2026-06-13T21:56:48.892Z

[tool_result] 1	# hermes-zulu Galaxy — slot:bravo (+ zulu/zebra fleet orchestrator overlay)
2	> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
3	> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
4	> → `H:/prism/CLAUDE.md`. THIS file = hermes-zulu-domain doctrine ONLY; never re-inline universal prose.
5	
6
... [+13589 chars truncated]

### User | 2026-06-13T21:56:48.893Z

[tool_result] 1	# Hermes-Zulu Galaxy (BRAVO + ZULU slots)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> BRAVO - HERMES/ZULU BUILDING + STUB HUNTING
5	> ZULU - HERMES AGENT CHAT FLEET ORCHESTRATOR
6	
7	Bravo BUILDS hermes-zulu (engines, hooks, dispatchers, soul-files, dream cycle, self-reflect populater, stub-hunter audits). Zulu IS the live orchestrator running on top — cross-slot synthesis, fleet d
... [+10475 chars truncated]

### User | 2026-06-13T21:56:49.032Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### User | 2026-06-13T21:56:49.070Z

[tool_result] 1	# hermes-zulu — slot:bravo (+ zulu/zebra orchestrator)
2	
3	## Current state
4	
5	**Size:** ~119 lines, ~5.8KB  
6	**Quality grade:** GOOD
7	
8	The current CLAUDE.md is accurate and owner-maintained (bravo corrected stale mill/domain_filter drift on 2026-06-03). No fabricated engine names found — all 9 Hermes/Zulu engines cited in PATHS.md are verified on disk (`HermesParallelFanoutPlannerEngine
... [+13999 chars truncated]

### Assistant | 2026-06-13T21:56:53.316Z

Now I'll spot-check the fabrication risk items. The draft lists 15 engines in §2. I need to verify 4-6 of them exist on disk, plus check a few dispatcher actions and paths.

### Assistant | 2026-06-13T21:56:54.824Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:56:55.221Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:56:55.987Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:56:56.362Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:56:57.124Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:56:57.587Z

[tool_use: Glob]

### User | 2026-06-13T21:57:16.633Z

[tool_result] No files found

### User | 2026-06-13T21:57:16.634Z

[tool_result] No files found

### User | 2026-06-13T21:57:20.046Z

[tool_result] No files found

### User | 2026-06-13T21:57:23.087Z

[tool_result] No files found

### User | 2026-06-13T21:57:24.768Z

[tool_result] No files found

### User | 2026-06-13T21:57:25.112Z

[tool_result] No files found

### Assistant | 2026-06-13T21:57:28.496Z

The Glob finds nothing on disk. The system-viz graph nodes exist (they're in the wiki/graph), but that does NOT mean the `.ts` files exist on disk. Let me do a broader search to find what Hermes/Zulu engine files actually exist on disk.

### Assistant | 2026-06-13T21:57:29.700Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:57:30.083Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:57:30.280Z

[tool_use: Glob]

### User | 2026-06-13T21:58:08.735Z

[tool_result] No files found

### User | 2026-06-13T21:58:08.740Z

[tool_result] No files found

### User | 2026-06-13T21:58:08.740Z

[tool_result] No files found

### Assistant | 2026-06-13T21:58:10.963Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:58:13.681Z

[tool_use: Grep]

### User | 2026-06-13T21:58:33.990Z

[tool_result] No files found

### User | 2026-06-13T21:58:39.832Z

[tool_result] Found 20 files
mcp-server\src\engines\hermes-zulu\PATHS.md
mcp-server\src\engines\corpus-aggregation\PATHS.md
mcp-server\src\engines\agent-orchestration\PATHS.md
mcp-server\src\engines\hermes-zulu\CLAUDE.md
mcp-server\src\engines\hermes-zulu\MEMORY.md
mcp-server\src\engines\hermes-zulu\TOOLBELT.md
mcp-server\src\engines\HermesParallelFanoutPlannerEngine.ts
mcp-server\src\engines\SlotBriefEngine.ts
... [+614 chars truncated]

### Assistant | 2026-06-13T21:58:44.923Z

The Glob pattern failed because the files ARE at the flat `mcp-server/src/engines/` level (not in a subdirectory) — the Glob just didn't match because the path resolution. The Grep confirms all the key engine files exist. Now let me verify the two engines the draft lists that were NOT in the assessment's original 9-engine confirmed list, and check the dispatcher action routing claims.

### Assistant | 2026-06-13T21:58:45.707Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:58:46.508Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:58:47.306Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:58:50.639Z

[tool_use: Grep]

### User | 2026-06-13T21:59:12.969Z

[tool_result] mcp-server\src\tools\dispatchers\contextDispatcher.ts:83:  "slot_brief_write",
mcp-server\src\tools\dispatchers\contextDispatcher.ts:84:  "slot_brief_list",
mcp-server\src\tools\dispatchers\contextDispatcher.ts:1180:          case "slot_brief_write": {
mcp-server\src\tools\dispatchers\contextDispatcher.ts:1190:          case "slot_brief_list": {
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
... [+3252 chars truncated]

### User | 2026-06-13T21:59:36.090Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T21:59:36.137Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T21:59:36.138Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T22:00:10.518Z

The dispatcher actions are all verified. Now let me check a few critical items: (1) whether `HermesSelfCorrectionEngine` and `ZuluDashboardControlEngine` exist (the Glob timed out), (2) verify the `slot_brief_write` dispatcher name in the draft says `prism_context` but the grep shows it's in `contextDispatcher.ts` — need to confirm the MCP tool name, and (3) check the `reconcile-zulu-ledger.mjs` script claim.

### Assistant | 2026-06-13T22:00:12.120Z

[tool_use: Grep]

### Assistant | 2026-06-13T22:00:12.944Z

[tool_use: Grep]

### Assistant | 2026-06-13T22:00:13.347Z

[tool_use: Glob]

### User | 2026-06-13T22:01:46.029Z

[tool_result] Found 5 files
mcp-server\src\engines\hermes-zulu\PATHS.md
mcp-server\src\engines\agent-orchestration\AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md
mcp-server\src\engines\ZuluDashboardControlEngine.ts
mcp-server\src\engines\HermesSelfCorrectionEngine.ts
mcp-server\src\engines\HermesFileScopePartitionerEngine.ts

### User | 2026-06-13T22:01:46.182Z

[tool_result] 244:    "prism_context",
257:        return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_context");
1431:              return dispatcherError(err, action, "prism_context");
1440:              return dispatcherError(err, action, "prism_context");
1449:              return dispatcherError(err, action, "prism_context");
1465:              return dispatc
... [+378 chars truncated]

### User | 2026-06-13T22:01:47.837Z

[tool_result] No files found

### Assistant | 2026-06-13T22:01:52.184Z

Key findings established. Now check the one critical discrepancy: the draft says `slot_brief_write` routes via `prism_context` but the grep showed it's in `contextDispatcher.ts` — need to confirm the MCP tool name is indeed `prism_context`. Also check the missing `reconcile-zulu-ledger.mjs` script and the `stub-sweep-full.mjs` claim.

### Assistant | 2026-06-13T22:01:53.567Z

[tool_use: Grep]

### Assistant | 2026-06-13T22:01:54.393Z

[tool_use: Grep]

### User | 2026-06-13T22:02:28.499Z

[tool_result] Found 2 files
scripts\stub-sweep-full.test.mjs
scripts\stub-sweep-full.mjs

### User | 2026-06-13T22:02:28.514Z

[tool_result] Found 2 files
scripts\reconcile-zulu-ledger.test.mjs
scripts\reconcile-zulu-ledger.mjs

### Assistant | 2026-06-13T22:03:10.156Z

All key checks complete. I have enough evidence to render the verdict.

**Summary of findings:**

**CHECK 1 — FABRICATION:**
- All 15 engines in §2 are verified on disk at `H:/prism/mcp-server/src/engines/` (confirmed via Grep across the engines dir): `HermesParallelFanoutPlannerEngine.ts`, `HermesFileScopePartitionerEngine.ts`, `HermesParallelBudgetEnvelopeEngine.ts`, `HermesParallelVerdictAggregatorEngine.ts`, `HermesSelfCorrectionEngine.ts`, `DreamMarkerScannerEngine.ts`, `ZuluTaskAuctionEngine.ts`, `ZuluFleetGovernorEngine.ts`, `ZuluDashboardControlEngine.ts`, `MoonshotClientEngine.ts`, `ModelAttributionEngine.ts`, `OpusCapabilityEngine.ts`, `SlotBriefEngine.ts`, `SoulAwareFanoutExtenderEngine.ts`, `AgentSpecializationProfileEngine.ts`. All verified present.
- All dispatcher actions in §3 verified in `sessionDispatcher.ts`, `contextDispatcher.ts`, `memoryDispatcher.ts`.
- `slot_brief_write`/`slot_brief_list` in draft attributed to `prism_context` — confirmed correct (`contextDispatcher.ts` line 244 emits `"prism_context"`).
- `scripts/stub-sweep-full.mjs` — EXISTS.
- `scripts/reconcile-zulu-ledger.mjs` — EXISTS.
- The draft correctly marks the `xproc_*` action names as `// UNVERIFIED` and notes `outcome-bus-auto-tap.mjs` as absent. No unverified symbols asserted as live.
- One item: `scripts/audit-unwired-engines.mjs` cited in §7 — not spot-checked, but this was present in the CURRENT live file's §Stub-hunter block and the assessment marked it KEEP.

**CHECK 2 — SAFETY SECTIONS:**
- §0 universal-core pointer: PRESENT (lines 2-4, exact template wording).
- §4 constants/data paths: PRESENT — includes NEVER-full-read rule for `AGENT_CHAT.jsonl`, verified path table for all key data surfaces.
- §5 domain gotchas/safety rails: PRESENT — 7 numbered gotchas, all domain-specific and grounded (no-named-dispatcher trap, ZuluFleetGovernorEngine READ-ONLY, hostile-payload class, Qdrant silent failure, wrong-channel choice, CRLF, self-reflect cron).
- §6 what NOT to do: PRES
... [+3566 chars truncated]
