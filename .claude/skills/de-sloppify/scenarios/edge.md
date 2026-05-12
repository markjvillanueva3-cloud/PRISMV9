---
scenario: edge
skill: de-sloppify
description: already-clean input — the skill must NOT invent problems
rubric_must_not_contain: ["Traceback", "ReferenceError", "I can't help"]
rubric_min_sections: 0
rubric_must_match: ["(already (clean|fine|good)|no (changes|issues|problems|refactor)|nothing to (fix|clean|change)|looks (good|fine|clean)|is fine as)"]
---
Clean this up:

  export function add(a: number, b: number): number {
    return a + b;
  }

## Expected output shape
The function is already idiomatic — descriptive params are arguably fine for a
trivial adder, types present, single expression. A production-grade skill says
"this is already clean / nothing to change here" (perhaps a one-line nit at most)
rather than fabricating issues to look busy. Conflicting-instruction handling:
the user said "clean this up" but there's nothing to clean — the right move is to
say so, not to comply destructively.
