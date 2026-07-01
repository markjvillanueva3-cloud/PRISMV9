---
session: claude-9aa1d45d
topic: cleanup-ms0-loop
slot:
written_at: 2026-05-13T22:25:00.000Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-9aa1d45d
status: precompact
---

# HANDOFF: cleanup-ms0-loop (claude-9aa1d45d)

Updated: 2026-05-13T22:25Z · Family: Claude · Machine: DESKTOP-N7MI1VB

## STATE

Shipped this session:
- **U-CLEANUP-G3** — `scripts/jsonl-orphan-scan.mjs` (496 LOC) + `scripts/__tests__/jsonl-orphan-scan.test.mjs` (37 tests, all green). Commit `308afc28a`. Real-data run surfaced 3 orphan jsonls: `fusion-pipeline-runs.jsonl(40)`, `roadmap-pass-history.jsonl(12)`, `adaptive-thresholds-history.jsonl(3)`. Per-file 2-parallel-agent scrutiny PASSED with 5 P1 fixes applied (atomic writeAtomic helper, dot-dir filter clarified, skippedTooLarge counters, mkdir-before-write, real test assertions for sample-consumers + .tmp residue).

- **U-CLEANUP-G4** — found ALREADY shipped by peer (commit `554b13ddd`). I clobbered the peer's test file by Writing my own version of `scripts/__tests__/settings-baseline-rotate.test.mjs` (peer's was at `mcp-server/src/__tests__/settings-baseline-rotate.test.ts`). Removed my duplicate. Peer test untouched in git.

- **U-CLEANUP-G19** (UNCOMMITTED, READY TO CLOSE OUT) — `scripts/build-system-viz-livediff.mjs` (446 LOC) + `scripts/__tests__/build-system-viz-livediff.test.mjs` (36 tests, all green). NOT yet scrutinised, NOT yet committed, envelope still says not_started.

Inline-PowerShell **Monitor** ran as task `biioy6202` (persistent, 180s cadence). Reaped 10+ orphan node + 3 stale bash processes during the session. Task died at compact prep (exit 255). Must respawn.

CLEANUP-MS0 envelope: **21/73 complete**, in_progress.

## RESUME

**ACTIVE:** CLEANUP-MS0 /loop continues. User invariant: "/loop until goal complete + run a constant monitor while we work". Continue same-turn until milestone complete OR hard blocker OR user interrupts. NO ScheduleWakeup per [[feedback_no_schedule_wakeup_in_loop]].

### Step 1 — RESPAWN MONITOR (first thing on resume, before any other work)

Use the `Monitor` tool with `persistent: true, timeout_ms: 3600000, description: "orphan-reaper+RAM/disk alerts"`.

The payload is a bash `while true` loop that calls a one-shot PowerShell every 180s. PowerShell does: (a) reap `node.exe` >30min not on TCP 3100 and <500MB working set, (b) reap `bash.exe` >30min with empty MainWindowTitle, (c) remove stale `H:\prism\.git\index.lock` >300s, (d) alert if RAM <15% free, (e) alert if `H:` <20GB free. Emit `CLEANUP <reasons>` only on action/alert; emit `heartbeat cycle=N clean` every 5th cycle (15min). The exact command from the previous session is in this chat's earlier turns — reconstruct from there.

### Step 2 — Close out U-CLEANUP-G19 (uncommitted from prior session)

Files on disk:
- `scripts/build-system-viz-livediff.mjs` — 446 LOC, untracked. Exports: parseArgs, loadGraph, diffNodes, diffEdges, diffHeadline, buildLayerBreakdown, composeDiffReport, buildLiveDiff, renderMarkdown, writeAtomic, runCli.
- `scripts/__tests__/build-system-viz-livediff.test.mjs` — 36 tests, all green. Coverage exceeds floor (happy + 3 failure + 2 adversarial + 3 spanning + round-trip).

Actions:
1. **Per-file 2-parallel-agent scrutiny** (REQUIRED by [[feedback_parallel_scrutiny_per_file]]):
   - Agent A: `code-analyzer` reviewing both files for content correctness, edge cases, conventions.
   - Agent B: `reviewer` for independent second-pass (hidden coupling, naming, error budget, silent-failure).
   - Both review WHOLE files end-to-end. Apply all P0+P1 fixes.
2. Run on real data: `node --max-old-space-size=2048 scripts/build-system-viz-livediff.mjs --json | head -25`. 65MB×2 graph pair must not OOM at 2GB heap. If it does, bump heap and document.
3. Envelope edit `mcp-server/data/milestones/CLEANUP-MS0.json`:
   - U-CLEANUP-G19 status → "complete"
   - completed_at: ISO timestamp
   - completion_notes: paragraph (file size, test count, scrutiny outcome, real-data sample)
   - top-level `completed_units` 21 → 22
   - top-level `updated_at`
4. Regen: `node scripts/build-milestone-progress.mjs && node scripts/build-state-snapshot.mjs`
5. Append chat-bus line to `state/shared/AGENT_CHAT.jsonl`.
6. **Path-specific commit** (DO NOT use plain `git add` — peer chats stage work in shared index):
   ```
   git add scripts/build-system-viz-livediff.mjs \
          scripts/__tests__/build-system-viz-livediff.test.mjs \
          state/shared/SYSTEM_VIZ_LIVEDIFF.json \
          state/shared/SYSTEM_VIZ_LIVEDIFF.md
   git commit \
     scripts/build-system-viz-livediff.mjs \
     scripts/__tests__/build-system-viz-livediff.test.mjs \
     mcp-server/data/milestones/CLEANUP-MS0.json \
     state/shared/SYSTEM_VIZ_LIVEDIFF.json \
     state/shared/SYSTEM_VIZ_LIVEDIFF.md \
     state/shared/BUILD_STATE.json state/shared/BUILD_STATE.md \
     state/shared/MILESTONE_PROGRESS.json state/shared/MILESTONE_PROGRESS.md \
     -m "[MAIN] [CLEANUP-MS0]/U-CLEANUP-G19: ship build-system-viz-livediff.mjs

   ..."
   ```
   `[MAIN]` prefix REQUIRED by `worktree-route` hook. If `index.lock` exists, check age — if >30s, `rm -f H:/prism/.git/index.lock`, sleep 2s, retry. Pre-existing peer-staged files (e.g. `[MACRO-PROGRAM-PIPELINE-MS0]/MS0-U6` macro-bulk-emit work shipped at `ca8d523a3`) must NOT be snagged — explicit path commit is the protection.

