# SLOT-AUTO-LOOP-MS0 — `/checkin-<nato>` auto-engages /loop on slot queue (2026-05-17)

> User directive (2026-05-17): "I want to be able to just say /checkin-natoname to start a session and they'll immediately work and /loop until all units and tasks are completed for specific build they're working on which will be their /goal".

---

## §0 — What ships this milestone

1. **`state/shared/slot-task-queues.json`** (SHIPPED this commit) — 12-slot ordered unit queues compiled from V1 allocation + synergy map + iter-4 token audit. Each entry: `{unit_id, wave, cost, spec, depends_on, summary}`. 36 units total across 12 slots.
2. **`scripts/slot-queue.mjs`** (SHIPPED this commit) — CLI: `--pick --slot <nato>` / `--list --slot <nato>` / `--status` / `--remaining --slot <nato>`. Filters already-shipped (MILESTONE_PROGRESS) + peer-claimed (slot-task-claims) + dep-blocked.
3. **This spec** — operational contract for how `/checkin-<nato>` integrates the queue.

---

## §1 — Operational contract

When operator types `/checkin-<nato>` (e.g. `/checkin-alpha`) with NO trailing args:
1. **Slot bind** (existing /checkin Step 2) — force-claim slot, reap stale peers, set topic = `<nato>-work`.
2. **Slot worktree cutover** (existing /checkin Step 2c) — migrate to `H:/prism-slot-<nato>` on `slot/<nato>` branch.
3. **NEW — auto-/loop engage** — read `state/shared/slot-task-queues.json` for this slot; if `remaining > 0`, set the slot's /goal to "ship all <N> units in slot queue: <list>" and start /loop with target = remaining.
4. **Loop iteration** — each tick:
   - `node scripts/slot-queue.mjs --pick --slot <nato> --json` → next eligible unit
   - claim it via `slot-task-claim.mjs claim --slot <nato> --unitId <id>`
   - read its spec (`state/shared/specs/UNITS/<unit_id>.md` if exists; else read summary from queue entry)
   - build → per-file scrutiny (2 reviewer agents per file in multi-file unit) → 3-of-3 Stop gate → commit with `[SCOPE]/U-ID: title` format → release claim
   - tick `loop-state.mjs tick --status ok`
5. **Termination** — `slot-queue.mjs --remaining --slot <nato>` returns 0 → /loop ends → `/handoff` → /precompact.

If `/checkin-<nato>` receives trailing args (e.g. `/checkin-alpha fix tsc error in X`):
- The trailing arg IS the /goal per [[feedback_checkin_args_are_primary_work_order]] — supersedes queue auto-mode.
- Queue auto-mode resumes on next bare `/checkin-<nato>`.

---

## §2 — Queue structure (`slot-task-queues.json` schema)

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "ISO8601",
  "generatedBy": "<chat-id>",
  "queues": {
    "<nato>": [
      {
        "unit_id": "U-...",          // unique unit identifier
        "wave": "W0|W1|W2|W3|W4|<synergy|fanout|token|meta>",
        "cost": "S|M|L|XL",          // S=2-4h, M=4-8h, L=8-16h, XL=16h+
        "spec": "<path|pending-generator>",  // per-unit spec under state/shared/specs/UNITS/
        "depends_on": ["U-..."],     // unit_ids that must SHIP before this becomes eligible
        "summary": "1-line"          // shown when --pick prints next unit
      }
    ]
  },
  "operator_gates": [
    { "id": "U-WIRE-DOCTRINE-RESOLUTION", "blocks": [...] }
  ],
  "silent_degrade_fixes": [...]      // F1-F5 from synergy iter-3
}
```

Items priority-ordered by wave within each slot (W0 → W1 → W2 → W3 → W4 → synergy → fanout → token).

---

## §3 — Integration with existing systems

| System | Integration point | Status |
|--------|-------------------|--------|
| `/checkin-<nato>` wrappers | NEW: queue auto-mode when args empty | **Pending wrapper edit** (39 NATO×3 wrappers exist per CLAUDE.md PER-SLOT WRAPPERS) |
| `slot-task-claim.mjs` | Claim each unit from queue head before building | ✅ Existing API |
| `MILESTONE_PROGRESS.json` | Marks shipped units; queue picker auto-skips | ✅ Existing (`build-milestone-progress.mjs`) |
| `loop-state.mjs` | Tracks /loop iter count + status | ✅ Existing |
| `priority-queue.mjs` (PRIORITY-QUEUE-MS0) | Existing fleet-wide priority queue (4497 pending) | Sibling — slot-queue is a per-slot subset; priority-queue is fleet-wide |
| `roadmap-tool-plans.json` (RGS-TOOL-AUTOINVOKE) | Per-unit tool plan ingestion | ✅ Existing; chat reads plan at iter start |
| `per-unit specs` | Read at unit-pick to brief the chat | ⚠️ 5 of 36 written; U-UNIT-SPEC-GENERATOR closes gap |

---

## §4 — Why slot-queue.json AND priority-queue.json coexist

- **priority-queue.json** (PRIORITY-QUEUE-MS0) = fleet-wide master queue of 4497 pending units, color-coded blue=backend-dev / amber=bridge / green=app. Used when ANY slot wants "next best work fleet-wide".
- **slot-task-queues.json** (this milestone) = per-slot CURATED priority list, 36 hand-allocated units, /goal-style. Used when slot wants its OWN pre-assigned queue (the user's intent).

`/checkin-<nato>` auto-loop prefers slot-task-queues.json first; falls back to priority-queue.mjs `--pick --slot <nato>` when slot queue empty.

---

## §5 — Pending wrapper changes (next-iter)

`.claude/commands/checkin-<nato>.md` × 12 work slots need a § appended at the end of each, BEFORE the canonical /checkin pipeline:

```markdown
## Slot-queue auto-loop (new — SLOT-AUTO-LOOP-MS0)

