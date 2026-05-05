---
schema_version: 1.0.0
source: project
section: RTK (Bash token reduction — already installed)
slug: rtk-bash-token-reduction-already-installed
start_line: 242
end_line: 245
indexed_at: 2026-05-05T13:49:55.484Z
content_hash: a6b46c31b58605ab3cfc2174028052a0521e6ae276d539b6003466402dae59a3
mirror_engine: ClaudeMdChunkerEngine
---
## RTK (Bash token reduction — already installed)
`rtk.exe` wraps ~100 commands (git/gh/npm/vitest/tsc/docker/grep/cat) and strips redundant output. Hook wired in `H:/.claude/settings.json`. Wins: `npm run build` ~80% reduction, `vitest run` ~70%, `gh pr diff` ~60%. Prefix `command` to bypass (e.g. `command git status` for raw). Skill: `/rtk-setup`.

<!-- AUTO-WEDM-START -->
