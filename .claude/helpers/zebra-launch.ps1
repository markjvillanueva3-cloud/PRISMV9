#Requires -RunAsAdministrator
<#
.SYNOPSIS
  ZEBRA-OMNISCIENT operator launcher -- one elevated PS call lands G10 + G12.

.DESCRIPTION
  Closes the two operator-action gates left at the end of ZEBRA-HERMES-GAP-AUDIT:
    G10 -- registers the 'PRISM Zebra Orchestrator' scheduled task (via
          install-zebra-orchestrator-task.ps1). Default: BURN-IN (dry-run baked
          into the task so the sweep classifies + decides but never SendKeys);
          pass -Live once the burn-in log looks clean.
    G12 -- flips zebraOptIn=true + records zebraOptInAt (ISO timestamp) for
          each requested slot in state/shared/chat-slots.json. Per the G4
          doctrine, opt-in is a per-slot trust decision; this script honors
          your -Slots parameter and never widens scope. Slot names are
          intersected against the canonical SLOT_NAMES enum from chat-slots.mjs.

  Self-exempt: zebra + golf slots are always self-exempt in the sweep regardless
  of opt-in state; the 24h dry-run grace window forces dry-run on a newly-opted-
  in slot for 24h even when the task is live.

.PARAMETER Slots
  NATO slot names to opt in (e.g. alpha, bravo). Default: alpha only.
  Each named slot must exist in the canonical SLOT_NAMES enum (alpha..zulu);
  unknown names are skipped with a warning. NEVER creates new slots.
  NOTE: 'golf' is self-exempt in the sweep -- opting it in is a no-op (skipped).

.PARAMETER Live
  Register the scheduled task in LIVE mode (full SendKeys actuation). Default
  is burn-in (--dry-run baked in). Recommend running burn-in first for 24h.

.PARAMETER SkipInstall
  Skip G10 (scheduled-task register); only run G12 (opt-in flip).

.PARAMETER SkipOptIn
  Skip G12 (opt-in flip); only run G10 (scheduled-task register).

.PARAMETER Preview
  Show planned actions and the chat-slots.json diff. Nothing is written.
  (Named -Preview rather than -WhatIf to avoid PowerShell common-parameter
  shadowing footgun.)

.EXAMPLE
  # Recommended first-run: burn-in install + opt-in alpha only (operator-default)
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/zebra-launch.ps1 -RunNow

.EXAMPLE
  # After 24h clean burn-in, graduate to live + add a third slot:
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/zebra-launch.ps1 -Live -Slots alpha,bravo,charlie

.EXAMPLE
  # Preview only -- no changes:
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/zebra-launch.ps1 -Preview

.NOTES
  Source-of-truth spec: state/shared/specs/ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md G10 G12.
  Memory:                knowledge/memories/reference/reference_zebra_hermes_gaps_campaign_2026_05_20.md
#>

param(
  [string[]]$Slots = @('alpha'),
  [switch]$Live,
  [switch]$RunNow,
  [switch]$SkipInstall,
  [switch]$SkipOptIn,
  [switch]$Preview
)

$ErrorActionPreference = 'Stop'

# ---- Belt-and-suspenders admin check (mirrors install-zebra-orchestrator-task.ps1)
# #Requires -RunAsAdministrator is a parse-time gate; this is a runtime gate that
# also fires when the script is dot-sourced from a parent context.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- ZEBRA-OMNISCIENT G10/G12 needs admin rights."
}

# ---- Paths
$PrismRoot = 'H:/prism'
$InstallerPath = Join-Path $PrismRoot '.claude/helpers/install-zebra-orchestrator-task.ps1'
$ChatSlotsPath = Join-Path $PrismRoot 'state/shared/chat-slots.json'
# MUST match DEFAULT_LOCK_PATH in chat-slots.mjs (currently
# H:/prism/state/shared/chat-slots.lock). Mismatch = peers race past our lock.
$LockPath = Join-Path $PrismRoot 'state/shared/chat-slots.lock'

