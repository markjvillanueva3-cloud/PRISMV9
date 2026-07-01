# OLLAMA-OFFLOAD/U-BRAIN-NIGHT-FLOOR — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-BRAIN-NIGHT-FLOOR (slot:zulu): the entire 2nd-brain maintenance floor joins the night lane (operator: 'accelerate 2nd brain and persistent memory capabilities of the entire fleet')

**Commit:** `5485e1b1c8e3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T14:05:03-05:00
**Tags:** ollama-offload, u-brain-night-floor, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-BRAIN-NIGHT-FLOOR (slot:zulu): the entire 2nd-brain maintenance floor joins the night lane (operator: 'accelerate 2nd brain and persistent memory capabilities of the entire fleet')

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-BRAIN-NIGHT-FLOOR (slot:zulu): the entire 2nd-brain maintenance floor joins the night lane (operator: 'accelerate 2nd brain and persistent memory capabilities of the entire fleet')

ONE registry entry runs the consolidated brain-refresh orchestrator nightly
with --force --with-viz: memory BM25 index -> dense embeddings (nomic) ->
AMP2 galaxy synthesis (gpt-oss) -> wiki->tribal embed -> system-viz regen.
brain-refresh was built (BRAIN-REFRESH-MS0) precisely because these five
pipelines 'silently rot between runs' depending on a human -- the Stop hook
gives them throttled daytime upkeep; this entry guarantees the FULL heavy
floor every night off-hours on the Blackwell box.

COORDINATION STORY (why this is night-safe where the standalone was not):
galaxy-synthesis-refresh stays HARD-REJECTED as its own job (uncoordinated
shared-sidecar rebuild, wf_eaeb1510) -- inside brain-refresh it is O_EXCL
lock-serialized (20m stale-reclaim -> runner kill self-heals), Ollama-
health-gated (deferred=benign exit 3), sequential execFileSync children
(no detached). Same fix-the-named-defect pattern as U-YT-NIGHT-STAGE.

VALIDATED: --dry-run --with-viz plans all 5 steps willRun; live
--force --only mem-index ran ok (1s); night-batch suite re-validates the
14-job lane. Step-budget sum 93min < 95min job timeout; placed before the
shed-tail galaxy miner. Lane worst-case now relies on the between-jobs
window re-check + 7h task ceiling shedding the tail (by design).
```

## Files touched (2)
- state/shared/ollama-night-batch-registry.json | 7 +++++++
- 1 file changed, 7 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5485e1b1c8e3`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._