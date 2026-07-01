---
description: Force-claim slot DELTA + run the full /checkin pipeline. NATO-phonetic shortcut for `/checkin --preferSlot delta --force`.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion
composes_with:
  - "/checkin"
  - "/handoff"
  - "/pick-unit"
---
# /checkin-delta — slot-locked /checkin

Force-takes the **delta** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `delta-work`, then runs the standard `/checkin` pipeline. Use when you want this specific slot regardless of who currently holds it.

## Slot binding (replaces /checkin Step 2)

```bash
STABLE="claude-<8hex-from-Chat-Isolation-line>"
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="delta"
TOPIC="delta-work"

# Reap stale slots first, then force-take delta from whoever holds it.
node H:/prism/.claude/helpers/chat-slots.mjs reclaim
node H:/prism/.claude/helpers/chat-slots.mjs claim \
  --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin" \
  --preferSlot $SLOT --force true --confirmRecent true
```

If the claim result carries `previousOwner`, surface it in the §Report — the evicted chat's id, topic, and last-heartbeat age are all useful context.

## Pipeline delegation

After the slot-claim above, execute the FULL `/checkin` pipeline from `H:/prism/.claude/commands/checkin.md`:

- **Slot-claim phase (steps 3-7)** — handoff bind under `delta-work` topic · chat-bus read · drift check (`audit-roadmap-drift.mjs`) · commit hygiene (dirty/staged/ahead-behind/worktree) · 6b roadmap slice · 6c BUILD_STATE · 6d Obsidian recent · 6e system-viz ping · 6f CLAUDE.md staleness · 6g local-compute health · 6h fleet activity + pickup candidates · §Report.
- **Dev pipeline phase (steps 8-14)** — fires only when args contain a task directive (`/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or a verbatim filepath). Covers awareness inject verification, /system-viz-first audit doctrine, Obsidian-PRISM-OS routing, CLAUDE.md+GSD+skills+hooks+RTK token savings, /loop iter ticks, files-to-galaxy refresh, end-of-session pipeline (per-file scrutiny, 3-of-3 gate, close-out, doc reflection, commit, precompact, /compact, terminal-pin, /handoff).

The pipeline body is canonical in `/checkin` — do NOT duplicate it here. This skill is a slot-binding wrapper.

## Args forwarding

Any args after `/checkin-delta` are treated identically to args passed to `/checkin`. Example: `/checkin-delta /loop system-viz-brain until /goal` enters the dev pipeline + /loop loop.
