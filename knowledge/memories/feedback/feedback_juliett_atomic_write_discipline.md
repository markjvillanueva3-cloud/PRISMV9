---
name: feedback_juliett_atomic_write_discipline
description: Standing rule — every multi-writer JSON path goes through atomicWriteJson with finally-unlink of the tmp
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.431Z
aliases: feedback_juliett_atomic_write_discipline
---


**Standing rule (juliett / database-expansion):** any JSON/state file that **more than one chat or process can write** MUST go through `atomicWriteJson` (`scripts/lib/atomic-json.mjs`: write-tmp + rename, lockfile-guarded) — never a bare `fs.writeFileSync`.

**Why:** the multi-writer race is PRISM's most-recurring persistence bug. `roadmap-index.json` had 5 writers (3 non-atomic) → interleaved partial writes (DEV-TOOL-CONFLICT-AUDIT F4). `system-graph.json` had 3. A bare `writeFileSync` from two chats produces last-writer-wins corruption with no error.

**How to apply:**
- Hunt: `grep -rn 'writeFileSync|fs\.writeFile\b' mcp-server/src scripts` → any shared path is a finding.
- Convert to `atomicWriteJson`; designate ONE canonical writer for regenerated indexes.
- The tmp+rename is only safe if the tmp is unlinked in a `finally` on failure — otherwise you get the [[reference_juliett_tmp_orphan_leak_2026_05_29]] 16-GB leak class.
- Read it back after writing (a write is not "done" until a query-side read confirms it — see [[feedback_juliett_readback_smoke_test]]).
