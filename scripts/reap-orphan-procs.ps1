<#
.SYNOPSIS
  reap-orphan-procs.ps1 — pure-PowerShell reaper for orphaned/wedged PRISM hook processes.

.DESCRIPTION
  The PRISM hook stack spawns ~24 short-lived `node`/`bash` subprocesses per Claude tool call.
  Most exit in milliseconds; a few leak — and when enough leak, Windows runs out of process /
  handle headroom (`ERROR_NO_SYSTEM_RESOURCES` / 0x5AA) and *new* spawns block, so even the
  node-based reaper tasks ("PRISM Zombie Reaper v2", "PRISM Node Orphan Cleaner") can't launch.
  At that point Claude tool calls hang for hours.

  This reaper is deliberately PURE PowerShell — `Get-CimInstance` + `Stop-Process` are in-process,
  it spawns NO child processes, and `powershell.exe` lives at a fixed system path that always
  exists. So it keeps working even when the machine is already too exhausted to spawn `node`.
  It is registered as a 5-minute Windows Scheduled Task by `install-orphan-reaper-task.ps1`, which
  means it runs whether or not any Claude session is alive — a watchdog can't depend on the thing
  it's watching.

  What it kills (conservative — hooks declare ≤10s timeouts, so these ages are way past any
  legitimate run):
    - bash.exe whose command line references `.claude/hooks` or `.claude/helpers` AND is older than 60s
    - bash.exe whose PARENT pid is dead AND is older than 60s (orphaned shell), unless it's a known
      long-running watcher (phase15 / daemon-supervisor)
    - node.exe whose command line references `.claude/hooks` or `.claude/helpers` AND is older than 120s

  What it NEVER touches: the PRISM MCP server (`dist/index.js`), Claude Code itself, language servers,
  Playwright MCP, vitest/tsx test workers, any non-hook node, git younger than 10 minutes, anything
  younger than its threshold, and itself. (vitest/tsx workers are handled by the node-orphan-cleaner
  task; this one stays narrowly on hook-stack leaks.)

.PARAMETER DryRun
  Report what would be killed; kill nothing.

.PARAMETER SelfTest
  Run the classification logic against synthetic process records; exit 0 if all pass, 2 otherwise.

.PARAMETER Quiet
  Suppress console output (still logs kills to state/shared/orphan-reaper.log). Used by the scheduled task.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\reap-orphan-procs.ps1 -DryRun
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\reap-orphan-procs.ps1 -SelfTest
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$SelfTest,
  [switch]$Quiet
)

# --- thresholds (seconds) ---------------------------------------------------
$BashHookAgeS   = 60      # a hook bash-wrapper alive >1min is definitively stuck
$BashOrphanAgeS = 60      # a parentless shell alive >1min is abandoned
$NodeHookAgeS   = 120     # a hook/helper node alive >2min is stuck
$GitHungAgeS    = 600     # a git.exe alive >10min is hung (git commands finish in seconds)

$LogFile = 'H:\prism\state\shared\orphan-reaper.log'
$LogCapBytes = 256KB
$WatchdogCmdAllow = 'phase15|daemon-supervisor|emit-all-spec-html'   # never reap these even if orphaned

function Write-ReaperLog([string]$Message) {
  try {
    $dir = Split-Path $LogFile -Parent
    if (-not (Test-Path $dir)) { return }
    if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt $LogCapBytes)) {
      $tail = Get-Content $LogFile -Tail 200 -ErrorAction SilentlyContinue
      Set-Content -Path $LogFile -Value $tail -ErrorAction SilentlyContinue
    }
    Add-Content -Path $LogFile -Value ("[{0:yyyy-MM-ddTHH:mm:ssZ}] {1}" -f (Get-Date).ToUniversalTime(), $Message) -ErrorAction SilentlyContinue
  } catch {
    # logging is best-effort — a watchdog must never throw because telemetry failed
  }
}

