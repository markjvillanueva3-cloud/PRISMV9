<#
.SYNOPSIS
  Bounded, headless-safe launcher for the PRISM Claude Code fleet -- the entry
  point Bridge B (Hermes zulu) calls so an autonomous agent can boot CC slots
  WITHOUT the runaway-spawn risk of the uncapped Desktop .bat.

.DESCRIPTION
  Bridge B of the Claude-Code <-> Hermes integration. The existing fleet boot
  path (LAUNCH-PRISM-FLEET.generated.bat -> slot-tab-boot.ps1) has NO concurrency
  cap, so it is unsafe for an autonomous external caller. This wrapper:
    - requires an EXPLICIT -Slots list (never "launch everything" by default),
    - validates every slot name against the canonical SLOT_NAMES enum,
    - refuses an empty list and clamps -MaxSlots to a HARD ceiling it can only
      LOWER, never raise (an autonomous caller cannot widen its own cap),
    - bounds CUMULATIVE spawning across repeated calls at the launcher's OWN
      layer: it reads chat-slots.json + a short-lived in-flight marker and
      DROPS already-alive / just-launched slots from the plan, so N calls can
      never exceed the 26-slot universe nor double-launch a slot inside the
      downstream liveness guard's boot-window blind spot,
    - DEFAULTS to -DryRun (prints the exact wt.exe commands, spawns nothing);
      real spawning requires explicit -Live,
    - REUSES the canonical slot-tab-boot.ps1 (which carries the per-slot PID +
      JSONL-mtime liveness guard) -- it does NOT reimplement boot logic, it adds
      a launcher-layer pre-check ON TOP of it,
    - writes a JSON launch record AFTER the spawn loop (reflecting actual
      launched/failed, not just intent) and emits a JSON result to stdout.

  This is the safety boundary between an autonomous Hermes loop and 26 expensive
  Opus sessions. Hardened 2026-06-16 (slot zulu) after a 3-of-3 scrutiny FAIL
  found the per-call cap was caller-overridable + non-cumulative + had a
  startup-window dup race. See state/shared/specs/CC-HERMES-BRIDGE-STATUS-2026-06-16.md.

.PARAMETER Slots
  REQUIRED. Explicit NATO slot names to launch (e.g. sierra,tango). Each must be
  in the canonical SLOT_NAMES enum; unknown names abort the whole run.

.PARAMETER MaxSlots
  Per-call cap. Default 6. CLAMPED to [1, HardCeiling=6]: a caller may LOWER it
  but NEVER raise it past the hard ceiling (the runaway-spawn guard).

.PARAMETER Live
  Actually spawn the Windows Terminal tabs. Without it, the script is a DRY-RUN
  that only prints what it would do.

.PARAMETER BootScript
  Override the per-slot boot script. Default: H:\Tools\prism-fleet\slot-tab-boot.ps1
  (falls back to the repo copy H:\prism\scripts\fleet\slot-tab-boot.ps1).

.EXAMPLE
  # Safe default -- prints the commands, spawns nothing:
  pwsh -NoProfile -File H:\prism\scripts\fleet\launch-fleet-bounded.ps1 -Slots sierra,tango

.EXAMPLE
  # Actually launch two slots:
  pwsh -NoProfile -File H:\prism\scripts\fleet\launch-fleet-bounded.ps1 -Slots sierra,tango -Live
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string[]]$Slots,
  [int]$MaxSlots = 6,
  [switch]$Live,
  [string]$BootScript
)

$ErrorActionPreference = 'Stop'

# Canonical 26-slot NATO enum -- MUST match SLOT_NAMES in chat-slots.mjs and the
# $AllSlots list in zebra-launch.ps1. Hardcoded to keep this launcher self-contained.
$AllSlots = @(
  'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliett','kilo','lima','mike',
  'november','oscar','papa','quebec','romeo','sierra','tango','uniform','victor','whiskey','xray','yankee','zulu'
)

