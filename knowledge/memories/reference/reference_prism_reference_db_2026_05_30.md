---
name: reference_prism_reference_db_2026_05_30
description: prism-reference-db — every non-tooling data store extracted from the PRISM monolith into 17 category bundles (materials/machines/coolants/coatings/inserts/holders/workholding/abrasives/controllers/cad/process/post/...). Separate from + cross-referencing jm-die-database tooling. Consumers hotel/charlie/echo.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.122Z
aliases: reference_prism_reference_db_2026_05_30
---


**prism-reference-db: the monolith's non-tooling databases, extracted (2026-05-30, slot:juliett, U-MONOLITH-DB-EXTRACT, commit a43bb41dba).**

Operator directive: "extract all other databases other than tooling" + the standing think-ahead rule ([[feedback_think_ahead_extract_adjacent_databases]]) — grab the whole adjacency neighborhood (inserts, fixtures, materials, machines, coolants/lubricants + all others), keep **separate + cross-referenced**, into a NEW `mcp-server/data/prism-reference-db/`. Tooling already lives in `jm-die-database/` (cross-referenced, NOT re-extracted).

**Builder:** `scripts/extract-monolith-databases.mjs` (+ `.test.mjs`, 26 tests). Sources: the 2 non-modular monolith HTMLs (`H:/PRISM/PRISM_v8_89_002_TRUE_100_PERCENT.html` 46MB + `PRISMv1.html` 11MB) + `H:/PRISM/extracted_modules/` + `H:/PRISM/extracted/` + `H:/PRISM/data/materials_complete/` (1715 source files).

**Result: 1859 data stores / 13,920 records / 26MB across 17 category bundles** — `<category>.json` = `{category, count, stores:{<NAME>:<data>}}`. Counts: other 1047, cad 164, materials 150, process 147, machines 131, controllers 43, tools 37, workholding 30, post 21, coolants 19, physics 18, holders 20, safety 11, coatings 9, cost 6, inserts 5, abrasives 1. `MANIFEST.json` maps every name → category+bundle+recordCount; `README.md` documents the contract.

**Extraction technique (the load-bearing design):** comment-blind regex finds `IDENT = {`/`[` assignments → balanced-delimiter scanner (string/comment/template/regex-char-class aware) extracts the literal from the `{`/`[` onward (robust to the monolith's sloppy `// commented const` lines with literal `\n` junk) → `vm.runInNewContext('('+lit+')')` in a Proxy sandbox (undefined refs→undefined, real globals passthrough) → JSON.stringify. Dedup by NAME keep-richest. Single-pass O(n) `findRepairEdits` fallback recovers missing-comma (`}{`) AND extra-comma (`},,`, leading `{,`) data when strict parse fails — only kept if it re-parses with recordCount>0. `recordCount` is counted on the **re-parsed JSON** (not the live object) so all-method objects that serialize to `{}` correctly drop. `MAX_EVAL_BYTES=8MB` skips the one 11.6MB code+data hybrid's slow uninterruptible vm-compile.

**Failures (1066, all logged in MANIFEST.failed[], NOT lost data):** 696 computed-runtime-ref (objects referencing `this`/`new X()`/spreads evaluated at construction — not static data), 176 unbalanced, 136 other, 58 parse-error (mostly `*_ENGINE`/`*_SYSTEM` code objects). **Known residual:** `PRISM_CUTTING_TOOL_EXPANSION_V3` (11.6MB) skipped by the size cap — it's a method-bearing code+data hybrid; if its `ballEndMills` data is needed later, special-case it.

**Hard-won engineering lessons (this session burned ~15 build/crash cycles):**
1. **Windows write-storm:** writing 1859 individual tiny files triggered a per-file Defender scan → minutes-long write → external reaper killed the run mid-write (non-deterministic partial output). Fix = ONE bundle per category (~17 files). ALSO: never launch overlapping `--apply` background runs — they leave detached writers racing.
2. **O(n×k) string-slice OOM:** the original mask-then-regex comma-repair allocated an N-element array + repeated `slice` on an 11.6MB literal → OOM SIGKILL. Fix = single-pass scanner returning edit positions, segment-join apply.
3. **Mask-to-spaces corrupts string arrays:** masking string content to spaces made `['a','b']` look like a comma-run to the squeeze. Fixed by single-pass scanner that never builds a masked copy.
4. **EPIPE exit 255:** piping the script's stdout to `head` closes the pipe early → node SIGPIPE → exit 255 (looks like a crash but isn't). Redirect to a file instead.

**Consumers (cross-referenced, do NOT duplicate):** hotel (ERP material/machine masters), charlie (quoting), echo (post/controller data). **Store names are CASE-SENSITIVE** — `MACHINES`/`Machines`/`machines` are distinct stores; consumers must NOT lowercase-key (manifest flag `storeNamesCaseSensitive:true`). Regenerate: `node scripts/extract-monolith-databases.mjs --apply` (refuses `--apply` with `--limit`). See [[reference_juliett_tooling_stock_handoff_to_hotel_2026_05_29]] (the tooling half) + [[feedback_think_ahead_extract_adjacent_databases]].
