#!/bin/bash
# PostToolUse hook: Inject token-saving context after verbose tool outputs
# Covers: Bash, Read, Task, and MCP tool results

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)

# Helper: emit compression hint
compress_hint() {
  python3 -c "
import json,sys
print(json.dumps({'hookSpecificOutput':{'hookEventName':'PostToolUse','additionalContext':sys.argv[1]}}))
" "$1"
  exit 0
}

# Get response length
RESP_LEN=$(echo "$INPUT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('tool_response','')
if isinstance(r,dict): print(len(str(r.get('stdout','')+str(r.get('stderr','')))))
elif isinstance(r,str): print(len(r))
else: print(0)
" 2>/dev/null)

# Short responses need no compression
if [ -z "$RESP_LEN" ] || [ "$RESP_LEN" -lt 3000 ] 2>/dev/null; then
  exit 0
fi

# Bash: large stdout
if [ "$TOOL_NAME" = "Bash" ] && [ "$RESP_LEN" -gt 5000 ] 2>/dev/null; then
  compress_hint "Large bash output (${RESP_LEN} chars). Summarize key findings concisely. Do not echo raw output."
fi

# Read: large file
if [ "$TOOL_NAME" = "Read" ] && [ "$RESP_LEN" -gt 8000 ] 2>/dev/null; then
  compress_hint "Large file read (${RESP_LEN} chars). Extract only relevant sections. Do not echo file contents."
fi

# Task/subagent: large results
if [ "$TOOL_NAME" = "Task" ] && [ "$RESP_LEN" -gt 10000 ] 2>/dev/null; then
  compress_hint "Large subagent result (${RESP_LEN} chars). Summarize in 3-5 bullet points. Do not relay full output."
fi

# MCP tools: Serena, Context7, Greptile can return huge payloads
if echo "$TOOL_NAME" | grep -qE "^mcp__plugin_" && [ "$RESP_LEN" -gt 8000 ] 2>/dev/null; then
  compress_hint "Large MCP tool result (${RESP_LEN} chars). Summarize key data. Do not echo full response."
fi

# Grep: many results
if [ "$TOOL_NAME" = "Grep" ] && [ "$RESP_LEN" -gt 5000 ] 2>/dev/null; then
  compress_hint "Large search result (${RESP_LEN} chars). Focus on most relevant matches. Do not list all results."
fi

# Glob: many files
if [ "$TOOL_NAME" = "Glob" ] && [ "$RESP_LEN" -gt 5000 ] 2>/dev/null; then
  compress_hint "Large file listing (${RESP_LEN} chars). Highlight key files only. Do not list all matches."
fi

# WebFetch: HTML→markdown can be enormous
if [ "$TOOL_NAME" = "WebFetch" ] && [ "$RESP_LEN" -gt 8000 ] 2>/dev/null; then
  compress_hint "Large web page result (${RESP_LEN} chars). Extract only the specific info requested. Do not repeat page content."
fi

# WebSearch: many results
if [ "$TOOL_NAME" = "WebSearch" ] && [ "$RESP_LEN" -gt 5000 ] 2>/dev/null; then
  compress_hint "Large search result (${RESP_LEN} chars). Use the top 2-3 most relevant results. Do not list all results."
fi

# Edit/Write: confirmation output is usually redundant
if [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ]; then
  if [ "$RESP_LEN" -gt 3000 ] 2>/dev/null; then
    compress_hint "Large edit/write confirmation. The change was applied. Do not echo the full diff back to the user."
  fi
fi

exit 0
