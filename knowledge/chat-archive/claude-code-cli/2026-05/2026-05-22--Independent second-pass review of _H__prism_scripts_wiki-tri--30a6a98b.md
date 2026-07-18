---
type: "chat-session"
source: "claude-code-cli"
session_id: "30a6a98b-2fb0-450b-8b01-9188a6778938"
title: "Independent second-pass review of `H:/prism/scripts/wiki-tribal-cross-ref-audit."
date: "2026-05-22"
first_ts: "2026-05-22T19:41:59.286Z"
last_ts: "2026-05-22T19:44:58.292Z"
cwd: "H:\\PRISM"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-aeffea44ce9178d8e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent second-pass review of `H:/prism/scripts/wiki-tribal-cross-ref-audit.

> **claude-code-cli** | 2026-05-22 | 35 msgs (14 user / 21 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-aeffea44ce9178d8e.jsonl`

## Transcript

### User | 2026-05-22T19:41:59.286Z

Independent second-pass review of `H:/prism/scripts/wiki-tribal-cross-ref-audit.mjs` (just edited). Read the WHOLE file end-to-end. Do not assume another reviewer caught anything.

## Context (no prior conversation)

This script audits how much of PRISM's wiki corpus is embedded in a shared vector index, producing a `coverage` % that is the acceptance bar for milestone RAG-UPGRADE-MS0 / unit U-RAG-1 (must be ≥95%). It was reporting a false 0.8%. Verified root cause: `tribalWikiPath()` only counted `wiki:`-scheme ids, but the real wiki embedder keys entries `external:<abs-path>`. Empirical scan: 23,581 `external:` entries point at real wiki files; true coverage is ~97.2%. The fix adds a third branch to `tribalWikiPath()` that also counts any entry whose `id`/`path` contains a literal `knowledge/wiki/` segment. `SCHEMA_VERSION` bumped to `1.1.0`.

## Weight your review toward what a correctness reviewer is LESS likely to catch

1. **Consumers of the report** — `state/shared/.wiki-tribal-cross-ref-audit.json` is read by a SessionStart inject hook (`PRISM_WIKI_TRIBAL_INJECT`) that currently warns "0.8% coverage" on every session start. After this fix the report will say ~97%. Is anything downstream pinned to the old number / old `tribalWikiEntries` magnitude (was 190, becomes ~23,573)? Does the bumped `SCHEMA_VERSION` break any consumer that pins `1.0.0`?
2. **The `coverage` jump as a signal** — going from 0.8% to 97% in one commit: is there any risk this masks a REAL coverage gap? (The genuine gap is 691 files / ~2.8%.) Is reporting 97% honest, given ~691 wiki files truly are not embedded?
3. **Convention conformance** — does the new branch match the file's existing style (the pure-core/IO-shell split, JSDoc density, the `normalizeWikiPath` reuse)? Is the inline comment block appropriately sized or bloated?
4. **Edge cases the new branch introduces** — an entry with BOTH a `wiki:` id and a `path`; an entry whose `id` lacks `knowledge/wiki/` but whose `path` has it; mix
... [+1036 chars truncated]

### Assistant | 2026-05-22T19:42:12.939Z

I'll review the file end-to-end. Let me start by reading the script and its supporting context.

### Assistant | 2026-05-22T19:42:13.179Z

[tool_use: Read]

### Assistant | 2026-05-22T19:42:13.366Z

[tool_use: Read]

### User | 2026-05-22T19:42:17.209Z

[tool_result] read-once-guard: 'H:\prism\scripts\wiki-tribal-cross-ref-audit.mjs' was already read 2s ago in this session and is unchanged (mtime 1779478884332). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-22T19:42:18.210Z

[tool_result] 1	# RAG-UPGRADE-MS0 — PRISM retrieval upgrade milestone
2	
3	**Operator goal** (2026-05-22, slot golf, `/goal … /loop`): complete U-RAG-1..5 and
4	synergize the result with system-viz, obsidian brain, wiki injection, and the
5	GNN / neural network. **Completion condition:** "completed and wired."
6	
7	## Why (gap analysis — audit-backed)
8	
9	PRISM's RAG *technique* is already advanced (hybrid ret
... [+4765 chars truncated]

### Assistant | 2026-05-22T19:42:21.384Z

The file content guard says the file is already in context, but I don't actually have it in my conversation context (this is a fresh review with no prior conversation). I need the file content to review it.

### Assistant | 2026-05-22T19:42:21.817Z

[tool_use: Read]

### User | 2026-05-22T19:42:26.548Z

