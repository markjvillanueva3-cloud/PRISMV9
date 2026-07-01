---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "Independent second-pass review of H:\\prism-slot-bravo\\mcp-server\\src\\__tests__\\C"
date: "2026-05-15"
first_ts: "2026-05-15T20:08:37.479Z"
last_ts: "2026-05-15T20:10:52.899Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 9
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a5ae5737e0546f205.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Independent second-pass review of H:\prism-slot-bravo\mcp-server\src\__tests__\C

> **claude-code-cli** | 2026-05-15 | 20 msgs (9 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a5ae5737e0546f205.jsonl`

## Transcript

### User | 2026-05-15T20:08:37.479Z

Independent second-pass review of H:\prism-slot-bravo\mcp-server\src\__tests__\CustomerMaterialMapEngine.test.ts. The engine under test is H:\prism-slot-bravo\mcp-server\src\engines\CustomerMaterialMapEngine.ts.

You are the SECOND reviewer; assume Reviewer A (test-review-agent) caught the obvious coverage gaps. Weight your review toward what test-coverage specialists OFTEN MISS:

1. **Test contract honesty**: do the assertions actually verify what the test NAME claims? E.g., "ISO_GROUPS iteration breaks ties — primary stays P (declaration order)" — does this test actually exercise the ISO_GROUPS-ordering invariant or could it pass even if iteration order were reversed? (The current data uses P and M which happen to be first and second — would test still pass with primary_iso_group=M? VERIFY.)

2. **Hidden coupling between tests**: shared module-level state (the `lookupMaterialDistribution` describe block has a const `map` shared across tests — is mutation possible? does this couple tests in a way that ordering matters?).

3. **Async/timing**: any setTimeout / Promise / Date.now() coupling that makes the tests flaky? (The engine uses `new Date().toISOString()` in `generatedAt` — does any test depend on timing comparisons?)

4. **Type-cheat hygiene**: `(X as unknown as Y)` double-casts are forbidden by H:/.claude/rules/dispatchers.md analogue (the test hook flagged "double-assertion"). But adversarial input tests LEGITIMATELY need to bypass TypeScript to test runtime defense. Verify each `as unknown as` is at a runtime-defense boundary, not a type-mismatch shortcut.

5. **Coverage of the engine's NEW code paths** (specifically added in the per-file iteration):
   - The inner `while (scanFrom <= test.length)` loop in extractMaterialFromFilename (line ~280-300 of engine). Test: M2-rejected → continue past → 4140 hit. Is this case truly testing that branch or only the outer-loop continuation?
   - The MAX_FILENAME_LEN guard (early return on >1024 chars). Test: 2000-char
... [+1800 chars truncated]

### Assistant | 2026-05-15T20:08:50.021Z

I'll perform an independent second-pass review of the test file, weighted toward what coverage specialists typically miss.

### Assistant | 2026-05-15T20:08:50.413Z

[tool_use: Read]

### User | 2026-05-15T20:08:52.478Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\mcp-server\src\__tests__\CustomerMaterialMapEngine.test.ts' was already read 32s ago in this session and is unchanged (mtime 1778875657987). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (d
... [+27 chars truncated]

### Assistant | 2026-05-15T20:08:55.943Z

[tool_use: Bash]

### Assistant | 2026-05-15T20:08:57.526Z

[tool_use: Read]

### User | 2026-05-15T20:09:08.802Z

[tool_result] /**
 * CustomerMaterialMapEngine.test.ts — MS-PRINT-PROGRAM-LOOP / U-PPL-C2
 *
 * Covers the full public surface:
 *   - `extractMaterialFromFilename` (filename → MaterialHit | null) — happy path
 *     + thread-context disambiguation + MAX_FILENAME_LEN guard + word-boundary.
 *   - `extractMaterialFromCustomerFolder` (customer → MaterialHit | null).
 *   - `resolveEntryMaterial` — source-priority
... [+17292 chars truncated]

### User | 2026-05-15T20:09:10.845Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\mcp-server\src\engines\CustomerMaterialMapEngine.ts' was already read 38s ago in this session and is unchanged (mtime 1778875382166). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-05-15T20:09:14.579Z

[tool_use: Bash]

### Assistant | 2026-05-15T20:09:15.590Z

[tool_use: Bash]

### Assistant | 2026-05-15T20:09:16.618Z

[tool_use: Bash]

### User | 2026-05-15T20:09:23.868Z

[tool_result]   689 H:\prism-slot-bravo\mcp-server\src\__tests__\CustomerMaterialMapEngine.test.ts
  676 H:\prism-slot-bravo\mcp-server\src\engines\CustomerMaterialMapEngine.ts
 1365 total

### User | 2026-05-15T20:09:28.349Z

[tool_result]     ];
    const map = buildCustomerMaterialMap(entries);
    const a = map.customers["ALCOA"]!;
    expect(a.with_material).toBe(0);
    expect(a.without_material).toBe(2);
    expect(a.primary_iso_group).toBe("P");
    expect(a.primary_confidence).toBe(0);
  });

  it("ISO_GROUPS iteration breaks ties — when P and M tie, primary stays P (declaration order)", () => {
    const entries: ProgramSam
... [+11240 chars truncated]

### User | 2026-05-15T20:09:32.790Z

[tool_result] /**
 * CustomerMaterialMapEngine — learned customer → material distribution map
 *
 * MS-PRINT-PROGRAM-LOOP / Track C / U-PPL-C2 (= RES-MS21 core).
 *
 * Why this engine exists
 * ----------------------
 * `MaterialResolverForProgramsEngine._resolveFromCustomer()` resolves material
 * from a customer folder name today, BUT its comment explicitly says (line ~293):
 *
 *     "Known customer → materi
... [+27740 chars truncated]

### Assistant | 2026-05-15T20:09:36.397Z

I have full visibility now. Let me verify the critical concerns from the prompt.

### Assistant | 2026-05-15T20:09:39.939Z

[tool_use: Grep]

### Assistant | 2026-05-15T20:09:41.376Z

[tool_use: Grep]

### User | 2026-05-15T20:09:46.690Z

[tool_result] 78:  { min: 600, max: 3000, iso_group: "N", name: "Aluminum alloy", hardness_hb: 95 },
80:  { min: 400, max: 700,  iso_group: "P", name: "Low-carbon steel (1018/1020)", hardness_hb: 130 },
82:  { min: 300, max: 550,  iso_group: "P", name: "Medium-carbon steel (1045/4140)", hardness_hb: 200 },
84:  { min: 200, max: 400,  iso_group: "P", name: "Alloy steel (4340/8620)", hardness_hb: 260 },
86:  { mi
... [+1994 chars truncated]

### User | 2026-05-15T20:09:47.851Z

[tool_result] 256:  primary_iso_group: ISOGroup;
257:  /** Confidence in primary_iso_group (= its share, in [0,1]). 0 when with_material=0. */
517: *   - primary_iso_group falls back to "P" with primary_confidence=0 when
569:  let primary_iso_group: ISOGroup = "P";
574:        primary_iso_group = g;
587:    primary_iso_group,

### Assistant | 2026-05-15T20:10:52.899Z

I have everything I need. Task tracking is already active for the parent — no new tasks needed here. Writing the review now.

---

# Reviewer B — Independent Second-Pass Review

**File**: `H:\prism-slot-bravo\mcp-server\src\__tests__\CustomerMaterialMapEngine.test.ts`
**Engine**: `H:\prism-slot-bravo\mcp-server\src\engines\CustomerMaterialMapEngine.ts`
**Verdict**: **PASS with P1/P2 findings** — load-bearing invariants ARE tested, but one test name lies about its coverage, one is silently dead, and several adversarial gaps exist. Ship after addressing P1-1 and P1-2; defer the rest.

---

## P1-1 (HIGH) — Test name lies: "ISO_GROUPS iteration breaks ties" doesn't exercise the invariant

**Location**: test L409-419 ("ISO_GROUPS iteration breaks ties — primary stays P (declaration order)")
**Concern raised verbatim in prompt §1.** Verified — concern is real.

The test uses P (4140) + M (303). Engine L568-575: `if (iso_group_share[g] > primary_confidence)` — strict greater-than, iterates `ISO_GROUPS = ["P","M","K","N","S","H"]`. P is initialized to win because `primary_iso_group: ISOGroup = "P"` is the seed. Reverse iteration order to `["M","P",...]` and M still beats the seeded P (M > 0), so the test would FAIL — good. BUT the seeding is P-default, so a tie where ONLY non-P groups are present (e.g., M vs N) would expose whether iteration order is load-bearing. Currently untested.

**Fix**: add a second tie test with `303-ONE.MIN` (M) + `6061-TWO.MIN` (N) — should pick M (M comes before N in ISO_GROUPS). Without this, reversing ISO_GROUPS to `[N, S, H, K, M, P]` would still pass the current test (P seed wins ties involving P).

---

## P1-2 (HIGH) — "primary falls back to P (medium-carbon default)" comment is misleading

**Location**: test L399-407.
The test asserts `primary_iso_group === "P"` when `with_material=0`. But the comment says "(medium-carbon default)" — that's a category, not what the engine returns. The engine returns the GROUP "P", which spans low-carbon, 
... [+7315 chars truncated]