# Canonical SLOT_NAMES enum -- MUST match chat-slots.mjs line 103-106. Hardcoded
# rather than imported to keep this launcher self-contained PS (no node call
# needed for slot-name validation).
$AllSlots = @(
  'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliett','kilo','lima','mike',
  'november','oscar','papa','quebec','romeo','sierra','tango','uniform','victor','whiskey','xray','yankee','zulu'
)

if (-not (Test-Path $InstallerPath)) {
  throw "Installer not found: $InstallerPath"
}
if (-not (Test-Path $ChatSlotsPath)) {
  throw "chat-slots.json not found: $ChatSlotsPath"
}

# ---- Plan summary
$mode = if ($Live) { 'LIVE (full SendKeys actuation)' } else { 'BURN-IN (--dry-run baked into task, no SendKeys)' }
Write-Host ""
Write-Host "ZEBRA-OMNISCIENT operator launcher" -ForegroundColor Cyan
Write-Host "-------------------------------------" -ForegroundColor Cyan
Write-Host "  Mode:           $mode"
Write-Host "  Opt-in slots:   $($Slots -join ', ')"
Write-Host "  G10 install:    $(if ($SkipInstall) { 'SKIPPED' } else { 'enabled' })"
Write-Host "  G12 opt-in:     $(if ($SkipOptIn) { 'SKIPPED' } else { 'enabled' })"
Write-Host "  Preview:        $Preview"
Write-Host ""

# ---- G10 -- Install scheduled task
$g10Ok = $false
if (-not $SkipInstall) {
  Write-Host "[G10] Registering scheduled task via install-zebra-orchestrator-task.ps1 ..." -ForegroundColor Yellow
  if ($Live -and -not $Preview) {
    Write-Host "  WARNING: -Live registers the task in FULL ACTUATION mode. The sweep" -ForegroundColor Red
    Write-Host "           will SendKeys /compact + /checkin into opted-in chat windows." -ForegroundColor Red
    if ($RunNow) {
      Write-Host "           -RunNow ALSO triggers an immediate live sweep -- opted-in" -ForegroundColor Red
      Write-Host "           windows may receive keystrokes within ~30s. Burn-in first is" -ForegroundColor Red
      Write-Host "           strongly recommended (omit -Live for the first 24h)." -ForegroundColor Red
    }
  }
  $installerArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $InstallerPath)
  if (-not $Live) { $installerArgs += '-DryRun' }
  if ($RunNow)    { $installerArgs += '-RunNow' }
  if ($Preview) {
    Write-Host "  Preview: would run: powershell $($installerArgs -join ' ')" -ForegroundColor DarkGray
    $g10Ok = $true
  } else {
    & powershell @installerArgs
    if ($LASTEXITCODE -ne 0) { throw "install-zebra-orchestrator-task.ps1 failed with exit code $LASTEXITCODE" }
    $g10Ok = $true
  }
  Write-Host ""
}

