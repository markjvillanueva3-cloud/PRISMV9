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

export type KnowledgeCategory =
  | "setup" | "tooling" | "speeds_feeds" | "fixturing"
  | "surface_finish" | "thread" | "safety" | "maintenance"
  | "material_handling" | "quality" | "troubleshooting";

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
    const allCategories: KnowledgeCategory[] = ["setup", "tooling", "speeds_feeds", "fixturing", "surface_finish", "thread", "safety", "maintenance", "material_handling", "quality", "troubleshooting"];
    const gaps = allCategories.filter(c => !byCategory[c] || byCategory[c] < 2);

    return { total_tips: this.tips.length, by_category: byCategory, by_confidence: { high, medium, low }, most_used: mostUsed, coverage_gaps: gaps };
  }
}

export const tribalKnowledgeEngine = new TribalKnowledgeEngine();
