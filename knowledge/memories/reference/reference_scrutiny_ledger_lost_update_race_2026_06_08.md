---
name: reference_scrutiny_ledger_lost_update_race_2026_06_08
description: SCRUTINY_LEDGER.json has a lost-update race under concurrent fleet writes — mark-opus/claude/analyst marks get clobbered by peer whole-file rewrites; the writer has no lock/atomic guard
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.150Z
aliases: reference_scrutiny_ledger_lost_update_race_2026_06_08
---


**Observed by slot:romeo 2026-06-08 (CATALOG-APP-WIRING-MS0 session).**

After a legitimate 3-of-3 scrutiny PASS (3 reviewer agents all returned PASS with concrete file:line evidence), recording the verdicts via `node .claude/scripts/scrutiny-3way.mjs --mark-opus/--mark-claude/--mark-analyst pass --session-id <sid>` **succeeded per-command but the ledger entry kept disappearing** — verified absent after 3 full re-mark loops.

**Root cause:** `mcp-server/data/state/SCRUTINY_LEDGER.json` is a single shared file keyed by session id. The ledger writer (`.claude/scripts/lib/scrutiny-ledger.mjs`) does a read-modify-write of the WHOLE file with NO lock/atomic guard (no `withLock`, no atomic-rename). Under fleet load (8+ concurrent chat trees this session, peers actively committing + scrutinizing), a peer's whole-file write between my read and my write drops my session's entry — a classic lost-update race. The file stays valid JSON (3 sessions) but mine is gone.

**Same class** as the other shared-JSON contention this session: chat-slots.json slot rebinding (echo/charlie churn misattributing romeo) and the commit-coordinator lane. The shared-tree fleet has several unguarded shared-state files with lost-update races.

**Mitigation today:** the scrutinize-before-stop gate has a designed escape — "After 3 block attempts the gate auto-passes with a warning." So a legitimately-passed scrutiny that can't persist its ledger entry still clears Stop via auto-pass. The work itself is sound (3-of-3 verified); only the bookkeeping was lost.

**Fix (infra/golf galaxy):** wrap the ledger read-modify-write in `DistributedLockManager.withLock("scrutiny-ledger", fn)` OR convert to per-session sidecar files (`SCRUTINY_LEDGER/<sid>.json`) so concurrent sessions never write the same file — the same pattern oscar used for the data-spine EPERM fix (appendFileSync over read-rewrite-rename, commit 5ae481f748) and the chat-slots lock-orphan fix. Related: [[reference_shared_tree_commit_contamination_2026_06_08]].
