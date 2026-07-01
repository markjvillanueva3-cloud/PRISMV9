---
type: "chat-session"
source: "claude-code-cli"
session_id: "19dff632-e5c0-49cd-ad5a-524091f39df0"
title: "Reviewer B (test-integrity) of three independent reviewers for PRISM commit 18f3"
date: "2026-06-09"
first_ts: "2026-06-09T23:58:03.501Z"
last_ts: "2026-06-09T23:58:53.772Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/19dff632-e5c0-49cd-ad5a-524091f39df0/subagents/agent-ac093f3fb3c3154cc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Reviewer B (test-integrity) of three independent reviewers for PRISM commit 18f3

> **claude-code-cli** | 2026-06-09 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/19dff632-e5c0-49cd-ad5a-524091f39df0/subagents/agent-ac093f3fb3c3154cc.jsonl`

## Transcript

### User | 2026-06-09T23:58:03.501Z

Reviewer B (test-integrity) of three independent reviewers for PRISM commit 18f37c812e, unit U-HOTEL-ALLOWLIST-WRITE-ENABLE (slot:hotel). Do NOT assume reviewer A caught anything. Weight on TEST INTEGRITY (R9) and whether the tests actually PROVE the security gate.

CONTEXT: `mcp-server/src/routes/business.ts` now opens 4 handoff workflow-state writes behind a per-action role gate reading `req.userRoles`. The route test (`mcp-server/src/__tests__/businessDispatchRoute.test.ts`) MOCKS `../middleware/auth.js`. Previously the mock hardcoded `req.userRoles = ["lead"]`; it now reads roles from an `x-test-roles` header (absent → default `["lead"]`, empty → `[]`). A previously-passing test that asserted `handoff_counterparty_respond` is ALWAYS 403 was repurposed (that action is now role-gated-open).

FILES TO READ FULLY:
1. `H:/prism/mcp-server/src/__tests__/businessDispatchRoute.test.ts`
2. `H:/prism/mcp-server/src/routes/business.ts` (the SUT gate)
3. `H:/prism/mcp-server/src/data/business-dispatch-allowlist.ts`

CHECK SPECIFICALLY:
- Does the new write-role-gate describe block actually PROVE the gate? It must show: (i) each opened write reaches the dispatcher ONLY with a manager role, (ii) a non-manager role (viewer) gets 403, (iii) NO roles (empty) gets 403, (iv) financial writes (po_approve/payroll_run/gl_*) stay 403 EVEN for admin and never reach callTool. Confirm the `calls.length` before/after assertions actually prove the dispatcher was/wasn't reached.
- Is the header-driven role mock FAITHFUL to real verifyToken? Real verifyToken attaches `req.userRoles: string[]`; the mock sets the same shape. The in-handler gate logic under test reads `req.userRoles` — so is the gate logic genuinely exercised, or does the mock paper over something? Flag if the mock diverges from the real contract in a way that hides a bug.
- Would any test still pass if the gate were removed/weakened (e.g., if someone made the write path bypass the role check)? i.e., are the 403 assertions load
... [+602 chars truncated]

### Assistant | 2026-06-09T23:58:08.104Z

I'll review commit 18f37c812e for unit U-HOTEL-ALLOWLIST-WRITE-ENABLE, focusing on test integrity. Let me read the three required files fully.

### Assistant | 2026-06-09T23:58:09.224Z

[tool_use: Read]

### Assistant | 2026-06-09T23:58:09.743Z

[tool_use: Read]

### Assistant | 2026-06-09T23:58:10.117Z

[tool_use: Read]

### User | 2026-06-09T23:58:10.424Z

[tool_result] 1	/**
2	 * HOTEL-NETPLAT-UI / U-VNET-ROUTE — POST /api/v1/business/dispatch
3	 *
4	 * Verifies the secured generic business-dispatch surface: deny-by-default allowlist (the load-bearing
5	 * security property — a financial/PII action must be UNREACHABLE), verbatim dispatcher passthrough so
6	 * the client's unwrapBusiness sees the real shape, and fail-loud error surfacing. Drives the Express
7	 * 
... [+12205 chars truncated]

### User | 2026-06-09T23:58:12.757Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Business dispatch route (HOTEL-NETPLAT-UI / U-VNET-ROUTE)
3	 *
4	 * POST /api/v1/business/dispatch  { action, params } → prism_business dispatcher.
5	 *
6	 * This is the generic dispatch surface that the business-domain frontend client modules
7	 * (web/src/api/businessDispatch.ts → vendorNetwork.ts, hotelBusiness.ts) target. Before this
8	 * route, those clients POST
... [+5736 chars truncated]

### User | 2026-06-09T23:58:13.466Z

[tool_result] 1	/**
2	 * business-dispatch-allowlist.ts — the curated set of prism_business actions the browser may
3	 * invoke through POST /api/v1/business/dispatch (createBusinessRouter).
4	 *
5	 * ── SECURITY: DENY-BY-DEFAULT ───────────────────────────────────────────────────────────────
6	 * The prism_business dispatcher exposes ~879 actions, many of which are FINANCIAL
7	 * (payroll_run, gl_journal_entry
... [+6488 chars truncated]

### Assistant | 2026-06-09T23:58:53.772Z

All three files read fully. Now performing the test-integrity analysis against the SUT gate.

Let me trace each required security property through the test code and the SUT, verifying the assertions are load-bearing.

## Analysis

### Gate logic (SUT) — `business.ts:82-99`
The gate is: `readAllowed = isBusinessActionAllowed(action)`, `writeAllowed = isBusinessWriteAllowed(action)`. If neither → 403. If `writeAllowed` → fetch `required` roles, read `req.userRoles`, and `!roles.some((r) => required.includes(r))` → 403. Only then does it reach `callTool`.

### Mock fidelity — `test.ts:13-21`
Real `verifyToken` attaches `req.userRoles: string[]`. The mock sets `req.userRoles` to the same shape (`string[]`): absent header → `["lead"]`, `""` → `[]`, `"a,b"` → `["a","b"]`. The SUT gate reads exactly `req.userRoles` (line 92, with `Array.isArray` guard). The mock is faithful to the consumed contract — the gate logic is genuinely exercised, not papered over. `requireRole` is also mocked but the dispatch route does NOT use `requireRole` (it does inline role-checking), so that mock is inert for this route — not a concern.

### Property-by-property verification

**(i) Each opened write reaches dispatcher ONLY with manager role** — `test.ts:194-203`. `it.each(OPENED_WRITES)` over all 4 with role `"lead"` (manager-tier per `MANAGER_TIER_ROLES`). Asserts `status===200`, `calls.length === before+1`, and `calls[last].action === action`. The before/after `calls.length` delta proves dispatcher reached. Load-bearing.

**(ii) Non-manager (viewer) → 403, never reaches dispatcher** — `test.ts:212-221`. `viewer` role → `expect(status).toBe(403)`, `body.error` matches `/requires one of role/` (the WRITE-gate message specifically, line 96 — distinguishes from the deny-by-default message), `calls.length === before`. Load-bearing.

**(iii) NO roles (empty) → 403** — `test.ts:223-232`. Empty header → `[]`. Asserts 403, write-gate message, `calls.length === before`. Load-bearing. This exercises 
... [+5618 chars truncated]
