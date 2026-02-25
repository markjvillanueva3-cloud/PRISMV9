# Check materials directory structure
Write-Output "MATERIALS DIRECTORY:"
Get-ChildItem 'C:\PRISM\data\materials' -Directory | ForEach-Object {
    $name = $_.Name
    $count = (Get-ChildItem $_.FullName -Filter '*.json' -File).Count
    Write-Output ("  {0}: {1} json files" -f $name, $count)
}

# Count all materials across subdirs
$totalMat = 0
Get-ChildItem 'C:\PRISM\data\materials' -Recurse -Filter '*.json' -File | ForEach-Object {
    try {
        $raw = [System.IO.File]::ReadAllText($_.FullName)
        $raw = $raw.TrimStart([char]0xFEFF)
        $json = $raw | ConvertFrom-Json
        if ($json -is [array]) { $totalMat += $json.Count }
        elseif ($json.materials) { $totalMat += $json.materials.Count }
        elseif ($json.PSObject.Properties['id']) { $totalMat += 1 }
    } catch {
        Write-Output ("  ERROR in {0}: {1}" -f $_.Name, $_.Exception.Message)
    }
}
Write-Output ("TOTAL MATERIALS: {0}" -f $totalMat)
Write-Output ""

# Sample first material to check schema
$sample = Get-ChildItem 'C:\PRISM\data\materials' -Recurse -Filter '*.json' -File | Select-Object -First 1
if ($sample) {
    Write-Output ("SAMPLE: {0}" -f $sample.FullName)
    $raw = [System.IO.File]::ReadAllText($sample.FullName)
    $raw = $raw.TrimStart([char]0xFEFF)
    $json = $raw | ConvertFrom-Json
    if ($json -is [array]) {
        $first = $json[0]
        Write-Output ("  Array of {0}" -f $json.Count)
    } elseif ($json.materials) {
        $first = $json.materials[0]
        Write-Output ("  Wrapped: {0} materials" -f $json.materials.Count)
    } else {
        $first = $json
    }
    # Check for tribology, composition, surface_integrity
    $hasTribology = $null -ne $first.tribology
    $hasComposition = $null -ne $first.composition
    $hasSurface = $null -ne $first.surface_integrity
    $hasThermal = $null -ne $first.thermal_machining
    Write-Output ("  Has tribology: {0}" -f $hasTribology)
    Write-Output ("  Has composition: {0}" -f $hasComposition)
    Write-Output ("  Has surface_integrity: {0}" -f $hasSurface)
    Write-Output ("  Has thermal_machining: {0}" -f $hasThermal)
    if ($first.id) { Write-Output ("  ID format: {0}" -f $first.id) }
}
Write-Output ""

# Alarms
Write-Output "ALARMS:"
Get-ChildItem 'C:\PRISM\data\alarms' -Filter '*.json' -File | ForEach-Object {
    $size = [math]::Round($_.Length/1024)
    Write-Output ("  {0}: {1} KB" -f $_.Name, $size)
}

# Formulas
Write-Output ""
Write-Output "FORMULAS:"
Get-ChildItem 'C:\PRISM\data\formulas' -Filter '*.json' -File | ForEach-Object {
    $size = [math]::Round($_.Length/1024)
    Write-Output ("  {0}: {1} KB" -f $_.Name, $size)
}

# Check materials_complete
Write-Output ""
if (Test-Path 'C:\PRISM\data\materials_complete') {
    $mc = Get-ChildItem 'C:\PRISM\data\materials_complete' -Recurse -Filter '*.json' -File
    Write-Output ("MATERIALS_COMPLETE: {0} files" -f $mc.Count)
} else {
    Write-Output "MATERIALS_COMPLETE: directory not found"
}
