/**
 * MachiningPlaybookEngine — Experiential Machining Knowledge System
 *
 * Captures the "senior machinist brain" — structured decision rules, sequencing
 * wisdom, anti-patterns, setup strategies, and toolpath best practices learned
 * from videos, shop experience, and manufacturer training.
 *
 * Unlike ProcessPlanEngine (which sorts features mechanically), this engine
 * provides REASONING about WHY to sequence operations a certain way, WHEN to
 * break rules, and HOW to handle real-world complications.
 *
 * Knowledge sources: Titans of CNC, NYC CNC, Sandvik training, Haas tips,
 * hyperMILL tutorials, shop-floor experience, manufacturer application guides.
 *
 * Actions: playbook_advise, playbook_sequence, playbook_antipatterns,
 *          playbook_setup_strategy, playbook_lookup, playbook_add_rule
 */

// ============================================================================
// TYPES
// ============================================================================

export type RuleCategory =
  | "sequencing"        // Operation ordering rules
  | "setup_strategy"    // Fixture/setup planning wisdom
  | "tool_selection"    // When to pick what tool and why
  | "toolpath_strategy" // CAM strategy selection reasoning
  | "anti_pattern"      // Things to NEVER do
  | "material_tip"      // Material-specific machining wisdom
  | "thin_wall"         // Thin wall/floor handling
  | "hole_making"       // Drilling/boring/reaming best practices
  | "finishing"         // Surface finish achievement strategies
  | "roughing"          // Material removal strategies
  | "5axis"             // Multi-axis specific wisdom
  | "workholding"       // Fixturing and clamping knowledge
  | "thermal"           // Heat management during machining
  | "chip_control"      // Chip evacuation and management
  | "tool_life"         // Maximizing tool life
  | "datum"             // Datum selection and preservation
  | "deburring"         // Edge quality and deburr strategies
  | "safety"            // Crash prevention and safe practices
  | "grinding"          // Grinding-specific rules
  | "turning"           // Turning/lathe operations
  | "threading"         // Thread cutting specifics
  | "edm"              // EDM wire/sinker operations
  | "quality_inspection" // SPC, measurement, Cpk rules
  | "coolant_strategy"  // Coolant type/delivery selection
  | "adaptive"          // Adaptive machining rules
  | "deep_hole"         // Deep hole drilling (>5xD)
  | "surface_treatment" // Heat treat, anodize, coating allowances
  | "post_processing"   // G-code optimization rules
  | "hard_turning"      // Hardened material turning (>45 HRC)
  | "hsm"              // High-speed machining rules
  | "micro_machining"   // Sub-1mm feature rules
  | "hybrid_additive";  // Hybrid additive+subtractive

export type Severity = "critical" | "important" | "recommended" | "tip";

export type Condition =
  | { type: "material_iso"; groups: string[] }
  | { type: "feature_present"; features: string[] }
  | { type: "tolerance_below"; threshold_mm: number }
  | { type: "wall_thickness_below"; threshold_mm: number }
  | { type: "depth_ratio_above"; ld_ratio: number }
  | { type: "surface_finish_below"; ra_um: number }
  | { type: "batch_size_above"; count: number }
  | { type: "machine_axes"; min_axes: number }
  | { type: "part_size"; max_dimension_mm: number }
  | { type: "always" }
  | { type: "operation_type"; operations: string[] }
  | { type: "hardness_above"; hrc: number }
  | { type: "aspect_ratio_above"; ratio: number }
  | { type: "spindle_speed_above"; rpm: number };

export interface PlaybookRule {
  id: string;
  category: RuleCategory;
  severity: Severity;
  title: string;
  rule: string;              // The actual advice/rule
  reasoning: string;         // WHY — the physics/experience behind it
  conditions: Condition[];   // WHEN this rule applies
  exceptions: string[];      // When to BREAK this rule
  source: string;            // Where this was learned (video URL, manual, experience)
  examples?: string[];       // Concrete examples
  related_rules?: string[];  // Cross-references to other rule IDs
}

export interface SequencingAdvice {
  recommended_order: string[];
  reasoning: string[];
  warnings: string[];
  applied_rules: string[];   // Rule IDs that influenced this advice
}

export interface SetupAdvice {
  recommended_setups: number;
  setup_descriptions: string[];
  workholding_suggestions: string[];
  datum_strategy: string;
  reasoning: string[];
  applied_rules: string[];
}

export interface PlaybookQuery {
  material_iso?: string;
  features?: string[];
  tolerance_mm?: number;
  wall_thickness_mm?: number;
  surface_finish_Ra?: number;
  batch_size?: number;
  machine_axes?: number;
  categories?: RuleCategory[];
  severity_min?: Severity;
  operation_type?: string;
  hardness_hrc?: number;
  aspect_ratio?: number;
  spindle_rpm?: number;
}

// ============================================================================
// PLAYBOOK RULES DATABASE
// ============================================================================

