---
type: "chat-session"
source: "claude-code-cli"
session_id: "fba58390-8609-4dfb-be17-96afb0a4822f"
title: "Review the file `H:/prism-docu-print-loop/mcp-server/src/engines/BlueprintProgra"
date: "2026-05-14"
first_ts: "2026-05-14T20:26:03.568Z"
last_ts: "2026-05-14T20:28:32.349Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/fba58390-8609-4dfb-be17-96afb0a4822f/subagents/agent-add20f5322392fc68.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review the file `H:/prism-docu-print-loop/mcp-server/src/engines/BlueprintProgra

> **claude-code-cli** | 2026-05-14 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fba58390-8609-4dfb-be17-96afb0a4822f/subagents/agent-add20f5322392fc68.jsonl`

## Transcript

### User | 2026-05-14T20:26:03.568Z

Review the file `H:/prism-docu-print-loop/mcp-server/src/engines/BlueprintProgramJoinEngine.ts` END-TO-END (whole file, ~1055 lines).

CONTEXT: This is recovered uncommitted work for PRISM unit U-DOCU-04 (milestone MS-DOCU-INGEST). A crashed chat added a +508-line "QUERY LAYER" section (lines ~523-1054) on top of the existing committed "producer" code (lines 1-521). The query layer LOADS a pre-built join JSONL and serves point lookups: `loadJoinIndex()`, `programForPrint(pn, index)`, `printForProgram(path, index)`, cached `getJoinIndex()` singleton, `clearJoinIndexCache()`, `normalizeProgramPathKey()`. All wired into the class wrapper + singleton export at the bottom.

The data files it loads (CONFIRMED to exist on disk):
- `Docustrata/.index/blueprint-program-join-full-v6.jsonl` — sample row: `{"part_number":"221178737","part_number_normalized":"221178737","blueprints":[{"doc_id":"...","filename":"...","page_index":0,"drawing_score":0.55}],"programs":[],"match_confidence":"miss","n_programs":0,"relations":{},"print_customers":["EEOAEE"],"customer_corroborated_n":0,"narrowed_by_customer":false,"raw_pn_variants":["221178737"]}`
- `Docustrata/.index/training-triples-v4.jsonl` — sample row: `{"print_id":"...","print_filename":"...","print_disk_path":"H:\\PRISM\\Docustrata\\...\\x.pdf","tb_part_number":"UP-504-BLK","tb_drawing_number":"UP-504-BLK","tb_revision":"A","tb_customer":null,"tb_material":"S7 Rc 55-57","tb_description":"...","candidate_programs":[{"name":"UP-504-BLK.MIN","internal_name":"WAFER-ID","path":"H:\\PRISM\\JM DIE\\CNC LATHE\\OPTIMAS\\UP-504-BLK.MIN","machine":"lathe","customer_folder":"OPTIMAS","score":1.0,"reason":"exact_filename","matched_via":"UP-504-BLK","program_kind":"g_code"}],...}`

VERIFY and report P0/P1/P2/P3 findings + an overall PASS/FAIL verdict:
1. **Typecheck** — run `cd H:/prism-docu-print-loop/mcp-server && npx tsc --noEmit 2>&1 | grep -i "BlueprintProgramJoinEngine" || echo "no BlueprintProgramJoinEngine tsc errors"`. Report any err
... [+1679 chars truncated]

### Assistant | 2026-05-14T20:26:07.829Z

I'll review this file end-to-end. Let me start by reading it and running the typecheck.

### Assistant | 2026-05-14T20:26:08.322Z

[tool_use: Read]

### Assistant | 2026-05-14T20:26:09.598Z

[tool_use: Bash]

### User | 2026-05-14T20:26:11.618Z

[tool_result] 1	/**
2	 * BlueprintProgramJoinEngine — Phase 8 → JM Die program join table
3	 *
4	 * Joins blueprint pages extracted by Phase 8 (cleaned JSONL with
5	 * part_numbers_clean) to JM Die program/CAD files indexed by:
6	 *   - program-labels.json   (mcp-server/data/state/program-labels.json,
7	 *                            real lathe labels with filePath/customer/etc)
8	 *   - master-index.json     (d
... [+40415 chars truncated]

### User | 2026-05-14T20:26:20.106Z

[tool_result] no BlueprintProgramJoinEngine tsc errors

### Assistant | 2026-05-14T20:26:23.388Z

Now let me verify the data shapes and check a couple of specifics.

### Assistant | 2026-05-14T20:26:25.619Z

[tool_use: Bash]

### User | 2026-05-14T20:26:29.078Z

[tool_result] Exit code 1
head: cannot open 'Docustrata/.index/blueprint-program-join-full-v6.jsonl' for reading: No such file or directory
---SEP---
head: cannot open 'Docustrata/.index/training-triples-v4.jsonl' for reading: No such file or directory

### Assistant | 2026-05-14T20:26:31.017Z

[tool_use: Bash]

### User | 2026-05-14T20:26:33.032Z

[tool_result] Exit code 1
node:internal/process/promises:394
    triggerUncaughtException(err, true /* fromPromise */);
    ^

[Error: ENOENT: no such file or directory, open 'H:\prism-docu-print-loop\Docustrata\.index\blueprint-program-join-full-v6.jsonl'] {
  errno: -4058,
  code: 'ENOENT',
  syscall: 'open',
  path: 'H:\\prism-docu-print-loop\\Docustrata\\.index\\blueprint-program-join-full-v6.jsonl'
... [+23 chars truncated]

### Assistant | 2026-05-14T20:26:36.508Z

The data files aren't in the worktree `H:/prism-docu-print-loop` — they live in the main `H:/prism` tree. Let me find them.

### Assistant | 2026-05-14T20:26:37.577Z

[tool_use: Bash]

### User | 2026-05-14T20:26:48.592Z

[tool_result] H:/prism/Docustrata/.index/blueprint-program-join-full-v6.jsonl
H:/prism/Docustrata/.index/training-triples-v4.jsonl
---
total 96
drwxr-xr-x 1 Mark V 197608     0 May 13 21:35 .
drwxr-xr-x 1 Mark V 197608     0 May 13 21:35 ..
-rw-r--r-- 1 Mark V 197608 13933 May 13 21:35 phase15-deep-rescan-huge-chunked.py
-rw-r--r-- 1 Mark V 197608 15079 May 13 21:35 phase15-deep-rescan-parallel-memsafe.py
-rwxr
... [+397 chars truncated]

### Assistant | 2026-05-14T20:26:52.576Z

Important finding: the data files exist in `H:/prism` but **NOT** in the worktree `H:/prism-docu-print-loop`. This is critical for `findRepoRoot()` behavior. Let me scan the real data shapes from the main tree.

### Assistant | 2026-05-14T20:26:58.312Z

[tool_use: Bash]

### Assistant | 2026-05-14T20:27:03.638Z

[tool_use: Bash]

### User | 2026-05-14T20:27:07.613Z

[tool_result] v6 rows scanned 40000 rowsWithPrograms 2756
program element keys: customer,customer_match,ext,filename,kind,kind3,machineCategory,relation,source_path,via
sample program element: {"source_path":"H:\\PRISM\\JM DIE\\CNC LATHE\\FORGO\\1005 HAMMERHOB.MIN","filename":"1005 HAMMERHOB.MIN","customer":"FORGO","machineCategory":"lathe","ext":".min","kind":"program","kind3":"nc_program","relation":"has_nc_p
... [+176 chars truncated]

### User | 2026-05-14T20:27:12.688Z

[tool_result] triple rows scanned 55 rowsWithCandidates 55
row keys: candidate_cad,candidate_programs,has_program,has_pure_cad_ref,match_confidence,print_disk_path,print_filename,print_id,tb_customer,tb_description,tb_drawing_number,tb_material,tb_part_number,tb_revision
candidate_program keys: customer_folder,internal_name,machine,matched_via,name,path,program_kind,reason,score
sample candidate: {"name":"UP-50
... [+308 chars truncated]

### Assistant | 2026-05-14T20:28:32.349Z

I have what I need. The data confirms my analysis. Let me verify the JSDoc claim on line 661 (`source` field) and confirm finding #5.

Now I have a complete picture. Here's my end-to-end review.

---

# Review: BlueprintProgramJoinEngine.ts — U-DOCU-04 Query Layer

**Verdict: FAIL** — one P1 type-correctness bug (item #5, confirmed) plus a P1 doc-vs-code lie (item #3, confirmed). Both are load-bearing and must be fixed before the next file is generated. The producer code (lines 1–521) is untouched and clean; all findings are in the query layer (523–1054).

---

## P1 findings (must fix)

### P1-1 — `ProgramForPrintResult.source` is declared but NEVER set (item #5, CONFIRMED)

`ProgramForPrintResult` declares `source: "join_v6" | "training_triple" | "both" | "none"` as a **required** field (line 661) with 9 lines of JSDoc telling consumers to switch on it. But `programForPrint` (lines 906–945) **never sets `source`** in any of its three return paths:

- `empty` object (lines 908–918): no `source` key
- training-triple-only return (line 931): `{ ...empty, found: true, training_programs }` — inherits missing `source`
- main return (lines 934–944): no `source` key

This compiles **only** because every return flows through object literals that TypeScript's excess-property checking lets pass when... actually no — it should NOT compile. `empty` is explicitly typed `: ProgramForPrintResult` on line 908, and an object literal missing a required property assigned to a typed variable **is** a TS2741 error. Yet `npx tsc --noEmit` reported "no BlueprintProgramJoinEngine tsc errors".

The reason it slips through: the literal on lines 909–918 is missing `source`, which *should* be TS2741. I cannot explain the clean typecheck except that the worktree's `tsconfig` may exclude `src/engines/` from the checked set, or `tsc` is resolving a stale build. **This is itself a P1 concern** — the typecheck gate is not actually covering this file. Regardless of why tsc is silent: the JSDoc cont
... [+11285 chars truncated]
