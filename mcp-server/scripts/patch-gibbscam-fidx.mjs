// CAM-EXHAUST-MS0/U-CAM-FIDX-11 — patcher for camDispatcher.ts
// Adds 10 gibbscam_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last esprit entry.
const enumAnchor = `"esprit_function_index_get_profit_operations", "esprit_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-11 — GibbsCAM Function Index`,
  `  "gibbscam_function_index_get", "gibbscam_function_index_list_sections",`,
  `  "gibbscam_function_index_get_section", "gibbscam_function_index_list_operations",`,
  `  "gibbscam_function_index_find_parameter", "gibbscam_function_index_search_parameters",`,
  `  "gibbscam_function_index_get_operations_by_category", "gibbscam_function_index_get_summary",`,
  `  "gibbscam_function_index_get_volumill_operations", "gibbscam_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"gibbscam_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — ESPRIT entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted gibbscam_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last esprit case.
const switchAnchor =
  `case "esprit_function_index_get_operation": {` + eol +
  `            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...EspritFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-11 — GibbsCAM Function Index (10 actions)`,
  `          case "gibbscam_function_index_get": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            result = { success: true, index: GibbsCAMFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_list_sections": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            result = { success: true, sections: GibbsCAMFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_get_section": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: GibbsCAMFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_list_operations": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: GibbsCAMFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_find_parameter": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: GibbsCAMFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_search_parameters": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: GibbsCAMFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_get_operations_by_category": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: GibbsCAMFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_get_summary": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            result = { success: true, ...GibbsCAMFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_get_volumill_operations": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            result = { success: true, operations: GibbsCAMFunctionIndexEngine.getVoluMillOperations() };`,
  `            break;`,
  `          }`,
  `          case "gibbscam_function_index_get_operation": {`,
  `            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...GibbsCAMFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "gibbscam_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — ESPRIT get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted gibbscam_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
