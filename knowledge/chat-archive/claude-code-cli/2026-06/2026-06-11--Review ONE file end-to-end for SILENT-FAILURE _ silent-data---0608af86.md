---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "Review ONE file end-to-end for SILENT-FAILURE / silent-data-gap risk: `H:\\prism-"
date: "2026-06-11"
first_ts: "2026-06-11T16:15:55.851Z"
last_ts: "2026-06-11T16:16:55.237Z"
cwd: "H:\\prism-slot-sierra"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a5e20e9303accfc0b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review ONE file end-to-end for SILENT-FAILURE / silent-data-gap risk: `H:\prism-

> **claude-code-cli** | 2026-06-11 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a5e20e9303accfc0b.jsonl`

## Transcript

### User | 2026-06-11T16:15:55.851Z

Review ONE file end-to-end for SILENT-FAILURE / silent-data-gap risk:
`H:\prism-slot-sierra\scripts\build-corpus-vault-index.mjs`

UNIT (U-HDRIVE-EVERY-FILE, slot:sierra): this generator indexes the H: knowledge corpora into an Obsidian vault + a queryable substrate JSON. This change ADDED a "full-drive" denylist mode: when `opts.driveRoot` is set, instead of a curated 7-root allowlist it walks EVERY H:/ top-level dir + loose root file EXCEPT documented noise. New exports: `classifyDriveEntry(name)` (pure include/exclude with a reason) and `discoverHdriveRoots(driveRoot,{_fs})` (partitions into included/excluded/looseFiles; fail-soft on unreadable root). `buildCorpusIndex` gained the `opts.driveRoot` branch (merges discovered roots + the under-PRISM `resources` sub-root, dedupes by lowercased path, streams loose root files, records `excludedRoots`/`discoverError` in the substrate, and the vault coverage note lists exclusions data-driven). Real run: driveRoot='H:/', output JSONL gitignored under H:/prism-slot-sierra (a prism-slot-* worktree, which classifyDriveEntry EXCLUDES, so no self-count).

Hunt specifically for SILENT failures:
1. Any place a root/file is dropped WITHOUT being surfaced in excludedRoots / a warn / discoverError (R12 — silent exclusion reads as "covered everything").
2. discoverHdriveRoots fail-soft: if readdir throws, does buildCorpusIndex still produce a coherent (honest, non-misleading) substrate, or does it silently claim full coverage with zero roots?
3. The dedupe seen-set: could it silently drop a legitimately-distinct root, or fail to dedupe the real H:/PRISM/resources vs a discovered duplicate?
4. statSync catch-swallow on loose files / walked files — is "count even if stat fails" acceptable (size 0) or does it hide a real read failure that should surface?
5. Could the full-drive walk silently include the output JSONL or a 2nd repo clone and inflate counts without the operator knowing?

Report ONLY P0/P1 with file:line. Grade PASS or FAI
... [+30 chars truncated]

### Assistant | 2026-06-11T16:15:59.726Z

I'll read the file end-to-end before reporting.

### Assistant | 2026-06-11T16:16:00.112Z

[tool_use: Read]

### User | 2026-06-11T16:16:02.229Z

[tool_result] 1	#!/usr/bin/env node
2	// build-corpus-vault-index.mjs -- SIERRA-VAULT-OPS / U-CORPUS-VAULT-INDEX (2026-06-10, slot:sierra)
3	//
4	// Indexes the two big H: knowledge corpora into the Obsidian vault + a queryable substrate:
5	//   - Docustrata: 111,745 ALREADY-OCR'd documents. Read its manifest.json (+ .index/ jsonls).
6	//     NEVER re-OCR (critical-resource-roots doctrine) -- we only read the e
... [+29857 chars truncated]

### Assistant | 2026-06-11T16:16:55.237Z

Full read complete. Here is the audit.

---

GRADE: FAIL

---

**P0-1 — Silent stat-failure on loose root files hides unreadable files but counts them**

`H:\prism-slot-sierra\scripts\build-corpus-vault-index.mjs:439`

```js
try { size = (opts._fs || fs).statSync(full).size; } catch { /* count even if stat fails */ }
```

The same silent-swallow pattern exists inside `walkRoot` at line 341. Both emit the file into the JSONL with `size: 0` and increment `hdriveTotalFiles` and `rootFiles` without any log entry. The operator receives a file count that silently includes files that could not be read. A permission-denied or I/O error on a file is indistinguishable from a legitimately zero-byte file. This is a data-quality gap dressed as R12 compliance: the substrate claims N files were indexed when some subset may be ghost entries.

The `walkRoot` comment at line 341 says "count even if stat fails" as if that is intentional policy, but it is not documented in the substrate or the vault note. The JSONL rows with `size: 0` are not flagged as unreadable vs. genuinely empty.

Recommendation: Catch stat failures separately, emit to a `statErrors` counter, surface that counter in the substrate under `hdriveFiles.statErrors`, and log a `console.warn` per failure. The row should carry `sizeKnown: false` so consumers do not treat `size: 0` as fact.

---

**P0-2 — `discoverError` is set but `effectiveRoots` silently becomes an empty array — substrate claims full coverage**

`H:\prism-slot-sierra\scripts\build-corpus-vault-index.mjs:393-403`

When `discoverHdriveRoots` returns with `error` set (drive root unreadable), `discovered.included` is `[]`. The code then builds `effectiveRoots = [...[], ...underPrism]` — only the single `resources` sub-root. No warning is printed. Execution continues. The substrate records `discoverError` (line 482) which is correct, but the vault note `hdrive-full-index.md` is still written with the heading "H: Drive Full File Index (N files across the know
... [+6298 chars truncated]
