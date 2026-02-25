#!/usr/bin/env bash
# session-summary.sh — Stop hook that writes a brief session summary
# Called by: Stop hook for cross-session continuity
# Always exits 0 (never fails the stop)

PRISM_ROOT="/c/PRISM"
SUMMARY_FILE="/c/PRISM/.claude/helpers/.session-summary.md"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

COMMITS=$(cd "$PRISM_ROOT" && git log --oneline -20 --since="8 hours ago" 2>/dev/null || echo "none")

UNIT_COUNT=$(cd "$PRISM_ROOT" && git log --oneline --since="8 hours ago" 2>/dev/null | grep -c "P[0-9]*-U[0-9]*:" || echo "0")

FILES_CHANGED=$(cd "$PRISM_ROOT" && git diff --stat "HEAD~${UNIT_COUNT:-1}" 2>/dev/null | tail -1 || echo "unknown")

PHASE=$(grep "^\*\*Phase:\*\*" "$PRISM_ROOT/mcp-server/data/docs/roadmap/CURRENT_POSITION.md" 2>/dev/null | head -1 | sed 's/\*\*Phase:\*\* //' || echo "unknown")

cat > "$SUMMARY_FILE" <<EOF
# Session Summary -- ${TIMESTAMP}

## Current Phase
${PHASE}

## Work Done (last 8h)
Units completed: ${UNIT_COUNT}
${COMMITS}

## Files Changed
${FILES_CHANGED}
EOF

exit 0
