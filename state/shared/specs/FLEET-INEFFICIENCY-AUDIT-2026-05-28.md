# Fleet Inefficiency Audit — 2026-05-28

**Origin**: operator directive (slot:alpha session a198ff5f, 2026-05-28 19:30Z)
*"fix the ollama inefficiencess and scope out other inefficiences that we have in our system so we run optimally and synergized across the entire code base"*

**Method**: live measurement + signals captured during the gap-fill session that produced commits c9fe03cf00 + 4bf2df6a1d (Ollama LOADED_MODEL_ONLY + Admin-launcher Opus 4.8 + skill auto-invoke + closed-loop dead-letter fix). Per `/forge-audit-v2` doctrine each finding declares a verification channel + re-measurement command + named owner.

**Verdict**: 6 P0 (fix before fleet launch), 9 P1 (fix in first launched-fleet week), 7 P2 (post-launch backlog). No public-leak risk in dormant resources.

---

## P0 — fix before fleet launch (6)

| # | Class | Signal | Verification command | Suggested slot | Fix |
|---|---|---|---|---|---|
| P0-1 | **Multi-Ollama GPU contention** | netstat shows 11434 bound by PID 12940 (container dockerd-proxy) AND PID 44916 (native, IPv6-only) + ollama-app.exe PID 23012 active | `netstat -ano \| grep 11434` should show ONE PID, not three | kilo/india | Kill native ollama app, route everything to container OR vice-versa. Operator decision pending (Option A native, Option B container — both viable; container is more reproducible). |
| P0-2 | **Rewriter cold-load skip rate** | 50/50 last calls failed pre-fix; root cause WALL_TIMEOUT_MS=3s + pickModel chose largest installed (32b cold-load 60s) | `node scripts/ollama-offload-dashboard.mjs` reports skip-rate <20% | kilo (closed 4bf2df6a1d) | DONE — LOADED_MODEL_ONLY=1 default + timeout 8s. Smoke test: rewriter picks loaded model, returns skip:true normally |
| P0-3 | **Admin-launcher missing Opus 4.8** | claude-with-cleanup.cmd + claude.bat had no --model flag → Sonnet default | Reopen Claude Code (Admin) shortcut, run /model — should show opus-4-8 | alpha (closed 4bf2df6a1d) | DONE — both files now inject `--model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m]` |
| P0-4 | **outcome-bus.jsonl size + no rotation** | 13.3MB after 8 hours of activity. previouslyFailed() tail-read is bounded (16KB), but the file will hit 100MB+ in a fleet-week. No rotation policy. | `ls -lh state/shared/outcome-bus.jsonl` should stay <5MB | papa/golf | Add daily rotation: `.{N}.jsonl.gz` with N=7 retention. Hook fires on Stop when size > threshold. ~30 lines. |
| P0-5 | **Closed-loop dead-letter (consumer<-publisher)** | publisher (outcome-bus-auto-tap) emits, consumer (stop-auto-capture-per-slot) filters on previously_failed field publisher never set. Pre-fix: 0% pair-capture rate. | After 24h of fleet activity: `grep -c "type: feedback" state/shared/stop-capture-ledger.json` should grow | alpha (closed c9fe03cf00) | DONE — publisher now emits task + previously_failed fields. previouslyFailed() lookback 16KB+30min, prefix-match 96 chars (post-reviewer-B P1-B fix). |
| P0-6 | **5 MCP servers Failed-to-connect** (shadcn, serena, github, context7, codex) | `claude mcp list` shows 5 ✗ Failed lines | Re-run `claude mcp list`: at most 1 ✗ acceptable (codex probe-timing) | alpha/bravo | codex: re-registered with abs path (will resolve on next session). shadcn: bunx package likely uninstalled — `bunx -y @jpisnice/shadcn-ui-mcp-server --version` to confirm. serena: uvx git URL — verify Python toolchain. context7: npx package — fresh `npm install`. github: HTTP MCP with auth — verify github copilot subscription. Total: 5 ~30-min fixes. |

## P1 — fix in first launched-fleet week (9)

