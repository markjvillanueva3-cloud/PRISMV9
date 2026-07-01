---
type: "chat-session"
source: "claude-code-cli"
session_id: "486f4cc9-b98a-4453-823a-d1edd5a1a2c8"
title: "Review the dispatcher wiring for U-HOTEL-ITEM-MASTER-WIRE in the slot/hotel work"
date: "2026-06-12"
first_ts: "2026-06-12T13:08:45.967Z"
last_ts: "2026-06-12T13:10:04.741Z"
cwd: "H:\\prism-slot-hotel"
messages: 30
user_msgs: 13
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-hotel/486f4cc9-b98a-4453-823a-d1edd5a1a2c8/subagents/agent-ae2ac67eedf612c4b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Review the dispatcher wiring for U-HOTEL-ITEM-MASTER-WIRE in the slot/hotel work

> **claude-code-cli** | 2026-06-12 | 30 msgs (13 user / 17 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/486f4cc9-b98a-4453-823a-d1edd5a1a2c8/subagents/agent-ae2ac67eedf612c4b.jsonl`

## Transcript

### User | 2026-06-12T13:08:45.967Z

Review the dispatcher wiring for U-HOTEL-ITEM-MASTER-WIRE in the slot/hotel worktree (cwd H:/prism-slot-hotel). This wires the built-but-unwired read/pricing/lifecycle surface of ItemMasterEngine into businessDispatcher.

VERIFY (read the actual files end-to-end):
1. `mcp-server/src/engines/ItemMasterEngine.ts` — the public methods getItem/listItems/setPriceLevel/priceFor/deactivateItem/reactivateItem (the wire targets). Confirm signatures match how the dispatcher calls them.
2. `mcp-server/src/tools/dispatchers/businessDispatcher.ts` — the new wiring (grep `item_get|item_list|item_price_at_level|item_price_for_qty|item_deactivate|item_reactivate`):
   - action names added to the action-name array (~line 1620) AND a matching switch `case` for each (~line 2108) — NO action present in one but not the other (the false-wire failure mode).
   - each case calls the correct engine method with correct args (itemCode/code alias, levelName/level alias, qty default 1). Confirm `setPriceLevel(code, level)` arg ORDER, and that item_price_for_qty wraps the bare-number return as {itemCode,levelName,qty,price}.
   - `getEngine("itemMaster")` lazy getter exists (~line 269) and returns itemMasterEngine.
   - the retired WIRE-EXEMPT comment in ItemMasterEngine.ts is accurate (not a lingering false deferral).
3. Check there is no duplicate action name / no decreased total action count regression.

Report each finding with severity P0/P1/P2 and an overall verdict PASS or FAIL. Be concrete (file:line). The companion test `mcp-server/src/__tests__/businessDispatcher.item-master.test.ts` already passes 11/11 — focus on correctness/completeness the green tests might not catch (e.g. action-array/case mismatch, wrong arg order, missing alias, naming that implies mutation on a read-only action).

### Assistant | 2026-06-12T13:08:51.512Z

I'll read the actual files end-to-end to verify the dispatcher wiring for U-HOTEL-ITEM-MASTER-WIRE.

### Assistant | 2026-06-12T13:08:54.402Z

[tool_use: Read]

### User | 2026-06-12T13:08:56.060Z

[tool_result] read-once-guard: 'H:\prism-slot-hotel\mcp-server\src\engines\ItemMasterEngine.ts' was already read 3s ago in this session and is unchanged (mtime 1781269351064). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-12T13:08:59.077Z

The file was already read in this session. Let me read the dispatcher file and the engine with specific offsets.

### Assistant | 2026-06-12T13:09:00.401Z

[tool_use: Grep]

### Assistant | 2026-06-12T13:09:01.736Z

[tool_use: Grep]

### User | 2026-06-12T13:09:02.787Z

[tool_result] 2: * ItemMasterEngine — QuickBooks "Item List" parity for the PRISM ERP (galaxy:business, slot:hotel).
11: * (quantity_on_hand, adjustStock, reorder status). ItemMasterEngine does NOT re-implement stock
29: *  - price reconciles: priceFor(code, level, 1) === the level's computed unit price.
33: *  - never hard-delete: deactivateItem flips active=false ([[feedback_never_delete_only_disable]]);
34: 
... [+3547 chars truncated]

### User | 2026-06-12T13:09:03.371Z

[tool_result] 165:let _itemMaster: any;
269:    case "itemMaster":
270:      return _itemMaster ??= (await import("../../engines/ItemMasterEngine.js")).itemMasterEngine;
1624:  "item_get",
1625:  "item_list",
1626:  "item_price_at_level",
1627:  "item_price_for_qty",
1628:  "item_deactivate",
1629:  "item_reactivate",
2114:            const engine = await getEngine("itemMaster");
2122:          case "item_get":
... [+586 chars truncated]

### Assistant | 2026-06-12T13:09:07.504Z

Good foundation. Now I need to read the actual case bodies and the action-array context to verify arg order, aliases, and the wrap for item_price_for_qty.

### Assistant | 2026-06-12T13:09:08.856Z

[tool_use: Read]

### Assistant | 2026-06-12T13:09:09.477Z

[tool_use: Read]

### User | 2026-06-12T13:09:10.478Z

[tool_result] 2108	          case "list_define_term": {
2109	            const engine = await getEngine("listManagement");
2110	            result = engine.defineTerm(params);
2111	            break;
2112	          }
2113	          case "item_define": {
2114	            const engine = await getEngine("itemMaster");
2115	            result = engine.defineItem(params);
2116	            break;
2117	          }
211
... [+3704 chars truncated]

### User | 2026-06-12T13:09:12.127Z

[tool_result] 1615	  "chart_account_add",
1616	  "journal_entry_memorize",
1617	  "financial_report_sales_by_customer",
1618	  "budget_create",
1619	  "list_define_term",
1620	  "item_define",
1621	  // HOTEL: ERP item-catalog read + pricing + lifecycle surface (2026-06-12, U-HOTEL-ITEM-MASTER-WIRE).
1622	  // ItemMasterEngine shipped with only defineItem wired; these expose its read/pricing/never-hard-delete
1
... [+724 chars truncated]

### Assistant | 2026-06-12T13:09:17.609Z

Now let me verify the engine method signatures precisely, the lazy getter context, and check for any WIRE-EXEMPT comment in the engine file.

### Assistant | 2026-06-12T13:09:18.529Z

[tool_use: Read]

### Assistant | 2026-06-12T13:09:19.481Z

[tool_use: Read]

### User | 2026-06-12T13:09:23.374Z

[tool_result] 1	/**
2	 * ItemMasterEngine — QuickBooks "Item List" parity for the PRISM ERP (galaxy:business, slot:hotel).
3	 *
4	 * QuickBooks parity: the "Item List" / "Item Master" — the registry of every sellable/purchasable
5	 * item (inventory parts, services, assemblies, charges, discounts) with their GL account links and
6	 * their price levels. This is the DEFINITION registry: item codes, types, accoun
... [+3233 chars truncated]

### User | 2026-06-12T13:09:24.311Z

[tool_result] 160	let _chartOfAccounts: any;
161	let _journalEntry: any;
162	let _financialReportSuite: any;
163	let _budget: any;
164	let _listManagement: any;
165	let _itemMaster: any;
166	let _inventoryAdjustment: any;
167	let _payrollLiabilityFiling: any;
168	let _supplierCapability: any;
169	let _rfqMatchScoring: any;
170	let _quoteExplainPDF: any;
171	let _buyerAccount: any;
172	let _rfqBroadcast: any;
17
... [+530 chars truncated]

### Assistant | 2026-06-12T13:09:28.102Z

Now let me verify the exact engine method signatures and check for any `WIRE-EXEMPT` comment that might need to be retired.

### Assistant | 2026-06-12T13:09:29.552Z

[tool_use: Read]

### Assistant | 2026-06-12T13:09:29.841Z

[tool_use: Read]

### User | 2026-06-12T13:09:33.288Z

[tool_result] 245	   * @returns a {@link PricedLevel} with the computed unit price.
246	   * @throws if the item or level is unknown, or the computed price is negative.
247	   */
248	  static setPriceLevel(itemCode: string, levelName: string): PricedLevel {
249	    const item = ItemMasterEngine.#mustGet(itemCode, "setPriceLevel");
250	    const level = item.priceLevels.find((l) => l.name === levelName);
251	   
... [+3014 chars truncated]

### User | 2026-06-12T13:09:33.357Z

[tool_result] 315	  /**
316	   * Fetch a stored item by code.
317	   * @param itemCode the item code.
318	   * @returns the {@link ItemRecord}, or null if no item has that code.
319	   */
320	  static getItem(itemCode: string): ItemRecord | null {
321	    return ItemMasterEngine.items.get(itemCode) ?? null;
322	  }
323	
324	  /**
325	   * List stored items.
326	   * @param opts.includeInactive include deactivat
... [+2107 chars truncated]

### Assistant | 2026-06-12T13:09:36.919Z

Now let me check whether there is a WIRE-EXEMPT comment that was supposed to be removed, and also verify the action-array/case symmetry for the six new actions.

### Assistant | 2026-06-12T13:09:38.732Z

[tool_use: Grep]

### Assistant | 2026-06-12T13:09:40.182Z

[tool_use: Grep]

### User | 2026-06-12T13:09:43.304Z

[tool_result] No matches found

### User | 2026-06-12T13:09:44.243Z

[tool_result] 1624:  "item_get",
1625:  "item_list",
1626:  "item_price_at_level",
1627:  "item_price_for_qty",
1628:  "item_deactivate",
1629:  "item_reactivate",
2122:          case "item_get": {
2127:          case "item_list": {
2133:          case "item_price_at_level": {
2139:          case "item_price_for_qty": {
2148:          case "item_deactivate": {
2154:          case "item_reactivate": {

### User | 2026-06-12T13:10:04.741Z

[Request interrupted by user]
