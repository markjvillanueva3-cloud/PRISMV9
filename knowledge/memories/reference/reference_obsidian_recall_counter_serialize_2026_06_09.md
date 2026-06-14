---
name: reference_obsidian_recall_counter_serialize_2026_06_09
description: "Fixed the wiki-recall-counts.json lost-update race (context-retention): recall-counter-track + wiki-recall-on-write both did an unlocked load->mutate->writeStateAtomic on the SAME file → under the 26-chat fleet, increments silently dropped (atomic-rename guards corruption, not lost updates). Wrapped both RMW in withExclusiveLock on a shared lock path. 3-of-3 PASS. Lesson: withExclusiveLock returns {ran,value} — unwrap .value or the caller contract breaks."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.232Z
aliases: reference_obsidian_recall_counter_serialize_2026_06_09
---


# Recall-counter RMW serialization (2026-06-09, slot:alpha)

Commit `01c3b15f56` ([OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-COUNTER-SERIALIZE).
Discovery queue item #4; the race was specced + scrutiny-flagged 2026-05-16
([[reference_recall_counter_concurrency_finding_2026_05_16]]). Context-retention clause.

## The bug
`recall-counter-track.mjs` (PostToolUse:Read) + `wiki-recall-on-write.mjs`
(PostToolUse:Write/Edit) both increment `mcp-server/data/state/wiki-recall-counts.json`
via `loadState → mutate → writeStateAtomic` (temp+rename). The atomic rename guards
CORRUPTION but NOT lost increments: under 26 concurrent chats — A loads count=5, B
loads 5, A writes 6, B writes 6 → one increment dropped. The counter sizes /system-viz
L10 nodes (log10(count+1)) + feeds weekly-synthesis hot-entry review, so dropped counts
clip the compounding recall signal (a retention degradation).

## The fix
Wrap BOTH hooks' RMW in `withExclusiveLock` (`scripts/lib/exclusive-file-lock.mjs`,
real cross-process O_EXCL, its own 11/11 oracle) on a SHARED lock path
(`STATE_FILE + ".lock"`, byte-identical in both) → mutual exclusion. `ran:false`
(lock held through the 2.5s retry window) → skip one increment (acceptable vs
corruption) + preserve the `{ok:false}` contract. Lock after the cheap reject guards
(no hot-path latency tax). No self-deadlock (disjoint Read vs Write matchers, separate
subprocesses). 4 R9 tests + functional (2x→count=2); 3-of-3 scrutiny PASS.

## LESSON (R15 validate caught it mid-build)
`withExclusiveLock(path, fn)` returns `{ran, value:fn(), path, stolenStale}` — NOT
the raw `fn()` result. My first wrap returned the WRAPPER, breaking the
`{ok,key,count}` caller-contract (`count=${count}` → `[object Object]`). Functional
validation caught it; fixed by unwrapping `.value` + handling `ran:false`, pinned by
a `assert.equal(r.ran, undefined)` no-wrapper-leak regression oracle. **Anyone wrapping
an RMW in withExclusiveLock must unwrap `.value` + handle `ran:false`.**

## RESIDUAL (honest, R12)
`WikiRecallCounterEngine.ts` (rarer MCP-process writer of the same file) is NOT yet on
the shared lock — needs a `.ts` build. The DOMINANT race (hook-vs-hook, every Read/Write
× 26 chats) is closed; engine-vs-hook is rare. Follow-up: lock `recordRecall` on the
same path + build. Pairs with this session's [[reference_obsidian_wikilink_dangling_fix_2026_06_09]].
