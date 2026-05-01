# Find PRISM Rebuild folder
Write-Output "=== ALL C:\ ROOT DIRECTORIES ==="
Get-ChildItem "C:\" -Directory -Depth 0 -Force -ErrorAction SilentlyContinue | 
    ForEach-Object { Write-Output "  '$($_.Name)'" }

Write-Output "`n=== PRISM-RELATED DIRS ==="
Get-ChildItem "C:\" -Directory -Depth 0 -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "PRISM|rebuild" } |
    ForEach-Object { 
        $count = (Get-ChildItem $_.FullName -Directory -Depth 0 -ErrorAction SilentlyContinue).Count
        Write-Output "  '$($_.FullName)' ($count subdirs)" 
    }

Write-Output "`n=== SEARCHING FOR rebuild* ANYWHERE DEPTH 2 ==="
Get-ChildItem "C:\" -Directory -Depth 2 -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "rebuild" } |
    ForEach-Object { Write-Output "  $($_.FullName)" }

Write-Output "`n=== CHECKING USER FOLDERS ==="
$userDirs = @("Desktop","Documents","Downloads")
foreach ($d in $userDirs) {
    $path = "C:\Users\Admin.DIGITALSTORM-PC\$d"
    if (Test-Path $path) {
        Get-ChildItem $path -Directory -Depth 1 -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match "PRISM|rebuild|course|MIT" } |
            ForEach-Object { Write-Output "  $($_.FullName)" }
    }
}
