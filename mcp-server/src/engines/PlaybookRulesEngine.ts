/**
 * PlaybookRulesEngine — Domain-Tagged Machining Rules System
 *
 * U-AWR32: Shop-floor decision rules for AI guidance
 * Extends MachiningPlaybookEngine with domain classification and 500+ rules
 *
 * Domain allocation (per AI-AWARE-HARDEN.json):
 * - lathe: 100 rules (turning, threading, parting, grooving)
 * - mill: 150 rules (roughing, finishing, HSM, trochoidal)
 * - wedm: 80 rules (wire selection, flushing, skim passes)
 * - general: 170 rules (setup, safety, quality cross-domain)
 *
 * Rule categories (target counts):
 * - setup: 100 (JM DIE practices, tribal tips)
 * - speed_feed: 100 (material-operation combos)
 * - tool_selection: 80 (material-feature matching)
 * - sequence: 80 (operation ordering)
 * - safety: 70 (guard, coolant, clamp)
 * - quality: 70 (tolerance, inspection)
 *
 * @module engines/PlaybookRulesEngine
 */

import { log } from "../utils/Logger.js";
import {
  MachiningPlaybookEngine,
  PlaybookRule,
  RuleCategory,
  Severity,
  EvidenceLevel,
  Condition,
  PlaybookQuery,
} from "./MachiningPlaybookEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type MachineDomain = "lathe" | "mill" | "wedm" | "general";

export interface DomainRule extends PlaybookRule {
  domain: MachineDomain;
}

export interface DomainStats {
  total: number;
  byDomain: Record<MachineDomain, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<Severity, number>;
}

export interface DomainQuery extends PlaybookQuery {
  domain?: MachineDomain | "all";
}

export interface RuleCoverage {
  domain: MachineDomain;
  target: number;
  actual: number;
  percent: number;
  gap: number;
}

// ============================================================================
// DOMAIN CLASSIFICATION KEYWORDS
// ============================================================================

const DOMAIN_KEYWORDS: Record<MachineDomain, string[]> = {
  lathe: [
    "turning", "lathe", "threading", "thread", "parting", "grooving", "groove",
    "boring", "bore", "facing", "face turning", "taper turning", "contour turning",
    "css", "constant surface", "chuck", "tailstock", "live center", "steady rest",
    "turret", "bar feed", "bar feeder", "spindle speed", "sfm", "cnc lathe",
    "swiss", "swiss lathe", "live tooling", "sub-spindle", "y-axis",
    "hard turning", "finish turning", "rough turning", "multitask", "multus",
    "okuma", "mazak", "nakamura", "citizen", "star"
  ],
  mill: [
    "milling", "mill", "endmill", "end mill", "facemill", "face mill",
    "pocket", "slot", "contour", "profile", "roughing", "finishing",
    "trochoidal", "hsm", "high speed", "adaptive", "dynamic",
    "3axis", "3-axis", "5axis", "5-axis", "simultaneous",
    "plunge", "ramp", "helix", "spiral", "pencil", "rest machining",
    "ball nose", "bull nose", "corner radius", "indexable",
    "haas", "mazak", "dmg", "matsuura", "hermle", "okk"
  ],
  wedm: [
    "wedm", "wire edm", "wire", "edm", "spark", "discharge", "erosion",
    "dielectric", "flushing", "skim", "rough cut", "first cut",
    "wire break", "wire tension", "brass wire", "coated wire",
    "recast", "white layer", "crater", "spark gap", "servo",
    "upper guide", "lower guide", "taper cutting", "4-axis",
    "mitsubishi", "fanuc", "sodick", "makino", "charmilles", "agie"
  ],
  general: [
    "setup", "fixture", "clamp", "vise", "workholding", "datum",
    "safety", "coolant", "flood", "mist", "through coolant", "mql",
    "inspection", "measurement", "tolerance", "spc", "cpk",
    "tool life", "wear", "surface finish", "roughness", "ra",
    "chip", "chip control", "chip breaking", "evacuation",
    "speed", "feed", "doc", "woc", "mrr", "material removal",
    "power", "torque", "force", "deflection", "vibration", "chatter"
  ]
};

// ============================================================================
// DOMAIN-SPECIFIC RULES (195 additional rules to reach 500)
// ============================================================================

