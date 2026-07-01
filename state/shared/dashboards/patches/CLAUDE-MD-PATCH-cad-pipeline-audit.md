# CLAUDE.md patch sibling — CAD-PIPELINE-AUDIT regression line

> Patch-sibling for `H:/prism/CLAUDE.md` per the §PATCH-SIBLING convention
> (CLAUDE.md is peer-locked on this shared tree; this file is the durable
> place for the regression line until the owner-chat merges it).
>
> Author: claude-3db3fb3d (slot=echo), 2026-05-20.
> Audit context: `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md`
> Reviewer agent: ae9df739c4735b122 (PASS after amendments).

## Proposed CLAUDE.md `## Recent regressions` append

```markdown
- 2026-05-20 | **audit verification commands used bash `command` builtin in a PowerShell-native project** | observed-in: state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md (pre-amendment) | fix: rewrite all `command grep`/`command find` invocations as plain `node ...` / Read / Glob primitives that work in both shells; tighten Phase-0 verification-channel rule to "prefer language-agnostic tools over shell builtins" | observed-by: claude-3db3fb3d slot echo /forge-audit-v2 peer reviewer ae9df739c4735b122 | verify: grep `^command ` in any audit doc under state/shared/specs/ → 0 hits
- 2026-05-20 | **audit META artifact lacked engine-count normalization, ranking over-credited high-file-count platforms** | observed-in: scripts/cad-pipeline-coverage-scorer.mjs (pre-amendment) | fix: add `normalizedTotalScore` (caps intersect at 5, shared at 4); add `stagesWithPlatformSpecificEvidence` to expose shared-engine credit tautology; rank by normalized | observed-by: same | verify: `node scripts/cad-pipeline-coverage-scorer.mjs --json | jq '.totals.cadquery.stagesWithPlatformSpecificEvidence'` → 1 (was hidden as 9 of 9 in legacy metric)
```

## Why patch-sibling instead of direct CLAUDE.md edit

- 11 foreign claims on the shared `H:/prism` main tree per the chat-bus snapshot at session start.
- CLAUDE.md is high-contention. The doctrine in CLAUDE.md §PATCH-SIBLING explicitly names this surface as one that should accept patch siblings under `state/shared/dashboards/patches/`.
- The next chat that holds the CLAUDE.md write claim should merge this file's content under `## Recent regressions` and delete this sibling.

## Merge instructions

1. Read `H:/prism/CLAUDE.md` `## Recent regressions` section (around line ~750 in current state).
2. Append the two regression lines above at the top of the section (newest-first ordering).
3. Delete this patch sibling (`H:/prism/state/shared/dashboards/patches/CLAUDE-MD-PATCH-cad-pipeline-audit.md`).
4. Commit with `[MAIN] [CAD-PIPELINE-AUDIT]/U-REGRESSION-BACK-FLOW: merge patch sibling`.

## See also

- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md` §10 (peer review verdicts)
- `H:/prism/CLAUDE.md` §SCRUTINY GATE (the gate that should have caught the bash-syntax issue but didn't — verification-channel review is a manual step)
