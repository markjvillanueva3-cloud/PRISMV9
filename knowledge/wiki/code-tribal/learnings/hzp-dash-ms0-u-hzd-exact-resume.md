# HZP-DASH-MS0/U-HZD-EXACT-RESUME — [MAIN] [HZP-DASH-MS0]/U-HZD-EXACT-RESUME (slot:bravo): regenerate-launch-fleet.mjs — exact-session resume via claude --resume <uuid>

**Commit:** `415db69426f9` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T01:08:39-05:00
**Tags:** hzp-dash-ms0, u-hzd-exact-resume, auto-distilled

## Subject
[MAIN] [HZP-DASH-MS0]/U-HZD-EXACT-RESUME (slot:bravo): regenerate-launch-fleet.mjs — exact-session resume via claude --resume <uuid>

## Body
```
[MAIN] [HZP-DASH-MS0]/U-HZD-EXACT-RESUME (slot:bravo): regenerate-launch-fleet.mjs — exact-session resume via claude --resume <uuid>

Operator ask: "can it launch exact chats so we instant resume right where we
left off?" Previously each tab ran `claude '/checkin-<slot>'` — fresh chat with
RESUME injection from the slot's handoff. Now each tab runs `claude --resume
<full-session-uuid>` — reloads the EXACT prior transcript with all tool history,
all message context, and the chat's chatId preserved.

How it works:
  1. Read state/shared/chat-slots.json — get each slot's chatId (e.g. claude-ea80ce2f).
  2. Scan C:/Users/<u>/.claude/projects/H--prism/*.jsonl for files whose basename
     starts with the chatId-prefix (minus "claude-" prefix).
  3. If a matching JSONL exists, generate `claude --resume <full-uuid>` for that tab.
  4. If multiple matches, pick the NEWEST by mtime (most recent incarnation wins).
  5. If no transcript on disk (slot is new), fall back to `claude '/checkin-<slot>'`.

First-run mapping: 20 / 20 slots have exact-resume — every chat in the fleet
will pick up the conversation transcript verbatim. The /checkin slot-binding
hooks still fire on the first UserPromptSubmit after resume (terminal-pin
re-asserts the slot ownership, auto-resume injects the handoff RESUME as
contextual reminder, not as conversation reset).

Example (this chat):
  Slot bravo, chatId claude-ea80ce2f -> resume command
    `claude --resume ea80ce2f-26e4-482c-8a32-af4a9a980e7c`

Knobs: re-run `node H:/prism/scripts/regenerate-launch-fleet.mjs` after any
chat-slots.json change to refresh the resume mappings (new chats appear as
fresh-mode entries; dropped chats disappear from the .bat).
```

## Files touched (2)
- scripts/regenerate-launch-fleet.mjs | 71 +++++++++++++++++++++++++++++++------
- 1 file changed, 61 insertions(+), 10 deletions(-)

## Lessons surfaced in commit body
- till fire on the first UserPromptSubmit after resume (terminal-pin

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 415db69426f9`
- Milestone envelope: `mcp-server/data/milestones/HZP-DASH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._