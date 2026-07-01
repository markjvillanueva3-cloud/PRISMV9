---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Independent financial-correctness review of the just-built SalesOrderEngine (PRI"
date: "2026-05-30"
first_ts: "2026-05-30T01:46:26.491Z"
last_ts: "2026-05-30T01:46:37.217Z"
cwd: "H:\\prism-slot-hotel"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_996d131f-ce8/agent-a9584d09d2150f5c1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# Independent financial-correctness review of the just-built SalesOrderEngine (PRI

> **claude-code-cli** | 2026-05-30 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_996d131f-ce8/agent-a9584d09d2150f5c1.jsonl`

## Transcript

### User | 2026-05-30T01:46:26.491Z

Independent financial-correctness review of the just-built SalesOrderEngine (PRISM ERP, galaxy:business). Read END TO END: H:/prism-slot-hotel/mcp-server/src/engines/SalesOrderEngine.ts + H:/prism-slot-hotel/mcp-server/src/__tests__/SalesOrderEngine.test.ts (+ any H:/prism-slot-hotel/mcp-server/src/data/*.ts it imports). SPEC it must satisfy: QuickBooks "Sales Order" parity (QB-PARITY Phase-2 #2). Producer: an ACCEPTED EstimateEngine estimate → EstimateEngine.toSalesOrder() output → a sales order. Methods: createFromEstimate(soDraft) (soDraft = the toSalesOrder() shape: fromEstimateId, customerId, lines[{description,quantity,unitPrice,extension}], subtotal, discountAmount, tax, total); recordFulfillment(order, {lineIndex|description, qtyShipped}) (tracks per-line ordered/shipped/backordered; status FSM open→partial→fulfilled, + cancel); backorderReport(order) (ordered−shipped per line, ≥0). Invariants: shipped ≤ ordered per line (over-ship THROWS); backorder = ordered−shipped; a fully-shipped order → status 'fulfilled'; cancelling a partially-shipped order is allowed but flags shipped qty. Status FSM via a transitions map (illegal transition throws). Reference tests: 3-line order, partial fulfill one line, over-ship throws, backorder math, fulfilled-when-all-shipped, FSM illegal transition throws, adversarial (negative qty, unknown line).

BUILD REPORT: You've hit your session limit · resets 11:10pm (America/Chicago)

Verify (financial lens): money reconciles both ways (e.g. Σapplied+unapplied==payment; aging buckets sum to closing; GL lines balance Σdr==Σcr); over-apply / over-ship / over-credit THROW; rates/policy IMPORTED not inlined; half-even rounding via roundCentsHalfEven (no sub-cent persist drift); fail-loud on NaN/negative/empty; tests use REAL reference values (not stubs) and would fail if the logic inverted; WIRE-EXEMPT tag present + honest (no false "wired" claim). Construct an input that produces a wrong/unbalanced result. Grade PASS or FAIL with concr
... [+23 chars truncated]

### Assistant | 2026-05-30T01:46:37.217Z

You've hit your session limit · resets 11:10pm (America/Chicago)
