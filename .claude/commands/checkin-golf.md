---
description: Force-claim slot GOLF + run the full /checkin pipeline. GOLF OWNS THE FLEET-REAPER (doctrine moved from alpha 2026-05-16). NATO-phonetic shortcut.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion, Monitor
composes_with:
  - "/checkin"
  - "/checkin-alpha"
  - "/pick-unit"
---
# /checkin-golf — slot-locked /checkin + fleet-reaper owner

Force-takes the **golf** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `golf-work`, **always runs the fleet-reaper** (golf owns it for the 13-chat fleet as of 2026-05-16 — see [[feedback_golf_owns_reaper]]), then runs the standard `/checkin` pipeline.

> **Doctrine shift 2026-05-16:** fleet-reaper ownership moved from **alpha → golf** to unify all fleet-hygiene under one slot (golf already hosts fleet-memory-monitor). The `golf-slot-reaper-guardian.mjs` SessionStart + UserPromptSubmit hook is the silent backstop; this skill makes the doctrine non-skippable on every explicit `/checkin-golf`. The prior `/checkin-alpha` fleet-reaper section has been removed. See [[feedback_alpha_owns_reaper]] (SUPERSEDED).

**Operator directive carry-over (2026-05-16, earlier in the day):** this skill claims golf as a **normal work slot**, NOT the legacy hygiene chat. It does NOT pass the `--golf` flag to `chat-slots.claim` (that flag was the historic hygiene-mode marker; the slot itself is just a string key).

## ⚠️ Pre-flight: disable or bypass the legacy allowlist hook

The `golf-slot-write-allowlist.mjs` PreToolUse hook still fires for any chat whose chat-slots state has `slot==="golf"` — it doesn't care which skill claimed the slot. It will block writes outside the legacy hygiene allowlist (named ledger/dashboard paths only).

Before doing real work in golf, choose ONE:

```bash
# Option A — session-scoped bypass (preferred for a single chat)
export PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1
# (bypass writes are logged to state/shared/golf-bypass.jsonl)

# Option B — disable the hook globally (edit C:/Users/wompu/.claude/settings.json only;
# the c-to-h-mirror hook auto-replicates to H:/.claude/settings.json on Edit/Write tool events,
# OR cp manually after a node-driven splice).
# Locate the PreToolUse entry referencing golf-slot-write-allowlist.mjs and remove it
# (preserve the .mjs file on disk per "never delete, only disable" rule).
```

If you don't disable the hook, every Write/Edit/MultiEdit outside the allowlist will be blocked with a hard error — exactly the original hygiene-mode behavior.

## Slot binding (replaces /checkin Step 2)

```bash
STABLE="claude-<8hex-from-Chat-Isolation-line>"
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="golf"
TOPIC="golf-work"

# Reap stale slots, then force-take golf from whoever holds it.
node H:/prism/.claude/helpers/chat-slots.mjs reclaim
node H:/prism/.claude/helpers/chat-slots.mjs claim \
  --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin" \
  --preferSlot $SLOT --force true --confirmRecent true
# NOTE: no --golf flag — operator directive is golf-as-work-slot.
```

If the claim result carries `previousOwner`, surface it in the §Report.

## Fleet-reaper (always — golf owns the reaper, doctrine moved from alpha 2026-05-16)

This step is **non-skippable for `/checkin-golf`**. The fleet-reaper is the 13-chat fleet's orphan-process janitor + GPU-coordinator + Ollama-routing-hint emitter, and golf is its canonical owner (per [[feedback_golf_owns_reaper]] + the `golf-slot-reaper-guardian.mjs` SessionStart + UserPromptSubmit hook). Running it on every `/checkin-golf` formalizes that doctrine instead of relying on the guardian hook alone.

### A. Fresh sweep + verdict
```bash
node H:/prism/scripts/fleet-reaper-sweep.mjs --once --json 2>&1 | tail -50
```
Read the JSON: `slots["owned-by-crashed"] / "leftover-bash-task" / "unowned"` are reap candidates · `softRelief.{priorityDemoted,workingSetTrimmed,rssReclaimedBytes}` shows reversible RAM relief · `gpu.{freeMb,utilizationPct}` + `ollama.{reachable,loaded[]}` show idle compute · `coordinator.{shouldPrewarm,prewarmFired,hintWritten,thresholdDelta,hintMode}` shows the Ollama routing-hint decision. Surface these in the §Report as the `fleet-reaper:` line.

### B. Ensure the durable scheduled task (5-min global cadence — survives chat exits)
```bash
schtasks /Query /TN "PRISM Fleet Reaper" 2>$null
```
If absent, the operator must register it from an **elevated** PowerShell — `/checkin-golf` cannot auto-install (UAC). Surface the install command in the §Report:
> `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`

### C. Arm the in-session persistent Monitor (this chat only)
The `Monitor` tool gives a live event feed (one line per reap / soft relief / coordinator fire / caveat) for the lifetime of this chat. Use `persistent: true` so it runs until session-end or `TaskStop`. The Monitor is in `allowed-tools` specifically for this step.

```
Monitor({
  command: "node H:/prism/scripts/fleet-reaper-sweep.mjs --monitor-loop --interval 300",
  description: "fleet reaper: orphan reaps + soft relief + Ollama coordinator (slot golf — sole owner since 2026-05-16)",
  persistent: true
})
```

Idempotence: the Monitor should be armed **once per chat**. If `TaskList` already shows a running fleet-reaper Monitor task for this session, skip step C — re-arming would just duplicate the event stream.

### D. Kill-switch awareness
A single env var disables ALL reaping fleet-wide regardless of which chat armed it:
`PRISM_FLEET_REAPER_DISABLE=1`. The golf-specific knob is `PRISM_GOLF_GUARDIAN_DISABLE=1` (guardian arm only). The legacy `PRISM_ALPHA_GUARDIAN_DISABLE=1` is still respected as a back-compat alias by the golf guardian so operators' carry-forward env vars don't accidentally light the new wiring. Surface any active kill-switch in the §Report.

## Pipeline delegation

After the slot-claim above, execute the FULL `/checkin` pipeline from `H:/prism/.claude/commands/checkin.md`:

- **Slot-claim phase (steps 3-7)** — handoff bind under `golf-work` topic · chat-bus read · drift check · commit hygiene · 6b roadmap slice · 6c BUILD_STATE · 6d Obsidian recent · 6e system-viz ping · 6f CLAUDE.md staleness · 6g local-compute health · 6h fleet activity · §Report.
- **Dev pipeline phase (steps 8-14)** — fires only when args contain a task directive (`/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or a verbatim filepath).

The pipeline body is canonical in `/checkin`.

## Reverting to legacy hygiene mode

If you want golf to act as the read-only hygiene chat again, use the original `/checkin --golf` invocation. The chat-slots binding is identical; the difference is purely whether the operator chooses to disable the allowlist hook for the session.

## Args forwarding

Any args after `/checkin-golf` are treated identically to args passed to `/checkin`. Example: `/checkin-golf /loop fleet-hygiene-sweep` runs the dev pipeline.
