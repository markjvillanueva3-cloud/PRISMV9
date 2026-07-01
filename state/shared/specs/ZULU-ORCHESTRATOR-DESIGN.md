# ZEBRA-ORCHESTRATOR — design spec (2026-05-20, slot bravo, /goal)

**Mission:** slot `zebra` becomes the fleet's chat orchestrator. Watches every
active chat slot's token pressure + drift state. When a chat crosses the
auto-compact threshold or drifts off-task, zebra DRIVES the chat via UI
Automation SendKeys through `/compact` → `/checkin-<slot>` → next backend-dev
high-ROI unit. Closes the hook ceiling: hooks can BLOCK + INJECT but cannot
INVOKE slash commands; zebra is the external actuator.

**Goal-of-record (operator, 2026-05-20):** "make chat slot zebra the
designated chat orchestrator. it will check when chats need to compact and
invoke them, then invoke the proper start up command relative to context,
current status and slot they're orchestrating, orchestrate each chat to stay
on task and avoid drifting. backend development tools with high roi are first
priority for each task queue of each chat."

## Existing backbone (DO NOT REBUILD — CHO-MS0 already shipped 2026-05-17)

| Unit | Commit | Artifact | Role |
|------|--------|----------|------|
| U-CHO01 | `85703afab633` | `scripts/lib/chat-orchestrator-decisions.mjs` (8.0K) + `.test.mjs` (11.5K, 25 tests) | Pure decision module — `decideClearOrCompact(chatState) → noop\|advise\|clear\|compact`; `decideRestartAction(slotState) → respawn\|skip-*`; SAFE_ACTIONS ⊥ REACHING_ACTIONS taxonomy |
| U-CHO02 | `5ece125d8b34` | `scripts/lib/chat-token-watch.mjs` + `.test.mjs` (26 tests) | Per-chat token estimator — reads transcript JSONL, finds last `isCompactSummary:true` boundary, classifies clean/warn/critical (warn 800K, critical 940K, env-tunable) |
| U-CHO04 | `7b1a19655ca0` | `.claude/helpers/send-keys-to-window.ps1` + `scripts/lib/send-keys.mjs` (23 tests + live PS smoke) | UI Automation actuator — PS P/Invoke `SendInput` KEYEVENTF_UNICODE, foreground-attach workaround for Win10/11, dry-run default, `-Confirm` per-slot gate, `PRISM_SENDKEYS_DISABLE` kill switch |

The brain (decisions), sensor (token-watch), and actuator (send-keys) all
exist. The MAIN LOOP that wires them does not. The 4th piece — U-CHO03 (chat
inventory walker) — was never committed; ZEBRA-MS0 supersedes the slot.

## Original design said "golf"; correction → "zebra"

CHO-MS0 doctrine: *"golf is an ORCHESTRATOR not a SEIZER."* But golf is now
the fleet-hygiene slot (fleet-reaper, fleet-memory-monitor,
fleet-task-health). Overloading orchestrator onto golf compromises both
roles. **Zebra (slot 26, NATO last) becomes the dedicated orchestrator.**
Golf stays hygiene-only. The two slots cannot both touch the same chat's
action path; if conflict, zebra wins for action, golf wins for hygiene
writes.

## Units (ZEBRA-MS0, 7 ship + 1 deferred)

### U-ZEBRA01 — HWND resolution in chat-slots.json
Current schema: `terminalWindowId` is a stable PID. SendKeys needs an HWND.
Add `terminalWindowId.hwnd` populated by `.claude/helpers/terminal-window-id.mjs`
(PowerShell `Get-Process -Id <pid> | %{ $_.MainWindowHandle }`). Backward-
compat: missing hwnd → resolved-on-demand at sendkeys time, cached in slot
record. Schema v2 → v3 bump (additive; readers tolerate missing field).

### U-ZEBRA02 — zebra main loop (the body)
`scripts/zebra-orchestrator-sweep.mjs`:
1. Read `state/shared/chat-slots.json` → for each slot in `SLOT_NAMES` except `zebra`:
2. Call `readChatPressure(sessionId, {slot})` (CHO02)
3. Call `decideClearOrCompact(chatState)` + `decideRestartAction(slotState)` (CHO01)
4. If action ∈ REACHING_ACTIONS and `slots[name].zebraOptIn === true`:
   - Resolve HWND (U-ZEBRA01)
   - `sendKeysToWindow({hwnd, text: '/compact\n', confirm: true})` (CHO04)
   - Stagger 5s between reach actions