# HARD per-call ceiling. -MaxSlots can only LOWER this, never raise it -- so an
# autonomous caller cannot widen its own cap (3-of-3 P1: -MaxSlots was unclamped).
$HardCeiling = 6
# Markers for the launcher-layer in-flight guard (closes the downstream liveness
# guard's boot-window blind spot: a just-spawned slot has not yet written its
# chat-slots.json pid/heartbeat, so without this a re-call double-launches it).
# Paths are env-overridable for hermetic testing (mirrors the engine __forTests pattern).
$InFlightDir = if ($env:PRISM_FLEET_INFLIGHT_DIR) { $env:PRISM_FLEET_INFLIGHT_DIR } else { 'H:\prism\state\shared\.fleet-inflight' }
$InFlightTtlSec = 240          # a slot is "in-flight" for this long after we spawn it
$AliveHeartbeatSec = 180       # a chat-slots.json heartbeat newer than this == alive
$RecordDir = 'H:\prism\state\shared'
$ChatSlotsPath = if ($env:PRISM_CHAT_SLOTS_FILE) { $env:PRISM_CHAT_SLOTS_FILE } else { 'H:\prism\state\shared\chat-slots.json' }

$effectiveMax = [Math]::Min([Math]::Max(1, $MaxSlots), $HardCeiling)

function Write-Result([bool]$ok, [string]$message, $extra) {
  $obj = [ordered]@{ ok = $ok; message = $message; live = [bool]$Live; maxSlots = $effectiveMax; requestedMaxSlots = $MaxSlots; ts = [DateTime]::UtcNow.ToString('o') }
  if ($extra) { foreach ($k in $extra.Keys) { $obj[$k] = $extra[$k] } }
  $obj | ConvertTo-Json -Depth 6 -Compress
}

