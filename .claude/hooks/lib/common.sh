#!/bin/bash
# Shared utilities for Claude Code hooks
# Source this in any hook: . ~/.claude/hooks/lib/common.sh

COMMON_SH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================================
# JSON PARSING — extract all common fields from hook stdin JSON
# Usage: parse_hook_input "$INPUT"
# Sets: TOOL_NAME, FILE_PATH, COMMAND, CONTENT_LEN,
#       PATTERN, QUERY, OUTPUT_MODE, HAS_LIMIT, HAS_PATH, TOOL_PATH
# ============================================================
parse_hook_input() {
  local input="$1"
  local tmpvars="/tmp/.claude-hook-vars-$$"
  export _HOOK_INPUT="$input"
  python3 << 'PYEOF' > "$tmpvars" 2>/dev/null
import json,os
raw = os.environ.get("_HOOK_INPUT","")
d = json.loads(raw) if raw else {}
tn = d.get("tool_name","")
ti = d.get("tool_input",{})
fp = ti.get("file_path","")
# Windows fix: resolve /tmp/ to native path so Git Bash MSYS conversion doesn't mangle it
# Claude Code + Python use C:\tmp\, but Git Bash maps /tmp/ to AppData\Local\Temp
if fp.startswith('/tmp/') or fp.startswith('/tmp\\'):
    fp = os.path.realpath(fp).replace('\\', '/')
cmd = ti.get("command","")
content = ti.get("content","") or ti.get("new_string","")
pattern = ti.get("pattern","")
query = ti.get("query","")
output_mode = ti.get("output_mode","")
has_limit = 1 if "limit" in ti or "head_limit" in ti else 0
has_path = 1 if "path" in ti else 0
tool_path = ti.get("path","")
def esc(s): return s.replace("'","'\\''")
print(f"TOOL_NAME='{esc(tn)}'")
print(f"FILE_PATH='{esc(fp)}'")
print(f"COMMAND='{esc(cmd)}'")
print(f"CONTENT_LEN={len(content)}")
print(f"PATTERN='{esc(pattern)}'")
print(f"QUERY='{esc(query)}'")
print(f"OUTPUT_MODE='{esc(output_mode)}'")
print(f"HAS_LIMIT={has_limit}")
print(f"HAS_PATH={has_path}")
print(f"TOOL_PATH='{esc(tool_path)}'")
PYEOF
  . "$tmpvars" 2>/dev/null
  rm -f "$tmpvars"
  unset _HOOK_INPUT
}

# ============================================================
# OUTPUT HELPERS — standardized JSON responses
# ============================================================

# Deny a PreToolUse action
deny() {
  python3 -c "
import json,sys
print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','permissionDecision':'deny','permissionDecisionReason':sys.argv[1]}}))
" "$1"
  exit 0
}

# Rewrite a Bash command
rewrite() {
  python3 -c "
import json,sys
print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','updatedInput':{'command':sys.argv[1]}}}))
" "$1"
  exit 0
}

# Rewrite any tool's input (generic — pass JSON patch)
rewrite_input() {
  python3 -c "
import json,sys
patch = json.loads(sys.argv[1])
print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','updatedInput':patch}}))
" "$1"
  exit 0
}

# Show a hint/context message (PostToolUse or SessionStart)
hint() {
  local event="${2:-PostToolUse}"
  python3 -c "
import json,sys
print(json.dumps({'hookSpecificOutput':{'hookEventName':sys.argv[2],'additionalContext':sys.argv[1]}}))
" "$1" "$event"
  exit 0
}

# Auto-approve a PermissionRequest
approve() {
  python3 -c "
import json,sys
print(json.dumps({'hookSpecificOutput':{'hookEventName':'PermissionRequest','permissionDecision':'allow','permissionDecisionReason':sys.argv[1]}}))
" "$1"
  exit 0
}

# ============================================================
# TOKEN EFFICIENCY RULES — single source of truth
# ============================================================
TOKEN_RULES="TOKEN EFFICIENCY RULES: (1) Never echo raw tool output - summarize. (2) Use dedicated tools (Read/Grep/Glob/Edit/Write) not bash. (3) Run independent tools in parallel. (4) For PRISM: load skills via TRIGGER_MAP auto-matching. (5) Use /digest-all (~1100 tokens) or /navigate <topic> before Glob/Grep exploration. (6) Use /code-index shortcodes (E0001=engine, D01=dispatcher) instead of full paths."


