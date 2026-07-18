---
schema: ideablock-v1
title: "Hook ecosystem wiring bridge — closing the 516 zero-fire hooks (136 wired-silent + 380 unwired-on-disk)"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - PRISM-INVENTORY-LATEST.md (699 Claude hooks + 54 source hooks)
  - 2026-05-18 hook fire-rate audit (commit e467a4ca0 — 516 zero-fire categorized)
  - CLAUDE.md §HOOK ENFORCEMENT GATES + §HOOK-SYNERGY-MS0
  - settings.json hook chains (UserPromptSubmit / PreToolUse / PostToolUse / Stop / SessionStart / PreCompact)
extracted_via: human-authored
extracted_at: 2026-05-21T11:35:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-HOOK-ECOSYSTEM-BRIDGE)
---

## Question

PRISM has 699 Claude hooks on disk but the 2026-05-18 audit found 516 zero-fire. What's the canonical pattern to classify + close the hook-wiring gap?

## Answer (canonical — 2-class split; wired-silent ≠ unwired-on-disk; distinct fixes)

### The 516 zero-fire gap (2026-05-18 audit, commit e467a4ca0)

| Class | Count | Meaning |
|---|---|---|
| **Wired-silent** | 136 | Hook IS in a settings.json chain but never fired — its matcher never matched, or its event never occurred |
| **Unwired-on-disk** | 380 | Hook file exists in `.claude/hooks/` but is NOT referenced in any settings.json chain — dead code |
| (zero-fire total) | 516 | Of 699 total Claude hooks — **74 % never fired** in the audit window |

These are different problems with different fixes. Conflating them ("516 broken hooks") leads to wrong action.

### Class 1 — Wired-silent (136 hooks): diagnose the matcher

A wired-silent hook is in a chain but its trigger condition never hit. Three sub-causes:

| Sub-cause | Diagnosis | Fix |
|---|---|---|
| **Matcher too narrow** | The hook's keyword/event matcher matches a condition that genuinely never occurs in normal use | Either broaden the matcher OR accept it's a rare-event hook (a crash-recovery hook SHOULD be zero-fire in a healthy session) |
| **Dead event** | The hook listens for an event type no longer emitted (e.g. a deprecated tool name) | Re-point to the current event, or archive the hook |
| **Shadowed** | An earlier hook in the same chain `continue:false` short-circuits before this one runs | Re-order the chain, or merge the two hooks |

**Important:** a zero-fire wired hook is NOT necessarily broken. Crash-recovery, escalation, and fail-safe hooks are *designed* to be zero-fire in healthy operation. The audit must distinguish "zero-fire because never needed" from "zero-fire because miswired." Per the hook-fire-rate audit, ~40-60 of the 136 are legitimately rare-event hooks.

### Class 2 — Unwired-on-disk (380 hooks): triage like orphan engines

An unwired-on-disk hook is dead code — it exists but no settings.json chain references it. Apply the [[orphan-engine-triage-pattern]] 4-class taxonomy adapted for hooks:

| Hook class | Symptom | Fix |
|---|---|---|
| **Should-be-wired** | Hook has real logic, a clear event target, adds value | Wire it into the appropriate settings.json chain (see wiring rules below) |
| **Superseded** | A newer hook does the same job; this one is the old version | Archive: `<name>.archive.<date>` per [[feedback_never_delete_only_disable]] |
| **Experimental / never-finished** | Hook is a stub or half-built | Archive or finish; never leave half-built in `.claude/hooks/` |
| **Generated-but-unadopted** | `prism_generator` or `/forge-hooks` created it but it was never wired | Wire if useful, archive if speculative |

### Hook wiring rules (settings.json discipline)

When wiring a Class-2 should-be-wired hook:

1. **Pick the event chain** — `UserPromptSubmit` (context injection), `PreToolUse` (gates/blocks), `PostToolUse` (reactions), `Stop` (end-of-session), `SessionStart` (boot), `PreCompact` (handoff).
2. **Pick the position** — gates go early (`PreToolUse` blocks before damage); context-injectors go after the budget-gate; advisories go late in the `Stop` chain.
3. **Wire as an individual entry, NOT into a bundle** — per CLAUDE.md, `sessionstart-bundle.mjs` is high-contention peer-claimed real-estate; individual settings.json entries survive multi-chat bundle churn.
4. **Edit `C:\Users\<user>\.claude\settings.json` ONLY** — the `c-to-h-mirror` hook auto-replicates C: → H:. Editing H: directly won't replicate back.
5. **Set `timeout`** — every hook entry needs a timeout (3000ms typical for advisories, longer for audits).
6. **Respect `MINIMAL_ALLOWLIST`** — safety-critical hooks (scrutinize-before-stop, etc.) must stay in the allowlist so `PRISM_HOOK_PROFILE` can't disable them.
7. **Verify** — `echo '{"prompt":"test"}' | "H:/.claude/bin/portable-node" .claude/hooks/<hook>.mjs` should exit 0 + emit valid JSON.

