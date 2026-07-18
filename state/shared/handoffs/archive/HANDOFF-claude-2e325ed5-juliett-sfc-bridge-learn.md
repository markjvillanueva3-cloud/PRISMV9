---
session: claude-2e325ed5
topic: juliett-sfc-bridge-learn
slot: juliett
written_at: 2026-05-20T16:20:00.000Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-2e325ed5
status: active
---

# HANDOFF: claude-2e325ed5
Updated: 2026-05-20T16:20:00.000Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-2e325ed5

## RESUME

**Active /loop on juliett: iter 1 of 20 DONE. Next pick is mid-flight at the dispatcher-wiring step.**

1. **Heartbeat slot-task claim:** `node H:/prism/.claude/helpers/slot-task-claim.mjs heartbeat --slot juliett --chatId <new-session-id> --unit MS-CRITWIRE::U-CW-01` (current claim `claude-2e325ed5` expires 2026-05-20T16:46:33Z — sweep + reclaim if expired).
2. **Resume U-CW-01** (Wire `MachineAwareSpeedFeedEngine` → `prism_calc` + `prism_safety`). Engine + test already on disk:
   - Engine: `H:/prism/mcp-server/src/engines/MachineAwareSpeedFeedEngine.ts` (529 LOC)
   - Test: `H:/prism/mcp-server/src/__tests__/MachineAwareSpeedFeedEngine.test.ts` (349 LOC)
   - Public exports: singleton `machineAwareSpeedFeedEngine = new MachineAwareSpeedFeedEngine();`
   - Public methods (verified in this session): `extractConstraints(pkg) → MachineConstraints`, `constrain(input, pkg) → ConstrainedSpeedFeed`, `torqueAtRpm(rpm, maxTorque, baseRpm)`, `powerFromTorque(torque, rpm)`, `torqueFromPower(power, rpm)`.
   - `constrain()` is the main entry — pipes `SpeedFeedInput` + `CanonicalMachinePackage` through RPM clamp → feed clamp → power/torque check.
3. **Wire to `calcDispatcher.ts`** (~9171 LOC — read with offset/limit, find `z.enum([...])` action list + the `ACTION_MAP` / switch block; add action `constrain_to_machine` or similar; lazy-load engine import; add zod schema in `src/schemas/`).
4. **Wire to `safetyDispatcher.ts`** (238 LOC — much smaller; add action `validate_machine_speed_feed_limits` that returns the `ConstrainedSpeedFeed` flags as a safety verdict).
5. **Per-file scrutiny** after EACH dispatcher edit: 2 parallel reviewers — arm-A `wiring-review-agent`, arm-B `reviewer`. Fix every P0/P1 BEFORE the next file.
6. **Build + vitest** check: `cd H:/prism/mcp-server && npm run build:fast && rtk npx vitest run src/__tests__/MachineAwareSpeedFeedEngine.test.ts` — also any dispatcher tests that touch the new action.
7. **Commit:** `[MAIN] [MS-CRITWIRE]/U-CW-01: wire MachineAwareSpeedFeedEngine → prism_calc + prism_safety (slot:juliett)`. Reminder: `[SLOT-*]` prefix is BLOCKED by worktree-commit-route on shared `H:/prism` tree; use `[MAIN]` per [[feedback_commit_prefix_main_on_shared_tree]].
8. **Loop tick:** `node H:/prism/.claude/helpers/loop-state.mjs tick --session 2e325ed5-2f22-4037-af6a-89ee5773fb13 --status ok --note "iter 2: U-CW-01 wire SHIPPED <SHA>"`. Note: the loop-state for THIS session is already initialized — target=20, iter=1, status=running. After this commit ticks to iter=2.
9. **Release claim:** auto-released on the post-commit hook by canonical commit subject. Verify with `node ...slot-task-claim.mjs list | grep U-CW-01` (should be empty after commit).
10. **Pick next juliett unit:** `node H:/prism/.claude/helpers/priority-queue.mjs --pick --slot juliett --top 5`. Per the doctrine in [[feedback_high_roi_backend_first_slot_queue]], prefer U-WIRE-*/U-BRIDGE-*/U-HOOK-* prefixes over `app-functionality`. Top-3 from THIS session's pick (~ stale snapshot but still useful):
    - U-AITRAIN-SPEEDFEED-SPEED-FEED-DEEP-LEARNING — train SpeedFeedDeepLearningEngine on full pre-revenue corpus. **HEAVY unit — multi-iter; engine has random-init NN weights at lines 217+ (untrained-stub pattern), 1232 LOC.**
    - U-WIRE-BACKLOG-SF (FEATURE-GAP-AUDIT-MS0) — wire the ~12 unwired speed-feed engines (SF-AI L1-L3 ladder). **High ROI per [[feedback_high_roi_backend_first_slot_queue]] — multiple wire steps.**
    - muS-D30..D33 (ARC-MS9) — Speed/feed recommender.
    - U-CAMX22 (CAMX-MS0.3) — Wire AutoSpeedFeedEngine into PrintToProgram.
    - U-F360-20 (F360-MS4) — Per-block auto speed/feed into Fusion operations.
    - U-GAP-SF-NC-CALIBRATION — Shop-proven speed/feed calibration mined from 35K+ JM DIE NC programs.
    - U-KAR17 — ProvenSpeedFeedAggregatorEngine.
    - P0-U14 (L8-P2-MS2) — Cross-Links to SFC & Learning.
    - U-MCAT12 — Machine-Aware Speed/Feed Pipeline.

