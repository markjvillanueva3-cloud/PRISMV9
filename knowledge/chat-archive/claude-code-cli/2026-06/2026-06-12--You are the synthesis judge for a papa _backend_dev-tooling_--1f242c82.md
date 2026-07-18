---
type: "chat-session"
source: "claude-code-cli"
session_id: "1f242c82-8e85-4ab1-9530-f87036ec54ef"
title: "You are the synthesis judge for a papa (backend/dev-tooling) token-ROI script fa"
date: "2026-06-12"
first_ts: "2026-06-12T03:24:29.644Z"
last_ts: "2026-06-12T03:29:44.868Z"
cwd: "H:\\prism-slot-papa"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-papa/1f242c82-8e85-4ab1-9530-f87036ec54ef/subagents/workflows/wf_717d739a-86d/agent-a73806f08cc492292.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:05"
---

# You are the synthesis judge for a papa (backend/dev-tooling) token-ROI script fa

> **claude-code-cli** | 2026-06-12 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-papa
> Raw: `H:/.claude/projects/H--prism-slot-papa/1f242c82-8e85-4ab1-9530-f87036ec54ef/subagents/workflows/wf_717d739a-86d/agent-a73806f08cc492292.jsonl`

## Transcript

### User | 2026-06-12T03:24:29.644Z

You are the synthesis judge for a papa (backend/dev-tooling) token-ROI script fan-out. Below is the raw candidate set from 6 discovery lenses (JSON). Tasks: (1) DEDUP across lenses and against the prior-coverage list:
ALREADY COVERED (do NOT re-surface as net-new; only build ON these):
- OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18 (skills/scripts/hooks auto-routing to Ollama/Obsidian)
- JULIETT-TOKEN-OPTIMIZATION-AUDIT-2026-05-17 (DataChaz X token-opt)
- GOAL-CROSSSURFACE-QUEUE-2026-06-09 (888K-token ultracode cross-surface sweep)
- token-context-forge-audit-ms0 (dormant-features enum)
- U-OBF-F4-HOOK-FIRE-AUDIT + SESSIONSTART-HOOK-AUDIT (hook keep/disable)
- PAPA-SCRIPT-AUDIT-ROI-2026-06-11.md (papa: ~4200 scripts; Obsidian-grab ALREADY BUILT; tsc-guard SHIPPED today)
Peer loops OWN (do NOT duplicate): 97872074=fleet hook audit, CHEAP-NODE-ACCESS=node-tooling.
Papa unique slice = SCRIPTS + build-quality + script-hook COMBOS that save tokens.
RTK already wraps ~100 verbose commands (git/gh/npm/vitest/tsc/docker/grep/cat); ask-ollama.mjs already does local viz/summarize/explain/triage.
(2) DROP anything not genuinely net-new or not in papa's SCRIPT/build lane (pure-hook-only -> belongs to peer 97872074; node-tooling -> CHEAP-NODE-ACCESS). (3) RANK the survivors by token-ROI = est tokens saved x frequency x (1/effort). (4) For each, fill R15 placement: galaxy (which engines/<galaxy>/ or scripts/ it belongs to), autoInvocation (the hook/trigger + WHEN it fires, or "none"), scope (fleet-wide vs papa-only vs domain-specific), wireTargets. (5) Give ONE topRecommendation: the single highest-ROI combo papa should build next, with a one-paragraph build sketch. Be honest if the strongest finding is "most opportunities are already covered" — do not invent ROI.

