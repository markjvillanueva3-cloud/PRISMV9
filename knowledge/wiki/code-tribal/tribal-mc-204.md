---
name: tribal-mc-204
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "control-definition", "g-code", "fanuc", "siemens", "haas"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-204.md
promoted_at: 2026-06-09T22:31:16.445Z
---

# Control definition files must match the specific CNC control for accurate G-code generation

Mastercam's Control Definition (.control file) specifies the capabilities and limitations of the target CNC control: supported G-codes, canned cycle formats, rotary axis conventions, coordinate output resolution, and maximum block length. An incorrect control definition produces G-code that alarms on the machine or runs with unexpected behavior. Select the correct control definition in Machine Group Properties > Machine Definition. For common controls (FANUC, Siemens, Heidenhain, Haas, Okuma), Mastercam includes factory-supplied control definitions. For custom or less common controls, modify the closest factory definition to match your control's manual. Key parameters to verify: decimal precision (3 vs 4 decimal places), canned cycle format (G73/G83 peck drill syntax varies by control), tool change format (T01 M06 vs M06 T01), and work offset range (G54-G59, G54.1 P1-P48). Test every G-code feature with a dry-run before production cutting.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** setup, post_processing

## Related
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[fusion360-cam-tips-ext-f360-085|Control-Specific G-Code Features in Post Output]]
- [[surfcam-cam-tips-sc2-073|Machine-Specific Post Processors for Major Brands]]
- [[mastercam-cam-tips-mc-088|Canned cycle post output requires matching control-specific G-code sequences]]
- [[mastercam-cam-tips-mc-090|Control-specific optimization: output AICC/Nano mode commands for each control brand]]
