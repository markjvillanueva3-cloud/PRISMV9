---
name: remediation-scorecard
description: Track warn-to-autofix conversion progress. Shows how many of the original 71 warn rules have been converted to auto-fixes.
model: haiku
effort: low
allowed-tools: Read, Grep, Glob
---

# Remediation Scorecard

Analyze the PRISM hook system's warn-to-autofix conversion progress.

## What to do

1. Read `~/.claude/hooks/pretooluse-unified.sh` and `~/.claude/hooks/lib/common.sh`
2. Count instances of each action type:
   - `deny(` — hard blocks (strongest)
   - `rewrite(` or `rewrite_input(` — auto-rewrites (auto-fixes)
   - `auto_fix_*` or `auto_cap_*` or `auto_scope_*` — auto-fix function calls
   - `hint(` — soft warnings (weakest, target for conversion)
3. Calculate:
   - **Total warnings remaining** (hint calls)
   - **Total auto-fixes** (rewrite + rewrite_input + auto_fix_* calls)
   - **Total denies** (deny calls)
   - **Conversion rate**: (auto-fixes + denies) / (auto-fixes + denies + hints) * 100
   - **Target**: Original 71 warns should be reduced to <=15. Report progress.
4. List remaining hint() calls with line numbers and brief description
5. Suggest top 5 candidates for next conversion wave

## Output format

```
=== PRISM Hook Remediation Scorecard ===
Denies:      XX (hard blocks)
Auto-fixes:  XX (rewrites + auto-fix functions)  
Warnings:    XX (hints remaining)
Conversion:  XX% (target: >=80%)
Gap to target: XX warns to convert (target <=15)

Top remaining warn candidates:
1. Line XXX: <description> — suggest: <rewrite/deny>
2. ...
```
