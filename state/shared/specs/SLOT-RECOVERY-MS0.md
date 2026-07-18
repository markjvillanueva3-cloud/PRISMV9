# SLOT-RECOVERY-MS0 + FLEET-DASHBOARD-MS0 — seamless crash recovery + fleet-state visualization (2026-05-25)

> User directive (2026-05-25, slot:unbound chat claude-9e91d800): "scope full stack and find gaps, potential issues and conflicts and build around them. we need seamless transitions during pc shutdown. checking into the chat slots should just resume from where we left off with full context, task queue still left and main directive. bridge and synergize to PSN and /system-viz. update the system-viz dashboard for better visuals on what chats are working on, their primary directive, current goal and tasks, and their list of future tasks either dedicated to their slot or general tasks any chat can run. devise a system to add tasks to a new task queue that auto gets added. devise a skill script hook system that feeds it into the dashboard."

> Triggering incident (2026-05-25 ~02:00-04:30 CDT): 20+ concurrent chat sessions crashed overnight. Operator could not identify which session_id belonged to which slot. `PRISM Fleet.lnk` launcher (3-window, 15-slot, 2026-05-22 vintage) physically cannot cover the 26-slot fleet and never used `claude --resume <sid>` so even successful launches would not restore the prior conversations.

---

## §0 — What ships this milestone (deliverable contract)

**Phase A — SLOT-RECOVERY-MS0 (~8 units, ~3h)**

1. `state/shared/slot-sessions/<nato>.jsonl` — per-slot append-only session history sidecar (one file per slot, 26 files)
2. `SlotSessionHistoryEngine.ts` + `prism_session:slot_session_*` dispatcher actions (record/query/latest/prune)
3. Three hooks: `slot-session-sidecar-sessionstart.mjs` (initial entry) · `slot-session-sidecar-heartbeat.mjs` (60s update via existing `heartbeat-keepalive.mjs` chain) · `slot-session-sidecar-stop.mjs` (final clean-exit stamp)
4. `Launch-PRISM-Fleet.ps1` rewrite — 4-window / 26-slot layout, reads sidecar, `claude --resume <sid>` per tab when eligible, falls through to fresh `claude + /checkin-<slot>` per policy
5. `/slot-resume` skill — query sidecar for any slot, surface "last session was X, ended at Y, run `claude --resume X` to recover"
6. `/checkin-<slot>` extension — surface "your prior session was X (ended Yh ago, clean=true/false)" in the §Report block

**Phase B — FLEET-DASHBOARD-MS0 (~6 units, ~2h)**

7. `scripts/generate-fleet-state-features.mjs` — new system-viz generator producing `ghost.fleet_state` roost with 26 nodes (one per slot)
8. `scripts/generate-slot-queue-features.mjs` — augments existing `ghost.priority_queue` with per-slot subgroups (dedicated + general tasks)
9. `slot-task-queues.json` schema extension — add `dedicated: boolean` flag to queue entries (default false = "any chat may run")
10. `TaskAddEngine.ts` + `prism_session:task_add` dispatcher action — single canonical write path into atomic-roadmap + slot-task-queues
11. `/queue-add` skill — UI wrapper for TaskAddEngine
12. `auto-task-detect.mjs` hook (PostToolUse on git commits) — when a commit message names a regression / `## Recent regressions` fires, auto-propose a follow-up task entry (operator approves before write)

Total: 14 units. Cumulative cost: ~5h. Single-chat single-slot buildable in ≤2 sessions.

---

## §1 — Architecture (one diagram)

