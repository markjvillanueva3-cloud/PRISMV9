$file = "C:\PRISM\state\CURRENT_STATE.json"
$state = Get-Content $file -Raw | ConvertFrom-Json

$state.quickResume = "DA-MS3 in progress. DA-MS0(context eng), MS1(session continuity+W4), MS2(skill/script audit) complete. Working on Manus/Ralph/Superpowers optimization."
$state.phase = "DA-MS3"
if ($state.PSObject.Properties.Name -contains 'currentSession') {
    $state.currentSession.phase = "DA-MS3"
}
if ($state.PSObject.Properties.Name -contains 'recovery_context') {
    $state.recovery_context.phase = "DA-MS3"
    $state.recovery_context.next_action = "DA-MS3 Step 2: Ralph schedule + Step 3: Superpowers checklist"
    $state.recovery_context.current_task = "DA-MS3: Manus/Ralph/Superpowers audit"
}

$state | ConvertTo-Json -Depth 10 | Set-Content $file -Encoding UTF8
Write-Host "CURRENT_STATE.json updated: phase=DA-MS3, quickResume cleaned"