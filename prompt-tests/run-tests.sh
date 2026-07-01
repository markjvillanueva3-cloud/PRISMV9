#!/usr/bin/env bash
# PRISM Prompt Regression Tests
# Runs promptfoo eval against CAD prompts and opens the results viewer.
#
# Usage:
#   ./run-tests.sh                  # full eval (calls LLM API)
#   ./run-tests.sh --no-cache       # skip cache, force fresh LLM calls
#   ./run-tests.sh --validate       # parse config only, no API calls
#   ./run-tests.sh --filter-first-n 1  # run just 1 test (smoke test)
#
# Requires: OPENAI_API_KEY env var (or switch provider in promptfooconfig.yaml)

set -euo pipefail
cd "$(dirname "$0")"

echo "=== PRISM Prompt Regression Tests ==="
echo "Config: promptfooconfig.yaml"
echo "Prompts: cadquery-codegen, cad-extraction"
echo ""

if [[ "${1:-}" == "--validate" ]]; then
    echo "[validate] Checking config parses correctly..."
    # Run 1 test with no-write; will fail at API key stage if config is valid
    OUTPUT=$(promptfoo eval --no-cache --no-write --filter-first-n 1 2>&1 || true)
    if echo "$OUTPUT" | grep -q "Missing.*API_KEY\|OPENAI_API_KEY"; then
        echo "[validate] Config is valid (API key not set, but config parsed OK)."
        exit 0
    elif echo "$OUTPUT" | grep -q "error\|Error"; then
        echo "[validate] Config has errors:"
        echo "$OUTPUT"
        exit 1
    else
        echo "[validate] Config is valid."
        exit 0
    fi
fi

promptfoo eval "$@"
EVAL_EXIT=$?

if [ $EVAL_EXIT -eq 0 ]; then
    echo ""
    echo "Eval complete. Run 'promptfoo view' to see results in browser."
else
    echo ""
    echo "Eval failed with exit code $EVAL_EXIT"
    exit $EVAL_EXIT
fi
