---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b4b9149-3502-4570-8dd8-b4bc90fad6ab"
title: "You are the launch-readiness grader for the PRISM Speed & Feed Calculator. Using"
date: "2026-06-08"
first_ts: "2026-06-08T15:26:43.144Z"
last_ts: "2026-06-08T15:27:43.064Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/workflows/wf_7e2ef90c-869/agent-a0e7f8dd811ad932e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# You are the launch-readiness grader for the PRISM Speed & Feed Calculator. Using

> **claude-code-cli** | 2026-06-08 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/workflows/wf_7e2ef90c-869/agent-a0e7f8dd811ad932e.jsonl`

## Transcript

### User | 2026-06-08T15:26:43.144Z

You are the launch-readiness grader for the PRISM Speed & Feed Calculator. Using the adversarial verifier's verdict below, plus what you can confirm in H:/prism (read state/shared/specs/SFC-ENTITLEMENT-GATE-SPEC-2026-06-06.md and mcp-server/src/routes/sfc.ts), produce a crisp launch-readiness scorecard:

1. A table of launch blockers ranked P0/P1/P2 with: blocker, current state, what's needed, effort estimate (hours/days), and whether it's an OPERATOR decision (e.g. auth-provider pick) vs an ENGINEERING task.
2. A one-line "distance to first paying customer" verdict.
3. The 3 highest-leverage things to do next, in dependency order.

Be concrete and honest — this feeds a VC report, so no hand-waving. ~600 words.

VERIFIER VERDICT:
All disputed claims adjudicated against source. The analysts' reports are unusually honest — my spot-reads confirm every contested point. Final verdict.

---

# PRISM Speed & Feed — VC Technical Diligence Verdict

The four junior reports are, refreshingly, mostly correct and self-skeptical. My spot-reads confirmed every high-stakes claim: the SFC endpoint is open, billing defaults to mock, `PRISM_SFC_CALIB_APPLY` returns zero grep hits, the aggregator/exporter engines do not exist on disk, the adapter's `tryCanonicalEngine` is a hard `return null`, and the physics formula bodies are real. I am adjudicating *against* the reports' own optimism where they reach.

## PHYSICS
**CONFIRMED:** This is the real asset. `kienzleForce` (constants.ts:787), `taylorLife` (:792), Merchant/Lee-Shaffer shear, Johnson-Cook three-bracket flow stress with a 14-material table, and ~20-25 mechanistic models are genuinely implemented closed forms delegated to standalone modules, with literature citations and no inlined constants. Full ISO P/M/K/N/S/H coverage plus a 50+ entry Sandvik subgroup table. This is materially deeper than G-Wizard's empirical-table core.
**OVERSTATED:** "SLD / chatter stability" is half-built — `tryCanonicalEngine` always returns null (con
... [+4649 chars truncated]

### Assistant | 2026-06-08T15:26:53.771Z

I'll verify the key claims against source before grading. Let me read the two named files plus spot-check the load-bearing assertions.

### Assistant | 2026-06-08T15:26:53.772Z

[tool_use: Read]

### Assistant | 2026-06-08T15:26:53.958Z

[tool_use: Read]

### User | 2026-06-08T15:26:56.206Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\sfc.ts' was already read 9m ago in this session and is unchanged (mtime 1777032347157). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T15:26:59.152Z

[tool_result] 1	# SFC Entitlement & Billing Gate — Implementation Spec
2	
3	> **Status:** DRAFT spec (oscar overnight build-loop, 2026-06-06, Unit 3). Design-only — no code shipped in this unit. This is the **#1 revenue blocker**: today the Speed & Feed Calculator is fully usable for free by anyone who can reach `/api/v1/sfc`. You cannot sell a subscription to a product that nothing checks a subscription for.
4
... [+8254 chars truncated]

### Assistant | 2026-06-08T15:27:07.019Z

The cache says I read sfc.ts already this session, so I have its content. Let me confirm the load-bearing facts directly rather than trust the summary — grep the two critical claims (no verifyToken on SFC routes, testMode default in billing).

### Assistant | 2026-06-08T15:27:07.266Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:27:07.611Z

[tool_use: Grep]

### User | 2026-06-08T15:27:13.590Z

[tool_result] 6:import { requireFields } from "../middleware/validation.js";
17:  router.post("/calculate", requireFields("material", "operation"), async (req, res, next) => {

### User | 2026-06-08T15:27:14.443Z

[tool_result] 8: *   POST /api/v1/billing/webhook           — Stripe webhook (no auth, raw body)
20:  testMode: process.env["STRIPE_TEST_MODE"] !== "false",
82:  // POST /webhook — Stripe webhook (NO auth middleware, raw body required)
85:    "/webhook",
89:        //   const sig = req.headers["stripe-signature"];
90:        //   const event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
93:  
... [+150 chars truncated]

### Assistant | 2026-06-08T15:27:43.064Z

Source confirmed on all three showstoppers: SFC `/calculate` carries only `requireFields` (no auth/paywall), `testMode` defaults true unless `STRIPE_TEST_MODE === "false"`, and the webhook signature verification is commented out (billing.ts:89-90). The verifier's verdict holds. Scorecard:

---

# PRISM Speed & Feed — Launch-Readiness Scorecard

## 1. Launch Blockers (ranked)

| # | Pri | Blocker | Current state | What's needed | Effort | Owner |
|---|-----|---------|---------------|---------------|--------|-------|
| 1 | **P0** | SFC API fully unauthenticated | `sfc.ts:17` — `requireFields` only; no `verifyToken` on any of 7 routes | Build `verifyToken` + `resolveEntitlement` + `enforceEntitlement` middlewares, mount in front of `createSfcRouter` | 3–5 days (post auth pick) | ENG |
| 2 | **P0** | Auth provider not chosen | Spec is provider-agnostic; no provider integrated | Pick Clerk / Supabase / Auth0; wire hosted UI + JWT issuance | 0.5 day decision + 2–3 days integ | **OPERATOR** decides, ENG builds |
| 3 | **P0** | Billing in mock mode | `billing.ts:20` `testMode: STRIPE_TEST_MODE !== "false"` → fake checkout URLs | Set `STRIPE_SECRET_KEY`, flip flag, create 4 Products × prices | 1–2 days | ENG (operator provides Stripe acct) |
| 4 | **P0** | Webhook signature unverified | `billing.ts:89-90` — `constructEvent` is commented out; anyone can forge an "Enterprise" entitlement | Implement `stripe.webhooks.constructEvent(rawBody, sig, secret)`, raw-body parsing | 0.5 day | ENG |
| 5 | **P1** | No pricing/checkout/portal UI | Tiers defined ($0/29/79/199/499); ZERO billing UI consumers | Pricing page + Checkout redirect + Customer Portal | 3–4 days | ENG |
| 6 | **P1** | E2E tests non-asserting | `toBeGreaterThanOrEqual(0)` — cannot prove the calc works | Real reference-value assertions through dispatcher | 1–2 days | ENG |
| 7 | **P1** | "Self-improving closed loop" is a dangling wire | Data captured (85 MB live ledger, real) but never fed back; calib factors stay 1.0
... [+2363 chars truncated]
