# PDF-TRIBAL-HERMES/U-TRIBAL-EMBED-HEAP-28G — [MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-HEAP-28G (slot:zulu): bump embed heap 12->28GB -- index grew past the 12GB load ceiling

**Commit:** `99b58f3bb534` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T02:13:51-05:00
**Tags:** pdf-tribal-hermes, u-tribal-embed-heap-28g, auto-distilled

## Subject
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-HEAP-28G (slot:zulu): bump embed heap 12->28GB -- index grew past the 12GB load ceiling

## Body
```
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-HEAP-28G (slot:zulu): bump embed heap 12->28GB -- index grew past the 12GB load ceiling

LIVE: at 88850 entries (~1.4GB) the embed hit 'Array buffer allocation failed'
loading the sharded index (worsened by a concurrent manual+task load). The guarded
reader REFUSED to clobber the brain (fail-loud worked, index intact). Host has
136GB RAM; 28GB gives headroom as the overnight drain grows the index. Pair: keep
ONE embedder (the scheduled task) -- no competing manual catch-ups.
```

## Files touched (2)
- scripts/embed-pdf-tribal-tips-into-index.mjs | 10 ++++++----
- 1 file changed, 6 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 99b58f3bb534`
- Milestone envelope: `mcp-server/data/milestones/PDF-TRIBAL-HERMES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._