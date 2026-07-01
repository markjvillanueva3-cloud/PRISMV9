---
name: feedback_juliett_readback_smoke_test
description: Standing rule — a persistence write is not "done" until a query-side read-back confirms it landed
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.431Z
aliases: feedback_juliett_readback_smoke_test
---


**Standing rule (juliett / database-expansion):** a persistence write is **not complete until a query-side read-back confirms it landed correctly.** Write-side success (`writeFileSync returned`, `upsert 200`) is necessary but not sufficient — verify the read path returns the data.

**Why — the 0%-recall class:** `memory-relevance-inject` shipped fleet-wide on 2026-05-15 with 0% recall — writes were happening, but the QUERY side returned nothing, and nobody noticed because only the write side was tested. A persistence layer with a healthy write and a broken read is invisible-broken: it looks fine from the writer's seat and is useless from the reader's. This is the most expensive silent regression in the domain.

**How to apply:**
- After any new store/collection/index write path ships, write a read-back test: write a known record, query it back, assert it's there (intent, not just `toBeDefined()`).
- For embeddings/vectors: upsert a probe vector, search for it, assert it's the top hit.
- A migration is verified by reading an N-1 file through the new reader, not just by the bump compiling.
- Pairs with [[feedback_juliett_atomic_write_discipline]] and [[feedback_juliett_schema_probe_before_read]] — the full write→read→version loop.
