---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "You are reviewer A (content-specialist) in a PER-FILE SCRUTINY GATE for a PRISM "
date: "2026-05-31"
first_ts: "2026-05-31T08:05:58.102Z"
last_ts: "2026-05-31T08:07:04.275Z"
cwd: "H:\\prism-slot-hotel"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a9a072cb898d22bcd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# You are reviewer A (content-specialist) in a PER-FILE SCRUTINY GATE for a PRISM 

> **claude-code-cli** | 2026-05-31 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a9a072cb898d22bcd.jsonl`

## Transcript

### User | 2026-05-31T08:05:58.102Z

You are reviewer A (content-specialist) in a PER-FILE SCRUTINY GATE for a PRISM ERP change (slot:hotel, galaxy:business). Read END-TO-END and grade PASS/FAIL with P0/P1 findings:

FILE: H:\prism-hotel-integ\mcp-server\src\engines\EstimateEngine.ts  (a LANDED financial engine, just modified)

This is a 2-fix change to a landed engine (QuickBooks-parity customer estimates). The fixes:
- **P2 #2 (silent-collision):** the fallback `estimateId` was `EST-<customerId>-<issueDate>` which silently COLLIDED for two different estimates from the same customer on the same day (a downstream store keyed by estimateId would overwrite). Fix: append a deterministic FNV-1a content hash (`estimateContentHash`) over the distinguishing fields (lines/discount/taxJurisdiction/taxExempt/exemptReason/validDays). An explicit `estimateId` is still used verbatim.
- **P2 #3 (idempotency):** `toSalesOrder` now ALSO returns `convertedEstimate` (the source estimate flipped to "converted" via the FSM), so a second `toSalesOrder` on the converted estimate THROWS (status !== "accepted") — preventing a duplicate sales order from one estimate.

SCRUTINIZE FOR (P0/P1):
- **Hash determinism:** is `estimateContentHash` PURE (no Date.now/Math.random)? `Math.imul(...) >>> 0` — is the FNV-1a 32-bit arithmetic correct + stable across runs? Does `h.toString(36)` always yield a valid id-suffix token?
- **Collision-fix soundness:** do two genuinely-different estimates (different lines/discount/tax) reliably hash differently here? Does an identical input reliably hash identically (idempotency)? Are the hashed fields the RIGHT distinguishing set (note: customerId + issueDate are already in the id prefix, so the hash covers the rest — is anything distinguishing MISSING, e.g. customerName)? customerName is NOT hashed — is that a real collision risk or acceptable (two estimates differing only by customerName for the SAME customerId)?
- **No regression:** does `create`'s reconciliation (Σextension==subtotal; subtotal−d
... [+594 chars truncated]

### Assistant | 2026-05-31T08:06:06.846Z

I'll read the file end-to-end, then focus on the two modified regions and the FSM transition contract.

### Assistant | 2026-05-31T08:06:07.101Z

[tool_use: Read]

### User | 2026-05-31T08:06:10.046Z

[tool_result] 1	/**
2	 * EstimateEngine — customer estimates / quotes for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks-parity: the "Estimate" function set (build a non-binding price proposal, discount it,
5	 * compute tax, send → accept/reject/expire, convert an accepted estimate to a sales order).
6	 * QB-PARITY-MS0 Phase-2 engine #1 (A/R revenue cycle, the first step of the QB sales workf
... [+11352 chars truncated]

### Assistant | 2026-05-31T08:06:13.111Z

Now let me verify the FSM policy to confirm `accepted → converted` is a legal edge.

### Assistant | 2026-05-31T08:06:14.038Z

[tool_use: Read]

### User | 2026-05-31T08:06:16.806Z

[tool_result] 1	/**
2	 * estimate-policy.ts — estimate/quote policy for the PRISM ERP (galaxy:business).
3	 *
4	 * Imported by EstimateEngine — the default validity window and the status state-machine are SHOP
5	 * POLICY, not engine logic; per business/CLAUDE.md §8.7 (anti-pattern: inlining customer/shop terms)
6	 * they live here so a policy change is one edit, not a code hunt. A shop with a 14-day quote vali
... [+1817 chars truncated]

### Assistant | 2026-05-31T08:06:19.334Z

Both files read end-to-end. Let me verify the FNV-1a hash arithmetic and base36 token claims empirically to be rigorous, and confirm `roundCentsHalfEven` / `calcSalesTax` signatures match what's called.

### Assistant | 2026-05-31T08:06:26.987Z

[tool_use: Bash]

### User | 2026-05-31T08:06:34.144Z

[tool_result] same1 1q5zoi6 same2 1q5zoi6 true
diffLines true 1q5zoi6 1uap785
diffDisc true
badTokens 0 emptyTokens 0
zero 0 maxu32 1z141z3
imulRaw 1292581751 unsigned 1292581751

### Assistant | 2026-05-31T08:06:37.148Z

Empirical verification confirms the hash claims. Let me confirm the consumed signatures (`roundCentsHalfEven`, `calcSalesTax`) match the call sites so I can fully clear the no-regression axis.

### Assistant | 2026-05-31T08:06:38.830Z

[tool_use: Grep]

### User | 2026-05-31T08:06:41.662Z

[tool_result] 9: * `ShippingReceivingLogEngine` outbound → ship-to jurisdiction → calcSalesTax → the tax rides the
14: *  - unknown jurisdiction THROWS (a silent 0% is under-collection = real liability).
32:export function roundCentsHalfEven(value: number): number {
47:  jurisdiction: z.string().min(1),
48:  exempt: z.boolean().optional().default(false),
49:  exemptReason: z.string().optional(),
56:  jurisdicti
... [+1374 chars truncated]

### Assistant | 2026-05-31T08:07:04.275Z

All call-site contracts verified against the consumed engine.

## Review — EstimateEngine.ts (reviewer A, content-specialist)

**Hash determinism (PASS).** `estimateContentHash` is PURE — no `Date.now`/`Math.random`, only `JSON.stringify` + integer ops over the input fields (lines 110-123). The FNV-1a 32-bit arithmetic is correct: `h ^= charCodeAt`, then `Math.imul(h, 0x01000193) >>> 0` (line 121). `Math.imul` is the canonical way to do 32-bit-wrapping multiply in JS, and `>>> 0` coerces back to unsigned after each step. Empirically confirmed: identical input → identical hash; `Math.imul` raw result coerced cleanly to unsigned u32. `h.toString(36)` always yields a valid token over `[0-9a-z]` — verified across 200k samples, zero bad/empty tokens (`h=0` → `"0"`, never empty since the offset basis is non-zero and the radix is constant). The seed `0x811c9dc5` is the correct FNV offset basis. Stable across runs (no Map/Set ordering, no locale).

**Collision-fix soundness (PASS).** The canonical tuple (lines 110-117) covers exactly the fields NOT already in the id prefix: `lines[]` (description/qty/unitPrice/taxable), discount (type+value), taxJurisdiction, taxExempt, exemptReason, validDays. `customerId` + `issueDate` are in the prefix, so the hash correctly covers "the rest." Different lines/discount/tax → different hash (verified); identical input → identical hash (idempotent, verified). **`customerName` is NOT hashed — this is ACCEPTABLE, not a P0/P1.** Two estimates that differ only by `customerName` for the *same* `customerId` are, for a downstream store keyed by `estimateId`, the same economic object (same customer, same lines, same price) — `customerName` is a display/denormalized label, not a distinguishing economic field (note `Estimate.customerName` is nullable and purely informational; nothing downstream keys on it). Folding it into the disambiguator would actually be wrong: re-creating the identical estimate with a corrected name string would mint a *new* id 
... [+1833 chars truncated]