```
                ┌─────────────────────────────────────────────┐
                │  WHAT EACH CHAT KNOWS ABOUT ITSELF         │
                └─────────────────────────────────────────────┘

Claude session → claude-XXXXXXXX.jsonl transcript (on disk)
                ↓ mtime liveness (existing — chat-slots.mjs isTranscriptFresh)
chat-slots.json  →  { slot: { chatId, terminalWindowId, lastHeartbeat, ... } }
                ↓ SessionStart + 60s heartbeat + Stop/PreCompact  [NEW HOOKS]
slot-sessions/<nato>.jsonl (append-only)
                ↓ read at launch time  [NEW LAUNCHER LOGIC]
Launch-PRISM-Fleet.ps1  →  claude --resume <last-sid>  OR  fresh + /checkin-<slot>
                ↓ /checkin-<slot> Step "Resume" surfaces sidecar entry
Chat sees:    "Resuming foxtrot session 1dab582f (ended 6h ago, clean=true)
              Last directive: <RESUME from handoff>
              Slot queue: <pending units from slot-task-queues.json>"

                ┌─────────────────────────────────────────────┐
                │  WHAT THE OPERATOR SEES                     │
                └─────────────────────────────────────────────┘

state/shared/slot-sessions/<nato>.jsonl  +  slot-task-queues.json
                ↓ generate-fleet-state-features.mjs + generate-slot-queue-features.mjs
state/shared/system-viz/augmentations/fleet-state.json + slot-queue.json
                ↓ merge-augmentations.mjs (existing)
state/shared/system-viz/system-graph.json
                ↓ /system-viz (existing)
3D dashboard:
  ▸ ghost.fleet_state roost  →  26 slot cards (status · current directive · current goal · last 3 tasks)
  ▸ ghost.priority_queue augmented  →  per-slot subgroups (dedicated tasks blue · general tasks green)
```

---

## §2 — Sidecar schema (`state/shared/slot-sessions/<nato>.jsonl`)

Append-only JSONL. One file per slot. Retention: 30 entries (oldest pruned at write).

Each line is one of three event types:

```jsonc
// EVENT TYPE 1: session-start
{
  "schemaVersion": "1.0.0",
  "eventType": "session-start",
  "ts": "2026-05-25T02:00:00.000Z",
  "slot": "foxtrot",
  "sessionId": "1dab582f-9b61-4eea-8dd3-7b2ceb85c17b",
  "chatId": "claude-1dab582f",
  "host": "DESKTOP-N7MI1VB",
  "terminalWindowId": "tw-wt-d6d34ad6-...",
  "branch": "slot/foxtrot",
  "topic": "foxtrot-work",
  "directive": null,    // populated by next heartbeat once /checkin completes
  "transcriptPath": "C:/Users/wompu/.claude/projects/H--prism/1dab582f-9b61-4eea-8dd3-7b2ceb85c17b.jsonl"
}

// EVENT TYPE 2: heartbeat (60s by heartbeat-keepalive chain; idempotent)
{
  "schemaVersion": "1.0.0",
  "eventType": "heartbeat",
  "ts": "2026-05-25T02:30:00.000Z",
  "slot": "foxtrot",
  "sessionId": "1dab582f-...",
  "exitState": "running",
  "directive": "ship 3 units of QUOTING-PIPELINE-MS0",   // from /checkin args or /loop-state
  "currentGoal": "U-QT07 vendor-realtime-price",
  "transcriptSizeBytes": 37913920,
  "transcriptMtimeMs": 1716608400000,
  "loopIter": 4,
  "loopTarget": 10
}

// EVENT TYPE 3: session-end (Stop/PreCompact)
{
  "schemaVersion": "1.0.0",
  "eventType": "session-end",
  "ts": "2026-05-25T03:15:00.000Z",
  "slot": "foxtrot",
  "sessionId": "1dab582f-...",
  "exitState": "clean | precompact | stop | crash-inferred",   // crash-inferred set at NEXT-session-start if previous never wrote session-end
  "directive": "...",   // last known
  "finalResume": "...",   // first 500 chars of HANDOFF-<slot>-*.md RESUME section
  "handoffPath": "state/shared/handoffs/HANDOFF-claude-1dab582f-foxtrot-work.md",
  "transcriptSizeBytes": 41234567,
  "loopIter": 7,
  "loopTarget": 10
}
```

