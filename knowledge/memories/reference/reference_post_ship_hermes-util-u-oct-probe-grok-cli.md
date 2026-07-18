---
name: reference_post_ship_hermes-util-u-oct-probe-grok-cli
description: Auto-distilled learnings from shipping HERMES-UTIL/U-OCT-PROBE-GROK-CLI (commit cf37e2744). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.892Z
aliases: reference_post_ship_hermes-util-u-oct-probe-grok-cli
---


# HERMES-UTIL/U-OCT-PROBE-GROK-CLI

[MAIN-FORCE] [HERMES-UTIL]/U-OCT-PROBE-GROK-CLI (slot:zulu): octopus probe banner under-reported Grok -- credited it ONLY on XAI_API_KEY, but MultiModelConsensusEngine:487 gates the Grok voice on (XAI_API_KEY || grokCLIClientEngine.isAvailable()) keyless 'grok' CLI. Add pure grokCliOnPath() mirroring resolveBinOnPath (PATH walk + win32 exts + PRISM_GROK_CLI_BIN) + credit Grok(grok CLI) in buildBanner; missing msg names both paths. +9 tests 19/19 (platform-agnostic); live-validated (this host no key+no CLI -> correctly Missing). Banner now matches engine gate.

**Shipped:** 2026-06-18T11:52:38-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[hermes-util-u-oct-probe-grok-cli]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._