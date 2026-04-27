// CAM-EXHAUST-MS0/U-CAM-FIDX-10 — patcher for camDispatcher.ts
// Adds 10 esprit_function_index_* actions to the action enum
// and a corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last edgecam entry.
const enumAnchor = `"edgecam_function_index_get_waveform_operations", "edgecam_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-10 — ESPRIT Function Index`,
  `  "esprit_function_index_get", "esprit_function_index_list_sections",`,
  `  "esprit_function_index_get_section", "esprit_function_index_list_operations",`,
  `  "esprit_function_index_find_parameter", "esprit_function_index_search_parameters",`,
  `  "esprit_function_index_get_operations_by_category", "esprit_function_index_get_summary",`,
  `  "esprit_function_index_get_profit_operations", "esprit_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"esprit_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — Edgecam entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted esprit_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last edgecam case (get_operation).
const switchAnchor =
  `case "edgecam_function_index_get_operation": {` + eol +
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...EdgecamFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-10 — ESPRIT Function Index (10 actions)`,
  `          case "esprit_function_index_get": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            result = { success: true, index: EspritFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_list_sections": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            result = { success: true, sections: EspritFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_get_section": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: EspritFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_list_operations": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            result = { success: true, operations: EspritFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_find_parameter": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: EspritFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_search_parameters": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: EspritFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_get_operations_by_category": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: EspritFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_get_summary": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            result = { success: true, ...EspritFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_get_profit_operations": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            result = { success: true, operations: EspritFunctionIndexEngine.getProfitOperations() };`,
  `            break;`,
  `          }`,
  `          case "esprit_function_index_get_operation": {`,
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...EspritFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "esprit_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — Edgecam get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted esprit_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
