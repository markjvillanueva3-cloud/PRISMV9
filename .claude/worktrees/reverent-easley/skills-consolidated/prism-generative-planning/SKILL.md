---
name: prism-generative-planning
version: 1.0.0
description: |
  Generative process planning skill for auto-generated manufacturing process
  plans with trade-off analysis. Uses the GenerativeProcessEngine to create
  complete machining plans from feature descriptions.

  Modules Covered:
  - GenerativeProcessEngine (genplan_generate, genplan_optimize, genplan_compare, genplan_validate)

  Gateway Routes: prism_intelligence → genplan_*
  R10 Revolution: Rev 3 — Generative Process Planning
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "process plan", "generate plan", "auto plan", "machining sequence", "operation order"
- User has a part feature (pocket, hole, profile, etc.) and needs a complete machining plan
- User wants to compare multiple process plan alternatives

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-generative-planning")`
2. Gather part/feature information from user
3. Use generative planning actions:
   - `prism_intelligence→genplan_generate` — Generate complete process plan from feature spec
   - `prism_intelligence→genplan_optimize` — Optimize existing plan for cost/time/quality
   - `prism_intelligence→genplan_compare` — Compare multiple plan alternatives side-by-side
   - `prism_intelligence→genplan_validate` — Validate plan against machine capabilities and physics

### What It Returns
- **Format**: Structured JSON with ordered operations, tool selections, parameters, and time estimates
- **Success**: Complete process plan with operations, tools, parameters, and quality predictions
- **Failure**: Feature not recognized → specify geometry type; Machine limitations → suggests alternatives

### Examples
**Example 1**: "Plan machining for a 50mm deep pocket in aluminum"
→ `genplan_generate(feature: "pocket", depth: 50, material: "6061-T6")` → Returns roughing + semi-finish + finish operations with tools, speeds, feeds

**Example 2**: "Compare conventional vs trochoidal for this slot"
→ `genplan_compare(feature: "slot", strategies: ["conventional", "trochoidal"])` → Side-by-side comparison: cycle time, tool life, surface finish, cost

# GENERATIVE PROCESS PLANNING

## Plan Generation Pipeline
1. **Feature Analysis**: Parse geometry, material, tolerances, surface finish requirements
2. **Strategy Selection**: Choose roughing/finishing approaches based on feature type
3. **Tool Selection**: Pick optimal tools from registry for each operation
4. **Parameter Calculation**: Compute speeds/feeds using coupled physics models
5. **Sequence Optimization**: Order operations for minimum tool changes and setup time
6. **Validation**: Check against machine envelope, spindle limits, tool reach

## Supported Feature Types
- Pockets (open, closed, island)
- Holes (through, blind, threaded, counterbore)
- Profiles (2D contour, 3D surface)
- Slots (straight, T-slot, dovetail)
- Faces (top, step, chamfer)
- Threads (internal, external)

## Optimization Objectives
| Objective | Optimizes For | Trade-off |
|-----------|--------------|-----------|
| Minimum time | Cycle time reduction | May reduce tool life |
| Minimum cost | Total manufacturing cost | May increase cycle time |
| Best quality | Surface finish + tolerance | Slower, more passes |
| Balanced | Weighted combination | Default recommendation |
| Maximum tool life | Tool longevity | Conservative parameters |
