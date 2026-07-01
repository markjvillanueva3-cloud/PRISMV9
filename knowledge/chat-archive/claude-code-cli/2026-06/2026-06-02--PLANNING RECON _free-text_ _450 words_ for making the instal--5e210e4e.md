---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "PLANNING RECON (free-text, ~450 words) for making the installed Nous Hermes app "
date: "2026-06-02"
first_ts: "2026-06-02T19:59:46.989Z"
last_ts: "2026-06-02T20:04:13.085Z"
cwd: "H:\\prism-slot-bravo"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_a93efbd0-e14/agent-adde079b19f9c4673.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# PLANNING RECON (free-text, ~450 words) for making the installed Nous Hermes app 

> **claude-code-cli** | 2026-06-02 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_a93efbd0-e14/agent-adde079b19f9c4673.jsonl`

## Transcript

### User | 2026-06-02T19:59:46.989Z

PLANNING RECON (free-text, ~450 words) for making the installed Nous Hermes app the MASTER ORCHESTRATOR of PRISM. Angle: master-slot-reconcile.

VISION (operator directive):
- OPERATOR DIRECTIVE (this reframes the earlier "external agent #8, no slot" plan): The Nous Hermes desktop app should BE the master orchestrator/instructor/teacher/learner of the PRISM fleet. It was downloaded BECAUSE it is the hermes agent — wire it INTO PRISM zulu/zebra (the orchestration role), do NOT keep it as a side peer.
- Make zulu/zebra/hermes-app = the MASTER BRAIN / MASTER GALAXY chat slot — the conductor that sits ABOVE the 25 domain worker-slots (each NATO slot owns a galaxy/domain).
- Hermes must have per-galaxy/per-slot AWARENESS (know every NATO name domain + galaxy), and INJECT wiki + tribal knowledge into the worker chat slots as they need it (teacher/instructor). It must also LEARN from outcomes (learner).
- Synergize Hermes with: the Obsidian app/vault, PRISM OS (prism_operating_system) + master brain (master MEMORY.md), PSN (11 legs), /system-viz, and PRISM per-galaxy awareness.

GROUND TRUTH:
- Nous Hermes app installed at C:/Users/wompu/AppData/Local/hermes/ (copied to H:/hermes-install). Native MCP client (stdio + HTTP/StreamableHTTP), 25 skills, cron/ scheduler, editable SOUL.md persona, state.db. Connects to PRISM HTTP MCP at http://127.0.0.1:3100/mcp (all 103 prism_* dispatchers become Hermes tools).
- IMPORTANT: zebra is NOT in SLOT_NAMES (.claude/helpers/chat-slots.mjs) — only zulu is a real NATO slot. zebra is the conceptual orchestrator name in state/shared/CHAT-SLOT-DOMAINS.md (ZEBRA = Hermes agent chat fleet orchestrator). The hermes-zulu galaxy (mcp-server/src/engines/hermes-zulu/) is bravo-owned; its MEMORY.md says zulu is "Never a 13th worker" — it synthesizes cross-slot work orders.
- EXISTING zulu/zebra orchestrator engines: ZuluFleetGovernorEngine (authority predicate, wired prism_session:zulu_authority_check), ZuluTaskAuctionEngine (soul-weighted task auc
... [+2722 chars truncated]

### Assistant | 2026-06-02T20:00:05.881Z

I'll produce the planning recon. Let me verify the ground truth against the repo first.

### Assistant | 2026-06-02T20:00:05.882Z

[tool_use: Read]

### Assistant | 2026-06-02T20:00:09.080Z

[tool_use: Grep]

### Assistant | 2026-06-02T20:00:09.082Z

[tool_use: Grep]

### User | 2026-06-02T20:00:09.118Z

[tool_result] <tool_use_error>Path does not exist: H:\prism-slot-bravo\state\shared\CHAT-SLOT-DOMAINS.md. Note: your current working directory is H:\prism-slot-bravo.</tool_use_error>

### User | 2026-06-02T20:00:20.341Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * chat-slots.mjs — 7-slot fleet manager for concurrent PRISM chats.
4	 *
5	 * Replaces opaque 8-char hex chat ids in handoff filenames with NATO-phonetic
6	 * slot names (alpha..juliett — 9 work + 1 hygiene = 10 total). Each Claude/Codex
7	 * session at SessionStart claims the first free slot; the slot binding lives
8	 * for the lifetime of the chat (or until the 10-
... [+4403 chars truncated]

### User | 2026-06-02T20:00:24.561Z

[tool_result] 103:export const SLOT_NAMES = [
104-  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike",
105-  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
106-];
107-
108-/** Crash TTL — slot is considered crashed/reclaimable after this many ms with
109- *  no heartbe
... [+60 chars truncated]

### Assistant | 2026-06-02T20:00:42.463Z

SLOT_NAMES confirmed: 26 entries alpha..zulu, zebra absent. CHAT-SLOT-DOMAINS.md not in this worktree. Let me locate it and the orchestrator engines.

### Assistant | 2026-06-02T20:00:44.199Z

[tool_use: Bash]

### Assistant | 2026-06-02T20:00:46.408Z

[tool_use: Grep]

### User | 2026-06-02T20:00:53.566Z

[tool_result] 31:| **ZULU** | Hermes agent chat fleet orchestrator |
40:- **Wizard handoffs:** foxtrot (mill) ↔ whiskey (lathe) ↔ mike (wire) share the print-to-program orchestrator pattern. CAM-side coordination flows through kilo. Post-emit through echo. SFC through oscar.
43:  - **Kilo owns:** cross-CAM strategy (Fusion/Mastercam/hyperMILL/Inventor/NX/Esprit/SolidCAM/PowerMill), CAM-level interrupted-cut avo
... [+494 chars truncated]

### User | 2026-06-02T20:00:58.252Z

[tool_result] H:/prism/state/shared/CHAT-SLOT-DOMAINS.md
---FOUND in H:/prism---
CLAUDE.md
MEMORY.md
PATHS.md
TOOLBELT.md

### Assistant | 2026-06-02T20:01:03.385Z

Note: the Grep ran against H:/prism (the shared tree) since the file isn't in this worktree. CHAT-SLOT-DOMAINS.md line 31 confirms ZULU (not zebra) is the orchestrator row in that file. Let me read the zebra-relevant context and the orchestrator engines + write-block hook.

### Assistant | 2026-06-02T20:01:04.259Z

[tool_use: Read]

### Assistant | 2026-06-02T20:01:05.265Z

[tool_use: Read]

### Assistant | 2026-06-02T20:01:05.299Z

[tool_use: Read]

### User | 2026-06-02T20:01:12.991Z

[tool_result] 1	# BRAVO + ZULU Galaxy Memory — Hermes/Zulu Building + Stub Hunting + Fleet Orchestration
2	
3	Append-only cross-session memory for the hermes-zulu galaxy. Bravo owns the build side; zulu owns the runtime/orchestration side. Both share this file.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="
... [+4114 chars truncated]

### User | 2026-06-02T20:01:13.008Z

[tool_result] 1	# Chat-slot domain designations
2	
3	> **Canonical source.** Operator-locked 2026-05-27, mirrored from `H:/CHAT-SLOT-DOMAINS.md`.
4	> **Awareness mechanism:** `.claude/hooks/slot-domain-awareness-inject.mjs` (UserPromptSubmit) reads this file and injects a compact slot-domain table into every chat's prompt context — every slot knows every other slot's territory.
5	> **Refresh:** edit `H:/CHAT-SL
... [+4192 chars truncated]

