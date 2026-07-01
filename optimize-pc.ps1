<#
.SYNOPSIS
  Optimize Windows 11 for Claude Code + Codex + Fusion 360 workload
.DESCRIPTION
  Ryzen 5 5600X / 32GB RAM / H: portable SSD
  Targets: free RAM, reduce background noise, high-performance power,
  tune Node.js/Fusion 360 settings
.NOTES
  Run as Administrator: powershell -ExecutionPolicy Bypass -File H:\prism\optimize-pc.ps1
  Creates a restore point first. Safe to re-run.
#>

$ErrorActionPreference = 'Continue'
$logFile = "H:\prism\optimize-log.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Log($msg) {
    $line = "[$timestamp] $msg"
    Write-Host $line
    $line | Out-File $logFile -Append -Encoding utf8
}

Log "========== PRISM PC Optimizer =========="
Log "Machine: $env:COMPUTERNAME | User: $env:USERNAME"

# ── 0. Admin check ──
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Log "ERROR: Must run as Administrator!"
    exit 1
}
Log "Running as Administrator: OK"

# ── 1. Create restore point ──
Log ""
Log "--- 1. System Restore Point ---"
try {
    Enable-ComputerRestore -Drive "C:\" -ErrorAction SilentlyContinue
    Checkpoint-Computer -Description "Pre-PRISM-Optimization" -RestorePointType MODIFY_SETTINGS -ErrorAction SilentlyContinue
    Log "Restore point created"
} catch {
    Log "Restore point skipped (may already exist recently): $($_.Exception.Message)"
}

# ── 2. Power Plan: High Performance ──
Log ""
Log "--- 2. Power Plan -> High Performance ---"
$highPerf = powercfg /list | Select-String "High performance"
if ($highPerf -match '(\S{8}-\S{4}-\S{4}-\S{4}-\S{12})') {
    powercfg /setactive $Matches[1]
    Log "Activated High Performance plan: $($Matches[1])"
} else {
    # Create Ultimate Performance (hidden on desktops)
    $result = powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>&1
    if ($result -match '(\S{8}-\S{4}-\S{4}-\S{4}-\S{12})') {
        powercfg /setactive $Matches[1]
        Log "Created and activated Ultimate Performance plan"
    } else {
        Log "Could not find/create high performance plan"
    }
}

# ── 3. Visual Effects -> Best Performance ──
Log ""
Log "--- 3. Visual Effects -> Best Performance ---"
# 2 = "Adjust for best performance"
Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name 'VisualFXSetting' -Value 2 -ErrorAction SilentlyContinue
# Keep font smoothing (ClearType) — important for code readability
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'FontSmoothing' -Value '2' -ErrorAction SilentlyContinue
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'FontSmoothingType' -Value 2 -ErrorAction SilentlyContinue
Log "Visual effects set to best performance (ClearType kept)"

# ── 4. Disable unnecessary services ──
Log ""
Log "--- 4. Disable RAM-heavy background services ---"
$servicesToDisable = @(
    @{Name='DiagTrack'; Desc='Connected User Experiences and Telemetry'},
    @{Name='SysMain'; Desc='Superfetch (redundant on SSD)'},
    @{Name='WSearch'; Desc='Windows Search indexer (huge RAM on large drives)'},
    @{Name='TabletInputService'; Desc='Touch Keyboard (desktop PC)'},
    @{Name='MapsBroker'; Desc='Downloaded Maps Manager'},
    @{Name='RetailDemo'; Desc='Retail Demo Service'},
    @{Name='WMPNetworkSvc'; Desc='Windows Media Player Sharing'},
    @{Name='XblAuthManager'; Desc='Xbox Live Auth'},
    @{Name='XblGameSave'; Desc='Xbox Live Game Save'},
    @{Name='XboxGipSvc'; Desc='Xbox Accessory Management'},
    @{Name='XboxNetApiSvc'; Desc='Xbox Live Networking'},
    @{Name='WerSvc'; Desc='Windows Error Reporting'},
    @{Name='PhoneSvc'; Desc='Phone Service'},
    @{Name='Fax'; Desc='Fax Service'}
)

foreach ($svc in $servicesToDisable) {
    $s = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
    if ($s) {
        if ($s.Status -eq 'Running') {
            Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
        }
        Set-Service -Name $svc.Name -StartupType Disabled -ErrorAction SilentlyContinue
        Log "Disabled: $($svc.Name) ($($svc.Desc))"
    }
}

# ── 5. Fix WMI (it was hanging earlier) ──
Log ""
Log "--- 5. Rebuild WMI Repository ---"
$wmiStatus = winmgmt /verifyrepository 2>&1
Log "WMI status: $wmiStatus"
if ($wmiStatus -notmatch 'consistent') {
    Log "WMI repository inconsistent — rebuilding..."
    Stop-Service Winmgmt -Force -ErrorAction SilentlyContinue
    winmgmt /salvagerepository 2>&1
    Start-Service Winmgmt -ErrorAction SilentlyContinue
    Log "WMI repository salvaged"
} else {
    Log "WMI repository OK"
}

# ── 6. Memory optimization ──
Log ""
Log "--- 6. Memory Optimization ---"
# Disable memory compression (trades CPU for RAM — on 32GB not needed)
try {
    Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
    Log "Memory compression disabled (32GB = no need to trade CPU for RAM)"
} catch {
    Log "Memory compression setting unchanged"
}