# Returns the set of slots that are already alive (recent chat-slots.json heartbeat)
# OR in-flight (a fresh marker we wrote on a recent -Live spawn). The launcher refuses
# to (re)launch these at its OWN layer -- it does not rely solely on the downstream
# slot-tab-boot guard, which is blind during a freshly-spawned slot's boot window.
function Get-OccupiedSlots {
  $occupied = @{}
  $corrupt = $false   # chat-slots.json PRESENT but unparseable -> unknown fleet state
  $nowUtc = [DateTime]::UtcNow
  # (a) alive per chat-slots.json heartbeat
  if (Test-Path $ChatSlotsPath) {
    try {
      $cs = Get-Content -LiteralPath $ChatSlotsPath -Raw | ConvertFrom-Json
      $slotsObj = if ($cs.PSObject.Properties.Name -contains 'slots') { $cs.slots } else { $cs }
      if ($slotsObj) {
        foreach ($prop in $slotsObj.PSObject.Properties) {
          $name = $prop.Name.ToLower()
          $hb = $prop.Value.lastHeartbeat
          if ($hb) {
            try {
              $hbTime = [DateTime]::Parse($hb, [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::RoundtripKind)
              if (($nowUtc - $hbTime.ToUniversalTime()).TotalSeconds -lt $AliveHeartbeatSec) { $occupied[$name] = 'alive' }
            } catch { <# unparseable heartbeat -> treat as not-alive #> }
          }
        }
      }
    } catch {
      # PRESENT but won't parse = corrupt -> caller must REFUSE a live spawn (unknown state),
      # NOT fail open. (Absent file is a different, legitimate fresh-state case: not corrupt.)
      $corrupt = $true
    }
  }
  # (b) in-flight: a marker file we wrote on a recent spawn, mtime within TTL
  try {
    if (Test-Path $InFlightDir) {
      foreach ($f in Get-ChildItem -LiteralPath $InFlightDir -File -ErrorAction SilentlyContinue) {
        if ($f.Name -eq '.launcher.lock') { continue }
        if (((Get-Date) - $f.LastWriteTime).TotalSeconds -lt $InFlightTtlSec) { $occupied[$f.BaseName.ToLower()] = 'in-flight' }
      }
    }
  } catch { <# marker dir unreadable -> best-effort #> }
  return [ordered]@{ occupied = $occupied; corrupt = $corrupt }
}

function Set-InFlightMarker([string]$slot) {
  try {
    if (-not (Test-Path $InFlightDir)) { New-Item -ItemType Directory -Path $InFlightDir -Force | Out-Null }
    Set-Content -LiteralPath (Join-Path $InFlightDir $slot) -Value ([DateTime]::UtcNow.ToString('o')) -Encoding utf8
  } catch { <# marker is best-effort; never fail the launch on a marker write #> }
}

# ---- Validate slot list (the bounded guard) --------------------------------
# Split on commas too: pwsh -File passes "-Slots sierra,tango" as ONE string, so
# flatten comma-lists as well as native arrays (this is how Hermes will call us).
$requested = @($Slots | ForEach-Object { $_ -split ',' } | Where-Object { $_ -and $_.Trim().Length -gt 0 } | ForEach-Object { $_.Trim().ToLower() })
if ($requested.Count -eq 0) {
  Write-Result $false "no slots requested -- pass an explicit -Slots list" $null
  exit 1
}
$invalid = @($requested | Where-Object { $AllSlots -notcontains $_ })
if ($invalid.Count -gt 0) {
  Write-Result $false "unknown slot name(s): $($invalid -join ', ') -- not in SLOT_NAMES" @{ invalid = $invalid }
  exit 1
}
# De-dup FIRST (3-of-3 P1: the cap was checked on the pre-dedup list), preserving order.
$seen = @{}; $deduped = @()
foreach ($s in $requested) { if (-not $seen.ContainsKey($s)) { $seen[$s] = $true; $deduped += $s } }
# Cap is asserted on exactly the set we would spawn, against the CLAMPED ceiling.
if ($deduped.Count -gt $effectiveMax) {
  Write-Result $false "refused: $($deduped.Count) slots exceeds the cap ($effectiveMax; hard ceiling $HardCeiling) -- runaway-spawn guard" @{ requested = $deduped; maxSlots = $effectiveMax }
  exit 1
}

# ---- Cumulative / in-flight guard (the launcher's OWN liveness pre-check) ---
# Drop slots that are already alive or just-launched. This bounds CUMULATIVE
# spawning across repeated calls (3-of-3 P1) and closes the boot-window dup race
# (3-of-3 P1) that the downstream slot-tab-boot guard alone cannot see.
$occ = Get-OccupiedSlots
$occupied = $occ.occupied
$stateCorrupt = [bool]$occ.corrupt
$skipped = @($deduped | Where-Object { $occupied.ContainsKey($_) } | ForEach-Object { [ordered]@{ slot = $_; reason = $occupied[$_] } })
$finalSlots = @($deduped | Where-Object { -not $occupied.ContainsKey($_) })
if ($finalSlots.Count -eq 0) {
  Write-Result $true "nothing to launch -- all requested slot(s) already alive/in-flight" @{ skipped = $skipped; stateCorrupt = $stateCorrupt }
  exit 0
}

# ---- Resolve boot script + wt + pwsh ---------------------------------------
if (-not $BootScript) {
  $candidates = @('H:\Tools\prism-fleet\slot-tab-boot.ps1', 'H:\prism\scripts\fleet\slot-tab-boot.ps1')
  $BootScript = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $BootScript -or -not (Test-Path $BootScript)) {
  Write-Result $false "slot-tab-boot.ps1 not found (looked in H:\Tools\prism-fleet and H:\prism\scripts\fleet)" $null
  exit 1
}

$Wt = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\wt.exe'
if (-not (Test-Path $Wt)) {
  $wtCmd = Get-Command wt.exe -ErrorAction SilentlyContinue
  if ($wtCmd) { $Wt = $wtCmd.Source }
}
$Pwsh = 'C:\Program Files\PowerShell\7\pwsh.exe'
$pwshFellBack = $false
if (-not (Test-Path $Pwsh)) {
  $pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
  if ($pwshCmd) { $Pwsh = $pwshCmd.Source } else { $Pwsh = 'powershell.exe'; $pwshFellBack = $true }
}
$haveWt = Test-Path $Wt

# ---- Build the per-slot launch commands ------------------------------------
$plan = @()
foreach ($slot in $finalSlots) {
  # slot-tab-boot.ps1 owns the downstream liveness guard; this launcher already
  # pre-filtered alive/in-flight slots above.
  $wtArgs = @('-w', 'new', '--title', "$slot | prism", '-d', 'H:\PRISM',
              $Pwsh, '-NoExit', '-NoLogo', '-NoProfile', '-File', $BootScript, '-Slot', $slot)
  $plan += [ordered]@{ slot = $slot; wt = $Wt; args = $wtArgs }
}

# ---- Dry-run (DEFAULT): print the exact commands, spawn nothing -------------
if (-not $Live) {
  $printed = @()
  foreach ($p in $plan) {
    $cmd = "`"$($p.wt)`" " + (($p.args | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join ' ')
    Write-Host "[dry-run] would launch: $cmd"
    $printed += [ordered]@{ slot = $p.slot; command = $cmd }
  }
  Write-Result $true "DRY-RUN: $($finalSlots.Count) slot(s) planned (pass -Live to spawn)" @{ slots = $finalSlots; skipped = $skipped; commands = $printed; resolvedShell = $Pwsh; pwshFellBack = $pwshFellBack; stateCorrupt = $stateCorrupt }
  exit 0
}

# ---- Live: spawn one Windows Terminal window per slot -----------------------
# FAIL-CLOSED on a corrupt chat-slots.json: a PRESENT-but-unparseable file means the
# fleet state is unknown, so we must NOT blindly spawn (3-of-3 arm-B P1: don't fail open).
# (An ABSENT file is the legitimate fresh state and does NOT block.)
if ($stateCorrupt) {
  Write-Result $false "refused: chat-slots.json present but unparseable -- unknown fleet state, refusing live spawn (fail-closed). Fix/remove the file, or use dry-run." @{ skipped = $skipped }
  exit 1
}
if (-not $haveWt) {
  Write-Result $false "wt.exe not found -- cannot spawn live (dry-run still works)" @{ wt = $Wt }
  exit 1
}
# CLAIM all planned slots up-front -- write every in-flight marker BEFORE any spawn so a
# concurrent bounded-launcher call's occupancy snapshot already sees them. This shrinks the
# read->spawn TOCTOU window to the marker write itself (3-of-3 arm-B P1: the markers were
# previously written one-per-iteration AFTER each Start-Process, leaving a multi-second
# window in which a concurrent call double-launched the same slot).
foreach ($slot in $finalSlots) { Set-InFlightMarker $slot }
$launched = @()
$failed = @()
foreach ($p in $plan) {
  try {
    Start-Process -FilePath $p.wt -ArgumentList $p.args | Out-Null
    $launched += $p.slot
    Start-Sleep -Milliseconds 1500  # gentle stagger -- avoid API thundering-herd (staggers the wt handoff, not the claude cold-start)
  } catch {
    $failed += [ordered]@{ slot = $p.slot; error = $_.Exception.Message }
  }
}
$ok = ($failed.Count -eq 0)

# ---- Launch record (AFTER the loop -- reflects ACTUAL outcome, not intent) --
$recordWritten = $false
$record = [ordered]@{
  ts = [DateTime]::UtcNow.ToString('o'); live = $true; bootScript = $BootScript; haveWt = $haveWt;
  resolvedShell = $Pwsh; pwshFellBack = $pwshFellBack; maxSlots = $effectiveMax; requestedMaxSlots = $MaxSlots;
  planned = $finalSlots; launched = $launched; failed = $failed; skipped = $skipped; source = 'launch-fleet-bounded.ps1'
}
try {
  if (-not (Test-Path $RecordDir)) { New-Item -ItemType Directory -Path $RecordDir -Force | Out-Null }
  Add-Content -Path (Join-Path $RecordDir 'fleet-bounded-launch-log.jsonl') -Value ($record | ConvertTo-Json -Depth 6 -Compress) -Encoding utf8
  $recordWritten = $true
} catch { <# logging is best-effort; never fail the launch on a log write #> }

# NOTE on `launched` semantics: a slot in `launched` was HANDED to wt.exe successfully;
# it is NOT a confirmation that the inner Claude session attached (wt -> pwsh ->
# slot-tab-boot -> claude is a multi-hop chain that can still skip/fail downstream).
# Callers must VERIFY per-slot liveness (re-read chat-slots.json) before treating a
# slot as running -- do not read ok:true as "session live".
Write-Result $ok "LIVE: handed $($launched.Count)/$($finalSlots.Count) slot(s) to wt (NOT confirmed attached -- verify per-slot liveness)" @{ launched = $launched; failed = $failed; skipped = $skipped; recordWritten = $recordWritten; resolvedShell = $Pwsh; pwshFellBack = $pwshFellBack }
exit ([int](-not $ok))
