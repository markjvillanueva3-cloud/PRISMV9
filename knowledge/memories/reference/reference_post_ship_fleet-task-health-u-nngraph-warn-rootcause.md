---
name: reference_post_ship_fleet-task-health-u-nngraph-warn-rootcause
description: Auto-distilled learnings from shipping FLEET-TASK-HEALTH/U-NNGRAPH-WARN-ROOTCAUSE (commit d90e92c53). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.863Z
aliases: reference_post_ship_fleet-task-health-u-nngraph-warn-rootcause
---


# FLEET-TASK-HEALTH/U-NNGRAPH-WARN-ROOTCAUSE

[MAIN-FORCE] [FLEET-TASK-HEALTH]/U-NNGRAPH-WARN-ROOTCAUSE (slot:india): diagnose the recurring every-Stop NN-Graph-Retrain=stale WARN -- task is status:stale (enabled-not-running) NOT disabled; the migration freeze STRICTLY excuses only disabled tasks (intentional, never mask a broken task), so a stale task is correctly still flagged. Not a code bug; operator/golf fix (disable-for-freeze OR re-register elevated OR golf freeze-policy call), never a unilateral cross-lane edit to the strict logic. Stops fleet re-investigation.

**Shipped:** 2026-06-24T22:02:47-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[fleet-task-health-u-nngraph-warn-rootcause]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._