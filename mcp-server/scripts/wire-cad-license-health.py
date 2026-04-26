#!/usr/bin/env python3
"""Wire CADLicenseHealthEngine to cadAutomationDispatcher - U-CUC42"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (12 license health actions - most useful subset)
new_actions = '''  "cad_license_server_add",
  "cad_license_server_list",
  "cad_license_server_check",
  "cad_license_features_refresh",
  "cad_license_features_list",
  "cad_license_utilization",
  "cad_license_users_active",
  "cad_license_contention_record",
  "cad_license_contention_history",
  "cad_license_alerts",
  "cad_license_alert_ack",
  "cad_license_health_summary",
'''

# Find last action before ] as const
old_actions_end = b'"cad_install_invalidate",\r\n] as const;'
new_actions_end = b'"cad_install_invalidate",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_license_server_add' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - CADLicenseHealthEngine requires transport in constructor
# We use a no-op transport for read-only operations
case_code = '''          case "cad_license_server_add": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            const serverType = params["server_type"] as "FlexLM" | "RLM" | "DSLS" | "Sentinel" | "CodeMeter" | "LUM" | "Native";
            const host = params["host"] as string;
            const port = params["port"] as number;
            if (!serverId || !serverType || !host || !port) {
              throw new Error("cad_license_server_add requires 'server_id', 'server_type', 'host', 'port'");
            }
            engine.addServer(serverId, serverType, host, port);
            result = { added: true, serverId, source: "CADLicenseHealthEngine.addServer" };
            break;
          }
          case "cad_license_server_list": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const servers = engine.listServers();
            result = { servers, count: servers.length, source: "CADLicenseHealthEngine.listServers" };
            break;
          }
          case "cad_license_server_check": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            if (!serverId) {
              throw new Error("cad_license_server_check requires 'server_id'");
            }
            const server = engine.checkServer(serverId);
            result = { server: server ?? null, online: server?.isOnline ?? false, source: "CADLicenseHealthEngine.checkServer" };
            break;
          }
          case "cad_license_features_refresh": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            if (!serverId) {
              throw new Error("cad_license_features_refresh requires 'server_id'");
            }
            const features = engine.refreshFeatures(serverId);
            result = { features, count: features.length, source: "CADLicenseHealthEngine.refreshFeatures" };
            break;
          }
          case "cad_license_features_list": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string | undefined;
            const features = engine.listFeatures(serverId);
            result = { features, count: features.length, source: "CADLicenseHealthEngine.listFeatures" };
            break;
          }
          case "cad_license_utilization": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            const featureId = params["feature_id"] as string;
            if (!serverId || !featureId) {
              throw new Error("cad_license_utilization requires 'server_id' and 'feature_id'");
            }
            const utilization = engine.getFeatureUtilization(serverId, featureId);
            result = { utilization, source: "CADLicenseHealthEngine.getFeatureUtilization" };
            break;
          }
          case "cad_license_users_active": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            const featureId = params["feature_id"] as string | undefined;
            if (!serverId) {
              throw new Error("cad_license_users_active requires 'server_id'");
            }
            const users = engine.getActiveUsers(serverId, featureId);
            result = { users, count: users.length, source: "CADLicenseHealthEngine.getActiveUsers" };
            break;
          }
          case "cad_license_contention_record": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const featureId = params["feature_id"] as string;
            const userId = params["user_id"] as string;
            const queueDepth = params["queue_depth"] as number;
            const waitTimeMs = params["wait_time_ms"] as number;
            if (!featureId || !userId || queueDepth === undefined || waitTimeMs === undefined) {
              throw new Error("cad_license_contention_record requires 'feature_id', 'user_id', 'queue_depth', 'wait_time_ms'");
            }
            const event = engine.recordContention(featureId, userId, queueDepth, waitTimeMs);
            result = { event, source: "CADLicenseHealthEngine.recordContention" };
            break;
          }
          case "cad_license_contention_history": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const featureId = params["feature_id"] as string | undefined;
            const limit = params["limit"] as number | undefined;
            const events = engine.getContentionHistory({ featureId, limit });
            result = { events, count: events.length, source: "CADLicenseHealthEngine.getContentionHistory" };
            break;
          }
          case "cad_license_alerts": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const acknowledged = params["acknowledged"] as boolean | undefined;
            const severity = params["severity"] as string | undefined;
            const alerts = engine.getAlerts({ acknowledged, severity });
            result = { alerts, count: alerts.length, source: "CADLicenseHealthEngine.getAlerts" };
            break;
          }
          case "cad_license_alert_ack": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const alertId = params["alert_id"] as string;
            if (!alertId) {
              throw new Error("cad_license_alert_ack requires 'alert_id'");
            }
            const acked = engine.acknowledgeAlert(alertId);
            result = { acknowledged: acked, source: "CADLicenseHealthEngine.acknowledgeAlert" };
            break;
          }
          case "cad_license_health_summary": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const summary = engine.getHealthSummary();
            result = { summary, source: "CADLicenseHealthEngine.getHealthSummary" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_license_server_add"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADLicenseHealthEngine wired successfully (12 actions)')
