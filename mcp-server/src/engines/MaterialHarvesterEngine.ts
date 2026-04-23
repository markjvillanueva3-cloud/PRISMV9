/**
 * MaterialHarvesterEngine — Extracts materials from SolidWorks .sldmat files
 *
 * Parses the 3 UTF-16 encoded XML material library files shipped with SolidWorks:
 *   - solidworks materials.sldmat (260 materials, AISI/SAE designations)
 *   - SolidWorks DIN Materials.sldmat (207 materials, DIN/EN designations)
 *   - sustainability extras.sldmat (8 materials, building/electronics)
 *
 * Each file contains <classification name="..."> groups with <material> elements
 * carrying <physicalproperties> child tags (EX, NUXY, GXY, ALPX, DENS, KX, C,
 * SIGXT, SIGYLD, RK) and optional <custom> Financial Impact cost data.
 *
 * Reference: SolidWorks 2016 material library format (UTF-16LE XML).
 *
 * @module engines/MaterialHarvesterEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Physical and financial properties of a single harvested material. */
export interface MaterialProperties {
  /** Elastic (Young's) modulus in GPa. Converted from Pa in source. */
  elasticModulusGPa: number | null;
  /** Poisson's ratio (dimensionless, typically 0.2-0.5). */
  poissonRatio: number | null;
  /** Shear modulus in GPa. Converted from Pa in source. */
  shearModulusGPa: number | null;
  /** Coefficient of thermal expansion in 1/K. */
  thermalExpansion: number | null;
  /** Mass density in kg/m^3. */
  densityKgM3: number | null;
  /** Thermal conductivity in W/(m*K). */
  thermalConductivity: number | null;
  /** Specific heat capacity in J/(kg*K). */
  specificHeat: number | null;
  /** Ultimate tensile strength in MPa. Converted from Pa in source. */
  tensileStrengthMPa: number | null;
  /** 0.2% offset yield strength in MPa. Converted from Pa in source. */
  yieldStrengthMPa: number | null;
  /** Hardening factor (0=isotropic, 1=kinematic). */
  hardeningFactor: number | null;
  /** Cost per kilogram in USD/kg, from Financial Impact custom property. */
  costPerKg: number | null;
}

/** A single material extracted from a .sldmat file. */
export interface HarvestedMaterial {
  /** Material display name (e.g., "1023 Carbon Steel Sheet (SS)"). */
  name: string;
  /** Material ID attribute from the XML. */
  matId: string;
  /** Classification group (e.g., "Steel", "DIN Aluminum Alloys"). */
  classification: string;
  /** Source filename. */
  sourceFile: string;
  /** Extracted physical and financial properties. */
  properties: MaterialProperties;
}

/** Result of a full harvest across all .sldmat files. */
export interface MaterialHarvestResult {
  /** Total materials extracted. */
  totalMaterials: number;
  /** Breakdown by source file. */
  byFile: Record<string, number>;
  /** Breakdown by classification. */
  byClassification: Record<string, number>;
  /** All extracted materials. */
  materials: HarvestedMaterial[];
  /** ISO timestamp of harvest. */
  timestamp: string;
}

// ============================================================================
// SOURCE FILES
// ============================================================================

const SLDMAT_ROOT =
  "H:/prism/resources/SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS/lang/english/sldmaterials";

const SOURCE_FILES = [
  { filename: "solidworks materials.sldmat", expectedMin: 200 },
  { filename: "SolidWorks DIN Materials.sldmat", expectedMin: 150 },
  { filename: "sustainability extras.sldmat", expectedMin: 5 },
] as const;

// ============================================================================
// XML PROPERTY EXTRACTION HELPERS
// ============================================================================

/**
 * Extract a numeric attribute value from an XML property tag.
 * Matches patterns like: <TAG displayname="..." value="123.456" />
 *
 * @param block - XML text block to search within
 * @param tag - XML element name (e.g., "EX", "DENS")
 * @returns Parsed numeric value, or null if tag not found or unparseable
 */
function extractProperty(block: string, tag: string): number | null {
  const regex = new RegExp(`<${tag}\\s[^>]*value="([^"]*)"`, "i");
  const match = block.match(regex);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return isNaN(val) ? null : val;
}

