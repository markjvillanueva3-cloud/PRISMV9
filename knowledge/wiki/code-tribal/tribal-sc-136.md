---
name: tribal-sc-136
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "wire-edm", "wire-selection", "technology-table", "materials"]
confidence: 86
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-136.md
promoted_at: 2026-06-09T22:31:16.600Z
---

# Wire EDM Material and Wire Selection — Match Technology Tables

SolidCAM Wire EDM uses machine-specific technology tables that define cutting parameters based on three inputs: workpiece material, wire type/diameter, and workpiece thickness. Common wire types: brass (0.25mm standard, best all-around), zinc-coated brass (faster cutting in steel), molybdenum (0.18mm for fine features in carbide), and tungsten (0.03-0.07mm for micro EDM). Match the technology table to your actual setup — cutting with mismatched parameters causes wire breaks, poor surface finish, or excessive electrode wear. Create custom technology entries for unusual material-thickness combinations by interpolating between existing table values and running test cuts.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** wire_edm, setup

## Related
- [[solidcam-cam-tips-sc-130|Wire EDM Profile Cutting — 2-Axis Contour with Multiple Skim Passes]]
- [[solidcam-cam-tips-sc-131|Wire EDM Taper Cutting — Constant and Variable Angle Profiles]]
- [[solidcam-cam-tips-sc-132|Wire EDM 4-Axis — Independent Upper and Lower Contour Programming]]
- [[solidcam-cam-tips-sc-133|Wire EDM No-Core Cutting — Prevent Slug Drops in Tight Cavities]]
- [[solidcam-cam-tips-sc-134|Wire EDM Auto-Threading and Tab Strategy — Unattended Multi-Cavity Cutting]]
