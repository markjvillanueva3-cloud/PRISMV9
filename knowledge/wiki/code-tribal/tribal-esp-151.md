---
name: tribal-esp-151
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "canned-cycles", "drilling", "hole-making", "c-axis"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-151.md
promoted_at: 2026-06-09T22:31:16.247Z
---

# Mill-Turn Canned Cycle Optimization for Holes

On mill-turn centers, ESPRIT selects between drilling on the milling spindle (stationary workpiece) or drilling on the turret (rotating workpiece) based on hole position and available tooling. Axial holes on the spindle centerline use turret-mounted drills with the workpiece spinning (traditional lathe drilling). Radial or off-center holes use the milling spindle with C-axis positioning. ESPRIT outputs the correct canned cycle format for each mode — G83 peck drill for milling spindle, G83 with C-axis lock for turret drilling. For bolt circles, the milling spindle is faster due to rapid C-axis indexing.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:esprit-docs
**Operations:** drilling

## Related
- [[worknc-cam-tips-wnc-061|Canned Cycle Output for Standard Hole Operations]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[bobcad-cam-tips-bc-150|BobCAD Mill-Turn Eccentric Turning with C-Axis Interpolation]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