5. Emit JSONL log → `state/shared/zebra-orchestrator-log.jsonl`
6. AGENT_CHAT advisory line on every reach action
7. R12: any unknown state → SAFE default (advise-only); never guess.

### U-ZEBRA03 — scheduled task (90s cadence)
`.claude/helpers/install-zebra-orchestrator-task.ps1` — mirrors
`install-fleet-reaper-task.ps1`. SYSTEM principal default; phase offset
+120s (clears reaper +210s, cleanup +60s, memmon +330s, task-health
unscheduled). Kill switches honored: `PRISM_ZEBRA_DISABLE=1` (sweep refuses
all actions), `PRISM_SENDKEYS_DISABLE=1` (inherited from CHO04, blocks the
final send).

### U-ZEBRA04 — drift correction
Read per-slot `state/shared/loop-state/loop-<sessionId>.json`. Drift heuristic:
loop status=`running` AND iter advanced N times AND no git commit in last N
iters AND last commit subject's `[SCOPE]/U-ID` no longer matches loop task. On
drift detect, SendKeys: `/checkin-<slot> <re-anchored task description>\n`.
Conservative: only fires after 3 consecutive driftless iters with sidecar=
GREEN (token-pressure compact action must take precedence). Configurable
window via `PRISM_ZEBRA_DRIFT_ITERS`.

### U-ZEBRA05 — backend-dev high-ROI priority enforcement
On post-compact `/checkin-<slot>` SendKeys payload, append directive:
`priority filter U-WIRE*|U-BRIDGE*|U-HOOK*|backend-dev FIRST`. Falls back to
`node .claude/helpers/priority-queue.mjs --pick --slot <slot>` (already
exists per [[priority-queue-ms0-2026-05-16]]) if the chat ignores the hint.
Honors [[feedback_prioritize_devtools_backend]] +
[[feedback_high_roi_backend_first_slot_queue]] standing doctrine.

### U-ZEBRA06 — opt-in advisory hook (for non-SendKeys chats)
For chats that can't accept SendKeys (WSL, RDP, screen-shared), zebra emits
an advisory in their UserPromptSubmit context instead:
"zebra recommends /compact now (ctx 92%)". New hook:
`.claude/hooks/zebra-advisory-inject.mjs`. Per-slot opt-out:
`slots[name].zebraAdvisoryOnly === true`. Distinct from token-awareness-inject
(which is a state inject for ALL chats); this one is zebra's direct advisory.

### U-ZEBRA07 — slot-doctrine reflection (4-surface)
- CLAUDE.md: new §ZEBRA-ORCHESTRATOR section; §GOLF SLOT updates to drop the
  "orchestrator" framing (golf stays hygiene-only)
- MEMORY.md pointer: `reference_zebra_orchestrator_2026_05_20.md`
- Wiki entry: `knowledge/wiki/architecture/zebra-orchestrator.md`
- New `/checkin-zebra` wrapper carries the orchestrator activation contract
  (default slot binding is already there — wrapper just adds the activation-
  ack text)

### U-ZEBRA08 — zebra self-watchdog (DEFERRED to MS1)
If the zebra chat itself crashes, who reaps it? Either fleet-reaper (already
slot-aware) or a small dedicated watchdog. Deferred until MS0 proves the
loop works.

## Safety invariants (load-bearing — every unit honors)

1. **Per-slot opt-in.** No slot is acted upon (REACHING_ACTION) unless
   `slots[name].zebraOptIn === true`. Default false. Operator typing
   `/zebra-opt-in` in a slot is the only enable path. (Skill ships with U-ZEBRA02.)
2. **Env kill switch (cascade).** `PRISM_ZEBRA_DISABLE=1` blocks every action
   in the sweep script; `PRISM_SENDKEYS_DISABLE=1` (CHO04) blocks every PS
   send. Either alone is sufficient.
3. **Dry-run default for new opt-ins.** First 24h after `zebraOptIn=true`,
   actions are LOGGED ONLY (no `-Confirm:$true`). Operator promotes to live
   via `/zebra-go-live` after observing the log.
4. **Stagger interval.** ≥5s between any two reach actions across the fleet
   (prevents SendInput thrash + foreground-window race).
5. **Decision evidence in log.** Every reach action emits the {chatState,
   slotState, decision} tuple to `zebra-orchestrator-log.jsonl` — fully
   reproducible.
