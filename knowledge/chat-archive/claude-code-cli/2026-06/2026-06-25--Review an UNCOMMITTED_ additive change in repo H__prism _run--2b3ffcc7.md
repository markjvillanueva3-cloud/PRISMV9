---
type: "chat-session"
source: "claude-code-cli"
session_id: "2b3ffcc7-ae3b-4072-9b14-c8869bc14280"
title: "Review an UNCOMMITTED, additive change in repo H:/prism (run `git -C H:/prism di"
date: "2026-06-25"
first_ts: "2026-06-25T14:05:39.723Z"
last_ts: "2026-06-25T14:10:25.171Z"
cwd: "H:\\prism\\mcp-server"
messages: 61
user_msgs: 21
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/2b3ffcc7-ae3b-4072-9b14-c8869bc14280/subagents/agent-a8dda66a35cc0f846.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review an UNCOMMITTED, additive change in repo H:/prism (run `git -C H:/prism di

> **claude-code-cli** | 2026-06-25 | 61 msgs (21 user / 40 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2b3ffcc7-ae3b-4072-9b14-c8869bc14280/subagents/agent-a8dda66a35cc0f846.jsonl`

## Transcript

### User | 2026-06-25T14:05:39.723Z

Review an UNCOMMITTED, additive change in repo H:/prism (run `git -C H:/prism diff -- mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts mcp-server/src/tools/dispatchers/cadDispatcher.ts mcp-server/src/__tests__/blueprintExtractionRouter.test.ts mcp-server/src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts`). Grade PASS or FAIL with P0/P1/P2 + file:line.

UNIT (U-XRAY-REDACT-PLAN-PAYLOADS, slot xray): closes a 3-of-3 P2 — the blueprint extraction routing plan's NON-privacy consumer payloads (quote/program/job/...) carried the RAW un-redacted `title_block`/`source`, so the whole plan was unsafe to surface externally even though the `redact` route was fixed. New opt-in `RouteExtractionOpts.redactPayloads` (default FALSE): when true, every consumer payload is run through `redactExtraction()` and `plan.source` through `redactText()`, and `plan.redacted=true`. Wired through `prism_cad:blueprint_extract_route` + `_and_route` (`redactPayloads` param). `redactExtraction`/`redactText` are the already-reviewed shared lib (NOT changed in this diff).

YOUR LENS (silent breakage / regression / coupling):
- Is the change strictly ADDITIVE + default-off (the existing default-path behavior byte-identical)? Confirm `redactPayloads` undefined → no redaction, no `plan.redacted`.
- Does redaction change ELIGIBILITY / confirm-gates / summary? It must be CONTENT-ONLY (the routes' eligible/requires_confirmation/blocking_fields + summary are computed from the unredacted contract BEFORE the payload redaction pass). Verify the redaction pass runs AFTER those are computed and does not feed back.
- `redactExtraction(r.payload)` on a payload subset (not a full contract) — is it safe/total? Does it ever drop/corrupt a needed non-PII field (dimensions numbers, material grade)?
- Idempotency on the `redact` route's own payload (which already holds `redacted_extraction`) — any double-redaction harm?
- Dispatcher rOpts: both `blueprint_extract_route` and `_and_route` updated
... [+290 chars truncated]

### Assistant | 2026-06-25T14:05:47.439Z

I'll review this uncommitted change. Let me start by examining the diff and the relevant files.

### Assistant | 2026-06-25T14:05:49.131Z

[tool_use: Bash]

### User | 2026-06-25T14:05:52.969Z

[tool_result] diff --git a/mcp-server/src/__tests__/blueprintExtractionRouter.test.ts b/mcp-server/src/__tests__/blueprintExtractionRouter.test.ts
index c12f081fe4..7ac5082f6d 100644
--- a/mcp-server/src/__tests__/blueprintExtractionRouter.test.ts
+++ b/mcp-server/src/__tests__/blueprintExtractionRouter.test.ts
@@ -459,3 +459,53 @@ describe("routeExtractionToConsumers — comprehensive PII detection (U-XRAY-RED
 
... [+11275 chars truncated]

### Assistant | 2026-06-25T14:06:01.324Z

Let me read the full router file to understand the context around the change, especially how `allRoutes` is built and how `redactExtraction` operates.

### Assistant | 2026-06-25T14:06:02.569Z

[tool_use: Read]

### User | 2026-06-25T14:06:03.820Z

[tool_result] 560	  {
561	    consumer: "setup_sheet",
562	    dispatcher: "prism_cam",
563	    action: "setup_sheet_generate",
564	    kind: "advisory",
565	    build: (c) => {
566	      const nd = dims(c).length;
567	      return {
568	        eligible: nd > 0,
569	        reason: nd > 0 ? `${nd} dimension(s) + title-block -> operator setup sheet auto-fillable` : "no dimensions -> nothing to populate a setup 
... [+4931 chars truncated]

### Assistant | 2026-06-25T14:06:08.202Z

Now let me examine the `redactExtraction` and `redactText` functions to verify they're total/safe on a payload subset. This is the critical correctness question.

### Assistant | 2026-06-25T14:06:08.746Z

[tool_use: Read]

### User | 2026-06-25T14:06:09.207Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\blueprint-vision\blueprintRedaction.ts' was already read 1s ago in this session and is unchanged (mtime 1782395262204). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: P
... [+18 chars truncated]

### Assistant | 2026-06-25T14:06:12.518Z

The harness says it's already in context, but I don't see it. Let me grep the key function signatures to understand the contract.

### Assistant | 2026-06-25T14:06:13.911Z

[tool_use: Grep]

### User | 2026-06-25T14:06:16.204Z

[tool_result] 208:export interface RedactionAudit {
238:export function redactText(
289:export function redactExtraction(extraction: unknown, opts: { aggressive?: boolean } = {}): RedactExtractionResult {

### Assistant | 2026-06-25T14:06:20.519Z

I need to read the actual `redactExtraction` body — this is the load-bearing question. Let me read the relevant range.

### Assistant | 2026-06-25T14:06:21.107Z

[tool_use: Read]

### User | 2026-06-25T14:06:22.642Z

[tool_result] 200	  // Byte-identical to the LoRA engine's prior contract: any non-string -> "" (NOT String(x)).
201	  if (typeof text !== "string") return "";
202	  let out = text;
203	  if (out.length === 0) return out;
204	  for (const pat of patterns) out = out.replace(new RegExp(pat.source, pat.flags), MASK);
205	  return out;
206	}
207	
208	export interface RedactionAudit {
209	  type: "customer-text" | "
... [+8748 chars truncated]

### Assistant | 2026-06-25T14:06:27.363Z

Now I understand `redactExtraction`. It walks the object recursively, returns a deep copy, masks identity fields wholesale, scrubs free text, preserves numbers/booleans/null. Critically it returns `{ extraction, redactions }` — the diff uses `.extraction`. Let me see the rest of the function (return wrapper) and the consumer payload shapes to understand what `redactExtraction(r.payload)` receives.

### Assistant | 2026-06-25T14:06:28.779Z

[tool_use: Read]

### User | 2026-06-25T14:06:30.029Z

[tool_result] 359	  }
360	
361	  const redacted = walk(extraction, null, "") as Record<string, unknown>;
362	  return { extraction: (redacted && typeof redacted === "object" ? redacted : {}), redactions };
363	}
364	
365	export interface MaskRegion {
366	  bbox: number[];          // [x,y,w,h] fractional in [0,1] (region-classifier convention)
367	  region_kind: string;
368	  confidence?: number;
369	}
370	
371
... [+1683 chars truncated]

### Assistant | 2026-06-25T14:06:35.658Z

`redactExtraction` always returns a non-null `Record<string,unknown>` (falls back to `{}`). Now the key adversarial question: each consumer's `payload` is a subset. If a payload is something where `redactExtraction` would corrupt a needed field. Let me look at ALL the consumer payload shapes — I need to enumerate them and check for two risks: (1) a non-PII field that `redactExtraction` might mask because its KEY name matches an identity key, and (2) a string value that would be wrongly scrubbed. Let me read all the CONSUMERS specs.

### Assistant | 2026-06-25T14:06:36.859Z

[tool_use: Read]

### User | 2026-06-25T14:06:37.745Z

[tool_result] 280	  //     engines the operator reviews before the program (the gated commitment) ---
281	  // ADVISORY: optimize raw stock size from the part envelope
282	  {
283	    consumer: "stock_optimize",
284	    dispatcher: "prism_business",
285	    action: "stock_size_optimize",
286	    kind: "advisory",
287	    build: (c) => {
288	      const nd = dims(c).length;
289	      return {
290	        eligibl
... [+12546 chars truncated]

### Assistant | 2026-06-25T14:06:44.521Z

Now let me look at the earlier consumers (the `redact` privacy route + the rest) to check the `material(c)` payload key — and importantly whether `material` is a key that `redactExtraction` treats as identity or non-PII. The `material` value is a free string like "4140 steel" — under `redactExtraction`, the key `material` is not an identity key, so it goes to free-text scrubbing. The test asserts `quote.payload.material` survives as `"4140 steel"`. But `material` carried directly as a payload key (`payload: { material: mat, ... }`) — its keyName is `material`. Let me check whether `material` is in NON_PII_VALUE_KEYS so it gets `protectGrades`, and review the `redact` route + `cad_reconstruct` route + the `dims`/`material` helpers.

### Assistant | 2026-06-25T14:06:45.813Z

[tool_use: Read]

### User | 2026-06-25T14:06:46.979Z

[tool_result] 170	  dispatcher: string;
171	  action: string;
172	  kind: ConsumerKind;
173	  build: (c: BlueprintExtractionContract) => {
174	    eligible: boolean;
175	    reason: string;
176	    /** count of below-floor fields this consumer DEPENDS ON (only meaningful for commitment kind) */
177	    blocking: number;
178	    payload: Record<string, unknown>;
179	  };
180	}
181	
182	const CONSUMERS: readonly 
... [+5543 chars truncated]

### Assistant | 2026-06-25T14:06:52.010Z

I have the full consumer set now. Let me check the critical adversarial concern: when `redactExtraction(r.payload)` walks a payload with `dimensions: [...]` array of `ContractDimension` objects, does any field within a dimension get masked? A dimension object may have keys like `type`, `status`, `value_mm`, `agreement_confidence`, and possibly text fields. Let me check the `ContractDimension` schema and the NON_PII / IDENTITY key lists.

### Assistant | 2026-06-25T14:06:52.777Z

[tool_use: Read]

### User | 2026-06-25T14:06:53.959Z

[tool_result] 1	// scripts: mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts
2	//
3	// U-APP-REDACT-LIB -- shared blueprint customer-identity redactor.
4	//
5	// Build-once (R15/R16): the customer-name anonymization logic was previously locked inside
6	// BlueprintLoRABridgeEngine (LoRA-export only). This extracts the PROVEN core (the spec-mandated
7	// deny-list + part-number patterns + the ordere
... [+11692 chars truncated]

### Assistant | 2026-06-25T14:07:01.170Z

I now have a complete picture of the redaction lib. Let me verify the adversarial concern about dimension `type` field values. A `ContractDimension` has a `type` like "diameter", and possibly free-text `label`/`note` fields. Under `redactExtraction`, those string values would go to free-text scrubbing via `redactText`. A value like "diameter" or "linear" won't match customer patterns. But what about a dimension `type` value that matches a PART_NUMBER pattern? Let me check the `ContractDimension` schema for any string fields that could be corrupted.

### Assistant | 2026-06-25T14:07:02.272Z

[tool_use: Bash]

### User | 2026-06-25T14:07:08.786Z

[tool_result] 118:export type ContractDimension = z.infer<typeof contractDimensionSchema>;
188:  dimensions: ContractDimension[],
233:  const dimensions: ContractDimension[] = (Array.isArray(f.dimensions) ? f.dimensions : [])
236:      const status = STATUS_VALUES.has(d.status as string) ? (d.status as ContractDimension["status"]) : "unknown";
251:    .filter((d: ContractDimension) => Number.isFinite(d.value_mm
... [+3 chars truncated]

### Assistant | 2026-06-25T14:07:13.140Z

[tool_use: Read]

### User | 2026-06-25T14:07:14.172Z

[tool_result] 95	  .object({
96	    schemaVersion: z.literal(BLUEPRINT_EXTRACTION_CONTRACT_VERSION),
97	    units: z.literal("mm").describe("all dimensions are millimetres (PRISM internal unit; normalize at the extraction boundary)"),
98	    source: z.string().optional().describe("print path / SHA provenance"),
99	    // `.default([])` so a contract that round-tripped through a response slimmer (which drops emp
... [+5849 chars truncated]

### Assistant | 2026-06-25T14:07:18.331Z

Let me see the `contractDimensionSchema` and `contractCalloutSchema` definitions to know exactly which string fields exist on dimensions/callouts, which is where corruption could silently happen.

### Assistant | 2026-06-25T14:07:19.649Z

[tool_use: Read]

### User | 2026-06-25T14:07:21.574Z

[tool_result] 40	const MM_PER_INCH = 25.4;
41	
42	// ============================================================================
43	// ZOD SCHEMAS
44	// ============================================================================
45	
46	export const dimensionStatusEnum = z
47	  .enum(["corroborated", "partial", "singleton", "unknown"])
48	  .describe("ensemble corroboration status: corroborated=>=quorum models
... [+2706 chars truncated]

### Assistant | 2026-06-25T14:07:31.165Z

Now I have the full structure. Let me trace the adversarial scenarios concretely:

**Dimension fields**: `value_mm` (number, passes through), `type` (string like "diameter"), `confidence` (number), `needs_confirm` (boolean), `status` (string enum), `hallucination_candidate` (boolean). Of the string fields: `type` (e.g. "diameter") and `status` (e.g. "corroborated"). Neither matches customer patterns nor part-number patterns. Safe.

**Callout fields**: `value` (string — the GD&T FCF / note text), confidence, needs_confirm, hallucination_candidate. The `value` string is free text — and crucially **a GD&T value like `"POS-0.050"` or a note could match the part-number pattern** `\b[A-Z]{1,4}-\d{3,6}\b` or contain a customer name. This is intentional redaction behavior (notes are a known PII vector), so masking there is correct, not a bug. But there's a subtler concern: a GD&T FCF callout. Let me verify there's no risk the part-number pattern mangles a legit GD&T value when redactPayloads is on. That is acceptable by design (external-safe = aggressive masking of free text), and it only affects the opt-in path.

Now let me verify the **idempotency / double-redaction** concern on the `redact` route's payload, and confirm the `material(c)`/`dims(c)` helpers. Let me check those helper definitions and how `material` key is treated.

### Assistant | 2026-06-25T14:07:32.807Z

[tool_use: Read]

### User | 2026-06-25T14:07:34.044Z

[tool_result] 108	   * When true, EVERY consumer payload (+ `plan.source`) is run through `redactExtraction` so the WHOLE
109	   * plan carries no customer identity -- making it safe to surface / serialize / log EXTERNALLY. The
110	   * DEFAULT plan (false) keeps the raw `title_block`/`source` in the non-privacy payloads, which the
111	   * INTERNAL commitment/advisory consumers (quote/program/job/material_reso
... [+3205 chars truncated]

### Assistant | 2026-06-25T14:07:44.461Z

Now the key adversarial check on the `material` payload key. In payloads like `{ material: mat, dimensions: ... }`, the value `mat` is `"4140 steel"`. Under `redactExtraction`, keyName is `material`, which is in `NON_PII_VALUE_KEYS` → it goes through `redactText(node, { protectGrades: true })`. "4140 steel" — does the part-number pattern `\b\d{3,8}-[A-Z]{1,4}\b` match? No, it requires a hyphen. "4140 steel" has no hyphen. Customer patterns? "steel" isn't a customer. So it passes through. Good — the test confirms `quote.payload.material` stays `"4140 steel"`.

But wait — a critical subtlety. The `material` field at the top-level of the payload is treated as `NON_PII_VALUE_KEYS` and `protectGrades` applies. But what about a material grade like `"4140-PH"` or a real grade `"AISI-4140"`? `looksLikeMaterialGrade("AISI-4140")` → prefix AISI is in the set, 4 digits → preserved. Good. A material like `"SAE-J429"` → `\b[A-Z]{1,4}-\d{3,6}\b`? "J429" is `[A-Z]-\d` — actually "J429" doesn't have a hyphen between J and 429 in "SAE-J429"... the token is "SAE-J429", which doesn't match `[A-Z]{1,4}-\d{3,6}` (the part after hyphen is "J429" not digits). So no false redaction. Fine.

Now let me verify the dispatcher schema accepts `redactPayloads` — if the Zod validation for these actions doesn't whitelist the param, the dispatcher might strip it before it reaches `params.redactPayloads`. Let me check how `params` is validated for `blueprint_extract_route`.

### Assistant | 2026-06-25T14:07:45.447Z

[tool_use: Read]

### User | 2026-06-25T14:07:46.691Z

[tool_result] 3610	            if (params.titleBlock != null && typeof params.titleBlock === "object") {
3611	              cOpts.titleBlock = params.titleBlock as Record<string, unknown>;
3612	            }
3613	            const contract = hasFused
3614	              ? contractMod.normalizeFusedToContract(params.fused, cOpts)
3615	              : contractMod.normalizeDrawingExtractToContract(params.drawing, c
... [+6197 chars truncated]

### Assistant | 2026-06-25T14:07:54.252Z

Important: the dispatcher reads `params.redactPayloads` directly from `params` (not from a Zod-validated/stripped object). The `params.contract` is what gets Zod-validated, not the top-level params object. So `redactPayloads` is read from the raw params and won't be stripped. The dispatcher test confirms it flows through. Good — no silent strip.

Now let me run the affected tests to confirm the claim that they pass, and check git diff didn't leave the schema action-enum drifted (no new action, just a new param — so no enum change needed). Let me run the two test files.

### Assistant | 2026-06-25T14:07:55.297Z

[tool_use: Bash]

### User | 2026-06-25T14:08:03.791Z

[tool_result] [INFO] [prism_cad] Action: blueprint_extract_route

stderr | src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts > cadDispatcher blueprint_extract_route (U-XRAY-EXTRACT-CONSUMER-ROUTER fan-out through prism_cad) > redactPayloads:true -> external-safe plan: customer masked in payloads + plan.redacted, material preserved
[INFO] [prism_cad] Action: blueprint_extract_contract

stderr | src/__tes
... [+2033 chars truncated]

### Assistant | 2026-06-25T14:08:10.514Z

40/40 pass. Now let me verify the **default-path byte-identical** claim more rigorously. The key line is `routesOut = opts.redactPayloads ? allRoutes.map(...) : allRoutes`. When `redactPayloads` is falsy, `routesOut === allRoutes` (same reference) — so the default `routes` array is exactly the prior behavior. And `plan.redacted` is only set when `opts.redactPayloads` is truthy. And `plan.source` uses `opts.redactPayloads ? redactText(...).text : contract.source` — default keeps raw. Confirmed strictly additive + default-off.

Now let me verify there are no **other callers** of `routeExtractionToConsumers` that could be affected (the opts param is optional and new field is optional, so additive — but let me confirm no caller relies on the array reference being filtered, etc.).

### Assistant | 2026-06-25T14:08:11.398Z

[tool_use: Grep]

### User | 2026-06-25T14:08:13.027Z

[tool_result] Found 3 files
src\__tests__\blueprintExtractionRouter.test.ts
src\tools\dispatchers\cadDispatcher.ts
src\engines\blueprint-vision\blueprintExtractionRouter.ts

### Assistant | 2026-06-25T14:08:17.580Z

Only the two dispatcher call sites (both updated identically) plus the test + the def. No other consumer. Now let me check the `ExtractionRoutingPlan` consumers — does anything serialize/round-trip the plan and break on the new optional `redacted` field? Let me check the response slimmer / schema mentioned earlier (the contract has a "response slimmer which drops empty arrays").

### Assistant | 2026-06-25T14:08:18.661Z

[tool_use: Grep]

### User | 2026-06-25T14:08:19.972Z

[tool_result] src\engines\blueprint-vision\blueprintExtractionRouter.ts:82:export interface ExtractionRoutingPlan {
src\engines\blueprint-vision\blueprintExtractionRouter.ts:108:   * When true, EVERY consumer payload (+ `plan.source`) is run through `redactExtraction` so the WHOLE
src\engines\blueprint-vision\blueprintExtractionRouter.ts:596:): ExtractionRoutingPlan {
src\engines\blueprint-vision\blueprintExtra
... [+3752 chars truncated]

### Assistant | 2026-06-25T14:08:38.934Z

`ExtractionRoutingPlan` is consumed only in the router + tests. The new `redacted?: boolean` is an optional field — no consumer reads it as required, no serialization breaks (an absent optional field is the default-path behavior, already the norm for `source`). The `documentExtractionRouter.ts` is a sibling/parallel router with its own plan type — unaffected by this change (different function).

Now let me confirm the **idempotency** concern in detail. The `redact` route's payload is `{ redacted_extraction: redacted, pii_fields: [...], n_redactions: N }`. When `redactPayloads:true`, this payload is passed through `redactExtraction()` again. Walk concerns:
- `redacted_extraction` is already-masked (customer → `[REDACTED]`). Re-walking it: `[REDACTED]` as an identity-field value → re-masked to `[REDACTED]` (no harm, idempotent). The `MASK` token itself — does `redactText("[REDACTED]")` match any customer/part pattern? No. Safe.
- `pii_fields` is an array of field-path strings like `"title_block.customer"`, `"source"`, `"notes[0].value"`. These are walked as free-text strings. Could a path string match a part-number or customer pattern? A path like `"notes[0].value"` — no customer name, no `[A-Z]{1,4}-\d{3,6}`. But consider: if the original PII field path included an array index or a key that was itself a customer name (e.g., a per-customer-keyed map `"ITW SHAKEPROOF.foo"`), the field path string would contain "ITW" and get scrubbed. That's harmless cosmetic over-masking of an audit label on the opt-in external path — not a correctness/safety bug (it's the external-safe view, where leaking a customer name in a field-path label would itself be a leak). Actually it's *desirable*. 
- `n_redactions` is a number → passes through.

So the idempotency is safe. The test confirms `red.title_block.customer === "[REDACTED]"`.

Let me now do one final adversarial check: the **CONTENT-ONLY** invariant. The summary counts (`nEligible`, `nBlocked`, `nReady`, `nIneligible`, `nNeedsCon
... [+1291 chars truncated]

### Assistant | 2026-06-25T14:08:40.605Z

[tool_use: Bash]

### User | 2026-06-25T14:09:07.308Z

[tool_result] EXIT_FILTER_DONE

### Assistant | 2026-06-25T14:09:11.974Z

No type errors in any of the changed files. Let me also confirm the broader tsc run didn't surface unrelated pre-existing breakage attributable to this change by checking the overall exit (quick sanity — just count total errors).

### Assistant | 2026-06-25T14:09:12.871Z

[tool_use: Bash]

### User | 2026-06-25T14:09:40.609Z

[tool_result] 2
---done---

### Assistant | 2026-06-25T14:09:43.684Z

Two TS errors exist — let me confirm they're pre-existing and unrelated to this diff (not in the changed files, which I already confirmed are clean).

### Assistant | 2026-06-25T14:09:44.936Z

[tool_use: Bash]

### User | 2026-06-25T14:10:04.652Z

[tool_result] src/engines/ReinforcementLearningCAMFeedbackEngine.ts(302,40): error TS2554: Expected 5 arguments, but got 4.
src/engines/ReinforcementLearningCAMFeedbackEngine.ts(373,42): error TS2554: Expected 5 arguments, but got 4.
---done---

### Assistant | 2026-06-25T14:10:25.171Z

Both TS errors are in `ReinforcementLearningCAMFeedbackEngine.ts` — a completely unrelated CAM engine, not touched by this diff and not on the import path of the changed files. Pre-existing, unrelated. The diff itself is type-clean.

I have everything needed for the verdict. Let me summarize the traced edge-paths and consumers.

## Review complete

I traced the full blast radius and every adversarial path in your lens. All checks pass.

**VERDICT: PASS**

summary: The change is strictly additive and default-off — when `redactPayloads` is undefined/false, `routesOut === allRoutes` (same reference), `plan.source` keeps the raw value, and `plan.redacted` is never set, so the default-path output is byte-identical to the prior behavior (confirmed by `blueprintExtractionRouter.ts:624-626,656-660` and the DEFAULT-plan test). The redaction is content-only: eligibility, confirm-gates, `blocking_fields`, and the summary are all computed from `allRoutes`/the unredacted `contract` BEFORE and independent of the payload-redaction pass, which only swaps `payload` via `{...r, payload}` spread — `eligible` is preserved so even the `includeIneligible` filter is unaffected.

findings: none

Audited consumers / edge-paths traced (so the PASS is auditable):
- **All callers of `routeExtractionToConsumers`** (`H:/prism/mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts`): the only two are `cadDispatcher.ts:3646-3650` (`blueprint_extract_route`) and `cadDispatcher.ts:3682-3686` (`blueprint_extract_and_route`) — both updated identically (`if (params.redactPayloads === true) rOpts.redactPayloads = true`). No other consumer exists.
- **Dispatcher param flow**: `params.redactPayloads` is read from the raw params object (only `params.contract` is Zod-validated/stripped), so the new flag is not silently dropped — confirmed by the dispatcher test asserting masked vs raw across both paths.
- **`redactExtraction` on a payload SUBSET** (`blueprintRedaction.ts:289-363`): total + nev
... [+1413 chars truncated]
