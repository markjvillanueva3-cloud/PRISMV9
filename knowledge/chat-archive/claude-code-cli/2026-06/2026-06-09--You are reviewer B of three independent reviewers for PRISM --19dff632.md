---
type: "chat-session"
source: "claude-code-cli"
session_id: "19dff632-e5c0-49cd-ad5a-524091f39df0"
title: "You are reviewer B of three independent reviewers for PRISM commit dd57b82b52, u"
date: "2026-06-09"
first_ts: "2026-06-09T20:50:39.523Z"
last_ts: "2026-06-09T20:54:02.107Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/19dff632-e5c0-49cd-ad5a-524091f39df0/subagents/agent-abd2bfa193392e668.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# You are reviewer B of three independent reviewers for PRISM commit dd57b82b52, u

> **claude-code-cli** | 2026-06-09 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/19dff632-e5c0-49cd-ad5a-524091f39df0/subagents/agent-abd2bfa193392e668.jsonl`

## Transcript

### User | 2026-06-09T20:50:39.523Z

You are reviewer B of three independent reviewers for PRISM commit dd57b82b52, unit U-HOTEL-PORTAL-PERSISTENCE (slot:hotel). Do NOT assume reviewer A caught anything. Weight your review on TEST INTEGRITY, WIRING COMPLETENESS, and INLINED-CONSTANT / STUB detection.

CONTEXT: `mcp-server/src/engines/CustomerPortalEngine.ts` migrated its 4 durable in-memory Maps (tokens/messages/qualityDocs/serviceCases) to a SQLite WAL store; `rateBuckets` stays transient on purpose. Public API byte-identical (so `routes/portal.ts` + `businessDispatcher` singleton consumers stay wired). New test `CustomerPortalEngine.persistence.test.ts` (20). Two sibling tests in `portal-milestone-engines.test.ts` were fixed because they relied on the OLD Map reference-aliasing (mutating the returned token object reached into engine state — impossible with a DB snapshot).

FILES TO READ FULLY:
1. `H:/prism/mcp-server/src/__tests__/CustomerPortalEngine.persistence.test.ts`
2. `H:/prism/mcp-server/src/__tests__/portal-milestone-engines.test.ts` (esp. the 2 fixed tests: "rejects expired token", "updates access stats")
3. `H:/prism/mcp-server/src/__tests__/CustomerPortalEngine.test.ts` (existing, must still pass via the :memory: singleton)
4. `H:/prism/mcp-server/src/engines/CustomerPortalEngine.ts` (the SUT)

CHECK SPECIFICALLY (R9 — tests verify INTENT, must fail if business logic regresses):
- Is the kill-restart-readback E2E REAL? It must use a real temp FILE (not `:memory:`, which is per-connection and would make a "restart" test a no-op false-pass). Confirm `fileEngine()` uses a temp file and `memEngine()` uses `:memory:`, and that the restart tests use `fileEngine` + `close()` + a fresh instance on the SAME path.
- Does the WAL cross-connection test actually prove durability (two connections, same file, one reads the other's committed write)?
- Does the rate-window-transient test prove rateBuckets does NOT persist (the R12 intent: persisting it would be a bug)?
- Would any test still pass if someo
... [+1063 chars truncated]

### Assistant | 2026-06-09T20:50:45.524Z

I'll review the persistence migration as reviewer B, weighting on test integrity, wiring completeness, and stub/inlined-constant detection. Let me read all four files fully.

### Assistant | 2026-06-09T20:50:47.138Z

[tool_use: Read]

### Assistant | 2026-06-09T20:50:47.148Z

[tool_use: Read]

### User | 2026-06-09T20:50:48.883Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CustomerPortalEngine.ts' was already read 8s ago in this session and is unchanged (mtime 1781035821304). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-09T20:50:50.281Z

[tool_result] 1	/**
2	 * CustomerPortalEngine.persistence.test.ts -- U-HOTEL-PORTAL-PERSISTENCE (slot:hotel)
3	 *
4	 * Guards the SQLite-WAL durability of the four portal record types (tokens,
5	 * messages, quality documents, service cases). Before this unit they lived only
6	 * in process-memory Maps and vanished on every MCP-server restart.
7	 *
8	 * Three layers:
9	 *   1. RESTART E2E (the headline) -- writ
... [+17241 chars truncated]

### Assistant | 2026-06-09T20:51:02.170Z

The persistence test file is fully read. I have the SUT (CustomerPortalEngine.ts) already in context from 8s ago. Now I need the two sibling test files: the milestone-engines test (esp. the 2 fixed tests) and the existing CustomerPortalEngine.test.ts.

### Assistant | 2026-06-09T20:51:02.170Z

[tool_use: Read]

### Assistant | 2026-06-09T20:51:02.174Z

[tool_use: Read]

### User | 2026-06-09T20:51:03.894Z

[tool_result] 1	/**
2	 * CustomerPortalEngine.test.ts — hotel slot (iter15 / U-CUSTOMER-PORTAL-WIRE).
3	 * Tests portal token lifecycle (create/revoke/validate/list/expiry/scope/rate-limit).
4	 */
5	
6	import { describe, it, expect } from "vitest";
7	import { customerPortalEngine } from "../engines/CustomerPortalEngine.js";
8	
9	function uniqueEntity(): string {
10	  return `ENT-${Math.random().toString(36).sli
... [+5434 chars truncated]

### User | 2026-06-09T20:51:04.713Z

[tool_result] 1	/**
2	 * Tests for Session 6-9: MilestoneTrackingEngine + CustomerPortalEngine
3	 *
4	 * Coverage:
5	 * - MilestoneTrackingEngine: 14-milestone template, create/advance/skip, auto-advance, events
6	 * - CustomerPortalEngine: token CRUD, validation, rate limiting, portal views, quality docs, messages
7	 */
8	import { describe, it, expect, beforeEach, vi } from "vitest";
9	import { MilestoneTracki
... [+24661 chars truncated]

### Assistant | 2026-06-09T20:51:10.997Z

I have all three test files. The SUT (CustomerPortalEngine.ts) was read 8s ago. The read-once guard says it's in my context, but I need to verify the actual implementation details for the persistence claims (constructor signature, the four methods, the DB write paths, rateBuckets transience, health()). Let me grep the SUT for the load-bearing implementation points rather than re-read the whole file.

### Assistant | 2026-06-09T20:51:13.033Z

[tool_use: Grep]

### User | 2026-06-09T20:51:16.990Z

[tool_result] 25: *   rateBuckets stays an in-memory Map ON PURPOSE: a per-minute sliding rate
29: *   Tests construct `new CustomerPortalEngine({ dbPath: ":memory:" })` (or a
31: *   durable file path in production and ":memory:" under vitest so the existing
176: * - Under vitest (or NODE_ENV=test) default to ":memory:" so the existing
183:  if (process.env.VITEST || process.env.NODE_ENV === "test") return ":m
... [+2743 chars truncated]

### Assistant | 2026-06-09T20:51:29.231Z

Good. This confirms the core wiring. Let me verify the remaining load-bearing implementation details: validateToken's access-count persistence path, addMessage's 500-trim, the message empty/over-length validation thresholds, customer_id NULL handling, and the singleton wiring to the dispatcher/route. Let me grep the SUT for those, plus check the dispatcher/route consumers to confirm wiring is intact.

### Assistant | 2026-06-09T20:51:31.047Z

[tool_use: Grep]

### Assistant | 2026-06-09T20:51:31.530Z

[tool_use: Grep]

### Assistant | 2026-06-09T20:51:32.144Z

[tool_use: Read]

### User | 2026-06-09T20:51:32.723Z

[tool_result] Found 1 file
mcp-server\src\tools\dispatchers\businessDispatcher.ts

### User | 2026-06-09T20:51:33.195Z

[tool_result] 620	   * Revoke a portal token (immediate access removal).
621	   */
622	  revokeToken(token: string): { revoked: boolean } {
623	    const { stmts } = this.ensureOpen();
624	    const row = stmts.findToken.get(token) as TokenRow | undefined;
625	    if (!row) throw new Error("Token not found");
626	    stmts.revokeToken.run(token);
627	    log.info(`[CustomerPortal] Token revoked for ${row.token_
... [+4923 chars truncated]

### User | 2026-06-09T20:51:33.298Z

[tool_result] Found 1 file
mcp-server\src\routes\portal.ts

### Assistant | 2026-06-09T20:51:59.107Z

Now I have confirmed the singleton is wired to both `businessDispatcher.ts` and `routes/portal.ts`. Let me verify two critical things: (1) the `addMessage` 500-trim and validation logic, and (2) the `rowToToken` NULL→undefined coercion that the round-trip test asserts. These are the load-bearing claims for R9 test integrity.

### Assistant | 2026-06-09T20:51:59.852Z

[tool_use: Read]

### User | 2026-06-09T20:52:00.784Z

[tool_result] 470	    return { db, stmts };
471	  }
472	
473	  // --- row <-> domain mappers -----------------------------------------------
474	
475	  private static rowToToken(r: TokenRow): PortalToken {
476	    let scope: PortalScope[];
477	    try {
478	      const parsed = JSON.parse(r.scope_json);
479	      scope = Array.isArray(parsed) ? (parsed as PortalScope[]) : ["view"];
480	    } catch {
481	      s
... [+4858 chars truncated]

### Assistant | 2026-06-09T20:52:07.703Z

I have the row mappers and createToken. Now let me read the addMessage (500-trim + validation) and the qualityDoc/serviceCase mutation methods to confirm the parity test claims and the `updated_at` re-sort logic that the service-case list test depends on.

### Assistant | 2026-06-09T20:52:08.848Z

[tool_use: Read]

### User | 2026-06-09T20:52:16.067Z

[tool_result] 750	  }
751	
752	  /**
753	   * Get order status with milestone timeline for portal display.
754	   * Returns only customer-safe data.
755	   */
756	  getOrderStatus(input: {
757	    job_id: string;
758	    job?: JobLike;
759	    timeline?: TimelineLike;
760	  }): PortalOrderStatus {
761	    const job = input.job;
762	    const timeline = input.timeline;
763	
764	    // Defense-in-depth: strip int
... [+12421 chars truncated]

### Assistant | 2026-06-09T20:52:24.569Z

I now have the full implementation picture. Let me verify the remaining constants and DDL/prepared-statement definitions that the parity tests depend on — specifically `MAX_MESSAGE_LEN`, `MESSAGE_THREAD_CAP`, `RATE_WINDOW_MS`, `DEFAULT_MESSAGE_LIMIT`, `SCHEMA_VERSION`, and the `trimMessages`/`listMessagesByEntity`/`listCasesByEntity` SQL ordering — to confirm whether constants are sourced or inlined, and whether the sort claims are real.

### Assistant | 2026-06-09T20:52:25.178Z

[tool_use: Read]

### User | 2026-06-09T20:52:28.654Z

[tool_result] 1	/**
2	 * CustomerPortalEngine -- Token-Based Customer Portal Access (durable)
3	 * ====================================================================
4	 *
5	 * Provides external customer access to quotes, orders, milestones, quality
6	 * documents, and messaging -- all without requiring a PRISM account.
7	 *
8	 * Security model:
9	 * - Access via cryptographic tokens (base64url, 32 bytes)
10	 
... [+7300 chars truncated]

### Assistant | 2026-06-09T20:52:53.801Z

I have the constants and config. Let me read the DDL and prepared-statement SQL block (lines 200-470) to verify the sort orders and the trim logic that the parity tests assert against — these are the load-bearing SQL claims for the newest-first, 500-trim, and most-recently-updated-first tests.

### Assistant | 2026-06-09T20:52:53.802Z

[tool_use: Read]

### User | 2026-06-09T20:52:55.594Z

[tool_result] 200	  `CREATE TABLE IF NOT EXISTS portal_tokens (
201	     token         TEXT PRIMARY KEY,
202	     id            TEXT NOT NULL,
203	     token_type    TEXT NOT NULL,
204	     entity_id     TEXT NOT NULL,
205	     customer_id   TEXT,
206	     scope_json    TEXT NOT NULL DEFAULT '["view"]',
207	     expires_at    TEXT NOT NULL,
208	     revoked       INTEGER NOT NULL DEFAULT 0,
209	     last_access
... [+5423 chars truncated]

### Assistant | 2026-06-09T20:53:06.849Z

I need to verify the actual SQL in the prepared statements (lines ~395-468) for the sort orders and trim logic, since the parity tests assert specific ordering behavior. Let me read that block.

### Assistant | 2026-06-09T20:53:07.876Z

[tool_use: Read]

### User | 2026-06-09T20:53:12.164Z

[tool_result] 395	      insertToken: db.prepare(`
396	        INSERT INTO portal_tokens(token, id, token_type, entity_id, customer_id, scope_json,
397	          expires_at, revoked, last_accessed, access_count, rate_limit, created_by, created_at)
398	        VALUES(@token, @id, @token_type, @entity_id, @customer_id, @scope_json,
399	          @expires_at, @revoked, @last_accessed, @access_count, @rate_limit, @c
... [+3977 chars truncated]

### Assistant | 2026-06-09T20:54:02.107Z

I now have full verification of every load-bearing claim. Let me cross-check the specific review questions against the evidence.

**R9 / test-integrity analysis:**

1. **Kill-restart-readback E2E is REAL.** `fileEngine()` (test:43-47) uses `tempDbPath()` (test:37-41 → `os.tmpdir()/portal-persist-*.db`, a real file). `memEngine()` (test:49-53) uses `:memory:`. The restart tests (test:69-152, 115-126, 128-142, 282-295, 331-348) all use `fileEngine(dbPath)` → write → `a.close()` → `fileEngine(dbPath)` on the SAME `dbPath`. SUT constructor (engine:367-369) only opens lazily; `close()` (engine:1096-1098) closes `this.db`. A fresh instance re-opens the same file via `ensureOpen`. This is a genuine cross-process-simulating restart — NOT a no-op false-pass. Confirmed.

2. **WAL cross-connection durability is REAL** (test:297-306): two `fileEngine(dbPath)` on the same file; `a` writes, `b` (which never wrote) reads `a`'s committed token + message. WAL pragma is set on file paths only (engine:384-385). This proves cross-connection visibility honestly.

3. **Rate-window-transient test is REAL** (test:282-295): exhausts `rate_limit:2` in session A (3rd rejected), closes, reopens on same file, asserts valid again. Since `rateBuckets` is a per-instance in-memory Map (engine:365) never persisted, a fresh instance has an empty bucket. The test asserts the R12 intent: persisting it would be a bug. Confirmed — and it would FAIL if someone made rateBuckets durable.

4. **Re-stub resistance.** The restart/WAL/access-stats tests assert PERSISTED state read back through a fresh instance or a re-query (`listTokens()[0].access_count`, test:164, 346-347). If a method dropped its DB write, the fresh-instance read would return empty/0 and the test fails. The access-stats parity test (test:163-164) reads `listTokens("ENT-1")[0].access_count` after validate — that round-trips through SQL, not the local return. Honest.

5. **The 2 fixed sibling tests preserve original intent.**
 - "rejects expir
... [+6654 chars truncated]
