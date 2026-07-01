---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "You are reviewing a single modified file as part of PRISM's PER-FILE SCRUTINY GA"
date: "2026-05-14"
first_ts: "2026-05-14T13:31:50.978Z"
last_ts: "2026-05-14T13:33:01.585Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-a6b75b85b2f183524.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# You are reviewing a single modified file as part of PRISM's PER-FILE SCRUTINY GA

> **claude-code-cli** | 2026-05-14 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-a6b75b85b2f183524.jsonl`

## Transcript

### User | 2026-05-14T13:31:50.978Z

You are reviewing a single modified file as part of PRISM's PER-FILE SCRUTINY GATE for unit U-CLEANUP-D5.

FILE TO REVIEW (read it end-to-end): H:\prism\scripts\build-wiki-leaf-index.mjs

UNIT D5 CONTRACT (what this file must satisfy):
- D5 extends `wiki-precheck-inject.mjs` to honor `boost_keywords` frontmatter. This file (`build-wiki-leaf-index.mjs`) is the UPSTREAM half: it builds `knowledge/wiki/architecture/_leaf-index.jsonl`, which the hook reads. The change here must make the leaf-index carry a `boost_keywords` field per entry when the source wiki .md file has `boost_keywords:` in its frontmatter.
- Frontmatter `boost_keywords` may be inline (`boost_keywords: [hook, settings.json, "*.mjs"]`) or block-sequence form.
- MUST be backward compatible: the original `parseFrontmatter` only ever read scalar keys (title/type/id/category). Existing behavior for scalars must be unchanged. Entries WITHOUT `boost_keywords` must produce IDENTICAL JSONL lines to before (no new field).
- `boost_keywords` in the JSONL must be lowercased, trimmed, deduped-of-empties, capped (24).

WHAT CHANGED: `parseFrontmatter` was rewritten to be array-aware (inline `[...]` + block `- item` forms); a `normalizeBoostKeywords` helper was added; `pushEntry` gained an optional 6th param; the 3 extraction call sites (architecture / tribal / code-tribal loops) now pass `normalizeBoostKeywords(fm.boost_keywords)`; the final stdout log reports a `boostEntryCount`.

REVIEW FOCUS:
1. Backward compatibility — does any pre-existing scalar key now parse differently in a way that breaks the title/type/id/category reads? Consider edge cases: a key whose value is empty followed by a non-`- ` line; a value containing `:`; a value that happens to start with `[` but isn't an array; quoted values.
2. The block-sequence parser — `pendingArrayKey` state machine. Can it leak across keys? Can a `  - ` line be misattributed? What about a scalar key with empty value (`verified_by:`) followed later by an unrelated `  
... [+561 chars truncated]

### Assistant | 2026-05-14T13:31:55.173Z

I'll review this file end-to-end against the D5 contract.

### Assistant | 2026-05-14T13:31:55.235Z

[tool_use: Read]

### User | 2026-05-14T13:31:56.955Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-wiki-leaf-index.mjs
4	 *
5	 * Walks knowledge/wiki/architecture/**\/*.md and emits a compact JSONL index:
6	 *   knowledge/wiki/architecture/_leaf-index.jsonl
7	 *
8	 * One line per entry: { name, title, type, desc, path } where:
9	 *   - name  = basename without .md  (the [[wiki-link]] target)
10	 *   - title = frontmatter title (falls back to first H1)
11	 
... [+12891 chars truncated]

### Assistant | 2026-05-14T13:33:01.585Z

Now let me analyze the critical paths carefully against the contract.

## Analysis

### 1. Backward compatibility of `parseFrontmatter`

The original parser (per the contract and comment at line 58-60) only read scalar keys. Let me trace the rewritten parser against edge cases:

**Edge case A — empty scalar value followed by unrelated `- ` line:** This is the contract's explicit concern (REVIEW FOCUS #2). Consider:
```yaml
verified_by:
title: My Page
```
Line `verified_by:` → `rawVal === ""` → `fm.verified_by = ""`, `pendingArrayKey = "verified_by"`. Next line `title: My Page` → `seq` regex `^\s+-\s+` requires leading whitespace, doesn't match. `kv` matches → `pendingArrayKey = null`, `fm.title = "My Page"`. **Correct.**

But now consider an empty scalar followed by a markdown-style continuation that *looks* like a sequence item — this can't happen *inside* frontmatter normally, but a multiline YAML value could. Consider:
```yaml
verified_by:
description: |
  - some bullet in a literal block
```
Line `verified_by:` → `pendingArrayKey = "verified_by"`. Line `description: |` → `kv` matches, `rawVal = "|"`, not empty → `pendingArrayKey = null`, `fm.description = "|"`. Line `  - some bullet...` → `seq` matches, but `pendingArrayKey` is now `null` → falls through to `kv` match attempt: `^([a-z_-]+)\s*:\s*` — `- some bullet in a literal block` — does `- some` match `[a-z_-]+`? The string after trim-less raw is `  - some bullet in a literal block`. The regex is not anchored with `\s*` prefix... actually `^([a-z_-]+)` requires the line to *start* with `[a-z_-]`. The line starts with spaces, so `kv` doesn't match → `pendingArrayKey = null; continue`. **No corruption.** Good — but this is a latent issue only if a key named with hyphens appears; not a regression since the original parser had the same `kv` regex.

**Edge case B — value containing `:`** e.g. `title: Foo: Bar`. `kv` regex `^([a-z_-]+)\s*:\s*(.*)$` — greedy `[a-z_-]+` matches `title`, then `\s*:\s*`, then `(.*)` =
... [+8898 chars truncated]
