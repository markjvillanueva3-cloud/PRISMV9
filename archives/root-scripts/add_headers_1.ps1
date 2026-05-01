# Script to add QUICK REFERENCE headers to phase docs that don't have one
$roadmapDir = "C:\PRISM\mcp-server\data\docs\roadmap"

$phases = @{
    "PHASE_R2_SAFETY.md" = "R2 = Claude Code 70% + MCP 30%. Opus for safety calcs. 50-calc matrix + regression."
    "PHASE_R3_CAMPAIGNS.md" = "R3 = Claude.ai MCP 80% + Code 20%. Opus primary. Intelligence + campaigns."
    "PHASE_R4_ENTERPRISE.md" = "R4 = Claude Code 90%. Sonnet, Opus at gate. Enterprise + API layer."
    "PHASE_R5_VISUAL.md" = "R5 = Claude Code 100%. Sonnet. Visual dashboard platform."
    "PHASE_R6_PRODUCTION.md" = "R6 = Claude Code 80% + MCP 20%. Sonnet+Opus. Production hardening."
    "PHASE_R7_INTELLIGENCE.md" = "R7 = Claude.ai MCP 80% + Code 20%. Opus primary. Coupled physics + learning."
    "PHASE_R8_EXPERIENCE.md" = "R8 = Claude.ai MCP 80% + Code 20%. Opus+Sonnet. UX + 22 app skills."
    "PHASE_R9_INTEGRATION.md" = "R9 = Hybrid. MTConnect + CAM + DNC + ERP integration."
    "PHASE_R10_REVOLUTION.md" = "R10 = Vision phase. 10 paradigm shifts. Long-horizon."
    "PHASE_R11_PRODUCT.md" = "R11 = Product packaging. SFC, PPG, Shop Manager, ACNC."
}
