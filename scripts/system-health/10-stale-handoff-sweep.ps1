#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-G1 -- Stale-handoff + stale-claim audit cron (30-min cadence).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around .claude/helpers/handoff-staleness.mjs.
  Runs the read-only audit on a 30-minute cadence and writes a Markdown report
  to state/shared/HANDOFF-STALENESS-REPORT.md so the operator can see at a
  glance:
    1. handoffs whose owning chat-slots heartbeat has gone stale (dead-owner
       fleet slots, the actionable case), and
    2. milestone claims at mcp-server/data/claims/<MS>/claim.json whose
       heartbeat is older than the staleness threshold.

  The audit NEVER mutates -- handoffs are context, milestone-claim release is
  owned by .claude/scripts/reap-stale-claims.mjs (the established reaper).
  When stale claims are surfaced this report tells the operator which command
  to run.

  Why 30 minutes: matches the unit spec. Handoff staleness changes slowly
  (hours, not minutes); claim heartbeats refresh on every chat turn, so a
  half-hour poll is enough to surface a dead chat within an operator-tolerable
  window without burning quota.

  Advisory only -- the .mjs always exits 0 on a completed sweep, so this
  wrapper never fails a scheduler run regardless of how many stale findings
  there are. Exit 2 is reserved for bad args.

.PARAMETER Json
  Emit the structured JSON to stdout instead of writing the Markdown report.
  Defaults to off -- the cron path writes the .md report.

.PARAMETER StaleHours
  Override the default 4h staleness threshold. Must be positive.

.PARAMETER NoReport
  Run the audit (Json or text) but do NOT write the Markdown report sidecar.
  Useful for ad-hoc CLI inspection.

.PARAMETER ReportPath
  Override the default report path (state/shared/HANDOFF-STALENESS-REPORT.md).

.EXAMPLE
  .\10-stale-handoff-sweep.ps1

.EXAMPLE
  .\10-stale-handoff-sweep.ps1 -Json -NoReport

.EXAMPLE
  schtasks.exe /Create /SC MINUTE /MO 30 /ST 00:07 /TN "PRISM Stale Handoff Sweep" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\10-stale-handoff-sweep.ps1"

.NOTES
  Cadence: every 30 minutes at :07 / :37 (off the :00/:30 marks per
           fleet-friendly scheduling -- avoids the cron stampede that lands
           every scheduled task on the wall-clock half-hour).
  Output:  state/shared/HANDOFF-STALENESS-REPORT.md (unless -NoReport)
           stdout: human-readable text (default) or JSON (with -Json)
  Exit codes:
    0 -- sweep completed (regardless of findings; advisory cron)
    2 -- bad args from the .mjs (propagated)
    3 -- node binary not found (host-config error)