**Crash-detection invariant:** at SessionStart, the new hook reads the previous tail of the slot's JSONL. If the last event is NOT `session-end`, the new hook writes a `session-end` entry with `exitState: "crash-inferred"` BEFORE writing its own `session-start`. This closes the "no clean exit on PC shutdown" gap that today loses everything beyond the last heartbeat.

---

## §3 — Engine + dispatcher contract

### `SlotSessionHistoryEngine.ts` (new, src/engines/)

```ts
class SlotSessionHistoryEngine {
  // WRITE
  recordSessionStart(input: { slot, sessionId, chatId, host, terminalWindowId, branch, topic, transcriptPath }): Result;
  recordHeartbeat(input: { slot, sessionId, exitState, directive, currentGoal, transcriptSizeBytes, transcriptMtimeMs, loopIter, loopTarget }): Result;
  recordSessionEnd(input: { slot, sessionId, exitState, directive, finalResume, handoffPath, transcriptSizeBytes, loopIter, loopTarget }): Result;

  // READ
  getLatestForSlot(slot: string): SlotSessionEntry | null;          // most recent session-end OR last heartbeat
  getHistoryForSlot(slot: string, limit?: number): SlotSessionEntry[];
  getAllSlotsState(): Record<NatoSlot, FleetStateCard>;             // feeds dashboard
  isResumeEligible(slot: string, opts?: { maxAgeHours?: number }): { eligible: boolean, sessionId?: string, reason: string };

  // MAINTENANCE
  pruneSlot(slot: string, keepLast: number): { pruned: number };
  detectCrashedSlot(slot: string): { crashed: boolean, lastEventType: string, ageMs: number };
}
```

### Dispatcher actions (extend `prism_session`)

| Action | Purpose |
|---|---|
| `slot_session_record_start` | Hook-facing |
| `slot_session_record_heartbeat` | Hook-facing |
| `slot_session_record_end` | Hook-facing |
| `slot_session_latest` | `/slot-resume` skill + `/checkin-<slot>` surface |
| `slot_session_history` | Operator query |
| `slot_session_fleet_state` | Dashboard generator + `/fleet-state` skill |
| `slot_session_is_resume_eligible` | Launcher + `/checkin-<slot>` decision |
| `task_add` | `/queue-add` skill (new TaskAddEngine) |
| `task_propose` | `auto-task-detect.mjs` hook (operator approves before persist) |

---

## §4 — Hook wiring

### Three new hooks (slot-session sidecar)

| Hook | Event | Fires when | Writes |
|---|---|---|---|
| `slot-session-sidecar-sessionstart.mjs` | SessionStart (all matchers) | Every new chat (compact/clear/startup) | session-end with `crash-inferred` if previous tail isn't session-end, THEN session-start |
| `slot-session-sidecar-heartbeat.mjs` | (called by existing `heartbeat-keepalive.mjs` chain — UserPromptSubmit, 60s throttled) | Every prompt submit, throttled | heartbeat with current loop state + transcript mtime |
| `slot-session-sidecar-stop.mjs` | Stop | Every clean Stop | session-end with `clean` or matching exitState |

**Settings.json placement:** SessionStart hook goes AFTER `session-start-terminal-pin.mjs` (needs slot binding). Heartbeat chain extension uses existing `heartbeat-keepalive.mjs` so no new UserPromptSubmit insert. Stop hook goes AFTER `precompact-handoff.mjs` (needs handoff path for `finalResume` field).

**Knobs** (knobs all default-off-disable):
- `PRISM_SLOT_SESSION_SIDECAR_DISABLE=1` — kill switch
- `PRISM_SLOT_SESSION_HEARTBEAT_MIN_INTERVAL_MS=60000` — heartbeat throttle
- `PRISM_SLOT_SESSION_RETENTION=30` — entries-per-slot cap
- `PRISM_SLOT_SESSION_RESUME_MAX_AGE_HOURS=24` — auto-resume eligibility window

