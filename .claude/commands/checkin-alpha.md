---
description: Force-claim slot ALPHA + run the full /checkin pipeline. NATO-phonetic shortcut for `/checkin --preferSlot alpha --force`. Always runs fleet-reaper (alpha owns it).
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion, Monitor
---

# /checkin-alpha — slot-locked /checkin + fleet-reaper

Force-takes the **alpha** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `alpha-work`, **always runs the fleet-reaper** (alpha owns it for the 7-chat fleet — see [[feedback_alpha_owns_reaper]]), then runs the standard `/checkin` pipeline. Use when you want this specific slot regardless of who currently holds it.

## Slot binding (replaces /checkin Step 2)

```bash
STABLE="claude-<8hex-from-Chat-Isolation-line>"
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="alpha"
TOPIC="alpha-work"

# Reap stale slots first, then force-take alpha from whoever holds it.
node H:/prism/.claude/helpers/chat-slots.mjs reclaim
node H:/prism/.claude/helpers/chat-slots.mjs claim \
  --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin" \
  --preferSlot $SLOT --force true --confirmRecent true
```

If the claim result carries `previousOwner`, surface it in the §Report — the evicted chat's id, topic, and last-heartbeat age are all useful context.

## Fleet-reaper (always — alpha owns the reaper)

This step is **non-skippable for `/checkin-alpha`**. The fleet-reaper is the 7-chat fleet's orphan-process janitor + GPU-coordinator, and alpha is its canonical owner (per [[feedback_alpha_owns_reaper]] + the `alpha-slot-reaper-guardian.mjs` SessionStart hook). Running it on every `/checkin-alpha` formalizes that doctrine instead of relying on the guardian hook alone.

### A. Fresh sweep + verdict
```bash
node H:/prism/scripts/fleet-reaper-sweep.mjs --once --json 2>&1 | tail -50
```
Read the JSON: `slots["owned-by-crashed"] / "leftover-bash-task" / "unowned"` are reap candidates · `softRelief.{priorityDemoted,workingSetTrimmed,rssReclaimedBytes}` shows reversible RAM relief · `gpu.{freeMb,utilizationPct}` + `ollama.{reachable,loaded[]}` show idle compute · `coordinator.{shouldPrewarm,prewarmFired,hintWritten,thresholdDelta,hintMode}` shows the Ollama routing-hint decision. Surface these in the §Report as the `fleet-reaper:` line.

### B. Ensure the durable scheduled task (5-min global cadence — survives chat exits)
```bash
schtasks /Query /TN "PRISM Fleet Reaper" 2>$null
```
If absent, the operator must register it from an **elevated** PowerShell — `/checkin-alpha` cannot auto-install (UAC). Surface the install command in the §Report:
> `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`

### C. Arm the in-session persistent Monitor (this chat only)
The `Monitor` tool gives a live event feed (one line per reap / soft relief / coordinator fire / caveat) for the lifetime of this chat. Use `persistent: true` so it runs until session-end or `TaskStop`. The Monitor is in `allowed-tools` specifically for this step.

```
Monitor({
  command: "node H:/prism/scripts/fleet-reaper-sweep.mjs --monitor-loop --interval 300",
  description: "fleet reaper: orphan reaps + soft relief + Ollama coordinator (slot alpha — sole owner)",
  persistent: true
})
```

Idempotence: the Monitor should be armed **once per chat**. If `TaskList` already shows a running fleet-reaper Monitor task for this session, skip step C — re-arming would just duplicate the event stream.

### D. Kill-switch awareness
A single env var disables ALL reaping fleet-wide regardless of which chat armed it:
`PRISM_FLEET_REAPER_DISABLE=1`. Surface in the §Report if it is set.

## Pipeline delegation

After the slot-claim above, execute the FULL `/checkin` pipeline from `H:/prism/.claude/commands/checkin.md`:

- **Slot-claim phase (steps 3-7)** — handoff bind under `alpha-work` topic · chat-bus read · drift check (`audit-roadmap-drift.mjs`) · commit hygiene (dirty/staged/ahead-behind/worktree) · 6b roadmap slice · 6c BUILD_STATE · 6d Obsidian recent · 6e system-viz ping · 6f CLAUDE.md staleness · 6g local-compute health · 6h fleet activity + pickup candidates · §Report.
- **Dev pipeline phase (steps 8-14)** — fires only when args contain a task directive (`/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or a verbatim filepath). Covers awareness inject verification, /system-viz-first audit doctrine, Obsidian-PRISM-OS routing, CLAUDE.md+GSD+skills+hooks+RTK token savings, /loop iter ticks, files-to-galaxy refresh, end-of-session pipeline (per-file scrutiny, 3-of-3 gate, close-out, doc reflection, commit, precompact, /compact, terminal-pin, /handoff).

The pipeline body is canonical in `/checkin` — do NOT duplicate it here. This skill is a slot-binding wrapper.

## Args forwarding

Any args after `/checkin-alpha` are treated identically to args passed to `/checkin`. Example: `/checkin-alpha /loop system-viz-brain until /goal` enters the dev pipeline + /loop loop.
