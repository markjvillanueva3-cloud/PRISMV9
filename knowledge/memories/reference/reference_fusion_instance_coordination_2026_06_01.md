---
name: reference_fusion_instance_coordination_2026_06_01
description: "kilo↔delta Fusion instance coordination — kilo refuses to drive any instance holding delta's foreign (non-scratch) docs; resolver + proposal shipped; operator must give kilo a dedicated instance"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.122Z
aliases: reference_fusion_instance_coordination_2026_06_01
---


# Fusion instance coordination kilo↔delta (U-CAM-FUSION-INSTANCE-COORD, slot:kilo, 2026-06-01)

Operator /goal clause #1 ("coordinate with delta on which Fusion instance"). Driven to a concrete proposal + kilo-side enforcement.

## Live topology (probed 2026-06-01)
- **:18362** = NEW PRISM_Fusion_Drive add-in (with /documents + /doc/close), but it is **delta's instance** — 4 live CAD docs open (active `UP SET - OP1 - 5AX SETUP`, saved `DIE CASE 2.940 X 3.75 .992 ID`). Ports SWAPPED from the documented kilo=:18365 / delta=:18362.
- **:18365** = OLD add-in (/documents → 404), kilo's documented port but stale.

## The conflict + resolution
One Fusion = ONE active document; two slots driving it race the active-doc state. The new add-in is bound to delta's busy :18362; :18365 can't close scratch (old). **kilo-side enforcement shipped:** `scripts/lib/fusion-instance-resolver.mjs` `resolveKiloScratchInstance()` selects an instance ONLY if capable (new add-in) AND clean (zero FOREIGN docs = not-PRISM-scratch AND saved-or-modified). Against the current topology it **REFUSES** (fail-loud) → delta's docs can never be selected/closed. 10/10 tests. kilo drive SOP once safe: resolve → `/new {scratch}` → drive → `/doc/close {scratch}`.

## OPERATOR/DELTA DECISION NEEDED (the unblock for #5b/#6)
Recommended: a **dedicated kilo Fusion instance** (restart :18365 with the new add-in, or a new port via `PRISM_FUSION_DRIVE_PORT`); delta keeps :18362 for live CAD. Proposal doc: `state/shared/cam-drive/FUSION-INSTANCE-COORDINATION.md` (posted to bus for delta; bus helper exit-255'd so the durable doc + handoff are the record golf relays).

## Follow-up
Wire `resolveKiloScratchInstance` as a pre-drive gate in `Fusion360LiveBridgeEngine` once a safe instance exists (R13 — don't wire a gate into an unproven live path; do it with a live safe instance to test against). Pairs with [[reference_fusion_scratch_close_enforce_2026_06_01]] (window cleanup) + [[reference_kilo_fusion_backend_nav_map_2026_05_31]]. This is the single highest-leverage unblock for the live closed loop (#5b/#6).