# ============================================================
# AUTO-FIX FUNCTIONS � convert warn-only rules to auto-rewrites
# CCM-MS13: Auto-Remediation Pipeline
# ============================================================

# Auto-fix: rewrite git log to include --oneline -20
auto_fix_git_log() {
  local cmd="$1"
  if echo "$cmd" | grep -qE '^git log' && ! echo "$cmd" | grep -q '\-\-oneline'; then
    rewrite "$(echo "$cmd" | sed 's/git log/git log --oneline -20/')"
  fi
}

# Auto-fix: rewrite git diff to include --stat
auto_fix_git_diff() {
  local cmd="$1"
  if echo "$cmd" | grep -qE '^git diff$'; then
    rewrite "git diff --stat"
  fi
}

# Auto-fix: remove -uall from git status
auto_fix_git_status() {
  local cmd="$1"
  if echo "$cmd" | grep -q '\-uall'; then
    rewrite "$(echo "$cmd" | sed 's/-uall//')"
  fi
}

# Auto-fix: cap large output commands with tail
auto_cap_output() {
  local cmd="$1"
  local cap="${2:-50}"
  if ! echo "$cmd" | grep -qE 'tail|head|wc'; then
    rewrite "$cmd | tail -${cap}"
  fi
}

# Auto-fix: redirect WebFetch doc URLs to context7 MCP
auto_fix_webfetch_to_context7() {
  local url="$1"
  local url_lower="${url,,}"
  local lib=""
  case "$url_lower" in
    *docs.python.org*)    lib="python" ;;
    *developer.mozilla.org*) lib="mdn" ;;
    *nodejs.org/api*)     lib="node" ;;
    *typescriptlang.org*) lib="typescript" ;;
    *reactjs.org*)        lib="react" ;;
    *nextjs.org*)         lib="nextjs" ;;
    *docs.rs*)            lib="rust" ;;
    *pkg.go.dev*)         lib="go" ;;
    *docs.djangoproject.com*) lib="django" ;;
    *docs.nestjs.com*)    lib="nestjs" ;;
    *vitejs.dev*)         lib="vite" ;;
    *vitest.dev*)         lib="vitest" ;;
    *zod.dev*)            lib="zod" ;;
    *expressjs.com*)      lib="express" ;;
    *fastapi.tiangolo.com*) lib="fastapi" ;;
  esac
  if [ -n "$lib" ]; then
    local topic
    topic=$(echo "$url" | grep -oP '(?<=/)[^/]+(?=/?$)' 2>/dev/null || echo "")
    [ -z "$topic" ] && topic="$lib"
    deny "AUTO-REDIRECT: Use context7 MCP instead of WebFetch for docs. Run: mcp__plugin_context7_context7__resolve-library-id with libraryName='$lib', then mcp__plugin_context7_context7__query-docs with the resolved ID and topic='$topic'. Saves 5-20K tokens."
  fi
}

# Auto-fix: add default path to Grep when no path specified
auto_scope_grep() {
  local pattern="$1"
  if [ -d "H:/prism/mcp-server/src" ]; then
    rewrite_input '{"path": "H:/prism/mcp-server/src"}'
  fi
}

# Token pressure check � returns level via exit code: 0=ok, 1=moderate(>200K), 2=critical(>300K)
check_token_pressure() {
  local token_file="/tmp/claude-session-tokens"
  [ ! -f "$token_file" ] && return 0
  local tokens
  tokens=$(cat "$token_file" 2>/dev/null | tr -d '[:space:]')
  [ -z "$tokens" ] && return 0
  local max_ctx="${PRISM_MAX_CONTEXT_TOKENS:-1000000}"
  local critical_threshold=$((max_ctx * 90 / 100))
  local warn_threshold=$((max_ctx * 75 / 100))
  if [ "${tokens:-0}" -gt "$critical_threshold" ] 2>/dev/null; then
    return 2
  elif [ "${tokens:-0}" -gt 200000 ] 2>/dev/null; then
    return 1
  fi
  return 0
}
