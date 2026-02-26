# Apply role/model/effort to R4, R5, R6 stubs + R10, R11
# R4: Enterprise + API
$r4 = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R4_ENTERPRISE.md"
$lines = [System.Collections.ArrayList](Get-Content $r4)
$insertIdx = $null
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^## TOOL ANCHORS") { $insertIdx = $i; break }
}
if ($insertIdx -and $lines[$insertIdx - 1] -notmatch "MILESTONE ASSIGNMENTS") {
    $block = @(
        "",
        "## MILESTONE ASSIGNMENTS (apply during Brainstorm-to-Ship expansion)",
        "",
        "| MS | Role | Model | Effort | Sessions |",
        "|-----|------|-------|--------|----------|",
        "| MS0: Tenant Isolation | Platform Engineer | Opus (security arch) then Sonnet (impl) | L (18 calls) | 1-2 |",
        "| MS1: Compliance Templates | Platform Engineer | Sonnet (template creation + validation) | M (12 calls) | 1 |",
        "| MS2: Data Residency + Auth | Platform Engineer | Opus (security model) then Sonnet (impl) | M (12 calls) | 1 |",
        "| MS3: API Gateway + External Layer | Platform Engineer | Opus (API schema design) then Sonnet (endpoint impl) | L (15 calls) | 1-2 |",
        "| MS4: Phase Gate | Platform Engineer | Opus (security audit + gate) | S (8 calls) | 0.5 |",
        "",
        "**Safety Rule:** All security-related milestones (MS0, MS2) require Opus for architecture.",
        "**Bulk Rule:** No Haiku-eligible work in R4 (all requires security judgment).",
        ""
    )
    for ($j = $block.Count - 1; $j -ge 0; $j--) { $lines.Insert($insertIdx, $block[$j]) }
    Write-Output "R4: Added assignment table"
}
[System.IO.File]::WriteAllLines($r4, $lines.ToArray())
Write-Output "R4: $((Get-Content $r4).Count) lines"

# R5: Visual Platform
$r5 = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R5_VISUAL.md"
$lines = [System.Collections.ArrayList](Get-Content $r5)
$insertIdx = $null
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^## TOOL ANCHORS") { $insertIdx = $i; break }
}
if ($insertIdx -and $lines[$insertIdx - 1] -notmatch "MILESTONE ASSIGNMENTS") {
    $block = @(
        "",
        "## MILESTONE ASSIGNMENTS (apply during Brainstorm-to-Ship expansion)",
        "",
        "| MS | Role | Model | Effort | Sessions |",
        "|-----|------|-------|--------|----------|",
        "| MS0: Dashboard Framework + Components | UX Architect | Opus (component arch) then Sonnet (React impl) | L (18 calls) | 2 |",
        "| MS1: Calculator Page (9 formulas) | UX Architect | Sonnet (UI) then Opus (formula display accuracy) | M (12 calls) | 1 |",
        "| MS2: Job Planner + Toolpath Advisor | UX Architect | Sonnet (page impl + data binding) | M (10 calls) | 1 |",
        "| MS3: Real-Time Monitoring Dashboard | UX Architect | Sonnet (charts + WebSocket) | M (12 calls) | 1 |",
        "| MS4: Report Generation + Export | UX Architect | Sonnet (PDF/Excel generation) | S (6 calls) | 0.5 |",
        "| MS5: Phase Gate | UX Architect | Sonnet (tests) then Opus (UX review + gate) | S (6 calls) | 0.5 |",
        "",
        "**Safety Rule:** Calculator page (MS1) requires Opus review of formula display accuracy.",
        "**Bulk Rule:** No Haiku work in R5 (all UI requires design judgment).",
        ""
    )
    for ($j = $block.Count - 1; $j -ge 0; $j--) { $lines.Insert($insertIdx, $block[$j]) }
    Write-Output "R5: Added assignment table"
}
[System.IO.File]::WriteAllLines($r5, $lines.ToArray())
Write-Output "R5: $((Get-Content $r5).Count) lines"

# R6: Production Hardening
$r6 = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R6_PRODUCTION.md"
$lines = [System.Collections.ArrayList](Get-Content $r6)
$insertIdx = $null
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^## TOOL ANCHORS") { $insertIdx = $i; break }
}
if ($insertIdx -and $lines[$insertIdx - 1] -notmatch "MILESTONE ASSIGNMENTS") {
    $block = @(
        "",
        "## MILESTONE ASSIGNMENTS (apply during Brainstorm-to-Ship expansion)",
        "",
        "| MS | Role | Model | Effort | Sessions |",
        "|-----|------|-------|--------|----------|",
        "| MS0: Performance Profiling | Production Engineer | Sonnet (profiling) then Haiku (load tests) | L (15 calls) | 1-2 |",
        "| MS1: Fault Injection + Recovery | Production Engineer | Opus (fault scenario design) then Sonnet (impl) | L (15 calls) | 1 |",
        "| MS2: Safety Score Under Load | Safety Engineer | Opus (MANDATORY safety validation under stress) | M (10 calls) | 1 |",
        "| MS3: Monitoring + Alerting | Production Engineer | Sonnet (dashboard + alerts) | M (10 calls) | 1 |",
        "| MS4: Deployment Pipeline + Rollback | Production Engineer | Sonnet (pipeline) then Opus (rollback safety) | M (10 calls) | 1 |",
        "| MS5: Phase Gate (Production Readiness) | Production Engineer | Opus (MANDATORY production release gate) | M (10 calls) | 1 |",
        "",
        "**Safety Rule:** MS2 (safety under load) and MS5 (production gate) are Opus-MANDATORY.",
        "**Bulk Rule:** Load testing (MS0) is the only Haiku-eligible work in R6.",
        ""
    )
    for ($j = $block.Count - 1; $j -ge 0; $j--) { $lines.Insert($insertIdx, $block[$j]) }
    Write-Output "R6: Added assignment table"
}
[System.IO.File]::WriteAllLines($r6, $lines.ToArray())
Write-Output "R6: $((Get-Content $r6).Count) lines"
