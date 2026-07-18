/**
 * hyperMILL API Deep Extractor
 *
 * Extracts internal API documentation:
 * - Property definitions (tool, document, feature, job)
 * - Operation ID mappings
 * - Automation Center function catalog
 * - Strategy configurations
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";

// ============================================================================
// TYPES
// ============================================================================

interface PropertyDefinition {
  name: string;
  key: string;
  type: string;
  ncVariable?: string;
  interface?: string;
  category: string;
  description?: string;
}

interface OperationMapping {
  appId: string;
  helpTopic: string;
  operationName?: string;
  category?: string;
}

interface AutomationFunction {
  name: string;
  uuid: string;
  category: string;
  description?: string;
}

// ============================================================================
// PROPERTY EXTRACTION
// ============================================================================

function extractPropertyDefinitions(filePath: string, category: string): PropertyDefinition[] {
  const properties: PropertyDefinition[] = [];

  if (!existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return properties;
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Pattern: DefStr( kcPropertyName, _TEXT("PropertyKey") ) // type | ncvar | version | interface
  const defPattern = /DefStr\(\s*(\w+),\s*_TEXT\("([^"]+)"\)\s*\)(?:\s*\/\/\s*(.*))?/;

  for (const line of lines) {
    const match = line.match(defPattern);
    if (match) {
      const [, name, key, comment] = match;

      let type = "unknown";
      let ncVariable = undefined;
      let interfaceName = undefined;

      if (comment) {
        // Parse comment: type | ncvar | version | interface
        const parts = comment.split("|").map(p => p.trim());
        if (parts[0]) type = parts[0];
        if (parts[1] && parts[1].startsWith("*")) ncVariable = parts[1];
        if (parts[3]) interfaceName = parts[3];
      }

      properties.push({
        name,
        key,
        type,
        ncVariable,
        interface: interfaceName,
        category,
      });
    }
  }

  console.log(`  ${category}: ${properties.length} properties`);
  return properties;
}

// ============================================================================
// OPERATION ID MAPPING
// ============================================================================

function extractOperationMappings(jsonPath: string): OperationMapping[] {
  const mappings: OperationMapping[] = [];

  if (!existsSync(jsonPath)) {
    console.log(`  Mapping file not found: ${jsonPath}`);
    return mappings;
  }

  try {
    const content = readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(content);

    for (const item of data.map || []) {
      const appId = item.appid || "";
      const helpTopic = item.helptopic || "";

      // Extract operation name from appId
      let operationName = appId
        .replace(/_UUID$/, "")
        .replace(/^i/, "")
        .replace(/^S_/, "")
        .replace(/^ST_/, "")
        .replace(/^VC_/, "")
        .replace(/_/g, " ");

      // Categorize
      let category = "general";
      if (appId.includes("CAD")) category = "cad";
      else if (appId.includes("FACE") || appId.includes("SURFACE")) category = "surface";
      else if (appId.includes("CURVE") || appId.includes("LINE")) category = "curve";
      else if (appId.includes("MESH") || appId.includes("BOOLEAN")) category = "solid";
      else if (appId.includes("STOCK") || appId.includes("NCS")) category = "cam_setup";
      else if (appId.includes("TOOL")) category = "tooling";
      else if (appId.includes("LAYER")) category = "layer";
      else if (appId.includes("FEATURE") || appId.includes("FEA")) category = "feature";
      else if (appId.includes("DIMENSION")) category = "dimension";

      mappings.push({
        appId,
        helpTopic,
        operationName,
        category,
      });
    }

    console.log(`  Operation mappings: ${mappings.length}`);
  } catch (err) {
    console.error(`  Error parsing JSON: ${err}`);
  }

  return mappings;
}

// ============================================================================
// AUTOMATION CENTER FUNCTIONS
// ============================================================================

function extractAutomationFunctions(xmlDir: string): AutomationFunction[] {
  const functions: AutomationFunction[] = [];

  if (!existsSync(xmlDir)) {
    console.log(`  XML dir not found: ${xmlDir}`);
    return functions;
  }

  const files = readdirSync(xmlDir).filter(f => f.endsWith(".xml"));

  for (const file of files) {
    const filePath = join(xmlDir, file);
    const content = readFileSync(filePath, "utf-8");

    // Extract function definitions
    const nameMatches = content.matchAll(/<name[^>]*>([^<]+)<\/name>/gi);
    const uuidMatches = content.matchAll(/UUID[^"]*"([^"]+)"/gi);

    for (const match of nameMatches) {
      const name = match[1].trim();
      if (name.length > 2 && name.length < 100) {
        // Categorize based on file name
        let category = "general";
        const fn = file.toLowerCase();
        if (fn.includes("cad")) category = "cad";
        else if (fn.includes("curve")) category = "curve";
        else if (fn.includes("electrode")) category = "electrode";
        else if (fn.includes("color")) category = "visualization";
        else if (fn.includes("excel")) category = "data_exchange";
        else if (fn.includes("deformation")) category = "geometry";
        else if (fn.includes("bookmark")) category = "navigation";

        functions.push({
          name,
          uuid: "",
          category,
        });
      }
    }
  }

  // Deduplicate
  const unique = functions.filter((f, i, arr) =>
    arr.findIndex(x => x.name === f.name) === i
  );

  console.log(`  Automation functions: ${unique.length}`);
  return unique;
}

// ============================================================================
// STRATEGY CONFIG EXTRACTION
// ============================================================================

interface StrategyConfig {
  name: string;
  parameters: string[];
  category: string;
}

function extractStrategyConfigs(cfgDir: string): StrategyConfig[] {
  const strategies: StrategyConfig[] = [];

  if (!existsSync(cfgDir)) return strategies;

  function walkDir(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith(".cfg")) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          const params: string[] = [];

          // Extract parameter names (lines starting with *)
          const paramMatches = content.matchAll(/^\*([A-Z_]+)/gm);
          for (const match of paramMatches) {
            params.push(match[1]);
          }

          if (params.length > 0) {
            const category = basename(dir);
            strategies.push({
              name: entry.name.replace(".cfg", ""),
              parameters: [...new Set(params)].slice(0, 50),
              category,
            });
          }
        } catch (err) {
          // Skip unreadable files
        }
      }
    }
  }

  walkDir(cfgDir);
  console.log(`  Strategy configs: ${strategies.length}`);
  return strategies;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║    hyperMILL API Deep Extraction                             ║");
  console.log("║    Property Definitions + Operation Mappings + Strategies    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge/hypermill-api";
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Paths
  const DOC_DIR = "H:/prism/Resources/HYPERMILL/hyperMILL/31.0/AddIns/hmAutoColor/doc";
  const AC_DIR = "H:/prism/Resources/HYPERMILL/hyperMILL/31.0/AddIns/hmAutoColor/Wizards/AutomationCenter";
  const BMP_DIR = "H:/prism/Resources/OPEN MIND/hyperMILL/31.0/bmp";

  // 1. Extract property definitions
  console.log("Extracting property definitions...");
  const allProperties: PropertyDefinition[] = [];

  const propertyFiles = [
    { file: "toolProperties.txt", category: "tool" },
    { file: "documentProperties.txt", category: "document" },
    { file: "FeatureProperties.txt", category: "feature" },
    { file: "compoundJobProperties.txt", category: "compound_job" },
    { file: "ToolDbProperties.txt", category: "tool_database" },
  ];

  for (const { file, category } of propertyFiles) {
    const props = extractPropertyDefinitions(join(DOC_DIR, file), category);
    allProperties.push(...props);

    // Also check properies folder (typo in their folder name)
    const propsAlt = extractPropertyDefinitions(join(DOC_DIR, "properies", file), category + "_alt");
    allProperties.push(...propsAlt);
  }

  // 2. Extract operation mappings
  console.log("\nExtracting operation mappings...");
  const mappings = extractOperationMappings(join(AC_DIR, "ID_TO_HRML.json"));

  // 3. Extract automation functions
  console.log("\nExtracting automation functions...");
  const autoFunctions = extractAutomationFunctions(join(AC_DIR, "OMGEAPP"));

  // 4. Extract strategy configs
  console.log("\nExtracting strategy configurations...");
  const strategies = extractStrategyConfigs(BMP_DIR);

  // Build summary
  const timestamp = Date.now();
  const result = {
    extracted_at: new Date().toISOString(),
    source: "hyperMILL 31.0 Internal API Documentation",

    properties: {
      total: allProperties.length,
      by_category: {} as Record<string, number>,
      definitions: allProperties,
    },

    operation_mappings: {
      total: mappings.length,
      by_category: {} as Record<string, number>,
      mappings,
    },

    automation_functions: {
      total: autoFunctions.length,
      functions: autoFunctions,
    },

    strategy_configs: {
      total: strategies.length,
      configs: strategies,
    },
  };

  // Count by category
  for (const p of allProperties) {
    result.properties.by_category[p.category] = (result.properties.by_category[p.category] || 0) + 1;
  }
  for (const m of mappings) {
    result.operation_mappings.by_category[m.category || "general"] =
      (result.operation_mappings.by_category[m.category || "general"] || 0) + 1;
  }

  // Save
  const outputPath = join(OUTPUT_DIR, `hypermill-api-${timestamp}.json`);
  writeFileSync(outputPath, JSON.stringify(result, null, 2));

  // Save compact property reference
  const propRefPath = join(OUTPUT_DIR, `property-reference-${timestamp}.json`);
  const propRef = {
    tool_properties: allProperties.filter(p => p.category === "tool").map(p => ({
      name: p.name,
      key: p.key,
      type: p.type,
      ncVar: p.ncVariable,
    })),
    document_properties: allProperties.filter(p => p.category === "document").map(p => ({
      name: p.name,
      key: p.key,
      type: p.type,
    })),
    feature_properties: allProperties.filter(p => p.category === "feature").map(p => ({
      name: p.name,
      key: p.key,
      type: p.type,
    })),
  };
  writeFileSync(propRefPath, JSON.stringify(propRef, null, 2));

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    EXTRACTION SUMMARY                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  Property Definitions:    ${allProperties.length}`);
  console.log(`  Operation Mappings:      ${mappings.length}`);
  console.log(`  Automation Functions:    ${autoFunctions.length}`);
  console.log(`  Strategy Configs:        ${strategies.length}`);
  console.log("");
  console.log("  Properties by category:");
  for (const [cat, count] of Object.entries(result.properties.by_category).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log("");
  console.log("  Operations by category:");
  for (const [cat, count] of Object.entries(result.operation_mappings.by_category).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log("");
  console.log(`  Output: ${outputPath}`);
  console.log(`  Props:  ${propRefPath}`);
}

main().catch(console.error);
