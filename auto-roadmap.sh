#!/bin/bash
##############################################################################
# auto-roadmap.sh — Autonomous PRISM Roadmap Execution Loop
#
# Runs Claude Code in a loop, auto-continuing after each context fill.
# Each iteration: hooks load HANDOFF → Claude works → context fills → exits → loop restarts
#
# Usage:
#   bash auto-roadmap.sh                    # Default: continue roadmap
#   bash auto-roadmap.sh --budget 20        # Set per-iteration budget ($20)
#   bash auto-roadmap.sh --max-iterations 5 # Limit total iterations
#   bash auto-roadmap.sh --fresh            # Don't --continue, start fresh each time
#
# Stop: Ctrl+C or create H:/prism/state/STOP_ROADMAP file
##############################################################################

set -euo pipefail

# ── Configuration ──
BUDGET_PER_ITERATION="${BUDGET:-50}"
MAX_ITERATIONS="${MAX_ITER:-999}"
PAUSE_SECONDS="${PAUSE:-3}"
PRISM_DIR="H:/prism"
STOP_FILE="$PRISM_DIR/state/STOP_ROADMAP"
LOG_DIR="$PRISM_DIR/state/auto-roadmap-logs"
USE_CONTINUE=true

PROMPT="You are auto-continuing the PRISM unified roadmap. Execute this protocol:
1. Read H:/prism/state/HANDOFF.md — find and execute the RESUME directive
2. If RESUME is generic (e.g. 'compacting'), read the shared task queue: H:/prism/state/shared/TASK_QUEUE.md
3. Claim the next available Claude-family task and execute it following the v24 4-LOOP protocol
4. At natural compaction points (every 2-3 units), write HANDOFF.md with a clear RESUME line and stop
5. Follow /effort max. Run /prism-review before completing each unit. Fix ALL findings.
Do NOT ask the user anything. Work autonomously. If blocked, document the blocker in HANDOFF.md and stop."

# ── Parse args ──
while [[ $# -gt 0 ]]; do
  case "$1" in
    --budget) BUDGET_PER_ITERATION="$2"; shift 2 ;;
    --max-iterations) MAX_ITERATIONS="$2"; shift 2 ;;
    --pause) PAUSE_SECONDS="$2"; shift 2 ;;
    --fresh) USE_CONTINUE=false; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Setup ──
mkdir -p "$LOG_DIR"
rm -f "$STOP_FILE"
ITERATION=0
START_TIME=$(date +%s)

echo "======================================"
echo " PRISM Auto-Roadmap Loop"
echo " Budget/iter: \$$BUDGET_PER_ITERATION"
echo " Max iterations: $MAX_ITERATIONS"
echo " Pause: ${PAUSE_SECONDS}s between iterations"
echo " Continue mode: $USE_CONTINUE"
echo " Stop file: $STOP_FILE"
echo " Logs: $LOG_DIR"
echo "======================================"
echo ""

# ── Main Loop ──
while [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
  ITERATION=$((ITERATION + 1))
  ITER_START=$(date +%s)
  LOG_FILE="$LOG_DIR/iter-$(printf '%03d' $ITERATION)-$(date +%Y%m%d-%H%M%S).log"

  # Check stop signal
  if [ -f "$STOP_FILE" ]; then
    echo "[iter $ITERATION] Stop file detected. Exiting gracefully."
    break
  fi

  echo "[iter $ITERATION] Starting at $(date '+%H:%M:%S') ..."

  # Build claude command
  CLAUDE_ARGS=(
    --print
    --effort max
    --permission-mode auto
  )

  if [ "$USE_CONTINUE" = true ] && [ "$ITERATION" -gt 1 ]; then
    CLAUDE_ARGS+=(--continue)
  fi

  if [ -n "$BUDGET_PER_ITERATION" ]; then
    CLAUDE_ARGS+=(--max-budget-usd "$BUDGET_PER_ITERATION")
  fi

  # Run Claude Code
  set +e
  claude "${CLAUDE_ARGS[@]}" "$PROMPT" > "$LOG_FILE" 2>&1
  EXIT_CODE=$?
  set -e

  ITER_END=$(date +%s)
  ITER_DURATION=$((ITER_END - ITER_START))

  # Log summary
  LINES=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
  echo "[iter $ITERATION] Completed in ${ITER_DURATION}s (exit=$EXIT_CODE, ${LINES} lines output)"

  # Check if Claude signaled a stop
  if grep -q "STOP_ROADMAP\|BLOCKER\|FATAL" "$LOG_FILE" 2>/dev/null; then
    echo "[iter $ITERATION] Claude signaled stop/blocker. Check $LOG_FILE"
    break
  fi

  # Non-zero exit that isn't context-related
  if [ "$EXIT_CODE" -ne 0 ]; then
    echo "[iter $ITERATION] Non-zero exit ($EXIT_CODE). Check $LOG_FILE"
    # Don't break on exit code 1 (might be context limit), break on others
    if [ "$EXIT_CODE" -gt 1 ]; then
      break
    fi
  fi

  # Pause between iterations
  if [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; then
    echo "[iter $ITERATION] Pausing ${PAUSE_SECONDS}s before next iteration..."
    sleep "$PAUSE_SECONDS"
  fi
done

# ── Summary ──
TOTAL_TIME=$(( $(date +%s) - START_TIME ))
echo ""
echo "======================================"
echo " Auto-Roadmap Complete"
echo " Iterations: $ITERATION"
echo " Total time: ${TOTAL_TIME}s ($(( TOTAL_TIME / 60 ))m)"
echo " Logs: $LOG_DIR"
echo "======================================"