# ---- G12 -- Atomic opt-in on chat-slots.json
if (-not $SkipOptIn) {
  Write-Host "[G12] Flipping zebraOptIn=true for: $($Slots -join ', ')" -ForegroundColor Yellow

  # Validate every slot name against the canonical enum + a strict regex
  # before touching the JSON. This is the G4 doctrine guard: never widen
  # scope to a name the operator didn't actually mean (no JSON-pollution
  # via path-traversal-like names, no PSObject prototype keys, no whitespace).
  $validatedSlots = @()
  $invalidSlots = @()
  foreach ($slot in $Slots) {
    if ($slot -notmatch '^[a-z]+$' -or ($AllSlots -notcontains $slot)) {
      $invalidSlots += $slot
      continue
    }
    $validatedSlots += $slot
  }
  if ($invalidSlots.Count -gt 0) {
    Write-Host "  invalid slot names (not in SLOT_NAMES, skipped): $($invalidSlots -join ', ')" -ForegroundColor Yellow
  }
  if ($validatedSlots.Count -eq 0) {
    Write-Host "  no valid slots to opt in -- nothing to do for G12 (check -Slots argument)." -ForegroundColor Yellow
  }

  # $haveLock + $tmp declared BEFORE the try so the finally can always see
  # them -- the lock acquisition itself runs INSIDE the try, so a partial
  # acquisition (lockfile created, then a throw) is still cleaned up.
  $lockTimeoutMs = 5000
  $haveLock = $false
  $tmp = "$ChatSlotsPath.zebra-launch-$PID.tmp"
  try {
    # Mirror chat-slots.mjs lock convention: writeFileSync wx-flag is the
    # atomic create primitive. PS equivalent: New-Item -ItemType File
    # errors out if the path already exists -- no race with concurrent
    # claimants using the same lockfile path. $haveLock flips to $true the
    # instant New-Item succeeds (that IS the lock); a later Set-Content
    # failure still leaves the lock held + cleaned up by the finally.
    $lockStart = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    while (-not $haveLock -and ([DateTimeOffset]::Now.ToUnixTimeMilliseconds() - $lockStart) -lt $lockTimeoutMs) {
      try {
        $null = New-Item -ItemType File -Path $LockPath -ErrorAction Stop
        $haveLock = $true
        Set-Content -Path $LockPath -Value "$PID`n$([DateTime]::UtcNow.ToString('o'))" -ErrorAction SilentlyContinue
      } catch {
        if (Test-Path $LockPath) {
          $lockAge = ((Get-Date) - (Get-Item $LockPath).LastWriteTime).TotalMilliseconds
          if ($lockAge -gt $lockTimeoutMs) {
            Write-Host "  stale lock detected (age $([int]$lockAge)ms) -- breaking" -ForegroundColor DarkYellow
            Remove-Item $LockPath -Force -ErrorAction SilentlyContinue
            continue
          }
        }
        Start-Sleep -Milliseconds (50 + (Get-Random -Max 100))
      }
    }
    if (-not $haveLock) {
      throw "Could not acquire chat-slots.lock within ${lockTimeoutMs}ms - peer chat may be claiming. Retry in a few seconds."
    }

    # No-BOM read via .NET (PS 5.1 Get-Content -Raw misbehaves on BOM-less UTF-8
    # asymmetric with no-BOM canonical write). Symmetric read/write keeps the
    # canonical encoding stable across launches.
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    $raw = [System.IO.File]::ReadAllText($ChatSlotsPath, $utf8NoBom)
    $obj = $raw | ConvertFrom-Json
    if (-not $obj.slots) {
      throw "chat-slots.json has no 'slots' object - file may be corrupt"
    }

    $now = [DateTime]::UtcNow.ToString('o')
    $flipped = @()
    $skipped = @()
    $alreadyOn = @()

    foreach ($slot in $validatedSlots) {
      if (-not ($obj.slots.PSObject.Properties.Name -contains $slot)) {
        # Slot key absent from JSON entirely. Per G4 doctrine: NEVER create
        # slots from this launcher -- chat-slots.mjs init owns slot creation.
        $skipped += "${slot}:absent-from-json"
        continue
      }
      $slotObj = $obj.slots.$slot
      if ($null -eq $slotObj) {
        # Slot key is present but value is null (uninitialized). Per the same
        # G4 doctrine: do NOT populate with our own opt-in shape; this would
        # widen the launcher's scope beyond "flip flags on existing entries."
        $skipped += "${slot}:null-value"
        continue
      }
      if ($slotObj.zebraOptIn -eq $true) {
        $alreadyOn += $slot
        continue
      }
      # PSCustomObject is reference-typed; mutating $slotObj propagates back
      # through $obj.slots.$slot. Add-Member -Force overwrites existing.
      $slotObj | Add-Member -NotePropertyName 'zebraOptIn'   -NotePropertyValue $true -Force
      $slotObj | Add-Member -NotePropertyName 'zebraOptInAt' -NotePropertyValue $now -Force
      $flipped += $slot
    }

    if ($Preview) {
      Write-Host "  Preview: would flip ($($flipped.Count)): $($flipped -join ', ')" -ForegroundColor DarkGray
      Write-Host "  Preview: already on ($($alreadyOn.Count)): $($alreadyOn -join ', ')" -ForegroundColor DarkGray
      Write-Host "  Preview: skipped ($($skipped.Count)):    $($skipped -join ', ')" -ForegroundColor DarkGray
    } else {
      # Atomic write: temp file + [System.IO.File]::Replace. Replace() wraps
      # Win32 ReplaceFile -- a true atomic in-place swap (no delete-then-move
      # window that Move-Item -Force has). Matches the atomicity of the
      # canonical chat-slots.mjs fs.renameSync writer. WriteAllText with
      # UTF8Encoding(false) yields no-BOM UTF-8.
      $json = $obj | ConvertTo-Json -Depth 100
      [System.IO.File]::WriteAllText($tmp, $json, $utf8NoBom)
      [System.IO.File]::Replace($tmp, $ChatSlotsPath, $null)

      Write-Host "  flipped ($($flipped.Count)):    $($flipped -join ', ')" -ForegroundColor Green
      Write-Host "  already on ($($alreadyOn.Count)): $($alreadyOn -join ', ')" -ForegroundColor DarkGreen
      if ($skipped.Count -gt 0) {
        Write-Host "  skipped ($($skipped.Count)):    $($skipped -join ', ')" -ForegroundColor Yellow
      }
    }
  } catch {
    # Reversibility hint -- if G10 already landed but G12 throws, the operator
    # gets the exact rollback command rather than figuring it out from scratch.
    if ($g10Ok -and -not $Preview) {
      Write-Host ""
      Write-Host "ROLLBACK HINT (G10 succeeded but G12 failed):" -ForegroundColor Red
      Write-Host "  & '$InstallerPath' -Uninstall" -ForegroundColor Red
      Write-Host ""
    }
    throw
  } finally {
    # Always cleanup the temp file (Move-Item failure path) and the lockfile.
    if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
    if ($haveLock) { Remove-Item $LockPath -Force -ErrorAction SilentlyContinue }
  }
  Write-Host ""
}

