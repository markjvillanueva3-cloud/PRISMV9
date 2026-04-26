#!/usr/bin/env python3
"""Wire CADContentAddressableStoreEngine to cadAutomationDispatcher - U-CUC13"""

# Read file as binary
with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (11 actions)
new_actions = '''  "cad_cas_load",
  "cad_cas_persist",
  "cad_cas_upsert",
  "cad_cas_get",
  "cad_cas_get_by_path",
  "cad_cas_ingest",
  "cad_cas_verify",
  "cad_cas_detect_ip_leaks",
  "cad_cas_delete",
  "cad_cas_rebuild_meta",
  "cad_cas_list",
'''

# Insert after cad_assembly_persist in the ACTIONS array
old_actions_end = b'"cad_assembly_persist",\r\n] as const;'
new_actions_end = b'"cad_assembly_persist",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_cas_load' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements for CADContentAddressableStoreEngine
case_code = '''          case "cad_cas_load": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            const registry = engine.load();
            result = { registry, entryCount: Object.keys(registry.entries).length, source: "CADContentAddressableStoreEngine.load" };
            break;
          }
          case "cad_cas_persist": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            engine.persist();
            result = { persisted: true, source: "CADContentAddressableStoreEngine.persist" };
            break;
          }
          case "cad_cas_upsert": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_upsert requires 'content_hash' string");
            }
            const entry = engine.upsert({
              contentHash,
              paths: (params["paths"] as string[]) || [],
              size: (params["size"] as number) || 0,
              customer: (params["customer"] as string) || "UNKNOWN",
              source: (params["source"] as "import" | "local-scan" | "upload" | "migration") || "local-scan",
              visibility: (params["visibility"] as "private" | "shared" | "public") || "private",
              chunks: params["chunks"] as Array<{ offset: number; length: number; blake3: string }> | undefined,
            });
            engine.persist();
            result = { entry, source: "CADContentAddressableStoreEngine.upsert" };
            break;
          }
          case "cad_cas_get": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_get requires 'content_hash' string");
            }
            const entry = engine.get(contentHash);
            result = { entry: entry || null, found: !!entry, source: "CADContentAddressableStoreEngine.get" };
            break;
          }
          case "cad_cas_get_by_path": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const path = params["path"] as string;
            if (!path) {
              throw new Error("cad_cas_get_by_path requires 'path' string");
            }
            const entry = engine.getByPath(path);
            result = { entry: entry || null, found: !!entry, source: "CADContentAddressableStoreEngine.getByPath" };
            break;
          }
          case "cad_cas_ingest": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const path = params["path"] as string;
            if (!path) {
              throw new Error("cad_cas_ingest requires 'path' string");
            }
            const entry = engine.ingest(path);
            engine.persist();
            result = { entry, source: "CADContentAddressableStoreEngine.ingest" };
            break;
          }
          case "cad_cas_verify": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_verify requires 'content_hash' string");
            }
            const verification = engine.verifyIntegrity(contentHash);
            result = { ...verification, source: "CADContentAddressableStoreEngine.verifyIntegrity" };
            break;
          }
          case "cad_cas_detect_ip_leaks": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const leaks = engine.detectIPLeaks();
            result = { leaks, count: leaks.length, source: "CADContentAddressableStoreEngine.detectIPLeaks" };
            break;
          }
          case "cad_cas_delete": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_delete requires 'content_hash' string");
            }
            const deleted = engine.delete(contentHash);
            engine.persist();
            result = { deleted, contentHash, source: "CADContentAddressableStoreEngine.delete" };
            break;
          }
          case "cad_cas_rebuild_meta": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            engine.rebuildMeta();
            engine.persist();
            result = { rebuilt: true, source: "CADContentAddressableStoreEngine.rebuildMeta" };
            break;
          }
          case "cad_cas_list": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            const registry = engine.load();
            const entries = Object.values(registry.entries);
            result = { entries, count: entries.length, source: "CADContentAddressableStoreEngine.list" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_cas_load"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADContentAddressableStoreEngine wired successfully (11 actions)')
