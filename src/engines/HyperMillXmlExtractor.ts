/**
 * HyperMillXmlExtractor — Parse Feature2Job XML catalogs + PostProcessor config
 *
 * HM-KC-MS0 / U-HKC05: Extracts structured data from all omFeature2JobCatalog*.xml
 * files (11 files covering 2D/3D/5X/Drill/Turn/UDF/Blade/Impeller/etc.) and the
 * omPPFC.cfg post-processor check configuration.
 *
 * Part 1 — Feature2JobExtractor:
 *   Reads all omFeature2JobCatalog*.xml files and extracts:
 *   - Feature2Job_Group definitions (ID + Name)
 *   - Feature2Job_Definition entries (Feature_Type → Job_Type with items + variables)
 *   - Feature2Job_Item parameters and expressions
 *   - Feature2Job_Variable / Feature2Job_Variable_rem (active vs commented-out)
 *
 * Part 2 — PostConfigExtractor:
 *   Reads omPPFC.cfg and extracts NC-code → description check entries.
 *   Format: "  *code   ncCode,description"
 *
 * XML parsing: regex/string-based (no external XML library). The hyperMILL XML files
 * are strictly formatted with one element per line, making regex extraction safe and
 * fast for files of this size.
 *
 * @engine HyperMillXmlExtractor
 * @shortcode E1195
 * @dispatcher camDispatcher
 * @actions hypermill_extract_feature2job, hypermill_extract_post_config
 * @milestone HM-KC-MS0/U-HKC05
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

// ── Public Interfaces ─────────────────────────────────────────────────────────

export interface FeatureJobItem {
  /** ID attribute on the element (may be numeric or string like "TS_1") */
  id: string;
  /** Name attribute, e.g. "GeoHole|Geometry of hole" */
  name: string;
  /** Type attribute, e.g. "ContourAsPointWithDepth", "Curve", "Associate" */
  type: string;
  /** Job_Parameter attribute, e.g. "Contour" */
  jobParameter: string;
  /** Expression attribute, e.g. "Point=Position;Depth=Depth;Diameter=Diameter" */
  expression: string;
  /** Active="1" means active, "0" means inactive */
  active: boolean;
}

export interface FeatureJobVariable {
  /** Name attribute, e.g. "FeatDiameter" */
  name: string;
  /** Type attribute, e.g. "Real" */
  type: string;
  /** Expression attribute, e.g. "Value=Diameter" */
  expression: string;
  /**
   * true when parsed from Feature2Job_Variable_rem (commented-out/disabled variant),
   * false when parsed from Feature2Job_Variable (active).
   */
  isRem: boolean;
}

export interface FeatureJobMapping {
  /** Feature_Type attribute, e.g. "Simple_Hole", "Generic_Turning_Feature" */
  featureType: string;
  /** Job_Group attribute, e.g. "2D", "DRILL", "TURN" */
  jobGroup: string;
  /** Job_Name attribute, e.g. "Dril|2D Drilling" */
  jobName: string;
  /** Job_Type attribute, e.g. "DRIL", "DcenX5" */
  jobType: string;
  /** Optional Feature_Catalog override attribute (usually "openmind") */
  featureCatalog: string;
  items: FeatureJobItem[];
  variables: FeatureJobVariable[];
}

export interface JobGroup {
  /** ID attribute, e.g. "2D", "PROBING", "DRILL" */
  id: string;
  /** Name attribute (may include pipe-separated key|label), e.g. "Grp2D|2D-Cycles" */
  name: string;
}

export interface Feature2JobCatalog {
  /** Catalog Name attribute (usually "openmind") */
  catalogName: string;
  groups: JobGroup[];
  mappings: FeatureJobMapping[];
  /** Base filename only, e.g. "omFeature2JobCatalog.xml" */
  sourceFile: string;
}

export interface PostConfigEntry {
  /** Code identifier including leading asterisk, e.g. "*cwArcZ" */
  code: string;
  /** NC code number as string, e.g. "702" */
  ncCode: string;
  /** Human-readable description, e.g. "helix or arc with z" */
  description: string;
}

