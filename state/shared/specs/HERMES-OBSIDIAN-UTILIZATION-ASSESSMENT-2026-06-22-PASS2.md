# Hermes + Obsidian Utilization — DEEP ASSESSMENT PASS 2 (2026-06-22, slot:zulu)

> Supersedes the morning `HERMES-OBSIDIAN-UTILIZATION-ASSESSMENT-2026-06-22.md`. Method: 5 parallel
> Sonnet readers over the FULL corpus (30 Hermes specs + 35 Obsidian/vault specs + `hermes-shann-article.md`
> + the prior pass), reader 5 = LIVE-state verifier. Synthesized by zulu (Opus). Operator: *"I STILL feel
> like both are severely underutilized."* — and the data confirms it.

## THE ONE-LINE VERDICT
The operator is right. Both are severely underutilized — but **NOT because they're unbuilt. Because they
ship DARK.** Nearly every capability exists on disk and is then left **default-OFF / unregistered /
mock-by-default / extension-gated-to-no-op**. The fleet has spent months *building* and almost never
*arming*. The highest ROI is now ARM/WIRE, not new builds.

## LIVE-VERIFIED NUMBERS (reader 5, actual values — trust these)
- **Ollama offload = 22.2%** (327 offloaded / 1,470) — below the 30% target. `estimatedTokensSaved` 229,946.
- **`ollama-route-pretooluse` fired 7,679× and offloaded 0** — wired but a NO-OP (gated to `.log/.txt/.out`,
  passes every code/`.ts`/`.mjs` file straight to Claude). The single biggest dead token-economy lever.
- **`wiki-precheck-inject` = 0 refs in settings.json** — the WIKI leg of the PSN does not auto-inject. UNWIRED.
- **`prism_hermes` dispatcher = MOCK-by-default**, 8 actions (`hermes_status/probe/auth_status/cron_list/
  skill_list/routine_plan/model_list/run`). Live execution needs `PRISM_HERMES_MOCK=0` + `noMock:true`.
- **Obsidian read+write+reverse paths ARE wired + live** (`stop-obsidian-memory-feed` @Stop, `h-to-c-obsidian-mirror`
  @PostToolUse) — the capture/recall spine works. This is the healthy part.
- The **HermesAutonomousDriver** (built + live-proven THIS session) ships **default-OFF** → real autonomous
  execution is still **0** until armed (`PRISM_HERMES_AUTONOMOUS_DRIVE=1`).

## ⚠ R12 — UNRELIABLE FINDING (do not act without re-verify)
Reader 5's `Get-ScheduledTask` returned EMPTY for **all** "PRISM"/"Hermes" tasks — but `PRISM Fleet Reaper`
and `fleet-task-health` are observably firing in this session's Stop hooks. So the query was BROKEN (agent's
non-elevated/headless PS context), NOT proof the tasks are absent. The Hermes offline crons (Dream-Cycle /
Self-Reflect / Obsidian-Bridge) may genuinely be unregistered (consistent with prior specs), but
**re-verify with a working elevated query before claiming "the offline loop is dark."** (This is the same
"verify the live value, never infer from a symptom" lesson from this morning's false-P0s.)

## ROOT CAUSE (one systemic pattern, both substrates)
**Built-but-dark.** Capabilities are shipped behind a default-OFF gate / an unregistered scheduled task /
a mock-default bridge / a no-op extension filter. Cross-cut: the fleet trusts that the model or operator
will flip the switch; at scale nobody does (advisory take-rate ~0.8%, offload take-rate 16%). Utilization
is gated on ARMING, not building.

## RANKED ACTIONS — by leverage, split by who can do it

### TIER A — OPERATOR one-time arms (minutes each, highest ROI, I cannot do these)
1. **Connect Hermes ↔ PRISM MCP** — uncomment the `mcp_servers:` block in `%LOCALAPPDATA%/hermes/config.yaml`
   → point at `http://127.0.0.1:3100/mcp` + a filesystem-MCP at `H:/prism/knowledge`. This is THE unlock for
   Hermes-as-orchestrator: without it Hermes can call zero `prism_*` tools and read zero brain. Config-only,
   additive, ~5 min. (HERMES-MASTER-ORCHESTRATOR P0.)
2. **Register the Hermes offline crons** (re-verify first per the R12 note) — elevated
   `install-hermes-dream-cycle-task.ps1 -RunNow` + `install-hermes-self-reflect-task.ps1`. Lights up the
   compounding loop (the whole Hermes value prop) — IF they're truly unregistered.
3. **Durable Grok proxy** — elevated `install-hermes-proxy-task.ps1 -RunNow`. The one 99.8%-effective Hermes
   lane currently dies every session.
4. **Arm the driver** (when ready for real autonomous waves) — `PRISM_HERMES_AUTONOMOUS_DRIVE=1`.

### TIER B — CODE fixes a slot can do now (cheap, high-leverage, no operator gate)
5. **Fix `ollama-route-pretooluse` extension gate** → recover the 7,679 dead fires (offload 22%→~30%+).
   Widen the safe-offload category set beyond `.log/.txt/.out` with judgment (mechanical text ops only,
   never IP-sensitive code authoring). Owner: alpha. **The single biggest token win on the board.**
6. **Wire `wiki-precheck-inject`** into settings.json UserPromptSubmit → the wiki PSN leg auto-injects.
   Owner: alpha/sierra. Cheap.
7. **Fix `zulu-advisory-inject` phantom-critical (G37)** → route its pressure verdict through the
   authoritative per-turn `usage` (same fix class as this session's compact-phantom-byte-estimate bugs).
   It currently emits a byte-estimate "critical" that contradicts the real signal every turn. **In zulu's
   own domain — I can do this on your go.**
8. **`prism_hermes` live by default for read-only actions** — let `hermes_status/probe/model_list` run
   without `noMock` so the bridge isn't inert. Owner: bravo.

### TIER C — bigger builds (real engineering, pick by ROI)
9. **Brain-Refresh orchestrator** (Obsidian) — one script + Stop hook + scheduled task fanning out the 5
   existing refresh pipelines. Unblocks wiki re-embedding (doc-reported 82.9% of wiki unembedded → the brain
   can't semantically recall most of itself). Owner: alpha.
10. **Hybrid BM25+dense retrieval at the inject hot-path** + orphan-note heal (doc-reported 23.9% orphans).
    Owner: alpha/india. Re-verify the counts first.
11. **Hermes asset-bundle advisor** (`asset_bundle(task)` → optimal {tool,skill,memory,tribal,model,feature})
    + skill-auto-gen closed loop. Owner: bravo.
12. **PSN-RAG into the 4 Hermes decision stages** (currently 0/4 use RAG). Owner: bravo/india.

## DONE-SIGNAL
This assessment is "delivered." Utilization actually MOVES when: offload ratio crosses 30% (fix #5),
Hermes can call `prism_*` tools (#1), the offline crons show `lastResult=0` runs with sampled real output
(#2 + loop-output verification), and the driver is armed for at least one real goal (#4). Each is a
discrete, measurable arm/wire — not a research project.

## Linked
[[reference_hermes_obsidian_utilization_assessment_2026_06_22]] (pass 1) · [[reference_hermes_autonomous_driver_built_2026_06_22]] (driver, built this session) · [[feedback_verify_live_config_value_not_symptom]] (why the cron finding is flagged unreliable).
