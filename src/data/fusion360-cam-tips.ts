/**
 * Fusion 360 CAM Tribal Knowledge Tips
 * 39 expert-level tips covering Fusion 360 Manufacturing workspace
 * Generated 2026-03-07
 */

export const FUSION360_CAM_TIPS = [
  // === Adaptive Clearing (f360-001 to f360-006) ===
  {
    id: "f360-001",
    title: "Adaptive Clearing Optimal Load Controls Tool Engagement",
    body: "In 3D Adaptive Clearing, the Optimal Load parameter is effectively your stepover — it controls the maximum tool engagement angle. Set it to 25-40% of tool diameter for most materials. Fusion maintains constant chip load by dynamically adjusting the toolpath, so you can run 2-3x deeper axial depths than conventional pocketing without overloading the cutter.",
    category: "cam_strategy",
    tags: ["adaptive-clearing", "roughing", "optimal-load", "tool-engagement"],
    operation_types: ["3d_adaptive", "2d_adaptive"],
    confidence: 88,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-002",
    title: "Use 2D Adaptive for Z-Level Finishing Passes",
    body: "Enable the Multiple Depths option in the Passes tab of 2D Adaptive Clearing to perform finishing passes in the Z direction. This lets you leverage Adaptive's constant-engagement logic for semi-finishing walls, combining efficient roughing with decent wall finish in a single operation instead of requiring a separate contour pass.",
    category: "cam_strategy",
    tags: ["adaptive-clearing", "2d-adaptive", "multiple-depths", "finishing"],
    operation_types: ["2d_adaptive"],
    confidence: 85,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-003",
    title: "Adaptive Clearing Smoothing Reduces Air Cutting",
    body: "Enable Smoothing in Adaptive Clearing to reduce unnecessary Z-axis retracts between passes. This keeps the tool closer to the stock and eliminates rapid up-down-up motions that waste cycle time. On deep pockets this alone can cut 10-20% off machining time by minimizing non-cutting travel.",
    category: "cam_strategy",
    tags: ["adaptive-clearing", "smoothing", "cycle-time", "optimization"],
    operation_types: ["3d_adaptive", "2d_adaptive"],
    confidence: 85,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-004",
    title: "Helical and Ramp Entry for Adaptive Roughing",
    body: "Always prefer Helical or Ramp entry over Plunge in Adaptive Clearing. Helical entries distribute cutting forces radially and prevent shock loading on the tool tip. Set the helical ramp diameter to 80-110% of tool diameter and ramp angle to 2-5 degrees for carbide end mills. This dramatically extends tool life in hardened steels and stainless.",
    category: "cam_strategy",
    tags: ["adaptive-clearing", "helical-entry", "ramp", "tool-life"],
    operation_types: ["3d_adaptive", "2d_adaptive"],
    confidence: 87,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-005",
    title: "Adaptive Clearing Stock-to-Leave for Clean Finishing",
    body: "Leave 0.2-0.5mm radial and 0.1-0.3mm axial stock-to-leave on Adaptive Clearing roughing passes. This ensures your finishing toolpath has consistent material to remove, producing even cutting pressure and better surface finish. Inconsistent leftover stock from roughing is the number one cause of chatter marks on finish passes.",
    category: "cam_strategy",
    tags: ["adaptive-clearing", "stock-to-leave", "roughing", "surface-finish"],
    operation_types: ["3d_adaptive", "2d_adaptive"],
    confidence: 88,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-006",
    title: "Rest Machining with Smaller Tool After Adaptive",
    body: "After Adaptive Clearing with a large end mill, use a second Adaptive pass with a smaller tool and check Rest Machining in the Geometry tab. Set the tool reference to the previous operation so Fusion only generates toolpath where the larger tool could not reach — internal corners, narrow slots, and fillet radii. This avoids redundant cutting over already-cleared areas.",
    category: "cam_strategy",
    tags: ["adaptive-clearing", "rest-machining", "tool-change", "efficiency"],
    operation_types: ["3d_adaptive", "2d_adaptive"],
    confidence: 86,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Steep & Shallow, Morphed Spiral, Flow (f360-007 to f360-011) ===
  {
    id: "f360-007",
    title: "Steep and Shallow Combines Two Strategies Automatically",
    body: "Steep and Shallow finishing creates a single toolpath that intelligently combines Contour passes for steep walls with Parallel or Scallop passes for shallow regions. Set the threshold angle (typically 45-60 degrees) to control where Fusion transitions between strategies. This eliminates the need to manually split finishing into separate contour and parallel operations.",
    category: "cam_strategy",
    tags: ["steep-and-shallow", "finishing", "contour", "scallop", "manufacturing-extension"],
    operation_types: ["steep_and_shallow"],
    confidence: 87,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-008",
    title: "Steep and Shallow Continuous Spiral Eliminates Step Marks",
    body: "Enable the Continuous option in Steep and Shallow to replace closed contour loops with a continuous spiral-style toolpath. This eliminates step marks between consecutive Z-level passes, minimizes tool lifts, and reduces cycle time. The result is noticeably better surface finish on mold and die surfaces where witness lines are unacceptable.",
    category: "cam_strategy",
    tags: ["steep-and-shallow", "continuous-spiral", "surface-finish", "mold"],
    operation_types: ["steep_and_shallow"],
    confidence: 85,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-009",
    title: "Morphed Spiral for Organic Freeform Surfaces",
    body: "Morphed Spiral generates toolpaths that reproduce the shape of your machining boundary in a smooth spiral pattern, avoiding the sharp directional changes typical of Scallop or Parallel strategies. Use it on organic, freeform shapes like impeller blades or sculpted surfaces where tool direction consistency matters. The resulting surface finish is superior because the cutter maintains consistent engagement direction.",
    category: "cam_strategy",
    tags: ["morphed-spiral", "freeform", "surface-finish", "organic-shapes"],
    operation_types: ["morphed_spiral"],
    confidence: 86,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-010",
    title: "Steep First vs Top First Machining Priority",
    body: "In Steep and Shallow, choose machining priority carefully: Top First machines upper shallow regions before steep walls (good for preventing chip re-cutting on horizontal faces), while Steep First machines walls before flats (better when wall accuracy matters most, like on injection mold shut-off surfaces). Default to Steep First for mold work to protect critical parting-line surfaces.",
    category: "cam_strategy",
    tags: ["steep-and-shallow", "machining-priority", "mold", "strategy-selection"],
    operation_types: ["steep_and_shallow"],
    confidence: 82,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-011",
    title: "Flow Strategy for Multi-Axis Surface Following",
    body: "Multi-Axis Flow is the 5-axis counterpart to Morphed Spiral — it follows the natural flow lines of complex surfaces while tilting the tool to maintain optimal contact angle. Use it on blade surfaces, turbine vanes, and deep-cavity mold cores where 3-axis strategies would require excessively long tools. Requires the Manufacturing Extension.",
    category: "cam_strategy",
    tags: ["flow", "multi-axis", "5-axis", "surface-following", "manufacturing-extension"],
    operation_types: ["multi_axis_flow"],
    confidence: 83,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Multiaxis 3+2 and Simultaneous 5-Axis (f360-012 to f360-016) ===
  {
    id: "f360-012",
    title: "Prefer 3+2 Over Simultaneous 5-Axis When Possible",
    body: "Use 3+2 positional machining instead of simultaneous 5-axis whenever the geometry allows. Simultaneous 5-axis movement increases the likelihood of surface imperfections — witness lines, dig-ins, and force variations — because all axes move at once. 3+2 locks the rotary axes and runs a standard 3-axis program at an angle, giving better surface finish and tighter tolerances.",
    category: "cam_strategy",
    tags: ["3+2", "5-axis", "positional", "surface-quality"],
    operation_types: ["multiaxis_3plus2"],
    confidence: 88,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-013",
    title: "3+2 Positioning Reduces Setup Count",
    body: "Use 3+2 machining to access undercuts, angled pockets, and hard-to-reach features without refixturing. Since the part stays fixtured in the machine throughout, you maintain datum accuracy across all features. This is far more reliable than removing, flipping, and re-indicating the part for each orientation — especially on tight-tolerance aerospace brackets.",
    category: "setup",
    tags: ["3+2", "fixturing", "setup-reduction", "datum-accuracy"],
    operation_types: ["multiaxis_3plus2"],
    confidence: 87,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-014",
    title: "Accessibility Shading for 3+2 Tool Axis Planning",
    body: "Use Fusion's Accessibility Shading feature before programming 3+2 operations. It color-maps your part to show which surfaces are reachable at each tool orientation, revealing blind spots and collision risks. This lets you plan the minimum number of orientations needed to machine all features — critical for reducing cycle time and avoiding unnecessary indexing.",
    category: "cam_strategy",
    tags: ["accessibility-shading", "3+2", "tool-axis", "collision-avoidance"],
    operation_types: ["multiaxis_3plus2"],
    confidence: 84,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-015",
    title: "Swarf Cutting for Ruled Surfaces",
    body: "Use the Swarf toolpath (Manufacturing Extension) for machining ruled surfaces like draft walls on molds and tapered extrusion features. Swarf cutting uses the side of the tool along the full flute length, producing excellent surface finish in a single pass. Ensure the surface is truly ruled (can be swept by a straight line) — non-ruled surfaces will cause gouging.",
    category: "cam_strategy",
    tags: ["swarf", "5-axis", "ruled-surface", "mold", "manufacturing-extension"],
    operation_types: ["swarf"],
    confidence: 85,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-016",
    title: "Multi-Axis Contour for Complex Edge Trimming",
    body: "Multi-Axis Contour follows a curve or edge while the tool tilts to maintain a specified lead/lag and side-tilt angle. Use it for deburring, edge breaking, or trimming composite parts where the tool must stay normal (or at a fixed angle) to the surface edge. Set collision checking against the part model to prevent holder interference on deep features.",
    category: "cam_strategy",
    tags: ["multi-axis-contour", "5-axis", "edge-trimming", "deburring"],
    operation_types: ["multi_axis_contour"],
    confidence: 83,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Post Processor Customization (f360-017 to f360-021) ===
  {
    id: "f360-017",
    title: "Cloud Post Library for Machine-Specific Posts",
    body: "Access the Autodesk Post Library from the Manage menu in the Manufacture workspace. It contains hundreds of free, machine-specific post processors maintained by Autodesk. Install posts to your Personal Cloud library so they sync across all your devices and team members. Always start from the closest matching post rather than writing one from scratch.",
    category: "post_processor",
    tags: ["post-library", "cloud-posts", "setup", "g-code"],
    operation_types: ["post_processing"],
    confidence: 88,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-018",
    title: "VS Code Extension for Post Processor Editing",
    body: "Install the Fusion 360 Post Processor Extension for Visual Studio Code to edit post processor files (.cps). It provides syntax highlighting, function navigation, and the ability to identify specific NC output sections quickly. Posts are written in JavaScript — focus on the onSection(), onLinear(), onCircular(), and onCommand() functions to customize tool change sequences, coolant codes, and axis output.",
    category: "post_processor",
    tags: ["vs-code", "post-editing", "javascript", "customization"],
    operation_types: ["post_processing"],
    confidence: 86,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-019",
    title: "Local vs Cloud Post Storage for Shop Consistency",
    body: "Store your customized post processors in the Local library on a shared network drive so all programmers use the same version. Cloud posts auto-update from Autodesk, which can break your customizations without warning. After customizing a post, save it locally and version-control it with Git. Only pull updates from the cloud library to a test location first.",
    category: "post_processor",
    tags: ["post-library", "version-control", "local-posts", "shop-standard"],
    operation_types: ["post_processing"],
    confidence: 84,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-020",
    title: "Post Processor Property Overrides per Operation",
    body: "Many Fusion post processors expose properties (like useRadius, safeRetractDistance, useFilesForSubprograms) that can be toggled in the Post Process dialog without editing code. Check the Properties section when posting — you may find your machine-specific need (like outputting radius arcs vs IJK, or enabling subprogram calls) is already built in as a togglable property.",
    category: "post_processor",
    tags: ["post-properties", "g-code", "arc-output", "subprograms"],
    operation_types: ["post_processing"],
    confidence: 83,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-021",
    title: "Test Post Output Against Controller Before First Cut",
    body: "After setting up a new or customized post processor, always dry-run the G-code output through your controller's verify/check mode or a backplotter before cutting metal. Pay special attention to tool change sequences (M6 formatting), coolant codes (M8/M9 placement), work offset calls (G54-G59), and safe retract heights. One wrong line in the post can crash a machine.",
    category: "post_processor",
    tags: ["post-verification", "safety", "dry-run", "g-code"],
    operation_types: ["post_processing"],
    confidence: 90,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Simulation and Verification (f360-022 to f360-025) ===
  {
    id: "f360-022",
    title: "GPU-Accelerated Stock Simulation for Fast Verification",
    body: "Fusion's GPU-based stock simulation (introduced 2025) moves material removal calculations to the graphics card, completing simulations in seconds instead of minutes. Use Stock simulation mode to verify material removal visually — it shows remaining stock as a 3D model you can rotate and inspect. Always run this after generating toolpaths and before posting to catch gouges and missed material.",
    category: "cam_strategy",
    tags: ["simulation", "stock-simulation", "gpu", "verification"],
    operation_types: ["simulation"],
    confidence: 85,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-023",
    title: "Stop on Collision for Real-Time Simulation Debugging",
    body: "Toggle the Stop on Collision feature in toolpath simulation to halt playback the instant a collision is detected between the tool, holder, or shaft and the stock, fixtures, or part. Red segments on the simulation timeline indicate collision zones — hover over them to jump directly to the problem. Fix the issue by adjusting retract heights, tilting the tool axis, or using a shorter holder assembly.",
    category: "safety",
    tags: ["collision-detection", "simulation", "holder-clearance", "safety"],
    operation_types: ["simulation"],
    confidence: 87,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-024",
    title: "Machine Simulation with Full Kinematic Model",
    body: "Use Machine Simulation (not just toolpath simulation) to check the entire machine envelope including spindle head, table, column, and rotary axes against your setup. This catches collisions that basic toolpath simulation misses — like the spindle housing hitting a tall vise jaw or the table hitting a travel limit during a 3+2 index. Define your machine model in the Machine Library for accurate results.",
    category: "safety",
    tags: ["machine-simulation", "kinematics", "collision-detection", "travel-limits"],
    operation_types: ["simulation"],
    confidence: 84,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-025",
    title: "Simulation Timeline for Cycle Time Estimation",
    body: "The simulation timeline shows cumulative machining time per operation. Use it to identify which operations consume the most cycle time, then optimize those first — adjust stepover, increase feed rate, or switch to Adaptive Clearing. Compare simulated cycle times against actual run times to calibrate your feed rate overrides and rapid traverse assumptions for future estimates.",
    category: "cam_strategy",
    tags: ["simulation", "cycle-time", "optimization", "timeline"],
    operation_types: ["simulation"],
    confidence: 82,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Turning and Mill-Turn (f360-026 to f360-029) ===
  {
    id: "f360-026",
    title: "Turning Trace Strategy Follows True Part Contour",
    body: "The Turning Trace strategy (added 2025) lets the tool follow the actual CAD contour of your part profile rather than generating offset passes. Use it for finishing turned profiles where the part shape has complex curves — the tool traces the exact model boundary, producing superior surface finish with fewer passes compared to traditional turning profile operations.",
    category: "cam_strategy",
    tags: ["turning", "trace", "finishing", "contour-following"],
    operation_types: ["turning_profile"],
    confidence: 83,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-027",
    title: "Live Tooling Setup for Milling on Lathes",
    body: "To program live tooling (milling on a CNC lathe), create a Turning Setup and add milling operations within it. Fusion handles the coordinate system transformation from XZ lathe space. Ensure your post processor supports live tool codes — common issues include M-codes for spindle on/off for live tools (often M13/M14 or M133/M134) not matching your controller. Always verify the first program at reduced feed.",
    category: "setup",
    tags: ["live-tooling", "mill-turn", "lathe", "coordinate-system"],
    operation_types: ["mill_turn"],
    confidence: 84,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-028",
    title: "XZC Polar Mode for Off-Center Mill-Turn Features",
    body: "Use XZC polar interpolation mode in Fusion for milling off-center features on a turning center without a Y-axis. The C-axis (spindle rotation) substitutes for Y-axis motion, allowing you to mill flats, keyways, and pockets on turned parts. Set the Wrapping option in the operation to enable polar output. This requires controller support for G12.1 or equivalent polar interpolation mode.",
    category: "cam_strategy",
    tags: ["mill-turn", "xzc", "polar-interpolation", "c-axis"],
    operation_types: ["mill_turn"],
    confidence: 82,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-029",
    title: "Threading with Standard Definition Mode",
    body: "Use the Standard Definition mode for thread turning to simplify thread programming. Instead of manually calculating pitch diameters and minor diameters, select from standard thread definitions (M, UNC, UNF, NPT, etc.) and Fusion calculates the correct parameters automatically. Always verify thread profile with a thread gauge on the first part — post processor rounding can cause pitch diameter drift.",
    category: "cam_strategy",
    tags: ["turning", "threading", "standard-definition", "thread-gauge"],
    operation_types: ["turning_thread"],
    confidence: 84,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Manufacturing Extension Features (f360-030 to f360-033) ===
  {
    id: "f360-030",
    title: "Manufacturing Extension Unlocks Advanced Strategies",
    body: "The Fusion Manufacturing Extension adds Steep and Shallow finishing, Swarf cutting, Multi-Axis Contour, Multi-Axis Flow, 4-axis Rotary, Surface Inspection, Part Alignment, and Geometry Probing. If you machine complex 3D parts or run 4/5-axis machines, the extension pays for itself by eliminating the need to manually split operations and reducing programming time for freeform surfaces.",
    category: "cam_strategy",
    tags: ["manufacturing-extension", "5-axis", "steep-and-shallow", "swarf"],
    operation_types: ["general"],
    confidence: 86,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-031",
    title: "Automatic Hole Recognition and Template Matching",
    body: "Use the Hole Recognition feature to automatically detect holes in your model and match them to machining templates. The Hole Template Editor (enhanced 2025) lets you build precise hole signatures using cylinder, cone, and torus segments, and match by color, thread data, or PMI annotations. This automates drilling, tapping, reaming, and boring sequences — saving significant programming time on hole-heavy parts.",
    category: "automation",
    tags: ["hole-recognition", "templates", "drilling", "automation"],
    operation_types: ["drilling", "tapping", "boring"],
    confidence: 85,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-032",
    title: "Machine Over Holes/Pockets for Clean 3D Surfaces",
    body: "Enable Machine Over Holes/Pockets on 3D finishing toolpaths to cap holes and pockets in avoid-surfaces automatically. This prevents the finishing cutter from dropping into holes or following pocket walls, producing a continuous surface finish. Essential for mold parting surfaces where bolt holes must be machined over during final finishing passes.",
    category: "cam_strategy",
    tags: ["machine-over-holes", "finishing", "mold", "surface-capping"],
    operation_types: ["3d_finishing"],
    confidence: 84,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-033",
    title: "Multi-Axis Drilling with Rotary Axis Control",
    body: "Multi-axis drilling (added late 2025) lets you define a rotary axis for drilling operations, enabling drilling at compound angles on 4- and 5-axis machines without manual WCS rotation. This eliminates the need for separate setups or 3+2 indexing just to drill angled holes — program them directly in the main setup with automatic axis positioning.",
    category: "cam_strategy",
    tags: ["multi-axis-drilling", "rotary", "angled-holes", "automation"],
    operation_types: ["drilling"],
    confidence: 82,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Setup Sheets, Tool Libraries, Templates (f360-034 to f360-036) ===
  {
    id: "f360-034",
    title: "Manufacturing Templates Save Programming Time",
    body: "Create Manufacturing Templates to store toolpath settings for common operations — material-specific feeds/speeds, stepover/stepdown, entry methods, and stock-to-leave values. When deploying a template, Fusion auto-matches tools from your document library by diameter, flute length, and holder properties. Build a template library organized by material type and operation class (roughing, finishing, drilling) for one-click programming.",
    category: "automation",
    tags: ["templates", "standardization", "feeds-speeds", "productivity"],
    operation_types: ["general"],
    confidence: 87,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-035",
    title: "Tool Library Organization with Holders and Assemblies",
    body: "Organize your Fusion tool library with complete tool assemblies — cutter, holder, and stickout modeled accurately. Create separate libraries for each machine (tools that physically live in the carousel) with holder geometry included. Accurate holder models are critical for collision detection in simulation. Export libraries as JSON for backup and sharing across team members.",
    category: "tooling",
    tags: ["tool-library", "holders", "assemblies", "collision-detection"],
    operation_types: ["general"],
    confidence: 86,
    source: "web:autodesk-community",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-036",
    title: "Setup Sheets for Shop Floor Communication",
    body: "Generate Setup Sheets from the Actions menu in the Manufacture workspace to create printable documents showing tool lists, WCS origins, stock dimensions, and operation sequences. Customize the setup sheet template to include your shop-specific information like fixture callouts and inspection notes. For quick reference, export the tool list as CSV and print it as a laminated tool card for the machine operator.",
    category: "setup",
    tags: ["setup-sheets", "documentation", "shop-floor", "tool-list"],
    operation_types: ["general"],
    confidence: 85,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Probing and In-Process Inspection (f360-037 to f360-038) ===
  {
    id: "f360-037",
    title: "Probe Geometry for Tool Wear Compensation",
    body: "Use Probe Geometry (Manufacturing Extension) to measure critical features like bores and faces between machining operations. When a feature drifts out of tolerance due to tool wear, the probing cycle quantifies the deviation and applies automatic tool wear compensation. This lets you maximize tool life while maintaining accuracy — essential for unattended or lights-out machining of precision parts.",
    category: "quality",
    tags: ["probing", "tool-wear", "compensation", "inspection", "manufacturing-extension"],
    operation_types: ["probing"],
    confidence: 85,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "f360-038",
    title: "Surface Inspection Validates Freeform Geometry on Machine",
    body: "Surface Inspection (Manufacturing Extension) probes complex freeform surfaces directly against the CAD model while the part is still fixtured. This catches form errors before the part leaves the machine — far cheaper than discovering issues at CMM. Program the probe cycle after finishing passes and output it in the same NC program as the machining operations for a seamless workflow.",
    category: "quality",
    tags: ["surface-inspection", "probing", "freeform", "quality-control", "manufacturing-extension"],
    operation_types: ["probing"],
    confidence: 84,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  },

  // === Machining Strategies for Specific Geometries (f360-039 to f360-039) ===
  {
    id: "f360-039",
    title: "Bore Toolpath for Efficient Hole Enlargement",
    body: "Use the Bore toolpath instead of Pocket for circular holes larger than 0.75 inch diameter. Bore uses a helical plunge-and-spiral motion that keeps the tool constantly engaged without overloading, allowing holes up to 2x the end mill diameter. It is faster than pocketing, produces better surface finish, and improves chip evacuation because chips fall naturally out of the helical cut. Follow with a 2D Contour spring pass for H7 tolerance bores.",
    category: "cam_strategy",
    tags: ["bore", "hole-machining", "helical", "chip-evacuation", "tolerance"],
    operation_types: ["bore", "2d_contour"],
    confidence: 86,
    source: "web:fusion360-docs",
    created_at: "2026-03-07",
    usage_count: 0
  }
];
