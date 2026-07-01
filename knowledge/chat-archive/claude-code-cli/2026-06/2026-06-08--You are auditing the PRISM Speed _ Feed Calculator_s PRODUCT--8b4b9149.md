---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b4b9149-3502-4570-8dd8-b4bc90fad6ab"
title: "You are auditing the PRISM Speed & Feed Calculator's PRODUCT/SAAS surface + LAUN"
date: "2026-06-08"
first_ts: "2026-06-08T15:17:56.073Z"
last_ts: "2026-06-08T15:18:58.506Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 7
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/workflows/wf_7e2ef90c-869/agent-afd6f365d80b9046d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# You are auditing the PRISM Speed & Feed Calculator's PRODUCT/SAAS surface + LAUN

> **claude-code-cli** | 2026-06-08 | 15 msgs (7 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/workflows/wf_7e2ef90c-869/agent-afd6f365d80b9046d.jsonl`

## Transcript

### User | 2026-06-08T15:17:56.073Z

You are auditing the PRISM Speed & Feed Calculator's PRODUCT/SAAS surface + LAUNCH READINESS for a VC report. Read these files in H:/prism and report ONLY verified facts (cite file:line):
- mcp-server/src/routes/sfc.ts (the SFC API route — check for auth/paywall)
- mcp-server/src/routes/billing.ts (Stripe routes — check webhook verification)
- mcp-server/src/engines/StripeBillingEngine.ts (check testMode flag + tier definitions, ~line 47-53)
- mcp-server/web/src/api/sfc.ts + mcp-server/web/e2e/sfc-calculator.spec.ts
- state/shared/specs/SFC-ENTITLEMENT-GATE-SPEC-2026-06-06.md
Report: (1) is there a working web frontend for SFC? what stack; (2) the EXACT launch blockers — what stands between "code exists" and "first paying customer"; (3) tier/pricing model as defined; (4) is billing real or testMode; (5) is the SFC endpoint currently free-for-anyone (no paywall)? Rank the blockers by severity. ~600 words max.

### Assistant | 2026-06-08T15:18:12.488Z

I'll read all the specified files to audit the SFC product surface and launch readiness.

### Assistant | 2026-06-08T15:18:13.039Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:13.698Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:14.230Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:14.285Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:14.784Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:16.834Z

[tool_use: Read]

### User | 2026-06-08T15:18:20.044Z

[tool_result] 1	/**
2	 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
3	 * Consolidates existing SFC endpoints from index.ts into a proper router
4	 */
5	import { Router } from "express";
6	import { requireFields } from "../middleware/validation.js";
7	import type { CallToolFn } from "./index.js";
8	
9	/** Creates sfc router.
10	 * @param callTool - call tool
11	 * @returns router
12	 */
13	export fu
... [+2250 chars truncated]

### User | 2026-06-08T15:18:22.393Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Billing Routes
3	 * Stripe subscription management and post-processor purchases.
4	 *
5	 * Endpoints:
6	 *   POST /api/v1/billing/create-checkout   — create subscription checkout
7	 *   POST /api/v1/billing/portal            — customer billing portal
8	 *   POST /api/v1/billing/webhook           — Stripe webhook (no auth, raw body)
9	 *   GET  /api/v1/billing/status  
... [+6223 chars truncated]

### User | 2026-06-08T15:18:22.793Z

[tool_result] 1	/**
2	 * PRISM MCP Server — StripeBillingEngine
3	 * Stripe subscription + post-processor purchase billing.
4	 *
5	 * Spec (MIT 6.005 contract):
6	 *   - testMode: true  → all methods return mock data, zero Stripe API calls
7	 *   - testMode: false → uses Stripe SDK with STRIPE_SECRET_KEY env var
8	 *   - calculatePostProcessorPrice is pure — no I/O
9	 *   - All pricing in cents (USD × 100)
10	 
... [+15314 chars truncated]

### User | 2026-06-08T15:18:22.866Z

[tool_result] 1	import { getRequestHeaders } from "./client";
2	import type {
3	  SfcCalculateRequest, SfcCalculateResult,
4	  CycleTimeRequest, CycleTimeResult,
5	  EngagementRequest, EngagementResult,
6	  DeflectionRequest, DeflectionResult,
7	  PowerTorqueRequest, PowerTorqueResult,
8	  SurfaceFinishRequest, SurfaceFinishResult,
9	  ToolLifeRequest, ToolLifeResult,
10	} from "../types/sfc";
11	
12	const SFC_
... [+1832 chars truncated]

### User | 2026-06-08T15:18:23.622Z

[tool_result] 1	/**
2	 * E2E Tests — Speed Feed Calculator (SFC)
3	 * S4-MS1 P0-U01: E2E Test Suite — Playwright
4	 *
5	 * Tests the main user flows for the PRISM Speed & Feed Calculator:
6	 * - Page load and initial state
7	 * - Material selection workflow
8	 * - Machine selection workflow
9	 * - Tool selection workflow
10	 * - Solve workflows (quick/full)
11	 * - Results display and validation
12	 * - Mode sw
... [+11475 chars truncated]

### User | 2026-06-08T15:18:24.531Z

[tool_result] 1	# SFC Entitlement & Billing Gate — Implementation Spec
2	
3	> **Status:** DRAFT spec (oscar overnight build-loop, 2026-06-06, Unit 3). Design-only — no code shipped in this unit. This is the **#1 revenue blocker**: today the Speed & Feed Calculator is fully usable for free by anyone who can reach `/api/v1/sfc`. You cannot sell a subscription to a product that nothing checks a subscription for.
4
... [+8254 chars truncated]

### Assistant | 2026-06-08T15:18:58.506Z

All six files are read. I have the verified facts I need; no further tooling required for this read-only audit.

# PRISM SFC — Product/Launch-Readiness Audit (verified facts only)

## (1) Working web frontend?
**Yes, code exists — runtime status unverified.** Stack: React + Vite (`web/CLAUDE.md` "React/Vite frontend"). Typed API client at `web/src/api/sfc.ts:34-55` (7 methods: calculate, cycleTime, engagement, deflection, powerTorque, surfaceFinish, toolLife) POSTing to `/api/v1/sfc` (`sfc.ts:12`). A `CalculatorPage.tsx` (12,909 LOC) is the "main speed/feed calculator" per `web/CLAUDE.md`. Playwright E2E suite exists (`web/e2e/sfc-calculator.spec.ts`) hitting `/calculator`, but the tests are **non-asserting** — nearly every interaction is guarded by `if (await x.isVisible())` and several assertions are tautological (`expect(count).toBeGreaterThanOrEqual(0)` at `spec.ts:221`; `expect(headingCount).toBeGreaterThan(0)` at `:283`). These tests cannot fail on a broken calculator, so they do **not** prove the frontend works end-to-end.

## (2) Exact launch blockers ("code exists" → first paying customer)
Ranked by severity:

- **[P0 — CRITICAL] SFC endpoint is fully unauthenticated, no paywall.** `routes/sfc.ts:17` mounts `/calculate` with only `requireFields("material","operation")` — **no `verifyToken`, no plan check, no rate gate.** All 7 SFC routes are open. Confirmed by spec §1: "the Speed & Feed Calculator is fully usable for free by anyone who can reach `/api/v1/sfc`." You cannot sell a subscription to a product nothing checks a subscription for.
- **[P0 — CRITICAL] Webhook signature verification is not implemented.** `routes/billing.ts:88-92`: the Stripe-signature check is a commented-out TODO; `const event = req.body` is passed straight to the handler. Per spec §5: "an unverified webhook = anyone can forge a 'you're now Enterprise' event." Even the live-mode engine stub `StripeBillingEngine.ts:123-126` `constructEvent` just `JSON.parse`s the payload with **no sig
... [+2449 chars truncated]
