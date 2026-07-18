---
name: reference_post_ship_hermes-util-u-glm-client-engine
description: Auto-distilled learnings from shipping HERMES-UTIL/U-GLM-CLIENT-ENGINE (commit c6be4281d). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.891Z
aliases: reference_post_ship_hermes-util-u-glm-client-engine
---


# HERMES-UTIL/U-GLM-CLIENT-ENGINE

[MAIN-FORCE] [HERMES-UTIL]/U-GLM-CLIENT-ENGINE (slot:zulu, operator 'incorporate glm5.2 -- get it active'): GLMClientEngine -- Zhipu GLM as a cross-vendor octopus voice (clone of the proven MoonshotClientEngine OpenAI-compatible pattern; pure fetch, no child_process). Keyless-gated: ok:false no-op until GLM_API_KEY/ZHIPU_API_KEY set (verified NONE present -> operator must provide the credential to go live). GLM-5.2 via PRISM_GLM_MODEL (default glm-4.6); model resolved at CALL time so a post-launch env set activates it (test-caught + fixed the module-load-capture gotcha). 8/8 hermetic tests (validate/gate/success/model-override/non-retriable/429-retry/empty). KEYSTONE -- consensus wiring + probe voice is the next unit (R13 client-before-consumer).

**Shipped:** 2026-06-18T12:51:01-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[hermes-util-u-glm-client-engine]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._