**DO NOT** in this resume: (a) try to also run the sibling unit U-BRIDGE-LEARN-SFC-WIRE in this iter — that's separate scope. (b) ScheduleWakeup between /loop iters (banned by [[feedback_no_schedule_wakeup_in_loop]]).

## STATE

**Session SHIPPED:**
- **iter 1 / 20: BRIDGE-DEEP::U-BRIDGE-LEARN-SFC engine half SHIPPED** at commit `029bb5a331` — `[MAIN] [BRIDGE-DEEP]/U-BRIDGE-LEARN-SFC: SFCParameterRefinementEngine + test — closed-loop SFC refinement bridge (engine half) (slot:juliett)`.
   - Engine: `mcp-server/src/engines/SFCParameterRefinementEngine.ts` (657 LOC, WIRE-EXEMPT middleware).
   - Test: `mcp-server/src/__tests__/SFCParameterRefinementEngine.test.ts` (392 LOC, 13 vitest cases all PASS @ 10ms).
   - Per-file scrutiny PASS×2 (arm-A `test-review-agent` agentId `a0af4ad8d75aac873` + arm-B `reviewer` agentId `ad285010bbc49f6bc`, both PASS, P0/P1 clean; 1 P2 deferred — mkBus mock could harden domain/since_iso/limit filters but benign today).
   - Canonical-constant invariant preserved.
   - Sibling unit U-BRIDGE-LEARN-SFC-WIRE (actual orchestrator wire-in) is DEFERRED to a separate /loop iter.

**Session MID-FLIGHT:**
- **iter 2 / 20: MS-CRITWIRE::U-CW-01 claimed (expires 2026-05-20T16:46:33Z), wiring not yet started.**
   - Engine API confirmed (`constrain()` is the main entry).
   - calcDispatcher.ts (9171 LOC) NOT yet read — next step is to find its `z.enum([...])` action list + `ACTION_MAP`/switch block to add `constrain_to_machine` (or similar) action.
   - safetyDispatcher.ts (238 LOC) NOT yet read — add a validation action that returns `ConstrainedSpeedFeed` flags as a safety verdict.
   - Per-file scrutiny gate (2 reviewers per file) must fire after each dispatcher edit per CLAUDE.md per-file gate.
   - Bypass-claimed via `--ack-stale` after re-check confirmed: no peer ship commits since MS-CRITWIRE gen (2026-05-11), zero engine references in calcDispatcher.ts or safetyDispatcher.ts.

