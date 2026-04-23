#!/bin/bash
# Smoke test for bash-destructive-guard — runs the hook against a set of
# sample commands via stdin JSON. Written to a script file (not inline) so
# the test harness itself doesn't contain destructive-looking patterns that
# would trip the guard.
set -u
HOOK="/h/prism/.claude/hooks/bash-destructive-guard.mjs"
NODE="H:/.claude/bin/portable-node"

declare -a CASES=(
  "git status"
  "git log --oneline"
  "git push --force origin main"
  "git push --force-with-lease"
  "git reset --hard HEAD~1"
  "git clean -fd"
  "git branch -D feature"
  "git commit -m msg --no-verify"
  "git filter-branch --env-filter X HEAD"
  "git stash drop"
)

for cmd in "${CASES[@]}"; do
  payload=$(printf '{"tool_name":"Bash","tool_input":{"command":"%s"}}' "$cmd")
  out=$(printf '%s' "$payload" | "$NODE" "$HOOK")
  # pick first 140 chars for summary
  short=$(printf '%s' "$out" | head -c 140)
  printf '[%s]\n  %s\n' "$cmd" "$short"
done
