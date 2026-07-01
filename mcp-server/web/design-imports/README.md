# Claude Design imports — drop zone

Drop exported Claude Design files here (`*.dc.html`), then tell the quebec chat the
filename. The chat implements the design 1:1 into `src/pages/` + `src/components/`
and wires it to the existing PRISM backend (HTTP bridge on `:3100`).

## ARRIVED (2026-06-26) — full revamped Kienzle app
The operator-confirmed canonical redesign of the WHOLE app landed as **`H:\KIENZLE APP BUILD.zip`**
(1.4MB, 42 files), extracted here to **`kienzle-app-build/`** (26 `.dc.html` pages + `Machine3D.js`,
`deck-stage.js`, `jm-data.js`, `support.js` + `research/*.png`). Source: Claude Design project `9e002608`.
Fleet-wide memory: `reference_kienzle_tool_crib_design_build_location_2026_06_26` (+ `MEMORY-RECENT.md`).

The 26 pages (implement each 1:1 into `src/pages/` + wire to existing `prism_*` dispatchers via `src/api/`):
Academy · Alarm Decoder · Audit & Rebrand · Backend Wiring Map · Blueprint Intake · CAD Features ·
Collision Gap · ERP · Employee Portal · Inventory · Job Cost · Materials · Payroll Labor · Post ·
Quality · Quote · Scheduling · Shop Floor · Speed-Feed · System Sync · Thermal Comp · **Tool Crib** ·
Tooling Shop · Trilobe Creator · Warm-Up Generator · Wizards.

Tool Crib backend already bridged: `/api/v1/tool-crib` (`ToolCribEngine`) + `src/api/toolCrib.ts`.
Multi-galaxy rollout (quebec UI; charlie/hotel/oscar/echo/delta/lima backends) — one page per unit, per-file scrutiny.

_Design SOURCE (the `.dc.html`/JS) is the implementation reference, not the shipped bundle._
