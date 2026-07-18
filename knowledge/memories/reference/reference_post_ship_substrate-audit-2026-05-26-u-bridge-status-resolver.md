---
name: reference_post_ship_substrate-audit-2026-05-26-u-bridge-status-resolver
description: Auto-distilled learnings from shipping SUBSTRATE-AUDIT-2026-05-26/U-BRIDGE-STATUS-RESOLVER (commit fb5aa2844). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.058Z
aliases: reference_post_ship_substrate-audit-2026-05-26-u-bridge-status-resolver
---


# SUBSTRATE-AUDIT-2026-05-26/U-BRIDGE-STATUS-RESOLVER

[MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-BRIDGE-STATUS-RESOLVER: git-log resolver for 42 bridge units (12/12 tests). Closes audit-2026-05-26 finding #8 — bridges were status:unknown despite 50 BRIDGE-* commits. Scans git log --grep=BRIDGE- via execFileSync (no-shell injection-safe per security hook), groups by (milestone, unitId), emits state/shared/bridge-status-resolved.json sidecar. consolidate-roadmaps.mjs can optionally read this to flip status:unknown → completed_real. Knobs: PRISM_BRIDGE_RESOLVER_OUTPUT, PRISM_BRIDGE_RESOLVER_LIMIT (default 5000).

**Shipped:** 2026-05-27T13:49:50-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[substrate-audit-2026-05-26-u-bridge-status-resolver]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._