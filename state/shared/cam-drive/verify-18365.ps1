# Verify PRISM_Fusion_Drive owns :18365 after Fusion restart
# Proves it's MINE (eyes + save-as), not PRISMBridgeCAD.
$base = "http://127.0.0.1:18365"

Write-Host "=== 1. health ==="
try { Invoke-RestMethod "$base/health" -TimeoutSec 3 | ConvertTo-Json -Compress }
catch { Write-Host "FAIL: $($_.Exception.Message)"; exit 1 }

Write-Host "`n=== 2. status (design resolves in Manufacture) ==="
try { Invoke-RestMethod "$base/status" -TimeoutSec 5 | ConvertTo-Json -Depth 4 -Compress }
catch { Write-Host "status err: $($_.Exception.Message)" }

Write-Host "`n=== 3. eyes — viewport capture (PROOF it's MY add-in) ==="
try {
  $cap = Invoke-RestMethod "$base/viewport/capture" -Method Post -TimeoutSec 10 `
    -ContentType 'application/json' `
    -Body (@{ orientation = 'iso'; fit = $true; width = 1280; height = 800 } | ConvertTo-Json)
  $cap | ConvertTo-Json -Compress
  if ($cap.path -and (Test-Path $cap.path)) {
    Write-Host ("  PNG written: {0} ({1} bytes)" -f $cap.path, (Get-Item $cap.path).Length)
  }
} catch { Write-Host "eyes err: $($_.Exception.Message)" }

Write-Host "`n=== 4. cam setups (CAM endpoints live) ==="
try { Invoke-RestMethod "$base/cam/setups" -Method Post -TimeoutSec 5 -ContentType 'application/json' -Body '{}' | ConvertTo-Json -Depth 3 -Compress }
catch { Write-Host "cam/setups err: $($_.Exception.Message)" }
