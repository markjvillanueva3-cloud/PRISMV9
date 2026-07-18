# /program-optimize — Re-run Per-Block Physics on G-code

Re-run per-block physics optimization on existing G-code. Returns optimized program with variable S/F per block.

## Advisor Strategy (`advisor_20260301`)
Use Anthropic's advisor tool for this command:
- **Executor**: Sonnet 4.6 (handles G-code parsing, tool calls, block iteration)
- **Advisor**: Opus 4.6, `max_uses: 3`
- **When Sonnet should call advisor**: (1) before committing to material/machine resolution, (2) before generating optimized S/F values, (3) after optimization to validate S(x) safety score
- **Caching**: enable `{"type": "ephemeral", "ttl": "5m"}` — multi-pass optimization benefits from advisor cache
- Block output if S(x) < 0.70.

## Usage
```
/program-optimize <gcode-file-or-text> [material] [machine]
```

## What it does
1. Parses G-code input (file path or inline text)
2. Routes through PostProcessorPipelineEngine (38 stages)
3. Applies per-block Kienzle force, Taylor tool life, power/torque/deflection limiting
4. Returns optimized G-code with variable S/F values

## MCP Action
```
prism_cam:post_process_with_catalog
```

## Example
```bash
# Optimize a G-code file for 4140 Steel on a Haas VF-2
prism_cam:post_process_with_catalog {
  "gcode": "<paste or file content>",
  "material": { "name": "4140 Steel", "iso_group": "P" },
  "machine": { "name": "Haas VF-2" },
  "optimization_target": "balanced"
}
```

## Related
- `/auto-speed-feed` — Calculate S/F for a single operation
- `/program-validate` — Validate G-code safety without optimizing
- PIPELINE-VAR-MS0 — Per-block variability maximization milestone