### One new hook (auto-task-detect)

`auto-task-detect.mjs` PostToolUse:Bash on `git commit` — parses commit subject; if subject matches a regression pattern (`fix:` / `regression:` / `silent` / `BLOCK`), proposes a follow-up task via `task_propose`. Operator approves via next `/checkin` Step "Pending proposed tasks". Never writes silently.

---

## §5 — Launcher rewrite (`Launch-PRISM-Fleet.ps1` v2)

### Layout — 4 windows / 26 slots

| Window | Slots | Reason |
|---|---|---|
| 1 (alpha row) | alpha bravo charlie delta echo foxtrot golf | 7 slots; golf=hygiene; first letters |
| 2 (hotel row) | hotel india juliett kilo lima mike november | 7 slots |
| 3 (oscar row) | oscar papa quebec romeo sierra tango uniform | 7 slots |
| 4 (victor row) | victor whiskey xray yankee zulu | 5 slots; last row absorbs remainder |

26 = 7+7+7+5. Column widths computed at launch like today (proportional to screen).

### Per-tab boot — new logic in `slot-tab-boot.ps1`

```powershell
# Read sidecar via dispatcher action
$resumeQuery = & node H:/prism/.claude/helpers/slot-session-query.mjs --slot $Slot --action is-resume-eligible
$resumeData = $resumeQuery | ConvertFrom-Json

if ($resumeData.eligible -and -not $env:PRISM_SLOT_NO_RESUME) {
  Write-Host "Resuming $Slot session $($resumeData.sessionId) (ended $($resumeData.ageHours)h ago, clean=$($resumeData.cleanExit))"
  & $ClaudeCmd --dangerously-skip-permissions --resume $resumeData.sessionId
} else {
  Write-Host "Fresh $Slot session ($($resumeData.reason)); will run /checkin-$Slot"
  & $ClaudeCmd --dangerously-skip-permissions "/checkin-$Slot"
}
```

### Eligibility predicates (`isResumeEligible`)

| Condition | Eligible? |
|---|---|
| Sidecar has no entries for slot | ❌ fresh |
| Last session_id's `.jsonl` does not exist on disk | ❌ fresh (transcript GC'd) |
| Last event `ts` > 24h ago | ❌ fresh (configurable via knob) |
| Last `.jsonl` last line is unparseable JSON (corrupt) | ❌ fresh |
| `PRISM_SLOT_NO_RESUME=1` env var set | ❌ fresh (operator override) |
| `--fresh` flag on launcher | ❌ fresh (operator override) |
| All above pass | ✅ resume |

---

## §6 — System-viz integration (FLEET-DASHBOARD-MS0)

### `ghost.fleet_state` roost (new)

Generator: `scripts/generate-fleet-state-features.mjs`. Calls `prism_session:slot_session_fleet_state` for current state. Emits 26 nodes:

```json
{
  "id": "ghost.fleet_state",
  "kind": "roost",
  "title": "Fleet state — what each chat is doing right now",
  "layer": "L8",
  "children": [
    {
      "id": "fleet_state.foxtrot",
      "kind": "slot-card",
      "title": "foxtrot",
      "status": "alive | stale | crashed | idle",
      "chatId": "claude-047e0a72",
      "sessionId": "...",
      "directive": "QUOTING-PIPELINE-MS0/U-QT07",
      "currentGoal": "vendor-realtime-price wiring",
      "loopIter": "4/10",
      "lastActivityAgeMs": 120000,
      "nextTasks": [
        { "unit_id": "U-QT08", "summary": "outsource-recommend bridge", "dedicated": true },
        { "unit_id": "U-QT09", "summary": "live-chat session-open", "dedicated": true },
        { "unit_id": "U-FLAGSHIP-X", "summary": "general task picker may take", "dedicated": false }
      ],
      "color": "#5bc0eb"   // alive=blue, stale=amber, crashed=red, idle=gray
    },
    /* ... 25 more ... */
  ]
}
```

