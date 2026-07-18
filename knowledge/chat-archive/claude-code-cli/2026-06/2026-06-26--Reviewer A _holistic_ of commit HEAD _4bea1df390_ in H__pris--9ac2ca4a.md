---
type: "chat-session"
source: "claude-code-cli"
session_id: "9ac2ca4a-e4ec-42c4-af7d-0a7a6640c555"
title: "Reviewer A (holistic) of commit HEAD (4bea1df390) in H:/prism. Read `git -C H:/p"
date: "2026-06-26"
first_ts: "2026-06-26T01:20:37.875Z"
last_ts: "2026-06-26T01:24:23.214Z"
cwd: "H:\\prism"
messages: 60
user_msgs: 23
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/9ac2ca4a-e4ec-42c4-af7d-0a7a6640c555/subagents/agent-a3d1ec17a7fb047d9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Reviewer A (holistic) of commit HEAD (4bea1df390) in H:/prism. Read `git -C H:/p

> **claude-code-cli** | 2026-06-26 | 60 msgs (23 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9ac2ca4a-e4ec-42c4-af7d-0a7a6640c555/subagents/agent-a3d1ec17a7fb047d9.jsonl`

## Transcript

### User | 2026-06-26T01:20:37.875Z

Reviewer A (holistic) of commit HEAD (4bea1df390) in H:/prism. Read `git -C H:/prism show HEAD` and the files: `scripts/drain-web-sources-tribal.mjs`, `scripts/drain-web-sources-tribal.test.mjs`, `state/shared/web-source-extraction/web-source-queue.json`.

Context: a new staging-only "web article -> tribal tip" learning lane, mirroring the proven youtube-night-extract. Flow: curated web-source-queue.json -> fetchUrlText -> stripHtmlToText -> textToTranscript (converts text to the {segments:[{start,end,text}]} shape) -> REUSE youtube-free-extract.mjs's extractTipsFromTranscript (Ollama tip-gen) -> writeExtractionArtifact into state/shared/youtube-extraction/ with meta.videoId="web-<hash>". STAGING-ONLY (never mutates the tribal store); the already-armed promote cron (promote-youtube-staged) promotes web-<hash> artifacts via U-TK01 dedup. Validated live: machiningdoctor -> 7 real tips staged; helical 404 + sandvik JS-rendered handled fail-soft; 10/10 tests pass.

Acceptance:
 1. No stubs/TODOs/placeholder returns; the script is complete + runnable.
 2. Tests use concrete assertions (R9) -- real behavior, not toBeDefined stubs; cover failure modes.
 3. No floating promises, no swallowed errors that bury real failures.
 4. SAFETY: fetched HTML must be treated as DATA (fed to Ollama for tip-gen), never executed as instructions / shell. Confirm no injection/SSRF/path-traversal risk (the url is from a curated https-only queue; webSourceId hash; artifact path).
 5. Correctness: is the textToTranscript shape right for chunkTranscript? Is the staging reuse (meta.videoId="web-<hash>") compatible with promote-youtube-staged's normalizeArtifact? Is fail-soft genuinely per-source (one bad URL never aborts the rest)? Is the run-lock dead-PID-aware? Is the 0-tip-skip correct?

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then <=5 notes. If unsure, FAIL.

### Assistant | 2026-06-26T01:20:40.815Z

I'll review this commit thoroughly. Let me start by reading the diff and the relevant files.

### Assistant | 2026-06-26T01:20:41.393Z

[tool_use: Bash]

### Assistant | 2026-06-26T01:20:42.231Z

[tool_use: Read]

### Assistant | 2026-06-26T01:20:42.733Z

[tool_use: Read]

### Assistant | 2026-06-26T01:20:42.850Z

[tool_use: Read]

### User | 2026-06-26T01:20:46.610Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * drain-web-sources-tribal.mjs -- U-WEB-SOURCE-TRIBAL-LANE (slot:india 2026-06-25)
4	 * ==============================================================================
5	 *
6	 * The NON-VIDEO half of the operator's "/learn pipeline ... include videos and
7	 * OTHER REPUTABLE SOURCES FROM ONLINE ... only add NEW knowledge" directive.
8	 * The video half is youtube-nigh
... [+15232 chars truncated]

