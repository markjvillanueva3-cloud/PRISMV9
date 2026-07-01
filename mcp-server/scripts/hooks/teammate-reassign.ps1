# teammate-reassign.ps1
# Hook: Runs when a teammate goes idle after completing their task
# Checks task DAG for next available unblocked task
param($TeammateName)

Write-Output "TEAMMATE IDLE: $TeammateName finished their task"
Write-Output "Checking task DAG for next available work..."

# Read current task state if available
$taskFile = "C:\PRISM\state\TASK_DAG_STATE.json"
if (Test-Path $taskFile) {
    $state = Get-Content $taskFile | ConvertFrom-Json
    Write-Output "Task DAG state loaded: $($state.completed_count)/$($state.total_count) tasks complete"
} else {
    Write-Output "No task DAG state file found - lead agent manages assignment"
}

Write-Output "Lead agent: assign next unblocked task to $TeammateName or dismiss if phase complete"
exit 0  # Advisory, doesn't block
