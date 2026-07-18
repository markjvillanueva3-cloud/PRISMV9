# OLLAMA-OFFLOAD/U-YT-NIGHT-STAGE — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-YT-NIGHT-STAGE+U-YT-PROMOTE (slot:zulu): YouTube tribal extraction joins the night lane -- staging-only wrapper + attended promotion (operator 3rd re-ask: wiki/tribal extraction from youtube)

**Commit:** `49a6d1cb809d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T13:10:26-05:00
**Tags:** ollama-offload, u-yt-night-stage, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-YT-NIGHT-STAGE+U-YT-PROMOTE (slot:zulu): YouTube tribal extraction joins the night lane -- staging-only wrapper + attended promotion (operator 3rd re-ask: wiki/tribal extraction from youtube)

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-YT-NIGHT-STAGE+U-YT-PROMOTE (slot:zulu): YouTube tribal extraction joins the night lane -- staging-only wrapper + attended promotion (operator 3rd re-ask: wiki/tribal extraction from youtube)

youtube-free-extract was HARD-REJECTED from the night lane (wf_eaeb1510)
for in-process tribal ingest (clobber class 8bf1873577). This FIXES the
named defect instead of re-adding the rejected job:

- scripts/youtube-night-extract.mjs: queue-driven night wrapper that
  FORCES --no-ingest --no-wiki (staging-only invariant pinned by a source
  test) -- tips land only in state/shared/youtube-extraction/<id>.json.
  Weekly OK-run rotation (failed queries retry nightly), per-query
  fail-soft + durable JSONL forensics, flag-injection-proof queue
  validation, 3x13min cap < 45min job timeout by construction.
- scripts/promote-youtube-staged.mjs: the ATTENDED other half -- dry-run
  default, --apply promotes through TribalKnowledgeEngine U-TK01 dedup
  ingest + per-video wiki entries (REUSES the exported ingestTips/
  writeWikiEntry -- one contract, two invocation times). Ledger marks a
  video promoted ONLY after successful ingest (crash-safe resume).
- night-queue.json (git add -f: versioned config in the gitignored data
  dir) seeded with 8 closed-loop domain queries (mill/lathe/wedm/cam/cad/
  speed-feed/post-processor/blueprint-vision -- the operator's
  delta/kilo/oscar/echo/mike/foxtrot/whiskey/xray set).
- Registry: +youtube-night-extract (45min) +auto-research-weekly-digest
  (idempotent, exit-0-on-empty live-verified); note amended (defect FIXED).

VALIDATED LIVE: promotion dry-run found the real backlog -- 556 staged
artifacts, 24 promotable (~230 machining tips incl a TODAY 12:59 artifact
whose in-process engine ingest already fell back to JSON -- proof the
staged+attended split is the correct architecture). Night wrapper dry-run
rotates mill/lathe/wedm first. 17/17 new tests + 12/12 night-batch suite
(live registry re-validated, 11 jobs, worst-case 6.4h < 7h task limit).
R12: per-file 2-arm scrutiny is quota-deferred to the 16:12 cron (subagent
limit resets 15:50) -- lands ~6h before the lane first fires at 22:23.
Victor (pipeline owner) notified on the chat bus to curate queries +
run the promotion.
```

## Files touched (7)
- scripts/promote-youtube-staged.mjs               | 164 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/promote-youtube-staged.test.mjs          | 122 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/youtube-night-extract.mjs                | 188 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/youtube-night-extract.test.mjs           | 121 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/ollama-night-batch-registry.json    |  16 ++++++-
- state/shared/youtube-extraction/night-queue.json |  14 ++++++
- 6 files changed, 624 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 49a6d1cb809d`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._