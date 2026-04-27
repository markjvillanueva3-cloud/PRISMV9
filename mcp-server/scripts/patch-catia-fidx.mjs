// CAM-EXHAUST-MS0/U-CAM-FIDX-23 — patcher for camDispatcher.ts
// Adds 10 catia_machining_function_index_* actions, anchored on PartMaker last entries.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last partmaker entry.
const enumAnchor = `"partmaker_function_index_get_swiss_turning_operations", "partmaker_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-23 — CATIA Machining (Dassault) Function Index`,
  `  "catia_machining_function_index_get", "catia_machining_function_index_list_sections",`,
  `  "catia_machining_function_index_get_section", "catia_machining_function_index_list_operations",`,
  `  "catia_machining_function_index_find_parameter", "catia_machining_function_index_search_parameters",`,
  `  "catia_machining_function_index_get_operations_by_category", "catia_machining_function_index_get_summary",`,
  `  "catia_machining_function_index_get_surface_operations", "catia_machining_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"catia_machining_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — PartMaker entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted catia_machining_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last partmaker case.
const switchAnchor =
  `case "partmaker_function_index_get_operation": {` + eol +
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...PartMakerFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-23 — CATIA Machining (Dassault) Function Index (10 actions)`,
  `          case "catia_machining_function_index_get": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            result = { success: true, index: CATIAMachiningFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_list_sections": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            result = { success: true, sections: CATIAMachiningFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_get_section": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: CATIAMachiningFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_list_operations": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            result = { success: true, operations: CATIAMachiningFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_find_parameter": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: CATIAMachiningFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_search_parameters": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: CATIAMachiningFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_get_operations_by_category": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: CATIAMachiningFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_get_summary": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            result = { success: true, ...CATIAMachiningFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_get_surface_operations": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            result = { success: true, operations: CATIAMachiningFunctionIndexEngine.getSurfaceMachiningOperations() };`,
  `            break;`,
  `          }`,
  `          case "catia_machining_function_index_get_operation": {`,
  `            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...CATIAMachiningFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "catia_machining_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — PartMaker get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted catia_machining_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
