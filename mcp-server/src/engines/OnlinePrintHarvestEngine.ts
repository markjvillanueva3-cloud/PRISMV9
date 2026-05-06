// WIRE-EXEMPT: catalog-only surface; no network calls. Dispatcher integration
// is deferred until the user approves an actual downloader (license + rate-
// limit budget needs explicit sign-off before scraping public sources).
/**
 * OnlinePrintHarvestEngine — Public-domain blueprint + CAD harvest catalog.
 *
 * Curates the list of *legitimate* upstream sources PRISM can pull from to
 * grow the training corpus beyond local files: NASA Technical Reports Server
 * (NTRS), NIST publications, ASME open archives, university courseware with
 * CC licenses, GrabCAD CC0 set, GitHub repositories releasing STEP/IGES under
 * permissive licenses. Each source carries license metadata so consumers can
 * filter for what they're willing to redistribute.
 *
 * NETWORK SAFETY: This engine ONLY catalogs sources. It does NOT make HTTP
 * requests. A separate downloader (gated behind explicit user approval and a
 * rate-limit budget) is required to materialise any blueprint locally. The
 * catalog is organised so a future downloader is a thin wrapper that respects
 * each source's robots.txt + rate-limit + license terms.
 *
 * @engine OnlinePrintHarvestEngine
 * @milestone CAD-FUSION-LIVE-MS0
 */

import type { PartClass } from "./BlueprintVisionOCREngine.js";

// ── Types ──────────────────────────────────────────────────────────

/** License classes supported by the harvest catalog. */
export type LicenseClass =
  | "public_domain"
  | "us_gov_work"
  | "cc0"
  | "cc_by"
  | "cc_by_sa"
  | "cc_by_nc"
  | "mit"
  | "apache_2"
  | "gpl"
  | "fair_use_research_only"
  | "redistribution_prohibited";

export interface PrintSource {
  /** Stable identifier — kebab-case. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Primary URL — index page, search endpoint, or download root. */
  base_url: string;
  /** License class governing artifacts retrieved from this source. */
  license: LicenseClass;
  /** Domains the part classes from this source primarily cover. */
  domains: ReadonlyArray<PartClass | "general">;
  /** File formats commonly available. */
  formats: ReadonlyArray<"step" | "iges" | "stl" | "dxf" | "pdf" | "image">;
  /** Conservative rate-limit guidance (requests per minute) for any future downloader. */
  rate_limit_rpm: number;
  /** Whether the source needs an account / API key for bulk access. */
  requires_auth: boolean;
  /** Notes on how to use this source — citation requirements, redistribution rules. */
  notes: string;
}

export interface HarvestCatalog {
  schema_version: string;
  generated_at: string;
  total_sources: number;
  sources: PrintSource[];
}

export interface SourceFilter {
  license?: ReadonlyArray<LicenseClass>;
  domain?: ReadonlyArray<PartClass | "general">;
  format?: ReadonlyArray<PrintSource["formats"][number]>;
  /** Only sources that don't need login. */
  no_auth_only?: boolean;
}

// ── Catalog ────────────────────────────────────────────────────────

const SOURCES: ReadonlyArray<PrintSource> = [
  {
    id: "nasa-ntrs",
    name: "NASA Technical Reports Server (NTRS)",
    base_url: "https://ntrs.nasa.gov/search",
    license: "us_gov_work",
    domains: ["turbine_blade", "turbine_disk", "blisk", "impeller", "structural_frame", "bulkhead", "general"],
    formats: ["pdf", "image"],
    rate_limit_rpm: 30,
    requires_auth: false,
    notes: "US government works are public domain in the US. Cite as NASA-TM, NASA-CR, or NASA-TP. Contains thousands of aerospace structural and propulsion drawings + analysis reports.",
  },
  {
    id: "nist-publications",
    name: "NIST Publications",
    base_url: "https://www.nist.gov/publications",
    license: "us_gov_work",
    domains: ["general"],
    formats: ["pdf"],
    rate_limit_rpm: 30,
    requires_auth: false,
    notes: "Metrology + materials + manufacturing publications. Useful for tolerance and surface-finish standards data.",
  },
  {
    id: "grabcad-cc0",
    name: "GrabCAD Community Library (CC0 subset)",
    base_url: "https://grabcad.com/library",
    license: "cc0",
    domains: ["bracket", "fitting", "lug", "bushing", "shaft", "general"],
    formats: ["step", "iges", "stl"],
    rate_limit_rpm: 10,
    requires_auth: true,
    notes: "Filter to CC0 license only — most uploads are under various restrictions. ToS prohibits bulk download without permission.",
  },
  {
    id: "github-cad-public",
    name: "GitHub repositories (permissive-license CAD)",
    base_url: "https://api.github.com/search/code?q=extension:step+OR+extension:iges",
    license: "mit",
    domains: ["bracket", "general"],
    formats: ["step", "iges", "stl"],
    rate_limit_rpm: 30,
    requires_auth: true,
    notes: "Use GitHub API with auth token. Filter results by repo license. Many open-source hardware projects (e.g. Mr. Beam, Prusa) publish CAD under MIT/CC-BY.",
  },
  {
    id: "asme-open-archive",
    name: "ASME Conference Paper Open Archive",
    base_url: "https://asmedigitalcollection.asme.org",
    license: "fair_use_research_only",
    domains: ["turbine_blade", "impeller", "blisk", "engine_block", "valve_body", "general"],
    formats: ["pdf"],
    rate_limit_rpm: 10,
    requires_auth: false,
    notes: "Open-access subset only. Contains turbomachinery + mechanical design papers with detailed drawings. Strict redistribution rules — extract for analysis, do not republish.",
  },
  {
    id: "thingiverse-cc",
    name: "Thingiverse (CC-licensed designs)",
    base_url: "https://www.thingiverse.com",
    license: "cc_by",
    domains: ["bracket", "fitting", "general"],
    formats: ["stl", "step"],
    rate_limit_rpm: 20,
    requires_auth: false,
    notes: "Filter by license at search time. Most relevant for jigs, fixtures, brackets. Industrial parts are rare here.",
  },
  {
    id: "openscad-libraries",
    name: "OpenSCAD parametric library mirrors",
    base_url: "https://github.com/openscad/openscad",
    license: "gpl",
    domains: ["general"],
    formats: ["stl"],
    rate_limit_rpm: 30,
    requires_auth: false,
    notes: "GPL constraints apply — use only for ingestion/learning, never re-export commercially without GPL compliance.",
  },
  {
    id: "uiuc-airfoil-db",
    name: "UIUC Airfoil Coordinates Database",
    base_url: "https://m-selig.ae.illinois.edu/ads/coord_database.html",
    license: "fair_use_research_only",
    domains: ["turbine_blade", "turbine_vane", "blisk", "impeller"],
    formats: ["pdf"],
    rate_limit_rpm: 30,
    requires_auth: false,
    notes: "1500+ airfoil profile coordinate tables. Useful as ground-truth references for blade leading/trailing edge geometry.",
  },
  {
    id: "fda-510k-clearance",
    name: "FDA 510(k) Clearance Documents",
    base_url: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm",
    license: "us_gov_work",
    domains: ["medical_implant", "surgical_instrument", "bone_screw"],
    formats: ["pdf"],
    rate_limit_rpm: 10,
    requires_auth: false,
    notes: "Public 510(k) submissions sometimes contain redacted drawings + biocompatibility callouts. Strong source of medical device convention examples.",
  },
];

