# CAD-LEARNING-AI/U-WEB-SOURCE-CURATE — [MAIN-FORCE] [CAD-LEARNING-AI]/U-WEB-SOURCE-CURATE (slot:india): expand the web /learn watchlist to 33 LIVE-validated reputable sources

**Commit:** `db58fa2886fa` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:51:45-05:00
**Tags:** cad-learning-ai, u-web-source-curate, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-WEB-SOURCE-CURATE (slot:india): expand the web /learn watchlist to 33 LIVE-validated reputable sources

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-WEB-SOURCE-CURATE (slot:india): expand the web /learn watchlist to 33 LIVE-validated reputable sources

The web lane shipped with 4 SEED sources, 3 of which were 404/JS-rendered (only machiningdoctor yielded tips). This curates a real productive watchlist: proposed ~36 reputable static-content machining/CAD/GD&T/CAM sources (Wikipedia-heavy -- static, content-rich, reputable, node-fetchable -- plus established references), then LIVE-VALIDATED every one THROUGH the real drain fetch+strip pipeline (node fetch, no JS). 32/36 passed (>=1500 chars static technical content + >=4 machining-term hits); 4 rejected (404/429). Final watchlist = 33 sources (32 validated + the 1 working original machiningdoctor-cutting-speed); dropped the 3 broken seeds (cnccookbook/helical/sandvik -- JS-rendered/404). Balanced across mill/lathe/cad/cam/speed-feed/blueprint-vision/wedm/post-processor.

Insight (R12, validated with numbers): Wikipedia is the goldmine for this lane -- 30/32 Wikipedia machining/CAD/GD&T articles serve content-rich server-rendered HTML that a plain node fetch harvests cleanly, vs JS-SPA reference sites that return only a nav shell. Curate toward static-content sources, not JS-heavy modern blogs. Fanout-gate blocked the curation Workflow (static opus-tier projection ignored my per-agent model:sonnet); did the validation directly via Bash (deterministic -- the real fetch decides, no agent hallucination). Harvest of all 33 (Ollama tip-gen -> stage -> the armed promote cron) is running; promote round-trip already proven on machiningdoctor (8 tips landed).
```

## Files touched (2)
- state/shared/web-source-extraction/web-source-queue.json | 270 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----
- 1 file changed, 265 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show db58fa2886fa`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._