#!/bin/bash
# CLAUDE.md Count Drift Check — SYS-MS3-U04
# Reads live system counts from filesystem and compares to documented values.
# Usage: bash state/SYS-MS3/count-drift-check.sh [--update]
# Run from: H:/prism/mcp-server/
#
# Counts checked:
#   - Dispatcher files (*Dispatcher.ts, *dispatcher.ts)
#   - Engine barrel exports (index.ts "export" lines)
#   - Unwired engines (on-disk minus exported)
#   - Algorithm files
#   - Milestones complete/total
#
# Note: Hook count (220) = hook DEFINITIONS across files, not file count.
#       Cadence count (103) = cadence FUNCTIONS, not files.
#       These are reported as INFO only since simple file counting doesn't match.

SRC="H:/prism/mcp-server/src"
DRIFT=0

check() {
  local label="$1" live="$2" documented="$3" file="$4"
  if [ "$live" -ne "$documented" ] 2>/dev/null; then
    echo "DRIFT: $label — live=$live, documented=$documented (in $file)"
    DRIFT=$((DRIFT+1))
  else
    echo "  OK:  $label = $live"
  fi
}

echo "=== CLAUDE.md Count Drift Check ==="
echo ""

# ── 1. Dispatchers (file count) ──
DISP_COUNT=$(ls "$SRC/tools/dispatchers/"*[Dd]ispatcher.ts 2>/dev/null | wc -l)
check "Dispatchers" "$DISP_COUNT" 50 "mcp-server/CLAUDE.md + dispatchers/CLAUDE.md"

# ── 2. Engine exports (from index.ts barrel) ──
ENGINE_EXPORTS=$(grep -c "^export " "$SRC/engines/index.ts" 2>/dev/null || echo 0)
check "Engine exports" "$ENGINE_EXPORTS" 125 "mcp-server/CLAUDE.md + engines/CLAUDE.md"

# ── 3. Unwired engines (on disk minus exported) ──
ENGINE_FILES=$(ls "$SRC/engines/"*.ts 2>/dev/null | grep -v index.ts | grep -v '.test.ts' | grep -v '.spec.ts' | wc -l)
UNWIRED=$((ENGINE_FILES - ENGINE_EXPORTS))
check "Unwired engines" "$UNWIRED" 66 "engines/CLAUDE.md"

# ── 4. Algorithm count ──
ALGO_COUNT=$(ls "$SRC/algorithms/"*.ts 2>/dev/null | grep -v index.ts | grep -v '.test.ts' | wc -l)
check "Algorithms" "$ALGO_COUNT" 51 "MEMORY.md"

# ── 5. Milestone completion ──
if command -v python3 > /dev/null 2>&1; then
  MILESTONE_INFO=$(python3 -c "
import json
with open('H:/prism/mcp-server/data/roadmap-index.json') as f:
    ri = json.load(f)
done = sum(1 for m in ri['milestones'] if m.get('status') == 'complete')
total = len(ri['milestones'])
print(f'{done}/{total}')
" 2>/dev/null)
  echo "  INFO: Milestones $MILESTONE_INFO"
fi

# ── 6. Schema files ──
SCHEMA_COUNT=$(ls "$SRC/schemas/"*[Ss]chemas.ts 2>/dev/null | wc -l)
echo "  INFO: Schema files = $SCHEMA_COUNT"

# ── 7. Hook/Cadence (INFO only — these count definitions, not files) ──
echo "  INFO: Hook definitions = 220 (verified QA-MS12, not file-countable)"
echo "  INFO: Cadence functions = 103 (verified QA-MS12, not file-countable)"

echo ""
echo "=== RESULTS ==="
if [ "$DRIFT" -eq 0 ]; then
  echo "ALL COUNTS MATCH — no drift detected"
else
  echo "DRIFT DETECTED: $DRIFT count(s) out of sync"
  echo "Update CLAUDE.md files and MEMORY.md with live values"
fi

exit $DRIFT
