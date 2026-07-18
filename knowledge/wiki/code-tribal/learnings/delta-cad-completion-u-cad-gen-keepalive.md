# DELTA-CAD-COMPLETION/U-CAD-GEN-KEEPALIVE — [MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-KEEPALIVE (slot:delta): keep qwen GPU-resident across gen batch

**Commit:** `903a1ba14226` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T22:58:28-05:00
**Tags:** delta-cad-completion, u-cad-gen-keepalive, auto-distilled

## Subject
[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-KEEPALIVE (slot:delta): keep qwen GPU-resident across gen batch

## Body
```
[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-KEEPALIVE (slot:delta): keep qwen GPU-resident across gen batch

The overnight gen loop's exit-4 'ollama call failed' errors are GPU CONTENTION: each gen call had
NO keep_alive -> qwen2.5-coder:32b fell back to Ollama's 5-min idle default -> evicted by the fleet's
other resident models (NN-retrain/SFC-train/gpt-oss:120b) between calls -> cold-reload -> timeout.
Fix: keep_alive:'15m' (env PRISM_OLLAMA_GEN_KEEP_ALIVE) on the /api/generate body -- the OCR runner's
proven PRISM_OLLAMA_VISION_KEEP_ALIVE=15m approach. Warm model across the batch -> fewer cold-load
timeouts -> higher overnight throughput. Pairs with shouldCursor retry (d2bd9bb717): contention-failed
specs already retry next cron run; this reduces the failures at the source. Behavior-neutral on the
success path. Verify across tonight's cron drains (f5c06b63 / 4d82ef66).
```

## Files touched (2)
- scripts/cad-text-to-cadquery.mjs | 6 +++++-
- 1 file changed, 5 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 903a1ba14226`
- Milestone envelope: `mcp-server/data/milestones/DELTA-CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._