/**
 * Extract the Financial Impact custom property (USD/kg).
 * Matches: <prop name="Financial Impact" ... value="0.436" units="USD/kg" />
 *
 * @param block - XML text block containing the <custom> section
 * @returns Cost in USD/kg, or null if not present
 */
function extractCostPerKg(block: string): number | null {
  const match = block.match(
    /<prop\s+name="Financial Impact"[^>]*value="([^"]*)"[^>]*units="USD\/kg"/i
  );
  if (!match) return null;
  const val = parseFloat(match[1]);
  return isNaN(val) ? null : val;
}

/**
 * Parse all physical properties from a <material>...</material> block.
 *
 * Unit conversions applied:
 *   - EX, GXY: Pa -> GPa (divide by 1e9)
 *   - SIGXT, SIGYLD: Pa -> MPa (divide by 1e6)
 *   - All others: used as-is from source
 *
 * @param block - Full XML text of a single material element
 * @returns Structured material properties
 */
function parseProperties(block: string): MaterialProperties {
  const exPa = extractProperty(block, "EX");
  const gxyPa = extractProperty(block, "GXY");
  const sigxtPa = extractProperty(block, "SIGXT");
  const sigyldPa = extractProperty(block, "SIGYLD");

  return {
    elasticModulusGPa: exPa !== null ? exPa / 1e9 : null,
    poissonRatio: extractProperty(block, "NUXY"),
    shearModulusGPa: gxyPa !== null ? gxyPa / 1e9 : null,
    thermalExpansion: extractProperty(block, "ALPX"),
    densityKgM3: extractProperty(block, "DENS"),
    thermalConductivity: extractProperty(block, "KX"),
    specificHeat: extractProperty(block, "C"),
    tensileStrengthMPa: sigxtPa !== null ? sigxtPa / 1e6 : null,
    yieldStrengthMPa: sigyldPa !== null ? sigyldPa / 1e6 : null,
    hardeningFactor: extractProperty(block, "RK"),
    costPerKg: extractCostPerKg(block),
  };
}

// ============================================================================
// MATERIAL BLOCK EXTRACTION
// ============================================================================

/**
 * Extract all materials from a single .sldmat file's XML content.
 *
 * Strategy: iterate through <classification name="..."> blocks, then within
 * each classification find all <material name="..." matid="..."> blocks.
 * Uses regex to split on classification boundaries, then regex per material.
 *
 * @param content - Full XML text (already decoded from UTF-16)
 * @param sourceFile - Filename for provenance tracking
 * @returns Array of harvested materials
 */
function extractMaterials(
  content: string,
  sourceFile: string
): HarvestedMaterial[] {
  const materials: HarvestedMaterial[] = [];

  // Split on classification boundaries.
  // Each classification block starts with <classification name="..."> and ends
  // at the next </classification> or <classification>.
  const classRegex =
    /<classification\s+name="([^"]*)">([\s\S]*?)(?:<\/classification>)/gi;
  let classMatch: RegExpExecArray | null;

  while ((classMatch = classRegex.exec(content)) !== null) {
    const classification = classMatch[1];
    const classBlock = classMatch[2];

    // Find each <material ...>...</material> within the classification block.
    // Material blocks can be quite large (stress-strain curves, shaders, etc.)
    // so we match from <material to the closing </material>.
    // Note: matid is optional — sustainability extras file omits it.
    const matRegex =
      /<material\s+name="([^"]*)"([^>]*)>([\s\S]*?)<\/material>/gi;
    let matMatch: RegExpExecArray | null;

    while ((matMatch = matRegex.exec(classBlock)) !== null) {
      const name = matMatch[1];
      const attrs = matMatch[2];
      const matBlock = matMatch[3];

      // Extract matid from remaining attributes if present
      const matIdMatch = attrs.match(/matid="([^"]*)"/);
      const matId = matIdMatch ? matIdMatch[1] : "";

      materials.push({
        name,
        matId,
        classification,
        sourceFile,
        properties: parseProperties(matBlock),
      });
    }
  }

  return materials;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * MaterialHarvesterEngine — Extracts material data from SolidWorks .sldmat libraries.
 *
 * Provides static methods for harvesting, querying, and summarizing the
 * 475 materials across the 3 standard SolidWorks material library files.
 */
