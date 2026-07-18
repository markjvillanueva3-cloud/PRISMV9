# hide-visible-prism-tasks.ps1 - IMMEDIATE in-place fix for popup windows.
#
# Updates the live `PRISM *` scheduled tasks so their actions no longer flash
# a console on every fire. Does NOT need elevation when the tasks are owned
# by the current user. Idempotent - re-running on an already-hidden task is a
# no-op.
#
# Strategy:
#   - powershell.exe action: prepend `-NonInteractive -WindowStyle Hidden` to
#     the existing arguments (if not already present).
#   - node.exe / cmd.exe action: wrap via `powershell.exe -NoProfile
#     -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command
#     "& 'original.exe' 'arg1' 'arg2' ..."`. Original executable runs
#     unchanged; only the launcher console is suppressed.
#
# Why this works:
#   PowerShell's -WindowStyle Hidden suppresses the console window. node.exe
#   and cmd.exe both ALWAYS allocate a visible console under an Interactive
#   principal; wrapping them through hidden PS hides the parent console, and
#   the child inherits "no console" semantics.
#
# This is reversible: re-running the canonical installer (or
# ensure-all-watchdogs.ps1) re-registers the original action. Use this when
# you can't get an elevated shell but need the popups to stop NOW.

[CmdletBinding()]
param(
  [string]$Filter = 'PRISM*',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host $msg }
function Write-Action($msg) { Write-Host ("  " + $msg) }

# Parse a Windows command-line into an argv-style list (quote-respecting).
# Used to take an existing node.exe / cmd.exe action's argument string and
# emit it as PowerShell single-quoted argv entries inside `& exe arg1 arg2`.
function ConvertFrom-CommandLine($raw) {
  if (-not $raw) { return @() }
  $out = New-Object System.Collections.Generic.List[string]
  $cur = New-Object System.Text.StringBuilder
  $inQuotes = $false
  $i = 0
  while ($i -lt $raw.Length) {
    $c = $raw[$i]
    if ($c -eq '"') {
      # Toggle quote state. A doubled '""' inside quotes is a literal quote
      # (we don't need to handle that for our installers - they use simple
      # path strings - but we keep the logic conservative).
      if ($inQuotes -and ($i + 1) -lt $raw.Length -and $raw[$i + 1] -eq '"') {
        [void]$cur.Append('"')
        $i += 2
        continue
      }
      $inQuotes = -not $inQuotes
      $i++
      continue
    }
    if ($c -eq ' ' -and -not $inQuotes) {
      if ($cur.Length -gt 0) {
        $out.Add($cur.ToString()) | Out-Null
        [void]$cur.Clear()
      }
      $i++
      continue
    }
    [void]$cur.Append($c)
    $i++
  }
  if ($cur.Length -gt 0) { $out.Add($cur.ToString()) | Out-Null }
  return ,$out.ToArray()
}

# Quote a single argv entry for PowerShell single-quoted invocation.
# A single-quote inside the value becomes '' (PS-style escape).
function Escape-PsSingleQuoted($s) {
  return "'" + ($s -replace "'", "''") + "'"
}

# Build the truly-invisible wscript+vbs wrapper for a node.exe action.
# Why wscript over powershell: powershell.exe -WindowStyle Hidden still
# allocates a conhost before hiding it (1-frame flash). wscript.exe NEVER
# allocates a console. The .vbs forwards argv to Shell.Run windowStyle=0,
# spawning the target with no console at all.
$probe = Join-Path $PSScriptRoot '..\.claude\helpers\run-hidden.vbs'
if (Test-Path $probe) {
  $VBS_LAUNCHER = (Resolve-Path $probe).Path
} elseif (Test-Path 'H:\prism\.claude\helpers\run-hidden.vbs') {
  $VBS_LAUNCHER = 'H:\prism\.claude\helpers\run-hidden.vbs'
} else {
  throw "run-hidden.vbs not found. Expected at .claude\helpers\run-hidden.vbs"
}

function Build-HiddenWrapper($origExe, $origArgs) {
  $argv = ConvertFrom-CommandLine $origArgs
  # wscript.exe args: //nologo "<vbs-path>" "<orig-exe>" <arg1> <arg2> ...
  # Each argv token quoted only if it contains whitespace.
  $parts = @('//nologo', ('"' + $VBS_LAUNCHER + '"'), ('"' + $origExe + '"'))
  foreach ($a in $argv) {
    if ($a -match '\s') {
      $parts += ('"' + $a + '"')
    } else {
      $parts += $a
    }
  }
  return @{
    Execute   = 'wscript.exe'
    Arguments = ($parts -join ' ')
  }
}

# Patch an existing PowerShell action to include hidden flags if missing.
function Patch-PowerShellAction($argStr) {
  if ($argStr -match 'WindowStyle\s+Hidden') { return $argStr }
  # Insert after `-NoProfile` if present, else at the very start.
  if ($argStr -match '^\s*-NoProfile\b') {
    return ($argStr -replace '^\s*-NoProfile\b', '-NoProfile -NonInteractive -WindowStyle Hidden')
  }
  return ('-NoProfile -NonInteractive -WindowStyle Hidden ' + $argStr.TrimStart())
}

$tasks = Get-ScheduledTask -TaskName $Filter -ErrorAction SilentlyContinue
if (-not $tasks) {
  Write-Info "No tasks matched filter '$Filter'."
  return
}

$updated = 0
$skipped = 0
$failed  = 0

