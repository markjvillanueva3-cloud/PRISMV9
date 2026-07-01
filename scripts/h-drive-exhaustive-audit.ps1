# h-drive-exhaustive-audit.ps1 — close the gap between our walked total and Windows' reported disk usage.
#
# Runs Windows-native queries that reach into spaces Node's fs.readdirSync can't:
#   - Get-Volume for ground-truth disk size + free space
#   - vssadmin for System Volume Information shadow storage
#   - Get-ChildItem -Force for $Recycle.Bin per user
#   - Get-ChildItem -Force -Recurse for any subtree we missed
#
# Output: H:/prism/state/shared/system-viz/h-drive-exhaustive-audit.json

$ErrorActionPreference = 'Continue'
$OutPath = 'H:\prism\state\shared\system-viz\h-drive-exhaustive-audit.json'

Write-Output 'Phase 1: Volume ground truth...'
$vol = Get-Volume -DriveLetter H -ErrorAction SilentlyContinue
$volume = if ($vol) {
    @{
        size = [int64]$vol.Size
        sizeRemaining = [int64]$vol.SizeRemaining
        sizeUsed = [int64]($vol.Size - $vol.SizeRemaining)
        sizeUsedGB = [Math]::Round(($vol.Size - $vol.SizeRemaining) / 1GB, 2)
        fileSystem = "$($vol.FileSystem)"
        label = "$($vol.FileSystemLabel)"
    }
} else {
    @{ error = 'Get-Volume failed' }
}
Write-Output "  Disk: $($volume.sizeUsedGB) GB used"

Write-Output 'Phase 2: VSS shadow storage...'
$vssOutput = & vssadmin list shadowstorage /for=H: 2>&1 | Out-String
$vssStorage = @{ rawText = $vssOutput }
if ($vssOutput -match 'Used Shadow Copy Storage space:\s*([\d.,]+)\s*(\w+)') {
    $val = [double]($Matches[1] -replace ',','')
    $unit = $Matches[2]
    $multiplier = switch ($unit) {
        'KB' { 1KB }
        'MB' { 1MB }
        'GB' { 1GB }
        'TB' { 1TB }
        default { 1 }
    }
    $vssStorage.usedBytes = [int64]($val * $multiplier)
    $vssStorage.usedGB = [Math]::Round($val * $multiplier / 1GB, 2)
}
if ($vssOutput -match 'Allocated Shadow Copy Storage space:\s*([\d.,]+)\s*(\w+)') {
    $val = [double]($Matches[1] -replace ',','')
    $unit = $Matches[2]
    $multiplier = switch ($unit) {
        'KB' { 1KB }
        'MB' { 1MB }
        'GB' { 1GB }
        'TB' { 1TB }
        default { 1 }
    }
    $vssStorage.allocatedBytes = [int64]($val * $multiplier)
    $vssStorage.allocatedGB = [Math]::Round($val * $multiplier / 1GB, 2)
}
Write-Output "  VSS used: $($vssStorage.usedGB) GB · allocated: $($vssStorage.allocatedGB) GB"

# Fallback: CIM Win32_ShadowStorage (sometimes accessible without admin)
if (-not $vssStorage.usedBytes) {
    try {
        $cim = Get-CimInstance -ClassName Win32_ShadowStorage -ErrorAction Stop |
               Where-Object { $_.Volume -like '*H:*' -or $_.DiffVolume -like '*H:*' }
        if ($cim) {
            $vssStorage.usedBytes = [int64]($cim | Measure-Object -Property UsedSpace -Sum).Sum
            $vssStorage.allocatedBytes = [int64]($cim | Measure-Object -Property AllocatedSpace -Sum).Sum
            $vssStorage.usedGB = [Math]::Round($vssStorage.usedBytes / 1GB, 2)
            $vssStorage.allocatedGB = [Math]::Round($vssStorage.allocatedBytes / 1GB, 2)
            $vssStorage.source = 'CIM Win32_ShadowStorage'
            Write-Output "  CIM fallback: VSS used $($vssStorage.usedGB) GB · allocated $($vssStorage.allocatedGB) GB"
        }
    } catch {
        $vssStorage.cimError = "$($_.Exception.Message)"
    }
}

