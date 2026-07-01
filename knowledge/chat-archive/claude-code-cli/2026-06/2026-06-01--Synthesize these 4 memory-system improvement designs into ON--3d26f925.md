---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Synthesize these 4 memory-system improvement designs into ONE prioritized, build"
date: "2026-06-01"
first_ts: "2026-06-01T02:38:55.022Z"
last_ts: "2026-06-01T02:42:46.943Z"
cwd: "H:\\prism-slot-golf"
messages: 27
user_msgs: 12
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_80ffee6b-140/agent-a5a9b3cbeccaea4dd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Synthesize these 4 memory-system improvement designs into ONE prioritized, build

> **claude-code-cli** | 2026-06-01 | 27 msgs (12 user / 15 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_80ffee6b-140/agent-a5a9b3cbeccaea4dd.jsonl`

## Transcript

### User | 2026-06-01T02:38:55.022Z

Synthesize these 4 memory-system improvement designs into ONE prioritized, buildable roadmap for the operator (who asked "can we improve memory generation/allocation/invocation + persistent context?").

VERIFIED CURRENT STATE (golf audited this TODAY — treat as ground truth, do NOT re-derive; your job is to DESIGN IMPROVEMENTS on top, and to VERIFY each proposed improvement does NOT already exist by reading the live code). REPO: H:/prism (absolute paths). READ-ONLY.

MEMORY SYSTEM AS-BUILT (mature — most "obvious gaps" are already solved; check before proposing):
- Store: C:/Users/wompu/.claude/projects/H--prism/memory = 1188 .md (lean working/index store, ≤24KB MEMORY.md cap via memory-size-watch.mjs) ; H:/prism/knowledge/memories = 11478 .md (fanned per-file archive, 10690 in reference/). Namespaces: feedback,reference,project,user,patterns,mistakes,inbox,scrutiny,uncategorized,weekly-synthesis,galaxies. C:->H: fed every Stop by .claude/hooks/stop-obsidian-memory-feed.mjs. Per-slot auto-capture: stop-auto-capture-per-slot.mjs. Manual: /remember.
- GENERATION already has: Stop auto-feed, per-slot auto-capture, size watchdog (stop-memory-size-watchdog.mjs), autocompact (memory-autocompact-stop.mjs), pretool-memory-size-gate.mjs, bug-finding-wiki-gate.mjs. The memory-writing CONVENTION says "check for existing file that covers it — update rather than duplicate" (is this ENFORCED at write time, or just convention?).
- ALLOCATION already has: namespaces, 24KB MEMORY.md cap + MEMORY-RECENT.md overflow, autocompact, the galaxies/ namespace (34 galaxy brains).
- INVOCATION already has: HYBRID BM25 + dense(nomic-embed-text 768d) + Reciprocal-Rank-Fusion recall (scripts/lib/memory-index-search-lib.mjs#runMemoryIndexSearch), wired into the UserPromptSubmit hook memory-index-precheck-inject.mjs (line 77) AND the prism_memory:brain_recall MCP action (memoryDispatcher.ts:1323). Per-edit recall: memory-relevance-inject.mjs (file-path query, lexical-rerank). recall-counter-track.
... [+48252 chars truncated]

### Assistant | 2026-06-01T02:39:09.395Z

I'll synthesize the 4 designs, but first let me verify the highest-leverage claims against live code, since the task explicitly requires confirming each proposed improvement doesn't already exist. Let me spot-check the load-bearing gaps in parallel.

### Assistant | 2026-06-01T02:39:11.256Z

[tool_use: Bash]

### Assistant | 2026-06-01T02:39:13.220Z

[tool_use: Bash]

### Assistant | 2026-06-01T02:39:15.504Z

[tool_use: Bash]

### Assistant | 2026-06-01T02:39:17.659Z

[tool_use: Bash]

### User | 2026-06-01T02:40:24.829Z

[tool_result] Exit code 255

### User | 2026-06-01T02:40:24.830Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd /h/prism && rg -l "PEER_SHARE_LEDGER"…) errored</tool_use_error>

### User | 2026-06-01T02:40:24.830Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd /h/prism && rg -l "PEER_SHARE_LEDGER"…) errored</tool_use_error>

### User | 2026-06-01T02:40:24.830Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd /h/prism && rg -l "PEER_SHARE_LEDGER"…) errored</tool_use_error>

### Assistant | 2026-06-01T02:40:27.280Z

The `cd /h/prism` path failed on Windows. Let me use the Grep tool and Windows paths instead.

### Assistant | 2026-06-01T02:40:28.212Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:40:29.124Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:40:30.141Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:40:30.564Z

[tool_use: Grep]

### User | 2026-06-01T02:41:10.729Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-01T02:41:21.773Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-01T02:41:25.553Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### User | 2026-06-01T02:41:34.881Z

[tool_result] Found 2 files
H:\prism\prism-test-6d0595\.claude\hooks\session-end-peer-share.mjs
H:\prism\.claude\hooks\session-end-peer-share.mjs

### Assistant | 2026-06-01T02:41:37.908Z

Verified: `PEER_SHARE_LEDGER` has only the writer (`session-end-peer-share.mjs`) — no SessionStart consumer. `superseded` has zero handling in the sidecar build. Let me confirm the two timed-out checks with scoped searches.

### Assistant | 2026-06-01T02:41:38.861Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:41:39.805Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:41:40.455Z

[tool_use: Grep]

### User | 2026-06-01T02:41:46.849Z

[tool_result] Found 1 file
H:\prism\.claude\commands\brain-recall.md

### User | 2026-06-01T02:41:46.865Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### User | 2026-06-01T02:41:53.486Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### Assistant | 2026-06-01T02:42:46.943Z

All four load-bearing gaps confirmed against live code:
- `PEER_SHARE_LEDGER` — writer only, **zero** SessionStart consumers (persistent-context #1 ✓)
- `memory-recall-eval` — **not** in brain-refresh (invocation #1 ✓)
- `brain_recall` — referenced **only** in its own skill `.md` under `.claude`, no hook/agent invokes it (invocation #3 ✓)
- `pretool-memory-size-gate.mjs` — **no** cosine/embed/similarity → no write-time semantic dedup (generation #1 ✓)
- `superseded` — **zero** matches in sidecar build (allocation #1 ✓)

Ground truth holds. Synthesizing the roadmap.

---

## Verdict

The memory system is **mature on the engine side and freshly self-refreshing** — hybrid BM25+dense+RRF recall, autocompact, size gates, per-slot auto-capture, session-continuity, and the 45-min Brain Refresh are all shipped and not worth re-touching. The genuine remaining frontier is the **feedback/closure layer wrapped around the engine**: nothing guards writes against the 11,478-file corpus (dedup is byte-only + exact-name only), nothing excludes superseded/dead memories from recall, the eval *measures* but never *tunes*, usefulness is *counted on Read* but never *fed back into ranking*, the best recall path (`brain_recall`) is *dormant for agents*, and the entire cross-chat learning loop is **architecturally broken at the read side** (write-only ledger, no boot consumer). Every win below is a half-built loop to close, not a new mechanism.

## Top improvements (ranked)

| # | Improvement | Axis | Lev | Eff | Domain | Dedup | 1-line design |
|---|-------------|------|-----|-----|--------|-------|---------------|
| 1 | **Read the peer-share ledger at boot** (close cross-chat learning loop) | persist-ctx | **H** | M | alpha+india | EXTENDS | New `session-start-peer-insight-inject.mjs` ingests `PEER_SHARE_LEDGER.jsonl`+`session-learning-log.jsonl`, ranks by confidence×recency×slot-domain, injects top-3; rehydrates `PeerLearningCoordinatorEngine` Map |
| 2 | **Write-time semantic near-dup g
... [+7596 chars truncated]
