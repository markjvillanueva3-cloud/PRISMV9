// slot-constants.mjs — single source of truth for slot-related constants
// shared across chat-slots.mjs + main-tree-write-block.mjs + seed/backfill
// bridge scripts.
//
// Created 2026-05-26 by [SLOT-BRIDGE-MS0]/U-SBB05 in response to 3-of-3
// scrutiny arm-C P0: `INTEGRATOR_SLOT = "golf"` was previously triplicated
// across chat-slots.mjs, main-tree-write-block.mjs, and seed-slot-branch-
// bindings.mjs with only comment cross-reference between them. R7 drift
// hazard: any future move of the integrator role required three coordinated
// edits or the bridge silently disagreed with the enforcement hook.
//
// This module is intentionally tiny (constants only, zero side effects, no
// imports of other Ruflo helpers) so the hot Pre-tool-use hooks
// (main-tree-write-block.mjs, git-add-lane-guard.mjs) can import it without
// dragging in transcript/window-id resolver dependencies.

/**
 * The integrator slot — the only slot exempt from per-slot branch binding
 * auto-seed, the only slot permitted to write the main tree
 * (`H:/prism` / `cad-fusion-live-ms0`). Per CLAUDE.md §GOLF SLOT and
 * §SLOT-WORKTREE-MS0. Historically moved from alpha → golf 2026-05-16
 * (doctrine shift); since then golf has owned fleet hygiene + integration.
 *
 * @type {"golf"}
 */
export const INTEGRATOR_SLOT_NAME = "golf";
