/**
 * DiscoverabilityEngine — MXU-MS7
 *
 * Users can FIND PRISM capabilities via:
 *   1. Full-text search across engines, actions, skills
 *   2. Domain browsing — list capabilities by domain
 *   3. Intelligent recommendation — suggest relevant capabilities
 *   4. "What can PRISM do?" queries — natural language → capability match
 *   5. Related capability linking — "users who used X also used Y"
 *
 * Sources:
 *   - MXU-MS7: Discoverability + Exposure Surface
 */

// ============================================================================
// TYPES
// ============================================================================

export type CapabilityType = "engine" | "action" | "skill" | "pillar";

export interface DiscoverableCapability {
  id: string;
  name: string;
  type: CapabilityType;
  domain: string;
  description: string;
  keywords: string[];
  entry_point?: string;
  related: string[];
}

export interface SearchResult {
  query: string;
  results: Array<DiscoverableCapability & { score: number }>;
  total: number;
  query_time_ms: number;
}

export interface DomainBrowse {
  domain: string;
  capabilities: DiscoverableCapability[];
  total: number;
}

export interface Recommendation {
  capability: DiscoverableCapability;
  reason: string;
  confidence: number;
}

// ============================================================================
// CAPABILITY INDEX
// ============================================================================

const CAPABILITY_INDEX: DiscoverableCapability[] = [
  // Physics
  { id: "sf-calc", name: "Speed & Feed Calculator", type: "action", domain: "physics", description: "Calculate optimal RPM, feed rate, and cutting parameters for any material/tool/machine combination", keywords: ["speed", "feed", "rpm", "sfm", "ipm", "cutting", "parameters", "chip", "load"], entry_point: "calc.speed_feed", related: ["force-calc", "tool-life"] },
  { id: "force-calc", name: "Cutting Force (Kienzle)", type: "action", domain: "physics", description: "Compute cutting forces using the Kienzle kc1.1 model with rake/wear/speed corrections", keywords: ["force", "kienzle", "kc1.1", "specific", "cutting", "pressure", "torque", "power"], entry_point: "calc.cutting_force", related: ["sf-calc", "deflection"] },
  { id: "tool-life", name: "Tool Life Prediction", type: "action", domain: "physics", description: "Predict tool life using Taylor VcTn=C model, optimize for minimum cost per edge", keywords: ["tool", "life", "taylor", "wear", "cost", "edge", "replacement", "vctc"], entry_point: "calc.tool_life", related: ["sf-calc", "force-calc"] },
  { id: "chatter", name: "Chatter Stability Analysis", type: "action", domain: "physics", description: "Generate stability lobe diagrams, find chatter-free RPM/depth combinations", keywords: ["chatter", "vibration", "stability", "lobe", "sld", "frequency", "harmonic"], entry_point: "calc.chatter_stability", related: ["sf-calc", "spindle-opt"] },
  { id: "deflection", name: "Tool Deflection Analysis", type: "action", domain: "physics", description: "Calculate tool deflection, check stiffness limits, recommend tool L/D ratios", keywords: ["deflection", "stiffness", "bend", "tool", "holder", "overhang", "l/d"], entry_point: "calc.deflection", related: ["force-calc"] },
  { id: "temp-calc", name: "Cutting Temperature", type: "action", domain: "physics", description: "Predict cutting zone temperature, chip temperature, thermal partition", keywords: ["temperature", "thermal", "heat", "chip", "cutting", "zone", "hot"], entry_point: "calc.temperature", related: ["sf-calc", "tool-life"] },
  { id: "spindle-opt", name: "Spindle RPM Optimizer", type: "skill", domain: "physics", description: "Select optimal RPM by combining stability lobes with sweet spots between harmonics", keywords: ["spindle", "rpm", "optimal", "harmonic", "sweet", "spot"], entry_point: "spindle-optimize", related: ["chatter", "sf-calc"] },

  // Post Processor
  { id: "pp-gen", name: "G-code Generator", type: "skill", domain: "post_processor", description: "Generate CNC programs for 20+ controller dialects (Fanuc, Siemens, Haas, Mazak, Heidenhain...)", keywords: ["gcode", "g-code", "program", "cnc", "fanuc", "siemens", "haas", "mazak", "heidenhain", "controller"], entry_point: "ppg-quick-start", related: ["pp-optimize", "pp-validate"] },
  { id: "pp-optimize", name: "Program Optimizer", type: "skill", domain: "post_processor", description: "Re-optimize existing G-code with per-block variable speed/feed using physics models", keywords: ["optimize", "program", "per-block", "variable", "speed", "feed", "improve"], entry_point: "program-optimize", related: ["pp-gen", "sf-calc"] },
  { id: "pp-validate", name: "Program Validator", type: "skill", domain: "post_processor", description: "Validate G-code for safety: spindle limits, rapid clearance, tool changes, alarm prevention", keywords: ["validate", "safety", "check", "alarm", "collision", "limit", "verify"], entry_point: "program-validate", related: ["pp-gen"] },
  { id: "print-prog", name: "Print to Program", type: "skill", domain: "post_processor", description: "Upload an engineering drawing → get a complete CNC program with tooling and S/F", keywords: ["print", "drawing", "blueprint", "ocr", "automatic", "program", "full"], entry_point: "print-to-program", related: ["pp-gen", "sf-calc"] },

  // Quoting
  { id: "quick-quote", name: "Quick Quote", type: "skill", domain: "business", description: "Generate manufacturing quotes with physics-backed cycle time estimation and DFM feedback", keywords: ["quote", "cost", "estimate", "price", "bid", "rfq", "cycle", "time"], entry_point: "quote-job", related: ["dfm", "cycle-crush"] },
  { id: "dfm", name: "DFM Analysis", type: "skill", domain: "business", description: "Design for Manufacturability check — flag tight tolerances, deep pockets, thin walls", keywords: ["dfm", "manufacturability", "design", "tolerance", "feasibility"], entry_point: "dfm-check", related: ["quick-quote"] },
  { id: "cycle-crush", name: "Cycle Time Optimizer", type: "skill", domain: "business", description: "Find every second hiding in your CNC program — tool path, rapid, dwell optimization", keywords: ["cycle", "time", "optimize", "reduce", "faster", "efficient"], entry_point: "cycle-time-crush", related: ["quick-quote", "sf-calc"] },

  // Quality
  { id: "spc", name: "SPC Analysis", type: "action", domain: "quality", description: "Statistical process control — Xbar-R charts, Cpk, process capability analysis", keywords: ["spc", "statistical", "process", "control", "cpk", "chart", "capability"], entry_point: "quality-check", related: ["fai", "measure"] },
  { id: "fai", name: "First Article Inspection", type: "skill", domain: "quality", description: "Generate AS9102 FAI reports, balloon drawings, CMM measurement plans", keywords: ["fai", "first", "article", "inspection", "as9102", "balloon", "cmm"], entry_point: "first-part-right", related: ["spc"] },
  { id: "measure", name: "Measurement Recording", type: "skill", domain: "quality", description: "Record physical measurements, track trends, get calibration feedback", keywords: ["measure", "measurement", "dimension", "record", "gage", "micrometer"], entry_point: "measure", related: ["spc", "fai"] },

  // EDM
  { id: "wedm-studio", name: "Wire EDM Studio", type: "skill", domain: "edm", description: "Full wire EDM workflow: analyze → optimize → generate program with Kunieda physics", keywords: ["wire", "edm", "wedm", "spark", "erosion", "electrical", "discharge"], entry_point: "wire-edm-studio", related: ["wedm-analyze"] },
  { id: "wedm-analyze", name: "WEDM Deep Analysis", type: "skill", domain: "edm", description: "Analyze wire EDM parameters: pulse energy, MRR, wire offset, skim passes", keywords: ["wedm", "pulse", "mrr", "offset", "skim", "analyze", "wire"], entry_point: "wire-edm-analyze", related: ["wedm-studio"] },

  // Knowledge
  { id: "tribal", name: "Tribal Knowledge", type: "skill", domain: "knowledge", description: "Search 3,700+ shop floor tips from experienced machinists", keywords: ["tribal", "knowledge", "tip", "trick", "experience", "machinist", "shop", "floor"], entry_point: "shop-knowledge", related: ["playbook"] },
  { id: "playbook", name: "Machining Playbook", type: "skill", domain: "knowledge", description: "296 best practice rules for CNC machining — feeds, speeds, strategies, troubleshooting", keywords: ["playbook", "best", "practice", "rule", "guideline", "standard"], entry_point: "playbook", related: ["tribal"] },
  { id: "troubleshoot", name: "Troubleshooting Guide", type: "skill", domain: "knowledge", description: "Diagnose machining problems: chatter, poor finish, tool breakage, dimensional errors", keywords: ["troubleshoot", "problem", "chatter", "finish", "breakage", "error", "fix"], entry_point: "troubleshooting-guide", related: ["tribal", "playbook"] },

  // Tools & Materials
  { id: "tool-select", name: "Tool Selection", type: "skill", domain: "tooling", description: "Select optimal cutting tools from 95,608 tools — material, geometry, coating match", keywords: ["tool", "select", "cutter", "endmill", "insert", "recommend", "catalog"], entry_point: "tool-select", related: ["sf-calc"] },
  { id: "material-lookup", name: "Material Database", type: "skill", domain: "materials", description: "Look up material properties — 2,957 materials with Kienzle/Taylor constants", keywords: ["material", "alloy", "steel", "aluminum", "titanium", "properties", "grade"], entry_point: "material-lookup", related: ["sf-calc"] },
];

