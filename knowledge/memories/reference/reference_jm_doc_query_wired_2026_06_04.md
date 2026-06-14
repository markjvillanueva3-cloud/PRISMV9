---
name: reference_jm_doc_query_wired_2026_06_04
description: "B1 DONE — JMDieDocIndexEngine + prism_data:jm_die_doc_lookup wires the 111,745-doc documents.jsonl (was unconsumed). + 2 reusable lessons: readFileSync beats readline 40x for a full-corpus index load; lexicographic date compare is wrong for MM/DD/YYYY corpora. slot juliett 2026-06-04 commits 0674947b2c + LF-restore"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.170Z
aliases: reference_jm_doc_query_wired_2026_06_04
---


Slot juliett, 2026-06-04. Operator `/loop /goal [ tackle b1 ]` (gap-list B1). Commit `0674947b2c` (+ a follow-up LF-restore commit).

**B1 was HALF-FALSE (verify-first, like A2):** the gap-list claimed BOTH `documents.jsonl` (111,745 docs) AND `blueprint-program-join-full-v6.jsonl` (76,205 PNs) had "NO runtime consumer." VERIFIED: the v6 join is **already wired** — `prism_data:program_print_link_lookup` + `program_print_link_coverage` (cases at `dataDispatcher.ts`, default path `Docustrata/.index/blueprint-program-join-full-v6.jsonl`, a `prism_dev` mirror, + `dataDispatcher.uppl-*.test.ts`). Only `documents.jsonl` (the `JMDieDocuStrataDB` store) was the real gap — `db-toolbelt jm-die-db` only BUILDS it, nothing loaded/queried it; the DB_MANIFEST "queryable via semantic_search" claim was aspirational (no indexer fed it).

**What shipped:** `mcp-server/src/engines/JMDieDocIndexEngine.ts` (exported-fns + I/O pattern, mirrors `ProgramPrintLinkIndexEngine` NOT the physics-class rule) — `loadDocIndex` (mtime-cached, FAIL-LOUD on missing/zero-parseable corpus) + `queryDocs` (pure filter: text on title+filename+disk_path, role/role_tier/notebook exact, folder substring, hasTextLayer, minPrintScore, date range, limit clamp [1,500]). Wired `prism_data:jm_die_doc_lookup` (schema in `dataActionSchemas.ts` + z.enum + case, snake→camel mapping). 14 tests, **live-validated**: 111k docs load in ~692ms, real query returns real docs. tsc clean. 2-reviewer per-file scrutiny PASS.

**LESSON 1 (perf, generalizable → see [[feedback_readfilesync_beats_readline_for_index_load]]):** A reviewer P1 said "you claim to stream but use readFileSync — stream it (memory)." I switched to `readline`/`createReadStream` → the live load went **742ms → >30s** (readline's per-line async-iterator overhead over 111k lines dominates). REVERTED to readFileSync + made the header HONEST (R7 surface the tradeoff, R12 don't overclaim "streams"). For a full-corpus in-memory index, readFileSync+split wins; the 57MB transient is bounded + freed + mtime-cached. Streaming only wins when you DON'T retain all rows.

**LESSON 2 (date filter bug):** the corpus `created_at` is **`MM/DD/YYYY HH:MM:SS`** (e.g. `05/07/2026 12:54:26`), NOT ISO. My initial lexicographic `>=`/`<=` compare was WRONG (`"05/07/2026" < "12/31/2025"` lexically but later in time). Fixed with `parseDocDate` (handles US + ISO + Date.parse fallback → UTC epoch). Always probe a REAL date value before string-comparing dates.

**LESSON 3 (recurring):** the Edit tool flipped `dataDispatcher.ts` + `dataActionSchemas.ts` LF→CRLF on write (Windows); my first commit captured the whole-file flip (3378 "deletions" = pure line-ending noise, only 5 real content lines). Caught via `git show --stat` + `file | grep CRLF`. Fixed with a node `replace(/\r\n/g,"\n")` + LF-restore commit. Same class as the many "restore to LF" regressions. ALWAYS check `git show --stat` when a commit's deletion count dwarfs your real change. Path-scoped `git commit <pathspec>` per [[feedback_shared_index_race_pathspec_commit]].

Open P2s (deferred): no dispatcher-round-trip test for the snake→camel seam (R15); `dataDispatcher.ts` hardcoded action-count log (line 2 "54", line 2875 "144" — pre-existing drift, should be computed from the enum); `docs_jsonl_path` arbitrary-read override (matches `join_jsonl_path` precedent, acceptable).
