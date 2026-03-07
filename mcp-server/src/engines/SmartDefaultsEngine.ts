/**
 * SmartDefaultsEngine — Context-aware default parameter selection
 *
 * Provides intelligent defaults for common manufacturing parameters
 * based on material, operation type, and machine capabilities.
 * Eliminates the need to look up "typical" values from reference tables.
 *
 * Token savings: Reduces back-and-forth parameter clarification.
 *
 * @version 1.0.0
 */

export interface MachinDefaults {
  rpm: number;
  feed_ipm: number;
  doc_in: number;
  woc_in: number;
  coolant: string;
}

export interface MaterialDefaults {
  sfm: number;
  chipload_in: number;
  doc_factor: number;
  woc_factor: number;
  coolant: string;
}

// Default SFM by material × tool material
const SFM_DEFAULTS: Record<string, Record<string, number>> = {
  "6061":     { carbide: 800, hss: 300, ceramic: 0, diamond: 2000 },
  "7075":     { carbide: 600, hss: 200, ceramic: 0, diamond: 1500 },
  aluminum:   { carbide: 700, hss: 250, ceramic: 0, diamond: 1800 },
  "1018":     { carbide: 400, hss: 100, ceramic: 800, diamond: 0 },
  "4140":     { carbide: 350, hss: 80, ceramic: 700, diamond: 0 },
  "4340":     { carbide: 300, hss: 70, ceramic: 600, diamond: 0 },
  steel:      { carbide: 400, hss: 100, ceramic: 700, diamond: 0 },
  stainless:  { carbide: 250, hss: 60, ceramic: 500, diamond: 0 },
  "304":      { carbide: 250, hss: 60, ceramic: 500, diamond: 0 },
  "316":      { carbide: 200, hss: 50, ceramic: 450, diamond: 0 },
  titanium:   { carbide: 150, hss: 0, ceramic: 300, diamond: 0 },
  ti6al4v:    { carbide: 130, hss: 0, ceramic: 250, diamond: 0 },
  inconel:    { carbide: 80, hss: 0, ceramic: 200, diamond: 0 },
  brass:      { carbide: 600, hss: 200, ceramic: 0, diamond: 1200 },
  copper:     { carbide: 500, hss: 150, ceramic: 0, diamond: 1000 },
  plastic:    { carbide: 500, hss: 300, ceramic: 0, diamond: 800 },
  delrin:     { carbide: 600, hss: 400, ceramic: 0, diamond: 1000 },
};

// Default chip loads by tool diameter (inches) for carbide
const CHIPLOAD_DEFAULTS: Record<string, number> = {
  "0.125": 0.001, "0.1875": 0.0015, "0.25": 0.002,
  "0.375": 0.003, "0.5": 0.004, "0.625": 0.005,
  "0.75": 0.005, "1.0": 0.006,
};

export class SmartDefaultsEngine {

  /**
   * Get recommended defaults for a material + operation combination.
   */
  getDefaults(
    material: string,
    toolDiameter: number,
    flutes = 3,
    toolMaterial = "carbide",
    operation = "milling"
  ): MachinDefaults {
    const matKey = material.toLowerCase();
    const sfm = this.getSFM(matKey, toolMaterial);
    const chipload = this.getChipload(toolDiameter);
    const rpm = Math.round((sfm * 3.8197) / toolDiameter);
    const feed = Math.round(rpm * chipload * flutes * 100) / 100;
    const { doc, woc } = this.getEngagement(toolDiameter, matKey, operation);

    return {
      rpm,
      feed_ipm: feed,
      doc_in: doc,
      woc_in: woc,
      coolant: this.getCoolant(matKey),
    };
  }

  /**
   * Get SFM for a material and tool material combination.
   */
  getSFM(material: string, toolMaterial = "carbide"): number {
    const matKey = material.toLowerCase();
    const matDefaults = SFM_DEFAULTS[matKey] || SFM_DEFAULTS.steel;
    return matDefaults[toolMaterial] || matDefaults.carbide || 400;
  }

  /**
   * Get default chipload for a tool diameter.
   */
  getChipload(diameter: number): number {
    // Find closest diameter key
    const keys = Object.keys(CHIPLOAD_DEFAULTS).map(Number).sort((a, b) => a - b);
    let closest = keys[0];
    for (const k of keys) {
      if (Math.abs(k - diameter) < Math.abs(closest - diameter)) {
        closest = k;
      }
    }
    return CHIPLOAD_DEFAULTS[closest.toString()] || 0.003;
  }

  /**
   * Get default DOC and WOC as fraction of tool diameter.
   */
  getEngagement(
    diameter: number,
    material: string,
    operation = "milling"
  ): { doc: number; woc: number } {
    const matKey = material.toLowerCase();
    let docFactor = 1.0;
    let wocFactor = 0.5;

    // Adjust for material hardness
    if (["titanium", "ti6al4v", "inconel", "hastelloy"].includes(matKey)) {
      docFactor = 0.5;
      wocFactor = 0.25;
    } else if (["stainless", "304", "316", "4340"].includes(matKey)) {
      docFactor = 0.75;
      wocFactor = 0.35;
    } else if (["aluminum", "6061", "7075", "brass", "plastic", "delrin"].includes(matKey)) {
      docFactor = 1.5;
      wocFactor = 0.6;
    }

    // Adjust for operation
    if (operation === "finishing") {
      docFactor *= 0.2;
      wocFactor *= 0.3;
    } else if (operation === "roughing") {
      docFactor *= 1.2;
      wocFactor *= 0.8;
    } else if (operation === "slotting") {
      wocFactor = 1.0;
      docFactor *= 0.5;
    }

    return {
      doc: Math.round(diameter * docFactor * 1000) / 1000,
      woc: Math.round(diameter * wocFactor * 1000) / 1000,
    };
  }

  /**
   * Get default coolant recommendation.
   */
  getCoolant(material: string): string {
    const matKey = material.toLowerCase();
    if (["aluminum", "6061", "7075", "2024", "brass"].includes(matKey)) return "flood";
    if (["titanium", "ti6al4v", "inconel"].includes(matKey)) return "high-pressure flood";
    if (["plastic", "delrin", "nylon", "peek"].includes(matKey)) return "air blast";
    if (["cast_iron"].includes(matKey)) return "mist or dry";
    return "flood";
  }

  /**
   * List all supported materials.
   */
  listMaterials(): string[] {
    return Object.keys(SFM_DEFAULTS);
  }

  /**
   * Get a compact one-liner with defaults for quick reference.
   */
  oneLiner(material: string, diameter: number, flutes = 3): string {
    const d = this.getDefaults(material, diameter, flutes);
    return `${material} Ø${diameter}" ${flutes}fl: RPM=${d.rpm} F=${d.feed_ipm}ipm DOC=${d.doc_in}" WOC=${d.woc_in}" ${d.coolant}`;
  }
}

export const smartDefaultsEngine = new SmartDefaultsEngine();
