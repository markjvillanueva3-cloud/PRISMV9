<#
.SYNOPSIS
  Launches the PRISM web dev server + a cloudflared HTTPS tunnel so a phone can install + test the academy PWA.

.DESCRIPTION
  Service workers + PWA install require HTTPS (except on localhost). This script:
    1. Sets PRISM_PHONE_DEV=1 so vite binds to 0.0.0.0 (LAN-reachable)
    2. Starts `npm run dev` in the web/ directory
    3. Starts `cloudflared tunnel --url http://127.0.0.1:3100` which returns a public HTTPS URL
    4. Prints the URL — open it on the phone, then visit /dev-seed-apprentice.html to log in
       as the dev apprentice, then "Add to Home Screen" from the browser share menu.

  Requires cloudflared to be installed (https://github.com/cloudflare/cloudflared/releases).

.NOTES
  Stop the tunnel + dev server with Ctrl+C in the spawned windows.
#>

param(
  [int]$Port = 3100
)

$ErrorActionPreference = 'Stop'

# Verify cloudflared is reachable
$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
  Write-Host "✗ cloudflared not on PATH." -ForegroundColor Red
  Write-Host "  Install from https://github.com/cloudflare/cloudflared/releases (drop the .exe in H:/Tools/cloudflared/ + add to PATH)."
  exit 1
}

$webDir = Join-Path $PSScriptRoot ".."

Write-Host "→ Launching vite dev server (LAN host + port $Port)…" -ForegroundColor Cyan
$env:PRISM_PHONE_DEV = '1'
$viteJob = Start-Process powershell -ArgumentList "-NoProfile","-NoExit","-Command","cd '$webDir'; `$env:PRISM_PHONE_DEV='1'; npm run dev" -PassThru -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "→ Launching cloudflared HTTPS tunnel → http://127.0.0.1:$Port …" -ForegroundColor Cyan
$tunJob = Start-Process powershell -ArgumentList "-NoProfile","-NoExit","-Command","cloudflared tunnel --url http://127.0.0.1:$Port" -PassThru -WindowStyle Normal

Write-Host ""
Write-Host "Two windows have opened:" -ForegroundColor Yellow
Write-Host "  1. Vite dev server (PID $($viteJob.Id))"
Write-Host "  2. Cloudflared tunnel (PID $($tunJob.Id))"
Write-Host ""
Write-Host "Steps for the phone:" -ForegroundColor Green
Write-Host "  1. Wait for the cloudflared window to print a `*.trycloudflare.com` HTTPS URL."
Write-Host "  2. Open that URL on the phone."
Write-Host "  3. Go to <URL>/dev-seed-apprentice.html and tap 'Seed apprentice'."
Write-Host "  4. From the browser menu, tap 'Add to Home Screen' to install the PWA."
Write-Host "  5. Open PRISM Academy from the home screen."
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the dev server + tunnel when done." -ForegroundColor DarkGray
