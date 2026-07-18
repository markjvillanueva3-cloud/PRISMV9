---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "Per-file scrutiny gate review of a brand-new engine I just wrote at: `H:/prism-s"
date: "2026-05-15"
first_ts: "2026-05-15T18:03:48.472Z"
last_ts: "2026-05-15T18:11:42.144Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-ae19125816a1f3a01.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Per-file scrutiny gate review of a brand-new engine I just wrote at: `H:/prism-s

> **claude-code-cli** | 2026-05-15 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-ae19125816a1f3a01.jsonl`

## Transcript

### User | 2026-05-15T18:03:48.472Z

Per-file scrutiny gate review of a brand-new engine I just wrote at:

`H:/prism-slot-delta/mcp-server/src/engines/CADArchiveJoinAugmenterEngine.ts`

This is MS-PRINT-PROGRAM-LOOP/U-PPL-D4 — a PURE-TRANSFORM bridge engine that maps CAD-archive master-index entries (from `CADFileIndexerEngine`) into ProgramSeedLink[] consumed by `BlueprintProgramJoinEngine`'s v6 print↔program join. The JM Die tribal rule: Inventor/Fusion/SolidWorks mill saves NO G-code; the .ipt/.iam/.f3d/.sldprt IS the program. The v6 join currently only finds 38 print→CAM-project hits because CAD files were never seeded into `buildProgramSeedAugmentation`. My engine composes that existing kernel (does NOT duplicate it).

Read the WHOLE file (~ 350 lines). Verify:

1. **Composition vs duplication** — Did I correctly compose `buildProgramSeedAugmentation` (in `ProgramPrintLinkIndexEngine.ts`) and `blueprintProgramJoinEngine.loadJoinIndex` (in `BlueprintProgramJoinEngine.ts`) without redefining PN normalization or path-key logic? The kernel must remain authoritative.

2. **Public API correctness** — `MILL_PROGRAM_FORMATS`, `filterMillEligibleEntries`, `augmentJoinFromCADIndex`, `loadAndAugment` method, `cadArchiveJoinAugmenterEngine` singleton. Are types consistent? Does `CADAugmentedLink` extend `ProgramSeedLink` cleanly (look at the `ProgramSeedLink` interface in ProgramPrintLinkIndexEngine.ts ~line 134, must be a strict superset). Does `AugmentStats` carry every channel an operator needs (cadEntriesScanned, malformedEntries, skippedNonMillFormat, skippedNonMillCategory, alreadyJoined, noCandidates, newLinks, stillOrphan, buildMs)?

3. **FAIL-LOUD invariants (CLAUDE.md R12)** — null/undefined joinIndex must throw; non-array `masterIndex.files` must throw; malformed entries must be COUNTED into `stats.malformedEntries`, not silently dropped at zero. Verify those branches exist + do the right thing.

4. **Determinism** — given input MasterIndex + JoinIndex, the output must be deterministic. Look for an
... [+2119 chars truncated]

### Assistant | 2026-05-15T18:10:12.693Z

I'll perform a thorough per-file scrutiny review of the new engine.

### Assistant | 2026-05-15T18:10:13.296Z

[tool_use: Read]

### User | 2026-05-15T18:10:19.906Z

[tool_result] 1	/**
2	 * CADArchiveJoinAugmenterEngine — MS-PRINT-PROGRAM-LOOP / U-PPL-D4 (Track D)
3	 *
4	 * Bridges the CAD-archive master-index (`CADFileIndexerEngine` output —
5	 * `data/state/cad-file-index/master-index.json`) into the print↔program v6
6	 * join (`BlueprintProgramJoinEngine` / `ProgramPrintLinkIndexEngine.JoinIndex`)
7	 * so the join stops missing CAD-side hits (the envelope brief notes on
... [+22206 chars truncated]

### Assistant | 2026-05-15T18:10:27.297Z

Now I need to verify the kernel contract (Step 5 zip-miss hinges on whether `buildProgramSeedAugmentation` emits original or normalized paths) and the ProgramSeedLink interface shape.

### Assistant | 2026-05-15T18:10:28.830Z

[tool_use: Read]

### Assistant | 2026-05-15T18:10:30.008Z

[tool_use: Read]

### Assistant | 2026-05-15T18:10:30.934Z

[tool_use: Read]

### Assistant | 2026-05-15T18:10:31.606Z

[tool_use: Read]

### User | 2026-05-15T18:10:38.870Z

[tool_result] 120	  };
121	}
122	
123	export interface LoadLinkIndexOptions extends LoadJoinIndexOptions {
124	  /**
125	   * Optional list of program file paths to feed the program-side seed. When omitted, the
126	   * composite index is built with `seedLinksByPath` empty — operators wire the program list
127	   * from `jm-die-index-v2.json` via callers (see coverageReport's `inputProgramPaths`).
128	   */
129
... [+2229 chars truncated]

### User | 2026-05-15T18:10:43.421Z

[tool_result] 400	  let noCandidates = 0;
401	  let stillOrphan = 0;
402	
403	  // Runtime guard — TypeScript's `readonly string[]` is compile-time only. A dispatcher
404	  // round-trip can deliver null/undefined/{}/a Promise from JSON-parsed payload and the
405	  // for-of below would throw "is not iterable". FAIL-SOFT: empty result with zeroed stats
406	  // is the documented "no inputs supplied" behavior — 
... [+3219 chars truncated]

### User | 2026-05-15T18:10:45.030Z

[tool_result] 1	/**
2	 * cadFileIndexSchema — Zod schemas for CADFileIndexerEngine (U-CINF01)
3	 *
4	 * Defines the master index and per-file metadata shapes written to
5	 * data/state/cad-file-index/master-index.json.
6	 *
7	 * schemaVersion: 1 — must increment when any field is added/removed.
8	 *
9	 * @module schemas/cadFileIndexSchema
10	 */
11	
12	import { z } from "zod";
13	
14	// ── Supported CAD/CAM fil
... [+3696 chars truncated]

### User | 2026-05-15T18:10:48.871Z

[tool_result] 1	/**
2	 * BlueprintProgramJoinEngine — Phase 8 → JM Die program join table
3	 *
4	 * Joins blueprint pages extracted by Phase 8 (cleaned JSONL with
5	 * part_numbers_clean) to JM Die program/CAD files indexed by:
6	 *   - program-labels.json   (mcp-server/data/state/program-labels.json,
7	 *                            real lathe labels with filePath/customer/etc)
8	 *   - master-index.json     (d
... [+2436 chars truncated]

### Assistant | 2026-05-15T18:10:55.926Z

Now I have everything I need. Critical finding on the zip-miss path:

Line 454 of `ProgramPrintLinkIndexEngine.ts`: `program_path: rawPath` — emits the ORIGINAL string verbatim, NOT `pathKey` (normalized). So the engine's map keyed on `e.absolutePath` will hit. **Zip is sound.** Good.

Let me verify the `ProgramSeedLink` interface for the "strict superset" claim.

### Assistant | 2026-05-15T18:10:57.416Z

[tool_use: Grep]

### Assistant | 2026-05-15T18:10:59.088Z

[tool_use: Grep]

### User | 2026-05-15T18:10:59.642Z

[tool_result] 81:export interface ProgramSeedLink {
82-  program_path: string;
83-  program_filename: string;
84-  /** Raw PN extracted from the filename (before enhanced normalization). */
85-  raw_candidate: string;
86-  /** Normalized PN that matched into joinIndex.byNormalizedPN. */
87-  matched_normalized_pn: string;
88-  \** Confidence of the rescue: "filename_exact" when raw filename token == joined PN; 
... [+254 chars truncated]

### User | 2026-05-15T18:11:03.391Z

[tool_result] 550:// FAIL-LOUD policy (CLAUDE.md R12): loadJoinIndex throws on a missing join file
551-// AND on a file that exists but yields zero valid rows — a success-shaped empty
552-// index is worse than an error because every query then silently returns
553-\ found:false and nothing tells the operator the file was corrupt/half-written.
--
833:export async function loadJoinIndex(options: LoadJoinIndexOpt
... [+236 chars truncated]

### Assistant | 2026-05-15T18:11:42.144Z

Acknowledged on both reminders. Per-file scrutiny review complete — verdict below.

---

## CADArchiveJoinAugmenterEngine — Per-File Scrutiny Verdict

**File:** `H:/prism-slot-delta/mcp-server/src/engines/CADArchiveJoinAugmenterEngine.ts` (~515 lines)
**Verdict:** **PASS with 2 P1 fixes recommended before final commit.**

### P0 blockers
None. Composition is sound. Zip-miss invariant verified — see Q5.

### P1 — fix before commit

**P1-A. `isUsableEntry` over-narrows to `CADFileEntry` (Q7 — soundness bug).**
Lines 225-238. The guard returns `e is CADFileEntry` but only verifies 4 of 8 schema fields (`absolutePath`, `format`, `customer`, `machineCategory`). Downstream code at lines 373-378 reads `e.fileId` / `e.sizeBytes` / `e.complexityHint` and trusts the narrowing — TypeScript will NOT re-flag those as `unknown`. If a real-world malformed entry has a valid `absolutePath` but a numeric `fileId` (or missing `sizeBytes`), it slips through and the emitted `CADAugmentedLink.cad_file_id` is `undefined`/wrong-typed despite the type signature claiming `string`. Per CLAUDE.md R12 (fail loud), this is a silent-corruption channel.
**Fix:** Either (a) extend `isUsableEntry` to validate all 8 fields actually accessed (`fileId: string + length 64`, `sizeBytes: number + finite + >=0`, `complexityHint: string in COMPLEXITY_HINTS`, `lastModified: string`), or (b) drop the `is CADFileEntry` predicate, return `boolean`, and access enriched fields via fresh narrowing with explicit fallback-counting into `malformedEntries`. (a) is simpler and matches the rest of the design.

**P1-B. zipMisses bucketed into `stillOrphan` muddies the operator signal.**
Lines 392-394. A zipMiss means "the base kernel emitted a link for a path I gave it but my own map can't find that path" — this is an internal-invariant violation (an engine bug), not a stillOrphan (which means "no PN matched"). Bucketing them together hides the bug.
**Fix:** Add a dedicated `zipMisses: number` field to `AugmentStats` (in
... [+3506 chars truncated]
