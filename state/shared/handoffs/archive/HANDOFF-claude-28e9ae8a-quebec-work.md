---
session: claude-28e9ae8a
topic: quebec-work
slot: quebec
written_at: 2026-06-26T18:56:52.282Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-28e9ae8a
status: active
---

# HANDOFF: claude-28e9ae8a
Updated: 2026-06-26T18:56:52.282Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-28e9ae8a

## STATE
## Kienzle redesign migration (session 28e9ae8a) -- STARTED

### Design source (fleet-wide memory: reference_kienzle_tool_crib_design_build_location_2026_06_26)
H:\KIENZLE APP BUILD.zip = revamped WHOLE app (26 .dc.html). Extracted: mcp-server/web/design-imports/kienzle-app-build/.

### Tool Crib page (page 1) progress
- Spec: produced (the design is a per-machine setup/offsets/collision PLANNER, NOT the inventory ToolCribEngine -- overlap in name only; Path A faithful port). Decisions: Path A, ember->amber, SVG v1 (3D deferred).
- UNIT 1 DONE (commit U-KIENZLE-TOOLCRIB-FOUNDATION): src/data/toolCribMachines.ts (data) + src/lib/toolCribGeometry.ts (computeCribVals, pure) + 90 tests. tsc clean, 2-arm scrutiny PASS. Caught+fixed builder's 9 tsc errors (worst closure-narrowing) + a partR fidelity gap.
- UNIT 2 (NEXT): ToolCribPage.tsx + components/tool-crib/* + App.tsx route. Build sequence in the spec. Visual 1:1 verify needs dev-server/Playwright.

### Wider rollout (25 more pages, multi-galaxy)
quebec implements each .dc.html -> src/pages/ consuming dispatchers; charlie(Quote)/hotel(ERP/EmployeePortal/Payroll/Inventory/JobCost/Scheduling)/oscar(Speed-Feed)/echo(Post)/delta(CADFeatures/Collision/Thermal)/lima(Academy)/mike-whiskey-foxtrot(Wizards) own backends. Many design data fields have NO backend yet (client-side planner model) -> backend builds owned by those domains.

### Lesson: bash -m commit msgs with backticks -> command substitution; use single-quotes/heredoc.

## RESUME
/startup-quebec /loop /goal -- MIGRATE the existing build to the new Kienzle design (H:\KIENZLE APP BUILD.zip extracted to mcp-server/web/design-imports/kienzle-app-build/, 26 .dc.html pages). Page 1 = Tool Crib: foundation DONE (U-KIENZLE-TOOLCRIB-FOUNDATION). NEXT UNIT = build ToolCribPage UI: src/pages/ToolCribPage.tsx + src/components/tool-crib/* consuming src/lib/toolCribGeometry.ts computeCribVals() + src/data/toolCribMachines.ts; register route in App.tsx (sibling of inventory); ember->amber token map; SVG tooling+kin-2D views (3D deferred, needs three dep); loading/error/empty states; wire crib LIFE% to toolCribApi.inventory() (the 1 real backend field). 1:1 VISUAL verification needs the dev-server + Playwright loop (no claude-in-chrome browser connected). Then roll out the other 25 pages by domain.

## CONTEXT

