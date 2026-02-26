#!/usr/bin/env bash
# ConfigChange hook: audit and guard settings.json modifications.
# Logs all changes. Warns if critical hooks are removed.
# Always exits 0 (logs + warns, never blocks config changes).

set -euo pipefail

CACHE_DIR="/tmp/prism-cache"
CONFIG_LOG="$CACHE_DIR/config-changes"
SETTINGS="/c/PRISM/.claude/settings.json"

mkdir -p "$CACHE_DIR" 2>/dev/null || true

matcher="${HOOK_MATCHER:-unknown}"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Log the config change
echo "$timestamp CONFIG_CHANGE type=$matcher" >> "$CONFIG_LOG" 2>/dev/null || true

# For project_settings, verify critical hooks still present
if [[ "$matcher" == "project_settings" && -f "$SETTINGS" ]]; then
  warnings=""

  # Check for critical hook sections
  for section in "PreToolUse" "PostToolUse" "Stop" "SessionStart" "PreCompact" "PostToolUseFailure"; do
    if ! grep -q "\"$section\"" "$SETTINGS" 2>/dev/null; then
      warnings+="Missing hook section: $section. "
    fi
  done

  # Check for critical scripts
  for script in "bash-intercept.sh" "file-protect.sh" "pre-compact.sh" "error-recovery.sh"; do
    if ! grep -q "$script" "$SETTINGS" 2>/dev/null; then
      warnings+="Missing script: $script. "
    fi
  done

  if [[ -n "$warnings" ]]; then
    warn_escaped=$(echo "CONFIG WARNING: $warnings" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    echo "{\"additionalContext\": \"$warn_escaped\"}"
    exit 0
  fi
fi

echo "{}"
exit 0