export interface XmlExtractionResult {
  catalogs: Feature2JobCatalog[];
  postConfig: PostConfigEntry[];
  totalMappings: number;
  totalItems: number;
  totalCatalogs: number;
  /** ISO 8601 timestamp */
  extractedAt: string;
  /** Any non-fatal errors encountered during parsing */
  errors: string[];
}

// ── Regex Patterns ────────────────────────────────────────────────────────────

/**
 * Extracts the value of an XML attribute from an element start tag.
 * Handles both single and double quoted values.
 *
 * Usage: attrRe("Name").exec(line) → match[1] = attribute value
 */
function attrRe(attr: string): RegExp {
  return new RegExp(`${attr}=["']([^"']+)["']`);
}

/**
 * Matches a Feature2Job_Catalog opening tag and captures the Name attribute.
 * Example: <Feature2Job_Catalog Name="openmind">
 */
const CATALOG_RE = /<Feature2Job_Catalog\b[^>]*Name=["']([^"']+)["']/;

/**
 * Matches a Feature2Job_Group tag and captures ID and Name.
 * Example: <Feature2Job_Group ID="2D" Name="Grp2D|2D-Cycles">
 */
const GROUP_ID_RE = attrRe("ID");
const GROUP_NAME_RE = attrRe("Name");

/**
 * Matches a Feature2Job_Definition opening tag.
 */
const DEFINITION_RE = /^\s*<Feature2Job_Definition\b/;

/**
 * Matches a Feature2Job_Item opening tag (not _Attribute or _Attribute_rem).
 * Excludes closing tags.
 */
const ITEM_RE = /^\s*<Feature2Job_Item\b(?!_)/;

/**
 * Matches Feature2Job_Variable (active) opening tag.
 */
const VARIABLE_RE = /^\s*<Feature2Job_Variable\s/;

/**
 * Matches Feature2Job_Variable_rem (commented-out) opening tag.
 */
const VARIABLE_REM_RE = /^\s*<Feature2Job_Variable_rem\b/;

/**
 * Matches the closing tag for Feature2Job_Definition.
 */
const DEFINITION_CLOSE_RE = /^\s*<\/Feature2Job_Definition>/;

/**
 * Matches a PostConfig entry line.
 * Format: "  *code   ncCode,description"
 * Captures: group1=code (without *), group2=ncCode, group3=description
 */
const POSTCONFIG_RE = /^\s+\*(\S+)\s+(\d+),(.+)$/;

// ── Attribute Extractors ──────────────────────────────────────────────────────

function extractAttr(line: string, re: RegExp): string {
  const m = re.exec(line);
  return m ? m[1].trim() : "";
}

function extractNamedAttr(line: string, attrName: string): string {
  return extractAttr(line, attrRe(attrName));
}

// ── Feature2JobExtractor ──────────────────────────────────────────────────────

export class Feature2JobExtractor {
  private readonly catalogDir: string;

  /**
   * @param catalogDir - Directory containing all omFeature2JobCatalog*.xml files.
   */
  constructor(
    catalogDir = "H:/prism/HYPERMILL/hyperMILL/33.0/feattech"
  ) {
    this.catalogDir = catalogDir;
  }

  /**
   * Discover all omFeature2JobCatalog*.xml files in the catalog directory.
   *
   * @returns Sorted list of absolute file paths.
   */
  async discoverFiles(): Promise<string[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(this.catalogDir);
    } catch (err) {
      throw new Error(
        `Feature2JobExtractor: cannot read directory "${this.catalogDir}": ${String(err)}`
      );
    }

    const xmlFiles = entries
      .filter((f) => f.startsWith("omFeature2JobCatalog") && f.endsWith(".xml"))
      .sort()
      .map((f) => path.join(this.catalogDir, f));