| # | Class | Signal | Verification | Slot | Fix |
|---|---|---|---|---|---|
| P1-1 | **118 unwired engines** | BUILD_STATE.json needs_wiring=118 | BUILD_STATE.json needs_wiring < 50 | wiring (romeo) | Re-run audit-unwired-engines.mjs (it writes hardcoded -2026-05-07 filename — date-stamp bug, P3 below). 118 engines need a dispatcher entry. ~3 days of wire-batch work. |
| P1-2 | **5520 file regen churn on canonical refreshers** | running update-prism-inventory.mjs + build-state-snapshot.mjs + build-milestone-progress.mjs produced 5520 modified files for ~6 substantive changes. Cause: timestamps embedded in regen output. | Re-run all 3 scripts, diff should be < 100 files | sierra (system-viz) + papa | Add `--deterministic` flag to all 3 scripts that omits ts fields. Then git churn drops to actual semantic changes. ~2 hours each. |
| P1-3 | **VS Code-style static error feedback for echo** | echo (post-processor) edits TypeScript files but no auto-tsc loop. Operator pain confirmed: "have to tell you to use forge commands" — extends to "have to tell you to check for compile errors" | hook `post-static-check-on-edit.mjs` fires + emits errors into next prompt as additionalContext | echo | New PostToolUse hook: pathGlob `mcp-server/src/engines/post-processor/**` → runs `tsc --noEmit` on touched file → injects errors. ~50 lines. |
| P1-4 | **Runtime post-processor verification gap** | post edits don't auto-invoke pp_verify. Bad G-code can ship without verification. | hook `post-runtime-verify-on-edit.mjs` fires + invokes prism_cam:pp_verify on touched .cps/.ps | echo | New hook (parallel to P1-3): touched post → loads known-good .nc input → runs pp_verify → injects report. ~80 lines. |
| P1-5 | **NIM has no chat model deployed** | nim-embed-e5 healthy but no NIM chat. 4080 SUPER has 9GB free VRAM after qwen2.5-coder:3b. Heavy rewriter calls + octopus consensus could batch better on NIM. | `curl http://localhost:8000/v1/models` lists qwen2.5-coder-32b-instruct | india/kilo | Add nim-chat service to docker-compose.intel.yml. Set OLLAMA_REWRITE_MODEL env to point rewriter at NIM endpoint for heavy calls. ~1 hour. |
| P1-6 | **Skill auto-invoke coverage gap** | 9 invoke entries shipped (7 of 17 allowlisted skills). 10 skills lack triggers: block in their .md frontmatter | `grep -c "action:invoke" _skill-triggers.jsonl` ≥ 17 | alpha | Add triggers: block to forge7.md, forge-audit-v2.md, forge-triple.md, scrutinize.md, handoff.md, checkpoint.md, compact.md, octopus.md, master-index.md, pick-unit.md (~5 min each). |
| P1-7 | **327 tribal quarantine backlog** | `knowledge/tribal/auto-ingested-quarantine/` has 327 files; none promoted to active corpus | `ls knowledge/tribal/auto-ingested-quarantine/ \| wc -l` should be <100 | lima/golf | Promotion script: dedup against active 3920 tribal files, score by relevance, promote top-N. ~half-day. |
| P1-8 | **50+ orphan extracted_modules** | `H:/PRISM/extracted_modules/{priority_extraction,ai_ml_engines,...}` JS modules with zero consumers. Likely overlap with existing 3604 wired engines. | None of `priority_extraction/*.js` referenced from `mcp-server/src/` | bravo/foxtrot | Dedup-guard each against current engines. Port survivors to TS. Hi-ROI if any are novel (chatter prediction, hybrid toolpath, adaptive HSM). |
| P1-9 | **Settings.json 253-command line-noise** | settings.json is 1703 lines with 253 command entries; some duplicated across PreToolUse + PostToolUse + Stop blocks. | `node scripts/settings-dedup-audit.mjs` (new) reports duplicate-command count <5 | golf/alpha | Audit script: parse settings.json, count duplicate command strings across hook blocks, suggest collapse. ~3 hours. |

## P2 — post-launch backlog (7)

