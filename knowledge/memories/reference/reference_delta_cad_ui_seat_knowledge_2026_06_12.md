---
name: reference_delta_cad_ui_seat_knowledge_2026_06_12
description: "Hard-coded seat-UI navigation knowledge shipped for delta: Fusion 360 / hyperMILL+hyperCAD-S / Mastercam X8 wiki entries (knowledge/wiki/cad/ui-*.md) + galaxy MEMORY.md wiring. Fusion API unit trap = cm (2.54, not 25.4). Navigate-by-reference via kilo's :18365 add-in beats UI probing. (slot:zulu, 2026-06-12)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.544Z
aliases: reference_delta_cad_ui_seat_knowledge_2026_06_12
---


# Delta seat-UI knowledge population (slot:zulu, 2026-06-12)

Operator: "we need ... how to navigate and use the ui of fusion, hypercad/hypermill and mastercam ... hard coded."

Shipped three hard-coded wiki entries under `knowledge/wiki/cad/`:
- **[[ui-fusion360-navigation]]** — workspaces/browser/timeline/S-box shortcuts, modeling loop, Scripts & Add-Ins (`adsk.core`/`adsk.fusion` skeleton), **UNITS TRAP: Fusion API internal unit = cm → inches x 2.54 (NOT 25.4)**, no-headless (CAD-FUSION-LIVE resident pattern), navigate-by-reference via kilo's `PRISM_Fusion_Drive` `:18365` JSON endpoints ([[fusion-backend-nav-map]]) — UI knowledge is for understanding + fallback, not primary navigation.
- **[[ui-hypermill-hypercad-navigation]]** — hyperCAD-S host vs hyperMILL docked-browser model (Job list/Model/Tools/Features/Macros tabs), CAM workflow, macro+feature tech = native automation hook, AUTOMATION Center if licensed, file-in/file-out service pattern, **v31 NOT v33** on this machine.
- **[[ui-mastercam-navigation]]** — X8 classic-menu anatomy (Operations Manager, Gview/Cplane/Tplane/WCS distinction, red-X regenerate cycle), Verify/Backplot/G1 post flow, NET-Hook (modern) / C-Hook / VBScript (legacy) automation lanes, ribbon-era delta noted.

Wired into `mcp-server/src/engines/cad/MEMORY.md` (new "Text->CAD generation + seat-UI knowledge" section) alongside the text->CAD lane pointers and india's resources->data commits (radii a872dbcfa8, bbox e485a0ac18, topology 22be177ec3).

Provenance honesty (R12): content = model-knowledge baseline + in-repo corpus pointers; version-specific menu names flagged for verification on the live seats (Fusion current, hyperCAD v31, Mastercam X8). Nightly YT extraction queries (4 CAD-UI ids) keep enriching the same surface.

Related: [[reference_kilo_fusion_backend_nav_map_2026_05_31]] · [[reference_hypermill_use_v31_not_v33_2026_05_27]] · [[reference_delta_camm_phase_decisions_2026_05_29]] · [[cad-text-to-cad-landscape]]
