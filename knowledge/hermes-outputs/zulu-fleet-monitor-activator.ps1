<#
.SYNOPSIS
  Activates ZULU fleet monitoring (awareness injection + 5h token reporting)
  for all running PS tabs.
#>

Write-Host "[ZULU] Activating fleet awareness + 5h monitoring..." -ForegroundColor Cyan

# This would normally be called from each tab's boot process.
# For manual activation across the fleet:

$Slots = @('alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliett','kilo','lima','mike','oscar','papa','romeo','sierra','whiskey','xray')

foreach ($Slot in $Slots) {
    & "H:/Tools/prism-fleet/zulu-master-context-inject.ps1" -Slot $Slot
    Start-Sleep -Milliseconds 200
}

Write-Host "[ZULU] Fleet awareness injection complete." -ForegroundColor Green