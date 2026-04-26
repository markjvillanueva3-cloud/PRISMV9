#!/usr/bin/env python3
"""Wire CADGeometricAugmentationEngine to cadAutomationDispatcher - U-CUC51"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 geometric augmentation actions)
new_actions = '''  "cad_augment_geometry",
  "cad_augment_batch",
  "cad_augment_stats",
  "cad_augment_reset_stats",
  "cad_augment_configure",
  "cad_augment_get_config",
'''

# Find last action before ] as const
old_actions_end = b'"cad_regression_analyzer_hotspots",\r\n] as const;'
new_actions_end = b'"cad_regression_analyzer_hotspots",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_augment_geometry' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadGeometricAugmentationEngine
case_code = '''          case "cad_augment_geometry": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const source = params["source"] as Parameters<typeof cadGeometricAugmentationEngine.augment>[0];
            if (!source) {
              throw new Error("cad_augment_geometry requires 'source' (CADGeometry)");
            }
            const augmented = cadGeometricAugmentationEngine.augment(source);
            result = { augmented, count: augmented.length, source: "CADGeometricAugmentationEngine.augment" };
            break;
          }
          case "cad_augment_batch": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const sources = params["sources"] as Parameters<typeof cadGeometricAugmentationEngine.augmentBatch>[0];
            if (!sources || !Array.isArray(sources)) {
              throw new Error("cad_augment_batch requires 'sources' array (CADGeometry[])");
            }
            const batchResult = cadGeometricAugmentationEngine.augmentBatch(sources);
            result = { ...batchResult, source: "CADGeometricAugmentationEngine.augmentBatch" };
            break;
          }
          case "cad_augment_stats": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const stats = cadGeometricAugmentationEngine.getStats();
            result = { stats, source: "CADGeometricAugmentationEngine.getStats" };
            break;
          }
          case "cad_augment_reset_stats": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            cadGeometricAugmentationEngine.resetStats();
            result = { reset: true, source: "CADGeometricAugmentationEngine.resetStats" };
            break;
          }
          case "cad_augment_configure": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const config = params["config"] as Parameters<typeof cadGeometricAugmentationEngine.configure>[0];
            if (!config) {
              throw new Error("cad_augment_configure requires 'config'");
            }
            cadGeometricAugmentationEngine.configure(config);
            result = { configured: true, source: "CADGeometricAugmentationEngine.configure" };
            break;
          }
          case "cad_augment_get_config": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const config = cadGeometricAugmentationEngine.getConfig();
            result = { config, source: "CADGeometricAugmentationEngine.getConfig" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_augment_geometry"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADGeometricAugmentationEngine wired successfully (6 actions)')
