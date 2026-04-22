#!/bin/bash
# PostToolUse hook: Auto-validate edits immediately after Write/Edit/MultiEdit
# - .json files → JSON syntax check (instant)
# - .ts files in mcp-server/src → tsc --noEmit (debounced 30s cache)
# - .sh files → bash -n syntax check (instant)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# === JSON SYNTAX CHECK ===
if echo "$FILE_PATH" | grep -qiE '\.json$'; then
  RESULT=$(python3 -c "
import json, sys
try:
    with open(sys.argv[1]) as f:
        json.load(f)
    print('OK')
except json.JSONDecodeError as e:
    print('JSON SYNTAX ERROR line %d col %d: %s' % (e.lineno, e.colno, e.msg))
except FileNotFoundError:
    print('OK')
except Exception as e:
    print('FILE ERROR: %s' % str(e)[:100])
" "$FILE_PATH" 2>/dev/null)

  if [ "$RESULT" != "OK" ] && [ -n "$RESULT" ]; then
    python3 -c "
import json, sys
msg = sys.argv[1]
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'PostToolUse',
    'additionalContext': 'AUTO-CHECK FAILED: ' + msg + ' — Fix the JSON syntax error immediately.'
  }
}))
" "$RESULT"
    exit 0
  fi
fi

# === TYPESCRIPT TYPE CHECK (debounced) ===
if echo "$FILE_PATH" | grep -qE 'mcp-server/src/.*\.ts$' && ! echo "$FILE_PATH" | grep -qE '\.(test|spec)\.ts$'; then
  CACHE_FILE="/tmp/prism-tsc-cache"

  # Invalidate cache (edit happened)
  rm -f "$CACHE_FILE" 2>/dev/null

  # Check debounce: skip if tsc ran within last 30s
  LAST_RUN_FILE="/tmp/prism-tsc-lastrun"
  if [ -f "$LAST_RUN_FILE" ]; then
    LAST_AGE=$(python3 -c "
import os, time
try:
    print(int(time.time() - os.path.getmtime('$LAST_RUN_FILE')))
except:
    print(9999)
" 2>/dev/null)
    if [ "$LAST_AGE" -lt 30 ] 2>/dev/null; then
      exit 0
    fi
  fi

  touch "$LAST_RUN_FILE" 2>/dev/null

  # Run tsc --noEmit
  TSC_OUTPUT=$(cd /c/PRISM/mcp-server && npx tsc --noEmit --pretty false 2>&1 | head -8)
  TSC_EXIT=$?

  if [ $TSC_EXIT -ne 0 ] && [ -n "$TSC_OUTPUT" ]; then
    # Count errors
    ERR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" 2>/dev/null || echo "?")
    FIRST_ERRORS=$(echo "$TSC_OUTPUT" | grep "error TS" | head -3 | tr "'" '"' | tr '\n' ' ')
    python3 -c "
import json, sys
count = sys.argv[1]
errors = sys.argv[2][:300]
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'PostToolUse',
    'additionalContext': 'TSC AUTO-CHECK: ' + count + ' type error(s) after edit. ' + errors + ' Fix before building.'
  }
}))
" "$ERR_COUNT" "$FIRST_ERRORS"
    exit 0
  else
    echo "ok" > "$CACHE_FILE" 2>/dev/null
  fi
fi

# === SHELL SCRIPT SYNTAX CHECK ===
if echo "$FILE_PATH" | grep -qE '\.(sh|bash)$'; then
  SYNTAX=$(bash -n "$FILE_PATH" 2>&1)
  if [ $? -ne 0 ] && [ -n "$SYNTAX" ]; then
    SAFE=$(echo "$SYNTAX" | head -3 | tr "'" '"')
    python3 -c "
import json, sys
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'PostToolUse',
    'additionalContext': 'SHELL SYNTAX ERROR: ' + sys.argv[1][:200] + ' — Fix the syntax error.'
  }
}))
" "$SAFE"
    exit 0
  fi
fi

# === ANTI-REGRESSION SIZE CHECK ===
# Warns (does not block) if a .ts or .md file shrank significantly after edit.
# Uses a size cache in /tmp/prism-size-cache/ to track pre-edit sizes.
# On first edit of a file, records current size for future comparison.
SIZE_CACHE_DIR="/tmp/prism-size-cache"
mkdir -p "$SIZE_CACHE_DIR" 2>/dev/null

SIZE_CHECK_NEEDED=""
SHRINK_THRESHOLD=""
if echo "$FILE_PATH" | grep -qE 'mcp-server/src/.*\.ts$'; then
  SIZE_CHECK_NEEDED="yes"
  SHRINK_THRESHOLD="25"
elif echo "$FILE_PATH" | grep -qiE '\.md$'; then
  SIZE_CHECK_NEEDED="yes"
  SHRINK_THRESHOLD="30"
fi

if [ -n "$SIZE_CHECK_NEEDED" ] && [ -f "$FILE_PATH" ]; then
  # Create a safe cache key from file path (replace slashes and colons)
  CACHE_KEY=$(echo "$FILE_PATH" | tr '/\\:' '___')
  CACHE_FILE_SIZE="$SIZE_CACHE_DIR/$CACHE_KEY"

  # Get current file size in bytes
  CURRENT_SIZE=$(wc -c < "$FILE_PATH" 2>/dev/null | tr -d ' ')

  if [ -f "$CACHE_FILE_SIZE" ]; then
    PREV_SIZE=$(cat "$CACHE_FILE_SIZE" 2>/dev/null | tr -d ' ')
    if [ -n "$PREV_SIZE" ] && [ "$PREV_SIZE" -gt 0 ] 2>/dev/null && [ -n "$CURRENT_SIZE" ] && [ "$CURRENT_SIZE" -gt 0 ] 2>/dev/null; then
      # Calculate shrinkage percentage
      SHRINK_PCT=$(python3 -c "
prev, cur, threshold = int('$PREV_SIZE'), int('$CURRENT_SIZE'), int('$SHRINK_THRESHOLD')
if prev > 0 and cur < prev:
    pct = int(100 * (prev - cur) / prev)
    if pct >= threshold:
        print(pct)
    else:
        print('')
else:
    print('')
" 2>/dev/null)

      if [ -n "$SHRINK_PCT" ]; then
        EXT=$(echo "$FILE_PATH" | grep -oE '\.[^.]+$')
        python3 -c "
import json, sys
pct = sys.argv[1]
prev = sys.argv[2]
cur = sys.argv[3]
ext = sys.argv[4]
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'PostToolUse',
    'additionalContext': 'SIZE REGRESSION WARNING: ' + ext + ' file shrank by ' + pct + '% (' + prev + ' -> ' + cur + ' bytes). This may indicate accidental content deletion. Verify the edit preserved all intended content.'
  }
}))
" "$SHRINK_PCT" "$PREV_SIZE" "$CURRENT_SIZE" "$EXT"
        # Update cache to new size (so repeated edits dont keep warning)
        echo "$CURRENT_SIZE" > "$CACHE_FILE_SIZE" 2>/dev/null
        exit 0
      fi
    fi
  fi

  # Update/create size cache for next comparison
  echo "$CURRENT_SIZE" > "$CACHE_FILE_SIZE" 2>/dev/null
fi

exit 0
