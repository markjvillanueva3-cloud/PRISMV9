---
name: Scrutiny gate behavior on read-only sessions
description: When the strict 3-of-3 scrutiny gate blocks a session that authored zero edits, prefer auto-escape; never fake-pass an arm
type: feedback
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
(Older short-form companion to [[feedback_scrutiny_3of3_readonly]] — see that entry for the full current picture.)

The strict 3-of-3 scrutiny gate reviews the **uncommitted diff in the working tree**, not just edits authored by the current chat. With ~6 concurrent chats, a read-only session can hit FAIL on 100KB+ of work belonging to peer chats. The arm lineup changed 2026-05-12: it is now **Codex CLI + two independent Claude reviewer agents** (arm A holistic / arm B test-integrity-weighted) — the Gemini CLI arm was retired (daily-quota / trust-dir env failures kept stalling the gate); it is NOT "codex + gemini + opus" anymore.

**Why:** policy adopted 2026-05-05 deliberately uses multi-reviewer consensus to catch single-reviewer drift. The auto-escape (gate auto-passes with a warning after 3 block attempts) is the documented release valve for exactly this false-positive class.

**How to apply:**
- If the session authored ZERO edits, prefer the auto-escape: hit Stop 3 times, gate clears with a warning. This is the intended behavior — not abuse.
- If you want to clear cleanly without auto-escape, run `node .claude/scripts/scrutiny-3way.mjs --target HEAD --session-id <id>` first — scopes review to the last commit only, often <80KB and not truncated. (The git-diff timeout was bumped 8s→120s and noise dirs are excluded in `[INFRA-SCRUTINY-FIX]`, so even the no-`--target` working-tree diff is more reviewable than it used to be.)
- Record verdicts with `scrutiny-3way.mjs --mark-opus pass` (arm A) + `--mark-claude pass` (arm B; `--mark-opus-b` / `--mark-gemini` are accepted aliases). The Codex arm auto-records on the script run.
- Codex's recurring nit on `toBeGreaterThan / toBeLessThan / typeof` (criterion #2 strict-assertion reading) is contestable; bounded numeric assertions on engine-internal counters ARE concrete and not the `toBeDefined()` blanket-stub anti-pattern. The reference reading: range/typeof checks count as concrete for non-deterministic numerics. Don't burn cycles re-running with the same prompt.
- Never mark any arm PASS dishonestly to clear the gate — record the actual verdict every time, even if all three fail for environmental reasons (truncated diff, an arm env-failing / empty-stdout crash).
- If diff > 80KB, the arms default to `BLOCKER: diff-truncated` per their prompt template — recognize this is environmental, not a code-quality finding.
