#!/usr/bin/env python3
"""Wire CADRevisionPromotionWorkflowEngine to cadAutomationDispatcher - U-CUC54"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (7 revision promotion workflow actions)
new_actions = '''  "cad_revision_get_record",
  "cad_revision_list_by_drawing",
  "cad_revision_get_current",
  "cad_revision_create_draft",
  "cad_revision_submit_for_review",
  "cad_revision_revoke_to_draft",
  "cad_revision_reject",
'''

# Find last action before ] as const
old_actions_end = b'"cad_replication_merge",\r\n] as const;'
new_actions_end = b'"cad_replication_merge",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_revision_get_record' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadRevisionPromotionWorkflowEngine
case_code = '''          case "cad_revision_get_record": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            if (!drawingNumber || !revision) {
              throw new Error("cad_revision_get_record requires 'drawing_number' and 'revision'");
            }
            const record = cadRevisionPromotionWorkflowEngine.getRecord(drawingNumber, revision);
            result = { record: record ?? null, found: !!record, source: "CADRevisionPromotionWorkflowEngine.getRecord" };
            break;
          }
          case "cad_revision_list_by_drawing": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            if (!drawingNumber) {
              throw new Error("cad_revision_list_by_drawing requires 'drawing_number'");
            }
            const records = cadRevisionPromotionWorkflowEngine.listByDrawing(drawingNumber);
            result = { records, count: records.length, source: "CADRevisionPromotionWorkflowEngine.listByDrawing" };
            break;
          }
          case "cad_revision_get_current": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            if (!drawingNumber) {
              throw new Error("cad_revision_get_current requires 'drawing_number'");
            }
            const current = cadRevisionPromotionWorkflowEngine.getCurrent(drawingNumber);
            result = { current: current ?? null, found: !!current, source: "CADRevisionPromotionWorkflowEngine.getCurrent" };
            break;
          }
          case "cad_revision_create_draft": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            const author = params["author"] as string;
            const description = params["description"] as string | undefined;
            if (!drawingNumber || !revision || !author) {
              throw new Error("cad_revision_create_draft requires 'drawing_number', 'revision', 'author'");
            }
            const record = cadRevisionPromotionWorkflowEngine.createDraft(drawingNumber, revision, author, description);
            result = { record, source: "CADRevisionPromotionWorkflowEngine.createDraft" };
            break;
          }
          case "cad_revision_submit_for_review": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            const submitter = params["submitter"] as string;
            if (!drawingNumber || !revision || !submitter) {
              throw new Error("cad_revision_submit_for_review requires 'drawing_number', 'revision', 'submitter'");
            }
            const record = cadRevisionPromotionWorkflowEngine.submitForReview(drawingNumber, revision, submitter);
            result = { record, source: "CADRevisionPromotionWorkflowEngine.submitForReview" };
            break;
          }
          case "cad_revision_revoke_to_draft": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            const revoker = params["revoker"] as string;
            const reason = params["reason"] as string | undefined;
            if (!drawingNumber || !revision || !revoker) {
              throw new Error("cad_revision_revoke_to_draft requires 'drawing_number', 'revision', 'revoker'");
            }
            const record = cadRevisionPromotionWorkflowEngine.revokeToDraft(drawingNumber, revision, revoker, reason);
            result = { record, source: "CADRevisionPromotionWorkflowEngine.revokeToDraft" };
            break;
          }
          case "cad_revision_reject": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            const rejector = params["rejector"] as string;
            const reason = params["reason"] as string;
            if (!drawingNumber || !revision || !rejector || !reason) {
              throw new Error("cad_revision_reject requires 'drawing_number', 'revision', 'rejector', 'reason'");
            }
            const record = cadRevisionPromotionWorkflowEngine.reject(drawingNumber, revision, rejector, reason);
            result = { record, source: "CADRevisionPromotionWorkflowEngine.reject" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_revision_get_record"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADRevisionPromotionWorkflowEngine wired successfully (7 actions)')
