#!/usr/bin/env python3
"""Wire CADFileIndexerEngine to cadAutomationDispatcher - U-CUC14"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (3 actions)
new_actions = '''  "cad_index_scan",
  "cad_index_load",
  "cad_index_status",
'''

# Insert after cad_cas_list in the ACTIONS array
old_actions_end = b'"cad_cas_list",\r\n] as const;'
new_actions_end = b'"cad_cas_list",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_index_scan' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements for CADFileIndexerEngine
case_code = '''          case "cad_index_scan": {
            const { cadFileIndexerEngine } = await import("../../engines/CADFileIndexerEngine.js");
            const rootPaths = params["root_paths"] as string[] | undefined;
            const batchSize = (params["batch_size"] as number) || 500;
            const maxDepth = (params["max_depth"] as number) || 20;
            const outputPath = params["output_path"] as string | undefined;
            const index = await cadFileIndexerEngine.index({
              rootPaths,
              batchSize,
              maxDepth,
              outputPath,
            });
            result = {
              totalFiles: index.entries.length,
              schemaVersion: index.schemaVersion,
              generatedAt: index.generatedAt,
              diff: index.diff,
              source: "CADFileIndexerEngine.index",
            };
            break;
          }
          case "cad_index_load": {
            const { cadFileIndexerEngine } = await import("../../engines/CADFileIndexerEngine.js");
            const outputPath = params["output_path"] as string | undefined;
            const index = cadFileIndexerEngine.load(outputPath);
            if (!index) {
              result = { found: false, source: "CADFileIndexerEngine.load" };
            } else {
              result = {
                found: true,
                totalFiles: index.entries.length,
                schemaVersion: index.schemaVersion,
                generatedAt: index.generatedAt,
                source: "CADFileIndexerEngine.load",
              };
            }
            break;
          }
          case "cad_index_status": {
            const { cadFileIndexerEngine } = await import("../../engines/CADFileIndexerEngine.js");
            const outputPath = params["output_path"] as string | undefined;
            const index = cadFileIndexerEngine.load(outputPath);
            if (!index) {
              result = {
                indexed: false,
                totalFiles: 0,
                lastUpdated: null,
                source: "CADFileIndexerEngine.status",
              };
            } else {
              // Group by machine category
              const byCategory: Record<string, number> = {};
              const byFormat: Record<string, number> = {};
              const byCustomer: Record<string, number> = {};
              for (const e of index.entries) {
                byCategory[e.machineCategory] = (byCategory[e.machineCategory] || 0) + 1;
                byFormat[e.format] = (byFormat[e.format] || 0) + 1;
                byCustomer[e.customer] = (byCustomer[e.customer] || 0) + 1;
              }
              result = {
                indexed: true,
                totalFiles: index.entries.length,
                lastUpdated: index.generatedAt,
                byCategory,
                byFormat,
                topCustomers: Object.entries(byCustomer)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([name, count]) => ({ name, count })),
                source: "CADFileIndexerEngine.status",
              };
            }
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_index_scan"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADFileIndexerEngine wired successfully (3 actions)')
