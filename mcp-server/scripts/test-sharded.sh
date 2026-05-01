#!/bin/bash
# PRISM Test Suite - Sharded Execution
# Runs tests in 8 shards to avoid memory issues (2000+ test files)
#
# Usage:
#   ./scripts/test-sharded.sh           # Run all shards sequentially
#   ./scripts/test-sharded.sh 3         # Run only shard 3
#   ./scripts/test-sharded.sh parallel  # Run all shards in parallel (requires more RAM)

set -e

TOTAL_SHARDS=8
HEAP_SIZE=8192

run_shard() {
    local shard=$1
    echo "========================================"
    echo "Running Shard $shard/$TOTAL_SHARDS"
    echo "========================================"
    node --max-old-space-size=$HEAP_SIZE node_modules/vitest/vitest.mjs run \
        --shard=$shard/$TOTAL_SHARDS \
        --reporter=dot
    echo ""
}

if [ "$1" = "parallel" ]; then
    echo "Running all shards in parallel (requires ~64GB RAM)..."
    for i in $(seq 1 $TOTAL_SHARDS); do
        run_shard $i &
    done
    wait
    echo "All shards complete!"
elif [ -n "$1" ] && [ "$1" -ge 1 ] && [ "$1" -le $TOTAL_SHARDS ]; then
    run_shard $1
else
    echo "Running all $TOTAL_SHARDS shards sequentially..."
    for i in $(seq 1 $TOTAL_SHARDS); do
        run_shard $i
    done
    echo ""
    echo "========================================"
    echo "All shards complete!"
    echo "========================================"
fi
