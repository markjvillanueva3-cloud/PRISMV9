---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Tight content-specialist review of NN-GRAPH-MS2 U1 — a 1-stage wiring insertion "
date: "2026-05-17"
first_ts: "2026-05-17T18:29:14.599Z"
last_ts: "2026-05-17T18:30:25.962Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a6a949956ed3659a8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Tight content-specialist review of NN-GRAPH-MS2 U1 — a 1-stage wiring insertion 

> **claude-code-cli** | 2026-05-17 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a6a949956ed3659a8.jsonl`

## Transcript

### User | 2026-05-17T18:29:14.599Z

Tight content-specialist review of NN-GRAPH-MS2 U1 — a 1-stage wiring insertion into the PRISM system-viz regen orchestrator. Be concise; this is a small in-pattern change.

Files:
1. H:/prism/scripts/regen-viz.mjs — ONE new post-merge stage inserted right after the `add-parent-contains-edges` block (look for `seed NN-GRAPH reference ghosts`): a `spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT,"scripts","seed-ghost-from-unwired.mjs"), "--apply"], {stdio:"inherit",cwd:ROOT})` with a fail-loud `if (sg.status !== 0) { console.error(...); failed++; }` mirroring the 4 sibling post-merge stages (reparent / add-parent-contains-edges at lines ~227-247).
2. H:/prism/scripts/__tests__/regen-viz-seed-ghost-stage.test.mjs — 4 node:test structural guards.

Context/intent: `seed-ghost-from-unwired.mjs` already existed (high-confidence 0.75-0.85 `ghost.unwired-engine` nodes + `proposed_wiring`, `--apply` writes system-graph.json directly via atomicWrite) but was NOT a regen stage → every regen left 0 ghost nodes → `nn-graph-eval.mjs` defers `insufficient-reference-pool` (poolSize:0) → GNN tier-5 permanently dormant. The fix re-seeds the reference pool every regen.

Verify ONLY these (concise findings, P0/P1/P2 + file:line, grade PASS/FAIL):
1. ORDERING: the stage is after `merge-augmentations.mjs` (so the direct system-graph.json write survives the merge rebuild) AND after the regen-viz fail-loud abort gate (lines ~168-197, so it never runs against a stale/SIGKILLed-merge graph — confirm the insertion point is past that gate). It must also precede the read-only downstream consumers (executive-briefing/wiki-debt) and the out-of-band nn-graph-eval reader.
2. FAIL-LOUD parity: matches the sibling pattern exactly (`status !== 0` → console.error + `failed++`); does NOT throw; does NOT abort the remaining stages (consistent with reparent/add-parent siblings which are non-fatal-increment, NOT the hard merge-abort).
3. ARG CORRECTNESS: `--apply` is actually passed (FAST[] stages
... [+840 chars truncated]

### Assistant | 2026-05-17T18:29:21.668Z

I'll review this change concisely. Let me read the key files.

### Assistant | 2026-05-17T18:29:22.837Z

[tool_use: Bash]

### User | 2026-05-17T18:29:29.317Z

[tool_result] 160:    failed++;
179:const m = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "merge-augmentations.mjs")], {
195:  console.error(`[regen-viz]   • executive briefing + wiki-debt worklist (publishes stale headlines)`);
197:  console.error(`[regen-viz] Diagnose directly: node ${NODE_ARGS.join(" ")} scripts/merge-augmentations.mjs`);
210:  failed++;
221:  failed++;
227:const rc
... [+1363 chars truncated]

### Assistant | 2026-05-17T18:29:31.449Z

Now let me read the relevant code sections.

### Assistant | 2026-05-17T18:29:32.263Z

[tool_use: Read]

### User | 2026-05-17T18:29:35.996Z

[tool_result] 150	console.log(`[regen-viz] running ${scripts.length} generator(s)${wantFull ? " (FULL)" : " (fast)"}…`);
151	const t0 = Date.now();
152	let failed = 0;
153	for (const s of scripts) {
154	  const abs = path.join(ROOT, "scripts", s);
155	  const start = Date.now();
156	  const r = spawnSync(process.execPath, [...NODE_ARGS, abs], { stdio: "inherit", cwd: ROOT });
157	  const elapsed = ((Date.now() 
... [+8079 chars truncated]

### Assistant | 2026-05-17T18:29:40.899Z

Insertion point confirmed. Now the test file and idempotency check in seed-ghost-from-unwired.mjs.

### Assistant | 2026-05-17T18:29:41.463Z

[tool_use: Read]

### User | 2026-05-17T18:29:42.517Z

[tool_result] 1	/**
2	 * regen-viz-seed-ghost-stage.test.mjs
3	 * NN-GRAPH-MS2 U1 — anti-regression guard for the reference-pool seed stage.
4	 *
5	 * Root cause this unit fixes: `seed-ghost-from-unwired.mjs` (the high-confidence
6	 * `ghost.unwired-engine` reference-pool generator) existed with an `--apply`
7	 * mode but was NOT a regen-viz stage, so every graph regen left
8	 * system-graph.json with 0 ghost n
... [+3501 chars truncated]

### Assistant | 2026-05-17T18:29:44.487Z

Now the idempotency check in seed-ghost-from-unwired.mjs.

### Assistant | 2026-05-17T18:29:46.172Z

[tool_use: Bash]

### User | 2026-05-17T18:29:51.617Z

[tool_result] 24: *   node scripts/seed-ghost-from-unwired.mjs --apply
108:  // whose name has no domain keyword but whose prefix matches existing wired
145:      unwired.push({
198:  const out = { dryRun: false, apply: false, revert: false, limit: Infinity };
202:    else if (a === "--apply") out.apply = true;
206:      console.error("usage: seed-ghost-from-unwired [--dry-run | --apply | --revert] [--limit N]"
... [+853 chars truncated]

### Assistant | 2026-05-17T18:29:54.134Z

[tool_use: Read]

### User | 2026-05-17T18:29:55.528Z

[tool_result] 270	    console.log(`DRY-RUN — would add ${nodes.length} ghost nodes + ${edges.length} ghost-wire edges`);
271	    return;
272	  }
273	
274	  // Apply: idempotent merge (by id)
275	  console.log(`Reading graph ${GRAPH_PATH}...`);
276	  const g = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
277	  const existingIds = new Set(g.nodes.map((n) => n.id));
278	  const existingEdgeKeys = new Set(g.edg
... [+982 chars truncated]

### Assistant | 2026-05-17T18:30:25.962Z

All six verification axes confirmed. Findings below.

## Code Quality Analysis — NN-GRAPH-MS2 U1

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 3 (regen-viz.mjs, test, seed-ghost-from-unwired.mjs)
- Issues Found: 0 P0, 0 P1, 2 P2
- Grade: **PASS**

### Verification Results

**1. ORDERING — PASS.** Insertion at `regen-viz.mjs:260-267` sits *after* the merge fail-loud abort gate (`if (guard.abort) process.exit(...)` at lines 190-199) and after `merge-augmentations.mjs` (line 179). It runs as the last graph-mutating stage (after reparent L227 / add-parent-contains-edges L241) and *before* every read-only downstream consumer: obsidian-bridge (L277), executive-briefing (L286), wiki-debt (L298), drift-gate (L303+). The direct `system-graph.json` write therefore survives the merge rebuild and is visible to all readers + the out-of-band `nn-graph-eval.mjs`. Correct.

**2. FAIL-LOUD parity — PASS.** `regen-viz.mjs:264-267` is byte-pattern-identical to the reparent (L230-233) and add-parent-contains-edges (L244-247) siblings: `if (sg.status !== 0) { console.error(...); failed++; }`. No throw, no `process.exit` — it is a non-fatal increment, deliberately distinct from the hard merge-abort gate (which is the *only* `process.exit` path and stays exclusive to merge integrity). Consistent with R12 + sibling convention.

**3. ARG CORRECTNESS — PASS.** Explicit `spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT,"scripts","seed-ghost-from-unwired.mjs"), "--apply"], ...)` at L261. Not a `FAST[]` array entry (those are invoked arg-less at L153-156, which would default to dry-run per seed-ghost L210 `if (!apply && !revert) dryRun=true` → silent no-seed). The test explicitly guards the FAST[] exclusion. Correct.

**4. IDEMPOTENCY — PASS.** `seed-ghost-from-unwired.mjs:274-303` does an id-keyed merge: `existingIds` Set → existing id replaces in place (`g.nodes[idx]=n; nodesUpdated++`), new id pushes once. Edges deduped on composite `from::to::type` key. Running every
... [+2735 chars truncated]
