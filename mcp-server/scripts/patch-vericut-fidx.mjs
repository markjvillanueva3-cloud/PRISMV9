// CAM-EXHAUST-MS0/U-CAM-FIDX-25 — patcher for camDispatcher.ts
// Adds 10 vericut_function_index_* actions, anchored on FeatureCAM last entries.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last featurecam entry.
const enumAnchor = `"featurecam_function_index_get_afr_operations", "featurecam_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-25 — VERICUT (CGTech) Function Index`,
  `  "vericut_function_index_get", "vericut_function_index_list_sections",`,
  `  "vericut_function_index_get_section", "vericut_function_index_list_operations",`,
  `  "vericut_function_index_find_parameter", "vericut_function_index_search_parameters",`,
  `  "vericut_function_index_get_operations_by_category", "vericut_function_index_get_summary",`,
  `  "vericut_function_index_get_verification_operations", "vericut_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"vericut_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — FeatureCAM entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted vericut_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last featurecam case.
const switchAnchor =
  `case "featurecam_function_index_get_operation": {` + eol +
  `            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...FeatureCAMFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-25 — VERICUT (CGTech) Function Index (10 actions)`,
  `          case "vericut_function_index_get": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            result = { success: true, index: VericutFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_list_sections": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            result = { success: true, sections: VericutFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_get_section": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: VericutFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_list_operations": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            result = { success: true, operations: VericutFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_find_parameter": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: VericutFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_search_parameters": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: VericutFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_get_operations_by_category": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: VericutFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_get_summary": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            result = { success: true, ...VericutFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_get_verification_operations": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            result = { success: true, operations: VericutFunctionIndexEngine.getVerificationOperations() };`,
  `            break;`,
  `          }`,
  `          case "vericut_function_index_get_operation": {`,
  `            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...VericutFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "vericut_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — FeatureCAM get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted vericut_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
