#!/bin/bash
# UNIFIED PostToolUse hook — handles output compression, edit validation, code quality, anti-regression
# Replaces: posttooluse-compressor.sh + post-edit-autocheck.sh + posttooluse-code-quality.sh + posttooluse-anti-regression.sh

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh
parse_hook_input "$INPUT"

# ====================================================================
# EDIT VALIDATION (Write/Edit/MultiEdit) — runs FIRST for immediate feedback
# ====================================================================
case "$TOOL_NAME" in
  Write|Edit|MultiEdit)
    [ -z "$FILE_PATH" ] && exit 0

    # JSON syntax check
    case "$FILE_PATH" in
      *.json)
        RESULT=$(python3 -c "
import json,sys
try:
    with open(sys.argv[1]) as f: json.load(f)
    print('OK')
except json.JSONDecodeError as e: print('JSON SYNTAX ERROR line %d: %s' % (e.lineno, e.msg))
except FileNotFoundError: print('OK')
except Exception as e: print('ERROR: %s' % str(e)[:80])
" "$FILE_PATH" 2>/dev/null)
        [ "$RESULT" != "OK" ] && [ -n "$RESULT" ] && hint "AUTO-CHECK FAILED: $RESULT — Fix the JSON syntax error immediately."
        ;;

      # TypeScript check (debounced 30s)
      *mcp-server/src/*.ts)
        echo "$FILE_PATH" | grep -qE '\.(test|spec)\.ts$' && exit 0
        LAST="/tmp/prism-tsc-lastrun"
        if [ -f "$LAST" ]; then
          AGE=$(( $(date +%s) - $(date -r "$LAST" +%s 2>/dev/null || echo 9999) ))
          [ "$AGE" -lt 30 ] && exit 0
        fi
        touch "$LAST" 2>/dev/null
        TSC_OUT=$(cd /c/PRISM/mcp-server && npx tsc --noEmit --pretty false 2>&1 | grep "error TS" | head -3)
        if [ -n "$TSC_OUT" ]; then
          ERR_CT=$(echo "$TSC_OUT" | wc -l)
          ERRS=$(echo "$TSC_OUT" | tr "'" '"' | tr '\n' ' ' | cut -c1-300)
          hint "TSC: $ERR_CT type error(s). $ERRS Fix before building."
        fi
        ;;

      # Shell syntax check
      *.sh|*.bash)
        SYNTAX=$(bash -n "$FILE_PATH" 2>&1)
        [ $? -ne 0 ] && [ -n "$SYNTAX" ] && hint "SHELL SYNTAX ERROR: $(echo "$SYNTAX" | head -2 | tr "'" '"' | cut -c1-200)"
        ;;

      # Python syntax check
      *.py)
        SYNTAX=$(python3 -m py_compile "$FILE_PATH" 2>&1)
        if [ $? -ne 0 ] && [ -n "$SYNTAX" ]; then
          ERR_MSG=$(echo "$SYNTAX" | tail -1 | tr "'" '"' | cut -c1-200)
          hint "PYTHON SYNTAX ERROR: $ERR_MSG — Fix before running."
        fi
        ;;

      # TypeScript any-type check (file-level count, can't be hookify regex)
      *.ts|*.tsx)
        ANY_COUNT=$(grep -cE ':\s*any\b' "$FILE_PATH" 2>/dev/null || echo "0")
        [ "$ANY_COUNT" -gt 10 ] && hint "CODE QUALITY: High 'any' type usage (${ANY_COUNT}). Consider adding proper types."
        ;;
    esac

    # ARCHITECTURE.json auto-update: regenerate when system files change
    case "$FILE_PATH" in
      *hookify.*.local.md|*hooks/*.sh|*settings.json|*hooks/lib/*.sh)
        # Debounce: only regenerate once per 30s
        ARCH_TRACKER="/tmp/claude-arch-regen"
        REGEN=1
        if [ -f "$ARCH_TRACKER" ]; then
          AGE=$(( $(date +%s) - $(stat -c %Y "$ARCH_TRACKER" 2>/dev/null || echo 0) ))
          [ "$AGE" -lt 30 ] 2>/dev/null && REGEN=0
        fi
        if [ "$REGEN" -eq 1 ]; then
          touch "$ARCH_TRACKER" 2>/dev/null
          ( python3 ~/.claude/hooks/architecture-scanner.py && python3 ~/.claude/hooks/generate-dashboard.py ) >/dev/null 2>&1 &
        fi
        ;;
    esac

    # --- Track edited/written files for read-after-edit dedup (PreToolUse checks this) ---
    # Uses same normalize_path logic as PreToolUse (IMPROVEMENT #2 compatibility)
    _NORM_FP=$(printf '%s' "$FILE_PATH" | tr "\\\\" "/")
    [[ "$_NORM_FP" =~ ^/([a-zA-Z])/ ]] && _NORM_FP="${BASH_REMATCH[1]^^}:/${_NORM_FP:3}"
    if [[ "$_NORM_FP" =~ ^([a-z]):/ ]]; then
      _DRIVE="${BASH_REMATCH[1]}"
      _NORM_FP="${_DRIVE^^}:/${_NORM_FP:3}"
    fi
    EDIT_HASH=$(echo -n "$_NORM_FP" | md5sum 2>/dev/null | cut -d' ' -f1)
    touch "/tmp/claude-edited-${EDIT_HASH:-noedit}" 2>/dev/null

    # --- Post-action pipeline (debounced 30s) ---
    PAP_TRACKER="/tmp/claude-pap-lastrun"
    PAP_RUN=1
    if [ -f "$PAP_TRACKER" ]; then
      PAP_AGE=$(( $(date +%s) - $(stat -c %Y "$PAP_TRACKER" 2>/dev/null || echo 0) ))
      [ "$PAP_AGE" -lt 30 ] 2>/dev/null && PAP_RUN=0
    fi
    if [ "$PAP_RUN" -eq 1 ]; then
      touch "$PAP_TRACKER" 2>/dev/null
      PAP_OUT=$(python3 ~/.claude/hooks/lib/post_action_pipeline.py "$TOOL_NAME" "" "$FILE_PATH" 2>/dev/null)
      if echo "$PAP_OUT" | grep -q "REVIEW_THRESHOLD" 2>/dev/null; then
        hint "AUTO: 10+ edits this session. Consider running /prism-review for quality check."
      fi
    fi

    # Anti-regression: dispatcher action count guard
    case "$FILE_PATH" in
      *mcp-server/src/tools/dispatchers/*Dispatcher.ts)
        CACHE_DIR="/tmp/prism-action-counts"
        mkdir -p "$CACHE_DIR"
        BASENAME=$(basename "$FILE_PATH")
        CACHE_FILE="$CACHE_DIR/${BASENAME}.count"
        CURRENT_COUNT=$(grep -cE '^\s*case\s+"[a-z_]+"' "$FILE_PATH" 2>/dev/null || echo "0")
        if [ -f "$CACHE_FILE" ]; then
          PREV_COUNT=$(cat "$CACHE_FILE" 2>/dev/null)
          if [ "$CURRENT_COUNT" -lt "$PREV_COUNT" ] 2>/dev/null; then
            DIFF=$((PREV_COUNT - CURRENT_COUNT))
            hint "ANTI-REGRESSION: ${BASENAME} action count ${PREV_COUNT}→${CURRENT_COUNT} (-${DIFF}). Verify no actions removed."
          fi
        fi
        echo "$CURRENT_COUNT" > "$CACHE_FILE"
        ;;
    esac

    exit 0
    ;;
esac

# ====================================================================
# IMPROVEMENT #5: PREDICTIVE RELATED-FILE HINTS after Read
# Saves Glob/Grep cycles by proactively suggesting related files
# ====================================================================
if [ "$TOOL_NAME" = "Read" ] && [ -n "$FILE_PATH" ]; then
  FP_NORM="${FILE_PATH//\\//}"
  case "$FP_NORM" in
    */engines/*Engine.ts)
      ENGINE_NAME=$(basename "$FP_NORM" .ts)
      hint "Related: test at __tests__/${ENGINE_NAME}.test.ts, check dispatcher wiring at tools/dispatchers/"
      ;;
    */tools/dispatchers/*Dispatcher.ts)
      DISP_NAME=$(basename "$FP_NORM" .ts)
      # Extract engine references from dispatcher to suggest which engines it routes to
      ENGINE_REFS=""
      if [ -f "$FILE_PATH" ]; then
        ENGINE_REFS=$(grep -oE '[A-Z][a-zA-Z]+Engine' "$FILE_PATH" 2>/dev/null | sort -u | head -5 | tr '\n' ', ' | sed 's/,$//')
      fi
      if [ -n "$ENGINE_REFS" ]; then
        hint "Related: ${DISP_NAME} routes to engines: ${ENGINE_REFS}. Tests at __tests__/${DISP_NAME}.test.ts"
      else
        hint "Related: test at __tests__/${DISP_NAME}.test.ts"
      fi
      ;;
  esac
fi

# ====================================================================
# BUILD/TEST RESULT TRACKER — cache clean results for PreToolUse guard
# ====================================================================
if [ "$TOOL_NAME" = "Bash" ] && [ -n "$COMMAND" ]; then
  if [[ "$COMMAND" =~ (npx\ tsc\ --noEmit|npx\ vitest\ run) ]]; then
    BUILD_KEY=$(echo -n "$COMMAND" | md5sum 2>/dev/null | cut -d' ' -f1)
    BUILD_TRACKER="/tmp/claude-build-${BUILD_KEY:-nobuild}"
    # Extract exit code and check for clean result
    EXIT_CODE=$(python3 -c "
import json,sys
d=json.loads(sys.stdin.read())
r=d.get('tool_response',{})
print(r.get('exitCode',1) if isinstance(r,dict) else 1)
" <<< "$INPUT" 2>/dev/null)
    if [ "$EXIT_CODE" = "0" ]; then
      echo "CLEAN" > "$BUILD_TRACKER" 2>/dev/null
    else
      echo "FAILED" > "$BUILD_TRACKER" 2>/dev/null
    fi
  fi
fi

# ====================================================================
# OUTPUT COMPRESSION — Only measure response size for non-edit tools
# ====================================================================
# Fast size estimate using bash (avoid python3 for small outputs)
RESP_LEN=${#INPUT}

# Short responses (< ~4KB of total JSON) — skip entirely
[ "$RESP_LEN" -lt 4000 ] && exit 0

# For larger inputs, get precise response length
RESP_LEN=$(python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('tool_response','')
if isinstance(r,dict): print(len(str(r.get('stdout',''))))
elif isinstance(r,str): print(len(r))
else: print(0)
" <<< "$INPUT" 2>/dev/null)

[ -z "$RESP_LEN" ] || [ "$RESP_LEN" -lt 3000 ] 2>/dev/null && exit 0

# ====================================================================
# SESSION TOKEN TRACKER — cumulative counter (always updates, hints on threshold)
# Must run BEFORE per-tool hints since hint() calls exit 0
# ====================================================================
SESS_TRACKER="/tmp/claude-session-chars"
PREV=0
[ -f "$SESS_TRACKER" ] && PREV=$(cat "$SESS_TRACKER" 2>/dev/null)
TOTAL=$(( ${PREV:-0} + ${RESP_LEN:-0} )) 2>/dev/null
echo "$TOTAL" > "$SESS_TRACKER" 2>/dev/null

# IMPROVEMENT #4: GRADUATED RESPONSE COMPRESSION — 4-tier session token pressure
if [ "$TOTAL" -gt 350000 ] 2>/dev/null && [ ! -f "/tmp/claude-session-warn-350k" ]; then
  touch "/tmp/claude-session-warn-350k" 2>/dev/null
  hint "EMERGENCY: Context near limit (~$((TOTAL/1000))K chars). Single-sentence responses only. Run /compact NOW."
elif [ "$TOTAL" -gt 250000 ] 2>/dev/null && [ ! -f "/tmp/claude-session-warn-250k" ]; then
  touch "/tmp/claude-session-warn-250k" 2>/dev/null
  hint "Context pressure CRITICAL (~$((TOTAL/1000))K chars). Max 3 bullet points per response. No echoing tool output."
elif [ "$TOTAL" -gt 150000 ] 2>/dev/null && [ ! -f "/tmp/claude-session-warn-150k" ]; then
  touch "/tmp/claude-session-warn-150k" 2>/dev/null
  hint "Context pressure HIGH (~$((TOTAL/1000))K chars). Bullet points preferred. Max 150 words per response."
elif [ "$TOTAL" -gt 80000 ] 2>/dev/null && [ ! -f "/tmp/claude-session-warn-80k" ]; then
  touch "/tmp/claude-session-warn-80k" 2>/dev/null
  hint "Keep responses concise (~$((TOTAL/1000))K chars consumed). Under 300 words when possible."
fi

# Tool-specific thresholds
case "$TOOL_NAME" in
  Bash)         [ "$RESP_LEN" -gt 5000 ]  2>/dev/null && hint "Large bash output (${RESP_LEN}ch). Summarize concisely. Do not echo raw output." ;;
  Read)         [ "$RESP_LEN" -gt 8000 ]  2>/dev/null && hint "Large file (${RESP_LEN}ch). Extract relevant sections only." ;;
  Task|Agent)
    if [ "$RESP_LEN" -gt 20000 ] 2>/dev/null; then
      hint "LARGE AGENT RESULT (${RESP_LEN}ch). Extract ONLY the specific answer needed. Do not echo raw output. Summarize in 3-5 bullets max."
    elif [ "$RESP_LEN" -gt 10000 ] 2>/dev/null; then
      hint "Large subagent result (${RESP_LEN}ch). Summarize in 3-5 bullets. Do not echo raw output."
    fi
    ;;
  Grep|Glob)    [ "$RESP_LEN" -gt 5000 ]  2>/dev/null && hint "Large search result (${RESP_LEN}ch). Focus on most relevant matches." ;;
  WebFetch)     [ "$RESP_LEN" -gt 8000 ]  2>/dev/null && hint "Large web result (${RESP_LEN}ch). Extract only requested info." ;;
  WebSearch)    [ "$RESP_LEN" -gt 5000 ]  2>/dev/null && hint "Large search (${RESP_LEN}ch). Use top 2-3 results only." ;;
  mcp__plugin_*)
    if [ "$RESP_LEN" -gt 20000 ] 2>/dev/null; then
      hint "LARGE MCP RESULT (${RESP_LEN}ch from ${TOOL_NAME}). Summarize key findings only — do not echo raw output."
    elif [ "$RESP_LEN" -gt 10000 ] 2>/dev/null; then
      hint "MCP result from ${TOOL_NAME} is ${RESP_LEN}ch. Extract only relevant sections for the current task."
    elif [ "$RESP_LEN" -gt 8000 ] 2>/dev/null; then
      hint "Large MCP result (${RESP_LEN}ch). Summarize key data."
    fi
    ;;
esac

exit 0
