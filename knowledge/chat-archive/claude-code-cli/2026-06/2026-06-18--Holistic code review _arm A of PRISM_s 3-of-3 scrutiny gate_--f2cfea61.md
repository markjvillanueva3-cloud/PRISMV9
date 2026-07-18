---
type: "chat-session"
source: "claude-code-cli"
session_id: "f2cfea61-43e1-4a66-a16a-4ff1dfcc2d94"
title: "Holistic code review (arm A of PRISM's 3-of-3 scrutiny gate) of slot:romeo's fro"
date: "2026-06-18"
first_ts: "2026-06-18T15:46:56.587Z"
last_ts: "2026-06-18T15:51:34.375Z"
cwd: "H:\\prism-slot-romeo"
messages: 59
user_msgs: 21
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism-slot-romeo/f2cfea61-43e1-4a66-a16a-4ff1dfcc2d94/subagents/agent-acfecf3d6b374b3ed.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:08"
---

# Holistic code review (arm A of PRISM's 3-of-3 scrutiny gate) of slot:romeo's fro

> **claude-code-cli** | 2026-06-18 | 59 msgs (21 user / 38 assistant) | cwd: H:\prism-slot-romeo
> Raw: `H:/.claude/projects/H--prism-slot-romeo/f2cfea61-43e1-4a66-a16a-4ff1dfcc2d94/subagents/agent-acfecf3d6b374b3ed.jsonl`

## Transcript

### User | 2026-06-18T15:46:56.587Z

