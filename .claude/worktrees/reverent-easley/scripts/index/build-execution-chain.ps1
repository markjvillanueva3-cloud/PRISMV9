# Branch 1: Execution Chain Builder v1.1
# Scans all 31 dispatchers - handles BOTH action patterns:
#   Pattern A: const ACTIONS = [...] as const
#   Pattern B: z.enum([...]) in server.tool() registration
# Output: C:\PRISM\knowledge\code-index\EXECUTION_CHAIN.json

$dispatcherDir = "C:\PRISM\mcp-server\src\tools\dispatchers"
$engineDir = "C:\PRISM\mcp-server\src\engines"
$outFile = "C:\PRISM\knowledge\code-index\EXECUTION_CHAIN.json"

$result = @{
    generated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    version = "1.1.0"
    dispatchers = @{}
    engines = @{}
    summary = @{}
}

$totalActions = 0
$dispatcherFiles = Get-ChildItem $dispatcherDir -Filter "*.ts"

foreach ($f in $dispatcherFiles) {
    $content = Get-Content $f.FullName -Raw
    $name = $f.BaseName -replace "Dispatcher$", ""
    $toolName = "prism_$name"
    
    # Try Pattern A: const ACTIONS = [...] as const (double or single quotes)
    $actions = @()
    if ($content -match 'const ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const') {
        $actionsBlock = $Matches[1]
        $actions = [regex]::Matches($actionsBlock, '[''"]([^''"]+)[''"]') | ForEach-Object { $_.Groups[1].Value }
    }
    
    # Try Pattern B: z.enum([...])
    if ($actions.Count -eq 0) {
        $enumMatches = [regex]::Matches($content, 'z\.enum\(\s*\[([\s\S]*?)\]\s*\)')
        foreach ($em in $enumMatches) {
            $enumBlock = $em.Groups[1].Value
            $enumActions = [regex]::Matches($enumBlock, '[''"]([^''"]+)[''"]') | ForEach-Object { $_.Groups[1].Value }
            if ($enumActions.Count -gt $actions.Count) {
                $actions = $enumActions
            }
        }
    }
    
    # Try Pattern C: new Set([...]) spread (safety dispatcher)
    if ($actions.Count -eq 0) {
        $setMatches = [regex]::Matches($content, 'new Set\(\s*\[([\s\S]*?)\]\s*\)')
        foreach ($sm in $setMatches) {
            $setBlock = $sm.Groups[1].Value
            $setActions = [regex]::Matches($setBlock, '[''"]([^''"]+)[''"]') | ForEach-Object { $_.Groups[1].Value }
            $actions += $setActions
        }
        $actions = $actions | Sort-Object -Unique
    }
    
    # Extract engine imports
    $engineImports = @()
    $importMatches = [regex]::Matches($content, 'import.*from\s*".*engines/([^"\.]+)')
    foreach ($m in $importMatches) { $engineImports += $m.Groups[1].Value }
    
    # Extract engine refs
    $engineRefs = @()
    $refMatches = [regex]::Matches($content, 'new\s+(\w+Engine)')
    foreach ($m in $refMatches) { $engineRefs += $m.Groups[1].Value }
    $refMatches2 = [regex]::Matches($content, '(\w+Engine)\.\w+')
    foreach ($m in $refMatches2) { $engineRefs += $m.Groups[1].Value }
    $engineRefs = $engineRefs | Sort-Object -Unique
    
    # Extract registry references
    $registries = @()
    if ($content -match 'MaterialReg|materialReg|materials') { $registries += "materials" }
    if ($content -match 'MachineReg|machineReg|machines') { $registries += "machines" }
    if ($content -match 'ToolReg|toolReg') { $registries += "tools" }
    if ($content -match 'AlarmReg|alarmReg|alarm') { $registries += "alarms" }
    if ($content -match 'FormulaReg|formulaReg|formula') { $registries += "formulas" }
    $registries = $registries | Sort-Object -Unique
    
    $totalActions += $actions.Count
    
    $result.dispatchers[$toolName] = @{
        file = "src/tools/dispatchers/$($f.Name)"
        action_count = $actions.Count
        actions = $actions
        engines_referenced = $engineRefs
        engine_imports = $engineImports
        registries_referenced = $registries
    }
}

# Phase 2: Parse engines
$engineFiles = @()
if (Test-Path $engineDir) {
    $engineFiles = Get-ChildItem $engineDir -Filter "*.ts" -ErrorAction SilentlyContinue
}

foreach ($f in $engineFiles) {
    $content = Get-Content $f.FullName -Raw
    $eName = $f.BaseName
    
    $calledBy = @()
    foreach ($dName in $result.dispatchers.Keys) {
        $d = $result.dispatchers[$dName]
        if ($d.engines_referenced -contains $eName -or $d.engine_imports -contains $eName) {
            $calledBy += $dName
        }
    }
    
    $result.engines[$eName] = @{
        file = "src/engines/$($f.Name)"
        called_by = $calledBy
        line_count = ($content -split "`n").Count
    }
}

# Summary
$result.summary = @{
    dispatcher_count = $result.dispatchers.Count
    total_actions = $totalActions
    engine_count = $result.engines.Count
}

$json = $result | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($outFile, $json)

Write-Host "Branch 1 EXECUTION_CHAIN.json built:"
Write-Host "  Dispatchers: $($result.dispatchers.Count)"
Write-Host "  Total Actions: $totalActions"
Write-Host "  Engines: $($result.engines.Count)"
Write-Host "  Output: $outFile"