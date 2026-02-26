# Exhaustive search for "Rebuild" folder and any other course locations
Write-Output "=== EVERY DIRECTORY IN C:\ ROOT ==="
Get-ChildItem "C:\" -Directory -Depth 0 -Force -ErrorAction SilentlyContinue | 
    ForEach-Object { Write-Output "  $($_.Name)" }

Write-Output "`n=== SEARCHING FOR *rebuild* ANYWHERE ==="
Get-ChildItem "C:\" -Directory -Depth 2 -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "rebuild" } |
    ForEach-Object { Write-Output "  $($_.FullName)" }

Write-Output "`n=== SEARCHING FOR *PRISM* FOLDERS WITH SPACES ==="
Get-ChildItem "C:\" -Directory -Depth 1 -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "PRISM" } |
    ForEach-Object { Write-Output "  '$($_.FullName)'" }

Write-Output "`n=== CHECKING SPECIFIC PATH VARIATIONS ==="
$paths = @(
    "C:\PRISM Rebuild",
    "C:\Prism Rebuild", 
    "C:\PRISM-Rebuild",
    "C:\PRISMRebuild",
    "C:\PRISM_Rebuild",
    "C:\prism rebuild",
    "C:\PRISM REBUILD",
    "C:\Rebuild",
    "C:\PRISM\Rebuild",
    "C:\PRISM\PRISM Rebuild",
    "C:\Users\Admin.DIGITALSTORM-PC\Desktop\PRISM Rebuild",
    "C:\Users\Admin.DIGITALSTORM-PC\Documents\PRISM Rebuild",
    "C:\Users\Admin.DIGITALSTORM-PC\Downloads\PRISM Rebuild"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        $count = (Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        $size = (Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        $sizeGB = if ($size) { [math]::Round($size/1GB, 2) } else { 0 }
        Write-Output "  FOUND: $p ($count files, ${sizeGB}GB)"
    }
}
