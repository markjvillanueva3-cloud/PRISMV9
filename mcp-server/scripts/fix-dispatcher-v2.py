#!/usr/bin/env python3
"""Fix cadAutomationDispatcher type errors - v2"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# Fix 1: CADKnowledgeGraphEngine - use singleton instead of constructor
old_pattern1 = b'const { CADKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");\r\n            const engine = new CADKnowledgeGraphEngine();'
new_pattern1 = b'const { cadKnowledgeGraphEngine: engine } = await import("../../engines/CADKnowledgeGraphEngine.js");'

count1 = raw.count(old_pattern1)
print(f'CADKnowledgeGraphEngine pattern found {count1} times')
raw = raw.replace(old_pattern1, new_pattern1)

# Fix 2: cad_assembly_add_ref - remove quantity, use instanceName
old_pattern2 = b'quantity: (params["quantity"] as number) || 1,'
new_pattern2 = b'instanceName: params["instance_name"] as string | undefined,'

count2 = raw.count(old_pattern2)
print(f'quantity pattern found {count2} times')
raw = raw.replace(old_pattern2, new_pattern2)

# Fix 3: cad_cas_upsert - fix to use absolutePath, format, sizeBytes
# Find and replace the upsert object construction
old_upsert = b'''            const entry = engine.upsert({
              contentHash,
              paths: (params["paths"] as string[]) || [],
              size: (params["size"] as number) || 0,
              customer: (params["customer"] as string) || "UNKNOWN",
              source: (params["source"] as "initial_scan" | "intake_queue" | "customer_upload" | "migration_import" | "manual") || "initial_scan",
              visibility: (params["visibility"] as "private" | "shared" | "public") || "private",
              chunks: params["chunks"] as Array<{ offset: number; size: number; blake3: string }> | undefined,
            });'''

new_upsert = b'''            const absolutePath = params["path"] as string;
            const format = params["format"] as string || ".unknown";
            const sizeBytes = (params["size_bytes"] as number) || 0;
            if (!absolutePath) {
              throw new Error("cad_cas_upsert requires 'path' string (absolute file path)");
            }
            const entry = engine.upsert({
              contentHash,
              absolutePath,
              format,
              sizeBytes,
              source: (params["source"] as "initial_scan" | "intake_queue" | "customer_upload" | "migration_import" | "manual") || "initial_scan",
              customer: (params["customer"] as string) || "UNKNOWN",
              visibility: (params["visibility"] as "private" | "shared" | "public") || "private",
              tags: (params["tags"] as string[]) || [],
              chunks: params["chunks"] as Array<{ offset: number; size: number; blake3: string }> | undefined,
            });'''

count3 = raw.count(old_upsert.replace(b'\n', b'\r\n'))
print(f'upsert pattern found {count3} times')
raw = raw.replace(old_upsert.replace(b'\n', b'\r\n'), new_upsert.replace(b'\n', b'\r\n'))

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print(f'Applied fixes: KG={count1}, qty={count2}, upsert={count3}')
