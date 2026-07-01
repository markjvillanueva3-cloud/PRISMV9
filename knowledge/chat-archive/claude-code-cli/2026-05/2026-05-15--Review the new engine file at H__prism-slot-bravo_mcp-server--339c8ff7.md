---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "Review the new engine file at H:\\prism-slot-bravo\\mcp-server\\src\\engines\\Custome"
date: "2026-05-15"
first_ts: "2026-05-15T19:56:27.304Z"
last_ts: "2026-05-15T19:57:28.520Z"
cwd: "H:\\prism"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a70d060514e9ce349.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Review the new engine file at H:\prism-slot-bravo\mcp-server\src\engines\Custome

> **claude-code-cli** | 2026-05-15 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a70d060514e9ce349.jsonl`

## Transcript

### User | 2026-05-15T19:56:27.304Z

Review the new engine file at H:\prism-slot-bravo\mcp-server\src\engines\CustomerMaterialMapEngine.ts (just-written, ~430 LOC).

This is MS-PRINT-PROGRAM-LOOP/U-PPL-C2 — a learned customer→material distribution map. Pure-transform engine: caller assembles `ProgramSampleEntry[]` from real evidence (LATHE_AI_TRAINING_REPORT.json customers + filename heuristics + back-annotated prints) and the engine aggregates into a per-customer ISO 513 group distribution. Closes the gap MaterialResolverForProgramsEngine._resolveFromCustomer() leaves open (currently inline-pattern only with a code comment "would ideally come from a persistent database").

Context the engine composes:
- `MATERIAL_KEYWORDS` array regex catalog imported from H:\prism-slot-bravo\mcp-server\src\engines\MaterialResolverForProgramsEngine.ts (now exported; previously private)
- `ISOGroup` type from src/physics/constants.ts (6 groups: P,M,K,N,S,H)
- Source priority weights: blueprint 0.90 > filename 0.70 > folder 0.50

What I want you to do:
1. READ the WHOLE file end-to-end (not split sections).
2. Verify: dimensional consistency? (counts vs shares vs percentages); FAIL-LOUD on non-array input as documented; idempotence of buildCustomerMaterialMap on the same input (deterministic order, no randomness); the regex word-boundary protection against substring false-positives (e.g. "M5-TAPTITE" must NOT match "M2" tool steel); correctness of the ISO_GROUPS satisfies check; share denominator is `with_material` not `sample_count` (consequential for primary_confidence interpretation).
3. Flag P0/P1 issues. P0 = correctness bug or contract violation. P1 = will fail under realistic input (NaN, oversize, unicode, concurrent build, missing field).
4. Cross-check the JSDoc claims against the actual code — does `lookupMaterialDistribution` truly do case-insensitive trim+upper lookup as the docstring says? Does `extractMaterialFromFilename` actually strip both forward AND backslash paths? Does `aggregateCustomerEntries` act
... [+493 chars truncated]

### Assistant | 2026-05-15T19:56:32.240Z

I'll perform a thorough code quality analysis of the engine file.

### Assistant | 2026-05-15T19:56:33.018Z

[tool_use: Read]

### User | 2026-05-15T19:56:36.909Z

[tool_result] 1	/**
2	 * CustomerMaterialMapEngine — learned customer → material distribution map
3	 *
4	 * MS-PRINT-PROGRAM-LOOP / Track C / U-PPL-C2 (= RES-MS21 core).
5	 *
6	 * Why this engine exists
7	 * ----------------------
8	 * `MaterialResolverForProgramsEngine._resolveFromCustomer()` resolves material
9	 * from a customer folder name today, BUT its comment explicitly says (line ~293):
10	 *
11	 *     
... [+21958 chars truncated]

### Assistant | 2026-05-15T19:56:39.756Z

Now let me cross-check the composition claim by inspecting `MATERIAL_KEYWORDS` in the resolver file.

### Assistant | 2026-05-15T19:56:41.713Z

[tool_use: Grep]

### User | 2026-05-15T19:56:44.107Z

[tool_result] 32:export interface ResolvedMaterial {
56:export interface MaterialResolveInput {
102:export const MATERIAL_KEYWORDS: Array<{
106:  { pattern: /\b(6061|7075|2024|5052|ALUMINUM|ALUMINIUM|ALUM)\b/i, iso_group: "N", name: "Aluminum", hardness_hb: 95 },
108:  { pattern: /\b(BRASS|BRONZE|COPPER|CDA|C360|C932)\b/i, iso_group: "N", name: "Brass/Bronze", hardness_hb: 100 },
110:  { pattern: /\b(1010|1018|
... [+1542 chars truncated]

### Assistant | 2026-05-15T19:57:28.520Z

I have everything needed. Here's my analysis.

## Code Quality Analysis Report — CustomerMaterialMapEngine.ts

**Grade: FAIL** (one P0 correctness bug + one P0 contract violation; otherwise excellent)

### P0 — Critical Findings

**P0-1. Regex `lastIndex` state contamination across calls — non-idempotent / order-dependent**
`H:\prism-slot-bravo\mcp-server\src\engines\CustomerMaterialMapEngine.ts:218` and `:244` use `kw.pattern.exec(test)` where every entry in `MATERIAL_KEYWORDS` is declared with the `/i` flag (verified at `MaterialResolverForProgramsEngine.ts:106-128`). Critically, **none of those regexes carry the `/g` or `/y` flag**, so `lastIndex` is not consulted — meaning this is technically safe today. HOWEVER, the code is **one resolver-file edit away from a heisenbug**: anyone who adds `/g` to a pattern (a natural change if someone wants `matchAll`) will silently break determinism because `exec` on a shared `RegExp` instance mutates `lastIndex` across customers/files. The contract "idempotence of `buildCustomerMaterialMap` on the same input" depends on a property of an external module the engine does not own.
**Fix:** use `kw.pattern.test(test)` then re-exec on a fresh copy, OR clone via `new RegExp(kw.pattern.source, kw.pattern.flags)` per call, OR add a unit test in this file that asserts MATERIAL_KEYWORDS contains no `/g` patterns. The JSDoc promise of determinism is currently load-bearing on a remote invariant.

**P0-2. Substring-match regression — `M5-TAPTITE` WILL incorrectly match `M2` tool steel via "TOOL\s*STEEL|...|M-?2"**
The user explicitly asked me to verify this case. Inspect `MaterialResolverForProgramsEngine.ts:116`: `/\b(TOOL\s*STEEL|A-?2|D-?2|H-?13|M-?2|O-?1|S-?7|P-?20)\b/i`. The branch `M-?2` matches the literal string `M2`. Now feed `extractMaterialFromFilename("M5-TAPTITE-DIE.MIN")`: there's no `M2` substring → safe. **But** consider `extractMaterialFromFilename("M2-TAPTITE.MIN")` — `M2` is a screw thread spec (M2-0.4 ISO metric), NOT M2
... [+4618 chars truncated]
