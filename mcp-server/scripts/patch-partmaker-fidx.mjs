// CAM-EXHAUST-MS0/U-CAM-FIDX-22 — patcher for camDispatcher.ts
// Adds 10 partmaker_function_index_* actions, anchored on Creo last entries.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last creo entry.
const enumAnchor = `"creo_function_index_get_mill_turn_operations", "creo_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-22 — PartMaker (Autodesk Swiss) Function Index`,
  `  "partmaker_function_index_get", "partmaker_function_index_list_sections",`,
  `  "partmaker_function_index_get_section", "partmaker_function_index_list_operations",`,
  `  "partmaker_function_index_find_parameter", "partmaker_function_index_search_parameters",`,
  `  "partmaker_function_index_get_operations_by_category", "partmaker_function_index_get_summary",`,
  `  "partmaker_function_index_get_swiss_turning_operations", "partmaker_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"partmaker_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    throw new Error("enum anchor not found — Creo entries layout changed");
  }
  text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  console.log("[patch] inserted partmaker_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last creo case.
const switchAnchor =
  `case "creo_function_index_get_operation": {` + eol +
  `            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...CreoFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-22 — PartMaker (Autodesk Swiss) Function Index (10 actions)`,
  `          case "partmaker_function_index_get": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            result = { success: true, index: PartMakerFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_list_sections": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            result = { success: true, sections: PartMakerFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_get_section": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: PartMakerFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_list_operations": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            result = { success: true, operations: PartMakerFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_find_parameter": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: PartMakerFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_search_parameters": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: PartMakerFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_get_operations_by_category": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: PartMakerFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_get_summary": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            result = { success: true, ...PartMakerFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_get_swiss_turning_operations": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            result = { success: true, operations: PartMakerFunctionIndexEngine.getSwissTurningOperations() };`,
  `            break;`,
  `          }`,
  `          case "partmaker_function_index_get_operation": {`,
  `            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...PartMakerFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "partmaker_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — Creo get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted partmaker_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
