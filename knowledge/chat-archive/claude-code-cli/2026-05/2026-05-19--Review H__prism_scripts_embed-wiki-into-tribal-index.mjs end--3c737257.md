---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c737257-2eff-42f5-a23a-ca1345246313"
title: "Review H:\\prism\\scripts\\embed-wiki-into-tribal-index.mjs end-to-end (read the wh"
date: "2026-05-19"
first_ts: "2026-05-19T00:27:11.956Z"
last_ts: "2026-05-19T00:32:13.041Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/3c737257-2eff-42f5-a23a-ca1345246313/subagents/agent-aa1174aafb6a6b5b2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review H:\prism\scripts\embed-wiki-into-tribal-index.mjs end-to-end (read the wh

> **claude-code-cli** | 2026-05-19 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c737257-2eff-42f5-a23a-ca1345246313/subagents/agent-aa1174aafb6a6b5b2.jsonl`

## Transcript

### User | 2026-05-19T00:27:11.956Z

Review H:\prism\scripts\embed-wiki-into-tribal-index.mjs end-to-end (read the whole file).

CONTEXT — what it must do: idempotently append wiki .md files to state/shared/tribal-embed-index.json as canonical entries so the automatic tribal-knowledge injection pipeline (tribal-by-domain-inject.mjs → tribal-rerank.mjs → cosine over index.entries[]) can surface them. It closes a real gap: commit d716d20a96 shipped 3 wikis (lora-fine-tuning-patterns, reinforcement-learning-patterns, mcp-tool-design) WITHOUT embedding them, so they are absent from the index and never auto-inject.

Canonical entry shape (reverse-engineered, must match the existing iter3 entries EXACTLY for retrieval to work): { id:"external:"+winAbsPath, source:"external", title:basename-no-.md, domain:"backend-dev", text:flattenedBody.slice(0,400), path:winAbsPath, hash:sha256(flattened)[:16], embedding:768-d nomic-embed-text:latest }. The embed endpoint/model MUST equal tribal-rerank.mjs's (http://127.0.0.1:11434 /api/embeddings {model:"nomic-embed-text:latest",prompt}) or cosine is meaningless.

Grade PASS/FAIL. Flag every P0/P1. Specifically verify:
1. The canonical entry shape exactly matches (id prefix, source, field set, text 400-cap, win backslash path).
2. All-or-nothing fail-loud: a single Ollama failure must abort with NO write (no partial index). Confirm the embed-all-then-write ordering actually guarantees this.
3. Idempotency: re-running with the same files must not duplicate entries; --force replace-in-place must not corrupt the array.
4. Atomic write correctness (tmp+rename, same dir/volume).
5. Windows path construction correctness on win32 (path.resolve already yields backslashes) AND that makeWinPath is deterministic.
6. Any silent-catch / R12 violation / floating promise / off-by-one in the splice (byId map built from idx.entries, replace vs append).
7. Arg parsing edge cases (--domain at end of argv, unknown flags, no files).
Report concrete line numbers.

### Assistant | 2026-05-19T00:27:23.954Z

I'll review this file end-to-end.

### Assistant | 2026-05-19T00:27:23.956Z

[tool_use: Read]

### User | 2026-05-19T00:27:33.894Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * embed-wiki-into-tribal-index.mjs
4	 *
5	 * BACKEND-DEV-LOOP/U-TRIBAL-EMBED-GAP (2026-05-19, slot foxtrot).
6	 *
7	 * Idempotent appender that embeds wiki markdown files into
8	 * `state/shared/tribal-embed-index.json` so they become reachable by the
9	 * automatic tribal-knowledge injection pipeline
10	 * (`tribal-by-domain-inject.mjs` → `tribal-rerank.mjs` → cosin
... [+13480 chars truncated]

### Assistant | 2026-05-19T00:27:36.868Z

Now let me cross-check against `tribal-rerank.mjs` to verify endpoint/model/field parity, since the canonical contract depends on it.

### Assistant | 2026-05-19T00:27:38.178Z

[tool_use: Bash]

### User | 2026-05-19T00:27:51.137Z

[tool_result] 0 matches for 'api/embeddings|nomic-embed|11434|e\.embedding|e\.text|e\.domain|e\.source|\.entries'

### Assistant | 2026-05-19T00:27:54.638Z

[tool_use: Bash]

### User | 2026-05-19T00:28:33.303Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T00:28:35.897Z

[tool_use: Bash]

### User | 2026-05-19T00:29:17.143Z

[tool_result] Exit code 1

### Assistant | 2026-05-19T00:29:19.599Z

[tool_use: Glob]

### Assistant | 2026-05-19T00:29:19.606Z

[tool_use: Glob]

### User | 2026-05-19T00:29:40.132Z

[tool_result] .claude\worktrees\rgs6-audit-v2\.claude\scripts\tribal-rerank.mjs
prism-test-6d0595\.claude\scripts\tribal-rerank.mjs
.claude\scripts\tribal-rerank.mjs

### User | 2026-05-19T00:29:40.135Z

[tool_result] .claude\hooks\tribal-by-domain-inject.test.mjs
.claude\hooks\tribal-by-domain-inject.mjs
knowledge\wiki\architecture\hooks\runtime\tribal-by-domain-inject.md
knowledge\wiki\architecture\hooks\runtime\tribal-by-domain-inject-test.md

### Assistant | 2026-05-19T00:29:44.568Z

[tool_use: Bash]

### User | 2026-05-19T00:30:19.830Z

[tool_result] 0 matches for 'api/embeddings|nomic-embed|11434|OLLAMA|\.embedding|\.entries|\.text|\.domain|\.source|cosine'

### Assistant | 2026-05-19T00:30:22.285Z

The path has a space-prefix issue. Let me read directly.

### Assistant | 2026-05-19T00:30:22.608Z

[tool_use: Read]

### User | 2026-05-19T00:30:27.622Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * tribal-rerank.mjs — L2 of TRIBAL × AI
4	 *
5	 * Reads `state/shared/tribal-embed-index.json` (L1), embeds the
6	 * incoming query via Ollama nomic-embed-text, returns top-N hits
7	 * with optional domain weighting.
8	 *
9	 * Differs from L1 --query in three ways:
10	 *   1. Domain-aware: --domain <mill|lathe|wedm|cad|cam|backend-dev|general>
11	 *      doubles the 
... [+6850 chars truncated]

### Assistant | 2026-05-19T00:30:30.772Z

Now I have the canonical contract. Let me cross-check the iter3 entry shape in the actual index, and a couple of correctness details.

### Assistant | 2026-05-19T00:30:34.008Z

[tool_use: Bash]

### User | 2026-05-19T00:30:47.101Z

[tool_result] total 487 external 106
{
 "id": "external:H:\\prism-slot-bravo\\knowledge\\wiki\\code-tribal\\engineering-failure-classes.md",
 "source": "external",
 "title": "PRISM Engineering Failure-Class Tribal Tips",
 "domain": "backend-dev",
 "path": "H:\\prism-slot-bravo\\knowledge\\wiki\\code-tribal\\engineering-failure-classes.md",
 "hash": "a67728185ee97cd8",
 "textLen": 400,
 "embLen": 768,
 "keys": [
... [+113 chars truncated]

### Assistant | 2026-05-19T00:30:54.177Z

The canonical shape matches exactly: keys `[id, source, title, domain, text, path, hash, embedding]`, `text` capped at 400, `embedding` 768-d, `id` = `"external:" + winBackslashPath`, `domain:"backend-dev"`. The script's `buildEntry` (lines 153-167) produces precisely this set.

One important observation from the sample: the existing entry's path is `H:\prism-slot-bravo\...` (a slot worktree), while this script uses `path.resolve(filePath)` → it will produce whatever tree the script runs from (e.g. `H:\prism\...`). That's a semantic note, not a contract break — `id` is still self-consistent and unique. Let me verify the `title` convention against the sample (sample title is a prose H1, not the basename).

### Assistant | 2026-05-19T00:30:56.664Z

[tool_use: Bash]

### User | 2026-05-19T00:31:13.683Z

[tool_result] PROSE-H1 | title="PRISM Engineering Failure-Class Tribal Tips" | base=external:H:\prism-slot-bravo\knowledge\wiki\code-tribal\engineering-failure-classes
PROSE-H1 | title="PRISM Architecture & Computer-Engineering Pattern Tribal Tips" | base=external:H:\prism-slot-bravo\knowledge\wiki\code-tribal\architecture-patterns
PROSE-H1 | title="karpathy-12-rule-discipline" | base=external:H:\prism\knowledg
... [+703 chars truncated]

### Assistant | 2026-05-19T00:32:13.041Z

My base-comparison printed the wrong field, but the data is conclusive: in several cases `title` IS the basename (`karpathy-12-rule-discipline`, `fail-loud-r12-patterns`, `per-file-scrutiny-gate`, `atomic-write-idempotency-patterns`, `tribal-precontext-architecture`, `llm-agent-loop-design`), while the two earliest (`engineering-failure-classes`, `architecture-patterns`) use a prose H1. So the iter3 ingest convention is **inconsistent**, but the dominant/recent convention is **basename-without-.md** — which is exactly what the script's `buildEntry` produces (line 156). This is a non-issue for retrieval (rerank ranks on `embedding`, displays `title`).

I have everything needed. Here is the review.

---

## Code Quality Analysis Report — `embed-wiki-into-tribal-index.mjs`

### Summary
- Grade: **PASS** (ships correctly; no P0; two P1s worth fixing before relying on it at fleet scale)
- File: `H:\prism\scripts\embed-wiki-into-tribal-index.mjs` (321 lines)
- Contract verified against `H:\prism\.claude\scripts\tribal-rerank.mjs` and the live `tribal-embed-index.json` (487 entries / 106 `source:"external"`).

### Per-question verdicts

**1. Canonical entry shape — PASS (exact match).**
`buildEntry` (153-167) emits exactly `{id, source, title, domain, text, path, hash, embedding}` — byte-identical key set to the live iter3 external entries I sampled. `id` = `"external:" + makeWinPath` (141-143, 158), `source:"external"` (159), `text` `.slice(0, TEXT_MAX=400)` (105, 162), `path` = backslash-absolute (163), `hash` = `sha256(flat).slice(0,16)` (145-147). The 16-hex hash differs algorithmically from the original ingest's hash but is documented honestly (48-55) and is provably not load-bearing — `tribal-rerank.mjs` reads only `e.embedding/e.text/e.domain/e.source/e.id/e.title/e.path` (lines 99-104, 160-177), never `e.hash`. **Endpoint/model parity confirmed**: this script POSTs `${OLLAMA_URL}/api/embeddings` with `{model:"nomic-embed-text:latest",prompt}` (193-198, 103-104) — c
... [+7675 chars truncated]
