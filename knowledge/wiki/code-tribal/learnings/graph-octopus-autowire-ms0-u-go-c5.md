# GRAPH-OCTOPUS-AUTOWIRE-MS0/U-GO-C5 — [MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-C5 (slot:echo): octopus 5-voice setup CLI — operator credential checklist

**Commit:** `28dc01262c20` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T15:30:15-05:00
**Tags:** graph-octopus-autowire-ms0, u-go-c5, auto-distilled

## Subject
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-C5 (slot:echo): octopus 5-voice setup CLI — operator credential checklist

## Body
```
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-C5 (slot:echo): octopus 5-voice setup CLI — operator credential checklist

scripts/octopus-setup.mjs — operator-callable CLI that probes the 5 octopus
voices (anthropic / codex / ollama / xai / google) and prints a per-voice
remediation checklist with the exact next-step command for any missing or
unauthenticated voice. Exit 0 if ≥3 voices ready (real cross-vendor
consensus possible), 1 otherwise — usable in CI gating. Supports --json
for machine consumption.

Pure decideVoiceStatus + summarizeFleet + renderChecklist testable cores
(19 unit cases covering every status × remediation combo + boundary tests).
Plus 2 subprocess E2E with forced-blank XAI/GEMINI env for host-hermetic
assertions on those two voices. 21/21 green.

Live smoke on this PC: 3/5 READY (anthropic + ollama-8models + google) —
real consensus possible NOW; missing: codex auth + XAI_API_KEY.

Track C investigation reframed C6: the stub engines THROW but each call
site fails OPEN — octopus is graceful-degraded, not dead. The '3 tsc
errors in MultiModelConsensusEngine.ts' premise is stale (tsc clean for
that file today). 2-of-2 scrutiny PASS, 0 P0/P1.
```

## Files touched (4)
- .../milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json     |  11 +-
- scripts/octopus-setup.mjs                          | 224 +++++++++++++++++++++
- scripts/octopus-setup.test.mjs                     | 200 ++++++++++++++++++
- 3 files changed, 432 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 28dc01262c20`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._