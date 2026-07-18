# /sinker-studio — Sinker EDM Studio Pipeline

Launch the Sinker EDM Studio wizard — full pipeline from electrode design to optimized EDM program with discharge energy optimization, electrode wear prediction, and surface integrity analysis.

## Usage
```
/sinker-studio [electrode-path] [workpiece-material]
```

## MCP Action
```
prism_edm:sinker_studio_pipeline
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (drives full electrode-to-program pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after electrode/material selection, (2) after discharge parameter optimization, (3) after program generation — to validate safety and surface integrity

## What it does
1. Import electrode geometry (graphite/copper)
2. Select workpiece material + machine (default: tool steel on Mitsubishi EA8)
3. Calculate discharge parameters (I_peak, t_on, t_off) via Sato MRR model
4. Optimize electrode wear ratio via SinkerEDMCalculatorEngine
5. Predict surface roughness (VDI scale) and recast layer
6. Generate multi-pass program (roughing → semi-finish → finish)
7. Post-process with SinkerEDMPostProcessor

## Request Types
- `quick` — Fast parameter recommendation
- `full_program` — Complete program generation
- `electrode_wear` — Wear prediction analysis
- `surface_predict` — Surface roughness prediction
- `vdi_convert` — VDI to Ra conversion
- `deep_analyze` — Deep AI analysis (all engines)

## Related
- `/sinker-validate` — Program validation
- `/sinker-optimize` — Parameter optimization
- `/sinker-learn` — Knowledge extraction
- `/sinker-harden` — Machine-specific hardening
