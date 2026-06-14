---
title: QuickBooks connector seed (U-VICTOR-B3)
type: architecture
status: seed
created: 2026-05-27
slot: victor
related:
  - knowledge/wiki/architecture/dispatcher-business.md
  - knowledge/wiki/architecture/dispatcher-erp.md
  - knowledge/wiki/architecture/dispatcher-quoting.md
tags: [accounting, quickbooks, qbo, business, seed]
---

# QuickBooks connector — seed

Operator named **QuickBooks** as a domain (per /goal 2026-05-27). Iter-1 audit found 2 wiki entries and 0 tribal tips referencing QuickBooks — true gap. This page seeds the connector design so future engine work doesn't restart from zero.

## Existing prior art (R8 — flagged by pre-write graph context)

- **`acct-quickbooks-sync`** (L10/built) — QuickBooks sync engine ALREADY exists. This seed is therefore a design supplement, not a greenfield design. Future engine-builder MUST start by reading the existing engine + adapting (do not rebuild from this seed).
- **`business`** (L4/built) — business galaxy is built; check `mcp-server/src/engines/business/CLAUDE.md` for its current dispatcher contract.
- **`academy-course-21-business-management`** (L10/built) — academy curriculum content for business mgmt.

The four-axis breakdown below is still useful as **axis-coverage check** against the existing engine — verify each axis is wired or note where it's stubbed.

## Four sync axes

A QuickBooks Online (QBO) bridge has four bi-directional flows. Each is a separate engine surface; they share a common QBO OAuth + sandbox/production toggle.

### 1. Chart of accounts sync (PRISM → QBO)
- Source: `business-chart-of-accounts.json` (PRISM canonical; pending — needs `BusinessChartOfAccountsEngine`)
- Target: QBO `Account` entity (parent/sub hierarchy)
- Cadence: daily reconcile + on-change-broadcast from PRISM
- Failure mode: account ID mismatch (PRISM uses GAAP-ish 4xxx numbers; QBO has its own IDs — map table required)

### 2. SFC quote → QBO estimate (PRISM → QBO)
- Source: shipped quote from `QuotingPipelineEngine` (charlie, [[reference_quoting_closed_loop_engine_2026_05_26]])
- Target: QBO `Estimate` entity
- Trigger: quote moves from "draft" → "sent-to-customer" status
- Failure mode: customer not yet in QBO (auto-create as Customer, log human-review-needed)

### 3. Job cost → QBO time/expense reconcile (PRISM → QBO + ERP-E2)
- Source: `JobCostEngine` actuals (labor hours + material + freight)
- Target: QBO `TimeActivity` + `Bill` + cross-write to ERP-E2 work order
- Cadence: end-of-shift batch
- Failure mode: time activity overlapping pay period boundary (split or defer)

### 4. Payroll surface (read-only PRISM ← QBO)
- Source: QBO payroll module (employee, pay rate, OT rules)
- Target: PRISM `PayrollEngine` (U-VICTOR-payroll-engine pending) for cost-loaded labor rate
- Cadence: weekly pull
- Failure mode: contractor vs employee classification mismatch (1099 work doesn't load the same)

## Engine inventory — pending

```
QuickBooksConnectorEngine.ts          OAuth + sandbox toggle + retry/backoff
  ↓
QuickBooksAccountSyncEngine.ts        axis 1
QuickBooksEstimateSyncEngine.ts       axis 2 (consumed by QuotingPipelineEngine)
QuickBooksJobCostSyncEngine.ts        axis 3 (consumed by JobCostEngine)
QuickBooksPayrollPullEngine.ts        axis 4 (consumed by PayrollEngine)
```

All must respect Ω≥0.95 / S(x)≥0.98 (business tier — financial data; wrong invoices = real-money loss).

## Authentication

QBO uses OAuth 2.0 with refresh tokens. PRISM credential store: `mcp-server/data/state/qbo-oauth.json` (encrypted, schemaVersion 1.0.0 — engine creates on first run). Refresh token must be rotated every 100 days per QBO TOS.

## Closed-loop wiring (when engines ship)

1. Quote shipped → axis-2 creates QBO Estimate
2. Estimate accepted by customer → push status back into `QuotingPipelineEngine`
3. Job traveler completes → axis-3 logs time + bills
4. End-of-month → axis-1 reconciles chart-of-accounts
5. Pay period → axis-4 pulls payroll for cost-loaded labor in next quote

This closes a multi-week revenue loop that today requires manual QBO data entry at every shop.

## References

- [[reference_quoting_closed_loop_engine_2026_05_26]] — quoting closed-loop (charlie's pattern; QBO is the next sink)
- [[reference_existing_tribal_wiki_pipeline_2026_05_27]] — extend QBO knowledge via tribal pipeline once vendor docs are extracted
- [[feedback_psn_definition]] — QBO sits in PSN leg #2 (PRISM OS), business role
