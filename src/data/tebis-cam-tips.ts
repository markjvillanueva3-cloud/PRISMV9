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
  // === 5-Axis Simultaneous (teb-051 to teb-065) ===
  {
    id: "teb-051",
    title: "5-Axis Simultaneous Finishing with Automatic Collision Avoidance",
    body:
      "Tebis 5-axis simultaneous finishing automatically tilts the tool axis to " +
      "avoid holder and spindle collisions while maintaining surface contact. " +
      "Set 'Maximum Tilt Angle' to limit tool axis deviation (typically 30-45°). " +
      "Enable 'Smooth Tilt' to prevent sudden axis reversals that cause surface " +
      "marks. Tebis checks the complete tool assembly (cutter + holder + spindle " +
      "nose) against the workpiece and fixture at every CL point.",
    category: "multi_axis",
    tags: ["5-axis", "collision-avoidance", "tilt", "simultaneous"],
    operation_types: ["multi_axis"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-052",
    title: "Swarf Cutting for Ruled Surfaces and Draft Walls",
    body:
      "Tebis swarf cutting uses the tool's flute length to machine ruled " +
      "surfaces in a single pass. Define the drive surface (wall) and check " +
      "surface (floor). The tool axis follows the surface ruling direction. " +
      "Swarf cutting is 5-10× faster than Z-level for draft walls. Verify " +
      "the surface is truly developable — swarf on doubly-curved surfaces " +
      "causes gouging. Set tool tilt limits to ±3° from surface normal.",
    category: "multi_axis",
    tags: ["swarf", "ruled-surface", "draft-wall", "flute-contact"],
    operation_types: ["multi_axis"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-053",
    title: "Lead/Lean Angle Control for Ball-End Finishing",
    body:
      "Set lead angle 10-15° (forward tilt in feed direction) and lean angle " +
      "0-5° (sideways tilt) for 5-axis ball-end finishing. Lead angle moves " +
      "the contact point off the tool tip where surface speed is zero, " +
      "improving surface finish by 30-50%. Tebis applies lead/lean relative " +
      "to the surface normal at each point. Monitor for axis limit violations " +
      "on trunnion-table machines with limited B-axis range.",
    category: "multi_axis",
    tags: ["lead-lean", "ball-end", "5-axis", "surface-finish"],
    operation_types: ["finishing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-054",
    title: "To-Point and From-Point Tool Axis Strategies",
    body:
      "Tebis offers 'To Point' (tool tilts toward a point, good for concave " +
      "cavities) and 'From Point' (tool tilts away, good for convex surfaces) " +
      "axis strategies. Place the reference point at the center of concave " +
      "regions or above convex regions. These strategies produce smoother " +
      "tool axis motion than automatic collision avoidance alone. Combine " +
      "with tilt limits to prevent extreme angles.",
    category: "multi_axis",
    tags: ["to-point", "from-point", "tool-axis", "concave"],
    operation_types: ["multi_axis"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-055",
    title: "5-Axis Tube and Port Machining",
    body:
      "Tebis machines internal passages and ports using 5-axis tool access " +
      "through the port opening. Define the tube centerline curve and cross-" +
      "section profiles. The system generates roughing and finishing passes " +
      "that follow the tube interior. Set tool axis to follow the centerline " +
      "tangent vector for smooth motion. Verify tool length vs passage depth — " +
      "holder collision in deep ports is the most common failure mode.",
    category: "multi_axis",
    tags: ["tube", "port", "internal-passage", "5-axis"],
    operation_types: ["multi_axis"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-056",
    title: "Barrel Cutter Strategies for Large Step-Over Finishing",
    body:
      "Barrel cutters (segment, tangent, lens) have effective cutting radii " +
      "of 100-500mm allowing 3-5× wider step-over than ball-end mills for " +
      "the same scallop height. In Tebis, define barrel geometry precisely: " +
      "barrel radius, tip fillet, taper angle. Use automatic tilt to maintain " +
      "the barrel contact zone on the surface. Verify contact pattern in " +
      "simulation — incorrect tilt causes gouging or air cutting.",
    category: "multi_axis",
    tags: ["barrel-cutter", "step-over", "scallop", "segment-radius"],
    operation_types: ["finishing"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-057",
    title: "5-Axis Rest Finishing with Automatic Detection",
    body:
      "Tebis 5-axis rest finishing detects material remaining from previous " +
      "operations by referencing the complete tool assembly of all prior tools. " +
      "Add ALL previous tools to the reference set — not just the most recent. " +
      "The system computes remaining stock from combined swept volumes and " +
      "generates 5-axis toolpaths only where material exists. Essential for " +
      "deep ribs and narrow slots in mold cavities.",
    category: "multi_axis",
    tags: ["rest-finishing", "5-axis", "automatic-detection", "ribs"],
    operation_types: ["finishing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-058",
    title: "Flowline Finishing for Turbine and Aerofoil Surfaces",
    body:
      "Flowline finishing follows user-defined flow curves across the surface. " +
      "Define start and end boundary curves — Tebis interpolates intermediate " +
      "toolpath lines between them. Ideal for turbine blades (hub-to-shroud), " +
      "automotive body panels, and aerofoils where the tool should follow the " +
      "natural surface flow. Step-over is measured perpendicular to the flow " +
      "direction for uniform scallop height.",
    category: "multi_axis",
    tags: ["flowline", "turbine", "aerofoil", "surface-flow"],
    operation_types: ["finishing"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-059",
    title: "Geodesic Finishing for Uniform Surface Coverage",
    body:
      "Geodesic finishing follows the shortest path along the surface " +
      "(geodesic curves), producing uniform tool contact patterns regardless " +
      "of surface parameterization. Unlike raster, geodesic adapts to " +
      "curvature naturally. Set step-over based on target scallop height. " +
      "Tebis computes geodesic paths numerically — best for doubly-curved " +
      "surfaces where raster produces inconsistent scallop height.",
    category: "multi_axis",
    tags: ["geodesic", "uniform", "curvature-adaptive", "freeform"],
    operation_types: ["finishing"],
    confidence: 83,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-060",
    title: "3+2 Axis Indexed Machining for Multi-Face Parts",
    body:
      "3+2 axis (positional 5-axis) locks rotary axes at a fixed angle per " +
      "operation. Tebis defines the indexed orientation for each face. Use " +
      "3+2 when simultaneous 5-axis isn't needed — it provides higher " +
      "rigidity (locked axes), better accuracy, and simpler post-processing. " +
      "Create separate operations per indexed angle with appropriate WCS " +
      "offsets. Tebis auto-generates the rotary axis positioning commands.",
    category: "multi_axis",
    tags: ["3-plus-2", "indexed", "multi-face", "positional"],
    operation_types: ["multi_axis"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-061",
    title: "Multi-Axis Deburring and Edge Breaking",
    body:
      "Tebis programs automated deburring along detected edges using chamfer " +
      "or ball tools. Define the edge to deburr, set engagement depth and " +
      "feed rate. The system generates a 5-axis toolpath following the edge " +
      "while maintaining consistent contact depth. Use 'Edge Detection' to " +
      "automatically find edges from the model. Sort edges by region to " +
      "minimize rapid moves between deburring passes.",
    category: "multi_axis",
    tags: ["deburring", "edge-breaking", "chamfer", "5-axis"],
    operation_types: ["finishing"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-062",
    title: "Lollipop Cutter for Undercut Features",
    body:
      "Lollipop (undercutting) tools access features behind overhanging " +
      "geometry. In Tebis, define the lollipop geometry: ball diameter, " +
      "neck diameter, and neck length. Use 3+2 axis positioning to orient " +
      "the tool for undercut access. Verify clearance between the neck " +
      "and surrounding geometry. Set cutting speed based on the ball " +
      "diameter, not the neck diameter.",
    category: "multi_axis",
    tags: ["lollipop", "undercut", "undercutting", "neck-clearance"],
    operation_types: ["finishing"],
    confidence: 82,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-063",
    title: "5-Axis Approach/Retract for Smooth Surface Transitions",
    body:
      "Configure approach and retract moves for 5-axis operations: use " +
      "tangential arc approach (radius = 2× tool radius), normal retract " +
      "at 30-45° from surface. Tebis 'Extended Link' creates smooth " +
      "connections between adjacent passes without rapid retract cycles. " +
      "Enable 'Tool Axis Interpolation' during links to prevent sudden " +
      "rotary axis snaps that leave surface marks.",
    category: "multi_axis",
    tags: ["approach-retract", "tangential", "links", "smooth"],
    operation_types: ["multi_axis"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-064",
    title: "RTCP/TCPM Configuration for 5-Axis Machines",
    body:
      "Configure RTCP (Rotation Tool Center Point) in Tebis post processor. " +
      "When RTCP is active, the controller compensates for rotary axis pivot " +
      "distances automatically. Set pivot point coordinates precisely — " +
      "incorrect values cause dimensional errors proportional to the angular " +
      "range. Test with small angular moves first. Verify the machine " +
      "controller supports RTCP mode before programming.",
    category: "multi_axis",
    tags: ["rtcp", "tcpm", "pivot-point", "post-processor"],
    operation_types: ["post_processing"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-065",
    title: "Machine Simulation with Full Kinematic Model",
    body:
      "Tebis machine simulation uses the complete kinematic chain for " +
      "collision detection. Import machine models from Tebis library or " +
      "create custom machines. Define: spindle nose, tool holder, rotary " +
      "table, fixtures, tailstock. Run simulation at 'Full Machine' mode " +
      "for 5-axis operations — catches collisions that geometric simulation " +
      "alone misses (head/table interference, cable wrap limits).",
    category: "multi_axis",
    tags: ["machine-simulation", "kinematics", "collision", "full-machine"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Mold/Die Specialty (teb-066 to teb-080) ===
  {
    id: "teb-066",
    title: "Rib Machining for Deep Thin Ribs in Mold Cavities",
    body:
      "Tebis rib machining handles deep, thin ribs by progressively machining " +
      "with shorter-to-longer tools to maintain wall support. Set minimum rib " +
      "width threshold and maximum tool projection ratio (typically 5:1 L/D). " +
      "The system calculates intermediate stock levels to prevent wall " +
      "deflection during roughing. Use carbide tools with anti-vibration " +
      "geometry for L/D ratios above 4:1.",
    category: "specialty",
    tags: ["rib-machining", "thin-wall", "progressive", "deflection"],
    operation_types: ["specialty"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-067",
    title: "Electrode Design and Machining Workflow",
    body:
      "Tebis provides integrated electrode design: extract electrode geometry " +
      "from cavity, define blank and holder (EROWA/3R), program roughing and " +
      "finishing. Apply different undersizes: roughing electrodes 0.3mm/side, " +
      "finishing electrodes 0.05mm/side. No coolant for graphite — use vacuum " +
      "dust extraction. Program datum pads for CMM qualification on the pallet " +
      "system. Supports copper and graphite electrode materials.",
    category: "specialty",
    tags: ["electrode", "mold", "graphite", "erowa"],
    operation_types: ["specialty"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-068",
    title: "Core/Cavity Split Surface Management",
    body:
      "Tebis handles core/cavity splits with automatic parting surface " +
      "generation. Define the parting line, and Tebis creates the parting " +
      "surface extending to the mold base boundary. Use these surfaces as " +
      "machining boundaries — separate toolpaths for core side and cavity " +
      "side. Maintain associativity with the product model so parting " +
      "surface updates propagate to machining operations.",
    category: "specialty",
    tags: ["core-cavity", "parting-surface", "mold", "split"],
    operation_types: ["setup"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-069",
    title: "Steep and Shallow Automatic Boundary Detection",
    body:
      "Tebis automatically detects steep and shallow surface regions and " +
      "applies appropriate finishing strategies: Z-level for steep (>65°), " +
      "raster or 3D-offset for shallow (<65°). Set the threshold angle. " +
      "Enable boundary overlap at 1-2mm to eliminate the transition witness " +
      "line. Use the same tool for both passes to avoid tool-change marks " +
      "at the boundary.",
    category: "finishing",
    tags: ["steep-shallow", "boundary", "z-level", "raster"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-070",
    title: "Pencil Tracing for Internal Corner Cleanup",
    body:
      "After main finishing passes, pencil tracing cleans internal corners " +
      "and fillets left by larger tools. Tebis detects concave regions " +
      "automatically. Use a ball-end mill 50-70% of the smallest fillet " +
      "radius. Enable 'Both Ways' for symmetric corners to halve cycle time. " +
      "Pencil tracing targets the exact transition zone that Z-level and " +
      "raster strategies miss — run as the final finishing operation.",
    category: "finishing",
    tags: ["pencil", "corners", "cleanup", "fillet"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-071",
    title: "Constant Scallop Height Finishing",
    body:
      "Tebis constant scallop finishing automatically varies step-over based " +
      "on local surface curvature to maintain uniform scallop height. Set " +
      "target scallop (e.g., 0.005mm for polishing-ready). This produces " +
      "20-30% shorter cycle times than fixed step-over while maintaining " +
      "uniform surface quality. Essential for mold surfaces where consistent " +
      "polish quality is critical across varying curvature regions.",
    category: "finishing",
    tags: ["constant-scallop", "variable-step-over", "curvature", "uniform"],
    operation_types: ["finishing"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-072",
    title: "Surface Extension for Clean Tool Exit",
    body:
      "Extend machining surfaces 2-5mm beyond part edges to ensure clean " +
      "tool exit without deceleration marks. In Tebis, create extension " +
      "surfaces automatically or manually. The tool completes its cutting " +
      "stroke on the extension surface before retracting. Critical for " +
      "visible surfaces on automotive exterior dies and consumer product " +
      "molds where tool exit marks would require extra polishing.",
    category: "finishing",
    tags: ["surface-extension", "tool-exit", "deceleration", "quality"],
    operation_types: ["finishing"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-073",
    title: "Progressive Rest Machining with Multiple Reference Tools",
    body:
      "For complex mold cavities: 25mm rough → 12mm rest-rough → 6mm " +
      "semi-finish → 3mm finish → 1mm pencil. Each Tebis operation " +
      "references ALL previous tools for accurate rest detection. Set " +
      "'Minimum Material Thickness' to 0.1mm to skip insignificant stock " +
      "remnants. This eliminates wasted cuts on thin slivers and can " +
      "save 15-25% total cycle time compared to single-reference rest.",
    category: "roughing",
    tags: ["rest-machining", "progressive", "multi-reference", "efficiency"],
    operation_types: ["roughing"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-074",
    title: "Tebis NCJob Templates for Standardized Workflows",
    body:
      "NCJob templates capture complete machining strategies: tool selection, " +
      "cutting parameters, leads/links, boundary setup, and strategy sequence. " +
      "Apply templates to similar parts — Tebis remaps geometry references " +
      "automatically. Templates enforce shop standards and reduce programming " +
      "time by 50-70% for repeat geometry types. Version-control templates " +
      "to track process improvements over time.",
    category: "setup",
    tags: ["ncjob", "templates", "standardization", "reuse"],
    operation_types: ["setup"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-075",
    title: "Hardened Steel Finishing for Mold and Die",
    body:
      "For hardened tool steel (50-62 HRC) in Tebis: ball-end mill with " +
      "CBN or nano-coated carbide, 100-200 m/min, 0.03-0.06mm feed/tooth, " +
      "step-over based on target Ra (0.1mm for Ra 0.8μm). Air blast only — " +
      "coolant causes thermal shock cracking. Use constant scallop finishing " +
      "for uniform surface quality. Target Ra 0.4-0.8μm directly from " +
      "machining to minimize polishing labor.",
    category: "cam_strategy",
    tags: ["hardened-steel", "mold-die", "cbn", "surface-finish"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-076",
    title: "Titanium 5-Axis Machining with Trochoidal Roughing",
    body:
      "For Ti-6Al-4V in Tebis: trochoidal roughing with 8-10% radial " +
      "engagement, 1×D axial depth, 45-60 m/min, 0.08-0.12mm feed/tooth. " +
      "Flood coolant at 70+ bar through-spindle essential. Use AlTiN-coated " +
      "carbide. Never recut chips — titanium chips work-harden. Tebis " +
      "constant engagement roughing prevents the intermittent loading that " +
      "destroys inserts. Monitor spindle load continuously.",
    category: "cam_strategy",
    tags: ["titanium", "trochoidal", "constant-engagement", "coolant"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-077",
    title: "Aluminum HSM with Maximum Material Removal Rate",
    body:
      "For aluminum (6061/7075) in Tebis: 3-flute uncoated carbide, 50% " +
      "radial engagement, 2×D axial depth, 300-500 m/min, 0.15-0.25mm " +
      "feed/tooth. Chip evacuation is critical — use air blast or high-" +
      "volume flood. Tebis adaptive roughing with engagement control " +
      "prevents overload in corners. At these parameters MRR reaches " +
      "500-1000 cm³/min on high-speed machines.",
    category: "cam_strategy",
    tags: ["aluminum", "hsm", "mrr", "high-speed"],
    operation_types: ["roughing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-078",
    title: "Inconel Machining with Ceramic Inserts",
    body:
      "For Inconel 718 roughing in Tebis: ceramic inserts at 200-400 m/min, " +
      "0.1-0.15mm feed/tooth, 1-2mm DOC. No coolant — ceramics thermal shock " +
      "crack. Air blast for chip clearing only. Tool life is short (10-20 min) " +
      "but MRR is 3-5× higher than carbide. Use Tebis constant engagement " +
      "strategy — interrupted cuts destroy ceramic inserts. Reserve ceramic " +
      "for roughing only, finish with carbide.",
    category: "cam_strategy",
    tags: ["inconel", "ceramic", "superalloy", "no-coolant"],
    operation_types: ["roughing"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-079",
    title: "Composite Trimming with 5-Axis Routing",
    body:
      "For CFRP/GFRP composite trimming in Tebis: PCD or diamond-coated " +
      "compression routers, 200-400 m/min, 0.02-0.05mm feed/tooth. Program " +
      "5-axis tool normal to the surface edge for clean trim lines. Use zig " +
      "cutting only (no zigzag) for consistent fiber cutting direction. " +
      "Vacuum fixturing mandatory — composites delaminate under mechanical " +
      "clamp forces. Dust extraction required for safety.",
    category: "cam_strategy",
    tags: ["composite", "cfrp", "trimming", "pcd"],
    operation_types: ["specialty"],
    confidence: 83,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-080",
    title: "Stainless Steel with Work-Hardening Prevention",
    body:
      "For 304/316 stainless in Tebis: coated carbide (TiAlN/AlCrN), " +
      "80-120 m/min, 0.08-0.12mm feed/tooth, 0.5-1×D axial depth. Stainless " +
      "work-hardens — never dwell or reduce feed below 0.04mm/tooth. Use " +
      "climb milling exclusively. Tebis constant chip load roughing prevents " +
      "the intermittent engagement that causes work-hardening. Flood coolant " +
      "mandatory for chip evacuation and heat management.",
    category: "cam_strategy",
    tags: ["stainless-steel", "work-hardening", "climb-milling", "coolant"],
    operation_types: ["roughing"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Automation and Integration (teb-081 to teb-095) ===
  {
    id: "teb-081",
    title: "Tebis Automill for Automatic Feature-Based Programming",
    body:
      "Tebis Automill automatically recognizes prismatic features (holes, " +
      "pockets, slots, bosses) and assigns machining operations based on " +
      "predefined rules. Configure rules in the Automill knowledge base: " +
      "IF hole_diameter > 20mm AND depth/diameter > 3 THEN use_helical_milling " +
      "ELSE use_drilling. Automill captures shop-specific best practices " +
      "and reduces programming time by 60-80% for prismatic parts.",
    category: "setup",
    tags: ["automill", "feature-recognition", "automation", "rules"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-082",
    title: "Process Library for Knowledge Standardization",
    body:
      "Tebis Process Library stores proven machining recipes indexed by " +
      "feature type, material, and tolerance. When a programmer creates " +
      "a successful operation, store it in the library with metadata. " +
      "Future parts with similar features retrieve the proven recipe " +
      "automatically. This ensures consistent quality across different " +
      "programmers and shifts. Update library entries when process " +
      "improvements are validated.",
    category: "setup",
    tags: ["process-library", "knowledge", "standardization", "recipes"],
    operation_types: ["setup"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-083",
    title: "Virtual Machine Configuration for Post Processing",
    body:
      "Tebis virtual machines define the exact kinematic model of each shop " +
      "floor machine. Configure: axis types (linear/rotary), travel limits, " +
      "home positions, and collision bodies. The virtual machine drives both " +
      "simulation accuracy and post-processor output. When a new machine " +
      "is installed, request the virtual machine file from Tebis or create " +
      "one using Machine Builder with the machine's specification sheet.",
    category: "setup",
    tags: ["virtual-machine", "kinematics", "post-processor", "configuration"],
    operation_types: ["setup"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-084",
    title: "Setup Sheet Generation with Tebis",
    body:
      "Generate setup sheets from Tebis including: fixture diagram, tool " +
      "list with dimensions, WCS origin location, program sequence, " +
      "estimated cycle time, and critical notes. Tebis HTML setup sheet " +
      "generator exports all operation details automatically. Customize " +
      "templates to match shop format. Include photos of the physical " +
      "setup for operator reference. Distribute via network share or MES.",
    category: "setup",
    tags: ["setup-sheet", "documentation", "tool-list", "operator"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-085",
    title: "Tebis Viewer for Shop Floor NC Program Review",
    body:
      "Tebis Viewer is a free read-only application for the shop floor. " +
      "Operators can: view 3D models, rotate/zoom/measure, review tool " +
      "lists, and play back toolpath simulations without a full Tebis " +
      "license. Install on shop floor PCs near each machine. This replaces " +
      "paper setup sheets and allows operators to verify details before " +
      "running programs. Viewer updates when new programs are posted.",
    category: "setup",
    tags: ["viewer", "shop-floor", "operator", "review"],
    operation_types: ["setup"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-086",
    title: "Tool Library Management with Physical Measurements",
    body:
      "Tebis tool library stores: geometric parameters (diameter, flute " +
      "length, overall length), holder assembly (shrink-fit, collet, " +
      "hydraulic), and cutting parameters per material. After tool " +
      "presetting, update the library with actual measured dimensions — " +
      "nominal vs actual diameter differences of 0.01mm affect finish " +
      "quality. Sync tool data with presetter software (Zoller, Haimer) " +
      "via data exchange interface.",
    category: "setup",
    tags: ["tool-library", "presetter", "measurement", "synchronization"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-087",
    title: "Boundary Management with Boolean Operations",
    body:
      "Create boundaries from: surface edges, silhouette projections, user " +
      "sketches, or automatic steep/shallow detection. Chain multiple " +
      "boundaries with Boolean operations (union, intersection, subtraction). " +
      "Add 0.5mm extension to boundaries to prevent tool marks at edges. " +
      "Store boundaries in named sets for reuse across operations. " +
      "Boundary-based selective machining reduces cycle time by 20-40%.",
    category: "finishing",
    tags: ["boundary", "boolean", "selective", "regions"],
    operation_types: ["roughing", "finishing"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-088",
    title: "Rapid Move Optimization for Cycle Time Reduction",
    body:
      "Tebis rapid move optimization controls safe Z-heights for " +
      "repositioning. Use incremental safe heights (10mm above highest " +
      "stock) instead of absolute (fixed Z) to minimize travel distance. " +
      "Enable 'Safe Area' rapid moves that traverse at safe Z only when " +
      "crossing obstacles. This saves 5-15% cycle time on complex multi-" +
      "pocket parts. Configure per-operation based on workpiece complexity.",
    category: "optimization",
    tags: ["rapid-moves", "safe-z", "cycle-time", "optimization"],
    operation_types: ["optimization"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-089",
    title: "Tolerance Settings per Operation Type",
    body:
      "Set different tolerances per operation: roughing 0.1mm (speed " +
      "priority), semi-finish 0.02mm, finishing 0.005-0.01mm (quality " +
      "priority). Tebis tolerance controls the chord error between the " +
      "toolpath and target surface. Tighter tolerance = more points = " +
      "smoother motion but larger NC files. Modern controllers handle " +
      "high-density point data well — don't over-relax finishing tolerance.",
    category: "optimization",
    tags: ["tolerance", "chord-error", "point-density", "quality"],
    operation_types: ["roughing", "finishing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-090",
    title: "Workplane Management for Multi-Setup Parts",
    body:
      "Define workplanes for each setup orientation in Tebis. Use 'Active " +
      "Workplane' to control which coordinate system applies to each " +
      "operation. For 5-axis indexed work, create workplanes at each " +
      "indexed angle. Name workplanes descriptively (e.g., 'OP10-Top', " +
      "'OP20-FrontFace'). When transferring stock between setups, ensure " +
      "the workplane origin matches the physical datum point.",
    category: "setup",
    tags: ["workplane", "multi-setup", "coordinate-system", "datum"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-091",
    title: "Tebis ProFile for Surface Quality Analysis",
    body:
      "Tebis ProFile analyzes surface quality by computing: curvature " +
      "distribution, zebra stripes, reflection lines, and deviation maps. " +
      "Use ProFile before machining to identify surface quality issues in " +
      "the CAD model (faceting, tangency breaks, micro-waviness). Fix " +
      "surface defects in the CAD before generating toolpaths — machining " +
      "amplifies any existing surface quality problems.",
    category: "setup",
    tags: ["profile", "surface-quality", "analysis", "zebra-stripes"],
    operation_types: ["setup"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-092",
    title: "Collision Checking with Complete Tool Assembly",
    body:
      "For deep cavities, set collision detection to include: tool shank, " +
      "holder body, holder taper, and spindle nose. Use shrink-fit holders " +
      "for minimum profile. When standard tools can't reach, use extended-" +
      "length tools with reduced parameters (50% feed at 7:1 L/D). Tebis " +
      "gouge check verifies the finished surface — run after every finishing " +
      "operation. Add 0.5mm safety margin to holder collision detection.",
    category: "setup",
    tags: ["collision", "holder", "deep-cavity", "gouge-check"],
    operation_types: ["roughing", "finishing"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-093",
    title: "Multi-Machine Post Processing from Single Program",
    body:
      "Tebis can post-process the same toolpath for different machines by " +
      "switching virtual machine configurations. Program once using " +
      "machine-independent strategies, then post to: DMG DMU 80, Hermle " +
      "C42, or Makino D500. Each virtual machine applies machine-specific " +
      "axis naming, RTCP format, and safe retract strategy. This enables " +
      "flexible job scheduling across the shop floor.",
    category: "setup",
    tags: ["multi-machine", "post-processing", "flexibility", "scheduling"],
    operation_types: ["post_processing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-094",
    title: "Tebis CAD Repair for Imported Surfaces",
    body:
      "Imported STEP/IGES models often have surface gaps, overlaps, and " +
      "tangency breaks. Tebis CAD repair tools: close gaps (up to 0.1mm), " +
      "extend short surfaces, rebuild degenerate faces, and smooth tangency " +
      "transitions. Run surface analysis first to identify problems, then " +
      "repair systematically. Quality of machined surfaces directly depends " +
      "on quality of the input geometry — garbage in, garbage out.",
    category: "setup",
    tags: ["cad-repair", "import", "surface-gaps", "tangency"],
    operation_types: ["setup"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-095",
    title: "Probing Integration for In-Process Verification",
    body:
      "Tebis programs probing cycles for in-process verification: measure " +
      "stock dimensions before machining, verify WCS after setup, check " +
      "critical dimensions between operations. Output probing routines " +
      "in the NC program using machine-specific probe macro formats " +
      "(Renishaw, Heidenhain, Blum). Store measured data for SPC analysis " +
      "and trend monitoring.",
    category: "setup",
    tags: ["probing", "in-process", "verification", "spc"],
    operation_types: ["setup"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Statistical, Scientific and Variability (teb-096 to teb-120) ===
  {
    id: "teb-096",
    title: "Step-Over vs Scallop Height Formula for Ball-End Mills",
    body:
      "Scallop height h = R - √(R² - (s/2)²) where R=ball radius, " +
      "s=step-over. For 6mm ball (R=3mm) and 0.005mm target scallop: " +
      "s ≈ 0.35mm. Tebis constant scallop mode applies this formula " +
      "adaptively at each point considering local surface curvature. " +
      "On convex surfaces the effective radius decreases, requiring " +
      "finer step-over; on concave surfaces it increases, allowing coarser.",
    category: "optimization",
    tags: ["scallop-height", "step-over", "formula", "ball-end"],
    operation_types: ["finishing"],
    confidence: 89,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-097",
    title: "Monte Carlo Cycle Time Estimation for Quoting",
    body:
      "Tebis deterministic cycle time doesn't capture real-world variability. " +
      "Sources: feed override (±10%), tool change time (±5s/change), spindle " +
      "acceleration (machine-dependent), rapid settle time (±0.3s/move). " +
      "Apply Monte Carlo with these distributions. Report P50, P75, P95 " +
      "cycle times. Typical variability: ±8-12% at 95% CI. Use P50 for " +
      "production planning, P95 for delivery commitments.",
    category: "optimization",
    tags: ["monte-carlo", "cycle-time", "variability", "quoting"],
    operation_types: ["optimization"],
    confidence: 80,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-098",
    title: "Weibull Tool Life for Replace-Before-Fail Strategy",
    body:
      "Cutting tool life follows Weibull distribution (β=2.5-3.5 for carbide). " +
      "Collect 15+ data points per tool/material pair. Calculate β (shape) " +
      "and η (characteristic life). Replace at T = η×(-ln(0.95))^(1/β) for " +
      "95% survival. For 10mm ball in P20: η≈180min, β≈3.0 → replace at " +
      "~98min. Track data in Tebis tool notes for shop-specific calibration. " +
      "Prevents costly in-cut failures on expensive mold components.",
    category: "optimization",
    tags: ["weibull", "tool-life", "reliability", "replacement"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-099",
    title: "Bayesian Feed Rate Updating from Production Data",
    body:
      "Start with Tebis recommended feeds as the prior. After each job, " +
      "update using spindle load and vibration data. If load consistently " +
      "<35% rated, increase feed 10%. After 8-10 parts, the Bayesian " +
      "posterior converges to ±5% of the true optimal feed for that " +
      "specific machine-tool-material combination. This data-driven " +
      "approach outperforms handbook recommendations by 15-25%.",
    category: "optimization",
    tags: ["bayesian", "feed-rate", "updating", "convergence"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-100",
    title: "Cpk Prediction from Error Budget Analysis",
    body:
      "Predict Cpk before cutting: RSS of machine positioning (±0.003mm), " +
      "tool diameter tolerance (±0.005mm H6), tool deflection (FL³/3EI at " +
      "cutting force), thermal growth (α×ΔT×L over cycle), measurement " +
      "uncertainty (±0.002mm CMM). For ±0.01mm tolerance: need total " +
      "error <0.005mm for Cpk≥1.33. If predicted Cpk marginal, improve " +
      "largest contributor (usually tool deflection — shorter tools).",
    category: "optimization",
    tags: ["cpk", "error-budget", "prediction", "deflection"],
    operation_types: ["optimization"],
    confidence: 80,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-101",
    title: "Taguchi Robust Design for Stable Die Machining",
    body:
      "Apply Taguchi L9 array: factors = speed (3 levels), feed (3 levels), " +
      "step-over (3 levels). Noise factors = material hardness variation " +
      "(±2 HRC), tool wear state (new/mid/end). Measure S/N ratio for " +
      "surface roughness. Taguchi-optimal parameters maximize signal-to-" +
      "noise ratio — surface finish least sensitive to noise factors. " +
      "These robust parameters outperform 'optimized' parameters that " +
      "only work under ideal conditions.",
    category: "optimization",
    tags: ["taguchi", "robust", "l9", "signal-to-noise"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-102",
    title: "Stochastic Chatter Avoidance with Stability Lobes",
    body:
      "Chatter onset has stochastic component from tool damping variation " +
      "(±15%), material hardness (±5%), and tool overhang tolerance " +
      "(±0.5mm). Generate P(chatter) contours over RPM×DOC space using " +
      "Monte Carlo sampling of the stability lobe diagram. Select " +
      "RPM/DOC inside the 95% safe region. Spindle speed selection is " +
      "the key lever — Tebis adaptive feed can't prevent chatter once " +
      "the wrong RPM is chosen.",
    category: "optimization",
    tags: ["chatter", "stability-lobes", "probability", "spindle-speed"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-103",
    title: "Thermal Compensation for Long Roughing Operations",
    body:
      "During roughing >3 hours, machine thermal growth causes Z-axis " +
      "drift of 0.01-0.03mm. Program probing cycles every 90min: measure " +
      "reference datum → calculate offset → apply WCS correction → " +
      "continue. Schedule finishing during thermally stable periods (after " +
      "2+ hours warmup). Tebis post processor can insert probe macro " +
      "calls at specified operation boundaries automatically.",
    category: "optimization",
    tags: ["thermal", "compensation", "probing", "drift"],
    operation_types: ["optimization"],
    confidence: 81,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-104",
    title: "Surface Finish Variance from Tool Wear Progression",
    body:
      "Surface finish degrades with wear: fresh Ra=0.4μm → mid-life " +
      "Ra=0.6μm → near-replacement Ra=1.0μm. This 2.5:1 variance means " +
      "specifying Ra 0.8μm requires starting at 0.4μm. Track Ra vs tool " +
      "usage time to build wear-finish curves per tool/material pair. " +
      "Replace when Ra exceeds 70% of tolerance — accounts for " +
      "measurement uncertainty (±0.1μm typical).",
    category: "optimization",
    tags: ["surface-finish", "wear", "variance", "ra"],
    operation_types: ["optimization"],
    confidence: 80,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-105",
    title: "DOE for Cutting Parameter Optimization",
    body:
      "Run 2³ factorial DOE: cutting speed (low/high), feed (low/high), " +
      "DOC (low/high). Responses: surface finish, cycle time, tool wear " +
      "rate. Analyze main effects and interactions. Typically: speed×feed " +
      "interaction significant for surface finish, DOC×feed dominates " +
      "tool wear. Optimal point is rarely at factor extremes — it's in " +
      "the interior of the design space.",
    category: "optimization",
    tags: ["doe", "factorial", "optimization", "interaction"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-106",
    title: "SPC Control Charts for Critical Mold Dimensions",
    body:
      "After establishing stable Tebis programs, implement SPC on critical " +
      "dimensions. X-bar/R charts from first 25 parts establish control " +
      "limits. Monitor for: trends (7 consecutive points = tool wear), " +
      "shifts (fixture or WCS issue), increasing range (vibration onset). " +
      "Re-qualify the program when any out-of-control signal is detected. " +
      "SPC evidence is increasingly required by automotive OEMs.",
    category: "optimization",
    tags: ["spc", "control-charts", "monitoring", "automotive"],
    operation_types: ["optimization"],
    confidence: 82,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-107",
    title: "Uncertainty Budget for Mold Cavity Dimensions",
    body:
      "Total uncertainty for mold cavity machining: machine positioning " +
      "(±0.003mm), tool diameter tolerance (±0.005mm H6), tool deflection " +
      "(±0.008mm for 6mm ball at 100N), thermal growth (±0.005mm over " +
      "4hr cycle), measurement (±0.002mm CMM). RSS total: ±0.012mm. " +
      "This determines achievable tolerance. For ±0.01mm specs, improve " +
      "largest contributor (tool deflection — larger diameter or shorter).",
    category: "optimization",
    tags: ["uncertainty", "budget", "rss", "mold-cavity"],
    operation_types: ["optimization"],
    confidence: 81,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-108",
    title: "Digital Twin Feedback for Continuous Improvement",
    body:
      "Build digital twin of Tebis process: (1) simulate cutting forces " +
      "from toolpath geometry, (2) predict thermal deformation from heat " +
      "input, (3) estimate surface finish from feed marks and vibration. " +
      "Compare predictions to CMM data. When error exceeds 10%, update " +
      "model parameters. After 10 iterations, predictions converge to " +
      "±3%. Enables predictive quality — flag bad parts before CMM.",
    category: "optimization",
    tags: ["digital-twin", "feedback", "convergence", "predictive"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-109",
    title: "Sensitivity Analysis for Parameter Prioritization",
    body:
      "Vary each parameter ±10%, measure impact on surface finish and " +
      "accuracy. Typical sensitivity ranking: step-over (35% of finish " +
      "variation), feed rate (25%), cutting speed (20%), DOC (15%), tool " +
      "runout (5%). Focus optimization on top 2 parameters — they account " +
      "for 60% of variation. Tebis parameter sweep via NCJob copies " +
      "generates comparison toolpaths efficiently.",
    category: "optimization",
    tags: ["sensitivity", "prioritization", "variation", "ranking"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-110",
    title: "Sobol Sensitivity Indices for Parameter Importance",
    body:
      "Compute Sobol first-order (Si) and total-order (STi) indices. " +
      "For Tebis finishing: step-over (Si=0.35, STi=0.42), feed (Si=0.25, " +
      "STi=0.33), speed (Si=0.18, STi=0.25). The gap between Si and STi " +
      "reveals interaction strength. Parameters with high STi but low Si " +
      "are important primarily through interactions — they need factorial " +
      "DOE investigation, not one-at-a-time optimization.",
    category: "optimization",
    tags: ["sobol", "sensitivity-indices", "interactions", "global"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-111",
    title: "Pareto Front for Quality vs Cycle Time Trade-Off",
    body:
      "Build Pareto front by varying step-over (0.1-0.5mm) and feed " +
      "(0.03-0.10mm/tooth) in Tebis. Plot surface finish vs cycle time. " +
      "The Pareto-optimal set shows best achievable quality at each " +
      "cycle time. Tight-tolerance molds favor quality end; production " +
      "dies favor speed end. The Pareto front is specific to each " +
      "tool-material-machine combination.",
    category: "optimization",
    tags: ["pareto", "multi-objective", "quality", "cycle-time"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-112",
    title: "Response Surface Methodology for Process Optimization",
    body:
      "Use RSM (central composite design) to find optimal speed, feed, " +
      "DOC. Fit second-order polynomial: Ra = β₀ + β₁v + β₂f + β₃d + " +
      "β₁₂vf + β₁₁v² + ... The optimal point is at partial derivatives " +
      "= 0. RSM requires 15-20 runs for 3 factors — fewer than full " +
      "factorial. Tebis NCJob templates can generate toolpath variants " +
      "for each experimental run efficiently.",
    category: "optimization",
    tags: ["rsm", "response-surface", "central-composite", "polynomial"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-113",
    title: "Robust Material Hardness Tolerance in Parameters",
    body:
      "P20 mold steel varies ±2 HRC across a block (28-34 typical). " +
      "H13 varies ±1.5 HRC (48-52). Design Tebis cutting parameters " +
      "that tolerate this range: moderate speeds (120-160 m/min for P20) " +
      "with consistent chip load produce stable results. Extreme high-" +
      "speed parameters work at nominal hardness but fail unpredictably " +
      "at the hard end of the distribution.",
    category: "optimization",
    tags: ["hardness-variation", "robust", "material-batch", "stability"],
    operation_types: ["optimization"],
    confidence: 80,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-114",
    title: "Correlated Input Uncertainty via Cholesky Decomposition",
    body:
      "Machining parameters have correlated uncertainties: speed and feed " +
      "are often adjusted together (operator habits), material hardness " +
      "correlates with tensile strength. When running Monte Carlo, use " +
      "Cholesky decomposition of the correlation matrix for properly " +
      "correlated random samples. Ignoring correlations underestimates " +
      "total uncertainty by 10-20% for highly correlated inputs.",
    category: "optimization",
    tags: ["cholesky", "correlated", "uncertainty", "monte-carlo"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-115",
    title: "AMSAA Reliability Growth for Program Maturity Tracking",
    body:
      "Track Tebis program maturity using AMSAA model. Plot cumulative " +
      "failures (scraps, rework, tool breaks) vs cumulative production " +
      "hours. Failure rate should follow power law decrease. If trend " +
      "stalls or reverses, investigate: tool vendor change, material " +
      "batch shift, or undocumented machine maintenance. Mature programs " +
      "achieve <0.5% scrap rate after 50+ production cycles.",
    category: "optimization",
    tags: ["amsaa", "reliability-growth", "maturity", "scrap-rate"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-116",
    title: "Uncertainty Propagation Through Multi-Operation Sequences",
    body:
      "In multi-operation sequences (rough→semi→finish), uncertainty " +
      "compounds. Each operation adds: position error (machine repeatability), " +
      "thermal contribution (time-dependent), tool error (runout, wear). " +
      "Propagate via RSS at each stage: σ_total = √(σ₁² + σ₂² + σ₃²...). " +
      "This analysis determines whether a 4-operation sequence can " +
      "achieve the target tolerance or needs additional operations.",
    category: "optimization",
    tags: ["uncertainty-propagation", "multi-operation", "rss", "tolerance"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-117",
    title: "Cost Optimization with Taguchi Loss Function",
    body:
      "Total cost per part: C_total = C_machine_time + C_tool_cost + " +
      "C_setup + C_quality_losses. Quality losses follow Taguchi loss " +
      "function: L = k(y-m)². The optimal parameters minimize C_total, " +
      "not individual components. Typically requires 5-10% longer cycle " +
      "time than time-optimized parameters to avoid quality costs from " +
      "surface finish variation and dimensional drift.",
    category: "optimization",
    tags: ["taguchi-loss", "cost", "optimization", "economics"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-118",
    title: "Process FMEA Integration with Tebis Operations",
    body:
      "Link Process FMEA to Tebis operations. For each operation, identify " +
      "failure modes (tool breakage, dimension drift, surface defects), " +
      "effects (scrap, rework, assembly failure), and assign RPN = " +
      "Severity × Occurrence × Detection. Focus mitigation on high-RPN " +
      "operations: add in-process probing, reduce tool life limits, or " +
      "add redundant finishing passes. Automotive OEMs require FMEA " +
      "linkage to NC programs.",
    category: "optimization",
    tags: ["fmea", "risk", "rpn", "failure-mode"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-119",
    title: "Predictive Maintenance from Cycle Time Trend Data",
    body:
      "Track cycle time trend across production runs. Gradual increase " +
      "(5-10% over 50 parts) indicates: spindle bearing wear (increased " +
      "settling), ball screw backlash growth (more compensation moves), " +
      "or guideway wear (slower acceleration). Cross-reference with " +
      "machine maintenance logs. Tebis estimated vs actual cycle time " +
      "gap is the key indicator for scheduling preventive maintenance.",
    category: "optimization",
    tags: ["predictive-maintenance", "cycle-time-trend", "bearing", "backlash"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-120",
    title: "Machine Learning for Adaptive Parameter Selection",
    body:
      "Collect Tebis program data (parameters → outcomes) over 100+ " +
      "production runs. Train regression model: Ra = f(speed, feed, DOC, " +
      "tool_wear_state, hardness). Use to predict optimal parameters for " +
      "each new job based on material batch hardness and tool condition. " +
      "Start with linear regression, upgrade to random forest if " +
      "interactions are strong. Update model monthly with new data.",
    category: "optimization",
    tags: ["machine-learning", "regression", "adaptive", "prediction"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Turning, Wire EDM and Cross-Domain (teb-121 to teb-140) ===
  {
    id: "teb-121",
    title: "Tebis Turning Module for Mill-Turn Centers",
    body:
      "Tebis turning module programs OD/ID profiling, grooving, threading, " +
      "and drilling on mill-turn centers. Define turret layout with tool " +
      "positions. Program CSS (constant surface speed) for profiling. " +
      "Synchronize turning and milling operations via the operation " +
      "timeline. For complex parts, alternate turning and milling passes " +
      "to maintain workpiece rigidity throughout the sequence.",
    category: "cam_strategy",
    tags: ["turning", "mill-turn", "profiling", "css"],
    operation_types: ["turning"],
    confidence: 83,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-122",
    title: "Wire EDM Programming in Tebis",
    body:
      "Tebis wire EDM supports 2-axis and 4-axis taper cutting. Define " +
      "profile geometry, taper angles, and skim cut passes. Set technology " +
      "parameters: wire type, flushing mode, power settings per cut " +
      "(rough, trim1, trim2, skim). For 4-axis, specify independent " +
      "top and bottom profiles. Add tabs for slug retention on internal " +
      "cutouts. Output Fanuc, Sodick, or Mitsubishi controller formats.",
    category: "cam_strategy",
    tags: ["wire-edm", "4-axis", "taper", "slug-retention"],
    operation_types: ["wire_edm"],
    confidence: 82,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-123",
    title: "Feature-Based Drilling with Automatic Cycle Selection",
    body:
      "Tebis recognizes hole features from the 3D model: through, blind, " +
      "countersink, counterbore, tapped. After recognition, assign drilling " +
      "strategies in batch. Set recognition tolerance to 0.01mm. Sort " +
      "features by diameter to optimize tool changes. Assign canned " +
      "cycles automatically: G81 for through, G83 peck for deep, G84 " +
      "for tapping. Review — filleted pockets occasionally misidentified.",
    category: "cam_strategy",
    tags: ["drilling", "feature-recognition", "canned-cycles", "automation"],
    operation_types: ["drilling"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-124",
    title: "Helical Milling for Precision Hole Making",
    body:
      "Helical milling creates holes via circular interpolation with " +
      "simultaneous Z-feed. Advantages: one tool makes multiple sizes, " +
      "lower forces (no chisel edge), better chip evacuation, no drill " +
      "breakthrough burr. In Tebis: set helical diameter to desired hole, " +
      "helix pitch 0.3-0.5mm, use flat-end mill 60-70% of hole diameter. " +
      "Superior to drilling for Inconel and titanium.",
    category: "cam_strategy",
    tags: ["helical-milling", "hole-making", "interpolation", "burr-free"],
    operation_types: ["drilling"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-125",
    title: "Additive/Hybrid Manufacturing Integration",
    body:
      "Tebis supports DED (Directed Energy Deposition) for hybrid " +
      "manufacturing: alternate additive deposition and subtractive " +
      "machining. Define layer height, bead width, overlap percentage. " +
      "After each additive layer block, run a machining pass for " +
      "dimensional accuracy. Use for: component repair, feature addition, " +
      "and near-net-shape production of expensive aerospace materials.",
    category: "cam_strategy",
    tags: ["additive", "hybrid", "ded", "repair"],
    operation_types: ["additive"],
    confidence: 81,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-126",
    title: "Multi-Setup Coordinate System Alignment",
    body:
      "For multi-setup parts, define master coordinate system shared " +
      "across all setups. Each setup workplane references the master " +
      "datum. Use probing routines at start of each setup to verify " +
      "alignment. When machining both sides, use precision dowel pins " +
      "or 3-2-1 locating to ensure Setup 2 aligns with Setup 1 features. " +
      "Tebis setup sheets include datum locations for each workplane.",
    category: "setup",
    tags: ["multi-setup", "alignment", "datum", "probing"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-127",
    title: "Disc Cutter for Slot and Groove Machining",
    body:
      "Define disc (slitting/slotting) cutters in Tebis with correct " +
      "geometry: disc diameter, thickness, bore size, number of teeth. " +
      "Use 3+2 axis positioning to orient the disc for each slot. Set " +
      "cutting speed based on disc outer diameter. Feed per tooth must " +
      "account for large tooth count (20-60). Enable flood coolant " +
      "for chip evacuation from the slot.",
    category: "cam_strategy",
    tags: ["disc-cutter", "slotting", "groove", "3-plus-2"],
    operation_types: ["roughing"],
    confidence: 82,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-128",
    title: "Taper Ball Nose for Draft Wall Finishing",
    body:
      "Taper ball nose cutters combine a ball tip with tapered shank for " +
      "improved rigidity on deep cavity walls. In Tebis, define ball radius " +
      "and taper half-angle precisely. Use for Z-level finishing on draft " +
      "walls — the taper provides a larger effective cutting zone while " +
      "the ball tip handles floor transitions. Taper angle must match " +
      "wall draft angle to prevent interference.",
    category: "finishing",
    tags: ["taper-ball", "draft-wall", "rigidity", "deep-cavity"],
    operation_types: ["finishing"],
    confidence: 83,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-129",
    title: "Thickness Allowance Strategy for Progressive Machining",
    body:
      "Use progressive thickness allowances: roughing 0.5mm, semi-finish " +
      "0.15mm, finish 0.0mm. Each operation removes only its allowance " +
      "layer, preventing tool overload. For hardened steel, add extra " +
      "semi-finish pass (0.3→0.15→0.05→0.0mm) to distribute stock " +
      "across more lighter cuts. This extends tool life by 40-60% " +
      "compared to 2-pass strategies.",
    category: "cam_strategy",
    tags: ["thickness-allowance", "progressive", "stock-removal", "tool-life"],
    operation_types: ["roughing", "finishing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-130",
    title: "Vericut Integration for Independent Verification",
    body:
      "Export Tebis toolpaths to Vericut for independent verification. " +
      "Vericut force-based simulation catches excessive cutting forces " +
      "that geometric simulation misses. Compare Vericut estimated cycle " +
      "time against Tebis — differences >10% indicate feed rate " +
      "optimization opportunities. Use Vericut for final sign-off on " +
      "complex 5-axis mold programs before first-article production.",
    category: "setup",
    tags: ["vericut", "verification", "force-simulation", "independent"],
    operation_types: ["setup"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-131",
    title: "Tebis API for External System Integration",
    body:
      "Tebis API enables integration with: ERP (job import), tool " +
      "management (tool data sync), PDM (model version control), and " +
      "MES (program dispatch). Automate: project creation, model import, " +
      "template application, NC file export. Common integration: pull job " +
      "from ERP → create Tebis project → apply NCJob template → " +
      "post-process → upload to DNC server.",
    category: "setup",
    tags: ["api", "integration", "erp", "mes"],
    operation_types: ["setup"],
    confidence: 82,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-132",
    title: "Cast Iron Dry Machining Strategy",
    body:
      "Gray and ductile cast iron machines best dry or with air blast. " +
      "Cast iron chips are short and brittle. Use uncoated or TiN-coated " +
      "carbide at 150-250 m/min. DOC can be aggressive (1.5-2×D). Tebis " +
      "standard offset roughing works well — cast iron doesn't require " +
      "constant engagement strategies. Coolant actually reduces tool life " +
      "in cast iron due to thermal shock cycling.",
    category: "cam_strategy",
    tags: ["cast-iron", "dry-machining", "air-blast", "brittle-chips"],
    operation_types: ["roughing"],
    confidence: 85,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-133",
    title: "Copper Electrode Machining Parameters",
    body:
      "Copper electrodes: use sharp uncoated or diamond-polished tools, " +
      "200-500 m/min, 0.05-0.15mm feed/tooth. Flood coolant for chip " +
      "evacuation — copper produces long stringy chips. Use chipbreaker " +
      "geometry or high feed strategies. Copper is softer than graphite " +
      "but wears tools less. Better surface finish than graphite — " +
      "preferred for precision EDM with fine surface requirements.",
    category: "cam_strategy",
    tags: ["copper", "electrode", "edm", "sharp-tools"],
    operation_types: ["finishing"],
    confidence: 84,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-134",
    title: "Plastics and PEEK Medical Device Machining",
    body:
      "For plastics (PEEK, Delrin, nylon) in Tebis: single-flute or " +
      "2-flute uncoated tools with high positive rake, 200-500 m/min, " +
      "0.1-0.2mm feed/tooth. Avoid excessive heat — plastics melt, not " +
      "cut. Use compressed air cooling. For PEEK medical implants, use " +
      "diamond-coated tools (no metal contamination for biocompatibility). " +
      "Down-cut direction prevents lifting thin plastic features.",
    category: "cam_strategy",
    tags: ["plastics", "peek", "medical", "biocompatibility"],
    operation_types: ["finishing"],
    confidence: 83,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-135",
    title: "Plunge Roughing for Deep Pockets and Slots",
    body:
      "Plunge (Z-axis) roughing drills into the stock vertically, then " +
      "repositions and plunges again. In Tebis, set plunge step-over " +
      "to 60-70% of tool diameter for coverage. Plunge roughing is " +
      "effective for: narrow deep slots (L/D > 4), hard materials " +
      "(>45 HRC), and weak machine spindles. Forces are primarily " +
      "axial (strongest direction). Slower MRR than lateral roughing.",
    category: "roughing",
    tags: ["plunge-roughing", "deep-pockets", "axial-forces", "hard-materials"],
    operation_types: ["roughing"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-136",
    title: "Chamfering with Angle-Specific Tools",
    body:
      "Program chamfering using dedicated chamfer mills (45°, 60°, 90°), " +
      "ball-end mills tracing edges at depth, or spot drills for holes. " +
      "In Tebis, define the chamfer tool angle and engagement depth to " +
      "control chamfer width. For 3D chamfers on freeform edges, use " +
      "5-axis tool normal orientation. Verify chamfer width consistency " +
      "in simulation before posting.",
    category: "finishing",
    tags: ["chamfering", "chamfer-mill", "edge-breaking", "angle"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-137",
    title: "Tebis Blade Module for Turbine Components",
    body:
      "Tebis blade module handles blisks, impellers, and individual " +
      "blades. Define hub, shroud, blade surfaces, splitter blades. " +
      "Generate roughing (plunge between blades), semi-finishing, and " +
      "hub finishing toolpaths. Use barrel cutters for blade finishing — " +
      "3-5× wider step-over for same scallop height. Check 5-axis " +
      "singularities at blade leading/trailing edges.",
    category: "specialty",
    tags: ["blade", "turbine", "blisk", "impeller"],
    operation_types: ["specialty"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-138",
    title: "Spiral Finishing for Flat Pocket Floors",
    body:
      "For flat or near-flat pocket floors, spiral finishing produces " +
      "superior surface quality vs raster. Continuous spiral motion " +
      "eliminates direction changes that leave witness marks. Set " +
      "step-over for target scallop height. Use climb milling direction. " +
      "Tebis spiral auto-computes the center start point and expands " +
      "outward to the boundary. Best for visible flat surfaces.",
    category: "finishing",
    tags: ["spiral", "flat-pocket", "witness-marks", "continuous"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-139",
    title: "Facing Operations with Large Diameter Tools",
    body:
      "Tebis facing operation machines the top surface using face mills " +
      "or large flat end mills. Set step-over to 65-75% of cutter " +
      "diameter for full coverage. Enable one-way cutting to avoid " +
      "conventional milling on return. For interrupted cuts (bolt holes, " +
      "keyways), reduce feed 20% at entry to prevent insert chipping. " +
      "Use wiper inserts for single-pass mirror finish.",
    category: "roughing",
    tags: ["facing", "face-mill", "step-over", "wiper-insert"],
    operation_types: ["roughing"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-140",
    title: "Pocket Machining with Automatic Island Detection",
    body:
      "Tebis automatically detects islands (bosses) within pockets and " +
      "generates toolpaths around them. Set island offset equal to finish " +
      "stock allowance. For multiple nested pockets, enable progressive " +
      "level cutting — each Z-level machines all pockets before stepping " +
      "down. This prevents excessive rapid moves between disconnected " +
      "pocket regions, saving 15-25% cycle time.",
    category: "roughing",
    tags: ["pocket", "island-detection", "progressive-level", "efficiency"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Advanced Science and Cross-Domain (teb-141 to teb-160) ===
  {
    id: "teb-141",
    title: "Kienzle Force Model for Feed Rate Verification",
    body:
      "Verify Tebis cutting forces using Kienzle model: Fc = kc1.1 × " +
      "b × h^(1-mc), where kc1.1 is specific cutting force (N/mm²), " +
      "b = depth of cut, h = chip thickness. For P20 steel: kc1.1 = " +
      "1780 N/mm², mc = 0.26. Compare predicted force against machine " +
      "spindle rating. If Fc exceeds 50% of rated spindle torque at " +
      "the operating RPM, reduce DOC or feed.",
    category: "optimization",
    tags: ["kienzle", "cutting-force", "verification", "spindle-torque"],
    operation_types: ["optimization"],
    confidence: 82,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-142",
    title: "Taylor Tool Life Equation for Economic Cutting Speed",
    body:
      "Taylor equation: VT^n = C where V = cutting speed, T = tool life, " +
      "n = exponent (0.2-0.4 for carbide), C = constant. Economic cutting " +
      "speed minimizes cost/part: V_econ = C / (((1/n)-1) × (Ct/Cm + tc))^n " +
      "where Ct = tool cost, Cm = machine rate, tc = change time. For Tebis " +
      "programs, V_econ is typically 70-80% of V_max (maximum productivity " +
      "speed). Longer tool life reduces interruptions.",
    category: "optimization",
    tags: ["taylor", "tool-life", "economic-speed", "cost-per-part"],
    operation_types: ["optimization"],
    confidence: 81,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-143",
    title: "Merchant Shear Angle for Chip Formation Analysis",
    body:
      "Merchant model: tan(2φ) = 1 - (2τs)/(σn × sin(2(φ+β-α))) where " +
      "φ = shear angle, β = friction angle, α = rake angle. Higher shear " +
      "angle = thinner chips = lower forces = better surface finish. " +
      "Use this to understand why certain tool geometries work better: " +
      "higher positive rake → higher shear angle → better results. " +
      "Validates Tebis tool selection for difficult materials.",
    category: "optimization",
    tags: ["merchant", "shear-angle", "chip-formation", "rake"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-144",
    title: "Tool Deflection Compensation δ = FL³/3EI",
    body:
      "Cantilever beam deflection: δ = FL³/(3EI) where F = cutting force, " +
      "L = overhang, E = Young's modulus (carbide ≈ 580 GPa), I = πd⁴/64. " +
      "For 6mm ball-end at 40mm overhang, 50N force: δ = 0.009mm. Tebis " +
      "can apply tool deflection compensation to the toolpath by offsetting " +
      "the tool position by the predicted deflection magnitude. Critical " +
      "for finishing deep cavities with long-reach tools.",
    category: "optimization",
    tags: ["deflection", "compensation", "cantilever", "beam"],
    operation_types: ["optimization"],
    confidence: 82,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-145",
    title: "Thermal Growth Model α×ΔT×L for Dimensional Prediction",
    body:
      "Linear thermal growth: δ = α × ΔT × L where α = CTE (steel " +
      "≈ 12×10⁻⁶/°C), ΔT = temperature change, L = measurement length. " +
      "For a 500mm mold block with 5°C spindle heat rise: δ = 0.030mm. " +
      "This error is systematic and can be compensated in Tebis by " +
      "adjusting WCS offsets based on predicted thermal state. Schedule " +
      "critical finishing during thermally stable windows.",
    category: "optimization",
    tags: ["thermal-growth", "cte", "dimensional", "compensation"],
    operation_types: ["optimization"],
    confidence: 80,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-146",
    title: "Fourier Analysis for Chatter Frequency Identification",
    body:
      "Identify chatter by FFT analysis of spindle vibration or audio " +
      "signal. Chatter frequencies relate to tooth passing frequency " +
      "(f_tooth = N × RPM/60) and natural frequencies of the tool/ " +
      "workpiece system. If chatter peak appears between tooth passing " +
      "harmonics, it's regenerative chatter. Shift RPM by 10-15% to " +
      "move the stability lobe boundary. Tebis can encode multiple RPM " +
      "options in the post output for operator selection.",
    category: "optimization",
    tags: ["fourier", "chatter", "fft", "frequency"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-147",
    title: "Hertzian Contact Stress for Ball-End Tool Design",
    body:
      "Ball-end mill contact follows Hertzian theory: σ_max ∝ (F/R²)^(1/3) " +
      "where F = normal force, R = ball radius. Larger ball radius reduces " +
      "contact stress and wear rate. For hardened steel finishing, minimum " +
      "ball diameter = 2× step-over / sin(max_slope_angle). This prevents " +
      "the high contact stress at the tool tip that causes premature " +
      "CBN insert failure on hard mold steel.",
    category: "optimization",
    tags: ["hertzian", "contact-stress", "ball-end", "wear"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-148",
    title: "Coffin-Manson for Thermal Fatigue of Cutting Inserts",
    body:
      "Thermal fatigue in interrupted cutting follows Coffin-Manson: " +
      "Nf = C × (Δε)^(-β) where Δε = thermal strain range = α×ΔT, " +
      "β ≈ 2.0 for cemented carbide. Large temperature swings (dry→flood " +
      "coolant) accelerate thermal cracking. For Tebis interrupted " +
      "operations (island crossing, multiple pockets), either commit " +
      "fully to dry machining or continuous flood — intermittent coolant " +
      "halves insert life.",
    category: "optimization",
    tags: ["coffin-manson", "thermal-fatigue", "interrupted", "insert-life"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-149",
    title: "Archard Wear Equation for Abrasive Tool Wear",
    body:
      "Archard wear model: V = K × F × d / H where V = wear volume, " +
      "K = wear coefficient, F = normal force, d = sliding distance, " +
      "H = tool hardness. For flank wear: VB = K × Vc × t × f_z / H_tool. " +
      "This predicts that doubling cutting speed quadruples wear rate " +
      "(distance doubles, temperature-dependent K also doubles). Use to " +
      "validate Tebis speed/feed selections against tool life targets.",
    category: "optimization",
    tags: ["archard", "wear", "flank", "abrasive"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-150",
    title: "Polynomial Chaos Expansion for Uncertainty Quantification",
    body:
      "PCE approximates output distributions from uncertain inputs using " +
      "polynomial basis functions. For Tebis process: expand Ra(v,f,d) as " +
      "sum of Hermite polynomials weighted by input distributions. PCE " +
      "converges faster than Monte Carlo (100 samples vs 10,000) for " +
      "smooth response surfaces. Use PCE to quickly estimate P(Ra > spec) " +
      "for different parameter combinations without running thousands of " +
      "simulations.",
    category: "optimization",
    tags: ["pce", "polynomial-chaos", "uncertainty", "hermite"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-151",
    title: "Latin Hypercube Sampling for Efficient DOE",
    body:
      "LHS generates space-filling sample plans more efficiently than " +
      "full factorial. For 5 parameters at 3 levels: full factorial = " +
      "243 runs, LHS = 30-50 runs with comparable coverage. Use LHS for " +
      "initial screening of Tebis parameter space before targeted RSM " +
      "optimization. LHS ensures each parameter level is sampled equally " +
      "while exploring the full multi-dimensional space.",
    category: "optimization",
    tags: ["lhs", "sampling", "doe", "space-filling"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-152",
    title: "Bayesian Optimization for Multi-Objective Parameter Search",
    body:
      "Bayesian optimization uses Gaussian process surrogate models to " +
      "efficiently search the parameter space. After each trial, the " +
      "posterior updates and the acquisition function (Expected " +
      "Improvement) guides the next trial to the most informative point. " +
      "Converges to optimal Tebis parameters in 15-25 trials vs 100+ " +
      "for grid search. Best when physical trials are expensive " +
      "(aerospace parts, exotic materials).",
    category: "optimization",
    tags: ["bayesian-optimization", "gaussian-process", "acquisition", "efficient"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-153",
    title: "Kalman Filter for Real-Time Tool Wear Estimation",
    body:
      "Kalman filter estimates hidden tool wear state from noisy spindle " +
      "power measurements. State equation: VB(k+1) = VB(k) + wear_rate × Δt. " +
      "Observation: P_spindle = f(VB, cutting_params). The filter fuses " +
      "the predicted wear with measured spindle power to estimate actual " +
      "VB in real-time. When estimated VB exceeds threshold, trigger " +
      "tool change. Apply to long-running Tebis mold finishing programs.",
    category: "optimization",
    tags: ["kalman-filter", "tool-wear", "real-time", "spindle-power"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-154",
    title: "Bootstrap Confidence Intervals for Tool Life Data",
    body:
      "With small tool life samples (n < 15), bootstrap resampling " +
      "provides more reliable confidence intervals than parametric " +
      "methods. Resample tool life data 10,000 times with replacement, " +
      "compute mean life for each resample, and extract 2.5th/97.5th " +
      "percentiles for 95% CI. BCa (bias-corrected accelerated) bootstrap " +
      "handles skewed Weibull distributions better than basic bootstrap.",
    category: "optimization",
    tags: ["bootstrap", "confidence-intervals", "small-sample", "bca"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-155",
    title: "Principal Component Analysis for Multi-Response Optimization",
    body:
      "When optimizing multiple responses (Ra, accuracy, tool life, cycle " +
      "time), PCA reduces the dimensionality. Extract principal components " +
      "from the standardized response matrix. Optimize the first 2-3 PCs " +
      "that capture 85-90% of total variance. This avoids the problem " +
      "of conflicting optima across individual responses and produces " +
      "a balanced compromise solution.",
    category: "optimization",
    tags: ["pca", "multi-response", "dimensionality-reduction", "compromise"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-156",
    title: "CUSUM Charts for Early Detection of Process Drift",
    body:
      "CUSUM (Cumulative Sum) control charts detect small persistent " +
      "shifts faster than X-bar charts. Set decision interval h = 4-5σ " +
      "and allowance k = 0.5σ. CUSUM detects 1σ shifts in 10 samples " +
      "vs 44 for X-bar. Use CUSUM on critical mold dimensions to catch " +
      "tool wear drift before parts go out-of-tolerance. Pair with " +
      "EWMA for comprehensive shift detection.",
    category: "optimization",
    tags: ["cusum", "control-charts", "drift", "early-detection"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-157",
    title: "EWMA Charts for Smoothed Process Monitoring",
    body:
      "EWMA (Exponentially Weighted Moving Average) charts smooth process " +
      "data with weight λ (0.05-0.25). Lower λ gives more smoothing, " +
      "better at detecting small shifts. EWMA with λ=0.1 detects 0.5σ " +
      "shifts in 20 samples. Combine with CUSUM for comprehensive " +
      "monitoring of Tebis production runs. EWMA is robust to non-" +
      "normal data distributions common in machining.",
    category: "optimization",
    tags: ["ewma", "smoothing", "monitoring", "non-normal"],
    operation_types: ["optimization"],
    confidence: 78,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-158",
    title: "Hotelling T² for Multivariate SPC",
    body:
      "When multiple dimensions are correlated (common in mold machining), " +
      "univariate SPC gives false alarms. Hotelling T² monitors all " +
      "dimensions simultaneously: T² = (x-μ)ᵀ × S⁻¹ × (x-μ). Control " +
      "limit: T²_α from F-distribution. Decompose out-of-control signals " +
      "using MYT decomposition to identify which dimension(s) caused the " +
      "alarm. Requires n > 5p (p = number of dimensions).",
    category: "optimization",
    tags: ["hotelling", "multivariate-spc", "t-squared", "correlated"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-159",
    title: "Morris Screening for Factor Importance Ranking",
    body:
      "Morris method (elementary effects) efficiently screens many factors " +
      "to identify the important few. Compute μ* (mean absolute elementary " +
      "effect) and σ (standard deviation) for each factor. High μ* = " +
      "important factor. High σ = factor involved in interactions or " +
      "nonlinear effects. Use Morris screening with 10-12 factors, then " +
      "do detailed DOE/RSM on the top 3-4 factors identified.",
    category: "optimization",
    tags: ["morris", "screening", "elementary-effects", "factor-ranking"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-160",
    title: "Dimensional Invariant Checks for Process Validation",
    body:
      "Validate machining physics using dimensional invariants: cutting " +
      "power P = Fc × Vc (must equal spindle power draw), specific energy " +
      "u = P/(MRR), and chip ratio rc = chip_thickness/uncut_thickness. " +
      "If measured values deviate >20% from predictions, the process has " +
      "a problem (tool wear, incorrect parameters, fixture compliance). " +
      "Use these checks as go/no-go validation for new Tebis programs.",
    category: "optimization",
    tags: ["dimensional-invariant", "validation", "specific-energy", "chip-ratio"],
    operation_types: ["optimization"],
    confidence: 79,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  // === Final Expansion (teb-161 to teb-200) ===
  {
    id: "teb-161",
    title: "Polishing-Ready Surface from Machining",
    body:
      "Achieve Ra 0.4-0.8μm directly: (1) scallop formula for step-over, " +
      "(2) constant scallop mode, (3) sharp tools <50% life, (4) lead/lean " +
      "for ball-end, (5) air blast for hardened steel. Reduces polishing " +
      "50-70% on mold surfaces. Tebis 3D offset with constant scallop is " +
      "the preferred strategy for polishing-ready results.",
    category: "finishing",
    tags: ["polishing-ready", "ra", "labor-savings", "surface-quality"],
    operation_types: ["finishing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-162",
    title: "Trochoidal Milling for Hard Material Slots",
    body:
      "8-15% radial engagement, full depth, 3-5× feed vs conventional. " +
      "Constant engagement prevents impact loading. Slot width independent " +
      "of tool diameter. For >45 HRC: trochoidal is preferred roughing. " +
      "Tebis adaptive roughing handles trochoidal paths automatically " +
      "with engagement angle control.",
    category: "roughing",
    tags: ["trochoidal", "hard-materials", "constant-engagement", "slots"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-163",
    title: "Flat Area Detection for Face Milling",
    body:
      "Tebis detects flat/near-flat areas (threshold 5-10°) on freeform " +
      "models for face milling instead of ball-end. 3-5× faster, better " +
      "Ra. Boundary auto-separates flat from curved regions. Use flat-end " +
      "for detected areas, ball-end for remaining. Saves significant " +
      "cycle time on parts with mixed flat and curved surfaces.",
    category: "finishing",
    tags: ["flat-area", "detection", "face-milling", "hybrid-strategy"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-164",
    title: "Rotary Axis Wrapping for 4-Axis Engraving",
    body:
      "Wrap 2D patterns onto cylinders via rotary substitution. Verify " +
      "diameter matches actual part — errors cause circumferential scale " +
      "distortion. For text, logos, patterns on round mold components. " +
      "Tebis generates rotary-substituted G-code automatically. X-axis " +
      "motion converts to A/B-axis rotation.",
    category: "multi_axis",
    tags: ["rotary-wrap", "4-axis", "engraving", "cylindrical"],
    operation_types: ["multi_axis"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-165",
    title: "Helical Milling for Hardened Steel Holes",
    body:
      "Circular interpolation + Z-feed. One tool for multiple sizes. " +
      "Lower forces (no chisel edge), no burr, better evacuation. " +
      "Flat-end 60-70% of hole diameter, pitch 0.3-0.5mm. Superior " +
      "to drilling in hardened steel where drills wander. Tebis helical " +
      "operation handles geometry automatically.",
    category: "cam_strategy",
    tags: ["helical-milling", "hardened-steel", "burr-free", "precision"],
    operation_types: ["drilling"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-166",
    title: "Bayesian Optimization for Efficient Parameter Search",
    body:
      "GP surrogate + Expected Improvement acquisition. Converges in " +
      "15-25 trials vs 100+ grid search. Start with 5-point LHS. Best " +
      "for expensive mold machining trials. After convergence, parameters " +
      "are optimal for specific machine-tool-material. Tebis NCJob " +
      "templates generate trial variants efficiently.",
    category: "optimization",
    tags: ["bayesian-optimization", "gaussian-process", "efficient", "trials"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-167",
    title: "Volumetric Accuracy Compensation",
    body:
      "Import machine 21-error map, Tebis adjusts coordinates to pre-" +
      "compensate. Valuable for large die parts (1m+). Improves from " +
      "±0.03mm to ±0.01mm. Requires periodic calibration (laser " +
      "interferometer or ball-bar). Tebis virtual machine stores the " +
      "compensation data alongside kinematic model.",
    category: "optimization",
    tags: ["volumetric", "compensation", "21-error", "calibration"],
    operation_types: ["optimization"],
    confidence: 82,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-168",
    title: "MTConnect Data Integration for Process Monitoring",
    body:
      "Stream spindle load, axis positions, feed override, alarms. " +
      "Compare actual vs Tebis programmed feeds to find deceleration " +
      "zones (corners, direction changes). Data-driven parameter " +
      "refinement converges 3-5× faster than trial-and-error. Use " +
      "to optimize Tebis corner feed limits and smoothness settings.",
    category: "optimization",
    tags: ["mtconnect", "monitoring", "feed-profile", "data-driven"],
    operation_types: ["optimization"],
    confidence: 81,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-169",
    title: "OEE Calculation from Tebis Data",
    body:
      "OEE = Availability × Performance × Quality. Availability: " +
      "uptime/scheduled. Performance: estimated vs actual feeds. " +
      "Quality: CMM pass/fail per program version. Typical: 75-85%. " +
      "Gap analysis: slow rapids (Performance), excess tool changes " +
      "(Availability), parameter drift (Quality). Target 85%+.",
    category: "optimization",
    tags: ["oee", "availability", "performance", "quality-metric"],
    operation_types: ["optimization"],
    confidence: 80,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-170",
    title: "Disc Cutter for Slot and Groove Machining",
    body:
      "Define disc geometry: diameter, thickness, bore, teeth. 3+2 per " +
      "slot. Speed on outer diameter. Feed accounts for high tooth count " +
      "(20-60). Flood coolant for evacuation. More consistent slot width " +
      "than end mills. Tebis supports full disc cutter simulation and " +
      "collision detection with machine model.",
    category: "roughing",
    tags: ["disc-cutter", "slot", "groove", "consistent-width"],
    operation_types: ["roughing"],
    confidence: 82,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-171",
    title: "PEEK Medical Device Machining",
    body:
      "PEEK implants: 1-2 flute uncoated, high positive rake, 200-500 " +
      "m/min, 0.1-0.2mm fz. Compressed air only for biocompatibility. " +
      "Diamond-coated prevents metal contamination. Down-cut prevents " +
      "lifting. FDA traceability: link Tebis program version to every " +
      "produced implant. Validate with CMM per 21 CFR 820.",
    category: "cam_strategy",
    tags: ["peek", "medical", "fda", "biocompatibility"],
    operation_types: ["finishing"],
    confidence: 82,
    source: "web:tebis-tutorials",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-172",
    title: "Multi-Machine Post Flexibility",
    body:
      "Post same Tebis toolpath for different machines by switching " +
      "virtual machine configs. Program once, post for DMG, Hermle, " +
      "Makino. Each applies machine-specific axis naming, RTCP format, " +
      "retract strategy. Enables flexible scheduling — if one machine " +
      "is busy, quickly re-post for available machine.",
    category: "setup",
    tags: ["multi-machine", "post-processing", "flexibility", "scheduling"],
    operation_types: ["post_processing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-173",
    title: "ERP/MES Integration via Tebis API",
    body:
      "Automate: job import, project creation, template application, " +
      "post-processing, DNC upload. Batch overnight after design changes. " +
      "API syncs tool libraries with crib systems. Common flow: ERP " +
      "pulls job → Tebis project → NCJob template → post → DNC.",
    category: "setup",
    tags: ["api", "erp", "mes", "batch-automation"],
    operation_types: ["setup"],
    confidence: 82,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-174",
    title: "Feature Recognition for Hole Automation",
    body:
      "Recognize through/blind/countersink/counterbore/tapped holes. " +
      "Batch assign canned cycles: G81 through, G83 peck, G84 tap. " +
      "Sort by diameter for tool changes. Tolerance 0.01mm. Review — " +
      "filleted pockets occasionally misidentified. Tebis batch hole " +
      "processing saves significant time on fixture plates.",
    category: "cam_strategy",
    tags: ["feature-recognition", "holes", "batch", "canned-cycles"],
    operation_types: ["drilling"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-175",
    title: "Macro Automation for Standard Sequences",
    body:
      "Tebis NCJob templates and macros record standard sequences. " +
      "Parameterize tool sizes, depths. Replay for similar parts. " +
      "Reduce programming 50-70% on repeat geometry. Store in shared " +
      "project folders. Version-control for process improvement. " +
      "Templates enforce shop standards across all programmers.",
    category: "setup",
    tags: ["macro", "automation", "template", "standardization"],
    operation_types: ["setup"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-176",
    title: "Wire EDM Integration for Hybrid Workflows",
    body:
      "Export Tebis geometry to wire EDM for features better suited to " +
      "wire: thin slots, sharp corners, hardened inserts. Define start " +
      "holes in Tebis, drill during milling setup. Coordinate WCS " +
      "between programs. Wire for thin/sharp, milling for 3D surfaces. " +
      "This hybrid approach uses each process optimally.",
    category: "setup",
    tags: ["wire-edm", "hybrid", "thin-slots", "integration"],
    operation_types: ["setup"],
    confidence: 82,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-177",
    title: "Additive DED Path Planning for Repair",
    body:
      "Tebis DED: contour+fill patterns, 30-50% bead overlap, 60-80% " +
      "layer height. Interleave subtractive every 3-5 layers. For mold " +
      "repair, feature addition, near-net-shape. Reduces machining on " +
      "expensive materials 60-80%. Define deposition speed based on " +
      "wire/powder feed rate.",
    category: "cam_strategy",
    tags: ["additive", "ded", "repair", "near-net-shape"],
    operation_types: ["additive"],
    confidence: 81,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-178",
    title: "Cloud Tool Library Sharing for Multi-Site",
    body:
      "Tebis cloud integration enables multi-site tool library sharing. " +
      "When one site optimizes a tool-material combination, improvement " +
      "propagates. Approved parameter sets with review. Track tool life, " +
      "Ra, Cpk per site. Prevents each site from independently " +
      "re-learning optimal parameters.",
    category: "setup",
    tags: ["cloud", "multi-site", "tool-library", "sharing"],
    operation_types: ["setup"],
    confidence: 82,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-179",
    title: "Collision Avoidance with Safety Margin",
    body:
      "Set collision detection to include full tool assembly plus 0.5mm " +
      "safety margin. Shrink-fit holders for minimum profile. Extended " +
      "tools: 50% feed at 7:1 L/D. Tebis gouge check after every " +
      "finish operation. Machine simulation catches holder/machine " +
      "interference that toolpath-only checking misses.",
    category: "setup",
    tags: ["collision", "safety-margin", "gouge-check", "holder"],
    operation_types: ["roughing", "finishing"],
    confidence: 88,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-180",
    title: "Tool Library with Presetter Synchronization",
    body:
      "Store geometry, holders, parameters per material. Sync with " +
      "presetter (Zoller/Haimer). Actual vs nominal diameter differences " +
      "of 0.01mm affect finish. Update after presetting. Shared " +
      "libraries ensure consistency across shifts. Export tool data " +
      "to setup sheets automatically.",
    category: "setup",
    tags: ["tool-library", "presetter", "sync", "accuracy"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-181",
    title: "Impeller 5-Axis Roughing Strategy",
    body:
      "Plunge roughing between impeller blades removes bulk safely. " +
      "Axial forces into hub (strongest direction). Step-over 50-60% " +
      "of diameter. Then 5-axis contour roughing for passages. Tebis " +
      "blade module manages plunge-to-contour transition automatically. " +
      "Verify collision-free access between adjacent blades.",
    category: "specialty",
    tags: ["impeller", "plunge-roughing", "blade-passage", "5-axis"],
    operation_types: ["specialty"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-182",
    title: "Electrode Set Management for Complex Cavities",
    body:
      "Complex cavities need 20-50 electrodes. Organize by burn area, " +
      "then roughing/finishing. Name: PART-AREA-TYPE-SEQ. Generate " +
      "setup sheets with burn positions, spark gaps, depth targets. " +
      "Track status (new/used/worn). Tebis electrode module manages " +
      "the complete set with automatic undersizing per designation.",
    category: "specialty",
    tags: ["electrode-set", "management", "complex-cavity", "organization"],
    operation_types: ["specialty"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-183",
    title: "Thickness Allowance Progressive Strategy",
    body:
      "Roughing 0.5mm, semi 0.15mm, finish 0.0mm. Hardened: " +
      "0.3→0.15→0.05→0.0mm. Each removes only its layer. Extends " +
      "tool life 40-60% vs 2-pass. Tebis stock model tracks actual " +
      "remaining material accurately between operations in the " +
      "progressive sequence.",
    category: "cam_strategy",
    tags: ["thickness", "progressive", "stock-removal", "tool-life"],
    operation_types: ["roughing", "finishing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-184",
    title: "Multi-Setup Alignment with Precision Datums",
    body:
      "Master coordinate system across setups. Probe at each start. " +
      "Precision dowels or 3-2-1 for alignment. Include datum locations " +
      "in setup sheets. Alignment accuracy between setups determines " +
      "parting line quality on mold tools. Tebis setup sheets " +
      "auto-include WCS data and fixture photos.",
    category: "setup",
    tags: ["multi-setup", "alignment", "datum", "probing"],
    operation_types: ["setup"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-185",
    title: "Pocket Machining with Progressive Level Cutting",
    body:
      "Tebis auto-detects islands in pockets. Progressive level cutting " +
      "machines all pockets per Z-level before stepping down. Prevents " +
      "excessive rapids between disconnected regions. Saves 15-25%. " +
      "Set island offset = finish stock. Review detection — thin ribs " +
      "occasionally missed by automatic detection.",
    category: "roughing",
    tags: ["pocket", "islands", "progressive-level", "efficiency"],
    operation_types: ["roughing"],
    confidence: 87,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-186",
    title: "Rapid Move Height Optimization",
    body:
      "Incremental safe heights (10mm above stock) vs absolute fixed Z. " +
      "Safe-area rapids only when crossing obstacles. 5-15% cycle time " +
      "savings on complex parts. Configure per-operation. Verify in " +
      "simulation that rapids clear fixturing. Critical for multi-" +
      "pocket mold cavities with varying pocket depths.",
    category: "optimization",
    tags: ["rapid-moves", "safe-z", "cycle-time", "multi-pocket"],
    operation_types: ["optimization"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-187",
    title: "Spiral Finishing for Flat Pocket Floors",
    body:
      "Continuous spiral eliminates direction-change witness marks on " +
      "flat surfaces. Set step-over for target scallop. Climb milling. " +
      "Tebis auto-computes center start and expands to boundary. Best " +
      "for visible flat surfaces on consumer product molds and shutoff " +
      "faces where quality directly affects appearance.",
    category: "finishing",
    tags: ["spiral", "flat-pocket", "witness-marks", "continuous"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-188",
    title: "Facing with Wiper Inserts for Mirror Finish",
    body:
      "Face mill 65-75% step-over. One-way cutting. Wiper inserts give " +
      "single-pass mirror finish. Interrupted faces: reduce feed 20% " +
      "at entry. Critical for mold parting surface flatness ±0.01mm " +
      "across entire plate. Tebis facing handles irregular stock and " +
      "avoids clamping regions automatically.",
    category: "roughing",
    tags: ["facing", "wiper", "flatness", "parting-surface"],
    operation_types: ["roughing"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-189",
    title: "Plunge Roughing for Deep Narrow Pockets",
    body:
      "Vertical drilling motions, 60-70% step-over. For L/D>4, >45 HRC, " +
      "weak spindles. Axial forces (strongest direction). Slower MRR " +
      "but dramatically safer. Tebis generates efficient plunge " +
      "patterns with minimized repositioning. Use when lateral roughing " +
      "produces unacceptable vibration.",
    category: "roughing",
    tags: ["plunge", "deep-pockets", "axial-forces", "vibration"],
    operation_types: ["roughing"],
    confidence: 84,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-190",
    title: "Chamfering with Angle-Specific Tools",
    body:
      "Chamfer mills (45/60/90°), ball-end tracing edges, spot drills " +
      "for holes. Define angle and engagement depth. 3D chamfers on " +
      "freeform: 5-axis tool normal. Verify width in simulation. " +
      "Standard: 0.3-0.5mm on all sharp edges. Tebis edge detection " +
      "automates chamfer path generation.",
    category: "finishing",
    tags: ["chamfering", "edge-detection", "angle-specific", "automated"],
    operation_types: ["finishing"],
    confidence: 85,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-191",
    title: "CAD Surface Repair Best Practices",
    body:
      "Imported STEP/IGES: close gaps to 0.1mm, extend surfaces, " +
      "rebuild degenerate faces. Tebis surface analysis identifies " +
      "problems. Fix before programming — machining amplifies defects. " +
      "Clean geometry prerequisite for 5-axis. Pay special attention to " +
      "UV direction continuity — affects toolpath direction.",
    category: "setup",
    tags: ["cad-repair", "import", "surface-analysis", "prerequisites"],
    operation_types: ["setup"],
    confidence: 86,
    source: "web:tebis-docs",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-192",
    title: "Stochastic Tool Wear Tracking with Wiener Process",
    body:
      "Model flank wear as Wiener process: dVB = μdt + σdW where μ = " +
      "drift (wear rate), σ = diffusion (variability). Predict " +
      "remaining useful life distribution P(VB > threshold at time t). " +
      "Update μ and σ from in-process measurements. More accurate than " +
      "deterministic Taylor for variable cutting conditions in Tebis " +
      "multi-operation programs.",
    category: "optimization",
    tags: ["wiener-process", "tool-wear", "rul", "stochastic"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-193",
    title: "Bayesian Model Averaging for Robust Prediction",
    body:
      "Instead of selecting one model (Taylor, Archard, empirical), " +
      "use BMA to weight multiple models by their posterior probability. " +
      "P(y|data) = ΣP(y|M_k)P(M_k|data). BMA predictions are more " +
      "robust to model misspecification. Use for Tebis tool life " +
      "prediction when no single model fits all conditions well.",
    category: "optimization",
    tags: ["bma", "model-averaging", "robust-prediction", "multi-model"],
    operation_types: ["optimization"],
    confidence: 75,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-194",
    title: "Copula Functions for Dependent Failure Modes",
    body:
      "Tool failure modes (flank wear, crater wear, chipping) are " +
      "correlated. Gaussian copula models the joint failure distribution " +
      "from marginals. P(tool_fail) = C(P(flank), P(crater), P(chip); ρ). " +
      "Ignoring dependence underestimates combined failure probability " +
      "by 15-25%. Use for Tebis tool change interval optimization.",
    category: "optimization",
    tags: ["copula", "dependent-failures", "joint-probability", "tool-change"],
    operation_types: ["optimization"],
    confidence: 75,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-195",
    title: "Gamma Process for Monotonic Degradation Modeling",
    body:
      "Tool wear is monotonically increasing — Gamma process is more " +
      "appropriate than Wiener for this constraint. Increments are " +
      "non-negative with Gamma distribution. RUL = first passage time " +
      "to threshold. Gamma process prevents the physically impossible " +
      "'negative wear' that Wiener can produce. Better for Tebis " +
      "tool life management on unattended operations.",
    category: "optimization",
    tags: ["gamma-process", "degradation", "monotonic", "rul"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-196",
    title: "Information-Theoretic Feature Selection for SPC",
    body:
      "Mutual information I(X;Y) quantifies the statistical dependence " +
      "between a process feature X and quality outcome Y. Select top-k " +
      "features with highest MI for SPC monitoring. Reduces false alarms " +
      "from monitoring irrelevant features. For Tebis mold production: " +
      "typically 3-5 features capture 90% of quality-relevant information.",
    category: "optimization",
    tags: ["mutual-information", "feature-selection", "spc", "information-theory"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-197",
    title: "Optimal Replacement via Renewal Theory",
    body:
      "Renewal theory: minimize long-run cost rate C(T) = (Cp + Cf×F(T)) " +
      "/ (T×R(T) + M×F(T)) where Cp = preventive cost, Cf = failure " +
      "cost, F(T) = failure CDF, R(T) = reliability, M = mean repair " +
      "time. For Tebis tool management: balance preventive replacement " +
      "cost against catastrophic failure cost (scrapped mold component).",
    category: "optimization",
    tags: ["renewal-theory", "optimal-replacement", "cost-rate", "reliability"],
    operation_types: ["optimization"],
    confidence: 77,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-198",
    title: "Chance-Constrained Optimization for Process Design",
    body:
      "P(g(x,ξ) ≤ 0) ≥ 1-α where g = constraint function, ξ = random " +
      "parameters, α = acceptable violation probability. For Tebis: " +
      "P(Ra ≤ spec) ≥ 95% while minimizing cycle time. Convert to " +
      "deterministic equivalent using inverse CDF: μ + z_α×σ ≤ spec. " +
      "This ensures reliability without excessive conservatism.",
    category: "optimization",
    tags: ["chance-constrained", "reliability", "optimization", "probabilistic"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-199",
    title: "Exergy Analysis for Process Sustainability",
    body:
      "Exergy = maximum useful work extractable. Exergy destruction " +
      "measures irreversibility: Ex_dest = T₀×S_gen. For machining: " +
      "cutting (70%), friction (15%), chip deformation (10%), coolant " +
      "(5%). Minimize exergy destruction by optimizing cutting parameters. " +
      "Tebis parameter selection should consider sustainability alongside " +
      "productivity and quality.",
    category: "optimization",
    tags: ["exergy", "sustainability", "irreversibility", "thermodynamics"],
    operation_types: ["optimization"],
    confidence: 75,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
  {
    id: "teb-200",
    title: "Gutowski Energy Model for Specific Energy Benchmarking",
    body:
      "Gutowski: P = P₀ + k×MRR where P₀ = idle power, k = specific " +
      "cutting energy. Specific energy e = P/MRR = P₀/MRR + k. At low " +
      "MRR, P₀/MRR dominates — energy efficiency drops. Maximize MRR " +
      "within machine limits for best energy efficiency. Use to benchmark " +
      "Tebis programs: compare e across different strategies to identify " +
      "the most energy-efficient approach.",
    category: "optimization",
    tags: ["gutowski", "specific-energy", "benchmarking", "energy-efficiency"],
    operation_types: ["optimization"],
    confidence: 76,
    source: "web:tebis-forum",
    created_at: "2026-03-13",
    usage_count: 0,
  },
];
