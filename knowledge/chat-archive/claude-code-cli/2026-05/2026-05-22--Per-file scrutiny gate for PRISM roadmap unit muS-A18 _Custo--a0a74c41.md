---
type: "chat-session"
source: "claude-code-cli"
session_id: "a0a74c41-2bd4-4650-b52c-94b448b82813"
title: "Per-file scrutiny gate for PRISM roadmap unit muS-A18 (CustomerNormalizer) at H:"
date: "2026-05-22"
first_ts: "2026-05-22T17:16:51.291Z"
last_ts: "2026-05-22T17:21:23.563Z"
cwd: "H:\\prism\\mcp-server"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-aa442e12dd05e2231.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Per-file scrutiny gate for PRISM roadmap unit muS-A18 (CustomerNormalizer) at H:

> **claude-code-cli** | 2026-05-22 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-aa442e12dd05e2231.jsonl`

## Transcript

### User | 2026-05-22T17:16:51.291Z

Per-file scrutiny gate for PRISM roadmap unit muS-A18 (CustomerNormalizer) at H:/prism. Read each changed region END TO END, flag P0/P1, grade PASS/FAIL.

The unit adds customer-record normalization to CustomerManagementEngine. Changed files:

1. H:/prism/mcp-server/src/engines/CustomerManagementEngine.ts —
   (a) Three new interfaces: `CustomerNormalizationChange`, `CustomerDuplicateCluster`, `CustomerNormalizationReport` (after `CustomerTrendsReport`).
   (b) New `normalizeCustomers(apply = false)` method (after `customerTrends()`). For each customer it collapses whitespace in name/company/contact_name, lowercases+trims email, canonicalizes phone, uppercases address.state, trims address.zip — records each diff as a CustomerNormalizationChange. When apply=true it writes the normalized fields back and calls persistenceBridge.persist. It also clusters customers by a normalized name key (lowercase, alphanumerics only) and reports clusters of size >=2.
   (c) New `private canonicalPhone(raw)` helper — 10 digits → (NNN) NNN-NNNN; 11 digits leading 1 → same; else raw.trim().

2. H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts — new `"customer_normalize"` ACTIONS enum entry + `case "customer_normalize"` calling `engine.normalizeCustomers(params.apply === true)`.

3. H:/prism/mcp-server/src/schemas/businessActionSchemas.ts — new `customer_normalize` schema const (`apply` optional boolean) + map registration.

4. H:/prism/mcp-server/src/__tests__/CustomerManagementEngine.normalize.test.ts — NEW, 13 test cases.

Verify specifically:
- `canonicalPhone`: 10 digits → format. 11 digits leading 1 → strip the 1, format. Anything else → raw.trim(). Is the 11-digit non-leading-1 case (e.g. a foreign number) correctly falling through to raw.trim()? Any digit-count off-by-one?
- The apply=true block: when apply && fieldChanges.length>0 it assigns ALL six normalized values (name/company/contact_name/email/phone/address) even fields that were already clean. Is that corre
... [+1078 chars truncated]

### Assistant | 2026-05-22T17:17:12.521Z

I'll review each changed file end to end.

### Assistant | 2026-05-22T17:17:13.757Z

[tool_use: Bash]

### Assistant | 2026-05-22T17:17:13.250Z

[tool_use: Bash]

### User | 2026-05-22T17:17:44.439Z

[tool_result] <persisted-output>
Output too large (685.7KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\a0a74c41-2bd4-4650-b52c-94b448b82813\tool-results\b51yrrpuw.txt

Preview (first 2KB):
 M CLAUDE.md
 M PRISM-INVENTORY-LATEST.md
 M cad-engine/knowledge_store/doc-fusion-cad.json
 M cad-engine/scripts/targeted_extract_hm_training.py
 M cad-engine/src/document_extract.py
 M knowledge/PRISM-S
... [+1775 chars truncated]

### User | 2026-05-22T17:18:08.098Z

[tool_result] mcp-server/src/__tests__/CustomerManagementEngine.normalize.test.ts  7.6K
EXIT:0

### Assistant | 2026-05-22T17:18:11.184Z

The test file exists. Let me read the four changed files.

### Assistant | 2026-05-22T17:18:11.483Z

[tool_use: Read]

### Assistant | 2026-05-22T17:18:12.198Z

[tool_use: Bash]

### User | 2026-05-22T17:18:38.473Z

[tool_result] 1	/**
2	 * muS-A18 — CustomerNormalizer
3	 *
4	 * Tests CustomerManagementEngine.normalizeCustomers() and round-trips the
5	 * customer_normalize action through businessDispatcher's prism_business tool.
6	 *
7	 * Real-value assertions (no toBeDefined() stubs):
8	 *   - Whitespace collapse, email lowercasing, phone canonicalization to
9	 *     (NNN) NNN-NNNN, state uppercasing, zip trimming.
10	 * 
... [+8036 chars truncated]

### User | 2026-05-22T17:20:32.023Z

[tool_result] mcp-server/src/engines/CustomerManagementEngine.ts | 135 +++++++++++++++++++++
 mcp-server/src/schemas/businessActionSchemas.ts    |   5 +
 .../src/tools/dispatchers/businessDispatcher.ts    |   6 +
 3 files changed, 146 insertions(+)

--- Changes ---

mcp-server/src/engines/CustomerManagementEngine.ts
  @@ -106,6 +106,29 @@ export interface CustomerTrendsReport {
  +export interface CustomerNorma
... [+6745 chars truncated]

### Assistant | 2026-05-22T17:20:37.201Z

I need to verify the truncated 12 lines of the engine diff and confirm the persist convention.

### Assistant | 2026-05-22T17:20:37.907Z

[tool_use: Bash]

### User | 2026-05-22T17:21:11.362Z

[tool_result]   +      }
  +    }
  +
  +    const customersWithChanges = new Set(changes.map((c) => c.customer_id)).size;
  +    const recommendation =
  +      changes.length === 0 && duplicateClusters.length === 0
  +        ? 'All customer records are already normalized — no action needed.'
  +        : `${changes.length} field normalization(s) across ${customersWithChanges} customer(s)` +
  +          (dup
... [+1606 chars truncated]

### Assistant | 2026-05-22T17:21:23.563Z

Confirmed. Line 607 is the new call; lines 149, 284 show `createCustomer`/`recordJobForCustomer` use identical `persistenceBridge.persist("customers", id, ... as any)` — the `as any` cast and `'customers'` collection key are convention-conformant. I have everything needed.

## Scrutiny: muS-A18 CustomerNormalizer

**P0 — none.**

**P1 — none.**

**P2 — `normalized_key` ambiguity in clusters.** `CustomerDuplicateCluster.normalized_key` and the test (`expect(cluster.normalized_key).toBe("acmeinc")`) use the alphanumerics-only key, but the key is derived from `nName` (the *normalized* name), not the raw stored name. On a dry run, two customers whose raw names differ only in whitespace will still cluster correctly because `collapse()` is applied to `nName` first — so this is correct, just worth noting the key reflects post-normalization state even in `apply=false`. Not a defect.

**P3 — `customer_names` field unused by tests.** `CustomerDuplicateCluster.customer_names` is populated but no test asserts its contents (`customer_ids.length` is checked, names are not). Minor coverage gap, not blocking.

### Verification of each requested point

- **`canonicalPhone` digit logic** — 10 digits → format; 11 digits leading `1` → `digits.slice(1)` formatted; 11-digit non-leading-1 (foreign) → falls through to `raw.trim()`. The branch is `digits.length === 11 && digits[0] === '1'`, so a non-`1` 11-digit number correctly skips reformatting. No off-by-one. Test `"555-HELP"` (3 digits) confirms the fall-through. **PASS** — though foreign 11-digit and 12-digit cases are untested (P3).

- **apply=true assigns all six fields** — assigning a clean value to itself is idempotent and harmless; `nName === cust.name` for clean fields. `cust.address = {...cust.address, state: nState, zip: nZip}` spreads existing `address` first, so `street`/`city` are preserved. **Correct.**

- **Dry-run guarantee** — the mutation + `persistenceBridge.persist` are both inside `if (apply && fieldChanges.length >
... [+1103 chars truncated]
