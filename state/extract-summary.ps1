$ErrorActionPreference = 'Continue'

# Read TASK_QUEUE
$taskqueue = Get-Content 'h:\PRISM\state\shared\TASK_QUEUE.json' -Raw | ConvertFrom-Json
"TASK_QUEUE STATUS:" | Out-File 'h:\PRISM\state\SUMMARY.txt'
"total items: $($taskqueue.queue.Count)" | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append
"done: $($taskqueue.done | Measure-Object | Select-Object -ExpandProperty Count)" | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append
"available: $($taskqueue.available | Measure-Object | Select-Object -ExpandProperty Count)" | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append
"blocked: $($taskqueue.blocked | Measure-Object | Select-Object -ExpandProperty Count)" | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append

# Read SVI-compact
"`nSVI STATUS:" | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append
Get-Content 'h:\PRISM\state\shared\SVI-compact.md' | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append

# Read first 50 lines of CLAUDE.md
"`n`nCLAUDE.md (first 30 lines):" | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append
Get-Content 'h:\PRISM\CLAUDE.md' | Select-Object -First 30 | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append

"Done" | Out-File 'h:\PRISM\state\SUMMARY.txt' -Append
