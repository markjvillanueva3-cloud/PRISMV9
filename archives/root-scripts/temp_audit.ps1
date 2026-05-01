# Full cross-group merge analysis
$groups = @('H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY')

foreach ($g in $groups) {
    $canPath = "C:\PRISM\data\materials\$g"
    $comPath = "C:\PRISM\data\materials_complete\$g"
    
    if (-not (Test-Path $canPath)) { Write-Host "$g : NO CANONICAL DIR"; continue }
    if (-not (Test-Path $comPath)) { Write-Host "$g : NO COMPLETE DIR"; continue }
    
    $canNames = @{}
    foreach ($f in (Get-ChildItem $canPath -Filter '*.json')) {
        $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
        if ($j.materials) { $arr = $j.materials } elseif ($j -is [array]) { $arr = $j } else { $arr = @($j) }
        foreach ($m in $arr) {
            $n = if ($m.name) { $m.name.ToLower().Trim() } else { "" }
            if ($n) { $canNames[$n] = 1 }
        }
    }
    
    $comNames = @{}
    $comComp = 0
    foreach ($f in (Get-ChildItem $comPath -Filter '*.json')) {
        $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
        if ($j.materials) { $arr = $j.materials } elseif ($j -is [array]) { $arr = $j } else { $arr = @($j) }
        foreach ($m in $arr) {
            $n = if ($m.name) { $m.name.ToLower().Trim() } else { "" }
            if ($n) { $comNames[$n] = 1 }
            if ($m.composition) { $comComp++ }
        }
    }
    
    $matched = 0
    foreach ($n in $canNames.Keys) { if ($comNames.ContainsKey($n)) { $matched++ } }
    $canOnly = $canNames.Count - $matched
    $comOnly = $comNames.Count - $matched
    
    Write-Host "$g : CAN=$($canNames.Count) COM=$($comNames.Count) MATCH=$matched CAN_ONLY=$canOnly COM_ONLY=$comOnly COMP=$comComp"
}