### `ghost.priority_queue` augmentation (existing roost, extended)

Existing `generate-priority-queue-features.mjs` produces fleet-wide queue. New `generate-slot-queue-features.mjs` emits a PARALLEL augmentation that subgroups by slot — each subgroup shows: dedicated tasks (color: per-slot palette) above general tasks (color: gray).

Merging: both generators are wired into `regen-viz.mjs` FAST[] and `merge-augmentations.mjs` splice.

### Wired into existing chains

- `regen-viz.mjs` FAST[] gets two new entries
- `merge-augmentations.mjs` gets two new splices
- Existing `slot-ownership-overlay.json` continues to feed the slot binding layer (compatible — fleet-state roost is a NEW surface, not a replacement)

---

## §7 — `slot-task-queues.json` schema extension (Phase B)

Extending the existing 2026-05-17 schema (v1.0.0 → v1.1.0):

```jsonc
{
  "schemaVersion": "1.1.0",     // bump from 1.0.0
  "queues": {
    "<nato>": [
      {
        "unit_id": "U-...",
        "wave": "W0|W1|...",
        "cost": "S|M|L|XL",
        "spec": "...",
        "depends_on": [...],
        "summary": "...",

        // NEW v1.1.0 fields
        "dedicated": true,        // NEW: true = ONLY this slot; false = any slot may run
        "addedBy": "claude-9e91d800",   // NEW: who added it
        "addedAt": "2026-05-25T18:00:00Z",
        "source": "manual | queue-add-skill | auto-task-detect | atomic-roadmap-import"
      }
    ]
  },
  "general_pool": [                // NEW v1.1.0: tasks not slot-dedicated, any chat may pick
    { "unit_id": "...", ... }
  ]
}
```

Backward-compat: missing `dedicated` defaults to `true` (matches existing semantics — entries in `queues.<nato>` were slot-locked by convention before this field existed). `general_pool` is additive; missing = empty.

---

## §8 — `TaskAddEngine` + `/queue-add` skill

### `TaskAddEngine.ts` API

```ts
class TaskAddEngine {
  addTask(input: {
    unit_id: string,
    summary: string,
    slot?: NatoSlot,            // omit = general_pool
    dedicated?: boolean,        // default true if slot given, false otherwise
    wave?: string,
    cost?: "S"|"M"|"L"|"XL",
    spec?: string,
    depends_on?: string[],
    source: "manual"|"queue-add-skill"|"auto-task-detect"|"atomic-roadmap-import"
  }): Result<{ added: boolean, queuePath: string }>;

  proposeTask(input: { /* same as addTask but writes to pending file */ }): Result;
  approveTask(proposedTaskId: string): Result;
  rejectTask(proposedTaskId: string): Result;
  listProposed(): Result<{ proposed: ProposedTask[] }>;
}
```

Writes:
1. `slot-task-queues.json` (atomic, tmp+rename)
2. Mirrors into `mcp-server/data/roadmap-index.json` (canonical atomic-roadmap) when `unit_id` doesn't exist there yet
3. Emits `task-added` event for downstream consumers (dashboard regen, audit ledger)

### `/queue-add` skill (one-liner)

```
/queue-add U-NEW-THING --slot foxtrot --dedicated --cost M --summary "wire X into Y"
```

Resolves slot from args OR current chat's slot binding. Validates schema. Calls `prism_session:task_add`.

### Auto-detect hook flow

`auto-task-detect.mjs` runs PostToolUse:Bash matching `git commit` with subjects containing `fix:`, `regression`, `silent`, `BLOCK`, `R12`, `FAILLOUD`. Calls `task_propose` (not `task_add`) — adds to `state/shared/proposed-tasks.json` with reason. Next `/checkin` Step "Pending proposed tasks" surfaces them; operator approves to persist or rejects.