// ============================================================================
// ENGINE
// ============================================================================

export class DiscoverabilityEngine {

  // ── Search ─────────────────────────────────────────────────

  /**
   * Full-text search across all indexed capabilities.
   */
  search(query: string, limit: number = 10): SearchResult {
    const start = Date.now();
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (words.length === 0) {
      return { query, results: [], total: 0, query_time_ms: 0 };
    }

    const scored = CAPABILITY_INDEX.map(cap => {
      let score = 0;

      for (const word of words) {
        // Keyword match (strongest signal)
        if (cap.keywords.some(k => k.includes(word) || word.includes(k))) score += 0.4;
        // Name match
        if (cap.name.toLowerCase().includes(word)) score += 0.3;
        // Description match
        if (cap.description.toLowerCase().includes(word)) score += 0.2;
        // Domain match
        if (cap.domain.includes(word)) score += 0.1;
      }

      return { ...cap, score: parseFloat(Math.min(score, 1.0).toFixed(3)) };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

    return { query, results: scored, total: scored.length, query_time_ms: Date.now() - start };
  }

  // ── Browse by Domain ───────────────────────────────────────

  /**
   * List all capabilities in a domain.
   */
  browse(domain: string): DomainBrowse {
    const caps = CAPABILITY_INDEX.filter(c => c.domain === domain);
    return { domain, capabilities: caps, total: caps.length };
  }

  /**
   * List all available domains.
   */
  listDomains(): Array<{ domain: string; count: number }> {
    const counts = new Map<string, number>();
    for (const cap of CAPABILITY_INDEX) {
      counts.set(cap.domain, (counts.get(cap.domain) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ── Recommendation ─────────────────────────────────────────

  /**
   * Recommend capabilities based on what the user has used.
   */
  recommend(usedCapabilityIds: string[], limit: number = 5): Recommendation[] {
    // Find related capabilities from what was used
    const used = new Set(usedCapabilityIds);
    const relatedScores = new Map<string, number>();

    for (const id of usedCapabilityIds) {
      const cap = CAPABILITY_INDEX.find(c => c.id === id);
      if (!cap) continue;
      for (const relId of cap.related) {
        if (!used.has(relId)) {
          relatedScores.set(relId, (relatedScores.get(relId) || 0) + 0.3);
        }
      }
    }

    // Also recommend from same domain
    const usedDomains = new Set(
      usedCapabilityIds.map(id => CAPABILITY_INDEX.find(c => c.id === id)?.domain).filter(Boolean) as string[]
    );

    for (const cap of CAPABILITY_INDEX) {
      if (used.has(cap.id)) continue;
      if (usedDomains.has(cap.domain)) {
        relatedScores.set(cap.id, (relatedScores.get(cap.id) || 0) + 0.15);
      }
    }

    const recommendations: Recommendation[] = [];
    for (const [id, score] of relatedScores) {
      const cap = CAPABILITY_INDEX.find(c => c.id === id);
      if (!cap) continue;
      recommendations.push({
        capability: cap,
        reason: score >= 0.3 ? "Related to capabilities you've used" : "In a domain you're active in",
        confidence: parseFloat(Math.min(score, 1.0).toFixed(2)),
      });
    }

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  // ── "What Can PRISM Do?" ───────────────────────────────────

  /**
   * Answer natural language queries about PRISM capabilities.
   */
  whatCanIDo(question: string): SearchResult {
    // Normalize common question patterns
    const cleaned = question
      .toLowerCase()
      .replace(/^(what can prism do|can prism|does prism|how do i|how to)\s*/i, "")
      .replace(/\?$/, "")
      .trim();

    return this.search(cleaned || question, 10);
  }

  // ── Stats ──────────────────────────────────────────────────

  /**
   * Get index statistics.
   */
  getStats(): { total: number; by_type: Record<CapabilityType, number>; by_domain: Record<string, number> } {
    const byType: Record<CapabilityType, number> = { engine: 0, action: 0, skill: 0, pillar: 0 };
    const byDomain: Record<string, number> = {};
    for (const cap of CAPABILITY_INDEX) {
      byType[cap.type]++;
      byDomain[cap.domain] = (byDomain[cap.domain] || 0) + 1;
    }
    return { total: CAPABILITY_INDEX.length, by_type: byType, by_domain: byDomain };
  }
}

export const discoverabilityEngine = new DiscoverabilityEngine();
