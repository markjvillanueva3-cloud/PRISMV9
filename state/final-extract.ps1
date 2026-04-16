$out = 'h:\PRISM\state\FINDINGS.txt'
Remove-Item $out -ErrorAction SilentlyContinue

# Extract TASK_QUEUE
try {
    $tq = Get-Content 'h:\PRISM\state\shared\TASK_QUEUE.json' -Raw | ConvertFrom-Json
    "=== TASK_QUEUE.json ===" | Out-File $out
    "Total Queue Items: $($tq.queue.Count)" | Out-File $out -Append
    "Completed Tasks: $($tq.done.Count)" | Out-File $out -Append
    "Available Tasks: $($tq.available.Count)" | Out-File $out -Append
    "Blocked Tasks: $($tq.blocked.Count)" | Out-File $out -Append
    "" | Out-File $out -Append
    "Available tasks:" | Out-File $out -Append
    $tq.available | ForEach-Object { "  - $_" } | Out-File $out -Append
    "" | Out-File $out -Append
    "Blocked tasks:" | Out-File $out -Append
    $tq.blocked | ForEach-Object { "  - $_" } | Out-File $out -Append
} catch {
    "ERROR reading TASK_QUEUE: $_" | Out-File $out
}

# Extract ROADMAP_COLLABORATION_STATE
try {
    "`n`n=== ROADMAP_COLLABORATION_STATE.md ===" | Out-File $out -Append
    Get-Content 'h:\PRISM\state\shared\ROADMAP_COLLABORATION_STATE.md' | Select-Object -First 100 | Out-File $out -Append
} catch {
    "`nERROR reading ROADMAP_COLLABORATION_STATE: $_" | Out-File $out -Append
}

# Extract SVI-compact
try {
    "`n`n=== SVI-compact.md ===" | Out-File $out -Append
    Get-Content 'h:\PRISM\state\shared\SVI-compact.md' -Raw | Out-File $out -Append
} catch {
    "`nERROR reading SVI-compact: $_" | Out-File $out -Append
}

# Extract CLAUDE.md header
try {
    "`n`n=== CLAUDE.md (first 50 lines) ===" | Out-File $out -Append
    Get-Content 'h:\PRISM\CLAUDE.md' | Select-Object -First 50 | Out-File $out -Append
} catch {
    "`nERROR reading CLAUDE.md: $_" | Out-File $out -Append
}

# Extract SESSION_STATE
try {
    "`n`n=== SESSION_STATE.json ===" | Out-File $out -Append
    Get-Content 'h:\PRISM\SESSION_STATE.json' -Raw | ConvertFrom-Json | ConvertTo-Json | Out-File $out -Append
} catch {
    "`nERROR reading SESSION_STATE: $_" | Out-File $out -Append
}

# Extract FULL_ROADMAP_AUDIT
try {
    "`n`n=== FULL_ROADMAP_AUDIT_P0_R11.md (first 50 lines) ===" | Out-File $out -Append
    Get-Content 'h:\PRISM\state\FULL_ROADMAP_AUDIT_P0_R11.md' | Select-Object -First 50 | Out-File $out -Append
} catch {
    "`nERROR reading FULL_ROADMAP_AUDIT: $_" | Out-File $out -Append
}

# Search for MCP-AUTOMATION files
"`n`n=== MCP-AUTOMATION-HARDENING files ===" | Out-File $out -Append
try {
    Get-ChildItem 'h:\PRISM' -Recurse -Filter '*MCP-AUTOMATION-HARDENING*' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName } | Out-File $out -Append
} catch {
    "No MCP-AUTOMATION files found" | Out-File $out -Append
}

"EXTRACTION COMPLETE" | Out-File $out -Append
