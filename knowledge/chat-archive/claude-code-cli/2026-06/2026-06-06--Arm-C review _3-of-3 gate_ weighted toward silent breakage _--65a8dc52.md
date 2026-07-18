---
type: "chat-session"
source: "claude-code-cli"
session_id: "65a8dc52-2895-48bf-9137-68cade042012"
title: "Arm-C review (3-of-3 gate, weighted toward silent breakage / regression / I/O se"
date: "2026-06-06"
first_ts: "2026-06-06T07:02:31.385Z"
last_ts: "2026-06-06T07:05:39.765Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 7
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/65a8dc52-2895-48bf-9137-68cade042012/subagents/agent-ab8ac200e3efc9c5c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Arm-C review (3-of-3 gate, weighted toward silent breakage / regression / I/O se

> **claude-code-cli** | 2026-06-06 | 20 msgs (7 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/65a8dc52-2895-48bf-9137-68cade042012/subagents/agent-ab8ac200e3efc9c5c.jsonl`

## Transcript

### User | 2026-06-06T07:02:31.385Z

Arm-C review (3-of-3 gate, weighted toward silent breakage / regression / I/O security; do NOT assume arms A/B caught everything) of committed unit e140cc486f (U-SCP01, slot papa, repo H:/prism). Run `git -C H:/prism show e140cc486f` for the diff. Core: scripts/lib/source-chain-lib.mjs (fail-soft .mjs provenance mirror) + a wired per-prompt hook .claude/hooks/master-index-precheck-inject.mjs.

Hunt specifically for:
1. SILENT BREAKAGE / REGRESSION: the hook edit runs on EVERY UserPromptSubmit across a 26-chat fleet. Could it silently change or break the injected master-index block for any consumer? Confirm the fail-soft + knob path (PRISM_SOURCE_CHAIN_DISABLE=1) truly yields byte-identical legacy output. Does adding a `.sourceChain` field to hit objects risk breaking any downstream strict-equality/serialization consumer? Confirm decorateHits is non-mutating (the search libs' returned hits must be untouched).
2. SILENT ERROR SWALLOWING: any fail-soft path in source-chain-lib.mjs that swallows a REAL error (vs an expected-invalid input)? Is the divergence-from-the-TS-engine (mirror fails soft where engine throws) safe and intentional, or does it hide a genuine bug?
3. I/O / PROMPT-INJECTION SECURITY: can a malicious or adversarial node-id / path / used_for string inject content into the prompt context via the rendered `[src: ...]` tag or renderMarkdown? Is caller-supplied provenance overwritten with the true derived one (no spoofing)?
Report P0/P1 only. Grade PASS or FAIL with concrete line references. Focused — git show this one commit only.

### Assistant | 2026-06-06T07:03:37.730Z

I'll review commit e140cc486f focusing on silent breakage, error swallowing, and prompt-injection security.

### Assistant | 2026-06-06T07:03:38.558Z

[tool_use: Bash]

### User | 2026-06-06T07:03:44.188Z

[tool_result] commit e140cc486f4b1245b2ecfed204d98ceb7e2a9a46
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 6 01:43:31 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-SCP01: source-chain provenance on live retrieval hits (papa)
    
    Lever L5 of the obsidian/hermes context-learning accel synthesis (wf_e7d322cf-d73). SourceChainEngine shipped+wir
... [+793 chars truncated]

### Assistant | 2026-06-06T07:03:47.124Z

Let me see the full diff for the two core files.

### Assistant | 2026-06-06T07:03:49.816Z

[tool_use: Bash]

### User | 2026-06-06T07:04:01.690Z

[tool_result] commit e140cc486f4b1245b2ecfed204d98ceb7e2a9a46
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 6 01:43:31 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-SCP01: source-chain provenance on live retrieval hits (papa)
    
    Lever L5 of the obsidian/hermes context-learning accel synthesis (wf_e7d322cf-d73). SourceChainEngine shipped+wir
... [+16544 chars truncated]

### Assistant | 2026-06-06T07:04:04.294Z

Now let me examine the consumers — confirm whether `renderHitProvenance` output gets sanitized before injection, and check the hook's `emit`/markdown rendering path. Let me read the hook and the test files.

### Assistant | 2026-06-06T07:04:04.861Z

[tool_use: Read]

### User | 2026-06-06T07:04:09.499Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+13735 chars truncated]

### Assistant | 2026-06-06T07:04:16.991Z

Now I understand the injection path. The provenance string flows directly into `additionalContext` which the harness merges into the model's context. Let me verify the security concern: the `path` field in `renderHitProvenance` comes from `hit.id` (the node-id, from the graph) for the graph-kind decoration used here. Let me confirm what `hit.id` and `hit.label` can contain by checking the search lib that produces hits.

### Assistant | 2026-06-06T07:04:18.332Z

[tool_use: Bash]

### User | 2026-06-06T07:04:27.053Z

[tool_result] commit e140cc486f4b1245b2ecfed204d98ceb7e2a9a46
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 6 01:43:31 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-SCP01: source-chain provenance on live retrieval hits (papa)
    
    Lever L5 of the obsidian/hermes context-learning accel synthesis (wf_e7d322cf-d73). SourceChainEngine shipped+wir
... [+15257 chars truncated]

### Assistant | 2026-06-06T07:04:33.738Z

The tests are thorough. Now the key question for security/regression: the `path` rendered into the prompt comes from `hit.id` (the system-graph node-id). For the master-index hits used here, `id` is a graph node-id, which is generally controlled. But the concern is whether an adversarial query can cause an attacker-controlled string to land in `hit.id` or `hit.label`. Let me check what `runMasterIndexSearch` returns and whether `id`/`label` can be user-influenced.

### Assistant | 2026-06-06T07:04:35.169Z

[tool_use: Bash]

### User | 2026-06-06T07:04:43.229Z

[tool_result] 19: * Imports MUST be I/O-free. Network calls forbidden. Failures return
37:// degraded but not blind) instead of returning null. Knob:
71:// Cache stores the SAME wrapper object returned to callers (reference-stable
86: * @param {number} [opts.maxTokens=8]      — cap returned tokens
87: * @returns {string[]}
90:  if (!text || typeof text !== "string") return [];
104:    out.push(tok);
107:  retur
... [+1881 chars truncated]

### Assistant | 2026-06-06T07:04:56.488Z

The hits come from graph nodes — `n.id` and `n.label` are sourced from `system-graph.json`, NOT from the user prompt. The prompt only contributes search tokens that filter which nodes match. So `path`/`source_type` in the rendered `[src: ...]` tag are derived from the trusted graph corpus, not from adversarial user input. This neutralizes the prompt-injection-via-id vector for this consumer.

One residual security thread: the system-graph itself ingests filesystem/vault content (L12 fs leaves, vault nodes). If a node label/id contained markdown control characters, they'd already be rendered into the legacy `${h.label}` line that predates this commit — the provenance tag adds `id` which is the same trust tier. Let me confirm the pre-existing render already emits `h.label` raw (so this commit introduces no NEW trust-tier escalation) and verify `decorateHits` ordering vs `edgeOrder`/`exactMatch` doesn't disturb selection.

I have enough to assess. Let me verify one regression concern: `applyLexicalRerank` returns hits, then `decorateHits` wraps them — confirm `decorateHits` preserves array length and order (so `hits[0]` exactMatch logic and `edgeOrder` are unaffected).

The `decorateHits` implementation: `hits.map((h) => (h && typeof h === "object" ? { ...h, sourceChain: ... } : h))` — same length, same order, all original fields preserved via spread. `hits[0]` is still the rank-1 hit. `h.label`, `h.status`, `h.wiki`, `h.memory`, `h.layer` all survive. No regression to exact-match collapse or edge-ordering.

Now the disable-knob byte-identical claim: when `PRISM_SOURCE_CHAIN_DISABLE=1`, `decorateHits` returns the input array unchanged (no `sourceChain` field). Then `renderHitProvenance(h)` sees no `h.sourceChain` → returns `""` → `provStr = ""`. So both render paths append nothing. Output is byte-identical to legacy. Confirmed via code and the pass-through test.

Let me do a final check on the parity test's actual TS engine to make sure the divergence (`Number.isFinite
... [+70 chars truncated]

### Assistant | 2026-06-06T07:04:58.412Z

[tool_use: Bash]

### User | 2026-06-06T07:05:06.164Z

[tool_result] 11: *   - an ordered list of Citation objects (path, score, retrieved_at, used_for, etc.)
22: *   - error handling: throw descriptive errors on invalid citations
38: * - `score`: relevance 0-1 (1.0 = perfect match, 0 = barely related)
43:export const CitationSchema = z.object({
46:  score: z.number().refine(
48:    { message: "Citation.score must be a finite number in [0, 1]" },
55:export type Cit
... [+813 chars truncated]

### Assistant | 2026-06-06T07:05:39.765Z

Confirmed. The TS `CitationSchema` refines `score` to a finite `[0,1]`, so a valid citation's score is always finite — the mirror's `Number.isFinite` guard is byte-identical for all valid inputs (where parity is asserted) and is a strict superset only for invalid raw inputs the TS engine would never have produced (it'd have thrown). The divergence is safe and documented; it does not hide a genuine bug because the mirror is explicitly hook-grade fail-soft by design contract, and the invalid path is normalized + flagged `unverified`, never silently treated as trustworthy.

I have completed the arm-C review.

---

## Arm-C Review Verdict: **PASS**

Commit `e140cc486f` (U-SCP01, slot papa). Reviewed `git show` of this single commit only, weighted toward silent breakage / regression / I/O & prompt-injection security.

### 1. Silent breakage / regression — CLEAR

- **Byte-identical disable path confirmed.** With `PRISM_SOURCE_CHAIN_DISABLE=1`, `decorateHits` returns the input array unchanged (no `sourceChain` field), so `renderHitProvenance(h)` finds no `h.sourceChain` and returns `""` → `provStr = ""` → both the exact-match banner (`source-chain-lib.mjs:179` consumer at hook lines 224-227) and the multi-line render (hook lines 241-245) append nothing. Legacy output is reproduced exactly. Proven by both code inspection and the `PRISM_SOURCE_CHAIN_DISABLE=1 → pass-through` test (`source-chain-lib.test.mjs`).
- **`decorateHits` is non-mutating and order/length-preserving** (`source-chain-lib.mjs:262` — `hits.map((h) => ({ ...h, sourceChain }))`). The originals from the search libs are untouched (spread into fresh objects), so the exact-match collapse logic (`hits[0]`, hook lines 189-203), `edgeOrder(hits)` (line 238), and all downstream field reads (`h.label/status/wiki/memory/layer`) are unaffected. Verified by the `originals NOT mutated` + `concurrent decoration` tests. No risk to the 26-chat per-prompt hot path.
- **No strict-equality/serialization break.** `sourceChain`
... [+3158 chars truncated]
