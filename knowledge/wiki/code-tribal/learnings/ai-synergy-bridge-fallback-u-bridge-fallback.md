# AI-SYNERGY-BRIDGE-FALLBACK/U-BRIDGE-FALLBACK — [MAIN-FORCE] [AI-SYNERGY-BRIDGE-FALLBACK]/U-BRIDGE-FALLBACK (slot:bravo): model fallback ladder -- local reasoning survives a failed model (resilience half of robust leg #10, all 34 galaxies)

**Commit:** `fa2481f0c4c5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T15:29:45-05:00
**Tags:** ai-synergy-bridge-fallback, u-bridge-fallback, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-FALLBACK]/U-BRIDGE-FALLBACK (slot:bravo): model fallback ladder -- local reasoning survives a failed model (resilience half of robust leg #10, all 34 galaxies)

## Body
```
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-FALLBACK]/U-BRIDGE-FALLBACK (slot:bravo): model fallback ladder -- local reasoning survives a failed model (resilience half of robust leg #10, all 34 galaxies)

WHY: keep_alive (U-BRIDGE-KEEPALIVE) was the WARMTH half of robust per-galaxy reasoning;
this is the RESILIENCE half. When the requested reasoning model fails to load/generate
(cold-load timeout under memory pressure, a reaped/orphaned llama-server runner, or 404),
the bridge previously degraded straight to the CALLER's LLM (Claude) -- defeating the whole
point of leg #10 (free local per-galaxy reasoning; reserve Claude). Now it descends to a
progressively SMALLER installed reasoner first.

FIX: buildFallbackLadder(requestedModel, env) PURE export -- size-ordered tiers (gpt-oss:120b
-> qwen2.5-coder:32b -> gpt-oss:20b -> qwen2.5-coder:1.5b), starts at the requested model and
only DESCENDS (never a larger/slower model); an unknown/custom model gets NO fallback (never
guess a substitute); override via PRISM_GALAXY_BRIDGE_FALLBACK (csv, large->small).
reasonForGalaxy loops the ladder: first model that returns wins, the actually-used model is
threaded into the result.model + the LoRA pair (transparency); all tiers failing -> the
existing degrade-to-caller path (unchanged). One shared lib -> all 34 galaxies (R15).

TEST (R9): 42/42 (+3): descends-not-ascends, smallest-tier has no further fallback,
unknown-model no-guess, env override + non-member no-fallback. Pure-fn oracles.

VALIDATE (live, recovered substrate): requested "bogus-model:999b" (fails) -> descended to
qwen2.5-coder:1.5b -> ok=true degraded=false with a real grounded answer (usedModel reported
= qwen2.5-coder:1.5b). Local reasoning survived instead of degrading to Claude.

NOTE (recurring infra): the Ollama substrate WEDGED AGAIN this session (generate hung; RAM+VRAM
free) -- recovered via reap-orphan + restart "PRISM Ollama Serve" (2nd recovery this session).
Root cause is the orphan-llama-server class golf's fleet-reaper does not yet reap; recommend
adding that rule (see reference_ollama_wedged_orphan_runner_recovery_2026_06_13). The fallback
ladder helps the per-MODEL failure case; the full-daemon wedge still needs the reaper rule.
```

## Files touched (3)
- scripts/lib/galaxy-reasoning-bridge.mjs      | 33 ++++++++++++++++++++++++++++++---
- scripts/lib/galaxy-reasoning-bridge.test.mjs | 21 ++++++++++++++++++++-
- 2 files changed, 50 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till needs the reaper rule.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fa2481f0c4c5`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-BRIDGE-FALLBACK.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._