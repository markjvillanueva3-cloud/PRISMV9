---
name: reference_nngraph_retrain_warn_rootcause_2026_06_24
description: Definitive root cause of the recurring every-Stop "PRISM scheduled-task safety net WARN -- NN-Graph Retrain=stale" -- the task is classified status:stale (enabled-but-not-running), NOT disabled, and the migration freeze STRICTLY excuses only `disabled` tasks (intentional, so it never masks a broken task). Not a code bug; operator/golf action. Stops future chats from re-investigating.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.663Z
aliases: reference_nngraph_retrain_warn_rootcause_2026_06_24
---


# Recurring "NN-Graph Retrain=stale" Stop-WARN -- root cause (india 2026-06-24)

The every-Stop `fleet-task-health-stop.mjs` advisory keeps showing
`PRISM scheduled-task safety net WARN ... PRISM NN-Graph Retrain=stale` (and Tribal Embed). Chased
it to ground (it is india's domain task -- the GNN retrain that would consume the +11 vault labels).

## Root cause (NOT a bug -- intentional strict behavior)
- Telemetry row (`state/shared/fleet-task-health-history.jsonl`, the row the Stop hook renders):
  `level:warn`, `degraded:[{name:"PRISM NN-Graph Retrain", status:"stale"}]`. It is **`stale`**
  (exists + enabled but last-run older than its window), **NOT `disabled`**.
- `MIGRATION-FREEZE-ACTIVE.flag` (operator HW/drive-migration freeze, active since 2026-06-09)
  excuses frozen tasks -- but `scripts/fleet-task-health-watch.mjs` (~L953/970) is **STRICT: only the
  exact `disabled` status is excused** under the freeze (`migrationFreezeActive && !loadBearing.has(name)`
  applies to the disabled branch). The comment is explicit: strict so the freeze never MASKS a
  genuinely-broken (wedged/erroring/stale) task. So a `stale`-enabled task is deliberately STILL flagged.
- Hence: the freeze covers DELIBERATELY-DISABLED tasks; NN-Graph Retrain is `stale`-enabled, so the
  freeze does not (and by design should not) silence it. The WARN is correct strict behavior, not a defect.

## Why the task is stale (most likely)
The HW/drive migration moved its environment; the scheduled task is still registered+enabled but its
trigger/action isn't firing (path moved / service stopped) -> last-run goes stale. The operator paused
the fleet via the freeze but did not formally DISABLE this particular task (which would have excused it).

## Fix = operator / golf (NOT india, NOT a code change to the strict logic)
- Re-arming/re-registering is FORBIDDEN for a work slot (rails: never arm a frozen maint cron) + needs
  an ELEVATED shell. India does not touch it.
- Operator options: (a) formally `Disable-ScheduledTask "PRISM NN-Graph Retrain"` for the freeze
  duration -> reclassifies disabled -> freeze excuses it -> WARN stops; OR (b) post-migration, fix the
  trigger/action + re-register (`.claude/helpers/install-*-task.ps1`, elevated) -> it runs -> not stale;
  OR (c) golf design call: extend the freeze excuse to `stale` (NOT just `disabled`) for non-load-bearing
  tasks during a migration -- but that weakens the "never mask a broken task" guarantee, so it is golf's
  judgment, not a unilateral cross-lane edit. Do NOT edit the strict `disabled`-only logic without golf.
- The intended-to-silence path (the flag's docstring "stops crying wolf") only covers `disabled`; a
  `stale` task slipping through is the documented strict edge, not a regression.

## Bearing on india's GNN work
The stale NN-Graph Retrain task is exactly the operator-gated GPU retrain that auto-applies the +11
vault labels ([[reference_gnn_confirmed_wiring_labels_2026_06_24]]) + re-grades macro-F1. Until the
operator runs/re-registers it (post-migration, elevated), the labels stay staged+proven-minable. This
is the SAME operator gate india already documented; this memo just explains the recurring WARN behind it.
Sibling: [[project_scheduled_task_migration_freeze_2026_06_08]].
