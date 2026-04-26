#!/usr/bin/env python3
"""Wire CADSearchUniversalEngine to cadAutomationDispatcher - U-CUC20"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 actions)
new_actions = '''  "cad_search_index",
  "cad_search_query",
  "cad_search_get",
  "cad_search_remove",
  "cad_search_clear",
  "cad_search_stats",
'''

# Insert after cad_accuracy_features in the ACTIONS array
old_actions_end = b'"cad_accuracy_features",\r\n] as const;'
new_actions_end = b'"cad_accuracy_features",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_search_index' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_search_index": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            const doc = params["document"] as {
              id: string;
              canonicalName: string;
              text?: string;
              embedding?: number[];
              perceptualHash?: string;
              spec: {
                material?: string;
                finish?: string;
                customer?: string;
                tags: string[];
                numericSpecs: Record<string, number>;
              };
            };
            if (!doc || !doc.id || !doc.canonicalName) {
              throw new Error("cad_search_index requires 'document' with id, canonicalName, and spec fields");
            }
            const indexed = cadSearchUniversalEngine.index(doc);
            result = { indexed, size: cadSearchUniversalEngine.size, source: "CADSearchUniversalEngine.index" };
            break;
          }
          case "cad_search_query": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            const query = params["query"] as {
              mode?: "full_text" | "semantic" | "visual" | "spec" | "tolerance" | "natural_language" | "unified";
              text?: string;
              embedding?: number[];
              perceptualHash?: string;
              specFilter?: { material?: string; finish?: string; customer?: string; tags?: string[] };
              toleranceRanges?: Array<{ key: string; min?: number; max?: number }>;
              naturalLanguage?: string;
              limit?: number;
            };
            if (!query) {
              throw new Error("cad_search_query requires 'query' object");
            }
            const results = cadSearchUniversalEngine.search(query);
            result = { results, count: results.length, source: "CADSearchUniversalEngine.search" };
            break;
          }
          case "cad_search_get": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            const id = params["id"] as string;
            if (!id) {
              throw new Error("cad_search_get requires 'id' string");
            }
            const doc = cadSearchUniversalEngine.get(id);
            result = { document: doc, found: !!doc, source: "CADSearchUniversalEngine.get" };
            break;
          }
          case "cad_search_remove": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            const id = params["id"] as string;
            if (!id) {
              throw new Error("cad_search_remove requires 'id' string");
            }
            const removed = cadSearchUniversalEngine.remove(id);
            result = { removed, size: cadSearchUniversalEngine.size, source: "CADSearchUniversalEngine.remove" };
            break;
          }
          case "cad_search_clear": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            cadSearchUniversalEngine.clear();
            result = { cleared: true, size: cadSearchUniversalEngine.size, source: "CADSearchUniversalEngine.clear" };
            break;
          }
          case "cad_search_stats": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            result = { size: cadSearchUniversalEngine.size, source: "CADSearchUniversalEngine.stats" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_search_index"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADSearchUniversalEngine wired successfully (6 actions)')
