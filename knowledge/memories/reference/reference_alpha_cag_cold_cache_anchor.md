---
name: reference_alpha_cag_cold_cache_anchor
description: CAG cold-cache anchoring catalogs static doctrine once per session so the Anthropic prompt-cache can anchor it
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.466Z
aliases: reference_alpha_cag_cold_cache_anchor
---


CAG (Cache-Augmented Generation) cold-cache anchor (`.claude/hooks/cag-cold-cache-anchor.mjs`, akshay_pachaar pattern) catalogs static cold-tier doctrine ONCE per SessionStart so the Anthropic prompt-cache (5-min ephemeral TTL) anchors them as `cache_control:ephemeral` candidates. `COLD_SOURCES` (in `scripts/lib/cag-router.mjs`): CLAUDE.md, master MEMORY.md, ENGINE_DIGEST, DISPATCHER_DIGEST, physics/constants.ts, wiki index, tribal tips.

Companions: `cag-router-inject.mjs` (per-prompt route HYBRID/COLD/HOT), `cag-soul-cache-block.mjs` (soul-block dedup — skips re-injecting an unchanged slot-soul block, saving tokens). Disable knobs: `PRISM_CAG_COLD_ANCHOR_DISABLE=1`, `PRISM_CAG_ROUTER_INJECT_DISABLE=1`. This is alpha's cache-economy substrate.
