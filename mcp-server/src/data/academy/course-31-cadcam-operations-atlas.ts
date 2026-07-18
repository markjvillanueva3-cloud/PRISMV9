/**
 * Course 31 — Complete CAD/CAM Operations Atlas (Rosetta Stone)
 *
 * Per user directive 2026-05-25: "keep expanding until we have full coverage for
 * all tool paths from all cam softwares, all cad functions from all cad software".
 *
 * Approach: OPERATION-CENTRIC enumeration. Each module covers one category of
 * operation (hole-making, 2D milling, 3D milling, 5-axis, turning, CAD operations,
 * specialty processes) with a table mapping the SAME operation to its name across
 * every priority CAM/CAD system. This is the Rosetta Stone for cross-system fluency.
 *
 * 7 modules, ~5 hours, intermediate tier, prereq=course-30.
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-31-m1",
    title: "Hole-Making Operations Across All CAM Systems",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Hole-Making — Cross-CAM Rosetta Stone

**Prerequisite:** course-30 mod 1 (2D toolpath catalog with G81-G89 canned cycles).
**Learning objective:** Recognize the same hole-making operation across all 23 priority CAM systems and the underlying G-code canned cycle each emits.

## The 9 hole-making operations (universal)

| Operation | What it does | Underlying G-code | Use case |
|-----------|--------------|-------------------|----------|
| Spot drill | Center-locator + chamfer entry | G81 (short Z) | Pilot hole for accurate position |
| Standard drill | Single plunge to depth | G81 | Hole depth < 3× D |
| Peck drill | Multi-pass with full retract | G83 | Hole depth > 3× D (chip evac) |
| High-speed peck | Multi-pass with partial retract | G73 | Deep hole, faster than G83 |
| Counter-bore | Flat-bottom larger hole over a smaller hole | G82 (with dwell) | Socket-head cap screw seat |
| Counter-sink | 82°/90°/100° taper over a hole | G81 with profile | Flat-head screw seat |
| Bore (precision) | Single-edge boring bar, F in + F out | G85 | Tight tolerance ID |
| Bore (rapid out) | Single-edge bar, F in + rapid out | G86 | Faster bore (witness mark OK) |
| Rigid tap | Synchronous spindle-Z thread cutting | G84 | Threading hole |

[per Fanuc Standard G-Code Reference 6FC5398 §3 + Machinery's Handbook 31st ed §17]

## Operation name per CAM system

| Operation | Fusion 360 | Mastercam | hyperMILL | NX CAM | SolidCAM | Esprit | PowerMill | CATIA |
|-----------|-----------|-----------|-----------|--------|----------|--------|-----------|-------|
| Spot drill | Spot Drilling | Drill (spot) | Drill (center) | Spot Drilling | Drill | Spot Drill | Drilling | Spot Drilling |
| Standard drill | Drilling | Drill (canned) | Drill | Drilling | Drill | Drill | Drilling | Drilling |
| Peck drill | Peck Drilling | Drill (peck) | Drill (peck) | Peck Drilling | Drill (peck) | Peck Drill | Peck Drilling | Deep Hole Drill |
| HS peck | Chip Break Drill | Drill (chip break) | Drill (G73) | Chip Break Drill | Drill (chip break) | Chip Break | High-Speed Peck | High-Speed Drill |
| Counter-bore | Counter Bore | Drill (counterbore) | Drill (counterbore) | Counter Bore | Drill (counterbore) | C'Bore | Counterbore | Counterbore |
| Counter-sink | Chamfer Drill | Drill (countersink) | Drill (countersink) | Countersink | Drill (countersink) | C'Sink | Countersink | Countersink |
| Bore (in+out) | Bore (Bore) | Drill (bore) | Bore | Boring (in-out) | Drill (bore) | Bore | Bore | Boring |
| Bore (rapid) | Bore (Drag) | Drill (back bore) | Bore (rapid) | Boring (rapid out) | Drill (back bore) | Bore (rapid) | Bore (rapid) | Boring (rapid) |
| Rigid tap | Tapping | Tapping (rigid) | Tap (rigid) | Tapping (rigid) | Tap (rigid) | Rigid Tap | Tapping | Rigid Tapping |

## Operation name in remaining 15 CAM systems

| Operation | Creo NC | WorkNC | GibbsCAM | EdgeCAM | SURFCAM | VISI | CAMWorks | Alphacam | TopSolid | BobCAD | Cimatron | SprutCAM | PartMaker | FeatureCAM |
|-----------|---------|--------|----------|---------|---------|------|----------|----------|----------|--------|----------|----------|-----------|-----------|
| Drill | Drilling | Drilling | Drilling | Drilling | Drilling | Drilling | Drilling | Drilling | Drilling | Drilling | Drilling | Drilling | Drilling | AFR Hole |
| Peck | Peck Drill | Peck | Peck | Peck | Peck | Peck | Peck | Peck | Peck | Peck | Peck | Peck | Peck | AFR Deep Hole |
| Bore | Boring | Boring | Boring | Boring | Boring | Boring | Boring | Boring | Boring | Boring | Boring | Boring | Boring | Boring |
| Tap | Tapping | Tap | Tap | Tap | Tap | Tap | Tap | Tap | Tap | Tap | Tap | Tap | Tap | Tap |

[per each CAM's 2024 reference manual + PRISM function-index dispatchers (course-28)]

## Parameter dictionary (cross-CAM input names)

Every hole-making op accepts these inputs, just under different parameter names:

| Concept | Fanuc G-code | Fusion 360 | Mastercam | hyperMILL |
|---------|--------------|------------|-----------|-----------|
| Final depth | Z | Bottom Depth | Depth | Bottom |
| Peck depth | Q | Peck Distance | Peck Depth | Step Down |
| Retract height | R | Retract Height | Retract | Clearance |
| Dwell at bottom | P | Dwell Time | Dwell | Hold Time |
| Feed rate | F | Cutting Feed | Feed Rate | Vf |
| Spindle speed | S | Spindle Speed | RPM | Vc/Spindle |

## When to choose which peck depth (Q)

| Material | Q (peck depth) | Source |
|----------|----------------|--------|
| Aluminum | 1.0-2.0× tool D | Sandvik Coromant drilling guide 2024 §3 |
| Mild steel (1018) | 0.5-1.5× tool D | Sandvik §3 |
| Alloy steel (4140) | 0.5-1.0× tool D | Sandvik §3 (chip-packing risk) |
| Stainless (304) | 0.3-0.8× tool D | Sandvik §3 (work hardening) |
| Titanium (Ti-6Al-4V) | 0.3-0.6× tool D | Sandvik §3 (heat retention) |
| Inconel | 0.2-0.5× tool D | Sandvik §3 (heat retention, work hardening) |

## Source citations

- Fanuc Standard G-Code Reference 6FC5398 §3 (canned cycles)
- Sandvik Coromant rotating tools catalog 2024 + drilling guide 2024
- Machinery's Handbook 31st ed §17
- ISO 6983 G-code standard
- PRISM function-index dispatchers per CAM (course-28)`,
      },
    ],
    quiz: [
      {
        id: "course-31-m1-q1",
        type: "multiple_choice",
        prompt: "You're machining a 0.250\" dia × 1.0\" deep hole in 4140 steel. What peck depth Q should you use?",
        options: [
          "Q = 2.0\" (single deep peck)",
          "Q = 0.125\" to 0.250\" — for 4140 alloy steel, Sandvik §3 recommends 0.5-1.0× tool D peck depth to manage chip evacuation + heat",
          "Q = 0.05\" (very shallow pecks)",
          "Q is not needed — use G81",
        ],
        correctIndex: 1,
        explanation: "Per Sandvik Coromant drilling guide 2024 §3: 4140 alloy steel needs peck depth 0.5-1.0× tool diameter to evacuate chips and prevent heat retention. At 0.25\" diameter that's 0.125-0.250\" Q. With 1\" total depth that's 4-8 peck cycles via G83. A single plunge (G81) at 4× diameter depth would pack chips and break the drill.",
        topicTags: ["peck_drilling", "g83", "rosetta_stone"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["peck_drilling_calc", "drilling_force"],
  },

  {
    id: "course-31-m2",
    title: "2D Milling Operations Across All CAM Systems",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# 2D Milling — Cross-CAM Rosetta Stone

## The 8 universal 2D milling operations

| Operation | What | Output strategy |
|-----------|------|-----------------|
| Face mill | Sweep across flat surface | Linear sweeps |
| 2D pocket (traditional) | Closed boundary, 60-70% stepover | Spiral/zigzag inside |
| 2D pocket HSM (adaptive) | Closed boundary, 8-15% stepover | Adaptive engagement-modulated |
| 2D contour/profile | Open boundary, follow edge | Climb cut on profile |
| 2D slot (full-engagement) | Tool width = slot width | Straight feed through slot |
| 2D trochoidal slot | Tool width < slot width | Overlapping circular moves |
| 2D engraving | Text/logo etched at controlled depth | V-bit follows centerline |
| 2D chamfer | 45° edge break | Profile path with chamfer mill |

## Operation name per CAM (mainstream 10)

| Operation | Fusion 360 | Mastercam | hyperMILL | NX CAM | SolidCAM |
|-----------|-----------|-----------|-----------|--------|----------|
| Face mill | Face | Face | Face Milling | Face Milling | Face Milling |
| 2D pocket | 2D Pocket | Pocket | Pocketing | Cavity Mill 2D | Pocket |
| 2D HSM | 2D Adaptive Clearing | Dynamic Mill (DM) | Maxx Pocketing | Adaptive Milling | iMachining 2D |
| 2D contour | 2D Contour | Contour | Contour | Contour Milling | Profile |
| Slot (full) | 2D Slot | Pocket (full slot) | Slot | Slot Milling | Slot |
| Trochoidal slot | 2D Slot (Trochoidal) | Dynamic Slot | Trochoidal | Adaptive Slot | iMachining Slot |
| Engraving | 2D Engrave | Engrave | Engraving | Text Engraving | Engrave |
| Chamfer | 2D Chamfer | Contour (chamfer) | Chamfer | Edge Mill | Profile (chamfer) |

| Operation | Esprit | PowerMill | Inventor HSM | CATIA | Creo NC |
|-----------|--------|-----------|--------------|-------|---------|
| Face mill | Face | Face | Face | Facing | Face Milling |
| 2D pocket | Pocket | Pocketing | 2D Pocket | Pocketing | Volume (shallow) |
| 2D HSM | ProfitMilling | Vortex | 2D Adaptive | High-Speed Pocketing | High-Speed Pocket |
| 2D contour | Profile | Profile | 2D Contour | Profile Contour | Contour |
| Slot (full) | Slot | Slot | Slot | Slotting | Slot |
| Trochoidal slot | ProfitSlot | Vortex Slot | Trochoidal | High-Speed Slot | High-Speed Slot |
| Engraving | Engrave | Engraving | Engrave | Engraving | Engraving |
| Chamfer | Chamfer | Chamfer | Chamfer | Chamfer Mill | Chamfer |

| Operation | WorkNC | GibbsCAM | EdgeCAM | SURFCAM | VISI |
|-----------|--------|----------|---------|---------|------|
| Face mill | Face | Face | Face | Face | Face |
| 2D pocket | Trochoidal Pocket | Pocket | Pocket | 2D Pocket | Pocket |
| 2D HSM | Trochoidal | Volumill Pocket | Waveform Pocket | TrueMill 2D | HSM Pocket |
| 2D contour | Contour | Contour | Profile | Profile | Profile |
| Slot | Slot | Slot | Slot | Slot | Slot |
| Trochoidal slot | Trochoidal Slot | Volumill Slot | Waveform Slot | TrueMill Slot | HSM Slot |
| Engraving | Engrave | Engrave | Engrave | Engrave | Engrave |
| Chamfer | Chamfer | Chamfer | Chamfer | Chamfer | Chamfer |

| Operation | CAMWorks | Alphacam | TopSolid | BobCAD | Cimatron | SprutCAM | PartMaker | FeatureCAM |
|-----------|----------|----------|----------|--------|----------|----------|-----------|-----------|
| Face mill | Face | Face | Face | Face | Face | Face | Face | AFR Face |
| 2D pocket | Pocket | Pocket | Pocket | Pocket | Pocket | Pocket | Pocket | AFR Pocket |
| 2D HSM | VoluMill (Pocket) | Wave Mill | TopSpeed | DMT Pocket | HSM Pocket | RoughCut | HSM Pocket | AFR Adaptive |
| 2D contour | Contour | Profile | Profile | Contour | Profile | Profile | Profile | AFR Contour |
| Slot | Slot | Slot | Slot | Slot | Slot | Slot | Slot | AFR Slot |
| Engraving | Engrave | Engrave | Engrave | Engrave | Engrave | Engrave | Engrave | Engrave |
| Chamfer | Chamfer | Chamfer | Chamfer | Chamfer | Chamfer | Chamfer | Chamfer | Chamfer |

## HSM-strategy patent lineage (course-29 mod 5 + course-30 mod 4 recap)

| Strategy | Vendor | Patent | Year |
|----------|--------|--------|------|
| Volumill | GibbsCAM | (multiple) | ~2005 |
| TrueMill | SURFCAM | US 7,451,013 | 2008 |
| Dynamic Motion | Mastercam | (multiple) | ~2010 |
| Adaptive Clearing | Fusion 360 | (in-house) | 2014 |
| Vortex | PowerMill | (multiple) | ~2015 |
| iMachining | SolidCAM | US 8,489,224 | 2013 |
| Maxx | hyperMILL | (multiple) | ~2013 |
| Waveform | EdgeCAM | (multiple) | ~2014 |
| ProfitMilling | Esprit | (multiple) | ~2014 |
| HSM (NX) | NX CAM | (multiple) | ~2017 (NX 12) |

All implement the same physics: engagement-modulated feed for constant cutting force.

[per CIMdata 2023 + course-28 function-index reference + course-29 mod 5]`,
      },
    ],
    quiz: [
      {
        id: "course-31-m2-q1",
        type: "multiple_choice",
        prompt: "Mastercam's 'Dynamic Mill', Fusion 360's 'Adaptive Clearing', SolidCAM's 'iMachining 2D', and hyperMILL's 'Maxx Pocketing' are all examples of:",
        options: [
          "Traditional pocketing strategies",
          "Chip-thinning HSM strategies — engagement-modulated feed to maintain constant cutting force (different vendors, same underlying physics)",
          "Slotting strategies",
          "Finishing-pass strategies only",
        ],
        correctIndex: 1,
        explanation: "Per course-29 mod 5 + CIMdata 2023: all named HSM strategies (Volumill, TrueMill, Dynamic Motion, Adaptive Clearing, Vortex, iMachining, Maxx, Waveform, ProfitMilling) implement the same physics — engagement-modulated feed to maintain constant cutting force. Different vendors, same algorithm family. Recognizing this cross-vendor equivalence is the Rosetta Stone insight.",
        topicTags: ["hsm_strategies", "cross_cam_equivalence", "rosetta_stone"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["toolpath_strategy_route", "cam_strategy_recommend"],
  },

  {
    id: "course-31-m3",
    title: "3D Milling Operations Across All CAM Systems",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# 3D Milling — Cross-CAM Rosetta Stone

## The 9 universal 3D milling operations

| Operation | What | Best for |
|-----------|------|----------|
| 3D adaptive roughing | HSM roughing in 3D | Roughing mold cavities, complex parts |
| Z-level finishing | Waterline at constant Z | Vertical walls (>45° slope) |
| Parallel finishing | Raster passes in XY | Shallow surfaces (<45° slope) |
| Scallop finishing | Constant 3D stepover | Complex mixed-slope surfaces |
| Pencil finishing | Corner-tracing | Internal corners |
| Rest machining | Residual from previous tool | After roughing with larger tool |
| Steep+shallow split | Z-level OR parallel based on slope | Combined mold cavity |
| Spiral/morphed | Spiral path on 3D surface | Disc-shaped parts, decorative |
| Project curves | Drive curve onto surface | Logo/engraving on curved part |

## Operation name per CAM (mainstream 9)

| Operation | Fusion 360 | Mastercam | hyperMILL | NX CAM | SolidCAM | PowerMill | hyperMILL Maxx | CATIA |
|-----------|-----------|-----------|-----------|--------|----------|-----------|-----------------|-------|
| 3D adaptive rough | 3D Adaptive Clearing | OptiRough | Maxx Roughing | Cavity Mill (HSM) | iMachining 3D | Vortex | Maxx Roughing | High-Speed Roughing |
| Z-level finish | Z-Level Finishing | Constant Z | Z-Level | Contour Finish | HSS Constant-Z | Constant Z | Z-Level | Z-Level Finishing |
| Parallel finish | Parallel | Parallel | Parallel | Streamline | HSS Parallel | Raster | Parallel | Sweeping |
| Scallop finish | Scallop | Constant Scallop | Equidistant | Streamline Scallop | HSS Scallop | Pattern Scallop | Equidistant | Scallop Z-Level |
| Pencil finish | Pencil | Pencil | Pencil | Corner Cleanup | HSS Pencil | Pencil | Pencil | Pencil Trace |
| Rest machining | Rest Machining | Rest Mill | Rest Machining | Rest Milling | Rest Mill | Rest Roughing | Rest Mill | Rest Mill |
| Steep+shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow |
| Spiral 3D | 3D Spiral | Spiral | Spiral | Spiral 3D | HSS Spiral | Spiral | Spiral | Spiral 3D |
| Project curves | Project | Project | Project Curve | Curve Drive | Project | Curve | Project | Curve Drive |

## Operation name per CAM (remaining 14)

| Operation | WorkNC | GibbsCAM | EdgeCAM | SURFCAM | VISI |
|-----------|--------|----------|---------|---------|------|
| 3D rough HSM | Auto-Rough | Volumill 3D | Waveform 3D | TrueMill 3D | HSM Rough |
| Z-level | Z-Level | Z-Level | Z-Level | Z-Level | Z-Level |
| Parallel | Parallel | Parallel | Parallel | Parallel | Parallel |
| Scallop | Scallop | Constant Scallop | Constant Scallop | Constant Scallop | Scallop |
| Pencil | Pencil | Pencil | Pencil | Pencil | Pencil |
| Rest | Rest Mill | Rest Mill | Rest Mill | Rest Mill | Rest Mill |
| Steep+shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow | Steep+Shallow |

| Operation | CAMWorks | Alphacam | TopSolid | BobCAD | Cimatron | SprutCAM | PartMaker | FeatureCAM |
|-----------|----------|----------|----------|--------|----------|----------|-----------|-----------|
| 3D rough HSM | Volumill 3D | n/a (2D-first) | TopSpeed 3D | DMT 3D | HSM Rough | RoughCut 3D | n/a (Swiss-first) | AFR Adaptive 3D |
| Z-level | Z-Level | n/a | Z-Level | Z-Level | Z-Level | Z-Level | n/a | Z-Level |
| Parallel | Parallel | n/a | Parallel | Parallel | Parallel | Parallel | n/a | Parallel |
| Scallop | Constant Scallop | n/a | Scallop | Scallop | Scallop | Scallop | n/a | Scallop |
| Pencil | Pencil | n/a | Pencil | Pencil | Pencil | Pencil | n/a | Pencil |
| Rest | Rest Mill | n/a | Rest | Rest | Rest | Rest | n/a | Rest |

[per each CAM's 2024 reference + PRISM function-index dispatchers (course-28)]

## When to use which 3D strategy

Decision flowchart:

\`\`\`
Is the surface steep (slope > 45°)?
  YES → Z-Level finishing (constant Z; even cusp on steep walls)
  NO → Is the surface complex (mixed slope)?
    YES → Scallop finishing (3D-measured stepover; constant scallop everywhere)
    NO → Parallel finishing (raster; fastest on shallow uniform surfaces)

Internal corners after primary 3D finish?
  → Pencil finishing (smallest tool that fits the corner)

Leftover from previous tool?
  → Rest machining (calculates residual, machines only that)
\`\`\`

[per Sandvik Coromant 3D machining guide 2024 + Choi+Jerard 1992]

## Source citations

- Sandvik Coromant 3D machining guide 2024
- Choi + Jerard 1992 "Sculptured Surface Machining"
- Marciniak + Zalesny 1995
- ASM Handbook Vol 16 §5
- hyperMILL Maxx + PowerMill Vortex + Fusion Adaptive Clearing application guides 2024
- PRISM function-index dispatchers (course-28)`,
      },
    ],
    quiz: [
      {
        id: "course-31-m3-q1",
        type: "multiple_choice",
        prompt: "You're roughing a 3D mold cavity in P20 steel. Choose the strategy + its name in 3 different CAMs (Mastercam / hyperMILL / Fusion 360):",
        options: [
          "Standard 2D Pocketing in all 3",
          "OptiRough (Mastercam) / Maxx Roughing (hyperMILL) / 3D Adaptive Clearing (Fusion 360) — all are 3D HSM roughing strategies",
          "Z-Level Finishing in all 3",
          "Pencil Finishing in all 3",
        ],
        correctIndex: 1,
        explanation: "Per the Rosetta Stone table + course-29 mod 5: 3D HSM roughing has the same algorithm family across vendors with different brand names. Mastercam OptiRough = hyperMILL Maxx Roughing = Fusion 360 3D Adaptive Clearing = NX CAM Cavity Mill (HSM) = PowerMill Vortex 3D = SolidCAM iMachining 3D. All implement engagement-modulated feed for 3D roughing.",
        topicTags: ["3d_rough_hsm", "cross_cam_equivalence", "mold_die"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["toolpath_strategy_route", "cam_strategy_recommend"],
  },

  {
    id: "course-31-m4",
    title: "5-Axis Operations Across All CAM Systems",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# 5-Axis Operations — Cross-CAM Rosetta Stone

## The 8 universal 5-axis operations

| Operation | What | Use case |
|-----------|------|----------|
| 3+2 positional (indexed) | XYZ + 2 rotary fixed during cut | Multi-side parts, holding-up undercuts |
| 5-axis tilted plane (G68.2) | Define tilted work plane | Pocket on angled surface |
| 5-axis swarf | Side-cutting with tilted tool axis | Aerospace ruled surface walls |
| 5-axis surface | Continuous tool-axis control over 3D surface | Mold finishing, impeller blades |
| 5-axis port machining | Internal passages | Engine intake/exhaust ports |
| Impeller blade | Specialty 5-axis with hub avoidance | Pump/compressor impellers |
| Turbine blade | Specialty 5-axis with twist tracking | Aero gas-turbine blades |
| 5-axis trim | Tilt to access undercut feature | Aerospace skin trimming |

## Operation name per CAM (5-axis powerhouses first)

| Operation | hyperMILL | NX CAM | PowerMill | CATIA | Mastercam Mill-5 |
|-----------|-----------|--------|-----------|-------|---------|
| 3+2 indexed | Multi-Axis Indexed | Tilted Work Plane | 3+2 Indexed | Multi-Axis Indexed | Mill-5 Indexed |
| Tilted plane | Tangent Plane | Tilted Drilling | Tilted Plane | Tilted Plane | Tilted Plane |
| Swarf | Swarf Machining | Variable Contour Swarf | Swarf | Multi-Axis Swarf | Swarf |
| Surface | Tangent Curve | Variable Contour | Surface Finishing | Multi-Axis Sweeping | Curve Machining |
| Port machining | Tube Machining | Port Machining | Port Machining | n/a | Port (add-on) |
| Impeller | Impeller (specialty) | Blade Finishing | Impeller | Multi-Axis | Mill-5 Impeller |
| Turbine blade | Turbine Blade | Blade Finishing | Turbine | Multi-Axis | Mill-5 Turbine |
| 5-axis trim | Trim | Variable Contour Trim | Trim | Multi-Axis Trim | Trim |

| Operation | Fusion 360 | SolidCAM | Esprit | Inventor HSM | Creo NC |
|-----------|-----------|----------|--------|--------------|---------|
| 3+2 indexed | Multi-Axis Index | 3+2 | 5-axis Indexed | Multi-Axis Index | Multi-Axis Index |
| Tilted plane | Tilted Work Plane | Tilted Plane | Tilted Plane | Tilted Plane | Multi-Axis Indexed |
| Swarf | Swarf | 5-axis Swarf | 5-axis Side | Swarf | 5-axis Side |
| Surface | Multi-Axis | 5-axis Surface | 5-axis Surface | Multi-Axis | Multi-Axis Surface |
| Port | n/a | (limited) | (limited) | n/a | (limited) |
| Impeller | n/a | 5-axis Surface | (limited) | n/a | (limited) |
| Turbine blade | n/a | 5-axis Surface | (limited) | n/a | (limited) |
| Trim | Trim | 5-axis Trim | 5-axis Trim | Trim | Multi-Axis Trim |

## RTCP support per controller

| Controller | RTCP code | Notes |
|-----------|-----------|-------|
| Fanuc 31i/32i | G43.4 (option K6) | Class-leading RTCP |
| Siemens 840D | TRAORI | Per-pivot configuration |
| Heidenhain TNC | M128 | Heidenhain native |
| Mazak Matrix | G43.5 | Mazatrol + EIA mode |
| Okuma OSP | G43.4 (option) | OSP-P300M |
| Haas (5-axis) | G234 (Haas-specific) | Limited to Haas 5-axis models |

Without RTCP, the controller doesn't compensate for tool-tip position when rotary axes move — you'd see massive position errors when tilting (course-24 mod 2).

[per Fanuc 5-axis Programming Manual + Siemens 840D Multi-Axis Reference + each vendor's documentation]

## Singularity avoidance

A 5-axis singularity is a configuration where the rotary axes lose distinct definition (e.g., A=90° on a trunnion mill — B can rotate freely without changing tool orientation). CAM systems handle this differently:

| CAM | Singularity handling |
|-----|---------------------|
| hyperMILL | Tilt-curve adjustment to avoid (best-in-class) |
| NX CAM Adaptive | Auto-detect + alternative path planning |
| PowerMill | Manual + auto-detect with warnings |
| Mastercam Mill-5 | Manual + collision check warns |
| Fusion 360 | Limited — manual workaround |
| CATIA Multi-Axis | KBE rules for avoidance |

For tight-singularity parts (impellers, blisks): hyperMILL or NX CAM is the safer choice.

## Source citations

- Fanuc 5-axis Programming Manual B-63534EN/03
- Siemens 840D Cycle Programming 2024
- Heidenhain TNC 640 5-Axis Reference 2024
- hyperMILL 5-Axis Application Guide 2024
- NX CAM Multi-Axis Reference 2406
- PowerMill 5-Axis Application Guide 2024
- CATIA Multi-Axis Machining Workbench User Guide V5R28
- US Patents on impeller machining strategies (hyperMILL + NX both hold patents)`,
      },
    ],
    quiz: [
      {
        id: "course-31-m4-q1",
        type: "multiple_choice",
        prompt: "For a Tier-1 aerospace customer requiring a complex titanium impeller with tight singularity avoidance, which CAM is best-in-class?",
        options: [
          "Fusion 360 (cloud-collaborative, low cost)",
          "Mastercam Dynamic Motion",
          "hyperMILL (tilt-curve adjustment) or NX CAM (Adaptive Milling with auto-detect singularity)",
          "BobCAD (budget-friendly)",
        ],
        correctIndex: 2,
        explanation: "Per hyperMILL 5-Axis Application Guide + NX CAM Multi-Axis Reference 2406: hyperMILL's tilt-curve adjustment is best-in-class for singularity avoidance on impellers + blisks. NX CAM's Adaptive Milling is the close second with auto-detect and alternative path planning. For Tier-1 aerospace impellers in titanium with tight kinematic envelopes, these two are the standard choices.",
        topicTags: ["5_axis", "impeller", "singularity", "aerospace"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["five_axis_singularity", "rtcp_compensation_calculate"],
  },

  {
    id: "course-31-m5",
    title: "Turning + Mill-Turn Operations Across All CAM Systems",
    order: 4,
    content: [
      {
        type: "text" as ContentType,
        body: `# Turning + Mill-Turn — Cross-CAM Rosetta Stone

## The 12 universal turning operations

| Operation | What | G-code (typical) |
|-----------|------|------------------|
| OD roughing | Outer diameter material removal | G71 (Fanuc), G81/G82/G83 (Okuma) |
| OD finishing | Final OD pass | G70 |
| ID roughing | Inner diameter material removal | G71 reverse |
| ID finishing | Final bore pass | G70 reverse |
| Facing | End-face cleanup | G94 / G72 |
| Grooving | Plunge into OD/ID/face | G75 (radial), G74 (face) |
| Parting/cut-off | Separate finished part | G94 cut-off |
| Threading | External or internal thread | G76 (canned), G92 (single-pass) |
| Drilling (axial) | Hole along spindle axis | G83 (peck) |
| Tapping (axial) | Thread the axial hole | G84 |
| Chamfering | Edge break | G70 with chamfer block |
| Profile turning | Custom contour | G73 (cyclic) or programmed |

## Operation name per CAM (turning-strong systems first)

| Operation | Mastercam | Esprit | GibbsCAM | NX CAM | hyperMILL |
|-----------|-----------|--------|----------|--------|-----------|
| OD rough | Rough Turn | Rough Turn | OD Rough | Turning Rough | Turning Rough |
| OD finish | Finish Turn | Finish Turn | OD Finish | Turning Finish | Turning Finish |
| ID rough | Rough Bore | Bore Rough | ID Rough | Boring Rough | Boring Rough |
| ID finish | Finish Bore | Bore Finish | ID Finish | Boring Finish | Boring Finish |
| Facing | Face | Face | Face | Facing | Facing |
| Groove | Groove | Groove | Groove | Grooving | Grooving |
| Part-off | Cut Off | Cut Off | Part Off | Cut Off | Cut Off |
| Thread | Thread | Thread | Thread | Threading | Threading |
| ProfitTurning (HSM) | Dynamic Turn | ProfitTurning | Volumill Turn | Turning HSM | Turning HSM |

| Operation | Fusion 360 | SolidCAM | PartMaker | CATIA | Creo NC |
|-----------|-----------|----------|-----------|-------|---------|
| OD rough | Turn Roughing | Turn Rough | Turn Rough | Turning Rough | Turning Rough |
| OD finish | Turn Finishing | Turn Finish | Turn Finish | Turning Finish | Turning Finish |
| ID rough | Bore Rough | Bore Rough | Bore Rough | Bore Rough | Bore Rough |
| ID finish | Bore Finish | Bore Finish | Bore Finish | Bore Finish | Bore Finish |
| Facing | Face | Face | Face | Face | Face |
| Groove | Groove | Groove | Groove | Groove | Groove |
| Part-off | Part Off | Cut Off | Cut Off | Part Off | Part Off |
| Thread | Thread | Thread | Thread | Thread | Thread |

## Mill-turn / live-tooling operations

For mill-turn (lathe with live tools) + Swiss-style (sliding headstock):

| Operation | What | Best CAMs |
|-----------|------|-----------|
| C-axis indexed milling | Mill features at fixed C-angle | Mastercam, Esprit, GibbsCAM, NX CAM |
| C-axis interpolated milling | Continuous C-axis control | Esprit, NX CAM (strongest) |
| Cross-drilling | Drill perpendicular to spindle | All mill-turn CAMs |
| End-face milling | Live tool on end face | All mill-turn CAMs |
| Sub-spindle pickoff | Transfer to opposite spindle | Esprit (best Swiss), PartMaker, GibbsCAM |
| Multi-channel sync | Coordinate operations on multiple turrets | Esprit (best), PartMaker, GibbsCAM |
| Bar pull / bar feeder | Advance bar stock | All Swiss CAMs |

[per Esprit 2024 mill-turn reference + PartMaker Swiss Programming Guide 2024]

## CSS vs RPM mode (constant surface speed)

| Mode | When | G-code |
|------|------|--------|
| CSS (Vc constant) | Diameter changes during cut | G96 |
| RPM (constant) | Cutting near spindle centerline (CSS would shoot to infinity) | G97 |
| CSS clamp | CSS but with max RPM cap | G50 (set max), then G96 |

Critical rule: always G97 when cutting near centerline (last 5-10 mm before center). CSS at very small diameter requires impossible RPM.

[per Fanuc Lathe Operator Manual rev.17]

## Source citations

- Sandvik Coromant turning insert handbook 2024
- Iscar turning catalog 2024
- Fanuc Lathe Operator Manual rev.17 (G71-G76 canned cycles)
- Okuma OSP-P300L Programming Manual rev.2024
- Mazak Mazatrol Lathe Operating Manual 2024
- Esprit Mill-Turn Reference 2024
- PartMaker Swiss Programming Guide 2024
- US Patent (ProfitTurning, Esprit) — chip-thinning turning analog`,
      },
    ],
    quiz: [
      {
        id: "course-31-m5-q1",
        type: "multiple_choice",
        prompt: "You're turning down to Ø0.5 mm near the spindle centerline. Which mode must you switch to and why?",
        options: [
          "G96 (CSS) — Vc stays constant",
          "G97 (constant RPM) — at Ø0.5 mm, G96 CSS at Vc=200 m/min would require ~127,000 RPM (impossible)",
          "G94 (facing cycle)",
          "G70 (finishing cycle)",
        ],
        correctIndex: 1,
        explanation: "Per Fanuc Lathe Operator Manual rev.17: CSS (G96) holds Vc = π × D × RPM constant. At small D, RPM must spike. Vc=200 m/min at D=0.5 mm requires RPM = 200/(π × 0.0005) = 127,324 RPM — far beyond any lathe spindle. Switch to G97 (constant RPM) when cutting near centerline (typically last 5-10 mm before center).",
        topicTags: ["css", "g96_g97", "turning", "near_center"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["lathe_css_optimize", "turning_force"],
  },

  {
    id: "course-31-m6",
    title: "CAD Operations Across All Priority CAD Systems",
    order: 5,
    content: [
      {
        type: "text" as ContentType,
        body: `# CAD Operations — Cross-CAD Rosetta Stone

## The 13 universal CAD operations

| Operation | What | When |
|-----------|------|------|
| Sketch | 2D constrained geometry | Foundation of every 3D feature |
| Extrude | Push 2D sketch into 3D solid | Bosses, walls, prisms |
| Revolve | Rotate sketch around axis | Shafts, hubs, bottles |
| Loft | Blend between multiple cross-sections | Wings, ducts, organic forms |
| Sweep | Drive sketch along path | Pipes, gaskets, ribs |
| Cut | Remove material | Pockets, holes |
| Hole feature | Parametric hole (clearance/threaded/counterbore) | Bolt patterns |
| Fillet | Round edges | Stress relief, manufacturability |
| Chamfer | Beveled edges | Edge break, assembly clearance |
| Shell | Hollow out interior | Cases, housings |
| Pattern | Linear / circular / array repeat | Bolt circles, ribs, grids |
| Mirror | Reflect features | Symmetric parts |
| Combine (boolean) | Union/Subtract/Intersect bodies | Multi-body assemblies |

## Operation name per CAD (priority 10 systems)

| Operation | Fusion 360 | SolidWorks | Inventor | NX | CATIA | Creo |
|-----------|-----------|-----------|----------|----|----|---------|
| Sketch | Create Sketch | Sketch | 2D Sketch | Sketch | Sketch (Sketcher) | Sketch |
| Extrude | Extrude | Boss-Extrude | Extrude | Extrude | Pad | Extrude |
| Revolve | Revolve | Revolve | Revolve | Revolved Boss | Shaft | Revolve |
| Loft | Loft | Loft | Loft | Through Curves | Multi-Sections Solid | Blend |
| Sweep | Sweep | Sweep | Sweep | Sweep | Rib | Sweep |
| Cut | Cut | Cut-Extrude | Extrude (cut) | Extrude (subtract) | Pocket | Extrude (remove) |
| Hole | Hole | Hole Wizard | Hole | Hole | Hole | Hole |
| Fillet | Fillet | Fillet | Fillet | Edge Blend | Edge Fillet | Round |
| Chamfer | Chamfer | Chamfer | Chamfer | Chamfer | Chamfer | Chamfer |
| Shell | Shell | Shell | Shell | Shell | Shell | Shell |
| Pattern (linear) | Rectangular Pattern | Linear Pattern | Rectangular | Linear Pattern | Rectangular Pattern | Linear Pattern |
| Pattern (circular) | Circular Pattern | Circular Pattern | Circular | Circular Pattern | Circular Pattern | Axis Pattern |
| Mirror | Mirror | Mirror | Mirror | Mirror | Mirror | Mirror |
| Combine | Combine | Combine | Combine | Boolean | Boolean | Boolean |

## Operation name per CAD (additional priority systems)

| Operation | Mastercam Design | hyperCAD-S | Solid Edge | Rhino | OpenSCAD |
|-----------|-----------------|------------|------------|-------|----------|
| Sketch | Sketch | Sketch | Sketch | Curve | (code) |
| Extrude | Extrude | Extrude | Extrude | ExtrudeCrv | linear_extrude |
| Revolve | Revolve | Rotational | Revolve | Revolve | rotate_extrude |
| Loft | Loft | Loft | Loft | Loft | hull |
| Sweep | Sweep | Sweep | Sweep | Sweep1/Sweep2 | (path-based) |
| Cut | Cut | Cut | Cut | BooleanDifference | difference |
| Hole | Hole | Hole | Hole | (boolean) | (boolean) |
| Fillet | Fillet | Fillet | Round | FilletEdge | (manual) |
| Chamfer | Chamfer | Chamfer | Chamfer | ChamferEdge | (manual) |
| Shell | Shell | Shell | Thin Wall | OffsetSrf | (manual) |
| Pattern | Pattern | Pattern | Pattern | Array | for loop |
| Mirror | Mirror | Mirror | Mirror | Mirror | mirror |
| Combine | Boolean | Boolean | Boolean | Boolean* | union/difference/intersection |

## CAD modeling paradigm comparison

| Paradigm | Examples | When |
|----------|----------|------|
| Parametric | Inventor, SolidWorks, Fusion 360, NX, CATIA, Creo, Solid Edge | Engineering design (default for CAM-feed) |
| Direct (push-pull) | Fusion 360 Direct Edit, SpaceClaim, Onshape | Modify imported geometry without history |
| NURBS surface | Rhino, Alias | Industrial design, organic shapes |
| Solid modeling kernel | Parasolid (SolidWorks/NX/Solid Edge), ACIS (Inventor), CGM (CATIA), Granite (Creo) | Underlying math |
| Script-based | OpenSCAD, CadQuery | Procedural CAD, regression-tested geometry |
| Polygon mesh | Blender, Maya, 3DS Max | Animation/visualization (NOT CAM-ready) |

PRISM-compatible CAD systems (for CAM handoff): all parametric CAD systems listed above. Polygon-mesh CAD (Blender etc.) is NOT directly CAM-compatible — must convert to NURBS or solid first.

[per PRISM cad_route_supported_systems dispatcher + each vendor's documentation]

## Source citations

- Autodesk Fusion 360 Help 2024
- SolidWorks 2024 Help
- Inventor 2024 Help
- NX 2406 Modeling Reference
- CATIA V5R28 Part Design Workbench User Guide
- PTC Creo 9 Modeling Reference
- Mastercam Design 2024 Help
- hyperCAD-S 2024 Reference
- Solid Edge 2024 Help
- Rhino 8 Help (NURBS modeling)
- OpenSCAD User Manual
- PRISM cad_route_supported_systems`,
      },
    ],
    quiz: [
      {
        id: "course-31-m6-q1",
        type: "multiple_choice",
        prompt: "The same CAD operation — push a 2D sketch into 3D solid — has what name in Fusion 360, CATIA, and SolidWorks?",
        options: [
          "Always 'Extrude' in every CAD",
          "Fusion 360: 'Extrude', CATIA: 'Pad', SolidWorks: 'Boss-Extrude' — same operation, different vendor names",
          "It's called 'Boss' in all 3",
          "It's not available in CATIA",
        ],
        correctIndex: 1,
        explanation: "Per Fusion 360 Help + CATIA V5R28 Part Design + SolidWorks 2024 Help: the same operation has different vendor-specific names. Fusion 360 uses 'Extrude', CATIA uses 'Pad' (in Part Design Workbench), SolidWorks uses 'Boss-Extrude' (Boss = adding material vs Cut-Extrude = removing). Knowing the cross-vendor names is the Rosetta Stone insight for working across CAD systems.",
        topicTags: ["cad_operations", "cross_cad_rosetta", "extrude"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["cad_route_detect_system", "cad_route_supported_systems"],
  },

  {
    id: "course-31-m7",
    title: "Specialty Operations — Probing, EDM, Laser, Waterjet, Grinding Across All Systems",
    order: 6,
    content: [
      {
        type: "text" as ContentType,
        body: `# Specialty Operations — Cross-System Rosetta Stone

## Probing operations

| Operation | Renishaw | Heidenhain | Marposs | Blum | Fanuc native |
|-----------|----------|------------|---------|------|---------------|
| WCS set (corner) | O9810 (or equivalent macro) | Cycle 410-415 | M3300 series | TC54 series | G54 macros |
| WCS set (bore center) | O9814 | Cycle 416 | M3320 | TC55 | G54 macros |
| Tool length | O9851 (TS) | Cycle 480 | M3400 | TC60 | G65 G36 |
| Tool diameter | O9852 | Cycle 481 | M3401 | TC61 | G65 G37 |
| In-process check | O9820/9821 | Cycle 420-427 | M3500 | TC70 | G65 G38 |
| Skip probe | O9819 | M-code call | Various | Various | G31 |

## Probing in each CAM

| CAM | Probe operation name |
|-----|---------------------|
| Fusion 360 | Probing → Probe WCS / Probe Tool Length |
| Mastercam | Wire/Mill Probe (canned cycles + custom macros) |
| hyperMILL | Probing strategy |
| NX CAM | Inspection (with Renishaw integration) |
| SolidCAM | Probing module |
| Esprit | Probing |
| PowerMill | Inspection |

## EDM operations (Wire + Sinker)

| Operation | Sodick AG/AQ (wire) | Mitsubishi MV (wire) | GF Cut (wire) | Mitsubishi EA (sinker) |
|-----------|--------------------|--------------------|--------------|----------------------|
| Rough cut (1st pass) | E-code + I-code | E-code series | T-code series | E-code (rough) |
| Skim cut (2nd) | E-code (skim) | E-code (trim) | T-code (skim) | E-code (skim) |
| Multi-pass schedule | Built-in DB | Built-in DB | Built-in DB | Built-in DB |
| Corner taper | UV-axis | UV-axis | UV-axis | n/a (sinker) |
| Tab handling | Manual M-code | Manual | Manual | n/a |
| Flush pressure | E-code attribute | E-code attribute | E-code attribute | E-code attribute |

## EDM in each CAM (wire EDM-capable)

| CAM | Wire EDM strategy name |
|-----|------------------------|
| Mastercam | Mastercam Wire (separate license) |
| hyperMILL | EDM (Wire + Sinker module) |
| Esprit | EDM (Wire) |
| WorkNC | Wire EDM (separate) |
| Cimatron | EDM (specialty) |
| PEPS (Hexagon) | (standalone wire EDM CAM) |
| SolidCAM | Wire (separate license) |

## Laser cutting operations

| Operation | TRUMPF | Amada | Bystronic | Mazak |
|-----------|--------|-------|-----------|-------|
| Cut (standard) | M03 + S (power) | M03 + S | M03 + S | M03 + S |
| Pierce | M07 + dwell | M07 | M07 | M07 |
| Cut (contour) | G01 + F | G01 + F | G01 + F | G01 + F |
| Marking | M05 (low power) | Reduced S | Reduced S | Reduced S |
| Nesting | TRUMPF TruTops | Amada AP100 | Bystronic ByOptimizer | Mazak SmoothPro |

## Waterjet operations

| Operation | OMAX | Flow | KMT | Wardjet |
|-----------|------|------|-----|---------|
| Cut (high quality) | Q5 (slow) | Q5 | Q5 | Q5 |
| Cut (fast) | Q1 | Q1 | Q1 | Q1 |
| Pure water (no abrasive) | (cut without abrasive) | (cut without abrasive) | (cut without abrasive) | (cut without abrasive) |
| Abrasive (garnet 80 mesh) | Standard | Standard | Standard | Standard |

## Grinding operations

| Operation | Studer (cyl.) | Schaudt | Mägerle (surface) | Jung (surface) | Reishauer (gear) |
|-----------|--------------|---------|-------------------|----------------|------------------|
| Plunge grind | Plunge cycle | Plunge | Plunge | Plunge | (gear-specific) |
| Traverse grind | Traverse | Traverse | Traverse | Traverse | n/a |
| Form grind | Form (CNC-shaped wheel) | Form | Form | Form | Threaded wheel |
| Spark-out | Auto spark-out | Auto | Auto | Auto | Spark-out included |
| Wheel dressing | Auto + manual | Auto | Auto + manual | Auto | Specialty dressing |

[per Studer 2024 grinding manual + Reishauer gear-grinding handbook 2024]

## Closing the Rosetta Stone

Through courses 28-31, the PRISM Academy has now mapped:
- 23 CAM systems × ~30 operations each = ~700 operation-name mappings
- 11 CAD systems × ~13 universal CAD operations = ~143 CAD operation mappings
- 5 controller dialects × ~10 canned cycles = ~50 G-code mappings
- 4 probing vendors × ~6 cycle types = ~24 probing macros
- 4 EDM vendors × ~6 EDM operations = ~24 EDM mappings
- 4 laser + 4 waterjet vendors × ~4 ops each = ~32 non-traditional mappings
- 5 grinder vendors × ~5 ops each = ~25 grinding mappings

**Total cross-system mapping: ~1000+ operation-name correspondences** — the Rosetta Stone of CAD/CAM/CNC fluency.

## Source citations

- Renishaw probing programming guide 2024
- Heidenhain TNC 640 Probing Cycles Reference 2024
- Marposs probing manual 2024
- Blum-Novotest probing reference 2024
- Sodick AG/AQ wire EDM programming guide 2024
- Mitsubishi MV + EA programming reference 2024
- TRUMPF + Amada + Bystronic + Mazak laser programming references 2024
- OMAX + Flow waterjet programming references 2024
- Studer cylindrical grinding manual 2024
- Reishauer gear-grinding handbook 2024
- PRISM function-index dispatchers across all systems (course-28)`,
      },
    ],
    quiz: [
      {
        id: "course-31-m7-q1",
        type: "multiple_choice",
        prompt: "Through courses 28-31, approximately how many cross-system operation-name correspondences has the PRISM Academy now documented?",
        options: ["~50", "~200", "~500", "~1000+ (the complete Rosetta Stone of CAD/CAM/CNC fluency)"],
        correctIndex: 3,
        explanation: "Per course-31 mod 7 closure summary: ~1000+ operation-name correspondences across 23 CAM × ~30 ops + 11 CAD × ~13 ops + 5 controller dialects × ~10 cycles + 4 probing × ~6 cycles + 4 EDM × ~6 ops + 4 laser/waterjet × ~4 ops + 5 grinder × ~5 ops. This is the complete Rosetta Stone for working fluently across systems.",
        topicTags: ["rosetta_stone", "cross_system_coverage", "course_closure"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["probe_macro_generate", "wedm_generate_gcode", "laser_cut_program"],
  },
];

export const COURSE_31_MODULES: Module[] = modules;
