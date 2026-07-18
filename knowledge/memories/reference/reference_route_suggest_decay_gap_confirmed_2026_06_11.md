---
name: reference_route_suggest_decay_gap_confirmed_2026_06_11
description: 2026-06-11 R8 confirmation — route-suggest advisory-DECAY actor is still UNBUILT. audit-mcp-route-takerate.mjs already classifies classifiers as suppress/retune/verify-wiring/keep, but NO hook consumes the `suppress` recommendation to mute proven-noise at fire-time (route-suggest fires 10450x @ 0.4% take-rate = pure context tax). The load-bearing splice into mcp-route-suggest.mjs is cross-worktree-firewall-blocked for golf; buildable path = standalone scripts/lib helper + ready patch (keystone-helper pattern).
type: reference
galaxy: fleet-hygiene
source: prism-memory
synced: 2026-06-27T20:30:47.149Z
aliases: reference_route_suggest_decay_gap_confirmed_2026_06_11
---


# Advisory-decay actor — gap confirmed unbuilt (2026-06-11, slot:golf)

> **CLOSED (CONSUMER WIRED LIVE 2026-06-12, slot:alpha):** the routed splice sat unapplied ~18h (bravo never picked it up; 0 markers in any hook copy). alpha wired it via `scripts/apply-route-decay-splice.mjs` (idempotent self-verifying raw-FS patcher, 5 hermetic subprocess tests, co-location + anchor-uniqueness guards) -> live in `H:/prism/.claude/hooks/mcp-route-suggest.mjs` (committed `[MAIN]`). The hook batches messages[] + emits once, so golf's per-msg splice was adapted to an array FILTER as the LAST transform before emission (semantics identical). LIVE-VALIDATED: real hook + real audit, decay ON -> `isVerboseBash` nudge STILL emits (raw audit marks it suppress @0-take, but the lib's `fires>0&&takes>0` guard correctly protects it) = safety design proven end-to-end. **Honest state (R12):** armed but mutes 0 NOW (sidecar was reset to ~37 fires -> effective suppress-set empty); auto-activates `doctrineSurface`+`backendAuditChain` (~81% of fires) as the take-rate audit re-accumulates measured takes. Sibling `patch-mcp-route-suppress-low-take.mjs` (hardcoded 1-elem Set) marked SUPERSEDED (it would wrongly mute 0-take classifiers the audit-driven actor protects). 2 per-file reviewers PASS. Memory: [[reference_route_decay_splice_wired_2026_06_12]]. P2 follow-up: add `PRISM_ROUTE_DECAY_AUDIT_FILE` env seam to the lib for a hermetic E2E suppression test (lib's AUDIT_FILE is a hardcoded absolute path -> not redirectable today).

> **UPDATE (KEYSTONE SHIPPED, commit `e7fb25bb8a`):** `scripts/lib/route-suggest-decay.mjs` BUILT + 16/16 tests + LIVE-VALIDATED. Suppress-set = `doctrineSurface` (4360f/0.48%/42%) + `backendAuditChain` (4108f/0.07%/39%) = ~81% of 10473 route-suggest fires; safety guards correctly protect `isVerboseBash` (0-take verify-wiring) + `isLargeRead` (<30%-share retune). 2-line splice firewall-gated for golf -> ready patch `state/shared/specs/route-suggest-decay-splice-patch.md` routed to bravo. Audit spec: `state/shared/specs/SKILLS-HOOKS-AUDIT-2026-06-11.md`.

The 2026-06-09 alpha cross-surface fire ([[reference_goal_crosssurface_queue_2026_06_09]]) named advisory-DECAY as the ONE genuinely-novel token-savings lever ("mcp-route-takeup MEASURES take-rate but nothing ACTS on it") and routed it to bravo. R8 re-verified 2026-06-11:

## The data contract (already built — the REPORTER)
`scripts/audit-mcp-route-takerate.mjs` reads `state/shared/mcp-route-suggest-stats.json` and writes `state/shared/dashboards/mcp-route-takerate-audit.{json,md}`. Pure-core `classify({fires,takes,totalFires})` returns one of:
- **suppress** — share >=30% AND take-rate <5% (biggest noise win)
- **retune** — take-rate <5% but share <30%
- **verify-wiring** — fires>=50 AND takes===0 (measurement artifact — PRECEDENCE over suppress, so a 0%-from-broken-wiring is NEVER suppressed)
- **keep** — take-rate>=30% OR fires<10
Thresholds: SUPPRESS_FIRE_SHARE 0.30, SUPPRESS_TAKE_RATE_MAX 0.05, VERIFY_WIRING_MIN_FIRES 50. The `suppress` verdict is **safe-by-construction**: it requires measured takes (verify-wiring precedence) + dominant fire-share + sub-5% rate.

## The gap (UNBUILT — the ACTOR)
Grep 2026-06-11: `mcp-route-takerate-audit` has **zero consumers** in `.claude/hooks/`. `mcp-route-suggest.mjs` HAS suppression but it's STRUCTURAL only — `PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT` (companion-covered `isCompanionCovered`, no-dispatcher-fit, MCP-offline `U-PMDS01`, already-rtk-wrapped). NONE read the take-rate `suppress` recommendation. So proven-noise classifiers keep firing (fleet: 10450 fires / 38 takes / 0.4% = `below-target-take-rate`, NOT a wiring artifact).

## Build constraint + path
- `mcp-route-suggest.mjs` is `.claude/hooks/*.mjs` -> **cross-worktree-firewall HARD-BLOCKS golf-slot edits** (same block hit on `stop_close_prism_nodes_v2.mjs` this session). The load-bearing splice (`if (decaySuppressed(classifier)) return null`) can't be applied from golf.
- **Buildable path (keystone-helper pattern, proven by 2026-06-09 graph-stream-degree):** build `scripts/lib/route-suggest-decay.mjs` (pure-core: read audit json -> Set of `recommendation==='suppress'` classifiers, with a freshness guard so a stale audit doesn't mute forever, + opt-in knob `PRISM_ROUTE_DECAY_DISABLE`) + real tests, then provide the 2-line `mcp-route-suggest.mjs` splice as a ready PATCH routed to bravo (route/ollama family owner) or a main-tree edit. Lib is in `scripts/lib/` (NOT firewall-gated) -> golf-buildable; splice is owner-gated.

**Why:** the headline token-savings win the operator keeps asking for (kill the 10450/0.4% advisory tax, zero quality loss) is gated on this one actor; this records it's confirmed-buildable + how, so the next build is fast. **How to apply:** build the lib+tests in golf, post the splice patch to AGENT_CHAT for bravo. Related: [[reference_goal_crosssurface_queue_2026_06_09]], [[feedback_primary_backend_builders_no_galaxy_gate_block]].
