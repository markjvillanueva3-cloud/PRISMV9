#!/usr/bin/env python3
"""Wire CADPreviewThumbnailCacheEngine to cadAutomationDispatcher - U-CUC32"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (4 thumbnail actions)
new_actions = '''  "cad_thumb_get",
  "cad_thumb_has",
  "cad_thumb_list",
  "cad_thumb_invalidate",
'''

# Insert after cad_feature_extract in the ACTIONS array
old_actions_end = b'"cad_feature_extract",\r\n] as const;'
new_actions_end = b'"cad_feature_extract",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_thumb_get' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_thumb_get": {
            const { cadPreviewThumbnailCacheEngine } = await import("../../engines/CADPreviewThumbnailCacheEngine.js");
            const contentHash = params["content_hash"] as string;
            const view = params["view"] as "front" | "top" | "iso" | "custom";
            if (!contentHash || !view) {
              throw new Error("cad_thumb_get requires 'content_hash' and 'view'");
            }
            const entry = cadPreviewThumbnailCacheEngine.get(contentHash, view);
            result = { entry: entry ?? null, found: !!entry, source: "CADPreviewThumbnailCacheEngine.get" };
            break;
          }
          case "cad_thumb_has": {
            const { cadPreviewThumbnailCacheEngine } = await import("../../engines/CADPreviewThumbnailCacheEngine.js");
            const contentHash = params["content_hash"] as string;
            const view = params["view"] as "front" | "top" | "iso" | "custom";
            if (!contentHash || !view) {
              throw new Error("cad_thumb_has requires 'content_hash' and 'view'");
            }
            const exists = cadPreviewThumbnailCacheEngine.has(contentHash, view);
            result = { exists, source: "CADPreviewThumbnailCacheEngine.has" };
            break;
          }
          case "cad_thumb_list": {
            const { cadPreviewThumbnailCacheEngine } = await import("../../engines/CADPreviewThumbnailCacheEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_thumb_list requires 'content_hash'");
            }
            const entries = cadPreviewThumbnailCacheEngine.listByHash(contentHash);
            result = { entries, count: entries.length, source: "CADPreviewThumbnailCacheEngine.listByHash" };
            break;
          }
          case "cad_thumb_invalidate": {
            const { cadPreviewThumbnailCacheEngine } = await import("../../engines/CADPreviewThumbnailCacheEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_thumb_invalidate requires 'content_hash'");
            }
            const removed = cadPreviewThumbnailCacheEngine.invalidateHash(contentHash);
            result = { removed, source: "CADPreviewThumbnailCacheEngine.invalidateHash" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_thumb_get"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADPreviewThumbnailCacheEngine wired successfully (4 actions)')
