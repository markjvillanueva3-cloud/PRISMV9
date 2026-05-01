---
description: Run all hyperMILL SafetyHooks validators to check toolpath safety and constraint compliance
model: sonnet
effort: HIGH
---

# /hypermill-safety-audit

## Args: $ARGUMENTS

Run the full hyperMILL safety validation chain against toolpath parameters or a job configuration.

Expected args: `[material=<name>] [tool_diameter=<mm>] [depth=<mm>] [controller=<id>] [cycle=<type>]`

## Steps

1. Call `prism_cam` → `cam_safety_validate` with all provided parameters
   - Runs HyperMillSafetyHooks: depth-to-diameter ratio, feed limits, clearance check
2. If cycle is provided, call `cam_hypermill_validate_cycle_defaults` with factory defaults
   - Returns warnings (>30% deviation) and blocks (impossible values)
3. Call `prism_safety` → `safety_gate` for S(x) score if physics params available

## Present to User

Show safety audit results as a table:

| Check | Status | Detail |
|-------|--------|--------|
| Depth/Diameter ratio | PASS/WARN/FAIL | L/D = X.X |
| Feed rate | PASS/WARN/FAIL | fz = X.X mm/tooth |
| Clearance plane | PASS/WARN/FAIL | Z = X.X mm |
| Stepdown deviation | PASS/WARN | ±X% from factory |
| Spindle speed | PASS/FAIL | X RPM (max: XXXXX) |

Blocks are highlighted in red. Warnings in yellow. S(x) score shown if computed.
