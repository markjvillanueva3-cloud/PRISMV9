$ErrorActionPreference = "SilentlyContinue"
$outFile = "C:\PRISM\knowledge\data-index\DATA_TAXONOMY.json"
New-Item -ItemType Directory -Path "C:\PRISM\knowledge\data-index" -Force | Out-Null

# --- MATERIALS: scan registry files for ISO groups ---
$matDir = "C:\PRISM\mcp-server\data\materials"
$matFiles = @()
if (Test-Path $matDir) { $matFiles = Get-ChildItem $matDir -Filter "*.json" -Recurse }
$isoGroups = @{}; $matTypes = @{}; $matTotal = 0
foreach ($f in $matFiles) {
    try {
        $json = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $items = if ($json -is [array]) { $json } elseif ($json.materials) { $json.materials } else { @($json) }
        foreach ($m in $items) {
            $matTotal++
            $grp = if ($m.iso_group) { $m.iso_group } else { "unknown" }
            if (-not $isoGroups[$grp]) { $isoGroups[$grp] = 0 }
            $isoGroups[$grp]++
            $mt = if ($m.material_type) { $m.material_type } else { "unknown" }
            if (-not $matTypes[$mt]) { $matTypes[$mt] = 0 }
            $matTypes[$mt]++
        }
    } catch {}
}

# --- MACHINES: scan registry ---
$machDir = "C:\PRISM\mcp-server\data\machines"
$machFiles = @()
if (Test-Path $machDir) { $machFiles = Get-ChildItem $machDir -Filter "*.json" -Recurse }
$manufacturers = @{}; $machTypes = @{}; $machTotal = 0
foreach ($f in $machFiles) {
    try {
        $json = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $items = if ($json -is [array]) { $json } elseif ($json.machines) { $json.machines } else { @($json) }
        foreach ($m in $items) {
            $machTotal++
            $mfr = if ($m.manufacturer) { $m.manufacturer } else { "unknown" }
            if (-not $manufacturers[$mfr]) { $manufacturers[$mfr] = 0 }
            $manufacturers[$mfr]++
            $mt = if ($m.machine_type) { $m.machine_type } else { "unknown" }
            if (-not $machTypes[$mt]) { $machTypes[$mt] = 0 }
            $machTypes[$mt]++
        }
    } catch {}
}

# --- ALARMS: scan registry ---
$almDir = "C:\PRISM\mcp-server\data\alarms"
$almFiles = @()
if (Test-Path $almDir) { $almFiles = Get-ChildItem $almDir -Filter "*.json" -Recurse }
$almFamilies = @{}; $almTotal = 0
foreach ($f in $almFiles) {
    try {
        $json = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $items = if ($json -is [array]) { $json } elseif ($json.alarms) { $json.alarms } else { @($json) }
        foreach ($a in $items) {
            $almTotal++
            $ctrl = if ($a.controller) { $a.controller } elseif ($a.controller_family) { $a.controller_family } else { "unknown" }
            if (-not $almFamilies[$ctrl]) { $almFamilies[$ctrl] = 0 }
            $almFamilies[$ctrl]++
        }
    } catch {}
}

# --- TOOLS: scan registry ---
$toolDir = "C:\PRISM\mcp-server\data\tools"
$toolFiles = @()
if (Test-Path $toolDir) { $toolFiles = Get-ChildItem $toolDir -Filter "*.json" -Recurse }
$toolCats = @{}; $toolTotal = 0
foreach ($f in $toolFiles) {
    try {
        $json = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $items = if ($json -is [array]) { $json } elseif ($json.tools) { $json.tools } else { @($json) }
        foreach ($t in $items) {
            $toolTotal++
            $cat = if ($t.category) { $t.category } elseif ($t.tool_type) { $t.tool_type } else { "unknown" }
            if (-not $toolCats[$cat]) { $toolCats[$cat] = 0 }
            $toolCats[$cat]++
        }
    } catch {}
}

# --- FORMULAS ---
$formDir = "C:\PRISM\mcp-server\data\formulas"
$formFiles = @()
if (Test-Path $formDir) { $formFiles = Get-ChildItem $formDir -Filter "*.json" -Recurse }
$formDomains = @{}; $formTotal = 0
foreach ($f in $formFiles) {
    try {
        $json = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $items = if ($json -is [array]) { $json } elseif ($json.formulas) { $json.formulas } else { @($json) }
        foreach ($fm in $items) {
            $formTotal++
            $dom = if ($fm.domain) { $fm.domain } elseif ($fm.category) { $fm.category } else { "unknown" }
            if (-not $formDomains[$dom]) { $formDomains[$dom] = 0 }
            $formDomains[$dom]++
        }
    } catch {}
}

# --- Also check knowledge engine stats (inline data) ---
# Use API counts as authoritative for totals
$apiTotals = @{
    materials = 3533
    machines = 1016
    tools = 13967
    alarms = 10033
    formulas = 500
}

# Build output
$taxonomy = [ordered]@{
    generated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    branch = "2_data_taxonomy"
    version = "1.0.0"
    materials = [ordered]@{
        total_api = $apiTotals.materials
        total_files = $matTotal
        organization = "ISO_group > material_type > grade"
        iso_groups = $isoGroups
        material_types = $matTypes
        parameter_count = 127
    }
    machines = [ordered]@{
        total_api = $apiTotals.machines
        total_files = $machTotal
        organization = "manufacturer > model > machine_type"
        manufacturers = $manufacturers
        machine_types = $machTypes
    }
    tools = [ordered]@{
        total_api = $apiTotals.tools
        total_files = $toolTotal
        organization = "category > type > subtype"
        categories = $toolCats
    }
    alarms = [ordered]@{
        total_api = $apiTotals.alarms
        total_files = $almTotal
        organization = "controller > code_range > severity"
        controller_families = $almFamilies
    }
    formulas = [ordered]@{
        total_api = $apiTotals.formulas
        total_files = $formTotal
        organization = "domain > formula_name"
        domains = $formDomains
    }
    data_sources = [ordered]@{
        material_dir = $matDir
        machine_dir = $machDir
        tool_dir = $toolDir
        alarm_dir = $almDir
        formula_dir = $formDir
        material_files = $matFiles.Count
        machine_files = $machFiles.Count
        tool_files = $toolFiles.Count
        alarm_files = $almFiles.Count
        formula_files = $formFiles.Count
    }
}

$taxonomy | ConvertTo-Json -Depth 5 | Set-Content $outFile -Encoding UTF8
Write-Host "SUCCESS: DATA_TAXONOMY.json written to $outFile"
Write-Host "Materials: $matTotal (files) / $($apiTotals.materials) (api), ISO groups: $($isoGroups.Count)"
Write-Host "Machines: $machTotal (files) / $($apiTotals.machines) (api), Manufacturers: $($manufacturers.Count)"
Write-Host "Tools: $toolTotal (files) / $($apiTotals.tools) (api), Categories: $($toolCats.Count)"
Write-Host "Alarms: $almTotal (files) / $($apiTotals.alarms) (api), Controllers: $($almFamilies.Count)"
Write-Host "Formulas: $formTotal (files) / $($apiTotals.formulas) (api), Domains: $($formDomains.Count)"
