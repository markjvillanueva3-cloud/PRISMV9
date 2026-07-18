# PDF-TRIBAL-HERMES/U-TRIBAL-EMBED-HEAP-REEXEC — [MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-HEAP-REEXEC (slot:zulu): self-reexec heap bump fixes full-index-load OOM; 1123 tips LIVE in L1 index (74004->75127)

**Commit:** `ccd055c23580` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T21:17:26-05:00
**Tags:** pdf-tribal-hermes, u-tribal-embed-heap-reexec, auto-distilled

## Subject
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-HEAP-REEXEC (slot:zulu): self-reexec heap bump fixes full-index-load OOM; 1123 tips LIVE in L1 index (74004->75127)

## Body
```
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-HEAP-REEXEC (slot:zulu): self-reexec heap bump fixes full-index-load OOM; 1123 tips LIVE in L1 index (74004->75127)

First run OOMed mid-flush (FATAL heap limit) -- readTribalIndexGuarded loads the
whole ~1.18GB sharded index (74K x 768-dim) into the default ~2GB old-space. Index
was NOT clobbered (atomic tmp+rename + manifest-aware clobber-guard left the prior
index intact). Fix: shouldReexecForHeap() re-execs once with
--max-old-space-size=12288 (env-breaker PRISM_TRIBAL_EMBED_REEXEC=1; skips if a
heap flag is already present) -- mirrors nn-graph-retrain-lifecycle. Every launch
path (ad-hoc/cron/wrapper) now safe.

VALIDATED LIVE: embedded=1123 skipped=0 failed=0, index 74004->75127 (+1123 exact);
rerank query 'shrink fit tool holder balance' -> tip:tk-yt--4AmEAUQi3I-001 @ cosine
0.87. Tips now surface via tribal-by-domain-inject->tribal-rerank every prompt + RAG.
11/11 tests (+shouldReexecForHeap). Wiki lesson for the 3 pitfalls.
```

## Files touched (4)
- knowledge/wiki/lessons/tribal-embed-index-ingest-pitfalls.md | 30 ++++++++++++++++++++++++++++++
- scripts/embed-pdf-tribal-tips-into-index.mjs                 | 25 +++++++++++++++++++++++++
- scripts/embed-pdf-tribal-tips-into-index.test.mjs            |  8 ++++++++
- 3 files changed, 63 insertions(+)

## Lessons surfaced in commit body
- lesson for the 3 pitfalls.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ccd055c23580`
- Milestone envelope: `mcp-server/data/milestones/PDF-TRIBAL-HERMES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._