#!/bin/bash
# PermissionRequest hook: Auto-approve known-safe tool calls
# Eliminates permission round-trips for read-only and safe operations

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh
parse_hook_input "$INPUT"

# ============================================================
# READ-ONLY TOOLS: Always safe
# ============================================================
case "$TOOL_NAME" in
  Read|Grep|Glob|WebSearch|WebFetch|ToolSearch|TaskList|TaskGet|TaskCreate|TaskUpdate|EnterPlanMode|ExitPlanMode|AskUserQuestion|NotebookEdit|Skill)
    approve "Read-only/management tool auto-approved"
    ;;
esac

# ============================================================
# MCP TOOLS: Auto-approve all Serena, Context7, Playwright, Greptile
# ============================================================
if echo "$TOOL_NAME" | grep -qE "^mcp__plugin_(serena|context7|playwright|greptile)_"; then
  approve "MCP plugin tool auto-approved"
fi

# ============================================================
# BASH: Pattern-match safe commands
# ============================================================
if [ "$TOOL_NAME" = "Bash" ]; then
  # Git operations — approve safe ops, let hookify handle dangerous ones
  # Skip: push --force, reset --hard, branch -D, clean -f, checkout .
  if echo "$COMMAND" | grep -qE "^git "; then
    echo "$COMMAND" | grep -qE "(push\s+.*--force|push\s+.*-f\s|reset\s+--hard|branch\s+-(d|D)\s|clean\s+-f|checkout\s+\.\s*$)" && exit 0
    approve "Git command auto-approved"
  fi

  # Python: only hook support scripts and safe one-liners
  echo "$COMMAND" | grep -qE "^python3? (~/.claude/hooks/|/home/.*/.claude/hooks/|C:/Users/.*/\.claude/hooks/)" && approve "Python hook script auto-approved"
  echo "$COMMAND" | grep -qE '^python3? -c "(import (json|sys|os|math|re)|print\()" ' && approve "Python safe one-liner auto-approved"

  # Node: only .claude paths and known tools
  echo "$COMMAND" | grep -qE "^node (~/.claude/|/home/.*/.claude/|C:/Users/.*/\.claude/)" && approve "Node hook script auto-approved"
  echo "$COMMAND" | grep -qE "^npx (promptfoo|vitest|esbuild|tsc)" && approve "npx known tool auto-approved"

  # npm: only safe subcommands
  echo "$COMMAND" | grep -qE "^npm (test|run |install|audit|list|ls|outdated|info|view|pack|ci)" && approve "npm safe command auto-approved"

  # pip: only read-only and install (no --target or custom scripts)
  echo "$COMMAND" | grep -qE "^pip (list|show|freeze|check)" && approve "pip read-only auto-approved"
  echo "$COMMAND" | grep -qE "^pip install " && ! echo "$COMMAND" | grep -qE "(--target|--user.*-e|\.py)" && approve "pip install auto-approved"

  # File/dir operations (non-destructive; mv restricted to PRISM paths)
  echo "$COMMAND" | grep -qE "^(ls |ls$|mkdir|cp |chmod |wc |du |test |stat |\[)" && approve "File operation auto-approved"
  echo "$COMMAND" | grep -qE "^mv .*(C:[/\\\\]PRISM[/\\\\]|/PRISM/|mcp-server/)" && approve "mv within PRISM auto-approved"

  # Build/test commands
  echo "$COMMAND" | grep -qE "^(npm run|npx tsc|npm test|pytest)" && approve "Build/test command auto-approved"

  # Shell operations: only .claude hook paths
  echo "$COMMAND" | grep -qE "^(bash|source) (~/.claude/hooks/|/home/.*/.claude/hooks/|C:/Users/.*/\.claude/hooks/)" && approve "Shell hook script auto-approved"
  echo "$COMMAND" | grep -qE "^(echo |printf |export |cd )" && approve "Shell builtin auto-approved"

  # SQLite: read-only queries only
  echo "$COMMAND" | grep -qiE "^sqlite3 .* (\"SELECT|'SELECT|\.schema|\.tables|\.dump)" && approve "SQLite read-only auto-approved"

  # System info (read-only)
  echo "$COMMAND" | grep -qE "^(which|where|type|whoami|hostname|uname|date|tasklist)" && approve "System info auto-approved"

  # Powershell: read-only Get-* commands only
  echo "$COMMAND" | grep -qE '^powershell (-Command )?"Get-' && approve "Powershell read-only auto-approved"
fi

# ============================================================
# EDIT/WRITE: Auto-approve for PRISM and .claude directories
# ============================================================
if [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "MultiEdit" ]; then
  if echo "$FILE_PATH" | grep -qE "^(C:[/\\\\]PRISM[/\\\\]|C:[/\\\\]Users[/\\\\].*[/\\\\]\.claude[/\\\\]|/tmp/)"; then
    approve "Edit/Write to PRISM/.claude/tmp auto-approved"
  fi
fi

# ============================================================
# TASK/AGENT TOOL: Always approve subagent launches
# ============================================================
if [ "$TOOL_NAME" = "Task" ] || [ "$TOOL_NAME" = "Agent" ]; then
  approve "Task/Agent subagent launch auto-approved"
fi

# Everything else - let the user decide
exit 0
