# Process Health — Instant Process Physics Dashboard

Run ALL 8 dimensionless numbers + process stability margin + energy efficiency in one shot. Get an instant physics health check for any cutting process — like a blood panel for your machining operation.

**Value**: Identifies problems BEFORE they cause scrap. A single command tells you if your process is thermally safe, mechanically stable, efficiently cutting, and within capability.

## Args: $ARGUMENTS
- Cutting parameters: speed, feed, depth, stepover, tool diameter, material
- `[machineId]`: include machine-learned corrections if available
- Empty: interactive — ask for parameters

## Workflow

1. Parse input for all cutting parameters
2. Call `prism_calc` action `all_dimensionless` with full parameter set:
   - Cutting Number (force ratio — is Kienzle accurate?)
   - Thermal Peclet (heat partition — chip vs workpiece?)
   - Chip Formation Number (continuous vs segmented?)
   - Stability Number (chatter margin in dB)
   - Wear Intensity (universal wear rate)
   - Capability Number (physics-coupled Cpk)
   - Machinability Index (normalized difficulty)
   - Thermal Damage Number (burn/white layer risk)

3. Call `prism_calc` action `process_stability_margin`:
   - PSM combining chatter + thermal + wear + force margins
   - Single 0-1 metric: how far from instability

4. Call `prism_calc` action `cutting_energy_efficiency`:
   - What fraction of power actually removes material
   - Shear vs friction vs ploughing breakdown

5. If machineId provided, call `prism_calc` action `learned_prediction`:
   - Machine-specific corrections on all predictions

6. Present dashboard:
   ```
   PROCESS HEALTH — [Material] @ [Speed/Feed/Depth]
   ═══════════════════════════════════════════════

   STABILITY    ██████████░░ PSM: 0.72 (OK)
   THERMAL      █████████░░░ Peclet: 12.3 (chip-dominated ✓)
   CAPABILITY   ████████░░░░ Π_cap: 1.45 (capable ✓)
   EFFICIENCY   ██████░░░░░░ CEE: 0.48 (48% useful cutting)
   WEAR         ████████████ Π_wear: 0.003 (steady state ✓)
   DAMAGE RISK  ██░░░░░░░░░░ TDN: 0.15 (safe ✓)
   MACHINABILITY████████░░░░ MI: 0.78 (moderate)
   CHIP TYPE    continuous (Π_chip: 0.42)

   OVERALL: HEALTHY — 0 warnings, 0 critical

   RECOMMENDATIONS:
   - [any playbook rules that trigger]
   ```
