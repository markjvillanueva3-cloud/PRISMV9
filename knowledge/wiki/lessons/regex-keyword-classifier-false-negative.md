---
title: Regex keyword classifier -- `.+Keyword.+` silently excludes the keyword-at-start case
type: lesson
domain: hooks
slot: bravo
created: 2026-06-10
severity: safety-relevant
instance_commit: 9065eadd26
related:
  - "[[reference_consensus_critical_edit_wired_2026_06_10]]"
  - "[[octopus-consensus-hardening-2026-06-10]]"
---

# `.+Keyword.+` silently excludes the keyword-at-START case

## The bug pattern (generalizable, fleet-wide)
A classifier that flags files/strings by a keyword often gets written as:

```js
/\/engines\/.+Safety.+\.ts$/i      // INTENDED: "any engine file with Safety in the name"
```

The `.+` on **both** sides requires at least one character **before** the keyword. So a
name where the keyword is at the **start** does NOT match:

- `SafetyEngine.ts`      -> after `/engines/` the name starts with "Safety" -> NO leading char -> MISS
- `ThermalEngine.ts`, `DeflectionEngine.ts`, `ValidatorEngine.ts` -> same MISS

In PRISM, `<Keyword>Engine.ts` is the **dominant** engine naming -- so `.+Keyword.+`
silently excludes exactly the files it most needs to catch. When the classifier gates a
SAFETY behavior (here: which critical edits get consensus scrutiny in
`auto-consensus-critical-edit.mjs`), this is a safety **false-negative** -- the most
obvious safety files skip the gate.

## The fix
Use `.*Keyword.*` (zero-or-more on both sides) so the keyword matches at start, middle,
or end:

```js
/\/engines\/.*Safety.*\.ts$/i      // matches SafetyEngine.ts, MySafetyCheck.ts, EngineSafety.ts
```

## Recall over precision when a false-positive is cheap
For a SAFETY classifier, deliberately favor recall: a false-POSITIVE here only adds extra
scrutiny (e.g. "Enforce" matching "force" -> a benign file gets a harmless consensus
enqueue), while a false-NEGATIVE means a real safety file skips the gate. When the cost
asymmetry is "false-positive = harmless extra work, false-negative = dangerous miss,"
widen the pattern. Keyword-at-start anchors (`Tolerance.*`, `Kienzle.*`) are fine when the
intent is genuinely "starts-with."

## How it was caught (R9 -- tests verify intent)
A unit test asserting `isCriticalFile("...SafetyValidationEngine.ts") === true` FAILED
(returned false), exposing the `.+` bug before the hook was wired fleet-wide. A test that
encodes the intent ("a safety engine MUST be classified critical") catches a classifier
that merely "looks right." Regression-locked with keyword-at-start cases
(`SafetyEngine.ts`, `ThermalEngine.ts`, `DeflectionEngine.ts`, `ValidatorEngine.ts`).

## Audit hook for the fleet
Any classifier in the repo of the form `/.+<Word>.+/` over file/symbol names is suspect.
Grep candidates:

```
grep -rnE '\.\+[A-Z][a-z]+\.\+' .claude/hooks scripts mcp-server/src
```

Review each: if the intent is "keyword anywhere," it should be `.*Word.*`; if "starts
with," it should be anchored `^...Word.*` with no leading `.+`.

## Lesson
`.+X.+` means "X with something on BOTH sides," NOT "contains X." For a contains-check use
`.*X.*`. In a safety classifier the difference is a silent false-negative on the dominant
naming convention -- prefer recall, and pin the intent with a keyword-at-start test.
