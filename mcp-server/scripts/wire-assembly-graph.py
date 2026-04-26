#!/usr/bin/env python3
"""Wire CADAssemblyGraphEngine to cadAutomationDispatcher - U-CUC12"""

# Read file as binary
with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# Case statements for CADAssemblyGraphEngine (16 actions)
case_code = '''          case "cad_assembly_add_node": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            const componentType = params["component_type"] as string;
            if (!partId) {
              throw new Error("cad_assembly_add_node requires 'part_id' string");
            }
            const node = engine.addNode({
              partId,
              componentType: componentType as Parameters<typeof engine.addNode>[0]["componentType"],
              name: (params["name"] as string) || partId,
              paths: (params["paths"] as string[]) || [],
              contentHash: params["content_hash"] as string | undefined,
              tags: (params["tags"] as string[]) || [],
              customer: (params["customer"] as string) || "UNKNOWN",
            });
            engine.persist();
            result = { node, source: "CADAssemblyGraphEngine.addNode" };
            break;
          }
          case "cad_assembly_add_ref": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const parentId = params["parent_id"] as string;
            const childId = params["child_id"] as string;
            if (!parentId || !childId) {
              throw new Error("cad_assembly_add_ref requires 'parent_id' and 'child_id' strings");
            }
            const ref = engine.addReference({
              parentId,
              childId,
              quantity: (params["quantity"] as number) || 1,
              childContentHash: params["child_content_hash"] as string | undefined,
            });
            engine.persist();
            result = { reference: ref, source: "CADAssemblyGraphEngine.addReference" };
            break;
          }
          case "cad_assembly_remove_node": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_remove_node requires 'part_id' string");
            }
            const removed = engine.removeNode(partId);
            engine.persist();
            result = { removed, partId, source: "CADAssemblyGraphEngine.removeNode" };
            break;
          }
          case "cad_assembly_get_children": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_get_children requires 'part_id' string");
            }
            const children = engine.getChildren(partId);
            result = { children, count: children.length, source: "CADAssemblyGraphEngine.getChildren" };
            break;
          }
          case "cad_assembly_get_parents": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_get_parents requires 'part_id' string");
            }
            const parents = engine.getParents(partId);
            result = { parents, count: parents.length, source: "CADAssemblyGraphEngine.getParents" };
            break;
          }
          case "cad_assembly_descendants": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_descendants requires 'part_id' string");
            }
            const maxDepth = (params["max_depth"] as number) || 64;
            const descendants = engine.getDescendants(partId, maxDepth);
            result = { descendants, count: descendants.length, source: "CADAssemblyGraphEngine.getDescendants" };
            break;
          }
          case "cad_assembly_ancestors": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_ancestors requires 'part_id' string");
            }
            const maxDepth = (params["max_depth"] as number) || 64;
            const ancestors = engine.getAncestors(partId, maxDepth);
            result = { ancestors, count: ancestors.length, source: "CADAssemblyGraphEngine.getAncestors" };
            break;
          }
          case "cad_assembly_broken_refs": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const broken = engine.findBrokenReferences();
            result = { broken, count: broken.length, source: "CADAssemblyGraphEngine.findBrokenReferences" };
            break;
          }
          case "cad_assembly_heal": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const healedCount = engine.healByContentHash();
            engine.persist();
            result = { healedCount, source: "CADAssemblyGraphEngine.healByContentHash" };
            break;
          }
          case "cad_assembly_detect_cycles": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const cycles = engine.detectCycles();
            result = { cycles, hasCycles: cycles.length > 0, count: cycles.length, source: "CADAssemblyGraphEngine.detectCycles" };
            break;
          }
          case "cad_assembly_impact": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_impact requires 'part_id' string");
            }
            const impact = engine.impactAnalysis(partId);
            result = { ...impact, source: "CADAssemblyGraphEngine.impactAnalysis" };
            break;
          }
          case "cad_assembly_list_nodes": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const nodes = engine.listNodes();
            result = { nodes, count: nodes.length, source: "CADAssemblyGraphEngine.listNodes" };
            break;
          }
          case "cad_assembly_list_edges": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const edges = engine.listEdges();
            result = { edges, count: edges.length, source: "CADAssemblyGraphEngine.listEdges" };
            break;
          }
          case "cad_assembly_snapshot": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const snapshot = engine.snapshot();
            result = { snapshot, source: "CADAssemblyGraphEngine.snapshot" };
            break;
          }
          case "cad_assembly_load": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            result = { loaded: true, nodeCount: engine.nodeCount, edgeCount: engine.edgeCount, source: "CADAssemblyGraphEngine.load" };
            break;
          }
          case "cad_assembly_persist": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            engine.persist();
            result = { persisted: true, nodeCount: engine.nodeCount, edgeCount: engine.edgeCount, source: "CADAssemblyGraphEngine.persist" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

# Verify
if b'cad_assembly_add_node' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('Case statements added successfully')