This is the FORCING FUNCTION for the user's "devise a system to add tasks to a new task queue that auto gets added" — auto-detected tasks land in a pending bin where operator can one-click approve, never silent.

---

## §9 — `/checkin-<slot>` extension (Phase A integration)

Adds a new §Resume block to the existing /checkin §Report:

```
## §Resume
Slot: foxtrot
Prior session: claude-047e0a72 (sessionId 1dab582f-...)
Last activity: 6h 17m ago
Exit state: crash-inferred (no clean Stop fired)
Last directive: "ship 3 units of QUOTING-PIPELINE-MS0"
Last goal: U-QT07 vendor-realtime-price
Last loop: iter 4/10

To resume the literal transcript (recovers FULL context):
  exit this fresh chat → `claude --resume 1dab582f-9b61-4eea-8dd3-7b2ceb85c17b`

To proceed in this fresh chat using only the handoff RESUME (no transcript):
  (continue typing — handoff is already loaded above)
```

Hook implementation: `/checkin` calls `prism_session:slot_session_latest` after the existing slot-claim step; the result populates the new block.

---

## §10 — PSN bridge

This work touches PSN legs (`feedback_psn_definition`):

| Leg | Touched | How |
|---|---|---|
| #1 Obsidian brain | Bridge | Memory entry `[[reference_slot_recovery_ms0_2026_05_25]]` written on ship |
| #2 PRISM OS | Extend | chat-slots.json already this leg; sidecar is its history layer |
| #3 Wiki | Bridge | Spec auto-published as `[[spec-slot-recovery-ms0]]` ghost via `generate-misc-l8-wiki.mjs` |
| #4 Memories | Read | sidecar reads slot-identity-cache for tier-3 chatId→slot recovery |
| #5 Tribal | (no integration needed) | — |
| #6 System Viz | Render | `ghost.fleet_state` roost + `ghost.priority_queue` augmentation |
| #7 Engines | New | `SlotSessionHistoryEngine` + `TaskAddEngine` + `FleetStateRenderEngine` |
| #8 Algorithms | (no integration needed) | — |
| #9 Formulas | (no integration needed) | — |
| #10 NN/GNN | (no integration needed today; possible future use: predict next-task for a slot via embedding match) | — |
| #11 PRISM AI | Bridge | `prism_session:slot_session_fleet_state` exposes leg-#2 state to leg-#11 routing |

---

## §11 — Conflicts checked + resolutions

| Conflict | Status | Resolution |
|---|---|---|
| Handoff-writer ban (`feedback_handoff_writers`) | OK | Sidecar is NOT a handoff — different file, different schema, hook-written is fine |
| `slot-identity-cache.mjs` chatId→slot | OK | History sidecar is slot→[history of chatIds] — orthogonal, layers on top |
| `slot-task-queues.json` v1.0.0 (SLOT-AUTO-LOOP-MS0) | EXTEND | Bump to v1.1.0 with backward-compat default — existing entries become `dedicated:true` implicitly |
| `slot-task-claim.mjs` (PER-SLOT-CLAIM-MS0) | OK | Claim store is per-UNIT TTL locks; orthogonal to task queue |
| `priority-queue.mjs` (PRIORITY-QUEUE-MS0) | OK | Fleet-wide picker; per-slot queue is subset/ordering — sibling not replacement |
| `terminal-window-pin` (SESSION-CONTINUITY-MS0) | OK | Sidecar records `terminalWindowId` so resume-eligible math respects pin |
| `precompact-auto-trigger` (5-min freshness gate) | OK | Sidecar writes are NOT handoff writes — gate doesn't trip |
| File-claim contention (multi-chat) | OK | Sidecar uses per-slot file (zero cross-slot contention); writes use tmp+rename per chat-slots.mjs convention |
| atomic-roadmap as truth | OK | `TaskAddEngine.addTask` mirrors into atomic-roadmap when unit doesn't exist there |
| Dedup against existing engines | TBD | `duplicationGuardEngine.mustCheckBeforeCreating()` runs at unit build time; spec asserts no existing match (verified via inventory recall) |

