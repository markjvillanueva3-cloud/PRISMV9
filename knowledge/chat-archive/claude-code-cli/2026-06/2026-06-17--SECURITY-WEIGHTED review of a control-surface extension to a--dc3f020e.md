---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "SECURITY-WEIGHTED review of a control-surface extension to a security-sensitive "
date: "2026-06-17"
first_ts: "2026-06-17T16:26:29.401Z"
last_ts: "2026-06-17T16:27:38.252Z"
cwd: "H:\\prism-slot-sierra"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ab71138847265373c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# SECURITY-WEIGHTED review of a control-surface extension to a security-sensitive 

> **claude-code-cli** | 2026-06-17 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ab71138847265373c.jsonl`

## Transcript

### User | 2026-06-17T16:26:29.401Z

SECURITY-WEIGHTED review of a control-surface extension to a security-sensitive Obsidian bridge engine. Read BOTH files end-to-end; grade PASS or FAIL with P0/P1/P2 + file:line.

FILES:
1. H:/prism/mcp-server/src/engines/ObsidianRestBridgeEngine.ts  (existing read engine + NEW ObsidianControlBridgeEngine class appended)
2. H:/prism/mcp-server/src/__tests__/ObsidianRestBridgeEngine.test.ts  (49 tests, all passing; 13 new for the control engine)

CONTEXT: The read engine (`ObsidianRestBridgeEngine`) is consumed by an OUTWARD-FACING Telegram bridge (scripts/zulu-telegram-bridge.mjs) and MUST stay read-only -- its header documents "v1 is READ-ONLY ... the write surface is never reachable from the Telegram bridge." I added a SEPARATE class `ObsidianControlBridgeEngine` (write + command-exec surface) in the same file, behind a default-DENY capability gate `writeAllowed()` (env PRISM_OBSIDIAN_WRITE=1, default OFF). I also extended the shared `ObsidianTransport` type + `defaultTransport` with an optional `body`/`contentType` for writes.

VERIFY THE SECURITY BOUNDARY (weight heavily):
- Is the read engine `ObsidianRestBridgeEngine` class genuinely UNCHANGED in behavior? (The only shared change is the transport `body` support -- confirm read methods never set body, so their requests are byte-identical to before. All original read tests still pass.)
- Could the Telegram bridge reach any mutation? It calls ObsidianRestBridgeEngine.read/search/etc. Confirm it does NOT import or call ObsidianControlBridgeEngine, and even if it did, writeAllowed() defaults OFF.
- Default-DENY correctness: does EVERY mutating method (runCommand/create/append/deleteNote/open) check writeAllowed() and return "write-disabled" with NO socket opened when the flag is unset? Trace each. Is the gate ordering correct (write-gate before key/url so it short-circuits)?
- Are the pure-READ control methods (listCommands/list/periodic) correctly NOT write-gated (they should be allowed without PRISM_OBSIDIAN_WRITE
... [+799 chars truncated]

### Assistant | 2026-06-17T16:26:32.430Z

I'll review both files end-to-end with a security focus. Let me start by reading them completely.

### Assistant | 2026-06-17T16:26:32.912Z

[tool_use: Read]

### Assistant | 2026-06-17T16:26:33.139Z

[tool_use: Read]

### User | 2026-06-17T16:26:34.054Z

[tool_result] 1	/**
2	 * ObsidianRestBridgeEngine — live Obsidian vault client over the Local REST API.
3	 * =============================================================================
4	 *
5	 * Part of the Hermes/Zulu fleet-orchestrator galaxy
6	 * (mcp-server/src/engines/hermes-zulu). Gives PRISM an IN-SESSION read path into
7	 * a *running* Obsidian vault (the "live brain"), complementing the one-way
8	 * 
... [+31569 chars truncated]

### User | 2026-06-17T16:26:34.146Z

[tool_result] 1	/**
2	 * ObsidianRestBridgeEngine.test.ts
3	 *
4	 * Verifies the fail-soft + fail-closed contract of the live Obsidian vault client
5	 * WITHOUT a live vault: every method returns a typed { ok, reason } result and
6	 * never throws. An injected fake transport exercises live / down / timeout /
7	 * no-key / non-loopback / unauthenticated / bad-payload paths. The no-key,
8	 * non-loopback, and tra
... [+22515 chars truncated]

### Assistant | 2026-06-17T16:26:36.796Z

Both files are fully read. Let me verify a few load-bearing claims before grading: the Telegram bridge's import/call surface, and whether the read engine's request shape is genuinely byte-identical (i.e. read methods never set `body`).

### Assistant | 2026-06-17T16:26:37.290Z

[tool_use: Read]

### Assistant | 2026-06-17T16:26:38.355Z

[tool_use: Grep]

### User | 2026-06-17T16:26:44.158Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * zulu-telegram-bridge.mjs — ZULU-OBSIDIAN-LIVE-MS0
4	 * =================================================
5	 *
6	 * Mobile gateway that lets an ALLOWLISTED operator query the PRISM brain (the
7	 * live Obsidian vault on :27123) from Telegram. The Zulu fleet-orchestrator's
8	 * mobile read surface. OUTWARD-FACING on an internal-only system, so it is
9	 * hardened, fa
... [+19314 chars truncated]

### User | 2026-06-17T16:26:47.405Z

[tool_result] Found 8 files
mcp-server\src\tools\dispatchers\sessionDispatcher.ts
scripts\zulu-telegram-bridge.mjs
mcp-server\src\engines\lib\zuluAwarenessReader.ts
mcp-server\src\engines\ObsidianRestBridgeEngine.ts
mcp-server\src\__tests__\zuluAwarenessReader.liveBrain.test.ts
mcp-server\src\__tests__\sessionDispatcher.obsidian.test.ts
mcp-server\src\__tests__\ObsidianRestBridgeEngine.test.ts
knowledge\wiki\ar
... [+32 chars truncated]

### Assistant | 2026-06-17T16:26:51.821Z

The Telegram bridge confirms the critical security claim: it imports nothing from `ObsidianRestBridgeEngine.ts` at all — it has its OWN inlined `obsidianRequest` (line 154) with no body/write path. The grep shows `ObsidianControlBridgeEngine` is referenced only in the engine file and its own test (no production consumer wires the control class yet). Let me verify the two other consumers of the read engine to confirm no behavioral coupling regressed, and check the dispatcher wiring.

### Assistant | 2026-06-17T16:26:53.729Z

[tool_use: Grep]

### Assistant | 2026-06-17T16:26:54.815Z

[tool_use: Grep]

### User | 2026-06-17T16:26:56.875Z

[tool_result] 180:  // OBSIDIAN-AUTOMATE-MS3/U-OLLAMA-HEALTH-EXPOSE: surface OllamaIntegrationEngine
186:  // OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX: unified master search across system-viz + obsidian + capability index + BUILD_STATE
193:  // OBSIDIAN-PRISM-OS-MS0/U-NODE-UTILIZATION: graph-wide utilization classifier (hub/sink/source/orphan/ghost)
220:  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-MULTI-SESSION-HANDO
... [+2054 chars truncated]

### User | 2026-06-17T16:26:59.038Z

[tool_result] 240:// via ObsidianRestBridgeEngine, for the Zulu orchestrator. It is strictly
265:    const { ObsidianRestBridgeEngine } = await import("../ObsidianRestBridgeEngine.js");
266:    if (!(await ObsidianRestBridgeEngine.isLive())) return null;
268:      ObsidianRestBridgeEngine.activeNote(),
269:      ObsidianRestBridgeEngine.status(),

### Assistant | 2026-06-17T16:27:06.571Z

Both consumers (`zuluAwarenessReader.ts:265-269` and `sessionDispatcher.ts:4515-4527`) call ONLY the read engine's read methods (`isLive`, `activeNote`, `status`, `read`, `search`). Neither imports `ObsidianControlBridgeEngine`. The dispatcher only wires `obsidian_status`/`obsidian_read`/`obsidian_search` — the control class is intentionally NOT wired (consistent with the engine header's "not a silent gap" note).

Now let me verify a couple of remaining security-boundary details: the `defaultTransport` body-handling for an empty-string body, and whether `runCommand`'s double-encoding is benign. Let me trace the `Buffer.byteLength(body)` typing edge and the empty-string-body case carefully by re-reading the transport body branch.

The key edge to verify: `create("x.md", "", t)` with an empty-string content — `hasBody = typeof body === "string"` is `true` for `""`, so Content-Length: 0 header is set and `req.write("")` runs. That is correct HTTP. Let me confirm there's no path where a read method could accidentally pass `body`.

### Assistant | 2026-06-17T16:27:07.686Z

[tool_use: Grep]

### User | 2026-06-17T16:27:09.668Z

[tool_result] 563:      const res = await transport({ method, url: g.url, path: `/vault/${this.encPath(notePath)}`, apiKey: apiKey(), accept: "application/json", contentType: "text/markdown", body: content, timeoutMs: CALL_TIMEOUT_MS });

### Assistant | 2026-06-17T16:27:38.252Z

Confirmed: only ONE call site sets `body`/`contentType` — line 563 (`writeBody`, used exclusively by `create`/`append`). Every read method in `ObsidianRestBridgeEngine` (probe, read, search, activeNote) and the read control methods (listCommands, list, periodic) omit both fields. With `body` undefined, `hasBody = typeof body === "string"` is `false`, so NO Content-Type/Content-Length headers are added and `req.write` is skipped — read requests are byte-identical to pre-change. All 36 original read tests still pass, corroborating this.

I have everything needed to grade. Let me record my final findings.

---

VERDICT: PASS

summary: The control surface is correctly isolated as a separate `ObsidianControlBridgeEngine` class behind a default-DENY `writeAllowed()` gate that short-circuits before any socket. The read engine `ObsidianRestBridgeEngine` is behaviorally unchanged (read methods never set `body`, so requests are byte-identical), and the outward-facing Telegram bridge neither imports nor can reach the control class. Every mutating method is gated; path/command/period inputs are validated; loopback/key fail-closed gates are preserved for the new methods. No P0/P1 issues found.

findings:
  - none (P0/P1). P2 advisories below.
  - [P2] `ObsidianRestBridgeEngine.ts:515` -- `runCommand` validates `commandId` against `/^[\w.:-]{1,128}$/` (good: no `/`, no `..`, no whitespace, so URL-path injection is impossible) then ALSO `encodeURIComponent`s it at line 519 -- belt-and-suspenders, harmless. Test at line 441 asserts `editor:toggle-bold` -> `/commands/editor%3Atoggle-bold/`. Note this double-protects but means a literal `:` in a real Obsidian command id is percent-encoded; if a future live command fails to resolve, the encoding is the first suspect. Not a defect today (the plugin decodes path segments). No change required; flagging for the deferred LIVE-VALIDATION.
  - [P2] `ObsidianRestBridgeEngine.ts:526-543` -- `list(dir)` is NOT write-gated (correct, it's a read)
... [+2993 chars truncated]
