---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "You are rewriting the PRISM \"bug-hunting\" galaxy CLAUDE.md to the LOCKED canonic"
date: "2026-06-13"
first_ts: "2026-06-13T21:50:59.318Z"
last_ts: "2026-06-13T21:56:25.160Z"
cwd: "H:\\PRISM"
messages: 32
user_msgs: 14
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-ad3c946295df0a24d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are rewriting the PRISM "bug-hunting" galaxy CLAUDE.md to the LOCKED canonic

> **claude-code-cli** | 2026-06-13 | 32 msgs (14 user / 18 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-ad3c946295df0a24d.jsonl`

## Transcript

### User | 2026-06-13T21:50:59.318Z

You are rewriting the PRISM "bug-hunting" galaxy CLAUDE.md to the LOCKED canonical template. This is a REFACTOR of an existing good file, NOT a from-scratch rewrite -- preserve accurate domain content, restructure to the template, apply the assessment's KEEP/DROP/ADD.

READ ALL THREE (absolute paths):
1. The LOCKED template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (the 14-section skeleton + section-by-section guidance + the universal-core set). The output MUST follow its section order + rules.
2. The Phase-A assessment for THIS galaxy: H:/prism/state/shared/slot-claude-md-assessment/bug-hunting.md (its KEEP / DROP / ADD / IDEAL SECTION OUTLINE -- already done with verified-symbol discipline; this is your spec).
3. The CURRENT galaxy file: H:/prism/mcp-server/src/engines/bug-hunting/CLAUDE.md (preserve its accurate KEEP content; drop what the assessment marks DROP).

HARD RULES (R12 / safety):
- VERIFIED SYMBOLS ONLY. Every engine / dispatcher action / file path / hook you name MUST be confirmed to exist -- Grep/Glob/Read it (e.g. Glob mcp-server/src/engines/bug-hunting/*.ts; grep the dispatcher source for an action). If you cannot verify it, OMIT it or mark it "// UNVERIFIED". NEVER fabricate. The #1 failure across the 34 assessments was fabricated names -- do not add new ones.
- NEVER DROP the safety-bearing sections: §0 (header + universal-core pointer to H:/prism/CLAUDE.md), §4 (canonical constants + data paths / NEVER-inline rule), §5 (domain gotchas / safety rails), §6 (what NOT to do / domain refuses). These carry units/physics/safety numerics that have NO other home. They may be tightened but never removed.
- TOKEN-LEAN: target 80-160 lines (this replaces a 530-line monolith per slot). Collapse the 4 boilerplate blocks (cross-cutting methodology / AI-SYSTEMS-STATE / CRITIC-KEEPWORKING / verbatim india closed-loop prose) into the single §0 universal pointer + the 2-line §10 closed-loop callout, exactly as the template's §0 WHY block prescr
... [+419 chars truncated]

### Assistant | 2026-06-13T21:51:04.252Z

I'll read all three source files in parallel before writing anything.

### Assistant | 2026-06-13T21:51:04.643Z

[tool_use: Read]

### Assistant | 2026-06-13T21:51:05.031Z

[tool_use: Read]

### Assistant | 2026-06-13T21:51:05.153Z

[tool_use: Read]

### User | 2026-06-13T21:51:18.561Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### User | 2026-06-13T21:51:18.767Z

[tool_result] 1	# Bug-Hunting Galaxy (UNIFORM slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> UNIFORM - BUG HUNTING (silent failures, R12 fail-loud violations, regressions, untested edges, hostile-payload exploit classes)
5	
6	## What lives here
7	
8	Uniform is the **silent-bug surfacing infrastructure** — the slot dedicated to finding the bugs that don't throw, don't fail tests, and don't show 
... [+11678 chars truncated]

### User | 2026-06-13T21:51:19.030Z

[tool_result] 1	## bug-hunting — slot:uniform
2	
3	### Current state
4	
5	**Size:** 127 lines, ~5.9 KB.
6	**Quality grade: GOOD**
7	
8	The current CLAUDE.md is one of the better galaxy files in the fleet. It has genuine domain content: a 10-class bug taxonomy, a verified anti-pattern list, Karpathy 5-step adapted to bug-hunting work, related-galaxy bridges, and dispatcher bridge-OUT declarations. It does NOT re
... [+11632 chars truncated]

### Assistant | 2026-06-13T21:51:22.425Z

Now I need to verify the key symbols before writing. Let me grep the dispatcher sources and check the engine tree.

### Assistant | 2026-06-13T21:51:23.206Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:51:25.506Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:51:26.544Z

[tool_use: Bash]

### User | 2026-06-13T21:51:42.898Z

[tool_result] No files found

### User | 2026-06-13T21:52:11.205Z

[tool_result] 10 matches in 8 files:

711:0:{
725:0:{
730:0:{
947:0:{
959:0:{
972:0:{
978:0:{
mcp-server/.../dispatchers/guardDispatcher.ts:26:"pattern_scan", "pattern_history", "learning_query", "learning_save", "lkg_st...
mcp-server/.../dispatchers/guardDispatcher.ts:45:"error_ledger_append", "error_ledger_append_and_embed",
mcp-server/.../dispatchers/guardDispatcher.ts:46:"error_ledger_recent", "error_ledger
... [+17 chars truncated]

### User | 2026-06-13T21:52:28.962Z

[tool_result] 6 matches in 6 files:

5951:0:{
5959:0:{
5964:0:{
5967:0:"No test gap report found. Run test_generate_scan first." };
5970:0:{
mcp-server/src/tools/dispatchers/devDispatcher.ts:36:...coverage_audit_summary", "test_generate", "test_generate_scan", "test_generate_r...

### Assistant | 2026-06-13T21:52:33.379Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:52:34.434Z

[tool_use: Bash]

### User | 2026-06-13T21:52:47.970Z

[tool_result] scripts/audit-close-out-candidates.mjs
scripts/audit-roadmap-drift.mjs
scripts/audit-unwired-engines.mjs
scripts/declared-vs-actual.mjs
scripts/hook-fire-rank.mjs
.claude/scripts/scrutiny-3way.mjs

### User | 2026-06-13T21:53:04.705Z

[tool_result] mcp-server/src/tools/dispatchers/cadRegressionDispatcher.ts
20 matches in 8 files:

135:0:CADRegressionAction, params: any): Promise<any> {
267:0:never = action;
268:0:${String(_exhaustive)}`);
275:0:any): void {
281:0:actionEnum,
291:0:${validation.errorMessage}`,
4:0:
mcp-server/.../dispatchers/cadRegressionDispatcher.ts:5:*   (25 fully-qualified engine-named actions + 5 CINF12 spec aliases)
mcp
... [+499 chars truncated]

### Assistant | 2026-06-13T21:53:07.974Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:53:08.766Z

[tool_use: Bash]

### User | 2026-06-13T21:53:42.214Z

[tool_result] 36 matches in 19 files:

151:0:
152:0:
156:0:{
214:0:
216:0:
220:0:
222:0:
224:0:
228:0:
230:0:
232:0:
234:0:
236:0:
238:0:
240:0:
242:0:
244:0:
246:0:

### User | 2026-06-13T21:53:55.497Z

[tool_result] PostProcessorFeedOptimizer.baseline.test.ts

### Assistant | 2026-06-13T21:53:57.768Z

[tool_use: Bash]

### User | 2026-06-13T21:54:24.016Z

[tool_result] export const ACTIONS = [
  // CINF01
  "cad_index_run",
  "cad_index_diff",
  "cad_index_load",
  // CINF02
  "cad_classify_run",
  "cad_classify_one",
  // CINF04
  "cad_regression_run",
  "cad_regression_load",
  // CINF04.x — WorkerThreadRunner smoke (built-in trusted echo-worker; no workerScript over the wire)
  "cad_regression_runner_smoke",
  // CINF05
  "cad_checkpoint_save",
  "cad_checkpo
... [+1253 chars truncated]

### Assistant | 2026-06-13T21:54:26.728Z

All symbols verified. Now I have everything needed to write the rewritten CLAUDE.md. Let me also verify the staging directory exists.

### Assistant | 2026-06-13T21:54:27.543Z

[tool_use: Bash]

### User | 2026-06-13T21:54:48.126Z

[tool_result] academy.md
ai-training.md
business.md
cad.md
cam.md

### Assistant | 2026-06-13T21:54:50.835Z

Good. Now I have everything verified. Writing the rewritten file.

### Assistant | 2026-06-13T21:56:15.856Z

[tool_use: Write]

### User | 2026-06-13T21:56:20.485Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/bug-hunting.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T21:56:25.160Z

galaxy=bug-hunting | lines=155 | grade-was=GOOD | key-changes=fixed 3 fabricated engine paths + 2 wrong script paths; added verified dispatcher table (prism_guard/prism_dev/prism_cad_regression with file:line citations); added §7 bug-lifecycle pipeline + escalation tiers; collapsed boilerplate blocks to §0 pointer
