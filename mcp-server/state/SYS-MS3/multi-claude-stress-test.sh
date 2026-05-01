#!/bin/bash
# Multi-Claude Stress Test — SYS-MS3-U02
# Tests claim system race conditions, heartbeat renewal, and stale reap
#
# Usage: bash state/SYS-MS3/multi-claude-stress-test.sh
# Runs from: H:/prism/mcp-server/

CLAIMS_DIR="H:/prism/mcp-server/data/claims"
TEST_MS="STRESS-TEST"
TEST_UNIT="STRESS-TEST-U99"
TEST_DIR="$CLAIMS_DIR/$TEST_MS/$TEST_UNIT"
PASS=0
FAIL=0
TOTAL=0

log() { echo "[$(date +%H:%M:%S)] $1"; }
pass() { PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); log "PASS: $1"; }
fail() { FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); log "FAIL: $1"; }

cleanup() {
  rm -rf "$CLAIMS_DIR/$TEST_MS" 2>/dev/null
}

# ============================================================
# TEST 1: Race condition — 3 concurrent mkdir attempts
# Exactly 1 should succeed, 2 should get EEXIST
# ============================================================
test_race_condition() {
  log "=== TEST 1: Race Condition (3 concurrent claims) ==="
  cleanup

  local results_file="/tmp/claim-race-results-$$"
  > "$results_file"

  local ok=0
  local total_runs=100

  for i in $(seq 1 $total_runs); do
    rm -rf "$CLAIMS_DIR/$TEST_MS" 2>/dev/null

    # Launch 3 concurrent mkdir -p attempts
    # mkdir with -p won't fail, but atomic mkdir (without -p) will
    local r1 r2 r3
    mkdir "$CLAIMS_DIR/$TEST_MS" 2>/dev/null

    # The real race is on the unit directory (leaf)
    (mkdir "$TEST_DIR" 2>/dev/null && echo "WIN" || echo "LOSE") > "/tmp/race1-$$" &
    (mkdir "$TEST_DIR" 2>/dev/null && echo "WIN" || echo "LOSE") > "/tmp/race2-$$" &
    (mkdir "$TEST_DIR" 2>/dev/null && echo "WIN" || echo "LOSE") > "/tmp/race3-$$" &
    wait

    r1=$(cat "/tmp/race1-$$")
    r2=$(cat "/tmp/race2-$$")
    r3=$(cat "/tmp/race3-$$")

    local wins=0
    [[ "$r1" == "WIN" ]] && wins=$((wins+1))
    [[ "$r2" == "WIN" ]] && wins=$((wins+1))
    [[ "$r3" == "WIN" ]] && wins=$((wins+1))

    if [ "$wins" -eq 1 ]; then
      ok=$((ok+1))
    else
      echo "Run $i: wins=$wins (r1=$r1 r2=$r2 r3=$r3)" >> "$results_file"
    fi

    rm -f "/tmp/race1-$$" "/tmp/race2-$$" "/tmp/race3-$$"
  done

  if [ "$ok" -eq "$total_runs" ]; then
    pass "Race condition: $ok/$total_runs runs had exactly 1 winner"
  else
    local failures=$((total_runs - ok))
    fail "Race condition: $failures/$total_runs runs had != 1 winner"
    cat "$results_file"
  fi

  rm -f "$results_file"
  cleanup
}

# ============================================================
# TEST 2: Heartbeat renewal — write claim.json, update heartbeat
# ============================================================
test_heartbeat() {
  log "=== TEST 2: Heartbeat Renewal ==="
  cleanup
  mkdir -p "$TEST_DIR"

  # Write initial claim
  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "{\"unit\":\"$TEST_UNIT\",\"claimed_at\":\"$now\",\"heartbeat_at\":\"$now\",\"instance\":\"claude-test-$$\"}" > "$TEST_DIR/claim.json"

  # Verify claim exists
  if [ -f "$TEST_DIR/claim.json" ]; then
    pass "Heartbeat: initial claim written"
  else
    fail "Heartbeat: initial claim not found"
    cleanup
    return
  fi

  # Simulate heartbeat update (1 second later)
  sleep 1
  local new_hb
  new_hb=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Atomic heartbeat: write to tmp, rename
  echo "{\"unit\":\"$TEST_UNIT\",\"claimed_at\":\"$now\",\"heartbeat_at\":\"$new_hb\",\"instance\":\"claude-test-$$\"}" > "$TEST_DIR/claim.json.tmp"
  mv "$TEST_DIR/claim.json.tmp" "$TEST_DIR/claim.json"

  # Verify heartbeat updated
  local stored_hb
  stored_hb=$(python3 -c "import json; print(json.load(open('$TEST_DIR/claim.json'))['heartbeat_at'])" 2>/dev/null)

  if [ "$stored_hb" = "$new_hb" ]; then
    pass "Heartbeat: renewal updated timestamp ($now -> $new_hb)"
  else
    fail "Heartbeat: renewal failed (expected $new_hb, got $stored_hb)"
  fi

  cleanup
}

