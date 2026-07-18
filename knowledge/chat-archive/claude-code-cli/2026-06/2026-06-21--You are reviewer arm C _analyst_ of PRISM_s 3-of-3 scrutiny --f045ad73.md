---
type: "chat-session"
source: "claude-code-cli"
session_id: "f045ad73-5749-4a27-be80-94e74dbb3df6"
title: "You are reviewer arm C (analyst) of PRISM's 3-of-3 scrutiny gate, weighted towar"
date: "2026-06-21"
first_ts: "2026-06-21T03:20:06.792Z"
last_ts: "2026-06-21T03:24:31.011Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 22
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/f045ad73-5749-4a27-be80-94e74dbb3df6/subagents/agent-aa0ebde23fe7b7bf9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# You are reviewer arm C (analyst) of PRISM's 3-of-3 scrutiny gate, weighted towar

> **claude-code-cli** | 2026-06-21 | 63 msgs (22 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f045ad73-5749-4a27-be80-94e74dbb3df6/subagents/agent-aa0ebde23fe7b7bf9.jsonl`

## Transcript

### User | 2026-06-21T03:20:06.792Z

You are reviewer arm C (analyst) of PRISM's 3-of-3 scrutiny gate, weighted toward silent breakage, regression risk, I/O security, and integration coupling. Do NOT assume arms A or B caught anything. Review ONLY these 3 commits: a48018838b (U-COMM-03), 6285b7db3e (U-COMM-02), ccaa4ee6c3 (U-COMM-02b) on H:/prism. Run `git -C H:/prism show a48018838b 6285b7db3e ccaa4ee6c3` and read the files.
Focus: (1) Does mounting createBillingWebhookRouter with express.raw BEFORE express.json in mcp-server/src/index.ts break body parsing for ANY other route (does it only match /api/v1/billing/webhook, not all of /api/v1/billing)? (2) Global attachUserPlan middleware runs on EVERY /api request — is it cheap + crash-proof (a thrown error must not 500 the whole API)? (3) The in-memory usageCounter is process-local — is that surfaced honestly (not claimed as durable)? (4) recordFeatureUse fires after the handler — does a failed calc still count against the user's daily cap (it should NOT)? (5) Does the webhook ack-then-persist ordering risk losing a subscription update on persist failure? Grade PASS or FAIL with P0/P1/P2 + file:line. End with: VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-21T03:20:10.387Z

I'll review these 3 commits carefully. Let me start by examining the diffs and the relevant files.

### Assistant | 2026-06-21T03:20:10.757Z

[tool_use: Bash]

### User | 2026-06-21T03:20:15.821Z

[tool_result] commit a48018838b8d50a861f7ee06a9eb30674456ecd7
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 22:09:23 2026 -0500

    [MAIN-FORCE] [PRODUCT-LAUNCH]/U-COMM-03 (slot:quebec for papa): activate entitlement enforcement (the #1 launch blocker)
    
    Root cause of dormancy (verified): requireTier was built+tested but (1) unwired and (2) req.user.plan was NEVER set + 
... [+4171 chars truncated]

### Assistant | 2026-06-21T03:20:18.704Z

Let me look at the full diffs for each commit and read the relevant files.

### Assistant | 2026-06-21T03:20:19.703Z

[tool_use: Bash]

### User | 2026-06-21T03:20:24.004Z

[tool_result] <persisted-output>
Output too large (30.4KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\f045ad73-5749-4a27-be80-94e74dbb3df6\tool-results\b315ryk04.txt

Preview (first 2KB):
commit a48018838b8d50a861f7ee06a9eb30674456ecd7
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 22:09:23 2026 -0500

    [MAIN-FORCE] [PRODUCT-LAUNCH]/U-COMM-03 (slot:quebec 
... [+1771 chars truncated]

### Assistant | 2026-06-21T03:20:26.441Z

Let me read the actual current files rather than the diff (the diffs reflect what's on disk now). Let me read the key files.

### Assistant | 2026-06-21T03:20:26.846Z

[tool_use: Read]

### User | 2026-06-21T03:20:28.196Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-995 of 1566 total (33423 tokens, cap 25000). Call Read with offset=996 limit=995 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * PRISM MCP Server - Main Entry Point
3	 * Manufacturing Intelligence MCP Server
4	 * 
5	 * Provid
... [+55384 chars truncated]

### Assistant | 2026-06-21T03:20:31.657Z

Now let me find where the express middleware and routers are mounted in index.ts. Let me search for the relevant mounting code.

### Assistant | 2026-06-21T03:20:33.138Z

[tool_use: Grep]

### User | 2026-06-21T03:20:34.569Z

[tool_result] 64:import { createIntakeRouter } from "./routes/intake.js";
65:import { createBillingWebhookRouter } from "./routes/billing.js";
1017:  // FIRST if a peer owns it. FIX 1 (httpServer 'error' handler at app.listen)
1041:  // express.json so the raw body parser inside intake router sees the
1042:  // exact bytes the HMAC was computed over (express.json would otherwise
1044:  app.use("/api/intake", cr
... [+420 chars truncated]

### Assistant | 2026-06-21T03:20:37.042Z

Now let me read the critical mounting section of index.ts (lines 1010-1080) and the routes/index.ts where attachUserPlan is wired.

### Assistant | 2026-06-21T03:20:37.738Z

[tool_use: Read]

### User | 2026-06-21T03:20:38.590Z

[tool_result] 1010	  log.info(SERVER_DESCRIPTION);
1011	
1012	  // HARDEN (golf 2026-06-02 MCP-HARDEN) FIX 2 — pre-bootstrap port preflight.
1013	  // The heavy bootstrapServices() below loads every engine (~700MB RSS). It must
1014	  // NOT run if :PORT is already owned by a peer — that is exactly how the
1015	  // 11-instance / ~7.8GB leak formed: bind-race losers loaded all engines then
1016	  // hung portle
... [+4821 chars truncated]

### Assistant | 2026-06-21T03:20:40.973Z

This is the critical mounting. Let me find where the main API routes (`/api/v1`) get mounted with `createRoutes` from routes/index.ts. Let me search further down.

### Assistant | 2026-06-21T03:20:42.667Z

[tool_use: Grep]

### User | 2026-06-21T03:20:44.543Z

[tool_result] 1410:  const { registerRoutes } = await import("./routes/index.js");

### Assistant | 2026-06-21T03:20:47.105Z

[tool_use: Read]

### User | 2026-06-21T03:20:47.925Z

[tool_result] 1400	    } catch (e: any) {
1401	      // callTool backs ALL 42 REST routes; a dispatcher/engine throw here
1402	      // previously returned a bare {error} to the client with ZERO server-side
1403	      // record of which tool/action failed or the stack. Log, shape unchanged.
1404	      log.error("[CALL_TOOL] dispatcher error", { toolName, action, message: e?.message, stack: e?.stack });
1405	   
... [+2703 chars truncated]

### Assistant | 2026-06-21T03:20:50.475Z

Now let me read the routes/index.ts to understand `registerRoutes` and where `attachUserPlan` is wired globally.

### Assistant | 2026-06-21T03:20:50.933Z

[tool_use: Read]

### User | 2026-06-21T03:20:51.765Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\index.ts' was already read 19s ago in this session and is unchanged (mtime 1782011046945). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T03:20:54.896Z

The guard says I've read it, but I don't actually have it in context. Let me grep the file for the relevant wiring.

### Assistant | 2026-06-21T03:20:55.577Z

[tool_use: Bash]

### User | 2026-06-21T03:21:01.542Z

[tool_result]      1	/**
     2	 * PRISM MCP Server — Route Registry
     3	 * Central registration for all API route modules
     4	 *
     5	 * 41 route modules:
     6	 * - SFC (7), SpeedFeed (8), CAD (5), CAM (4), Quality (4), Schedule (4), Cost (4)
     7	 * - Export (5), Data (7), Safety (4), Auth (6), Admin (6), OpenAPI (1)
     8	 * - PPG (8), Learning (10), ERP (10)
     9	 * - EDM (7), Turning (6)
   
... [+19582 chars truncated]

### Assistant | 2026-06-21T03:21:06.894Z

I now have the routing picture clearly. Two key facts:
- `createBillingWebhookRouter()` is mounted at `/api/v1/billing` BEFORE express.json (index.ts:1048)
- `createBillingRouter()` is mounted at `/api/v1/billing` AFTER express.json (routes/index.ts:204)
- `attachUserPlan` is mounted globally at `/api` (routes/index.ts:141), AFTER express.json runs (index.ts:1054), so it runs on every `/api` request.

But note: the webhook router at index.ts:1048 mounts BEFORE the `/api` middleware stack from registerRoutes (registerRoutes runs at index.ts:1411, well after 1048). So the webhook handler does NOT go through `attachUserPlan` — good. Let me now read the billing routes and the engine.

### Assistant | 2026-06-21T03:21:07.817Z

[tool_use: Bash]

### User | 2026-06-21T03:21:14.571Z

[tool_result]      1	/**
     2	 * PRISM MCP Server — Billing Routes
     3	 * Stripe subscription management and post-processor purchases.
     4	 *
     5	 * Endpoints:
     6	 *   POST /api/v1/billing/create-checkout   — create subscription checkout
     7	 *   POST /api/v1/billing/portal            — customer billing portal
     8	 *   POST /api/v1/billing/webhook           — Stripe webhook (no auth,
... [+12471 chars truncated]

### Assistant | 2026-06-21T03:21:17.117Z

Now let me read the key files for the entitlement question: `attachUserPlan.ts`, `usageCounter.ts`, `sfc.ts`, and `SubscriptionStore.ts`.

### Assistant | 2026-06-21T03:21:18.471Z

[tool_use: Bash]

### User | 2026-06-21T03:21:23.294Z

[tool_result] ===== attachUserPlan.ts =====
     1	/**
     2	 * attachUserPlan -- resolves the authenticated user's subscription plan + today's
     3	 * usage onto req.user (U-COMM-03).
     4	 *
     5	 * THE keystone wire: tierGate.requireTier and billing /status read
     6	 * `req.user.plan` / `req.user.usage`, but nothing ever populated them, so every
     7	 * request resolved to the "free" fail-safe (e
... [+5559 chars truncated]

### Assistant | 2026-06-21T03:21:26.656Z

Now let me check the previous version of usageCounter.ts to verify the "stub -> real" claim didn't break the infraDispatcher contract, and read the sfc.ts route plus the tierGate. Let me also check the SubscriptionStore engine.

### Assistant | 2026-06-21T03:21:28.234Z

[tool_use: Bash]

### User | 2026-06-21T03:21:33.127Z

[tool_result] ===== sfc.ts (diff for this commit) =====
commit a48018838b8d50a861f7ee06a9eb30674456ecd7
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 22:09:23 2026 -0500

    [MAIN-FORCE] [PRODUCT-LAUNCH]/U-COMM-03 (slot:quebec for papa): activate entitlement enforcement (the #1 launch blocker)
    
    Root cause of dormancy (verified): requireTier was built+tested but (1) unwi
... [+3426 chars truncated]

### Assistant | 2026-06-21T03:21:38.877Z

Now I see a critical detail in the sfc.ts route. The order is: `requireTier("speed_feed")` runs FIRST (blocks if over cap), THEN the handler runs `callTool` and `recordFeatureUse`. This matters for question 4 — does a failed calc count? Let me examine the tierGate to understand how it reads the counter, and the `recordFeatureUse` placement relative to errors.

Note from sfc.ts: `recordFeatureUse(req, "speed_feed")` runs AFTER `await callTool(...)` succeeds — if `callTool` throws, it jumps to `catch (e) { next(e) }` and `recordFeatureUse` is skipped. Good. But there's a subtlety: a 200-OK response carrying an error payload (the galaxy #1 silent-zero class). Let me read the tierGate and SubscriptionStore.

### Assistant | 2026-06-21T03:21:39.682Z

[tool_use: Bash]

### User | 2026-06-21T03:21:45.248Z

[tool_result] ===== tierGate.ts =====
     1	/**
     2	 * PRISM MCP Server — Tier Gate Middleware
     3	 * Enforces subscription plan feature limits on API endpoints.
     4	 *
     5	 * Spec (MIT 6.005 contract):
     6	 *   - TIER_LIMITS is the single source of truth — exported for tests
     7	 *   - checkTierAccess is a pure function (no side effects)
     8	 *   - requireTier returns a standard Ex
... [+8294 chars truncated]

### Assistant | 2026-06-21T03:21:51.355Z

This is important. `requireTier` reads `req.user.usage[feature]` which is populated by `attachUserPlan` via `getDayCounts(userId)` at the start of the request. So the counter source-of-truth IS the in-memory counter, read once into req.user.usage at request start.

Note a subtle off-by-one consideration: `getDayCounts` is called in `attachUserPlan`; then `requireTier` reads from that snapshot. The counter is only incremented at the end via `recordFeatureUse`. So for a free user with 10/day: usage starts at 0, on request 1-10 the snapshot shows 0..9 (allowed, then increment to 1..10), on request 11 snapshot shows 10 -> `currentUsage < limit` is `10 < 10` = false -> blocked. Correct: exactly 10 allowed, 11th blocked. Good.

Now the SubscriptionStore engine — the persistence/durability and crash-proof questions.

### Assistant | 2026-06-21T03:21:52.392Z

[tool_use: Bash]

### User | 2026-06-21T03:21:57.830Z

[tool_result]      1	/**
     2	 * PRISM MCP Server -- SubscriptionStore (U-COMM-03 keystone)
     3	 *
     4	 * Persisted user -> subscription mapping. This is the missing layer that made
     5	 * entitlement enforcement dormant: tierGate.requireTier reads req.user.plan, but
     6	 * nothing ever resolved a user's plan. attachUserPlan middleware reads from here.
     7	 *
     8	 * Design:
     9	 *   - In-
... [+6358 chars truncated]

### Assistant | 2026-06-21T03:22:01.067Z

Now the StripeBillingEngine (verifyStripeSignature + handleWebhookEvent). This is the security-critical piece for question 5.

### Assistant | 2026-06-21T03:22:02.760Z

[tool_use: Bash]

### User | 2026-06-21T03:22:09.295Z

[tool_result] ===== StripeBillingEngine.ts diff (the 60 added lines) =====
commit 6285b7db3e8b5bf48e6e18ae51c4b58dfbfb0861
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 22:14:57 2026 -0500

    [MAIN-FORCE] [PRODUCT-LAUNCH]/U-COMM-02 (slot:quebec for papa): Stripe webhook signature verification + persist (security P0)
    
    - verifyStripeSignature (pure HMAC-SHA256, Stripe t=
... [+4250 chars truncated]

### Assistant | 2026-06-21T03:22:14.335Z

The signature verification looks solid: HMAC-SHA256, length check before `timingSafeEqual`, constant-time, replay window, fail-closed on malformed. Let me read `handleWebhookEvent` to confirm what `data` (especially `userId`/`plan`/`customerId`) it returns, since `applyWebhookToStore` depends on those fields.

### Assistant | 2026-06-21T03:22:15.214Z

[tool_use: Read]

### User | 2026-06-21T03:22:16.523Z

[tool_result] 355	  // --------------------------------------------------------------------------
356	
357	  /**
358	   * Process a Stripe webhook event.
359	   * Always returns { action, data } — never throws on unknown event types.
360	   *
361	   * @param event - Stripe event object (already verified by route layer)
362	   * @returns { action, data }
363	   */
364	  async handleWebhookEvent(event: any): Prom
... [+3405 chars truncated]

### Assistant | 2026-06-21T03:22:26.960Z

Now I have the full picture for all 5 questions. Let me verify one critical integration coupling concern about the webhook router mounting: does `app.use("/api/v1/billing", createBillingWebhookRouter())` at index.ts:1048 only match `/api/v1/billing/webhook`, or does it intercept ALL `/api/v1/billing/*` requests and starve the later-mounted `createBillingRouter()` at routes/index.ts:204?

In Express, `app.use("/api/v1/billing", router)` mounts the router at that path prefix, but the router only has ONE route registered: `router.post("/webhook", ...)`. A request to `/api/v1/billing/status` enters this router, finds no matching route, and calls `next()` to fall through to subsequent middleware/routers. So the later `createBillingRouter()` (mounted at the same prefix in registerRoutes) handles `/status`, `/portal`, etc. This is correct Express behavior. Let me confirm there's no body-parser conflict though — let me check whether `createBillingRouter` routes need parsed JSON bodies and get them.

The order is:
1. index.ts:1044 `/api/intake` (raw)
2. index.ts:1048 `/api/v1/billing` webhook router (raw on `/webhook` only)
3. index.ts:1054 `express.json()` global
4. routes/index.ts:204 `/api/v1/billing` full router (needs JSON) — runs after express.json, gets parsed bodies. Correct.

Now, one regression concern: the webhook router's `express.raw({ type: "application/json" })` is scoped to the `/webhook` route only, so it won't consume bodies for other billing routes. Good. Let me verify the test files reference and check whether there's an existing data/state dir and an `atomicWrite` safeWriteSync that creates dirs (for the persist path).

### Assistant | 2026-06-21T03:22:29.318Z

[tool_use: Bash]

### User | 2026-06-21T03:22:34.241Z

[tool_result] ===== safeWriteSync =====
58:export function safeWriteSync(
4: * Writes to <path>.tmp then renames to <path>. NTFS rename within same
18:import { dirname } from "node:path";
21: * Atomic write: write to .tmp file, then rename over target.
26:  const tmpPath = `${targetPath}.tmp`;
27:  const dir = dirname(targetPath);
30:  await fs.mkdir(dir, { recursive: true });
33:  await fs.writeFile(tmpPath, c
... [+490 chars truncated]

### Assistant | 2026-06-21T03:22:44.646Z

`safeWriteSync` creates the dir recursively (atomic temp+rename). Good. Now let me verify the one remaining concern for question 4 (failed calc counting) and question 2 (attachUserPlan crash-proofness) by examining what `callTool` returns on dispatcher error and whether the sfc handler's 200-OK-with-error path could miscount. Let me also confirm `req.userId`/`req.userRoles` are properly typed/populated by optionalToken so attachUserPlan doesn't blow up.

I already saw the key facts:
- `attachUserPlan` is wrapped in try/catch returning a free fail-safe (index: middleware:18-43) — crash-proof, never throws, never 500s. Good.
- `recordFeatureUse` runs AFTER `await callTool` succeeds; if callTool throws, control jumps to catch -> next(e) and recordFeatureUse is skipped. So a hard-failed calc does NOT count. 

But there's the galaxy #1 silent-zero class (200-OK carrying `{error}`): if `callTool` returns a result object that contains an error field rather than throwing, the sfc handler still calls `recordFeatureUse` and returns 200. Let me check what `callTool` does on a dispatcher error — I saw at index.ts:1404-1405 it returns `{ error: e.message }` (does NOT re-throw). This is the critical coupling. Let me confirm the sfc route's behavior with that shape.

### Assistant | 2026-06-21T03:22:45.218Z

[tool_use: Read]

### User | 2026-06-21T03:22:47.106Z

[tool_result] 1360	      // (invisible to operators; mid-write left a half-emitted response). The
1361	      // res.on("close") cleanup above still fires for slot release.
1362	      respondTransportError(res, e, (req.body && (req.body as any).id) ?? null);
1363	    }
1364	  });
1365	
1366	  // MCP Streamable HTTP — GET (SSE stream for server-initiated messages)
1367	  app.get("/mcp", async (req, res) => {
1368
... [+2099 chars truncated]

### Assistant | 2026-06-21T03:22:55.937Z

This confirms the critical coupling for question 4. `callTool` does NOT throw on a dispatcher/engine error — it RETURNS `{ error: "..." }` with a 200 status. The sfc handler:

```js
const result = await callTool("prism_product", "sfc_calculate", req.body);
recordFeatureUse(req, "speed_feed");   // <-- ALWAYS runs (callTool didn't throw)
res.json({ result, safety: result?.safety, meta: result?.meta });  // 200 OK with result={error:...}
```

So when `prism_product:sfc_calculate` errors out (tool-not-found OR dispatcher throw OR engine throw), `callTool` returns `{error}`, the handler does NOT enter the catch, and `recordFeatureUse` STILL increments the free user's daily counter. The user is charged a calc against their 10/day cap for a calculation that FAILED and returned no usable result. This is precisely the "failed calc should NOT count" failure the prompt asks about, and it is real.

This is a P1 (billing/entitlement correctness — a paying-boundary metering bug that wrongs the user). Let me verify the entitlement test to confirm it does not cover this path (it tests the counter mechanics, not the failed-handler path), and double-check the test files quickly.

### Assistant | 2026-06-21T03:22:56.696Z

[tool_use: Bash]

### User | 2026-06-21T03:23:01.213Z

[tool_result] ===== entitlement-enforcement.test.ts =====
     1	import { describe, it, expect, beforeEach } from "vitest";
     2	import type { Request, Response } from "express";
     3	import { requireTier, checkTierAccess } from "../middleware/tierGate.js";
     4	import { getUsageCounterSync } from "../middleware/usageCounter.js";
     5	
     6	/**
     7	 * U-COMM-03 round-trip: prove the entitlement gat
... [+4629 chars truncated]

### Assistant | 2026-06-21T03:23:20.888Z

Confirmed: the tests cover the gate mechanics and counter mechanics, but NOT the route-level integration where a failed `callTool` still triggers `recordFeatureUse`. The metering-on-failure bug is unguarded.

Now let me verify question 3 (in-memory honesty) — both `usageCounter.ts` and `SubscriptionStore.ts` doc comments. The usageCounter clearly says "In-memory only (process-local)" — honest. But the SubscriptionStore header says "Persisted user -> subscription mapping" and the commit says "in-memory + lazy sync load." It DOES persist to disk via safeWriteSync, so "persisted" is accurate for the store. The usageCounter (the daily caps) is NOT persisted — and that's the honesty question. The doc is honest about it. But there's a real durability consequence worth flagging: the usage counter resets on every process restart, so the free-tier daily cap is trivially bypassable (restart-or-multi-instance resets the count). Let me confirm there's not a multi-instance angle and check the SubscriptionStore for a concurrency (lost-update) issue since multiple MCP instances / concurrent webhooks do read-modify-write on the same JSON file.

The SubscriptionStore: `persist()` does `ensureLoaded()` (in-memory map) then `safeWriteSync` of the whole map. Two concerns:
1. The in-memory map is loaded ONCE (lazy) and never re-reads disk. If two processes (or the webhook-handling process vs. another) both hold the store, a `setPlan` in one overwrites the whole file, blind to the other's writes — lost-update across instances/processes. Given the preflight ensures single-instance binding on a port, this is lower risk, but webhook persist + API persist in the SAME process share one in-memory map (consistent within process). Cross-process is the risk. This is a P2 given the single-instance design.

Now let me confirm the webhook ack-then-persist ordering risk (question 5) precisely. Looking at billing.ts:118-126:

```js
const result = await billing.handleWebhookEvent(event);
res.json({ rec
... [+1168 chars truncated]

### Assistant | 2026-06-21T03:23:23.522Z

[tool_use: Bash]

### User | 2026-06-21T03:23:27.624Z

[tool_result] ===== billing webhook test (find file) =====
H:/prism/mcp-server/src/__tests__/stripe-webhook-verify.test.ts

===== persist-failure coverage? =====
H:/prism/mcp-server/src/__tests__/stripe-billing.test.ts:124:  it("throws on unknown type", () => {
H:/prism/mcp-server/src/__tests__/stripe-billing.test.ts:206:  it("unknown event type → action = unhandled (no throw)", async () => {
H:/prism/mcp-serve
... [+117 chars truncated]

### Assistant | 2026-06-21T03:23:31.635Z

[tool_use: Bash]

### User | 2026-06-21T03:23:35.606Z

[tool_result]      1	import { describe, it, expect } from "vitest";
     2	import { createHmac } from "node:crypto";
     3	import { verifyStripeSignature } from "../engines/StripeBillingEngine.js";
     4	import { applyWebhookToStore } from "../routes/billing.js";
     5	import { SubscriptionStore } from "../engines/SubscriptionStore.js";
     6	import { mkdtempSync, rmSync } from "node:fs";
     7	import { jo
... [+5704 chars truncated]

### Assistant | 2026-06-21T03:24:31.011Z

The webhook signature verification tests are thorough (tamper/wrong-secret/replay/malformed/rotation/multi-v1) — genuinely good. The persist tests cover the happy and fail-safe data paths but NOT the ack-then-persist-failure scenario (no test where `safeWriteSync` fails after ack).

Now let me address one more silent-breakage concern for question 5: the `subscription_updated` handler. Looking at billing.ts:49-57, it computes `status` from `data.status` (e.g. Stripe's `sub.status` = "active"/"past_due"/"canceled"/etc.) and calls `store.setPlan(userId, rec?.plan ?? "free", status)`. But `data.planId` (the new price id from `sub.items.data[0].price.id`) is IGNORED — a plan CHANGE via `customer.subscription.updated` (upgrade/downgrade done in the Stripe portal, not via checkout) will update the STATUS but keep the OLD plan. This is a real entitlement-drift bug: a user who downgrades pro->starter in the Stripe portal keeps pro entitlements (or upgrade starter->pro keeps starter). Let me verify `planId` is never mapped to a Plan. The `applyWebhookToStore` `subscription_updated` case only reads `data.status`, never `data.planId`. Confirmed — plan changes via the portal silently don't take effect. This is a P2 (functional gap, not a crash; checkout-driven changes work, only portal-driven plan swaps drift). Given the U-COMM-02b /portal commit explicitly enables the Stripe billing portal (where users CAN change plans), this gap is directly reachable.

Let me do a final check on whether `attachUserPlan` running on EVERY `/api` request triggers a disk read each time (the "is it cheap" part of Q2). `getPlan` -> `ensureLoaded()` reads disk only ONCE (cached in `this.users`); subsequent calls hit the in-memory map. `getDayCounts` is pure in-memory. So per-request cost = two Map lookups. Cheap. Confirmed. One nuance: the very FIRST `/api` request triggers a synchronous `readFileSync` on the request hot path (lazy load). For a launch that's negligible, but it is a synchronous disk r
... [+7797 chars truncated]
