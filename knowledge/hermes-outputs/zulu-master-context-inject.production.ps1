<#
.SYNOPSIS
  Production-grade ZULU Master Context Injection for PRISM Fleet Tabs.
  Robust version with error handling and clean output.
#>

param([Parameter(Mandatory)][string]$Slot)

$ErrorActionPreference = 'SilentlyContinue'

$Context = @"
ZULU MASTER CONTEXT (Slot: $Slot)
- ZULU is primary builder + fleet orchestrator
- PS tabs = execution only
- Live heartbeat + master bridge active
- CLAUDE.md rules enforced (4-LOOP, self-awareness, real execution, Fail LOUD)
"@

$env:ZULU_MASTER_CONTEXT = $Context

$Event = @{
    ts = (Get-Date).ToString("o")
    from = "zulu-master-inject"
    slot = $Slot
    kind = "tab-boot"
    message = "Master context injected"
} | ConvertTo-Json -Compress

Add-Content -Path "H:/prism/state/shared/AGENT_CHAT.jsonl" -Value $Event

Write-Host "[ZULU] Master context injected for $Slot" -ForegroundColor Cyan