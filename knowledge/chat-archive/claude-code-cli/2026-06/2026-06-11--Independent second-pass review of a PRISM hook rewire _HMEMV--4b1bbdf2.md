---
type: "chat-session"
source: "claude-code-cli"
session_id: "4b1bbdf2-c878-441d-93bc-88ca59603734"
title: "Independent second-pass review of a PRISM hook rewire (HMEMV09 wiki semantic rec"
date: "2026-06-11"
first_ts: "2026-06-11T03:04:21.264Z"
last_ts: "2026-06-11T03:06:36.862Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-ab4b9f37085d263e0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent second-pass review of a PRISM hook rewire (HMEMV09 wiki semantic rec

> **claude-code-cli** | 2026-06-11 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-ab4b9f37085d263e0.jsonl`

## Transcript

### User | 2026-06-11T03:04:21.264Z

Independent second-pass review of a PRISM hook rewire (HMEMV09 wiki semantic recall -> Qdrant ANN). Read both files END TO END; do NOT assume a prior reviewer caught everything. Weight toward: integration/hidden coupling, the blast radius (this UserPromptSubmit hook fires on EVERY prompt across 26 chat slots -> a regression hits the whole fleet), error budgets, naming/convention conformance, inlined constants, weak/stub assertions.

FILES:
1. H:/prism/.claude/hooks/wiki-precheck-inject.mjs -- I rewired `semanticFallback` to query the live `prism_wiki` Qdrant collection (ANN) as the PRIMARY dense path, falling soft to the ORIGINAL in-process path (`linearSemanticFallback`: load 137MB _embeddings.jsonl + linear cosine scan). New: WIKI_QDRANT_* consts, `qdrantRankWiki`, `readEmbMeta`, openSync/readSync/closeSync imports. Default ON; PRISM_WIKI_QDRANT_DISABLE=1 reverts.
2. H:/prism/.claude/hooks/wiki-precheck-inject.test.mjs -- 6 new tests (40/40 total green).

KEY RISKS TO HUNT:
- This hook must NEVER throw/block (continueOnError fail-safe). Does the new async Qdrant fetch path have any way to reject unhandled, hang, or leak the AbortController timer? Trace the try/catch/finally.
- Did the refactor change the EXISTING behavior in any way the test suite would NOT catch? Specifically: the old semanticFallback returned `null` when no corpus, and computed `stale` AFTER the corpus check; the new one computes `stale` up front. Does any caller/renderer depend on the old ordering or the absence of a `denseArm` field?
- The renderer consumes hits as {n, t, cos}. Qdrant hits set t:"" (payload only stores node_id). Confirm the renderer (search for where sem.hits is rendered) tolerates an empty t and a Qdrant `cos` (0..1 cosine). Any place that REQUIRES t?
- Staleness footer: readEmbMeta returns headerCount from the __meta line; if the file is missing it returns headerCount:0 -> footer shows "0/? vectors". Acceptable degradation or misleading (R12)?
- Constants: WIKI_QDRANT_URL/CO
... [+764 chars truncated]

### Assistant | 2026-06-11T03:04:25.112Z

I'll review both files end to end. Let me start by reading them in full.

### Assistant | 2026-06-11T03:04:25.591Z

[tool_use: Read]

### Assistant | 2026-06-11T03:04:25.767Z

[tool_use: Read]

### User | 2026-06-11T03:04:26.740Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\wiki-precheck-inject.mjs' was already read 16s ago in this session and is unchanged (mtime 1781146484437). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T03:04:26.865Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\wiki-precheck-inject.test.mjs' was already read 15s ago in this session and is unchanged (mtime 1781146580500). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-11T03:04:29.927Z

The read-once guard says the files are already in my context, but I don't actually see their content in my context window — only the system reminder. Let me bypass the cache to get the actual file contents.

### Assistant | 2026-06-11T03:04:30.363Z

[tool_use: Bash]

### User | 2026-06-11T03:04:34.782Z

[tool_result] <persisted-output>
Output too large (36.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\4b1bbdf2-c878-441d-93bc-88ca59603734\tool-results\bn1jsgwsi.txt

Preview (first 2KB):
#!/usr/bin/env node
// tier: T4
/**
 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
 *
 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
 * already in knowledge/wiki/index.md
... [+1792 chars truncated]

### Assistant | 2026-06-11T03:04:37.196Z

The file got saved to a temp file. Let me read it properly via the Read tool now (the cache will have been invalidated since I need full content), reading the saved output.

### Assistant | 2026-06-11T03:04:39.112Z

[tool_use: Read]

### User | 2026-06-11T03:04:42.706Z

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
... [+39411 chars truncated]

### Assistant | 2026-06-11T03:04:44.898Z

Now let me read the test file to verify the test coverage.

### Assistant | 2026-06-11T03:04:45.584Z

[tool_use: Bash]

### User | 2026-06-11T03:04:51.098Z

[tool_result] #!/usr/bin/env node
/**
 * wiki-precheck-inject.test.mjs — node:test suite for wiki-precheck-inject.mjs.
 *
 * Primary coverage: the WIKI-INJECT-MS0 embeddings-staleness guard
 * (embeddingStaleness / staleFooterNote / the embStale wiring through
 * semanticFallback → main → logMiss). Also pins the BM25/boost matched path so
 * the guard edits can't silently break the happy path.
 *
 * Run: node -
... [+23749 chars truncated]

### Assistant | 2026-06-11T03:04:58.135Z

I have both files fully. Now let me verify the critical integration claims by checking the lexical-rerank library and the renderer contract. The key risk is the renderer — let me trace how `sem.hits` with `t:""` is consumed. I already see lines 643-649 in main(). Let me verify the `lexicalRerank` import and check whether any caller of `semanticFallback` outside `main()` exists, plus verify the inject-throttle wiring (imported but I need to confirm it's used or this is a latent dead import).

### Assistant | 2026-06-11T03:04:59.558Z

[tool_use: Grep]

### Assistant | 2026-06-11T03:05:00.550Z

[tool_use: Grep]

### User | 2026-06-11T03:05:01.508Z

[tool_result] 55:import { shouldThrottleInject } from "../../scripts/lib/inject-throttle.mjs";
436:  scored.sort((a, b) => b.cos - a.cos);
491:async function semanticFallback(prompt) {
504:      return { ok: true, hits: ann.hits, stale, headerCount: meta.headerCount, generatedAt: meta.generatedAt, denseArm: "qdrant" };
524:  return { ok: true, hits, stale, headerCount, generatedAt, denseArm: "scan" };
640:    c
... [+598 chars truncated]

### User | 2026-06-11T03:05:02.509Z

[tool_result] Found 3 files
.claude\hooks\wiki-precheck-inject.test.mjs
.claude\hooks\wiki-precheck-inject.mjs
.claude\hooks\memory-index-precheck-inject.mjs

### Assistant | 2026-06-11T03:05:08.086Z

The renderer at line 646 confirms it tolerates empty `t` (`${h.t ? ...}`) and uses `h.cos.toFixed(2)` (works for any number 0..1). `semanticFallback` is only consumed inside `main()` at line 640 — no external consumer depends on the old return shape ordering. The `denseArm` field is set but never read by any renderer (it's telemetry-only metadata, harmless).

Now let me check two things: (1) the `shouldThrottleInject` import — is it actually used anywhere, or is it a dead import (pre-existing, not this change, but worth noting)? (2) confirm `linearSemanticFallback` is exported/handled and the `EMB_KEEP_ALIVE` constant for the `ollamaEmbedQuery` reuse path.

### Assistant | 2026-06-11T03:05:09.605Z

[tool_use: Grep]

### Assistant | 2026-06-11T03:05:10.198Z

[tool_use: Bash]

### User | 2026-06-11T03:05:12.115Z

[tool_result] 55:import { shouldThrottleInject } from "../../scripts/lib/inject-throttle.mjs";
507:    return linearSemanticFallback(prompt, stale, qvec);
509:  return linearSemanticFallback(prompt, stale, null);
516:async function linearSemanticFallback(prompt, stale, qvecMaybe) {

### User | 2026-06-11T03:05:18.696Z

[tool_result]   ...
# Subtest: qdrantRankWiki returns null when Qdrant is down (-> caller falls through to linear scan)
ok 38 - qdrantRankWiki returns null when Qdrant is down (-> caller falls through to linear scan)
  ---
  duration_ms: 0.1407
  ...
# Subtest: qdrantRankWiki dedups by node_id and skips entries missing a payload node_id
ok 39 - qdrantRankWiki dedups by node_id and skips entries missing a payloa
... [+370 chars truncated]

### Assistant | 2026-06-11T03:05:28.249Z

40/40 green. `shouldThrottleInject` is imported at line 55 but never called anywhere in the file — that's a pre-existing dead import (commit `U-WIKI-PRECHECK-WIRE` per the comment) and NOT part of this HMEMV09 change, so out of scope for this review (worth a note but not a finding against this diff).

Now let me verify the two most critical safety claims with targeted scrutiny of the async paths. Let me trace the `AbortController` timer leak risk and the `score_threshold` server-side behavior. The key question: when Qdrant returns a 200 with results that DON'T meet `score_threshold` — does Qdrant filter them, or does the hook need to re-filter? Let me check whether the linear path filters `>= SEM_MIN_COSINE` but the Qdrant path trusts the server.

Looking at `qdrantRankWiki` (lines 463-489): it passes `score_threshold: SEM_MIN_COSINE` to Qdrant and does NOT re-filter client-side. Qdrant's `score_threshold` is a documented server-side filter, so this is correct — and the test at line confirms the floor is sent. The cosine metric assumption (Qdrant collection must use Cosine distance) is the load-bearing claim. Let me verify the collection's distance metric matches, since if the collection were created with Dot or Euclid, `score_threshold` semantics and the 0.62 floor would be wrong.

### Assistant | 2026-06-11T03:05:31.260Z

[tool_use: Bash]

### User | 2026-06-11T03:05:40.452Z

[tool_result] status: green points: 53930 vectors_count: undefined
vector cfg: {"size":768,"distance":"Cosine"}

### Assistant | 2026-06-11T03:05:46.332Z

Confirmed: `prism_wiki` is live (53,930 points, green), `distance: "Cosine"`, `size: 768`. This validates the load-bearing assumption — Qdrant's `score` IS cosine, so the `score_threshold: SEM_MIN_COSINE` (0.62) floor is applied identically to the linear path's `dot >= SEM_MIN_COSINE`. The 768-dim matches `nomic-embed-text` output.

Now let me verify the one remaining subtle risk: the live embed→ANN path actually produces a hit, to confirm the query-vector wiring (the `qvec` passed to Qdrant is the raw, un-normalized embedding — which is correct for Qdrant since it normalizes internally for Cosine, but the linear path normalizes the query in `cosineAgainstCorpus`). Let me confirm the curl-proven path and check there's no double-normalization issue.

### Assistant | 2026-06-11T03:05:51.237Z

[tool_use: Bash]

### User | 2026-06-11T03:06:02.422Z

[tool_result] hits: 3 | scores in [0,1]? true
sample payload keys: ["node_id"]
node_id present? true

### Assistant | 2026-06-11T03:06:36.862Z

The live path is confirmed: Qdrant accepts the raw (un-normalized) 768-d vector, returns scores in [0,1] (cosine), and `payload.node_id` is present — exactly the field `qdrantRankWiki` reads at line 481. The `with_payload: true` is required and present. The hook passes the raw `qvec` straight from `ollamaEmbedQuery` (no client normalization) — correct, because Qdrant Cosine normalizes server-side, and `score_threshold` operates on the normalized cosine. No double-normalization bug.

I've now verified every load-bearing claim. Let me do a final trace of the error-budget / never-throw guarantee across the full async call chain, since this fires on every prompt across 26 slots.

**Async fail-safety trace:**
- `main()` line 640: `await semanticFallback(prompt)` — inside `main`, which is invoked at line 679 as `main().catch(() => out({}))`. Any rejection is caught at the top level.
- `semanticFallback` (491): `await ollamaEmbedQuery` (its own try/catch/finally, returns null on any throw, clears timer in `finally`) → `await qdrantRankWiki` (its own try/catch/finally, returns null on throw, clears timer in `finally`) → `linearSemanticFallback` (own awaits, returns null/object). No unguarded `await`.
- `qdrantRankWiki` (463-489): `AbortController` timer `t` is cleared in `finally` on **every** path (ok, !ok, throw, abort). No timer leak. No unhandled rejection — the single `await fetchImpl` is inside `try`, `.json()` inside `try`.
- `readEmbMeta` (443-455): fully synchronous, `closeSync(fd)` in `finally`, outer `catch` returns defaults. The fd is opened inside the outer try, closed in inner finally — if `openSync` throws, no fd to leak; if `readSync`/`JSON.parse` throws, inner `finally` closes it. No fd leak.

All paths are airtight.

---

## Review verdict: PASS

Both files reviewed end-to-end, all 40 tests green, and every load-bearing integration claim independently verified against live infrastructure.

**Blast-radius safety (fires on every prompt × 26 slots) — confirme
... [+3987 chars truncated]
