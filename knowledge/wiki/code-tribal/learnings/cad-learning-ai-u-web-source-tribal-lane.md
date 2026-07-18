# CAD-LEARNING-AI/U-WEB-SOURCE-TRIBAL-LANE — [MAIN-FORCE] [CAD-LEARNING-AI]/U-WEB-SOURCE-TRIBAL-LANE (slot:india): the non-video web half of the /learn pipeline (online sources -> tribal)

**Commit:** `4bea1df390b6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:20:12-05:00
**Tags:** cad-learning-ai, u-web-source-tribal-lane, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-WEB-SOURCE-TRIBAL-LANE (slot:india): the non-video web half of the /learn pipeline (online sources -> tribal)

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-WEB-SOURCE-TRIBAL-LANE (slot:india): the non-video web half of the /learn pipeline (online sources -> tribal)

Operator: "include videos AND OTHER REPUTABLE SOURCES FROM ONLINE ... only add NEW knowledge." The video half (youtube-night-extract) was already live + I closed its promote loop earlier this session; this builds the NON-VIDEO web-article half. R8: confirmed no existing tool fits (cited-tip-fetch queries, auto-research digests proposals, zulu-brain-web is an outbound server).

Architecture mirrors the proven youtube lane (reuse, R15 build-once): curated web-source-queue.json -> fetch URL -> stripHtmlToText -> REUSE youtube-free-extract's source-agnostic extractTipsFromTranscript (machining tip-gen over ANY text) -> writeExtractionArtifact into the SHARED youtube-extraction staging dir with meta.videoId="web-<hash>". STAGING-ONLY (clobber-safe); the already-armed PRISM Tribal Promotion Cron (promote-youtube-staged --apply) then promotes web-<hash> artifacts via U-TK01 dedup with ZERO new promote wiring. Safety: fetched HTML is DATA fed to Ollama, never instructions. Per-source fail-soft + 7d cooldown + run-lock; $0 Claude (local Ollama).

R13 LIVE VALIDATED: machiningdoctor cutting-speed -> 7 real tribal tips staged ("Use G96 for CSS", "Effective Diameter in Ballnose Milling", "Low Cutting Speeds for Drills", ...); helical 404 + sandvik JS-rendered both handled fail-soft; cnccookbook 0-tips (JS-rendered nav shell) -> NOT staged (0-tip guard). Caught + fixed an integration bug live: extractTipsFromTranscript needs the {segments:[...]} shape not a raw string (added textToTranscript). 10/10 tests (pure helpers + fail-soft fetch + transcript-shape).

KNOWN (watchlist note + queued): 3 of 4 SEED sources are 404/JS-rendered -- the seed list needs live-curation toward static-content sources, or a headless-browser (Playwright) fetch path for JS-rendered pages. The LANE is correct + validated; tip-yield depends on source curation. Arming a scheduled "PRISM Web Source Drain" task is the next step (the promote side is already armed).
```

## Files touched (4)
- scripts/drain-web-sources-tribal.mjs                     | 285 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/drain-web-sources-tribal.test.mjs                | 126 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/web-source-extraction/web-source-queue.json |  10 ++++++++++
- 3 files changed, 421 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4bea1df390b6`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._