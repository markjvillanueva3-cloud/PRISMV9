---
title: Lathe Program Lint — turning physics/safety linter (slot:whiskey)
type: architecture
status: active
tags: [lathe, lint, gcode, safety, whiskey, physics, mcp-independent]
created: 2026-05-29
by: claude-57dfea65 (slot:whiskey)
---

# Lathe Program Lint — deterministic turning-program physics/safety linter

slot:whiskey's **MCP-independent** linter that turns the 8 validated lathe gotchas (`lathe/CLAUDE.md` §5) into executable PASS/FAIL checks. Runs in milliseconds offline — the cheap pre-flight before the heavier MCP `lathe_validate_program` round-trip (which fails when port 3100 is down). Generated 2026-05-29 per the /goal "generate skills, scripts and hooks for your domain for better efficiency, higher quality output."

## Artifacts
- **Lib (brain):** `scripts/lib/lathe-gcode-lint.mjs` — pure, 28 node:test. Exports `lintLatheGcode(text, ctx)`, `lintLathePlan(plan)`, `formatFindings`, `maxSeverity`, `LD_LIMIT`, `SEVERITY_RANK`.
- **CLI:** `scripts/lathe-program-lint.mjs` — files / stdin / `--plan`, with `--json` / `--strict` / `--quiet` / `--controller`. Exit `0` clean · `1` ERROR (or any finding w/ `--strict`) · `2` bad invocation.
- **Skill:** `/lathe-lint` (`.claude/commands/lathe-lint.md`).
- **Hook:** `lathe-gcode-lint-guard.mjs` (PostToolUse, advisory, fail-soft) — auto-lints lathe `.nc` writes. Wired in BOTH settings.json, matcher `Edit|Write|MultiEdit`. Disable `PRISM_LATHE_LINT_GUARD_DISABLE=1`.

## Rules (the 8 gotchas)
| # | rule | sev | mode |
|---|------|-----|------|
| 1 | `css-no-rpm-cap` — G96 CSS without a `G50 S` clamp | ERROR | gcode |
| 8 | `feed-mode-ipm`/`-mixed`/`-undeclared` — IPR vs IPM | WARN/INFO | gcode |
| 4 | `thread-*` — single-point / G92 (delegated to G76 validator) | WARN | gcode |
| 5 | `partoff-no-peck` — plunge to center (X≈0) w/o G75 | INFO | gcode |
| 7 | `caxis-no-polar` — C+Y contour w/o G12.1/G13.1 | WARN | gcode |
| 2 | `boring-bar-ld` — L/D > 4 steel / 6 carbide | ERROR | plan |
| 3 | `nose-radius-ra` — Ra = f²/(32·rε) over target | WARN | plan |

(Gotcha #6 sub-spindle phase needs M-transfer semantics not derivable from raw text — deferred to a future plan-mode field.)

## Design — R8 reuse, not re-implement
Orchestrates existing pure helpers rather than re-deriving: `parseBlocks` + `extractProgramParameters` (`scripts/lathe-quality-pipeline.mjs`) for G-code tokenizing + param extraction, and delegates threading (gotcha #4) to `scripts/lib/lathe-g76-thread-validator.mjs`. Adds the 5 uncovered gotchas + plan-mode physics. Per-line comment-strip (`()` Fanuc + `[]` Okuma) so a code inside a comment never false-triggers — incl. the reused helpers (which regex raw text).

## Boundary — distinct from echo's dialect linter
`post-nc-dialect-lint.mjs` (slot:echo) lints controller **DIALECT SYNTAX** + safety-ordering ("is this valid Okuma/Fanuc code?"). This lints turning **PHYSICS/SAFETY** ("is this program physically safe?"). Zero rule overlap (grep-verified: echo's tool has no G50/G96/G71/G75/boring/parting/IPR). They **compose** — a lathe program should pass both.

## Bugs the gate caught (R9/R12)
Per-file scrutiny + the 28 tests caught two real bugs pre-ship: (a) `parseBlocks` does not capture `Y`/`C` addresses (lathe-centric `BLOCK_ARG_RE` = `[XZPQFR]`) → the C-axis rule now detects Y/C from `block.text`; (b) `extractProgramParameters` regexes raw text → it is fed comment-stripped text so a commented-out `G96`/`G50` can't false-trigger.

## Pre-merge note
Ships on `slot/whiskey`; reaches the shared tree (`H:/prism/scripts/`) + the hook activates on integration. Pre-merge, run from `H:/prism-slot-whiskey`.

## Related
- [[lathe-galaxy]] · [[lathe-safety-gates]] · [[lathe-okuma-dialect]]
- [[reference_whiskey_lathe_lint_tooling_2026_05_29]] · [[feedback_whiskey_g50_css_cap_mandatory]] · [[feedback_whiskey_boring_bar_ld_ratio]]
