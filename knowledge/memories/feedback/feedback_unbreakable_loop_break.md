---
name: feedback_unbreakable_loop_break
description: "Operator 2026-06-12: 'fix the issue of unbreakable loops, you guys do it like 9 times before you finally stop.' When a Stop hook / goal-keeper re-blocks the SAME unmet condition every turn, do NOT re-respond with a fresh essay each time -- that is the 9-block spiral. Recognize it after ~2 no-progress blocks and BREAK OUT: emit ONE terminal line (the blocker + the spec/file path + the operator action) and stop; do NOT re-derive, re-probe, or re-attempt the blocked work. Mechanism shipped: goal-complete-gate.mjs now escalates the block message at streak>=2 and AUTO-RELEASES (approves) at streak>=3 via .claude/helpers/loop-break-state.mjs, so the PRISM gate breaks in ~3 Stops not 9. The harness /goal prose-keeper is NOT PRISM-editable -- only this agent-behavior rule shortens that one."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.448Z
aliases: feedback_unbreakable_loop_break
---


# Unbreakable-loop break -- recognize early, break out, do not write 9 essays (2026-06-12)

**Operator:** "fix the issue of unbreakable loops, you guys do it like 9 times before you finally stop."

**The pathology (lived this session):** a Stop gate / goal-keeper re-judges the SAME unmet condition
every turn and re-blocks. The agent re-responds with a structurally-identical explanation each time
(slightly reworded), burning ~9 turns until the operator interrupts. Two distinct sources:
1. **The harness `/goal` keeper** -- LLM re-judges the prose condition each Stop ("[[ condition ]]:
   Part 2 not satisfied"). PURELY harness-internal: no PRISM file stores the condition, no agent-actionable
   `/goal clear`. Only the agent's OWN behavior can shorten this loop.
2. **PRISM Stop gates** (e.g. `goal-complete-gate.mjs`) -- deterministic blocks on a stale close-out audit.
   These ARE fixable: a streak counter + auto-release.

## Why: a no-progress re-block is not new information
Each re-block says the same thing; each re-essay says the same thing. Re-deriving the conflict,
re-probing, or re-attempting the blocked work (esp. one that is architecturally/externally blocked --
needs another slot, an operator action, a merge) produces ZERO progress and burns tokens. The 2nd
identical block is the signal; the 9th is pure waste.

## How to apply (AGENT BEHAVIOR -- the rule)
When a Stop hook re-fires on the SAME condition and you made NO new progress toward it:
- **After ~2 no-progress blocks**, STOP re-explaining. Emit ONE terminal line: the blocker + the
  spec/file path with the full solution + the exact operator action to unblock. Write the handoff. Stop.
- **Do NOT** re-derive, re-probe, re-merge, or re-post an already-delivered artifact. Do NOT soften a
  safety gate or bypass it to force the blocked action.
- If a `\u{1F501} UNBREAKABLE-LOOP` directive appears in a Stop systemMessage (the loop-break gate fired):
  obey it immediately -- one terminal line, then stop. The gate auto-releases at the hard cap; do not fight it.
- A correct "this is blocked, here is the owner + the solved recipe + the operator action" stated ONCE
  is worth more than nine reworded versions of it.

## Mechanism shipped (LOOP-BREAK-MS0, slot:sierra)
- `.claude/helpers/loop-break-state.mjs` -- consecutive-no-satisfy-block streak tracker (the gate's own
  block=stuck / approve=progress is the signal; an approve resets). escalate at THRESHOLD (2),
  auto-release at HARD_CAP (3). Pure + fail-soft + 8/8 hermetic tests. Knobs PRISM_LOOP_BREAK_{DISABLE,THRESHOLD,HARD_CAP}.
- `.claude/hooks/goal-complete-gate.mjs` -- wired: blocks route through `gatedBlock` (escalate/release),
  approves through `gatedApprove` (reset). ALSO fixed F9: `const fs = require("node:fs")` in this ESM
  module threw ReferenceError, silently killing the loop-target-met accept path -- now uses the module
  `fs` import. Fail-soft lazy-load: a missing/throwing helper falls back to the original pure-block gate.
- LIMITATION (honest): this breaks the PRISM-gate spiral. The harness /goal-keeper spiral is only
  shortened by THIS behavioral rule -- there is no PRISM hook that can un-block the harness keeper.

Pairs with [[feedback_goal_needs_loss_function]] (bound the goal at SET time) +
[[feedback_yolo_mode_nonterminal_goal_pattern]] + [[reference_b2_system_blocked_and_stash_nearmiss_2026_06_12]]
(the B2 loop that triggered this -- 9 blocks demanding a merge the slot is architecturally forbidden from).
