---
name: reference-whiskey-lathe-lint-tooling-2026-05-29
description: slot:whiskey shipped a deterministic MCP-independent lathe-program physics/safety linter (lib+CLI+skill+hook) encoding the 8 gotchas as PASS/FAIL. Reuse-heavy (parseBlocks/extractProgramParameters + G76 validator).
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.260Z
aliases: reference_whiskey_lathe_lint_tooling_2026_05_29
---


slot:whiskey generated domain tooling per the /goal "generate skills, scripts and hooks for your domain for better efficiency, higher quality output, overall system enhancements": a deterministic, **MCP-independent** turning-program PHYSICS/SAFETY linter. Built on `slot/whiskey` (commits under PER-SLOT-GALAXY-BUILDOUT).

**Artifacts**
- Lib: `scripts/lib/lathe-gcode-lint.mjs` (pure, 28 node:test) — `lintLatheGcode(text,ctx)` + `lintLathePlan(plan)` + `formatFindings`/`maxSeverity`. Encodes the 8 `lathe/CLAUDE.md` §5 gotchas as PASS/FAIL: css-no-rpm-cap (G96 w/o G50 S → ERROR), feed-mode IPR/IPM, thread-* (delegated to lathe-g76-thread-validator), partoff-no-peck, caxis-no-polar, boring-bar-ld (L/D>4 steel / 6 carbide → ERROR, plan-mode), nose-radius-ra (Ra=f²/(32·rε)×1000 µm, plan-mode).
- CLI: `scripts/lathe-program-lint.mjs` (files/stdin/--plan, --json/--strict/--quiet/--controller, exit 0/1/2).
- Skill: `/lathe-lint`. Hook: `lathe-gcode-lint-guard.mjs` (PostToolUse advisory, wired BOTH settings.json, matcher Edit|Write|MultiEdit, fail-soft, gates on lathe .nc ext + turning markers).

**Why:** the MCP server (port 3100) is frequently down → every `prism_turning`-backed validate skill (/lathe-validate, /quality-gate-lathe) fails. This runs OFFLINE in ms — the cheap pre-flight before MCP `lathe_validate_program`.

**R8 reuse (key design):** orchestrates existing pure helpers (`parseBlocks`/`extractProgramParameters` from `lathe-quality-pipeline.mjs` + `validateG76Thread` for gotcha #4) rather than re-implementing. The reuse targets were surfaced by an assessment Workflow (3 text-mode auditors) before any code was written — see [[feedback_dedup_before_build]] discipline.

**Boundary:** distinct from echo's `post-nc-dialect-lint` (dialect SYNTAX) — this is turning PHYSICS. Zero rule overlap (grep-verified); they compose.

**Bugs the gate caught (R9/R12):** per-file scrutiny + tests caught pre-ship — (a) `parseBlocks` doesn't capture Y/C addresses (lathe-centric `BLOCK_ARG_RE`=`[XZPQFR]`) → C-axis rule detects Y/C from `block.text`; (b) `extractProgramParameters` regexes raw text → feed it comment-stripped text so a commented `G96`/`G50` doesn't false-trigger. Both fixed at source; 27/27 green.

Wiki: [[lathe-program-lint]]. Related: [[feedback_whiskey_g50_css_cap_mandatory]] · [[feedback_whiskey_boring_bar_ld_ratio]] · [[reference_whiskey_galaxy_buildout_2026_05_28]].
