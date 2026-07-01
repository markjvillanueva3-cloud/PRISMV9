---
type: "chat-session"
source: "claude-code-cli"
session_id: "b2bcf85e-9d6a-49ed-8071-1d2fba3122aa"
title: "You are scoping HIGH-ROI Claude Code CLI \"container skills\" for the PRISM MCP se"
date: "2026-05-25"
first_ts: "2026-05-25T17:21:54.622Z"
last_ts: "2026-05-25T17:23:34.542Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/b2bcf85e-9d6a-49ed-8071-1d2fba3122aa/subagents/agent-a609066cc3a53f412.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# You are scoping HIGH-ROI Claude Code CLI "container skills" for the PRISM MCP se

> **claude-code-cli** | 2026-05-25 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b2bcf85e-9d6a-49ed-8071-1d2fba3122aa/subagents/agent-a609066cc3a53f412.jsonl`

## Transcript

### User | 2026-05-25T17:21:54.622Z

You are scoping HIGH-ROI Claude Code CLI "container skills" for the PRISM MCP server. A container skill is a markdown file in `H:/prism/.claude/commands/*.md` that wraps one or more PRISM MCP dispatcher actions (the `mcp__prism_safe__prism_*` tools) so the Claude Code CLI user can type a short `/skill-name` instead of remembering which of 300+ dispatchers and 10000+ actions to call.

GOAL: produce a prioritized list of 5-8 specific NEW skill candidates with: (a) name, (b) ≤25-word purpose, (c) which `prism_*` dispatcher action(s) it wraps, (d) ROI justification (route-savings telemetry pointer, fleet-data signal, or PSN-leg gap), (e) why no existing skill already covers it.

CONSTRAINTS / SIGNALS TO USE:
1. **Route-savings telemetry**: SessionStart inject says "Fires: 1769 · Take-rate: 0/1769 (0.0%)" — fleet route-suggestions are firing constantly but NEVER actioned because the named tools are clunky one-liners. Container skills should be the cure: turn each high-value nudge into a one-keystroke `/foo`. Read `H:/prism/state/shared/dashboards/route-suggest-telemetry.json` (or `state/shared/dashboards/route-savings-*.json` — find the right file) to see WHICH classifiers/tools fire most.
2. **PSN-savings telemetry**: SessionStart says "306 hits · 125 nudges · ~149.0k tokens saved across 5 substrates". Look at `H:/prism/state/shared/dashboards/psn-savings-aggregate.json` for sub-detector breakdown — substrates with high nudges/low hits are skill candidates.
3. **Existing skill catalog** — `ls H:/prism/.claude/commands/*.md | wc -l` gives the count (~440). Use Glob to scan filenames; do NOT propose names that already exist.
4. **Dispatcher action catalog** — quick: `node -e "import('./mcp-server/data/docs/DISPATCHER_DIGEST.md')"` won't work; instead `Read H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md` for the dispatcher+action_count table. Also `H:/prism/PRISM-INVENTORY-LATEST.md` for live counts.
5. **Schema** — each command markdown needs valid frontmatter per `H:
... [+1325 chars truncated]

### Assistant | 2026-05-25T17:22:11.882Z

I'll scope the telemetry, existing skills, and dispatchers in parallel.

### Assistant | 2026-05-25T17:22:12.884Z

[tool_use: Bash]

### Assistant | 2026-05-25T17:22:13.983Z

[tool_use: Bash]

### Assistant | 2026-05-25T17:22:14.491Z

[tool_use: Read]

### User | 2026-05-25T17:22:17.444Z

[tool_result] 1	{
2	  "$schema": "https://json-schema.org/draft/2020-12/schema",
3	  "$id": "https://prism/schemas/command-frontmatter.schema.json",
4	  "title": "PRISM Command Frontmatter Schema (COMMAND-KERNEL-MS0 / U-CK06)",
5	  "description": "Canonical YAML frontmatter for skills under .claude/commands/*.md. Underpins the psk syscall layer + composition primitive. Backward-compat: anything beyond the 6 cor
... [+6892 chars truncated]

### User | 2026-05-25T17:22:22.333Z

[tool_result] PSN-COVERAGE-2026-05-24.json  18.9K
PSN-COVERAGE-2026-05-24.md  2.6K
mcp-route-takerate-audit.json  1.4K
mcp-route-takerate-audit.md  2.1K
pre-tool-savings-multi.jsonl  448.5K
psn-savings-aggregate.json  1.1K
rewriter-psn-feed.jsonl  1.5K
router-table-coverage-decisions.md  5.1K
rtk-savings-daily.json  1.7K
rtk-savings-ledger.jsonl  503.0K
token-savings-coverage-audit.json  1.0K
token-savings-cove
... [+137 chars truncated]

### User | 2026-05-25T17:22:22.471Z

[tool_result] 313

### Assistant | 2026-05-25T17:22:27.190Z

Acknowledged. Reading the key telemetry files now.

### Assistant | 2026-05-25T17:22:28.221Z

[tool_use: Read]

### Assistant | 2026-05-25T17:22:29.314Z

[tool_use: Read]

### Assistant | 2026-05-25T17:22:29.875Z

[tool_use: Read]

### Assistant | 2026-05-25T17:22:30.485Z

[tool_use: Read]

### User | 2026-05-25T17:22:33.992Z

[tool_result] 1	{
2	  "ts": "2026-05-25T02:55:00.000Z",
3	  "source": "synthetic-seed-canonical-prism-tool-surfaces",
4	  "sourceNote": "candidatesSample in coverage-audit-system-graph-full.json contained 50 entries — all hit DROP prefixes (p./tr./ai./core./wiki./state.) per the keep-list filter. coverage-audit-wiki.json candidates[] is empty (candidateCount: 0). coverage-audit-databases-and-app.json: all 6 uni
... [+9400 chars truncated]

### User | 2026-05-25T17:22:34.157Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "_meta": {
4	    "lastRunAt": 1779729132486,
5	    "generatedBy": "stop-psn-savings-aggregate.mjs"
6	  },
7	  "totals": {
8	    "nudges": 129,
9	    "hits": 448,
10	    "misses": 1960,
11	    "savedTokens": 223000,
12	    "ledgersWithData": 5
13	  },
14	  "byLedger": {
15	    "rtk-savings-ledger": {
16	      "lines": 4963,
17	      "nudges": 0,
18	      "hits"
... [+861 chars truncated]

### User | 2026-05-25T17:22:34.194Z

[tool_result] 1	{
2	  "summary": {
3	    "totalFires": 1176,
4	    "totalTakes": 0,
5	    "fleetTakeRate": 0,
6	    "dominantClassifier": "backendAuditChain",
7	    "dominantShare": 0.7261904761904762,
8	    "healthSignal": "takeup-wiring-broken"
9	  },
10	  "rows": [
11	    {
12	      "classifier": "backendAuditChain",
13	      "fires": 854,
14	      "takes": 0,
15	      "takeRate": 0,
16	      "share": 0.7261
... [+1220 chars truncated]

### User | 2026-05-25T17:22:34.233Z

[tool_result] 1	# Router-Table Coverage Decisions
2	
3	**Generated:** 2026-05-24 (slot:alpha, TOKEN-SAVINGS docs)
4	**Companion to:** `scripts/lib/token-savings-router-table.mjs` (peer agent), `scripts/lib/detector-bandit-tune.mjs`, `state/shared/dashboards/top-50-roi-detectors.md`
5	
6	## TL;DR
7	
8	We chose ONE unified router-table consumed by ONE PreToolUse hook, NOT ~2,000 individual per-tool detector hooks
... [+4980 chars truncated]

### Assistant | 2026-05-25T17:22:39.480Z

Acknowledged. Taking the nudged route to check existing skill names against the catalog and inspect dispatcher action surface.

### Assistant | 2026-05-25T17:22:40.009Z

[tool_use: mcp__prism_safe__prism_session]

### Assistant | 2026-05-25T17:22:40.318Z

[tool_use: Glob]

### User | 2026-05-25T17:22:42.121Z

[tool_result] [{"type": "text", "text": "{\"map\":\"adaptiveControlDispatcher.d(0): \\nagentDispatcher.d(0): \\naiReasoningDispatcher.d(0): \\nalgorithmDispatcher.d(0): \\natcsDispatcher.d(0): \\nauthDispatcher.d(0): \\nautomationDispatcher.d(0): \\nautonomousDispatcher.d(0): \\nautoPilotDispatcher.d(0): \\nawarenessMiddleware.d(0): \\nbridgeDispatcher.d(0): \\nbusinessDispatcher.d(0): \\ncadAutomationDispatche
... [+2627 chars truncated]

### User | 2026-05-25T17:22:42.792Z

[tool_result] .claude\commands\ingest.md
.claude\commands\vendor.md
.claude\commands\prints.md
.claude\commands\tooling.md
.claude\commands\process-docs.md
.claude\commands\material-stock.md
.claude\commands\my-shop.md
.claude\commands\erp-health.md
.claude\commands\self-improve.md
.claude\commands\advisor-strategy.md
.claude\commands\claude-flow-help.md
.claude\commands\claude-flow-memory.md
.claude\commands\c
... [+2960 chars truncated]

### Assistant | 2026-05-25T17:22:51.013Z

I have enough signal. The dispatcher_map returned action counts of 0 (known stub bug), but I have route-takerate (854 fires on `backendAuditChain`, 234 on `doctrineSurface`, all 0 take-rate), top-50 ROI seed table, and skill catalog filenames. Synthesizing now.

### Assistant | 2026-05-25T17:22:51.113Z

[tool_use: TaskUpdate]

### User | 2026-05-25T17:22:52.895Z

[tool_result] Updated task #8 status

### Assistant | 2026-05-25T17:23:34.542Z

## Container Skill Candidates — High-ROI Scope

**Telemetry read:**
- `state/shared/dashboards/mcp-route-takerate-audit.json` — **1176 fires / 0 takes (0%)**, dominant: `backendAuditChain` (854 = 72.6%) + `doctrineSurface` (234 = 19.9%).
- `state/shared/dashboards/psn-savings-aggregate.json` — `pre-tool-savings-multi`: **129 nudges / 0 hits** (broken takeup loop); `rtk-savings-ledger`: 446 hits / 223k tokens saved (working — don't duplicate).
- `state/shared/dashboards/token-savings-top-roi-candidates.json` — ranks 26–34 are dispatcher actions wrapped by zero existing skill.
- `dispatcher_map_compact` returned 100+ dispatchers but action_count=0 (renderer-stub bug — separate issue).
- Catalog: 313 `.claude/commands/*.md` files glob'd; verified non-collision below.

| name | purpose (≤25w) | wraps action(s) | ROI signal | gap vs nearest existing |
|---|---|---|---|---|
| `dispatcher-search` | Fuzzy-search dispatcher actions by intent; emit ranked top-N with example invocation. Replaces 3-tool guess-grep loop. | `prism_session:dispatcher_map_compact` + `prism_session:action_search` | `backendAuditChain` 854 fires/0 takes — chats know dispatcher exists, can't find action | `/action-search` exists but bare CLI; this returns ranked + sample params + composer hint |
| `route-take` | Action the most-recent route-suggest nudge (read latest jsonl entry → execute the named MCP action). Closes the 0% takeup loop. | reads `pre-tool-savings-multi.jsonl` tail → dispatches whatever action it names | `pre-tool-savings-multi`: 129 nudges / 0 hits, telemetry says `takeup-wiring-broken` | None — no skill closes the nudge→take loop today |
| `svi-pick` | One-keystroke top-Ψ backlog item with research pack — pure surface for the SVI ranker that hooks already inject. | `prism_dev:svi_ranked_backlog` + `prism_dev:roadmap_tool_plan_query` | rank-28 + rank-29 ROI actions; SVI inject fires but operators still type `/pick-unit` | `/pick-unit` picks devtools-first by lane; this picks by Ψ delt
... [+2965 chars truncated]
