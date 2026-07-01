---
name: reference_golf_clean_ship__2026_06_18
description: Auto-captured by stop-auto-capture-per-slot for slot:golf — scrutiny-pass.
type: reference
slot: golf
source: prism-memory
synced: 2026-06-27T20:30:46.595Z
aliases: reference_golf_clean_ship__2026_06_18
---


3-of-3 PASS verdict for session. Arms: A=Arm A holistic PASS: down direction never suppressed past 120s, hard-block path untouched, 900s suppress window bounded (re-broadcasts on next live turn ok:false), env knob floored via Math.max, fail-safe verdict tested. No P0/P1. · B=Arm B test-integrity PASS: 18/18 pass 0 skipped/0 todo; exact 191s live value pinned + both 900s boundary sides + down-direction + env-tunable window + fail-safe inputs; both round-trips spawn real hook subprocess and assert reconnect-signal file (suppress 191s=>no signal, >900s=>signal). Reverting window fails tests at unit AND round-trip layer. Export/import clean. · C=

_Auto-promoted on Stop. If genuinely important, expand to a full reference memory; otherwise leave for the indexer._
