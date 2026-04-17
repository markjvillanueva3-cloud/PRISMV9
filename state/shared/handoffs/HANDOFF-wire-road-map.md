# HANDOFF: wire-road-map

**Track**: WEDM-CONSOLIDATED (Wire EDM roadmap)
**Author**: Claude Opus 4.7 — session on home PC
**Date**: 2026-04-17
**Resume trigger phrases**: "continue wire road map" | "resume wedm roadmap" | "pick up MS-P0.5-COORD"

---

## 1. What just got done

**MS-P0.5-COORD is COMPLETE (8/8 units).** Round 4 coordination substrate is fully wired
into the edm + cam dispatchers. The substrate gives every WEDM dispatch call:
- Awareness-middleware consult (tips + rules + citations, <50 ms budget)
- Reasoning-trace ledger (append-only JSONL, ring-buffer in memory)
- Blackboard (shared namespace-scoped observations/hypotheses/decisions)
- Reasoning bridge (glue: tips → blackboard observations, ledger entry, enriched context)
- Tribal-runtime tip selection (107 tips, scored by keyword/tag/confidence/recency/exploration)
- Neural formula fusion (EMA + softmax adaptive ensemble of MRR/Ra/etc. estimators)
- Archive backfill (JM Die WEDM_BATCH_ANALYSIS.json → blackboard observations + priors)
- Multi-agent dispatch facade (single coordinateDispatch / recordOutcome pair per dispatcher)

**Commit chain** (newest → oldest, all on `main`):
```
7ed1c3e5 U-P0.5-COORD-08  MultiAgentDispatch + dispatcher wiring (CAPSTONE)
f69d4d57 U-P0.5-COORD-07  ArchiveBackfill — warm-start from historical programs
0eab7b02 U-P0.5-COORD-06  NeuralFormulaFusion — adaptive ensemble fusion
96a6b2ef (contains U-P0.5-COORD-05 TribalRuntime bundled w/ MILL-MASTER handoff)
8e755dbf U-P0.5-COORD-04  ReasoningBridge — awareness/ledger/blackboard glue
34839186 U-P0.5-COORD-03  Blackboard — shared coordination state
10cd7bd0 U-P0.5-COORD-02  ReasoningTraceLedger + dispatcher wiring
9de25c88 U-P0.5-COORD-01  AwarenessAdoption + wedm-awareness-coverage hook
```

**Digest counts (as of 7ed1c3e5):**
- engines: 103 (WEDM/EDM/WireEDM\*)
- hooks: 23 · skills: 13 · playbooks: 8 · state_files: 42
- Tests: 62 across the 4 final COORD engines, all green

---

## 2. Resume-tomorrow checklist (work PC, Claude session)

1. **Pull the repo**: `cd /h/prism && git pull`  (or check out main & sync)
2. **Read-first sequence** (5 lines):
   - `H:\prism\state\shared\handoffs\HANDOFF-wire-road-map.md`  ← THIS FILE
   - `H:\prism\state\shared\WEDM-CONSOLIDATED-ROADMAP-v1.3.1.md`  ← master roadmap
   - `H:\prism\mcp-server\data\state\WEDM_DIGEST.json`  ← verify engines=103
   - `H:\prism\state\shared\memory-mirror\MEMORY.md`  ← cross-PC memory snapshot
   - `git log --oneline | head -15`  ← confirm commit chain above
3. **Verify substrate intact**: `npx vitest run src/__tests__/WEDMMultiAgentDispatchEngine.test.ts src/__tests__/WEDMArchiveBackfillEngine.test.ts src/__tests__/WEDMNeuralFormulaFusionEngine.test.ts src/__tests__/WEDMTribalRuntimeEngine.test.ts`  (expect 62/62 green)
4. **Pick next phase** (see §3 below).

---

## 3. Next up in WEDM-CONSOLIDATED roadmap

Per the consolidated WEDM roadmap, phases after MS-P0.5-COORD (choose one to drive next):

