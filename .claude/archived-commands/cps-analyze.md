# CPS Analyze — Fusion 360 Post Processor Analysis

Analyze Fusion 360 .cps post processor files from `H:\prism\BOX\FUSION BASIC POSTS\` to extract controller capabilities, compare machines, and find the right post for a job.

## Args: $ARGUMENTS
- Empty / `summary`: Parse all 180 CPS files and show summary stats
- `[vendor]`: Search by vendor name (e.g., `fanuc`, `haas`, `siemens`)
- `compare [a] [b]`: Compare two controllers side-by-side
- `properties`: Build cross-controller property catalog
- `capability [cap]`: Find all posts with a specific capability (MILLING, TURNING, MILL_TURN, LASER, JET, INSPECTION)
- `matrix`: Show full controller capability matrix (smoothing, retract, multi-axis, arcs, probing)
- `select [requirements]`: Recommend best post processor for requirements

## Engines Used
1. **FusionCPSParserEngine** — Parses .cps files for metadata extraction
2. **PostProcessorCapabilityMatrixEngine** — Searchable capability matrix across 15+ controller families

## Workflow
1. If args contain vendor name → call `prism_cam.cps_search` with vendor param
2. If args say "compare" → call `prism_cam.cps_compare_controllers`
3. If args say "properties" → call `prism_cam.cps_property_catalog`
4. If args say "matrix" → call `prism_cam.pp_capability_matrix`
5. If args say "select" → call `prism_cam.pp_select_post`
6. Default → call `prism_cam.pp_capability_summary` for quick stats

## Output Format
Use tables for comparisons. Show key differences highlighted.
For capability matrix: show as grid with ✓/✗ for boolean capabilities.