const CATALOG_SCHEMA_VERSION = "1.0.0";

// ── Engine ──────────────────────────────────────────────────────────

export class OnlinePrintHarvestEngine {
  /**
   * Get the full source catalog. Pure data — no network access.
   */
  catalog(): HarvestCatalog {
    return {
      schema_version: CATALOG_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      total_sources: SOURCES.length,
      sources: [...SOURCES],
    };
  }

  /**
   * Filter the catalog by license, domain, format, or auth requirement.
   *
   * Used by the (future) downloader to narrow to sources whose terms permit
   * the intended use case (e.g. only CC0 + public-domain when building a
   * redistributable training corpus).
   */
  filterSources(filter: SourceFilter): PrintSource[] {
    return SOURCES.filter((s) => {
      if (filter.license && filter.license.length > 0 && !filter.license.includes(s.license)) return false;
      if (filter.domain && filter.domain.length > 0) {
        const overlap = s.domains.some((d) => filter.domain!.includes(d));
        if (!overlap) return false;
      }
      if (filter.format && filter.format.length > 0) {
        const overlap = s.formats.some((f) => filter.format!.includes(f));
        if (!overlap) return false;
      }
      if (filter.no_auth_only && s.requires_auth) return false;
      return true;
    });
  }

  /**
   * Recommend sources for a target part class.
   *
   * Returns the catalog filtered to sources whose `domains` cover this class,
   * sorted by license permissiveness (public_domain/cc0/us_gov first).
   */
  recommendForClass(partClass: PartClass): PrintSource[] {
    const licenseRank: Record<LicenseClass, number> = {
      public_domain: 0,
      us_gov_work: 1,
      cc0: 2,
      mit: 3,
      apache_2: 4,
      cc_by: 5,
      cc_by_sa: 6,
      cc_by_nc: 7,
      gpl: 8,
      fair_use_research_only: 9,
      redistribution_prohibited: 10,
    };
    const matches = SOURCES.filter((s) => s.domains.includes(partClass));
    return [...matches].sort((a, b) => licenseRank[a.license] - licenseRank[b.license]);
  }

  /**
   * Returns true ONLY if the given filter set yields a corpus that's safe to
   * redistribute (i.e. all matching sources are public-domain or CC0).
   *
   * This is the gate the downloader checks before queueing any artifact for
   * inclusion in a redistributable training set.
   */
  canRedistribute(filter: SourceFilter): boolean {
    const sources = this.filterSources(filter);
    if (sources.length === 0) return false;
    const safeLicenses: LicenseClass[] = ["public_domain", "us_gov_work", "cc0"];
    return sources.every((s) => safeLicenses.includes(s.license));
  }

  /**
   * Total request-rate budget across the (filtered) source set, in requests
   * per minute. Lets the future downloader plan a polite crawl that respects
   * the slowest source's limit.
   */
  totalRateBudget(filter: SourceFilter = {}): { rpm: number; bottleneck_id: string } {
    const sources = this.filterSources(filter);
    if (sources.length === 0) return { rpm: 0, bottleneck_id: "" };
    let bottleneck = sources[0]!;
    for (const s of sources) {
      if (s.rate_limit_rpm < bottleneck.rate_limit_rpm) bottleneck = s;
    }
    return { rpm: bottleneck.rate_limit_rpm, bottleneck_id: bottleneck.id };
  }
}

export const onlinePrintHarvestEngine = new OnlinePrintHarvestEngine();
