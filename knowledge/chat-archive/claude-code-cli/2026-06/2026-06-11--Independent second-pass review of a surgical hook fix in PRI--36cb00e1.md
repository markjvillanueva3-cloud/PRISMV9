---
type: "chat-session"
source: "claude-code-cli"
session_id: "36cb00e1-ecc1-4886-b128-a112144308fc"
title: "Independent second-pass review of a surgical hook fix in PRISM (main tree H:/pri"
date: "2026-06-11"
first_ts: "2026-06-11T18:56:19.402Z"
last_ts: "2026-06-11T18:59:56.552Z"
cwd: "H:\\prism-slot-alpha"
messages: 47
user_msgs: 17
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism-slot-alpha/36cb00e1-ecc1-4886-b128-a112144308fc/subagents/agent-a8997b52efb17024c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# Independent second-pass review of a surgical hook fix in PRISM (main tree H:/pri

> **claude-code-cli** | 2026-06-11 | 47 msgs (17 user / 30 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/36cb00e1-ecc1-4886-b128-a112144308fc/subagents/agent-a8997b52efb17024c.jsonl`

## Transcript

### User | 2026-06-11T18:56:19.402Z

Independent second-pass review of a surgical hook fix in PRISM (main tree H:/prism). Read each changed file end-to-end. Weight your review toward what a correctness pass might MISS: hidden coupling, the extractor↔consumer↔jsonl three-way sync, regression risk, test integrity, and whether the fix is COMPLETE.

THE FIX (slot:alpha 2026-06-11): session-lifecycle skills (precompact/compact/handoff/checkpoint) were causing the UserPromptSubmit hook `.claude/hooks/skill-auto-trigger.mjs` to emit a MANDATORY "INVOKE /precompact NOW" directive on any prompt that merely MENTIONED compaction/handoff as a topic (e.g. a task to improve the compaction system), at any context %. They are now treated as STATE-gated (owned by precompact-auto-trigger.mjs + Stop event), excluded from keyword surfacing.

Changed files (verify against live code):
- H:/prism/.claude/hooks/skill-auto-trigger.mjs — new exported `LIFECYCLE_STATE_GATED_SKILLS` set; lifecycle names removed from (now-exported) `INVOKE_NOW_SKILLS`; a `if (LIFECYCLE_STATE_GATED_SKILLS.has(t.name)) continue;` skip added in handleUserPromptSubmit's scoring loop.
- H:/prism/scripts/extract-skill-triggers.mjs — same 4 names removed from its INVOKE_NOW_SKILLS (stops it stamping action:"invoke" into the jsonl on next regen).
- H:/prism/knowledge/wiki/architecture/_skill-triggers.jsonl — the live `precompact` entry: action invoke -> suggest.
- H:/prism/.claude/hooks/__tests__/skill-auto-trigger.test.mjs — NEW 7-case node:test (passes).

SPECIFIC THINGS TO CHECK (cite file:line):
- COMPLETENESS: are there OTHER consumers of these lifecycle-skill triggers besides skill-auto-trigger.mjs (e.g., other hooks reading _skill-triggers.jsonl, or other places action:"invoke" is honored)? Grep if needed. Is precompact still able to fire when CONTEXT PRESSURE is real (via precompact-auto-trigger.mjs)? Confirm I didn't disable legitimate state-based compaction.
- THREE-WAY SYNC: consumer set, extractor set, and jsonl content — are they now mutually
... [+722 chars truncated]

### Assistant | 2026-06-11T18:56:27.936Z

I'll read the changed files end-to-end before rendering a verdict.

### Assistant | 2026-06-11T18:56:28.074Z

[tool_use: Read]

### User | 2026-06-11T18:56:28.794Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\skill-auto-trigger.mjs' was already read 15s ago in this session and is unchanged (mtime 1781203594217). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-11T18:56:33.653Z

[tool_use: Bash]

### User | 2026-06-11T18:56:40.611Z

[tool_result] <persisted-output>
Output too large (34.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-alpha\36cb00e1-ecc1-4886-b128-a112144308fc\tool-results\bll5468yv.txt

Preview (first 2KB):
     1	#!/usr/bin/env node
     2	// tier: T2
     3	/**
     4	 * skill-auto-trigger.mjs — pipeline-aware multi-event suggester.
     5	 *
     6	 * History:
     7	 *   - DEV-VELOCITY-AU
... [+1773 chars truncated]

### Assistant | 2026-06-11T18:56:44.908Z

Let me read the full file content properly.

### Assistant | 2026-06-11T18:56:46.594Z

[tool_use: Read]

### User | 2026-06-11T18:56:50.548Z

[tool_result] 1	     1	#!/usr/bin/env node
2	     2	// tier: T2
3	     3	/**
4	     4	 * skill-auto-trigger.mjs — pipeline-aware multi-event suggester.
5	     5	 *
6	     6	 * History:
7	     7	 *   - DEV-VELOCITY-AUTOTRIGGER-MS0 (Phase D.2): UserPromptSubmit-only,
8	     8	 *     skill-trigger jsonl matching, suggest-only.
9	     9	 *   - COMMAND-KERNEL-MS0/U-CK16: extended to fire on PostToolUse + Stop
10	   
... [+37057 chars truncated]

### Assistant | 2026-06-11T18:57:01.137Z

Now let me read the other changed files:

### Assistant | 2026-06-11T18:57:02.512Z

[tool_use: Bash]

### User | 2026-06-11T18:57:08.962Z

[tool_result] 94:const INVOKE_NOW_SKILLS = new Set([
99:  // Session-lifecycle skills (precompact/compact/handoff/checkpoint) are
101:  // action:invoke made a prompt that merely *mentions* compaction/handoff emit a
102:  // MANDATORY /precompact directive (slot:alpha 2026-06-11, fired at 18% context).
103:  // Pressure-based compaction is owned by precompact-auto-trigger.mjs; handoff
330:      const isInvokeNo
... [+37 chars truncated]

### Assistant | 2026-06-11T18:57:13.076Z

[tool_use: Read]

### User | 2026-06-11T18:57:16.032Z

[tool_result] 80	  join(PRISM_ROOT, ".claude/commands-archive"),
81	  "C:/Users/wompu/.claude/commands-archive",
82	]);
83	
84	const MIN_SCORE = parseFloat(process.env.PRISM_SKILL_TRIGGERS_MIN_SCORE || "0.5");
85	
86	// INVOKE_NOW (2026-05-28 slot:alpha) — extractor-side allowlist that promotes
87	// these 17 imperative skills from action:"suggest" → action:"invoke" with a
88	// score floor of 0.85 so the consu
... [+3268 chars truncated]

### Assistant | 2026-06-11T18:57:20.553Z

Now let me read the test file and the jsonl entry:

### Assistant | 2026-06-11T18:57:20.774Z

[tool_use: Read]

### User | 2026-06-11T18:57:23.171Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\__tests__\skill-auto-trigger.test.mjs' was already read 60s ago in this session and is unchanged (mtime 1781204058860). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### Assistant | 2026-06-11T18:57:29.993Z

[tool_use: Bash]

### User | 2026-06-11T18:57:35.239Z

[tool_result]      1	/**
     2	 * skill-auto-trigger.test.mjs -- regression oracle for the lifecycle-skill
     3	 * state-gate fix (slot:alpha 2026-06-11).
     4	 *
     5	 * BUG: session-lifecycle skills (precompact/compact/handoff/checkpoint) were in
     6	 * INVOKE_NOW_SKILLS, so a prompt that merely *mentioned* "compaction"/"handoff"
     7	 * as a TOPIC emitted a MANDATORY "INVOKE /precompact NOW" dire
... [+5696 chars truncated]

### Assistant | 2026-06-11T18:57:41.752Z

Good — now get the rest of the test file and check the jsonl entry plus grep for other consumers:

### Assistant | 2026-06-11T18:57:43.061Z

[tool_use: Bash]

### User | 2026-06-11T18:57:49.736Z

[tool_result]     75	test("topical 'session handoff' prompt does NOT surface /handoff", () => {
    76	  const triggers = [T("handoff", "handoff|session handoff|write handoff", 0.85, "invoke")];
    77	  const { ctx } = runHook("improve the session handoff system across all slots", triggers);
    78	  assert.ok(!ctx.includes("INVOKE NOW"), "no mandate");
    79	  assert.ok(!ctx.includes("/handoff"), "handoff is
... [+1444 chars truncated]

### Assistant | 2026-06-11T18:57:55.336Z

Only 6 tests visible (lines 55-104). The brief mentioned 7. Let me check for the 7th and scan for other consumers simultaneously:

### Assistant | 2026-06-11T18:57:55.792Z

[tool_use: Bash]

### User | 2026-06-11T18:58:02.869Z

[tool_result] 7
55:test("LIFECYCLE_STATE_GATED_SKILLS holds the 4 session-lifecycle skills", () => {
60:test("INVOKE_NOW_SKILLS excludes every lifecycle skill (the bug guard)", () => {
67:test("THE BUG: topical compaction/precompact prompt does NOT mandate or surface /precompact", () => {
75:test("topical 'session handoff' prompt does NOT surface /handoff", () => {
82:test("POSITIVE CONTROL: non-lifecycle INVOK
... [+227 chars truncated]

### Assistant | 2026-06-11T18:58:08.479Z

Good — 7 tests confirmed. Now check other consumers of `_skill-triggers.jsonl` and `action:"invoke"`, and check the precompact entry in the jsonl:

### Assistant | 2026-06-11T18:58:09.531Z

[tool_use: Bash]

### User | 2026-06-11T18:58:14.615Z

[tool_result] H:/prism/scripts/audit-hook-wiring.mjs:58:  "knowledge/wiki/architecture/_skill-triggers.jsonl",
H:/prism/scripts/expand-skill-triggers.mjs:15:// to regenerate knowledge/wiki/architecture/_skill-triggers.jsonl.
H:/prism/scripts/high-roi-skill-rank.mjs:13:const TRIGGER_LEDGER = path.join(REPO, "knowledge/wiki/architecture/_skill-triggers.jsonl");
H:/prism/scripts/high-roi-skill-rank.mjs:172:    del
... [+1492 chars truncated]

### Assistant | 2026-06-11T18:58:21.599Z

Now check what those consumers do with `action:"invoke"` — specifically `rgs-tool-planner` and `skill-trigger-coverage` since they could re-honor mandatory behavior:

### Assistant | 2026-06-11T18:58:22.393Z

[tool_use: Bash]

### User | 2026-06-11T18:58:26.487Z

[tool_result] 278:        // dispatcher/action nodes tend to be L2/L3 with transport/dispatcher subgroup
284:          lbl.toLowerCase().includes("action")
---
11: * A skill with no ledger entry can only be invoked if the user types its name
13: * fraction of skills that ARE in the ledger.
132:  // declared-not-captured first (the actionable gap), then alpha.
179:  L.push(`  declared-not-captured: ${r.declaredN
... [+371 chars truncated]

### Assistant | 2026-06-11T18:58:32.577Z

Good — none of the other consumers act on `action:"invoke"` as a mandatory directive. Now check the jsonl entry for precompact and look for `compact`/`handoff`/`checkpoint` entries too:

### Assistant | 2026-06-11T18:58:33.148Z

[tool_use: Bash]

### User | 2026-06-11T18:58:37.729Z

[tool_result] 245:{"name":"precompact","type":"skill","manifest":"H:/prism/.claude/commands/precompact.md","matcher":{"type":"keyword","value":"precompact|/precompact|before compact|prepare compact|write handoff"},"score":0.85,"action":"suggest"}

### Assistant | 2026-06-11T18:58:43.758Z

Only `precompact` appears — `compact`, `handoff`, `checkpoint` have no jsonl entries at all. Now verify the three-way sync drift risk and check `expand-skill-triggers.mjs` for any re-promotion path:

### Assistant | 2026-06-11T18:58:44.240Z

[tool_use: Bash]

### User | 2026-06-11T18:58:50.068Z

[tool_result] 55:  "handoff":             { keywords: "handoff|/handoff|session handoff|next chat|context handoff",                                                     score: 0.85 },
56:  "precompact":          { keywords: "precompact|/precompact|before compact|prepare compact|write handoff",                                            score: 0.80 },
57:  "checkpoint":          { keywords: "checkpoint|/checkpoin
... [+804 chars truncated]

### Assistant | 2026-06-11T18:58:56.287Z

Critical finding. Let me check what `DEFAULT_ACTION` is in that file and whether `expand-skill-triggers` writes to the jsonl with `action:"invoke"` for lifecycle skills:

### Assistant | 2026-06-11T18:58:56.598Z

[tool_use: Read]

### User | 2026-06-11T18:58:57.861Z

[tool_result] 1	#!/usr/bin/env node
2	// expand-skill-triggers.mjs
3	// SYSTEM-VIZ-BRAIN-MS0/U-P0-TRIGGER-LEDGER-EXPAND
4	//
5	// Adds `triggers:` frontmatter blocks to high-value skill .md files that
6	// currently surface only via explicit /skill-name invocation. Curated keyword
7	// map keyed on skill basename; only adds when no `triggers:` already present.
8	//
9	// CLI:
10	//   node scripts/expand-skill-tr
... [+5494 chars truncated]

### Assistant | 2026-06-11T18:59:02.809Z

Now check DEFAULT_ACTION in expand-skill-triggers.mjs:

### Assistant | 2026-06-11T18:59:03.009Z

[tool_use: Bash]

### User | 2026-06-11T18:59:07.502Z

[tool_result] 113:const DEFAULT_ACTION = "suggest";
141:    `    action: ${DEFAULT_ACTION}`,

### Assistant | 2026-06-11T18:59:15.531Z

Good. `expand-skill-triggers.mjs` uses `DEFAULT_ACTION = "suggest"` for all entries including the four lifecycle skills in its CURATED map — so it cannot re-inject `action:"invoke"` for them. Now verify the three-way sync precisely: does a fresh `extract-skill-triggers.mjs` run reproduce `action:"suggest"` for precompact (not `action:"invoke"`)?

### Assistant | 2026-06-11T18:59:15.808Z

[tool_use: Read]

### User | 2026-06-11T18:59:17.578Z

[tool_result] 300	    scanned++;
301	    let text = "";
302	    try { text = readFileSync(path, "utf8"); } catch { continue; }
303	    const fm = extractFrontmatter(text);
304	    if (!fm) continue;
305	    const entries = parseTriggers(fm);
306	    if (!entries.length) continue;
307	    const skillName = extractName(fm, name);
308	    let emittedHere = 0;
309	    for (const e of entries) {
310	      if (e.even
... [+4033 chars truncated]

### Assistant | 2026-06-11T18:59:56.552Z

I have everything I need. Here is the verdict.

---

**VERDICT: PASS** — with one P1 finding (latent drift risk) and one P2 observation.

---

**P1 — Three-way sync is NOT durable: `expand-skill-triggers.mjs` will re-inject lifecycle skills into skill `.md` frontmatter with `action: suggest`, but if any future operator edits a lifecycle skill's `.md` to use `action: invoke` in its `triggers:` block, a fresh `extract-skill-triggers.mjs` run will stamp `action:"invoke"` back into the jsonl for that skill — the extractor's INVOKE_NOW gate at line 330-332 (`H:/prism/scripts/extract-skill-triggers.mjs:330`) is the sole promotion fence, and it correctly excludes lifecycle skills now. BUT `expand-skill-triggers.mjs` lines 53-57 (`H:/prism/scripts/expand-skill-triggers.mjs:53-57`) still lists `handoff`, `precompact`, `checkpoint` in its CURATED map and will write `triggers:` frontmatter using `DEFAULT_ACTION = "suggest"` into those skill `.md` files if they ever lose their frontmatter. There is no guard preventing a future operator from adding `action: invoke` directly in the `.md` frontmatter, which `parseTriggers` at extract time would read and the extractor's `finalAction = isInvokeNow ? "invoke" : (e.action || "suggest")` (line 332) would honor as `"suggest"` only because the name is not in `INVOKE_NOW_SKILLS`. That path is safe. The real risk is the reverse: if someone adds `precompact` back to `INVOKE_NOW_SKILLS` in `extract-skill-triggers.mjs` without updating the comment, the protection silently evaporates. The fix note at line 99-104 in `extract-skill-triggers.mjs` is a comment, not code. Recommend adding a runtime assertion at module load: `for (const s of LIFECYCLE_SKILLS) assert(!INVOKE_NOW_SKILLS.has(s))` mirroring the test's white-box check, so a future edit to `INVOKE_NOW_SKILLS` fails loud at extraction time, not silently at runtime.**

**P2 — `compact` / `handoff` / `checkpoint` are in `LIFECYCLE_STATE_GATED_SKILLS` (consumer) but have ZERO entries in the j
... [+3070 chars truncated]
