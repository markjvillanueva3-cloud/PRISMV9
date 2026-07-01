---
title: Token-Optimization Advanced Techniques — State-of-the-Art Context-Economy Strategy
galaxy: token-optimization
owner_slot: alpha
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Each advanced technique below is anchored to a strategy confirmed by a live WebFetch (2026-06-10) against a free/legal source: official Anthropic engineering + prompt-caching docs, and the Wikipedia CS corpus (RAG, automatic summarization, locality-sensitive hashing, dictionary coder, grammar-based code). No technique is stated that was not fetched and read. This entry is the WORLD-LEADER-DEPTH layer — the state-of-the-art strategies an expert reaches for BEYOND the intro theory (token-optimization-foundations.md) and the common gotchas (token-optimization-applied-practice.md). Those two are NOT repeated here; read them first. Each 'PRISM galaxy application' line is a PRISM-internal mapping (reasoned, not quoted) and is the right place for owner scrutiny. All numeric cutting/physics constants and benchmark-specific PRISM token figures are deliberately left owner-gated for alpha."
tags: [token-optimization, advanced-techniques, context-engineering, compaction, sub-agent-isolation, just-in-time-retrieval, rag, reranking, kv-cache, cache-breakpoint, prewarming, abstractive-summarization, hierarchical-summarization, semantic-dedup, lsh, dictionary-coding, grammar-based-compression, state-of-the-art]
---

# Token-Optimization Advanced Techniques

This is the advanced-strategy layer for the token-optimization galaxy (owner: alpha) — the methods a domain expert reaches for *after* the foundations (entropy, Kraft, KL, channel capacity, Kolmogorov — `token-optimization-foundations.md`) and *after* the common gotchas (generation loss, cache-TTL misses, dedup collisions, lost-in-the-middle — `token-optimization-applied-practice.md`). Those entries establish *why the limits exist* and *what goes wrong*. This entry is *the advanced strategy that makes the difference at the top of the field*: how an expert moves the maximum load-bearing signal through a bounded window at minimum token cost, deliberately and without losing the datum the task needs.

Each technique is: the technique + WHEN an expert reaches for it + the trade-off DIRECTION + the source + one line on how THIS galaxy applies it. No intro theory and no common-gotcha material is restated.

---

## 1. Compaction strategy — summarize for recall first, then prune the cheap parts

### 1.1 Recall-maximizing compaction: keep load-bearing detail, drop only recomputable output
**Technique.** When a conversation nears the window limit, do not truncate blindly — *compact*. Anthropic's context-engineering guidance describes "taking a conversation nearing the context window limit, summarizing its contents, and reinitiating a new context window with the summary," where the model "preserves architectural decisions, unresolved bugs, and implementation details while discarding redundant tool outputs or messages." The discipline is to *"start by maximizing recall to ensure your compaction prompt captures every relevant piece of information"* before tuning down precision.
**When an expert reaches for it.** At the window boundary on a long task, instead of letting the model drop the oldest turns arbitrarily (which can evict the load-bearing decision while keeping a stale tool dump).
**Trade-off direction.** Maximizing recall keeps more tokens but guarantees the critical detail survives; tightening precision (dropping more) saves tokens but *"risks losing subtle context whose importance only emerges later."* Bias toward recall first, prune precision second — the asymmetry is that a wrongly-dropped fact is unrecoverable while a kept-but-unneeded fact is merely cheap.
**PRISM galaxy application.** This is the strategy behind the galaxy's `/compact`/handoff discipline: a compaction prompt should explicitly enumerate decisions, open bugs, and `file:line` anchors to preserve, while the cheapest thing to evict is a raw tool result already deep in history — "once a tool has been called deep in the message history, why would the agent need to see the raw result again?"

### 1.2 Evict recomputable tool output before evicting reasoning
**Technique.** Within compaction, the highest-yield, lowest-risk cut is *"clearing tool calls and results"* whose output can be re-fetched on demand — as opposed to the model's own reasoning, decisions, and synthesized state, which cannot be cheaply regenerated.
**When an expert reaches for it.** When the window is dominated by verbose tool transcripts (large file reads, command dumps) rather than by reasoning.
**Trade-off direction.** Dropping a recomputable artifact trades a possible future re-read (cheap, deterministic, on demand) for immediate window space now — a strictly good trade when the artifact is reproducible. Dropping irreproducible reasoning is the opposite trade and is avoided.
**PRISM galaxy application.** Maps directly onto the galaxy's "digest-over-exploration / read the precomputed index, not the raw tree" posture — a tool result that a later `Read`/dispatcher call can regenerate is a prime eviction target; a synthesized conclusion in a handoff is not.