---

## §12 — Failure modes + escape hatches

| Failure mode | Detection | Recovery |
|---|---|---|
| Slot sidecar JSONL corrupt (partial last line) | `is-resume-eligible` returns `eligible:false, reason:"corrupt-tail"` | Fresh `claude` launch; corrupt line is logged but kept (operator audit) |
| Transcript GC'd by Claude Code (older sessions auto-cleaned by `cleanupPeriodDays: 60` in settings.json) | `findTranscriptFile(sid)` returns null at launcher | Fresh launch; sidecar entry kept but tagged `transcriptGcd:true` |
| Sidecar grows >30 entries | `recordSessionStart` prunes oldest in-place | Atomic — pruning is part of the append transaction |
| Launcher fails to find pwsh 7 / wt / claude.cmd | Pre-flight check (already in existing launcher) | Stops with clear error; current behavior preserved |
| Hook chain breaks during heartbeat write | Heartbeat is idempotent; missed beats are non-fatal | Next beat catches up; gap visible in JSONL but not corruption |
| PC shutdown mid-write | tmp+rename guarantees the file is either pre-write or post-write, never partial | First SessionStart on next boot detects no session-end → writes `crash-inferred` |
| Two slots somehow point at same sessionId (cache drift) | sidecar's `slot` field is authoritative per file | Each file is per-slot; cannot drift via sidecar |
| `slot-task-queues.json` schema mismatch (v1.0 file, v1.1 reader) | Reader checks `schemaVersion`; missing fields defaulted | Backward-compat path; no migration needed |

All knobs:
- `PRISM_SLOT_SESSION_SIDECAR_DISABLE=1`
- `PRISM_SLOT_SESSION_HEARTBEAT_MIN_INTERVAL_MS=60000`
- `PRISM_SLOT_SESSION_RETENTION=30`
- `PRISM_SLOT_SESSION_RESUME_MAX_AGE_HOURS=24`
- `PRISM_SLOT_NO_RESUME=1` (per-process)
- `PRISM_AUTO_TASK_DETECT_DISABLE=1`
- `PRISM_FLEET_STATE_VIZ_DISABLE=1`

---

## §13 — Unit breakdown (the milestone)

### SLOT-RECOVERY-MS0 (Phase A)

| Unit | Cost | Spec section | Depends on |
|---|---|---|---|
| U-SR01 | S | §2 schema + §3 engine | — |
| U-SR02 | S | §4 SessionStart hook | U-SR01 |
| U-SR03 | S | §4 Heartbeat hook chain extension | U-SR01 |
| U-SR04 | S | §4 Stop hook | U-SR01 |
| U-SR05 | M | §5 Launcher rewrite (4-window / 26-slot / resume-eligible) | U-SR01 |
| U-SR06 | S | `/slot-resume` skill | U-SR01 |
| U-SR07 | S | `/checkin-<slot>` §Resume block extension | U-SR01 |
| U-SR08 | S | tests: sidecar I/O, crash-inferred, resume-eligible matrix | U-SR01..04 |

### FLEET-DASHBOARD-MS0 (Phase B)

| Unit | Cost | Spec section | Depends on |
|---|---|---|---|
| U-FD01 | S | `slot-task-queues.json` schema v1.0→v1.1 (additive) | — |
| U-FD02 | M | `TaskAddEngine` + dispatcher actions | U-FD01 |
| U-FD03 | S | `/queue-add` skill | U-FD02 |
| U-FD04 | S | `auto-task-detect.mjs` hook (commit-pattern → propose) | U-FD02 |
| U-FD05 | M | `generate-fleet-state-features.mjs` + viz wiring | U-SR01 (sidecar reads) + U-FD02 (queue reads) |
| U-FD06 | S | `generate-slot-queue-features.mjs` + viz wiring | U-FD01 |

