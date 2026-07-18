# HANDOFF — slot:echo (claude-223d9a61) — post-processor-galaxy

**Resume directive:** Active /goal = "compile post-processor wiki+tribal → wired/validated/auto-invoked" (KB DELIVERED). NEXT offline iterations: (a) empirically validate KB tribal lessons by linting the full JM `.MIN`/`.cps` corpus + capture report; (b) author more of the 169 missing post-processor wiki entries; (c) `post-awareness-snapshot` script. Dark-engine BUILD ("run ralph loops") still infra-gated (MCP down).

## Shipped this session — iter4 (commit a99629df34 on main)
**Compiled domain knowledge base** (/goal "compile wiki+tribal, auto-invoked"):
- `knowledge/wiki/architecture/post-processor-knowledge-base.md` — CANONICAL entry point: wiki map (all ~15 post-proc entries) + 10 compiled tribal lessons (coolant-order mill/lathe, M50/M51-not-coolant, comment-style, feed-mode, retract, modal-tap, modal-state-thru-subs, byte-equivalence, stub≠wired, U-LEGAL-13) + JM 4-controller dialect quick-ref + quality gates.
- Wired: registered in galaxy PATHS.md. Auto-invoked: `echo-post-domain-inject.mjs` digest now points at the KB (verified fires on fanuc keyword).
- Validation: SELF-REVIEW (dedicated agent rate-limited — fleet congestion). Tribal lessons cross-checked vs already-scrutinized dialect-matrix wiki.

## Shipped this session (iter2, commit `56b90e5ebe` on `cad-fusion-live-ms0`)
**Static NC dialect linter unit** (operator /goal: "generate skills, scripts and hooks for your domain"):
- `scripts/post-nc-dialect-lint.mjs` — pure-static NC/G-code dialect+safety linter (no engine/build/MCP). 8 rules: coolant-before-spindle (turning-aware → INFO on G96/G97), spindle-start-no-speed, feed-no-feedmode, tool-change-no-retract (cut-open only), comment-style okuma/fanuc (macro-safe), modal-tap-dialect, missing-program-end. CLI `--json/--strict`, exit codes for CI. Exports `lintNc()`.
- `scripts/post-nc-dialect-lint.test.mjs` — 24 `node --test` cases, ALL PASS (happy + 8 rules + 4 dialects + adversarial + macro false-pos guard + turning downgrade + CLI round-trip).
- `.claude/hooks/post-nc-dialect-guard.mjs` — PostToolUse(Edit|Write|MultiEdit) auto-lint on `.nc/.min/.eia/.tap/.ngc/.h/.htc/.gcode/.pgm`. Advisory, fail-soft, **wired in settings.json (C:+H:, valid JSON)**. Knob `PRISM_POST_NC_DIALECT_GUARD_DISABLE=1`.
- `/post-nc-lint` skill (`.claude/commands/post-nc-lint.md`, gitignored on-disk).
- Registered in galaxy `mcp-server/src/engines/post-processor/PATHS.md`. Memory `reference_echo_nc_dialect_lint`. Validated on real JM Okuma `.MIN` (0 err / 10 warn / 1 info).
- **/dedup verified distinct** from find-cross-dialect-leaks (engine runtime), auto-lint-post-edit (TS eslint), audit-post-processor-coverage (engine-file matrix).

## Prior session (still valid)
- b0d89a04 — galaxy buildout: 4 galaxy files + soul realign + 3 wiki + master back-pointer (13/13 gate green)
- 5524cf3d — echo-post-domain-inject.mjs custom domain-awareness hook + PATHS
- Galaxy synergy meta-goal validated: `state/shared/specs/POST-PROCESSOR-GALAXY-SYNERGY-VALIDATION-2026-05-28-echo.md` (10/11 PSN legs green, system-viz partial).

## Infra blocks (operator-side)
- MCP server DISCONNECTED (:3100 timeout) → Ralph blocked. `mcp-server/dist/.env` key staged; needs server restart.
- `mcp-server` build:fast CRASHES (esbuild) in this worktree; recent post-proc engines live on `main`, NOT in slot/echo worktree (705 behind origin).
- Ollama `/api/chat` dead; qdrant down; subagents 1M-context-credit-gated (scrutiny + workflow agents fail).
- Domain tooling commits to main via `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` (slot/echo lineage ≠ main).

## Loop state
`223d9a61` iter 2/8 status=running.
