---
name: reference-slot-worktree-activation-2026-05-16
description: "SLOT-WORKTREE-MS0 (per-NATO-slot commit branches + worktrees + golf integrator) shipped complete 2026-05-15 but the fleet never migrated onto it. 2026-05-16: fixed juliett/lima drift, made bootstrap+integrator import SLOT_NAMES, added /checkin Step 2c per-chat cutover. Commits b8dfbf208 + 912f10fff."
source: prism-memory
synced: 2026-05-18T01:02:09.926Z
aliases: reference_slot_worktree_activation_2026_05_16
---


# Slot-worktree fleet activation (2026-05-16, slot alpha claude-339c8ff7)

**The big finding.** User asked: "make each chat commit to its own NATO-named branch with a branch-organizer." Investigation found **the entire system already existed** — `SLOT-WORKTREE-MS0`, shipped `complete` 2026-05-15: `slot/<name>` branches, per-slot worktrees `H:/prism-slot-<name>`, `scripts/slot-integrator.mjs` (the branch-organizer; **golf = integrator**), `scripts/slot-worktree-bootstrap.mjs`, and 3 enforcement hooks (`worktree-commit-route`, `git-add-lane-guard`, `main-tree-write-block`) default-on. It was just never *activated* — `chat-slots.json` showed every chat still on the shared `cad-fusion-live-ms0`.

**Doctrine reinforced.** When a user asks for a feature, check if it exists FIRST (git / system-viz / `duplicationGuard`). The honest move is to surface "this is built — here's the gap" via AskUserQuestion, not build a parallel system. User then chose **Activate & migrate** + **audit, wrap only real gaps**. Same lesson as [[reference_wire_unwired_ms0_u_wire01_2026_05_16]] "re-scope on duplication."

**Shipped — commits `b8dfbf208` (`[MAIN] [SLOT-WORKTREE-MS0]/U-CUTOVER`, 5 files) + `912f10fff` (FIX1):**
- **2 drift gaps fixed.** The 2026-05-15 bootstrap hardcoded `juliet` (1 t — `chat-slots.mjs SLOT_NAMES` has `juliett`) and omitted `lima` (added to SLOT_NAMES after the bootstrap). Retired the unused `slot/juliet` (0 unique commits, verified), bootstrapped `slot/juliett` + `slot/lima` → **12 slot worktrees**. Root cause = two hand-copied slot lists; fix = `slot-worktree-bootstrap.mjs` + `slot-integrator.mjs` now `import { SLOT_NAMES } from chat-slots.mjs` (single source of truth — `chat-slots.mjs` is import-safe, its CLI is guarded by an `import.meta.url` check). Drift class ended.
- **`/checkin` Step 2c — the cutover.** A work-slot chat in the main tree is migrated onto its slot worktree on check-in: source-file dirty-check (FIX1: `.ts|.mjs|.tsx` only — the shared tree is perpetually dirty with state JSON + digest `.md` churn, so a `.json|.md` grep would stall the cutover forever) → `slot-integrator --sync-down` → `chat-slots heartbeat --branch slot/<name>` → §Report MIGRATE directive. golf exempt (integrator, stays in main tree). Kill switch `PRISM_SLOT_WORKTREE_CUTOVER_DISABLE=1`. Migration is per-chat + gradual — each chat moves on its next clean `/checkin`.
- **Pipeline lane-safety audit (Q2 "wrap only real gaps"):** all pipeline/data-file commands already chat/session-keyed (`HANDOFF-<chat>-<topic>.md`, `loop-<session>.json`) or atomically written (BUILD_STATE, MILESTONE_PROGRESS) or locked (SCRUTINY_LEDGER) or advisory-regenerated (CLOSE-OUT-CANDIDATES). **Zero collision gaps → zero wrappers needed.** `/compact` + `/handoff` are built-ins anyway.

**Key facts for future work:**
- `main-tree-write-block` blocks Edit/Write into `h:/prism` only — editing `H:/prism-slot-<name>/...` is allowed (not *under* `h:/prism/`). A migrated chat works freely in its worktree.
- The 3 enforcement hooks are no-ops until a chat's `chat-slots.json[slot].branch` is `slot/*` — so they arm per-chat as each migrates (verified by smoke-test: 5/5 gate cases pass).
- Git hit `packfile cannot be mapped: File too large` on `git branch -d` (environmental — large repo); `-D` (refs-only) worked.

**Deferred (honest):** `CLAUDE.md` §"conflict-fork rule" (lines ~96-105) still tells chats `git worktree add ../prism-<scope>` — superseded by the slot-worktree model, but CLAUDE.md was peer-claimed (`claude-02436db5`) at edit time. Follow-up: rewrite that section to the slot-worktree model. Sister: [[reference_checkin_autonomous_loop_2026_05_16]], [[reference_slot_worktree_ms0_p3_cutover_complete]].


## Related
[[skills/prism-slot-|/prism-slot-]] • [[skills/slot-integrator|/slot-integrator]] • [[skills/slot-worktree-bootstrap|/slot-worktree-bootstrap]] • [[skills/juliet|/juliet]] • [[skills/juliett|/juliett]] • [[skills/lima|/lima]] • [[skills/checkin|/checkin]] • [[skills/data-file|/data-file]] • [[skills/session-keyed|/session-keyed]] • [[skills/compact|/compact]]