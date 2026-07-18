# BACKEND-DEV-LOOP/U-REAPER-COORD-NOISE — [MAIN] [BACKEND-DEV-LOOP]/U-REAPER-COORD-NOISE: separate fleet-reaper infra mutations from real Ollama-routing suggests in the dashboard

**Commit:** `b041693181e5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:41:42-05:00
**Tags:** backend-dev-loop, u-reaper-coord-noise, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-REAPER-COORD-NOISE: separate fleet-reaper infra mutations from real Ollama-routing suggests in the dashboard

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-REAPER-COORD-NOISE: separate fleet-reaper infra mutations from real Ollama-routing suggests in the dashboard

The fleet-reaper-coordinator hook in scripts/fleet-reaper-sweep.mjs
emits `recordEvent({decision: "suggest"})` on every 5-min cron sweep
when it (a) prewarms an Ollama model on GPU or (b) writes a routing
hint. Those events record INFRASTRUCTURE MUTATIONS — they are NOT
Ollama-offload routing recommendations. The dashboard was bucketing
them all under "silent suggestions", inflating the suggest count and
making the offloader look broken (859 fires / 24h, 100% suggest-only).

Fix mirrors the proven CORRECT_KEEP_CATEGORIES pattern from
U-OE-DASH-KEEP-BREAKDOWN (charlie iter-2):

- New `INFRA_SUGGEST_CATEGORIES` set: fleet-reaper-prewarm + fleet-reaper-hint
- summarize() now bins suggestByCategory + tracks infraSuggestCount vs
  routingSuggestCount (parallel to correctKeepCount vs unclassifiedKeepCount)
- Exported `infraSuggestCategorySet()` (parallel to correctKeepCategorySet())
- printHuman() suggest line now shows `(N infra mutations, M routing
  recommendations)`; new "Suggest breakdown by category" section tags
  infra rows with `⚙ infra-mutation (not routing)`
- R12 honesty: missing/empty category bins as `unknown` AND counts as
  routing — never silently absorbed into infra (a data-quality issue
  surfacing as a growing routing-unknown pool is the right loud failure)

Live-verified post-fix on the actual 24h ledger:
  suggests: 390  (265 infra mutations, 125 routing recommendations)
The 125 real routing suggests were previously invisible inside 858 of
infra-noise. Operators can now see signal.

6 new node:test cases (21 total in dashboard suite, all PASS):
- infraSuggestCategorySet exports + mutation-isolation
- classifier puts fleet-reaper-* in infra, summary/explanation in routing
- suggestBreakdown bins by category (3 + 1 + 2 mix oracle)
- no-category suggest bins as 'unknown' + counts as routing (R12 R12)
- zero suggests → both counters 0 + empty breakdown
- drift-guard regex-scans fleet-reaper-sweep.mjs for every coordinator
  suggest-emit category → fails if a new one slips past
- companion test pins both expected categories present in producer source

Per-file scrutiny: code-analyzer (Arm A) PASS, 0 P0/P1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../__tests__/ollama-offload-dashboard.test.mjs    | 127 +++++++++++++++++++++
- scripts/ollama-offload-dashboard.mjs               |  50 +++++++-
- 2 files changed, 176 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b041693181e5`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._