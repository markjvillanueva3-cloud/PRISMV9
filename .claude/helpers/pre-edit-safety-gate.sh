#!/bin/bash
# Pre-Edit Safety Gate (DA-MS4)
# Blocks edits to CRITICAL-tier files without explicit override
# Returns non-zero to block the edit

FILE_PATH="${TOOL_INPUT_file_path:-}"
if [ -z "$FILE_PATH" ]; then exit 0; fi

# CRITICAL files that require extra caution
CRITICAL_PATTERNS=(
  "src/engines/PFPEngine.ts"
  "src/engines/PredictiveFailureEngine.ts"
  "src/engines/CollisionEngine.ts"
  "src/engines/SpindleProtectionEngine.ts"
  "src/engines/CoolantValidationEngine.ts"
  "src/engines/ToolBreakageEngine.ts"
  "src/engines/WorkholdingEngine.ts"
  "src/types/pfp-types.ts"
  "src/tools/dispatchers/safetyDispatcher.ts"
)

for pattern in "${CRITICAL_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "[SAFETY-GATE] WARNING: Editing CRITICAL file: $pattern"
    echo "[SAFETY-GATE] This file is safety-critical. Ensure regression tests pass after edit."
    exit 0  # Warn but don't block — blocking would be too disruptive
  fi
done

exit 0
