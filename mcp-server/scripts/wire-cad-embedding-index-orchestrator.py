#!/usr/bin/env python3
"""Wire CADEmbeddingIndexOrchestratorEngine to cadAutomationDispatcher - U-CUC28"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (5 actions)
new_actions = '''  "cad_index_ingest",
  "cad_index_query",
  "cad_index_similar",
  "cad_index_stats_orch",
  "cad_index_clear",
'''

# Insert after cad_embed_cache_clear in the ACTIONS array
old_actions_end = b'"cad_embed_cache_clear",\r\n] as const;'
new_actions_end = b'"cad_embed_cache_clear",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_index_ingest' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_index_ingest": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            const corpusPath = params["corpus_path"] as string;
            const config = params["config"] as { indexType?: "flat" | "vptree"; metric?: string; maxEntries?: number } | undefined;
            if (!corpusPath) {
              throw new Error("cad_index_ingest requires 'corpus_path' string");
            }
            const ingestResult = cadEmbeddingIndexOrchestratorEngine.ingest(corpusPath, config);
            result = { ...ingestResult, source: "CADEmbeddingIndexOrchestratorEngine.ingest" };
            break;
          }
          case "cad_index_query": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            const query = params["query"] as string;
            const k = (params["k"] as number) ?? 10;
            const extensions = params["extensions"] as string[] | undefined;
            const minBytes = params["min_bytes"] as number | undefined;
            const maxBytes = params["max_bytes"] as number | undefined;
            if (!query) {
              throw new Error("cad_index_query requires 'query' string");
            }
            const results = cadEmbeddingIndexOrchestratorEngine.query({ query, k, extensions, minBytes, maxBytes });
            result = { results, count: results.length, source: "CADEmbeddingIndexOrchestratorEngine.query" };
            break;
          }
          case "cad_index_similar": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            const sourcePath = params["source_path"] as string;
            const k = (params["k"] as number) ?? 5;
            if (!sourcePath) {
              throw new Error("cad_index_similar requires 'source_path' string");
            }
            const similar = cadEmbeddingIndexOrchestratorEngine.findSimilar(sourcePath, k);
            result = { similar, count: similar.length, source: "CADEmbeddingIndexOrchestratorEngine.findSimilar" };
            break;
          }
          case "cad_index_stats_orch": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            const stats = cadEmbeddingIndexOrchestratorEngine.stats();
            result = { ...stats, source: "CADEmbeddingIndexOrchestratorEngine.stats" };
            break;
          }
          case "cad_index_clear": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            cadEmbeddingIndexOrchestratorEngine.clear();
            result = { cleared: true, source: "CADEmbeddingIndexOrchestratorEngine.clear" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_index_ingest"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADEmbeddingIndexOrchestratorEngine wired successfully (5 actions)')
