# PRISM — install the canonical CAM-capable Fusion 360 add-in (slot:kilo, CAM-DRIVE-MS0)
# =====================================================================================
# Deploys the repo's fusion360_api_server.py (PORT 18360, CAM /cam/* routes + the
# raw_parameters full-param drive passthrough) as a Fusion 360 add-in named
# "PRISM_Fusion_Drive", so the live :18360 add-in matches what Fusion360LiveBridgeEngine
# (and the prism_cam cam_drive_* actions) target.
#
# WHY: the add-in currently on :18360 is a READ-ONLY extractor (PRISM_API_Server) with no
# /cam write routes; the CAM-capable PRISMBridge moved to :18361 (2026-05-27) and lacks
# raw_parameters. This installs the canonical source so full-param live CAM drive works.
# See memory reference_kilo_fusion_addin_port_fork_2026_05_30.
#
# SAFE: copies a file + writes a manifest. Does NOT start anything, touch any Fusion
# document, or modify delta's PRISMBridge (:18361). You start the add-in from Fusion's UI.
#
# USAGE (from a normal PowerShell — no admin needed):
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/cam-enumerators/install-fusion-drive-addin.ps1
#   (add -SourceRoot H:/prism-slot-kilo to install from this slot worktree instead of main)

param(
  [string]$SourceRoot = "H:/prism",
  [string]$AddInName  = "PRISM_Fusion_Drive"
)

$ErrorActionPreference = "Stop"

$src = Join-Path $SourceRoot "mcp-server/scripts/fusion360-addin/fusion360_api_server.py"
if (-not (Test-Path $src)) { Write-Error "Canonical add-in source not found: $src"; exit 1 }

# Confirm the source actually carries the CAM drive routes + raw_parameters (fail loud if stale).
$srcText = Get-Content $src -Raw
$checks = @{
  "PORT = 18360"        = ($srcText -match "PORT\s*=\s*18360")
  "/cam/operation"      = ($srcText -match "/cam/operation")
  "raw_parameters"      = ($srcText -match "raw_parameters")
  "def run(context)"    = ($srcText -match "def run\(context\)")
  "def stop(context)"   = ($srcText -match "def stop\(context\)")
}
$missing = $checks.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key }
if ($missing) { Write-Error ("Source is missing required markers: " + ($missing -join ", ") + " — wrong/stale file, aborting."); exit 1 }

$addInsDir = Join-Path $env:APPDATA "Autodesk/Autodesk Fusion 360/API/AddIns"
if (-not (Test-Path $addInsDir)) { Write-Error "Fusion AddIns dir not found: $addInsDir (is Fusion 360 installed for this user?)"; exit 1 }

$dst = Join-Path $addInsDir $AddInName
New-Item -ItemType Directory -Force -Path $dst | Out-Null

# Back up any prior copy (never silently overwrite — reversibility).
$pyDst = Join-Path $dst "$AddInName.py"
if (Test-Path $pyDst) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $pyDst (Join-Path $dst "$AddInName.py.bak-$stamp")
}

Copy-Item $src $pyDst -Force

$manifest = @{
  autodeskProduct = "Fusion360"
  type            = "addin"
  id              = "prism-fusion-drive-001"
  author          = "PRISM"
  description     = @{ "" = "PRISM CAM Drive — canonical :18360 add-in (CAM /cam/* create+toolpath+post + raw_parameters full-param drive)" }
  version         = "1.0.0"
  runOnStartup    = $true
  supportedOS     = "windows|mac"
} | ConvertTo-Json -Depth 5
# BOM-FREE write — Fusion silently SKIPS an add-in whose .manifest has a UTF-8 BOM
# (Windows PowerShell `Set-Content -Encoding UTF8` adds one). Working add-ins have none.
[System.IO.File]::WriteAllText((Join-Path $dst "$AddInName.manifest"), $manifest, (New-Object System.Text.UTF8Encoding $false))

Write-Host ""
Write-Host "[OK] Installed canonical add-in -> $dst" -ForegroundColor Green
Write-Host "     PORT 18360 | CAM routes + raw_parameters present (verified)."
Write-Host ""
Write-Host "NEXT — in Fusion 360 (Utilities tab -> ADD-INS -> Scripts and Add-Ins -> Add-Ins tab):" -ForegroundColor Cyan
Write-Host "  1. Select 'PRISM_API_Server' (the read-only :18360 squatter) -> STOP it (and untick 'Run on Startup')."
Write-Host "  2. Click the green '+' if PRISM_Fusion_Drive isn't listed -> point at: $dst"
Write-Host "  3. Select 'PRISM_Fusion_Drive' -> RUN. (Leave delta's 'PRISMBridge' on :18361 alone.)"
Write-Host "  4. Open a SCRATCH document (NOT a JM production part) for the drive test."
Write-Host ""
Write-Host "VERIFY (back in a terminal):" -ForegroundColor Cyan
Write-Host "  curl http://127.0.0.1:18360/health        # should show the new add-in"
Write-Host "  curl http://127.0.0.1:18360/cam/setups     # should return {\"setups\":[],...} NOT 'Unknown GET endpoint'"
Write-Host ""
Write-Host "NOTE: re-run this installer after any edit to the repo add-in (Fusion does not hot-reload; Stop+Run to pick up changes)."
