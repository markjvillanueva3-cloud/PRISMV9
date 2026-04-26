#!/usr/bin/env python3
"""Wire CADFilesystemReconciliationEngine to cadAutomationDispatcher - U-CUC40"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (8 filesystem reconciliation actions - most useful subset)
new_actions = '''  "cad_fs_registry_upsert",
  "cad_fs_registry_get",
  "cad_fs_registry_list",
  "cad_fs_registry_remove",
  "cad_fs_reconcile",
  "cad_fs_aging_plan",
  "cad_fs_aging_apply",
  "cad_fs_cost_tenant",
'''

# Find last action before ] as const
old_actions_end = b'"cad_failure_group",\r\n] as const;'
new_actions_end = b'"cad_failure_group",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_fs_registry_upsert' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadFilesystemReconciliationEngine
case_code = '''          case "cad_fs_registry_upsert": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const entry = params["entry"] as Parameters<typeof cadFilesystemReconciliationEngine.upsertRegistryEntry>[0];
            if (!entry) {
              throw new Error("cad_fs_registry_upsert requires 'entry' (RegistryEntry)");
            }
            const upserted = cadFilesystemReconciliationEngine.upsertRegistryEntry(entry);
            result = { entry: upserted, source: "CADFilesystemReconciliationEngine.upsertRegistryEntry" };
            break;
          }
          case "cad_fs_registry_get": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_fs_registry_get requires 'content_hash'");
            }
            const entry = cadFilesystemReconciliationEngine.getRegistryEntry(contentHash);
            result = { entry: entry ?? null, found: !!entry, source: "CADFilesystemReconciliationEngine.getRegistryEntry" };
            break;
          }
          case "cad_fs_registry_list": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const entries = cadFilesystemReconciliationEngine.allEntries();
            result = { entries, count: entries.length, source: "CADFilesystemReconciliationEngine.allEntries" };
            break;
          }
          case "cad_fs_registry_remove": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_fs_registry_remove requires 'content_hash'");
            }
            const removed = cadFilesystemReconciliationEngine.removeRegistryEntry(contentHash);
            result = { removed, source: "CADFilesystemReconciliationEngine.removeRegistryEntry" };
            break;
          }
          case "cad_fs_reconcile": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const disk = params["disk"] as Parameters<typeof cadFilesystemReconciliationEngine.reconcile>[0];
            if (!disk || !Array.isArray(disk)) {
              throw new Error("cad_fs_reconcile requires 'disk' array (DiskEntry[])");
            }
            const report = cadFilesystemReconciliationEngine.reconcile(disk);
            result = { report, source: "CADFilesystemReconciliationEngine.reconcile" };
            break;
          }
          case "cad_fs_aging_plan": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const now = params["now"] as string | undefined;
            const transitions = cadFilesystemReconciliationEngine.planAging(now);
            result = { transitions, count: transitions.length, source: "CADFilesystemReconciliationEngine.planAging" };
            break;
          }
          case "cad_fs_aging_apply": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const transition = params["transition"] as Parameters<typeof cadFilesystemReconciliationEngine.applyTransition>[0];
            if (!transition) {
              throw new Error("cad_fs_aging_apply requires 'transition' (AgingTransition)");
            }
            const entry = cadFilesystemReconciliationEngine.applyTransition(transition);
            result = { entry, source: "CADFilesystemReconciliationEngine.applyTransition" };
            break;
          }
          case "cad_fs_cost_tenant": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const tenantId = params["tenant_id"] as string;
            const periodStart = params["period_start"] as string;
            const periodEnd = params["period_end"] as string;
            if (!tenantId || !periodStart || !periodEnd) {
              throw new Error("cad_fs_cost_tenant requires 'tenant_id', 'period_start', 'period_end'");
            }
            const ledger = cadFilesystemReconciliationEngine.costForTenant(tenantId, periodStart, periodEnd);
            result = { ledger, source: "CADFilesystemReconciliationEngine.costForTenant" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_fs_registry_upsert"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADFilesystemReconciliationEngine wired successfully (8 actions)')
