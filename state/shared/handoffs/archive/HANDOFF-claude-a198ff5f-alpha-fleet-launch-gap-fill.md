---
terminal: claude-a198ff5f
session_id: a198ff5f-9c3d-44ad-a040-50b918b0a91a
slot: alpha
topic: alpha-fleet-launch-gap-fill
created: 2026-05-28T19:35:00Z
last_commit: c9fe03cf00
---

## RESUME directive (auto-fire)

Pending operator directive (sent 2026-05-28 19:30Z): **"fix the ollama inefficiencess and scope out other inefficiences that we have in our system so we run optimally and synergized across the entire code base"**. Pivot to a /goal /loop after handoff is acknowledged.

### Immediate Ollama actions (Task #35)

1. **Consolidate to ONE Ollama daemon** — currently both native Windows Ollama (PID rotates) and container `prism-ollama` are running, fighting for GPU. Decide canonical:
   - **Option A (lighter weight):** kill container `docker stop prism-ollama`, keep native (already has qwen2.5-coder:3b pinned 24h)
   - **Option B (cleaner config-as-code):** kill native, use container; container's model store is bind-mounted so models survive restarts
2. **Bump rewriter timeout 5s → 30s** — root cause of 50/50 skip rate. `.claude/hooks/prompt-rewriter-ollama.mjs` has a hardcoded timeout in the fetch call. Cold-load of qwen2.5-coder:3b took 43s in today's smoke test.
3. **Deploy qwen2.5-coder-32b on NIM** — the 4080 SUPER has 9GB VRAM free after qwen2.5-coder:3b. NIM gives better batching than Ollama for the rewriter's high-frequency calls. `nim-embed-e5` is already healthy; adding a chat NIM is one compose-up command.

Verification: `prism-ollama` offload rate ≥30% per `node scripts/ollama-offload-dashboard.mjs` + rewriter health ≥85% per banner.

### Fleet-wide inefficiency audit candidates (Task #36)

Pre-scoped from this session + prior audits:

| Class | Count | Severity |
|---|---|---|
| T0 dormant hooks (golf-slot-write-allowlist, ai-duplication-guard, mcp-route-suggest) | 33 | P0 |
| Unwired engines (BUILD_STATE needs_wiring) | 118 | P1 |
| Quarantined tribal tips (never promoted) | 327 | P2 |
| Orphan extracted_modules JS | 50+ | P2 |
| Failed-to-connect MCPs (codex/serena/shadcn/context7/github) | 5 | P1 |
| UNWIRED-ENGINE-AUDIT date-stamp bug (writes to -2026-05-07 hardcoded) | 1 | P3 |
| Regen-noise: canonical refreshers produce 5520 file changes for 6 substantive | systemic | P2 |
| Settings.json: 1572 lines, ratio dormant hooks vs wired | ? | needs measurement |
| Multi-Ollama GPU contention | systemic | P0 (Task #35 closes) |

Output: `state/shared/specs/FLEET-INEFFICIENCY-AUDIT-2026-05-28.md` with P0/P1/P2 ranking + 1-line fix per item.

## Shipped this session (commit c9fe03cf00)

1. **Skill auto-invoke promotion** (17-skill allowlist; closes "I have to tell you to use forge commands")
   - hook + extractor + JSONL + CLAUDE.md doctrine + memory file
2. **Closed-loop dead-letter fix** (outcome-bus emits previously_failed + task fields)
3. **CLAUDE-FLOW TOOL POLICY doctrine** (5-tool harvest whitelist + redundant list)
4. **zebra→hermes-zebra map fix** in outcome-bus-auto-tap SLOT_GALAXY_MAP
5. **Ollama restart + qwen2.5-coder:3b 24h pin** (rewriter health partially restored)
6. **Codex CLI MCP re-registered** (`claude mcp add codex` with absolute path)
7. **Canonical sources refreshed** (PRISM-INVENTORY + BUILD_STATE + MILESTONE_PROGRESS)
8. **Anthropic plugins confirmed installed** (32 from claude-plugins-official + 3 other marketplaces)
9. **Dynamic-workflows X-post** response (A trigger-suggest / B co-invoke / skip — operator hasn't picked)
10. **3-of-3 scrutiny PASS x3 marked in SCRUTINY_LEDGER** (reviewer-A initial FAIL corrected — RTK grep -c artifact)
11. **New memory**: `feedback_skill_autoinvoke_mandatory_2026_05_28.md`

## Pending operator decisions (carried forward)

- Dynamic-workflows synergy (A trigger-suggest / B co-invoke / skip)
- Docker+NIM consolidation strategy (Option A native, Option B container — see Task #35)
- Post-launch followups: extend INVOKE_NOW skill triggers (10 missing manifests), date-stamped audit filename, fingerprint regen bug
- VS Code vs PowerShell host: **answer = don't swap.** Two single-hook units close the actual echo pain instead (post-static-check-on-edit.mjs auto-tsc + post-runtime-verify-on-edit.mjs auto-pp_verify). Detail in session transcript.

## R12-honest carryover

- `git status` shows ~5500 modified files; only 12 were committed in c9fe03cf00 (substantive + canonical-refresh). The remainder is auto-regen noise from MISC-TASKS-INVENTORY / ROADMAP-CONSOLIDATED / zebra-awareness-* / wiki-orphans / youtube-extraction — these don't represent semantic changes. Probable cause: deterministic-stamp drift (timestamps embedded in regenerator output). Worth fixing in the inefficiency audit (deterministic regenerators reduce git churn fleet-wide).
- The handoff bash failed once with Cygwin Win32 299 (partial-copy) under load — recovery via Write tool. Tracking as a yet-another-bash-fragility data point for the audit.