6. **No self-action.** Zebra slot is excluded from the sweep target list.
7. **R12 fail-loud.** Any unknown state → SAFE default (advise-only or
   skip). Never guess; never throw.
8. **Single-host scope.** Zebra runs per-host. Cross-host coordination is
   out of scope for MS0 (each PC has its own zebra; no cross-host SendKeys).

## Test plan (per-file 2-reviewer gate per CLAUDE.md §PER-FILE SCRUTINY)
- U-ZEBRA02 main loop: hermetic fixture chat-slots + transcripts + injected
  `_sendKeys`; matrix (pressure × continuity × opt-in × kill-switch) =
  4×3×2×2 = 48 cases; one real-PS smoke for SendKeys integration
- U-ZEBRA04 drift: synthetic loop-state fixtures, 12+ cases incl. fail-on-
  revert oracle (no commit + iter advanced)
- U-ZEBRA05 priority filter: golden-text test for SendKeys payload includes
  U-WIRE*|U-BRIDGE*|U-HOOK* terms

## Roadmap envelope
- Create `mcp-server/data/milestones/ZEBRA-ORCHESTRATOR-MS0.json` (U-ZEBRA01..07,
  U-ZEBRA08 deferred)
- Register in `data/roadmap-index.json` via `scripts/atomic-json.mjs`
- Target: 7-iteration /loop, 1 unit per iter, this session goal-of-record

## /loop iteration ordering (deterministic dependency graph)

```
U-ZEBRA01 (HWND schema)  ──┐
                            ├──► U-ZEBRA02 (main loop) ──► U-ZEBRA03 (scheduled task)
U-ZEBRA06 (advisory hook) ──┘                                        │
                                                                     ▼
U-ZEBRA04 (drift correction) ◄──── reuses U-ZEBRA02 main loop ──► U-ZEBRA05 (BD priority payload)
                                                                     │
                                                                     ▼
                                                          U-ZEBRA07 (4-surface doc reflection)
```

Iter order: 01 → 06 → 02 → 03 → 05 → 04 → 07. (06 ships early because the
advisory path validates the decision module against real chat-slots data
before we wire SendKeys. 05 ships before 04 because the BD-priority text is
a constant; drift is heuristic-tuned and benefits from observing the live
priority pickup in the log.)

## Out of scope (separate milestones)
- Cross-host orchestration (different PCs)
- LLM-driven drift detection (MS0 = heuristic only)
- Cross-chat memory propagation through zebra (today: chats own their
  handoffs; zebra is read-only on handoff data)
- Auto-spawn new chats (today: zebra only acts on EXISTING chats; new-chat
  spawn is operator-driven via `/checkin-<slot>` in a fresh PS window)

## Why this works (the audit-resistant argument)

1. **The hook ceiling is real.** Demonstrated this session: session-start-
   auto-resume injected "NEXT ACTION: /checkin-bravo" and I ignored it.
   No further hook can close that gap — Claude Code makes slash commands
   user-input-only by design.
2. **SendKeys is the only out.** SendInput KEYEVENTF_UNICODE is documented
   in U-CHO04 as the only reliable way to type into a foreground console
   from another process. Per-slot opt-in + dry-run + stagger keeps it
   non-destructive.
3. **The pieces already work.** CHO01/02/04 each shipped with 23-26
   passing tests, including a live PS smoke for the actuator. The risk
   surface is the GLUE (the main loop), not the primitives.
4. **Zebra is reversible.** Opt-in default false; kill switches cascade;
   dry-run for 24h before live. Operator can disable the entire system
   with one env var.
5. **Fail-safes already exist.** If zebra crashes mid-action, the chat is
   in the same state it was before (SendKeys is atomic per-call). If a
   send misfires, the chat shows the misfired text and the operator can
   correct. No state corruption path.

## Doctrine pointer (post-ship)

After ZEBRA-MS0 ships, CLAUDE.md §GOLF SLOT updates:
- Golf retains: fleet-reaper ownership, hygiene-only writes, hygiene
  scheduled tasks
- Zebra adds: orchestrator role, SendKeys actuator, per-slot reach actions
- Golf and zebra cannot both touch the same slot's tool-call/SendKeys
  path; if conflict, zebra wins for action, golf wins for hygiene writes

Wiki: [`knowledge/wiki/architecture/zebra-orchestrator.md`] (to be written
in U-ZEBRA07). Memory: [[reference_zebra_orchestrator_2026_05_20]] (to be
written in U-ZEBRA07).
