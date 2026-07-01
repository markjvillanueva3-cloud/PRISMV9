---
name: reference_wiki_tribal_coverage_69pct_qdrant_gate_2026_06_10
description: Real wiki-tribal coverage is 69.2% (not the 40.1% banner); the final 31% (13,228 files) is architecturally GATED on the Qdrant migration -- embedding them into the 534MB JSON index would blow the 8GB rerank heap and kill PSN leg #5.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.265Z
aliases: reference_wiki_tribal_coverage_69pct_qdrant_gate_2026_06_10
---


# Wiki-tribal coverage = 69.2% real; heap ceiling REMOVED via streaming (Qdrant no longer a hard gate) (2026-06-10, slot:sierra)

> **UPDATE (same day, later): the "Qdrant-gated" conclusion below is SUPERSEDED.** The thing that made Qdrant a *hard* gate was the per-prompt rerank materializing all ~30K entries into the 8GB heap (so growing the JSON index past ~600MB would OOM PSN leg #5). That ceiling is now REMOVED: `U-TRIBAL-RERANK-STREAM` (commit 17294fc77f) + `-STREAM-FIX` (e7704ba450) rewrote `tribal-rerank.mjs` to STREAM the index with a bounded top-K (O(K + off-heap Buffer) heap) via the new `streamTribalEntries` in `load-tribal-index.mjs`. LIVE-VALIDATED: rerank runs at `--max-old-space-size=1024` (8x below the old 8GB, where it OOM'd) with byte-identical hits, 3.6s, on the 534MB index; 16/16 tests; 3-of-3 PASS. The inject-hook existence gate was widened (shard-aware) so growth->sharding doesn't kill leg #5 at the hook seam. **=> the JSON index CAN now grow to full 100% coverage WITHOUT Qdrant** (run the embed batch; it auto-shards past 480MiB, the streaming rerank + manifest-aware reader handle any size). Qdrant is now a nice-to-have for per-prompt LATENCY (streaming still parses the whole file per prompt, ~3-5s at full size), NOT a correctness/heap gate. The Docker/operator blocker below no longer blocks coverage growth -- only a future latency optimization. The bounded next unit is simply: run the embed batch to take 69.2%->100% (no infra dependency). [[reference_tribal_index_v8_string_cap_2026_06_08]].

Ran the real audit (`node scripts/wiki-tribal-cross-ref-audit.mjs`, 8GB heap, exit 0) -- the SessionStart banner (40.1%) and the prior [[reference_wiki_tribal_coverage_17pct_2026_06_09]] (17.1%) are both STALE point-in-time reads. **Current real state:**
- wiki files on disk: **42,941**
- tribal wiki entries: **29,723** (back near the pre-clobber 33,639 -- the vault HAS been self-improving since the 2026-06-08 clobber: coverage 17% -> 69.2%, index 168MB -> 534MB via embed jobs)
- missing from tribal: **13,228**
- stale: 10
- **coverage: 69.2%** (artifact: `state/shared/.wiki-tribal-cross-ref-audit.json`)

**Why the final 31% is GATED on Qdrant (hard math, R12 -- NOT a "just run the batch" task):** the JSON index is 534MB / 29,723 entries = ~18KB/entry. The remaining 13,228 x 18KB = +238MB -> index ~772MB. The per-prompt `tribal-rerank` (PSN leg #5, every UserPromptSubmit x 26 slots) materializes the ENTIRE index into JS heap; at the current 534MB it works (verified live: 8GB heap, 2.8s, 3 hits) but at ~772MB the materialized graph (~10-12GB) EXCEEDS the fixed 8GB rerank ceiling (`DEFAULT_RERANK_HEAP_MB=8192` in `scripts/lib/tribal-rerank-spawn.mjs`) -> leg #5 OOMs -> tribal injection DARK fleet-wide. So embedding the final 31% into the JSON is a self-inflicted regression. This is exactly the scaling wall the 2026-06-09 architectural direction named: **the tribal brain belongs in Qdrant (queried per-prompt, no full materialize), NOT a JSON file parsed per-prompt.**

**WRITE side is NOT the blocker** (that was solved: papa's `write-tribal-index.mjs` auto-shards >480MiB, [[reference_tribal_index_v8_string_cap_2026_06_08]]). The blocker is the READ/rerank per-prompt full-materialize heap ceiling. Sharding fixes the write-cap but NOT the rerank heap (it still concats all shards into one in-heap array).

**Next unit (substantial, NOT turn-tail; alpha/papa BRAIN-ACCEL domain):** migrate the tribal brain to a Qdrant collection -- embed the 13,228 (and ideally re-home the 29,723) into Qdrant; point `tribal-rerank` at a Qdrant top-K query instead of in-heap cosine over the JSON. Then coverage can reach 100% without the per-prompt heap wall, and leg #5 scales. Until then: do NOT run JSON embed batches that push the index past ~600MB (leaves rerank-heap margin). Qdrant is already up (prism_engines/skills/formulas collections exist).

**FULL BLOCKER CHAIN (drilled to root 2026-06-10, R12 -- each layer VERIFIED not assumed):**
1. Coverage 69.2%; final 31% (13,228) can't grow the JSON index (would push 534MB->~772MB -> exceeds the fixed 8GB per-prompt rerank heap -> PSN leg #5 dark).
2. => needs the Qdrant migration (recorded direction).
3. Qdrant is NOT provisioned: `docker ps -a --filter name=qdrant` = empty (no container, running or stopped). Storage volume INTACT at `data/docker-volumes/qdrant/collections/{prism_engines,prism_formulas,prism_skills}` (`.qdrant_fs_check` mtime Jun 9 08:35) -> Qdrant ran until ~Jun 9, container removed (likely Jun 9-10 commit-pressure relief), data survived. Compose-defined: `docker-compose.yml` svc `qdrant` (prism-qdrant, qdrant/qdrant:v1.17.0, 6333/6334, that volume); intel variant `prism/qdrant:v1.17.0-intel` (NOT built) + nomic-embed-text preload in `docker-compose.intel.yml`.
4. **ROOT BLOCKER: `docker compose up -d qdrant` FAILS** -- "failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine" = **Docker Desktop's Linux engine is DOWN.** Upstream image also not cached (needs pull once engine is up).
5. **Docker daemon restart is OPERATOR-ONLY** (fleet-reaper doctrine: "Docker daemon NEVER auto-restart"). So the vault coverage-raise is blocked on an operator starting Docker Desktop -- NOT an autonomous code task.

**OPERATOR ACTION to unblock clause-2 vault self-improvement past 69.2%:** (a) start Docker Desktop (Linux engine); (b) `cd H:/prism && docker compose up -d qdrant` (pulls v1.17.0, restores the 3 collections from intact storage); (c) THEN the substantial build: embed the 13,228 missing wiki + re-home the 29,723 into a Qdrant tribal collection (pattern: `scripts/populate-tribal-vault.mjs` uses `prism_memory:remember` kind="tip"), and repoint `tribal-rerank.mjs` from in-heap cosine to a Qdrant top-K query. Until Docker is up, the 534MB JSON index is the load-bearing tribal substrate (leg #5 verified live: 8GB heap, 2.8s) and must NOT be grown past ~600MB.

**Lesson:** verify the real metric before acting on a banner (40.1% banner vs 69.2% real); a coverage-raise can be architecturally contraindicated even when "writes are supported" (bottleneck moved write-cap -> per-prompt read-heap); and `(docker info ...) -or 'string'` in PowerShell is a USELESS liveness probe (`-or <non-empty-string>` is always True) -- use the actual compose/API error as authoritative. The recorded "Qdrant is up" assumption ([[reference_tribal_index_v8_string_cap_2026_06_08]] line 22) was STALE -- Qdrant's Docker engine is down. [[feedback_mathematical_exhaustive_completeness]] · [[feedback_net_benefit_auto_build]].
