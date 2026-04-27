// CAM-EXHAUST-MS0/U-CAM-FIDX-15 — patcher for camDispatcher.ts
// Adds 10 tebis_function_index_* actions to the action enum
// and corresponding switch block, preserving CRLF endings.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, "..", "src", "tools", "dispatchers", "camDispatcher.ts");

let text = readFileSync(filePath, "utf-8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

// 1) Action enum — anchor on the last camworks entry.
const enumAnchor = `"camworks_function_index_get_afr_operations", "camworks_function_index_get_summary",${eol}  "camworks_function_index_get_operation",`;
const enumAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-15 — Tebis Function Index`,
  `  "tebis_function_index_get", "tebis_function_index_list_sections",`,
  `  "tebis_function_index_get_section", "tebis_function_index_list_operations",`,
  `  "tebis_function_index_find_parameter", "tebis_function_index_search_parameters",`,
  `  "tebis_function_index_get_operations_by_category", "tebis_function_index_get_summary",`,
  `  "tebis_function_index_get_proven_process_operations", "tebis_function_index_get_operation",`,
].join(eol + "  ");

if (!text.includes(`"tebis_function_index_get"`)) {
  if (!text.includes(enumAnchor)) {
    // Try alternate spacing — the camworks block may not be on two lines
    const altAnchor = `"camworks_function_index_get_afr_operations", "camworks_function_index_get_operation",`;
    if (!text.includes(altAnchor)) {
      throw new Error("enum anchor not found — CAMWorks entries layout changed");
    }
    text = text.replace(altAnchor, altAnchor + eol + "  " + enumAddition);
  } else {
    text = text.replace(enumAnchor, enumAnchor + eol + "  " + enumAddition);
  }
  console.log("[patch] inserted tebis_function_index_* into action enum");
} else {
  console.log("[patch] enum entries already present, skipping");
}

// 2) Switch handler — anchor on the last camworks case.
const switchAnchor =
  `case "camworks_function_index_get_operation": {` + eol +
  `            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");` + eol +
  `            const operationId = params.operation_id as string;` + eol +
  `            result = { success: true, ...CAMWorksFunctionIndexEngine.getOperation(operationId) };` + eol +
  `            break;` + eol +
  `          }`;

const switchAddition = [
  `// CAM-EXHAUST-MS0/U-CAM-FIDX-15 — Tebis Function Index (10 actions)`,
  `          case "tebis_function_index_get": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            result = { success: true, index: TebisFunctionIndexEngine.getIndex() };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_list_sections": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            result = { success: true, sections: TebisFunctionIndexEngine.listSections() };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_get_section": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            const sectionKey = params.section_key as string;`,
  `            result = { success: true, section: TebisFunctionIndexEngine.getSection(sectionKey) };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_list_operations": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            result = { success: true, operations: TebisFunctionIndexEngine.listOperations() };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_find_parameter": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            const paramName = params.parameter_name as string;`,
  `            result = { success: true, results: TebisFunctionIndexEngine.findParameter(paramName) };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_search_parameters": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            const query = params.query as string;`,
  `            const limit = params.limit as number | undefined;`,
  `            result = { success: true, results: TebisFunctionIndexEngine.searchParameters(query, limit) };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_get_operations_by_category": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            const category = params.category as string;`,
  `            result = { success: true, operations: TebisFunctionIndexEngine.getOperationsByCategory(category) };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_get_summary": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            result = { success: true, ...TebisFunctionIndexEngine.getSummary() };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_get_proven_process_operations": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            result = { success: true, operations: TebisFunctionIndexEngine.getProvenProcessOperations() };`,
  `            break;`,
  `          }`,
  `          case "tebis_function_index_get_operation": {`,
  `            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");`,
  `            const operationId = params.operation_id as string;`,
  `            result = { success: true, ...TebisFunctionIndexEngine.getOperation(operationId) };`,
  `            break;`,
  `          }`,
].join(eol);

if (!text.includes(`case "tebis_function_index_get":`)) {
  if (!text.includes(switchAnchor)) {
    throw new Error("switch anchor not found — CAMWorks get_operation layout changed");
  }
  text = text.replace(switchAnchor, switchAnchor + eol + "          " + switchAddition);
  console.log("[patch] inserted tebis_function_index_* switch cases");
} else {
  console.log("[patch] switch cases already present, skipping");
}

writeFileSync(filePath, text, "utf-8");
console.log("[patch] camDispatcher.ts saved");
