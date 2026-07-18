---
name: reference_echo_nc_dialect_lint
description: "echo's static NC/G-code dialect+safety linter — scripts/post-nc-dialect-lint.mjs + /post-nc-lint skill + post-nc-dialect-guard PostToolUse hook. The post-processor domain's automated quality gate."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.562Z
aliases: reference_echo_nc_dialect_lint
---


slot:echo built a pure-static NC dialect/safety linter for the post-processor domain (2026-05-29, commit `56b90e5ebe` on `cad-fusion-live-ms0`). Codifies the domain's #1 prove-out failure mode — controller-dialect mismatch — as a deterministic, CI-usable, fail-soft gate. **No engine, no `dist/` build, no MCP** (works even when the mcp-server build is broken / MCP disconnected).

**Artifacts:**
- `H:/prism/scripts/post-nc-dialect-lint.mjs` — linter. `node ... <file> [--dialect <name>] [--json] [--strict]`. Exit 0 clean / 1 ≥1 ERROR / 2 bad args. Exports `lintNc(text, {dialect, filename})`.
- `H:/prism/scripts/post-nc-dialect-lint.test.mjs` — 24 `node --test` cases (happy + 8 rules + fanuc/okuma/siemens/heidenhain + adversarial null/empty/garbage/5k-scale + macro false-positive guard + turning downgrade + CLI round-trip).
- `H:/prism/.claude/hooks/post-nc-dialect-guard.mjs` — PostToolUse(Edit|Write|MultiEdit) auto-lint on `.nc/.min/.eia/.tap/.ngc/.h/.htc/.gcode/.pgm`. Advisory, fail-soft, wired in settings.json (C:+H:). Knob `PRISM_POST_NC_DIALECT_GUARD_DISABLE=1`.
- `/post-nc-lint` skill (`.claude/commands/post-nc-lint.md`, gitignored on-disk).

**8 rules** (source: `knowledge/wiki/architecture/post-processor-controller-dialect-matrix.md`): coolant-before-spindle (ERROR on mill, **INFO on turning** — G96/G97/G50-S detected, M8-before-M3 is conventional on lathes), spindle-start-no-speed, feed-no-feedmode, tool-change-no-retract (only when a cut is OPEN), comment-style-okuma (`()` in OSP), comment-style-fanuc (`[]` prose in Fanuc — macros `[#1+#2]` are NOT flagged), modal-tap-dialect (Siemens G84 / Fanuc MCALL), missing-program-end.

**Distinct from** (verified /dedup): `find-cross-dialect-leaks.mjs` (runs the BUILT engine on scenarios — runtime validator); `auto-lint-post-edit.mjs` (TS eslint on `.ts`); `audit-post-processor-coverage.mjs` (engine-file coverage matrix). None lint emitted NC text.

Validated on real JM Okuma `.MIN` (`BOX/PRISM CAD-CAM TRAINING/.../BSHC-1B.min`): 0 err / 10 warn (`()`-in-Okuma) / 1 info (turning coolant). NOTE: a `.cps` is a Fusion post *definition* (JS), NOT emitted NC — don't lint those. Registered in galaxy [[reference_post_dispatcher_surface]] PATHS.md. See [[reference_controller_dialect_matrix]].