## 2. Context isolation — spend a sub-agent's window so the lead window stays clean

### 2.1 Sub-agent isolation returns a distilled summary, not a raw transcript
**Technique.** Delegate a focused sub-task to a specialized agent with its own "clean context window" while the lead agent "coordinates with a high-level plan"; the sub-agent does the token-heavy exploration and returns only a "condensed, distilled summary" (Anthropic context engineering notes this is typically on the order of 1,000-2,000 tokens).
**When an expert reaches for it.** When a sub-task (a deep search, a multi-file audit) would otherwise flood the main window with intermediate detail the lead never needs to see again.
**Trade-off direction.** Isolation buys "clear separation of concerns" and a small return payload at the cost of "additional orchestration overhead" — extra coordination tokens and latency. Worth it when the sub-task's *intermediate* token cost dwarfs its *result* size; not worth it for a cheap one-shot lookup.
**PRISM galaxy application.** This is the token rationale for the per-task subagent pattern and the per-file scrutiny agents: the reviewer/searcher burns its own window reading the whole artifact and hands back a verdict, so the orchestrating chat never carries the full file in its own budget.

### 2.2 Structured note-taking — externalize state so the window holds only the active frontier
**Technique.** Have the agent "regularly write notes persisted to memory outside of the context window," which "get pulled back into the context window at later times," giving "persistent memory with minimal overhead" to "track progress across complex tasks, maintaining critical context and dependencies."
**When an expert reaches for it.** On long-horizon tasks whose full state would never fit a single window — the note file becomes the durable store and the window holds only what is active now.
**Trade-off direction.** Externalizing trades immediate in-window availability (a note must be re-loaded to be used) for unbounded persistent capacity and a small resident footprint. The cost is discipline — the agent must reliably write and re-read its own notes.
**PRISM galaxy application.** Exactly the per-chat `HANDOFF-<id>-<topic>.md` + `MEMORY.md` index pattern: the window carries the current frontier, and durable state lives in an external note pulled back on demand — the same space-for-availability bargain as memoization, applied to whole-task state.

## 3. Retrieval vs. context window — load by reference, rank before you spend

### 3.1 Just-in-time retrieval: carry identifiers, hydrate on demand
**Technique.** Instead of pre-loading all potentially relevant data, keep "lightweight identifiers (file paths, stored queries, web links, etc.)" and "use these references to dynamically load data into context at runtime using tools" — hydrating the actual content only when a step needs it.
**When an expert reaches for it.** When the candidate corpus is large and only a small, unpredictable slice will actually be needed this turn.
**Trade-off direction.** Just-in-time avoids loading irrelevant material upfront (lower resident tokens, better relevance) but "runtime exploration is slower than retrieving pre-computed data" — you pay latency and tool round-trips for window economy. Pre-loading is the reverse: fast, but it spends tokens on data that may never be read.
**PRISM galaxy application.** The galaxy's `[[wikilink]]` pointers, shortcodes, and master-index identifiers are exactly these lightweight references — the chat carries the pointer cheaply and only `Read`s/dispatches the full asset when a step demands it.

### 3.2 Retrieval-augmented generation: fetch a ranked slice instead of fitting everything
**Technique.** Rather than fitting all knowledge into one prompt, RAG breaks documents into chunks, embeds them as vectors, and at query time "a document retriever is first called to select the most relevant documents that will be used to augment the query" — and "when new information becomes available, rather than having to retrain the model, all that's needed is to augment the model's external knowledge base" (Wikipedia, Retrieval-augmented generation).
**When an expert reaches for it.** When the knowledge base far exceeds the window, or changes faster than any baked-in context could track.
**Trade-off direction.** Retrieval trades a guaranteed-complete (but token-unbounded) full-context dump for a bounded top-k slice — cheaper and fresher, but it can miss a relevant chunk the retriever ranked low, and the model "can still hallucinate around the source material." More retrieved chunks raise recall and token cost together; fewer chunks do the reverse.
**PRISM galaxy application.** PRISM's tribal-by-domain, wiki-precheck, and master-index top-K injection are RAG over the galaxy corpus — fetch a ranked handful into the window rather than resident-loading the whole knowledge base.

