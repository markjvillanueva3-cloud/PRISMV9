---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "Synthesize a PRIORITIZED next-unit decision for charlie/quoting toward JM Die be"
date: "2026-06-10"
first_ts: "2026-06-10T03:28:44.517Z"
last_ts: "2026-06-10T03:29:21.733Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/workflows/wf_a0dd99c5-75a/agent-a84aadbfb9a0d8029.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Synthesize a PRIORITIZED next-unit decision for charlie/quoting toward JM Die be

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/workflows/wf_a0dd99c5-75a/agent-a84aadbfb9a0d8029.jsonl`

## Transcript

### User | 2026-06-10T03:28:44.517Z

Synthesize a PRIORITIZED next-unit decision for charlie/quoting toward JM Die beta (next week). Three scopers returned findings. Be CONCISE (the orchestrator is at 54% context budget -- do not dump; give the decision + ONE build spec).

[ACCOUNTING-WIRE STATE]
Confirmed. Both ERP connectors import operational fields (qty, run-hours, status, material) but carry **zero monetary/invoice/sold-price fields** — they cannot feed `actual_invoice_usd`. I have everything needed. Here is the report.

---

# U-QP-ACCOUNTING-WIRE — Investigation Report

## 1. AccountingHardeningEngine — EXISTS, wired, but does NOT touch outbound revenue

`mcp-server/src/engines/AccountingHardeningEngine.ts:219` (singleton `accountingHardeningEngine:778`). Six pure-calc methods: `bankReconciliation`, `wipValuation`, `varianceAnalysis`, `costToComplete` (EAC/ETC), `multiPeriodCompare`, `quickbooksSync`. Wired to `prism_business` at `businessDispatcher.ts:4486-4511, 4657-4662` (8 call sites).

Critically, its `quickbooksSync` (`:698`) is a **mapping-only stub** — `entries_synced: 0` with the comment `// Actual sync would happen via QB API` (`:764`). It maps GL accounts to QB account types; it does NOT pull invoice records. It is **irrelevant to the closed loop** — it never produces `actual_invoice_usd`.

## 2. How `actual_invoice_usd` reaches the loop — DI injection point, fed by nothing real

The field is defined on `QuoteOutcomeRecord` at `QuotingClosedLoopEngine.ts:68` (`actual_invoice_usd?: number | null; // null until the outcome lands`). The loop's realness gate (`:337-351`) requires ≥`minRealOutcomes` records with finite positive actuals, else verdict `empty`.

The ONLY path that populates it is **dependency injection** via `ClosedLoopDeps.fetchOutcomes` (`:161`), supplied by `buildLiveDeps(opts.loadOutcomes)` in `QuotingClosedLoopRunnerEngine.ts:238/92`. `loadOutcomes` is a caller-provided closure — the runner itself reads nothing. When an actual is absent, `toBaselineRecord` (`:138`) falls
... [+17692 chars truncated]

### Assistant | 2026-06-10T03:29:21.733Z

# DECISION: U-QP-SEND-QUOTE-WIRE (GAP 1+2)

Wire the orphaned `generateQuotePdf` + `quote_explain_render` to a "Download/Send Quote" button on `QuoteBuilderPage`. **[charlie-code-buildable-now]** — highest ROI toward a JM Die beta because it converts the working physics-pricing backend into a thing an estimator can actually hand a customer. Beta = "operator produces a sendable quote." Everything else is invisible to the buyer.

## 1. RANKED TOP 3

**#1 — U-QP-SEND-QUOTE-WIRE** `[charlie-code-buildable-now]` — **no dependency.**
The deliverable IS the beta. Both pieces already exist (`web/src/utils/quotePdf.ts:21` orphaned, zero callers; `QuoteExplainPDFEngine.renderExplain()` wired at `businessDispatcher.ts:1533` but zero frontend consumers). Pure last-mile wiring + one adapter. The pricing brain is already HTTP-wired and returns real breakdowns (`QuoteBuilderPage.tsx:1316` handleGenerate → `quoting_generate`). Nothing else gets a customer a quote.

**#2 — U-QP-CORPUS-ACTIVATE** `[charlie-code-buildable-now]` — depends on nothing, but lower beta-ROI.
Refresh the stale 2026-05-28 `active-calibration.json` from the live 47,905-record corpus with `--write` (proven `safe_to_activate:true`), gate on the `synthetic_revenue_dominant` advisory. Improves the *numbers* the quote shows, but a calibrated price nobody can send is still un-shippable. Do it AFTER #1 so the quote the operator sends carries the freshest factors. Honors charlie soul: freshness preflight before activate, no stale-bootstrap (the 100-record poisoned stub is correctly refused).

**#3 — U-QP-ACCOUNTING-WIRE (ingestion-contract form ONLY)** `[charlie-code-buildable-now, but data-blocked for real value]`.
Build the `loadOutcomes`/`quote-outcomes.jsonl` plumbing (`QuotingClosedLoopEngine.ts:161` DI point) so real revenue flows the moment a source lands. The *code* is buildable; the *value* is blocked on external ERP/QB or xray re-OCR (`jm-sold-orders.json` is 42% $1-OCR-noise, `OutboundPriceIndexEngine.ts:32
... [+3689 chars truncated]
