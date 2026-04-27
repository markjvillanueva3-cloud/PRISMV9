// CAM-EXHAUST-MS0/U-CAM-FIDX-13 — patcher for camDispatcher.ts
// Adds 10 topsolid_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last worknc entry.
const enumAnchor = `"worknc_function_index_get_auto5_operations", "worknc_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-13 — TopSolid'Cam Function Index`,
  `  "topsolid_function_index_get", "topsolid_function_index_list_sections",`,
  `  "topsolid_function_index_get_section", "topsolid_function_index_list_operations",`,
  `  "topsolid_function_index_find_parameter", "topsolid_function_index_search_parameters",`,
  `  "topsolid_function_index_get_operations_by_category", "topsolid_function_index_get_summary",`,
  `  "topsolid_function_index_get_pmi_operations", "topsolid_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"topsolid_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — WorkNC entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted topsolid_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last worknc case.
const switchAnchor =
  `case "worknc_function_index_get_operation": {` + eol +
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...WorkNCFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-13 — TopSolid'Cam Function Index (10 actions)`,
  `          case "topsolid_function_index_get": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            result = { success: true, index: TopSolidCAMFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_list_sections": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            result = { success: true, sections: TopSolidCAMFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_get_section": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: TopSolidCAMFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_list_operations": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: TopSolidCAMFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_find_parameter": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: TopSolidCAMFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_search_parameters": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: TopSolidCAMFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_get_operations_by_category": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: TopSolidCAMFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_get_summary": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            result = { success: true, ...TopSolidCAMFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_get_pmi_operations": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: TopSolidCAMFunctionIndexEngine.getPMIOperations() };`,
  `            break;`,
  `          }`,
  `          case "topsolid_function_index_get_operation": {`,
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...TopSolidCAMFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "topsolid_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — WorkNC get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted topsolid_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