### User | 2026-06-02T20:01:13.475Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * main-tree-write-block.mjs — PreToolUse(Edit | Write | MultiEdit) main-tree gate.
5	 *
6	 * Built for SLOT-WORKTREE-MS0/U-P1-MAINTREE-WRITE-BLOCK (P1-ROUTING).
7	 * Once the milestone's P3-CUTOVER has shipped 9 canonical worktrees
8	 * (H:/prism-slot-<name>) and each chat is bound to its slot worktree,
9	 * the integration tree H:/prism becomes READ-ON
... [+3687 chars truncated]

### Assistant | 2026-06-02T20:01:21.374Z

I have enough ground truth. Let me verify the orchestrator engines exist and check the zulu authority surface, plus confirm whether a slot-soul/domain exists for zulu and the Hermes app's MCP wiring expectation.

### Assistant | 2026-06-02T20:01:27.780Z

[tool_use: Bash]

### Assistant | 2026-06-02T20:01:28.876Z

[tool_use: Grep]

### User | 2026-06-02T20:01:56.534Z

[tool_result] EXISTS: ZuluFleetGovernorEngine.ts
EXISTS: ZuluTaskAuctionEngine.ts
EXISTS: ZuluDashboardControlEngine.ts
MISSING: HermesSelfCorrectionEngine.ts
MISSING: HermesParallelFanoutPlannerEngine.ts
EXISTS: MoonshotClientEngine.ts
MISSING: MoonshotInvocationEngine.ts
EXISTS: MultiModelConsensusEngine.ts
---zulu authority grep---
---slot-souls zulu---
H:/prism/state/shared/slot-souls/zulu.md
zulu soul EXIS
... [+325 chars truncated]

