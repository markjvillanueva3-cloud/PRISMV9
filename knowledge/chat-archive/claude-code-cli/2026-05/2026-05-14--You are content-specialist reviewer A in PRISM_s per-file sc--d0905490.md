---
type: "chat-session"
source: "claude-code-cli"
session_id: "d0905490-39b0-4b5d-ac6d-b1fa99b20ac0"
title: "You are content-specialist reviewer A in PRISM's per-file scrutiny gate. Review "
date: "2026-05-14"
first_ts: "2026-05-14T19:27:53.219Z"
last_ts: "2026-05-14T19:29:16.267Z"
cwd: "h:\\prism"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/d0905490-39b0-4b5d-ac6d-b1fa99b20ac0/subagents/agent-a51248d1f7f114624.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# You are content-specialist reviewer A in PRISM's per-file scrutiny gate. Review 

> **claude-code-cli** | 2026-05-14 | 8 msgs (3 user / 5 assistant) | cwd: h:\prism
> Raw: `H:/.claude/projects/H--prism/d0905490-39b0-4b5d-ac6d-b1fa99b20ac0/subagents/agent-a51248d1f7f114624.jsonl`

## Transcript

### User | 2026-05-14T19:27:53.219Z

You are content-specialist reviewer A in PRISM's per-file scrutiny gate. Review ONE file end-to-end and grade PASS/FAIL.

FILE: H:/prism-docu-print-loop/mcp-server/src/engines/BlueprintProgramJoinEngine.ts

CONTEXT: This file had a "query layer" appended (U-DOCU-04 / MS-DOCU-INGEST). The pre-existing code (lines ~1-540, the PRODUCER: normalizePartNumber, extractPartNumberCandidates, joinBlueprintsToPrograms, indexProgramsFrom*) is UNCHANGED and not under review. The NEW code under review is the "QUERY LAYER" section + the updated class wrapper + singleton at the end.

WHAT THE NEW CODE MUST DO (the unit spec):
- Load a pre-built v6 join JSONL (Docustrata/.index/blueprint-program-join-full-v6.jsonl) + the training-triples-v4.jsonl into in-memory indexes.
- v6 join row schema (verified from real data): {part_number, part_number_normalized, blueprints:[{doc_id,filename,page_index,drawing_score}], programs:[{source_path,filename,customer,machineCategory,ext,kind,kind3,relation,via,customer_match}], match_confidence:"miss"|"exact"|"loose"|"ambiguous", n_programs, print_customers:[], raw_pn_variants:[]}
- training-triples-v4 row schema (verified): {print_id, print_filename, print_disk_path, tb_part_number, tb_drawing_number, tb_revision, tb_customer, tb_material, tb_description, candidate_programs:[{name,internal_name,path,machine,customer_folder,score,reason,program_kind}], candidate_cad:[], match_confidence:number, has_program:bool}
- programForPrint(pn, index) — given a part number, return matching programs + blueprints + training-triple programs.
- printForProgram(path, index) — given a program file path, return the print(s) it joined to.
- getJoinIndex() — process-level singleton cache, mtime-guarded, single-flight.
- loadJoinIndex() must stream line-by-line (the join file is 58 MB).

REVIEW FOR (flag every P0/P1):
- Correctness: do the lookups actually work against the documented schemas? Off-by-one, wrong key, swapped fields?
- Streaming/memory: is the 58 MB file g
... [+898 chars truncated]

### Assistant | 2026-05-14T19:27:58.514Z

I'll review the file end-to-end.

### Assistant | 2026-05-14T19:27:59.062Z

[tool_use: Read]

### User | 2026-05-14T19:28:02.399Z

[tool_result] 1	/**
2	 * BlueprintProgramJoinEngine — Phase 8 → JM Die program join table
3	 *
4	 * Joins blueprint pages extracted by Phase 8 (cleaned JSONL with
5	 * part_numbers_clean) to JM Die program/CAD files indexed by:
6	 *   - program-labels.json   (mcp-server/data/state/program-labels.json,
7	 *                            real lathe labels with filePath/customer/etc)
8	 *   - master-index.json     (d
... [+39292 chars truncated]

### Assistant | 2026-05-14T19:28:06.980Z

Now let me check the PRISM engine conventions to verify against them.

### Assistant | 2026-05-14T19:28:07.215Z

[tool_use: Read]

### User | 2026-05-14T19:28:11.393Z

[tool_result] 1	---
2	paths:
3	  - "**/src/engines/**/*.ts"
4	  - "**/src/physics/**/*.ts"
5	---
6	
7	# Engine Coding Conventions
8	
9	- Every engine must export a class with static methods
10	- Physics formulas must reference canonical constants from src/physics/constants.ts
11	- Every engine needs a companion test file in __tests__/
12	- JSDoc required for public methods with @param and @returns
13	- Formula 
... [+336 chars truncated]

### Assistant | 2026-05-14T19:29:16.267Z

I have everything I need. Let me analyze the new query-layer code carefully.

## Review: BlueprintProgramJoinEngine.ts — QUERY LAYER (U-DOCU-04)

I read the whole file end-to-end. The new code under review is lines ~524-1037 (query layer types + functions + class wrapper + singleton). Findings below.

---

### P0 — Must-fix (blocks)

**P0-1 — `getJoinIndex` mtime guard is checked, but `loadJoinIndex` never re-stats after stream completes → TOCTOU stale mtime in the cache (lines 871, 968).**
`loadJoinIndex` records `joinMtimeMs: fs.statSync(joinPath).mtimeMs` at line 871 — **after** the entire file has been streamed (lines 791-819). If the join file is rewritten *during* the stream, the cache stores the *post-write* mtime, and the next `getJoinIndex` call compares the file's current mtime against that already-newer value → returns a **partially-loaded / torn index forever**. The mtime must be captured **before** the stream opens (e.g. `const joinStat = fs.statSync(joinPath); ... joinMtimeMs: joinStat.mtimeMs`), so a concurrent rewrite is detected on the next access. As written this silently serves wrong data — worse than throwing. Same issue applies to `triplesMtimeMs` (captured at line 827, before its own stream — that one is actually correct; only the join-file stat is misordered).

**P0-2 — `getJoinIndex` single-flight does not guard against a *cache hit racing a concurrent reload* (lines 966-987).** Sequence: caller A enters, `_cachedIndex` is set but mtime changed → sets `_cachedIndex = null` (line 973), then sees `_cacheLoad` is null, kicks off load, sets `_cacheLoad` (line 976). Caller B enters between A's line 973 and A's line 976: `_cachedIndex` is null (skip block), `_cacheLoad` is still null (skip line 975) → **B also starts a second `loadJoinIndex`**, both assign `_cachedIndex` and clear `_cacheLoad` (lines 978-979), the second-to-resolve wins. Two 58 MB streams run concurrently and the cache can end up holding either result. JS is single-threaded so the 
... [+8130 chars truncated]