# --- classification: should a process with these attributes be reaped? ------
function Test-ShouldReap([string]$Name, [string]$CommandLine, [double]$AgeSeconds, [bool]$ParentAlive) {
  $cmd = if ($null -ne $CommandLine) { $CommandLine } else { '' }
  $isHookProc = ($cmd -match '\.claude[\\/](hooks|helpers)')
  if ($Name -ieq 'bash.exe') {
    if ($isHookProc -and $AgeSeconds -gt $BashHookAgeS) { return $true }
    if ((-not $ParentAlive) -and $AgeSeconds -gt $BashOrphanAgeS -and ($cmd -notmatch $WatchdogCmdAllow)) { return $true }
    return $false
  }
  if ($Name -ieq 'node.exe') {
    # Hook/helper node procs only. Everything else (MCP server dist/index.js, Claude Code, LSP,
    # Playwright MCP, vitest, tsx) is explicitly out of scope for this reaper.
    if ($isHookProc -and $AgeSeconds -gt $NodeHookAgeS) { return $true }
    return $false
  }
  if ($Name -ieq 'git.exe') {
    if ($AgeSeconds -gt $GitHungAgeS) { return $true }
    return $false
  }
  return $false
}

# --- self-test --------------------------------------------------------------
function Invoke-SelfTest {
  $cases = @(
    @{ name='bash.exe'; cmd='C:\Program Files\Git\bin\bash.exe -c "portable-node H:/prism/.claude/hooks/foo.mjs"'; age=120;  pa=$true;  expect=$true;  why='stuck hook bash (>60s)' },
    @{ name='bash.exe'; cmd='C:\Program Files\Git\bin\bash.exe -c "portable-node H:/prism/.claude/hooks/foo.mjs"'; age=8;    pa=$true;  expect=$false; why='fresh hook bash — let it run' },
    @{ name='bash.exe'; cmd='C:\Program Files\Git\usr\bin\bash.exe /tmp/phase15-watch.sh';                          age=99999;pa=$true;  expect=$false; why='legit watcher, not a hook' },
    @{ name='bash.exe'; cmd='C:\Program Files\Git\usr\bin\bash.exe /tmp/phase15-watch.sh';                          age=99999;pa=$false; expect=$false; why='orphaned but on the watchdog-allow list' },
    @{ name='bash.exe'; cmd='C:\Program Files\Git\usr\bin\bash.exe -c "some user command"';                         age=5;    pa=$false; expect=$false; why='orphan but fresh — give it a moment' },
    @{ name='bash.exe'; cmd='C:\Program Files\Git\usr\bin\bash.exe -c "some user command"';                         age=200;  pa=$false; expect=$true;  why='orphaned shell, parent long dead' },
    @{ name='bash.exe'; cmd='bash.exe -c "npm run build"';                                                          age=45;   pa=$true;  expect=$false; why='legit long command, not a hook' },
    @{ name='node.exe'; cmd='H:\Tools\nodejs\node.exe H:/prism/.claude/helpers/per-agent-handoff.mjs read';          age=300;  pa=$true;  expect=$true;  why='stuck hook-helper node (>120s)' },
    @{ name='node.exe'; cmd='H:\Tools\nodejs\node.exe H:/prism/.claude/hooks/foo.mjs';                               age=30;   pa=$true;  expect=$false; why='fresh hook node — let it run' },
    @{ name='node.exe'; cmd='C:\Program Files\nodejs\node.exe H:\prism\mcp-server\dist\index.js';                    age=99999;pa=$false; expect=$false; why='MCP SERVER — never kill (even orphaned)' },
    @{ name='node.exe'; cmd='node';                                                                                 age=99999;pa=$false; expect=$false; why='Claude Code itself — never kill' },
    @{ name='node.exe'; cmd='H:\Tools\nodejs\node.exe ...node_modules\@playwright\mcp\dist\index.js';                age=99999;pa=$true;  expect=$false; why='Playwright MCP — not a hook' },
    @{ name='node.exe'; cmd='H:\Tools\nodejs\node.exe node_modules\vitest\vitest.mjs run';                           age=300;  pa=$true;  expect=$false; why='vitest — owned by the node-orphan-cleaner task, not this one' },
    @{ name='node.exe'; cmd='H:\Tools\nodejs\node.exe --import tsx scripts\emit-all-spec-html.ts';                   age=300;  pa=$true;  expect=$false; why='a project script run via tsx — not a hook' },
    @{ name='git.exe';  cmd='C:\Program Files\Git\cmd\git.exe log --follow';                                         age=30;   pa=$true;  expect=$false; why='git running normally' },
    @{ name='git.exe';  cmd='C:\Program Files\Git\cmd\git.exe log --follow';                                         age=900;  pa=$false; expect=$true;  why='hung git (>10min)' }
  )
  $fails = 0
  foreach ($c in $cases) {
    $got = Test-ShouldReap $c.name $c.cmd ([double]$c.age) ([bool]$c.pa)
    $ok = ($got -eq $c.expect)
    if (-not $ok) { $fails++ }
    if (-not $Quiet -or -not $ok) {
      $tag = if ($ok) { 'PASS' } else { 'FAIL' }
      "{0}  {1,-9} age={2,-6}s parentAlive={3,-6} -> reap={4,-6} (expect {5})   # {6}" -f $tag, $c.name, $c.age, $c.pa, $got, $c.expect, $c.why
    }
  }
  if ($fails -gt 0) { Write-Host "SELF-TEST FAILED: $fails/$($cases.Count)"; exit 2 }
  Write-Host "SELF-TEST PASSED: $($cases.Count)/$($cases.Count)"
  exit 0
}

