# HERMES-UTIL/U-OFFLOAD-SOURCE-SPLIT — [MAIN-FORCE] [HERMES-UTIL]/U-OFFLOAD-SOURCE-SPLIT (slot:zulu): make hermes/ollama utilization VISIBLE in the offload dashboard. The per-hook table showed only fired/offload/keep -- hiding bySource, so 'is the remote lane actually USED or always degrading to fallback?' was unanswerable. Add pure formatSourceSplit(bySource) + wire into the render. LIVE PROOF: ask-hermes now renders [hermes=853 ollama-fallback=2 fail=1] = hermes 99.6% effectively utilized (real answers, not degrade). +5 R9 tests (ordering/adversarial/empty), 28/28. Directly serves 'utilize ollama+hermes effectively'.

**Commit:** `a04efc7695da` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T11:34:05-05:00
**Tags:** hermes-util, u-offload-source-split, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-OFFLOAD-SOURCE-SPLIT (slot:zulu): make hermes/ollama utilization VISIBLE in the offload dashboard. The per-hook table showed only fired/offload/keep -- hiding bySource, so 'is the remote lane actually USED or always degrading to fallback?' was unanswerable. Add pure formatSourceSplit(bySource) + wire into the render. LIVE PROOF: ask-hermes now renders [hermes=853 ollama-fallback=2 fail=1] = hermes 99.6% effectively utilized (real answers, not degrade). +5 R9 tests (ordering/adversarial/empty), 28/28. Directly serves 'utilize ollama+hermes effectively'.

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-OFFLOAD-SOURCE-SPLIT (slot:zulu): make hermes/ollama utilization VISIBLE in the offload dashboard. The per-hook table showed only fired/offload/keep -- hiding bySource, so 'is the remote lane actually USED or always degrading to fallback?' was unanswerable. Add pure formatSourceSplit(bySource) + wire into the render. LIVE PROOF: ask-hermes now renders [hermes=853 ollama-fallback=2 fail=1] = hermes 99.6% effectively utilized (real answers, not degrade). +5 R9 tests (ordering/adversarial/empty), 28/28. Directly serves 'utilize ollama+hermes effectively'.
```

## Files touched (3)
- scripts/__tests__/ollama-offload-dashboard.test.mjs | 30 ++++++++++++++++++++++++++++++
- scripts/ollama-offload-dashboard.mjs                | 21 ++++++++++++++++++++-
- 2 files changed, 50 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- TIL]/U-OFFLOAD-SOURCE-SPLIT (slot:zulu): make hermes/ollama utilization VISIBLE in the offload dashboard. The per-hook table showed only fired/offload/keep -- hiding bySource, so 'is the remote lane actually USED or always degrading to fallback?' was unanswerable. Add pure formatSourceSplit(bySource) + wire into the render. LIVE PROOF: ask-hermes now renders [hermes=853 ollama-fallback=2 fail=1] = he
- tilized (real answers, not degrade). +5 R9 tests (ordering/adversarial/empty), 28/28. Directly serves 'utilize ollama+hermes effectively'.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a04efc7695da`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._