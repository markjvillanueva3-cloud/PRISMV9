/**
 * TribalKnowledgeEngine — Manufacturing Intelligence Layer
 *
 * Captures, stores, and retrieves shop-floor tribal knowledge — the
 * undocumented tips, tricks, and lessons learned from experienced machinists.
 * Composes ApprenticeEngine + KnowledgeGraphEngine.
 *
 * Actions: knowledge_capture, knowledge_search, knowledge_suggest, knowledge_stats
 */

// ============================================================================
// TYPES
// ============================================================================

export interface KnowledgeTip {
  id: string;
  title: string;
  body: string;
  category: KnowledgeCategory;
  tags: string[];
  material_groups?: string[];
  operation_types?: string[];
  confidence: number;                // 0–100 (validated by experts)
  source: string;                    // "operator:John", "incident:2024-03-15", etc.
  created_at: string;
  usage_count: number;
}

// Core manufacturing categories (always tracked for coverage gaps)
export const CORE_CATEGORIES = [
  "setup", "tooling", "speeds_feeds", "fixturing",
  "surface_finish", "thread", "safety", "maintenance",
  "material_handling", "quality", "troubleshooting",
] as const;

// Extended categories for non-machining domains (auto-created by /video-learn)
export type KnowledgeCategory =
  | typeof CORE_CATEGORIES[number]
  | "programming" | "electronics" | "automation" | "metrology"
  | "design" | "materials_science" | "process_engineering"
  | "lean_manufacturing" | "additive" | "inspection"
  | (string & {});  // extensible — any string accepted for dynamic categories

export interface KnowledgeSearchInput {
  query?: string;
  material_iso_group?: string;
  operation_type?: string;
  category?: KnowledgeCategory;
  min_confidence?: number;
  limit?: number;
}

export interface KnowledgeSuggestion {
  tips: KnowledgeTip[];
  relevance_scores: Record<string, number>;
  context_match: string;
}

export interface KnowledgeStats {
  total_tips: number;
  by_category: Record<string, number>;
  by_confidence: { high: number; medium: number; low: number };
  most_used: { id: string; title: string; usage_count: number }[];
  coverage_gaps: string[];
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
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TribalKnowledgeEngine {
  private tips: KnowledgeTip[] = [...KNOWLEDGE_BASE];

  capture(tip: Omit<KnowledgeTip, "id" | "created_at" | "usage_count">): KnowledgeTip {
    const newTip: KnowledgeTip = {
      ...tip,
      id: `tk-${String(this.tips.length + 1).padStart(3, "0")}`,
      created_at: new Date().toISOString().slice(0, 10),
      usage_count: 0,
    };
    this.tips.push(newTip);
    return newTip;
  }

  search(input: KnowledgeSearchInput): KnowledgeTip[] {
    let results = [...this.tips];

    if (input.category) results = results.filter(t => t.category === input.category);
    if (input.material_iso_group) results = results.filter(t => !t.material_groups || t.material_groups.includes(input.material_iso_group!));
    if (input.operation_type) results = results.filter(t => !t.operation_types || t.operation_types.includes(input.operation_type!));
    if (input.min_confidence) results = results.filter(t => t.confidence >= input.min_confidence!);

    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      );
    }

    // Sort by relevance (confidence × usage)
    results.sort((a, b) => (b.confidence * Math.log2(b.usage_count + 2)) - (a.confidence * Math.log2(a.usage_count + 2)));

    return results.slice(0, input.limit || 5);
  }

  suggest(materialIso: string, operationType: string): KnowledgeSuggestion {
    const tips = this.search({ material_iso_group: materialIso, operation_type: operationType, limit: 5 });
    const relevance: Record<string, number> = {};

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

  stats(): KnowledgeStats {
    const byCategory: Record<string, number> = {};
    let high = 0, medium = 0, low = 0;

    for (const tip of this.tips) {
      byCategory[tip.category] = (byCategory[tip.category] || 0) + 1;
      if (tip.confidence >= 85) high++;
      else if (tip.confidence >= 60) medium++;
      else low++;
    }

    const sorted = [...this.tips].sort((a, b) => b.usage_count - a.usage_count);
    const mostUsed = sorted.slice(0, 5).map(t => ({ id: t.id, title: t.title, usage_count: t.usage_count }));

    // Identify coverage gaps
    const gaps = CORE_CATEGORIES.filter(c => !byCategory[c] || byCategory[c] < 2);

    return { total_tips: this.tips.length, by_category: byCategory, by_confidence: { high, medium, low }, most_used: mostUsed, coverage_gaps: gaps };
  }
}

export const tribalKnowledgeEngine = new TribalKnowledgeEngine();