If args after `/checkin-<nato>` are EMPTY:
1. Run `node H:/prism/scripts/slot-queue.mjs --remaining --slot <nato>`
2. If output > 0, set /goal to "ship all <N> units in this slot's queue" and engage /loop with target=<N>
3. Each /loop iteration calls `node H:/prism/scripts/slot-queue.mjs --pick --slot <nato> --json` for next unit
4. /loop terminates when --remaining returns 0
5. Then run /handoff + /precompact

If args present → treat args as the work order per [[feedback_checkin_args_are_primary_work_order]]; queue auto-mode skipped.
```

Wrapper edits NOT shipped this commit (per-slot wrappers are peer-contention surface; designed for next-iter SkillTier wire pattern from [[reference_skill_tier_wire_pattern]]).

---

## §6 — Operator commands once wrappers updated

```bash
# Start a slot working its queue autonomously:
/checkin-alpha          → reads alpha queue (7 units), /loops until 7 shipped
/checkin-bravo          → reads bravo queue (5 units), /loops until 5 shipped
/checkin-mike           → reads mike queue (3 units), /loops until 3 shipped

# Status across all slots:
node H:/prism/scripts/slot-queue.mjs --status
# → shows: total/shipped/in-flight/dep-blocked/eligible per slot

# Peek at a slot's queue without claiming:
node H:/prism/scripts/slot-queue.mjs --list --slot alpha

# What's blocked / waiting on a dep:
node H:/prism/scripts/slot-queue.mjs --list --slot alpha | grep DEP-BLOCK

# Pick next without starting a loop (manual mode):
node H:/prism/scripts/slot-queue.mjs --pick --slot alpha
```

---

## §7 — Termination + handoff

When a slot's queue exhausts:
- `slot-queue.mjs --remaining` returns 0 (exit code 1)
- /loop ends with reason="queue-complete"
- /handoff writes "all <N> units in <nato> queue SHIPPED; queue regen needed for next phase"
- Operator decides:
  - Regen queue from updated allocation (`scripts/regenerate-slot-queues.mjs` — pending; juliett task)
  - Re-assign slot to fleet-wide priority-queue (`/checkin-<nato>` falls back to priority-queue.mjs)
  - Manually inject new units into the slot's queue.json

---

## §8 — Cost downgrades / dependency notes

- Wave-4 wirings (`U-WIRE-*`) ALL depend on `U-WIRE-DOCTRINE-RESOLUTION` (operator decision). Until operator resolves: wave-4 will dep-block; slots foxtrot/hotel/india/kilo/lima/mike will sit at queue head waiting. Operator must either (a) decide doctrine, (b) bypass dep manually.
- `U-AUTO-MEMORY-WRITE` depends on `U-MEMORY-COMPRESS-V2` (mike). If mike sits idle, bravo's queue stalls at item 1.
- `U-RGS-NEXT-INTEGRATE` (lima) depends on `U-UNIT-SPEC-GENERATOR` (juliett). If juliett doesn't ship the generator, lima sits at item 2.
- Cross-slot deps named explicitly in `depends_on` array per entry.

---

## §9 — References

- V1 allocation: `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md`
- Synergy map: `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md`
- Token audit: `state/shared/specs/JULIETT-TOKEN-OPTIMIZATION-AUDIT-2026-05-17.md`
- Per-slot wrapper pattern: CLAUDE.md §PER-SLOT WRAPPERS (39 wrappers)
- /checkin canonical: `.claude/commands/checkin.md`
- priority-queue (fleet-wide): CLAUDE.md §PRIORITY-QUEUE-MS0
- Operator-args-as-work-order: [[feedback_checkin_args_are_primary_work_order]]
