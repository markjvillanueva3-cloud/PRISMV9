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
  | "safety";           // Crash prevention and safe practices

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
  | { type: "always" };

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
      "face", "datum", "spot_drill", "drill", "bore_rough",
      "rough_pocket", "rough_profile", "rough_3d",
      "semi_finish", "bore_finish",
      "finish_pocket", "finish_profile", "finish_3d", "pencil",
      "ream", "tap", "thread_mill",
      "chamfer", "deburr",
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
        default:
          return false;
      }
    });
  }

  private opRelatesTo(op: string, feature: string): boolean {
    const map: Record<string, string[]> = {
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
    };
    const related = map[op] || [];
    return related.some(r => feature.toLowerCase().includes(r));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const machiningPlaybookEngine = new MachiningPlaybookEngine();
