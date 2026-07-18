# OLLAMA-OFFLOAD/U-LARGE-READ-DECAY-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-LARGE-READ-DECAY-WIRE (slot:sierra): wire advisory-decay into large-read-digest-advisory so a proven-noise offload nudge stops flooding context

**Commit:** `05906647ad84` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T11:26:00-05:00
**Tags:** ollama-offload, u-large-read-decay-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-LARGE-READ-DECAY-WIRE (slot:sierra): wire advisory-decay into large-read-digest-advisory so a proven-noise offload nudge stops flooding context

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-LARGE-READ-DECAY-WIRE (slot:sierra): wire advisory-decay into large-read-digest-advisory so a proven-noise offload nudge stops flooding context

The hook's own header has promised since ship that advisory-decay 'can suppress it if it never converts' -- but main() NEVER consulted decayDecision (only a comment named it). Live offload-stats: byHook.large-read-digest-advisory = 122 suggested / 0 offloaded = 0% conversion, yet it fired 100% of the time = pure context noise (the OPPOSITE of the /goal's 'utilize ollama' intent -- crying wolf buries real offload signal). Root: the offload ratio is 10.7% (57 offloaded / 476 kept) precisely because advisory-suggest-then-ignored dominates; only ollama-task-offloader (deterministic, 53% take) actually converts.

Fix (R15 clone of the wired ollama-route-pretooluse pattern): after bumpStats() (so the probe counter advances + read==write on STATS_PATH), call decayDecision(HOOK_KEY,{statsPath}); if !fire, suppress the nudge (continue, no additionalContext). Mutes once proven noise (>=50 injections at <5% conversion); a 1-in-20 probe stays alive for self-revival; a real digest-CLI conversion raises take-rate + un-mutes. Fails SAFE (fire:true) on unreadable/no-telemetry/disabled. STATS_PATH made env-overridable (PRISM_LARGE_READ_DIGEST_STATS_PATH) for hermetic testing.

VALIDATED LIVE (read-only against real stats): large-read-digest-advisory decay = {fire:false,muted:true,status:noise,reason:noise-suppressed} -> now mutes. 15/15 tests (12 pure-fn unchanged + 3 new subprocess integration: muted-on-noise / insufficient-fires-failsafe / probe-fires-self-revival). SCOPED: grep-index-first (3/283=1%, also proven-noise, decay confirmed would mute) + nav-rerank/wiki-read-offload/ollama-route-recommender are the identical clone follow-up (R15 apply-to-all).
```

## Files touched (3)
- .claude/hooks/large-read-digest-advisory.mjs      | 43 ++++++++++++++++++++++++++++++++++---------
- .claude/hooks/large-read-digest-advisory.test.mjs | 74 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 108 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- tilize ollama' intent -- crying wolf buries real offload signal). Root: the offload ratio is 10.7% (57 offloaded / 476 kept) precisely because advisory-suggest-then-ignored dominates; only ollama-task-offloader (deterministic, 53% take) actually converts.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 05906647ad84`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._