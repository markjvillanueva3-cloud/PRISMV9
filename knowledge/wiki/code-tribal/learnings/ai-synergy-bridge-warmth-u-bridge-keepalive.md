# AI-SYNERGY-BRIDGE-WARMTH/U-BRIDGE-KEEPALIVE — [MAIN-FORCE] [AI-SYNERGY-BRIDGE-WARMTH]/U-BRIDGE-KEEPALIVE (slot:bravo): keep_alive + cold-tolerant timeout on galaxy-reasoning-bridge (PSN leg #10, all 34 galaxies)

**Commit:** `4bbb8b97cfd2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T13:18:16-05:00
**Tags:** ai-synergy-bridge-warmth, u-bridge-keepalive, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-WARMTH]/U-BRIDGE-KEEPALIVE (slot:bravo): keep_alive + cold-tolerant timeout on galaxy-reasoning-bridge (PSN leg #10, all 34 galaxies)

## Body
```
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-WARMTH]/U-BRIDGE-KEEPALIVE (slot:bravo): keep_alive + cold-tolerant timeout on galaxy-reasoning-bridge (PSN leg #10, all 34 galaxies)

WHY (real bug, root-caused live): the fleet-wide galaxy-reasoning-bridge -- the
per-galaxy "reason via AI" surface the AI-synergy /goal names -- sent its Ollama
/api/generate request with NO keep_alive ({model,prompt,stream:false}). So a cold
32B reasoning model was evicted at Ollama's ~5min default between galaxies; every
bridge call re-cold-loaded ~20GB -> blew the 60s budget -> aborted -> degraded to
the CALLER's LLM. Net: local per-galaxy reasoning silently bounced back to Claude
(token-economy leak). PROVEN LIVE: only nomic-embed resident, qwen2.5-coder:32b
cold; a real call to hermes-zulu returned { ok:true, degraded:true,
error:"This operation was aborted" } with no answer.

FIX (surgical, clones the ask-ollama.mjs convention -- R11):
  - buildOllamaRequestBody(prompt,model,env) PURE helper now sets
    keep_alive = OLLAMA_KEEP_ALIVE || "30m" (operator's Blackwell-host value),
    so one load warms the model for the whole 34-galaxy sweep.
  - DEFAULT_TIMEOUT_MS 60s -> 120s (PRISM_GALAXY_BRIDGE_TIMEOUT_MS) so the FIRST
    cold load completes; otherwise the abort fires before keep_alive can register
    and the bridge degrades forever.
  - resolveKeepAlive(env) exported for testability.

SCOPE: one shared lib -> inherited by ALL 34 galaxies (R15 apply-to-all, same
shape as the prior DEEP-reason + hybrid-default bridge units).

TEST (R9, no stubs): 33/33 pass (29 existing + 4 new real-assertion):
keep_alive default 30m, OLLAMA_KEEP_ALIVE override, body carries keep_alive
(was ABSENT pre-fix), empty-prompt still valid. Pure-fn, hermetic.

VALIDATE: live end-to-end generate is BLOCKED by current host memory pressure
(99.9% commit) -- a DIRECT Ollama probe on even the 1.0GB model timed out at 70s,
so this is environmental, not a code defect (R12: not claiming a runtime answer I
could not obtain). The fix is the correct response to that pressure: warm-once
instead of cold-load-per-galaxy.
```

## Files touched (3)
- scripts/lib/galaxy-reasoning-bridge.mjs      | 22 ++++++++++++++++++++--
- scripts/lib/galaxy-reasoning-bridge.test.mjs | 36 +++++++++++++++++++++++++++++++++++-
- 2 files changed, 55 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till valid. Pure-fn, hermetic.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4bbb8b97cfd2`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-BRIDGE-WARMTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._