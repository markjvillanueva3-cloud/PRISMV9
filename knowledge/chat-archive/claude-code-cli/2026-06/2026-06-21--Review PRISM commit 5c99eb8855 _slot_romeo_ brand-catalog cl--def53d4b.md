---
type: "chat-session"
source: "claude-code-cli"
session_id: "def53d4b-7960-4679-90f1-2c2781b23457"
title: "Review PRISM commit 5c99eb8855 (slot:romeo, brand-catalog cleanup) in H:/prism. "
date: "2026-06-21"
first_ts: "2026-06-21T03:16:36.413Z"
last_ts: "2026-06-21T03:20:03.131Z"
cwd: "H:\\prism"
messages: 61
user_msgs: 24
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/def53d4b-7960-4679-90f1-2c2781b23457/subagents/agent-a0eda3a42f63024c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Review PRISM commit 5c99eb8855 (slot:romeo, brand-catalog cleanup) in H:/prism. 

> **claude-code-cli** | 2026-06-21 | 61 msgs (24 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/def53d4b-7960-4679-90f1-2c2781b23457/subagents/agent-a0eda3a42f63024c8.jsonl`

## Transcript

### User | 2026-06-21T03:16:36.413Z

Review PRISM commit 5c99eb8855 (slot:romeo, brand-catalog cleanup) in H:/prism. Arm C (analyst) of a 3-of-3 gate — weighted to SILENT BREAKAGE, blast radius, and downstream consumers. Do NOT assume arms A/B caught everything.

The change modifies scripts/lib/brand-tool-catalog.mjs `normalizeRecord` (now sets geometry_plausible=false for end-mill >80mm + nulls bad shanks). This is a SHARED loader. Analyze the BLAST RADIUS:
1. Who else consumes brand-tool-catalog.mjs `normalizeRecord` / `loadBrandCatalog` besides the Fusion emitter? Grep for importers. The 2026-06-19 work wired the 72K brand catalog into the app /tool/search path via scripts/lib/brand-catalog-to-cuttingtool.mjs + scripts/emit-brand-catalog-registry-json.mjs — does THAT path read geometry_plausible? If so, my gate change now also drops the end-mill-oversize records (and nulls shanks) from the APP's tool search. Is that a desirable, consistent side effect or an unintended regression? Reason about it.
2. The bad-shank change: nulling shank_mm. Does any consumer REQUIRE shank_mm to be non-null (would null break a downstream collision calc, registry index, or schema)? Check brand-catalog-to-cuttingtool.mjs's handling of shank/shaft.
3. clean-fusion-tools-misparse.mjs writes files in place with JSON.stringify (no indent) — it minified the 21MB jm-milling-tools.tools. Any consumer that depends on that file being pretty-printed or on specific tool IDs that were dropped? Is the in-place write safe (no partial-write corruption risk)?
4. Idempotency: re-running emit+place+clean must converge (not progressively drop more). Confirm the gate + cleaner are idempotent.
5. Duplication: clean-fusion-tools-misparse.mjs — does it overlap an existing tool-library cleaner? (Distinct from the normalizer gate?)

Run the 4 test suites to confirm green. Grade PASS or FAIL with P0/P1 + file:line. Be concise.

### Assistant | 2026-06-21T03:16:39.808Z

I'll start by examining the commit and the changed files to understand the blast radius.

### Assistant | 2026-06-21T03:16:41.173Z

[tool_use: Bash]

### Assistant | 2026-06-21T03:16:41.518Z

[tool_use: Bash]

### User | 2026-06-21T03:16:47.177Z

[tool_result] commit 5c99eb8855c7a57d7faed2912bc5dc1eeacd0109
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 22:15:16 2026 -0500

    [MAIN-FORCE] [TOOL-LIBRARIES]/U-BRAND-CATALOG-CLEANUP (slot:romeo): remove ~3,824 source mis-parse presets from Fusion brand catalogs -> endmill-oversize 0
    
    Operator-approved cleanup. brand-tool-catalog.mjs normalizer now gates geometry mis
... [+1679 chars truncated]

### User | 2026-06-21T03:16:47.373Z

[tool_result] commit 5c99eb8855c7a57d7faed2912bc5dc1eeacd0109
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 22:15:16 2026 -0500

    [MAIN-FORCE] [TOOL-LIBRARIES]/U-BRAND-CATALOG-CLEANUP (slot:romeo): remove ~3,824 source mis-parse presets from Fusion brand catalogs -> endmill-oversize 0
    
    Operator-approved cleanup. brand-tool-catalog.mjs normalizer now gates geometry mis
... [+22695 chars truncated]

### Assistant | 2026-06-21T03:16:50.367Z

I have the core diff. Now let me trace the blast radius. First, find all consumers of the shared loader and the app-wiring path.

### Assistant | 2026-06-21T03:16:51.674Z

[tool_use: Grep]

### Assistant | 2026-06-21T03:16:52.127Z

[tool_use: Grep]

### User | 2026-06-21T03:17:02.608Z

[tool_result] Found 22 files
mcp-server\data\state\session-file-ownership.json
state\shared\dashboards\injection-dedup-cache.json
state\shared\jm-fusion-tools\FUSION-TOOL-LIBRARY-ASSESSMENT-2026-06-20.md
scripts\clean-fusion-tools-misparse.mjs
knowledge\memories\reference\reference_brand_cam_tool_libraries_2026_06_19.md
scripts\enumerate-brand-tool-misparse.mjs
state\HANDOFF.md
scripts\lib\brand-tool-catalog.te
... [+706 chars truncated]

### User | 2026-06-21T03:17:03.196Z

[tool_result] knowledge\wiki\code-tribal\learnings\brand-catalog-app-wiring-u-suppress-count.md:14:geometry_plausible:false record, including the ~17 name-only ones that had no diameter to drop.
knowledge\memories\reference\reference_brand_catalog_app_search_wire_2026_06_19.md:3:description: "Wired the 72,406-tool brand catalog into the app's /tool/search (slot:romeo 2026-06-19). Additive registry-shard emit — 
... [+11577 chars truncated]

### Assistant | 2026-06-21T03:17:05.836Z

The app-wiring path is confirmed: `brand-catalog-to-cuttingtool.mjs` (line 107) and `emit-brand-catalog-registry-json.mjs` (line 86) both read `geometry_plausible === false`. Let me read those two app-path files and the emitter to confirm exact behavior.

### Assistant | 2026-06-21T03:17:06.780Z

[tool_use: Read]

### Assistant | 2026-06-21T03:17:06.908Z

[tool_use: Read]

### User | 2026-06-21T03:17:08.473Z

[tool_result] 1	/**
2	 * brand-catalog-to-cuttingtool.mjs -- pure mapper: canonical brand-tool-catalog record ->
3	 * ToolRegistry `CuttingTool` JSON shape.
4	 *
5	 * WHY (slot:romeo, BRAND-CATALOG-APP-WIRING 2026-06-19): the web app's "Search tool catalog
6	 * (75K+ tools)" field calls POST /api/v1/data/tool/search -> `toolRegistry.search()`
7	 * (mcp-server/src/routes/data.ts:60 -> src/registries/ToolRegistry
... [+7236 chars truncated]

### User | 2026-06-21T03:17:09.785Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * emit-brand-catalog-registry-json.mjs -- emit the 72K-tool brand catalog as TRACKED ToolRegistry
4	 * `.json` shards so the EXISTING POST /api/v1/data/tool/search route + the EXISTING frontend
5	 * "Search tool catalog (75K+ tools)" field serve the real corpus. (slot:romeo, BRAND-CATALOG-APP-WIRING)
6	 *
7	 * WHY: ToolRegistry.load() (mcp-server/src/registries/ToolR
... [+7048 chars truncated]

### Assistant | 2026-06-21T03:17:18.048Z

This is the critical finding for Q1 and Q2. The app path's `toCuttingTool` (line 107) reads `geometry_plausible === false` and treats the record as KEPT-but-diameterless — it does NOT drop the record. This is materially different from the CAM-lane emitter which drops the whole record. Let me verify the design intent here.

Now I need to understand the **shank** handling for Q2. In `buildGeometry` line 71, `shank` comes from `finitePos(rec.shank_mm)` — so a `null` shank just means `geometry.shank_diameter` is omitted. That's safe. But I must check whether the registry or any collision calc REQUIRES shank to be present. Let me look at the rest of the changed normalizer and the other consumers.

### Assistant | 2026-06-21T03:17:18.995Z

[tool_use: Read]

### Assistant | 2026-06-21T03:17:19.627Z

[tool_use: Read]

### User | 2026-06-21T03:17:20.481Z

[tool_result] 150	  if (unit === "mm") return value;
151	  return null; // unknown unit -> no fabricated mm value (R12)
152	}
153	
154	// ## Geometry plausibility gate (guards against source mis-parses, e.g. a catalog code
155	// "380" read as a 380mm drill -- verified live in additional-tools.json "YG1-380.0").
156	// Ceilings are GENEROUS per category so real large indexable mills are NOT false-rejected;
157	
... [+10001 chars truncated]

### User | 2026-06-21T03:17:20.953Z

[tool_result] 60	  return dc != null && dc > 0 ? Math.min(re, dc / 2) : re;
61	}
62	
63	/** Map a canonical record to a Fusion tool `type` string. */
64	export function fusionType(rec) {
65	  if (rec.category === "drill") return "drill";
66	  if (rec.category === "reamer") return "reamer";
67	  if (rec.category === "thread") return "thread mill";
68	  const dc = rec.diameter_mm;
69	  const re = effectiveRE(rec)
... [+5842 chars truncated]

### Assistant | 2026-06-21T03:17:27.864Z

Now I have the full picture for Q1 and Q2. Let me address the key Q1 question precisely:

**Q1 app-path behavior:** The app path (`toCuttingTool` line 107) treats `geometry_plausible === false` as "drop the diameter, KEEP the record" — the record stays searchable by name/brand/type. So the new gate flagging end-mill-oversize records does NOT drop them from app tool search; it only suppresses their bogus 102.67mm diameter from the diameter index. That is the SAME, already-intended behavior the app path had for the pre-existing 380mm-drill case (line 145 test). This is consistent and desirable — the bogus diameter shouldn't pollute diameter-range search, and the entry is still listed.

Now let me check the JM milling tools file and any consumer of it for Q3, plus run the test suites. Let me also verify there's no consumer requiring shank non-null and check the cron/harness consumers.

### Assistant | 2026-06-21T03:17:28.773Z

[tool_use: Grep]

### Assistant | 2026-06-21T03:17:29.502Z

[tool_use: Grep]

### User | 2026-06-21T03:17:37.619Z

[tool_result] Found 60 files
state\shared\jm-fusion-tools\FUSION-TOOL-LIBRARY-ASSESSMENT-2026-06-20.md
state\shared\jm-fusion-tools\FUSION-LIBRARY-ASSESSMENT.json
state\shared\jm-fusion-tools\FUSION-LIBRARY-ASSESSMENT.md
scripts\clean-fusion-tools-misparse.mjs
knowledge\memories\reference\reference_mill_domain_atlas_for_foxtrot_2026_05_27.md
knowledge\memories\reference\reference_jm_fusion_matgroup_libraries_20
... [+2441 chars truncated]

### User | 2026-06-21T03:17:38.354Z

[tool_result] Found 250 files limit: 250
state\shared\jm-fusion-tools\FUSION-TOOL-LIBRARY-ASSESSMENT-2026-06-20.md
state\shared\jm-fusion-tools\BRAND-TOOL-MISPARSE.csv
state\shared\jm-fusion-tools\BRAND-TOOL-MISPARSE.json
state\shared\jm-fusion-tools\jm-milling-tools.tools
scripts\clean-fusion-tools-misparse.test.mjs
scripts\clean-fusion-tools-misparse.mjs
scripts\enumerate-brand-tool-misparse.mjs
scripts\lib\b
... [+15096 chars truncated]

### Assistant | 2026-06-21T03:17:44.924Z

Important: I see `data/tools/brand-catalog__*.json` — these are the TRACKED app-search shards that the registry auto-loads. The end-mill-oversize records would now be EMITTED into these shards (kept as records, diameter suppressed). Let me confirm `jm-milling-tools.tools` consumers (Q3) and check whether the in-place minify breaks the consumer. Let me check the extract script that produces it and whether anything reads `.tools` pretty-printed.

### Assistant | 2026-06-21T03:17:46.271Z

[tool_use: Grep]

### Assistant | 2026-06-21T03:17:47.677Z

[tool_use: Read]

### User | 2026-06-21T03:17:48.568Z

[tool_result] read-once-guard: 'H:\prism\scripts\enumerate-brand-tool-misparse.mjs' was already read 80s ago in this session and is unchanged (mtime 1782011159191). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T03:17:48.675Z

[tool_result] scripts\extract-jm-milling-tools-fusion.mjs:3: * extract-jm-milling-tools-fusion.mjs — JM-FUSION-TOOLS-MS0
scripts\extract-jm-milling-tools-fusion.mjs:13: *   state/shared/jm-fusion-tools/jm-milling-tools.json       (intermediate manifest)
scripts\extract-jm-milling-tools-fusion.mjs:14: *   state/shared/jm-fusion-tools/jm-milling-tools.tools      (Fusion 360 format)
scripts\extract-jm-milling-tool
... [+1222 chars truncated]

### Assistant | 2026-06-21T03:17:54.959Z

Q3 confirmed: `jm-milling-tools.tools` is a Fusion 360 import artifact (line 14-15, 275). It's generated by `extract-jm-milling-tools-fusion.mjs` with pretty-print (`null, 2` line 258), but it's consumed only by Fusion 360's "Import" UI (line 275), which parses JSON regardless of indentation. No PRISM code reads it. The minify (`clean-fusion-tools-misparse.mjs` JSON.stringify no indent) is cosmetically lossy for git diffs but functionally safe for the only consumer. The `clean` script's `--apply` does a single `fs.writeFileSync` — non-atomic (partial-write risk on crash), but it's a manual operator-run dev artifact, not a live runtime path.

Now let me run the 4 test suites and verify idempotency + duplication against existing cleaners.

### Assistant | 2026-06-21T03:17:55.902Z

[tool_use: Bash]

### Assistant | 2026-06-21T03:17:56.609Z

[tool_use: Bash]

### User | 2026-06-21T03:18:02.598Z

[tool_result]   ...
# Subtest: live corpus: spans many brands with geometry coverage (smoke)
ok 32 - live corpus: spans many brands with geometry coverage (smoke)
  ---
  duration_ms: 461.2356
  ...
# Subtest: MM_PER_INCH is the canonical constant
ok 33 - MM_PER_INCH is the canonical constant
  ---
  duration_ms: 0.084
  ...
1..33
# tests 33
# suites 0
# pass 33
# fail 0
# cancelled 0
# skipped 0
# todo 0
# dur
... [+17 chars truncated]

### User | 2026-06-21T03:18:08.360Z

[tool_result]   ...
# Subtest: cleanToolsLibrary: empty / malformed input is safe
ok 3 - cleanToolsLibrary: empty / malformed input is safe
  ---
  duration_ms: 0.5555
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 7.6315

### Assistant | 2026-06-21T03:18:10.445Z

Two suites green. Now the other two (enumerate, assess) and the app-path test suites that are the real blast-radius consumers.

### Assistant | 2026-06-21T03:18:11.876Z

[tool_use: Bash]

### Assistant | 2026-06-21T03:18:14.121Z

[tool_use: Bash]

### User | 2026-06-21T03:18:18.569Z

[tool_result] # tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 10.8236
=== ASSESS ===
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 12.2337

### User | 2026-06-21T03:18:23.024Z

[tool_result] === brand-catalog-to-cuttingtool (app mapper) ===
# tests 14
# suites 0
# pass 14
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 10.5939
=== emit-brand-catalog-registry-json (app emitter) ===
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 20.8857
=== emit-brand-tool-libraries (CAM lanes) ===
# tests 38
# suites 0
# pass 38
# fail 0
# cancelled 0

... [+42 chars truncated]

### Assistant | 2026-06-21T03:18:31.775Z

All suites green: 4 named (33/3/7/5 = 48) plus the 3 blast-radius app/CAM consumer suites (14/6/38). Now let me close the remaining questions: idempotency (Q4) — confirm the gate is a pure function of geometry (re-running converges), and confirm `isPlausibleGeometry` is unchanged so the app emitter's `diameterSuppressed` count is consistent. Let me also verify whether the bad-shank nulling now changes the app emitter's `diameterSuppressed` accounting or registry behavior, and check the assess-fusion-tool-libraries change for the `ENDMILL_OVERSIZE_MAX_MM` default.

### Assistant | 2026-06-21T03:18:33.195Z

[tool_use: Read]

### Assistant | 2026-06-21T03:18:34.013Z

[tool_use: Grep]

### User | 2026-06-21T03:18:35.317Z

[tool_result] 1	#!/usr/bin/env node
2	// assess-fusion-tool-libraries.mjs -- operator-facing inventory + accuracy assessment of the
3	// PRISM-generated Fusion 360 tool libraries (Local/ .tools) and the material-group crib CSVs.
4	//
5	// WHY: operator asked for a full assessment of the Fusion tool library for JM Die -- what exists,
6	// whether it is accurate relative to JM's real source crib, and how it is ca
... [+3043 chars truncated]

### User | 2026-06-21T03:18:38.480Z

[tool_result] scripts\assess-fusion-tool-libraries.mjs:34:export const ENDMILL_OVERSIZE_MAX_MM = 160;
scripts\assess-fusion-tool-libraries.mjs:51:export function isEndmillOversize(t, ceilingMm = ENDMILL_OVERSIZE_MAX_MM) {

### Assistant | 2026-06-21T03:18:44.950Z

Now I have a key cross-consumer detail for Q5/Q3. `clean-fusion-tools-misparse.mjs` imports `isEndmillOversize` from `assess-fusion-tool-libraries.mjs` and calls it with `ceilingMm=80` (`ENDMILL_CLEAN_CEIL_MM`). But `assess`'s `isEndmillOversize` keys on the **emitted Fusion `.tools`** shape (`t.geometry.DC`, `t.type` string contains "end mill", `t.unit`) — a DIFFERENT shape than the canonical record. This is correct because the cleaner operates on the already-emitted `.tools` file, not canonical records. Note one subtle behavior: `assess`'s `isEndmillOversize` excludes only `type.includes('face')` — it does NOT exclude "shell"/"flycut" like the canonical-side `FACE_MILL_RE`. Let me verify whether that creates a drift risk where the cleaner could drop a shell mill the normalizer would spare.

Let me check the idempotency concern and the shell-mill drift between the two gate implementations.

### Assistant | 2026-06-21T03:18:48.130Z

[tool_use: Bash]

### User | 2026-06-21T03:18:55.227Z

[tool_result] shell @80 -> false
flat  @80 -> true
face  @80 -> false

### Assistant | 2026-06-21T03:19:02.044Z

Good — `shell @80 -> false` because Fusion's emitted `type` for a shell mill is "face mill" (the canonical `fusionType()` never produces a "shell mill" type string; shell/face mills aren't in `FUSION_EMIT_CATEGORIES` as end mills). Actually the probe shows `assess` spares "shell mill" string too because `type.includes('end mill')` is false for "shell mill". So no false-drop. The gate is safe on the emitted shape.

Now idempotency (Q4): the canonical normalizer gate is a pure function of `(category, typeStr, diameter_mm, shank_mm)` — none of which it mutates, and `geometry_plausible`/`shank_mm` are recomputed from raw each load. Re-running emit reads the same source files → same output. The cleaner: after first `--apply`, oversize tools are dropped (gone), bad shanks set to `dc` (ratio becomes 1, < 8) → second run drops 0, fixes 0. Let me verify cleaner idempotency empirically and confirm no progressive drop.

### Assistant | 2026-06-21T03:19:06.397Z

[tool_use: Bash]

### User | 2026-06-21T03:19:11.753Z

[tool_result] pass1: { dropped: 1, shankFixed: 1, kept: 2 }
pass2: { dropped: 0, shankFixed: 0, kept: 2 }
pass3: { dropped: 0, shankFixed: 0, kept: 2 }
idempotent: true

### Assistant | 2026-06-21T03:19:14.750Z

Cleaner is idempotent. Now let me verify one remaining blast-radius concern for Q2: whether the **bad-shank nulling** changes the `cam-tool-library-harness`/`cam-tool-library-cron` consumers (parity), and confirm the existing cleaners list to answer Q5 (duplication). Let me check the cron/harness and the existing CAM-library cleaners.

### Assistant | 2026-06-21T03:19:16.632Z

[tool_use: Grep]

### Assistant | 2026-06-21T03:19:17.644Z

[tool_use: Bash]

### User | 2026-06-21T03:19:18.612Z

[tool_result] Found 11 files
scripts\clean-fusion-tools-misparse.test.mjs
scripts\clean-fusion-tools-misparse.mjs
scripts\assess-fusion-tool-libraries.mjs
scripts\enumerate-brand-tool-misparse.mjs
scripts\lib\brand-tool-catalog.test.mjs
scripts\lib\brand-tool-catalog.mjs
scripts\enumerate-brand-tool-misparse.test.mjs
scripts\assess-fusion-tool-libraries.test.mjs
scripts\lib\brand-catalog-to-cuttingtool.test.mjs
... [+77 chars truncated]

### User | 2026-06-21T03:19:24.259Z

[tool_result] # pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 16.2504
=== build-index ===
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 9.8327

### Assistant | 2026-06-21T03:19:30.150Z

All downstream consumer suites green (harness 7/7, index 6/6). Q5 duplication: the only `*misparse*`/`clean-fusion` cleaner is the new one — no overlapping standalone CAM-library cleaner exists. There ARE adjacent fixers in `mcp-server/scripts/` (`fix-helical-source-geometry.mjs`, `fold-helical-end-mills-*`), but those operate on the JM helical crib (a different corpus/pipeline) and fix a different defect (source geometry imputation), not the end-mill-oversize/bad-shank gate. No duplication.

One last check for Q3 completeness — confirm the `jm-milling-tools.tools` in-place minify didn't drop tool IDs that any tracked test or registry references, and confirm the file is valid JSON post-minify.

### Assistant | 2026-06-21T03:19:34.015Z

[tool_use: Bash]

### User | 2026-06-21T03:19:39.749Z

[tool_result] valid JSON: true | version: 1 | tools: 14160
end-mill-oversize survivors >80mm: 0

### Assistant | 2026-06-21T03:20:03.131Z

The minified `jm-milling-tools.tools` is valid JSON (14,160 tools, 0 oversize survivors). Cleanup verified live. I have everything needed for the verdict.

---

VERDICT: PASS

summary: The new mis-parse gate is a pure function of source geometry recomputed on every load, and the blast radius is correctly handled across both pipelines. The app /tool/search path (`brand-catalog-to-cuttingtool.mjs:107` + `emit-brand-catalog-registry-json.mjs:86`) treats `geometry_plausible:false` as "suppress the bogus diameter, KEEP the record as a searchable listing" — so the new end-mill-oversize records are NOT dropped from app search; their impossible 102.67mm diameter is just kept out of the diameter index, which is the identical, already-intended behavior the app path applied to the pre-existing 380mm-drill case. The CAM-lane emitter drops the whole record. That asymmetry is deliberate and documented (`brand-catalog-to-cuttingtool.mjs:104-106`), not a regression.

Consumers traced and verified clean:
- App search path: `brand-catalog-to-cuttingtool.mjs` (14/14), `emit-brand-catalog-registry-json.mjs` (6/6) — `geometry_plausible:false` -> diameter suppressed, record retained. `diameterSuppressed` accounting at `emit-brand-catalog-registry-json.mjs:86-89` is unaffected by the shank change (gated only on diameter).
- Bad-shank (Q2): nulling `shank_mm` is safe. `buildGeometry` (`brand-catalog-to-cuttingtool.mjs:65,71`) uses `finitePos(rec.shank_mm)` -> a null shank simply omits `geometry.shank_diameter`; no consumer requires it non-null. The Fusion emitter (`emit-brand-tool-libraries.mjs:83`) explicitly falls back `SFDM = shank_mm ?? diameter_mm`. ToolRegistry has no NOT-NULL shank constraint. No collision calc reads brand-catalog shank.
- CAM lanes: `emit-brand-tool-libraries.mjs` (38/38), harness (7/7), index build (6/6) all green.
- Idempotency (Q4): normalizer gate is a pure recompute from raw on every load (no mutation of source); cleaner converges (verified 3 passes: 1/1 then 
... [+2154 chars truncated]
