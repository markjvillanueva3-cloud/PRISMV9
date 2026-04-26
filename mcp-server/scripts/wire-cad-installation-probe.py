#!/usr/bin/env python3
"""Wire CADInstallationProbeEngine to cadAutomationDispatcher - U-CUC41"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (3 installation probe actions)
new_actions = '''  "cad_install_probe",
  "cad_install_cached",
  "cad_install_invalidate",
'''

# Find last action before ] as const
old_actions_end = b'"cad_fs_cost_tenant",\r\n] as const;'
new_actions_end = b'"cad_fs_cost_tenant",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_install_probe' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadInstallationProbeEngine
case_code = '''          case "cad_install_probe": {
            const { cadInstallationProbeEngine } = await import("../../engines/CADInstallationProbeEngine.js");
            const forceRefresh = params["force_refresh"] as boolean | undefined;
            const probeResult = await cadInstallationProbeEngine.probe(forceRefresh);
            result = { probe: probeResult, source: "CADInstallationProbeEngine.probe" };
            break;
          }
          case "cad_install_cached": {
            const { cadInstallationProbeEngine } = await import("../../engines/CADInstallationProbeEngine.js");
            const cached = cadInstallationProbeEngine.getCached();
            result = { cached: cached ?? null, hasCached: !!cached, source: "CADInstallationProbeEngine.getCached" };
            break;
          }
          case "cad_install_invalidate": {
            const { cadInstallationProbeEngine } = await import("../../engines/CADInstallationProbeEngine.js");
            cadInstallationProbeEngine.invalidateCache();
            result = { invalidated: true, source: "CADInstallationProbeEngine.invalidateCache" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_install_probe"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADInstallationProbeEngine wired successfully (3 actions)')
