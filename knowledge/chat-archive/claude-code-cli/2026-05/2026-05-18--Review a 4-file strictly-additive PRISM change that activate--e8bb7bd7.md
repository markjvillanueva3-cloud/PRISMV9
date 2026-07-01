---
type: "chat-session"
source: "claude-code-cli"
session_id: "e8bb7bd7-d7f2-4b4c-8941-1eedeead8032"
title: "Review a 4-file strictly-additive PRISM change that activates the orphan `rtk-ar"
date: "2026-05-18"
first_ts: "2026-05-18T20:35:00.622Z"
last_ts: "2026-05-18T20:36:56.612Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/e8bb7bd7-d7f2-4b4c-8941-1eedeead8032/subagents/agent-ab7a7ba8aeda572fa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review a 4-file strictly-additive PRISM change that activates the orphan `rtk-ar

> **claude-code-cli** | 2026-05-18 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e8bb7bd7-d7f2-4b4c-8941-1eedeead8032/subagents/agent-ab7a7ba8aeda572fa.jsonl`

## Transcript

### User | 2026-05-18T20:35:00.622Z

Review a 4-file strictly-additive PRISM change that activates the orphan `rtk-archive-and-index.mjs` PostToolUse:Bash hook AND ships a consumer dashboard for the archive jsonl it writes, plus a previously-zero-coverage test file for the `isCompanionTarget()` helper. Report PASS/FAIL under 400 words with severity-graded findings (P0/P1/P2/P3).

**Files**:

1. `C:/Users/Mark Villanueva/.claude/settings.json` (auto-mirrored to H:/.claude/settings.json) — appended ONE entry to `hooks.PostToolUse[matcher="Bash"].hooks[]`:
   ```json
   { "type": "command", "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/rtk-archive-and-index.mjs", "timeout": 2000 }
   ```
   The wired hook is pre-existing (T4), built but never wired since some prior unwiring event. Self-gates on rtk commands only (line 91: `isRtkCommand(cmd)` check); non-rtk Bash calls return SILENCE immediately.

2. `H:/prism/scripts/rtk-archive-dashboard.mjs` (NEW, ~165 lines) — consumer dashboard for `state/shared/rtk-archive.jsonl`. Exports 4 pure helpers (`parseWindow`, `parseArgs`, `readArchive`, `aggregate`). CLI: `node scripts/rtk-archive-dashboard.mjs [--json] [--window=24h|7d] [--top=10] [--archive=<path>]`. Mirrors `scripts/ollama-offload-dashboard.mjs` pattern. Smoke-tested live against the existing 392-entry archive: prints lifetime=392, window=0 (all entries 71-78h old → outside 24h window), correctly handles missing-file → "no archive yet" advisory.

3. `H:/prism/scripts/rtk-archive-dashboard.test.mjs` (NEW, ~150 lines) — 16 `node:test` cases covering all 4 exported helpers: parseWindow happy/invalid/clamp-to-168h/empty-defaults; parseArgs defaults/flags/bounds/unknown-arg-fail-loud; readArchive missing-file + malformed-jsonl fail-soft; aggregate empty/window-filter/top-N-sort/top-N-truncate. Real-fs tmpdir + cleanup. 16/16 PASS.

4. `H:/prism/.claude/hooks/__tests__/html-companion-guard.test.mjs` (NEW, ~125 lines) — 20 `node:test` cases for the `isCompanionTarget()` helper added in ear
... [+2277 chars truncated]

### Assistant | 2026-05-18T20:35:46.256Z

I'll review the 4 files fresh from disk.

### Assistant | 2026-05-18T20:35:47.252Z

[tool_use: Read]

### Assistant | 2026-05-18T20:35:47.754Z

[tool_use: Read]

### Assistant | 2026-05-18T20:35:48.283Z

[tool_use: Read]

### Assistant | 2026-05-18T20:35:48.612Z

[tool_use: Read]

### User | 2026-05-18T20:35:50.946Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\rtk-archive-and-index.mjs' was already read 17m ago in this session and is unchanged (mtime 1778855735461). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T20:35:54.954Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/rtk-archive-dashboard.mjs — consumer for state/shared/rtk-archive.jsonl
3	//
4	// Sister to scripts/ollama-offload-dashboard.mjs. The rtk-archive-and-index
5	// PostToolUse:Bash hook appends every `rtk <cmd>` invocation to
6	// state/shared/rtk-archive.jsonl (cmd, output, savings estimate, session_id).
7	// Without a consumer, that data is a write-only audit log 
... [+7730 chars truncated]

### User | 2026-05-18T20:35:55.487Z

[tool_result] 1	/**
2	 * rtk-archive-dashboard — pure-helpers test
3	 *
4	 * Covers the 4 exported pure helpers (parseWindow, parseArgs, readArchive,
5	 * aggregate). Closes the comprehensive-build-enforce coverage gate for the
6	 * new dashboard shipped 2026-05-18 (slot kilo, U-KILO-DEDUP-2026-05-18 fwd).
7	 *
8	 * Uses node:test (not vitest) — sibling convention.
9	 */
10	
11	import { test } from "node:test";
... [+7015 chars truncated]

### User | 2026-05-18T20:35:56.127Z

[tool_result] 1	/**
2	 * html-companion-guard — isCompanionTarget tests
3	 *
4	 * Closes the pre-existing zero-coverage gap that the 2026-05-18 (slot kilo)
5	 * extension WIDENED with 3 new path patterns (PATCH_FILE_RE + ROOT_DOC_RE).
6	 * Reviewer P2 from the 2-agent per-file scrutiny round.
7	 *
8	 * Uses node:test (not vitest) — matches sibling convention.
9	 *
10	 * Coverage: spec match, research match, das
... [+4700 chars truncated]

### Assistant | 2026-05-18T20:36:06.368Z

Now let me check the existing hook source for the wired hook + companion-guard helper to grade correctness.

### Assistant | 2026-05-18T20:36:07.369Z

[tool_use: Read]

### Assistant | 2026-05-18T20:36:07.724Z

[tool_use: Read]

### User | 2026-05-18T20:36:10.532Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\rtk-archive-and-index.mjs' was already read 17m ago in this session and is unchanged (mtime 1778855735461). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T20:36:21.355Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * html-companion-guard.mjs — per-commit guard for HTML spec/research companions.
5	 *
6	 * Fires on `git commit`. If the staged set touches any Markdown or HTML file
7	 * under state/shared/specs/** or state/shared/research/**, then for each such
8	 * "twin" (a `<stem>.md` ↔ `<stem>.html` pair) it checks, against the working
9	 * tree:
10	 *
11	 *   1. 
... [+9112 chars truncated]

### Assistant | 2026-05-18T20:36:56.612Z

## Code Quality Analysis Report — VERDICT: PASS

### Summary
- **Overall Quality**: 8.5/10
- **Files Reviewed**: 4 (1 settings.json edit, 1 dashboard, 2 test files)
- **Findings**: 0 P0 / 1 P1 / 4 P2 / 3 P3

### P1 — Should fix before next iter
**`rtk-archive-dashboard.mjs:187` — fragile entrypoint detection.** The `import.meta.url === `file://${process.argv[1].replace(...)}`` comparison breaks on Windows in two real ways: (a) `file://H:/prism/...` (forward-slash path) vs Node's actual `file:///H:/prism/...` (triple-slash drive form) — never byte-equal. (b) `process.argv[1]` is undefined when imported (the `?.endsWith` covers it, but ONLY THAT half does work, so the `||` always falls through to the suffix check). Net: the URL-equality clause is dead code and the suffix check is what's actually firing. Replace with `url.pathToFileURL(process.argv[1]).href === import.meta.url` (node:url) or just keep the suffix check and drop the dead clause for honesty (R12).

### P2 — Worth addressing
1. **`html-companion-guard.test.mjs:115` — `undefined` test asserts behavior of an internal coercion bug, not a contract.** `SPEC_FILE_RE.test(undefined)` coerces to the string `"undefined"`, which by coincidence doesn't match. If someone later widens a regex, this test silently passes through real `undefined`. Add a guard at the top of `isCompanionTarget`: `if (typeof rel !== "string") return false;` — then the test asserts a real contract.
2. **`rtk-archive-dashboard.mjs:51` — `ARCHIVE_FILE` captured at import time** as the `parseArgs` default. Test isolation via `--archive=<tmp>` works (verified in tests), but if anyone calls `parseArgs([])` from a multi-process test fixture expecting env override, they get the import-time value. Minor; non-blocking.
3. **`rtk-archive-dashboard.test.mjs:95` — `mkdirSync(tmpdir(),{recursive:true})` is a no-op** (tmpdir always exists). Cosmetic; remove.
4. **Hook wiring load.** 5 hooks on `PostToolUse:Bash` matcher with timeouts summing 2000+2000+othe
... [+2008 chars truncated]
