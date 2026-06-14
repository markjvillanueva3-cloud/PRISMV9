---
title: ZULU-OBSIDIAN-LIVE-MS0 — live Obsidian brain + Telegram mobile bridge
type: architecture
slot: bravo
milestone: ZULU-OBSIDIAN-LIVE-MS0
created: 2026-05-30
tags: [hermes-zulu, obsidian, telegram, fail-soft, security, outward-facing]
---

# ZULU-OBSIDIAN-LIVE-MS0

Gives the Hermes/Zulu fleet-orchestrator a **live** read path into a running
Obsidian vault (Local REST API on `:27123`) plus an outward-facing **Telegram**
mobile gateway to the brain. Adopted from the "Hermes Agent + Obsidian" pattern
(DamiDefi/X). PRISM already had 5 of that pattern's 6 elements (per-slot souls,
scheduled briefs, multi-model routing, skill forging, an Obsidian-format vault at
`H:/prism/knowledge` written one-way by `scripts/obsidian-memory-sync.mjs`); this
milestone adds the missing piece — an **in-session live read** — and mobile access.

## Components

| File | Role |
|------|------|
| `mcp-server/src/engines/ObsidianRestBridgeEngine.ts` | Fail-soft live-vault client. `status/isLive/read/search/activeNote`. READ-ONLY v1. |
| `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` | `prism_session` actions `obsidian_status/read/search` (lazy-import cases). No `obsidian_write`. |
| `mcp-server/src/engines/lib/zuluAwarenessReader.ts` | Additive `liveBrainContext()` (gated `PRISM_OBSIDIAN_LIVE=1`, default off). |
| `scripts/zulu-telegram-bridge.mjs` | Outward-facing mobile bridge (long-poll, read-only, hardened). |
| `scripts/obsidian-live-setup-check.mjs` | Operator green/red probe. |

## Fail-soft contract (engine)

An optional dependency that is usually DOWN must never throw, hang, or burn a
timeout (the dead-Ollama-hooks lesson). Every method returns `{ ok, reason? }`;
the reason is always surfaced, never thrown. `isLive`/`status` parse GET `/` for
`authenticated:true` ("usable" ≠ merely "reachable"). No API key → returns
`{ok:false, reason:"no-key"}` **with no socket opened**. URL-keyed 10s health cache.
Mirrors `scripts/ollama-prism-bridge.mjs` `mcpCallStreamable`.

## Security (fail-CLOSED, outward-facing)

- **Loopback-only cert relaxation.** `rejectUnauthorized:false` is applied ONLY
  for a strict-dotted-quad 127.0.0.0/8 / `localhost` / `::1` host. A non-loopback
  `PRISM_OBSIDIAN_URL` is REFUSED (`reason:"non-loopback-url"`, no socket, no key
  sent) unless `PRISM_OBSIDIAN_ALLOW_REMOTE=1`. `isLoopbackHost` rejects the FQDN
  spoof `127.0.0.1.evil.com` (anchored regex, not a `127.` prefix).
- **Telegram bridge:** long-poll only (no inbound port); READ-ONLY (no write path);
  default-DENY chat-ID allowlist (empty = deny-all; unknown → silent drop + hashed
  id only); fixed verb allowlist `/recall /search /status` (single-line, opaque
  query → live-vault search only, never a path/shell/dispatcher arg); per-chat token
  bucket + global ceiling; 3500-char cap; `sanitizeOutput` strips env / Bearer /
  Telegram-bot-token / JWT / abs-path / long-hex; bot token via env only, never logged.

## Knobs

`PRISM_OBSIDIAN_URL` · `PRISM_OBSIDIAN_API_KEY` · `PRISM_OBSIDIAN_LIVE=1` ·
`PRISM_OBSIDIAN_ALLOW_REMOTE=1` · `PRISM_TELEGRAM_BOT_TOKEN` ·
`PRISM_TELEGRAM_ALLOWED_CHAT_IDS`.

## Operator setup (one-time; PRISM-side code is fail-soft until done)

1. Install Obsidian → open `H:/prism/knowledge` as a vault → enable the "Local REST
   API" community plugin → put its key in `PRISM_OBSIDIAN_API_KEY`; set `PRISM_OBSIDIAN_LIVE=1`.
2. `@BotFather` → bot token in `PRISM_TELEGRAM_BOT_TOKEN`; your chat id in
   `PRISM_TELEGRAM_ALLOWED_CHAT_IDS`. Start: `node scripts/zulu-telegram-bridge.mjs`.
3. Verify: `node scripts/obsidian-live-setup-check.mjs`.

## Tests

47 total: engine 27 (`ObsidianRestBridgeEngine.test.ts`), dispatcher wiring 3
(`sessionDispatcher.obsidian.test.ts`), live-brain 4 (`zuluAwarenessReader.liveBrain.test.ts`),
Telegram bridge 13 (`scripts/zulu-telegram-bridge.test.mjs`).

## Notes

- Telegram = quebec (phone-app) territory — flagged for coordination.
- Built in scope worktree `work/zulu-obsidian-live` off fixed main; full-server
  `:3100` live verification deferred to golf merge (pre-existing main build debt).
- Memory: [[reference_zulu_obsidian_live_2026_05_30]].
