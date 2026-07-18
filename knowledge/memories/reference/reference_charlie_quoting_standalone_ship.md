---
name: reference_charlie_quoting_standalone_ship
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.513Z
aliases: reference_charlie_quoting_standalone_ship
---


QUOTING-SYNERGY-MS0 iter28 (commit `d74521aa4c`). The alert-banner formatter shipped standalone (`scripts/quoting-alert-banner.mjs`) BEFORE wiring into a SessionStart hook — touching no hooks dir avoids the per-file scrutiny + peer-claim friction in the high-contention `.claude/hooks/` real estate.

**Pattern:** build the pure-fn lib first (own dir, own tests), wire it into hooks/settings in a separate later iter when contention is low. Reduces multi-chat lane conflicts and keeps each ship small + independently scrutinizable.
