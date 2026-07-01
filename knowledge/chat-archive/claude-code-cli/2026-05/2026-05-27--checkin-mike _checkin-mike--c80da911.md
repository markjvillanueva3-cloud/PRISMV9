---
type: "chat-session"
source: "claude-code-cli"
session_id: "c80da911-4d90-41cd-b3ef-ebb28ab72d99"
title: "checkin-mike /checkin-mike"
date: "2026-05-27"
first_ts: "2026-05-27T22:29:08.908Z"
last_ts: "2026-05-27T22:30:42.040Z"
cwd: "H:\\PRISM"
messages: 3
user_msgs: 2
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/c80da911-4d90-41cd-b3ef-ebb28ab72d99.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:45"
---

# checkin-mike /checkin-mike

> **claude-code-cli** | 2026-05-27 | 3 msgs (2 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/c80da911-4d90-41cd-b3ef-ebb28ab72d99.jsonl`

## Transcript

### User | 2026-05-27T22:29:32.220Z

<command-message>checkin-mike</command-message>
<command-name>/checkin-mike</command-name>

### User | 2026-05-27T22:29:32.220Z

# /checkin-mike — slot-locked /checkin

Force-takes the **mike** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `mike-work`, then runs the standard `/checkin` pipeline. Slot added 2026-05-16 as the 13th fleet slot per the operator directive "add a 13th chat slot, update everything that needs to update to intake a 13th chat".

## Slot binding (replaces /checkin Step 2)

```bash
STABLE="claude-<8hex-from-Chat-Isolation-line>"
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="mike"
TOPIC="mike-work"

# Reap stale slots first, then force-take mike from whoever holds it.
node H:/prism/.claude/helpers/chat-slots.mjs reclaim
node H:/prism/.claude/helpers/chat-slots.mjs claim \
  --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin" \
  --preferSlot $SLOT --force true --confirmRecent true
```

If the claim result carries `previousOwner`, surface it in the §Report — the evicted chat's id, topic, and last-heartbeat age are all useful context.

## Pipeline delegation

After the slot-claim above, execute the FULL `/checkin` pipeline from `H:/prism/.claude/commands/checkin.md`:

- **Slot-claim phase (steps 3-7)** — handoff bind under `mike-work` topic · chat-bus read · drift check (`audit-roadmap-drift.mjs`) · commit hygiene (dirty/staged/ahead-behind/worktree) · 6b roadmap slice · 6c BUILD_STATE · 6d Obsidian recent · 6e system-viz ping · 6f CLAUDE.md staleness · 6g local-compute health · 6h fleet activity + pickup candidates · §Report.
- **Dev pipeline phase (steps 8-14)** — fires only when args contain a task directive (`/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or a verbatim filepath). Covers awareness inject verification, /system-viz-first audit doctrine, Obsidian-PRISM-OS routing, CLAUDE.md+GSD+skills+hooks+RTK token savings, /loop iter ticks, files-to-galaxy refresh, end-of-session pipeline (per-file scrutiny, 3-of-3 gate, close-out, doc reflection, commit, precompact
... [+1084 chars truncated]

### Assistant | 2026-05-27T22:30:42.039Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
