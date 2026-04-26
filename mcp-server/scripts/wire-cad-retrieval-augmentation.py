#!/usr/bin/env python3
"""Wire CADRetrievalAugmentationEngine to cadAutomationDispatcher - U-CUC25"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 actions)
new_actions = '''  "cad_rag_filter",
  "cad_rag_retrieve",
  "cad_rag_format",
  "cad_rag_rank",
  "cad_rag_augment",
  "cad_rag_stats",
'''

# Insert after cad_learning_reset in the ACTIONS array
old_actions_end = b'"cad_learning_reset",\r\n] as const;'
new_actions_end = b'"cad_learning_reset",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_rag_filter' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_rag_filter": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const corpus = params["corpus"] as Array<{
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: string;
              features?: string[];
            }>;
            const filters = params["filters"] as {
              customer?: string | string[];
              machineCategory?: string | string[];
              features?: string[];
              excludeIds?: string[];
            } | undefined;
            if (!corpus || !Array.isArray(corpus)) {
              throw new Error("cad_rag_filter requires 'corpus' array");
            }
            const filtered = cadRetrievalAugmentationEngine.filterCorpus(corpus, filters ?? {});
            result = { filtered, count: filtered.length, source: "CADRetrievalAugmentationEngine.filterCorpus" };
            break;
          }
          case "cad_rag_retrieve": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const query = params["query"] as {
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: string;
              features?: string[];
            };
            const corpus = params["corpus"] as Array<{
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: string;
              features?: string[];
            }>;
            const backend = (params["backend"] as string) ?? "count_vectorizer";
            const filters = params["filters"] as Record<string, unknown> | undefined;
            const k = (params["k"] as number) ?? 5;
            if (!query || !corpus) {
              throw new Error("cad_rag_retrieve requires 'query' and 'corpus'");
            }
            const results = cadRetrievalAugmentationEngine.retrieve(query, corpus, backend as any, filters as any, k);
            result = { results, count: results.length, source: "CADRetrievalAugmentationEngine.retrieve" };
            break;
          }
          case "cad_rag_format": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const ragResults = params["results"] as Array<{
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: string;
              features?: string[];
              distance: number;
              similarity: number;
            }>;
            const format = (params["format"] as string) ?? "json";
            if (!ragResults || !Array.isArray(ragResults)) {
              throw new Error("cad_rag_format requires 'results' array");
            }
            const formatted = cadRetrievalAugmentationEngine.formatExamples(ragResults, format as any);
            result = { ...formatted, source: "CADRetrievalAugmentationEngine.formatExamples" };
            break;
          }
          case "cad_rag_rank": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const ragResults = params["results"] as Array<{
              id: string;
              tokens: number[];
              features?: string[];
              distance: number;
              similarity: number;
            }>;
            const query = params["query"] as {
              id: string;
              tokens: number[];
              features?: string[];
            };
            const featureWeight = (params["feature_weight"] as number) ?? 0.3;
            if (!ragResults || !query) {
              throw new Error("cad_rag_rank requires 'results' and 'query'");
            }
            const ranked = cadRetrievalAugmentationEngine.rankByRelevance(ragResults, query, featureWeight);
            result = { ranked, count: ranked.length, source: "CADRetrievalAugmentationEngine.rankByRelevance" };
            break;
          }
          case "cad_rag_augment": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            // Note: augment requires an async generator callback which is complex to wire
            // This action returns a stub indicating the method signature
            result = {
              available: false,
              message: "cad_rag_augment requires an async generator callback. Use cad_rag_retrieve + cad_rag_format for the retrieval portion.",
              signature: "augment(query, corpus, backend, generator, filters?, k?, format?)",
              source: "CADRetrievalAugmentationEngine.augment"
            };
            break;
          }
          case "cad_rag_stats": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const corpus = params["corpus"] as Array<{
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: string;
            }>;
            if (!corpus || !Array.isArray(corpus)) {
              throw new Error("cad_rag_stats requires 'corpus' array");
            }
            const stats = cadRetrievalAugmentationEngine.getCorpusStats(corpus);
            const customers = cadRetrievalAugmentationEngine.getCustomers(corpus);
            result = { ...stats, customers, source: "CADRetrievalAugmentationEngine.getCorpusStats" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_rag_filter"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADRetrievalAugmentationEngine wired successfully (6 actions)')