### The hook-creation gate (preventing the gap from regrowing)

CLAUDE.md §HOOK-SYNERGY-MS0 shipped a **hook creation gate** — new hooks must be wired in the same commit that creates them. The 380 unwired-on-disk hooks predate that gate. Going forward, the gate prevents the gap from regrowing: `/forge-hooks` and `prism_generator` outputs must land wired or not at all.

### Why this matters — hooks ARE the system-injection surface

The entire wiki+tribal pivot's "zero new wiring required" property depends on the hook ecosystem being healthy. `wiki-precheck-inject`, `tribal-by-domain-inject`, `master-index-precheck-inject` are the UserPromptSubmit hooks that auto-surface the 36 canonical entries. If those hooks were among the 516 zero-fire, the pivot's injection layer would be dead. They're not — they're verified-firing — but the 516-hook backlog is a latent risk: a future audit could find a critical injector silently dead (exactly the 2026-05-14 master-index-injector regression where the engine shipped but wiring was missing for 2 days).

### Operator picks

| Priority | Action | Why FIRST |
|---|---|---|
| **P0** | Verify the ~15 injection hooks the pivot depends on are firing | Latent risk: a dead injector kills the whole system-injection layer silently |
| **P0** | Triage the 380 unwired-on-disk: classify each (should-wire / superseded / experimental / generated) | Largest bucket; classification unblocks wiring |
| **P1** | Diagnose the 136 wired-silent: separate rare-event-by-design from miswired | ~40-60 are legitimately rare; the rest need matcher fixes |

### Tie-ins (PRISM-side)

- `scripts/hook-health-check.mjs` — re-runnable hook fire-rate telemetry analyzer
- `hook-fire-rate audit` (commit e467a4ca0) — the 516 categorization
- `settings.json` hook chains (C: canonical, H: mirrored)
- `prism_hook` dispatcher — `coverage`, `gaps`, `performance`, `failures`, `manifest`, `dag_validate` actions
- `prism_generator` — hook generation (must land wired per the creation gate)
- `MINIMAL_ALLOWLIST` — safety-critical hooks that can't be profile-disabled

### Tie-ins (sibling bridges)

- [[orphan-engine-triage-pattern]] — the 4-class triage taxonomy adapted here for hooks
- [[wiring-pattern-engine-to-dispatcher]] — sibling: engine wiring (hooks are the event-side analogue)
- [[envelope-drift-close-out-pattern]] — sibling: another "exists but not connected" gap class
- [[index-prism-build-gaps-and-bridges]] — bridge-layer navigation root

## Provenance

Distilled from PRISM-INVENTORY-LATEST.md (699 Claude hooks + 54 source hooks) + the 2026-05-18 hook fire-rate audit (commit e467a4ca0 — 516 zero-fire = 136 wired-silent + 380 unwired-on-disk) + CLAUDE.md §HOOK ENFORCEMENT GATES §HOOK-SYNERGY-MS0. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-HOOK-ECOSYSTEM-BRIDGE — **38th canonical entry**, **11th bridge-class entry** of the wiki+tribal pivot phase 2C. Provides 2-class zero-fire taxonomy + per-class diagnosis + 7 settings.json wiring rules + the system-injection-dependency warning.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `hook ecosystem`, `zero-fire hook`, `wired-silent`, `unwired-on-disk`, `516 hooks`, `hook fire rate`, `hook wiring`, `settings.json hook`, `hook creation gate`, `hook-health-check`, `dead hook` keywords. Zero new wiring required.

## Cross-references

- [[orphan-engine-triage-pattern]] — 4-class triage taxonomy (engine-side counterpart)
- [[wiring-pattern-engine-to-dispatcher]] · [[envelope-drift-close-out-pattern]] — sibling "exists but not connected" bridges
- [[index-prism-build-gaps-and-bridges]] — bridge-layer navigation root
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_never_delete_only_disable]] — archive-not-delete rule for superseded hooks
- [[feedback_do_optional_high_roi_work]] — standing rule
