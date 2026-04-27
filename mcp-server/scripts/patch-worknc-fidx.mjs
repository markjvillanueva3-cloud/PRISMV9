// CAM-EXHAUST-MS0/U-CAM-FIDX-12 — patcher for camDispatcher.ts
// Adds 10 worknc_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last gibbscam entry.
const enumAnchor = `"gibbscam_function_index_get_volumill_operations", "gibbscam_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-12 — WorkNC Function Index`,
  `  "worknc_function_index_get", "worknc_function_index_list_sections",`,
  `  "worknc_function_index_get_section", "worknc_function_index_list_operations",`,
  `  "worknc_function_index_find_parameter", "worknc_function_index_search_parameters",`,
  `  "worknc_function_index_get_operations_by_category", "worknc_function_index_get_summary",`,
  `  "worknc_function_index_get_auto5_operations", "worknc_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"worknc_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — GibbsCAM entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted worknc_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last gibbscam case.
const switchAnchor =
  `case "gibbscam_function_index_get_operation": {` + eol +
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...GibbsCAMFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-12 — WorkNC Function Index (10 actions)`,
  `          case "worknc_function_index_get": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            result = { success: true, index: WorkNCFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_list_sections": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            result = { success: true, sections: WorkNCFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_get_section": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: WorkNCFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_list_operations": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            result = { success: true, operations: WorkNCFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_find_parameter": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: WorkNCFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_search_parameters": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: WorkNCFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_get_operations_by_category": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: WorkNCFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_get_summary": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            result = { success: true, ...WorkNCFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_get_auto5_operations": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            result = { success: true, operations: WorkNCFunctionIndexEngine.getAuto5Operations() };`,
  `            break;`,
  `          }`,
  `          case "worknc_function_index_get_operation": {`,
  `            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...WorkNCFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "worknc_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — GibbsCAM get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted worknc_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
