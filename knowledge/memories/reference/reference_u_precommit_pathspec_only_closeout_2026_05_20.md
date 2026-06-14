---
name: reference-u-precommit-pathspec-only-closeout-2026-05-20
description: "U-PRECOMMIT-PATHSPEC-ONLY (JULIETT-12CHAT-ALLOCATION-MS0/W1) closed-out 2026-05-20 by echo (claude-4278393c) — lib + 48 tests shipped 2026-05-17 by prior echo `claude-098ac2aa`; this session added the missing installer that wires the guard into .husky/pre-commit"
aliases: reference_u_precommit_pathspec_only_closeout_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.018Z
---


U-PRECOMMIT-PATHSPEC-ONLY was a **half-shipped unit** (close-out debt class). The pure-core lib `scripts/pathspec-only-guard.mjs` + a 48-case hermetic test suite (`scripts/pathspec-only-guard.test.mjs`) were built and scrutinized 2026-05-17 by a prior echo session (`claude-098ac2aa`) — the file annotations carry Arm A P1 (control-char sanitization on the resolve-recipe) + Arm B P2 (loud-on-malformed-claim instead of silent swallow) fixes. But the wiring shim that makes the guard actually fire was never written. The pre-commit hook directory only had `pre-commit.sample`. Net: the gate was **inert** — all the code was on disk, no commit ever invoked it, and the 5-collateral-staging-incident regression class kept recurring.

Why: `claude-098ac2aa`'s handoff stub showed slot-unbound precompact ("(precompact auto-write — slot unbound)"), so the chat compacted before close-out tail. The work shipped per the lib's content but the unit was never marked complete and never moved onto the next surface (`.husky/pre-commit`).

This session's fix is a single net-new file: `scripts/install-pathspec-only-git-hook.mjs` (~100 LOC). It mirrors the proven pattern in `install-system-viz-git-hook.mjs` — worktree-aware `git rev-parse --git-path hooks`, fenced `MARKER_BEGIN/MARKER_END` block, idempotent install + `--uninstall`, `spawnSync` (security-reminder hook flags the legacy non-array spawn API on prose match — array-form spawn is the safe path), `GIT_REVPARSE_TIMEOUT_MS` constant (anti-pattern hook fires on naked timing magic numbers).

PRISM uses `core.hooksPath = .husky`, so `git rev-parse --git-path hooks` resolved to `.husky/`. The installer correctly auto-detected this and appended the fenced block to `.husky/pre-commit` **after** the existing `lint-staged` + `cam-phase5-impl-gate.mjs` blocks. Pre-existing hook chain preserved by construction (read existing → append → write).

The block content:
```sh
PRISM_PATHSPEC_GUARD_REPO="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -n "$PRISM_PATHSPEC_GUARD_REPO" ] && [ -f "$PRISM_PATHSPEC_GUARD_REPO/scripts/pathspec-only-guard.mjs" ]; then
  node "$PRISM_PATHSPEC_GUARD_REPO/scripts/pathspec-only-guard.mjs" || exit 1
fi
```

Foreground execution. Exit 1 from the guard propagates and **blocks the commit**. The guard's own fail-open policy (missing-claims-dir / git-failure / unresolvable-session-id → allow) means a broken claims store does NOT block all commits — the harness-side `file-claim-commit-guard.mjs` (sub-200ms PreToolUse hook on Claude's Bash tool) remains the load-bearing layer; the .husky/pre-commit gate is layered defense for direct-PowerShell commits that bypass the harness.

Smoke verified: re-running the installer reports `already installed — pathspec-only block present` (idempotent). 48/48 lib tests still pass. The `--uninstall` flag is implemented (regex-based fenced-block removal preserving the rest of the file) for reversibility per [[feedback_never_delete_only_disable]].

**Lesson:** when a spec says `status: pending` but the artifacts already exist on disk, the unit is silent close-out debt — check for missing-tail surfaces (wiring, install scripts, doc-reflection) before either re-building or skipping. The R8 doctrine (read before write) made this fix a 100-LOC installer instead of a re-implementation.

Related:
- [[feedback_always_close_out]] — 4-surface close-out (spec + git + memory + Obsidian)
- [[feedback_never_delete_only_disable]] — installer ships `--uninstall`
- [[reference_misc_tasks_extraction_2026_05_16]] §Recent regressions — 5 collateral-staging incidents in 48h that drove the unit
- Sibling installer: `scripts/install-system-viz-git-hook.mjs` (post-commit, background) — same pattern, different hook
- Sibling guards: `.claude/hooks/git-add-lane-guard.mjs` + `.claude/hooks/worktree-commit-route.mjs` — harness-side gates; pathspec-only is the git-side complement
