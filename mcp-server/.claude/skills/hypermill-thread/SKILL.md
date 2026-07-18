---
description: Look up thread standards, tap drill sizes, and generate hyperMILL thread milling cycle parameters
model: sonnet
effort: HIGH
---

# /hypermill-thread

## Args: $ARGUMENTS

Look up thread data and recommend hyperMILL thread milling or tapping cycle parameters.

Expected args: `<M10x1.5|1/4-20|BSP-1/4> [material=<name>] [method=<milling|tapping>]`

## Steps

1. Call `prism_cam` → `cam_thread_lookup` with the thread designation
   - Returns: pitch, major/minor/pitch diameter, tap drill size, standard
2. Call `prism_cam` → `cam_hypermill_cycle_recommend` with:
   - `feature_type`: "thread"
   - `diameter_mm`: nominal thread diameter extracted from designation
3. Call `prism_cam` → `cam_cycle_catalog` filtered to "tapping" category for cycle options

## Present to User

Show:
- Thread designation details: pitch, major/minor diameters
- Tap drill size [mm] with standard reference
- Recommended cycle: Thread Milling or Tapping with factory defaults
- For tapping: synchronised spindle feed = pitch × RPM
- For thread milling: helical path parameters, number of passes
- Controller notes (rigid tapping M29 for Fanuc, SYNFCT for Siemens)
