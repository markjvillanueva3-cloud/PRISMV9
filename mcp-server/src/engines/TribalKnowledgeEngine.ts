/**
 * TribalKnowledgeEngine — Manufacturing Intelligence Layer
 *
 * Captures, stores, and retrieves shop-floor tribal knowledge — the
 * undocumented tips, tricks, and lessons learned from experienced machinists.
 * Composes ApprenticeEngine + KnowledgeGraphEngine.
 *
 * Persistence: captured tips are written to CAPTURED_TIPS_PATH via atomicWrite.
 * On init, persisted tips are loaded and merged with static tips.
 *
 * Actions: knowledge_capture, knowledge_search, knowledge_suggest, knowledge_stats
 */

import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { log } from "../utils/Logger.js";
import { FUSION360_CAM_TIPS } from "../data/fusion360-cam-tips.js";
import { NX_CAM_TIPS } from "../data/nx-cam-tips.js";
import { CONTROLLER_KNOWLEDGE_TIPS } from "../data/controller-knowledge-tips.js";
import { MASTERCAM_CAM_TIPS } from "../data/mastercam-cam-tips.js";
import { SOLIDCAM_CAM_TIPS } from "../data/solidcam-cam-tips.js";
import { FUSION360_CAM_TIPS_EXT } from "../data/fusion360-cam-tips-ext.js";
import { NX_CAM_TIPS_EXT } from "../data/nx-cam-tips-ext.js";
import { ESPRIT_CAM_TIPS } from "../data/esprit-cam-tips.js";
import { EDGECAM_CAM_TIPS } from "../data/edgecam-cam-tips.js";
import { CAMWORKS_CAM_TIPS } from "../data/camworks-cam-tips.js";
import { TOPSOLID_CAM_TIPS } from "../data/topsolid-cam-tips.js";
import { WORKNC_CAM_TIPS } from "../data/worknc-cam-tips.js";
import { GIBBSCAM_CAM_TIPS } from "../data/gibbscam-cam-tips.js";
import { CATIA_CAM_TIPS } from "../data/catia-cam-tips.js";
import { SURFCAM_CAM_TIPS } from "../data/surfcam-cam-tips.js";
import { BOBCAD_CAM_TIPS } from "../data/bobcad-cam-tips.js";
import { POWERMILL_CAM_TIPS } from "../data/powermill-cam-tips.js";
import { TEBIS_CAM_TIPS } from "../data/tebis-cam-tips.js";
import { CIMATRON_CAM_TIPS } from "../data/cimatron-cam-tips.js";
import { SPRUTCAM_CAM_TIPS } from "../data/sprutcam-cam-tips.js";
import { HYPERMILL_CAM_TIPS_EXT } from "../data/hypermill-cam-tips-ext.js";
import { WEDM_KNOWLEDGE_TIPS } from "../data/wedm-knowledge-tips.js";
import { contentAutoTaggerEngine } from "./ContentAutoTaggerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Domain classification for tribal knowledge provenance. */
export type KnowledgeDomain =
  | "shop_floor"         // operator tips, lessons learned
  | "cam_software"       // CAM-specific (Mastercam, Fusion, etc.)
  | "drawing_standards"  // GD&T, dimensioning, CAD best practices
  | "safety"             // safety procedures, incident lessons
  | "maintenance"        // machine maintenance, PM schedules
  | "process_engineering"// specialized processes (EDM, grinding, heat treat)
  | "quality_inspection" // QC, SPC, metrology, inspection
  | "tooling_technology" // tool selection, wear, coatings, holders
  | "controller_specific"// controller quirks, macros, post quirks
  | "workholding"        // fixturing, clamping, pallet strategies
  | "video_learned"      // extracted from video tutorials
  | "document_learned"   // extracted from technical documents
  | "general"            // uncategorized
  | (string & {});       // extensible

/** Subcategory for finer-grained classification within a category. */
export type KnowledgeSubcategory = string;

export interface KnowledgeTip {
  id: string;
  title: string;
  body: string;
  category: KnowledgeCategory;
  subcategory?: KnowledgeSubcategory;
  domain?: KnowledgeDomain;
  knowledge_type?: KnowledgeType;    // U-TK03: tip nature classification
  tags: string[];
  material_groups?: string[];
  operation_types?: string[];
  machine_ids?: string[];            // machine IDs this tip applies to (empty = all)
  workholding_type?: string;         // "vise" | "chuck" | "fixture" | "vacuum" | "magnetic" etc.
  confidence: number;                // 0–100 (validated by experts)
  source: string;                    // "operator:John", "incident:2024-03-15", etc.
  created_at: string;
  usage_count: number;
  /** TK-MS6: validated-application count used by Master Machinist ranking */
  evidence_count?: number;
  auto_categorized?: boolean;        // true if enriched by auto-categorizer
  auto_tags?: string[];              // tags added by ContentAutoTaggerEngine
}

// Core manufacturing categories (always tracked for coverage gaps)
/** C O R E_ C A T E G O R I E S constant.
 */
export const CORE_CATEGORIES = [
  "setup", "tooling", "speeds_feeds", "fixturing",
  "surface_finish", "thread", "safety", "maintenance",
  "material_handling", "quality", "troubleshooting",
] as const;

// U-TK03: Extended categories including 15 previously undeclared categories
// Consolidations: finishing/surface_quality → surface_finish, post_processing → post_processor,
// material/material_specific → materials_science
/** Knowledge Category type definition.
 */
export type KnowledgeCategory =
  | typeof CORE_CATEGORIES[number]
  // Original extended categories
  | "programming" | "electronics" | "automation" | "metrology"
  | "design" | "materials_science" | "process_engineering"
  | "lean_manufacturing" | "additive" | "inspection"
  // U-TK03: New categories from 20-agent scrutiny
  | "cam_strategy"      // CAM strategy selection, toolpath types
  | "optimization"      // cycle time, efficiency, process optimization
  | "post_processor"    // post-processor quirks, formatting, controller-specific
  | "roughing"          // roughing operations, stock removal
  | "workflow"          // process workflow, job flow, scheduling
  | "multi_axis"        // 4/5-axis, simultaneous, indexed operations
  | "verification"      // toolpath verification, simulation validation
  | "simulation"        // NC simulation, collision detection
  | "mold_die"          // mold/die specific, electrode, EDM
  | "probing"           // touch probing, tool setting, WCS
  | "general"           // uncategorized/fallback
  | (string & {});  // extensible — any string accepted for dynamic categories

/** U-TK03: Knowledge type classification for tip nature. */
export type KnowledgeType =
  | "tip"               // general helpful advice
  | "anti_pattern"      // what NOT to do
  | "rule"              // firm rule/requirement
  | "workaround"        // workaround for known issue
  | "failure_mode"      // description of how things fail
  | "correction"        // correction to common misconception
  | "heuristic"         // rule of thumb, approximation
  | "machine_quirk"     // machine-specific behavior
  | "post_quirk"        // post-processor specific behavior
  | "setup_lesson"      // setup/fixturing lesson
  | "quote_correction"; // cost/time estimation correction

/** Knowledge Search Input configuration/data structure.
 */
export interface KnowledgeSearchInput {
  query?: string;
  material_iso_group?: string;
  operation_type?: string;
  category?: KnowledgeCategory;
  domain?: KnowledgeDomain;          // U-TK04: filter by domain
  subcategory?: KnowledgeSubcategory; // U-TK04: filter by subcategory
  knowledge_type?: KnowledgeType;    // U-TK04: filter by tip type
  min_confidence?: number;
  machine_ids?: string[];            // filter tips relevant to specific machines
  workholding_type?: string;         // filter tips relevant to specific workholding
  limit?: number;
}

/** Knowledge Suggestion configuration/data structure.
 */
export interface KnowledgeSuggestion {
  tips: KnowledgeTip[];
  relevance_scores: Record<string, number>;
  context_match: string;
}

/** Knowledge Stats configuration/data structure.
 */
export interface KnowledgeStats {
  total_tips: number;
  by_category: Record<string, number>;
  by_domain: Record<string, number>;
  by_confidence: { high: number; medium: number; low: number };
  most_used: { id: string; title: string; usage_count: number }[];
  coverage_gaps: string[];
  auto_categorized_count: number;
}

// ============================================================================
// KNOWLEDGE BASE (built-in tribal knowledge from manufacturing domain)
// ============================================================================

const KNOWLEDGE_BASE: KnowledgeTip[] = [
  { id: "tk-001", title: "Stainless 304 work hardening prevention", body: "Never dwell in the cut with 304/316 stainless. Use climb milling, positive rake angles, and maintain constant chip load. If you hear the pitch change, you've already work-hardened the surface — increase speed 15% and take a fresh cut below the hardened layer.", category: "speeds_feeds", tags: ["stainless", "work-hardening", "304", "316"], material_groups: ["M"], operation_types: ["pocket", "profile"], confidence: 95, source: "operator:senior_machinist", created_at: "2024-01-15", usage_count: 47 },
  { id: "tk-002", title: "Titanium chip color indicator", body: "Watch chip color when cutting Ti-6Al-4V: silver/light gold = good parameters. Dark blue/purple = too hot — reduce speed immediately. If chips are dark brown/black, you're burning the tool and workpiece. Through-spindle coolant is mandatory above 45 m/min.", category: "tooling", tags: ["titanium", "chip-color", "temperature"], material_groups: ["S"], operation_types: ["face", "pocket", "profile"], confidence: 90, source: "operator:aerospace_lead", created_at: "2024-02-10", usage_count: 33 },
  { id: "tk-003", title: "Vise jaw alignment check", body: "Every Monday morning: run a dial indicator across the fixed jaw. If TIR exceeds 0.0005\" (0.013mm), re-seat the jaw with a soft hammer and re-indicate. 90% of 'mystery' taper errors trace back to jaw alignment drift from weekend thermal cycling.", category: "fixturing", tags: ["vise", "alignment", "taper", "quality"], confidence: 88, source: "operator:quality_lead", created_at: "2024-03-01", usage_count: 28 },
  { id: "tk-004", title: "Deep pocket chip evacuation trick", body: "For pockets deeper than 2×diameter: program a retract-to-safe-Z every 3rd pass to let chips clear. Without this, you'll recut chips and get terrible surface finish plus accelerated flank wear. Takes 10% more cycle time but saves the tool and part.", category: "tooling", tags: ["pocket", "chip-evacuation", "deep-pocket"], operation_types: ["pocket"], confidence: 92, source: "operator:cam_programmer", created_at: "2024-01-20", usage_count: 41 },
  { id: "tk-005", title: "Thread milling vs tapping decision", body: "Use thread mills (not taps) for: blind holes in expensive parts, hole diameters >M12, exotic materials (Inconel, Ti), and any single-piece prototype. Taps are faster but if they break in the hole, the part is scrap. Thread mill breaks? Just replace and re-run the path.", category: "tooling", tags: ["threading", "thread-mill", "tap", "risk"], operation_types: ["thread"], confidence: 95, source: "operator:shop_foreman", created_at: "2024-04-05", usage_count: 38 },
  { id: "tk-006", title: "Aluminum face mill chatter fix", body: "If you get chatter face-milling aluminum, before reducing speed: try INCREASING speed to 15000+ RPM with high feed. The light cuts at high speed often eliminate resonance that occurs at mid-range RPMs. Also check that your face mill has unequal tooth spacing.", category: "speeds_feeds", tags: ["aluminum", "chatter", "face-mill", "high-speed"], material_groups: ["N"], operation_types: ["face"], confidence: 85, source: "operator:hsm_specialist", created_at: "2024-05-12", usage_count: 22 },
  { id: "tk-007", title: "Cast iron dry machining advantage", body: "Gray cast iron machines BETTER dry than with coolant. The graphite flakes act as a natural lubricant. Adding flood coolant creates a thermal shock that cracks carbide inserts. Use compressed air only for chip clearing.", category: "speeds_feeds", tags: ["cast-iron", "dry-cutting", "coolant"], material_groups: ["K"], operation_types: ["face", "pocket", "drill"], confidence: 92, source: "operator:tooling_engineer", created_at: "2024-02-28", usage_count: 35 },
  { id: "tk-008", title: "First-article inspection shortcut", body: "For first article: machine the first part 0.05mm oversize on all critical dimensions. Measure, calculate offsets, then cut the final dimensions. One extra part saves you from scrapping $500+ worth of material and 2 hours of machine time.", category: "quality", tags: ["first-article", "inspection", "offset"], confidence: 90, source: "operator:quality_machinist", created_at: "2024-06-01", usage_count: 44 },
  { id: "tk-009", title: "Tool length measurement best practice", body: "ALWAYS measure tool length with spindle warm (run at 80% RPM for 5 minutes first). Cold spindle can be 0.01-0.03mm shorter than running temperature. On tight tolerance work (±0.01mm), this matters.", category: "setup", tags: ["tool-length", "thermal-growth", "calibration"], confidence: 88, source: "operator:precision_lead", created_at: "2024-03-15", usage_count: 31 },
  { id: "tk-010", title: "Deburring sequence matters", body: "Always deburr BEFORE final inspection, AFTER all machining. But critical: deburr the datum surfaces FIRST so your measurement references are clean. A burr on a datum face can shift your entire measurement by 0.02mm+.", category: "quality", tags: ["deburring", "inspection", "datum"], confidence: 93, source: "operator:inspection_lead", created_at: "2024-04-20", usage_count: 26 },
  { id: "tk-011", title: "Workholding for thin walls", body: "For thin-wall parts (<2mm wall thickness): fill the pocket with low-melt alloy (Cerrobend, melts at 70°C) before finish machining the outside. The filler supports the wall against cutting forces. Melt it out in warm water after machining.", category: "fixturing", tags: ["thin-wall", "workholding", "cerrobend", "support"], confidence: 80, source: "operator:aerospace_machinist", created_at: "2024-07-01", usage_count: 15 },
  { id: "tk-012", title: "Safety: never reach into running machine", body: "NEVER reach into the work zone while spindle is rotating, even at low RPM. Use the chip hook tool to clear chips. Two machinists in this shop have lost fingertips from 'just brushing away chips.' The machine does not care about your deadline.", category: "safety", tags: ["safety", "chips", "injury-prevention"], confidence: 100, source: "safety:incident_review", created_at: "2024-01-01", usage_count: 89 },

  // --- Video-learned tips (source: Mastercam 2024 Tutorial — Titans of CNC) ---
  { id: "tk-vl-aVcqrFkLMbU-01", title: "Mastercam 2024 2D milling reference parameters", body: "From a Mastercam 2024 tutorial by Titans of CNC: facing with 3\" face mill at 3000 RPM / 40 IPM / 0.040\" DOC. Roughing with 1/2\" 3-flute end mill using dynamic mill (trochoidal) at 8000 RPM / 60 IPM / 25% stepover / chip load 0.0025 per tooth. Finishing contour at 5% stepover. Drilling with 1/4\" drill using peck cycle. Post-processed for Haas VF-2 with Fanuc-compatible control.", category: "speeds_feeds", tags: ["mastercam", "milling", "2d-toolpath", "haas", "fanuc", "trochoidal", "facing", "drilling"], material_groups: ["P"], operation_types: ["face", "pocket", "profile", "drill"], confidence: 70, source: "video:aVcqrFkLMbU", created_at: "2026-03-01", usage_count: 0 },
  { id: "tk-vl-aVcqrFkLMbU-02", title: "Mastercam 2024 tool selection for 2D milling job", body: "Recommended tool set from Mastercam tutorial: 3\" face mill for facing, 1/2\" 3-flute end mill for roughing and finishing contours, 1/4\" drill for bolt holes. The 3-flute end mill is preferred over 4-flute for aluminum and general-purpose steel milling due to better chip evacuation in slotting and pocketing.", category: "tooling", tags: ["mastercam", "tool-selection", "face-mill", "end-mill", "drill"], operation_types: ["face", "pocket", "profile", "drill"], confidence: 70, source: "video:aVcqrFkLMbU", created_at: "2026-03-01", usage_count: 0 },
  { id: "tk-vl-aVcqrFkLMbU-03", title: "Dynamic mill (trochoidal) in Mastercam for efficient roughing", body: "Mastercam's '2D Dynamic Mill' uses trochoidal milling for efficient material removal. Key advantage: maintains consistent chip load by varying the engagement angle rather than using conventional pocket passes. Set stepover to 25% of tool diameter for optimal balance of MRR and tool life. Particularly effective for hard materials and deep pockets.", category: "speeds_feeds", tags: ["mastercam", "dynamic-mill", "trochoidal", "roughing", "chip-load"], operation_types: ["pocket", "profile"], confidence: 70, source: "video:aVcqrFkLMbU", created_at: "2026-03-01", usage_count: 0 },
  { id: "tk-vl-aVcqrFkLMbU-04", title: "Trochoidal milling maintains consistent chip load", body: "Trochoidal (circular) toolpaths maintain constant tool engagement angle, preventing the load spikes that cause chatter and premature tool wear in conventional roughing. In Mastercam this is called 'Dynamic Mill.' Use it whenever roughing pockets or profiles in steels, stainless, and superalloys. Pair with 25% WOC and aggressive axial DOC for best MRR.", category: "speeds_feeds", tags: ["trochoidal", "chip-load", "engagement-angle", "roughing"], operation_types: ["pocket", "profile"], confidence: 70, source: "video:aVcqrFkLMbU", created_at: "2026-03-01", usage_count: 0 },
  { id: "tk-vl-aVcqrFkLMbU-05", title: "Contour finishing pass for wall quality", body: "After roughing with dynamic mill, add a separate contour finishing pass with reduced stepover (5% of tool diameter) for good wall surface finish. Use the same end mill as roughing but at finishing parameters. In Mastercam, select 'Contour' toolpath type and pick the finished profile geometry.", category: "surface_finish", tags: ["contour", "finishing", "surface-finish", "mastercam"], operation_types: ["profile"], confidence: 70, source: "video:aVcqrFkLMbU", created_at: "2026-03-01", usage_count: 0 },

  // --- Document-learned tips (source: CAD Drawing Standards & Best Practices handbook) ---
  { id: "TK-DL-cad-drawing-01", title: "GD&T datum scheme is mandatory for position tolerance", body: "Position tolerance (⊕) ALWAYS requires a datum reference frame. A common drawing error is specifying position tolerance without defining datums — the tolerance is meaningless without them. Define three mutually perpendicular datum planes (A, B, C) before applying position callouts. Per ASME Y14.5-2018, this is the most common GD&T callout and the most commonly misapplied.", category: "quality", tags: ["gdt", "datum", "position-tolerance", "asme-y14.5", "drawing"], confidence: 90, source: "document:cad_drawing_standards@section4", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-02", title: "Never dimension to hidden lines — use section views", body: "Dimensioning to hidden (dashed) lines is a top-10 drawing error across all CAD platforms. If a feature is internal or not visible in the current view, create a section view (full, half, offset, or broken-out) to expose it. This applies equally in SolidWorks, Fusion 360, CATIA, NX, and FreeCAD TechDraw. Section views eliminate ambiguity and reduce interpretation errors on the shop floor.", category: "quality", tags: ["drawing", "section-view", "dimensioning", "hidden-lines", "best-practice"], confidence: 92, source: "document:cad_drawing_standards@section6", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-03", title: "Dimension once — never repeat across views", body: "Every dimension should appear exactly once on the drawing. Repeating a dimension in multiple views creates conflicting tolerance interpretations and confuses the machinist. Place dimensions in the view that best shows the feature's true shape, preferably between views. Reference dimensions (parenthesized) are the only exception.", category: "quality", tags: ["drawing", "dimensioning", "over-dimensioning", "tolerance-stack"], confidence: 93, source: "document:cad_drawing_standards@section3", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-04", title: "Use baseline dimensioning for critical tolerance features", body: "For features where cumulative tolerance stack-up is unacceptable, use baseline (datum) dimensioning — all dimensions originate from a single reference. Chain dimensioning accumulates tolerances: N dimensions at ±0.1mm gives ±(N×0.1)mm at the end. Baseline dimensioning keeps each feature at ±0.1mm from the datum regardless of chain length.", category: "quality", tags: ["baseline-dimensioning", "tolerance-stack", "datum", "chain-dimensioning"], confidence: 90, source: "document:cad_drawing_standards@section3", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-05", title: "Surface finish must be specified on all mating surfaces", body: "Every surface that mates with another part MUST have a surface finish callout (Ra value per ISO 1302 or ASME Y14.36). Common values: Ra 1.6-3.2 μm for standard machining, Ra 0.4-0.8 μm for bearing seats and sealing surfaces, Ra 0.05-0.2 μm for lapped/polished surfaces. Missing finish specs on fits is a top-10 drawing error that causes assembly failures.", category: "quality", tags: ["surface-finish", "Ra", "mating-surface", "iso-1302", "drawing"], confidence: 88, source: "document:cad_drawing_standards@section3", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-06", title: "Position tolerance calculation for hole patterns", body: "For fastener hole patterns: Floating fastener formula: T_hole = H_MMC - F_MMC (where H=hole diameter at MMC, F=fastener diameter at MMC). Fixed fastener formula: T_hole = (H_MMC - F_MMC) / 2. Always specify position tolerance at MMC (Ⓜ) for holes — this allows bonus tolerance as the hole gets larger, maximizing manufacturing yield.", category: "quality", tags: ["position-tolerance", "hole-pattern", "mmc", "fastener", "gdt", "formula"], confidence: 85, source: "document:cad_drawing_standards@section4", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-07", title: "SolidWorks: use Model Items to auto-import dimensions", body: "In SolidWorks drawings, use Insert → Model Items to automatically pull dimensions from the 3D model into drawing views. This is faster and more accurate than re-dimensioning manually. After auto-import, clean up placement (move dimensions between views, adjust spacing). Set drafting standard under Tools → Options → Document Properties → Drafting Standard (ANSI or ISO).", category: "setup", tags: ["solidworks", "drawing", "model-items", "automation", "cad"], confidence: 80, source: "document:cad_drawing_standards@section5", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-08", title: "CATIA: use Generative Drafting over Interactive Drafting", body: "In CATIA V5/V6, always use Generative Drafting (automatic from 3D model) instead of Interactive Drafting (manual). Generative Drafting maintains full associativity — model changes auto-update the drawing. Use dress-up features (centerlines, threads, axis lines) BEFORE dimensioning. CATIA has the most comprehensive GD&T symbol library of all major CAD systems.", category: "setup", tags: ["catia", "drawing", "generative-drafting", "associativity", "cad"], confidence: 80, source: "document:cad_drawing_standards@section5", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-09", title: "Siemens NX PMI for Model-Based Definition", body: "Siemens NX leads the industry in PMI (Product Manufacturing Information) — dimensions, tolerances, and annotations stored directly on the 3D model. This enables Model-Based Definition (MBD) per ASME Y14.41-2019, eliminating 2D drawings entirely. PMI feeds automated CMM programming for inspection. Export as STEP AP242 for interoperability with other CAD systems.", category: "setup", tags: ["nx", "pmi", "mbd", "asme-y14.41", "step-ap242", "inspection", "cad"], confidence: 82, source: "document:cad_drawing_standards@section7", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-10", title: "Always include projection symbol and general tolerance block", body: "Two items that MUST appear on every technical drawing: (1) Projection symbol — third-angle (ASME/North America) or first-angle (ISO/Europe) — to prevent view misinterpretation. (2) General tolerance block (e.g., ISO 2768-mK) covering all undimensioned features. Without these, the shop floor has to guess orientation and tolerance class, leading to scrap.", category: "quality", tags: ["projection", "tolerance-block", "iso-2768", "title-block", "drawing"], confidence: 91, source: "document:cad_drawing_standards@section6", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-11", title: "Edge break/deburr note is mandatory on machined parts", body: "Every machined part drawing must include an edge break callout (e.g., 'BREAK ALL SHARP EDGES 0.2-0.5mm' or 'DEBURR ALL EDGES'). Sharp edges are dangerous to handlers, cause stress concentrations, and interfere with coatings/plating. This is one of the most commonly omitted notes and a frequent cause of part rejection at incoming inspection.", category: "safety", tags: ["deburr", "edge-break", "drawing", "safety", "inspection"], confidence: 90, source: "document:cad_drawing_standards@section6", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-12", title: "Hole callouts must be complete: diameter + depth + type", body: "Every hole on a drawing needs a complete callout: diameter, depth (THRU or blind depth), and type (plain, counterbore ⌴, countersink ∠, tapped). Tapped holes additionally need thread spec (e.g., M10x1.5 - 6H x 20 DEEP). Incomplete hole callouts are a leading cause of manufacturing questions and RFIs that delay production.", category: "quality", tags: ["hole-callout", "counterbore", "countersink", "tapped-hole", "drawing"], confidence: 88, source: "document:cad_drawing_standards@section3", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-13", title: "Form tolerances (flatness, cylindricity) need no datum", body: "The four form tolerances — straightness (⏤), flatness (⏥), circularity (○), and cylindricity (⌭) — are the ONLY GD&T controls that do NOT require a datum reference. They control individual feature shape. All other GD&T categories (orientation, location, profile, runout) require at least one datum. Incorrectly adding datums to form tolerances is a common error.", category: "quality", tags: ["gdt", "form-tolerance", "flatness", "cylindricity", "datum", "drawing"], confidence: 88, source: "document:cad_drawing_standards@section4", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-14", title: "ISO 2768 tolerance classes for general dimensions", body: "ISO 2768 defines four general tolerance classes for undimensioned features: f (fine: ±0.05 to ±0.5mm), m (medium: ±0.1 to ±1.0mm), c (coarse: ±0.2 to ±2.0mm), v (very coarse: ±0.5 to ±4.0mm). Always state the class in the title block (e.g., 'ISO 2768-mK'). The second letter (K) adds geometrical tolerance per Part 2. Medium (m) is the default for most machined parts.", category: "quality", tags: ["iso-2768", "general-tolerance", "tolerance-class", "drawing", "title-block"], confidence: 85, source: "document:cad_drawing_standards@section3", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-cad-drawing-15", title: "FreeCAD/CadQuery: export STEP then use TechDraw for 2D", body: "CadQuery generates 3D models programmatically but has no built-in 2D drawing capability. For technical drawings: export to STEP, then use FreeCAD's TechDraw workbench. TechDraw supports projection groups, section views, detail views, dimensions, and surface finish symbols. For quick 2D cross-sections from CadQuery, use cq.exporters.export(result.section(), 'cross_section.dxf').", category: "setup", tags: ["freecad", "cadquery", "techdraw", "step", "dxf", "cad", "drawing"], confidence: 78, source: "document:cad_drawing_standards@section5", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-mc-wire-01", title: "Wire EDM overburn decreases per skim pass", body: "Overburn (the extra material removed beyond the wire path) decreases with each skim pass. Typical progression for brass 0.25mm wire: first cut 0.035mm, skim 1 = 0.020mm, skim 2 = 0.010mm, skim 3 = 0.000mm (zero overburn). Each pass uses lower power and slower speed. Program total offset = wire_radius + overburn for each pass. Source: Mastercam Wire Tutorial Ch.1-2.", category: "machining", tags: ["wire-edm", "overburn", "skim-cut", "offset", "wire"], confidence: 85, source: "document:mastercam_wire_tutorial@ch1-2", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-mc-wire-02", title: "Tab cutting keeps wire EDM parts from dropping", body: "When wire-cutting a closed contour, the slug drops when the cut completes — potentially damaging the part or wire. Use tab cutting: leave 1-2mm tabs (uncut bridges) to hold the slug, then snap or grind them off. Program a 'glue stop' (M01 optional stop) at tab positions so operator can apply adhesive for heavy slugs. Tab width depends on material thickness and weight. Source: Mastercam Wire Tutorial Ch.2.", category: "machining", tags: ["wire-edm", "tab", "slug", "glue-stop", "workholding"], confidence: 88, source: "document:mastercam_wire_tutorial@ch2", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-mc-wire-03", title: "Wire EDM lead-in/lead-out geometry for burr-free cuts", body: "Lead-in and lead-out geometry prevents witness marks at the contour entry/exit point. Best practice: use a line+arc lead (straight approach followed by tangent arc onto contour). Arc radius 0.125-0.5mm, sweep angle 60-90 degrees. Add 0.02mm overlap past the start point to eliminate the entry burr. For skim passes, use shorter leads than the rough cut. Source: Mastercam Wire Tutorial Ch.1.", category: "machining", tags: ["wire-edm", "lead-in", "lead-out", "burr", "contour", "wire"], confidence: 87, source: "document:mastercam_wire_tutorial@ch1", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-mc-wire-04", title: "No-core wire EDM toolpaths for complete material removal", body: "Standard wire EDM cuts a closed contour, leaving a slug (core). No-core toolpaths remove material completely without leaving a slug — useful when the slug would be too heavy to handle or when the cavity shape prevents slug removal. Mastercam's 'Parallel Spiral' no-core pattern spirals inward from the boundary. Slower than contour cutting but eliminates slug handling. Source: Mastercam Wire Tutorial Ch.3.", category: "machining", tags: ["wire-edm", "no-core", "parallel-spiral", "slug", "cavity"], confidence: 82, source: "document:mastercam_wire_tutorial@ch3", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-mc-wire-05", title: "Reverse wire cutting eliminates re-threading", body: "When a wire EDM contour requires multiple passes (rough + skims), reverse cutting runs alternating passes in opposite directions. This eliminates the need to re-thread the wire at the start point between passes — the wire simply reverses direction. Reduces cycle time by 1-3 minutes per pass (threading time). Not suitable for taper cuts where wire angle must be consistent. Source: Mastercam Wire Tutorial Ch.2.", category: "machining", tags: ["wire-edm", "reverse-cut", "threading", "cycle-time", "skim-cut"], confidence: 83, source: "document:mastercam_wire_tutorial@ch2", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-mc-wire-06", title: "Thread point placement near contour start", body: "The thread point (where the wire is initially threaded through a pre-drilled hole) should be placed near the contour start point but NOT on the contour itself. Use 'break closest entity' to split the contour chain at the nearest point to the thread hole. Thread point offset from contour: 0.5-2mm. For multiple contours sharing a thread hole, chain them in order of proximity. Source: Mastercam Wire Tutorial Ch.1.", category: "machining", tags: ["wire-edm", "thread-point", "start-hole", "chaining", "setup"], confidence: 80, source: "document:mastercam_wire_tutorial@ch1", created_at: "2026-03-01", usage_count: 0 },
  { id: "TK-DL-mc-solids-01", title: "Draft angle and fillet guidelines for machined/molded parts", body: "Apply draft angles of 5-10 degrees on vertical walls for moldability and ease of machining. Always apply fillets AFTER boolean cut operations (cuts remove fillet geometry if applied first). Shell operations should be the LAST feature before fillets — shelling after filleting causes unpredictable wall thickness. For CNC: fillets > tool radius to avoid sharp internal corners. Source: Mastercam Solids Tutorial.", category: "design", tags: ["draft-angle", "fillet", "shell", "modeling", "cad", "mold-design"], confidence: 82, source: "document:mastercam_solids_tutorial", created_at: "2026-03-01", usage_count: 0 },

  // --- Document-learned tips (source: hyperMILL Manual Parts 1-4) ---
  { id: "TK-DL-hm-001", title: "Never change measurement system mid-project in hyperMILL", body: "Do not change the measurement system (Metric/Inch) during CAM programming. Existing definition values will NOT be converted. Copying jobs between hyperMILL documents with different measurement systems is not allowed. Set the correct unit system at project creation and lock it.", category: "setup", tags: ["hypermill", "units", "metric", "inch", "cam-setup"], confidence: 95, source: "document:hypermill-manual-en-1@p35", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-002", title: "Always enable Automatic Geometry Check in hyperMILL", body: "The Automatic Geometry Check function (Setup > Settings > Calculation) should ALWAYS be enabled. When geometry is modified, it deletes outdated cache data and reconverts before calculation. Disabling this causes faulty calculations from stale cached geometry. It is active by default for good reason.", category: "setup", tags: ["hypermill", "geometry-check", "cache", "calculation", "cam-setup"], confidence: 95, source: "document:hypermill-manual-en-1@p36", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-003", title: "Clearance plane must be above ALL geometry including fixtures", body: "The clearance plane must be situated above ALL workpiece and fixture boundaries in Z direction. Traversing movements at the clearance plane are NOT checked for collisions. A clearance plane set too low will result in rapid-travel crashes into the workpiece or fixtures without any warning from the system.", category: "safety", tags: ["hypermill", "clearance-plane", "collision", "rapid", "safety"], confidence: 95, source: "document:hypermill-manual-en-4@p759", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-004", title: "Use Optimised Roughing for HSC-compatible 3D roughing", body: "hyperMILL Optimised Roughing generates highly efficient toolpaths that reduce direction changes for high-speed cutting. It auto-detects rectangular and circular pocket shapes, uses stock model geometry for minimal air cutting, and generates resulting stock for subsequent rest machining. Preferred over Arbitrary Stock Roughing for most 3D roughing operations.", category: "speeds_feeds", tags: ["hypermill", "roughing", "hsc", "3d", "toolpath-optimization"], confidence: 90, source: "document:hypermill-manual-en-4@p773", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-005", title: "Z Level Finishing adapts stepdown to surface steepness", body: "hyperMILL Z Level Finishing automatically adapts vertical stepdown values to the surface flow. For steep surfaces, this avoids unnecessary fine infeed increments and guarantees optimal line distance. Use Z Level for surfaces with wall angles above 45 degrees. For mixed steep/flat areas, use Complete Finishing which combines Z-level with pocket-shaped flat area machining.", category: "surface_finish", tags: ["hypermill", "finishing", "z-level", "steep", "scallop-height"], confidence: 88, source: "document:hypermill-manual-en-4@p889", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-006", title: "Equidistant Finishing for best HSM surface quality", body: "hyperMILL Equidistant Finishing provides constant infeed on the surface, making it particularly suitable for high-speed milling. It machines equidistantly within a closed guide curve or flowing between two guide curves. The constant surface step ensures uniform scallop height across freeform surfaces.", category: "surface_finish", tags: ["hypermill", "finishing", "equidistant", "hsm", "surface-quality", "scallop"], confidence: 88, source: "document:hypermill-manual-en-4@p915", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-007", title: "Boundary curve minimum distance rule", body: "When defining machining boundaries in hyperMILL 3D cycles, the minimum distance between the boundary curve and the actual machining area should be the cutter radius plus the machining allowance. Boundaries that are too close to the machining area cause tool overtravel and potential collision.", category: "setup", tags: ["hypermill", "boundary", "machining-area", "cutter-radius", "allowance"], confidence: 90, source: "document:hypermill-manual-en-4@p761", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-008", title: "Avoid overlapping machining areas to prevent tool marks", body: "In hyperMILL 3D machining, machining areas should not overlap and should not be too close together. Overlapping boundaries cause steps and tool marks at the boundary intersection. If areas must be adjacent, combine them into one machining area. Independent areas with the same direction, strategy, tool, and frame orientation can be machined together in one cycle.", category: "surface_finish", tags: ["hypermill", "boundary", "overlap", "tool-marks", "3d-machining"], confidence: 88, source: "document:hypermill-manual-en-4@p761", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-009", title: "Negative allowance constraints prevent nose-diving", body: "When using negative stock allowances in hyperMILL: (1) sum of negative allowance + tool corner radius must NOT be negative, (2) flat end mills are NOT allowed with negative allowances, (3) surface gaps must not exceed 2x(tool radius + negative allowance). Violating these constraints causes tool nose-diving into the workpiece.", category: "safety", tags: ["hypermill", "allowance", "negative", "nose-diving", "tool-safety"], confidence: 92, source: "document:hypermill-manual-en-4@p757", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-010", title: "Only round inserts for turning High Performance Mode", body: "In hyperMILL millTURN module, High Performance Mode (hyperMILL MAXX Machining) for turning jobs ONLY permits tools with round inserts. Diamond, square, trigon, and other insert shapes are not allowed in HPM. Verify insert type before enabling this mode.", category: "tooling", tags: ["hypermill", "turning", "hpm", "round-insert", "millturn"], confidence: 92, source: "document:hypermill-manual-en-2@p303", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-011", title: "Ascending/descending infeed reduces insert wear in turning", body: "In hyperMILL turning roughing, the Ascending and Descending infeed options vary the cutting depth between passes. This changes the intervention point of the insert into the material each pass, distributing wear across the cutting edge. Particularly important when using ceramic inserts which are sensitive to repeated impact at the same point.", category: "tooling", tags: ["hypermill", "turning", "infeed", "tool-wear", "ceramic", "insert-life"], confidence: 85, source: "document:hypermill-manual-en-2@p307", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-012", title: "Chipbreak Z controls chip length in turning", body: "hyperMILL Chipbreak Z parameter controls chip break and removal during turning. It specifies the Z-direction infeed length after which the tool stops (dwell time or rotations). Use shorter chipbreak values for harder materials. Enable Use Sections for long workpieces to improve stability by dividing the cut into segments.", category: "speeds_feeds", tags: ["hypermill", "turning", "chipbreak", "chip-control", "stability"], confidence: 85, source: "document:hypermill-manual-en-2@p308", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-013", title: "Update rest material cycle when reference tool changes", body: "In hyperMILL 2D machining, if the tool diameter is changed in the milling cycle that generates rest material, the corresponding rest material cycle MUST also be updated. Failure to update creates a mismatch where the rest machining cycle assumes the previous tool size, risking tool plunge into material at full depth.", category: "safety", tags: ["hypermill", "rest-machining", "tool-change", "plunge-risk", "2d-milling"], confidence: 90, source: "document:hypermill-manual-en-3@p638", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-014", title: "Pocket milling tool must not match geometry exactly", body: "In hyperMILL 2D Pocket Milling, ensure the tool is only in contact with the model geometry on one side. The tool diameter must NOT correspond exactly with the model geometry to be machined. An exact match causes full-width engagement on both sides simultaneously, leading to excessive cutting forces and potential tool breakage.", category: "tooling", tags: ["hypermill", "pocket", "tool-diameter", "engagement", "2d-milling"], confidence: 88, source: "document:hypermill-manual-en-3@p639", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-hm-015", title: "No double or superimposed surfaces in 3D milling areas", body: "hyperMILL 3D milling surfaces must not contain any double or superimposed surfaces. Also, boundary areas and edges of milling surfaces must not contain surfaces the tool cannot access (like narrow slots). These conditions cause unpredictable toolpath behavior including nose-diving. Clean up CAD geometry before CAM programming.", category: "setup", tags: ["hypermill", "surface-cleanup", "cad-prep", "3d-milling", "nose-diving"], confidence: 88, source: "document:hypermill-manual-en-4@p761", created_at: "2026-03-03", usage_count: 0 },

  // --- hyperMILL v33 CAM Manual deep enrichment ---
  { id: "TK-DL-hm-016", title: "Adaptive Pocket in Optimized Roughing auto-detects pocket shapes", body: "hyperMILL v33 Optimized Roughing with Adaptive Pocket strategy automatically identifies rectangular, circular, and ring pocket shapes and fits optimized toolpaths. This enables higher feedrates, reduces direction changes, and produces HSC-compatible paths. The system uses 4 feedrate zones: Fullcut (initial material entry), Normal, Reduced (before corners), and Clearance (infeed movements). Set Normal feedrate higher than default Feedrate XY for best throughput.", category: "speeds_feeds", tags: ["hypermill", "optimized-roughing", "adaptive-pocket", "hsc", "feedrate-zones", "v33"], confidence: 92, source: "document:hypermill-cam-v33@p814-819", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-017", title: "Use Max Step Height for efficient sloped wall roughing", body: "In hyperMILL v33 Optimized Roughing, enable Max Step Height for parts with sloped walls and flat transitions. After the initial vertical stepdown, remaining material on inclined walls is removed bottom-to-top in increments of the max step height. Actual step height = vertical stepdown / ceil(vertical stepdown / max step height). Example: stepdown=7mm, max step=2mm → actual=1.75mm. This avoids excess rest material on slopes.", category: "speeds_feeds", tags: ["hypermill", "roughing", "max-step-height", "sloped-walls", "v33"], confidence: 90, source: "document:hypermill-cam-v33@p821", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-018", title: "Fullcut max stepdown limits plunge angle in Adaptive Pocket Only", body: "When using hyperMILL Adaptive Pocket Only mode, the Fullcut max stepdown parameter limits the maximum stepdown during full-width cuts (tool entering material). If this value is smaller than the vertical stepdown, the full cut is split into multiple planes. Use Reduce feedrate during full cut to protect the tool from high cutting forces during initial plunge.", category: "speeds_feeds", tags: ["hypermill", "adaptive-pocket", "fullcut", "plunge-angle", "tool-protection", "v33"], confidence: 90, source: "document:hypermill-cam-v33@p819", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-019", title: "5X strategies: prefer Center Point tool reference for smooth paths", body: "In hyperMILL 5X machining, set the tool reference point to Center Point (not Tip) on the Tool dialog page. For strong tilting movements between two points, the center point path produces considerably smoother motion than a tip reference path. This reduces axis jerk and improves surface finish in simultaneous 5-axis operations.", category: "surface_finish", tags: ["hypermill", "5-axis", "tool-reference", "center-point", "smooth-path", "v33"], confidence: 92, source: "document:hypermill-cam-v33@p1065", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-020", title: "5X collision avoidance automatically modifies tilt angles", body: "hyperMILL 5X cycles automatically modify the defined tilt angle if a potential collision of the tool tip or holder is detected. If no collision-free tilt angle exists, the toolpath stops at the collision point. Always define tool holder dimensions generously since collision check only validates against model geometry, not actual stock material.", category: "safety", tags: ["hypermill", "5-axis", "collision-avoidance", "tilt-angle", "holder", "v33"], confidence: 93, source: "document:hypermill-cam-v33@p1060", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-021", title: "5X tension-release rotations are NOT collision-checked", body: "CRITICAL SAFETY: In hyperMILL 5X machining on machines with non-endless rotary axes, tension-release rotations (axis unwinding) are NOT collision checked. The entire sequence — retract from workpiece, tension-release rotation, and re-approach — is unchecked. OPEN MIND recommends defining toolpaths to avoid tension-release rotations entirely, even if it means splitting geometry into multiple jobs.", category: "safety", tags: ["hypermill", "5-axis", "tension-release", "collision-safety", "rotary-axis", "v33"], confidence: 95, source: "document:hypermill-cam-v33@p1062", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-022", title: "Max angle increment must match controller RTCP capability", body: "In hyperMILL 5X cycles, the max angle increment parameter restricts the permissible tool inclination change between two points. This value AND the max G1 segment length depend on the interpolation capability of the controller's RTCP (or equivalent) function. Setting this too high for the controller causes jerky motion or crashes. Consult controller docs for interpolation limits.", category: "setup", tags: ["hypermill", "5-axis", "angle-increment", "rtcp", "controller", "interpolation", "v33"], confidence: 93, source: "document:hypermill-cam-v33@p1061", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-023", title: "hyperMILL tool technology uses material × cutter-material × usage matrix", body: "hyperMILL v33 tool database organizes cutting parameters in a 3D matrix: Material (workpiece) × Cutter Material (tool substrate) × Usage (roughing/finishing/etc). Each combination stores RPM, feedrate XY, axial feedrate, reduced feedrate, fz, Vc, ae, ap, and cutting direction. Formulas (Vc-based RPM, fz-based feedrate) can be defined per combination. This maps directly to PRISM's strategy DB structure.", category: "tooling", tags: ["hypermill", "tool-database", "technology", "material-matrix", "cutting-parameters", "v33"], confidence: 90, source: "document:hypermill-cam-v33@p1499-1506", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-024", title: "Max angle for reduced feedrate controls steep-surface speed", body: "In hyperMILL tool technology, the 'Max angle for reduced feedrate' parameter sets the threshold angle between the surface normal and tool axis. Surfaces below this angle use normal Feedrate XY; surfaces at or above this angle use the Reduced feedrate. Set to 45° for typical finishing. This prevents excessive cutting forces on steep walls where effective chip load increases.", category: "speeds_feeds", tags: ["hypermill", "reduced-feedrate", "steep-surface", "angle-threshold", "finishing", "v33"], confidence: 88, source: "document:hypermill-cam-v33@p1501", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-025", title: "hyperMILL Python API job type codes for CAM automation", body: "hyperMILL v33 Python API (om.cam.core) uses job type codes: Slr3=3D Optimized Roughing. Access via GetCamEntities(CamEntityFilter.ALL_CYCLE_JOBS), filter by job.JobType. Object model: CamModel→JobListSet→JobList→Job. Tools via CamEntityFilter.ALL_TOOLS. Each job has ID, Name, JobType, UUID, JobList reference. Use for automated toolpath analysis and parameter extraction.", category: "setup", tags: ["hypermill", "python-api", "automation", "job-type", "cam-core", "v33"], confidence: 88, source: "document:hypermill-py-cadcam-api@p304-306", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-026", title: "3D path compensation requires special postprocessor", body: "hyperMILL 3D path compensation output (cutter compensation in 3D) requires a specially adjusted postprocessor. Without this adjustment, the NC program CANNOT correct the output, potentially damaging the component and machine if the actual tool differs from the programmed tool. Max compensation value should be ≤10% of cutter diameter. Contact OPEN MIND for postprocessor adjustment.", category: "safety", tags: ["hypermill", "path-compensation", "postprocessor", "cutter-comp", "3d", "v33"], confidence: 95, source: "document:hypermill-cam-v33@p813", created_at: "2026-03-07", usage_count: 0 },

  // --- hyperMILL TOOL Builder, Virtual Tool, VIRTUAL Machining Center ---
  { id: "TK-DL-hm-027", title: "Virtual Tool Editor automates tool selection with SQL queries and decision tables", body: "hyperMILL Virtual Tool (VT) Editor defines automated tool search rules as XML. The pipeline: Pre-action (calculations/variable setup) → Search filter (SQL queries against tool DB with AND/OR logic) → Selection priority (MIN/MAX/SEQUENCE/CONDITION ranking) → Post action (found/not-found handling). Decision tables map machine × material → tool folder/parameters. All search filters are sent as SQL queries — use LIKE with % wildcards for partial name matching. VT definitions are reusable across macros.", category: "tooling", tags: ["hypermill", "virtual-tool", "automation", "sql", "decision-table", "tool-selection"], confidence: 90, source: "document:hypermill-virtual-tool-v33@p6-13", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-028", title: "VT Selection Priority: order matters — tools are eliminated after each rule", body: "In hyperMILL Virtual Tool selection priority, rules are applied sequentially and tools not meeting each criterion are removed from the candidate list. Order is critical: MIN(diameter) first keeps the smallest tool; MIN(length) first keeps the shortest. After each rule, non-matching tools are deleted. At least one tool always survives. If multiple remain after all rules, the first in the list is used. Use SEQUENCE for folder preference ordering (folder1|folder2|folder3).", category: "tooling", tags: ["hypermill", "virtual-tool", "selection-priority", "min-max", "sequence", "tool-search"], confidence: 88, source: "document:hypermill-virtual-tool-v33@p8-10", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-029", title: "VT collision check only works for hole machining, not milling", body: "hyperMILL Virtual Tool collision check during automated tool selection is ONLY possible for hole machining operations (drilling, reaming, tapping) where probing points and machining depth are known. For milling operations, collision checking would require calculating NC paths first and checking each point — not feasible for performance reasons. Always verify milling tool clearance manually or via VIRTUAL Machining Center simulation.", category: "safety", tags: ["hypermill", "virtual-tool", "collision-check", "drilling", "hole-machining"], confidence: 92, source: "document:hypermill-virtual-tool-v33@p6", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-030", title: "TOOL Builder holder orientation: Z-axis coaxial to spindle, X-axis per taper type", body: "hyperMILL TOOL Builder defines tool holder orientation standards: Z-axis always coaxial to main flange pointing toward spindle. X-axis alignment varies by taper: BT→center of slot (symmetrical), SK→center of flattest slot on notch side, CAT→center of flattest slot, HSK→center of flattest slot on notch side, CAPTO→Y-axis toward center of reference notch, KM→Y-axis through hole axis toward recess, KM4X→X-axis through center of lower slots toward notch. Upper coupling defined at flange depth (SK/CAT: 3.2mm above flange upper side).", category: "tooling", tags: ["hypermill", "tool-builder", "holder-orientation", "taper", "hsk", "bt", "cat", "capto"], confidence: 93, source: "document:hypermill-tool-builder-v33@p5-7", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-031", title: "Best Fit alignment eliminates manual part alignment using probing protocol", body: "hyperMILL VIRTUAL Machining Center Best Fit function automatically calculates optimal part positioning from 3D point probing data. Workflow: CAM programming with 3D Point Probing cycle → machine probing generates protocol (.ompr/.txt) → import protocol into VMC → Best Fit calculates optimal origin shift → collision check → optional NC Optimizer → approve NC files. Minimizes distance either along surface normals or as 3D point distance. Individual axes can be locked. Eliminates time-consuming manual alignment for castings, 3D prints, and forged stock.", category: "setup", tags: ["hypermill", "best-fit", "probing", "alignment", "virtual-machining", "origin-shift"], confidence: 93, source: "document:hypermill-vmc-v33@p12-15", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-032", title: "VMC collision check tolerance must be ≤ half tool diameter", body: "CRITICAL: In hyperMILL VIRTUAL Machining Center collision check options, the tolerance values for permissible tool-to-part and tool-to-stock contact must be no larger than HALF the tool diameter. OPEN MIND explicitly recommends this limit. Check options include: tool vs model, holder/shaft/core vs model, tool vs stock, G0 rapid checks. Part allowance can use job settings or manual override. Use negative allowance for chamfer milling. Always check ALL available elements before approving — unchecked elements show as red strikethrough in approval report.", category: "safety", tags: ["hypermill", "collision-check", "tolerance", "virtual-machining", "nc-approval", "v33"], confidence: 95, source: "document:hypermill-vmc-v33@p22-25", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-033", title: "NC file approval requires collision check — no exceptions", body: "hyperMILL VIRTUAL Machining Center enforces a strict NC approval workflow: NC files are NOT available by default → collision check must run → green button = no collisions (approved) → red = collision/gouge detected (blocked) → yellow = contact/warning (can be overridden). Collision = any element interference (cannot approve). Gouge = cutting area violating part (cannot approve). Contact = permitted tool tip violation within tolerance (can approve with override). A 180° rotation or rotary axis rotation >7.5° also blocks approval.", category: "safety", tags: ["hypermill", "nc-approval", "collision-check", "virtual-machining", "gouge", "v33"], confidence: 95, source: "document:hypermill-vmc-v33@p28-29", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-034", title: "CONNECTED Machining performs consistency checks before NC transfer", body: "hyperMILL CONNECTED Machining connects VMC to Heidenhain or Siemens controllers for bidirectional data exchange. Before running NC programs, it performs consistency checks: origin table, tool table, and machine configuration must match between CAM and controller. Errors (red) block program loading. Warnings (yellow) allow loading with confirmation. The system transfers NC programs, reads probing protocols for Best Fit, and can control machine feedrate/spindle/program execution remotely. Supports Heidenhain (IP-based) and Siemens (IP + key + config file) connections.", category: "setup", tags: ["hypermill", "connected-machining", "consistency-check", "heidenhain", "siemens", "nc-transfer", "v33"], confidence: 90, source: "document:hypermill-vmc-v33@p44-46", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-035", title: "VMC axis analysis detects unusual movements before machine run", body: "hyperMILL VIRTUAL Machining Center Analysis mode provides graphical display of all machine axis movements (X/Y/Z linear + A/B rotary) plus feedrate and spindle speed over the entire toolpath. Collision areas are highlighted in red. Hovering over axis buttons shows min/max travel values. Use Delta mode to show differences between blocks (catches sudden jumps). Breakpoints can be set with conditions (axis position, tool number, etc.) and 'stop N steps before event' for pre-event speed reduction. Essential for catching unexpected rapid moves or axis limit violations before production.", category: "setup", tags: ["hypermill", "axis-analysis", "simulation", "breakpoints", "virtual-machining", "v33"], confidence: 88, source: "document:hypermill-vmc-v33@p39-42", created_at: "2026-03-07", usage_count: 0 },

  // --- hyperMILL v33 CAM Manual (3D strategies) + AUTOMATION Center ---
  { id: "TK-DL-hm-036", title: "High Performance Roughing requires fillet radius ≥5% of tool diameter", body: "hyperMILL High Performance Roughing (separate license) provides constant tool load with dynamic feedrates, always climb milling, and trochoidal movements for narrow areas. CRITICAL: the Fillet radius parameter must be at least 5% of the tool diameter. Opening Cut mode allows full-width entry in narrow areas; Side Mill Only mode forces trochoidal-only (no full cuts). Dense area stepover factor reduces lateral infeed in narrow zones. All movements output as G1 (no G2/G3). Min pocket size = tool diameter + 2× fillet radius.", category: "speeds_feeds", tags: ["hypermill", "high-performance-roughing", "fillet-radius", "trochoidal", "dynamic-feedrate", "v33"], confidence: 93, source: "document:hypermill-cam-v33@p825-828", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-037", title: "Plane level detection: use Optimized-complete to match roughing to part geometry", body: "hyperMILL Optimized Roughing plane level detection has 3 modes: Off (fixed stepdown ignoring part surfaces), Automatic (inserts intermediate steps at planar surfaces across full machining area), Optimized-complete (inserts intermediate steps only at planar surface locations, not full area). Use Optimized-complete for parts with multiple flat levels at different heights — it adds steps only where needed, reducing air cutting while ensuring flat surfaces get proper cleanup passes.", category: "speeds_feeds", tags: ["hypermill", "roughing", "plane-level-detection", "stepdown", "optimization", "v33"], confidence: 90, source: "document:hypermill-cam-v33@p824", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-038", title: "Boundary tool reference modes: Past avoids nose-diving in cavities", body: "hyperMILL boundary tool reference defines how far the tool extends relative to boundary curves. To = tool shank touches boundary (exact, may leave unmachined areas). On = tool axis on boundary. Past = tool axis leaves boundary until shank clears (no nose-diving in cavities). Contact = tool stays until no surface contact (complete machining but risk of nose-diving without neighbor surfaces). For raised surfaces use Past mode. For cavities use Past to prevent nose-diving. Smooth Overlap option adds a blending zone for high surface quality at boundary edges.", category: "setup", tags: ["hypermill", "boundary", "tool-reference", "nose-diving", "cavity", "surface-quality", "v33"], confidence: 90, source: "document:hypermill-cam-v33@p852-853", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-039", title: "AUTOMATION Center hole feature recognition uses frame limits for auto job-list assignment", body: "hyperMILL AUTOMATION Center automatically assigns hole machining jobs to joblists based on feature orientation. Frame limits define permissible B-axis (Y direction) and C-axis (Z direction) angle ranges. Three frame creation modes: 2D (separate feature list per hole direction with assigned frame), 5X (all features combined in one list, no frame), Mixed (groups same-direction holes with frames, combines others without). Tolerance parameter controls geometric data transfer accuracy. Use 'Fit feature to start stock' to auto-adjust hole depths to actual stock.", category: "setup", tags: ["hypermill", "automation-center", "hole-feature", "frame-limits", "joblist", "feature-recognition"], confidence: 88, source: "document:hypermill-ac-v33@p306-310", created_at: "2026-03-07", usage_count: 0 },

  // --- hyperMILL video tutorials (transcript-extracted, cleaned) ---
  { id: "TK-DL-hm-040", title: "Project Assistant automates initial CAM setup: model → stock → NCS → frame → post", body: "hyperMILL Project Assistant (right-click Jobs → New → Project Assistant) automates the entire initial setup workflow in sequence: (1) select model/workpiece and process type (milling or mill-turn), (2) define NCS orientation (workpiece zero point), (3) define stock dimensions with per-axis offsets, (4) set NC position (machine zero), (5) define safety frame clearances, (6) name job list and select material + machine + post processor. This replaces manual job list creation and ensures all required parameters are configured before programming begins.", category: "setup", tags: ["hypermill", "project-assistant", "setup", "workflow", "job-list", "automation"], confidence: 85, source: "video:hypermill-project-assistance@0-1576s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-041", title: "NCS orientation: 3 methods — workplane origin, face-normal, or 3-point pick", body: "hyperMILL NCS (Numerical Control System) orientation for workpiece zero can be defined three ways: (1) Workplane — uses the CAD model origin as-is, (2) Face — select any planar face and Z-axis becomes perpendicular to it (useful for angled setups), (3) Three Points — pick origin point, then X-direction point, then Y-direction point. The X-axis can be aligned to any edge or rotated by entering a specific angle. Use Invert to flip Z-axis direction (e.g., for bottom-side machining). Face mode is most common for simple 3-axis work.", category: "setup", tags: ["hypermill", "ncs", "workpiece-zero", "coordinate-system", "orientation", "face-selection"], confidence: 85, source: "video:hypermill-project-assistance@180-500s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-042", title: "Stock definition: enter total dimension and hyperMILL auto-splits offset per side", body: "In hyperMILL Project Assistant stock definition, enter the total stock dimension (e.g., 86mm for an 80mm model) and the system automatically distributes the offset equally on both sides (3mm + 3mm). You can lock one side to zero for asymmetric stock (e.g., no stock on bottom Z for table-mounted parts). Stock is defined per axis (X length, Y width, Z height) with independent positive/negative offsets. For prismatic parts use rectangular stock; for turning use cylindrical. The red boundary box shows the material to be removed.", category: "setup", tags: ["hypermill", "stock", "raw-material", "offset", "prismatic", "dimensions"], confidence: 85, source: "video:hypermill-project-assistance@700-1000s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-043", title: "NC Position: set machine zero relative to model or stock at corner/center/Z-top", body: "hyperMILL NC Position defines where the machine zero point sits on the workpiece. Two modes: User-defined (manual coordinates) or Basic Position (automatic). Basic Position can reference the Model or Stock geometry, with options for X/Y placement (corner positions or center) and Z height (top, middle, or bottom). For milling, Z-top of stock with XY at a corner is most common — matches typical shop-floor touch-off practice.", category: "setup", tags: ["hypermill", "nc-position", "machine-zero", "touch-off", "work-offset"], confidence: 85, source: "video:hypermill-project-assistance@1000-1200s,video:imts-basic-setup@65-183s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-044", title: "Safety frame: default 30mm clearance on all axes, reference to stock preferred", body: "hyperMILL frame defines the safe retract zone around the workpiece. Default is 30mm clearance on all six sides (±X, ±Y, ±Z). Can be set relative to Model or Stock — stock-relative is safer since it accounts for extra material. Deselecting the 'all axes' toggle allows Z-only clearance (less safe). The frame appears as a red box in the 3D view and defines where rapid moves are safe. Top/bottom/left/right/front/back frames are generated automatically from these values.", category: "setup", tags: ["hypermill", "frame", "safety-clearance", "retract", "rapid-moves", "collision"], confidence: 85, source: "video:hypermill-project-assistance@1200-1350s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-045", title: "hyperMILL interface: 6 key toolbars — hyperMILL, Model, Visibility, Coordinates, View, Drafting", body: "hyperMILL interface has configurable toolbars accessed via right-click on the toolbar area. Essential toolbars: (1) hyperMILL toolbar (left side) — primary CAM operations, simulation, tool management; (2) Model toolbar — shows feature tree/history of workpiece geometry; (3) Visibility toolbar — layer colors showing element counts per type; (4) Coordinates — coordinate system display; (5) View toolbar — standard views (top/front/left/right/back/bottom/isometric); (6) Drafting — 2D drawing tools. The hyperMILL toolbar is the most critical — keep it docked on the left.", category: "setup", tags: ["hypermill", "interface", "toolbar", "layout", "customization", "workspace"], confidence: 82, source: "video:hypermill-day1-interface@600-1200s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-046", title: "Mouse navigation: right-click=rotate, scroll=zoom, hold-scroll=pan", body: "hyperMILL 3D viewport mouse controls: Right-click and drag to rotate the view (orbit). Scroll wheel to zoom in/out. Hold (press) the scroll wheel and drag to pan. These three operations handle all viewport navigation. Alternatively, use the Pan/Zoom/Rotate toolbar buttons, but mouse shortcuts are faster. The Fit button (or equivalent toolbar icon) resets the view to show the entire workpiece.", category: "setup", tags: ["hypermill", "mouse", "navigation", "viewport", "rotate", "zoom", "pan"], confidence: 82, source: "video:hypermill-day1-interface@300-500s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-047", title: "View modes: wireframe, shaded, shaded+edges (most useful), edge-only, dashed hidden lines", body: "hyperMILL display modes for the 3D viewport: Wireframe (edges only, see-through), Shaded (solid faces no edges), Shaded with Edges (most commonly used — solid faces with visible edge lines), Shaded with Dashed hidden lines (invisible edges shown as dashed), Edge-only (no shading), Edge with dashed hidden lines. Use Shaded+Edges for general CAM work. Use Wireframe to inspect internal features. Hide/Unhide individual faces to see inside cavities without switching to wireframe.", category: "setup", tags: ["hypermill", "view-modes", "wireframe", "shaded", "display", "visualization"], confidence: 82, source: "video:hypermill-day1-interface@700-900s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-048", title: "CAD import: hyperMILL reads STEP, NX, IGES, Parasolid, CATIA, and native formats", body: "hyperMILL supports importing CAD models from multiple formats via File → Open: native hyperMILL format, STEP (.stp/.step — most universal), Siemens NX, IGES, Parasolid, CATIA, and others. STEP is the recommended interchange format when exporting from other CAD systems (NX, SolidWorks, Fusion 360). After import, the model appears in the 3D viewport and the Model browser shows the feature/face count (e.g., 164 features). The model is automatically selected when opening Project Assistant.", category: "setup", tags: ["hypermill", "cad-import", "step", "nx", "file-formats", "interoperability"], confidence: 82, source: "video:hypermill-day1-interface@200-350s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-049", title: "hyperMILL browser tree: Tools, Frames, Models, Features, Macros, Jobs — start with Jobs", body: "The hyperMILL browser (left panel) organizes the CAM project into six categories: Tools (cutting tools and holders), Frames (coordinate systems and safety zones), Models (imported CAD geometry), Features (recognized machining features like holes, pockets), Macros (saved operation templates), and Jobs (machining operations and job lists). New projects start by right-clicking Jobs to create a new job list via the Project Assistant. The browser is the primary navigation for all CAM operations.", category: "setup", tags: ["hypermill", "browser", "project-tree", "jobs", "tools", "features", "organization"], confidence: 82, source: "video:hypermill-day1-interface@1400-1505s,video:hypermill-project-assistance@200-300s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-050", title: "IMTS workflow: Project Assistant → NCS align to top-Z + long-side-X → auto stock → material + machine → program", body: "Demonstrated IMTS 2022 workflow for quick hyperMILL setup: (1) New → Project Assistant (not manual job list), (2) select milling product (part model), (3) choose milling or mill-turn, (4) orient NCS — align Z to top face, X to longest edge of part, (5) enter stock dimensions — system auto-splits offsets evenly, set Z offset for facing allowance, (6) set NC position (Z-top, basic mode), (7) create orthogonal frame from stock, (8) select material and machine (e.g., C22), (9) click OK — job list auto-populates with NCS, stock, milling area, and post processor ready for toolpath programming.", category: "setup", tags: ["hypermill", "imts", "quick-setup", "project-assistant", "workflow", "best-practice"], confidence: 85, source: "video:imts-basic-setup@6-210s", created_at: "2026-03-07", usage_count: 0 },

  // --- hyperMILL v33 database, Virtual Tool, Automation Center server docs ---
  { id: "TK-DL-hm-051", title: "SQL Tool DB requires DSN for multi-user mode", body: "SQLite (*.db) databases cannot be used in multi-user mode. Only databases opened via *.dsn files support concurrent access. Use SQL Server Native Client XX.X driver — never the generic 'SQL Server' driver, which cannot transfer more than 400 kB and will fail when storing 3D tool geometries. If the PWD entry is missing from the generated .dsn file, add it manually with a text editor.", category: "setup", tags: ["hypermill", "tool-database", "sql-server", "multi-user"], confidence: 92, source: "document:SQL Tool Database Manual", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-052", title: "Tool DB migration preserves tool links with 'Yes' flag", body: "When importing tools into a new SQL Server database version, answer 'Yes' to 'Is this import part of a database migration to a new version?' This preserves tool links in existing hyperMILL documents that referenced the old database, preventing broken tool references across all jobs. Supported import formats: ODBC (*.dsn), SQLite (*.db), and neutral exchange (*.xml).", category: "setup", tags: ["hypermill", "tool-database", "migration", "data-integrity"], confidence: 90, source: "document:SQL Tool Database Manual", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-053", title: "Macro DB multi-user: create/edit is single-user only", body: "In SQL Server macro databases, creating and editing macros cannot be done by multiple users simultaneously — this applies to both standard and SQL databases. However, applying macros (Macros → Apply macros) works concurrently. Export macros as *.omx format before version upgrades, then import into the new SQL database.", category: "setup", tags: ["hypermill", "macro-database", "multi-user", "collaboration"], confidence: 88, source: "document:SQL Macro Database Manual", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-054", title: "Tool DB sync service supports multiple network instances", body: "The synchronization service (omTdbServiceUi.exe) can sync multiple exchange folder + database pairs across a network. Use 'Account' option (not 'Local service') when syncing databases on different machines. Enable 'P' (Preserve) column to keep folder structure during XML import. Enable 'S' (Slave) column to write-protect the OPEN MIND database so only the sync service can modify it. Multiple exchange folders can sync into one database, but one folder cannot serve multiple databases.", category: "setup", tags: ["hypermill", "tool-database", "synchronization", "network"], confidence: 91, source: "document:Synchronization Tool Database Manual", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-055", title: "Virtual Tool (VT) search filter system for macro automation", body: "Virtual Tools decouple macros from specific tool databases using ID-based search filters in .vtx XML files. The .vtx file must share the same name and location as the macro database. Three DB modes exist: DB (direct reference), DB+Auto (auto-calc length from hole data), DB+Auto+ (auto-calc diameter+length). Use RuleFilter with conditions for conditional diameter mapping. Multiple RuleFilters combine with AND logic.", category: "tooling", tags: ["hypermill", "virtual-tool", "macro", "automation"], confidence: 93, source: "document:Virtual Tool Format Reference", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-056", title: "VT SelectPriority controls tool selection when multiple match", body: "When multiple tools match a Virtual Tool search filter, use SelectPriority with four strategy types: Min (smallest value first), Max (largest value first), Sequence (sort by named values, e.g., 'VHM|HSS'), Condition (matching tools first). Strategies cascade — if first strategy yields ties, the next strategy breaks them. Use 'NCTool.UsableLength|NCTool.ClearanceLength' syntax for fallback. Can be global (in Settings) or per-VirtualTool.", category: "tooling", tags: ["hypermill", "virtual-tool", "tool-selection", "optimization"], confidence: 94, source: "document:Virtual Tool Format Reference", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-057", title: "VT PostSearchActions for conditional job parameter override", body: "Virtual Tool PostSearchActions fire after tool search completes, with ToolFound and ToolNotFound branches. Use SetJobCfg to override job parameters — when overriding formula-driven parameters, you must also clear the formula CFG (suffix '_F'). Use NCTool.Folder conditions to detect tool categories and set behavior accordingly. For hidden CFG parameters, export the job and inspect the file.", category: "tooling", tags: ["hypermill", "virtual-tool", "job-config", "macro"], confidence: 90, source: "document:Virtual Tool Format Reference", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-058", title: "VT debug files for troubleshooting tool search", body: "Two debug files in 'Global Working Space\\tmp' folder help diagnose Virtual Tool definition errors: virtualToolMap.xml shows the complete search result mapping, and macroConfigurator.log contains logging information including the actual tool search conditions used. Check these files when VT searches return unexpected tools or no results.", category: "tooling", tags: ["hypermill", "virtual-tool", "debugging", "troubleshooting"], confidence: 89, source: "document:Virtual Tool Format Reference", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-059", title: "Custom tool reports via XLSX template duplication", body: "To create custom tool reports: copy OM_REPORT_2 folder from ADDINS\\hmAutoColor\\SYSTEM_PROCESS\\Reports\\ToolReports to AUTOMATION\\REPORTS\\toolReports\\report_templates\\. Rename folder and files to your report name. In the ToolReport xlsx, Header and Tool Part Definition tabs control field mapping — only use existing parameters from column B, do not change rows, customize cell addresses in column C.", category: "setup", tags: ["hypermill", "tool-report", "setup-sheet", "customization"], confidence: 87, source: "document:Tool Report Customization", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-060", title: "AC Server mode: watch folder + batch mode for unattended runs", body: "AUTOMATION Center can run as a server service using PWserverStart.exe. Configure via PWserver.exe: set watch folder (must be network-accessible to all clients), project number (script to execute), priority, and file type. Scripts MUST have no user interaction or the server will hang. Enable 'Batch mode' function in scripts to automatically skip all message boxes. Clients trigger execution via 'Start script on server' or by copying files to the watch folder.", category: "setup", tags: ["hypermill", "automation-center", "server", "batch-processing"], confidence: 91, source: "document:Running AC in Server", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-061", title: "Server-side calculation with separate project path", body: "For server-side toolpath calculation in AUTOMATION Center: create a dedicated calculation folder, use 'Set project path' to redirect calculation output there, run milling/calculation procedures, then copy results to the target/outgoing folder. Use 'Path of model' function to update the hyperMILL model path in settings, then save. This workflow isolates calculation artifacts from final deliverables.", category: "setup", tags: ["hypermill", "automation-center", "server", "calculation"], confidence: 85, source: "document:Calculation in Server", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-062", title: "Shared AC toolbar config via environment variable", body: "To standardize AUTOMATION Center toolbars across users/machines, create a Windows user environment variable named HC_ADDITIONAL_HCCONFIG with the value set to a shared network folder path containing the toolbar configuration. This enables a 'customer toolbar' option in AC configuration, ensuring all CAM programmers have consistent toolbar layouts without manual per-seat setup.", category: "setup", tags: ["hypermill", "automation-center", "toolbar", "standardization"], confidence: 86, source: "document:Customer Toolbar", created_at: "2026-03-07", usage_count: 0 },

  // --- hyperCAD-S v33 CAD Manual (622pp) — workplane, geometry repair, analysis, electrodes, probing ---
  { id: "TK-DL-hm-070", title: "Workplane On Face for 5-axis setups", body: "Use Workplane → On face to create a workplane where the Z axis aligns with the face normal at a selected point. The origin defaults to the untrimmed face midpoint — reposition via U/V parameters (0-1 range) or by snapping a point. Always enable Associative + enter a name so the WP persists and can be linked to a hyperMILL Frame.", category: "setup", tags: ["hypermill", "hypercad-s", "workplane", "5-axis"], confidence: 92, source: "document:hypercad-s-v33@p200", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-071", title: "Link associative workplane to hyperMILL Frame", body: "For multi-side machining: (1) Enable parametric modeling, (2) create a workplane with Workplane → On face using the Associative option and naming it, (3) either edit an existing frame and enable 'Associative workplane' in Frame definition, or right-click the WP and select 'Link frame to WP' to auto-create a linked frame. Ensure hyperMILL → Setup → Settings → Document → Locking → Activate is OFF before making geometry changes. This keeps CAD workplane and CAM frame synchronized automatically.", category: "setup", tags: ["hypermill", "hypercad-s", "frame", "multi-axis", "workplane"], confidence: 95, source: "document:hypercad-s-v33@p519", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-072", title: "Workplane through 3 points axis control", body: "Workplane → Through three points: Point 1 = origin, direction 1→2 = positive X axis, point 3 completes XY plane. Use the Z axis Invert option to flip Z direction (Y adjusts automatically, X stays). Use Offset to shift the WP along Z. For multi-axis setups requiring precise X-axis alignment, use the XY axis direction option to constrain an axis to a specific edge or line.", category: "setup", tags: ["hypermill", "hypercad-s", "workplane", "3-point"], confidence: 90, source: "document:hypercad-s-v33@p196", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-073", title: "Workplane on axial face/hole for drilling setups", body: "Use Workplane → On axial face / hole (v2022.1+) to create a workplane centered on a hole with Z along the center line. Select the hole face, then choose Position at Start parameter (upper edge) or End parameter (lower edge). For feature-recognized holes, select the hole feature directly. This eliminates manual center-point calculation and ensures the WP is perfectly aligned for drilling cycle programming.", category: "setup", tags: ["hypermill", "hypercad-s", "workplane", "drilling", "hole"], confidence: 93, source: "document:hypercad-s-v33@p205", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-074", title: "Redefine workplane type without recreating", body: "Right-click a saved workplane → Redefine as → select new command (On face, On curve, Through 3 points, etc.) to change how a workplane is defined without deleting and recreating it. Example: convert a free non-associative workplane into an associative one on a face. The name is reset during redefinition — reselect it from the name list to keep the same name.", category: "setup", tags: ["hypermill", "hypercad-s", "workplane", "workflow"], confidence: 88, source: "document:hypercad-s-v33@p208", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-075", title: "Check quality/healing for imported geometry", body: "Use Analysis → Check quality / healing to diagnose imported CAD problems: vertex-edge gaps, face tolerance mismatches, incorrect edge sequences, non-manifold gaps, self-intersecting boundaries, entities smaller than tolerance, and irregular parameterization. Right-click a detected issue → Healing to auto-repair if possible. Set Reference tolerance to match your machining tolerance (e.g., 0.001mm). Always run this before CAM programming on imported STEP/IGES data.", category: "quality", tags: ["hypermill", "hypercad-s", "healing", "import", "geometry-repair"], confidence: 95, source: "document:hypercad-s-v33@p177", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-076", title: "Repair open solids for CAM", body: "Use Modify → Repair open solid when Check quality/healing cannot fix a solid by tolerance adjustment alone. The tool shows purple loops around openings. TIP: Convert faces to analytical faces first (Modify → Convert to analytical) for better repair results. 'Cover openings' generates separate open-solid caps for holes — useful for closing bolt holes before roughing.", category: "quality", tags: ["hypermill", "hypercad-s", "solid-repair", "import"], confidence: 91, source: "document:hypercad-s-v33@p433", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-077", title: "Align faces orientation for correct tool position", body: "Use Modify → Align faces orientation to fix inconsistent face normals on imported data. 'Uniform orientation' → Align auto-orients the face nearest the user outward and propagates to connected faces topologically. This is critical for CAM: hyperMILL calculates tool position based on face normal vectors, so inverted normals cause the tool to cut on the wrong side.", category: "quality", tags: ["hypermill", "hypercad-s", "face-normals", "import", "toolpath"], confidence: 94, source: "document:hypercad-s-v33@p265", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-078", title: "Invert faces UV-parameter for CAM isoparameter machining", body: "Use Modify → Invert faces UV-parameter to swap or invert U/V directions on faces. Essential for CAM strategies that follow isoparametric curves (e.g., Z-level finishing, flow-line machining). Non-NURBS faces are auto-converted to NURBS (tolerance 0.001mm). Options: Invert U, Invert V, Swap U/V.", category: "design", tags: ["hypermill", "hypercad-s", "UV-parameter", "surface-editing"], confidence: 89, source: "document:hypercad-s-v33@p263", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-079", title: "Shape spherical analysis to find minimum tool diameter", body: "Use Analysis → Shape spherical to determine the smallest ball-mill that can reach all areas of a part. Set Min. radius to your smallest available tool — areas displayed in dark grey are inaccessible. Enable 'Check collisions' for accurate results considering adjacent faces. Use 'Extract curves' to generate boundary polylines for milling area delineation.", category: "tooling", tags: ["hypermill", "hypercad-s", "analysis", "tool-selection", "ball-mill"], confidence: 93, source: "document:hypercad-s-v33@p187", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-080", title: "Shape curvature analysis for radius-based tool selection", body: "Use Analysis → Shape curvature with 'Abs. min. radius' to find the smallest radii across your part geometry. To isolate concave vs convex areas, use Min. radius mode and set limits. Enable 'Skip planes' to exclude flat areas. Use 'Extract curve' with a target value equal to your tool diameter to generate boundary curves separating machinable from non-machinable regions — these curves can be used directly as CAM boundaries.", category: "tooling", tags: ["hypermill", "hypercad-s", "curvature-analysis", "tool-selection"], confidence: 91, source: "document:hypercad-s-v33@p183", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-081", title: "Barrel cutter swarf analysis workflow", body: "For barrel cutter swarf cutting analysis: (1) Enable display of Principal radius 1 and 2 in Shape curvature, (2) display global minimum radius and snap the position, (3) set Angle to match planned machining direction, (4) verify radii suit the barrel cutter, (5) adjust angle to find optimal lead angle, (6) consider changing machining direction if no safe lead angle exists. This determines if a barrel cutter can nestle against the contour collision-free.", category: "tooling", tags: ["hypermill", "hypercad-s", "barrel-cutter", "swarf-cutting", "5-axis"], confidence: 90, source: "document:hypercad-s-v33@p170", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-082", title: "Draft angle analysis for mold parting and EDM", body: "Use Analysis → Shape draft angle to analyze draft angles and mold parting lines. Set the direction to the pull direction. Fixed steps mode: set Draft angle and Transition angle to auto-generate silhouette curves at area transitions — these become parting line candidates. Use this to identify areas requiring EDM (zero or negative draft), plan electrode placement, and verify sufficient draft for ejection.", category: "design", tags: ["hypermill", "hypercad-s", "draft-angle", "mold", "EDM"], confidence: 92, source: "document:hypercad-s-v33@p178", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-083", title: "Undercut analysis for machining accessibility", body: "Use Analysis → Shape undercut to identify areas unreachable from a given tool direction. Enable 'Compute limits' for exact boundary calculation, then 'Extract curves' to generate polyline boundaries around undercut regions. Use results to plan additional setups, side machining, or identify EDM requirements.", category: "design", tags: ["hypermill", "hypercad-s", "undercut", "accessibility", "multi-axis"], confidence: 91, source: "document:hypercad-s-v33@p180", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-084", title: "V-sketch as updatable machining contour", body: "A V-sketch can serve as a machining contour in hyperMILL jobs (v2021.1+). If you later modify the V-sketch and the contour remains closed, the machining contour of the associated job updates automatically. This enables parametric boundary editing without re-selecting geometry in the CAM browser. Faces used in milling areas are locked — use 'Unlock entities' to edit them.", category: "design", tags: ["hypermill", "hypercad-s", "V-sketch", "machining-contour", "parametric"], confidence: 93, source: "document:hypercad-s-v33@p519", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-085", title: "Electrode design critical warnings", body: "CRITICAL: Electrodes are non-parametric and non-associative to TAG data. After first electrode generation, DO NOT transform: EDM workplane, electrode workplane, solids/faces within electrode group, or workpiece — these changes will NOT propagate to existing TAG values, producing incorrect documentation. Electrode geometry is always 1:1 scale.", category: "design", tags: ["hypermill", "hypercad-s", "electrode", "EDM", "warning"], confidence: 96, source: "document:hypercad-s-v33@p444", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-086", title: "Electrode holder library and optimized C angle", body: "Configure the electrode holder library (*.holders.xml) via Electrode holder editor before designing electrodes. The system auto-searches for a suitable holder by: calculating raw material X/Y from erosion face size, applying 'Optimized C angle' to rotate the holder for minimum material waste, finding the matching Z length. Set Min. block height > 0 to allow holder position rounding correction.", category: "design", tags: ["hypermill", "hypercad-s", "electrode", "holder", "raw-material"], confidence: 90, source: "document:hypercad-s-v33@p448", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-087", title: "Side electrode for inaccessible erosion areas", body: "Enable the Side electrode option when vertical erosion (Z direction) cannot reach the target area. Erode in XZ, YZ, or XYZ direction. Control joint geometry via: Joint angle (optimized = half the angle between erosion direction and Z), Min. lateral/vertical joint length. Set Lateral path length for collision avoidance. Note: rotational electrodes cannot be combined with side electrodes.", category: "design", tags: ["hypermill", "hypercad-s", "electrode", "side-electrode", "EDM"], confidence: 89, source: "document:hypercad-s-v33@p455", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-088", title: "Virtual electrodes for identical multi-position erosion", body: "For identical electrodes at multiple workpiece positions: create the master electrode, copy it to each position, convert copies to virtual electrodes with Electrode → Virtual electrode. Virtual electrodes reference the master, so changes propagate. Use Derive and milling to output each electrode as a separate *.hmc document for NC programming.", category: "design", tags: ["hypermill", "hypercad-s", "electrode", "virtual", "EDM"], confidence: 88, source: "document:hypercad-s-v33@p449", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-089", title: "Probing result analysis and trend tracking", body: "Enable 'Create logs for CAD import' in probing settings BEFORE running probing jobs. Import results via CAM → Import probing data (*.txt, *.log, *.ompr). Deviations are measured in face normal direction. The Trend tab tracks accuracy across multiple measuring logs — colored dot movement shows production accuracy drift over time. Sort by Deviation column to find worst points. Probing points can be transferred to Deform entities for alignment correction.", category: "quality", tags: ["hypermill", "hypercad-s", "probing", "quality", "measurement"], confidence: 94, source: "document:hypercad-s-v33@p562", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-090", title: "Probing points to deformation correction workflow", body: "With probing data loaded, activate Edit → Deform entities. Left-click the Nominal column header to select all target points, and Measured column header for all actual points — this bulk-selects start/target pairs for alignment correction. To transfer only out-of-tolerance points: first filter display, then select in the Contours tab. This creates a closed-loop correction workflow from probing to geometry compensation.", category: "quality", tags: ["hypermill", "hypercad-s", "probing", "deformation", "compensation"], confidence: 90, source: "document:hypercad-s-v33@p562", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-091", title: "Toolpath feedrate analysis with color map", body: "Use CAM → Toolpath properties to analyze toolpath feedrates visually. Enable 'Feedrates by color map' on the Visibility tab. Set Min/Max limits to focus analysis range — values below min display black, above max display white. Use Limit toolpath controls to restrict analysis to a specific segment. Configure tooltip content via Options to show feedrate, spindle speed, and sequential number at each point.", category: "quality", tags: ["hypermill", "hypercad-s", "toolpath", "feedrate", "analysis"], confidence: 91, source: "document:hypercad-s-v33@p506", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-092", title: "Toolpath-to-shape distance analysis for ball mills", body: "Use CAM → Analyze distance toolpath-shape to measure distances between a toolpath and part surfaces (assumes ballmill at tool center point). Set two target distances to divide the toolpath into three color-coded zones. Use Inside toolpath options (Window, Lasso, Circular) to limit analysis to specific regions. Enable 'Automatic computation' after selecting toolpath and shape entities.", category: "quality", tags: ["hypermill", "hypercad-s", "toolpath", "distance-analysis", "verification"], confidence: 89, source: "document:hypercad-s-v33@p510", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-093", title: "Create bounding box for stock model definition", body: "Use Analysis → Create bounding box to generate a cuboid or cylinder enclosing selected geometry. Enable 'Minimize volume' for optimal XY rotation fit. Output as Lines, Faces, or Solid. Enable 'Points' to generate center points on each face — useful for positioning CAM reference systems. Offset distributes evenly on both sides. Align to current workplane or select a planar face as reference.", category: "setup", tags: ["hypermill", "hypercad-s", "bounding-box", "stock", "setup"], confidence: 90, source: "document:hypercad-s-v33@p173", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-094", title: "Convert to analytical for better Boolean and repair results", body: "Use Modify → Convert to analytical to convert NURBS faces back to analytical geometry (plane, cylinder, rotational face). Set Conversion tolerance (e.g., 0.001mm). Run this before Boolean operations and Repair open solid — analytical faces produce significantly better calculation results for both operations.", category: "quality", tags: ["hypermill", "hypercad-s", "NURBS", "analytical", "conversion"], confidence: 91, source: "document:hypercad-s-v33@p261", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-095", title: "Simplify faces to reduce patch count before CAM", body: "Use Modify → Simplify to merge adjacent faces of the same type within solids: cylinder, planar, cone, rotational, NURBS. This reduces face count and eliminates unnecessary edges that can cause toolpath artifacts. Run after importing STEP/IGES models where the originating CAD system over-segments faces.", category: "quality", tags: ["hypermill", "hypercad-s", "simplify", "face-merge", "import"], confidence: 89, source: "document:hypercad-s-v33@p262", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-096", title: "Hole feature with Keep CAD features for CAM mapping", body: "When creating holes with Features → Holes, enable 'Keep CAD features' for Feature mapping (hole). This creates an associative link between the CAD hole feature and the CAM feature, so hole modifications in CAD automatically update the drilling cycle. Base mode supports max 2-step holes with parametric modeling. Advanced mode supports up to 15 steps + 10 opposite steps, conical/undercut profiles.", category: "design", tags: ["hypermill", "hypercad-s", "hole-feature", "drilling", "feature-mapping"], confidence: 92, source: "document:hypercad-s-v33@p412", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-097", title: "Shape continuities analysis for edge quality", body: "Use Analysis → Shape continuities (v2023.2+) to examine edge transitions: Gaps, Sharp edges, Tangent continuous (G1), and Curvature continuous (G2). Enable 'Create curves' to generate persistent boundary curves colored by type. Use to identify problem edges for finishing strategies and to plan where rest-material passes are needed.", category: "quality", tags: ["hypermill", "hypercad-s", "continuity", "edge-analysis", "surface-quality"], confidence: 90, source: "document:hypercad-s-v33@p182", created_at: "2026-03-07", usage_count: 0 },

  // --- hyperMILL video tutorials — vision-extracted parameters from keyframe analysis ---
  { id: "TK-DL-hm-098", title: "hyperMILL Contour Milling dialog: allowance and optimize start points", body: "In hyperMILL Contour Milling on 3D Model dialog, set Mode to 'Contour' with coordinate system Absolute (jobframe). Additional allowance defaults to 0 but can be set to values like 0.25mm for semi-finish passes. Always enable 'Optimize start points' to reduce air cutting.", category: "setup", tags: ["hypermill", "video-learned", "contour-milling", "allowance"], confidence: 85, source: "video:HyperMILL-5axis-Lesson1@40-50s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-099", title: "Chain dialog tolerances: Angular 0.5°, Linear 0.001mm", body: "The hyperMILL Chain dialog for toolpath sequencing offers modes: Stop at cross, Tangent, Minimal angle, and Shortest way. Key tolerance settings: Angular tolerance 0.5 degrees, Linear tolerance 0.001mm. Leave 'User driven' unchecked for automatic chaining. Verify total entity count matches expected contour complexity.", category: "setup", tags: ["hypermill", "video-learned", "chain-dialog", "tolerance"], confidence: 80, source: "video:HyperMILL-5axis-Lesson1@55s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-100", title: "Contour Milling depth: Top_Abs/Bottom_Abs define Z limits", body: "In T7 Contour Milling on 3D Model dialog, contour depth is controlled via Top Abs and Bottom Abs columns. Example: Top_Abs=0 and Bottom_Abs=-33 defines a 33mm deep contour cut. Additional allowance can be set independently for XY and Z. Enable 'Sort contours' and 'Optimize start points' for efficient multi-contour operations.", category: "setup", tags: ["hypermill", "video-learned", "contour-milling", "depth-limits"], confidence: 80, source: "video:HyperMILL-5axis-Lesson1@80s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-101", title: "5-Axis Frame with rotation angles A/B/C + rotation angle", body: "When setting up 5-axis work frames in hyperMILL, the Frame dialog references WCS with full rotation angles: e.g., A=0, B=90, C=-49.09 degrees plus a Rotation_angle of 45 degrees. Origin coordinates define the frame position. The dialog shows computed axis vectors confirming orientation. Critical for 3+2 indexed positioning on tilted surfaces.", category: "setup", tags: ["hypermill", "video-learned", "5-axis", "frame-definition", "coordinate-system"], confidence: 85, source: "video:HyperMILL-5axis-Lesson1@100s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-102", title: "5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish", body: "A complete 5-axis hyperMILL job typically sequences: T1 Face Milling, T12/T3 3D Arbitrary Stock Roughing, T4 Chamfer Milling on 3D Model, T2/T3 Contour Milling on 3D Model, T2/T3 3D Plane Machining, then multiple T5 Contour Milling passes at different orientations. This proven workflow ensures material removal before finishing and handles all orientations.", category: "setup", tags: ["hypermill", "video-learned", "5-axis", "job-sequence", "workflow"], confidence: 80, source: "video:HyperMILL-5axis-Lesson1@140s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-103", title: "3D Arbitrary Stock Roughing handles irregular stock shapes", body: "For 3D Arbitrary Stock Roughing, hyperMILL uses a Ballnose endmill with collision frame. The operation calculates actual remaining material rather than assuming prismatic stock. Essential for re-machining and multi-setup parts where stock is not a simple rectangle or cylinder.", category: "setup", tags: ["hypermill", "video-learned", "arbitrary-stock-roughing", "ballnose"], confidence: 78, source: "video:hypermill-Arbitrary-stock-Roughing@0s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-104", title: "MAXX Machining Roughing: D12 R1.6 bullnose at S5305 for HPC", body: "hyperMILL MAXX Machining high-performance roughing example uses D12 R1.6 Bullnose endmill (12mm diameter, 1.6mm corner radius). Observed spindle speed S5305. The D12 R1.6 designation is a common HPC roughing geometry for steel/aluminum that balances chip load and tool life.", category: "speeds_feeds", tags: ["hypermill", "video-learned", "maxx-machining", "hpc-roughing", "bullnose"], confidence: 82, source: "video:hyperMILL-MAXX-Machining@10s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-105", title: "Clearance plane essential for 5-axis tool orientation changes", body: "In hyperMILL 5-axis contour milling, always define a clearance plane (displayed as a red semi-transparent plane). The clearance plane ensures safe retract height between tool orientation changes. For complex 5-axis parts with multiple indexed positions, each operation group may need its own clearance plane height to avoid collisions.", category: "setup", tags: ["hypermill", "video-learned", "5-axis", "clearance-plane", "collision-avoidance"], confidence: 82, source: "video:HyperMILL-5axis-Lesson1@145s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-106", title: "Six core turning operations in hyperMILL mill-turn", body: "hyperMILL supports six core turning operations: Roughing, Contour-parallel Roughing, Finishing (top row), and Groove Turning, Groove Plunging/Parting off, Groove Finishing (bottom row). For mill-turn machines, these integrate with milling operations in a single job. Contour-parallel Roughing follows the finish contour shape for more uniform stock removal.", category: "setup", tags: ["hypermill", "video-learned", "turning", "mill-turn", "operations"], confidence: 80, source: "video:HyperMILL-DAY1-intro@10s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-107", title: "CNC Reference Points: MZP, PRZ, Work Shift in Project Assistant", body: "hyperMILL Project Assistant defines three critical reference points: Machine Zero Point (MZP — machine starts/ends here), Part Reference Zero (PRZ — establishes reference relative to MZP), and Work Shift + Tool Length Offset (distance from MZP to PRZ). Setting these correctly is mandatory before creating any machining operations.", category: "setup", tags: ["hypermill", "video-learned", "reference-points", "prz", "machine-zero", "project-assistant"], confidence: 85, source: "video:HyperMILL-ProjectAssistance@15-20s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-108", title: "Multi-contour selection: per-contour Plus, Rev, Over columns", body: "The hyperMILL 'Contour Milling on 3D Model' dialog supports multiple contours with per-contour control columns: Nr, Start, End, Plus (additive offset), Rev (reverse direction), Over (overlap). Each contour row can be individually configured. Use 'Sort contours' checkbox to optimize machining order and minimize tool travel.", category: "setup", tags: ["hypermill", "video-learned", "contour-milling", "multi-contour", "optimization"], confidence: 80, source: "video:HyperMILL-5axis-Lesson1@70-80s", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-109", title: "3+2 part setup: dimension overlay verification in 3D viewport", body: "For 3+2 axis machining in hyperMILL, the part setup shows dimensions annotated directly in the 3D viewport (e.g. 75x25mm with 75mm height via green arrows). The simulation highlights the cutting zone in yellow against the workpiece, confirming tool engagement before running the full operation. Use this visual check before committing to calculation.", category: "setup", tags: ["hypermill", "video-learned", "3plus2", "part-dimensions", "verification"], confidence: 75, source: "video:Hypermill-3plus2-tutorial@0-10s", created_at: "2026-03-07", usage_count: 0 },

  // --- hyperMILL Webinar + AUTOMATION Center tutorial (video transcripts) ---
  { id: "TK-DL-hm-110", title: "MAXX Machining vs traditional roughing: 50% cycle time reduction in stainless", body: "hyperMILL MAXX Machining (trochoidal/high-performance roughing) achieved 26.5 minutes vs 52 minutes traditional roughing for the same stainless steel pocket — a 50% reduction. Key differences: MAXX adapts feed rate to maintain constant equivalent metal removal rate and constant cutting forces (not constant engagement like traditional HPC). This produces uniform chip thickness for better heat evacuation into chip instead of tool, extending tool life.", category: "speeds_feeds", tags: ["hypermill", "maxx-machining", "trochoidal", "stainless-steel", "cycle-time"], confidence: 90, source: "video:hypermill-webinar@12-18min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-111", title: "MAXX Machining: 1.5x Vc and 2.5x Fz over traditional HPC", body: "In hyperMILL MAXX Machining demo on stainless steel: traditional toolpath ran Vc=62.7 m/min at Fz=50 µm/tooth. Trochoidal MAXX ran Vc=90+ m/min (1.5x faster surface speed) at Fz=80 µm/tooth (2.5x+ faster per-tooth feed). This is possible because MAXX uses full flute depth with low radial engagement, keeping cutting forces low while maximizing metal removal rate. Pre-drilling a plunge point eliminates helical entry for even better gains.", category: "speeds_feeds", tags: ["hypermill", "maxx-machining", "feeds-speeds", "stainless-steel", "trochoidal"], confidence: 88, source: "video:hypermill-webinar@18-20min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-112", title: "Automatic surface extension eliminates Z-level wraparound", body: "hyperMILL Z-level and constant-Z cycles have automatic surface extension that eliminates tool wraparound at open edges. Instead of creating boundary curves or extending surfaces manually in CAD, select 'Minus surfaces' mode in the cycle — pick only the surfaces to machine, and the cycle auto-extends them. This works for Z-level, flat area machining, profile finishing, and 5-axis tangent machining. The extension maintains proper surface speed at edges and provides correct lead-in for 5-axis tool orientation.", category: "setup", tags: ["hypermill", "surface-extension", "z-level", "wraparound", "automation"], confidence: 92, source: "video:hypermill-webinar@20-25min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-113", title: "Barrel cutter tangent machining: 5mm stepdown replaces 0.2mm with ballnose", body: "hyperMILL tangent machining with conical barrel tools achieves 5mm stepdown producing equivalent surface quality to 0.2mm stepdown with standard ballnose — a 25x productivity gain. The large barrel radius contacts the part surface with massive engagement area. Benefits: thicker shank = less deflection, shorter stickout = less vibration, higher speeds/feeds possible. Barrel tools available from Emuge, Quickgrind (custom geometries), and others. Works on planar walls, freeform surfaces (using Global Fitting), and deep tight corners.", category: "tooling", tags: ["hypermill", "barrel-cutter", "tangent-machining", "5-axis", "productivity"], confidence: 92, source: "video:hypermill-webinar@25-32min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-114", title: "Global Fitting normalizes ISO directions across patchwork surfaces", body: "hyperMILL Global Fitting (integrated into tangent machining cycle) normalizes isoparametric directions across multiple surfaces with different UV orientations. Instead of machining each surface patch individually (causing patchwork quality), enable 'Global drive shape' and the cycle treats all selected surfaces as one unified surface. Combined with automatic surface extension, this produces seamless finishing across complex freeform geometry without manual surface preparation in CAD.", category: "setup", tags: ["hypermill", "global-fitting", "tangent-machining", "barrel-cutter", "surface-quality"], confidence: 90, source: "video:hypermill-webinar@30-32min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-115", title: "Barrel bounding toolpath: unique hyperMILL feature for fillet cleanup", body: "hyperMILL has a unique barrel bounding toolpath (not available in other CAM systems) that uses barrel tools to clean up the small wedge of material left at the transition between wall and floor after tangent machining. Select the bounding curve of the machined surface and the tool automatically generates a fillet-following path with adaptive tool angle changes. This eliminates secondary operations for corner cleanup.", category: "tooling", tags: ["hypermill", "barrel-bounding", "barrel-cutter", "fillet", "tangent-machining"], confidence: 88, source: "video:hypermill-webinar@27-28min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-116", title: "AC Basic Tutorial: complete automation script from unaligned part to NC code", body: "hyperMILL AUTOMATION Center basic workflow: (1) Create script in Manage mode, (2) add template commands in Template mode (Start → NCS → Stock → Fixture → Feature Recognition → Pocket Recognition → Basic Programming → Optimize → Calculate → NC File), (3) define parameters in Parameter mode. Use 'Stop for input' on interactive steps (job list name, machine, material, fixture selection). Copy parameters between functions by double-clicking to avoid duplicate naming. Execute with 'Run until next stop' for step-by-step verification.", category: "setup", tags: ["hypermill", "automation-center", "script", "workflow", "tutorial"], confidence: 90, source: "video:hypermill-AC-basic-tutorial@0-18min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-117", title: "AC NCS orientation: two-face method for automatic part alignment", body: "AUTOMATION Center NCS function 'Two faces' method: select one surface for Z orientation (typically top face) and another for Y-plus orientation (a side face). The system automatically aligns the part coordinate system. If the result is wrong, click Refresh to re-select. This eliminates manual coordinate system setup and works reliably for prismatic parts with clear reference faces.", category: "setup", tags: ["hypermill", "automation-center", "ncs", "alignment", "two-faces"], confidence: 88, source: "video:hypermill-AC-basic-tutorial@5-7min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-118", title: "AC stock definition: box offset with face milling contour auto-generation", body: "AUTOMATION Center stock definition using 'Box offset' method: set per-axis offsets (e.g., X=2mm, Y=1mm, Z+=0.5mm, Z-=30mm). The function auto-generates two layers: 'Bounding box layer' (red lines showing stock dimensions) and 'Face milling contour' (rectangle at the highest point of the part for face milling operations). Stock name is configurable and referenced by downstream fixture and machining functions.", category: "setup", tags: ["hypermill", "automation-center", "stock", "box-offset", "face-milling"], confidence: 88, source: "video:hypermill-AC-basic-tutorial@7-9min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-119", title: "AC Global Clearance Plane prevents calculation issues across setups", body: "AUTOMATION Center Global Clearance Plane function prevents calculation issues when different setups have varying default clearance values. Set a single value (e.g., 20mm) and the function checks each job list for its stock definition, then adjusts the clearance plane to stock-top + offset (e.g., 20.5mm for 0.5mm stock offset). This works regardless of frame orientation — even completely different setup orientations get correctly adjusted clearance values.", category: "setup", tags: ["hypermill", "automation-center", "clearance-plane", "multi-setup", "safety"], confidence: 90, source: "video:hypermill-AC-basic-tutorial@15-17min", created_at: "2026-03-07", usage_count: 0 },
  { id: "TK-DL-hm-120", title: "AC second setup: auto-assign drilling jobs by Z-axis angle filter", body: "AUTOMATION Center can automatically split operations between setups based on tool axis angles. The 'Assign jobs to job list' function checks Z-axis angles (e.g., 0-5 degrees) in the source compound job and moves matching operations to the target job list. Example: bottom-side drilling operations detected by feature recognition are auto-moved to a second setup (Z-minus orientation) with correct coordinate system rotation over X or Y axis.", category: "setup", tags: ["hypermill", "automation-center", "multi-setup", "drilling", "job-assignment"], confidence: 88, source: "video:hypermill-AC-basic-tutorial@13-15min", created_at: "2026-03-07", usage_count: 0 },

  // --- MIT 2.830J Control of Manufacturing Processes (Lectures 3, 9, 13-14, 18, 20-21) ---
  { id: "TK-DL-2830j-001", title: "EWMA chart beats Shewhart for small shifts (<1.5σ)", body: "For detecting small sustained mean shifts (<1.5σ), use EWMA or CUSUM charts instead of standard Shewhart X-bar charts. EWMA with λ=0.1-0.2 is optimal for shifts around 0.5-1σ. Shewhart charts are only efficient for detecting large shifts (>2σ). Source: MIT 2.830J Lecture 9 (Hardt).", category: "quality", tags: ["spc", "ewma", "cusum", "shewhart", "mean-shift", "control-chart"], confidence: 92, source: "document:mit2830j@lecture9", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-002", title: "EWMA λ selection: smaller λ for smaller shifts", body: "EWMA smoothing parameter λ (called r in some texts): use λ=0.05-0.1 for detecting shifts <0.5σ, λ=0.1-0.25 for 0.5-1.5σ shifts, λ=0.4+ for large shifts (but at that point Shewhart may be better). Lower λ gives more memory of past observations. Trade-off: smaller λ = slower false alarm rate but longer detection delay for large shifts.", category: "quality", tags: ["spc", "ewma", "lambda", "tuning", "shift-detection"], confidence: 90, source: "document:mit2830j@lecture9", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-003", title: "Check autocorrelation BEFORE applying SPC charts", body: "Standard SPC charts (Shewhart, EWMA, CUSUM) assume observations are independent. If your process data is autocorrelated (common in CNC with thermal drift), these charts produce excessive false alarms. ALWAYS check lag-1 autocorrelation first. If significant (>0.3), either use EWMA on residuals or apply cycle-to-cycle control first.", category: "quality", tags: ["spc", "autocorrelation", "independence", "false-alarm", "thermal-drift"], confidence: 95, source: "document:mit2830j@lecture9", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-004", title: "Cycle-to-cycle (CtC) control: check stability with K < 1", body: "In cycle-to-cycle manufacturing control, the loop gain K = Kc × Kp must satisfy |K| < 1 for stability. K_p is process gain (often ≈1), K_c is controller gain. Start with Kc = 0.3-0.5 and tune up. Going above K=1 causes oscillation that INCREASES variance instead of reducing it. The optimal gain minimizes σ²_output = σ²_d × (1-K)² / (1-(1-K)²).", category: "quality", tags: ["ctc-control", "feedback", "stability", "process-gain", "controller-tuning"], confidence: 93, source: "document:mit2830j@lecture20", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-005", title: "Use I-control (not P-control) when mean shifts persist", body: "P-control (proportional) leaves steady-state error when there's a sustained mean shift (like tool wear). I-control (integral) accumulates the error and drives it to zero. Use I-control for: gradual tool wear compensation, thermal drift correction, systematic material variation. Use P-control for: random batch-to-batch variation, low-autocorrelation disturbances.", category: "quality", tags: ["ctc-control", "integral-control", "proportional-control", "tool-wear", "drift"], confidence: 90, source: "document:mit2830j@lecture20", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-006", title: "DOE: use fractional factorial to save runs", body: "Full factorial 2^k experiments get expensive fast (2^6 = 64 runs). Use fractional factorial 2^{k-p} when k≥4 factors. A 2^{6-2} design needs only 16 runs instead of 64, at the cost of aliased interactions. Rule: main effects are almost always more important than interactions. Screen with fractional factorial first, then run full factorial on the significant factors only.", category: "quality", tags: ["doe", "factorial", "fractional", "screening", "efficiency"], confidence: 90, source: "document:mit2830j@lecture13-14", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-007", title: "Resolution III designs alias main effects with 2-factor interactions", body: "In fractional factorial designs, Resolution III (like 2^{3-1}) aliases each main effect with a 2-factor interaction. This means if A is aliased with BC, you can't tell if the effect is from A alone or from the BC interaction. Resolution IV aliases 2-factor interactions with each other (main effects are clear). Always use Resolution IV or higher for important screening experiments.", category: "quality", tags: ["doe", "resolution", "aliasing", "fractional-factorial", "screening"], confidence: 88, source: "document:mit2830j@lecture14", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-008", title: "Add center points to 2-level factorials to detect curvature", body: "A 2-level factorial design can only fit linear models. Add 3-5 center points (all factors at midpoint) to test for curvature without increasing the number of factorial runs. If the center point average differs significantly from the factorial average, there is curvature and you need a response surface design (CCD or Box-Behnken).", category: "quality", tags: ["doe", "center-points", "curvature", "response-surface", "ccd"], confidence: 88, source: "document:mit2830j@lecture14", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-009", title: "Cpk vs Cp: always use Cpk for real processes", body: "Cp measures potential capability assuming process is centered. Cpk measures ACTUAL capability including mean offset. Cpk = min((USL-μ)/(3σ), (μ-LSL)/(3σ)). A process with Cp=2.0 but off-center can have Cpk=0.5 and produce 10% scrap. Always report Cpk, not just Cp. Target Cpk ≥ 1.33 (4σ) for production, Cpk ≥ 1.67 (5σ) for safety-critical.", category: "quality", tags: ["capability", "cpk", "cp", "tolerance", "centering", "scrap-rate"], confidence: 95, source: "document:mit2830j@lecture3", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-010", title: "Taguchi quality loss: variation costs money even within spec", body: "Taguchi's quality loss function L = k(y-T)² means ANY deviation from target costs money — not just out-of-spec parts. Expected loss E[L] = k(σ² + (μ-T)²). This means: (1) reducing variance is always valuable even if Cpk looks fine, (2) centering the process on target matters as much as reducing spread, (3) a process at ±0.5σ from target costs 25% of the loss at ±1σ.", category: "quality", tags: ["taguchi", "quality-loss", "variation", "cost", "target-centering"], confidence: 90, source: "document:mit2830j@lecture3", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-011", title: "Robust design: minimize sensitivity to noise factors", body: "Taguchi robust design (MIT 2.830J Lecture 18): instead of controlling all variation sources, find control factor settings that make the output INSENSITIVE to noise. Use crossed array: inner array (control factors) × outer array (noise factors). Pick settings where the signal-to-noise ratio (SNR) is maximized. This often costs less than tightening tolerances on inputs.", category: "quality", tags: ["taguchi", "robust-design", "noise-factors", "snr", "tolerance-design"], confidence: 88, source: "document:mit2830j@lecture18", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-012", title: "Process variation has systematic + random components", body: "Total process variation σ²_total = σ²_systematic + σ²_random. Systematic sources (tool wear, thermal drift, fixture shift) create patterns and autocorrelation — these can be controlled with CtC feedback. Random sources (material microstructure, vibration, coolant turbulence) are independent — these can only be reduced with SPC monitoring and root cause elimination. Identify which dominates before choosing a control strategy.", category: "quality", tags: ["variation", "systematic", "random", "control-strategy", "root-cause"], confidence: 92, source: "document:mit2830j@lecture3", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-013", title: "CUSUM is optimal for detecting sustained shifts of known size", body: "If you know the approximate shift size δ you want to detect, CUSUM with k=δ/2 is the optimal detector (lowest ARL₁). Standard params: k=0.5σ (half-sigma slack), h=5σ (decision interval) gives ARL₀≈465 and detects 1σ shift in ~10 samples. CUSUM accumulates evidence over time — it will ALWAYS eventually detect a sustained shift, no matter how small.", category: "quality", tags: ["cusum", "shift-detection", "arl", "optimal-detector", "sustained-shift"], confidence: 90, source: "document:mit2830j@lecture9", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-014", title: "Spatial process variation requires spatial models, not just SPC", body: "For processes with spatial variation (injection molding cavity-to-cavity, wafer uniformity, multi-cavity dies), standard SPC on individual measurements misses the pattern. Use spatial models: (1) decompose into radial + angular components, (2) fit polynomial surfaces, (3) track spatial signature changes cycle-to-cycle. A process can be 'in control' on average but have worsening spatial uniformity.", category: "quality", tags: ["spatial-variation", "injection-molding", "uniformity", "wafer", "multi-cavity"], confidence: 85, source: "document:mit2830j@lecture21", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-2830j-015", title: "Manufacturing processes taxonomy: 4 classes × energy domain", body: "All manufacturing processes fall into 4 classes: Material Removal (machining, EDM, laser), Material Addition (welding, 3D printing, CVD), Forming/Deformation (forging, stamping, rolling), and Phase Change (casting, injection molding, sintering). Each can be further classified by energy domain (mechanical, thermal, chemical, electrical). This taxonomy helps identify analogous control strategies across different process types.", category: "setup", tags: ["process-taxonomy", "manufacturing", "classification", "removal", "addition", "forming"], confidence: 85, source: "document:mit2830j@lecture3", created_at: "2026-03-03", usage_count: 0 },

  // --- CNC Batch 1: Design & Machining Guides (CNCCookbook, Engineering Guide, SINUMERIK) ---
  { id: "TK-DL-cnc-001", title: "Minimum wall thickness: 0.8mm metal, 1.5mm plastic", body: "CNC machining minimum wall thickness limits: metal parts 0.8mm recommended (0.5mm feasible but risky), plastic parts 1.5mm recommended (1.0mm feasible). Thinner walls vibrate during cutting causing poor surface finish and tolerance loss. Tall thin walls (aspect ratio >4) are especially problematic.", category: "design", tags: ["dfm", "wall-thickness", "design-rules", "vibration"], confidence: 90, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-002", title: "Cavity depth limit: 4× width recommended, 10× tool diameter max", body: "Pocket/cavity depth should not exceed 4× the cavity width (recommended) or 10× the tool diameter (absolute max, 250mm). Deeper cavities require longer tools with larger diameters, which increases internal fillet radius. Internal edge fillets should be ≥1/3 × cavity depth.", category: "design", tags: ["dfm", "cavity", "pocket", "depth", "fillet"], confidence: 90, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-003", title: "Thread sizing: M6+ recommended, max engagement 3× nominal", body: "For CNC machined threads, M6 and above are recommended (M2 is feasible minimum). Thread engagement length beyond 3× nominal diameter provides diminishing returns on holding strength. For blind holes, thread milling is preferred over tapping to avoid tap breakage.", category: "design", tags: ["dfm", "threads", "tapping", "thread-milling", "engagement"], confidence: 88, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-004", title: "Standard CNC tolerance: ±0.125mm; tight: ±0.050mm; feasible: ±0.025mm", body: "Standard CNC machining tolerance is ±0.125mm (±0.005\"). Tighter tolerances increase cost significantly: ±0.050mm needs careful setup, ±0.025mm is the feasible limit for standard CNC (grinding/lapping needed below this). Each halving of tolerance roughly doubles machining cost.", category: "design", tags: ["dfm", "tolerance", "precision", "cost", "grinding"], confidence: 92, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-005", title: "HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM", body: "HSS baseline surface speeds (SFM): Aluminum 6061=250, Brass=200, Bronze=100, Cast Iron=80, Mild Steel (1018)=110, Alloy Steel (4140)=80, Tool Steel (D2)=60, Stainless 303=45, Stainless 316=30, Titanium 6Al-4V=50. Carbide tooling runs 3-4× these values. Always start at 80% and increase.", category: "speeds", tags: ["sfm", "hss", "surface-speed", "material", "baseline"], confidence: 85, source: "document:cnc-feeds-speeds-guide@ch3", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-006", title: "Never let chip load drop below 0.004\" — rubbing destroys tools", body: "Minimum chip load threshold for carbide end mills is approximately 0.004\" (0.1mm) per tooth. Below this, the tool rubs instead of cutting, generating excessive heat and accelerating wear. This is the #1 cause of premature tool failure in hobby/small CNC shops. When in doubt, increase feed rate rather than decrease it.", category: "speeds", tags: ["chip-load", "rubbing", "minimum-feed", "tool-wear", "carbide"], confidence: 90, source: "document:cnc-feeds-speeds-guide@ch5", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-007", title: "Flute count by material: Al=2-3, Steel=4, Cast Iron=5-6", body: "Optimal flute count depends on material chip characteristics. Aluminum and soft metals: 2-3 flutes (large gullets for big chips). Steel and alloys: 4 flutes (balance between chip space and rigidity). Cast iron and hardened steel: 5-6+ flutes (small chips, need rigidity). More flutes = higher feed rate at same chip load but less chip clearance.", category: "tooling", tags: ["flute-count", "end-mill", "aluminum", "steel", "chip-clearance"], confidence: 85, source: "document:cnc-feeds-speeds-guide@ch4", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-008", title: "45° face mill gives ~40% more MRR than 90° with balanced forces", body: "A 45° entering angle face mill produces ~40% higher material removal rate than a 90° equivalent due to chip thinning effect. The radial and axial forces are more balanced. However, 45° mills exert ~2× the axial force — avoid on thin-walled parts. Use 90° for thin walls (half the axial force), button cutters for interrupted cuts in superalloys.", category: "tooling", tags: ["face-mill", "entering-angle", "mrr", "chip-thinning", "thin-wall"], confidence: 88, source: "document:cnc-face-mill-guide@selection", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-009", title: "Thread mill diameter must be < 70% of thread diameter", body: "When thread milling, the cutter diameter must be less than 70% of the thread's nominal diameter to ensure proper helical interpolation clearance. Synchronous (climb) milling is preferred for thread milling — produces better surface finish and less burr. Dry machining is preferred except for stainless, aluminum, and cast iron which benefit from coolant.", category: "tooling", tags: ["thread-milling", "diameter-ratio", "synchronous", "dry-machining"], confidence: 88, source: "document:cnc-thread-mill-guide@technique", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-010", title: "Deep hole thresholds: <5D standard, 5-7D peck, 7-10D parabolic, >20D gun drill", body: "Deep hole drilling technique by L/D ratio: <5D = standard drill (no special cycle), 5-7D = peck drilling required, 7-10D = parabolic flute + peck (reduce feed 10%), 10-20D = custom progressive peck cycle (reduce feed 20%), >20D = gun drill or BTA system (limit ~400D). Through-spindle coolant strongly recommended above 5D.", category: "drilling", tags: ["deep-hole", "peck", "gun-drill", "ld-ratio", "parabolic-flute"], confidence: 90, source: "document:cnc-deep-hole-guide@thresholds", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-011", title: "CNC machine cost comparison: 3-axis $75/hr baseline", body: "Typical CNC machine shop rates (2024 USD): 3-axis mill $75/hr (baseline), CNC lathe $65/hr (-15%), indexed 5-axis $120/hr (+60%), continuous 5-axis $150/hr (+100%), mill-turn $95/hr (+25%). When designing parts, consider whether features truly require 5-axis or can be achieved with 3-axis + fixture rotation.", category: "cost", tags: ["machine-cost", "hourly-rate", "3-axis", "5-axis", "mill-turn"], confidence: 80, source: "document:cnc-complete-guide@cost", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-012", title: "Undercut width range: 3-40mm, depth ≤ 2× width", body: "CNC undercuts (T-slots, O-rings, snap rings) have practical limits: minimum width 3mm (1/8\"), maximum width 40mm, and depth should not exceed 2× the width. Clearance diameter must be at least 4× the undercut depth. Standard inch fraction sizes (1/8\", 3/16\", 1/4\") are preferred for tool availability.", category: "design", tags: ["dfm", "undercut", "t-slot", "o-ring", "dimensions"], confidence: 85, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-013", title: "Non-standard hole sizes require end mill boring — 5-10× slower than drilling", body: "Holes with non-standard diameters cannot use standard twist drills and must be machined with an end mill using helical interpolation or boring. This is 5-10× slower than drilling. Always prefer standard drill sizes (letter, number, fractional, or metric) when possible. Check a drill chart before specifying hole diameters.", category: "design", tags: ["dfm", "holes", "drill-size", "boring", "helical-interpolation"], confidence: 85, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-014", title: "SINUMERIK CYCLE832: set tolerance, smoothing, and jerk for HSM", body: "Siemens SINUMERIK CYCLE832 (High Speed Settings) configures three parameters: tolerance (path deviation in mm), smoothing level (affects contour accuracy), and jerk limitation. Tighter tolerance = more accurate but slower. For roughing use tolerance 0.05-0.1mm; for finishing use 0.005-0.01mm. COMPCAD converts G1 blocks to splines for smoother motion.", category: "setup", tags: ["sinumerik", "cycle832", "hsm", "tolerance", "compcad", "spline"], confidence: 85, source: "document:sinumerik-5axis@cycle832", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-015", title: "SINUMERIK TRAORI enables 5-axis transformation — required before CUT3D", body: "SINUMERIK 5-axis programming requires TRAORI (TRAnsformation ORIentation) to activate kinematic transformation before any 5-axis moves. CUT3D enables peripheral milling with tool radius compensation in 5-axis mode. Without TRAORI active, 5-axis interpolation commands are rejected. TRAFOOF disables transformation.", category: "setup", tags: ["sinumerik", "traori", "5-axis", "cut3d", "transformation", "kinematic"], confidence: 85, source: "document:sinumerik-5axis@traori", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-016", title: "Wiper inserts improve face mill finish without reducing feed", body: "Wiper insert geometry on face mills allows achieving fine surface finish (Ra <0.8µm) at production feed rates. Standard inserts require reduced feed for finish passes. Wiper inserts have a secondary flat or radius that burnishes the surface on the trailing edge. Use one wiper insert per face mill body — more than one can cause vibration.", category: "tooling", tags: ["face-mill", "wiper-insert", "surface-finish", "productivity"], confidence: 85, source: "document:cnc-face-mill-guide@wiper", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-017", title: "Small features below 2.5mm require micro-machining — cost jumps significantly", body: "Features smaller than 2.5mm width/diameter enter micro-machining territory requiring specialized spindles (40,000+ RPM), microscope inspection, and extremely rigid setups. Feasible minimum is ~0.1mm but cost is 10-50× standard machining. Below 0.1mm, consider EDM or laser machining instead of conventional CNC.", category: "design", tags: ["dfm", "micro-machining", "small-features", "edm", "cost"], confidence: 85, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-018", title: "Tall feature aspect ratio >4 causes vibration — rotate part or add support", body: "Features taller than 4× their base width are prone to vibration (chatter) during machining. Solutions: (1) orient part so tall feature is parallel to spindle axis, (2) add temporary support ribs (machine away last), (3) reduce DOC and increase number of passes, (4) use climb milling to push feature against solid material.", category: "design", tags: ["dfm", "aspect-ratio", "vibration", "chatter", "tall-feature"], confidence: 85, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-019", title: "Internal fillet must be ≥1/3 × pocket depth for tool rigidity", body: "Internal corner fillets in pockets should be at least 1/3 of the pocket depth. This allows using a sufficiently rigid tool. A 30mm deep pocket needs ≥10mm fillet radius (20mm tool diameter). Smaller fillets require smaller tools with worse rigidity, causing vibration and limiting depth. Floor edges can be left sharp (tool nose radius) or given 0.1-1mm radius.", category: "design", tags: ["dfm", "fillet", "internal-corner", "pocket", "tool-diameter"], confidence: 88, source: "document:cnc-complete-guide@design-rules", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cnc-020", title: "Chip thinning with radial engagement <50%: increase feed to maintain chip load", body: "When radial engagement (stepover/tool diameter) drops below 50%, the actual chip thickness is less than the programmed feed per tooth due to geometry. At 25% radial engagement, actual chip is ~71% of programmed. At 10%, it's ~45%. Increase programmed feed rate by the chip thinning factor to maintain proper chip load and avoid rubbing. HSM strategies exploit this for higher MRR.", category: "speeds", tags: ["chip-thinning", "radial-engagement", "hsm", "feed-rate", "stepover"], confidence: 88, source: "document:cnc-feeds-speeds-guide@ch6", created_at: "2026-03-03", usage_count: 0 },

  // --- CNC Batch 2: InventorCAM/SolidCAM + hyperMILL CAM Strategy Guides ---
  { id: "TK-DL-cam-001", title: "Constant Z for steep (30-90°), 3D Constant Step Over for shallow areas", body: "Use Constant Z (waterline) finishing for steep model areas with inclination 30-90°. In shallow areas the Z-passes become widely spaced causing poor finish. Switch to 3D Constant Step Over or Linear machining for areas below ~30° inclination. The Hybrid Constant Z strategy automatically inserts additional passes in shallow zones between Z-levels.", category: "strategy", tags: ["3d-finishing", "constant-z", "step-over", "slope-angle", "hybrid"], confidence: 90, source: "document:inventorcam-3d-hsm@ch2", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-002", title: "Rest machining from top-down beats pencil milling in corners", body: "Pencil milling in vertical corners forces both the flute and radius into full contact simultaneously, creating adverse cutting conditions. Rest machining picks corners from the top down with proper cutting engagement. Use rest machining instead of pencil milling for internal corners. Pencil milling is still appropriate for fillet blending along edges.", category: "strategy", tags: ["rest-machining", "pencil-milling", "corners", "engagement", "finishing"], confidence: 88, source: "document:inventorcam-3d-hsm@ch2.11", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-003", title: "HSM requires smooth links — minimize retracts to high Z", body: "High-speed machining demands continuous machine motion. Retracts to safe Z between passes kill feed rate and create dwell marks. HSM linking strategies: (1) stay on surface within tolerance, (2) stay down within clearance, (3) angle retracts rather than vertical, (4) smooth with arcs. Every retract to safe Z adds 2-5 seconds of non-cutting time.", category: "strategy", tags: ["hsm", "linking", "retract", "air-cutting", "feed-rate"], confidence: 88, source: "document:inventorcam-3d-hsm@ch7", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-004", title: "5-axis hierarchy: 3+2 fixed > auto-indexing > simultaneous", body: "Prefer simplest 5-axis approach that works: (1) 3+2 fixed position — fastest, most rigid, all machines support it. (2) Automatic indexing — finds collision-free fixed angles per area, minimizes machine movement. (3) Simultaneous 5-axis — only when geometry requires continuous tool orientation change (deep cavities, steep walls, SWARF). Simultaneous increases programming time 3-5× and machine wear.", category: "strategy", tags: ["5-axis", "3+2", "indexing", "simultaneous", "hierarchy"], confidence: 90, source: "document:hypermill-cam-strategies@5axis", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-005", title: "SWARF machining: line contact = fewer passes + better surface", body: "SWARF (Side Wall And Ruled Finish) uses the tool's side for line contact with steep surfaces instead of point contact. This produces better surface quality with fewer passes compared to ball-nose finishing. SWARF requires: (1) ruled/near-ruled surfaces, (2) 5-axis simultaneous capability, (3) careful tilt angle management to avoid gouging. Best for aerospace structural ribs and blade surfaces.", category: "strategy", tags: ["swarf", "5-axis", "line-contact", "surface-quality", "aerospace"], confidence: 88, source: "document:inventorcam-swarf@intro", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-006", title: "Morphed machining: passes follow drive curves for blended surfaces", body: "Morphed machining generates passes that gradually transition (morph) between two drive boundary curves. Each pass takes characteristics of both curves proportionally. This produces superior surface finish on blended/transitional surfaces compared to Linear or Constant Z. Best for fillet surfaces, turbine blades, and aesthetic surfaces where uniform tool marks are critical.", category: "strategy", tags: ["morphed", "drive-curves", "surface-blend", "finishing", "aesthetic"], confidence: 85, source: "document:inventorcam-3d-hsm@ch2.8", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-007", title: "Complementary finishing: Z-level + equidistant covers all slopes in one op", body: "Combined/complementary finishing strategies automatically divide the model by slope angle and apply the optimal strategy to each region. Z-level finishing handles steep areas, equidistant/profile finishing handles flat areas. Both can use spiral patterns for best surface quality. This eliminates the need for separate steep/shallow operations and ensures no gaps at the transition.", category: "strategy", tags: ["complementary", "z-level", "equidistant", "slope-division", "combined"], confidence: 88, source: "document:hypermill-cam-strategies@3d-complementary", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-008", title: "Trochoidal turning: rounded passes for better tool life on complex profiles", body: "Trochoidal turning uses rounded (arc-based) cutting passes instead of conventional linear passes. The smooth entry/exit reduces impact loading on the insert. Benefits: higher cutting speed, reduced tool wear, better chip control on complex profiles. Particularly effective for hardened materials and interrupted cuts where conventional turning causes insert chipping.", category: "turning", tags: ["trochoidal-turning", "tool-life", "rounded-passes", "hard-turning", "insert"], confidence: 85, source: "document:inventorcam-turning@trochoidal", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-009", title: "Balanced roughing: dual-tool simultaneous cuts halve cycle time", body: "Balanced rough turning uses two tools (master + slave) performing roughing cuts simultaneously from opposite sides. Both submachines must share the same turret table. This can nearly halve roughing cycle time on large-diameter parts. Requires: (1) mill-turn machine with dual turrets, (2) symmetric or near-symmetric part geometry, (3) careful synchronization to avoid collision.", category: "turning", tags: ["balanced-rough", "dual-tool", "cycle-time", "mill-turn", "synchronization"], confidence: 85, source: "document:inventorcam-turning@balanced-rough", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-010", title: "Mill-turn advantage: single setup eliminates re-fixturing errors", body: "Mill-turn machines combine turning and milling in one setup, eliminating re-fixturing between operations. Key benefits: (1) concentricity guaranteed between turned and milled features, (2) no datum shift from re-clamping, (3) reduced total cycle time (no manual handling), (4) single post-processor for all operations. Worth the +25% hourly rate premium for parts requiring both turning and milling features.", category: "setup", tags: ["mill-turn", "single-setup", "concentricity", "re-fixturing", "cost-benefit"], confidence: 88, source: "document:inventorcam-turning@mill-turn", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-011", title: "Spiral Z-level finishing gives best surface on closed milling areas", body: "For closed (pocket-like) milling areas, use spiral Z-level finishing instead of zigzag. Spiral motion maintains constant engagement and avoids the direction reversal marks that zigzag creates. Open milling areas should use zigzag with filleted path links. The spiral approach also reduces dwell time at reversals which can cause burn marks on heat-sensitive materials.", category: "strategy", tags: ["spiral", "z-level", "finishing", "surface-quality", "pocket"], confidence: 85, source: "document:hypermill-cam-strategies@3d-zlevel", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-012", title: "ISO machining follows UV curves for natural surface flow", body: "ISO machining generates toolpaths that follow the ISO parametric curves (U and V) of CAD surfaces. The paths align with the natural surface flow, producing more uniform tool marks. UV curves of contiguous surfaces are automatically aligned so the tool doesn't retract between surfaces. Best for: turbine blades, mold surfaces, any geometry where surface appearance matters.", category: "strategy", tags: ["iso-machining", "uv-curves", "surface-flow", "parametric", "appearance"], confidence: 85, source: "document:hypermill-cam-strategies@iso", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-013", title: "5-axis rework: convert 3D toolpaths to 5-axis to resolve collisions", body: "5-axis rework machining converts existing 3D toolpaths into 5-axis programs by adding tool orientation changes. Areas excluded from 3D operations due to collision can be recovered with 5-axis positions. This is faster than reprogramming from scratch: calculate in 3D first, then selectively convert collision areas to 5-axis. Automatic indexing or simultaneous modes available.", category: "strategy", tags: ["5-axis", "rework", "collision", "conversion", "3d-to-5axis"], confidence: 85, source: "document:hypermill-cam-strategies@5axis-rework", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-014", title: "Helical machining: continuous descending ramp avoids Z-level dwell marks", body: "Helical machining joins Constant Z profile sections into a continuous descending spiral, eliminating the Z-step witness marks left by standard Constant Z finishing. Controlled by step-down and max ramp angle parameters. Best for revolution bodies and cylindrical features where the continuous helical path matches the part geometry naturally.", category: "strategy", tags: ["helical", "finishing", "spiral", "witness-marks", "revolution-body"], confidence: 85, source: "document:inventorcam-3d-hsm@ch2.3", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cam-015", title: "Automatic minimum tool length calculation prevents collisions", body: "Before running any 3D HSM operation, use the automatic minimum tool length calculation. This checks the tool + holder assembly against the part geometry and reports the minimum length needed to avoid holder collision. Running operations with insufficient tool length causes holder crashes that damage both the tool and the workpiece. Add 5-10mm safety margin to the calculated minimum.", category: "setup", tags: ["tool-length", "holder-collision", "safety", "minimum-length", "hsm"], confidence: 88, source: "document:inventorcam-3d-hsm@ch4.1", created_at: "2026-03-03", usage_count: 0 },
  // --- Batch 3: Haas Mill Manual + MIT 2.008 (casting, deforming) ---
  { id: "TK-DL-haas-001", title: "Run spindle warm-up after 4+ days idle (Haas O09220)", body: "On Haas mills, if the spindle has been idle for more than 4 days, run the built-in 20-minute warm-up program O09220 before machining. This gradually increases RPM to distribute spindle lubrication and reach thermal equilibrium. For consistent high-speed work, run this warm-up daily. Skipping warm-up risks bearing damage and poor initial part accuracy due to thermal growth.", category: "setup", tags: ["haas", "spindle", "warm-up", "thermal", "maintenance"], confidence: 92, source: "document:haas-mill-2023@p96", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-haas-002", title: "G103 limits block look-ahead for macro timing (Haas)", body: "Haas controls read blocks ahead for smooth motion, but this causes macro outputs (M-codes, relays) to fire early. Use G103 P1 to limit look-ahead to 1 block when precise timing matters — e.g., turning a relay on, dwelling, then off. Without G103 P1, the output toggles instantly while the control pre-processes the dwell. Block delete '/' tokens also stop look-ahead even when block delete mode is off.", category: "programming", tags: ["haas", "g103", "look-ahead", "macro", "timing"], confidence: 90, source: "document:haas-mill-2023@p116", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-haas-003", title: "Use ROUND[] for macro integer comparisons (floating point trap)", body: "CNC controls store decimal numbers as binary floating point, so integer values in macro variables may read as 6.999999 or 7.000001 instead of 7. Always wrap integer comparisons with ROUND[]: use IF[ROUND[#10000] EQ 7] instead of IF[#10000 EQ 7]. This is critical for loop counters, tool number variables, and conditional branching. Applies to Haas, FANUC, and most controls using IEEE 754 math.", category: "programming", tags: ["macro", "floating-point", "haas", "fanuc", "rounding"], confidence: 90, source: "document:haas-mill-2023@p116", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cast-001", title: "Casting shrinkage allowances by material family", body: "Pattern dimensions must be oversized to compensate for solidification shrinkage. Typical allowances (mm/m): aluminum alloys 13, aluminum bronze 21, yellow brass 13, gray cast iron 8-13, white cast iron 21, carbon steel 16-21, chromium steel 21, manganese steel 26, magnesium 21, lead 26, zinc 26. Higher-shrinkage alloys (Mn steel, zinc, lead) need more generous patterns and risering. Source: MIT 2.008.", category: "material", tags: ["casting", "shrinkage", "pattern", "allowance", "material-properties"], confidence: 88, source: "document:mit2008-casting@shrinkage-table", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cast-002", title: "Casting tolerance comparison: sand vs investment vs die", body: "Achievable casting tolerances vary dramatically by process. Sand casting: 0.7-2mm (roughest). Investment casting: 0.08-0.2mm (good for complex shapes). Die casting: 0.02-0.6mm (best for production). When designing cast parts that need CNC finishing, plan machining allowances based on casting process tolerance. Investment castings may need minimal finish machining; sand castings need significant stock removal.", category: "quality", tags: ["casting", "tolerance", "sand-casting", "investment-casting", "die-casting"], confidence: 88, source: "document:mit2008-casting@quality-comparison", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cast-003", title: "Pattern machining allowance for cast parts by size and material", body: "Cast parts need machining allowance added to pattern dimensions. For cast iron: bore 3.2-7.9mm, surface 2.4-4.8mm, cope side 4.8-7.9mm (increases with pattern size 152-1524mm). Cast steel needs ~50% more allowance than cast iron. Nonferrous alloys need the least: 1.6-4.0mm. Cope (top) side always needs more allowance than drag side due to inclusions and porosity rising during solidification.", category: "design", tags: ["casting", "machining-allowance", "pattern", "cope", "drag"], confidence: 85, source: "document:mit2008-casting@machining-allowance-table", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cast-004", title: "Casting process selection: cost vs quality vs rate tradeoffs", body: "Sand casting: low tooling cost ($), high labor, rough quality (0.7-2mm tolerance), 2-10 week development, flexible shapes. Investment casting: moderate tooling, high labor, fine quality (0.08-0.2mm), 5-16 week development, complex internal geometry possible. Die casting: high tooling cost ($$$), low labor, excellent quality (0.02-0.6mm), 12-20 week development, low design flexibility. Choose sand for prototypes/low volume, die for high volume, investment for complex precision parts.", category: "process_selection", tags: ["casting", "sand", "investment", "die", "cost-quality-tradeoff"], confidence: 88, source: "document:mit2008-casting@process-comparison", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-cast-005", title: "Chvorinov solidification rule: sand ts~(V/A)² vs die ts~(V/A)¹", body: "Solidification time follows Chvorinov's rule: ts = C(V/A)^n where V=volume, A=surface area. For sand casting n=2 (heat transfer limited by sand conductivity ~0.5 W/mK), for die casting n=1 (metal mold conductivity ~200 W/mK dominates). This means thick sections in sand castings take disproportionately longer to solidify, causing more shrinkage porosity. Die casting solidifies more uniformly. Design risers to feed the last-to-solidify sections.", category: "physics", tags: ["casting", "solidification", "chvorinov", "heat-transfer", "riser-design"], confidence: 85, source: "document:mit2008-casting@solidification", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-form-001", title: "Spring back in bending: increases with Y/E ratio and R/t", body: "After bending, elastic recovery causes the part to spring back. The relationship is Ri/Rf = 1 - 3(Y/E)(Ri/t) + 4(Y/E)³(Ri/t)³ where Y=yield stress, E=Young's modulus, t=thickness, Ri=initial bend radius, Rf=final radius. Titanium (high Y/E ~0.01) springs back much more than steel (Y/E ~0.002). Compensate by over-bending. Thinner sheets and larger radii also increase spring back. Critical for bent-then-machined brackets and fixtures.", category: "physics", tags: ["bending", "spring-back", "sheet-metal", "forming", "compensation"], confidence: 82, source: "document:mit2008-deforming@spring-back", created_at: "2026-03-03", usage_count: 0 },
  { id: "TK-DL-form-002", title: "Forging force with friction: F≈πR²Y(1+2µR/3h) — friction dominates for flat parts", body: "Open-die forging force for axisymmetric upsetting with friction: F = πR²Y(1 + 2µR/3h) where R=radius, Y=yield stress, h=height, µ=friction coefficient. The friction term 2µR/3h becomes dominant for large R/h ratios (flat pancake shapes), potentially doubling the required force. This explains why thin forgings need much larger presses than thick ones of the same volume. Good lubrication (low µ) is critical for reducing press tonnage requirements.", category: "physics", tags: ["forging", "friction", "force", "upsetting", "press-tonnage"], confidence: 82, source: "document:mit2008-deforming@forging-force", created_at: "2026-03-03", usage_count: 0 },
  // --- Batch 4: Mazak INTEGREX IV manuals (EIA + Mazatrol + 3D) ---
  { id: "TK-DL-mazak-001", title: "G12.1 polar coordinate interpolation for face milling on cylindrical parts", body: "G12.1 enables milling features on the face or OD of a round part by converting XY rectangular coordinates to linear+rotational (X+C) axis motion. Program contours as if working on a flat plane; the control converts to synchronized C-axis rotation and X-axis movement. Essential for keyways, flats, hexagons, and cam profiles on turned parts. Cancel with G13.1. Feed rate F is tangential speed in mm/min. Cannot activate/cancel during cutter compensation (G41/G42) — must be in G40 mode.", category: "programming", tags: ["mazak", "integrex", "polar-interpolation", "g12.1", "c-axis", "turn-mill"], confidence: 90, source: "document:mazak-eia-integrex-iv@ch6-8", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-002", title: "G07.1 cylindrical interpolation — unwrap cylinder surface for 2D programming", body: "G07.1 C<radius> 'unwraps' a cylinder surface into a flat plane for programming. The C-axis angular motion is converted to linear distance on the circumference (arc = angle * radius). Program contours using Z and C as if on a flat surface; the control handles the rotational conversion. Ideal for cam grooves, helical grooves, and text engraving on cylindrical parts. Cancel with G07.1 C0. The radius parameter defines the cylinder surface being programmed.", category: "programming", tags: ["mazak", "integrex", "cylindrical-interpolation", "g07.1", "cam-groove", "unwrap"], confidence: 90, source: "document:mazak-eia-integrex-iv@ch6-12", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-003", title: "G06.1 spline interpolation for smooth free-form machining", body: "G06.1 creates smooth curves through specified points without requiring arc segments. The control automatically generates a spline curve that passes through all programmed points. Requires at least 3 points (2+ blocks in spline mode). The curve is automatically divided at corners where the angle between segments exceeds the spline-cancel angle parameter (F101). Cancel with any Group 01 code (G00/G01/G02/G03). Best for free-form surfaces where calculating arc centers would be impractical.", category: "programming", tags: ["mazak", "spline", "g06.1", "free-form", "interpolation", "smooth-path"], confidence: 85, source: "document:mazak-eia-integrex-iv@ch6-10", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-004", title: "G43.4/G43.5 tool tip point control (RTCP) for 5-axis on INTEGREX", body: "G43.4 (Type 1) and G43.5 (Type 2) enable Rotary Tool Center Point control on multi-axis machines. When the B-axis rotates the tool, RTCP automatically compensates XYZ positions to keep the tool tip stationary on the workpiece surface. Without RTCP, rotating the B-axis would shift the cutting point. Critical for 5-axis simultaneous machining on INTEGREX machines where the milling spindle tilts via B-axis. Type 1 vs Type 2 differ in how the compensation vector is calculated relative to the rotary axis center.", category: "programming", tags: ["mazak", "integrex", "rtcp", "g43.4", "5-axis", "tool-tip-control"], confidence: 88, source: "document:mazak-eia-integrex-iv@ch15", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-005", title: "G68.5 tilted working plane for angled feature machining on INTEGREX", body: "G68.5 (Mazak T-series) or G68 (M-series) activates 3D coordinate conversion to define a tilted working plane. After setting the B-axis angle, G68.5 rotates the programming coordinate system so you can program features (holes, pockets, contours) as if working on a flat surface, even though the actual machining is at an angle. Cancel with G69.5/G69. Essential for machining features on angled faces of complex parts without recalculating coordinates manually.", category: "programming", tags: ["mazak", "integrex", "tilted-plane", "g68.5", "coordinate-rotation", "angled-features"], confidence: 88, source: "document:mazak-eia-integrex-iv@ch15-12", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-006", title: "Mazatrol auto tool development: multi-drill staging by hole diameter", body: "Mazatrol conversational programming automatically develops (selects) tools based on hole geometry. For drilling: 1 drill if DIA <= D8 parameter, 2 drills if D8 < DIA <= D9, 3 drills if D9 < DIA <= D10. A centering drill is always included. Chamfering cutters are added unless chamfer=0 or hole+chamfer fits within existing tool diameter. The system generates alarm 416 'AUTO PROCESS IMPOSSIBLE' if depth < chamfer or diameter=0 or exceeds D10 limit. Same logic applies to counterbore (RGH CBOR), back counterbore (RGH BCB), reaming, and tapping units.", category: "programming", tags: ["mazak", "mazatrol", "auto-tool-development", "conversational", "drilling", "tool-staging"], confidence: 90, source: "document:mazak-mazatrol-matrix@ch3-5-3", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-007", title: "Mazatrol unit-based programming: Common -> Material -> Process units", body: "Mazatrol programs follow a strict unit structure: (1) Common unit defines workpiece coordinate system, (2) Material Shape unit defines blank geometry, (3) Process units define machining operations. Process units include: Point (drilling/tapping/boring), Line (contour milling), Face (pocket/face milling), Turning (OD/ID/face), Bar (bar stock), Copy (pattern repeat), Corner, Facing, Threading, Grooving, and Mill-Turn. Each unit auto-develops its own tool sequence. The structure ensures safe approach/retract between units and enables automatic cutting condition calculation.", category: "programming", tags: ["mazak", "mazatrol", "conversational", "unit-structure", "program-organization"], confidence: 88, source: "document:mazak-mazatrol-matrix@ch3", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-008", title: "Automatic corner override — feed reduction at direction changes", body: "Both Mazatrol and EIA programs benefit from automatic corner override: the control reduces feed rate when approaching sharp direction changes to prevent tool shock, surface marks, and overshooting. In Mazatrol line machining, the override angle and deceleration factor are set per unit. For EIA programs, parameter-based corner deceleration activates when the included angle between consecutive moves falls below a threshold. This is especially important for finish passes where corner quality directly impacts part accuracy and surface finish.", category: "strategy", tags: ["mazak", "corner-override", "feed-reduction", "direction-change", "surface-quality"], confidence: 85, source: "document:mazak-mazatrol-matrix@ch3-6-7", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-009", title: "INTEGREX mill-turn: upper/lower turret priority and synchronization", body: "INTEGREX IV machines have upper milling spindle + lower turret for simultaneous operations. The 'Priority Function for Same Tool' optimizes tool changes by reusing the same tool across multiple units without returning to the magazine. Lower turret control allows turning operations to run simultaneously with milling operations on the upper spindle. Key constraint: when both turrets are active, the feed rate is limited by the slower operation. Program synchronization points (M-codes) ensure turret positions don't conflict. This dual-turret capability can reduce cycle times by 30-50% on complex parts.", category: "strategy", tags: ["mazak", "integrex", "mill-turn", "dual-turret", "synchronization", "cycle-time"], confidence: 85, source: "document:mazak-mazatrol-matrix@ch4-5", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-mazak-010", title: "Mazatrol 3D units: 11 curved surface types for conversational 3D machining", body: "Mazatrol Matrix 3D provides 11 unit types for machining free-form curved surfaces using conversational programming (no CAM software needed). Surfaces are defined by guide lines (GL) and cross-sections. The system generates roughing and finishing toolpaths automatically. Key advantage: shop-floor programmers can create 3D programs directly on the control without CAD/CAM knowledge. Limitations: complex multi-surface blends and undercuts still require external CAM. Best used for simple molds, dies, and sculptured features on INTEGREX machines where the geometry can be described by cross-sectional profiles.", category: "strategy", tags: ["mazak", "mazatrol", "3d-machining", "conversational", "curved-surface", "mold"], confidence: 82, source: "document:mazak-3d-unit@ch1-2", created_at: "2026-03-06", usage_count: 0 },
  // --- Batch 5: Okuma OSP-P300 Special Functions + CNCCookbook ---
  { id: "TK-DL-okuma-001", title: "Okuma TAS-S/TAS-C: real-time thermal deformation compensation at 0.1um", body: "Okuma's Thermo-Active Stabilizer has three modes: TAS-S compensates spindle bearing/motor heat during rotation, TAS-C compensates machine body deformation from ambient temperature changes, and TAS-C with thermal expansion handles differential expansion across wide-travel machines (double-column). Temperature sensors embedded throughout the machine feed data to the NC which calculates and applies compensation in real-time at 0.1um resolution — finer than the 1um minimum NC data unit. Always active in all modes (auto/MDI/manual). Compensation is transparent to the operator (doesn't affect displayed coordinates or tool offsets).", category: "setup", tags: ["okuma", "osp-p300", "thermal-compensation", "tas", "accuracy", "real-time"], confidence: 92, source: "document:okuma-osp-p300-special@sec28", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-okuma-005", title: "Okuma tool life management: 7 determination modes for automatic replacement", body: "Okuma OSP-P300 supports 7 tool life determination modes: (1) used time, (2) travel distance, (3) machining cycle count, and combinations thereof. Tools are organized in groups; when a tool reaches its life limit, the control automatically selects the next tool in the group. The TOOL LIFE sheet displays current tool status with the active tool highlighted yellow. Life data can be reset per-tool or per-group. This enables lights-out machining by pre-loading redundant tools and letting the control manage replacements automatically.", category: "setup", tags: ["okuma", "osp-p300", "tool-life", "management", "automatic-replacement", "lights-out"], confidence: 88, source: "document:okuma-osp-p300-special@sec21", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-okuma-003", title: "Okuma simplified load monitor: detect tool breakage and overload in real-time", body: "The OSP-P300 simplified load monitor continuously tracks spindle and axis servo loads during machining. When load exceeds programmed thresholds, the control can alarm, retract, or skip to the next tool. Key for detecting: broken tools (sudden load drop), worn tools (gradual load increase), and collision events (spike). Set upper limit slightly above normal cutting load for the operation. The monitor displays real-time load bars on screen. Particularly valuable for unattended production runs where operator visual/audio detection is unavailable.", category: "safety", tags: ["okuma", "osp-p300", "load-monitor", "tool-breakage", "overload", "unattended"], confidence: 88, source: "document:okuma-osp-p300-special@sec6", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-okuma-004", title: "Okuma cycle time reduction: block overlap and corner smoothing", body: "OSP-P300 cycle time reduction function optimizes motion by overlapping block processing and smoothing corner transitions. Instead of decelerating to zero at each block boundary, the control calculates allowable corner speed based on axis acceleration limits and programmed tolerance. This is most effective for programs with many short linear segments (typical CAM output). The function is similar to Fanuc's AI Contour Control and Siemens CYCLE832 but uses Okuma-specific parameters. Enable via NC parameter; the effect is most dramatic on 3D surface finishing where thousands of micro-segments would otherwise cause jerky motion.", category: "strategy", tags: ["okuma", "osp-p300", "cycle-time", "corner-smoothing", "block-overlap", "hsm"], confidence: 85, source: "document:okuma-osp-p300-special@sec9", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-cnc-021", title: "Mill CAM engraving trick: generate lathe profiles using mill CAM software", body: "If you have mill CAM but no lathe CAM, use the engraving/profiling toolpath to generate turning profiles. Draw the desired turned profile in CAD (XZ cross-section), import to mill CAM, and run an engraving toolpath along the contour. The output G-code contains the XZ coordinates of your profile. Strip the mill-specific codes (G17, spindle, etc.) and wrap the coordinates with G71 (rough turning cycle) header. The G71 cycle handles roughing passes automatically from the profile. This avoids manual coordinate calculation for complex turned profiles with arcs and tapers.", category: "programming", tags: ["lathe", "mill-cam", "engraving", "g71", "profile", "workaround"], confidence: 82, source: "document:cnccookbook-mill-cam-lathe@trick", created_at: "2026-03-06", usage_count: 0 },

  // --- Batch 6: Post Processor Training Guide + CNCCookbook G10/G51/G98-G99 ---
  { id: "TK-DL-post-001", title: "Smoothing/HSM control codes differ by controller — always output for 3D finishing", body: "Every modern CNC has high-speed smoothing but the G-codes differ completely: Fanuc G5.1 Q1 (AI Contour Control / AICC), Haas G187 P1-P3 (P1=rough/fast, P2=medium, P3=finish/precise + E tolerance), Siemens CYCLE832(tolerance, mode) with COMPCAD (converts G01 blocks to splines), Heidenhain M120 look-ahead + M124 smoothing, Okuma corner smoothing via NC parameters. ALWAYS output the appropriate smoothing code for 3D finishing operations — without it, thousands of short linear segments cause jerky motion and witness marks. Cancel smoothing after the operation (G5.1 Q0, G187 off, CYCLE832() cancel).", category: "programming", tags: ["smoothing", "aicc", "g5.1", "g187", "cycle832", "hsm", "post-processor"], confidence: 92, source: "document:autodesk-post-processor-guide@ch4-smoothing", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-002", title: "Use G01 at high feed instead of G00 for multi-axis rapids — prevents axis stall", body: "On multi-axis machines, G00 rapid moves each axis at its own maximum rate independently (not interpolated). This means the tool can reach XY position before Z clears the part, causing collision. Set highFeedMapping to map multi-axis rapids to G01 at maximum feedrate (e.g. 15000mm/min). This forces interpolated motion where all axes arrive simultaneously. Single-axis Z retracts can still use G00 safely. Most 5-axis post processors default to this behavior.", category: "safety", tags: ["multi-axis", "rapid", "g00", "high-feed", "collision", "interpolation", "5-axis"], confidence: 92, source: "document:autodesk-post-processor-guide@ch5-highFeedMapping", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-003", title: "Circular interpolation validation: check radius, sweep, and chord before G02/G03", body: "Before outputting G02/G03, validate: (1) radius ≥ minimumCircularRadius (0.01mm) — tiny arcs linearize more accurately, (2) radius ≤ maximumCircularRadius (1000mm) — large arcs lose precision with IJK format, (3) sweep ≥ minimumCircularSweep (0.01°) — near-zero arcs are just points, (4) sweep ≤ maximumCircularSweep (180° for radius mode, 360° for IJK mode), (5) chord ≥ minimumChordLength (0.25mm). Full 360° circles CANNOT use radius (R) format — must use IJK center point format. Linearize any arc that fails these checks.", category: "programming", tags: ["circular-interpolation", "g02", "g03", "validation", "radius", "sweep", "linearize"], confidence: 90, source: "document:autodesk-post-processor-guide@ch5-circular-settings", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-004", title: "3+2 work plane codes by controller: G68.2, CYCLE800, PLANE SPATIAL", body: "For 3+2 (indexed) machining, the tilted work plane code differs completely per controller: Fanuc/Haas uses G68.2 with Euler angles (typically ZXZ rotation order), Siemens uses CYCLE800 with rotation components, Heidenhain uses PLANE SPATIAL with SPA/SPB/SPC angles. Some controllers (older Haas) don't support tilted work planes at all — they output rotary axis positions directly and the post must transform XYZ coordinates using optimize3DPositionsByMachine(). Always cancel the tilted plane (G69, CYCLE800(), PLANE RESET) before WCS changes.", category: "programming", tags: ["3+2", "tilted-work-plane", "g68.2", "cycle800", "plane-spatial", "euler-angles", "5-axis"], confidence: 90, source: "document:autodesk-post-processor-guide@ch5-workPlane", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-005", title: "Inverse time feed (G93) required for multi-axis — feedrate = 1/time per move", body: "Most CNC controls require inverse time feed mode (G93) for simultaneous multi-axis moves. In G93, the F value represents 1/time_in_minutes for each move block. F2.0 means the move takes 0.5 minutes. The post processor calculates this from the actual tool tip speed: F = 1/(distance/desired_feedrate). Switch to G93 before multi-axis blocks and back to G94 (per-minute) for 3-axis sections. Some modern controls support FEED_DEGREE_MINUTE as an alternative that's easier to verify visually.", category: "programming", tags: ["inverse-time", "g93", "multi-axis", "feedrate", "5-axis", "feed-mode"], confidence: 90, source: "document:autodesk-post-processor-guide@ch8-multiaxis-feedrates", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-006", title: "Canned cycle expansion: expand to linear moves when controller lacks the cycle", body: "When a CNC control doesn't support a specific canned cycle (e.g. G76 fine boring, G77 back boring, tapping with chip breaking), the post processor must 'expand' it to equivalent linear moves. Expansion sequence for fine boring: feed to depth → dwell → orient spindle (M19) → shift away from wall → rapid retract. For peck drilling: rapid to R-plane → feed one peck depth → rapid retract to R-plane (or partial retract for chip-breaking G73). The expandCyclePoint() function handles this. Always verify expanded cycles produce correct motion before running on the machine.", category: "programming", tags: ["canned-cycle", "expansion", "g76", "fine-boring", "peck-drill", "post-processor"], confidence: 88, source: "document:autodesk-post-processor-guide@ch5-cycleExpansion", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-007", title: "Subprogram threshold: 5+ cycle points saves 60-80% program size", body: "When drilling patterns have 5 or more hole locations, converting the cycle to a subprogram (M98/M99 on Fanuc, L call on Siemens, CYCL CALL on Heidenhain) reduces program size by 60-80%. The subprogram contains the cycle definition, and each call just positions XY. This is critical for fixture plates with hundreds of holes. Subprograms can be embedded in the main file or saved as external files. Use external files when programs exceed controller memory limits. Pattern operations and repeated operations are also strong subprogram candidates.", category: "programming", tags: ["subprogram", "m98", "m99", "program-size", "drill-pattern", "optimization"], confidence: 88, source: "document:autodesk-post-processor-guide@ch4-subprograms", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-008", title: "Movement types enable parametric feeds: different rates for lead-in, cutting, plunge", body: "CAM systems classify each toolpath segment by movement type: MOVEMENT_CUTTING, MOVEMENT_LEAD_IN, MOVEMENT_LEAD_OUT, MOVEMENT_PLUNGE, MOVEMENT_RAMP, MOVEMENT_RAMP_HELIX, MOVEMENT_LINK_DIRECT, MOVEMENT_LINK_TRANSITION, MOVEMENT_RAPID. Post processors can assign different feed rates to each type using parametric feeds — e.g., plunge at 50% of cutting feed, lead-in at 75%, linking at maximum traverse. This optimizes cycle time while maintaining safe entry/exit conditions. Define feed variables (e.g., #100-#108) at program start and reference them in F words throughout.", category: "strategy", tags: ["parametric-feed", "movement-type", "lead-in", "plunge", "ramp", "optimization", "post-processor"], confidence: 85, source: "document:autodesk-post-processor-guide@ch5-onMovement", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-009", title: "G10 automates work offset setup — eliminates manual data entry errors on fixture plates", body: "G10 L2 P# X Y Z sets work offsets programmatically: P1=G54, P2=G55, through P6=G59. G10 L20 P# accesses extended offsets G54.1 P1 through P48. In G90 mode, XYZ values replace the offset; in G91 mode they add to it. Use G10 at program start to automatically configure all work offsets for a fixture plate — operator just loads the fixture and presses start. Combined with probing, G10 enables fully automated multi-part setups. LinuxCNC extends to P7=G59.1, P8=G59.2, P9=G59.3.", category: "setup", tags: ["g10", "work-offset", "fixture-plate", "automation", "setup-reduction", "multi-part"], confidence: 90, source: "document:cnccookbook-g10@syntax", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-010", title: "G51 scaling with probe feedback: sub-micron bore accuracy (Renishaw RAMTIC)", body: "G51 X Y Z P/I/J/K scales coordinates around a center point. Powerful technique: (1) rough-bore a hole, (2) probe-measure the actual diameter, (3) calculate correction factor (e.g., target 50.000mm measured 49.993mm → scale = 1 + 0.007/50 = 1.00014), (4) apply G51 with scale factor on finish pass. This is the basis of Renishaw's RAMTIC manufacturing process and achieves sub-micron accuracy by compensating for thermal expansion, tool deflection, and machine geometry errors in real-time. Cancel with G50. Per-axis scaling (I/J/K) also enables mirror imaging for symmetric parts.", category: "quality", tags: ["g51", "scaling", "probe", "ramtic", "bore-accuracy", "thermal-compensation", "mirror"], confidence: 88, source: "document:cnccookbook-g51@probe-feedback", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-011", title: "G98 vs G99 canned cycle return: G98 to initial Z (safe), G99 to R-plane (fast)", body: "On mills, G98 retracts to the initial Z position (where the tool was when the cycle started) after each hole — safe for obstacles between holes. G99 retracts only to the R-plane (closer to the workpiece) — faster for flat surfaces with no obstacles. Use G98 when there are clamps, fixtures, or height variations between holes. Use G99 for flat plates where R-plane clearance is sufficient. On lathes, G98/G99 mean something completely different: G98 = feed per minute, G99 = feed per revolution — always check which machine type when reading programs.", category: "programming", tags: ["g98", "g99", "canned-cycle", "retract", "r-plane", "initial-z", "mill-vs-lathe"], confidence: 90, source: "document:cnccookbook-g98-g99@return-modes", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-post-012", title: "Rotary axis rewind: G92 to reset position register when axis exceeds limits", body: "During continuous multi-axis machining, rotary axes can accumulate position beyond their mechanical limits (e.g., C-axis reaches 13200°). The post processor must detect when the axis approaches its limit and insert a rewind sequence: (1) retract tool to safe position, (2) use G92 to reset the axis register to equivalent position within 0-360° (e.g., G92 C240 sets the current 13200° to 240°), (3) rapid the axis to the next required position. Some controls use G28 for axis home return instead. The rewind must occur during a non-cutting move between cycle points.", category: "programming", tags: ["rotary-axis", "rewind", "g92", "axis-limits", "multi-axis", "c-axis", "post-processor"], confidence: 88, source: "document:autodesk-post-processor-guide@ch8-rewind", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-hm-macro-001", title: "hyperMILL MacroTech: 18 cut types with per-material cutting data lookup", body: "hyperMILL Advanced Cutting Profile defines 18 operation types each with material-specific parameters: helicalPlunge, rampPlunge, fullcut, standardRoughCut, optimizedSideCut (trochoidal/peel milling), optimizedFaceCut (high-feed milling), 2dSideSemiFinishing, 2dSideFinishing, 2dFaceSemiFinishing, 2dFaceFinishing, 3dSemiFinishing, 3dFinishing, plungeMilling, simpleDrilling, drillingWithChipBreak, drillingWithPecking, centering, reaming, tapping. Each type stores: n (RPM), Vc, f, fz, fzFullcut, fzPlunge, fzMax, fr (feed/rev), ae (radial DOC), ap (axial DOC), fAxial, plungeAngle, coolants, maxDrDepth, peckDepth, minInfdDepth, reduceVal, retractVal, priority. Data accessed via: AdvancedCuttingProfile.FieldValue(Material, TypeOfCut, fieldName).", category: "cam_automation", tags: ["hyperMILL", "macro", "cutting-profile", "18-operations", "material-specific", "automation"], confidence: 95, source: "document:hyperMILL-MacroTech-vtEditorConditionVariables.xml", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-hm-macro-002", title: "hyperMILL Macro DB schema: Machine_Group × Material_Group → Job chain for automation", body: "hyperMILL Macro Database (SQLite/MariaDB/SQL Server) drives job automation via relational chain: MacroType→Macro→Job→Job_Parameter. Each Macro has Machine_Group and Material_Group filters, priority ranking, and feature-based selection. Each Job stores: SystemJobType (2D/3D/turning/drilling), ToolType, ToolDiameter, ToolTolerance, ToolMinLength, ToolNumber, ToolName, StockResolution, plus binary geometry blobs (ToolGeometry, HolderGeometry, ExtensionGeometry). Job_Parameter stores key-value pairs with Usage context. Features link to macros via Feature→Feature_Parameter for geometry-driven strategy selection. This enables: load model → detect features → select macro by material+machine → generate complete job with correct tools and cutting data.", category: "cam_automation", tags: ["hyperMILL", "macro-database", "job-automation", "feature-detection", "machine-group", "material-group"], confidence: 90, source: "document:hyperMILL-MacroTech-MacroDB-sqlite.sql", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-hm-macro-003", title: "hyperMILL tool property namespace: 60+ properties for macro condition logic", body: "hyperMILL Virtual Tool Editor exposes 60+ tool properties for macro conditions. NCTool: NCNumber, ToolReach, ExtensionReach, ClearanceLength, UsableLength, GageLength, CompensationLength, Holder.CoolantThrough. MillingTool: Diameter, CornerRadius, TipLength, CuttingLength, CuttingEdges, CoreDiameter, CoreHeight, TaperAngle, NominalDiameter, TipDiameter, LensRadius, ShaftDiameter. Barrel tools: BarrelHeight, BarrelRadius, BarrelTaperAngle, BaseDiameter, BaseCornerRadius. T-Slot: DiscHeight, Upper/LowerCornerType/Radius/ChamferAngle/Height. Drill: TipAngle, BreakThroughLength, NoTipLength, CenteringRequired, Pitch, MinPitch, MaxPitch, TapTipType (spiralPoint/spiralFlute/forming/undefined), ThreadMillTipType (fullThread/partialThread/singleThread), ThreadApplication (internal/external/both). Boring bar: MinDrillDiameter, PresetDiameter, MaxDrillDiameter. Insert: Type, IsoCode, Thickness, CornerRadius, Angle. ToolHolder: ApproachAngle, MountingDirection.", category: "tooling", tags: ["hyperMILL", "tool-properties", "barrel-tool", "t-slot", "boring-bar", "macro-conditions", "virtual-tool-editor"], confidence: 95, source: "document:hyperMILL-MacroTech-vtEditorConditionVariables.xml", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-hm-macro-004", title: "hyperMILL cutting profile lookup requires compound Material × Purpose key", body: "hyperMILL CuttingProfile technology data uses compound key lookup: CuttingProfile.FieldValue(Joblist.Material, UserVariable.UserPurpos, 'fieldName'). Basic profile fields: SpindleSpeed, Feedrate, FeedrateZ, ReducedFeedrate, CuttingSpeed, FeedratePerEdge, DrillingFeedrate, Coolants, CuttingWidth, CuttingLength, PlungeAngle, MaxRedFeedrateAngle, RetractFeedrate. Advanced profiles add CuttingClass dimension with separate fz values: fz (standard), fzFullcut (slotting), fzPlunge (axial entry), fzMax (maximum limit). Missing Material or Purpose key returns no data — always validate both are set before macro execution. CuttingProfile also has Material and CuttingMaterial properties for cross-referencing workpiece vs tool substrate.", category: "cam_automation", tags: ["hyperMILL", "cutting-profile", "compound-key", "material-lookup", "feed-rates", "coolant-selection"], confidence: 90, source: "document:hyperMILL-MacroTech-vtEditorConditionVariables.xml", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-haas-001", title: "Haas-specific G-codes beyond standard Fanuc: G143, G150, G154, G187, G234, G254", body: "Haas NGC control extends Fanuc compatibility with unique codes: G143 (5-axis tool length comp, replaces G43.4), G150 (general purpose pocket milling cycle), G154 P1-P99 (99 extended work coordinates — far more than Fanuc's 48), G156 (broaching canned cycle), G174/G184 (non-vertical rigid tapping CCW/CW — tap holes on angled surfaces), G187 Pn En (smoothness level: P1=rough/fastest, P2=medium, P3=finish/smoothest, E=corner tolerance in inches), G234 (TCPC — Tool Center Point Control for 5-axis), G253 (orient spindle normal to feature coordinate system), G254/G255 (Dynamic Work Offset DWO — rotates coordinate system to tilted work plane without manual trig), G266 (visible axes linear rapid % motion), G268/G269 (Feature Coordinate System enable/disable). Key settings: 191 (default smoothness), 254 (5-axis rotary center distance).", category: "controller", tags: ["haas", "g-codes", "G143", "G187", "G234", "G254", "5-axis", "TCPC", "DWO"], confidence: 95, source: "document:haas-2023-mill-operators-manual", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-haas-002", title: "Haas macro variables: #7001-#7386 work offsets, #8608-#8617 tool usage tracking", body: "Haas macro variable ranges for automation: #7001-#7006 = G110 (G154 P1) offsets, #7021-#7026 = G111 (G154 P2), through #7041-#7386 for G112-G129 (G154 P3-P20). Extended: #14001-#15966 for G154 P1-P99. Tool usage tracking: #8608 (set desired tool), #8609 (current tool number), #8610 (total time for tool), #8611 (feed time), #8612 (total time all tools), #8605 (next usage), #8614-#8617 (usage timestamps and loads). Key macro codes: G65 Pxx (macro subprogram call with variable passing), M96 Pxx Qxx (conditional branch on discrete input = 0), M97 Pxx (local subroutine call), M109 (interactive user input). Note: Haas stores decimals as binary — variables may read ±1 LSB (e.g., 7.000000 stored as 6.999999 or 7.000001).", category: "controller", tags: ["haas", "macro", "variables", "automation", "tool-usage", "work-offsets", "G154"], confidence: 90, source: "document:haas-2023-mill-operators-manual@macros", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-haas-003", title: "Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour", body: "Haas High Speed Machining option uses 'Acceleration Before Interpolation' (ABI) algorithm combined with full look-ahead to achieve contouring feeds up to 1200 ipm (30.5 m/min) without path distortion. ABI pre-calculates acceleration requirements before interpolation begins, preventing corner overshoot. Combined with G187 smoothing: P1 (rough) allows maximum corner rounding for speed, P2 (medium) balances speed/accuracy, P3 (finish) minimizes rounding with E tolerance (e.g., G187 P3 E0.0005 = 0.5 thou max deviation). Setting 191 controls default smoothness at power-up. For 5-axis HSM, G234 TCPC maintains tool center point accuracy during simultaneous rotary+linear motion.", category: "strategy", tags: ["haas", "HSM", "ABI", "look-ahead", "G187", "smoothing", "contouring", "1200-ipm"], confidence: 90, source: "document:haas-2023-mill-operators-manual@HSM", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-dfm-001", title: "DFM tolerance tiers: standard ±0.125mm, tight ±0.050mm, precision ±0.025mm", body: "CNC machining tolerance tiers: Standard (default if not specified): ±0.125mm (±0.005 in). Tight (specifiable at higher cost): ±0.050mm (±0.002 in). Precision/feasible (maximum, significant cost): ±0.025mm (±0.001 in). These apply to any linear dimension. Tighter than ±0.025mm requires grinding, lapping, or EDM. Surface finish: as-machined standard 3.2 µm Ra (125 µin), fine machining down to 0.4 µm Ra (16 µin). Anodizing Type III (hardcoat) adds ~50 µm coating thickness — account for this in tolerance stack.", category: "quality", tags: ["DFM", "tolerance", "surface-finish", "Ra", "anodizing", "precision"], confidence: 90, source: "document:CNC-Complete-Engineering-Guide@tolerances", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-dfm-002", title: "DFM design rules: wall 0.8mm metals, cavity 4×W, hole 4×D, thread M6+", body: "CNC milling design constraints with recommended/feasible limits: Min wall thickness: metals 0.8mm rec / 0.5mm feasible, plastics 1.5mm rec / 1.0mm feasible. Cavity depth: 4× cavity width rec, max 10× tool diameter or 250mm. Internal fillet radius: >1/3 cavity depth (tool deflection limit). Hole depth: 4× nominal diameter rec, 10× max. Tall features: height/width ratio <4. Thread size: M6+ recommended, M2 minimum, length max 3× nominal diameter. Small features: 2.5mm minimum (0.1mm with micro-machining). Undercut clearance: 4× depth, width 3-40mm standard, cutting depth max 2× width. Max part envelope: 3-axis mill 400×250×150mm typical, lathe Ø500×1000mm typical.", category: "design", tags: ["DFM", "wall-thickness", "cavity-depth", "hole-depth", "thread", "undercut", "part-size"], confidence: 90, source: "document:CNC-Complete-Engineering-Guide@design-rules", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-dfm-003", title: "CNC machine hourly rates: 3-axis $75, turning $65, 5-axis indexed $120, continuous $150", body: "CNC machining cost benchmarks (2024 industry averages): 3-axis milling $75/hr (baseline), CNC turning $65/hr (-15%), indexed 5-axis milling $120/hr (+60%), continuous 5-axis milling $150/hr (+100%), mill-turn centers $95/hr (+25%). Economy of scale: ordering 10 identical parts reduces unit price by ~70% vs single part. Volume decision tree: 1-10 parts → CNC or 3D print; 10-100 → CNC machining; 100-1000 → CNC (consider injection molding for plastics, investment casting for metals); 1000+ → injection molding or die casting. Material cost ranking: Al 6061 ($) cheapest metal, PEEK ($$$$) most expensive plastic.", category: "economics", tags: ["cost", "hourly-rate", "3-axis", "5-axis", "turning", "volume", "economy-of-scale"], confidence: 85, source: "document:CNC-Complete-Engineering-Guide@costs", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-okuma-001", title: "CRITICAL: Okuma G28 = torque limit cancel (NOT home return!), G20 = home return", body: "Okuma OSP-P200L G-code numbering differs fundamentally from Fanuc — direct translation will CRASH the machine. Critical differences: G20=home position return (Fanuc G28), G28=torque limit cancel (Fanuc: home return!), G29=torque limit command (Fanuc: return from ref), G30=skip/probe cycle (Fanuc G31), G50=zero shift + max spindle speed (dual purpose), G75=auto chamfering (Fanuc: grooving!), G76=auto corner rounding (Fanuc: threading!). Thread cycles: G31/G33=fixed thread longitudinal, G32=end face thread, G34/G35=variable lead increasing/decreasing, G71/G72=compound thread long/transverse. Grooving: G73/G74 (Fanuc: pattern repeat/peck drill!). Tapping: G77 RH/G78 LH. LAP (Lathe Auto-Programming): G80-G88. Coolant: M50/M51 (not M08/M09). Work offsets: G15 H# system (not G54-G59).", category: "controller", tags: ["okuma", "OSP-P200L", "g-code", "G28-danger", "translation", "safety-critical", "home-return"], confidence: 95, source: "document:Okuma-OSP-P200L-Programming-Manual", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-fanuc-alarm-001", title: "Fanuc alarm codes: top 15 crash-risk alarms every machinist must know", body: "Critical Fanuc alarm codes ranked by crash/damage risk: SERVO alarms (machine damage): 400=motor overload (STOP IMMEDIATELY), 407=excess following error (axis lost position — CRITICAL), 409=torque limit exceeded. Programming (crash risk): 11=no feedrate commanded (will freeze mid-cut), 29/30=illegal offset value/number (wrong tool comp → gouge), 33=no CRC solution (geometry impossible), 38/41=interference in circular/CRC block (tool will gouge), 90=reference return incomplete (machine doesn't know position — DANGEROUS). Common: 3=too many digits, 10=improper G-code, 20=over tolerance of radius (arc center/endpoint mismatch >0.001mm), 59=program number not found, 70=no memory space, 77=subprogram nesting exceeded (max 4 levels on most controls), 85=communication error, 112=divide by zero in macro. Action for servo alarms: DO NOT restart without understanding cause — check for mechanical binding, crashed tool, or drive failure.", category: "troubleshooting", tags: ["fanuc", "alarm", "servo", "crash-risk", "error-codes", "safety", "diagnostics"], confidence: 95, source: "document:CNCCookbook-Fanuc-Alarm-Code-List", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-thread-001", title: "Thread milling: 70% diameter rule, single-point vs multi-form selection, arc entry", body: "Thread milling key rules: (1) Thread mill diameter must be ≤70% of hole diameter to avoid profile distortion. (2) Single-point vs multi-form selection: single-point for flexibility (any pitch), low forces (thin walls, long reach), hardened materials; multi-form for production speed (one pass possible), longer tool life (wear spread). (3) Entry method: 90° arc entry preferred over linear plunge (lower forces, no delay mark, better accuracy). For tapered/pipe threads, correct the helix every 90° to account for taper — subdivide into 45° (8-segment) arcs for higher accuracy. (4) Helical interpolation: simultaneous G02/G03 XY arc + linear Z motion. Program as: G02 X_ Y_ Z_ I_ J_ F_ where Z gives pitch-per-revolution advancement. Climb milling (conventional thread direction) preferred for thread mills.", category: "strategy", tags: ["thread-milling", "helical-interpolation", "70-percent-rule", "single-point", "multi-form", "arc-entry", "tapered-thread"], confidence: 90, source: "document:CNCCookbook-Thread-Milling-Guide", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-gcode-exact-001", title: "G09 vs G61 vs G60: exact stop (one-shot vs modal) and anti-backlash for probing", body: "Exact stop modes: G09=one-shot (auto-cancels after one block, no cancel needed), G61=modal exact stop (persists until G64 cancels — forces servo error to zero before each block). G61 is NOT just a dwell — it forces the servo loop to fully settle the position error. G61 should NOT be used for roughing (wastes cycle time; finish pass exists to clean up roughing errors). G60=one-shot single-direction approach (anti-backlash) — forces machine to overshoot and return from one consistent direction. G60 is specified on EVERY line (not modal). Primary G60 use cases: probing operations (touch probe) and precision bore finishing where backlash would cause measurement/position error. G64=cutting mode (default) — enables corner blending/look-ahead for smooth motion. Note: not all controllers support G61; some silently ignore it.", category: "programming", tags: ["G09", "G61", "G60", "G64", "exact-stop", "anti-backlash", "probing", "servo-settle"], confidence: 90, source: "document:CNCCookbook-G61-G64-G60", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-gcode-css-001", title: "G96 CSS: RPM = (SFM × 12) / (π × diameter), G50 S-clamp prevents spindle overspeed", body: "Constant Surface Speed formula: RPM = (SFM × 12) / (π × Diameter_inches). As diameter decreases toward center during facing, RPM increases to maintain constant surface speed — at very small diameters, RPM approaches infinity. G50 S#### sets maximum RPM clamp (e.g., G50 S3500 limits to 3500 RPM). ALWAYS program G50 S#### before G96 to prevent spindle overspeed at small diameters. G96 is essential for good surface finish on facing operations — without it, SFM drops as diameter decreases, causing finish degradation. G97 cancels CSS and returns to direct RPM mode. Some controls use D-word for RPM limit instead of G50. CSS is primarily a lathe feature but applies to any operation where cutting diameter changes (mill-turn facing, boring).", category: "programming", tags: ["G96", "CSS", "constant-surface-speed", "G50", "speed-clamp", "facing", "lathe", "RPM-formula"], confidence: 92, source: "document:CNCCookbook-G96-CSS", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-siemens-5ax-001", title: "Siemens SINUMERIK 5-axis: TRAORI activation, CYCLE832 8-digit encoding, orientation modes", body: "SINUMERIK 5-axis essentials: (1) TRAORI activates 5-axis transformation — MUST be called before any 5-axis motion. TRAFOOF deactivates. After tool change, re-issue TRAORI (WO resets). (2) CYCLE832 parameter is 8 digits: positions 1-2 = tolerance (0.01-0.05mm), positions 3-4 = compressor mode (01=COMPCURV, 11=COMPCAD), positions 5-6 = orientation smoothing (00=off, 01=on), positions 7-8 = reserved. Example: CYCLE832(0.01, 112011) = 0.01mm tolerance + COMPCAD + ori smoothing. (3) Orientation interpolation: ORIAXES=linear axis interpolation (default, fast), ORIVECT=great-circle interpolation on tool tip sphere (better for ruled surfaces), ORICONCW/ORICONCCW=conical (barrel cutters). Use ORIAXES for general 5-axis, ORIVECT for flat/ruled walls where axis reversal causes marks. (4) Always use 5-6 decimal places for 5-axis coordinates — 3 decimals causes visible faceting on curved surfaces. (5) FFWON + SOFT combination recommended for smooth 5-axis motion (feedforward + jerk limiting).", category: "controller", tags: ["siemens", "SINUMERIK", "TRAORI", "CYCLE832", "5-axis", "ORIAXES", "ORIVECT", "COMPCAD", "orientation"], confidence: 92, source: "document:Siemens-SINUMERIK-5-Axis-Programming", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-siemens-5ax-002", title: "Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing", body: "SINUMERIK compressor modes: COMPCURV (G-code COMPOF/COMPCURV) creates C2-continuous spline approximation — good for 3-axis roughing/semi-finish where tolerance can be relaxed. COMPCAD creates C3-continuous spline with curvature-continuous transitions — required for 5-axis finishing where surface quality matters. COMPCAD produces smoother acceleration profiles, reducing servo lag marks on curved surfaces. Performance impact: COMPCAD requires ~30% more NCK processing time than COMPCURV. Decision tree: 3-axis roughing → COMPCURV (speed); 3-axis finishing → COMPCAD (quality); 5-axis any → COMPCAD (mandatory for good surface). Program structure: CYCLE832 activates both compressor and tolerance in one call. Manual activation: COMPCAD + CTOL=0.01 + OTOL=0.01 for independent control of contour and orientation tolerance.", category: "strategy", tags: ["siemens", "COMPCAD", "COMPCURV", "compressor", "5-axis", "surface-quality", "spline", "C3-continuous"], confidence: 90, source: "document:Siemens-SINUMERIK-5-Axis-Programming", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-okuma-002", title: "Okuma named variables and LAP auto-programming (G80-G88) for turning cycles", body: "Okuma OSP unique features: (1) Named variables: Okuma uses COMMON VARIABLE with names (VC1-VC200 common, VB1-VB100 local) instead of Fanuc # numbers. System variables: VTOFX/Z (tool offset X/Z), VMTRS (tool-change count), VSPDR (spindle speed). (2) LAP (Lathe Auto-Programming) G80-G88: G80=outside turning/grooving, G81=inside turning, G82=drilling, G83=outside grooving, G84=inside grooving, G85=outside threading, G86=inside threading, G87=outside necking, G88=inside necking. LAP takes raw geometry profile and generates roughing+finishing automatically — like a built-in CAM for simple parts. (3) Safety barriers: M24=barrier ON (machine stops if program tries to move past barrier coordinates), M25=barrier OFF. Use M24 for operator safety during bar-feeder or pallet changer operations. (4) T-code format: T0101 = tool station 01 + offset 01 (4-digit), T010101 = 6-digit format on newer controls.", category: "controller", tags: ["okuma", "named-variables", "LAP", "G80-G88", "safety-barrier", "M24", "auto-programming", "turning"], confidence: 90, source: "document:Okuma-OSP-P200L-Programming-Manual", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-g71-001", title: "G71 rough turning: Type I vs Type II, U-word overloading trap, direction conventions", body: "G71 rough turning cycle critical details: (1) Type I (single-line, monotonic profiles): G71 U(doc) R(retract). Next line: G71 P(start) Q(end) U(finish_X) W(finish_Z) F(feed). The U-word is OVERLOADED — in line 1 it means depth-of-cut, in line 2 it means X finish allowance. This is the #1 programming trap. (2) Type II (2-line format, handles pockets/non-monotonic): G71 U(doc) R(retract) on line 1, G71 P(start) Q(end) U(finish_X) W(finish_Z) F(feed) on line 2. Type II can machine concave profiles that Type I cannot. (3) Direction sign conventions: U positive = cut away from center (OD turning), U negative = cut toward center (ID boring). W positive = cut toward tailstock, W negative = cut toward chuck. (4) First block (P label) MUST be G00 or G01 — G02/G03 arc as first move causes alarm. (5) F/S/T in profile blocks are IGNORED during roughing — only the F/S in the G71 call line apply. The profile F/S only apply during G70 finish pass.", category: "programming", tags: ["G71", "rough-turning", "type-I", "type-II", "U-word-overload", "direction", "monotonic", "pocket"], confidence: 93, source: "document:CNCCookbook-G71-Rough-Turning", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-g76-001", title: "G76 threading: Fanuc P-word 6-digit encoding, constant-area pass scheduling, A58 infeed", body: "G76 threading cycle deep knowledge: (1) Fanuc P-word encoding (6 digits): first 2 digits = number of spring/finish passes (00-99), middle 2 digits = chamfer amount in 0.1×lead increments (e.g., 10 = 1.0×lead), last 2 digits = infeed angle (00=radial, 29=29°, 30=30°, 55=compound, 60=alternating flank). Example: P021060 = 2 spring passes, 1.0×lead chamfer, 60° alternating flank. (2) Constant-area pass scheduling: depth_N = first_depth × sqrt(N). So pass depths are: D1, D1×sqrt(2), D1×sqrt(3)... This keeps cutting AREA constant per pass (not depth), preventing progressive overload as thread deepens. (3) Optimal infeed angle: A58 (29° per side) distributes cutting forces evenly between flanks for 60° metric/unified threads. A55 (compound) cuts mainly on leading flank — preferred for coarse pitches (>2mm lead) to reduce chatter. A0 (radial) gives best thread form accuracy but highest forces — use only for fine pitches (<0.5mm). (4) Multi-dialect parameter mapping: Fanuc G76/G92, Siemens CYCLE97, Okuma G85 (outside)/G86 (inside), Mazatrol THREAD CUTTING.", category: "programming", tags: ["G76", "threading", "P-word-encoding", "constant-area", "infeed-angle", "A58", "spring-passes", "chamfer"], confidence: 93, source: "document:CNCCookbook-G76-Threading", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-face-mill-001", title: "Face milling: 45° vs 90° lead angle (+40% MRR), wiper inserts, interrupted cut rules", body: "Face milling lead angle selection: (1) 45° lead angle: chip thinning effect allows +40% higher feed rate vs 90° at same chip load, lower radial forces (better for thin-wall parts), smoother entry/exit. Trade-off: higher axial forces — requires rigid fixturing and sufficient part thickness. (2) 90° lead angle: true chip thickness = feed per tooth (no thinning correction needed), lower axial forces (better for thin parts on magnetic chuck), required when milling shoulders or steps adjacent to face. (3) Wiper insert: one wiper insert per cutter body, positioned 0.05-0.08mm below standard inserts. Wiper generates final surface — allows doubling feed rate while maintaining same Ra. Only effective at DOC < 0.8mm (above 0.8mm, regular inserts dominate surface). (4) Interrupted cutting: reduce feed 50% when >30% of cutter width is air (prevents impact shock), prefer climb milling direction for entry (thinnest chip at exit reduces breakout chipping). (5) Cutter diameter = 1.3-1.5× workpiece width for full-face coverage without re-cut.", category: "strategy", tags: ["face-milling", "lead-angle", "45-degree", "90-degree", "wiper-insert", "interrupted-cut", "chip-thinning", "MRR"], confidence: 90, source: "document:CNCCookbook-Face-Milling-Guide", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-deep-hole-001", title: "Deep hole drilling: L/D thresholds (5D peck, 7D parabolic, 10D custom, 20D gun drill)", body: "Deep hole drilling L/D ratio decision table: (1) L/D ≤ 3: Standard drill, no peck needed (chip evacuation sufficient with through-coolant). (2) 3 < L/D ≤ 5: Peck drilling (G83) with peck depth = 1D first peck, decreasing 20% per subsequent peck. Full retract every 3-5 pecks for chip clearing. (3) 5 < L/D ≤ 7: High-performance peck with parabolic flute drill (better chip evacuation geometry). Peck depth = 0.5D, through-coolant MANDATORY (70+ bar). (4) 7 < L/D ≤ 10: Parabolic flute drill with through-coolant at 70+ bar. Consider pilot hole (2D depth, +0.5mm oversize) for drill wander prevention. (5) 10 < L/D ≤ 20: Custom cycle with phased strategy — standard drill to 3D, switch to long-series drill for remaining depth. Pecks = 0.25-0.5D, 100+ bar through-coolant. (6) L/D > 20: Gun drill (single-flute, self-guiding) or BTA/STS system. Gun drill speed = 50-80% of standard SFM, feed = 0.005-0.015 mm/rev. Requires guide bush and high-pressure coolant (100+ bar). Key rule: NEVER exceed 3× body-diameter in a single peck — chip packing causes catastrophic drill failure.", category: "strategy", tags: ["deep-hole", "drilling", "L/D-ratio", "peck", "parabolic", "gun-drill", "through-coolant", "chip-evacuation"], confidence: 92, source: "document:CNCCookbook-Deep-Hole-Drilling", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-inventorcam-hsm-001", title: "InventorCAM HSM finishing: 17 strategies, ball nose step down = R/5, bull nose = R/3", body: "InventorCAM/SolidCAM HSM finishing strategy selection: 17 strategies grouped by geometry: (1) Planar/shallow (<30° slope): Parallel Finishing, Pencil Finishing (corners), Contour Finishing (walls). (2) Steep (>30° slope): Constant-Z Finishing, Helical Finishing. (3) Combined: Hybrid Finishing (auto-switches planar↔steep at angle threshold). (4) 3D surface: Scallop Finishing (constant cusp height), Morph Spiral (single-pass spiral from boundary), Flow Finishing (follows surface UV). (5) Specialized: Rest Finishing (re-machine with smaller tool), Geodesic (steep walls), Pencil (corners/fillets only). Step down formulas: ball end mill = cutter radius / 5 (R/5) for standard finish, R/3 for rougher finish; bull nose = corner radius / 3. Stepover for ball end: stepover = sqrt(8 × R × cusp_height) where cusp_height = target Ra / 2. Default stepover: 10% of cutter diameter for finishing, 65% for HM roughing. Linking: minimum retract preferred over full retract (saves 20-40% cycle time on complex surfaces).", category: "strategy", tags: ["InventorCAM", "SolidCAM", "HSM", "finishing", "ball-nose", "step-down", "stepover", "cusp-height", "strategy-selection"], confidence: 88, source: "document:InventorCAM-HSM-Training-Manual", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-inventorcam-hsr-001", title: "InventorCAM HSR roughing: 5 strategies, iMachining adaptive, Hybrid Rib for thin walls", body: "InventorCAM/SolidCAM HSR (High Speed Roughing) strategies: (1) HM Roughing: trochoidal/adaptive toolpath with constant engagement angle. Stepover = 65% of tool diameter for optimal chip thinning. DOC = up to 2× tool diameter (full flute engagement). (2) iMachining 2D: proprietary morphing spiral — automatically calculates optimal feed, speed, and stepover. Tool loading stays constant regardless of geometry. Saves 70% cycle time on pockets vs conventional. (3) iMachining 3D: extends 2D algorithm to freeform surfaces — automatic rest detection and re-machining. (4) Hatch Roughing: parallel zig-zag for simple open faces. Fast but higher tool load at direction changes. (5) Hybrid Rib Roughing: specialized for thin walls and ribs — machines alternating sides to equalize deflection forces. Critical for aerospace structural parts with wall thickness < 2mm. Rest material detection: automatic comparison between previous and current tool — only machines remaining stock. Enable 'Optimized Stock Engagement' for automatic feed reduction in corners where engagement spikes. Key setting: 'Machine Thin Walls' checkbox enables reduced-force strategy near thin features.", category: "strategy", tags: ["InventorCAM", "SolidCAM", "HSR", "roughing", "iMachining", "adaptive", "trochoidal", "rib-roughing", "thin-wall", "rest-material"], confidence: 88, source: "document:InventorCAM-HSR-Training-Manual", created_at: "2026-03-06", usage_count: 0 },
  // === Batch 7: SWARF, Sim5X, Turning, Workholding, Feeds/Speeds, Siemens 3D Comp (2026-03-06) ===
  { id: "TK-DL-swarf-001", title: "SWARF machining: line contact vs point, 3 deg max angle step, rib-before-pocket sequencing", body: "SWARF (Side-Wall Axial Relief Finishing) uses tool flank (peripheral) cutting — contact is a LINE, not a point like ball-nose. This produces superior surface quality with fewer passes. Key rules: (1) Use for steep-area machining on ruled/drafted walls where flat or taper endmill rides wall with full flute contact. (2) Machine thin ribs BEFORE adjacent pockets — ribs vibrate and tear off once surrounding material removed. (3) Max angle step = 3 deg for tool axis interpolation (consistent across all SWARF ops). Larger values cause visible faceting; smaller values increase program size without proportional quality gain. (4) Separate SWARF surfaces from floor surfaces as distinct geometry inputs. (5) Corner handling: inside corners use Sharp corner strategy, outside corners use Roll around. (6) Gouge checking: use Swarf & additional surfaces with explicit check surfaces under Avoid by relinking. (7) Create separate SWARF operations per wall group (5+ semi-finish + 5+ finish is typical for aerospace) for better tool axis control per region.", category: "strategy", tags: ["SWARF", "5-axis", "peripheral-milling", "line-contact", "surface-finish", "aerospace", "rib-sequencing", "angle-step"], confidence: 90, source: "document:InventorCAM-SWARF-Training", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-sim5x-001", title: "Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes", body: "Simultaneous 5-axis strategy selection tree: (1) Parallel Cuts: general surface finishing, linear or constant-Z work types. (2) Parallel to Curve/Surface: follow edge contour — drive and check surfaces MUST share common edge. Ball-nose tools MUST enable Tool center based calculation. (3) Morph between curves: impeller blades, twisted parts. (4) Geodesic: complex 3D shapes requiring CONSTANT step-over and undercut areas. (5) SWARF: steep walls/ruled surfaces — line contact for superior finish. (6) Projection: projects curves onto drive surfaces. (7) Contour 5X: wire-frame input, no machining surfaces needed. (8) 3-to-5 conversion: deep cavities — convert HSM ops using shorter tools with tilt, source MUST use ball-nose. Tool axis control modes: tilted relative to cutting direction (lead/lag + side tilt), tilted to surface normal, tilted to/from point, tilted through/from curve. Climb milling preferred for heat-treated alloys; conventional for rough castings/forgings.", category: "strategy", tags: ["5-axis", "simultaneous", "strategy-selection", "parallel", "morph", "geodesic", "SWARF", "projection", "tool-axis"], confidence: 88, source: "document:InventorCAM-Sim-5X-User-Guide", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-sim5x-002", title: "5-axis gouge avoidance: 4 check sets, tilt/retract/trim strategies, pole singularity handling", body: "5-axis gouge check system: 4 independent check sets, each selecting tool components (holder, arbor, shaft, tip) and geometry (drive surfaces, check surfaces with stock-to-leave, model, fixture, STL). Avoidance strategies: (1) Retract: 14 directions including surface normal, tool axis, optimized in planes. (2) Tilt: use lead/lag angle, side tilt, or automatic (equal/prefer-rotary/prefer-tilt). Minimize tilting keeps angles constant for better surface quality. (3) Trim and relink: 6 modes for partial toolpath removal. (4) Stop calculation. Critical options: Check gouge between positions ESSENTIAL for flat faces with sparse positions (prevents boss gouging). Check link motions for collision. Pole handling: when tool axis parallels rotation axis, rotation angle is arbitrary (singularity). Options: freeze angle, linear/smooth interpolation, force table rotations. Pole angle tolerance defines parallelism threshold. Rapid move safety: some 5-axis machines lack G0 synchronization — replace with G1 at high feed rate (e.g., F9998).", category: "safety", tags: ["5-axis", "gouge-check", "collision-avoidance", "tilt", "retract", "pole-singularity", "holder-check", "rapid-safety"], confidence: 90, source: "document:InventorCAM-Sim-5X-User-Guide", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-turning-001", title: "CNC turning: partial machining 1mm overlap, geometry direction rules, balanced rough 2-tool", body: "CNC turning key rules: (1) Partial machining for long parts: divide geometry into segments, each machined separately. Segments MUST overlap approx 1mm to avoid surface discontinuities. Approach/retreat arcs tangential to geometry, radius = tool nose radius. (2) Geometry direction rules: internal turning geometry MUST be directed in -Z direction. Threading geometry MUST be directed in -Z direction. Cutoff geometry MUST be directed toward rotation axis. Face turning geometry MUST be directed opposite to X-axis. (3) Balanced rough: two tools (Master + Slave) cut simultaneously — Trailing mode with defined distance offset (e.g., 2mm). Nearly halves cycle time. Corner radius of master and slave tools MUST be identical. (4) Grooving step over MUST be less than tool width. (5) Trochoidal turning: rounded passes for smooth path, enables high cutting speed + reduced tool wear but CANNOT use CNC-machine canned cycles. (6) Rest material: system auto-detects unmachined areas, uses opposite-hand tool orientation (Left to Right) for unreachable areas.", category: "strategy", tags: ["turning", "partial-machining", "overlap", "geometry-direction", "balanced-rough", "trochoidal-turning", "rest-material", "grooving"], confidence: 90, source: "document:InventorCAM-Turning-Mill-Turn-Course", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-millturn-001", title: "Mill-turn: XZC vs XYZC vs XYZCB, facial/radial output modes, turret safety sequencing", body: "Mill-turn machine capability tiers: (1) 3-axis XZC: facial + indexial + simultaneous milling, NO Y-axis movements. Use Face mode (XC polar output) for max compatibility. (2) 4-axis XYZC: full facial/indexial/simultaneous milling with Y-axis. Use Diameter mode (XYZ output). (3) 5-axis XYZCB: all operations including B-axis tilting. Turret safety sequencing: ALWAYS retract non-active turret to safe position (RAPID) before starting operations on other turret. Before turning with lower turret: upper turret MUST retract. Before part transfer: lower turret MUST retract. Part transfer sequence: back spindle approaches at safety distance (RAPID), clamp opens, approaches at FEED (200mm/min), clamps on stock, main spindle opens, back spindle returns to home (RAPID). Feed speed for part pickup approach is CRITICAL — too fast risks collision/damage. Swiss-type: parts up to 38mm diameter, L/D > 5 achievable, spline approximation tolerance = 0.005mm.", category: "strategy", tags: ["mill-turn", "XZC", "XYZC", "XYZCB", "turret-safety", "part-transfer", "swiss-type", "facial-milling", "polar-output"], confidence: 88, source: "document:InventorCAM-Turning-Mill-Turn-Course", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-workholding-001", title: "Workholding selection: vise, vacuum (14.7 psi limit), mandrel, fixture plate + ball locks", body: "Workholding selection by part type: medium prismatic: milling vise; large plate: step clamps on fixture plate; many small parts: Pit Bull/edge clamps on plate; round parts: 3-jaw chuck or collet on 4th axis; very thin: vacuum or double-sided tape; no clampable features: wax, low-melt alloy (bismuth), or glue; full top access: toe clamps or expanding mandrels; 2-sided machining: CAM tab supports; production: tooling plate with ball locks (30-second changes, repeatable to 0.0005 in). Vacuum fixtures: hold-down force = 14.7 psi x part area at sea level — small parts pop off when cutting forces exceed vacuum capacity. Step clamps: keep bolt CLOSE to workpiece (not step block), angle clamp down by raising step block above level, use soft shim (soda can strip) to avoid marring. Expanding mandrels: insert into hole on underside, expand to lock — access from every direction except bottom. CAUTION: remember mandrel locations to avoid tool collision inside pockets.", category: "setup", tags: ["workholding", "vise", "vacuum", "mandrel", "step-clamp", "toe-clamp", "fixture-plate", "ball-lock", "soft-jaw"], confidence: 88, source: "document:CNCCookbook-Workholding-Guide", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-chip-thin-001", title: "Chip thinning: <50% radial engagement needs 2-4x feed increase, 5-flute +30% MRR", body: "Radial chip thinning correction: when cut width < 50% of cutter diameter, actual chip is thinner than nominal chip load. MUST increase feed rate so max chip thickness equals recommended chip load. At 5% stepover, corrected feed is approx 4x the naive calculation. Without correction, tool RUBS instead of cutting — destroying edge and work-hardening material. Flute count MRR gains (same chip load/RPM): 5-flute vs 4-flute = +30% MRR; 6-flute vs 4-flute = +60% MRR. Steel profiling: 5-6 flutes recommended. Aluminum slotting: 2-3 flutes only (chip clearance critical). Profiling exterior (convex): 4+ flutes OK even in aluminum. Work hardening trap: stainless steel and super-alloys (Inconel, Ti) have very small sweet spot — chip load too low causes work hardening, producing hardened chips that destroy the tool. Never go lighter than manufacturer recommendation. Indexable inserts: chip load < 0.001 in risks rubbing due to larger edge radius. Ball nose: effective diameter changes with DOC — recalculate SFM at actual cutting diameter.", category: "strategy", tags: ["chip-thinning", "feed-rate", "radial-engagement", "flute-count", "MRR", "work-hardening", "stainless", "aluminum", "rubbing"], confidence: 92, source: "document:CNCCookbook-Feeds-Speeds-Ultimate-Guide", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-siemens-3d-comp-001", title: "Siemens 3D tool radius compensation: CUT2D/CUT3DC/CUT3DCC/CUT3DF modes for 5-axis", body: "SINUMERIK 3D tool radius compensation modes for 5-axis machining: (1) CUT2D/CUT2DF: 2.5D compensation with plane from G17-G19 or frame. Standard for 3-axis. (2) CUT3DC: 3D circumferential milling — compensation perpendicular to path tangent AND tool orientation. Used for side-wall milling with variable tool angles. Program with G41/G42 for direction. (3) CUT3DCC: 3D circumferential with limitation surface — for structural aerospace pockets where smaller replacement tool machines wall AND adjusts TCP to maintain pocket floor level. CNC auto-recognizes dual compensation (wall direction + floor direction). (4) CUT3DFS: face milling, constant orientation (3-axis), tool in Z direction of G17-G19 system, frames have no effect. (5) CUT3DFF: face milling, constant orientation with frame-defined Z. (6) CUT3DF: 5-axis face milling with variable tool orientation. ORID: no orientation change in corner circles. ORIC: orientation changes proportionally in corner circles. Use ISD (Intersection Surface Distance) parameter to specify engaged flute length for circumferential milling.", category: "controller", tags: ["siemens", "SINUMERIK", "CUT3DC", "CUT3DCC", "CUT3DF", "tool-radius-compensation", "5-axis", "aerospace", "ISD"], confidence: 90, source: "document:Siemens-5-Axis-Machining-Manual", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-siemens-5ax-003", title: "Siemens ORIPATH (LEAD/TILT), ORIWKS vs ORIMKS, TOROT safe retract from slanted holes", body: "SINUMERIK advanced 5-axis orientation: (1) ORIPATH: path-related interpolation — defines end orientation via LEAD (rotation in plane of normal+tangent) and TILT (rotation around normal vector). Corresponds to spherical coordinates with surface normal as Z and tangent as X. WARNING: if path has corners, the tangent bends and orientation bends 1:1 with it. (2) ORIWKS: orientation in workpiece coordinate system — MUST be used when program may run on different machines. Actual machine movements depend on kinematics. (3) ORIMKS: orientation in machine coordinate system — use only when programming for a specific machine. (4) TOROT: generates frame whose Z axis coincides with current tool orientation. Essential for safe retract after tool breakage in 5-axis — retract along Z axis follows tool direction, avoiding collision with tilted hole walls. Program: TRAORI, TOROT, G1 G91 Z50 F500, TOROTOF. Also usable in JOG mode for manual retraction in tool direction. (5) CYCLE832 tolerance defaults: finishing 0.01mm/0.08deg, pre-finishing 0.05mm/0.4deg, roughing 0.1mm/0.8deg. Feedforward FFWON+SOFT recommended for optimal surface quality.", category: "controller", tags: ["siemens", "SINUMERIK", "ORIPATH", "LEAD", "TILT", "ORIWKS", "ORIMKS", "TOROT", "safe-retract", "CYCLE832-defaults"], confidence: 90, source: "document:Siemens-5-Axis-Machining-Manual", created_at: "2026-03-06", usage_count: 0 },
  // === Post-Processor Video-Learn Tips (2026-03-06) ===
  { id: "TK-VL-post-001", title: "Post-processor debugging: VS Code double-click G-code → post section mapping", body: "When editing a CNC post processor, use VS Code with the Autodesk post-processor extension. Double-clicking a line of posted G-code highlights which section of the post processor generated it. This eliminates manual searching through 1000+ line post files. Key workflow: (1) Post your program from CAM, (2) Open both .cps post file and .nc output in VS Code, (3) Double-click any G-code line — VS Code jumps to the generating function. Works with Fusion 360 .cps (JavaScript-based) posts. For CAMWorks, use the EC Editor with the Universal Post Generator (UPG) — similar bidirectional linking between post source and output.", category: "workflow", tags: ["post-processor", "VS-Code", "debugging", "Fusion-360", "CAMWorks", "UPG"], confidence: 85, source: "video:4OWT-O4oN8E@30s", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-VL-post-002", title: "Post-processor testing: always use a simple test part before production", body: "Before deploying any post processor change to production: (1) Create a dedicated test part with ALL operation types your shop uses (facing, pocketing, drilling, tapping, boring, contouring), (2) Post the test part and diff against the previous version, (3) Run in single-block mode on the actual controller, (4) Verify safe start block, tool change sequence, coolant codes, and program end. Never skip step 3 — a post that looks correct in text can still crash a machine due to modal state assumptions. For CAMWorks UPG posts, compile with EC Editor after every change — syntax errors in the post definition file (.pst) won't appear until runtime otherwise.", category: "safety", tags: ["post-processor", "testing", "verification", "single-block", "CAMWorks", "UPG"], confidence: 88, source: "video:vXe0s5IbpC4@120s", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-VL-post-003", title: "Lathe post-processor: Mach3/4 Fusion 360 turn post requires G18 (XZ plane) and G95 (feed/rev)", body: "When setting up a lathe post for Mach3/Mach4 from Fusion 360: (1) G18 (XZ plane) MUST be in the safe start block — Mach defaults to G17 (XY) which causes arc errors on turning profiles, (2) Use G95 (feed per revolution) not G94 (feed per minute) for turning — G94 causes inconsistent surface finish as diameter changes, (3) Lead-in/lead-out settings in Fusion 360 turning operations can produce unexpected G02/G03 arcs at small diameters — disable or reduce to 0.1mm for finishing passes under 10mm diameter, (4) Tool orientation numbers must match your turret — Mach3/4 doesn't auto-map orientations, so T0101 vs T0103 matters for TNRC direction.", category: "programming", tags: ["lathe", "post-processor", "Mach3", "Mach4", "Fusion-360", "G18", "G95", "turning"], confidence: 82, source: "video:bNBSLE0KbcU@60s", created_at: "2026-03-06", usage_count: 0 },
  // === SolidCAM/Fusion360 Roadmap Knowledge (2026-03-06) ===
  { id: "TK-DL-solidcam-001", title: "iMachining engagement control: 10-80° arc, optimal 40°, spike detection at corners", body: "SolidCAM iMachining (US patent 8000834B2) controls engagement angle between 10° and 80° at all times. Optimal target is 40° — balances MRR and tool life. At internal corners, engagement can spike 2-3x nominal due to simultaneous wall contact. Feed must be reduced 40-60% approaching internal corners. At external corners, engagement drops — feed can be increased. Corner classification: SHARP (<1mm radius), SMALL (<0.5×Dc), MEDIUM, LARGE (>2×Dc), FILLET. Trochoidal paths maintain constant engagement by varying stepover along circular arcs. Morphing spiral paths transition smoothly from trochoidal to contour-following.", category: "strategy", tags: ["iMachining", "SolidCAM", "engagement", "corners", "trochoidal", "morphing-spiral", "patent"], confidence: 92, source: "document:SolidCAM-iMachining-Patent-US8000834B2", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-solidcam-002", title: "Empirical chip thinning table: 5% WOC→2.3x feed, 10%→1.7x, 25%→1.2x, 50%→1.0x baseline", body: "Industry-validated chip thinning compensation factors (Machining Data Handbook + Sandvik): At 5% WOC (ae/Dc=0.05) multiply feed by 2.30x. At 10% WOC: 1.70x. At 15%: 1.45x. At 20%: 1.30x. At 25%: 1.20x. At 30%: 1.12x. At 35%: 1.05x. At 40%: 1.02x. At 50%: 1.00x (baseline). At 60%: 0.98x. At 70%: 0.95x. At 80%: 0.92x. At 90%: 0.88x. At 100% (slotting): 0.85x — REDUCE feed due to heat buildup. These empirical values are more reliable than theoretical 1/sqrt(ae/Dc) for real-world use. Theoretical formula: factor = 1/sqrt(ae/Dc) for ae < 0.5×Dc, capped at 2.5x.", category: "feeds_speeds", tags: ["chip-thinning", "WOC", "feed-compensation", "empirical", "Sandvik", "Machining-Data-Handbook"], confidence: 95, source: "document:SolidCAM-Chip-Thickness-Math+Sandvik-Technical-Guide", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-solidcam-003", title: "Ball nose chip thickness varies with height: near tip chips are thin (rubbing risk), use stepdown ≤ 10% of ball diameter", body: "Ball nose end mills have position-dependent chip thickness. Local cutting diameter = 2×sqrt(R²-(R-z)²) where R=ball radius, z=axial height. Near the tip (z→0), local diameter approaches 0, causing: (1) near-zero surface speed → rubbing, (2) very thin chips → work hardening, (3) poor surface finish. Best practices: stepdown (ap) ≤ 10% of ball diameter. Scallop height h ≈ s²/(8R) where s=stepover, R=ball radius. For Ra 0.8µm finish: stepover ≤ 0.3mm with 10mm ball. Tilt the tool 10-15° (lead/tilt angle) to move contact point away from dead center. 5-axis simultaneous preferred over 3-axis for ball nose finishing.", category: "strategy", tags: ["ball-nose", "chip-thickness", "scallop", "stepdown", "finishing", "5-axis", "surface-finish"], confidence: 90, source: "document:SolidCAM-Chip-Thickness-Math+Fusion360-Roadmap", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-solidcam-004", title: "Round insert chip thinning: effective entering angle κ_eff = arccos(1-2ap/iC), keep ap ≤ 25% of insert diameter", body: "Round inserts (RCMT/RCHT) have a depth-dependent entering angle. Formula: κ_eff = arccos(1 - 2×ap/iC) where iC = insert diameter. At shallow cuts: κ_eff is small → very thin chips → need higher feed. At ap = 25% of iC: κ_eff ≈ 60° (good balance). Above 60°: chip thinning benefit diminishes. At ap = 50% of iC: κ_eff = 90° (same as square insert). Maximum chip thickness: h_max = fz × sin(κ_eff). Recommendation: keep ap ≤ 0.25×iC for chip thinning benefit. Round inserts distribute cutting forces radially — excellent for interrupted cuts and hard materials.", category: "tooling", tags: ["round-insert", "RCMT", "entering-angle", "chip-thinning", "depth-of-cut", "face-milling"], confidence: 90, source: "document:SolidCAM-Chip-Thickness-Math+Sandvik-Technical-Guide", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-solidcam-005", title: "Helix angle lag effect: chip thickness varies along flute length, 45° helix at 20mm DOC shifts engagement by ~23°", body: "Helix angle causes an angular lag along the axial depth of cut. Formula: lag(z) = z × tan(β) / R, where β=helix angle, R=cutter radius, z=axial position. At any instant, different points along the flute are at different angular positions in the cut. Effect: (1) smooths cutting forces (reduces chatter), (2) at deep DOC with high helix, bottom of flute may exit the cut while top is still entering, (3) for 12mm endmill with 45° helix at 20mm DOC: lag = 20×tan(45°)/6 ≈ 3.33 rad ≈ 190° — nearly half a revolution! Practical: high helix (45°) preferred for deep slotting (smooth forces). Standard helix (30°) for general purpose. Low helix (15-20°) for hard materials (stronger edge).", category: "tooling", tags: ["helix-angle", "chip-thickness", "lag", "chatter", "slotting", "endmill"], confidence: 88, source: "document:SolidCAM-Chip-Thickness-Math", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-fusion-001", title: "RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work", body: "Rotary Tool Center Point (RTCP) / Tool Center Point Control (TCPC) compensates for the linear axis movements needed when rotary axes tilt the tool. Without RTCP, tilting the tool moves the TCP off-target. Compensation formulas for table-table (BC) kinematics: ΔX = L×sin(B)×cos(C), ΔY = L×sin(B)×sin(C), ΔZ = L×(1-cos(B)), where L = gauge length (spindle face to tool tip). For head-head (AC): ΔX = L×sin(A), ΔY = -L×sin(C)×cos(A), ΔZ = L×(1-cos(A)×cos(C)). RTCP must be enabled on the controller (Fanuc: G43.4/G43.5, Siemens: TRAORI, Heidenhain: M128/FUNCTION TCPM). CRITICAL: gauge length must be measured accurately — 0.1mm error causes 0.1mm tool tip error at 45° tilt.", category: "programming", tags: ["RTCP", "TCPC", "5-axis", "compensation", "gauge-length", "kinematics", "Fanuc-G43.4", "Siemens-TRAORI"], confidence: 92, source: "document:Fusion360-Skill-Roadmap", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-fusion-002", title: "Adaptive clearing chip thinning: factor = 1/√(1-(1-2ae/D)²), Fusion360 auto-adjusts feed in HSM", body: "Fusion 360 / HSMWorks adaptive clearing uses chip thinning factor = 1/√(1-(1-2×ae/D)²) to maintain constant chip load as engagement varies. This is equivalent to fz_adjusted = fz_nominal / sin(engagement_angle/2). The CAM system automatically varies feedrate along the toolpath based on instantaneous radial engagement. At 10% WOC: factor ≈ 1.64x. At 25% WOC: factor ≈ 1.15x. At full slot: factor = 1.0x. Key settings: (1) 'Optimal Load' = target ae as % of Dc, (2) 'Both Ways' = conventional + climb alternating (faster but worse finish), (3) 'Stock to Leave' for finishing allowance. The algorithm uses Voronoi-based medial axis to compute engagement at every point.", category: "strategy", tags: ["adaptive-clearing", "Fusion360", "HSMWorks", "chip-thinning", "optimal-load", "Voronoi", "medial-axis"], confidence: 88, source: "document:Fusion360-Skill-Roadmap", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-DL-fusion-003", title: "BVH/GJK collision detection: bounding volume hierarchies + GJK algorithm for tool/holder/fixture checks", body: "Modern CAM collision detection uses two-phase approach: (1) Broad phase: Bounding Volume Hierarchy (BVH) with AABB or OBB trees partitions the scene. Only overlapping bounding boxes trigger detailed checks. Reduces O(n²) to O(n log n). (2) Narrow phase: GJK (Gilbert-Johnson-Keerthi) algorithm computes minimum distance between convex shapes using Minkowski difference. For non-convex shapes: decompose into convex hulls first. Tool assembly model: shank (cylinder) + holder (stepped cylinder) + collet nut (cylinder). Each component gets its own BVH node. Check frequency: every 0.5-1mm along toolpath. False positives from oversized bounding volumes are OK (conservative). False negatives from under-checking are NOT OK (crash).", category: "toolpath", tags: ["collision-detection", "BVH", "GJK", "bounding-volume", "holder-collision", "CAM", "simulation"], confidence: 85, source: "document:Fusion360-Skill-Roadmap", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-VL-post-004", title: "CAMWorks UPG post customization: line numbering, safe start, coolant code locations", body: "CAMWorks Universal Post Generator (UPG) post customization key points: (1) Line numbering: controlled by 'sequence_number' variable — set increment in post header, toggle with boolean flag. Use N-word format N10, N20... for production (operators can reference specific lines), N1, N2... only for debugging. (2) Safe start block: defined in 'start_of_program' section — ALWAYS include G90 (absolute), G80 (cancel canned cycle), G40 (cancel cutter comp), G49 (cancel TLC), G17/G18 (plane select). Order matters — G40 before G49 prevents comp-active crash. (3) Coolant codes: M08 (flood) and M07 (mist) are in 'start_of_tool' section after spindle start. Put M09 (off) in 'end_of_tool' BEFORE spindle stop. (4) The EC Editor compiles .pst → .dll — always recompile after changes. (5) Post variables use colon-delimited names (:tool_number, :spindle_speed) — don't confuse with G-code addresses.", category: "workflow", tags: ["CAMWorks", "UPG", "post-processor", "line-numbering", "safe-start", "coolant", "EC-Editor"], confidence: 85, source: "video:vXe0s5IbpC4@300s", created_at: "2026-03-06", usage_count: 0 },

  // --- RX-MS0 Resource Extraction: Fusion360 + hyperMILL Roadmap Parameter Tables ---
  { id: "TK-RX-001", title: "Optimal radial engagement (ae) by material group for adaptive/trochoidal milling", body: "Recommended radial width of cut as % of cutter diameter for adaptive clearing / trochoidal milling: Aluminum 6061: 25-40% (aggressive, good chip evacuation). Carbon Steel 1045: 15-25%. Alloy Steel 4140: 12-20%. Stainless 316: 10-18%. Titanium 6Al-4V: 8-15%. Inconel 718: 5-10%. Hardened Steel >50 HRC: 3-8%. Cast Iron: 20-30%. Copper/Brass: 25-40%. Start at the lower end for long tools (L/D > 4) or poor rigidity setups. These ranges maintain manageable cutting forces and heat generation while maximizing MRR.", category: "speeds_feeds", tags: ["radial-engagement", "adaptive", "trochoidal", "WOC", "material-specific"], material_groups: ["aluminum", "steel", "stainless", "titanium", "nickel", "hardened", "cast-iron"], operation_types: ["milling", "adaptive-clearing", "trochoidal"], confidence: 90, source: "document:Fusion360-Skill-Roadmap+hyperMILL-Skill-Roadmap", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-002", title: "Trochoidal milling tool life multiplier by material vs conventional slotting", body: "Trochoidal/dynamic milling tool life improvement over conventional full-slot milling (same MRR target): Mild Steel: 1.2-1.4× (20-40% longer life). Alloy Steel 4140: 1.5-2.0× (50-100%). Stainless 304/316: 2.0-3.0× (100-200%). Titanium 6Al-4V: 3.0-4.0× (200-300%). Inconel 718: 3.0-5.0× (200-400%). Hardened Steel 50+ HRC: 2.0-3.0×. The improvement comes from reduced arc of engagement (lower heat per tooth) and consistent chip load. Greatest benefit in low-thermal-conductivity materials where heat buildup is the primary failure mode.", category: "tooling", tags: ["trochoidal", "tool-life", "dynamic-milling", "comparison", "material-specific"], material_groups: ["steel", "stainless", "titanium", "nickel", "hardened"], operation_types: ["milling", "trochoidal", "slotting"], confidence: 88, source: "document:hyperMILL-Skill-Roadmap@trochoidal-benchmarks", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-003", title: "Barrel cutter advantage: 10-300× effective radius, 50-90% cycle time savings on 5-axis surfaces", body: "Barrel (segment/lens) cutters have a large-radius cutting profile (typically R=50-500mm) on a small-diameter tool body (6-25mm). Key advantages: (1) Effective cutting radius 10-300× larger than ball nose of same shank diameter. (2) Stepover can be 5-10× larger than equivalent ball nose for same scallop height. (3) Cycle time reduction: 50-70% typical on ruled surfaces, up to 90% on large freeform surfaces. (4) Best applications: turbine blades, impellers, mold sidewalls, any surface with consistent curvature. Limitations: requires 5-axis simultaneous, sensitive to tilt angle accuracy, not suitable for tight concave radii < barrel radius. Tool cost ~3-5× ball nose but offset by massive time savings.", category: "tooling", tags: ["barrel-cutter", "segment-cutter", "lens-cutter", "5-axis", "finishing", "scallop", "cycle-time"], operation_types: ["finishing", "5-axis-milling"], confidence: 88, source: "document:hyperMILL-Skill-Roadmap@barrel-cutter-benchmarks", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-004", title: "Surface finish Ra targets by manufacturing quality level", body: "Target surface roughness Ra by quality level: Rough machining: 6.3-12.5 µm (N9-N10, stock removal only). Semi-finish: 1.6-3.2 µm (N7-N8, functional non-critical). General finish: 0.8-1.6 µm (N6-N7, standard tolerance surfaces). Fine finish: 0.4-0.8 µm (N5-N6, bearing surfaces, sealing faces). Polish-ready: 0.2-0.4 µm (N4-N5, requires carbide/CBN, very low feed). Mirror/optical: <0.1 µm (N1-N3, requires grinding/lapping/polishing). Conversion: Ra ≈ Rz/4 (approximate). Cost multiplier per step down: roughly 1.5-2× (each halving of Ra doubles machining time).", category: "surface_finish", tags: ["Ra", "Rz", "roughness", "N-grade", "quality-level", "cost", "finishing"], operation_types: ["finishing", "grinding", "polishing"], confidence: 92, source: "document:Fusion360-Skill-Roadmap@surface-finish-targets", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-005", title: "5-axis collision avoidance priority: 6-strategy hierarchy", body: "When resolving tool/holder collisions in 5-axis machining, apply strategies in this priority order: (1) Increase tool stickout (cheapest, but reduces rigidity — max +20% before chatter risk). (2) Use a slimmer holder (ER→shrink-fit→hydraulic, or use extension). (3) Reduce holder diameter (smaller collet/chuck if tool permits). (4) Tilt tool away from collision (add lead/lag/tilt angles — verify no gouging). (5) Split operation into sub-regions with different tool orientations. (6) Use a different tool geometry (shorter LOC, tapered neck, lollipop cutter). NEVER skip collision checking even for 'simple' 5-axis jobs — holder collisions account for ~40% of 5-axis crashes.", category: "safety", tags: ["collision", "5-axis", "holder", "avoidance", "priority", "crash-prevention"], operation_types: ["5-axis-milling", "finishing"], confidence: 90, source: "document:hyperMILL-Skill-Roadmap@collision-avoidance", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-006", title: "Strategy selection by surface wall angle: <30° planar, 30-45° equidistant, >45° Z-level", body: "3D finishing strategy selection based on surface wall angle (measured from horizontal): Flat/shallow (<30°): use Planar/Raster finishing — constant Z gives uniform scallop on near-flat surfaces. Moderate (30-45°): use Equidistant/Scallop finishing — projects stepover onto surface for uniform cusp height regardless of slope. Steep (>45°): use Z-Level finishing — constant-Z slices give tight line spacing on steep walls. Mixed surfaces: use hybrid/Complete finishing that auto-switches strategy based on local slope. Transition angle should overlap by ±5° to avoid witness lines at strategy boundaries.", category: "strategy", tags: ["finishing", "wall-angle", "z-level", "planar", "equidistant", "scallop", "3d-finishing"], operation_types: ["finishing", "3d-milling"], confidence: 90, source: "document:hyperMILL-Skill-Roadmap@strategy-selection+Fusion360-Skill-Roadmap", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-007", title: "Stock-to-leave by tolerance grade: ±0.05mm→0.2-0.3mm, ±0.02mm→0.1mm, ±0.01mm→0.05mm", body: "Recommended finishing stock allowance based on final tolerance requirement: Tolerance ±0.1mm: stock-to-leave 0.3-0.5mm (single finish pass). Tolerance ±0.05mm: stock 0.2-0.3mm (single finish pass, light cut). Tolerance ±0.02mm: stock 0.1-0.15mm (may need semi-finish + finish). Tolerance ±0.01mm: stock 0.05-0.08mm (requires semi-finish + finish + spring pass). Tolerance ±0.005mm: stock 0.03-0.05mm (grinding or diamond tooling territory). Rule: stock ≥ 2× expected tool deflection at finishing conditions. Too little stock causes rubbing; too much stock causes deflection variation. Always verify with a test cut on first article.", category: "strategy", tags: ["stock-to-leave", "allowance", "tolerance", "finishing", "deflection", "spring-pass"], operation_types: ["finishing", "semi-finishing"], confidence: 90, source: "document:Fusion360-Skill-Roadmap@stock-allowance-guidelines", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-008", title: "Rest machining detection: offset band = previous tool radius + stock allowance + 0.1mm safety", body: "Rest machining (remaining material) detection parameters: Offset band width = previous_tool_radius + stock_allowance + safety_margin (typically 0.1mm). This defines where material was NOT reached by the larger tool. Common mistakes: (1) forgetting to include stock-to-leave in the offset calculation (leaves uncut ridges), (2) using theoretical stock model instead of actual (accounting for tool deflection), (3) not verifying previous tool actually completed its operation. Verification: simulate rest stock volume before running — if rest volume > 30% of original, the previous tool was likely too large. Optimal rest tool: 40-60% of previous tool diameter for good overlap without excessive air cutting.", category: "strategy", tags: ["rest-machining", "remaining-material", "offset-band", "tool-diameter", "detection"], operation_types: ["roughing", "semi-finishing", "rest-machining"], confidence: 88, source: "document:hyperMILL-Skill-Roadmap@rest-material-calculation", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-009", title: "Steep/shallow boundary angle: use 45° default, overlap ±5° to prevent witness lines", body: "When using hybrid finishing strategies that combine steep (Z-level) and shallow (planar/scallop) passes, the boundary angle determines where the strategy switches. Default: 45° from horizontal. Overlap zone: ±5° (so Z-level machines 40-90° and planar machines 0-50°). The 10° overlap zone is machined by BOTH strategies, blending the transition. Without overlap: visible witness line at the boundary angle. Too much overlap (>15°): wasted cycle time on double-machining. Some CAM systems auto-detect the optimal angle — verify it matches part geometry. For molds with draft angles, set boundary = draft angle ± 5°.", category: "surface_finish", tags: ["steep-shallow", "boundary-angle", "hybrid", "witness-line", "overlap", "finishing"], operation_types: ["finishing", "3d-milling"], confidence: 88, source: "document:Fusion360-Skill-Roadmap@steep-shallow-detection", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-010", title: "Morphing spiral entry: start from center with expanding spiral, 0.5× stepover at entry for gradual load", body: "Morphing spiral toolpath entry strategy for pocket roughing: (1) Start at pocket center with a helical plunge or pre-drilled hole. (2) First spiral pass uses 50% of nominal stepover (gradual load engagement). (3) Subsequent passes expand outward at full stepover. (4) The spiral morphs to match pocket boundary shape (rectangular pockets get rectangular spirals, not circular). (5) No sharp direction changes — tool maintains continuous motion. Benefits: eliminates full-width entry engagement, reduces tool shock loads by 40-60% vs zigzag entry, extends tool life in corners where engagement spikes. Key parameter: morph_ratio controls how quickly spiral transitions from circular to pocket shape (0.3-0.7 typical, lower = more circular, higher = conforms earlier).", category: "strategy", tags: ["morphing-spiral", "pocket", "entry-strategy", "engagement", "iMachining", "dynamic-milling"], operation_types: ["roughing", "pocketing", "adaptive-clearing"], confidence: 85, source: "document:SolidCAM-Skill-Roadmap@morphing-spiral-generation", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-011", title: "5-axis swarf cutting: tool axis tangent to ruled surface, side-of-tool cuts entire wall in one pass", body: "Swarf (flank) milling uses the side of the cutter aligned tangent to a ruled surface, cutting the full wall height in a single pass. Requirements: (1) Surface must be ruled (can be swept by a straight line). (2) Tool must be long enough: LOC ≥ wall height + 2mm clearance. (3) Tool tilt follows surface normal — requires 5-axis simultaneous. Key parameters: lead angle 0-3° (slight lead prevents heel contact), tilt computed from surface UV direction. Advantages: 1 pass vs 5-20 Z-level passes, superior surface finish (no cusps), geometric accuracy (cutter matches surface). Risks: full-depth engagement generates high forces — reduce feed 30-50% from standard side milling. Check holder clearance at every point along the path.", category: "strategy", tags: ["swarf", "flank-milling", "5-axis", "ruled-surface", "wall-finishing", "LOC"], operation_types: ["5-axis-milling", "finishing", "wall-machining"], confidence: 88, source: "document:hyperMILL-Skill-Roadmap@swarf-cutting-algorithms", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-012", title: "Impeller/blade machining: roughing order hub→splitter→main blade, finish in reverse", body: "Impeller/blisk machining sequence: ROUGHING order: (1) Hub area first (open access, establish datum surfaces). (2) Splitter blades next (shorter, less deflection). (3) Main blades last (longest, most flexible — hub already cleared for chip evacuation). FINISHING order: REVERSE — (1) Main blades first (full rigidity from remaining stock on hub). (2) Splitter blades. (3) Hub last (blades are finished, need careful collision avoidance). Use point milling (ball nose tip contact) for blade surfaces, not flank milling (blade twist prevents ruled surface assumption). Typical tolerances: blade profile ±0.02-0.05mm, leading/trailing edge ±0.01mm. Tool: ball nose 3-6mm for finishing, bull nose 6-12mm for roughing. Always verify tool access angle at blade root — this is the most collision-prone area.", category: "strategy", tags: ["impeller", "blisk", "blade", "turbine", "5-axis", "roughing-order", "finish-order"], operation_types: ["5-axis-milling", "roughing", "finishing", "impeller-machining"], confidence: 85, source: "document:hyperMILL-Skill-Roadmap@blade-impeller-machining", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-013", title: "Scallop height formula: h = ae²/(8R) for ball nose, verify with actual stepover measurement", body: "Theoretical scallop height for ball nose finishing: h = ae²/(8×R) where ae = stepover (mm), R = ball radius (mm). Examples: R=5mm (10mm ball), ae=0.3mm → h = 0.09/(40) = 0.00225mm = 2.25µm. R=5mm, ae=0.5mm → h = 0.25/40 = 0.00625mm = 6.25µm. R=5mm, ae=1.0mm → h = 1.0/40 = 0.025mm = 25µm. For a target Ra, scallop height h ≈ 4×Ra (approximate). So for Ra 0.8µm → h ≈ 3.2µm → ae ≈ 0.36mm with 10mm ball. IMPORTANT: this formula assumes flat surface perpendicular to tool axis. On inclined surfaces, effective radius changes: R_eff = R/cos(θ) where θ = surface tilt. On concave surfaces, R_eff decreases (worse scallop). Always verify first article.", category: "surface_finish", tags: ["scallop", "ball-nose", "stepover", "Ra", "formula", "finishing", "cusp-height"], operation_types: ["finishing", "3d-milling"], confidence: 92, source: "document:Fusion360-Skill-Roadmap@scallop-height-math", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-014", title: "Constant engagement offsetting (FCEOM): maintain ae/D ratio ≤ target in corners via toolpath offset", body: "Full Cutter Engagement Offset Method (FCEOM) prevents engagement spikes in internal corners. Algorithm: (1) At each corner, compute the engagement angle from the corner geometry. (2) If engagement exceeds target (e.g., 40%), insert an offset arc that widens the toolpath at the corner. (3) Offset distance ≈ R × (1 - cos(θ_max/2)) where R = tool radius, θ_max = maximum allowed engagement angle. Effect: corner forces stay within ±10% of straight-line forces. Without FCEOM: internal 90° corner causes 180° engagement (2× force spike). With FCEOM at 40% target: engagement stays at ~115° max (1.15× baseline). Trade-off: adds 5-15% cycle time in corner-heavy parts but prevents chipping, chatter, and tool breakage. All modern dynamic/adaptive clearing CAM uses some variant of this.", category: "strategy", tags: ["FCEOM", "constant-engagement", "corner-offset", "engagement-control", "adaptive", "trochoidal"], operation_types: ["roughing", "adaptive-clearing", "trochoidal", "pocketing"], confidence: 90, source: "document:SolidCAM-Skill-Roadmap@FCEOM+EngagementGeometryEngine", created_at: "2026-03-06", usage_count: 0 },
  { id: "TK-RX-015", title: "High-feed milling parameters: ae up to 100% Dc, ap 0.5-1.5mm, feed 2-5× conventional", body: "High-feed milling (HFM) uses very shallow axial depth (ap = 0.5-1.5mm) with full radial engagement and extremely high feed rates. Key parameters by material: Aluminum: ap=1.0-1.5mm, fz=1.5-3.0mm/tooth, Vc=300-500 m/min. Steel <30 HRC: ap=0.5-1.0mm, fz=1.0-2.0mm/tooth, Vc=150-250 m/min. Hardened Steel 45-55 HRC: ap=0.3-0.7mm, fz=0.8-1.5mm/tooth, Vc=100-200 m/min. Tool: special high-feed insert geometry with large nose radius and 10-17° entering angle. The shallow DOC converts most cutting force to axial direction (into spindle), improving stability. MRR can match or exceed conventional roughing with 3-5× less radial force. Ideal for: long-reach operations, thin walls, low-rigidity setups, face milling large areas.", category: "speeds_feeds", tags: ["high-feed", "HFM", "shallow-DOC", "axial-force", "high-MRR", "low-rigidity"], material_groups: ["aluminum", "steel", "hardened"], operation_types: ["roughing", "face-milling", "high-feed-milling"], confidence: 88, source: "document:hyperMILL-Skill-Roadmap@HFM-benchmarks", created_at: "2026-03-06", usage_count: 0 },
  // === SolidCAM Expert Tips (sc-001 to sc-039) — Web-researched best practices ===

  // --- iMachining 2D (flagship patented technology) ---
  { id: "sc-001", title: "iMachining Morphing Spiral — Maximize Engagement", body: "iMachining 2D uses a patented morphing spiral that gradually conforms to pocket geometry instead of simple racetrack offsets. This keeps the cutter engaged in material nearly 100% of the time, inserting trochoidal loops around corners and islands to maintain constant chip load. Always let the wizard generate the spiral — manual offset patterns cannot match its efficiency.", category: "cam_strategy", tags: ["solidcam", "imachining", "morphing-spiral", "pocket", "2d"], operation_types: ["pocket_milling", "roughing"], confidence: 88, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-002", title: "Technology Wizard Level Slider — Match Real-World Rigidity", body: "The iMachining Level Slider (1–8) adjusts MRR for real-world fixture, tool-holding, and machine rigidity conditions. Level 1 is minimum MRR for weak setups; Level 8 is maximum for rigid machines. Start at Level 3–4 for unknown setups and increase once you confirm no chatter. Levels 2–7 interpolate cutting conditions between extremes.", category: "cam_strategy", tags: ["solidcam", "imachining", "technology-wizard", "level-slider", "rigidity"], operation_types: ["roughing", "pocket_milling"], confidence: 90, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-003", title: "iMachining Constant Chip Thickness — Eliminate Chatter", body: "The patented motion-control algorithm continuously varies radial engagement angle (10°–80°) and feed rate to sustain constant chip thickness throughout the cut. This prevents force surges at corners that cause chatter and tool breakage. Do not override the feed correction — let the wizard handle the dynamic feed adjustment for each segment of the toolpath.", category: "cam_strategy", tags: ["solidcam", "imachining", "chip-thickness", "chatter", "feed-correction"], operation_types: ["roughing", "pocket_milling"], confidence: 88, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-004", title: "iMachining Channel Stepping — Narrow Feature Strategy", body: "When geometry contains narrow channels between islands, iMachining automatically switches to channel-stepping mode with modified trochoidal cuts. The acceleration and deceleration rates are controlled at material engagement/disengagement points. For very narrow slots (< 1.5x tool diameter), ensure your tool stick-out is minimized and consider a smaller tool to allow the morphing spiral room to work.", category: "cam_strategy", tags: ["solidcam", "imachining", "channel", "narrow-slot", "trochoidal"], operation_types: ["slot_milling", "pocket_milling"], confidence: 82, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-005", title: "iMachining Tool Life — Full Flute Engagement", body: "Traditional CAM concentrates wear on the tool tip because only a fraction of flute length does work. iMachining distributes load across the entire flute length by using deep axial depths with controlled radial engagement. Expect 2–5x tool life improvement even at higher speeds. Always use the full recommended depth of cut from the Technology Wizard rather than conservative shallow passes.", category: "tooling", tags: ["solidcam", "imachining", "tool-life", "flute-engagement", "depth-of-cut"], operation_types: ["roughing", "pocket_milling"], confidence: 87, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-006", title: "iMachining 2D Arc Feed Correction — Fine-Tune for Your Machine", body: "In the Technology Wizard, the Arc Feed Correction parameter adjusts feed rate on curved segments to compensate for machine dynamics. Set it to 0% on high-end machines with fast servo response (Mazak, DMG MORI). On older or less rigid machines, leave the default correction active to prevent tool overload on tight radii.", category: "speeds_feeds", tags: ["solidcam", "imachining", "arc-feed", "machine-dynamics", "feed-correction"], operation_types: ["pocket_milling", "roughing"], confidence: 80, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },

  // --- iMachining 3D (volumetric roughing) ---
  { id: "sc-007", title: "iMachining 3D Step-Down — Deep Roughing for Full Flute Use", body: "iMachining 3D generates deep step-down passes first, utilizing the whole flute length for maximum material removal. The Technology Wizard automatically adjusts feed rates as depth changes. Set the initial step-down to match your tool's recommended axial DOC — the wizard will handle the rest. Deep roughing first, then step-up rest-machining for slopes.", category: "cam_strategy", tags: ["solidcam", "imachining-3d", "step-down", "roughing", "flute-length"], operation_types: ["3d_roughing"], confidence: 85, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-008", title: "iMachining 3D Step-Up Rest Roughing — Clean Slopes Efficiently", body: "After deep roughing, iMachining 3D switches to step-up mode to remove rest material on sloped surfaces. The axial depth gets smaller as it machines higher steps, and the wizard automatically increases feed rate and cutting angle to maintain constant tool load. Use the Scallop parameter to control how much rest material triggers an additional pass on slopes.", category: "cam_strategy", tags: ["solidcam", "imachining-3d", "rest-roughing", "step-up", "scallop"], operation_types: ["3d_roughing", "rest_machining"], confidence: 84, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-009", title: "iMachining 3D Wall and Floor Offsets — Control Stock Allowance", body: "The iMachining 3D toolpath first accounts for the tool plus Wall offset, then offsets along the tool axis by the Floor offset distance. Set Wall offset to 0.2–0.5 mm for semi-finish passes and Floor offset to match your finishing allowance. These offsets ensure consistent stock for the HSM finishing pass that follows.", category: "cam_strategy", tags: ["solidcam", "imachining-3d", "wall-offset", "floor-offset", "stock-allowance"], operation_types: ["3d_roughing"], confidence: 83, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-010", title: "iMachining 3D Scallop Control — Prevent Over-Machining on Slopes", body: "The Scallop parameter restricts rest-roughing passes to only cut material that would exceed the specified scallop height if left uncut. Set scallop to 0.3–0.8 mm for steel roughing to balance cycle time against semi-finish stock uniformity. Too small a scallop value generates excessive lightweight passes that waste time without improving the finish operation.", category: "cam_strategy", tags: ["solidcam", "imachining-3d", "scallop", "rest-material", "optimization"], operation_types: ["3d_roughing"], confidence: 82, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- HSR/HSM finishing strategies ---
  { id: "sc-011", title: "Turbo HSM Constant-Z — Steep Wall Finishing to 0.4 µm", body: "Turbo HSM Constant-Z strategy produces exceptional surface quality on steep walls, achieving Ra 0.4 µm with proper parameters. It smooths both cutting moves and retracts to maintain continuous machine motion — critical for keeping high feed rates and eliminating dwell marks. Use Constant-Z for walls steeper than 45° and switch to Linear or Constant Stepover for shallow areas.", category: "cam_strategy", tags: ["solidcam", "turbo-hsm", "constant-z", "finishing", "surface-quality"], operation_types: ["finishing", "hsm"], confidence: 86, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-012", title: "HSM Smooth Linking — Maintain Feed Rate Through Retracts", body: "SolidCAM HSM generates smooth, tangential lead-in/lead-out moves and avoids sharp angles in the toolpath to maintain continuous machine motion. This is essential for high-speed finishing where any sudden direction change causes the controller to decelerate. Always enable smooth linking and set minimum arc radius to match your machine's minimum radius capability.", category: "cam_strategy", tags: ["solidcam", "hsm", "linking", "lead-in", "high-speed"], operation_types: ["finishing", "hsm"], confidence: 85, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-013", title: "Turbo HSR Hatch vs Contour — Choose by Geometry Shape", body: "Turbo HSR offers Hatch, Contour, and Rest Roughing patterns. Use Hatch for open, convex shapes where linear passes are efficient. Use Contour for concave pockets and complex profiles where offset passes follow the geometry better. Rest Roughing automatically targets leftover material from the previous larger tool. All THSR toolpaths are collision-free by design.", category: "cam_strategy", tags: ["solidcam", "turbo-hsr", "hatch", "contour", "roughing"], operation_types: ["roughing", "hsr"], confidence: 84, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-014", title: "HSS Geodesic Machining — Constant Stepover on Complex Surfaces", body: "SolidCAM's Geodesic Machining in the HSS module produces toolpaths with truly constant stepover across steep and shallow walls alike, even on compound-curved surfaces. This eliminates the scallop-height variation that plagues standard Z-level or linear strategies. Use it for mold and die finishing where uniform surface quality across the entire part is critical.", category: "cam_strategy", tags: ["solidcam", "hss", "geodesic", "constant-stepover", "surface-finish"], operation_types: ["finishing", "hss"], confidence: 83, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-015", title: "Auto 3+2 Axis in Turbo HSR/HSM — Access Undercuts Automatically", body: "The Auto 3+2 module automatically identifies undercut areas that cannot be reached from a single direction and generates indexed multi-axis toolpaths. This minimizes the number of separate operations with different machining directions. Enable Auto 3+2 in Turbo HSR to efficiently rough undercut regions without manually creating multiple coordinate systems.", category: "cam_strategy", tags: ["solidcam", "turbo-hsr", "auto-3plus2", "undercut", "indexed"], operation_types: ["roughing", "3plus2"], confidence: 82, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Simultaneous 5-axis machining ---
  { id: "sc-016", title: "Sim 5X Flow Line Cutting — Follow Natural Surface Shape", body: "Flow Line cutting produces toolpaths that follow the natural shape of the component surface, resulting in better surface finish and more predictable tool engagement. Use it for blisks, impellers, and organic shapes where the surface flow direction matters aesthetically or aerodynamically. Define the flow lines from the UV directions of the driving surfaces.", category: "cam_strategy", tags: ["solidcam", "sim5x", "flow-line", "surface-follow", "impeller"], operation_types: ["5axis_finishing"], confidence: 85, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-017", title: "Sim 5X SWARF Cutting — Full Flute Contact for Ruled Surfaces", body: "SWARF (Side Wall Axial Relief Feed) cutting uses the full side of the tool against ruled surfaces, producing superior finish in a single pass compared to multiple Z-level passes. It dramatically reduces cycle time on straight or slightly curved walls. Ensure the surface is truly ruled (developable) — applying SWARF to free-form surfaces causes gouging.", category: "cam_strategy", tags: ["solidcam", "sim5x", "swarf", "ruled-surface", "side-cutting"], operation_types: ["5axis_finishing", "swarf"], confidence: 86, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-018", title: "5-Axis Lead/Lag and Side Tilt — Optimize Tool Contact Point", body: "SolidCAM provides direct control over lead angle (tilt in feed direction), lag angle (tilt against feed), and side tilt angle. For ball-nose finishing, use 10–15° lead angle to move the contact point away from the tool tip where surface speed is zero. Side tilt of 3–5° prevents the flat spot on the tool bottom from marking the surface.", category: "cam_strategy", tags: ["solidcam", "sim5x", "lead-angle", "lag-angle", "tilt"], operation_types: ["5axis_finishing"], confidence: 85, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-019", title: "5-Axis Automatic Collision Avoidance — Tool and Holder Check", body: "SolidCAM's Sim 5X module includes automatic collision avoidance that checks both tool and holder against the part, fixture, and machine components. When a collision is detected, the system automatically tilts the tool away while maintaining surface contact. Always define your actual holder geometry in the tool library — generic holders lead to unnecessary avoidance moves or missed collisions.", category: "safety", tags: ["solidcam", "sim5x", "collision-avoidance", "holder", "safety"], operation_types: ["5axis_finishing", "5axis_roughing"], confidence: 87, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-020", title: "5-Axis Multi-Axis Rest Roughing — Remove Previous Tool's Leftovers", body: "Multi-axis rest roughing in Sim 5X efficiently removes material left by a larger cutter in previous operations. The system calculates remaining stock from the previous tool diameter and generates 5-axis paths to access areas the larger tool could not reach. Use this between rough and finish to eliminate heavy cuts during the finishing pass.", category: "cam_strategy", tags: ["solidcam", "sim5x", "rest-roughing", "multi-axis", "stock-removal"], operation_types: ["5axis_roughing", "rest_machining"], confidence: 83, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Turning and Mill-Turn ---
  { id: "sc-021", title: "Mill-Turn Channel Synchronization — Eliminate Idle Time", body: "SolidCAM Mill-Turn coordinates multiple spindles, turrets, and tool channels to run simultaneously. Proper channel synchronization ensures operations across channels are timed to avoid collisions and eliminate idle time. Use the Sync Manager to define wait points and handoff sequences — never assume channels will self-synchronize from the post alone.", category: "cam_strategy", tags: ["solidcam", "mill-turn", "synchronization", "multi-channel", "spindle"], operation_types: ["mill_turn", "turning"], confidence: 85, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-022", title: "Trochoidal Turning — Extend Tool Life in Deep Grooves", body: "SolidCAM's trochoidal turning toolpath reduces tool wear and extends tool life by maintaining controlled chip load in deep grooves and challenging profiles. It uses circular interpolation moves instead of straight plunges, spreading wear across the insert edge. Use trochoidal turning for deep grooves (> 3x insert width) and hard materials above 45 HRC.", category: "tooling", tags: ["solidcam", "turning", "trochoidal", "groove", "tool-life"], operation_types: ["turning", "grooving"], confidence: 84, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-023", title: "Mill-Turn Stock Tracking — Avoid Air Cuts Automatically", body: "SolidCAM automatically tracks material removal during each turning and milling operation, updating the in-process stock model. This enables smarter toolpaths that avoid air cuts and reduce redundant motion in subsequent operations. Always sequence your operations in the CAM tree in the actual machining order so stock tracking reflects reality.", category: "cam_strategy", tags: ["solidcam", "mill-turn", "stock-tracking", "air-cuts", "optimization"], operation_types: ["mill_turn", "turning"], confidence: 86, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-024", title: "Mill-Turn MCO Cycles — Use Pre-Built Machine Control Operations", body: "Mill-Turn post-processors include pre-built Machine Control Operation (MCO) cycles for common tasks like part catch, bar feed, spindle transfer, and tailstock control. These cycles require minimal user input and save significant programming time. Check your machine's MCO library before manually coding M-functions — most standard operations are already templated.", category: "automation", tags: ["solidcam", "mill-turn", "mco", "machine-control", "post-processor"], operation_types: ["mill_turn"], confidence: 82, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Swiss-Type machining ---
  { id: "sc-025", title: "Swiss-Type Retract Distance — Never Use Milling-Style Safety Heights", body: "On Swiss-Type machines, retract distance for both milling and turning operations should be approximately 1–2 mm. Never apply standard milling safety values of 5/10/20 mm — this is dangerous on Swiss machines where the guide bushing and sub-spindle are in close proximity. Excessive retract distances risk crashing into the guide bushing or opposing tooling.", category: "safety", tags: ["solidcam", "swiss-type", "retract", "safety", "guide-bushing"], operation_types: ["swiss_turning", "swiss_milling"], confidence: 90, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-026", title: "Swiss-Type G-Code Plane Selection — G17/G18/G19 Critical", body: "G-code for Swiss-Type milling operations is extremely sensitive to machining plane selection. Use G18 (ZX) for turning operations, G17 (XY) for face milling with axial tool orientation, and G19 (YZ) for radial tool orientation milling. Incorrect plane selection causes arc interpolation errors and potential crashes. Always verify the plane in your post output before first run.", category: "post_processor", tags: ["solidcam", "swiss-type", "plane-selection", "g17", "g18", "g19"], operation_types: ["swiss_turning", "swiss_milling"], confidence: 89, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-027", title: "Swiss-Type Simultaneous Front/Back Operations — Sync for Cycle Time", body: "Swiss-Type machines can perform front-end and back-end operations simultaneously, dramatically reducing cycle time. Use SolidCAM's synchronization tools to coordinate these parallel processes and generate optimized code. Always simulate the full synchronized sequence to verify no collision occurs between opposing tools or between tools and the guide bushing.", category: "cam_strategy", tags: ["solidcam", "swiss-type", "synchronization", "front-back", "cycle-time"], operation_types: ["swiss_turning", "swiss_milling"], confidence: 84, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Post processor and G-code customization ---
  { id: "sc-028", title: "GPP Post Processor — GPPL Language Fundamentals", body: "SolidCAM post-processors are written in GPPL (General Post Processor Language) in machine.gpp files, with machine parameters in machine.vmid files. GPP files can be edited in any text editor but Visual Studio Code with the SolidCAM GPPL extension provides syntax highlighting and debugging. Always back up your .gpp and .vmid files before making edits.", category: "post_processor", tags: ["solidcam", "gpp", "gppl", "post-processor", "vmid"], operation_types: ["post_processing"], confidence: 85, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-029", title: "GPP Text Encoding — ANSI/ASCII Required", body: "SolidCAM requires ANSI/ASCII encoding for GPP files and G-code output. UTF-8 or Unicode encoding causes parsing errors and garbled characters in the NC output. When editing GPP files in VS Code, check the encoding indicator in the status bar and convert to ANSI if needed. This is the number-one cause of mysterious post-processor errors after editing.", category: "post_processor", tags: ["solidcam", "gpp", "encoding", "ansi", "ascii"], operation_types: ["post_processing"], confidence: 88, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-030", title: "GPP Arc Output — VMID Settings for Multi-Plane Arcs", body: "To enable arc output in all planes (not just XY), set 'Pos to Machine = Yes' and 'Arcs in ZX,YZ plane = Yes' in the Controller Definition section of your VMID file. Without these settings, SolidCAM linearizes arcs in the ZX and YZ planes into short line segments, bloating file size and causing jerky motion on older controllers.", category: "post_processor", tags: ["solidcam", "gpp", "vmid", "arcs", "controller"], operation_types: ["post_processing"], confidence: 83, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-031", title: "GPP VS Code Debugger — Step Through Post Processing", body: "Install the SolidCAM GPPL extension for Visual Studio Code to get syntax highlighting, IntelliSense, and a step-through debugger for post-processor development. You can set breakpoints in GPPL procedures and watch variable values as the post processes each toolpath command. This eliminates trial-and-error debugging that wastes hours on complex multi-axis posts.", category: "post_processor", tags: ["solidcam", "gpp", "vscode", "debugger", "development"], operation_types: ["post_processing"], confidence: 81, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-032", title: "GPP Hexadecimal Character Codes — Handle Special Characters", body: "In GPPL, use hexadecimal ASCII conversion to output special characters that would otherwise be interpreted as GPPL syntax. This prevents encoding issues when your G-code requires percent signs, brackets, or other reserved characters. Always test special character output against your controller's requirements — some Fanuc controls need specific comment delimiters.", category: "post_processor", tags: ["solidcam", "gpp", "hex", "special-characters", "fanuc"], operation_types: ["post_processing"], confidence: 79, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },

  // --- Technology Wizard and material database ---
  { id: "sc-033", title: "iMachining Database — Configure Machine and Material Files", body: "Access the iMachining Database via Tools > SolidCAM > iMachining Database to manage machine and material definitions. Each machine entry defines spindle power, torque curves, max RPM, and rigidity class. Each material entry defines hardness, machinability factor, and recommended cutting parameters. Accurate machine data is critical — the wizard's output is only as good as its input.", category: "speeds_feeds", tags: ["solidcam", "imachining", "database", "machine-definition", "material"], operation_types: ["roughing", "pocket_milling"], confidence: 87, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-034", title: "Technology Wizard — Synchronized Multi-Parameter Optimization", body: "The Technology Wizard simultaneously computes feed rate, spindle speed, axial DOC, cutting angle, and chip thickness for every point on the toolpath. These values are synchronized — changing one parameter cascades through all others. When using Modify Cutting Conditions mode, set the slider to Level 8 first since displayed values correspond to Level 8, with lower levels reducing MRR proportionally.", category: "speeds_feeds", tags: ["solidcam", "technology-wizard", "optimization", "synchronized", "cutting-conditions"], operation_types: ["roughing", "pocket_milling"], confidence: 86, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-035", title: "Technology Wizard Feed XY Max — Protect Older Machines", body: "In the Tool Data section of the Technology Wizard, the Feed XY Max parameter caps the maximum feed rate the wizard will command. Set this to your machine's proven safe rapid traverse rate minus 20% margin. On older machines with slow servo response, this prevents the wizard from generating feeds that the machine cannot physically achieve without following errors.", category: "speeds_feeds", tags: ["solidcam", "technology-wizard", "feed-max", "machine-limits", "safety"], operation_types: ["roughing", "pocket_milling"], confidence: 82, source: "web:solidcam-community", created_at: "2026-03-07", usage_count: 0 },

  // --- SolidWorks integration and associativity ---
  { id: "sc-036", title: "Full CAD-CAM Associativity — Automatic Toolpath Update on Design Change", body: "SolidCAM runs inside SolidWorks/Solid Edge/Inventor with full associativity — all 2D and 3D geometries used for machining are linked to the design model. When you modify the CAD model, all CAM operations automatically update their toolpaths. Always use model references (faces, edges) rather than sketched geometry for CAM boundaries to maintain this link.", category: "cam_strategy", tags: ["solidcam", "solidworks", "associativity", "parametric", "design-change"], operation_types: ["all"], confidence: 88, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-037", title: "Single-Window Integration — Never Export/Import CAD Files", body: "SolidCAM's single-window integration eliminates CAD file import/export entirely. Define all machining operations without leaving the SolidWorks environment. This removes translation errors from STEP/IGES conversion, saves time, and ensures the CAM model always matches the latest design revision. If you find yourself exporting geometry, you are using the integration wrong.", category: "setup", tags: ["solidcam", "solidworks", "integration", "single-window", "workflow"], operation_types: ["all"], confidence: 87, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "sc-038", title: "Assembly Mode for Fixtures — Visualize Workholding in Simulation", body: "SolidCAM works in CAD assembly mode to graphically show fixtures, tooling, and vises during simulation. Import your actual fixture models as SolidWorks assembly components and assign them as fixture bodies in SolidCAM. This enables realistic collision checking against vise jaws, clamps, and custom fixtures — not just the workpiece.", category: "fixturing", tags: ["solidcam", "solidworks", "assembly", "fixture", "simulation"], operation_types: ["all"], confidence: 84, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Simulation, verification, collision checking ---
  { id: "sc-039", title: "Machine Simulation Collision Tolerance — Set Appropriate Clearance", body: "SolidCAM's collision control includes a tolerance parameter that filters out near-miss detections below a specified value. Set collision tolerance to 0.5–1.0 mm for roughing verification and tighten to 0.1–0.2 mm for finishing and 5-axis operations. Too tight a tolerance on roughing generates false positives; too loose on 5-axis risks real collisions going undetected.", category: "safety", tags: ["solidcam", "simulation", "collision-tolerance", "verification", "clearance"], operation_types: ["all", "5axis_finishing"], confidence: 86, source: "web:solidcam-docs", created_at: "2026-03-07", usage_count: 0 },

  // === Mastercam Expert Tips (mc-001 to mc-039) — Web-researched best practices ===

  // --- Dynamic Motion Technology (DMT) — 6 tips ---
  { id: "mc-001", title: "Dynamic Mill maintains constant chip load via radial engagement control", body: "Mastercam Dynamic Mill toolpaths limit radial engagement to 5-15% of cutter diameter while using full flute-length axial depth (1-2x Dc). The engine continuously recalculates stepover to maintain constant chip load through corners and direction changes. This reduces side load on the tool, enabling 60-70% higher metal removal rates than conventional pocket milling with 50% stepover.", category: "cam_strategy", tags: ["mastercam", "dynamic-mill", "chip-load", "radial-engagement", "stepover", "mrr"], operation_types: ["roughing", "2d_pocket"], confidence: 88, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-002", title: "Dynamic Mill region types control material engagement precisely", body: "Dynamic Mill supports four chain region types: Containment (limits tool motion boundary), Avoidance (areas the tool must not enter), Air (regions with no material — tool can traverse freely), and Entry (forced entry points). Combining these regions in a single toolpath gives precise control over where the tool cuts without needing multiple operations. Always define avoidance regions for clamps and fixtures.", category: "cam_strategy", tags: ["mastercam", "dynamic-mill", "chaining", "regions", "containment", "avoidance"], operation_types: ["roughing", "2d_pocket"], confidence: 85, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-003", title: "Dynamic Mill Minimize Burial prevents over-engagement in corners", body: "In Mastercam 2025+, the Minimize Burial option in Dynamic Mill and Area Mill prevents the tool from over-engaging in tight corners and narrow slots. When enabled, the toolpath automatically adjusts the approach angle and stepover near corners to keep radial engagement below the set maximum. Enable this for parts with thin walls or deep narrow features to prevent tool deflection and chatter.", category: "cam_strategy", tags: ["mastercam", "dynamic-mill", "minimize-burial", "corners", "engagement", "2025"], operation_types: ["roughing", "2d_pocket"], confidence: 85, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-004", title: "Radial Chip Thinning Factor compensates feed for light stepovers", body: "When using Dynamic toolpaths with low radial engagement (5-10% Dc), enable Radial Chip Thinning in Mastercam to automatically increase the programmed feedrate. At 10% stepover the actual chip thickness is much less than the programmed feed-per-tooth, so RCTF compensates by boosting IPM to maintain the target chip load. Without RCTF, you are running far below optimal feed and wasting cycle time.", category: "speeds_feeds", tags: ["mastercam", "chip-thinning", "rctf", "feedrate", "dynamic", "stepover"], operation_types: ["roughing"], confidence: 87, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-005", title: "Dynamic Contour uses engagement control for profiling operations", body: "Dynamic Contour applies the same constant-engagement logic as Dynamic Mill but for open-profile (contour) cuts. It automatically manages entry/exit moves and adjusts feed through varying wall geometry. Use Dynamic Contour instead of standard Contour when wall thickness varies or when profiling near corners where conventional contour would bury the tool. Pair with climb milling for best surface finish.", category: "cam_strategy", tags: ["mastercam", "dynamic-contour", "profiling", "engagement", "climb-milling"], operation_types: ["profiling", "contouring"], confidence: 82, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-006", title: "Safety Zone mesh algorithm improves transition moves in 2025+", body: "Mastercam 2025 overhauled Safety Zone for hole making with a mesh-based algorithm. Safety Zone now uses a background mesh for all defined shapes during linking calculations, giving smoother and shorter transition movements between holes. The new algorithm provides more control over how the tool travels between operations, reducing air-cutting time on drill-intensive parts by 10-25%.", category: "cam_strategy", tags: ["mastercam", "safety-zone", "hole-making", "linking", "transition", "2025"], operation_types: ["drilling", "hole_making"], confidence: 83, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- OptiRough and entry strategies — 4 tips ---
  { id: "mc-007", title: "OptiRough does the work of six roughing toolpaths in one", body: "Mastercam OptiRough is the only 3D toolpath using Dynamic Motion technology. A single OptiRough toolpath cuts both on stepdowns (-Z) and stepups (+Z), removing maximum material with minimum passes. It replaces multiple Area Rough, Pocket, and Contour roughing operations. One customer reported going from 1 part per endmill to 45 parts per endmill after switching to OptiRough.", category: "cam_strategy", tags: ["mastercam", "optirough", "3d-roughing", "dynamic-motion", "tool-life", "cycle-time"], operation_types: ["roughing", "3d_roughing"], confidence: 88, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-008", title: "OptiRough step strategy depends on cutter type", body: "For solid endmills in OptiRough, use a large stepdown with small stepups — the tool takes a deep initial cut then cleans remaining material on the way back up. For high-feed cutters (button/face mills), use straight stepdowns only since these tools are optimized for shallow axial depth with high feed. Matching the step strategy to cutter geometry is critical for tool life and surface quality.", category: "cam_strategy", tags: ["mastercam", "optirough", "stepdown", "stepup", "high-feed", "endmill"], operation_types: ["roughing", "3d_roughing"], confidence: 85, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-009", title: "OptiRough with Stock Model eliminates guesswork on containment", body: "Always feed OptiRough a Stock Model rather than manually defining containment boundaries. The stock model precisely represents in-process material, so the toolpath only engages where material actually exists. This eliminates air cutting from oversized bounding boxes and prevents missed material in complex geometry. Use Stock Setup for raw billet definition but Stock Model for sequential operations.", category: "cam_strategy", tags: ["mastercam", "optirough", "stock-model", "containment", "air-cutting"], operation_types: ["roughing", "3d_roughing"], confidence: 87, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-010", title: "Tapered Helix Entry improves deep pocket tool life in 2026", body: "Mastercam 2026 introduces Tapered Helix Entry for Dynamic Mill and OptiRough. Unlike cylindrical helix entry which maintains constant diameter, tapered helix gradually widens the entry hole, improving chip evacuation and coolant access in deep pockets. This extends tool life significantly in pockets deeper than 2x Dc. Find it on the Entry Motion page of Dynamic Mill and OptiRough parameters.", category: "cam_strategy", tags: ["mastercam", "tapered-helix", "entry-motion", "deep-pocket", "2026", "chip-evacuation"], operation_types: ["roughing", "pocketing"], confidence: 83, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Multiaxis (4/5 axis) machining — 5 tips ---
  { id: "mc-011", title: "5-axis fixture strategy: choose toolpath first, fixture second", body: "In 5-axis Mastercam programming, prioritize finding the optimal toolpath strategy before selecting fixtures — the opposite of 3-axis workflow. Since 5-axis can reach all but one side of the part, fixture design becomes secondary to toolpath optimization. This approach produces better finishes, shorter cycle times, and fewer setups than the traditional fixture-first mindset.", category: "fixturing", tags: ["mastercam", "5-axis", "fixture", "setup", "multiaxis", "workflow"], operation_types: ["multiaxis", "5_axis"], confidence: 85, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-012", title: "Define toolholder precisely for 5-axis collision checking", body: "In 5-axis Mastercam, the toolholder geometry must be accurately modeled — not just the cutting tool. As the tool tilts around the part, the holder may pass very close to fixtures, rotary tables, or part features. Unlike 3-axis where only stick-out matters, 5-axis collision checking validates the entire holder envelope. Inaccurate holder definitions cause false-safe results and real-world crashes.", category: "safety", tags: ["mastercam", "5-axis", "toolholder", "collision", "holder-definition", "multiaxis"], operation_types: ["multiaxis", "5_axis"], confidence: 88, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-013", title: "Use tilt axis limits to protect 5-axis parts from gouges", body: "Mastercam Multiaxis lets you set custom tilt axis limits that constrain tool inclination within the machine's physical rotary axis range. This prevents the toolpath from commanding angles the machine cannot reach, which would cause either a post-processor error or an unexpected axis reversal. Set limits 2-3 degrees inside the machine's actual limits as a safety buffer.", category: "safety", tags: ["mastercam", "multiaxis", "tilt-limits", "gouge", "axis-limits", "5-axis"], operation_types: ["multiaxis", "5_axis"], confidence: 85, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-014", title: "Unified Multiaxis toolpath simplifies 5-axis experimentation", body: "Mastercam's Unified Multiaxis toolpath (introduced in 2022) lets you select Drive and Avoidance geometry once, then experiment with different cut patterns without re-selecting geometry. This drastically reduces programming time when iterating on complex 5-axis parts like impellers or turbine blades. Use it for flow, morph, parallel, and contour patterns from a single setup.", category: "cam_strategy", tags: ["mastercam", "unified-multiaxis", "5-axis", "cut-pattern", "impeller", "turbine"], operation_types: ["multiaxis", "5_axis"], confidence: 83, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-015", title: "Multiaxis safe zone provides 5-axis collision buffer", body: "Mastercam Multiaxis provides a configurable safe zone around the machined part as a collision buffer. This safety envelope prevents the tool or holder from approaching closer than the specified distance to any part surface. Combine safe zone with advanced gouge-checking to catch both holder collisions and tip gouges. Set the safe zone to at least the holder's maximum radius plus 2mm clearance.", category: "safety", tags: ["mastercam", "multiaxis", "safe-zone", "collision-buffer", "gouge-check", "5-axis"], operation_types: ["multiaxis", "5_axis"], confidence: 84, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Toolpath optimization, verify, backplot — 4 tips ---
  { id: "mc-016", title: "Arc filtering and smoothing reduce NC code size without losing accuracy", body: "Mastercam's arc filtering replaces clusters of tiny linear moves within a tolerance band with single arc moves, dramatically reducing NC file size. Smoothing redistributes toolpath node points to eliminate clustering. Together they can reduce file size by 30-60% on freeform surfaces. Set filter tolerance to half the part tolerance — too loose causes out-of-tolerance surfaces, too tight negates the benefit.", category: "post_processor", tags: ["mastercam", "arc-filter", "smoothing", "nc-code", "file-size", "tolerance"], operation_types: ["finishing", "3d_finishing"], confidence: 85, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-017", title: "Use Verify collision report to pinpoint exact collision locations", body: "In Mastercam Verify simulation, when a collision is detected the Report tab lists every collision event with the exact location. Click any collision entry to jump the simulation to that point — the colliding components highlight in red. Use Stop Conditions to automatically pause simulation at collisions. Configure Proximity Alerts to catch near-misses before they become crashes on the machine.", category: "quality", tags: ["mastercam", "verify", "collision-report", "simulation", "proximity-alert", "stop-condition"], operation_types: ["verification"], confidence: 86, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-018", title: "Machine Simulation detects axis limit and collision errors on 3-5 axis", body: "Mastercam Machine Simulation goes beyond Verify by checking the entire machine kinematic model — spindle, table, rotary axes, and enclosure — for collisions and axis travel limit violations. It reports axis underflow/overflow errors when the toolpath commands positions beyond physical limits. Always run Machine Simulation for 4- and 5-axis jobs; Verify alone only checks tool-to-part collisions.", category: "quality", tags: ["mastercam", "machine-simulation", "axis-limits", "collision", "kinematic", "5-axis"], operation_types: ["verification", "multiaxis"], confidence: 86, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-019", title: "Backplot before Verify to catch obvious errors fast", body: "Backplot displays the tool motion as wireframe lines without material removal simulation — it runs in seconds versus minutes for Verify. Use Backplot first to catch obvious errors like wrong retract heights, missing chains, or incorrect entry moves. Reserve full Verify (with material removal) for final validation. This two-step approach saves significant programming time on complex multi-operation parts.", category: "quality", tags: ["mastercam", "backplot", "verify", "workflow", "validation", "time-saving"], operation_types: ["verification"], confidence: 82, source: "web:community", created_at: "2026-03-07", usage_count: 0 },

  // --- Post processor customization and G-code control — 6 tips ---
  { id: "mc-020", title: "Machine Definition vs Control Definition vs Post Processor — know the layers", body: "Mastercam separates machine setup into three layers: Machine Definition (physical machine kinematics, axis travel, spindle), Control Definition (how arcs, canned cycles, and G-codes are output), and Post Processor (exact format and ordering of the NC output). Most shop customizations only need Control Definition changes. Only edit the post (.pst) file when you need to change output formatting or add custom M-codes.", category: "post_processor", tags: ["mastercam", "machine-definition", "control-definition", "post-processor", "architecture"], operation_types: ["post_processing"], confidence: 87, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-021", title: "Never run unverified post output directly on the machine", body: "After any post processor edit, always run the output through simulation or a dry run before cutting metal. Wrong arc direction (G02/G03 swap), incorrect G90/G91 logic, or reversed axis signs can cause immediate crashes. Compare the new output line-by-line against a known-good program for the same part. Post processor bugs are the most dangerous because they silently produce valid-looking but incorrect G-code.", category: "safety", tags: ["mastercam", "post-processor", "verification", "dry-run", "g-code", "safety"], operation_types: ["post_processing"], confidence: 90, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-022", title: "Use Mastercam's post library before writing custom posts", body: "Mastercam maintains a library of pre-written post processors for major machine families (Mazak, DMG Mori, Doosan, Haas, Okuma, Fanuc). Always start from the closest matching library post rather than writing from scratch. Post partners like In-House Solutions, Postability, ICAM, and CAMplete offer professional-grade posts with machine simulation integration. Custom posts should be a last resort.", category: "post_processor", tags: ["mastercam", "post-library", "mazak", "dmg-mori", "haas", "fanuc", "custom-post"], operation_types: ["post_processing"], confidence: 85, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-023", title: "Control Definition handles canned cycle and arc output format", body: "The Control Definition in Mastercam determines how drilling canned cycles are output (G81/G82/G83 vs. expanded code), arc output format (IJK incremental vs. R-word), and plane selection codes (G17/G18/G19). To change a drill cycle from G73 chip-break to G83 deep-peck, edit the Control Definition — not the post. This is the most common customization need and does not require post-processor editing skills.", category: "post_processor", tags: ["mastercam", "control-definition", "canned-cycle", "arc-format", "drill-cycle", "g83"], operation_types: ["post_processing", "drilling"], confidence: 84, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-024", title: "Post processor adjusts feeds, speeds, and tool comp for each machine", body: "The post processor can override programmed feeds and speeds, adjust tool length compensation (G43/G44), and control how tool changes are sequenced (M06 timing, spindle orient, coolant off/on). For multi-machine shops, maintain a separate post per machine that encodes each machine's quirks — pre-positioning height, rotary axis naming (A/B/C), and safe retract macros.", category: "post_processor", tags: ["mastercam", "post-processor", "tool-comp", "feeds-speeds", "multi-machine", "g43"], operation_types: ["post_processing"], confidence: 83, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-025", title: "Default initial plane is G17 — change in post for lathe or rotary work", body: "Mastercam's default initial work plane is G17 (XY). For lathe operations or certain rotary-axis configurations, you may need G18 (XZ) or G19 (YZ) as the initial plane. This is set in the post processor via the plane parameter (e.g., plane=sg18). Getting this wrong causes arcs to interpolate in the wrong plane, producing scrap or crashes on the first arc move.", category: "post_processor", tags: ["mastercam", "work-plane", "g17", "g18", "lathe", "arc-interpolation"], operation_types: ["post_processing", "turning"], confidence: 82, source: "web:community", created_at: "2026-03-07", usage_count: 0 },

  // --- Stock model and rest machining — 4 tips ---
  { id: "mc-026", title: "Stock Model captures in-process material for sequential operations", body: "A Mastercam Stock Model is a geometric snapshot of the material state at a specific point in the Operations Manager. Set the insertion point in the operation tree, run the Stock Model command, and it captures the stock definition plus all prior machining. Use this as the stock input for subsequent operations to ensure they only cut where material actually remains — eliminating air cutting and preventing missed material.", category: "cam_strategy", tags: ["mastercam", "stock-model", "in-process", "operations-manager", "sequential"], operation_types: ["roughing", "rest_machining"], confidence: 87, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-027", title: "Stock Setup defines raw billet — Stock Model defines in-process shape", body: "Stock Setup and Stock Model serve different purposes in Mastercam. Stock Setup defines the raw material shape (rectangular, cylindrical, or STL) before any machining. Stock Model represents material remaining after specific operations. Use Stock Setup for the first roughing operation and Stock Model for all subsequent operations. Confusing these causes either air cutting (stock too large) or missed material (stock too small).", category: "setup", tags: ["mastercam", "stock-setup", "stock-model", "raw-billet", "in-process", "workflow"], operation_types: ["setup"], confidence: 85, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-028", title: "Rest machining with smaller tool requires accurate previous-tool stock model", body: "Rest machining (remachining) in Mastercam identifies areas the previous larger tool could not reach and targets them with a smaller tool. The accuracy depends entirely on the stock model from the prior operation. If the previous tool or stepover changed, regenerate the stock model before computing the rest toolpath. Stale stock models cause the rest tool to either miss material or plunge into already-machined surfaces.", category: "cam_strategy", tags: ["mastercam", "rest-machining", "remachining", "stock-model", "tool-change", "accuracy"], operation_types: ["rest_machining", "finishing"], confidence: 86, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-029", title: "OptiRest uses stock model for targeted 3D rest roughing", body: "OptiRest (OptiRough using Stock) targets only the material left by a previous roughing operation. Feed it the stock model from the prior OptiRough or Area Rough pass and it generates Dynamic Motion toolpaths only where material remains. This is far more efficient than running a second full-coverage roughing pass. Cycle time savings of 40-60% are typical on complex 3D parts versus re-running OptiRough with a smaller tool.", category: "cam_strategy", tags: ["mastercam", "optirest", "optirough", "stock-model", "rest-roughing", "3d"], operation_types: ["roughing", "rest_machining"], confidence: 84, source: "web:community", created_at: "2026-03-07", usage_count: 0 },

  // --- Automation: tool libraries, operations manager, templates — 4 tips ---
  { id: "mc-030", title: "Build tool library incrementally with full speed/feed and holder data", body: "Create a thorough Mastercam tool library by saving each tool with its proven speeds, feeds, toolholder assignment, and material-specific parameters after successful jobs. Over time this library becomes your shop's knowledge base. Use Sandvik CoroPlus Tool Library integration in Mastercam 2025+ for automated import of cutting data. A mature tool library eliminates 70% of programming setup time.", category: "automation", tags: ["mastercam", "tool-library", "speeds-feeds", "coroplus", "sandvik", "workflow"], operation_types: ["setup"], confidence: 85, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-031", title: "Operations Manager import reuses proven operation sequences", body: "Save proven operation sequences as templates via Operations Manager. For similar parts, import the template (Operations Manager > Import > Browse), then adjust geometry chains and parameters to fit. This carries forward all toolpath settings, feeds, speeds, and linking parameters. Combined with batch processing, you can generate toolpaths for families of parts overnight.", category: "automation", tags: ["mastercam", "operations-manager", "templates", "import", "batch", "family-of-parts"], operation_types: ["setup", "automation"], confidence: 84, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-032", title: "FBM auto-programs prismatic features from solid models", body: "Feature Based Machining (FBM) in Mastercam automatically identifies prismatic features (holes, pockets, bosses, slots) on solid models and generates appropriate toolpaths without manual chaining. FBM analyzes feature type, size, and location to select tools and create drilling/milling operations. Best for plate work and fixture plates with many similar features. Not suitable for freeform surfaces or complex 3D geometry.", category: "automation", tags: ["mastercam", "fbm", "feature-based", "solid-model", "automatic", "prismatic"], operation_types: ["drilling", "pocketing", "automation"], confidence: 83, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-033", title: "Batch processing runs toolpath regeneration and simulation overnight", body: "Mastercam Batch mode queues multiple part files for toolpath regeneration, machine simulation, and post processing. Run batch jobs overnight for large production orders or when iterating parameters across a part family. Batch mode also validates that all toolpaths regenerate cleanly after CAD model changes — catching broken chains or missing geometry before the programmer returns.", category: "automation", tags: ["mastercam", "batch-processing", "overnight", "regeneration", "simulation", "automation"], operation_types: ["automation"], confidence: 82, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Chaining, geometry management, levels — 3 tips ---
  { id: "mc-034", title: "Click position on entity controls chaining start point and direction", body: "In Mastercam chaining, where you click on a geometry entity determines the chain direction. Click on whichever side of the entity's midpoint you want the chain to start from — Mastercam chains away from the click point. Getting chain direction wrong flips climb/conventional milling and reverses compensation direction. Verify chain direction arrows before accepting; use Reverse if needed.", category: "setup", tags: ["mastercam", "chaining", "direction", "click-position", "midpoint", "chain-start"], operation_types: ["setup"], confidence: 86, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-035", title: "Levels Manager in 2026 uses tree structure with groups and search", body: "Mastercam 2026 introduces a tree-structured Levels Manager with nested groups, subgroups, drag-and-drop organization, and search/filter tools. Organize levels by function: raw stock, finished part, fixtures, toolpath boundaries, construction geometry. Use naming conventions (e.g., L10-Stock, L20-Part, L30-Fixtures) for quick filtering. This replaces the flat level list and dramatically improves management of complex multi-setup parts.", category: "setup", tags: ["mastercam", "levels-manager", "tree-structure", "organization", "2026", "groups"], operation_types: ["setup"], confidence: 83, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-036", title: "Planes Manager enables drag-and-drop WCS organization in 2026", body: "Mastercam 2026's Planes Manager provides a tree structure with drag-and-drop for organizing work coordinate systems. Create groups for each setup (OP10, OP20, etc.) and nest related planes within them. Advanced search and filtering finds planes by name, orientation, or association. For multi-setup 5-axis jobs, this replaces manually scrolling through dozens of unorganized plane entries.", category: "setup", tags: ["mastercam", "planes-manager", "wcs", "organization", "2026", "multi-setup"], operation_types: ["setup", "multiaxis"], confidence: 82, source: "web:mastercam-docs", created_at: "2026-03-07", usage_count: 0 },

  // --- Mastercam-specific speeds/feeds and material settings — 3 tips ---
  { id: "mc-037", title: "Start Dynamic toolpaths at 80% of recommended speeds and feeds", body: "When first implementing Dynamic Motion toolpaths, start at 80% of the tool manufacturer's recommended speeds and feeds, then adjust upward based on machine response. Dynamic toolpaths fundamentally change the cutting engagement, so conventional speed/feed charts do not directly apply. Listen for consistent cutting sound — chatter means too much engagement or wrong speed. Post a test program and run with override pots before committing to production values.", category: "speeds_feeds", tags: ["mastercam", "dynamic", "speeds-feeds", "conservative", "override", "implementation"], operation_types: ["roughing"], confidence: 84, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-038", title: "Use entry feed and dwell to protect tools at cut start", body: "Set separate Entry Feed rates in Mastercam toolpath parameters — typically 50% of the cutting feed — to reduce load when the tool first engages material. Add a short dwell (0.1-0.5 seconds) after entry to let the spindle reach programmed RPM before material removal begins. This is especially important for large-diameter tools and interrupted cuts where the spindle may lag during initial engagement.", category: "speeds_feeds", tags: ["mastercam", "entry-feed", "dwell", "spindle", "tool-protection", "engagement"], operation_types: ["roughing", "finishing"], confidence: 83, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
  { id: "mc-039", title: "Suppress non-critical features in CAD model before roughing for better toolpaths", body: "Before generating roughing toolpaths on complex models, suppress or remove features that do not affect the roughing operation — small holes, fillets, chamfers, and text engravings. Mastercam's toolpath engine computes faster and produces cleaner roughing paths on simplified geometry. Re-enable features for finishing passes. This takes extra CAD prep time but produces measurably better toolpaths and shorter calculation times on complex mold and die parts.", category: "cam_strategy", tags: ["mastercam", "model-prep", "feature-suppression", "roughing", "mold-die", "calculation-time"], operation_types: ["roughing", "3d_roughing"], confidence: 85, source: "web:community", created_at: "2026-03-07", usage_count: 0 },
];

// ============================================================================
// CONTENT DEDUPLICATION (U-TK01)
// ============================================================================

/**
 * Compute content hash for deduplication. Uses title + body normalized.
 * @param tip - KnowledgeTip to hash
 * @returns MD5 hex hash of normalized content
 */
function contentHash(tip: { title?: string; body?: string }): string {
  const content = `${tip.title || ""}::${tip.body || ""}`.toLowerCase().trim();
  return createHash("md5").update(content).digest("hex");
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/** Path for persisted captured tips (survives server restarts). */
const CAPTURED_TIPS_PATH = path.resolve(
  process.env.PRISM_TRIBAL_TIPS_PATH ||
  path.join(import.meta.dirname, "../../state/tribal_captured_tips.json")
);

/** Load previously captured tips from disk. Returns empty array on any error. */
function loadCapturedTips(): KnowledgeTip[] {
  try {
    if (fs.existsSync(CAPTURED_TIPS_PATH)) {
      const raw = fs.readFileSync(CAPTURED_TIPS_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    log.warn(`[TribalKnowledge] Failed to load captured tips: ${err}`);
  }
  return [];
}

/** Path to document-learned knowledge store (written by documentLearningDispatcher). */
const DOC_KNOWLEDGE_DIR = path.resolve(
  process.env.PRISM_KNOWLEDGE_DIR ||
  path.join(import.meta.dirname, "../../../cad-engine/knowledge_store")
);

/**
 * Scan the document-learning knowledge store and convert extracted tips
 * into KnowledgeTip format. Returns empty array if store doesn't exist.
 */
function loadDocumentLearnedTips(): KnowledgeTip[] {
  const tips: KnowledgeTip[] = [];
  try {
    if (!fs.existsSync(DOC_KNOWLEDGE_DIR)) return tips;
    const files = fs.readdirSync(DOC_KNOWLEDGE_DIR).filter(f => f.endsWith(".json") && f !== "_registry.json");
    for (const file of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(DOC_KNOWLEDGE_DIR, file), "utf-8"));
        const rawTips = raw.tips || raw.items || raw.entries || [];
        if (!Array.isArray(rawTips)) continue;
        const docId = file.replace(".json", "");
        for (let i = 0; i < rawTips.length; i++) {
          const item = rawTips[i];
          tips.push({
            id: `TK-DL-${docId}-${String(i + 1).padStart(3, "0")}`,
            title: item.title || item.name || `Document tip ${i + 1}`,
            body: item.body || item.content || item.text || "",
            category: item.category || "general",
            tags: [...(item.tags || []), "document-learned", `doc:${docId}`],
            material_groups: item.material_groups || undefined,
            operation_types: item.operation_types || undefined,
            confidence: item.confidence || 70,
            source: `document:${docId}`,
            created_at: item.created_at || new Date().toISOString().slice(0, 10),
            usage_count: 0,
          });
        }
      } catch { /* skip malformed files */ }
    }
  } catch (err) {
    log.warn(`[TribalKnowledge] Failed to load document-learned tips: ${err}`);
  }
  return tips;
}

/**
 * Load tips from the extraction bridge (hyperMILL, hyperCAD-S, etc.).
 * These are auto-ingested from PDF/doc extractions.
 */
function loadExtractedTips(): KnowledgeTip[] {
  const tips: KnowledgeTip[] = [];
  try {
    // Dynamic import to avoid circular dependencies
    const bridgePath = path.join(process.cwd(), "src/data/extractedKnowledgeBridge.js");
    if (!fs.existsSync(bridgePath.replace(".js", ".ts"))) return tips;

    // Try to load auto-ingested tips TypeScript file
    const autoTipsPath = path.join(process.cwd(), "src/data/auto-ingested-tips.ts");
    if (fs.existsSync(autoTipsPath)) {
      const content = fs.readFileSync(autoTipsPath, "utf-8");
      // Extract tips array from TypeScript source (simple regex parse)
      const match = content.match(/export const AUTO_INGESTED_TIPS[^=]*=[^[]*(\[[\s\S]*?\]);/);
      if (match) {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const tipsArray = (new Function(`return ${match[1]}`))();
        if (Array.isArray(tipsArray)) {
          for (const t of tipsArray) {
            tips.push({
              id: t.id || `tk-ext-${tips.length}`,
              title: t.title || "",
              body: t.body || "",
              category: t.category || "general",
              tags: [...(t.tags || []), "extracted", "hypermill"],
              confidence: t.confidence || 80,
              source: t.source || "extracted:hypermill",
              created_at: t.created_at || new Date().toISOString().slice(0, 10),
              usage_count: 0,
            });
          }
          log.info(`[TribalKnowledge] Loaded ${tips.length} extracted tips from auto-ingested-tips.ts`);
        }
      }
    }
  } catch (err) {
    log.warn(`[TribalKnowledge] Failed to load extracted tips: ${err}`);
  }
  return tips;
}

/** Persist all captured (non-static) tips to disk. */
function saveCapturedTips(tips: KnowledgeTip[]): void {
  try {
    const dir = path.dirname(CAPTURED_TIPS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    safeWriteSync(CAPTURED_TIPS_PATH, JSON.stringify(tips, null, 2));
  } catch (err) {
    log.error(`[TribalKnowledge] Failed to persist captured tips: ${err}`);
  }
}

/**
 * Notify SVI that tribal tips changed so it recomputes on next drift check.
 * Best-effort — SVI staleness detection will pick up the timestamp change.
 */
function notifySVITribalChange(tipCount: number): void {
  try {
    const sviPath = path.resolve("H:/prism/state/shared/SVI-watch-status.json");
    if (fs.existsSync(sviPath)) {
      const status = JSON.parse(fs.readFileSync(sviPath, "utf-8"));
      status.last_change_at = new Date().toISOString();
      status.last_trigger = "tribal_knowledge_change";
      if (!status.last_changed_areas) status.last_changed_areas = [];
      if (!status.last_changed_areas.includes("tribal_tips")) {
        status.last_changed_areas.push("tribal_tips");
      }
      status.coverage_alerts = status.coverage_alerts || [];
      const alert = `Tribal tips count changed to ${tipCount} — SVI recompute needed`;
      if (!status.coverage_alerts.includes(alert)) {
        status.coverage_alerts = [alert, ...status.coverage_alerts.slice(0, 4)];
      }
      fs.writeFileSync(sviPath, JSON.stringify(status, null, 2));
    }
  } catch { /* SVI notification is best-effort */ }
}

// ============================================================================
// AUTO-CATEGORIZATION
// ============================================================================

/** Category → subcategory mapping for finer classification. */
const SUBCATEGORY_MAP: Record<string, string[]> = {
  speeds_feeds: ["cutting_parameters", "chip_load", "surface_speed", "feed_rate", "trochoidal", "adaptive", "hsm"],
  tooling: ["tool_selection", "tool_wear", "tool_coating", "tool_geometry", "tool_holder", "insert_grade"],
  setup: ["workholding", "alignment", "probing", "datum", "zero_setting", "thermal_compensation"],
  fixturing: ["vise", "chuck", "fixture_plate", "vacuum", "magnetic", "pallet", "soft_jaw", "tombstone"],
  surface_finish: ["roughness", "polishing", "burnishing", "media_blast", "anodize", "plating"],
  thread: ["tapping", "thread_milling", "single_point_thread", "thread_measurement"],
  safety: ["chip_handling", "coolant_safety", "ppe", "lockout_tagout", "emergency_stop"],
  maintenance: ["preventive", "spindle_care", "way_lube", "coolant_management", "filter"],
  material_handling: ["lifting", "deburring", "cleaning", "packaging", "shipping"],
  quality: ["inspection", "gdt", "spc", "first_article", "measurement", "calibration", "drawing"],
  troubleshooting: ["chatter", "vibration", "runout", "crash_recovery", "alarm", "tolerance_drift"],
  programming: ["cam_strategy", "post_processor", "macro", "sub_program", "probing_routine"],
  // U-TK03: New subcategory mappings for added categories
  cam_strategy: ["adaptive", "trochoidal", "hsm", "rest_machining", "pencil", "scallop", "spiral", "contour", "pocket", "facing", "drilling", "boring"],
  post_processor: ["formatting", "macro_call", "controller_quirk", "safe_start", "tool_change", "spindle_orient", "coolant_code", "m_code", "g_code"],
  optimization: ["cycle_time", "tool_path", "feed_optimization", "rapid_motion", "air_cut", "approach", "retract", "linking"],
  automation: ["palletization", "robot_loading", "lights_out", "bar_feeder", "part_catcher", "conveyor", "tool_presetter"],
  roughing: ["stock_removal", "step_over", "step_down", "radial_depth", "axial_depth", "chip_thinning"],
  multi_axis: ["simultaneous", "indexed", "tilt_angle", "lead_angle", "collision_avoidance", "tool_axis"],
  mold_die: ["electrode", "edm", "polishing", "texture", "parting_line", "draft_angle", "core_cavity"],
  verification: ["toolpath_check", "gouge_detection", "collision_check", "material_removal"],
  simulation: ["nc_simulation", "machine_simulation", "virtual_machine", "digital_twin"],
  probing: ["touch_probe", "tool_setter", "part_inspection", "wcs_update", "tool_breakage"],
};

/**
 * U-TK04: Infer domain from source string, tags, and category.
 * Expanded with WEDM/EDM/sinker detection and 15 additional controller families.
 */
function inferDomain(tip: KnowledgeTip): KnowledgeDomain {
  const src = tip.source.toLowerCase();
  const tags = tip.tags.map(t => t.toLowerCase());
  const text = `${tip.title ?? ""} ${tip.body ?? ""}`.toLowerCase();

  // Source-based detection (highest priority)
  if (src.startsWith("video:") || tags.includes("video-learned")) return "video_learned";
  if (src.startsWith("document:") || tags.includes("document-learned")) return "document_learned";
  if (src.startsWith("safety:") || tip.category === "safety") return "safety";
  if (src.startsWith("operator:") || src.startsWith("incident:")) return "shop_floor";

  // U-TK04: EDM process detection (WEDM, sinker, wire EDM)
  const edmKeywords = ["edm", "wedm", "wire edm", "sinker", "electrode", "spark", "dielectric", "flushing"];
  if (edmKeywords.some(k => text.includes(k) || tags.includes(k))) return "process_engineering";

  // CAM software detection
  const camSystems = ["mastercam", "fusion360", "fusion 360", "nx", "solidcam", "esprit", "edgecam",
    "camworks", "topsolid", "worknc", "gibbscam", "catia", "surfcam", "bobcad", "powermill",
    "tebis", "cimatron", "sprutcam", "hypermill", "featurecam", "alphacam", "inventor cam"];
  if (camSystems.some(c => tags.includes(c) || src.includes(c) || text.includes(c))) return "cam_software";

  // U-TK04: Expanded controller detection (15 additional families)
  const controllers = [
    // Original 7
    "fanuc", "siemens", "sinumerik", "haas", "okuma", "mazatrol", "heidenhain",
    // U-TK04: 15 additional controller families
    "mazak", "hurco", "winmax", "makino", "brother", "citizen", "doosan",
    "dmg", "mori", "mitsubishi", "fagor", "yasnac", "centroid", "anilam",
    "tormach", "mach3", "mach4", "grbl", "linuxcnc", "pathpilot", "osai",
    "num", "acramatic"
  ];
  if (controllers.some(c => tags.includes(c) || src.includes(c) || text.includes(c))) return "controller_specific";

  // Category-based domain mapping
  if (tip.category === "quality" && tags.some(t => t.includes("drawing") || t.includes("gdt"))) return "drawing_standards";
  if (tip.category === "quality" || tip.category === "inspection") return "quality_inspection";
  if (tip.category === "fixturing") return "workholding";
  if (tip.category === "maintenance") return "maintenance";
  if (tip.category === "tooling") return "tooling_technology";
  if (tip.category === "troubleshooting" || tip.category === "process_engineering") return "process_engineering";

  // U-TK04: Explicit category-to-domain mappings (not fall-through to general)
  if (tip.category === "speeds_feeds") return "shop_floor";
  if (tip.category === "programming" || tip.category === "cam_strategy") return "cam_software";
  if (tip.category === "post_processor") return "controller_specific";
  if (tip.category === "mold_die") return "process_engineering";
  if (tip.category === "simulation" || tip.category === "verification") return "cam_software";

  return "general";
}

/** Infer subcategory by matching tags against the subcategory map. */
function inferSubcategory(tip: KnowledgeTip): KnowledgeSubcategory | undefined {
  const subs = SUBCATEGORY_MAP[tip.category];
  if (!subs) return undefined;
  const text = `${tip.title} ${tip.body} ${tip.tags.join(" ")}`.toLowerCase();
  for (const sub of subs) {
    const words = sub.split("_");
    if (words.some(w => text.includes(w))) return sub;
  }
  return undefined;
}

/**
 * U-TK03: Infer knowledge type from tip content.
 * Detects anti-patterns, rules, workarounds, etc. from linguistic patterns.
 */
function inferKnowledgeType(tip: KnowledgeTip): KnowledgeType {
  const text = `${tip.title ?? ""} ${tip.body ?? ""}`.toLowerCase();

  // Anti-pattern indicators
  if (/\b(never|don'?t|avoid|do not|warning|caution|danger)\b/.test(text)) {
    return "anti_pattern";
  }

  // Rule indicators (firm requirements)
  if (/\b(must|always|required|mandatory|shall)\b/.test(text)) {
    return "rule";
  }

  // Workaround indicators
  if (/\b(workaround|trick|hack|bypass|instead of|alternative)\b/.test(text)) {
    return "workaround";
  }

  // Failure mode indicators
  if (/\b(fail|failure|crash|break|broke|damaged|destroyed)\b/.test(text)) {
    return "failure_mode";
  }

  // Correction indicators
  if (/\b(actually|correct|incorrect|wrong|misconception|myth)\b/.test(text)) {
    return "correction";
  }

  // Heuristic/rule of thumb indicators
  if (/\b(rule of thumb|approximately|roughly|about|typically|usually)\b/.test(text)) {
    return "heuristic";
  }

  // Machine quirk indicators
  if (/\b(quirk|bug|issue|behavior|specific to|only on)\b/.test(text) && tip.machine_ids?.length) {
    return "machine_quirk";
  }

  // Post quirk indicators
  if (/\b(post|output|g-?code|m-?code)\b/.test(text) && tip.category === "post_processor") {
    return "post_quirk";
  }

  // Setup lesson indicators
  if (tip.category === "setup" || tip.category === "fixturing") {
    return "setup_lesson";
  }

  // Quote correction indicators
  if (/\b(cost|price|quote|estimate|time|cycle)\b/.test(text) && /\b(actual|real|true|correct)\b/.test(text)) {
    return "quote_correction";
  }

  // Default to general tip
  return "tip";
}

/**
 * Auto-categorize a tip using ContentAutoTaggerEngine.
 * Enriches: tags, category (if generic), material_groups, operation_types,
 * domain, subcategory, and workholding_type.
 *
 * U-TK02: Added null guards and skip check for already-categorized tips.
 */
function autoCategorize(tip: KnowledgeTip): KnowledgeTip {
  // U-TK02: Skip if already categorized to avoid redundant regex calls
  if (tip.auto_categorized) {
    return tip;
  }

  // U-TK02: Null guard for undefined text fields
  const title = tip.title ?? "";
  const body = tip.body ?? "";
  const text = `${title}. ${body}`;

  // Skip categorization if no meaningful text
  if (!title.trim() && !body.trim()) {
    return { ...tip, auto_categorized: true };
  }

  const tagResult = contentAutoTaggerEngine.tag(text);
  const autoTags = contentAutoTaggerEngine.toFlatTags(tagResult);

  // Merge auto-tags with existing, deduplicated
  const mergedTags = [...new Set([...tip.tags, ...autoTags])];

  // Infer category if missing or generic
  let category = tip.category;
  if (!category || category === "general" || category === ("" as KnowledgeCategory)) {
    category = contentAutoTaggerEngine.inferCategory(tagResult) as KnowledgeCategory;
  }

  // Extract material groups from text if not already set
  let materialGroups = tip.material_groups;
  if ((!materialGroups || materialGroups.length === 0) && tagResult.materials.length > 0) {
    materialGroups = [...new Set(tagResult.materials.map(m => m.iso_group))];
  }

  // Extract operation types from text if not already set
  let operationTypes = tip.operation_types;
  if ((!operationTypes || operationTypes.length === 0) && tagResult.operations.length > 0) {
    operationTypes = [...new Set(tagResult.operations.map(o => o.type))];
  }

  // Detect workholding type if not set
  let workholdingType = tip.workholding_type;
  if (!workholdingType) {
    const whMatch = text.match(/\b(vise|chuck|collet|fixture|vacuum|magnetic|pallet|soft.?jaw|tombstone|mandrel)\b/i);
    if (whMatch) workholdingType = whMatch[1].toLowerCase().replace(/\s+/g, "_");
  }

  // Detect machine IDs from text if not set
  let machineIds = tip.machine_ids;
  if ((!machineIds || machineIds.length === 0) && tagResult.machines.length > 0) {
    machineIds = tagResult.machines
      .filter(m => m.model)
      .map(m => `${m.brand}-${m.model}`.toLowerCase().replace(/\s+/g, "-"));
  }

  const enriched: KnowledgeTip = {
    ...tip,
    category,
    tags: mergedTags,
    material_groups: materialGroups,
    operation_types: operationTypes,
    workholding_type: workholdingType,
    machine_ids: machineIds,
    auto_categorized: true,
    auto_tags: autoTags,
  };

  // Infer domain, subcategory, and knowledge type (U-TK03)
  enriched.domain = inferDomain(enriched);
  enriched.subcategory = inferSubcategory(enriched);
  enriched.knowledge_type = tip.knowledge_type ?? inferKnowledgeType(enriched);

  return enriched;
}

// ============================================================================
// TK-MS6 U-TK30: Master Machinist Types (restored from b7e0b298f)
// ============================================================================

/** Provenance chain for a Master Machinist tip. */
export interface MasterMachinistProvenance {
  captured_by: string;
  captured_at: string;
  times_applied: number;
  success_rate?: number;
}

/** A single Master Machinist recommendation. */
export interface MasterMachinistTip {
  message: string;
  validation_count: number;
  confidence_pct: number;
  provenance: MasterMachinistProvenance;
  tip_id: string;
  tip_title: string;
  relevance_score: number;
}

/** Full Master Machinist recommendation response. */
export interface MasterMachinistRecommendation {
  context: {
    material: string;
    machine: string;
    operation: string;
    tolerance: string;
  };
  recommendations: MasterMachinistTip[];
  total_candidates: number;
  master_machinist_says: string;
}

// ============================================================================
// TK-MS7-U34: LLM LEARNING LOOP TYPES (restored from b7e0b298f)
// ============================================================================

/** LLM reasoning trace for knowledge extraction. */
export interface LLMReasoningTrace {
  session_id: string;
  timestamp: string;
  decisions: Array<{
    type: "parameter_override" | "tool_selection" | "strategy_change" | "other";
    parameter?: string;
    original_value?: string | number;
    new_value?: string | number;
    action: string;
    reason: string;
    context: Partial<{
      material: string;
      machine: string;
      operation: string;
      controller: string;
    }>;
    outcome: "success" | "failure" | "partial";
    outcome_detail?: string;
  }>;
  issues_identified?: Array<{
    category: string;
    summary: string;
    description: string;
    resolution?: string;
    resolution_outcome?: "resolved" | "partial" | "unresolved";
    prevention_advice?: string;
    confidence: number;
    context: Partial<{
      material: string;
      machine: string;
      operation: string;
    }>;
  }>;
  workarounds?: Array<{
    problem: string;
    solution: string;
    reason: string;
    caveats?: string;
    outcome: "success" | "failure" | "partial";
    context: Partial<{
      material: string;
      machine: string;
      operation: string;
    }>;
  }>;
}

/** Capture candidate from LLM reasoning. */
export interface CaptureCandidate {
  title: string;
  body: string;
  category: string;
  domain: string;
  knowledge_type: string;
  tags: string[];
  confidence: number;
  source: string;
  context: Partial<{
    material: string;
    machine: string;
    operation: string;
    controller: string;
  }>;
  capture_type: "parameter_override" | "issue_identification" | "workaround";
  requires_validation: boolean;
  suggested_id: string;
}

// ============================================================================
// TK-MS7: NATURAL LANGUAGE QUERY TYPES FOR LLM/PUOA INTEGRATION
// ============================================================================

/** Parsed intent from natural language query. */
export interface ParsedTribalIntent {
  material?: string;
  material_iso?: string;
  operation?: string;
  machine?: string;
  controller?: string;
  category?: string;
  keywords: string[];
  ambiguous: boolean;
  original_intent: string;
}

/** Modifier extracted from tribal tips for calculation adjustments. */
export interface TribalModifier {
  parameter: string;
  adjustment: number;
  adjustment_type?: "relative" | "absolute_max" | "absolute_min";
  reason: string;
  source_tip_id: string;
  confidence: number;
}

/** Constraint extracted from tribal tips. */
export interface TribalConstraint {
  type: "prohibition" | "requirement" | "warning";
  description: string;
  reason: string;
  source_tip_id: string;
  severity: "low" | "medium" | "high" | "critical";
}

/** Result from natural language tribal knowledge query. */
export interface TribalNLQueryResult {
  query: string;
  parsed_intent: ParsedTribalIntent;
  tips: Array<{
    id: string;
    title: string;
    body: string;
    category: string;
    domain?: string;
    confidence: number;
    relevance_score: number;
    provenance: {
      source: string;
      captured_by: string;
      times_applied: number;
    };
  }>;
  modifiers: TribalModifier[];
  constraints: TribalConstraint[];
  warnings: string[];
  summary: string;
  clarifications: string[];
  total_matches: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Tribal Knowledge Engine engine/manager.
 */
export class TribalKnowledgeEngine {
  // =========================================================================
  // U-TK02: Lazy initialization to defer 461K regex calls until first use
  // =========================================================================

  /** Raw static tips — loaded from data files (no categorization). */
  private static _rawStaticTips: KnowledgeTip[] | null = null;
  private static get RAW_STATIC_TIPS(): KnowledgeTip[] {
    if (!this._rawStaticTips) {
      this._rawStaticTips = [
        ...KNOWLEDGE_BASE,
        ...FUSION360_CAM_TIPS as KnowledgeTip[],
        ...FUSION360_CAM_TIPS_EXT as KnowledgeTip[],
        ...NX_CAM_TIPS as KnowledgeTip[],
        ...NX_CAM_TIPS_EXT as KnowledgeTip[],
        ...CONTROLLER_KNOWLEDGE_TIPS as KnowledgeTip[],
        ...MASTERCAM_CAM_TIPS as KnowledgeTip[],
        ...SOLIDCAM_CAM_TIPS as KnowledgeTip[],
        ...ESPRIT_CAM_TIPS as KnowledgeTip[],
        ...EDGECAM_CAM_TIPS as KnowledgeTip[],
        ...CAMWORKS_CAM_TIPS as KnowledgeTip[],
        ...TOPSOLID_CAM_TIPS as KnowledgeTip[],
        ...WORKNC_CAM_TIPS as KnowledgeTip[],
        ...GIBBSCAM_CAM_TIPS as KnowledgeTip[],
        ...CATIA_CAM_TIPS as KnowledgeTip[],
        ...SURFCAM_CAM_TIPS as KnowledgeTip[],
        ...BOBCAD_CAM_TIPS as KnowledgeTip[],
        ...POWERMILL_CAM_TIPS as KnowledgeTip[],
        ...TEBIS_CAM_TIPS as KnowledgeTip[],
        ...CIMATRON_CAM_TIPS as KnowledgeTip[],
        ...SPRUTCAM_CAM_TIPS as KnowledgeTip[],
        ...HYPERMILL_CAM_TIPS_EXT as KnowledgeTip[],
        ...WEDM_KNOWLEDGE_TIPS as unknown as KnowledgeTip[],
      ];
      log.info(`[TribalKnowledge] Loaded ${this._rawStaticTips.length} raw static tips`);
    }
    return this._rawStaticTips;
  }

  /** Static tips auto-categorized — lazy init on first access. */
  private static _staticTips: KnowledgeTip[] | null = null;
  private static get STATIC_TIPS(): KnowledgeTip[] {
    if (!this._staticTips) {
      log.info("[TribalKnowledge] Categorizing static tips (lazy init)...");
      this._staticTips = this.RAW_STATIC_TIPS.map(t => autoCategorize(t));
      log.info(`[TribalKnowledge] Categorized ${this._staticTips.length} static tips`);
    }
    return this._staticTips;
  }

  /** Document-learned tips — lazy init on first access. */
  private static _docLearnedTips: KnowledgeTip[] | null = null;
  private static get DOC_LEARNED_TIPS(): KnowledgeTip[] {
    if (!this._docLearnedTips) {
      this._docLearnedTips = [
        ...loadDocumentLearnedTips(),
        ...loadExtractedTips(),
      ].map(t => autoCategorize(t));
      log.info(`[TribalKnowledge] Loaded ${this._docLearnedTips.length} doc-learned tips`);
    }
    return this._docLearnedTips;
  }

  /** Captured tips -- loaded from disk on FIRST access, not at construction
   *  (U-TK-LAZY: importing the module-level singleton at boot must not read disk). */
  private _capturedTips: KnowledgeTip[] | null = null;
  private get capturedTips(): KnowledgeTip[] {
    if (!this._capturedTips) this._capturedTips = loadCapturedTips();
    return this._capturedTips;
  }

  /** Combined view: static + document-learned + captured. Built lazily on first
   *  access -- defers the STATIC_TIPS/DOC_LEARNED_TIPS categorize + capturedTips
   *  disk read off the cold-start path; rebuilt on capture via the setter. */
  private _tips: KnowledgeTip[] | null = null;
  private get tips(): KnowledgeTip[] {
    if (!this._tips) {
      this._tips = [...TribalKnowledgeEngine.STATIC_TIPS, ...TribalKnowledgeEngine.DOC_LEARNED_TIPS, ...this.capturedTips];
    }
    return this._tips;
  }
  private set tips(v: KnowledgeTip[]) { this._tips = v; }

  /** U-TK01: Instance-level content hash set for deduplication. */
  private contentHashes = new Set<string>();
  private _hashesBuilt = false;

  /** Lazily build the dedup hash set from the full tip corpus on first dedup check
   *  (U-TK-LAZY: moved out of the constructor so boot stays cheap). Idempotent. */
  private ensureHashes(): void {
    if (this._hashesBuilt) return;
    for (const tip of this.tips) {
      this.contentHashes.add(contentHash(tip));
    }
    this._hashesBuilt = true;
    log.info(`[TribalKnowledge] Initialized content hash set with ${this.contentHashes.size} entries`);
  }

  constructor() {
    // U-TK-LAZY: intentionally empty. The tip load + categorize + hash-set build
    // are deferred to first actual use (the `tips` getter / ensureHashes) so that
    // importing the module-level singleton (line ~2121) at mcp-server boot does NOT
    // read disk or categorize ~3700 tips. Previously these ran in the field
    // initializers + this constructor, firing on every cold start.
  }

  /** Check if content already exists (U-TK01). */
  private isDuplicateContent(tip: { title?: string; body?: string }): boolean {
    this.ensureHashes(); // U-TK-LAZY: build the hash set on first dedup check, not at boot
    return this.contentHashes.has(contentHash(tip));
  }

  /** Register content hash (U-TK01). */
  private registerContent(tip: { title?: string; body?: string }): void {
    this.contentHashes.add(contentHash(tip));
  }

  /**
   * Capture a new tribal knowledge tip. Auto-categorizes via ContentAutoTaggerEngine,
   * then persists to disk immediately. Rejects duplicates by content hash (U-TK01).
   * @param tip - Tip data (id, created_at, usage_count auto-generated)
   * @returns The created KnowledgeTip with generated fields and auto-categorization, or null if duplicate
   */
  capture(tip: Omit<KnowledgeTip, "id" | "created_at" | "usage_count">): KnowledgeTip | null {
    // U-TK01: Content-based deduplication
    if (this.isDuplicateContent(tip)) {
      log.info(`[TribalKnowledge] Rejected duplicate content: "${tip.title?.slice(0, 50)}..."`);
      return null;
    }

    const baseTip: KnowledgeTip = {
      ...tip,
      id: `tk-cap-${Date.now().toString(36)}-${String(this.capturedTips.length + 1).padStart(3, "0")}`,
      created_at: new Date().toISOString().slice(0, 10),
      usage_count: 0,
    };
    const newTip = autoCategorize(baseTip);
    this.capturedTips.push(newTip);
    this.registerContent(newTip);
    this.tips = [...TribalKnowledgeEngine.STATIC_TIPS, ...TribalKnowledgeEngine.DOC_LEARNED_TIPS, ...this.capturedTips];
    saveCapturedTips(this.capturedTips);
    notifySVITribalChange(this.tips.length);
    log.info(`[TribalKnowledge] Captured & auto-categorized: ${newTip.id} → domain=${newTip.domain}, category=${newTip.category}, subcategory=${newTip.subcategory ?? "none"}, auto_tags=${(newTip.auto_tags ?? []).length}`);
    return newTip;
  }

  /**
   * Ingest tips from external sources (video learning, document learning).
   * Auto-categorizes each tip, deduplicates by ID AND content hash (U-TK01).
   * @param tips - Array of complete KnowledgeTip objects with IDs
   * @returns Count of newly ingested tips (excludes duplicates)
   */
  ingest(tips: KnowledgeTip[]): number {
    const existingIds = new Set(this.tips.map(t => t.id));
    let added = 0;
    let contentDupes = 0;
    for (const tip of tips) {
      // U-TK01: Check both ID and content hash
      if (existingIds.has(tip.id)) continue;
      if (this.isDuplicateContent(tip)) {
        contentDupes++;
        continue;
      }
      const enriched = autoCategorize(tip);
      this.capturedTips.push(enriched);
      existingIds.add(enriched.id);
      this.registerContent(enriched);
      added++;
    }
    if (contentDupes > 0) {
      log.info(`[TribalKnowledge] Rejected ${contentDupes} content duplicates during ingest`);
    }
    if (added > 0) {
      this.tips = [...TribalKnowledgeEngine.STATIC_TIPS, ...TribalKnowledgeEngine.DOC_LEARNED_TIPS, ...this.capturedTips];
      saveCapturedTips(this.capturedTips);
      notifySVITribalChange(this.tips.length);
      log.info(`[TribalKnowledge] Ingested & auto-categorized ${added} new tips`);
    }
    return added;
  }

  /**
   * Recategorize all captured tips using ContentAutoTaggerEngine.
   * Retroactively enriches existing tips that lack auto-categorization.
   * @param force - If true, re-categorize even already-categorized tips
   * @returns Summary of recategorization results
   */
  recategorizeAll(force = false): {
    total: number;
    recategorized: number;
    skipped: number;
    by_domain: Record<string, number>;
    by_category: Record<string, number>;
  } {
    let recategorized = 0;
    let skipped = 0;
    const byDomain: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (let i = 0; i < this.capturedTips.length; i++) {
      const tip = this.capturedTips[i];
      if (!force && tip.auto_categorized) {
        skipped++;
        continue;
      }
      this.capturedTips[i] = autoCategorize(tip);
      recategorized++;
    }

    // Rebuild combined tips array
    this.tips = [...TribalKnowledgeEngine.STATIC_TIPS, ...TribalKnowledgeEngine.DOC_LEARNED_TIPS, ...this.capturedTips];

    // Persist recategorized tips
    if (recategorized > 0) {
      saveCapturedTips(this.capturedTips);
      log.info(`[TribalKnowledge] Recategorized ${recategorized} tips (${skipped} skipped)`);
    }

    // Compute stats across ALL tips (static + captured)
    for (const tip of this.tips) {
      const d = tip.domain || "general";
      byDomain[d] = (byDomain[d] || 0) + 1;
      byCategory[tip.category] = (byCategory[tip.category] || 0) + 1;
    }

    return {
      total: this.tips.length,
      recategorized,
      skipped,
      by_domain: byDomain,
      by_category: byCategory,
    };
  }

  /** Search.
   * @param input - input data
   * @returns knowledge tip[]
   */
  search(input: KnowledgeSearchInput): KnowledgeTip[] {
    let results = [...this.tips];

    if (input.category) results = results.filter(t => t.category === input.category);
    if (input.material_iso_group) results = results.filter(t => !t.material_groups || t.material_groups.includes(input.material_iso_group!));
    if (input.operation_type) results = results.filter(t => !t.operation_types || t.operation_types.includes(input.operation_type!));
    if (input.min_confidence) results = results.filter(t => t.confidence >= input.min_confidence!);

    // U-TK04: Domain filtering
    if (input.domain) {
      results = results.filter(t => t.domain === input.domain);
    }

    // U-TK04: Subcategory filtering
    if (input.subcategory) {
      results = results.filter(t => t.subcategory === input.subcategory);
    }

    // U-TK04: Knowledge type filtering
    if (input.knowledge_type) {
      results = results.filter(t => t.knowledge_type === input.knowledge_type);
    }

    // Machine-specific filtering — tips with no machine_ids match all machines
    if (input.machine_ids && input.machine_ids.length > 0) {
      results = results.filter(t => !t.machine_ids || t.machine_ids.length === 0 || t.machine_ids.some(m => input.machine_ids!.includes(m)));
    }

    // Workholding filtering — tips with no workholding_type match all setups
    if (input.workholding_type) {
      results = results.filter(t => !t.workholding_type || t.workholding_type === input.workholding_type);
    }

    // Text query search
    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter(t =>
        (t.title ?? "").toLowerCase().includes(q) ||
        (t.body ?? "").toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Sort by relevance (confidence × usage)
    results.sort((a, b) => (b.confidence * Math.log2(b.usage_count + 2)) - (a.confidence * Math.log2(a.usage_count + 2)));

    return results.slice(0, input.limit || 5);
  }

  /** Suggest.
   * @param materialIso - material iso
   * @param operationType - operation type
   * @returns knowledge suggestion
   */
  suggest(materialIso: string, operationType: string): KnowledgeSuggestion {
    const tips = this.search({ material_iso_group: materialIso, operation_type: operationType, limit: 5 });
    const relevance: Record<string, number> = {};

    /** For.
     * @param const - const
     * @returns void
     */
    for (const tip of tips) {
      let score = tip.confidence / 100;
      if (tip.material_groups?.includes(materialIso)) score += 0.2;
      if (tip.operation_types?.includes(operationType)) score += 0.2;
      relevance[tip.id] = Math.min(1.0, Math.round(score * 100) / 100);
    }

    return {
      tips, relevance_scores: relevance,
      context_match: `Material: ISO ${materialIso}, Operation: ${operationType}`,
    };
  }

  /** Stats — returns category, domain, and confidence breakdowns.
   * @returns knowledge stats including auto-categorization metrics
   */
  stats(): KnowledgeStats {
    const byCategory: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    let high = 0, medium = 0, low = 0;
    let autoCategorizedCount = 0;

    for (const tip of this.tips) {
      byCategory[tip.category] = (byCategory[tip.category] || 0) + 1;
      const domain = tip.domain || "general";
      byDomain[domain] = (byDomain[domain] || 0) + 1;
      if (tip.confidence >= 85) high++;
      else if (tip.confidence >= 60) medium++;
      else low++;
      if (tip.auto_categorized) autoCategorizedCount++;
    }

    const sorted = [...this.tips].sort((a, b) => b.usage_count - a.usage_count);
    const mostUsed = sorted.slice(0, 5).map(t => ({ id: t.id, title: t.title, usage_count: t.usage_count }));

    // Identify coverage gaps
    const gaps = CORE_CATEGORIES.filter(c => !byCategory[c] || byCategory[c] < 2);

    return {
      total_tips: this.tips.length,
      by_category: byCategory,
      by_domain: byDomain,
      by_confidence: { high, medium, low },
      most_used: mostUsed,
      coverage_gaps: gaps,
      auto_categorized_count: autoCategorizedCount,
    };
  }

  // =========================================================================
  // TK-MS7: NATURAL LANGUAGE QUERY (restored from b7e0b298f L1761)
  // Used by PRISMUnifiedOrchestratorEngine.{queryTribalKnowledge,synthesizeTribalForTask}
  // =========================================================================

  /**
   * Query tribal knowledge using natural language intent.
   * Parses material, operation, machine, controller, category from free text,
   * retrieves relevance-scored tips, and extracts modifiers/constraints/warnings.
   * @param intent - Free-form natural language query (e.g., "tips for roughing D2 steel on Okuma")
   * @returns Structured query result for LLM/PUOA consumption
   */
  queryTribalNaturalLanguage(intent: string): TribalNLQueryResult {
    const parsed = this.parseNaturalLanguageIntent(intent);
    const tips = this.searchByParsedIntent(parsed);
    const modifiers = this.extractModifiersFromTips(tips);
    const constraints = this.extractConstraintsFromTips(tips);
    const warnings = this.extractWarningsFromTips(tips);
    const summary = this.formatTribalSummaryForLLM(tips, parsed);
    const clarifications = parsed.ambiguous ? this.generateClarifications(parsed) : [];

    return {
      query: intent,
      parsed_intent: parsed,
      tips: tips.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        body: t.body,
        category: t.category,
        domain: t.domain,
        confidence: t.confidence,
        relevance_score: t.relevance_score || 0,
        provenance: {
          source: t.source || "unknown",
          captured_by: deriveCapturedBy(t.source),
          times_applied: t.usage_count,
        },
      })),
      modifiers,
      constraints,
      warnings,
      summary,
      clarifications,
      total_matches: tips.length,
    };
  }

  /**
   * Parse natural language intent into structured query parameters.
   * Extracts materials (16 patterns), operations (12), machines/controllers (9), categories (9).
   */
  private parseNaturalLanguageIntent(intent: string): ParsedTribalIntent {
    const text = intent.toLowerCase();
    const words = text.split(/\s+/);

    const materialPatterns: Array<{ pattern: RegExp; material: string; iso: string }> = [
      { pattern: /\b(d2|d-2)\b/i, material: "D2", iso: "K" },
      { pattern: /\b(m2|m-2|hss)\b/i, material: "M2", iso: "S" },
      { pattern: /\b(s7|s-7)\b/i, material: "S7", iso: "K" },
      { pattern: /\b(a2|a-2)\b/i, material: "A2", iso: "K" },
      { pattern: /\b(h13|h-13)\b/i, material: "H13", iso: "H" },
      { pattern: /\b(4140|41l40)\b/i, material: "4140", iso: "P" },
      { pattern: /\b(6061|6061-t6)\b/i, material: "6061-T6", iso: "N" },
      { pattern: /\b(304|304ss|stainless)\b/i, material: "304SS", iso: "M" },
      { pattern: /\b(inconel|718)\b/i, material: "Inconel 718", iso: "S" },
      { pattern: /\b(titanium|ti-6al-4v|ti64)\b/i, material: "Ti-6Al-4V", iso: "S" },
      { pattern: /\b(carbide|tungsten carbide)\b/i, material: "Tungsten Carbide", iso: "H" },
      { pattern: /\b(graphite)\b/i, material: "Graphite", iso: "N" },
      { pattern: /\b(copper|brass|bronze)\b/i, material: "Copper", iso: "N" },
      { pattern: /\b(aluminum|aluminium)\b/i, material: "Aluminum", iso: "N" },
      { pattern: /\b(steel|carbon steel)\b/i, material: "Steel", iso: "P" },
      { pattern: /\b(hardened|hard|hrc)\b/i, material: "Hardened Steel", iso: "H" },
    ];

    let material: string | undefined;
    let materialIso: string | undefined;
    for (const { pattern, material: mat, iso } of materialPatterns) {
      if (pattern.test(text)) { material = mat; materialIso = iso; break; }
    }

    const operationPatterns: Array<{ pattern: RegExp; operation: string }> = [
      { pattern: /\b(rough|roughing)\b/i, operation: "roughing" },
      { pattern: /\b(finish|finishing)\b/i, operation: "finishing" },
      { pattern: /\b(drill|drilling|hole)\b/i, operation: "drilling" },
      { pattern: /\b(tap|tapping|thread)\b/i, operation: "threading" },
      { pattern: /\b(pocket|pocketing)\b/i, operation: "pocketing" },
      { pattern: /\b(contour|profile|profiling)\b/i, operation: "profiling" },
      { pattern: /\b(face|facing)\b/i, operation: "facing" },
      { pattern: /\b(bore|boring)\b/i, operation: "boring" },
      { pattern: /\b(slot|slotting)\b/i, operation: "slotting" },
      { pattern: /\b(turn|turning|lathe)\b/i, operation: "turning" },
      { pattern: /\b(edm|sinker|wire)\b/i, operation: "edm" },
      { pattern: /\b(grind|grinding)\b/i, operation: "grinding" },
    ];

    let operation: string | undefined;
    for (const { pattern, operation: op } of operationPatterns) {
      if (pattern.test(text)) { operation = op; break; }
    }

    const machinePatterns: Array<{ pattern: RegExp; machine: string; controller: string }> = [
      { pattern: /\b(okuma|osp)\b/i, machine: "Okuma", controller: "OSP" },
      { pattern: /\b(fanuc|fanuc\s*\d+)\b/i, machine: "Fanuc", controller: "Fanuc" },
      { pattern: /\b(haas)\b/i, machine: "Haas", controller: "Haas" },
      { pattern: /\b(mazak|mazatrol)\b/i, machine: "Mazak", controller: "Mazatrol" },
      { pattern: /\b(hurco)\b/i, machine: "Hurco", controller: "WinMax" },
      { pattern: /\b(mitsubishi)\b/i, machine: "Mitsubishi", controller: "Mitsubishi" },
      { pattern: /\b(siemens|sinumerik)\b/i, machine: "Siemens", controller: "Sinumerik" },
      { pattern: /\b(heidenhain)\b/i, machine: "Heidenhain", controller: "Heidenhain" },
      { pattern: /\b(roku-roku|rokuroku)\b/i, machine: "Roku-Roku", controller: "Fanuc" },
    ];

    let machine: string | undefined;
    let controller: string | undefined;
    for (const { pattern, machine: mach, controller: ctrl } of machinePatterns) {
      if (pattern.test(text)) { machine = mach; controller = ctrl; break; }
    }

    const categoryPatterns: Array<{ pattern: RegExp; category: string }> = [
      { pattern: /\b(speed|feed|s\/?f|rpm|ipm|mmpm)\b/i, category: "speeds_feeds" },
      { pattern: /\b(tool|tooling|cutter|insert)\b/i, category: "tooling" },
      { pattern: /\b(fixture|clamp|vise|workholding|setup)\b/i, category: "fixturing" },
      { pattern: /\b(safety|danger|warning|caution)\b/i, category: "safety" },
      { pattern: /\b(quality|tolerance|gdt|inspection)\b/i, category: "quality" },
      { pattern: /\b(post|g-?code|m-?code|nc)\b/i, category: "post_processor" },
      { pattern: /\b(cam|toolpath|strategy)\b/i, category: "cam_strategy" },
      { pattern: /\b(maintenance|wear|life)\b/i, category: "maintenance" },
      { pattern: /\b(troubleshoot|problem|issue|fix)\b/i, category: "troubleshooting" },
    ];

    let category: string | undefined;
    for (const { pattern, category: cat } of categoryPatterns) {
      if (pattern.test(text)) { category = cat; break; }
    }

    const ambiguous = !material && !operation && !machine && !category;

    const stopWords = new Set([
      "the","a","an","for","to","in","on","with","and","or","of",
      "tips","advice","help","how","what","when","why","best","good","any",
    ]);
    const keywords = words.filter(w => w.length > 2 && !stopWords.has(w));

    return {
      material,
      material_iso: materialIso,
      operation,
      machine,
      controller,
      category,
      keywords,
      ambiguous,
      original_intent: intent,
    };
  }

  /**
   * Search tips using parsed intent parameters with weighted relevance scoring.
   * Weights: material 30, material_iso 20, operation 25, machine 20, controller 15,
   * category 20, keywords 5 each. Boosts: confidence×0.1, min(usage×2, 20).
   */
  private searchByParsedIntent(parsed: ParsedTribalIntent): (KnowledgeTip & { relevance_score: number })[] {
    const results: (KnowledgeTip & { relevance_score: number })[] = [];

    for (const tip of this.tips) {
      let score = 0;
      const tipText = `${tip.title} ${tip.body} ${tip.tags?.join(" ") || ""}`.toLowerCase();

      if (parsed.material && tipText.includes(parsed.material.toLowerCase())) score += 30;
      if (parsed.material_iso && tip.material_groups?.includes(parsed.material_iso)) score += 20;
      if (parsed.operation && tipText.includes(parsed.operation)) score += 25;
      if (parsed.machine && tipText.includes(parsed.machine.toLowerCase())) score += 20;
      if (parsed.controller && tipText.includes(parsed.controller.toLowerCase())) score += 15;
      if (parsed.category && tip.category === parsed.category) score += 20;

      for (const kw of parsed.keywords) {
        if (tipText.includes(kw)) score += 5;
      }

      score += tip.confidence * 0.1;
      score += Math.min(tip.usage_count * 2, 20);

      if (score > 0) results.push({ ...tip, relevance_score: score });
    }

    results.sort((a, b) => b.relevance_score - a.relevance_score);
    return results;
  }

  /**
   * Extract modifier suggestions from top 5 tips for calculation adjustments.
   * Detects: "reduce speed by X%", "reduce feed by X%", "reduce/limit doc to X mm".
   */
  private extractModifiersFromTips(tips: KnowledgeTip[]): TribalModifier[] {
    const modifiers: TribalModifier[] = [];

    for (const tip of tips.slice(0, 5)) {
      const text = `${tip.title} ${tip.body}`.toLowerCase();

      const speedMatch = text.match(/reduce\s+speed\s+(?:by\s+)?(\d+)%/i);
      if (speedMatch) {
        modifiers.push({
          parameter: "cutting_speed",
          adjustment: -parseInt(speedMatch[1], 10) / 100,
          adjustment_type: "relative",
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: tip.confidence,
        });
      }

      const feedMatch = text.match(/reduce\s+feed\s+(?:by\s+)?(\d+)%/i);
      if (feedMatch) {
        modifiers.push({
          parameter: "feed_rate",
          adjustment: -parseInt(feedMatch[1], 10) / 100,
          adjustment_type: "relative",
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: tip.confidence,
        });
      }

      const docMatch = text.match(/(?:reduce|limit)\s+(?:doc|depth)\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*mm/i);
      if (docMatch) {
        modifiers.push({
          parameter: "depth_of_cut",
          adjustment: parseFloat(docMatch[1]),
          adjustment_type: "absolute_max",
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: tip.confidence,
        });
      }
    }

    return modifiers;
  }

  /**
   * Extract constraint warnings (prohibitions + requirements) from top 5 tips.
   * Detects: "never|don't|avoid|do not X" → prohibition; "must|always|required X" → requirement.
   */
  private extractConstraintsFromTips(tips: KnowledgeTip[]): TribalConstraint[] {
    const constraints: TribalConstraint[] = [];

    for (const tip of tips.slice(0, 5)) {
      const text = `${tip.title} ${tip.body}`.toLowerCase();

      if (/\b(never|don'?t|avoid|do not)\b/.test(text)) {
        const actionMatch = text.match(/(?:never|don'?t|avoid|do not)\s+([^.!]+)/i);
        if (actionMatch) {
          constraints.push({
            type: "prohibition",
            description: actionMatch[1].trim(),
            reason: tip.title,
            source_tip_id: tip.id,
            severity: "high",
          });
        }
      }

      if (/\b(must|always|required)\b/.test(text)) {
        const actionMatch = text.match(/(?:must|always|required)\s+([^.!]+)/i);
        if (actionMatch) {
          constraints.push({
            type: "requirement",
            description: actionMatch[1].trim(),
            reason: tip.title,
            source_tip_id: tip.id,
            severity: "medium",
          });
        }
      }
    }

    return constraints;
  }

  /**
   * Extract warning messages from top 5 tips.
   * Flags safety-category tips and anti_pattern/failure_mode knowledge_types.
   * (Schema-adapted from original which used "danger_zone"/"gotcha" — those types
   *  aren't in the current KnowledgeType union.)
   */
  private extractWarningsFromTips(tips: KnowledgeTip[]): string[] {
    const warnings: string[] = [];

    for (const tip of tips.slice(0, 5)) {
      if (tip.category === "safety") {
        warnings.push(`[SAFETY] ${tip.title}`);
      } else if (tip.knowledge_type === "anti_pattern" || tip.knowledge_type === "failure_mode") {
        warnings.push(`[GOTCHA] ${tip.title}`);
      }
    }

    return warnings;
  }

  /**
   * Format tribal knowledge summary for LLM consumption.
   * Returns top-3 tips with title, category, confidence, and 200-char body excerpt.
   */
  private formatTribalSummaryForLLM(tips: KnowledgeTip[], parsed: ParsedTribalIntent): string {
    if (tips.length === 0) {
      return `No tribal knowledge found for query: "${parsed.original_intent}". Consider searching with different keywords or browsing by category.`;
    }

    const topTips = tips.slice(0, 3);
    const context: string[] = [];
    if (parsed.material) context.push(`material: ${parsed.material}`);
    if (parsed.operation) context.push(`operation: ${parsed.operation}`);
    if (parsed.machine) context.push(`machine: ${parsed.machine}`);

    const contextStr = context.length > 0 ? ` for ${context.join(", ")}` : "";

    let summary = `Found ${tips.length} tribal knowledge tips${contextStr}. Top recommendations:\n\n`;
    for (let i = 0; i < topTips.length; i++) {
      const tip = topTips[i];
      summary += `${i + 1}. **${tip.title}** (${tip.category}, confidence: ${tip.confidence}%)\n`;
      summary += `   ${tip.body.slice(0, 200)}${tip.body.length > 200 ? "..." : ""}\n\n`;
    }

    return summary;
  }

  /**
   * Generate clarification suggestions for ambiguous queries (missing all 4 dimensions).
   */
  private generateClarifications(parsed: ParsedTribalIntent): string[] {
    const suggestions: string[] = [];
    if (!parsed.material) suggestions.push("Specify the material (e.g., 'D2 steel', '6061 aluminum', 'Inconel')");
    if (!parsed.operation) suggestions.push("Specify the operation (e.g., 'roughing', 'finishing', 'drilling')");
    if (!parsed.machine) suggestions.push("Specify the machine or controller (e.g., 'Okuma', 'Haas', 'Fanuc')");
    if (!parsed.category) suggestions.push("Specify the category (e.g., 'speeds/feeds', 'tooling', 'fixturing')");
    return suggestions;
  }

  // =========================================================================
  // TK-MS6 U-TK30: Master Machinist Recommendation (restored from b7e0b298f L1682)
  // Ranked top-3 tips with provenance, formatted in "Senior machinists say..." voice.
  // =========================================================================

  /**
   * Get top 3 tribal tips for the given context, formatted as Master Machinist advice.
   * Ranks by: confidence (50%) + usage_count (30%) + evidence_count (20%).
   * @param context - material/machine/operation/tolerance hints (all optional)
   */
  masterMachinistRecommend(context: {
    material?: string;
    machine?: string;
    operation?: string;
    tolerance?: string;
  }): MasterMachinistRecommendation {
    const searchInput: KnowledgeSearchInput = {
      material_iso_group: context.material,
      operation_type: context.operation,
      limit: 100,
    };

    let candidates = this.search(searchInput);

    if (context.machine) {
      const machineLower = context.machine.toLowerCase();
      candidates = candidates.filter(t =>
        (t.machine_ids || []).some(m => m.toLowerCase().includes(machineLower)) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(machineLower))
      );
    }

    const scored = candidates.map(tip => {
      const confidenceScore = (tip.confidence || 70) / 100 * 0.5;
      const usageScore = Math.min((tip.usage_count || 0) / 100, 1) * 0.3;
      const evidenceScore = Math.min((tip.evidence_count || 0) / 50, 1) * 0.2;
      return { tip, score: confidenceScore + usageScore + evidenceScore };
    }).sort((a, b) => b.score - a.score);

    const top3 = scored.slice(0, 3);

    const recommendations: MasterMachinistTip[] = top3.map(({ tip, score }) => ({
      message: `Senior machinists say: "${tip.title}". ${tip.body?.slice(0, 200) || ""}`,
      validation_count: tip.usage_count || 0,
      confidence_pct: Math.round(tip.confidence || 70),
      provenance: {
        captured_by: tip.source || "shop_floor",
        captured_at: tip.created_at || "unknown",
        times_applied: tip.usage_count || 0,
        success_rate: tip.evidence_count
          ? Math.round((tip.evidence_count / Math.max(tip.usage_count || 1, 1)) * 100)
          : undefined,
      },
      tip_id: tip.id,
      tip_title: tip.title,
      relevance_score: Math.round(score * 100),
    }));

    return {
      context: {
        material: context.material || "any",
        machine: context.machine || "any",
        operation: context.operation || "any",
        tolerance: context.tolerance || "any",
      },
      recommendations,
      total_candidates: candidates.length,
      master_machinist_says: recommendations[0]?.message || "No relevant tips found for this context.",
    };
  }

  // =========================================================================
  // TK-MS7-U34: LLM Interaction Learning Loop (restored from b7e0b298f L2155)
  // =========================================================================

  /**
   * Capture new tribal knowledge from LLM reasoning interactions.
   * Detects: (a) successful parameter overrides, (b) resolved issue identifications,
   * (c) successful workarounds. Auto-categorizes each candidate via the
   * inferCategoryFromLLMContent / inferDomainFromLLMContent / inferKnowledgeTypeFromLLMContent
   * helpers and stamps with source="llm_reasoning".
   * @param reasoning - LLM reasoning trace with decisions, issues_identified, workarounds
   */
  captureFromLLMReasoning(reasoning: LLMReasoningTrace): CaptureCandidate[] {
    const candidates: CaptureCandidate[] = [];

    for (const decision of reasoning.decisions) {
      if (decision.type === "parameter_override" && decision.outcome === "success") {
        candidates.push(this.createCaptureCandidate({
          type: "parameter_override",
          title: `${decision.parameter} adjustment for ${decision.context.material || "material"}`,
          body: `LLM reasoning suggested ${decision.action}: ${decision.reason}. Original value: ${decision.original_value}, adjusted to: ${decision.new_value}. Outcome: ${decision.outcome_detail || "successful"}`,
          context: decision.context,
          confidence: this.calculateLLMCaptureConfidence(decision),
        }));
      }
    }

    for (const issue of reasoning.issues_identified || []) {
      if (issue.resolution && issue.resolution_outcome === "resolved") {
        candidates.push(this.createCaptureCandidate({
          type: "issue_identification",
          title: `${issue.category}: ${issue.summary}`,
          body: `LLM identified issue: ${issue.description}. Resolution: ${issue.resolution}. ${issue.prevention_advice || ""}`,
          context: issue.context,
          confidence: this.calculateLLMCaptureConfidence({ outcome: "success", reasoning_quality: issue.confidence }),
        }));
      }
    }

    for (const workaround of reasoning.workarounds || []) {
      if (workaround.outcome === "success") {
        candidates.push(this.createCaptureCandidate({
          type: "workaround",
          title: `Workaround: ${workaround.problem}`,
          body: `When ${workaround.problem}, try: ${workaround.solution}. Reason: ${workaround.reason}. ${workaround.caveats || ""}`,
          context: workaround.context,
          confidence: this.calculateLLMCaptureConfidence(workaround),
        }));
      }
    }

    return candidates;
  }

  /** Create a capture candidate with auto-categorization. */
  private createCaptureCandidate(input: {
    type: "parameter_override" | "issue_identification" | "workaround";
    title: string;
    body: string;
    context: Partial<{
      material: string;
      machine: string;
      operation: string;
      controller: string;
    }>;
    confidence: number;
  }): CaptureCandidate {
    const category = this.inferCategoryFromLLMContent(input);
    const domain = this.inferDomainFromLLMContent(input);
    const knowledgeType = this.inferKnowledgeTypeFromLLMContent(input);

    const tags: string[] = ["llm-learned", input.type.replace("_", "-")];
    if (input.context.material) tags.push(input.context.material.toLowerCase());
    if (input.context.machine) tags.push(input.context.machine.toLowerCase());
    if (input.context.operation) tags.push(input.context.operation.toLowerCase());

    return {
      title: input.title,
      body: input.body,
      category,
      domain,
      knowledge_type: knowledgeType,
      tags,
      confidence: input.confidence,
      source: "llm_reasoning",
      context: input.context,
      capture_type: input.type,
      requires_validation: input.confidence < 80,
      suggested_id: `tk-llm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
  }

  /**
   * Calculate confidence score for an LLM-sourced capture.
   * Base 50, +20 on success outcome, up to +15 from reasoning_quality, up to +15 from evidence_count.
   * Capped at 90 (LLM-sourced never reaches expert-validated 100).
   */
  private calculateLLMCaptureConfidence(data: {
    outcome?: string;
    reasoning_quality?: number;
    evidence_count?: number;
  }): number {
    let confidence = 50;
    if (data.outcome === "success") confidence += 20;
    if (data.reasoning_quality !== undefined) {
      confidence += Math.min(data.reasoning_quality * 0.2, 15);
    }
    if (data.evidence_count !== undefined) {
      confidence += Math.min(data.evidence_count * 3, 15);
    }
    return Math.min(confidence, 90);
  }

  /** Infer category from LLM capture content (keyword-driven). */
  private inferCategoryFromLLMContent(input: {
    type: string;
    title: string;
    body: string;
    context: Partial<{ operation: string }>;
  }): string {
    const text = `${input.title} ${input.body}`.toLowerCase();
    if (text.includes("speed") || text.includes("feed") || text.includes("rpm")) return "speeds_feeds";
    if (text.includes("tool") || text.includes("insert") || text.includes("cutter")) return "tooling";
    if (text.includes("fixture") || text.includes("clamp") || text.includes("vise")) return "fixturing";
    if (text.includes("safety") || text.includes("danger") || text.includes("warning")) return "safety";
    if (text.includes("quality") || text.includes("tolerance") || text.includes("inspection")) return "quality";
    if (text.includes("troubleshoot") || text.includes("problem") || text.includes("fix")) return "troubleshooting";
    if (input.context.operation) return "process_engineering";
    return "general";
  }

  /** Infer domain from LLM capture content (keyword-driven). */
  private inferDomainFromLLMContent(input: {
    type: string;
    title: string;
    body: string;
    context: Partial<{ machine: string; controller: string }>;
  }): string {
    const text = `${input.title} ${input.body}`.toLowerCase();
    if (input.context.machine || input.context.controller) return "controller_specific";
    if (text.includes("cam") || text.includes("toolpath") || text.includes("mastercam") || text.includes("fusion")) return "cam_software";
    if (text.includes("safety") || text.includes("danger")) return "safety";
    if (text.includes("quality") || text.includes("inspection")) return "quality_inspection";
    return "shop_floor";
  }

  /** Infer knowledge_type from LLM capture content. */
  private inferKnowledgeTypeFromLLMContent(input: {
    type: string;
    title: string;
    body: string;
  }): string {
    const text = `${input.title} ${input.body}`.toLowerCase();
    if (input.type === "workaround") return "workaround";
    if (text.includes("never") || text.includes("don't") || text.includes("danger")) return "danger_zone";
    if (text.includes("always") || text.includes("must") || text.includes("required")) return "mandatory_practice";
    if (input.type === "issue_identification") return "gotcha";
    return "best_practice";
  }
}

/** Derive captured_by attribution from a tip's source string.
 * "operator:John" → "John", "incident:2024-03-15" → "system", others → "system".
 */
function deriveCapturedBy(source: string | undefined): string {
  if (!source) return "system";
  if (source.startsWith("operator:")) return source.slice("operator:".length) || "system";
  return "system";
}

/** Tribal Knowledge Engine constant.
 */
export const tribalKnowledgeEngine = new TribalKnowledgeEngine();
