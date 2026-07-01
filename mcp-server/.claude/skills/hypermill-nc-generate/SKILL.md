---
description: Generate hyperMILL NC code using CodeGeneratorEngine AC script output
model: sonnet
effort: HIGH
---

# /hypermill-nc-generate

## Args: $ARGUMENTS

Generate a hyperMILL NC automation script or post-processor output snippet.

Expected args: `type=<ac_script|macro|job_setup> [controller=<id>] [feature=<type>] [material=<name>]`

## Steps

1. Call `prism_cam` → `cam_hypermill_ppp_defaults` with controller_id from args
   - Establish G-code dialect and post-processor settings
2. Call `prism_cam` → `cam_hypermill_code_generate` with:
   - `type`: from args (ac_script / macro / job_setup)
   - `controller_id`: resolved controller
   - `dialect`: from PPP defaults
3. Optionally call `cam_hypermill_cycle_recommend` to embed cycle parameters in generated code

## Present to User

Show:
- Generated AC script or macro with syntax highlighting
- Controller-specific header (G-code dialect, units, work offset setup)
- Key blocks: tool call, speed/feed initialization, cycle parameters
- Safety notes: dry run verification steps, first-part inspection points
- File save path suggestion: `<job_name>_<controller>_<date>.nc`
