#!/usr/bin/env bash
# Sharded full-suite vitest sweep -- the single `vitest run` over 4710 files
# segfaults (SIGSEGV/139) at ~616 files. Each shard is a FRESH process over ~1/32
# of the files (segfault-safe), run 4-at-a-time. Durable per-shard logs + .done
# markers make it resumable: re-running skips completed shards (reaper-resilient).
set -u
N=32
CONC=4
OUT=/h/prism/state/shared/test-sweep-shards
mkdir -p "$OUT"
cd /h/prism/mcp-server || exit 2

run_shard() {
  local i="$1"
  local log="$OUT/shard-${i}.log"
  local done="$OUT/shard-${i}.done"
  if [ -f "$done" ]; then echo "shard $i SKIP (done)"; return 0; fi
  npx vitest run --shard="${i}/${N}" --no-file-parallelism --reporter=dot > "$log" 2>&1
  local ec=$?
  echo "exit=$ec" > "$done"
  echo "shard $i exit=$ec"
}

echo "SWEEP-START $(date -u +%H:%M:%SZ) N=$N conc=$CONC"
running=0
for i in $(seq 1 "$N"); do
  run_shard "$i" &
  running=$((running+1))
  if [ "$running" -ge "$CONC" ]; then wait -n 2>/dev/null || wait; running=$((running-1)); fi
done
wait
echo "SWEEP-DONE $(date -u +%H:%M:%SZ)"
