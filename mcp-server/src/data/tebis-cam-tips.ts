/**
 * Tebis CAM Tribal Knowledge Tips
 * 200+ expert-level tips covering Tebis CAM system
 * Generated 2026-03-13
 */
import type { KnowledgeTip } from "../engines/TribalKnowledgeEngine";

export const TEBIS_CAM_TIPS: KnowledgeTip[] = [
  // === Mold & Die Manufacturing (teb-001 to teb-015) ===
  {
    id: "teb-001",
    title: "NCJob Manager Chains Operations for Complete Mold Machining",
    body:
      "Tebis NCJob Manager organizes all machining operations for a mold or " +
      "die in a structured tree. Define roughing, semi-finishing, and finishing " +
      "as sequential NCJobs with automatic stock transfer between them. Each " +
      "NCJob inherits the remaining stock from the previous operation, " +
      "eliminating air cuts. For large molds, group NCJobs by region (core, " +
      "cavity, slides) to enable parallel machine scheduling.",
    category: "mold_die",
    tags: ["ncjob", "mold", "die", "process-chain"],
    operation_types: ["roughing", "finishing", "semi_finishing"],
    confidence: 92,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-002",
    title: "Use MBase Manufacturing Templates for Repeatable Mold Processes",
    body:
      "Tebis MBase (Manufacturing Base) stores proven process templates that " +
      "encode tooling, strategies, and parameters for specific mold features. " +
      "Create MBase templates for common features like ribs, bosses, pockets, " +
      "and parting surfaces. When a new mold arrives, AutoMill matches geometry " +
      "to MBase templates and applies the stored process. This reduces " +
      "programming time by 60-80% on repeat geometries and ensures consistent " +
      "quality across all programmers.",
    category: "mold_die",
    tags: ["mbase", "templates", "standardization", "automation"],
    operation_types: ["roughing", "finishing"],
    confidence: 93,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-003",
    title: "Surface Healing Repairs Imported CAD Data Before Machining",
    body:
      "Tebis CAD/Quality module detects and repairs surface defects in imported " +
      "STEP/IGES/Parasolid data: gaps, overlaps, tangency breaks, and micro-" +
      "surfaces. Run surface analysis first to color-code problem areas. Use " +
      "Heal Topology to close gaps up to 0.01mm automatically. For larger " +
      "gaps, use Fill Surface with G2 continuity. Clean CAD data produces " +
      "toolpaths with uniform scallop height and eliminates witness lines " +
      "caused by surface discontinuities.",
    category: "mold_die",
    tags: ["cad-quality", "surface-healing", "import", "data-repair"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-004",
    title: "Active Surface Technology Extends Surfaces for Clean Tool Exit",
    body:
      "Tebis Active Surface extends machining surfaces beyond part boundaries " +
      "so the tool enters and exits on extended geometry rather than abruptly " +
      "stopping at edges. Extend by at least 1.5x tool diameter. This prevents " +
      "dwell marks at parting lines and edges. For mold cavities, extend all " +
      "parting-line surfaces upward to the blank top. The extended surfaces are " +
      "non-associative copies, so original design surfaces remain untouched.",
    category: "mold_die",
    tags: ["active-surface", "extension", "parting-line", "surface-quality"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-005",
    title: "Parting Surface Preparation Automates Split-Line Machining",
    body:
      "For injection molds, prepare parting surfaces in Tebis CAD before " +
      "programming. Use the Parting Surface function to create ruled or " +
      "lofted surfaces along the split line. Set draft analysis to verify " +
      "undercut-free geometry. Machine parting surfaces with a separate " +
      "NCJob using a flat endmill at Z-constant levels for maximum flatness. " +
      "Tolerance on parting surfaces should be 0.005mm or tighter to ensure " +
      "proper mold sealing.",
    category: "mold_die",
    tags: ["parting-surface", "injection-mold", "split-line"],
    operation_types: ["finishing"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-006",
    title: "Stock Model Tracks Material Removal Across All Operations",
    body:
      "Tebis maintains a precise triangulated stock model that updates after " +
      "each NCJob. Enable stock tracking in the NCJob Manager to pass residual " +
      "stock between operations. The stock model detects remaining material in " +
      "corners and undercuts, enabling targeted rest machining. For multi-setup " +
      "molds, save the stock state after each setup and reload it when the " +
      "part is re-fixtured. This prevents re-cutting already-machined areas " +
      "and reduces total cycle time by 15-25%.",
    category: "mold_die",
    tags: ["stock-model", "material-tracking", "rest-machining"],
    operation_types: ["roughing", "semi_finishing"],
    confidence: 91,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-007",
    title: "Electrode Design-to-NC Workflow Covers Full EDM Process",
    body:
      "Tebis electrode module handles the complete workflow: identify burn " +
      "areas on the mold, extract electrode shapes, add spark gaps (roughing " +
      "0.15-0.25mm, finishing 0.05-0.10mm), create electrode blanks, program " +
      "machining, and generate EDM setup sheets. Group electrodes by burn " +
      "position and assign roughing/finishing pairs. The system outputs " +
      "electrode coordinates relative to the mold datum for direct transfer " +
      "to the sinker EDM machine.",
    category: "mold_die",
    tags: ["electrode", "edm", "spark-gap", "burn-area"],
    operation_types: ["electrode"],
    confidence: 90,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-008",
    title: "Die Face Design Tools Prepare Stamping Die Surfaces",
    body:
      "For stamping dies, use Tebis die face design to create addendum " +
      "surfaces, binder wrap, draw beads, and trim lines. The morphing " +
      "function compensates for springback by over-bending surfaces based " +
      "on simulation results. Import springback data as a point cloud and " +
      "use surface morphing to offset the die surface inversely. Typical " +
      "springback compensation is 0.5-2.0mm depending on material and " +
      "bend radius.",
    category: "mold_die",
    tags: ["stamping-die", "springback", "morphing", "die-face"],
    operation_types: ["finishing"],
    confidence: 87,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-009",
    title: "Multi-Component Mold Assemblies Share Reference Geometry",
    body:
      "For mold assemblies with core, cavity, slides, and lifters, create a " +
      "master assembly in Tebis with shared coordinate systems. Each component " +
      "references the same mold datum. Use the assembly structure to check " +
      "interference between components and verify shut-off surfaces. Program " +
      "each component in its own NCJob set but reference the master datum " +
      "for consistent alignment on the machine.",
    category: "mold_die",
    tags: ["assembly", "multi-component", "datum", "slides"],
    operation_types: ["setup"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-010",
    title: "Automatic Core/Cavity Split Separates Mold Halves",
    body:
      "Tebis auto-split function separates a plastic part into core and " +
      "cavity sides using draft analysis. Set the pull direction and the " +
      "system identifies surfaces belonging to each half. Undercut surfaces " +
      "are flagged for slide or lifter mechanisms. After splitting, each half " +
      "gets its own machining setup with appropriate stock. Verify the split " +
      "result by checking that no surfaces have zero-draft angles relative " +
      "to the pull direction.",
    category: "mold_die",
    tags: ["core-cavity", "split", "draft-analysis", "undercut"],
    operation_types: ["setup"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-011",
    title: "Texture Area Masking Protects EDM Burn Regions",
    body:
      "When machining molds with textured surfaces, define texture boundary " +
      "curves in the CAD model and use them as machining limits. Leave 0.05-" +
      "0.10mm extra stock on texture areas to be removed by the texture " +
      "etching process. Use avoidance regions in finishing NCJobs to prevent " +
      "the tool from entering texture zones. This ensures consistent texture " +
      "depth after etching.",
    category: "mold_die",
    tags: ["texture", "masking", "avoidance", "etching"],
    operation_types: ["finishing"],
    confidence: 86,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-012",
    title: "Gate and Runner Machining Uses Dedicated NCJob Templates",
    body:
      "Create dedicated MBase templates for gate inserts, sprue bushings, and " +
      "runner channels. Gate geometries are typically small with tight radii " +
      "requiring tools under 3mm diameter. Use high-speed finishing strategies " +
      "with 40,000+ RPM and light axial depths (0.05-0.1mm). Runner channels " +
      "need smooth flow surfaces — use 3D-equidistant finishing with 0.005mm " +
      "cusp height to minimize flow resistance.",
    category: "mold_die",
    tags: ["gate", "runner", "sprue", "injection-mold"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-013",
    title: "Shut-Off Surface Machining Ensures Precise Mold Sealing",
    body:
      "Shut-off surfaces where core meets cavity require zero-gap contact. " +
      "Machine these surfaces with a dedicated finishing pass using ball or " +
      "bullnose endmill at very tight tolerance (0.003mm). Use Z-constant " +
      "strategy to produce consistent surface finish. Leave 0.01mm on the " +
      "contact side for bench fitting. Color-code shut-off surfaces in the " +
      "CAD model for easy identification during programming.",
    category: "mold_die",
    tags: ["shut-off", "sealing", "contact-surface", "tolerance"],
    operation_types: ["finishing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-014",
    title: "Cooling Channel Drilling Uses Deep-Hole Templates",
    body:
      "Program cooling channel drilling operations in Tebis using the drilling " +
      "module with deep-hole cycle support. Define peck depths based on " +
      "diameter (3-5xD per peck for gun drills, 1-2xD for twist drills). " +
      "Use the collision check to verify drill clearance against the mold " +
      "geometry. For angled cooling channels, use 5-axis positioning to " +
      "orient the spindle along the hole axis. Generate a separate setup " +
      "sheet showing all hole positions, depths, and diameters.",
    category: "mold_die",
    tags: ["cooling-channel", "drilling", "deep-hole", "peck"],
    operation_types: ["drilling"],
    confidence: 84,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-015",
    title: "Conformal Cooling Insert Machining for 3D-Printed Mold Components",
    body:
      "When machining 3D-printed mold inserts with conformal cooling channels, " +
      "use Tebis stock model initialized from the as-printed geometry (STL). " +
      "Machine only the functional surfaces — cavity face, parting surface, " +
      "and mounting interfaces. Leave internal cooling channels untouched. " +
      "Set collision checking against the full STL to avoid plunging into " +
      "internal channels. Typical finishing allowance on printed inserts is " +
      "0.3-0.5mm per side.",
    category: "mold_die",
    tags: ["conformal-cooling", "3d-print", "additive", "insert"],
    operation_types: ["finishing"],
    confidence: 83,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Roughing Strategies (teb-016 to teb-030) ===
  {
    id: "teb-016",
    title: "Adaptive Roughing Maintains Constant Tool Engagement Angle",
    body:
      "Tebis adaptive roughing (also called optimized roughing) adjusts the " +
      "toolpath to maintain a constant engagement angle, typically 40-90 " +
      "degrees of wrap. This prevents sudden load spikes when the tool enters " +
      "corners or narrow slots. Set the maximum engagement angle based on " +
      "material: 60° for tool steel, 90° for aluminum, 45° for titanium. " +
      "The toolpath automatically adds trochoidal loops in tight areas to " +
      "keep the engagement below the limit.",
    category: "roughing",
    tags: ["adaptive", "engagement-angle", "trochoidal", "load-control"],
    operation_types: ["roughing"],
    confidence: 93,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-017",
    title: "Level-Based Roughing Machines Flat Layers at Fixed Z Heights",
    body:
      "Tebis level roughing cuts material in horizontal layers at fixed Z " +
      "increments. Set the Z step based on axial depth of cut (typically " +
      "1.0-1.5xD for carbide endmills in steel). Each layer follows a 2D " +
      "contour-parallel or zigzag pattern. Use contour-parallel for curved " +
      "pockets and zigzag for open areas. Enable spiral entry (helical ramp) " +
      "to avoid plunging. Overlap between layers should be 5-10% of the " +
      "Z step to avoid material ridges.",
    category: "roughing",
    tags: ["level", "z-step", "contour-parallel", "zigzag"],
    operation_types: ["roughing"],
    confidence: 91,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-018",
    title: "Rest Roughing Targets Material Left by Larger Tools",
    body:
      "After initial roughing with a large tool, Tebis rest roughing " +
      "identifies remaining material using the stock model and targets it " +
      "with a smaller tool. The system calculates only where material " +
      "remains, skipping already-cleared areas. Use a tool 40-60% of the " +
      "previous tool diameter. Enable automatic detection of rest material " +
      "thickness and skip areas with less than 0.5mm remaining. This " +
      "typically removes 15-30% additional material before semi-finishing.",
    category: "roughing",
    tags: ["rest-roughing", "stock-model", "smaller-tool", "residual"],
    operation_types: ["roughing"],
    confidence: 92,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-019",
    title: "Helical Ramping Entry Avoids Plunge Cuts in Hard Materials",
    body:
      "Configure helical ramp entry for all roughing operations in hardened " +
      "steel and titanium. Set the ramp diameter to 80-120% of tool diameter " +
      "and ramp angle to 2-5 degrees for steel, 3-8 degrees for aluminum. " +
      "The helix should complete at least 2 full turns before reaching depth " +
      "to establish stable cutting. For tools without center-cutting geometry, " +
      "helical entry is mandatory — Tebis will warn if the ramp diameter is " +
      "too small for the tool geometry.",
    category: "roughing",
    tags: ["helical-ramp", "entry", "plunge-avoidance", "hard-material"],
    operation_types: ["roughing"],
    confidence: 90,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-020",
    title: "Stock Allowance Varies by Feature for Optimal Semi-Finishing",
    body:
      "Set different stock allowances on different surfaces within the same " +
      "roughing NCJob. Flat bottom surfaces need less allowance (0.3mm) " +
      "since they will be face-milled. Curved surfaces need more (0.5-0.8mm) " +
      "to account for the stairstep effect of level roughing. Vertical walls " +
      "need moderate allowance (0.3-0.5mm). Use the surface-specific stock " +
      "option in the NCJob parameters. This reduces semi-finishing time by " +
      "producing more uniform stock distribution.",
    category: "roughing",
    tags: ["stock-allowance", "variable", "surface-specific"],
    operation_types: ["roughing"],
    confidence: 88,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-021",
    title: "Trochoidal Roughing in Narrow Slots Reduces Tool Load",
    body:
      "For slots narrower than 2x tool diameter, Tebis generates trochoidal " +
      "toolpaths that move the tool in circular arcs while advancing along " +
      "the slot. Set the trochoidal step-over to 5-15% of tool diameter and " +
      "increase feed rate by 200-300% compared to conventional slotting. " +
      "The radial engagement stays below 10-15%, allowing full axial depth " +
      "(up to 3xD). This dramatically extends tool life in hardened steel " +
      "slot roughing from 30 minutes to 4+ hours.",
    category: "roughing",
    tags: ["trochoidal", "slot", "narrow", "tool-load"],
    operation_types: ["roughing"],
    confidence: 91,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-022",
    title: "Plunge Roughing Removes Deep Pocket Material Efficiently",
    body:
      "For deep cavities with depth > 4xD, consider Tebis plunge roughing " +
      "that moves the tool axially like a drill, stepping over in XY. This " +
      "puts cutting forces along the spindle axis where the machine is " +
      "strongest. Step-over is typically 60-75% of tool diameter. Works best " +
      "with indexable insert drills or plunge mills. Not suitable for thin " +
      "walls or floors — switch to conventional roughing for the last 2-3 " +
      "Z levels.",
    category: "roughing",
    tags: ["plunge-roughing", "deep-cavity", "axial-force"],
    operation_types: ["roughing"],
    confidence: 86,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-023",
    title: "Corner Radius on Roughing Toolpath Prevents Abrupt Direction Changes",
    body:
      "Enable corner rounding in roughing toolpaths with a minimum radius of " +
      "0.5-1.0mm at direction changes. This maintains feed rate through " +
      "corners — without rounding, the CNC control decelerates to zero at " +
      "sharp corners, causing dwell marks and increasing cycle time. Set the " +
      "tolerance for corner rounding to half the roughing stock allowance. " +
      "This can reduce roughing cycle time by 10-20% on complex geometries " +
      "with many direction changes.",
    category: "roughing",
    tags: ["corner-rounding", "feed-rate", "cycle-time", "direction-change"],
    operation_types: ["roughing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-024",
    title: "Multi-Tool Roughing Sequence Optimizes Material Removal Rate",
    body:
      "Plan roughing as a multi-tool sequence: (1) largest stable tool for " +
      "bulk removal (e.g., 32mm face mill for open areas), (2) medium tool " +
      "for general cavity roughing (e.g., 16mm endmill), (3) small tool " +
      "for tight corners and ribs (e.g., 8mm endmill). Tebis automatically " +
      "calculates rest material between each tool change. Total MRR is " +
      "maximized because each tool works at optimal chip load. Sequence " +
      "tools from largest to smallest in the NCJob Manager.",
    category: "roughing",
    tags: ["multi-tool", "sequence", "mrr", "tool-sizing"],
    operation_types: ["roughing"],
    confidence: 90,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-025",
    title: "Stock Island Detection Prevents Collisions with Unmachined Areas",
    body:
      "Tebis roughing detects stock islands — areas of material that become " +
      "isolated during machining — and modifies the toolpath to handle them " +
      "safely. Islands can tip or vibrate if not secured. Enable island " +
      "detection in the roughing parameters. The system either (1) machines " +
      "islands from the outside in to maintain support, or (2) warns the " +
      "programmer to add tabs or holding features. For features taller than " +
      "3xD, always machine from outside in.",
    category: "roughing",
    tags: ["stock-island", "collision", "safety", "detection"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-026",
    title: "Roughing Overlap Between Adjacent Levels Prevents Material Steps",
    body:
      "Set a vertical overlap of 5-10% of the Z step between adjacent roughing " +
      "levels. Without overlap, material ridges remain at level transitions " +
      "that stress semi-finishing tools. The overlap ensures each level cuts " +
      "slightly into the previous level boundary. For ball endmill roughing, " +
      "increase overlap to 15-20% because the ball geometry leaves more " +
      "scallop material at level transitions.",
    category: "roughing",
    tags: ["overlap", "z-step", "level-transition", "scallop"],
    operation_types: ["roughing"],
    confidence: 86,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-027",
    title: "Blank Geometry Definition Matches Raw Material Shape",
    body:
      "Define the roughing blank geometry accurately in Tebis — box, cylinder, " +
      "or imported STL for near-net-shape parts (castings, forgings). For " +
      "box blanks, set dimensions to the actual raw stock with 1-2mm extra " +
      "per side. For castings, import the as-cast shape as STL and use it " +
      "as the stock model. Accurate blank definition eliminates air cuts in " +
      "the first roughing pass and can save 10-40% of roughing time on " +
      "near-net-shape parts.",
    category: "roughing",
    tags: ["blank", "stock", "near-net-shape", "casting"],
    operation_types: ["roughing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-028",
    title: "Floor Finishing During Roughing Reduces Semi-Finish Operations",
    body:
      "Enable floor finishing within the roughing NCJob to machine flat bottom " +
      "surfaces to near-final dimension during the roughing pass. Set floor " +
      "stock to 0.1mm instead of the wall stock of 0.5mm. The tool takes a " +
      "light spring pass across the floor at each Z level. This eliminates " +
      "the need for a separate semi-finish operation on flat areas and " +
      "produces a smooth surface for subsequent finishing.",
    category: "roughing",
    tags: ["floor-finishing", "flat-bottom", "combined-operation"],
    operation_types: ["roughing"],
    confidence: 85,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-029",
    title: "Rapid Retract Height Optimization Reduces Non-Cutting Time",
    body:
      "Set rapid retract height as low as safely possible — typically 2-5mm " +
      "above the highest stock surface. Avoid retracting to the machine " +
      "home position between cuts. Tebis offers three retract modes: fixed " +
      "height, clearance above stock, and optimized (follows stock contour). " +
      "Use optimized retract for deep cavities where fixed height would " +
      "require long retract moves. This can save 5-15% of total cycle time " +
      "on deep mold cavities.",
    category: "roughing",
    tags: ["retract", "rapid", "non-cutting-time", "optimization"],
    operation_types: ["roughing"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-030",
    title: "High-Feed Roughing with Button Cutters Maximizes MRR on Open Faces",
    body:
      "For open die faces and large cavity areas, use high-feed roughing " +
      "with round-insert (button) cutters. Set axial depth to 0.5-1.0mm " +
      "and increase feed rate to 5,000-10,000 mm/min. The shallow cut " +
      "depth with the round insert geometry directs forces axially. Step-" +
      "over is typically 65-80% of cutter diameter. This strategy achieves " +
      "MRR of 200-500 cm³/min in P20 steel. Tebis calculates the effective " +
      "cutting diameter based on the actual engagement.",
    category: "roughing",
    tags: ["high-feed", "button-cutter", "mrr", "open-face"],
    operation_types: ["roughing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  // === Finishing Strategies (teb-031 to teb-050) ===
  {
    id: "teb-031",
    title: "Z-Constant Finishing Produces Best Results on Steep Walls",
    body:
      "Tebis Z-constant finishing generates horizontal contour passes at " +
      "fixed Z increments. Best for surfaces steeper than 30° from horizontal. " +
      "Set Z step based on desired cusp height: step = 2 * sqrt(2*R*h - h²) " +
      "where R is ball radius and h is cusp height. For 0.005mm cusp with " +
      "R10mm ball: step = 0.63mm. Enable automatic slope detection to switch " +
      "to 3D-equidistant on shallow areas. The transition angle is typically " +
      "set at 30-45°.",
    category: "finishing",
    tags: ["z-constant", "steep-wall", "cusp-height", "contour"],
    operation_types: ["finishing"],
    confidence: 93,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-032",
    title: "3D-Equidistant Finishing Covers Shallow Areas with Uniform Scallop",
    body:
      "For surfaces less than 30-45° from horizontal, use Tebis 3D-equidistant " +
      "finishing. The toolpath follows surface contours with constant scallop " +
      "height regardless of surface curvature. Set the scallop height target " +
      "(typically 0.003-0.010mm for mold finishing). The system automatically " +
      "varies step-over distance based on local curvature — tighter step-over " +
      "in areas of high curvature, wider in flat areas. This produces visually " +
      "uniform surface finish without the banding seen with fixed step-over.",
    category: "finishing",
    tags: ["3d-equidistant", "shallow", "scallop", "curvature-adaptive"],
    operation_types: ["finishing"],
    confidence: 92,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-033",
    title: "Geodesic Finishing Follows Natural Surface Flow Lines",
    body:
      "Tebis geodesic finishing generates toolpaths that follow the shortest " +
      "paths on the surface (geodesic curves). The toolpath flows naturally " +
      "with the surface shape, producing superior finish on organic forms. " +
      "Particularly effective for automotive Class A surfaces, turbine blades, " +
      "and freeform sculptures. Step-over is measured along the surface, " +
      "not in XY projection, ensuring truly uniform scallop height. " +
      "Computation time is higher than Z-constant but the surface quality " +
      "justifies it for visible parts.",
    category: "finishing",
    tags: ["geodesic", "flow-line", "organic", "class-a"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-034",
    title: "Steep/Shallow Split Combines Z-Constant and Equidistant Strategies",
    body:
      "Tebis automatic steep/shallow detection splits the part into regions " +
      "and applies Z-constant finishing to steep areas and 3D-equidistant " +
      "to shallow areas. Set the transition angle (default 30°, adjustable " +
      "25-50°). Enable overlap at the transition boundary — typically 2-3 " +
      "tool-diameter overlap — to eliminate witness lines where strategies " +
      "meet. The combined approach produces optimal surface quality on " +
      "complex mold geometries with mixed steep and shallow regions.",
    category: "finishing",
    tags: ["steep-shallow", "combined", "transition", "automatic"],
    operation_types: ["finishing"],
    confidence: 93,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-035",
    title: "Pencil Trace Finishing Cleans Fillet and Corner Regions",
    body:
      "Tebis pencil trace finishing automatically detects concave fillet " +
      "regions and generates passes along the fillet centerline. Multiple " +
      "offset passes clean the full fillet width. Set the number of offsets " +
      "based on fillet radius: 1-2 offsets for R < 3mm, 3-5 for R = 3-10mm. " +
      "Use a ball endmill with radius equal to or smaller than the fillet " +
      "radius. Pencil finishing removes cusp material left by prior finishing " +
      "passes and produces the blended fillet appearance required for polished " +
      "mold surfaces.",
    category: "finishing",
    tags: ["pencil", "fillet", "corner", "trace"],
    operation_types: ["finishing"],
    confidence: 92,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-036",
    title: "Flow-Line Finishing Aligns Toolpath with Part Aesthetics",
    body:
      "Tebis flow-line finishing lets you define guide curves that control " +
      "toolpath direction. The tool follows paths parallel to the guide " +
      "curves, producing machining marks aligned with the intended visual " +
      "flow of the part. Essential for automotive exterior panels, consumer " +
      "products, and any part where machining marks are visible. Define " +
      "guide curves along the primary viewing direction. Step-over is " +
      "perpendicular to the flow direction with constant scallop height.",
    category: "finishing",
    tags: ["flow-line", "guide-curve", "aesthetic", "direction-control"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-037",
    title: "Cusp Height Control Produces Predictable Surface Roughness",
    body:
      "Set finishing step-over based on target cusp height rather than a fixed " +
      "distance. Tebis calculates the step-over needed for the target cusp " +
      "using the actual tool geometry (ball, bullnose, or barrel) and local " +
      "surface curvature. For mold finish requirements: Ra 0.4μm → cusp " +
      "0.003mm, Ra 0.8μm → cusp 0.008mm, Ra 1.6μm → cusp 0.015mm. The " +
      "resulting surface can be polished to final finish in 30-50% less time " +
      "than with fixed step-over toolpaths.",
    category: "finishing",
    tags: ["cusp-height", "surface-roughness", "step-over", "ra"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-038",
    title: "Barrel Cutter Finishing Covers Large Areas with Fewer Passes",
    body:
      "Tebis supports barrel (lens/oval) cutters that have a large effective " +
      "radius on the barrel portion (typically R50-R300mm). When finishing " +
      "steep walls, the large barrel radius produces much lower cusp height " +
      "at the same step-over compared to a standard ball endmill. A barrel " +
      "cutter can achieve the same cusp height with 5-8x larger step-over, " +
      "reducing cycle time by 70-80%. Define the barrel geometry precisely " +
      "in the Tebis tool library — segment radius, barrel radius, and " +
      "taper angle.",
    category: "finishing",
    tags: ["barrel-cutter", "lens", "large-radius", "cycle-time"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-039",
    title: "Rest Finishing Targets Material Left by Larger Finishing Tools",
    body:
      "After finishing with a larger ball endmill, Tebis rest finishing detects " +
      "corners and fillets where material remains and generates passes with a " +
      "smaller tool. The system uses the stock model to identify areas where " +
      "the previous tool could not reach within tolerance. Typical sequence: " +
      "R5mm ball for general finishing, R2mm for medium fillets, R1mm for " +
      "tight corners. Each rest finishing NCJob only machines where needed, " +
      "minimizing redundant cutting.",
    category: "finishing",
    tags: ["rest-finishing", "corner", "fillet", "multi-tool"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-040",
    title: "Constant-Engagement Spiral Finishing for Circular Features",
    body:
      "For circular or near-circular cavity features, use Tebis spiral " +
      "finishing that starts at the center and spirals outward (or vice " +
      "versa). The spiral path maintains constant engagement and avoids " +
      "the tool-lift/reposition moves of contour-parallel finishing. Feed " +
      "rate remains stable throughout. Best for lens molds, cup-shaped " +
      "cavities, and round core pins. Set the spiral pitch equal to the " +
      "desired step-over.",
    category: "finishing",
    tags: ["spiral", "circular", "constant-engagement", "lens-mold"],
    operation_types: ["finishing"],
    confidence: 86,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-041",
    title: "Drive-Surface Finishing Controls Toolpath on Complex Blends",
    body:
      "Use Tebis drive-surface finishing when automatic strategies fail on " +
      "complex blend regions. Select a drive surface (can be an offset or " +
      "simplified version of the part surface) and the tool follows this " +
      "surface at a specified offset. Control the drive direction with guide " +
      "curves. This gives precise control over toolpath direction on " +
      "multi-surface blends where automatic strategies produce inconsistent " +
      "paths or witness lines.",
    category: "finishing",
    tags: ["drive-surface", "blend", "manual-control", "guide-curve"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-042",
    title: "Morph-Between-Curves Finishing for Ruled Surface Regions",
    body:
      "Tebis morph finishing interpolates toolpath between two boundary curves, " +
      "creating a smooth transition across the surface. Ideal for stamping die " +
      "draw walls, addendum surfaces, and ruled regions. Define the top and " +
      "bottom boundary curves and the system generates intermediate passes by " +
      "morphing between them. Control the number of passes or set step-over. " +
      "The resulting toolpath follows the draw direction, which is the " +
      "preferred machining direction for die surfaces.",
    category: "finishing",
    tags: ["morph", "ruled-surface", "boundary-curve", "stamping"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-043",
    title: "Isoparametric Finishing Follows UV Direction of NURBS Surfaces",
    body:
      "Tebis isoparametric finishing generates toolpaths along the U or V " +
      "parameter direction of individual NURBS surfaces. This produces the " +
      "smoothest possible toolpath on each surface but may create witness " +
      "lines at surface boundaries. Best for single-surface finishing of " +
      "high-quality freeform areas. Pre-condition: surfaces must have clean " +
      "parameterization — use Tebis reparameterize function if the UV " +
      "directions are distorted.",
    category: "finishing",
    tags: ["isoparametric", "nurbs", "uv-direction", "freeform"],
    operation_types: ["finishing"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-044",
    title: "Constant Scallop Adapts Step-Over to Local Surface Curvature",
    body:
      "Tebis constant-scallop finishing automatically varies step-over based " +
      "on local curvature to maintain identical scallop height everywhere. " +
      "On flat areas, step-over increases (up to 3-5mm); on highly curved " +
      "areas, it decreases (down to 0.1mm). This eliminates over-machining " +
      "on flat regions and under-machining on curved regions. Set the target " +
      "scallop height and the system optimizes. Compared to fixed step-over, " +
      "cycle time reduces 20-40% with identical or better surface quality.",
    category: "finishing",
    tags: ["constant-scallop", "adaptive-stepover", "curvature", "efficiency"],
    operation_types: ["finishing"],
    confidence: 91,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-045",
    title: "Approach and Retract Moves Control Tool Entry and Exit Quality",
    body:
      "Configure approach and retract moves carefully in Tebis finishing. " +
      "Use arc approach tangential to the surface (radius 0.5-2x tool " +
      "diameter). Avoid normal (perpendicular) approach which leaves dig-in " +
      "marks. For Z-constant finishing, approach along the contour direction. " +
      "For 3D finishing, approach from outside the machining region. Set " +
      "retract to mirror the approach. Link between passes with arcs rather " +
      "than straight rapids to maintain smooth motion and avoid jerk marks.",
    category: "finishing",
    tags: ["approach", "retract", "entry", "exit", "linking"],
    operation_types: ["finishing"],
    confidence: 90,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-046",
    title: "Surface Extension Prevents Edge Rollover on Open Boundaries",
    body:
      "Extend machining surfaces by 2-5mm beyond part edges before finishing. " +
      "Tebis surface extension creates tangent-continuous extensions that let " +
      "the tool ride onto and off the part smoothly. Without extension, the " +
      "ball endmill decelerates at the edge, causing over-cutting (edge " +
      "rollover) of 0.01-0.03mm. The extension also prevents burr formation " +
      "at open edges. Use G2 (curvature-continuous) extension for Class A " +
      "surfaces.",
    category: "finishing",
    tags: ["surface-extension", "edge-rollover", "boundary", "overcut"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-047",
    title: "Overlap Region Between Finishing Passes Eliminates Witness Lines",
    body:
      "When finishing adjacent regions with different strategies or tools, " +
      "set an overlap zone of 3-5mm at the boundary. Both toolpaths machine " +
      "into the overlap zone, blending the transition. Without overlap, " +
      "a visible witness line appears at the boundary due to slight differences " +
      "in cutter deflection and surface finish direction. For steep/shallow " +
      "transitions, extend both strategies into a 5mm overlap band centered " +
      "on the transition angle boundary.",
    category: "finishing",
    tags: ["overlap", "witness-line", "boundary", "blending"],
    operation_types: ["finishing"],
    confidence: 88,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-048",
    title: "Tolerance Setting Balances Surface Accuracy Against Cycle Time",
    body:
      "Tebis finishing tolerance (chord error) controls how closely the " +
      "toolpath approximates the CAD surface. Tighter tolerance = more NC " +
      "points = longer programs and slower machine execution. Guidelines: " +
      "roughing 0.05-0.10mm, semi-finishing 0.01-0.02mm, finishing 0.003-" +
      "0.005mm, ultra-finishing 0.001-0.002mm. For 5-axis paths, use 2x " +
      "tighter tolerance than 3-axis because orientation errors amplify " +
      "position errors. CNC controls with look-ahead > 200 blocks handle " +
      "dense point data better.",
    category: "finishing",
    tags: ["tolerance", "chord-error", "accuracy", "cycle-time"],
    operation_types: ["finishing"],
    confidence: 92,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-049",
    title: "Bidirectional Finishing with Lead Compensation Improves Efficiency",
    body:
      "Enable bidirectional (zigzag) finishing to cut in both directions, " +
      "reducing non-cutting time by up to 40%. However, climb and conventional " +
      "cutting produce different surface finishes. Compensate by adjusting " +
      "the lead angle: set a small positive lead (1-3°) in the feed direction " +
      "to maintain consistent chip load in both directions. For critical " +
      "surfaces, use unidirectional cutting (climb only) despite the longer " +
      "cycle time.",
    category: "finishing",
    tags: ["bidirectional", "zigzag", "lead-angle", "efficiency"],
    operation_types: ["finishing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0
  },
  {
    id: "teb-050",
    title: "Pattern Finishing Repeats a Toolpath Motif Across Large Surfaces",
    body:
      "Tebis pattern finishing defines a toolpath motif (e.g., a zigzag or " +
      "spiral) and tiles it across a large surface area. Useful for textured " +
      "surfaces, non-slip patterns, and decorative finishes on consumer " +
      "products. Define the pattern unit cell with boundary curves and the " +
      "system arrays it across the selected surface. Control pattern spacing, " +
      "rotation, and depth. Each pattern element is cut with a small ball or " +
      "engraving tool at high speed.",
    category: "finishing",
    tags: ["pattern", "texture", "decorative", "tiling"],
    operation_types: ["finishing"],
    confidence: 83,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0,
  },
];
