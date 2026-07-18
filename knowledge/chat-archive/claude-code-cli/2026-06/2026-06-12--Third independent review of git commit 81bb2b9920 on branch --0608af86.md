---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "Third independent review of git commit 81bb2b9920 on branch slot/sierra in workt"
date: "2026-06-12"
first_ts: "2026-06-12T19:56:55.885Z"
last_ts: "2026-06-12T20:02:25.287Z"
cwd: "H:\\prism-slot-sierra"
messages: 42
user_msgs: 15
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-aaa5ec2278dc028ab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Third independent review of git commit 81bb2b9920 on branch slot/sierra in workt

> **claude-code-cli** | 2026-06-12 | 42 msgs (15 user / 27 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-aaa5ec2278dc028ab.jsonl`

## Transcript

### User | 2026-06-12T19:56:55.885Z

Third independent review of git commit 81bb2b9920 on branch slot/sierra in worktree H:\prism-slot-sierra. Run `git -C H:/prism-slot-sierra show 81bb2b9920` and Read changed files end-to-end. Weight toward SILENT BREAKAGE, regression risk, I/O safety, error-budget completeness, and integration coupling. Do NOT assume arms A/B caught anything. Grade PASS/FAIL with P0/P1/P2 + file:line.

The commit adds a `corpus`/vault-atlas surface to the zulu/Hermes per-slot context bundle and fixes 4 dormant importers (zebra->zulu rename).

Hunt for:
- Any disk error path that can throw OUT of loadCorpusAtlas or loadSlotContext (the loader call, the freshness resolveSubstrate+existsSync+statSync block, the atlasNotes existsSync block) -- each must be try/caught. A throw out of loadSlotContext would break the per-prompt hook for every slot.
- The hook render line uses `s.jmDie.totalFiles.toLocaleString('en-US')` -- can totalFiles ever be non-numeric when ctx.corpus.ok && ctx.corpus.summary (then .toLocaleString throws inside the hook)? Trace corpusSummary in scripts/lib/corpus-index-query.mjs.
- Does the new corpus surface silently bloat the 548MB system-viz graph? generate-chat-slot-nodes-features.mjs serializes loadSlotContext output into slot nodes -- does it embed the full corpus envelope (summary/pointers/atlasNotes) per node? (It should only read ctx.soul.hermesRole.)
- Does loadCorpusAtlas read only the ~40KB aggregate substrate (corpus-index.json) and NEVER the 126MB hdrive-files.jsonl sidecar? Confirm via loadCorpusIndex in corpus-index-query.mjs.
- Reason masking: ENOENT->"missing" vs other->"error" -- is a real error ever silently swallowed as "missing"?
Report GRADE + numbered findings. Do not edit.

### Assistant | 2026-06-12T19:56:59.974Z

I'll review commit 81bb2b9920 thoroughly, focusing on silent breakage, I/O safety, and error-budget completeness.

### Assistant | 2026-06-12T19:57:00.911Z

[tool_use: Bash]

### User | 2026-06-12T19:57:30.645Z

[tool_result] commit 81bb2b9920c5db984df48ff59cec2ed31176db30
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 12 14:53:12 2026 -0500

    [MAIN] [SIERRA-VAULT-OPS]/U-LINK-ZULU-CORPUS (slot:sierra): wire corpus/vault-atlas into the zulu/Hermes context bundle + fix 4 dormant zebra->zulu importers
    
    ROI thread #1 in system-viz/MEMORY.md ("link galaxy -> zulu for Hermes+Obsidian")
... [+2805 chars truncated]

### Assistant | 2026-06-12T19:57:33.876Z

Let me view the full diff and read the key changed files end-to-end.

### Assistant | 2026-06-12T19:57:35.855Z

[tool_use: Bash]

### Assistant | 2026-06-12T19:57:36.322Z

[tool_use: Read]

### Assistant | 2026-06-12T19:57:36.771Z

[tool_use: Read]

### User | 2026-06-12T19:58:01.838Z

[tool_result] commit 81bb2b9920c5db984df48ff59cec2ed31176db30
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 12 14:53:12 2026 -0500

    [MAIN] [SIERRA-VAULT-OPS]/U-LINK-ZULU-CORPUS (slot:sierra): wire corpus/vault-atlas into the zulu/Hermes context bundle + fix 4 dormant zebra->zulu importers
    
    ROI thread #1 in system-viz/MEMORY.md ("link galaxy -> zulu for Hermes+Obsidian")
... [+10034 chars truncated]

### User | 2026-06-12T19:58:03.779Z

[tool_result] read-once-guard: 'H:\prism-slot-sierra\scripts\lib\zulu-context-bundle.mjs' was already read 11m ago in this session and is unchanged (mtime 1781292821199). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### User | 2026-06-12T19:58:03.785Z

[tool_result] read-once-guard: 'H:\prism-slot-sierra\scripts\lib\corpus-index-query.mjs' was already read 30m ago in this session and is unchanged (mtime 1781238871110). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-12T19:58:08.517Z

The read-once guard says I read both files earlier this session, but this is a fresh review session — let me disable the cache and read the critical functions in corpus-index-query.mjs. The guard claims context but I need to verify the actual content of `corpusSummary`, `loadCorpusIndex`, and `resolveCorpusSubstrate`.

### Assistant | 2026-06-12T19:58:10.011Z

[tool_use: Bash]

### User | 2026-06-12T19:58:41.898Z

[tool_result] 41:export function resolveCorpusSubstrate({ _fs = fs, candidates = corpusSubstrateCandidates() } = {}) {
53:export function loadCorpusIndex(substratePath = null, { force = false, _fs = fs } = {}) {
76:export function corpusSummary(idx) {
78:  const j = idx.jmDie || {};
81:    jmDie: { totalFiles: j.totalFiles || 0, folders: (j.folders || []).length, topExt: (j.extHistogram || [])[0] || null },
88:
... [+320 chars truncated]

### Assistant | 2026-06-12T19:58:47.020Z

Now let me read the critical functions in corpus-index-query.mjs end-to-end (lines 1-135 cover all four imported functions).

### Assistant | 2026-06-12T19:58:47.690Z

[tool_use: Read]

### User | 2026-06-12T19:58:52.052Z

[tool_result] 1	// scripts/lib/corpus-index-query.mjs -- SIERRA-VAULT-OPS / U-CORPUS-APP-WIRE (2026-06-10, slot:sierra)
2	//
3	// The QUERY CONTRACT that PRISM app features (quoting / business-ERP / machines / tooling)
4	// call to look up the JM DIE + Docustrata corpora WITHOUT walking 428K files. Reads the cheap
5	// aggregate substrate `state/shared/corpus-index/corpus-index.json` produced by
6	// build-corp
... [+7144 chars truncated]

### Assistant | 2026-06-12T19:58:58.676Z

Now I have the full picture of `corpusSummary`. Let me confirm the `totalFiles` type safety and check the hook render line, plus the `generate-chat-slot-nodes-features.mjs` change to confirm it doesn't embed the corpus envelope.

### Assistant | 2026-06-12T19:59:00.975Z

[tool_use: Bash]

### User | 2026-06-12T19:59:17.219Z

[tool_result] commit 81bb2b9920c5db984df48ff59cec2ed31176db30
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 12 14:53:12 2026 -0500

    [MAIN] [SIERRA-VAULT-OPS]/U-LINK-ZULU-CORPUS (slot:sierra): wire corpus/vault-atlas into the zulu/Hermes context bundle + fix 4 dormant zebra->zulu importers
    
    ROI thread #1 in system-viz/MEMORY.md ("link galaxy -> zulu for Hermes+Obsidian")
... [+6508 chars truncated]

### Assistant | 2026-06-12T19:59:20.543Z

Now let me examine how `generate-chat-slot-nodes-features.mjs` uses the `loadSlotContext` output — to confirm it only reads `ctx.soul.hermesRole` and does NOT embed the full corpus envelope per node (the 548MB graph bloat concern).

### Assistant | 2026-06-12T19:59:22.685Z

[tool_use: Bash]

### User | 2026-06-12T19:59:32.887Z

[tool_result] 3: * generate-chat-slot-nodes-features.mjs — system-viz augmentation: chat fleet.
9: * loadSlotContext from scripts/lib/zulu-context-bundle.mjs) and emits a
11: *   - parent roost `ghost.chat_fleet` (kind ghost-roost, under ghost.planned_features).
30: * Modeled on generate-bridge-synergy-features.mjs. Registered in
33: * Usage:  node scripts/generate-chat-slot-nodes-features.mjs
47:export const P
... [+997 chars truncated]

### Assistant | 2026-06-12T19:59:36.644Z

Let me read the node-building section (lines 110-230) to confirm exactly what fields land in the node `info`/`features` — verifying the corpus envelope is NOT embedded.

### Assistant | 2026-06-12T19:59:37.307Z

[tool_use: Read]

### User | 2026-06-12T19:59:42.103Z

[tool_result] 108	
109	  // 1. Emit parent roost (ghost.chat_fleet).
110	  if (!ids.has(FLEET_ROOST_ID)) {
111	    newNodes.push({
112	      id: FLEET_ROOST_ID,
113	      label: "💬 PRISM Chat Fleet (26 NATO slots)",
114	      layer: ROOST_LAYER,
115	      kind: "ghost-roost",
116	      group: "chat_fleet",
117	      info: truncate(
118	        "PSN leg-aggregator for the 26-slot Claude Code fleet. Each child is
... [+4918 chars truncated]

### Assistant | 2026-06-12T19:59:48.869Z

Confirmed: `generate-chat-slot-nodes-features.mjs` only reads scalar fields from `ctx` (`soul.hermesRole`, `soul.refuseList.length`, `loop.ok/running`, `tokenZone.zone`, `decision.recommend/suppressCompact`) into `info`/`metadata`. The corpus envelope is NOT embedded per node — no graph bloat. 

Now let me verify the freshness/disk-error paths in the build-corpus index to confirm what `totalFiles` can be, and check the test file for coverage of the throw paths. Let me also confirm `resolveCorpusSubstrate` cannot throw on a bad `existsSync`.

### Assistant | 2026-06-12T19:59:51.725Z

[tool_use: Bash]

### User | 2026-06-12T20:00:09.244Z

[tool_result] 169:export function summarizeJmDie({ perFolder, extHist, totalFiles, totalBytes }) {
171:    totalFiles,
249:# JM DIE Corpus Index (${s.totalFiles.toLocaleString()} files)
332:  let totalFiles = 0, totalBytes = 0, statErrors = 0, prunedDirs = 0;
333:  if (!fs.existsSync(root)) return { perFolder, extHist, totalFiles, totalBytes, statErrors, prunedDirs, missing: true };
342:    totalFiles++; totalB
... [+1617 chars truncated]

### Assistant | 2026-06-12T20:00:16.744Z

`totalFiles` is built as a numeric counter (`let totalFiles = 0; totalFiles++`), and `corpusSummary` coerces with `j.totalFiles || 0`. So `s.jmDie.totalFiles` is always a number when `summary !== null`. The `.toLocaleString` in the hook is safe. Same for `s.docustrata.total` (`d.total || 0`).

Now the key trace: `corpusSummary` always returns a non-null object (it never returns null — it returns `{docustrata:{...}, jmDie:{...}}` even for `{}`). This means `loadCorpusAtlas`'s `ok = summary !== null` is `true` whenever the loader does not throw. Let me verify the loader is the ONLY null-producing path, and confirm `corpusSummary({})` returns a valid object — so the `.toLocaleString` is bulletproof. Let me also check the test file to see what's actually covered.

### Assistant | 2026-06-12T20:00:19.530Z

[tool_use: Bash]

### User | 2026-06-12T20:00:36.073Z

[tool_result] 44:  loadCorpusAtlas,
1356:// loadCorpusAtlas (U-LINK-ZULU-CORPUS) -- the corpus/vault-atlas surface that
1358:// every disk seam (corpusLoader / resolveSubstrate / _fs) is injected.
1384:describe("loadCorpusAtlas -- corpus/vault-atlas surface", () => {
1388:    const env = loadCorpusAtlas({
1389:      corpusLoader: () => FAKE_CORPUS_IDX,
1390:      resolveSubstrate: () => "/fake/state/shared/corp
... [+1844 chars truncated]

### Assistant | 2026-06-12T20:00:42.137Z

The test covers the throw paths well, including a non-Error throw (`throw { weird: true }`) at line 1479 — which exercises the `e && e.code === "ENOENT"` guard against null/non-Error. Let me verify that specific test's expectation, and trace one subtle gap: when the loader throws a non-ENOENT (e.g. JSON.parse SyntaxError on a corrupt substrate), `reason="error"` but `ok=false` → the final `reason: ok ? null : (reason || "missing")` keeps `"error"`. Good. But let me confirm the case where loader throws something with `code` undefined produces `"error"` not `"missing"` masking.

### Assistant | 2026-06-12T20:00:43.348Z

[tool_use: Read]

### User | 2026-06-12T20:00:52.490Z

[tool_result] 1408	
1409	  it("missing substrate (ENOENT) -- fail-soft reason:missing, never throws", () => {
1410	    const env = loadCorpusAtlas({
1411	      corpusLoader: () => { const e = new Error("nope"); e.code = "ENOENT"; throw e; },
1412	      resolveSubstrate: () => null,
1413	      _fs: fakeFs({ existsFor: () => false }),
1414	    });
1415	    assert.equal(env.ok, false);
1416	    assert.equal(env.re
... [+3749 chars truncated]

### Assistant | 2026-06-12T20:01:00.318Z

The "fail-soft never throws" test (line 1477) is comprehensive — it makes the loader, resolveSubstrate, AND `_fs.existsSync/statSync` all throw, and asserts `doesNotThrow`. This directly validates the most critical concern: a throw out of `loadCorpusAtlas` breaking the per-prompt hook. 

Now let me verify the one path the test does NOT cover: the `atlasNotes` block. In `loadCorpusAtlas`, the `atlasNotes` try/catch wraps `ATLAS_NOTE_NAMES.map(...)` — but `path.join(atlasDir, name)` is called with `atlasDir` which could be a non-string only if `opts.atlasDir` is a non-string (then it defaults to `DEFAULT_ATLAS_DIR`, a string). The test at 1482 makes `existsSync` throw inside the map and the catch handles it. Good.

Let me check one final integration concern: does the live hook `slot-context-bundle-inject.mjs` actually call `loadSlotContext` (so corpus flows through), and is the render guarded against `s.jmDie` being undefined? `corpusSummary` always returns `jmDie` and `docustrata` keys, so `s.jmDie.totalFiles` is safe when `summary !== null`. Let me confirm the hook reads `ctx.corpus` from the same `loadSlotContext` output.

### Assistant | 2026-06-12T20:01:02.371Z

[tool_use: Bash]

### User | 2026-06-12T20:01:36.044Z

[tool_result] 5:// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
47:  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
78:function fmtSummary(ctx, verbose, liveBrain) {
94:    try {
99:        try {
101:        } catch { /* missing — skip */ }
106:      try {
110:      } catch { /* no brief — slot in SLOT_GALAXY_MAP but no dispatch yet */ }
118:      
... [+947 chars truncated]

### Assistant | 2026-06-12T20:01:48.508Z

Excellent. The hook wraps `loadSlotContext` in a try/catch at line 216-218 (the call is defensively guarded even if a throw escaped `loadCorpusAtlas`), and the render line at 146 guards with `ctx.corpus?.ok && ctx.corpus.summary`. The `main().catch(() => {})` at 272 is a final backstop. Defense in depth is solid.

Let me verify the one remaining subtle point: confirm `loadCorpusIndex` reads ONLY `corpus-index.json` (~40KB aggregate) and never the 126MB `hdrive-files.jsonl` sidecar — the deep-path function `findJmFolder` deep variant reads the sidecar, but `loadCorpusAtlas` only calls `loadCorpusIndex`/`corpusSummary`/`corpusPointers`. From lines 53-69, `loadCorpusIndex` reads only `resolved` (the `corpus-index.json` substrate via `SUBSTRATE_REL`). `corpusPointers` returns the jsonl *path* as a string pointer (line 121 `docustrataIndexFiles`) but never reads it. Confirmed: no 126MB read.

I have everything needed. Final verification of the FAKE_CORPUS_IDX shape used in the happy-path test to confirm the `317136` numeric assertion.

### Assistant | 2026-06-12T20:01:50.616Z

[tool_use: Bash]

### User | 2026-06-12T20:01:57.584Z

[tool_result] 1360:const FAKE_CORPUS_IDX = Object.freeze({
1362:    total: 111745,
1370:    totalFiles: 317136,
1389:      corpusLoader: () => FAKE_CORPUS_IDX,
1399:    assert.equal(env.summary.jmDie.totalFiles, 317136);
1401:    assert.equal(env.summary.docustrata.total, 111745);
1439:      const env = loadCorpusAtlas({ corpusLoader: () => { touched = true; return FAKE_CORPUS_IDX; } });
1453:      corpusLoader
... [+877 chars truncated]

### Assistant | 2026-06-12T20:02:25.287Z

I have completed a thorough end-to-end review of commit 81bb2b9920. All concerns traced to source.

## GRADE: PASS

This is a clean, defensively-engineered, well-tested change. Every silent-breakage and I/O-safety concern raised in the review brief is correctly handled, with test coverage that directly exercises the dangerous paths. No P0 or P1 findings.

### Verification against each hunt item

**1. Disk error paths throwing out of `loadCorpusAtlas`/`loadSlotContext` — SAFE.**
All three disk blocks are independently try/caught in `scripts/lib/zulu-context-bundle.mjs`:
- The loader call (`zulu-context-bundle.mjs:920-927`) — try/catch sets `reason`, never rethrows.
- The freshness block (`resolveSub` + `existsSync` + `statSync`, `:931-940`) — wrapped in `try { ... } catch { /* advisory */ }`, leaves `mtime` null.
- The `atlasNotes` block (`:944-947`) — wrapped, resets to `[]` on throw.
Test `zulu-context-bundle.test.mjs:1477` ("never throws even if the loader AND fs both misbehave") makes the loader, `resolveSubstrate`, and both `_fs.existsSync`/`statSync` throw simultaneously and asserts `doesNotThrow`. Belt-and-suspenders: the live hook also wraps the `loadSlotContext` call itself (`slot-context-bundle-inject.mjs:216-218`) plus a `main().catch()` backstop (`:272`).

**2. `s.jmDie.totalFiles.toLocaleString('en-US')` throwing in the hook — SAFE.**
Traced `corpusSummary` (`corpus-index-query.mjs:76-83`): it coerces every field through `|| 0` (`j.totalFiles || 0`, `d.total || 0`), so when `summary !== null`, `s.jmDie.totalFiles` and `s.docustrata.total` are always numbers. The source counter `totalFiles` is a numeric increment in `build-corpus-vault-index.mjs:332-342`. Render guard `ctx.corpus?.ok && ctx.corpus.summary` (`slot-context-bundle-inject.mjs:146`) plus the always-present `jmDie`/`docustrata` keys means `.toLocaleString` cannot throw.

**3. 548MB graph bloat from corpus envelope in slot nodes — NOT PRESENT.**
`generate-chat-slot-nodes-features.mjs:146-196` re
... [+2812 chars truncated]
