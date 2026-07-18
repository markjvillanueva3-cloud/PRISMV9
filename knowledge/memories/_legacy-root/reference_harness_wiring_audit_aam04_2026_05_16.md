---
name: reference-harness-wiring-audit-aam04-2026-05-16
description: AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM04 — harness wiring auditor catches Gap-3-revert + precompact-unwired bug class proactively
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.416Z
aliases: reference_harness_wiring_audit_aam04_2026_05_16
---


Shipped 2026-05-16 by slot bravo (claude-549c9f4f, operator-requested "kilo" 4× → first-free fallback) — commits `76a24cc38` (mine: 2 hook test files) + `070739ef1` (peer claude-6d0595bf BACKEND-DEVTOOLS-HVA-ITER38, absorbed my `scripts/harness-wiring-audit.mjs` + `state/shared/HOOK_WIRING_AUDIT.{json,md}`). 9th shared-tree absorption this session-cluster. Plus `.claude/commands/wiring-audit.md` live on disk (gitignored per existing skill convention).

**The bug class this catches** (observed in same session-cluster):
1. **Gap 3 silent-revert** — `session-start-auto-resume.mjs` had Gap-3 functions reverted by a peer/linter; the file looked correct but the wiring it depended on was rolled back. Took manual grep to find.
2. **precompact-release-slot.mjs unwired-despite-claim** — file on disk 18+ hours; prior session's handoff said "wired in settings.json"; reality was 0 references in either C: or H: settings.json. Took grep to find.

**Live audit on the real codebase right now: 549 hooks on disk · 199 wired (108 settings + 90 bundle) · 364 orphans (66.1%) · 14 dangling refs · C:↔H: mirror byte-equal.** Severity = 🟡 WARN. The 14 dangling refs are existing bugs waiting to bite — settings.json points to files that don't exist on disk. Future operator triage priority.

**Pure-function architecture** (every helper exported for plain `node:assert` testing — `node --test` runner still silent-exits on this Windows env per [[reference_autocompact_autonomous_aam01_gap3_aam02_2026_05_16]]):
- `findHooksOnDisk(root)` — walks `.claude/hooks/**.mjs`; excludes `__tests__/`, `helpers/`, `_smoke-*` prefix
- `parseSettingsWiring(text)` — regex `/\.claude[\\/]+hooks[\\/]+([\w./\\-]+\.mjs)/g` (Windows JSON-escape `\\` tolerated via `+` quantifier on the slash class) extracts hook basenames from settings.json content. **Real bug caught by tests pre-commit:** original `[\\/]` (no `+`) failed on JSON-escaped `\\hooks` double-backslash form. Fixed in code, NOT weakened in tests.
- `parseBundleChildren(bundleDir)` — walks `bundles/*.mjs` source, captures all referenced `.mjs` basenames as bundle-wired. **Closes the 2026-05-14 bundle-blindness regression** (high-value-additions-rank.mjs v1 overstated orphan rate by 12.7pp because it ignored bundle children).
- `computeAudit(input)` — pure, returns `{schemaVersion, generatedAtIso, hooksOnDisk, hooksWired, wiredViaSettings, wiredViaBundle, orphans, dangling, mirrorDrift, severity}` with sorted orphan/dangling lists for stable diffs. Severity ladder: `critical` on C:↔H: byte-inequal, `warn` on orphan rate ≥30% OR dangling ≥1, else `ok`.
- `formatMarkdown(audit)` — top-20 orphan digest + overflow note, mirror-drift triage step pointing at `scripts/mirror-c-to-h-audit.mjs`.

**Wiring** (the META-point — the auditor catches its own class of bug, including the Gap 3 revert pattern that motivated this whole session):
- `.claude/hooks/stop-wiring-audit-suggest.mjs` T3 advisory wired at C:+H: `Stop[8]` (after `post-ship-distill`, in the Stop advisory cluster per [[reference_stop_advisory_wiring_cluster_2026_05_15]]). 2000ms timeout. 4h stamp throttle. Fail-soft (never blocks Stop). Reads cached `HOOK_WIRING_AUDIT.json` (<24h fresh); emits 1-line additionalContext when severity != ok.
- `/wiring-audit` skill on disk + registered in skill index immediately post-Write (verified in session skill listing — appeared next to `/wire-unwired`).
- c-to-h-mirror replicated to H: byte-identical (mirror itself verified working via the audit's own `mirrorBytes.equal:true` check — recursive self-validation).

**Knobs:**
- `PRISM_WIRING_AUDIT_SUGGEST_DISABLE=1` — silence the Stop hook entirely
- `PRISM_WIRING_AUDIT_SUGGEST_VERBOSE=1` — emit even on severity==ok (operator wants to see counts every Stop)
- `PRISM_WIRING_AUDIT_SUGGEST_THROTTLE_MS=N` — override the 4h throttle
- `--severity fail` — CI mode: exit 2 on critical, 1 on warn (default exits 1 on warn-or-critical)

**Tests:** `_smoke-wiring-audit.mjs` 24/24 PASS — covers happy + 3+ failure modes + adversarial (empty/null/non-string/nonexistent paths) + variability floor (5 cases for `findHooksOnDisk`, 5 for `parseSettingsWiring`, 3 for `parseBundleChildren`, 7 for `computeAudit`, 4 for `formatMarkdown`).

**Pipeline integration patterns for future sessions:**
- `/checkin` can run `node H:/prism/scripts/harness-wiring-audit.mjs --quiet` silently as part of §6 and surface the one-line summary alongside `build_state` and `local_compute`.
- Cron candidate: every 6h regen → keeps Stop hook's cached report fresh.
- `/precompact` + `/handoff` skills should fire the audit before write so post-/compact chats inherit a fresh signal.

**Compound effect on the autonomous /compact loop**: this auditor closes the verification gap in the 7-step continuation chain. The chain's load-bearing assumption is that hooks are wired; the auditor makes that assumption *testable*. Combined with [[reference_autocompact_autonomous_aam01_gap3_aam02_2026_05_16]]'s shipped 7-step chain, the loop is now self-verifying: any silent revert OR mirror drift OR dangling ref surfaces at the next Stop within 4 hours.

**Honest scope note (Karpathy R12):** I did not BUILD the deferred Path C from prior session (slot-signature per file). That's still pending — separate unit `U-AAM03-SLOT-SIGNATURE`. The wiring auditor catches a strictly different bug class (silent wiring drift) than slot-signature (cross-slot edit prevention). Both have value; this one had immediate observability ROI.

Sister: [[reference_autocompact_autonomous_aam01_gap3_aam02_2026_05_16]] · [[reference_stop_advisory_wiring_cluster_2026_05_15]] · [[reference_session_continuity_stack_2026_05_15]].


## Related
[[skills/harness-wiring-audit|/harness-wiring-audit]] • [[skills/shared|/shared]] • [[skills/commands|/commands]] • [[skills/wiring-audit|/wiring-audit]] • [[skills/linter|/linter]] • [[skills/hooks|/hooks]] • [[skills/g|/g]] • [[skills/dangling|/dangling]] • [[skills/mirror-c-to-h-audit|/mirror-c-to-h-audit]] • [[skills/stop-wiring-audit-suggest|/stop-wiring-audit-suggest]]