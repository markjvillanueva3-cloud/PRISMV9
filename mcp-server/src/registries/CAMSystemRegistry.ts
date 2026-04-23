/**
 * CAM System Registry — canonical slug + metadata for every CAM system
 * =====================================================================
 *
 * Single source of truth for CAM system identifiers used across:
 *   - data/cam-functions/<slug>/*.json
 *   - data/cam-ui/<slug>/*.json
 *   - CAMCatalogLoaderEngine
 *   - dispatcher z.enum values
 *
 * Fixes naming drift: InventorCAM (SolidCAM partner plugin) ≠ Inventor HSM
 * (Autodesk's built-in CAM). These are separate products and have separate slugs.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 F3/F4 fix.
 */

export type CAMTier = 1 | 2 | 3;

export interface CAMSystemMeta {
  /** Canonical slug — lowercase, kebab-case, used in filesystem paths */
  slug: string;
  /** Display name */
  name: string;
  /** Vendor */
  vendor: string;
  /** Latest version PRISM targets */
  version?: string;
  /** Priority tier — 1 = must-have, 2 = secondary, 3 = extended */
  tier: CAMTier;
  /** Plugin adapter protocol (if a plugin is shipped) */
  adapter_protocol?: "xml-rpc-com" | "json-rpc-ws" | "com-ilogic" | "com-sw" | "net-hook" | "cpp-sdk";
  /** Directory name under data/cam-functions/ */
  functions_dir: string;
  /** Directory name under data/cam-ui/ */
  ui_dir: string;
}

/**
 * Canonical registry. Adding a new system requires an entry here; any catalog
 * file under a directory whose basename is not in this list will be rejected
 * by CAMCatalogLoaderEngine.
 */
