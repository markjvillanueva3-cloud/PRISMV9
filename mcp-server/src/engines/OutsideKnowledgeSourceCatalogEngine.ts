/**
 * OutsideKnowledgeSourceCatalogEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT06
 *
 * Curated catalog of reputable external manufacturing sources the training
 * loop can cite + ingest. Each entry has structured metadata: publisher,
 * year, topics, reliability weight (0-1), citation URL.
 *
 * Engine acts as the GATEWAY — it returns structured source records sorted
 * by relevance. Actual network ingest is op-tooling; this engine guarantees
 * downstream consumers only see vetted, reliability-weighted sources.
 *
 * Sources are categorized by topic so the quoting + training-loop engines
 * can query "what reputable sources cover speeds/feeds for steel turning?"
 * and get back the Machinery's Handbook + Sandvik turning catalog + ISO
 * 3685 tool-life standard — never random web blogs.
 *
 * @milestone JM-DIE-QUOTE-TRAINING-MS0/U-QT06
 * @author slot:charlie /goal-17 iter1, 2026-05-24
 */

export type SourceCategory =
  | "machining-handbook" | "speeds-feeds" | "tool-life" | "surface-finish"
  | "tolerance-standard" | "material-property" | "cost-benchmark"
  | "process-capability" | "safety-standard" | "fixture-design"
  | "cad-cam-reference" | "edm-reference";

export interface ExternalSource {
  id: string;
  title: string;
  publisher: string;
  year: number;
  edition?: string;
  url?: string;
  isbn?: string;
  topics: string[];           // free-form keywords for fuzzy match
  categories: SourceCategory[];
  reliability_weight: number; // 0-1 — peer-reviewed/ISO/established-publisher > vendor catalog > industry-blog
  language: "en" | "de" | "ja" | "multi";
}

/**
 * The catalog. Curated for JM Die's mill/lathe/wedm/edm pipeline coverage.
 * Reliability weights: ISO/NIST/ASME = 1.0, established textbooks = 0.95,
 * vendor handbooks (Sandvik/Kennametal/Mitsubishi) = 0.90, industry surveys = 0.80.
 */
