# =====================================================================
# PRISM System Health 01 - Relocate pagefile to H:\
# =====================================================================
# Problem: C: has only 143 GB free (~92% full). Pagefile is fixed
#   8 GB on C:. Commit limit = RAM (31 GB) + pagefile (8 GB) = 39 GB.
#   System sits at 88% commit usage idle. Any LLM/Claude allocation
#   spike pushes past the limit -> bad_alloc cascade across all apps.
#
# Fix: H: has 2,859 GB free. Move pagefile there. System-managed sizing
#   lets Windows grow it dynamically up to ~3x RAM (~93 GB) when needed.
#
# REQUIRES: Administrator. Reboot after running.
#
# Run via: Right-click PowerShell -> Run as Administrator
#          cd H:\prism\scripts\system-health
#          powershell -ExecutionPolicy Bypass -File .\01-pagefile-relocate.ps1
# =====================================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

Write-Host "=== PRISM Pagefile Relocator ===" -ForegroundColor Cyan
Write-Host ""

# Show current state
Write-Host "Current pagefile config:" -ForegroundColor Yellow
Get-CimInstance Win32_PageFileSetting | Format-List Name, InitialSize, MaximumSize

$cs = Get-CimInstance Win32_ComputerSystem
Write-Host "AutoManaged: $($cs.AutomaticManagedPagefile)"
Write-Host "Total RAM: $([math]::Round($cs.TotalPhysicalMemory/1GB,1)) GB"
Write-Host ""

# Disk space gate
$h = Get-PSDrive -Name H -ErrorAction SilentlyContinue
if (-not $h) { throw "H: drive not found." }
$hFreeGB = [math]::Round($h.Free/1GB, 1)
Write-Host "H: free space: $hFreeGB GB" -ForegroundColor Yellow
if ($hFreeGB -lt 100) {
  throw "H: has < 100 GB free. Free up space before relocating pagefile."
}

Write-Host ""
Write-Host "Plan:" -ForegroundColor Cyan
Write-Host "  1. Disable Windows automatic pagefile management"
Write-Host "  2. Remove existing C:\pagefile.sys setting"
Write-Host "  3. Create H:\pagefile.sys (system-managed, 0/0 = auto-grow)"
Write-Host "  4. Keep a small 4 GB minimum pagefile on C: as crash-dump fallback"
Write-Host ""
$confirm = Read-Host "Proceed? (yes/no)"
if ($confirm -ne 'yes') { Write-Host "Aborted."; exit 0 }

# 1. Disable automatic management
Write-Host "[1/4] Disabling automatic pagefile management..." -ForegroundColor Green
Set-CimInstance -Query "SELECT * FROM Win32_ComputerSystem" -Property @{AutomaticManagedPagefile=$false}

# 2. Remove existing C:\pagefile.sys setting (will recreate smaller below)
Write-Host "[2/4] Removing existing C:\pagefile.sys configuration..." -ForegroundColor Green
$existingC = Get-CimInstance Win32_PageFileSetting -Filter "Name='C:\\pagefile.sys'" -ErrorAction SilentlyContinue
if ($existingC) { Remove-CimInstance -InputObject $existingC }

# 3+4. Write pagefile config via the registry (Win32_PageFileSetting has a known
#      Int/UInt32 coercion bug under New-CimInstance on Windows 11; the registry
#      route is what Windows actually consults at boot, so it's authoritative).
# Format: one MULTI_SZ entry per pagefile, "<path> <initialMB> <maxMB>".
#
# IMPORTANT (2026-05-09): "0 0" (system-managed) does NOT reliably allocate
# H:\pagefile.sys on a secondary drive that isn't online early in boot. We
# verified post-reboot that with `H:\pagefile.sys 0 0`, Windows skipped
# allocation entirely and the commit limit stayed at RAM + C: only.
# Fix: use a fixed minimum size. Windows allocates fixed-size pagefiles
# eagerly during the same boot phase that mounts the drive, so by the time
# any process needs commit headroom the H: pagefile is already there.
#
# 16384 / 65536 = 16 GB initial, 64 GB max. With 31 GB RAM that gives a
# total commit ceiling of 31 + 64 + 4 = 99 GB on demand.
$mmKey = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management'

Write-Host "[3/4] Setting H:\pagefile.sys (16 GB initial / 64 GB max — fixed for eager allocation)..." -ForegroundColor Green
Write-Host "[4/4] Keeping 4 GB crash-dump pagefile on C: via registry..." -ForegroundColor Green

$pagingFiles = @(
  'H:\pagefile.sys 16384 65536'
  'C:\pagefile.sys 4096 4096'
)
Set-ItemProperty -Path $mmKey -Name 'PagingFiles' -Value $pagingFiles -Type MultiString

Write-Host ""
Write-Host "Registry value HKLM:\...\PagingFiles =" -ForegroundColor DarkGray
(Get-ItemProperty -Path $mmKey -Name PagingFiles).PagingFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "=== Done. New configuration: ===" -ForegroundColor Cyan
Get-CimInstance Win32_PageFileSetting | Format-List Name, InitialSize, MaximumSize

Write-Host ""
Write-Host "REBOOT REQUIRED for changes to take effect." -ForegroundColor Red
Write-Host "After reboot, your commit limit will grow from 39 GB to roughly 31 + (auto-grown H pagefile) ~= 60-90 GB on demand."
Write-Host ""
$reboot = Read-Host "Reboot now? (yes/no)"
if ($reboot -eq 'yes') {
  Write-Host "Rebooting in 15 seconds. Cancel with: shutdown /a"
  shutdown /r /t 15 /c "PRISM pagefile relocation complete - rebooting"
}
