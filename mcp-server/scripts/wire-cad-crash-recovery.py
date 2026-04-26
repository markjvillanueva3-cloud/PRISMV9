#!/usr/bin/env python3
"""Wire CADCrashRecoveryEngine to cadAutomationDispatcher - U-CUC38"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (12 crash recovery actions - most useful subset)
new_actions = '''  "cad_crash_session_list",
  "cad_crash_session_get",
  "cad_crash_health_check",
  "cad_crash_checkpoint_create",
  "cad_crash_checkpoint_get",
  "cad_crash_checkpoint_list",
  "cad_crash_journal_get",
  "cad_crash_history",
  "cad_crash_policy_get",
  "cad_crash_policy_set",
'''

# Find last action before ] as const
old_actions_end = b'"cad_corpus_jsonl",\r\n] as const;'
new_actions_end = b'"cad_corpus_jsonl",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_crash_session_list' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - note: CADCrashRecoveryEngine requires transport in constructor
# We'll use a no-op transport for read-only queries
case_code = '''          case "cad_crash_session_list": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessions = engine.listSessions();
            result = { sessions, count: sessions.length, source: "CADCrashRecoveryEngine.listSessions" };
            break;
          }
          case "cad_crash_session_get": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            if (!sessionId) {
              throw new Error("cad_crash_session_get requires 'session_id'");
            }
            const session = engine.getSession(sessionId);
            result = { session: session ?? null, found: !!session, source: "CADCrashRecoveryEngine.getSession" };
            break;
          }
          case "cad_crash_health_check": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            if (!sessionId) {
              throw new Error("cad_crash_health_check requires 'session_id'");
            }
            const health = engine.checkHealth(sessionId);
            result = { health: health ?? null, healthy: !!health, source: "CADCrashRecoveryEngine.checkHealth" };
            break;
          }
          case "cad_crash_checkpoint_create": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            const stateHash = params["state_hash"] as string | undefined;
            const metadata = params["metadata"] as Record<string, unknown> | undefined;
            if (!sessionId) {
              throw new Error("cad_crash_checkpoint_create requires 'session_id'");
            }
            const checkpoint = engine.createCheckpoint(sessionId, { stateHash, metadata });
            result = { checkpoint: checkpoint ?? null, created: !!checkpoint, source: "CADCrashRecoveryEngine.createCheckpoint" };
            break;
          }
          case "cad_crash_checkpoint_get": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const checkpointId = params["checkpoint_id"] as string;
            if (!checkpointId) {
              throw new Error("cad_crash_checkpoint_get requires 'checkpoint_id'");
            }
            const checkpoint = engine.getCheckpoint(checkpointId);
            result = { checkpoint: checkpoint ?? null, found: !!checkpoint, source: "CADCrashRecoveryEngine.getCheckpoint" };
            break;
          }
          case "cad_crash_checkpoint_list": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string | undefined;
            const checkpoints = engine.listCheckpoints(sessionId);
            result = { checkpoints, count: checkpoints.length, source: "CADCrashRecoveryEngine.listCheckpoints" };
            break;
          }
          case "cad_crash_journal_get": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            if (!sessionId) {
              throw new Error("cad_crash_journal_get requires 'session_id'");
            }
            const journal = engine.getJournal(sessionId);
            result = { journal, count: journal.length, source: "CADCrashRecoveryEngine.getJournal" };
            break;
          }
          case "cad_crash_history": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string | undefined;
            const limit = params["limit"] as number | undefined;
            const events = engine.getCrashHistory({ sessionId, limit });
            result = { events, count: events.length, source: "CADCrashRecoveryEngine.getCrashHistory" };
            break;
          }
          case "cad_crash_policy_get": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            if (!sessionId) {
              throw new Error("cad_crash_policy_get requires 'session_id'");
            }
            const policy = engine.getPolicy(sessionId);
            result = { policy, source: "CADCrashRecoveryEngine.getPolicy" };
            break;
          }
          case "cad_crash_policy_set": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            const policy = params["policy"] as Record<string, unknown>;
            if (!sessionId || !policy) {
              throw new Error("cad_crash_policy_set requires 'session_id' and 'policy'");
            }
            engine.setPolicy(sessionId, policy);
            result = { updated: true, source: "CADCrashRecoveryEngine.setPolicy" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_crash_session_list"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADCrashRecoveryEngine wired successfully (10 actions)')