const CATALOG: ExternalSource[] = [
  // Authoritative standards
  { id: "iso-2768-1989", title: "ISO 2768 — General tolerances for linear and angular dimensions", publisher: "ISO", year: 1989, url: "https://www.iso.org/standard/7748.html", topics: ["tolerance", "general-tol", "linear", "angular"], categories: ["tolerance-standard"], reliability_weight: 1.0, language: "multi" },
  { id: "iso-3685-1993", title: "ISO 3685 — Tool-life testing with single-point turning tools", publisher: "ISO", year: 1993, url: "https://www.iso.org/standard/9151.html", topics: ["tool-life", "turning", "taylor"], categories: ["tool-life", "speeds-feeds"], reliability_weight: 1.0, language: "multi" },
  { id: "iso-1832-2017", title: "ISO 1832 — Indexable inserts for cutting tools — Designation", publisher: "ISO", year: 2017, url: "https://www.iso.org/standard/68235.html", topics: ["insert", "cnmg", "wnmg", "designation"], categories: ["cad-cam-reference"], reliability_weight: 1.0, language: "multi" },
  { id: "iso-4288-1996", title: "ISO 4288 — Surface texture — Rules and procedures for assessment", publisher: "ISO", year: 1996, topics: ["surface-finish", "ra", "rz", "roughness"], categories: ["surface-finish"], reliability_weight: 1.0, language: "multi" },
  { id: "asme-y14.5-2018", title: "ASME Y14.5-2018 — Dimensioning and Tolerancing (GD&T)", publisher: "ASME", year: 2018, url: "https://www.asme.org/codes-standards/find-codes-standards/y14-5-dimensioning-tolerancing", topics: ["gdt", "tolerance", "datum"], categories: ["tolerance-standard"], reliability_weight: 1.0, language: "en" },

  // NIST + government
  { id: "nist-ams-100-7", title: "NIST AMS 100-7 — Predictive Models for Manufacturing", publisher: "NIST", year: 2023, url: "https://nvlpubs.nist.gov/nistpubs/ams/NIST.AMS.100-7.pdf", topics: ["predictive", "models", "manufacturing", "ml"], categories: ["process-capability"], reliability_weight: 1.0, language: "en" },
  { id: "nist-mml-2024-aisi-1018", title: "NIST Material Measurement Lab — AISI 1018 reference", publisher: "NIST", year: 2024, topics: ["aisi-1018", "carbon-steel", "machinability"], categories: ["material-property"], reliability_weight: 1.0, language: "en" },

  // Foundational handbooks
  { id: "machinerys-handbook-31", title: "Machinery's Handbook 31st Edition", publisher: "Industrial Press", year: 2020, isbn: "978-0831137311", edition: "31", topics: ["speeds", "feeds", "thread", "tap", "drill", "machining"], categories: ["machining-handbook", "speeds-feeds", "tolerance-standard"], reliability_weight: 0.98, language: "en" },
  { id: "sme-fundamentals-2018", title: "SME Manufacturing Engineering Fundamentals", publisher: "SME", year: 2018, topics: ["manufacturing", "process", "fundamentals"], categories: ["machining-handbook", "process-capability"], reliability_weight: 0.95, language: "en" },
  { id: "kalpakjian-7e", title: "Manufacturing Engineering and Technology (Kalpakjian, 7e)", publisher: "Pearson", year: 2014, isbn: "978-0133128741", edition: "7", topics: ["manufacturing", "process", "metallurgy"], categories: ["machining-handbook", "material-property"], reliability_weight: 0.95, language: "en" },

  // Vendor handbooks (high signal for speeds/feeds)
  { id: "sandvik-coromant-2024", title: "Sandvik Coromant Turning Cutting Data 2024", publisher: "Sandvik Coromant", year: 2024, url: "https://www.sandvik.coromant.com/en-us/knowledge/general-turning", topics: ["turning", "cnmg", "wnmg", "vbmt", "kc1.1", "feed"], categories: ["speeds-feeds", "tool-life"], reliability_weight: 0.92, language: "en" },
  { id: "kennametal-master-2024", title: "Kennametal Master Catalog 2024", publisher: "Kennametal", year: 2024, url: "https://www.kennametal.com/us/en/resources/catalogs.html", topics: ["turning", "milling", "drilling", "insert"], categories: ["speeds-feeds", "cad-cam-reference"], reliability_weight: 0.90, language: "en" },
  { id: "mitsubishi-cutting-2024", title: "Mitsubishi Materials Cutting Tool Handbook 2024", publisher: "Mitsubishi Materials", year: 2024, url: "https://www.mitsubishicarbide.com/", topics: ["turning", "milling", "carbide", "coating"], categories: ["speeds-feeds", "tool-life"], reliability_weight: 0.90, language: "multi" },
  { id: "sodick-wedm-guidelines", title: "Sodick Wire EDM Programming Guidelines", publisher: "Sodick Co. Ltd", year: 2023, topics: ["wedm", "wire-edm", "spark", "recast", "haz", "flush"], categories: ["edm-reference"], reliability_weight: 0.92, language: "en" },
  { id: "agie-charmilles-edm-handbook", title: "GF Machining Solutions EDM Handbook (Agie-Charmilles)", publisher: "GF Machining Solutions", year: 2022, topics: ["wedm", "sinker-edm", "spark", "discharge"], categories: ["edm-reference"], reliability_weight: 0.90, language: "multi" },

  // Cost benchmarks
  { id: "mfg-com-benchmark-2024", title: "MFG.com US Machining Cost Benchmark 2024", publisher: "MFG.com", year: 2024, topics: ["cost", "benchmark", "outsource", "machining"], categories: ["cost-benchmark"], reliability_weight: 0.80, language: "en" },
  { id: "xometry-pricing-trends-2024", title: "Xometry Manufacturing Pricing Trends Report 2024", publisher: "Xometry", year: 2024, topics: ["cost", "outsource", "lead-time"], categories: ["cost-benchmark"], reliability_weight: 0.78, language: "en" },
  { id: "amt-iom-2024", title: "AMT Industry Outlook Manufacturing 2024", publisher: "Association For Manufacturing Technology", year: 2024, topics: ["industry", "trends", "labor-rate", "machine-rate"], categories: ["cost-benchmark"], reliability_weight: 0.85, language: "en" },

  // Material properties
  { id: "asm-handbook-vol-2", title: "ASM Handbook Vol. 2 — Properties and Selection: Nonferrous Alloys", publisher: "ASM International", year: 2017, topics: ["aluminum", "copper", "nickel", "material", "yield"], categories: ["material-property"], reliability_weight: 0.97, language: "en" },
  { id: "asm-handbook-vol-1", title: "ASM Handbook Vol. 1 — Properties and Selection: Irons, Steels", publisher: "ASM International", year: 2018, topics: ["steel", "stainless", "iron", "carbon", "yield"], categories: ["material-property"], reliability_weight: 0.97, language: "en" },

  // Safety + fixture
  { id: "ansi-b11.1-2009", title: "ANSI B11.1 — Mechanical Power Presses Safety Requirements", publisher: "ANSI", year: 2009, topics: ["safety", "press", "guard"], categories: ["safety-standard"], reliability_weight: 1.0, language: "en" },
  { id: "tool-engineering-handbook-3e", title: "Tool Engineering and Design Handbook (SME, 3e)", publisher: "SME", year: 2003, topics: ["fixture", "tooling", "jig", "design"], categories: ["fixture-design"], reliability_weight: 0.92, language: "en" },

  // Surface finish
  { id: "schmaltz-surface-2018", title: "Surface Finish Metrology Tutorial (Schmaltz, BIPM)", publisher: "BIPM", year: 2018, topics: ["ra", "rz", "rsm", "surface", "metrology"], categories: ["surface-finish"], reliability_weight: 0.94, language: "multi" },
];

