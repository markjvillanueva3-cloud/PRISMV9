---
name: reference_post_ship_quoting-synergy-ms0-u-qp-first-live-chain-evidence
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-FIRST-LIVE-CHAIN-EVIDENCE (commit 67e1b53aa). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.009Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-first-live-chain-evidence
---


# QUOTING-SYNERGY-MS0/U-QP-FIRST-LIVE-CHAIN-EVIDENCE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-FIRST-LIVE-CHAIN-EVIDENCE (slot:charlie /goal-yolo iter33): proved iter9-32 substrate runs end-to-end on the live machine + surfaced a real PRE-ITER13 staleness finding in the production baseline data per R12 fail-loud. Ran 'node scripts/quoting-docustrata-pipeline.mjs --json' against live state/shared/quoting/baseline-records.json. Result: ok=true, stage=done, 100/100 match, 0 validation warnings, override range $117.01-$155.34, output baseline-records-with-synth.json. THIS PROVES iter18-21 chain (bridge + validator + synth + orchestrator) composes correctly under production conditions, not just contrived fixtures. REAL FINDING surfaced: the on-disk baseline-records.json is PRE-ITER13 — lacks machine_class field, has flat defaults (1800s/$95/$50) everywhere, customer 'PRISM_UPGRADED' instead of real JM Die names. Tight 1.32x revenue spread is the symptom; expected ~3x spread with proper iter13 variance. Root cause: file was generated iter4-6, cron hasn't rerun bootstrap since iter13 (71e08eae58) landed. Remediation: one command 'node scripts/quoting-baseline-bootstrap.mjs --limit 200 --summary --scan-archive' regenerates with iter13 + iter16 variance. Per R12: surfaced rather than hidden. Cross-refs FIRST-TRAINING-CYCLE-EVIDENCE.md (iter6 sibling) and the session memory open-finding list. Total iter9-33: 24 code units + 7 doc surfaces + 281 verified tests + 1 live-run proof + 1 real-data staleness finding documented.

**Shipped:** 2026-05-26T04:36:20-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[quoting-synergy-ms0-u-qp-first-live-chain-evidence]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._