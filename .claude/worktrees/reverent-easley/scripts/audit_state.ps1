# Audit current data state
$toolDir = 'C:\PRISM\data\tools'
$files = Get-ChildItem $toolDir -Filter '*.json'
$total = 0
foreach ($f in $files) {
    try {
        $raw = Get-Content $f.FullName -Raw -Encoding UTF8
        $raw = $raw -replace '^\xEF\xBB\xBF',''
        $json = $raw | ConvertFrom-Json
        $count = 0
        if ($json -is [array]) { $count = $json.Count }
        elseif ($json.tools) { $count = $json.tools.Count }
        else { $count = 1 }
        $total += $count
        Write-Output ("  {0}: {1}" -f $f.Name, $count)
    } catch {
        Write-Output ("  {0}: ERROR - {1}" -f $f.Name, $_.Exception.Message)
    }
}
Write-Output ("TOOL TOTAL: {0}" -f $total)
Write-Output ""

# Materials
$matDir = 'C:\PRISM\data\materials'
$matCount = 0
$matFiles = Get-ChildItem $matDir -Filter '*.json' -File
foreach ($f in $matFiles) {
    try {
        $raw = Get-Content $f.FullName -Raw -Encoding UTF8
        $json = $raw | ConvertFrom-Json
        if ($json -is [array]) { $matCount += $json.Count }
        elseif ($json.materials) { $matCount += $json.materials.Count }
    } catch {}
}
Write-Output ("MATERIALS: {0} entries in {1} files" -f $matCount, $matFiles.Count)

# Check materials_complete
$mcDir = 'C:\PRISM\data\materials_complete'
if (Test-Path $mcDir) {
    $mcFiles = Get-ChildItem $mcDir -Filter '*.json' -File
    Write-Output ("MATERIALS_COMPLETE dir: {0} files" -f $mcFiles.Count)
}

# Machines
$machDir = 'C:\PRISM\data\machines'
$machFiles = Get-ChildItem $machDir -Recurse -Filter '*.json' -File
$machCount = 0
foreach ($f in $machFiles) {
    try {
        $raw = Get-Content $f.FullName -Raw -Encoding UTF8
        $json = $raw | ConvertFrom-Json
        if ($json -is [array]) { $machCount += $json.Count }
        elseif ($json.machines) { $machCount += $json.machines.Count }
    } catch {}
}
Write-Output ("MACHINES: {0} entries in {1} files" -f $machCount, $machFiles.Count)

# Alarms
$almDir = 'C:\PRISM\data\alarms'
if (Test-Path $almDir) {
    $almFiles = Get-ChildItem $almDir -Filter '*.json' -File
    $almCount = 0
    foreach ($f in $almFiles) {
        try {
            $raw = Get-Content $f.FullName -Raw -Encoding UTF8
            $json = $raw | ConvertFrom-Json
            if ($json -is [array]) { $almCount += $json.Count }
            elseif ($json.alarms) { $almCount += $json.alarms.Count }
        } catch {}
    }
    Write-Output ("ALARMS: {0} entries in {1} files" -f $almCount, $almFiles.Count)
}

# Formulas
$frmDir = 'C:\PRISM\data\formulas'
if (Test-Path $frmDir) {
    $frmFiles = Get-ChildItem $frmDir -Filter '*.json' -File
    $frmCount = 0
    foreach ($f in $frmFiles) {
        try {
            $raw = Get-Content $f.FullName -Raw -Encoding UTF8
            $json = $raw | ConvertFrom-Json
            if ($json -is [array]) { $frmCount += $json.Count }
            elseif ($json.formulas) { $frmCount += $json.formulas.Count }
        } catch {}
    }
    Write-Output ("FORMULAS: {0} entries in {1} files" -f $frmCount, $frmFiles.Count)
}

# Check what canonical tool files exist vs expected
Write-Output ""
Write-Output "CANONICAL TOOL FILES CHECK:"
$expected = @('SOLID_ENDMILLS.json','INDEXABLE_MILLING.json','MILLING_INSERTS.json','SOLID_DRILLS.json','INDEXABLE_DRILLS.json','TAPS.json','REAMERS.json','TURNING_INSERTS.json','TURNING_HOLDERS.json','GROOVING_INSERTS.json','THREADING_INSERTS.json','BORING.json','TOOLHOLDERS.json','SPECIALTY.json')
foreach ($name in $expected) {
    $path = Join-Path $toolDir $name
    if (Test-Path $path) {
        Write-Output ("  [EXISTS] {0}" -f $name)
    } else {
        Write-Output ("  [MISSING] {0}" -f $name)
    }
}
