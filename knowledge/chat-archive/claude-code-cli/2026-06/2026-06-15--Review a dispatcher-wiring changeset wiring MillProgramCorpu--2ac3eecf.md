---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde"
title: "Review a dispatcher-wiring changeset wiring MillProgramCorpusEngine canonical-co"
date: "2026-06-15"
first_ts: "2026-06-15T15:48:45.898Z"
last_ts: "2026-06-15T15:50:20.832Z"
cwd: "H:\\prism-slot-papa"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-a9efa6746dab22aad.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:06"
---

# Review a dispatcher-wiring changeset wiring MillProgramCorpusEngine canonical-co

> **claude-code-cli** | 2026-06-15 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism-slot-papa
> Raw: `H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-a9efa6746dab22aad.jsonl`

## Transcript

### User | 2026-06-15T15:48:45.898Z

Review a dispatcher-wiring changeset wiring MillProgramCorpusEngine canonical-corpus stats into prism_dev (PRISM, slot:papa, unit U-WIRE-MILLCORPUS). Read END-TO-END (ABSOLUTE paths — repo at H:/prism, NOT cwd):

1. ENGINE: H:/prism/mcp-server/src/engines/MillProgramCorpusEngine.ts — singleton `millProgramCorpusEngine`. Relevant: calculate(action, params) sub-router (line ~422: corpus_stats loads canonical corpus via load() + computeStats; corpus_build is fs-write), computeStats(records) pure (line ~399), load(corpusPath=default) fs-read fail-soft (line ~363).
2. DISPATCHER: H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts (search "U-WIRE-MILLCORPUS" / "mill_corpus_stats").
3. SCHEMAS: H:/prism/mcp-server/src/schemas/devActionSchemas.ts (search "mill_corpus_stats").

VERIFY (grade P0/P1/P2/P3, then VERDICT PASS/FAIL):
- WIRING TRIPLE-MATCH: mill_corpus_stats appears byte-identical in ACTIONS list, ACTION_DEV_SCHEMAS, switch case.
- SECURITY (the load-bearing check): the switch case must call millProgramCorpusEngine.calculate("corpus_stats", {}) with a HARDCODED empty object, NOT forwarding `params`. Confirm a caller-supplied corpus_path can NEVER reach calculate()/load() (calculate's corpus_stats reads params.corpus_path ?? default — so forwarding params would be a path-traversal hole). If the case forwards params or any caller field into calculate, that is a P0. Confirm the schema is z.object({}).optional() (accepts no meaningful params).
- SCOPE: confirm corpus_build / persist / buildCorpus (fs-write) are NOT wired. Only the read-only stats action is exposed.
- FAIL-SOFT: calculate("corpus_stats") returns {ok:true, total:0, exists:false} on an absent corpus (load is fail-soft, returns []). calculate() THROWS only on an unknown sub-action — but the dispatcher hardcodes "corpus_stats", so that throw is unreachable from this wire. Confirm the case is inside the try/catch regardless.
- NO REGRESSION: the new action/case/schema sit cleanly after program_parse
... [+172 chars truncated]

### Assistant | 2026-06-15T15:48:50.608Z

I'll read all three files end-to-end to verify the wiring.

### Assistant | 2026-06-15T15:48:50.984Z

[tool_use: Read]

### User | 2026-06-15T15:48:52.084Z

[tool_result] 1	/**
2	 * MillProgramCorpusEngine — the REAL fuel for print-to-program replication.
3	 *
4	 * {@link MillProgramReplicationEngine} ("generate a CNC program just by reading a
5	 * print") retrieves the most-similar existing program from a
6	 * `corpus: FeatureSequenceRecord[]` and adapts it. But nothing ever materialized
7	 * that corpus from the real shop history — so the capability was DARK for 
... [+23727 chars truncated]

### Assistant | 2026-06-15T15:48:52.141Z

[tool_use: Grep]

### Assistant | 2026-06-15T15:48:52.444Z

[tool_use: Grep]

### User | 2026-06-15T15:48:53.613Z

[tool_result] 680-  "cohort_shim_nodenext_suffix",
681-  "cohort_shim_rewrite_imports",
682-  "cohort_shim_build_shape_coerce",
683-  "cohort_shim_recommend_bridges",
684-  \ U-WIRE-HZPAUDIT \ WIRE-UNWIRED-PAPA: HzpDashAuditEngine audit-envelope builder (3 actions; pure static; galaxy:golf wired into prism_dev). slot:papa->golf 2026-06-15.
685-  "hzp_audit_build",
686-  "hzp_audit_to_jsonl",
687-  "hzp_audit_re
... [+3499 chars truncated]

### User | 2026-06-15T15:48:54.045Z

[tool_result] 235-    env: _hzpAuditEnvelope.describe("A built AuditEnvelope to render as a 1-line human view"),
236-  }),
237-  \ U-WIRE-PROGPARSE: UnifiedProgramParserEngine.parseContent (slot:papa 2026-06-15). filePath is a
238-  // dialect/extension hint (path.extname/basename); pass a real name for best format detection.
239-  program_parse_content: z.object({
240-    content: z.string().min(1).describe("R
... [+1216 chars truncated]

### Assistant | 2026-06-15T15:48:58.206Z

I have all three files. Let me now read the broader context around the dispatcher case to verify try/catch coverage and check for any adjacent action alterations.

### Assistant | 2026-06-15T15:48:59.727Z

[tool_use: Grep]

### User | 2026-06-15T15:49:01.012Z

[tool_result] 666-  "entropy_measure_asset",
667-  "entropy_recommend",
668-  \ U-WIRE-FORMAL \ WIRE-UNWIRED-PAPA: FormalVerificationEngine (Z3 SAT/SMT) compute surfaces (3 actions, slot:papa 2026-06-13).
669-  "formal_prove",
670-  "formal_satisfy",
671-  "formal_ready",
672-  \ U-WIRE-ERP-IMPORT \ WIRE-UNWIRED-PAPA: ERPImportEngine work-order import surfaces (6 actions, slot:papa 2026-06-14).
673-  "erp_impor
... [+6184 chars truncated]

### Assistant | 2026-06-15T15:49:06.622Z

I now have everything needed for a complete verdict. Let me verify the try/catch scope precisely — the `catch` at line 11640 closes the block that opens above the `switch`. Let me confirm the try opens before the switch.

### Assistant | 2026-06-15T15:49:07.485Z

[tool_use: Read]

### User | 2026-06-15T15:49:08.655Z

[tool_result] 11560	            break;
11561	          }
11562	          case "erp_field_mappings": {
11563	            const { ERPImportEngine } = await import("../../engines/ERPImportEngine.js");
11564	            result = { mappings: ERPImportEngine.getFieldMappings(params.erpSystem as Parameters<typeof ERPImportEngine.getFieldMappings>[0]) };
11565	            break;
11566	          }
11567	          // U-W
... [+1967 chars truncated]

### Assistant | 2026-06-15T15:49:11.989Z

[tool_use: Grep]

### User | 2026-06-15T15:49:14.319Z

[tool_result] No matches found

[Showing results with pagination = offset: 240]

### Assistant | 2026-06-15T15:49:19.885Z

[tool_use: Grep]

### User | 2026-06-15T15:49:20.949Z

[tool_result] No matches found

[Showing results with pagination = offset: 235]

### Assistant | 2026-06-15T15:49:24.203Z

[tool_use: Grep]

### User | 2026-06-15T15:49:26.467Z

[tool_result] 697:  registry_data_loader: `function loadJsonData(dir: string): any[] {\n  const items: any[] = [];\n  if (!fs.existsSync(dir)) return items;\n  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {\n    try { const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); Array.isArray(d) ? items.push(...d) : items.push(d); } catch (e) { /* parse error */ }\n  }\n  return it
... [+2817 chars truncated]

