---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Independent financial-correctness review of the just-built FinanceChargeDunningE"
date: "2026-05-30"
first_ts: "2026-05-30T01:45:57.309Z"
last_ts: "2026-05-30T01:46:06.090Z"
cwd: "H:\\prism-slot-hotel"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_996d131f-ce8/agent-afc1ae4bf19b843e6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# Independent financial-correctness review of the just-built FinanceChargeDunningE

> **claude-code-cli** | 2026-05-30 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_996d131f-ce8/agent-afc1ae4bf19b843e6.jsonl`

## Transcript

### User | 2026-05-30T01:45:57.309Z

Independent financial-correctness review of the just-built FinanceChargeDunningEngine (PRISM ERP, galaxy:business). Read END TO END: H:/prism-slot-hotel/mcp-server/src/engines/FinanceChargeDunningEngine.ts + H:/prism-slot-hotel/mcp-server/src/__tests__/FinanceChargeDunningEngine.test.ts (+ any H:/prism-slot-hotel/mcp-server/src/data/*.ts it imports). SPEC it must satisfy: QuickBooks "Finance Charge" + dunning parity (QB-PARITY Phase-2 #6). NEEDS a constants file H:/prism-slot-hotel/mcp-server/src/data/ar-finance-charge-policy.ts (SHOP POLICY, imported never inlined): monthlyRatePct (e.g. 1.5%/mo = 0.015), minCharge (e.g. 5.00), graceDays (e.g. 10), annualRateCapPct (usury guard), and DUNNING_TIERS [{minDaysOverdue, level:'reminder'|'past_due'|'final_notice'|'collections', template}]. Methods: computeFinanceCharge({invoiceId, overdueBalance, daysOverdue}) → {charge, applied:boolean, reason} (0 if within grace; else round2(overdueBalance × monthlyRate × months), floored at minCharge if charge>0; cap at usury); dunningLevel(daysOverdue) → the tier; generateDunning({customerId, overdueInvoices[]}) → tiered notices. Invariants: charge=0 within graceDays; rate IMPORTED; half-even; THROW on negative/NaN balance. Reference tests: charge after grace (1.5% of 1000 for 1mo = 15.00), within-grace → 0, min-charge floor (tiny balance → minCharge), dunning tier boundaries (10/30/60/90 days → correct level), usury cap, multi-invoice dunning, adversarial (NaN balance throws, negative days).

BUILD REPORT: You've hit your session limit · resets 11:10pm (America/Chicago)

Verify (financial lens): money reconciles both ways (e.g. Σapplied+unapplied==payment; aging buckets sum to closing; GL lines balance Σdr==Σcr); over-apply / over-ship / over-credit THROW; rates/policy IMPORTED not inlined; half-even rounding via roundCentsHalfEven (no sub-cent persist drift); fail-loud on NaN/negative/empty; tests use REAL reference values (not stubs) and would fail if the logic inverted; WIRE-EXEMP
... [+161 chars truncated]

### Assistant | 2026-05-30T01:46:06.090Z

You've hit your session limit · resets 11:10pm (America/Chicago)
