/**
 * WorkNC (Hexagon) CAM Tribal Knowledge Tips (wnc-001 through wnc-201)
 * 201 expert-level tips covering WorkNC CAM system, Auto5, WorkNC Dental,
 * WorkNC Robot, WorkNC Designer, Electrode Machining, Advanced Re-Machining,
 * Waveform Roughing, Composites, Hardened Materials, Process Variability,
 * Statistical Optimization, Stochastic Wear, and Digital Twin.
 * Generated 2026-03-13
 */
import type { KnowledgeTip } from "../engines/TribalKnowledgeEngine";

export const WORKNC_CAM_TIPS: KnowledgeTip[] = [
  // === Auto 5 (Automatic 5-axis) (wnc-001 to wnc-012) ===
  {
    id: "wnc-001",
    title: "Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis",
    body:
      "WorkNC Auto 5 automatically converts existing 3-axis toolpaths into " +
      "5-axis toolpaths with collision avoidance. The process is: (1) create " +
      "a 3-axis toolpath, (2) select Auto 5 conversion parameters, (3) the " +
      "system tilts the tool to avoid collisions while maintaining the " +
      "contact point. This eliminates the need for expert 5-axis programming " +
      "knowledge and can reduce cycle times by 25% through shorter tool " +
      "assemblies and better cutting conditions at the tool tip.",
    category: "cam_strategy",
    tags: ["auto-5", "5-axis", "conversion", "collision-avoidance"],
    operation_types: ["5_axis", "finishing"],
    confidence: 94,
    source: "web:worknc-hexagon",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-002",
    title: "Automatic Tool-Axis Calculation Avoids Manual Orientation",
    body:
      "WorkNC Auto 5 calculates the optimal tool-axis orientation at every " +
      "point along the toolpath based on collision geometry, machine limits, " +
      "and surface normal direction. The algorithm considers the full tool " +
      "assembly (cutter, holder, spindle) and tilts away from interference " +
      "zones. Set the tilt priority to prefer tilting toward open space " +
      "rather than toward adjacent walls. This produces safe toolpaths " +
      "without requiring the programmer to manually define tilt vectors.",
    category: "cam_strategy",
    tags: ["auto-5", "tool-axis", "automatic", "orientation"],
    operation_types: ["5_axis"],
    confidence: 93,
    source: "web:worknc-auto5",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-003",
    title: "Smooth Tool-Axis Transitions Prevent Jerky Motion",
    body:
      "WorkNC Auto 5 generates smooth tool-axis transitions between " +
      "adjacent toolpath segments to prevent sudden rotary-axis movements. " +
      "The smoothing algorithm limits the maximum angular change per linear " +
      "step to a user-defined value (typically 2-5 degrees per step). " +
      "Tighter limits produce smoother motion but may require more " +
      "aggressive tilting in advance of an obstacle. Set the angular rate " +
      "limit based on your machine's rotary-axis acceleration capability.",
    category: "cam_strategy",
    tags: ["auto-5", "smooth-transition", "angular-rate", "motion"],
    operation_types: ["5_axis"],
    confidence: 92,
    source: "web:worknc-smooth",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-004",
    title: "Automatic Tilting Accesses Deep Cavities with Short Tools",
    body:
      "WorkNC Auto 5 tilts the tool to reach deep cavity regions that " +
      "would otherwise require long tool assemblies in 3-axis mode. By " +
      "tilting 15-30 degrees, the effective tool reach increases by " +
      "15-30%, allowing use of shorter, more rigid tools. This reduces " +
      "tool deflection and vibration, improving surface finish. Set the " +
      "maximum tilt angle based on the machine's rotary axis limits and " +
      "the cavity geometry. Typical savings: 40-60% shorter tools and " +
      "30-50% less vibration.",
    category: "cam_strategy",
    tags: ["auto-5", "deep-cavity", "short-tools", "rigidity"],
    operation_types: ["5_axis", "finishing"],
    confidence: 93,
    source: "web:worknc-tilt",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-005",
    title: "3-to-5 Axis Conversion Preserves Original Toolpath Quality",
    body:
      "When converting a 3-axis toolpath to 5-axis via Auto 5, the " +
      "original contact points and cutting parameters are preserved. " +
      "Only the tool orientation changes. This means you can optimize " +
      "your 3-axis strategy first (stepover, scallop height, feed rate) " +
      "and then apply the 5-axis conversion without losing that " +
      "optimization. If the converted result has areas with excessive " +
      "tilting, refine the 3-axis source toolpath in those regions first.",
    category: "cam_strategy",
    tags: ["auto-5", "conversion", "quality", "contact-point"],
    operation_types: ["5_axis"],
    confidence: 91,
    source: "web:worknc-conversion",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-006",
    title: "Auto-Indexed vs Continuous 5-Axis Mode Selection",
    body:
      "WorkNC Auto 5 can generate either continuous (simultaneous) 5-axis " +
      "or auto-indexed (3+2) toolpaths. Use auto-indexed mode when the " +
      "geometry can be reached from a limited number of fixed orientations " +
      "for maximum rigidity. Use continuous mode for complex freeform " +
      "surfaces where smooth tool-axis transitions are needed. The " +
      "auto-indexed mode is also preferred for machines with lower " +
      "rotary-axis accuracy or slower rotary-axis response.",
    category: "cam_strategy",
    tags: ["auto-5", "indexed", "continuous", "mode-selection"],
    operation_types: ["5_axis"],
    confidence: 92,
    source: "web:worknc-indexed",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-007",
    title: "Tilt Control Parameters Fine-Tune 5-Axis Behavior",
    body:
      "WorkNC Auto 5 provides tilt control parameters: maximum tilt " +
      "angle (limit the total deviation from the surface normal), " +
      "preferred tilt direction (toward or away from specific surfaces), " +
      "tilt smoothing radius (the distance over which angular changes " +
      "are distributed), and tilt priority (collision avoidance vs " +
      "surface quality). For finishing operations, prioritize smooth " +
      "transitions; for roughing, prioritize collision clearance.",
    category: "cam_strategy",
    tags: ["auto-5", "tilt-control", "parameters", "priority"],
    operation_types: ["5_axis"],
    confidence: 90,
    source: "web:worknc-tiltcontrol",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-008",
    title: "Lead/Lag Angles Optimize Ball-Nose Cutting Contact",
    body:
      "WorkNC supports lead and lag angle control for 5-axis finishing " +
      "with ball-nose cutters. A lead angle of 10-15 degrees tilts " +
      "the tool forward in the feed direction, shifting the contact " +
      "point away from the zero-speed tip zone. This dramatically " +
      "improves surface finish on near-horizontal surfaces. Lag " +
      "angles (tilting backward) can improve chip evacuation on " +
      "vertical surfaces. Set lead/lag as constant values or as " +
      "surface-normal-dependent functions.",
    category: "cam_strategy",
    tags: ["lead-lag", "ball-nose", "5-axis", "surface-finish"],
    operation_types: ["5_axis", "finishing"],
    confidence: 92,
    source: "web:worknc-leadlag",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-009",
    title: "Tool Reach Optimization Selects Shortest Safe Assembly",
    body:
      "WorkNC Auto 5 can determine the shortest tool assembly that " +
      "reaches all features by analyzing the required tilt angles and " +
      "collision clearances. Start with the shortest available tool and " +
      "let Auto 5 calculate if collision-free access is possible. If " +
      "not, incrementally increase the tool length. This approach " +
      "always uses the most rigid possible assembly for each operation, " +
      "minimizing deflection and chatter.",
    category: "cam_strategy",
    tags: ["tool-reach", "auto-5", "assembly", "rigidity"],
    operation_types: ["5_axis"],
    confidence: 90,
    source: "web:worknc-reach",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-010",
    title: "Undercut Machining with Auto 5 Lollipop Cutters",
    body:
      "WorkNC Auto 5 supports undercut machining using lollipop (ball " +
      "on stick) and T-slot cutters. The Auto 5 module tilts the tool " +
      "to reach undercut regions that are hidden from the spindle " +
      "axis, using the full tool assembly collision model. Set the " +
      "undercut detection to automatic and specify the minimum " +
      "undercut depth to process. This eliminates the need for " +
      "EDM in many undercut situations, reducing lead time.",
    category: "cam_strategy",
    tags: ["undercut", "lollipop", "auto-5", "t-slot"],
    operation_types: ["5_axis"],
    confidence: 89,
    source: "web:worknc-undercut",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-011",
    title: "Deep Cavity Access via Progressive Auto 5 Tilting",
    body:
      "For deep cavities with overhanging walls, WorkNC Auto 5 uses " +
      "progressive tilting that gradually increases the tilt angle as " +
      "the tool descends deeper into the cavity. This maintains " +
      "collision clearance at every depth while using the minimum " +
      "necessary tilt. Set the tilt progression to 'proportional to " +
      "depth' for smooth transitions. Monitor the rotary-axis velocity " +
      "to ensure the machine can follow the programmed angular changes.",
    category: "cam_strategy",
    tags: ["deep-cavity", "progressive-tilt", "auto-5", "overhanging"],
    operation_types: ["5_axis", "finishing"],
    confidence: 89,
    source: "web:worknc-deepcavity",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-012",
    title: "Auto 5 with Rest Machining Targets Remaining Material",
    body:
      "WorkNC combines Auto 5 with rest machining to create 5-axis " +
      "toolpaths only in areas where material remains from previous " +
      "operations. The system calculates the rest stock from the " +
      "reference tool and applies Auto 5 collision avoidance to the " +
      "rest-material passes. This is especially effective for " +
      "clearing corners and fillets in deep cavities where the " +
      "previous larger tool could not reach.",
    category: "cam_strategy",
    tags: ["auto-5", "rest-machining", "combined", "corners"],
    operation_types: ["5_axis", "rest_machining"],
    confidence: 91,
    source: "web:worknc-auto5rest",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Global Roughing (wnc-013 to wnc-022) ===
  {
    id: "wnc-013",
    title: "Waveform Roughing Optimizes Tool Load for Longer Life",
    body:
      "WorkNC Waveform Roughing maintains constant tool engagement by " +
      "dynamically adjusting the toolpath to prevent engagement spikes " +
      "in corners and narrow regions. The algorithm computes " +
      "intermediate Z-step calculations that account for tool load, " +
      "enabling 2-3x deeper axial cuts and 2-3x higher feed rates " +
      "compared to conventional Z-level roughing. Set maximum " +
      "engagement to 8-15% of cutter diameter for steel and " +
      "15-25% for aluminum.",
    category: "cam_strategy",
    tags: ["waveform", "roughing", "constant-engagement", "tool-life"],
    operation_types: ["roughing", "3d_roughing"],
    confidence: 94,
    source: "web:worknc-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-014",
    title: "Z-Level Roughing with Automatic Rest Detection",
    body:
      "WorkNC's Z-level roughing automatically detects remaining stock " +
      "at each depth level and generates passes only where material " +
      "exists. The system builds a progressive stock model that " +
      "updates after each Z-level. Set the Z-step based on the " +
      "maximum recommended depth of cut for the tool (typically " +
      "50-80% of insert length for indexable tools). Enable " +
      "'Automatic level optimization' to skip empty levels.",
    category: "cam_strategy",
    tags: ["z-level", "roughing", "rest-detection", "stock-model"],
    operation_types: ["roughing", "3d_roughing"],
    confidence: 92,
    source: "web:worknc-zlevel",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-015",
    title: "Wavelet Roughing Combines Waveform with Adaptive Steps",
    body:
      "WorkNC's wavelet roughing strategy combines the waveform " +
      "constant-engagement approach with adaptive Z-stepping that " +
      "varies the depth increment based on local stock conditions. " +
      "In areas with thin remaining stock the steps are larger; " +
      "in areas with full stock the steps decrease to maintain " +
      "constant chip load. This hybrid approach achieves 20-30% " +
      "better material removal rates than either strategy alone.",
    category: "cam_strategy",
    tags: ["wavelet", "adaptive", "roughing", "mrr"],
    operation_types: ["roughing", "3d_roughing"],
    confidence: 90,
    source: "web:worknc-wavelet",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-016",
    title: "Multi-Level Roughing Processes All Depths in One Operation",
    body:
      "WorkNC's multi-level roughing processes all depth zones within " +
      "a single operation, automatically transitioning between levels. " +
      "The system optimizes tool movements between levels to minimize " +
      "retracts and air cutting. Enable 'Level linking optimization' " +
      "to allow the tool to spiral between adjacent levels rather than " +
      "retracting. This can reduce roughing cycle time by 15-25% on " +
      "multi-level cavity parts.",
    category: "cam_strategy",
    tags: ["multi-level", "roughing", "optimization", "transitions"],
    operation_types: ["roughing", "pocketing"],
    confidence: 90,
    source: "web:worknc-multilevel",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-017",
    title: "Rest from Roughing Targets Unmachined Stock Zones",
    body:
      "WorkNC's rest-from-roughing operation calculates the remaining " +
      "stock after the initial roughing pass and generates toolpaths " +
      "only in areas where material remains. Reference the previous " +
      "tool and operation to compute the rest zones. Use a tool " +
      "50-70% of the roughing tool diameter. The rest detection " +
      "threshold should be 0.1-0.2 mm above the stock allowance " +
      "to ensure complete material removal without redundant passes.",
    category: "cam_strategy",
    tags: ["rest-roughing", "stock-detection", "reference-tool", "efficiency"],
    operation_types: ["roughing", "rest_machining"],
    confidence: 92,
    source: "web:worknc-restrough",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-018",
    title: "Stock-Aware Roughing Uses Near-Net-Shape Input",
    body:
      "WorkNC's stock-aware roughing imports the actual stock geometry " +
      "(casting, forging, or pre-machined state) and generates " +
      "toolpaths only where material exists. Import the stock model " +
      "as STL or native CAD format. The system compares the stock to " +
      "the part model at each Z-level and eliminates passes over " +
      "already-clear areas. For castings with 3-8 mm allowance, " +
      "this typically saves 30-50% of roughing time.",
    category: "cam_strategy",
    tags: ["stock-aware", "casting", "near-net-shape", "cycle-time"],
    operation_types: ["roughing"],
    confidence: 91,
    source: "web:worknc-stockaware",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-019",
    title: "Plunge Roughing for Deep Narrow Features",
    body:
      "WorkNC's plunge roughing drives the tool axially into the " +
      "workpiece for deep narrow slots and ribs where side-cutting " +
      "would cause excessive deflection. The plunge motion uses the " +
      "tool's strongest axis and minimizes radial forces. Set the " +
      "plunge stepover to 60-75% of cutter diameter and the feed " +
      "to 50% of drilling feed rate. Effective for depth-to-width " +
      "ratios exceeding 4:1 in titanium and nickel alloys.",
    category: "cam_strategy",
    tags: ["plunge-roughing", "deep-features", "deflection", "axial"],
    operation_types: ["roughing"],
    confidence: 89,
    source: "web:worknc-plunge",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-020",
    title: "Core Roughing Spirals Outward from Bosses",
    body:
      "WorkNC's core roughing strategy generates spiral toolpaths " +
      "that move outward from protruding features (cores, bosses) " +
      "maintaining constant engagement throughout. The spiral " +
      "approach prevents the full-engagement corner problem of " +
      "conventional contouring. Use tangential arc entry and climb " +
      "milling for best wall quality. This is essential for mold " +
      "core blocks where wall accuracy drives final part quality.",
    category: "cam_strategy",
    tags: ["core-roughing", "spiral", "bosses", "constant-engagement"],
    operation_types: ["roughing"],
    confidence: 88,
    source: "web:worknc-core",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-021",
    title: "High-Feed Roughing with Button Cutters",
    body:
      "WorkNC supports high-feed milling strategies using button " +
      "cutters and high-feed face mills at shallow depths (0.5-1.5 " +
      "mm) and very high feed rates (3-5 m/min). The large nose " +
      "radius converts cutting forces into the spindle axis, " +
      "enabling aggressive feed rates without exceeding the " +
      "machine's radial force limits. Set stepover to 50-65% " +
      "of effective cutting diameter and enable chip thinning " +
      "compensation for accurate chip load control.",
    category: "cam_strategy",
    tags: ["high-feed", "button-cutter", "shallow-depth", "mrr"],
    operation_types: ["roughing", "facing"],
    confidence: 90,
    source: "web:worknc-highfeed",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-022",
    title: "Constant Engagement Roughing Eliminates Load Spikes",
    body:
      "WorkNC's constant engagement roughing limits the maximum " +
      "radial engagement angle throughout the toolpath. In corners " +
      "where conventional paths cause sudden engagement spikes, the " +
      "system generates trochoidal or peel-milling motions to maintain " +
      "the target engagement. This allows 2-3x deeper axial cuts " +
      "with consistent chip load. Set the maximum engagement angle " +
      "based on tool/material combination (typically 40-60 degrees " +
      "for carbide in steel).",
    category: "cam_strategy",
    tags: [
      "constant-engagement", "trochoidal", "chip-load", "tool-protection"
    ],
    operation_types: ["roughing", "3d_roughing"],
    confidence: 92,
    source: "web:worknc-engagement",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === 3D Finishing (wnc-023 to wnc-034) ===
  {
    id: "wnc-023",
    title: "Z-Level Finishing for Steep Wall Surface Quality",
    body:
      "WorkNC's Z-level finishing generates constant-Z contour passes " +
      "ideal for steep surfaces exceeding 45 degrees from horizontal. " +
      "Set the Z-step by target scallop height: 0.005-0.02 mm for " +
      "final finish, 0.05-0.15 mm for semi-finish. Enable variable " +
      "Z-step to slightly vary the increment and avoid synchronization " +
      "marks. Use ball-nose cutters with the largest practical " +
      "diameter to minimize cusp height on walls.",
    category: "cam_strategy",
    tags: ["z-level", "finishing", "steep", "scallop"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 93,
    source: "web:worknc-zfinish",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-024",
    title: "Contour Finishing Traces Part Boundaries Precisely",
    body:
      "WorkNC's contour finishing follows the exact profile of the " +
      "part boundary at each Z-level, producing clean wall surfaces. " +
      "Use tangential arc lead-in/lead-out to prevent witness marks " +
      "at entry and exit points. Set the finishing allowance to 0.0 " +
      "for final passes. For internal corners, the contour pass " +
      "automatically respects the tool radius and generates the " +
      "correct fillet based on cutter geometry.",
    category: "cam_strategy",
    tags: ["contour", "finishing", "profile", "boundary"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:worknc-contour",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-025",
    title: "Spiral Finishing Eliminates Entry/Exit Witness Marks",
    body:
      "WorkNC's spiral finishing generates a continuous helical " +
      "toolpath that covers the surface without retracts, eliminating " +
      "witness marks from tool entry/exit. The spiral starts from " +
      "center and works outward with automatic stepover adjustment. " +
      "Best for shallow bowl-shaped geometries and flat-bottomed " +
      "cavities. Set spiral direction to climb milling and overlap " +
      "to 5-10% for seamless surface coverage.",
    category: "cam_strategy",
    tags: ["spiral", "finishing", "continuous", "witness-marks"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 90,
    source: "web:worknc-spiral",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-026",
    title: "Radial Finishing for Dome and Circular Features",
    body:
      "WorkNC's radial finishing generates passes radiating from a " +
      "central point, ideal for dome-shaped and rotationally symmetric " +
      "features. Set angular increments of 1-3 degrees depending on " +
      "surface quality requirements. The passes fan out like spokes " +
      "with stepover measured as angular spacing. Add a final spiral " +
      "cleanup pass at the hub area where radial passes converge " +
      "to eliminate the central star pattern.",
    category: "cam_strategy",
    tags: ["radial", "finishing", "dome", "circular"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 88,
    source: "web:worknc-radial",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-027",
    title: "Flowline Finishing Follows Surface Natural Direction",
    body:
      "WorkNC's flowline finishing generates toolpaths that follow " +
      "the natural parametric direction of the surface. This " +
      "produces passes aligned with the geometry flow, ideal for " +
      "organic shapes where parallel passes create abrupt direction " +
      "changes. Select the dominant flow direction and set the " +
      "cross-step perpendicular to it. Flowline produces the most " +
      "aesthetically pleasing finish on consumer products and " +
      "automotive Class-A surfaces.",
    category: "cam_strategy",
    tags: ["flowline", "parametric", "organic", "class-a"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 89,
    source: "web:worknc-flowline",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-028",
    title: "Pencil Finishing Cleans Corners and Fillet Regions",
    body:
      "WorkNC's pencil finishing (pencil trace) identifies where the " +
      "tool contacts two surfaces simultaneously—internal corners " +
      "and fillets—and generates passes only along these intersection " +
      "lines. Use a ball-nose cutter equal to or slightly smaller " +
      "than the fillet radius. Multiple passes with increasing depth " +
      "produce clean, well-defined corners in mold cavities. This " +
      "is WorkNC's most efficient strategy for corner cleanup.",
    category: "cam_strategy",
    tags: ["pencil", "corners", "fillets", "cleanup"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 92,
    source: "web:worknc-pencil",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-029",
    title: "Steep/Shallow Automatic Strategy Combination",
    body:
      "WorkNC's automatic steep/shallow finishing combines Z-level " +
      "passes for steep regions with planar raster passes for shallow " +
      "regions. The threshold angle (typically 30-45 degrees) " +
      "determines the boundary. Set the overlap band to 5-10 degrees " +
      "to prevent ridges at the transition. This single operation " +
      "replaces what would otherwise require two separate finishing " +
      "operations with manual boundary selection.",
    category: "cam_strategy",
    tags: ["steep-shallow", "automatic", "hybrid", "transition"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 93,
    source: "web:worknc-steepshallow",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-030",
    title: "Scallop-Height Finishing Ensures Uniform Surface Quality",
    body:
      "WorkNC's scallop-height finishing dynamically adjusts the " +
      "stepover to maintain uniform theoretical scallop height across " +
      "the entire surface regardless of curvature. In high-curvature " +
      "regions passes are closer; on flat areas they spread out. " +
      "Set target scallop to 0.005-0.01 mm for polished surfaces. " +
      "This produces the most uniform pre-polish finish compared " +
      "to fixed-stepover strategies.",
    category: "cam_strategy",
    tags: ["scallop", "constant-cusp", "uniform", "stepover"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 92,
    source: "web:worknc-scallop",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-031",
    title: "Parallel Finishing with Optimized Cut Angle",
    body:
      "WorkNC's parallel (raster) finishing generates linear passes " +
      "at a user-defined angle. Choose the angle to align with the " +
      "longest surface dimension to minimize retracts. Enable zigzag " +
      "mode for bidirectional cutting (halves cycle time) but use " +
      "unidirectional climb milling for critical surface quality. " +
      "Set the stepover to achieve the target scallop height based " +
      "on tool radius and local curvature.",
    category: "cam_strategy",
    tags: ["parallel", "raster", "cut-angle", "bidirectional"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 91,
    source: "web:worknc-parallel",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-032",
    title: "Rest Finishing Targets Only Unmachined Areas",
    body:
      "WorkNC's rest finishing calculates areas left unmachined by " +
      "the previous finishing tool and generates passes only in those " +
      "regions with a smaller cutter. Reference the previous tool " +
      "diameter to compute rest zones. Use sequentially smaller " +
      "ball-nose cutters (R5 to R3 to R1) for progressive " +
      "refinement. The detection threshold should match the previous " +
      "tool's theoretical scallop height to avoid redundant cutting.",
    category: "cam_strategy",
    tags: ["rest-finishing", "progressive", "small-tools", "efficiency"],
    operation_types: ["finishing", "rest_machining"],
    confidence: 92,
    source: "web:worknc-restfinish",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-033",
    title: "Constant-Cusp Strategy Adapts to Surface Curvature",
    body:
      "WorkNC's constant-cusp finishing measures actual theoretical " +
      "cusp height at every point and adjusts local stepover " +
      "accordingly. Convex surfaces get wider stepover (larger " +
      "effective radius reduces cusp at same step); concave surfaces " +
      "get tighter stepover. This produces truly uniform surface " +
      "quality requiring consistent polishing effort across the " +
      "entire part surface.",
    category: "cam_strategy",
    tags: ["constant-cusp", "curvature-adaptive", "uniform", "polishing"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 91,
    source: "web:worknc-cusp",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-034",
    title: "Cleanup Finishing Blends Strategy Transitions",
    body:
      "After combining steep/shallow finishing, WorkNC's cleanup " +
      "finishing removes residual cusps at strategy transition " +
      "boundaries. The operation detects boundary regions where " +
      "two strategies meet and generates additional tight-stepover " +
      "passes (50% of normal) to blend the surfaces. Set detection " +
      "width to 2-3x the finishing stepover for complete coverage " +
      "of transition zones.",
    category: "cam_strategy",
    tags: ["cleanup", "transition", "blending", "boundary"],
    operation_types: ["finishing", "3d_finishing"],
    confidence: 89,
    source: "web:worknc-cleanup",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Mold & Die (wnc-035 to wnc-044) ===
  {
    id: "wnc-035",
    title: "Core/Cavity Strategy Uses Progressive Tool Sizes",
    body:
      "WorkNC's mold and die workflow uses progressive tool sizes: " +
      "large face mills for initial stock removal, medium endmills " +
      "for semi-finish, and small ball-nose cutters for final " +
      "finish. Each stage references the previous tool for automatic " +
      "rest material detection. A typical progression for a medium " +
      "mold: 50mm face mill rough, 20mm endmill re-rough, 10mm " +
      "ball-nose semi-finish, 6mm ball-nose finish, 3mm ball-nose " +
      "rest finish.",
    category: "cam_strategy",
    tags: ["core-cavity", "progressive", "mold", "tool-sequence"],
    operation_types: ["roughing", "finishing"],
    confidence: 93,
    source: "web:worknc-molddie",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-036",
    title: "Electrode Machining with Graphite-Specific Strategies",
    body:
      "WorkNC provides graphite-specific machining strategies for " +
      "EDM electrodes. Graphite machines differently from metal: no " +
      "coolant (dust extraction required), high spindle speeds " +
      "(15,000-30,000 RPM), moderate feeds, and sharp uncoated or " +
      "diamond-coated tools. Set the finishing tolerance tighter " +
      "(0.002-0.005 mm) as graphite machines very cleanly. Use " +
      "climb milling exclusively to prevent chipping at edges.",
    category: "cam_strategy",
    tags: ["electrode", "graphite", "edm", "dust-extraction"],
    operation_types: ["roughing", "finishing"],
    confidence: 91,
    source: "web:worknc-electrode",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-037",
    title: "Parting Line Finishing Ensures Mold Seal Quality",
    body:
      "WorkNC machines parting line surfaces with tight tolerances " +
      "to ensure proper mold sealing. Use Z-level finishing with " +
      "fine stepdown (0.02-0.05 mm) for parting surfaces. The " +
      "machining direction should follow the parting line contour " +
      "to produce consistent tool marks that align with the " +
      "mold-opening direction. This prevents flash at the parting " +
      "line and extends mold life.",
    category: "cam_strategy",
    tags: ["parting-line", "sealing", "mold", "precision"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:worknc-parting",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-038",
    title: "Draft Angle Machining for Textured Mold Surfaces",
    body:
      "WorkNC accounts for draft angle requirements when machining " +
      "mold surfaces destined for texturing. The minimum draft must " +
      "be 1 degree per 0.01 mm of texture depth (VDI 3400 standard). " +
      "Verify draft angles using the surface analysis tool before " +
      "machining. For textured surfaces, leave 0.02-0.05 mm extra " +
      "stock for the texturing process (etching removes material). " +
      "Program these surfaces with consistent tool-mark direction.",
    category: "cam_strategy",
    tags: ["draft-angle", "texture", "vdi", "mold"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:worknc-draft",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-039",
    title: "Shut-Off Surface Precision for Steel-to-Steel Contact",
    body:
      "WorkNC machines shut-off surfaces (where core meets cavity to " +
      "form through-holes) with precision finishing at 0.01-0.02 mm " +
      "tolerance. Use Z-level finishing with very fine stepdown and " +
      "climb milling for consistent quality. The shut-off angle " +
      "should be minimum 3-5 degrees to prevent galling. Program " +
      "matching passes on both core and cavity using the same tool " +
      "and strategy for consistent mating quality.",
    category: "cam_strategy",
    tags: ["shut-off", "precision", "core-cavity", "mating"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:worknc-shutoff",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-040",
    title: "Insert Machining with Multi-Component Coordination",
    body:
      "WorkNC machines mold inserts as individual components while " +
      "maintaining datum consistency across the assembly. Program " +
      "each insert with the same coordinate system origin to ensure " +
      "inter-component alignment. For cooling channel intersections, " +
      "machine both halves from the mating face to ensure channel " +
      "alignment. Verify insert pocket dimensions match the insert " +
      "external dimensions using the stock comparison tool.",
    category: "cam_strategy",
    tags: ["insert", "multi-component", "datum", "coordination"],
    operation_types: ["general"],
    confidence: 89,
    source: "web:worknc-insert",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-041",
    title: "Fine Detail Machining with Micro Ball-Nose Cutters",
    body:
      "WorkNC excels at fine detail machining in mold cavities using " +
      "micro ball-nose cutters (R0.25-R1.0 mm). Set the machining " +
      "tolerance to 0.001-0.003 mm for these small tools. Use " +
      "high spindle speeds (30,000-60,000 RPM) with light depths " +
      "(0.01-0.05 mm) and fine stepovers. Enable arc fitting to " +
      "reduce the NC file size, which can be very large with tight " +
      "tolerances. Use shrink-fit holders for minimum runout.",
    category: "cam_strategy",
    tags: ["fine-detail", "micro-tools", "mold", "high-speed"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:worknc-finedetail",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-042",
    title: "Micro Feature Machining for Ribs and Text",
    body:
      "WorkNC machines micro features (thin ribs < 0.5 mm, engraved " +
      "text, logos) using specialized strategies that account for " +
      "tool deflection and fragile geometry. Use pencil finishing " +
      "for rib roots and contour finishing for text outlines. Set " +
      "the feed rate to 30-50% of normal to prevent tool breakage " +
      "on micro cutters. For text depth greater than 0.3 mm, use " +
      "tapered endmills for added strength.",
    category: "cam_strategy",
    tags: ["micro-features", "ribs", "text", "engraving"],
    operation_types: ["finishing"],
    confidence: 88,
    source: "web:worknc-micro",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-043",
    title: "Texture Preparation with Consistent Surface Finish",
    body:
      "WorkNC prepares mold surfaces for texturing by producing a " +
      "uniform finish with consistent tool-mark direction. Program " +
      "all texture-destined surfaces with the same strategy (parallel " +
      "finishing), same stepover, and same cut direction. The surface " +
      "roughness should be Ra 0.4-0.8 before texturing. Leave extra " +
      "stock (0.02-0.05 mm per side) to account for material " +
      "removal during the etching process.",
    category: "cam_strategy",
    tags: ["texture-prep", "uniform-finish", "etching", "mold"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:worknc-texture",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-044",
    title: "Burnishing Pass for Mirror-Quality Mold Surfaces",
    body:
      "WorkNC can generate burnishing (spring pass) toolpaths that " +
      "run at zero stock allowance with very light engagement to " +
      "improve surface finish through material compression rather " +
      "than cutting. Use a ball-nose cutter at 50-70% of normal " +
      "cutting speed, zero depth of cut, and fine stepover (50% " +
      "of finishing stepover). This can improve surface finish from " +
      "Ra 0.4 to Ra 0.1 on pre-hardened mold steel without " +
      "manual polishing.",
    category: "cam_strategy",
    tags: ["burnishing", "spring-pass", "mirror-finish", "polishing"],
    operation_types: ["finishing"],
    confidence: 88,
    source: "web:worknc-burnish",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === HSM (wnc-045 to wnc-052) ===
  {
    id: "wnc-045",
    title: "Corner Rounding Maintains Feed Rate Through Direction Changes",
    body:
      "WorkNC's corner rounding replaces sharp direction changes with " +
      "small radius arcs, allowing the machine to maintain higher " +
      "feed rates through corners. Set the corner radius to " +
      "0.1-0.5 mm based on the allowable deviation from the " +
      "programmed path. This prevents the velocity droop that occurs " +
      "when the controller decelerates for sharp corners. On HSM " +
      "machines, corner rounding can maintain 80-95% of programmed " +
      "feed versus 30-50% without it.",
    category: "cam_strategy",
    tags: ["corner-rounding", "hsm", "feed-rate", "velocity"],
    operation_types: ["finishing", "hsm"],
    confidence: 92,
    source: "web:worknc-corner",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-046",
    title: "Arc Fitting Reduces File Size and Improves Motion",
    body:
      "WorkNC's arc fitting converts sequences of short linear " +
      "segments into circular arcs (G02/G03), reducing NC file size " +
      "by 50-80% and enabling smoother machine motion. Set the arc " +
      "fitting tolerance equal to or tighter than the machining " +
      "tolerance (typically 0.005 mm). This is critical for HSM " +
      "where large files with short segments cause controller " +
      "buffer starvation and feed rate fluctuation.",
    category: "cam_strategy",
    tags: ["arc-fitting", "file-size", "hsm", "smooth-motion"],
    operation_types: ["finishing", "hsm"],
    confidence: 91,
    source: "web:worknc-arcfit",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-047",
    title: "Smooth Transitions Between Passes Eliminate Marks",
    body:
      "WorkNC generates smooth arc transitions between adjacent " +
      "cutting passes to prevent witness marks from abrupt direction " +
      "changes. Enable 'Smooth linking' with tangential arc " +
      "lead-in/lead-out at 1-3x tool radius. The transition height " +
      "should remain below the finished surface to prevent marks " +
      "at transition points. For mirror-quality surfaces, ensure " +
      "the overlap between adjacent passes is 5-10% of stepover.",
    category: "cam_strategy",
    tags: ["smooth-transitions", "linking", "witness-marks", "arcs"],
    operation_types: ["finishing", "hsm"],
    confidence: 90,
    source: "web:worknc-smooth-trans",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-048",
    title: "Constant Chip Load Compensates for Engagement Variation",
    body:
      "WorkNC's constant chip load feature adjusts the feed rate in " +
      "real-time based on the instantaneous radial engagement. When " +
      "engagement decreases (light cuts, air cuts), feed increases " +
      "to maintain chip thickness. When engagement increases " +
      "(corners, full slots), feed decreases to protect the tool. " +
      "Set the target chip thickness and engagement limits, and the " +
      "system calculates the required feed at every point.",
    category: "cam_strategy",
    tags: ["constant-chip-load", "feed-adjustment", "engagement", "hsm"],
    operation_types: ["roughing", "hsm"],
    confidence: 91,
    source: "web:worknc-chipload",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-049",
    title: "Feed Optimization Analyzes Stock for Speed Adjustment",
    body:
      "WorkNC's feed optimization module analyzes the instantaneous " +
      "stock engagement along the entire toolpath and generates a " +
      "feed-rate profile. Air cuts are accelerated to rapid, light " +
      "engagement zones run at maximum feed, and heavy engagement " +
      "zones are slowed to protect the tool. This can reduce cycle " +
      "time by 15-30% without increasing tool load. Set maximum " +
      "and minimum feed limits based on the tool manufacturer's " +
      "recommendations.",
    category: "cam_strategy",
    tags: ["feed-optimization", "stock-analysis", "cycle-time", "speed"],
    operation_types: ["roughing", "finishing"],
    confidence: 92,
    source: "web:worknc-feedopt",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-050",
    title: "Trochoidal Milling for Slotting Operations",
    body:
      "WorkNC's trochoidal milling generates circular arcing motions " +
      "for slot cutting that limit radial engagement to 8-12% of " +
      "tool diameter. This allows full-depth cutting (up to 2x " +
      "cutter diameter) at high feed rates without the heat and " +
      "wear of conventional full-width slotting. Set the trochoidal " +
      "width based on slot width and tool diameter. Particularly " +
      "effective in stainless steel and hardened steel.",
    category: "cam_strategy",
    tags: ["trochoidal", "slotting", "hsm", "constant-engagement"],
    operation_types: ["roughing", "slotting"],
    confidence: 91,
    source: "web:worknc-trochoidal",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-051",
    title: "Machine Acceleration Limits Prevent Velocity Droop",
    body:
      "WorkNC allows defining machine acceleration and jerk limits " +
      "that the toolpath generator respects during path planning. " +
      "Set values from the machine's specification sheet. The " +
      "toolpath ensures no segment requires acceleration beyond " +
      "the machine's capability, preventing velocity droop in " +
      "corners. This is critical for HSM where maintaining " +
      "programmed feed through corners directly affects surface " +
      "quality and dimensional accuracy.",
    category: "cam_strategy",
    tags: ["acceleration", "jerk", "velocity-droop", "hsm"],
    operation_types: ["finishing", "hsm"],
    confidence: 90,
    source: "web:worknc-accel",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-052",
    title: "Jerk Limitation Produces Glass-Smooth Surfaces",
    body:
      "WorkNC's jerk limitation controls the rate of acceleration " +
      "change, producing smooth velocity profiles that eliminate " +
      "vibration-induced surface marks. Set the jerk limit based " +
      "on the machine's specification (typically 5-50 m/s3 for " +
      "mold-finishing machines). Lower jerk values produce smoother " +
      "surfaces but increase cycle time. For optical-quality " +
      "surfaces, use jerk values 50-70% of the machine maximum.",
    category: "cam_strategy",
    tags: ["jerk", "smooth-surface", "vibration", "optical-quality"],
    operation_types: ["finishing", "hsm"],
    confidence: 89,
    source: "web:worknc-jerk",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Simulation (wnc-053 to wnc-058) ===
  {
    id: "wnc-053",
    title: "Full Machine Simulation Validates Complete Programs",
    body:
      "WorkNC's machine simulation uses the full kinematic model of " +
      "the CNC machine including all axes, spindle, tool changer, " +
      "and fixtures. The simulation runs the posted G-code to catch " +
      "post-processor errors. Verify that machine models include " +
      "accurate axis travels, rotary limits, and home positions. " +
      "Always run full simulation before first-article production, " +
      "especially on 5-axis and mill-turn programs.",
    category: "cam_strategy",
    tags: ["simulation", "machine", "g-code", "verification"],
    operation_types: ["general"],
    confidence: 93,
    source: "web:worknc-simulation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-054",
    title: "Collision Detection Covers Full Tool Assembly",
    body:
      "WorkNC's collision detection checks the complete tool assembly " +
      "including cutter, holder, collet, spindle nose, and extensions " +
      "against workpiece, fixtures, and machine structure. Define " +
      "tool assemblies with accurate 3D models. The system reports " +
      "interference (overlap), near-miss (within threshold), and " +
      "axis limit violations. Set near-miss threshold to 2 mm for " +
      "initial checks and 0.5 mm for final verification.",
    category: "cam_strategy",
    tags: ["collision", "tool-assembly", "detection", "clearance"],
    operation_types: ["general"],
    confidence: 92,
    source: "web:worknc-collision",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-055",
    title: "Material Removal Visualization Shows Stock Progress",
    body:
      "WorkNC's material removal simulation displays progressive " +
      "stock removal color-coded by remaining thickness. Red " +
      "indicates unmachined areas; green shows target thickness. " +
      "The stock comparison overlay highlights under-cuts (gouges) " +
      "in red and excess material in blue. Target zero red areas " +
      "and minimal blue areas in the final result. Use this to " +
      "verify uniform finishing allowance before the finish pass.",
    category: "cam_strategy",
    tags: ["material-removal", "visualization", "stock", "gouge-check"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-removal",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-056",
    title: "Gouge Check Prevents Surface Damage Before Cutting",
    body:
      "WorkNC's gouge check analyzes toolpaths for any condition " +
      "where the tool would cut below the intended surface. Gouges " +
      "can occur from: incorrect tool compensation, tolerance " +
      "approximation, holder interference, and tool deflection. " +
      "The gouge check reports the location, depth, and cause of " +
      "each potential gouge. Fix gouge conditions before posting " +
      "by adjusting stock allowance or tool selection.",
    category: "cam_strategy",
    tags: ["gouge-check", "surface-protection", "validation", "safety"],
    operation_types: ["general"],
    confidence: 92,
    source: "web:worknc-gouge",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-057",
    title: "Stock Model Carries Through Operation Sequence",
    body:
      "WorkNC maintains a dynamic stock model that updates after " +
      "each operation, carrying the as-machined state forward. " +
      "This ensures each subsequent operation sees the actual " +
      "remaining material rather than the original billet. The " +
      "stock model is particularly important for rest machining " +
      "operations that need accurate remaining material information " +
      "to generate efficient toolpaths.",
    category: "cam_strategy",
    tags: ["stock-model", "dynamic", "operation-sequence", "accuracy"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-stockmodel",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-058",
    title: "NC Verification Validates Posted G-Code Accuracy",
    body:
      "WorkNC's NC verification reads the posted G-code and simulates " +
      "it against the machine model, catching post-processor errors " +
      "that toolpath-level simulation would miss. This includes " +
      "canned cycle expansion, coordinate rotation commands, tool " +
      "length compensation modes, and fixture offset calls. Compare " +
      "NC verification results against toolpath simulation to " +
      "confirm accurate post-processor translation.",
    category: "cam_strategy",
    tags: ["nc-verification", "g-code", "post-processor", "accuracy"],
    operation_types: ["general"],
    confidence: 92,
    source: "web:worknc-ncverify",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Post Processor (wnc-059 to wnc-064) ===
  {
    id: "wnc-059",
    title: "Post Customization Matches Controller Syntax",
    body:
      "WorkNC's post-processor framework generates machine-specific " +
      "NC code. Customize for your controller: code format " +
      "(ISO/Heidenhain/Mazak), block numbering, decimal precision " +
      "(3-4 for mm, 4-5 for inches), modal vs non-modal codes, and " +
      "line termination. Test every customization with a simple " +
      "program before production use. WorkNC ships with 1000+ " +
      "pre-configured posts for common machine/controller " +
      "combinations.",
    category: "cam_strategy",
    tags: ["post-processor", "customization", "controller", "syntax"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-post",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-060",
    title: "Multi-Axis Post Handles TCP/RTCP Transformations",
    body:
      "WorkNC's 5-axis post-processors handle TCP (Tool Center " +
      "Point) and RTCP transformations for all major controller " +
      "brands. Configure the correct inverse kinematics for your " +
      "machine type (trunnion, swivel-head, mixed). Verify rotary " +
      "axis direction conventions and pivot point distances. The " +
      "post must output the correct G-code for TCP activation " +
      "(G43.4 for Fanuc, TCPM for Heidenhain, etc.).",
    category: "cam_strategy",
    tags: ["multi-axis", "tcp", "rtcp", "inverse-kinematics"],
    operation_types: ["5_axis"],
    confidence: 92,
    source: "web:worknc-multiaxis-post",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-061",
    title: "Canned Cycle Output for Standard Hole Operations",
    body:
      "WorkNC posts drilling operations as appropriate canned cycles: " +
      "G81 (spot), G83 (peck), G73 (chip-break), G84 (tap), G85/G86 " +
      "(bore). The post handles cycle-specific parameters including " +
      "peck depth, retract amount, dwell time, and spindle orient. " +
      "Verify that cycle cancellation (G80) is properly placed at " +
      "operation boundaries. For deep-hole drilling, ensure peck " +
      "depth formatting matches controller requirements.",
    category: "cam_strategy",
    tags: ["canned-cycles", "drilling", "post-processor", "hole-making"],
    operation_types: ["drilling"],
    confidence: 90,
    source: "web:worknc-canned",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-062",
    title: "Machine-Specific Posts for Major Controller Brands",
    body:
      "WorkNC provides machine-specific posts for Fanuc, Siemens, " +
      "Heidenhain, Mazak, Okuma, Haas, DMG Mori, and Makino " +
      "controllers. Each handles brand-specific features: Mazak " +
      "Smooth AI, Heidenhain Cycle 32 tolerance, Fanuc AICC/Nano " +
      "smoothing, Okuma OSP. Never reuse a post between different " +
      "controller families. Always start from the correct base " +
      "post and customize for shop-specific requirements.",
    category: "cam_strategy",
    tags: ["machine-specific", "controller-brands", "post-processor"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-machinepost",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-063",
    title: "Sub-Program Output Reduces File Size for Patterns",
    body:
      "WorkNC's post can output repeated patterns as sub-programs " +
      "(M98/M99 Fanuc, L-call Heidenhain) to reduce NC file size. " +
      "Enable sub-program extraction for bolt-circle patterns, " +
      "repeated pockets, and mirror operations. Set minimum " +
      "repetition count to 3 before creating a sub-program. This " +
      "is important for controllers with limited program memory " +
      "and for programs with large pattern counts.",
    category: "cam_strategy",
    tags: ["sub-program", "patterns", "file-size", "memory"],
    operation_types: ["general"],
    confidence: 89,
    source: "web:worknc-subprogram",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-064",
    title: "Custom Macro Support for Probing and Special Cycles",
    body:
      "WorkNC's post can embed custom macro calls for probing " +
      "routines and special cycles. Define macro templates that " +
      "map WorkNC operations to controller-specific calls " +
      "(Renishaw G65 P9xxx on Fanuc, TOUCH PROBE on Heidenhain). " +
      "Include variable passing for probe positions, expected " +
      "values, and tolerance bands. Test macro calls in MDI mode " +
      "before automatic execution.",
    category: "cam_strategy",
    tags: ["macro", "probing", "custom-cycles", "post-processor"],
    operation_types: ["probing"],
    confidence: 89,
    source: "web:worknc-macro",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Dental/Medical (wnc-065 to wnc-070) ===
  {
    id: "wnc-065",
    title: "Crown Machining with 5-Axis Undercut Access",
    body:
      "WorkNC Dental machines crowns using 5-axis strategies that " +
      "access undercut regions without collision. The software " +
      "automatically calculates tool orientations to reach all " +
      "surfaces of the crown geometry including the intaglio " +
      "(internal) surface. Use 1-2 mm ball-nose cutters at " +
      "40,000-60,000 RPM for zirconia. Typical crown machining " +
      "time: 8-15 minutes with 0.01 mm tolerance.",
    category: "cam_strategy",
    tags: ["dental", "crown", "5-axis", "undercut"],
    operation_types: ["5_axis", "finishing"],
    confidence: 91,
    source: "web:worknc-dental",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-066",
    title: "Bridge Machining with Multi-Unit Connector Management",
    body:
      "WorkNC Dental machines multi-unit bridges with automatic " +
      "connector placement and management. The software calculates " +
      "optimal connector positions and sizes to hold the bridge " +
      "during machining while minimizing cleanup after separation. " +
      "Use 0.5-1.0 mm connectors placed at non-critical surfaces. " +
      "The machining sequence rough-finishes each unit then " +
      "processes connectors last for maximum rigidity.",
    category: "cam_strategy",
    tags: ["dental", "bridge", "connectors", "multi-unit"],
    operation_types: ["5_axis", "finishing"],
    confidence: 89,
    source: "web:worknc-bridge",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-067",
    title: "Implant Bar Machining with Precision Abutment Interfaces",
    body:
      "WorkNC Dental machines implant bars with high-precision " +
      "abutment interfaces requiring 0.005-0.01 mm accuracy. The " +
      "software generates separate finishing passes for the " +
      "abutment connection surfaces with tighter tolerances than " +
      "the rest of the bar. Use titanium-specific cutting data " +
      "(40-80 m/min, 0.02-0.05 mm/tooth) and flood coolant. " +
      "Verify abutment fit with in-process probing.",
    category: "cam_strategy",
    tags: ["dental", "implant-bar", "abutment", "precision"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:worknc-implant",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-068",
    title: "Bone Plate Machining with Biocompatible Material Strategies",
    body:
      "WorkNC machines bone plates from titanium and CoCr using " +
      "medical-grade cutting strategies. Use sharp, coated carbide " +
      "tools with through-tool coolant. Cutting speeds for Ti-6Al-4V " +
      "bone plates: 40-60 m/min roughing, 60-80 m/min finishing. " +
      "Maintain climb milling throughout to prevent work hardening. " +
      "The thin-wall features of bone plates require vibration " +
      "monitoring and reduced feed rates in flexible regions.",
    category: "cam_strategy",
    tags: ["medical", "bone-plate", "titanium", "biocompatible"],
    operation_types: ["roughing", "finishing"],
    confidence: 88,
    source: "web:worknc-boneplate",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-069",
    title: "Custom Abutment Machining with Margin Line Precision",
    body:
      "WorkNC Dental machines custom abutments with precision margin " +
      "lines requiring 0.01 mm accuracy. The margin line defines " +
      "the critical interface between the abutment and the crown. " +
      "Use a dedicated finishing pass along the margin with reduced " +
      "feed rate (50% of normal) and fine stepover. The 5-axis " +
      "orientation ensures the tool contacts the margin at the " +
      "optimal angle for surface quality.",
    category: "cam_strategy",
    tags: ["dental", "abutment", "margin-line", "precision"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:worknc-abutment",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-070",
    title: "Multi-Material Dental Machining for Zirconia and CoCr",
    body:
      "WorkNC Dental supports material-specific strategies for " +
      "zirconia (pre-sintered and fully sintered), CoCr, titanium, " +
      "PMMA, PEEK, and glass ceramics. Pre-sintered zirconia " +
      "machines at 30,000+ RPM dry with diamond-coated tools; " +
      "fully sintered requires 60,000+ RPM with diamond tools and " +
      "water coolant. CoCr uses carbide tools at 80-120 m/min " +
      "with flood coolant. Each material has pre-configured " +
      "cutting data templates.",
    category: "cam_strategy",
    tags: ["dental", "multi-material", "zirconia", "cocr"],
    operation_types: ["roughing", "finishing"],
    confidence: 90,
    source: "web:worknc-multimaterial",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Robot Machining (wnc-071 to wnc-075) ===
  {
    id: "wnc-071",
    title: "Robot Path Planning Uses Full WorkNC Toolpath Strategies",
    body:
      "WorkNC Robot leverages the full range of WorkNC toolpath " +
      "strategies (3, 3+2, and 5-axis) for robot machining. The " +
      "system converts CNC-style toolpaths into robot joint " +
      "coordinates with automatic collision avoidance. Supports " +
      "4-axis to 7-axis robots plus supplementary axes (rotary " +
      "tables, linear rails, gantries). The robot library includes " +
      "250+ models from 22+ suppliers.",
    category: "cam_strategy",
    tags: ["robot", "path-planning", "toolpath", "conversion"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-robot",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-072",
    title: "Joint Limit Detection Prevents Robot Lock-Up",
    body:
      "WorkNC Robot monitors all joint angles during toolpath " +
      "calculation and flags positions that approach or exceed " +
      "joint limits. The system can automatically modify the " +
      "robot configuration (elbow up/down, wrist flip) to avoid " +
      "joint limits while maintaining the tool contact point. " +
      "Set a joint limit warning zone of 5-10 degrees from the " +
      "physical limits to provide a safety margin.",
    category: "cam_strategy",
    tags: ["robot", "joint-limits", "configuration", "safety"],
    operation_types: ["general"],
    confidence: 89,
    source: "web:worknc-joints",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-073",
    title: "Singularity Avoidance with Automatic Path Adjustment",
    body:
      "WorkNC Robot automatically identifies singularity positions " +
      "(where robot joints align causing loss of control degrees " +
      "of freedom) and adjusts the toolpath to avoid them. The " +
      "system modifies the robot's configuration or slightly " +
      "adjusts the tool orientation to navigate around singularity " +
      "zones. Alerts are generated when singularity avoidance " +
      "requires deviations exceeding the user-defined threshold.",
    category: "cam_strategy",
    tags: ["robot", "singularity", "avoidance", "path-adjustment"],
    operation_types: ["general"],
    confidence: 90,
    source: "web:worknc-singularity",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-074",
    title: "Cell Simulation Models Complete Robot Environment",
    body:
      "WorkNC Robot simulates the complete robot cell including the " +
      "robot, tool changer, worktable, support structures, " +
      "supplementary axes, and safety barriers. The simulation " +
      "verifies collision-free operation across the entire work " +
      "envelope. Import cell components as STEP or native CAD " +
      "models. Fine-tune motion paths, optimize configurations, " +
      "and adjust positions for smoother trajectories within " +
      "the simulation environment.",
    category: "cam_strategy",
    tags: ["robot", "cell-simulation", "collision", "work-envelope"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-cell",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-075",
    title: "Offline Programming Eliminates Manual Robot Teaching",
    body:
      "WorkNC Robot enables complete offline programming, " +
      "eliminating the need for manual robot teaching. The system " +
      "generates robot-specific code (RAPID for ABB, KRL for KUKA, " +
      "INFORM for Yaskawa) directly from the WorkNC toolpath. " +
      "Post-processors handle the conversion from Cartesian " +
      "coordinates to robot joint values. This reduces programming " +
      "time by 80-90% and eliminates production downtime during " +
      "teaching.",
    category: "cam_strategy",
    tags: ["robot", "offline-programming", "rapid", "krl"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-offline",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Tool Management (wnc-076 to wnc-080) ===
  {
    id: "wnc-076",
    title: "Tool Library with 3D Assembly Models",
    body:
      "WorkNC's tool library stores complete 3D tool assemblies " +
      "including cutter, holder, collet, and extensions. Accurate " +
      "holder models are essential for collision detection. A 1 mm " +
      "error in holder diameter can mean the difference between " +
      "safe and crashed programs. Import holder models from " +
      "manufacturer catalogs (Sandvik, Kennametal, BIG DAISHOWA) " +
      "in STEP format for exact geometry.",
    category: "cam_strategy",
    tags: ["tool-library", "3d-models", "holders", "collision"],
    operation_types: ["general"],
    confidence: 92,
    source: "web:worknc-tools",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-077",
    title: "Cutting Data Database Stores Material-Specific Parameters",
    body:
      "WorkNC's cutting data database stores speeds, feeds, depths, " +
      "and stepovers per material type for each tool. When assigning " +
      "a tool and specifying the workpiece material, the system auto-" +
      "populates recommended parameters. Maintain these from " +
      "manufacturer data and shop-floor experience. Create material " +
      "groups (mild steel, stainless, aluminum, titanium, Inconel) " +
      "with sub-grades for precise parameter selection.",
    category: "cam_strategy",
    tags: ["cutting-data", "material-database", "speeds-feeds", "auto"],
    operation_types: ["general"],
    confidence: 90,
    source: "web:worknc-cutdata",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-078",
    title: "Automatic Tool Selection Based on Feature Requirements",
    body:
      "WorkNC can automatically select tools from the library based " +
      "on operation requirements: tool type, minimum diameter (to " +
      "fit features), minimum length (to reach depth), and material " +
      "compatibility. The algorithm considers reach, holder " +
      "clearance, and magazine availability. Review auto-selected " +
      "tools as the algorithm optimizes for reach, not necessarily " +
      "for best cutting performance.",
    category: "cam_strategy",
    tags: ["auto-selection", "tool-library", "optimization", "features"],
    operation_types: ["general"],
    confidence: 88,
    source: "web:worknc-autoselect",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-079",
    title: "Tool Tracking Monitors Usage Across Programs",
    body:
      "WorkNC tracks tool usage across all programs: total cutting " +
      "time, programs using each tool, and estimated remaining life. " +
      "Use the tracking dashboard to identify overloaded tools and " +
      "plan replacements. Set alerts when cumulative cutting time " +
      "approaches manufacturer's recommended life limit. This " +
      "prevents unexpected tool failures during production runs.",
    category: "cam_strategy",
    tags: ["tool-tracking", "tool-life", "monitoring", "planning"],
    operation_types: ["general"],
    confidence: 88,
    source: "web:worknc-tracking",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-080",
    title: "Advanced Toolform Technology for Non-Standard Cutters",
    body:
      "WorkNC supports advanced toolform technology that enables " +
      "accurate toolpath calculation for non-standard cutter " +
      "geometries: lens cutters, barrel cutters, circle-segment " +
      "tools, and custom profiles. Import the exact tool profile " +
      "as a 2D contour and WorkNC calculates the precise contact " +
      "point at every position. Barrel cutters can achieve the " +
      "same scallop height with 5-8x larger stepover compared " +
      "to equivalent ball-nose cutters.",
    category: "cam_strategy",
    tags: ["toolform", "barrel-cutter", "lens-cutter", "circle-segment"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:worknc-toolform",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Drilling (wnc-081 to wnc-086) ===
  {
    id: "wnc-081",
    title: "Spot Drilling with Automatic Chamfer Depth",
    body:
      "WorkNC calculates spot drill depth to produce the correct " +
      "chamfer diameter at hole entry. For a 90-degree spot drill " +
      "creating a 0.5 mm chamfer on a 10 mm hole, depth is " +
      "automatically set to the chamfer width below surface. Use " +
      "90-degree spot drills for 118-degree HSS drill bits and " +
      "142-degree spot drills for 140-degree carbide drills to " +
      "ensure proper centering.",
    category: "cam_strategy",
    tags: ["spot-drill", "chamfer", "depth", "centering"],
    operation_types: ["drilling"],
    confidence: 90,
    source: "web:worknc-spot",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-082",
    title: "Peck Drilling with Optimized Retract Strategy",
    body:
      "WorkNC's peck drilling uses configurable peck depth, retract " +
      "amount, and dwell. For deep holes (L/D > 3), set initial " +
      "peck to 1x diameter, reducing by 20-30% per subsequent peck. " +
      "Use full retract (to R-plane) for horizontal drilling or " +
      "partial retract (1-3 mm) for vertical drilling where gravity " +
      "assists chip evacuation. Enable through-tool coolant for " +
      "L/D ratios exceeding 5:1.",
    category: "cam_strategy",
    tags: ["peck-drilling", "deep-hole", "retract", "chip-evacuation"],
    operation_types: ["drilling"],
    confidence: 91,
    source: "web:worknc-peck",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-083",
    title: "Rigid Tapping with Synchronous Spindle Control",
    body:
      "WorkNC supports rigid tapping where feed is locked to " +
      "spindle speed times pitch. Set retract speed to 1.5-2x " +
      "cutting speed for faster cycles on through-holes. For blind " +
      "holes, set depth to ensure 2-3 full threads beyond minimum " +
      "engagement. WorkNC calculates deceleration distance based " +
      "on spindle inertia. Use rigid tapping on modern CNC machines " +
      "for best thread quality and repeatability.",
    category: "cam_strategy",
    tags: ["tapping", "rigid", "synchronous", "thread"],
    operation_types: ["drilling", "threading"],
    confidence: 90,
    source: "web:worknc-tapping",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-084",
    title: "Boring Cycles for Precision Hole Finishing",
    body:
      "WorkNC supports boring cycle variants: G85 (feed-in/feed-out), " +
      "G86 (feed-in/rapid-out with spindle stop), and G76 (fine " +
      "boring with orient-and-shift retract). For precision bores " +
      "(H7 tolerance), use G76 with 0.05-0.1 mm shift to prevent " +
      "drag marks. Set boring bar to single-point contact and " +
      "ensure orient angle positions insert away from finished " +
      "surface during retract.",
    category: "cam_strategy",
    tags: ["boring", "precision", "g76", "fine-bore"],
    operation_types: ["drilling", "boring"],
    confidence: 89,
    source: "web:worknc-boring",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-085",
    title: "Reaming with Controlled Feed and Speed",
    body:
      "WorkNC's reaming operation uses precise feed and speed " +
      "control. Set cutting speed to 50-70% of drilling speed " +
      "and feed rate to 2-3x drilling feed for best finish. " +
      "Reaming allowance: 0.1-0.2 mm per side for hand reamers, " +
      "0.15-0.3 mm for machine reamers. Enable flood coolant and " +
      "set retract feed equal to cutting feed to prevent marking. " +
      "Use expansion reamers for tight tolerances.",
    category: "cam_strategy",
    tags: ["reaming", "precision", "tolerance", "surface-finish"],
    operation_types: ["drilling"],
    confidence: 89,
    source: "web:worknc-reaming",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-086",
    title: "Deep Hole Drilling with Gun Drill Strategies",
    body:
      "WorkNC supports gun drilling strategies for holes with L/D " +
      "ratios exceeding 10:1. Program pilot holes first (2-3x " +
      "diameter depth with twist drill), then switch to gun drill " +
      "with through-tool coolant at 50-70 bar. Set the feed rate " +
      "to 0.005-0.02 mm/rev and use constant RPM mode. Monitor " +
      "coolant pressure and chip formation during the first article " +
      "to verify proper chip evacuation.",
    category: "cam_strategy",
    tags: ["deep-hole", "gun-drill", "coolant-pressure", "pilot"],
    operation_types: ["drilling"],
    confidence: 88,
    source: "web:worknc-deephole",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Surface Quality (wnc-087 to wnc-092) ===
  {
    id: "wnc-087",
    title: "Machining Tolerance Controls Surface Accuracy",
    body:
      "WorkNC's machining tolerance parameter controls how closely " +
      "the toolpath follows the theoretical surface. Tight tolerance " +
      "(0.001-0.005 mm) generates more points and larger files but " +
      "more accurate surfaces. Loose tolerance (0.01-0.05 mm) " +
      "generates smoother paths with fewer points. For most " +
      "finishing: 0.005-0.01 mm balances accuracy and file size. " +
      "Coordinate with controller smoothing settings.",
    category: "cam_strategy",
    tags: ["tolerance", "accuracy", "point-density", "smoothing"],
    operation_types: ["finishing"],
    confidence: 92,
    source: "web:worknc-tolerance",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-088",
    title: "Scallop Control Sets Maximum Cusp Height",
    body:
      "WorkNC's scallop control specifies maximum allowable cusp " +
      "height and automatically calculates required stepover. For " +
      "mold-quality surfaces (Ra 0.4-0.8): target 0.002-0.005 mm. " +
      "For general surfaces (Ra 1.6-3.2): 0.01-0.02 mm. Actual " +
      "roughness is typically 2-3x theoretical scallop due to tool " +
      "deflection, vibration, and material spring-back. Account " +
      "for this multiplier when setting scallop targets.",
    category: "cam_strategy",
    tags: ["scallop", "cusp-height", "roughness", "quality"],
    operation_types: ["finishing"],
    confidence: 93,
    source: "web:worknc-scallop-ctrl",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-089",
    title: "Cusp Analysis Visualizes Surface Quality Pre-Cut",
    body:
      "WorkNC's cusp analysis displays a color-coded map of " +
      "theoretical cusp height across the surface before cutting. " +
      "Areas exceeding the target are highlighted in red. Use " +
      "this to identify regions needing smaller tools or tighter " +
      "stepover. The analysis accounts for tool geometry, surface " +
      "curvature, and local stepover. Adjust strategy based on " +
      "the analysis before committing to a cut.",
    category: "cam_strategy",
    tags: ["cusp-analysis", "visualization", "pre-cut", "prediction"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:worknc-cusp-analysis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-090",
    title: "Smooth Flow with NURBS Output for HSM",
    body:
      "WorkNC's smooth flow option generates toolpaths with gradual " +
      "direction changes using B-spline interpolation. For HSM, " +
      "enable NURBS output if the controller supports it (Siemens " +
      "840D, Fanuc 30i). This produces smaller NC files with " +
      "smoother motion compared to linear-segment output. Set " +
      "minimum arc radius to match controller look-ahead " +
      "capability (typically 0.1-0.5 mm).",
    category: "cam_strategy",
    tags: ["smooth-flow", "nurbs", "hsm", "b-spline"],
    operation_types: ["finishing", "hsm"],
    confidence: 90,
    source: "web:worknc-nurbs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-091",
    title: "Arc Output Improves Machine Motion Quality",
    body:
      "WorkNC's arc output converts linear segment sequences into " +
      "circular arcs (G02/G03), reducing file size by 50-80% and " +
      "enabling smoother machine motion. Set arc tolerance equal " +
      "to or tighter than machining tolerance. Heidenhain and " +
      "Siemens controllers handle arcs excellently; some older " +
      "Fanuc controls may prefer linear output. Test on your " +
      "specific machine to determine optimal output mode.",
    category: "cam_strategy",
    tags: ["arc-output", "file-size", "motion-quality", "interpolation"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:worknc-arc",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-092",
    title: "Point Distribution Prevents Controller Starvation",
    body:
      "WorkNC's point distribution controls density and spacing " +
      "of toolpath points. Use 'Chord error' mode for curvature-" +
      "adaptive distribution. Set maximum segment length to " +
      "0.5-2 mm for finishing to keep the controller's look-ahead " +
      "buffer full. Avoid extremely short segments (<0.01 mm) " +
      "that cause controller starvation on HSM machines. The " +
      "optimal segment length depends on feed rate and controller " +
      "block processing speed.",
    category: "cam_strategy",
    tags: ["point-distribution", "controller", "look-ahead", "starvation"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:worknc-points",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Material-Specific (wnc-093 to wnc-098) ===
  {
    id: "wnc-093",
    title: "Aluminum Machining with High RPM and Light Engagement",
    body:
      "For aluminum (6061, 7075, 2024) in WorkNC, use high spindle " +
      "speeds (10,000-30,000 RPM), high feeds (5-15 m/min), and " +
      "large axial depths (1-2x cutter diameter). Set stepover to " +
      "40-50% for roughing. Use 2-3 flute endmills with polished " +
      "flutes and 45-degree helix for chip evacuation. Enable " +
      "helical entry for pockets. Reduce finishing tolerance to " +
      "0.002-0.005 mm as aluminum machines cleanly.",
    category: "material",
    tags: ["aluminum", "high-speed", "rpm", "chip-evacuation"],
    operation_types: ["roughing", "finishing"],
    confidence: 93,
    source: "web:worknc-aluminum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-094",
    title: "Titanium Strategy Uses Low Speed and Managed Heat",
    body:
      "For titanium (Ti-6Al-4V) in WorkNC, use low cutting speeds " +
      "(30-60 m/min carbide), moderate feeds (0.1-0.15 mm/tooth), " +
      "and moderate depths (0.5-1x diameter). Enable waveform " +
      "roughing at 8-12% radial engagement to manage heat. Use " +
      "4-5 flute variable-helix endmills with AlTiN coating. " +
      "Program climb milling exclusively—conventional milling " +
      "causes work hardening and rapid tool wear in titanium.",
    category: "material",
    tags: ["titanium", "low-speed", "heat-management", "climb-milling"],
    operation_types: ["roughing", "finishing"],
    confidence: 92,
    source: "web:worknc-titanium",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-095",
    title: "Stainless Steel Requires Continuous Chip Formation",
    body:
      "For austenitic stainless (304, 316) in WorkNC, prevent work " +
      "hardening by maintaining positive chip load at all times. " +
      "Never allow the tool to rub (keep feed above 0.05 mm/tooth). " +
      "Use waveform roughing at 10-15% engagement with 1.5-2x " +
      "diameter axial depth. Speed: 80-120 m/min for carbide. " +
      "Always use flood coolant. Enable constant chip load " +
      "compensation in corners to prevent rubbing.",
    category: "material",
    tags: ["stainless-steel", "work-hardening", "chip-load", "coolant"],
    operation_types: ["roughing", "finishing"],
    confidence: 91,
    source: "web:worknc-stainless",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-096",
    title: "Hardened Steel Machining Strategies by Hardness Range",
    body:
      "In WorkNC, hardened steel strategy depends on hardness. " +
      "Below Rc 45: carbide at 100-150 m/min with adaptive roughing " +
      "at moderate depths. Above Rc 55: CBN or ceramic-coated " +
      "carbide at 150-300 m/min, very light depths (0.05-0.2 mm " +
      "radial, 0.1-0.5 mm axial), and HSM strategies. For H13 " +
      "mold steel at Rc 48-52, use AlCrN-coated carbide with " +
      "constant engagement paths.",
    category: "material",
    tags: ["hardened-steel", "hardness", "cbn", "hsm"],
    operation_types: ["roughing", "finishing"],
    confidence: 92,
    source: "web:worknc-hardened",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-097",
    title: "Inconel Requires Dual Ceramic/Carbide Approach",
    body:
      "For Inconel (718, 625) in WorkNC, use two strategies: " +
      "ceramic roughing at 200-400 m/min with round inserts and " +
      "0.5-1 mm depth (no coolant, use air blast), or carbide " +
      "roughing at 15-30 m/min with 6-8% engagement waveform " +
      "paths (flood coolant at max pressure). Never stop the tool " +
      "in-cut with either approach. Ceramic cutting intentionally " +
      "generates heat to soften the workpiece ahead of the cut.",
    category: "material",
    tags: ["inconel", "nickel-alloy", "ceramic", "carbide"],
    operation_types: ["roughing", "finishing"],
    confidence: 91,
    source: "web:worknc-inconel",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-098",
    title: "Composite Machining with PCD Tools",
    body:
      "For CFRP/GFRP composites in WorkNC, use PCD or diamond-" +
      "coated tools at 200-500 m/min and 0.05-0.1 mm/tooth. " +
      "Program climb milling to push fibers against the supporting " +
      "laminate. Tighten machining tolerance (0.002-0.005 mm) to " +
      "prevent fiber pullout. Use dust extraction instead of flood " +
      "coolant. Enable composite-specific M-codes for vacuum " +
      "systems. Avoid interrupted cuts that cause delamination.",
    category: "material",
    tags: ["composite", "cfrp", "pcd", "diamond", "delamination"],
    operation_types: ["roughing", "finishing"],
    confidence: 90,
    source: "web:worknc-composite",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Optimization (wnc-099 to wnc-104) ===
  {
    id: "wnc-099",
    title: "Feed Optimization Adapts Speed to Stock Conditions",
    body:
      "WorkNC's feed optimization analyzes instantaneous stock " +
      "engagement at every toolpath point and adjusts feed rate. " +
      "Full-engagement zones are slowed; light-engagement zones " +
      "accelerated to maximum. Air cuts run at rapid. Set target " +
      "chip load and min/max feed limits. This reduces cycle time " +
      "by 15-30% without increasing tool load. Works with all " +
      "roughing and finishing strategies.",
    category: "cam_strategy",
    tags: ["feed-optimization", "engagement", "cycle-time", "adaptive"],
    operation_types: ["roughing", "finishing"],
    confidence: 92,
    source: "web:worknc-feedopt",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-100",
    title: "Linking Optimization Minimizes Non-Cutting Time",
    body:
      "WorkNC's linking optimization minimizes non-cutting moves " +
      "between passes. Configure: 'Minimum retract' (fastest, " +
      "needs collision checking), 'Safe plane' (safest but " +
      "slowest), or 'Smart retract' (minimum safe height per " +
      "location). Use arc transitions for smooth motion. Set " +
      "transfer moves to tangential connections between passes " +
      "rather than linear rapids. Smart retract typically saves " +
      "10-20% compared to safe-plane retract.",
    category: "cam_strategy",
    tags: ["linking", "retract", "non-cutting", "optimization"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-linking",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-101",
    title: "Air Cut Reduction Eliminates Empty Passes",
    body:
      "WorkNC's air cut detection identifies toolpath segments " +
      "where the tool is not engaged with material and removes " +
      "them or converts to rapid moves. Enable 'Skip empty passes' " +
      "to eliminate passes cutting only air. For rest machining on " +
      "near-net-shape stock, this can eliminate 40-60% of total " +
      "toolpath length. The detection uses the dynamic stock " +
      "model for accurate empty-pass identification.",
    category: "cam_strategy",
    tags: ["air-cut", "empty-passes", "stock-model", "efficiency"],
    operation_types: ["roughing", "rest_machining"],
    confidence: 91,
    source: "web:worknc-aircut",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-102",
    title: "Rapid Planning Uses Shortest Collision-Free Paths",
    body:
      "WorkNC's rapid movement planner calculates shortest " +
      "collision-free traverse paths between operations. The " +
      "planner considers current stock shape, fixtures, and " +
      "machine structure. Enable 'Optimized rapids' to route " +
      "moves around obstacles instead of always retracting to " +
      "safe plane. Especially effective on large gantry machines " +
      "where retracting to safe Z adds significant travel time.",
    category: "cam_strategy",
    tags: ["rapid-planning", "collision-free", "traverse", "gantry"],
    operation_types: ["general"],
    confidence: 89,
    source: "web:worknc-rapid",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-103",
    title: "Smooth Transitions Between Operations Reduce Marks",
    body:
      "WorkNC ensures smooth entry/exit between consecutive passes " +
      "and operations. Use tangential arc entry/exit at 1-3x tool " +
      "radius. Enable 'Blend transitions' for smooth curves at " +
      "segment junctions. Ensure transition height stays below " +
      "finished surface to prevent witness marks. The lead-out " +
      "from one pass flows into the lead-in of the next for " +
      "seamless surface quality.",
    category: "cam_strategy",
    tags: ["transitions", "smooth", "entry-exit", "blending"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:worknc-transitions",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-104",
    title: "Retract Minimization for Multi-Pass Operations",
    body:
      "WorkNC minimizes retract movements between passes in multi-" +
      "pass operations by connecting adjacent passes with smooth " +
      "arcs at the minimum safe height. For Z-level finishing, " +
      "the retract between levels can be reduced from safe-plane " +
      "height to just 1-2 mm above the stock surface. Enable " +
      "'Connect passes' to create continuous toolpaths that " +
      "minimize air time between cuts by up to 40%.",
    category: "cam_strategy",
    tags: ["retract-minimization", "multi-pass", "air-time", "efficiency"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:worknc-retract",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Automation (wnc-105 to wnc-110) ===
  {
    id: "wnc-105",
    title: "Machining Templates Standardize Processes",
    body:
      "WorkNC's machining templates capture complete process " +
      "sequences: operation order, tool assignments, cutting " +
      "parameters, and linking strategies. Create templates for " +
      "common part families. Templates can include conditional " +
      "logic for different feature sizes. Store and share " +
      "templates across the organization for consistent quality. " +
      "This can reduce programming time by 60-80% for " +
      "recurring part types.",
    category: "cam_strategy",
    tags: ["templates", "standardization", "automation", "reuse"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-templates",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-106",
    title: "Batch Processing Runs Multiple Jobs Unattended",
    body:
      "WorkNC's batch processing queues multiple parts for " +
      "unattended toolpath calculation, simulation, and posting. " +
      "Set up the queue, define output folders, and run overnight. " +
      "Each program's status is tracked in the batch manager. " +
      "For shops processing many similar parts, this maximizes " +
      "programmer productivity. Include simulation verification " +
      "in the batch to catch errors automatically.",
    category: "cam_strategy",
    tags: ["batch", "unattended", "overnight", "productivity"],
    operation_types: ["general"],
    confidence: 89,
    source: "web:worknc-batch",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-107",
    title: "Parametric Machining Adapts to Dimension Changes",
    body:
      "WorkNC's parametric machining links operations to model " +
      "dimensions. When part dimensions change, machining " +
      "parameters update automatically: Z-levels, tool lengths, " +
      "stepovers. This ensures programs remain valid across part " +
      "family variations. Define parameter links using formulas " +
      "that calculate operation values from geometry dimensions.",
    category: "cam_strategy",
    tags: ["parametric", "dimension-driven", "formulas", "adaptable"],
    operation_types: ["general"],
    confidence: 88,
    source: "web:worknc-parametric",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-108",
    title: "Feature Recognition Automates Hole Processing",
    body:
      "WorkNC's automatic feature recognition identifies holes " +
      "(through, blind, countersunk, counterbored), pockets, and " +
      "slots from imported models. Each feature type maps to a " +
      "standard process (e.g., counterbored hole maps to center " +
      "drill, drill, counterbore). Customize the feature-to-" +
      "process mapping per machine. Review unmapped features " +
      "manually—complex blends typically require manual " +
      "strategy assignment.",
    category: "cam_strategy",
    tags: ["feature-recognition", "holes", "automatic", "mapping"],
    operation_types: ["drilling", "pocketing"],
    confidence: 90,
    source: "web:worknc-afr",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-109",
    title: "Standard Workflows Enforce Process Consistency",
    body:
      "WorkNC's workflow system enforces consistent process " +
      "sequences: stock definition, roughing, verification, " +
      "semi-finishing, finishing, drilling, simulation, and " +
      "posting. Mandatory checkpoints prevent skipping steps. " +
      "This ensures every program follows shop standards " +
      "regardless of programmer. Workflows can be customized " +
      "per machine or part type.",
    category: "cam_strategy",
    tags: ["workflow", "standardization", "checkpoints", "consistency"],
    operation_types: ["general"],
    confidence: 89,
    source: "web:worknc-workflow",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-110",
    title: "Knowledge Capture Preserves Expert Decisions",
    body:
      "WorkNC's process templates capture experienced programmer " +
      "decision rules: material/feature combinations mapped to " +
      "strategies, tools, and parameters. For example: 'For " +
      "hardened steel pockets deeper than 3xD, use waveform " +
      "roughing at 8% engagement with CBN-coated carbide.' " +
      "Sharing these templates across the team preserves " +
      "tribal knowledge and raises the baseline skill level.",
    category: "cam_strategy",
    tags: ["knowledge-capture", "expert-rules", "tribal-knowledge"],
    operation_types: ["general"],
    confidence: 88,
    source: "web:worknc-knowledge",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Rest Machining (wnc-111 to wnc-116) ===
  {
    id: "wnc-111",
    title: "Reference Rest Machining Targets Previous Tool Leftovers",
    body:
      "WorkNC's reference rest machining uses the previous tool's " +
      "geometry to calculate exactly where material remains and " +
      "generates toolpaths only in those areas. The reference tool " +
      "diameter and corner radius define the rest material boundary. " +
      "Use a tool 50-70% of the reference tool size. This is " +
      "WorkNC's core rest machining capability and was the first " +
      "automatic remachining system in any CAM software.",
    category: "cam_strategy",
    tags: ["reference-rest", "automatic", "previous-tool", "pioneer"],
    operation_types: ["rest_machining"],
    confidence: 93,
    source: "web:worknc-refrest",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-112",
    title: "Automatic Stock Detection Finds All Remaining Material",
    body:
      "WorkNC's automatic stock detection scans the dynamic stock " +
      "model to identify all regions where material remains above " +
      "the target surface plus stock allowance. The detection uses " +
      "the actual machined state (not theoretical) for maximum " +
      "accuracy. Minimum rest material = stock allowance + " +
      "tolerance + 0.05 mm. This comprehensive detection ensures " +
      "no unmachined zones are missed.",
    category: "cam_strategy",
    tags: ["auto-stock", "detection", "comprehensive", "accuracy"],
    operation_types: ["rest_machining"],
    confidence: 92,
    source: "web:worknc-autostock",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-113",
    title: "Multi-Tool Rest Uses Progressive Cutter Sizes",
    body:
      "WorkNC's multi-tool rest machining chains multiple rest " +
      "operations with progressively smaller tools. Each operation " +
      "references the previous tool to compute remaining material. " +
      "A typical progression: 20 mm rough, 10 mm re-rough, 6 mm " +
      "semi-finish, 3 mm finish, 1 mm rest-finish. Each step " +
      "removes rest material from the previous, ensuring complete " +
      "coverage with optimal tool sizes.",
    category: "cam_strategy",
    tags: ["multi-tool", "progressive", "rest-chain", "sequence"],
    operation_types: ["rest_machining"],
    confidence: 92,
    source: "web:worknc-multitool",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-114",
    title: "Corner Rest Machining Cleans Fillet Regions",
    body:
      "WorkNC's corner rest machining specifically targets internal " +
      "corner and fillet regions where the previous tool's radius " +
      "prevented full access. The system identifies corners by " +
      "comparing the previous tool radius against the part's " +
      "fillet radii. Use a ball-nose cutter smaller than the " +
      "target fillet radius. Set the approach to tangential arc " +
      "entry to prevent tool marks at the start of corner passes.",
    category: "cam_strategy",
    tags: ["corner-rest", "fillets", "internal-corners", "cleanup"],
    operation_types: ["rest_machining", "finishing"],
    confidence: 91,
    source: "web:worknc-cornerrest",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-115",
    title: "Level Rest Machining Targets Specific Z-Ranges",
    body:
      "WorkNC's level rest machining limits rest material detection " +
      "to specific Z-height ranges, allowing targeted cleanup at " +
      "particular depths. This is useful when only certain depth " +
      "zones have remaining material (e.g., a shelf or step in " +
      "the cavity). Set the Z-range to encompass the problem " +
      "area plus 2-3 mm overlap above and below for smooth " +
      "transitions.",
    category: "cam_strategy",
    tags: ["level-rest", "z-range", "targeted", "depth-specific"],
    operation_types: ["rest_machining"],
    confidence: 89,
    source: "web:worknc-levelrest",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-116",
    title: "Pencil Rest Machining for Intersection Line Cleanup",
    body:
      "WorkNC's pencil rest machining combines rest material " +
      "detection with pencil trace logic to clean only the " +
      "intersection lines between surfaces where the previous " +
      "tool left material. This produces the most efficient " +
      "corner cleanup with minimal air cutting. Use sequential " +
      "passes with decreasing stock allowance (0.05, 0.02, 0.0 " +
      "mm) for progressive refinement of corner quality.",
    category: "cam_strategy",
    tags: ["pencil-rest", "intersection", "efficient", "progressive"],
    operation_types: ["rest_machining", "finishing"],
    confidence: 90,
    source: "web:worknc-pencilrest",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Probing (wnc-117 to wnc-121) ===
  {
    id: "wnc-117",
    title: "Setup Probing Automates Part Alignment",
    body:
      "WorkNC programs on-machine probing for automated part " +
      "alignment. Define probing points on reference surfaces " +
      "and WorkNC generates probe routines that measure part " +
      "position and update work offsets (G54-G59). Use minimum " +
      "3 points for plane alignment, 3 for bore center, 2 for " +
      "edge detection. The probe simulation runs in the same " +
      "machine model as cutting operations for full verification.",
    category: "cam_strategy",
    tags: ["probing", "alignment", "setup", "work-offset"],
    operation_types: ["probing"],
    confidence: 91,
    source: "web:worknc-probing",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-118",
    title: "Best-Fit Alignment for Castings and Forgings",
    body:
      "WorkNC's best-fit alignment measures multiple points on " +
      "castings or forgings and calculates optimal part position " +
      "to ensure adequate machining allowance on all surfaces. " +
      "The algorithm minimizes maximum stock removal while " +
      "ensuring minimum wall thickness. Critical for near-net-" +
      "shape parts where stock distribution is uneven and poor " +
      "alignment could expose insufficient material.",
    category: "cam_strategy",
    tags: ["best-fit", "casting", "forging", "alignment"],
    operation_types: ["probing"],
    confidence: 89,
    source: "web:worknc-bestfit",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-119",
    title: "In-Process Inspection Catches Errors Mid-Program",
    body:
      "WorkNC programs in-process probing between operations to " +
      "verify critical dimensions before proceeding. If out of " +
      "tolerance, the program can apply tool offset correction, " +
      "alert the operator, or abort to prevent scrap. Define " +
      "inspection points on critical bores, faces, and depths. " +
      "Set tolerance band to drawing tolerance minus 25% safety " +
      "margin for reliable pass/fail decisions.",
    category: "cam_strategy",
    tags: ["in-process", "inspection", "tolerance", "verification"],
    operation_types: ["probing"],
    confidence: 90,
    source: "web:worknc-inspection",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-120",
    title: "Post-Machining Verification for Quality Documentation",
    body:
      "WorkNC generates post-machining probing cycles that measure " +
      "final dimensions and compare against nominal values. Reports " +
      "can be output as text files on the controller, transmitted " +
      "via DNC, or integrated with quality management systems. " +
      "This provides traceability for aerospace (AS9102 FAI) and " +
      "medical (ISO 13485) requirements without removing the part " +
      "from the machine.",
    category: "cam_strategy",
    tags: ["post-machining", "quality", "fai", "traceability"],
    operation_types: ["probing"],
    confidence: 90,
    source: "web:worknc-postverify",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-121",
    title: "Quality Reporting with Statistical Trend Analysis",
    body:
      "WorkNC's quality reporting aggregates probing data across " +
      "multiple parts to identify dimensional trends. Track key " +
      "dimensions over time to detect tool wear (gradually " +
      "increasing bore diameters) or thermal drift (systematic " +
      "shift in one direction). Set control limits at 50% of " +
      "tolerance for early warning. This transforms the CNC " +
      "machine from a blind executor into a process-aware " +
      "manufacturing system.",
    category: "cam_strategy",
    tags: ["quality-reporting", "trends", "spc", "tool-wear"],
    operation_types: ["probing"],
    confidence: 88,
    source: "web:worknc-quality",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === WorkNC Auto5 Advanced (wnc-122 to wnc-133) ===
  {
    id: "wnc-122",
    title: "Auto5 Tilt Angle Limits — Machine-Specific Constraints",
    body:
      "WorkNC Auto5 respects machine-specific rotary axis limits during " +
      "3-to-5 axis conversion. Define the A/B/C axis travel ranges in " +
      "the machine definition (e.g., A: -120° to +30°, C: -360° to " +
      "+360°). Auto5 will not tilt beyond these limits even if collision " +
      "avoidance requests it. If the required tilt exceeds the machine " +
      "limits, Auto5 flags the region as unreachable. For table-table " +
      "machines with limited tilt (±30°), Auto5 is most effective on " +
      "parts with shallow undercuts; deep undercuts require manual " +
      "5-axis programming or re-fixturing.",
    category: "cam_strategy",
    tags: ["auto-5", "tilt-limits", "machine-definition", "rotary-axis"],
    operation_types: ["5_axis"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-123",
    title: "Auto5 Smoothing Parameters — Controlling Tool Axis Transition",
    body:
      "Auto5 smoothing controls how quickly the tool axis changes " +
      "between regions requiring different tilt orientations. Set the " +
      "'Angular Velocity Limit' (typically 5-15°/mm of toolpath) to " +
      "prevent abrupt axis rotations that cause jerk marks on the " +
      "surface. Lower values produce smoother axis motion but may " +
      "increase toolpath length. For finishing operations on " +
      "appearance surfaces, use 3-5°/mm; for roughing where surface " +
      "quality is less critical, use 10-15°/mm. Always verify " +
      "smoothed paths in simulation — aggressive smoothing can cause " +
      "the tool to approach collision boundaries.",
    category: "cam_strategy",
    tags: ["auto-5", "smoothing", "angular-velocity", "jerk"],
    operation_types: ["5_axis", "finishing"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-124",
    title: "Auto5 Collision Body Definition — Tool, Holder, and Spindle",
    body:
      "Auto5 checks collisions against the complete tool assembly: " +
      "cutting tool, holder, collet/chuck, and spindle nose. Define " +
      "each component with accurate dimensions in the tool library. " +
      "The most common collision during Auto5 conversion is between " +
      "the holder and part walls — not the cutter itself. Set a safety " +
      "clearance margin (1-3mm) between collision bodies and the part " +
      "to account for machine positioning accuracy. For deep cavities, " +
      "use ER collet holders instead of hydraulic chucks — the " +
      "smaller profile provides 5-10mm more clearance.",
    category: "cam_strategy",
    tags: ["auto-5", "collision", "holder", "spindle", "clearance"],
    operation_types: ["5_axis"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-125",
    title: "Auto5 Zone Control — Different Tilt Strategies per Region",
    body:
      "WorkNC Auto5 supports zone-based control where different " +
      "regions of the part can have different tilt strategies. For " +
      "a mold cavity: flat bottom zone uses 3-axis (no tilt), " +
      "vertical walls use fixed tilt (15-20° lead angle), and " +
      "undercut regions use full Auto5 collision avoidance. Define " +
      "zones by selecting surface groups and assigning tilt rules " +
      "per zone. This produces better surface finish than applying " +
      "full Auto5 everywhere because unnecessary axis motion is " +
      "eliminated in regions that don't need it.",
    category: "cam_strategy",
    tags: ["auto-5", "zones", "tilt-strategy", "surface-groups"],
    operation_types: ["5_axis", "finishing"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-126",
    title: "Auto5 Lead and Lag Angles — Optimizing Ball-Nose Contact Point",
    body:
      "Auto5 controls lead (forward tilt) and lag (backward tilt) " +
      "angles that shift the tool contact point away from the ball-nose " +
      "tip. A 10-15° lead angle moves the contact point to where the " +
      "ball has effective cutting speed (the tip has zero surface speed " +
      "and produces poor finish). WorkNC Auto5 maintains the target " +
      "lead angle while simultaneously avoiding collisions — the " +
      "collision avoidance takes priority when they conflict. For " +
      "flat surfaces, the lead angle is critical; for steep walls, " +
      "it has minimal effect since the contact is already on the " +
      "tool's equator.",
    category: "cam_strategy",
    tags: ["auto-5", "lead-angle", "lag-angle", "ball-nose", "contact"],
    operation_types: ["5_axis", "finishing"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-127",
    title: "Auto5 Singularity Management — Handling Vertical Tool Orientation",
    body:
      "When the tool axis passes through a singularity (tool " +
      "perpendicular to a rotary axis), small toolpath movements " +
      "require large rotary axis motions. Auto5 detects singularity " +
      "zones and applies strategies: (1) re-orient the tool to avoid " +
      "the singularity altogether, (2) insert an arc transition that " +
      "smoothly passes through the singular configuration, or (3) " +
      "split the toolpath at the singularity and machine each side " +
      "from a different approach. Configure the singularity detection " +
      "angle (typically within 5° of the singular orientation) and " +
      "the preferred avoidance method in the Auto5 parameters.",
    category: "cam_strategy",
    tags: ["auto-5", "singularity", "rotary-axis", "avoidance"],
    operation_types: ["5_axis"],
    confidence: 88,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-128",
    title: "Auto5 Multi-Pass Consistency — Same Tilt Across Roughing and Finishing",
    body:
      "When using Auto5 for both roughing and finishing passes, ensure " +
      "consistent tool orientation across passes to prevent witness " +
      "marks at transitions between different tilt zones. Use 'Copy " +
      "Tilt from Reference Operation' to force the finishing pass " +
      "to use the same tool axis orientation as the roughing pass. " +
      "This is especially important for rest-machining operations " +
      "where the smaller finishing tool must follow the same approach " +
      "direction as the roughing tool to avoid leaving material in " +
      "areas where the tilt changes.",
    category: "cam_strategy",
    tags: ["auto-5", "multi-pass", "consistency", "tilt", "witness-marks"],
    operation_types: ["5_axis", "finishing"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-129",
    title: "Auto5 for Re-Machining — Reaching Material Missed by 3-Axis",
    body:
      "Auto5 excels at re-machining material left behind by 3-axis " +
      "roughing in deep pockets and undercuts. The workflow: (1) " +
      "rough the part with standard 3-axis toolpaths, (2) calculate " +
      "remaining stock, (3) apply Auto5 to the rest material regions " +
      "only. Auto5 tilts the tool to reach undercuts and deep corners " +
      "that the vertical 3-axis tool couldn't access. This hybrid " +
      "approach is faster than full 5-axis roughing because 80% of " +
      "material removal uses simple 3-axis (higher MRR), and Auto5 " +
      "handles only the remaining 20% of difficult geometry.",
    category: "cam_strategy",
    tags: ["auto-5", "re-machining", "rest-material", "3-axis", "hybrid"],
    operation_types: ["5_axis", "roughing"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-130",
    title: "Auto5 Post Processor Requirements — RTCP and TCPM Support",
    body:
      "Auto5 toolpaths require a post processor that outputs RTCP " +
      "(Rotated Tool Center Point) or TCPM (Tool Center Point " +
      "Management) commands. Without RTCP/TCPM, the controller " +
      "cannot maintain the tool tip position when rotating axes. " +
      "For Heidenhain: FUNCTION TCPM or M128. For Fanuc: G43.4 or " +
      "G43.5. For Siemens: TRAORI. Verify the post processor outputs " +
      "the correct RTCP activation before the first 5-axis move and " +
      "deactivation after the last. Test with a simple dome shape " +
      "before running complex Auto5 toolpaths on production parts.",
    category: "cam_strategy",
    tags: ["auto-5", "post-processor", "rtcp", "tcpm", "controller"],
    operation_types: ["5_axis"],
    confidence: 92,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-131",
    title: "Auto5 Toolpath Quality Assessment — Cusp Height Verification",
    body:
      "After Auto5 conversion, verify that the cusp height remains " +
      "within specification across the entire part surface. Auto5 may " +
      "increase cusp height in regions where the tool tilt changes " +
      "the effective cutting radius (especially with ball-nose tools). " +
      "WorkNC's analysis tools show cusp height as a color map on the " +
      "part surface. If cusp height exceeds the target in Auto5 " +
      "transition zones, reduce the stepover in those regions or " +
      "add a separate finishing pass with tighter parameters. The " +
      "cusp height map is essential for quality-critical surfaces.",
    category: "cam_strategy",
    tags: ["auto-5", "cusp-height", "quality", "verification", "analysis"],
    operation_types: ["5_axis", "finishing"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-132",
    title: "Auto5 Cycle Time Impact — When 5-Axis is Slower Than 3-Axis",
    body:
      "Auto5 conversion adds cycle time due to rotary axis motion and " +
      "deceleration at axis direction changes. For parts where 3-axis " +
      "can reach all surfaces, Auto5 adds 10-30% to cycle time with " +
      "no quality benefit. Use Auto5 only when: (1) the tool holder " +
      "collides with the part in 3-axis mode, (2) the tool stick-out " +
      "required for 3-axis causes unacceptable deflection, (3) " +
      "undercuts or deep features are unreachable in 3-axis, or (4) " +
      "the lead angle benefit improves surface finish on flat areas. " +
      "Always compare 3-axis and Auto5 cycle times before committing.",
    category: "cam_strategy",
    tags: ["auto-5", "cycle-time", "comparison", "3-axis", "justification"],
    operation_types: ["5_axis"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-133",
    title: "Auto5 Machine Compatibility Check — Verify Before Programming",
    body:
      "Before using Auto5, verify the CNC machine supports continuous " +
      "5-axis motion (not just 3+2 indexing). Requirements: (1) " +
      "simultaneous interpolation of 5+ axes, (2) RTCP/TCPM " +
      "capability in the controller, (3) adequate rotary axis speed " +
      "(minimum 10°/s for reasonable cycle times), (4) rotary axis " +
      "accuracy (backlash-compensated). WorkNC's machine definition " +
      "file must accurately describe the kinematic chain (table-table, " +
      "head-head, or head-table configuration). An incorrect kinematic " +
      "definition produces toolpaths that collide on the real machine.",
    category: "cam_strategy",
    tags: ["auto-5", "machine-compatibility", "kinematics", "verification"],
    operation_types: ["5_axis"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === WorkNC Dental (wnc-134 to wnc-139) ===
  {
    id: "wnc-134",
    title: "WorkNC Dental — Automated Crown and Bridge Machining",
    body:
      "WorkNC Dental automates CAM programming for dental restorations: " +
      "crowns, bridges, inlays, onlays, and veneers. Import STL files " +
      "from dental scanners (3Shape, Exocad, Planmeca), and WorkNC " +
      "Dental automatically generates 5-axis toolpaths optimized for " +
      "dental materials (zirconia, PMMA, wax, CoCr, titanium). The " +
      "system handles: margin line detection, insertion axis " +
      "calculation, and nesting of multiple restorations in a single " +
      "blank. Typical cycle: 6-8 minutes per crown in pre-sintered " +
      "zirconia using 1mm and 0.5mm ball-nose tools.",
    category: "cam_strategy",
    tags: ["worknc-dental", "crown", "bridge", "zirconia", "5-axis"],
    operation_types: ["5_axis", "finishing"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-135",
    title: "WorkNC Dental Nesting — Maximize Restorations per Blank",
    body:
      "WorkNC Dental nests multiple restorations in a single disc or " +
      "block blank to maximize material utilization. The nesting " +
      "algorithm considers: restoration height (thicker crowns need " +
      "thicker blanks), sprue connection points (must be on non-" +
      "critical surfaces), minimum spacing between restorations " +
      "(0.5-1mm for tool clearance), and blank dimensions (98mm discs " +
      "are standard for zirconia). For large bridges, the system " +
      "verifies that the blank has sufficient material in the " +
      "pontic region. Optimal nesting can fit 15-25 single crowns " +
      "in one 98mm disc.",
    category: "cam_strategy",
    tags: ["worknc-dental", "nesting", "blank", "zirconia", "utilization"],
    operation_types: ["5_axis"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-136",
    title: "WorkNC Dental Material-Specific Parameters — Zirconia vs PMMA vs Wax",
    body:
      "WorkNC Dental includes optimized cutting parameters per dental " +
      "material: Pre-sintered zirconia — RPM 12,000-15,000, feed " +
      "1,500-2,500 mm/min, dry cutting only (coolant causes clogging), " +
      "vacuum extraction mandatory. PMMA (temporary crowns) — RPM " +
      "20,000-30,000, feed 3,000-5,000 mm/min, air blast cooling. " +
      "CoCr alloy — RPM 8,000-12,000, feed 800-1,200 mm/min, flood " +
      "coolant. Wax (models) — RPM 15,000-20,000, feed 4,000+ mm/min, " +
      "no coolant. Using wrong parameters for the material causes " +
      "chipping (zirconia), melting (PMMA), or tool breakage (CoCr).",
    category: "cam_strategy",
    tags: ["worknc-dental", "material", "zirconia", "pmma", "cocr"],
    operation_types: ["milling"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-137",
    title: "WorkNC Dental Margin Line Finishing — Critical Fit Accuracy",
    body:
      "The margin line (where crown meets prepared tooth) is the most " +
      "critical area of a dental restoration — gaps > 50µm cause " +
      "microleakage and eventual failure. WorkNC Dental generates " +
      "dedicated margin finishing passes with 0.3-0.5mm ball-nose " +
      "tools, 0.05mm stepover, and reduced feed rate. The toolpath " +
      "follows the detected margin line with constant tool engagement. " +
      "For thin margins (feather-edge preparations), use climb milling " +
      "only to prevent chipping the fragile edge. Verify margin " +
      "accuracy with 20x magnification before delivery.",
    category: "cam_strategy",
    tags: ["worknc-dental", "margin", "accuracy", "fit", "finishing"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-138",
    title: "WorkNC Robot — 6-Axis Robotic Machining for Large Parts",
    body:
      "WorkNC Robot programs 6-axis industrial robots (ABB, KUKA, " +
      "Fanuc, Staubli) for machining operations on large parts that " +
      "exceed CNC machine envelopes. Applications: trimming composite " +
      "panels, deburring castings, polishing mold surfaces, and " +
      "drilling aerospace skins. WorkNC generates robot-native paths " +
      "with singularity avoidance, joint limit checking, and reach " +
      "analysis. Key limitation: robots have 0.1-0.5mm positioning " +
      "accuracy (vs 0.005mm for CNC), so robot machining suits " +
      "operations with tolerances > 0.5mm or iterative measurement " +
      "correction workflows.",
    category: "cam_strategy",
    tags: ["worknc-robot", "6-axis", "robotic", "large-parts", "trimming"],
    operation_types: ["milling", "trimming"],
    confidence: 88,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-139",
    title: "WorkNC Robot Calibration — Improving Accuracy with TCP Calibration",
    body:
      "Robot machining accuracy depends on TCP (Tool Center Point) " +
      "calibration quality. WorkNC Robot supports: 4-point TCP " +
      "calibration (touch a reference point from 4 orientations), " +
      "6-point calibration (adds tool direction), and full kinematic " +
      "calibration using laser tracker or ball-bar. For machining " +
      "applications, perform full kinematic calibration — it corrects " +
      "joint zero offsets, link lengths, and coupling errors. " +
      "Recalibrate after any robot collision, joint replacement, or " +
      "quarterly as a minimum. Without calibration, robots can have " +
      "2-5mm TCP error, making machining impossible.",
    category: "cam_strategy",
    tags: ["worknc-robot", "calibration", "tcp", "accuracy", "kinematic"],
    operation_types: ["general"],
    confidence: 87,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === WorkNC Designer (wnc-140 to wnc-145) ===
  {
    id: "wnc-140",
    title: "WorkNC Designer — Surface Preparation for CAM",
    body:
      "WorkNC Designer is the integrated surface modeling module for " +
      "preparing CAD models for CAM programming. Key operations: " +
      "extending surfaces beyond part boundaries (for cutter runoff), " +
      "filling gaps in imported models, creating ruled extensions, " +
      "and building containment boundaries. Unlike general-purpose " +
      "CAD, WorkNC Designer is optimized for CAM preparation tasks — " +
      "creating drive surfaces, check surfaces, and containment " +
      "boundaries in 2-3 clicks rather than complex modeling commands. " +
      "Prepare models in Designer before programming to reduce " +
      "toolpath calculation errors from incomplete geometry.",
    category: "cam_strategy",
    tags: ["worknc-designer", "surface", "preparation", "cad", "modeling"],
    operation_types: ["general"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-141",
    title: "WorkNC Designer Surface Extension — Cutter Runoff for Edge Quality",
    body:
      "Extend part surfaces 5-10mm beyond the trim boundary so the " +
      "cutter can run off the edge smoothly rather than stopping at " +
      "the boundary. Without extension, the tool decelerates at the " +
      "edge, leaving dwell marks. WorkNC Designer's 'Extend Surface' " +
      "command continues the surface curvature naturally beyond the " +
      "boundary. For mold parting surfaces, extend both core and " +
      "cavity surfaces beyond the split line. The extension is used " +
      "only for toolpath computation — the actual part boundary is " +
      "maintained by the trim operation.",
    category: "cam_strategy",
    tags: ["worknc-designer", "extension", "runoff", "edge-quality"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-142",
    title: "WorkNC Designer Gap Filling — Repairing Imported Model Defects",
    body:
      "Imported IGES/STEP models frequently have gaps between " +
      "adjacent surfaces (translation errors). WorkNC Designer fills " +
      "gaps automatically: select adjacent surface edges, and " +
      "Designer creates a bridging surface with G1 or G2 continuity. " +
      "For gaps < 0.1mm, automatic healing usually succeeds. For " +
      "larger gaps (0.1-1mm), use interactive filling with curvature " +
      "matching. Gaps > 1mm indicate a serious model problem — " +
      "request a corrected file from the designer. Never leave gaps " +
      "in the model; toolpath calculations fail unpredictably near " +
      "gaps, producing gouges or missed material.",
    category: "cam_strategy",
    tags: ["worknc-designer", "gap-filling", "repair", "import", "healing"],
    operation_types: ["general"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-143",
    title: "WorkNC Designer Check Surfaces — Controlling Tool Approach Boundaries",
    body:
      "Check surfaces (also called avoid surfaces) define regions " +
      "where the tool must not enter. WorkNC Designer creates check " +
      "surfaces from: clamp locations, adjacent cavity walls, fixture " +
      "components, and machine table surfaces. Define check surfaces " +
      "with a safety offset (1-3mm clearance). The toolpath generator " +
      "retracts the tool when it approaches a check surface and " +
      "resumes cutting after clearing it. This is safer than relying " +
      "on collision simulation alone because check surfaces actively " +
      "modify the toolpath rather than just detecting problems.",
    category: "cam_strategy",
    tags: ["worknc-designer", "check-surfaces", "avoid", "boundary", "safety"],
    operation_types: ["milling"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-144",
    title: "WorkNC Designer Parting Line Creation — Core and Cavity Split",
    body:
      "WorkNC Designer includes parting line tools for mold and die " +
      "work: define the draft direction, identify the parting line " +
      "(where the core meets the cavity), and create the parting " +
      "surface. The parting surface separates the model into core " +
      "and cavity sides for separate programming. Designer handles " +
      "complex parting lines with stepped, curved, and multi-level " +
      "configurations. For accurate parting surfaces, ensure the " +
      "model has adequate draft angles (minimum 0.5° for injection " +
      "molds, 3-5° for die casting). Flat parting surfaces are " +
      "preferred for manufacturing simplicity.",
    category: "cam_strategy",
    tags: ["worknc-designer", "parting-line", "mold", "core", "cavity"],
    operation_types: ["general"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-145",
    title: "WorkNC Designer Electrode Geometry — Extracting Burn Shapes",
    body:
      "WorkNC Designer extracts electrode geometry from cavity " +
      "models: select the cavity region requiring EDM, offset " +
      "surfaces by the spark gap (0.1-0.3mm for roughing, 0.01-" +
      "0.05mm for finishing), and create the electrode solid with " +
      "mounting features. Designer adds electrode extensions " +
      "(clearance faces beyond the burn area), blend radii at " +
      "sharp transitions, and datum reference features for the " +
      "EROWA/System 3R holder. Each electrode is saved as a " +
      "separate model linked to the parent cavity for associative " +
      "updates when the cavity design changes.",
    category: "cam_strategy",
    tags: ["worknc-designer", "electrode", "extraction", "spark-gap", "edm"],
    operation_types: ["edm"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Electrode Machining (wnc-146 to wnc-151) ===
  {
    id: "wnc-146",
    title: "Electrode Roughing Strategy — High-Speed Graphite Machining",
    body:
      "WorkNC roughs graphite electrodes with high-speed strategies: " +
      "40,000+ RPM, 3,000-6,000 mm/min feed, 0.3-0.5mm radial " +
      "stepover, and full axial depth per pass. Use diamond-coated " +
      "ball-nose or flat-end mills (PCD for production runs). Never " +
      "use coolant on graphite — it creates an abrasive paste that " +
      "destroys spindle seals. Vacuum extraction at the cutting zone " +
      "is mandatory for both health (dust inhalation) and machine " +
      "protection (graphite dust is conductive and shorts out " +
      "electronics). WorkNC's high-efficiency roughing maintains " +
      "constant chip load in graphite's brittle cutting regime.",
    category: "cam_strategy",
    tags: ["electrode", "graphite", "roughing", "high-speed", "diamond"],
    operation_types: ["roughing", "milling"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-147",
    title: "Electrode Finishing — Achieving Ra 0.4µm on Graphite",
    body:
      "Finishing graphite electrodes to Ra < 0.4µm requires: ball-" +
      "nose tool with 0.05-0.1mm stepover (3-5% of tool diameter), " +
      "constant surface speed mode, and climb milling exclusively " +
      "(conventional milling chips graphite edges). WorkNC's contour " +
      "finishing with Z-level waterline and scallop strategies " +
      "achieves the required finish in one pass. For rib and detail " +
      "electrodes with thin walls, reduce feed by 40% near walls to " +
      "prevent breakout. Measure electrode dimensions at 3 Z-levels " +
      "(top, middle, bottom) to verify no taper from tool deflection.",
    category: "cam_strategy",
    tags: ["electrode", "graphite", "finishing", "surface-finish", "ra"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-148",
    title: "Copper Electrode Machining — Different Approach Than Graphite",
    body:
      "Copper electrodes require fundamentally different machining " +
      "than graphite: use flood coolant (copper is ductile and " +
      "generates heat), lower RPM (8,000-15,000), lower feed rates " +
      "(1,000-2,500 mm/min), and polished carbide or PCD tools to " +
      "prevent built-up edge. Copper's gummy cutting behavior " +
      "requires higher chip loads (0.03-0.06mm/tooth) to maintain " +
      "shearing rather than plowing. WorkNC programs copper " +
      "electrodes with standard metal-cutting parameters rather " +
      "than the graphite-specific high-speed approach. Use tellurium " +
      "copper (C14500) instead of pure copper for better machinability.",
    category: "cam_strategy",
    tags: ["electrode", "copper", "machining", "coolant", "tellurium"],
    operation_types: ["milling", "finishing"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-149",
    title: "Electrode Set Management — Rougher, Finisher, and Orbiter",
    body:
      "WorkNC manages electrode sets for complex cavities: roughing " +
      "electrode (0.2-0.3mm oversize per side, aggressive burn " +
      "parameters), finishing electrode (0.01-0.05mm oversize, fine " +
      "parameters), and orbiting electrode (undersize, used with XY " +
      "orbital motion for undercuts and corners). Program all " +
      "electrodes in a single WorkNC project with shared reference " +
      "points. The EDM machine runs the sequence: rough all areas → " +
      "inspect → finish all areas → inspect → orbit specific " +
      "features. Maintain electrode traceability by engraving the " +
      "electrode ID on the mounting face.",
    category: "cam_strategy",
    tags: ["electrode", "set-management", "rougher", "finisher", "orbiter"],
    operation_types: ["edm", "milling"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-150",
    title: "Electrode Datum and Holder Setup — EROWA/System 3R Integration",
    body:
      "WorkNC programs electrodes with datum features that match " +
      "precision tooling systems (EROWA ITS, System 3R Macro). The " +
      "electrode CAM program includes: (1) machining the electrode " +
      "shape, (2) machining reference flats for CMM qualification, " +
      "and (3) engraving the electrode ID. The holder's reference " +
      "datum transfers between the milling machine and EDM sinker " +
      "— the electrode position in the sinker matches the CAM " +
      "coordinate system without additional alignment. Set up the " +
      "holder dimensions in WorkNC's tool library for accurate " +
      "collision checking during electrode machining.",
    category: "cam_strategy",
    tags: ["electrode", "datum", "erowa", "system-3r", "holder"],
    operation_types: ["milling", "edm"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-151",
    title: "Electrode Wear Compensation — Multiple Electrodes per Feature",
    body:
      "EDM electrodes wear during the burn process — graphite wears " +
      "1-10% of the machined depth, copper wears 0.5-3%. For deep " +
      "cavities, plan multiple copies of the same electrode: 1 for " +
      "roughing (will wear significantly), 1-2 for semi-finishing, " +
      "and 1 for final finishing. WorkNC programs all copies in a " +
      "batch — same CAM program, multiple blanks nested in one " +
      "setup. Track electrode wear by measuring the electrode after " +
      "each burn stage. If wear exceeds the finishing stock " +
      "remaining, burn a fresh electrode before the finish pass.",
    category: "cam_strategy",
    tags: ["electrode", "wear", "compensation", "copies", "batch"],
    operation_types: ["edm"],
    confidence: 88,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Advanced Re-Machining and Waveform Roughing (wnc-152 to wnc-161) ===
  {
    id: "wnc-152",
    title: "WorkNC Advanced Re-Machining — Automatic Rest Material Detection",
    body:
      "WorkNC's re-machining automatically detects remaining material " +
      "from previous operations by comparing the in-process stock " +
      "against the finished part model. The system identifies areas " +
      "where the previous tool was too large to reach: internal " +
      "corners where tool radius leaves material, narrow slots " +
      "inaccessible to the roughing tool, and complex surface " +
      "regions with insufficient stepover coverage. WorkNC generates " +
      "targeted toolpaths only in these areas, avoiding air cutting. " +
      "The re-machining tool is typically 50-70% of the roughing " +
      "tool diameter for corner cleanup.",
    category: "cam_strategy",
    tags: ["re-machining", "rest-material", "detection", "corners", "cleanup"],
    operation_types: ["milling", "roughing"],
    confidence: 92,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-153",
    title: "WorkNC Multi-Level Re-Machining — Progressive Tool Size Reduction",
    body:
      "For complex mold cavities with tight corners and deep ribs, " +
      "use multi-level re-machining: rough with 16mm tool → re-" +
      "machine with 10mm → re-machine with 6mm → re-machine with " +
      "3mm → finish. Each level removes only the material left by " +
      "the previous tool. WorkNC's automatic stock tracking ensures " +
      "each re-machining operation references the correct in-process " +
      "stock. This progressive approach is 30-50% faster than " +
      "starting with the small tool for the entire pocket because " +
      "each tool operates at its optimal chip load and MRR.",
    category: "cam_strategy",
    tags: ["re-machining", "multi-level", "progressive", "tool-size", "mold"],
    operation_types: ["roughing", "milling"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-154",
    title: "WorkNC Pencil Tracing — Corner Cleanup on Fillets and Transitions",
    body:
      "WorkNC's pencil tracing (also called pencil finishing) " +
      "generates toolpaths that follow the intersection lines " +
      "between adjacent surfaces — the fillet and blend lines where " +
      "material remains after area finishing. The pencil tool traces " +
      "along these intersection lines with a small ball-nose tool, " +
      "removing the cusp remnants. WorkNC automatically detects " +
      "intersection lines and generates the pencil passes. Run " +
      "pencil tracing as the final operation after area finishing — " +
      "it removes the last 0.01-0.05mm of cusp material in fillets " +
      "that area finishing leaves behind.",
    category: "cam_strategy",
    tags: ["pencil-tracing", "corners", "fillets", "cleanup", "finishing"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-155",
    title: "Waveform Roughing — Constant Engagement Angle for Maximum MRR",
    body:
      "WorkNC's waveform roughing maintains a constant tool " +
      "engagement angle throughout the roughing operation, similar " +
      "to VoluMill and Adaptive Clearing concepts. The toolpath " +
      "uses trochoidal-style loops with controlled radial engagement " +
      "(typically 10-15% of tool diameter for steel, 20-30% for " +
      "aluminum). This enables high axial depth (2-3x diameter) at " +
      "high feed rates because the chip thickness is controlled. " +
      "Set the engagement angle in degrees — 60° for steel, 90° for " +
      "aluminum, 45° for stainless and titanium. Monitor spindle " +
      "load during the first pass to verify the engagement is correct.",
    category: "cam_strategy",
    tags: ["waveform", "roughing", "engagement", "trochoidal", "mrr"],
    operation_types: ["roughing", "milling"],
    confidence: 92,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-156",
    title: "Waveform Entry Strategy — Helical and Ramp Approach",
    body:
      "Waveform roughing requires controlled entry into the material " +
      "to establish the constant-engagement condition. WorkNC uses " +
      "helical entry (spiral down into a pocket) or ramp entry " +
      "(linear descent at 2-5° angle) based on the geometry. Set " +
      "the helical entry diameter to 1.5-2x tool diameter for " +
      "adequate chip evacuation during the entry spiral. For blind " +
      "pockets, the helical entry creates a pilot hole first, then " +
      "the waveform path expands outward. Never use plunge entry " +
      "with waveform roughing — it creates instantaneous full " +
      "engagement that can break the tool.",
    category: "cam_strategy",
    tags: ["waveform", "entry", "helical", "ramp", "roughing"],
    operation_types: ["roughing", "milling"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-157",
    title: "Waveform Corner Handling — Arc Transitions for Smooth Load",
    body:
      "At internal corners, waveform roughing generates arc-based " +
      "transitions rather than sharp direction changes. The arc " +
      "radius (typically 10-20% of tool diameter) prevents the " +
      "engagement spike that occurs when a tool enters a corner with " +
      "a sharp turn. WorkNC also reduces the feed rate approaching " +
      "corners and increases it on straight sections to maintain " +
      "constant chip load. The combination of arc geometry and " +
      "variable feed produces consistent tool loading through " +
      "corners, extending tool life by 30-50% compared to " +
      "conventional roughing with sharp corner transitions.",
    category: "cam_strategy",
    tags: ["waveform", "corners", "arc", "transitions", "chip-load"],
    operation_types: ["roughing"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-158",
    title: "Waveform for Hard Materials — 50+ HRC Roughing Strategy",
    body:
      "Waveform roughing enables roughing of hardened materials (50+ " +
      "HRC) that would be impossible with conventional toolpaths. " +
      "Settings: engagement angle 30-45°, axial depth 1-1.5x " +
      "diameter, Vc 80-120 m/min (carbide with AlTiN coating), " +
      "fz 0.03-0.06mm/tooth. The constant engagement prevents the " +
      "thermal shock and intermittent loading that causes carbide " +
      "tool fracture in hardened steel. This enables rough-from-" +
      "hard workflows where the part is heat-treated before " +
      "machining, eliminating the distortion that occurs when " +
      "machining soft → heat treating → finish machining.",
    category: "cam_strategy",
    tags: ["waveform", "hardened", "hrc", "roughing", "hard-machining"],
    operation_types: ["roughing"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-159",
    title: "WorkNC Re-Machining with Stock Tracking — Multi-Tool Roughing",
    body:
      "WorkNC tracks the stock model through multiple roughing " +
      "operations for accurate re-machining. The workflow: (1) " +
      "Z-level roughing with large tool creates initial pockets, " +
      "(2) waveform roughing with medium tool removes corners and " +
      "step transitions, (3) re-machining with small tool reaches " +
      "tight areas. Each operation receives the updated stock model " +
      "from the previous step. Without stock tracking, the small " +
      "tool would attempt to remove all material including areas " +
      "already cleared, wasting 60-70% of cycle time on air cuts.",
    category: "cam_strategy",
    tags: ["re-machining", "stock-tracking", "multi-tool", "workflow"],
    operation_types: ["roughing", "milling"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-160",
    title: "WorkNC Flat Area Detection — Automatic Face Milling Where Possible",
    body:
      "WorkNC automatically detects flat areas on 3D parts and " +
      "generates face milling operations instead of point-contact " +
      "ball-nose finishing. Flat areas machined with a flat-end or " +
      "bull-nose tool produce superior surface finish in 1/5 the " +
      "time of ball-nose finishing. Set the detection threshold " +
      "(e.g., surfaces within 0.5° of horizontal are 'flat'). " +
      "WorkNC generates boundary containment for each flat region " +
      "and assigns the appropriate tool automatically. This hybrid " +
      "approach — flat tool for plateaus, ball-nose for curved — " +
      "reduces finishing time by 20-40% on typical mold components.",
    category: "cam_strategy",
    tags: ["flat-area", "detection", "face-milling", "hybrid", "finishing"],
    operation_types: ["finishing", "milling"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-161",
    title: "WorkNC Spiral Finishing — Continuous Tool Contact for Best Surface Quality",
    body:
      "WorkNC's spiral finishing generates a continuous spiral " +
      "toolpath that covers the entire part surface without the " +
      "retract-reposition moves that leave witness marks. The spiral " +
      "starts at the center (or top) and expands outward (or " +
      "downward) with constant stepover. For mold cavities, spiral " +
      "finishing produces the smoothest surface because the tool " +
      "never lifts and re-enters the material. Combine spiral " +
      "finishing with constant-curvature toolpath options for HSM " +
      "compatibility. The trade-off: spiral paths can be 10-20% " +
      "longer than row-based paths, but the surface quality " +
      "improvement justifies the extra time on appearance surfaces.",
    category: "cam_strategy",
    tags: ["spiral", "finishing", "continuous", "surface-quality", "mold"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Composite and Hardened Material Machining (wnc-162 to wnc-169) ===
  {
    id: "wnc-162",
    title: "Composite Trimming — CFRP and GFRP Edge Routing",
    body:
      "WorkNC programs composite panel trimming with strategies that " +
      "prevent delamination: (1) use compression routers (up-down " +
      "helix) that push fibers inward on both surfaces, (2) climb " +
      "milling only — conventional milling lifts fibers causing " +
      "fraying, (3) PCD or diamond-coated tools for fiber cutting " +
      "(carbide dulls in minutes on carbon fiber), (4) no coolant " +
      "(water damages some resin systems), (5) vacuum dust " +
      "extraction (carbon fiber dust is carcinogenic and conductive). " +
      "Set feed rate to achieve clean fiber cutting: too slow causes " +
      "heat buildup and resin degradation; too fast causes fiber " +
      "pull-out.",
    category: "cam_strategy",
    tags: ["composite", "cfrp", "gfrp", "trimming", "delamination"],
    operation_types: ["milling", "trimming"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-163",
    title: "Composite Drilling — Preventing Entry and Exit Delamination",
    body:
      "Drilling composites requires special strategies to prevent " +
      "delamination at entry and exit surfaces. WorkNC programs: " +
      "(1) reduced feed at entry (50% of steady-state feed for " +
      "first 2mm), (2) peck drilling with short retracts to clear " +
      "dust, (3) dramatically reduced feed at exit (30% of nominal " +
      "for last 1mm to prevent push-through delamination), (4) " +
      "back-up support plate on exit side when possible. Use brad-" +
      "point or dagger drills designed for composites — standard " +
      "twist drills cause severe delamination. Maximum hole diameter " +
      "without pilot: 6mm for CFRP, 10mm for GFRP.",
    category: "cam_strategy",
    tags: ["composite", "drilling", "delamination", "entry-exit", "brad-point"],
    operation_types: ["drilling"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-164",
    title: "Composite Stack Drilling — CFRP/Titanium/Aluminum Stacks",
    body:
      "Aerospace structures often require drilling through CFRP/" +
      "titanium or CFRP/aluminum stacks. WorkNC programs these with " +
      "material-specific parameters per layer: (1) CFRP layer — " +
      "high RPM (6,000-10,000), moderate feed, no coolant or MQL, " +
      "(2) titanium layer — low RPM (400-800), high feed, through-" +
      "tool coolant 40+ bar, (3) aluminum layer — high RPM, high " +
      "feed, flood coolant. WorkNC changes parameters mid-hole " +
      "based on the programmed layer transition depths. Use variable-" +
      "helix drills designed for stack drilling to handle the " +
      "dramatically different chip formation per layer.",
    category: "cam_strategy",
    tags: ["composite", "stack-drilling", "cfrp", "titanium", "aluminum"],
    operation_types: ["drilling"],
    confidence: 88,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-165",
    title: "Hardened Steel Finishing — Direct Milling at 55-65 HRC",
    body:
      "WorkNC excels at programming hardened steel finishing (55-65 " +
      "HRC) for mold and die work. Key parameters: Vc 150-250 m/min " +
      "(AlTiN or AlCrN coated carbide), fz 0.03-0.08mm/tooth, " +
      "ap 0.1-0.3mm (finishing), stepover 5-10% of ball-nose " +
      "diameter. Use constant-curvature toolpaths (WorkNC's HSM " +
      "mode) to maintain high feed rates — deceleration at sharp " +
      "toolpath corners generates heat that damages the hardened " +
      "surface. Coolant strategy: air blast or MQL only — thermal " +
      "shock from flood coolant causes surface micro-cracks in " +
      "hardened steel that propagate during use.",
    category: "cam_strategy",
    tags: ["hardened-steel", "finishing", "hrc", "mold-die", "hsm"],
    operation_types: ["finishing"],
    confidence: 92,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-166",
    title: "Hardened Steel Semi-Finishing — Uniform Stock for Finish Pass",
    body:
      "Semi-finishing hardened steel is critical for uniform finish " +
      "pass stock. Non-uniform stock causes variable cutting forces " +
      "in the finish pass, producing inconsistent surface finish. " +
      "WorkNC's 3D stepover semi-finishing creates uniform stock " +
      "regardless of surface curvature. Set semi-finish stock at " +
      "0.05-0.15mm (2-5x the expected tool deflection during " +
      "finishing). Use a bull-nose tool 50-70% of the roughing tool " +
      "diameter. WorkNC's rest-machining detection ensures the semi-" +
      "finishing tool addresses all areas left by the roughing " +
      "operation, preventing heavy spots that damage finishing tools.",
    category: "cam_strategy",
    tags: ["hardened-steel", "semi-finishing", "stock", "uniform", "deflection"],
    operation_types: ["milling"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-167",
    title: "Hardened Steel Tool Selection — CBN vs Carbide Decision Guide",
    body:
      "For hardened steel (> 55 HRC), choose between CBN and carbide: " +
      "CBN tools enable Vc 200-400 m/min but are expensive and " +
      "brittle (no interrupted cuts). Carbide with AlTiN coating " +
      "runs at Vc 100-200 m/min, is cheaper, and tolerates light " +
      "interruptions. Decision guide: CBN for continuous finishing " +
      "of large surfaces (> 100 cm²) where the speed advantage " +
      "justifies the tool cost. Carbide for interrupted cuts, small " +
      "features, and when tool inventory variety must be minimized. " +
      "In WorkNC, create separate tool entries with appropriate " +
      "speed/feed ranges for each material.",
    category: "cam_strategy",
    tags: ["hardened-steel", "cbn", "carbide", "tool-selection", "coating"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-168",
    title: "Hardened Steel Corner Radius Strategy — Avoiding Tool Breakage",
    body:
      "Internal corners in hardened steel are the highest-risk area " +
      "for tool breakage. WorkNC prevents corner failures by: (1) " +
      "using a finishing tool smaller than the corner radius (tool " +
      "R ≤ 0.7 × corner R to avoid full-wrap engagement), (2) " +
      "reducing feed rate 30-50% in corners via the 'corner " +
      "slowdown' feature, (3) using rest-machining to pre-clear " +
      "corners with a small tool before the area finishing pass, " +
      "(4) programming lead-in arcs rather than direct entry into " +
      "corner zones. For corners with R < 0.5mm, consider EDM " +
      "instead of milling — the risk of tool breakage is too high.",
    category: "cam_strategy",
    tags: ["hardened-steel", "corners", "breakage", "feed-rate", "edm"],
    operation_types: ["finishing", "milling"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-169",
    title: "Composite Contour Machining — 5-Axis Trimming with Auto5",
    body:
      "WorkNC Auto5 is ideal for composite contour trimming because " +
      "the tool can be tilted to maintain perpendicular contact with " +
      "curved panel surfaces. The workflow: (1) create a 3-axis " +
      "contour toolpath on the trim line, (2) apply Auto5 to tilt " +
      "the tool perpendicular to the panel surface at each point, " +
      "(3) set the tool to extend below the panel by 1-2mm for " +
      "complete through-cut. Use short stick-out tools (flute length " +
      "= panel thickness + 2mm) for maximum rigidity. For double-" +
      "curved panels, Auto5 smoothly interpolates the tilt angle " +
      "along the contour for consistent edge quality.",
    category: "cam_strategy",
    tags: ["composite", "contour", "trimming", "auto-5", "5-axis"],
    operation_types: ["5_axis", "trimming"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Process Variability and Statistical Optimization (wnc-170 to wnc-181) ===
  {
    id: "wnc-170",
    title: "Process Variability Sources in Mold Machining — Systematic Identification",
    body:
      "Mold and die machining variability sources mapped by impact: " +
      "(1) Tool deflection — dominant for finishing (causes 60-70% " +
      "of dimensional error), controlled by tool overhang and radial " +
      "depth. (2) Thermal growth — 0.01-0.05mm machine drift over " +
      "8 hours, mitigated by warm-up and probing. (3) Stock variation " +
      "— non-uniform roughing stock causes variable finish forces. " +
      "(4) Tool wear — gradual size change, compensated by offset " +
      "updates. (5) Surface model accuracy — CAD tessellation error " +
      "(set chord tolerance < 0.001mm in WorkNC). Prioritize " +
      "controlling deflection first as it has the largest impact.",
    category: "cam_strategy",
    tags: ["variability", "mold", "deflection", "thermal", "systematic"],
    operation_types: ["general"],
    confidence: 88,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-171",
    title: "DOE for Finishing Parameters — Optimizing Ra and Dimensional Accuracy",
    body:
      "Run a 2³ factorial DOE (8 runs) with factors: stepover (0.1 " +
      "vs 0.3mm), feed rate (2000 vs 4000 mm/min), and spindle speed " +
      "(15000 vs 25000 RPM). Measure Ra and dimensional deviation. " +
      "Typical findings: stepover is the dominant factor for Ra " +
      "(expected), but speed × feed interaction affects dimensional " +
      "accuracy through tool deflection. The DOE reveals the optimal " +
      "compromise — e.g., high speed + moderate feed produces better " +
      "results than moderate speed + low feed because reduced cutting " +
      "force at high speed decreases deflection. Apply findings to " +
      "WorkNC finishing templates.",
    category: "cam_strategy",
    tags: ["doe", "finishing", "parameters", "ra", "optimization"],
    operation_types: ["finishing"],
    confidence: 86,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-172",
    title: "SPC on Mold Dimensions — Tracking Cavity Size Over Production Run",
    body:
      "Implement SPC on critical mold dimensions during the injection " +
      "mold production run (not during mold machining). Track: cavity " +
      "dimensions (which grow with wear), gate dimensions (which " +
      "erode from glass-filled materials), and parting line flash " +
      "(which indicates die wear). Set control limits based on the " +
      "first 100 shots of stable production. Typical mold life before " +
      "rework: P20 with glass-filled nylon = 50K-100K shots, H13 = " +
      "300K-500K shots. When SPC signals a shift, schedule mold " +
      "polishing or re-machining using WorkNC programs updated with " +
      "the measured wear pattern.",
    category: "cam_strategy",
    tags: ["spc", "mold", "cavity-wear", "injection", "control-charts"],
    operation_types: ["general"],
    confidence: 87,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-173",
    title: "Taguchi Method for Roughing Optimization — Maximizing MRR",
    body:
      "Apply Taguchi L9 design (4 factors, 3 levels each) to optimize " +
      "waveform roughing: Factor A — engagement angle (45/60/90°), " +
      "Factor B — axial depth (1/1.5/2 × diameter), Factor C — feed " +
      "per tooth (0.06/0.10/0.14mm), Factor D — cutting speed " +
      "(120/160/200 m/min). Response: MRR (cm³/min) at acceptable " +
      "tool wear rate (VB < 0.2mm at 30 min). Calculate S/N ratio " +
      "(larger-is-better for MRR). The Taguchi analysis identifies " +
      "the dominant factor (usually axial depth) and the optimal " +
      "combination. Apply results to WorkNC waveform templates.",
    category: "cam_strategy",
    tags: ["taguchi", "roughing", "mrr", "optimization", "l9"],
    operation_types: ["roughing"],
    confidence: 85,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-174",
    title: "Monte Carlo for Electrode Burn Accuracy — Predicting Cavity Dimensions",
    body:
      "Model electrode burning accuracy with Monte Carlo simulation. " +
      "Input variables: electrode dimensional accuracy (Normal, " +
      "µ=0, σ=0.003mm), spark gap variation (Normal, µ=gap, " +
      "σ=0.005mm), electrode wear (Uniform, 0-5%), and positioning " +
      "repeatability (Normal, µ=0, σ=0.002mm). Simulate 10,000 " +
      "burns to predict the cavity dimension distribution. If the " +
      "predicted Cpk < 1.33 for the mold tolerance, improve the " +
      "dominant contributor: typically spark gap control for roughing " +
      "electrodes and electrode accuracy for finishing. This analysis " +
      "justifies the precision level needed in WorkNC electrode " +
      "machining programs.",
    category: "cam_strategy",
    tags: ["monte-carlo", "electrode", "accuracy", "spark-gap", "simulation"],
    operation_types: ["edm"],
    confidence: 84,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-175",
    title: "Stochastic Tool Wear in Hardened Steel — Weibull Life Modeling",
    body:
      "Tool life in hardened steel (> 50 HRC) follows a Weibull " +
      "distribution with shape parameter β = 2-4 (wear-out mode). " +
      "Collect failure data from 15+ tools under identical WorkNC " +
      "finishing conditions. Fit Weibull: β (shape) and η (scale = " +
      "characteristic life). Set tool change at B5 life (5% " +
      "probability of failure) for critical finishing operations " +
      "where tool failure causes scrap. For roughing where a broken " +
      "tool doesn't damage the part, use B20 (more aggressive, " +
      "less tool waste). Typical ball-nose in 60 HRC steel: " +
      "η = 45 min, β = 3.2, B5 = 22 min, B20 = 33 min.",
    category: "cam_strategy",
    tags: ["stochastic", "tool-wear", "weibull", "hardened", "reliability"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-176",
    title: "Response Surface for Surface Finish — Predicting Ra from Parameters",
    body:
      "Build a Response Surface Model (RSM) for surface roughness " +
      "prediction: Ra = f(Vc, fz, ae, tool_radius). Run a Central " +
      "Composite Design (15-20 test cuts) measuring Ra at each " +
      "combination. The RSM typically shows: Ra decreases linearly " +
      "with reduced stepover, decreases with increased speed (to a " +
      "point), and has a complex interaction with feed (low feed " +
      "improves Ra but increases rubbing). Use the RSM contour plot " +
      "to find the parameter region that achieves Ra < 0.8µm at " +
      "minimum cycle time. Program WorkNC finishing operations at " +
      "the optimal point.",
    category: "cam_strategy",
    tags: ["rsm", "surface-finish", "prediction", "regression", "contour"],
    operation_types: ["finishing"],
    confidence: 84,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-177",
    title: "Bayesian Optimization for Cutting Parameters — Efficient Search",
    body:
      "Bayesian optimization efficiently searches the cutting " +
      "parameter space with fewer test cuts than grid search or " +
      "full factorial DOE. Start with handbook-based prior beliefs " +
      "about optimal parameters, run 5 test cuts, update the " +
      "surrogate model (Gaussian Process), and select the next test " +
      "point using Expected Improvement (EI) acquisition function. " +
      "After 15-20 iterations, the algorithm converges to near-" +
      "optimal parameters. This is particularly valuable for " +
      "expensive materials (titanium, Inconel) where each test cut " +
      "costs $50-200 in material and tool wear. Apply optimized " +
      "parameters to WorkNC operation templates.",
    category: "cam_strategy",
    tags: ["bayesian", "optimization", "gaussian-process", "parameters"],
    operation_types: ["milling", "turning"],
    confidence: 83,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-178",
    title: "Process Capability for Mold Dimensions — Cpk Targets by Feature Type",
    body:
      "Set Cpk targets by mold feature type: cavity dimensions " +
      "Cpk ≥ 1.67 (tight tolerance, high impact on part quality), " +
      "core dimensions Cpk ≥ 1.33 (moderate tolerance), parting " +
      "surface flatness Cpk ≥ 2.0 (flash prevention requires very " +
      "tight control), cooling channel positions Cpk ≥ 1.0 " +
      "(functional but less critical). Measure 30-50 features from " +
      "production molds to build the capability database. When " +
      "programming new molds in WorkNC, reference the capability " +
      "database to select appropriate strategies — features that " +
      "historically achieve low Cpk need additional operations " +
      "(spring pass, probe-and-correct cycles).",
    category: "cam_strategy",
    tags: ["cpk", "capability", "mold", "targets", "feature-type"],
    operation_types: ["general"],
    confidence: 86,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-179",
    title: "Robust Parameter Design for Multi-Cavity Molds — Cavity-to-Cavity Consistency",
    body:
      "Multi-cavity molds require cavity-to-cavity dimensional " +
      "consistency. Apply Taguchi's robust design: control factors " +
      "are CAM parameters (stepover, feed, depth), noise factors " +
      "are cavity position on the machine table (thermal gradients " +
      "vary by position) and tool wear progression across cavities. " +
      "The robust parameter set minimizes variation between cavities " +
      "despite noise. Key finding: reducing stepover improves " +
      "cavity-to-cavity consistency more than reducing feed because " +
      "stepover directly controls the cusp height component of " +
      "variation. Apply the robust parameters in WorkNC templates " +
      "used for multi-cavity mold finishing.",
    category: "cam_strategy",
    tags: ["robust-design", "multi-cavity", "consistency", "taguchi", "mold"],
    operation_types: ["finishing"],
    confidence: 84,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-180",
    title: "Tool Wear Prediction — Flank Wear Rate as Random Variable",
    body:
      "Model flank wear rate (dVB/dt) as a random variable with " +
      "log-normal distribution: ln(dVB/dt) ~ Normal(µ, σ²). The " +
      "mean µ depends on cutting conditions (Taylor model), and " +
      "σ captures tool-to-tool variability (typically 15-30% CV). " +
      "Propagate through the wear equation VB(t) = dVB/dt × t to " +
      "predict the probability of exceeding VB_max at any time t. " +
      "Set tool change intervals where P(VB > VB_max) < 5%. This " +
      "stochastic approach replaces the deterministic 'change every " +
      "N minutes' rule with a risk-based schedule that adapts to " +
      "the actual variability of each tool type.",
    category: "cam_strategy",
    tags: ["tool-wear", "prediction", "log-normal", "flank-wear", "risk"],
    operation_types: ["general"],
    confidence: 83,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-181",
    title: "Thermal Drift Compensation — Statistical Model for Machine Growth",
    body:
      "Model machine thermal growth as a time-varying random process: " +
      "ΔZ(t) = α × (T_eq - T_0) × (1 - e^(-t/τ)) + ε(t), where " +
      "α is the thermal coefficient, T_eq is the equilibrium " +
      "temperature, τ is the time constant (typically 30-90 min for " +
      "spindle, 2-4 hours for column), and ε is random noise " +
      "(Normal, σ = 0.003-0.008mm). Fit the model from probe " +
      "measurements taken every 30 minutes during a production day. " +
      "Use the model to predict the optimal probing schedule: " +
      "probe every 30 min during warm-up, every 2 hours at " +
      "steady state. WorkNC can include probing operations at " +
      "the model-predicted intervals.",
    category: "cam_strategy",
    tags: ["thermal-drift", "compensation", "statistical", "model", "probing"],
    operation_types: ["general"],
    confidence: 83,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Digital Twin (wnc-182 to wnc-193) ===
  {
    id: "wnc-182",
    title: "WorkNC Digital Twin — Virtual Machine for Program Validation",
    body:
      "WorkNC's digital twin is the full kinematic machine model " +
      "used for simulation and validation. The twin includes: " +
      "spindle, table, rotary axes, tool magazine, fixture, and " +
      "workpiece. During simulation, the twin executes the actual " +
      "G-code through a virtual controller, detecting: collision " +
      "events, axis over-travel, spindle speed limit violations, " +
      "and feed rate exceedances. The digital twin validates the " +
      "complete post-processed code, not just the CAM toolpath. " +
      "This catches post processor errors that toolpath-level " +
      "simulation misses: wrong canned cycle codes, incorrect " +
      "coordinate system commands, and missing safety moves.",
    category: "cam_strategy",
    tags: ["digital-twin", "simulation", "validation", "kinematic", "gcode"],
    operation_types: ["general"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-183",
    title: "Digital Twin Material Removal Verification — Stock Comparison",
    body:
      "WorkNC's digital twin performs material removal simulation " +
      "with stock comparison: the simulated remaining stock is " +
      "compared point-by-point against the target part model. The " +
      "comparison shows: overcut areas (gouge, shown in red), " +
      "remaining material areas (excess stock, shown in blue), " +
      "and on-target areas (within tolerance, shown in green). " +
      "Set the comparison tolerance to the finishing stock allowance. " +
      "Any red (overcut) indicates a programming error requiring " +
      "immediate correction. Blue areas < 0.02mm are typically " +
      "acceptable as they're within tool deflection range.",
    category: "cam_strategy",
    tags: ["digital-twin", "material-removal", "comparison", "gouge", "stock"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-184",
    title: "Digital Twin Cycle Time Calibration — Matching Simulation to Reality",
    body:
      "Calibrate the digital twin's cycle time prediction to match " +
      "actual machining time. Factors that cause simulation-to-" +
      "reality gaps: (1) axis acceleration/deceleration (2-10% of " +
      "total time), (2) tool change time (3-15s per change), (3) " +
      "controller block processing time (1-5ms/block on older " +
      "controllers), (4) spindle speed change time (1-3s per " +
      "change). Measure actual cycle times for 5-10 representative " +
      "programs and calculate correction factors per machine. Apply " +
      "these factors in WorkNC's machine definition. A calibrated " +
      "twin predicts cycle time within ±5%, enabling accurate job " +
      "quoting.",
    category: "cam_strategy",
    tags: ["digital-twin", "cycle-time", "calibration", "accuracy", "quoting"],
    operation_types: ["general"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-185",
    title: "Digital Twin Force Prediction — Estimating Tool Load from Toolpath",
    body:
      "WorkNC's simulation can estimate cutting forces from the " +
      "instantaneous chip cross-section and material's specific " +
      "cutting force (Kc). At each toolpath point: F = Kc × b × " +
      "h^(1-mc), where b = axial depth, h = chip thickness. Plot " +
      "forces along the toolpath to identify: peak force locations " +
      "(risk of tool breakage), sustained high-force regions (risk " +
      "of tool deflection), and rapid force changes (risk of " +
      "vibration). If peak forces exceed the tool's rated capacity, " +
      "reduce depth of cut or feed in those regions. Force " +
      "prediction is most accurate for roughing where engagement " +
      "is well-defined.",
    category: "cam_strategy",
    tags: ["digital-twin", "force", "prediction", "kienzle", "tool-load"],
    operation_types: ["roughing", "milling"],
    confidence: 85,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-186",
    title: "Digital Twin Thermal Model — Predicting Workpiece Temperature",
    body:
      "The digital twin can model workpiece temperature during " +
      "machining to predict thermal distortion. Heat input comes " +
      "from cutting (Q = η × Pc, where η is the partition ratio " +
      "and Pc is cutting power), and dissipation through coolant " +
      "and conduction. For large mold blocks, temperature gradients " +
      "of 2-5°C across the workpiece cause 0.01-0.05mm distortion. " +
      "The twin predicts which regions heat up most and suggests: " +
      "(1) toolpath sequencing to distribute heat evenly, (2) dwell " +
      "times between passes for cooling, (3) probe-and-correct " +
      "cycles after heavy roughing. Monitor workpiece temperature " +
      "with IR thermometry to validate the model.",
    category: "cam_strategy",
    tags: ["digital-twin", "thermal", "temperature", "distortion", "model"],
    operation_types: ["general"],
    confidence: 82,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-187",
    title: "Digital Twin Machine Health Monitoring — Vibration Baseline Tracking",
    body:
      "Establish vibration baselines for each CNC machine by " +
      "recording spectra during standard cutting operations. The " +
      "digital twin stores these baselines and compares against " +
      "current vibration data from accelerometers. Increasing " +
      "vibration at specific frequencies indicates: spindle bearing " +
      "wear (bearing defect frequencies), backlash (low-frequency " +
      "position oscillation), or ball screw degradation (screw " +
      "rotation frequency harmonics). Alert thresholds: 2× baseline " +
      "= monitor, 4× = plan maintenance, 8× = stop. Integrate " +
      "vibration monitoring with WorkNC programming by reducing " +
      "speeds on machines showing elevated vibration.",
    category: "cam_strategy",
    tags: ["digital-twin", "vibration", "monitoring", "baseline", "maintenance"],
    operation_types: ["general"],
    confidence: 83,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-188",
    title: "Digital Twin Process Optimization — Feedback Loop from Production",
    body:
      "Implement a continuous optimization loop: (1) WorkNC programs " +
      "generate predicted performance (cycle time, force, quality), " +
      "(2) production data captures actual performance (from machine " +
      "monitoring and inspection), (3) compare predicted vs actual " +
      "and identify gaps, (4) adjust WorkNC parameters and models " +
      "to close gaps, (5) repeat. After 5-10 iterations, the digital " +
      "twin converges to 95%+ prediction accuracy. This loop " +
      "transforms WorkNC from a one-way CAM system to a learning " +
      "system that improves with each production run. Key enabler: " +
      "structured data collection with consistent measurement.",
    category: "cam_strategy",
    tags: ["digital-twin", "optimization", "feedback-loop", "learning"],
    operation_types: ["general"],
    confidence: 84,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-189",
    title: "Digital Twin for New Machine Integration — Virtual Setup Before Delivery",
    body:
      "Before a new CNC machine arrives, create its digital twin in " +
      "WorkNC: kinematic chain definition, axis limits, spindle " +
      "specs, tool magazine layout, and controller type. Run " +
      "existing production programs through the virtual machine to " +
      "identify: programs that exceed axis limits, tools too long " +
      "for the magazine, operations that need parameter adjustment " +
      "for the new spindle. This pre-delivery preparation means the " +
      "new machine can start cutting production parts within days " +
      "of installation rather than the weeks typically spent on " +
      "program conversion and proving.",
    category: "cam_strategy",
    tags: ["digital-twin", "new-machine", "integration", "virtual-setup"],
    operation_types: ["general"],
    confidence: 85,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-190",
    title: "Digital Twin Tool Life Integration — Predicting Change Points",
    body:
      "The digital twin tracks cumulative cutting time per tool and " +
      "predicts when the tool will reach its life limit. Integrate " +
      "with WorkNC's tool library: each tool entry includes the " +
      "expected life (from Weibull model or simple time limit), " +
      "and the twin deducts cutting time during simulation. Before " +
      "starting a new job, the twin checks if each tool has " +
      "sufficient remaining life to complete the job. If not, it " +
      "recommends: (1) replace the tool before starting, (2) " +
      "insert a tool change within the program, or (3) redistribute " +
      "operations to use a different tool with more remaining life.",
    category: "cam_strategy",
    tags: ["digital-twin", "tool-life", "prediction", "change-point"],
    operation_types: ["general"],
    confidence: 85,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-191",
    title: "Digital Twin MTConnect Integration — Real-Time Data Feed",
    body:
      "Connect the digital twin to the physical CNC machine via " +
      "MTConnect protocol. The data feed includes: spindle speed, " +
      "axis positions, feed rate, spindle load, coolant status, and " +
      "program status. The twin displays real-time machining state " +
      "overlaid on the 3D model: current tool position, material " +
      "removal progress, and estimated remaining time. Alert " +
      "conditions: spindle load > 80% of rated, feed rate override " +
      "< 50% (operator reducing speed due to chatter), and " +
      "unexpected program stop. This visibility enables remote " +
      "monitoring of unmanned machining operations.",
    category: "cam_strategy",
    tags: ["digital-twin", "mtconnect", "real-time", "monitoring", "data"],
    operation_types: ["general"],
    confidence: 84,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-192",
    title: "Digital Twin Machine Accuracy Mapping — Volumetric Error Model",
    body:
      "Map each CNC machine's volumetric accuracy using ball-bar or " +
      "laser interferometer tests. The digital twin stores the 21-" +
      "error model (6 per linear axis + 3 squareness): positioning " +
      "error, straightness (2 directions), roll, pitch, yaw for " +
      "each axis, plus XY, XZ, YZ squareness. When programming " +
      "critical parts in WorkNC, reference the accuracy map to " +
      "assign the most accurate machine. For features requiring " +
      "< 0.01mm accuracy, the accuracy map identifies which " +
      "workspace volume achieves this — some areas of the machine " +
      "envelope are 2-5× more accurate than others.",
    category: "cam_strategy",
    tags: ["digital-twin", "accuracy", "volumetric", "21-error", "ball-bar"],
    operation_types: ["general"],
    confidence: 83,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-193",
    title: "Digital Twin OEE Dashboard — Production Visibility from CAM Data",
    body:
      "Build an OEE (Overall Equipment Effectiveness) dashboard " +
      "combining WorkNC CAM data with machine monitoring: " +
      "Availability = actual running / planned running (target " +
      "> 90%), Performance = actual cycle time / WorkNC predicted " +
      "cycle time (target > 95%), Quality = first-pass accept / " +
      "total parts (target > 99%). OEE = A × P × Q. Typical mold " +
      "shop OEE is 40-55%; world-class is 85%+. The dashboard " +
      "identifies the dominant loss: low Availability → reduce " +
      "setup time, low Performance → optimize WorkNC programs, " +
      "low Quality → improve process control. Use WorkNC's cycle " +
      "time estimates as the Performance denominator for consistent " +
      "measurement across machines.",
    category: "cam_strategy",
    tags: ["digital-twin", "oee", "dashboard", "production", "visibility"],
    operation_types: ["general"],
    confidence: 85,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Additional Advanced Topics (wnc-194 to wnc-201) ===
  {
    id: "wnc-194",
    title: "WorkNC Batch Automation — Unattended Multi-Part Programming",
    body:
      "WorkNC supports batch automation: define a machining template " +
      "on a reference part, then apply it to a folder of similar " +
      "parts. The system processes each part sequentially: import " +
      "model → apply template → generate toolpaths → verify → " +
      "export G-code. For mold insert families (same shape, different " +
      "sizes), batch processing generates programs for 10-50 inserts " +
      "overnight. Review each output before sending to the machine — " +
      "templates handle 90% of parts correctly, but the remaining " +
      "10% may need manual adjustment for unusual geometry or " +
      "feature variations.",
    category: "cam_strategy",
    tags: ["batch", "automation", "template", "unattended", "productivity"],
    operation_types: ["general"],
    confidence: 88,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-195",
    title: "WorkNC Feature Recognition — Automatic Hole Pattern Detection",
    body:
      "WorkNC's feature recognition detects hole patterns (bolt " +
      "circles, grid patterns, through holes, blind holes, tapped " +
      "holes) from the 3D model and automatically assigns drilling " +
      "operations. The system identifies: hole diameter, depth, " +
      "tolerance (from PMI if available), and bottom shape (flat, " +
      "drill-point, through). Based on hole attributes, WorkNC " +
      "assigns the operation sequence: center drill → drill → " +
      "ream (for H7 holes), or center drill → drill → tap (for " +
      "threaded holes). Review the auto-assigned sequences before " +
      "posting — verify tap sizes and hole depth calculations.",
    category: "cam_strategy",
    tags: ["feature-recognition", "holes", "drilling", "automation"],
    operation_types: ["drilling"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-196",
    title: "WorkNC Toolpath Smoothing — G2/G3 Arc Fitting for Controller Compatibility",
    body:
      "WorkNC can fit arcs (G2/G3) to toolpath segments that " +
      "approximate circular motion. This reduces the G-code file " +
      "size by 50-80% compared to pure G1 (linear) interpolation " +
      "and improves surface finish because the controller processes " +
      "arcs more smoothly than dense linear segments. Enable arc " +
      "fitting with a tolerance of 0.001-0.005mm. Not all " +
      "controllers support arcs in all planes — verify the post " +
      "processor outputs arcs compatible with your controller. For " +
      "5-axis toolpaths, arcs are typically limited to 3-axis " +
      "segments with fixed rotary positions.",
    category: "cam_strategy",
    tags: ["smoothing", "arc-fitting", "g2-g3", "file-size", "controller"],
    operation_types: ["milling", "finishing"],
    confidence: 89,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-197",
    title: "WorkNC High-Speed Machining Mode — Constant Curvature Toolpaths",
    body:
      "WorkNC's HSM mode generates toolpaths with constant curvature " +
      "— no sharp corners that force the controller to decelerate. " +
      "The system replaces sharp corners with tangential arcs, adds " +
      "smooth entry/exit moves, and maintains minimum segment length " +
      "(typically 0.5-1mm) to prevent block starvation on the " +
      "controller. Enable HSM mode for all finishing operations on " +
      "machines with high-speed spindles (> 15,000 RPM). The " +
      "constant-curvature path may be 10-15% longer than the " +
      "shortest path, but the sustained high feed rate produces " +
      "shorter cycle times and better surface finish.",
    category: "cam_strategy",
    tags: ["hsm", "constant-curvature", "high-speed", "arcs", "finishing"],
    operation_types: ["finishing", "milling"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-198",
    title: "WorkNC Multi-Setup Management — Automatic Work Coordinate Transfer",
    body:
      "WorkNC manages multi-setup parts with automatic stock transfer " +
      "between setups. After completing Setup 1, the stock model " +
      "(with all machined features) transfers to Setup 2 with the " +
      "correct orientation. Work coordinate origins are defined per " +
      "setup, and the post processor outputs the appropriate G54-" +
      "G59 codes. For parts requiring 3+ setups, use WorkNC's " +
      "setup planning tool to determine the optimal setup sequence " +
      "that minimizes the number of setups while ensuring all " +
      "features are accessible. The transferred stock prevents " +
      "air cutting in subsequent setups.",
    category: "cam_strategy",
    tags: ["multi-setup", "stock-transfer", "wcs", "orientation", "planning"],
    operation_types: ["milling", "general"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-199",
    title: "WorkNC Probing Integration — On-Machine Verification",
    body:
      "WorkNC generates probing toolpaths for on-machine part " +
      "verification using Renishaw, Blum, or Heidenhain touch " +
      "probes. Program probing as operations in the machining " +
      "sequence: (1) probe stock before roughing (verify stock " +
      "dimensions), (2) probe after roughing (verify stock removal), " +
      "(3) probe critical features after finishing (verify " +
      "dimensions before unclamping). The probe results can update " +
      "tool offsets automatically for closed-loop machining. WorkNC's " +
      "post processor outputs brand-specific probe cycles (O9800 " +
      "series for Renishaw on Fanuc, CYCLE 600 for Siemens, " +
      "TOUCH PROBE for Heidenhain).",
    category: "cam_strategy",
    tags: ["probing", "verification", "renishaw", "closed-loop", "on-machine"],
    operation_types: ["probing"],
    confidence: 90,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-200",
    title: "WorkNC Post Processor Customization — Machine-Specific Output",
    body:
      "WorkNC's post processor engine is fully customizable for " +
      "each machine/controller combination. Key customizations: (1) " +
      "canned cycle format (G81-G89 parameters vary by controller), " +
      "(2) tool change sequence (some machines need M01 after each " +
      "change), (3) work offset format (G54-G59 vs G54.1 P1-P48), " +
      "(4) rotary axis output (TCPM/RTCP activation codes), (5) " +
      "program structure (main program + subprograms vs single " +
      "program). Test each post processor modification with a " +
      "simple test part before production use. Maintain a test " +
      "protocol document listing the verification steps for each " +
      "controller type.",
    category: "cam_strategy",
    tags: ["post-processor", "customization", "controller", "gcode", "format"],
    operation_types: ["general"],
    confidence: 91,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "wnc-201",
    title: "WorkNC Cloud Collaboration — Multi-Site Program Sharing",
    body:
      "WorkNC supports cloud-based collaboration for multi-site " +
      "manufacturing operations. Share CAM projects, tool libraries, " +
      "machining templates, and post processors through cloud " +
      "storage with version control. Benefits: (1) a program " +
      "developed at site A can be immediately run at site B using " +
      "the shared post processor, (2) tool library updates " +
      "propagate to all sites simultaneously, (3) best-practice " +
      "templates developed by experienced programmers are available " +
      "to all sites. Ensure network security: use VPN or encrypted " +
      "connections, and implement access controls per user role " +
      "(viewer, programmer, administrator).",
    category: "cam_strategy",
    tags: ["cloud", "collaboration", "multi-site", "sharing", "templates"],
    operation_types: ["general"],
    confidence: 87,
    source: "web:worknc-docs",
    created_at: "2026-03-13",
    usage_count: 0
  }
];
