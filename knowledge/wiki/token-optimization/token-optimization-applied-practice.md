---
title: Token-Optimization Applied Practice — Compression & Context-Economy Gotchas
galaxy: token-optimization
owner_slot: alpha
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Every practitioner gotcha below is anchored to a claim confirmed by a live WebFetch (2026-06-10) against a free/legal source: official Anthropic prompt-caching docs, Wikipedia CS-engineering corpus (cache replacement, lossy/lossless compression, deduplication, memoization), and the arXiv Lost-in-the-Middle paper. No gotcha is stated that was not fetched and read. The theory underneath these gotchas lives in token-optimization-foundations.md and is NOT repeated here. Each 'How this galaxy hits it' line is a PRISM-internal mapping (reasoned, not quoted) and is the appropriate place for owner scrutiny. Benchmark-specific PRISM token numbers are left owner-gated."
tags: [token-optimization, applied-practice, tribal-knowledge, prompt-caching, cache-ttl, lossy-summarization, dedup-collision, context-thrash, lost-in-the-middle, entropy-floor, memoization, failure-modes]
---

# Token-Optimization Applied Practice

This is the practitioner-knowledge layer for the token-optimization galaxy (owner: alpha): the hard-won engineering gotchas, failure modes, and technique decisions that the theory in `token-optimization-foundations.md` does not teach. Foundations answers *why* the limits exist (entropy, Kraft, KL, channel capacity, Kolmogorov). This page answers *what goes wrong when you actually try to spend fewer tokens, and how an expert avoids it.* Read foundations first — the theory is not restated here.

Each entry is: the gotcha, WHY it bites, the expert's avoidance, the source, and one line on how THIS galaxy hits it.

---

## 1. Lossy summarization — the cut you cannot un-cut

### 1.1 Generation loss: re-summarizing a summary compounds irreversibly
**Gotcha.** Every lossy pass discards detail, and the loss is permanent — you cannot reconstruct what was dropped by decoding and re-encoding. Wikipedia (Lossy compression): *"Lossy compression formats suffer from generation loss: repeatedly compressing and decompressing the file will cause it to progressively lose quality."* Once removed, *"the discarded portions simply don't exist in the compressed version."*
**Why it bites.** A handoff that summarizes a summary that summarized the original is three lossy generations deep; the load-bearing `file:line` or reference value silently evaporated two passes ago, and nothing in the artifact flags that it is gone.
**Expert avoidance.** The same source prescribes it: *"It can be advantageous to make a master lossless file which can then be used to produce additional copies from."* Keep a lossless master (the raw commit, the full transcript, the original file) and *always summarize from the master*, never from a prior summary.
**How this galaxy hits it.** Handoff compaction, Ollama summarization, and digest-over-exploration are all lossy generations. The rule: a fresh digest is generated from canonical source (commit, file, ledger), not from yesterday's digest — and R12 forbids silently dropping the edge case the user named.

### 1.2 Lossy vs. lossless is the precondition, not a footnote
**Gotcha.** Practitioners apply "compression" techniques without classifying them, then are surprised when information is gone. Lossless reduction (reformatting, dedup, shortcodes) removes only redundancy with exact recoverability; lossy reduction (summarization) removes "less important" information *irreversibly* (Lossy compression, fetched 2026-06-10).
**Why it bites.** A lossless technique is always safe to apply blindly; a lossy one requires a judgment about what is task-critical. Treating them as interchangeable is how a "just compress the context" instinct destroys the one datum the task needed.
**Expert avoidance.** Before applying any reduction, name its class. Lossless → apply freely. Lossy → decide what is droppable *first*, then cut.
**How this galaxy hits it.** RTK output filtering and byte-equal dedup are lossless (safe); `/compact`, handoff write, and Ollama offload are lossy (require the keep/drop judgment). The galaxy's whole safety posture rests on this one classification.

## 2. The entropy floor — you cannot squeeze structured text past it

### 2.1 No compressor shrinks everything (pigeonhole)
**Gotcha.** There is no universal "make it smaller" button. Wikipedia (Lossless compression): *"By operation of the pigeonhole principle, no lossless compression algorithm can shrink the size of all possible data: Some data will get longer by at least one symbol or bit."* Compression only works because *"most real-world data exhibits statistical redundancy"* and *"cannot shrink the size of random data that contain no redundancy."*
**Why it bites.** Aggressive token-trimming of already-dense text (a tight diff, a constants table, a reference list) does not shrink it — it either no-ops or, if forced lossy, deletes signal. Effort spent re-compressing high-entropy content is wasted, or worse, destructive.
**Expert avoidance.** Spend the compression budget on the *redundant* material (boilerplate, restated context, predictable framing) where there is statistical structure to exploit; leave dense, high-surprise content at full fidelity.
**How this galaxy hits it.** RTK targets the redundant shells of tool output (repeated headers, ASCII art, progress spam); it does not try to compress the actual error line. Knowing the floor exists is what stops a chat from "compacting" a tight handoff into a lossy one for no token gain.

