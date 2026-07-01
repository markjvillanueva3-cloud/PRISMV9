# Auto Speed Feed — Physics-Optimized Line-by-Line S/F for CNC Programs

Automatically calculate and inject physics-optimized spindle speeds (S) and feed rates (F) into every cutting line of a G-code program using PRISM's full speed/feed engine stack.

## Args: $ARGUMENTS
- Empty: interactive mode (ask for G-code, material, tools)
- `[material]`: auto-detect tools from G-code, use specified material
- `analyze`: analyze-only mode (no modifications, just recommendations)
- `batch`: batch mode (calculate S/F for tool list without G-code)

## Pipeline
This skill orchestrates the `auto_speed_feed_optimize` action in the `prism_cam` dispatcher.

### Engine Stack (per cutting line):
1. **UltimateSpeedFeedEngine** — Kienzle force, Taylor tool life, Loewen-Shaw thermal
2. **PostProcessorFeedOptimizerEngine** — Chip thinning, corner decel, arc limiting, plunge limiting
3. **CuttingPowerBudgetEngine** — Machine power/torque envelope verification

### Required Inputs:
- **G-code**: Raw program from any CAM system
- **Material**: Workpiece material (e.g., "6061", "4140", "Ti-6Al-4V", "304 stainless")
- **Tools**: Array of `{ tool_number, diameter_mm, flutes }` (minimum)

### Optional Inputs:
- `machine_power_kw`, `machine_max_rpm` — Machine constraints
- `cut_type` — roughing / semi_finishing / finishing
- `strategy` — conventional / adaptive / trochoidal / hsm / hpc / slot
- `optimize_for` — tool_life / productivity / surface_finish / balanced
- `aggressiveness` — 0.0 (conservative) to 1.0 (aggressive)
- `annotate` — Add comments explaining each S/F change
- `coolant` — flood / mist / mql / air_blast / dry / through_tool / cryogenic

## Usage Modes

### 1. Full Optimization (default)
```
/auto-speed-feed 6061-T6
```
Reads G-code from clipboard/file, resolves material to ISO-N, computes optimal S/F for every cutting line.

### 2. Analysis Only
```
/auto-speed-feed analyze
```
Reports opportunities: under-fed lines, over-fed lines, power risks, chip thinning potential, estimated time savings.

### 3. Batch Calculator
```
/auto-speed-feed batch
```
Quick reference: provide material + tool list, get optimal RPM/feed/DOC/MRR for each tool.

## Output
- Optimized G-code with S/F on every cutting line
- Per-tool summary: optimal RPM, Vc, Fz, power utilization, thermal risk
- Statistics: lines modified, average feed change, estimated time savings
- Warnings: power-limited lines, thermal risks, missing tool data

## Example Dispatcher Call
```json
{
  "tool": "prism_cam",
  "action": "auto_speed_feed_optimize",
  "params": {
    "gcode": "O0001\nT1 M6\nS3000 M3\nG0 X0 Y0\nG43 H1 Z1.0\nG1 Z-0.5 F200\nG1 X100 F500\n...",
    "material": "6061",
    "tools": [
      { "tool_number": 1, "diameter_mm": 12, "flutes": 3, "type": "endmill", "material": "carbide" }
    ],
    "machine_power_kw": 15,
    "machine_max_rpm": 12000,
    "optimize_for": "balanced",
    "annotate": true
  }
}
```
