$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# Define knowledge contributions per phase
$contributions = @{
    "PHASE_R3_CAMPAIGNS.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 2 (Data Taxonomy): Campaign results refine material/tool/machine taxonomies.
  New material families discovered, tool category gaps identified, machine capability boundaries mapped.
BRANCH 3 (Relationships): Cross-registry intelligence campaigns produce bulk relationship edges.
  "Material X performs best with tool family Y on machines with Z capability" at scale.
  Expected: 200-500 new relationship edges from batch campaign processing.
BRANCH 4 (Session Knowledge): Campaign execution patterns, data quality heuristics,
  batch processing optimizations, quality threshold calibrations.
AT PHASE GATE: RELATIONSHIP_GRAPH.json grows by 200+ edges. DATA_TAXONOMY.json updated with campaign findings.
``````

"@
    "PHASE_R4_ENTERPRISE.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 1 (Execution Chain): Multi-tenant isolation patterns, compliance dispatcher wiring.
  New action chains for tenant-scoped operations documented in CODEBASE_INDEX.
BRANCH 4 (Session Knowledge): Security architecture decisions, tenant isolation strategies,
  compliance framework selections, access control patterns.
AT PHASE GATE: CODEBASE_INDEX.json updated with tenant and compliance dispatcher chains.
``````

"@
    "PHASE_R5_VISUAL.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 1 (Execution Chain): Visualization pipeline — data query → transform → render chains.
BRANCH 4 (Session Knowledge): Chart type selection rationale, performance thresholds for
  large dataset rendering, accessibility decisions, color scheme choices for manufacturing context.
AT PHASE GATE: CODEBASE_INDEX.json updated with visualization dispatcher chains.
``````

"@
    "PHASE_R6_PRODUCTION.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 1 (Execution Chain): Deployment pipeline, monitoring hooks, health check chains.
BRANCH 4 (Session Knowledge): Production configuration decisions, scaling thresholds,
  monitoring alert calibrations, deployment rollback procedures, performance baselines.
AT PHASE GATE: CODEBASE_INDEX.json updated with production infrastructure chains.
``````

"@
    "PHASE_R7_INTELLIGENCE.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 3 (Relationships): MAJOR CONTRIBUTOR. Coupled physics models produce constraint edges:
  "When machining material X with tool Y, surface speed capped at Z due to thermal softening."
  "Vibration mode at frequency F triggers chatter for this tool-material-machine combination."
  Expected: 500-1000+ relationship edges from coupled physics validation.
BRANCH 4 (Session Knowledge): Physics model selection rationale, coupling factor discoveries,
  edge cases where models diverge, temperature-dependent property transitions.
AT PHASE GATE: RELATIONSHIP_GRAPH.json grows substantially. Cross-registry constraint edges validated.
``````

"@
    "PHASE_R8_EXPERIENCE.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 3 (Relationships): User intent → action mapping edges. "User asking about surface finish
  needs: speed_feed calc + tool_geometry check + material_machinability lookup + machine_rigidity check."
  22 application skills each produce intent→action chains.
BRANCH 4 (Session Knowledge): Intent recognition patterns, skill chaining decisions,
  user interaction patterns, error message effectiveness, disambiguation strategies.
AT PHASE GATE: RELATIONSHIP_GRAPH.json has intent→action edges for all 22 skills.
``````

"@
    "PHASE_R9_INTEGRATION.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 1 (Execution Chain): External system integration patterns — API adapters, protocol bridges,
  data transformation chains for CAM, ERP, MES systems.
BRANCH 4 (Session Knowledge): Integration protocol decisions, data format mapping choices,
  error handling patterns for unreliable external services, retry strategies.
AT PHASE GATE: CODEBASE_INDEX.json updated with integration bridge chains.
``````

"@
    "PHASE_R10_REVOLUTION.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 3 (Relationships): Advanced capability edges — digital twin state→prediction chains,
  adaptive optimization feedback loops, multi-objective constraint networks.
BRANCH 4 (Session Knowledge): Advanced algorithm selection rationale, optimization convergence
  criteria, digital twin fidelity requirements, real-time processing trade-offs.
AT PHASE GATE: RELATIONSHIP_GRAPH.json has advanced capability edges. Full graph integrity verified.
``````

"@
    "PHASE_R11_PRODUCT.md" = @"

## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
``````
BRANCH 1 (Execution Chain): Final product architecture — user-facing API chains, documentation
  generation pipeline, packaging and distribution chains.
BRANCH 3 (Relationships): Product integration edges — which features compose into which workflows,
  which capabilities depend on which registries.
BRANCH 4 (Session Knowledge): Product packaging decisions, API design rationale, documentation
  structure, user onboarding flow design.
AT PHASE GATE: All 4 branches of hierarchical index complete and cross-validated.
``````

"@
}

foreach ($file in $contributions.Keys) {
    $path = Join-Path $dir $file
    if (Test-Path $path) {
        $content = [System.IO.File]::ReadAllText($path)

        # Find the EXECUTION MODEL or CONTEXT BRIDGE section to insert before
        if ($content -match "(?m)^---\s*\n\s*\n##\s+(CONTEXT BRIDGE|EXECUTION MODEL|OBJECTIVES)") {
            # Find first --- after QUICK REFERENCE
            $qrPos = $content.IndexOf("QUICK REFERENCE")
            if ($qrPos -gt 0) {
                # Find the next "---" after the QUICK REFERENCE block ends (after the closing ```)
                $afterQR = $content.IndexOf("---", $qrPos + 200)
                if ($afterQR -gt 0) {
                    $insertPoint = $afterQR
                    $newContent = $content.Substring(0, $insertPoint) + $contributions[$file] + $content.Substring($insertPoint)
                    # Fix the backtick escaping
                    $newContent = $newContent.Replace('``````', '```')
                    [System.IO.File]::WriteAllText($path, $newContent)
                    $newLines = ($newContent -split "`n").Count
                    Write-Output "UPDATED $file - now $newLines lines"
                } else {
                    Write-Output "SKIP $file - could not find insertion point (no --- after QR)"
                }
            } else {
                Write-Output "SKIP $file - no QUICK REFERENCE section found"
            }
        } else {
            # Try simpler insertion: after QUICK REFERENCE closing ```
            $qrPos = $content.IndexOf("QUICK REFERENCE")
            if ($qrPos -gt 0) {
                $closingBacktick = $content.IndexOf("```", $qrPos + 50)
                if ($closingBacktick -gt 0) {
                    $nextNewline = $content.IndexOf("`n", $closingBacktick)
                    if ($nextNewline -gt 0) {
                        $insertPoint = $nextNewline + 1
                        $newContent = $content.Substring(0, $insertPoint) + $contributions[$file].Replace('``````', '```') + $content.Substring($insertPoint)
                        [System.IO.File]::WriteAllText($path, $newContent)
                        $newLines = ($newContent -split "`n").Count
                        Write-Output "UPDATED $file (alt insertion) - now $newLines lines"
                    } else {
                        Write-Output "SKIP $file - no newline after closing backticks"
                    }
                } else {
                    Write-Output "SKIP $file - no closing backticks after QR"
                }
            } else {
                Write-Output "SKIP $file - no QUICK REFERENCE"
            }
        }
    } else {
        Write-Output "MISSING $file"
    }
}
