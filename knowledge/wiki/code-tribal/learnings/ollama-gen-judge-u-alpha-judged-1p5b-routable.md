# OLLAMA-GEN-JUDGE/U-ALPHA-JUDGED-1P5B-ROUTABLE — [MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGED-1P5B-ROUTABLE (slot:alpha): 1.5b judged n=3 confirms the ROUTABLE result -- cheapest model suffices for easy/medium generative under the LLM-judge

**Commit:** `179865164e17` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T18:58:06-05:00
**Tags:** ollama-gen-judge, u-alpha-judged-1p5b-routable, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGED-1P5B-ROUTABLE (slot:alpha): 1.5b judged n=3 confirms the ROUTABLE result -- cheapest model suffices for easy/medium generative under the LLM-judge

## Body
```
[MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGED-1P5B-ROUTABLE (slot:alpha): 1.5b judged n=3 confirms the ROUTABLE result -- cheapest model suffices for easy/medium generative under the LLM-judge

Per-model invocation (reaper-safe ~3min) of the 1.5b judged sweep. Result under the SEMANTIC LLM-judge
(the trustworthy metric, not keyword): 1.5b = 100% on ALL easy+medium summarize AND explain;
summarize-hard 0%, explain-hard 67%.

BOTTOM LINE (judge-validated, routable): route EASY+MEDIUM generative offloads to the CHEAPEST warm
model. The architecture memory's blanket "cheap models are below the offload bar" gate is DISPROVEN for
easy/medium generative -- exactly the difficulty-stratified + generative-quality data it said would
unblock the cheapest-warm executor reorder. HARD generative needs >=14b. Caveat: the executor cannot
classify request difficulty at runtime, so safe routing = cheapest-warm-for-mode with a hard-tier guard.

Combined judged ladder so far: 1.5b (easy/med 100%, hard weak) + 14b (easy + all-explain 100%, hard
summarize mixed). 7b/32b = same per-model pattern. Doc: state/shared/ollama-generative-stratified-2026-06-25.md.
```

## Files touched (2)
- state/shared/ollama-generative-stratified-2026-06-25.md | 18 +++++++++++++++++-
- 1 file changed, 17 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 179865164e17`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-GEN-JUDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._