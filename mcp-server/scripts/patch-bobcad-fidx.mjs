// CAM-EXHAUST-MS0/U-CAM-FIDX-16 — patcher for camDispatcher.ts
// Adds 10 bobcad_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last tebis entry.
const enumAnchor = `"tebis_function_index_get_proven_process_operations", "tebis_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-16 — BobCAD-CAM Function Index`,
  `  "bobcad_function_index_get", "bobcad_function_index_list_sections",`,
  `  "bobcad_function_index_get_section", "bobcad_function_index_list_operations",`,
  `  "bobcad_function_index_find_parameter", "bobcad_function_index_search_parameters",`,
  `  "bobcad_function_index_get_operations_by_category", "bobcad_function_index_get_summary",`,
  `  "bobcad_function_index_get_dmt_operations", "bobcad_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"bobcad_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — Tebis entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted bobcad_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last tebis case.
const switchAnchor =
  `case "tebis_function_index_get_operation": {` + eol +
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...TebisFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-16 — BobCAD-CAM Function Index (10 actions)`,
  `          case "bobcad_function_index_get": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            result = { success: true, index: BobCADCAMFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_list_sections": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            result = { success: true, sections: BobCADCAMFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_get_section": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: BobCADCAMFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_list_operations": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: BobCADCAMFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_find_parameter": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: BobCADCAMFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_search_parameters": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: BobCADCAMFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_get_operations_by_category": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: BobCADCAMFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_get_summary": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            result = { success: true, ...BobCADCAMFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_get_dmt_operations": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: BobCADCAMFunctionIndexEngine.getDMTOperations() };`,
  `            break;`,
  `          }`,
  `          case "bobcad_function_index_get_operation": {`,
  `            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...BobCADCAMFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "bobcad_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — Tebis get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted bobcad_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
