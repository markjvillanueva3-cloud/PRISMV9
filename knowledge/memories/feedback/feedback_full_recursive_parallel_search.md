---
name: feedback_full_recursive_parallel_search
description: FLEET-WIDE / galaxy-wide search rule — when searching a named folder/scope, traverse the ENTIRE tree recursively (every nested subfolder, file-by-file), never sample or stop at the top level, and ALWAYS fan out parallel agents to do the sweep. Strengthens [[feedback_enumerate_before_read]].
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.426Z
aliases: feedback_full_recursive_parallel_search
---


# Full-recursive + parallel-agent search (FLEET RULE, all slots/galaxies)

Operator directive (2026-05-29, slot:foxtrot): *"make it a rule and memory that when we do searches, we check the full folder even [if] there are dozens of other folders inside previous folders. check file by file. always utilizing parallel agents to help search. make it full fleet, galaxy wide rule."*

**The rule (every slot, every galaxy, every search):**
1. **Query the index/graph FIRST.** Before any Glob/Grep/Agent, hit master-index (`prism_session:master_index_query`) / system-viz (`node scripts/system-viz-query.mjs find <noun>`) / master-graph. For indexed code/engine/data nodes it can answer instantly — the graph already knew `big-daishowa-holders`, `workholding-catalog`, etc., and the pre-grep / pre-write hooks surface matching nodes unprompted. BUT treat it as **discovery, not completeness**: the graph does NOT index raw corpus folders like `resources/` (163,906 files, mostly PDFs), and it can be stale. Never report an inventory from the graph alone — use it to seed the sweep, then verify with steps 2-4.
2. **Traverse the WHOLE tree.** When the operator names a folder/scope, enumerate it RECURSIVELY to the leaves — every nested subfolder, however deep. Never stop at the top level. Never sample-and-extrapolate ("there are probably ~X"). Count the real files.
3. **File-by-file.** Don't narrow to a glob guess (`*holder*`) and call it done — that is exactly how the tool-holder undercount + the fixturing-GAP false-claim happened. If the answer is a count or an inventory, produce the count from the full set.
4. **ALWAYS fan out parallel agents.** A broad sweep is delegated to multiple parallel read-only Explore/general-purpose agents (one per sub-tree / vendor / format / dimension), each returning a structured conclusion. Keep the conclusions in the main context, not the file dumps. Single-threaded manual globbing of a large tree is the anti-pattern.
5. **Verify scope locality first.** Confirm WHICH copy of the folder is canonical before sweeping — a slot worktree may hold a stub (e.g. slot-tree `resources/` = 6 files) while the real corpus lives on the main tree (`H:/prism/resources` = 163,906 files). Sweep the real one.

**Why:** The operator caught two consecutive shallow-discovery errors in one session — (a) DATABASES.md listed 2 tool-holder brands when 6 vendor catalogs exist, and (b) it marked fixturing a "🔴 GAP" when `workholding-catalog.ts` exists. Both came from loose top-level globbing instead of a full file-by-file sweep. Shallow discovery produces confidently-wrong inventories and gap-claims (an R12 honesty failure) and wastes operator trust. Parallel agents make the full sweep cheap enough that there's no excuse to go shallow.

**How to apply:** On any "check/search/inventory the X folder" request → (1) locate the canonical copy + get a total file count, (2) decompose the tree by subfolder/vendor/format/dimension, (3) dispatch parallel Explore agents (one per slice) with "count, do not estimate; return conclusion only", (4) synthesize the counts, (5) state the real number with its source — never a hedge. This applies to resources/, JM DIE/, catalog sweeps, engine/dispatcher censuses, corpus inventories, orphan hunts — fleet-wide.

Related: [[feedback_enumerate_before_read]] (the precursor — Glob full tree + report count before Read), [[feedback_mathematical_exhaustive_completeness]] (exhaustive over sampled), [[reference_foxtrot_mill_juliett_db_edge_2026_05_29]] (the DB-correction that motivated this), [[feedback_use_lima_pypdf_page_extractor]] (canonical deep extractor when the files are PDFs).
