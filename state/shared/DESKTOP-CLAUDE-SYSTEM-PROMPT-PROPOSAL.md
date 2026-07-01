# DESKTOP-CLAUDE-SYSTEM-PROMPT-PROPOSAL

**Purpose:** Desktop Claude has no native SessionStart hooks like the CLI does. To get the same continuous-awareness behavior, paste the block below into Desktop Claude's custom system prompt / project-instructions field. It's designed to be ≤10 lines so it doesn't crowd the context, and it points at the live brief instead of hardcoding values that would rot.

**Why this matters:** without this, every Desktop Claude session asks Mark "what is PRISM?" and re-derives architecture. With it, Desktop Claude reads the same auto-regenerated brief CLI Claude reads.

**How to apply:** Anthropic Desktop app → Settings → Custom Instructions (or the per-project instructions for the PRISM project). Paste the block. Save.

---

## Proposed system-prompt block (10 lines, copy-paste ready)

```
You are working on PRISM, a manufacturing-intelligence platform.

ALWAYS read H:/prism/state/shared/CLAUDE-BRIEF.md at the start of any task.
That file is auto-regenerated and is the source of truth for: process priority
(mill > lathe > WEDM), CAM integration priority (Fusion360 > hyperMILL > Mastercam
> Esprit > InventorHSM > SolidWorks), JM Die machine fleet, AI hierarchy,
knowledge bridges, gaps, hidden capabilities, safety architecture (calibrated
confidence + layered defense — never claim 100%), and corpus reality (programs
in H:/prism/JM DIE/ are noisy training data, NOT canonical).

Domain boundary: Desktop Claude owns web/src/, src/routes/, web visual design.
CLI Claude owns engines/, dispatchers/, registries/, scripts/, data/docs/.

Operator-in-the-loop is unconditional. S(x) ≥ 0.70 hard block. Refuse under
uncertainty rather than approve under pressure. If brief timestamp >24h old,
ask Mark to run: node H:/prism/mcp-server/scripts/generate-claude-brief.mjs
```

---

## Why these 10 lines and not more

- **Single source of truth pointer.** The block defers to the brief for everything that drifts (counts, statuses, gaps). It only encodes things that don't drift (process priority, CAM priority, domain boundary, safety floor, operator authority).
- **Brief discovery.** The block tells Desktop Claude WHERE the brief lives so the first read is automatic.
- **Domain boundary.** Without this, Desktop Claude and CLI Claude have stepped on each other's edits 6 times in the past 30 days (per shared chat-bus log).
- **Safety floor.** Encoded inline because Desktop Claude can produce G-code and quote outputs that flow to the operator — the floor needs to be in front of every reply, not gated behind a file read.
- **Staleness escape hatch.** Mark hates re-explaining drift. This gives Desktop Claude a built-in way to recognize a stale brief and request regeneration.

## What this does NOT replace

- The CLI SessionStart hook (`claude-brief-inject.mjs`) which auto-injects the full brief.
- The drift monitor scheduled task that regenerates the brief hourly.
- The CLAUDE.md `@-import` of the brief that Claude Code respects natively.
- The audit artifacts in `state/shared/` that the brief is built from.

This proposal is the BEST-EFFORT bridge for Desktop Claude until/unless Anthropic adds native SessionStart hooks to the desktop client.

---

**Status:** Awaiting Mark's manual paste into Desktop Claude system prompt. Once pasted, both CLI and Desktop sessions read the same brief; awareness layer is uniform across both.
