# PRE-LAUNCH-REFRESH/U-PLR01 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRE-LAUNCH-REFRESH]/U-PLR01: refresh canonical sources + HP-CTX-MODEL-AWARE statusline fix (slot:alpha 2026-05-28)

**Commit:** `ccd1d9f82b67` · **By:** markjvillanueva3-cloud · **At:** 2026-05-28T11:30:57-05:00
**Tags:** pre-launch-refresh, u-plr01, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRE-LAUNCH-REFRESH]/U-PLR01: refresh canonical sources + HP-CTX-MODEL-AWARE statusline fix (slot:alpha 2026-05-28)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRE-LAUNCH-REFRESH]/U-PLR01: refresh canonical sources + HP-CTX-MODEL-AWARE statusline fix (slot:alpha 2026-05-28)

Pre-fleet-launch refresh window — single chat shipping changes that would
otherwise race when 20+ chats start. Canonical sources rebuilt so every
slot reads from current ground truth on /checkin-<slot>.

REFRESHED:
- PRISM-INVENTORY-LATEST.md + PRISM-INVENTORY-2026-05-28.md
  engines/dispatchers/actions/algorithms/registries/tests/scripts counts
  vs BASELINE_INVENTORY — all steady (no regression).
- state/shared/BUILD_STATE.{json,md}  -> BUILT=3604 NEEDS_WIRING=118
  NEEDS_BUILDING=3029 NEEDS_FRONTEND=2.
- state/shared/MILESTONE_PROGRESS.{json,md}  -> 2720/5749 shipped
  (1070 envelope-asserted, 191 drift cases) from 729 envelopes + 4476
  (milestone-tag, unit-id) commits + 57575 SHA tokens.
- state/shared/system-viz/system-graph.json  -> regenerated (background)

CODE FIX — HP-CTX-MODEL-AWARE (.claude/statusline.mjs):
The HP bar previously divided active tokens by a hardcoded 1M cap. Per
operator directive 2026-05-28 ("fix the ui for the terminals so they're
accurate with HP context"), the bar now prefers the token-awareness
sidecar's model-aware ctx.maxTokens + ctx.pct as a single source of
truth. CTX_MAX (1_000_000) remains as the cold-start fallback for the
no-sidecar path so the bar still renders before token-awareness fires.
Without this fix, a Sonnet chat at 150k showed HP=15% (looks fine) when
it was actually 75% spent against the 200k window — bar lied. The
`ctxPct` const (line 96) is retired in the same edit; the lint flagged
it as dead code once `ctxPctEffective` became the single computed pct.

The token-awareness sidecar (token-budget-<slot>.json) already exposes
{ ctx: { tokens, maxTokens, pct }, quota, cumulative, offload, zone,
worstPct, worstSource, stale } — read by both this statusline and the
precompact-auto-trigger hook so the HP bar + zone badge + alert text
all agree (U-TA15 doctrine: single source of truth, never compute two
ways).

NEXT (deferred to per-slot ships):
- MP bar redesign (operator pick pending — 3 options: 5h quota burn /
  prompt-cache hit rate / SVI psi)
- outcome-bus-auto-tap.mjs (india #1 — unblocks closed-loop fleet-wide)
- per-chat MCP architecture proposal (assessment pending below)

Memory updated: reference_this_pc_onedrive_desktop_2026_05_28.md marks
the .bat ;-collision regenerator follow-up as CLOSED (verified in
regenerate-launch-fleet.mjs lines 289-313 — already emits -File form).

Refs: U-PSCL01 (18ca66fb61), U-PSCL02 (92c55ee62f).
```

## Files touched (8)
- .claude/statusline.mjs               |  20 +-
- PRISM-INVENTORY-2026-05-28.md        |  78 +++
- PRISM-INVENTORY-LATEST.md            |  44 +-
- state/shared/BUILD_STATE.json        | 926 ++++++++++++++++-------------------
- state/shared/BUILD_STATE.md          |  76 +--
- state/shared/MILESTONE_PROGRESS.json |   2 +-
- state/shared/MILESTONE_PROGRESS.md   |   2 +-
- 7 files changed, 589 insertions(+), 559 deletions(-)

## Lessons surfaced in commit body
- till renders before token-awareness fires.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ccd1d9f82b67`
- Milestone envelope: `mcp-server/data/milestones/PRE-LAUNCH-REFRESH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._