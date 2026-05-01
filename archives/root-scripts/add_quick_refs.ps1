$roadmapDir = "C:\PRISM\mcp-server\data\docs\roadmap"

$quickRef = @{
  "PHASE_R2_SAFETY.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R2 = Hybrid: Code (benchmarks) + MCP (Ralph validation). Safety Systems Engineer.
``````

---

"@
  "PHASE_R3_CAMPAIGNS.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R3 = Hybrid: Code (batch campaigns) + MCP (action design). Principal Architect.
``````

---

"@
  "PHASE_R4_ENTERPRISE.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R4 = Claude Code 90% + MCP at gate. Platform Engineer.
``````

---

"@
  "PHASE_R5_VISUAL.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R5 = Claude Code 100%. Product Designer.
``````

---

"@
  "PHASE_R6_PRODUCTION.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R6 = Claude Code 80% + MCP 20%. SRE.
``````

---

"@
  "PHASE_R7_INTELLIGENCE.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R7 = Hybrid: Code (catalog, wiring) + MCP (physics design). Applied Research Eng.
``````

---

"@
  "PHASE_R8_EXPERIENCE.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R8 = MCP 80% + Code 20%. Product Architect.
``````

---

"@
  "PHASE_R9_INTEGRATION.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R9 = Hybrid. Integration Architect.
``````

---

"@
  "PHASE_R10_REVOLUTION.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R10 = Vision phase. CTO / Visionary.
``````

---

"@
  "PHASE_R11_PRODUCT.md" = @"

---

## QUICK REFERENCE (standalone after compaction — no other doc needed)
``````
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R11 = Hybrid. Product Manager.
``````

---

"@
}

foreach ($file in $quickRef.Keys) {
  $path = Join-Path $roadmapDir $file
  if (Test-Path $path) {
    $content = Get-Content $path -Raw
    # Find first "---" after the header comments and insert after it
    $firstDash = $content.IndexOf("`r`n---`r`n")
    if ($firstDash -eq -1) { $firstDash = $content.IndexOf("`n---`n") }
    if ($firstDash -ge 0) {
      # Find the end of that --- line
      $insertPoint = $content.IndexOf("`n", $firstDash + 2) + 1
      $newContent = $content.Substring(0, $insertPoint) + $quickRef[$file] + $content.Substring($insertPoint)
      # Fix backtick escaping - replace `````` with ```
      $newContent = $newContent.Replace('``````', '```')
      Set-Content -Path $path -Value $newContent -NoNewline
      Write-Output "DONE: $file"
    } else {
      Write-Output "SKIP: $file — no --- found"
    }
  } else {
    Write-Output "MISS: $file — not found"
  }
}
