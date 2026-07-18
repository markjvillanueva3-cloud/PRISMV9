---
type: "chat-session"
source: "claude-code-cli"
session_id: "7361b856-6b45-487f-9c8e-2ec398bf9ac3"
title: "Per-file scrutiny review for PRISM unit **HS-06 Phase 2** — new UserPromptSubmit"
date: "2026-05-13"
first_ts: "2026-05-13T01:53:45.217Z"
last_ts: "2026-05-13T01:54:44.952Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/7361b856-6b45-487f-9c8e-2ec398bf9ac3/subagents/agent-a2ab42638e370f74b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Per-file scrutiny review for PRISM unit **HS-06 Phase 2** — new UserPromptSubmit

> **claude-code-cli** | 2026-05-13 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7361b856-6b45-487f-9c8e-2ec398bf9ac3/subagents/agent-a2ab42638e370f74b.jsonl`

## Transcript

### User | 2026-05-13T01:53:45.217Z

Per-file scrutiny review for PRISM unit **HS-06 Phase 2** — new UserPromptSubmit hook for archived-skill recall.

**File under review:** `H:\prism\.claude\hooks\archived-skill-suggest.mjs`

**Unit spec:**
- Goal: when an operator's prompt semantically matches an archived skill's wiki-entry description, surface that skill as injected context with a `mv` restoration hint.
- Mechanism: scan `.claude/commands-archive/` for archived skill basenames, filter `_leaf-index.jsonl` to `type:"skill"` entries whose basename matches, BM25-score the prompt against this filtered corpus, inject top-K hits above MIN_SCORE.
- Mirrors `wiki-precheck-inject.mjs` (same tokenize, score, cache pattern) but with: separate cache file, higher MIN_SCORE threshold (suggestions need more confidence than wiki citations), separate output framing, and the `mv` hint.
- Phase 1 (commit `d81fc8009`) already archived 85 bucket-E claude-flow skills. This hook restores their discoverability without paying the harness manifest tax.
- Plan doc: `state/shared/HS-06-SMART-RECALL-PLAN.md`.

**Self-tests (run inline via `node archived-skill-suggest.mjs --test`):** all 10 PASS:
- T1 happy / T2-T4 failure modes / T5-T6 adversarial / T7 variability / T8-T9 behavior
Coverage meets CLAUDE.md comprehensive-build-enforce floor: happy + ≥3 failure modes + ≥2 adversarial + variability across ≥2 namespaces (sparc + github).

**Your responsibilities (read the WHOLE file end-to-end):**

1. **Correctness of BM25 + filter:**
   - Does the corpus filter actually intersect leaf-index skill entries with archive-dir basenames? Verify the set-membership logic at the corpus-build step.
   - Is MIN_SCORE (default 6.0) calibrated higher than wiki-precheck-inject's 4.0? If yes, justified?
   - Does cache invalidation correctly combine LEAF_INDEX mtime + ARCHIVE_DIR mtime so EITHER changing forces a rebuild?

2. **Edge cases & failure modes:**
   - Empty `commands-archive/` directory → `scanArchivedSkillNames` returns empty Set → cor
... [+2379 chars truncated]

### Assistant | 2026-05-13T01:53:49.679Z

I'll read the file end-to-end and review it against the spec.

### Assistant | 2026-05-13T01:53:50.186Z

[tool_use: Read]

### User | 2026-05-13T01:53:51.156Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * archived-skill-suggest.mjs — UserPromptSubmit hook (HS-06 Phase 2 / smart-recall).
4	 *
5	 * Companion to wiki-precheck-inject.mjs. That hook surfaces wiki entries
6	 * relevant to the prompt; THIS hook surfaces ARCHIVED SKILLS (under
7	 * .claude/commands-archive/) whose wiki-description matches the prompt's
8	 * intent. Restores discoverability of skills the HS-0
... [+14947 chars truncated]

### Assistant | 2026-05-13T01:53:54.364Z

I've read the file end-to-end. Now let me verify a couple of cross-references before finalizing the review — specifically the wiki-precheck-inject sibling for MIN_SCORE calibration, and the leaf-index schema for the `type:"skill"` assumption.

### Assistant | 2026-05-13T01:53:56.289Z

[tool_use: Bash]

### Assistant | 2026-05-13T01:53:57.412Z

[tool_use: Bash]

### Assistant | 2026-05-13T01:53:58.996Z

[tool_use: Bash]

### User | 2026-05-13T01:54:00.176Z

[tool_result] 33:const MIN_SCORE = 4.0;
36:const MIN_PROMPT_LEN = 12;
37:const MIN_PROMPT_TOKENS = 2;
42:function tokenize(s) {
64:      const toks = [...new Set(tokenize(name + " " + desc))];
77:function score(promptToks, entry, idf) {
88:function loadLeafCorpus() {
106:      const toks = [...new Set(tokenize(r.name + " " + (r.title || "") + " " + (r.desc || "")))];
208:  if (prompt.length < MIN_PROMPT_LEN) { 
... [+616 chars truncated]

### User | 2026-05-13T01:54:01.667Z

[tool_result] {"name":"acal","title":"adaptiveControl:acal","type":"action","desc":"Dispatcher action — invoke via `adaptiveControl({ action: \"acal\", ... })`","path":"knowledge/wiki/architecture/actions/adaptivecontrol/acal.md"}
{"name":"adachat","title":"adaptiveControl:adaChat","type":"action","desc":"Dispatcher action — invoke via `adaptiveControl({ action: \"adaChat\", ... })`","path":"knowledge/wiki/arch
... [+1401 chars truncated]

### User | 2026-05-13T01:54:03.361Z

[tool_result] analysis/
automation/
github/
hooks/
monitoring/
optimization/
sparc/
---NAMESPACE-EXPECTED---
analyzer.md
architect.md
ask.md
batch-executor.md
code.md
---
README.md
code-review-swarm.md
code-review.md
github-modes.md
github-swarm.md

### Assistant | 2026-05-13T01:54:44.952Z

I have everything I need to render a final verdict. Here are key cross-reference findings before the verdict:

- **wiki-precheck-inject MIN_SCORE = 4.0**; this hook uses **6.0** → ✓ higher threshold for suggestion confidence, as spec claims.
- **leaf-index schema confirmed**: `{"name","title","type":"skill","desc","path"}` — `r.type !== "skill"` filter on line 129 is correct; `r.title || r.desc` extraction on line 137 matches the actual title format `"Skill — <name>"`.
- **Archive directory confirmed**: real namespace subdirs `sparc/`, `github/`, `analysis/`, `automation/`, `hooks/`, `monitoring/`, `optimization/`. Skill files exist (`coder.md` is **not** present in sparc/ — `code.md`, `analyzer.md`, `architect.md`, `ask.md`, `batch-executor.md` are). **T7 assertion is fragile** — see P1 below.
- **T9 finding**: leaf-index has `bottleneck-detect` titled but indexed as `analysis-bottleneck-detect` (name) — the corpus-build will only match if `commands-archive/` filenames are also `analysis-bottleneck-detect.md`, not `bottleneck-detect.md`. The basename↔leaf-index `name` join is direct equality (line 130) so this works as long as archive filenames mirror the leaf-index `name` field.

---

```
VERDICT: PASS
```

**P0 issues:**
- *(none — the hook is correct, fail-safe, and contract-conformant; the missing settings.json wiring is a follow-up, not a P0. The hook file in isolation is mergeable; without wiring it's inert, not broken.)*

**P1 issues:**
- **L292-294 (T7 variability test is filesystem-fragile and likely FAILING in the current archive state):** the test asserts `archived.has("coder")` OR `architect`/`debug` — but the actual sparc archive contents are `code.md`, `analyzer.md`, `architect.md`, `ask.md`, `batch-executor.md` (no `coder.md`, no `debug.md`). T7 currently passes only because `architect` is present. If Phase 1's archive layout shifts at all, T7 silently degrades to a one-sided check. **Fix:** read `ARCHIVE_DIR` once and assert on actual present basena
... [+5734 chars truncated]
