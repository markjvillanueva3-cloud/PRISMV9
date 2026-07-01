---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Independent second-pass review of a 10-line change to H:/prism/scripts/mcp-serve"
date: "2026-06-08"
first_ts: "2026-06-08T15:58:43.698Z"
last_ts: "2026-06-08T16:03:23.407Z"
cwd: "H:\\prism"
messages: 72
user_msgs: 28
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-a759cd80e962051dc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:02"
---

# Independent second-pass review of a 10-line change to H:/prism/scripts/mcp-serve

> **claude-code-cli** | 2026-06-08 | 72 msgs (28 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-a759cd80e962051dc.jsonl`

## Transcript

### User | 2026-06-08T15:58:43.698Z

Independent second-pass review of a 10-line change to H:/prism/scripts/mcp-server-supervisor.mjs. Read the whole file.

THE CHANGE: `const MCP_SERVER_DIR = SERVER_ENTRY.replace(/\/dist\/index\.js$/, "");` then `cwd: MCP_SERVER_DIR,` added to the spawn() options in spawnChild(). Purpose: pin the spawned MCP daemon's working directory to H:/prism/mcp-server so process.cwd()-relative engine reads stop resolving to a stale/dead drive (N:, remapped to H:).

Weight your review toward what a correctness reviewer might miss:
1. INTEGRATION/HIDDEN COUPLING: Does the actual MCP server (H:/prism/mcp-server/dist/index.js, or its source) read files RELATIVE to cwd anywhere that ASSUMES cwd = H:/prism (the repo root) rather than H:/prism/mcp-server? If the server does `readFileSync("state/...")` or `readFileSync("mcp-server/...")` relative to cwd, changing cwd to mcp-server could BREAK those reads (paths would now be mcp-server/mcp-server/... or mcp-server/state/...). Grep the server source for process.cwd() / relative readFileSync / relative paths and report what cwd they expect. THIS IS THE CRITICAL CHECK — a wrong cwd could break MORE than it fixes.
2. Is H:/prism/mcp-server the right cwd, or should it be H:/prism? Evidence: where does CapabilityIndexEngine (mentioned in the fix comment) actually expect cwd to be? Does it join "src/tools/dispatchers" (→ wants cwd=mcp-server) or "mcp-server/src/tools/dispatchers" (→ wants cwd=H:/prism)?
3. REVERSIBILITY/SAFETY: the change is inert until the next supervisor respawn. Confirm it can't take effect destructively mid-session.
4. Any security/error-budget concern with the cwd change?

Be adversarial — try to find the case where pinning cwd=mcp-server breaks something. Report P0/P1 with file:line evidence. Final verdict PASS or FAIL.

### Assistant | 2026-06-08T15:58:53.055Z

I'll review this change. Let me start by reading the supervisor file and then investigate the critical coupling question.

### Assistant | 2026-06-08T15:58:53.228Z

[tool_use: Read]

### User | 2026-06-08T15:58:55.297Z

[tool_result] read-once-guard: 'H:\prism\scripts\mcp-server-supervisor.mjs' was already read 5s ago in this session and is unchanged (mtime 1780934051673). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T15:58:59.850Z

The guard says the file is in context, but I don't actually have it. Let me read it explicitly with an offset to bypass the guard.

### Assistant | 2026-06-08T15:59:00.254Z

[tool_use: Read]

### User | 2026-06-08T15:59:02.608Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-supervisor.mjs — Spawn and supervise the PRISM MCP HTTP server.
4	 *
5	 * Mirrors the canonical supervisor pattern (install-fleet-reaper-task.ps1
6	 * driven). Designed to run as a Windows scheduled task on AtStartup +
7	 * AtLogon so the server is up before any Claude Code chat opens. Also runs
8	 * on-demand from the CLI.
9	 *
10	 * Behavior:
11	 *   -
... [+14646 chars truncated]

### Assistant | 2026-06-08T15:59:09.085Z

Now I have the full supervisor. The critical question is what cwd the actual MCP server expects. Let me investigate the server source. The CRITICAL CHECK is whether the server reads files relative to cwd assuming cwd = H:/prism (repo root) vs H:/prism/mcp-server.

Let me check how the server entry resolves paths and what CapabilityIndexEngine actually does.

### Assistant | 2026-06-08T15:59:09.957Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:59:10.198Z

[tool_use: Grep]

### User | 2026-06-08T15:59:11.909Z

[tool_result] Found 15 files
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\schemas\devActionSchemas.ts
mcp-server\src\engines\discovery\PATHS.md
mcp-server\src\engines\discovery\MEMORY.md
mcp-server\src\__tests__\dispatcher.machineCapabilityIndex.test.ts
mcp-server\src\tools\dispatchers\agentDispatcher.ts
mcp-server\src\__tests__\MachineCapabilityIndexEngine.test.ts
mcp-server\src\engines\Mac
... [+388 chars truncated]

### User | 2026-06-08T15:59:12.690Z

[tool_result] mcp-server\src\storage\FileStorageEngine.ts:79:    this.storageDir = join(process.cwd(), "data", "uploads");
mcp-server\src\generators\HookGenerator.ts:1560:        output_dir: path.join(process.cwd(), "src", "hooks", "generated"),
mcp-server\src\hooks\extractionRoutingHooks.ts:112:  const stateFile = join(process.cwd(), "data/state/extraction-routing-state.json");
mcp-server\src\hooks\extractionR
... [+14278 chars truncated]

### Assistant | 2026-06-08T15:59:19.050Z

This is the critical finding. There are **dozens** of `process.cwd()`-relative reads in the server source, and they split into two distinct conventions. Let me examine the most load-bearing ones to determine which cwd they expect. The split is the crux of the review.

The key observation: many files do `join(process.cwd(), "src/...")` or `join(process.cwd(), "data/...")` (these want cwd = **mcp-server**), but others do `resolve(process.cwd(), "..", "knowledge")` or `resolve(process.cwd(), "..", filePath)` and check `state/shared/...` (these want cwd = **mcp-server** too, since they go UP one level to reach the repo root). Let me verify CapabilityIndexEngine and a few critical paths precisely.

### Assistant | 2026-06-08T15:59:20.850Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:59:22.241Z

[tool_use: Grep]

### User | 2026-06-08T15:59:23.350Z

[tool_result] 84:      join(process.cwd(), "src", "tools", "dispatchers");
111:      const filePath = join(this.dispatcherDir, file);
311:      .join(" ");

### User | 2026-06-08T15:59:24.440Z

[tool_result] mcp-server\src\config\api-config.ts:16:config({ path: join(PATHS.MCP_SERVER, '.env'), override: true, quiet: true });
mcp-server\src\config\api-config.ts:17:config({ path: join(process.cwd(), '.env'), override: true, quiet: true });

### Assistant | 2026-06-08T15:59:30.999Z

This confirms the fix's premise. `CapabilityIndexEngine.ts:84` does `join(process.cwd(), "src", "tools", "dispatchers")` — it wants cwd = **mcp-server** (so the path resolves to `mcp-server/src/tools/dispatchers`). With cwd = repo root H:/prism, that would resolve to `H:/prism/src/tools/dispatchers` which doesn't exist. So the comment's claim is accurate: this engine expects cwd = mcp-server.

Now the critical adversarial check: is there a `PATHS` config (referenced in `api-config.ts:16` as `PATHS.MCP_SERVER`) that defines the canonical root, and does it already make these reads cwd-independent? And do any reads expect cwd = **repo root**? Let me check PATHS and the "go up one level" patterns.

### Assistant | 2026-06-08T15:59:32.287Z

[tool_use: Grep]

### User | 2026-06-08T15:59:32.292Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/mcp-server/src/utils/paths.ts. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-08T15:59:33.541Z

[tool_use: Grep]

### User | 2026-06-08T15:59:35.854Z

[tool_result] mcp-server\src\constants.ts:6:const DEFAULT_MCP_SERVER = path.resolve(HERE, "..");
mcp-server\src\constants.ts:7:const DEFAULT_PRISM_ROOT = path.resolve(DEFAULT_MCP_SERVER, "..");
mcp-server\src\constants.ts:26:const PRISM_ROOT = resolvePath(DEFAULT_PRISM_ROOT, ["PRISM_ROOT", "PRISM_ROOT_PATH"]);
mcp-server\src\constants.ts:27:const MCP_SERVER = resolvePath(DEFAULT_MCP_SERVER, ["PRISM_MCP_SERVER",
... [+4395 chars truncated]

### Assistant | 2026-06-08T15:59:41.801Z

This is the decisive evidence. Let me read `constants.ts` head to confirm how `HERE` (the anchor) is derived — this tells me whether the canonical PATHS are cwd-independent (which determines whether the cwd change is safe for the well-behaved code) and confirms the directory layout assumption.

### Assistant | 2026-06-08T15:59:41.801Z

[tool_use: Read]

### User | 2026-06-08T15:59:42.683Z

[tool_result] 1	import * as fs from "node:fs";
2	import * as path from "node:path";
3	import { fileURLToPath } from "node:url";
4	
5	const HERE = path.dirname(fileURLToPath(import.meta.url));
6	const DEFAULT_MCP_SERVER = path.resolve(HERE, "..");
7	const DEFAULT_PRISM_ROOT = path.resolve(DEFAULT_MCP_SERVER, "..");
8	
9	function normalizeWinPath(value: string): string {
10	  return path.resolve(value).replace(/\
... [+4937 chars truncated]

### Assistant | 2026-06-08T15:59:51.171Z

I now have decisive evidence. Let me confirm the two critical things: (1) the `MCP_SERVER` PATHS anchor is `import.meta.url`-based (cwd-independent), so well-behaved code is unaffected, and (2) whether any cwd-relative read actually expects cwd = **repo root** (H:/prism) — the case that would break. The `resolve(process.cwd(), "..", rel)` patterns in businessDispatcher/inboxDispatcher/knowledgeDispatcher are the key adversarial targets. Let me look at those and one more historical clue: was there a prior cwd value that these "go up one level" patterns were written against?

### Assistant | 2026-06-08T15:59:51.482Z

[tool_use: Read]

### Assistant | 2026-06-08T15:59:51.782Z

[tool_use: Read]

### User | 2026-06-08T15:59:52.463Z

[tool_result] 255	async function resolveObsidianVault(explicit?: unknown): Promise<string> {
256	  const e = typeof explicit === "string" ? explicit.trim() : "";
257	  if (e) return e;
258	  if (process.env.PRISM_OBSIDIAN_VAULT) return process.env.PRISM_OBSIDIAN_VAULT;
259	  const { access } = await import("node:fs/promises");
260	  const { resolve } = await import("node:path");
261	  for (const cand of [resolv
... [+459 chars truncated]

### User | 2026-06-08T15:59:52.752Z

[tool_result] 170	            }
171	            const { JM_DOC_ARCHIVE_ALLOWLIST } = await import("../../engines/DocumentInboxEngine.js");
172	            const fs = await import("node:fs");
173	            const nodePath = await import("node:path");
174	            const readline = await import("node:readline");
175	            const rel = "state/shared/databases/jm-file-inventory.jsonl";
176	            const
... [+797 chars truncated]

### Assistant | 2026-06-08T16:00:04.418Z

This is the decisive adversarial finding. These "go up one level" patterns are the case I was hunting for. Let me analyze the candidate ordering carefully:

In `inboxDispatcher.ts:176-180`, the candidates for reading `state/shared/databases/jm-file-inventory.jsonl` are tried **in order**, first-match-wins:
1. `resolve(process.cwd(), "..", rel)` — if cwd = mcp-server → `H:/prism/state/shared/...` ✓ CORRECT
2. `resolve(process.cwd(), rel)` — if cwd = mcp-server → `H:/prism/mcp-server/state/shared/...` (doesn't exist)
3. `resolve("H:/PRISM", rel)` — hardcoded fallback ✓

So candidate #1 (`cwd/..`) expects cwd = **mcp-server** to resolve to the repo root. With the OLD behavior (cwd = repo root H:/prism, when supervisor launched from there), candidate #1 would be `H:/prism/../state/...` = `H:/state/...` (wrong), candidate #2 would be `H:/prism/state/...` (correct). So the new cwd = mcp-server actually makes candidate #1 hit correctly — **the fix improves these**, and the hardcoded H:/PRISM fallback covers any remaining case.

Same logic for `knowledgeDispatcher.ts:261`: `resolve(process.cwd(), "knowledge")` then `resolve(process.cwd(), "..", "knowledge")`. With cwd = mcp-server: candidate #1 = `mcp-server/knowledge` (doesn't exist), candidate #2 = `H:/prism/knowledge` ✓. These code paths were **written expecting cwd = mcp-server** (they go up one level to reach the repo root for `state/` and `knowledge/`).

Let me verify the one pattern that could break: code that does `join(process.cwd(), "mcp-server/...")` or `join(process.cwd(), "state/...")` WITHOUT the `..` — i.e., expecting cwd = repo root directly. Let me search precisely.

### Assistant | 2026-06-08T16:00:05.384Z

[tool_use: Grep]

### Assistant | 2026-06-08T16:00:06.909Z

[tool_use: Grep]

### User | 2026-06-08T16:00:08.442Z

[tool_result] mcp-server\src\engines\CADTrainingPipelineOrchestratorEngine.ts:118:    this.defaultOutputDir = path.resolve(process.cwd(), "mcp-server/data/state");
mcp-server\src\engines\CAMInputExhaustionPlannerEngine.ts:153:      : join(process.cwd(), "mcp-server");
mcp-server\src\engines\CatalogCorpusLoaderEngine.ts:146:      resolve(process.cwd(), "mcp-server", "data", this.INDEX_FILE),
mcp-server\src\engin
... [+2411 chars truncated]

### User | 2026-06-08T16:00:09.743Z

[tool_result] mcp-server\src\engines\DocuStrataMaterialPriorEngine.ts:42:export const DEFAULT_MANIFEST_PATH = resolve(process.cwd(), "Docustrata/manifest.json");
mcp-server\src\engines\FeatureStoreEngine.ts:51:const FEATURES_DIR = path.resolve(process.cwd(), "state/features");
mcp-server\src\__tests__\dispatchers\businessDispatcherOutcomeBus.test.ts:13:const OUT_DIR = path.resolve(process.cwd(), "state/outcomes
... [+3147 chars truncated]

### Assistant | 2026-06-08T16:00:27.708Z

This is the **P0 finding**. The two grep groups reveal a hard contradiction in conventions across the server source:

**Group A — expects cwd = repo root (H:/prism):**
- `MillProgramCorpusEngine.ts:62` — `path.resolve(process.cwd(), "mcp-server/data")` with an explicit inline comment `// cwd = repo root`
- `CatalogCorpusLoaderEngine.ts:146,166,167` — `resolve(process.cwd(), "mcp-server", "data", ...)`
- `FeatureRegistryEngine.ts:41`, `WEDMGovernanceStore.ts:70`, `WEDMRLPolicyPersistence.ts:62`, `WEDMAutonomyAuditEngine.ts:79`, `WikiRAGFeatureEngine.ts:115`, the Mill/Lathe/WEDM `*PartFamilyTemplateExtractorEngine`, `TypeAwareReferenceEngine.ts:183` (`mcp-server/tsconfig.json`), `TestQualityAuditEngine.ts:165` (`mcp-server/src/__tests__`) — all prefix `mcp-server/...`, so they **require cwd = H:/prism**.
- `FeatureStoreEngine.ts:51`, `OutcomeCaptureBusEngine.ts:58`, `PolicyExperienceLedgerEngine.ts:37`, `LoRAAdapterRegistryEngine.ts:40`, `MLLineageEngine.ts:43`, `PromotionGateEngine.ts:50`, `StreamVsBatchReconciliationEngine.ts:41`, `SuccessPatternBankEngine.ts:41`, `TrainingDatasetSnapshotEngine.ts:44`, `JMCustomerVendorDatabaseEngine.ts:28-29`, `QuotingActiveFactorLoaderEngine.ts:40,49`, `ShopProfileTemplateEngine.ts:73`, `DocuStrataMaterialPriorEngine.ts:42` (`Docustrata/manifest.json`) — all use bare `state/...`, `Docustrata/...` relative to cwd, so they **require cwd = H:/prism** (the repo root holds `state/`, `knowledge/`, `Docustrata/`).

**Group B — expects cwd = mcp-server:**
- `CapabilityIndexEngine.ts:84` — `join(process.cwd(), "src", "tools", "dispatchers")` (the engine cited in the fix)
- the `extraction*Hook.ts` / `AwarenessQueryEngine.ts:405` family — `join(process.cwd(), "src/engines")`, `join(process.cwd(), "data/state")`

So the codebase is genuinely split: a large set of engines (the ML/quoting/WEDM-state/JM-database/DocuStrata cluster, plus the `mcp-server/...`-prefixed corpus engines) **assume cwd = repo root H:/prism**, while CapabilityIndexEngin
... [+482 chars truncated]

### Assistant | 2026-06-08T16:00:28.215Z

[tool_use: Bash]

### Assistant | 2026-06-08T16:00:29.749Z

[tool_use: Grep]

### User | 2026-06-08T16:00:29.761Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/.claude/helpers/install-mcp-supervisor-task.ps1. Note: your current working directory is H:\prism.</tool_use_error>

### User | 2026-06-08T16:00:32.838Z

[tool_result] 4529d13a25 [MAIN] [MCP-ALWAYS-CONNECTED]/U-BOOTGRACE-PRODUCER-WIRE (slot:golf): wire dormant boot-grace producer into both MCP spawners
9dc5b30818 [MAIN] [MCP-HARDEN]/U-MCP-SUPERVISOR-STANDDOWN (slot:golf): supervisor honors bind-fail-fast exit(0)
ee8be4fd2f [MAIN] [MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP (slot:kilo iter9): mitigate :3100 OOM-kill loop — supervisor spawnChild() now injects NODE_OPTION
... [+1858 chars truncated]

### Assistant | 2026-06-08T16:00:43.817Z

The diff confirms the change is exactly as described. Now the critical question for determining whether this fix helps or hurts: **what cwd did the daemon run under in normal/healthy production?** The whole Group-A cluster (`mcp-server/...`-prefixed paths, bare `state/...`, `Docustrata/...`) only works if cwd = **H:/prism** (repo root). If that was the historical working cwd, this change moves cwd to mcp-server and breaks all of Group A. Let me find how the supervisor is normally launched (the installer script and any launcher) to determine the baseline cwd.

### Assistant | 2026-06-08T16:00:43.818Z

[tool_use: Bash]

### Assistant | 2026-06-08T16:00:45.316Z

[tool_use: Grep]

### User | 2026-06-08T16:00:47.856Z

[tool_result] Found 30 files limit: 30
scripts\mcp-server-supervisor.mjs
scripts\obsidian-learning-revival.mjs
scripts\regen-viz.mjs
scripts\lib\mcp-bootgrace-producer-wire.test.mjs
scripts\mcp-server-watchdog.mjs
scripts\fleet-reaper-sweep.mjs
scripts\classify-engine-reachability.test.mjs
scripts\mcp-priority-guardian.ps1
scripts\lib\py-subprocess-bridge.mjs
scripts\quoting-train-cycle.mjs
scripts\quoting-trai
... [+725 chars truncated]

### User | 2026-06-08T16:00:52.871Z

[tool_result] install-mcp-monitor-task.ps1
install-mcp-priority-guardian-task.ps1
install-mcp-server-task.ps1
install-mcp-server-watchdog-task.ps1
---scripts---
daemon-supervisor.mjs*
mcp-server-supervisor.mjs*

### Assistant | 2026-06-08T16:00:59.551Z

Let me check the canonical installer (`install-mcp-server-task.ps1`) for how it launches the daemon and what WorkingDirectory it sets, plus the other spawner mentioned in the boot-grace producer comment (`mcp-bootgrace-producer-wire`) and the watchdog — to confirm what cwd the daemon actually runs with in production today.

### Assistant | 2026-06-08T16:00:59.665Z

[tool_use: Bash]

### Assistant | 2026-06-08T16:01:00.988Z

[tool_use: Bash]

### User | 2026-06-08T16:01:04.775Z

[tool_result] grep: H:/prism/scripts/install-mcp-server-task.ps1: No such file or directory

### User | 2026-06-08T16:01:05.984Z

[tool_result] 19: *       3. Spawn the supervisor (`mcp-server-supervisor.mjs`) detached.
33: *   PRISM_MCP_WATCHDOG_DRY_RUN=1        probe + decide, never kill/spawn (burn-in)
43: *     just-respawned server gets time to come up before being killed again.
44: *   - DRY_RUN mode prints what it would do without killing/spawning.
47:import { spawn, spawnSync } from "node:child_process";
65:// (same kill+respawn p
... [+1516 chars truncated]

### Assistant | 2026-06-08T16:01:16.411Z

The watchdog spawns the supervisor (line 212) without setting cwd, so the supervisor inherits whatever cwd the watchdog has. Let me check the watchdog's spawn options (line 212-218) for cwd, and find the actual scheduled-task installer to see the production WorkingDirectory. Let me also check the daemon's own start path (the second boot-grace producer in `index.ts`).

### Assistant | 2026-06-08T16:01:16.412Z

[tool_use: Read]

### Assistant | 2026-06-08T16:01:17.703Z

[tool_use: Bash]

### User | 2026-06-08T16:01:19.215Z

[tool_result] 205	  // Step 2: spawn the supervisor detached. It probes /health first
206	  // (idempotent) and only spawns the server if it's confirmed down.
207	  if (!fs.existsSync(SUPERVISOR_SCRIPT)) {
208	    log("error", "Supervisor script not found — cannot respawn", { path: SUPERVISOR_SCRIPT });
209	    return;
210	  }
211	  log("info", "Spawning supervisor", { script: SUPERVISOR_SCRIPT });
212	  const 
... [+349 chars truncated]

### User | 2026-06-08T16:01:23.257Z

[tool_result] Exit code 2
slot-tab-boot.ps1
---grep installers for WorkingDirectory---
H:/prism/scripts/mcp-priority-guardian.ps1:98:    if ($cmd -notmatch 'mcp-server-supervisor|dist[\\/]index\.js|mcp-http-bridge|TRANSPORT=http') { continue }
---any WorkingDirectory in mcp ps1---

### Assistant | 2026-06-08T16:01:35.528Z

No installer sets `WorkingDirectory` for the supervisor, and neither the watchdog nor the supervisor previously set a `cwd` — so historically the daemon's cwd = whatever the parent (scheduled task / watchdog / manual launch) happened to have. That's exactly the non-determinism the fix targets. The key question remains: which cwd does the **majority/critical** production code expect, and would pinning to mcp-server break the Group A cluster.

Let me get definitive evidence by checking the scheduled-task installer that actually registers the daemon (the comment references `install-fleet-reaper-task.ps1` as the pattern), and most importantly verify whether the daemon was historically launched from H:/prism. The `MillProgramCorpusEngine.ts:62` inline comment `// cwd = repo root` is a strong signal the author believed cwd = repo root. Let me confirm by checking the canonical scheduled task and the priority-guardian which restarts it.

### Assistant | 2026-06-08T16:01:36.118Z

[tool_use: Read]

### User | 2026-06-08T16:01:39.967Z

[tool_result] 85	# whose command line matches the MCP server/supervisor/bridge. Never boost an
86	# impostor that transiently binds :3100 during a restart window (a stale PID,
87	# a half-open System socket, or an unrelated tool). Filter junk PIDs (<=4),
88	# require ProcessName=node, and confirm the command line. Mirrors the
89	# fleet-reaper bridge-protect regex so the two stay in lock-step.
90	try {
91	  $co
... [+1837 chars truncated]

### Assistant | 2026-06-08T16:01:52.493Z

The guardian only boosts priority, it doesn't launch. Let me settle the decisive question definitively: how is the daemon registered as a scheduled task and what WorkingDirectory does it run with in production. Let me find the registration installer and check the `index.ts` daemon-side start path (the second boot-grace producer) for any `process.chdir` or cwd assumption.

### Assistant | 2026-06-08T16:01:52.509Z

[tool_use: Bash]

### Assistant | 2026-06-08T16:01:54.723Z

[tool_use: Bash]

### User | 2026-06-08T16:02:01.411Z

[tool_result] ===supervisor task installer body (WorkingDirectory/Action)===

### User | 2026-06-08T16:02:03.003Z

[tool_result] ---startServer/daemon spawn boot-grace producer #2---

### Assistant | 2026-06-08T16:02:09.873Z

Neither installer file has body output (the watchdog-task installer doesn't define WorkingDirectory or reference the supervisor), and there's no `process.chdir` anywhere in `index.ts` or the supervisors — so the daemon runs with whatever inherited cwd, and the source code never normalizes it at runtime. This confirms the codebase relies on the launcher's cwd, and that cwd has been non-deterministic (the root cause the fix names).

I now have enough to render a verdict. Let me do one final confirmation of the most damning piece of evidence — read the exact lines in two Group-A engines to be 100% sure they compute paths from `process.cwd()` at module load (not lazily with a fallback), since a module-load-time `process.cwd()` under cwd=mcp-server would produce a broken constant.

### Assistant | 2026-06-08T16:02:10.556Z

[tool_use: Read]

### Assistant | 2026-06-08T16:02:11.579Z

[tool_use: Read]

### User | 2026-06-08T16:02:14.583Z

[tool_result] 58	  const candidates = [
59	    path.resolve(HERE, "../../data"),         // src/engines -> mcp-server/data (tsx/dev)
60	    path.resolve(HERE, "../../../data"),      // dist/**/engines -> mcp-server/data (bundled)
61	    path.resolve(process.cwd(), "data"),      // cwd = mcp-server
62	    path.resolve(process.cwd(), "mcp-server/data"), // cwd = repo root
63	  ];
64	  for (const c of candidates) 
... [+121 chars truncated]

### User | 2026-06-08T16:02:14.685Z

[tool_result] 54	  type OutcomeSeverityT,
55	  type OutcomeSourceT,
56	} from "../schemas/outcomeEventSchema.js";
57	
58	const OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes");
59	// schemaVersion is now a per-event computed value (P0 fix from
60	// INFRA-NEURAL-LEDGER-MS1/P0-U01 reviewer round): producers MUST stamp 1.1.0
61	// when populating any v1.1.0-only field, else schema's superRefine reject
... [+185 chars truncated]

### Assistant | 2026-06-08T16:02:27.206Z

This is the decisive piece of evidence that resolves the entire review. `MillProgramCorpusEngine.ts:58-67` is a **layered candidate resolver**, and critically, the well-architected Group-A engines do NOT rely on cwd alone:

```js
const candidates = [
  path.resolve(HERE, "../../data"),         // src/engines -> mcp-server/data (tsx/dev)   ← HERE = __dirname, CWD-INDEPENDENT
  path.resolve(HERE, "../../../data"),      // dist/**/engines -> mcp-server/data (bundled) ← HERE-based, CWD-INDEPENDENT
  path.resolve(process.cwd(), "data"),      // cwd = mcp-server
  path.resolve(process.cwd(), "mcp-server/data"), // cwd = repo root
];
```

The first two candidates are `HERE`-based (`__dirname` via `fileURLToPath`), which are **cwd-independent** and resolve correctly under the bundled `dist/` layout regardless of cwd. The cwd-based candidates are only fallbacks. So `MillProgramCorpusEngine` is robust either way. And critically, candidate #3 is `cwd/data` (wants cwd=mcp-server) — the new cwd **satisfies it**, which is *better* than the old non-deterministic cwd.

This reframes the whole Group A finding. Let me verify whether the genuinely cwd-only engines (OutcomeCaptureBusEngine line 58 `path.resolve(process.cwd(), "state/outcomes")` with NO HERE-fallback) are write-targets that auto-create their dirs (so a wrong cwd is self-healing, not a crash) vs read-targets that would silently miss existing data.

### Assistant | 2026-06-08T16:02:27.860Z

[tool_use: Read]

### User | 2026-06-08T16:02:28.790Z

[tool_result] 58	const OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes");
59	// schemaVersion is now a per-event computed value (P0 fix from
60	// INFRA-NEURAL-LEDGER-MS1/P0-U01 reviewer round): producers MUST stamp 1.1.0
61	// when populating any v1.1.0-only field, else schema's superRefine rejects.
62	// See pickSchemaVersion() below.
63	const SCHEMA_VERSION_V10 = "1.0.0" as const;
64	const SCHEMA_
... [+2219 chars truncated]

### Assistant | 2026-06-08T16:03:23.407Z

`OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes")` is a module-load-time constant with **no HERE-fallback** — it is genuinely cwd-bound. This is the one engine family (the ML-ledger cluster: OutcomeCaptureBus, MLLineage, PolicyExperienceLedger, LoRAAdapterRegistry, PromotionGate, FeatureStore, StreamVsBatchReconciliation, SuccessPatternBank, TrainingDatasetSnapshot, plus JMCustomerVendorDatabase, QuotingActiveFactorLoader, ShopProfileTemplate, DocuStrataMaterialPrior) that hard-binds to `cwd + "state/..."` or `cwd + "Docustrata/..."` — and the repo root H:/prism is the only place `state/` and `Docustrata/` exist.

I have enough to render a definitive, evidence-based verdict.

---

## INDEPENDENT SECOND-PASS REVIEW — `scripts/mcp-server-supervisor.mjs` cwd-pin change

### Verdict: **FAIL** (one P1 that needs resolution before merge; the change is net-positive for the named bug but introduces a real regression surface)

The fix correctly diagnoses a real bug and the change is *inert until next respawn* (P0-safe on reversibility). But the CRITICAL CHECK uncovered a genuine convention split in the server source: **the codebase contains two mutually-exclusive cwd assumptions, and pinning cwd=mcp-server fixes one cluster while breaking another.**

---

### P1 — cwd=mcp-server breaks the repo-root-relative engine cluster (the case the prompt asked me to hunt for, and it exists)

A large, load-bearing set of engines resolve paths as `process.cwd() + "state/..."` / `"Docustrata/..."` / `"mcp-server/..."` — i.e. they **require cwd = H:/prism (repo root)**, the opposite of what this change pins. Evidence (file:line):

- **`mcp-server/src/engines/OutcomeCaptureBusEngine.ts:58`** — `const OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes");` — **module-load-time constant, NO `__dirname`/HERE fallback.** Under cwd=mcp-server this becomes `H:/prism/mcp-server/state/outcomes`, which does not exist; the real ledger is `H:/prism/state/outcomes`.
- Same hard cwd-b
... [+7270 chars truncated]