Total: 14 units. 9 small (S), 5 medium (M). No L/XL.

---

## §14 — Testing strategy

- **Sidecar I/O** — write start/heartbeat/end → read → assert event types in order
- **Crash-inferred** — write start with no end → SessionStart → assert previous tail gets crash-inferred → assert new start follows
- **Resume eligibility matrix** — 7 conditions × eligible/ineligible = 14 unit tests
- **Launcher dry-run** — `Launch-PRISM-Fleet.ps1 -DryRun` shows 4 wt commandlines, 26 slots, correct per-tab `--resume` vs fresh
- **System-viz regen** — `regen-viz.mjs --include-fleet-state` produces graph with `ghost.fleet_state` and 26 child nodes
- **Task add** — `/queue-add U-X --slot alpha --dedicated` → assert appears in `slot-task-queues.json` under `queues.alpha`
- **Auto-task-detect** — simulate git commit with `fix:` subject → assert proposed task lands in `proposed-tasks.json` → `/checkin` surfaces it
- **End-to-end** — chat A starts, heartbeats, /precompact → chat B starts in same slot → sees crash-inferred=false + clean=true on prior

---

## §15 — Migration + first-cut testing

1. Build U-SR01 (engine + dispatcher) — no behavior change yet, just primitives.
2. Build U-SR02..04 (hooks) — start writing sidecar entries. Existing system unaffected because launcher doesn't read it yet.
3. **Soak for 24h** — all hooks writing, no consumer. Verify no perf regression in heartbeat-keepalive chain, no settings.json contention.
4. Build U-SR05 (launcher rewrite). Test with `-DryRun`. Manual run on a NON-PROD desktop trio first.
5. Build U-SR06..08 (skill + hooks + tests).
6. Phase A done. Cut over: replace `PRISM Fleet.lnk` target.
7. Build Phase B units in dep order.

No big-bang migration. Each unit is independently revert-able.

---

## §16 — Open questions for operator review

1. **Phase A vs Phase B ordering** — proposed Phase A first (recovery alone unblocks the immediate pain). OK?
2. **Slot-tab layout for 26 slots** — proposed 7+7+7+5. Alternatives: 6+7+7+6 (balanced). Preference?
3. **Auto-task-detect approval flow** — proposed `/checkin` Step surfaces pending. Alternative: a dedicated `/queue-review` skill. Preference?
4. **Sidecar retention** — proposed 30 entries per slot (~30 sessions of history). Alternatives: 100 entries, or 14 days time-bounded. Preference?
5. **`general_pool` task source** — proposed: any task added without `--slot` arg. Alternative: an explicit `--pool` flag. Preference?

(All defaultable — I'll proceed with proposed defaults unless overridden.)

---

## §17 — Sign-off

- [ ] Operator approves §0 deliverable contract
- [ ] Operator approves §1 architecture
- [ ] Operator approves §13 unit breakdown
- [ ] Operator answers §16 open questions (or accepts defaults)
- [ ] Chat (slot:TBD) claims SLOT-RECOVERY-MS0 milestone and begins U-SR01

Once signed off, the build path is:
1. /checkin a slot for this work (suggest **golf** — hygiene domain matches slot-fleet recovery; or **mike** — misc/general per JULIETT-12CHAT-ALLOCATION)
2. Add milestone to `mcp-server/data/roadmap-index.json` with `phases` for Phase A + Phase B
3. Begin /loop U-SR01

— Spec drafted 2026-05-25 by claude-9e91d800 (slot:unbound, machine: DESKTOP-N7MI1VB). Pre-build sign-off required per CLAUDE.md doctrine (R10 checkpoint, brainstorming skill mandate).
