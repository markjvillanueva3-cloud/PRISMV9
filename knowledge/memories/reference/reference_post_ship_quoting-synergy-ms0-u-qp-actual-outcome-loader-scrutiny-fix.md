---
name: reference_post_ship_quoting-synergy-ms0-u-qp-actual-outcome-loader-scrutiny-fix
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-ACTUAL-OUTCOME-LOADER-SCRUTINY-FIX (commit 6b0f4d271). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.003Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-actual-outcome-loader-scrutiny-fix
---


# QUOTING-SYNERGY-MS0/U-QP-ACTUAL-OUTCOME-LOADER-SCRUTINY-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-ACTUAL-OUTCOME-LOADER-SCRUTINY-FIX (slot:charlie): close 2 arm-C P1s on the closed-loop loader (3-of-3 panel: A+B PASS, C FAIL->fixed). (P1a) provenanceCheck() swallowed the catch -> a crashed ActualCostEngine looked IDENTICAL to 'no data yet' (silent infra-failure, ironic for a fail-loud engine). Fix: distinguish verdict:'error' (source threw -> signals carries 'loader-error: <msg>') from verdict:'empty' (genuine no-data); both stay may_promote:false. Extended OutcomeProvenance.verdict union +'error' (type-safe, downstream blocks promotion same as synthetic). (P1b) listJobIds() reached into actualCostEngine.estimates (a PRIVATE field) via runtime cast -> silent crash on any rename, 0 compile guard. Fix: added public ActualCostEngine.listJobIds() accessor; loader calls it (no private reach-in). +2 R9 tests (error-verdict-not-empty pin + listJobIds accessor pin), 13->15 pass. Independently re-verified: error surfaced, 0 private reach-in, 15/15.

**Shipped:** 2026-06-10T23:34:48-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[quoting-synergy-ms0-u-qp-actual-outcome-loader-scrutiny-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._