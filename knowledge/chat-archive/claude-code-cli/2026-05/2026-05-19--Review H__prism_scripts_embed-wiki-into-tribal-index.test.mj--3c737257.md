---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c737257-2eff-42f5-a23a-ca1345246313"
title: "Review H:\\prism\\scripts\\embed-wiki-into-tribal-index.test.mjs end-to-end against"
date: "2026-05-19"
first_ts: "2026-05-19T00:38:14.438Z"
last_ts: "2026-05-19T00:40:13.289Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/3c737257-2eff-42f5-a23a-ca1345246313/subagents/agent-af4363788a79c6622.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review H:\prism\scripts\embed-wiki-into-tribal-index.test.mjs end-to-end against

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c737257-2eff-42f5-a23a-ca1345246313/subagents/agent-af4363788a79c6622.jsonl`

## Transcript

### User | 2026-05-19T00:38:14.438Z

Review H:\prism\scripts\embed-wiki-into-tribal-index.test.mjs end-to-end against the script it tests, H:\prism\scripts\embed-wiki-into-tribal-index.mjs (read both fully).

The script idempotently appends Ollama-embedded wiki entries to state/shared/tribal-embed-index.json so the auto tribal-injection pipeline (tribal-rerank.mjs cosine over entries[]) can surface them. It closes a real gap (commit d716d20a96 shipped 3 wikis WITHOUT embedding them → absent from index → never auto-inject).

Grade PASS/FAIL with P0/P1 list. Verify:
1. Tests encode INTENT not behavior (R9) — would each test FAIL if the corresponding logic were silently broken? Specifically: would the "canonical shape" test fail if source were wrongly "wiki"? would the fail-loud test fail if a partial index write were re-introduced? would the dim-mismatch test fail if the P1-c assertion were removed?
2. No stub/placeholder assertions (no bare toBeDefined-equivalents, no assertions that pass on a hardcoded return).
3. The all-or-nothing regression guard genuinely proves the index is byte-identical after a failed embed (the precise failure class this unit fixes).
4. Real-value assertions: exact key set, source==="external", text length===400, model parity with tribal-rerank, dim assertion.
5. Hermeticity: no real Ollama dependency, no mutation of the real repo index (tmpdir only), deterministic.
6. Coverage gaps: any exported function or main() exit path (2/3/0) untested? Is the --force replace-in-place path covered? Is the idempotent skip path covered?
Report concrete missing cases and a clear verdict.

### Assistant | 2026-05-19T00:39:20.309Z

I'll review both files end-to-end to assess test quality against R9 (intent-based tests) and completeness.

### Assistant | 2026-05-19T00:39:20.461Z

[tool_use: Read]

### Assistant | 2026-05-19T00:39:20.669Z

[tool_use: Read]

### User | 2026-05-19T00:39:30.944Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Hermetic node:test suite for embed-wiki-into-tribal-index.mjs
4	 * (BACKEND-DEV-LOOP/U-TRIBAL-EMBED-GAP).
5	 *
6	 * No Ollama, no real index mutation — pure helpers + injected fetch +
7	 * tmpdir index. Real-value assertions only (no toBeDefined-style stubs).
8	 * Each block encodes WHY the behavior matters (the non-retrievable-entry
9	 * failure class this unit cl
... [+10373 chars truncated]

### User | 2026-05-19T00:39:30.946Z

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
... [+16747 chars truncated]

### Assistant | 2026-05-19T00:40:13.289Z

Now I'll analyze the test file against the script and against R9 (intent-based tests).

## Test Coverage Review: `embed-wiki-into-tribal-index.test.mjs`

**VERDICT: PASS** — intent-based tests with concrete coverage. Minor gaps identified.

---

## Test Quality Analysis

### ✅ R9 Compliance (Intent not Behavior)
Each test encodes **why** the behavior matters:

| Test | Intent | Would fail if broken? | Evidence |
|------|--------|----------------------|----------|
| `stripFrontmatter` | Byte-0 matching prevents text corruption | YES — without the `/^---\r?\n/` anchor, line-2 `---` blocks would be stripped | Test 3: `"intro\n---\na: 1\n---\nx"` stays unchanged |
| `flattenBody` | Whitespace collapse is deterministic for cosine parity | YES — removing `.replace(/\s+/g, " ")` changes all outputs | Test checks exact string |
| `buildEntry` | Canonical shape (8 keys, `source:"external"` not `"wiki"`) is load-bearing for retrieval | YES — missing a key breaks parity with live index | Test 1: exact key set via `deepEqual(Object.keys(e).sort(), […])` |
| `planAppend` | Idempotency prevents duplicate embedding | YES — `existing.has(id)` removal would add duplicates | Test routes present IDs to `skipped[]` |
| `embedText` | Model parity (`nomic-embed-text:latest`) is **the** retrieval invariant | YES — wrong model stored silently, rerank's cosine is meaningless | Test 1: captures `MODEL` equality; Test 2: P1-c dim-mismatch throws |
| `VALID_DOMAINS` | Domain set parity prevents non-retrievable entries | YES — domain mismatch breaks tribal-rerank's in-domain boost | Test: "backenddev" typo explicitly fails |
| `main: dry-run` | `--apply` false prevents mutation | YES — removing the flag check → index mutates | Test: compares `before` vs `readFileSync` after |
| `main: Ollama-down` | All-or-nothing (abort on embed, no partial write) is the R12 regression guard | YES — removing `return` at line 337 → splice/write still run → partial index | Test: `before === readFileSync` after f
... [+10345 chars truncated]
