#!/usr/bin/env python3
"""Wire CADFeatureEmbeddingEngine to cadAutomationDispatcher - U-CUC27"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (5 actions)
new_actions = '''  "cad_embed",
  "cad_embed_batch",
  "cad_embed_build_index",
  "cad_embed_search",
  "cad_embed_cache_clear",
'''

# Insert after cad_pipeline_status in the ACTIONS array
old_actions_end = b'"cad_pipeline_status",\r\n] as const;'
new_actions_end = b'"cad_pipeline_status",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_embed' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_embed": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            // Note: embed requires an EmbeddingBackend which is complex to wire via JSON
            // Return signature info - use cad_embed_build_index for full pipeline
            result = {
              available: false,
              message: "cad_embed requires an EmbeddingBackend instance. Use CADEmbeddingIndexOrchestratorEngine for the full pipeline.",
              signature: "embed(tokens: number[], backend: EmbeddingBackend, config?: EmbedConfig)",
              cacheStats: cadFeatureEmbeddingEngine.cacheStats(),
              source: "CADFeatureEmbeddingEngine.embed"
            };
            break;
          }
          case "cad_embed_batch": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            result = {
              available: false,
              message: "cad_embed_batch requires an EmbeddingBackend instance. Use CADEmbeddingIndexOrchestratorEngine for the full pipeline.",
              signature: "embedBatch(corpus: number[][], backend: EmbeddingBackend, config?: EmbedConfig)",
              cacheStats: cadFeatureEmbeddingEngine.cacheStats(),
              source: "CADFeatureEmbeddingEngine.embedBatch"
            };
            break;
          }
          case "cad_embed_build_index": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            // Building index requires pre-computed embeddings
            result = {
              available: false,
              message: "cad_embed_build_index requires pre-computed IndexedEmbedding[]. Use CADEmbeddingIndexOrchestratorEngine.ingest() for the full pipeline.",
              signature: "buildIndex(embeddings: IndexedEmbedding[], type: 'flat' | 'vptree', metric: SimilarityMetric)",
              source: "CADFeatureEmbeddingEngine.buildIndex"
            };
            break;
          }
          case "cad_embed_search": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            result = {
              available: false,
              message: "cad_embed_search requires an embedding query and index. Use CADEmbeddingIndexOrchestratorEngine.query() for text-based search.",
              signature: "search(query: Embedding, index: SimilarityIndex, k: number, metric: SimilarityMetric)",
              source: "CADFeatureEmbeddingEngine.search"
            };
            break;
          }
          case "cad_embed_cache_clear": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            const cleared = cadFeatureEmbeddingEngine.clearCache();
            result = { ...cleared, source: "CADFeatureEmbeddingEngine.clearCache" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_embed"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADFeatureEmbeddingEngine wired successfully (5 actions)')
