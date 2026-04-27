// CAM-EXHAUST-MS0/U-CAM-FIDX-21 — patcher for camDispatcher.ts
// Adds 10 creo_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last visi entry.
const enumAnchor = `"visi_function_index_get_mold_operations", "visi_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-21 — Creo (PTC) Function Index`,
  `  "creo_function_index_get", "creo_function_index_list_sections",`,
  `  "creo_function_index_get_section", "creo_function_index_list_operations",`,
  `  "creo_function_index_find_parameter", "creo_function_index_search_parameters",`,
  `  "creo_function_index_get_operations_by_category", "creo_function_index_get_summary",`,
  `  "creo_function_index_get_mill_turn_operations", "creo_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"creo_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — VISI entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted creo_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last visi case.
const switchAnchor =
  `case "visi_function_index_get_operation": {` + eol +
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...VISIFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-21 — Creo (PTC) Function Index (10 actions)`,
  `          case "creo_function_index_get": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            result = { success: true, index: CreoFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_list_sections": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            result = { success: true, sections: CreoFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_get_section": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: CreoFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_list_operations": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            result = { success: true, operations: CreoFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_find_parameter": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: CreoFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_search_parameters": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: CreoFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_get_operations_by_category": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: CreoFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_get_summary": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            result = { success: true, ...CreoFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_get_mill_turn_operations": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            result = { success: true, operations: CreoFunctionIndexEngine.getMillTurnOperations() };`,
  `            break;`,
  `          }`,
  `          case "creo_function_index_get_operation": {`,
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...CreoFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "creo_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — VISI get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted creo_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
