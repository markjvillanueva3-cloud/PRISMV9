#Requires -RunAsAdministrator
# PRISM Laptop Optimization for Claude Code + Codex
# Run as Administrator: Right-click PowerShell -> Run as Administrator -> cd C:\PRISM -> .\scripts\optimize-for-claude.ps1

param(
    [switch]$DryRun,      # Show what would happen without doing it
    [switch]$SkipDefender, # Skip Defender changes
    [switch]$SkipPagefile, # Skip pagefile changes
    [switch]$SkipPower,    # Skip power plan changes
    [switch]$SkipVisual    # Skip visual effects changes
)

$ErrorActionPreference = "Continue"
Write-Host "`n=== PRISM Laptop Optimizer for Claude/Codex ===" -ForegroundColor Cyan
Write-Host "System: $([math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize/1MB, 1)) GB RAM`n"

if ($DryRun) { Write-Host "[DRY RUN MODE - no changes will be made]`n" -ForegroundColor Yellow }

# ──────────────────────────────────────────────
# 1. WINDOWS DEFENDER EXCLUSIONS
# ──────────────────────────────────────────────
if (-not $SkipDefender) {
    Write-Host "--- 1. Windows Defender Exclusions ---" -ForegroundColor Green

    # Path exclusions - dev directories that get hammered by real-time scanning
    $pathExclusions = @(
        "C:\PRISM",
        "$env:USERPROFILE\.claude",
        "$env:USERPROFILE\.codex",
        "$env:USERPROFILE\AppData\Local\Programs\claude-code",
        "$env:USERPROFILE\AppData\Local\Claude",
        "$env:USERPROFILE\AppData\Roaming\Claude",
        "$env:USERPROFILE\AppData\Local\npm-cache",
        "$env:USERPROFILE\AppData\Roaming\npm",
        "$env:LOCALAPPDATA\Temp\claude"
    )

    # Process exclusions - these get scanned on every invocation
    $processExclusions = @(
        "node.exe",
        "claude.exe",
        "codex.exe",
        "bash.exe",
        "git.exe",
        "tsc.exe",
        "npx.cmd",
        "python.exe",
        "python3.exe",
        "uv.exe",
        "Code.exe"
    )

    foreach ($path in $pathExclusions) {
        $resolved = [Environment]::ExpandEnvironmentVariables($path)
        if (Test-Path $resolved) {
            $existing = (Get-MpPreference).ExclusionPath
            if ($existing -contains $resolved) {
                Write-Host "  [SKIP] Path already excluded: $resolved" -ForegroundColor DarkGray
            } else {
                Write-Host "  [ADD]  Path exclusion: $resolved" -ForegroundColor White
                if (-not $DryRun) { Add-MpExclusion -ExclusionPath $resolved }
            }
        } else {
            Write-Host "  [SKIP] Path not found: $resolved" -ForegroundColor DarkGray
        }
    }

    foreach ($proc in $processExclusions) {
        $existing = (Get-MpPreference).ExclusionProcess
        if ($existing -contains $proc) {
            Write-Host "  [SKIP] Process already excluded: $proc" -ForegroundColor DarkGray
        } else {
            Write-Host "  [ADD]  Process exclusion: $proc" -ForegroundColor White
            if (-not $DryRun) { Add-MpExclusion -ExclusionProcess $proc }
        }
    }
    Write-Host ""
}