if ($SelfTest) { Invoke-SelfTest }

# --- live reap --------------------------------------------------------------
$me = $PID
$now = Get-Date
$all = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
$aliveSet = New-Object 'System.Collections.Generic.HashSet[int]'
foreach ($p in $all) { [void]$aliveSet.Add([int]$p.ProcessId) }

$checked = 0
$killed = 0
$details = New-Object System.Collections.Generic.List[string]
foreach ($p in $all) {
  $n = $p.Name
  if ($n -ine 'bash.exe' -and $n -ine 'node.exe' -and $n -ine 'git.exe') { continue }
  if ([int]$p.ProcessId -eq $me) { continue }
  $checked++
  $ageS = if ($null -ne $p.CreationDate) { ($now - $p.CreationDate).TotalSeconds } else { 99999 }
  $parentAlive = $aliveSet.Contains([int]$p.ParentProcessId)
  if (Test-ShouldReap $n $p.CommandLine ([double]$ageS) ([bool]$parentAlive)) {
    $cmdShort = if ($null -ne $p.CommandLine) { ($p.CommandLine -replace '\s+', ' ') } else { '<none>' }
    if ($cmdShort.Length -gt 160) { $cmdShort = $cmdShort.Substring(0, 160) + '…' }
    $line = "{0} pid={1} ppid={2}(alive={3}) age={4}s cmd={5}" -f $n, $p.ProcessId, $p.ParentProcessId, $parentAlive, [math]::Round($ageS), $cmdShort
    if ($DryRun) {
      $details.Add("WOULD-KILL $line"); $killed++
    } else {
      try {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
        $details.Add("KILLED $line"); $killed++
      } catch {
        $details.Add("FAILED-TO-KILL $line :: $($_.Exception.Message)")
      }
    }
  }
}

$dryTag = if ($DryRun) { ' (dry-run)' } else { '' }
$summary = "reap-orphan-procs: checked=$checked killed=$killed$dryTag"
if ($killed -gt 0 -or $details.Count -gt 0) {
  Write-ReaperLog $summary
  foreach ($d in $details) { Write-ReaperLog "  $d" }
}
if (-not $Quiet) {
  Write-Host $summary
  foreach ($d in $details) { Write-Host "  $d" }
}
exit 0
