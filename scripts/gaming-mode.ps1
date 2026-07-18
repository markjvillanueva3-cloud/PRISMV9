# Toggle gaming mode — re-enables Steam/Epic/EA/Discord at startup
# Usage: .\scripts\gaming-mode.ps1 on|off

param([Parameter(Mandatory)][ValidateSet("on","off")]$Mode)

$runPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$backupPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunDisabled"
$apps = @("Steam", "EADM", "EpicGamesLauncher", "Discord")

if ($Mode -eq "on") {
    Write-Host "Enabling gaming startup apps..." -ForegroundColor Green
    foreach ($name in $apps) {
        $val = Get-ItemProperty -Path $backupPath -Name $name -ErrorAction SilentlyContinue
        if ($val) {
            Set-ItemProperty -Path $runPath -Name $name -Value $val.$name
            Write-Host "  [ON] $name"
        }
    }
    Write-Host "`nGaming apps will start on next boot. Run '.\scripts\gaming-mode.ps1 off' to disable." -ForegroundColor Cyan
} else {
    Write-Host "Disabling gaming startup apps (dev mode)..." -ForegroundColor Yellow
    foreach ($name in $apps) {
        $val = Get-ItemProperty -Path $runPath -Name $name -ErrorAction SilentlyContinue
        if ($val) {
            if (-not (Test-Path $backupPath)) { New-Item -Path $backupPath -Force | Out-Null }
            Set-ItemProperty -Path $backupPath -Name $name -Value $val.$name
            Remove-ItemProperty -Path $runPath -Name $name
            Write-Host "  [OFF] $name"
        }
    }
    Write-Host "`nGaming apps disabled. Run '.\scripts\gaming-mode.ps1 on' to re-enable." -ForegroundColor Cyan
}
