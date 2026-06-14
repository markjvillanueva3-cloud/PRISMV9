# PAPA Token-ROI Script Fan-out — 2026-06-11 (slot:papa, session claude-1f242c82)

> **Provenance.** Operator `/goal`: "use ultracode to fan out and find more high-ROI scripts that would
> save tokens." Executed as a bounded ultracode Workflow `wlc98e049` (run `wf_717d739a-86d`): **7 agents**
> (6 read-only `Explore`/sonnet discovery lenses + 1 synthesis), **587K subagent tokens**, 253 tool uses,
> ~38 min. It **survived** the box pressure that killed the earlier `w2pihh4ul`. Output: 48 candidates /
> 33 net-new across 6 lenses (build-test-tsc 7, verbose-output 10, ollama-routable 8, rederivation-cache
> 10, obsidian-grab 8, script-hook-combo 5).
>
> **This is an ADVISORY LEAD LIST — `mustHumanVerify` per item.** See §1: the agent-ranked #1 was
> DISK-REFUTED. Trust nothing un-verified.

## 1. HEADLINE (R8/R12) — the agent-ranked #1 is REFUTED; the queue is leads, not a buildable set

The synthesis ranked **#1 = "wire `large-read-digest-advisory.mjs` (claimed 0 refs in settings.json) +
PostToolUse `ollama-file-digest` auto-invoke"** with "Phase 1 = pure wiring, 1 settings entry, ~zero risk."

**Disk-verify (this session) REFUTES it:** `large-read-digest-advisory.mjs` is **ALREADY WIRED** —
`C:/Users/wompu/.claude/settings.json:1200` AND `H:/.claude/settings.json:1200`:
`"command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/large-read-digest-advisory.mjs"`.
There is **no Phase-1 wiring to do** — the advisory already fires. The "S-effort pure-wiring win" evaporates.

This is the **3rd recurrence** of the agent-queue-false-claim lesson (golf hit it twice today —
HRH-NEW-1 CAG-inject "Glob→No files found" but built+wired; HRH-NEW-3 per-file-tsc duplicated the existing
`tsc-baseline-regression-gate`). **A synthesis/Explore agent does NOT reliably R8-check existing wiring.**
Every "VERIFIED 0 refs / no flag" claim below must be disk-verified before building. See
[[reference_skills_hooks_audit_2026_06_11]] + [[reference_goal_crosssurface_queue_2026_06_09]].

## 2. Ranked queue (advisory; verify status as established this session)

| # | Item | Combo | Token ROI | Effort | Ollama? | Verify status |
|---|------|-------|-----------|--------|---------|---------------|
| 1 | large-read-digest-advisory wiring + PostToolUse digest | hook+script | ~~VERY HIGH~~ | ~~S~~ | yes | **REFUTED — already wired (settings.json:1200)** |
| 2 | wiki-read-offload PostToolUse auto-digest arm | hook+ollama-file-digest | HIGH (lower-conf) | M | yes | UNVERIFIED; converges w/#1 Phase2; BLOCKED (Ollama down) |
| 3 | **check-bundle-budget `--json/--summary`** | script-only | MEDIUM-HIGH (~800/commit) | S | no | **VERIFIED real** — file exists, parses argv, NO json flag |
| 4 | materials_rebuild ISO-group offloadClassify | script+lib | MEDIUM | S | yes | UNVERIFIED (agent: 3 anthropic refs); BLOCKED (Ollama down) |
| 5 | verbose audit-script `--compact` cluster (x4 shared) | script-only | MEDIUM agg | S | no | UNVERIFIED — disk-check each before build |
| 6 | h-drive-census `--totals-only` | script-only | MEDIUM (~3500/run) | S | no | UNVERIFIED — likely real (large per-file manifest) |
| 7 | rederivation-cache sidecar for index regenerators (x4) | script+stop-hook | MEDIUM agg | S | no | UNVERIFIED — sidecar-freshness.mjs is proven template |
| 8 | generate-build-context `--summary` + mtime-skip | script+SessionStart | MEDIUM | M | no | UNVERIFIED |
| 9 | hook-health-check SessionStart surface | script+hook | MEDIUM | S | no | UNVERIFIED — **coordinate with peer 97872074 (hook audit lane)** |
| 10 | cold-script-rank + helper-orphan-rank offloadClassify shim | script x2+lib | LOW-MED | S | yes | UNVERIFIED; BLOCKED (Ollama down) |
| 11 | crash-postmortem-digest Stop reader | script+Stop | LOW-MED | M | no | UNVERIFIED — **DEFER to golf/fleet-hygiene lane** |

## 3. The one VERIFIED, clean, papa-lane buildable (next build)

**Rank 3 — `check-bundle-budget.mjs --json`** (`mcp-server/scripts/check-bundle-budget.mjs`).
Disk-verified this session: file exists, `const args = process.argv.slice(2)` (line 172), **no** `--json`
/ `JSON_ONLY` / `jsonOut` flag. The `violations[]` array is already computed; adding a `--json {pass,
violations}` branch is ~3 LOC and cuts the ~40-line chunk table to 2-5 lines on every build. **No Ollama
dependency.** Galaxy: backend-helper (`mcp-server/scripts/`). Auto-invocation: none required (manual /
post-build); optionally `comprehensive-build-enforce` reads the `--json` violations-only. Scope: papa-only
(build-quality lane). **This is the clean next build** — preferred over any Ollama-dependent item while
Ollama is down.

Other non-Ollama, S-effort, disk-verify-then-build candidates: rank 6 (h-drive-census `--totals-only`),
rank 7 (shared rederivation-cache sidecar — reuses the proven `sidecar-freshness.mjs` template).

## 4. Blocked / deferred / out-of-lane
- **Ollama-dependent (1,2,4,10):** BLOCKED — Ollama daemon was UNREACHABLE this session; R15 VALIDATE-on-live
  cannot pass with Ollama down. #1 also refuted regardless. Build only when Ollama is healthy.
- **Peer-coordination:** rank 9 (hook-health surface) overlaps peer-loop `97872074` (fleet hook audit);
  rank 11 (crash-postmortem) is golf/fleet-hygiene lane. Coordinate / defer, don't unilaterally build.
- **settings.json splices are firewall-gated** from the slot worktree (harness-exec hard-block) — any hook
  wiring routes via the sanctioned main-tree Node-patcher path or a reviewed patch-sibling.

## 5. Box-health flag (golf / operator lane — NOT papa's to fix)
This session the box was **critically degraded**: Ollama `:11434` UNREACHABLE (silent fallback to Claude —
token-economy degraded); scheduled-task health CRITICAL (44/53 — `PRISM Tmp Sweep`=failing, `PRISM Zulu
Orchestrator`=failing, `PRISM Blueprint OCR Batch`=stale); a recurring hook **fork-storm** (16-81 cascading
`bash.exe` under harness 77328). Re-register failing tasks from an ELEVATED shell via
`.claude/helpers/install-<task>-task.ps1`; restart "PRISM Ollama Serve". golf's reaper is already sweeping
the orphans.

## 6. Recommendation
1. Do **NOT** build from the unverified queue without a per-item disk-verify (the #1 refutation proves why).
2. Next build (box-healthy): **rank 3** (`check-bundle-budget --json`) — verified, no-Ollama, S, papa-lane —
   then rank 6 / rank 7. Each: WIRE→TEST→VALIDATE→commit, per-file scrutiny + 3-of-3.
3. The fan-out's durable value = the 33 net-new leads + the disk-verify catch + the standing R8-on-agent-
   queues lesson, NOT a rushed build on a degraded box.
