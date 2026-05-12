---
scenario: edge
skill: scrutinize
skill_type: methodology
description: nothing to review — clean tree, no session diff; the skill must say so, not fabricate a review
rubric_must_match: ["(nothing to (scrutiniz|review)|no (uncommitted|staged)? ?(changes|diff|session diff)|clean (working )?tree|already (clear|passed|cleared)|ledger (is )?(already )?(clean|clear)|no diff to)"]
rubric_must_not_contain: ["Traceback", "ReferenceError"]
rubric_min_sections: 0
---
Scrutinize the changes.  (Context: the working tree is clean — `git status` shows nothing, no staged files, the scrutiny ledger already has a PASS for this session.)

## Expected output shape
The honest move when there's nothing to review is to say so — "clean tree, no
session diff, ledger already cleared, nothing to scrutinize" — and stop. A
production-grade methodology skill does NOT invent a fake review or run the
3-CLI machinery against an empty diff just to produce output. Edge-case handling:
the instruction ("scrutinize the changes") presupposes changes that don't exist.
