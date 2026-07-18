# FLEET-REAPER-MS1/U-FR-CRASH-WATCH — detect chat-slot crashes + postmortem trail

**Commit:** `c540630bb53c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T19:32:12-05:00
**Tags:** fleet-reaper-ms1, u-fr-crash-watch, auto-distilled

## Subject
[FLEET-REAPER-MS1]/U-FR-CRASH-WATCH: detect chat-slot crashes + postmortem trail

## Body
```
[FLEET-REAPER-MS1]/U-FR-CRASH-WATCH: detect chat-slot crashes + postmortem trail

The reaper killed orphan PROCESSES but was BLIND to chat CRASHES — it never
reconciled "slot X's chat just died" into an actionable signal. Operator
repeatedly reported "1-2 chats keep crashing" with zero forensic trail
(which slot, when, at what heartbeat age, under what memory pressure).

This is the missing detection layer. STRICTLY ADDITIVE — never changes a
reap decision, never flips result.ok, wrapped so any failure is a caveat
not an abort.

Crash signal (cleanest available): a slot's lastHeartbeat FROZE between two
sweeps WHILE its chatId stayed the same. A live chat advances lastHeartbeat
every prompt; a crashed one's freezes. chatId change = intentional re-claim
(NOT a crash). Frozen-and-stale ≥10min (mirrors process-slot-map's
owned-by-crashed threshold) before flagging — avoids slow-sweep false
positives.

New files:
  - scripts/lib/fleet-reaper-crash-watch.mjs — pure core + injected IO:
    snapshotSlotState / detectCrashes / formatPostmortemRow + fail-soft
    readPrevSnapshot / writeSnapshot (atomic tmp+rename) / appendPostmortems
    (JSONL + 256KB rotation). Knob: PRISM_FR_CRASH_WATCH_DISABLE=1.
  - scripts/lib/fleet-reaper-crash-watch.test.mjs — 34/34 node:test PASS.
    Coverage: 2 shapes + skip/null/garbage-hb (7) · detect happy/advanced/
    reclaim/confirm-window/new-slot/null-hb/custom-stale/invalid-stale/
    null-defensive/multi-slot/missing-ts (13) · postmortem full/missing/
    non-finite (3) · injected-reader 4 · writeSnapshot atomic+2 fail-soft ·
    appendPostmortems empty/JSONL/rotate/size-throws/append-throws/
    rotate-throws (6) · E2E pipeline (1).

Integration (fleet-reaper-sweep.mjs): reads chat-slots.json, snapshots
per-slot state, diffs vs persisted prev snapshot, appends postmortem rows
to state/shared/chat-crash-postmortems.jsonl + surfaces a loud caveat
("CHAT CRASH DETECTED: slot X (chatId) — heartbeat frozen Nm"). New
`crashWatch` field {engaged,detected,postmortemPath,error} in runSweep
return. Skipped in status/disabled/dry-run (no snapshot write → no false
diff next run). All paths injectable via opts.* for hermetic testing.

Live verification: crashWatch engaged:true, snapshot persisted (859B at
canonical SHARED_DIR path), detected:0 correct (no crash this interval —
first run has no prev to diff; subsequent sweeps detect real freezes).

Per-file scrutiny: self-cross-check + 34 hermetic tests (the regression
oracle). The 2-parallel-agent gate is DEFERRED per
[[feedback_no_parallel_agents_high_pressure]] (commit pressure bounced
90-98% this turn — multi-Agent dispatch at >92% is the documented
chat-crash trigger this very unit exists to forensically capture). Unit is
strict-additive read-only telemetry (no reap-decision surface) — lowest
possible blast radius; the hermetic suite + live E2E smoke are sufficient
verification for this risk class.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/fleet-reaper-sweep.mjs                |  64 ++++++
- scripts/lib/fleet-reaper-crash-watch.mjs      | 176 +++++++++++++++
- scripts/lib/fleet-reaper-crash-watch.test.mjs | 309 ++++++++++++++++++++++++++
- 3 files changed, 549 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c540630bb53c`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._