RAW CANDIDATES:
[{"path":"H:/prism/mcp-server/scripts/check-bundle-budget.mjs","assetType":"script","verdict":"wrap-for-tokens","tokenMechanism":"Script emits a verbose 70-char-wide ASCII table of every JS chunk (gzip KB, 
... [+44131 chars truncated]

### Assistant | 2026-06-12T03:24:39.479Z

I'll work through this systematically: dedup the candidates across lenses, drop out-of-lane items, rank survivors by token-ROI, fill R15 placement, and pick one top recommendation. Let me verify a few load-bearing claims before ranking, since several candidates hinge on specific facts (wiring state, staleness, existing flags).

### Assistant | 2026-06-12T03:24:42.542Z

[tool_use: Bash]

### Assistant | 2026-06-12T03:24:43.861Z

[tool_use: Bash]

### User | 2026-06-12T03:25:24.358Z

[tool_result] === .claude/hooks/large-read-digest-advisory.mjs ===
EXISTS 205 lines
=== scripts/crash-postmortem-digest.mjs ===
EXISTS 290 lines
=== scripts/hook-health-check.mjs ===
EXISTS 163 lines
=== .claude/hooks/wiki-read-offload-advisory.mjs ===
EXISTS 218 lines
=== scripts/h-drive-census.mjs ===
EXISTS 242 lines
=== scripts/generate-master-index.mjs ===
EXISTS 353 lines

### User | 2026-06-12T03:26:03.050Z

[tool_result] === settings.json refs ===
large-read-digest-advisory: 0
0 refs in settings.json
crash-postmortem-digest: 0
0 refs in settings.json
hook-health-check: 0
0 refs in settings.json
wiki-read-offload-advisory: 0
0 refs in settings.json
token-awareness-snapshot: 0
0 refs in settings.json
build-system-viz-livediff: 0
0 refs in settings.json

### Assistant | 2026-06-12T03:26:07.014Z

Files exist; the combo candidates are genuinely unwired (0 refs). Let me verify the highest-ROI specific claims: the wiki-read offload hook's wiring state (it claims the advisory exists but the PostToolUse auto-invoke arm is missing), the large-read-digest hook's PostToolUse vs PreToolUse claim, the master-index staleness, and whether ollama-file-digest.mjs is real.

### Assistant | 2026-06-12T03:26:10.225Z

[tool_use: Bash]

### Assistant | 2026-06-12T03:26:12.984Z

[tool_use: Bash]

### User | 2026-06-12T03:26:22.920Z

[tool_result] === wiki-read-offload arms ===
// wiki-read-offload-advisory.mjs — PreToolUse:Read advisory hook
// inject an advisory pointing at /route-to-obsidian — a slash that delegates
// to scripts/ask-ollama.mjs summarize so the 5-50KB wiki body is processed in
// large wiki entry COULD be summarized via /route-to-obsidian. The token
// the next turn. Tracked under offload-stats `byHook.wiki-read-offload-
... [+511 chars truncated]

### User | 2026-06-12T03:26:35.352Z

[tool_result] === master-index staleness ===
no MASTER_INDEX.json at state/shared
./archives/materials-variants/materials_unified/MASTER_INDEX.json
./data/machines/EXTRACTED/MASTER_INDEX.json
./data/MASTER_INDEX.json
./data/materials/MASTER_INDEX.json
./data/tool_holders/MASTER_INDEX.json
=== ollama-file-digest exists ===
-rwxr-xr-x 1 wompu 197611 47228 Jun 11 11:20 scripts/ask-ollama.mjs
-rwxr-xr-x 1 wompu 197
... [+769 chars truncated]

### Assistant | 2026-06-12T03:26:44.441Z

Key findings confirmed:
- `master-index staleness`: candidate cited `state/shared/MASTER_INDEX.json` 42 days stale — but that file does NOT exist at that path. The candidate's staleness claim is unverified/wrong as stated. I'll downgrade those master-index candidates.
- `large-read-digest-advisory.mjs`: it's a **PreToolUse:Read advisory** (not PostToolUse auto-invoke as the combo candidate claimed), unwired in settings.json, decay-wired. Real and buildable as pure wiring.
- `wiki-read-offload-advisory.mjs`: also PreToolUse advisory, unwired, decay-wired. The "PostToolUse auto-invoke" arm the candidate proposes is genuinely net-new but is an M-effort build (not pure wiring).
- `ollama-file-digest.mjs` + `ollama-offload.mjs` + `ask-ollama.mjs`: all real and production-ready.
- `check-bundle-budget.mjs`: 0 json-flag refs confirmed — the `--json` wrap is genuinely net-new.
- `materials_rebuild/generate.mjs`: 3 anthropic-call refs confirmed — the only real Anthropic SDK caller in scripts.

Let me confirm two more: whether the large-read hook is truly the strongest (its est 8000 tokens depends on whether read-bundle already covers it) and the generate-master-index wiring/staleness reality.

### Assistant | 2026-06-12T03:26:48.485Z

[tool_use: Bash]

### User | 2026-06-12T03:27:32.638Z

[tool_result] === generate-master-index output path + last gen ===
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
const OUTPUT_MCP = join(MCP_ROOT, "data", "MASTER_INDEX.json");
const OUTPUT_REPO = join(REPO_ROOT, "data", "MASTER_INDEX.json");
  const hasStructuredOutput = caseBlock.includes("JSON.stringify")
  // Match export path or route path
  const routes = [];
--- fi
... [+212 chars truncated]

### Assistant | 2026-06-12T03:27:36.759Z

Confirmed: `generate-master-index.mjs` writes to `data/MASTER_INDEX.json` (not `state/shared/`). Let me check the actual staleness of that real file and whether the large-read hook is the strongest single buildable item.

### Assistant | 2026-06-12T03:27:39.278Z

[tool_use: Bash]

### User | 2026-06-12T03:28:02.877Z

[tool_result] === real MASTER_INDEX.json mtime ===
2026-04-30 12:14:15.362450500 -0500
2026-04-30 12:14:15.100106300 -0500
=== MASTER_INDEX_COMPACT ===
./data/docs/MASTER_INDEX_COMPACT.md
./mcp-server/data/docs/MASTER_INDEX_COMPACT.md
./mcp-server/MASTER_INDEX_COMPACT.md
./prism-test-6d0595/mcp-server/MASTER_INDEX_COMPACT.md
./src/data/docs/MASTER_INDEX_COMPACT.md
=== which reads compact ===
.claude/hooks/build
... [+103 chars truncated]

### Assistant | 2026-06-12T03:28:17.745Z

The real `data/MASTER_INDEX.json` IS 42 days stale (2026-04-30), and `master-index-search-gate.mjs` reads the COMPACT.md derivative. So the staleness claim is TRUE — just at a different path than the candidate stated. The net-new value is a SessionStart freshness-guard, which is real but lower-ROI than the read-offload hooks (staleness causes indirect re-search cost, not direct context bloat).

I have enough verified signal. Let me synthesize the ranking.

Verification summary:
- **PreToolUse advisory hooks (large-read, wiki-read)**: both real, unwired, decay-protected. The candidate's framing of large-read as a "PostToolUse auto-invoke" was wrong — it's a PreToolUse advisory needing one settings.json entry. So `large-read-digest-advisory` wiring is **S-effort pure wiring**, and its companion `ollama-file-digest.mjs` is production-ready. This is the cleanest highest-ROI item.
- **wiki-read PostToolUse auto-invoke arm**: genuinely net-new but M-effort (needs a new PostToolUse hook that calls ollama-file-digest and injects digest-as-system-reminder). Higher theoretical ROI (12K/session) but real authorship + risk of breaking context-read semantics.
- **check-bundle-budget --json**: confirmed no json flag, S-effort, papa build-quality lane. Solid.
- **materials generate ISO-classify offload**: only real Anthropic caller; offload is legitimate but occasional frequency.
- **master-index staleness guard**: real staleness, but lower/indirect ROI; co-fresh step in overnight-vault-compound is the cleaner placement.
- **DROP**: all `keep`-verdict items, esbuild/vitest configs (no chat-context output), and master-index COMPACT grabber duplicates.

Domain-specific audit-script `--compact` wraps (audit-unwired-engines, audit-mill-psn, h-drive-census totals-only, etc.) are real net-new but domain-specific and individually modest; they cluster into one pattern.

### Assistant | 2026-06-12T03:29:30.451Z

[tool_use: StructuredOutput]

### User | 2026-06-12T03:29:31.097Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-12T03:29:44.868Z

Synthesis complete. Summary of the judgment:

**Top recommendation**: Wire `large-read-digest-advisory.mjs` (Phase 1, pure S-effort wiring — one settings.json line) plus build its missing PostToolUse auto-digest companion calling the already-trusted `ollama-file-digest.mjs` (Phase 2, M-effort). This is the one combo where the expensive half is already built and line-anchor-verified, the advisory shell already exists and is decay-protected, and the savings are per-prompt + frequent.

**Key honest corrections made during verification:**
- The candidate framed `large-read-digest-advisory` as a "PostToolUse auto-invoke" — it is actually a **PreToolUse advisory** (verified in source). That makes Phase 1 cheaper (pure wiring) than the candidate implied.
- The master-index staleness candidates cited a path (`state/shared/MASTER_INDEX.json`) that **does not exist**. The real file `data/MASTER_INDEX.json` IS 42 days stale (2026-04-30 verified), and `master-index-search-gate.mjs` reads its COMPACT.md derivative — so the staleness is genuine but downgraded to indirect ROI (re-search cost, not direct context bloat).
- ranks 2 and 1's Phase-2 **converge** on one generic PostToolUse large-read digest hook — I flagged this to avoid building a redundant wiki-specific clone (R8/dedup).

**What I dropped as already-covered or out-of-lane**: all `keep`-verdict items (esbuild/vitest configs produce no chat-context output; audit-monolith-port-state / -hook-bash-overhead / -nudge-mcp already have `--json`; lint-wiki / distill-tribal already Ollama-routed; ollama-offload/file-digest/sidecar-freshness are the solutions). Cross-lens duplicates (h-drive-census ×2, generate-knowledge-inventory ×2, generate-master-index ×3, cold-script/helper-orphan pair) were merged. `hook-health-check` (rank 9) and `crash-postmortem-digest` (rank 11) were flagged for peer-coordination with fleet-hook-audit (97872074) / golf rather than claimed outright.

11 survivors ranked; ranks 1–4 are the genuinely high-
... [+90 chars truncated]
