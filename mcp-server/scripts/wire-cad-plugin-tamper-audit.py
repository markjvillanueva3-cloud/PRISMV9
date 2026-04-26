#!/usr/bin/env python3
"""Wire CADPluginTamperAuditLogEngine to cadAutomationDispatcher - U-CUC44"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 tamper audit log actions)
new_actions = '''  "cad_audit_record",
  "cad_audit_query",
  "cad_audit_verify",
  "cad_audit_chain_info",
  "cad_audit_export",
  "cad_audit_clear",
'''

# Find last action before ] as const
old_actions_end = b'"cad_param_evaluate",\r\n] as const;'
new_actions_end = b'"cad_param_evaluate",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_audit_record' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - CADPluginTamperAuditLogEngine needs constructor options
case_code = '''          case "cad_audit_record": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const sessionId = params["session_id"] as string;
            const userId = params["user_id"] as string;
            const command = params["command"] as string;
            const args = params["args"] as Record<string, unknown> ?? {};
            const resultStatus = params["result"] as "success" | "failure" | "error";
            const durationMs = params["duration_ms"] as number;
            const metadata = params["metadata"] as Record<string, unknown> | undefined;
            if (!sessionId || !userId || !command || !resultStatus || durationMs === undefined) {
              throw new Error("cad_audit_record requires 'session_id', 'user_id', 'command', 'result', 'duration_ms'");
            }
            const entry = engine.recordCommand(sessionId, userId, command, args, resultStatus, durationMs, metadata);
            result = { entry, source: "CADPluginTamperAuditLogEngine.recordCommand" };
            break;
          }
          case "cad_audit_query": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const opts = {
              sessionId: params["session_id"] as string | undefined,
              userId: params["user_id"] as string | undefined,
              command: params["command"] as string | undefined,
              result: params["result"] as "success" | "failure" | "error" | undefined,
              startTime: params["start_time"] as string | undefined,
              endTime: params["end_time"] as string | undefined,
              limit: params["limit"] as number | undefined,
              offset: params["offset"] as number | undefined,
            };
            const entries = engine.queryEntries(opts);
            result = { entries, count: entries.length, source: "CADPluginTamperAuditLogEngine.queryEntries" };
            break;
          }
          case "cad_audit_verify": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const startIndex = params["start_index"] as number | undefined;
            const endIndex = params["end_index"] as number | undefined;
            const report = engine.verifyChainIntegrity(startIndex, endIndex);
            result = { report, source: "CADPluginTamperAuditLogEngine.verifyChainIntegrity" };
            break;
          }
          case "cad_audit_chain_info": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const info = engine.getChainInfo();
            result = { info, source: "CADPluginTamperAuditLogEngine.getChainInfo" };
            break;
          }
          case "cad_audit_export": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const format = params["format"] as "json" | "csv" | "jsonl";
            const startIndex = params["start_index"] as number | undefined;
            const endIndex = params["end_index"] as number | undefined;
            if (!format) {
              throw new Error("cad_audit_export requires 'format' (json|csv|jsonl)");
            }
            const exported = engine.exportLog(format, { startIndex, endIndex });
            result = { exported, source: "CADPluginTamperAuditLogEngine.exportLog" };
            break;
          }
          case "cad_audit_clear": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const clearedCount = engine.clearLog();
            result = { cleared: clearedCount, source: "CADPluginTamperAuditLogEngine.clearLog" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_audit_record"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADPluginTamperAuditLogEngine wired successfully (6 actions)')
