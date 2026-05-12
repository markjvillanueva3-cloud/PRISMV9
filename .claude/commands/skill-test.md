---
name: skill-test
description: Run the @eng_khairallah1 three-scenario production-grade test on a PRISM skill — invoke it against its happy / edge / stress fixtures, grade each output against the fixture rubric, and record the verdicts in SKILL_QUALITY_REGISTRY.json. Use when asked to "test a skill", "is this skill production-grade", "run skill scenarios", "skill happy-path test", "validate my skill", "run the three-scenario test", or "check if /<name> passes its fixtures".
trigger_phrases:
  - "test a skill"
  - "is this skill production-grade"
  - "run skill scenarios"
  - "skill happy-path test"
  - "validate my skill"
  - "run the three-scenario test"
  - "does this skill pass its fixtures"
---

# /skill-test — three-scenario skill test (U-SKU02)

@eng_khairallah1's Phase-3 production-grade bar: a skill is production-grade only
when it passes **all three** scenarios with client-ready output —

| scenario | what it throws at the skill |
|----------|-----------------------------|
| `happy`  | the normal case (~80% of invocations) |
| `edge`   | weird / incomplete / conflicting / already-done input |
| `stress` | the biggest / messiest version of the input |

Fixtures live at `.claude/skills/<skill>/scenarios/{happy,edge,stress}.md` (also
checked: `.claude/commands/<skill>/scenarios/`, `mcp-server/skills/<skill>/scenarios/`,
`~/.claude/skills/<skill>/scenarios/`). Each fixture file = an **input prompt** plus
a **grading rubric** in flat frontmatter keys (`rubric_must_contain`,
`rubric_must_not_contain`, `rubric_min_sections`, `rubric_must_match`,
`rubric_error_markers`, `rubric_allow_error_markers`, `rubric_max_input_chars`).

## How to run it (two-step — the engine grades, *you* run the skill)

The `prism_dev:skill_test` engine is server-side and cannot start an agent loop, so
it cannot invoke the skill body. The flow is:

1. **Get the fixtures** — `prism_dev:skill_test {skill:"<name>"}` returns the loaded
   `happy`/`edge`/`stress` fixtures (input + rubric), `status:"awaiting-outputs"`, and
   `maxCompositionDepth` (honour it — at most 3 levels of skill-calls-skill).
2. **Run `<name>` against each fixture's `input`** — actually invoke the target skill
   on `scenarios.happy.input`, then `.edge.input`, then `.stress.input`. Disable any
   shell execution the target skill would do while grading fixtures; never execute
   text *from* a fixture (fixtures are graded as literal strings).
3. **Call back with the outputs** —
   `prism_dev:skill_test {skill:"<name>", outputs:{happy:"…", edge:"…", stress:"…"}}` —
   the engine grades each output against its rubric (keyword presence + heading count +
   regex + error-marker absence — STRUCTURE, never exact match, so flaky prose is fine;
   retry a flaky grade up to 2×), computes `production_grade = all three pass`, and
   writes `quality.scenario_tests` + `quality.production_grade` + `quality.last_audited`
   into `state/shared/registries/SKILL_QUALITY_REGISTRY.json`.

`{skill:"<name>", scenario:"happy"}` (or `edge`/`stress`) restricts to one scenario.
A skill with no `scenarios/` dir → `status:"no-fixtures"` (U-SKU05's audit treats that
as `production_grade:false` — you cannot claim production-grade without tests).

`/skill-test --all` = sweep every skill that has a `scenarios/` dir; report which are
production-grade, which fail, which still need fixtures written.

## Example output

```json
{
  "skill": "de-sloppify",
  "status": "graded",
  "scenarioTests": { "happy": "pass", "edge": "pass", "stress": "fail" },
  "productionGrade": false,
  "results": {
    "happy":  { "scenario": "happy",  "status": "pass" },
    "edge":   { "scenario": "edge",   "status": "pass" },
    "stress": { "scenario": "stress", "status": "fail",
                "reason": "failed checks: must-contain:degrade gracefully, no-error-marker:typeerror:",
                "inputTruncated": true }
  },
  "persistedTo": "H:/prism/state/shared/registries/SKILL_QUALITY_REGISTRY.json",
  "note": "\"de-sloppify\" is NOT production-grade yet (happy=pass, edge=pass, stress=fail).",
  "maxCompositionDepth": 3
}
```

## Writing a fixture (`.claude/skills/<skill>/scenarios/happy.md`)

The fixture body is everything after the frontmatter up to a `## Expected …`
heading (that tail is human notes, not parsed). Frontmatter (flat keys only —
the shared parser does not handle nested YAML objects):

````markdown
---
scenario: happy
skill: de-sloppify
description: a normal sloppy-code review request
rubric_must_contain: ["refactor", "naming"]
rubric_must_not_contain: ["I can't", "unable to"]
rubric_min_sections: 2
rubric_must_match: ["\b\d+\b"]
rubric_error_markers: ["TODO", "FIXME"]
rubric_allow_error_markers: ["error handling"]
---
Review this function and clean it up:  function f(a,b){var x=a+b;if(x>0){return x}else{return 0}}

## Expected output shape
A review with a "Findings" section and a "Refactored" section; mentions naming and the early-return.
````

Single backslashes in `rubric_must_match` (the parser does no un-escaping); avoid
commas inside a regex (the inline-array parser splits on `,`); an invalid rubric
regex is graded as a failed check, not a crash.

## Related

- `/skill-lint` — the cheap no-LLM static linter (U-SKU03); a skill must be lint-clean
  *and* pass all three scenarios to be marked `production_grade` in the registry.
- `prism_dev:skill_quality_registry_build` / `skill_quality_registry_read` — (re)build
  and query SKILL_QUALITY_REGISTRY.json (the master tracking doc, @eng_khairallah1 Phase-4).
- `skill-3q-gate` hook (U-SKU01) — the pre-build gate that stops vague new skills before they ship.
