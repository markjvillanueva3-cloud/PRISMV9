---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "Independent test-integrity review of unit U-HDRIVE-FULL-INDEX. Read BOTH end-to-"
date: "2026-06-11"
first_ts: "2026-06-11T13:24:51.297Z"
last_ts: "2026-06-11T13:26:17.324Z"
cwd: "H:\\prism-slot-sierra"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a149664044cf778a5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Independent test-integrity review of unit U-HDRIVE-FULL-INDEX. Read BOTH end-to-

> **claude-code-cli** | 2026-06-11 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a149664044cf778a5.jsonl`

## Transcript

### User | 2026-06-11T13:24:51.297Z

Independent test-integrity review of unit U-HDRIVE-FULL-INDEX. Read BOTH end-to-end:
- `H:/prism-slot-sierra/scripts/build-corpus-vault-index.mjs` (the generator — extended to stream a complete per-file JSONL across JM DIE + resource roots, with a coverage-manifest vault note + portable jsonlPath)
- `H:/prism-slot-sierra/scripts/build-corpus-vault-index.test.mjs` (8 node:test tests)

This generator indexes 484,762 H: files into a gitignored JSONL + substrate. It's fleet-consumed (the substrate feeds the corpus-index-query.mjs contract that quoting/ERP/machines/tooling read).

Weight toward what a correctness reviewer misses — TEST INTEGRITY (R9: tests verify intent, not behavior; no tautological/stub asserts):
- Are the tests HERMETIC? The e2e test passes `resourceRoots: []` + a tmp `hdriveFilesOut` so it never walks the real H: drive. Confirm NOTHING in the suite touches the real H:/PRISM or H:/ resource roots (that would be slow + non-deterministic). Does importing the module trigger side effects (the isMain guard)?
- Does the new e2e JSONL assertion actually PROVE the per-file streaming works (3 JM files → 3 JSONL rows with correct root/ext/top/path), or could it pass with a broken sink? Would it FAIL if the sink wrote nothing?
- Does the multi-root test prove: (a) the JSONL spans JM + a resource root with correct `root` labels, (b) a MISSING resource root is skipped fail-soft (not throwing), (c) the resourceRoots aggregate is populated? Trace it.
- Coverage floor: happy + failure modes (missing manifest fail-loud, missing resource root skip) + adversarial (empty/non-array manifest, null docs — are these still covered after the changes?). Any gap?
- Is the `hdriveFiles.excludedNoise` transparency assertion meaningful (R12)?
- Do tests clean up tmp dirs (try/finally)? Any flaky ordering assumption (readdir order)?
- Naming/convention/ASCII conformance.

Report file:line per finding with P0/P1/P2. End with: VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-11T13:24:55.840Z

I'll read both files in parallel to conduct a thorough test integrity review.

### Assistant | 2026-06-11T13:24:56.221Z

[tool_use: Read]

### Assistant | 2026-06-11T13:24:56.602Z

[tool_use: Read]

### User | 2026-06-11T13:24:57.870Z

[tool_result] read-once-guard: 'H:\prism-slot-sierra\scripts\build-corpus-vault-index.mjs' was already read 8s ago in this session and is unchanged (mtime 1781184123974). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### User | 2026-06-11T13:24:58.549Z

[tool_result] 1	// scripts/build-corpus-vault-index.test.mjs
2	//
3	// U-CORPUS-VAULT-INDEX (2026-06-10, slot:sierra) -- hermetic tests for the JM+Docustrata
4	// corpus-index generator. Pure helpers tested directly; buildCorpusIndex tested against tmp
5	// fixture corpora (never the real 67MB manifest / 317K-file JM tree).
6	//
7	// Coverage: happy + empty + adversarial (null/missing fields, non-array manifest
... [+10641 chars truncated]

### Assistant | 2026-06-11T13:25:03.867Z

Now let me also check the generator file content since the read-cache blocked it — I'll use Grep to get the key sections I need.

### Assistant | 2026-06-11T13:25:05.741Z

[tool_use: Grep]

### Assistant | 2026-06-11T13:25:06.860Z

[tool_use: Grep]

### User | 2026-06-11T13:25:07.455Z

[tool_result] 52:const REPO = process.env.PRISM_CORPUS_REPO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
396:const isMain = (() => {
397:  try { return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href; }
401:if (isMain) {

### User | 2026-06-11T13:25:09.298Z

[tool_result] 73:export function groupDocustrata(manifest) {
94:    exportedAt: (manifest && manifest.exported_at) || null,
101:export function summarizeJmDie({ perFolder, extHist, totalFiles, totalBytes }) {
128:export function renderDocustrataNote(g, { manifestPath, indexJsonls }) {
144:> Exported ${g.exportedAt || 'n/a'} from ${g.platform || 'Docustrata'}. ${g.folderCount != null ? g.folderCount + ' watched 
... [+262 chars truncated]

### Assistant | 2026-06-11T13:25:13.014Z

Good. Now let me get the key sections of the generator to verify the sink logic, the isMain guard scope, and the hdriveFiles implementation:

### Assistant | 2026-06-11T13:25:13.655Z

[tool_use: Read]

### Assistant | 2026-06-11T13:25:14.247Z

[tool_use: Read]

### User | 2026-06-11T13:25:15.927Z

[tool_result] 296	export function buildCorpusIndex(opts = {}) {
297	  const manifestPath = opts.manifestPath || DOCUSTRATA_MANIFEST;
298	  const jmRoot = opts.jmRoot || JM_DIE_ROOT;
299	  const indexDir = opts.indexDir || DOCUSTRATA_INDEX_DIR;
300	  const vaultAtlas = opts.vaultAtlas || VAULT_ATLAS;
301	  const substrateOut = opts.substrateOut || SUBSTRATE_OUT;
302	  const resourceRoots = opts.resourceRoots || 
... [+5497 chars truncated]

### User | 2026-06-11T13:25:15.984Z

[tool_result] 196	export function renderCoverageManifest({ jmFiles, jmBytes, docTotal, resourceRoots, hdriveTotalFiles, hdriveBytes, jsonlPath, excludedNoise }) {
197	  const rows = [
198	    ['JM DIE', jmFiles.toLocaleString(), humanBytes(jmBytes), 'NC programs / prints / CAD-CAM / setups -- the test shop'],
199	    ['Docustrata', docTotal.toLocaleString(), '(manifest)', 'OCR\'d scanned docs -- own manifest, n
... [+4809 chars truncated]

### Assistant | 2026-06-11T13:25:19.257Z

Now let me read the remaining parts of the generator I haven't seen yet — the top of the file for constants, EXCLUDED_NOISE, and RESOURCE_ROOTS defaults:

### Assistant | 2026-06-11T13:25:20.008Z

[tool_use: Read]

### User | 2026-06-11T13:25:21.918Z

[tool_result] 1	#!/usr/bin/env node
2	// build-corpus-vault-index.mjs -- SIERRA-VAULT-OPS / U-CORPUS-VAULT-INDEX (2026-06-10, slot:sierra)
3	//
4	// Indexes the two big H: knowledge corpora into the Obsidian vault + a queryable substrate:
5	//   - Docustrata: 111,745 ALREADY-OCR'd documents. Read its manifest.json (+ .index/ jsonls).
6	//     NEVER re-OCR (critical-resource-roots doctrine) -- we only read the e
... [+4212 chars truncated]

### Assistant | 2026-06-11T13:26:17.324Z

I now have all the information needed. Let me deliver the full review.

---

## Test Integrity Review — U-HDRIVE-FULL-INDEX

### Generator under review
`H:/prism-slot-sierra/scripts/build-corpus-vault-index.mjs`

### Test suite under review
`H:/prism-slot-sierra/scripts/build-corpus-vault-index.test.mjs`

---

## Summary

The suite is well-structured and substantially correct. The hermetic boundary holds, the isMain guard is sound, the JSONL sink is genuinely exercised, and the try/finally cleanup is consistent. Four issues are worth surfacing — one is a meaningful gap (P1), the rest are P2.

---

## Critical Gaps

None at P0.

---

## Important Improvements

**P1 — The multi-root test does not assert `root` label correctness for JM vs resource rows in isolation from each other (test line 193-194)**

The test at line 191-194 reads:

```js
assert.equal(rows.filter(x => x.root === 'JM DIE').length, 1);
assert.equal(rows.filter(x => x.root === 'extra').length, 2);
```

This is actually correct and does prove the root labeling. Reclassifying — no gap here, this IS the proof. Upgrading this finding: the real P1 is below.

**P1 — The `hdriveFilesOut` default derivation path is untested; a caller omitting it silently writes to a sibling of `substrateOut`, which is a fleet-consumed path**

`buildCorpusIndex.mjs:303`:
```js
const hdriveFilesOut = opts.hdriveFilesOut || path.join(path.dirname(substrateOut), 'hdrive-files.jsonl');
```

Every test explicitly passes `hdriveFilesOut`. No test exercises the default-derivation branch — the case where `opts.hdriveFilesOut` is absent. If a caller (e.g. `corpus-index-query.mjs`) invokes `buildCorpusIndex({manifestPath, jmRoot, vaultAtlas, substrateOut})` without `hdriveFilesOut`, the JSONL lands next to the substrate at `state/shared/corpus-index/hdrive-files.jsonl`. The `portableJsonl` path baked into the committed substrate JSON would then encode that default path. There is no test that verifies the default path is sane, that the `p
... [+6323 chars truncated]