    return xmlFiles;
  }

  /**
   * Parse a single Feature2Job XML file into a Feature2JobCatalog.
   *
   * Missing files are handled gracefully — the method returns null and records
   * the error in the caller's error list rather than throwing.
   *
   * @param filePath - Absolute path to the XML file.
   * @returns Parsed catalog, or null if the file could not be read.
   */
  parseFile(
    content: string,
    sourceFile: string
  ): Feature2JobCatalog {
    const lines = content.split(/\r?\n/);

    let catalogName = "unknown";
    const groups: JobGroup[] = [];
    const mappings: FeatureJobMapping[] = [];

    let currentMapping: FeatureJobMapping | null = null;

    for (const line of lines) {
      // Catalog name
      const catalogMatch = CATALOG_RE.exec(line);
      if (catalogMatch) {
        catalogName = catalogMatch[1];
        continue;
      }

      // Group definition
      if (line.includes("<Feature2Job_Group ")) {
        const id = extractAttr(line, GROUP_ID_RE);
        const name = extractAttr(line, GROUP_NAME_RE);
        if (id) {
          groups.push({ id, name });
        }
        continue;
      }

      // Definition closing tag — finalise current mapping
      if (DEFINITION_CLOSE_RE.test(line)) {
        if (currentMapping !== null) {
          mappings.push(currentMapping);
          currentMapping = null;
        }
        continue;
      }

      // Definition opening tag — start new mapping
      if (DEFINITION_RE.test(line)) {
        // Finalise any unclosed previous mapping (should not happen in well-formed XML)
        if (currentMapping !== null) {
          mappings.push(currentMapping);
        }
        const newMapping: FeatureJobMapping = {
          featureType: extractNamedAttr(line, "Feature_Type"),
          jobGroup: extractNamedAttr(line, "Job_Group"),
          jobName: extractNamedAttr(line, "Job_Name"),
          jobType: extractNamedAttr(line, "Job_Type"),
          featureCatalog: extractNamedAttr(line, "Feature_Catalog"),
          items: [],
          variables: [],
        };
        // Self-closing tag (ends with />) — push immediately, no children possible
        if (/\/>$/.test(line.trimEnd())) {
          mappings.push(newMapping);
          currentMapping = null;
        } else {
          currentMapping = newMapping;
        }
        continue;
      }

      if (currentMapping === null) continue;

      // Feature2Job_Item (active variable)
      if (ITEM_RE.test(line)) {
        const item = this.parseItem(line);
        if (item !== null) {
          currentMapping.items.push(item);
        }
        continue;
      }

      // Feature2Job_Variable (active)
      if (VARIABLE_RE.test(line)) {
        const variable = this.parseVariable(line, false);
        if (variable !== null) {
          currentMapping.variables.push(variable);
        }
        continue;
      }

      // Feature2Job_Variable_rem (disabled/commented-out)
      if (VARIABLE_REM_RE.test(line)) {
        const variable = this.parseVariable(line, true);
        if (variable !== null) {
          currentMapping.variables.push(variable);
        }
        continue;
      }
    }

    // Catch any unclosed final definition
    if (currentMapping !== null) {
      mappings.push(currentMapping);
    }

    return {
      catalogName,
      groups,
      mappings,
      sourceFile: path.basename(sourceFile),
    };
  }

  /**
   * Parse a Feature2Job_Item line into a FeatureJobItem.
   *
   * Returns null if required attributes (ID, Type) are missing.
   */
  parseItem(line: string): FeatureJobItem | null {
    const id = extractNamedAttr(line, "ID");
    const type = extractNamedAttr(line, "Type");
    if (!id && !type) return null;

    return {
      id,
      name: extractNamedAttr(line, "Name"),
      type,
      jobParameter: extractNamedAttr(line, "Job_Parameter"),
      expression: extractNamedAttr(line, "Expression"),
      active: extractNamedAttr(line, "Active") === "1",
    };
  }

  /**
   * Parse a Feature2Job_Variable or Feature2Job_Variable_rem line.
   *
   * Returns null if required attributes are missing.
   */
  parseVariable(line: string, isRem: boolean): FeatureJobVariable | null {
    const name = extractNamedAttr(line, "Name");
    if (!name) return null;

    return {
      name,
      type: extractNamedAttr(line, "Type"),
      expression: extractNamedAttr(line, "Expression"),
      isRem,
    };
  }

  /**
   * Extract all catalogs from all discovered XML files.
   *
   * Files that cannot be read are skipped and an error entry is recorded.
   *
   * @returns Array of catalogs plus a list of any errors encountered.
   */
  async extractAll(): Promise<{ catalogs: Feature2JobCatalog[]; errors: string[] }> {
    const files = await this.discoverFiles();
    const catalogs: Feature2JobCatalog[] = [];
    const errors: string[] = [];

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const catalog = this.parseFile(content, filePath);
        catalogs.push(catalog);
      } catch (err) {
        errors.push(
          `Feature2JobExtractor: failed to read "${filePath}": ${String(err)}`
        );
      }
    }

    return { catalogs, errors };
  }
}

