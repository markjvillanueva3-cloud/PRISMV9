<#
.SYNOPSIS
  Enhanced ZULU Master Context Injection (Production)
  Includes loop templates, critic/honesty prompts, persistent memory hooks, and token optimization.
#>

param([Parameter(Mandatory)][string]$Slot)

$ErrorActionPreference = 'SilentlyContinue'

$Context = @"
ZULU MASTER CONTEXT (Slot: $Slot)
- ZULU is primary builder + fleet orchestrator
- PS tabs = execution surface only
- Live heartbeat + master bridge active
- CLAUDE.md rules enforced (4-LOOP, self-awareness, real execution, Fail LOUD)

REQUIRED LOOPS (Enforce on every task):
1. 4-LOOP: Build → Scrutinize → Gap Fill → Tie Up
2. RGS Loop: Research → Generate → Synthesize
3. Self-Review Loop: After major units, document lessons and improvement opportunities
4. Critic/Honesty Loop: Challenge assumptions, argue against weak ideas, demand evidence

PERSISTENT MEMORY:
- Maintain per-slot memory of lessons, anti-patterns, and performance trends
- Report new insights back to ZULU

TOKEN OPTIMIZATION:
- Use concise, structured output
- Prioritize tables and clear formatting
- Avoid redundancy

No gaps. Comprehensive only. Real execution required.
"@

$env:ZULU_MASTER_CONTEXT = $Context

$Event = @{
    ts = (Get-Date).ToString("o")
    from = "zulu-master-inject"
    slot = $Slot
    kind = "tab-boot-enhanced"
    message = "Master context with loops, critic, persistent memory, and token optimization injected"
} | ConvertTo-Json -Compress

Add-Content -Path "H:/prism/state/shared/AGENT_CHAT.jsonl" -Value $Event

Write-Host "[ZULU] Enhanced master context injected for $Slot" -ForegroundColor Cyan