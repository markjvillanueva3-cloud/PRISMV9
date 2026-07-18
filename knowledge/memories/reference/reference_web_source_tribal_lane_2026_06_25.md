---
name: reference_web_source_tribal_lane_2026_06_25
description: "Built the non-video web->tribal /learn lane (slot:india 2026-06-25) + the R15 lesson that caught a P0: validate THROUGH the consumer, not just the producer. Sibling of the video lane."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.253Z
aliases: reference_web_source_tribal_lane_2026_06_25
---


# Web-source /learn lane + the "validate through the consumer" lesson (2026-06-25, slot:india)

Operator: "/learn pipeline ... include videos AND OTHER REPUTABLE SOURCES FROM ONLINE ... only add
NEW knowledge." The video half was done; this is the NON-VIDEO web-article half.
Sibling of [[reference_yt_tribal_promote_loop_closed_2026_06_25]].

## What shipped (commits on cad-fusion-live-ms0, [CAD-LEARNING-AI])
- **U-WEB-SOURCE-TRIBAL-LANE** (`4bea1df390`): `scripts/drain-web-sources-tribal.mjs` + tests +
  `state/shared/web-source-extraction/web-source-queue.json`. Mirrors the proven youtube lane (R8 reuse):
  curated queue -> `fetchUrlText` -> `stripHtmlToText` -> `textToTranscript` (-> the {segments:[...]} shape) ->
  REUSE youtube-free-extract's source-agnostic `extractTipsFromTranscript` (Ollama tip-gen) ->
  `writeExtractionArtifact` into the SHARED `state/shared/youtube-extraction/` dir with `meta.videoId="web-<hash>"`.
  STAGING-ONLY; the already-armed PRISM Tribal Promotion Cron (`promote-youtube-staged --apply`) promotes
  web-<hash> artifacts via U-TK01 dedup -- zero new promote wiring. Fail-soft per-source + 7d cooldown +
  run-lock; fetched HTML is DATA fed to Ollama, never instructions (instruction-source-boundary).
- **U-WEB-SOURCE-PROMOTE-FIX** (`df7a4c4d26`): the scrutiny-caught P0 (below).

## THE P0 + THE LESSON (R15: validate THROUGH the consumer, not just the producer)
First pass staged RAW `extractTipsFromTranscript` output `{title,body,category,tags,confidence(0-1),timestamp_hint}`.
But the promote cron's `TribalKnowledgeEngine.ingest()` -> `inferDomain` does `tip.source.toLowerCase()`
UNCONDITIONALLY -> a web tip (no `source` field) THROWS "Cannot read properties of undefined (reading
'toLowerCase')" -> the web artifact fails to promote on EVERY cron run forever -> the web half would deliver
**0 tips**. The youtube lane it mirrors stages `tipsToKnowledgeTips(...)` (FULL KnowledgeTip records) -- the
web lane skipped that normalization step.

**Why it slipped:** my live validation proved STAGING (8 tips written to the artifact) but NEVER the PROMOTE
round-trip through `ingest()`. That is the exact R15 mandate I violated: "round-trip THROUGH the dispatcher/
CONSUMER, not just the singleton/producer." A producer that writes the wrong SHAPE looks perfect in isolation;
the bug only fires at the consumer. **A 2-of-3 scrutiny pair caught it** (both arms FAIL, P0) -- which is why
the gate exists.

**Fix:** pure `tipsToWebKnowledgeTips(parsed, meta)` -- same KnowledgeTip shape as `tipsToKnowledgeTips`
(unique id `tk-web-<hash>-NNN`, string `source`, `created_at`, 0-100 int confidence, provenance) but
WEB-accurate labels (`source: "web:<site> (<url>)"`, tags web-learned/web-source/<domain>) -- NOT youtube
labels (don't mislabel a web article as a video; `inferDomain` keys on `video:`/`video-learned`). Unique
per-tip ids also fix a SECONDARY id-collision (ingest dedups on `tip.id` BEFORE content-hash, so a constant/
undefined id drops all-but-the-first).

**R15 re-validated THROUGH the consumer:** machiningdoctor -> 8 normalized tips -> `promote-youtube-staged
--apply` -> `promoted=1 tipsIngested=8 failed=0` (NO throw), captured store 1474->1482, all 8
`tk-web-f1313215481e-NNN` ids landed in `mcp-server/state/tribal_captured_tips.json`. PROVEN, not "looks fine".

## Status + OPEN (next session)
- LANE works end-to-end (8 real machining tips from machiningdoctor: "Use G96 CSS", "Effective Diameter in
  Ballnose Milling", "Low Cutting Speeds for Drills"...). 11/11 tests.
- **Watchlist CURATED to 33 live-validated sources** (U-WEB-SOURCE-CURATE `db58fa2886`): proposed ~36
  reputable static sources, LIVE-validated every one THROUGH the real drain fetch+strip pipeline -> 32/36
  passed (>=1500 chars + >=4 machining-term hits); final = 32 validated + machiningdoctor; dropped the 3
  broken JS/404 seeds. **Wikipedia is the goldmine** (30/32 Wikipedia machining/CAD/GD&T articles serve
  content-rich server-rendered HTML a plain node fetch harvests; JS-SPA sites return only a nav shell).
  Harvested 16/33 -> **promote landed 157 NEW web tribal tips** (captured store 1482->1639, promoted=15
  tipsIngested=157 failed=0 -- P0 fix holds AT SCALE; 165 tk-web-* tips total in the store). The harvest
  was fleet-reaper-killed at ~12 min (it kills >10min runs) -> 17 sources still due; re-harvest in shorter
  batches (--max-sources 6-8) or arm the drain task with a small per-run cap. Stale lock (dead pid) cleared.
- **Fanout-gate vs Workflow:** the curation Workflow was hard-blocked (static opus-tier projection ignores
  per-agent model:sonnet; --force-fanout in meta didn't override). Did the validation directly via Bash --
  deterministic (the real fetch decides, no agent hallucination) + more reliable than agent-in-the-loop.
- **Remaining:** add a headless-browser (Playwright) node fetch path for JS-rendered high-value sites
  (gated: adds a `playwright` dependency -- ask operator). Add more Wikipedia + static CAD/Fusion/Mastercam pages.
- **Arm the fetch drain:** a "PRISM Web Source Drain" scheduled task (mirror install-resources-tribal-drain-task.ps1)
  to make the fetch autonomous (the PROMOTE side is already armed). Deferred until sources are curated (3/4 fail now).
- **P2 (reviewer):** the helper-contract test doesn't pin the `main()` staging call site -- a revert to raw
  `ex.tips` would still pass it (the seam is live-validated manually). Harden with a `buildStagedRecord` extraction + test.

## Lesson (generalizable, fleet-wide)
**Validate a producer THROUGH its consumer.** A staged/emitted artifact that is the wrong SHAPE looks correct
in isolation -- run it through the real consumer (ingest/dispatcher/promote) with numbers before claiming done.
The video lane's promote-shape (`tipsToKnowledgeTips`) is the contract; any new producer feeding the same
consumer must match it. -> [[feedback_wire_test_validate_all_galaxies]] (the TEST + VALIDATE arms).
