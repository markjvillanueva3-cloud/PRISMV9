// CAM-EXHAUST-MS0/U-CAM-FIDX-17 — patcher for camDispatcher.ts
// Adds 10 cimatron_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last bobcad entry.
const enumAnchor = `"bobcad_function_index_get_dmt_operations", "bobcad_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-17 — Cimatron Function Index`,
  `  "cimatron_function_index_get", "cimatron_function_index_list_sections",`,
  `  "cimatron_function_index_get_section", "cimatron_function_index_list_operations",`,
  `  "cimatron_function_index_find_parameter", "cimatron_function_index_search_parameters",`,
  `  "cimatron_function_index_get_operations_by_category", "cimatron_function_index_get_summary",`,
  `  "cimatron_function_index_get_mold_die_operations", "cimatron_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"cimatron_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — BobCAD entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted cimatron_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last bobcad case.
const switchAnchor =
  `case "bobcad_function_index_get_operation": {` + eol +
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...BobCADCAMFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-17 — Cimatron Function Index (10 actions)`,
  `          case "cimatron_function_index_get": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            result = { success: true, index: CimatronFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_list_sections": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            result = { success: true, sections: CimatronFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_get_section": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: CimatronFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_list_operations": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            result = { success: true, operations: CimatronFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_find_parameter": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: CimatronFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_search_parameters": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: CimatronFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_get_operations_by_category": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: CimatronFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_get_summary": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            result = { success: true, ...CimatronFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_get_mold_die_operations": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            result = { success: true, operations: CimatronFunctionIndexEngine.getMoldDieOperations() };`,
  `            break;`,
  `          }`,
  `          case "cimatron_function_index_get_operation": {`,
  `            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...CimatronFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "cimatron_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — BobCAD get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted cimatron_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