#>
param(
  [switch]$Json,
  [double]$StaleHours = 0,
  [switch]$NoReport,
  [string]$ReportPath
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo ".claude/helpers/handoff-staleness.mjs"
$defaultReport = Join-Path $repo "state/shared/HANDOFF-STALENESS-REPORT.md"
if (-not $ReportPath) { $ReportPath = $defaultReport }

if (-not (Test-Path $script)) {
  Write-Warning "handoff-staleness.mjs not found at: $script"
  exit 2
}

# Resolve node binary: prefer the portable install, fall back to PATH. Same
# discipline as the sibling system-health wrappers so a host without
# H:\Tools\nodejs still runs the cron when a usable node is on PATH.
$nodeBin = "H:\Tools\nodejs\node.exe"
if (-not (Test-Path $nodeBin)) {
  $nodeBin = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $nodeBin) {
  Write-Warning "node binary not found (tried H:\Tools\nodejs\node.exe + PATH)"
  exit 3
}

# The .mjs always emits JSON when --json is passed; when not, it emits the
# human-readable text. The cron path captures JSON (we render our own Markdown
# from it), but the ad-hoc -Json flag passes JSON straight through so an
# operator can pipe it to jq.
$nodeArgs = @($script, "--json")
if ($StaleHours -gt 0) { $nodeArgs += "--stale-hours"; $nodeArgs += "$StaleHours" }

$rawJson = & $nodeBin @nodeArgs
$mjsExit = $LASTEXITCODE
if ($null -eq $mjsExit) { $mjsExit = 0 }

# Propagate a non-zero .mjs exit (only happens on bad args -- exit 2). The
# read-only sweep itself can never fail an audit run.
if ($mjsExit -ne 0) {
  if ($rawJson) { Write-Output $rawJson }
  exit $mjsExit
}

# -Json: emit the raw JSON to stdout, skip the rendered report path.
if ($Json) {
  Write-Output $rawJson
  if (-not $NoReport) { Write-Warning "Json mode: skipped writing $ReportPath" }
  exit 0
}

# Render Markdown report from the JSON. Failure to parse the JSON is treated
# as a soft warning (host issue, not a code defect): the audit still ran, we
# just couldn't shape its output.
$audit = $null
try {
  $audit = $rawJson | ConvertFrom-Json -ErrorAction Stop
} catch {
  Write-Warning ("Could not parse audit JSON ({0}); raw output: {1}" -f $_.Exception.Message, $rawJson)
  exit 0
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# HANDOFF-STALENESS-REPORT")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Generated: $($audit.generatedAt)")
[void]$sb.AppendLine("Stale threshold: $($audit.staleHours) h")
[void]$sb.AppendLine("Re-run: ``H:\prism\scripts\system-health\10-stale-handoff-sweep.ps1``")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Handoffs ($($audit.handoffs.total) total)")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("- live-owner:  $($audit.handoffs.liveOwner)")
[void]$sb.AppendLine("- historical:  $($audit.handoffs.noSlot)")
[void]$sb.AppendLine("- unkeyed:     $($audit.handoffs.unkeyed)")
[void]$sb.AppendLine("- DEAD-OWNER:  $($audit.handoffs.deadOwner)")
[void]$sb.AppendLine("")
if ($audit.handoffs.deadOwnerFiles -and $audit.handoffs.deadOwnerFiles.Count -gt 0) {
  [void]$sb.AppendLine("### Dead-owner handoffs (slot occupied by a corpse)")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("| file | slot | chatId | age (h) |")
  [void]$sb.AppendLine("|---|---|---|---:|")
  foreach ($f in $audit.handoffs.deadOwnerFiles) {
    $age = if ($null -ne $f.ageHours) { $f.ageHours } else { "?" }
    [void]$sb.AppendLine("| ``$($f.file)`` | $($f.slot) | ``$($f.chatId)`` | $age |")
  }
  [void]$sb.AppendLine("")
}

[void]$sb.AppendLine("## Stale milestone claims ($($audit.claims.total) scanned)")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("- fresh:                $($audit.claims.fresh)")
[void]$sb.AppendLine("- STALE:                $($audit.claims.stale)")
[void]$sb.AppendLine("- unreadable:           $($audit.claims.unreadable)")
[void]$sb.AppendLine("- no parseable heartbeat: $($audit.claims.unknownHeartbeat)")
[void]$sb.AppendLine("")
if ($audit.claims.staleDetail -and $audit.claims.staleDetail.Count -gt 0) {
  [void]$sb.AppendLine("### Stale claims (release-eligible)")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("| milestone | chatId | host | heartbeat age (h) |")
  [void]$sb.AppendLine("|---|---|---|---:|")
  foreach ($d in $audit.claims.staleDetail) {
    # NOTE: $host is a PS automatic variable (PSHost) -- using $claimHost.
    $cid       = if ($d.chatId) { $d.chatId } else { "?" }
    $claimHost = if ($d.host)   { $d.host }   else { "?" }
    $age       = if ($null -ne $d.heartbeatAgeHours) { $d.heartbeatAgeHours } else { "?" }
    [void]$sb.AppendLine("| $($d.milestone) | ``$cid`` | $claimHost | $age |")
  }
  [void]$sb.AppendLine("")
  if ($audit.claimReaperHint) {
    [void]$sb.AppendLine("**Recommended action:** $($audit.claimReaperHint)")
    [void]$sb.AppendLine("")
  }
}

[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("This audit is READ-ONLY. Milestone-claim release is owned by")
[void]$sb.AppendLine("``.claude/scripts/reap-stale-claims.mjs`` (dry-run by default, ``--apply`` to act).")
[void]$sb.AppendLine("Handoffs are context and are never moved or deleted.")

if (-not $NoReport) {
  $reportDir = Split-Path -Parent $ReportPath
  if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Force -Path $reportDir | Out-Null }
  # BOM-free UTF-8 to keep the report consumable by tools that choke on a BOM
  # (vitest-stdin, jq variants). Matches the sibling-script convention.
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($ReportPath, $sb.ToString(), $utf8NoBom)
  Write-Output ("stale-handoff-sweep: wrote {0} (handoffs:{1} dead:{2}, claims:{3} stale:{4})" -f `
    $ReportPath, $audit.handoffs.total, $audit.handoffs.deadOwner, $audit.claims.total, $audit.claims.stale)
} else {
  # NoReport + not Json: emit a one-line summary so the cron log shows something.
  Write-Output ("stale-handoff-sweep: handoffs:{0} dead:{1}, claims:{2} stale:{3} (no report written)" -f `
    $audit.handoffs.total, $audit.handoffs.deadOwner, $audit.claims.total, $audit.claims.stale)
}

exit 0
