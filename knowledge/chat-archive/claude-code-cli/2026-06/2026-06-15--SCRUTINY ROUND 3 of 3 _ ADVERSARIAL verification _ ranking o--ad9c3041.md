---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "SCRUTINY ROUND 3 of 3 — ADVERSARIAL verification + ranking of the FORCE-USE cand"
date: "2026-06-15"
first_ts: "2026-06-15T14:08:07.589Z"
last_ts: "2026-06-15T14:17:42.091Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 19
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ad6180317e3ccc5b7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# SCRUTINY ROUND 3 of 3 — ADVERSARIAL verification + ranking of the FORCE-USE cand

> **claude-code-cli** | 2026-06-15 | 47 msgs (19 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ad6180317e3ccc5b7.jsonl`

## Transcript

### User | 2026-06-15T14:08:07.589Z

SCRUTINY ROUND 3 of 3 — ADVERSARIAL verification + ranking of the FORCE-USE candidates found in rounds 1-2. The operator wants dormant/underused token-saving features converted from ADVISORY to FORCED auto-use "without losing quality." Your job: for each candidate, verify it's REAL + buildable, then adversarially decide whether FORCING it could degrade quality, and rank by ROI (token-save × safety × buildability).

ROUND 1 candidates (dormant savers) — topForceCandidates: efficiency_controller.py, cache_mcp.py, ollama-unified-semantic-router.mjs, SemanticAssetIndexEngine, context_pressure.py, semantic_code_index.py, ollama-route-pretooluse.mjs, next_session_prep.py, auto_compress.py, optimization:cache-manage. NOTE many are Python scripts in scripts/core/ — VERIFY they actually exist and are functional (not aspirational stubs) before trusting them; `ls scripts/core/*.py` + read a couple headers.

ROUND 2 candidates (ignored advisories) — topForceCandidates: ollama-route-pretooluse (force infra ALREADY BUILT — needs mcp-server/data/state/ollama-route-config.json with {"mode":"auto",...}; verify the auto/deny+substitute path exists in .claude/hooks/ollama-route-pretooluse.mjs), large-read-digest-advisory (promote to PreToolUse:Read hard-intercept, deny+digest-substitute via scripts/ollama-file-digest.mjs; verify that script exists), grep-index-first (deny+inject graph-hit paths when pattern is a clean identifier with a graph node hit), wiki-read-offload-advisory, nav-rerank-advisory.

For EACH candidate produce: name, kind, REAL (verified-exists yes/no + evidence file:line or ls result), buildEffort (trivial=config-only | small=1-hook-edit | medium | large), tokenSaveROI (high/mid/low), qualityRisk (none/low/med/high + the SPECIFIC failure mode if forced, e.g. "forcing Ollama digest on a file the model must edit verbatim loses fidelity"), qualityGuard (the escape hatch that neutralizes the risk), forceVerdict (FORCE-NOW | FORCE-WITH-GUARD | KEEP-ADVISORY | DROP), auto
... [+753 chars truncated]

### Assistant | 2026-06-15T14:08:11.111Z

I'll verify each candidate adversarially. Let me start by checking what actually exists.

### Assistant | 2026-06-15T14:08:12.520Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:08:14.409Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:08:15.909Z

[tool_use: Bash]

### User | 2026-06-15T14:08:16.654Z

[tool_result] H:/prism/scripts/core/__init__.py
H:/prism/scripts/core/attention_mcp.py
H:/prism/scripts/core/attention_scorer.py
H:/prism/scripts/core/auto_compress.py
H:/prism/scripts/core/batch_processor.py
H:/prism/scripts/core/cache_mcp.py
H:/prism/scripts/core/checkpoint_mapper.py
H:/prism/scripts/core/checkpoint_mgr.py
H:/prism/scripts/core/clone_factory.py
H:/prism/scripts/core/compaction_detector.py
H:/
... [+2907 chars truncated]

### User | 2026-06-15T14:08:18.655Z

[tool_result] H:/prism/.claude/hooks/large-read-digest-advisory.mjs
H:/prism/.claude/hooks/nav-rerank-advisory.mjs
H:/prism/.claude/hooks/ollama-route-pretooluse.mjs
H:/prism/.claude/hooks/wiki-read-offload-advisory.mjs
H:/prism/scripts/ollama-file-digest.mjs

### User | 2026-06-15T14:08:18.767Z

[tool_result] Exit code 2
H:/prism/mcp-server/data/state/ollama-route-config.json
---
H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs
H:/prism/.claude/hooks/localhost-ollama-hardcode-guard.mjs
H:/prism/.claude/hooks/localhost-ollama-hardcode-guard.test.mjs
H:/prism/.claude/hooks/ollama-auto-router.mjs
H:/prism/.claude/hooks/ollama-autostart.mjs
H:/prism/.claude/hooks/ollama-context-aggregator.mjs
H:/prism/.
... [+1289 chars truncated]

### Assistant | 2026-06-15T14:08:21.841Z

All round-1 Python scripts and round-2 hooks exist on disk. Now I need to verify they are FUNCTIONAL, not stubs, and whether the force-infrastructure paths actually exist. Let me read the critical ones.

### Assistant | 2026-06-15T14:08:22.800Z

[tool_use: Read]

### Assistant | 2026-06-15T14:08:22.977Z

[tool_use: Read]

### User | 2026-06-15T14:08:23.786Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\ollama-route-pretooluse.mjs' was already read 5m ago in this session and is unchanged (mtime 1781104904738). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T14:08:24.403Z

[tool_result] 1	{
2	  "_comment": "GPU-OFFLOAD-MAXIMIZE-MS0/U2 (2026-05-22, slot:sierra): flipped 'suggest'->'auto' per safe-rollout gate. EXEMPT_BASENAMES in the hook prevents self-substitution on load-bearing state files. Operator override: write 'suggest' here OR set PRISM_OLLAMA_ROUTE_AUTO=0 to revert without code change. | BLACKWELL-MODEL-UPGRADE U-BW-RESEARCH-REFINE (2026-06-04, slot:alpha): model was 'qw
... [+476 chars truncated]

### Assistant | 2026-06-15T14:08:27.822Z

The config is already in `auto` mode. The route hook content is already in my context from a prior read. Let me read the critical force-path hooks and the digest substitution script to verify the deny+substitute logic actually exists.

### Assistant | 2026-06-15T14:08:28.715Z

[tool_use: Read]

### Assistant | 2026-06-15T14:08:28.918Z

[tool_use: Read]

### User | 2026-06-15T14:08:29.663Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\large-read-digest-advisory.mjs' was already read 5m ago in this session and is unchanged (mtime 1781108503506). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-15T14:08:30.652Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ollama-file-digest.mjs
3	// U-VERIFIED-OFFLOAD-FILEDIGEST (2026-06-09, slot:alpha): the headline free-token
4	// lever -- offload a LARGE-FILE digest to local Ollama and make it TRUSTWORTHY via
5	// line-anchored verification, so Claude can skip reading the whole file and instead
6	// read only the cited lines to verify any claim. Built on the verifiedOffload
7	/
... [+7346 chars truncated]

### Assistant | 2026-06-15T14:08:35.679Z

The digest script is real and well-built with a structural line-anchored verifier. The read-once guard says I already read `ollama-route-pretooluse.mjs` and `large-read-digest-advisory.mjs` 5m ago — but that's the harness tracking; I do NOT actually have that content in this session's context. Let me read them with offset to bypass the guard and verify the deny+substitute paths, plus check the EXEMPT_BASENAMES logic.

### Assistant | 2026-06-15T14:08:38.871Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:08:40.515Z

[tool_use: Bash]

### User | 2026-06-15T14:09:03.440Z

[tool_result] === ROUTE HOOK: mode/deny/substitute/exempt logic ===
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
106 matches in 35 files:

.claude/hooks/ollama-route-pretooluse.mjs:13:* hook can't *know* whether the model wants the gist or the raw bytes, so by
.claude/hooks/ollama-rout
... [+2815 chars truncated]

### User | 2026-06-15T14:09:28.276Z

[tool_result] === LARGE-READ-DIGEST-ADVISORY: decision + substitute + exempt ===
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
27 matches in 16 files:

.claude/hooks/large-read-digest-advisory.mjs:6:// advisory pointing at scripts/ollama-file-digest.mjs -- the verified line-a...
.claude
... [+1774 chars truncated]

### Assistant | 2026-06-15T14:09:34.329Z

The route hook already implements the full deny+substitute path. Critically, line 254 shows it short-circuits to `suggest` (not deny) when the file kind is "exact" — that's the exact-value guard already built. Let me read the exact classification logic and EXEMPT path in the route hook, and verify the large-read-digest-advisory is purely advisory (no deny path).

### Assistant | 2026-06-15T14:09:35.035Z

[tool_use: Read]

### User | 2026-06-15T14:09:47.199Z

[tool_result] 180	    return hinted
181	      ? { consumable: true, kind: "data", reason: "extensionless file under a report/state path" }
182	      : { consumable: false, kind: "other", reason: "extensionless and not in a report/state path" };
183	  }
184	  return { consumable: false, kind: "other", reason: `unrecognised bulk type (${ext})` };
185	}
186	
187	/**
188	 * Curated gist-only allowlist (BLACKWELL-TO
... [+6369 chars truncated]

### Assistant | 2026-06-15T14:09:54.445Z

Now I have the critical evidence. The route hook (`decideRoute`) already has the exact-value guard built in (line 253-254: `.json/.jsonl/.csv/.md` are downgraded to `suggest`, only `.log/.txt/.out` and logs/archive paths get `reroute`/deny). And it fails-open to raw Read when Ollama is unreachable (lines 243-247). The config is already `mode:auto`. So `ollama-route-pretooluse` force infra is ALREADY LIVE.

Let me verify whether the route hook is actually WIRED in settings.json (does it fire?), check the EXEMPT_BASENAMES, and verify the Python scripts are functional vs stubs.

### Assistant | 2026-06-15T14:09:56.728Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:09:58.233Z

[tool_use: Bash]

### User | 2026-06-15T14:10:31.059Z

[tool_result] === route hook EXEMPT + deny output (lines 430-560) ===

  // Model resolution: env > config > default
  const model = env.PRISM_OLLAMA_ROUTE_MODEL || config.model || "qwen2.5-coder:32b";

  // In auto mode, verify Ollama reachable + model is in the live allowlist BEFORE proposing
  // a substitution. Cascade short-circuit handles the failure path in decideRoute.
  let tagsOk = false;
  let modelO
... [+4328 chars truncated]

### User | 2026-06-15T14:10:41.706Z

[tool_result] === WIRED? grep settings for route hook + advisories ===
C:/Users/wompu/.claude/settings.json:1158:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/nav-rerank-advisory.mjs",
H:/.claude/settings.json:1158:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/nav-rerank-advisory.mjs",

### Assistant | 2026-06-15T14:10:47.139Z

Critical finding: only `nav-rerank-advisory.mjs` is wired in settings.json. The route hook (`ollama-route-pretooluse.mjs`), `large-read-digest-advisory`, `wiki-read-offload-advisory`, and `grep-index-first` are NOT wired — meaning despite `mode:auto` being configured, the route hook DOES NOT FIRE. This is the key for ranking. Let me confirm by checking if they're wired under a different command form (e.g. via a bundle) and verify the Python scripts are functional.

### Assistant | 2026-06-15T14:10:49.925Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:10:51.360Z

[tool_use: Bash]

### User | 2026-06-15T14:15:57.359Z

[tool_result] Command running in background with ID: bmi1ncjaq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tasks\bmi1ncjaq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-06-15T14:15:59.647Z

[tool_result] === efficiency_controller.py header ===
#!/usr/bin/env python3
"""
PRISM Efficiency Controller - Integrated layer for ALL MCP operations.
Provides: Auto-batching, context monitoring, compression triggers, caching.
"""
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from concurrent
... [+1656 chars truncated]

### Assistant | 2026-06-15T14:16:05.218Z

Critical evidence on the Python scripts: `efficiency_controller.py` hardcodes `total_capacity = 200000` (Claude's OLD 200K window — but PRISM targets a 1M window per the regression notes) and `cache_mcp.py` references `PRISM_ROOT = Path("C:/PRISM")` — a path that does NOT exist on this host (the repo is `H:/prism`). These Python scripts are STALE/orphaned aspirational infra pointing at a dead `C:/PRISM` root. Let me confirm the `C:/PRISM` path is dead and check the background grep, plus whether any Python script is actually wired into settings/MCP.

### Assistant | 2026-06-15T14:16:08.491Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:16:08.856Z

[tool_use: Read]

### User | 2026-06-15T14:16:13.748Z

[tool_result] === does C:/PRISM exist? ===
cad-engine
mcp-server
state
=== are scripts/core/*.py wired anywhere in settings? ===
0 matches for 'scripts/core\|efficiency_controller\|cache_mcp\|context_pressure\|semantic_code_index\|next_session_prep\|auto_compress'
(empty above = NOT wired)
=== how many scripts/core py reference C:/PRISM dead root ===
41

### User | 2026-06-15T14:16:17.026Z

[tool_result] 1	=== broader settings grep (any ollama-route / digest / wiki-offload / grep-index ref) ===
2	1 matches in 1 files:
3	
4	1158:0:"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/nav-rerank-advisory....
5	=== count Read-matcher PreToolUse hooks ===
6	

### Assistant | 2026-06-15T14:16:22.975Z

Important correction: `C:/PRISM` DOES partially exist (has `cad-engine`, `mcp-server`, `state` subdirs) — but it is a SEPARATE legacy tree from `H:/prism` (the active repo). The Python scripts point at `C:/PRISM/docs/GSD_CORE_v4.md` and `C:/PRISM/state/` — a stale parallel root, and 41 of the scripts/core/*.py hardcode it. None of the Python scripts are wired into settings.json. They are orphaned legacy infra from an earlier PRISM iteration, not the live `.mjs`-hook + MCP-dispatcher substrate the fleet runs on now.

Let me do final verification: confirm the route hook is genuinely unwired (the only Read-matcher result was empty), check the nav-rerank advisory is purely advisory, and verify grep-index-first existence.

### Assistant | 2026-06-15T14:16:26.275Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:16:27.526Z

[tool_use: Bash]

### User | 2026-06-15T14:16:30.953Z

[tool_result] === nav-rerank-advisory: deny or advisory only? ===
17 matches in 10 files:

.claude/hooks/nav-rerank-advisory.mjs:6:// navigation search), inject an advisory pointing at scripts/ollama-nav-rera...
.claude/hooks/nav-rerank-advisory.mjs:17:// offload-stats `byHook.nav-rerank-advisory.suggested` so the advisory-decay
.claude/hooks/nav-rerank-advisory.mjs:18:// machinery (scripts/lib/advisory-decay.m
... [+1400 chars truncated]

### User | 2026-06-15T14:16:39.632Z

[tool_result] === large-read-digest-advisory: does it have a deny/intercept path or only additionalContext? ===
    lineCount = estimateLineCount(st.size); // huge file: estimate, never load it into the hook
  } else {
    let text;
    try { text = readFileSync(absPath, "utf8"); } catch { emit({ continue: true }); return 0; }
    lineCount = countLines(text);
  }

  const decision = decideAdvisory({ classifica
... [+2059 chars truncated]

### Assistant | 2026-06-15T14:17:42.091Z

I now have all the evidence needed. Key findings:

1. **`large-read-digest-advisory`** has a `0/122` conversion rate (0% take in 122 fires, per the code comment) and is purely advisory (`additionalContext` only, no deny). The empirical 0% take-rate proves the model never wants the lossy summary when reading large files — strong adversarial signal AGAINST forcing.

2. **`ollama-route-pretooluse`** is the strongest candidate: full deny+substitute infra built, exact-value guard built (`.json/.jsonl/.csv/.md` → suggest only; only `.log/.txt/.out`/logs/archive get reroute+deny), fail-open to raw Read on Ollama-down, `mode:auto` already configured — but NOT wired in settings.json so it never fires. Wiring it is trivial/small.

3. **`grep-index-first.mjs`** exists with tests.

4. **Python scripts** (`efficiency_controller.py` etc.) point at a stale `C:/PRISM` legacy tree, hardcode a 200K window, 41 hardcode the dead root, NONE wired — orphaned legacy infra. DROP.

5. **`nav-rerank-advisory`** is wired and advisory-only.

I have sufficient verification. Producing the final assessment.

```json
{"round":3,"assessed":[
{"name":"ollama-route-pretooluse.mjs","kind":"PreToolUse:Read deny+substitute hook","real":"yes — H:/prism/.claude/hooks/ollama-route-pretooluse.mjs:237 decideRoute() + :542 permissionDecision:deny path; config mcp-server/data/state/ollama-route-config.json already {\"mode\":\"auto\",\"minKb\":24,\"model\":\"qwen2.5-coder:32b\"}; BUT NOT wired in settings.json (grep returned 0 refs under Read matcher) so it never fires","buildEffort":"small","tokenSaveROI":"high","qualityRisk":"low","qualityGuard":"BUILT-IN and verified: decideRoute:253-254 downgrades exact-value class (.json/.jsonl/.csv/.md/inventory/baseline/audit/snapshot) to action:suggest — only .log/.txt/.out + logs/archive paths get reroute+deny (isGistSafe:217); :243-247 cascade short-circuits to raw Read (action:pass) when Ollama unreachable OR model not in /api/tags; :469 reroute fails OPEN to pass if
... [+8886 chars truncated]
