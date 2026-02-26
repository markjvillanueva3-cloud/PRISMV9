#!/usr/bin/env bash
# SubagentStop hook: collect agent completion stats.
# Logs agent type, success, and running totals.
# Always exits 0.

set -euo pipefail

CACHE_DIR="/tmp/prism-cache"
RESULTS_FILE="$CACHE_DIR/agent-results"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

agent_type="${TOOL_INPUT_subagent_type:-unknown}"
success="${TOOL_SUCCESS:-unknown}"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Log the result
echo "$timestamp $agent_type $success" >> "$RESULTS_FILE" 2>/dev/null || true

# Compute running stats
total=$(wc -l < "$RESULTS_FILE" 2>/dev/null || echo "1")
successes=$(grep -c "true" "$RESULTS_FILE" 2>/dev/null || echo "0")
if (( total > 0 )); then
  rate=$(( successes * 100 / total ))
else
  rate=0
fi

echo "{\"additionalContext\": \"Agent '$agent_type' completed ($success). Session total: $total agents, ${rate}% success rate.\"}"
exit 0
