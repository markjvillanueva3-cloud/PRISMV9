---
type: "chat-session"
source: "claude-code-cli"
session_id: "31b302a2-1334-4b15-87f3-6aa6d7d85dfa"
title: "Rigorous review of PRISM commit `25f1ee33fa` (repo H:/prism, branch cad-fusion-l"
date: "2026-06-22"
first_ts: "2026-06-22T13:07:44.105Z"
last_ts: "2026-06-22T13:09:27.228Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-a39c7c8179a0eb593.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Rigorous review of PRISM commit `25f1ee33fa` (repo H:/prism, branch cad-fusion-l

> **claude-code-cli** | 2026-06-22 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-a39c7c8179a0eb593.jsonl`

## Transcript

### User | 2026-06-22T13:07:44.105Z

Rigorous review of PRISM commit `25f1ee33fa` (repo H:/prism, branch cad-fusion-live-ms0). Read the diff: `cd H:/prism && git show 25f1ee33fa`, and read the surrounding code in `mcp-server/src/engines/MINFileParserEngine.ts` (the G-code switch ~line 167-190 and the cannedForOp scan ~line 403-412 + the unitsFirst derivation ~line 415).

UNIT: U-MINPARSE-UNITS-CYCLE-FIX — a SAFETY-CRITICAL units fix. The Okuma MIN parser mapped `case 70: st.units="inch"` / `case 71: st.units="mm"` (lines 170-171), but on Okuma OSP lathes G70/G71/G72 are LAP turning CYCLES, not units (units are G20/G21). So a `G71` roughing-cycle block silently set units="mm" → `header.units` corrupted to "mm" for an inch program (a 25.4× scale hazard). The fix removes lines 170-171; G70/G71/G72 remain classified as canned cycles (the case below + the cannedForOp scan at :408); units come only from G20/G21; undeclared units stay "unknown".

VERIFY (cite file:line, don't assume):
1. Removing the G70/G71→units lines does NOT break legitimate units detection — G20/G21 (lines 168-169) still set inch/mm; nothing else set st.units.
2. The fix is SAFETY-POSITIVE: "unknown" (defer to JM inch default) is correct for an undeclared-units MIN file vs a fabricated "mm". Confirm no downstream consumer assumes header.units is always inch/mm (grep usages of `.header.units` / `units` in consumers).
3. G70/G71/G72 are STILL detected as canned cycles after the fix (the cannedForOp scan at :408 includes 70/71/72 — unaffected).
4. The 2 new regression tests are genuine oracles: would they FAIL on the pre-fix code? (a G71 roughing cycle / a G70 finishing cycle with no G20/G21 → header.units must be "unknown", was "mm"/"inch").
5. Any edge case: a real MIN file that legitimately used G70/G71 for units (would the fix regress it)? Weigh against the live-corpus evidence cited (0× G20/G21, 72× G71-as-cycle in ~1500 files).

Grade PASS or FAIL with P0/P1/P2 + file:line. Be concise.

### Assistant | 2026-06-22T13:07:51.017Z

I'll review commit `25f1ee33fa` rigorously. Let me start by reading the diff and the surrounding code.

### Assistant | 2026-06-22T13:07:51.525Z

[tool_use: Bash]

### User | 2026-06-22T13:07:56.082Z

[tool_result] commit 25f1ee33facfb39ed8007cf59c0d98e1baff54ee
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 08:07:12 2026 -0500

    [MAIN-FORCE] [SAFETY-UNITS]/U-MINPARSE-UNITS-CYCLE-FIX (slot:alpha): Okuma MIN parser mapped G70/G71 to inch/mm -> roughing-cycle blocks silently corrupted units to mm (25.4x hazard)
    
    ROOT CAUSE: MINFileParserEngine.ts:170-171 mapped G70->u
... [+5382 chars truncated]

### Assistant | 2026-06-22T13:07:59.138Z

Now let me read the surrounding code in the engine file end-to-end, focusing on the switch, the canned-cycle scan, and the units derivation.

### Assistant | 2026-06-22T13:07:59.454Z

[tool_use: Read]

### User | 2026-06-22T13:08:00.604Z

[tool_result] 1	/**
2	 * MINFileParserEngine — U-LEARN-03
3	 * =================================
4	 *
5	 * Parses Okuma OSP-P300/P200/U100/P100 .MIN lathe programs into a structured
6	 * {@link MINProgram}.  Operations are segmented at **tool-change boundaries**
7	 * (T-word change → next T-word change = one operation).  Feeds and speeds
8	 * are carried forward from the most recent modal state on the cutting
9
... [+21401 chars truncated]

### Assistant | 2026-06-22T13:08:04.552Z

The engine reads cleanly. I've confirmed the switch structure, the canned-cycle scan at :417, and the unitsFirst derivation at :424. Now let me verify the downstream consumers of `header.units` to confirm the safety claim (#2), and check the test file for the regression oracles.

### Assistant | 2026-06-22T13:08:05.916Z

[tool_use: Grep]

### Assistant | 2026-06-22T13:08:07.163Z

[tool_use: Grep]

### User | 2026-06-22T13:08:08.046Z

[tool_result] Found 250 files limit: 250
mcp-server\src\__tests__\MINFileParserEngine.test.ts
mcp-server\src\engines\MINFileParserEngine.ts
mcp-server\src\tools\dispatchers\camDispatcher.ts
mcp-server\src\__tests__\CADLiveBlueprintOcrAdapter.test.ts
mcp-server\src\engines\CADLiveBlueprintOcrAdapter.ts
mcp-server\src\engines\BlueprintVisionOCREngine.ts
mcp-server\src\engines\BlueprintOCREngine.ts
mcp-server\src\
... [+13423 chars truncated]

### User | 2026-06-22T13:08:09.248Z

[tool_result] Found 8 files
mcp-server\src\__tests__\MINFileParserEngine.test.ts
mcp-server\src\engines\MINFileParserEngine.ts
mcp-server\src\engines\MINBatchExtractorEngine.ts
mcp-server\src\tools\dispatchers\mlDispatcher.ts
mcp-server\src\engines\JMDieTrainingCorpusEngine.ts
mcp-server\src\engines\LatheProgramFeatureInferenceEngine.ts
mcp-server\src\engines\NCFileParserEngine.ts
mcp-server\src\__tests__\engin
... [+30 chars truncated]

### Assistant | 2026-06-22T13:08:14.959Z

Let me focus on the actual consumers of MINFileParserEngine output — the 4 direct consumers — to verify nothing assumes `header.units` is always inch/mm. Let me check how those consumers use the `units` field.

### Assistant | 2026-06-22T13:08:17.329Z

[tool_use: Grep]

### Assistant | 2026-06-22T13:08:17.987Z

[tool_use: Read]

### User | 2026-06-22T13:08:19.576Z

[tool_result] 150	    const op = r.program.operations.find((o) => o.tool_id === "T0101");
151	    expect(op!.subprograms_called).toContain("M98 P8000");
152	  });
153	
154	  // --- sub-program (M99 ending) ----------------------------------------
155	  it("parse: M99 ending classifies program as sub", () => {
156	    const src = `O9004
157	G0 X0. Z0.
158	M99`;
159	    const r = parser.parse({ source_path: "fx",
... [+2742 chars truncated]

### User | 2026-06-22T13:08:19.664Z

[tool_result] H:\prism\mcp-server\src\engines\TrainingExampleAssemblerEngine.ts-70-
H:\prism\mcp-server\src\engines\TrainingExampleAssemblerEngine.ts-71-  // Metadata
mcp-server\src\engines\TrainingExampleAssemblerEngine.ts-72-  metadata: z.object({
mcp-server\src\engines\TrainingExampleAssemblerEngine.ts:73:    units: z.string(),
mcp-server\src\engines\TrainingExampleAssemblerEngine.ts-74-    controller: z.str
... [+2215 chars truncated]

### Assistant | 2026-06-22T13:08:24.856Z

`TrainingExampleAssemblerEngine` reads `prog.header.units` as `z.string()` — accepts "unknown" fine, no inch/mm assumption. Let me verify the other consumers (MINBatchExtractorEngine, JMDieTrainingCorpusEngine, LatheProgramFeatureInferenceEngine) don't branch on units assuming it's inch/mm, and confirm the schema permits "unknown".

### Assistant | 2026-06-22T13:08:26.597Z

[tool_use: Bash]

### User | 2026-06-22T13:08:31.382Z

[tool_result] === minFileSchema units enum ===
61:  units: z.enum(["mm", "inch", "unknown"]),

=== consumers' use of .header.units / units ===

### Assistant | 2026-06-22T13:08:36.663Z

The schema explicitly permits `"unknown"` as a valid enum value (`z.enum(["mm", "inch", "unknown"])` at minFileSchema.ts:61), so the post-parse schema revalidation at MINFileParserEngine.ts:453 will pass. And none of the three corpus/inference consumers branch on units at all — they don't reference the field. The only reader is `TrainingExampleAssemblerEngine`, which passes it through as an opaque `z.string()` metadata field with no inch/mm assumption.

Now let me verify the pre-fix code one more time to confirm the regression oracles would genuinely fail before the fix, and confirm there's no other path that sets `st.units`.

### Assistant | 2026-06-22T13:08:39.075Z

[tool_use: Bash]

### User | 2026-06-22T13:08:45.932Z

[tool_result] === pre-fix applyBlock switch (parent commit) ===
    } else if (L === "G" && valid) {
      const g = Math.floor(n);
      switch (g) {
        case 20: st.units = "inch"; break;
        case 21: st.units = "mm"; break;
        case 70: st.units = "inch"; break;
        case 71: st.units = "mm"; break;   // Okuma has both
        case 94: st.feed_mode = "per_min"; break;
        case 95: st.feed_
... [+1179 chars truncated]

### Assistant | 2026-06-22T13:08:54.244Z

All five verification points are now confirmed against the actual code. Critically, the pre-fix diff also reveals a **duplicate-case bug** that the fix dissolves: pre-fix, `case 70:` and `case 71:` appeared twice in the same switch (lines for units AND the canned-cycle line `case 71: case 72: case 70: ...`). In JS, the FIRST matching case wins, so the units assignment fired and the canned-cycle line was dead for 70/71 — exactly the esbuild duplicate-case warning the commit cites. The fix removes the units cases, so 70/71/72 now correctly reach the canned-cycle case.

Wait — I must double-check one subtle point: pre-fix, did `case 70`/`case 71` in the units block ALSO set `st.cannedCycle`? No — the first matching case has its own `break`, so `st.cannedCycle` was NOT set via `applyBlock` for 70/71 pre-fix. But the test asserts `canned_cycles` (the op array), which comes from the **separate** `cannedForOp` scan at :417, not `st.cannedCycle`. Let me confirm that scan is independent and unaffected, and that `st.cannedCycle` is actually unused for the op output.

### Assistant | 2026-06-22T13:08:56.208Z

[tool_use: Bash]

### User | 2026-06-22T13:09:00.720Z

[tool_result] === cannedForOp scan (the array source for op.canned_cycles) ===
      // Track macro vars (VC/VS/VD/VG) + canned cycles for this op
      for (const w of b.words) {
        if (/^V[CDGS]$/i.test(w.letter)) macrosSeen.add(`${w.letter.toUpperCase()}${w.value}`);
        if (w.letter.toUpperCase() === "G" && Number.isFinite(Number(w.value))) {
          const g = Math.floor(Number(w.value));
       
... [+744 chars truncated]

### Assistant | 2026-06-22T13:09:27.228Z

Fully confirmed. `op.canned_cycles` is sourced from `cannedForOp` (a per-word scan at :417-419 that runs independently of the `applyBlock` switch and explicitly includes 70/71/72), set at :353. This scan was the same before and after the fix — so 70/71/72 detection as canned cycles was always working and is genuinely unaffected. The `st.cannedCycle` modal field (:188) is never read into op output (it's effectively vestigial for the array), so it doesn't matter that pre-fix it was shadowed for 70/71 by the duplicate case.

I have everything needed. Here is my verdict.

---

VERDICT: PASS

summary: The fix removes the erroneous `case 70: st.units="inch"` / `case 71: st.units="mm"` mapping in the Okuma MIN parser's G-code switch (MINFileParserEngine.ts:168-169 are now the only units writers, G20/G21). On Okuma OSP lathes G70/G71/G72 are LAP turning cycles, so the removed lines silently corrupted `header.units` to "mm" on every roughing-cycle block — a genuine 25.4x scale hazard. The change is safety-positive, narrowly scoped, leaves canned-cycle detection intact via the independent `cannedForOp` scan, and ships two real failing-pre-fix regression oracles. All five verification points confirmed in code.

findings:
  - none

Audit trail (what I verified, with citations):

1. **Units detection not broken** — VERIFIED. After the fix, the only writes to `st.units` are `case 20: st.units="inch"` and `case 21: st.units="mm"` (`H:/prism/mcp-server/src/engines/MINFileParserEngine.ts:168-169`); `grep st.units` returns only those two assignments (line 174 is a comment). `unitsFirst` is derived solely from `state.units` at `:424` and surfaced at `header.units` (`:440`). G20/G21 detection is intact.

2. **Safety-positive + no consumer assumes inch/mm** — VERIFIED. Schema permits "unknown": `units: z.enum(["mm","inch","unknown"])` at `H:/prism/mcp-server/src/schemas/minFileSchema.ts:61`, so the post-parse revalidation at `MINFileParserEngine.ts:453` passes. Of the four consumers, th
... [+2648 chars truncated]
