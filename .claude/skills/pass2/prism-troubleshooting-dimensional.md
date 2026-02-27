---
name: prism-troubleshooting-dimensional
description: 'Dimensional accuracy troubleshooting guide. Use when parts are out of tolerance and the user needs to diagnose the source — thermal drift, tool wear, deflection, or fixturing.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M124
  category: operator-knowledge
---

# Troubleshooting Dimensional Accuracy

## When to Use
- Parts drifting out of tolerance during production run
- Systematic dimensional errors (consistent oversize/undersize)
- Random dimensional variation exceeding Cpk requirements
- Diagnosing: thermal drift, tool wear, deflection, backlash, fixturing

## How It Works
1. Collect measurement data (pattern, trend, magnitude, direction)
2. Classify error type: systematic vs. random, trending vs. sudden
3. Diagnose via `prism_intelligence→troubleshoot_diagnose`
4. Apply correction (offset, parameter change, or process fix)
5. Verify with SPC monitoring via `prism_quality→spc_setup`

## Returns
- Error pattern classification (drift, jump, oscillation, scatter)
- Root cause diagnosis with probability ranking
- Corrective action (immediate fix + long-term prevention)
- Monitoring plan to catch recurrence

## Example
**Input:** "Bore diameter drifting +0.015mm over 50 parts, 50mm H7 bore in 4140"
**Output:** Pattern: linear drift over 50 parts → likely causes: (1) Tool wear (85% likely) — boring bar insert flank wear causes diameter growth. Check: VB should be <0.15mm for H7 tolerance. Fix: replace insert, set tool life at 40 parts, auto-offset via probe cycle. (2) Thermal growth (10%) — if drift correlates with first-hour warm-up, implement probe-every-10th-part offset update. (3) Coolant temperature rise (5%) — check coolant tank temp trend. Quick fix: probe bore every 25th part, auto-update offset if drift >0.005mm. Set alarm at +0.010mm from nominal.
