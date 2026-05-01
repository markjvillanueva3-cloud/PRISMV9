---
name: autofire-consistency-after-pipeline
type: autofire
description: Suggest /physics-verify after pipeline actions (sf_orchestrate, print_to_program_full, cnc_simulate, pp_run_full) complete to check cross-engine consistency
trigger_pattern: "sf_orchestrate.*complete|print_to_program.*complete|cnc_simulate.*complete|pp_run_full.*complete|speed.feed.*orchestrat|program.*pipeline.*done|simulation.*complete|post.process.*complete"
action: suggest
message: "Run `/physics-verify` to cross-check physics consistency across all engines used in this pipeline run. Detects force/life/thermal divergence before committing to production parameters."
enabled: true
---
