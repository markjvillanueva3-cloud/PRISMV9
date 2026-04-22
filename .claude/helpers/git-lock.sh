#!/usr/bin/env bash
# Git Lock — Prevents concurrent git operations across sessions
# Usage: git-lock.sh acquire|release|check|commit <args>

set -euo pipefail

LOCK_FILE="/h/prism/state/shared/GIT_LOCK.json"
LOCK_DIR="/h/prism/state/shared"
MAX_LOCK_AGE=60  # seconds before lock is considered stale

mkdir -p "$LOCK_DIR" 2>/dev/null || true

get_timestamp() {
  date +%s
}

get_session_id() {
  echo "session-${PPID:-$$}-$(hostname 2>/dev/null || echo unknown)"
}

# Check if lock is stale (older than MAX_LOCK_AGE)
is_lock_stale() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    return 0  # No lock = "stale"
  fi
  local lock_time holder
  lock_time=$(jq -r '.timestamp // 0' "$LOCK_FILE" 2>/dev/null || echo 0)
  local now=$(get_timestamp)
  local age=$((now - lock_time))
  if (( age > MAX_LOCK_AGE )); then
    return 0  # Stale
  fi
  return 1  # Still valid
}

# Acquire lock
acquire_lock() {
  local session_id=$(get_session_id)
  local now=$(get_timestamp)

  # Remove stale lock
  if is_lock_stale; then
    rm -f "$LOCK_FILE" 2>/dev/null || true
  fi

  # Check if another session holds the lock
  if [[ -f "$LOCK_FILE" ]]; then
    local holder=$(jq -r '.holder' "$LOCK_FILE" 2>/dev/null || echo "unknown")
    if [[ "$holder" != "$session_id" ]]; then
      echo "LOCKED by $holder — wait and retry" >&2
      return 1
    fi
  fi

  # Acquire lock
  cat > "$LOCK_FILE" <<EOF
{
  "holder": "$session_id",
  "timestamp": $now,
  "acquired_at": "$(date -Iseconds)"
}
EOF
  return 0
}

# Release lock
release_lock() {
  local session_id=$(get_session_id)
  if [[ -f "$LOCK_FILE" ]]; then
    local holder=$(jq -r '.holder' "$LOCK_FILE" 2>/dev/null || echo "")
    if [[ "$holder" == "$session_id" || -z "$holder" ]]; then
      rm -f "$LOCK_FILE"
    fi
  fi
}

# Check lock status
check_lock() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    echo "FREE"
    return 0
  fi
  if is_lock_stale; then
    echo "STALE"
    return 0
  fi
  local holder=$(jq -r '.holder' "$LOCK_FILE" 2>/dev/null || echo "unknown")
  echo "LOCKED:$holder"
  return 1
}

# Commit with lock
do_commit() {
  local session_id=$(get_session_id)

  # Try to acquire lock with retries
  local retries=5
  local retry_delay=2

  for ((i=1; i<=retries; i++)); do
    if acquire_lock; then
      break
    fi
    if (( i == retries )); then
      echo "ERROR: Could not acquire git lock after $retries attempts" >&2
      return 1
    fi
    echo "Waiting for git lock (attempt $i/$retries)..." >&2
    sleep $retry_delay
  done

  # Execute git command
  local result=0
  git "$@" || result=$?

  # Release lock
  release_lock

  return $result
}

# Main
cmd="${1:-check}"
shift || true

case "$cmd" in
  acquire)
    acquire_lock
    ;;
  release)
    release_lock
    ;;
  check)
    check_lock
    ;;
  commit)
    do_commit commit "$@"
    ;;
  add)
    do_commit add "$@"
    ;;
  *)
    echo "Usage: git-lock.sh acquire|release|check|commit|add <args>" >&2
    exit 1
    ;;
esac