# Last-resort: infer SVI size from disk-used minus everything else we WILL compute below.
# Done in reconciliation phase. Not here.

Write-Output 'Phase 3: $Recycle.Bin (Windows hides per-user folders, walking with -Force)...'
$recycle = @{ totalBytes = 0; trees = @() }
foreach ($pattern in @('H:\$Recycle.Bin', 'H:\$RECYCLE.BIN')) {
    if (Test-Path $pattern) {
        $size = (Get-ChildItem -Path $pattern -Force -Recurse -ErrorAction SilentlyContinue -File |
                 Measure-Object -Property Length -Sum).Sum
        if ($size -eq $null) { $size = 0 }
        $recycle.totalBytes += [int64]$size
        $recycle.trees += @{ path = $pattern; bytes = [int64]$size; gb = [Math]::Round($size/1GB, 2) }
    }
}
Write-Output "  Recycle Bin: $([Math]::Round($recycle.totalBytes/1GB, 2)) GB"

Write-Output 'Phase 4: System Volume Information (admin-only, capture what we can)...'
$svi = @{ totalBytes = 0; reachable = $false; rawError = '' }
try {
    $sviSize = (Get-ChildItem -Path 'H:\System Volume Information' -Force -Recurse -ErrorAction Stop -File |
                Measure-Object -Property Length -Sum).Sum
    if ($sviSize -ne $null) {
        $svi.totalBytes = [int64]$sviSize
        $svi.reachable = $true
    }
} catch {
    $svi.rawError = "$($_.Exception.Message)"
}
Write-Output "  SVI directly readable: $($svi.reachable) ($([Math]::Round($svi.totalBytes/1GB, 2)) GB visible)"