**Loop-state:** session `2e325ed5-2f22-4037-af6a-89ee5773fb13`, target=20, iter=1 (running). Loop was started fresh in THIS session after /compact (the prior loop-state under `claude-2c851037` died with that session's id).

**Slot:** juliett (chat-slot binding active, claimed 2026-05-20T15:55:59Z via `/startup-juliett` force-claim).

## CONTEXT

### Why pivoted away from U-AITRAIN-SPEEDFEED at iter 2:
`SpeedFeedDeepLearningEngine.ts` (1232 LOC) has random-init NN weights at lines 217-228, 241-252, 265-270+ (`Math.random()` on every weight/bias) — classic untrained-stub pattern. The unit's acceptance criteria require a non-stub inference on a held-out JM-DIE sample, which means building real corpus ingestion + actual training + held-out validation. **Multi-iteration work.** With token state already YELLOW at iter 2 start, picked U-CW-01 instead as a contained backend-dev win.

### Important doctrine reminders for the next session:
- [[feedback_high_roi_backend_first_slot_queue]] — U-WIRE-*/U-BRIDGE-*/U-HOOK-*/backend-dev FIRST, then bridge, then domain. Most P2-tagged units in the queue are app-functionality and should NOT be picked before U-WIRE-BACKLOG-SF (which IS in the queue at top-6).
- [[feedback_commit_prefix_main_on_shared_tree]] — On `H:/prism` shared tree, prefix `[MAIN]`. `[SLOT-*]` is BLOCKED by `worktree-commit-route` hook. The blocked commit also UNSTAGES — re-`git add` before retry. (Hit this exact failure mode this session — wasted 1 cycle.)
- [[feedback_no_schedule_wakeup_in_loop]] — NEVER ScheduleWakeup between /loop iters.
- [[feedback_task_freshness_pre_build]] — Stale envelope gen-date triggers a hard gate. Re-check protocol: git log + master-index + peer claims. Bypass with `--ack-stale` (30-min stamp) once verified.

### Git-tree contention (this session):
The shared `H:/prism` tree git index lock was actively contested — observed lock growing 896K → 3.6M → 5M in seconds (peer chat in-flight). Sweeper auto-clears (PreToolUse hook), but mid-write writes can corrupt. Per [[reference_git_index_saturation_camx11_2026_05_18]] — use pathspec commit, migrate to slot worktree. Retry loops worked here (5× × 8-10s wait) but burn time. **Consider migrating juliett to its slot worktree** at `H:/prism-slot-juliett` (already exists per the worktree-commit-route block message) on the next /checkin-juliett.

### Token state at precompact:
Hit the 1.76M token PostToolUse hook + 1.1M PreToolUse hard threshold mid-action. /compact must run BEFORE any further tool calls — the hook is blocking everything including the Skill tool. Writing this handoff directly via Write tool is the only path out. The next session resumes the U-CW-01 wiring fresh.

### Reviewer agentIds (from iter 1 — likely stale after /compact, but reusable via SendMessage if still alive):
- arm-A test-review-agent: `a0af4ad8d75aac873`
- arm-B reviewer: `ad285010bbc49f6bc`

### Standing pointers:
- [[feedback_high_roi_backend_first_slot_queue]] — pick order
- [[feedback_commit_prefix_main_on_shared_tree]] — commit prefix on shared tree
- [[feedback_always_close_out]] — finish every part of an iter before tick
- [[feedback_autonomous_loop_drift_discipline]] — cap anomaly investigation at ≤1 extra tick
- [[feedback_no_schedule_wakeup_in_loop]] — no ScheduleWakeup
- [[feedback_task_freshness_pre_build]] — stale-envelope gate
- [[reference_git_index_saturation_camx11_2026_05_18]] — shared-tree git contention

### Hooks observed firing (next session will see them too):
- `task-freshness-gate.mjs` — refused claim on AITRAIN (63h stale) AND on U-CW-01 (214h stale); both bypassed via `--ack-stale` after re-check protocol.
- `worktree-commit-route.mjs` — blocked `[SLOT-JULIETT]` prefix on shared tree; re-commit with `[MAIN]` succeeded.
- `git-lock-sweeper.mjs` — PreToolUse arm cleared the index.lock multiple times under peer-chat contention.
- `precompact-pending-guard.mjs` — armed; Stop hook will BLOCK session end until /compact runs.
- `scrutinize-before-stop.mjs` — Stop hook BLOCKS without 3-of-3 PASS. **This iter's iter-1 commit `029bb5a331` already shipped — the 3-of-3 gate may need to fire on this session's net diff (mid-flight U-CW-01 has NO uncommitted code; only handoff edits remain).**

### Quick map for next session:
- Engine + test on disk for U-CW-01: ✓
- calcDispatcher action list: NOT YET FOUND — start with `rtk grep -nE "z\.enum" mcp-server/src/tools/dispatchers/calcDispatcher.ts | head -5` then read that line range.
- safetyDispatcher (238 LOC): just read the whole file.
- Schema for new action: add a Zod schema file in `mcp-server/src/schemas/` matching the dispatcher's convention (`{domain}ActionSchemas.ts`).
- Pattern reference: any wired SpeedFeed-family engine in calcDispatcher.ts (e.g. `SpeedFeedOrchestratorEngine`) — match its lazy-load + action-case pattern.
