// CAM-EXHAUST-MS0/U-CAM-FIDX-18 — patcher for camDispatcher.ts
// Adds 10 sprutcam_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last cimatron entry.
const enumAnchor = `"cimatron_function_index_get_mold_die_operations", "cimatron_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-18 — SprutCAM Function Index`,
  `  "sprutcam_function_index_get", "sprutcam_function_index_list_sections",`,
  `  "sprutcam_function_index_get_section", "sprutcam_function_index_list_operations",`,
  `  "sprutcam_function_index_find_parameter", "sprutcam_function_index_search_parameters",`,
  `  "sprutcam_function_index_get_operations_by_category", "sprutcam_function_index_get_summary",`,
  `  "sprutcam_function_index_get_robot_operations", "sprutcam_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"sprutcam_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — Cimatron entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted sprutcam_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last cimatron case.
const switchAnchor =
  `case "cimatron_function_index_get_operation": {` + eol +
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...CimatronFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-18 — SprutCAM Function Index (10 actions)`,
  `          case "sprutcam_function_index_get": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            result = { success: true, index: SprutCAMFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_list_sections": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            result = { success: true, sections: SprutCAMFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_get_section": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: SprutCAMFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_list_operations": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: SprutCAMFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_find_parameter": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: SprutCAMFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_search_parameters": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: SprutCAMFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_get_operations_by_category": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: SprutCAMFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_get_summary": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            result = { success: true, ...SprutCAMFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_get_robot_operations": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: SprutCAMFunctionIndexEngine.getRobotOperations() };`,
  `            break;`,
  `          }`,
  `          case "sprutcam_function_index_get_operation": {`,
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...SprutCAMFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "sprutcam_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — Cimatron get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted sprutcam_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
