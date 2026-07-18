---
name: reference-monitor-persistent-unreliable
description: Claude Code Monitor tool persistent-mode auto-kills child after ~90s / 3 ticks regardless of script content. Verified with minimal-emit diagnostic. Use Bash run_in_background or Windows scheduled tasks for durable watchdogs.
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.560Z
aliases: reference_monitor_persistent_unreliable
---


# Claude Code Monitor persistent-mode is unreliable for long watches

Verified 2026-05-13 in slot alpha (claude-80d35610) while shipping a RAM/zombie watchdog. The Monitor tool `persistent: true` mode auto-kills the child with exit 255 after a few ticks regardless of script content or event cadence.

## Reproduced

Three watchdog scripts, all killed at exit 255:

1. **ram-zombie-watch.mjs** (full watchdog): killed after ~90s.
2. **ram-zombie-watch.mjs** (single-write-per-tick + 5-min per-condition cooldown): killed after ~90s.
3. **watch-minimal.mjs** (10-line script that emits a timestamp every 30s and nothing else): emitted 2 ticks (t=30s, t=60s), killed at t=90s with exit 255.

Minimal-emit case rules out "script crashed" or "too many events" — the Monitor tool itself kills children, despite the doc claiming `persistent: true` runs "until you call TaskStop or the session ends."

## What works instead

- **Foreground Node script** invoked via Bash tool with `&` + `sleep N` + `kill`: works.
- **Bash tool `run_in_background: true`**: works for one-shot tasks.
- **Windows scheduled tasks**: PRISM already runs 4 (PRISM Hook Janitor 2min, PRISM Node Orphan Cleaner 5min, PRISM Orphan Process Reaper PS 5min, PRISM Zombie Reaper v2 5min), all healthy.

## Implication for tooling

For PRISM fleet hygiene, the 4 scheduled tasks are the durable layer. Live in-chat alerts via Monitor are unreliable — don't ship workflows depending on persistent Monitor children. The `ram-zombie-watch.mjs` script kept as a foreground Node runnable auto-detects the 4 scheduled tasks and downgrades to ALERT-ONLY mode (no reaper spawn) to avoid taskkill /T races.

Skill mapping for live alerts:
- One-shot wait-for-condition → Bash `run_in_background` with an `until` loop
- Multiple events per occurrence → Monitor tool, BUT short-bounded only; do NOT rely on persistent mode
- Long durable watch → Windows scheduled task writing to `state/shared/` and let SessionStart/UserPromptSubmit hooks surface results

## Related

- [[reference_harness_hang_prevention]] — the existing 4 scheduled tasks are documented there
- [[feedback_conflict_fork_rule]] — the watcher's auto-detect of scheduled tasks prevents racing them during multi-chat operation


## Related
[[skills/zombie|/zombie]] • [[skills/shared|/shared]]