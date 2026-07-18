# SFC elevated deploy -- bounce the SYSTEM-owned :3100 daemon so it reloads the freshly-built dist.
# Launched via Start-Process -Verb RunAs (UAC). Logs to sfc-deploy-elevated.log for the non-elevated session to read.
$ErrorActionPreference = 'SilentlyContinue'
$log = 'H:\prism\state\outcomes\sfc-deploy-elevated.log'
"=== SFC elevated deploy $(Get-Date) ===" | Out-File -FilePath $log
function L($m) { "$((Get-Date).ToString('HH:mm:ss')) $m" | Out-File -FilePath $log -Append }

$id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$elev = ([System.Security.Principal.WindowsPrincipal]::new($id)).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
L "identity=$($id.Name) elevated=$elev"

$o = (Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
L "serving pid=$o"
if ($o) {
  try { Stop-Process -Id $o -Force -ErrorAction Stop; L "killed $o" }
  catch { L "kill failed: $($_.Exception.Message)" }
}

# Prefer the SYSTEM supervisor/watchdog to respawn (keeps the daemon SYSTEM-owned) from the new dist.
$up = $false
for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep -Seconds 3
  try {
    $h = Invoke-RestMethod 'http://127.0.0.1:3100/health' -TimeoutSec 4
    if ($h.status -eq 'healthy') { L "respawned uptime_s=$($h.uptime_seconds)"; $up = $true; break }
  } catch {}
}
if (-not $up) {
  L "supervisor did not respawn in ~36s -> guard --fix fallback"
  Set-Location 'H:\prism'
  & node scripts/singleton-service-guard.mjs --fix *>> $log
  Start-Sleep -Seconds 6
}

# Verify the fix is live: 1045 mill should flip from stale 66.8 to in-band ~200.
try {
  $body = '{"material":"1045","iso_group":"P","operation":"milling","cut_type":"roughing","tool_diameter_mm":12,"flutes":4,"tool_material":"carbide","axial_depth_mm":6,"radial_depth_mm":6,"tool_stickout_mm":36,"machine_name":"VMC-03","machine_power_kw":22.4,"machine_max_rpm":8100,"coolant_type":"flood"}'
  $r = Invoke-RestMethod 'http://127.0.0.1:3100/api/v1/speed-feed/orchestrate' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 25
  $vc = $r.result.value.cutting_speed_mpm
  $verdict = if ($vc -ge 110 -and $vc -le 200) { 'IN-BAND -- FIX DEPLOYED' } else { "still $vc" }
  L "LIVE Vc=$vc  $verdict"
} catch { L "SFC verify failed: $($_.Exception.Message)" }
L "=== done ==="
