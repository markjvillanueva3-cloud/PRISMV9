---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "Independent integrity review (arm B) of a single calibration edit to PRISM's SFC"
date: "2026-06-19"
first_ts: "2026-06-19T16:43:19.154Z"
last_ts: "2026-06-19T16:44:50.159Z"
cwd: "H:\\prism\\mcp-server"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/agent-ac2b0e74ca64d2efc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Independent integrity review (arm B) of a single calibration edit to PRISM's SFC

> **claude-code-cli** | 2026-06-19 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/agent-ac2b0e74ca64d2efc.jsonl`

## Transcript

### User | 2026-06-19T16:43:19.154Z

Independent integrity review (arm B) of a single calibration edit to PRISM's SFC engine.

FILE: H:/prism/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
The ONLY intended change is line ~737: the `P_milling_roughing` entry's `vc` array changed from `[90, 140, 185]` to `[100, 160, 220]`. Nothing else should have changed.

Run `git -C H:/prism diff -- mcp-server/src/engines/UltimateSpeedFeedEngine.ts` and verify:
1. The diff is EXACTLY that one-line `vc` change — no collateral edits, no other table rows touched, no whitespace/alignment regressions in the surrounding aligned grid.
2. No test was weakened/skipped and no assertion softened (this file is the engine, not the test — but confirm the edit doesn't alter any logic, only the data literal).
3. The change is to a DATA literal in a const lookup table, not to any control flow or formula.
4. Convention conformance: the row still matches the alignment/format of sibling rows (P_milling_semi_finishing etc.).

Note: the test suites `src/__tests__/UltimateSpeedFeedEngine.test.ts` + `.variability.test.ts` already pass 157/157 with this change applied. Report any silent-breakage or regression risk you see. Grade PASS or FAIL with file:line citations and any P0/P1 findings.

### Assistant | 2026-06-19T16:43:21.953Z

I'll start by examining the actual diff to verify the claim that only one line changed.

### Assistant | 2026-06-19T16:43:22.603Z

[tool_use: Bash]

### User | 2026-06-19T16:43:28.127Z

[tool_result] diff --git a/mcp-server/src/engines/UltimateSpeedFeedEngine.ts b/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
index f78ddfc1fa..755d42acd3 100644
--- a/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
+++ b/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
@@ -734,7 +734,7 @@ type DataKey = `${ISOGroup}_${string}_${CutType}`;
 
 const CUTTING_PARAMS: Record<string, CuttingParams> = {
   // ─
... [+839 chars truncated]

### Assistant | 2026-06-19T16:43:34.060Z

The diff confirms exactly one line changed. Now let me verify the surrounding context and the change for correctness. I need to investigate several things in parallel: whether this `vc` shift creates any silent ordering/monotonicity issues with sibling rows, whether anything downstream hardcodes or depends on the old `[90,140,185]` values, and whether the change has integration implications.

### Assistant | 2026-06-19T16:43:35.470Z

[tool_use: Read]

### Assistant | 2026-06-19T16:43:36.820Z

[tool_use: Grep]

### User | 2026-06-19T16:43:36.977Z

[tool_result] 730	  coatings: string[];
731	}
732	
733	type DataKey = `${ISOGroup}_${string}_${CutType}`;
734	
735	const CUTTING_PARAMS: Record<string, CuttingParams> = {
736	  // ── P: Steel ──
737	  P_milling_roughing:       { vc: [100, 160, 220], fz: [0.08, 0.13, 0.18], ap: [3, 8, 15], ae_pct: [25, 40, 65], coolant: "flood", coatings: ["AlTiN", "TiAlN"] },
738	  P_milling_semi_finishing: { vc: [110, 155, 200
... [+2742 chars truncated]

### User | 2026-06-19T16:43:38.862Z

[tool_result] 446:    iso_group: "P", aliases: ["4140", "4340", "8620", "4130"],
647:  "P1.5": { kc1: 2140, hardness_hb: 225, description: "Cast steel (unalloyed)" },
691:  "S4.2": { kc1: 1400, hardness_hb: 320, description: "Alpha/near-alpha Ti alloys" },
692:  "S4.3": { kc1: 1400, hardness_hb: 352, description: "Alpha-beta Ti (Ti-6Al-4V)" },
693:  "S4.4": { kc1: 1400, hardness_hb: 370, description: "Beta Ti a
... [+1049 chars truncated]

### Assistant | 2026-06-19T16:43:46.784Z

The diff is clean — exactly one line. Now I'll trace the blast radius. The `vc` value for `P_milling_roughing` is the canonical cutting-speed lookup. I need to verify: (1) nothing downstream asserts the old `[90,140,185]` values, (2) the change doesn't break any monotonicity/ordering invariant the engine relies on, (3) the lookup mechanism reads this purely as data.

Let me check how `CUTTING_PARAMS` is consumed and whether any test or other file hardcodes the old values.

### Assistant | 2026-06-19T16:43:47.165Z

[tool_use: Grep]

### Assistant | 2026-06-19T16:43:47.484Z

[tool_use: Grep]

### User | 2026-06-19T16:43:48.574Z

[tool_result] dev\null:143474:      P_milling_roughing: { vc: [90, 140, 185], fz: [0.08, 0.13, 0.18], ap: [3, 8, 15], ae_pct: [25, 40, 65], coolant: "flood", coatings: ["AlTiN", "TiAlN"] },
src\engines\CuttingDataLookupEngine.ts:125:  P_milling_roughing: {
src\engines\UltimateSpeedFeedEngine.ts:737:  P_milling_roughing:       { vc: [100, 160, 220], fz: [0.08, 0.13, 0.18], ap: [3, 8, 15], ae_pct: [25, 40, 65], c
... [+244 chars truncated]

### User | 2026-06-19T16:43:49.558Z

[tool_result] dev\null:143123:var MATERIAL_DB3, CANONICAL_KEY_MAP, MATERIAL_ALIASES2, CUTTING_PARAMS, DIAMETER_FZ_SCALE, CHIP_THIN_TABLE, STRATEGY_MODS, COATING_TEMP_LIMIT, WEAR_COEFFICIENTS, BUE_SPEED_THRESHOLDS, REFERENCE_SCE, GRADE_THERMAL, JC_MATERIALS, UltimateSpeedFeedEngine, ultimateSpeedFeedEngine;
dev\null:143472:    CUTTING_PARAMS = {
dev\null:143751:        const baseParams = CUTTING_PARAMS[dataKey] 
... [+3901 chars truncated]

### Assistant | 2026-06-19T16:43:55.676Z

Key findings so far:
- The only live source reference to the old `[90, 140, 185]` literal is in `dev/null` (the esbuild bundle artifact — stale, not a source file).
- There is a SEPARATE `CuttingDataLookupEngine.ts:125` that has its own `P_milling_roughing` entry — I need to check whether these two tables are supposed to stay in sync (drift risk #5: integration coupling).
- `FusionToolExportEngine.test.ts:160` has a comment referencing a specific `CUTTING_PARAMS` Vc value (K-group). I need to check if any test asserts the P-group milling roughing Vc.

Let me look at the consumption path in the engine (how `vc` is read), the sibling `CuttingDataLookupEngine` P_milling_roughing values, and the FusionToolExport test comment.

### Assistant | 2026-06-19T16:43:57.127Z

[tool_use: Read]

### Assistant | 2026-06-19T16:43:58.056Z

[tool_use: Read]

### User | 2026-06-19T16:43:58.097Z

[tool_result] 1950	   * fz is diameter-scaled from the 12 mm reference via DIAMETER_FZ_SCALE; ap is
1951	   * the balanced reference depth (mm); ae is ae_pct × diameter. For milling fz
1952	   * is feed-per-tooth; for single-point ops (drilling) the table value is
1953	   * feed-per-rev (callers divide by flute count if they apply ×flutes). Rows
1954	   * fall back milling-cut→roughing→P-group→P_milling_roughin
... [+2796 chars truncated]

### Assistant | 2026-06-19T16:43:58.554Z

[tool_use: Read]

### User | 2026-06-19T16:43:59.309Z

[tool_result] 110	
111	interface CuttingRow {
112	  vc_sfm: [number, number, number]; // low, rec, high
113	  fz_ipt: [number, number, number]; // low, rec, high (varies by dia, base = 1/2" endmill)
114	  ap_mm: [number, number, number];  // low, rec, high
115	  ae_pct: [number, number, number]; // low, rec, high
116	  coolant: "flood" | "mist" | "air_blast" | "dry" | "mql";
117	  coatings: string[];
118	  note
... [+1409 chars truncated]

### User | 2026-06-19T16:43:59.677Z

[tool_result] 150	      expect(P.n).toBeGreaterThan(S.n);
151	      // Hardened tool steel (H) runs slower than annealed carbon steel (P).
152	      expect(H.n).toBeLessThan(P.n);
153	    });
154	
155	    it("aluminum takes a larger chip load (fz) than superalloy", () => {
156	      expect(byIso("Aluminum").f_n).toBeGreaterThan(byIso("Superalloy").f_n);
157	    });
158	
159	    it("sources from the SFC table, n
... [+1010 chars truncated]

### Assistant | 2026-06-19T16:44:09.366Z

Important integration findings. Let me analyze:

1. **`CuttingDataLookupEngine.ts:125`** is a SEPARATE table (`CUTTING_DATA`, in SFM units) — its `P_milling_roughing` is `vc_sfm: [300, 450, 600]`. Converting: 450 SFM ÷ 3.28084 ≈ 137 m/min. The edited engine table now has balanced Vc = 160 m/min (was 140). These two tables are NOT kept algebraically in sync and serve different engines, so the divergence is pre-existing, not introduced by this edit. Not a regression from this diff, but worth noting as a latent drift.

2. **`FusionToolExportEngine.test.ts:159-172`** — This test pins the **K-group** (Cast Iron) Vc to the 155-190 window. The K-group row was NOT touched by this diff (K_milling_roughing Vc[1]=170, unchanged). So this test is unaffected. But this test demonstrates the pattern: `FusionToolExportEngine` reads `CUTTING_PARAMS` via the SFC path. I need to confirm no test pins the **P-group** milling-roughing balanced Vc to the old 140.

The consumption path at line 1987 reads `row.vc[1]` (balanced index 1) — the changed value 140→160. The engine uses it purely as a data lookup that flows into derived RPM/SFM. Let me check for any test that asserts a P-group milling Vc≈140 or back-computes from it, and verify the FusionToolExport "every ISO preset" test doesn't have a hardcoded P expectation.

### Assistant | 2026-06-19T16:44:10.794Z

[tool_use: Read]

### User | 2026-06-19T16:44:11.823Z

[tool_result] 174	    it("every ISO preset back-computes to a real surface speed + sane feed", () => {
175	      const dc = lib.tools[0].geometry.DC;
176	      for (const p of presets) {
177	        // Vc = n·π·Dc/1000. The preset RPM, with the tool's own diameter, must
178	        // land in a real machining band (superalloy ~25 → aluminum finishing
179	        // ~915 m/min) — a diameter-independent physics i
... [+705 chars truncated]

### Assistant | 2026-06-19T16:44:13.175Z

[tool_use: Grep]

### User | 2026-06-19T16:44:14.738Z

[tool_result] 160:        material: "4140 steel",

### Assistant | 2026-06-19T16:44:15.052Z

[tool_use: Grep]

### User | 2026-06-19T16:44:16.032Z

[tool_result] No matches found

### Assistant | 2026-06-19T16:44:25.396Z

The test evidence confirms the safety of the change:

1. **`UltimateSpeedFeedEngine.test.ts`** — the only `140`-region match is `material: "4140 steel"` (a material name string, not a Vc assertion). No test pins the P-group milling-roughing balanced Vc to the old 140.

2. **`UltimateSpeedFeedEngine.variability.test.ts`** — zero matches for any of the old/new boundary values (90/140/185) or `lookupCuttingData`. The variability suite asserts band invariants, not specific literals.

3. **`FusionToolExportEngine.test.ts:174-192`** — the "every ISO preset" test uses **band invariants** (`vc > 10 && vc < 1500`). The new balanced 160 m/min (and high 220) sits comfortably inside this band, as did the old 140/185. No regression. The K-group pin test (line 159) is on an untouched row.

The consumption path (`lookupCuttingData` line 1987: `row.vc[1] * vcDerate`) reads the data literal purely as a lookup — no control flow or formula touched. The change widens the P-group steel roughing speed band from [90,140,185] to [100,160,220], which keeps monotonic ascending order (100<160<220) — preserving any low/balanced/high ordering invariant.

Let me do a final blast-radius check: confirm no other test file or snapshot anywhere in the repo pins these exact P-group values, and verify the full git status shows no other unexpected staged changes to this file's vicinity.

### Assistant | 2026-06-19T16:44:27.276Z

[tool_use: Grep]

### Assistant | 2026-06-19T16:44:28.265Z

[tool_use: Bash]

### User | 2026-06-19T16:44:28.327Z

[tool_result] No matches found

### User | 2026-06-19T16:44:32.245Z

[tool_result]  mcp-server/src/engines/UltimateSpeedFeedEngine.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
---NUMSTAT---
1	1	mcp-server/src/engines/UltimateSpeedFeedEngine.ts

### Assistant | 2026-06-19T16:44:50.159Z

All checks complete. The `git diff --numstat` confirms exactly `1 insertion / 1 deletion` — one line changed, no collateral edits. No test file anywhere in `src` pins the old `[90, 140, 185]` P-group values.

## Verdict

VERDICT: PASS

summary: The diff is exactly the intended one-line `vc` change to the `P_milling_roughing` data literal in the `CUTTING_PARAMS` const lookup table (`UltimateSpeedFeedEngine.ts:737`), `[90, 140, 185]` → `[100, 160, 220]`. `git diff --numstat` confirms 1 insertion / 1 deletion with zero collateral edits. The value is consumed purely as a data lookup (`lookupCuttingData:1987` reads `row.vc[1]`), no control flow or formula touched, monotonic ascending order preserved, and no test in the repo pins the old or new P-group values — all suites assert band invariants that both old and new values satisfy.

findings: none

Audited consumers / edge-paths traced (for auditability):
- **`UltimateSpeedFeedEngine.ts:737`** — the single changed line; surrounding aligned grid rows (`P_milling_semi_finishing:738`, `P_milling_finishing:739`, etc.) are byte-identical and column alignment is preserved (the `[100, 160, 220]` is the same character width as `[90, 140, 185]`... actually one char wider, but the row content following it remains and the diff shows no realignment of sibling rows — alignment of THIS row's trailing fields is internal and unchanged).
- **`UltimateSpeedFeedEngine.ts:1987`** (`lookupCuttingData`) — the consumer reads `row.vc[1]` (balanced index, 140→160) and `row.vc` low/high via the band; data-only, no logic change.
- **`UltimateSpeedFeedEngine.test.ts`** — only `140`-region hit is the string `"4140 steel"`; no Vc assertion on P-group milling roughing.
- **`UltimateSpeedFeedEngine.variability.test.ts`** — no references to 90/140/185 or `lookupCuttingData`; band-invariant assertions unaffected.
- **`FusionToolExportEngine.test.ts:159-192`** — the SFC-path consumer; its specific pin is on the untouched K-group (Vc≈170, line 160), and its
... [+1035 chars truncated]
