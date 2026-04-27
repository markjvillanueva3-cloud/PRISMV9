// CAM-EXHAUST-MS0/U-CAM-FIDX-20 — patcher for camDispatcher.ts
// Adds 10 visi_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last alphacam entry.
const enumAnchor = `"alphacam_function_index_get_drilling_operations", "alphacam_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-20 — VISI Function Index`,
  `  "visi_function_index_get", "visi_function_index_list_sections",`,
  `  "visi_function_index_get_section", "visi_function_index_list_operations",`,
  `  "visi_function_index_find_parameter", "visi_function_index_search_parameters",`,
  `  "visi_function_index_get_operations_by_category", "visi_function_index_get_summary",`,
  `  "visi_function_index_get_mold_operations", "visi_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"visi_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — Alphacam entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted visi_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last alphacam case.
const switchAnchor =
  `case "alphacam_function_index_get_operation": {` + eol +
  `            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...AlphacamFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-20 — VISI Function Index (10 actions)`,
  `          case "visi_function_index_get": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            result = { success: true, index: VISIFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_list_sections": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            result = { success: true, sections: VISIFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_get_section": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: VISIFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_list_operations": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            result = { success: true, operations: VISIFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_find_parameter": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: VISIFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_search_parameters": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: VISIFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_get_operations_by_category": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: VISIFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_get_summary": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            result = { success: true, ...VISIFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_get_mold_operations": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            result = { success: true, operations: VISIFunctionIndexEngine.getMoldOperations() };`,
  `            break;`,
  `          }`,
  `          case "visi_function_index_get_operation": {`,
  `            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...VISIFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "visi_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — Alphacam get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted visi_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
