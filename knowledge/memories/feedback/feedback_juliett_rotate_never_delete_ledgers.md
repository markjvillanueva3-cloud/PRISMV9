---
name: feedback_juliett_rotate_never_delete_ledgers
description: Standing rule — JSONL ledgers are rotated, never deleted (telemetry value); a tmp orphan is different
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.431Z
aliases: feedback_juliett_rotate_never_delete_ledgers
---


**Standing rule (juliett / database-expansion):** an append-only JSONL ledger that "got too big" is **rotated, never deleted**. Ledgers (`AGENT_CHAT.jsonl`, `.fleet-reaper-*.jsonl`, `goal-gate-bypasses.jsonl`, tribal corpora) carry telemetry/audit value that has no other source.

**Why:** deleting a ledger throws away the only record of what happened — the bypass audit trail, the reaper kill history, the chat bus. "It's big" is a rotation problem, not a delete problem. Aligns with [[feedback_never_delete_only_disable]].

**How to apply:**
- Big ledger → rotate to `<name>.<date>.jsonl` (or size-segment) and start a fresh active file; keep the archive.
- **Distinguish a ledger from a tmp orphan:** a `<path>.<pid>.tmp` from a crashed atomic write (see [[reference_juliett_tmp_orphan_leak_2026_05_29]]) IS safe to sweep — by age + dead-PID, never blindly — because it's dead scratch, not telemetry. The rule protects the canonical ledger, not its failed-write scratch files.
