#Requires -RunAsAdministrator
# PRISM Phase 2 Optimization — Startup Bloat, Services, GPU, Scheduling
# Run as Admin: powershell -ExecutionPolicy Bypass -File C:\PRISM\scripts\optimize-phase2.ps1

param(
    [switch]$DryRun,
    [switch]$SkipStartup,
    [switch]$SkipServices,
    [switch]$SkipGPU,
    [switch]$SkipScheduledTasks,
    [switch]$SkipMisc
)

$ErrorActionPreference = "Continue"
Write-Host "`n=== PRISM Phase 2 Optimizer ===" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) { Write-Host "[DRY RUN — no changes]`n" -ForegroundColor Yellow }

# ──────────────────────────────────────────────
# 1. DISABLE STARTUP BLOAT
# ──────────────────────────────────────────────
if (-not $SkipStartup) {
    Write-Host "--- 1. Startup Bloat Removal ---" -ForegroundColor Green
    Write-Host "  Disabling auto-start for apps not needed during development`n" -ForegroundColor DarkGray

    $startupDisable = @(
        @{Name="Steam"; RegName="Steam"; Why="Game launcher — start manually when gaming"},
        @{Name="EA Desktop"; RegName="EADM"; Why="Game launcher — start manually when gaming"},
        @{Name="Epic Games"; RegName="EpicGamesLauncher"; Why="Game launcher — start manually when gaming"},
        @{Name="Discord"; RegName="Discord"; Why="Chat app — start manually when needed"},
        @{Name="Adobe Sync"; RegName="Adobe Acrobat Synchronizer"; Why="PDF cloud sync — not needed for dev"},
        @{Name="Teams"; RegName="Teams"; Why="Start manually when needed for meetings"},
        @{Name="Logitech Hub"; RegName="LGHUB"; Why="Mouse/keyboard software — runs fine without tray icon"}
    )

    $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    foreach ($item in $startupDisable) {
        $val = Get-ItemProperty -Path $regPath -Name $item.RegName -ErrorAction SilentlyContinue
        if ($val) {
            Write-Host "  [DISABLE] $($item.Name) — $($item.Why)" -ForegroundColor Yellow
            if (-not $DryRun) {
                # Move to a backup key instead of deleting
                $backupPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunDisabled"
                if (-not (Test-Path $backupPath)) { New-Item -Path $backupPath -Force | Out-Null }
                $origValue = (Get-ItemProperty -Path $regPath -Name $item.RegName).$($item.RegName)
                Set-ItemProperty -Path $backupPath -Name $item.RegName -Value $origValue
                Remove-ItemProperty -Path $regPath -Name $item.RegName -ErrorAction SilentlyContinue
            }
        } else {
            Write-Host "  [OK]      $($item.Name) — not in startup" -ForegroundColor DarkGreen
        }
    }

    # Google Drive and Box — keep if user actively uses them, but flag
    Write-Host ""
    Write-Host "  [REVIEW] Google Drive FS and Box are startup items." -ForegroundColor Cyan
    Write-Host "           They sync files continuously, using RAM + I/O." -ForegroundColor DarkGray
    Write-Host "           Disable manually if you don't need constant sync:" -ForegroundColor DarkGray
    Write-Host "           Settings -> Apps -> Startup -> toggle off" -ForegroundColor DarkGray

    # Autodesk Access — keep since user has Fusion 360
    Write-Host "  [KEEP]   Autodesk Access — needed for Fusion 360 license" -ForegroundColor DarkGreen
    Write-Host ""
}

