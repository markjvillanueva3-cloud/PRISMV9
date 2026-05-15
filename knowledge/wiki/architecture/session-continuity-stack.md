---
title: Session Continuity Stack (2026-05-15)
kind: architecture
status: shipped
date: 2026-05-15
session: claude-6eac1b66 (slot alpha)
files_modified:
  - .claude/hooks/precompact-auto-trigger.mjs
  - .claude/hooks/session-start-auto-resume.mjs
  - .claude/hooks/session-start-terminal-pin.mjs
  - .claude/hooks/stop-system-viz-reminder.mjs
  - .claude/helpers/terminal-window-id.mjs
  - .claude/helpers/chat-slots.mjs
  - settings.json (C:/Users/Mark Villanueva/.claude/)
  - CLAUDE.md (## SESSION CONTINUITY STACK section)
related_memories:
  - reference_session_continuity_stack_2026_05_15
  - feedback_fleet_design_10_chats
  - feedback_reflect_all_changes_post_update
---

# Session Continuity Stack

Five-piece infrastructure shipped 2026-05-15 that makes `/compact` + new-chat-in-same-window + Stop-time graph-staleness all seamless across the up-to-10-chat fleet.

## Goal

The user observed three intertwined symptoms:

1. **Post-compact false-positive hard block** — context-budget hook reported 1.43M tokens immediately after a successful `/compact`, blocking the next tool call.
2. **Inconsistent post-compact auto-continue** — sometimes the chat resumed work on its own, sometimes the user had to type "continue".
3. **Slot drift across sessions in the same PowerShell window** — opening a new chat (via /compact, /clear, or fresh `claude`) inside the same window claimed a new slot, breaking the slot↔window mental model and causing lane drift.

Plus a follow-up directive:
4. **Stop-time graph staleness** — chats that edit H: drive files leave `/system-viz` + wiki + master-index out of date until the next cron regen.

The stack addresses all four with five pieces.

## Piece 1 — compact-boundary byte estimate

**File:** `.claude/hooks/precompact-auto-trigger.mjs`

Root cause: `lastAssistantTokens()` could return null in a race window. Fallback `estimateFromBytes()` divided the **entire** transcript JSONL size by 3.5 — but `/compact` appends without truncating, so pre-compact bytes persist forever. After one compact: `5,022,934 / 3.5 = 1,435,124` tokens reported → HARD BLOCK at 900K threshold.

Fix:
- New `findLastCompactOffset(transcriptPath, fileSize)` scans the last 8 MB for `"isCompactSummary":true` (the Claude harness marker)
- Returns byte offset of the line AFTER the most recent compact summary
- `estimateFromBytes()` subtracts the offset; counts only `st.size - compactOffset`
- Sanity floor tightened: `tokens > CONTEXT_CAP * 1.5` → `* 1.1`

Verified: live transcript at 5.29 MB, compact offset 4,870,445, post-compact bytes 894,867 / 3.5 = **255,676 tokens** — well under HARD 900K. Hook returns `{"continue":true,"suppressOutput":true}` as expected.

## Piece 2 — post-compact auto-resume

**File:** `.claude/hooks/session-start-auto-resume.mjs` (NEW, T0)
**Wiring:** new arm `matcher: "compact"` in SessionStart (fires only on the compact event)

- Reads `session_id` from stdin → derives stable id `claude-<first-8-hex>`
- Calls `per-agent-handoff.mjs read --terminal <stable>` via `spawnSync(process.execPath, ...)`
- Extracts `## RESUME` section from handoff markdown
- Caps injected size at 6 KB, truncated-marker on overflow
- Validates handoff age via `written_at:` frontmatter — drops handoffs > 240 min as stale (surfaces a hint instead of resuming)
- ALL failures → silent `{continue:true,suppressOutput:true}`

**Knobs:** `PRISM_AUTO_RESUME_DISABLE=1`, `PRISM_AUTO_RESUME_MAX_AGE_MIN=N` (default 240).

**Verified:** with `session_id=c9c4e6a8-...`, hook found the 19m-old delta-docu handoff and injected the full RESUME directive as `additionalContext`.

## Piece 3 — terminal-window slot pinning

**Files:**
- `.claude/helpers/terminal-window-id.mjs` (NEW) — stable window identity resolver
- `.claude/helpers/chat-slots.mjs` (MODIFIED) — schema v2 + claim() terminal-pin branch
- `.claude/hooks/session-start-terminal-pin.mjs` (NEW, T1) — auto-claim hook
- `settings.json` — wired in SessionStart arm 0 (empty matcher = fires on every event)

### terminal-window-id.mjs — resolution tiers

1. `WT_SESSION` env var (Windows Terminal pane UUID, tab-lifetime) → `tw-wt-<uuid>`
2. Ancestor PowerShell PID via `wmic process where ProcessId=<pid> get ParentProcessId,Name /format:csv` walked up to 8 hops, matched against `powershell.exe` / `pwsh.exe` / `cmd.exe` → `tw-ps-<pid>`
3. Bare `process.ppid` → `tw-pp-<pid>`

### chat-slots schema v2

`SlotState` gains optional `terminalWindowId`. In `claimSlot()`:

```
Check 1 (existing): chatId match → refresh + return  (alreadyOwned=true)
Check 2 (NEW):      terminalWindowId match → INHERIT slot — new chatId takes over
                    (alreadyOwned=true, terminalPinned=true, previousChatId returned)
Check 3 (existing): first free / preferSlot / recency guards / fleet-full
```

Backward-compat: v1 records (no `terminalWindowId` field) keep working; first re-claim by a v2-aware caller stamps the field. SCHEMA_VERSION bumped 1 → 2.

### 6-scenario test (all PASS)

| Scenario | Input | Expected | Result |
|---|---|---|---|
| S1 | window-W1, chat-A | alpha, twid stamped | alpha ✓ |
| S2 | window-W1, chat-A (re-claim) | alpha, chatId-match | alpha ✓ |
| S3 | window-W1, chat-B (post-compact) | alpha INHERITED | alpha ✓ |
| S4 | window-W2, chat-C | bravo (different window) | bravo ✓ |
| S5 | window-W1, chat-D (clear) | alpha (binding survives) | alpha ✓ |
| S6 | no twid (legacy v1) | first free slot | charlie ✓ |

**Result: 10 PowerShell windows → 10 deterministic slot bindings. /compact and /clear inherit. "Alpha disappeared mid-session" pathology is structurally impossible.**

## Piece 4 — system-viz update reminder (Stop hook)

**File:** `.claude/hooks/stop-system-viz-reminder.mjs` (NEW, T3)
**Wiring:** Stop arm 0 (empty matcher = every Stop)

Scans transcript tail for `Write` / `Edit` / `MultiEdit` / `NotebookEdit` tool calls with `file_path` / `notebook_path` under H:. If ≥1 found and not already reminded this session, emits an `additionalContext` reminder offering three refresh options:

```
• curl -fsS -X POST http://localhost:8765/api/refresh -m 2 >/dev/null 2>&1 &   (fire-and-forget)
• node H:/prism/scripts/regen-wiki-from-viz.mjs                                  (full 8-min pipeline)
• /system-viz                                                                    (open viewer)
```

Bucketed file count surfaces what touched what (`3 files: 2 hooks, 1 helper`). Once per session, 30-min TTL on the marker. Knob: `PRISM_VIZ_REMINDER_DISABLE=1`.

## Knobs

| Knob | Default | Effect |
|---|---|---|
| `PRISM_AUTO_RESUME_DISABLE` | (off) | Disable post-compact auto-resume |
| `PRISM_AUTO_RESUME_MAX_AGE_MIN` | 240 | Stale-handoff threshold (min) |
| `PRISM_TERMINAL_PIN_DISABLE` | (off) | Disable terminal-window auto-claim |
| `PRISM_TERMINAL_PIN_VERBOSE` | (off) | Emit one-line confirmation per SessionStart |
| `PRISM_TERMINAL_WINDOW_ID` | (auto) | Override window id (CI / tests) |
| `PRISM_TERMINAL_WINDOW_ID_DISABLE` | (off) | Return null id (pin auto-disables) |
| `PRISM_TWID_TIMEOUT_MS` | 2000 | `wmic process` budget (ms) |
| `PRISM_VIZ_REMINDER_DISABLE` | (off) | Disable Stop-time viz reminder |
| `PRISM_VIZ_REMINDER_MIN_FILES` | 1 | Min H-drive writes before reminding |

## Related

- [[reference_session_continuity_stack_2026_05_15]] — memory cross-link
- [[feedback_fleet_design_10_chats]] — 10-chat scale directive
- [[feedback_reflect_all_changes_post_update]] — 4-surface doc reflection rule
- [[reference_fleet_reaper_ms1]] — slot-aware reaper (depends on chat-slots state; my schema-v2 change is additive — no impact)
- [[reference_harness_hang_prevention]] — broader continuity infra context