# ---- Verification + next-steps
Write-Host "Verification:" -ForegroundColor Cyan
if (-not $SkipInstall -and -not $Preview) {
  $task = Get-ScheduledTask -TaskName 'PRISM Zebra Orchestrator' -ErrorAction SilentlyContinue
  if ($task) {
    Write-Host "  [OK] Scheduled task registered (State=$($task.State))"
  } else {
    Write-Host "  [XX] Scheduled task NOT found - investigate" -ForegroundColor Red
  }
}
if (-not $SkipOptIn -and -not $Preview) {
  $verify = [System.IO.File]::ReadAllText($ChatSlotsPath, [System.Text.UTF8Encoding]::new($false)) | ConvertFrom-Json
  foreach ($slot in $Slots) {
    # Parens around -contains are REQUIRED -- without them PS parses
    # `$a -contains $b -and $c` as `$a -contains ($b -and $c)`, which would
    # print [OK] for slots that aren't actually present.
    if (($verify.slots.PSObject.Properties.Name -contains $slot) -and ($verify.slots.$slot.zebraOptIn -eq $true)) {
      Write-Host "  [OK] slot '$slot' zebraOptIn=true"
    } else {
      Write-Host "  [XX] slot '$slot' did NOT flip (may be absent/null/invalid)" -ForegroundColor Yellow
    }
  }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
if (-not $Live -and -not $SkipInstall) {
  Write-Host "  1. Watch burn-in log for 24h:"
  Write-Host "       Get-Content H:/prism/state/shared/zebra-orchestrator-log.jsonl -Tail 20 -Wait"
  Write-Host "  2. Once decisions look correct, graduate to live mode:"
  Write-Host "       (re-run this launcher with -Live)"
}
Write-Host "  3. Pause without uninstall:    Disable-ScheduledTask -TaskName 'PRISM Zebra Orchestrator'"
Write-Host "  4. Emergency kill (env knob):  set PRISM_ZEBRA_DISABLE=1   (sweep refuses to plan)"
Write-Host "  5. Uninstall task entirely:    & '$InstallerPath' -Uninstall"
Write-Host ""
