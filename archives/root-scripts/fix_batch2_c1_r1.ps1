# BATCH 2: C1 - Redistribute R1 companion assets from post-gate to per-MS
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$file = "$dir\PHASE_R1_REGISTRY.md"
$text = [System.IO.File]::ReadAllText($file)

# Replace the companion header
$old = "## R1 COMPANION ASSETS (v14.2 `u{2014} build AFTER R1-MS9 gate passes)"
$new = @"
## R1 COMPANION ASSETS (v14.2 `u{2014} built per-MS, verified at R1-MS9 gate)

### PER-MS COMPANION SCHEDULE:
``````
MS4.5 PRODUCES:
  HOOK: data_validation_gate (blocking, post-load, bounds checks) `u{2014} build during MS4.5
  Verify: Load a material with out-of-range hardness `u{2192} hook blocks with error

MS5 PRODUCES:
  HOOK: tool_schema_completeness (warning, post-load, checks 85-param population %)
  SKILL: prism-data-diagnostics (debug registry search failures, interpret VALIDATION_REPORT)
  Verify: Load tool holder with <60% params `u{2192} hook warns. Ask Claude to diagnose `u{2192} skill loads.

MS6 PRODUCES:
  HOOK: material_enrichment_validate (blocking, post-merge, blocks if hardness delta >20%)
  Verify: Attempt enrichment that changes hardness by 25% `u{2192} hook blocks

MS7 PRODUCES: (none `u{2014} data loading, no new capability requiring companion)

MS8 PRODUCES:
  HOOK: formula_registry_consistency (warning, verifies all formulas have engine implementations)
  Verify: Check formula registry `u{2192} hook reports stub count

MS9 GATE VERIFIES:
  `u{2714} All 4 hooks registered and fire on test cases
  `u{2714} prism-data-diagnostics skill loads and responds to registry debug query
  `u{2714} registry_health_check script runs and produces JSON summary
  `u{2714} material_search_diagnostic script runs on "find me unobtainium" `u{2192} suggests alternatives
  `u{2714} tool_coverage_report script runs and shows gap analysis
``````
"@

$text = $text.Replace($old, $new)
[System.IO.File]::WriteAllText($file, $text)
Write-Output "C1: R1 companion redistributed. Lines: $((Get-Content $file).Count)"
