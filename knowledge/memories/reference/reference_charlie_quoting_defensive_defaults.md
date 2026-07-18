---
name: reference_charlie_quoting_defensive_defaults
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.512Z
aliases: reference_charlie_quoting_defensive_defaults
---


Quoting engines that consume runtime state (drift JSON, bootstrap distribution, alert state) must handle null / undefined / non-object inputs WITHOUT crashing — emit a diagnostic-banner alternative instead.

**Test matrix per such export:** 4 alert levels (ok/info silent, warn/alert emit), null + undefined + non-object guards, a stable N-key result shape, missing-file → silent, parse-error → diagnostic banner. This is the defensive-default discipline that keeps the quoting pipeline from cascading a single bad state file into a crash. Pairs with the R12 fail-loud rule: degrade loudly with a banner, never silently swallow.
