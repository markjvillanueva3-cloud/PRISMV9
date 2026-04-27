// CAM-EXHAUST-MS0/U-CAM-FIDX-09 — patcher for camDispatcher.ts
// Adds 10 edgecam_function_index_* actions to the action enum
// and a corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Insert action enum entries — anchor on the inventor_hsm 25d_operations entry.
const enumAnchor = `"inventor_hsm_function_index_get_hsm_operations", "inventor_hsm_function_index_get_25d_operations",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-09 — Edgecam Function Index`,
  `  "edgecam_function_index_get", "edgecam_function_index_list_sections",`,
  `  "edgecam_function_index_get_section", "edgecam_function_index_list_operations",`,
  `  "edgecam_function_index_find_parameter", "edgecam_function_index_search_parameters",`,
  `  "edgecam_function_index_get_operations_by_category", "edgecam_function_index_get_summary",`,
  `  "edgecam_function_index_get_waveform_operations", "edgecam_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"edgecam_function_index_get"`)) {
  const replacement = enumAnchor + eol + "  " + enumAddition;
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — schema layout changed");
  }
  text = text.replace(enumAnchor, replacement);
  console.log("[patch] inserted edgecam_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Insert switch handler block — anchor on the last inventor_hsm switch case.
const switchAnchor =
  `case "inventor_hsm_function_index_get_25d_operations": {` + eol +
  `            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");` + eol +
  `            result = { success: true, operations: InventorHSMFunctionIndexEngine.get25DOperations() };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-09 — Edgecam Function Index (10 actions)`,
  `          case "edgecam_function_index_get": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            result = { success: true, index: EdgecamFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_list_sections": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            result = { success: true, sections: EdgecamFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_get_section": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: EdgecamFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_list_operations": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            result = { success: true, operations: EdgecamFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_find_parameter": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: EdgecamFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_search_parameters": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: EdgecamFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_get_operations_by_category": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: EdgecamFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_get_summary": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            result = { success: true, ...EdgecamFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_get_waveform_operations": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            result = { success: true, operations: EdgecamFunctionIndexEngine.getWaveformOperations() };`,
  `            break;`,
  `          }`,
  `          case "edgecam_function_index_get_operation": {`,
  `            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...EdgecamFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "edgecam_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — InventorHSM 25d_operations case layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted edgecam_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