class MaterialHarvesterEngineImpl {
  /**
   * Harvest all materials from the 3 .sldmat files.
   * Reads each file as UTF-16LE, strips BOM, parses XML via regex,
   * and returns structured material data with unit-converted properties.
   *
   * @returns Harvest result with all materials and summary statistics
   */
  static async harvest(): Promise<MaterialHarvestResult> {
    const { readFile } = await import("fs/promises");
    const allMaterials: HarvestedMaterial[] = [];
    const byFile: Record<string, number> = {};
    const byClassification: Record<string, number> = {};

    for (const src of SOURCE_FILES) {
      const filePath = `${SLDMAT_ROOT}/${src.filename}`;
      try {
        const buffer = await readFile(filePath);
        // .sldmat files are UTF-16LE with BOM (0xFF 0xFE).
        // Decode to string, then strip BOM character if present.
        let content = buffer.toString("utf16le");
        if (content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
        }

        const materials = extractMaterials(content, src.filename);
        allMaterials.push(...materials);
        byFile[src.filename] = materials.length;

        log.info(
          `MaterialHarvester: extracted ${materials.length} materials from ${src.filename}`
        );
      } catch (err) {
        log.error(
          `MaterialHarvester: failed to read ${src.filename}: ${err}`
        );
        byFile[src.filename] = 0;
      }
    }

    // Tally by classification
    for (const m of allMaterials) {
      byClassification[m.classification] =
        (byClassification[m.classification] || 0) + 1;
    }

    return {
      totalMaterials: allMaterials.length,
      byFile,
      byClassification,
      materials: allMaterials,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * List the source .sldmat files without reading them.
   *
   * @returns Source file metadata and root path
   */
  static getSources(): {
    files: Array<{ filename: string; expectedMin: number }>;
    rootPath: string;
  } {
    return {
      files: SOURCE_FILES.map((f) => ({
        filename: f.filename,
        expectedMin: f.expectedMin,
      })),
      rootPath: SLDMAT_ROOT,
    };
  }

  /**
   * Find a specific material by name (case-insensitive substring match).
   *
   * @param materials - Pre-harvested materials array
   * @param query - Search string to match against material names
   * @returns Matching materials
   */
  static findByName(
    materials: HarvestedMaterial[],
    query: string
  ): HarvestedMaterial[] {
    const q = query.toLowerCase();
    return materials.filter((m) => m.name.toLowerCase().includes(q));
  }

  /**
   * Filter materials by classification (case-insensitive substring match).
   *
   * @param materials - Pre-harvested materials array
   * @param classification - Classification to match
   * @returns Materials in that classification
   */
  static filterByClassification(
    materials: HarvestedMaterial[],
    classification: string
  ): HarvestedMaterial[] {
    const q = classification.toLowerCase();
    return materials.filter((m) =>
      m.classification.toLowerCase().includes(q)
    );
  }

  /**
   * Lightweight audit: harvest and return summary statistics only.
   *
   * @returns Summary with counts, classifications, and property coverage
   */
  static async audit(): Promise<{
    totalHarvested: number;
    byFile: Record<string, number>;
    byClassification: Record<string, number>;
    withCost: number;
    withTensile: number;
    withDensity: number;
    classifications: string[];
  }> {
    const result = await MaterialHarvesterEngineImpl.harvest();
    return {
      totalHarvested: result.totalMaterials,
      byFile: result.byFile,
      byClassification: result.byClassification,
      withCost: result.materials.filter(
        (m) => m.properties.costPerKg !== null
      ).length,
      withTensile: result.materials.filter(
        (m) => m.properties.tensileStrengthMPa !== null
      ).length,
      withDensity: result.materials.filter(
        (m) => m.properties.densityKgM3 !== null
      ).length,
      classifications: Object.keys(result.byClassification).sort(),
    };
  }
}

export { MaterialHarvesterEngineImpl as MaterialHarvesterEngine };
export const materialHarvesterEngine =
  new (MaterialHarvesterEngineImpl as unknown as { new (): MaterialHarvesterEngineImpl })();
