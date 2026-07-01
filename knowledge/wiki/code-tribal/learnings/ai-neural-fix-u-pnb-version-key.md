# AI-NEURAL-FIX/U-PNB-VERSION-KEY — [MAIN-FORCE] [AI-NEURAL-FIX]/U-PNB-VERSION-KEY (slot:india): physics_neural_bridge_version returned {model_version} but the action contract key is {version}

**Commit:** `b595683bdd4a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T23:36:31-05:00
**Tags:** ai-neural-fix, u-pnb-version-key, auto-distilled

## Subject
[MAIN-FORCE] [AI-NEURAL-FIX]/U-PNB-VERSION-KEY (slot:india): physics_neural_bridge_version returned {model_version} but the action contract key is {version}

## Body
```
[MAIN-FORCE] [AI-NEURAL-FIX]/U-PNB-VERSION-KEY (slot:india): physics_neural_bridge_version returned {model_version} but the action contract key is {version}

BUG (PhysicsNeuralBridgeEngine-integration.test.ts "physics_neural_bridge_version round-trips" RED: expected 'undefined' to be 'string'): the dispatcher case returned `{ model_version: getModelVersion() }`, leaking the engine's INTERNAL field name into the action's external shape. The wiring test (U-NN-WIRE-PNB) reads `data.version` -> undefined.

FIX: return `{ version: getModelVersion() }`. Rationale (R7/R9): the action is named physics_neural_bridge_version, the wiring-gate test (the contract) expects `version`, the sibling version usage in this dispatcher uses the `version` key, and grep confirms NO consumer reads this action's model_version. The engine's internal `model_version` field is an implementation detail that must not dictate the action key.

VERIFY: PhysicsNeuralBridgeEngine-integration.test.ts 11/12 -> 12/12; no consumer break (grep clean); tsc unaffected (key rename only). Found via india AI-substrate RED sweep (CrossProcess+Neural batch).
```

## Files touched (2)
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts | 5 ++++-
- 1 file changed, 4 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b595683bdd4a`
- Milestone envelope: `mcp-server/data/milestones/AI-NEURAL-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._