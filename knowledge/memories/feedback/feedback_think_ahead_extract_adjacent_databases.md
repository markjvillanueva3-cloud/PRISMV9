---
name: feedback_think_ahead_extract_adjacent_databases
description: When asked to extract/ingest a database or deep-research a section, proactively assume the operator wants the ADJACENT datasets too — go above-and-beyond OR ask first. Applies to ALL sources, not just the monolith.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.447Z
aliases: feedback_think_ahead_extract_adjacent_databases
---


**Think ahead — extract the whole neighborhood, don't stop at the literal ask (operator directive 2026-05-29).**

When the operator asks to extract/ingest a database, do deep research on a section, or build a reader for ONE data category, **automatically assume they probably want the adjacent/related datasets too** — and either go above-and-beyond and do them, OR explicitly ask "should I also grab X, Y, Z?" *before* declaring done.

Concrete trigger example that prompted this: operator asked for tool **holders**; the right instinct was to also surface **tooling, inserts, fixtures, materials, machines, coolants/lubricants** — every database category that lived in the same source. I extracted only what was literally named and undercounted; the operator had to come back twice.

**The adjacency set for manufacturing data** (when one is asked for, consider all): tooling · inserts · tool holders · fixtures/workholding · raw materials/stock · machines/spindles · coolants & lubricants · gages/metrology · abrasives · fasteners/hardware · post/controller data. Plus whatever else co-resides in the source.

**Why:** the operator thinks in terms of complete capability, not single files. A half-extracted source means they re-ask, I re-load context, and the DB stays fragmented. Going broad (or asking once, up front) is strictly cheaper than N round-trips. This is R7/R8 + Karpathy goal-driven: serve the *goal* (a complete database), not the literal sentence.

**How to apply:**
1. On any extract/ingest/deep-research request, FIRST inventory the source(s) for ALL co-resident data categories (one grep/Glob pass), not just the named one.
2. Present the full category list found, then either proceed to extract all of them, or ask "want all of these or a subset?" — never silently do only the one named.
3. Applies to **every source**, not just the monolith: `mcp-server/src/data/` catalogs, the DocuStrata corpus, vendor PDFs, profile/config files, etc.
4. Keep sources separate + cross-referenced (operator's standing preference, [[reference_juliett_tooling_stock_handoff_to_hotel_2026_05_29]]).

Related: [[feedback_enumerate_before_read]] (Glob the whole tree + report count before Read) · [[feedback_mathematical_exhaustive_completeness]] · [[feedback_always_close_out]].