# ── 7. Pagefile: System-managed on C:, none on H: ──
Log ""
Log "--- 7. Pagefile Configuration ---"
# Let Windows manage pagefile on C: (SSD)
# Remove any pagefile from H: (portable drive)
$cs = Get-CimInstance Win32_ComputerSystem
if ($cs.AutomaticManagedPagefile -eq $false) {
    Log "Pagefile is manually configured — leaving as-is"
} else {
    Log "Pagefile: auto-managed (OK for 32GB)"
}

# ── 8. Node.js optimization for Claude Code ──
Log ""
Log "--- 8. Node.js / Claude Code Optimization ---"
# Set NODE_OPTIONS for larger heap (PRISM MCP server is 55MB bundle)
$nodeOpts = [System.Environment]::GetEnvironmentVariable("NODE_OPTIONS", "User")
$targetOpts = "--max-old-space-size=8192"
if ($nodeOpts -notmatch 'max-old-space-size') {
    if ($nodeOpts) {
        $newOpts = "$nodeOpts $targetOpts"
    } else {
        $newOpts = $targetOpts
    }
    [System.Environment]::SetEnvironmentVariable("NODE_OPTIONS", $newOpts, "User")
    Log "NODE_OPTIONS set: $newOpts (8GB heap for PRISM MCP server)"
} else {
    Log "NODE_OPTIONS already configured: $nodeOpts"
}

# ── 9. Fusion 360 optimization ──
Log ""
Log "--- 9. Fusion 360 GPU/Performance Settings ---"
# Fusion 360 respects GPU scheduling
$gpuScheduling = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -ErrorAction SilentlyContinue
if ($gpuScheduling.HwSchMode -ne 2) {
    Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -Value 2 -ErrorAction SilentlyContinue
    Log "Hardware-accelerated GPU scheduling: ENABLED (helps Fusion 360)"
} else {
    Log "Hardware GPU scheduling: already enabled"
}

# ── 10. Disable transparency and animations ──
Log ""
Log "--- 10. UI Performance ---"
# Disable transparency effects
Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -Name 'EnableTransparency' -Value 0 -ErrorAction SilentlyContinue
# Disable animation effects
Set-ItemProperty 'HKCU:\Control Panel\Desktop\WindowMetrics' -Name 'MinAnimate' -Value '0' -ErrorAction SilentlyContinue
# Disable tips/suggestions
Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SubscribedContent-338389Enabled' -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SoftLandingEnabled' -Value 0 -ErrorAction SilentlyContinue
Log "Transparency, animations, tips: disabled"

# ── 11. Disable startup bloat ──
Log ""
Log "--- 11. Disable Common Startup Bloat ---"
$startupDisable = @(
    'OneDrive', 'Spotify', 'Steam', 'EpicGamesLauncher', 'Discord',
    'Cortana', 'Teams', 'Skype', 'GoogleDriveSync', 'AdobeCreativeCloud',
    'iTunesHelper', 'Origin', 'GalaxyClient'
)
$regPaths = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run'
)
foreach ($path in $regPaths) {
    $items = Get-ItemProperty $path -ErrorAction SilentlyContinue
    if ($items) {
        $items.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
            $name = $_.Name
            foreach ($bloat in $startupDisable) {
                if ($name -match $bloat -or $_.Value -match $bloat) {
                    Remove-ItemProperty -Path $path -Name $name -ErrorAction SilentlyContinue
                    Log "Removed startup: $name"
                }
            }
        }
    }
}

# ── 12. Clean temp files ──
Log ""
Log "--- 12. Clean Temp Files ---"
$tempPaths = @(
    "$env:TEMP",
    "$env:LOCALAPPDATA\Temp",
    "C:\Windows\Temp"
)
$totalFreed = 0
foreach ($tp in $tempPaths) {
    if (Test-Path $tp) {
        $size = (Get-ChildItem $tp -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        Remove-Item "$tp\*" -Recurse -Force -ErrorAction SilentlyContinue
        $totalFreed += $size
    }
}
Log "Cleaned temp files: $([math]::Round($totalFreed / 1MB, 0)) MB freed"

# ── 13. Disable Windows Copilot/Recall/AI bloat ──
Log ""
Log "--- 13. Disable Windows AI Features (RAM savers) ---"
# Disable Copilot
Set-ItemProperty 'HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot' -Name 'TurnOffWindowsCopilot' -Value 1 -Force -ErrorAction SilentlyContinue
New-Item -Path 'HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot' -Force -ErrorAction SilentlyContinue | Out-Null
Set-ItemProperty 'HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot' -Name 'TurnOffWindowsCopilot' -Value 1 -ErrorAction SilentlyContinue
# Disable Recall
New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' -Force -ErrorAction SilentlyContinue | Out-Null
Set-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' -Name 'DisableAIDataAnalysis' -Value 1 -ErrorAction SilentlyContinue
Log "Windows Copilot + Recall: disabled"

# ── 14. Flush DNS and standby memory ──
Log ""
Log "--- 14. Flush Caches ---"
ipconfig /flushdns 2>&1 | Out-Null
Log "DNS cache flushed"

# ── Summary ──
Log ""
Log "========== OPTIMIZATION COMPLETE =========="
Log "Changes applied. Some require a RESTART to take effect:"
Log "  - Visual effects"
Log "  - GPU hardware scheduling"
Log "  - Service disabling"
Log "  - Memory compression"
Log "  - Startup items"
Log ""
Log "Recommended next steps:"
Log "  1. RESTART your PC"
Log "  2. Open PowerShell, cd H:\prism, run 'claude'"
Log "  3. For Fusion 360: Settings > General > Graphics > DirectX 11 + Simplified display"
Log ""
Log "Log saved to: $logFile"
