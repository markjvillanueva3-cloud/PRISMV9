# OCTOPUS-HERMES-AGENTS/U-SIERRA-OCTOPUS-HERMES-CLI-WIRE — [MAIN-FORCE] [OCTOPUS-HERMES-AGENTS]/U-SIERRA-OCTOPUS-HERMES-CLI-WIRE (slot:sierra): let the octopus CLI harness pass hermes-AGENT specs (R15 consumer wire)

**Commit:** `e8dacfe08d80` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T21:07:09-05:00
**Tags:** octopus-hermes-agents, u-sierra-octopus-hermes-cli-wire, auto-distilled

## Subject
[MAIN-FORCE] [OCTOPUS-HERMES-AGENTS]/U-SIERRA-OCTOPUS-HERMES-CLI-WIRE (slot:sierra): let the octopus CLI harness pass hermes-AGENT specs (R15 consumer wire)

## Body
```
[MAIN-FORCE] [OCTOPUS-HERMES-AGENTS]/U-SIERRA-OCTOPUS-HERMES-CLI-WIRE (slot:sierra): let the octopus CLI harness pass hermes-AGENT specs (R15 consumer wire)

Completes U-SIERRA-OCTOPUS-HERMES-PERSONAS: octopus-first-live-record.mjs filtered hermesGrokModels to STRINGS only (the model-only era), so it would silently DROP agent specs {model,system,name}. Now it passes through bare strings OR valid specs (the engine normalizeHermesGrokModels validates/dedupes downstream). So a programmatic caller of the octopus CLI can seat persona voices, matching alpha multimodel CLI reachability. node --check clean. NOTE (R12): the prism_ai:consensus DISPATCHER (aiReasoningDispatcher.ts:3440) does NOT pass hermesGrokModels at all -- neither alpha models nor these agents -- so dispatcher exposure of multi-voice is a separate follow-up (needs a voices token + includeGrok coupling care), flagged not done.
```

## Files touched (2)
- scripts/octopus-first-live-record.mjs | 4 +++-
- 1 file changed, 3 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e8dacfe08d80`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS-HERMES-AGENTS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._