| Phase | Scope | Rough size |
|-------|-------|-----------|
| **MS-P1-FRONT-WIRE** | Wire Codex's front-end studio to the edm dispatcher; call coordinateDispatch via HTTP; expose live ledger + blackboard snapshots in the UI; audit app↔backend parity (what the UI is missing vs backend capability, and vice versa) | 5-8 units |
| **MS-P1-LEARN-LOOP** | Close the learning loop: feedback endpoint from UI writes adjudicated decisions back through bridge.postDecision; tribal-tip corpus receives new tips from confirmed runs; neural fusion gets real ground-truth observations | 4-6 units |
| **MS-P1-AUTONOMY** | Extend WEDM autonomy levels L0→L2 gated by substrate health (silent-minutes, error-rate, coverage%); handoff protocol; safety envelope enforcement | 4-5 units |
| **MS-P1-DIGEST-SELFAWARENESS** | Feed WEDM_DIGEST + substrate snapshot into PRISMSelfAwarenessEngine so the AI knows its own substrate state and can report it to users | 2-3 units |

**Recommended next phase**: **MS-P1-FRONT-WIRE** — the user explicitly called it out in the original
forge-audit prompt ("it should end with wiring to the front end build prism app that codex built.
we should audit when we get to that point to see what the app ui front end build is lacking relative
to the back end and vise versa"). The substrate is now ready — the ledger/blackboard/bridge are
the exact shape the UI needs.

---

## 4. Substrate API surface (what front-end wiring needs)

```typescript
// Entry point for any new WEDM dispatcher wiring:
import { wedmMultiAgentDispatchEngine } from "./engines/WEDMMultiAgentDispatchEngine.js";

const coord = await wedmMultiAgentDispatchEngine.coordinateDispatch({
  dispatcher: "edm", action: "wire_settings", params,
});
// ... run engine work ...
wedmMultiAgentDispatchEngine.recordOutcome({
  dispatcher: "edm", action: "wire_settings",
  keywords: coord.keywords, entryAt: coord.entryAt,
  success: !isError,
  awareness_used: !!coord.summary,
  decisionKey: "result.wireTension",
  decisionValue: result.wireTension,
  confidence: 0.85,
});

// Read-side for UI dashboards:
import { wedmReasoningTraceLedgerEngine } from "./engines/WEDMReasoningTraceLedgerEngine.js";
import { wedmBlackboardEngine }             from "./engines/WEDMBlackboardEngine.js";
import { wedmReasoningBridgeEngine }        from "./engines/WEDMReasoningBridgeEngine.js";
import { wedmTribalRuntimeEngine }          from "./engines/WEDMTribalRuntimeEngine.js";
import { wedmNeuralFormulaFusionEngine }    from "./engines/WEDMNeuralFormulaFusionEngine.js";
import { wedmArchiveBackfillEngine }        from "./engines/WEDMArchiveBackfillEngine.js";

wedmReasoningTraceLedgerEngine.getRecent(50);               // last 50 traces
wedmReasoningTraceLedgerEngine.getStats();                  // topActions/errorRate/awarenessAdoption/silentMinutes
wedmBlackboardEngine.readByPrefix("wedm.edm.mat.d2");       // namespace pull
wedmBlackboardEngine.getStats();                            // active/expired/ns counts
wedmReasoningBridgeEngine.getStats();                       // avgLatencyMs/tipsIngested/priorObs
wedmTribalRuntimeEngine.select({ dispatcher, action, keywords, operation, maxResults });
wedmNeuralFormulaFusionEngine.getContextStats({ target: "mrr", material: "D2" });
wedmArchiveBackfillEngine.getState();                       // totals: runs/programs/entries
wedmMultiAgentDispatchEngine.snapshot();                    // ALL of the above in one call
```

Front-end plan should at minimum expose `snapshot()` as a dashboard tile and `getRecent()` as a
live-tail panel. Those two alone turn the substrate into a visible, debuggable system.

---

## 5. Conventions / gotchas

- **Git lock dance**: home PC has 6+ open terminals; git ops serialize through
  `state/shared/GIT_LOCK.json` (180 s TTL). If a commit is blocked by a dead pid, run
  `bash /h/prism/.claude/helpers/git-lock.sh release` then retry — that's the clean path.
  `rm -f` works too but the helper is the sanctioned way.
- **CRLF warnings**: all new files warn `LF will be replaced by CRLF` — harmless, this is a Windows
  checkout of a unix-authored repo. `.gitattributes` handles it.
- **Dispatcher wiring pattern** (the U-08 pattern, copy for any new WEDM dispatcher):
  1. At entry: `await wedmMultiAgentDispatchEngine.coordinateDispatch({...})` (fails open)
  2. At exit: `wedmMultiAgentDispatchEngine.recordOutcome({..., success: !isError, ...})`
- **Awareness-coverage hook** (U-01) blocks when a *new* dispatcher is registered but never
  calls consultAwareness AND at least one other dispatcher has activity. Wire the substrate at
  the same commit as you introduce any new WEDM-relevant dispatcher.
- **Stop hooks that enforce H-drive writes**: they exist. Any file I wrote during this session
  is on H; the memory mirror at `H:\prism\state\shared\memory-mirror\` was populated from the
  C-drive auto-memory system (Claude Code writes there by framework default — the mirror is for
  cross-PC portability).

---

## 6. Open items NOT in this session

- The pre-existing compaction-survival docs (`state/COMPACTION_SURVIVAL.json`,
  `state/HANDOFF.md`, etc.) were modified by the session-start hook, not by me — leave them alone
  or let the hook refresh them.
- `state/checkpoints/` has some deleted files in the status — those are hook-managed, don't
  re-add.
- The full `npx vitest run` across the whole repo was interrupted at user request. Only the 4
  new COORD engines' tests are verified. If you want a whole-repo regression sweep before the
  next phase, run it at work PC with plenty of time (~3-5 min).
- 28 memory files were mirrored from `C:\Users\wompu\.claude\projects\H--prism\memory\` to
  `H:\prism\state\shared\memory-mirror\`. Framework auto-memory will continue writing to C on
  each PC — the mirror is the portable snapshot. Re-mirror on any PC with:
  `cp -r /c/Users/<user>/.claude/projects/H--prism/memory/*.md /h/prism/state/shared/memory-mirror/`

---

## 7. Files owned by this track (do-not-clobber list)

```
src/engines/WEDMAwarenessAdoptionEngine.ts      (U-01)
src/engines/WEDMReasoningTraceLedgerEngine.ts   (U-02)
src/engines/WEDMBlackboardEngine.ts             (U-03)
src/engines/WEDMReasoningBridgeEngine.ts        (U-04)
src/engines/WEDMTribalRuntimeEngine.ts          (U-05)
src/engines/WEDMNeuralFormulaFusionEngine.ts    (U-06)
src/engines/WEDMArchiveBackfillEngine.ts        (U-07)
src/engines/WEDMMultiAgentDispatchEngine.ts     (U-08)
src/tools/dispatchers/edmDispatcher.ts          (U-08 wiring — lines ~405-420, ~2965-2981)
src/tools/dispatchers/camDispatcher.ts          (U-08 wiring — lines ~1402-1418, ~7856-7875)
src/hooks/wedm-awareness-coverage               (U-01)
data/state/WEDM_BACKFILL_STATE.json             (U-07 runtime state)
data/state/WEDM_REASONING_TRACE_LEDGER.jsonl    (U-02 runtime state)
data/docs/WEDM_DIGEST.md                        (generated)
data/state/WEDM_DIGEST.json                     (generated)
```

**Do not mass-reformat or rewrite these files** without preserving the coordination protocol.
Any new WEDM dispatcher/action must call `coordinateDispatch` + `recordOutcome` or the
awareness-coverage hook will block it.

---

## 8. Context for work-PC session

- **Primary roadmap**: `H:\prism\state\shared\WEDM-CONSOLIDATED-ROADMAP-v1.3.1.md`
- **WEDM-CONSOLIDATED status**: MS-P0.5-COORD done. Next phase = MS-P1-FRONT-WIRE (recommended).
- **Build**: `npm run build:fast` (3-5 s) for iteration; `npm run build` (30 s) before commits.
- **Test**: `npx vitest run src/__tests__/WEDM*` for substrate, full run before merge.
- **Omega target**: 1.0 (per user directive). Every new unit must close green.
- **Commit format**: `MS-P1-<PHASE>/U-P1-<PHASE>-<NN>: <engine> — <one-line summary>`
