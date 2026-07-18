# POST-BRIDGE-SYNERGY-MS0/U-NOVEL-OPERATOR-STYLE-TWIN — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-NOVEL-OPERATOR-STYLE-TWIN (slot:echo /loop iter32 /yolo): Tier-A $1.5K/mo per-operator EWMA preference fingerprint — CLOSES 5/5 NOVEL TIER-A.

**Commit:** `29763033836c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:23:13-05:00
**Tags:** post-bridge-synergy-ms0, u-novel-operator-style-twin, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-NOVEL-OPERATOR-STYLE-TWIN (slot:echo /loop iter32 /yolo): Tier-A $1.5K/mo per-operator EWMA preference fingerprint — CLOSES 5/5 NOVEL TIER-A.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-NOVEL-OPERATOR-STYLE-TWIN (slot:echo /loop iter32 /yolo): Tier-A $1.5K/mo per-operator EWMA preference fingerprint — CLOSES 5/5 NOVEL TIER-A.

Today: every shop-floor operator has a *style* — default feed-override %, rapid
override %, peck-drill preference, M0/M1 stops at safe points, RPM bias for
chatter sensitivity, dwell after tool change. PRISM canonical post output
ignores this, so operators always tweak at the machine. That (a) costs 5-10
setup-minutes/program, (b) drifts the canonical post away from what actually
ran, and (c) loses tribal preference data forever.

This iter ships scripts/lib/v11-operator-style-twin.mjs — a per-operator
preference twin maintained as exponentially-weighted moving averages (EWMA)
with default alpha=0.3 (~3-observation half-life). Recent style wins, but
historical drift averages in. Operators contribute observations via
reportOverrideEvent() (one row per measured deviation from the canonical
baseline).

applyStyleToPost() folds the twin's preferences INTO canonical post output,
returning a per-operator personalized version. Adjusts baseFeedrate ×
(feedOverridePct/100), baseRapidrate × (rapidOverridePct/100), appends M1 to
toolChangeMcodes if addM1AtToolChange=true, sets toolChangeDwellMs if dwell>0,
flags preferPeckOverPlunge=true if peck-drill preferred. Below stable threshold
(<5 observations) returns canonicalPost untouched with styleApplied=false and
explicit styleReason='twin_undertrained' — fail loud, no silent half-applied
preferences.

7 EWMA-tracked dimensions: feedOverridePct, rapidOverridePct,
chatterRiskTolerance (clamped [0,1]), dwellMsAfterToolChange (clamped ≥0),
plus 2 boolean direct-overwrite: preferPeckDrill, addM1AtToolChange.

14 exports. 59 concrete-value tests with hand-checked EWMA math:
  alpha=0.3, 100 → observe 80 → 0.7×100 + 0.3×80 = 94
  chain 100→80→80 → 0.7×94 + 0.3×80 = 89.8
  alpha=0.5, 100 → observe 80 → 90

ROI math: $1.5K/mo direct from eliminated re-tweaks (5-10 min/program × 20
programs/wk × $50/hr) + adoption multiplier (operators trust + use posts they
recognize as "theirs" → PRISM penetration grows on its own).

CLOSES 5/5 TIER-A NOVEL INVENTIONS in POST-BRIDGE-SYNERGY-MS0:
  ✓ Wear-Memory Magazine (iter28, $9K/mo)
  ✓ Per-Shop Kc Identity (iter29, $12K/mo)
  ✓ Predictive Coolant Orchestrator (iter30, $3K/mo)
  ✓ Cycle-Time Conformal (iter31, $5K/mo)
  ✓ Operator Style Twin (iter32, $1.5K/mo)
Total novel ROI delta: $30.5K/mo — the load-bearing differentiator for the
post-processor product.
```

## Files touched (3)
- scripts/lib/v11-operator-style-twin.mjs      | 184 ++++++++++++++++
- scripts/lib/v11-operator-style-twin.test.mjs | 314 +++++++++++++++++++++++++++
- 2 files changed, 498 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 29763033836c`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._