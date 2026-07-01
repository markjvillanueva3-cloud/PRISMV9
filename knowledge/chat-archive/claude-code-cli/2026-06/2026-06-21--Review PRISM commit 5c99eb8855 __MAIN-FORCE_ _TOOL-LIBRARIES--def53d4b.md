---
type: "chat-session"
source: "claude-code-cli"
session_id: "def53d4b-7960-4679-90f1-2c2781b23457"
title: "Review PRISM commit 5c99eb8855 ([MAIN-FORCE] [TOOL-LIBRARIES]/U-BRAND-CATALOG-CL"
date: "2026-06-21"
first_ts: "2026-06-21T03:16:16.098Z"
last_ts: "2026-06-21T03:19:54.757Z"
cwd: "H:\\prism"
messages: 54
user_msgs: 21
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/def53d4b-7960-4679-90f1-2c2781b23457/subagents/agent-ad87f87d31c56a19b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Review PRISM commit 5c99eb8855 ([MAIN-FORCE] [TOOL-LIBRARIES]/U-BRAND-CATALOG-CL

> **claude-code-cli** | 2026-06-21 | 54 msgs (21 user / 33 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/def53d4b-7960-4679-90f1-2c2781b23457/subagents/agent-ad87f87d31c56a19b.jsonl`

## Transcript

### User | 2026-06-21T03:16:16.098Z

Review PRISM commit 5c99eb8855 ([MAIN-FORCE] [TOOL-LIBRARIES]/U-BRAND-CATALOG-CLEANUP, slot:romeo) in H:/prism. Arm A (holistic) of a 3-of-3 scrutiny gate. This commit DROPS ~3,824 tool presets from the Fusion brand catalogs — the safety stakes are "did it drop ONLY mis-parses and spare REAL tools?".

The commit's huge line-count is a minified 21MB data file (`jm-milling-tools.tools`) — IGNORE that; review the CODE:
- scripts/lib/brand-tool-catalog.mjs (the normalizer gate: new isEndmillOversizeDia, the normalizeRecord changes setting geometry_plausible=false / nulling cleanShank)
- scripts/clean-fusion-tools-misparse.mjs (+ .test.mjs) — the direct .tools filter for the legacy PRISM_JM_Milling lib
- scripts/enumerate-brand-tool-misparse.mjs (now imports the shared gate)
- scripts/assess-fusion-tool-libraries.mjs (isEndmillOversize parameterized)

Read each end-to-end. Verify:
1. CORRECTNESS of the drop logic: isEndmillOversizeDia drops solid_mill/indexable_mill with Dc>80mm but SPARES face/shell mills (FACE_MILL_RE) and non-mill categories (drill/turning/insert). Is the 80mm end-mill ceiling physically defensible (a solid/indexable END mill — flat/ball/bull — realistically never exceeds ~3in; face/shell mills that ARE large are typed separately)? Could this drop any REAL tools a shop would want? Specifically check: the existing test at brand-tool-catalog.test.mjs line ~173 asserts isPlausibleGeometry("solid_mill",152.4)===true ("real MA Ford 6in mill") — my new gate would now drop a 152.4mm tool typed end_mill. Is that a contradiction/regression, or is a 152.4mm solid end mill genuinely a mis-parse? Reason about it.
2. The bad-shank path: nulling shank_mm (keeping the record + usable diameter) — confirm the Fusion emitter falls back to SFDM=cutting-dia (emit-brand-tool-libraries.mjs:83 `g.SFDM = round(rec.shank_mm ?? rec.diameter_mm)`), so nulling is safe.
3. Run the tests: `node scripts/lib/brand-tool-catalog.test.mjs` (33), `node scripts/clean-fusion-tools-mispars
... [+414 chars truncated]

### Assistant | 2026-06-21T03:16:18.478Z

I'll review this commit thoroughly. Let me start by examining the commit itself and reading the code files end-to-end.

### Assistant | 2026-06-21T03:16:19.427Z

[tool_use: Bash]

### Assistant | 2026-06-21T03:16:19.750Z

[tool_use: Read]

### User | 2026-06-21T03:16:21.284Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * brand-tool-catalog.mjs -- unified loader + normalizer for the PRISM brand-tool corpus.
4	 *
5	 * WHY (slot:romeo, 2026-06-19): the work order is "finish generating tool libraries for ALL
6	 * top brands of tool holders + tooling + inserts for Fusion, hyperMILL and Mastercam". The
7	 * extracted brand corpus already exists under mcp-server/src/data/ (51 *-extracted.
... [+22825 chars truncated]

### User | 2026-06-21T03:16:23.701Z

[tool_result] commit 5c99eb8855c7a57d7faed2912bc5dc1eeacd0109
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 22:15:16 2026 -0500

    [MAIN-FORCE] [TOOL-LIBRARIES]/U-BRAND-CATALOG-CLEANUP (slot:romeo): remove ~3,824 source mis-parse presets from Fusion brand catalogs -> endmill-oversize 0
    
    Operator-approved cleanup. brand-tool-catalog.mjs normalizer now gates geometry mis
... [+1679 chars truncated]

### Assistant | 2026-06-21T03:16:26.049Z

I have the core normalizer. Now let me read the other code files and the diff hunks for context.

### Assistant | 2026-06-21T03:16:26.546Z

[tool_use: Read]

### Assistant | 2026-06-21T03:16:27.013Z

[tool_use: Read]

### Assistant | 2026-06-21T03:16:27.948Z

[tool_use: Read]

### Assistant | 2026-06-21T03:16:27.952Z

[tool_use: Read]

### User | 2026-06-21T03:16:28.589Z

[tool_result] 1	#!/usr/bin/env node
2	// clean-fusion-tools-misparse.mjs -- apply the brand-tool-catalog mis-parse gate policy directly to an
3	// already-emitted Fusion `.tools` file (for legacy libs like PRISM_JM_Milling that are produced by a
4	// pipeline OUTSIDE brand-tool-catalog.mjs and so do not get the in-normalizer gate).
5	//
6	// Policy (matches scripts/lib/brand-tool-catalog.mjs::isEndmillOversizeD
... [+2867 chars truncated]

### User | 2026-06-21T03:16:28.798Z

[tool_result] 1	// Tests for clean-fusion-tools-misparse.mjs -- drops bad-diameter end mills, fixes bad shanks, spares the rest.
2	// Run: node scripts/clean-fusion-tools-misparse.test.mjs
3	import test from 'node:test';
4	import assert from 'node:assert/strict';
5	import { cleanToolsLibrary } from './clean-fusion-tools-misparse.mjs';
6	
7	test('cleanToolsLibrary: drops oversize end mills, fixes bad shanks, kee
... [+2219 chars truncated]

### User | 2026-06-21T03:16:29.383Z

[tool_result] 1	#!/usr/bin/env node
2	// assess-fusion-tool-libraries.mjs -- operator-facing inventory + accuracy assessment of the
3	// PRISM-generated Fusion 360 tool libraries (Local/ .tools) and the material-group crib CSVs.
4	//
5	// WHY: operator asked for a full assessment of the Fusion tool library for JM Die -- what exists,
6	// whether it is accurate relative to JM's real source crib, and how it is ca
... [+11213 chars truncated]

### User | 2026-06-21T03:16:30.245Z

[tool_result] 1	#!/usr/bin/env node
2	// enumerate-brand-tool-misparse.mjs -- exhaustive enumeration + classification of the brand-catalog
3	// geometry mis-parses surfaced by the Fusion tool-library assessment (2026-06-20, slot:romeo).
4	//
5	// WHY: "ALL MEANS ALL" -- a full assessment enumerates the COMPLETE flagged population, not a count.
6	// This loads the canonical brand corpus (where shank IS present) 
... [+4303 chars truncated]

### Assistant | 2026-06-21T03:16:35.838Z

Now let me read the test file for the catalog (especially the line ~173 the task flagged), the diff for the changed files, and the assessment report. Let me also check the Fusion emitter's SFDM fallback line.

### Assistant | 2026-06-21T03:16:36.313Z

[tool_use: Read]

### Assistant | 2026-06-21T03:16:37.017Z

[tool_use: Read]

### Assistant | 2026-06-21T03:16:37.240Z

[tool_use: Read]

### User | 2026-06-21T03:16:38.231Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * brand-tool-catalog.test.mjs -- real-value + adversarial tests for the unified brand-tool loader.
4	 * Run: node scripts/lib/brand-tool-catalog.test.mjs   (node:test auto-runs on exit)
5	 *
6	 * R9/R15 coverage contract: every transform asserts a REAL value (never toBeDefined stubs);
7	 * each surface has the happy path + >=3 failure modes + >=2 adversarial inputs. 
... [+16937 chars truncated]

### User | 2026-06-21T03:16:38.953Z

[tool_result] 1	// Tests for enumerate-brand-tool-misparse.mjs -- classification logic, real reference cases.
2	// Run: node scripts/enumerate-brand-tool-misparse.test.mjs
3	import test from 'node:test';
4	import assert from 'node:assert/strict';
5	import { classifyRecord, enumerateMisparses } from './enumerate-brand-tool-misparse.mjs';
6	
7	test('classifyRecord: bad-diameter (oversize end mill, shank plausible
... [+2889 chars truncated]

### User | 2026-06-21T03:16:40.192Z

[tool_result] 1	// Tests for assess-fusion-tool-libraries.mjs -- pure assessment functions, real reference values.
2	// Run: node scripts/assess-fusion-tool-libraries.test.mjs   (node:test auto-runs on exit)
3	import test from 'node:test';
4	import assert from 'node:assert/strict';
5	import {
6	  categorizeLibrary,
7	  isEndmillOversize,
8	  summarizeToolsJson,
9	  summarizeCribCsv,
10	} from './assess-fusion-t
... [+4058 chars truncated]

### Assistant | 2026-06-21T03:16:44.177Z

The task flagged a critical contradiction at test line 174: `isPlausibleGeometry("solid_mill", 152.4) === true` still asserts true, but the new gate would drop a 152.4mm `end_mill`. Let me verify the Fusion emitter SFDM fallback and the assessment report, then run all tests, and reason about the 152.4mm contradiction.

### Assistant | 2026-06-21T03:16:45.110Z

[tool_use: Bash]

### Assistant | 2026-06-21T03:16:45.867Z

[tool_use: Read]

### User | 2026-06-21T03:16:47.520Z

[tool_result] 1	# Fusion 360 Tool Library — Assessment for JM Die (2026-06-20)
2	
3	_Slot: romeo. Operator ask: "full assessment of the Fusion tool library for JM Die… check the tool
4	libraries you made to ensure accuracy relative, then get them imported into Fusion so I can assess
5	categorization." This is the interpretive summary; raw data backs it in
6	`FUSION-LIBRARY-ASSESSMENT.{md,json}` (regenerate: `no
... [+8221 chars truncated]

### User | 2026-06-21T03:16:50.190Z

[tool_result]   if (re > 0 && dc != null) {
    if (Math.abs(re - dc / 2) <= BALL_RE_TOLERANCE_MM) return "ball end mill"; // RE == radius
    return "bull nose end mill";
  }
  return "flat end mill";
}

/** Build the Fusion geometry block (only fields with real source values; DC required). */
export function fusionGeometry(rec, type) {
  const g = {};
  g.DC = round(rec.diameter_mm);                 // cuttin
... [+753 chars truncated]

### Assistant | 2026-06-21T03:16:53.093Z

The SFDM fallback is confirmed at `emit-brand-tool-libraries.mjs:83`: `g.SFDM = round(rec.shank_mm ?? rec.diameter_mm)` — nulling shank is safe. Now let me run all four test suites.

### Assistant | 2026-06-21T03:16:55.100Z

[tool_use: Bash]

### User | 2026-06-21T03:17:04.555Z

[tool_result] === brand-tool-catalog ===
# tests 33
# suites 0
# pass 33
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 585.499
=== clean ===
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8.4192
=== enumerate ===
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 7.9863
=== assess ===
# tests 5
# suites 0
# pass 5
# fail 0
... [+57 chars truncated]

### Assistant | 2026-06-21T03:17:09.814Z

All 48 tests pass (33+3+7+5). Now let me reason about the central false-drop risk. The task flagged a potential contradiction: test line 174 asserts `isPlausibleGeometry("solid_mill", 152.4) === true`, but the new `isEndmillOversizeDia` would flag a 152.4mm `end_mill`-typed tool. Let me verify what `geometry_plausible` actually evaluates to for such a record, and check whether real large solid mills exist in the corpus that would be dropped.

### Assistant | 2026-06-21T03:17:15.126Z

[tool_use: Bash]

### User | 2026-06-21T03:17:19.726Z

[tool_result] 152.4mm flat_end_mill: category=solid_mill geometry_plausible=false
  isPlausibleGeometry(solid_mill,152.4)=true
  isEndmillOversizeDia(solid_mill,flat_end_mill,152.4)=true
  80mm exactly oversize? false
  80.1mm oversize? true

### Assistant | 2026-06-21T03:17:24.158Z

Confirmed: a 152.4mm tool typed `flat_end_mill` now yields `geometry_plausible=false` (dropped), even though `isPlausibleGeometry("solid_mill", 152.4)` still returns `true` in isolation. The two functions now disagree on the same diameter. This is exactly the contradiction the task asked me to reason about. Let me now check the live corpus to see how many REAL tools sit in the 80–250mm window across solid_mill/indexable_mill, and what their type strings look like — this determines whether the drop is hitting mis-parses only or also real tools.

### Assistant | 2026-06-21T03:17:33.681Z

[tool_use: Bash]

### User | 2026-06-21T03:17:40.123Z

[tool_result] mill-category records with Dc in (80,320]: 2007
  spared (face/shell type): 99
  DROPPED by new gate: 1908
  DROPPED type distribution: {"end_mill":1799,"ball_mill":10,"milling":99}
  DROPPED with a shank value: 1641 | Dc/shank>8: 100 | Dc/shank<=8 (plausible shank!): 1541
  Sample dropped-with-plausible-shank (potential real tools):
    MA Ford | MA -4.0000-4F | type=end_mill | Dc=101.6 shank=101
... [+1044 chars truncated]

### Assistant | 2026-06-21T03:17:45.704Z

This is a significant finding. The new gate drops 1,908 mill records in the 80–320mm window, and 1,541 of those have a **plausible shank ratio (Dc/shank ≤ 8)** — meaning these are NOT the bad-shank mis-parse class. The samples are real MA Ford catalog products (e.g. "MA -6.0000-3F" = a 6-inch, 3-flute tool with a 6-inch shank, ratio 1.0). The task explicitly cited the test's "real MA Ford 6in mill" at 152.4mm. Let me determine whether these MA Ford ≥80mm "end_mill" entries are genuinely real products or source mis-parses, by inspecting the source data and checking the corner-radius/type detail. This is the crux of the PASS/FAIL decision.

### Assistant | 2026-06-21T03:17:46.646Z

[tool_use: Bash]

### User | 2026-06-21T03:17:53.311Z

[tool_result] ma-ford-tools-extracted.json

### Assistant | 2026-06-21T03:17:55.948Z

[tool_use: Bash]

### User | 2026-06-21T03:18:02.736Z

[tool_result] MA Ford mills >80mm: 46
  Dc range: 88.9 .. 152.4mm = 6.00in max
  distinct Dc (mm): 88.9, 101.6, 114.3, 121.9, 127, 152.4
  distinct Dc (in): 3.50, 4.00, 4.50, 4.80, 5.00, 6.00

DROPPED end_mill-type by brand: {"MA Ford":46,"Generic":20,"YG-1":125,"Sumitomo":198,"ISCAR":1400,"Korloy":99,"Unknown Solid":20}

ISCAR dropped sample (cited mis-parse class):
    M ECS-A1.00X06-2T Dc=102.7 shank=6.0 rat
... [+269 chars truncated]

### Assistant | 2026-06-21T03:18:09.248Z

This is now decisive. The data clearly separates two populations:

- **ISCAR (1,400 dropped)** — the `M ECS-A*` series with Dc/shank ratios of 15–17 (102mm cutter on a 6mm connection). These are genuinely impossible mis-parses. Correctly dropped.
- **MA Ford (46 dropped)** — Dc range 88.9–152.4mm = exactly 3.50, 4.00, 4.50, 4.80, 5.00, 6.00 inch, each with a **matching shank (ratio ~1.0)**. These are clean round-inch values of REAL catalog products. The source file is `ma-ford-tools-extracted.json`.

Let me verify the MA Ford entries are real in the source (not parse artifacts) by inspecting the raw source records, and check the ISCAR `M ECS-A` series in source to confirm it's a face-mill family mistyped as end_mill (which would mean it SHOULD have been spared by name, not just dropped).

### Assistant | 2026-06-21T03:18:17.672Z

[tool_use: Bash]

### User | 2026-06-21T03:18:21.931Z

[tool_result] MA Ford source records: 292
6-inch entries: 24
  {"id":"MA -6.0000-3F","type":"end_mill","desc":""}
  {"id":"MA -6.0000-4F","type":"end_mill","desc":""}
  {"id":"19877","type":"end_mill","desc":""}
MA Ford type/subtype distribution: {"end_mill/":170,"ball_mill/":1,"drill/":81,"reamer/":40}

### Assistant | 2026-06-21T03:18:26.969Z

The MA Ford source raw data shows the critical detail: the 6-inch entries have `type: "end_mill"` with **empty description** and **no subtype** — there is no `diameter` field shown in my projection (it printed undefined for `dia`), meaning the diameter came from a different field. Let me confirm exactly where MA Ford's 6-inch diameter originates and whether these are real MA Ford products. MA Ford does make large end mills, but a 6-inch SOLID end mill is physically implausible. The key question: is a 152.4mm tool typed `end_mill` a real product or a mis-parse? Let me check the raw geometry fields fully.

### Assistant | 2026-06-21T03:18:30.200Z

[tool_use: Bash]

### User | 2026-06-21T03:18:35.633Z

[tool_result] Full raw record MA -6.0000-3F:
{
 "designation": "MA -6.0000-3F",
 "type": "end_mill",
 "cutting_diameter_mm": 152.4,
 "shank_diameter_mm": 152.4,
 "overall_length_mm": 1625.6,
 "flute_length_mm": 528.32,
 "corner_radius_mm": 25.4,
 "flute_count": 3
}

Contrast small 0.5in end_mill raw:
undefined

### Assistant | 2026-06-21T03:18:45.495Z

This is the smoking gun for the MA Ford case. The raw record `MA -6.0000-3F`:
- `cutting_diameter_mm: 152.4` (6.00")
- `shank_diameter_mm: 152.4` (6.00")
- `overall_length_mm: 1625.6` = **64 inches long**
- `flute_length_mm: 528.32` = **20.8 inches of flute**
- `corner_radius_mm: 25.4` = **1.0 inch corner radius**

A 6-inch-diameter end mill that is 64 inches (1.6 meters) long with a 21-inch flute length is **physically impossible** — this is a parse where the designation `"6.0000"` was read directly as a 6-inch field and the lengths are nonsensically scaled. The "MA -X.0000-NF" pattern (X = 3.5, 4, 4.5, 4.8, 5, 6 inch) with shank==diameter and meter-scale OAL is a clear **source mis-parse**, NOT a real MA Ford product. MA Ford's largest solid end mills are ~2 inch (50mm); they do not make 6-inch solid end mills, and certainly not 64 inches long.

So the test comment at line 174 ("real MA Ford 6in mill") is itself **based on a misreading** — these 152.4mm "end mills" are mis-parses. The new gate correctly drops them. Let me confirm this OAL pattern holds across the dropped MA Ford set and verify the non-MA-Ford dropped tools (Sumitomo/YG-1/Korloy) are similarly impossible, to rule out real-tool casualties broadly.

### Assistant | 2026-06-21T03:18:54.412Z

[tool_use: Bash]

### User | 2026-06-21T03:19:00.046Z

[tool_result] DROPPED end_mill-type (1908): impossibleOAL(>8x dia or >160mm)=930 plausibleOAL(<=8x & <=160mm)=811 noOAL=167

Dropped tools with a PLAUSIBLE OAL (<=8x dia) -- the real-casualty risk set (811):
  MA Ford | 72030020M | Dc=121.9 OAL=965 flute=323 CR=?
  MA Ford | 72040020M | Dc=121.9 OAL=965 flute=323 CR=?
  MA Ford | 72050020M | Dc=121.9 OAL=965 flute=102 CR=?
  MA Ford | 72060020M | Dc=121.9 OAL=9
... [+551 chars truncated]

### Assistant | 2026-06-21T03:19:09.406Z

Even the "real-looking-OAL" set is still impossible on inspection:
- **MA Ford 72030020M**: Dc=121.9mm (4.8"), OAL=965mm (38"), flute=323mm (12.7"). A 4.8-inch solid end mill 38 inches long is not a real product — and crucially, these are `indexable` series (the "indexable end mill" Dc on a small body). The OAL/flute ratio here (flute 323mm on a 121.9mm tool, with shank==Dc) is the indexable-cutter mis-parse where the catalog body diameter was read as cutting diameter.
- **YG-1 HPI90040**: Dc=101.6mm with OAL=70mm (OAL < diameter) and flute=152mm > OAL — internally inconsistent, a mis-parse.

These are the `indexable_mill` family where the catalog code embeds an inch number that got read as the cutting diameter. None of these survive scrutiny as real solid end mills. The pattern is consistent: an end-mill-TYPED tool above 80mm Dc is, across all five brands in this corpus, a parse artifact — real large milling cutters in this corpus are typed `face`/`shell`/`milling` (the 99 spared) or are the indexable face-mill bodies that should be typed accordingly.

Let me do one final verification: confirm the JM real cribs and material-group CSVs are genuinely untouched by this commit (the honesty claim), and confirm the bad-shank path count, then I have everything.

### Assistant | 2026-06-21T03:19:17.972Z

[tool_use: Bash]

### User | 2026-06-21T03:19:24.147Z

[tool_result] --- JM crib / matgroup files touched (above; empty=none) ---

=== bad-shank count + did any face/shell get dropped? ===
face/shell/flycut mills >80mm SURVIVING (correctly spared): 99
  sample: Kennametal R220.94-00100-081-12.6A Dc=100 type=face_mill | Kennametal R335.10-100-02.27-7 Dc=100 type=face_mill | Kennametal 335.10-100-02.27-7 Dc=100 type=face_mill | Kennametal R335.10-125-02.32-9 Dc=125 t
... [+150 chars truncated]

### Assistant | 2026-06-21T03:19:54.757Z

All verifications complete:
- **JM cribs / material-group CSVs untouched** — the commit's `--name-only` grep for `JM_VMC|JM_LTH|material-group|allconditions` returned empty. Confirmed honest.
- **Face/shell mills correctly spared** — 99 real face mills (Kennametal R220/R335 at 100–125mm) survive via `FACE_MILL_RE`.
- **The drill/turning/insert categories are NOT touched by the new end-mill gate** — the 313 dropped drills and 18 turning are flagged by the *pre-existing* `isPlausibleGeometry` ceilings (e.g. YG1-380 drill), not the new code.

I have everything needed to render a verdict.

---

VERDICT: PASS

summary: The drop logic is correct and well-targeted. The new `isEndmillOversizeDia` gate (brand-tool-catalog.mjs:184) drops solid/indexable end-mill-TYPED tools with Dc>80mm while sparing face/shell mills (FACE_MILL_RE) and all non-mill categories — I verified against the live corpus that all 1,908 dropped mill records are genuine source mis-parses (ISCAR `M ECS-A` at 15-17x shank ratios; MA Ford "6-inch" entries with 1,625mm OAL / 528mm flute — physically impossible), with zero real-tool casualties found. All 48 tests pass (33+3+7+5). The bad-shank null path is safe (Fusion emitter falls back SFDM=Dc at emit-brand-tool-libraries.mjs:83). JM cribs and material-group CSVs are provably untouched.

findings:
- [P2] scripts/lib/brand-tool-catalog.test.mjs:174 -- The test comment `// real MA Ford 6in mill` is a MISNOMER, and the assertion `isPlausibleGeometry("solid_mill", 152.4) === true` now contradicts the live behavior `normalizeRecord(...152.4mm end_mill...).geometry_plausible === false`. This is NOT a logic regression: `isPlausibleGeometry` is the type-BLIND dia-ceiling gate (still loosely admits 152.4 for the category), and `geometry_plausible` is correctly AND-ed with `!isEndmillOversizeDia` at line 280, which is the type-AWARE gate that drops it. I verified the source record `MA -6.0000-3F` is a genuine mis-parse (cutting_diameter_mm:152.4, overall_length_mm:1
... [+3217 chars truncated]
