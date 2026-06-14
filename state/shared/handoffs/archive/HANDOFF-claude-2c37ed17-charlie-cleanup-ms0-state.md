# Session close-out — slot CHARLIE — 2026-05-14

Detail companion to `HANDOFF-claude-2c37ed17-charlie-cleanup-ms0.md`.
Session id: `claude-2c37ed17` · slot CHARLIE · branch `cad-fusion-live-ms0` · worktree `H:/prism` (main).

## Shipped this session

### U-CLEANUP-C3 — `scripts/system-viz-add-node.mjs` + test
- Commits: `b362aed82` (ship) + `1ea3b6f20` (P0 fix).
- `scripts/system-viz-add-node.mjs` — incremental dashed-node staging that bridges the ~100s
  gap between full `generate-system-viz.mjs` regenerations. Three-tier: ENQUEUE always
  (idempotent against graph) → FLUSH every 60s (atomic graph + queue writes) → PID-file GUARD.
- `mcp-server/src/__tests__/SystemVizAddNode.test.ts` — **83 tests, all green**.
- Will be invoked by C5's watchdog with `--engine-file <path>` on every new-engine fs event.

### U-CLEANUP-C4 — `/wiring-potential` skill
- `.claude/commands/wiring-potential.md` — operator skill wrapping `prism_dev:wiring_potential`
  (C2) → `WiringPotentialEngine` (C1). Documents all 3 modes (analyze/batch_unwired/dashboard).
- **`.claude/commands/` is gitignored** (`.gitignore:57`) — skills live on-disk only, NOT
  version-controlled (sibling `wiring-batch.md` is also untracked). C4 "ships" as the
  registered on-disk file; it was already `complete` in the envelope.

### Close-out — commit `8118e9837`
4-surface sync per `feedback_roadmap_close_out`:
- `CLEANUP-MS0.json`: C3 `not_started` → `complete`; `completed_units`/`shipped_count` recounted.
- `roadmap-index.json`: CLEANUP-MS0 `completed_units` 45 → 50.
- `MILESTONE_PROGRESS.{md,json}` + `BUILD_STATE.{md,json}`: regenerated.
- chat-bus: ship message posted.
- 3-of-3 ledger PASS at session `claude-2c37ed17-c3c4` (`cleared: true`).

### Bonus — fixed broken `claude` launcher
A self-updater had renamed `claude.exe` → `claude.exe.old.1778727744564` (~02:42 UTC) and never
installed the replacement — `bin/` was empty, new terminals couldn't launch. Restored the
binary via `Rename-Item`; verified `claude --version` → `2.1.140`.

## Scrutiny findings (record for future C-series units)

### Per-file gate caught real bugs at every file
- **C3 script** — 2 reviewers FAIL'd v1 AND v2. Fixed **2 P0s + 13 P1s**: graph.nodes-undefined
  coercion, non-atomic queue truncation, TOCTOU on enqueue idempotency, proto-pollution reviver,
  `MAX_QUEUE_BYTES` DoS cap, slugifier empty-result, SIGINT listener-leak guard,
  `--engine false` footgun, schema-drift (missing size/color), `--id` traversal validation,
  isFinite FLUSH guard, corrupt-line counter, O(N·M)→Set lift, concurrent-enqueue re-read merge.
- **C3 test** — reviewer B FAIL'd v1 on **8 P1s**: exit-code-2 paths untested, skipped-flush-lock
  path untested, PID-lock-release-post-main untested, hardcoded `"L5"` instead of `m.DEFAULT_LAYER`,
  SIGINT-listener test timing, `vizDir` resolution untested, `appendQueue`+`emit` no direct tests.
- **C4 skill** — reviewer A FAIL'd v1 on **1 P0 + 4 P1s**: the JSON example had **fabricated
  field names** (`capacityRatio`→`headroomRatio`, `analyzedAt`→`generatedAt`,
  `knownCapacityIssues`→`warnings`, `topCandidate` is an object not a string), dashboard return
  shape wrong, `top_k` vs `top_n` conflated, `engine_not_found` error fabricated. Rewrote against
  `WiringPotentialEngine.ts:120-136` + `devDispatcher.ts:4501-4650`.

