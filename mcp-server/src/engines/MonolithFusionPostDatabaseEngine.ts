/**
 * MonolithFusionPostDatabaseEngine — U-DB-MONOLITH-FUSION-POST-LOADER
 *
 * TS-typed port of `PRISM_FUSION_POST_DATABASE.js` v8.9.400 from the v8.89
 * monolith extraction (`extracted_modules/databases/`). Carries 11 vendor
 * post-processor catalogs (153 posts total) used by Fusion 360 post emission:
 *
 *   Haas (53), Mazak (48), Siemens (11), Heidenhain (8), Fanuc (7),
 *   Hurco (6), Makino (6), DMG MORI (4), Brother (4), Doosan (3), Okuma (3)
 *
 * Each catalog carries:
 *   - vendor name + vendorUrl + controller string
 *   - postCount (number of posts available for that vendor)
 *   - models[] (machine families supported)
 *   - capabilities[] (milling/turning/mill-turn/5-axis/probing/robotics/...)
 *   - features{} (vendor-specific feature map with G-codes/M-codes/macros)
 *
 * Feature map examples preserved verbatim:
 *   - Haas G187 P1/P2/P3 (smoothing), G154 P1-P99 (extended WCS), G254/G255 (DWO),
 *     O9810/O9811/O9812 (Renishaw probing)
 *   - Mazak G17.4/G17.3 (Y-axis on lathes), M83/M84 (sub-spindle), G112/G113 (Integrex modes)
 *   - Siemens CYCLE800 (swivel), TRANSMIT/TRACYL/TRAORI, COMPON/COMPOF, FFWON
 *   - Fanuc G05.1 Q1 (AI Contour), G5.1 (Nano smoothing), G08 P1 (HPCC), G05.1 Q3 (AICC2)
 *   - Heidenhain PLANE SPATIAL, M128 (TCPM), CYCL DEF 19, DCM, AFC
 *   - Okuma G370/G371 (collision avoidance), G06.2 (Super-NURBS), Machining Navi
 *   - Makino G05.1 Q2 (SGI.5)
 *
 * Data-only engine. Wireable into the catalog bridge as a post-vendor surface
 * for quoting (machine_type → vendor's controller + capability set).
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-FUSION-POST-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted_modules/databases/PRISM_FUSION_POST_DATABASE.js v8.9.400
 */

export interface PostFeatureSpec {
  /** Primary G-code, e.g. "G187" or "G05.1 Q1". */
  code?: string;
  /** Multi-code feature, e.g. ["G254", "G255"] for Haas DWO. */
  codes?: string[];
  /** M-code (single), e.g. "M32" Haas chip conveyor. */
  mCode?: string;
  /** M-codes (multi), e.g. ["M83", "M84"] Mazak sub-spindle. */
  mCodes?: string[];
  /** Macro program number, e.g. "O9999". */
  macro?: string;
  /** Macro programs (multi), e.g. ["O9810", "O9811", "O9812"]. */
  macros?: string[];
  /** Feature mode list, e.g. ["Rough", "Medium", "Finish"] for Haas G187. */
  modes?: string[];
  /** Max RPM for spindle features. */
  maxRPM?: number;
  /** Tool-change time in seconds (Brother fastToolChange). */
  time?: number;
  /** Plain-text description. */
  desc: string;
}

export interface VendorPostCatalog {
  id: string;
  vendor: string;
  vendorUrl: string;
  controller: string;
  postCount: number;
  models: string[];
  capabilities: string[];
  features: Record<string, PostFeatureSpec>;
}

const VERSION = "8.9.400";

