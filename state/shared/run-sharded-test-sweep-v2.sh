#!/usr/bin/env bash
# v2: robust xargs -P concurrency (the hand-rolled wait -n in v1 over-launched then
# the parent died before launching shards 5-32). Resumable: .done markers are skipped,
# so re-running after any reap/kill advances only the remaining shards.
set -u
N=32
CONC=2
OUT=/h/prism/state/shared/test-sweep-shards
mkdir -p "$OUT"
cd /h/prism/mcp-server || exit 2

run_one() {
  local i="$1"
  local done="$OUT/shard-${i}.done"
  if [ -f "$done" ]; then echo "shard $i SKIP"; return 0; fi
  # Direct vitest binary (npx resolution flaked under concurrency -> exit 127).
  node ./node_modules/vitest/vitest.mjs run --shard="${i}/${N}" --no-file-parallelism --reporter=dot > "$OUT/shard-${i}.log" 2>&1
  local ec=$?
  # Only mark done on a LEGITIMATE completion (0=all pass, 1=test failures).
  # 127 (launch-fail) / 139 (segfault) / other -> leave UNMARKED so the next pass retries.
  if [ "$ec" = "0" ] || [ "$ec" = "1" ]; then echo "exit=$ec" > "$done"; fi
  echo "shard $i exit=$ec"
}
export -f run_one
export N OUT

echo "SWEEP2-START $(date -u +%H:%M:%SZ) N=$N conc=$CONC"
seq 1 "$N" | xargs -P "$CONC" -I {} bash -c 'run_one "$@"' _ {}
echo "SWEEP2-DONE $(date -u +%H:%M:%SZ) done-markers=$(ls -1 "$OUT"/*.done 2>/dev/null | wc -l)"
