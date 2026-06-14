---
name: reference_post_ship_post-bridge-synergy-ms0-u-v11-holderfactor-fix
description: Auto-distilled learnings from shipping POST-BRIDGE-SYNERGY-MS0/U-V11-HOLDERFACTOR-FIX (commit 066163ce1). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.647Z
aliases: reference_post_ship_post-bridge-synergy-ms0-u-v11-holderfactor-fix
---


# POST-BRIDGE-SYNERGY-MS0/U-V11-HOLDERFACTOR-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-V11-HOLDERFACTOR-FIX (slot:echo /loop iter22 /yolo): close v11 line-70 silent runtime error visible in JM DIE/HURCO CNC PROGRAMS/v11 test.hnc as '(PRISM: Calculation error holderFactor is not defined - using Fusion defaults)'. ROOT CAUSE: calculateOptimizedSpeed() in JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_v11.cps line 12513 references holderFactor but the v10→v11 TIR refactor renamed the local var to tirFactor at line 12453; the returned factors object literal was never updated. ReferenceError silently swallowed by Fusion's warning() wrapper. Mainline mcp-server/data/posts/prism-enhanced/HURCO_VM30i_PRISM_v11.cps already correct at line 12474 — bug was a JM Die hot-fix drift never backported. FIX: line 12513 holder: holderFactor → holder: tirFactor + inline provenance comment. VERIFICATION: existing mcp-server/src/__tests__/cps-scope-linter.test.ts (U-SH01, acorn-AST zero-false-positive) run against fixed JM Die copy returns 20/20 PASS. JM DIE/ is .gitignore'd (customer data) so fix is in-place; this commit ships the close-out spec + HTML companion documenting the diagnosis + verification. NEXT ITER QUEUED: U-V11-AUTO-POCKET-FROM-LIBRARY (unit 2 of 135 in envelope) — read UserTool.magazine_position to eliminate v10/v11 tool-pocket tedium. Also surfaced 2 follow-up units for the envelope: U-V11-CPS-DRIFT-MONITOR (cron the linter against all customer-deployed CPS) + U-V11-MAINLINE-DEPLOY-PIPELINE (auto-sync mainline CPS to customer dirs to prevent silent hot-fix drift).

**Shipped:** 2026-05-26T22:18:00-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[post-bridge-synergy-ms0-u-v11-holderfactor-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._