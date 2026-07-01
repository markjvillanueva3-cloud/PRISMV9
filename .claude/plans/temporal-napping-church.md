# Plan — Directed chat-bus delivery + CLAUDE.md-change auto-notify (CHATBUS-DIRECTED-MS0)

## Context

**Why:** The user wants two things to happen automatically, without telling any chat:
1. When a chat changes CLAUDE.md (in practice: creates a `CLAUDE-MD-PATCH-*.md` patch-sibling, since `claude-md-golf-only-guard.mjs` hard-blocks non-golf direct edits), the slot that *controls* CLAUDE.md must be notified. CLAUDE.md's controller is deterministically **golf** (the golf-only-guard enforces it). Today patch-siblings notify **nobody** — they sit in `state/shared/dashboards/patches/` until a golf chat happens to look.
2. A specific chat slot should *reliably* receive messages meant for it.

**Root cause of the gap:** The PRISM chat bus (`ChatBusEngine.ts` + `chat-bus-inject.mjs`) is **pure broadcast** — `ChatMessage` has no recipient field. Every message goes to everyone; nothing is *addressed*. A "message to golf" is impossible to express. And a wiki/memory entry alone cannot make anything automatic — automatic behavior requires a **hook**.

**Outcome:** (a) the chat bus gains optional *directed* delivery (addressed to a slot name or chatId); (b) a new PostToolUse hook auto-posts a directed message to golf whenever a CLAUDE.md patch-sibling is created; (c) golf sees it automatically via the existing `chat-bus-inject` UserPromptSubmit hook — no user action. Slack/Discord is a separate spec only (greenfield, needs user-created accounts/tokens — per user's "Build 1+2 now, spec Slack later" choice).

This is unit 1 of the user's `/goal` "complete all remaining hotel-queue tasks `/loop`"; after it ships the loop continues on `state/shared/specs/HOTEL-PUNCH-LIST-2026-05-19.md`.

## Slot / worktree

All edits in the `slot/hotel` worktree `H:/prism-slot-hotel`. The new hook is ALSO copied to runtime `H:/prism/.claude/hooks/` so it fires before golf integration (same runtime-artifact pattern as `ensure-all-watchdogs.ps1` this session). `ChatBusEngine.ts` + `contextDispatcher.ts` are TS — require `npm run build:fast` in `mcp-server/` + an MCP server restart (the supervisor/watchdog handles restart).

---

## U-CBD01 — Directed messages in ChatBusEngine + dispatcher

**`mcp-server/src/engines/ChatBusEngine.ts`** (full file already read):
- `ChatMessage` interface: add `recipient?: string;` — holds a **slot name** (`golf`, `alpha`…) OR a chatId (`claude-XXXX`). Slot names preferred (stable across `/compact`; chatIds rotate). `schemaVersion` stays `"1.0.0"` — additive-optional field, non-breaking, matches how `body?`/`path?`/`intent?` are already optional with no bump.
- `postMessage` input type: add `recipient?: string`; spread into `msg` exactly like `body`/`path`/`intent` (line ~201 pattern: `...(input.recipient !== undefined ? { recipient: input.recipient } : {})`).
- `readUnread(sessionId)` → `readUnread(sessionId, opts?: { slot?: string })`:
  - Recipient filter: keep a message if `!m.recipient || m.recipient === sessionId || (opts?.slot && m.recipient === opts.slot)`.
  - **Cursor fix:** advance the cursor over **all non-own scanned** messages (track `newestScanned` separately), NOT just the kept/returned ones — otherwise a filtered-out directed message that is chronologically newest pins the cursor and gets re-scanned every call. Return only recipient-matched messages; advance cursor to `newestScanned`.
- `ReadUnreadResult` unchanged (still `{messages, cursorAdvancedTo}`).

**`mcp-server/src/tools/dispatchers/contextDispatcher.ts`** (chat actions ~line 1096):
- `chat_post`: add optional `recipient: z.string().optional()` to the Zod schema; pass through to `postMessage`.
- `chat_read`: resolve the caller's slot from `state/shared/chat-slots.json` (find slot whose `chatId === sessionId`) and pass `{slot}` to `readUnread`. Small inline helper — keeps `ChatBusEngine` pure (no chat-slots coupling).

**Tests** — extend `mcp-server/src/__tests__/ChatBusEngine.test.ts` (or create if absent): directed-to-slot reaches that slot only; directed-to-chatId matches sessionId; broadcast (no recipient) still reaches all; cursor advances past a filtered-out directed message (no infinite re-scan); per-session cursors keep golf's directed message unread for golf even after a peer read advanced its own cursor.

## U-CBD02 — chat-bus-inject hook recipient filter

**`.claude/hooks/chat-bus-inject.mjs`** (full file already read):
- Add `resolveSlot(sessionId)` — pure read of `H:/prism/state/shared/chat-slots.json`, return the slot name whose `chatId === sessionId` (or `null`). No import of `chat-slots.mjs` (avoids its load side-effects) — just `JSON.parse`.
- `readUnreadMessages(sessionId)` → `readUnreadMessages(sessionId, slot)`: add the same recipient filter as U-CBD01; advance cursor over all-scanned (mirror the engine fix exactly).
- `formatBrief` / `formatCompactBadge`: mark a directed message addressed to *this* chat with a `📬 [direct]` prefix so the recipient sees it was addressed to them.
- `main()`: call `resolveSlot(sessionId)` once, thread `slot` into `readUnreadMessages`.
- Extend `.claude/hooks/__tests__/chat-bus-inject.test.mjs`: directed message to my slot is shown + `[direct]`-marked; directed message to another slot is hidden; broadcast still shown; cursor-advance parity with the engine.

## U-CBD03 — CLAUDE.md-change → golf auto-notify hook

**NEW `.claude/hooks/claude-md-change-notify.mjs`** — PostToolUse, matcher `Write|Edit|MultiEdit`:
- Detect when `tool_input.file_path` is (a) a patch-sibling `state/shared/dashboards/patches/CLAUDE-MD-PATCH-*.md`, or (b) `CLAUDE.md` itself (`H:/prism/CLAUDE.md`, `H:/PRISM/CLAUDE.md`, the C: mirror). Case-insensitive path compare.
- Resolve **golf's chatId** from `chat-slots.json` `slots.golf.chatId`; resolve the **acting chat's** sessionId + slot (stdin `session_id`).
- If the actor IS golf → no-op (no self-notify). If golf slot is empty/unclaimed → write the message anyway addressed to slot `golf` (it waits in the bus until a golf chat checks in — that is the desired "always gets its messages" behavior).
- Post a **directed** chat-bus message by writing a message file directly into `state/shared/chat-bus/messages/` in the exact `ChatBusEngine` format (`schemaVersion,id,ts,sessionId,pcName,kind:"message",body,recipient:"golf"`; filename `${sortableTs}-${shortSession}-${id8}.json`). Hooks write bus files directly — same pattern `chat-bus-inject.mjs` already uses for cursors/presence.
- Body example: `📋 CLAUDE.md change — claude-XXXX (slot hotel) created patch-sibling CLAUDE-MD-PATCH-foo.md. Apply on your next CLAUDE.md write, then rm the patch-sibling.`
- **Throttle:** stamp file `state/shared/.claude-md-notify-stamps/<patchBasename>.json` — don't re-post for the same patch file within 30 min (Edit fires per-edit; multiple edits to one patch must not spam golf).
- Non-blocking (PostToolUse advisory), fail-soft (never throw). Knob `PRISM_CLAUDE_MD_NOTIFY_DISABLE=1`.
- Copy to runtime `H:/prism/.claude/hooks/claude-md-change-notify.mjs`.
- Wire into `H:/.claude/settings.json` PostToolUse chain.
- **NEW test** `.claude/hooks/__tests__/claude-md-change-notify.test.mjs`: patch-sibling Write by non-golf → directed message to golf written; golf editing CLAUDE.md → no message; non-CLAUDE.md file → no message; throttle suppresses the 2nd post within 30 min; `PRISM_CLAUDE_MD_NOTIFY_DISABLE=1` → no message; malformed stdin → exit 0 no-throw.

## U-CBD04 — Slack/Discord slot-integration SPEC (doc only)

**NEW `state/shared/specs/SLACK-DISCORD-SLOT-INTEGRATION-SPEC.md`** — design doc, no code:
- Problem/goal: `/checkin-<nato>` / `/startup-nato` makes that chat "check into" a per-slot Slack/Discord channel; directed chat-bus messages mirror to the slot's channel.
- Current infra inventory: `mcp-server/src/bot/{discord-bot,bot-config,messaging-adapter,webhook-receiver}.ts` exist — command map + rate limiting + per-channel context + webhook receiver are REAL; `DiscordAdapter`/`SlackAdapter` `.connect()`/`.sendResponse()` are `console.log` STUBS (need `discord.js` / `@slack/bolt` npm deps).
- Design: 13 per-slot channels; `/checkin-<nato>` posts a check-in line; a bridge tails each slot's chat-bus inbox → its channel; recommendation **Discord** (free, simpler bot API, private-server friendly for 13 channels).
- Token/account setup steps the *user* must perform (create server/workspace, bot token → `DISCORD_BOT_TOKEN` env).
- Phased build plan + what stays in-PRISM vs in-platform. Mark `advisoryOnly` / `mustHumanVerify`.

## U-CBD05 — 4-surface doc reflection

- Wiki: `knowledge/wiki/architecture/chat-bus-directed-delivery.md` (new) — schema, recipient semantics, the notify hook, cursor-advance fix.
- Auto-memory: `reference_chat_bus_directed_delivery_2026_05_19.md` (auto-feeds Obsidian on Stop).
- MEMORY.md: one index line.
- CLAUDE.md patch-sibling: extend `state/shared/dashboards/patches/` with a new section under the chat-bus / coordination doctrine (CLAUDE.md is golf-locked) — and this very feature means golf now gets auto-notified of that patch-sibling.

---

## Per-file scrutiny

Every file above goes through the 2-reviewer per-file gate (code-analyzer + reviewer) before the next file, then the 3-of-3 Stop gate. Fix all P0/P1 before proceeding.

## Build & verification

1. `cd H:/prism-slot-hotel/mcp-server && npm run build:fast` — TS compiles clean (ChatBusEngine + contextDispatcher).
2. `npx vitest run ChatBusEngine` + `node --test .claude/hooks/__tests__/chat-bus-inject.test.mjs` + `node --test .claude/hooks/__tests__/claude-md-change-notify.test.mjs` — all green.
3. **E2E directed-delivery:** post a message with `recipient:"golf"` via `prism_context:chat_post`; run `chat-bus-inject.mjs` with a golf-slot stdin session_id → message appears `[direct]`-marked; run it with a non-golf session_id → message hidden.
4. **E2E notify hook:** pipe a synthetic PostToolUse payload (`tool_name:"Write"`, `file_path` a `CLAUDE-MD-PATCH-*.md`) to `claude-md-change-notify.mjs` → assert a directed message file appears in `state/shared/chat-bus/messages/` with `recipient:"golf"`.
5. Commit per unit on `slot/hotel` (`[CHATBUS-DIRECTED-MS0]/U-CBDxx: …`); MCP server restart picks up the new dispatcher schema (supervisor/watchdog handles it).

## Critical files

- `H:/prism-slot-hotel/mcp-server/src/engines/ChatBusEngine.ts` — recipient field + filtered `readUnread`
- `H:/prism-slot-hotel/mcp-server/src/tools/dispatchers/contextDispatcher.ts` — `chat_post`/`chat_read` recipient/slot
- `H:/prism-slot-hotel/.claude/hooks/chat-bus-inject.mjs` — recipient filter + slot resolution + `[direct]` mark
- `H:/prism-slot-hotel/.claude/hooks/claude-md-change-notify.mjs` — NEW notify hook (+ runtime copy to `H:/prism/.claude/hooks/`)
- `H:/.claude/settings.json` — PostToolUse wiring for the new hook
- Tests: `ChatBusEngine.test.ts`, `chat-bus-inject.test.mjs`, `claude-md-change-notify.test.mjs` (new)
- `state/shared/specs/SLACK-DISCORD-SLOT-INTEGRATION-SPEC.md` — NEW spec
