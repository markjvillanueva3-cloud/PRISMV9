---
name: reference-recall-counter-concurrency-finding-2026-05-16
description: 3-of-3 scrutiny arm C surfaced wiki-recall-counts.json multi-chat write race — load-bearing follow-up unit candidate
aliases: reference_recall_counter_concurrency_finding_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.144Z
---


Scrutiny arm C (code-analyzer) on session ms3-a2-2026-05-16-charlie flagged this:

`mcp-server/data/state/wiki-recall-counts.json` is written by **two** PostToolUse hooks now (read-side `wiki-recall-on-read.mjs` and write-side `wiki-recall-on-write.mjs`, the latter wired this session). Both call `WikiRecallCounterEngine.recordRecall()` (or the in-hook mirror of it) which does `loadState → mutate → writeStateAtomic(temp + rename)`. The atomic-rename idiom prevents FILE CORRUPTION but does NOT serialize the read-modify-write — so if N concurrent chats fire PostToolUse simultaneously they all `loadState` at roughly the same time, each increments locally, each renames their copy → **last-rename-wins**, all but one increment silently dropped.

This is pre-existing in `WikiRecallCounterEngine` (since OBSIDIAN-VIZ-MS0/U-RECALL-COUNTER) — NOT introduced by A2. But A2 doubles the firing surface (now both Read AND Write/Edit/MultiEdit fire on every tool call), so the race window widens. With the 10-chat fleet design and PostToolUse firing on every Edit, the loss rate becomes meaningful — the "compounding" signal the counter exists to surface gets clipped.

**Mitigations (need decision):**
1. **fs.openSync(stateFile, "r+") + flock** — POSIX-style advisory file lock around read+write. Works on Windows via `proper-lockfile` or similar. Simplest, no schema change.
2. **Append-only JSONL** at `wiki-recall-events.jsonl` — every PostToolUse appends one event line atomically (atomic append is OS-guaranteed for small writes); a separate compactor cron rolls events into the snapshot JSON every N minutes. Survives concurrent writes cleanly. Schema change required for downstream consumers (system-viz, recall ranking).
3. **prism_context:claim_file lock** — the existing distributed-lock surface the wiki writers already use. Heaviest, but consistent with the rest of the multi-chat architecture.

**Proposed follow-up unit:** `U-RECALL-COUNTER-CONCURRENCY-FIX` (S/M, ~60-90 min):
- Option 2 (JSONL + compactor) likely best fit per PRISM idiom; preserves snapshot-shape for read consumers, atomic-by-design for writers.
- Acceptance: 10 simulated concurrent recordEvent calls produce 10 increments (not 1-9 with drops).

**Verification gap surfaced by the gate, not by A2 ship.** A2 wired the hook correctly per spec; the concurrency issue is a deeper architectural choice that A2 made more visible. Honest separation:
- ✅ A2 shipped — wiring is correct, hook fires, tests pass
- ⚠ A2 expanded the race window of a pre-existing concurrency bug
- ⚠ New follow-up unit needed before the recall signal can be trusted under multi-chat load

See [[reference_ms3_a2_settings_wiring_2026_05_16]] for the A2 close-out details.
