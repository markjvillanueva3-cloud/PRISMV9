/**
 * Edgecam (Hexagon) CAM Tribal Knowledge Tips
 * 221 expert-level tips covering Edgecam CAM system
 * Generated 2026-03-13
 */
import type { KnowledgeTip } from "../engines/TribalKnowledgeEngine";

export const EDGECAM_CAM_TIPS: KnowledgeTip[] = [
  // === Waveform Roughing (ec-001 to ec-010) ===
  {
    id: "ec-001",
    title: "Waveform Roughing Maintains Constant Tool Engagement",
    body: "Edgecam Waveform Roughing varies the stepover distance between passes " +
      "to maintain a constant width of cut, eliminating engagement spikes that " +
      "cause tool breakage. Unlike constant-stepover roughing where corners " +
      "produce sudden load increases, Waveform ensures the tool never exceeds " +
      "the programmed maximum engagement. This enables full flute-depth axial " +
      "cuts with 2-3x higher feed rates, reducing cycle times by 40-60% while " +
      "extending tool life by 3-5x.",
    category: "cam_strategy",
    tags: ["waveform", "roughing", "constant-engagement", "tool-life"],
    operation_types: ["roughing", "pocketing"],
    confidence: 92,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-002",
    title: "Waveform Trochoidal Mode for Narrow Slots",
    body: "When slot width is less than 2x tool diameter, Waveform automatically " +
      "switches to trochoidal arcing to avoid full-width engagement. The tool " +
      "follows circular arcs that maintain the target radial engagement " +
      "(typically 8-15% of cutter diameter). Set the trochoidal stepover to " +
      "match your target engagement and increase axial depth to full flute " +
      "length for maximum MRR. This approach is 2-3x faster than conventional " +
      "slotting with reduced tool wear.",
    category: "cam_strategy",
    tags: ["waveform", "trochoidal", "slotting", "engagement"],
    operation_types: ["slotting", "roughing"],
    confidence: 90,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-003",
    title: "Waveform Chip Thinning Automatically Increases Feed",
    body: "Waveform automatically applies chip thinning compensation when " +
      "radial engagement drops below 50% of tool diameter. At low radial " +
      "engagement, the actual chip is thinner than the programmed " +
      "feed-per-tooth, so Edgecam increases the feed rate to maintain " +
      "the target chip thickness. At 10% engagement, feed can be 2.5-3x " +
      "the nominal rate. This prevents rubbing (which causes heat and " +
      "premature wear) and maintains productive cutting at all times.",
    category: "speeds_feeds",
    tags: ["waveform", "chip-thinning", "feed-rate", "engagement"],
    operation_types: ["roughing"],
    confidence: 91,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-004",
    title: "Waveform Corner Strategies Prevent Load Spikes",
    body: "In internal corners where conventional toolpaths cause full-width " +
      "engagement, Waveform generates arc transitions that progressively " +
      "increase the tool's engagement rather than slamming into a full " +
      "cut. Configure the corner slowdown (typically 60-80% of programmed " +
      "feed) and minimum corner radius (1.2-1.5x tool radius). For " +
      "hardened steels or superalloys, enable secondary corner cleanup " +
      "passes to remove the slightly larger corner radii left by the " +
      "arc transitions.",
    category: "cam_strategy",
    tags: ["waveform", "corners", "engagement", "arc-transitions"],
    operation_types: ["roughing", "pocketing"],
    confidence: 89,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-005",
    title: "Waveform Multi-Level with Progressive Depth Control",
    body: "For deep pockets, Waveform supports variable axial step-downs " +
      "per Z-level. Use aggressive depths (1.5-2x diameter) in upper " +
      "levels with good chip evacuation and reduce to 0.5-1x diameter " +
      "near the pocket floor. Enable progressive depth to automatically " +
      "taper the step-down based on pocket aspect ratio. Combine with " +
      "helical entry at each new level to avoid plunging — helical " +
      "diameter should be 80-110% of tool diameter with 2-4 degree " +
      "ramp angle.",
    category: "cam_strategy",
    tags: ["waveform", "multi-level", "deep-pocket", "step-down"],
    operation_types: ["roughing", "pocketing"],
    confidence: 88,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-006",
    title: "Rest Machining from Waveform with Smaller Cutter",
    body: "After Waveform roughing, use rest machining with a smaller " +
      "cutter (40-60% of the roughing tool) to clean corners and " +
      "fillets that the larger tool couldn't reach. Edgecam references " +
      "the in-process stock model from Waveform to target only remaining " +
      "material. Enable minimum material threshold to skip areas with " +
      "less than 0.3mm stock remaining — this eliminates air cutting " +
      "that wastes 15-30% of cycle time in complex geometries.",
    category: "cam_strategy",
    tags: ["waveform", "rest-machining", "stock-model", "cleanup"],
    operation_types: ["rest_machining", "semi_finishing"],
    confidence: 89,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-007",
    title: "Waveform Adaptive Step for Varying Geometry",
    body: "Waveform's adaptive step feature adjusts the radial stepover " +
      "continuously based on local geometry. In open areas the stepover " +
      "increases toward the maximum, while near walls and islands it " +
      "decreases to maintain constant engagement. This is more efficient " +
      "than fixed stepover where some passes are at full engagement and " +
      "others are mostly air cutting. Adaptive step typically reduces " +
      "roughing time by 10-20% compared to fixed-stepover Waveform.",
    category: "cam_strategy",
    tags: ["waveform", "adaptive-step", "stepover", "efficiency"],
    operation_types: ["roughing"],
    confidence: 88,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-008",
    title: "Waveform Feed Optimization with Machine Dynamics",
    body: "Enable Edgecam's feed optimization to adjust Waveform feed " +
      "rates based on machine acceleration limits. In tight corners " +
      "where the machine must decelerate, the optimizer reduces the " +
      "commanded feed to match the machine's actual achievable rate. " +
      "This prevents the machine from falling behind the program, " +
      "which causes uneven chip loads and chatter marks. Set the " +
      "machine's maximum axis acceleration in the machine setup dialog " +
      "for accurate optimization.",
    category: "speeds_feeds",
    tags: ["waveform", "feed-optimization", "acceleration", "dynamics"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-009",
    title: "Waveform 2025 Calculation Speed 30% Faster",
    body: "Edgecam 2025's Waveform Roughing toolpath generation is 30% " +
      "faster than previous versions for both solid and wireframe " +
      "components. This improvement is especially noticeable on complex " +
      "multi-pocket parts where Waveform previously took 5-10 minutes " +
      "to calculate. The improved algorithm also produces cleaner " +
      "linking moves between passes, reducing non-cutting travel. " +
      "Upgrade to the latest version if Waveform calculation time is " +
      "a bottleneck in your programming workflow.",
    category: "cam_strategy",
    tags: ["waveform", "2025", "performance", "calculation-speed"],
    operation_types: ["roughing"],
    confidence: 90,
    source: "web:edgecam-2025-release",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-010",
    title: "Waveform vs Conventional Roughing Decision Matrix",
    body: "Use Waveform for: deep pockets (>1x tool diameter), complex " +
      "shapes with islands and corners, hard materials (>35 HRC), " +
      "and when tool life is critical. Use conventional roughing for: " +
      "simple open faces, shallow pockets (<0.5x diameter depth), " +
      "soft materials with no engagement concerns, and when programming " +
      "time must be minimized. Waveform adds 20-30% more G-code " +
      "points than conventional, so ensure your controller has " +
      "adequate block processing speed (>1000 blocks/sec).",
    category: "cam_strategy",
    tags: ["waveform", "conventional", "decision", "comparison"],
    operation_types: ["roughing"],
    confidence: 88,
    source: "web:edgecam-waveform",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Milling (ec-011 to ec-025) ===
  {
    id: "ec-011",
    title: "Profiling with Lead-In/Lead-Out Arcs",
    body: "Always use tangential arc lead-in and lead-out for Edgecam " +
      "profiling operations to prevent witness marks at the entry/exit " +
      "point. Set arc radius to 50-100% of the tool radius and approach " +
      "tangentially to the profile contour. For critical surfaces, place " +
      "the lead on a non-functional face or corner. Enable overlap " +
      "(1-2mm past the start point) to ensure the profile closes " +
      "completely without a visible seam.",
    category: "cam_strategy",
    tags: ["profiling", "lead-in", "lead-out", "witness-marks"],
    operation_types: ["2d_profiling"],
    confidence: 89,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-012",
    title: "Pocketing with Island Detection and Offset Strategy",
    body: "Edgecam's pocketing automatically detects islands (bosses) " +
      "within pocket boundaries. Use offset (outward spiral) pattern " +
      "for general pocketing and raster pattern for simple rectangular " +
      "pockets. Set the finishing pass allowance to 0.1-0.3mm and " +
      "enable a separate finishing pass at full pocket depth. For " +
      "pockets with multiple islands, verify the tool can fit between " +
      "islands — Edgecam flags areas narrower than the tool diameter.",
    category: "cam_strategy",
    tags: ["pocketing", "islands", "offset-pattern", "finishing-allowance"],
    operation_types: ["pocketing"],
    confidence: 88,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-013",
    title: "Face Milling with Optimized Cutter Overlap",
    body: "For face milling in Edgecam, set the cutter overlap to " +
      "65-75% of the face mill diameter for roughing (maximizing MRR) " +
      "and 80-90% for finishing (minimizing scallop height). Position " +
      "the tool so it overhangs the workpiece edge by 10-20% of the " +
      "cutter diameter for clean edge breaks. Use climb milling " +
      "direction and enable roll-on/roll-off arcs at pass boundaries " +
      "to prevent sudden load changes.",
    category: "cam_strategy",
    tags: ["facing", "overlap", "face-mill", "climb-milling"],
    operation_types: ["facing"],
    confidence: 88,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-014",
    title: "Slot Milling with Helical Entry and Chip Evacuation",
    body: "For slot milling in Edgecam, use helical ramping entry rather " +
      "than plunging to avoid shock loading. Set the helical diameter " +
      "to 80-100% of the slot width and ramp angle to 2-5 degrees. " +
      "For deep slots (>1x tool diameter), program pecking depths of " +
      "0.5-1x diameter per pass with full retract between pecks for " +
      "chip evacuation. Use a 3-flute cutter for better chip clearance " +
      "in enclosed slots.",
    category: "cam_strategy",
    tags: ["slotting", "helical-entry", "chip-evacuation", "ramping"],
    operation_types: ["slotting"],
    confidence: 87,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-015",
    title: "Thread Milling for Large or Non-Standard Threads",
    body: "Edgecam's thread milling cycle generates helical toolpaths " +
      "for internal and external threads. Use thread milling instead " +
      "of tapping for: threads larger than M16, non-standard pitches, " +
      "blind holes where tap depth is limited, or hardened materials " +
      "where taps break. Program a single-point thread mill for " +
      "maximum flexibility or multi-tooth for productivity. Set the " +
      "helical interpolation to climb milling and verify your " +
      "controller supports G2/G3 with simultaneous Z motion.",
    category: "cam_strategy",
    tags: ["thread-milling", "helical", "large-threads", "climb"],
    operation_types: ["thread_milling"],
    confidence: 88,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-016",
    title: "Chamfer and Edge Break with Controlled Depth",
    body: "Program chamfering in Edgecam using a chamfer mill or ball " +
      "end mill with controlled Z-depth. Set the chamfer width by " +
      "controlling the tool's Z position relative to the edge — " +
      "for a 45-degree chamfer mill, Z-depth equals chamfer width. " +
      "Use 3D edge detection to automatically identify all edges " +
      "requiring chamfering. For non-uniform chamfers, use the 3D " +
      "profiling cycle with the tool tilted to the chamfer angle.",
    category: "cam_strategy",
    tags: ["chamfer", "edge-break", "deburring", "z-depth"],
    operation_types: ["chamfering"],
    confidence: 86,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-017",
    title: "Engraving with V-Cutter Depth Control",
    body: "For text and logo engraving in Edgecam, use a V-cutter " +
      "(typically 30, 60, or 90 degree) with precise Z-depth control. " +
      "The line width is determined by the V-angle and depth: for a " +
      "90-degree cutter, line width equals 2x depth. Set feed rate to " +
      "50-70% of normal milling feed to prevent tool deflection on " +
      "small features. Enable smoothing for curved lettering to avoid " +
      "faceted corners. For filled fonts, use a pocket cycle within " +
      "each character boundary.",
    category: "cam_strategy",
    tags: ["engraving", "v-cutter", "text", "depth-control"],
    operation_types: ["engraving"],
    confidence: 85,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-018",
    title: "3D Rough Machining with Z-Level Strategy",
    body: "Edgecam's 3D roughing uses Z-level (waterline) slicing to " +
      "progressively remove material in horizontal layers. Set the " +
      "step-down based on the target stock allowance and tool " +
      "capability: 0.5-2mm for finishing stock, 2-5mm for semi-finish " +
      "stock. Enable adaptive step-down to use finer increments in " +
      "steep regions. Use a bull-nose cutter instead of ball-nose for " +
      "roughing — the flat bottom removes more material per pass with " +
      "better floor finish.",
    category: "cam_strategy",
    tags: ["3d-roughing", "z-level", "step-down", "bull-nose"],
    operation_types: ["3d_roughing"],
    confidence: 88,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-019",
    title: "3D Finish with Raster and Scallop Control",
    body: "For 3D finishing in Edgecam, choose between raster (parallel " +
      "lines) and scallop (constant cusp height) strategies based on " +
      "surface geometry. Raster is faster for gently curved surfaces; " +
      "scallop produces more uniform finish on varying curvature. Set " +
      "the target scallop height: 0.005-0.01mm for semi-finish, " +
      "0.001-0.003mm for final finish. Use a ball-nose cutter and " +
      "enable bi-directional cutting for roughing passes, " +
      "uni-directional climb for finishing.",
    category: "surface_finish",
    tags: ["3d-finishing", "raster", "scallop", "cusp-height"],
    operation_types: ["3d_finishing"],
    confidence: 89,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-020",
    title: "Rest Machining with Previous Tool Reference",
    body: "Edgecam's rest machining calculates remaining material from " +
      "the previous tool's swept volume and generates targeted passes " +
      "only where stock remains. Chain multiple rest operations with " +
      "decreasing tool sizes (e.g., 20mm, 10mm, 6mm, 3mm) for " +
      "complex mold geometries. Enable minimum area filtering to skip " +
      "insignificant pockets. For each rest level, Edgecam " +
      "automatically adjusts feed rates based on the smaller tool's " +
      "capacity.",
    category: "cam_strategy",
    tags: ["rest-machining", "previous-tool", "mold", "multi-stage"],
    operation_types: ["rest_machining"],
    confidence: 89,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-021",
    title: "Pencil Machining Cleans Fillet Intersections",
    body: "Edgecam's pencil machining traces the bottom of concave " +
      "fillet intersections where larger tools leave unmachined stock. " +
      "The toolpath follows the fillet centerline automatically. Use " +
      "a ball-nose cutter with radius equal to or slightly smaller " +
      "than the fillet radius. Set the stepover to 0.05-0.15mm for " +
      "finishing quality. Enable multi-pass pencil for fillets deeper " +
      "than the ball radius to progressively remove material.",
    category: "cam_strategy",
    tags: ["pencil", "fillet", "cleanup", "ball-nose"],
    operation_types: ["3d_finishing", "pencil"],
    confidence: 88,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-022",
    title: "Flowline Finishing Follows Surface Direction",
    body: "Edgecam's flowline strategy generates toolpaths that follow " +
      "the natural UV direction of surfaces. This produces tool marks " +
      "aligned with the surface flow, ideal for fillets, blends, and " +
      "aerodynamic shapes where cross-flow marks are unacceptable. " +
      "Extend the boundary by 5-10% to eliminate short strokes at " +
      "edges. Set stepover based on scallop height target and surface " +
      "curvature. Flowline works best on single surfaces or smooth " +
      "surface groups.",
    category: "surface_finish",
    tags: ["flowline", "uv-direction", "surface-flow", "finishing"],
    operation_types: ["3d_finishing"],
    confidence: 87,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-023",
    title: "Steep and Shallow Hybrid Finishing Strategy",
    body: "Edgecam's steep/shallow strategy automatically divides " +
      "surfaces at a threshold angle (typically 45-60 degrees). " +
      "Steep regions receive Z-level (waterline) finishing for " +
      "uniform wall quality; shallow regions receive raster or " +
      "scallop finishing for floor quality. Set the overlap band " +
      "to 2-3 stepover widths to ensure seamless blending. This " +
      "hybrid approach is essential for mold and die finishing where " +
      "a single strategy cannot optimize both walls and floors.",
    category: "cam_strategy",
    tags: ["steep-shallow", "hybrid", "z-level", "mold"],
    operation_types: ["3d_finishing"],
    confidence: 90,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-024",
    title: "Z-Level Finishing for Steep Walls",
    body: "Edgecam's Z-level (waterline) finishing excels on walls " +
      "steeper than 45 degrees where raster strategies produce " +
      "excessive scallop heights. Calculate Z-step from scallop " +
      "height: for ball-nose radius R and scallop h, " +
      "Z-step = 2 x sqrt(2Rh). For a 10mm ball nose with 0.005mm " +
      "scallop: Z-step = 0.63mm. Enable extend-to-floor to continue " +
      "waterline passes past the steep/shallow boundary for clean " +
      "transitions. Use constant-Z mode for consistent wall quality.",
    category: "surface_finish",
    tags: ["z-level", "waterline", "steep-walls", "scallop"],
    operation_types: ["3d_finishing"],
    confidence: 89,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-025",
    title: "Scallop-Constant Finishing for Uniform Surface Quality",
    body: "Edgecam's constant-scallop finishing dynamically adjusts " +
      "stepover to maintain uniform cusp height across surfaces of " +
      "varying curvature. On flat areas stepover increases; on steep " +
      "or highly curved areas it decreases. This eliminates the " +
      "visible banding that occurs with constant-stepover strategies. " +
      "Set target scallop to 0.005mm for semi-finish and " +
      "0.001-0.003mm for final finish. This strategy produces the " +
      "most consistent Ra across complex 3D surfaces.",
    category: "surface_finish",
    tags: ["scallop-constant", "cusp-height", "uniform", "finishing"],
    operation_types: ["3d_finishing"],
    confidence: 90,
    source: "web:edgecam-milling",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === 5-Axis (ec-026 to ec-035) ===
  {
    id: "ec-026",
    title: "5-Axis Simultaneous Finishing with Lead Angle Control",
    body: "Edgecam's simultaneous 5-axis finishing tilts the tool to " +
      "maintain optimal contact with the surface. Set a 10-15 degree " +
      "lead angle to move the ball-nose contact point away from the " +
      "tool tip where surface speed is zero, improving finish and " +
      "tool life. The effective cutting diameter at 15 degrees lead " +
      "on a 10mm ball nose is approximately 5.2mm — use this for " +
      "speed/feed calculations rather than the nominal diameter.",
    category: "cam_strategy",
    tags: ["5-axis", "simultaneous", "lead-angle", "finishing"],
    operation_types: ["5axis_simultaneous"],
    confidence: 91,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-027",
    title: "Indexed 3+2 Machining for Multi-Face Parts",
    body: "Edgecam's 3+2 (indexed) machining locks rotary axes at " +
      "fixed orientations to machine features on angled faces with " +
      "standard 3-axis toolpaths. This is more rigid and accurate " +
      "than full 5-axis for holes, pockets, and faces on tilted " +
      "planes. Define a datum per face and verify all index angles " +
      "are within machine travel limits. 3+2 also uses shorter " +
      "tools than simultaneous 5-axis, improving surface finish " +
      "and dimensional accuracy.",
    category: "cam_strategy",
    tags: ["3+2", "indexed", "multi-face", "rigidity"],
    operation_types: ["5axis_indexed"],
    confidence: 91,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-028",
    title: "Swarf Cutting for Ruled Surface Walls",
    body: "Edgecam's swarf cutting uses the side of the cutter to " +
      "machine ruled (straight-line) surfaces in a single pass " +
      "rather than multiple Z-level passes. This is 3-5x faster " +
      "for straight or slightly twisted walls. Verify the surface " +
      "is truly ruled using Edgecam's surface analysis. Set the " +
      "contact band to 80-90% of flute length and enable smooth " +
      "tilt transitions to prevent sudden axis reversals that cause " +
      "surface marks.",
    category: "cam_strategy",
    tags: ["swarf", "ruled-surface", "side-cutting", "5-axis"],
    operation_types: ["5axis_swarf"],
    confidence: 89,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-029",
    title: "5-Axis Port Machining for Internal Passages",
    body: "Edgecam's port machining cycle drives the tool along " +
      "internal passages and manifold channels while maintaining " +
      "collision-free orientation. Define entry/exit points and " +
      "cross-section profiles. For tapered ports, Edgecam morphs " +
      "between entry and exit profiles. Use a tapered ball-nose or " +
      "lollipop cutter with 2-3mm clearance from walls. Enable " +
      "holder collision checking — the port entry is the most " +
      "common collision zone for tool assemblies.",
    category: "cam_strategy",
    tags: ["5-axis", "port", "internal-passage", "collision"],
    operation_types: ["5axis_port"],
    confidence: 88,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-030",
    title: "5-Axis Blade and Impeller Machining",
    body: "Edgecam's blade/impeller cycle machines hub surfaces, " +
      "blades, and splitter blades in coordinated sequences. Start " +
      "with hub roughing using a bull-nose cutter, then blade " +
      "finishing with a tapered ball-nose. Set blade extension to " +
      "3-5% beyond the blade edge. For splitter blades, use thinner " +
      "tools and enable secondary blade offset. Always simulate " +
      "with full holder geometry — splitter channels are the most " +
      "common collision zone.",
    category: "cam_strategy",
    tags: ["5-axis", "blade", "impeller", "turbomachinery"],
    operation_types: ["5axis_impeller"],
    confidence: 88,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-031",
    title: "5-Axis Trimming for Sheet and Composite Parts",
    body: "Edgecam's 5-axis trimming maintains the tool perpendicular " +
      "to the surface along trim boundaries. For composites, use " +
      "PCD or diamond-coated tools at high speed (10,000-20,000 RPM) " +
      "and low feed to minimize delamination. Enable tilt correction " +
      "for draft angles and corner radius compensation for sharp " +
      "trim corners. Program down-milling to push fibers against " +
      "the laminate rather than pulling them up.",
    category: "cam_strategy",
    tags: ["5-axis", "trimming", "composite", "delamination"],
    operation_types: ["5axis_trimming"],
    material_groups: ["composites"],
    confidence: 87,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-032",
    title: "5-Axis Tool Axis Control Options",
    body: "Edgecam provides multiple tool axis modes: normal to surface, " +
      "fixed axis, interpolated between vectors, relative to drive/" +
      "check surfaces, and automatic tilt. For general 5-axis " +
      "finishing, normal-to-surface with 10-15 degree lead angle " +
      "gives the best finish. For undercuts use relative-to-check " +
      "to tilt away from walls. For deep cavities, automatic " +
      "shortest-tool mode minimizes stick-out by optimizing " +
      "orientation for minimum extension.",
    category: "cam_strategy",
    tags: ["5-axis", "tool-axis", "orientation", "lead-angle"],
    operation_types: ["5axis_simultaneous"],
    confidence: 89,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-033",
    title: "5-Axis Collision Avoidance with Holder Checking",
    body: "Edgecam checks tool, holder, and spindle nose against the " +
      "workpiece, fixtures, and machine at every toolpath point. " +
      "When collision is detected, the system retracts or re-orients " +
      "automatically. Set collision clearance to 2-5mm and load " +
      "actual holder 3D models — generic cylinders miss complex " +
      "holder shapes. For impellers, enable progressive retraction " +
      "which lifts smoothly rather than snapping to a safe position.",
    category: "cam_strategy",
    tags: ["5-axis", "collision-avoidance", "holder", "retraction"],
    operation_types: ["5axis_simultaneous"],
    confidence: 90,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-034",
    title: "5-Axis Smooth Rotary Motion Limits",
    body: "For simultaneous 5-axis, limit rotary axis angular velocity " +
      "and acceleration to prevent jerky motion. In Edgecam, set " +
      "maximum rotary speed to 20-40 deg/sec and maximum " +
      "acceleration to 50-100 deg/sec-squared. Enable axis motion " +
      "smoothing to add micro-segments at sharp rotary direction " +
      "changes. This is critical near singularity positions where " +
      "small XY moves require large rotary moves that cause surface " +
      "marks.",
    category: "cam_strategy",
    tags: ["5-axis", "rotary-limits", "smoothing", "singularity"],
    operation_types: ["5axis_simultaneous"],
    confidence: 88,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-035",
    title: "Multi-Surface 5-Axis with Drive and Check Surfaces",
    body: "For complex multi-surface 5-axis machining, define drive " +
      "surfaces (the surfaces being machined) and check surfaces " +
      "(surfaces the tool must avoid). Edgecam tilts the tool to " +
      "maintain contact with drive surfaces while respecting check " +
      "surface clearance. Set the check surface offset to the tool " +
      "radius + 1-2mm clearance. This is essential for machining " +
      "between walls, inside channels, and around bosses.",
    category: "cam_strategy",
    tags: ["5-axis", "multi-surface", "drive-check", "clearance"],
    operation_types: ["5axis_simultaneous"],
    confidence: 88,
    source: "web:edgecam-5axis",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Turning (ec-036 to ec-047) ===
  {
    id: "ec-036",
    title: "Turning Roughing with Optimized Pass Distribution",
    body: "Edgecam's turning roughing distributes cutting passes to " +
      "maintain consistent depth of cut across the profile. Use " +
      "constant-depth mode for simple OD/ID profiles and adaptive " +
      "mode for complex contours with shoulders and fillets. Set " +
      "DOC to 60-80% of insert edge length for steel, 80-100% for " +
      "cast iron. Enable finishing allowance (0.1-0.3mm radial, " +
      "0.05-0.15mm axial) for the subsequent finish pass.",
    category: "cam_strategy",
    tags: ["turning", "roughing", "depth-of-cut", "pass-distribution"],
    operation_types: ["turning_roughing"],
    confidence: 89,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-037",
    title: "Turning Finishing with Spring Pass for Accuracy",
    body: "After finish turning, program a spring pass (identical " +
      "finishing pass with zero additional stock removal) to cut " +
      "the material that deflected away from the tool during the " +
      "first finish pass. The spring pass removes 0.01-0.05mm " +
      "depending on part rigidity and cutting force. This is " +
      "essential for long slender shafts (L/D > 5) and thin-wall " +
      "cylinders where deflection causes oversize. Reduce feed " +
      "rate to 50-70% of the finishing feed for the spring pass.",
    category: "cam_strategy",
    tags: ["turning", "finishing", "spring-pass", "deflection"],
    operation_types: ["turning_finishing"],
    confidence: 89,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-038",
    title: "Grooving Cycles with Peck and Chip Management",
    body: "For deep grooves (depth > 3x groove width), use Edgecam's " +
      "peck grooving cycle that alternates plunge-retract for chip " +
      "breaking and coolant access. Set peck depth to 0.5-1x tool " +
      "width and retract 0.5-1mm. For face grooves, add 0.1mm " +
      "radial offset per peck to prevent rubbing. Enable chip-break " +
      "oscillation for materials producing long stringy chips. " +
      "Reduce feed to 70% for the last 0.5mm of depth to prevent " +
      "pip formation.",
    category: "cam_strategy",
    tags: ["grooving", "peck", "chip-breaking", "turning"],
    operation_types: ["grooving"],
    confidence: 88,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-039",
    title: "Threading with Multiple Pass Strategy",
    body: "Edgecam supports constant-depth, modified flanking, and " +
      "alternating flank infeed for threading. Use modified flanking " +
      "(29.5 degree infeed) for general purpose — it produces better " +
      "chip formation than radial infeed. Set the number of passes " +
      "based on thread pitch: 4-6 passes for fine pitch (<1.5mm), " +
      "8-12 for coarse pitch (2-3mm), 12-16 for large pitch (>3mm). " +
      "Include 2-3 spring passes at final depth to clean up thread " +
      "flanks. Verify thread entry/exit with sufficient run-out " +
      "distance.",
    category: "cam_strategy",
    tags: ["threading", "infeed", "flanking", "spring-pass"],
    operation_types: ["threading"],
    confidence: 89,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-040",
    title: "Boring Operations with Backbore Support",
    body: "Edgecam's boring cycle supports standard boring, back-boring " +
      "(counterboring from the back side), and fine boring with " +
      "oriented spindle retract (G76). For fine boring, enable " +
      "oriented retract to prevent the insert from scoring the bore " +
      "on withdrawal. Set boring feed at 0.05-0.15mm/rev for " +
      "finishing. For back-boring, program the bar to pass through " +
      "the hole, orient, offset radially, then bore upward at " +
      "reduced speed.",
    category: "cam_strategy",
    tags: ["boring", "backbore", "oriented-retract", "fine-boring"],
    operation_types: ["boring"],
    confidence: 87,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-041",
    title: "Turning Face Cycle with Constant Surface Speed",
    body: "For facing operations in Edgecam, always use constant " +
      "surface speed (CSS/G96) mode. As the tool approaches the " +
      "center, the spindle RPM increases to maintain cutting speed. " +
      "Set a maximum RPM limit (G50 S-value) to prevent the spindle " +
      "from exceeding its safe speed — typically 80% of the " +
      "machine's maximum RPM. For large diameter parts, start " +
      "from the OD inward for climb cutting, which produces " +
      "better surface finish than starting from center.",
    category: "cam_strategy",
    tags: ["facing", "css", "constant-surface-speed", "rpm-limit"],
    operation_types: ["turning_facing"],
    confidence: 88,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-042",
    title: "Drilling on Lathe with Center Support",
    body: "For lathe drilling in Edgecam, always program a center " +
      "drill first to create a pilot cone that prevents drill " +
      "wander. Use G83 (peck drilling) for depths beyond 3x " +
      "diameter. For through-holes, program the drill depth to " +
      "break through by the drill point length plus 2mm. Enable " +
      "CSS mode for drilling (unlike milling where RPM is fixed) " +
      "to maintain optimal surface speed as the drill engages " +
      "at the center of the rotating workpiece.",
    category: "cam_strategy",
    tags: ["drilling", "lathe", "center-drill", "peck"],
    operation_types: ["drilling"],
    confidence: 87,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-043",
    title: "Profiling with Controlled Overlap for Accuracy",
    body: "Edgecam's turning profile cycle supports multi-pass " +
      "roughing followed by a single finish pass. Set the finish " +
      "pass to overlap the profile start by 0.5-1mm to ensure a " +
      "seamless join. For interrupted profiles (keyways, flats), " +
      "reduce feed rate by 30% at entry points to prevent insert " +
      "chipping from impact. Enable constant chip load mode for " +
      "profiles with significant diameter changes to prevent " +
      "load spikes at shoulders.",
    category: "cam_strategy",
    tags: ["turning", "profiling", "overlap", "chip-load"],
    operation_types: ["turning_finishing"],
    confidence: 87,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-044",
    title: "Contouring with Nose Radius Compensation",
    body: "Edgecam automatically applies tool nose radius compensation " +
      "(TNRC / G41/G42) for turning contours. The controller " +
      "offsets the toolpath by the insert nose radius to produce " +
      "the correct profile. Verify TNRC direction: G41 for OD " +
      "profiling from right to left, G42 for left to right. Set " +
      "the nose radius and imaginary tool tip position (T-value) " +
      "accurately — a 0.01mm error in nose radius causes the same " +
      "error across the entire contoured profile.",
    category: "cam_strategy",
    tags: ["contouring", "tnrc", "nose-radius", "compensation"],
    operation_types: ["turning_finishing"],
    confidence: 89,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-045",
    title: "C-Axis Milling for Flats and Hexes on Turned Parts",
    body: "Edgecam's C-axis milling interpolates the spindle as a " +
      "rotary axis while a live tool machines features on the OD " +
      "or face. Use C-axis for: hexagonal features, keyways, flats, " +
      "cross-holes, and engraving. Set the spindle speed based on " +
      "the effective cutting diameter at the workpiece surface. " +
      "For helical features, combine C-axis rotation with Z-axis " +
      "feed for spiral patterns. Verify that your machine's C-axis " +
      "resolution is adequate for the feature tolerance.",
    category: "cam_strategy",
    tags: ["c-axis", "milling", "turned-parts", "live-tooling"],
    operation_types: ["mill_turn"],
    confidence: 88,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-046",
    title: "Y-Axis Operations for Off-Center Milling",
    body: "Edgecam supports Y-axis milling on mill-turn machines for " +
      "off-center flats, slots, and holes. Y-axis is more rigid and " +
      "accurate than C-axis interpolation for linear features. " +
      "Verify Y-axis travel range (typically +/-50mm) and set work " +
      "coordinates accordingly. For features near the Y-axis limit, " +
      "reorient with C-axis to bring the feature within range. " +
      "Y-axis pocketing and profiling use standard milling cycles " +
      "with the addition of Y positioning.",
    category: "cam_strategy",
    tags: ["y-axis", "off-center", "mill-turn", "milling"],
    operation_types: ["mill_turn"],
    confidence: 87,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-047",
    title: "Live Tooling Strategy for Mill-Turn Machines",
    body: "Edgecam fully supports live (driven) tooling for milling, " +
      "drilling, and tapping on turning centers. Key considerations: " +
      "live tool spindles have lower power (0.5-3 kW) and speed " +
      "(6,000-12,000 RPM) than machining centers — reduce speeds " +
      "and feeds by 30-40%. Use the smallest effective tool diameter " +
      "to maximize RPM. For cross-drilling, pecking is essential " +
      "due to limited holder rigidity. Program B-axis positioning " +
      "for angled features on upper turret machines.",
    category: "cam_strategy",
    tags: ["live-tooling", "mill-turn", "driven-tools", "b-axis"],
    operation_types: ["mill_turn"],
    confidence: 88,
    source: "web:edgecam-turning",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Wire EDM (ec-048 to ec-053) ===
  {
    id: "ec-048",
    title: "Wire EDM 2-Axis Profile with Lead Strategy",
    body: "Edgecam's 2-axis wire EDM generates profile cutting " +
      "toolpaths with automatic lead-in/lead-out placement. Place " +
      "leads on non-critical surfaces or in corners where witness " +
      "marks won't affect function. Use tangential leads with " +
      "0.5-1mm approach distance for precision dies. For multiple " +
      "profiles, optimize the wire threading sequence to minimize " +
      "non-cutting time. Enable automatic start hole placement in " +
      "waste material.",
    category: "cam_strategy",
    tags: ["wire-edm", "2-axis", "profile", "lead-placement"],
    operation_types: ["wire_edm_2axis"],
    confidence: 88,
    source: "web:edgecam-wire-edm",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-049",
    title: "Wire EDM 4-Axis Taper Cutting",
    body: "Edgecam's 4-axis wire EDM synchronizes upper (UV) and " +
      "lower (XY) guides for tapered profiles. Define constant " +
      "taper angle or separate upper/lower profiles for variable " +
      "taper. Set synchronization points to control the wire " +
      "transition between shapes. Maximum reliable taper is " +
      "typically +/-30 degrees depending on workpiece thickness. " +
      "For dies with complex tapers, verify the UV guide range " +
      "can achieve the required offset at all profile positions.",
    category: "cam_strategy",
    tags: ["wire-edm", "4-axis", "taper", "uv-guides"],
    operation_types: ["wire_edm_4axis"],
    confidence: 87,
    source: "web:edgecam-wire-edm",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-050",
    title: "Wire EDM Skim Cuts for Progressive Surface Finish",
    body: "Program multiple skim cuts in Edgecam to progressively " +
      "improve surface finish. Typical progression: rough cut " +
      "(Ra 3.0-4.0 um), first skim (Ra 1.0-1.5 um), second skim " +
      "(Ra 0.4-0.6 um), third skim (Ra 0.15-0.25 um). Each skim " +
      "uses reduced power and offset. Edgecam stores optimal skim " +
      "parameters per machine brand in its technology tables. " +
      "Three to five skims achieve mirror finish; additional skims " +
      "yield diminishing returns.",
    category: "cam_strategy",
    tags: ["wire-edm", "skim-cuts", "surface-finish", "progressive"],
    operation_types: ["wire_edm_2axis", "wire_edm_4axis"],
    confidence: 89,
    source: "web:edgecam-wire-edm",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-051",
    title: "Wire EDM No-Core Pocketing for Small Features",
    body: "Edgecam's no-core (slugless) pocketing erodes cavities " +
      "without creating a slug, using spiral or raster patterns. " +
      "Ideal for small features where slug removal is difficult, " +
      "blind cavities, and delicate parts where slug separation " +
      "could cause damage. No-core is 30-50% slower than profile " +
      "cutting so use only when necessary. Set erosion stepover " +
      "to 60-80% of wire diameter plus overburn for complete " +
      "material removal.",
    category: "cam_strategy",
    tags: ["wire-edm", "no-core", "slugless", "pocketing"],
    operation_types: ["wire_edm_2axis"],
    confidence: 87,
    source: "web:edgecam-wire-edm",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-052",
    title: "Wire EDM Threading and Slug Management",
    body: "For unattended wire EDM in Edgecam, manage slugs carefully. " +
      "Large slugs (>50g) need tab stops — 0.3-0.5mm uncut sections " +
      "at 2-3 locations that hold the slug until manual removal. " +
      "Small slugs can drop into the work tank. Sequence operations " +
      "as: all rough cuts, return for tab removal, then all skims. " +
      "Ensure start holes are 0.5-1mm larger than the wire guide " +
      "for reliable auto-threading. Include wire tension verification " +
      "after each re-thread.",
    category: "cam_strategy",
    tags: ["wire-edm", "threading", "slug-management", "unattended"],
    operation_types: ["wire_edm_2axis"],
    confidence: 88,
    source: "web:edgecam-wire-edm",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-053",
    title: "Wire EDM Corner Strategy for Precision Dies",
    body: "Edgecam offers sharp, radius, and backtrack corner " +
      "strategies for wire EDM. Use backtrack on external corners " +
      "where wire overcut would violate tolerances — the wire " +
      "reverses to remove the overcut material. For internal " +
      "corners, sharp mode with corner dwell (0.1-0.5 seconds) " +
      "lets the wire catch up on the inner profile. Match corner " +
      "strategy to the die's functional requirements: punches " +
      "need sharp external corners; matrices need precise internal " +
      "corners.",
    category: "cam_strategy",
    tags: ["wire-edm", "corners", "backtrack", "precision"],
    operation_types: ["wire_edm_2axis", "wire_edm_4axis"],
    confidence: 88,
    source: "web:edgecam-wire-edm",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Strategy Manager (ec-054 to ec-061) ===
  {
    id: "ec-054",
    title: "Strategy Manager Automates Repetitive Programming",
    body: "Edgecam Strategy Manager captures expert machining knowledge " +
      "as reusable strategies that automate programming for families " +
      "of parts. Build a strategy once by recording the operations, " +
      "tools, speeds/feeds, and sequence, then apply it to new parts " +
      "by simply loading the solid model. Strategy Manager reduces " +
      "programming time by 80-90% for repeat work and ensures " +
      "consistent quality across operators. Start with your highest-" +
      "volume part families.",
    category: "automation",
    tags: ["strategy-manager", "automation", "knowledge-capture", "reuse"],
    operation_types: ["all"],
    confidence: 91,
    source: "web:edgecam-strategy-manager",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-055",
    title: "Feature Recognition Feeds Strategy Manager",
    body: "Strategy Manager works best with solid models that have " +
      "recognizable features. Edgecam's automatic feature " +
      "recognition (AFR) identifies holes (through, blind, tapped, " +
      "countersunk), pockets, slots, faces, and bosses from the " +
      "solid model. Each feature includes geometric parameters " +
      "(depth, diameter, radius) that Strategy Manager rules use " +
      "to assign the correct machining operations. Ensure models " +
      "have proper fillets and clean geometry for reliable " +
      "feature recognition.",
    category: "automation",
    tags: ["feature-recognition", "solid-model", "afr", "strategy-manager"],
    operation_types: ["all"],
    confidence: 89,
    source: "web:edgecam-strategy-manager",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-056",
    title: "Template Strategies for Standard Operations",
    body: "Build template strategies in Edgecam for common operations: " +
      "drill pattern (spot, drill, chamfer, tap sequence), pocket " +
      "roughing and finishing, face milling, profile with lead-in. " +
      "Templates include tool selection rules, speed/feed lookup by " +
      "material, and operation parameters. A library of 50-100 " +
      "templates covers 90% of typical shop operations. Share " +
      "templates across the programming team via network storage " +
      "for consistent output.",
    category: "automation",
    tags: ["template", "standardization", "operations", "consistency"],
    operation_types: ["all"],
    confidence: 88,
    source: "web:edgecam-strategy-manager",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-057",
    title: "Knowledge Capture from Expert Programmers",
    body: "Strategy Manager's knowledge capture records the decision " +
      "process of expert programmers as they work. Which tool for " +
      "this feature? What speeds and feeds for this material? " +
      "What strategy for this pocket shape? These decisions become " +
      "rules that less experienced programmers can apply. The " +
      "system effectively multiplies expert knowledge across the " +
      "team. Review and update captured knowledge quarterly as " +
      "tooling and techniques evolve.",
    category: "automation",
    tags: ["knowledge-capture", "expert", "rules", "training"],
    operation_types: ["all"],
    confidence: 87,
    source: "web:edgecam-strategy-manager",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-058",
    title: "Batch Processing Multiple Parts Overnight",
    body: "Edgecam's batch processing applies Strategy Manager " +
      "strategies to multiple parts in a queue. Load CAD files, " +
      "assign strategy sets, and let Edgecam generate all programs " +
      "unattended. Review batch reports the next morning for any " +
      "parts where strategies could not be applied (unusual features, " +
      "tool reach issues). Batch processing is ideal for shops with " +
      "high mix production — program 20-50 simple parts per night " +
      "while complex parts get manual attention during the day.",
    category: "automation",
    tags: ["batch-processing", "overnight", "strategy-manager", "production"],
    operation_types: ["all"],
    confidence: 86,
    source: "web:edgecam-strategy-manager",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-059",
    title: "Parametric Machining for Variable-Size Parts",
    body: "Strategy Manager supports parametric dimensions that adapt " +
      "to different part sizes. Define key dimensions (diameter, " +
      "length, pocket depth) as parameters, and the strategy " +
      "adjusts tools, speeds, and operation parameters accordingly. " +
      "For example: IF pocket_depth > 2x tool_diameter THEN use " +
      "helical_entry ELSE use direct_plunge. Parametric strategies " +
      "handle 5-20 size variations without reprogramming.",
    category: "automation",
    tags: ["parametric", "variable-size", "adaptive", "strategy-manager"],
    operation_types: ["all"],
    confidence: 87,
    source: "web:edgecam-strategy-manager",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-060",
    title: "Standard Workflow Definition for Shop Consistency",
    body: "Define standard workflows in Strategy Manager that enforce " +
      "your shop's best practices: always spot drill before drilling, " +
      "always deburr after milling, always measure after finishing. " +
      "Workflows prevent steps from being skipped and ensure every " +
      "programmer follows the same process. Include mandatory " +
      "simulation and collision checking as workflow steps. Workflows " +
      "can be locked by engineering and assigned to specific machine " +
      "groups.",
    category: "automation",
    tags: ["workflow", "standardization", "best-practices", "consistency"],
    operation_types: ["all"],
    confidence: 86,
    source: "web:edgecam-strategy-manager",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-061",
    title: "Custom Strategy Development with PCI Macros",
    body: "Advanced users can build custom strategies using Edgecam's " +
      "PCI (Programmable Command Interface) macro language. PCI " +
      "macros access all Edgecam functions programmatically: create " +
      "operations, set parameters, query geometry, and make decisions. " +
      "Use PCI for complex logic that Strategy Manager's graphical " +
      "interface cannot express, such as multi-condition tool " +
      "selection or adaptive strategy switching based on stock " +
      "analysis results.",
    category: "automation",
    tags: ["pci", "macro", "custom-strategy", "programming"],
    operation_types: ["all"],
    confidence: 85,
    source: "web:edgecam-pci",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Part Modeler (ec-062 to ec-067) ===
  {
    id: "ec-062",
    title: "Part Modeler Creates Stock and Fixtures for CAM",
    body: "Edgecam Part Modeler (Workflow Solids) creates stock blanks, " +
      "fixtures, and custom geometry directly within the CAM " +
      "environment. Define stock as billet, forging, or casting " +
      "shapes for accurate material removal simulation. Model " +
      "fixtures (vises, clamps, soft jaws) for collision checking. " +
      "This eliminates the round-trip to CAD for simple geometry " +
      "changes and keeps all manufacturing data in one environment.",
    category: "cam_strategy",
    tags: ["part-modeler", "stock", "fixtures", "workflow-solids"],
    operation_types: ["all"],
    confidence: 87,
    source: "web:edgecam-part-modeler",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-063",
    title: "Stock Creation for Accurate Simulation",
    body: "Always define the actual stock shape in Part Modeler rather " +
      "than using a generic bounding box. For castings, import the " +
      "casting model as stock; for bar stock, create a cylinder or " +
      "rectangle matching the raw material. For second operations, " +
      "use the in-process stock from the first operation. Accurate " +
      "stock definition prevents air cutting in simulation and " +
      "ensures the material removal visualization matches reality.",
    category: "cam_strategy",
    tags: ["stock-creation", "simulation", "casting", "material-removal"],
    operation_types: ["all"],
    confidence: 88,
    source: "web:edgecam-part-modeler",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-064",
    title: "Fixture Modeling for Collision Detection",
    body: "Model all workholding components in Part Modeler: vises, " +
      "clamps, parallels, soft jaws, and fixture plates. Even " +
      "simplified models (extruded profiles with correct envelope " +
      "dimensions) are sufficient for collision detection. Assign " +
      "fixtures as collision-check objects in the simulation setup. " +
      "This catches tool-fixture collisions that account for 30% " +
      "of all crash incidents. Update fixture models when the " +
      "physical setup changes.",
    category: "cam_strategy",
    tags: ["fixtures", "collision-detection", "modeling", "workholding"],
    operation_types: ["all"],
    confidence: 89,
    source: "web:edgecam-part-modeler",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-065",
    title: "Feature Creation for Additional Machining",
    body: "Use Part Modeler to add features needed for machining but " +
      "absent from the design model: chamfers for deburring, " +
      "witness flats for clamping, alignment features for second " +
      "ops, and tapered entry ramps. These manufacturing features " +
      "stay in the CAM model without modifying the design CAD. " +
      "Mark them with a distinct color or layer for easy " +
      "identification during program review.",
    category: "cam_strategy",
    tags: ["feature-creation", "manufacturing", "deburring", "clamping"],
    operation_types: ["all"],
    confidence: 86,
    source: "web:edgecam-part-modeler",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-066",
    title: "Boundary Generation for Toolpath Containment",
    body: "Part Modeler creates precise boundary curves from solid " +
      "model edges for toolpath containment. Extract silhouette " +
      "boundaries, section curves, and projected edges as machining " +
      "boundaries. This is more reliable than manually tracing " +
      "boundaries on imported surfaces. For rest machining, generate " +
      "boundaries around uncut areas to contain the toolpath to " +
      "only the regions needing attention.",
    category: "cam_strategy",
    tags: ["boundaries", "containment", "silhouette", "rest-machining"],
    operation_types: ["3d_finishing", "rest_machining"],
    confidence: 86,
    source: "web:edgecam-part-modeler",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-067",
    title: "Design Modification Without CAD Round-Trip",
    body: "Part Modeler enables minor design modifications directly in " +
      "Edgecam: adding draft angles, filleting sharp edges, " +
      "splitting surfaces, and extending faces. This avoids the " +
      "time-consuming round-trip to CAD for simple changes. Common " +
      "uses: extend a face beyond the part boundary to prevent " +
      "short tool passes, add split lines for strategy boundaries, " +
      "and create offset surfaces for stock allowance verification.",
    category: "cam_strategy",
    tags: ["design-modification", "draft", "fillet", "cad-round-trip"],
    operation_types: ["all"],
    confidence: 85,
    source: "web:edgecam-part-modeler",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Simulation (ec-068 to ec-073) ===
  {
    id: "ec-068",
    title: "Full Machine Simulation with Kinematic Model",
    body: "Edgecam's machine simulation uses a full kinematic model " +
      "of the CNC machine including all axes, spindles, turrets, " +
      "tailstocks, and sub-spindles. The simulation displays all " +
      "machining action in real time, providing a highly accurate " +
      "animated view of the process. Always run full machine " +
      "simulation before first-article production, verifying " +
      "tool changes, work offsets, and all rapid moves. This " +
      "provides peace of mind that the program is correct.",
    category: "cam_strategy",
    tags: ["simulation", "kinematic", "machine-model", "verification"],
    operation_types: ["simulation"],
    confidence: 91,
    source: "web:edgecam-simulation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-069",
    title: "Collision Detection Between All Components",
    body: "Edgecam's collision detection checks tool, holder, spindle, " +
      "workpiece, fixtures, and all machine components. Enable " +
      "dynamic collision checking for every interpolated position. " +
      "Set nearness warnings at 2-5mm clearance as an early alert. " +
      "Color-coded proximity zones show: green (>5mm), yellow " +
      "(2-5mm), red (<2mm). Pay special attention to tool changes " +
      "and rapid moves — these account for 60% of collision " +
      "incidents.",
    category: "cam_strategy",
    tags: ["collision-detection", "nearness", "safety", "machine-sim"],
    operation_types: ["simulation"],
    confidence: 90,
    source: "web:edgecam-simulation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-070",
    title: "Stock Model Verification After Each Operation",
    body: "Edgecam's stock model updates in real-time during simulation, " +
      "showing the material being removed. After each operation, " +
      "inspect the stock model for: remaining material (colored " +
      "patches on uncut areas), gouging (tool cutting below target), " +
      "and proper stock allowance for the next operation. Compare " +
      "the final simulated part against the CAD model with deviation " +
      "color mapping to catch programming errors.",
    category: "cam_strategy",
    tags: ["stock-model", "verification", "material-removal", "deviation"],
    operation_types: ["simulation"],
    confidence: 89,
    source: "web:edgecam-simulation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-071",
    title: "Gouge Detection for Surface Quality Assurance",
    body: "Enable Edgecam's gouge detection in simulation to identify " +
      "any location where the tool cuts below the finished surface " +
      "model. Gouges as small as 0.005mm are flagged and highlighted " +
      "in red. Common gouge causes: incorrect tool radius " +
      "compensation, insufficient stock allowance, or tool " +
      "deflection not accounted for in the program. Address all " +
      "gouge warnings before sending the program to the machine " +
      "— even minor gouges may scrap the part.",
    category: "quality",
    tags: ["gouge-detection", "surface-quality", "simulation", "scrap"],
    operation_types: ["simulation"],
    confidence: 90,
    source: "web:edgecam-simulation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-072",
    title: "Toolpath Verification Before Full Simulation",
    body: "Use Edgecam's quick toolpath verification (wireframe " +
      "backplot) before running the full machine simulation. " +
      "Toolpath verification is 10-50x faster than full simulation " +
      "and catches obvious errors: wrong tool, wrong depth, missing " +
      "operations, excessive rapid moves. Reserve full machine " +
      "simulation for final validation after toolpath verification " +
      "passes. This two-stage approach saves significant " +
      "verification time on complex multi-operation programs.",
    category: "cam_strategy",
    tags: ["toolpath-verification", "backplot", "quick-check", "workflow"],
    operation_types: ["simulation"],
    confidence: 87,
    source: "web:edgecam-simulation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-073",
    title: "Material Removal Rate Analysis in Simulation",
    body: "During simulation, Edgecam can display material removal " +
      "rate (MRR) in real-time, color-coding the toolpath by " +
      "instantaneous removal volume. Red zones indicate peak MRR " +
      "that may exceed the machine's power capacity; blue zones " +
      "indicate under-utilization. Use this to identify operations " +
      "where feed rates can be increased (blue) or must be reduced " +
      "(red). Target uniform MRR across the program for optimal " +
      "machine utilization.",
    category: "cam_strategy",
    tags: ["material-removal-rate", "simulation", "power", "optimization"],
    operation_types: ["simulation"],
    confidence: 86,
    source: "web:edgecam-simulation",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Post Processor (ec-074 to ec-079) ===
  {
    id: "ec-074",
    title: "Code Wizard for Custom Post Processor Creation",
    body: "Edgecam's Code Wizard provides a graphical interface for " +
      "creating and customizing post processors without manual " +
      "coding. Define output format, block structure, G/M-code " +
      "assignments, and machine-specific parameters through dialog " +
      "boxes. Code Wizard generates the post processor files " +
      "automatically. Start with the closest matching standard " +
      "post and modify incrementally rather than building from " +
      "scratch. Test each change against a reference program.",
    category: "cam_strategy",
    tags: ["code-wizard", "post-processor", "customization", "g-code"],
    operation_types: ["post_processing"],
    confidence: 89,
    source: "web:edgecam-post",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-075",
    title: "Multi-Axis Post Processors for 4/5-Axis Machines",
    body: "Multi-axis post processors in Edgecam must correctly handle " +
      "RTCP/TCP (tool center point) control, rotary axis direction " +
      "conventions, and work plane definitions. For Fanuc, output " +
      "G43.4/G43.5; for Siemens, TRAORI; for Heidenhain, TCPM. " +
      "Configure the post with the exact pivot point distances and " +
      "rotary axis directions (positive/negative conventions) to " +
      "match the machine's kinematic calibration. Incorrect TCP " +
      "setup is the leading cause of 5-axis program errors.",
    category: "cam_strategy",
    tags: ["post-processor", "multi-axis", "tcp", "rtcp"],
    operation_types: ["post_processing"],
    confidence: 90,
    source: "web:edgecam-post",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-076",
    title: "Canned Cycle Output for Standard Operations",
    body: "Configure Edgecam's post to output canned drilling cycles " +
      "(G81/G83/G84/G73/G76/G85-G89) for standard hole operations. " +
      "Canned cycles are 30-50% shorter in code and 5-10% faster " +
      "in execution. Select the correct cycle per operation: G83 " +
      "(full retract peck) for deep holes in gummy materials, G73 " +
      "(chip break) for free-machining, G84 (rigid tap), G76 (fine " +
      "bore with oriented retract). Verify your controller supports " +
      "the specific cycle variant.",
    category: "cam_strategy",
    tags: ["canned-cycles", "drilling", "post-processor", "g-code"],
    operation_types: ["drilling", "tapping", "boring"],
    confidence: 88,
    source: "web:edgecam-post",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-077",
    title: "Machine-Specific Post Configuration",
    body: "Always configure the post processor for the specific " +
      "machine model, not just the controller brand. Even machines " +
      "with the same controller (e.g., Fanuc 31i) may have " +
      "different: tool change positions, work offset ranges, " +
      "axis naming conventions, and optional features. Edgecam's " +
      "post library includes machine-specific posts for major " +
      "brands (DMG, Mazak, Haas, Okuma, Makino). Customize from " +
      "the machine-specific post, not the generic controller post.",
    category: "cam_strategy",
    tags: ["post-processor", "machine-specific", "configuration", "controller"],
    operation_types: ["post_processing"],
    confidence: 88,
    source: "web:edgecam-post",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-078",
    title: "Sub-Program Output for Repeated Patterns",
    body: "Configure Edgecam's post to output sub-programs (M98/M99 " +
      "on Fanuc, L-calls on Siemens) for repeated patterns. " +
      "Sub-programs reduce code size by 80-90% for hole patterns " +
      "and fixture arrays. Set the numbering convention to match " +
      "your DNC system. Enable auto-detection of repeating patterns " +
      "to automatically identify sub-program candidates. Verify " +
      "that the machine has adequate memory for the sub-program " +
      "call stack depth.",
    category: "cam_strategy",
    tags: ["sub-programs", "repeated-patterns", "code-reduction", "post"],
    operation_types: ["post_processing"],
    confidence: 87,
    source: "web:edgecam-post",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-079",
    title: "Macro Output for Parametric Programs",
    body: "Edgecam supports macro output (Fanuc Custom Macro B, " +
      "Siemens R-parameters, Heidenhain Q-parameters) for " +
      "parametric programs. Define variables for part dimensions " +
      "and the posted program adapts without reprogramming. This " +
      "is ideal for family-of-parts production. Edgecam maps its " +
      "parameters to the controller's macro variable syntax. " +
      "Test parametric programs with extreme values to verify " +
      "the macro logic handles all size variations correctly.",
    category: "cam_strategy",
    tags: ["macro", "parametric", "variables", "family-of-parts"],
    operation_types: ["post_processing"],
    confidence: 86,
    source: "web:edgecam-post",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Tool Management (ec-080 to ec-084) ===
  {
    id: "ec-080",
    title: "Centralized Tool Library with Assemblies",
    body: "Edgecam's tool library stores complete tool assemblies: " +
      "cutter + holder + adapters. Define each component separately " +
      "and combine into assemblies for different machines. Import " +
      "manufacturer data in ISO 13399 format for rapid library " +
      "building. Store cutting data per tool-material combination " +
      "so speed/feed values are automatically applied when the tool " +
      "is selected. A well-maintained library of 300-500 assemblies " +
      "covers most shops.",
    category: "tooling",
    tags: ["tool-library", "assemblies", "iso-13399", "centralized"],
    operation_types: ["all"],
    confidence: 88,
    source: "web:edgecam-tools",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-081",
    title: "Holder Assembly Models for Collision Accuracy",
    body: "Load actual holder 3D models in Edgecam's tool library. " +
      "Generic cylinder approximations miss the complex shapes of " +
      "collet chucks, hydraulic holders, and shrink-fit adapters. " +
      "Import STEP or IGES holder geometry from manufacturers. " +
      "Define gauge length, holder diameter profile, and collet " +
      "geometry for each assembly. This is critical for deep " +
      "pocket machining where the holder neck can collide with " +
      "pocket walls despite cutter clearance.",
    category: "tooling",
    tags: ["holder", "3d-model", "collision", "assembly"],
    operation_types: ["all"],
    confidence: 89,
    source: "web:edgecam-tools",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-082",
    title: "Cut Data Management Per Material",
    body: "Store cutting parameters (speed, feed, DOC, stepover) per " +
      "tool-material combination in Edgecam's cut data tables. " +
      "When programming, the system automatically looks up correct " +
      "parameters for the selected tool and workpiece material. " +
      "Maintain separate entries for roughing and finishing. " +
      "Update cut data based on shop floor feedback — if operators " +
      "consistently override programmed feeds, the database needs " +
      "adjustment.",
    category: "speeds_feeds",
    tags: ["cut-data", "material-specific", "database", "management"],
    operation_types: ["all"],
    confidence: 88,
    source: "web:edgecam-tools",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-083",
    title: "Automatic Tool Selection by Feature",
    body: "Edgecam's automatic tool selection matches feature " +
      "requirements against the tool library. The algorithm " +
      "considers: cutter reach vs. feature depth, diameter vs. " +
      "feature width, corner radius vs. fillet requirement, and " +
      "available cutting data for the material. For shops with " +
      "large inventories (500+ tools), this prevents programmers " +
      "from defaulting to favorite tools and ensures optimal " +
      "tool utilization. Configure selection priorities: shortest " +
      "tool first, then largest diameter.",
    category: "tooling",
    tags: ["auto-selection", "feature-matching", "optimization", "library"],
    operation_types: ["all"],
    confidence: 87,
    source: "web:edgecam-tools",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-084",
    title: "Tool Life Tracking and Sister Tool Management",
    body: "Edgecam tracks cumulative cutting time and distance for " +
      "each tool. Set life limits per tool type and material. " +
      "When a tool reaches its life limit, Edgecam can insert " +
      "an automatic change to a sister tool in the same pocket " +
      "position. Track tool usage across multiple programs for " +
      "consumption prediction and inventory management. Export " +
      "usage reports for purchasing and scheduling. This " +
      "prevents mid-program tool failure on unattended runs.",
    category: "tooling",
    tags: ["tool-life", "sister-tool", "tracking", "inventory"],
    operation_types: ["all"],
    confidence: 86,
    source: "web:edgecam-tools",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Surface Quality (ec-085 to ec-090) ===
  {
    id: "ec-085",
    title: "Tolerance Control for G-Code Resolution",
    body: "Edgecam's machining tolerance controls toolpath-to-G-code " +
      "tessellation density. Tighter tolerance = more points = " +
      "smoother surface but larger file. Recommended settings: " +
      "0.01mm for roughing, 0.005mm for semi-finish, 0.001-0.002mm " +
      "for finish. Never set tighter than the machine's positioning " +
      "resolution (typically 0.001mm) — excessive points cause " +
      "controller stuttering and poor surface finish. Balance " +
      "file size against surface quality for each operation.",
    category: "surface_finish",
    tags: ["tolerance", "tessellation", "resolution", "g-code"],
    operation_types: ["3d_finishing", "5axis_finishing"],
    confidence: 89,
    source: "web:edgecam-surface",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-086",
    title: "Scallop Height Calculation for Ball-Nose Cutters",
    body: "For ball-nose finishing, scallop height h = S-squared / " +
      "(8 x R), where S is stepover and R is ball radius. For a " +
      "10mm ball nose at 0.3mm stepover: h = 0.0011mm. On curved " +
      "surfaces the effective radius changes. Enable constant-" +
      "scallop mode to automatically adjust stepover. Target " +
      "scallop heights: 0.01mm semi-finish, 0.003-0.005mm finish, " +
      "less than 0.001mm for mirror. Convert to Ra using " +
      "Ra approximately equals 0.37 x scallop height.",
    category: "surface_finish",
    tags: ["scallop-height", "ball-nose", "stepover", "ra-calculation"],
    operation_types: ["3d_finishing"],
    confidence: 90,
    source: "web:edgecam-surface",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-087",
    title: "Cusp Analysis for Quality Verification",
    body: "Edgecam's cusp analysis displays a color map of theoretical " +
      "surface quality across the machined part. Red zones indicate " +
      "cusp heights exceeding specification — these need additional " +
      "passes or smaller stepover. Use cusp analysis after " +
      "programming to verify Ra/Rz requirements are met before " +
      "sending to the machine. This pre-verification eliminates " +
      "trial cuts and reduces first-article rejection rates by " +
      "identifying surface quality issues in advance.",
    category: "quality",
    tags: ["cusp-analysis", "verification", "ra", "color-map"],
    operation_types: ["3d_finishing"],
    confidence: 87,
    source: "web:edgecam-surface",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-088",
    title: "Smooth Transitions Eliminate Witness Lines",
    body: "Prevent witness lines at toolpath boundaries by enabling " +
      "overlap extension in Edgecam. Extend each toolpath 2-5mm " +
      "beyond its boundary into the adjacent toolpath region. " +
      "The overlap is machined by both passes, eliminating the " +
      "visible step at boundaries. For Class-A surfaces, use " +
      "blended transitions that feather the stepover in the " +
      "overlap zone. Also ensure adjacent operations use the same " +
      "tool and consistent cutting parameters.",
    category: "surface_finish",
    tags: ["transitions", "witness-lines", "overlap", "blending"],
    operation_types: ["3d_finishing"],
    confidence: 87,
    source: "web:edgecam-surface",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-089",
    title: "Arc Fitting Produces Smoother G-Code Output",
    body: "Enable arc fitting in Edgecam's post processor to convert " +
      "sequences of short linear segments (G1) into smooth arcs " +
      "(G2/G3). This reduces program size by 50-70% and produces " +
      "smoother machine motion — the controller processes arcs " +
      "more efficiently than thousands of micro-segments. Set " +
      "arc fitting tolerance to match machining tolerance. Arc " +
      "fitting is especially valuable on older controllers with " +
      "limited look-ahead buffers.",
    category: "surface_finish",
    tags: ["arc-fitting", "g-code", "smooth", "program-size"],
    operation_types: ["3d_finishing", "2d_profiling"],
    confidence: 88,
    source: "web:edgecam-surface",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-090",
    title: "Point Distribution Based on Surface Curvature",
    body: "Edgecam distributes toolpath points based on surface " +
      "curvature: dense in high-curvature regions, sparse on flat " +
      "areas. For smooth CNC motion, ensure point spacing does not " +
      "exceed the controller's look-ahead capacity. Optimal spacing " +
      "at 5,000mm/min feed is 0.05-0.2mm on a modern controller. " +
      "Too many points per second overwhelms the controller's " +
      "block processing, causing stuttering. Too few points cause " +
      "faceted surfaces. Let Edgecam auto-calculate based on " +
      "tolerance setting.",
    category: "surface_finish",
    tags: ["point-distribution", "curvature", "look-ahead", "motion"],
    operation_types: ["3d_finishing"],
    confidence: 87,
    source: "web:edgecam-surface",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Optimization (ec-091 to ec-096) ===
  {
    id: "ec-091",
    title: "Feed Optimization Based on Cutting Load",
    body: "Edgecam's feed optimization adjusts feed rates based on " +
      "tool-workpiece engagement at every toolpath point. High-" +
      "engagement areas (corners, full slots) get reduced feed; " +
      "low-engagement areas get increased feed. Typical result: " +
      "15-30% cycle time reduction with improved tool life because " +
      "the cutter never exceeds its force threshold yet never " +
      "wastes time at unnecessarily slow feeds. Enable for all " +
      "roughing operations as a standard practice.",
    category: "speeds_feeds",
    tags: ["feed-optimization", "engagement", "cutting-load", "cycle-time"],
    operation_types: ["roughing"],
    confidence: 89,
    source: "web:edgecam-optimization",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-092",
    title: "Linking Strategy Reduces Non-Cutting Travel",
    body: "Edgecam's linking controls tool movement between passes. " +
      "Options: retract to clearance plane (safe but slow), stock " +
      "clearance retract (moderate), smooth arc transitions (fast " +
      "with collision check), and direct traverse (fastest but " +
      "risky). For roughing, use stock clearance retracts. For " +
      "finishing, use smooth arc transitions with collision checking. " +
      "Optimized linking typically saves 10-25% of total cycle time " +
      "compared to default clearance-plane retracts.",
    category: "cam_strategy",
    tags: ["linking", "retract", "non-cutting", "cycle-time"],
    operation_types: ["roughing", "3d_finishing"],
    confidence: 88,
    source: "web:edgecam-optimization",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-093",
    title: "Air Cut Reduction with Stock Model Tracking",
    body: "Enable in-process stock tracking to maintain a volumetric " +
      "model that updates after each operation. Subsequent operations " +
      "skip passes where no material remains. Essential for rest " +
      "machining and multi-stage roughing. Without stock tracking, " +
      "every operation makes full passes over the entire geometry " +
      "including already-machined areas. Verify stock model updates " +
      "by reviewing material removal simulation between operations.",
    category: "cam_strategy",
    tags: ["air-cutting", "stock-tracking", "efficiency", "rest"],
    operation_types: ["roughing", "rest_machining"],
    confidence: 89,
    source: "web:edgecam-optimization",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-094",
    title: "Rapid Planning Optimizes Non-Cutting Moves",
    body: "Edgecam's rapid planning optimizes traverse moves between " +
      "operations using simultaneous multi-axis rapids instead of " +
      "sequential retract-move-plunge. Enable machine-aware rapid " +
      "planning to account for axis travel limits and rapid rates. " +
      "For multi-operation parts, rapid optimization can save " +
      "5-15% of total cycle time. Set the safe retract height " +
      "to the minimum needed for fixture clearance rather than " +
      "an arbitrary large value.",
    category: "cam_strategy",
    tags: ["rapid-planning", "traverse", "optimization", "positioning"],
    operation_types: ["all"],
    confidence: 86,
    source: "web:edgecam-optimization",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-095",
    title: "Acceleration Control for High-Speed Machining",
    body: "For HSM in Edgecam, configure corner rounding tolerance " +
      "(0.01-0.05mm) to allow the controller to smooth corners " +
      "rather than decelerating to zero. On Fanuc, this maps to " +
      "G05.1/G08; on Siemens, COMPCAD; on Heidenhain, FUNCTION " +
      "TCPM. The result: maintained feed rate through corners " +
      "that eliminates speed dips causing visible surface marks. " +
      "Set the tolerance based on the part's dimensional " +
      "requirements — tighter tolerance = slower corners.",
    category: "speeds_feeds",
    tags: ["acceleration", "hsm", "corner-rounding", "high-speed"],
    operation_types: ["3d_finishing", "hsm"],
    confidence: 88,
    source: "web:edgecam-optimization",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-096",
    title: "Smooth Flow Technology for Continuous Cutting",
    body: "Edgecam's Smooth Flow technology generates toolpaths with " +
      "continuous smooth motion that avoids sudden direction changes. " +
      "The algorithm smooths corners, blends transitions, and " +
      "optimizes the feed profile for consistent machine motion. " +
      "This is particularly important for finishing where abrupt " +
      "direction changes cause vibration marks. Enable Smooth Flow " +
      "for all finishing operations and set the smoothing tolerance " +
      "to match the part's surface quality requirements.",
    category: "cam_strategy",
    tags: ["smooth-flow", "continuous", "vibration", "finishing"],
    operation_types: ["3d_finishing"],
    confidence: 87,
    source: "web:edgecam-optimization",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Drilling (ec-097 to ec-102) ===
  {
    id: "ec-097",
    title: "Spot Drilling for Hole Location Accuracy",
    body: "Always program spot drilling before twist drilling in " +
      "Edgecam. Use 90-degree spot drill for standard drilling, " +
      "120-degree for carbide drills (matching drill point angle). " +
      "Set spot depth to create a cone slightly larger than the " +
      "drill web — typically 10-20% of drill diameter deep. " +
      "Edgecam's feature recognition can automatically add spot " +
      "drilling when the require-spot option is enabled in " +
      "machining templates.",
    category: "cam_strategy",
    tags: ["spot-drill", "hole-location", "accuracy", "feature"],
    operation_types: ["spot_drilling"],
    confidence: 89,
    source: "web:edgecam-drilling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-098",
    title: "Peck Drilling Depth by Material Type",
    body: "Set peck depth in Edgecam based on material: 0.5-1x " +
      "diameter for steel, 1-2x for aluminum, 0.3-0.5x for " +
      "stainless and superalloys. Carbide drills with through-" +
      "coolant can often skip pecking up to 3x diameter depth. " +
      "Use G83 (full retract) for gummy materials where chips " +
      "pack in flutes, G73 (chip break) for free-machining " +
      "materials. Edgecam's technology database suggests optimal " +
      "peck parameters per material-drill combination.",
    category: "cam_strategy",
    tags: ["peck-drilling", "depth", "material-specific", "g83"],
    operation_types: ["peck_drilling"],
    confidence: 88,
    source: "web:edgecam-drilling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-099",
    title: "Rigid Tapping with Speed-Feed Synchronization",
    body: "Program rigid tapping (G84) in Edgecam with synchronized " +
      "spindle and feed: feed must exactly equal RPM x pitch. " +
      "Set retract speed multiplier to 1.5-2x for faster " +
      "withdrawal. For blind holes, depth = required thread depth " +
      "+ 2 pitches (tap chamfer). Enable spindle orient before " +
      "tapping for consistent thread start across multiple holes. " +
      "For floating tapping, use G84 with tension/compression " +
      "holder to accommodate minor sync errors.",
    category: "cam_strategy",
    tags: ["tapping", "rigid", "synchronization", "thread"],
    operation_types: ["tapping"],
    confidence: 89,
    source: "web:edgecam-drilling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-100",
    title: "Bore Cycle with Dwell and Feed-Out",
    body: "Program boring in Edgecam with reduced speed (30-50% " +
      "of drilling) and steady feed. Add dwell (0.5-1.0 second) " +
      "at hole bottom to ensure full sizing. Use G85 (feed-out) " +
      "for through holes, G89 (dwell + feed-out) for blind holes. " +
      "Leave 0.1-0.2mm stock on diameter after drilling for the " +
      "reamer or bore to remove. For precision bores (IT6-IT7), " +
      "use G76 fine bore with oriented spindle retract to prevent " +
      "scoring.",
    category: "cam_strategy",
    tags: ["boring", "dwell", "feed-out", "precision"],
    operation_types: ["boring", "reaming"],
    confidence: 88,
    source: "web:edgecam-drilling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-101",
    title: "Deep Hole Drilling with Gun Drill Support",
    body: "For holes deeper than 10x diameter, program gun drilling " +
      "in Edgecam with through-coolant at 50-100 bar. Gun drills " +
      "maintain straightness via self-piloting pad action against " +
      "the bore wall. Program a twist-drill pilot hole (3-5x " +
      "diameter) first, then switch to gun drill. Set gun drill " +
      "feed to 0.005-0.02mm/rev for steel. Enable flow/pressure " +
      "monitoring in posted code to detect chip packing that " +
      "could break the drill.",
    category: "cam_strategy",
    tags: ["deep-hole", "gun-drill", "through-coolant", "pilot"],
    operation_types: ["deep_hole_drilling"],
    confidence: 87,
    source: "web:edgecam-drilling",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-102",
    title: "Hole Pattern Optimization Reduces Rapid Travel",
    body: "Edgecam's drill pattern optimizer resequences holes using " +
      "nearest-neighbor algorithms to minimize total rapid travel " +
      "distance. For plates with hundreds of holes this saves " +
      "5-15% of cycle time. Enable pattern optimization and set " +
      "the starting hole nearest to the current tool position. " +
      "For multi-tool operations (spot, drill, chamfer, tap), " +
      "optimize each tool's sequence independently. Group hole " +
      "types by depth and diameter for efficient tool changes.",
    category: "cam_strategy",
    tags: ["pattern-optimization", "rapid-travel", "cycle-time", "drilling"],
    operation_types: ["drilling", "tapping"],
    confidence: 87,
    source: "web:edgecam-drilling",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Material-Specific (ec-103 to ec-108) ===
  {
    id: "ec-103",
    title: "Aluminum HSM Strategy in Edgecam",
    body: "For aluminum high-speed machining: use Waveform with " +
      "8-12% radial engagement, full flute depth, and 3-5x normal " +
      "feed rate. Select 3-flute polished carbide end mills. " +
      "Surface speed: 300-1000 m/min depending on alloy (6061 " +
      "higher, 7075 lower). Use compressed air blast instead of " +
      "flood coolant to prevent built-up edge. Set tolerance to " +
      "0.005mm and enable arc fitting for smooth motion. Aluminum " +
      "is forgiving — push speeds aggressively.",
    category: "cam_strategy",
    tags: ["aluminum", "hsm", "waveform", "high-speed"],
    operation_types: ["roughing", "3d_finishing"],
    material_groups: ["aluminum"],
    confidence: 90,
    source: "web:edgecam-materials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-104",
    title: "Titanium Machining with Strict Engagement Control",
    body: "Titanium (Ti-6Al-4V) in Edgecam requires strict engagement " +
      "control. Use Waveform with 10-15% radial engagement, 1x " +
      "diameter axial depth, and consistent chip load of " +
      "0.05-0.1mm/tooth. Surface speed: 40-80 m/min carbide, " +
      "150-250 m/min ceramic (roughing only). High-pressure " +
      "coolant (50-70 bar) is essential. Never let the tool dwell " +
      "— always maintain feed to prevent work hardening. Use climb " +
      "milling exclusively.",
    category: "cam_strategy",
    tags: ["titanium", "engagement-control", "coolant", "work-hardening"],
    operation_types: ["roughing", "3d_finishing"],
    material_groups: ["titanium"],
    confidence: 90,
    source: "web:edgecam-materials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-105",
    title: "Stainless Steel Anti-Work-Hardening Strategy",
    body: "Austenitic stainless (304/316) work-hardens rapidly. Key " +
      "Edgecam strategies: maintain minimum chip thickness (never " +
      "below 0.03mm/tooth), use climb milling only, avoid re-cutting " +
      "chips. Waveform's constant engagement prevents the " +
      "intermittent cutting that triggers work hardening. Surface " +
      "speed: 80-120 m/min coated carbide. Use positive-geometry " +
      "inserts for turning. If the surface glazes (shiny hard " +
      "layer), increase DOC to cut beneath the hardened zone.",
    category: "cam_strategy",
    tags: ["stainless-steel", "work-hardening", "chip-thickness", "climb"],
    operation_types: ["roughing", "turning_roughing"],
    material_groups: ["stainless_steel"],
    confidence: 89,
    source: "web:edgecam-materials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-106",
    title: "Hardened Steel HSM Approach (>45 HRC)",
    body: "For hardened steels above 45 HRC in Edgecam: light radial " +
      "engagement (3-8% diameter), shallow axial depth (0.1-0.3mm " +
      "finishing), high surface speed (150-300 m/min AlTiN/TiSiN " +
      "coated carbide). Waveform is essential — engagement spikes " +
      "fracture cutting edges in hard material. For finishing, " +
      "use bull-nose cutters at 10-15 degree tilt instead of " +
      "ball-nose to avoid zero surface speed at the tip. Enable " +
      "HSM controller modes (G05.1, CYCLE832).",
    category: "cam_strategy",
    tags: ["hardened-steel", "hsm", "light-engagement", "coating"],
    operation_types: ["roughing", "3d_finishing"],
    material_groups: ["hardened_steel"],
    confidence: 90,
    source: "web:edgecam-materials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-107",
    title: "Brass and Copper Alloy Machining Tips",
    body: "Brass and copper alloys in Edgecam are easy to machine " +
      "but have unique requirements. Use sharp, uncoated carbide " +
      "or PCD tools. For free-machining brass (C360), high speeds " +
      "(200-400 m/min) and aggressive feeds work well. For copper " +
      "(C110), reduce speed to 100-200 m/min and use positive " +
      "rake to prevent smearing. Avoid re-cutting chips — brass " +
      "chips are small but can embed in the surface. Use flood " +
      "coolant for copper to prevent material welding to the tool.",
    category: "cam_strategy",
    tags: ["brass", "copper", "uncoated", "positive-rake"],
    operation_types: ["roughing", "3d_finishing"],
    material_groups: ["copper"],
    confidence: 87,
    source: "web:edgecam-materials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-108",
    title: "Composite Machining with Diamond Tools",
    body: "For CFRP/GFRP composites in Edgecam: use PCD or CVD " +
      "diamond-coated tools at high speed (200-500 m/min) and low " +
      "feed (0.02-0.05mm/tooth). Program climb milling to push " +
      "fibers against the laminate, preventing delamination. Use " +
      "compression routers for through-cutting to prevent both " +
      "top and bottom ply separation. Enable dust extraction — " +
      "composite dust is hazardous and abrasive to machine ways. " +
      "Avoid coolant unless the composite tolerates moisture.",
    category: "cam_strategy",
    tags: ["composite", "cfrp", "diamond", "delamination"],
    operation_types: ["2d_profiling", "5axis_trimming"],
    material_groups: ["composites"],
    confidence: 88,
    source: "web:edgecam-materials",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Probing (ec-109 to ec-113) ===
  {
    id: "ec-109",
    title: "Setup Probing for Automatic Work Offset",
    body: "Program probing cycles in Edgecam to automatically set " +
      "work offsets (G54-G59). Typical sequence: probe X-face, " +
      "Y-face, Z-face for datum, optionally probe two faces for " +
      "angular offset (G68 rotation). Edgecam supports Renishaw " +
      "and M&H (now Hexagon) probes with six measuring cycles. " +
      "Automated probing replaces 10-20 minute manual edge-finding " +
      "with 1-2 minute automated cycles. Essential for reducing " +
      "setup time on short-run production.",
    category: "quality",
    tags: ["probing", "work-offset", "setup", "renishaw"],
    operation_types: ["probing"],
    confidence: 89,
    source: "web:edgecam-probing",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-110",
    title: "Alignment Probing for Castings and Forgings",
    body: "For rough castings with variable stock, program alignment " +
      "probing in Edgecam. Probe 6 or more points on datum surfaces " +
      "then use coordinate rotation and shift to align work " +
      "coordinates to the as-cast geometry. This ensures uniform " +
      "stock removal across the part. Without alignment probing, " +
      "one side may have excessive stock (wasting time) while the " +
      "other has insufficient stock (causing scrap). Output probing " +
      "results to controller variables for automatic WCS adjustment.",
    category: "quality",
    tags: ["alignment", "probing", "casting", "stock-variation"],
    operation_types: ["probing"],
    confidence: 88,
    source: "web:edgecam-probing",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-111",
    title: "In-Process Inspection Between Operations",
    body: "Program in-process probing in Edgecam between roughing and " +
      "finishing to verify critical dimensions. Probe bore diameters " +
      "after boring, wall positions after pocketing, face positions " +
      "after facing. If out of tolerance, the program can apply " +
      "wear offset correction, branch to rework, or alarm-stop. " +
      "This catches errors before the finish cut, preventing " +
      "expensive scrap. Particularly valuable for high-value " +
      "aerospace and medical parts.",
    category: "quality",
    tags: ["in-process", "inspection", "probing", "tolerance"],
    operation_types: ["probing"],
    confidence: 89,
    source: "web:edgecam-probing",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-112",
    title: "Surface Verification After Finishing",
    body: "After finishing complex 3D surfaces, program surface " +
      "verification probing to check the machined surface against " +
      "the CAD model. Probe a grid of points across the surface " +
      "and compare to nominal. Edgecam generates probing toolpaths " +
      "from the CAD surface with approach vectors normal to the " +
      "surface. Output results in DMIS format for quality " +
      "documentation or as a deviation map for visual analysis.",
    category: "quality",
    tags: ["surface-verification", "probing", "dmis", "deviation"],
    operation_types: ["probing"],
    confidence: 87,
    source: "web:edgecam-probing",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-113",
    title: "Quality Output for Documentation",
    body: "Edgecam generates inspection documentation alongside NC " +
      "programs. Define inspection points on critical features and " +
      "output both on-machine probing routines and corresponding " +
      "CMM programs (DMIS format). This ensures consistent datum " +
      "schemes between in-process and final inspection. Include " +
      "measurement results in the part traveler for traceability. " +
      "For regulated industries (aerospace, medical), this " +
      "documentation is mandatory for part acceptance.",
    category: "quality",
    tags: ["quality-output", "documentation", "dmis", "traceability"],
    operation_types: ["probing", "inspection"],
    confidence: 86,
    source: "web:edgecam-probing",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Automation (ec-114 to ec-118) ===
  {
    id: "ec-114",
    title: "PCI Macro Language for Custom Automation",
    body: "Edgecam's PCI (Programmable Command Interface) macro " +
      "language provides full programmatic access to all CAM " +
      "functions. Write PCI macros to automate repetitive tasks: " +
      "batch tool loading, standard operation creation, report " +
      "generation, and custom workflows. PCI uses a Basic-like " +
      "syntax with access to Edgecam's object model. Start with " +
      "the macro recorder to capture manual operations, then " +
      "edit the recorded code to add logic and parameters.",
    category: "automation",
    tags: ["pci", "macro", "scripting", "custom-automation"],
    operation_types: ["all"],
    confidence: 86,
    source: "web:edgecam-pci",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-115",
    title: "Batch Operations for Multi-Part Processing",
    body: "Automate multi-part processing in Edgecam by combining " +
      "Strategy Manager with batch operations. Queue multiple CAD " +
      "files, assign strategy sets, and process all parts " +
      "sequentially. Batch operations support automatic feature " +
      "recognition, tool assignment, and G-code generation. " +
      "Review batch logs for failed parts that need manual " +
      "attention. Ideal for contract shops with diverse part " +
      "mixes — process simple parts automatically, reserve " +
      "programmer time for complex work.",
    category: "automation",
    tags: ["batch", "multi-part", "strategy-manager", "queue"],
    operation_types: ["all"],
    confidence: 86,
    source: "web:edgecam-automation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-116",
    title: "Template Deployment Across Programming Team",
    body: "Deploy machining templates to the entire programming team " +
      "via network-shared template libraries. Lock critical " +
      "templates (approved by engineering) so they cannot be " +
      "modified by individual programmers. Use versioning to " +
      "track template changes and roll back if issues arise. " +
      "Templates should include: tool selection rules, speed/feed " +
      "tables, operation sequences, and quality requirements. " +
      "Review and update templates quarterly.",
    category: "automation",
    tags: ["template-deployment", "team", "network", "versioning"],
    operation_types: ["all"],
    confidence: 85,
    source: "web:edgecam-automation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-117",
    title: "NC Code Management and DNC Integration",
    body: "Edgecam integrates with DNC (Direct Numerical Control) " +
      "systems for managed NC code distribution to machines. " +
      "Configure the post processor to output programs to the " +
      "DNC server directory with standardized naming conventions. " +
      "Include program header comments with part number, revision, " +
      "date, and programmer name for traceability. Set up " +
      "automatic archiving of superseded programs. This prevents " +
      "running outdated programs — a common cause of scrap.",
    category: "automation",
    tags: ["nc-management", "dnc", "distribution", "traceability"],
    operation_types: ["post_processing"],
    confidence: 86,
    source: "web:edgecam-automation",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-118",
    title: "Custom Cycle Creation for Repeated Operations",
    body: "Create custom cycles in Edgecam for shop-specific operations " +
      "not covered by standard cycles: specialized deburring " +
      "routines, custom probing sequences, machine-specific " +
      "warm-up programs, and pallet change procedures. Custom " +
      "cycles combine PCI macro logic with standard Edgecam " +
      "operations and post processor customization. Once created, " +
      "they appear in the operations menu alongside standard " +
      "cycles for easy programmer access.",
    category: "automation",
    tags: ["custom-cycles", "specialized", "pci", "operations"],
    operation_types: ["all"],
    confidence: 85,
    source: "web:edgecam-automation",
    created_at: "2026-03-13",
    usage_count: 0
  },

  // === Additional Tips (ec-119 to ec-120) ===
  {
    id: "ec-119",
    title: "Edgecam Solid Import with Healing and Repair",
    body: "When importing solid models into Edgecam, enable automatic " +
      "healing to fix common CAD translation issues: gaps between " +
      "surfaces, duplicate faces, and degenerate edges. Edgecam " +
      "supports direct import of SolidWorks, Solid Edge, Inventor, " +
      "CATIA, NX, STEP, and IGES files. For problematic models, " +
      "use Part Modeler's repair tools: stitch open surfaces, " +
      "remove tiny faces, and rebuild edges. Clean geometry is " +
      "essential for reliable feature recognition and toolpath " +
      "generation.",
    category: "cam_strategy",
    tags: ["solid-import", "healing", "repair", "cad-translation"],
    operation_types: ["all"],
    confidence: 87,
    source: "web:edgecam-import",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-120",
    title: "Multi-Setup Programming with Work Coordinate Systems",
    body: "Edgecam supports multi-setup programming for parts " +
      "requiring multiple fixturing orientations. Define separate " +
      "work coordinate systems (G54-G59, G54.1 P1-P48) per setup. " +
      "Use in-process stock transfer between setups — the stock " +
      "shape from setup 1 becomes the stock for setup 2, ensuring " +
      "accurate material removal simulation. Program datum transfer " +
      "probing between setups to align subsequent operations to " +
      "features machined in the first setup.",
    category: "cam_strategy",
    tags: ["multi-setup", "work-coordinates", "fixturing", "datum-transfer"],
    operation_types: ["all"],
    confidence: 88,
    source: "web:edgecam-multi-setup",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Waveform Advanced Parameters (ec-121 to ec-125) ===
  {
    id: "ec-121",
    title: "Waveform Roughing Morphing Zone Control",
    body: "In Waveform roughing, the Morphing Zone parameter controls how the " +
      "toolpath transitions between constant-stepover regions and trochoidal " +
      "arcs near walls and islands. Set morphing zone to 1.5-2.0x tool " +
      "diameter for smooth transitions that prevent sudden engagement changes. " +
      "Too small a morphing zone creates abrupt transitions causing vibration; " +
      "too large wastes cycle time with unnecessary arcs in open areas. For " +
      "titanium and Inconel, increase to 2.5x to minimize load spikes near " +
      "thin walls.",
    category: "cam_strategy",
    tags: ["waveform", "morphing-zone", "engagement", "advanced"],
    operation_types: ["roughing"],
    confidence: 0.88,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-122",
    title: "Waveform Micro-Lift Between Passes Reduces Recutting",
    body: "Enable the micro-lift option in Waveform roughing to add a small " +
      "retract (0.05-0.2mm) between lateral passes. This breaks the chip " +
      "and prevents the tool from dragging across previously cut surfaces " +
      "during repositioning moves. Set the micro-lift height based on " +
      "material: 0.05mm for aluminum, 0.1mm for steel, 0.2mm for " +
      "superalloys. The micro-lift adds negligible cycle time (typically " +
      "<1%) but significantly reduces flank wear from recutting.",
    category: "cam_strategy",
    tags: ["waveform", "micro-lift", "retract", "recutting"],
    operation_types: ["roughing"],
    confidence: 0.85,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-123",
    title: "Waveform Rest Roughing with Automatic Stock Tracking",
    body: "Waveform rest roughing uses the in-process stock model to detect " +
      "remaining material after a larger tool pass. Set the previous tool " +
      "diameter accurately — Edgecam generates Waveform paths only where " +
      "material remains. Enable 'detect thin walls' to prevent the rest " +
      "roughing tool from plunging into already-machined thin sections. " +
      "For multi-level rest roughing, run largest-to-smallest tool order " +
      "and update the stock model after each operation.",
    category: "cam_strategy",
    tags: ["waveform", "rest-roughing", "stock-tracking", "multi-tool"],
    operation_types: ["roughing"],
    confidence: 0.87,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-124",
    title: "Waveform Plunge Strategy for Deep Pockets",
    body: "For deep pockets exceeding 3x tool diameter depth, configure " +
      "Waveform's plunge strategy to use helical entry with controlled " +
      "helix angle (2-4° for steel, 5-8° for aluminum). Set the helix " +
      "radius to 60-80% of pocket corner radius to ensure clearance. " +
      "Enable 'ramp from outside' when possible to start the helix from " +
      "open stock rather than plunging into enclosed material. The pre-drill " +
      "option can further reduce cycle time by drilling a clearance hole " +
      "at the helix center.",
    category: "cam_strategy",
    tags: ["waveform", "plunge", "helical-entry", "deep-pocket"],
    operation_types: ["roughing", "pocketing"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-125",
    title: "Waveform Finishing Allowance Per-Wall Control",
    body: "Edgecam Waveform allows separate finishing allowances for floor " +
      "and wall surfaces. Set floor allowance to match your finishing " +
      "pass axial depth of cut (typically 0.2-0.5mm). Set wall allowance " +
      "based on radial finishing pass (typically 0.1-0.3mm). For thin " +
      "walls (<2mm), increase wall allowance to 0.5mm to prevent " +
      "deflection during roughing, then use a light finishing pass with " +
      "reduced depth of cut to achieve tolerance.",
    category: "cam_strategy",
    tags: ["waveform", "finishing-allowance", "wall", "floor"],
    operation_types: ["roughing"],
    confidence: 0.84,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Automatic Feature Recognition Tuning (ec-126 to ec-130) ===
  {
    id: "ec-126",
    title: "AFR Sensitivity Tuning for Complex Castings",
    body: "Edgecam's Automatic Feature Recognition (AFR) sensitivity can be " +
      "tuned per feature type. For castings with draft angles, reduce " +
      "pocket recognition tolerance to 3-5° (default 1°) to detect " +
      "drafted pockets as machinable features. Enable 'partial feature " +
      "recognition' to detect features that don't fully conform to " +
      "standard shapes — critical for castings where parting lines " +
      "intersect feature boundaries.",
    category: "cam_strategy",
    tags: ["afr", "feature-recognition", "castings", "sensitivity"],
    operation_types: ["all"],
    confidence: 0.82,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-127",
    title: "AFR Custom Feature Templates for Recurring Geometries",
    body: "Create custom AFR templates for company-specific feature patterns " +
      "that standard recognition misses. In the Feature Recognition " +
      "dialog, use 'Teach Feature' to select geometry and define it as " +
      "a named template. Specify the machining strategy, tool, and " +
      "parameters. AFR then automatically recognizes matching geometry " +
      "in new parts and applies the saved strategy. Store templates in " +
      "the shared network location for team-wide consistency.",
    category: "automation",
    tags: ["afr", "templates", "feature-recognition", "standardization"],
    operation_types: ["all"],
    confidence: 0.83,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-128",
    title: "AFR Hole Recognition Diameter Banding",
    body: "Configure AFR hole recognition with diameter bands to automatically " +
      "assign drill cycles. Define bands such as: <3mm = spot-drill + " +
      "carbide drill, 3-12mm = spot-drill + HSS drill, 12-25mm = pilot " +
      "drill + step drill, >25mm = pilot + interpolated milling. Set " +
      "tolerance on diameter matching to ±0.05mm for precision holes " +
      "and ±0.5mm for clearance holes. AFR applies the correct cycle " +
      "type and tool automatically based on detected diameter.",
    category: "automation",
    tags: ["afr", "hole-recognition", "drill-cycles", "diameter-bands"],
    operation_types: ["drilling", "boring"],
    confidence: 0.85,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-129",
    title: "AFR Thread Detection and Automatic Tapping Assignment",
    body: "AFR detects threaded holes by recognizing cosmetic thread features " +
      "in imported solid models (STEP/Parasolid). Ensure the CAD model " +
      "includes thread annotations or cosmetic thread representations. " +
      "Configure the thread table in Edgecam's tool library mapping " +
      "thread designations (M6x1.0, M8x1.25, etc.) to specific taps " +
      "and pre-drill diameters. AFR then generates the complete " +
      "drill-chamfer-tap sequence automatically for each detected thread.",
    category: "automation",
    tags: ["afr", "threads", "tapping", "hole-recognition"],
    operation_types: ["drilling", "tapping"],
    confidence: 0.84,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-130",
    title: "AFR Exclusion Zones for Non-Machinable Features",
    body: "Mark regions as AFR exclusion zones to prevent feature recognition " +
      "on surfaces that should not be machined (cast-in features, " +
      "reference datums, pre-machined surfaces from prior setups). " +
      "Select faces and assign them to the 'Do Not Machine' layer. " +
      "This reduces AFR processing time on complex parts by 30-50% " +
      "and prevents erroneous toolpath generation on surfaces that " +
      "are already at final dimension.",
    category: "automation",
    tags: ["afr", "exclusion-zones", "non-machinable", "optimization"],
    operation_types: ["all"],
    confidence: 0.81,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Edgecam Designer Direct Modeling (ec-131 to ec-136) ===
  {
    id: "ec-131",
    title: "Edgecam Designer Push-Pull Direct Modeling for Fixturing",
    body: "Use Edgecam Designer's push-pull direct modeling to create " +
      "fixture components without parametric history. Select a face " +
      "and drag to extrude, or push to create pockets. Double-click " +
      "edges to add fillets. This approach is 3-5x faster than " +
      "parametric CAD for simple fixture plates, clamps, and soft " +
      "jaws. Export as Parasolid for seamless transfer to the " +
      "machining environment.",
    category: "cam_strategy",
    tags: ["designer", "direct-modeling", "fixturing", "push-pull"],
    operation_types: ["all"],
    confidence: 0.83,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-132",
    title: "Edgecam Designer Stock Model Creation from Raw Material",
    body: "Create accurate stock models in Edgecam Designer by starting " +
      "with standard raw material shapes (round bar, rectangular billet, " +
      "near-net forging). Use the 'Wrap' command to generate a minimum " +
      "bounding stock from the finished part with user-defined offsets " +
      "(typically 2-5mm per side). For castings, import the casting " +
      "model directly as stock and use Boolean difference to define " +
      "the machining envelope.",
    category: "cam_strategy",
    tags: ["designer", "stock-model", "raw-material", "bounding"],
    operation_types: ["all"],
    confidence: 0.85,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-133",
    title: "Edgecam Designer Geometry Repair for Imported Models",
    body: "Edgecam Designer includes automatic geometry repair for imported " +
      "STEP/IGES files. Run 'Check Model' to identify gaps, overlaps, " +
      "and degenerate faces. Use 'Stitch' to close gaps up to a " +
      "specified tolerance (start at 0.01mm, increase to 0.1mm if " +
      "needed). 'Delete and Fill' removes problematic faces and " +
      "replaces them with clean surfaces. Always repair before " +
      "machining — bad geometry causes toolpath gaps and gouges.",
    category: "cam_strategy",
    tags: ["designer", "geometry-repair", "import", "stitch"],
    operation_types: ["all"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-134",
    title: "Edgecam Designer Split Face for Selective Machining",
    body: "Use Designer's 'Split Face' to divide large surfaces into " +
      "regions with different machining requirements. Project a sketch " +
      "onto a face to create split lines, then assign different surface " +
      "finish requirements to each region. This enables selective " +
      "strategy application — e.g., fine finishing only on sealing " +
      "surfaces while leaving non-critical areas at roughing finish. " +
      "Reduces cycle time by 15-25% on parts with mixed surface requirements.",
    category: "cam_strategy",
    tags: ["designer", "split-face", "selective-machining", "surface-regions"],
    operation_types: ["finishing"],
    confidence: 0.82,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-135",
    title: "Edgecam Designer Offset Surface for Electrode Design",
    body: "For EDM electrode design, use Designer's surface offset tool " +
      "to create the electrode shape. Offset the cavity surface by " +
      "the spark gap (typically 0.1-0.3mm for roughing, 0.02-0.05mm " +
      "for finishing). Add the electrode body by extruding the offset " +
      "surface. Use Boolean unite to merge multiple electrode faces " +
      "into a single solid body ready for machining.",
    category: "cam_strategy",
    tags: ["designer", "electrode", "edm", "surface-offset"],
    operation_types: ["all"],
    confidence: 0.80,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-136",
    title: "Edgecam Designer Assembly Mode for Multi-Component Fixtures",
    body: "Designer's assembly mode allows positioning multiple components " +
      "(part, fixture, clamps, parallels) with mate constraints. Use " +
      "face-to-face, edge-to-edge, and concentric mates to accurately " +
      "position all components. The assembled model transfers to the " +
      "machining environment with full collision checking. Define " +
      "clearance envelopes (2-5mm) around fixture components to " +
      "ensure safe rapid traverse moves.",
    category: "cam_strategy",
    tags: ["designer", "assembly", "fixture", "collision-avoidance"],
    operation_types: ["all"],
    confidence: 0.83,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Tombstone and Fixture Plate Machining (ec-137 to ec-142) ===
  {
    id: "ec-137",
    title: "Tombstone Multi-Face Programming with Rotary Indexing",
    body: "Program tombstone (4-sided fixture block) machining by defining " +
      "each face as a separate setup with its own work coordinate system. " +
      "Use the Machine Setup dialog to define the rotary axis positions " +
      "(0°, 90°, 180°, 270° for 4-face tombstone). Each face references " +
      "the tombstone datum — program G54.1 P1-P4 with rotary offset. " +
      "Sequence operations face-by-face to minimize rotary index moves.",
    category: "cam_strategy",
    tags: ["tombstone", "rotary-indexing", "multi-face", "work-coordinates"],
    operation_types: ["all"],
    confidence: 0.87,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-138",
    title: "Fixture Plate Grid Pattern with Instance Machining",
    body: "For fixture plates with identical parts in a grid pattern, " +
      "program one part instance completely, then use Edgecam's " +
      "'Instance' feature to replicate the toolpath to all grid " +
      "positions. Define the grid spacing, rotation, and number of " +
      "rows/columns. Instance machining maintains all tool changes " +
      "per tool (not per part) — reducing tool change time by 60-80% " +
      "on high-count fixture plates.",
    category: "cam_strategy",
    tags: ["fixture-plate", "instance", "grid-pattern", "batch"],
    operation_types: ["all"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-139",
    title: "Tombstone Collision Avoidance with Fixture Definition",
    body: "Define the complete tombstone assembly (base, columns, clamps, " +
      "adjacent parts) as a fixture model in the Simulator. Enable " +
      "collision checking against all fixture components during toolpath " +
      "generation. Set clearance planes per face to account for clamps " +
      "and part protrusions on adjacent faces. The simulator checks " +
      "holder and tool body collisions against the full 360° fixture " +
      "assembly — not just the current face.",
    category: "cam_strategy",
    tags: ["tombstone", "collision-avoidance", "fixture", "simulator"],
    operation_types: ["all"],
    confidence: 0.85,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-140",
    title: "Fixture Plate Sub-Program Generation for CNC Efficiency",
    body: "Configure the post processor to output fixture plate programs " +
      "as main program + sub-programs. Each part instance becomes a " +
      "sub-program (O-number) called with work offset. The main " +
      "program handles tool changes and calls sub-programs with " +
      "G54.1 P-codes for each position. This reduces program size " +
      "by 80-90% for high-count plates and simplifies editing — " +
      "change the sub-program once to update all instances.",
    category: "post_processing",
    tags: ["fixture-plate", "sub-programs", "work-offsets", "post-processor"],
    operation_types: ["all"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-141",
    title: "Tombstone Tool-Based Sequencing for Minimum Changes",
    body: "Override Edgecam's default operation-based sequencing to use " +
      "tool-based sequencing across all tombstone faces. In the " +
      "Sequence Manager, group operations by tool number. The machine " +
      "loads T1, machines all T1 operations across all four faces " +
      "(with rotary index moves), then changes to T2. This reduces " +
      "total tool changes from N×F (tools × faces) to N, saving " +
      "5-15 seconds per avoided tool change.",
    category: "cam_strategy",
    tags: ["tombstone", "tool-sequencing", "tool-changes", "optimization"],
    operation_types: ["all"],
    confidence: 0.88,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-142",
    title: "Fixture Plate Part Presence Probing Before Machining",
    body: "Add probe routines before machining each fixture plate position " +
      "to verify part presence. Program a single-point probe touch at " +
      "a known Z-height — if the probe triggers, the part is present " +
      "and machining proceeds; if it doesn't trigger within the " +
      "expected travel, skip that position via macro branching " +
      "(#variable and GOTO). This handles partially loaded fixture " +
      "plates without operator intervention.",
    category: "cam_strategy",
    tags: ["fixture-plate", "probing", "part-presence", "macro"],
    operation_types: ["probing"],
    confidence: 0.83,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Code Wizard Post Processor Customization (ec-143 to ec-148) ===
  {
    id: "ec-143",
    title: "Code Wizard Event-Driven Post Processor Architecture",
    body: "Edgecam Code Wizard uses an event-driven architecture where " +
      "each CNC operation triggers events (ToolChange, RapidMove, " +
      "LinearFeed, ArcFeed, CycleStart, etc.). Customize output by " +
      "modifying event handlers — add custom G/M codes, reformatting, " +
      "or conditional logic. The event sequence mirrors the toolpath: " +
      "ProgramStart → ToolChange → SpindleOn → approach moves → " +
      "cutting moves → retract → ToolChange → ProgramEnd.",
    category: "post_processing",
    tags: ["code-wizard", "post-processor", "events", "architecture"],
    operation_types: ["all"],
    confidence: 0.87,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-144",
    title: "Code Wizard Variable System for Machine-Specific Output",
    body: "Code Wizard exposes 200+ system variables for post customization. " +
      "Key variables: CUR_TOOL (current tool number), NEXT_TOOL (next " +
      "tool for pre-staging), SPINDLE_SPEED, FEED_RATE, X/Y/Z_POS " +
      "(current position), WORK_OFFSET, COOLANT_TYPE. Use conditional " +
      "blocks: IF COOLANT_TYPE = 'THROUGH' THEN output M88 ELSE output " +
      "M8. Create user-defined variables for shop-specific needs like " +
      "pallet ID or operator message codes.",
    category: "post_processing",
    tags: ["code-wizard", "variables", "conditional", "customization"],
    operation_types: ["all"],
    confidence: 0.85,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-145",
    title: "Code Wizard Multi-Channel Output for Mill-Turn",
    body: "For multi-channel mill-turn machines (e.g., twin-spindle with " +
      "Y-axis), configure Code Wizard to generate synchronized output. " +
      "Define channel mappings: main spindle = Channel 1, sub-spindle = " +
      "Channel 2. Use synchronization codes (WAIT/M-code handshakes) " +
      "at transfer points. The post tracks both spindles' positions " +
      "independently and generates proper G14/G15 plane switching or " +
      "manufacturer-specific syntax (Mazak SMOOTH, Okuma OSP).",
    category: "post_processing",
    tags: ["code-wizard", "multi-channel", "mill-turn", "synchronization"],
    operation_types: ["turning", "milling"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-146",
    title: "Code Wizard Macro Sub-Program Calls for Canned Cycles",
    body: "Customize Code Wizard to output machine-specific canned cycle " +
      "formats. Fanuc uses G73/G83 with Q/R parameters; Siemens uses " +
      "CYCLE83 with RTP/RFP/SDIS/DP/DPR. Map Edgecam's drilling " +
      "cycle parameters to the target controller format. For custom " +
      "cycles (probing, thread milling, bore finishing), create macro " +
      "call events that output G65 P-number with argument variables " +
      "(A-Z) mapped from Edgecam operation parameters.",
    category: "post_processing",
    tags: ["code-wizard", "canned-cycles", "macros", "controller-specific"],
    operation_types: ["drilling", "boring"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-147",
    title: "Code Wizard Tool List and Setup Sheet Generation",
    body: "Configure Code Wizard to output tool lists and setup sheets " +
      "as secondary output files. Use the FileOutput event to create " +
      "CSV/HTML/PDF tool lists containing tool number, description, " +
      "diameter, length, holder, offset number, and estimated life " +
      "remaining. Include setup information: work offsets, stock " +
      "dimensions, first-tool Z-height, and total cycle time. Output " +
      "to a shared folder for operator access via shop floor tablets.",
    category: "post_processing",
    tags: ["code-wizard", "tool-list", "setup-sheet", "documentation"],
    operation_types: ["all"],
    confidence: 0.83,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-148",
    title: "Code Wizard Post Processor Testing and Validation",
    body: "Validate custom post processors by running the same test part " +
      "through the original and modified posts and diffing the output. " +
      "Create a standard test part containing all operation types your " +
      "shop uses (drilling, tapping, roughing, finishing, 5-axis, " +
      "probing). Use Code Wizard's debug mode to trace event execution " +
      "and variable values. Always test edge cases: maximum RPM, " +
      "minimum feed, coordinate wrap-around, and tool magazine limits.",
    category: "post_processing",
    tags: ["code-wizard", "testing", "validation", "debug"],
    operation_types: ["all"],
    confidence: 0.82,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === B-Axis Turning (ec-149 to ec-153) ===
  {
    id: "ec-149",
    title: "B-Axis Turning for Complex Contour Interpolation",
    body: "B-axis turning uses a rotary tool spindle to maintain optimal " +
      "cutting angle across complex contours. Edgecam interpolates " +
      "X, Z, and B axes simultaneously to keep the insert at the " +
      "ideal approach angle (typically 90° to the surface normal). " +
      "This eliminates the need for multiple tools with different " +
      "lead angles to machine complex profiles. Configure the B-axis " +
      "angular range and resolution (typically 0.001°) in the machine " +
      "setup dialog.",
    category: "cam_strategy",
    tags: ["b-axis", "turning", "interpolation", "contour"],
    operation_types: ["turning"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-150",
    title: "B-Axis Insert Clearance Angle Optimization",
    body: "When programming B-axis turning, set minimum clearance angle " +
      "to prevent insert flank interference. Edgecam calculates the " +
      "required B-axis rotation to maintain the specified clearance " +
      "(typically 3-5°) between the insert flank and the workpiece " +
      "surface. For re-entrant profiles (undercuts), increase clearance " +
      "to 7-10° and verify in simulation. The post must output B-axis " +
      "values synchronized with X/Z moves — check for axis acceleration " +
      "limits on sharp profile transitions.",
    category: "cam_strategy",
    tags: ["b-axis", "clearance-angle", "insert", "interference"],
    operation_types: ["turning"],
    confidence: 0.82,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-151",
    title: "B-Axis Prime Turning for Bi-Directional Cutting",
    body: "B-axis enables prime turning (bi-directional) strategies where " +
      "the insert cuts in both directions along the Z-axis. Program " +
      "the forward pass with B-angle for chip flow away from chuck, " +
      "then reverse B-angle for the return pass. This eliminates " +
      "non-cutting return strokes, reducing cycle time by 30-50% " +
      "on long shaft components. Set the B-axis flip angle to match " +
      "your insert geometry (typically 145-160° included angle).",
    category: "cam_strategy",
    tags: ["b-axis", "prime-turning", "bi-directional", "cycle-time"],
    operation_types: ["turning"],
    confidence: 0.83,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-152",
    title: "B-Axis Toolpath Smoothing for Surface Finish",
    body: "Enable B-axis toolpath smoothing to prevent angular jerk that " +
      "causes witness marks on finished surfaces. Set the smoothing " +
      "tolerance (0.005-0.02mm) and maximum angular velocity (typically " +
      "30-60°/sec depending on machine). Edgecam distributes B-axis " +
      "rotation across multiple blocks to smooth transitions. For " +
      "critical surface finish areas, reduce feedrate at high B-axis " +
      "rotation rates to maintain consistent chip load despite the " +
      "changing effective cutting speed.",
    category: "cam_strategy",
    tags: ["b-axis", "smoothing", "surface-finish", "angular-velocity"],
    operation_types: ["turning", "finishing"],
    confidence: 0.81,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-153",
    title: "B-Axis with Sub-Spindle Part Transfer Coordination",
    body: "When programming B-axis operations before sub-spindle part " +
      "transfer, ensure the B-axis is returned to 0° (home position) " +
      "before the transfer sequence. Program a clearance move with " +
      "B0 before the part catch/transfer M-codes. In the post " +
      "processor, add a B-axis home check in the PartTransfer event. " +
      "After transfer to sub-spindle, re-establish B-axis orientation " +
      "relative to the new spindle centerline — the coordinate system " +
      "flips with the part.",
    category: "cam_strategy",
    tags: ["b-axis", "sub-spindle", "part-transfer", "coordination"],
    operation_types: ["turning"],
    confidence: 0.80,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Thread Whirling (ec-154 to ec-157) ===
  {
    id: "ec-154",
    title: "Thread Whirling Programming for Bone Screws",
    body: "Thread whirling in Edgecam uses a ring-shaped cutter that " +
      "surrounds the workpiece, with inserts on the inner diameter. " +
      "Program the whirling head rotation (typically 3000-8000 RPM) " +
      "synchronized with slow workpiece rotation and Z-axis feed for " +
      "the thread lead. Set the whirling head offset (eccentricity) " +
      "to control thread depth. For medical bone screws with variable " +
      "pitch, program Z-feed as a function of C-axis position.",
    category: "cam_strategy",
    tags: ["thread-whirling", "bone-screws", "medical", "synchronization"],
    operation_types: ["turning", "threading"],
    confidence: 0.79,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-155",
    title: "Thread Whirling Multi-Start Configuration",
    body: "For multi-start thread whirling, program multiple passes with " +
      "C-axis offset equal to 360°/number-of-starts. A triple-start " +
      "thread requires three passes with 0°, 120°, and 240° C-axis " +
      "offsets. Use the thread whirling cycle with the 'number of " +
      "starts' parameter — Edgecam calculates the required phase " +
      "offsets automatically. Verify start spacing in simulation by " +
      "checking the thread form at multiple Z-positions.",
    category: "cam_strategy",
    tags: ["thread-whirling", "multi-start", "c-axis", "phase-offset"],
    operation_types: ["turning", "threading"],
    confidence: 0.78,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-156",
    title: "Thread Whirling Insert Selection and Speed Calculation",
    body: "Select whirling inserts based on thread profile (V-thread, " +
      "buttress, acme) and material. For titanium bone screws, use " +
      "PVD-coated carbide inserts at 80-120 m/min cutting speed. " +
      "Calculate whirling head RPM from: N = (Vc × 1000) / (π × D_ring) " +
      "where D_ring is the whirling ring inner diameter. Set workpiece " +
      "RPM from: N_work = feed_rate / lead. The speed ratio (head/workpiece) " +
      "typically ranges 100:1 to 500:1.",
    category: "speeds_feeds",
    tags: ["thread-whirling", "inserts", "speed-calculation", "titanium"],
    operation_types: ["turning", "threading"],
    confidence: 0.80,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-157",
    title: "Thread Whirling Post Processor Requirements",
    body: "Thread whirling requires specific post processor support for " +
      "synchronized multi-axis output. The post must output: whirling " +
      "spindle speed (often on a secondary spindle command like S2=), " +
      "main spindle speed (S1=), Z-axis feed synchronized to main " +
      "spindle rotation (G32 or G33 thread cutting mode), and " +
      "whirling head engage/retract sequences. Verify the post " +
      "handles the coordinate system correctly — some controllers " +
      "require the whirling head as a C2 axis, not B-axis.",
    category: "post_processing",
    tags: ["thread-whirling", "post-processor", "synchronization", "multi-spindle"],
    operation_types: ["turning", "threading"],
    confidence: 0.79,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Deep Hole Drilling Strategies (ec-158 to ec-163) ===
  {
    id: "ec-158",
    title: "Gun Drilling Strategy with Pilot Hole Requirement",
    body: "For gun drilling in Edgecam (L/D > 10:1), always program a " +
      "pilot hole first using a short rigid drill to 1.5-2x diameter " +
      "depth. The pilot establishes concentricity for the gun drill " +
      "entry. Set gun drill feed to 0.01-0.03 mm/rev for steel and " +
      "0.05-0.08 mm/rev for aluminum. Enable through-tool coolant " +
      "(70+ bar pressure) and set the dwell at bottom to 0 to prevent " +
      "chip packing. Program retract with feed (not rapid) to avoid " +
      "scoring the bore surface.",
    category: "cam_strategy",
    tags: ["gun-drilling", "deep-hole", "pilot-hole", "coolant-pressure"],
    operation_types: ["drilling"],
    confidence: 0.87,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-159",
    title: "BTA Drilling Programming for Large Diameter Deep Holes",
    body: "BTA (Boring and Trepanning Association) drilling for holes " +
      ">18mm diameter uses external coolant supply through the drill " +
      "body with chip evacuation through the center. Program the " +
      "approach sequence: rapid to 5mm above surface, feed at 50% " +
      "rate for 1.5x diameter to establish the guide bushing, then " +
      "full feed. Set BTA drill speed to 60-80% of standard drill " +
      "speed for the same diameter. Monitor spindle load — if it " +
      "exceeds 70% of rated, reduce feed by 20%.",
    category: "cam_strategy",
    tags: ["bta-drilling", "deep-hole", "large-diameter", "chip-evacuation"],
    operation_types: ["drilling"],
    confidence: 0.82,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-160",
    title: "Peck Drilling Depth Progression for Deep Holes",
    body: "For standard peck drilling of deep holes (L/D 5-10:1), use " +
      "decreasing peck depths: first peck at 3x diameter, subsequent " +
      "pecks reducing by 20-30% each. In Edgecam, set 'first peck' " +
      "and 'peck reduction' parameters. Example for 10mm drill: " +
      "pecks at 30mm, 21mm, 15mm, 10mm, 7mm. The reducing pecks " +
      "account for increasing chip evacuation difficulty. Set dwell " +
      "at bottom of each peck (0.5-1 second) to break the chip " +
      "before retract.",
    category: "cam_strategy",
    tags: ["peck-drilling", "deep-hole", "peck-reduction", "chip-breaking"],
    operation_types: ["drilling"],
    confidence: 0.88,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-161",
    title: "High-Pressure Coolant Deep Drilling Without Pecking",
    body: "With high-pressure through-tool coolant (70+ bar), program " +
      "continuous feed drilling without pecking for holes up to 8x " +
      "diameter depth in steel. This eliminates retract-and-replunge " +
      "cycles, reducing cycle time by 40-60% vs. peck drilling. In " +
      "Edgecam, select 'No Peck' drilling cycle and ensure the " +
      "through-tool coolant M-code is output before the cycle. " +
      "Monitor chip form — continuous spiral chips confirm proper " +
      "coolant evacuation; broken or balled chips indicate insufficient " +
      "pressure.",
    category: "cam_strategy",
    tags: ["deep-drilling", "high-pressure-coolant", "no-peck", "cycle-time"],
    operation_types: ["drilling"],
    confidence: 0.85,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-162",
    title: "Cross-Hole Drilling Strategy to Prevent Drill Wander",
    body: "When deep drilling intersects a cross-hole, the drill tip " +
      "encounters interrupted cutting that causes deflection. In " +
      "Edgecam, program a 50% feed reduction starting 2mm before the " +
      "cross-hole intersection and continuing until 2mm past. Use a " +
      "user-defined event in the drilling cycle to insert the feed " +
      "override at the calculated Z-depth. For critical holes, program " +
      "a bore cycle after drilling to correct any deflection-induced " +
      "runout at the intersection.",
    category: "cam_strategy",
    tags: ["deep-drilling", "cross-hole", "drill-wander", "feed-reduction"],
    operation_types: ["drilling"],
    confidence: 0.81,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-163",
    title: "Ejector Drilling for Extreme Depth-to-Diameter Ratios",
    body: "For L/D ratios exceeding 20:1, program ejector drilling " +
      "which uses dual-tube coolant supply and Venturi-effect chip " +
      "evacuation. In Edgecam, set up the ejector drill as a custom " +
      "tool type with the actual cutting diameter and body diameter. " +
      "Program the guide bushing engagement sequence as a preliminary " +
      "operation. Set spindle speed at 40-60% of standard drill speed " +
      "and feed at 0.005-0.015 mm/rev for steel. The post must output " +
      "the coolant system activation codes specific to the ejector unit.",
    category: "cam_strategy",
    tags: ["ejector-drilling", "extreme-depth", "dual-tube", "chip-evacuation"],
    operation_types: ["drilling"],
    confidence: 0.78,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Composite Machining (ec-164 to ec-168) ===
  {
    id: "ec-164",
    title: "CFRP Routing with Diamond-Coated Compression Cutters",
    body: "For CFRP (carbon fiber reinforced polymer) trimming in " +
      "Edgecam, use diamond-coated compression routers that cut " +
      "upward on the bottom half and downward on the top half, " +
      "preventing delamination on both surfaces. Set spindle speed " +
      "to 10000-18000 RPM with feed rate of 1500-3000 mm/min. Program " +
      "a single full-depth pass (3-8mm typical laminate thickness). " +
      "Use conventional (climb) milling direction only — reverse " +
      "direction causes fiber pullout and fraying.",
    category: "cam_strategy",
    tags: ["composite", "cfrp", "compression-cutter", "delamination"],
    operation_types: ["roughing", "finishing"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-165",
    title: "Composite Stack Drilling with Stepped Parameters",
    body: "When drilling composite-metal stacks (CFRP/titanium, CFRP/aluminum), " +
      "program stepped parameters that change at each material interface. " +
      "In Edgecam, use the multi-material drilling cycle with Z-depth " +
      "triggers: CFRP layer at 6000 RPM / 0.05 mm/rev, titanium layer " +
      "at 800 RPM / 0.04 mm/rev. Enable automatic parameter switching " +
      "by defining material boundaries as Z-depth values. Use PCD or " +
      "diamond-coated drills rated for both materials.",
    category: "cam_strategy",
    tags: ["composite", "stack-drilling", "multi-material", "parameter-switching"],
    operation_types: ["drilling"],
    confidence: 0.82,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-166",
    title: "Honeycomb Core Machining with Vacuum Fixturing",
    body: "Program honeycomb core machining with minimal cutting forces " +
      "to prevent cell wall damage. Use sharp, uncoated carbide tools " +
      "with high helix angles (45-60°). Set axial depth to one cell " +
      "height per pass and radial engagement to 30-50% of tool diameter. " +
      "In Edgecam, program dust extraction M-codes instead of coolant — " +
      "liquid coolant contaminates honeycomb cells. Define the vacuum " +
      "fixture table as a fixture body in the machine setup to prevent " +
      "plunging through the part into the vacuum table.",
    category: "cam_strategy",
    tags: ["composite", "honeycomb", "vacuum-fixture", "dust-extraction"],
    operation_types: ["roughing", "finishing"],
    confidence: 0.80,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-167",
    title: "Composite Waterjet Trimming Toolpath from Edgecam",
    body: "Edgecam can generate 5-axis waterjet trimming toolpaths for " +
      "composite parts. Define the waterjet as a custom tool with " +
      "the nozzle diameter (0.3-1.0mm) and standoff distance (2-5mm). " +
      "Set kerf compensation equal to half the waterjet stream " +
      "diameter at the cutting surface. Program lead-in/lead-out " +
      "moves to avoid waterjet dwell marks. For curved composite " +
      "panels, enable normal-to-surface orientation to maintain " +
      "consistent standoff across the 3D contour.",
    category: "cam_strategy",
    tags: ["composite", "waterjet", "5-axis", "trimming"],
    operation_types: ["finishing"],
    confidence: 0.79,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-168",
    title: "Composite Edge Finishing Quality Control Parameters",
    body: "For aerospace composite edge finishing, set tight tolerances " +
      "in Edgecam: surface deviation ≤0.02mm, minimum segment length " +
      "0.1mm, maximum angular deviation 2°. Use the 'contour with " +
      "lead' cycle for edge trimming to maintain constant chip load " +
      "around complex contours. Enable fiber direction tracking in " +
      "the tool's approach angle — cut with the fiber direction where " +
      "possible (0° or 180° relative to fiber axis) to minimize " +
      "delamination depth to <0.5mm per aerospace specs.",
    category: "quality",
    tags: ["composite", "edge-finishing", "aerospace", "delamination"],
    operation_types: ["finishing"],
    confidence: 0.81,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Hardened Material Strategies >55 HRC (ec-169 to ec-174) ===
  {
    id: "ec-169",
    title: "Hard Milling Entry Strategy for Die Steel >55 HRC",
    body: "For hardened die steel (55-65 HRC), never plunge directly — " +
      "always use arc or helical entry in Edgecam. Set helix angle " +
      "to 1-2° maximum and arc radius to 2-3x tool radius. Cutting " +
      "speed: 100-200 m/min with CBN or ceramic-coated carbide. " +
      "Feed per tooth: 0.03-0.08mm. Axial depth: 0.1-0.5mm for " +
      "finishing, maximum 1x diameter for roughing with Waveform. " +
      "Never use conventional (up) milling — always climb mill to " +
      "ensure the chip starts thick and thins, preventing rubbing.",
    category: "cam_strategy",
    tags: ["hard-milling", "die-steel", "entry-strategy", "hrc"],
    operation_types: ["roughing", "finishing"],
    confidence: 0.88,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-170",
    title: "Hard Turning versus Hard Milling Decision Criteria",
    body: "In Edgecam, choose hard turning over hard milling when: the " +
      "part is axially symmetric, surface finish requirement is " +
      "Ra 0.2-0.8μm (achievable with CBN inserts), and the hardness " +
      "is 55-68 HRC. Hard turning uses CBN or ceramic inserts at " +
      "150-250 m/min, 0.05-0.15 mm/rev feed, 0.1-0.3mm depth of cut. " +
      "For interrupted cuts (keyways, cross-holes), use ceramic " +
      "inserts which handle impact better than CBN. Set Edgecam's " +
      "constant surface speed (G96) with max RPM limiter.",
    category: "cam_strategy",
    tags: ["hard-turning", "cbn", "ceramic", "surface-finish"],
    operation_types: ["turning", "finishing"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-171",
    title: "Hardened Material Rest Machining with Small Tools",
    body: "After roughing hardened material with a large tool, use " +
      "Edgecam's rest machining with a smaller ball-nose or bull-nose " +
      "to clean corners and fillets. Set the 'previous tool' diameter " +
      "accurately to avoid air cutting. For 55+ HRC, use 4-flute " +
      "carbide ball-nose with AlTiN or TiSiN coating. Reduce feed to " +
      "0.02-0.05 mm/tooth and spindle speed to 12000-20000 RPM " +
      "(depending on tool diameter). Enable constant chip load in " +
      "corners to prevent tool overload on small-radius blends.",
    category: "cam_strategy",
    tags: ["hard-milling", "rest-machining", "ball-nose", "corners"],
    operation_types: ["finishing"],
    confidence: 0.85,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-172",
    title: "Thermal Management in Hard Machining Operations",
    body: "Hard machining generates extreme heat (800-1200°C at the cut). " +
      "In Edgecam, program for dry cutting or minimum quantity " +
      "lubrication (MQL) — never flood coolant on CBN/ceramic tools " +
      "as thermal shock causes insert fracture. Set the MQL M-code " +
      "in tool definitions. Program air blast for chip clearing. " +
      "Avoid dwelling or reducing feed (which causes rubbing and " +
      "heat buildup). Keep constant feed even through corners by " +
      "enabling feed rate optimization in the toolpath strategy.",
    category: "cam_strategy",
    tags: ["hard-machining", "thermal", "dry-cutting", "mql"],
    operation_types: ["roughing", "finishing"],
    confidence: 0.87,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-173",
    title: "Hard Milling Surface Finish Scallop Height Control",
    body: "For hardened material finishing with ball-nose tools, control " +
      "scallop height directly in Edgecam by setting the stepover " +
      "based on the formula: ae = 2 × √(R² - (R - h)²) where R is " +
      "ball radius and h is target scallop height. For Ra 0.4μm " +
      "target on 60 HRC steel with a 6mm ball-nose (R=3mm), set h = " +
      "0.002mm giving ae = 0.22mm. Enable 3D scallop-height-driven " +
      "stepover in Edgecam to maintain constant scallop across " +
      "varying surface curvature.",
    category: "quality",
    tags: ["hard-milling", "scallop-height", "ball-nose", "surface-finish"],
    operation_types: ["finishing"],
    confidence: 0.89,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-174",
    title: "CBN Insert Management for Hard Turning Tool Life",
    body: "Track CBN insert tool life in Edgecam's tool management by " +
      "machining time rather than part count — insert life in hard " +
      "turning is typically 15-25 minutes of active cutting at 55-62 " +
      "HRC. Set the 'tool life' parameter in minutes in the tool " +
      "definition. Edgecam will prompt for tool change when accumulated " +
      "cutting time exceeds the limit. For finishing passes requiring " +
      "Ra <0.4μm, use a fresh edge — set a separate (shorter) tool " +
      "life for finishing operations vs roughing operations.",
    category: "tool_management",
    tags: ["cbn", "hard-turning", "tool-life", "insert-management"],
    operation_types: ["turning"],
    confidence: 0.85,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Multi-Axis Barrel Cutter Strategies (ec-175 to ec-179) ===
  {
    id: "ec-175",
    title: "Barrel Cutter Selection for Large Surface Stepovers",
    body: "Barrel cutters (lens-shape, taper, general barrel forms) in " +
      "Edgecam 5-axis finishing achieve 5-10x larger stepovers than " +
      "ball-nose tools for the same scallop height. A barrel cutter " +
      "with 250mm effective radius achieves the same scallop height " +
      "as a ball-nose at 1/5th the stepover. Define barrel tools in " +
      "Edgecam's tool library with the barrel radius, taper angle, " +
      "and tip radius. The tool definition drives Edgecam's contact " +
      "point calculation for 5-axis orientation.",
    category: "cam_strategy",
    tags: ["barrel-cutter", "5-axis", "scallop", "stepover"],
    operation_types: ["finishing"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-176",
    title: "Barrel Cutter Lead and Tilt Angle Optimization",
    body: "Barrel cutter 5-axis finishing requires precise lead and tilt " +
      "angles to position the barrel segment tangent to the surface. " +
      "In Edgecam, set the lead angle to match the barrel geometry — " +
      "typically 10-20° from the surface normal. The tilt angle " +
      "controls which portion of the barrel profile contacts the " +
      "surface. Use Edgecam's 'automatic lead/tilt' mode which " +
      "optimizes contact for maximum stepover while maintaining " +
      "gouge-free cutting. Verify contact point in the toolpath " +
      "simulation view.",
    category: "cam_strategy",
    tags: ["barrel-cutter", "lead-angle", "tilt-angle", "5-axis"],
    operation_types: ["finishing"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-177",
    title: "Barrel Cutter for Turbine Blade Root-to-Tip Finishing",
    body: "Use barrel cutters for turbine blade finishing from root to " +
      "tip in a single 5-axis pass. Select a general-form barrel " +
      "with radius matching the blade's minimum convex curvature. " +
      "Program the toolpath in Edgecam using 'surface finishing' with " +
      "drive curves along the blade span. Set collision checking " +
      "against the blade root fillet and adjacent blades (if blisk). " +
      "Typical cycle time reduction: 60-70% vs ball-nose finishing " +
      "due to the dramatically larger stepover (3-5mm vs 0.3-0.5mm).",
    category: "cam_strategy",
    tags: ["barrel-cutter", "turbine-blade", "5-axis", "blisk"],
    operation_types: ["finishing"],
    confidence: 0.83,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-178",
    title: "Barrel Cutter Collision Avoidance on Enclosed Surfaces",
    body: "Barrel cutters are more prone to holder collisions than ball-nose " +
      "tools due to the lead/tilt angles required. In Edgecam, define " +
      "the complete tool assembly (cutter + holder + spindle nose) for " +
      "accurate collision checking. Set the minimum holder clearance to " +
      "2-3mm. Enable 'automatic tool axis adjustment' to allow Edgecam " +
      "to modify lead/tilt angles where collisions are detected. In " +
      "tight areas where barrel cutters cannot fit, Edgecam automatically " +
      "switches to ball-nose cutting (if configured as an alternate tool).",
    category: "cam_strategy",
    tags: ["barrel-cutter", "collision-avoidance", "holder", "tool-assembly"],
    operation_types: ["finishing"],
    confidence: 0.82,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-179",
    title: "Tangent-Plane Barrel Cutter for Ruled Surface Finishing",
    body: "For ruled surfaces (planar sections like turbine blade flanks), " +
      "use the tangent-plane barrel cutter strategy. The barrel contacts " +
      "the surface along a line rather than a point, enabling stepover " +
      "equal to the contact line length (10-30mm depending on barrel " +
      "radius and surface curvature). In Edgecam, set 'ruled surface' " +
      "mode in the 5-axis finishing parameters. The tool axis is " +
      "constrained to lie in the tangent plane at each point, maximizing " +
      "the contact zone while preventing gouging.",
    category: "cam_strategy",
    tags: ["barrel-cutter", "ruled-surface", "tangent-plane", "line-contact"],
    operation_types: ["finishing"],
    confidence: 0.81,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Workflow Automation and Templates (ec-180 to ec-184) ===
  {
    id: "ec-180",
    title: "Manufacturing Instruction Templates for Standardization",
    body: "Create Manufacturing Instruction (MI) templates in Edgecam " +
      "Strategy Manager to standardize machining processes. An MI " +
      "template captures the complete sequence: feature recognition " +
      "rules, operation order, tools, cutting parameters, and " +
      "strategies. Apply the MI to new parts by dragging onto the " +
      "feature tree — Edgecam maps template operations to recognized " +
      "features. Store MI templates on a shared server location for " +
      "team access and version control.",
    category: "automation",
    tags: ["templates", "manufacturing-instruction", "standardization", "strategy-manager"],
    operation_types: ["all"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-181",
    title: "PCI Automation for Batch Part Processing",
    body: "Edgecam's Part Changer Interface (PCI) automates batch processing " +
      "of similar parts. Define a base program with variable parameters " +
      "(stock dimensions, feature depths, hole positions). PCI reads a " +
      "CSV or Excel file containing per-part values and generates " +
      "individual programs automatically. For families of 50+ parts " +
      "with similar geometry, PCI reduces programming time from hours " +
      "to minutes. Configure the output folder structure: one subfolder " +
      "per part with NC code, setup sheet, and tool list.",
    category: "automation",
    tags: ["pci", "batch-processing", "part-families", "csv-import"],
    operation_types: ["all"],
    confidence: 0.83,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-182",
    title: "Edgecam Workflow VBA Macro Automation",
    body: "Edgecam supports VBA macros for workflow automation. Common " +
      "automations: auto-load part files from a folder, apply standard " +
      "machining template based on material/size, generate NC code, " +
      "export setup sheet, and log to database. Access the VBA editor " +
      "from Tools → Macro Editor. Key objects: Application (top-level), " +
      "Document (active file), Operations (machining tree), Toolpath " +
      "(geometry data). Schedule macros to run on file-open or " +
      "post-process events.",
    category: "automation",
    tags: ["vba", "macros", "workflow", "scripting"],
    operation_types: ["all"],
    confidence: 0.82,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-183",
    title: "ERP Integration via Edgecam Workflow Connector",
    body: "Connect Edgecam to ERP/MES systems using the Workflow Connector " +
      "API. Import work orders containing part number, material, " +
      "quantity, and due date. Edgecam automatically loads the part " +
      "file, applies the saved machining template, generates NC code, " +
      "and writes the estimated cycle time back to the ERP. Configure " +
      "the connector to poll the ERP database at regular intervals " +
      "(1-5 minutes) or trigger on new work order creation via " +
      "webhook notification.",
    category: "automation",
    tags: ["erp", "workflow-connector", "mes", "integration"],
    operation_types: ["all"],
    confidence: 0.79,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-184",
    title: "Template Inheritance for Part Family Hierarchies",
    body: "Organize machining templates in a hierarchy matching your part " +
      "families. Create base templates for each material type (aluminum, " +
      "steel, titanium) with appropriate speed/feed defaults. Create " +
      "sub-templates for part categories (housings, shafts, plates) " +
      "that inherit base material parameters but add specific strategies. " +
      "Further specialize for individual part types. Template inheritance " +
      "ensures consistent parameters while allowing per-family " +
      "customization. Update a base template and all children inherit " +
      "the change.",
    category: "automation",
    tags: ["templates", "inheritance", "part-families", "hierarchy"],
    operation_types: ["all"],
    confidence: 0.81,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Machine Simulator Advanced Setup (ec-185 to ec-189) ===
  {
    id: "ec-185",
    title: "Custom Machine Kinematic Model for Simulator Accuracy",
    body: "Build accurate machine kinematic models in Edgecam Simulator " +
      "by defining each axis's travel limits, home positions, and " +
      "joint hierarchy. Import 3D models (STL/Parasolid) for each " +
      "machine component: base, column, spindle head, table, rotary " +
      "axes, tailstock, turret. Assign components to their parent " +
      "axis in the kinematic tree. Define tool change position, " +
      "clearance height, and fixture reference point. Verify by " +
      "homing all axes and checking that the model matches the " +
      "physical machine's home position.",
    category: "simulation",
    tags: ["simulator", "kinematic-model", "machine-model", "axis-limits"],
    operation_types: ["all"],
    confidence: 0.85,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-186",
    title: "Simulator Collision Zone Definition for ATC and Doors",
    body: "Define collision zones in the simulator for components that " +
      "move independently of CNC axes: automatic tool changer arm, " +
      "chip conveyor, machine doors, and pallet changer mechanisms. " +
      "Create simplified STL envelopes for each zone and mark them " +
      "as 'collision body' in the simulator setup. Set collision " +
      "priority: tool-to-part (critical), holder-to-fixture (critical), " +
      "spindle-to-clamp (warning), tool-to-machine (critical). " +
      "Configure different clearance values per zone type.",
    category: "simulation",
    tags: ["simulator", "collision-zones", "atc", "safety"],
    operation_types: ["all"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-187",
    title: "Simulator Material Removal Visualization Resolution",
    body: "Adjust the simulator's material removal resolution for " +
      "balancing accuracy vs performance. Set the voxel resolution " +
      "in the Simulation Settings: 0.1mm for finish verification " +
      "(slow but shows scallops), 0.5mm for general verification " +
      "(good balance), 1.0mm for rapid overview (fast but misses " +
      "detail). For large parts, use zone-based resolution — high " +
      "resolution on critical surfaces, low resolution on rough " +
      "areas. Enable 'section view' to verify internal features " +
      "(bores, internal pockets) during simulation.",
    category: "simulation",
    tags: ["simulator", "material-removal", "resolution", "visualization"],
    operation_types: ["all"],
    confidence: 0.83,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-188",
    title: "Simulator Cycle Time Analysis with Axis Acceleration",
    body: "Enable 'realistic cycle time' mode in the simulator to account " +
      "for axis acceleration, deceleration, and jerk limits. Input " +
      "your machine's specifications: rapid traverse rates (X/Y/Z), " +
      "maximum feed rates, acceleration times (typically 0.1-0.5s " +
      "per axis), and tool change time (3-15s). The simulator then " +
      "provides cycle time estimates within 5-10% of actual machine " +
      "time. Compare estimated vs. actual times to calibrate the " +
      "model — adjust acceleration values until estimates match " +
      "within 5%.",
    category: "simulation",
    tags: ["simulator", "cycle-time", "acceleration", "realistic"],
    operation_types: ["all"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-189",
    title: "Simulator G-Code Verification Mode for Post Validation",
    body: "Use the simulator's G-code verification mode to validate " +
      "posted NC code directly (not just the internal toolpath). " +
      "Import the generated G-code file into the simulator's NC " +
      "reader. The simulator interprets the G-code exactly as the " +
      "CNC controller would, catching post processor errors: wrong " +
      "axis assignments, missing decimal points, incorrect arc " +
      "formats (IJK vs R), and coordinate system issues. This " +
      "second-level verification catches errors that toolpath-level " +
      "simulation misses.",
    category: "simulation",
    tags: ["simulator", "g-code-verification", "post-validation", "nc-reader"],
    operation_types: ["all"],
    confidence: 0.87,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Multi-Pallet Management (ec-190 to ec-193) ===
  {
    id: "ec-190",
    title: "Multi-Pallet Pool Programming for HMC Machines",
    body: "Program multi-pallet pool operations for horizontal machining " +
      "centers by defining each pallet as a separate setup in Edgecam. " +
      "Assign pallet numbers (P1-P6 typical) with unique work coordinate " +
      "systems. Sequence operations pallet-by-pallet or tool-by-tool " +
      "across pallets. The post outputs pallet change codes (M60 or " +
      "manufacturer-specific) between pallet groups. For tool-based " +
      "sequencing across pallets, the machine loads a tool once and " +
      "machines all pallets requiring it before changing tools.",
    category: "cam_strategy",
    tags: ["multi-pallet", "hmc", "pallet-pool", "sequencing"],
    operation_types: ["all"],
    confidence: 0.85,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-191",
    title: "Pallet Change Time Optimization with Pre-Staging",
    body: "Minimize pallet change dead time by programming tool pre-staging. " +
      "In Edgecam's sequence manager, identify the first tool needed " +
      "for the next pallet and insert a 'prepare next tool' command " +
      "before the pallet change. The machine loads the next tool into " +
      "the spindle during the pallet rotation, overlapping the two " +
      "operations. Post processor must output the pre-stage command " +
      "(Tnnn on Fanuc, T= on Siemens) before the pallet change M-code. " +
      "Saves 3-8 seconds per pallet change.",
    category: "cam_strategy",
    tags: ["multi-pallet", "pre-staging", "tool-change", "optimization"],
    operation_types: ["all"],
    confidence: 0.83,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-192",
    title: "Mixed-Part Pallet Programming for Job Shop Flexibility",
    body: "Load different parts on different pallets within the same " +
      "program. In Edgecam, create separate part instances per pallet, " +
      "each with its own toolpath sequence. Use the Sequence Manager " +
      "to optimize tool usage across dissimilar parts — if Pallet 1 " +
      "(housing) and Pallet 2 (bracket) both use a 20mm end mill, " +
      "sequence those operations together. The post generates a single " +
      "program with pallet-conditional branching using macro variables " +
      "to identify which part is on which pallet.",
    category: "cam_strategy",
    tags: ["multi-pallet", "mixed-parts", "job-shop", "optimization"],
    operation_types: ["all"],
    confidence: 0.81,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-193",
    title: "Pallet Probing and Datum Setting Automation",
    body: "Automate pallet datum setting by programming probe routines " +
      "that run after each pallet load. Probe 3 points on a reference " +
      "surface to establish the pallet work coordinate system. Store " +
      "offsets in G54.1 extended work coordinates. For repeated " +
      "production, probe the first cycle to establish offsets and " +
      "reuse for subsequent cycles — only re-probe if part or fixture " +
      "changes. The probe routine compensates for pallet repeatability " +
      "error (typically ±0.005-0.01mm on quality pallet systems).",
    category: "cam_strategy",
    tags: ["multi-pallet", "probing", "datum-setting", "automation"],
    operation_types: ["probing"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Bar Puller and Bar Feeder Programming (ec-194 to ec-197) ===
  {
    id: "ec-194",
    title: "Bar Puller Macro Programming for CNC Lathes",
    body: "Program bar puller operations in Edgecam by inserting custom " +
      "macro calls at part cutoff points. After parting off, the bar " +
      "puller grips the bar remnant and pulls it forward by the part " +
      "length plus cutoff width plus facing stock. Use G65 P-call or " +
      "M-code (machine-specific) to activate the bar puller. Set the " +
      "pull distance as a macro variable: #500 = part_length + " +
      "cutoff_width + face_stock (typically +1-2mm). The collet opens " +
      "during pull and re-clamps automatically.",
    category: "cam_strategy",
    tags: ["bar-puller", "macro", "lathe", "cutoff"],
    operation_types: ["turning"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-195",
    title: "Bar Feeder Integration with Part Counter",
    body: "Configure Edgecam's post processor for bar feeder integration " +
      "with automatic part counting. The post tracks parts machined " +
      "per bar using a counter variable. When count × (part_length + " +
      "cutoff_width) approaches bar length minus remnant, output the " +
      "bar-end sequence: machine last part, eject remnant (M-code), " +
      "feed new bar (M-code), reset counter. Set the remnant length " +
      "to match your collet grip length plus 5-10mm safety margin. " +
      "The post calculates available parts per bar and manages the " +
      "transition automatically.",
    category: "cam_strategy",
    tags: ["bar-feeder", "part-counter", "automation", "post-processor"],
    operation_types: ["turning"],
    confidence: 0.83,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-196",
    title: "Bar Feeder Facing Stock Optimization",
    body: "Minimize bar waste by optimizing facing stock in the Edgecam " +
      "program. After bar pull or bar feed, the cut face has a pip " +
      "(center nub from parting) and potential burr. Program a facing " +
      "cut of 0.3-0.5mm to clean the face — this is the facing stock. " +
      "For precise parts, add a 0.1mm skim cut after rough facing. " +
      "Total bar consumption per part = part_length + cutoff_blade_width " +
      "(1.5-3mm) + facing_stock (0.3-0.5mm). Reducing cutoff blade " +
      "width from 3mm to 1.5mm saves 5-10% material on short parts.",
    category: "cam_strategy",
    tags: ["bar-feeder", "facing-stock", "material-savings", "optimization"],
    operation_types: ["turning"],
    confidence: 0.82,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-197",
    title: "Bar Feeder Lights-Out Operation Safety Programming",
    body: "For unattended bar feeder operation, add safety checks in " +
      "the Edgecam program: tool breakage detection (G65 probe macro " +
      "checking part diameter after each operation), chip wrap detection " +
      "(spindle load monitoring via adaptive feed M-codes), bar-end " +
      "detection (probe touch at expected Z-position), and coolant " +
      "level monitoring (M-code to check coolant sensor). Program " +
      "alarm-and-stop sequences (M00 with message) for each failure " +
      "mode. Set maximum parts-per-tool limits in the tool life " +
      "management system.",
    category: "cam_strategy",
    tags: ["bar-feeder", "lights-out", "safety", "unattended"],
    operation_types: ["turning"],
    confidence: 0.85,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Gear Hobbing and Skiving (ec-198 to ec-201) ===
  {
    id: "ec-198",
    title: "Power Skiving Programming for Internal Gears",
    body: "Program power skiving for internal gears on mill-turn machines " +
      "using Edgecam's synchronized spindle mode. The skiving cutter " +
      "rotates at high speed (synchronous with workpiece rotation) at " +
      "a cross-axis angle (typically 15-25°). Define the gear geometry: " +
      "module, number of teeth, pressure angle, helix angle. Edgecam " +
      "calculates the skiving cutter path from the gear data. Program " +
      "multiple passes with increasing depth (0.05-0.15mm radial per " +
      "pass) to manage cutting forces and tool wear.",
    category: "cam_strategy",
    tags: ["power-skiving", "internal-gear", "mill-turn", "synchronized"],
    operation_types: ["turning", "milling"],
    confidence: 0.80,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-199",
    title: "Gear Hobbing Simulation with Tooth Profile Verification",
    body: "Simulate gear hobbing operations in Edgecam to verify tooth " +
      "profile accuracy before cutting. The simulator shows the " +
      "generated tooth form from the hobbing kinematics (hob rotation " +
      "× workpiece rotation × axial feed). Compare the simulated " +
      "profile against the theoretical involute using the profile " +
      "deviation measurement tool. Verify: profile form deviation " +
      "(ffa), profile slope deviation (fHa), lead form deviation " +
      "(ffb), and lead slope deviation (fHb) against DIN/AGMA " +
      "tolerance class requirements.",
    category: "simulation",
    tags: ["gear-hobbing", "simulation", "tooth-profile", "verification"],
    operation_types: ["turning", "milling"],
    confidence: 0.79,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-200",
    title: "Skiving Cutter Speed Ratio and Synchronization Setup",
    body: "Configure the speed ratio between skiving cutter and workpiece " +
      "in Edgecam based on the gear ratio: N_cutter/N_work = Z_work/" +
      "Z_cutter where Z is number of teeth. For a 48-tooth workpiece " +
      "with a 24-tooth skiving cutter, the ratio is 2:1. Set the " +
      "workpiece speed first (200-500 RPM for steel gears), then " +
      "calculate cutter speed. The post must output electronic gear " +
      "synchronization commands (varies by controller: Fanuc Cs contour, " +
      "Siemens SETMS). Verify synchronization in dry-run before cutting.",
    category: "speeds_feeds",
    tags: ["power-skiving", "speed-ratio", "synchronization", "electronic-gear"],
    operation_types: ["turning", "milling"],
    confidence: 0.78,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-201",
    title: "Gear Deburring Cycles After Hobbing/Skiving",
    body: "Program automated deburring after gear hobbing or skiving " +
      "using Edgecam's chamfer/deburr cycle. Define a deburring tool " +
      "(typically pointed or radius-tipped) and program it to trace " +
      "both faces of each tooth at the gear end-faces. Use the gear " +
      "data (tooth spacing = 360°/Z) to program C-axis indexed " +
      "deburring passes. Set deburr depth to 0.1-0.3mm and chamfer " +
      "angle to 30-45°. For high-volume production, use a deburring " +
      "wheel synchronized to the gear rotation instead of " +
      "single-tooth deburring.",
    category: "cam_strategy",
    tags: ["gear-deburring", "chamfer", "hobbing", "automation"],
    operation_types: ["turning", "milling"],
    confidence: 0.80,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Custom Cycle Creation (ec-202 to ec-205) ===
  {
    id: "ec-202",
    title: "Custom Drilling Cycle for Step-Bore Operations",
    body: "Create a custom cycle in Edgecam for step-bore operations " +
      "that combine multiple diameters in a single tool call. Define " +
      "the cycle parameters: bore diameters (D1, D2, D3), depths " +
      "(Z1, Z2, Z3), and feed rates per diameter. The custom cycle " +
      "generates: rapid to Z_clear, feed to Z1 at F1, bore to D1, " +
      "rapid to Z_clear, feed to Z2 at F2, bore to D2, etc. Store " +
      "as a macro (G65 call) so the CNC executes a single program " +
      "line per step-bore — reducing program size and edit complexity.",
    category: "cam_strategy",
    tags: ["custom-cycle", "step-bore", "macro", "drilling"],
    operation_types: ["drilling", "boring"],
    confidence: 0.82,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-203",
    title: "Custom Thread Milling Cycle with Variable Pitch",
    body: "Build a custom thread milling cycle for variable-pitch threads " +
      "(common in bottle molds and lead screws). Standard canned " +
      "cycles only support constant pitch. Program the custom cycle " +
      "using helical interpolation (G2/G3) with Z-axis feed varying " +
      "as a function of angular position. In Edgecam, use the 'user " +
      "cycle' definition to specify the pitch function (linear, " +
      "polynomial, or tabulated). The post outputs individual arc " +
      "blocks with calculated pitch increments rather than a single " +
      "canned cycle call.",
    category: "cam_strategy",
    tags: ["custom-cycle", "thread-milling", "variable-pitch", "helical"],
    operation_types: ["milling", "threading"],
    confidence: 0.80,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-204",
    title: "Custom Probing Cycle for In-Process Measurement",
    body: "Create custom probing cycles in Edgecam for in-process " +
      "measurement that goes beyond standard probe routines. Define " +
      "multi-point measurement patterns: bore circularity (8-point), " +
      "flatness (grid pattern), parallelism (two-surface comparison). " +
      "Program the probe to write measured values to macro variables, " +
      "calculate deviations, and output results to a data file " +
      "(DPRNT or equivalent). Add conditional logic: if deviation " +
      "exceeds tolerance, execute a correction pass with " +
      "tool-offset adjustment.",
    category: "cam_strategy",
    tags: ["custom-cycle", "probing", "in-process-measurement", "quality"],
    operation_types: ["probing"],
    confidence: 0.83,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-205",
    title: "Custom Tapping Cycle with Torque Monitoring",
    body: "Create a custom tapping cycle that includes torque monitoring " +
      "for tap breakage prevention. Program the tapping operation " +
      "with spindle load monitoring enabled via custom M-codes. Set " +
      "torque thresholds: warning at 70% of tap rated torque, alarm " +
      "at 85%. The custom cycle includes: spindle orient, rapid to " +
      "R-plane, rigid tap at programmed pitch, dwell at bottom (if " +
      "blind hole), reverse out at same pitch. If torque exceeds " +
      "threshold during any stage, execute emergency retract and " +
      "alarm. Log torque values per hole for trend analysis.",
    category: "cam_strategy",
    tags: ["custom-cycle", "tapping", "torque-monitoring", "breakage-prevention"],
    operation_types: ["drilling", "tapping"],
    confidence: 0.81,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Digital Twin Integration (ec-206 to ec-209) ===
  {
    id: "ec-206",
    title: "Digital Twin Bi-Directional Data Flow Setup",
    body: "Configure Edgecam's digital twin integration for bi-directional " +
      "data exchange with the CNC machine. Upload: NC programs, tool " +
      "data, work offsets, and fixture definitions from Edgecam to " +
      "the machine controller. Download: actual cycle times, tool " +
      "life usage, spindle load data, and machine alarms back to " +
      "Edgecam. Use OPC-UA or MTConnect protocols for standardized " +
      "data exchange. Configure polling intervals: 1 second for " +
      "real-time monitoring, 1 minute for historical data collection.",
    category: "automation",
    tags: ["digital-twin", "opc-ua", "mtconnect", "data-exchange"],
    operation_types: ["all"],
    confidence: 0.79,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-207",
    title: "Digital Twin Tool Life Feedback Loop",
    body: "Use digital twin data to create a tool life feedback loop. " +
      "The CNC reports actual cutting time per tool via MTConnect. " +
      "Edgecam's tool management reads this data and updates tool " +
      "life remaining. When remaining life drops below the next " +
      "operation's estimated requirement, Edgecam flags the tool " +
      "for replacement in the setup sheet. Over time, build a " +
      "statistical model of actual tool life vs. programmed tool " +
      "life for each tool/material combination. Use the ratio to " +
      "calibrate future tool life estimates.",
    category: "tool_management",
    tags: ["digital-twin", "tool-life", "feedback-loop", "mtconnect"],
    operation_types: ["all"],
    confidence: 0.78,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-208",
    title: "Digital Twin Machine Accuracy Compensation",
    body: "Leverage digital twin data to compensate for machine geometric " +
      "errors. Collect positioning accuracy data from laser calibration " +
      "or ball-bar tests and store as compensation tables. Import " +
      "compensation data into Edgecam to adjust toolpath coordinates " +
      "pre-emptively — shift programmed positions to counteract known " +
      "machine errors (pitch, yaw, roll of each axis). For thermal " +
      "drift compensation, read machine temperature sensors via the " +
      "digital twin and apply thermal growth coefficients to Z-axis " +
      "tool length offsets.",
    category: "quality",
    tags: ["digital-twin", "accuracy-compensation", "geometric-error", "thermal"],
    operation_types: ["all"],
    confidence: 0.77,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-209",
    title: "Digital Twin Process Monitoring Dashboard",
    body: "Set up a real-time process monitoring dashboard using digital " +
      "twin data from Edgecam-connected machines. Track: machine " +
      "utilization (cutting/idle/setup time), OEE (Overall Equipment " +
      "Effectiveness), tool consumption rates, scrap rates per program, " +
      "and cycle time deviation from estimates. Configure alerts for " +
      "anomalies: cycle time >110% of estimate, spindle load >80% " +
      "rated, tool life exceeded, or machine alarm conditions. Export " +
      "data to BI tools (Power BI, Grafana) for historical analysis " +
      "and trend detection.",
    category: "automation",
    tags: ["digital-twin", "monitoring", "dashboard", "oee"],
    operation_types: ["all"],
    confidence: 0.76,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Statistical Feed Optimization (ec-210 to ec-213) ===
  {
    id: "ec-210",
    title: "Statistical Feed Optimization Using Historical Cycle Data",
    body: "Collect cycle time and surface finish data across production " +
      "runs to statistically optimize feed rates. For each operation, " +
      "record: programmed feed, actual cycle time, measured surface " +
      "finish (Ra), tool wear at end-of-life. Use regression analysis " +
      "to find the feed rate that minimizes cost (balancing cycle time " +
      "vs tool consumption). In Edgecam, create material-operation " +
      "feed tables based on statistical analysis rather than catalog " +
      "recommendations — typically 15-30% more aggressive than " +
      "conservative catalog values.",
    category: "speeds_feeds",
    tags: ["statistical-optimization", "feed-rate", "regression", "cost"],
    operation_types: ["all"],
    confidence: 0.82,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-211",
    title: "Adaptive Feed Control with Spindle Load Monitoring",
    body: "Program adaptive feed control in Edgecam by inserting spindle " +
      "load monitoring M-codes. The CNC controller adjusts feed rate " +
      "in real-time to maintain target spindle load (typically 50-70% " +
      "of rated). In Edgecam's post processor, output the adaptive " +
      "feed activation code at roughing operation start (e.g., Fanuc " +
      "G161/G162, Siemens CFTCP). Set upper limit to prevent tool " +
      "overload (85% max) and lower limit to prevent air-cutting " +
      "dwell (20% min). Adaptive feed typically reduces roughing " +
      "cycle time by 10-25%.",
    category: "speeds_feeds",
    tags: ["adaptive-feed", "spindle-load", "real-time", "monitoring"],
    operation_types: ["roughing"],
    confidence: 0.85,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-212",
    title: "DOE-Based Speed and Feed Optimization Setup",
    body: "Run a Design of Experiments (DOE) on the CNC machine to " +
      "optimize speed and feed systematically. In Edgecam, create " +
      "a test program with parametric speed/feed using macro variables " +
      "(S=#501, F=#502). Define the DOE matrix: 3 levels of speed × " +
      "3 levels of feed × 3 levels of depth = 27 runs (full factorial) " +
      "or 9 runs (Taguchi L9). Measure responses: surface finish, " +
      "tool wear, cutting force. Import results into Edgecam's " +
      "optimization module to generate the Pareto-optimal operating " +
      "point.",
    category: "speeds_feeds",
    tags: ["doe", "optimization", "taguchi", "parametric"],
    operation_types: ["all"],
    confidence: 0.80,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-213",
    title: "Feed Rate Profiling Along Toolpath Curvature",
    body: "Edgecam can vary feed rate along the toolpath based on local " +
      "curvature. Enable 'curvature-based feed' in finishing operations " +
      "to slow down in tight curves and speed up on straight sections. " +
      "Set the minimum feed percentage (typically 40-60% of nominal) " +
      "for the tightest radius. The algorithm uses: F_local = F_nominal " +
      "× min(1.0, R_local / R_threshold) where R_threshold is the " +
      "radius below which feed reduction begins (typically 2-5× tool " +
      "radius). This maintains consistent chip load and surface finish " +
      "quality across varying geometry.",
    category: "speeds_feeds",
    tags: ["feed-profiling", "curvature", "finishing", "chip-load"],
    operation_types: ["finishing"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Stochastic Tool Life Predictions (ec-214 to ec-217) ===
  {
    id: "ec-214",
    title: "Weibull Distribution Tool Life Prediction in Edgecam",
    body: "Model tool life using Weibull distributions rather than fixed " +
      "part counts. Collect failure data for each tool/material pair " +
      "and fit Weibull parameters (shape β, scale η). For β > 1, wear " +
      "failure dominates (predictable); for β < 1, random fracture " +
      "dominates (unpredictable). Set Edgecam tool life to the " +
      "B10 life (10% failure probability): T_B10 = η × (-ln(0.9))^(1/β). " +
      "This ensures 90% reliability while avoiding premature tool " +
      "changes that waste insert life. Typical carbide end mills in " +
      "steel: β = 2.5-3.5.",
    category: "tool_management",
    tags: ["weibull", "tool-life", "stochastic", "reliability"],
    operation_types: ["all"],
    confidence: 0.83,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-215",
    title: "Tool Life Variability Accounting for Batch Material Changes",
    body: "Account for material batch-to-batch variability in tool life " +
      "predictions. Material hardness can vary ±3-5 HRC between " +
      "batches, causing ±30-50% tool life variation. In Edgecam, " +
      "create material sub-grades (e.g., 4140_soft/4140_nominal/" +
      "4140_hard) with different speed/feed tables. When a new " +
      "material batch arrives, test hardness and select the matching " +
      "sub-grade. The tool life prediction then accounts for the " +
      "actual material condition rather than assuming nominal properties.",
    category: "tool_management",
    tags: ["tool-life", "material-variability", "batch", "hardness"],
    operation_types: ["all"],
    confidence: 0.81,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-216",
    title: "Monte Carlo Tool Life Simulation for Job Costing",
    body: "Use Monte Carlo simulation to predict tool consumption for " +
      "job costing. For each tool in the Edgecam program, define: " +
      "mean life and standard deviation (from historical data or " +
      "Weibull fit). Run 1000+ simulations varying tool life randomly " +
      "within the distribution. Output: expected tools consumed per " +
      "batch (mean and 95% confidence interval), probability of " +
      "mid-part tool change (requiring blend mark), and total tooling " +
      "cost distribution. Use the 90th percentile cost for conservative " +
      "job quoting.",
    category: "tool_management",
    tags: ["monte-carlo", "tool-life", "job-costing", "simulation"],
    operation_types: ["all"],
    confidence: 0.79,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-217",
    title: "Real-Time Tool Wear State Estimation for Remaining Life",
    body: "Implement real-time tool wear state estimation by monitoring " +
      "spindle power consumption trends during cutting. As the tool " +
      "wears, cutting force increases and spindle power rises linearly " +
      "(Taylor's extended model). Set up Edgecam's digital twin to " +
      "read spindle power via MTConnect and calculate wear state: " +
      "W = (P_current - P_new) / (P_worn - P_new) where P_worn is " +
      "the power at known end-of-life. Predict remaining life: " +
      "T_remaining = T_total × (1 - W). Update the tool management " +
      "system with remaining life estimates after each part.",
    category: "tool_management",
    tags: ["tool-wear", "real-time", "estimation", "spindle-power"],
    operation_types: ["all"],
    confidence: 0.78,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Process Variability and Tolerance Analysis (ec-218 to ec-221) ===
  {
    id: "ec-218",
    title: "Process Capability Study Setup from Edgecam Programs",
    body: "Use Edgecam probing routines to automate Cp/Cpk data " +
      "collection for process capability studies. Program probe " +
      "measurements at all critical dimensions after machining. " +
      "Output measured values to a CSV file using DPRNT (Fanuc) " +
      "or custom data output M-codes. Collect 30+ samples (per " +
      "AIAG guidelines) for initial capability study. Calculate " +
      "Cp = (USL - LSL) / 6σ and Cpk = min((USL - x̄) / 3σ, " +
      "(x̄ - LSL) / 3σ). Target Cpk ≥ 1.33 for standard and " +
      "≥ 1.67 for safety-critical features.",
    category: "quality",
    tags: ["process-capability", "cpk", "probing", "spc"],
    operation_types: ["probing"],
    confidence: 0.85,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-219",
    title: "Tolerance Stack Analysis for Multi-Setup Machining",
    body: "Analyze tolerance stacking when machining in multiple setups. " +
      "Each setup introduces datum transfer error (typically ±0.01-0.02mm " +
      "with probing). For a dimension spanning two setups, the total " +
      "tolerance budget must include: machining tolerance + datum " +
      "transfer error + fixturing repeatability. In Edgecam, model " +
      "worst-case and RSS (root sum of squares) tolerance stacks. " +
      "If the stack exceeds the drawing tolerance, consider: reducing " +
      "the number of setups, tightening probe routine accuracy, or " +
      "using reference features machined in the same setup as the " +
      "critical dimension.",
    category: "quality",
    tags: ["tolerance-stack", "multi-setup", "datum-transfer", "rss"],
    operation_types: ["all"],
    confidence: 0.84,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-220",
    title: "SPC Alarm Integration with Edgecam Tool Offset Updates",
    body: "Integrate SPC (Statistical Process Control) alarm triggers " +
      "with automatic tool offset compensation. When in-process " +
      "probing detects a dimension trending toward a control limit " +
      "(before exceeding tolerance), automatically update the tool " +
      "wear offset via macro variable. Program the decision logic: " +
      "if measurement deviates >50% of tolerance from nominal, adjust " +
      "offset by the deviation amount. Use EWMA (exponentially weighted " +
      "moving average) rather than individual readings to avoid " +
      "over-correction from measurement noise.",
    category: "quality",
    tags: ["spc", "tool-offset", "auto-compensation", "ewma"],
    operation_types: ["all"],
    confidence: 0.82,
    source: "web:edgecam-forum",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "ec-221",
    title: "Thermal Drift Compensation Using Touch Probe Feedback",
    body: "Compensate for machine thermal growth during long production " +
      "runs by periodic probe checks. Program a reference feature " +
      "measurement (e.g., probe a fixture surface or gauge block) " +
      "every N parts (typically every 5-10 parts or 30-60 minutes). " +
      "Compare the measured position to the nominal. If drift exceeds " +
      "a threshold (0.005-0.01mm), update work offsets automatically " +
      "via macro variables. In Edgecam, insert the probe routine as " +
      "a conditional block triggered by a part counter. This maintains " +
      "tolerances through thermal equilibrium changes.",
    category: "quality",
    tags: ["thermal-drift", "probing", "compensation", "production"],
    operation_types: ["probing"],
    confidence: 0.86,
    source: "web:edgecam-docs",
    created_at: "2026-03-13",
    usage_count: 0
  }
];
