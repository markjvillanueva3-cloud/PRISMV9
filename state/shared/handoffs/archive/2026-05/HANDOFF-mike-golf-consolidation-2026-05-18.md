---
slot: mike
topic: golf-consolidation-2026-05-18
kind: consolidation-handoff
generatedAt: 2026-05-18T20:25:00Z
sourceSlot: golf
sourceFiles:
  - state/shared/handoffs/consolidated/golf.md
  - state/shared/handoffs/HANDOFF-golf-golf-work.md (24.8h old)
  - state/shared/handoffs/HANDOFF-claude-629a6355-golf-cad-fusion-live.md (38.5h old)
  - state/shared/handoffs/HANDOFF-claude-629a6355-golf-work.md (39.4h old)
  - state/shared/handoffs/HANDOFF-golf-isolation-check.md (118.7h old)
generatedByChat: claude-b23a56ef (slot=golf-work)
---

# Mike pickup — golf-slot orphan work consolidation (2026-05-18)

Operator directive: "pull all remaining work from previous golf sessions and chats that never got a check-in slot and consolidate to mike."

The golf slot owns fleet-hygiene by doctrine (per [[feedback_golf_owns_reaper]] 2026-05-16). Mike is a normal work slot (alpha..mike = 13 work slots; golf = hygiene). This handoff moves golf orphans → mike for real fix-work without disturbing golf's fleet-reaper ownership.

## RESUME (read this first)

Two real bug-fix tasks + three pending milestones to pick up. Item 1 is shop-floor-critical (Windows OS-level reaper miss under pressure 95-98%); pick that first. The 3 milestones can wait.

## Pickup queue (priority-ranked)

### P0 — `windowsKill()` batches under pressure, mislabels survivors as killed
**File:** `scripts/fleet-reaper-sweep.mjs:406-442` (windowsKill function)
**Bug:** batches all PIDs into one PS `foreach + execFileSync(timeout:PS_TIMEOUT_MS, killSignal:SIGKILL)`. Under 95-98% commit, the batched PS is slow → Node SIGKILLs mid-loop before trailing PIDs flush their `ok`/`err` lines → line 441 mislabels survivors as "no result returned by Stop-Process" and they **survive** at peak pressure.
**Evidence (from thread 1, 24.8h old):** PIDs 15116/24736 alive 30-49 min, owner=`wompu`, non-elevated. Direct single-PID `Stop-Process -Force` killed both instantly. Batch path failed to kill them.
**Retracts prior P2 "benign" call.**
**Fix candidates** (Karpathy R1 classify before writing):
  (a) Per-PID spawn instead of batch — eliminates the SIGKILL-mid-loop race (simplest, highest reliability)
  (b) Scale `PS_TIMEOUT_MS` with `effectiveKillAfter` so under pressure we wait longer
  (c) Post-kill `Get-Process -Id <pid>` verify pass that reclassifies false-success → real-success/real-fail
  **Recommend (a) + (c)** — (a) fixes the race; (c) is the regression oracle that proves it.
**Test plan:** simulate by introducing artificial slowness in the PS script + verify all PIDs report correct kill state.
**Peer claim risk:** the file was peer-claimed by `claude-23c10eea` per thread 1; chat-bus message `5aa90b29` was sent. Re-verify before editing — mike should check the file claim namespace first.

### P0 — `slotLabel:null` in `fleet-memory-monitor.mjs:305-309`
**File:** `scripts/fleet-memory-monitor.mjs:305-309` + `process-slot-map.mjs attributeProcesses`
**Bug:** the slot-attribution monitor returns `slotLabel:null` for the largest tree even when chat-slots data is available — the join from PID/terminal → slot fails because the resolution path doesn't walk ancestry from `state.pid + terminalWindowId` consistently.
**Why it matters:** when memory hits critical, the monitor's `AGENT_CHAT` advisory is supposed to name WHICH chat should `/compact`. With `slotLabel:null` it can't — the operator gets `tree-PID` and has to identify the window manually.
**Fix:** resolve slot→claude.exe at *claim time* (write the claude.exe PID into chat-slots state when the slot is claimed) OR walk ancestry from `state.pid + terminalWindowId` in `attributeProcesses` as a fallback.
**Touches:** `chat-slots.mjs` is peer-claimed by `claude-339c8ff7` — coordinate before edit.

### P1 — `INFRA-CONSENSUS-WIRE-MS0`
**Source:** thread 2 (38.5h old). Milestone envelope owner unknown to this handoff — query `state/shared/MILESTONE_PROGRESS.md` for current status.
**Picker:** `node H:/prism/.claude/helpers/priority-queue.mjs --pick --slot mike` should surface it if not shipped.

### P1 — `INFRA-AGI-ROUTER-MS2`
**Source:** thread 2. Same query approach.

### P1 — `L8-P0-MS2`
**Source:** thread 2. Same query approach.

### P3 — `MEMORY.md alpha-line SUPERSEDED tag` (deferred)
**Source:** thread 3 (39.4h old). The GOLF-OWNS-REAPER-MS0 ship is done; only this small docs follow-up is open. Peer `claude-a61bbf34` held `MEMORY.md` at the time. May already be resolved; check `git log --oneline -10 -- MEMORY.md` before assuming.

## Already shipped (do NOT re-do)

- **GOLF-OWNS-REAPER-MS0** — doctrine moved from alpha → golf (thread 3, commit unknown but live: `golf-slot-reaper-guardian.mjs` wired in settings.json, `alpha-slot-reaper-guardian.mjs` preserved-but-unwired, /checkin-golf carries non-skippable fleet-reaper section, feedback memories live).
- **Memory-crash remediation 4/4** — thread 1, commit `ac9cca8902` (enum-blind `$p.Name` fix + 3 tests).
- **CAD-Fusion-live tsc-fix** — thread 2 last commit `12f4cd0d42` (MachiningPlaybook + PlaybookRules `getAllRules()` API).

## Notes

- **Thread 4** (HANDOFF-golf-isolation-check, 118.7h) is empty — no real content, just a terminal-id sanity check. Safe to ignore; archived implicitly by being >5 days stale.
- **Mike's slot binding:** when picking this up, run `/checkin-mike` first to bind the slot + topic to `golf-consolidation-2026-05-18` (or a more specific topic per the task picked). This handoff is the entry point.
- **Peer-claim risk on P0 fix files** — both `fleet-reaper-sweep.mjs` and `chat-slots.mjs` were peer-claimed at golf's handoff-write time. Re-check claims via `node H:/prism/.claude/helpers/file-claim.mjs status <path>` before editing.

## Cross-refs

- Pre-merged source: [[state/shared/handoffs/consolidated/golf.md]]
- Doctrine: [[feedback_golf_owns_reaper]] · [[feedback_never_delete_only_disable]]
- Tooling: `priority-queue.mjs --pick --slot mike` · `chat-slots.mjs claim --preferSlot mike`
- Slot info: [[checkin-mike]] · the canonical NATO wrapper that force-claims mike + runs full /checkin pipeline.
