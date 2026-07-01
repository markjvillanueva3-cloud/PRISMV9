---
name: feedback-yolo-mode-stop-hook-unsatisfiable-loop
description: The session-scoped Stop hook installed by `/goal /yolo-mode` enters an unsatisfiable loop in any session that ALSO references [[feedback_yolo_mode_nonterminal_goal_pattern]] doctrine. The hook reads the doctrine's own "non-terminal by design" language as evidence the goal isn't satisfied. Resolution: either (a) the gate auto-pass escape hatch should engage, OR (b) /yolo-mode should NOT install a session-scoped completion-check hook since the doctrine guarantees non-termination.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.456Z
aliases: feedback_yolo_mode_stop_hook_unsatisfiable_loop
---


# /yolo-mode Stop hook ↔ non-terminal-doctrine unsatisfiable loop

## The rule

If the assistant invokes `/goal /yolo-mode` AND the session is governed by `[[feedback_yolo_mode_nonterminal_goal_pattern]]` (which states "/yolo-mode is non-terminal by architectural design"), the resulting session-scoped Stop hook enters an unsatisfiable loop:

1. Hook checks: "Is /yolo-mode satisfied?"
2. Assistant outputs work + references the non-terminal doctrine
3. Hook reads the doctrine reference as proof the condition is unsatisfied
4. Block. Assistant ships another unit + the loop repeats

**Why:** The Karpathy R6 (token budgets not advisory) and Stop-block-discipline pattern says each Stop block should ship one concrete unit then end. The cron then fires the next iter. That's how the doctrine operationalizes the non-terminal semantic. But the goal-condition Stop hook expects the assistant's text to articulate a completion state — which the doctrine itself prohibits.

## How to apply

When detecting this pattern (assistant has shipped 5+ iters in a single Stop block and the goal-condition Stop hook keeps blocking with identical reasoning):

1. **Detection**: 5+ consecutive identical Stop-block feedbacks citing "no terminal event articulated" + assistant has already shipped substantive units.
2. **R6 trigger**: token budget approaching session ceiling.
3. **R12 trigger**: surface the structural constraint explicitly (this memo IS that surface).
4. **Action**: ship one final tiny unit (documentation only) + stop. The cron will fire the next iter into the next session per the doctrine.

## Why not just /goal clear?

CLAUDE.md says: "DO NOT tell the user to run `/goal clear` after success." The /yolo-mode pattern is operator-installed and operator-only-removable. The session-scoped Stop hook is collateral damage from the /goal mechanism not knowing /yolo-mode is special.

## Resolution options (future work)

### Option A — auto-pass escape hatch for /yolo-mode goal condition

Modify the goal-complete-gate Stop hook (`H:/prism/.claude/hooks/goal-complete-gate.mjs`) to detect `condition === "/yolo-mode"` and engage the same "auto-pass after 3 block attempts" escape hatch the scrutiny gate uses. This preserves the gate for normal /goal conditions but exempts /yolo-mode specifically.

### Option B — /yolo-mode skips Stop hook installation

Modify the /goal command implementation to detect `/yolo-mode` as the goal text and NOT install a session-scoped Stop hook in that case (since the doctrine guarantees the goal cannot be textually satisfied).

### Option C — operator awareness

Operators using `/goal /yolo-mode` should know the session will produce 5-15+ iters per Stop block before the assistant gives up trying to satisfy an unsatisfiable hook and gracefully ends. This is the current behavior; if acceptable, no change is needed.

## Empirical evidence (iter271 trigger)

In the iter250-271 Stop block:
- 21 substantive iterations shipped
- Cron `8505e156` re-established + 4 customer scans + R12 retraction + production-code fix + 2 regression tests + wiki lesson + 4 slot-worktree commits
- Stop hook blocked 11+ times with identical reasoning
- Each block citation included the assistant's OWN characterization of /yolo-mode as non-terminal as proof of non-completion

The work was genuinely substantive (closed the iter218 question with byte-level evidence + production fix). But each Stop attempt added more output that the hook cited back as further evidence of non-completion. This is the loop.

## Related

- `[[feedback_yolo_mode_nonterminal_goal_pattern]]` — the doctrine the hook conflicts with
- `[[reference_whiskey_iter250_cron_re_establishment_2026_05_27]]` — iter250-268 work trace
- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` — the R12 retraction shipped during the loop
- `H:/prism/.claude/hooks/goal-complete-gate.mjs` — where Option A fix lands
- `H:/prism/CLAUDE.md` §GOAL-COMPLETE GATE — current doctrine
