# CIMCO fleet sweep -- reaper-safe per-machine driver (U-CIMCO-FLEET-DRIVE all-15).
# A PowerShell loop (NOT a long node process -> not a reapable node orphan) calls PrismCimcoUI.exe
# --op invoke-read per machine; each ~80s call completes under the fleet-reaper's confirm window.
# Writes one raw invoke-read envelope per machine to a JSONL; then `cimco-fleet-drive.mjs
# --from-envelopes` classifies them through the real safety gate (fast, no CIMCO -> also reaper-safe).
#
# Usage: pwsh -File scripts/cimco-fleet-sweep.ps1 [-Limit N] [-Ids "VMC-03,LTH-03"]
param([int]$Limit = 999, [string]$Ids = "")

$ErrorActionPreference = "Continue"
$root = "H:/prism"
$exe  = "$root/mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe"
$map  = Get-Content "$root/state/shared/cimco/jm-fleet-sim-map.json" -Raw | ConvertFrom-Json
$machines = if ($map.machines) { $map.machines } else { $map }
$out  = "$root/state/shared/cimco/fleet-invoke-read-raw.jsonl"
# NC pool: lathe + mill representatives (verified to exist). Units caveat: JM goldens are INCH, CIMCO
# sim machines default mm -> verdicts are sim-conformance only until the .mcfg machine-load is wired.
$ncLathe = "$root/JM DIE/CNC LATHE/9007405.MIN"
$ncMill  = "$root/JM DIE/ROKU-ROKU/TOPURA/CH425-10-PLATE.MIN"
$idFilter = if ($Ids) { $Ids.Split(",") } else { $null }

function Kill-Cimco { Stop-Process -Name CIMCOEdit,PrismCimcoUI,CIMCOSimulation -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 3 }
function Last-JsonLine([string[]]$lines) {
  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    $t = $lines[$i].Trim()
    if ($t.StartsWith("{")) { try { $null = $t | ConvertFrom-Json; return $t } catch { } }
  }
  return $null
}

if (Test-Path $out) { Remove-Item $out -Force }
$driven = 0
foreach ($m in $machines) {
  if ($idFilter -and ($idFilter -notcontains $m.machine_id)) { continue }
  $isEdm = ($m.machine_id -match "(?i)edm") -or ($m.type -match "(?i)edm")
  $mcfg = if ($m.cimcoMatch.file) { $m.cimcoMatch.file } elseif ($m.simMcfg) { $m.simMcfg } else { $null }
  $rec = [ordered]@{ machine_id = $m.machine_id; machine_name = $m.machine_name; type = $m.type; mcfg = $mcfg }
  if ($isEdm) {
    $rec.edm = $true
    ($rec | ConvertTo-Json -Compress -Depth 8) | Add-Content -Path $out
    Write-Host "[sweep] $($m.machine_id) EDM-routed"
    continue
  }
  if ($driven -ge $Limit) { continue }
  $driven++
  $nc = if ($m.type -match "(?i)lathe") { $ncLathe } else { $ncMill }
  Write-Host "[sweep] $($m.machine_id) ($($m.type)) <- $(Split-Path $nc -Leaf)"
  Kill-Cimco
  $raw = & $exe --op invoke-read --name "Machine Simulation" --then "Simulate" --launch --nc $nc --allow-actions --wait 45 --settle 22 2>&1
  Kill-Cimco
  $env = Last-JsonLine ([string[]]($raw | ForEach-Object { "$_" }))
  $rec.nc = $nc
  $rec.envelope = if ($env) { $env | ConvertFrom-Json } else { $null }
  ($rec | ConvertTo-Json -Compress -Depth 12) | Add-Content -Path $out
  $found = if ($rec.envelope) { $rec.envelope.found } else { "no-envelope" }
  Write-Host "      -> found=$found invokeState=$(if($rec.envelope){$rec.envelope.invokeState}else{'-'})"
}
Kill-Cimco
Write-Host "[sweep] DONE -> $out ($driven driven)"
