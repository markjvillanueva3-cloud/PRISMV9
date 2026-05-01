$jsonPath = 'H:\prism\mcp-server\data\milestones\WEDM-MS1.json'
$content = Get-Content -Path $jsonPath -Encoding UTF8 -Raw
$data = $content | ConvertFrom-Json
$sessions = $data.sessions

Write-Host "=== WEDM-MS1 PROTOCOL STRUCTURE AUDIT ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Sessions: $($sessions.Count)"
Write-Host "Total Units: $($data.total_units)"
Write-Host ""

$sessionFields = @('id', 'title', 'units', 'smart_config', 'knowledge', 'intent', 'skills', 'work', 'exit_gate', 'compact_checkpoint')
$unitFields = @('title', 'description', 'depends_on', 'files_created', 'files_modified', 'abort_criteria', 'rollback', 'exit_gate', 'four_loop')

$sessionScore = 100
$unitScore = 100
$unitCount = 0

Write-Host "SESSIONS AUDIT:" -ForegroundColor Yellow
foreach ($i in 0..($sessions.Count-1)) {
  $session = $sessions[$i]
  $missingFields = @()
  foreach ($field in $sessionFields) {
    if (-not ($session.PSObject.Properties.Name -contains $field)) {
      $missingFields += $field
    }
  }
  
  $unitCountInSession = if ($session.units) { $session.units.Count } else { 0 }
  $unitCount += $unitCountInSession
  
  if ($missingFields.Count -eq 0) {
    Write-Host "  S$i: $($session.title) - OK (units: $unitCountInSession)" -ForegroundColor Green
  } else {
    Write-Host "  S$i: $($session.title) - MISSING: $($missingFields -join ', ')" -ForegroundColor Red
    $sessionScore -= (10 * $missingFields.Count)
  }
}

Write-Host ""
Write-Host "UNITS AUDIT:" -ForegroundColor Yellow
Write-Host "Total units found: $unitCount"

$unitIssues = 0
foreach ($session in $sessions) {
  if ($session.units) {
    foreach ($j in 0..($session.units.Count-1)) {
      $unit = $session.units[$j]
      $missingFields = @()
      foreach ($field in $unitFields) {
        if (-not ($unit.PSObject.Properties.Name -contains $field)) {
          $missingFields += $field
        }
      }
      if ($missingFields.Count -gt 0) {
        Write-Host "  Unit missing fields: $($unit.title) - $($missingFields -join ', ')" -ForegroundColor Red
        $unitIssues++
        $unitScore -= (5 * $missingFields.Count)
      }
    }
  }
}

if ($unitIssues -eq 0) {
  Write-Host "  All units have required fields - OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "SCORE CALCULATION:" -ForegroundColor Yellow
Write-Host "  Session compliance: $sessionScore/100"
Write-Host "  Unit compliance: $([Math]::Max(0, $unitScore))/100"
$finalScore = [Math]::Round(($sessionScore + [Math]::Max(0, $unitScore)) / 2, 0)
Write-Host ""
Write-Host "FINAL AUDIT SCORE: $finalScore/100" -ForegroundColor Cyan