const CATALOG: Record<string, Omit<VendorPostCatalog, "id">> = {
  haas: {
    vendor: "Haas Automation",
    vendorUrl: "https://www.haascnc.com",
    controller: "Haas NGC / Pre-NGC",
    postCount: 53,
    models: ["VF", "DM", "Office Mill", "Mini Mill", "UMC-750", "VR Series", "ST Series", "DS Series", "EC Series", "GM2-5AX"],
    capabilities: ["milling", "turning", "5-axis", "probing"],
    features: {
      g187Smoothing: { code: "G187", modes: ["Rough", "Medium", "Finish"], desc: "Surface smoothing mode" },
      extendedWCS: { code: "G154 P1-P99", desc: "Extended work coordinate systems" },
      dwo: { codes: ["G254", "G255"], desc: "Dynamic Work Offset for 5-axis" },
      toolPreload: { code: "T", desc: "Preload next tool during machining" },
      chipConveyor: { mCode: "M32", desc: "Chip conveyor control" },
      toolBreakage: { macro: "O9999", desc: "Tool breakage detection" },
      probing: { macros: ["O9810", "O9811", "O9812"], desc: "Renishaw probing cycles" },
    },
  },
  mazak: {
    vendor: "Mazak",
    vendorUrl: "https://www.mazakusa.com",
    controller: "Mazatrol SmoothX/SmoothG",
    postCount: 48,
    models: ["Quick Turn 100-450", "QTU 200-350", "Integrex i-100 to i-400", "EZ Series", "VCN", "Variaxis"],
    capabilities: ["milling", "turning", "mill-turn", "5-axis"],
    features: {
      smoothTurning: { desc: "Smooth turning interpolation" },
      yAxis: { code: "G17.4/G17.3", desc: "Y-axis milling on lathes" },
      subSpindle: { mCodes: ["M83", "M84"], desc: "Sub-spindle control" },
      bAxis: { code: "B", desc: "B-axis indexing/interpolation" },
      cAxis: { code: "C", desc: "C-axis positioning" },
      integrexModes: { codes: ["G112", "G113"], desc: "Mill/turn mode switching" },
    },
  },
  siemens: {
    vendor: "Siemens",
    vendorUrl: "https://www.siemens.com/sinumerik",
    controller: "SINUMERIK",
    postCount: 11,
    models: ["802D", "808D", "810D", "828D", "840C", "840D", "SINUMERIK ONE"],
    capabilities: ["milling", "turning", "mill-turn", "5-axis"],
    features: {
      cycle800: { code: "CYCLE800", desc: "Swivel data cycle for 5-axis" },
      transmit: { code: "TRANSMIT", desc: "Transform milling on turning" },
      tracyl: { code: "TRACYL", desc: "Cylinder surface transformation" },
      traori: { code: "TRAORI", desc: "5-axis orientation transformation" },
      compressor: { code: "COMPON/COMPOF", desc: "Spline compressor" },
      lookAhead: { code: "FFWON", desc: "Feed forward look-ahead" },
    },
  },
  fanuc: {
    vendor: "Fanuc",
    vendorUrl: "https://www.fanuc.com",
    controller: "Fanuc 0i/30i/31i",
    postCount: 7,
    models: ["Generic", "Robodrill", "Compact", "Incremental"],
    capabilities: ["milling", "turning", "robotics"],
    features: {
      aiContour:     { code: "G05.1 Q1", desc: "AI Contour Control" },
      nanoSmoothing: { code: "G5.1",     desc: "Nano smoothing" },
      hpcc:          { code: "G08 P1",   desc: "High-precision contour control" },
      aicc2:         { code: "G05.1 Q3", desc: "AI Contour Control II" },
    },
  },
  heidenhain: {
    vendor: "Heidenhain",
    vendorUrl: "https://www.heidenhain.com",
    controller: "Heidenhain TNC",
    postCount: 8,
    models: ["TNC 145", "TNC 155", "TNC 407", "TNC 426", "TNC 530", "TNC 640", "TNC7"],
    capabilities: ["milling", "turning", "5-axis"],
    features: {
      planeSpatial: { code: "PLANE SPATIAL", desc: "5-axis plane definition" },
      tcpm:         { code: "M128",          desc: "Tool center point management" },
      cycle19:      { code: "CYCL DEF 19",   desc: "Working plane definition" },
      dcm:          { code: "DCM",           desc: "Dynamic Collision Monitoring" },
      afc:          { code: "AFC",           desc: "Adaptive Feed Control" },
    },
  },
  okuma: {
    vendor: "OKUMA",
    vendorUrl: "https://www.okuma.com",
    controller: "OSP-P300/P500",
    postCount: 3,
    models: ["LB3000", "LB4000", "Genos L", "Genos M", "Multus B", "M460V-5AX", "MU Series"],
    capabilities: ["milling", "turning", "mill-turn", "5-axis"],
    features: {
      collisionAvoidance: { code: "G370/G371", desc: "Collision avoidance system" },
      superNurbs:         { code: "G06.2",     desc: "Super-NURBS interpolation" },
      machiningNavi:      { desc: "Machining condition optimization" },
      navi5:              { desc: "5-axis auto tuning" },
    },
  },
  dmgMori: {
    vendor: "DMG MORI",
    vendorUrl: "https://www.dmgmori.com",
    controller: "CELOS/Fanuc/Siemens",
    postCount: 4,
    models: ["CMX", "NHX", "NLX", "DMU", "NTX"],
    capabilities: ["milling", "turning", "mill-turn", "5-axis"],
    features: {
      techCycles: { desc: "Technology cycles for operations" },
      mpc:        { desc: "Machine Protection Control" },
      hybrid:     { desc: "Additive/subtractive hybrid machining" },
    },
  },
  hurco: {
    vendor: "Hurco",
    vendorUrl: "https://www.hurco.com",
    controller: "WinMax/MAX5",
    postCount: 6,
    models: ["VM Series", "VMX Series", "TMX Series"],
    capabilities: ["milling", "turning", "3D"],
    features: {
      conversational: { desc: "Conversational programming mode" },
      ultimotion:     { desc: "UltiMotion motion control" },
      sweptSurface:   { desc: "Swept surface machining" },
      adaptiveFeed:   { desc: "Adaptive feedrate control" },
    },
  },
  makino: {
    vendor: "Makino",
    vendorUrl: "https://www.makino.com",
    controller: "Professional 6",
    postCount: 6,
    models: ["A500Z", "D200Z", "D300", "D500", "Slim3n", "PS Series"],
    capabilities: ["milling", "5-axis", "high-speed"],
    features: {
      sgi5:           { code: "G05.1 Q2", desc: "SGI.5 super geometric intelligence" },
      motionNav:      { desc: "Motion navigation system" },
      hsm:            { desc: "High-speed machining optimization" },
      inertiaControl: { desc: "Inertia active control" },
    },
  },
  brother: {
    vendor: "Brother",
    vendorUrl: "https://www.brother.com",
    controller: "CNC-C00",
    postCount: 4,
    models: ["SPEEDIO S300X2", "SPEEDIO S500X2", "SPEEDIO S700X2", "SPEEDIO W1000Xd2"],
    capabilities: ["milling", "tapping", "multi-tasking"],
    features: {
      rapidSpindle:    { maxRPM: 16000, desc: "High-speed spindle" },
      fastToolChange:  { time: 0.9,     desc: "0.9 second tool change" },
      inspection:      { desc: "In-process inspection probing" },
      multiTasking:    { desc: "Simultaneous multi-axis control" },
    },
  },
  doosan: {
    vendor: "DN Solutions (Doosan)",
    vendorUrl: "https://www.dn-solutions.com",
    controller: "Fanuc/Doosan",
    postCount: 3,
    models: ["DNM", "DVF", "Puma", "Lynx"],
    capabilities: ["milling", "turning"],
    features: {
      hsm:            { desc: "High-speed machining" },
      builtInSpindle: { desc: "Built-in spindle motor" },
    },
  },
};

