---
name: smart-apply
description: "Apply SMART CONFIG settings to the current session — sets model routing, effort level, agent model overrides, and output formatting based on detected task complexity."
model: haiku
effort: low
---

# /smart-apply — Apply SMART CONFIG to Session

When invoked, read the most recent SMART CONFIG output from conversation context.

Apply these settings for all subsequent tool calls in this session:

1. **Model**: When spawning agents, use the model from SMART CONFIG
   - HAIKU: Use haiku for all Agent tool calls
   - SONNET: Use sonnet for all Agent tool calls
   - OPUS: Use opus for all Agent tool calls

2. **Effort**:
   - LOW: Skip extended thinking, use haiku agents, direct answers only, no exploration
   - MEDIUM: Standard thinking, sonnet agents, read-before-edit, one verification pass
   - HIGH: Extended thinking, opus for complex tasks, verify after changes, run builds/tests
   - MAX: Maximum thinking, opus always, Monte Carlo verification, multi-pass validation, read all related files

3. **Output Mode**: If Cowork/Dispatch detected (PRISM_COMPACT_OUTPUT=1 or CLAUDE_COWORK=1 or CLAUDE_DISPATCH=1), use compact formatting:
   - Max 80 chars per line
   - OK/WARN/FAIL status prefixes
   - Tables: 3 col max, 5 row max
   - Basename-only file paths
   - No verbose explanations

4. **Team Auto-Dispatch**: If task matches team patterns, auto-spawn:
   - Engine creation -> forge team
   - Test commands -> test team
   - Pipeline tasks -> pipeline team

This skill is called automatically by /smart -- you do not need to invoke it manually.

## How to Apply Manually

If you see a SMART CONFIG block in conversation but settings are not being followed, invoke `/smart-apply` to re-read and enforce the configuration.

The skill will:
1. Parse the most recent SMART CONFIG block
2. Output a confirmation of applied settings
3. All subsequent tool calls will respect the configuration

## Confirmation Format

```
SMART-APPLY: Settings active
  Model:  {model} | Effort: {effort} | Output: {normal|compact}
  Team:   {none|forge|test|pipeline}
```
