# HIGH-ROI-HUNT/U-LOCAL-VECTOR-LEG — [MAIN-FORCE] [HIGH-ROI-HUNT]/U-LOCAL-VECTOR-LEG (slot:alpha): splice offline localvector cosine leg into hybrid-retrieval.mjs

**Commit:** `b6d5e16aa262` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T12:10:43-05:00
**Tags:** high-roi-hunt, u-local-vector-leg, auto-distilled

## Subject
[MAIN-FORCE] [HIGH-ROI-HUNT]/U-LOCAL-VECTOR-LEG (slot:alpha): splice offline localvector cosine leg into hybrid-retrieval.mjs

## Body
```
[MAIN-FORCE] [HIGH-ROI-HUNT]/U-LOCAL-VECTOR-LEG (slot:alpha): splice offline localvector cosine leg into hybrid-retrieval.mjs

Cross-cutting fleet infra: the shared hybrid-search retrieval lib (main-tree-only;
consumed by sessionHybridSearchAction + prism-hybrid). Adds defaultLocalVectorSearch
(pure cosine+top-K over int8 _embeddings.jsonl vectors, dequant q*rec.s) + a 5th
RRF leg source:"localvector" + weight + includeLocalVector flag. Pure/import-free
preserved; non-breaking (default-on but inert unless caller injects localVectorSearch).
Applied via scripts/apply-local-vector-leg.mjs (slot/alpha 9a02dde733). Standalone
live-validated on 54,489 vectors (semantically-correct rankings, Qdrant untouched).
INERT in production until a consumer injects a cached reader -> U-LOCAL-VECTOR-LEG-WIRE.
[MAIN-FORCE] per slot-commit-enforce option 3.
```

## Files touched (2)
- scripts/lib/hybrid-retrieval.mjs | 67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 67 insertions(+)

## Lessons surfaced in commit body
- til a consumer injects a cached reader -> U-LOCAL-VECTOR-LEG-WIRE.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b6d5e16aa262`
- Milestone envelope: `mcp-server/data/milestones/HIGH-ROI-HUNT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._