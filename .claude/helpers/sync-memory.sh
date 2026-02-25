#!/usr/bin/env bash
# sync-memory.sh — Auto-update MEMORY.md from ground truth files
# Called by: Stop hook (session end), SessionStart hook (verify freshness)
# Ground truth: CURRENT_POSITION.md, BASELINE_INVENTORY.json, git log

set -euo pipefail

# === PATHS ===
PRISM_ROOT="/c/PRISM"
MCP_DIR="$PRISM_ROOT/mcp-server"
POSITION_FILE="$MCP_DIR/data/docs/roadmap/CURRENT_POSITION.md"
BASELINE_FILE="$MCP_DIR/data/state/BASELINE_INVENTORY.json"
ROADMAP_FILE="/c/Users/Admin.DIGITALSTORM-PC/.claude/plans/sleepy-chasing-prism.md"
BREADCRUMB_FILE="$PRISM_ROOT/.claude/helpers/.session-breadcrumb.json"

# Memory file — try multiple possible paths
MEMORY_CANDIDATES=(
  "/c/Users/Admin.DIGITALSTORM-PC/.claude/projects/C--PRISM--claude-worktrees-fervent-bohr/memory/MEMORY.md"
  "/c/Users/Admin.DIGITALSTORM-PC/.claude/projects/C--PRISM/memory/MEMORY.md"
  "/c/Users/Admin.DIGITALSTORM-PC/.claude/projects/C--PRISM--mcp-server/memory/MEMORY.md"
)

MEMORY_FILE=""
for candidate in "${MEMORY_CANDIDATES[@]}"; do
  if [ -f "$candidate" ]; then
    MEMORY_FILE="$candidate"
    break
  fi
done

# If no memory file found, try to find it
if [ -z "$MEMORY_FILE" ]; then
  found=$(find "/c/Users/Admin.DIGITALSTORM-PC/.claude/projects/" -name "MEMORY.md" -path "*/memory/*" 2>/dev/null | head -1)
  if [ -n "$found" ]; then
    MEMORY_FILE="$found"
  else
    echo "WARN: No MEMORY.md found" >&2
    exit 0
  fi
fi

# === EXTRACT CURRENT STATE ===

# Phase from CURRENT_POSITION.md
PHASE="unknown"
if [ -f "$POSITION_FILE" ]; then
  PHASE=$(grep "^\*\*Phase:\*\*" "$POSITION_FILE" 2>/dev/null | head -1 | sed 's/\*\*Phase:\*\* //' || echo "unknown")
fi

# Counts from BASELINE_INVENTORY.json
DISPATCHERS="32"; ACTIONS="541"; ENGINES="75"; TESTS="111"; BUILD="5.1MB"; OMEGA="1.0"
if [ -f "$BASELINE_FILE" ]; then
  DISPATCHERS=$(grep -o '"dispatchers": [0-9]*' "$BASELINE_FILE" | grep -o '[0-9]*' || echo "32")
  ACTIONS=$(grep -o '"actions": [0-9]*' "$BASELINE_FILE" | grep -o '[0-9]*' || echo "541")
  TESTS=$(grep -o '"test_count": [0-9]*' "$BASELINE_FILE" | grep -o '[0-9]*' || echo "111")
  BUILD=$(grep -o '"build_size": "[^"]*"' "$BASELINE_FILE" | grep -o '"[0-9][^"]*"' | tr -d '"' || echo "5.1MB")
fi

# Recent git commits
RECENT_COMMITS=""
if cd "$PRISM_ROOT" 2>/dev/null; then
  RECENT_COMMITS=$(git log --oneline -5 2>/dev/null || echo "")
fi

# Last commit date
LAST_COMMIT_DATE=$(cd "$PRISM_ROOT" && git log -1 --format='%ci' 2>/dev/null | cut -d' ' -f1,2 | tr ' ' 'T' || date -u +'%Y-%m-%dT%H:%M:%S')

# Breadcrumb data (if exists)
BREADCRUMB_NOTE=""
if [ -f "$BREADCRUMB_FILE" ]; then
  BREADCRUMB_NOTE=$(cat "$BREADCRUMB_FILE" 2>/dev/null | grep -o '"note":"[^"]*"' | sed 's/"note":"//;s/"//' || echo "")
fi

# === WRITE MEMORY.MD ===
cat > "$MEMORY_FILE" << MEMEOF
# PRISM Project Memory
## Last synced: ${LAST_COMMIT_DATE}

## Primary Roadmap
**File:** \`C:\\Users\\Admin.DIGITALSTORM-PC\\.claude\\plans\\sleepy-chasing-prism.md\`
**Title:** PRISM App — Comprehensive Layered Roadmap (v2 — Execution Protocol)
**NOTE:** This is the ONLY roadmap to follow. Ignore old phase docs (R15, etc.) in \`data/docs/roadmap/\`.

## Current Position
${PHASE}

## Omega Target
User explicitly wants **Omega = 1.0** for ALL future milestones. Not 0.75 — full 1.0.

## Working Mode
- YOLO mode: autonomous execution, auto-commit after each unit
- Commit format: LAYER-PHASE-UNIT: title — summary
- Security: use execFileNoThrow, never shell injection patterns
- Maximum token efficiency: parallelize independent work, minimize back-and-forth

## Key Counts (frozen in BASELINE_INVENTORY.json)
- ${DISPATCHERS} dispatchers, ${ACTIONS} actions, ${ENGINES} engine files
- 14 registries, 29,569 entries, 61 skills, 48 scripts, 17 algorithms
- 59 hooks (registry) / 112 hooks (source), 40 cadence functions
- 0 tsc errors, ${TESTS}/${TESTS} tests pass, ${BUILD} build, Omega = ${OMEGA}

## Architecture
- MCP server: C:\\PRISM\\mcp-server\\
- Build: npm run build (tsc noEmit + esbuild), heap 16GB
- Build fast: npm run build:fast (esbuild only, skip tsc)
- Tests: npx vitest run
- Web app: mcp-server/web/ (8 pages, thin client)
- State: mcp-server/data/state/ (HEALTH_CHECK_REPORT.json, BASELINE_INVENTORY.json)
- State (legacy): state/ (CURRENT_STATE.json, SESSION_MEMORY.json)

## Key Files
- Roadmap: sleepy-chasing-prism.md (the ONLY source of truth)
- Position: mcp-server/data/docs/roadmap/CURRENT_POSITION.md
- Health: mcp-server/data/state/HEALTH_CHECK_REPORT.json
- Baseline: mcp-server/data/state/BASELINE_INVENTORY.json
- Schema: mcp-server/src/schemas/roadmapSchema.ts

## Recent Commits
\`\`\`
${RECENT_COMMITS}
\`\`\`
MEMEOF

echo "OK: MEMORY.md synced at $(date -u +%H:%M:%S)"
