#!/bin/bash
# PreToolUse hook: Intercept bash commands → redirect to dedicated tools or cap output
# Deny = block and suggest better tool | Rewrite = modify command before execution

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)

if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Helper: emit deny JSON
deny() {
  python3 -c "
import json,sys
print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','permissionDecision':'deny','permissionDecisionReason':sys.argv[1]}}))
" "$1"
  exit 0
}

# Helper: emit rewrite JSON
rewrite() {
  python3 -c "
import json,sys
print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','updatedInput':{'command':sys.argv[1]}}}))
" "$1"
  exit 0
}

# ============================================================
# DENY SECTION: Redirect to dedicated tools
# ============================================================

# grep/rg → Grep tool
echo "$COMMAND" | grep -qE "^(grep|rg|ripgrep) " && deny "Use the Grep tool instead of bash grep/rg. It is faster and saves tokens."

# cat/head/tail → Read tool
echo "$COMMAND" | grep -qE "^(cat|head|tail|less|more) " && deny "Use the Read tool instead of cat/head/tail. It handles line numbers and is token-efficient."

# find → Glob tool
echo "$COMMAND" | grep -qE "^find " && deny "Use the Glob tool instead of find. It is faster and returns sorted results."

# sed/awk for editing → Edit tool
echo "$COMMAND" | grep -qE "^(sed|awk) .+ ['\"]?[A-Za-z/\\\\]" && deny "Use the Edit tool instead of sed/awk. It provides safer, reviewable edits."

# echo/printf/cat heredoc for writing → Write tool (exclude 2>&1 redirects)
echo "$COMMAND" | grep -qE "(echo .+ [^2]>[ ]*[a-zA-Z/~]|echo .+>>[ ]*[a-zA-Z/~]|cat <<|printf .+ >[ ]*[a-zA-Z/~])" && deny "Use the Write tool instead of echo/cat heredoc. It is safer and reviewable."

# curl/wget → WebFetch tool
echo "$COMMAND" | grep -qE "^(curl|wget) " && deny "Use the WebFetch tool instead of curl/wget. It handles markdown conversion and caching."

# tree → Glob tool
echo "$COMMAND" | grep -qE "^tree " && deny "Use the Glob tool with a pattern like **/* instead of tree. Glob is faster and more token-efficient."

# diff (non-git) → Read both files
echo "$COMMAND" | grep -qE "^diff " && deny "Use the Read tool on both files instead of diff. Read with line numbers is easier to review and more token-efficient."

# bare ls → Glob (except /tmp/ and -la for specific dirs)
echo "$COMMAND" | grep -qE "^ls( |$)" && ! echo "$COMMAND" | grep -qE "^ls .*/tmp/" && ! echo "$COMMAND" | grep -qE "^ls -la? " && deny "Use the Glob tool or Bash ls -la for directory listing. Glob is recursive, sorted by mtime, and more token-efficient."

# tee → Write/Edit (append >> already caught above)
echo "$COMMAND" | grep -qE "\| *tee " && deny "Use the Edit or Write tool instead of tee. They are safer and reviewable."

# version queries → static knowledge
echo "$COMMAND" | grep -qE "^(node|npm|npx|python3?|tsc) (--version|-v|-V)$" && deny "Version queries are static. Node v24+, npm 10+, Python 3.12+. No need to check."

# printenv / env / echo $VAR → known context
echo "$COMMAND" | grep -qE "^(printenv|env |echo \\\$[A-Z])" && deny "Environment variables are in .bashrc and session context. Check CLAUDE.md or settings.json instead."

# ============================================================
# SAFETY SECTION: Block destructive operations
# ============================================================

# rm -rf / rm -r (except /tmp/)
echo "$COMMAND" | grep -qE "^rm -(rf|fr|r) " && ! echo "$COMMAND" | grep -qE "/tmp/" && deny "SAFETY: rm -rf is destructive. Specify exact files to remove, or confirm with the user first."

# git clone (heavy, rarely needed mid-session)
echo "$COMMAND" | grep -qE "^git clone " && deny "SAFETY: git clone is a heavy operation. Confirm with the user before cloning repositories."

# ============================================================
# REWRITE SECTION: Cap verbose output
# ============================================================

# npm test / npx tsc / pytest → | head -50
echo "$COMMAND" | grep -qE "^(npm test|npx tsc|pytest)" && ! echo "$COMMAND" | grep -qE "\| head" && rewrite "$COMMAND 2>&1 | head -50"

# npm install / npm ci → | tail -5 (only care about result)
echo "$COMMAND" | grep -qE "^npm (install|ci)" && ! echo "$COMMAND" | grep -qE "\| (tail|head)" && rewrite "$COMMAND 2>&1 | tail -10"

# pip install → | tail -5
echo "$COMMAND" | grep -qE "^pip3? install" && ! echo "$COMMAND" | grep -qE "\| (tail|head)" && rewrite "$COMMAND 2>&1 | tail -5"

# git log without format → --oneline -20
echo "$COMMAND" | grep -qE "^git log" && ! echo "$COMMAND" | grep -qE "(--oneline|--format|--pretty)" && rewrite "$COMMAND --oneline -20"

# git diff without --stat and not piped → --stat
echo "$COMMAND" | grep -qE "^git diff" && ! echo "$COMMAND" | grep -qE "(--stat|--name-only|\|)" && rewrite "$COMMAND --stat"

# git status -uall → remove -uall flag (memory hazard on large repos)
echo "$COMMAND" | grep -qE "^git status.*-uall" && rewrite "$(echo "$COMMAND" | sed 's/-uall//')"

# sqlite3 queries → | head -50 (unless already piped)
echo "$COMMAND" | grep -qE "^sqlite3 " && ! echo "$COMMAND" | grep -qE "\| (head|tail|wc)" && rewrite "$COMMAND | head -50"

# docker logs → | tail -30
echo "$COMMAND" | grep -qE "^docker logs" && ! echo "$COMMAND" | grep -qE "\| (head|tail)" && rewrite "$COMMAND | tail -30"

# Allow everything else
exit 0
