#!/bin/bash

# Get index content
index=$(cat src/engines/index.ts)

# List all milling-related engines
engines=(
  "AdvancedMillingStrategiesEngine"
  "BallEndMillEngine"
  "BallMillEngine"
  "ChamferMillingEngine"
  "HelicalMillingEngine"
  "HighFeedMillingEngine"
  "PlungeMillingEngine"
  "RollingMillEngine"
  "SplineMillingEngine"
  "ThreadMillingEngine"
  "TrochoidalMillingEngine"
  "MicroMillingEngine"
  "MicroMillingSizeEffectEngine"
  "CuttingForceEngine"
  "StochasticCuttingForceEngine"
  "BoringBarDeflectionEngine"
  "PartDeflectionEngine"
  "StochasticDeflectionEngine"
  "ToolAssemblyDeflectionEngine"
  "ToolDeflectionPredictionEngine"
  "TimoshenkoDeflectionEngine"
  "WorkpieceDeflectionCompensationEngine"
  "ChatterPredictionEngine"
  "StochasticChatterEngine"
  "RegenerativeChatterPredictor"
  "ChatterNeuralClassifierEngine"
  "ChatterStabilityLobeEngine"
  "AdaptiveChatterEngine"
  "SurfaceFinishEngine"
  "SurfaceFinishDatabaseEngine"
  "SurfaceFinishPredictorEngine"
  "StochasticSurfaceFinishEngine"
  "SurfaceFinishCnnEngine"
  "GrindingSurfaceFinishEngine"
  "ToolPathStepoverEngine"
  "AutoSpeedFeedEngine"
  "AutoSpeedFeedCalculatorEngine"
  "SpeedFeedMinerEngine"
  "SpeedFeedOrchestratorEngine"
  "SpeedFeedAutopilotEngine"
  "SpeedFeedAdvancedAIEngine"
  "SpeedFeedDeepLearningEngine"
  "SpeedFeedUltimateAIEngine"
  "SpeedFeedResourceIntegrationEngine"
  "UltimateSpeedFeedEngine"
  "ProvenSpeedFeedAggregatorEngine"
  "MachineAwareSpeedFeedEngine"
)

echo "ENGINE_NAME,FILE_PATH,EXPORTED,TESTED,DISPATCHED,NOTES"

for engine in "${engines[@]}"; do
  # Check if file exists
  file="src/engines/${engine}.ts"
  if [ ! -f "$file" ]; then
    continue
  fi
  
  # Check export in index
  exported="N"
  if grep -q "from \"\./${engine}" src/engines/index.ts; then
    exported="Y"
  fi
  
  # Check test file
  tested="N"
  if [ -f "src/__tests__/${engine}.test.ts" ]; then
    tested="Y"
  fi
  
  # Check dispatcher wiring
  dispatched="N"
  for disp in src/tools/dispatchers/*.ts; do
    if grep -q "${engine}" "$disp" 2>/dev/null; then
      dispatched="Y"
      break
    fi
  done
  
  # Extract singleton name from file
  singleton=$(grep "^export const.*Engine\|^export const.*engine" "src/engines/${engine}.ts" 2>/dev/null | head -1 | grep -o "[a-zA-Z]*Engine\|[a-zA-Z]*engine" | head -1)
  
  echo "${engine},src/engines/${engine}.ts,${exported},${tested},${dispatched},singleton: ${singleton}"
done | sort

