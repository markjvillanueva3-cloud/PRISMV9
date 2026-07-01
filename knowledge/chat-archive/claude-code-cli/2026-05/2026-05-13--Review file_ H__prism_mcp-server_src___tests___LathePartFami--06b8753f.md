---
type: "chat-session"
source: "claude-code-cli"
session_id: "06b8753f-3fc4-4a6a-89d2-ede6a2312610"
title: "Review file: H:/prism/mcp-server/src/__tests__/LathePartFamilyTemplateExtractorE"
date: "2026-05-13"
first_ts: "2026-05-13T03:40:10.391Z"
last_ts: "2026-05-13T03:41:04.794Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/06b8753f-3fc4-4a6a-89d2-ede6a2312610/subagents/agent-a70cf823719f394bb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Review file: H:/prism/mcp-server/src/__tests__/LathePartFamilyTemplateExtractorE

> **claude-code-cli** | 2026-05-13 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/06b8753f-3fc4-4a6a-89d2-ede6a2312610/subagents/agent-a70cf823719f394bb.jsonl`

## Transcript

### User | 2026-05-13T03:40:10.391Z

Review file: H:/prism/mcp-server/src/__tests__/LathePartFamilyTemplateExtractorEngine.test.ts

This is the companion test for TRAINING-LEARNING-MS0/U1 (just-shipped engine LathePartFamilyTemplateExtractorEngine.ts).

Spec context: H:/prism/state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md line 58 demands:
- ≥10 cases
- ≥3 families from {wafer-insert, casing, shaft, flange}
- adversarial: empty corpus / malformed snapshot / unparseable customer dir

Comprehensive-build-enforcement also demands:
- happy path + ≥3 failure modes + ≥2 adversarial inputs
- real reference-value or algebraic-invariant assertions (NO toBeDefined/toBeTruthy stubs)
- no synthetic loop tests (it() per case; unroll the loop)
- variability floor: ≥3 of {materials/dialects/machine-types/CAM-systems} exercised

Read the file end-to-end. Verify:

1. CASE COUNT: count distinct `it()` calls. Must be ≥10.

2. FAMILY COVERAGE: exercise ≥3 of wafer-insert/casing/shaft/flange/unknown. Each family must have at least one dedicated case with real assertions about its expected values.

3. FAILURE MODES: ≥3 distinct error-path tests. Look for tests asserting error tokens like unknown_family, family_not_in_snapshot, snapshot_not_found, snapshot_malformed_json, snapshot_missing_families, snapshot_wrong_schema.

4. ADVERSARIAL: ≥2 tests exercising hostile inputs — at minimum empty corpus + prototype pollution + path traversal.

5. ASSERTION QUALITY: every it() must end with at least one strict reference-value assertion (toBe(specific-value) / toEqual(specific-array) / toBeCloseTo(N,precision)). Reject any test whose only checks are toBeDefined / toBeTruthy / not.toBeNull / placeholder presence.

6. NO SYNTHETIC LOOPS: no `for (const x of [...]) { it(...) }` patterns; no `[...].forEach` containing test logic. Each family's invariants should be in their own it() block.

7. ROUND-TRIP: at least one test must exercise the full extract→write→list→get cycle, not just dryRun on one method.

8. CLEANUP: beforeEach/a
... [+441 chars truncated]

### Assistant | 2026-05-13T03:40:13.822Z

I'll read the test file end-to-end to verify test coverage for the LathePartFamilyTemplateExtractorEngine.

### Assistant | 2026-05-13T03:40:13.968Z

[tool_use: Read]

### User | 2026-05-13T03:40:15.084Z

[tool_result] 1	/**
2	 * LathePartFamilyTemplateExtractorEngine.test.ts
3	 * ================================================
4	 *
5	 * Tests for TRAINING-LEARNING-MS0/U1. Per spec line 58: >=10 cases; reference
6	 * families wafer-insert / casing / shaft / flange (>=3); adversarial cases for
7	 * empty corpus / malformed snapshot.
8	 *
9	 * Coverage floor:
10	 *   - happy path
11	 *   - >=3 failure modes
12	 *
... [+23973 chars truncated]

### Assistant | 2026-05-13T03:40:20.931Z

I'll conduct a comprehensive test coverage review of the LathePartFamilyTemplateExtractorEngine.test.ts file against the specification.

### Assistant | 2026-05-13T03:40:21.373Z

[tool_use: Grep]

### User | 2026-05-13T03:40:21.967Z

[tool_result] 115:  it("catalogCorpus returns families sorted by count descending with exact counts", () => {
136:  it("extractTemplate('wafer-insert') — OSP-anchored, controller okuma_osp, exact seed", async () => {
166:  it("extractTemplate('shaft') — non-OSP, controller null, empty op_sequence", async () => {
186:  it("extractTemplate('flange') — third family meets ≥3 families floor", async () => {
205:  it(
... [+1952 chars truncated]

### Assistant | 2026-05-13T03:40:23.464Z

Now let me verify the spec file to confirm the exact requirements:

### Assistant | 2026-05-13T03:40:24.050Z

[tool_use: Read]

### User | 2026-05-13T03:40:24.952Z

[tool_result] 1	# TRAINING-LEARNING-MS0 — Domain Starting-Template Corpus
2	
3	**Created:** 2026-05-12 by claude-8f2683e8 (slot alpha)
4	**Triggered by:** user request 2026-05-12 — "add a section for training and learning in the 3 primary machine domains: mill, lathe, wire edm. to look through every single one of our prints, programs, cad/cam files. we should be able to make starting templates for common or sim
... [+12120 chars truncated]

### Assistant | 2026-05-13T03:40:26.841Z

Now let me examine the engine source to cross-check the test's accuracy:

### Assistant | 2026-05-13T03:40:27.330Z

[tool_use: Read]

### User | 2026-05-13T03:40:28.596Z

[tool_result] 1	/**
2	 * LathePartFamilyTemplateExtractorEngine
3	 * ========================================
4	 *
5	 * Reads the JM Die lathe corpus catalog (emitted by `Docustrata/.index/phase20-lathe-
6	 * template-corpus-scan.py`) and produces per-family `TrainingTemplate` artifacts under
7	 * `mcp-server/data/training/templates/lathe/<family>.json`. These templates are the
8	 * starting-skeleton inputs for
... [+4529 chars truncated]

### Assistant | 2026-05-13T03:41:04.794Z

Let me create a comprehensive test coverage review. I'll analyze the key dimensions:

## COMPREHENSIVE TEST COVERAGE REVIEW

**Engine:** LathePartFamilyTemplateExtractorEngine  
**Test File:** H:/prism/mcp-server/src/__tests__/LathePartFamilyTemplateExtractorEngine.test.ts  
**Spec Context:** H:/prism/state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md (line 58)

---

## 1. TEST COUNT VERIFICATION

**Requirement:** ≥10 test cases  
**Result:** **27 it() calls** ✓ EXCEEDS

Breakdown:
- Happy path (≥3 families): 6 cases
- Round-trip: 2 cases  
- Failure modes (≥3): 6 cases
- Adversarial (≥2): 4 cases
- Per-family invariants: 5 cases
- Metadata/registry: 4 cases

---

## 2. FAMILY COVERAGE VERIFICATION

**Requirement:** ≥3 distinct families from {wafer-insert, casing, shaft, flange, unknown}  
**Result:** **5 families exercised** ✓ EXCEEDS

Explicit coverage:
| Family | Lines | Tests |
|--------|-------|-------|
| wafer-insert | 136-164, 237-261, 440-456 | 3 dedicated cases + round-trip |
| casing | 205-219, 458-470 | 2 dedicated cases |
| shaft | 166-184, 472-484 | 2 dedicated cases |
| flange | 186-203, 486-497 | 2 dedicated cases |
| unknown | 418-431, 533-537 | 2 dedicated cases |

**P0 Finding:** Each family has explicit assertions about expected values (family name, run_count, controller_baseline, seed_macros). No synthetic loops — every family assertion is unrolled into its own `it()` block (lines 440-537).

---

## 3. FAILURE MODE COVERAGE

**Requirement:** ≥3 distinct error-path tests  
**Result:** **6 error tests** ✓ EXCEEDS

| Error | Line | Token |
|-------|------|-------|
| unknown_family | 279-289 | `expect(r.error).toBe("unknown_family")` |
| family_not_in_snapshot | 291-302 | `expect(r.error).toBe("family_not_in_snapshot")` |
| snapshot_not_found | 304-314 | `expect(r.error).toBe("snapshot_not_found")` |
| snapshot_malformed_json | 316-326 | `expect(r.error).toBe("snapshot_malformed_json")` |
| snapshot_missing_families | 328-341 | `expect(r.error).t
... [+8799 chars truncated]