### 3.3 Re-ranking before injection — filter the retrieved set so tokens land on the best chunks
**Technique.** Strong retrieval pipelines "refine results through additional filtering steps to improve relevance before feeding information to the language model" (Wikipedia, RAG) — a second, sharper pass that reorders the cheap first-stage candidates so only the most relevant survive into the prompt.
**When an expert reaches for it.** Whenever first-stage (embedding/keyword) recall is broad and noisy and the window can only afford a few items — you want the *best* few, not the first few.
**Trade-off direction.** Re-ranking spends extra compute to raise the precision of what enters the window, which directly lowers the KL-style "wrong-model" tax of injecting low-relevance tokens (foundations entry, KL divergence). The cost is the rerank pass itself; the gain is that every injected token is high-value.
**PRISM galaxy application.** The galaxy's relevance-ranked, keyword-gated top-K injectors are a rerank stage: broad candidate match first, then rank-and-cap so only the highest-relevance hits consume window — a few high-signal tokens instead of a long low-signal dump.

## 4. KV-cache / prompt-cache as a token-economy lever (advanced placement)

> The *gotchas* of caching (silent TTL expiry, breakpoint-on-varying-content, invalidation cascade) live in the applied-practice entry. This section is the *offensive strategy* for structuring a prompt to win cache reads.

### 4.1 Order content static-to-dynamic and breakpoint the last stable block
**Technique.** Structure the prompt so the most stable material comes first and the most volatile last: "Place static content (tool definitions, system instructions, context, examples) at the beginning of your prompt," and "place `cache_control` on the last block whose prefix is identical across the requests you want to share a cache" (Anthropic, prompt caching). The cache hierarchy is enforced tools then system then messages.
**When an expert reaches for it.** Any repeated-prefix workload — a stable system prompt + tool surface reused across many turns or many requests.
**Trade-off direction.** Correct ordering makes a long static prefix a cache *read* (a fraction of base input cost) instead of a fresh write every turn; the constraint is architectural rigidity — you must keep volatile content strictly after the breakpoint, which limits where dynamic data can go.
**PRISM galaxy application.** The fleet's stable system prompt + dispatcher/tool definitions + hook-injected digests are deliberately the cacheable head; per-prompt injected context (timestamps, master-index hits) is placed after the breakpoint so it rides the cache instead of busting it.

### 4.2 Multiple breakpoints by change frequency + the 20-block lookback
**Technique.** Use up to four breakpoints to "cache different sections that change at different frequencies (for example, tools rarely change, but context updates daily)," and add a second breakpoint to "ensure a cache hit when a growing conversation pushes your breakpoint 20 or more blocks past the last cache write" — because "the lookback window is 20 blocks" and checking stops if no match is found within it.
**When an expert reaches for it.** When a prompt has layers with genuinely different volatility (tools = monthly, domain context = daily, conversation = per-turn), or when a long conversation grows past the lookback horizon.
**Trade-off direction.** Segmenting by volatility means a change to a fast-churning layer invalidates only that layer downward, not the stable head — protecting the expensive cached prefix. The cost is breakpoint-management complexity and a finite budget of four. Coarser (one breakpoint) is simpler but cascades more invalidation.
**PRISM galaxy application.** Maps onto the galaxy's layered injection (rarely-changing tool/dispatcher surface; daily-refreshed digests/BUILD_STATE; per-prompt hits): segment-cache the slow layers so a daily digest refresh does not cold-tier the whole fleet's tool definitions.

### 4.3 Pre-warm the cache to erase the first-request cold-miss
**Technique.** For latency-sensitive or burst workloads, issue a cheap warm-up request (e.g. `max_tokens: 0`) that writes the cacheable prefix before the real traffic arrives, so the first real request reads a warm cache instead of paying the cold write (Anthropic, prompt caching, pre-warming).
**When an expert reaches for it.** When a known stable prefix will be hit by a burst of requests and the first-request cold penalty is visible to a user or a tight loop.
**Trade-off direction.** Pre-warming pays one deliberate cache-write upfront to remove the cold-miss from the critical path — a latency/cost shift, not a saving, justified when the warm prefix is reused enough to amortize the write.
**PRISM galaxy application.** Parallels the galaxy's Ollama pre-warm-on-pipeline pattern (warm the local model before a pipeline fires); the same idea applies to a stable cacheable prefix ahead of a multi-chat burst so no slot eats the cold write on the hot path.

## 5. Lossless structural compression + semantic dedup before merge