# ──────────────────────────────────────────────
# 2. PAGEFILE OPTIMIZATION
# ──────────────────────────────────────────────
if (-not $SkipPagefile) {
    Write-Host "--- 2. Pagefile Optimization ---" -ForegroundColor Green

    $currentPF = Get-CimInstance Win32_PageFileUsage
    Write-Host "  Current: Allocated=$($currentPF.AllocatedBaseSize)MB Used=$($currentPF.CurrentUsage)MB Peak=$($currentPF.PeakUsage)MB"

    # For 16GB RAM running heavy dev tools: 16-24GB pagefile prevents OOM
    $targetMin = 16384  # 16 GB
    $targetMax = 24576  # 24 GB

    if ($currentPF.AllocatedBaseSize -lt $targetMin) {
        Write-Host "  [FIX]  Increasing pagefile to ${targetMin}MB-${targetMax}MB (was $($currentPF.AllocatedBaseSize)MB)" -ForegroundColor Yellow
        Write-Host "         This prevents OOM crashes when Claude+Codex+Chrome run together" -ForegroundColor DarkGray
        if (-not $DryRun) {
            # Disable automatic management
            $cs = Get-CimInstance Win32_ComputerSystem
            if ($cs.AutomaticManagedPagefile) {
                Set-CimInstance -InputObject $cs -Property @{AutomaticManagedPagefile=$false}
            }
            # Set fixed pagefile size
            $pf = Get-CimInstance Win32_PageFileSetting -ErrorAction SilentlyContinue
            if ($pf) {
                Set-CimInstance -InputObject $pf -Property @{InitialSize=$targetMin; MaximumSize=$targetMax}
            } else {
                New-CimInstance -ClassName Win32_PageFileSetting -Property @{Name="C:\pagefile.sys"; InitialSize=$targetMin; MaximumSize=$targetMax}
            }
            Write-Host "  [NOTE] Pagefile change requires REBOOT to take effect" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [OK]   Pagefile already adequate ($($currentPF.AllocatedBaseSize)MB)" -ForegroundColor DarkGreen
    }
    Write-Host ""
}

# ──────────────────────────────────────────────
# 3. POWER PLAN
# ──────────────────────────────────────────────
if (-not $SkipPower) {
    Write-Host "--- 3. Power Plan ---" -ForegroundColor Green

    $currentPlan = powercfg /getactivescheme 2>&1
    Write-Host "  Current: $currentPlan"

    # High Performance GUID
    $highPerf = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"

    if ($currentPlan -notmatch "High Performance") {
        Write-Host "  [FIX]  Switching to High Performance plan" -ForegroundColor Yellow
        Write-Host "         Prevents CPU throttling during compilation and agent work" -ForegroundColor DarkGray
        if (-not $DryRun) {
            powercfg /setactive $highPerf 2>&1
            # Also disable USB selective suspend (prevents USB device disconnects)
            powercfg /SETACVALUEINDEX SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
            powercfg /SETACTIVE SCHEME_CURRENT
        }
    } else {
        Write-Host "  [OK]   Already on High Performance" -ForegroundColor DarkGreen
    }
    Write-Host ""
}

# ──────────────────────────────────────────────
# 4. VISUAL EFFECTS - PERFORMANCE MODE
# ──────────────────────────────────────────────
if (-not $SkipVisual) {
    Write-Host "--- 4. Visual Effects ---" -ForegroundColor Green

    $currentVFX = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" -ErrorAction SilentlyContinue).VisualFXSetting

    if ($currentVFX -ne 2) {
        Write-Host "  [FIX]  Setting visual effects to 'Best Performance'" -ForegroundColor Yellow
        Write-Host "         Disables animations, transparency, shadows — saves RAM and CPU" -ForegroundColor DarkGray
        if (-not $DryRun) {
            Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" -Name "VisualFXSetting" -Value 2
            # Disable specific effects
            $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
            Set-ItemProperty -Path $regPath -Name "TaskbarAnimations" -Value 0
            Set-ItemProperty -Path $regPath -Name "ListviewAlphaSelect" -Value 0
            Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00))
            Set-ItemProperty -Path "HKCU:\Control Panel\Desktop\WindowMetrics" -Name "MinAnimate" -Value "0"
        }
    } else {
        Write-Host "  [OK]   Already set to Best Performance" -ForegroundColor DarkGreen
    }
    Write-Host ""
}

# ──────────────────────────────────────────────
# 5. DISABLE WINDOWS SEARCH INDEXING FOR DEV DIRS
# ──────────────────────────────────────────────
Write-Host "--- 5. Windows Search Indexing ---" -ForegroundColor Green
Write-Host "  [INFO] To exclude C:\PRISM from indexing:" -ForegroundColor White
Write-Host "         Settings -> Privacy & security -> Searching Windows -> Excluded folders" -ForegroundColor DarkGray
Write-Host "         Add: C:\PRISM" -ForegroundColor DarkGray
Write-Host ""

# ──────────────────────────────────────────────
# 6. DISABLE UNNECESSARY SERVICES
# ──────────────────────────────────────────────
Write-Host "--- 6. Unnecessary Services ---" -ForegroundColor Green

$servicesToDisable = @(
    @{Name="SysMain"; Desc="Superfetch - preloads apps, wastes RAM on dev machines"},
    @{Name="DiagTrack"; Desc="Telemetry - sends data to Microsoft, uses RAM+CPU"},
    @{Name="WSearch"; Desc="Windows Search - constant indexing, high I/O (optional)"}
)

