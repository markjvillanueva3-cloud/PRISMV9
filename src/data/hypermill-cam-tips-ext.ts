/**
 * hyperMILL CAM Tribal Knowledge Tips — Extension
 * 43 expert-level tips (hm-118 through hm-160) covering advanced 5-axis,
 * material-specific strategies, and exhaustive science/variability methods.
 * Extends the 117 embedded tips in TribalKnowledgeEngine.ts
 * Generated 2026-03-13
 */
import type { KnowledgeTip } from "../engines/TribalKnowledgeEngine.js";

export const HYPERMILL_CAM_TIPS_EXT: KnowledgeTip[] = [
  // === Advanced 5-Axis and MAXX Machining (hm-118 to hm-130) ===
  {
    id: "hm-118",
    title: "MAXX Machining Roughing with Barrel Cutters",
    body:
      "hyperMILL MAXX Machining roughing uses barrel cutters with large " +
      "effective radius (100-500mm) for 3-5× wider step-over than ball-end " +
      "mills at the same scallop height. Define barrel geometry: barrel " +
      "radius, tip fillet, taper angle. Automatic tilt maintains contact " +
      "zone. Reduces finishing cycle time 60-80%. Verify contact pattern " +
      "in simulation — incorrect tilt causes gouging.",
    category: "cam_strategy",
    tags: ["maxx", "barrel-cutter", "step-over", "scallop"],
    operation_types: ["finishing"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-119",
    title: "MAXX Machining Finishing for Planar Surfaces",
    body:
      "MAXX Finishing uses conical barrel cutters on planar and near-planar " +
      "surfaces for 5-10× wider step-over vs ball-end mills. hyperMILL " +
      "automatically detects suitable planar regions. Set target scallop " +
      "height — the system computes optimal step-over from barrel geometry. " +
      "Not suitable for highly concave regions where the barrel can't " +
      "maintain contact. Best for automotive dies and large mold surfaces.",
    category: "cam_strategy",
    tags: ["maxx-finishing", "conical-barrel", "planar", "step-over"],
    operation_types: ["finishing"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-120",
    title: "5-Axis Swarf Cutting for Ruled Surfaces",
    body:
      "hyperMILL swarf cutting uses tool flute length on ruled surfaces " +
      "in a single pass. 5-10× faster than Z-level for draft walls. " +
      "Verify surface is developable — swarf on doubly-curved surfaces " +
      "gouges. Set tilt limits ±3° from surface normal. hyperMILL's " +
      "collision avoidance auto-tilts when holder interference is detected " +
      "while maintaining swarf contact.",
    category: "cam_strategy",
    tags: ["swarf", "ruled-surface", "draft-wall", "5-axis"],
    operation_types: ["multi_axis"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-121",
    title: "5-Axis Automatic Indexing vs Simultaneous",
    body:
      "hyperMILL automatic indexing (3+2) locks rotary axes per operation. " +
      "Higher rigidity, better accuracy, simpler post. Use when simultaneous " +
      "isn't needed. hyperMILL can automatically determine optimal index " +
      "angles from the geometry. For mold work, 80% of operations can " +
      "use 3+2 — reserve simultaneous for undercuts and complex freeform.",
    category: "cam_strategy",
    tags: ["3-plus-2", "indexing", "automatic", "vs-simultaneous"],
    operation_types: ["multi_axis"],
    confidence: 88,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-122",
    title: "5-Axis Tube Machining for Internal Passages",
    body:
      "hyperMILL tube machining programs internal passages via 5-axis tool " +
      "access. Define centerline and cross-sections. Tool axis follows " +
      "centerline tangent. Verify tool length vs passage depth — holder " +
      "collision is the main risk. Use for cylinder heads, manifolds, " +
      "and mold cooling channels. hyperMILL simulation essential for " +
      "verifying collision-free access.",
    category: "cam_strategy",
    tags: ["tube", "internal-passage", "5-axis", "cooling-channel"],
    operation_types: ["multi_axis"],
    confidence: 84,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-123",
    title: "Lead/Lean Angle Control for Ball-End Finishing",
    body:
      "Set lead 10-15° (forward tilt) and lean 0-5° (sideways) for 5-axis " +
      "ball-end finishing. Moves contact off tool tip (zero surface speed) " +
      "improving finish 30-50%. hyperMILL applies relative to surface " +
      "normal at each point. Monitor axis limits on trunnion machines. " +
      "Lead angle also increases effective cutting speed at contact point.",
    category: "cam_strategy",
    tags: ["lead-lean", "ball-end", "5-axis", "surface-finish"],
    operation_types: ["finishing"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-124",
    title: "5-Axis Geodesic Finishing for Uniform Coverage",
    body:
      "Geodesic follows shortest surface path, producing uniform coverage " +
      "regardless of parameterization. Better than raster on doubly-curved " +
      "surfaces. Set step-over by scallop height. hyperMILL geodesic is " +
      "computation-intensive but produces superior finish quality on " +
      "optical and automotive Class-A surfaces.",
    category: "cam_strategy",
    tags: ["geodesic", "uniform", "freeform", "class-a"],
    operation_types: ["finishing"],
    confidence: 83,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-125",
    title: "Flowline Finishing for Turbine Surfaces",
    body:
      "Flowline follows user-defined curves across surfaces. Define start/ " +
      "end boundaries — hyperMILL interpolates intermediate lines. Ideal " +
      "for turbine blades (hub-to-shroud), aerofoils, automotive panels. " +
      "Step-over perpendicular to flow. Produces directional patterns " +
      "that can improve aerodynamic performance.",
    category: "cam_strategy",
    tags: ["flowline", "turbine", "aerofoil", "directional"],
    operation_types: ["finishing"],
    confidence: 84,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-126",
    title: "5-Axis Deburring and Edge Breaking",
    body:
      "hyperMILL programs automated 5-axis deburring along detected edges. " +
      "Define deburring tool (chamfer/ball), engagement depth, feed. " +
      "Auto-finds edges meeting criteria. 5-axis tool normal for " +
      "consistent contact depth on complex geometry. Sort edges by " +
      "region to minimize rapids. Replaces manual deburring.",
    category: "cam_strategy",
    tags: ["deburring", "edge-breaking", "5-axis", "automated"],
    operation_types: ["finishing"],
    confidence: 84,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-127",
    title: "Machine Simulation with Full Kinematic Model",
    body:
      "hyperMILL VIRTUAL Machining uses complete kinematic chain for " +
      "collision detection. Import machine models from library or create " +
      "custom. Define spindle nose, holder, rotary table, fixtures. Full " +
      "Machine mode for 5-axis catches head/table interference. " +
      "VIRTUAL Machining Center optimizes post-processing and adds " +
      "automatic collision avoidance moves.",
    category: "cam_strategy",
    tags: ["virtual-machining", "kinematics", "collision", "simulation"],
    operation_types: ["setup"],
    confidence: 88,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-128",
    title: "Lollipop Cutter for Undercuts",
    body:
      "Lollipop tools access behind overhangs. Define ball diameter, neck " +
      "diameter/length. 3+2 positioning for access. Verify neck clearance. " +
      "Speed based on ball diameter. hyperMILL checks the complete tool " +
      "assembly during simulation. Eliminates EDM for many undercut " +
      "features in mold cores.",
    category: "cam_strategy",
    tags: ["lollipop", "undercut", "neck-clearance", "mold"],
    operation_types: ["finishing"],
    confidence: 82,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-129",
    title: "Blade Machining for Blisks and Impellers",
    body:
      "hyperMILL blade module handles blisks, impellers, shrouded blades. " +
      "Define hub, shroud, blade, splitter surfaces. Plunge roughing " +
      "between blades, flowline finishing on blade surfaces. Barrel " +
      "cutters for 3-5× wider step-over. Check singularities at " +
      "leading/trailing edges. hyperMILL's 5-axis link moves navigate " +
      "between blades smoothly.",
    category: "cam_strategy",
    tags: ["blade", "blisk", "impeller", "turbomachinery"],
    operation_types: ["specialty"],
    confidence: 85,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-130",
    title: "RTCP/TCPM Configuration for Post Processing",
    body:
      "Configure RTCP in hyperMILL VIRTUAL Machining. Set pivot point " +
      "coordinates precisely — errors cause dimensional errors proportional " +
      "to angular range. Test with small moves first. VIRTUAL Machining " +
      "Center automatically handles RTCP output format for supported " +
      "controllers (Heidenhain, Siemens, Fanuc). Verify against machine " +
      "controller manual.",
    category: "cam_strategy",
    tags: ["rtcp", "tcpm", "virtual-machining", "post-processor"],
    operation_types: ["post_processing"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Material-Specific and Mold/Die (hm-131 to hm-145) ===
  {
    id: "hm-131",
    title: "Hardened Steel Finishing for Mold and Die",
    body:
      "50-62 HRC: CBN or nano-coated ball-end, 100-200 m/min, 0.03-0.06mm " +
      "fz, step-over per target Ra. Air blast only. hyperMILL constant " +
      "scallop for uniform quality. Target Ra 0.4-0.8μm directly from " +
      "machining. MAXX Finishing with barrel cutters reduces polishing " +
      "time by additional 30-50% on suitable surfaces.",
    category: "cam_strategy",
    tags: ["hardened-steel", "cbn", "air-blast", "maxx"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-132",
    title: "Titanium Roughing with Trochoidal Milling",
    body:
      "Ti-6Al-4V: trochoidal 8-10% radial, 1×D axial, 45-60 m/min, " +
      "0.08-0.12mm fz. Through-spindle coolant 70+ bar. AlTiN-coated. " +
      "Never recut chips. hyperMILL HSC roughing maintains constant " +
      "engagement. Monitor spindle load continuously. hyperMILL's " +
      "adaptive feed reduces feed in tight corners automatically.",
    category: "cam_strategy",
    tags: ["titanium", "trochoidal", "constant-engagement", "hsc"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-133",
    title: "Aluminum HSM with Maximum MRR",
    body:
      "6061/7075: 3-flute uncoated, 50% radial, 2×D axial, 300-500 m/min, " +
      "0.15-0.25mm fz. hyperMILL HSC roughing with engagement control. " +
      "MRR 500-1000 cm³/min on high-speed machines. Chip evacuation " +
      "critical. hyperMILL's pocket optimization minimizes air cutting " +
      "on multi-level cavities.",
    category: "cam_strategy",
    tags: ["aluminum", "hsm", "mrr", "hsc"],
    operation_types: ["roughing"],
    confidence: 89,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-134",
    title: "Electrode Machining Workflow",
    body:
      "hyperMILL electrode module: extract geometry from cavity, define " +
      "blank/holder (EROWA/3R), program rough/finish. Undersizing: roughing " +
      "0.3mm, finishing 0.05mm/side. Graphite: no coolant, vacuum extraction. " +
      "Copper: flood coolant. Program datum pads for CMM. hyperMILL " +
      "tracks undersizing per electrode type automatically.",
    category: "cam_strategy",
    tags: ["electrode", "graphite", "copper", "undersizing"],
    operation_types: ["specialty"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-135",
    title: "Steep-Shallow Automatic Strategy Assignment",
    body:
      "hyperMILL auto-detects steep (>65°) and shallow (<65°) regions. " +
      "Z-level for steep, raster/3D-offset for shallow. Overlap 1-2mm " +
      "at boundaries. Same tool for both passes. Saves 30-40% programming " +
      "time. hyperMILL's boundary detection is particularly robust on " +
      "surfaces with varying curvature.",
    category: "cam_strategy",
    tags: ["steep-shallow", "automatic", "boundary", "z-level"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-136",
    title: "Pencil Tracing for Corner Cleanup",
    body:
      "After finishing, pencil trace cleans internal corners/fillets. " +
      "hyperMILL auto-detects concave regions. Ball-end 50-70% of " +
      "smallest fillet radius. Both-ways for symmetric corners halves " +
      "cycle time. Essential transition zone between Z-level and raster " +
      "strategies. Run as final finishing operation.",
    category: "cam_strategy",
    tags: ["pencil", "corners", "cleanup", "concave"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-137",
    title: "Constant Scallop Height Finishing",
    body:
      "Varies step-over by curvature for uniform scallop. Target 0.005mm " +
      "for polish-ready. 20-30% shorter than fixed step-over. Essential " +
      "for mold surfaces. hyperMILL computes local effective radius at " +
      "each point. Combine with MAXX Finishing on flat regions for " +
      "maximum cycle time reduction.",
    category: "cam_strategy",
    tags: ["constant-scallop", "curvature-adaptive", "uniform", "quality"],
    operation_types: ["finishing"],
    confidence: 88,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-138",
    title: "Rib Machining for Deep Thin Features",
    body:
      "hyperMILL rib machining progressively machines deep ribs with " +
      "shorter-to-longer tools maintaining wall support. Set min rib " +
      "width and max projection (5:1 L/D). Anti-vibration carbide for " +
      "L/D > 4:1. hyperMILL calculates intermediate stock levels to " +
      "prevent wall deflection during roughing.",
    category: "cam_strategy",
    tags: ["rib", "thin-wall", "progressive", "deflection"],
    operation_types: ["specialty"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-139",
    title: "Stainless Steel Work-Hardening Prevention",
    body:
      "304/316: coated carbide, 80-120 m/min, 0.08-0.12mm fz. Never dwell " +
      "or feed < 0.04mm/tooth. Climb only. hyperMILL HSC roughing prevents " +
      "intermittent engagement. Flood coolant. Adjust tool life -30% vs " +
      "standard steel. hyperMILL's constant chip load path is essential " +
      "for austenitic stainless.",
    category: "cam_strategy",
    tags: ["stainless", "work-hardening", "climb", "hsc"],
    operation_types: ["roughing"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-140",
    title: "Inconel Roughing with Ceramic Inserts",
    body:
      "Inconel 718: ceramic 200-400 m/min, 0.1-0.15mm fz, 1-2mm DOC. " +
      "No coolant (thermal shock). Air blast only. Tool life 10-20 min " +
      "but MRR 3-5× carbide. hyperMILL constant engagement essential. " +
      "Reserve for roughing only, finish with carbide. Program fixed-time " +
      "tool changes.",
    category: "cam_strategy",
    tags: ["inconel", "ceramic", "no-coolant", "constant-engagement"],
    operation_types: ["roughing"],
    confidence: 84,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-141",
    title: "Composite CFRP/GFRP Trimming",
    body:
      "PCD/diamond compression routers, 200-400 m/min, 0.02-0.05mm fz. " +
      "5-axis tool normal. Vacuum fixturing. Zig only for consistent " +
      "fiber direction. Dust extraction mandatory. hyperMILL programs " +
      "trim curves with automatic approach/retract. Delamination-free " +
      "requires sharp tools + controlled feed.",
    category: "cam_strategy",
    tags: ["composite", "cfrp", "trimming", "pcd"],
    operation_types: ["specialty"],
    confidence: 83,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-142",
    title: "NCJob Templates for Standardized Programming",
    body:
      "hyperMILL NCJob templates capture complete strategies: tools, " +
      "parameters, leads/links, boundaries, sequences. Apply to similar " +
      "parts — hyperMILL remaps geometry automatically. Enforce shop " +
      "standards. Reduce programming 50-70% on repeat geometry. " +
      "Version-control templates for process improvement tracking.",
    category: "cam_strategy",
    tags: ["ncjob", "templates", "standardization", "reuse"],
    operation_types: ["setup"],
    confidence: 88,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-143",
    title: "Surface Extension for Clean Tool Exit",
    body:
      "Extend 2-5mm beyond edges for clean tool exit. hyperMILL creates " +
      "extensions automatically or manually. Tool completes stroke on " +
      "extension before retract. Critical for visible surfaces. Also " +
      "prevents corner radius deviation at part edges. hyperMILL's " +
      "Global Fitting improves surface extension quality.",
    category: "cam_strategy",
    tags: ["surface-extension", "tool-exit", "global-fitting", "quality"],
    operation_types: ["finishing"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-144",
    title: "Progressive Rest Machining",
    body:
      "25mm→12mm→6mm→3mm→1mm. Each references ALL previous tools. " +
      "Min material 0.1mm to skip slivers. Saves 15-25% cycle time. " +
      "hyperMILL IPW tracks actual remaining stock accurately. " +
      "Essential for complex mold cavities with varying pocket depths " +
      "and multiple tool sizes.",
    category: "cam_strategy",
    tags: ["rest-machining", "progressive", "ipw", "efficiency"],
    operation_types: ["roughing"],
    confidence: 88,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-145",
    title: "Cast Iron Dry Machining",
    body:
      "Gray/ductile cast iron: dry or air blast. Short brittle chips. " +
      "Uncoated or TiN carbide, 150-250 m/min, 1.5-2×D DOC. Standard " +
      "offset roughing works. Coolant reduces life via thermal shock. " +
      "hyperMILL's standard roughing strategies are sufficient — no " +
      "need for constant engagement in cast iron.",
    category: "cam_strategy",
    tags: ["cast-iron", "dry", "brittle", "simple"],
    operation_types: ["roughing"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Statistical, Scientific and Variability (hm-146 to hm-160) ===
  {
    id: "hm-146",
    title: "Monte Carlo Cycle Time Estimation",
    body:
      "hyperMILL deterministic cycle time misses variability. Sources: " +
      "feed override (±10%), tool change (±5s), spindle accel, rapid " +
      "settle (±0.3s/move). Monte Carlo gives P50/P75/P95. Typical: " +
      "±8-12% at 95% CI. Use P50 for planning, P95 for delivery. " +
      "MAXX Machining cycle times have lower variance due to more " +
      "predictable engagement patterns.",
    category: "cam_strategy",
    tags: ["monte-carlo", "cycle-time", "variability", "maxx"],
    operation_types: ["optimization"],
    confidence: 80,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-147",
    title: "Weibull Tool Life for Replace-Before-Fail",
    body:
      "Tool life Weibull β=2.5-3.5. Collect 15+ data points. Replace at " +
      "T=η×(-ln(0.95))^(1/β) for 95% survival. For 10mm ball in P20: " +
      "η≈180min, β≈3.0 → replace ~98min. Track in hyperMILL tool " +
      "notes. MAXX Machining's barrel cutters have different Weibull " +
      "parameters — calibrate separately.",
    category: "cam_strategy",
    tags: ["weibull", "tool-life", "reliability", "replacement"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-148",
    title: "Cpk Prediction from Error Budget",
    body:
      "RSS: machine (±0.003mm), tool diameter (±0.005mm), deflection " +
      "(FL³/3EI), thermal (α×ΔT×L), measurement (±0.002mm). For ±0.01mm: " +
      "need total <0.005mm for Cpk≥1.33. Improve largest contributor " +
      "(usually deflection). MAXX barrel cutters have different deflection " +
      "characteristics than ball-end — recalculate for barrel geometry.",
    category: "cam_strategy",
    tags: ["cpk", "error-budget", "rss", "barrel-deflection"],
    operation_types: ["optimization"],
    confidence: 80,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-149",
    title: "Taguchi Robust Design for Stable Machining",
    body:
      "L9: speed, feed, step-over (3 levels). Noise: hardness (±2 HRC), " +
      "wear state. S/N for Ra. Taguchi-optimal maximizes signal-to-noise. " +
      "For hyperMILL MAXX Finishing: apply Taguchi to barrel tilt angle " +
      "and step-over — these are the most sensitive parameters unique " +
      "to barrel cutter strategies.",
    category: "cam_strategy",
    tags: ["taguchi", "robust", "s-n-ratio", "barrel-tilt"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-150",
    title: "Stochastic Chatter Avoidance with Stability Lobes",
    body:
      "Chatter stochastic: damping ±15%, hardness ±5%, overhang ±0.5mm. " +
      "P(chatter) contours via Monte Carlo of stability lobes. Select " +
      "RPM/DOC with P(chatter)<5%. MAXX Machining's barrel cutters " +
      "have different stability characteristics than ball-end — the " +
      "contact pattern affects the regenerative chatter mechanism.",
    category: "cam_strategy",
    tags: ["chatter", "stability-lobes", "probability", "barrel"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-151",
    title: "SPC Control Charts for Production Monitoring",
    body:
      "X-bar/R on critical dims after 25 parts. Trends = wear, shifts = " +
      "fixture, range increase = vibration. MAXX Machining produces more " +
      "consistent scallop heights than ball-end, reducing surface finish " +
      "variation — SPC control limits are tighter. Monitor barrel cutter " +
      "wear pattern separately from conventional tools.",
    category: "cam_strategy",
    tags: ["spc", "x-bar-r", "maxx-consistency", "monitoring"],
    operation_types: ["optimization"],
    confidence: 82,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-152",
    title: "DOE for Finishing Parameter Optimization",
    body:
      "2³ factorial: speed, feed, step-over. Ra, cycle time, wear. " +
      "Speed×feed dominates finish. For hyperMILL MAXX: add barrel " +
      "tilt angle as 4th factor (2⁴ = 16 runs). Tilt×step-over " +
      "interaction is significant for barrel cutters but absent in " +
      "ball-end DOE. Capture this interaction to optimize MAXX.",
    category: "cam_strategy",
    tags: ["doe", "factorial", "maxx-parameters", "tilt-interaction"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-153",
    title: "Kienzle Force Model for Verification",
    body:
      "Fc = kc1.1 × b × h^(1-mc). Verify against spindle rating. If " +
      "Fc > 50% rated torque, reduce DOC or feed. For MAXX barrel " +
      "cutters, the wider engagement produces higher total force than " +
      "ball-end at the same scallop height — verify spindle capacity " +
      "specifically for barrel cutter operations.",
    category: "cam_strategy",
    tags: ["kienzle", "force", "verification", "barrel-force"],
    operation_types: ["optimization"],
    confidence: 82,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-154",
    title: "Taylor Tool Life for Economic Speed",
    body:
      "VT^n=C. V_econ typically 70-80% of max speed. For barrel cutters: " +
      "Taylor constants differ from ball-end mills due to different wear " +
      "mechanisms (wider contact zone distributes wear). Recalibrate " +
      "Taylor for barrel cutters — they typically have different n and " +
      "C values. Don't use ball-end Taylor data for MAXX planning.",
    category: "cam_strategy",
    tags: ["taylor", "economic-speed", "barrel-wear", "recalibrate"],
    operation_types: ["optimization"],
    confidence: 81,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-155",
    title: "Thermal Compensation for Long Operations",
    body:
      "Roughing >3h: Z-drift 0.01-0.03mm. Probe every 90min. Schedule " +
      "finishing during stable thermal windows. hyperMILL VIRTUAL " +
      "Machining can insert probe macro calls at operation boundaries. " +
      "MAXX Finishing's shorter cycle times reduce total thermal " +
      "exposure — fewer compensation cycles needed.",
    category: "cam_strategy",
    tags: ["thermal", "compensation", "probing", "maxx-advantage"],
    operation_types: ["optimization"],
    confidence: 81,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-156",
    title: "Uncertainty Budget for Mold Cavity Dimensions",
    body:
      "RSS: machine (±0.003mm), tool (±0.005mm), deflection (±0.008mm), " +
      "thermal (±0.005mm), measurement (±0.002mm). Total: ±0.012mm. " +
      "MAXX barrel cutters reduce deflection component (stiffer than " +
      "ball-end at equivalent reach) — lower RSS total enables tighter " +
      "tolerances from the same setup.",
    category: "cam_strategy",
    tags: ["uncertainty", "rss", "mold-cavity", "barrel-stiffness"],
    operation_types: ["optimization"],
    confidence: 81,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-157",
    title: "Digital Twin Feedback for Process Improvement",
    body:
      "hyperMILL toolpath → execute → collect data → compare → update. " +
      "10 iterations → ±3% force, ±5% finish. VIRTUAL Machining provides " +
      "the simulation half of the digital twin. Feed back CMM data to " +
      "update hyperMILL parameters. Focus on barrel cutter tilt angle " +
      "calibration — small tilt errors have large finish impact.",
    category: "cam_strategy",
    tags: ["digital-twin", "virtual-machining", "calibration", "feedback"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-158",
    title: "Sobol Sensitivity for MAXX Parameter Ranking",
    body:
      "For MAXX Finishing: tilt angle (Si=0.30, STi=0.40), step-over " +
      "(0.25/0.35), feed (0.20/0.28), speed (0.15/0.20). Tilt angle " +
      "dominates — unique to barrel cutters. Tilt×step-over interaction " +
      "(STi-Si gap) is large. Focus optimization on tilt angle first, " +
      "then step-over. Speed is less sensitive than in ball-end finishing.",
    category: "cam_strategy",
    tags: ["sobol", "maxx-sensitivity", "tilt-dominance", "ranking"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-159",
    title: "Pareto Front Quality vs Cycle Time",
    body:
      "Vary step-over and feed in hyperMILL finishing. Plot Ra vs cycle " +
      "time. MAXX Machining shifts the entire Pareto front to the left — " +
      "better quality AND shorter cycle at every operating point compared " +
      "to ball-end. Quantify the MAXX advantage by comparing Pareto " +
      "fronts to justify barrel cutter investment.",
    category: "cam_strategy",
    tags: ["pareto", "maxx-advantage", "quality", "cycle-time"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-160",
    title: "FMEA and Sensitivity for Risk-Based Optimization",
    body:
      "Per hyperMILL operation: failure modes, effects, RPN=S×O×D. MAXX " +
      "barrel cutters have different failure modes than ball-end: tilt " +
      "error → gouge (high severity), barrel contact loss → air cut " +
      "(medium). Combine FMEA with sensitivity analysis: high-RPN × " +
      "high-Sobol parameters get the most optimization attention. " +
      "For MAXX: tilt angle is both high-RPN and high-sensitivity.",
    category: "cam_strategy",
    tags: ["fmea", "sensitivity", "maxx-risk", "tilt-criticality"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Final Expansion (hm-161 to hm-200) ===
  {
    id: "hm-161",
    title: "Wiener Process for Stochastic Wear",
    body:
      "dVB = μdt + σdW. Predict RUL distribution. Update from " +
      "measurements. For hyperMILL multi-operation programs. MAXX " +
      "barrel cutters have different Wiener parameters than ball-end — " +
      "wider contact zone distributes wear differently. Calibrate " +
      "separately per cutter type.",
    category: "cam_strategy",
    tags: ["wiener", "stochastic", "barrel-wear", "calibration"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-162",
    title: "Gamma Process for Monotonic Degradation",
    body:
      "Monotonic wear — prevents negative wear. RUL = first passage. " +
      "For unattended hyperMILL mold finishing where in-cut failure " +
      "scraps expensive components. Gamma is physically more realistic " +
      "for wear than Wiener. Use for tool change interval planning.",
    category: "cam_strategy",
    tags: ["gamma-process", "monotonic", "unattended", "mold"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-163",
    title: "Copula for Dependent Failure Modes",
    body:
      "Flank/crater/chipping correlated. Gaussian copula models joint " +
      "distribution. Ignoring dependence underestimates 15-25%. For " +
      "MAXX barrel cutters: tilt-induced wear pattern creates unique " +
      "failure mode correlations not seen in ball-end mills.",
    category: "cam_strategy",
    tags: ["copula", "dependent", "barrel-failures", "joint"],
    operation_types: ["optimization"],
    confidence: 75,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-164",
    title: "BMA for Robust Life Prediction",
    body:
      "Weight Taylor/Archard/empirical by posterior. For hyperMILL " +
      "shops with diverse materials. BMA adapts weights per material " +
      "class. MAXX barrel cutters need separate BMA from ball-end — " +
      "different wear physics means different model weights.",
    category: "cam_strategy",
    tags: ["bma", "multi-model", "barrel-separate", "robust"],
    operation_types: ["optimization"],
    confidence: 75,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-165",
    title: "Mutual Information for SPC Feature Selection",
    body:
      "I(X;Y) selects top features with highest quality dependence. " +
      "3-5 features capture 90% of information. For hyperMILL mold " +
      "production: Ra, profile accuracy, concentricity typically highest " +
      "MI. Reduces false alarms from monitoring irrelevant features.",
    category: "cam_strategy",
    tags: ["mutual-information", "spc", "feature-selection", "mold"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-166",
    title: "Renewal Theory Optimal Replacement",
    body:
      "Minimize C(T) = (Cp + Cf×F(T)) / (T×R(T) + M×F(T)). For mold " +
      "work: Cf >> Cp (scrapped mold component). Replace early. MAXX " +
      "barrel cutters: higher tool cost (Cp) but even higher Cf means " +
      "optimal replacement is still early. Track economics per job type.",
    category: "cam_strategy",
    tags: ["renewal-theory", "replacement", "barrel-cost", "mold-economics"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-167",
    title: "Chance-Constrained Process Design",
    body:
      "P(Ra ≤ spec) ≥ 95% while minimizing cycle. For MAXX: tilt " +
      "angle uncertainty has large Ra impact. Convert: μ + z×σ ≤ spec " +
      "with tilt contribution to σ. Ensures reliability. hyperMILL " +
      "VIRTUAL Machining validates tilt consistency.",
    category: "cam_strategy",
    tags: ["chance-constrained", "tilt-uncertainty", "reliability", "virtual"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-168",
    title: "Exergy Analysis for Sustainable Machining",
    body:
      "Exergy destruction = T₀×S_gen. Cutting 70%, friction 15%, " +
      "deformation 10%, coolant 5%. MAXX barrel cutters: wider cut " +
      "= more material per pass = better exergy efficiency per unit " +
      "removed. Compare barrel vs ball-end exergy to quantify " +
      "sustainability benefit of MAXX Machining.",
    category: "cam_strategy",
    tags: ["exergy", "sustainability", "barrel-efficiency", "comparison"],
    operation_types: ["optimization"],
    confidence: 75,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-169",
    title: "Gutowski Energy Benchmarking",
    body:
      "P = P₀ + k×MRR. e = P₀/MRR + k. Maximize MRR within limits. " +
      "MAXX finishing at wider step-over covers more area per pass — " +
      "effectively higher MRR for same scallop height. More energy-" +
      "efficient than ball-end finishing. Quantify savings for green " +
      "manufacturing certification.",
    category: "cam_strategy",
    tags: ["gutowski", "energy", "maxx-mrr", "green-manufacturing"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-170",
    title: "Flat Area Detection for MAXX Strategy",
    body:
      "hyperMILL detects flat areas (5-10° threshold). MAXX Finishing " +
      "barrel cutters are most effective on flat and gently curved " +
      "regions. Use flat detection to automatically assign MAXX to " +
      "suitable regions and ball-end to highly curved regions. " +
      "Hybrid strategy maximizes cycle time reduction.",
    category: "cam_strategy",
    tags: ["flat-detection", "maxx-assignment", "hybrid-strategy", "auto"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-171",
    title: "Rotary Axis Wrapping for 4-Axis Parts",
    body:
      "Wrap 2D patterns onto cylinders via rotary substitution. " +
      "Verify diameter matches. For engraving on round mold components. " +
      "hyperMILL generates rotary G-code automatically. Circumferential " +
      "scale distortion if diameter wrong by even 0.1mm.",
    category: "cam_strategy",
    tags: ["rotary-wrap", "4-axis", "engraving", "cylindrical"],
    operation_types: ["multi_axis"],
    confidence: 84,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-172",
    title: "Trochoidal Milling for Hard Material Slots",
    body:
      "8-15% radial, full depth, 3-5× feed. Constant engagement. " +
      "Slot width independent of tool. For >45 HRC. hyperMILL HSC " +
      "roughing handles trochoidal. Work-free chips improve tool life " +
      "by preventing re-cutting of work-hardened material.",
    category: "cam_strategy",
    tags: ["trochoidal", "hard-materials", "hsc", "work-free-chips"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-173",
    title: "Helical Milling for Precision Holes",
    body:
      "Circular + Z-feed. One tool for multiple sizes. No burr, lower " +
      "forces. Flat-end 60-70% of hole. Pitch 0.3-0.5mm. Superior " +
      "for hardened steel. hyperMILL helical milling operation handles " +
      "geometry and feeds automatically.",
    category: "cam_strategy",
    tags: ["helical", "precision-holes", "burr-free", "multi-size"],
    operation_types: ["drilling"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-174",
    title: "Plunge Roughing for Deep Narrow Features",
    body:
      "Vertical motions, 60-70% step-over. Axial forces (strongest). " +
      "For L/D>4, >45 HRC, weak spindles. hyperMILL generates efficient " +
      "patterns. Use when lateral roughing vibrates on deep thin ribs. " +
      "Follow with light finishing passes.",
    category: "cam_strategy",
    tags: ["plunge", "deep-ribs", "axial", "vibration"],
    operation_types: ["roughing"],
    confidence: 84,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-175",
    title: "Disc Cutter for Slots",
    body:
      "Define disc geometry precisely. 3+2 per slot. Speed on outer " +
      "diameter. High tooth count = low fpt. Flood for evacuation. " +
      "More consistent width than end mills. hyperMILL VIRTUAL " +
      "Machining simulates disc operations with full machine model.",
    category: "cam_strategy",
    tags: ["disc-cutter", "slot", "consistent-width", "virtual"],
    operation_types: ["roughing"],
    confidence: 82,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-176",
    title: "Spiral Finishing for Flat Surfaces",
    body:
      "Continuous spiral eliminates witness marks. Step-over per " +
      "scallop. Climb milling. Auto center-start. Best for shutoff " +
      "faces and flat mold surfaces. Combine with MAXX Finishing on " +
      "larger flat regions for maximum cycle reduction.",
    category: "cam_strategy",
    tags: ["spiral", "flat", "witness-marks", "maxx-combine"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-177",
    title: "Facing with Wiper Inserts",
    body:
      "65-75% step-over, one-way, wiper for mirror finish. Interrupted: " +
      "-20% feed. Parting surface flatness ±0.01mm. hyperMILL facing " +
      "handles irregular stock and avoids clamps. Critical for mold " +
      "shut-off quality and sealing performance.",
    category: "cam_strategy",
    tags: ["facing", "wiper", "parting-surface", "flatness"],
    operation_types: ["roughing"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-178",
    title: "Pocket with Progressive Island Detection",
    body:
      "Auto-detect islands. Progressive level cutting. 15-25% savings. " +
      "Review detection — thin ribs occasionally missed. Set min " +
      "material filter. hyperMILL IPW tracks stock accurately between " +
      "progressive operations. Validate island list before generating.",
    category: "cam_strategy",
    tags: ["pocket", "islands", "progressive", "ipw-tracking"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-179",
    title: "Rapid Height Optimization",
    body:
      "Incremental (10mm above stock) vs absolute. Safe-area rapids " +
      "when crossing obstacles only. 5-15% savings. Per-operation. " +
      "Verify in VIRTUAL Machining. Critical for complex mold cavities " +
      "with varying pocket depths.",
    category: "cam_strategy",
    tags: ["rapid-height", "incremental", "virtual-verify", "savings"],
    operation_types: ["optimization"],
    confidence: 85,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-180",
    title: "Tolerance Settings Best Practices",
    body:
      "Roughing 0.1mm, semi 0.02mm, finishing 0.005-0.01mm. For " +
      "hardened finishing: 0.005mm + constant scallop = polishing-" +
      "ready. Don't over-relax. MAXX barrel: may need tighter tolerance " +
      "due to curvature sensitivity of barrel contact zone.",
    category: "cam_strategy",
    tags: ["tolerance", "chord-error", "barrel-sensitivity", "best-practice"],
    operation_types: ["roughing", "finishing"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-181",
    title: "Workplane Naming Convention",
    body:
      "OP10-Top, OP20-FrontFace, OP30-SlideAccess. Active per " +
      "operation. Probe at setup start. Standard naming enables any " +
      "operator. hyperMILL setup documentation auto-includes WCS, " +
      "fixture diagrams, critical dimension callouts.",
    category: "cam_strategy",
    tags: ["workplane", "naming", "standardization", "documentation"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-182",
    title: "Boundary Boolean for Selective Machining",
    body:
      "Create from edges, silhouettes, sketches, steep/shallow. " +
      "Boolean union/intersection/subtraction. 0.5mm extension. Named " +
      "sets. 20-40% cycle reduction on rework. hyperMILL supports " +
      "complex boundary chains for targeted finishing of specific zones.",
    category: "cam_strategy",
    tags: ["boundary", "boolean", "selective", "rework"],
    operation_types: ["roughing", "finishing"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-183",
    title: "CAD Surface Repair for Imported Models",
    body:
      "Close gaps to 0.1mm, extend surfaces, rebuild degenerate. " +
      "Fix before programming. UV continuity affects toolpath. " +
      "Parting surfaces need G2 minimum. hyperMILL surface analysis " +
      "identifies issues. Global Fitting improves surface quality " +
      "post-import.",
    category: "cam_strategy",
    tags: ["cad-repair", "global-fitting", "uv-direction", "g2"],
    operation_types: ["setup"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-184",
    title: "Chamfering with Edge Detection",
    body:
      "hyperMILL edge detection automates chamfer paths. 45/60/90° " +
      "mills, ball-end, spot drills. 3D chamfers: 5-axis normal. " +
      "Verify width. Standard 0.3-0.5mm on all edges for flash " +
      "prevention and operator safety. Mold longevity depends on " +
      "proper edge treatment.",
    category: "cam_strategy",
    tags: ["chamfering", "edge-detection", "flash", "longevity"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-185",
    title: "Thickness Allowance for Progressive Machining",
    body:
      "Roughing 0.5mm, semi 0.15mm, finish 0.0mm. Hardened: " +
      "0.3→0.15→0.05→0.0mm. 40-60% longer tool life. hyperMILL " +
      "IPW tracks remaining material accurately. MAXX barrel finish " +
      "operates on the final pass with zero allowance.",
    category: "cam_strategy",
    tags: ["thickness", "progressive", "tool-life", "barrel-finish"],
    operation_types: ["roughing", "finishing"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-186",
    title: "Multi-Setup Alignment Verification",
    body:
      "Master coordinate across setups. Probe at start. Precision " +
      "dowels or 3-2-1. Alignment accuracy determines feature " +
      "relationships. hyperMILL VIRTUAL Machining verifies alignment " +
      "impact on final accuracy before committing to physical setup.",
    category: "cam_strategy",
    tags: ["multi-setup", "alignment", "virtual-verify", "probing"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-187",
    title: "Probing for In-Process Quality",
    body:
      "Probe stock, WCS, dims between operations. Renishaw/Heidenhain/" +
      "Blum output. Store for SPC. Verify rough allowance before semi-" +
      "finish to prevent overload. hyperMILL post generates probe " +
      "macros in machine-specific format automatically.",
    category: "cam_strategy",
    tags: ["probing", "in-process", "spc", "overload-prevention"],
    operation_types: ["setup"],
    confidence: 85,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-188",
    title: "Tool Library with Presetter Sync",
    body:
      "Geometry, holders, parameters per material. Sync Zoller/Haimer. " +
      "Actual vs nominal 0.01mm matters. Update after presetting. " +
      "Shared library across programmers. Export to setup sheets. " +
      "Track life per serial for Weibull calibration.",
    category: "cam_strategy",
    tags: ["tool-library", "presetter", "sync", "serial-tracking"],
    operation_types: ["setup"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-189",
    title: "Collision with Full Assembly in VIRTUAL Machining",
    body:
      "Include shank, holder, taper, spindle + 0.5mm margin. Gouge " +
      "check every finish. VIRTUAL Machining catches machine-level " +
      "interference. Shrink-fit for min profile. Extended: 50% feed " +
      "at 7:1 L/D. Mandatory for 5-axis first-article.",
    category: "cam_strategy",
    tags: ["collision", "virtual-machining", "full-assembly", "mandatory"],
    operation_types: ["roughing", "finishing"],
    confidence: 88,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-190",
    title: "Multi-Machine Post Flexibility",
    body:
      "Post same hyperMILL toolpath for different machines. Program " +
      "once, post for DMG/Hermle/Makino. VIRTUAL Machining Center " +
      "handles machine-specific RTCP, axis naming, retracts. Enables " +
      "flexible scheduling across shop floor.",
    category: "cam_strategy",
    tags: ["multi-machine", "virtual-machining-center", "flexibility", "rtcp"],
    operation_types: ["post_processing"],
    confidence: 85,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-191",
    title: "ERP Integration via hyperMILL API",
    body:
      "Automate: job import, project creation, template application, " +
      "post, export. Batch overnight. Sync tool libraries. hyperMILL " +
      "CONNECTED Machining enables direct communication with machine " +
      "controllers for setup data transfer.",
    category: "cam_strategy",
    tags: ["api", "erp", "connected-machining", "batch"],
    operation_types: ["setup"],
    confidence: 82,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-192",
    title: "Feature Recognition for Hole Automation",
    body:
      "Recognize through/blind/countersink/counterbore/tapped. Batch " +
      "assign canned cycles. Sort by diameter. Tolerance 0.01mm. " +
      "hyperMILL feature technology automates the entire hole-making " +
      "process from feature recognition to NC output.",
    category: "cam_strategy",
    tags: ["feature-recognition", "holes", "feature-technology", "batch"],
    operation_types: ["drilling"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-193",
    title: "Additive DED for Mold Repair",
    body:
      "hyperMILL Additive: DED contour+fill, 30-50% overlap, 60-80% " +
      "layer. Interleave machining every 3-5 layers. For worn mold " +
      "surfaces, damaged edges, conformal cooling additions. Reduces " +
      "lead time vs new mold from 8 to 2 weeks.",
    category: "cam_strategy",
    tags: ["additive", "ded", "mold-repair", "lead-time"],
    operation_types: ["additive"],
    confidence: 81,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-194",
    title: "Wire EDM Hybrid for Thin Slots",
    body:
      "Export hyperMILL geometry to wire EDM for thin slots, sharp " +
      "corners, hardened inserts. Define start holes, drill during " +
      "milling. Coordinate WCS. Each process where it excels. Hybrid " +
      "reduces lead time 20-30% on complex molds.",
    category: "cam_strategy",
    tags: ["wire-edm", "hybrid", "thin-slots", "coordination"],
    operation_types: ["setup"],
    confidence: 82,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-195",
    title: "Surface Extension for Clean Exit",
    body:
      "Extend 2-5mm for clean exit. hyperMILL creates extensions " +
      "automatically. Global Fitting improves extension quality. " +
      "Prevents deceleration marks and corner deviation. Mandatory " +
      "on visible surfaces and Class-A automotive die faces.",
    category: "cam_strategy",
    tags: ["extension", "global-fitting", "class-a", "mandatory"],
    operation_types: ["finishing"],
    confidence: 86,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-196",
    title: "Cloud Tool Library for Multi-Site",
    body:
      "Multi-site tool library sharing. When one site optimizes, " +
      "improvement propagates. Approved parameters with review. " +
      "Track tool life/Ra/Cpk per site. Prevents re-learning optimal " +
      "parameters. hyperMILL Connected supports tool data exchange.",
    category: "cam_strategy",
    tags: ["cloud", "multi-site", "connected", "propagation"],
    operation_types: ["setup"],
    confidence: 82,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-197",
    title: "Volumetric Accuracy Compensation",
    body:
      "Import machine 21-error map, hyperMILL adjusts coordinates. " +
      "For large dies (1m+) where errors compound. ±0.03mm → ±0.01mm. " +
      "Requires calibration. VIRTUAL Machining stores compensation " +
      "data in the virtual machine model for accurate simulation.",
    category: "cam_strategy",
    tags: ["volumetric", "compensation", "virtual-machine", "calibration"],
    operation_types: ["optimization"],
    confidence: 82,
    source: "web:hypermill-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-198",
    title: "MTConnect Data Integration",
    body:
      "Stream spindle load, positions, feed override. Compare actual " +
      "vs hyperMILL programmed feeds. Find deceleration zones. Data-" +
      "driven refinement 3-5× faster. Use to optimize MAXX Finishing " +
      "tilt angle from actual vs predicted contact pattern data.",
    category: "cam_strategy",
    tags: ["mtconnect", "data-driven", "tilt-optimization", "monitoring"],
    operation_types: ["optimization"],
    confidence: 81,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-199",
    title: "Digital Twin Feedback with VIRTUAL Machining",
    body:
      "hyperMILL toolpath → VIRTUAL Machining simulation → machine " +
      "execution → collect data → compare → update. 10 iterations " +
      "→ ±3% force, ±5% finish. Focus on barrel tilt calibration. " +
      "Small tilt errors have large finish impact with MAXX cutters.",
    category: "cam_strategy",
    tags: ["digital-twin", "virtual-machining", "tilt-calibration", "convergence"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "hm-200",
    title: "Sensitivity Ranking: MAXX vs Ball-End Differences",
    body:
      "Ball-end: step-over 35%, feed 25%, speed 20%, DOC 15%. MAXX " +
      "barrel: tilt angle 30%, step-over 25%, feed 20%, speed 15%. " +
      "Tilt angle replaces step-over as #1 for MAXX. Different " +
      "optimization strategies for different cutter types. Apply " +
      "correct ranking per hyperMILL strategy selection.",
    category: "cam_strategy",
    tags: ["sensitivity", "maxx-vs-ball", "tilt-primary", "ranking"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:hypermill-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
];
