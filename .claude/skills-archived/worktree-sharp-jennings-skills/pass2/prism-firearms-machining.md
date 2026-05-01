---
name: prism-firearms-machining
description: 'Firearms machining guide. Use when the user manufactures barrels, receivers, or other firearm components requiring rifling, chamber reaming, headspace gauging, or barrel making processes.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M108
  industry: firearms
---

# Firearms Machining

## When to Use
- Barrel drilling, reaming, and rifling (button or cut)
- Chamber reaming and headspace verification
- Receiver machining (AR-15, bolt-action, etc.)
- Barrel profiling, threading, and crowning

## How It Works
1. Select barrel blank material and process (4150 CMV, 416R SS)
2. Configure deep-hole drilling via `prism_calc→deep_hole_drill`
3. Calculate rifling parameters (twist rate, groove depth, land count)
4. Plan chamber reaming sequence (rougher → finisher → headspace gauge)
5. Profile, thread, and crown barrel on CNC lathe

## Returns
- Deep-hole drilling parameters (gun drill feed, RPM, coolant pressure)
- Rifling specification (twist rate, groove count/depth, bore diameter)
- Chamber reaming sequence with headspace verification
- Barrel profile turning parameters and thread specifications

## Example
**Input:** "Machine 5.56 NATO barrel, 16 inch, 1:7 twist, 4150 CMV steel"
**Output:** Deep-hole drill: 0.199" pilot, gun drill at 350 RPM, 0.0008 IPR, 1200 PSI coolant. Ream: 0.2185" bore. Rifle: button pull, 1:7" RH twist, 6 groove, 0.004" groove depth. Chamber: 5.56 NATO reamer (rougher at 60 RPM, 0.001 IPR, finisher at 40 RPM, 0.0005 IPR). Headspace: GO gauge 1.4636" (must close), NO-GO 1.4666" (must NOT close). Profile: CNC lathe contour, M4 barrel extension thread 1"-16 UNF. Crown: 11° target crown, hand-lap bore last 2".