const PLAYBOOK_RULES: PlaybookRule[] = [
  // ── SEQUENCING RULES ──────────────────────────────────────────────────────

  {
    id: "SEQ-001",
    category: "sequencing",
    severity: "critical",
    title: "Face first, always",
    rule: "Face the top of raw stock before any other operation to establish a clean Z-datum reference surface.",
    reasoning: "Raw stock surfaces are never flat or parallel. Every subsequent Z measurement (drill depths, pocket depths, step heights) references the faced surface. Skipping this propagates error into every feature.",
    conditions: [{ type: "always" }],
    exceptions: ["Pre-ground stock with known parallelism (<0.01mm)", "Castings with pre-machined datum pads"],
    source: "Titans of CNC Academy — 'From Print to Part'",
    examples: ["Face mill with 50mm face mill → establishes Z0", "Use largest available face mill for best flatness"],
    related_rules: ["SEQ-002", "DAT-001"],
  },
  {
    id: "SEQ-002",
    category: "sequencing",
    severity: "critical",
    title: "Establish datums before features",
    rule: "Machine all datum surfaces (A, B, C) before cutting any features that reference them. If datum B is a bore, rough and finish the bore before machining features dimensioned from it.",
    reasoning: "GD&T datum reference frames define the measurement coordinate system. If datums aren't established first, features machined from theoretical datums will be out of tolerance when the actual datums are finally cut.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Prototype parts with no GD&T callouts"],
    source: "NYC CNC — 'Understanding GD&T for CNC'",
  },
  {
    id: "SEQ-003",
    category: "sequencing",
    severity: "critical",
    title: "Roughing before finishing — always separate",
    rule: "Complete ALL roughing operations across ALL features before starting any finishing passes. Never rough one feature and immediately finish it while adjacent features are still rough.",
    reasoning: "Roughing creates internal stresses that cause part distortion. If you finish immediately after roughing, the part relaxes and your finish dimensions shift. Roughing everything first lets the part stabilize before finishing.",
    conditions: [{ type: "always" }],
    exceptions: ["Very small parts (<10mm) with minimal stress", "Free-machining materials with low residual stress (e.g., 12L14)"],
    source: "Sandvik Coromant — 'Metal Cutting Technology'",
    examples: ["Rough all pockets → Rough all profiles → Semi-finish all → Finish all"],
    related_rules: ["SEQ-004", "THERM-001"],
  },
  {
    id: "SEQ-004",
    category: "sequencing",
    severity: "important",
    title: "Semi-finish pass for tight tolerances",
    rule: "For tolerances ≤0.025mm (≤0.001\"), add a semi-finish pass leaving 0.2-0.5mm stock before the final finish pass.",
    reasoning: "Semi-finishing removes most remaining stock uniformly, giving the finish pass a consistent chip load. Without it, the finish pass encounters varying stock (from roughing scallops) causing deflection variation and surface quality issues.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["Jig-boring operations where the boring bar controls precision"],
    source: "Haas Automation — 'Tip of the Day: Finishing Strategy'",
  },
  {
    id: "SEQ-005",
    category: "sequencing",
    severity: "important",
    title: "Drill before pocket — rough pocket around holes",
    rule: "Drill holes BEFORE roughing surrounding pockets. The pocket roughing toolpath should account for pre-drilled holes to avoid air cuts and tool entry shock.",
    reasoning: "Drilling into solid material is more stable than drilling into a pocket floor (which may have insufficient support). Also, pocket toolpaths can use pre-drilled holes as plunge entry points, avoiding full-slotting entry.",
    conditions: [{ type: "feature_present", features: ["hole", "pocket"] }],
    exceptions: ["Very shallow pockets (<2mm) where drilling would break through"],
    source: "Mastercam — 'Dynamic Milling' tutorial",
    examples: ["Drill 4× M6 holes → Rough pocket (using hole as helix entry) → Finish pocket"],
  },
  {
    id: "SEQ-006",
    category: "sequencing",
    severity: "important",
    title: "Large tools before small tools",
    rule: "Use the largest practical tool diameter first for roughing. Progress to smaller tools only for features the large tool can't reach (corners, fillets, narrow slots).",
    reasoning: "Large tools are stiffer (less deflection), remove more material per pass (faster MRR), and leave less stock for smaller tools. This also reduces rest material machining — the small tool only cuts what the large tool missed.",
    conditions: [{ type: "always" }],
    exceptions: ["When a smaller tool can maintain full engagement (adaptive/dynamic), it may outperform a larger tool at partial engagement"],
    source: "Harvey Performance — 'Toolpath Strategy Guide'",
    related_rules: ["SEQ-007"],
  },
  {
    id: "SEQ-007",
    category: "sequencing",
    severity: "recommended",
    title: "Rest machining progression",
    rule: "After roughing with the primary tool, use progressively smaller tools to clear rest material: primary rougher (e.g., 20mm) → medium (12mm) → small (6mm) → pencil (3mm for corner radii).",
    reasoning: "Each pass targets only the material the previous tool couldn't reach. CAM systems calculate rest-material boundaries automatically. This prevents small tools from taking heavy cuts (which causes breakage).",
    conditions: [{ type: "feature_present", features: ["pocket", "freeform", "profile"] }],
    exceptions: ["Simple 2D pockets with uniform corner radii only need one rougher + one finisher"],
    source: "hyperMILL — 'Rest Material Machining' tutorial",
  },
  {
    id: "SEQ-008",
    category: "sequencing",
    severity: "important",
    title: "Thread AFTER bore/hole finishing",
    rule: "For tapped/threaded holes: Center drill → Drill → (Chamfer) → Ream/Bore if needed → Tap/Thread Mill LAST.",
    reasoning: "Threading is the most fragile operation in hole-making. If a tap breaks, you lose the part. Threading should only happen in a properly sized, finished hole. Any distortion from subsequent operations would damage threads.",
    conditions: [{ type: "feature_present", features: ["thread", "hole"] }],
    exceptions: ["Thread milling allows re-cutting if needed, making it safer for high-value parts"],
    source: "OSG — 'Tap Speed and Feed Selection'",
    examples: ["G81 spot drill → G83 peck drill → G84 tap", "Drill → Bore → Thread mill (for precision threads)"],
  },
  {
    id: "SEQ-009",
    category: "sequencing",
    severity: "recommended",
    title: "Chamfers and deburring last",
    rule: "Machine chamfers and edge breaks as the final operation before part removal. Don't chamfer edges that will be cut by subsequent operations.",
    reasoning: "Chamfers cut into edges that may shift during subsequent operations. Also, subsequent roughing can create new burrs on previously chamfered edges. Do it last for clean results.",
    conditions: [{ type: "feature_present", features: ["chamfer"] }],
    exceptions: ["Chamfers that serve as thread lead-ins should be done before threading"],
    source: "Haas Automation — 'Canned Cycles'",
  },
  {
    id: "SEQ-010",
    category: "sequencing",
    severity: "important",
    title: "Spot drill before twist drill",
    rule: "Always spot drill (or center drill) before using twist drills. Match the spot drill point angle to the twist drill point angle (118° or 140°) for best centering.",
    reasoning: "Twist drills walk on flat/uneven surfaces. A spot drill creates a conical seat that guides the drill point. Skipping this causes position error, especially on angled surfaces.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Carbide drills with self-centering geometry (e.g., through-coolant 140° point)", "Indexable drills with flat-bottom capability", "Drills with >3×D depth (use pilot drill instead)"],
    source: "Kennametal — 'Speeds and Feeds for Drilling'",
  },

  // ── ANTI-PATTERNS ────────────────────────────────────────────────────────

  {
    id: "ANTI-001",
    category: "anti_pattern",
    severity: "critical",
    title: "Never finish thin walls before removing adjacent stock",
    rule: "NEVER finish-machine a thin wall while heavy stock remains on the opposite side. The wall will deflect away from the cutter, leaving it oversize on the finished side and undersize when the other side is roughed.",
    reasoning: "Cutting force pushes the wall away from the tool. If there's solid stock on the back side, the wall is supported. Once the back is also roughed, the wall is free to spring. Sequence: rough both sides → finish both sides.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3.0 }],
    exceptions: [],
    source: "Titans of CNC — 'Thin Wall Machining'",
    examples: ["Web between two pockets: rough pocket A → rough pocket B → finish A → finish B"],
    related_rules: ["THIN-001", "SEQ-003"],
  },
  {
    id: "ANTI-002",
    category: "anti_pattern",
    severity: "critical",
    title: "Never plunge a flat-bottom endmill into solid stock",
    rule: "Never plunge (straight Z-axis entry) a standard flat-bottom endmill into solid material. Use ramping, helical entry, or pre-drilled entry points.",
    reasoning: "Flat endmills have no center cutting capability — the center of the tool rubs rather than cuts, generating extreme heat and causing breakage. Always enter material at an angle (ramp) or spiral (helix).",
    conditions: [{ type: "always" }],
    exceptions: ["Center-cutting endmills rated for plunging", "Drill mills designed for plunge + lateral cutting"],
    source: "Harvey Performance — 'End Mill Selection Guide'",
  },
  {
    id: "ANTI-003",
    category: "anti_pattern",
    severity: "critical",
    title: "Never conventional mill on CNC — always climb",
    rule: "Default to climb milling (cutter rotation matches feed direction) on CNC machines. Conventional milling causes rubbing on entry, accelerating wear.",
    reasoning: "Climb milling: chip starts thick → thins. Less rubbing, better finish, longer tool life. Conventional milling: chip starts thin → thickens. Initial rubbing work-hardens stainless/titanium. Exception only for old manual machines with backlash.",
    conditions: [{ type: "always" }],
    exceptions: ["Manual machines without backlash compensation", "Interrupted cuts in castings with hard skin (conventional can prevent chipping)", "Very thin floor cuts where climb may pull tool into work"],
    source: "Sandvik Coromant — 'Milling Guide'",
  },
  {
    id: "ANTI-004",
    category: "anti_pattern",
    severity: "important",
    title: "Never use flood coolant for interrupted cuts in carbide",
    rule: "Avoid flood coolant for milling (interrupted cutting) with carbide inserts/endmills. Use air blast or MQL instead.",
    reasoning: "Carbide is sensitive to thermal shock. The cutting edge heats during engagement, then flood coolant rapidly cools it during the air gap. Repeated heating/cooling creates thermal cracks (comb cracks) that lead to edge chipping. Air blast clears chips without thermal shock.",
    conditions: [{ type: "always" }],
    exceptions: ["HSS tools (more thermal shock resistant)", "Continuous cuts (turning) where coolant stays constant", "Deep pocket milling where chip evacuation requires flood"],
    source: "Sandvik Coromant — 'Tool Wear Mechanisms'",
    related_rules: ["THERM-001"],
  },
  {
    id: "ANTI-005",
    category: "anti_pattern",
    severity: "important",
    title: "Never run full-slot cuts at full depth",
    rule: "Avoid cutting a full-width slot in a single pass at full depth. Instead, use adaptive/trochoidal toolpath OR rough wider than final slot, then finish to width.",
    reasoning: "Full-slot cutting engages the tool 180° (ae = Dc). This doubles heat and force vs. partial engagement. The center of the tool also re-cuts chips. Either reduce ae (adaptive) or reduce ap (shallow passes).",
    conditions: [{ type: "feature_present", features: ["slot"] }],
    exceptions: ["Slotting saws designed for full-width cuts", "Very shallow slots (<0.5mm depth)"],
    source: "Mastercam — 'Dynamic Milling vs Traditional'",
  },

  // ── THIN WALL RULES ──────────────────────────────────────────────────────

  {
    id: "THIN-001",
    category: "thin_wall",
    severity: "critical",
    title: "Alternate sides for thin wall machining",
    rule: "Machine thin walls by alternating between sides at progressive depth levels: rough side A at Z-1 → rough side B at Z-1 → rough side A at Z-2 → rough side B at Z-2...",
    reasoning: "This maintains approximately equal stock on both sides at each depth level, supporting the wall symmetrically. One-sided machining creates an asymmetric stress state that causes deflection and vibration.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3.0 }],
    exceptions: ["Walls backed by solid stock (only one exposed side)"],
    source: "Titans of CNC — 'Thin Wall Machining Techniques'",
  },
  {
    id: "THIN-002",
    category: "thin_wall",
    severity: "important",
    title: "Reduce axial depth for thin floors",
    rule: "For thin floors (<2mm remaining stock), use very light axial depth of cut (ap ≤ 0.1-0.3mm) and increase radial engagement instead. Prefer a large-diameter tool at light ap.",
    reasoning: "Heavy axial cuts on thin floors cause deflection downward (dish-out). The floor springs back after the tool passes, leaving it oversize in the center. Light ap with a stiff, large-diameter tool distributes force over a wider area.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 2.0 }],
    exceptions: [],
    source: "Edge Precision — 'Aerospace Thin Floor Machining'",
  },

  // ── SETUP STRATEGY RULES ─────────────────────────────────────────────────

  {
    id: "SETUP-001",
    category: "setup_strategy",
    severity: "important",
    title: "Minimize setups by grouping accessible features",
    rule: "Group all features accessible from one direction into a single setup. Use 3+2 positioning to reach angled features without re-fixturing when possible.",
    reasoning: "Every setup change introduces: (1) re-fixturing time (5-30 min), (2) datum transfer error (0.01-0.05mm), (3) risk of mis-location. Fewer setups = faster, more accurate parts.",
    conditions: [{ type: "always" }],
    exceptions: ["When a single setup would require an excessively long tool (>5×D stick-out) that causes chatter — better to flip the part"],
    source: "NYC CNC — 'Workholding Strategies'",
  },
  {
    id: "SETUP-002",
    category: "setup_strategy",
    severity: "important",
    title: "Op 1: Machine clamping surfaces for Op 2",
    rule: "In the first operation, machine flat/parallel surfaces that will serve as clamping datum for the second operation. Include alignment features (dowel holes, stepped edges) if possible.",
    reasoning: "Op 2 grips on Op 1 surfaces. If Op 1 leaves raw stock or non-parallel surfaces, Op 2 can't hold the part securely or locate it accurately. Plan Op 1 specifically to create good Op 2 clamping.",
    conditions: [{ type: "always" }],
    exceptions: ["Parts fixtured in custom jigs with reference features independent of machined surfaces"],
    source: "Titans of CNC — 'First and Second Operation Strategy'",
    examples: ["Op 1: Face top + machine step for vise jaw reference", "Op 1: Bore center hole for expanding mandrel in Op 2"],
  },
  {
    id: "SETUP-003",
    category: "setup_strategy",
    severity: "recommended",
    title: "Soft jaws for second operation",
    rule: "For Op 2, machine soft jaws (aluminum or mild steel) that conform to the Op 1 profile. This distributes clamping force evenly and prevents marking.",
    reasoning: "Standard hard jaws contact only on edges/points, creating high local pressure that marks finished surfaces and can distort thin-walled parts. Soft jaws match the part contour, distributing force uniformly.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["High-volume production where dedicated fixtures justify the investment", "Round parts (use collet chuck instead)"],
    source: "NYC CNC — 'Soft Jaw Machining'",
  },

  // ── TOOLPATH STRATEGY RULES ───────────────────────────────────────────────

  {
    id: "STRAT-001",
    category: "toolpath_strategy",
    severity: "important",
    title: "Adaptive/Dynamic roughing over traditional pocket",
    rule: "For roughing pockets and open profiles, prefer adaptive/dynamic/trochoidal toolpaths over traditional zig-zag pocket toolpaths. Use full flute length (ap = 2-3×Dc) with reduced radial engagement (ae = 5-15% Dc).",
    reasoning: "Adaptive toolpaths maintain constant radial engagement, keeping cutting force and temperature stable. Traditional pocket toolpaths swing from partial to full engagement at corners, causing force spikes that break tools and cause chatter. Adaptive runs 3-5× faster overall despite lower ae because ap is much higher.",
    conditions: [{ type: "always" }],
    exceptions: ["Very shallow pockets (<1mm) where traditional zig-zag is simpler", "Soft materials (aluminum) where cutting forces aren't a concern"],
    source: "SolidCAM — 'iMachining Technology' / Mastercam — 'Dynamic Milling'",
    related_rules: ["ANTI-005"],
  },
  {
    id: "STRAT-002",
    category: "toolpath_strategy",
    severity: "important",
    title: "Z-level for steep walls, scallop for shallow areas",
    rule: "Use Z-level (contour) finishing for walls steeper than ~30° from vertical, and scallop/3D-offset finishing for shallow/flat areas. Many CAM systems offer a 'steep & shallow' combined strategy.",
    reasoning: "Z-level toolpaths leave uniform scallop on steep walls (predictable cusp height). On shallow areas, Z-level creates widely-spaced passes with large cusps. Scallop/offset strategies maintain constant cusp height regardless of surface angle.",
    conditions: [{ type: "feature_present", features: ["freeform", "profile"] }],
    exceptions: ["Ruled surfaces (use swarf cutting instead)", "Flat areas (use parallel/raster)"],
    source: "hyperMILL — '3D Finishing Strategies'",
  },
  {
    id: "STRAT-003",
    category: "toolpath_strategy",
    severity: "recommended",
    title: "Pencil trace for fillet cleanup",
    rule: "After 3D finishing with a ball nose, run a pencil trace pass along internal fillets and sharp transitions. Use a ball nose matching or smaller than the fillet radius.",
    reasoning: "Main finishing passes leave extra stock at internal corners where the ball nose can't reach. Pencil tracing follows these intersection curves automatically, removing the remaining cusp. This eliminates hand polishing.",
    conditions: [{ type: "feature_present", features: ["freeform", "pocket"] }],
    exceptions: ["When the finish tool radius already matches the smallest fillet radius"],
    source: "Fusion 360 — 'Pencil Finishing' tutorial",
  },

  // ── MATERIAL-SPECIFIC RULES ──────────────────────────────────────────────

  {
    id: "MAT-001",
    category: "material_tip",
    severity: "important",
    title: "Stainless steel: never dwell, always feed",
    rule: "In austenitic stainless (304, 316), the tool must ALWAYS be feeding. Never dwell (G04), retract slowly, or reduce feed rate mid-cut. Maintain minimum chip thickness.",
    reasoning: "Stainless work-hardens rapidly when rubbed without cutting. A dwelling tool creates a hardened skin that destroys the cutting edge on re-entry. Even retracts should be at feed rate (G01), not rapid through just-cut surfaces.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: [],
    source: "Sandvik Coromant — 'Machinability of Stainless Steel'",
  },
  {
    id: "MAT-002",
    category: "material_tip",
    severity: "critical",
    title: "Titanium: low speed, high feed, sharp tools",
    rule: "Machine titanium at LOW cutting speed (30-60 m/min), HIGH feed per tooth (maintain chip thickness), with SHARP positive-rake tools. Through-tool coolant is mandatory for drilling.",
    reasoning: "Titanium's poor thermal conductivity concentrates heat at the cutting edge. Low Vc keeps temperature manageable. High fz ensures the chip carries heat away (thin chips leave heat in the work). Dull tools generate friction heat that causes galling and tool seizure.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["PCD tools on titanium aluminides can run higher speeds"],
    source: "Kennametal — 'Aerospace Machining Guide'",
    related_rules: ["MAT-001"],
  },
  {
    id: "MAT-003",
    category: "material_tip",
    severity: "important",
    title: "Aluminum: maximum speed, positive rake, evacuate chips",
    rule: "Machine aluminum at the HIGHEST speed your spindle allows (300-1000+ m/min SFM). Use polished, uncoated, positive-rake tools with 2-3 flutes. Chip evacuation is the #1 priority — re-cutting chips causes BUE.",
    reasoning: "Aluminum is thermally conductive (heat goes into the chip, not the tool) and soft (low Kc). The limit is spindle RPM and chip evacuation, not tool wear. Coated tools actually perform worse — coatings increase edge radius and promote BUE on aluminum.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["High-silicon aluminum (>12% Si) is abrasive — use PCD or diamond-coated tools at moderate speeds", "Cast aluminum with sand inclusions — reduce speed to prevent chipping"],
    source: "Datron — 'High Speed Aluminum Machining'",
  },
  {
    id: "MAT-004",
    category: "material_tip",
    severity: "important",
    title: "Hardened steel: light cuts, high speed, air blast only",
    rule: "For hard milling (>45 HRC): use small ap (0.05-0.2mm), small ae (0.1-0.5mm), HIGH cutting speed (150-300 m/min), and air blast cooling ONLY. Never flood coolant.",
    reasoning: "The goal is to generate heat in the chip (which carries it away) while keeping the workpiece cool. Light cuts ensure the heat stays in the chip. Flood coolant thermally shocks the carbide/CBN cutting edge, causing comb cracks. Air blast clears chips without thermal shock.",
    conditions: [{ type: "material_iso", groups: ["H"] }],
    exceptions: ["CBN inserts in continuous turning can sometimes use light coolant"],
    source: "Walter Tools — 'Hard Milling Guide'",
  },

  // ── HOLE-MAKING RULES ────────────────────────────────────────────────────

  {
    id: "HOLE-001",
    category: "hole_making",
    severity: "important",
    title: "Peck drill for deep holes (>3×D)",
    rule: "For holes deeper than 3× drill diameter, use peck drilling (G83) with peck depth = 1×D for first peck, then 0.5-1×D for subsequent pecks. For >5×D, consider gun drilling or indexable deep-hole drills.",
    reasoning: "Deep holes trap chips which re-cut and clog the flutes. Peck drilling retracts to clear chips. Without pecking, chip packing causes drill breakage, oversize holes, and poor surface finish.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3.0 }],
    exceptions: ["Through-coolant carbide drills can often go to 5×D without pecking (use G73 chip-break cycle instead)", "Gun drills have internal coolant/chip channels, no pecking needed"],
    source: "OSG — 'ADO Drill Application Guide'",
  },
  {
    id: "HOLE-002",
    category: "hole_making",
    severity: "recommended",
    title: "Thread mill instead of tap for expensive parts",
    rule: "For high-value parts, prefer thread milling over tapping. Thread mills can be adjusted for size, can cut left or right hand threads, and don't risk breaking off in the hole.",
    reasoning: "A broken tap in a $5,000 aerospace part means scrap. Thread milling is slower but: (1) no breakage risk (tool retracts if force spikes), (2) one tool cuts many thread sizes, (3) better thread quality, (4) blind hole threads closer to bottom.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["High-volume production where tapping speed matters", "Very small threads (<M4) where thread mills are fragile"],
    source: "Emuge-Franken — 'Thread Milling Guide'",
  },

  // ── DATUM RULES ──────────────────────────────────────────────────────────

  {
    id: "DAT-001",
    category: "datum",
    severity: "critical",
    title: "Never remove datum surfaces after establishing them",
    rule: "Once a datum surface is machined, never re-machine it in a subsequent operation unless the drawing explicitly calls for it. Protect datum surfaces from clamp marks, tool marks, and burrs.",
    reasoning: "Datum surfaces are the reference for ALL other dimensions. Re-machining changes the reference, invalidating all features measured from it. Even 0.005mm change shifts every dependent dimension.",
    conditions: [{ type: "always" }],
    exceptions: ["Intentional datum refinement (e.g., grinding datum A after heat treatment)"],
    source: "Quality Control — 'GD&T Datum Management'",
  },

  // ── THERMAL MANAGEMENT ───────────────────────────────────────────────────

  {
    id: "THERM-001",
    category: "thermal",
    severity: "important",
    title: "Allow thermal stabilization between rough and finish",
    rule: "For precision parts (tolerance ≤0.01mm), allow 10-30 minutes between roughing and finishing for the part to thermally stabilize, OR run probing to measure actual position before finishing.",
    reasoning: "Roughing generates significant heat — a steel part can grow 0.01-0.05mm from thermal expansion. If you immediately finish, the part is oversized while hot. When it cools, the finished dimensions are undersize.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Parts with good thermal conductivity (aluminum) stabilize quickly", "Temperature-controlled environments (<±1°C)"],
    source: "Renishaw — 'In-Process Measurement'",
    related_rules: ["SEQ-003"],
  },

  // ── WORKHOLDING RULES ────────────────────────────────────────────────────

  {
    id: "HOLD-001",
    category: "workholding",
    severity: "important",
    title: "Clamp on raw stock, never on finished surfaces",
    rule: "In early operations, clamp on raw stock surfaces whenever possible. In later operations, use soft jaws, vacuum, or fixture plates to protect finished surfaces.",
    reasoning: "Hard vise jaws mark aluminum, distort thin walls, and can move the part if clamped on uneven raw surfaces. Clamping on the largest, flattest area provides the most stability.",
    conditions: [{ type: "always" }],
    exceptions: ["Zero-point clamping systems with defined interface surfaces"],
    source: "Schunk — 'Workholding Systems Guide'",
    related_rules: ["SETUP-003"],
  },
  {
    id: "HOLD-002",
    category: "workholding",
    severity: "recommended",
    title: "Tabs or dovetails for near-complete parts",
    rule: "When machining a part from all sides, leave tabs/bridges connecting to stock OR use a dovetail profile for re-gripping. Remove tabs as the final operation.",
    reasoning: "Parts that are nearly fully machined have no good clamping surfaces left. Tabs keep the part connected to stock. Dovetail profiles let you flip and grip on the machined profile without marks.",
    conditions: [{ type: "always" }],
    exceptions: ["Vacuum workholding on flat parts", "Parts with dedicated clamping features in the design"],
    source: "Titans of CNC — 'Workholding' series",
  },

  // ── SAFETY RULES ─────────────────────────────────────────────────────────

  {
    id: "SAFE-001",
    category: "safety",
    severity: "critical",
    title: "Prove out new programs at reduced feed rate",
    rule: "Run every new CNC program at 25% feed rate override for the first part. Watch the first tool change, first plunge, and first rapid move. Only go to 100% after confirming no collision.",
    reasoning: "Even experienced programmers make mistakes. A rapid (G00) to the wrong Z coordinate at full speed crashes the tool into the part/fixture. At 25% feed, you have time to hit E-stop. The cost of proving out (5 minutes extra) vs. a crash ($500-5000 tool/spindle damage) is trivial.",
    conditions: [{ type: "always" }],
    exceptions: ["Proven programs that have run successfully on the same setup"],
    source: "Haas Automation — 'Program Prove-Out Best Practices'",
  },

  // ── SEQUENCING (continued) ────────────────────────────────────────────

  {
    id: "SEQ-011",
    category: "sequencing",
    severity: "important",
    title: "Bore before ream",
    rule: "Ream holes only after boring to size. Boring provides controlled dimension; reaming creates surface finish on the pre-bored hole.",
    reasoning: "Reaming removes minimal stock (0.1-0.3mm). If the hole is undersized from drilling alone, the reamer deflects or chatters. Boring brings the hole to within 0.1mm of final, letting the reamer produce a clean finish.",
    conditions: [{ type: "feature_present", features: ["bore", "hole"] }],
    exceptions: ["Standard-tolerance holes (H11+) can go drill → ream directly"],
    source: "Sandvik Coromant — 'Boring & Reaming Guide'",
    related_rules: ["SEQ-008"],
  },
  {
    id: "SEQ-012",
    category: "sequencing",
    severity: "important",
    title: "Radial finishing before axial on precision bores",
    rule: "For precision bores: rough radially → semi-finish radially → finish with a single axial pass (plunge boring or fine boring) to achieve roundness and surface finish.",
    reasoning: "Radial passes remove stock uniformly but leave tool marks. A final axial pass with a fine boring bar produces excellent roundness and Ra <0.8µm. Reversing the order leaves radial marks on the finished surface.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: ["Honing or lapping replaces the axial finish pass for extreme tolerances"],
    source: "Kennametal — 'Fine Boring Application Guide'",
  },
  {
    id: "SEQ-013",
    category: "sequencing",
    severity: "important",
    title: "Profile fillets before edge chamfers",
    rule: "Machine internal fillet radii in pockets/profiles before chamfering external edges. This prevents double-tooling the same feature intersection.",
    reasoning: "Chamfering after filleting creates a clean, consistent edge break. If chamfered first, the fillet operation may remove part of the chamfer, requiring a re-chamfer pass.",
    conditions: [{ type: "feature_present", features: ["pocket", "profile", "chamfer"] }],
    exceptions: ["When chamfer serves as a lead-in for threading — do chamfer first"],
    source: "hyperMILL — 'Feature Machining Order'",
    related_rules: ["SEQ-009"],
  },
  {
    id: "SEQ-014",
    category: "sequencing",
    severity: "important",
    title: "Deburr after all cutting, before inspection",
    rule: "Deburring is the LAST machining operation. All cutting must be complete before deburring — subsequent cuts create new burrs that invalidate previous deburring.",
    reasoning: "Burrs form at every tool exit edge. If you deburr pockets then drill holes, the drill exit creates new burrs. Deburring once at the end is faster and more reliable than repeated deburring.",
    conditions: [{ type: "always" }],
    exceptions: ["Cross-hole deburring may require a dedicated mid-process step if the hole becomes inaccessible later"],
    source: "Shop floor experience — multi-operation parts",
  },
  {
    id: "SEQ-015",
    category: "sequencing",
    severity: "recommended",
    title: "Climb finish after conventional rough",
    rule: "When both climb and conventional are used: rough with conventional milling (for stability in heavy cuts on older machines), then finish with climb milling (for better surface finish).",
    reasoning: "Conventional roughing is more forgiving of machine backlash and varying stock. Climb finishing removes stock uniformly without rubbing, producing a superior surface. This hybrid approach balances stability and quality.",
    conditions: [{ type: "always" }],
    exceptions: ["Modern rigid CNC machines should climb-mill for both rough and finish"],
    source: "Sandvik Coromant — 'Milling Direction Guide'",
    related_rules: ["ANTI-003"],
  },

  // ── ANTI-PATTERNS (continued) ─────────────────────────────────────────

  {
    id: "ANTI-006",
    category: "anti_pattern",
    severity: "critical",
    title: "Never deep-drill without peck in steel (>3×D)",
    rule: "NEVER drill deeper than 3×D without pecking in steel, cast iron, or stainless. Drills >3mm diameter at >3×D MUST use peck or chip-break cycle. Below 3mm diameter, use even shallower pecks.",
    reasoning: "Deep drilling in steel generates long continuous chips that wrap around the drill and pack in the flutes. This causes catastrophic drill failure, oversize holes, and potential workpiece scrap. Smaller drills are more fragile and need even more conservative pecking.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3.0 }],
    exceptions: ["Through-coolant carbide drills with chip-breaking geometry rated for 5×D without peck", "Gun drills with internal chip channels"],
    source: "OSG — 'Deep Hole Drilling Application Guide'",
    related_rules: ["HOLE-001"],
  },
  {
    id: "ANTI-007",
    category: "anti_pattern",
    severity: "critical",
    title: "Never climb-mill thin walls unsupported",
    rule: "NEVER climb-mill the unsupported side of a thin wall (<1.5mm). Climb feed pulls the tool INTO the wall, causing deflection and potential breakage. Rough conventionally on the unsupported side, finish with climb only when both sides have been roughed.",
    reasoning: "Climb milling creates a force vector toward the wall. With no stock behind the wall to resist, the wall deflects toward the tool, creating an overcut. On very thin walls (<1mm), this causes wall breakage.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 1.5 }],
    exceptions: ["Walls backed by solid stock on the opposite side"],
    source: "Titans of CNC — 'Thin Wall Strategies'",
    related_rules: ["THIN-001", "ANTI-001"],
  },
  {
    id: "ANTI-008",
    category: "anti_pattern",
    severity: "important",
    title: "Never full-width slot at full depth first pass",
    rule: "Never cut a full-width slot at full depth in the first pass. Limit first pass to ap = 0.3× slot width OR slot width in one pass with ap ≤ 0.5mm. Build depth progressively.",
    reasoning: "Full-width at full-depth creates maximum tool engagement (180° wrap + full ap), generating extreme forces and zero chip evacuation path. The tool is buried with nowhere for chips to go.",
    conditions: [{ type: "feature_present", features: ["slot"] }],
    exceptions: ["Slotting saws and T-slot cutters designed for full-width engagement"],
    source: "Harvey Performance — 'Slotting Applications'",
    related_rules: ["ANTI-005"],
  },
  {
    id: "ANTI-009",
    category: "anti_pattern",
    severity: "important",
    title: "Never re-cut chips in pockets",
    rule: "Avoid unidirectional pocket passes that push chips ahead of the tool. Use bidirectional (zig-zag) or one-way with air-blast clearing between passes. Re-cutting chips work-hardens the surface and accelerates tool wear.",
    reasoning: "Chips not evacuated from the cutting zone are re-ground between tool and workpiece. In stainless and titanium, re-cut chips work-harden the surface (up to 2× hardness increase), dramatically reducing tool life and degrading surface finish.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Aluminum with good chip evacuation (high spindle speed blows chips out)"],
    source: "Sandvik Coromant — 'Chip Evacuation in Pocketing'",
    related_rules: ["MAT-001"],
  },
  {
    id: "ANTI-010",
    category: "anti_pattern",
    severity: "important",
    title: "Never assume coolant reaches deep pockets",
    rule: "For pockets deeper than 20mm, verify coolant actually reaches the tool tip. Flood coolant may pool at the top and never reach the cutting zone. Use through-tool coolant, MQL, or programmed pauses with air blast.",
    reasoning: "Coolant flow follows gravity and centrifugal force from the spindle. In deep pockets, the tool body blocks coolant flow to the cutting zone. Chips accumulate, heat builds, and tool life drops dramatically. Through-tool coolant or high-pressure directed nozzles solve this.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Through-tool coolant with adequate pressure (>40 bar)", "Shallow pockets (<10mm) where flood is effective"],
    source: "Blaser Swisslube — 'Deep Pocket Machining'",
  },
  {
    id: "ANTI-011",
    category: "anti_pattern",
    severity: "important",
    title: "Never tap at full depth in one pass in hard materials",
    rule: "In materials >30 HRC or stainless, never tap to full depth in a single pass. Use a peck-tapping cycle (G84 with pecking) or thread mill. Full-depth single-pass tapping generates extreme torque at the bottom.",
    reasoning: "Tapping torque increases with depth as chips pack in the flutes. In hard materials, chip packing causes tap breakage at depth. A broken tap in a finished hole is nearly impossible to extract without damaging the part.",
    conditions: [{ type: "material_iso", groups: ["M", "H"] }],
    exceptions: ["Form taps (roll taps) in ductile materials don't produce chips", "Spiral-point taps in through-holes push chips forward"],
    source: "Emuge-Franken — 'Tapping in Difficult Materials'",
    related_rules: ["HOLE-002"],
  },
  {
    id: "ANTI-012",
    category: "anti_pattern",
    severity: "important",
    title: "Never run interrupted carbide cuts without coolant strategy",
    rule: "Interrupted milling with carbide (entering/exiting workpiece repeatedly) requires consistent thermal management. Use air blast or MQL — never alternate between flood and dry. Inconsistent cooling causes thermal fatigue cracking.",
    reasoning: "Each entry/exit cycle creates a thermal pulse. Flood coolant amplifies this by rapid cooling during the air gap. Even air blast must be consistent — turning it on/off creates the same thermal shock. Keep cooling constant throughout the operation.",
    conditions: [{ type: "always" }],
    exceptions: ["HSS tools tolerate thermal cycling better", "Ceramic inserts designed for interrupted cuts in cast iron"],
    source: "Sandvik Coromant — 'Tool Wear & Thermal Cracking'",
    related_rules: ["ANTI-004"],
  },
  {
    id: "ANTI-013",
    category: "anti_pattern",
    severity: "recommended",
    title: "Never conventional-mill casting hard skin",
    rule: "On castings, the first cut through the hard outer skin should be climb milling, not conventional. Conventional milling starts with zero chip thickness at the hard skin, causing maximum rubbing and rapid tool wear.",
    reasoning: "Sand-cast surfaces have a hardened skin (up to 50+ HRC) from contact with the mold. Conventional milling rubs on this skin with thin chips before engaging. Climb milling enters at maximum chip thickness, punching through the hard skin before rubbing occurs.",
    conditions: [{ type: "material_iso", groups: ["K"] }],
    exceptions: ["Pre-machined castings with skin already removed", "Very thin skin (<0.1mm) on investment castings"],
    source: "Walter Tools — 'Machining Cast Iron'",
    related_rules: ["ANTI-003"],
  },

  // ── THIN WALL (continued) ─────────────────────────────────────────────

  {
    id: "THIN-003",
    category: "thin_wall",
    severity: "critical",
    title: "Synchronize Z-levels across thin wall sides",
    rule: "When alternating sides on a thin wall, machine BOTH sides to the same Z-depth before progressing deeper. Side A at Z=-5 → Side B at Z=-5 → Side A at Z=-10 → Side B at Z=-10. Never roughing one side to full depth before starting the other.",
    reasoning: "If one side is roughed to full depth while the other is still solid, the wall has no support on one side. This creates asymmetric stress and deflection. Keeping both sides at the same depth maintains symmetric support throughout the process.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3.0 }],
    exceptions: ["Walls that are very short in Z (<5mm) where full-depth one-side is acceptable"],
    source: "Titans of CNC — 'Thin Wall Z-Level Synchronization'",
    related_rules: ["THIN-001"],
  },
  {
    id: "THIN-004",
    category: "thin_wall",
    severity: "important",
    title: "Spring pass for thin wall finishing",
    rule: "After semi-finishing a thin wall, run a light spring pass (0.02-0.05mm DOC) at the same Z-level to compensate for elastic recovery. The wall springs back after the semi-finish, and the spring pass removes the recovered material.",
    reasoning: "Thin walls deflect elastically during cutting. When the tool passes, the wall springs back by 0.01-0.05mm (depending on material and wall thickness). A spring pass at the same nominal dimension catches this springback material.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 2.0 }],
    exceptions: ["Very rigid materials (hardened steel walls) have minimal springback"],
    source: "Edge Precision — 'Aerospace Thin Wall Techniques'",
    related_rules: ["THIN-002"],
  },
  {
    id: "THIN-005",
    category: "thin_wall",
    severity: "important",
    title: "Sacrificial support ribs for thin floors",
    rule: "For floors thinner than 1.5mm, add temporary support ribs (sacrificial stock islands) underneath during CAM setup. Machine around them during roughing, remove them as the final floor operation.",
    reasoning: "Thin floors deflect under cutting force, causing dish-out (thinner in center, thicker at edges). Support ribs act as mini-columns that resist deflection. Removing them last lets the floor maintain flatness during heavy cutting.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 1.5 }],
    exceptions: ["Vacuum workholding from below provides continuous support", "Parts where floor flatness is non-critical"],
    source: "Aerospace machining — 'Monolithic Structure Strategies'",
  },
  {
    id: "THIN-006",
    category: "thin_wall",
    severity: "recommended",
    title: "Reduce RPM 10-20% for thin walls to reduce force",
    rule: "Lower spindle speed by 10-20% when machining thin walls (below 2mm). Cutting force is proportional to chip cross-section; lower speed with maintained feed reduces force peaks.",
    reasoning: "Thin walls vibrate at natural frequencies that may coincide with tooth-passing frequency. Reducing RPM shifts the excitation frequency away from resonance. The trade-off is slightly longer cycle time, acceptable for precision parts.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 2.0 }],
    exceptions: ["When stability lobe analysis shows the current RPM is in a stable zone"],
    source: "Stability lobe theory — 'Chatter Avoidance for Thin Features'",
  },

  // ── SETUP STRATEGY (continued) ────────────────────────────────────────

  {
    id: "SETUP-004",
    category: "setup_strategy",
    severity: "important",
    title: "Machine soft jaw profile in Op 0",
    rule: "Before Op 1, machine soft jaws (aluminum or mild steel) to match the Op 2 clamping profile. This is 'Op 0' — a setup operation that creates the fixture for the real part.",
    reasoning: "Standard hard vise jaws contact the part at edges, creating point loads that distort thin parts and mark finished surfaces. Soft jaws match the part contour, distributing clamp force over the entire contact area.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["High-volume production justifies dedicated fixtures instead", "Round parts use collet chucks"],
    source: "NYC CNC — 'Soft Jaw Setup Workflow'",
    related_rules: ["SETUP-003"],
  },
  {
    id: "SETUP-005",
    category: "setup_strategy",
    severity: "important",
    title: "Use parallels under thin parts",
    rule: "Thin parts (<10mm thick) must sit on parallels in the vise, not clamped directly on edges. Parallels distribute clamping force over the part area and prevent Z-axis distortion.",
    reasoning: "Edge-clamping thin parts creates a bending moment across the part width. The center deflects upward, and machined surfaces end up concave. Parallels support the part bottom uniformly, preventing this bowing.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 10.0 }],
    exceptions: ["Vacuum workholding eliminates the need for parallels", "Parts with machined flat bottom from previous op"],
    source: "Haas Automation — 'Workholding Tips'",
  },
  {
    id: "SETUP-006",
    category: "setup_strategy",
    severity: "important",
    title: "Toe-clamp interference check",
    rule: "Before starting a program, verify that toe clamps, step clamps, or fixture bolts don't interfere with tool paths. Check clearance for the longest tool at the deepest Z-level near any clamp.",
    reasoning: "Clamp collisions are among the most common CNC crashes. The tool path may clear the clamp at Z=0 but collide when plunging to Z=-30. CAM simulation should include clamp models, or manually verify clearance.",
    conditions: [{ type: "always" }],
    exceptions: ["Vise clamping where jaws are below the part top (no interference possible)"],
    source: "Shop floor experience — 'Crash Prevention'",
    related_rules: ["SAFE-001"],
  },
  {
    id: "SETUP-007",
    category: "setup_strategy",
    severity: "recommended",
    title: "Datum transfer via dowel holes or witness marks",
    rule: "When flipping a part between operations, establish repeatable datum transfer using: dowel holes in the fixture, witness marks on the part, or 3-2-1 locating (3 points on primary plane, 2 on secondary edge, 1 on tertiary).",
    reasoning: "Without repeatable datum transfer, Op 2 features are positioned relative to a visually-aligned part — introducing 0.05-0.2mm error. Dowel holes provide <0.01mm repeatability; witness marks provide 0.02-0.05mm.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Probing in Op 2 can establish datum from Op 1 features directly"],
    source: "Renishaw — 'Part Location Best Practices'",
    related_rules: ["DAT-001"],
  },
  {
    id: "SETUP-008",
    category: "setup_strategy",
    severity: "recommended",
    title: "Probe/indicate Op 1 surfaces before Op 2 finishing",
    rule: "Before finishing in Op 2, probe or indicate the Op 1 datum surfaces to verify they're parallel to machine axes. Adjust WCS if needed. Never assume Op 1 surfaces are perfectly aligned after re-fixturing.",
    reasoning: "Even with soft jaws, parts can seat 0.01-0.05mm off-parallel due to chip debris, jaw wear, or clamp force variation. A 0.02mm tilt across a 100mm part creates a 0.02mm thickness variation. Probing catches this before cutting.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["Low-tolerance parts where ±0.1mm is acceptable"],
    source: "Renishaw — 'In-Process Probing Guide'",
  },

  // ── TOOLPATH STRATEGY (continued) ─────────────────────────────────────

  {
    id: "STRAT-004",
    category: "toolpath_strategy",
    severity: "important",
    title: "Constant engagement vs adaptive roughing",
    rule: "Constant-engagement roughing (fixed ae, varying toolpath) is SAFER with fewer force spikes. Adaptive roughing (constant chip load via ae modulation) is FASTER but requires rigid setup. Choose by machine rigidity and part stability.",
    reasoning: "Constant engagement never exceeds the programmed ae, making force predictable. Adaptive toolpaths vary engagement to maintain constant chip load, which is faster but can create force spikes at engagement transitions on flexible parts.",
    conditions: [{ type: "always" }],
    exceptions: ["Very rigid setups (short tools, massive parts) can use adaptive safely"],
    source: "SolidCAM iMachining vs. Mastercam Dynamic comparison",
    related_rules: ["STRAT-001"],
  },
  {
    id: "STRAT-005",
    category: "toolpath_strategy",
    severity: "important",
    title: "Ramp entry angle: 2-5° for pockets",
    rule: "Use 2-5° ramp angle for pocket entry. Shallower ramps (2-3°) reduce entry shock but increase ramp length. Steeper ramps (>5°) cause rubbing at the tool center. Helical entry is preferred over linear ramp when space allows.",
    reasoning: "Flat endmills have no center-cutting capability. During ramping, the center portion rubs rather than cuts. Shallower angles reduce the rubbing zone. Helical entry distributes the engagement around the full tool diameter, eliminating center rubbing entirely.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Center-cutting endmills and drill mills can use steeper angles", "Pre-drilled plunge points eliminate the need for ramping"],
    source: "Harvey Performance — 'Entry Strategies for Pocketing'",
    related_rules: ["ANTI-002"],
  },
  {
    id: "STRAT-006",
    category: "toolpath_strategy",
    severity: "important",
    title: "Ball nose stepover for target Ra",
    rule: "Calculate ball nose stepover from target surface finish: stepover ≈ 2 × sqrt(Ra_target × 4 × R_tool). For Ra <1.6µm use stepover ≤ 0.1×Dc. For Ra <3.2µm use stepover ≤ 0.2×Dc. For Ra <6.3µm use stepover ≤ 0.3×Dc.",
    reasoning: "Ball nose tools leave a scallop (cusp) between passes. Cusp height h = R - sqrt(R² - (stepover/2)²). This cusp height directly determines theoretical Ra. Tighter stepover = smaller cusp = better finish, but exponentially longer cycle time.",
    conditions: [{ type: "surface_finish_below", ra_um: 6.3 }],
    exceptions: ["Wiper geometry tools reduce effective cusp height, allowing larger stepover"],
    source: "Sandvik Coromant — 'Ball Nose Finishing Calculations'",
  },
  {
    id: "STRAT-007",
    category: "toolpath_strategy",
    severity: "recommended",
    title: "Trochoidal milling for chatter-prone setups",
    rule: "When experiencing chatter, switch from conventional pocket toolpath to trochoidal (circular interpolation with linear advance). Trochoidal maintains partial engagement, reducing force peaks that excite vibration.",
    reasoning: "Chatter occurs when cutting force excitation matches a structural natural frequency. Trochoidal toolpaths keep engagement below 90° (typically 30-60°), reducing peak force by 40-60% compared to full-slot or high-engagement conventional paths.",
    conditions: [{ type: "always" }],
    exceptions: ["When stability lobe analysis identifies stable RPM zones — use those instead of changing toolpath"],
    source: "Mastercam — 'Dynamic Milling for Chatter Reduction'",
    related_rules: ["STRAT-001"],
  },
  {
    id: "STRAT-008",
    category: "toolpath_strategy",
    severity: "recommended",
    title: "Pencil trace threshold: internal corners <30°",
    rule: "Run pencil trace finishing on internal corners tighter than 30° included angle. Wider corners (>30°) can be reached by the main finishing pass. Match pencil tool radius to the smallest fillet radius in the corner.",
    reasoning: "Main finishing passes with larger tools leave uncut cusps in tight corners. Pencil tracing follows the intersection curve between adjacent surfaces, cleaning up only the missed material. This eliminates hand polishing in tight corners.",
    conditions: [{ type: "feature_present", features: ["freeform", "pocket"] }],
    exceptions: ["When corner radius matches the finish tool radius exactly — no pencil needed"],
    source: "hyperMILL — 'Pencil Finishing Strategy'",
    related_rules: ["STRAT-003"],
  },

  // ── MATERIAL TIPS (continued) ─────────────────────────────────────────

  {
    id: "MAT-005",
    category: "material_tip",
    severity: "important",
    title: "Stainless: emulsion coolant, MQL preferred",
    rule: "For austenitic stainless (304/316), use emulsion coolant (not straight oil). MQL (minimum quantity lubrication) is preferred — it provides lubrication without the re-cut chip problem of flood coolant sumps.",
    reasoning: "Straight oil has poor cooling capacity for stainless, which needs heat extraction. Emulsion (water-based) cools better. MQL delivers micro-drops directly to the cutting zone without flooding, preventing chips from re-entering the cut zone in pooled coolant.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: ["Deep hole drilling requires flood for chip evacuation regardless"],
    source: "Blaser Swisslube — 'Coolant Selection for Stainless'",
    related_rules: ["MAT-001"],
  },
  {
    id: "MAT-006",
    category: "material_tip",
    severity: "important",
    title: "Stainless: avoid surface scratches (stress corrosion)",
    rule: "On austenitic stainless parts, finishing passes must produce clean cuts without chatter marks, scratches, or tool drag marks. Surface defects create stress concentration sites for corrosion initiation.",
    reasoning: "Austenitic stainless relies on a passive chromium oxide layer for corrosion resistance. Scratches and chatter marks break this layer locally and create stress risers. In corrosive environments, these sites become pitting corrosion initiation points.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: ["Parts that will be electropolished after machining — polishing heals surface defects"],
    source: "ASM — 'Corrosion of Stainless Steel'",
    related_rules: ["MAT-001"],
  },
  {
    id: "MAT-007",
    category: "material_tip",
    severity: "important",
    title: "Stainless: minimum chip thickness ~0.05mm",
    rule: "In austenitic stainless, maintain minimum chip thickness of ~0.05mm (fz ≥ 0.05mm/tooth). Below this threshold, the tool rubs rather than cuts, generating friction heat that work-hardens the surface.",
    reasoning: "Below the minimum chip thickness, the cutting edge doesn't engage — it plows. Plowing converts all energy to heat and deformation, creating a hardened layer up to 2× the base hardness. Subsequent passes must cut through this harder layer, accelerating wear.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: ["Wiper inserts with very sharp edges can cut at lower fz"],
    source: "Sandvik Coromant — 'Minimum Chip Thickness Study'",
    related_rules: ["MAT-001"],
  },
  {
    id: "MAT-008",
    category: "material_tip",
    severity: "important",
    title: "Titanium: thermal limit 300°C to prevent strength loss",
    rule: "Monitor titanium part temperature — if it exceeds ~300°C during machining, strength drops >20% and the part may distort after cooling. Use adequate coolant, lighter cuts, and allow cooling between heavy passes.",
    reasoning: "Titanium's excellent strength-to-weight ratio degrades above 300°C due to creep and phase transformation onset. Unlike steel, titanium doesn't recover its original properties after overheating. Overheated zones remain permanently weakened.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["Titanium aluminides (TiAl) have higher temperature thresholds (~700°C)"],
    source: "Kennametal — 'Aerospace Titanium Machining Limits'",
    related_rules: ["MAT-002", "THERM-001"],
  },
  {
    id: "MAT-009",
    category: "material_tip",
    severity: "important",
    title: "Hardened steel >48 HRC: CBN tools required",
    rule: "For hardened steel above 48 HRC, use CBN (cubic boron nitride) inserts instead of carbide. For interrupted cuts in hardened steel, use ceramic inserts (Si3N4 or SiAlON). Carbide fails rapidly above 48 HRC.",
    reasoning: "Carbide's hot hardness limit is ~45-48 HRC workpiece. Above this, the cutting edge softens faster than it removes material. CBN maintains hardness to 65+ HRC workpieces. Ceramic handles the thermal shock of interrupted cuts better than CBN.",
    conditions: [{ type: "material_iso", groups: ["H"] }],
    exceptions: ["Micro-grain carbide with TiAlN coating can survive up to 52 HRC for short runs", "Hardened steel below 45 HRC is fine with carbide"],
    source: "Sumitomo — 'CBN Tool Application Guide'",
    related_rules: ["MAT-004"],
  },
  {
    id: "MAT-010",
    category: "material_tip",
    severity: "recommended",
    title: "Aluminum: prevent BUE with speed and rake",
    rule: "If built-up edge (BUE) appears on aluminum tools: (1) increase speed 20%, (2) verify positive rake angle, (3) use uncoated polished tools, (4) reduce ap slightly. BUE causes poor finish and dimensional variation.",
    reasoning: "BUE forms when aluminum welds to the cutting edge at moderate temperatures. Higher speed increases temperature beyond the adhesion range. Polished, uncoated tools have lower friction coefficient, reducing adhesion tendency. Positive rake reduces cutting force and heat.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["High-silicon aluminum (>12% Si) forms BUE less but is abrasive — use diamond-coated tools"],
    source: "Datron — 'Aluminum Machining Excellence'",
    related_rules: ["MAT-003"],
  },
  {
    id: "MAT-011",
    category: "material_tip",
    severity: "important",
    title: "Cast iron: negative rake, slow speed, heavy cuts",
    rule: "Machine cast iron with negative-rake carbide or ceramic inserts at moderate speed (80-150 m/min), heavy DOC, and DRY or air blast only. Cast iron produces segmented chips that clear easily — no coolant needed.",
    reasoning: "Cast iron's graphite content acts as an internal lubricant. The material fractures to produce short, segmented chips (not continuous). Negative rake handles the abrasive hard skin from casting. Flood coolant creates a slurry with graphite dust that contaminates slideways.",
    conditions: [{ type: "material_iso", groups: ["K"] }],
    exceptions: ["Ductile iron (GGG/SG) behaves more like steel — use positive rake and moderate coolant", "High-chrome cast iron is very abrasive — use CBN"],
    source: "Walter Tools — 'Cast Iron Machining Guide'",
  },

  // ── HOLE-MAKING (continued) ───────────────────────────────────────────

  {
    id: "HOLE-003",
    category: "hole_making",
    severity: "important",
    title: "Peck depth ratio by material",
    rule: "Adjust peck depth by material: Steel 1×D first peck then 0.5×D. Stainless 0.5×D all pecks. Aluminum 0.75-1×D (soft, chips ball up). Titanium 0.3-0.5×D (chips gall). Cast iron 1-1.5×D (short segmented chips).",
    reasoning: "Each material produces different chip morphology. Steel chips are continuous and manageable. Stainless chips are stringy and work-harden if re-cut. Aluminum chips ball up and pack. Titanium chips gall to the drill. Cast iron chips are short and self-clearing.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Through-coolant drills can increase peck depth by 50% in all materials"],
    source: "OSG — 'Drilling Parameter Tables by Material'",
    related_rules: ["HOLE-001"],
  },
  {
    id: "HOLE-004",
    category: "hole_making",
    severity: "important",
    title: "Spot drill angle must match twist drill point angle",
    rule: "Match spot drill point angle to twist drill point angle: 90° spot for 118° drill, 100° spot for 140° drill. Mismatched angles create a ridge that deflects the drill off-center.",
    reasoning: "If the spot angle is LESS than the drill angle, the drill contacts the spot on its margin (outer edge) and walks. If GREATER, the drill bottoms out in the center before the margins engage. The ideal match has the drill cone nesting smoothly into the spot cone.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Self-centering carbide drills with 140° point don't need spot drilling", "Flat-bottom drills (180°) create their own start"],
    source: "Kennametal — 'Hole Making Best Practices'",
    related_rules: ["SEQ-010"],
  },
  {
    id: "HOLE-005",
    category: "hole_making",
    severity: "important",
    title: "Through vs. blind hole strategy differs",
    rule: "Through holes: can use higher feed (chips exit freely), no need for full retract pecks (G73 chip-break sufficient). Blind holes: require full-retract pecks (G83), lower feed near bottom, controlled depth stop — chips have no exit.",
    reasoning: "In through holes, chips evacuate from both ends — the drill pushes some forward and some up the flutes. In blind holes, ALL chips must come back up the flutes past the cutting zone. This requires more aggressive pecking and lower feed to prevent chip packing.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Gun drills handle blind holes differently — internal coolant washes chips back up"],
    source: "Sandvik Coromant — 'Drilling Fundamentals'",
  },
  {
    id: "HOLE-006",
    category: "hole_making",
    severity: "important",
    title: "Tap breakage prevention",
    rule: "To prevent tap breakage: (1) reduce speed 20-30% in hard materials, (2) use synchronized tapping (rigid tap G84), (3) verify hole depth exceeds thread depth by 1-2 pitches, (4) use spiral-flute taps for blind holes. NEVER reverse a tap under load.",
    reasoning: "Taps break from: chip packing (blind holes), depth bottoming, cross-threading (worn guides), and reverse torque. Synchronized tapping ensures RPM exactly matches feed rate × pitch. Extra depth provides chip space. Spiral flutes lift chips out of blind holes.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["Roll taps (forming taps) don't produce chips — chip packing is impossible"],
    source: "OSG — 'Tapping Troubleshooting Guide'",
    related_rules: ["HOLE-002", "SEQ-008"],
  },
  {
    id: "HOLE-007",
    category: "hole_making",
    severity: "recommended",
    title: "Reaming: high feed, never reduce mid-cut",
    rule: "Ream at high feed rate (3-5× drill feed) with slow speed (1/3 of drill speed). NEVER reduce feed or stop mid-cut — this causes chatter marks and undersize holes. Enter and exit at constant feed.",
    reasoning: "Reamers have very small chip loads per tooth. At low feed, chips become too thin to cut — the reamer burnishes rather than cuts, causing adhesion and undersize. High feed ensures each tooth takes a proper chip. Stopping mid-cut leaves witness marks.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Adjustable reamers may need lower feed for best roundness"],
    source: "Guhring — 'Reaming Application Guide'",
  },
  {
    id: "HOLE-008",
    category: "hole_making",
    severity: "recommended",
    title: "Helical entry instead of center drill in pocket floors",
    rule: "When drilling holes in pocket floors (already machined surface), use helical interpolation entry to initial depth instead of center/spot drilling. Spot drills can skid on pocket floor angles or thin remaining material.",
    reasoning: "Pocket floors may not be perfectly flat (scallops from finishing). A spot drill on a scalloped surface can deflect. Helical entry with an endmill gradually engages the material, creating a clean cylindrical start for the subsequent drill.",
    conditions: [{ type: "feature_present", features: ["hole", "pocket"] }],
    exceptions: ["Flat-bottomed pockets with verified flatness — normal spot drill is fine"],
    source: "Fusion 360 — 'Hole Making in Pocket Features'",
  },

  // ── TOOL SELECTION ────────────────────────────────────────────────────

  {
    id: "TOOL-001",
    category: "tool_selection",
    severity: "critical",
    title: "Corner radius must match or exceed fillet radius",
    rule: "Endmill corner radius MUST match or exceed all internal fillet radii on the part. If the print calls for R3 fillets, use a ≥6mm diameter ball nose or ≥R3 corner-radius endmill. Never attempt to cut a fillet with a tool that has a larger radius.",
    reasoning: "A tool with a corner radius LARGER than the required fillet physically cannot produce the geometry — it leaves excess material in the corner. A tool with a MATCHING radius produces the fillet in one pass. A tool SMALLER than the fillet requires multiple passes and leaves scallop marks.",
    conditions: [{ type: "feature_present", features: ["pocket", "profile", "freeform"] }],
    exceptions: ["EDM or hand-finishing for corners smaller than available tool radii"],
    source: "Harvey Performance — 'Corner Radius Endmill Selection'",
  },
  {
    id: "TOOL-002",
    category: "tool_selection",
    severity: "important",
    title: "Flute count by material",
    rule: "Aluminum: 2-3 flutes (chip evacuation). Mild steel: 4 flutes. Stainless: 5-6 flutes (more cutting edges = lower fz per tooth). Hardened steel: 4-6 flutes (light cuts, many teeth). Titanium: 4-5 flutes with variable helix.",
    reasoning: "Fewer flutes = larger flute valleys = better chip evacuation (critical for aluminum's large chips). More flutes = higher feed rate at same fz = better productivity and finish in steel. Variable helix reduces harmonic chatter in titanium.",
    conditions: [{ type: "always" }],
    exceptions: ["High-feed endmills use 5-7 flutes regardless of material", "Roughing endmills with chip breakers can use fewer flutes in steel"],
    source: "OSG — 'Endmill Selection by Material'",
  },
  {
    id: "TOOL-003",
    category: "tool_selection",
    severity: "important",
    title: "Coating selection by material",
    rule: "Steel/cast iron: TiAlN or AlCrN coating. Stainless: TiAlN (prevents BUE). Aluminum: UNCOATED polished (coatings increase edge radius → BUE). Hardened steel: TiSiN or nanocomposite. Titanium: TiAlN or diamond-like carbon (DLC).",
    reasoning: "Coatings serve two functions: heat barrier and friction reduction. TiAlN withstands 900°C (ideal for steel). Aluminum doesn't generate enough heat to benefit from coatings, but the coating's rough surface promotes adhesion (BUE). Uncoated polished tools are the gold standard for aluminum.",
    conditions: [{ type: "always" }],
    exceptions: ["PCD (polycrystalline diamond) is the ultimate for high-silicon aluminum and composites but 10× the cost"],
    source: "Oerlikon Balzers — 'Coating Selection Guide'",
    related_rules: ["MAT-003"],
  },
  {
    id: "TOOL-004",
    category: "tool_selection",
    severity: "important",
    title: "Ball nose vs corner radius for finishing",
    rule: "Use ball nose endmills for complex 3D freeform surfaces (molds, dies, sculptured surfaces). Use corner-radius endmills for pockets with flat floors and fillet radii. Never use a ball nose for flat-bottom pockets — it leaves scallops.",
    reasoning: "Ball nose tools produce cusps on flat surfaces (only the tip contacts). Corner-radius tools have a flat bottom with rounded corners — they produce flat floors with clean fillet radii. Choosing the wrong tool type creates surface quality problems.",
    conditions: [{ type: "feature_present", features: ["pocket", "freeform"] }],
    exceptions: ["Bull-nose endmills (large corner radius) bridge the gap between flat and ball for semi-freeform surfaces"],
    source: "hyperMILL — 'Tool Selection for 3D Finishing'",
  },
  {
    id: "TOOL-005",
    category: "tool_selection",
    severity: "recommended",
    title: "Maximum stick-out for rigidity: L/D ≤ 5",
    rule: "Keep tool length from spindle nose (gauge length) ≤ 5× tool diameter for general milling. For thin walls, use ≤ 3×D. For roughing, ≤ 4×D. Longer reach requires reduced speeds/feeds or vibration-damped holders.",
    reasoning: "Deflection increases with the CUBE of stick-out length (δ = FL³/3EI). Doubling stick-out increases deflection 8×. A 10mm endmill at 50mm stick-out deflects 0.05mm under normal cutting force; at 100mm, it deflects 0.4mm. This causes chatter, poor finish, and dimensional error.",
    conditions: [{ type: "always" }],
    exceptions: ["Vibration-damped (tuned mass) holders extend usable L/D to 7-10", "Carbide shanks are 3× stiffer than steel — allow longer reach"],
    source: "Sandvik Coromant — 'Silent Tools / Vibration Damping'",
  },
  {
    id: "TOOL-006",
    category: "tool_selection",
    severity: "recommended",
    title: "Regrind limits for carbide endmills",
    rule: "Carbide endmills can be reground 3-5 times before edge geometry degrades beyond usefulness. Track regrind count. After 3 regrinds, verify corner radius and runout before reuse. Indexable inserts: rotate through all edges before discarding.",
    reasoning: "Each regrind shortens the tool and slightly changes the geometry (corner radius increases, rake angle shifts). After 3+ regrinds, these cumulative changes affect dimensional accuracy and surface finish. Insert rotation is simpler — each edge is identical when new.",
    conditions: [{ type: "always" }],
    exceptions: ["High-precision work — use new tools only", "HSS tools can survive 5-8+ regrinds"],
    source: "Shop floor experience — 'Tool Lifecycle Management'",
  },

  // ── FINISHING ──────────────────────────────────────────────────────────

  {
    id: "FIN-001",
    category: "finishing",
    severity: "important",
    title: "Finish DOC limit: ap ≤ 0.3mm",
    rule: "Finish passes should use ap = 0.05-0.3mm maximum. Never exceed 0.5mm ap on a finish pass. Light cuts maintain consistent chip thickness, reduce deflection, and produce the best surface finish.",
    reasoning: "Heavy finish passes cause tool deflection proportional to cutting force. Even 0.01mm deflection creates visible marks on the surface. Light passes keep force below the tool/part deflection threshold, producing a true surface.",
    conditions: [{ type: "always" }],
    exceptions: ["Wiper inserts can take up to 0.5mm finish DOC with acceptable finish", "Very rigid boring bars with damping can use slightly heavier cuts"],
    source: "Sandvik Coromant — 'Finishing Parameters'",
  },
  {
    id: "FIN-002",
    category: "finishing",
    severity: "important",
    title: "Always climb-mill on finish passes",
    rule: "Finish passes MUST use climb milling (down milling). Never conventional-mill a finish pass — it causes rubbing on entry, generating poor surface finish and work-hardening in stainless/titanium.",
    reasoning: "In climb milling, the chip starts thick and thins toward exit — minimizing rubbing. In conventional milling, the chip starts at zero thickness, and the tool rubs before engaging. This rubbing creates a hardened, poor-finish surface layer.",
    conditions: [{ type: "always" }],
    exceptions: ["Very thin floors where climb force could pull the floor down — use conventional with very light cuts"],
    source: "Sandvik Coromant — 'Milling Guide: Finishing'",
    related_rules: ["ANTI-003"],
  },
  {
    id: "FIN-003",
    category: "finishing",
    severity: "recommended",
    title: "Wiper insert for turning/facing finish",
    rule: "For turning and facing operations requiring Ra <1.6µm, use wiper-geometry inserts. Wiper inserts have a flat trailing edge that burnishes the surface after cutting, improving finish by 50-100% vs. standard inserts at the same feed.",
    reasoning: "Standard inserts leave a theoretical Ra = f²/(8R) where f is feed and R is nose radius. Wiper inserts add a secondary flat that irons the surface smooth, allowing higher feed rates while maintaining the same finish quality.",
    conditions: [{ type: "surface_finish_below", ra_um: 1.6 }],
    exceptions: ["Interrupted cuts — wiper edge can chip on entry/exit impacts"],
    source: "Sandvik Coromant — 'Wiper Insert Technology'",
  },
  {
    id: "FIN-004",
    category: "finishing",
    severity: "important",
    title: "Increase Vc 15-25% for finish vs. rough",
    rule: "Run finishing passes at 15-25% higher cutting speed (Vc) than roughing with the same material/tool combination. Higher speed improves surface finish and can extend tool life at light DOC.",
    reasoning: "At light DOC (finish), cutting forces are low. Higher speed creates a thinner, more stable chip and better surface. The reduced force means the speed increase doesn't proportionally increase tool wear. Sweet spot is 15-25% above roughing Vc.",
    conditions: [{ type: "always" }],
    exceptions: ["Already at spindle RPM limit", "Titanium — speed increases should be limited to 10% max above roughing"],
    source: "Walter Tools — 'Speed Optimization for Finishing'",
  },
  {
    id: "FIN-005",
    category: "finishing",
    severity: "recommended",
    title: "Inspect for cusps after 3D finishing",
    rule: "After 3D ball-nose finishing, inspect the part for visible cusps (scallop marks). If cusps exceed 0.5mm height or are visually unacceptable, run a tighter-stepover finish pass or pencil cleanup in affected areas.",
    reasoning: "CAM simulation shows theoretical cusp height, but real-world factors (tool deflection, machine vibration, material springback) can increase actual cusp height. Visual inspection catches areas where the theoretical model didn't predict the actual finish quality.",
    conditions: [{ type: "feature_present", features: ["freeform"] }],
    exceptions: ["Parts that will be polished or EDM-textured — cusp marks are removed"],
    source: "hyperMILL — '3D Finishing Quality Control'",
    related_rules: ["STRAT-006"],
  },

  // ── ROUGHING ──────────────────────────────────────────────────────────

  {
    id: "ROUGH-001",
    category: "roughing",
    severity: "important",
    title: "DOC by machine rigidity",
    rule: "Roughing ap guidelines: Rigid CNC (BT40/CAT40+) = 1-2×Dc ap with 10-15% ae (adaptive). Smaller CNC (BT30/CAT30) = 0.5-1×Dc ap. Older/flexible machines = 0.3-0.5×Dc ap. Match DOC to machine capability.",
    reasoning: "Machine rigidity determines the maximum force the system can absorb without chatter. Heavy DOC on a flexible machine creates vibration that damages tools, workpiece, and spindle bearings. Right-sizing DOC to the machine's dynamic stiffness optimizes MRR without damage.",
    conditions: [{ type: "always" }],
    exceptions: ["High-speed spindles (15,000+ RPM) compensate with speed — light ap, high speed"],
    source: "Haas Automation — 'Machine Rigidity and Cutting Parameters'",
  },
  {
    id: "ROUGH-002",
    category: "roughing",
    severity: "important",
    title: "Radial engagement for pocket roughing",
    rule: "For pocket roughing with standard toolpaths: ae = 50-75% of Dc provides steady cutting force. For corners, reduce ae to 40% to prevent force spikes. For adaptive/dynamic: ae = 5-15% of Dc with full-length ap.",
    reasoning: "At ae = 50-75%, the tool engages smoothly with predictable force. At corners with standard toolpaths, engagement can jump to 100-180°, doubling force. Reducing ae at corners or using adaptive toolpaths prevents these spikes.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Full-slot scenarios covered by ANTI-005 — use alternative strategy"],
    source: "SolidCAM — 'Pocket Roughing Parameters'",
    related_rules: ["STRAT-001", "ANTI-005"],
  },
  {
    id: "ROUGH-003",
    category: "roughing",
    severity: "important",
    title: "Chip thinning awareness at small ae",
    rule: "When ae < 50% of Dc, actual chip thickness is LESS than programmed fz. Compensate with chip thinning formula: fz_actual = fz_programmed × (Dc / (2 × sqrt(ae × (Dc - ae)))). Increase feed 20-100% to maintain proper chip thickness.",
    reasoning: "At partial engagement, the arc of contact shortens, creating a thinner chip than the programmed fz. Thin chips don't carry heat efficiently, causing heat to stay in the tool. Increasing feed compensates, maintaining proper chip formation and heat transfer to the chip.",
    conditions: [{ type: "always" }],
    exceptions: ["CAM systems with automatic chip thinning compensation (Dynamic/Adaptive modes)"],
    source: "Harvey Performance — 'Chip Thinning Explained'",
    related_rules: ["STRAT-001"],
  },
  {
    id: "ROUGH-004",
    category: "roughing",
    severity: "important",
    title: "Ramp angle limits for roughing entry",
    rule: "Limit roughing ramp entry to 2-5° slope angle. Steeper ramps (>5°) cause excessive rubbing at the tool center. Helical entry (2-5% of Dc per revolution) is preferred when pocket geometry allows a helix diameter of ≥1.5× tool diameter.",
    reasoning: "During ramping, the tool center (near zero SFM) rubs rather than cuts. Shallow angles minimize the percentage of the tool engaged in rubbing. Helical entry eliminates center rubbing entirely because the tool moves laterally while plunging.",
    conditions: [{ type: "feature_present", features: ["pocket", "profile"] }],
    exceptions: ["Center-cutting endmills and drill mills can ramp at steeper angles", "Pre-drilled plunge points eliminate ramping"],
    source: "Mastercam — 'Entry Methods for Roughing'",
    related_rules: ["ANTI-002", "STRAT-005"],
  },
  {
    id: "ROUGH-005",
    category: "roughing",
    severity: "recommended",
    title: "Rough-to-finish stock allowance",
    rule: "Leave stock for finishing: Profiles = 0.3-1.0mm radial. Pockets = 0.5-1.5mm floor + 0.3-1.0mm walls. Bores = 0.1-0.3mm radial. Too little stock → finish pass under-engaged (chatter). Too much → finish pass overloaded.",
    reasoning: "The finish pass needs consistent engagement to produce uniform surface finish. Too little stock means the finish tool intermittently contacts air (chatter). Too much forces heavy cuts on the finish tool, causing deflection and poor accuracy.",
    conditions: [{ type: "always" }],
    exceptions: ["Combined rough-finish passes (single-pass profiling) in soft materials"],
    source: "Sandvik Coromant — 'Stock Allowance Recommendations'",
  },

  // ── 5-AXIS ────────────────────────────────────────────────────────────

  {
    id: "5AX-001",
    category: "5axis",
    severity: "critical",
    title: "Tool axis smoothing for 5-axis programs",
    rule: "Enable tool axis smoothing (smooth/continuous/minimum distance) in CAM post-processor for simultaneous 5-axis programs. Without smoothing, abrupt axis direction changes cause jerky motion, surface marks, and potential axis over-travel.",
    reasoning: "5-axis toolpaths calculate discrete tool orientations at each CL point. Without smoothing, the rotary axes can reverse direction between consecutive points, causing acceleration spikes. Smoothing algorithms interpolate tool axis motion to create continuous, predictable rotary movement.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["3+2 (indexed) operations don't need smoothing — axes are locked during cutting"],
    source: "hyperMILL — '5-Axis Finishing Parameters'",
  },
  {
    id: "5AX-002",
    category: "5axis",
    severity: "important",
    title: "Lead/tilt angle for 5-axis finishing",
    rule: "Approach surfaces at 10-15° lead angle (tool tilted in feed direction) and 0-5° tilt angle (perpendicular to feed). This engages the tool slightly off-center, avoiding the zero-speed point at the ball nose tip.",
    reasoning: "The tip of a ball nose has zero surface speed (Vc = π × D × n, and D=0 at the tip). Cutting at the tip causes rubbing, poor finish, and rapid wear. A 10-15° lead angle shifts the contact point to a diameter where surface speed is adequate.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["Flat horizontal surfaces where tilting would create interference", "Deep cavities where tilt angle causes tool shank collision"],
    source: "Sandvik Coromant — '5-Axis Ball Nose Finishing'",
  },
  {
    id: "5AX-003",
    category: "5axis",
    severity: "important",
    title: "Simultaneous 5-axis vs 3+2 indexed",
    rule: "Use 3+2 (indexed) positioning when possible — it's simpler, more rigid (axes locked), and produces less rotary axis wear. Reserve simultaneous 5-axis for: undercuts, complex compound surfaces, or features requiring smooth tool axis transitions.",
    reasoning: "3+2 positioning locks the rotary axes during cutting, making the setup equivalent to a 3-axis operation with better rigidity. Simultaneous 5-axis adds complexity, requires more careful collision checking, and subjects rotary axes to cutting loads. Use it only when geometry demands it.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["Blade/impeller machining where simultaneous is mandatory for geometry access"],
    source: "DMG MORI — '5-Axis Application Guide'",
  },
  {
    id: "5AX-004",
    category: "5axis",
    severity: "important",
    title: "Singularity avoidance in 5-axis toolpaths",
    rule: "Check CAM output for rotary axis singularities (gimbal lock). This occurs when the tool axis passes through the machine's pole direction (typically A=0 or B=0). CAM must reroute the toolpath or apply singularity avoidance to prevent axis reversal.",
    reasoning: "At a singularity, one rotary axis must rotate 180° instantaneously to maintain tool orientation. In practice, this causes violent axis motion, surface marks, and potential machine alarms. Most modern CAM systems detect and avoid singularities, but the programmer must verify.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["Table-table machines have different singularity geometry than head-table or head-head"],
    source: "Siemens NX — 'Multi-Axis Machining: Singularity Handling'",
  },

  // ── WORKHOLDING (continued) ───────────────────────────────────────────

  {
    id: "HOLD-003",
    category: "workholding",
    severity: "important",
    title: "Vise clamping force limits",
    rule: "Clamp force should resist cutting forces with 2× safety margin but not distort the part. Guideline: aluminum parts with walls <3mm = light vise torque (20-30 Nm). Steel parts = medium torque (40-60 Nm). Never over-torque — test with indicator on part surface.",
    reasoning: "Over-clamping distorts the part elastically. When released, the part springs back and machined features are out of tolerance. An indicator on the part surface while tightening the vise shows when distortion begins — stop just before this point.",
    conditions: [{ type: "always" }],
    exceptions: ["Zero-point clamping systems with calibrated force", "Hydraulic vises with adjustable pressure"],
    source: "Schunk — 'Clamping Force Guidelines'",
  },
  {
    id: "HOLD-004",
    category: "workholding",
    severity: "important",
    title: "Vacuum table surface requirements",
    rule: "Vacuum workholding requires a flat, smooth backing surface (Ra <3.2µm). The part bottom must be machined flat in Op 1. Use vacuum with gasket seals for porous materials. Minimum part area for vacuum: 50cm² at 0.8 bar vacuum.",
    reasoning: "Vacuum holds by pressure differential across the part's area. Rough surfaces leak vacuum — the seal is broken. Small parts have insufficient area for the pressure differential to generate adequate holding force. Gasket seals compensate for minor surface irregularities.",
    conditions: [{ type: "always" }],
    exceptions: ["Porous materials (MDF, some castings) require sealed gasket or sacrificial skin layer"],
    source: "Pierson Workholding — 'Vacuum Fixturing Guide'",
  },
  {
    id: "HOLD-005",
    category: "workholding",
    severity: "recommended",
    title: "Magnetic chuck demagnetization after use",
    rule: "After machining ferrous parts on magnetic chucks, run a demagnetization cycle (built-in or external demagnetizer) before removing the part. Residual magnetism causes parts to stick to fixtures, attract chips, and interfere with measurement.",
    reasoning: "Magnetic chucks induce magnetism in ferrous parts. This residual magnetism (5-50 Gauss typical) makes parts attract chips during subsequent operations, stick to steel fixtures, and cause false readings on dial indicators and CMMs.",
    conditions: [{ type: "material_iso", groups: ["P", "K", "H"] }],
    exceptions: ["Non-ferrous parts (aluminum, titanium, brass) are not affected by magnetism"],
    source: "Walker Magnetics — 'Magnetic Chuck Care'",
  },
  {
    id: "HOLD-006",
    category: "workholding",
    severity: "recommended",
    title: "Expanding mandrel TIR check before use",
    rule: "Before using an expanding mandrel (for Op 2 bore-location work), verify TIR (Total Indicator Runout) < 0.01mm. Worn or bent mandrels cause position error in all features machined relative to the bore datum.",
    reasoning: "Mandrels locate the part by expanding against the bore ID. If the mandrel body is bent or worn, the part rotates eccentrically around the spindle axis. This eccentricity directly translates to position error on every feature.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["Low-tolerance parts where 0.05mm bore runout is acceptable"],
    source: "Royal Products — 'Mandrel Inspection Procedures'",
  },

  // ── THERMAL (continued) ───────────────────────────────────────────────

  {
    id: "THERM-002",
    category: "thermal",
    severity: "important",
    title: "Active thermal management: measure before finishing",
    rule: "For precision parts, measure part temperature after roughing using IR thermometer or thermocouple. Resume finishing only when part temperature is within 5°C of ambient. For steel, this means waiting 10-30 min after heavy roughing.",
    reasoning: "Thermal expansion of steel is ~12µm/m/°C. A 50mm feature at 20°C above ambient is 0.012mm larger than nominal. If finished while hot, the feature will be undersized when cooled. Active measurement removes guesswork from the stabilization wait.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Temperature-controlled environments (<±1°C) where part temperature is known", "In-process probing that compensates for thermal growth"],
    source: "Renishaw — 'Thermal Compensation in Precision Machining'",
    related_rules: ["THERM-001"],
  },
  {
    id: "THERM-003",
    category: "thermal",
    severity: "important",
    title: "Coolant pressure by operation type",
    rule: "Recommended coolant pressure: Drilling = 50-100 bar (high pressure for chip evacuation). Milling = 20-40 bar (moderate for cooling/lubrication). Finishing = 10-30 bar (low pressure to avoid turbulence marks). Tapping = 15-25 bar (moderate for chip flushing).",
    reasoning: "Drilling generates chips in a confined hole — high pressure is needed to force chips up the flutes. Milling has open chip exit — moderate pressure suffices. Finishing at high pressure can create surface marks from turbulent coolant flow deflecting the tool.",
    conditions: [{ type: "always" }],
    exceptions: ["Through-spindle coolant systems deliver pressure directly to the cutting zone — can use higher pressures safely", "MQL replaces pressure-based coolant entirely"],
    source: "Blaser Swisslube — 'Coolant Pressure Optimization'",
  },
  {
    id: "THERM-004",
    category: "thermal",
    severity: "recommended",
    title: "Through-spindle coolant justification threshold",
    rule: "Through-spindle coolant (TSC) is cost-effective when: drilling >3×D depth, or milling at Vc >200 m/min, or machining stainless/titanium. Below these thresholds, external flood or MQL is adequate. TSC tools cost 2-5× standard tools.",
    reasoning: "TSC delivers coolant directly through the tool to the cutting zone, providing superior chip evacuation and cooling. But TSC-capable tools are significantly more expensive. The investment is justified only when the operation demands it — deep holes, high-speed cutting, or difficult materials.",
    conditions: [{ type: "always" }],
    exceptions: ["High-volume production where tool life extension from TSC justifies the cost at any speed"],
    source: "Kennametal — 'Through-Coolant vs External Coolant ROI'",
  },

  // ── CHIP CONTROL ──────────────────────────────────────────────────────

  {
    id: "CHIP-001",
    category: "chip_control",
    severity: "important",
    title: "Chip breaker geometry selection",
    rule: "Use positive-rake inserts with chip breaker grooves for steel and stainless (long continuous chips). Use negative-rake inserts for cast iron and hard materials (chips break naturally). For aluminum, 2-3 flute endmills with polished flutes evacuate chips best.",
    reasoning: "Long continuous chips wrap around the tool, workpiece, and fixture — creating a safety hazard and damaging surfaces. Chip breakers curl and fracture the chip into manageable segments. Materials that naturally form short chips (cast iron, brass) don't need breakers.",
    conditions: [{ type: "always" }],
    exceptions: ["Very light finishing cuts may not produce enough chip to engage the breaker — use different geometry"],
    source: "Sandvik Coromant — 'Chip Breaker Selection Guide'",
  },
  {
    id: "CHIP-002",
    category: "chip_control",
    severity: "important",
    title: "Air blast timing and direction",
    rule: "Direct air blast at the cutting zone from BEHIND the tool (in the feed direction). Activate air before the tool enters the cut, maintain throughout, and continue for 2 seconds after exit. Never blast FROM the front — it pushes chips back into the cut.",
    reasoning: "Air blast serves two functions: clearing chips from the cutting zone and providing light cooling. Direction matters — blasting from behind pushes chips away from the next tool pass. Front-facing air blast pushes chips into the uncut material, where they re-enter the next pass.",
    conditions: [{ type: "always" }],
    exceptions: ["Through-tool air blast doesn't need directional nozzles — it exits through the tool", "MQL systems have their own air delivery"],
    source: "Shop floor experience — 'Air Blast Best Practices'",
  },
  {
    id: "CHIP-003",
    category: "chip_control",
    severity: "important",
    title: "G73 chip-break vs G83 full-retract pecking",
    rule: "Use G73 (chip-break/high-speed peck) for through-coolant drills — faster because it only retracts 1-3mm to break the chip. Use G83 (full-retract peck) for standard drills — must fully retract to clear chips from flutes. G73 saves 30-50% cycle time.",
    reasoning: "G83 retracts the drill completely out of the hole each peck — this wastes time on re-positioning and re-entry. G73 makes a small retract (enough to snap the chip) then continues drilling. But G73 only works if coolant can flush chips up the flutes — requiring through-tool coolant.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Very deep holes (>8×D) may need G83 even with through-coolant for safety"],
    source: "Haas Automation — 'Canned Cycle Optimization'",
    related_rules: ["HOLE-001", "HOLE-005"],
  },
  {
    id: "CHIP-004",
    category: "chip_control",
    severity: "important",
    title: "Long chip management in deep pockets",
    rule: "In pockets deeper than 3×Dc, monitor for long spiral chips wrapping around the tool shank. Solutions: (1) use chip-breaker endmills, (2) program occasional retract-to-clearance moves, (3) reduce ae to produce thinner chips that break more easily.",
    reasoning: "Long spiral chips in deep pockets can't evacuate upward past the tool body. They accumulate, wrap around the shank, and eventually seize the tool or gouge the part walls. Periodic retract moves clear accumulated chips. Chip-breaker endmills (serrated edges) break chips into segments.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Through-tool coolant with high pressure (>40 bar) can wash chips out continuously"],
    source: "Harvey Performance — 'Deep Pocket Strategies'",
    related_rules: ["ANTI-010"],
  },
  {
    id: "CHIP-005",
    category: "chip_control",
    severity: "recommended",
    title: "Chip evacuation verification for complex geometries",
    rule: "For complex multi-feature parts, verify chip evacuation paths in CAM simulation. Chips from upper features falling into lower pockets can jam tools. Program air-blast pauses or M01 stops between features to clear accumulated chips.",
    reasoning: "Complex parts with multiple levels, pockets, and through-holes create 'chip traps' where gravity pulls chips into lower features. When the tool enters these features, it re-cuts the trapped chips, causing surface marks, tool wear, and potential breakage.",
    conditions: [{ type: "feature_present", features: ["pocket", "hole", "slot"] }],
    exceptions: ["Horizontal machining centers (gravity pulls chips away from the part)"],
    source: "Shop floor experience — 'Complex Part Chip Management'",
  },

  // ── TOOL LIFE ─────────────────────────────────────────────────────────

  {
    id: "LIFE-001",
    category: "tool_life",
    severity: "important",
    title: "Flank wear limit for carbide: VB ≤ 0.3mm",
    rule: "Replace carbide endmills/inserts when flank wear band width (VB) reaches 0.2-0.3mm. Beyond 0.3mm, tool failure becomes unpredictable — the edge may chip or fracture catastrophically. Inspect with 10× loupe or microscope every 20-30 minutes of cutting time.",
    reasoning: "Carbide wear follows a predictable curve: initial break-in (rapid), steady-state (gradual), then catastrophic breakdown (sudden). The 0.3mm VB threshold is at the boundary between steady-state and breakdown. Operating beyond this risks sudden failure that damages the part.",
    conditions: [{ type: "always" }],
    exceptions: ["Finishing operations — replace at VB = 0.15mm for best surface finish", "CBN tools can operate to VB = 0.4mm in some applications"],
    source: "ISO 3685 — 'Tool Life Testing Standard'",
  },
  {
    id: "LIFE-002",
    category: "tool_life",
    severity: "important",
    title: "HSS regrind limits: 5-8 cycles maximum",
    rule: "HSS (high-speed steel) endmills and drills can be reground 5-8 times before edge quality degrades below usability. Track regrind count with color-coded bands or etching. Verify geometry after each regrind.",
    reasoning: "HSS is ductile enough to tolerate multiple regrinds without chipping. However, each regrind shortens the tool, slightly changes clearance angles, and may introduce runout. After 5+ regrinds, cumulative geometry drift affects performance noticeably.",
    conditions: [{ type: "always" }],
    exceptions: ["Disposable HSS drills in high-volume production — cheaper to replace than regrind"],
    source: "Shop floor experience — 'Tool Reconditioning'",
  },
  {
    id: "LIFE-003",
    category: "tool_life",
    severity: "recommended",
    title: "Coating wear visual indicators",
    rule: "Monitor coated tool wear by visual inspection: TiN (gold) → exposed substrate (gray/silver) when worn. TiAlN (purple/dark) → shiny carbide when worn. When coating is removed from more than 50% of the flank face, tool life has expired.",
    reasoning: "Coatings provide the primary wear resistance. Once the coating is breached, the exposed carbide substrate wears 3-5× faster. The visual color change from coating to substrate is an easy, reliable indicator of remaining tool life without needing measurement equipment.",
    conditions: [{ type: "always" }],
    exceptions: ["Diamond and DLC coatings don't show clear visual transitions"],
    source: "Oerlikon Balzers — 'Coating Wear Diagnostics'",
  },
  {
    id: "LIFE-004",
    category: "tool_life",
    severity: "recommended",
    title: "Insert rotation schedule",
    rule: "For indexable inserts with N cutting edges: rotate to the next edge after each tool life interval. Track active edge with a marker dot. After all edges are used, discard. Standard: square inserts = 4 edges, triangle = 3, round = 6-8 positions.",
    reasoning: "Each edge is independent — using all edges maximizes the insert's value (cost per edge = insert price / number of edges). Tracking the active edge prevents accidentally reusing a worn edge, which would produce poor finish and potentially damage the part.",
    conditions: [{ type: "always" }],
    exceptions: ["Single-edge finishing inserts designed for one cutting edge only"],
    source: "Sandvik Coromant — 'Insert Handling & Rotation'",
  },

  // ── DATUM (continued) ─────────────────────────────────────────────────

  {
    id: "DAT-002",
    category: "datum",
    severity: "important",
    title: "3-2-1 locating principle for datum transfer",
    rule: "Use the 3-2-1 principle for datum transfer between setups: 3 contact points on the primary datum plane (constrains tilt), 2 points on the secondary datum edge (constrains rotation), 1 point on the tertiary datum (constrains translation).",
    reasoning: "3-2-1 fully constrains the part in 6 degrees of freedom using the minimum number of contact points. More points over-constrain (causing rocking). Fewer points leave the part free to shift. This is the foundation of all precision fixturing.",
    conditions: [{ type: "always" }],
    exceptions: ["Round parts use different constraints (V-block + end stop)", "Flexible parts may need more support points with controlled preload"],
    source: "ASME Y14.5 — 'Datum Reference Frames'",
    related_rules: ["DAT-001", "SETUP-007"],
  },
  {
    id: "DAT-003",
    category: "datum",
    severity: "important",
    title: "CMM verification before Op 2 commitment",
    rule: "For precision parts (±0.025mm or tighter), verify Op 1 datum features on CMM or with indicators before committing to Op 2. If Op 1 is out of spec, it's cheaper to re-run Op 1 than to discover it after Op 2 finishing.",
    reasoning: "Op 2 features reference Op 1 datums. If Op 1 datums are 0.02mm off, ALL Op 2 features inherit that error. Catching it between operations allows correction (re-face, re-bore). After Op 2, the part is either scrap or requires expensive recovery operations.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["Production runs with SPC showing consistent Op 1 results — inspect only periodically"],
    source: "Quality Engineering — 'In-Process Inspection Strategy'",
    related_rules: ["SETUP-008"],
  },

  // ── DEBURRING ─────────────────────────────────────────────────────────

  {
    id: "DEBUR-001",
    category: "deburring",
    severity: "important",
    title: "Chamfer vs radius by application",
    rule: "Use chamfers (45°×0.2-0.5mm) for: assembly edges (prevent snagging), thread lead-ins, sharp corners that could cut operators. Use radii (R0.2-0.5mm) for: fatigue-critical edges (stress concentration reduction), hydraulic passages (flow optimization).",
    reasoning: "Chamfers create a flat break — easy to inspect and measure, good for assembly clearance. Radii create a smooth transition — better for stress distribution (30-50% fatigue life improvement over sharp edge). Choose based on the functional requirement of each edge.",
    conditions: [{ type: "always" }],
    exceptions: ["Drawing callout takes precedence over this guideline"],
    source: "ASME standards — 'Edge Break Requirements'",
  },
  {
    id: "DEBUR-002",
    category: "deburring",
    severity: "important",
    title: "Cross-hole deburring strategy",
    rule: "Cross-holes (holes intersecting other holes or bores) always produce burrs at the intersection. Strategies: (1) chamfer both sides of the intersection, (2) use a thermal deburring (TEM) post-process, (3) use a back-deburring tool (swivel blade), (4) design the intersection to minimize burr (stagger depths).",
    reasoning: "The drill exits into the intersecting hole, creating a burr on the far side that's inaccessible to standard tools. This burr can break off during operation, contaminating hydraulic systems or bearing surfaces. It must be removed by specialized methods.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Non-critical intersections where loose burrs pose no functional risk"],
    source: "Heule — 'Cross-Hole Deburring Solutions'",
  },
  {
    id: "DEBUR-003",
    category: "deburring",
    severity: "recommended",
    title: "Brush deburring tool parameters",
    rule: "For CNC brush deburring: brass brush for aluminum (won't scratch), steel/abrasive brush for steel. Speed: 1000-3000 RPM. Feed: 200-500 mm/min. Depth: brush tips should compress 1-2mm into the edge. Run in climb direction for best edge consistency.",
    reasoning: "CNC brush deburring is faster and more repeatable than hand deburring. Material-matched brushes prevent contamination (steel brush on aluminum leaves ferrous particles). Light compression ensures consistent edge break without over-rounding.",
    conditions: [{ type: "always" }],
    exceptions: ["Hardened parts may require abrasive filament brushes instead of wire"],
    source: "Osborn — 'CNC Deburring Brush Application Guide'",
  },
  {
    id: "DEBUR-004",
    category: "deburring",
    severity: "tip",
    title: "Off-machine deburring options",
    rule: "Consider off-machine deburring for non-precision edges: tumble media (vibratory finishing), thermal deburring (TEM), electrochemical deburring (ECM), or hand files. Off-machine methods free CNC time for cutting operations.",
    reasoning: "CNC time is expensive ($50-200/hr). Spending 5 minutes of CNC time on deburring costs more than a 30-second tumble cycle. For parts without tight edge-break tolerances, batch off-machine deburring is 5-10× more cost-effective.",
    conditions: [{ type: "batch_size_above", count: 10 }],
    exceptions: ["Precision edge breaks (specific radius or chamfer callouts) must be done on CNC", "Single-piece production where setup for off-machine isn't justified"],
    source: "Shop floor experience — 'Deburring Cost Optimization'",
  },

  // ── SAFETY (continued) ────────────────────────────────────────────────

  {
    id: "SAFE-002",
    category: "safety",
    severity: "critical",
    title: "Never exceed tool maximum RPM rating",
    rule: "NEVER exceed the tool manufacturer's maximum RPM rating. Centrifugal force at high RPM can cause tool shank failure, insert ejection, or collet slippage. Check: endmill data sheet, insert holder balance rating, collet/holder torque spec.",
    reasoning: "Centrifugal force increases with RPM². At excessive RPM, the tool body experiences tensile stress that can exceed material limits, causing catastrophic burst. Insert-style tools are especially dangerous — inserts can eject at high velocity. All tools have an RPM limit based on mass, balance, and clamping force.",
    conditions: [{ type: "always" }],
    exceptions: ["Tools specifically rated for high-speed machining (HSM) have higher RPM limits noted on the tool or packaging"],
    source: "DIN 6535 — 'Tooling Safety Standards'",
  },
  {
    id: "SAFE-003",
    category: "safety",
    severity: "critical",
    title: "High-pressure coolant safety check",
    rule: "Before using coolant pressure >100 bar: (1) verify hose ratings exceed operating pressure by 4×, (2) check all fittings and connections, (3) ensure guards are closed, (4) verify nozzle is aimed at the cutting zone not the operator. Coolant injection injuries are serious.",
    reasoning: "High-pressure coolant (70-150 bar is common for through-tool) can penetrate skin and cause fluid injection injuries similar to hydraulic injection. Hose failure sprays coolant at lethal pressure. All connections must be rated and inspected before high-pressure operation.",
    conditions: [{ type: "always" }],
    exceptions: ["MQL systems operate at low pressure (2-10 bar) — standard safety measures sufficient"],
    source: "OSHA — 'High Pressure Fluid Safety'",
  },
  {
    id: "SAFE-004",
    category: "safety",
    severity: "important",
    title: "Chuck jaw clearance verification",
    rule: "Before running any program, verify that: (1) chuck jaws won't contact the tool changer or turret, (2) protruding part stock won't contact the tailstock or steady rest, (3) jaw steps clear all tool paths including rapids (G00).",
    reasoning: "Chuck jaw collisions are among the most expensive CNC lathe crashes — they damage the chuck, turret, and often the spindle bearings. Large step jaws extending beyond the chuck diameter are especially dangerous during automatic tool changes.",
    conditions: [{ type: "always" }],
    exceptions: ["Machines with automatic jaw-position sensing and interlock"],
    source: "Shop floor experience — 'Lathe Crash Prevention'",
    related_rules: ["SAFE-001"],
  },
  {
    id: "SAFE-005",
    category: "safety",
    severity: "important",
    title: "CAM simulation collision check before first run",
    rule: "Run FULL collision simulation in CAM (including tool holder, spindle, fixture, and workpiece model) before posting any program. Visual G-code review is NOT sufficient to catch collisions. Simulate at rapid (G00) speeds — most collisions happen during rapids.",
    reasoning: "Collisions during rapids happen too fast for operator reaction (0.1-0.5 seconds). CAM simulation checks every CL point against the complete machine model. A 2-minute simulation prevents $1,000-50,000 in crash damage. Most shops require simulation sign-off before any first article.",
    conditions: [{ type: "always" }],
    exceptions: ["Proven programs on identical setups that have already been simulated and run successfully"],
    source: "Vericut / hyperMILL — 'NC Simulation Best Practices'",
    related_rules: ["SAFE-001", "SETUP-006"],
  },

  // ── GRINDING RULES ───────────────────────────────────────────────────────

  {
    id: "GRIND-001",
    category: "grinding",
    severity: "critical",
    title: "Dress wheel before finishing passes",
    rule: "Always dress the grinding wheel before finishing passes. A loaded or glazed wheel generates excessive heat and causes burn marks on the workpiece surface.",
    reasoning: "Grinding wheels load with swarf particles that fill the pore structure, reducing cutting action. The wheel rubs instead of cutting, generating friction heat that causes thermal damage (burn marks, temper colors, surface tensile stress, and micro-cracks).",
    conditions: [{ type: "operation_type", operations: ["grinding"] }],
    exceptions: ["Superabrasive wheels (CBN/diamond) that self-sharpen under proper conditions"],
    source: "Norton Abrasives — 'Grinding Wheel Dressing Guide'",
    related_rules: ["GRIND-008"],
  },
  {
    id: "GRIND-002",
    category: "grinding",
    severity: "important",
    title: "Monitor specific grinding energy",
    rule: "Track specific grinding energy (energy per unit volume removed). If energy rises >50% above the baseline value, the wheel is loaded and needs dressing.",
    reasoning: "Specific grinding energy is the most reliable indicator of wheel condition. As the wheel dulls or loads, more energy is converted to heat rather than chip formation. Rising energy directly correlates with thermal damage risk and poor surface integrity.",
    conditions: [{ type: "always" }],
    exceptions: ["Initial break-in period for new wheels where energy stabilizes over first few passes"],
    source: "Malkin & Guo — 'Grinding Technology: Theory and Application'",
    related_rules: ["GRIND-001"],
  },
  {
    id: "GRIND-003",
    category: "grinding",
    severity: "critical",
    title: "Never exceed wheel peripheral speed rating",
    rule: "Never operate a grinding wheel above its rated peripheral speed (m/s). Exceeding the rated speed risks catastrophic wheel burst — a life-threatening hazard.",
    reasoning: "Centrifugal force on the wheel increases with the square of speed. Vitrified bond wheels have a maximum safe speed determined by bond strength. Above this speed, the wheel can disintegrate explosively, sending fragments at hundreds of m/s.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "ANSI B7.1 — 'Safety Requirements for Grinding Wheels'",
    related_rules: ["SAFE-001"],
  },
  {
    id: "GRIND-004",
    category: "grinding",
    severity: "important",
    title: "Use creep-feed for deep slots, conventional for shallow",
    rule: "Use creep-feed grinding (slow feed, deep cut >2mm) for deep material removal. Use conventional grinding (fast feed, shallow cut <0.5mm) for stock removal on surfaces.",
    reasoning: "Creep-feed grinding maintains constant arc of contact, producing uniform heat distribution and better form accuracy in deep slots/profiles. Conventional grinding at deep cuts causes thermal damage due to excessive contact arc and dwell time.",
    conditions: [{ type: "always" }],
    exceptions: ["HEDG (High Efficiency Deep Grinding) combines high speed with deep cuts using CBN wheels"],
    source: "Studer — 'Grinding Process Fundamentals'",
  },
  {
    id: "GRIND-005",
    category: "grinding",
    severity: "recommended",
    title: "Spark-out passes for surface finish",
    rule: "Use 2-3 spark-out passes (zero infeed) at the end of grinding to improve surface finish by 30-50%. The wheel continues cutting elastic deflection spring-back from previous passes.",
    reasoning: "During grinding, the system deflects elastically under cutting force. When infeed stops, the deflection recovers and the wheel continues removing material until equilibrium. These passes produce the finest finish with minimal subsurface damage.",
    conditions: [{ type: "surface_finish_below", ra_um: 0.4 }],
    exceptions: ["Production grinding where cycle time is critical and finish spec is easily met"],
    source: "Machinist Handbook — 'Grinding Operations'",
  },
  {
    id: "GRIND-006",
    category: "grinding",
    severity: "important",
    title: "Coolant flood rate minimum 20 L/min for grinding",
    rule: "Maintain minimum 20 L/min coolant flow rate during grinding operations. Grinding burns occur without adequate coolant flow to the cutting zone.",
    reasoning: "Grinding generates more heat per unit volume than any other machining process (specific energy 10-100× higher than milling). Coolant must flood the contact zone to prevent thermal damage. Insufficient flow allows a steam barrier to form, eliminating cooling.",
    conditions: [{ type: "operation_type", operations: ["grinding"] }],
    exceptions: ["Dry grinding of cast iron with resinoid wheels at light depths", "CBN wheels with oil coolant (lower flow rate acceptable due to oil's higher film strength)"],
    source: "Winterthur — 'Coolant Application in Grinding'",
    related_rules: ["COOL-001"],
  },
  {
    id: "GRIND-007",
    category: "grinding",
    severity: "recommended",
    title: "CBN wheels for hardened steel grinding",
    rule: "Use CBN (cubic boron nitride) grinding wheels for hardened steel above 55 HRC. CBN provides 10× or greater wheel life compared to aluminum oxide at these hardness levels.",
    reasoning: "CBN is the second hardest material after diamond and has excellent thermal conductivity. It maintains sharpness on hardened steel far longer than conventional abrasives, producing less heat and better surface integrity. The higher wheel cost is offset by reduced dressing, fewer wheel changes, and consistent quality.",
    conditions: [{ type: "hardness_above", hrc: 55 }],
    exceptions: ["Low-volume prototype work where wheel cost exceeds production savings", "Interrupted surfaces where CBN may chip (use ceramic aluminum oxide instead)"],
    source: "3M — 'CBN Grinding Guide'",
    related_rules: ["HT-001"],
  },
  {
    id: "GRIND-008",
    category: "grinding",
    severity: "tip",
    title: "Balance grinding wheel after each dress",
    rule: "Re-balance the grinding wheel after each dressing operation. Dressing removes material unevenly, shifting the wheel's center of mass and causing imbalance-induced chatter marks.",
    reasoning: "Even 1 gram of imbalance at 3000 RPM generates significant centrifugal force oscillation. This appears as regularly-spaced chatter marks on the workpiece, especially visible on ID grinding where the wheel-to-bore diameter ratio amplifies the effect.",
    conditions: [{ type: "always" }],
    exceptions: ["Small-diameter wheels (<50mm) on rigid spindles where imbalance is negligible"],
    source: "Haimer — 'Wheel Balancing Technology'",
    related_rules: ["GRIND-001"],
  },

  // ── TURNING RULES ────────────────────────────────────────────────────────

  {
    id: "TURN-001",
    category: "turning",
    severity: "critical",
    title: "Support long parts with tailstock or steady rest",
    rule: "For parts with L/D > 4, use tailstock support or a steady rest. Without support, the part deflects under cutting forces, causing taper errors and chatter.",
    reasoning: "A cantilever beam deflects proportionally to L³. At L/D > 4, deflection exceeds typical tolerance bands. The center of the part sags away from the tool, producing a barrel shape (larger diameter at center). Tailstock support converts the beam to simply-supported, reducing deflection 5×.",
    conditions: [{ type: "aspect_ratio_above", ratio: 4 }],
    exceptions: ["Short rigid parts with L/D < 3 held firmly in chuck", "Parts with intermediate shoulders that act as natural supports"],
    source: "Sandvik Coromant — 'Turning Guide: Workholding'",
    related_rules: ["TURN-004"],
  },
  {
    id: "TURN-002",
    category: "turning",
    severity: "important",
    title: "Rough from tailstock toward chuck",
    rule: "When roughing long parts, cut from the tailstock end toward the chuck. Cutting forces push the workpiece into the chuck jaws, increasing rigidity.",
    reasoning: "Axial cutting force in turning pushes the workpiece in the feed direction. Cutting toward the chuck pushes the part into the jaws, increasing clamping force. Cutting away from the chuck pulls the part out, risking ejection on heavy cuts.",
    conditions: [{ type: "always" }],
    exceptions: ["Finishing passes where direction is governed by surface finish requirements", "Bar-fed parts where material feeds from the chuck side"],
    source: "Kennametal — 'Turning Application Guide'",
    related_rules: ["TURN-001"],
  },
  {
    id: "TURN-003",
    category: "turning",
    severity: "important",
    title: "Use positive rake inserts for finishing",
    rule: "Select positive rake inserts for finishing operations. Positive rake geometry generates lower cutting forces, producing better surface finish and less workpiece deflection.",
    reasoning: "Positive rake inserts shear material cleanly with lower force. Negative rake inserts are stronger but create higher radial forces that deflect thin sections. For finishing where force must be minimized and surface quality maximized, positive rake is essential.",
    conditions: [{ type: "feature_present", features: ["finish", "turning"] }],
    exceptions: ["Heavy interrupted cuts where positive inserts may chip", "Hardened material turning where negative rake CBN is stronger"],
    source: "Sandvik Coromant — 'Insert Selection Guide'",
    related_rules: ["HT-002"],
  },
  {
    id: "TURN-004",
    category: "turning",
    severity: "critical",
    title: "Never exceed 3:1 unsupported L/D without steady rest",
    rule: "Parts with unsupported L/D > 3 must use a steady rest or follower rest. Without support, catastrophic deflection causes chatter, taper errors, and potential workpiece ejection.",
    reasoning: "At L/D > 3 without support, the part acts as a cantilever with deflection proportional to L³/D⁴. Radial cutting force pushes the part away from the tool. At high speeds, the rotating imbalance from deflection creates self-exciting vibration that worsens progressively.",
    conditions: [{ type: "aspect_ratio_above", ratio: 3 }],
    exceptions: ["Low material removal (spring passes) where cutting forces are minimal"],
    source: "Machinist Handbook — 'Lathe Operations: Slender Work'",
    related_rules: ["TURN-001"],
  },
  {
    id: "TURN-005",
    category: "turning",
    severity: "recommended",
    title: "Reduce DOC for thin-wall turning",
    rule: "For thin-wall turning, limit depth of cut to 0.5× wall thickness maximum. Excessive DOC causes the wall to vibrate (chatter) and deflect, producing poor finish and dimensional errors.",
    reasoning: "Thin cylindrical walls have low stiffness in the radial direction. Cutting force deflects the wall elastically, and when released, it springs back. If DOC > 0.5× wall thickness, the deflection may exceed the elastic limit, causing permanent deformation or chatter.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3 }],
    exceptions: ["Parts with internal support mandrels or expanding collets that stiffen the wall"],
    source: "Titans of CNC — 'Thin Wall Turning Techniques'",
    related_rules: ["THIN-001"],
  },
  {
    id: "TURN-006",
    category: "turning",
    severity: "important",
    title: "Match insert nose radius to minimum fillet radius",
    rule: "The turning insert nose radius must be less than or equal to the smallest concave radius on the part. A 0.8mm nose radius cannot cut a 0.4mm fillet.",
    reasoning: "The insert nose radius defines the minimum internal radius the tool can produce. If the nose radius exceeds the required fillet, the tool will gouge the adjacent wall or fail to reach into the radius, leaving excess material.",
    conditions: [{ type: "always" }],
    exceptions: ["Separate groove/form tool used specifically for small radii after primary turning"],
    source: "Sandvik Coromant — 'Insert Geometry Selection'",
  },
  {
    id: "TURN-007",
    category: "turning",
    severity: "tip",
    title: "Use wiper inserts for feed-rate doubling",
    rule: "Wiper-geometry inserts allow doubling the feed rate while maintaining the same surface finish (Ra). The extended wiper flat burnishes the surface after the primary cutting edge.",
    reasoning: "Standard inserts produce Ra proportional to f²/(8×r). Wiper inserts have a secondary radius that acts as a built-in finishing pass, effectively smoothing the feed marks left by the primary edge. This allows 2× feed at equivalent Ra.",
    conditions: [{ type: "always" }],
    exceptions: ["Very tight tolerance work where wiper's higher radial force causes deflection issues", "Interrupted cuts where the wiper edge is vulnerable to chipping"],
    source: "Sandvik Coromant — 'Wiper Insert Technology'",
  },
  {
    id: "TURN-008",
    category: "turning",
    severity: "important",
    title: "Bar pulling sequence: face, turn, groove, cutoff",
    rule: "For bar-fed lathe work, follow the sequence: face → turn OD → groove → cutoff. This order maintains maximum workpiece support throughout the operation.",
    reasoning: "Each operation progressively weakens the part's connection to the bar stock. Facing establishes the Z-datum while fully supported. OD turning happens with full cross-section. Grooving reduces cross-section locally. Cutoff is last because it severs the part entirely.",
    conditions: [{ type: "operation_type", operations: ["turning"] }],
    exceptions: ["Sub-spindle catch operations where cutoff happens before finishing the back side"],
    source: "Haas Automation — 'Bar Feeder Programming Guide'",
    related_rules: ["SEQ-001"],
  },
  {
    id: "TURN-009",
    category: "turning",
    severity: "recommended",
    title: "Use constant surface speed (G96) for facing",
    rule: "Use G96 (constant surface speed) mode for facing operations. As the tool moves toward center, the spindle speeds up to maintain optimal cutting speed (Vc).",
    reasoning: "During facing, the cutting diameter continuously decreases. At constant RPM (G97), the surface speed drops toward zero at center, causing rubbing and poor finish. G96 maintains the programmed Vc by increasing RPM as diameter decreases, ensuring consistent chip formation.",
    conditions: [{ type: "feature_present", features: ["face"] }],
    exceptions: ["Very small diameters where RPM would exceed machine maximum — use G96 with RPM clamp (G50 S-max)"],
    source: "Fanuc — 'Programming Manual: Constant Surface Speed'",
  },
  {
    id: "TURN-010",
    category: "turning",
    severity: "critical",
    title: "Clamp chuck pressure adequate for spindle speed",
    rule: "Verify that chuck clamping pressure is sufficient for the programmed spindle speed. Centrifugal force on the jaws reduces effective grip at high RPM, potentially ejecting the workpiece.",
    reasoning: "Chuck jaw centrifugal force acts radially outward, opposing clamping force. At high RPM, this force can exceed the hydraulic clamping force. The grip reduction follows F_centrifugal = m × ω² × r. A part secure at 500 RPM may fly out at 3000 RPM.",
    conditions: [{ type: "spindle_speed_above", rpm: 3000 }],
    exceptions: ["Collet chucks where centrifugal force has minimal effect due to low jaw mass"],
    source: "Kitagawa — 'Chuck Safety: Centrifugal Force Calculations'",
    related_rules: ["SAFE-001"],
  },

  // ── THREADING RULES ──────────────────────────────────────────────────────

  {
    id: "THR-001",
    category: "threading",
    severity: "critical",
    title: "Always chamfer before threading",
    rule: "Machine a chamfer at the thread start before cutting threads. Thread starts without chamfers cause cross-threading during assembly and leave sharp burrs.",
    reasoning: "A 45° chamfer at 1× thread pitch depth provides a lead-in for mating parts. Without it, the first thread crest is a sharp, incomplete form that damages mating threads. The chamfer also prevents the tap/die from walking off-center at entry.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["Internal threads in blind holes where chamfer would reduce usable thread depth"],
    source: "OSG — 'Threading Application Guide'",
    related_rules: ["SEQ-009"],
  },
  {
    id: "THR-002",
    category: "threading",
    severity: "important",
    title: "Use modified flank infeed for external threads",
    rule: "Use 29.5° modified flank infeed for single-point threading. This reduces cutting force by ~40% compared to radial (straight-in) infeed.",
    reasoning: "Radial infeed engages both flanks of the thread form simultaneously, creating a V-shaped chip that's difficult to evacuate. Modified flank infeed at 29.5° (half the 60° thread angle minus 0.5°) cuts primarily on one flank, producing a manageable chip shape with lower force.",
    conditions: [{ type: "always" }],
    exceptions: ["Acme and buttress threads where the infeed angle must match the thread form", "Very fine threads (>40 TPI) where radial infeed is acceptable due to shallow depth"],
    source: "Sandvik Coromant — 'Threading: Infeed Methods'",
  },
  {
    id: "THR-003",
    category: "threading",
    severity: "important",
    title: "Decrease DOC per pass progressively",
    rule: "Use decreasing depth of cut per pass in threading — not constant DOC. Maintain constant cross-sectional chip area by reducing DOC as the tool goes deeper into the thread form.",
    reasoning: "As the tool cuts deeper into the V-form, the engagement width increases. Constant DOC means increasing chip area per pass, overloading the tool on deep passes. Constant-area programming (DOC proportional to 1/√pass_number) maintains uniform load throughout.",
    conditions: [{ type: "always" }],
    exceptions: ["Very shallow threads (1-2 passes total) where progressive reduction is unnecessary"],
    source: "Kennametal — 'Single-Point Threading Guide'",
  },
  {
    id: "THR-004",
    category: "threading",
    severity: "recommended",
    title: "Spring passes for thread pitch accuracy",
    rule: "Add 2-3 spring passes (zero-DOC) at the end of the threading cycle. These passes clean up elastic deflection and improve thread pitch diameter accuracy.",
    reasoning: "During threading, the tool and workpiece deflect elastically under cutting force. When the tool reaches the programmed depth, the actual cut is shallower due to this deflection. Spring passes with zero additional infeed allow the system to 'catch up' to the programmed dimension.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Thread milling where each pass is independent and deflection is compensated differently"],
    source: "Machinist Handbook — 'Thread Cutting on Lathes'",
    related_rules: ["THR-003"],
  },
  {
    id: "THR-005",
    category: "threading",
    severity: "critical",
    title: "Verify thread pitch matches spindle encoder",
    rule: "Verify that the programmed thread pitch exactly matches the spindle encoder resolution and gear ratios. Mismatch causes helical damage, especially on multi-start threads.",
    reasoning: "Single-point threading synchronizes tool feed to spindle rotation via the encoder. If the pitch calculation introduces rounding errors (especially with metric pitch on imperial machines or vice versa), each pass tracks a slightly different helix, destroying the thread form over multiple passes.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Fanuc — 'Threading Synchronization Technical Manual'",
  },
  {
    id: "THR-006",
    category: "threading",
    severity: "tip",
    title: "Thread mill for blind holes, single-point for through",
    rule: "Use thread milling for blind holes where full-depth threads are needed. Use single-point threading (tap or lathe) for through-holes where chip evacuation is easier.",
    reasoning: "Thread milling enters from one end and interpolates the full thread depth in a single helical pass. No chip packing risk at the bottom of blind holes. Single-point tapping in blind holes risks tap breakage from chip packing. Thread mills also allow easy size adjustment via programming.",
    conditions: [{ type: "feature_present", features: ["thread", "hole"] }],
    exceptions: ["High-volume production where rigid tapping is faster and more economical"],
    source: "Emuge — 'Thread Milling vs Tapping Guide'",
    related_rules: ["SEQ-008"],
  },

  // ── EDM RULES ────────────────────────────────────────────────────────────

  {
    id: "EDM-001",
    category: "edm",
    severity: "critical",
    title: "Maintain dielectric fluid level above workpiece",
    rule: "The dielectric fluid must completely submerge the workpiece and electrode during EDM operations. Exposed arcing causes electrode damage, workpiece pitting, and fire risk.",
    reasoning: "Dielectric fluid serves three functions: insulates until breakdown voltage, quenches the plasma channel to control crater size, and flushes debris from the gap. Without submersion, uncontrolled arcing occurs with no quenching, causing large irregular craters, electrode erosion, and potential fire from vaporized hydrocarbon dielectric.",
    conditions: [{ type: "operation_type", operations: ["edm"] }],
    exceptions: [],
    source: "Sodick — 'EDM Fundamentals Manual'",
  },
  {
    id: "EDM-002",
    category: "edm",
    severity: "important",
    title: "Reduce power for thin sections",
    rule: "Reduce EDM power settings when machining thin walls or delicate sections (<2mm). High power density creates a deep recast layer and heat-affected zone that can crack thin sections.",
    reasoning: "EDM recast layer depth is proportional to discharge energy. On thin sections, the HAZ from both sides can overlap, fully transforming the material microstructure. The recast layer is hard, brittle, and under tensile stress — making thin walls prone to cracking.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 2 }],
    exceptions: ["When recast layer will be removed by subsequent finishing operations"],
    source: "Makino — 'EDM Application Guide: Thin Ribs'",
    related_rules: ["EDM-004"],
  },
  {
    id: "EDM-003",
    category: "edm",
    severity: "important",
    title: "Use orbiting for better flushing in deep cavities",
    rule: "Enable electrode orbiting for deep cavity sinker EDM (depth/width > 3). Static electrode positioning traps debris in the gap, causing arcing and poor surface quality.",
    reasoning: "Orbiting creates a pumping action that circulates dielectric through the gap. The electrode moves in a planetary path, alternately opening and closing the side gaps to create flow. Without orbiting, carbon debris accumulates and causes secondary discharges (arcing), producing pits.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3 }],
    exceptions: ["Micro-EDM where orbiting amplitude exceeds feature tolerance"],
    source: "AgieCharmilles — 'Sinker EDM Process Optimization'",
  },
  {
    id: "EDM-004",
    category: "edm",
    severity: "recommended",
    title: "Multiple electrodes: rough and finish",
    rule: "Use separate roughing and finishing electrodes. Rough electrode removes bulk material at high power, finish electrode achieves surface quality at low power with minimal electrode wear.",
    reasoning: "High-power roughing erodes the electrode significantly. A worn rough electrode cannot produce accurate finish geometry. Dedicated finish electrodes are manufactured to tighter tolerances and used at low power where electrode wear ratio is <1%.",
    conditions: [{ type: "surface_finish_below", ra_um: 0.8 }],
    exceptions: ["Simple through-features where electrode wear doesn't affect geometry"],
    source: "Makino — 'Electrode Strategy for Precision EDM'",
    related_rules: ["EDM-002"],
  },
  {
    id: "EDM-005",
    category: "edm",
    severity: "critical",
    title: "Wire EDM: maintain proper wire tension",
    rule: "Maintain proper wire tension during wire EDM operations. Slack wire causes inaccurate cuts, wire breakage, and potential collision with the workpiece.",
    reasoning: "Wire EDM uses 0.1-0.3mm brass or coated wire under tension as the cutting electrode. Insufficient tension allows the wire to bow from discharge forces and flushing pressure, producing barrel-shaped cuts. Excessive tension causes wire breakage, especially on corners and tapers.",
    conditions: [{ type: "operation_type", operations: ["edm"] }],
    exceptions: [],
    source: "Mitsubishi Electric — 'Wire EDM Operation Manual'",
  },
  {
    id: "EDM-006",
    category: "edm",
    severity: "tip",
    title: "Copper electrodes for steel, graphite for high-speed EDM",
    rule: "Use copper electrodes for precision EDM on steel (lower wear ratio). Use graphite electrodes for high-speed roughing EDM (higher MRR, easier to machine).",
    reasoning: "Copper has a lower electrode wear ratio (~1:1 to 3:1 work-to-electrode) on steel due to its high thermal conductivity and melting point. Graphite doesn't melt (it sublimates at 3600°C) allowing higher currents for faster roughing, but wears faster on finish settings.",
    conditions: [{ type: "always" }],
    exceptions: ["Copper-tungsten electrodes for extreme precision or micro-EDM", "Tungsten carbide workpieces where graphite is always preferred"],
    source: "Poco Graphite — 'Electrode Material Selection Guide'",
  },

  // ── QUALITY INSPECTION RULES ─────────────────────────────────────────────

  {
    id: "QI-001",
    category: "quality_inspection",
    severity: "critical",
    title: "Measure after thermal stabilization",
    rule: "Allow parts to thermally stabilize to ambient temperature (20°C ±1°C) before precision measurement. Steel expands ~12 µm/m/°C. Wait minimum 20 minutes per °C above ambient.",
    reasoning: "A 200mm steel part at 30°C (10°C above 20°C reference) is 24 µm longer than at reference temperature. This exceeds many tolerance bands. CMM compensation algorithms assume 20°C reference. Parts fresh from machining may be 40-60°C, causing 50-100 µm errors on typical parts.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: ["When using calibrated thermal compensation probes", "Shop-floor gaging with known temperature correction factors"],
    source: "ISO 1 — 'Standard Reference Temperature for Measurement'",
  },
  {
    id: "QI-002",
    category: "quality_inspection",
    severity: "important",
    title: "Use Cpk >= 1.33 as minimum process capability",
    rule: "Maintain Cpk ≥ 1.33 as the minimum acceptable process capability index. Cpk < 1.33 means >63 ppm defect rate — insufficient for most production requirements.",
    reasoning: "Cpk measures how well the process fits within spec limits, accounting for centering. Cpk = 1.0 means 2700 ppm defects (3σ). Cpk = 1.33 means 63 ppm (4σ). Automotive typically requires Cpk ≥ 1.67, aerospace ≥ 2.0. Below 1.33, the process is not reliably producing conforming parts.",
    conditions: [{ type: "batch_size_above", count: 50 }],
    exceptions: ["Prototype/short-run production where statistical process control isn't practical", "Non-critical dimensions where Cpk ≥ 1.0 is acceptable"],
    source: "AIAG — 'Statistical Process Control (SPC) Reference Manual'",
  },
  {
    id: "QI-003",
    category: "quality_inspection",
    severity: "important",
    title: "First article inspection on ALL critical dimensions",
    rule: "Perform first article inspection (FAI) measuring ALL critical dimensions on the first production part before running the batch. Verify process before committing material.",
    reasoning: "FAI catches setup errors, programming mistakes, tool wear issues, and fixture problems before they affect an entire batch. The cost of scrapping one part is trivial compared to scrapping 100. AS9102 requires full dimensional reporting on first articles for aerospace.",
    conditions: [{ type: "always" }],
    exceptions: ["Repeat production runs with proven, unchanged setups and SPC monitoring"],
    source: "AS9102 — 'First Article Inspection Requirement'",
    related_rules: ["QI-002"],
  },
  {
    id: "QI-004",
    category: "quality_inspection",
    severity: "recommended",
    title: "SPC sampling: minimum 5 consecutive parts for X-bar/R",
    rule: "For SPC X-bar/R charts, use subgroup size of 5 consecutive parts minimum. Subgroups smaller than 5 reduce sensitivity to mean shifts and increase false alarm rates.",
    reasoning: "The X-bar chart detects shifts in process mean. With n=5, a 1.5σ shift is detected with ~70% probability on the first sample after the shift. With n=3, sensitivity drops to ~50%. Rational subgroups of consecutive parts capture short-term variation within each subgroup.",
    conditions: [{ type: "batch_size_above", count: 100 }],
    exceptions: ["Destructive testing where sample size is limited by cost", "Very slow processes (e.g., grinding large parts) where n=3 is practical"],
    source: "Montgomery — 'Introduction to Statistical Quality Control'",
    related_rules: ["QI-002"],
  },
  {
    id: "QI-005",
    category: "quality_inspection",
    severity: "tip",
    title: "CMM probe qualification before each measurement session",
    rule: "Qualify (calibrate) the CMM probe system at the start of each measurement session. Probe tip offset drift from thermal changes and accidental contact causes systematic measurement errors.",
    reasoning: "CMM probes trigger at a specific deflection, but the exact trigger point varies with approach angle, speed, and probe geometry. Qualification measures a known reference sphere to determine the effective probe tip center and radius. Without re-qualification, thermal drift of the CMM structure causes progressive offset errors.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Temperature-controlled metrology labs with proven stability over the measurement period"],
    source: "Renishaw — 'CMM Probe Qualification Guide'",
  },
  {
    id: "QI-006",
    category: "quality_inspection",
    severity: "important",
    title: "GD&T datum precedence matches fixturing order",
    rule: "The GD&T datum reference frame (A|B|C) must match the fixturing order during manufacturing and inspection. Datum A is the primary seating plane, B the secondary alignment, C the tertiary stop.",
    reasoning: "GD&T datums define how the part is constrained in 3D space (3-2-1 principle). If the fixture doesn't constrain the part in the same order as the datum reference frame, measured feature positions will differ from design intent. Mismatched datums are the #1 cause of 'good parts that fail inspection.'",
    conditions: [{ type: "always" }],
    exceptions: ["Simultaneous datum features (e.g., A-B as a common datum axis)"],
    source: "ASME Y14.5 — 'Dimensioning and Tolerancing'",
    related_rules: ["DAT-001"],
  },
  {
    id: "QI-007",
    category: "quality_inspection",
    severity: "recommended",
    title: "Gage R&R study before production for tight tolerances",
    rule: "Perform a Gage R&R study before starting production on features with tight tolerances. The measurement system must contribute <10% of the total tolerance (P/T ratio < 10%).",
    reasoning: "If the measurement system variation is large relative to the tolerance, you cannot distinguish good parts from bad. A gage that consumes 30% of the tolerance band will reject good parts and accept bad ones randomly. AIAG guidelines: <10% excellent, 10-30% marginal, >30% unacceptable.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["CMM measurement of features with tolerances > 0.1mm where gage capability is assumed"],
    source: "AIAG — 'Measurement Systems Analysis (MSA) Reference Manual'",
    related_rules: ["QI-005"],
  },
  {
    id: "QI-008",
    category: "quality_inspection",
    severity: "critical",
    title: "Never adjust process based on single out-of-spec part",
    rule: "Never adjust the machining process based on a single out-of-tolerance measurement. Investigate root cause first — the single point may be a measurement error, not a process shift.",
    reasoning: "Reacting to individual data points (over-adjustment) is called 'tampering' in SPC theory. It actually increases process variation. A single outlier could be a measurement error, chip under the part, or random cause. Wait for a pattern (trend, run, or out-of-control signal) before adjusting.",
    conditions: [{ type: "batch_size_above", count: 20 }],
    exceptions: ["Critical safety dimensions where any out-of-spec requires immediate investigation", "Trends visible on SPC charts that indicate assignable cause"],
    source: "Deming — 'Out of the Crisis: Tampering'",
    related_rules: ["QI-002"],
  },

  // ── COOLANT STRATEGY RULES ───────────────────────────────────────────────

  {
    id: "COOL-001",
    category: "coolant_strategy",
    severity: "critical",
    title: "Through-spindle coolant for deep holes",
    rule: "Use through-spindle coolant (TSC) for drilling deeper than 3×D. External flood coolant cannot penetrate the cutting zone beyond 3× the drill diameter.",
    reasoning: "As hole depth increases, the annular gap between the drill flutes and hole wall creates a hydraulic barrier. External coolant is blocked by chip flow and the drill body. TSC delivers coolant directly to the cutting lips at 40-70 bar, flushing chips upward through the flutes.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3 }],
    exceptions: ["Peck drilling with full retract where external flood re-enters the hole each peck"],
    source: "Sandvik Coromant — 'Drilling: Coolant Application'",
    related_rules: ["DH-001", "DH-004"],
  },
  {
    id: "COOL-002",
    category: "coolant_strategy",
    severity: "important",
    title: "MQL for aluminum to prevent built-up edge",
    rule: "Use Minimum Quantity Lubrication (MQL) when machining aluminum alloys. MQL prevents built-up edge (BUE) more effectively than flood coolant while improving chip evacuation.",
    reasoning: "Aluminum is gummy and adheres to cutting edges (BUE). MQL delivers a fine oil mist that lubricates the tool-chip interface, preventing adhesion. Flood coolant can actually trap chips against the tool in aluminum, promoting BUE. MQL also eliminates coolant disposal costs for aluminum.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["Deep pocket milling in aluminum where chip evacuation needs flood assistance", "High-MRR roughing where MQL cooling capacity is insufficient"],
    source: "Bielomatik — 'MQL Application Guide for Aluminum'",
  },
  {
    id: "COOL-003",
    category: "coolant_strategy",
    severity: "important",
    title: "Dry machining for cast iron roughing",
    rule: "Machine cast iron dry (no coolant) during roughing operations. Coolant on cast iron causes thermal shock cracking of carbide tools, and cast iron chips are naturally dry and manageable.",
    reasoning: "Cast iron produces short, discontinuous chips that don't need coolant for evacuation. The graphite in cast iron acts as a natural lubricant. Coolant causes rapid heating/cooling cycles on carbide inserts during interrupted cutting, creating thermal (comb) cracks that lead to edge failure.",
    conditions: [{ type: "material_iso", groups: ["K"] }],
    exceptions: ["Ductile iron grades that produce long chips needing coolant for chip breaking", "Precision boring where coolant is needed for thermal size control"],
    source: "Sandvik Coromant — 'Cast Iron Machining Guide'",
    related_rules: ["ANTI-004"],
  },
  {
    id: "COOL-004",
    category: "coolant_strategy",
    severity: "recommended",
    title: "High-pressure coolant (70+ bar) for chip breaking in titanium",
    rule: "Use high-pressure coolant (minimum 70 bar) when machining titanium and nickel alloys. HP coolant breaks the continuous stringy chips these alloys produce, preventing bird-nesting around the tool.",
    reasoning: "Ti-6Al-4V and Inconel produce long, continuous chips due to their high ductility and low thermal conductivity. These chips wrap around the tool and workpiece, causing re-cutting and surface damage. HP coolant acts as a hydraulic chip breaker, fragmenting chips into manageable segments.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["Finishing with small DOC where chips are thin enough to break naturally"],
    source: "Seco Tools — 'Jetstream Tooling: High-Pressure Coolant'",
  },
  {
    id: "COOL-005",
    category: "coolant_strategy",
    severity: "critical",
    title: "No coolant on CBN/PCD tools in interrupted cuts",
    rule: "Never use flood coolant with CBN or PCD tools during interrupted cutting (milling, slotting). Thermal cycling from intermittent coolant contact causes micro-fracture of superhard tool materials.",
    reasoning: "CBN and PCD have very low thermal expansion but poor thermal shock resistance. During interrupted cuts, the edge alternates between hot (cutting) and cold (coolant exposure). This creates tensile stresses in the surface layer that propagate as micro-cracks, leading to rapid edge failure.",
    conditions: [{ type: "always" }],
    exceptions: ["Continuous turning with CBN where coolant contact is constant (no thermal cycling)", "PCD tools on aluminum where cutting temperatures are low"],
    source: "Element Six — 'Superhard Materials Application Guide'",
    related_rules: ["ANTI-004"],
  },
  {
    id: "COOL-006",
    category: "coolant_strategy",
    severity: "tip",
    title: "Coolant concentration 6-8% for general machining",
    rule: "Maintain metalworking fluid concentration between 6-8% for general machining operations. Below 5% promotes corrosion and biological growth. Above 10% causes skin irritation, foaming, and residue.",
    reasoning: "Coolant concentration is a balance of lubricity, cooling, corrosion protection, and biological stability. At <5%, water dominates and bacteria proliferate (Monday morning smell). At >10%, excess additives cause dermatitis, excessive foaming in high-pressure systems, and sticky residues on parts.",
    conditions: [{ type: "always" }],
    exceptions: ["Grinding operations that may require 3-5% for maximum cooling", "Heavy-duty tapping that benefits from 10-12% for lubricity"],
    source: "Master Fluid Solutions — 'Metalworking Fluid Management'",
  },
  {
    id: "COOL-007",
    category: "coolant_strategy",
    severity: "important",
    title: "Air blast for finishing passes on hardened steel",
    rule: "Use air blast (not flood coolant) for finishing passes on hardened steel with ceramic or CBN inserts. Coolant thermal shock on these tool materials reduces life dramatically.",
    reasoning: "Ceramic and CBN inserts operate best at high temperatures (800-1200°C for ceramics). Coolant quenches the cutting zone, causing thermal gradients that crack the brittle tool material. Air blast clears chips without thermal shock while allowing the tool to operate at its optimal temperature.",
    conditions: [{ type: "hardness_above", hrc: 45 }],
    exceptions: ["When thermal growth of the workpiece must be controlled for tight tolerances"],
    source: "Kennametal — 'Hard Part Machining Application Guide'",
    related_rules: ["HT-001", "HT-002"],
  },
  {
    id: "COOL-008",
    category: "coolant_strategy",
    severity: "recommended",
    title: "Cryogenic CO2 for titanium finishing",
    rule: "Consider cryogenic CO2 coolant for titanium finishing operations. Cryogenic cooling provides 40% longer tool life compared to flood coolant on Ti-6Al-4V.",
    reasoning: "Cryogenic CO2 at -78°C provides intense local cooling without the hydraulic force of flood coolant. It supercools the chip (making it brittle and easier to break) while keeping the workpiece thermally stable. No coolant disposal costs and environmentally clean.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["When cryogenic delivery equipment is not available", "Deep pocket machining where CO2 cannot reach the cutting zone"],
    source: "5ME — 'Cryogenic Machining Technology'",
    related_rules: ["COOL-004"],
  },

  // ── ADAPTIVE MACHINING RULES ─────────────────────────────────────────────

  {
    id: "ADAPT-001",
    category: "adaptive",
    severity: "important",
    title: "Enable adaptive feed control only after stable baseline cut",
    rule: "Before enabling adaptive feed control, run at least one pass at conservative parameters to establish a baseline load reference. The controller needs a known-good reference to modulate from.",
    reasoning: "Adaptive feed systems adjust feed rate based on spindle load or cutting force relative to a target. Without a stable baseline, the system has no reference and may over- or under-compensate. The initial pass establishes the relationship between feed, engagement, and load for the specific tool/material/setup.",
    conditions: [{ type: "always" }],
    exceptions: ["Systems with material-specific databases that provide pre-calibrated baselines"],
    source: "Siemens — 'Adaptive Control Fundamentals'",
  },
  {
    id: "ADAPT-002",
    category: "adaptive",
    severity: "important",
    title: "Set load threshold at 70% of tool capacity",
    rule: "Set the adaptive control load threshold at 70% of the tool's maximum rated capacity. Too low (below 50%) causes excessive feed reductions. Too high (above 85%) risks tool breakage on load spikes.",
    reasoning: "Cutting load fluctuates due to material hardness variation, engagement changes, and chip re-cutting. The 70% target provides 30% headroom for transient spikes while keeping the tool productively loaded. At 50%, the tool is underutilized. At 90%, any spike exceeds the tool's capacity.",
    conditions: [{ type: "always" }],
    exceptions: ["Fragile tools (micro endmills, long-reach tools) where 50% threshold is safer"],
    source: "Heidenhain — 'Adaptive Feed Control (AFC) Setup Guide'",
  },
  {
    id: "ADAPT-003",
    category: "adaptive",
    severity: "recommended",
    title: "Use spindle load monitoring for roughing, vibration for finishing",
    rule: "Monitor spindle power/current for roughing adaptive control. Use vibration (accelerometer) monitoring for finishing. Different signals are optimal for different machining phases.",
    reasoning: "Spindle load is proportional to cutting force and responds to engagement changes — ideal for roughing where force management is the goal. Vibration monitoring detects chatter onset at much lower amplitudes than spindle load can resolve — critical for finishing where surface quality depends on vibration-free cutting.",
    conditions: [{ type: "always" }],
    exceptions: ["Integrated systems that fuse both signals for comprehensive monitoring"],
    source: "Montronix — 'Process Monitoring Application Guide'",
  },
  {
    id: "ADAPT-004",
    category: "adaptive",
    severity: "critical",
    title: "Disable adaptive during threading and tapping",
    rule: "NEVER use adaptive feed control during threading or tapping operations. Thread pitch requires exact synchronization between spindle speed and feed rate — any adaptive feed adjustment destroys the thread.",
    reasoning: "Threading requires feed = pitch × RPM with zero deviation. Adaptive feed control modulates feed rate based on load, which would change the effective pitch. Even a 1% feed variation creates a drunken thread helix that fails thread gaging.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: [],
    source: "Fanuc — 'Adaptive Control: Operation Restrictions'",
    related_rules: ["THR-005"],
  },
  {
    id: "ADAPT-005",
    category: "adaptive",
    severity: "tip",
    title: "Bayesian tool wear prediction: update priors every 10 parts",
    rule: "When using Bayesian/Kalman filter tool wear prediction, re-calibrate the model priors every 10 parts. Without re-calibration, the filter drifts from the actual wear state.",
    reasoning: "Tool wear is a non-stationary process — wear rate accelerates in the final phase (tertiary wear). Kalman filter priors assume a process model that degrades over time. Re-calibrating with actual measurements every 10 parts resets the prediction accuracy and prevents premature or late tool changes.",
    conditions: [{ type: "batch_size_above", count: 50 }],
    exceptions: ["Single-part or prototype work where statistical prediction is unnecessary"],
    source: "Shop experience — 'In-process tool monitoring correlation studies'",
  },
  {
    id: "ADAPT-006",
    category: "adaptive",
    severity: "recommended",
    title: "SSV (spindle speed variation) for chatter suppression",
    rule: "Use Spindle Speed Variation (SSV) with ±5% sinusoidal RPM variation to suppress regenerative chatter. The varying tooth passage frequency disrupts the self-exciting vibration loop.",
    reasoning: "Regenerative chatter occurs when successive tooth passes reinforce surface waviness at the natural frequency. SSV continuously changes the tooth passage frequency, preventing the resonance from building up. The ±5% variation is enough to disrupt chatter without affecting surface finish significantly.",
    conditions: [{ type: "always" }],
    exceptions: ["Threading and tapping where RPM must be constant for pitch accuracy", "Very high surface finish requirements where SSV marks may be visible"],
    source: "Okuma — 'Machining Navi: Chatter Avoidance Technology'",
    related_rules: ["ADAPT-004"],
  },

  // ── DEEP HOLE DRILLING RULES ─────────────────────────────────────────────

  {
    id: "DH-001",
    category: "deep_hole",
    severity: "critical",
    title: "Peck drilling mandatory above 5xD",
    rule: "Use peck drilling (G83) for any hole deeper than 5× the drill diameter. Full-depth drilling without pecking causes chip packing, drill breakage, and poor hole quality.",
    reasoning: "Beyond 5×D, chips cannot evacuate from the flutes by centrifugal and coolant action alone. They pack in the flutes, increasing torque and thrust exponentially. The drill binds, overheats, and either breaks or produces an oversized, rough hole. Pecking retracts to clear chips.",
    conditions: [{ type: "aspect_ratio_above", ratio: 5 }],
    exceptions: ["Through-coolant drills specifically rated for deep drilling without pecking (some rated to 12×D)", "Gun drills designed for continuous deep-hole drilling"],
    source: "OSG — 'Deep Hole Drilling Application Guide'",
    related_rules: ["DH-002", "COOL-001"],
  },
  {
    id: "DH-002",
    category: "deep_hole",
    severity: "important",
    title: "Reduce peck depth progressively",
    rule: "Start pecking at 1×D depth for the first peck, then reduce peck depth by ~30% for each subsequent peck. Deeper pecks encounter worse chip evacuation conditions.",
    reasoning: "As the drill goes deeper, chips must travel further up the flutes to exit. Each additional diameter of depth significantly increases the friction and packing tendency. Progressive reduction of peck depth compensates for the decreasing evacuation efficiency at greater depths.",
    conditions: [{ type: "aspect_ratio_above", ratio: 8 }],
    exceptions: ["CNC cycles with chip-break pecking (G73) where shallow pecks break chips without full retract"],
    source: "Kennametal — 'Drilling: Peck Cycle Optimization'",
    related_rules: ["DH-001"],
  },
  {
    id: "DH-003",
    category: "deep_hole",
    severity: "important",
    title: "Pilot hole first for gun drilling",
    rule: "Always drill a pilot hole (2-3×D deep) with a stub drill before gun drilling. The pilot hole provides a concentric start for the gun drill, ensuring hole straightness.",
    reasoning: "Gun drills have a single-lip cutting geometry that tends to walk on entry. A pilot hole created by a rigid, short stub drill provides a precision-aligned bore that guides the gun drill during its initial engagement. Without a pilot, the hole can drift up to 0.5mm per 100mm.",
    conditions: [{ type: "aspect_ratio_above", ratio: 10 }],
    exceptions: ["Self-piloting gun drills with guide pads rated for direct entry", "Counter-rotating workpiece setups where the drill is naturally centered"],
    source: "Botek — 'Gun Drilling Fundamentals'",
    related_rules: ["DH-001"],
  },
  {
    id: "DH-004",
    category: "deep_hole",
    severity: "critical",
    title: "Through-tool coolant required above 8xD",
    rule: "Through-tool (internal) coolant delivery is mandatory for holes deeper than 8×D. External coolant cannot reach the cutting zone at these depths regardless of pressure.",
    reasoning: "At 8×D, the hydraulic resistance of the annular gap between drill and hole wall prevents external coolant from reaching the drill tip. The cutting zone runs dry, causing rapid temperature rise, built-up edge, drill margin galling, and eventual seizure. Internal coolant at 40-70 bar flushes directly to the cutting lips.",
    conditions: [{ type: "aspect_ratio_above", ratio: 8 }],
    exceptions: ["Peck drilling with full retract to surface, allowing re-flood between pecks (but very slow)"],
    source: "Sandvik Coromant — 'Deep Hole Drilling: Coolant Requirements'",
    related_rules: ["COOL-001"],
  },
  {
    id: "DH-005",
    category: "deep_hole",
    severity: "recommended",
    title: "Reduce feed 20% for last 2xD of blind hole",
    rule: "Reduce feed rate by 20% for the final 2×D of depth in blind holes. Chip evacuation is worst at the hole bottom, and reduced feed prevents chip packing against the drill point.",
    reasoning: "At the bottom of a blind hole, chips have nowhere to go except back up the flutes. The confined space and accumulated chip volume create maximum packing force. Reducing feed produces thinner chips that pack less tightly and are easier to flush with coolant.",
    conditions: [{ type: "always" }],
    exceptions: ["Through-holes where chips exit from both ends", "Through-coolant drills with sufficient flushing capacity at full feed"],
    source: "Guhring — 'Blind Hole Drilling Best Practices'",
    related_rules: ["DH-001"],
  },
  {
    id: "DH-006",
    category: "deep_hole",
    severity: "tip",
    title: "Use parabolic flute drills for deep holes in aluminum",
    rule: "Select parabolic flute geometry drills for deep-hole drilling in aluminum and other gummy materials. The wider flute volume improves chip evacuation for long, stringy chips.",
    reasoning: "Aluminum produces continuous spiral chips that are prone to packing. Standard drill flutes fill with these long chips quickly. Parabolic flutes have 30-40% more chip space with a polished flute surface that reduces friction, allowing chips to flow upward more easily.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["Short holes (<3×D) where standard flutes provide adequate chip clearance"],
    source: "OSG — 'Drill Selection Guide: Aluminum Applications'",
    related_rules: ["COOL-002"],
  },

  // ── SURFACE TREATMENT RULES ──────────────────────────────────────────────

  {
    id: "ST-001",
    category: "surface_treatment",
    severity: "critical",
    title: "Leave stock allowance for hard chrome plating",
    rule: "When parts receive hard chrome plating, machine all plated surfaces 0.025-0.075mm undersized per side to account for plating thickness buildup.",
    reasoning: "Hard chrome plating deposits 0.025-0.075mm per side (typical). If the part is machined to final dimension, plating makes it oversize. The plating thickness is specified by the coating requirement — consult the plating spec to determine exact allowance needed.",
    conditions: [{ type: "always" }],
    exceptions: ["Flash chrome plating (<0.005mm) where allowance is negligible", "Surfaces that will be post-plate ground to final dimension"],
    source: "MIL-STD-1501 — 'Chrome Plating: Low Embrittlement'",
    related_rules: ["ST-002"],
  },
  {
    id: "ST-002",
    category: "surface_treatment",
    severity: "important",
    title: "Add grinding stock for heat treat distortion",
    rule: "Add 0.05-0.10mm grinding stock per side on precision surfaces that will be heat treated. Carburizing and through-hardening cause 0.02-0.08mm dimensional change from phase transformation and residual stress.",
    reasoning: "Martensite transformation during hardening causes ~1% volume expansion. Uneven cooling creates residual stress that warps the part. The grinding allowance provides enough material to correct distortion while reaching final dimensions. Deeper case depths cause more distortion.",
    conditions: [{ type: "always" }],
    exceptions: ["Stress-relieved parts with proven minimal distortion (<0.01mm)", "Induction-hardened local areas where bulk distortion is minimal"],
    source: "ASM International — 'Heat Treating: Distortion Control'",
    related_rules: ["ST-001"],
  },
  {
    id: "ST-003",
    category: "surface_treatment",
    severity: "important",
    title: "Anodize allowance: add 50% of anodize thickness",
    rule: "For Type III hard anodize on aluminum, add 50% of the specified anodize thickness to external dimensions and subtract 50% from internal dimensions. Anodize grows ~50% inward and ~50% outward from the original surface.",
    reasoning: "Hard anodize converts the aluminum surface to aluminum oxide (Al₂O₃). The oxide layer grows both into and out from the original surface. A 0.050mm hard anodize spec means ~0.025mm grows outward (increasing dimensions) and ~0.025mm grows inward (decreasing bore sizes).",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["Type I chromic anodize where the very thin layer (<0.005mm) makes allowance negligible", "Sulphuric anodize (Type II) at 0.018-0.025mm where allowance is minimal"],
    source: "MIL-A-8625 — 'Anodic Coatings for Aluminum'",
  },
  {
    id: "ST-004",
    category: "surface_treatment",
    severity: "recommended",
    title: "Machine stress-relief features before heat treatment",
    rule: "Machine stress-relief features (radii at section changes, undercuts at shoulders, relief grooves) before heat treatment. These features reduce quench cracking risk at stress concentrators.",
    reasoning: "During quenching, thermal gradients create internal stresses that concentrate at sharp corners and section changes. A sharp internal corner acts as a crack initiator. Generous radii (minimum 1mm, preferably 2-3mm) distribute stress and prevent quench cracks.",
    conditions: [{ type: "always" }],
    exceptions: ["Parts that will be nitrided (lower thermal stress than quench hardening)", "Through-hardened parts where stress relief is provided by tempering"],
    source: "ASM International — 'Heat Treating Design Guidelines'",
    related_rules: ["ST-002"],
  },
  {
    id: "ST-005",
    category: "surface_treatment",
    severity: "tip",
    title: "Shot peening after machining, before coating",
    rule: "Apply shot peening after final machining but before any coating or plating. Shot peening induces compressive residual stress that improves fatigue life 20-30% on cyclic-load parts.",
    reasoning: "Shot peening creates a compressive stress layer 0.1-0.3mm deep that opposes fatigue crack initiation (cracks require tensile stress to open). It must be done after machining (which creates tensile surface stress) and before coating (which could be damaged by peening impact).",
    conditions: [{ type: "always" }],
    exceptions: ["Precision surfaces where peening roughness is unacceptable (peening creates Ra 3-6 µm)", "Parts that will receive stress-relieving treatments after machining"],
    source: "SAE J2441 — 'Shot Peening: Specifications'",
  },
  {
    id: "ST-006",
    category: "surface_treatment",
    severity: "important",
    title: "Mask threaded holes before anodize/plate",
    rule: "Mask all threaded holes and precision bores before anodizing or plating. Coating deposited in threads changes the effective pitch diameter, causing assembly interference.",
    reasoning: "A 0.050mm hard anodize layer on thread flanks reduces the effective internal thread diameter by 0.100mm (both flanks). This can change a Class 2B fit to an interference fit. Masking with plugs, tape, or liquid maskant protects critical features from coating buildup.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["Threads that are specified to be coated for corrosion protection (size the tap accordingly)"],
    source: "Anoplate — 'Masking Guide for Anodize and Plating'",
    related_rules: ["THR-001"],
  },

  // ── POST PROCESSING RULES ───────────────────────────────────────────────

  {
    id: "PP-001",
    category: "post_processing",
    severity: "critical",
    title: "Verify G28/G30 safe position before tool change",
    rule: "Always verify that the G28/G30 intermediate and reference positions are clear of the workpiece, fixture, and any clamps before executing a tool change. Machine crash results from conflicts between safe position and workholding.",
    reasoning: "G28 moves through an intermediate point (set by G28.1) to the machine reference position. If the intermediate point or the travel path intersects the fixture, the machine crashes at rapid traverse speed. Each setup must verify the safe tool change path is clear.",
    conditions: [{ type: "always" }],
    exceptions: ["Machines with dedicated tool change positions that are mechanically verified"],
    source: "Fanuc — 'Programming Manual: Reference Position Return'",
    related_rules: ["SAFE-001"],
  },
  {
    id: "PP-002",
    category: "post_processing",
    severity: "important",
    title: "Use G43 tool length compensation, never hardcoded Z values",
    rule: "Always use G43 (tool length compensation) with the tool offset register. Never hardcode absolute Z values for tool positions — hardcoded values break when tools are replaced or re-measured.",
    reasoning: "Each tool has a different gauge length. G43 Hxx adds the tool length offset to the programmed Z, allowing the program to work with any tool length. Hardcoded Z values only work for the exact tool that was measured during programming — replacing a worn or broken tool requires reprogramming.",
    conditions: [{ type: "always" }],
    exceptions: ["Dedicated single-tool machines where the tool never changes"],
    source: "Haas Automation — 'Programming: Tool Length Compensation'",
  },
  {
    id: "PP-003",
    category: "post_processing",
    severity: "important",
    title: "Cancel cutter compensation (G40) before tool change",
    rule: "Cancel cutter radius compensation (G40) before any tool change or rapid positioning move. Active compensation during tool change causes unexpected motion as the controller tries to maintain the offset.",
    reasoning: "Cutter compensation (G41/G42) offsets the tool path by the cutter radius. The controller plans compensated moves one or two blocks ahead. If a tool change occurs while compensation is active, the controller may generate unexpected moves to maintain the offset geometry, causing crashes.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Fanuc — 'Programming Manual: Cutter Compensation'",
    related_rules: ["PP-001"],
  },
  {
    id: "PP-004",
    category: "post_processing",
    severity: "recommended",
    title: "Add block numbers every 10 lines for operator reference",
    rule: "Include N-number block labels every 10 lines in the G-code output. This helps operators find program locations for restart, troubleshooting, and verifying active lines during dry runs.",
    reasoning: "When a program stops mid-cycle (tool break, power failure), the operator needs to restart from a specific location. Sequential N-numbers every 10 lines provide landmarks. Most controls support search-by-N-number for quick program navigation.",
    conditions: [{ type: "always" }],
    exceptions: ["Very short programs (<50 lines) where block numbers add unnecessary clutter", "Controls with built-in line tracking that makes N-numbers redundant"],
    source: "Shop experience — 'G-code best practices for production'",
  },
  {
    id: "PP-005",
    category: "post_processing",
    severity: "critical",
    title: "M01 optional stop after each setup operation",
    rule: "Insert M01 (optional stop) after each setup operation, tool change, and critical machining step. This gives the operator the opportunity to verify datum alignment, check tool condition, and inspect features.",
    reasoning: "M01 stops execution only when the operator has activated the Optional Stop button — it doesn't interrupt automated production. During setup verification and first-article runs, the operator enables optional stop to check each operation. In production, it's disabled for uninterrupted cycling.",
    conditions: [{ type: "always" }],
    exceptions: ["Lights-out production where no operator is present", "High-volume production with proven programs where stops waste cycle time"],
    source: "Haas Automation — 'Programming: Program Control Codes'",
  },
  {
    id: "PP-006",
    category: "post_processing",
    severity: "tip",
    title: "Add cycle time comments per operation for production planning",
    rule: "Add comments in the G-code showing estimated cycle time for each operation. This helps production planners schedule work and identify bottleneck operations for optimization.",
    reasoning: "Cycle time visibility at the operation level enables data-driven scheduling. If a 10-operation program takes 45 minutes, knowing that operation 7 takes 15 minutes (33%) identifies the optimization target. Without per-operation timing, bottleneck identification requires manual time studies.",
    conditions: [{ type: "always" }],
    exceptions: ["Prototype programs that will be significantly modified before production"],
    source: "Shop experience — 'Production planning best practices'",
    related_rules: ["PP-004"],
  },

  // ── HARD TURNING RULES ───────────────────────────────────────────────────

  {
    id: "HT-001",
    category: "hard_turning",
    severity: "critical",
    title: "Minimum 45 HRC for hard turning viability",
    rule: "Hard turning is only viable for materials above 45 HRC. Below this hardness, the material is too ductile for CBN/ceramic inserts — they perform poorly and wear rapidly on soft material.",
    reasoning: "CBN and ceramic inserts rely on high cutting temperatures to soften a thin shear zone while the bulk material remains hard and provides support. Below 45 HRC, the material deforms plastically instead of shearing cleanly, causing built-up edge on CBN and excessive notch wear on ceramics.",
    conditions: [{ type: "hardness_above", hrc: 45 }],
    exceptions: ["Case-hardened parts where the hard case is being turned (core may be softer)"],
    source: "Sandvik Coromant — 'Hard Part Turning Guide'",
    related_rules: ["HT-002", "GRIND-007"],
  },
  {
    id: "HT-002",
    category: "hard_turning",
    severity: "important",
    title: "CBN inserts for interrupted cuts, ceramics for continuous",
    rule: "Use CBN inserts for interrupted cuts on hardened material (higher toughness survives impact). Use ceramic inserts for continuous cuts (higher hot hardness, lower cost). Note: this reverses a common misconception.",
    reasoning: "CBN has a fracture toughness of ~6 MPa√m vs ceramics at ~3 MPa√m, making CBN twice as resistant to impact. Ceramics have higher hot hardness and can run faster in continuous cuts but shatter on interrupted entry. The myth that 'CBN is for continuous, ceramic for interrupted' is backwards.",
    conditions: [{ type: "hardness_above", hrc: 50 }],
    exceptions: ["Whisker-reinforced ceramics (e.g., SiC whisker Al₂O₃) that have improved toughness for light interruptions"],
    source: "Kennametal — 'CBN and Ceramic Insert Application Guide'",
    related_rules: ["HT-001", "COOL-007"],
  },
  {
    id: "HT-003",
    category: "hard_turning",
    severity: "recommended",
    title: "DOC <= nose radius for hard turning finish",
    rule: "For finishing cuts on hardened material, keep depth of cut ≤ the insert nose radius. Exceeding the nose radius creates excessive cutting pressure that causes chatter and poor surface finish.",
    reasoning: "When DOC ≤ nose radius, the chip is formed entirely within the nose radius zone, producing predominantly radial force. When DOC exceeds the nose radius, the straight edge engages, adding axial force and increasing the lever arm that drives vibration.",
    conditions: [{ type: "hardness_above", hrc: 45 }],
    exceptions: ["Roughing passes where higher DOC is acceptable with reduced speed"],
    source: "Sandvik Coromant — 'Hard Part Turning: Depth of Cut Selection'",
    related_rules: ["HT-001"],
  },
  {
    id: "HT-004",
    category: "hard_turning",
    severity: "important",
    title: "Rigid setup essential: 3:1 max L/D without tailstock",
    rule: "Hard turning generates high radial forces due to the negative rake geometry and high material hardness. Maximum L/D without tailstock support is 3:1 (vs 4:1 for conventional turning).",
    reasoning: "Hard turning forces are 2-3× higher than soft turning at equivalent parameters due to the high shear strength of hardened material and negative rake inserts. The reduced L/D limit compensates for these higher forces to prevent deflection-induced taper and chatter.",
    conditions: [{ type: "aspect_ratio_above", ratio: 3 }],
    exceptions: ["Ultra-light finishing passes with DOC < 0.05mm where forces are minimal"],
    source: "Machinist Handbook — 'Hard Turning: Setup Requirements'",
    related_rules: ["TURN-001", "TURN-004"],
  },
  {
    id: "HT-005",
    category: "hard_turning",
    severity: "tip",
    title: "Hard turning can achieve Ra 0.2-0.4 um — comparable to grinding",
    rule: "Hard turning with CBN inserts can achieve Ra 0.2-0.4 µm surface finish, comparable to grinding. This eliminates the grinding operation for many finish applications, reducing cycle time and setup.",
    reasoning: "The combination of high cutting speed (150-250 m/min), low feed (0.05-0.15 mm/rev), and the polishing action of the CBN nose radius produces mirror-like finishes on hardened steel. The white layer (rehardened surface) is typically <5 µm, within acceptable limits for most applications.",
    conditions: [{ type: "hardness_above", hrc: 55 }],
    exceptions: ["Surfaces requiring Ra < 0.1 µm (still need grinding or superfinishing)", "Parts where white layer is unacceptable (bearing races, gears) — requires controlled parameters"],
    source: "Sumitomo — 'CBN Hard Turning vs Grinding: Cost Comparison'",
    related_rules: ["HT-001", "GRIND-005"],
  },

  // ── HSM (HIGH SPEED MACHINING) RULES ─────────────────────────────────────

  {
    id: "HSM-001",
    category: "hsm",
    severity: "critical",
    title: "Use balanced tool holders (G2.5 or better) above 15,000 RPM",
    rule: "All tool holders used above 15,000 RPM must be balanced to G2.5 or better per ISO 1940. Imbalanced holders cause spindle bearing damage, chatter, and reduced tool life.",
    reasoning: "Centrifugal force from imbalance increases with RPM². A holder with 1 g·mm imbalance at 15,000 RPM generates ~25 N of centrifugal force oscillating at 250 Hz. This force exceeds the cutting force on finishing passes, causing vibration marks. Sustained operation damages spindle bearings (costing $10,000-50,000+ to replace).",
    conditions: [{ type: "spindle_speed_above", rpm: 15000 }],
    exceptions: ["ER collet chucks at moderate RPM (10,000-15,000) where imbalance is inherently low"],
    source: "Haimer — 'Tool Holder Balancing: ISO 1940 Guidelines'",
    related_rules: ["GRIND-008"],
  },
  {
    id: "HSM-002",
    category: "hsm",
    severity: "important",
    title: "Radial engagement <= 10% of diameter for HSM",
    rule: "In high-speed machining, limit radial engagement (ae) to ≤10% of the tool diameter. Low ae/D ratio maintains constant chip load, prevents heat buildup, and allows higher feed rates.",
    reasoning: "At low radial engagement, each flute spends most of the revolution in the air gap, cooling between cuts. The thin chip dissipates heat into the chip (not the tool). This allows 3-5× higher surface speed than conventional milling. At high ae/D, heat accumulates in the tool, causing rapid wear.",
    conditions: [{ type: "spindle_speed_above", rpm: 12000 }],
    exceptions: ["Adaptive/trochoidal toolpaths that maintain constant engagement regardless of programmed ae"],
    source: "Makino — 'High Speed Machining: Engagement Strategy'",
    related_rules: ["HSM-003"],
  },
  {
    id: "HSM-003",
    category: "hsm",
    severity: "important",
    title: "Avoid full-width slotting in HSM",
    rule: "Never use full-width slotting (ae = 100%) in high-speed machining. Full engagement doubles cutting force and traps heat in the tool. Use trochoidal milling or slot with multiple passes instead.",
    reasoning: "Full slotting at 100% engagement means the tool is always cutting — no cooling time in the air gap. Heat builds rapidly, softening the cutting edge. Forces are also symmetric (180° engagement), eliminating the radial force direction that helps stabilize the cut. Trochoidal paths maintain low ae even in slot geometry.",
    conditions: [{ type: "spindle_speed_above", rpm: 10000 }],
    exceptions: ["Very shallow slots (<0.5mm) where heat generation is minimal"],
    source: "Seco Tools — 'High Speed Machining Handbook'",
    related_rules: ["HSM-002", "ANTI-005"],
  },
  {
    id: "HSM-004",
    category: "hsm",
    severity: "recommended",
    title: "Ramp/helix entry, never plunge in HSM",
    rule: "Always use ramping or helical entry when beginning a cut in HSM. Never plunge into material — the axial force at high speed exceeds the tool and spindle capacity.",
    reasoning: "At high RPM, even a small plunge depth generates extreme chip load per tooth because the feed is also very high (high RPM × chip load × flutes). A 0.5mm plunge at 20,000 RPM with 0.1mm/tooth on a 4-flute tool means 8,000mm/min downward — far exceeding the axial load rating.",
    conditions: [{ type: "spindle_speed_above", rpm: 10000 }],
    exceptions: ["Drill mills rated for HSM plunging", "Center-cutting endmills with specifically designed plunge geometry"],
    source: "Harvey Performance — 'High Speed Milling Entry Methods'",
    related_rules: ["ANTI-002"],
  },
  {
    id: "HSM-005",
    category: "hsm",
    severity: "critical",
    title: "Tool runout < 5 um for HSM finishing",
    rule: "Maintain total indicated runout (TIR) < 5 µm for HSM finishing operations. At high RPM, runout causes one flute to do all the cutting, halving tool life and ruining surface finish.",
    reasoning: "At 20,000 RPM with 10 µm runout, one flute cuts 10 µm deeper than its neighbor. This flute takes the entire chip load while the other flute barely touches the surface. The overloaded flute wears 5× faster, and the alternating cut depths leave visible witness marks on the surface.",
    conditions: [{ type: "spindle_speed_above", rpm: 15000 }],
    exceptions: ["Single-flute endmills where runout only affects DOC consistency"],
    source: "Rego-Fix — 'Runout Measurement and Control for HSM'",
    related_rules: ["HSM-001", "MICRO-001"],
  },

  // ── MICRO MACHINING RULES ────────────────────────────────────────────────

  {
    id: "MICRO-001",
    category: "micro_machining",
    severity: "critical",
    title: "Tool runout < 2 um for micro-milling",
    rule: "Maintain total indicated runout (TIR) < 2 µm for micro-milling with tools ≤ 0.5mm diameter. With a 0.2mm tool, even 5 µm runout means one flute cuts 5% more diameter than intended.",
    reasoning: "Micro tools have extremely low stiffness (proportional to D⁴). Runout adds an oscillating radial force at the tooth passing frequency. At 2 µm with a 0.2mm tool, the runout is 1% of the diameter — enough to cause one flute to completely miss the workpiece on finishing passes. Use shrink-fit or precision collet holders.",
    conditions: [{ type: "always" }],
    exceptions: ["Single-flute micro endmills where runout only causes a slight dimensional shift"],
    source: "Zecha — 'Micro Tool Application Guide'",
    related_rules: ["HSM-005"],
  },
  {
    id: "MICRO-002",
    category: "micro_machining",
    severity: "important",
    title: "Minimum chip thickness governs feed",
    rule: "In micro-machining, feed rate must exceed the minimum chip thickness (approximately 30% of the cutting edge radius). Below this threshold, the tool ploughs instead of cutting, generating heat and accelerating wear.",
    reasoning: "Cutting edges have a finite radius (typically 1-5 µm). When the uncut chip thickness is less than ~30% of this edge radius, material is pushed under the edge (ploughing) instead of being sheared into a chip. Ploughing generates friction heat, work-hardens the surface, and causes rapid flank wear.",
    conditions: [{ type: "always" }],
    exceptions: ["Burnishing operations that intentionally use sub-minimum chip thickness for surface improvement"],
    source: "Chae, Park & Freiheit — 'Micro-Milling Minimum Chip Thickness'",
  },
  {
    id: "MICRO-003",
    category: "micro_machining",
    severity: "important",
    title: "Use air turbine spindles for RPM >60,000",
    rule: "For spindle speeds above 60,000 RPM, use air turbine spindle attachments. Electric spindles have thermal growth issues at these speeds; air turbines are thermally stable and achieve 80,000-160,000 RPM.",
    reasoning: "Electric spindle bearings generate heat proportional to speed × load. Above 60,000 RPM, thermal growth of the spindle shaft can reach 10-20 µm, exceeding the total tolerance budget for micro features. Air turbines use air bearings with near-zero friction and no thermal growth.",
    conditions: [{ type: "spindle_speed_above", rpm: 60000 }],
    exceptions: ["Hybrid ceramic-bearing electric spindles rated for 80,000+ RPM with active cooling"],
    source: "NSK — 'Air Turbine Spindle Technology for Micro Machining'",
  },
  {
    id: "MICRO-004",
    category: "micro_machining",
    severity: "recommended",
    title: "Flood coolant causes tool deflection on micro tools",
    rule: "Avoid flood coolant for micro-machining tools < 0.5mm diameter. The coolant jet force deflects the tool, causing dimensional errors. Use air blast or MQL instead.",
    reasoning: "A standard coolant nozzle delivers fluid at 5-20 bar. On a 0.3mm tool with 5mm stickout, even moderate fluid pressure generates enough lateral force to deflect the tool 5-10 µm — often exceeding the required tolerance. MQL delivers lubrication without significant mechanical force.",
    conditions: [{ type: "always" }],
    exceptions: ["Deep micro-holes where coolant is needed for chip evacuation (reduce pressure and use through-tool delivery)"],
    source: "Datron — 'Micro Machining: Coolant Strategy'",
    related_rules: ["COOL-002"],
  },
  {
    id: "MICRO-005",
    category: "micro_machining",
    severity: "tip",
    title: "Measure tool diameter optically, not with contact probe",
    rule: "Use optical (laser or camera-based) tool measurement for micro tools. Contact-based tool probes apply enough force to deflect or break tools smaller than 0.5mm diameter.",
    reasoning: "A standard tool setter applies 0.5-2 N of trigger force. On a 0.3mm carbide endmill with 5mm stickout, this force causes 10-50 µm deflection, giving a false diameter reading. Laser tool setters measure without contact, providing accurate diameter and runout data without risk of breakage.",
    conditions: [{ type: "always" }],
    exceptions: ["Rigid micro drills with short stickout where contact force is within acceptable limits"],
    source: "Blum-Novotest — 'Non-Contact Tool Measurement for Micro Tools'",
  },

  // ── HYBRID ADDITIVE RULES ────────────────────────────────────────────────

  {
    id: "HA-001",
    category: "hybrid_additive",
    severity: "important",
    title: "Machine datum surfaces on printed stock before feature cutting",
    rule: "Machine all datum reference surfaces on AM (3D-printed) parts before cutting precision features. As-printed surfaces have 15-50 µm roughness and poor geometric accuracy — unsuitable as datums.",
    reasoning: "Additive manufacturing produces surfaces with staircase artifacts (layer lines), partially melted powder particles, and geometric deviations of 0.1-0.3mm from nominal. Using these surfaces as machining datums propagates the AM inaccuracy into all features. Machine flat, cylindrical, or planar datums first.",
    conditions: [{ type: "always" }],
    exceptions: ["Non-critical parts where AM accuracy is sufficient for datum purposes"],
    source: "DMG MORI — 'LASERTEC: Hybrid Additive Manufacturing Guide'",
    related_rules: ["DAT-001", "SEQ-002"],
  },
  {
    id: "HA-002",
    category: "hybrid_additive",
    severity: "critical",
    title: "Add 0.5-1.0mm machining stock to all printed surfaces",
    rule: "Add 0.5-1.0mm of machining stock allowance to all AM-printed surfaces that will be finish machined. AM dimensional accuracy of ±0.1-0.3mm is insufficient for machined tolerances.",
    reasoning: "AM parts have dimensional variation from thermal distortion, support structure marks, and layer-to-layer alignment. The 0.5-1.0mm allowance ensures the machining tool always finds material to cut, even at the worst-case deviation. Too little stock risks air-cutting on convex surfaces or missing material on concave surfaces.",
    conditions: [{ type: "always" }],
    exceptions: ["Internal channels and lattice structures that cannot be machined (design to net shape)", "As-built surfaces where post-machining is not required"],
    source: "EOS — 'Design Guidelines for Metal AM: Machining Allowances'",
    related_rules: ["HA-001"],
  },
  {
    id: "HA-003",
    category: "hybrid_additive",
    severity: "important",
    title: "Stress-relieve printed parts before precision machining",
    rule: "Stress-relieve AM parts before precision machining operations. Residual stress from the AM build process causes distortion when material is removed, shifting features out of tolerance.",
    reasoning: "Laser powder bed fusion creates extreme thermal gradients (~10⁶ °C/s cooling rate) that lock in residual stress often exceeding the yield strength. When machining removes material, the stress redistributes, causing the part to warp. Stress relief at 600-700°C for 1-2 hours reduces residual stress by 60-80%.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Parts built with optimized scan strategies (island scanning, checkerboard) that minimize residual stress"],
    source: "Renishaw — 'Post-Processing of AM Parts: Stress Relief'",
    related_rules: ["HA-005"],
  },
  {
    id: "HA-004",
    category: "hybrid_additive",
    severity: "recommended",
    title: "3D-printed conformal fixtures reduce setup time 40-60%",
    rule: "Use 3D-printed conformal fixtures for complex part geometries. Printed fixtures that match the part's freeform shape reduce setup time by 40-60% compared to conventional vise/clamp setups.",
    reasoning: "Complex parts (organic shapes, thin walls, non-prismatic geometry) are difficult to fixture with standard tooling. A 3D-printed fixture (polymer for inspection, metal for machining) cradles the part perfectly, distributing clamping force evenly and eliminating the need for custom soft jaws or complex clamping arrangements.",
    conditions: [{ type: "batch_size_above", count: 10 }],
    exceptions: ["Single-part prototypes where fixture printing time exceeds manual fixturing time", "Simple prismatic parts that clamp easily in standard vises"],
    source: "Markforged — 'Manufacturing Fixtures with Additive'",
  },
  {
    id: "HA-005",
    category: "hybrid_additive",
    severity: "tip",
    title: "Hybrid sequence: print near-net, rough, stress relieve, finish",
    rule: "Optimal hybrid manufacturing sequence: 1) Print near-net shape → 2) Rough machine (remove support structures, establish datums) → 3) Stress relieve → 4) Finish machine to final dimensions.",
    reasoning: "This sequence leverages each process optimally. AM creates complex near-net geometry efficiently. Rough machining removes bulk AM artifacts and excess stock. Stress relief relaxes distortion from both AM and rough machining before final dimensioning. Finish machining achieves tight tolerances on a stress-free part.",
    conditions: [{ type: "always" }],
    exceptions: ["In-envelope hybrid machines (e.g., DMG MORI LASERTEC) where AM and machining alternate layer-by-layer"],
    source: "Hybrid Manufacturing Technologies — 'Process Planning for Hybrid AM+CNC'",
    related_rules: ["HA-002", "HA-003"],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MachiningPlaybookEngine {
  private rules: PlaybookRule[] = [...PLAYBOOK_RULES];

  /**
   * Get all applicable rules for a given machining scenario
   */
  advise(query: PlaybookQuery): {
    rules: PlaybookRule[];
    summary: string[];
    critical_warnings: string[];
  } {
    const matched = this.rules.filter(rule => this.ruleMatches(rule, query));
    const severityOrder: Record<Severity, number> = { critical: 0, important: 1, recommended: 2, tip: 3 };
    matched.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Filter by minimum severity if specified
    const minSev = query.severity_min ?? "tip";
    const minIdx = severityOrder[minSev];
    const filtered = matched.filter(r => severityOrder[r.severity] <= minIdx);

    // Filter by categories if specified
    const catFiltered = query.categories
      ? filtered.filter(r => query.categories!.includes(r.category))
      : filtered;

    return {
      rules: catFiltered,
      summary: catFiltered.map(r => `[${r.severity.toUpperCase()}] ${r.title}: ${r.rule.substring(0, 120)}...`),
      critical_warnings: catFiltered
        .filter(r => r.severity === "critical")
        .map(r => `${r.id}: ${r.title}`),
    };
  }

  /**
   * Get sequencing advice for a set of features
   */
  sequenceAdvice(features: string[], material_iso?: string): SequencingAdvice {
    const query: PlaybookQuery = {
      features,
      material_iso,
      categories: ["sequencing", "anti_pattern"],
    };
    const { rules } = this.advise(query);

    const order: string[] = [];
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Build recommended order from sequencing rules
    // Priority: face → datum → drill → rough → semi-finish → finish → thread → chamfer
    const CANONICAL_ORDER = [
      // Milling operations
      "face", "datum", "spot_drill", "drill", "bore_rough",
      "rough_pocket", "rough_profile", "rough_3d",
      "semi_finish", "bore_finish",
      "finish_pocket", "finish_profile", "finish_3d", "pencil",
      "ream", "tap", "thread_mill",
      "chamfer", "deburr",
      // Turning/lathe operations
      "turn_rough", "turn_finish", "turn_groove", "turn_thread", "turn_cutoff",
      // Deep hole operations
      "peck_drill", "gun_drill", "bta_drill",
      // Grinding operations
      "grind_rough", "grind_finish", "grind_id", "grind_surface",
      // EDM operations
      "edm_rough", "edm_finish", "wire_edm",
      // Surface treatment (always last before inspection)
      "heat_treat", "surface_treat", "anodize", "plate",
      // Inspection
      "inspect", "cmm",
    ];

    for (const op of CANONICAL_ORDER) {
      const relatedFeatures = features.filter(f => this.opRelatesTo(op, f));
      if (relatedFeatures.length > 0) {
        order.push(op);
      }
    }

    for (const rule of rules) {
      if (rule.category === "sequencing") {
        reasoning.push(`${rule.id}: ${rule.reasoning.substring(0, 150)}`);
      }
      if (rule.category === "anti_pattern") {
        warnings.push(`${rule.id} [${rule.severity.toUpperCase()}]: ${rule.rule}`);
      }
    }

    return {
      recommended_order: order,
      reasoning,
      warnings,
      applied_rules: rules.map(r => r.id),
    };
  }

  /**
   * Get setup strategy advice
   */
  setupAdvice(
    features: string[],
    material_iso?: string,
    tolerance_mm?: number,
  ): SetupAdvice {
    const query: PlaybookQuery = {
      features,
      material_iso,
      tolerance_mm,
      categories: ["setup_strategy", "workholding", "datum"],
    };
    const { rules } = this.advise(query);

    return {
      recommended_setups: features.some(f => f.includes("back") || f.includes("bottom")) ? 2 : 1,
      setup_descriptions: [
        "Setup 1: Top-accessible features — face, drill, rough, finish",
        ...(features.some(f => f.includes("back") || f.includes("bottom"))
          ? ["Setup 2: Flip part — machine bottom/back features using Op 1 surfaces as datum"]
          : []),
      ],
      workholding_suggestions: rules
        .filter(r => r.category === "workholding")
        .map(r => r.rule),
      datum_strategy: rules
        .filter(r => r.category === "datum")
        .map(r => r.rule)
        .join(" ") || "Machine primary datum surface (A) first, then B and C before any features.",
      reasoning: rules.map(r => `${r.id}: ${r.reasoning.substring(0, 100)}`),
      applied_rules: rules.map(r => r.id),
    };
  }

  /**
   * Look up anti-patterns for given conditions
   */
  antiPatterns(query: PlaybookQuery): PlaybookRule[] {
    return this.advise({ ...query, categories: ["anti_pattern"] }).rules;
  }

  /**
   * Add a new rule to the playbook (from video learning)
   */
  addRule(rule: PlaybookRule): void {
    // Check for duplicate ID
    if (this.rules.some(r => r.id === rule.id)) {
      throw new Error(`Rule ${rule.id} already exists`);
    }
    this.rules.push(rule);
  }

  /**
   * Get all rules by category
   */
  byCategory(category: RuleCategory): PlaybookRule[] {
    return this.rules.filter(r => r.category === category);
  }

  /**
   * Get rule count statistics
   */
  stats(): Record<string, number> {
    const counts: Record<string, number> = { total: this.rules.length };
    for (const rule of this.rules) {
      counts[rule.category] = (counts[rule.category] || 0) + 1;
      counts[`severity_${rule.severity}`] = (counts[`severity_${rule.severity}`] || 0) + 1;
    }
    return counts;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private ruleMatches(rule: PlaybookRule, query: PlaybookQuery): boolean {
    return rule.conditions.some(cond => {
      switch (cond.type) {
        case "always":
          return true;
        case "material_iso":
          return query.material_iso ? cond.groups.includes(query.material_iso) : false;
        case "feature_present":
          return query.features ? cond.features.some(f => query.features!.includes(f)) : false;
        case "tolerance_below":
          return query.tolerance_mm !== undefined && query.tolerance_mm <= cond.threshold_mm;
        case "wall_thickness_below":
          return query.wall_thickness_mm !== undefined && query.wall_thickness_mm <= cond.threshold_mm;
        case "depth_ratio_above":
          return false; // Requires per-feature L/D — checked externally
        case "surface_finish_below":
          return query.surface_finish_Ra !== undefined && query.surface_finish_Ra <= cond.ra_um;
        case "batch_size_above":
          return query.batch_size !== undefined && query.batch_size >= cond.count;
        case "machine_axes":
          return query.machine_axes !== undefined && query.machine_axes >= cond.min_axes;
        case "part_size":
          return false; // Requires part dimensions — checked externally
        case "operation_type":
          return query.operation_type ? cond.operations.includes(query.operation_type) : false;
        case "hardness_above":
          return query.hardness_hrc !== undefined && query.hardness_hrc >= cond.hrc;
        case "aspect_ratio_above":
          return query.aspect_ratio !== undefined && query.aspect_ratio >= cond.ratio;
        case "spindle_speed_above":
          return query.spindle_rpm !== undefined && query.spindle_rpm >= cond.rpm;
        default:
          return false;
      }
    });
  }

  private opRelatesTo(op: string, feature: string): boolean {
    const map: Record<string, string[]> = {
      // Milling operations
      face: ["face", "stock"],
      datum: ["datum", "bore", "face"],
      spot_drill: ["hole", "thread"],
      drill: ["hole", "thread", "bore"],
      bore_rough: ["bore"],
      rough_pocket: ["pocket"],
      rough_profile: ["profile", "contour"],
      rough_3d: ["freeform", "3d"],
      semi_finish: ["pocket", "profile", "freeform", "bore"],
      bore_finish: ["bore"],
      finish_pocket: ["pocket"],
      finish_profile: ["profile", "contour"],
      finish_3d: ["freeform", "3d"],
      pencil: ["freeform", "pocket"],
      ream: ["hole"],
      tap: ["thread"],
      thread_mill: ["thread"],
      chamfer: ["chamfer", "hole", "pocket"],
      deburr: ["pocket", "profile", "slot"],
      // Turning/lathe operations
      turn_rough: ["turn", "od", "shaft", "cylinder", "face"],
      turn_finish: ["turn", "od", "shaft", "cylinder", "finish"],
      turn_groove: ["groove", "undercut", "o-ring"],
      turn_thread: ["thread", "turn"],
      turn_cutoff: ["cutoff", "parting"],
      // Deep hole operations
      peck_drill: ["hole", "deep_hole"],
      gun_drill: ["deep_hole", "hole"],
      bta_drill: ["deep_hole", "hole"],
      // Grinding operations
      grind_rough: ["grind", "surface", "od", "id"],
      grind_finish: ["grind", "finish", "surface"],
      grind_id: ["grind", "id", "bore"],
      grind_surface: ["grind", "surface", "flat"],
      // EDM operations
      edm_rough: ["edm", "cavity", "die"],
      edm_finish: ["edm", "finish", "cavity"],
      wire_edm: ["edm", "wire", "contour", "profile"],
      // Surface treatment
      heat_treat: ["heat_treat", "harden", "carburize", "temper"],
      surface_treat: ["surface_treat", "coat", "nitride"],
      anodize: ["anodize", "aluminum"],
      plate: ["plate", "chrome", "nickel"],
      // Inspection
      inspect: ["inspect", "measure", "check"],
      cmm: ["cmm", "inspect", "gdt", "tolerance"],
    };
    const related = map[op] || [];
    return related.some(r => feature.toLowerCase().includes(r));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const machiningPlaybookEngine = new MachiningPlaybookEngine();
