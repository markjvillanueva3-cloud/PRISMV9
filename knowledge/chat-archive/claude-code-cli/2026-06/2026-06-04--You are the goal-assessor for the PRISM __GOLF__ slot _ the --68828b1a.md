---
type: "chat-session"
source: "claude-code-cli"
session_id: "68828b1a-52ea-4665-adc2-3915276169b4"
title: "You are the goal-assessor for the PRISM **GOLF** slot = the **fleet-hygiene** ga"
date: "2026-06-04"
first_ts: "2026-06-04T03:22:40.555Z"
last_ts: "2026-06-04T03:28:03.390Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/68828b1a-52ea-4665-adc2-3915276169b4/subagents/workflows/wf_2053a24b-439/agent-a4118e46dc830f32e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# You are the goal-assessor for the PRISM **GOLF** slot = the **fleet-hygiene** ga

> **claude-code-cli** | 2026-06-04 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/68828b1a-52ea-4665-adc2-3915276169b4/subagents/workflows/wf_2053a24b-439/agent-a4118e46dc830f32e.jsonl`

## Transcript

### User | 2026-06-04T03:22:40.555Z

You are the goal-assessor for the PRISM **GOLF** slot = the **fleet-hygiene** galaxy.
Domain: Fleet reaper, zombie/orphan sweep, chat-slot hygiene

PRISM is a manufacturing-intelligence platform (CAD/blueprint -> physics-optimized CNC G-code across mill/lathe/wire-EDM; SFC + Master Post are the saleable products; JM Die is the test shop). The operator wants a CLEAR overall goal set for every major domain, with: the domain's app features, a training plan (each domain owns a self-improving AI cloned from india's template), a path to a PERFECT System Viability Index (SVI/psi = 1.0) score, and explicit cross-galaxy SYNERGY. "Always build with synergy in mind."

READ these (use Read/Grep; skip any that 404):
- mcp-server/src/engines/fleet-hygiene/MEMORY.md   (galaxy brain — PRIMARY source)
- mcp-server/src/engines/fleet-hygiene/CLAUDE.md   (galaxy doctrine)
- mcp-server/src/engines/fleet-hygiene/PATHS.md and TOOLBELT.md  (if present)
- state/shared/galaxy-cards/ALL-CARDS.md  (find your galaxy's federation card)
- state/shared/SVI.json and state/shared/SVI_TARGET_BREAKDOWN.json  (your galaxy's current SVI + gap to 1.0; grep for "fleet-hygiene")
- state/shared/BUILD_STATE.md  (your domain's built/wired/pending counts)

Optionally: `node scripts/galaxy-knows-map.mjs who fleet-hygiene` for cross-galaxy edges.

Be concrete and grounded in what you actually read (cite real engine/dispatcher names, real SVI numbers if found). No invented assets. If SVI for this galaxy is not found, say so and give a qualitative path.

Return ONLY this markdown card, filled (no preamble, no code fences):

## GOLF — fleet-hygiene galaxy goal
**North-star goal:** <1-2 crisp sentences — the end-state this domain exists to reach>
**Current state:** <built/wired/SVI-now in 1-2 lines, with real numbers if found>
**PRISM app features (this domain delivers to the product):** 
- <built feature>
- <feature still needed>
**Training plan (self-improving AI to perfect):** <how this domain trains/learns to ma
... [+340 chars truncated]

### Assistant | 2026-06-04T03:22:53.660Z

I'll read the fleet-hygiene galaxy sources to ground this assessment.

### Assistant | 2026-06-04T03:22:54.141Z

[tool_use: Read]

### Assistant | 2026-06-04T03:22:54.673Z

[tool_use: Read]

### Assistant | 2026-06-04T03:22:56.180Z

[tool_use: Read]

### Assistant | 2026-06-04T03:22:56.183Z

[tool_use: Read]

### User | 2026-06-04T03:23:30.362Z

[tool_result] 1	# Fleet Hygiene Galaxy (GOLF slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> GOLF — DESIGNATED FLEET REAPER (MUST KEEP RUNNING AT ALL TIMES; periodic check of zombie/orphan node, bash, git, read, grep, search tasks & processes), MCP server updates/upgrades/fixes, general work.
5	
6	This card is the per-domain operating doctrine. The full asset map, regression classes, and live-st
... [+5070 chars truncated]

### User | 2026-06-04T03:23:41.785Z

[tool_result] 1	# GOLF Galaxy Memory — Fleet Hygiene + Reaper + MCP Server
2	
3	Cross-session memory for the **golf** slot (position 7 of 26 NATO, `alpha..zulu`). Golf is a full work slot that ALSO owns fleet-reaper duty (ownership moved alpha→golf 2026-05-16, [[feedback_golf_owns_reaper]]). Append-only — older entries collapse to `state/shared/MEMORY-RECENT.md` per the central `MEMORY.md` size discipline.
4	
5
... [+12366 chars truncated]

### User | 2026-06-04T03:23:51.900Z

[tool_result] 1	# Fleet-Hygiene Galaxy — TOOLBELT (slot: golf)
2	
3	> Memoized tool-call patterns slot:golf reaches for most. Each saves tokens/time vs. the naive alternative. Verified 2026-05-29.
4	
5	## Bash one-liners (the reaper loop)
6	- `node H:/prism/scripts/fleet-reaper-sweep.mjs --once --json` | the canonical sweep — pipe through a `node -e` JSON filter to print only `{mem,slots,pending,caveats,gpu,oll
... [+2821 chars truncated]

### User | 2026-06-04T03:23:51.902Z

[tool_result] 1	# Fleet-Hygiene Galaxy — H:/-wide PATHS atlas (slot: golf)
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:golf. Format: `<path> | <purpose> | <maintainer>`. Verified 2026-05-29.
4	
5	## Reaper core (scripts)
6	- `H:/prism/scripts/fleet-reaper-sweep.mjs` | sweep brain (--once/--monitor-loop/--status/--json) | golf
7	- `H:/prism/scripts/fleet-memory-monitor.mjs` | RAM/per-claude-tree a
... [+5834 chars truncated]

### Assistant | 2026-06-04T03:23:55.392Z

Now let me check the SVI and federation surfaces for fleet-hygiene's current scores and cross-galaxy edges.

### Assistant | 2026-06-04T03:23:57.245Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:23:58.779Z

[tool_use: Bash]

### User | 2026-06-04T03:24:55.838Z

[tool_result] ---EXIT---

### User | 2026-06-04T03:26:07.770Z

[tool_result] -rw-r--r-- 1 wompu 197611  9516 Jun  3 22:08 state/shared/SVI.json
-rw-r--r-- 1 wompu 197611  7043 Apr 19 20:48 state/shared/SVI_TARGET_BREAKDOWN.json
-rw-r--r-- 1 wompu 197611 35057 Jun  3 21:02 state/shared/galaxy-cards/ALL-CARDS.md
---
Who knows "fleet-hygiene"? (top 5)
  • fleet-hygiene  (11.2189)  ←  fleet, hygiene
  • hermes-zulu  (4.1082)  ←  fleet
  • post-processor  (4.1082)  ←  fleet
  •
... [+75 chars truncated]

### Assistant | 2026-06-04T03:26:14.110Z

SVI.json has no fleet-hygiene key. Let me inspect its structure and the federation card.

### Assistant | 2026-06-04T03:26:14.578Z

[tool_use: Read]

### Assistant | 2026-06-04T03:26:15.695Z

[tool_use: Bash]

### User | 2026-06-04T03:26:23.794Z

[tool_result] 1	{
2	  "timestamp": "2026-06-04T03:08:30.788Z",
3	  "version": "1.0.0",
4	  "subsystems": [
5	    {
6	      "name": "Materials",
7	      "category": "data",
8	      "entities": 9,
9	      "dimensions": 8,
10	      "variability": 72,
11	      "wired_pct": 100,
12	      "reachable": 72,
13	      "growth_since_last": 0
14	    },
15	    {
16	      "name": "Tools",
17	      "category": "data",
18	    
... [+10559 chars truncated]

### User | 2026-06-04T03:27:17.884Z

[tool_result] 21:- **golf owns the fleet-reaper** — slot-aware orphan reaper for the fleet; doctrine moved alpha→golf 2026-05-16 (CLAUDE.md §GOLF SLOT, §FLEET-REAPER; `feedback_golf_owns_reaper.md`).
163:## fleet-hygiene — Fleet Hygiene + Reaper + MCP Server
164:- > Galaxy brain for domain **fleet-hygiene**. Modeled on the alpha exemplar `engines/token-optimization/MEMORY.md` — the fleet-wide `MASTER-BRAIN-TEMP
... [+487 chars truncated]

### Assistant | 2026-06-04T03:27:22.162Z

SVI.json is a system-wide aggregate (psi_reachability = 1.0 globally), not per-galaxy — fleet-hygiene has no dedicated SVI row. Let me read its federation card for the cross-galaxy edges.

### Assistant | 2026-06-04T03:27:22.815Z

[tool_use: Read]

### User | 2026-06-04T03:27:29.945Z

[tool_result] 163	## fleet-hygiene — Fleet Hygiene + Reaper + MCP Server
164	- > Galaxy brain for domain **fleet-hygiene**. Modeled on the alpha exemplar `engines/token-optimization/MEMORY.md` — the fleet-wide `MASTER-BRAIN-TEMPLATE.md` referenced in the master index is **not present on this branch** (verified 2026-05-29), so the exemplar is the live pattern.
165	- **UP (pull from master):** `C:/Users/wompu/.cl
... [+4430 chars truncated]

### Assistant | 2026-06-04T03:28:03.390Z

I have enough grounded material. The fleet-hygiene galaxy has no dedicated SVI row (SVI.json is a system-wide aggregate at psi_reachability=1.0 globally — fleet-hygiene is meta-infrastructure, not a registry subsystem), so I'll give a qualitative SVI path. Here is the filled card.

## GOLF — fleet-hygiene galaxy goal
**North-star goal:** Keep the 26-slot fleet alive, lean, and self-healing with zero operator babysitting — every orphan/zombie process reaped (only when ancestry-confirmed), every crashed slot reclaimed, every scheduled watchdog provably Ready, and the MCP/Docker/Ollama substrate that the *other 33 galaxies* depend on never silently degraded.

**Current state:** Fully built and owned (completed/owned 2026-05-29 by slot:golf). Load-bearing layer = `scripts/fleet-reaper-sweep.mjs` (ancestry-walk PID→slot, confirm-after-2×300s) + durable `PRISM Fleet Reaper` scheduled task + 3 guardian/Stop hooks. Sibling watchdogs shipped: `fleet-memory-monitor.mjs`, `fleet-task-health-watch.mjs`, `critical-memory-compact-nudge.mjs`, `cleanup-orchestrator.mjs`. No dedicated SVI row — system-wide `SVI.json` reports `psi_reachability: 1.0` / `svi_display 1.2×10^46` but `trend: shrinking` (svi_delta −0.02); fleet-hygiene is the meta-layer that *protects* that reachability rather than contributing entities to it.

**PRISM app features (this domain delivers to the product):**
- Built: ancestry-confirmed slot-aware orphan reaper (soft-relief demote/working-set-trim before any kill; MCP-zombie false-positive refusal); per-`claude.exe`-tree RAM attribution → names the ONE chat to `/compact`; watchdog-over-watchdogs auditing all 8+ `PRISM *` scheduled tasks (HRESULT-only failure gate); GPU/Ollama coordinator (`.ollama-routing-hint.json`); generic stale-lock/claim/chat-bus reaper.
- Built: cross-PC host filter (MS2 host presets), enum-cache sidecar, kill switches (`PRISM_FLEET_REAPER_DISABLE`).
- Still needed: an operator-facing fleet-health dashboard surfacing reaper/kills/memory 
... [+3432 chars truncated]
