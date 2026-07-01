---
description: Full session bootstrap via psk — 4 syscalls (checkin composite + position + handoff read + pick). Heavyweight; use /boot for 1-2s orientation.
allowed-tools: Bash, Read
effort: high
maxTurns: 25
composes_with:
  - "/boot"
  - "/checkin"
  - "/handoff"
  - "/pick-unit"
  - "/precompact"
  - "/system-viz"
consumes:
  - "prism_dev:quality_dashboard"
---
# /startup — full session bootstrap via psk

Heavyweight session-start: 4 psk syscalls = fleet check-in + position +
handoff RESUME + top picks. SessionStart hooks already injected awareness +
master-index + memory recall — do not re-fetch. For a 1–2s "who-am-I"
orientation use `/boot`.

## Run (4 psk syscalls)

```bash
node H:/prism/.claude/kernel/psk.mjs checkin  --pretty --subcommand composite --branch "$(git -C H:/prism rev-parse --abbrev-ref HEAD)" --activity startup
node H:/prism/.claude/kernel/psk.mjs position --pretty
node H:/prism/.claude/kernel/psk.mjs handoff  --pretty --subcommand read
node H:/prism/.claude/kernel/psk.mjs pick     --pretty --limit 3
```

## §Report (one block from the 4 JSON results)

**Identity** slot/branch/sessionId · **Drift** envelope-vs-git · **Hygiene**
uncommitted/staged/ahead-behind · **BUILD_STATE** wired/unwired/pending ·
**RESUME** line from handoff (or `(no handoff)`) · **Next picks** top 3.

The SessionStart hooks already injected awareness-snapshot · master-index ·
memory-recall · BUILD_STATE · close-out-candidates · slot pin · terminal pin.
Trust the injection — do not re-fetch.

## Execute the work order

If the user's prompt carries arguments (a unit, a `/loop`, a `/goal`,
`pick a unit`, a verbatim filepath) treat them as the **primary deliverable**
per [[feedback_checkin_args_are_primary_work_order]] and enter the autonomous
loop in [[checkin-loop-fullstack]]. If no args, stop after the §Report.

**Executor routing (token economy):** resolve each step's lane via the `/smart` executor contract (`resolveExecutor` in `.claude/hooks/lib/ollama-cost-router.mjs`) — route mechanical text/code ops (explain · summarize · docstring · classify · lint · diff-summary · error-triage) to local Ollama (`node scripts/ask-ollama.mjs <mode> <file>`, $0); reserve Claude for judgment + safety (R5); isolate COMPLEX multi-file units in worktree subagents. Fail loud + keep the step on Claude if `:11434` is down.

## Manual fallback (if psk is unavailable)

```bash
node H:/prism/.claude/helpers/chat-slots.mjs reclaim && \
  node H:/prism/.claude/helpers/chat-slots.mjs claim --activity startup
node H:/prism/scripts/pick-unit.mjs --limit 3 --json
```

— Hand-tuned 2026-05-19, COMMAND-KERNEL-MS0/U-CK09 (thin psk client; was 384 lines).
