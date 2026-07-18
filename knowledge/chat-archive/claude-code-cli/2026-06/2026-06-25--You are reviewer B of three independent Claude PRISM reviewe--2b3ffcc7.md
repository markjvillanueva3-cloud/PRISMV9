---
type: "chat-session"
source: "claude-code-cli"
session_id: "2b3ffcc7-ae3b-4072-9b14-c8869bc14280"
title: "You are reviewer B of three independent Claude PRISM reviewers — weighted toward"
date: "2026-06-25"
first_ts: "2026-06-25T13:42:28.149Z"
last_ts: "2026-06-25T13:46:49.889Z"
cwd: "H:\\prism"
messages: 57
user_msgs: 21
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/2b3ffcc7-ae3b-4072-9b14-c8869bc14280/subagents/agent-a5927e4b87c893845.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# You are reviewer B of three independent Claude PRISM reviewers — weighted toward

> **claude-code-cli** | 2026-06-25 | 57 msgs (21 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2b3ffcc7-ae3b-4072-9b14-c8869bc14280/subagents/agent-a5927e4b87c893845.jsonl`

## Transcript

### User | 2026-06-25T13:42:28.149Z

You are reviewer B of three independent Claude PRISM reviewers — weighted toward TEST INTEGRITY + wiring + inlined-constant detection. Do NOT assume the other reviewers caught anything. Review the COMBINED unit across TWO commits in repo H:/prism: run `git -C H:/prism show 618237fa34` and `git -C H:/prism show 9ff067db37`. Ignore any peer commit between them.

Unit (slot xray, "auto redaction"): commit 1 made the blueprint extraction router `redact` consumer detect PII comprehensively via `redactExtraction()` (was title_block.customer-only) + auto-deliver the redacted artifact + name PII field paths not cleartext. Commit 2 fixed an under-redaction P1 (caught by the first 3-of-3's arm C): the blanket NON_PII_VALUE_KEYS spec-field pass-through leaked customer names embedded in spec values; now spec fields run a value-aware scrub (`protectGrades` + new exported `looksLikeMaterialGrade`) that masks embedded customer names + real part numbers while preserving genuine material grades.

YOUR LENS (R9 — a test must FAIL when the logic regresses):
- Do the REGRESSION tests genuinely fail on the OLD code? (a) router PII-in-notes/source/part_number/work_order would be eligible=false under the old Boolean(title_block.customer); (b) the "P1 OVER-REDACTION FIX" (AISI-1045 preserved) would fail without the protectGrades suppression; (c) the "P1 UNDER-REDACTION FIX" (embedded ITW/OPTIMAS/SEMBLEX + part number ABC-1234 masked) would fail under commit-1's blanket pass-through.
- Is the new `looksLikeMaterialGrade` unit test meaningful (TRUE set vs FALSE set actually discriminating)?
- Any weak/tautological assertions, toBeDefined/toBeTruthy used as the assertion of record (vs as a guard before hard asserts), .skip/.only, inlined constants?
- Did the value-aware fix WEAKEN identity masking anywhere (a real customer/part_number must still mask)? Confirm via the relevant tests + the code ordering (identity-key check before the spec-field branch).
- Wiring: confirm prism_cad:blueprint_ex
... [+223 chars truncated]

### Assistant | 2026-06-25T13:42:34.636Z

I'll review these two commits thoroughly, focusing on test integrity, wiring, and inlined-constant detection.

### Assistant | 2026-06-25T13:42:35.310Z

[tool_use: Bash]

### User | 2026-06-25T13:42:46.570Z

[tool_result] commit 618237fa34d97aea389149c2c14afed7246def70
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 08:20:45 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII (slot:xray): auto-redaction -- close the router redact consumer's PII false-negative + over-redaction P1
    
    The blueprintExtractionRouter `redact` consumer (the explicit o
... [+5922 chars truncated]

### Assistant | 2026-06-25T13:42:49.193Z

Let me read the full diffs of both commits.

### Assistant | 2026-06-25T13:42:50.302Z

[tool_use: Bash]

### User | 2026-06-25T13:42:55.904Z

[tool_result] commit 618237fa34d97aea389149c2c14afed7246def70
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 08:20:45 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII (slot:xray): auto-redaction -- close the router redact consumer's PII false-negative + over-redaction P1
    
    The blueprintExtractionRouter `redact` consumer (the explicit o
... [+11345 chars truncated]

### Assistant | 2026-06-25T13:42:59.246Z

Now let me see commit 2's engine diff.

### Assistant | 2026-06-25T13:43:00.074Z

[tool_use: Bash]

### User | 2026-06-25T13:43:05.456Z

[tool_result] commit 9ff067db3713f1c0606659ea07cb2d0401daf586
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 08:36:40 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-SPEC-FIELD-GRADE-GUARD (slot:xray): fix the under-redaction P1 (3-of-3 arm C) -- value-aware grade protection on spec fields
    
    The prior commit (618237fa34) added a BLANKET pass-through for NON_P
... [+7740 chars truncated]

### Assistant | 2026-06-25T13:43:09.544Z

Now let me read the full engine files end-to-end to understand the surrounding contract, ordering, and the redactText/PART_NUMBER_PATTERNS.

### Assistant | 2026-06-25T13:43:10.109Z

[tool_use: Read]

### User | 2026-06-25T13:43:10.580Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\blueprint-vision\blueprintRedaction.ts' was already read 5m ago in this session and is unchanged (mtime 1782394377137). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: P
... [+18 chars truncated]

### Assistant | 2026-06-25T13:43:14.350Z

The guard says I've already read it, but I don't actually have the full file content in context — only the diffs. Let me bypass with the env knob.

### Assistant | 2026-06-25T13:43:15.107Z

[tool_use: Bash]

### User | 2026-06-25T13:43:23.578Z

[tool_result]      1	// scripts: mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts
     2	//
     3	// U-APP-REDACT-LIB -- shared blueprint customer-identity redactor.
     4	//
     5	// Build-once (R15/R16): the customer-name anonymization logic was previously locked inside
     6	// BlueprintLoRABridgeEngine (LoRA-export only). This extracts the PROVEN core (the spec-mandated
     7	// deny-list 
... [+15726 chars truncated]

### Assistant | 2026-06-25T13:43:27.562Z

[tool_use: Bash]

### User | 2026-06-25T13:43:33.434Z

[tool_result]    260	  return { text: out, redactions };
   261	}
   262	
   263	export interface RedactExtractionResult {
   264	  extraction: Record<string, unknown>;
   265	  redactions: RedactionAudit[];
   266	}
   267	
   268	/** True if a key name (case-insensitive, separator-insensitive) is a customer-identity field. */
   269	function isIdentityKey(key: string): boolean {
   270	  const k = key.toLower
... [+7716 chars truncated]

### Assistant | 2026-06-25T13:43:36.838Z

Now I have the full engine. The ordering in `walk` is: identity-key check (line 331) BEFORE the non-PII spec-field branch (line 343). Good — that confirms identity masking still wins. Now let me read the test files in full.

### Assistant | 2026-06-25T13:43:38.202Z

[tool_use: Bash]

### User | 2026-06-25T13:43:43.451Z

[tool_result] commit 9ff067db3713f1c0606659ea07cb2d0401daf586
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 08:36:40 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-SPEC-FIELD-GRADE-GUARD (slot:xray): fix the under-redaction P1 (3-of-3 arm C) -- value-aware grade protection on spec fields
    
    The prior commit (618237fa34) added a BLANKET pass-through for NON_P
... [+5779 chars truncated]

### Assistant | 2026-06-25T13:43:48.893Z

Now let me check the `looksLikeMaterialGrade` FALSE-set carefully. The TRUE set includes `C-1018` and `CR-1018`. Let me verify `D-12345` (5 digits → false) and `AISI-10456` (5 digits → false). The regex is `^([A-Z]{1,4})-(\d{3,4})$`. `D-12345` has 5 digits → no match → false. Good. `PART-001`: prefix `PART` is 4 chars, in `[A-Z]{1,4}`, digits `001` = 3 → matches shape, but `PART` not in MATERIAL_GRADE_PREFIXES → false. Good. Now `FOO-12345`: 5 digits → false. Good.

Let me look at the commit-1 test additions (router + redaction + dispatcher round-trip).

### Assistant | 2026-06-25T13:43:49.770Z

[tool_use: Bash]

### User | 2026-06-25T13:43:54.444Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-25T13:43:58.142Z

The path may differ. Let me find the actual path.

### Assistant | 2026-06-25T13:43:58.498Z

[tool_use: Bash]

### User | 2026-06-25T13:44:02.638Z

[tool_result] mcp-server/src/__tests__/blueprintExtractionRouter.test.ts
mcp-server/src/__tests__/blueprintRedaction.test.ts
mcp-server/src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts

### Assistant | 2026-06-25T13:44:05.857Z

[tool_use: Bash]

### User | 2026-06-25T13:44:09.325Z

[tool_result] commit 618237fa34d97aea389149c2c14afed7246def70
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 08:20:45 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII (slot:xray): auto-redaction -- close the router redact consumer's PII false-negative + over-redaction P1
    
    The blueprintExtractionRouter `redact` consumer (the explicit o
... [+10942 chars truncated]

### Assistant | 2026-06-25T13:44:17.201Z

These regression tests are strong. They assert eligible=true on PII-in-notes/source/part_number/work_order — all of which would be `eligible=false` under the old `Boolean(title_block.customer)` since those test cases have NO title_block.customer. The tests also assert the actual masked output and field paths. Let me verify the mkContract/mkDim/mkCallout helpers and `assertInvariants` to make sure these aren't producing a default customer that would taint the regression logic. Let me read the top of the router test file.

### Assistant | 2026-06-25T13:44:17.839Z

[tool_use: Bash]

### User | 2026-06-25T13:44:22.454Z

[tool_result]      1	/**
     2	 * Tests for blueprintExtractionRouter -- the "apply extraction to ALL prism features" fan-out.
     3	 *
     4	 * Reference-value + invariant tests (R9 -- a test must FAIL when the routing logic changes):
     5	 *  - eligibility per consumer is exercised against the EXACT field it depends on
     6	 *  - the commitment-consumer confirm-gate (quote/program/inspection) blocks on
... [+4111 chars truncated]

### Assistant | 2026-06-25T13:44:37.007Z

`mkContract` defaults to NO title_block (it only spreads `over`), so the regression fixtures genuinely have no `title_block.customer`. Under the old `Boolean(title_block.customer)` they'd be `eligible=false`. Now they assert `eligible=true`. The regression tests genuinely fail on old code. 

Now I need to verify a subtle concern: in commit 1, the `redactOf({ ..., title_block: { material: grade } })` over-redaction test relies on the AISI-1045 grade NOT being flagged. But under commit-1's blanket pass-through, material was a NON_PII key so it passed verbatim → n_redactions=0 → eligible=false. After commit 2, material still runs through `protectGrades=true` and `looksLikeMaterialGrade("AISI-1045")` → true → suppressed → no redaction → still eligible=false. So the over-redaction test stays green under commit 2. Good — let me verify there's no regression by checking that `title_block: { material: grade }` where grade is the WHOLE value. `redactText("AISI-1045", {protectGrades:true})`: part-number pattern matches "AISI-1045", looksLikeMaterialGrade true → preserved, no redaction. Correct.

Now let me confirm the dispatcher round-trip test (R15 wiring).

### Assistant | 2026-06-25T13:44:38.608Z

[tool_use: Bash]

### User | 2026-06-25T13:44:42.429Z

[tool_result] commit 618237fa34d97aea389149c2c14afed7246def70
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 08:20:45 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII (slot:xray): auto-redaction -- close the router redact consumer's PII false-negative + over-redaction P1
    
    The blueprintExtractionRouter `redact` consumer (the explicit o
... [+10039 chars truncated]

### Assistant | 2026-06-25T13:44:48.034Z

Now let me verify two important things: (1) the dispatcher (`prism_cad:blueprint_extract_route`) actually serializes the new payload through JSON — confirm the round-trip test goes through a real serialization. (2) The `part_number` test `XY-9981` — `part_number` is an identity key, so it's masked wholesale BEFORE the non-PII branch. Let me confirm the identity-key check comes first (already confirmed: line 331 before 343). `XY-9981` masked because `part_number` ∈ CUSTOMER_IDENTITY_KEYS → wholesale mask. Good, even though `XY-9981` is NOT a material grade, the identity-key path masks it regardless.

Let me confirm the dispatcher round-trip actually serializes through JSON.

### Assistant | 2026-06-25T13:44:49.136Z

[tool_use: Bash]

### User | 2026-06-25T13:44:53.252Z

[tool_result]      1	/**
     2	 * cadDispatcher.blueprintExtractRoute.test.ts -- round-trip wire test for the
     3	 * `blueprint_extract_route` action (U-XRAY-EXTRACT-CONSUMER-ROUTER). Proves the full app chain THROUGH
     4	 * prism_cad: a producer extraction -> `blueprint_extract_contract` (versioned contract) ->
     5	 * `blueprint_extract_route` (the fan-out plan: which prism features can consume it, w
... [+7079 chars truncated]

### Assistant | 2026-06-25T13:45:07.738Z

The dispatcher round-trip is genuine: `invoke()` calls the real `prism_cad` handler, gets the `content[0].text`, and `JSON.parse`s it (line 32). So the redacted artifact survives full contract → route → JSON serialization through the dispatcher, and the test asserts `payload.redacted_extraction.title_block.customer === "[REDACTED]"` on the deserialized payload. This is a real R15 round-trip assertion. 

Now let me verify the dispatcher actually serializes the payload (i.e., the engine output isn't dropping the new payload shape). Let me check the `material: "4140 steel"` case: under commit 2, with `material` being a NON_PII key, value "4140 steel" runs `redactText("4140 steel", {protectGrades:true})`. Does "4140 steel" match a part-number pattern? Pattern `\b[A-Z]{1,4}-\d{3,6}\b` — no hyphen-digit. Pattern `\b\d{3,8}-[A-Z]{1,4}\b` — "4140 steel" no hyphen. So no redaction → preserved. The router test line 105 `material "4140 steel" present` → speed_feed eligible. Good, material preserved.

Now, one subtle thing I want to verify: in the commit-1 router test "audit-parity" test, it asserts `n_redactions >= fields.length`. With `title_block: { customer: "TOPURA", material: "4140" }`, note "RUN FOR SEMBLEX", source "uploads/ITW/D-12345.pdf". Let me check: "TOPURA" — is it in the distinctive registry? It's referenced in comments as a distinctive customer. It's masked as identity field (customer key). Source "uploads/ITW/D-12345.pdf" → ITW (CORE customer) + D-12345 (part number). The test asserts fields contains "source". Both ITW and D-12345 redactions get field "source". `n_redactions >= fields.length` (3+ spans across 3 fields). This holds.

Now let me verify nothing weakens identity masking by checking the FALSE-set discrimination of `looksLikeMaterialGrade` more rigorously, and check whether there's a gap: a customer name like a 2-letter prefix that collides. Let me check `MS` (in MATERIAL_GRADE_PREFIXES) — could `MS-1234` be a part number that's now suppressed? Let 
... [+71 chars truncated]

### Assistant | 2026-06-25T13:45:08.303Z

[tool_use: Grep]

### User | 2026-06-25T13:45:12.744Z

[tool_result] knowledge\wiki\code-tribal\learnings\blueprint-vision-u-xray-redact-spec-field-grade-guard.md:22:full redactText scrub with a new `protectGrades` option that suppresses ONLY a genuine material-grade token
knowledge\wiki\code-tribal\learnings\blueprint-vision-u-xray-redact-spec-field-grade-guard.md:27:fixed). `protectGrades` defaults FALSE -> the LoRA export (applyAnonymizationPatterns), the bluepr
... [+1115 chars truncated]

### Assistant | 2026-06-25T13:45:27.224Z

`protectGrades` is correctly scoped: only set `true` at line 344 (the spec-field branch). Customer-text patterns run BEFORE part-number patterns in `redactText` (lines 248-250 customer, then 251-259 part-number), and `protectGrades` only affects part-number suppression — so an embedded CORE customer like "ITW" in a spec value is still masked by the customer-text pass regardless of protectGrades. Good.

Now there is one legitimate concern about whether `protectGrades` weakens part-number masking on spec fields for a real part number that happens to share a material prefix shape. Consider `MS-1234` in a `finish` field — `MS` ∈ MATERIAL_GRADE_PREFIXES, digits `1234` (4 digits) → `looksLikeMaterialGrade("MS-1234")` = true → suppressed (NOT masked). Is `MS-####` a plausible real part number that should be masked? `MS` is a military-spec prefix (MS = Military Standard, e.g. "MS21042"). This is a deliberate trade-off documented in the prefix-set comment. It only applies on spec-keyed fields (material/finish/etc.), and a genuine part number lives in `part_number` (identity key, always masked). This is a borderline P2 (acceptable residual), not a P0/P1 — the design intentionally accepts that grade-shaped tokens in spec fields preserve, and real part numbers belong in identity fields.

Let me verify the test for the FALSE set genuinely discriminates by confirming the part-number pattern would mask these on a non-protected field, and confirm the whole-value-customer test (`finish: "ITW"`). `ITW` is a CORE customer → matched by customer-text pattern (not part-number) → masked even with protectGrades. Test asserts `tb.finish === MASK`. Wait — `redactText("ITW", {protectGrades:true})`: customer pattern for CORE "ITW" matches "ITW" → replaced with MASK. So `tb.finish === "[REDACTED]"` = MASK. Test line `expect(tb.finish).toBe(MASK)` passes. And `size: "ALCOA"` → ALCOA is CORE → masked. 

Now let me verify these tests genuinely fail on the intermediate (commit-1) code. Under commit
... [+447 chars truncated]

### Assistant | 2026-06-25T13:45:28.736Z

[tool_use: Bash]

### User | 2026-06-25T13:45:34.000Z

[tool_result]  ✓ src/__tests__/blueprintRedaction.test.ts (36 tests) 18ms
 ✓ src/__tests__/blueprintExtractionRouter.test.ts (28 tests) 22ms
stderr | src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts > cadDispatcher blueprint_extract_route (U-XRAY-EXTRACT-CONSUMER-ROUTER fan-out through prism_cad) > high-trust extraction -> contract -> route: dim consumers ready, no PII/material consumers
[INFO] [prism_
... [+2996 chars truncated]

### Assistant | 2026-06-25T13:45:38.624Z

All 71 tests pass green. Let me also confirm the `blueprint_extract_and_route` one-call chain (mentioned in the prompt) serializes the new payload too, and check the prism_cad ACTIONS enum wiring is intact (the round-trip already proves the dispatcher registers and serializes, but let me confirm the enum entry exists so wiring isn't broken).

### Assistant | 2026-06-25T13:45:39.368Z

[tool_use: Grep]

### User | 2026-06-25T13:45:40.835Z

[tool_result] 283:  "blueprint_extract_route",
285:  "blueprint_extract_and_route",
3623:          case "blueprint_extract_route": {
3634:                new Error("blueprint_extract_route requires contract (a BlueprintExtractionContract; obtain it via blueprint_extract_contract first)"),
3642:                new Error(`blueprint_extract_route: invalid contract -- ${(validation.errors ?? []).join("; ")}`),
3652
... [+474 chars truncated]

### Assistant | 2026-06-25T13:45:46.968Z

The dispatcher wiring is intact: both `blueprint_extract_route` and `blueprint_extract_and_route` are in the ACTIONS enum (lines 283/285) and have `case` handlers (3623/3652) that call the router and serialize the plan. The round-trip test deserializes the new `payload.redacted_extraction` shape successfully, confirming the new payload serializes through the dispatcher's JSON content envelope.

Let me do one final verification — confirm the LoRA export path is genuinely unaffected (it uses `applyAnonymizationPatterns`, not `redactExtraction`/`protectGrades`), to validate the "bounded blast radius" claim.

### Assistant | 2026-06-25T13:45:48.024Z

[tool_use: Grep]

### User | 2026-06-25T13:45:48.029Z

[tool_result] <tool_use_error>Path does not exist: mcp-server/src/engines/blueprint-vision/BlueprintLoRABridgeEngine.ts. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-25T13:45:53.524Z

[tool_use: Bash]

### User | 2026-06-25T13:45:57.708Z

[tool_result] mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts
mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts

### Assistant | 2026-06-25T13:46:05.954Z

[tool_use: Bash]

### User | 2026-06-25T13:46:10.422Z

[tool_result] mcp-server/src/engines/BlueprintLoRABridgeEngine.ts

### Assistant | 2026-06-25T13:46:15.469Z

[tool_use: Grep]

### User | 2026-06-25T13:46:17.769Z

[tool_result] 23:import { ANONYMIZATION_PATTERNS, applyAnonymizationPatterns } from "./blueprint-vision/blueprintRedaction.js";
69:export { ANONYMIZATION_PATTERNS, applyAnonymizationPatterns };
199:    const scrubbed = applyAnonymizationPatterns(body);
289:  return applyAnonymizationPatterns(text);
292:// applyAnonymizationPatterns is now imported + re-exported from blueprint-vision/blueprintRedaction

### Assistant | 2026-06-25T13:46:49.889Z

Confirmed: the LoRA bridge uses only `applyAnonymizationPatterns` (line 199, 289), which was untouched by both commits — `protectGrades` is a new `redactText` opt that defaults FALSE, and `applyAnonymizationPatterns` is a separate function that doesn't call `redactText`. So the LoRA export path is genuinely byte-identical. The "bounded blast radius" claim is verified.

I have everything I need. Let me summarize my findings.

## Summary of verification

**Engine ordering (identity masking not weakened):** In `redactExtraction`'s `walk` (blueprintRedaction.ts), the identity-key wholesale-mask check (line 331) runs BEFORE the non-PII spec-field branch (line 343). A `part_number`/`customer`/`drawing_number` value always masks wholesale regardless of grade-shape. Confirmed by the `XY-9981`/`SEMBLEX` test (commit 1) and `finish:"ITW"`/`size:"ALCOA"` whole-value test (commit 2).

**Regression tests genuinely fail on old code:**
- (a) Router PII-in-notes/source/part_number/work_order: `mkContract` defaults to no `title_block`, so under old `Boolean(title_block.customer)` all four would be `eligible=false`; the new tests assert `eligible=true` + masked output + named field path.
- (b) "P1 OVER-REDACTION FIX" (AISI-1045 preserved): would fail without the grade suppression (part-number regex `[A-Z]{1,4}-\d{3,6}` matches AISI-1045).
- (c) "P1 UNDER-REDACTION FIX" (embedded ITW/OPTIMAS/SEMBLEX + ABC-1234 masked): fails under commit-1's blanket `return node` pass-through, which leaked the verbatim value.

**`looksLikeMaterialGrade` test discriminates:** TRUE set (AISI-1045/SAE-4340/AL-6061/SS-304/C-1018/UNS-3160/CR-1018 + case/trim) vs FALSE set (ABC-1234/XY-9981 non-material prefix, D-12345/AISI-10456/FOO-12345 5-6 digit, ITW/4140/""/undefined/number). Genuinely discriminating — prefix-set membership AND 3-4-digit length both tested.

**Wiring:** `prism_cad:blueprint_extract_route` + `_and_route` are in the ACTIONS enum and have case handlers; the round-trip test invokes the rea
... [+3224 chars truncated]