[tool_result] 0	#!/usr/bin/env node
1	/**
2	 * wiki-tribal-cross-ref-audit.mjs — /goal synergy iter 7 (echo, 2026-05-21).
3	 *
4	 * Producer-side audit closing the wiki ⇄ tribal cross-reference completeness
5	 * gap (one of the 8 substrates named in the /goal — wiki + tribal knowledge).
6	 * Scans `knowledge/wiki/**` (markdown files) and `state/shared/tribal-embed-index.json`
7	 * to identify:
8	 *
9	 *   1. WI
... [+8847 chars truncated]

### Assistant | 2026-05-22T19:42:29.704Z

Now I have the file. Let me trace the consumer of the report and verify a few claims before finalizing.

### Assistant | 2026-05-22T19:42:30.687Z

[tool_use: Grep]

### Assistant | 2026-05-22T19:42:31.196Z

[tool_use: Grep]

### User | 2026-05-22T19:42:35.852Z

[tool_result] Found 23 files
.claude\hooks\nn-graph-health-inject.mjs
.claude\hooks\prism-ai-memo-coverage-inject.test.mjs
.claude\hooks\prism-ai-memo-coverage-inject.mjs
.claude\hooks\goal-synergy-status-inject.mjs
.claude\hooks\goal-synergy-status-inject.test.mjs
.claude\hooks\wiki-tribal-coverage-inject.test.mjs
.claude\hooks\wiki-tribal-coverage-inject.mjs
.claude\hooks\__tests__\precompact-auto-trigger.tes
... [+754 chars truncated]

### User | 2026-05-22T19:42:52.249Z

[tool_result] .claude\hooks\wiki-tribal-coverage-inject.test.mjs:135:  assert.ok(out.includes("PRISM_WIKI_TRIBAL_INJECT=0"), "disable knob hint");
.claude\hooks\wiki-tribal-coverage-inject.test.mjs:198:  const live = "H:/prism/state/shared/.wiki-tribal-cross-ref-audit.json";
.claude\hooks\wiki-tribal-coverage-inject.mjs:6: * `state/shared/.wiki-tribal-cross-ref-audit.json` (producer:
.claude\hooks\wiki-tribal-c
... [+558 chars truncated]

### Assistant | 2026-05-22T19:42:55.794Z

The consumer hook is `wiki-tribal-coverage-inject.mjs`. Let me read it fully to assess whether it pins the old number/schema, and check `goal-synergy-status-inject.mjs` which also references this audit.

### Assistant | 2026-05-22T19:42:56.293Z

[tool_use: Read]

### Assistant | 2026-05-22T19:42:56.911Z

[tool_use: Grep]

### User | 2026-05-22T19:42:58.169Z

[tool_result] 6- * `state\shared\.goal-synergy-status.json` (producer: iter-10 rollup).
7- *
8- * Iter 11 of the /goal synergize loop. Consolidates the iter-5
9: * (knowledge-link-audit) + iter-8 (wiki-tribal-coverage) digests into ONE
10- * summary line so the chat context bundle isn't bloated by two near-identical
11- * substrate-drift reports. The iter-5 + iter-8 hooks stay as drill-downs for
12- * operators
... [+902 chars truncated]

### User | 2026-05-22T19:42:59.852Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * .claude/hooks/wiki-tribal-coverage-inject.mjs
4	 *
5	 * SessionStart hook — surfaces wiki↔tribal coverage drift from
6	 * `state/shared/.wiki-tribal-cross-ref-audit.json` (producer:
7	 * scripts/wiki-tribal-cross-ref-audit.mjs, iter-7 echo /loop /goal synergy).
8	 *
9	 * Iter 8 of the /goal synergize loop (echo, 2026-05-21). Producer/consumer
10	 * pair after iter-
... [+6871 chars truncated]

### Assistant | 2026-05-22T19:43:04.443Z

I have enough context. Let me verify two remaining empirical claims: that `external:` ids are absolute paths in the actual index, and confirm the `goal-synergy` rollup consumer doesn't pin the magnitude.

### Assistant | 2026-05-22T19:43:08.098Z

[tool_use: Bash]

### Assistant | 2026-05-22T19:43:08.335Z

[tool_use: Read]

### User | 2026-05-22T19:43:24.347Z

[tool_result] total entries: 24286
external: ids: 23609   of which knowledge/wiki/: 23581
wiki: scheme ids: 190
entries with .path field: 24286
sample external-wiki ids:
   external:H:\prism\knowledge\wiki\architecture\system-viz-dsl-ms0.md
   external:H:\prism-hotel-e1\knowledge\wiki\architecture\learning-from-mistakes.md
   external:H:\prism\knowledge\wiki\architecture\action-trace-engine.md
   external:H:\pr
... [+198 chars truncated]

### User | 2026-05-22T19:43:27.604Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * .claude/hooks/goal-synergy-status-inject.mjs
4	 *
5	 * SessionStart hook — single-line synergy-health digest from
6	 * `state/shared/.goal-synergy-status.json` (producer: iter-10 rollup).
7	 *
8	 * Iter 11 of the /goal synergize loop. Consolidates the iter-5
9	 * (knowledge-link-audit) + iter-8 (wiki-tribal-coverage) digests into ONE
10	 * summary line so the chat 
... [+5536 chars truncated]

### Assistant | 2026-05-22T19:43:36.516Z

Empirical probe confirms the key facts. One important finding emerged that I need to trace: the `goal-synergy` rollup. Let me check whether the rollup producer reads `coverage` and whether the 97% will flip the `healthy`/`driftSurfaces` state — and verify the cross-tree path issue I spotted in the sample (`external:H:\prism-hotel-e1\knowledge\wiki\...`).

### Assistant | 2026-05-22T19:43:37.734Z

[tool_use: Grep]

### Assistant | 2026-05-22T19:43:42.762Z

[tool_use: Bash]

### User | 2026-05-22T19:43:44.980Z

[tool_result] No matches found

### User | 2026-05-22T19:43:59.256Z

[tool_result] external-wiki ids from MAIN tree (H:/prism/): 23555
external-wiki ids from SLOT/OTHER trees: 26
slot-tree samples:
   external:H:\prism-hotel-e1\knowledge\wiki\architecture\learning-from-mistakes.md
   external:H:\prism-slot-bravo\knowledge\wiki\code-tribal\engineering-failure-classes.md
   external:H:\prism-slot-bravo\knowledge\wiki\code-tribal\architecture-patterns.md
   external:H:\prism-slot-l
... [+309 chars truncated]

### Assistant | 2026-05-22T19:44:03.261Z

The probe is complete. Let me find the rollup producer to close the consumer-chain question.

### Assistant | 2026-05-22T19:44:03.942Z

[tool_use: Bash]

### User | 2026-05-22T19:44:11.667Z

[tool_result] generate-bridge-synergy-features.mjs*
generate-bridge-synergy-features.test.mjs*
generate-slot-synergy-features.mjs*
generate-slot-synergy-features.test.mjs
goal-synergy-status.mjs*
goal-synergy-status.test.mjs*
synergy-regression-watch.mjs*
system-synergy-map.mjs*
---hooks---
goal-synergy-status-inject.mjs  5.4K
goal-synergy-status-inject.test.mjs  5.2K

### Assistant | 2026-05-22T19:44:15.340Z

[tool_use: Bash]

### User | 2026-05-22T19:44:24.638Z

[tool_result] 5: * Meta-status roll-up: reads the two substrate-drift audits shipped earlier
6: * in this /loop (knowledge-link-audit iter-4 + wiki-tribal-cross-ref-audit
13: *   - rollup({linkAudit, wikiTribal})    pure — aggregate into a status object
34:const WIKI_TRIBAL_PATH = path.join(ROOT, "state/shared/.wiki-tribal-cross-ref-audit.json");
35:const AI_MEMO_PATH = path.join(ROOT, "state/shared/.prism-ai-m
... [+2302 chars truncated]

### Assistant | 2026-05-22T19:44:58.292Z

I have everything I need. Both consumers (`wiki-tribal-coverage-inject.mjs` and `goal-synergy-status.mjs`) read `stats.coverage` numerically and threshold on `(1 - coverage)`; neither pins a magnitude or the schema version. The fix is sound and behavior-compatible downstream. Here is my independent review.

---

## Review: `H:/prism/scripts/wiki-tribal-cross-ref-audit.mjs`

### Consumer-chain trace (the area a correctness reviewer is least likely to walk)

I traced both downstream consumers of `state/shared/.wiki-tribal-cross-ref-audit.json`:

- **`wiki-tribal-coverage-inject.mjs`** (SessionStart, `PRISM_WIKI_TRIBAL_INJECT`) — `loadAudit` only requires `j.stats` to be an object; `formatDigest` reads `stats.coverage/missing/wikiFiles` numerically and gates on `coverageGap >= 0.10`. **No pin on `schemaVersion`, no pin on `tribalWikiEntries`, no pin on the old `190`/`0.8%` magnitude.** After the fix it computes `gap ≈ 0.028 < 0.10` → returns `null` → stays silent. Correct: the false "0.8% coverage" warning stops appearing.
- **`goal-synergy-status.mjs`** rollup — `extractMetrics(…, "wiki-tribal")` reads `stats.coverage`, clamps to `[0,1]`, `wikiHealthy = (1 - coverage) < 0.10`. After the fix `wikiHealthy = true` → `wiki-tribal` drops out of `driftSurfaces`. No schema or magnitude pin.

**Conclusion on Q1:** nothing downstream is pinned to `1.0.0`, to `tribalWikiEntries` magnitude, or to the old coverage number. The `SCHEMA_VERSION` bump is cosmetically correct (output shape is genuinely unchanged) and harmless. No P0/P1 here.

### Findings

**P2 — `coverage` jump masks a real ~2.8% gap that no consumer will ever surface again (file:131, and `wiki-tribal-coverage-inject.mjs:40`).**
The genuine gap is 691 files / ~2.8%. Both consumers gate at `(1-coverage) >= 0.10`. At ~97.2% coverage the gap is `0.028`, permanently below threshold — so the SessionStart hook and the rollup will *both* report "clean" and the 691 truly-un-embedded files become invisible. This is *honest* (
... [+5171 chars truncated]
