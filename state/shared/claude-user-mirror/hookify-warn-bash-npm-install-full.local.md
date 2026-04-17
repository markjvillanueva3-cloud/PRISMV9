---
type: warn
event: PreToolUse
tool: Bash
condition: command matches "^npm install$" and command does not match "--save|--save-dev|-D|-S"
message: "TOKEN SAVE: Bare 'npm install' outputs verbose logs (1-5K tokens). Dependencies are already installed unless you just cloned."
---
