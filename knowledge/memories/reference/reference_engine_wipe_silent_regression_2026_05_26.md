---
name: engine-wipe-silent-regression-2026-05-26
description: "Silent engine wipe in slot/delta WIP — 2 engines (AIDecisionExplanationEngine 1279L + AIFeatureAutoRegistryEngine 690L) emptied to 0 bytes uncommitted; recovered via git checkout HEAD"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.568Z
aliases: reference_engine_wipe_silent_regression_2026_05_26
---


# Silent engine-wipe regression (slot:delta 2026-05-26)

Discovered during /checkin-delta reorient. Two production engines in `H:/prism-slot-delta/mcp-server/src/engines/` were emptied to 0 bytes in the uncommitted working tree at some point during delta's 5/25 CAD-PIPELINE-WIRE-MS0 marathon (iter+73..+82) — and the slot went idle for ~16h with the destructive WIP untouched, never committed.

## Affected files

| File | Lines at HEAD | Lines in WIP | Last commit touching |
|---|---|---|---|
| `mcp-server/src/engines/AIDecisionExplanationEngine.ts` | 1279 | **0** | `9dee8736ad` U-ENGINE-FOSSIL-2 |
| `mcp-server/src/engines/AIFeatureAutoRegistryEngine.ts` | 690 | **0** | (added in same FOSSIL-2 absorb) |
| `mcp-server/src/engines/WEDMLoRADatasetBuilderEngine.ts` | 0 (fossil stub) | 0 | `6ec393cf41` U-EFF16 |

WEDMLoRA was a pre-existing fossil stub (0 bytes is its committed state) — not part of this regression. The two AI engines were the silent kill: 1969 lines of production code that **would have been lost if slot/delta had been merged or another peer had committed atop the empty files**.

## Detection chain

1. /checkin-delta reorient → `git status` of slot/delta → 44 modified, 6663 untracked.
2. `git diff --stat HEAD` revealed `-1279` and `-690` on the two engines.
3. `wc -l` confirmed both at 0 bytes on disk.
4. `git show HEAD:<file> | wc -l` confirmed HEAD had the full 1279 / 690.
5. Working-tree state was destructive; HEAD was canonical.

## Recovery

```bash
git -C H:/prism-slot-delta checkout HEAD -- \
  mcp-server/src/engines/AIDecisionExplanationEngine.ts \
  mcp-server/src/engines/AIFeatureAutoRegistryEngine.ts
```

No new commit required — the checkout restored the working tree to match HEAD; the regression existed only in the uncommitted WIP, never in committed history. The other 42 modified files + 6663 untracked are real delta CAD work and remain untouched.

## Likely cause

Cannot be pinpointed from the artifact alone, but the suspect-set:

- Interrupted "absorb fossil engines" run (U-ENGINE-FOSSIL-2 pattern wrote a placeholder 0-byte file before content stream, crashed before completion). The original FOSSIL-2 commit *added* these — a re-run that crashed mid-write could have truncated them.
- Edit-tool race (two chats writing the same file via Edit/Write — one wrote empty content first; the other never landed).
- IDE save-on-blur over a stale buffer.

## Hardening (deferred — surfaced as candidate units)

- **U-ENGINE-ZERO-BYTE-GATE** — Stop hook that scans `mcp-server/src/engines/*.ts` for size-0 files that had non-zero size at HEAD; block Stop with "engine emptied uncommitted" failure. (Strictly additive to comprehensive-build-enforce.)
- **U-SLOT-IDLE-WIP-AUDIT** — Cron task that surfaces slots with destructive WIP older than 4h (file-at-HEAD non-zero AND working-tree-zero AND lastHeartbeat-age > 4h).

## Lesson

R12 fail-loud caught this; the slot's silent idle did not. A wiped engine in WIP with no peer commit on top is recoverable from HEAD — but only if SOMEONE looks. Without /checkin-delta reorient, this could have been merged or built on top of (engine resolution would fail at tsc time, but the destructive intent would still propagate to the commit).

Related: [[feedback_missing_file_copy_back]] (restore from canonical source), [[feedback_always_capture_lessons]] (4-piece mistake-learning), [[feedback_always_update_wiki_on_bug_finding]] (regression → wiki gate fires).
