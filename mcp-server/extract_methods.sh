#!/bin/bash

engines=(
  "src/engines/BallEndMillEngine.ts"
  "src/engines/CuttingForceEngine.ts"
  "src/engines/ChatterPredictionEngine.ts"
  "src/engines/SurfaceFinishEngine.ts"
  "src/engines/SpeedFeedOrchestratorEngine.ts"
  "src/engines/TrochoidalMillingEngine.ts"
  "src/engines/ChamferMillingEngine.ts"
)

for engine in "${engines[@]}"; do
  if [ -f "$engine" ]; then
    echo "=== $(basename $engine) ==="
    # Extract public methods (static or regular)
    grep -E "^\s*(static\s+)?[a-zA-Z]+\(|async.*\(|compute\(|calculate\(|predict\(" "$engine" | head -10 | sed 's/^[[:space:]]*//' | cut -d'(' -f1
    echo ""
  fi
done
