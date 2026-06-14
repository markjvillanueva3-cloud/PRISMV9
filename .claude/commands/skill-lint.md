---
name: skill-lint
description: Run the static skill-quality linter over PRISM's skill library — flags lazy hand-wave language, bodies past the 500-line cap, descriptions with too few trigger phrases, leftover unfinished-skill markers, and over-long descriptions. Use when asked to "lint my skills", "check skill quality", "find vague language in a skill", "audit the skill library", "which skills are over 500 lines", or "show the skill-lint report".
composes_with:
  - "/wiki-lint"
---
# /skill-lint — static skill-quality linter (U-SKU03)

A fast, no-LLM check over every skill file (`~/.claude/commands/*.md`, project
`.claude/commands/*.md`, `**/SKILL.md`, plugin caches). It encodes
@eng_khairallah1's Phase-2 doctrine — *instructions must be specific and
testable; keep the file under 500 lines* — as deterministic rules, so the cheap
quality regressions get caught before a human (or U-SKU05's audit) has to.

It reads/feeds the same primitives the U-SKU06 registry uses
(`SkillQualityRegistryBuilder` / `skillQualitySchema`), so a skill's lint verdict
and its `SKILL_QUALITY_REGISTRY.json` row never disagree.

## Run it

```bash
node scripts/skill-lint.mjs                 # full sweep over every skill root → state/shared/skill-lint-report.json
node scripts/skill-lint.mjs --project-only  # skip ~/.claude (user/plugin) roots — fast, deterministic
node scripts/skill-lint.mjs --from-registry # lint the already-built SKILL_QUALITY_REGISTRY.json (faster; warns if stale)
node scripts/skill-lint.mjs --roots <dir>   # lint just the *.md files in <dir>
node scripts/skill-lint.mjs --self-test     # run the rule fixtures; exit 0 iff all behave as specified
node scripts/skill-lint.mjs --fix [--apply] # dry-run fix suggestions; --apply performs the safe over-length split
node scripts/skill-lint.mjs --json          # machine-readable summary on stdout
```

Exit code = number of flagged skills (BROKEN / MAJOR / MINOR — advisory-only
skills don't bump it), capped at 250; 0 when clean. `--self-test` exits 0/1.

## What it flags

| Rule | Severity | Trips when… |
|------|----------|-------------|
| R1 | MAJOR | the body uses a banned hand-wave phrase outside fenced code / quoted spans (`format nicely`, `handle … appropriately`, `as needed`, `properly handle`, `deal with it`, `make it nice`, `clean it up`, `etc.`, `and so on`, `various`) |
| R2 | MAJOR | more than 500 *instruction* lines (fenced-code lines are excluded, so a big embedded example doesn't push a small skill over) |
| R3 | MAJOR | the description yields fewer than 3 distinct trigger phrases — **exempt** when `disable-model-invocation: true` (the description isn't loaded for those) |
| R4 | MAJOR | the body contains an unfinished-skill marker outside fenced code — the `PLACEHOLDER_PATTERNS` set in `skillQualitySchema.ts` |
| R5 | MINOR | the frontmatter `description` is over 1024 characters |
| R2a | advisory | a >500-line file is dominated by one fenced example block (instruction portion is fine) |
| R6 | advisory | the body shows a no-op test assertion — a bare `.toBeDefined` / `.toBeTruthy` call, or a tautological `expect(x).toBe(x)` — i.e. a skill propagating the kind of non-assertion PRISM-R9 rejects |
| R7 | advisory | the body never shows "what perfect output looks like" (a fenced block / table near *example* / *output* / *perfect* / *returns* / *result*) |
| BROKEN | — | the frontmatter `---` block was opened but never closed (or otherwise unparseable) |

It does **not** re-check the legacy structural template (`## PURPOSE` /
`## WHEN TO USE` / …) — that's `scripts/skill_validator.py`'s job, a distinct
concern.

## Output

`state/shared/skill-lint-report.json` (flagged + advisory entries only, sorted by
severity, with a summary header) plus a one-line console summary:

```
[skill-lint] scanned 501 skill(s) · 441 flagged (0 BROKEN · 441 MAJOR · 0 MINOR) · 20 advisory-only
             by rule: R1=23 R2=1 R2a=6 R3=425 R4=42 R6=4 R7=206
             by tier (flagged): user=398 plugin=41 project=2
             → H:\prism\state\shared\skill-lint-report.json
             worst 10:
               [MAJOR] action-search (user) — R3,R4
               …
```

Report shape: `{ schemaVersion, generatedAt, mode, scanned, flagged, advisoryOnly,
parseFailures, bySeverity, byRule, byTier, ruleLegend, skills: [...] }` — each
`skills[]` entry has `{ name, path, tier, severity, rules, findings }` so a
high-`flagged`-count run is the *signal* for U-SKU05's audit (it prioritises the
high-invocation-count skills first), not a failure.

## Notes

- A high flagged count (most of the library trips R3 today) is expected — the
  doctrine bar is strict. Don't "fix" by weakening the rules; fix by improving
  the skills (richer descriptions, split over-length bodies, replace hand-wave
  language with concrete steps).
- `--fix --apply` only performs the one mechanical transform — splitting the
  largest section of an over-length skill into a sibling `<name>-<section>.md` —
  and refuses on a dirty working tree, writing a `.lint-bak` first. Everything
  else (`--fix` alone) is a dry-run that prints suggestions.
- Pairs with: `/skill-modernize` (when it lands — bulk refactor), `/wiki-lint`
  (the wiki analogue), and the U-SKU01 three-question pre-build gate (which stops
  bad *new* skills before they're written).