export interface CatalogQueryOptions {
  /** Free-form tokens — matched against topics + title (case-insensitive). */
  tokens?: string[];
  /** Restrict to specific categories. */
  categories?: SourceCategory[];
  /** Min reliability weight (0-1). Default 0.0 = include all. */
  minReliability?: number;
  /** Max records to return. Default 10. */
  limit?: number;
}

export interface CatalogQueryResult {
  ok: boolean;
  total_in_catalog: number;
  matched: number;
  returned: number;
  results: Array<ExternalSource & { _score: number }>;
  reason?: string;
}

const DEFAULT_LIMIT = 10;

export class OutsideKnowledgeSourceCatalogEngine {
  /** Total entries in the curated catalog. */
  getCatalogSize(): number { return CATALOG.length; }

  /** Returns all sources in a category (for browse UI). */
  byCategory(category: SourceCategory): ExternalSource[] {
    return CATALOG.filter((s) => s.categories.includes(category)).sort((a, b) => b.reliability_weight - a.reliability_weight);
  }

  /** Returns the full catalog (read-only). */
  list(): ExternalSource[] { return CATALOG.slice(); }

  /**
   * Query catalog by tokens + categories + reliability floor. Score = token match
   * count (in topics OR title) + reliability_weight. Ties broken by year DESC.
   */
  query(opts: CatalogQueryOptions = {}): CatalogQueryResult {
    const empty: CatalogQueryResult = { ok: false, total_in_catalog: CATALOG.length, matched: 0, returned: 0, results: [] };
    const tokens = (opts.tokens ?? []).map((t) => String(t).toLowerCase()).filter((t) => t.length > 0);
    const categories = opts.categories;
    const minReliability = typeof opts.minReliability === "number" ? opts.minReliability : 0;
    const limit = opts.limit ?? DEFAULT_LIMIT;

    if (tokens.length === 0 && !categories) {
      return { ...empty, reason: "must-provide-tokens-or-categories" };
    }

    const scored: Array<ExternalSource & { _score: number }> = [];
    for (const s of CATALOG) {
      if (s.reliability_weight < minReliability) continue;
      if (categories && !categories.some((c) => s.categories.includes(c))) continue;
      let tokenHits = 0;
      const haystack = (s.title + " " + s.topics.join(" ")).toLowerCase();
      for (const tok of tokens) if (haystack.includes(tok)) tokenHits++;
      // When category filter alone (no tokens), include all that pass it
      if (tokens.length === 0 || tokenHits > 0) {
        scored.push({ ...s, _score: tokenHits + s.reliability_weight });
      }
    }
    scored.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return b.year - a.year;
    });
    return {
      ok: true,
      total_in_catalog: CATALOG.length,
      matched: scored.length,
      returned: Math.min(scored.length, limit),
      results: scored.slice(0, limit),
    };
  }

  /** Citation block builder — formats top-N matches for inline reasoning prompts. */
  citationsFor(opts: CatalogQueryOptions): string {
    const r = this.query(opts);
    if (!r.ok || r.results.length === 0) return "(no matching sources in curated catalog)";
    return r.results.map((s, i) => {
      const cite = `[${i + 1}] ${s.publisher} — ${s.title}, ${s.year}${s.edition ? ` ed. ${s.edition}` : ""}${s.url ? ` <${s.url}>` : ""}`;
      return cite;
    }).join("\n");
  }
}

export const outsideKnowledgeSourceCatalogEngine = new OutsideKnowledgeSourceCatalogEngine();