export class MonolithFusionPostDatabaseEngine {
  get version(): string { return VERSION; }

  listVendors(): VendorPostCatalog[] {
    return Object.entries(CATALOG).map(([id, c]) => ({
      id,
      ...c,
      models: [...c.models],
      capabilities: [...c.capabilities],
      features: { ...c.features },
    }));
  }

  /** Total posts across all vendor catalogs (sum of postCount fields). */
  totalPostCount(): number {
    return Object.values(CATALOG).reduce((sum, c) => sum + c.postCount, 0);
  }

  getVendor(id: string): VendorPostCatalog | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const c = CATALOG[id];
    if (!c) return null;
    return {
      id,
      ...c,
      models: [...c.models],
      capabilities: [...c.capabilities],
      features: { ...c.features },
    };
  }

  listByCapability(capability: string): VendorPostCatalog[] {
    if (typeof capability !== "string" || capability.trim() === "") return [];
    const want = capability.trim().toLowerCase();
    return this.listVendors().filter((c) =>
      c.capabilities.some((cap) => cap.toLowerCase() === want),
    );
  }

  /**
   * Find vendors whose model list contains the given model name (partial,
   * case-insensitive). Useful for "what's the post for this Haas VF-2?".
   */
  findByModel(modelName: string): VendorPostCatalog[] {
    if (typeof modelName !== "string" || modelName.trim() === "") return [];
    const want = modelName.trim().toLowerCase();
    return this.listVendors().filter((c) =>
      c.models.some((m) => m.toLowerCase().includes(want)),
    );
  }

  search(query: string, limit = 20): VendorPostCatalog[] {
    if (typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    if (!Number.isInteger(limit) || limit <= 0) return [];

    const hits: VendorPostCatalog[] = [];
    for (const c of this.listVendors()) {
      const hay = `${c.id} ${c.vendor} ${c.controller} ${c.capabilities.join(" ")} ${c.models.join(" ")}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push(c);
        if (hits.length >= limit) return hits;
      }
    }
    return hits;
  }

  stats(): {
    version: string;
    vendorCount: number;
    totalPostCount: number;
    byCapability: Record<string, number>;
  } {
    const byCap: Record<string, number> = {};
    for (const c of Object.values(CATALOG)) {
      for (const cap of c.capabilities) {
        byCap[cap] = (byCap[cap] ?? 0) + 1;
      }
    }
    return {
      version: VERSION,
      vendorCount: Object.keys(CATALOG).length,
      totalPostCount: this.totalPostCount(),
      byCapability: byCap,
    };
  }
}

export const monolithFusionPostDatabaseEngine = new MonolithFusionPostDatabaseEngine();
