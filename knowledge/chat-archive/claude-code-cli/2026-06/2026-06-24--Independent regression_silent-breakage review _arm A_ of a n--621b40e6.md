---
type: "chat-session"
source: "claude-code-cli"
session_id: "621b40e6-642b-48d2-bd0d-2c75bf77af44"
title: "Independent regression/silent-breakage review (arm A) of a new query capability "
date: "2026-06-24"
first_ts: "2026-06-24T16:31:14.008Z"
last_ts: "2026-06-24T16:32:43.904Z"
cwd: "H:\\prism\\mcp-server"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a5443a0f84274e0cc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent regression/silent-breakage review (arm A) of a new query capability 

> **claude-code-cli** | 2026-06-24 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a5443a0f84274e0cc.jsonl`

## Transcript

### User | 2026-06-24T16:31:14.008Z

Independent regression/silent-breakage review (arm A) of a new query capability in PRISM (H:/prism). Read each file END TO END. Grade PASS or FAIL with file:line. Do NOT assume the author is right. (Arm B already PASSED with 3 P2s; you are the independent second arm — find what B may have missed; do not just echo it.)

CONTEXT: 4 prism_cad actions (cad_registry_scan/search/get/stats at cadDispatcher.ts:2207-2243) called scan/get/search/stats on the `universalCADIndexEngine` singleton, but those methods were NEVER implemented — a dark capability that threw "is not a function" at runtime (confirmed by `node scripts/audit-dispatcher-engine-methods.mjs`, which now shows cadDispatcher MISSING 5->1). This change implements the 4 methods on `UniversalCADIndexEngine` (NO dispatcher change — it already calls them with these signatures).

FILES:
1. H:/prism/mcp-server/src/engines/UniversalCADIndexEngine.ts — added scan(rootPaths,options,fsImpl?) [async, alias over index()], get(absolutePath,fsImpl?), search({query,format,customer,limit},fsImpl?), stats(fsImpl?). Engine is a FACADE over CADFileIndexerEngine (constructor-injected `indexer`); load() returns MasterIndex|null.
2. H:/prism/mcp-server/src/__tests__/UniversalCADIndexEngine.registry.test.ts — 15 tests via a constructor-injected stub indexer (load()/index() return a fixture or null).
3. (reference) H:/prism/mcp-server/src/schemas/cadFileIndexSchema.ts — MasterIndex = {totalFiles, byFormat, byMachineCategory, byCustomer, files: CADFileEntry[]}; CADFileEntry has absolutePath/format/customer.

VERIFY:
- Signatures EXACTLY match the dispatcher calls (read cadDispatcher.ts:2207-2243): cad_registry_scan does `await engine.scan(rootPaths, options)`; search does `engine.search({query,format,customer,limit})`; get does `engine.get(filePath)`; stats does `engine.stats()`. Confirm arg shapes line up (e.g. scan is positional, search takes one object).
- get/search/stats FAIL SOFT on a null/missing persisted index (no throw): get->
... [+1223 chars truncated]

### Assistant | 2026-06-24T16:31:17.439Z

I'll review this new query capability by reading each file end to end, starting with the dispatcher contract that defines the exact signatures the methods must satisfy.

### Assistant | 2026-06-24T16:31:18.395Z

[tool_use: Read]

### Assistant | 2026-06-24T16:31:18.968Z

[tool_use: Read]

### User | 2026-06-24T16:31:19.328Z

[tool_result] 2180	              });
2181	              result = { success: true, ...hres };
2182	            }
2183	            break;
2184	          }
2185	          case "geometry_set_thresholds": {
2186	            const engine = await getEngine("geoCompare");
2187	            if (params?.thresholds) {
2188	              const updated = engine.setThresholds(params.thresholds);
2189	              result = { 
... [+3918 chars truncated]

### Assistant | 2026-06-24T16:31:19.444Z

[tool_use: Read]

### User | 2026-06-24T16:31:19.966Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\schemas\cadFileIndexSchema.ts' was already read 6m ago in this session and is unchanged (mtime 1776638116341). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-24T16:31:20.209Z

[tool_result] 1	/**
2	 * UniversalCADIndexEngine — U-CADC01 (CAD-COMPLETE-MS0)
3	 *
4	 * Universal CAD file indexer covering every format present across H:/prism.
5	 * Per R13-RE-06 archaeology, this engine is a thin facade over the existing
6	 * CADFileIndexerEngine — it does NOT reimplement scanning, hashing, or diffing.
7	 * Instead it:
8	 *   1. Expands the default root-path set beyond JM Die folders to cov
... [+10341 chars truncated]

### Assistant | 2026-06-24T16:31:23.849Z

The dispatcher contract is confirmed. Now let me verify the schema (CADFileEntry fields, MasterIndex shape) and the underlying indexer's `load()` contract, then read the test file end to end.

### Assistant | 2026-06-24T16:31:25.265Z

[tool_use: Grep]

### User | 2026-06-24T16:31:26.215Z

[tool_result] 74:export const CADFileEntrySchema = z.object({
77:  absolutePath: z.string().min(1),
80:  customer: z.string().min(1),
86:export type CADFileEntry = z.infer<typeof CADFileEntrySchema>;
102:export const MasterIndexSchema = z.object({
106:  totalFiles: z.number().int().nonnegative(),
107:  byFormat: z.record(z.string(), z.number().int().nonnegative()),
108:  byMachineCategory: z.record(z.string(), 
... [+211 chars truncated]

### Assistant | 2026-06-24T16:31:27.139Z

[tool_use: Grep]

### Assistant | 2026-06-24T16:31:27.364Z

[tool_use: Read]

### User | 2026-06-24T16:31:28.177Z

[tool_result] No matches found

### User | 2026-06-24T16:31:28.367Z

[tool_result] 1	/**
2	 * UniversalCADIndexEngine registry query surface (cad_registry_* actions).
3	 * The prism_cad cad_registry_scan/search/get/stats actions called scan/get/
4	 * search/stats on this engine, but those methods were never implemented (a dark
5	 * capability that threw "is not a function" at runtime). These tests pin the
6	 * real query behavior over a persisted MasterIndex, injected via the en
... [+5198 chars truncated]

### Assistant | 2026-06-24T16:31:32.987Z

The schema confirms the exact fields. Now let me verify two critical contract points: (1) the real `load()` signature on `CADFileIndexerEngine` (the Grep returned no matches, which is suspicious — I need to confirm `load(outputPath?, fsImpl?)` actually exists with that signature and returns `MasterIndex | null`), and (2) whether `IndexerFS` is an accepted param type, plus check there are no other callers of the engine that my reading of "additive only" depends on.

### Assistant | 2026-06-24T16:31:34.869Z

[tool_use: Grep]

### Assistant | 2026-06-24T16:31:35.921Z

[tool_use: Grep]

### User | 2026-06-24T16:31:37.423Z

[tool_result] src\schemas\cadActionSchemas.ts:550:const cadRegistryScanSchema = z.object({
src\schemas\cadActionSchemas.ts:560:const cadRegistrySearchSchema = z.object({
src\schemas\cadActionSchemas.ts:568:const cadRegistryGetSchema = z.object({
src\schemas\cadActionSchemas.ts:574:const cadRegistryStatsSchema = z.object({}).optional();
src\schemas\cadActionSchemas.ts:1123:// Pure composition over an existing CA
... [+8223 chars truncated]

### User | 2026-06-24T16:31:37.567Z

[tool_result] 14: *   - Progress events: 'progress' {scanned, total} and 'batch' {flushed}
15: *   - Idempotent: re-run loads existing index, diffs additions/deletions
24: * no progress events. This engine is a distinct master catalog for 20K+ files.
29:import { EventEmitter } from "events";
51:export interface IndexerFS {
142:export class CADFileIndexerEngine extends BaseEngine {
143:  readonly events = new Ev
... [+995 chars truncated]

### Assistant | 2026-06-24T16:31:42.234Z

I have confirmed the key contract points. Let me verify two remaining items: the `IndexerFS` interface (to confirm `fsImpl?` passes through correctly to `load`), the `CADFileEntry` schema's full field set (to confirm `format`/`customer` are non-optional so the filter `f.customer.toLowerCase()` cannot NPE), and the schema validation gate on `load()` in `_loadExisting` (whether the stub fixture bypassing Zod is a legitimate test seam vs. a divergence from real runtime behavior).

### Assistant | 2026-06-24T16:31:43.729Z

[tool_use: Read]

### Assistant | 2026-06-24T16:31:44.585Z

[tool_use: Read]

### User | 2026-06-24T16:31:44.662Z

[tool_result] 370	  private _loadExisting(outputPath: string, fs: IndexerFS): MasterIndex | null {
371	    try {
372	      if (!fs.existsSync(outputPath)) return null;
373	      const raw = fs.readFileSync(outputPath, "utf-8");
374	      const parsed = MasterIndexSchema.parse(JSON.parse(raw));
375	      return parsed;
376	    } catch {
377	      return null;
378	    }
379	  }
380	}
381	
382	// ── Singleton ────
... [+139 chars truncated]

### Assistant | 2026-06-24T16:31:45.159Z

[tool_use: Read]

### User | 2026-06-24T16:31:45.608Z

[tool_result] 74	export const CADFileEntrySchema = z.object({
75	  /** SHA-256 hex digest of the absolute path (stable, path-based ID) */
76	  fileId: z.string().length(64),
77	  absolutePath: z.string().min(1),
78	  format: z.enum(CAD_FORMATS),
79	  sizeBytes: z.number().int().nonnegative(),
80	  customer: z.string().min(1),
81	  machineCategory: z.enum(MACHINE_CATEGORIES),
82	  complexityHint: z.enum(COMPLEXI
... [+1212 chars truncated]

### User | 2026-06-24T16:31:46.216Z

[tool_result] 548	
549	// ── Universal CAD Registry Actions (U-CADC03) ─────────────────────────────────
550	const cadRegistryScanSchema = z.object({
551	  root_paths: z.array(z.string()).optional(),
552	  rootPaths: z.array(z.string()).optional(),
553	  options: z.object({
554	    formats: z.array(z.string()).optional(),
555	    maxDepth: z.number().optional(),
556	    batchSize: z.number().optional(),
557	  }
... [+728 chars truncated]

### Assistant | 2026-06-24T16:31:52.752Z

I now have full visibility into every contract surface. Let me trace the remaining concern: the dispatcher's `cad_registry_search` passes `format` and `customer` as `params?.format`/`params?.customer` which can be `undefined`, and the schema permits them optional — confirmed the engine's `(!fmt || ...)` and `(!cust || ...)` guards handle that. Let me verify the one edge I haven't nailed: the dispatcher's `scan` passes `options` as a raw object (`params?.options ?? {}`) which per the schema can contain `formats/maxDepth/batchSize` — but the engine's `scan(rootPaths, options)` types `options` as `Omit<IndexOptions, "rootPaths">`. I need to confirm `IndexOptions` actually has those fields so there's no silent type-mismatch where dispatcher options get dropped.

### Assistant | 2026-06-24T16:31:54.636Z

[tool_use: Grep]

### Assistant | 2026-06-24T16:31:55.270Z

[tool_use: Read]

### User | 2026-06-24T16:31:56.266Z

[tool_result] 105:  rootPaths: z.array(z.string()),
118:export const IndexOptionsSchema = z.object({
120:  rootPaths: z.array(z.string()).optional(),
122:  outputPath: z.string().optional(),
124:  maxDepth: z.number().int().positive().optional(),
126:  batchSize: z.number().int().positive().optional(),
129:export type IndexOptions = z.infer<typeof IndexOptionsSchema>;

### User | 2026-06-24T16:31:57.059Z

[tool_result] 1700	            break;
1701	          }
1702	          case "universal_cad_index": {
1703	            // U-CADC01 â€” Run full corpus scan; persist master-index.json by default.
1704	            const { universalCADIndexEngine } = await import(
1705	              "../../engines/UniversalCADIndexEngine.js"
1706	            );
1707	            const indexOpts: Record<string, unknown> = {};
1708	   
... [+3394 chars truncated]

### Assistant | 2026-06-24T16:32:43.904Z

I now have complete visibility into every contract surface. Let me consolidate my analysis.

**Contract verification (against actual source):**

1. **`scan` signature** — Dispatcher (cadDispatcher.ts:2211): `await engine.scan(rootPaths, options)`. Engine (UniversalCADIndexEngine.ts:207): `async scan(rootPaths?, options = {}, fsImpl?)`. Positional match confirmed. `rootPaths` from `params?.root_paths ?? params?.rootPaths` may be `undefined` → engine guards with `if (rootPaths && rootPaths.length)` (line 213) → falls back to UNIVERSAL_ROOT_PATHS via `index()`. Correct. **Note:** the schema's `options` allows `{formats, maxDepth, batchSize}`, but `IndexOptions` (cadFileIndexSchema.ts:118-126) defines `rootPaths/outputPath/maxDepth/batchSize` — there is NO `formats` field in `IndexOptions` (the indexer uses `extensions`, per cadAutomationDispatcher.ts:1710). So a caller passing `options.formats` has it silently ignored by the indexer. But this is a pre-existing dispatcher-schema/indexer drift, NOT introduced by this change, and `Omit<IndexOptions,"rootPaths">` spread is type-safe. Not a finding against this diff.

2. **`search` signature** — Dispatcher (2221): `engine.search({ query, format, customer, limit })`. Engine (239): `search(criteria = {}, fsImpl?)`. One-object match confirmed. `total = matched.length` (full count), `results = matched.slice(0, Math.max(0,limit))`. Slice with limit=3 on 3 items returns all 3 (no off-by-one). `Math.max(0,limit)` guard correctly maps 0/-1 → `slice(0,0)` → `[]` while preserving `total`. Default limit 50 via `typeof criteria.limit === "number" ? criteria.limit : 50`.

3. **`get` signature** — Dispatcher (2231): `engine.get(filePath)`. Engine (225): `get(absolutePath, fsImpl?)`. Matches on `f.absolutePath === absolutePath` (line 229) — the real schema key (cadFileIndexSchema.ts:77); there is no `path` field, so no silent wrong-field match. Empty-string guard at line 226.

4. **`stats`** — Dispatcher (2240): `engine.stats()`. Engine (
... [+6716 chars truncated]
