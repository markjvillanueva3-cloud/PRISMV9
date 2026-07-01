# HERMES-UTIL/U-GLM-CLIENT-ENGINE — [MAIN-FORCE] [HERMES-UTIL]/U-GLM-CLIENT-ENGINE (slot:zulu, operator 'incorporate glm5.2 -- get it active'): GLMClientEngine -- Zhipu GLM as a cross-vendor octopus voice (clone of the proven MoonshotClientEngine OpenAI-compatible pattern; pure fetch, no child_process). Keyless-gated: ok:false no-op until GLM_API_KEY/ZHIPU_API_KEY set (verified NONE present -> operator must provide the credential to go live). GLM-5.2 via PRISM_GLM_MODEL (default glm-4.6); model resolved at CALL time so a post-launch env set activates it (test-caught + fixed the module-load-capture gotcha). 8/8 hermetic tests (validate/gate/success/model-override/non-retriable/429-retry/empty). KEYSTONE -- consensus wiring + probe voice is the next unit (R13 client-before-consumer).

**Commit:** `c6be4281dbb9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T12:51:01-05:00
**Tags:** hermes-util, u-glm-client-engine, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-GLM-CLIENT-ENGINE (slot:zulu, operator 'incorporate glm5.2 -- get it active'): GLMClientEngine -- Zhipu GLM as a cross-vendor octopus voice (clone of the proven MoonshotClientEngine OpenAI-compatible pattern; pure fetch, no child_process). Keyless-gated: ok:false no-op until GLM_API_KEY/ZHIPU_API_KEY set (verified NONE present -> operator must provide the credential to go live). GLM-5.2 via PRISM_GLM_MODEL (default glm-4.6); model resolved at CALL time so a post-launch env set activates it (test-caught + fixed the module-load-capture gotcha). 8/8 hermetic tests (validate/gate/success/model-override/non-retriable/429-retry/empty). KEYSTONE -- consensus wiring + probe voice is the next unit (R13 client-before-consumer).

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-GLM-CLIENT-ENGINE (slot:zulu, operator 'incorporate glm5.2 -- get it active'): GLMClientEngine -- Zhipu GLM as a cross-vendor octopus voice (clone of the proven MoonshotClientEngine OpenAI-compatible pattern; pure fetch, no child_process). Keyless-gated: ok:false no-op until GLM_API_KEY/ZHIPU_API_KEY set (verified NONE present -> operator must provide the credential to go live). GLM-5.2 via PRISM_GLM_MODEL (default glm-4.6); model resolved at CALL time so a post-launch env set activates it (test-caught + fixed the module-load-capture gotcha). 8/8 hermetic tests (validate/gate/success/model-override/non-retriable/429-retry/empty). KEYSTONE -- consensus wiring + probe voice is the next unit (R13 client-before-consumer).
```

## Files touched (3)
- mcp-server/src/__tests__/GLMClientEngine.test.ts | 113 ++++++++++++++++++++
- mcp-server/src/engines/GLMClientEngine.ts        | 359 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 472 insertions(+)

## Lessons surfaced in commit body
- TIL]/U-GLM-CLIENT-ENGINE (slot:zulu, operator 'incorporate glm5.2 -- get it active'): GLMClientEngine -- Zhipu GLM as a cross-vendor octopus voice (clone of the proven MoonshotClientEngine OpenAI-compatible pattern; pure fetch, no child_process). Keyless-gated: ok:false no-op until GLM_API_KEY/ZHIPU_API_KEY set (verified NONE present -> operator must provide the credential to go live). GLM-5.2 via PR
- gotcha). 8/8 hermetic tests (validate/gate/success/model-override/non-retriable/429-retry/empty). KEYSTONE -- consensus wiring + probe voice is the next unit (R13 client-before-consumer).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c6be4281dbb9`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._