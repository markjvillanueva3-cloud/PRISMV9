// CAM-EXHAUST-MS0/U-CAM-FIDX-24 — patcher for camDispatcher.ts
// Adds 10 featurecam_function_index_* actions, anchored on CATIA last entries.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last catia entry.
const enumAnchor = `"catia_machining_function_index_get_surface_operations", "catia_machining_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-24 — FeatureCAM (Autodesk AFR) Function Index`,
  `  "featurecam_function_index_get", "featurecam_function_index_list_sections",`,
  `  "featurecam_function_index_get_section", "featurecam_function_index_list_operations",`,
  `  "featurecam_function_index_find_parameter", "featurecam_function_index_search_parameters",`,
  `  "featurecam_function_index_get_operations_by_category", "featurecam_function_index_get_summary",`,
  `  "featurecam_function_index_get_afr_operations", "featurecam_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"featurecam_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — CATIA entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted featurecam_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last catia case.
const switchAnchor =
  `case "catia_machining_function_index_get_operation": {` + eol +
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...CATIAMachiningFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-24 — FeatureCAM (Autodesk AFR) Function Index (10 actions)`,
  `          case "featurecam_function_index_get": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            result = { success: true, index: FeatureCAMFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_list_sections": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            result = { success: true, sections: FeatureCAMFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_get_section": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: FeatureCAMFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_list_operations": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: FeatureCAMFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_find_parameter": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: FeatureCAMFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_search_parameters": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: FeatureCAMFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_get_operations_by_category": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: FeatureCAMFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_get_summary": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            result = { success: true, ...FeatureCAMFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_get_afr_operations": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: FeatureCAMFunctionIndexEngine.getAFROperations() };`,
  `            break;`,
  `          }`,
  `          case "featurecam_function_index_get_operation": {`,
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...FeatureCAMFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "featurecam_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — CATIA get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted featurecam_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
