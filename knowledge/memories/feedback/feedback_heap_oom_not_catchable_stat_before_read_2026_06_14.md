---
name: heap-oom-not-catchable-stat-before-read-2026-06-14
description: FLEET-WIDE (slot:bravo 2026-06-14) — a try/catch around readFileSync catches the V8 512MB string-cap THROW but NOT heap-OOM from accumulating large strings (OOM is fatal, not catchable). A recursive file scan must stat-and-skip oversized files BEFORE reading. From U-CROSS-PC-VERIFY-CLI-BOUND (59c4ca58f6).
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.429Z
aliases: feedback_heap_oom_not_catchable_stat_before_read_2026_06_14
---


2026-06-14 (slot:bravo) — `scripts/cross-pc-handoff-verify.mjs` CLI full-audit OOM'd (`<--- Last few GCs --->`) even though its `scanFile` wrapped `readFileSync` in try/catch.

## Why the try/catch did NOT save it
Its recursive `state/shared` scan readFileSync'd 700MB+ generated dumps (system-graph.json 711MB, tribal-embed shards 480MB). Two distinct failure modes, only one catchable:
- **V8 string-cap THROW** (a single file > `0x1fffffe8` = 536,870,888 B): `readFileSync(..., "utf8")` THROWS `Cannot create a string longer than...` -> **catchable** (the try/catch handles it).
- **Heap exhaustion** (accumulating many hundred-MB strings, or one between the heap limit and the string cap): the process OOMs -> **NOT catchable** (a fatal V8 abort, no exception to catch). `--max-old-space-size` only moves the wall.

## The fix (reusable)
**Stat-and-skip oversized files BEFORE reading.** `statSync(p).size` reads inode metadata only (never loads content), so you gate on size without allocating. Pure exported `partitionBySize(files, statSizeFn, cap)` -> `{scan, skipped}`; only `scan` is read. Default cap 16MB (legit handoffs are KB; the dumps are 100s of MB). R12: REPORT the skipped files (count+names+sizes) -- never silently truncate the audit; label them "content UNVERIFIED" not "clean" (we did not read them, so we cannot assert they're clean). Knob PRISM_CROSS_PC_VERIFY_MAX_BYTES. Live: CLI exit 0 (was OOM), 26 skipped.

**LESSON: any recursive file scan that might encounter large generated artifacts must size-gate before readFileSync. A try/catch is a false sense of safety -- it catches the string-cap throw, not the heap-OOM.** Sibling V8-string-cap incidents: [[reference_tribal_index_v8_string_cap_2026_06_08]]. → [[reference_cross_pc_verify_wire_2026_06_14]]