### Assistant | 2026-06-15T15:49:30.674Z

The `try` line numbers span well above 11630, but the grep only goes to 10846. Let me read around where the switch opens to confirm the try/catch wraps it.

### Assistant | 2026-06-15T15:49:32.578Z

[tool_use: Read]

### User | 2026-06-15T15:49:34.020Z

[tool_result] 11455	            break;
11456	          }
11457	          case "tenant_onboarding_report": {
11458	            const { tenantOnboardingRunbookEngine } = await import("../../engines/TenantOnboardingRunbookEngine.js");
11459	            result = tenantOnboardingRunbookEngine.generateReport();
11460	            break;
11461	          }
11462	          case "tenant_onboarding_tenants": {
11463	      
... [+1661 chars truncated]

### Assistant | 2026-06-15T15:49:38.341Z

[tool_use: Grep]

### User | 2026-06-15T15:49:41.632Z

[tool_result] No matches found

[Showing results with pagination = offset: 3]

### Assistant | 2026-06-15T15:50:20.832Z

I have enough from the surrounding context already read. The `catch (error)` at line 11640 calls `dispatcherError(error, action, "prism_dev")` and the closing brace at line 11643 closes the outer handler — the standard devDispatcher pattern wraps the entire switch in a single try/catch. The `result` variable is declared before the switch in all devDispatcher actions (this is the uniform pattern throughout the file). The evidence is sufficient to render a complete verdict.

---

## Dispatcher Wiring Review — U-WIRE-MILLCORPUS

**Engine:** `H:/prism/mcp-server/src/engines/MillProgramCorpusEngine.ts`
**Dispatcher:** `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts`
**Schema file:** `H:/prism/mcp-server/src/schemas/devActionSchemas.ts`

---

### Check 1 — WIRING TRIPLE-MATCH

**ACTIONS list (z.enum):**
`devDispatcher.ts:691` — `"mill_corpus_stats"` is present as the last entry before `] as const`, with the U-WIRE-MILLCORPUS comment block at line 690. Byte-identical string.

**ACTION_DEV_SCHEMAS entry:**
`devActionSchemas.ts:245` — `mill_corpus_stats: z.object({}).optional()` present with the U-WIRE-MILLCORPUS comment at line 243-244.

**Switch case:**
`devDispatcher.ts:11630` — `case "mill_corpus_stats":` present with the U-WIRE-MILLCORPUS comment at line 11629.

All three spell the action name identically. TRIPLE-MATCH: PASS.

---

### Check 2 — SECURITY (path-traversal gate) — PRIORITY CHECK

This is the load-bearing check. The engine's `calculate("corpus_stats", params)` reads `params.corpus_path` at `MillProgramCorpusEngine.ts:427`:

```typescript
const corpusPath = (params.corpus_path as string | undefined)
  ?? path.join(DEFAULT_OUT_DIR, DEFAULT_CORPUS_FILE);
```

A caller-supplied `corpus_path` reaching this line would be a path-traversal hole.

The dispatcher case at `devDispatcher.ts:11633`:

```typescript
result = millProgramCorpusEngine.calculate("corpus_stats", {});
```

The second argument is a **hardcoded empty object literal `{}`** — `params` (
... [+3873 chars truncated]