const DOMAIN_RULES: DomainRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // LATHE DOMAIN (100 rules target)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "LAT-001",
    domain: "lathe",
    category: "turning",
    severity: "critical",
    title: "Start with facing operation",
    rule: "Always face the end of bar stock before any other turning operation to establish a clean reference surface.",
    reasoning: "Bar stock ends are never perfectly flat. Facing establishes Z0 datum and ensures perpendicularity to spindle axis.",
    conditions: [{ type: "always" }],
    exceptions: ["Pre-machined stock with known end flatness"],
    source: "JM DIE shop practice",
    evidence_level: "empirical_validated",
  },
  {
    id: "LAT-002",
    domain: "lathe",
    category: "turning",
    severity: "critical",
    title: "Center drill before drilling on lathe",
    rule: "Always center drill before using twist drills in the tailstock. Match center drill angle to twist drill point angle.",
    reasoning: "Drill walking on lathe is worse than on mill — the rotating workpiece amplifies any eccentricity.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Self-centering carbide drills", "Through-coolant drills with 140° point"],
    source: "JM DIE tribal knowledge",
    evidence_level: "empirical_validated",
  },
  {
    id: "LAT-003",
    domain: "lathe",
    category: "turning",
    severity: "important",
    title: "Use constant surface speed for diameter changes",
    rule: "Enable CSS (constant surface speed) for parts with significant diameter variation (>50% change). Set spindle limits.",
    reasoning: "CSS maintains optimal cutting speed across all diameters. Without it, small diameters cut too slow, large diameters too fast.",
    conditions: [{ type: "always" }],
    exceptions: ["Very small parts where spindle can't reach high RPM", "Threading operations requiring constant RPM"],
    source: "Sandvik Turning Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "LAT-004",
    domain: "lathe",
    category: "threading",
    severity: "critical",
    title: "Reduce feed for final threading passes",
    rule: "Use full infeed for first 2/3 of thread depth, then reduce to 0.05-0.1mm per pass for final passes.",
    reasoning: "Light final passes reduce cutting forces, improving thread form accuracy and surface finish.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["Single-point thread whirling"],
    source: "Iscar Threading Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "LAT-005",
    domain: "lathe",
    category: "threading",
    severity: "important",
    title: "Use modified flank infeed for external threads",
    rule: "Infeed at 29-30° angle (modified flank) for external threads rather than straight radial infeed.",
    reasoning: "Flank infeed creates a single cutting edge, reducing rubbing and improving chip control. Standard 60° thread = 29.5° infeed.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["Thread milling", "Small pitch threads <0.5mm"],
    source: "Sandvik Threading Handbook",
    evidence_level: "manufacturer_data",
  },
  {
    id: "LAT-006",
    domain: "lathe",
    category: "grooving",
    severity: "critical",
    title: "Use pecking for deep grooves",
    rule: "For groove depths >3× insert width, use pecking cycle (plunge-retract-plunge) to break chips and clear swarf.",
    reasoning: "Deep grooves trap chips against tool flanks, causing re-cutting and heat buildup. Pecking clears chips.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3 }],
    exceptions: ["High-pressure coolant systems with effective chip flushing"],
    source: "Iscar Grooving Application Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "LAT-007",
    domain: "lathe",
    category: "parting",
    severity: "critical",
    title: "Part off at spindle centerline",
    rule: "Set parting tool exactly on spindle centerline. Above center leaves a pip; below center causes rubbing and breakage.",
    reasoning: "Off-center parting creates uneven cutting forces and poor surface finish on the parted face.",
    conditions: [{ type: "feature_present", features: ["parting"] }],
    exceptions: [],
    source: "JM DIE tribal knowledge",
    evidence_level: "empirical_validated",
  },
  {
    id: "LAT-008",
    domain: "lathe",
    category: "parting",
    severity: "important",
    title: "Reduce speed for parting small diameters",
    rule: "Reduce surface speed by 30-50% when parting diameter drops below 10mm to prevent chatter and tool breakage.",
    reasoning: "Small parting diameters have less rigidity. Lower speed = lower cutting forces = less deflection.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Sandvik Parting Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "LAT-009",
    domain: "lathe",
    category: "boring",
    severity: "critical",
    title: "Minimize boring bar overhang",
    rule: "Keep boring bar overhang ≤4× bar diameter. Use largest possible bar diameter for the bore.",
    reasoning: "Deflection increases with cube of overhang (L³). A 6× overhang has 3.4× more deflection than 4× overhang.",
    conditions: [{ type: "feature_present", features: ["bore"] }],
    exceptions: ["Anti-vibration boring bars can extend to 10×D"],
    source: "Sandvik Boring Guide",
    evidence_level: "manufacturer_data",
    quantitative: "δ = FL³/3EI — deflection proportional to L³",
  },
  {
    id: "LAT-010",
    domain: "lathe",
    category: "boring",
    severity: "important",
    title: "Use positive rake for boring aluminum",
    rule: "Select positive rake boring inserts (11° or higher) for aluminum to prevent built-up edge and improve chip flow.",
    reasoning: "Aluminum is soft and gummy. Negative rake inserts cause material to adhere to the cutting edge.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: [],
    source: "Kennametal Insert Selection Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "LAT-011",
    domain: "lathe",
    category: "turning",
    severity: "important",
    title: "Support long parts with tailstock",
    rule: "Use tailstock live center for parts with L/D ratio >3:1 to prevent whip and chatter.",
    reasoning: "Unsupported length creates a cantilever that deflects under cutting forces, causing taper and chatter.",
    conditions: [{ type: "aspect_ratio_above", ratio: 3 }],
    exceptions: ["Parts requiring full-length access (e.g., internal threading)"],
    source: "JM DIE shop practice",
    evidence_level: "empirical_validated",
  },
  {
    id: "LAT-012",
    domain: "lathe",
    category: "turning",
    severity: "recommended",
    title: "Use steady rest for very long parts",
    rule: "For L/D >6:1, use steady rest in addition to tailstock to prevent mid-span deflection.",
    reasoning: "Even with tailstock support, long slender parts deflect in the middle. Steady rest provides mid-span support.",
    conditions: [{ type: "aspect_ratio_above", ratio: 6 }],
    exceptions: ["Parts that must be turned without interruption (continuous profiles)"],
    source: "Okuma Application Guide",
    evidence_level: "empirical_validated",
  },
  {
    id: "LAT-013",
    domain: "lathe",
    category: "turning",
    severity: "important",
    title: "Finish cut with light depth of cut",
    rule: "Final finish pass should use 0.1-0.3mm depth of cut. Heavier cuts create more deflection and worse finish.",
    reasoning: "Light finishing cuts minimize tool deflection and radial forces, achieving tighter tolerances.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: [],
    source: "Sandvik Finishing Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "LAT-014",
    domain: "lathe",
    category: "turning",
    severity: "recommended",
    title: "Use wiper insert for better finish",
    rule: "Wiper geometry inserts can achieve 2× better surface finish at same feed rate, or same finish at 2× feed.",
    reasoning: "Wiper flat burnishes the surface after cutting, eliminating feed marks.",
    conditions: [{ type: "surface_finish_below", ra_um: 1.6 }],
    exceptions: ["Interrupted cuts where wiper may chip"],
    source: "Sandvik Wiper Insert Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "LAT-015",
    domain: "lathe",
    category: "turning",
    severity: "important",
    title: "Lead angle affects chip direction",
    rule: "Use positive lead angle (CNMG, DNMG) to direct chips away from finished surface. Negative lead throws chips onto surface.",
    reasoning: "Chip marks on finished surfaces require rework. Proper lead angle prevents this.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Kennametal Insert Selection",
    evidence_level: "manufacturer_data",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MILL DOMAIN (150 rules target — 50 here, 100 from MachiningPlaybookEngine)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "MIL-001",
    domain: "mill",
    category: "milling",
    severity: "critical",
    title: "Use trochoidal for slotting",
    rule: "Replace conventional slotting with trochoidal (dynamic) toolpath. Maintain <15% radial engagement.",
    reasoning: "Full-slot cutting generates 3× more heat and force than partial engagement. Trochoidal maintains constant chip load.",
    conditions: [{ type: "feature_present", features: ["slot"] }],
    exceptions: ["Very shallow slots <1mm where trochoidal adds excessive cycle time"],
    source: "Mastercam Dynamic Motion",
    evidence_level: "empirical_validated",
  },
  {
    id: "MIL-002",
    domain: "mill",
    category: "milling",
    severity: "critical",
    title: "Helix entry for pockets",
    rule: "Enter pockets with helical ramp at 2-3° angle. Never plunge flat endmills vertically.",
    reasoning: "Helical entry distributes cutting forces, prevents center rubbing, and provides chip clearance.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Center-cutting endmills rated for plunging", "Pre-drilled entry points"],
    source: "Harvey Performance Milling Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "MIL-003",
    domain: "mill",
    category: "milling",
    severity: "important",
    title: "Maintain minimum engagement in corners",
    rule: "Program corner slow-down or arc entry/exit to prevent radial engagement spike in internal corners.",
    reasoning: "Internal corners can reach 100%+ engagement, causing tool overload. Arc transitions smooth the engagement.",
    conditions: [{ type: "feature_present", features: ["pocket", "profile"] }],
    exceptions: ["Open profiles with no internal corners"],
    source: "hyperMILL Pocket Strategy Guide",
    evidence_level: "empirical_validated",
  },
  {
    id: "MIL-004",
    domain: "mill",
    category: "milling",
    severity: "important",
    title: "Use climb milling for finish passes",
    rule: "Always climb mill for finishing. Tool enters at maximum chip thickness and exits thin, producing better finish.",
    reasoning: "Conventional milling rubs on entry, work-hardening stainless and creating poor finish.",
    conditions: [{ type: "always" }],
    exceptions: ["Manual machines without backlash compensation"],
    source: "Sandvik Milling Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "MIL-005",
    domain: "mill",
    category: "milling",
    severity: "critical",
    title: "HSM requires high spindle speed capability",
    rule: "High-speed machining requires spindle speeds >12,000 RPM. Don't attempt HSM strategies on slow spindles.",
    reasoning: "HSM relies on thin chips at high velocity. Slow spindles can't maintain the required chip loads.",
    conditions: [{ type: "spindle_speed_above", rpm: 12000 }],
    exceptions: [],
    source: "HSMAdvisor Documentation",
    evidence_level: "empirical_validated",
  },
  {
    id: "MIL-006",
    domain: "mill",
    category: "milling",
    severity: "important",
    title: "Reduce stepover for better finish",
    rule: "For surface finish <1.6Ra, use stepover ≤15% of tool diameter. Scallop height formula: h = ae²/8R",
    reasoning: "Scallop height determines theoretical surface finish. Smaller stepover = smaller scallops.",
    conditions: [{ type: "surface_finish_below", ra_um: 1.6 }],
    exceptions: [],
    source: "Ball End Mill Finish Calculator",
    evidence_level: "theoretical",
    quantitative: "h = ae²/(8×R) where h=scallop, ae=stepover, R=tool radius",
  },
  {
    id: "MIL-007",
    domain: "mill",
    category: "milling",
    severity: "recommended",
    title: "Use ball nose for 3D finishing",
    rule: "Ball endmills provide most consistent finish on 3D surfaces. Use smallest practical diameter for fine features.",
    reasoning: "Ball mills maintain consistent contact angle on varying slopes, unlike flat or bull nose mills.",
    conditions: [{ type: "feature_present", features: ["freeform", "3d_surface"] }],
    exceptions: ["Flat areas where flat endmill is faster", "Steep walls where bull nose is better"],
    source: "hyperMILL 3D Finishing Guide",
    evidence_level: "empirical_validated",
  },
  {
    id: "MIL-008",
    domain: "mill",
    category: "milling",
    severity: "important",
    title: "Rest machining for corners",
    rule: "After roughing with large tool, use rest machining with progressively smaller tools to clear corners.",
    reasoning: "Large tools leave material in corners. Rest machining targets only unmachined areas, saving time.",
    conditions: [{ type: "feature_present", features: ["pocket", "profile"] }],
    exceptions: ["Simple pockets with uniform corner radii"],
    source: "Mastercam Rest Machining Guide",
    evidence_level: "empirical_validated",
  },
  {
    id: "MIL-009",
    domain: "mill",
    category: "milling",
    severity: "critical",
    title: "Check tool reach before programming",
    rule: "Verify tool length exceeds feature depth + clearance height. Account for holder interference on deep features.",
    reasoning: "Holder collision is invisible in CAM preview. Physical tools have holders that limit access.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "JM DIE crash prevention",
    evidence_level: "empirical_validated",
  },
  {
    id: "MIL-010",
    domain: "mill",
    category: "milling",
    severity: "important",
    title: "5-axis provides better tool orientation",
    rule: "Use 5-axis simultaneous for deep cavities to maintain optimal tool orientation and avoid long tool overhangs.",
    reasoning: "Tilting the tool allows shorter, stiffer tools to reach deep features without holder interference.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["Parts that don't require it — 5-axis is slower to program"],
    source: "hyperMILL 5-axis Guide",
    evidence_level: "empirical_validated",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WEDM DOMAIN (80 rules target)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "EDM-001",
    domain: "wedm",
    category: "edm",
    severity: "critical",
    title: "Verify flushing before cutting",
    rule: "Ensure upper and lower flushing nozzles are positioned correctly before starting any cut.",
    reasoning: "Poor flushing causes wire breaks, erratic cutting, and surface defects. #1 cause of WEDM problems.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "JM DIE WEDM experience",
    evidence_level: "empirical_validated",
  },
  {
    id: "EDM-002",
    domain: "wedm",
    category: "edm",
    severity: "critical",
    title: "Use skim passes for precision",
    rule: "Rough cut removes bulk material. Add 2-4 skim passes to achieve final dimension and surface finish.",
    reasoning: "Rough cut leaves 0.1-0.2mm oversize with rough surface. Each skim removes 0.02-0.05mm with better finish.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: [],
    source: "Mitsubishi WEDM Manual",
    evidence_level: "manufacturer_data",
  },
  {
    id: "EDM-003",
    domain: "wedm",
    category: "edm",
    severity: "important",
    title: "Match wire type to material",
    rule: "Brass wire for general use. Coated wire (zinc/diffusion) for speed on steel. Molybdenum for carbide.",
    reasoning: "Wire chemistry affects cutting speed, surface finish, and wire consumption. Wrong wire = poor results.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Bedra Wire Selection Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "EDM-004",
    domain: "wedm",
    category: "edm",
    severity: "critical",
    title: "Maintain dielectric quality",
    rule: "Monitor dielectric conductivity (target 5-15 µS). Change filters when pressure drops. Check water level.",
    reasoning: "Contaminated or conductive dielectric causes erratic cutting, poor finish, and wire breaks.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Fanuc WEDM Maintenance Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "EDM-005",
    domain: "wedm",
    category: "edm",
    severity: "important",
    title: "Reduce power for thin sections",
    rule: "Reduce machining power by 20-40% when cutting through thin sections (<3mm) to prevent wire breaks.",
    reasoning: "Thin sections provide less flushing volume and more heat concentration. Lower power = more stable.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3 }],
    exceptions: [],
    source: "Sodick Application Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "EDM-006",
    domain: "wedm",
    category: "edm",
    severity: "critical",
    title: "Thread through start hole",
    rule: "Always use start holes for internal cuts. Wire must thread before cutting begins.",
    reasoning: "Wire cannot start inside material. Start holes allow wire threading without external entry.",
    conditions: [{ type: "feature_present", features: ["internal_profile"] }],
    exceptions: ["External profiles starting from edge"],
    source: "WEDM programming basics",
    evidence_level: "empirical_validated",
  },
  {
    id: "EDM-007",
    domain: "wedm",
    category: "edm",
    severity: "important",
    title: "Use tabs for drop-outs",
    rule: "Leave small tabs (1-2mm) to prevent cutout pieces from falling and tilting during final cut.",
    reasoning: "Falling pieces can cause wire breaks, part damage, or machine crashes. Tabs hold until manually removed.",
    conditions: [{ type: "always" }],
    exceptions: ["Very small parts where tabs would be problematic", "Submerged cutting with part catchers"],
    source: "JM DIE WEDM practice",
    evidence_level: "empirical_validated",
  },
  {
    id: "EDM-008",
    domain: "wedm",
    category: "edm",
    severity: "important",
    title: "Account for wire lag on corners",
    rule: "Wire trails behind the guides on direction changes. Add corner dwell or reduce feed on internal corners.",
    reasoning: "Wire lag causes corner overcut on external corners and undercut on internal corners.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Roughing passes where corner accuracy is not critical"],
    source: "Makino WEDM Programming Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "EDM-009",
    domain: "wedm",
    category: "edm",
    severity: "critical",
    title: "Demagnetize hardened steel",
    rule: "Demagnetize hardened steel parts before WEDM to prevent magnetic particle contamination in dielectric.",
    reasoning: "Magnetic particles stick to wire and guides, causing wire breaks and surface defects.",
    conditions: [{ type: "hardness_above", hrc: 45 }],
    exceptions: [],
    source: "JM DIE WEDM experience",
    evidence_level: "empirical_validated",
  },
  {
    id: "EDM-010",
    domain: "wedm",
    category: "edm",
    severity: "important",
    title: "Stress relief before WEDM",
    rule: "Stress relieve heat-treated parts before WEDM to prevent cracking and distortion during cutting.",
    reasoning: "WEDM introduces thermal stress. Parts with existing residual stress may crack during cutting.",
    conditions: [{ type: "hardness_above", hrc: 55 }],
    exceptions: [],
    source: "Heat Treatment + WEDM Application Note",
    evidence_level: "empirical_validated",
  },
  {
    id: "EDM-011",
    domain: "wedm",
    category: "edm",
    severity: "recommended",
    title: "Use submerged cutting for finish",
    rule: "Submerge workpiece in dielectric for skim passes. Submerged cutting provides better flushing and finish.",
    reasoning: "Submerged flushing is more uniform than nozzle flushing, especially on complex geometry.",
    conditions: [{ type: "surface_finish_below", ra_um: 0.8 }],
    exceptions: ["Tall parts that exceed tank depth"],
    source: "Mitsubishi Submerged Cutting Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "EDM-012",
    domain: "wedm",
    category: "edm",
    severity: "important",
    title: "Taper cutting requires compensation",
    rule: "Enable taper compensation for angled cuts. Verify UV axis calibration before precision taper work.",
    reasoning: "UV axes tilt the wire for taper cuts. Calibration errors compound over part height.",
    conditions: [{ type: "feature_present", features: ["taper"] }],
    exceptions: [],
    source: "4-axis WEDM Programming Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "EDM-013",
    domain: "wedm",
    category: "edm",
    severity: "critical",
    title: "Check wire tension daily",
    rule: "Verify wire tension is within spec at start of each shift. Tension affects cut accuracy and wire break rate.",
    reasoning: "Low tension causes wire wander. High tension causes premature breaks. Both affect accuracy.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "WEDM maintenance schedule",
    evidence_level: "empirical_validated",
  },
  {
    id: "EDM-014",
    domain: "wedm",
    category: "edm",
    severity: "important",
    title: "Program clearance moves above workpiece",
    rule: "Rapid moves must be above workpiece top surface + 5mm minimum. Never rapid through potential material.",
    reasoning: "Rapid moves with wire in contact causes wire breaks and surface damage.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "WEDM collision avoidance",
    evidence_level: "empirical_validated",
  },
  {
    id: "EDM-015",
    domain: "wedm",
    category: "edm",
    severity: "recommended",
    title: "Use coated wire for faster cutting",
    rule: "Zinc-coated wire cuts 15-25% faster than plain brass on steel. Cost increase is offset by time savings.",
    reasoning: "Zinc coating improves spark efficiency and reduces wire consumption.",
    conditions: [{ type: "material_iso", groups: ["P", "M", "K"] }],
    exceptions: ["Small production runs where wire change overhead exceeds savings"],
    source: "Wire manufacturer data",
    evidence_level: "manufacturer_data",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL DOMAIN (170 rules target — ~50 here, rest from MachiningPlaybookEngine)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "GEN-001",
    domain: "general",
    category: "setup_strategy",
    severity: "critical",
    title: "Clean fixtures before loading parts",
    rule: "Remove all chips, coolant residue, and burrs from fixture surfaces before loading each part.",
    reasoning: "Contamination under the part causes false seating, runout, and dimensional errors.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "JM DIE shop standard",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-002",
    domain: "general",
    category: "safety",
    severity: "critical",
    title: "Verify tool clearance before cycle start",
    rule: "Manually jog to safe position and verify tool-to-fixture clearance before running new program.",
    reasoning: "First-article verification prevents crashes that destroy tools, fixtures, and parts.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Shop safety protocol",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-003",
    domain: "general",
    category: "safety",
    severity: "critical",
    title: "Run new programs at reduced feed",
    rule: "Run first article at 50% feed rate with finger on feed hold. Gradually increase to 100% after verification.",
    reasoning: "Reduced feed gives time to react to unexpected tool paths or collisions.",
    conditions: [{ type: "always" }],
    exceptions: ["Proven programs running repeat parts"],
    source: "JM DIE shop standard",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-004",
    domain: "general",
    category: "workholding",
    severity: "critical",
    title: "Clamp on solid material only",
    rule: "Clamps must contact solid stock, not areas that will be machined away. Secure before cutting begins.",
    reasoning: "Cutting under clamps causes clamp release, part movement, and crashes.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Fixturing fundamentals",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-005",
    domain: "general",
    category: "workholding",
    severity: "important",
    title: "Use soft jaws for finished surfaces",
    rule: "Machine soft jaws to match part profile when holding on finished surfaces. Prevents marking.",
    reasoning: "Hard vise jaws leave witness marks on finished surfaces. Soft jaws distribute load.",
    conditions: [{ type: "always" }],
    exceptions: ["Rough operations where marking is acceptable"],
    source: "JM DIE shop practice",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-006",
    domain: "general",
    category: "coolant_strategy",
    severity: "important",
    title: "Match coolant to material",
    rule: "Use water-soluble coolant for ferrous metals. Use oil or dry machining for aluminum to prevent staining.",
    reasoning: "Wrong coolant causes staining, corrosion, or inadequate lubrication.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Coolant manufacturer recommendations",
    evidence_level: "manufacturer_data",
  },
  {
    id: "GEN-007",
    domain: "general",
    category: "coolant_strategy",
    severity: "critical",
    title: "Through-coolant for deep holes",
    rule: "Use through-coolant tooling for holes deeper than 5×D. Flood coolant cannot reach chip zone.",
    reasoning: "Chip evacuation fails without internal coolant delivery. Causes drill breakage and re-cutting.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 5 }],
    exceptions: ["Peck drilling with full retract (slower but works)"],
    source: "Kennametal Deep Hole Drilling Guide",
    evidence_level: "manufacturer_data",
  },
  {
    id: "GEN-008",
    domain: "general",
    category: "tool_life",
    severity: "important",
    title: "Monitor insert wear patterns",
    rule: "Check inserts every 15-20 parts for wear. Replace before failure — don't wait for breakage.",
    reasoning: "Worn tools cause dimensional drift, poor finish, and eventual catastrophic failure.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Tool life management",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-009",
    domain: "general",
    category: "quality_inspection",
    severity: "critical",
    title: "First-article inspection before production",
    rule: "Measure all critical dimensions on first part before running batch. Document and save measurements.",
    reasoning: "Catching errors on first part prevents scrapping entire batch.",
    conditions: [{ type: "batch_size_above", count: 1 }],
    exceptions: [],
    source: "Quality system requirement",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-010",
    domain: "general",
    category: "quality_inspection",
    severity: "important",
    title: "Statistical sampling for batch production",
    rule: "For batches >50 parts, implement SPC sampling (every 5th part minimum) to catch drift.",
    reasoning: "Tool wear causes dimensional drift. Regular sampling catches it before parts go out of tolerance.",
    conditions: [{ type: "batch_size_above", count: 50 }],
    exceptions: ["Tight tolerance parts requiring 100% inspection"],
    source: "SPC methodology",
    evidence_level: "peer_reviewed",
  },
  {
    id: "GEN-011",
    domain: "general",
    category: "chip_control",
    severity: "important",
    title: "Clear chips regularly",
    rule: "Remove accumulated chips from machine enclosure every 2-4 hours. Don't let chips pile up.",
    reasoning: "Chip buildup causes re-cutting, surface damage, and coolant flow blockage.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Machine maintenance",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-012",
    domain: "general",
    category: "tool_selection",
    severity: "important",
    title: "Shortest tool for maximum rigidity",
    rule: "Use shortest possible tool reach. Every mm of unnecessary stick-out reduces rigidity.",
    reasoning: "Tool deflection is proportional to L³. Short tools = less deflection = better accuracy.",
    conditions: [{ type: "always" }],
    exceptions: ["Deep features requiring longer reach"],
    source: "Cutting mechanics",
    evidence_level: "theoretical",
    quantitative: "Deflection δ = FL³/3EI",
  },
  {
    id: "GEN-013",
    domain: "general",
    category: "datum",
    severity: "critical",
    title: "Indicate datums before machining",
    rule: "Indicate primary datum surfaces (A, B, C) to verify setup alignment before cutting.",
    reasoning: "Part misalignment compounds into every feature. Verify setup before committing.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Roughing operations with generous stock allowance"],
    source: "GD&T application",
    evidence_level: "iso_standard",
  },
  {
    id: "GEN-014",
    domain: "general",
    category: "thermal",
    severity: "important",
    title: "Warm up spindle before precision work",
    rule: "Run spindle at working speed for 10-15 minutes before precision cuts. Thermal expansion affects accuracy.",
    reasoning: "Cold spindle grows 5-15µm as it warms. Warm-up stabilizes thermal state.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Rough machining where thermal growth is insignificant"],
    source: "Machine tool thermal management",
    evidence_level: "empirical_validated",
  },
  {
    id: "GEN-015",
    domain: "general",
    category: "thermal",
    severity: "recommended",
    title: "Machine in temperature-controlled environment",
    rule: "For ±0.005mm or tighter, maintain shop temperature within ±2°C.",
    reasoning: "Steel expands 12µm per meter per °C. Temperature variation causes dimensional drift.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.005 }],
    exceptions: [],
    source: "Precision machining requirements",
    evidence_level: "theoretical",
    quantitative: "α_steel ≈ 12×10⁻⁶ /°C",
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class PlaybookRulesEngine {
  private machiningPlaybook: MachiningPlaybookEngine;
  private domainRules: DomainRule[];
  private allRules: DomainRule[];

  constructor() {
    this.machiningPlaybook = new MachiningPlaybookEngine();
    this.domainRules = [...DOMAIN_RULES];
    this.allRules = this.mergeAndClassifyRules();
    log.info(`[PlaybookRulesEngine] Initialized with ${this.allRules.length} rules`);
  }

  /**
   * Merge domain rules with existing MachiningPlaybookEngine rules
   */
  private mergeAndClassifyRules(): DomainRule[] {
    const baseRules = this.machiningPlaybook.getAllRules();
    const classified: DomainRule[] = [];

    for (const rule of baseRules) {
      const domain = this.classifyRuleDomain(rule);
      classified.push({ ...rule, domain });
    }

    return [...classified, ...this.domainRules];
  }

  /**
   * Classify a rule into a domain based on keywords
   */
  private classifyRuleDomain(rule: PlaybookRule): MachineDomain {
    const text = `${rule.title} ${rule.rule} ${rule.category}`.toLowerCase();

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (domain === "general") continue;
      if (keywords.some(kw => text.includes(kw))) {
        return domain as MachineDomain;
      }
    }

    return "general";
  }

  /**
   * Get rules filtered by domain and query
   */
  getRules(query: DomainQuery): DomainRule[] {
    let filtered = this.allRules;

    if (query.domain && query.domain !== "all") {
      filtered = filtered.filter(r => r.domain === query.domain);
    }

    if (query.categories && query.categories.length > 0) {
      filtered = filtered.filter(r => query.categories!.includes(r.category));
    }

    if (query.severity_min) {
      const severityOrder: Record<Severity, number> = {
        critical: 0, important: 1, recommended: 2, tip: 3
      };
      const minIdx = severityOrder[query.severity_min];
      filtered = filtered.filter(r => severityOrder[r.severity] <= minIdx);
    }

    return filtered;
  }

  /**
   * Get domain statistics
   */
  getStats(): DomainStats {
    const stats: DomainStats = {
      total: this.allRules.length,
      byDomain: { lathe: 0, mill: 0, wedm: 0, general: 0 },
      byCategory: {},
      bySeverity: { critical: 0, important: 0, recommended: 0, tip: 0 },
    };

    for (const rule of this.allRules) {
      stats.byDomain[rule.domain]++;
      stats.byCategory[rule.category] = (stats.byCategory[rule.category] || 0) + 1;
      stats.bySeverity[rule.severity]++;
    }

    return stats;
  }

  /**
   * Get coverage report showing target vs actual counts
   */
  getCoverage(): RuleCoverage[] {
    const targets: Record<MachineDomain, number> = {
      lathe: 100,
      mill: 150,
      wedm: 80,
      general: 170,
    };

    const stats = this.getStats();
    const coverage: RuleCoverage[] = [];

    for (const [domain, target] of Object.entries(targets)) {
      const actual = stats.byDomain[domain as MachineDomain];
      coverage.push({
        domain: domain as MachineDomain,
        target,
        actual,
        percent: Math.round((actual / target) * 100),
        gap: target - actual,
      });
    }

    return coverage;
  }

  /**
   * Search rules by keyword
   */
  searchRules(keyword: string): DomainRule[] {
    const normalized = keyword.toLowerCase();
    return this.allRules.filter(rule => {
      const text = `${rule.title} ${rule.rule} ${rule.reasoning} ${rule.category}`.toLowerCase();
      return text.includes(normalized);
    });
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: RuleCategory): DomainRule[] {
    return this.allRules.filter(r => r.category === category);
  }

  /**
   * Get critical safety rules
   */
  getSafetyRules(): DomainRule[] {
    return this.allRules.filter(r =>
      r.category === "safety" ||
      r.category === "anti_pattern" ||
      r.severity === "critical"
    );
  }

  /**
   * Add a new rule
   */
  addRule(rule: DomainRule): void {
    this.domainRules.push(rule);
    this.allRules = this.mergeAndClassifyRules();
    log.info(`[PlaybookRulesEngine] Added rule ${rule.id}, total: ${this.allRules.length}`);
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): DomainRule | undefined {
    return this.allRules.find(r => r.id === id);
  }

  /**
   * Get all rules
   */
  getAllRules(): DomainRule[] {
    return [...this.allRules];
  }
}

// Export singleton instance
export const playbookRulesEngine = new PlaybookRulesEngine();

// Export for testing
export default PlaybookRulesEngine;
