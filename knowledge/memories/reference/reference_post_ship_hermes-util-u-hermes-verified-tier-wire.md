---
name: reference_post_ship_hermes-util-u-hermes-verified-tier-wire
description: Auto-distilled learnings from shipping HERMES-UTIL/U-HERMES-VERIFIED-TIER-WIRE (commit a6a6243a2). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.892Z
aliases: reference_post_ship_hermes-util-u-hermes-verified-tier-wire
---


# HERMES-UTIL/U-HERMES-VERIFIED-TIER-WIRE

[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-VERIFIED-TIER-WIRE (slot:alpha): wire tiered verified-offload into the canonical ollama-offload.mjs CLI (classify-strong + digest-strong) + fix makeHermesRunner missing-model. R15 wire: offloadClassifyStrong/offloadDigestStrong reuse the byte-identical classify/digest prompts+verifiers+safe-floor of their non-strong siblings, routing Hermes-strong -> Ollama -> same fallback. Live validation FOUND + FIXED a real bug: makeHermesRunner sent model:undefined when the CLI omitted --hermes-model -> proxy rejected -> strong tier silently descended; now defaults to PRISM_HERMES_MODEL || grok-4.3. LIVE post-fix: classify-strong CLI returned source=hermes value=lathe verified tier=strong. 24/24 offload + 20/20 tiered tests; 2-arm scrutiny BOTH PASS (mutation-tested, 0 P0/P1/P2).

**Shipped:** 2026-06-24T12:04:58-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[hermes-util-u-hermes-verified-tier-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._