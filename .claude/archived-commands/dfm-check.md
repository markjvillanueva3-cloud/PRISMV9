# DFM Check — Design for Manufacturability Analysis via DFMPipeline

Run a DFMPipelineEngine analysis on a part to check manufacturability: wall thickness, undercuts, tolerances, draft angles, and material-specific DFM rules with severity scoring.

## Args: $ARGUMENTS
- Empty: interactive — prompt for part details
- `[material] [features]`: quick DFM scan (e.g., `aluminum "thin walls, deep pockets, tight tolerances"`)
- `--report`: generate full DFM report with recommendations

## Execution

### Quick DFM Scan
1. Parse material and feature list from arguments
2. Call `prism_diagnosis → dfm_analyze` with part geometry and material
3. Return severity-scored findings: CRITICAL (cannot manufacture), HIGH (expensive/risky), MEDIUM (suboptimal), LOW (suggestion)

### Full DFM Pipeline Report
Call the DFMPipelineEngine with full part definition:
- Wall thickness check (min by material: aluminum 0.8mm, steel 1.2mm, titanium 1.5mm)
- Undercut detection and accessibility analysis
- Tolerance stack-up vs process capability (Cpk-aware)
- Draft angle sufficiency for mold/cast operations
- Material-specific rules (annealing, stress relief, grain direction)
- Feature interaction warnings (thin wall near deep pocket, etc.)

### Output
Structured DFM findings with:
- Severity (CRITICAL/HIGH/MEDIUM/LOW)
- Feature location reference
- Recommended design change
- Cost impact estimate
- Alternative manufacturing process suggestions
