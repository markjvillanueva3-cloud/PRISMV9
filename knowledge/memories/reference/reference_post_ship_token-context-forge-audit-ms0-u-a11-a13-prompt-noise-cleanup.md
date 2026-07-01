---
name: reference_post_ship_token-context-forge-audit-ms0-u-a11-a13-prompt-noise-cleanup
description: Auto-distilled learnings from shipping TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-A11-A13-PROMPT-NOISE-CLEANUP (commit 11eb8c6fc). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.072Z
aliases: reference_post_ship_token-context-forge-audit-ms0-u-a11-a13-prompt-noise-cleanup
---


# TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-A11-A13-PROMPT-NOISE-CLEANUP

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-A11-A13-PROMPT-NOISE-CLEANUP (slot:alpha /loop iter4 next-units): two Phase-1 fixes from DORMANT-FEATURES-ENUMERATION shipped together. A11 (hook-registry-regen): drop the per-edit egen queued additionalContext — pure noise, 125 fires/session at 3032 tokens, operators never act on it; the action (detached child spawn) fires regardless. Re-enable via PRISM_HOOK_REGISTRY_REGEN_VERBOSE=1. A13 (tool-watchdog): quantize prev.durationMs to 10s buckets (30-40s, 100+s) so identical-bucket entries dedup at the prompt-injection layer; pre-fix 17 distinct entries observed in one audit window per unique-millisecond non-match. Smoke-test verified: 32962ms->30-40s, 138060ms->100+s, 10000ms->10-20s. PSN leg #6 (System Viz / token telemetry) prompt-context noise reduced ~3-5K tokens/session typical, ~7K worst-case watchdog-heavy session.

**Shipped:** 2026-05-26T14:08:46-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[token-context-forge-audit-ms0-u-a11-a13-prompt-noise-cleanup]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._