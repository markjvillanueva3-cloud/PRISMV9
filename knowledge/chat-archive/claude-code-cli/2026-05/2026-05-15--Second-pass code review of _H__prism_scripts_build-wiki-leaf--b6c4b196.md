---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Second-pass code review of `H:/prism/scripts/build-wiki-leaf-index.mjs`. Another"
date: "2026-05-15"
first_ts: "2026-05-15T03:25:18.471Z"
last_ts: "2026-05-15T03:27:46.035Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 14
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-aebd3bf44e22424ae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Second-pass code review of `H:/prism/scripts/build-wiki-leaf-index.mjs`. Another

> **claude-code-cli** | 2026-05-15 | 30 msgs (14 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-aebd3bf44e22424ae.jsonl`

## Transcript

### User | 2026-05-15T03:25:18.471Z

Second-pass code review of `H:/prism/scripts/build-wiki-leaf-index.mjs`. Another reviewer is checking correctness; weight your review on INTEGRATION + CONVENTION + HIDDEN COUPLING they're less likely to catch:

CHANGE: Added a 4th corpus to the leaf-index builder: `knowledge/memories/**/*.md`. New `MEMORIES_DIR` env-overridable const + a memory-folding block before the JSONL write. Tracks per-corpus `seenMemoryNames` Set to dedup the flat-copy/subdir-copy duplication that produced 124 spurious `~2` entries.

CONTEXT FILES TO INSPECT:
- The modified script: `H:/prism/scripts/build-wiki-leaf-index.mjs` (READ FULL FILE — it's <400 lines)
- Consumer 1: `H:/prism/.claude/hooks/wiki-precheck-inject.mjs` — UserPromptSubmit hook, BM25+embeddings recall, type-agnostic.
- Consumer 2: `H:/prism/.claude/hooks/wiki-recall-on-read.mjs` — PostToolUse:Read recall.
- Consumer 3: `H:/prism/scripts/build-wiki-embeddings.mjs` — embeds leaf entries via Ollama nomic-embed-text.
- Adjacent surface: `H:/prism/.claude/hooks/memory-relevance-inject.mjs` — keyword-only memory recall for PreToolUse:Edit (KEEPS WORKING; the new wiki-side path is COMPLEMENTARY).
- Reference: `H:/prism/knowledge/memories/` (175 unique memories spanning feedback/reference/project/user/uncategorized).
- Mirror: `H:/prism/.claude/hooks/memory-mirror-to-vault.mjs` — confirm this is what writes the in-vault copies.
- CLAUDE.md memory schema reference (global instructions): memories use frontmatter `name:`, `description:`, `metadata: { type: ... }`.

REVIEW MANDATE — pull on threads the correctness reviewer won't:
1. CONVENTION CONFORMANCE: does the new block's structure match the surrounding code's idiom (variable naming, comment style, error-fold pattern)? The original used `tribalCount` / `codeTribalCount` — `memoryCount` matches. Block placement before JSONL write matches. Comment density matches?
2. HIDDEN COUPLING: which OTHER scripts/hooks read `_leaf-index.jsonl` or `_stats.md`? Will any of them break on new `m
... [+1775 chars truncated]

### Assistant | 2026-05-15T03:25:22.547Z

I'll perform a thorough second-pass review focused on integration, convention, and hidden coupling.

### Assistant | 2026-05-15T03:25:22.693Z

[tool_use: Read]

### User | 2026-05-15T03:25:23.153Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-wiki-leaf-index.mjs' was already read 19s ago in this session and is unchanged (mtime 1778815256357). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T03:25:26.643Z

[tool_use: Bash]

### Assistant | 2026-05-15T03:25:28.103Z

[tool_use: Grep]

### Assistant | 2026-05-15T03:25:28.617Z

[tool_use: Read]

### Assistant | 2026-05-15T03:25:29.139Z

[tool_use: Read]

### Assistant | 2026-05-15T03:25:29.678Z

[tool_use: Read]

### Assistant | 2026-05-15T03:25:30.208Z

[tool_use: Read]

### Assistant | 2026-05-15T03:25:30.533Z

[tool_use: Read]

### User | 2026-05-15T03:25:30.710Z

[tool_result] #!/usr/bin/env node
/**
 * build-wiki-leaf-index.mjs
 *
 * Walks knowledge/wiki/architecture/**\/*.md and emits a compact JSONL index:
 *   knowledge/wiki/architecture/_leaf-index.jsonl
 *
 * One line per entry: { name, title, type, desc, path } where:
 *   - name  = basename without .md  (the [[wiki-link]] target)
 *   - title = frontmatter title (falls back to first H1)
 *   - type  = frontmatte
... [+17981 chars truncated]

### User | 2026-05-15T03:25:32.861Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * wiki-recall-on-read.mjs — PostToolUse hook (matcher: Read).
5	 *
6	 * Context-retention upgrade: when a chat reads a PRISM source file that has a
7	 * wiki entry (an engine, dispatcher, hook, or skill source), inject that entry's
8	 * one-line summary + a pointer to the full wiki entry. Closes the gap left by
9	 * wiki-precheck-inject.mjs (which only 
... [+7615 chars truncated]

### User | 2026-05-15T03:25:32.876Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-wiki-embeddings.mjs
4	 *
5	 * Embeds the *concept* leaf entries (engines, dispatchers, registries, layers,
6	 * domains, skills, hooks, formulas, algorithms, milestones, monolith categories,
7	 * frontends, JM-Die customers, combos, design specs, …) — everything EXCEPT the
8	 * ~9.2K per-action entries, which are too numerous and too templated to be worth
9	 
... [+9918 chars truncated]

### User | 2026-05-15T03:25:32.961Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * memory-relevance-inject.mjs — PreToolUse hook for Edit/Write/MultiEdit.
5	 *
6	 * Before the user edits a file, scan their auto-memory directory for
7	 * any feedback memo that mentions the file path, basename, or symbol
8	 * derived from it. Inject the top-3 matches as PreToolUse context.
9	 *
10	 * Goal: "no repeated mistakes." If past feedback says
... [+5093 chars truncated]

### User | 2026-05-15T03:25:32.969Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * memory-mirror-to-vault.mjs — PostToolUse hook
5	 *
6	 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04.
7	 *
8	 * When Claude writes/edits a file in the user's memory directory
9	 * (C:/Users/.../.claude/projects/H--prism/memory/), copy it to the H:
10	 * vault under H:/prism/knowledge/memories/{category}/ and embed it via
11	 * prism_memory:remember through the ru
... [+9579 chars truncated]

### User | 2026-05-15T03:25:32.971Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+21519 chars truncated]

### User | 2026-05-15T03:25:51.819Z

[tool_result] Found 80 files
knowledge\wiki\architecture\_stats.md
knowledge\wiki\index.md
.claude\hooks\wiki-precheck-inject.mjs
knowledge\wiki\architecture\tribal-corpus-index.md
knowledge\wiki\architecture\tribal\tribal-worknc-cam-tips.md
knowledge\wiki\architecture\tribal\tribal-wedm-knowledge-tips-kb-10.md
knowledge\wiki\architecture\tribal\tribal-wedm-knowledge-tips-kb-9.md
knowledge\wiki\architecture\tri
... [+4732 chars truncated]

### Assistant | 2026-05-15T03:25:55.795Z

I have enough context. Let me check a few hidden-coupling threads quickly, then issue the review.

### Assistant | 2026-05-15T03:25:57.544Z

[tool_use: Grep]

### Assistant | 2026-05-15T03:25:59.270Z

[tool_use: Grep]

### Assistant | 2026-05-15T03:25:59.887Z

[tool_use: Grep]

### User | 2026-05-15T03:26:00.276Z

[tool_result] Found 10 files
scripts\build-wiki-leaf-index.mjs
scripts\audit-wiki-coverage.mjs
scripts\viz-regen-guard.mjs
scripts\system-viz-on-commit.mjs
scripts\system-health\09-wiki-lint.ps1
scripts\extract-skill-triggers.mjs
scripts\build-wiki-embeddings.mjs
scripts\regen-wiki-from-viz.mjs
scripts\generate-tribal-wiki.mjs
scripts\lint-wiki-orphans.mjs

### User | 2026-05-15T03:26:00.825Z

[tool_result] 127:type: architecture
178:type: architecture

### Assistant | 2026-05-15T03:26:01.809Z

[tool_use: Bash]

### Assistant | 2026-05-15T03:26:03.060Z

[tool_use: Grep]

### User | 2026-05-15T03:26:03.989Z

[tool_result] Found 7 files
knowledge\memories\_index\MEMORY.md
knowledge\memories\reference\reference_u_coord11_ipc.md
knowledge\memories\reference\devops_improvements.md
knowledge\memories\project\project_error_learn.md
knowledge\memories\project_error_learn.md
knowledge\memories\devops_improvements.md
knowledge\memories\uncategorized\devops_improvements.md

### User | 2026-05-15T03:26:18.163Z

[tool_result] Found 40 files limit: 40
mcp-server\data\state\session-file-ownership.json
knowledge\wiki\architecture\_stats.md
scripts\build-wiki-leaf-index.mjs
scripts\audit-wiki-coverage.mjs
scripts\generate-system-viz.mjs
knowledge\wiki\index.md
scripts\build-wiki-recall-digest.mjs
.claude\hooks\wiki-precheck-inject.mjs
knowledge\wiki\.hook-cache\001ad98d4649dbd9b6d96e1067c8c168fd35c1dd.json
mcp-server\data\
... [+1996 chars truncated]

### User | 2026-05-15T03:26:23.945Z

[tool_result] MEMORY.md
_index/
devops_improvements.md
distributed_locking.md
feedback/
feedback_ai_first_development.md
feedback_always_build.md
feedback_always_close_out.md
feedback_backend_before_frontend.md
feedback_box_programs_amateur.md
feedback_chat_lane_discipline.md
feedback_continue_posts_trigger.md
feedback_cross_session_duplication.md
feedback_directive_naming.md
feedback_docker_wsl_recovery.md
fee
... [+372 chars truncated]

### Assistant | 2026-05-15T03:27:46.035Z

I have enough context to issue the review. Here it is:

---

## Second-Pass Review — `H:/prism/scripts/build-wiki-leaf-index.mjs` (memory-corpus addition)

**Reviewer weighting:** integration, convention, hidden coupling, cross-cutting concerns the correctness reviewer is unlikely to surface.

### Verdict: PASS WITH P1 FINDINGS

Two P1 items worth fixing before close-out. Several P2 doc-debt items. No P0s — the change is functionally sound, fail-safe, and matches surrounding idiom well.

---

### Convention Conformance — PASS

- Naming (`memoryCount`, `MEMORIES_DIR`, `seenMemoryNames`) matches the established `tribalCount` / `codeTribalCount` / `TRIBAL_DIR` / `CODE_TRIBAL_DIR` cadence.
- Error-fold pattern (`try/catch { skipped++; continue; }`) is byte-identical to the tribal block.
- Comment density is **higher than the tribal/code-tribal blocks** — defensible because the dedup + nested-metadata + path-segment-fallback logic has more sharp edges than the prior corpora. Not a finding, just noted.
- `pushEntry` is reused correctly, including `boost_keywords` extraction via `normalizeBoostKeywords(fm.boost_keywords)` — memories inherit the same curation surface for free. Good.
- `existsSync` gate matches the surrounding pattern. JSONL ordering preserved (arch → tribal → code-tribal → memories), so the cross-corpus `~2` suffix rule is deterministic.

---

### Hidden Coupling — 1× P1, 1× P2

**P1 — `build-wiki-embeddings.mjs` `isConcept()` heuristic silently INCLUDES all memory entries.**
`mcp-server/scripts/build-wiki-embeddings.mjs` lines 76-87:

```js
const CONCEPT_TYPES = new Set([
  "engine", "dispatcher", "registry", "architecture", "skill", "hook",
  "formula", "algorithm", "milestone", "monolith", "frontend", "domain", "layer",
]);
function isConcept(r) {
  if (FLAGS.includeActions) return true;
  const t = String(r.type || "").toLowerCase();
  if (t === "action") return false;
  if (String(r.path || "").includes("/actions/")) return false;
  return CONCEPT_TYPE
... [+11434 chars truncated]
