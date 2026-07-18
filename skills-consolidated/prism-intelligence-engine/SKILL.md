# SKILL: Intelligence Engine (prism_intelligence)
## Compound manufacturing actions composing physics + registries

### WHEN TO USE
- User asks for a complete job plan, setup sheet, or cost estimate
- Need material/tool/machine recommendations with scoring
- What-if analysis comparing parameter scenarios
- Failure diagnosis from symptoms
- Parameter optimization (multi-objective)
- Cycle time estimation or quality prediction

### 11 ACTIONS (via prism_intelligence dispatcher)

| Action | Purpose | Key Params |
|--------|---------|-----------|
| `job_plan` | Full machining plan | material, operation, tool_diameter, machine (optional) |
| `setup_sheet` | Formatted job sheet | Same as job_plan + format: "json"\|"markdown" |
| `process_cost` | Cost breakdown | material, operation, batch_size, machine_rate_per_hour |
| `material_recommend` | Scored material list | application, requirements (strength, machinability, etc.) |
| `tool_recommend` | Ranked tool options | material, operation, diameter_mm |
| `machine_recommend` | Machine suitability | material, operation, part_envelope |
| `what_if` | Scenario comparison | baseline{}, scenario{}, parameters[] |
| `failure_diagnose` | Root cause analysis | symptoms[], material, operation |
| `parameter_optimize` | Multi-objective search | material, operation, objectives[] |
| `cycle_time_estimate` | Time per part | operations[{type, length, diameter}], tool_change_time_s |
| `quality_predict` | Achievable tolerance | material, operation, speed, feed, depth |

### EXAMPLES

**Job plan for titanium milling:**
```
prism_intelligence → job_plan {
  material: "Ti-6Al-4V",
  operation: "milling",
  tool_diameter: 12,
  depth_of_cut: 2.0,
  width_of_cut: 6.0
}
```

**What-if: speed increase impact:**
```
prism_intelligence → what_if {
  baseline: { material: "AISI 4140", Vc: 200, fz: 0.15, ap: 3.0 },
  scenario: { Vc: 280 },
  parameters: ["cutting_force", "tool_life", "surface_finish", "MRR"]
}
```

**Failure diagnosis:**
```
prism_intelligence → failure_diagnose {
  symptoms: ["chatter marks", "poor surface finish", "tool wear on flank"],
  material: "Inconel 718",
  operation: "turning"
}
```

### BEST PRACTICES
- `job_plan` is the most comprehensive — use it as default for general machining questions
- `what_if` with sensitivity sweep mode: add `sweep: true, range_pct: 20, steps: 5`
- `quality_predict` returns achievable IT grade — pair with `prism_calc→tolerance_analysis` for specs
- All actions accept `response_level: "pointer"|"summary"|"full"` for token control
