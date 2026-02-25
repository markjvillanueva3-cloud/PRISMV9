---
name: prism-session-script-runner
description: Execute enhanced startup/shutdown scripts, interpret their results, and take corrective action — the operational guide for DA-MS11 session lifecycle
---
# Session Script Runner

## When To Use
- Beginning a session and want DA cadence system validation
- Ending a session and want quality metrics + hook audit captured
- "How do I check if the cadence system is healthy?" / "What's my session readiness?"
- Interpreting startup readiness scores or shutdown quality grades
- Taking corrective action when scores are low
- NOT for: tuning intervals (use prism-cadence-tuning) or general session management (use prism-session-lifecycle)

## How To Use
**ENHANCED STARTUP — Run after standard boot:**
```bash
py -3 C:\PRISM\scripts\session_enhanced_startup.py --phase DA
py -3 C:\PRISM\scripts\session_enhanced_startup.py --json          # machine-readable
py -3 C:\PRISM\scripts\session_enhanced_startup.py                 # auto-detect phase
```

**INTERPRETING STARTUP RESULTS:**
```
Readiness Score (0-100):
  90-100 (A): All systems go. Phase skills loaded, hooks configured, NL healthy.
  75-89  (B): Minor issues. Likely NL hooks missing or moderate pressure.
  60-74  (C): Gaps detected. Check deductions list, fix before heavy work.
  40-59  (D): Significant problems. Multiple subsystems degraded.
  0-39   (F): Critical. Session may not function correctly.

Deduction Categories:
  Skill index error (-25): SKILL_INDEX.json missing or malformed
  No phase skills matched (-15): Phase not in skill phases arrays
  Hook matrix error (-25): HOOK_ACTIVATION_MATRIX.md missing/broken
  No expected hooks for phase (-10): Phase not defined in matrix
  NL hooks missing (-15): No NL hook engine patterns or disk files
  NL hooks code-only (-5): Patterns in code but no persisted files
  Critical pressure >85% (-25): Context almost full
  High pressure >70% (-15): Context getting tight
  Moderate pressure >50% (-5): Context usage elevated
```

**CORRECTIVE ACTIONS BY DEDUCTION:**
| Deduction | Fix |
|-----------|-----|
| Skill index error | Rebuild SKILL_INDEX.json: `py -3 C:\PRISM\skills-consolidated\scripts\build_index.py` |
| No phase skills | Add phase to skill SKILL.md frontmatter phases array |
| Hook matrix error | Check HOOK_ACTIVATION_MATRIX.md exists and has valid table format |
| No expected hooks | Add phase row to HOOK_ACTIVATION_MATRIX.md |
| NL hooks missing | Create NL hooks via `prism_nl_hook → create` |
| Critical pressure | Run `prism_context → context_compress` or start new session |

**ENHANCED SHUTDOWN — Run before session end:**
```bash
py -3 C:\PRISM\scripts\session_enhanced_shutdown.py --summary "built DA-MS11 cadence"
py -3 C:\PRISM\scripts\session_enhanced_shutdown.py --json
```

**INTERPRETING SHUTDOWN RESULTS:**
```
Quality Score (0-100):
  Same A-F grading as startup readiness.

Key Metrics:
  Duration: session length from startup to shutdown
  Tool Calls: total MCP actions taken
  Checkpoints: state snapshots created (CP-* files)
  Cadence Fires: how many times auto-fire functions triggered
  Hook Coverage: expected hooks that actually fired (%)
  Skills Injected: skills loaded into context during session

Quality Penalties:
  No productive work (0 calls, <1 min): -30
  Hook coverage <50%: -20
  Hook coverage 50-79%: -10  
  No cadence fires: -15
  No skills injected despite >10 available: -5
```

**AUTOMATED SESSION LIFECYCLE:**
For MCP-integrated startup/shutdown, the scripts are also callable from:
```
prism_skill_script → script_execute → session_enhanced_startup
prism_skill_script → script_execute → session_enhanced_shutdown
```

**SESSION HISTORY TRACKING:**
Shutdown appends to `C:\PRISM\state\session_history.jsonl` (one JSON line per session).
Query history: `py -3 -c "import json; [print(json.loads(l)) for l in open(r'C:\PRISM\state\session_history.jsonl')]"`
Track trends: quality scores, hook coverage, cadence utilization across sessions.

## What It Returns
- Startup: readiness score, phase skills count, hook matrix coverage, NL hook health, context pressure
- Shutdown: quality score, cadence fire counts, hook coverage audit, skill usage stats, session duration
- Persisted logs: `session_startup_log.json`, `session_shutdown_log.json`, `session_history.jsonl`
- Actionable deductions with specific fix procedures

## Examples
- Input: "Start session and check DA readiness"
  Run: `py -3 C:\PRISM\scripts\session_enhanced_startup.py --phase DA`
  Result: Readiness 85/100 (B), 141/164 skills matched, NL hooks missing (-15)
  Action: Create NL hooks for DA phase via `prism_nl_hook → create`

- Input: "End session with quality capture"
  Run: `py -3 C:\PRISM\scripts\session_enhanced_shutdown.py --summary "completed DA-MS11 step 8"`
  Result: Quality 75/100 (B), 12 cadence fires, hook coverage 80%, 3 skills injected
  Action: results persisted to session_history.jsonl for trend tracking

- Input: "Session readiness is F grade, what do I do?"
  Check deductions list. If skill index error: rebuild index. If hook matrix error: verify file exists.
  If critical pressure: compress context or start fresh session.
  Fix each deduction, re-run startup, verify improvement.
