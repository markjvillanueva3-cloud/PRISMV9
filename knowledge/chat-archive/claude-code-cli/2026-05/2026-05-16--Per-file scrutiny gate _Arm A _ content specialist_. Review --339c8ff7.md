---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "Per-file scrutiny gate (Arm A — content specialist). Review THIS FILE focusing o"
date: "2026-05-16"
first_ts: "2026-05-16T02:17:55.176Z"
last_ts: "2026-05-16T02:19:10.649Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a927b2f63239abc6a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Per-file scrutiny gate (Arm A — content specialist). Review THIS FILE focusing o

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a927b2f63239abc6a.jsonl`

## Transcript

### User | 2026-05-16T02:17:55.176Z

Per-file scrutiny gate (Arm A — content specialist). Review THIS FILE focusing on the BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U3 extensions (added near the top + at the bottom of the existing class):

`H:/prism/mcp-server/src/engines/GroundTruthRegistryEngine.ts`

Context: This unit ADDS 5 methods + helpers + Zod schemas to the existing GroundTruthRegistryEngine. The class is preserved verbatim — extensions are additive. 67/67 tests PASS (including all 30+ new tests). Key concerns to verify:

1. **HARD RULE**: per spec, the engine NEVER writes to `Automated Program_Corrected 5-25.xlsm` or `_PART LIBRARY/<customer>/<pn>/CNC PROGRAM/`. Verify `isReadOnlyTarget()` and the deny-list regex `READ_ONLY_PATH_PATTERNS` cover both patterns + verify `registerBlueprintExtraction` calls `isReadOnlyTarget` BEFORE any write.

2. **Hostile-payload class** (U-MS1-U2 P0-2 antecedent — see [[reference_u_ms1_u2_pdf_blueprint_pattern_rescue]]): does `extractJmDieItems` correctly skip malformed entries without throwing? Does `readGroundTruthValuesForPart` handle corrupted part.json gracefully?

3. **Concurrent-write atomicity**: appendFileSync is used for JSONL writes. Acceptable for advisory streams but document any risk.

4. **Schema correctness**: Zod 4's `z.record(z.enum, z.string())` enforces ALL keys present (this was a P0 caught during dev — fix is the explicit-optional-fields object). Verify the current shape ACTUALLY allows partial groundTruthValues at runtime.

5. **Type safety**: any `as` casts? Any `any` types? Any double assertions?

6. **flagAmbiguities** correctly skips operator-resolved pairs (operator_correction is the gold tier — its presence means the operator already adjudicated).

7. **Karpathy R12 fail-loud**: errors are surfaced (not silently swallowed) in `joinDocustrataToPartLibrary` via `indexErrors[]`.

8. **classifyConfidenceTier**: verify all 4 confidence tiers are reachable from real inputs (operator_verified, ensemble_consensus, single_backend, ambiguous).

9. **N
... [+244 chars truncated]

### Assistant | 2026-05-16T02:18:08.881Z

I'll analyze the GroundTruthRegistryEngine.ts file focusing on the U-MS1-U3 extensions.

### Assistant | 2026-05-16T02:18:09.124Z

[tool_use: Read]

### User | 2026-05-16T02:18:10.054Z

[tool_result] 1	/**
2	 * GroundTruthRegistryEngine — indexed, queryable corpus over the
3	 * ground-truth bundles produced by GroundTruthBatchExtractor (U-CGT07).
4	 *
5	 * Builds five compound indexes from a tree of bundle.json manifests:
6	 *   - byFileId          (primary key — exact match)
7	 *   - byCustomerLower   (case-insensitive customer name)
8	 *   - byFormat          (extension, e.g. ".sldprt")
9	 *
... [+48481 chars truncated]

### Assistant | 2026-05-16T02:19:10.649Z

## Per-File Scrutiny Review (Arm A — Content Specialist)

**File**: `H:/prism/mcp-server/src/engines/GroundTruthRegistryEngine.ts`
**Scope**: BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U3 extensions (lines 232-409, 606-909, 1035-1186)

---

### P0 — None

---

### P1 Findings

**P1-1: `isReadOnlyTarget` deny-list regex has a substantive gap (lines 372-377)**

The pattern `/Automated[\s_-]?Program[_-]?Corrected[\s_-]?5-?25\.xlsm(?:\/|$)/i` requires a hyphen+digits sequence `5-25` or `525`. The spec calls out "Automated Program_Corrected 5-25.xlsm" specifically, but operators commonly version this file (e.g., `Automated Program_Corrected 6-25.xlsm`, `Automated Program_Corrected 5-26.xlsm` as the year rolls). A regression-prone literal year/month encoded in the deny-list will let a write through the moment the macro book version-bumps.

**Suggested fix**: Broaden to `/Automated[\s_-]?Program[_-]?Corrected(?:[\s_-]+[\d-]+)?\.xlsm(?:\/|$)/i` so any year-month suffix matches. Cite a comment that this is intentional "version-bump tolerant."

Also: the `_PART LIBRARY` regex `_PART[\s_-]?LIBRARY\/[^/]+\/[^/]+\/CNC[\s_-]?PROGRAM\/` requires the trailing slash — `path.join(libraryRoot, customer, pn, "CNC PROGRAM")` (no trailing slash) is the most natural way for a caller to build the path and would NOT match. The deny-list is bypassable by ending the target at the directory name. Add `(?:\/|$)` after `CNC[\s_-]?PROGRAM` like the xlsm rule does.

**P1-2: `registerBlueprintExtraction` durability vs in-memory state can desync (lines 672-685)**

The record is pushed to `this.blueprintExtractions` and indexed BEFORE `appendFileSync` runs. If the JSONL append throws, the in-memory state still carries the record and `blueprintState()` will over-report `extractionsCount` relative to durable storage. The doc comment at line 681 acknowledges this ("in-memory record is still present so queries work; durability is what fails") but downstream consumers (training loaders) reading the JSONL will have 
... [+5223 chars truncated]