### 5.1 Abstractive summarization compresses past what extraction can reach
**Technique.** Two summarization regimes: *extractive*, where "content is extracted from the original data, but the extracted content is not modified in any way" (select sentences verbatim), and *abstractive*, whose "methods generate new text that did not exist in the original text," paraphrasing to "achieve greater compression than extraction alone permits" (Wikipedia, Automatic summarization). Both aim to "create a subset that represents the most important or relevant information."
**When an expert reaches for it.** Extractive when verbatim fidelity matters (you must preserve an exact quote / value / line); abstractive when you need a tighter compression ratio than picking whole sentences can give.
**Trade-off direction.** Abstractive achieves higher compression but is more lossy and can introduce paraphrase drift; extractive is lower-compression but keeps source text exact. Choose extractive for load-bearing literals, abstractive for narrative state — never abstractive over a value you must reproduce exactly.
**PRISM galaxy application.** A handoff should *extract* the exact `file:line`, commit SHA, and reference value verbatim, and *abstract* the surrounding narrative — the galaxy's "preserve the load-bearing literal, compress the prose" rule is precisely the extractive/abstractive split applied per datum.

### 5.2 Multi-document summarization deduplicates by synthesis, not by deletion
**Technique.** Summarizing across several sources on one topic lets a user "quickly familiarize themselves with information contained in a large cluster of documents" by synthesizing across them and "reducing redundancy" — consolidating overlapping coverage into one non-repeating report (Wikipedia, Automatic summarization).
**When an expert reaches for it.** When multiple inputs (several handoffs, several wiki entries, several tool dumps) cover overlapping ground and naive concatenation would pay for the same fact many times.
**Trade-off direction.** Synthesis-dedup removes cross-source redundancy (big token win on overlapping corpora) at the cost of a reasoning pass and the risk of merging two *almost*-identical claims that actually differ — so it pairs with the verification in 5.3.
**PRISM galaxy application.** Consolidating N galaxy memories or N slot handoffs into one digest is multi-document summarization — the galaxy folds overlapping context into a single non-repeating injection rather than carrying every source's copy of a shared fact.

### 5.3 Semantic (near-duplicate) dedup via LSH — collapse what is *similar*, then verify
**Technique.** Where byte-equal dedup only catches identical chunks, locality-sensitive hashing "hashes similar input items into the same 'buckets' with high probability" (the opposite of a conventional hash, which *minimizes* collisions), enabling "near-duplicate detection" and clustering by "preserving relative distances between items" while reducing dimensionality (Wikipedia, Locality-sensitive hashing).
**When an expert reaches for it.** When candidate context items are *paraphrases* of each other (two tribal tips, two memories saying the same thing in different words) that an exact-hash dedup would never catch.
**Trade-off direction.** LSH catches near-duplicates that exact hashing misses (more redundancy removed) but, because it groups by *similarity*, two genuinely distinct items can land in the same bucket — so a similarity bucket must be confirmed before a merge, never merged on bucket-collision alone (the false-merge hazard in the applied-practice entry). Looser thresholds dedup more aggressively and false-merge more; tighter thresholds do the reverse.
**PRISM galaxy application.** The principled upgrade path for the galaxy's dedup: exact byte-equal where it suffices (C-to-H mirror, identical injections), LSH-style near-duplicate clustering to collapse paraphrased tribal tips/memories before injection — always with a verification pass before two distinct assets are merged.

### 5.4 Dictionary coding — replace repeated substrings with back-references (lossless)
**Technique.** A dictionary coder works by "searching for matches between the text to be compressed and a set of strings contained in a data structure (called the 'dictionary')," then "substitutes a reference to the string's position" — and "since no information is lost during this process, dictionary coding achieves lossless compression" (Wikipedia, Dictionary coder; LZ77/LZ78/LZW family).
**When an expert reaches for it.** On structured/repetitive text (logs, repeated headers, recurring field names, boilerplate framing) where the same substrings recur — exactly the redundant material the foundations entry says is the only place compression can win.
**Trade-off direction.** Dictionary coding is fully lossless and so always safe, but its win scales with how repetitive the input is — high on boilerplate-heavy structured text, near-zero on already-dense high-entropy content (the pigeonhole floor from the applied-practice entry). Spend the dictionary budget where the repeats are.
**PRISM galaxy application.** The galaxy's DSL shortcodes are a hand-built static dictionary (`E####`/`D##`/`A##`/`T####` are back-references into a known table); the same principle says collapse a repeated long path or phrase into one referenced token rather than re-emitting it, recovering it losslessly on read.

