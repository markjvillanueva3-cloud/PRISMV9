---
name: reference_post_ship_hermes-util-u-hermes-model-fallback
description: Auto-distilled learnings from shipping HERMES-UTIL/U-HERMES-MODEL-FALLBACK (commit fe1028f72). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.892Z
aliases: reference_post_ship_hermes-util-u-hermes-model-fallback
---


# HERMES-UTIL/U-HERMES-MODEL-FALLBACK

[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-MODEL-FALLBACK (slot:zulu): improve hermes offload utilization -- when the proxy serves chat but /v1/models lists nothing (live-observed: empty listing while bravo profile serves grok-4.3), resolveModel returned null and the WHOLE hermes lane was abandoned to ollama. Add FALLBACK_HERMES_MODEL (env PRISM_HERMES_FALLBACK_MODEL, default grok-4.3) + pure pickModel({explicit,listed,fallback})->{model,source} wired into both call sites; a chat is now ATTEMPTED with the configured model + an R12 stderr note when fallback fires. Safety net UNCHANGED: a truly-down proxy network-fails into the same shouldFallback->ollama degrade. Cost note: a non-listing-but-up proxy now incurs a paid grok attempt (intended per 'utilize hermes'; opt-out PRISM_HERMES_FALLBACK_MODEL= empty, documented). +6 pickModel tests (63/63); 2-arm scrutiny PASS (P2 DRY note-dedup deferred, non-load-bearing).

**Shipped:** 2026-06-18T11:29:45-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[hermes-util-u-hermes-model-fallback]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._