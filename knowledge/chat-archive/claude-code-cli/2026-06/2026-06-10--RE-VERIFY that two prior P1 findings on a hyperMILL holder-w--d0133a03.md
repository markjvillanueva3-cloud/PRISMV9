---
type: "chat-session"
source: "claude-code-cli"
session_id: "d0133a03-9407-4bcc-9878-1b260a7a56cb"
title: "RE-VERIFY that two prior P1 findings on a hyperMILL holder-wire change (slot:rom"
date: "2026-06-10"
first_ts: "2026-06-10T00:12:18.523Z"
last_ts: "2026-06-10T00:18:17.042Z"
cwd: "H:\\prism\\mcp-server"
messages: 60
user_msgs: 21
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/d0133a03-9407-4bcc-9878-1b260a7a56cb/subagents/agent-a66e791f27e8a4d9a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# RE-VERIFY that two prior P1 findings on a hyperMILL holder-wire change (slot:rom

> **claude-code-cli** | 2026-06-10 | 60 msgs (21 user / 39 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/d0133a03-9407-4bcc-9878-1b260a7a56cb/subagents/agent-a66e791f27e8a4d9a.jsonl`

## Transcript

### User | 2026-06-10T00:12:18.523Z

RE-VERIFY that two prior P1 findings on a hyperMILL holder-wire change (slot:romeo) are now CLOSED, and check the FIX introduced no new defect. Read each file end-to-end.

FILES (Windows repo H:/prism):
1. mcp-server/src/engines/HyperMillToolExportEngine.ts -- modified `buildNCTool` (search for it).
2. mcp-server/src/__tests__/CamToolExportFullCatalog.test.ts -- new test "hypermill_tool_export puts a REAL holder (bracketed brand + sane tool_length) on the NCTools row".

PRIOR FINDING P1-A (units/silent-drop): `tool_length = Math.max(oal - gageLen, 10)` was clamping to 10mm because gageLen had been replaced by the large real holder gauge. THE FIX: `toolLen` is now `Math.max(oal - fallbackGage, 10)` where fallbackGage is the tool-scaled diameter gauge (50-100mm), computed BEFORE and INDEPENDENT of holder selection; the real holder gauge goes only into `gageLen = realHolder.gaugeMm + toolLen` (the gage_length column). VERIFY: (a) tool_length can no longer be corrupted by a large holder gauge for any tool size; (b) gage_length = gaugeMm + toolLen is the dimensionally-correct spindle-face-to-tip (holder projection + stickout) and is sane (always > toolLen); (c) the no-holder-match path reproduces the ORIGINAL behavior exactly (gageLen=fallbackGage, toolLen=oal-fallbackGage); (d) `usable` now reads the fixed toolLen.

PRIOR FINDING P1-B (test tautology + flakiness): old test did sql.includes("HAIMER") over ALL inserts -> passed even on revert (HAIMER-branded TOOLS leak into Tools rows) and was flaky on catalog ordering. THE FIX: a deterministic single synthetic tool (non-brand manufacturer, shank 6.35 + CAT40) asserting a BRACKETED brand inside an NCTools INSERT + parsed tool_length>10 + gage>toolLength. VERIFY: (a) the test fails on wire revert; (b) it is hermetic/deterministic (no catalog-ordering dependence); (c) the regex tail-parse `/([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\);?\s*$/` correctly extracts gage_length, tool_length, usable_length, preset_diameter from
... [+316 chars truncated]

### Assistant | 2026-06-10T00:12:21.784Z

I'll re-verify both prior P1 findings are closed and check for new defects. Let me read both files end-to-end.

### Assistant | 2026-06-10T00:12:22.271Z

[tool_use: Read]

### Assistant | 2026-06-10T00:12:22.942Z

[tool_use: Read]

### User | 2026-06-10T00:12:23.534Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\HyperMillToolExportEngine.ts' was already read 0s ago in this session and is unchanged (mtime 1781050173414). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-10T00:12:26.230Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\CamToolExportFullCatalog.test.ts' was already read 1s ago in this session and is unchanged (mtime 1781050211109). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### Assistant | 2026-06-10T00:12:28.639Z

The read-once-guard claims these were read, but I don't have the content in my context. Let me bypass the cache to get the actual content.

### Assistant | 2026-06-10T00:12:29.271Z

[tool_use: Bash]

### User | 2026-06-10T00:12:47.936Z

[tool_result] cache disabled marker

### Assistant | 2026-06-10T00:12:51.057Z

The guard is a false-positive (the files were not actually read in my context). Let me read them with the cache disabled via env, but the Read tool itself doesn't take that. Let me read a specific portion using offset/limit to bypass the whole-file guard, starting with the full file via grep to find structure.

### Assistant | 2026-06-10T00:12:51.745Z

[tool_use: Read]

### User | 2026-06-10T00:12:53.956Z

[tool_result] 1	/**
2	 * HyperMillToolExportEngine — Export PRISM Tool Catalog to hyperMILL Tool Database Format (E1127)
3	 *
4	 * Exports PRISM's 95K+ tool catalog to hyperMILL's SQLite-based tool database
5	 * format (.hmt). Generates the full 3-tier hierarchy:
6	 *   Tools (geometry definition) → NCTools (assembled tool with holder) → DepotItems (magazine slot)
7	 *
8	 * Supports 29 hyperMILL geometry classe
... [+46461 chars truncated]

### Assistant | 2026-06-10T00:12:55.931Z

Now I have the engine file. Let me read the test file.

### Assistant | 2026-06-10T00:12:56.975Z

[tool_use: Read]

### User | 2026-06-10T00:12:58.417Z

[tool_result] 1	/**
2	 * CamToolExportFullCatalog -- CATALOG-APP-WIRING-MS0/U-CAM-TOOL-FULL-CATALOG (slot:romeo).
3	 *
4	 * Regression guard for the 5000-cap bug: HyperMillToolExportEngine + MastercamToolExportEngine
5	 * silently capped their catalog query at max_results:5000, so a "full catalog" tool export to
6	 * hyperMILL/Mastercam dropped ~93% of the ~74K-tool catalog. The fix raises the default ceiling
7
... [+7647 chars truncated]

### Assistant | 2026-06-10T00:13:00.857Z

Both files are fully read. Now let me verify the `holderSelectionEngine.select` contract and the `gaugeMm` field to confirm my analysis of the fix.

### Assistant | 2026-06-10T00:13:02.504Z

[tool_use: Grep]

### User | 2026-06-10T00:13:04.252Z

[tool_result] 46:  gaugeMm: number | null;
95:        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,
112:        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,
131:        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,
156:   * (3) shortest gauge length (more rigid). Deterministic tie-break by designation.
158:  s
... [+177 chars truncated]

### Assistant | 2026-06-10T00:13:07.167Z

Let me confirm the `HolderRecord` structure and verify the `select` returns `brand`, `designation`, and `gaugeMm` fields used in the fix.

### Assistant | 2026-06-10T00:13:07.744Z

[tool_use: Read]

### User | 2026-06-10T00:13:09.166Z

[tool_result] 40	  boreMinMm: number;
41	  /** Largest clamping bore (mm). */
42	  boreMaxMm: number;
43	  /** Holder body diameter (mm) if known. */
44	  bodyDiaMm: number | null;
45	  /** Gauge length (mm) if known. */
46	  gaugeMm: number | null;
47	  /** Overall length (mm) if known. */
48	  overallMm: number | null;
49	  /** Source data module. */
50	  source: string;
51	}
52	
53	export interface HolderSel
... [+6339 chars truncated]

### Assistant | 2026-06-10T00:13:12.879Z

The `HolderRecord` contract is confirmed: `brand`, `designation`, `gaugeMm` (number|null) are real fields, and `select()` returns `HolderRecord | null`. Now let me verify the test's deterministic claim — that a GUHRING 6.35mm CAT40 hydraulic/shrink_fit holder actually exists in the catalog, and that its gaugeMm is a number (so the gageLen branch is exercised). Let me check the catalog data and the dispatcher round-trip.

### Assistant | 2026-06-10T00:13:15.329Z

[tool_use: Bash]

### User | 2026-06-10T00:13:20.859Z

[tool_result] ---FILES---
big-daishowa-holder-extracted.json
big-daishowa-holders.ts
guhring-holder-catalog.ts
guhring-holders-extracted.json
haimer-holder-catalog.ts
haimer-holders-extracted.json
holder-categorization.ts
osg-holder-extracted.json
regofix-holder-catalog.ts
seco-toolholders-catalog.ts
tungaloy-holder-catalog.ts
unknown-holder-extracted.json

### Assistant | 2026-06-10T00:13:23.253Z

Let me check the imports in HolderSelectionEngine and confirm the GUHRING catalog has a 6.35mm CAT40 holder with a numeric gauge.

### Assistant | 2026-06-10T00:13:24.723Z

[tool_use: Bash]

### User | 2026-06-10T00:13:33.014Z

[tool_result] 9: *   - HAIMER_HOLDERS      (489: shrink_fit / weldon / hydraulic)
10: *   - GUHRING_HOLDERS     (hydraulic, by series)
11: *   - BIG_DAISHOWA_HOLDERS (shrink_fit / hydraulic / milling_chuck / collet_chuck / power_chuck / side_lock)
23:import { HAIMER_HOLDERS } from "../data/haimer-holder-catalog.js";
24:import { GUHRING_HOLDERS } from "../data/guhring-holder-catalog.js";
25:import { BIG_DAISHOWA
... [+233 chars truncated]

### Assistant | 2026-06-10T00:13:37.103Z

[tool_use: Bash]

### User | 2026-06-10T00:13:43.411Z

[tool_result] 17:  {designation:"GUH-4216-CAT40-6.35",taper:"CAT40",holder_type:"hydraulic",series:"4216",bore_diameter_mm:6.35,body_diameter_mm:26.0,d4_mm:44.5,gauge_length_mm:37.0,overall_length_mm:64.0},
21:  {designation:"GUH-4216-CAT50-6.35",taper:"CAT50",holder_type:"hydraulic",series:"4216",bore_diameter_mm:6.35,body_diameter_mm:26.0,d4_mm:69.9,gauge_length_mm:37.0,overall_length_mm:81.0},
26:  {designat
... [+500 chars truncated]

### Assistant | 2026-06-10T00:13:47.826Z

Confirmed. There are real CAT40 6.35mm GUHRING hydraulic holders with `gauge_length_mm: 37.0` and `36.0` (numeric, non-null). The test's deterministic claim holds. The selected holder for shank 6.35 + CAT40 + `typePreference: "shrink_fit"` (since shankD ≤ 12) — note no shrink_fit holder at 6.35 exact bore may exist, but hydraulic candidates exist via range fit. Let me verify the actual selected holder by running the engine directly to confirm gaugeMm is numeric and the math works out as the test asserts.

### Assistant | 2026-06-10T00:13:51.002Z

[tool_use: Bash]

### User | 2026-06-10T00:14:02.189Z

[tool_result] skip-inline
17:  {designation:"GUH-4216-CAT40-6.35",taper:"CAT40",holder_type:"hydraulic",series:"4216",bore_diameter_mm:6.35,body_diameter_mm:26.0,d4_mm:44.5,gauge_length_mm:37.0,overall_length_mm:64.0},
26:  {designation:"GUH-4764-CAT40-6.35",taper:"CAT40",holder_type:"hydraulic",series:"4764",bore_diameter_mm:6.35,body_diameter_mm:21.0,d4_mm:27.0,gauge_length_mm:36.0,overall_length_mm:80.0},

### Assistant | 2026-06-10T00:14:05.551Z

Now let me run the actual test through vitest to confirm it passes (the authoritative live verification), rather than rely on hand-tracing. I'll run just this one test file's HOLDER-WIRE-HYPERMILL case.

### Assistant | 2026-06-10T00:14:06.867Z

[tool_use: Bash]

### User | 2026-06-10T00:14:50.720Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

stderr | src/__tests__/CamToolExportFullCatalog.test.ts > CAM tool export -- 5000-cap lifted (full catalog through prism_cam) > hypermill_tool_export puts a REAL holder (bracketed brand + sane tool_length) on the NCTools row (through prism_cam)
[INFO] [prism_cam] Action: hypermill_tool_export

 ✓ src/__tests__/CamToolExportFullCatalog.test.ts (9 tests | 8 skipped)
... [+183 chars truncated]

### Assistant | 2026-06-10T00:14:58.525Z

The HOLDER-WIRE-HYPERMILL test passes. Now let me verify P1-B's claim that the test FAILS on wire revert (revert-sensitivity). I'll temporarily simulate the revert by checking what `buildNCTool` would produce WITHOUT the holder wire, by tracing the values, then verify the regex parse robustness against `fmt()` output. Let me trace the exact NCTools INSERT for the synthetic tool to confirm column alignment and the nc_name anchor concern.

The test asserts the regex tail `/([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\);?\s*$/` extracts the last 4 numbers. Let me verify the `ncToolInsert` VALUES ordering and that `nc_name` (which contains the bracketed brand + designation like `GUH-4216-CAT40-6.35`) cannot mis-anchor the regex. The nc_name is SQL-quoted via `sq()` and the designation contains digits and dots (`6.35`, `4216`). This is the critical correctness concern. Let me confirm.

### Assistant | 2026-06-10T00:15:12.732Z

[tool_use: Bash]

### User | 2026-06-10T00:15:30.072Z

[tool_result] INSERT:
INSERT INTO NCTools (id, tool_id, nc_number_val, nc_number_str, nc_name, gage_length, tool_length, usable_length, preset_diameter) VALUES (1, 1, 1, '1', 'ZZZ-NOT-A-HOLDER-BRAND TST-635 [GUHRING GUH-4216-CAT40-6.35]', 77.0000, 40.0000, 6.3500, 6.3500);

MATCH: [ '77.0000', '40.0000', '6.3500', '6.3500' ]
gage= 77  toolLen= 40  usable= 6.35  presetDia= 6.35
presetDia~6.35? true
toolLen>10? t
... [+297 chars truncated]

### Assistant | 2026-06-10T00:15:39.337Z

The trace confirms the regex anchoring is robust and the math is correct. Critically, note the nc_name `[GUHRING GUH-4216-CAT40-6.35]` contains digits and dots (`6.35`), but the `$`-anchored regex with `\);?\s*$` correctly forces the match to the trailing VALUES numbers, NOT the nc_name interior — because the nc_name is inside single quotes followed by `,` then four `fmt()` numbers and the closing `);`. The regex backtracks from the end, so the digits inside the quoted nc_name cannot mis-anchor.

Let me confirm one subtle edge: could the regex `([\d.]+)` greedily capture across the `'` boundary? The nc_name closes with `]'` then `, 77.0000`. The first capture group `([\d.]+)` after backtracking from `$` lands on `77.0000`. Let me verify there's no pathological nc_name that ends in a digit-dot sequence that could extend group 1 leftward into the quote. The `,\s*` separators require a comma between captures, and `'` is not `[\d.]`, so a capture group cannot cross the closing quote. Confirmed robust.

Now let me verify the no-holder-match path (P1-A point c) and check `usable` reads the fixed `toolLen` (point d), plus look for any NEW defect. Let me re-examine lines 684-706 carefully and check the `usable` fallback and a subtle issue: when `realHolder.gaugeMm` is null, `gageLen` stays `fallbackGage` but `ncName` still gets the bracket appended.

### Assistant | 2026-06-10T00:15:39.987Z

[tool_use: Read]

### User | 2026-06-10T00:15:43.553Z

[tool_result] 199	  stats(): {
200	    total: number;
201	    byBrand: Record<string, number>;
202	    byType: Record<string, number>;
203	    byTaper: Record<string, number>;
204	  } {
205	    const byBrand: Record<string, number> = {};
206	    const byType: Record<string, number> = {};
207	    const byTaper: Record<string, number> = {};
208	    for (const r of this.all()) {
209	      byBrand[r.brand] = (byBra
... [+309 chars truncated]

### Assistant | 2026-06-10T00:15:49.449Z

Confirmed `holderSelectionEngine` is the exported singleton used in the engine. Now let me carefully analyze each verification point and check for new defects by re-examining the fix logic.

Let me trace the `usable` computation more carefully. At line 685: `usable = toolRow.dbl_param3 > 0 ? toolRow.dbl_param3 : toolLen * 0.5`. Point (d) says "usable now reads the fixed toolLen". Note `usable` reads `dbl_param3` (the shank diameter for endmills) as its PRIMARY source, only falling to `toolLen * 0.5` when `dbl_param3 <= 0`. Let me verify this is intended and whether there's a semantic concern — `usable_length` getting the shank DIAMETER (6.35) rather than a length seems dimensionally odd, but that's pre-existing behavior, not introduced by this fix. Let me confirm via git blame whether the `usable` line changed in this fix.

### Assistant | 2026-06-10T00:15:52.391Z

[tool_use: Bash]

### User | 2026-06-10T00:16:02.221Z

[tool_result] 6064ace7a4 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-TOOL-FULL-CATALOG (slot:romeo): lift the 5000-tool cap on hyperMILL + Mastercam tool exports -> full catalog
98c9f585d7 [MAIN]/U-EFF23: restore 2020 src files from Box canonical
=== DIFF of buildNCTool region vs HEAD ===
diff --git a/mcp-server/src/engines/HyperMillToolExportEngine.ts b/mcp-server/src/engines/HyperMillToolEx
... [+3872 chars truncated]

### Assistant | 2026-06-10T00:16:06.614Z

The diff confirms the exact scope of the fix. The `usable` line is UNCHANGED by this fix (it was `dbl_param3 > 0 ? dbl_param3 : toolLen * 0.5` before and after) — so point (d) "usable now reads the fixed toolLen" is satisfied because `toolLen` is now correct, and `usable` reads it in the fallback branch. The pre-existing `usable = dbl_param3` (shank diameter) oddity is out of scope (not introduced by this fix).

Now let me verify each prior-finding point against the confirmed code, and hunt for NEW defects. Let me check the full test diff too.

### Assistant | 2026-06-10T00:16:07.863Z

[tool_use: Bash]

### User | 2026-06-10T00:16:15.639Z

[tool_result] diff --git a/mcp-server/src/__tests__/CamToolExportFullCatalog.test.ts b/mcp-server/src/__tests__/CamToolExportFullCatalog.test.ts
index 870f6ce115..d8e75966d6 100644
--- a/mcp-server/src/__tests__/CamToolExportFullCatalog.test.ts
+++ b/mcp-server/src/__tests__/CamToolExportFullCatalog.test.ts
@@ -93,4 +93,43 @@ describe("CAM tool export -- 5000-cap lifted (full catalog through prism_cam)",
     c
... [+2796 chars truncated]

### Assistant | 2026-06-10T00:16:19.060Z

The test diff confirms it is purely additive (one new `it` block), so it does not disturb the other tests. Now let me verify the revert-sensitivity claim empirically by actually reverting the engine wire and re-running just this test — the strongest possible proof of P1-B(a).

### Assistant | 2026-06-10T00:16:23.047Z

[tool_use: Bash]

### User | 2026-06-10T00:16:43.014Z

[tool_result] Saved working directory and index state WIP on cad-fusion-live-ms0: 776a0d7476 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GOLF-QUEUE]/U-GOLF-G6-OLLAMA-HEALTH-ARM (slot:golf): native-ollama :11434 Stop-advisory arm
=== engine reverted to HEAD; running new test (expect FAIL) ===
 FAIL  src/__tests__/CamToolExportFullCatalog.test.ts > CAM tool export -- 5000-cap lifted (full catalog through prism_cam) > hyperm
... [+1230 chars truncated]

### Assistant | 2026-06-10T00:16:49.224Z

Revert-sensitivity proven: with the wire reverted to HEAD, the new test FAILS exactly as designed (the reverted output is `'ZZZ-NOT-A-HOLDER-BRAND TST-635', 60.0000, 40.0000, ...` — no bracket, gage=60). This is the empirical proof of P1-B(a). Note also: on revert, `tool_length` is still 40 (>10) and `gage`=60 > 40 — so assertions (b),(c),(d) would have *passed* on revert; ONLY assertion (a) the bracketed-brand catches the revert. That's correct and sufficient — (a) is the load-bearing revert-detector, exactly as the test comment claims.

Now let me restore the fix and confirm the working tree is clean.

### Assistant | 2026-06-10T00:16:52.897Z

[tool_use: Bash]

### User | 2026-06-10T00:16:59.987Z

[tool_result] On branch cad-fusion-live-ms0
Your branch is ahead of 'origin/cad-fusion-live-ms0' by 3038 commits.
  (use "git push" to publish your local commits)

Changes not staged for commit:
=== verify fix restored (holderSelectionEngine import present) ===
2
=== diff identical to backup? ===
RESTORED-OK

### Assistant | 2026-06-10T00:17:12.671Z

Fix restored byte-identical. Now let me hunt for NEW defects introduced by the fix. Key areas to scrutinize:

1. **Performance regression**: `buildNCTool` now calls `holderSelectionEngine.select()` for EVERY tool. On the full-catalog path (~74K tools), `select()` calls `this.all()` (cached after first) then filters + sorts all candidates per call. Let me verify `all()` is cached (it is — `if (this._records) return this._records`), so no per-call rebuild. But the filter+sort runs per tool. Let me check the full-catalog test still passes within timeout (it ran in the earlier full run). Let me run the whole file.

2. **`spindle_taper` default to CAT40** when absent — means EVERY tool gets a holder attempt. For tools whose real shank doesn't fit any CAT40 holder, `select()` returns null → fallback retained. Fine.

3. **nc_name truncation at 127 chars**: appending `[BRAND DESIGNATION]` could push nc_name past 127, truncating the bracket and potentially producing an unterminated `[...` — could that break the bracket-match regex for legit tools, or worse, corrupt SQL? The `sq()` escaping handles quotes, but a truncated `[GUHRING GUH-421` (no closing `]`) is still valid SQL (just a quoted string). Not a SQL-injection/syntax risk. But it could make the brand-bracket assertion miss for long names. Let me check.

Let me run the full test file and examine the truncation edge.

### Assistant | 2026-06-10T00:17:13.156Z

[tool_use: Bash]

### User | 2026-06-10T00:17:32.170Z

[tool_result] stderr | src/__tests__/CamToolExportFullCatalog.test.ts > CAM tool export -- 5000-cap lifted (full catalog through prism_cam) > mastercam_tool_export (no filter) exports > 5000 tools -- not the old silent cap
[INFO] [prism_cam] Action: mastercam_tool_export

stderr | src/__tests__/CamToolExportFullCatalog.test.ts > CAM tool export -- 5000-cap lifted (full catalog through prism_cam) > mastercam_too
... [+1862 chars truncated]

### Assistant | 2026-06-10T00:17:44.542Z

All 9 tests pass, including the heavy full-catalog hyperMILL export (828ms for ~74K tools through the new per-tool `select()` call) — no performance regression, no timeout. The per-call filter/sort over the cached holder list (a few hundred records) is cheap relative to the 74K-tool loop.

Now let me close out the remaining new-defect concerns with targeted analysis:

**Concern: nc_name 127-char truncation after appending bracket.** Let me verify the bracket appended to a long tool name doesn't create a SQL hazard. The truncation happens AFTER `sq()`-escaping? No — order is: `ncName.substring(0,127)` first (line 712), THEN `sq()` in `ncToolInsert`. So escaping happens on the already-truncated string — quotes are still escaped correctly even if a `'` survives truncation. No SQL-injection. A truncated unterminated `[BRAND` is harmless (still a quoted string literal). This is cosmetic-only, not a defect — and identical truncation-after-append behavior to the pre-existing `toolRow.name.substring(0,127)`. No regression.

**Concern: `gaugeMm` null branch.** When `realHolder` exists but `gaugeMm == null`, `gageLen` stays `fallbackGage` but the bracket is still appended. Then `gage_length = fallbackGage` while `tool_length = oal - fallbackGage`. Since `fallbackGage > oal - fallbackGage` iff `2*fallbackGage > oal`. For a long tool (oal=300, fallbackGage=100), `gage=100, toolLen=200` → gage < toolLen, violating the "gage should be spindle-face-to-tip > stickout" invariant. But this is the SAME as the no-holder fallback path and the original behavior — not introduced by the fix. The fix only IMPROVES gage when gaugeMm is present. Not a new defect.

Let me do a final dimensional sanity check on point (b): is `gage_length = gaugeMm + toolLen` the correct spindle-face-to-tip? Let me confirm the semantic via the schema comment.

### Assistant | 2026-06-10T00:17:46.145Z

[tool_use: Grep]

### User | 2026-06-10T00:17:47.628Z

[tool_result] 95:        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,
112:        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,
131:        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,

### Assistant | 2026-06-10T00:18:17.042Z

The holder `gauge_length_mm` is the holder's own spindle-face-to-gauge-point projection (a holder catalog spec). The engine's NCTools `gage_length` is documented (schema info line 1048) as "Gauge length (spindle face to tool tip), mm" and `tool_length` (line 1049) as "Tool stickout from holder gauge point". So `gage_length = holder projection (gaugeMm) + tool stickout (toolLen)` is dimensionally correct spindle-face-to-tip. Confirmed for point (b) — and it is always `> toolLen` whenever `gaugeMm > 0` (all real catalog gauges are 36-200mm, strictly positive), satisfying the test's `gage > toolLength` assertion robustly.

I have everything needed. Let me record the verification verdict against each point.

## Verification Summary

I read both files end-to-end, confirmed the `HolderSelectionEngine` contract (`brand`/`designation`/`gaugeMm` fields, `select()` returning `HolderRecord | null`), traced the exact NCTools INSERT, ran the live test suite, and empirically proved revert-sensitivity by stashing the engine wire.

### PRIOR FINDING P1-A (units/silent-drop) — CLOSED
- **(a) tool_length can no longer be corrupted by a large holder gauge:** CONFIRMED. `toolLen = Math.max(oal - fallbackGage, 10)` (line 684) where `fallbackGage` (50-100mm, line 677) is computed from diameter BEFORE and INDEPENDENT of `holderSelectionEngine.select()` (lines 698-702). The real holder gauge flows ONLY into `gageLen = realHolder.gaugeMm + toolLen` (line 704). `toolLen` never reads `realHolder.gaugeMm`. For any tool size the holder gauge cannot reach the stickout computation.
- **(b) gage_length = gaugeMm + toolLen is dimensionally correct and sane:** CONFIRMED. Holder `gaugeMm` = spindle-face-to-gauge-point projection; `toolLen` = stickout past that point; sum = spindle-face-to-tip, matching the schema doc (lines 1048-1049). All real catalog gauges are strictly positive (36-200mm), so `gage_length > tool_length` always holds when a holder with a numeric gauge is selected. Live trace: gage=
... [+3379 chars truncated]
