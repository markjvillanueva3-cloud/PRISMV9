---
description: Generate hyperMILL automation macro scripts using CodeGeneratorEngine
model: sonnet
effort: HIGH
---

# /hypermill-automation-script

## Args: $ARGUMENTS

Generate a hyperMILL automation macro (AC script or VBA) for batch job setup or recurring operations.

Expected args: `task=<job_create|tool_change|post_all|feature_detect> [job_name=<name>] [controller=<id>]`

## Steps

1. Determine script type from task arg:
   - job_create → AC script to create a new job with default settings
   - tool_change → AC script for tool change sequence
   - post_all → AC script to post-process all operations in a job
   - feature_detect → AC script for automatic feature recognition
2. Call `prism_cam` → `cam_hypermill_generate_macro` with task and controller_id
3. Call `prism_cam` → `cam_hypermill_code_generate` for the specific script body
4. Call `cam_hypermill_ppp_defaults` to embed correct post-processor paths

## Present to User

Show:
- Complete AC script with comments explaining each section
- Required hyperMILL version (31.0 / 33.0) compatibility note
- Script placement: hyperMILL Scripts folder path
- Trigger mechanism: button in toolbar or keyboard shortcut
- Test steps: dry run in hyperMILL Script Editor first
