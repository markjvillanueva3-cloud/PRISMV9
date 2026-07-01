---
name: reference_golf_skills_hooks_audit_2026_06_12
description: Golf 2026-06-12 audit — skills keep/disable determination + high-ROI hook design + 18 X-article synthesis; 3 specs + multi-tree archive gotcha
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.599Z
aliases: reference_golf_skills_hooks_audit_2026_06_12
---


**Golf skills+hooks audit (2026-06-12, slot:golf `/checkin-golf /loop /goal`).** Source: ultracode Workflow `wf_0a66e9c5-cd3` (5 ground + 2 synth agents; the 5 ground agents 429'd — Anthropic-side rate limit from spawning into a 31-loop fleet — but the 2 synth agents self-grounded and delivered). Golf verified all load-bearing claims before writing.

**3 durable specs** at `H:/prism/state/shared/specs/` (committed slot/golf `65717b1e6e` / U-GSHA-SPECS):
- `GOLF-SKILLS-AUDIT-2026-06-12.md` — 30 disable candidates (tiered: SECURITY_RISK `capture-claude-credentials`; EXTERNAL_TOOL_STUB `claude-flow-{help,memory,swarm}`/`iterate-retrieve`/`octopus`; EMPTY_STUB `advisor-strategy`/`discover-tango`; SUPERSEDED_BY_CHECKIN_LOOP `session-cycle`/`continue-roadmap`/`forge-supervised`; +slot-specific one-shots, planning artifacts). Keep ~345 (158 NATO wrappers = 46%, doctrine-mandated).
- `GOLF-HIGH-ROI-HOOKS-2026-06-12.md` — 5 hooks + 3 stop-combos, deduped vs HIGH-ROI-HOOKS-MS0 (delta 2026-05-18 built build-cache-guard/mcp-readonly-cache/tsc-error-dedup — no overlap). Merged build order.
- `GOLF-X-ARTICLE-SYNTHESIS-2026-06-12.md` — 18-article corpus (`state/shared/articles/`: addy-osmani-loop-engineering, anthropic-harness-dynamic-workflows, cyrilxbt-obsidian-hermes, hermes-self-learning-loop, mikenevermiss-overnight-workflows).

**Scope (corrected — workflow ledger said C:=0, WRONG):** C: user-global=**386**, H: main project=**742**, golf worktree=**375**, plugin/container SKILL.md=**~326**. Telemetry is NULL (U-SKU04 never landed) → keep/disable used structural proxies only.

**Wired-hook state golf-verified (grep H:/.claude/settings.json):** 290 hooks (Stop 75, UPS 61, PreToolUse 56, SessionStart 57). `ollama-context-aggregator.mjs` wired **0×** (dormant; only covers 3 routers), `meta-learning-inject.mjs` **0×**. `buildCachedSystem` IS wired to `prism_dev:pc_build_cached_system` (devDispatcher.ts:3966) but live UPS injectors don't CALL it → #1 ACTIVATION opportunity ("gap is utilization, not capacity").

**⚠ MULTI-TREE ARCHIVE GOTCHA (the key durable finding):** `scripts/extract-skill-triggers.mjs` builds `_skill-triggers.jsonl` (per-UPS injection source) from the UNION of `C:/Users/wompu/.claude/commands` + `H:/.claude/commands` + `C:/Users/Mark Villanueva/.claude/commands` + project `.claude/commands`. ⇒ **archiving a skill in only ONE tree is COSMETIC — zero token savings until removed from EVERY tree, then regen.** A Bash `mv` does NOT trigger c-to-h-mirror (Edit/Write-only), so C: and H:/.claude must be moved explicitly. Archive = a deliberate multi-tree pass, never a loop side-effect. → see [[feedback_never_delete_only_disable]].

**⚠ R7 conflict:** article-agent recommended re-enabling `PRISM Hermes-Obsidian Bridge` task — but it is DELIBERATELY frozen (`fth-freeze.json` expectedDisabled). Do NOT re-enable until operator lifts the freeze.

**EXECUTION (iter4-6, same day, commits b875dd9791 / eac1dd1afc / f6262025bf on slot/golf):** moved from determination -> execution.
- **`scripts/prism-skill-curator.mjs` (15 tests)** — the never-delete multi-tree skill-lifecycle curator (the X-corpus Curator daemon; confirmed genuine build gap). Modes: dry-run(default)/`--apply`/`--manifest`/`--age-scan`/`--self-test`. Guarded-tree (main, slot/golf can't write) -> integrator manifest, never silent-skip. `regenAndVerify` targets CANONICAL_ROOT=H:/prism (the jsonl the live skill-auto-trigger.mjs reads) + DEFERS regen while a guarded copy remains (no false-clean). KEEP-class refuse-list + path-traversal name guard.
- **⚠ SAVINGS CORRECTED (R12, MEASURED):** the spec's "~2.4k tokens/prompt" was WRONG. Direct count vs canonical `_skill-triggers.jsonl` (514 rows): only **2 of 30** candidates carry trigger rows (`sync-terminals`=3, `frontend-merge-plan`=8 = **11/514, ~2%**); the other 28 are below the extractor MIN_SCORE floor => **0 per-prompt tokens**. The skills-archive is a HYGIENE/security win (esp. `capture-claude-credentials`), NOT a per-prompt token lever. All 30 have a guarded main-tree copy -> complete archive = `GOLF-SKILLS-CURATOR-INTEGRATOR-MANIFEST.json` (36 moves/3 trees), one atomic integrator pass. NO cosmetic ship.
- **`.claude/hooks/agent-fanout-pressure-gate.mjs` (12 tests) BUILT+WIRED LIVE** — PreToolUse Agent+Workflow advisory gate (warn default / strict / off). The MISSING admission arm: `subagent-model-enforce` denies the model-tier leak, `agent-vs-direct` advises direct-tool, but neither catches the BURST-into-hot-fleet pattern that 429'd THIS session twice (4 sonnet review agents). Two cheap signals: per-session burst ring + per-spawn cost (tier x KB / Workflow concurrency). FAIL-OPEN incl. top-level catch (fires on every spawn x26 slots). Wired in C: settings.json (Agent block first + new Workflow matcher) -> mirrored to H:. Hook file LIVE at main-tree path via cp; tracked in slot/golf; main-tree tracking blocked by git-add-lane-guard (integrator/MAIN-FORCE step pending). Validates [[feedback_agent_fanout_gate_on_fleet_load]]. Knobs: PRISM_AGENT_FANOUT_{GATE,BURST,WINDOW_MS,COST_CAP,FORCE}.
- **Remaining build order (queued for future iters, from GOLF-HIGH-ROI-HOOKS spec):** A1 route UPS static-doctrine injectors through `buildCachedSystem()` (biggest per-turn win, M); A2 `/loop` cmdTick eval-gate (accuracy); #4 PreToolUse:Read large-RE-Read digest blocker (S, best ROI/effort); #3+COMBO-A stop-self-learning-loop-closer (L).

Related prior golf work: [[reference_golf_self_repair_harness_plan_2026_06_09]] (agentic-harness assessment), [[reference_golf_inventory_of_record_2026_06_11]]. HRH-MS0 law: "only a PreToolUse blocker NET-saves tokens (prevents output reaching context)."
