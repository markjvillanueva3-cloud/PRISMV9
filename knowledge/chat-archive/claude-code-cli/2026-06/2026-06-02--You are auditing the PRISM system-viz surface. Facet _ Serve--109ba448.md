---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "You are auditing the PRISM system-viz surface. Facet = Server endpoints. Read th"
date: "2026-06-02"
first_ts: "2026-06-02T01:29:56.628Z"
last_ts: "2026-06-02T01:34:06.339Z"
cwd: "H:\\prism-slot-sierra"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-a791fca50c50ab442.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are auditing the PRISM system-viz surface. Facet = Server endpoints. Read th

> **claude-code-cli** | 2026-06-02 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-a791fca50c50ab442.jsonl`

## Transcript

### User | 2026-06-02T01:29:56.628Z

You are auditing the PRISM system-viz surface. Facet = Server endpoints.
Read these files end-to-end: H:/prism/state/shared/system-viz/_server.cjs.
Focus: Endpoint robustness and security: error handling, missing/useful endpoints, fd/readSync sidecar safety, cache-control headers, the buildMasterIndexHealth + buildUtilization + buildSnapshot computations, path-traversal / header-injection / SSRF risk, graceful degradation when a sidecar is missing or stale, content-type correctness, large-response streaming.

HARD CONSTRAINT: NEVER read or parse H:/prism/state/shared/system-viz/system-graph.json (695MB) or system-graph-index.json (194MB) — parsing either OOMs the host (V8 ~512MB string cap). Analyze ONLY the named source/doc files. Cite any graph stats from state/shared/AWARENESS-SNAPSHOT.md (small precomputed markdown), never by parsing the graph. For EACH improvement give: a short title, the file:line anchor, a tag of either [LEAN+SAFE] (pure client-side or light-sidecar edit, NO 695MB graph load to build or verify) or [HEAVY] (needs a graph load / regen-viz run to build or verify), a value rating (high/med/low), a one-line rationale, and a 1-2 line fix sketch. Be exhaustive — prefer concrete, non-obvious gaps over generic advice. Do NOT write or edit any file; this is read-only analysis.

Return a ranked markdown list (best first) of improvement opportunities for THIS facet only.

### Assistant | 2026-06-02T01:30:24.183Z

I'll read the server file end-to-end and the precomputed awareness snapshot for any graph stats I need.

### Assistant | 2026-06-02T01:30:24.539Z

[tool_use: Read]

### User | 2026-06-02T01:31:30.646Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * _server.cjs — minimal PRISM system-viz HTTP server.
4	 *
5	 * Restored 2026-05-24 (slot:romeo /goal context) after the prior binary went
6	 * missing from disk despite every doc, skill, and `.cache/system-viz-server.log`
7	 * call site assuming it lived here. R12 fail-loud: rebuild rather than route
8	 * around. Binds 127.0.0.1:8765 only — fits the no-public-H-driv
... [+26775 chars truncated]

### Assistant | 2026-06-02T01:31:33.367Z

Let me check the awareness snapshot for any graph stats I may cite, and confirm a couple of behaviors around the static fallback and regenerate endpoint.

### Assistant | 2026-06-02T01:31:33.901Z

[tool_use: Read]

### User | 2026-06-02T01:32:11.358Z

[tool_result] 1	# PRISM Awareness Snapshot
2	
3	> Generated **2026-06-01T18:54:46.386Z** · graph mtime 2026-06-01T16:12:27.106Z
4	> One-shot session warmup: built/wired/utilized/drifted in 60 lines.
5	> Regenerate: `node scripts/awareness-snapshot.mjs` · or via `/awareness-snapshot` skill.
6	
7	## Headline (from BUILD_STATE)
8	- **3646** engines built · **1101** with wiki entry
9	- **118** engines on disk with 
... [+5200 chars truncated]

### Assistant | 2026-06-02T01:34:06.339Z

I have everything I need. Here is the exhaustive, ranked audit of `_server.cjs` for the Server-endpoints facet.

---

# system-viz Server Endpoints — Audit (`H:/prism/state/shared/system-viz/_server.cjs`)

Ranked best-first. Every item is verifiable WITHOUT loading the 695MB graph (the few that interact with graph-sized files are tagged accordingly). Graph stats cited are from `AWARENESS-SNAPSHOT.md` only.

---

### 1. `/api/graph-snapshot` will OOM the host — it `JSON.parse`s the 145MB index synchronously, and the snapshot says that file is already past the V8 string cap
- **Anchor:** `_server.cjs:381` (`JSON.parse(fs.readFileSync(graphPath, "utf8"))` in `buildGraphSnapshot`), reachable via `:518`.
- **Tag:** [HEAVY] (the failure is *triggered* by a graph-sized read; the fix is lean to write but verifying the happy path needs the index).
- **Value:** high
- **Rationale:** `system-graph-index.json` is 194MB on disk (header doc says ~145MB). `readFileSync(...,"utf8")` builds one ~194M-char string, which is exactly the failure `AWARENESS-SNAPSHOT.md:88` reports for the sibling graph ("unreadable (663MB > V8 string limit)"). The first `/3d` viewer load throws inside the `try` → returns HTTP 500 (per `:524`), but a string-cap throw under load can also crash the event loop / spike RSS and trip the MCP-OOM watchdog restart loop documented in CLAUDE.md. The header comment ("well under the V8 string cap") is stale relative to the snapshot's own warning.
- **Fix sketch:** Gate on `st.size` (e.g. refuse > ~256MB and return a `missingProducer`-style 503 pointing at `build-viz-adjacency.mjs`); longer term parse `nodes[]` with a streaming JSON tokenizer (stream-json/clarinet) so peak RSS is bounded regardless of file growth.

---

### 2. `buildGraphSnapshot` cache is unbounded and keyed by `mtimeMs:limit` — trivial cache-busting DoS + memory growth
- **Anchor:** `_server.cjs:376` (`cacheKey = st.mtimeMs + ":" + limit`) + `:521` (`limit` clamped to 100..20000).
- **Tag:** [LEAN+S
... [+16110 chars truncated]
