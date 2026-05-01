# Fix R10 context bridge - find REVOLUTION 1 header
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$r10 = [System.Collections.ArrayList](Get-Content "$dir\PHASE_R10_REVOLUTION.md")

# Check if already has CONTEXT BRIDGE
$hasBridge = $false
for ($i = 0; $i -lt $r10.Count; $i++) {
    if ($r10[$i] -match "CONTEXT BRIDGE") { $hasBridge = $true; break }
}

if (-not $hasBridge) {
    # Find REVOLUTION 1 header
    for ($i = 0; $i -lt $r10.Count; $i++) {
        if ($r10[$i] -match "^## REVOLUTION 1:") {
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
            Write-Output "S1: Added CONTEXT BRIDGE to R10 before REVOLUTION 1 at line $i"
            break
        }
    }
    [System.IO.File]::WriteAllLines("$dir\PHASE_R10_REVOLUTION.md", $r10.ToArray())
} else {
    Write-Output "S1: R10 already has CONTEXT BRIDGE"
}
Write-Output "R10 now: $((Get-Content "$dir\PHASE_R10_REVOLUTION.md").Count) lines"
