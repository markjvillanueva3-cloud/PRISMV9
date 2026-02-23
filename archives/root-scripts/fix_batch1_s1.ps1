# BATCH 1 continued: S1 - Add WHAT COMES AFTER to R7-R10
# These need context bridge additions. Find existing CONTEXT BRIDGE or QUICK REFERENCE
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# R7: Find where to insert (after QUICK REFERENCE block)
$r7 = [System.Collections.ArrayList](Get-Content "$dir\PHASE_R7_INTELLIGENCE.md")
$inserted = $false
for ($i = 0; $i -lt $r7.Count; $i++) {
    if ($r7[$i] -match "^## MS0:") {
        # Insert CONTEXT BRIDGE before first milestone
        $bridge = @(
            "",
            "---",
            "",
            "## CONTEXT BRIDGE",
            "",
            "WHAT CAME BEFORE: R3 built intelligence actions (job planner, advanced calcs, toolpath strategy,",
            "cross-system intelligence). R4/R5/R6 wrapped them in enterprise, visual, and production layers.",
            "",
            "WHAT THIS PHASE DOES: Wires extracted physics engines, MIT course algorithms, and manufacturer",
            "catalog data into live manufacturing intelligence. Coupled predictions, constrained optimization,",
            "workholding intelligence, learning from jobs, and shop floor scheduling.",
            "",
            "WHAT COMES AFTER: R8 (User Experience) makes intelligence features accessible to users through",
            "intent decomposition, persona-adaptive formatting, and guided workflows. Without R8, the",
            "intelligence exists but users can't reach it naturally.",
            "",
            "PARALLEL: R7-MS6 (Manufacturer Catalog Extraction) can begin during R3 as independent track.",
            ""
        )
        for ($j = $bridge.Count - 1; $j -ge 0; $j--) {
            $r7.Insert($i, $bridge[$j])
        }
        $inserted = $true
        Write-Output "S1: Added CONTEXT BRIDGE to R7 at line $i"
        break
    }
}
[System.IO.File]::WriteAllLines("$dir\PHASE_R7_INTELLIGENCE.md", $r7.ToArray())

# R8
$r8 = [System.Collections.ArrayList](Get-Content "$dir\PHASE_R8_EXPERIENCE.md")
for ($i = 0; $i -lt $r8.Count; $i++) {
    if ($r8[$i] -match "^## MS0:") {
        $bridge = @(
            "",
            "---",
            "",
            "## CONTEXT BRIDGE",
            "",
            "WHAT CAME BEFORE: R7 wired physics predictions, optimization, workholding intelligence,",
            "learning engines, and shop floor scheduling. The intelligence exists but is raw dispatcher output.",
            "",
            "WHAT THIS PHASE DOES: Builds the user-facing layer. Intent decomposition routes natural language",
            "to the right actions. Persona-adaptive formatting speaks each user's language. Pre-built workflows",
            "chain complex operations into one-click solutions. This is where PRISM becomes usable.",
            "",
            "WHAT COMES AFTER: R9 (Real-World Integration) connects PRISM to physical machines via MTConnect/",
            "OPC-UA, CAM system plugins, DNC file transfer, and mobile interfaces. R8 makes PRISM smart;",
            "R9 makes it connected to the real shop floor.",
            ""
        )
        for ($j = $bridge.Count - 1; $j -ge 0; $j--) {
            $r8.Insert($i, $bridge[$j])
        }
        Write-Output "S1: Added CONTEXT BRIDGE to R8 at line $i"
        break
    }
}
[System.IO.File]::WriteAllLines("$dir\PHASE_R8_EXPERIENCE.md", $r8.ToArray())

# R9
$r9 = [System.Collections.ArrayList](Get-Content "$dir\PHASE_R9_INTEGRATION.md")
for ($i = 0; $i -lt $r9.Count; $i++) {
    if ($r9[$i] -match "^## MS0:") {
        $bridge = @(
            "",
            "---",
            "",
            "## CONTEXT BRIDGE",
            "",
            "WHAT CAME BEFORE: R8 built the user experience layer (intent engine, persona formatting,",
            "workflow chains, setup sheets). PRISM is intelligent and usable but offline.",
            "",
            "WHAT THIS PHASE DOES: Connects PRISM to the physical shop floor. MTConnect/OPC-UA for live",
            "machine data, CAM plugins for parameter injection, DNC for G-code transfer, mobile interfaces",
            "for tablet-at-machine usage, ERP/MES for production scheduling integration.",
            "",
            "WHAT COMES AFTER: R10 (Manufacturing Revolution) builds paradigm-shifting features on top of",
            "the connected foundation: digital twins, generative process planning, self-optimizing parameters,",
            "multi-machine orchestration. R11 (Product Packaging) runs in parallel for market launch.",
            ""
        )
        for ($j = $bridge.Count - 1; $j -ge 0; $j--) {
            $r9.Insert($i, $bridge[$j])
        }
        Write-Output "S1: Added CONTEXT BRIDGE to R9 at line $i"
        break
    }
}
[System.IO.File]::WriteAllLines("$dir\PHASE_R9_INTEGRATION.md", $r9.ToArray())

# R10
$r10 = [System.Collections.ArrayList](Get-Content "$dir\PHASE_R10_REVOLUTION.md")
for ($i = 0; $i -lt $r10.Count; $i++) {
    if ($r10[$i] -match "^## MS0:") {
        $bridge = @(
            "",
            "---",
            "",
            "## CONTEXT BRIDGE",
            "",
            "WHAT CAME BEFORE: R9 connected PRISM to physical machines, CAM systems, ERP, and mobile.",
            "The system is intelligent, usable, and connected to the real shop floor.",
            "",
            "WHAT THIS PHASE DOES: Paradigm shifts. Digital twins, generative process planning,",
            "self-optimizing parameters, multi-machine orchestration, predictive supply chain.",
            "These features don't exist anywhere yet in manufacturing software.",
            "",
            "WHAT COMES AFTER: R11 (Product Packaging) prepares PRISM for market launch with packaging,",
            "documentation, licensing, and compliance. R10 and R11 can run in parallel.",
            ""
        )
        for ($j = $bridge.Count - 1; $j -ge 0; $j--) {
            $r10.Insert($i, $bridge[$j])
        }
        Write-Output "S1: Added CONTEXT BRIDGE to R10 at line $i"
        break
    }
}
[System.IO.File]::WriteAllLines("$dir\PHASE_R10_REVOLUTION.md", $r10.ToArray())

Write-Output "`n--- S1 complete ---"
