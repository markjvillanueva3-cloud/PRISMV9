#!/usr/bin/env python3
"""Fix cad_cas_ingest and cad_cas_verify to read file content before calling engine"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# Fix cad_cas_ingest: needs to read file content
old_ingest = b'''          case "cad_cas_ingest": {
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
          }'''

new_ingest = b'''          case "cad_cas_ingest": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const fs = await import("fs");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const absolutePath = params["path"] as string;
            if (!absolutePath) {
              throw new Error("cad_cas_ingest requires 'path' string");
            }
            if (!fs.existsSync(absolutePath)) {
              throw new Error(`cad_cas_ingest: file not found: ${absolutePath}`);
            }
            const content = fs.readFileSync(absolutePath);
            const entry = engine.ingest(absolutePath, content, {
              source: (params["source"] as "initial_scan" | "intake_queue" | "customer_upload" | "migration_import" | "manual") || "initial_scan",
              customer: (params["customer"] as string) || "UNKNOWN",
              visibility: (params["visibility"] as "private" | "shared" | "public") || "private",
              tags: (params["tags"] as string[]) || [],
            });
            engine.persist();
            result = { entry, source: "CADContentAddressableStoreEngine.ingest" };
            break;
          }'''

raw = raw.replace(old_ingest.replace(b'\n', b'\r\n'), new_ingest.replace(b'\n', b'\r\n'))

# Fix cad_cas_verify: needs to read file content
old_verify = b'''          case "cad_cas_verify": {
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
          }'''

new_verify = b'''          case "cad_cas_verify": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const fs = await import("fs");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            const filePath = params["path"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_verify requires 'content_hash' string");
            }
            if (!filePath) {
              throw new Error("cad_cas_verify requires 'path' string to read file content");
            }
            if (!fs.existsSync(filePath)) {
              throw new Error(`cad_cas_verify: file not found: ${filePath}`);
            }
            const content = fs.readFileSync(filePath);
            const verification = engine.verifyIntegrity(contentHash, content);
            engine.persist();
            result = { ...verification, source: "CADContentAddressableStoreEngine.verifyIntegrity" };
            break;
          }'''

raw = raw.replace(old_verify.replace(b'\n', b'\r\n'), new_verify.replace(b'\n', b'\r\n'))

# Verify replacements worked
if b'fs.readFileSync(absolutePath)' not in raw:
    print('ERROR: cad_cas_ingest fix failed')
    exit(1)
if b'fs.readFileSync(filePath)' not in raw:
    print('ERROR: cad_cas_verify fix failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('Fixed cad_cas_ingest and cad_cas_verify to read file content')