## 3. Prompt-cache TTL — the cold-tier miss that quietly doubles cost

### 3.1 The 5-minute TTL expires silently
**Gotcha.** Anthropic prompt caching has a *"5-minute lifetime"* by default (a 1-hour TTL exists at 2x base input price). A cache miss is not an error — you simply pay full price. As Wikipedia (Cache replacement policies) frames the general cost: a miss incurs *"time to make main-memory access,"* far more expensive than a hit.
**Why it bites.** A chat that pauses longer than the TTL between turns lets the cached prefix expire; the next turn is a full cold-tier write at full token cost, with no warning. Intermittent idle gaps turn a "cached" workflow into an uncached one.
**Expert avoidance.** The TTL is refreshed for free on every hit: *"The cache is refreshed for no additional cost each time the cached content is used."* Keep the cached prefix warm by using it within the window, or pay for the 1-hour TTL when gaps are expected.
**How this galaxy hits it.** Stable system prompt + tool definitions + injected digests are the cacheable prefix across a slot's turns. Long idle gaps (operator away, a slow build) silently cold-tier them — the galaxy's "keep the prefix stable" discipline is worthless if the prefix is left to expire.

### 3.2 The breakpoint on changing content never hits
**Gotcha.** A cache entry is written only at your `cache_control` breakpoint, as a hash of the prefix *ending at that block*. If you put the breakpoint on a block that changes every request (a timestamp, the incoming message), the prefix hash differs every time: *"You pay for a fresh cache write on every request and never get a read."* The lookback window is only *"20 blocks."*
**Why it bites.** This is the single most common caching mistake — the breakpoint looks correct but sits one block too late, on varying content, so the cache is write-only forever and costs *more* than no caching.
**Expert avoidance.** Per the docs: *"place the breakpoint at the end of the static prefix, not on the varying block."* Put per-request varying content (timestamps, the user message) *after* the breakpoint, and in a growing conversation add a second breakpoint before the 20-block lookback window slides past the last write.
**How this galaxy hits it.** When the galaxy injects per-prompt context (master-index top-K, tribal hits, a session timestamp), that varying material must land *after* the static cacheable prefix — otherwise every injection silently invalidates the cache it was supposed to ride on.

### 3.3 Cache invalidation cascades down the hierarchy
**Gotcha.** Caches follow the order `tools` → `system` → `messages`, and *"Changes at each level invalidate that level and all subsequent levels."* Changing a tool definition busts everything; toggling thinking parameters or adding an image busts system + messages.
**Why it bites.** A seemingly innocent change — adding one tool, flipping a search toggle — invalidates the entire downstream cache, so a "small" edit pays a full cold rewrite of a large prefix.
**Expert avoidance.** Freeze the highest-leverage, least-changing material (tool defs, system prompt) and let only the bottom of the hierarchy churn; batch tool-definition changes rather than dribbling them in.
**How this galaxy hits it.** The galaxy's stable tool/dispatcher surface and stable hook-injected system context are deliberately the *top* of the hierarchy; any churn there (a new dispatcher, a reworded injection) cold-tiers the whole fleet's cached prefix, so such changes are batched, not continuous.

## 4. Dedup false-merge — when two distinct things collapse into one

### 4.1 A hash collision silently corrupts by treating distinct data as identical
**Gotcha.** Deduplication identifies "duplicates" by hashing chunks: *"each chunk of data is assigned an identification, calculated by the software, typically using cryptographic hash functions."* But *"If two different pieces of information generate the same hash value, this is known as a collision,"* and *"data corruption can occur if a hash collision occurs, and additional means of verification are not used."* Cryptographic hashes reduce but (per the birthday-attack note) do not eliminate this.
**Why it bites.** A false-merge is a *silent* data-loss event: two genuinely different items are collapsed to one, and one is replaced by a reference to the other. No error fires; the second item is simply gone.
**Expert avoidance.** Per the source's mitigation: pair a fast weak hash with a strong-hash (or byte-level) verification before merging — *"weak hashes for speed, followed by strong hashes for verification."* Never merge on hash equality alone.
**How this galaxy hits it.** The galaxy's byte-equal dedup (e.g. the C→H mirror's SHA-256 byte-equal skip, and dedup of injected context items) must merge on *byte equality*, not just a digest match — and the duplication guard must compare real content before declaring two engines/memories "the same," or it false-merges two distinct assets.

## 5. Context-window thrash — more tokens, less signal

### 5.1 Lost-in-the-middle: relevant info buried mid-context is under-used
**Gotcha.** Stuffing more into the window does not mean the model uses it. The arXiv "Lost in the Middle" study finds *"performance is often highest when relevant information occurs at the beginning or end of the input context, and significantly degrades when models must access relevant information in the middle of long contexts"* — a U-shaped curve that holds *"even for explicitly long-context models."*
**Why it bites.** A chat that pads context "to be safe" can bury the load-bearing fact in the dead middle zone, where recall is weakest — paying tokens to *reduce* the chance the model uses the very datum it added.
**Expert avoidance.** Place the most task-critical material at the *start or end* of the context, not the middle; and prefer fewer, higher-relevance tokens over a long padded window (the paper notes *"performance can degrade significantly when changing the position of relevant information"*).
**How this galaxy hits it.** Keyword-gated, relevance-ranked injection (master-index top-K, tribal-by-domain, wiki-precheck) exists precisely to put a *few* high-relevance items in, rather than a long low-relevance dump that lands the answer in the lost-middle. Position matters: the injected high-value pointer should not be buried under boilerplate.