foreach ($t in $tasks) {
  $tn = $t.TaskName
  $orig = $t.Actions[0]
  if (-not $orig) {
    Write-Info "[skip] $tn - no Action[0]"
    $skipped++
    continue
  }
  $exe  = ($orig.Execute -as [string]) ; if (-not $exe) { $exe = '' }
  $argStr = ($orig.Arguments -as [string]); if (-not $argStr) { $argStr = '' }
  $exeLeaf = ($exe -split '[\\/]')[-1]

  $newExe = $null
  $newArgs = $null
  $reason = $null

  if ($exeLeaf -ieq 'wscript.exe' -or $exeLeaf -ieq 'cscript.exe') {
    # Already using WSH - the truly-invisible launcher. Skip.
    Write-Info "[skip] $tn - already using wscript/cscript (zero-allocation hidden)"
    $skipped++
    continue
  } elseif ($exeLeaf -ieq 'powershell.exe' -or $exeLeaf -ieq 'pwsh.exe') {
    # PS-hidden tasks still flash a conhost briefly before -WindowStyle Hidden
    # kicks in. Upgrade them to wscript+vbs (zero allocation). Detect a
    # previous PS-hidden run-hidden.vbs wrap is impossible since wscript wraps
    # never use powershell as Execute - so any PS task is upgrade-eligible.
    # We need to reconstruct the underlying command. For -File <script> args:
    # treat the script as the orig exe (powershell.exe runs it; wscript+vbs
    # can launch powershell.exe directly too - same effect, no conhost flash).
    # For -Command "& 'exe' 'arg1'..." wraps from a prior pass: unwrap to
    # recover the inner exe+argv (we wrote them, so we can parse them).
    $innerExe = $null
    $innerArgs = @()
    if ($argStr -match '-Command\s+"&\s+''([^'']+)''\s*(.*)"$') {
      $innerExe = $matches[1]
      $rest = $matches[2]
      # Each remaining single-quoted token is an argv entry.
      $rxArg = "'([^']*)'"
      $mc = [regex]::Matches($rest, $rxArg)
      foreach ($m in $mc) { $innerArgs += $m.Groups[1].Value }
    } elseif ($argStr -match '-File\s+"?([^"]+\.ps1)"?(?:\s+(.*))?$') {
      # Run powershell.exe with -File <script>; pass through unchanged.
      $innerExe = $exe   # powershell.exe
      # Strip out any -WindowStyle Hidden / -NonInteractive we previously added.
      $cleaned = $argStr -replace '\s*-NonInteractive\s+', ' ' -replace '\s*-WindowStyle\s+Hidden\s+', ' '
      $innerArgs = ConvertFrom-CommandLine $cleaned
    } else {
      # Unknown shape - fall back to wrapping the whole PS invocation as-is.
      $innerExe = $exe
      $innerArgs = ConvertFrom-CommandLine $argStr
    }
    # Build a synthetic argStr for the wrapper.
    $reconArgs = @()
    foreach ($a in $innerArgs) {
      if ($a -match '\s') { $reconArgs += ('"' + $a + '"') } else { $reconArgs += $a }
    }
    $w = Build-HiddenWrapper $innerExe ($reconArgs -join ' ')
    $newExe = $w.Execute
    $newArgs = $w.Arguments
    $reason = 'upgraded PS-hidden to wscript+vbs (zero conhost allocation)'
  } elseif ($exeLeaf -ieq 'cmd.exe') {
    # cmd.exe with '/c "..."' embeds redirect operators (>>, 2>&1) inside the
    # /c string. Argv-splitting it would scatter the operators into separate
    # tokens that cmd no longer treats as redirects, breaking the task's
    # logging. The canonical fix is the installer-level rewrite (cmd->PS with
    # '*>>') which has already been applied to install-synergy-watch-task.ps1.
    # Re-run that installer (elevated or not) to apply: it overwrites the
    # registered task with the fixed action.
    Write-Info "[skip] $tn - cmd.exe action: re-run the canonical installer instead (installer already patched)."
    $skipped++
    continue
  } elseif ($exeLeaf -ieq 'node.exe' -or $exeLeaf -ieq 'wscript.exe' -or $exeLeaf -ieq 'cscript.exe') {
    $w = Build-HiddenWrapper $exe $argStr
    $newExe = $w.Execute
    $newArgs = $w.Arguments
    $reason = "wrapped $exeLeaf via hidden PowerShell"
  } else {
    Write-Info "[skip] $tn - exe '$exeLeaf' not in {powershell,pwsh,node,cmd,wscript,cscript}"
    $skipped++
    continue
  }

  Write-Info "[fix]  $tn"
  Write-Action ("from: " + $exeLeaf + ' ' + ($argStr.Substring(0, [Math]::Min(80, $argStr.Length))))
  $newExeLeaf = ($newExe -split '[\\/]')[-1]
  Write-Action ("to:   " + $newExeLeaf + ' ' + ($newArgs.Substring(0, [Math]::Min(100, $newArgs.Length))))
  Write-Action ("why:  " + $reason)

  if ($DryRun) {
    $updated++
    continue
  }

  try {
    $newAction = New-ScheduledTaskAction -Execute $newExe -Argument $newArgs
    # Set-ScheduledTask replaces only the field passed; we pass the new action.
    Set-ScheduledTask -TaskName $tn -Action $newAction | Out-Null
    $updated++
  } catch {
    Write-Action ("FAIL: " + $_.Exception.Message)
    $failed++
  }
}

Write-Info ""
Write-Info ("Summary: updated=$updated  skipped=$skipped  failed=$failed  (DryRun=$DryRun)")
