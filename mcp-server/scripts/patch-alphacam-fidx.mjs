// CAM-EXHAUST-MS0/U-CAM-FIDX-19 — patcher for camDispatcher.ts
// Adds 10 alphacam_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last sprutcam entry.
const enumAnchor = `"sprutcam_function_index_get_robot_operations", "sprutcam_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-19 — Alphacam Function Index`,
  `  "alphacam_function_index_get", "alphacam_function_index_list_sections",`,
  `  "alphacam_function_index_get_section", "alphacam_function_index_list_operations",`,
  `  "alphacam_function_index_find_parameter", "alphacam_function_index_search_parameters",`,
  `  "alphacam_function_index_get_operations_by_category", "alphacam_function_index_get_summary",`,
  `  "alphacam_function_index_get_drilling_operations", "alphacam_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"alphacam_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — SprutCAM entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted alphacam_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last sprutcam case.
const switchAnchor =
  `case "sprutcam_function_index_get_operation": {` + eol +
  `            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...SprutCAMFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-19 — Alphacam Function Index (10 actions)`,
  `          case "alphacam_function_index_get": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            result = { success: true, index: AlphacamFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_list_sections": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            result = { success: true, sections: AlphacamFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_get_section": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: AlphacamFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_list_operations": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            result = { success: true, operations: AlphacamFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_find_parameter": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: AlphacamFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_search_parameters": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: AlphacamFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_get_operations_by_category": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: AlphacamFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_get_summary": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            result = { success: true, ...AlphacamFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_get_drilling_operations": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            result = { success: true, operations: AlphacamFunctionIndexEngine.getDrillingOperations() };`,
  `            break;`,
  `          }`,
  `          case "alphacam_function_index_get_operation": {`,
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...AlphacamFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "alphacam_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — SprutCAM get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted alphacam_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
