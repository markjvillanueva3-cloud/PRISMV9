#!/bin/bash
# UNIFIED PreToolUse hook — handles ALL tool types in one script
# PERF: Uses bash [[ =~ ]] builtins instead of grep forks (17 forks eliminated)

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh
parse_hook_input "$INPUT"

# ====================================================================
# IMPROVEMENT #2: PATH NORMALIZATION
# Ensures /c/PRISM/foo.ts, C:/PRISM/foo.ts, C:\PRISM\foo.ts all hash the same
# ====================================================================
normalize_path() {
  local p="$1"
  # Step 1: backslash -> forward slash (tr for reliable Windows path handling)
  p=$(printf '%s' "$p" | tr "\\\\" "/")
  # Step 2: /c/ -> C:/ (MSYS-style drive letter to Windows-style)
  if [[ "$p" =~ ^/([a-zA-Z])/ ]]; then
    p="${BASH_REMATCH[1]^^}:/${p:3}"
  fi
  # Step 3: Uppercase drive letter (c:/ -> C:/)
  if [[ "$p" =~ ^([a-z]):/ ]]; then
    local drive="${BASH_REMATCH[1]}"
    p="${drive^^}:/${p:3}"
  fi
  # Step 4: Strip trailing slashes (but keep root C:/)
  while [[ "$p" =~ /$ ]] && [ "${#p}" -gt 3 ]; do
    p="${p%/}"
  done
  echo "$p"
}

# ====================================================================
# IMPROVEMENT #1 & #6: FILE FINGERPRINTING (md5) + MTIME-BASED DEDUP
# Computes md5 on first read, checks fingerprint+mtime on subsequent reads
# ====================================================================
compute_file_hash() {
  local filepath="$1"
  if command -v md5sum >/dev/null 2>&1; then
    md5sum "$filepath" 2>/dev/null | cut -d' ' -f1
  elif command -v certutil >/dev/null 2>&1; then
    certutil -hashfile "$filepath" MD5 2>/dev/null | sed -n '2p' | tr -d ' '
  else
    # Fallback: use file size + basename as pseudo-hash
    echo "$(wc -c < "$filepath" 2>/dev/null)_$(basename "$filepath")"
  fi
}

get_file_mtime() {
  local filepath="$1"
  stat -c %Y "$filepath" 2>/dev/null || stat -f %m "$filepath" 2>/dev/null || echo "0"
}

# Returns: "unchanged" if file has same md5 fingerprint, "changed" if different, "new" if no fingerprint
check_file_fingerprint() {
  local filepath="$1"
  local norm_path
  norm_path=$(normalize_path "$filepath")
  local path_hash
  path_hash=$(echo -n "$norm_path" | md5sum 2>/dev/null | cut -d' ' -f1)
  local fp_file="/tmp/claude-fingerprint-${path_hash:-nofp}"
  local mt_file="/tmp/claude-mtime-${path_hash:-nomt}"

  if [ -f "$fp_file" ]; then
    # Check mtime first (fast, no hash computation needed)
    if [ -f "$mt_file" ]; then
      local stored_mtime current_mtime
      stored_mtime=$(cat "$mt_file" 2>/dev/null)
      current_mtime=$(get_file_mtime "$filepath")
      if [ "$stored_mtime" = "$current_mtime" ] && [ -n "$stored_mtime" ] && [ "$stored_mtime" != "0" ]; then
        echo "unchanged"
        return
      fi
    fi
    # Mtime changed or unavailable — check md5 fingerprint
    local stored_hash current_hash
    stored_hash=$(cat "$fp_file" 2>/dev/null)
    current_hash=$(compute_file_hash "$filepath")
    if [ "$stored_hash" = "$current_hash" ] && [ -n "$stored_hash" ]; then
      # Update mtime tracker (mtime changed but content didn't — e.g. touch)
      get_file_mtime "$filepath" > "$mt_file" 2>/dev/null
      echo "unchanged"
      return
    fi
    echo "changed"
  else
    echo "new"
  fi
}

# Store fingerprint + mtime for a file after successful first read
store_file_fingerprint() {
  local filepath="$1"
  local norm_path
  norm_path=$(normalize_path "$filepath")
  local path_hash
  path_hash=$(echo -n "$norm_path" | md5sum 2>/dev/null | cut -d' ' -f1)
  local fp_file="/tmp/claude-fingerprint-${path_hash:-nofp}"
  local mt_file="/tmp/claude-mtime-${path_hash:-nomt}"
  compute_file_hash "$filepath" > "$fp_file" 2>/dev/null
  get_file_mtime "$filepath" > "$mt_file" 2>/dev/null
}

