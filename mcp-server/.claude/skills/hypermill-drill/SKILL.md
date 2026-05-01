---
description: Look up drilling cycles, defaults, and tap drill sizes for hyperMILL drilling operations
model: sonnet
effort: HIGH
---

# /hypermill-drill

## Args: $ARGUMENTS

Look up hyperMILL drilling cycle parameters for a given drill diameter or thread designation.

Expected args: `diameter=<mm> [depth=<mm>] [thread=<M10x1.5>] [material=<name>] [controller=<fanuc|siemens|heidenhain>]`

## Steps

1. Call `prism_cam` → `cam_hypermill_cycle_recommend` with:
   - `feature_type`: "drill"
   - `diameter_mm`, `depth_mm` from args
   - `material`, `controller_id` from args (if provided)
   - `include_full_defaults`: true
2. If thread designation provided, call `prism_cam` → `cam_thread_lookup`:
   - Returns tap drill diameter for pre-drill sizing
3. Call `prism_cam` → `cam_cycle_catalog` filtered to "drilling" category for alternatives

## Present to User

Show:
- Recommended cycle (Drilling / Drill with Pecking / Deep Hole Drilling)
- Tap drill size if thread arg given (e.g. M10x1.5 → 8.5mm)
- Factory defaults: clearance plane, safe distance, feed (mm/rev), speed
- Controller adjustments (canned cycle codes for selected controller)
- Alternative cycles with reasons