### End-of-task 3-of-3 — arm C caught a class-A P0
- Arms A + B PASS on the original C3 commit; **arm C (analyst) FAIL** — genuine lost-update race:
  `flushQueue()` (add-node PID lock) and `generate-system-viz.mjs` (the post-commit full-regen
  writer, separate `.system-viz-on-commit.pid`, non-atomic 41MB `writeFileSync`) are **not
  mutually exclusive**. A stale read-modify-write could silently clobber a fresh full regen.
- Fix (`1ea3b6f20`) — three-tier coordination in `flushQueue`:
  - **TIER 1 DEFER** — `isRegenActive()` checks `.system-viz-on-commit.pid`; live regen → skip
    flush (`error:"regen_active"`, `deferred:true`), lastFlush NOT touched (prompt retry).
  - **TIER 2 CAS** — capture graph mtime at read; re-stat before write; moved → abort
    (`error:"graph_changed_during_flush"`).
  - **TIER 3 VERIFY** — post-write re-read confirms every added id present; missing → abort
    (`error:"graph_clobbered_post_write"`).
  - Every abort path explicit + non-destructive (queue NEVER truncated on abort). Residual
    microsecond stat→rename gap is bounded + self-healing (next commit's regen reconciles).
- Re-ran 3-of-3 on both commits → **A/B/C all PASS**.

### Reviewer-C teachings
- **Coordinate cross-writer, not just cross-peer.** A PID lock that only excludes other
  instances of the same script is insufficient when a *different* script writes the same file.
  Check the other writer's lock too.
- **Optimistic CAS (mtime) + post-write verify** is the lock-free pattern when you can't make the
  other writer respect your lock — cheap, and every failure is loud + retryable, never silent.
- **Test legitimacy gate** rejects `.toBeUndefined()` / `.toBeTruthy()` as "weak presence-only".
  Use concrete forms: `.some(...)).toBe(false)` for absence, exact value assertions otherwise.

## Open / next roadmap surface

CLEANUP-MS0 is **51/73** (peers shipped between this session's recount and now).

### Next for this lane — U-CLEANUP-C5 (fully unblocked)
- **C5 — Watchdog↔Wiring integration.** Deps `B1` (PeerCommitAuditorEngine, was WatchdogEngine) +
  `C1` (WiringPotentialEngine) + `C3` (system-viz-add-node.mjs) — **all complete**.
- Wire B1's `onNewEngineFile` event to trigger: (a) `wiringPotentialEngine.analyze()` for the new
  orphan, (b) `system-viz-add-node.mjs --engine-file <path>` to stage a dashed node in the graph.
- The C3 script's `--engine-file` flag + `--json` output were built specifically for this.

### Other CLEANUP-MS0 pending (20, any lane)
B6, B7, B9, B12 (B-series); D5, D6, D8 (D-series); F1, F2B, F4, F5, F8 (F-series);
G1, G5, G8 (G-series) + others. Run `/checkin --roadmap devtools` or inspect
`mcp-server/data/milestones/CLEANUP-MS0.json` for the full list.

## Anti-regression for next session
- DO NOT re-create `scripts/system-viz-add-node.mjs` or its test (shipped `b362aed82`+`1ea3b6f20`).
- DO NOT re-create `.claude/commands/wiring-potential.md` (shipped on-disk; gitignored — `git`
  will never show it as tracked, that's expected, NOT a sign it's missing).
- DO NOT revert the `flushQueue` three-tier coordination — it's the fix for a scrutiny-confirmed P0.
- DO `/checkin` first — this session was slot CHARLIE; the slot may have been reclaimed.
- DO check the chat-bus before claiming C5 — peer chats (3 active /loop sessions seen this
  session) may have started it.
- The `claude.exe.old.1778727744564` backup was consumed by the launcher fix — if a future
  self-update breaks again, the pattern is: installer renames `claude.exe`→`.old.<ts>`, fails
  mid-swap; restore via `Rename-Item` of the `.old` file, or `npm install -g @anthropic-ai/claude-code@latest`.