Holistic code review (arm A of PRISM's 3-of-3 scrutiny gate) of slot:romeo's frontend↔backend contract-audit deliverable. Read each file END-TO-END and grade PASS or FAIL with P0/P1/P2 findings + file:line citations.

CONTEXT / CONTRACT being verified:
- The Vite/React SPA (mcp-server/web/src) fetches GET /api/shop/snapshot (getShopFloorSnapshot) and GET /api/shop/jobs (getShopJobs, in web/src/api/client.ts). These were 404ing because mcp-server/src/routes/shopLive.ts (a complete 19-endpoint ShopStateEngine-backed router, export default router, paths /shop/*) was NEVER imported/mounted in registerRoutes.
- The fix mounts it. The audit tool maps SPA /api/* calls vs backend routes.

FILES TO REVIEW (absolute paths):
1. H:\prism\mcp-server\src\routes\index.ts — the 3 edits: (a) import shopLiveRouter from "./shopLive.js" near line 42, (b) app.use("/api", shopLiveRouter) inserted BEFORE the errorHandler (which must remain last), (c) log.info note update. VERIFY: mount ordering correct (errorHandler still last); bare /api mount of a /shop/* router does NOT shadow or conflict with other /api/v1/* or bare /api mounts (openapi); default import matches esModuleInterop.
2. H:\prism\mcp-server\src\routes\shopLive.ts — the router being mounted (read for context; confirm it's safe to mount: no side effects at import, uses shopStateEngine singleton, no callTool needed).
3. H:\prism\mcp-server\src\__tests__\shopLive-route-mount.test.ts — VERIFY it genuinely tests the mount (real assertions, not stubs): snapshot 200, jobs 200+shape, create→list round-trip, negative-control 404. Would it FAIL if the mount were removed?
4. H:\prism\scripts\audit-frontend-backend-contract.mjs — VERIFY the logic: SPA /api prefix extraction, backend mount resolution + sub-router path EXPANSION (resolves app.use(prefix, ident) → router source file → router.METHOD paths), coverage check. Any false-positive or false-negative risk in the gap detection?

Report only real issues. Cite file:line. End with: GRAD
... [+23 chars truncated]

### Assistant | 2026-06-18T15:47:00.311Z

I'll review each file end-to-end. Let me start by reading all four files in parallel.

### Assistant | 2026-06-18T15:47:00.797Z

[tool_use: Read]

### Assistant | 2026-06-18T15:47:01.731Z

[tool_use: Read]

### User | 2026-06-18T15:47:01.764Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Route Registry
3	 * Central registration for all API route modules
4	 *
5	 * 41 route modules:
6	 * - SFC (7), SpeedFeed (8), CAD (5), CAM (4), Quality (4), Schedule (4), Cost (4)
7	 * - Export (5), Data (7), Safety (4), Auth (6), Admin (6), OpenAPI (1)
8	 * - PPG (8), Learning (10), ERP (10)
9	 * - EDM (7), Turning (6)
10	 * - Threads (12), Compliance (8), Telemetry 
... [+15252 chars truncated]

### User | 2026-06-18T15:47:02.183Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\shopLive.ts' was already read 10m ago in this session and is unchanged (mtime 1775269034000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T15:47:02.197Z

[tool_use: Read]

### Assistant | 2026-06-18T15:47:02.405Z

[tool_use: Read]

### User | 2026-06-18T15:47:03.307Z

[tool_result] 1	/**
2	 * shopLive-route-mount.test.ts — FE-ROUTE-MOUNT 2026-06-18 (slot:romeo)
3	 *
4	 * Regression guard for the frontend<->backend contract gap found by
5	 * scripts/audit-frontend-backend-contract.mjs: the web SPA calls GET /api/shop/snapshot
6	 * (getShopFloorSnapshot) and GET /api/shop/jobs (getShopJobs), but routes/shopLive.ts — the
7	 * 19-endpoint live-shop router that serves them — was 
... [+4082 chars truncated]

### User | 2026-06-18T15:47:04.413Z

[tool_result] 1	/**
2	 * audit-frontend-backend-contract.mjs
3	 * [BACKEND-FRONTEND]/U-CONTRACT-AUDIT (slot:romeo, operator goal 2026-06-18: backend -> enable frontend focus).
4	 *
5	 * The web SPA (mcp-server/web/src, Vite/React) calls `/api/*` endpoints that nginx/vite proxy to the
6	 * Express backend-for-frontend on :3000 (`mcp-server/src/routes/index.ts registerRoutes()` mounting domain
7	 * routers -> cal
... [+7207 chars truncated]

### Assistant | 2026-06-18T15:47:07.634Z

shopLive.ts was read earlier in this session. Let me retrieve its content since the cache blocked the re-read but I need to verify the contract (export default, no import side effects, route paths, response shapes).

### Assistant | 2026-06-18T15:47:07.998Z

[tool_use: Read]

### User | 2026-06-18T15:47:08.451Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\shopLive.ts' was already read 10m ago in this session and is unchanged (mtime 1775269034000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T15:47:14.184Z

The read-once guard claims the file is in context, but I don't actually have its content (it was read by a prior agent/session, not in my visible context). I must verify the shopLive.ts contract directly rather than guess. Let me Grep the specific load-bearing facts.

### Assistant | 2026-06-18T15:47:17.300Z

[tool_use: Bash]

### User | 2026-06-18T15:47:23.380Z

[tool_result] LINES 181
---EXPORT-DEFAULT---
true
---TOP-LEVEL-CALLS (side effects at import)---
147: await shopStateEngine.submitApproval(req.body);

### Assistant | 2026-06-18T15:47:25.875Z

Now let me read shopLive.ts in full via Bash (bypassing the read-once guard) to verify the route paths, response shapes the test asserts, and the singleton usage.

### Assistant | 2026-06-18T15:47:26.549Z

[tool_use: Bash]

### User | 2026-06-18T15:47:31.290Z

[tool_result]      1	/**
     2	 * Shop Live Routes — ULT-MS0 P1-U03
     3	 *
     4	 * Dedicated HTTP route surface for live shop state and subscription bootstrap.
     5	 * All routes delegate to ShopStateEngine (canonical state owner) instead of
     6	 * directly mutating data.
     7	 *
     8	 * Room subscriptions: POST /shop/subscribe → joins job/dept/emp WebSocket rooms
     9	 *
    10	 * @module rout
... [+7358 chars truncated]

### Assistant | 2026-06-18T15:47:36.035Z

Now I have the full shopLive.ts. Let me verify a few load-bearing facts: (1) the `line 147 await` flagged is inside a handler (not import-time side effect), (2) the test's response-shape assertions match the actual handler returns, (3) the SPA client actually calls these paths, (4) the ShopStateEngine singleton has no import-time side effects, and (5) the errorHandler ordering / esModuleInterop default-import correctness.

### Assistant | 2026-06-18T15:47:39.290Z

[tool_use: Bash]

### User | 2026-06-18T15:47:46.562Z

[tool_result] === client.ts shop calls ===
449:export async function getShopFloorSnapshot(): Promise<unknown> {
450:  return fetchJson<unknown>('/api/shop/snapshot', {
459:  return fetchJson<unknown>(`/api/shop/jobs?${query.toString()}`, {
=== esModuleInterop ===
10:    "esModuleInterop": true,
25:    "allowSyntheticDefaultImports": true,
=== other default-import-then-app.use precedents ===
42:import shopLiveRo
... [+729 chars truncated]

### Assistant | 2026-06-18T15:47:49.606Z

Good. Now let me check the SPA `getShopJobs` to confirm path shape, verify the ShopStateEngine singleton import has no side effects, and confirm the openapi router (mounted bare at /api before shopLive) doesn't have a catch-all that would shadow /shop/* paths.

### Assistant | 2026-06-18T15:47:52.748Z

[tool_use: Bash]

### User | 2026-06-18T15:47:59.307Z

[tool_result] === getShopJobs full ===
}

export async function getShopFloorJobs(limit = 20): Promise<unknown> {
  const query = new URLSearchParams({ limit: String(limit) });
  return fetchJson<unknown>(`/api/shop/jobs?${query.toString()}`, {
    method: 'GET',
    headers: getRequestHeaders(),
    fallbackMessage: 'Shop floor jobs request failed',
  });
}

export async function getShiftCountdown(): Promise<Pr
... [+610 chars truncated]

### Assistant | 2026-06-18T15:48:02.688Z

I see a naming discrepancy. The task says the SPA function is `getShopJobs`, but the actual client function is `getShopFloorJobs` (line 458). Let me verify the exact function names and confirm there is no constructor-time side effect in ShopStateEngine.

### Assistant | 2026-06-18T15:48:04.772Z

[tool_use: Bash]

### User | 2026-06-18T15:48:10.733Z

[tool_result] === exact SPA function names hitting shop ===
449:export async function getShopFloorSnapshot(): Promise<unknown> {
457:export async function getShopFloorJobs(limit = 20): Promise<unknown> {

=== ShopStateEngine constructor body (side effects?) ===
35:   constructor(repo?: ShopRepository) {
36:     this.repo = repo ?? new InMemoryShopRepository();
37:   }

### Assistant | 2026-06-18T15:48:16.143Z

The constructor only instantiates an in-memory repo — no disk I/O, no timers, no network. Safe to import. Now let me verify the test's create→list round-trip actually exercises the real engine (the test uses POST /shop/job/create then asserts the part_number appears in /shop/jobs). Let me confirm `createJob` and `listJobs` operate on shared state in the singleton, and check whether the negative-control 404 is genuinely Express default behavior (no catch-all in shopLive itself).

### Assistant | 2026-06-18T15:48:18.881Z

[tool_use: Bash]

### User | 2026-06-18T15:48:26.686Z

[tool_result] === createJob + listJobs shape (do they share state via repo?) ===
62:  async createJob(input: {
86:    await this.repo.saveJob(job);
96:    const job = await this.repo.updateJobStatus(jobId, newStatus, userId, notes);
107:    return this.repo.getJob(id);
110:  async listJobs(filter?: { status?: string; customer?: string; limit?: number }): Promise<Job[]> {
111:    return this.repo.listJobs(filter
... [+1487 chars truncated]

### Assistant | 2026-06-18T15:48:31.889Z

All 4 tests pass against the real engine. Now let me verify the audit script actually flags shop correctly and would have caught the gap — i.e., confirm the SPA references `/api/shop/*` and that the audit's expansion logic credits the bare `/api` shopLive mount. Let me also check that the test would FAIL if the mount were removed (it imports the router directly, so removing the registerRoutes mount wouldn't break the test — that's a concern worth examining).

### Assistant | 2026-06-18T15:48:34.284Z

[tool_use: Bash]

### User | 2026-06-18T15:48:39.004Z

[tool_result] === run the audit ===
# Frontend<->backend contract audit (prefix-level, static)
SPA /api prefixes: 65 - backend mounts: 71 - covered: 61 - GAPS: 4

## SPA /api prefixes with NO backend mount (confirm fetch vs data-string, then route to owning domain):
- /api/dispatch  (referenced in 2 SPA file(s))
- /api/operator  (referenced in 2 SPA file(s))
- /api/machine-audit  (referenced in 1 SPA file(s))
-
... [+489 chars truncated]

### Assistant | 2026-06-18T15:48:43.847Z

The audit correctly credits `/api/shop` now (the expansion logic works). Let me verify the audit's expansion logic for false-positive/false-negative risk by examining the 4 reported gaps — are they real fetches or data-string noise? — and check the `covered()` parent/child logic for over-crediting. Let me also confirm the test failure-on-removal concern by examining what the test actually guards.

### Assistant | 2026-06-18T15:48:48.807Z

[tool_use: Bash]

### User | 2026-06-18T15:48:53.889Z

[tool_result] === are the 4 gaps real fetches? ===
--- /api/dispatch ---
mcp-server/web/src/pages/LatheERPDashboard.tsx
mcp-server/web/src/pages/LathePrintToProgram.tsx
--- /api/operator ---
mcp-server/web/src/components/operator/OperatorFeedbackPanel.tsx
mcp-server/web/src/__tests__/OperatorFeedbackPanel.test.tsx
--- /api/machine-audit ---
mcp-server/web/src/pages/MachineDataAuditPage.tsx
--- /api/prism ---
mc
... [+289 chars truncated]

### Assistant | 2026-06-18T15:48:58.197Z

I found an important detail in the `covered()` logic. Let me examine the over-credit risk more carefully. The concern: line 86 adds `prefixOf(mountPrefix)` for bare-ish mounts, and line 99's `mt.startsWith(pre + "/")` clause. Let me check whether bare `/api` mounts (securityHeaders, errorHandler, openapi, shopLive) leak a bare `/api` into servedPrefixes, which would credit everything.

### Assistant | 2026-06-18T15:49:05.757Z

[tool_use: Bash]

### User | 2026-06-18T15:49:12.424Z

[tool_result] --- mounts where mountPrefix is exactly /api (the test gate /^/api/[a-z]/) ---
  exact /api mount, ident= securityHeaders -> /^/api/[a-z]/ test= false
  exact /api mount, ident= corsMiddleware -> /^/api/[a-z]/ test= false
  exact /api mount, ident= rateLimitMiddleware -> /^/api/[a-z]/ test= false
  exact /api mount, ident= optionalToken -> /^/api/[a-z]/ test= false
  exact /api mount, ident= audit
... [+318 chars truncated]

### Assistant | 2026-06-18T15:49:18.272Z

This confirms the `/^\/api\/[a-z]/` guard on line 86 correctly prevents a bare `/api` mount from leaking into `servedPrefixes` directly (so it never over-credits everything). The bare `/api` mounts only contribute via their expanded sub-paths (line 89-92), which is exactly the intended behavior. The 4 reported gaps are real `.tsx` page fetches (correct true-positives, not noise).

Now let me address the one remaining concern: does the test FAIL if the mount is removed? The test imports `shopLiveRouter` directly and mounts it itself — so it does NOT test `registerRoutes`. Let me check whether any other test guards the actual `registerRoutes` wiring, and confirm the errorHandler-must-be-last invariant holds.

### Assistant | 2026-06-18T15:49:20.966Z

[tool_use: Bash]

### User | 2026-06-18T15:49:26.525Z

[tool_result] === any test that exercises registerRoutes directly for /api/shop? ===
mcp-server/src/__tests__/cwedm-calculator-routes.test.ts
mcp-server/src/__tests__/dfm-routes.test.ts
mcp-server/src/__tests__/lathe-turning-routes.test.ts
mcp-server/src/__tests__/learning-course-routes.test.ts
mcp-server/src/__tests__/learning-routes.test.ts
mcp-server/src/__tests__/m0-critical-routes.test.ts
mcp-server/src/__
... [+1558 chars truncated]

### Assistant | 2026-06-18T15:49:32.136Z

The grep matched `shopLive-route-mount.test.ts` only because the filename contains "shop" and the pattern was OR'd — the other files matched on `registerRoutes`. Let me confirm whether `m0-route-mounts.test.ts` (the route-mount sentinel) covers shop, and verify the `shopLive-route-mount.test.ts` does NOT actually import/call `registerRoutes` (which would make it a true mount-removal guard vs just a router-behavior guard).

### Assistant | 2026-06-18T15:49:35.401Z

[tool_use: Bash]

### User | 2026-06-18T15:49:40.038Z

[tool_result] === does m0-route-mounts.test.ts assert /api/shop ? ===
7:import { registerRoutes } from "../routes/index.js";
66:    registerRoutes(app, async (toolName, action, params) => {
=== does shopLive-route-mount.test.ts reference registerRoutes? (it should NOT per earlier read) ===
3
=== Would test fail if registerRoutes mount (line 251) removed? The test mounts the router ITSELF (line 64). Confirm: ===
... [+397 chars truncated]

### Assistant | 2026-06-18T15:49:44.827Z

This confirms a real weakness. The `shopLive-route-mount.test.ts` imports `shopLiveRouter` directly and mounts it itself (line 64) — it does NOT call `registerRoutes`. So if someone removed the `app.use("/api", shopLiveRouter)` line from `index.ts` (the actual fix), this test would STILL PASS — it does not guard the mount it claims to be a regression guard for. The 3 `registerRoutes` matches are all in comments/docstring, not in code. Let me check whether `m0-route-mounts.test.ts` (which DOES call registerRoutes) covers shop, since that would mitigate.

### Assistant | 2026-06-18T15:49:46.977Z

[tool_use: Bash]

### User | 2026-06-18T15:49:51.042Z

[tool_result] === m0-route-mounts: what paths does it assert? does it include /api/shop ? ===
EXIT: 1
=== full list of asserted mounts in m0-route-mounts (to see if shop is covered) ===
114:    const quoteResponse = await httpRequest("POST", "/api/v1/quote/generate", {
133:    const billingResponse = await httpRequest("GET", "/api/v1/billing/status");
141:    const hotSetResponse = await httpRequest("POST", "/a
... [+635 chars truncated]

### Assistant | 2026-06-18T15:49:56.180Z

Confirmed: no `registerRoutes`-level test asserts `/api/shop/*`. So the mount in `index.ts:251` is genuinely unguarded by a test — the new test guards only the router's standalone behavior, not the wiring fix it was written for. This is the core test-integrity gap.

Let me do a final check: verify the build compiles (the default import + the new mount), and double-check the `covered()` `mt.startsWith(pre + "/")` clause for a subtle false-negative-masking concern (could it credit a SPA prefix as covered when only a SIBLING sub-path is served?).

### Assistant | 2026-06-18T15:50:03.347Z

[tool_use: Bash]

### User | 2026-06-18T15:50:25.671Z

[tool_result] servedPrefixes has bare /api/v1 (would over-credit ALL v1)? true
sample servedPrefixes: /api/docs, /api/mcp/quoting, /api/ppg, /api/shop, /api/v1, /api/v1/admin, /api/v1/agent, /api/v1/alarm-decode, /api/v1/asset-check, /api/v1/auth, /api/v1/billing, /api/v1/bridge
=== build check (tsc) for the 4 changed/new files ===
tsc-shop-grep-done

### Assistant | 2026-06-18T15:50:31.139Z

This surfaces a second real audit-logic finding. `servedPrefixes` contains a bare `/api/v1` (from the `app.use("/api/v1", createPartsRouter)`, `createTravelerRouter`, `createPresetsLearningRouter`, and `createSpecialtyRouter` bare-v1 mounts at lines 180/190/192/242). Via the `covered()` `mt.startsWith(pre + "/")` clause, bare `/api/v1` means EVERY SPA `/api/v1/<anything>` prefix is marked covered — even a domain with no actual backend route. Let me confirm this is a real false-negative (gap-masking) risk by testing a fabricated SPA prefix.

### Assistant | 2026-06-18T15:50:34.986Z

[tool_use: Bash]

### User | 2026-06-18T15:50:40.147Z

[tool_result] /api/v1/THIS_DOMAIN_DOES_NOT_EXIST covered? true
   reason: pre.startsWith("/api/v1"+"/") = true
=== which mounts produced the bare /api/v1 servedPrefix? ===
180:  app.use("/api/v1", createPartsRouter(callTool));  // /api/v1/parts/* + /api/v1/files/*
190:  app.use("/api/v1", createTravelerRouter());  // /api/v1/traveler/* + /api/v1/dispatch/*
192:  app.use("/api/v1", createPresetsLearningRouter())
... [+103 chars truncated]

### Assistant | 2026-06-18T15:50:48.508Z

Confirmed — this is a genuine false-negative (gap-masking) risk in the audit. Because the bare `/api/v1` mounts (parts/traveler/presets/specialty) land a bare `/api/v1` entry in `servedPrefixes` at line 86 (`prefixOf("/api/v1")` returns `/api/v1`), the `covered()` `pre.startsWith(mt + "/")` clause then marks EVERY `/api/v1/<domain>` SPA prefix as covered — even a domain with zero backend route. The audit's whole purpose is finding 404 gaps; a bare-v1 mount silently suppresses every v1 gap.

Note this is mitigated in practice: the script's expansion step (lines 89-92) does add the precise sub-paths (`/api/v1/parts`, `/api/v1/traveler`, `/api/v1/dispatch`, `/api/v1/grinding`, etc.), so the bare `/api/v1` is redundant noise rather than the only source of coverage — but it still masks any real future v1 gap. Notably, the 4 reported gaps are all bare `/api/<domain>` (not `/api/v1/<domain>`), so the masking didn't hide them this run; but a v1-domain gap WOULD be hidden. This is a P1 correctness issue in a tool whose entire job is gap detection (R12/R9: a gap detector that can't see a whole class of gaps is unreliable).

Let me verify there isn't a real v1 SPA gap being masked right now, so I can scope the severity accurately.

### Assistant | 2026-06-18T15:50:55.695Z

[tool_use: Bash]

### User | 2026-06-18T15:51:01.262Z

[tool_result] SPA /api/v1/* prefixes: 58
v1 prefixes NOT covered once bare /api/v1 is excluded (i.e. CURRENTLY MASKED gaps): ["/api/v1/ai","/api/v1/doc-learn","/api/v1/knowledge","/api/v1/shop","/api/v1/wedm-erp"]

### Assistant | 2026-06-18T15:51:34.375Z

This is significant. With the bare `/api/v1` masking removed, 5 SPA `/api/v1/*` prefixes have NO matching backend route and are currently being reported as COVERED when they may be 404ing: `/api/v1/ai`, `/api/v1/doc-learn`, `/api/v1/knowledge`, `/api/v1/shop`, `/api/v1/wedm-erp`. The audit tool — whose entire stated purpose is "produce the DEFINITIVE per-domain readiness map" and find frontend-blocking 404 gaps — is hiding 5 candidate gaps. (Some may be false positives from doc/type strings, but the tool's job is to surface them for confirmation; it instead silently buries them.)

I have enough to render the verdict. Let me compile the findings.

## Review Summary

I read all four files end-to-end (shopLive.ts and ShopStateEngine.ts via Bash since the read-once guard fired but the content was not actually in my context), ran the test suite (4/4 pass), ran the audit, and traced the `covered()` logic against live data.

**What is correct (verified):**
- `H:\prism\mcp-server\src\routes\index.ts:42` default import matches `esModuleInterop:true` + `allowSyntheticDefaultImports:true` (verified in tsconfig). `shopLive.ts:180` is `export default router`.
- Mount ordering is correct: `app.use("/api", shopLiveRouter)` at index.ts:251 sits before `errorHandler` at :254, which remains the last `app.use`. The bare `/api` mount of a `/shop/*` router does not collide with `/api/v1/*` mounts; the preceding bare `/api` openapi router (:244) has no catch-all (`/docs`, `/docs/ui`, `/docs/version` only), so it does not shadow `/shop/*`.
- shopLive.ts is safe to mount: only side effect is the `shopStateEngine` singleton import (`ShopStateEngine.ts:328`), whose constructor (`:35-37`) just instantiates an in-memory repo — no disk/timer/network. The `await` at shopLive.ts:147 is inside a handler, not import-time. No `callTool` dependency.
- The audit's bare-`/api` expansion logic works: `/api/shop` is correctly credited in `servedPrefixes`; the `/^\/api\/[a-z]/` guard at line 86 correctly 
... [+3665 chars truncated]