| # | Class | Signal | Slot | Fix |
|---|---|---|---|---|
| P2-1 | **UNWIRED-ENGINE-AUDIT date-stamp bug** | scripts/audit-unwired-engines.mjs hardcodes `-2026-05-07.json` filename | papa/golf | Replace with `new Date().toISOString().slice(0,10)`. 1-line fix. |
| P2-2 | **Bash fragility (Cygwin Win32 299 partial-copy)** | 1 handoff write failed mid-session with ERROR_PARTIAL_COPY under memory pressure. Recovered via Write tool. | golf | Document: prefer Write/Edit tools over Bash heredocs for handoff/spec writes. Add to feedback-memory + skill-auto-trigger Karpathy R12 watchlist. |
| P2-3 | **Pre-grep/Pre-bash/Pre-read graph nudges 0.4% take-rate** | hooks emit graph-context nudges on every Bash/Grep/Read; fleet take-rate 11/2750 = 0.4% | sierra | Either bump nudge precision (only fire when graph confidence >0.8) OR demote to debug-only. Currently pure noise. |
| P2-4 | **NN-GRAPH tier-5 AUROC 0.096 (research-only)** | tier-5 GraphSAGE for ghost.unwired-engine classification still below 0.78 promotion threshold | india | Operator-initiated stratified retrain on the corrected node-embedding bridge (live since 2026-05-23). ~6 hours. |
| P2-5 | **Tribal cross-domain inject 0% match rate** | tribal-by-domain-inject hook surfaces 0 results per session (top-3 reliably empty for most slots) | golf/lima | Investigate index staleness vs domain-filter mismatch. Probably embedding-coverage gap (only 31.5% of wiki covered per SessionStart banner). |
| P2-6 | **Stale skill-triggers fingerprint short-circuit** | extract-skill-triggers.mjs has a known fingerprint short-circuit that can lock the JSONL to empty state | alpha/lima | Add `--force` flag + auto-delete-on-mtime-mismatch heuristic. 30 min fix. |
| P2-7 | **CLAUDE.md size approaching compliance-collapse threshold** | per the Mnilax X article cited in our own §R5-R12 doctrine: past ~200 lines, CLAUDE.md compliance drops. Current ~750 lines + 100+ Recent regressions entries. | golf (allowlisted to edit CLAUDE.md) | Promote Recent regressions block to a sister file `state/shared/RECENT-REGRESSIONS.md` referenced by pointer. Promote §SLOT AUTO-INVOKE + §CLAUDE-FLOW TOOL POLICY to memory-file pointers. Goal: <200 lines body. |

## Items NOT inefficiencies (verified during this session — drop from punchlist)

- **Skill-auto-trigger reach** — hook IS wired in 3 places (UserPromptSubmit/PostToolUse/Stop) firing 507 trigger rows. Operator pain was "suggest vs invoke", fixed via INVOKE_NOW allowlist (c9fe03cf00).
- **Anthropic plugins** — 32 plugins from `claude-plugins-official` already installed. Not missing.
- **Codex CLI auth** — `codex --version` confirms "Logged in using ChatGPT". MCP probe-timing is the only issue (not auth).
- **Zebra galaxy readiness** — soul + buildout brief + shared `engines/hermes-zebra/` already populated. One map-entry fix (`zebra→"hermes-zebra"`) shipped in c9fe03cf00.

## META artifact

The audit's re-runnable measurement is **`scripts/fleet-inefficiency-rescan.mjs`** (TBD — owner: papa or golf). It re-runs the 6 signal-capture commands listed in the P0 verification column + reports drift vs this baseline. Without it, this audit goes stale in 30 days (per `/forge-audit-v2` compounding-gains rule).

Suggested implementation: a single Node script that captures (a) `netstat 11434` PID list, (b) `claude mcp list` failed-count, (c) `outcome-bus.jsonl` size, (d) tribal quarantine count, (e) BUILD_STATE needs_wiring count, (f) ollama-offload-dashboard skip-rate. Emits JSON to `state/shared/fleet-inefficiency-rescan-<date>.json`.

## CLAUDE.md back-flow

This audit ships with one `## Recent regressions` line in CLAUDE.md (per `/forge-audit-v2` Boris-discipline rule):

`2026-05-28 | fleet-wide inefficiency audit shipped (6 P0 + 9 P1 + 7 P2) — see state/shared/specs/FLEET-INEFFICIENCY-AUDIT-2026-05-28.md | observed-by: slot:alpha a198ff5f`

## Decision points for operator

1. **Multi-Ollama (P0-1)**: kill native or kill container? Native has qwen2.5-coder:3b pinned 24h; container has its own model store. Recommendation: kill container (less moving parts, lower memory). Stop with `docker stop prism-ollama`.
2. **5 failed MCPs (P0-6)**: invest 30 min × 5 = ~2.5 hours to repair, OR remove from settings.json? Some (shadcn, github) may not be needed for fleet launch.
3. **Settings.json 200-line cap (P2-7)**: golf is the only slot with CLAUDE.md write privileges. Authorize golf to perform the promotion or defer?
4. **NIM chat-model (P1-5)**: 1-hour docker-compose change worth doing now or post-launch?
