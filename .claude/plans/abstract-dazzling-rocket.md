# FLEET-RESILIENCE-MS0 — keep the reaper alive + per-chat compaction gate

## Context

The operator runs up to 13 concurrent Claude chats on one memory-pressured host. If
the fleet-reaper stops reaping orphan processes, RAM climbs and chats crash. The
operator asked: (a) make sure the reaper "stays open," (b) ensure the golf slot
reliably owns it, and (c) put a monitor in every `/startup-<nato>` / `/checkin-<nato>`
that detects hung chats + compaction-need and auto-triggers compaction.

Investigation found most of this **already exists** — and one real blind spot:

- **Durable safety net works.** `PRISM Fleet Reaper` is a SYSTEM-principal Windows
  scheduled task, 5-min cadence, `LastResult: 0`. It is running. The in-session
  Monitor that kept "dying" is only a cosmetic live feed, not the safety net.
- **Compaction is already gated.** `precompact-auto-trigger.mjs` estimates context
  tokens on every tool call: SOFT nudge at 880K, HARD `decision:block` at 940K
  (forces `/precompact`); harness autocompact fires at 95% (`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95`).
- **Hung-chat detection already exists** cross-process — `fleet-reaper` crash-watch
  (`scripts/lib/fleet-reaper-crash-watch.mjs`, 10-min heartbeat-stale threshold,
  writes `chat-crash-postmortems.jsonl`). A chat **cannot** detect its own hang
  (it would have to be running) — so self-hang-detection is structurally impossible
  and is intentionally NOT built.
- **THE REAL GAP:** a scheduled task can be `State: Ready` yet have a **stalled
  trigger** (`NextRunTime` frozen in the past, never firing). `golf-slot-reaper-guardian.mjs`,
  `fleet-task-health-watch.mjs::classifyTask`, AND the reaper's own Tier-3
  `taskSelfHealAction` ALL classify on `State`/`LastRunTime` only — none compares
  `NextRunTime` to the clock. A stalled reaper trigger is invisible to every layer.

Hard constraint (accepted): no hook/monitor can *press* `/compact`. The only
auto-compaction levers are the harness autocompact and the `precompact-auto-trigger`
HARD block that coerces `/precompact`. "Aggressive auto-compact" = make that block
fire **earlier**.

## Scope (operator chose: "Above + aggressive auto-compact")

3 units. Multi-file build → per-file 2-reviewer scrutiny gate after each file +
3-of-3 Stop gate.

---

### Unit 1 — `U-FR-TRIGGER-STALL-DETECT` — close the stalled-trigger blind spot

Teach all three reaper-liveness layers to detect `Ready` + stale `NextRunTime`.

- **`scripts/fleet-reaper-sweep.mjs`** (Tier-3 block ~L2502-2566): the
  `schtasks /Query` already runs with `/V /FO LIST`, which emits `Next Run Time:`.
  Add a pure exported `isTriggerStalled(nextRunMs, nowMs, cadenceMs, mult=1.5)`
  and a `parseTaskNextRun(stdout)` parser. Extend `taskSelfHealAction` so a `ready`
  task with a stalled trigger returns `{action:"run", reason:"trigger-stalled"}`
  instead of `noop` → the sweep `schtasks /Run`s it and emits a caveat.
- **`scripts/fleet-task-health-watch.mjs`** (`classifyTask` ~L422-465): the
  PowerShell enumeration must also capture `NextRunTime` (already available from
  `Get-ScheduledTaskInfo`). Add a new status `trigger-stalled` — `State==Ready` +
  `intervalMs` known + `now - nextRunMs > intervalMs × staleMultiplier`. Slots
  ahead of the existing `stale` check. New status surfaces in the watchdog's
  `critical` aggregation for `CRASH_CRITICAL_TASKS`.
- **`.claude/hooks/golf-slot-reaper-guardian.mjs`**: the guardian already queries
  the task. Add the `NextRunTime` freshness check; on stall → `schtasks /Run` +
  LOUD advisory to the golf chat. Reuse `isTriggerStalled` (import from the sweep
  script — it is the single source of truth).
- Tests: `isTriggerStalled` + `parseTaskNextRun` + the new `classifyTask` branch
  (real-value assertions, fail-on-revert oracle).

### Unit 2 — `U-FR-HEALTH-STEP` — fleet-resilience line in every `/startup` + `/checkin`

- **NEW `scripts/fleet-resilience-check.mjs`** — one-shot (`--json` / text). Reads:
  (a) `PRISM Fleet Reaper` task `State` + `NextRunTime` freshness (reuse Unit-1
  `isTriggerStalled`), (b) THIS chat's context-token estimate (reuse exported
  estimators from Unit 3), (c) recent peer crash rows from
  `chat-crash-postmortems.jsonl`. Emits a compact 2-3 line block:
  `reaper: Ready, next-run fresh · context: ~640K/1M healthy · peers: 0 frozen`.
