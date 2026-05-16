---
description: Force-claim slot GOLF as a work slot (NOT the legacy hygiene mode) + run the full /checkin pipeline. Operator directive 2026-05-16. NATO-phonetic shortcut.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion
---

# /checkin-golf — slot-locked /checkin (golf as WORK slot)

Force-takes the **golf** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `golf-work`, then runs the standard `/checkin` pipeline.

**Important — operator directive 2026-05-16**: this skill claims golf as a **normal work slot**, NOT the legacy hygiene chat. It does NOT pass the `--golf` flag to `chat-slots.claim` (that flag was the historic hygiene-mode marker; the slot itself is just a string key).

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

## Pipeline delegation

After the slot-claim above, execute the FULL `/checkin` pipeline from `H:/prism/.claude/commands/checkin.md`:

- **Slot-claim phase (steps 3-7)** — handoff bind under `golf-work` topic · chat-bus read · drift check · commit hygiene · 6b roadmap slice · 6c BUILD_STATE · 6d Obsidian recent · 6e system-viz ping · 6f CLAUDE.md staleness · 6g local-compute health · 6h fleet activity · §Report.
- **Dev pipeline phase (steps 8-14)** — fires only when args contain a task directive (`/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or a verbatim filepath).

The pipeline body is canonical in `/checkin`.

## Reverting to legacy hygiene mode

If you want golf to act as the read-only hygiene chat again, use the original `/checkin --golf` invocation. The chat-slots binding is identical; the difference is purely whether the operator chooses to disable the allowlist hook for the session.

## Args forwarding

Any args after `/checkin-golf` are treated identically to args passed to `/checkin`. Example: `/checkin-golf /loop fleet-hygiene-sweep` runs the dev pipeline.
