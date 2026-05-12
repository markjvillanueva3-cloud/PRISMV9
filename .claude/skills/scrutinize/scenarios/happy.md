---
scenario: happy
skill: scrutinize
skill_type: methodology
description: a normal milestone-review request — the skill must drive the 3-of-3 multi-CLI consensus process
rubric_must_match: ["(codex|gemini)", "(opus|claude)\b", "(verdict|PASS|FAIL|3.?of.?3|consensus|reviewer|scrutiny.?ledger)"]
rubric_must_not_contain: ["I can't help", "I'm unable to"]
rubric_min_sections: 0
---
Scrutinize my recent changes — I've got an uncommitted diff touching three engines and want it reviewed before I commit.

## Expected output shape
A methodology skill — graded on whether the *process* is followed, not on exact
prose. It should: identify the session diff to review, kick off the parallel
Codex + Gemini CLI reviews (`scrutiny-3way.mjs`), dispatch the Opus reviewer
agent, and gate completion on a 3-of-3 PASS recorded in the scrutiny ledger.
References to "codex", "gemini", "opus/claude reviewer", and a "verdict"/"PASS·FAIL"
shape are the markers that the process was actually run.