### 5.5 Grammar-based compression — capture hierarchical structure as reusable rules
**Technique.** A grammar-based code "transforms x into a context-free grammar G" — a small set of rules that generates exactly the input — substituting frequent substrings with single rule symbols, "particularly effective for structured or repetitive data because it captures hierarchical patterns" losslessly (the grammar is then further compressed by a statistical coder). Note: "finding the smallest possible grammar... is known to be NP-hard," so practical algorithms approximate (Wikipedia, Grammar-based code).
**When an expert reaches for it.** On deeply structured, hierarchically repetitive content (nested config, templated documents, repeated multi-line patterns) where a flat dictionary misses the *nested* reuse a grammar captures.
**Trade-off direction.** Grammar codes capture hierarchical repetition a flat dictionary cannot, yielding higher compression on structured input — but the smallest-grammar problem being NP-hard means you accept an *approximate* (not provably minimal) representation. This is the practical face of the Kolmogorov non-computability result (foundations entry): you cannot compute the provably shortest description, only good upper bounds.
**PRISM galaxy application.** Templated PRISM artifacts (galaxy MEMORY.md scaffolds, per-slot wrappers, repeated section schemas) are grammar-compressible — factor the recurring multi-line structure into one referenced template/rule and instantiate it, rather than carrying every expansion verbatim; accept the approximation, measure the realized token cost.

---

## Owner-gate (NOT promoted)

The following are deliberately left for alpha (galaxy owner) to verify before promotion beyond VERIFIED-PARTIAL. Per R12-SAFETY: this entry promotes ONLY the qualitative strategy/method/trade-off direction — never a numeric constant.

- **All cutting/physics constants.** No kc1.1, no Taylor C/n, no SFM/RPM/IPR/chip-load/feed/depth-of-cut number, no coolant-pressure psi appears anywhere in this entry. Those are owner-gated for alpha and live ONLY in `mcp-server/src/physics/constants.ts`. Where a relationship is described it is stated as a *shape* ("higher engagement angle raises cutting temperature, so reduce feed"), never as a value. Any future edit that introduces such a number must route it through the constants module, not this wiki.
- **Vendor cache numbers (model-specific).** The prompt-caching fetch surfaced per-model minimum cacheable token counts, cache-read/write price multipliers, and the 5-minute / 1-hour TTL figures. Those are vendor numbers that change with model releases and are deliberately NOT load-bearing in the body — only the *strategy* (static-to-dynamic ordering, multi-breakpoint by volatility, pre-warming) is promoted. Alpha should re-fetch the live doc before quoting any specific minimum, price, or TTL.
- **Sub-agent return-payload size.** The "~1,000-2,000 tokens" distilled-summary figure and the "20-block lookback" are quoted as the source's stated values, not as PRISM thresholds; alpha should treat the *direction* (small distilled return; finite lookback so re-breakpoint a long conversation) as the promoted claim, and validate the exact numbers against current docs/behavior.
- **PRISM realized token-savings / dedup thresholds.** No benchmark-specific PRISM number (RTK percent savings, offload ratio, cache hit-rate, an LSH similarity cutoff, a compaction recall target) is asserted here. Those are owner-gated and live in the galaxy's measured ledgers (e.g. `ollama-offload-stats.json`) and its tuning, not in this strategy-to-practice mapping.
- **"PRISM galaxy application" mappings.** Every such line links a fetched strategy to galaxy tooling (compaction/handoff, subagent pattern, `[[wikilink]]` references, layered cache injection, shortcodes, dedup). These are reasoned PRISM-internal interpretations, not quoted from the sources, and are the appropriate place for owner scrutiny.

## Sources

All URLs below were fetched and read on 2026-06-10 (free / legal: official Anthropic engineering + docs, Wikipedia CS corpus). Vendor-doc grade flagged.

1. Anthropic — Effective context engineering for AI agents (compaction keep/drop, sub-agent isolation + distilled summary, structured note-taking, just-in-time vs pre-loading retrieval) — https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents  **(official vendor engineering blog)**
2. Anthropic — Prompt caching (static-to-dynamic ordering, last-stable-block breakpoint, multi-breakpoint by change frequency, 20-block lookback, pre-warming, invalidation hierarchy) — https://platform.claude.com/docs/en/build-with-claude/prompt-caching  **(official vendor docs)**
3. Retrieval-augmented generation (retrieval vs full-context, chunking/embedding/retriever, re-ranking, freshness without retrain) — https://en.wikipedia.org/wiki/Retrieval-augmented_generation
4. Automatic summarization (extractive vs abstractive, "most important / representative information," multi-document redundancy reduction) — https://en.wikipedia.org/wiki/Automatic_summarization
5. Locality-sensitive hashing (similar items to the same buckets, near-duplicate detection, distance-preserving dimensionality reduction) — https://en.wikipedia.org/wiki/Locality-sensitive_hashing
6. Dictionary coder (match against a dictionary, substitute position references, lossless; LZ77/LZ78/LZW) — https://en.wikipedia.org/wiki/Dictionary_coder
7. Grammar-based code (transform input into a context-free grammar, hierarchical repeated-substring capture, smallest-grammar NP-hardness) — https://en.wikipedia.org/wiki/Grammar-based_code