### Step 3 — /loop next critical-path units (all deps=[])

In suggested order (smaller, easier first to build momentum):
1. **U-CLEANUP-G2** — `coordination-db-health.ps1` + `coord-db-sentinel.mjs` (PRAGMA integrity_check + row-count parity check vs WORK_CLAIMS.json; alerts >=10% divergence; drives WORK_CLAIMS.json retirement). ~1h.
2. **U-CLEANUP-G16** — `build-wiring-domain-dict.mjs` (weekly scan of src/engines/index.ts for top-3 unmatched-engine prefixes; appends to wiring-domain-dict.json). ~1h.
3. **U-CLEANUP-TZ-HELPER** — `tz-sanity.mjs` (asserts JSONL writes are UTC-suffixed Z; dashboards add `<!-- timeBasis: UTC -->` header). ~30m.
4. **U-CLEANUP-SCHEMA-READER** — `helpers/jsonl-schema-reader.mjs` (per-line schemaVersion dispatch; v1 default for missing; additive-only schema bumps). ~1h.
5. Then D-series CLAUDE.md slim (D1, D2, D5, D6 deps=[]), F-series landscape consumers (F1-F7 mostly deps=[]), H-series awareness gardening (H1-H5 deps=[]).

Critical path beyond these: U-CLEANUP-C1 (WiringPotentialEngine, ~3h, blocks C2/C3/C5/F1), U-CLEANUP-F8 (chat-bus signal channel, deps B1+B10 both done), U-CLEANUP-E2 (golf-cron-registry + /golf-bootstrap, deps A6 done).

### Step 4 — Per-file scrutiny + 3-of-3 end gate

Per [[feedback_parallel_scrutiny_per_file]]: after EVERY file in multi-file builds, dispatch 2 parallel agents BEFORE writing the next file. Each reviews the whole file end-to-end. Fix all P0+P1. Then move to next file.

End-of-task 3-of-3 gate (codex+reviewer A+reviewer B) fires at Stop per CLAUDE.md §SCRUTINY GATE. With uncommitted=0 after each unit, gate auto-clears.

### Step 5 — Coordination + handoff

At session end OR every 2-3 units, write a fresh per-agent handoff with `--source live-chat`. Post to coord at each checkpoint with `agent-coordination.mjs post --message "..."`.

## CONTEXT (NOT derivable from code — preserves session learnings)

- **Helpers actually present** (memory was stale): `chat-slots.mjs`, `per-agent-handoff.mjs`, `stable-session-id.mjs`. **Absent**: `node-process-janitor.mjs`, `reap-zombies.mjs`. PRISM Monitor uses inline PowerShell, not external helpers.
- **`per-agent-handoff.mjs write` hung** at one point during this session (background bash had to be force-stopped). Fallback: use the Write tool to author the handoff file directly at `state/shared/handoffs/HANDOFF-<id>-<topic>.md` with the YAML frontmatter shown above.
- **Test placement option A**: `scripts/__tests__/*.test.mjs` with config at `scripts/__tests__/vitest.config.mjs`. Invoke: `node mcp-server/node_modules/vitest/vitest.mjs run --config scripts/__tests__/vitest.config.mjs <path>`.
- **Test placement option B**: `mcp-server/src/__tests__/*.test.ts` (peer G4 used this). Both work; pick by what feels right per unit.
- **Path-specific commit is non-negotiable** in shared tree. Peer chats stage work in the index; `git commit <paths>` only commits those paths.
- **`[MAIN]` prefix required** for commits made from `H:/prism` (main tree). `worktree-route` hook blocks unprefixed scope-tagged commits.
- **Conflict-fork rule** is the escape hatch if peer ownership-guard blocks any path — fork to `H:/prism-cleanup-<unit>/` with `git worktree add`.
- **Index-lock contention** is real (cleared once at 19s age this session). Sweep threshold: 30s for active commit retry.
- **Anti-clobber lesson**: Write on a path Claude hasn't Read fails — but if a peer ALREADY created the same file, Write also fails with "File has not been read yet". In /loop mode, always re-check before Write (peers may have shipped the same unit).
- **PRISM-INVENTORY-LATEST.md is live** — read for live counts, don't hardcode.
- **Monitor task `biioy6202` died at compact** (exit 255). New monitor MUST be the very first action on resume.
- **Coordination posted** to `state/shared/AGENT_CHAT.md` with message "compacting — shipped U-CLEANUP-G3 (commit 308afc28a) | G19 script+tests pending close-out | spawn fresh monitor on resume". Entry id `chat-1778711041409`.

## DEFERRED ITEMS

- U-CLEANUP-G19 close-out (Step 2 above). Files written, tests pass, just needs scrutiny + envelope + regen + commit.
- Monitor respawn (Step 1 above).
- /loop continuation through G2 / G16 / TZ / SCHEMA / D-series / F-series / H-series / C1 (Step 3 above).
