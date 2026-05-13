# Envelope Drift Triage — 2026-05-13

Generated via `/envelope-drift-fix` doctrine. Operator: claude-7361b856 (delta slot).

## Auto-fixed (shipped-not-flipped — safe direction)

### HTML-PRIMARY-MS0
- **Before:** `status: "not_started"`
- **After:** `status: "in_progress"`
- **Evidence:** 1/7 units shipped per `MILESTONE_PROGRESS.json` (git log shows commits referencing this milestone's units)
- **Action taken:** envelope JSON updated; `lastUpdated` + `notes` annotated
- **Class:** `claims_not_started_but_has_shipped_units` (auto-fixable forward direction per doctrine)

## Surfaced for manual review (stale-completed — NEVER auto-fixed)

### MF-MS1 — claims completed but 0/4 shipped per git
- **Pattern:** `claims_completed_but_units_pending`
- **Possible explanations:**
  1. Envelope was prematurely closed (units never actually shipped — rollback to `in_progress`)
  2. Units were renamed/absorbed elsewhere and the envelope correctly reflects the *spirit* but git lookup misses the new names
  3. Work happened pre-tracking (commits exist but lack the `[MF-MS1]` scope tag for the build-milestone-progress.mjs grep)
- **Recommended next step:**
  ```bash
  # Find ANY commits mentioning "MF-MS1" or its unit IDs in title/body
  git log --grep="MF-MS1" --pretty=oneline | head -20

  # Read the envelope to see what the units were named
  cat mcp-server/data/milestones/MF-MS1.json | jq '.units // .unit_ids // .'
  ```
  If commits exist but lack the scope tag → leave envelope alone, fix the build-milestone-progress.mjs scope detector. If commits genuinely don't exist → rollback envelope to `not_started` or `in_progress`. **Do not auto-flip.**
- **Class:** `claims_completed_but_units_pending` (manual-only per [[reference_dev_velocity_autotrigger]] envelope-drift-fix doctrine)

### MF-MS2 — same pattern as MF-MS1
- **Pattern:** `claims_completed_but_units_pending`
- **Status:** `completed` claimed; 0/3 shipped per git
- **Recommended next step:** identical to MF-MS1 — operator triage
- **Class:** `claims_completed_but_units_pending`

## Larger drift backdrop (not addressed today)

`build-milestone-progress.mjs` reports **360 milestones with `drift` field set** (non-aligned), but only 3 of those (above) made it into the `BUILD_STATE.json` envelope-drift section. The other 357 are tagged `drift: "consistent"` — which means the script's drift-classifier considers them aligned by the `claimedStatus` vs `derivedStatus` mapping but flagged the field anyway. This is a **scope-detector signal-to-noise issue** in the build-milestone-progress.mjs script, not a fleet-wide drift epidemic. Track as a follow-up unit if it ever blocks an audit.

## Summary

| Milestone | Direction | Action | Rationale |
|-----------|-----------|--------|-----------|
| HTML-PRIMARY-MS0 | shipped-not-flipped | **AUTO-FIXED** | 1/7 shipped; safe forward flip |
| MF-MS1 | stale-completed | **MANUAL** | Operator must verify whether units shipped under different names before rollback |
| MF-MS2 | stale-completed | **MANUAL** | Same as MF-MS1 |

## See also

- `state/shared/MILESTONE_PROGRESS.json` (data source)
- `state/shared/BUILD_STATE.json` (drift surfacing layer)
- `mcp-server/data/milestones/HTML-PRIMARY-MS0.json` (envelope just patched)
- `mcp-server/data/milestones/MF-MS1.json` + `MF-MS2.json` (envelopes awaiting operator review)
- `.claude/commands/envelope-drift-fix.md` (skill spec; doctrine source)
- [[feedback_roadmap_close_out]] (the 4-surface rule)
