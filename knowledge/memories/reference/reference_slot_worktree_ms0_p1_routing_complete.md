---
name: reference_slot_worktree_ms0_p1_routing_complete
description: "SLOT-WORKTREE-MS0/P1-ROUTING phase complete (3/3 units shipped 2026-05-15, all default-OFF) + the slots.slots schema-fix lesson + 4th commit collision context."
aliases: reference_slot_worktree_ms0_p1_routing_complete
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.955Z
---


## SLOT-WORKTREE-MS0/P1-ROUTING phase complete (2026-05-15)

Slot charlie (claude-2081f435), commits `e2340001a` + `b4118a7f0` + `10c5e40c3` + close-outs `a507125ca` / `5831df3c0` / `3d04557b1`.

3 routing hooks shipped, all env-opt-in DEFAULT OFF (transitional — flip via U-P3-DEFAULT-ON):

- `worktree-commit-route.mjs` — `git commit` worktree-mismatch gate
  · `PRISM_WORKTREE_ROUTE_ENABLE=1` arm · `PRISM_WORKTREE_ROUTE_DISABLE=1` kill
- `git-add-lane-guard.mjs` — bare `git add` slot-worktree-scope gate
  · `PRISM_GIT_ADD_LANE_ENABLE=1` · `PRISM_GIT_ADD_LANE_DISABLE=1` kill
- `main-tree-write-block.mjs` — Edit/Write/MultiEdit main-tree gate
  · `PRISM_MAINTREE_WRITE_BLOCK_ENABLE=1` · `PRISM_MAINTREE_WRITE_BLOCK_DISABLE=1` kill
  · golf (integrator slot) exempt by name

Wired via `bash-bundle.mjs` (first two) + `edit-bundle.mjs` SAFETY_HOOKS (third), all with `timeout: 2000`. Pre-cutover (today) every chat lives in `H:/prism` on `cad-fusion-live-ms0` → all three hooks fail-through to ALLOW even when armed; meaningful only POST-`U-P3-CUTOVER` when chats bind to `slot/<name>` branches.

## Two design lessons crystallized

### 1. Hook import-safety: activation gate INSIDE main(), NOT top-level

Original git-add-lane-guard had `if (!isHookArmed()) exit(0);` at module top level. Killed any test harness doing `await import("./hook.mjs")` — the importing process actually exits at module-load time. Symptom: smoke harness printed `"boot"` then silently died inside the `import()`. Fix moved the gate INSIDE `main()`; the module now has zero observable side effects at import. **Pattern adopted for all 3 routing hooks.** The smoke harness's `await import(...)` succeeding IS the import-safety regression assertion.

### 2. `slots.slots` is OBJECT-keyed, NOT an Array

Both initial hook drafts used `slots.slots.find(s => s.state.chatId === sessionId)` — pattern-matched from imagined schema. The REAL `state/shared/chat-slots.json` is shaped:

```json
{
  "schemaVersion": ...,
  "lastUpdated": "...",
  "slots": {
    "alpha":   { "chatId": "...", "branch": "...", ... },
    "bravo":   { "chatId": "...", "branch": "...", ... },
    "charlie": { ... },
    "echo":    null,         // idle
    "foxtrot": null,
    "golf":    null
  }
}
```

`slots.slots` is an **object keyed by slot name**, the chat state is the **direct value** (no nested `state` field), and idle slots are **literal null**. Calling `.find()` throws `TypeError: slots.slots.find is not a function`. Both hooks would have thrown the moment they were armed.

Latent bug — both hooks were default-OFF in production so it never fired. Caught during `main-tree-write-block` development by **spawning the new hook against the REAL chat-slots.json** (not the synthetic fixture). Back-fixed in the same commit. Correct pattern:

```js
function resolveSlotBinding({ sessionId, slots }) {
  if (!sessionId || !slots || !slots.slots) return null;
  const bag = slots.slots;
  if (typeof bag !== "object" || Array.isArray(bag)) return null; // fallback to null on legacy
  for (const [slotName, state] of Object.entries(bag)) {
    if (state && typeof state === "object" && state.chatId === sessionId) {
      return { slot: slotName, branch: state.branch || null };
    }
  }
  return null;
}
```

Agent B's grep confirmed only `heartbeat-keepalive.mjs` (uses `Object.entries`) and `golf-slot-write-allowlist.mjs` (uses `slots?.slots?.golf`) read this surface — both already schema-correct. No other latent twins. **Going forward: ANY hook reading chat-slots.json must use the object-keyed walk + the defense-in-depth `null` fallback for legacy array fixtures.**

## 4th shared-tree commit collision in 72h

`76ff1fe39` (peer ALPHA's `[FLEET-REAPER-MS1]/U-PHASE2-ALPHA-GUARDIAN`) absorbed my U-P2-AUDIT-REFRESH close-out (4 files: audit + envelope + roadmap-index). Same class as the 3 prior collisions: my `git add` from turn N sat staged; peer's `git commit` (no pathspec) at turn N+0.x swept it. Files correct + tracked + behavior correct, just attributed to the wrong commit subject. This IS the exact pain SLOT-WORKTREE-MS0 exists to eliminate by structure (P3-CUTOVER will give every chat its own worktree → no shared index → no possible cross-chat sweep).

Mitigation pattern that worked in this session for subsequent commits: **atomic `git add <paths> && git commit -- <paths>` in a single bash call** minimizes the window. Use `git commit -- <paths>` with explicit pathspecs even when files are already staged — that scopes the commit regardless of what else is in the index.

## Phase status

- P0-FOUNDATION: 6/6 ✓
- P1-ROUTING:    3/3 ✓  (THIS PHASE)
- P2-DRAIN:      2/4 — U-P2-AUDIT-REFRESH ✓ + U-VIZ-WORKTREE-MAP ✓; U-P2-DRAIN-BATCH-A/B operator-gated
- P3-CUTOVER:    0/2 — U-P3-BOOTSTRAP + U-P3-DEFAULT-ON, both operator-gated

11/15 units complete. The remaining 4 are operator-review-gated per the architecture doc ("zero safe-autonomous landings"). The loop terminates here without operator go.

Companions: [[reference_slot_worktree_ms0_phase0_rescue]] · [[feedback_conflict_fork_rule]] · [[reference_coord_ms0_u4_collision]] · [[reference_blueprint_ocr_training_ms1_collision]] · [[reference_training_learning_ms0_u1_collision]].
