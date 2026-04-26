#!/usr/bin/env python3
"""Wire CADBundleReplayCompareEngine to cadAutomationDispatcher - U-CUC35"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (8 replay/compare actions)
new_actions = '''  "cad_bundle_register",
  "cad_bundle_get",
  "cad_bundle_list",
  "cad_bundle_diff",
  "cad_bundle_search",
  "cad_bundle_retrain_list",
  "cad_bundle_retrain_drain",
'''

# Find last action before ] as const
old_actions_end = b'"cad_artifact_prune",\r\n] as const;'
new_actions_end = b'"cad_artifact_prune",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_bundle_register' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_bundle_register": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const bundle = params["bundle"] as { bundleId: string; operations: unknown[] };
            if (!bundle || !bundle.bundleId) {
              throw new Error("cad_bundle_register requires 'bundle' with 'bundleId'");
            }
            const registered = engine.registerBundle(bundle as Parameters<typeof engine.registerBundle>[0]);
            result = { bundle: registered, source: "CADBundleReplayCompareEngine.registerBundle" };
            break;
          }
          case "cad_bundle_get": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const bundleId = params["bundle_id"] as string;
            if (!bundleId) {
              throw new Error("cad_bundle_get requires 'bundle_id'");
            }
            const bundle = engine.getBundle(bundleId);
            result = { bundle: bundle ?? null, found: !!bundle, source: "CADBundleReplayCompareEngine.getBundle" };
            break;
          }
          case "cad_bundle_list": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const bundles = engine.listBundles();
            result = { bundles, count: bundles.length, source: "CADBundleReplayCompareEngine.listBundles" };
            break;
          }
          case "cad_bundle_diff": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const leftId = params["left_bundle_id"] as string;
            const rightId = params["right_bundle_id"] as string;
            if (!leftId || !rightId) {
              throw new Error("cad_bundle_diff requires 'left_bundle_id' and 'right_bundle_id'");
            }
            const diff = engine.diff(leftId, rightId);
            result = { diff, source: "CADBundleReplayCompareEngine.diff" };
            break;
          }
          case "cad_bundle_search": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const kinds = params["kinds"] as string[] | undefined;
            const paramEquals = params["param_equals"] as Record<string, unknown> | undefined;
            const limit = params["limit"] as number | undefined;
            const hits = engine.search({ kinds: kinds as Parameters<typeof engine.search>[0]["kinds"], paramEquals: paramEquals as Parameters<typeof engine.search>[0]["paramEquals"], limit });
            result = { hits, count: hits.length, source: "CADBundleReplayCompareEngine.search" };
            break;
          }
          case "cad_bundle_retrain_list": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const entries = engine.retrainEntries();
            result = { entries, count: entries.length, source: "CADBundleReplayCompareEngine.retrainEntries" };
            break;
          }
          case "cad_bundle_retrain_drain": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const entries = engine.drainRetrainQueue();
            result = { entries, count: entries.length, source: "CADBundleReplayCompareEngine.drainRetrainQueue" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_bundle_register"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADBundleReplayCompareEngine wired successfully (7 actions)')
