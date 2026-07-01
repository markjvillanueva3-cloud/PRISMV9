# What-If — Unified Delta Analysis Across All Physics

Compare two machining scenarios across all physics engines — instant impact analysis. Change material, tool, machine, or cutting parameters and see the delta across force, life, thermal, finish, cost, and stability.

## Args: $ARGUMENTS
- Empty: interactive mode — prompt for base and variant scenarios
- `from=X to=Y diameter=D flutes=F`: material change impact
- `base diameter=12 variant diameter=16 material=X flutes=4`: tool change impact
- `sweep fz=0.05:0.20:0.01 material=X diameter=D flutes=F`: parameter sweep

## Pipeline
This skill orchestrates the `what_if_analyze` action in the `calcDispatcher`.

### Engine:
- **CrossPipelineWhatIfEngine** — Runs both scenarios through 8+ physics engines, computes deltas with confidence intervals

### Required Inputs:
- **base**: Base scenario parameters (material, diameter, flutes, ap, ae, fz)
- **variant**: Changed parameters (only specify what differs)

### Optional Inputs:
- `machine` — Machine profile for power/torque constraints
- `coolant` — Coolant type (flood/mql/dry/cryogenic)
- `optimize_for` — What matters most (tool_life/productivity/surface_finish/cost)

## Output
```
WHAT-IF ANALYSIS
=================
Base:     [material] D=[X]mm [Y]F ap=[A] ae=[B] fz=[C]
Variant:  [material] D=[X]mm [Y]F ap=[A] ae=[B] fz=[C]
Changed:  [list of changed parameters]

DELTA TABLE:
  Metric              Base        Variant     Delta    Impact
  ──────────────────  ──────────  ──────────  ───────  ────────
  Cutting Force (N)   [X]         [Y]         [+Z%]    [↑/↓]
  Tool Life (min)     [X]         [Y]         [+Z%]    [↑/↓]
  Thermal Rise (°C)   [X]         [Y]         [+Z%]    [↑/↓]
  Deflection (µm)     [X]         [Y]         [+Z%]    [↑/↓]
  Surface Ra (µm)     [X]         [Y]         [+Z%]    [↑/↓]
  MRR (cm³/min)       [X]         [Y]         [+Z%]    [↑/↓]
  Power (kW)          [X]         [Y]         [+Z%]    [↑/↓]
  Cost ($/part)       [X]         [Y]         [+Z%]    [↑/↓]
  Chatter Risk (%)    [X]         [Y]         [+Z%]    [↑/↓]

IMPACT SUMMARY: [1-sentence verdict]
RECOMMENDATIONS:
  - [actionable suggestions]
```

## Example Dispatcher Call
```json
{
  "tool": "prism_calc",
  "action": "what_if_analyze",
  "params": {
    "base": {
      "material": "aluminum_6061",
      "diameter_mm": 12,
      "flutes": 4,
      "ap_mm": 3,
      "ae_mm": 6,
      "fz_mm": 0.1
    },
    "variant": {
      "material": "Ti6Al4V"
    }
  }
}
```
