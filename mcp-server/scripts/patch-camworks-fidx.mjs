// CAM-EXHAUST-MS0/U-CAM-FIDX-14 — patcher for camDispatcher.ts
// Adds 10 camworks_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last topsolid entry.
const enumAnchor = `"topsolid_function_index_get_pmi_operations", "topsolid_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-14 — CAMWorks Function Index`,
  `  "camworks_function_index_get", "camworks_function_index_list_sections",`,
  `  "camworks_function_index_get_section", "camworks_function_index_list_operations",`,
  `  "camworks_function_index_find_parameter", "camworks_function_index_search_parameters",`,
  `  "camworks_function_index_get_operations_by_category", "camworks_function_index_get_summary",`,
  `  "camworks_function_index_get_afr_operations", "camworks_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"camworks_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — TopSolid entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted camworks_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last topsolid case.
const switchAnchor =
  `case "topsolid_function_index_get_operation": {` + eol +
  `            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...TopSolidCAMFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-14 — CAMWorks Function Index (10 actions)`,
  `          case "camworks_function_index_get": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            result = { success: true, index: CAMWorksFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_list_sections": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            result = { success: true, sections: CAMWorksFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_get_section": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: CAMWorksFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_list_operations": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            result = { success: true, operations: CAMWorksFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_find_parameter": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: CAMWorksFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_search_parameters": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: CAMWorksFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_get_operations_by_category": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: CAMWorksFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_get_summary": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            result = { success: true, ...CAMWorksFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_get_afr_operations": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            result = { success: true, operations: CAMWorksFunctionIndexEngine.getAFROperations() };`,
  `            break;`,
  `          }`,
  `          case "camworks_function_index_get_operation": {`,
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...CAMWorksFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "camworks_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — TopSolid get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted camworks_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
