#!/usr/bin/env bash
# ram-zombie-watch.sh — emit alerts when fleet exceeds resource thresholds, run cleanup on alert.
# Stdout lines are events for the Monitor tool. Silent when healthy.
# Thresholds (env-overridable):
#   NODE_MAX  (default 35)  — node.exe count ceiling
#   BASH_MAX  (default 12)  — bash.exe count ceiling
#   RAM_MAX   (default 85)  — RAM percent ceiling
#   POLL_SEC  (default 60)  — seconds between polls
#   HB_EVERY  (default 30)  — emit heartbeat every N polls
set -u

NODE_MAX="${NODE_MAX:-35}"
BASH_MAX="${BASH_MAX:-12}"
RAM_MAX="${RAM_MAX:-85}"
POLL_SEC="${POLL_SEC:-60}"
HB_EVERY="${HB_EVERY:-30}"

hb_counter=0

emit() { printf '%s\n' "$*"; }

cleanup() {
  emit "[$(date -u +%H:%M:%SZ)] watchdog shutting down (caller stopped or timeout)"
  exit 0
}
trap cleanup INT TERM HUP

emit "[$(date -u +%H:%M:%SZ)] watchdog armed  thresholds: node>${NODE_MAX} bash>${BASH_MAX} ram>${RAM_MAX}% poll=${POLL_SEC}s"

while true; do
  ts=$(date -u +%H:%M:%SZ)

  # Process counts (Windows tasklist via git-bash)
  node_n=$(tasklist //FI "IMAGENAME eq node.exe" //FO CSV //NH 2>/dev/null | grep -c "node.exe" || echo 0)
  bash_n=$(tasklist //FI "IMAGENAME eq bash.exe" //FO CSV //NH 2>/dev/null | grep -c "bash.exe" || echo 0)

  # RAM via PowerShell
  ram_pct=$(powershell -NoProfile -Command "\$o=Get-CimInstance Win32_OperatingSystem; [Math]::Round((1 - \$o.FreePhysicalMemory/\$o.TotalVisibleMemorySize)*100,0)" 2>/dev/null | tr -d '\r\n ')
  ram_pct="${ram_pct:-0}"

  # Stale git index.lock files (older than 5 minutes)
  locks=$(find H:/prism/.git H:/prism-*/.git H:/prism/.claude/worktrees/*/.git -maxdepth 1 -name "index.lock" -mmin +5 2>/dev/null | wc -l | tr -d ' ')
  locks="${locks:-0}"

  alert=""
  [ "$node_n" -gt "$NODE_MAX" ] 2>/dev/null && alert="${alert}node=${node_n} "
  [ "$bash_n" -gt "$BASH_MAX" ] 2>/dev/null && alert="${alert}bash=${bash_n} "
  [ "$ram_pct" -gt "$RAM_MAX" ] 2>/dev/null && alert="${alert}ram=${ram_pct}% "
  [ "$locks" -gt 0 ] 2>/dev/null && alert="${alert}gitLocks=${locks} "

  if [ -n "$alert" ]; then
    emit "[$ts] ALERT $alert reaping"
    out1=$(node H:/prism/.claude/hooks/stale-claim-sweeper.mjs 2>&1 | grep -oE '"systemMessage":"[^"]*"' | head -1)
    out2=$(node H:/prism/.claude/hooks/git-lock-sweeper.mjs 2>&1 | head -1)
    out3=$(node H:/prism/.claude/hooks/node-process-janitor.mjs --full 2>&1 | head -3 | tr '\n' '|')
    emit "[$ts]   stale-claims: ${out1:-(no output)}"
    emit "[$ts]   git-locks:    ${out2:-(no output)}"
    emit "[$ts]   node-janitor: ${out3:-(no output)}"
  fi

  hb_counter=$((hb_counter + 1))
  if [ "$hb_counter" -ge "$HB_EVERY" ]; then
    emit "[$ts] heartbeat  node=${node_n} bash=${bash_n} ram=${ram_pct}% locks=${locks}"
    hb_counter=0
  fi

  sleep "$POLL_SEC"
done