# ──────────────────────────────────────────────
# 2. DISABLE UNNECESSARY SERVICES
# ──────────────────────────────────────────────
if (-not $SkipServices) {
    Write-Host "--- 2. Unnecessary Services ---" -ForegroundColor Green

    $servicesToDisable = @(
        @{Name="SysMain"; Why="Superfetch — preloads apps, thrashes RAM on dev machines"},
        @{Name="DiagTrack"; Why="Microsoft telemetry — constant CPU + disk + network"},
        @{Name="MapsBroker"; Why="Downloads offline maps — not needed"},
        @{Name="lfsvc"; Why="Geolocation service — not needed for dev"},
        @{Name="WerSvc"; Why="Windows Error Reporting — sends crash data to Microsoft"},
        @{Name="XblAuthManager"; Why="Xbox Live auth — not needed during dev"},
        @{Name="XblGameSave"; Why="Xbox cloud game saves — not needed during dev"},
        @{Name="XboxGipSvc"; Why="Xbox accessory management — not needed during dev"},
        @{Name="XboxNetApiSvc"; Why="Xbox networking — not needed during dev"},
        @{Name="PhoneSvc"; Why="Phone Link service — disable if not using Phone Link"},
        @{Name="dmwappushservice"; Why="WAP Push messaging telemetry"},
        @{Name="TrkWks"; Why="Distributed Link Tracking — rarely needed"},
        @{Name="RmSvc"; Why="Radio Management — airplane mode service"},
        @{Name="AdobeARMservice"; Why="Adobe auto-updater — check manually instead"},
        @{Name="wisvc"; Why="Windows Insider service — not needed unless on Insider builds"}
    )

    foreach ($svc in $servicesToDisable) {
        $s = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
        if ($s -and $s.Status -eq 'Running') {
            Write-Host "  [STOP]   $($svc.Name) — $($svc.Why)" -ForegroundColor Yellow
            if (-not $DryRun) {
                Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
                Set-Service -Name $svc.Name -StartupType Disabled -ErrorAction SilentlyContinue
            }
        } elseif ($s -and $s.StartType -ne 'Disabled') {
            Write-Host "  [DISABLE] $($svc.Name) (not running, preventing future start)" -ForegroundColor DarkYellow
            if (-not $DryRun) {
                Set-Service -Name $svc.Name -StartupType Disabled -ErrorAction SilentlyContinue
            }
        } else {
            Write-Host "  [OK]     $($svc.Name) — already disabled or not present" -ForegroundColor DarkGreen
        }
    }

    # WSearch gets special treatment — suggest but don't force
    $ws = Get-Service -Name "WSearch" -ErrorAction SilentlyContinue
    if ($ws -and $ws.Status -eq 'Running') {
        Write-Host "  [REVIEW] WSearch (Windows Search) is running" -ForegroundColor Cyan
        Write-Host "           Disabling saves ~100MB RAM + significant I/O" -ForegroundColor DarkGray
        Write-Host "           But you lose Start Menu file search. Use Everything app instead." -ForegroundColor DarkGray
        if (-not $DryRun) {
            Stop-Service -Name "WSearch" -Force -ErrorAction SilentlyContinue
            Set-Service -Name "WSearch" -StartupType Disabled -ErrorAction SilentlyContinue
            Write-Host "  [DONE]   WSearch stopped and disabled" -ForegroundColor Green
        }
    }
    Write-Host ""
}