### User | 2026-06-26T01:20:47.060Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "note": "Curated reputable NON-VIDEO web sources for the /learn tribal pipeline (U-WEB-SOURCE-TRIBAL-LANE, slot:india 2026-06-25). Consumed by scripts/drain-web-sources-tribal.mjs -- STAGING-ONLY (download -> strip HTML -> Ollama tip-gen -> stage as web-<hash>.json under state/shared/youtube-extraction/); promoted ATTENDED by the armed 'PRISM Tribal Promotion 
... [+1410 chars truncated]

### User | 2026-06-26T01:20:47.118Z

[tool_result] 1	/**
2	 * Tests for drain-web-sources-tribal.mjs pure helpers + fail-soft fetch.
3	 * Run directly: `node scripts/drain-web-sources-tribal.test.mjs` (node:test auto-runs on exit).
4	 */
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import {
8	  webSourceId, stripHtmlToText, textToTranscript, parseQueue, parseLedger, dueSources, isLockFresh, fetchUrlText, QUEUE_S
... [+6911 chars truncated]

### User | 2026-06-26T01:20:50.486Z

[tool_result] commit 4bea1df390b62c51b124c9407ceb63dba42c9c20
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 20:20:12 2026 -0500

    [MAIN-FORCE] [CAD-LEARNING-AI]/U-WEB-SOURCE-TRIBAL-LANE (slot:india): the non-video web half of the /learn pipeline (online sources -> tribal)
    
    Operator: "include videos AND OTHER REPUTABLE SOURCES FROM ONLINE ... only add NEW knowledge." T
... [+2128 chars truncated]

### Assistant | 2026-06-26T01:20:54.903Z

Now I need to verify the reused functions from the youtube lane behave as claimed. Let me read `youtube-free-extract.mjs` to verify the contract (`extractTipsFromTranscript`, `chunkTranscript`, `writeExtractionArtifact`) and the promote side's `normalizeArtifact`.

### Assistant | 2026-06-26T01:20:55.132Z

[tool_use: Read]

### User | 2026-06-26T01:20:59.960Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * youtube-free-extract.mjs — $0 YouTube → PRISM tribal/wiki pipeline
4	 *
5	 * Implements the FREE extraction stack so PRISM can absorb machining-channel
6	 * tribal knowledge without paying for Whisper API or Claude Vision.
7	 *
8	 * TIER STACK (cheapest-first, each tier falls through on miss):
9	 *   1. yt-dlp auto-generated subtitles  ($0, instant, ~95% of YouTube
... [+39643 chars truncated]

### Assistant | 2026-06-26T01:21:03.537Z

Now let me verify the critical contract claims: (1) the artifact record shape the web drainer writes vs what the youtube lane writes, and (2) the promote side's `normalizeArtifact` to confirm `web-<hash>` artifacts are compatible.

### Assistant | 2026-06-26T01:21:04.504Z

[tool_use: Bash]

### Assistant | 2026-06-26T01:21:05.148Z

[tool_use: Grep]

### User | 2026-06-26T01:21:06.751Z

[tool_result] 7: * in state/shared/youtube-extraction/<videoId>.json and nothing touches the
49: * Pure: validate + normalize one parsed artifact. Returns {ok, videoId, meta,
51: * with a videoId and a non-empty tips array (transcript-only runs are not).
53:export function normalizeArtifact(parsed, fileName) {
56:  const videoId = meta && (meta.videoId || meta.video_id);
57:  if (!videoId) return { ok: false, r
... [+1088 chars truncated]

### User | 2026-06-26T01:21:09.871Z

[tool_result] promote-jm-mill-fleet-to-enhanced.mjs*
promote-memory-to-wiki.mjs*
promote-memory-to-wiki.test.mjs
promote-tribal-to-wiki.mjs*
promote-tribal-to-wiki.test.mjs
promote-youtube-staged.mjs*
promote-youtube-staged.test.mjs

### Assistant | 2026-06-26T01:21:13.156Z

Let me read the full `normalizeArtifact` and the promote selection logic to confirm the `web-<hash>` artifact's record shape is compatible.

### Assistant | 2026-06-26T01:21:13.983Z

[tool_use: Read]

### User | 2026-06-26T01:21:15.314Z

[tool_result] 40	const NON_ARTIFACT = /^(night-queue\.json|promoted-ledger\.json)$/;
41	const FALLBACK_SUFFIX = "-tips-fallback.json";
42	
43	/** Pure: is this filename a primary extraction artifact? */
44	export function isArtifactFile(name) {
45	  return name.endsWith(".json") && !NON_ARTIFACT.test(name) && !name.endsWith(FALLBACK_SUFFIX);
46	}
47	
48	/**
49	 * Pure: validate + normalize one parsed artifact. 
... [+3034 chars truncated]

### Assistant | 2026-06-26T01:21:20.996Z

I have verified the promote-side contract. The web drainer writes `{ meta, tips: ex.tips, source_url, extractionStats, fetchedAt }`, and `normalizeArtifact` requires `parsed.meta.videoId` (web drainer sets `meta.videoId = "web-<hash>"`) plus `Array.isArray(parsed.tips)` non-empty (web drainer only writes the artifact when `ex.tips.length > 0`). Compatible.

Now I need to check how the promote side actually ingests these tips — specifically whether `ingestImpl` / `wikiImpl` build IDs and provenance correctly for a `web-<hash>` videoId, and whether the wiki path collides. Let me check the real ingest/wiki impls used in the promote `main()`.

### Assistant | 2026-06-26T01:21:21.816Z

[tool_use: Read]

### User | 2026-06-26T01:21:23.199Z

[tool_result] 114	
115	function saveLedgerDefault(map) {
116	  const obj = { schemaVersion: LEDGER_SCHEMA, promoted: Object.fromEntries(map) };
117	  mkdirSync(dirname(PROMOTED_LEDGER_PATH), { recursive: true });
118	  const tmp = PROMOTED_LEDGER_PATH + ".tmp." + process.pid;
119	  writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
120	  renameSync(tmp, PROMOTED_LEDGER_PATH);
121	}
122	
123	export async 
... [+2551 chars truncated]

### Assistant | 2026-06-26T01:21:32.279Z

This is a critical finding. The promote side at line 148-151 reuses `ingestTips` and `writeWikiEntry`. Note: `promote` passes `a.tips` directly to `ingestImpl`, and `a.tips` for a web artifact are the RAW tips from `extractTipsFromTranscript` (shape: `{title, body, category, tags, confidence, timestamp_hint}`), NOT `KnowledgeTip`-shaped records.

Let me verify what `ingestTips` expects vs what the web drainer stages. The web drainer stages `tips: ex.tips` (raw parsed tips). For the youtube full-run path, `processSingleVideo` calls `tipsToKnowledgeTips(ex.tips, meta)` BEFORE writing the artifact (line 792, 821). So the youtube artifact's `tips` are KnowledgeTip records (with `id`, `provenance`, `confidence` as 0-100 int, etc.), but the web drainer's artifact `tips` are raw tips (confidence 0-1 float, no `id`, no `provenance`). Let me verify `ingestTips` -> `engine.ingest` tolerates the raw shape, and check the transcript-only youtube artifacts to confirm the staged shape the promote path normally sees.

### Assistant | 2026-06-26T01:21:34.965Z

[tool_use: Bash]

### User | 2026-06-26T01:21:41.310Z

[tool_result] === state/shared/youtube-extraction/-4AmEAUQi3I-tips-fallback.json ===
videoId: undefined
mode: undefined
tips0 keys: (none)
=== state/shared/youtube-extraction/-4AmEAUQi3I.json ===
videoId: -4AmEAUQi3I
mode: full
tips0 keys: [
  'id',          'title',
  'body',        'category',
  'tags',        'confidence',
  'source',      'created_at',
  'usage_count', 'provenance'
]

### Assistant | 2026-06-26T01:21:46.305Z

This confirms a real discrepancy. Existing youtube artifacts stage **KnowledgeTip-shaped** tips (with `id`, `source`, `created_at`, `provenance`, `confidence` as 0-100 int). The web drainer stages **raw extractTipsFromTranscript tips** (`{title, body, category, tags, confidence:0-1, timestamp_hint}`) — it does NOT call `tipsToKnowledgeTips`.

When the promote cron runs `ingestTips(a.tips, {})` on a web artifact, those raw tips go straight into `engine.ingest`. Let me verify what `TribalKnowledgeEngine.ingest` requires — whether the missing `id`/`source`/`created_at` cause a hard failure, silent drop, or a malformed record.

### Assistant | 2026-06-26T01:21:48.215Z

[tool_use: Grep]

### User | 2026-06-26T01:21:49.948Z

[tool_result] 81:  source: string;                    // "operator:John", "incident:2024-03-15", etc.
82:  created_at: string;
179:[Omitted long matching line]
180:[Omitted long matching line]
181:  { id: "tk-003", title: "Vise jaw alignment check", body: "Every Monday morning: run a dial indicator across the fixed jaw. If TIR exceeds 0.0005\" (0.013mm), re-seat the jaw with a soft hammer and re-indicate. 90% o
... [+4470 chars truncated]

### Assistant | 2026-06-26T01:21:54.190Z

Let me find the actual `ingest()` method body in TribalKnowledgeEngine to see how it handles records missing `id`/`source`/`created_at` and whether the U-TK01 content-dedup depends on those fields.

### Assistant | 2026-06-26T01:21:56.277Z

[tool_use: Grep]

### User | 2026-06-26T01:21:57.833Z

[tool_result] No matches found

[Showing results with pagination = offset: 60]

### Assistant | 2026-06-26T01:22:02.071Z

[tool_use: Bash]

### User | 2026-06-26T01:22:09.102Z

[tool_result] 1370:  ingest(tips: KnowledgeTip[]): number {
---method body around ingest---

### Assistant | 2026-06-26T01:22:12.385Z

[tool_use: Read]

### User | 2026-06-26T01:22:13.660Z

[tool_result] 1370	  ingest(tips: KnowledgeTip[]): number {
1371	    const existingIds = new Set(this.tips.map(t => t.id));
1372	    let added = 0;
1373	    let contentDupes = 0;
1374	    for (const tip of tips) {
1375	      // U-TK01: Check both ID and content hash
1376	      if (existingIds.has(tip.id)) continue;
1377	      if (this.isDuplicateContent(tip)) {
1378	        contentDupes++;
1379	        continue
... [+2383 chars truncated]

### Assistant | 2026-06-26T01:22:19.468Z

This is the decisive evidence. Let me confirm the ID-dedup and content-dedup behavior with the raw-tip shape, since `ingest()` keys dedup on `tip.id` (line 1376) and content-hash (`isDuplicateContent`). The web drainer's tips have NO `id` field. Let me check `isDuplicateContent` and `registerContent` to see whether `undefined` id causes a collision/overwrite or just degrades dedup.

### Assistant | 2026-06-26T01:22:20.693Z

[tool_use: Bash]

### User | 2026-06-26T01:22:24.874Z

[tool_result] 966:function autoCategorize(tip: KnowledgeTip): KnowledgeTip {
1262:      this._staticTips = this.RAW_STATIC_TIPS.map(t => autoCategorize(t));
1275:      ].map(t => autoCategorize(t));
1325:  private isDuplicateContent(tip: { title?: string; body?: string }): boolean {
1331:  private registerContent(tip: { title?: string; body?: string }): void {
1343:    if (this.isDuplicateContent(tip)) {
1354: 
... [+177 chars truncated]

### Assistant | 2026-06-26T01:22:29.792Z

[tool_use: Read]

### User | 2026-06-26T01:22:30.781Z

[tool_result] 966	function autoCategorize(tip: KnowledgeTip): KnowledgeTip {
967	  // U-TK02: Skip if already categorized to avoid redundant regex calls
968	  if (tip.auto_categorized) {
969	    return tip;
970	  }
971	
972	  // U-TK02: Null guard for undefined text fields
973	  const title = tip.title ?? "";
974	  const body = tip.body ?? "";
975	  const text = `${title}. ${body}`;
976	
977	  // Skip categoriz
... [+1273 chars truncated]

### Assistant | 2026-06-26T01:22:34.886Z

Now let me check `isDuplicateContent`/`registerContent` and confirm the persisted record handling for an undefined `id`. Then I'll check whether the youtube wiki writer (`writeWikiEntry`/`renderWikiEntry`) and `tipsToKnowledgeTips`-derived provenance are reached for web tips at all (they are not, since promote passes `a.tips` raw).

### Assistant | 2026-06-26T01:22:35.513Z

[tool_use: Read]

### User | 2026-06-26T01:22:37.125Z

[tool_result] 1325	  private isDuplicateContent(tip: { title?: string; body?: string }): boolean {
1326	    this.ensureHashes(); // U-TK-LAZY: build the hash set on first dedup check, not at boot
1327	    return this.contentHashes.has(contentHash(tip));
1328	  }
1329	
1330	  /** Register content hash (U-TK01). */
1331	  private registerContent(tip: { title?: string; body?: string }): void {
1332	    this.conten
... [+733 chars truncated]

### Assistant | 2026-06-26T01:22:44.377Z

I now have enough to assess the full data path. Let me verify one final thing: the U-TK01 content-dedup is based on `contentHash(tip)` which uses `title`+`body` (both present in the raw web tips), so the **dedup ("only add NEW knowledge") still works**. The concern is the persisted record quality (missing `id`/`source`/`created_at`/`provenance`).

Let me confirm `contentHash` keys only on title/body, and check whether the existing youtube `promote` path was actually validated to ingest the raw shape or the KnowledgeTip shape (the live validation in the commit message says machiningdoctor staged 7 tips, but staging != promotion). Let me also confirm there's no `.skip`/`.only` in the test and run the test to confirm 10/10.

### Assistant | 2026-06-26T01:22:45.776Z

[tool_use: Bash]

### Assistant | 2026-06-26T01:22:46.588Z

[tool_use: Bash]

### User | 2026-06-26T01:22:50.283Z

[tool_result] 646:function contentHash(tip: { title?: string; body?: string }): string {
---contentHash body---
function contentHash(tip: { title?: string; body?: string }): string {
  const content = `${tip.title || ""}::${tip.body || ""}`.toLowerCase().trim();
  return createHash("md5").update(content).digest("hex");
}

### User | 2026-06-26T01:22:54.813Z

[tool_result] NO skip/only/todo found

### Assistant | 2026-06-26T01:22:59.577Z

`contentHash` keys only on `title::body` — so U-TK01 dedup ("only add NEW knowledge") works correctly for raw web tips. Now let me run the test suite to confirm 10/10, and do a quick sanity check that the raw web tips, when ingested, produce records with `id: undefined` (the dedup-on-id at line 1376 `existingIds.has(tip.id)` with `tip.id===undefined`).

### Assistant | 2026-06-26T01:23:00.242Z

[tool_use: Bash]

### User | 2026-06-26T01:23:14.855Z

[tool_result]   ...
# Subtest: dueSources ignores a failed run for cooldown (a fail does not reset the clock)
ok 8 - dueSources ignores a failed run for cooldown (a fail does not reset the clock)
  ---
  duration_ms: 0.1224
  ...
# Subtest: isLockFresh: fresh+alive true; old false; dead-pid false; malformed false
ok 9 - isLockFresh: fresh+alive true; old false; dead-pid false; malformed false
  ---
  duration_m
... [+318 chars truncated]

### Assistant | 2026-06-26T01:23:24.255Z

10/10 pass, 0 skipped. Now let me assess the `id`/dedup interaction concretely. The `ingest()` does `existingIds.has(tip.id)` where `tip.id` is `undefined` for all raw web tips. The first web tip is added (undefined not in set), then `existingIds.add(enriched.id)` adds `undefined`. So the SECOND web tip in the same batch would be `existingIds.has(undefined) === true` and get **skipped by the id-check before content-check ever runs** — unless content-dedup catches it first. Let me verify whether `autoCategorize` assigns an id (it does not — I read it above; it only sets tags/category/auto_categorized). This means within a single multi-tip web artifact, only the first tip survives the id-dedup... but content-dedup runs at line 1377 only AFTER the id-check at 1376. Let me trace this precisely.

Looking at `ingest()` lines 1374-1386:
- tip 1 (id=undefined): `existingIds.has(undefined)`? No → content check → add → `existingIds.add(undefined)`
- tip 2 (id=undefined): `existingIds.has(undefined)`? **YES** → `continue` (skipped)

So **all but the first tip from each web artifact would be silently dropped** at promote time due to the undefined-id collision. This is a real correctness defect in the integration, masked because staging was validated but promotion of a web artifact was not. Let me verify the youtube path doesn't hit this (it assigns unique ids via `tipsToKnowledgeTips`), confirming web is the divergent/broken path.

### Assistant | 2026-06-26T01:23:28.035Z

[tool_use: Bash]

### User | 2026-06-26T01:23:33.217Z

[tool_result] added: 1 idSkipped: 2
=> only the FIRST web tip survives the id-dedup; the rest collide on undefined

### Assistant | 2026-06-26T01:23:42.476Z

Confirmed. The simulation proves the integration defect: when the armed promote cron ingests a web artifact's raw tips (which lack an `id`), the `ingest()` id-dedup at `TribalKnowledgeEngine.ts:1376` collides on `undefined`, so **only the first tip per artifact is added; every subsequent tip is silently skipped**. The content-hash check at line 1377 never runs for tips 2..N because the id-check `continue`s first.

This is the crux: the staged web artifact reuses the youtube STAGING location and `normalizeArtifact` contract, but it stages **raw `extractTipsFromTranscript` tips** while the youtube lane stages **`tipsToKnowledgeTips`-normalized records** (with unique `id`, `source`, `created_at`, `provenance`). The commit's "ZERO new promote wiring" claim is true for *selection* but the *ingest* shape diverges. Let me do a final confirmation that the youtube full-run artifact tips all carry distinct ids (so youtube is unaffected) and document the second-order issues (missing provenance/source on web tips that DO get added).

### Assistant | 2026-06-26T01:23:44.830Z

[tool_use: Bash]

### User | 2026-06-26T01:23:49.615Z

[tool_result] yt tip ids: [
  'tk-yt--4AmEAUQi3I-001',
  'tk-yt--4AmEAUQi3I-002',
  'tk-yt--4AmEAUQi3I-003',
  'tk-yt--4AmEAUQi3I-004',
  'tk-yt--4AmEAUQi3I-005'
]
all distinct + defined: true

### Assistant | 2026-06-26T01:24:23.214Z

Confirmed: the youtube lane stages tips with distinct, defined `id`s (`tk-yt-<videoId>-NNN`), so youtube promotion is unaffected. The web lane stages raw tips with no `id`, so only the first tip per web artifact survives the id-dedup at promote time.

I have everything needed for the verdict. Let me also confirm the SAFETY axis (no injection/SSRF) and the secondary issues are correctly characterized before finalizing.

**Safety verification (clean):**
- URLs are https-only enforced at `parseQueue` (`drain-web-sources-tribal.mjs:122`) and the queue is curated/committed.
- Fetched HTML is treated as DATA: stripped to text (`stripHtmlToText`), wrapped into transcript segments, fed to the Ollama prompt as CONTENT (`buildExtractionPrompt` in youtube-free-extract.mjs:233). No `eval`, no shell, no `child_process` in the web drainer; Ollama call is `fetch` POST with the text in the JSON `prompt` body.
- Artifact path: `join(STAGING_DIR, "${record.meta.videoId}.json")` where `videoId = "web-" + sha256(url).slice(0,12)` — pure hex, no path-traversal vector from the URL.
- No SSRF beyond the curated https queue (acceptable per acceptance criteria #4).

All other correctness items (textToTranscript shape, fail-soft per-source via inner try/catch at line 244-271, dead-PID-aware lock via `isLockFresh`+`pidAlive`, 0-tip skip) are correct.

---

VERDICT: FAIL

BLOCKER: Web-lane staged tips lack an `id`, so the armed promote cron drops all-but-the-first tip per artifact. The web drainer stages `tips: ex.tips` — the RAW `extractTipsFromTranscript` output `{title,body,category,tags,confidence,timestamp_hint}` with NO `id` field (`scripts/drain-web-sources-tribal.mjs:260`). The youtube lane it claims to mirror stages `tipsToKnowledgeTips(ex.tips, meta)` instead (`scripts/youtube-free-extract.mjs:792,821`), which assigns a distinct `id` (`tk-yt-<videoId>-NNN`), `source`, `created_at`, and `provenance` per tip. `promote-youtube-staged` passes `a.tips` straight to `ingestTips` -> `TribalK
... [+3427 chars truncated]
