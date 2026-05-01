# Check a real material file (not MASTER_INDEX) for M-0 merge status
$sample = Get-ChildItem 'C:\PRISM\data\materials\P_STEELS' -Filter '*.json' -File | Select-Object -First 1
Write-Output ("SAMPLE P_STEELS: {0}" -f $sample.FullName)
$raw = [System.IO.File]::ReadAllText($sample.FullName)
$raw = $raw.TrimStart([char]0xFEFF)
$json = $raw | ConvertFrom-Json
if ($json -is [array]) { $first = $json[0] } else { $first = $json }

Write-Output ("  ID: {0}" -f $first.id)
Write-Output ("  Name: {0}" -f $first.name)
$hasTribology = $null -ne $first.tribology
$hasComposition = $null -ne $first.composition
$hasSurface = $null -ne $first.surface_integrity
$hasThermal = $null -ne $first.thermal_machining
$hasDesignation = $null -ne $first.designation
Write-Output ("  Has tribology: {0}" -f $hasTribology)
Write-Output ("  Has composition: {0}" -f $hasComposition)
Write-Output ("  Has surface_integrity: {0}" -f $hasSurface)
Write-Output ("  Has thermal_machining: {0}" -f $hasThermal)
Write-Output ("  Has designation: {0}" -f $hasDesignation)

# Count total props
$propCount = ($first.PSObject.Properties | Measure-Object).Count
Write-Output ("  Property count: {0}" -f $propCount)

# Check how many materials have tribology
$withTribology = 0
$withComposition = 0
$totalChecked = 0
Get-ChildItem 'C:\PRISM\data\materials' -Recurse -Filter '*.json' -File | Where-Object { $_.Name -ne 'MASTER_INDEX.json' } | ForEach-Object {
    try {
        $raw = [System.IO.File]::ReadAllText($_.FullName)
        $raw = $raw.TrimStart([char]0xFEFF)
        $j = $raw | ConvertFrom-Json
        $items = @()
        if ($j -is [array]) { $items = $j } else { $items = @($j) }
        foreach ($item in $items) {
            $totalChecked++
            if ($null -ne $item.tribology) { $withTribology++ }
            if ($null -ne $item.composition) { $withComposition++ }
        }
    } catch {}
}
Write-Output ""
Write-Output ("MERGE STATUS (M-0):")
Write-Output ("  Total materials checked: {0}" -f $totalChecked)
Write-Output ("  With tribology: {0} ({1:P1})" -f $withTribology, ($withTribology / [Math]::Max($totalChecked,1)))
Write-Output ("  With composition: {0} ({1:P1})" -f $withComposition, ($withComposition / [Math]::Max($totalChecked,1)))

# Check alarms location
Write-Output ""
Write-Output "SEARCHING FOR ALARMS..."
$almPaths = @('C:\PRISM\data\alarms','C:\PRISM\mcp-server\data\alarms','C:\PRISM\data\CONTROLLER_ALARM_DB')
foreach ($p in $almPaths) {
    if (Test-Path $p) {
        $c = (Get-ChildItem $p -Filter '*.json' -File -Recurse).Count
        Write-Output ("  FOUND: {0} ({1} files)" -f $p, $c)
    }
}

# Check formulas location
Write-Output ""
Write-Output "SEARCHING FOR FORMULAS..."
$frmPaths = @('C:\PRISM\data\formulas','C:\PRISM\mcp-server\data\formulas','C:\PRISM\data\FORMULAS')
foreach ($p in $frmPaths) {
    if (Test-Path $p) {
        $c = (Get-ChildItem $p -Filter '*.json' -File -Recurse).Count
        Write-Output ("  FOUND: {0} ({1} files)" -f $p, $c)
    }
}