### 5.2 Longer context is not free recall — the channel degrades
**Gotcha.** The same study shows *"current language models do not robustly make use of information in long input contexts"* — throughput of *useful* signal does not scale linearly with tokens consumed.
**Why it bites.** Practitioners treat the window as a uniform store; it is not. Past a usable fraction, added tokens cost budget and add little reliable signal — the practical analogue of pushing a channel past capacity (see foundations §6).
**Expert avoidance.** Operate below the usable ceiling on purpose: summarize/compact *before* the window saturates rather than riding it to the limit, and treat "it all fits" as necessary-but-not-sufficient for "it will all be used."
**How this galaxy hits it.** The galaxy's `/compact`-every-2-3-units cadence and soft per-session ceiling are exactly this discipline — keep the working set inside the reliably-recalled region rather than maximizing what is technically resident.

## 6. Redundant re-reads — recomputing what you already know

### 6.1 Re-reading the same file is recomputation; memoize it
**Gotcha.** Fetching/reading the same unchanged artifact twice in a session is pure redundant work — the token-economy analogue of recomputation. Memoization (Wikipedia) is the standard fix: it *"works by storing the results of expensive calls"* and, when *"a function encounters inputs it has processed before, it retrieves the stored outcome instead of recomputing it,"* a *"space–time tradeoff."*
**Why it bites.** Each redundant Read re-spends the file's full token cost for zero new information; across a long session, repeated re-reads of the same digest/config/handoff dominate avoidable spend.
**Expert avoidance.** Cache-then-reuse: hold the result of an expensive read and reuse it for identical inputs rather than re-issuing the read. The tradeoff is memory for tokens — exactly memoization's space-time bargain.
**How this galaxy hits it.** CLAUDE.md's "Don't re-read after Edit/Write (hooks track)" rule is a memoization directive: the harness already knows the post-edit state, so re-reading is a redundant recompute. Digest files and the master index are themselves memoized indexes — read the precomputed digest once instead of re-deriving it by re-exploring the tree every time.

---

## Owner-gate (NOT promoted)

Left for alpha (galaxy owner) to verify before promotion beyond VERIFIED-PARTIAL:

- **Model-specific cache minimums and prices.** The prompt-caching doc fetch returned per-model minimum cacheable token counts (e.g. 1,024 tokens for Opus 4.8) and the 2x/1-hour-TTL price multiplier. These are vendor numbers that change with model releases — alpha should re-fetch the live doc before quoting any specific minimum or price, and they are deliberately not load-bearing in the body above.
- **PRISM realized token-savings figures.** No benchmark-specific PRISM number (RTK percent savings, offload ratio, cache hit-rate on the fleet) is asserted here; those are owner-gated and live in the galaxy's own measured ledgers (e.g. `ollama-offload-stats.json`), not in this theory-to-practice mapping.
- **"How this galaxy hits it" mappings.** Every such line links a fetched CS-engineering gotcha to galaxy tooling (RTK, injection ranking, C→H mirror dedup, /compact cadence, digest memoization). These are reasoned PRISM-internal interpretations, not quoted from the sources, and are the right place for owner scrutiny.
- **Lost-in-the-middle generality.** The arXiv finding is from the cited study's models/tasks; whether the exact U-shape holds for the specific model the fleet runs is an empirical question alpha can validate against live recall behavior rather than assume.

## Sources

All URLs fetched and read on 2026-06-10 (free / legal: official Anthropic docs, Wikipedia CS-engineering corpus, arXiv). Course/vendor-doc/paper grade flagged.

1. Anthropic — Prompt caching (TTL, cold-tier miss, breakpoint placement, invalidation hierarchy) — https://platform.claude.com/docs/en/build-with-claude/prompt-caching  **(official vendor docs)**
2. Cache replacement policies (cache hit/miss cost, TTL/TLRU eviction) — https://en.wikipedia.org/wiki/Cache_replacement_policies
3. Lossy compression (generation loss, irreversibility, master-lossless-file practice) — https://en.wikipedia.org/wiki/Lossy_compression
4. Lossless compression (pigeonhole limit, redundancy precondition) — https://en.wikipedia.org/wiki/Lossless_compression
5. Data deduplication (hash collision, false-merge corruption, dual-hash verification) — https://en.wikipedia.org/wiki/Data_deduplication
6. Lost in the Middle: How Language Models Use Long Contexts (Liu et al.) — https://arxiv.org/abs/2307.03172  **(arXiv paper)**
7. Memoization (cache results, avoid redundant recomputation, space-time tradeoff) — https://en.wikipedia.org/wiki/Memoization
