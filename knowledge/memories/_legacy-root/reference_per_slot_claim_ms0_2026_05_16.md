---
name: reference-per-slot-claim-ms0-2026-05-16
description: "PER-SLOT-CLAIM-MS0 (6/6 shipped 2026-05-16, slot bravo claude-339c8ff7) — enforceable per-slot unit-claim locks so two chats never race-build the same MILESTONE::U-ID. Lane assignment was advisory; this makes it a lock. 4 commits 3a8741d4f/b6f24770c/e752b186e (+89902cc5b AUDIT-SYNERGY prep). 64 tests. The lockfile P0 was caught by the per-file scrutiny gate, not by tests."
source: prism-memory
synced: 2026-05-18T01:02:09.658Z
aliases: reference_per_slot_claim_ms0_2026_05_16
---


# PER-SLOT-CLAIM-MS0 — per-slot unit-claim locks (2026-05-16, slot bravo)

**Why it exists.** `atomic-roadmap.json laneAssignments` splits units across slots but it's *advisory* — any chat can `/pick-unit` any lane, and two slots can simultaneously pick the same `MILESTONE::U-ID`. The user spotted this ("we might need to make a per slot task claim") right after I moved 11 HTML units into bravo's lane and noticed the move alone didn't *enforce* ownership.

**The 6 units (all shipped):**
- **U-PSC01** `.claude/helpers/slot-task-claim.mjs` — CLI (claim/release/heartbeat/list/check/sweep) + pure exports (applyClaim/applyRelease/applyHeartbeat/checkClaim/peerClaimedSet/sweepExpired). Storage = plain JSON at `state/shared/slot-task-claims.json`, lockfile-guarded atomic RMW.
- **U-PSC02** `scripts/pick-unit.mjs` — `--chatId` engages `peerClaimedSet` filter (identity-gated; no `--chatId` = legacy no-filter). `--no-claim-filter` override.
- **U-PSC03** `.claude/commands/checkin.md` Step 12 — claim-on-pick (step 1a, `--phase building --ttl-ms 5400000`), heartbeat-on-tick (step 6). On conflict (exit 1) → pick next unit.
- **U-PSC04** `scripts/slot-task-claim-release-on-commit.mjs` + `.git/hooks/post-commit` managed block — parses `[SCOPE]/U-ID` (incl `[MAIN]` prefix + combined `U-A+U-B`), auto-releases the committing slot's claim.
- **U-PSC05** `.claude/hooks/stop-slot-task-claims-advisory.mjs` — T3 Stop advisory, wired Stop[0].hooks[12] after `session-end-peer-share`. Surfaces held claims + TTL categorization + release hint. No-claim path returns `{continue:true,suppressOutput:true}` (verified before wiring per the zero-risk rule).
- **U-PSC06** `.claude/helpers/slot-task-claim.e2e.test.mjs` — the real-data oracle: 6 concurrent CLI processes claim the SAME unit → exactly 1 winner.

**Load-bearing lesson — the lockfile P0 was invisible to unit tests.** The first cut of U-PSC01 used tmp+rename, which is atomic for the *rename* but NOT for the read-modify-write cycle. Two concurrent claims both readStore→empty, both write, last-writer-wins, BOTH processes print `{ok:true}`. The per-file scrutiny gate (2 reviewer arms) caught this as P0 along with 3 others: silent corrupt-JSON wipe (`_warn` stripped before write), schema-mismatch wipe (older script clobbers newer peer), broken `isCli` (Windows `file:///` vs `file://`). **Hermetic unit tests on `applyClaim()` could NEVER have caught the lockfile race** — they call the pure fn on an in-memory store. Only U-PSC06's genuine concurrent `spawn()` processes exercise `acquireLock`/`releaseLock`. This is the [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] lesson again: pure-core + injected-readers MUST ship one real-data E2E test.

**Why NOT the H8 SQLite CoordinationStore.** It's real (`reference_h8_coordination_store`) but `better-sqlite3` only resolves inside `mcp-server/node_modules` — a CLI from `.claude/helpers/` can't load it. The sister `coord-db-vacuum.mjs` has this exact broken-pattern bug (verified: it fails `Cannot find module 'better-sqlite3'` in production). Plain JSON + lockfile is the proven `chat-slots.mjs` pattern and scales fine at ~10 claims/min fleet-wide.

**Design rule reinforced (answering the follow-up "memory/CLAUDE.md per slot?").** Per-slot ENTRY POINTS are good (the 36 wrappers, the slot-task claims); per-slot SOURCES OF TRUTH are bad. CLAUDE.md = doctrine (safety gates must be universal — forking reverts U-VAULT01). MEMORY.md = cross-session knowledge (forking fragments cross-pollination + multiplies doc-reflection 4→48 surfaces). The useful version is a per-slot *view* (filtered projection, shared store) — queued as MEMORY-SLOT-VIEW-MS0, mirrors the `wiki-domain-bias`/`tribal-by-domain-inject` bias-without-fork pattern.

**State for next session.** 11 HTML units (HTML-COMPANION-MS0 × 4 + HTML-PRIMARY-MS0 × 7) are claimed to bravo with 2h TTL. Next session resumes at `HTML-COMPANION-MS0::U-HTML-CLAUDE-MD-EDIT`. Knobs: `PRISM_SLOT_TASK_CLAIM_DISABLE=1`, `PRISM_SLOT_TASK_ADVISORY_{DISABLE,VERBOSE,THROTTLE_MS}`. Sister: [[reference_slot_worktree_activation_2026_05_16]], [[reference_checkin_autonomous_loop_2026_05_16]].


## Related
[[skills/pick-unit|/pick-unit]] • [[skills/helpers|/helpers]] • [[skills/slot-task-claim|/slot-task-claim]] • [[skills/release|/release]] • [[skills/heartbeat|/heartbeat]] • [[skills/list|/list]] • [[skills/check|/check]] • [[skills/sweep|/sweep]] • [[skills/apply|/apply]] • [[skills/peer|/peer]]