# harden-prism-tasks.test.ps1 -- regression test for Get-TaskScript path extraction.
#
# Guards the 2026-06-15 fix (golf): the script-extraction regex in harden-prism-tasks.ps1 must
# isolate the SCRIPT from a preceding FULL-PATH interpreter in BOTH command shapes -- unquoted
# (`H:\Tools\nodejs\node.exe H:\prism\scripts\foo.mjs`) and quoted (`"& 'C:\..\node.exe'
# 'H:\..\foo.mjs'"`). The pre-fix regex [^"] (and the partial [^"']) spanned the space/quote and
# concatenated interpreter+script into a garbage path that fails Test-Path -> the hardener then
# false-DISABLED healthy crash-critical tasks (Zombie Reaper v2, Hermes-Obsidian Bridge, ...).
#
# ZERO-DRIFT: this test reads the ACTUAL regex literal out of the production file and exercises
# THAT -- so it always tests whatever the production code currently uses; a regex regression fails
# the test instead of silently passing.
#
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/harden-prism-tasks.test.ps1
# Exit 0 = all pass; exit 1 = a failure (the message names the case).
$ErrorActionPreference = 'Stop'
$prod = Join-Path $PSScriptRoot 'harden-prism-tasks.ps1'
if (-not (Test-Path -LiteralPath $prod)) { Write-Error "production file not found: $prod"; exit 1 }

# --- Extract the production regex literal from the [regex]::Match(...) call. -------------------
$line = Get-Content -LiteralPath $prod | Where-Object { $_ -match '\[regex\]::Match\(' } | Select-Object -First 1
if (-not $line) { Write-Error "could not find [regex]::Match( line in production file -- has Get-TaskScript moved?"; exit 1 }
# The pattern is the LAST single-quoted string on that line: , '<pattern>')
$mm = [regex]::Match($line, ",\s*'(?<pat>.+)'\)")
if (-not $mm.Success) { Write-Error "could not parse the regex literal out of: $line"; exit 1 }
# Un-double PowerShell single-quote escapes ('' -> ') to get the real regex.
$pattern = $mm.Groups['pat'].Value -replace "''", "'"
Write-Output "Testing production regex: $pattern"

# Mirror of Get-TaskScript's core: first capture of $pattern over "<exec> <args>", or $null.
function Extract([string]$exec, [string]$argstr) {
  $m = [regex]::Match("$exec $argstr", $pattern)
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

# --- Canonical cases: {name; exec; args; expected} --------------------------------------------
$cases = @(
  @{ name='unquoted full-path interpreter (Hermes-Obsidian shape)';
     exec='H:\Tools\nodejs\node.exe'; args='H:\prism\scripts\hermes-obsidian-memory-bridge.mjs';
     expect='H:\prism\scripts\hermes-obsidian-memory-bridge.mjs' },
  @{ name='quoted full-path interpreter (Zombie Reaper v2 shape)';
     exec='powershell.exe';
     args='-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command "& ''C:\Program Files\nodejs\node.exe'' ''H:\PRISM\.claude\hooks\stop_close_prism_nodes_v2.mjs''"';
     expect='H:\PRISM\.claude\hooks\stop_close_prism_nodes_v2.mjs' },
  @{ name='bare interpreter (Fleet Reaper shape)';
     exec='node.exe'; args='H:\PRISM\scripts\fleet-reaper-sweep.mjs --once --json';
     expect='H:\PRISM\scripts\fleet-reaper-sweep.mjs' },
  @{ name='double-quoted script (Zebra shape)';
     exec='H:\Tools\nodejs\node.exe'; args='"H:\PRISM\scripts\zebra-orchestrator-sweep.mjs" --once --json';
     expect='H:\PRISM\scripts\zebra-orchestrator-sweep.mjs' },
  @{ name='ps1 via -File';
     exec='powershell.exe'; args='-NoProfile -ExecutionPolicy Bypass -File H:\prism\.claude\helpers\install-fleet-reaper-task.ps1';
     expect='H:\prism\.claude\helpers\install-fleet-reaper-task.ps1' },
  @{ name='wscript run-hidden then ps1 (Cleanup Orchestrator shape) -- skips the .vbs wrapper, extracts the real .ps1';
     exec='wscript.exe';
     args='//nologo "H:\prism\.claude\helpers\run-hidden.vbs" "powershell.exe" -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\28-cleanup-orchestrator.ps1';
     expect='H:\prism\scripts\system-health\28-cleanup-orchestrator.ps1' },
  @{ name='no script path at all -> null';
     exec='cmd.exe'; args='/c echo hello';
     expect=$null }
)

$pass = 0; $fail = 0; $failNames = @()
foreach ($c in $cases) {
  $got = Extract $c.exec $c.args
  $ok = ($got -eq $c.expect)
  if ($ok) { $pass++; Write-Output ("  PASS  {0}" -f $c.name) }
  else {
    $fail++; $failNames += $c.name
    Write-Output ("  FAIL  {0}`n        expected=[{1}]`n        got     =[{2}]" -f $c.name, $c.expect, $got)
  }
}

# --- Anti-regression assertion: the OLD buggy [^"] regex MUST mis-handle the unquoted case, --
# --- proving this test would actually catch the bug it guards against (R9: a test that can't --
# --- fail when the logic breaks is worthless). ------------------------------------------------
$buggy = '([A-Za-z]:\\[^"]+?\.(?:mjs|js|ps1))'
$bm = [regex]::Match("H:\Tools\nodejs\node.exe H:\prism\scripts\foo.mjs", $buggy)
$buggySpans = $bm.Success -and ($bm.Groups[1].Value -match 'node\.exe')
if ($buggySpans) { Write-Output "  PASS  anti-regression: old [^`"] regex provably spans interpreter+script (bug reproduced)" ; $pass++ }
else { Write-Output "  FAIL  anti-regression: old [^`"] regex did NOT reproduce the span -- test may be vacuous"; $fail++; $failNames += 'anti-regression-vacuity' }

Write-Output ("`n[harden-prism-tasks.test] pass={0} fail={1}" -f $pass, $fail)
if ($fail -gt 0) { Write-Output ("FAILED: {0}" -f ($failNames -join ', ')); exit 1 }
Write-Output 'ALL PASS'
exit 0
