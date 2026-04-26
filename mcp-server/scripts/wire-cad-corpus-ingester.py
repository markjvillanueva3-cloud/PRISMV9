#!/usr/bin/env python3
"""Wire CADCorpusIngesterEngine to cadAutomationDispatcher - U-CUC37"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (5 corpus actions)
new_actions = '''  "cad_corpus_classify",
  "cad_corpus_ingest",
  "cad_corpus_dedup",
  "cad_corpus_stats",
  "cad_corpus_jsonl",
'''

# Find last action before ] as const
old_actions_end = b'"cad_bundle_verify",\r\n] as const;'
new_actions_end = b'"cad_bundle_verify",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_corpus_classify' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - use inferred types from Parameters<>
case_code = '''          case "cad_corpus_classify": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const path = params["path"] as string;
            const bytes = params["bytes"] as number;
            if (!path || bytes === undefined) {
              throw new Error("cad_corpus_classify requires 'path' and 'bytes'");
            }
            const entry = cadCorpusIngesterEngine.classify(path, bytes);
            result = { entry: entry ?? null, classified: !!entry, source: "CADCorpusIngesterEngine.classify" };
            break;
          }
          case "cad_corpus_ingest": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const rawEntries = params["entries"];
            if (!rawEntries || !Array.isArray(rawEntries)) {
              throw new Error("cad_corpus_ingest requires 'entries' array");
            }
            const ingestResult = cadCorpusIngesterEngine.ingest(rawEntries as Parameters<typeof cadCorpusIngesterEngine.ingest>[0]);
            result = { ...ingestResult, source: "CADCorpusIngesterEngine.ingest" };
            break;
          }
          case "cad_corpus_dedup": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const rawEntries = params["entries"];
            if (!rawEntries || !Array.isArray(rawEntries)) {
              throw new Error("cad_corpus_dedup requires 'entries' array");
            }
            const deduped = cadCorpusIngesterEngine.dedup(rawEntries as Parameters<typeof cadCorpusIngesterEngine.dedup>[0]);
            result = { entries: deduped, removed: rawEntries.length - deduped.length, source: "CADCorpusIngesterEngine.dedup" };
            break;
          }
          case "cad_corpus_stats": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const rawEntries = params["entries"];
            if (!rawEntries || !Array.isArray(rawEntries)) {
              throw new Error("cad_corpus_stats requires 'entries' array");
            }
            const stats = cadCorpusIngesterEngine.stats(rawEntries as Parameters<typeof cadCorpusIngesterEngine.stats>[0]);
            result = { stats, source: "CADCorpusIngesterEngine.stats" };
            break;
          }
          case "cad_corpus_jsonl": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const rawEntries = params["entries"];
            if (!rawEntries || !Array.isArray(rawEntries)) {
              throw new Error("cad_corpus_jsonl requires 'entries' array");
            }
            const jsonl = cadCorpusIngesterEngine.toJsonl(rawEntries as Parameters<typeof cadCorpusIngesterEngine.toJsonl>[0]);
            result = { jsonl, lines: rawEntries.length, source: "CADCorpusIngesterEngine.toJsonl" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_corpus_classify"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADCorpusIngesterEngine wired successfully (5 actions)')
