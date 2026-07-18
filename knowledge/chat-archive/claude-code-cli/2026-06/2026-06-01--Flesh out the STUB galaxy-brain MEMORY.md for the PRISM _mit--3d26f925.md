---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Flesh out the STUB galaxy-brain MEMORY.md for the PRISM \"mit-curriculum\" galaxy "
date: "2026-06-01"
first_ts: "2026-06-01T17:24:02.186Z"
last_ts: "2026-06-01T17:27:48.128Z"
cwd: "H:\\prism-slot-golf"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_00438497-b07/agent-ad7b6c1f9df137db2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Flesh out the STUB galaxy-brain MEMORY.md for the PRISM "mit-curriculum" galaxy 

> **claude-code-cli** | 2026-06-01 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_00438497-b07/agent-ad7b6c1f9df137db2.jsonl`

## Transcript

### User | 2026-06-01T17:24:02.186Z

Flesh out the STUB galaxy-brain MEMORY.md for the PRISM "mit-curriculum" galaxy into a GROUNDED domain-context index.
It feeds galaxy-card -> CAG cold-anchor -> per-session injection, so it must be a verifiable INDEX of what EXISTS, never invented prose.

FILE: H:/prism/mcp-server/src/engines/mit-curriculum/MEMORY.md
Master-index one-liner: "MIT-OCW course source corpus"
Recall query for this domain: "mit ocw curriculum course lesson ode fdm"

STEPS:
1. Read H:/prism/mcp-server/src/engines/mit-curriculum/MEMORY.md. PRESERVE the "## Master-brain link" block VERBATIM (UP / DOWN / MASTER-INDEX edge lines) but change "Last master-sync:" to 2026-06-01. Keep any already-cited real content (e.g. tango algorithm primitives).
2. Discover REAL assets (ground everything you assert):
   - Glob H:/prism/mcp-server/src/engines/mit-curriculum/** ; Read its CLAUDE.md / PATHS.md / TOOLBELT.md if present.
   - prism_session:master_index_query keyword="mit ocw curriculum course lesson ode fdm" (top real nodes).
   - Grep H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md and DISPATCHER_DIGEST.md for the domain (real engines + dispatcher.action pairs).
   - Grep H:/prism/knowledge/wiki/ for real wiki entries; Grep C:/Users/wompu/.claude/projects/H--prism/memory/ for real reference_*/feedback_* memories.
3. Compose the NEW file with ONLY sections you can GROUND with a path you read (omit any you cannot cite):
   # mit-curriculum Galaxy MEMORY.md   (drop the STUB tag)
   ## Master-brain link        (preserved verbatim; sync bumped to 2026-06-01)
   ## Primary domain           (2-4 lines: what this galaxy's primary domain IS — the context any chat needs to orient instantly)
   ## Key engines & paths      (cited real engine files/dirs under engines/mit-curriculum/ + dispatcher actions)
   ## Standing patterns / invariants  (domain rules grounded in CLAUDE.md/wiki — cite each; NEVER inline physics constants, reference src/physics/constants.ts instead)
   ## Known assets             (real wiki /
... [+601 chars truncated]

### Assistant | 2026-06-01T17:24:31.197Z

I'll start by reading the existing MEMORY.md file and discovering the real assets for this galaxy.

### Assistant | 2026-06-01T17:24:31.678Z

[tool_use: Read]

### Assistant | 2026-06-01T17:24:32.008Z

[tool_use: Glob]

### User | 2026-06-01T17:25:15.629Z

[tool_result] H:/prism/mcp-server/src/engines/mit-curriculum\MEMORY.md
H:/prism/mcp-server/src/engines/mit-curriculum\CLAUDE.md
H:/prism/mcp-server/src/engines/mit-curriculum\TOOLBELT.md
H:/prism/mcp-server/src/engines/mit-curriculum\PATHS.md

### User | 2026-06-01T17:25:16.569Z

[tool_result] 1	# MIT-Curriculum Galaxy MEMORY.md (2026-05-27 — STUB awaiting C1 migration + india-soul formalization)
2	
3	## Master-brain link
4	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="mit curriculum" topK=20`
5	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` b
... [+992 chars truncated]

### Assistant | 2026-06-01T17:25:26.163Z

Let me read the supporting docs and discover real assets in parallel.

### Assistant | 2026-06-01T17:25:26.776Z

[tool_use: Read]

### Assistant | 2026-06-01T17:25:27.416Z

[tool_use: Read]

### Assistant | 2026-06-01T17:25:27.690Z

[tool_use: Read]

### User | 2026-06-01T17:25:49.642Z

[tool_result] 1	# MIT-Curriculum Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — HONEST STUB)
2	
3	> Auto-loads when editing under `engines/mit-curriculum/`. **⚠ HONEST STUB.** Canonical slot: india (de-facto active per MIT-OCW extraction history). Adjacent to academy + knowledge-conversion galaxies.
4	
5	## 1. Domain scope
6	
7	MIT-curriculum covers: MIT OCW course extraction (PDF + transcrip
... [+1491 chars truncated]

### User | 2026-06-01T17:25:50.793Z

[tool_result] 1	# mit-curriculum galaxy — PATHS atlas (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — the owning slot should ENRICH this with the domain's true hot paths. Companion: [`CLAUDE.md`](./CLAUDE.md) · [`MEMORY.md`](./MEMORY.md) · [`TOOLBELT.md`](./TOOLBELT.md).
4	
5	## Engines (name-matched to this domain, 29 found — verify owners
... [+4370 chars truncated]

### User | 2026-06-01T17:25:51.395Z

[tool_result] 1	# mit-curriculum galaxy — TOOLBELT (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — owning slot enriches with domain-specific tool-call patterns. Companion: [`PATHS.md`](./PATHS.md).
4	
5	## Shared token-lean patterns (apply to every galaxy)
6	- **Route before Grep** — `prism_session:master_index_query` answers most "where is
... [+1179 chars truncated]

### Assistant | 2026-06-01T17:26:02.564Z

Now let me verify the real engines exist and discover dispatcher actions, wiki entries, and memories. The PATHS.md lists name-matched engines but flags "verify ownership" — I need to confirm which are genuinely MIT-curriculum engines vs noise (e.g. WEDM/Lathe/RateLimit are clearly NOT this domain).

### Assistant | 2026-06-01T17:26:04.600Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:26:05.301Z

[tool_use: Grep]

### User | 2026-06-01T17:26:46.179Z

[tool_result] 586:- **CourseBuilderEngine**: Auto-generate training courses from PRISM knowledge
675:- **CurriculumEngine**: PRISM Academy Course Management
1316:- **KnowledgeCurriculumBridgeEngine**: KnowledgeCurriculumBridgeEngine
1780:- **MITCourseDeepLearningEngine**: MITCourseDeepLearningEngine.ts
1781:- **MITCourseExpansionEngine**: Additional MIT Courses for U-AWR33
1782:- **MITCourseFullIntegrationEngin
... [+327 chars truncated]

### User | 2026-06-01T17:26:46.880Z

[tool_result] No matches found

### Assistant | 2026-06-01T17:26:54.978Z

Let me query the master index, find dispatcher actions for these engines, and search wiki + memories. Let me also confirm the MIT engine files actually exist.

### Assistant | 2026-06-01T17:26:54.978Z

[tool_use: mcp__claude_ai_Linear__authenticate]

### User | 2026-06-01T17:26:54.979Z

[tool_result] <tool_use_error>Error: No such tool available: mcp__claude_ai_Linear__authenticate</tool_use_error>

### Assistant | 2026-06-01T17:27:27.870Z

Let me use the correct tools — master index query, and grep for dispatcher wiring and wiki/memory entries.

### Assistant | 2026-06-01T17:27:29.716Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:27:33.143Z

[tool_use: Glob]

### Assistant | 2026-06-01T17:27:33.171Z

[tool_use: Glob]

### User | 2026-06-01T17:27:36.491Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:158:  "mit_course_knowledge_query",
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:3897:      case "mit_course_knowledge_query": {
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:3898:        const { mitCourseKnowledgeEngine } = await import("../../engines/MITCourseKnowledgeEngine.js");
H:\pri
... [+5709 chars truncated]

### User | 2026-06-01T17:27:36.924Z

[tool_result] H:/prism/mcp-server/src/engines\MitCourseIndexEngine.ts
H:/prism/mcp-server/src/engines\MitsubishiMV1200RWireEDMMasterPostEngine.ts
H:/prism/mcp-server/src/engines\MitOcwResourceResolverEngine.ts

### User | 2026-06-01T17:27:37.162Z

[tool_result] H:/prism/mcp-server/src/engines\MITCourseRegistryEngine.ts
H:/prism/mcp-server/src/engines\MITCourseDeepLearningEngine.ts
H:/prism/mcp-server/src/engines\MITCourseIntegrationEngine.ts
H:/prism/mcp-server/src/engines\MITCourseExpansionEngine.ts
H:/prism/mcp-server/src/engines\MITCourseFullIntegrationEngine.ts
H:/prism/mcp-server/src/engines\MITCourseKnowledgeEngine.ts

### Assistant | 2026-06-01T17:27:48.128Z

You've hit your session limit · resets 3:30pm (America/Chicago)