// ── PostConfigExtractor ───────────────────────────────────────────────────────

export class PostConfigExtractor {
  private readonly filePath: string;

  /**
   * @param filePath - Path to the omPPFC.cfg file.
   */
  constructor(
    filePath = "H:/prism/HYPERMILL/hyperVIEW/33.0/omPPFC.cfg"
  ) {
    this.filePath = filePath;
  }

  /**
   * Parse the omPPFC.cfg file into PostConfigEntry records.
   *
   * Lines starting with # are comments. Entry lines have the form:
   *   "  *code   ncCode,description"
   *
   * Missing file is handled gracefully — returns empty array with error recorded.
   *
   * @returns Tuple of [entries, errors].
   */
  async extract(): Promise<{ entries: PostConfigEntry[]; errors: string[] }> {
    let content: string;
    try {
      content = await fs.readFile(this.filePath, "utf-8");
    } catch (err) {
      return {
        entries: [],
        errors: [
          `PostConfigExtractor: cannot read "${this.filePath}": ${String(err)}`,
        ],
      };
    }

    return { entries: this.parse(content), errors: [] };
  }

  /**
   * Parse raw cfg content into PostConfigEntry records.
   * Exposed for unit testing without file I/O.
   */
  parse(content: string): PostConfigEntry[] {
    const entries: PostConfigEntry[] = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip blank lines and comment blocks
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

      const match = POSTCONFIG_RE.exec(line);
      if (!match) continue;

      entries.push({
        code: `*${match[1]}`,
        ncCode: match[2],
        description: match[3].trim(),
      });
    }

    return entries;
  }
}

// ── HyperMillXmlExtractor (orchestrator) ─────────────────────────────────────

/**
 * Orchestrates Feature2Job catalog extraction and PostProcessor config extraction
 * into a single unified result.
 */
export class HyperMillXmlExtractor {
  private readonly feature2JobExtractor: Feature2JobExtractor;
  private readonly postConfigExtractor: PostConfigExtractor;

  constructor(
    catalogDir = "H:/prism/HYPERMILL/hyperMILL/33.0/feattech",
    postConfigPath = "H:/prism/HYPERMILL/hyperVIEW/33.0/omPPFC.cfg"
  ) {
    this.feature2JobExtractor = new Feature2JobExtractor(catalogDir);
    this.postConfigExtractor = new PostConfigExtractor(postConfigPath);
  }

  /**
   * Run full extraction: all Feature2Job catalogs + PostProcessor config.
   *
   * @returns XmlExtractionResult with aggregate counts, all catalogs, and config entries.
   */
  async extract(): Promise<XmlExtractionResult> {
    const [catalogResult, postConfigResult] = await Promise.all([
      this.feature2JobExtractor.extractAll(),
      this.postConfigExtractor.extract(),
    ]);

    const allErrors = [...catalogResult.errors, ...postConfigResult.errors];

    const totalMappings = catalogResult.catalogs.reduce(
      (sum, c) => sum + c.mappings.length,
      0
    );

    const totalItems = catalogResult.catalogs.reduce(
      (sum, c) =>
        sum + c.mappings.reduce((ms, m) => ms + m.items.length, 0),
      0
    );

    return {
      catalogs: catalogResult.catalogs,
      postConfig: postConfigResult.entries,
      totalMappings,
      totalItems,
      totalCatalogs: catalogResult.catalogs.length,
      extractedAt: new Date().toISOString(),
      errors: allErrors,
    };
  }
}

// ── Singletons ────────────────────────────────────────────────────────────────

/** Default Feature2Job catalog extractor using standard hyperMILL 33.0 paths. */
export const feature2JobExtractor = new Feature2JobExtractor();

/** Default PostProcessor config extractor using standard hyperVIEW 33.0 paths. */
export const postConfigExtractor = new PostConfigExtractor();

/** Default orchestrator: all catalogs + post config from standard paths. */
export const hyperMillXmlExtractor = new HyperMillXmlExtractor();
