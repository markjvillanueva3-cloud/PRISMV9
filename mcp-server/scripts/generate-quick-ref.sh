#!/bin/bash
# Generates a compact JSON snapshot of PRISM system state
# Run after any significant change. Output goes to data/quick-ref.json
cd "$(dirname "$0")/.."

ENGINE_COUNT=$(ls src/engines/*.ts 2>/dev/null | grep -v index | wc -l | tr -d ' ')
EXPORTED=$(grep "^export" src/engines/index.ts 2>/dev/null | wc -l | tr -d ' ')
DISPATCHER_COUNT=$(ls src/tools/dispatchers/*.ts 2>/dev/null | wc -l | tr -d ' ')
ACTION_COUNT=$(grep -roh 'case "[^"]*"' src/tools/dispatchers/*.ts 2>/dev/null | wc -l | tr -d ' ')
ALGORITHM_COUNT=$(ls src/algorithms/*.ts 2>/dev/null | grep -v index | wc -l | tr -d ' ')
REGISTRY_COUNT=$(ls src/registries/*.ts 2>/dev/null | grep -v index | wc -l | tr -d ' ')
HOOK_COUNT=$(ls src/hooks/*.ts 2>/dev/null | grep -v index | wc -l | tr -d ' ')
TEST_FILE_COUNT=$(ls src/__tests__/*.test.ts 2>/dev/null | wc -l | tr -d ' ')
DATA_MODULE_COUNT=$(ls src/data/*.ts 2>/dev/null | wc -l | tr -d ' ')
LAST_COMMIT=$(git log --oneline -1 2>/dev/null | head -1)
LAST_5=$(git log --oneline -5 2>/dev/null)
BRANCH=$(git branch --show-current 2>/dev/null)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > data/quick-ref.json << EOF
{
  "generated": "$TIMESTAMP",
  "commit": "$(git rev-parse --short HEAD 2>/dev/null)",
  "branch": "$BRANCH",
  "counts": {
    "engines": $ENGINE_COUNT,
    "engines_exported": $EXPORTED,
    "dispatchers": $DISPATCHER_COUNT,
    "actions": $ACTION_COUNT,
    "algorithms": $ALGORITHM_COUNT,
    "registries": $REGISTRY_COUNT,
    "hooks": $HOOK_COUNT,
    "test_files": $TEST_FILE_COUNT,
    "data_modules": $DATA_MODULE_COUNT
  },
  "compact": "PRISM: ${ENGINE_COUNT}E/${DISPATCHER_COUNT}D/${ACTION_COUNT}A/${ALGORITHM_COUNT}Alg/${REGISTRY_COUNT}R | ${TEST_FILE_COUNT} test files",
  "recent_commits": [
$(echo "$LAST_5" | while IFS= read -r line; do echo "    \"$line\","; done | sed '$ s/,$//')
  ],
  "key_paths": {
    "engines": "src/engines/",
    "dispatchers": "src/tools/dispatchers/",
    "algorithms": "src/algorithms/",
    "registries": "src/registries/",
    "hooks": "src/hooks/",
    "tests": "src/__tests__/",
    "data": "src/data/",
    "inventory": "data/docs/SYSTEM_INVENTORY.md",
    "roadmap": "data/roadmap-index.json"
  }
}
EOF
echo "Generated data/quick-ref.json"