Write-Output 'Phase 5: Exhaustive node_modules + .git + dist sweep (Get-ChildItem -Force, no depth limit)...'
$skipPatterns = @('node_modules', '.git', 'dist', 'build', '.cache', '.next', '.turbo', '.vercel', '.vite', 'coverage', '.nyc_output', '__pycache__', '.pytest_cache', '.venv', 'venv')
$totalRegen = 0
$treesFound = @()
$rootDirs = Get-ChildItem -Path 'H:\' -Force -Directory -ErrorAction SilentlyContinue
$worktreeRoots = $rootDirs | Where-Object { $_.Name -eq 'prism' -or $_.Name -like 'prism-*' -or $_.Name -eq 'PRISM' }
Write-Output "  scanning $($worktreeRoots.Count) prism worktrees recursively for skip-pattern dirs..."
$dirsFound = @()
foreach ($wt in $worktreeRoots) {
    foreach ($pat in $skipPatterns) {
        $matches = Get-ChildItem -Path $wt.FullName -Force -Directory -Recurse -Filter $pat -ErrorAction SilentlyContinue
        $dirsFound += $matches
    }
}
Write-Output "  found $($dirsFound.Count) skip-pattern dirs"
foreach ($d in $dirsFound) {
    $size = (Get-ChildItem -Path $d.FullName -Force -Recurse -File -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum
    if ($size -eq $null) { $size = 0 }
    $totalRegen += [int64]$size
    $treesFound += @{
        path = $d.FullName
        pattern = $d.Name
        bytes = [int64]$size
        gb = [Math]::Round($size/1GB, 3)
    }
}
Write-Output "  total regenerable: $([Math]::Round($totalRegen/1GB, 2)) GB across $($dirsFound.Count) trees"

Write-Output 'Phase 6: H:/ root dotdirs Node walker skipped...'
$dotDirSizes = @()
foreach ($d in ($rootDirs | Where-Object { $_.Name -like '.*' -and $_.Name -notin @('.claude', '.github', '.claude-octopus') })) {
    $size = (Get-ChildItem -Path $d.FullName -Force -Recurse -File -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum
    if ($size -eq $null) { $size = 0 }
    $dotDirSizes += @{ path = $d.FullName; bytes = [int64]$size; gb = [Math]::Round($size/1GB, 3) }
}

Write-Output 'Phase 7: Per-root size sanity check...'
$rootSizes = @()
foreach ($d in $rootDirs) {
    $size = (Get-ChildItem -Path $d.FullName -Force -Recurse -File -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum
    if ($size -eq $null) { $size = 0 }
    $rootSizes += @{ name = $d.Name; bytes = [int64]$size; gb = [Math]::Round($size/1GB, 2) }
}
$rootSizes = $rootSizes | Sort-Object { -$_.bytes }

# Compute totals + reconciliation
$walkedBytes = 477 * 1GB  # main walk reported 477 GB
$skippedBytes = 9.9 * 1GB # original skipped-tree census
$reconciliation = @{
    diskUsed = $volume.sizeUsed
    mainWalkBytes = [int64]$walkedBytes
    originalSkipBytes = [int64]$skippedBytes
    vssUsedBytes = $vssStorage.usedBytes
    recycleBytes = $recycle.totalBytes
    sviVisibleBytes = $svi.totalBytes
    exhaustiveRegenBytes = $totalRegen
    dotDirsBytes = ($dotDirSizes | ForEach-Object { $_.bytes } | Measure-Object -Sum).Sum
    accountedTotal = ([int64]$walkedBytes + [int64]$totalRegen + [int64]$vssStorage.usedBytes + [int64]$recycle.totalBytes + [int64]$svi.totalBytes + [int64](($dotDirSizes | ForEach-Object { $_.bytes } | Measure-Object -Sum).Sum))
}
$reconciliation.accountedGB = [Math]::Round($reconciliation.accountedTotal / 1GB, 2)
$reconciliation.diskUsedGB = $volume.sizeUsedGB
$reconciliation.unaccountedGB = [Math]::Round(($reconciliation.diskUsed - $reconciliation.accountedTotal) / 1GB, 2)

$audit = @{
    generatedAt = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffZ')
    schemaVersion = '1.0.0'
    volume = $volume
    vssStorage = $vssStorage
    recycleBin = $recycle
    systemVolumeInfo = $svi
    exhaustiveRegen = @{ totalBytes = $totalRegen; treeCount = $dirsFound.Count; trees = ($treesFound | Sort-Object { -$_.bytes } | Select-Object -First 50) }
    dotDirs = $dotDirSizes
    rootSizes = $rootSizes
    reconciliation = $reconciliation
}

$json = $audit | ConvertTo-Json -Depth 10 -Compress
[System.IO.File]::WriteAllText($OutPath, $json, [System.Text.Encoding]::UTF8)

Write-Output ''
Write-Output '=== RECONCILIATION ==='
Write-Output "  Disk total used: $($reconciliation.diskUsedGB) GB"
Write-Output "  Source-of-truth (main walk): $([Math]::Round($walkedBytes/1GB, 2)) GB"
Write-Output "  Regenerable (exhaustive): $([Math]::Round($totalRegen/1GB, 2)) GB"
Write-Output "  VSS shadow storage: $($vssStorage.usedGB) GB"
Write-Output "  Recycle Bin: $([Math]::Round($recycle.totalBytes/1GB, 2)) GB"
Write-Output "  System Volume Info (visible): $([Math]::Round($svi.totalBytes/1GB, 2)) GB"
Write-Output "  Hidden dotdirs: $([Math]::Round((($dotDirSizes | ForEach-Object { $_.bytes } | Measure-Object -Sum).Sum)/1GB, 2)) GB"
Write-Output "  TOTAL ACCOUNTED: $($reconciliation.accountedGB) GB"
Write-Output "  UNACCOUNTED RESIDUAL: $($reconciliation.unaccountedGB) GB"
Write-Output ''
Write-Output "wrote $OutPath"
