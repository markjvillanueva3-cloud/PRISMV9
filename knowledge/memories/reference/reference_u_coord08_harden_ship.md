---
name: reference-u-coord08-harden-ship
description: "U-COORD08 hardening pass shipped 2026-05-13 (slot ALPHA, claude-20ad2d3d) — atomic-rename trim + setMaxListeners(50) + 2 tests. Edits split across two peer commits (collisions"
aliases: reference_u_coord08_harden_ship
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.235Z
---


# U-COORD08-HARDEN — atomic broadcast-channel trim + setMaxListeners

Shipped **2026-05-13 / slot ALPHA / claude-20ad2d3d / /loop iter 1**. The follow-up directive from `H:/last.md` (precompact handoff of claude-0d2e1b74) called for two hardening items on `CrossTerminalBroadcastEngine` left deferred when U-COORD08 originally shipped. This unit closes both.

## Engine changes (live in HEAD)

`mcp-server/src/engines/CrossTerminalBroadcastEngine.ts`:

- **`writeToBroadcastChannel` atomic trim** — replaced `read→writeFileSync` with `read → writeFileSync(temp) → renameSync(temp, broadcastPath)`. `rename` is atomic on POSIX (within filesystem) and on NTFS (same volume); readers see either the pre-trim or post-trim file, never partial. Temp path is `${broadcastPath}.trim-${pid}-${Date.now()}-${randHex(16)}.tmp` with **`crypto.randomBytes(16)`** for entropy (128 bits — defeats predictable-path symlink hijack flagged by reviewer B P0). `try/finally` cleans up the temp on failure.
- **`TRIM_LINE_CAP = 1000` + `TRIM_BYTE_FLOOR = 32 KiB`** exported as module-level consts so tests can import them and scale if either changes. `TRIM_BYTE_FLOOR` lowered 256→32 KiB to fix a regression my first hardening draft introduced — at 256 KiB the trim path NEVER fired for default-sized events (1000 × 200 B = 200 KB < 256 KB floor).
- **`setMaxListeners(50)` in constructor** — EventEmitter default of 10 was emitting `MaxListenersExceededWarning` under high subscribe-count load (multi-chat fleets, dispatcher fan-out, test harnesses). 50 is well above observed peak (~18) and well below a plausible leak threshold.
- **JSDoc** on `writeToBroadcastChannel` documents **residual cross-process TOCTOU race** explicitly: two processes that both cross the line cap simultaneously can have one's appends land in the other's `read→rename` window and be lost. Bounded growth + per-line parseability is guaranteed; append-loss-freedom is NOT. Proper fix (lockfile/`flock`) tracked as U-COORD09+ candidate.

## Test changes (live in HEAD)

`mcp-server/src/__tests__/CrossTerminalBroadcastEngine.test.ts` 26 → 28 tests:

1. **Concurrency / atomic-rename**: pre-seeds the channel with `TRIM_LINE_CAP + 10` padded lines totalling > `TRIM_BYTE_FLOOR` (both thresholds imported from the engine so the test auto-scales), fires 20 parallel `Promise.all` broadcasts, asserts every line parseable JSON, count in `[CAP, CAP + N]`, ≥1 of 20 new payloads survives, no `.trim-*.tmp` orphan files. Test comment explicitly scopes the assertion to **single-process** atomicity — cross-process is a kernel guarantee not exercised by a Node-only unit test.
2. **`setMaxListeners(50)`**: asserts `engine.getMaxListeners() === 50`, mounts 30 subs via `engine.subscribe()`, captures `process.on('warning', …)` for `MaxListenersExceededWarning`, asserts none fire and `listenerCount('change')` goes 30 → 0 across unsubscribe.

## Scrutiny

- **Per-file 4-agent gate** (CLAUDE.md doctrine): engine reviewed by `code-analyzer` + second-pass `reviewer`; test reviewed by `test-review-agent` + second-pass `reviewer`. Reviewer B engine FAIL flagged P0 symlink-hijack + P1 TOCTOU residual race → **both addressed pre-commit** (`crypto.randomBytes(16)` + JSDoc note). Reviewer B test FAIL flagged P1 magic-number duplication + P1 single-process scope → **both addressed** (consts imported from engine + scope comment).
- **End-of-task 3-of-3 gate**: arms A (code-analyzer) + B (reviewer) + C (analyst) marked PASS in `mcp-server/data/state/SCRUTINY_LEDGER.json` (session `claude-20ad2d3d`, `blockCount: 0`).

## Collisions (#5 + #6 in 48 h)

- **#5 — engine absorbed into `f26565281`** = `[INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02: ModelTelemetryEngine + adaptive router thresholds` (Charlie's commit). My `crypto`/`TRIM_LINE_CAP`/`setMaxListeners` engine diff is visible in `git show f26565281 -- mcp-server/src/engines/CrossTerminalBroadcastEngine.ts`.
- **#6 — test absorbed into `d912739b1`** = `[CLEANUP-MS0]/U-GIT-TREE-SWEEP-FIXUP: address 3 P0 + 8 P1 scrutiny findings on classify + watcher` (different chat's commit). My 115 test-file insertions visible in `git show d912739b1 --stat`.

Both diffs are mine. Both commit messages understate scope. Source of truth = files at HEAD + this memory entry + COORD-MS0.json `hardening_notes` on U-COORD08.

Companion to [[reference_training_learning_ms0_u1_collision]], [[reference_blueprint_ocr_training_ms1_collision]], [[reference_coord_ms0_u4_collision]], [[reference_intel_ollama_p22_u03_collision]]. The pattern is robust: at high fleet density (6 chats × shared tree) every Stop creates an N-way commit race; the conflict-fork rule [[feedback_conflict_fork_rule]] only fires AFTER the first hollow, so a small-but-fast unit can ship absorbed in 1-2 minutes before fork.

## Close-out

- `mcp-server/data/milestones/COORD-MS0.json` U-COORD08 entry updated with `hardening_notes` (changes / tests / scrutiny / deferred items) and 2 entries appended to `completed_in_commits`.
- `state/shared/MILESTONE_PROGRESS.{json,md}` + `BUILD_STATE.{json,md}` regenerated.
- `state/shared/AGENT_CHAT.jsonl` posted (entry `chat-1778721116706`).
- `roadmap-index.json` does not key by milestone — no entry to update.

## Deferred (U-COORD09+)

- Windows `EBUSY` retry-with-backoff on `renameSync` (3 attempts, 10/50/100 ms).
- Env knob `PRISM_BROADCAST_MAX_LISTENERS` to override the 50 cap.
- `_setBroadcastPath` test-hook gated on `NODE_ENV === 'test'`.
- Proper lockfile / `flock` to close the residual cross-process trim race.
