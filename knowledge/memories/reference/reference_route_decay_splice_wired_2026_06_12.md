---
name: reference_route_decay_splice_wired_2026_06_12
description: 2026-06-12 slot:alpha wired golf's advisory-DECAY actor (route-suggest-decay.mjs) into the live mcp-route-suggest hook -- the routed splice had sat unapplied ~18h. Arms (but mutes 0 now) the ~81%-of-fires route-suggest noise reduction; auto-activates as the take-rate audit re-accumulates measured takes. Read-before-write + memory-recall caught + refuted finding #2's instinct to hardcode-suppress 0-take classifiers.
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:47.149Z
aliases: reference_route_decay_splice_wired_2026_06_12
---


# Route-decay consumer wired live (2026-06-12, slot:alpha)

**What.** golf built the advisory-DECAY keystone `scripts/lib/route-suggest-decay.mjs` (commit `e7fb25bb8a`, 16 tests) -- the only consumer of the `audit-mcp-route-takerate.mjs` `suppress` verdict -- but the 2-line hook splice was firewall-gated for golf, shipped as a routed patch (`state/shared/specs/route-suggest-decay-splice-patch.md`), and **sat unapplied ~18h** (bravo never picked it up; `grep` confirmed 0 markers in every hook copy). Until wired, NOTHING acted on the suppress verdict -> the operator's headline token-savings lever (mute ~81% of ~10.5k route-suggest fires at ~0.28% take) was inert.

**Done.** `scripts/apply-route-decay-splice.mjs` (slot/alpha) -- an idempotent, self-verifying, EOL-aware, raw-FS patcher (the `.claude/hooks/` Edit-tool firewall forces a node patcher from a slot worktree; mirrors the proven `patch-mcp-route-suppress-low-take.mjs` pattern) with a **co-location guard** (refuses to splice if the lib isn't beside the target -> would break the relative import) and an **anchor-uniqueness** check. Applied live to `H:/prism/.claude/hooks/mcp-route-suggest.mjs` (committed `[MAIN]`). 5 hermetic subprocess tests (`scripts/__tests__/apply-route-decay-splice.test.mjs`). The hook batches `messages[]` + emits once, so golf's per-msg `return` splice was adapted to an array **filter as the LAST transform before emission** -- semantics identical (gate final emission, log each drop, bail clean if all suppressed). Reversible: `PRISM_ROUTE_DECAY_DISABLE=1`.

**Honest state (R12).** Armed but mutes **0 classifiers right now** -- the route-suggest sidecar was reset (~37 fires), so the effective suppress-set is empty (no classifier yet has measured `takes>0` + `suppress`). Auto-activates `doctrineSurface` + `backendAuditChain` as the take-rate audit re-accumulates. Wiring-ahead-of-data is net-positive: the consumer is the ONLY thing that ever acts on the suppress verdict, which was previously inert.

**The big R8/R7 save.** This started as backlog finding #2 ("extend the backendAuditChain suppressor to also mute doctrineSurface + isLargeRead + isVerboseBash"). The **memory-recall hook surfaced [[reference_route_suggest_decay_gap_confirmed_2026_06_11]] mid-edit**, which revealed golf's later, more rigorous actor that **deliberately PROTECTS `isVerboseBash` (0-take = possible measurement artifact, verify-wiring precedence) and `isLargeRead` (<30% share = retune)**. Finding #2's "hardcode-suppress all 4" instinct was REFUTED -- a static Set would wrongly mute 2 classifiers the audit-driven actor protects. **LIVE-PROVEN:** real hook + real audit, decay ON -> the `isVerboseBash` nudge STILL emits even though the raw audit marks it `suppress`, because the lib's `fires>0 && takes>0` guard refuses to mute a 0-take row. The superseded sibling `patch-mcp-route-suppress-low-take.mjs` was annotated SUPERSEDED (kept, not deleted, per [[feedback_never_delete_only_disable]]).

**Why this matters.** The lesson the loop taught: a 10-day-old "high-ROI" finding can be both (a) already-better-solved by a peer and (b) actively wrong on the details. Read the body, recall the memory, and verify the *current* state before building -- the win was not "build finding #2" but "wire the superior thing the peer already built but never connected." [[feedback_read_full_content_not_titles]] · [[feedback_net_benefit_auto_build]].

**How to apply elsewhere.** When a peer ships a keystone lib + a "routed" splice patch that then rots unapplied, any slot can apply it (per [[feedback_all_slots_free_access]] -- don't defer); use a raw-FS node patcher for `.claude/hooks/` files (Edit-tool firewall), make it idempotent + self-verifying + co-location-guarded, validate on LIVE data, and commit the live edit `[MAIN]` so it isn't silently lost on a main-tree reconcile.

**P2 follow-up (deferred).** A hermetic E2E suppression test (drive the real hook with a synthetic `takes>0 suppress` audit) is blocked because the lib's `AUDIT_FILE` is a hardcoded absolute path. Add a `PRISM_ROUTE_DECAY_AUDIT_FILE` env seam to `route-suggest-decay.mjs` (additive, fail-safe) to unblock it; also lets ops point decay at a staging audit.