# ====================================================================
# BASH TOOL — all pattern matching via bash builtins (zero grep forks)
# ====================================================================
if [ "$TOOL_NAME" = "Bash" ]; then
  # --- DENY: Redirect to dedicated tools (case is fastest for prefix match) ---
  case "$COMMAND" in
    grep\ *|rg\ *|ripgrep\ *) deny "Use the Grep tool instead of bash grep/rg." ;;
    cat\ *|head\ *|tail\ *|less\ *|more\ *) deny "Use the Read tool instead of cat/head/tail." ;;
    find\ *) deny "Use the Glob tool instead of find." ;;
    curl\ *|wget\ *) deny "Use the WebFetch tool instead of curl/wget." ;;
    tree\ *) deny "Use the Glob tool with **/*.ext instead of tree." ;;
    diff\ *) deny "Use the Read tool on both files instead of diff." ;;
  esac

  # --- DENY: Compound command grep/cat bypass (cd && grep, cd && cat, etc.) ---
  [[ "$COMMAND" =~ \&\&\ *(grep|rg)\ +((-[a-zA-Z]+\ +)*[^\|]+) ]] && ! [[ "$COMMAND" =~ \|\ *(wc|sort|head|tail|cut|uniq|tr) ]] && deny "Use the Grep tool instead of bash grep/rg — even inside compound commands."
  [[ "$COMMAND" =~ \&\&\ *(cat|head|tail)\ + ]] && ! [[ "$COMMAND" =~ \|\ *(wc|sort|head|tail|grep) ]] && deny "Use the Read tool instead of cat/head/tail — even inside compound commands."

  # --- HINT: Use prism-scan.sh for pattern counting ---
  [[ "$COMMAND" =~ grep\ -r.*src/.*\|\ *wc\ -l ]] && hint "TOKEN SAVE: Use 'bash ~/.claude/hooks/lib/prism-scan.sh \"<pattern>\" [scope]' for compact PRISM pattern counts. Scopes: all, src, tests, engines, tools, hooks, detail." "PreToolUse"

  # --- HINT: Use prism-build.sh for esbuild ---
  [[ "$COMMAND" =~ esbuild\ .*--bundle ]] && hint "TOKEN SAVE: Use 'bash ~/.claude/hooks/lib/prism-build.sh' for compact PRISM build. Saves ~0.5K tokens." "PreToolUse"

  # --- DENY: Pattern-based redirects (bash regex, no forks) ---
  [[ "$COMMAND" =~ ^(sed|awk)\ .+\ [\'\"a-zA-Z/\\] ]] && deny "Use the Edit tool instead of sed/awk."
  [[ "$COMMAND" =~ (echo\ .+\ \>\>?[\ ]*[a-zA-Z/~]|printf\ .+\ \>\>?[\ ]*[a-zA-Z/~]) ]] && deny "Use the Write tool instead of echo/printf redirect."
  [[ "$COMMAND" =~ ^cat\ \<\< ]] && deny "Use the Write tool instead of cat heredoc redirect."
  [[ "$COMMAND" =~ \|\ *tee\  ]] && deny "Use the Edit/Write tool instead of tee."
  [[ "$COMMAND" =~ ^ls(\ |$) ]] && ! [[ "$COMMAND" =~ ^ls\ (-[a-zA-Z]+\ )?[/~.] ]] && deny "Use the Glob tool for directory listing."
  [[ "$COMMAND" =~ ^(node|npm|npx|python3?|tsc)\ (--version|-v|-V)$ ]] && deny "Version queries are static. Node v24+, npm 10+, Python 3.12+."
  [[ "$COMMAND" =~ ^(printenv|env\ |echo\ \$[A-Z]) ]] && deny "Environment variables are in .bashrc and session context."
  [[ "$COMMAND" =~ ^(which|type|command\ -v)\ (node|npm|npx|git|python|tsc|vitest|jest) ]] && deny "TOKEN SAVE: Standard dev tools are always available. Skip existence checks."
  [[ "$COMMAND" =~ ^sleep\  ]] && deny "TOKEN SAVE: Sleep wastes time. Use run_in_background for long tasks."
  [[ "$COMMAND" =~ ^echo\ (test|hello|hi|ok|done|working) ]] && deny "TOKEN SAVE: No need to echo test strings. Proceed with actual command."

  # --- SAFETY ---
  [[ "$COMMAND" =~ ^rm\ -(rf|fr|r)\  ]] && ! [[ "$COMMAND" =~ /tmp/ ]] && deny "SAFETY: rm -rf is destructive. Confirm with user first."
  [[ "$COMMAND" =~ ^git\ clone\  ]] && deny "SAFETY: git clone is heavy. Confirm with user first."
  [[ "$COMMAND" =~ ^git\ add\ (-A|\.)(\ |$) ]] && deny "SAFETY + TOKEN SAVE: git add -A / git add . stages everything including secrets. Stage specific files by name instead."

  # --- BLOCK: Build/test re-run guard (clean result < 60s ago) ---
  if [[ "$COMMAND" =~ ^(cd\ [^&]+&&\ )?(npx\ tsc\ --noEmit|npx\ vitest\ run) ]]; then
    BUILD_KEY=$(echo -n "$COMMAND" | md5sum 2>/dev/null | cut -d' ' -f1)
    BUILD_TRACKER="/tmp/claude-build-${BUILD_KEY:-nobuild}"
    if [ -f "$BUILD_TRACKER" ]; then
      BUILD_AGE=$(( $(date +%s) - $(stat -c %Y "$BUILD_TRACKER" 2>/dev/null || echo 0) ))
      PREV_STATUS=$(cat "$BUILD_TRACKER" 2>/dev/null)
      if [ "$BUILD_AGE" -lt 60 ] 2>/dev/null && [ "$PREV_STATUS" = "CLEAN" ]; then
        deny "TOKEN SAVE: This build/test ran clean ${BUILD_AGE}s ago. No source files changed. Skip re-run."
      fi
    fi
  fi

  # --- DEDUP: git status/diff within 30s ---
  if [[ "$COMMAND" =~ ^(git\ -C\ [^\ ]+\ )?(git\ )?(status|diff)(\ |$) ]]; then
    GIT_KEY=$(echo -n "$COMMAND" | md5sum 2>/dev/null | cut -d' ' -f1)
    GIT_TRACKER="/tmp/claude-git-${GIT_KEY:-nogit}"
    if [ -f "$GIT_TRACKER" ]; then
      GIT_AGE=$(( $(date +%s) - $(stat -c %Y "$GIT_TRACKER" 2>/dev/null || echo 0) ))
      [ "$GIT_AGE" -lt 30 ] 2>/dev/null && deny "TOKEN SAVE: This git command ran ${GIT_AGE}s ago. Use previous results."
    fi
    touch "$GIT_TRACKER" 2>/dev/null
  fi

  # --- REWRITE: Cap verbose output (including compound cd && ... forms) ---
  [[ "$COMMAND" =~ (^|&&\ *)(npm\ test|npx\ (tsc|vitest|jest)|pytest|node\ --test) ]] && ! [[ "$COMMAND" =~ \|\ *(head|tail) ]] && rewrite "$COMMAND 2>&1 | tail -30"
  [[ "$COMMAND" =~ ^npm\ run\  ]] && ! [[ "$COMMAND" =~ \|\ *(tail|head) ]] && rewrite "$COMMAND 2>&1 | tail -30"
  [[ "$COMMAND" =~ ^npm\ (install|ci) ]] && ! [[ "$COMMAND" =~ \|\ *(tail|head) ]] && rewrite "$COMMAND 2>&1 | tail -10"
  [[ "$COMMAND" =~ ^pip3?\ install ]] && ! [[ "$COMMAND" =~ \|\ *(tail|head) ]] && rewrite "$COMMAND 2>&1 | tail -5"
  [[ "$COMMAND" =~ ^git\ log ]] && ! [[ "$COMMAND" =~ (--oneline|--format|--pretty) ]] && rewrite "$COMMAND --oneline -20"
  [[ "$COMMAND" =~ ^git\ diff ]] && ! [[ "$COMMAND" =~ (--stat|--name-only|\|) ]] && rewrite "$COMMAND --stat"
  [[ "$COMMAND" =~ ^git\ show ]] && ! [[ "$COMMAND" =~ (--stat|--name-only|--format|--pretty|\|) ]] && rewrite "$COMMAND --stat"
  [[ "$COMMAND" =~ ^git\ status.*-uall ]] && rewrite "${COMMAND//-uall/}"
  [[ "$COMMAND" =~ ^sqlite3\  ]] && ! [[ "$COMMAND" =~ \|\ *(head|tail|wc) ]] && rewrite "$COMMAND | head -50"
  [[ "$COMMAND" =~ ^docker\ logs ]] && ! [[ "$COMMAND" =~ \|\ *(head|tail) ]] && rewrite "$COMMAND | tail -30"

  # --- REWRITE: wc -l on large dirs (add head cap) ---
  [[ "$COMMAND" =~ ^wc\ -l ]] && [[ "$COMMAND" =~ \*\. ]] && ! [[ "$COMMAND" =~ \|\ *(head|tail) ]] && rewrite "$COMMAND | tail -20"

  # --- REWRITE: npm ls (huge output) ---
  [[ "$COMMAND" =~ ^npm\ ls ]] && ! [[ "$COMMAND" =~ (--depth|--json|\|) ]] && rewrite "$COMMAND --depth=0"

  # --- REWRITE: npm audit (huge output) ---
  [[ "$COMMAND" =~ ^npm\ audit ]] && ! [[ "$COMMAND" =~ \| ]] && rewrite "$COMMAND 2>&1 | head -30"

  # --- REWRITE: du without pipe (can be massive) ---
  [[ "$COMMAND" =~ ^du\  ]] && ! [[ "$COMMAND" =~ \|\ *(head|tail|sort) ]] && rewrite "$COMMAND | sort -rh | head -20"

  # --- HINT: ps aux without grep filter ---
  # --- REWRITE: ps aux without grep filter -> cap output (CCM-MS13: warn->autofix) ---
  [[ "$COMMAND" =~ ^ps\ (aux|ef) ]] && ! [[ "$COMMAND" =~ \|\ *grep ]] && auto_cap_output "$COMMAND" 20

  # --- DENY: Repeated npm/pip install within 120s ---
  if [[ "$COMMAND" =~ ^(npm\ (install|ci)|pip3?\ install) ]]; then
    INSTALL_KEY=$(echo -n "$COMMAND" | md5sum 2>/dev/null | cut -d' ' -f1)
    INSTALL_TRACKER="/tmp/claude-install-${INSTALL_KEY:-noinstall}"
    if [ -f "$INSTALL_TRACKER" ]; then
      INSTALL_AGE=$(( $(date +%s) - $(stat -c %Y "$INSTALL_TRACKER" 2>/dev/null || echo 0) ))
      [ "$INSTALL_AGE" -lt 120 ] 2>/dev/null && deny "TOKEN SAVE: This install command ran ${INSTALL_AGE}s ago. Dependencies are already installed."
    fi
    touch "$INSTALL_TRACKER" 2>/dev/null
  fi

  exit 0
fi

# ====================================================================
# TOOLSEARCH — block redundant select: loads (tool already available)
# ====================================================================
if [ "$TOOL_NAME" = "ToolSearch" ]; then
  if [[ "$QUERY" == select:* ]]; then
    TOOLS="${QUERY#select:}"
    LOADED_FILE="/tmp/claude-tools-loaded"
    ALL_LOADED=1
    IFS=',' read -ra TOOL_LIST <<< "$TOOLS"
    for t in "${TOOL_LIST[@]}"; do
      t=$(echo "$t" | tr -d ' ')
      [ -z "$t" ] && continue
      grep -qxF "$t" "$LOADED_FILE" 2>/dev/null || { ALL_LOADED=0; break; }
    done
    if [ "$ALL_LOADED" -eq 1 ] && [ ${#TOOL_LIST[@]} -gt 0 ]; then
      deny "TOKEN SAVE: Tool(s) '${TOOLS}' already loaded this session. Call them directly."
    fi
    # Track tools as loaded for future dedup
    for t in "${TOOL_LIST[@]}"; do
      t=$(echo "$t" | tr -d ' ')
      [ -n "$t" ] && echo "$t" >> "$LOADED_FILE" 2>/dev/null
    done
  fi
  exit 0
fi

# ====================================================================
# READ TOOL
# ====================================================================
if [ "$TOOL_NAME" = "Read" ]; then
  # --- IMPROVEMENT #2: Normalize path for consistent dedup hashing ---
  NORM_FILE_PATH=$(normalize_path "$FILE_PATH")
  FP_LOWER="${NORM_FILE_PATH,,}"
  FP_LOWER="${FP_LOWER//\\//}"
  case "$FP_LOWER" in
    *node_modules/*) deny "Reading node_modules wastes tokens. Use Grep to search within." ;;
    */dist/*) deny "Reading dist/ files wastes tokens. These are build artifacts." ;;
    */.git/objects/*) deny "Reading .git/objects wastes tokens." ;;
    *package-lock.json|*yarn.lock|*pnpm-lock.yaml) deny "Reading lock files wastes tokens." ;;
    *.min.js|*.min.css) deny "Reading minified files wastes tokens." ;;
    *.map) deny "Reading .map files wastes tokens." ;;
    *.env|*.env.*) deny "SECURITY: .env files contain secrets. Never read credentials into context." ;;
    *CHANGELOG*|*HISTORY*|*CHANGES.md|*CHANGES.txt) deny "TOKEN SAVE: CHANGELOG files are 5-50K+ tokens. Use Grep for specific version entries instead." ;;
    *.generated.*|*.g.ts|*_generated*|*.d.ts) deny "TOKEN SAVE: Generated/declaration file — read the source file instead." ;;
  esac

  # --- IMPROVEMENT #7: Archive/extracted directory redirect ---
  case "$FP_LOWER" in
    */archives/*|*/extracted_modules/*|*/extracted/*)
      hint "This is an archive/extracted directory. Current code is in mcp-server/src/. Read PROJECT_WIDE_DIGEST.md for navigation." "PreToolUse"
      ;;
  esac

  # --- IMPROVEMENT #3: AUTO-INJECT READ LIMIT for large files ---
  # Exception: .json files need full read to be valid, so skip auto-limit for them
  if [ "$HAS_LIMIT" -eq 0 ] && [ -f "$FILE_PATH" ]; then
    SIZE=$(wc -c < "$FILE_PATH" 2>/dev/null | tr -d ' ')
    IS_JSON=0
    [[ "$FP_LOWER" == *.json ]] && IS_JSON=1
    # Auto-inject limit for large non-JSON files (>100KB -> 100 lines, >50KB -> 200 lines)
    if [ "$IS_JSON" -eq 0 ] && [ "${SIZE:-0}" -gt 100000 ] 2>/dev/null; then
      rewrite_input "{\"limit\": 100}"
    elif [ "$IS_JSON" -eq 0 ] && [ "${SIZE:-0}" -gt 50000 ] 2>/dev/null; then
      rewrite_input "{\"limit\": 200}"
    fi
    # Existing PRISM source tighter threshold (15KB) — hint only (no auto-limit injection)
    if [[ "$FP_LOWER" == *mcp-server/src/*.ts ]] || [[ "$FP_LOWER" == *mcp-server/src/*.tsx ]]; then
      [ "${SIZE:-0}" -gt 15000 ] 2>/dev/null && hint "TOKEN SAVE: PRISM source file is $((SIZE/1024))KB ($((SIZE/80)) lines est). Use Grep for specific functions or offset/limit to read sections." "PreToolUse"
    fi
  fi

  # --- WARN: Reading files already in system context ---
  case "$FP_LOWER" in
    */memory/memory.md)
      deny "TOKEN SAVE: MEMORY.md is automatically loaded into context. You already have it — only read if you need to Edit it."
      ;;
    *claude.md)
      deny "TOKEN SAVE: CLAUDE.md is already loaded as system instructions. You have it in context — only read if you need to edit."
      ;;
  esac

  # --- WARN: Reading test files for API understanding ---
  case "$FP_LOWER" in
    *__tests__/*.test.ts|*__tests__/*.spec.ts)
      hint "TOKEN SAVE: Reading test file for API? Use Grep on the engine source for method signatures, or contextDigestEngine.digestFile(). Tests cost 2-5K tokens." "PreToolUse"
      ;;
  esac

  # --- WARN: Reading large catalog/data files without limit ---
  if [ "$HAS_LIMIT" -eq 0 ]; then
    case "$FP_LOWER" in
      *catalog*.ts|*-catalog.ts|*_catalog.ts)
        deny "TOKEN SAVE: Catalog files are 5-50K+ tokens. Use Grep for specific entries or add offset/limit."
        ;;
    esac
  fi

  # --- BLOCK: Read-after-Edit/Write (you already know the content) ---
  # Uses normalized path for consistent hashing (IMPROVEMENT #2)
  if [ -n "$FILE_PATH" ]; then
    EDIT_HASH=$(echo -n "$NORM_FILE_PATH" | md5sum 2>/dev/null | cut -d' ' -f1)
    EDIT_TRACKER="/tmp/claude-edited-${EDIT_HASH:-noedit}"
    if [ -f "$EDIT_TRACKER" ]; then
      EDIT_AGE=$(( $(date +%s) - $(stat -c %Y "$EDIT_TRACKER" 2>/dev/null || echo 0) ))
      if [ "$EDIT_AGE" -lt 60 ] 2>/dev/null; then
        deny "TOKEN SAVE: This file was written/edited ${EDIT_AGE}s ago. You already know its content from the edit. Use that knowledge instead of re-reading."
      fi
    fi
  fi

  # --- IMPROVEMENT #1 & #6: Fingerprint + mtime dedup (extends beyond 120s TTL) ---
  # Uses normalized path for consistent hashing (IMPROVEMENT #2)
  if [ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
    HASH=$(echo -n "$NORM_FILE_PATH" | md5sum 2>/dev/null | cut -d' ' -f1)
    TRACKER="/tmp/claude-read-${HASH:-nofile}"
    COUNT_FILE="${TRACKER}.cnt"
    if [ -f "$TRACKER" ]; then
      AGE=$(( $(date +%s) - $(stat -c %Y "$TRACKER" 2>/dev/null || echo 0) ))
      if [ "$AGE" -lt 120 ] 2>/dev/null; then
        # Within TTL window — use existing count-based dedup
        COUNT=1
        [ -f "$COUNT_FILE" ] && COUNT=$(cat "$COUNT_FILE" 2>/dev/null)
        COUNT=$((COUNT + 1))
        echo "$COUNT" > "$COUNT_FILE" 2>/dev/null
        if [ "$COUNT" -ge 3 ]; then
          deny "TOKEN SAVE: File read $COUNT times in ${AGE}s. You already have this content. Use Grep for specific sections or Edit with known content."
        fi
        deny "TOKEN SAVE: This file was read ${AGE}s ago. Use previous content or Grep for specific sections."
      else
        # Beyond 120s TTL — check fingerprint + mtime (IMPROVEMENT #1 & #6)
        FP_STATUS=$(check_file_fingerprint "$FILE_PATH")
        if [ "$FP_STATUS" = "unchanged" ]; then
          deny "File unchanged since last read (fingerprint match). Use previous content or Grep for specific sections."
        fi
        # File changed — allow read, reset count, update fingerprint below
        echo "1" > "$COUNT_FILE" 2>/dev/null
      fi
    else
      echo "1" > "$COUNT_FILE" 2>/dev/null
    fi
    touch "$TRACKER" 2>/dev/null
    # Store/update fingerprint after allowing the read (IMPROVEMENT #1)
    store_file_fingerprint "$FILE_PATH"
  fi
  exit 0
fi

# ====================================================================
# GREP TOOL
# ====================================================================
if [ "$TOOL_NAME" = "Grep" ]; then
  # --- HINT: Use digest system for PRISM file discovery ---
  # --- AUTO-REDIRECT: Grep for Engine/Dispatcher in source dirs -> deny + point to digests (CCM-MS13: warn->autofix) ---
  [[ "$PATTERN" =~ (Engine|Dispatcher|Algorithm) ]] && [[ "${TOOL_PATH:-}" =~ (src/engines|src/tools|src/algorithms) ]] && deny "Use '/navigate <topic>' or '/code-index <shortcode>' for zero-IO file location. ENGINE_DIGEST.md has 1000+ engines with 1-line descriptions. Direct Grep wastes tokens."
  # --- BLOCK: Grep with overly broad pattern ---
  case "$PATTERN" in
    "."|".*"|".+") deny "TOKEN SAVE: Grep pattern '$PATTERN' matches everything. Use a specific pattern." ;;
  esac

  # --- WARN: Grep on a file you just Read (content already available) ---
  # Uses normalized path for consistent cross-reference with Read tracker (IMPROVEMENT #2)
  if [ -n "$TOOL_PATH" ] && [ -f "$TOOL_PATH" ]; then
    NORM_TOOL_PATH=$(normalize_path "$TOOL_PATH")
    READ_HASH=$(echo -n "$NORM_TOOL_PATH" | md5sum 2>/dev/null | cut -d' ' -f1)
    READ_TRACKER="/tmp/claude-read-${READ_HASH:-nofile}"
    if [ -f "$READ_TRACKER" ]; then
      READ_AGE=$(( $(date +%s) - $(stat -c %Y "$READ_TRACKER" 2>/dev/null || echo 0) ))
      [ "$READ_AGE" -lt 90 ] 2>/dev/null && hint "TOKEN SAVE: You Read this file ${READ_AGE}s ago. Search the content you already have instead of re-fetching via Grep." "PreToolUse"
    fi
  fi

  # --- AUTO-SCOPE: Grep content-mode without path restriction -> auto-add PRISM src/ (CCM-MS13: warn->autofix) ---
  if [ "$OUTPUT_MODE" = "content" ] && [ -z "$TOOL_PATH" ]; then
    auto_scope_grep "$PATTERN"
  fi

  # --- Grep dedup FIRST (higher priority than head_limit hints) ---
  GREP_KEY="${PATTERN}|${TOOL_PATH}"
  HASH=$(echo -n "$GREP_KEY" | md5sum 2>/dev/null | cut -d' ' -f1)
  TRACKER="/tmp/claude-grep-${HASH:-nogrep}"
  if [ -f "$TRACKER" ]; then
    AGE=$(( $(date +%s) - $(stat -c %Y "$TRACKER" 2>/dev/null || echo 0) ))
    [ "$AGE" -lt 60 ] 2>/dev/null && deny "TOKEN SAVE: This exact Grep pattern was run ${AGE}s ago. Use previous results."
  fi
  touch "$TRACKER" 2>/dev/null

  # --- Auto-cap: inject head_limit on content mode (REWRITE saves unbounded output) ---
  [ "$OUTPUT_MODE" = "content" ] && [ "$HAS_LIMIT" -eq 0 ] && rewrite_input '{"head_limit": 50}'
  # --- AUTO-CAP: files_with_matches without head_limit -> inject head_limit:30 (CCM-MS13: warn->autofix) ---
  [ "$OUTPUT_MODE" = "files_with_matches" ] && [ "$HAS_LIMIT" -eq 0 ] && rewrite_input '{"head_limit": 30}'

  exit 0
fi

# ====================================================================
# GLOB TOOL
# ====================================================================
if [ "$TOOL_NAME" = "Glob" ]; then
  case "$PATTERN" in
    "**/*"|"**"|"*") [ "$HAS_PATH" -eq 0 ] && deny "Pattern \"$PATTERN\" without a path matches everything. Add a path or extension filter." ;;
  esac

  # --- Glob rapid-fire throttle (3+ calls within 30s on same path = warn) ---
  GLOB_PATH_KEY="${TOOL_PATH:-cwd}"
  GLOB_PATH_HASH=$(echo -n "$GLOB_PATH_KEY" | md5sum 2>/dev/null | cut -d' ' -f1)
  GLOB_BURST="/tmp/claude-glob-burst-${GLOB_PATH_HASH:-noburst}"
  GLOB_BURST_CNT="${GLOB_BURST}.cnt"
  if [ -f "$GLOB_BURST" ]; then
    BURST_AGE=$(( $(date +%s) - $(stat -c %Y "$GLOB_BURST" 2>/dev/null || echo 0) ))
    if [ "$BURST_AGE" -lt 30 ] 2>/dev/null; then
      BCNT=1; [ -f "$GLOB_BURST_CNT" ] && BCNT=$(cat "$GLOB_BURST_CNT" 2>/dev/null)
      BCNT=$((BCNT + 1)); echo "$BCNT" > "$GLOB_BURST_CNT" 2>/dev/null
      [ "$BCNT" -ge 3 ] && hint "TOKEN SAVE: ${BCNT} Glob calls on '${GLOB_PATH_KEY}' in ${BURST_AGE}s. Consider combining patterns with brace expansion (e.g., **/*.{ts,tsx,js}) or using a single broader pattern." "PreToolUse"
    else
      echo "1" > "$GLOB_BURST_CNT" 2>/dev/null
    fi
  else
    echo "1" > "$GLOB_BURST_CNT" 2>/dev/null
  fi
  touch "$GLOB_BURST" 2>/dev/null

  # --- HINT: Use digest system for PRISM engine/dispatcher exploration ---
  # --- AUTO-REDIRECT: Glob for engines/dispatchers -> deny + point to digests (CCM-MS13: warn->autofix) ---
  [[ "$PATTERN" =~ (engines|dispatchers|algorithms) ]] && deny "Use '/navigate <topic>' for zero-IO file location, or read ENGINE_DIGEST.md / DISPATCHER_DIGEST.md for full listings. '/code-index E0001' resolves shortcodes. Glob on engine dirs wastes tokens."

  # --- IMPROVEMENT #7: Project-wide digest redirect for non-core dirs ---
  GLOB_PATH_LOWER="${TOOL_PATH,,}"
  GLOB_PATH_LOWER="${GLOB_PATH_LOWER//\\//}"
  case "$GLOB_PATH_LOWER" in
    *prism/web/*|*prism/web)
      hint "See DIRECTORY_DIGEST.md for directory overview of web/. Use Grep for specific content." "PreToolUse" ;;
    *prism/scripts/*|*prism/scripts)
      hint "See DIRECTORY_DIGEST.md for directory overview of scripts/. Use Grep for specific content." "PreToolUse" ;;
    *prism/data/*|*prism/data)
      hint "See DIRECTORY_DIGEST.md for directory overview of data/. Use Grep for specific content." "PreToolUse" ;;
    *prism/registries/*|*prism/registries)
      hint "See DIRECTORY_DIGEST.md for directory overview of registries/. Use Grep for specific content." "PreToolUse" ;;
    *prism/archives/*|*prism/extracted_modules/*|*prism/extracted/*)
      hint "This is an archive/extracted directory. Current code is in mcp-server/src/. Read DIRECTORY_DIGEST.md for navigation." "PreToolUse" ;;
  esac

  # --- Glob dedup (warn if same pattern+path within 60s) ---
  GLOB_KEY="${PATTERN}|${TOOL_PATH}"
  HASH=$(echo -n "$GLOB_KEY" | md5sum 2>/dev/null | cut -d' ' -f1)
  TRACKER="/tmp/claude-glob-${HASH:-noglob}"
  if [ -f "$TRACKER" ]; then
    AGE=$(( $(date +%s) - $(stat -c %Y "$TRACKER" 2>/dev/null || echo 0) ))
    [ "$AGE" -lt 60 ] 2>/dev/null && deny "TOKEN SAVE: This exact Glob pattern was run ${AGE}s ago. Use previous results."
  fi
  touch "$TRACKER" 2>/dev/null
  exit 0
fi

# ====================================================================
# WEBSEARCH — duplicate detection
# ====================================================================
if [ "$TOOL_NAME" = "WebSearch" ] && [ -n "$QUERY" ]; then
  # --- BLOCK: WebSearch for things PRISM can calculate ---
  QUERY_LOWER="${QUERY,,}"
  if [[ "$QUERY_LOWER" =~ (speed and feed|sfm|rpm|chipload|feed rate|cutting speed|machining param).*(aluminum|steel|titanium|stainless|brass|copper|inconel|plastic|wood) ]] || \
     [[ "$QUERY_LOWER" =~ (aluminum|steel|titanium|stainless|brass|copper|inconel).*(speed|feed|sfm|rpm|chipload|cutting param) ]]; then
    deny "TOKEN SAVE: PRISM has engines for speed/feed calculations. Use /calc, /defaults, or /process-calc instead of web searching (~1500 tokens saved)."
  fi
  # --- BLOCK: WebSearch for G-code syntax ---
  if [[ "$QUERY_LOWER" =~ (g-?code|g[0-9]{1,2}).*(syntax|meaning|what does|command|reference) ]] || \
     [[ "$QUERY_LOWER" =~ (what (is|does)|meaning of).*(g[0-9]{1,2}|m[0-9]{1,2}) ]]; then
    deny "TOKEN SAVE: Use /gcode for G-code snippets or PRISM's KNOWLEDGE_BASE for G-code reference (~1500 tokens saved)."
  fi

  HASH=$(echo -n "$QUERY" | md5sum 2>/dev/null | cut -d' ' -f1)
  TRACKER="/tmp/claude-ws-${HASH}"
  if [ -f "$TRACKER" ]; then
    AGE=$(( $(date +%s) - $(stat -c %Y "$TRACKER" 2>/dev/null || echo 0) ))
    [ "$AGE" -lt 60 ] 2>/dev/null && deny "This exact search was just performed. Use the previous results."
  fi
  touch "$TRACKER" 2>/dev/null
  exit 0
fi

# ====================================================================
# WEBFETCH — duplicate URL detection (mirrors WebSearch dedup)
# ====================================================================
if [ "$TOOL_NAME" = "WebFetch" ]; then
  # WebFetch has url param, not file_path — extract from raw input
  URL=$(python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('tool_input',{}).get('url',''))" <<< "$INPUT" 2>/dev/null)
  # --- AUTO-REDIRECT: WebFetch for documentation sites -> deny + redirect to context7 MCP (CCM-MS13: warn->autofix) ---
  if [ -n "$URL" ]; then
    auto_fix_webfetch_to_context7 "$URL"
  fi

  if [ -n "$URL" ]; then
    HASH=$(echo -n "$URL" | md5sum 2>/dev/null | cut -d' ' -f1)
    TRACKER="/tmp/claude-wf-${HASH}"
    if [ -f "$TRACKER" ]; then
      AGE=$(( $(date +%s) - $(stat -c %Y "$TRACKER" 2>/dev/null || echo 0) ))
      [ "$AGE" -lt 120 ] 2>/dev/null && deny "TOKEN SAVE: This URL was fetched ${AGE}s ago. WebFetch has a 15-min cache — use previous results."
    fi
    touch "$TRACKER" 2>/dev/null
  fi
  exit 0
fi

# ====================================================================
# AGENT TOOL — guardrail against overuse for simple queries
# ====================================================================
if [ "$TOOL_NAME" = "Agent" ]; then
  # Extract the prompt/query from Agent input
  AGENT_PROMPT=$(python3 -c "
import json,sys
d=json.load(sys.stdin)
ti=d.get('tool_input',{})
p=ti.get('prompt','') or ti.get('query','') or ti.get('task','') or ''
print(p[:200])
" <<< "$INPUT" 2>/dev/null)

  # Short prompts that look like simple searches → warn
  PROMPT_LEN=${#AGENT_PROMPT}
  if [ "$PROMPT_LEN" -gt 0 ] && [ "$PROMPT_LEN" -lt 80 ]; then
    # Check if it's a simple find/search/lookup pattern
    AGENT_LOWER="${AGENT_PROMPT,,}"
    if [[ "$AGENT_LOWER" =~ ^(find|search|look|locate|where|what|list|show|get|check|count) ]] && ! [[ "$AGENT_LOWER" =~ (and|then|also|across|multiple|all|every|each|compare|analyze|refactor) ]]; then
      deny "Short query to Agent ('${AGENT_PROMPT:0:60}...'). Use Glob/Grep/Read directly. Agent spawns a sub-conversation costing 2-5x more tokens."
    fi
  fi

  # --- Agent dedup (same prompt within 120s) ---
  if [ -n "$AGENT_PROMPT" ]; then
    AGENT_HASH=$(echo -n "$AGENT_PROMPT" | md5sum 2>/dev/null | cut -d' ' -f1)
    AGENT_TRACKER="/tmp/claude-agent-${AGENT_HASH:-noagent}"
    if [ -f "$AGENT_TRACKER" ]; then
      AGENT_AGE=$(( $(date +%s) - $(stat -c %Y "$AGENT_TRACKER" 2>/dev/null || echo 0) ))
      [ "$AGENT_AGE" -lt 120 ] 2>/dev/null && deny "TOKEN SAVE: This exact Agent query ran ${AGENT_AGE}s ago. Use the previous results."
    fi
    touch "$AGENT_TRACKER" 2>/dev/null
  fi
  exit 0
fi

# ====================================================================
# WRITE / EDIT — PRISM guards + file routing (prevent C: drive scatter)
# ORDER: safety-chain > material-db > scatter-router (first match exits via hint)
# ====================================================================
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  if [ -n "$FILE_PATH" ]; then
    FP_NORM="${FILE_PATH//\\//}"
    FP_BASENAME=$(basename "$FP_NORM" 2>/dev/null)

    # --- WARN: Multiple rapid edits to same file ---
    if [ "$TOOL_NAME" = "Edit" ]; then
      EDIT_BURST_HASH=$(echo -n "$FILE_PATH" | md5sum 2>/dev/null | cut -d' ' -f1)
      EDIT_BURST="/tmp/claude-edit-burst-${EDIT_BURST_HASH:-noedit}"
      EDIT_BURST_CNT="${EDIT_BURST}.cnt"
      if [ -f "$EDIT_BURST" ]; then
        EB_AGE=$(( $(date +%s) - $(stat -c %Y "$EDIT_BURST" 2>/dev/null || echo 0) ))
        if [ "$EB_AGE" -lt 60 ] 2>/dev/null; then
          EBCNT=1; [ -f "$EDIT_BURST_CNT" ] && EBCNT=$(cat "$EDIT_BURST_CNT" 2>/dev/null)
          EBCNT=$((EBCNT + 1)); echo "$EBCNT" > "$EDIT_BURST_CNT" 2>/dev/null
          [ "$EBCNT" -ge 5 ] && deny "TOKEN SAVE: ${EBCNT} edits to same file in ${EB_AGE}s. Combine remaining changes into a single larger Edit call."
          [ "$EBCNT" -ge 3 ] && hint "TOKEN SAVE: ${EBCNT} edits to same file in ${EB_AGE}s. Consider combining changes into a single larger Edit." "PreToolUse"
        else
          echo "1" > "$EDIT_BURST_CNT" 2>/dev/null
        fi
      else
        echo "1" > "$EDIT_BURST_CNT" 2>/dev/null
      fi
      touch "$EDIT_BURST" 2>/dev/null
    fi

    # --- BLOCK: Write to .env files (secrets protection) ---
    case "$FP_BASENAME" in
      .env|.env.*)
        deny "SECURITY: .env files contain secrets. Never write credentials via Edit/Write." ;;
    esac

    # --- BLOCK: Write to build artifacts ---
    case "$FP_BASENAME" in
      *.min.js|*.min.css|*.map|*.d.ts)
        deny "TOKEN SAVE: Writing to build artifact ($FP_BASENAME). Edit the source file instead." ;;
    esac
    case "$FP_NORM" in
      */dist/*|*/build/*|*/node_modules/*)
        deny "TOKEN SAVE: Writing to build/vendor directory. Edit source files instead." ;;
    esac

    # --- PRISM safety-critical file guard ---
    case "$FP_BASENAME" in
      safetyDispatcher.ts|safetyCalcSchema.ts|crossFieldPhysics.ts|PrismError.ts|coolantValidationTools.ts)
        hint "SAFETY-CRITICAL FILE: $FP_BASENAME has hard-won safety fixes. Verify changes preserve: binary APPROVED/BLOCKED (no WARNING zone), hard block on missing force/tool-life, 0.0 partial credit for missing data, MQL unit fix (flowRate*60000), dry titanium fire safety block, SafetyBlockError re-throw." "PreToolUse"
        ;;
    esac

    # --- PRISM material database guard ---
    case "$FP_BASENAME" in
      alloy_physical_properties_db.py|alloy_compositions_db.py|materials_deep_accuracy_v2.py)
        hint "MATERIAL DB GUARD: $FP_BASENAME — Accuracy: 83.5% composition (5302/6346), 100% metals (5089/5089), 39 matching strategies, 700+ compositions. Run materials_deep_accuracy_v2.py after changes to verify no regression." "PreToolUse"
        ;;
    esac

    IS_SCATTER=0
    case "$FP_NORM" in
      [Cc]:/PRISM/*|/[Cc]/PRISM/*) ;;
      [Cc]:/Users/*/.claude/*|/[Cc]/Users/*/.claude/*) ;;
      [Cc]:/tmp/*|/tmp/*|/[Cc]/tmp/*) ;;
      [Cc]:/Windows/*|/[Cc]/Windows/*) ;;
      [Cc]:/*|/[Cc]/*) IS_SCATTER=1 ;;
    esac

    if [ "$IS_SCATTER" -eq 1 ]; then
      export _ROUTER_PATH="$FP_NORM"
      SUGGESTION=$(python3 << 'ROUTEREOF' 2>/dev/null
import os, re
fp = os.environ.get("_ROUTER_PATH", "")
name = os.path.basename(fp).lower()
rules = [
    (r'.*dispatcher\.ts$', 'mcp-server/src/tools/dispatchers/'),
    (r'.*engine\.ts$', 'mcp-server/src/engines/'),
    (r'.*hooks?\.ts$', 'mcp-server/src/hooks/'),
    (r'.*schema.*\.ts$', 'mcp-server/src/schemas/'),
    (r'.*\.test\.ts$', 'mcp-server/src/__tests__/'),
    (r'.*valid(at|ion).*\.ts$', 'mcp-server/src/validation/'),
    (r'.*tools?\.ts$', 'mcp-server/src/tools/'),
    (r'.*(types?|interface)\.ts$', 'mcp-server/src/types/'),
    (r'.*utils?\.ts$', 'mcp-server/src/utils/'),
    (r'.*registry.*\.json$', 'registries/'),
    (r'.*hierarchy.*\.json$', 'registries/'),
    (r'.*manifest.*\.json$', 'registries/'),
    (r'.*wiring.*\.json$', 'registries/'),
    (r'skill\.md$', 'skills-consolidated/<skill-name>/'),
    (r'.*(state|checkpoint).*\.json$', 'state/'),
    (r'.*snapshot.*\.json$', 'state/snapshots/'),
    (r'.*schema.*\.json$', 'schemas/'),
    (r'(readme|architecture|design|protocol|roadmap|development).*\.md$', 'docs/'),
    (r'audit.*\.(md|json)$', 'audits/'),
    (r'.*(material|cutting|toolpath|spindle|coolant|thread|workhold|machining|fixture|grind).*\.ts$', 'mcp-server/src/'),
    (r'.*(omega|safety|ralph|cadence|telemetry|prism|manus|atcs).*\.(ts|json)$', 'mcp-server/src/'),
    (r'.*(config|settings).*\.(json|yaml|yml|toml)$', 'config/'),
    (r'.*\.(sh|bash)$', 'scripts/'),
]
for pattern, dest in rules:
    if re.match(pattern, name):
        print(f"PRISM ROUTER: '{os.path.basename(fp)}' may belong in C:/PRISM/{dest}")
        break
ROUTEREOF
      )
      unset _ROUTER_PATH
      [ -n "$SUGGESTION" ] && hint "$SUGGESTION" "PreToolUse"
    fi
  fi
  exit 0
fi

# ====================================================================
# AUTO-FEATURE RECOMMENDATIONS (debounced 60s)
# ====================================================================
AUTO_FEATURE_TS="/tmp/prism-auto-feature-ts"
NOW=$(date +%s)
LAST_CHECK=0
[ -f "$AUTO_FEATURE_TS" ] && LAST_CHECK=$(< "$AUTO_FEATURE_TS")
if [ $((NOW - LAST_CHECK)) -ge 60 ]; then
  echo "$NOW" > "$AUTO_FEATURE_TS"
  RECS=$(python3 "$HOME/.claude/hooks/lib/auto_feature_selector.py" 2>/dev/null)
  if [ -n "$RECS" ] && [ "$RECS" != "[]" ]; then
    HIGH=$(echo "$RECS" | python3 -c "import sys,json; recs=json.load(sys.stdin); high=[r for r in recs if r.get('priority')=='high']; print('; '.join(r['action'] for r in high))" 2>/dev/null)
    if [ -n "$HIGH" ]; then
      hint "Auto-feature: $HIGH" "PreToolUse"
    fi
  fi
fi

exit 0