# ──────────────────────────────────────────────
# 3. GPU OPTIMIZATION
# ──────────────────────────────────────────────
if (-not $SkipGPU) {
    Write-Host "--- 3. GPU Optimization (RTX 2070) ---" -ForegroundColor Green

    # 3a. Enable Hardware-Accelerated GPU Scheduling (reduces CPU overhead)
    $gpuSched = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -ErrorAction SilentlyContinue
    if (-not $gpuSched -or $gpuSched.HwSchMode -ne 2) {
        Write-Host "  [ENABLE] Hardware-Accelerated GPU Scheduling" -ForegroundColor Yellow
        Write-Host "           Reduces CPU overhead for GPU tasks — frees CPU for node.js/tsc" -ForegroundColor DarkGray
        if (-not $DryRun) {
            Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -Value 2
            Write-Host "           Requires REBOOT to take effect" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  [OK]     GPU scheduling already enabled" -ForegroundColor DarkGreen
    }

    # 3b. Set NVIDIA power management to "Prefer Maximum Performance"
    Write-Host "  [INFO]   Set NVIDIA power management to 'Prefer Maximum Performance'" -ForegroundColor White
    Write-Host "           NVIDIA Control Panel -> Manage 3D Settings -> Power management mode" -ForegroundColor DarkGray
    Write-Host "           This prevents GPU clock throttling during compute tasks" -ForegroundColor DarkGray

    # 3c. Enable GPU-accelerated rendering in Windows Terminal
    $wtSettings = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
    if (Test-Path $wtSettings) {
        $wt = Get-Content $wtSettings -Raw | ConvertFrom-Json
        if (-not $wt.rendering -or $wt.rendering.graphicsAPI -ne "direct3d11") {
            Write-Host "  [ENABLE] Windows Terminal GPU rendering (Direct3D 11)" -ForegroundColor Yellow
            Write-Host "           Faster text rendering, reduces CPU load for terminal output" -ForegroundColor DarkGray
            if (-not $DryRun) {
                if (-not $wt.rendering) {
                    $wt | Add-Member -NotePropertyName "rendering" -NotePropertyValue @{graphicsAPI="direct3d11"; useAtlasEngine=$true}
                } else {
                    $wt.rendering | Add-Member -NotePropertyName "graphicsAPI" -NotePropertyValue "direct3d11" -Force
                    $wt.rendering | Add-Member -NotePropertyName "useAtlasEngine" -NotePropertyValue $true -Force
                }
                $wt | ConvertTo-Json -Depth 10 | Set-Content $wtSettings
            }
        } else {
            Write-Host "  [OK]     Windows Terminal already using GPU rendering" -ForegroundColor DarkGreen
        }
    } else {
        Write-Host "  [SKIP]   Windows Terminal settings not found" -ForegroundColor DarkGray
    }

    # 3d. Chrome hardware acceleration check
    Write-Host "  [INFO]   Ensure Chrome hardware acceleration is ON:" -ForegroundColor White
    Write-Host "           chrome://settings/system -> 'Use hardware acceleration when available'" -ForegroundColor DarkGray
    Write-Host "           This offloads page rendering from CPU to your RTX 2070" -ForegroundColor DarkGray

    Write-Host ""
}

# ──────────────────────────────────────────────
# 4. DISABLE HEAVY SCHEDULED TASKS
# ──────────────────────────────────────────────
if (-not $SkipScheduledTasks) {
    Write-Host "--- 4. Scheduled Tasks ---" -ForegroundColor Green

    $tasksToDisable = @(
        @{Name="Microsoft Compatibility Appraiser Exp"; Path="\Microsoft\Windows\Application Experience\"},
        @{Name="Consolidator"; Path="\Microsoft\Windows\Customer Experience Improvement Program\"},
        @{Name="UsbCeip"; Path="\Microsoft\Windows\Customer Experience Improvement Program\"},
        @{Name="MapsToastTask"; Path="\Microsoft\Windows\Maps\"},
        @{Name="SpeechModelDownloadTask"; Path="\Microsoft\Windows\Speech\"},
        @{Name="SustainabilityTelemetry"; Path="\Microsoft\Windows\Sustainability\"},
        @{Name="XblGameSaveTask"; Path="\Microsoft\XblGameSave\"},
        @{Name="MareBackup"; Path="\Microsoft\Windows\Application Experience\"},
        @{Name="Proxy"; Path="\Microsoft\Windows\Autochk\"}
    )

    foreach ($task in $tasksToDisable) {
        $t = Get-ScheduledTask -TaskName $task.Name -TaskPath $task.Path -ErrorAction SilentlyContinue
        if ($t -and $t.State -ne 'Disabled') {
            Write-Host "  [DISABLE] $($task.Name)" -ForegroundColor Yellow
            if (-not $DryRun) {
                Disable-ScheduledTask -TaskName $task.Name -TaskPath $task.Path -ErrorAction SilentlyContinue | Out-Null
            }
        } else {
            Write-Host "  [OK]      $($task.Name) — already disabled or not found" -ForegroundColor DarkGreen
        }
    }

    # ScheduledDefrag — change to manual only
    $defrag = Get-ScheduledTask -TaskName "ScheduledDefrag" -ErrorAction SilentlyContinue
    if ($defrag -and $defrag.State -ne 'Disabled') {
        Write-Host "  [DISABLE] ScheduledDefrag — SSDs don't need defrag, and it hurts I/O during dev" -ForegroundColor Yellow
        if (-not $DryRun) {
            Disable-ScheduledTask -TaskName "ScheduledDefrag" -TaskPath "\Microsoft\Windows\Defrag\" -ErrorAction SilentlyContinue | Out-Null
        }
    }
    Write-Host ""
}

# ──────────────────────────────────────────────
# 5. MISC PERFORMANCE TWEAKS
# ──────────────────────────────────────────────
if (-not $SkipMisc) {
    Write-Host "--- 5. Misc Performance ---" -ForegroundColor Green

    # 5a. Disable Game DVR / Game Bar (steals GPU + CPU in background)
    $gameBar = Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -ErrorAction SilentlyContinue
    $gameDVR = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Name "AllowGameDVR" -ErrorAction SilentlyContinue
    if (-not $gameDVR -or $gameDVR.AllowGameDVR -ne 0) {
        Write-Host "  [DISABLE] Game DVR / Game Bar — steals GPU cycles in background" -ForegroundColor Yellow
        if (-not $DryRun) {
            # User-level
            if (-not (Test-Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR")) {
                New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Force | Out-Null
            }
            Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Value 0
            # Policy-level
            if (-not (Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR")) {
                New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Force | Out-Null
            }
            Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Name "AllowGameDVR" -Value 0
        }
    } else {
        Write-Host "  [OK]      Game DVR already disabled" -ForegroundColor DarkGreen
    }

    # 5b. Disable transparency effects (saves GPU + RAM)
    $transp = Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -ErrorAction SilentlyContinue
    if (-not $transp -or $transp.EnableTransparency -ne 0) {
        Write-Host "  [DISABLE] Transparency effects — saves GPU + compositing RAM" -ForegroundColor Yellow
        if (-not $DryRun) {
            Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -Value 0
        }
    } else {
        Write-Host "  [OK]      Transparency already disabled" -ForegroundColor DarkGreen
    }

    # 5c. Disable notification center / tips
    Write-Host "  [DISABLE] Windows Tips and Suggestions" -ForegroundColor Yellow
    if (-not $DryRun) {
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Value 0 -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-310093Enabled" -Value 0 -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SoftLandingEnabled" -Value 0 -ErrorAction SilentlyContinue
    }

    # 5d. Disable hibernation (frees disk space = pagefile size of RAM)
    $hibFile = Test-Path "$env:SystemDrive\hiberfil.sys"
    if ($hibFile) {
        Write-Host "  [DISABLE] Hibernation — frees ~16GB disk space for pagefile headroom" -ForegroundColor Yellow
        if (-not $DryRun) {
            powercfg /hibernate off
        }
    } else {
        Write-Host "  [OK]      Hibernation already disabled" -ForegroundColor DarkGreen
    }

    # 5e. Set process priority for development tools
    Write-Host "  [INFO]   Consider setting high priority for node.exe:" -ForegroundColor White
    Write-Host "           Task Manager -> Details -> node.exe -> Set Priority -> Above Normal" -ForegroundColor DarkGray

    # 5f. Disable Delivery Optimization (P2P Windows Update sharing)
    $doSvc = Get-Service -Name "DoSvc" -ErrorAction SilentlyContinue
    if ($doSvc -and $doSvc.Status -eq 'Running') {
        Write-Host "  [STOP]   Delivery Optimization — P2P update sharing uses bandwidth + CPU" -ForegroundColor Yellow
        if (-not $DryRun) {
            Stop-Service -Name "DoSvc" -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host ""
}

# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────
Write-Host "=== PHASE 2 COMPLETE ===" -ForegroundColor Cyan
Write-Host @"

STARTUP DISABLED:
  Steam, EA Desktop, Epic Games, Discord, Adobe Sync, Teams, Logitech Hub
  (backed up to HKCU:\...\RunDisabled — re-enable anytime)

SERVICES DISABLED:
  SysMain, DiagTrack, WSearch, MapsBroker, Geolocation, WER, Xbox (4),
  Phone Link, WAP Push, Link Tracking, Radio Mgmt, Adobe Updater

GPU OPTIMIZED:
  Hardware GPU Scheduling enabled (reboot needed)
  Windows Terminal GPU rendering enabled

SCHEDULED TASKS DISABLED:
  Telemetry, CEIP, Maps, Speech, Xbox saves, Defrag, Compatibility

MISC:
  Game DVR disabled, Transparency off, Hibernation off, Tips off

MANUAL STEPS REMAINING:
  1. REBOOT for GPU scheduling + pagefile changes
  2. NVIDIA Control Panel -> Power mode -> Prefer Maximum Performance
  3. Chrome: chrome://settings/system -> Hardware acceleration ON
  4. Settings -> Apps -> Startup -> disable Google Drive / Box if not needed
  5. Uninstall Microsoft PC Manager (Settings -> Apps)

ESTIMATED SAVINGS AFTER REBOOT:
  RAM: 500-1000MB freed from services + startup apps
  CPU: 5-15% less background load
  I/O: Significantly less disk thrashing (no indexing, no telemetry, no defrag)
  GPU: Available for terminal rendering + Chrome offload

"@ -ForegroundColor White

if ($DryRun) {
    Write-Host "Re-run WITHOUT -DryRun to apply:" -ForegroundColor Yellow
    Write-Host "  .\scripts\optimize-phase2.ps1" -ForegroundColor Cyan
}