### User | 2026-06-02T20:02:03.505Z

[tool_result] Found 5 files
.claude\hooks\wiki-precheck-inject.mjs
.claude\hooks\tribal-by-domain-inject.test.mjs
.claude\hooks\tribal-by-domain-inject.mjs
.claude\hooks\memory-relevance-inject.mjs
.claude\hooks\master-index-precheck-inject.mjs

### Assistant | 2026-06-02T20:02:09.173Z

Some asset names in the brief differ from disk (HermesSelfCorrectionEngine, HermesParallelFanoutPlannerEngine, MoonshotInvocationEngine are MISSING — likely renamed or hallucinated in the brief; MoonshotClientEngine + the three Zulu engines + MultiModelConsensusEngine exist). zulu.md soul exists; the Hermes app has its own SOUL.md, cron/, hooks/, skills/, memories/, sessions/. Let me confirm the zulu_authority_check wiring and the Hermes config MCP endpoint.

### Assistant | 2026-06-02T20:02:16.036Z

[tool_use: Bash]

### User | 2026-06-02T20:03:06.058Z

[tool_result] ===zulu_authority_check wiring (search dispatchers + engines)===
H:/prism-slot-bravo/mcp-server/src/engines/hermes-zulu/PATHS.md
H:/prism-slot-bravo/mcp-server/src/engines/ZuluFleetGovernorEngine.ts

===hermes config.yaml MCP endpoint===
30:  #   "ollama-cloud" - Ollama Cloud (requires: OLLAMA_API_KEY — https://ollama.com/settings)
33:  #   "lmstudio"     - LM Studio local server (optional: LM_API
... [+2140 chars truncated]

### Assistant | 2026-06-02T20:04:13.085Z

I have all the ground truth I need. The `mcp_servers:` block in Hermes config.yaml is currently commented-out (line 785+ `# mcp_servers:`), confirming the PRISM MCP wiring is not yet active. zulu_authority_check is referenced only in the engine itself + PATHS.md (not yet surfaced through a dispatcher action). I'll now write the recon.

---

# PLANNING RECON — Hermes app as PRISM MASTER ORCHESTRATOR (master-slot-reconcile)

**Verdict up front: keep Hermes slot-less. Make the Hermes app the external *runtime* that embodies the existing ZULU orchestrator ROLE — it is the conductor that sits ABOVE the 25 domain worker-slots, not a 26th/27th worker. Do NOT add `zebra` to SLOT_NAMES.** The earlier "external agent #8, no slot" plan was directionally correct; this directive only upgrades its *job description* (from side-peer to master), not its *slot identity* (still none).

**Ground truth verified (repo reads):**
- `SLOT_NAMES` in `H:/prism-slot-bravo/.claude/helpers/chat-slots.mjs:103-106` = exactly 26 (`alpha..zulu`). **`zebra` is absent — confirmed.** `zulu` IS a real slot (last NATO letter).
- `state/shared/CHAT-SLOT-DOMAINS.md:31` assigns **ZULU = "Hermes agent chat fleet orchestrator"** (the file uses ZULU, not ZEBRA, for the orchestrator row — the brief's "ZEBRA conceptual name" lives in graph ghost-nodes `ZEBRA-ORCHESTRATOR design spec`, not in the canonical slot-domain file). Lines 11-30: each NATO slot owns a galaxy/domain. So the orchestrator name is **already canonically ZULU**, not zebra.
- `mcp-server/src/engines/hermes-zulu/MEMORY.md:20` + `CLAUDE.md` anti-patterns: **"Never a 13th worker"** — zulu synthesizes cross-slot work orders; it is orchestration, not domain-specialist work. This galaxy is bravo-built / zulu-run.
- Engines that EXIST on disk: `ZuluFleetGovernorEngine.ts`, `ZuluTaskAuctionEngine.ts`, `ZuluDashboardControlEngine.ts`, `MoonshotClientEngine.ts`, `MultiModelConsensusEngine.ts`. **Brief-named but MISSING (renamed/hallucinated, flag before r
... [+8637 chars truncated]