- **`.claude/commands/checkin.md` + `.claude/commands/startup.md`**: add ONE step
  after the §Run psk block, before §Report, that runs `fleet-resilience-check.mjs`
  and folds the line into §Report. All 39 `<nato>` wrapper commands delegate to
  these two canonical bodies (verified — wrappers say "pipeline body is canonical")
  so the step is inherited fleet-wide with zero wrapper edits. `allowed-tools` on
  both files is already `Bash, Read` — no change needed (the step is a Bash call).
  The golf in-session reaper Monitor stays armed by `/checkin-golf` step C (already
  present) — not duplicated here.

### Unit 3 — `U-FR-AGGRESSIVE-PRECOMPACT` — force compaction earlier + export estimators

- **`.claude/hooks/precompact-auto-trigger.mjs`**: lower the gate so `/precompact`
  is coerced well before the 95% autocompact wall. Proposed defaults (all remain
  env-overridable via `PRECOMPACT_SOFT_TOKENS` / `PRECOMPACT_HARD_TOKENS`): SOFT
  `880K→780K`, HARD `940K→850K`. The HARD→autocompact handoff-headroom widens from
  10K to ~100K — `/precompact` writes its handoff with room to spare. Update the
  file header comment block to reflect the new arithmetic. Add a test asserting
  threshold ordering `SOFT < HARD < CAP` and that env knobs still override.
- **Export** `estimateFromBytes`, `lastAssistantTokens`, `findLastCompactOffset`
  (currently module-private) so `fleet-resilience-check.mjs` (Unit 2) reuses the
  exact estimator instead of re-deriving token math — R8 reuse, single source.

---

## Files

| File | Unit | Change |
|------|------|--------|
| `scripts/fleet-reaper-sweep.mjs` | 1 | `isTriggerStalled`+`parseTaskNextRun`; extend `taskSelfHealAction` |
| `scripts/fleet-task-health-watch.mjs` | 1 | `NextRunTime` capture + `trigger-stalled` status in `classifyTask` |
| `.claude/hooks/golf-slot-reaper-guardian.mjs` | 1 | NextRun-freshness check + `schtasks /Run` + advisory |
| `scripts/fleet-resilience-check.mjs` | 2 | **NEW** one-shot health probe |
| `.claude/commands/checkin.md` | 2 | +1 step (health line into §Report) |
| `.claude/commands/startup.md` | 2 | +1 step (health line into §Report) |
| `.claude/hooks/precompact-auto-trigger.mjs` | 3 | lower SOFT/HARD; export 3 estimators |
| `scripts/__tests__/fleet-resilience-*.test.mjs` (×3-4) | 1-3 | real-value tests, fail-on-revert oracles |

Doc reflection (per doctrine, same session): CLAUDE.md FLEET-REAPER section +
`## Recent regressions` if a bug is found · MEMORY.md index line · wiki entry
`knowledge/wiki/architecture/fleet-resilience-ms0.md` · Obsidian memory file.

## Execution notes

- Golf slot's `golf-slot-write-allowlist.mjs` blocks writes outside its allowlist —
  set `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` (PowerShell `$env:` syntax) before edits;
  bypass is logged to `state/shared/golf-bypass.jsonl`.
- This chat is in the shared `H:/prism` main tree, not the golf slot worktree.
  Commit from main tree with an explicit pathspec (conflict-fork fallback) —
  migration to `H:/prism-slot-golf` needs a fresh terminal and is out of scope.
- Commit format `[GOLF] [FLEET-RESILIENCE-MS0]/U-FR-*: title`, one commit per unit.

## Verification

1. **Unit 1** — `node --test scripts/__tests__/fleet-resilience-trigger.test.mjs`
   (pure-fn cases). Live: `node scripts/fleet-reaper-sweep.mjs --status` shows the
   task NextRun line; simulate a stale NextRun and confirm `taskSelfHealAction`
   returns `run`/`trigger-stalled`.
2. **Unit 2** — `node scripts/fleet-resilience-check.mjs --json` returns a
   well-formed health object; run `/checkin` and confirm the `reaper:`/`context:`
   line appears in §Report. Confirm a `<nato>` wrapper (e.g. `/checkin-bravo`)
   inherits the step.
3. **Unit 3** — `node --test` on the threshold-ordering test; pipe a synthetic
   large transcript through `precompact-auto-trigger.mjs` and confirm the HARD
   block fires at the new 850K boundary; confirm exported estimators import.
4. Full `cd mcp-server && npm run build:fast` clean; 3-of-3 Stop scrutiny PASS.
