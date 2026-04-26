#!/usr/bin/env python3
"""Wire CADKernelEngine to cadAutomationDispatcher - U-CUC29"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 key geometry actions)
new_actions = '''  "cad_kernel_eval_nurbs",
  "cad_kernel_compute_aabb",
  "cad_kernel_ray_intersect",
  "cad_kernel_mesh_volume",
  "cad_kernel_mesh_area",
  "cad_kernel_generate_box",
'''

# Insert after cad_index_clear in the ACTIONS array
old_actions_end = b'"cad_index_clear",\r\n] as const;'
new_actions_end = b'"cad_index_clear",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_kernel_eval_nurbs' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_kernel_eval_nurbs": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const curve = params["curve"] as {
              degree: number;
              controlPoints: Array<{ x: number; y: number; z: number; w?: number }>;
              knots: number[];
            };
            const t = params["t"] as number;
            if (!curve || t === undefined) {
              throw new Error("cad_kernel_eval_nurbs requires 'curve' and 't' parameter");
            }
            const point = cadKernelEngine.evaluateNURBSCurve(curve, t);
            result = { point, source: "CADKernelEngine.evaluateNURBSCurve" };
            break;
          }
          case "cad_kernel_compute_aabb": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const points = params["points"] as Array<{ x: number; y: number; z: number }>;
            if (!points || !Array.isArray(points)) {
              throw new Error("cad_kernel_compute_aabb requires 'points' array");
            }
            const aabb = cadKernelEngine.computeAABB(points);
            result = { aabb, source: "CADKernelEngine.computeAABB" };
            break;
          }
          case "cad_kernel_ray_intersect": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const ray = params["ray"] as { origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } };
            const aabb = params["aabb"] as { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
            if (!ray || !aabb) {
              throw new Error("cad_kernel_ray_intersect requires 'ray' and 'aabb' objects");
            }
            const intersection = cadKernelEngine.rayAABBIntersect(ray, aabb);
            result = { ...intersection, source: "CADKernelEngine.rayAABBIntersect" };
            break;
          }
          case "cad_kernel_mesh_volume": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const mesh = params["mesh"] as {
              vertices: Array<{ x: number; y: number; z: number }>;
              triangles: Array<[number, number, number]>;
            };
            if (!mesh) {
              throw new Error("cad_kernel_mesh_volume requires 'mesh' with vertices and triangles");
            }
            const volume = cadKernelEngine.meshVolume(mesh);
            result = { volume, source: "CADKernelEngine.meshVolume" };
            break;
          }
          case "cad_kernel_mesh_area": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const mesh = params["mesh"] as {
              vertices: Array<{ x: number; y: number; z: number }>;
              triangles: Array<[number, number, number]>;
            };
            if (!mesh) {
              throw new Error("cad_kernel_mesh_area requires 'mesh' with vertices and triangles");
            }
            const area = cadKernelEngine.meshSurfaceArea(mesh);
            result = { area, source: "CADKernelEngine.meshSurfaceArea" };
            break;
          }
          case "cad_kernel_generate_box": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const width = (params["width"] as number) ?? 1;
            const height = (params["height"] as number) ?? 1;
            const depth = (params["depth"] as number) ?? 1;
            const mesh = cadKernelEngine.generateBox(width, height, depth);
            result = { mesh, source: "CADKernelEngine.generateBox" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_kernel_eval_nurbs"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADKernelEngine wired successfully (6 actions)')