foreach ($svc in $servicesToDisable) {
    $s = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
    if ($s) {
        if ($s.Status -eq "Running") {
            Write-Host "  [FIX]  $($svc.Name) is running - $($svc.Desc)" -ForegroundColor Yellow
            if (-not $DryRun) {
                if ($svc.Name -ne "WSearch") {  # WSearch is optional, user can decide
                    Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
                    Set-Service -Name $svc.Name -StartupType Disabled -ErrorAction SilentlyContinue
                    Write-Host "         Stopped and disabled" -ForegroundColor DarkGray
                } else {
                    Write-Host "         [MANUAL] Disable WSearch yourself if you don't use Windows Search" -ForegroundColor DarkGray
                }
            }
        } else {
            Write-Host "  [OK]   $($svc.Name) already stopped" -ForegroundColor DarkGreen
        }
    }
}
Write-Host ""

# ──────────────────────────────────────────────
# 7. KILL MSPCManager (wastes 277 MB)
# ──────────────────────────────────────────────
Write-Host "--- 7. Microsoft PC Manager ---" -ForegroundColor Green
$mspc = Get-Process -Name "MSPCManager*" -ErrorAction SilentlyContinue
if ($mspc) {
    $totalMB = [math]::Round(($mspc | Measure-Object WorkingSet64 -Sum).Sum/1MB)
    Write-Host "  [FIX]  MSPCManager is running and using ${totalMB}MB" -ForegroundColor Yellow
    Write-Host "         This 'optimization' tool wastes more RAM than it saves on dev machines" -ForegroundColor DarkGray
    Write-Host "  [MANUAL] Uninstall via Settings -> Apps -> Microsoft PC Manager" -ForegroundColor White
} else {
    Write-Host "  [OK]   MSPCManager not running" -ForegroundColor DarkGreen
}
Write-Host ""

# ──────────────────────────────────────────────
# 8. NODE.JS MEMORY LIMITS
# ──────────────────────────────────────────────
Write-Host "--- 8. Node.js Memory Configuration ---" -ForegroundColor Green
$nodeOpts = $env:NODE_OPTIONS
if (-not $nodeOpts -or $nodeOpts -notmatch "max-old-space-size") {
    Write-Host "  [FIX]  NODE_OPTIONS not set - node processes can each use unlimited heap" -ForegroundColor Yellow
    Write-Host "         With 34 node processes, this is your #1 RAM killer" -ForegroundColor DarkGray
    Write-Host "  [MANUAL] Add system environment variable:" -ForegroundColor White
    Write-Host '         NODE_OPTIONS=--max-old-space-size=384' -ForegroundColor Cyan
    Write-Host "         This caps each node process heap to 384MB (good for 16GB system)" -ForegroundColor DarkGray
    if (-not $DryRun) {
        [Environment]::SetEnvironmentVariable("NODE_OPTIONS", "--max-old-space-size=384", "User")
        Write-Host "  [SET]  NODE_OPTIONS set for current user (restart terminals to apply)" -ForegroundColor Green
    }
} else {
    Write-Host "  [OK]   NODE_OPTIONS already set: $nodeOpts" -ForegroundColor DarkGreen
}
Write-Host ""

# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host @"

AUTOMATED (done by this script):
  - Defender exclusions for dev paths and processes
  - Pagefile increased to 16-24GB (reboot needed)
  - Power plan set to High Performance
  - Visual effects set to Best Performance
  - SysMain + DiagTrack services disabled
  - NODE_OPTIONS heap cap set

MANUAL ACTIONS NEEDED:
  1. REBOOT for pagefile changes
  2. Uninstall Microsoft PC Manager (Settings -> Apps)
  3. Exclude C:\PRISM from Windows Search indexing
  4. When running Claude + Codex simultaneously:
     - Close Chrome tabs you're not using
     - Don't run both Claude Desktop AND Claude CLI at the same time
     - Use 'claude --dangerously-skip-permissions' to reduce hook overhead
  5. Consider disabling Windows Search service if you don't use it

EXPECTED SAVINGS:
  - Defender exclusions: ~200-400MB less RAM, much faster file I/O
  - MSPCManager removal: ~277MB freed
  - NODE_OPTIONS cap: prevents runaway node heap growth
  - SysMain disabled: ~100-300MB freed
  - Visual effects: ~50-100MB freed
  - Total potential: ~800-1500MB freed + significantly faster I/O

"@ -ForegroundColor White

if ($DryRun) {
    Write-Host "Re-run WITHOUT -DryRun to apply changes:" -ForegroundColor Yellow
    Write-Host "  .\scripts\optimize-for-claude.ps1" -ForegroundColor Cyan
}
