---
type: block
event: PreToolUse
tool: Bash
condition: command matches "^wc (-l |)" and command does not match "\|"
message: "TOKEN SAVE: Use Grep with count output_mode or Read to count lines. wc is a separate process for a simple count."
---
