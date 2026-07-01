---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"hermes-zulu\" meta/infra "
date: "2026-06-10"
first_ts: "2026-06-10T20:21:09.666Z"
last_ts: "2026-06-10T20:24:49.630Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 13
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a421c06c632792390.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "hermes-zulu" meta/infra 

> **claude-code-cli** | 2026-06-10 | 34 msgs (13 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a421c06c632792390.jsonl`

## Transcript

### User | 2026-06-10T20:21:09.666Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "hermes-zulu" meta/infra galaxy (owner: zebra, focus: multi-agent fleet orchestration / tail-latency): knowledge/wiki/hermes-zulu/hermes-zulu-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[hermes-zulu-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/hermes-zulu/ orchestrator engines; .claude/helpers/chat-slots.mjs

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): Google "Tail at Scale" paper (research.google); Reactive Manifesto; Azure Architecture Center patterns
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[hermes-zulu-foundations]], [[hermes-zulu-source-atlas]], [[hermes-zulu-applied-practice]], [[hermes-zulu-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, numbers stay owner-gated to zebra + constants.ts.
4. Sections: Local code+stores / Canoni
... [+814 chars truncated]

### Assistant | 2026-06-10T20:21:20.237Z

I'll work on creating the RESOURCE-ATLAS wiki for the hermes-zulu galaxy. Let me start by verifying the local PRISM paths, then WebFetch-verify each online candidate before listing.

### Assistant | 2026-06-10T20:21:20.559Z

[tool_use: Bash]

### User | 2026-06-10T20:21:35.583Z

[tool_result] total 1340
drwxr-xr-x 1 wompu 197611     0 Jun  8 12:52 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 14:24 ../
-rw-r--r-- 1 wompu 197611  7613 Jun  9 22:38 CLAUDE.md
-rw-r--r-- 1 wompu 197611 30869 Jun  9 21:59 MEMORY.md
-rw-r--r-- 1 wompu 197611  9817 Jun  4 12:44 PATHS.md
-rw-r--r-- 1 wompu 197611  8119 Jun 10 13:02 TOOLBELT.md
---CHATSLOTS---
-rwxr-xr-x 1 wompu 197611 76343 Jun  4 13:24 H:/prism/.
... [+452 chars truncated]

### Assistant | 2026-06-10T20:21:40.564Z

Local paths verified. The engine dir, chat-slots helper, and wiki dir all exist, and the 4 sibling wiki layers are present. Let me look at a couple engine files to make the local pointers precise, and check the existing source-atlas to match conventions.

### Assistant | 2026-06-10T20:21:42.415Z

[tool_use: Bash]

### Assistant | 2026-06-10T20:21:42.910Z

[tool_use: Read]

### User | 2026-06-10T20:21:47.375Z

[tool_result] 1	---
2	title: Hermes-Zulu Open Source Atlas — the keep-learning directory for multi-agent fleet orchestration
3	galaxy: hermes-zulu
4	owner_slot: zebra
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-source-atlas-meta (2026-06-10)"
7	verification_method: "Every listed source was opened with WebFetch during creation (2026-06-10) and confirmed real, free/legal, and reachable; the fetch tool returne
... [+12584 chars truncated]

### User | 2026-06-10T20:21:51.453Z

[tool_result] ===ENGINE DIR LISTING===
===COUNT TS===
0

### Assistant | 2026-06-10T20:21:56.068Z

The engine dir has no `.ts` files directly — they may be in subdirectories. Let me check the actual structure, and confirm the chat-slots helper content. The source-atlas gives me the convention to match. Now let me verify the local engine dir structure precisely.

### Assistant | 2026-06-10T20:21:57.972Z

[tool_use: Bash]

### User | 2026-06-10T20:22:02.516Z

[tool_result] ===SUBDIRS & FILES (recursive, 2 levels)===
H:/prism/mcp-server/src/engines/hermes-zulu/CLAUDE.md
H:/prism/mcp-server/src/engines/hermes-zulu/MEMORY.md
H:/prism/mcp-server/src/engines/hermes-zulu/PATHS.md
H:/prism/mcp-server/src/engines/hermes-zulu/TOOLBELT.md
===TS COUNT RECURSIVE===
0

### Assistant | 2026-06-10T20:22:12.035Z

The hermes-zulu engine dir contains only the galaxy doc files (CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md) — the actual orchestrator engines live elsewhere in the tree (this is a meta/infra galaxy whose engines are scattered). Let me find where the actual orchestrator engines + chat-slots-related stores are. Let me check PATHS.md for the verified local trove pointers.

### Assistant | 2026-06-10T20:22:12.201Z

[tool_use: Read]

### User | 2026-06-10T20:22:19.440Z

[tool_result] 1	# Hermes-Zulu PATHS.md — H:/-wide path atlas (slot:bravo)
2	
3	Converts every future Grep/Glob from O(N) → O(1) for slot:bravo. All paths **glob-verified against canonical `H:/prism` on 2026-05-28** (the slot worktree carries only this session's touched files; verify against `H:/prism`). bravo writes the same relative paths in its slot worktree `H:/prism-slot-bravo`. Format: `<absolute-path> | <
... [+9637 chars truncated]

### Assistant | 2026-06-10T20:22:27.349Z

Now I have the verified local trove. The engine dir doc files confirm the real orchestrator engines live in `mcp-server/src/engines/` (Hermes*/Zulu*/Moonshot*) plus `chat-slots.mjs`. The prompt directs me to link the engine dir + chat-slots.mjs verbatim. Let me verify the named engine files exist before linking them, then WebFetch each online candidate.

### Assistant | 2026-06-10T20:22:29.788Z

[tool_use: Bash]

### User | 2026-06-10T20:22:38.427Z

[tool_result] OK HermesParallelFanoutPlannerEngine.ts
OK ZuluTaskAuctionEngine.ts
OK ZuluFleetGovernorEngine.ts
OK MoonshotClientEngine.ts
MISSING MoonshotInvocationEngine.ts
---Hermes*/Zulu* glob---
HermesFileScopePartitionerEngine.ts
HermesParallelBudgetEnvelopeEngine.ts
HermesParallelFanoutPlannerEngine.ts
HermesParallelVerdictAggregatorEngine.ts
HermesSelfCorrectionEngine.ts
MoonshotClientEngine.ts
ZuluDash
... [+73 chars truncated]

### Assistant | 2026-06-10T20:22:44.724Z

Engine files verified — `MoonshotInvocationEngine.ts` does NOT exist (it's `MoonshotClientEngine.ts`), so I'll link the verified ones only. Now let me WebFetch-verify each online candidate in parallel: the seeded three plus a couple high-value canonical additions for this domain (tail-latency / fleet orchestration).

### Assistant | 2026-06-10T20:22:46.494Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:22:46.983Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:22:48.320Z

[tool_use: WebFetch]

### User | 2026-06-10T20:22:50.023Z

[tool_result] ---
layout: Conceptual
title: Cloud Design Patterns - Azure Architecture Center | Microsoft Learn
canonicalUrl: https://learn.microsoft.com/en-us/azure/architecture/patterns/
feedback_system: Standard
breadcrumb_path: /azure/architecture/bread/toc.json
uhfHeaderId: azure
ms.author: pnp
ms.service: azure-architecture-center
ms.update-cycle: 1095-days
manager: lnyswonger
ms.topic: design-pattern
des
... [+14926 chars truncated]

### User | 2026-06-10T20:22:53.129Z

[tool_result] # The Reactive Manifesto Analysis

**Title:** The Reactive Manifesto (v2.0, published September 16, 2014)

**Main Content:** Yes, it comprehensively describes reactive systems through four core principles:

1. **Responsive** — Systems deliver "rapid and consistent response times, establishing reliable upper bounds"
2. **Resilient** — Systems remain functional during failures through "replication, 
... [+792 chars truncated]

### User | 2026-06-10T20:22:53.596Z

[tool_result] # The Tail at Scale

**Authors:** Jeffrey Dean and Luiz André Barroso

**Publication:** Communications of the ACM, 56 (2013), pp. 74-80

**Abstract:** The paper discusses how large-scale online services face challenges maintaining low latency as system complexity grows. It explains that "systems that respond to user actions very quickly (within 100 milliseconds) feel more fluid" to users. The auth
... [+358 chars truncated]

### Assistant | 2026-06-10T20:23:03.371Z

All three seeded candidates verified and matched:
1. **The Tail at Scale** (Dean & Barroso, CACM 2013) — confirmed, free PDF. This is the single highest-value resource for a tail-latency-focused galaxy.
2. **Reactive Manifesto** v2.0 — confirmed, freely readable, the four reactive principles.
3. **Azure Cloud Design Patterns** — confirmed, free Microsoft Learn, the full pattern catalog (Leader Election, Bulkhead, Circuit Breaker, Competing Consumers, Throttling, Scheduler Agent Supervisor, etc.) — directly applicable to fleet orchestration.

The `research.google` URL the prompt suggested resolves at `/pubs/the-tail-at-scale/` (the prompt's parenthetical "research.google" was correct as a host; I used the canonical path). Let me add two high-value canonical additions for this domain and verify them — the SETI/Berkeley "request hedging" lineage is covered by Tail at Scale; let me verify a tail-latency/hedging-adjacent canonical source and a fleet-orchestration standard.

### Assistant | 2026-06-10T20:23:03.557Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:23:04.060Z

[tool_use: WebFetch]

### User | 2026-06-10T20:23:06.071Z

[tool_result] ---
layout: Architecture
title: Scheduler Agent Supervisor pattern - Azure Architecture Center | Microsoft Learn
canonicalUrl: https://learn.microsoft.com/en-us/azure/architecture/patterns/scheduler-agent-supervisor
feedback_system: Standard
breadcrumb_path: /azure/architecture/bread/toc.json
uhfHeaderId: azure
ms.author: pnp
ms.service: azure-architecture-center
ms.update-cycle: 1095-days
manager
... [+23647 chars truncated]

### User | 2026-06-10T20:23:15.352Z

[tool_result] # Google SRE Book - Chapter 22 on Cascading Failures

**Title:** "Addressing Cascading Failures" (Chapter 22)

**Content Summary:** This chapter, written by Mike Ulrich, explores how system failures can amplify through positive feedback loops. It defines cascading failures as situations where "a failure that grows over time as a result of positive feedback" occurs when one component's breakdown in
... [+920 chars truncated]

### Assistant | 2026-06-10T20:23:24.726Z

Both verified. I now have 5 WebFetch-confirmed canonical online resources, all free/legal, all matching the tail-latency / fleet-orchestration focus:

1. **The Tail at Scale** (Dean & Barroso, CACM 2013) — free PDF, the seminal tail-latency paper (highest value)
2. **Reactive Manifesto** v2.0 — free, four reactive principles
3. **Azure Cloud Design Patterns** (catalog) — free MS Learn, Leader Election / Bulkhead / Circuit Breaker / Competing Consumers / Throttling
4. **Azure Scheduler Agent Supervisor pattern** — free, the orchestrator-resilience pattern
5. **Google SRE Book Ch. 22 — Addressing Cascading Failures** — free, CC BY-NC-ND 4.0

Now let me write the resource-atlas. I'll cross-link the sibling layers (noting which exist on disk per R12), promote no numbers, and follow the source-atlas frontmatter convention.

### Assistant | 2026-06-10T20:24:34.853Z

[tool_use: Write]

### User | 2026-06-10T20:24:40.159Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/hermes-zulu/hermes-zulu-resource-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T20:24:49.630Z

File written successfully. No file-claim hook blocked the Write. The atlas is distinct from the existing `hermes-zulu-source-atlas` (where-to-LEARN curriculum) per the advisory — this is the where-to-REACH index.

Let me count the linked pointers for the return block.

LOCAL pointers: galaxy home dir (1) + 9 orchestrator engines + chat-slots.mjs (1) + 6 companion helpers/stores = 17.

ONLINE verified: Tail at Scale, Reactive Manifesto, Azure Cloud Design Patterns, Azure Scheduler Agent Supervisor, Google SRE Ch.22 = 5. None of the 3 seeded candidates failed (all resolved + matched), so 0 dropped. I dropped one LOCAL engine (`MoonshotInvocationEngine.ts`, absent) but that's a local-path correction, not a seeded-URL drop.

GALAXY: hermes-zulu
FILE: knowledge/wiki/hermes-zulu/hermes-zulu-resource-atlas.md
CREATED: yes
LOCAL_POINTERS_LINKED: 17
ONLINE_VERIFIED: 5
CANDIDATES_DROPPED: 0
NOTE: "The Tail at Scale" (Dean & Barroso, CACM 2013, free PDF at research.google) — the seminal authority on why a fan-out fleet is hostage to its slowest slot, this galaxy's named tail-latency focus.
