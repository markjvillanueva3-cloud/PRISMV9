---
name: feedback-dont-wire-for-wiring-sake-2026-05-16
description: "User rule 2026-05-16 — don't wire orphan hooks just for the sake of wiring; obsolete/redundant/speculative hooks should stay UNWIRED"
aliases: feedback_dont_wire_for_wiring_sake_2026_05_16
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.422Z
---


# Don't wire just for the sake of wiring

**Rule (user, 2026-05-16):** "dont wire just for the sake of wiring, make sure wiring makes sense. if something is obsolete, we don't need it wired"

**Why:** I (claude-6d0595bf, slot delta) burned a YOLO session wiring 25 orphan hooks in batch mode without deep per-hook value verification. The list included several hooks that are obsolete, redundant with existing wired hooks, or speculative ("might be useful someday"). Wiring noise = runtime overhead + false-positive blocks + log spam + token waste on every event. The orphan-count metric is NOT a goal; it's a signal that needs interpretation.

**How to apply:** Before wiring ANY orphan hook, verify all of these:
1. **Not obsolete** — check CLAUDE.md "Recent regressions" for known-broken scripts the hook depends on (e.g., dispatcher-digest-regen depends on a known-broken parser per the 2026-05-14 regression entry — wiring it makes the regression fire MORE)
2. **Not already firing via another path** — `hook-health-check.mjs --window=24h` shows actual fire counts. If a hook is in the orphan list BUT shows events, it's wired indirectly (router, bundle, cron, manual smoke); duplicate wiring causes double-fire.
3. **Not redundant with already-wired hooks** — if 3 Stop cleanup hooks already exist ([[reference_fleet_reaper|fleet-reaper]]-stop + bash-orphan-cleaner + cleanup-orchestrator), a 4th general-cleanup hook is overhead.
4. **Hook output has a CONSUMER** — telemetry-only hooks (dev-outcome-tracker, compaction-survival-auto) write JSONL nobody reads = dead writes. Only wire if there's an actual dashboard / drain script / hook that consumes the output.
5. **Dependency live** — embed-vault-on-save needs Qdrant; if Qdrant is DOWN (check `ollama-docker-health.mjs`), the hook fires every Edit and embed-skips every time = pure overhead.
6. **Not auto-editing doctrine** — claudemd-section-update auto-edits CLAUDE.md, a peer-claim-heavy doctrine file. Auto-edits risk corrupting human-curated rules + race against other chats.
7. **Decision-making, not "might be useful"** — if you can't articulate ONE concrete user-visible benefit per turn the hook fires, don't wire it.

**Apply to today's 25-hook YOLO ship:**
Removed 5 hooks of dubious value: dispatcher-digest-regen (known-broken regen), bash-result-cache (already firing per hook-health-check), chat-cleanup-on-stop (4th cleanup in same neighborhood — redundant), claudemd-section-update (auto-edits doctrine — risky), embed-vault-on-save (Qdrant DOWN — pure overhead). Kept the 20 with clear value (user-documented symptoms, explicit user rules, pre-create gates, error-learn-loop completion, coordination discipline).

**Sister memories:**
- [[reference_hook_wiring_yolo_25_2026_05_16]] — the original 25-hook ship inventory (now amended to 20 keepers)
- [[reference_settings_wiring_drift_2026_05_16]] — always grep both settings.json after harness-config edits
- [[feedback_never_delete_only_disable]] — unwiring (removing settings.json entry) IS the disable mechanism; .mjs stays on disk
