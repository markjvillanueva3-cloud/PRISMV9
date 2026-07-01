---
name: reference-delta-cad-step-lint-2026-05-29
description: "delta generated a CAD STEP failure-mode linter triple (script+hook+skill): scripts/lib/cad-step-lint.mjs (pure lintStep, 9/9 tests), .claude/hooks/cad-step-lint-guard.mjs (PostToolUse auto-lint .step writes, wired C:+H:), /cad-step-lint skill. Operationalizes the 5 documented STEP failure-modes into an auto quality gate. Two R12 findings: (1) real-data E2E caught a LIVE unit gap — regen-topology.step lacks CONVERSION_BASED_UNIT; (2) a too-loose matcher regex /(…|\\*)/ wired the PostToolUse hook to mcp__prism__prism_.* (matched the .* substring) instead of Write/Edit."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.542Z
aliases: reference_delta_cad_step_lint_2026_05_29
---


# delta CAD STEP-linter triple (2026-05-29, commits a940393f + 26a18da3)

Operator directive: *"generate skills, scripts and hooks for your domain for better efficiency, higher quality output."* Built a STEP failure-mode linter that turns delta's hard-won tribal knowledge (galaxy CLAUDE.md §6) into an automated quality gate.

## The triple
- **script** `scripts/lib/cad-step-lint.mjs` — pure `lintStep(text, {expectUnit, ast})` reusing `parseStepFile` (R8 compose, not reimplement). Checks: E1 dangling-ref · E2 parse-fail · W1 mm-not-inch (no CONVERSION_BASED_UNIT) · W2 degenerate-brep (0 MANIFOLD_SOLID_BREP/CLOSED_SHELL/ADVANCED_FACE) · W3 periodic-B-spline present. `opts.ast` injection makes the logic unit-testable without parser coupling. 9/9 `node:test`. CLI exit 0/1/2.
- **hook** `.claude/hooks/cad-step-lint-guard.mjs` — PostToolUse, auto-lints `.step` writes, advisory (never blocks), fail-safe, cross-tree script resolver (worktree→main candidates). Wired C:+H: into the `Edit|Write|MultiEdit` matcher. Knob `PRISM_CAD_STEP_LINT_GUARD_DISABLE=1`.
- **skill** `/cad-step-lint` (`.claude/commands/cad-step-lint.md`) — manual entry point.

## R12 findings this build
1. **Live corpus gap (W1):** real-data E2E on `state/shared/cad-regen-output/01-db-h46-002-side-1-v2/*.regen-topology.step` (1271 entities) reported W1 — the regen output carries **no CONVERSION_BASED_UNIT**, i.e. it isn't emitting inch units (failure-mode #2). The regen pipeline (CADMultiSystemAIProducerEngine path) should bake the inch unit; worth a follow-up fix.
2. **Matcher-substring wiring bug (caught in-flight):** the settings-splice used `/(Write|Edit|MultiEdit|\*)/.test(matcher)` to find a PostToolUse group — but that matched the `.*` inside `"mcp__prism__prism_.*"`, wiring the hook to the prism-MCP matcher (fires on MCP calls, no-ops on .step, never fires on actual writes). **Lesson: match a PostToolUse hook to a group by SPLITTING the matcher on `|` and checking TOKEN equality against the write-tool set — never a substring/regex that an unrelated `.*` can satisfy.** Re-wired to `matcher.split('|').map(trim).some(t => WRITE_TOOLS.has(t))`. settings.json is user-global (never committed), so the mis-wire never shipped.

## Why this matters
The 5 STEP failure-modes were tribal knowledge (silent Fusion blank-doc, etc.) surfaced only on a human noticing a bad result downstream. The linter + auto-hook turns them into a write-time gate — R12 fail-loud at the point of emission. Complements `cad-analyze-step.mjs` (inspector) which reports geometry but doesn't validate failure modes.

See galaxy `MEMORY.md` §Generated CAD-domain tooling · wiki `[[cad-step-toolchain]]` · [[reference_delta_bspline_periodic_regression]] · [[reference_delta_step_inch_unit_convention]].