export const CAM_SYSTEM_REGISTRY: Record<string, CAMSystemMeta> = {
  // ── TIER 1 — priority-5 (full UI + parameter + action mapping) ──
  mastercam: {
    slug: "mastercam",
    name: "Mastercam",
    vendor: "CNC Software",
    version: "X8+",
    tier: 1,
    adapter_protocol: "net-hook",
    functions_dir: "mastercam",
    ui_dir: "mastercam",
  },
  hypermill: {
    slug: "hypermill",
    name: "hyperMILL",
    vendor: "OPEN MIND Technologies",
    version: "2024",
    tier: 1,
    adapter_protocol: "xml-rpc-com",
    functions_dir: "hypermill",
    ui_dir: "hypermill",
  },
  fusion360: {
    slug: "fusion360",
    name: "Fusion 360 CAM",
    vendor: "Autodesk",
    tier: 1,
    adapter_protocol: "json-rpc-ws",
    functions_dir: "fusion360",
    ui_dir: "fusion360",
  },
  "inventor-hsm": {
    slug: "inventor-hsm",
    name: "Inventor HSM",
    vendor: "Autodesk",
    tier: 1,
    adapter_protocol: "com-ilogic",
    functions_dir: "inventor-hsm",
    ui_dir: "inventor-hsm",
  },
  solidcam: {
    slug: "solidcam",
    name: "SolidCAM",
    vendor: "SolidCAM Ltd.",
    tier: 1, // promoted from Tier-2 per user priority-5 (F2)
    // U-CAM-R3-01 fix 2026-04-21: SolidCAM is a SolidWorks add-in using SolidWorks COM API
    // (port 18363 via SolidCAMSolidWorksBridgeEngine). iLogic is Inventor-specific.
    adapter_protocol: "com-sw",
    functions_dir: "solidcam",
    ui_dir: "solidcam",
  },

  // ── TIER 2 — secondary coverage ──
  "nx-cam": {
    slug: "nx-cam",
    name: "NX CAM",
    vendor: "Siemens",
    tier: 2,
    functions_dir: "nx-cam",
    ui_dir: "nx-cam",
  },
  powermill: {
    slug: "powermill",
    name: "PowerMill",
    vendor: "Autodesk",
    tier: 2,
    functions_dir: "powermill",
    ui_dir: "powermill",
  },
  "catia-machining": {
    slug: "catia-machining",
    name: "CATIA Machining",
    vendor: "Dassault Systèmes",
    tier: 2,
    functions_dir: "catia-machining",
    ui_dir: "catia-machining",
  },

  // ── TIER 3 — extended (tips + function-index only, no live plugin) ──
  inventorcam: {
    slug: "inventorcam",
    name: "InventorCAM",
    vendor: "SolidCAM Ltd. (for Autodesk Inventor)",
    tier: 3,
    functions_dir: "inventorcam",
    ui_dir: "inventorcam",
  },
  gibbscam: {
    slug: "gibbscam",
    name: "GibbsCAM",
    vendor: "CAMBRIO (Sandvik)",
    tier: 3,
    functions_dir: "gibbscam",
    ui_dir: "gibbscam",
  },
  esprit: {
    slug: "esprit",
    name: "ESPRIT",
    vendor: "DP Technology (Hexagon)",
    tier: 3,
    functions_dir: "esprit",
    ui_dir: "esprit",
  },
  surfcam: {
    slug: "surfcam",
    name: "SURFCAM",
    vendor: "Hexagon",
    tier: 3,
    functions_dir: "surfcam",
    ui_dir: "surfcam",
  },
  "bobcad-cam": {
    slug: "bobcad-cam",
    name: "BobCAD-CAM",
    vendor: "BobCAD-CAM Inc.",
    tier: 3,
    functions_dir: "bobcad-cam",
    ui_dir: "bobcad-cam",
  },
  featurecam: {
    slug: "featurecam",
    name: "FeatureCAM",
    vendor: "Autodesk",
    tier: 3,
    functions_dir: "featurecam",
    ui_dir: "featurecam",
  },
  tebis: {
    slug: "tebis",
    name: "Tebis",
    vendor: "Tebis AG",
    tier: 3,
    functions_dir: "tebis",
    ui_dir: "tebis",
  },
  wornc: {
    slug: "wornc",
    name: "WorkNC",
    vendor: "Hexagon",
    tier: 3,
    functions_dir: "wornc",
    ui_dir: "wornc",
  },
  cimatron: {
    slug: "cimatron",
    name: "Cimatron",
    vendor: "3D Systems",
    tier: 3,
    functions_dir: "cimatron",
    ui_dir: "cimatron",
  },
  sprutcam: {
    slug: "sprutcam",
    name: "SprutCAM",
    vendor: "SprutCAM Tech",
    tier: 3,
    functions_dir: "sprutcam",
    ui_dir: "sprutcam",
  },
  alphacam: {
    slug: "alphacam",
    name: "Alphacam",
    vendor: "Hexagon",
    tier: 3,
    functions_dir: "alphacam",
    ui_dir: "alphacam",
  },
};

/** All canonical slugs */
export const CAM_SLUGS: ReadonlyArray<string> = Object.keys(CAM_SYSTEM_REGISTRY);

/** Priority-5 slugs (Tier-1) */
export const PRIORITY_5_SLUGS: ReadonlyArray<string> = CAM_SLUGS.filter(
  (s) => CAM_SYSTEM_REGISTRY[s].tier === 1
);

/** Lookup with error message listing valid alternatives */
export function getCAMSystem(slug: string): CAMSystemMeta {
  const sys = CAM_SYSTEM_REGISTRY[slug];
  if (!sys) {
    throw new Error(
      `Unknown CAM system slug: "${slug}". Valid slugs: ${CAM_SLUGS.join(", ")}`
    );
  }
  return sys;
}

/** True if slug is canonical */
export function isCAMSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(CAM_SYSTEM_REGISTRY, slug);
}

/** Get all systems in a tier */
export function getCAMSystemsByTier(tier: CAMTier): CAMSystemMeta[] {
  return CAM_SLUGS.map((s) => CAM_SYSTEM_REGISTRY[s]).filter((m) => m.tier === tier);
}
