---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Review a surgical bug-fix to a security-sensitive RAG corpus loader. Read the WH"
date: "2026-06-01"
first_ts: "2026-06-01T00:02:10.640Z"
last_ts: "2026-06-01T00:04:16.165Z"
cwd: "H:\\prism-slot-bravo"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a5de13bc43e0522a3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:37"
---

# Review a surgical bug-fix to a security-sensitive RAG corpus loader. Read the WH

> **claude-code-cli** | 2026-06-01 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a5de13bc43e0522a3.jsonl`

## Transcript

### User | 2026-06-01T00:02:10.640Z

Review a surgical bug-fix to a security-sensitive RAG corpus loader. Read the WHOLE file end-to-end, then grade PASS/FAIL and list any P0/P1 issues.

FILE: H:\prism\scripts\lib\octopus-corpus-loader.mjs

CONTEXT — the bug being fixed (leg-starvation): `loadPsnCorpora()` previously ran the "index legs" (tribal + master_index, which call out to master-index-search-lib and load a 543MB→51MB graph that can take ~17s) BEFORE the cheap bounded "filesystem legs" (wiki/memories/skills). On the real graph that 17s load blew the per-call deadline, so EVERY fs leg was skipped with `deadline-before:<leg>` — the octopus saw only 1 of 5 legs (`master_index`). Empirical smoke test confirmed: before = 1 leg / 17726ms; after = 4 legs / 2592ms; redaction still holds.

THE FIX (in loadPsnCorpora, ~L422-475):
1. Reordered: the fs-leg loop (wiki/memories/skills) now runs BEFORE the index-leg block.
2. Hoisted `const env = opts.env && typeof opts.env === "object" ? opts.env : process.env;` to before both blocks.
3. Added an env escape hatch: `PRISM_OCTOPUS_SKIP_INDEX_LEGS=1` skips the index legs entirely (pushes `index-legs:skipped-by-env` to meta.errors).
4. Added an `index-legs:deadline-spent` marker for the budget-exhausted branch.

VERIFY SPECIFICALLY (this is what your review must confirm or refute):
- The reorder preserves ALL prior behavior: the DATA-LEAK GUARD (`resolveMemoryRoots(roots, env)` for the memories leg, which gates the private C: auto-memory behind PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY=1) is STILL applied after the move — it must not have been dropped or bypassed.
- Redaction (which lives inside loadFsLeg / loadIndexLegs, NOT in this reordered region) is unaffected.
- The deadline checks remain correct: fs legs still per-leg `Date.now() >= cfg.deadlineAt` break; index legs still gated on `queryTokens.length >= 2 && Date.now() < cfg.deadlineAt`.
- The skip-knob, deadline-spent, and normal branches are mutually exclusive and cover all cases (no leg silently double-runs o
... [+468 chars truncated]

### Assistant | 2026-06-01T00:02:24.011Z

[tool_use: Read]

### Assistant | 2026-06-01T00:02:23.570Z

I'll review this security-sensitive bug-fix thoroughly. Let me read the whole file end-to-end.

### User | 2026-06-01T00:02:30.470Z

[tool_result] 1	// scripts/lib/octopus-corpus-loader.mjs
2	//
3	// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — the real corpus loader (substrate).
4	//
5	// The HERMES×OCTOPUS coordinator (scripts/octopus-with-hermes-rag.mjs) shipped
6	// with `psnCorpora: {}` — an EMPTY map — so the input curator
7	// (octopus-input-curator.mjs) had nothing to rerank and every voice saw the
8	// bare prompt. This lib fills that gap: 
... [+24572 chars truncated]

### Assistant | 2026-06-01T00:02:33.266Z

I've read the whole file. Now let me trace the specific verification points carefully, examining the dependencies the fix relies on.

### Assistant | 2026-06-01T00:02:34.378Z

[tool_use: Read]

### Assistant | 2026-06-01T00:02:35.670Z

[tool_use: Grep]

### User | 2026-06-01T00:02:55.491Z

[tool_result] 1	/**
2	 * lexical-rerank.mjs — RAG-UPGRADE-MS0 / U-RAG-2 (2026-05-22, slot golf).
3	 *
4	 * Stage-2 reranker for PRISM's retrieval inject hooks. The 2026 RAG research
5	 * prescribes two-stage retrieval — a fast recall-oriented first stage
6	 * (BM25-lite, here) then a more careful reranker that lifts answer quality
7	 * 15-30%.
8	 *
9	 * A neural cross-encoder is the textbook stage 2 — but PRISM
... [+2488 chars truncated]

### User | 2026-06-01T00:03:13.332Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-01T00:03:17.401Z

Let me check the consumers of `resolveMemoryRoots` and the index-leg env knobs more narrowly to confirm the `env` hoist doesn't break a lower consumer, and verify the redact lives where claimed.

### Assistant | 2026-06-01T00:03:19.336Z

[tool_use: Grep]

### Assistant | 2026-06-01T00:03:20.097Z

[tool_use: Grep]

### User | 2026-06-01T00:03:27.302Z

[tool_result] 55:// explicit opt-in env (PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY=1, default OFF) so
82:// Pure: env read injected via `env` so tests toggle it without process mutation.
83:export function resolveMemoryRoots(baseRoots, env = process.env) {
85:  const includePrivate = String(env?.PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY || "") === "1";
382: * @param {object} [opts.env]            - env source for the pri
... [+327 chars truncated]

### User | 2026-06-01T00:03:33.655Z

[tool_result] Found 3 files
H:\prism\scripts\lib\octopus-corpus-loader.test.mjs
H:\prism\scripts\lib\octopus-corpus-loader.mjs
H:\prism\scripts\octopus-with-hermes-rag.mjs

### Assistant | 2026-06-01T00:03:37.965Z

The `env` variable is referenced only at L423 (declaration), L437 (memories leg), and L455 (skip-knob). There are no other consumers of `env` lower in the function, confirming the hoist is semantically inert for everything else. Let me verify the test file covers the reorder and confirm there isn't a duplicate `env` declaration that the hoist would have collided with.

### Assistant | 2026-06-01T00:03:39.703Z

[tool_use: Grep]

### User | 2026-06-01T00:03:45.401Z

[tool_result] 86-    assert.equal(typeof rerank, "function");
87-    // At least one fs leg must have produced candidates.
88:    const fsLegs = ["wiki", "memories", "skills"].filter((l) => Array.isArray(psnCorpora[l]) && psnCorpora[l].length > 0);
89:    assert.ok(fsLegs.length >= 1, `expected ≥1 fs leg, got: ${JSON.stringify(Object.keys(psnCorpora))}`);
90-    // The wiki Kienzle snippet must surface (filenam
... [+2717 chars truncated]

### Assistant | 2026-06-01T00:04:16.165Z

The tests confirm the reorder and the skip-knob behavior. I have enough to complete the review. Let me verify the memories-leg data-leak guard path once more against the pre-fix behavior by confirming `resolveMemoryRoots` is the gate and that it's still invoked inside the fs-leg loop.

I've now traced every verification point against the actual code, the `lexical-rerank` dependency, the test file, and a full-repo consumer search for `env`/knobs. Here is my report.

## Code Quality Analysis Report — octopus-corpus-loader.mjs leg-starvation fix

### Summary
- Files Analyzed: 1 (plus dependency `lexical-rerank.mjs` and the companion test file for verification)
- Scope: the reorder + `env` hoist + skip-knob + deadline-spent marker in `loadPsnCorpora` (L389–487)
- Overall: the fix is correct and preserves all prior security/correctness behavior

### Verification of each required point

**1. DATA-LEAK GUARD preserved (PASS).** The `resolveMemoryRoots(roots, env)` gate is still applied to the memories leg — now at L437 inside the relocated fs-leg loop:
```
if (legName === "memories") roots = resolveMemoryRoots(roots, env);
```
`resolveMemoryRoots` (L83–90) only appends `PRIVATE_MEMORY_ROOT` when `env.PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY === "1"`. The guard moved with the loop body intact; it was not dropped or bypassed. The private C: root remains gated, default OFF.

**2. Redaction unaffected (PASS).** Redaction lives in `loadFsLeg` (L236: `redactSecrets(extractSnippet(...))`) and in `loadIndexLegs`/`buildTribalSnippet`/`buildMasterIndexSnippet` (L257, L283) — none of which are in the reordered region. The reorder only changed call order, not the leg bodies. No snippet reaches `corpora` un-redacted.

**3. Deadline checks correct (PASS).**
- fs legs: per-leg `if (Date.now() >= cfg.deadlineAt) { ...deadline-before... break; }` at L433, plus the inner per-file/per-root checks in `loadFsLeg` (L210–211, L226–227) — unchanged.
- index legs: still gated on `queryTokens.length >=
... [+3842 chars truncated]
