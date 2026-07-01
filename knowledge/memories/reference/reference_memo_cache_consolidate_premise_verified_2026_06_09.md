---
name: reference_memo_cache_consolidate_premise_verified_2026_06_09
description: OLLAMA-SYNERGY #6 premise FALSIFIED - the 2 memo embedding caches are distinct purpose-built caches, not a safe dedup
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.655Z
aliases: reference_memo_cache_consolidate_premise_verified_2026_06_09
---


# OLLAMA-SYNERGY #6 (U-MEMO-CACHE-CONSOLIDATE) premise verified-and-refined (2026-06-09, slot:sierra)

The OLLAMA-SYNERGY-AUDIT #6 row claimed: "`build-memo-embedding-cache.mjs` (42MB JSONL) vs `build-memory-embeddings-sidecar.mjs` int8 -- same corpus embedded 2x -> consolidate both consumers onto the int8 sidecar; retire JSONL builder." Verified the two builders (R8/dedup discipline -- same check that falsified NAV-ACCEL Gap A). **The premise is an unsafe oversimplification.** They are TWO DISTINCT purpose-built caches:

1. **`build-memo-embedding-cache.mjs` -> JSONL** (CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL F3a): feeds the **MCP-INDEPENDENT PreToolUse hot-path recall hook** `memory-relevance-inject.mjs`, which reads the JSONL DIRECTLY (no MCP daemon) so semantic recall keeps working when the MCP server is down. Source = the memory dir + the 34 per-galaxy `MEMORY.md` brains under `mcp-server/src/engines/<galaxy>/`. Slice = "frontmatter description + title + opening paragraph". Full-precision float vectors (via memo-embed-lib).
2. **`build-memory-embeddings-sidecar.mjs` -> int8** (A6): feeds the **search-lib hybrid BM25+dense+RRF retrieval** in `memory-index-search-lib.mjs`. Source = `memory-index-sidecar.json` (the BM25 record set, aligned 1:1 by recordKey). Slice = "name. description. opening". int8-quantized (32x compression).

**Why "retire the JSONL builder" is UNSAFE:** the JSONL cache and the int8 sidecar embed OVERLAPPING-BUT-NOT-IDENTICAL corpora (the JSONL adds the 34 galaxy brains; the int8 is bounded to the BM25 sidecar records), with DIFFERENT slice definitions (different vectors -> not interchangeable), DIFFERENT formats (JSONL float vs packed int8), and DIFFERENT consumers (MCP-independent hot-path hook vs search-lib). Pointing the hot-path hook at the int8 sidecar would require: aligning the corpus (add galaxy brains to the sidecar source), aligning the slice text, teaching the hook to read+dequant packed int8, and accepting int8 precision loss on hot-path recall -- a high-blast-radius project, NOT a drop-in.

**Correct re-scoping (operator/next-tick decision):**
- (a) **Accept both as distinct** (close #6 won't-fix-with-rationale): the ~2x embed is the cost of MCP-independence + format specialization; the caches serve genuinely different paths. Lowest risk.
- (b) **Share the EMBED COMPUTE only** (a careful, separately-scoped unit): embed the union corpus once via nomic-embed, then emit BOTH the JSONL (full-precision, hot-path) and the int8 sidecar (search) from the shared vectors -- cuts the 2x embed cost WITHOUT merging the consumers. Still needs corpus+slice alignment; medium effort, lower risk than retiring a builder.
- DO NOT do the audit's literal "retire the JSONL builder" -> it breaks MCP-independent hot-path recall.

**Lesson:** audit rows that assert "X and Y are the same, consolidate" must be VERIFIED against the actual consumers/formats/corpora before building -- "same model (nomic-embed)" != "same cache". Two of this /goal's audit premises (NAV-ACCEL Gap A, this #6) were oversimplified on verification. See [[reference_nav_accel_gap_a_already_built_2026_06_09]], [[reference_ollama_synergy_audit_2026_06_09]].