# ============================================================
# TEST 3: Stale reap — verify claims older than threshold are reclaimable
# ============================================================
test_stale_reap() {
  log "=== TEST 3: Stale Reap Detection ==="
  cleanup
  mkdir -p "$TEST_DIR"

  # Write a claim with old heartbeat (10 minutes ago)
  local old_hb
  old_hb=$(python3 -c "
from datetime import datetime, timedelta, timezone
old = datetime.now(timezone.utc) - timedelta(minutes=10)
print(old.strftime('%Y-%m-%dT%H:%M:%SZ'))
" 2>/dev/null)

  echo "{\"unit\":\"$TEST_UNIT\",\"claimed_at\":\"$old_hb\",\"heartbeat_at\":\"$old_hb\",\"instance\":\"claude-stale\"}" > "$TEST_DIR/claim.json"

  # Check if stale (threshold: 5 minutes)
  local is_stale
  is_stale=$(python3 -c "
import json, os, time
from datetime import datetime, timezone
with open('$TEST_DIR/claim.json') as f:
    claim = json.load(f)
hb = datetime.fromisoformat(claim['heartbeat_at'].replace('Z', '+00:00'))
age_seconds = (datetime.now(timezone.utc) - hb).total_seconds()
print('STALE' if age_seconds > 300 else 'FRESH')  # 5 min = 300s
" 2>/dev/null)

  if [ "$is_stale" = "STALE" ]; then
    pass "Stale reap: 10-minute-old claim detected as STALE"
  else
    fail "Stale reap: 10-minute-old claim not detected as stale (got: $is_stale)"
  fi

  # Write a fresh claim (now)
  local fresh_hb
  fresh_hb=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "{\"unit\":\"$TEST_UNIT\",\"claimed_at\":\"$fresh_hb\",\"heartbeat_at\":\"$fresh_hb\",\"instance\":\"claude-fresh\"}" > "$TEST_DIR/claim.json"

  is_stale=$(python3 -c "
import json
from datetime import datetime, timezone
with open('$TEST_DIR/claim.json') as f:
    claim = json.load(f)
hb = datetime.fromisoformat(claim['heartbeat_at'].replace('Z', '+00:00'))
age_seconds = (datetime.now(timezone.utc) - hb).total_seconds()
print('STALE' if age_seconds > 300 else 'FRESH')
" 2>/dev/null)

  if [ "$is_stale" = "FRESH" ]; then
    pass "Stale reap: fresh claim detected as FRESH"
  else
    fail "Stale reap: fresh claim incorrectly detected as stale"
  fi

  cleanup
}

# ============================================================
# TEST 4: Claim-release-reclaim cycle
# ============================================================
test_claim_release_reclaim() {
  log "=== TEST 4: Claim-Release-Reclaim Cycle ==="
  cleanup

  # Claim
  mkdir -p "$TEST_DIR"
  echo '{"unit":"STRESS-TEST-U99","instance":"claude-A"}' > "$TEST_DIR/claim.json"

  if [ -f "$TEST_DIR/claim.json" ]; then
    pass "Cycle: initial claim by instance A"
  else
    fail "Cycle: initial claim failed"
    cleanup
    return
  fi

  # Release
  rm -rf "$TEST_DIR"

  if [ ! -d "$TEST_DIR" ]; then
    pass "Cycle: claim released (directory removed)"
  else
    fail "Cycle: release failed (directory still exists)"
    cleanup
    return
  fi

  # Reclaim by different instance
  mkdir -p "$TEST_DIR"
  echo '{"unit":"STRESS-TEST-U99","instance":"claude-B"}' > "$TEST_DIR/claim.json"

  local inst
  inst=$(python3 -c "import json; print(json.load(open('$TEST_DIR/claim.json'))['instance'])" 2>/dev/null)

  if [ "$inst" = "claude-B" ]; then
    pass "Cycle: reclaimed by instance B"
  else
    fail "Cycle: reclaim failed (expected claude-B, got $inst)"
  fi

  cleanup
}

# ============================================================
# RUN ALL TESTS
# ============================================================

log "Multi-Claude Stress Test — Starting"
log "Claims dir: $CLAIMS_DIR"
echo ""

test_race_condition
echo ""
test_heartbeat
echo ""
test_stale_reap
echo ""
test_claim_release_reclaim

echo ""
log "============================================"
log "RESULTS: $PASS passed, $FAIL failed ($TOTAL total)"
log "============================================"

# Ensure cleanup
cleanup

exit $FAIL
