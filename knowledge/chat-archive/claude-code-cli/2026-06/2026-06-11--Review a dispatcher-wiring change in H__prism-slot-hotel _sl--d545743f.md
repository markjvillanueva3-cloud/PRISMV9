---
type: "chat-session"
source: "claude-code-cli"
session_id: "d545743f-8fad-47d7-a7de-1716a4be5839"
title: "Review a dispatcher-wiring change in H:/prism-slot-hotel (slot/hotel), unit U-HO"
date: "2026-06-11"
first_ts: "2026-06-11T19:46:20.281Z"
last_ts: "2026-06-11T19:47:14.127Z"
cwd: "H:\\prism-slot-hotel\\mcp-server"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/agent-a832e32372f515e63.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Review a dispatcher-wiring change in H:/prism-slot-hotel (slot/hotel), unit U-HO

> **claude-code-cli** | 2026-06-11 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism-slot-hotel\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/agent-a832e32372f515e63.jsonl`

## Transcript

### User | 2026-06-11T19:46:20.281Z

Review a dispatcher-wiring change in H:/prism-slot-hotel (slot/hotel), unit U-HOTEL-BUYER-DIR-WIRE. It wires BuyerAccountEngine's built-but-unwired read/lifecycle methods into businessDispatcher as 7 new actions (the symmetric twin of the already-merged supplier-directory wiring). Only `registerBuyer` was wired before (`buyer_register`).

Read END-TO-END:
1. H:/prism-slot-hotel/mcp-server/src/tools/dispatchers/businessDispatcher.ts — the 7 new z.enum entries (search "buyer_directory_list" in the action enum, ~line 1632) AND the 7 new switch cases (search `case "buyer_directory_list"`, ~line 2222). Compare to the existing `case "buyer_register"` just above.
2. H:/prism-slot-hotel/mcp-server/src/engines/BuyerAccountEngine.ts — verify the method signatures the dispatcher calls: getBuyer(buyerId), listBuyers(filter), updateBuyer(buyerId, patch) [UpdateBuyerSchema is .strict()], setCreditStatus(buyerId, status), deactivateBuyer(buyerId), reactivateBuyer(buyerId), canPostRFQ(buyerId).

VERIFY (flag P0/P1):
- Every new enum action string has a matching `case` and vice-versa (no enum/case mismatch, typo, or duplicate). The 7 new actions: buyer_directory_list, buyer_profile_get, buyer_profile_update, buyer_credit_status_set, buyer_deactivate, buyer_reactivate, buyer_can_post_rfq.
- Param normalization is correct per signature. buyer_profile_update strips buyerId/buyer_id/id/action from a flat patch before updateBuyer (UpdateBuyerSchema is .strict()). buyer_credit_status_set passes (buyerId, status ?? creditStatus). buyer_can_post_rfq wraps the boolean in {buyerId, canPostRFQ}.
- All cases call getEngine("buyerAccount") which resolves to buyerAccountEngine.
- **PII (CRITICAL P0 if violated):** confirm NO new case wires `getBuyerInternal` (the ONE unmasked method that exposes raw contact email/phone). Every wired method must return the MASKED BuyerAccount. If any case calls getBuyerInternal, that's a P0 PII leak.
- No action-count regression (only additions).

Note: businessDi
... [+191 chars truncated]

### Assistant | 2026-06-11T19:46:26.995Z

I'll read both files end-to-end to verify the wiring. Let me start with the dispatcher and engine in parallel.

### Assistant | 2026-06-11T19:46:28.538Z

[tool_use: Grep]

### Assistant | 2026-06-11T19:46:29.305Z

[tool_use: Grep]

### User | 2026-06-11T19:46:30.603Z

[tool_result] 1638-  "rfq_match_score",
1639-  "quote_explain_render",
1640:  "buyer_register",
1641-  // HOTEL: NETPLAT Phase-0 -- buyer-account read + lifecycle surface (symmetric twin of the
1642-  // supplier-directory wiring). All return the MASKED BuyerAccount; getBuyerInternal stays unwired (PII). (2026-06-11)
1643:  "buyer_directory_list",
1644:  "buyer_profile_get",
1645:  "buyer_profile_update",
1646:
... [+2339 chars truncated]

### User | 2026-06-11T19:46:31.049Z

[tool_result] 3- * marketplace (galaxy:business, slot:hotel). The buyer-side counterpart of
4- * {@link SupplierCapabilityProfileEngine}: where the supplier side registers a SHOP's capability
5- * profile, this side registers a BUYER's marketplace identity. Buyers register, get verified, and
6: * own RFQs (RFQBroadcast gates on {@link BuyerAccountEngine.canPostRFQ}).
7- *
8- * DEDUP / boundary (R8) — distinct f
... [+8833 chars truncated]

### Assistant | 2026-06-11T19:46:37.327Z

Now let me read the exact dispatcher case bodies to verify param normalization and the `getBuyerInternal` check:

### Assistant | 2026-06-11T19:46:38.367Z

[tool_use: Read]

### User | 2026-06-11T19:46:39.571Z

[tool_result] 2230	          }
2231	          // HOTEL: NETPLAT Phase-0 -- buyer-account read + lifecycle surface (2026-06-11, U-HOTEL-BUYER-DIR-WIRE).
2232	          // Symmetric twin of the supplier-directory wiring. ALL return the MASKED BuyerAccount (email
2233	          // a***@domain, phone ***NNNN); getBuyerInternal (unmasked) is NEVER wired (hotel soul: PII redaction).
2234	          case "buyer_directo
... [+3071 chars truncated]

### Assistant | 2026-06-11T19:46:45.507Z

Now let me verify there are no accidental `getBuyerInternal` references in the dispatcher, and also confirm the enum count is addition-only:

### Assistant | 2026-06-11T19:46:46.311Z

[tool_use: Grep]

### Assistant | 2026-06-11T19:46:47.191Z

[tool_use: Grep]

### User | 2026-06-11T19:46:48.032Z

[tool_result] 1642:  // supplier-directory wiring). All return the MASKED BuyerAccount; getBuyerInternal stays unwired (PII). (2026-06-11)
2233:          // a***@domain, phone ***NNNN); getBuyerInternal (unmasked) is NEVER wired (hotel soul: PII redaction).

### User | 2026-06-11T19:46:48.721Z

[tool_result] 2226-          case "buyer_register": {
2227:            const engine = await getEngine("buyerAccount");
2228-            result = engine.registerBuyer(params);
--
2234-          case "buyer_directory_list": {
2235:            const engine = await getEngine("buyerAccount");
2236-            // active-only by default; filter narrows by region/creditStatus (includeInactive to show paused).
--
2240- 
... [+1272 chars truncated]

### Assistant | 2026-06-11T19:47:14.127Z

All data collected. Here is the complete wiring review.

---

## Dispatcher Wiring Review: U-HOTEL-BUYER-DIR-WIRE

**Engine:** `BuyerAccountEngine`
**File:** `H:/prism-slot-hotel/mcp-server/src/engines/BuyerAccountEngine.ts`
**Dispatcher:** `businessDispatcher`
**File:** `H:/prism-slot-hotel/mcp-server/src/tools/dispatchers/businessDispatcher.ts`

---

### z.enum Entries (lines 1640-1649)

All 7 new action strings are present in the enum, listed consecutively after the pre-existing `buyer_register` entry:

- `buyer_directory_list` (line 1643)
- `buyer_profile_get` (line 1644)
- `buyer_profile_update` (line 1645)
- `buyer_credit_status_set` (line 1646)
- `buyer_deactivate` (line 1647)
- `buyer_reactivate` (line 1648)
- `buyer_can_post_rfq` (line 1649)

No duplicates. No typos. All 7 confirmed present. `buyer_register` at line 1640 is unchanged.

---

### Case Statements (lines 2234-2282)

All 7 new cases are present, each with `await getEngine("buyerAccount")` and a `break`. The exact engine calls per case:

| Case | Engine method called | Matches signature? |
|---|---|---|
| `buyer_directory_list` | `engine.listBuyers(params.filter ?? {})` | `listBuyers(filter: BuyerListFilter = {})` — correct, safe default |
| `buyer_profile_get` | `engine.getBuyer(params.buyerId)` | `getBuyer(buyerId: string)` — correct |
| `buyer_profile_update` | `engine.updateBuyer(params.buyerId, patch)` | `updateBuyer(buyerId: string, patch: UpdateBuyerInput)` — correct, with stripping |
| `buyer_credit_status_set` | `engine.setCreditStatus(params.buyerId, params.status ?? params.creditStatus)` | `setCreditStatus(buyerId: string, status: CreditStatus)` — correct, aliased |
| `buyer_deactivate` | `engine.deactivateBuyer(params.buyerId)` | `deactivateBuyer(buyerId: string)` — correct |
| `buyer_reactivate` | `engine.reactivateBuyer(params.buyerId)` | `reactivateBuyer(buyerId: string)` — correct |
| `buyer_can_post_rfq` | `{ buyerId: params.buyerId, canPostRFQ: engine.canPostRFQ(params.buyerId) 
... [+1876 chars truncated]
