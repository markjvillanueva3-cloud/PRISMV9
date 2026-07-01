---
source: project
section: RTK (Bash token reduction — already installed)
slug: rtk-bash-token-reduction-already-installed
indexed_at: 2026-06-23T02:05:18.089Z
---

## RTK (Bash token reduction — already installed)

`rtk.exe` wraps ~100 commands (git/gh/npm/vitest/tsc/docker/grep/cat) and strips redundant output. Hook wired in `H:/.claude/settings.json`. Wins: `npm run build` ~80% reduction, `vitest run` ~70%, `gh pr diff` ~60%. Prefix `command` to bypass (e.g. `command git status` for raw). Skill: `/rtk-setup`.
