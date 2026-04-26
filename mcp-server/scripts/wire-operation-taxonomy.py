#!/usr/bin/env python3
"""Wire CADOperationTaxonomyEngine to cadAutomationDispatcher - U-CUC17"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (8 actions)
new_actions = '''  "cad_taxonomy_get",
  "cad_taxonomy_list",
  "cad_taxonomy_aerospace",
  "cad_taxonomy_by_category",
  "cad_taxonomy_by_system",
  "cad_taxonomy_search",
  "cad_taxonomy_compatibility",
  "cad_taxonomy_stats",
'''

# Insert after cad_classify_format in the ACTIONS array
old_actions_end = b'"cad_classify_format",\r\n] as const;'
new_actions_end = b'"cad_classify_format",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_taxonomy_get' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_taxonomy_get": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const operationId = params["operation_id"] as string;
            if (!operationId) {
              throw new Error("cad_taxonomy_get requires 'operation_id' string");
            }
            const op = cadOperationTaxonomyEngine.getOperation(operationId);
            result = { operation: op, found: !!op, source: "CADOperationTaxonomyEngine.getOperation" };
            break;
          }
          case "cad_taxonomy_list": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const operations = cadOperationTaxonomyEngine.getAllOperations();
            result = { operations, count: operations.length, source: "CADOperationTaxonomyEngine.getAllOperations" };
            break;
          }
          case "cad_taxonomy_aerospace": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const operations = cadOperationTaxonomyEngine.getAerospaceOperations();
            result = { operations, count: operations.length, source: "CADOperationTaxonomyEngine.getAerospaceOperations" };
            break;
          }
          case "cad_taxonomy_by_category": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const category = params["category"] as string;
            if (!category) {
              throw new Error("cad_taxonomy_by_category requires 'category' string");
            }
            const operations = cadOperationTaxonomyEngine.getByCategory(category as Parameters<typeof cadOperationTaxonomyEngine.getByCategory>[0]);
            result = { operations, count: operations.length, category, source: "CADOperationTaxonomyEngine.getByCategory" };
            break;
          }
          case "cad_taxonomy_by_system": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const system = params["system"] as string;
            if (!system) {
              throw new Error("cad_taxonomy_by_system requires 'system' string (e.g. 'fusion360', 'solidworks')");
            }
            const operations = cadOperationTaxonomyEngine.getBySupportedSystem(system as Parameters<typeof cadOperationTaxonomyEngine.getBySupportedSystem>[0]);
            result = { operations, count: operations.length, system, source: "CADOperationTaxonomyEngine.getBySupportedSystem" };
            break;
          }
          case "cad_taxonomy_search": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const query = params["query"] as string;
            if (!query) {
              throw new Error("cad_taxonomy_search requires 'query' string");
            }
            const results = cadOperationTaxonomyEngine.search(query);
            result = { results, count: results.length, query, source: "CADOperationTaxonomyEngine.search" };
            break;
          }
          case "cad_taxonomy_compatibility": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const operationId = params["operation_id"] as string;
            const system = params["system"] as string;
            if (!operationId || !system) {
              throw new Error("cad_taxonomy_compatibility requires 'operation_id' and 'system' strings");
            }
            const report = cadOperationTaxonomyEngine.checkCompatibility(operationId, system as Parameters<typeof cadOperationTaxonomyEngine.checkCompatibility>[1]);
            result = { ...report, source: "CADOperationTaxonomyEngine.checkCompatibility" };
            break;
          }
          case "cad_taxonomy_stats": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const stats = cadOperationTaxonomyEngine.getStats();
            result = { ...stats, source: "CADOperationTaxonomyEngine.getStats" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_taxonomy_get"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADOperationTaxonomyEngine wired successfully (8 actions)')
