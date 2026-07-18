---
type: "chat-session"
source: "claude-code-cli"
session_id: "f98cc9cc-777f-475a-990d-ca366b367e9b"
title: "Review the file `H:/prism/.claude/commands/macro-program.md` end-to-end as a con"
date: "2026-05-13"
first_ts: "2026-05-13T22:08:18.365Z"
last_ts: "2026-05-13T22:09:16.830Z"
cwd: "H:\\PRISM"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/f98cc9cc-777f-475a-990d-ca366b367e9b/subagents/agent-ab39db66afd6a3736.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review the file `H:/prism/.claude/commands/macro-program.md` end-to-end as a con

> **claude-code-cli** | 2026-05-13 | 21 msgs (9 user / 12 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/f98cc9cc-777f-475a-990d-ca366b367e9b/subagents/agent-ab39db66afd6a3736.jsonl`

## Transcript

### User | 2026-05-13T22:08:18.365Z

Review the file `H:/prism/.claude/commands/macro-program.md` end-to-end as a content+correctness reviewer for a manufacturing front-door skill in PRISM.

Context:
- This skill (`/macro-program`) is the operator-facing front door for MACRO-PROGRAM-PIPELINE-MS0/MS0-U7. The 6 underlying engines and 9 dispatcher actions already shipped in MS0-U1..U6 commits — this skill is purely a routing + safety-framing surface, not new logic.
- The skill must list 8 subcommands (list, match, template, fill, gate, emit, bulk, approve-batch) + a status helper. Each maps to a real dispatcher action.
- Real action names you can verify exist by grepping H:/prism/mcp-server/src/tools/dispatchers/turningDispatcher.ts and camDispatcher.ts:
  - prism_cad / prism_turning: macro_library_list, macro_match_family, macro_place_template, macro_fanout_dry_run
  - prism_turning + prism_cam (co-located): macro_fill_candidate, macro_gate_candidate, macro_emit_per_machine
  - prism_turning (lathe-only): macro_bulk_emit_batch, macro_approve_batch
- HARD SAFETY RULES that must not be softened: S(x) ≥ 0.70 HARD BLOCK (no override), per-machine independent gating, calculated VC expressions preserved (never pre-computed), batch n-1 must be approved before batch n, NEVER bulk-auto-emit, every dossier carries needsOperatorReview: true.
- The spec lives at `state/shared/specs/MACRO-PROGRAM-PIPELINE-MS0-2026-05-12.md` (122 lines, §MS0-U7).
- Skill style reference: `H:/prism/.claude/commands/lathe.md`, `H:/prism/.claude/commands/macro-convert.md`, `H:/prism/.claude/commands/okuma-macro.md` (might not exist; ignore if missing).

What I need from you (under 800 words, structured):
1. **Action-name correctness check** — for every `prism_*:macro_*` reference in the skill, verify the dispatcher + action pair actually exists by reading the dispatcher files. Flag any drift (typos, swapped namespaces, missing actions, or `macro_bulk_approve_batch` vs `macro_approve_batch` etc).
2. **Safety-rule integrity** — confirm no 
... [+1101 chars truncated]

### Assistant | 2026-05-13T22:08:25.730Z

I'll review the skill file end-to-end against the underlying engines and dispatchers.

### Assistant | 2026-05-13T22:08:25.953Z

[tool_use: Read]

### User | 2026-05-13T22:08:26.698Z

[tool_result] 1	---
2	name: macro-program
3	description: Macro-program pipeline — the operator-facing front door for MACRO-PROGRAM-PIPELINE-MS0. Catalog the 4 JM Okuma-OSP macros, match parts to families, place labelled reference templates, fill VC vars from print dims, run the S(x) ≥ 0.70 safety gate, emit per-machine labelled .MIN files, and orchestrate the gated, operator-confirmed bulk fan-out. NEVER bulk-a
... [+13917 chars truncated]

### Assistant | 2026-05-13T22:08:30.002Z

I'll trust the previous read and verify the dispatcher action names against the source files.

### Assistant | 2026-05-13T22:08:31.580Z

[tool_use: Grep]

### Assistant | 2026-05-13T22:08:32.635Z

[tool_use: Grep]

### User | 2026-05-13T22:08:33.373Z

[tool_result] 169:  "macro_library_list",                     // MacroLibraryEngine.listMacros — the 4 OSP lathe macros + parsed VC variable maps
170:  "macro_match_family",                     // MacroLibraryEngine.matchFamily — match part → wafer-insert / casing / casing-counterbore / top-hat-casing
171:  "macro_place_template",                   // MacroLibraryEngine.placeMacroTemplate — copy macro as _MACRO
... [+3390 chars truncated]

### Assistant | 2026-05-13T22:08:33.528Z

[tool_use: Grep]

### User | 2026-05-13T22:08:33.776Z

[tool_result] 1282:  "okuma_generate_casing", "okuma_generate_cbore", "okuma_generate_wafer_insert", "okuma_generate_top_hat", "okuma_validate_macro", "okuma_parse_macro", "okuma_defaults", "okuma_convert_to_hardcode", "macro_fill_candidate", "macro_gate_candidate", "macro_emit_per_machine",
7583:          case "macro_fill_candidate": {
7585:            if (!params.features) throw new Error("macro_fill_candidat
... [+838 chars truncated]

### User | 2026-05-13T22:08:34.301Z

[tool_result] Found 3 files
mcp-server\src\tools\dispatchers\turningDispatcher.ts
mcp-server\src\tools\dispatchers\camDispatcher.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts

### Assistant | 2026-05-13T22:08:38.597Z

[tool_use: Grep]

### Assistant | 2026-05-13T22:08:39.450Z

[tool_use: Grep]

### User | 2026-05-13T22:08:39.617Z

[tool_result] 325:  "macro_library_list",                // MacroLibraryEngine.listMacros — the 4 OSP lathe macros + their parsed VCxxx variable maps
326:  "macro_match_family",                // MacroLibraryEngine.matchFamily — match a part (geometry/features/name) → wafer-insert / casing / casing-counterbore / top-hat-casing
327:  "macro_place_template",              // MacroLibraryEngine.placeMacroTemplate —
... [+778 chars truncated]

### User | 2026-05-13T22:08:41.075Z

[tool_result] 321:  "get_part_folder",                   // PartFolderOrganizerEngine.getPartFolder — look one up
3127:          case "get_part_folder": {
3130:              return dispatcherError(new Error("get_part_folder requires part_number"), action, "prism_cad");

### Assistant | 2026-05-13T22:08:44.006Z

I have enough verified data. Let me check the family names against the engine to verify the catalog claim.

### Assistant | 2026-05-13T22:08:45.543Z

[tool_use: Grep]

### User | 2026-05-13T22:08:46.224Z

[tool_result] 7: *     (wafer-insert / casing / casing+counterbore / top-hat-casing), parsing each into a
41:export type MacroFamily = "wafer-insert" | "casing" | "casing-counterbore" | "top-hat-casing";
96:    file: "BASE WAFER INSERT MACRO.min", family: "wafer-insert", programNumber: "O1001", controller: "okuma_osp",
104:    file: "BASIC-CASING.MIN", family: "casing", programNumber: null, controller: "okuma_o
... [+1230 chars truncated]

### Assistant | 2026-05-13T22:08:46.437Z

[tool_use: Grep]

### User | 2026-05-13T22:08:47.045Z

[tool_result] 3007:              partNumber: typeof params.part_number === "string" ? params.part_number : (typeof params.partNumber === "string" ? params.partNumber : undefined),
3100:            const pn = params.partNumber ?? params.part_number;
3102:              return dispatcherError(new Error("create_part_folder requires part_number"), action, "prism_cad");
3108:              partNumberNormalized: params
... [+170 chars truncated]

### Assistant | 2026-05-13T22:09:16.830Z

I have all the verification I need. Here is the review.

# /macro-program Skill Review

**File:** `H:/prism/.claude/commands/macro-program.md`
**Grade: FAIL** (P0 finding — must fix before commit)

---

## 1. Action-name correctness check

All 9 dispatcher action references verified against source:

| Action in skill | turningDispatcher.ts | camDispatcher.ts | cadDispatcher.ts | Match |
|---|---|---|---|---|
| `prism_cad:macro_library_list` | yes (L1018) | — | yes (L3167) | OK |
| `prism_cad:macro_match_family` | yes (L1024) | — | yes (L3173) | OK |
| `prism_cad:macro_place_template` | yes (L1038) | — | yes (L3187) | OK |
| `prism_turning:macro_fill_candidate` | yes (L1074) | yes (L7583) | — | OK |
| `prism_turning:macro_gate_candidate` | yes (L1095) | yes (L7595) | — | OK |
| `prism_turning:macro_emit_per_machine` | yes (L1165) | yes (L7606) | — | OK |
| `prism_turning:macro_bulk_emit_batch` | yes (L1112) | NOT present | — | OK (lathe-only — matches skill claim) |
| `prism_turning:macro_approve_batch` | yes (L1138) | NOT present | — | OK (lathe-only — matches skill claim) |
| `prism_cad:get_part_folder` (L69) | — | — | yes (L3127) | OK |

All namespace + action pairings are correct. No `macro_bulk_approve_batch` typo. The co-location claim ("`prism_cam` carries `macro_fill_candidate`, `macro_gate_candidate`, `macro_emit_per_machine`") matches camDispatcher.ts L1282. **Verdict: PASS.**

---

## 2. Safety-rule integrity

Scanned the file for hedging tokens (`usually`, `preferably`, `in most cases`, `if needed`, `override`, `force`, `bypass`). Found:
- L106 "DO NOT retry with `--force` (there is no force; the gate is the gate)" — this is an *anti*-override assertion, correct framing.
- L128 "Never lift `S(x) ≥ 0.70`. There is no override path through this skill." — correct.
- L24 "with no override" — correct.
- L92 "NEVER suggest overriding the threshold" — correct.

No softening language found. `needsOperatorReview: true` is repeated 6×. Bulk-auto-emit prohibition is
... [+4174 chars truncated]
