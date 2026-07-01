---
name: feedback_charlie_quoting_drift_freshness
description: Quoting standing rule — pre-flight the bootstrap-distribution / drift-state freshness before any training run
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.418Z
aliases: feedback_charlie_quoting_drift_freshness
---


Before training or regenerating a quoting baseline, pre-flight the freshness of the bootstrap distribution and drift state.

**Why:** a stale distribution silently poisons the baseline (the iter58 lesson: an unfiltered distribution put Okuma-as-customer into a 50-record poisoned baseline). Quote accuracy degrades without a loud signal.

**How to apply:** read `state/shared/quoting/latest-drift-alert.json` (the canonical drift surface) and gate on its freshness BEFORE training; `scripts/quoting-alert-banner.mjs` formats it for a SessionStart banner. Use the raw fractional staleness for the gate compare, not a rounded value (see [[reference_charlie_quoting_round_boundary]]). Record actuals via `xproc_calibration_monitor_record` so india's drift-canary fires retrain at the right time.
