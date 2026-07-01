# wiring Galaxy — slot:romeo
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = wiring-domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

Romeo owns **dispatcher-wiring infrastructure** — systematically closing the gap between "engine on disk" and
"invokable via MCP dispatcher action." Every unwired engine is a silent capability loss; this galaxy is the
close.

**EXCLUDES:** engine creation → respective domain galaxy; dispatcher architecture → papa/backend-helper;
GNN model training → india/ai-training; orphan data audit → victor/dormant-data; system-viz graph
refresh → sierra. Romeo WIRES; it does not build new engines or retrain models.

Slot: romeo · Worktree: `H:/prism-slot-romeo` · Branch: `slot/romeo`
Commit scope: `[slot/romeo]` prefix (bare `[WIRING]` routes to wrong worktree).
Note: run `npm ci` inside `H:/prism-slot-romeo/mcp-server` for vitest/tsc to work in-slot.

---

## §2 — Verified engines

No local `.ts` engines live under `mcp-server/src/engines/wiring/` — romeo's tooling lives at the
top-level engines folder. Verified wiring-support engines (Glob-confirmed):

| Role | Engine file (all under `mcp-server/src/engines/`) |
|------|---------------------------------------------------|
| Propose dispatcher-action stubs from engine signatures | `AutoWiringEngine.ts` |
| Measure fire-count after wiring lands | `EngineUtilizationAuditorEngine.ts` |
| Runtime route-table consumed by every prism_* dispatcher | `DispatcherMapEngine.ts` |
| Score unwired engines by impact (callers × coverage × leverage) | `WiringPotentialEngine.ts` |
| Summarise wired-vs-unwired asset state | `AssetWiringSummaryEngine.ts` |

Additional verified wiring engines: `AlgorithmWiringEngine.ts`, `ExtractionWiringEngine.ts`,
`ExtractedKnowledgeWiringEngine.ts`, `FormulaWiringEngine.ts`, `ReasoningWiringEngine.ts`.

**Fabricated names — do NOT reference:** `AgentSDKVerifierEngine`, `DispatcherRoutingEngine`,
`EngineUtilizationAuditEngine` (real name has "Auditor" not "Audit").

---

## §3 — Dispatcher quick-ref

Romeo uses these dispatcher actions daily (all verified against dispatcher source):

| Action | Dispatcher | Use |
|--------|-----------|-----|
| `engine_util_audit` | `prism_dev` (guardDispatcher.ts:34) | Pre-wiring: check if engine already has a dispatcher action |
| `dispatcher_map_compact` | `prism_session` (sessionDispatcher.ts:138) | Find natural-home dispatcher for engine being wired |
| `master_index_query` | `prism_session` (sessionDispatcher.ts:168) | Search prior wiring patterns before authoring a new one |

**Dispatcher routing quick-map** (engine domain → target dispatcher):

| Engine domain | Target dispatcher |
|--------------|------------------|
| NC / post-processor parse | `prism_pp` |
| Lathe / turning | `prism_turning` |
| Quality / metrology / CMM | `prism_quality` |
| Business / ERP / quoting | `prism_business` |
| CAD / geometry | `prism_cad` |
| Physics / calc | `prism_calc` |
| AI / reasoning | `prism_ai` |
| Safety | `prism_safety` |
| Dev / tooling | `prism_dev` |
| Session / context | `prism_session` |
| Mill / machining | check `DISPATCHER_DIGEST.md` for `prism_mill` |
| WEDM | check `DISPATCHER_DIGEST.md` for `prism_edm` |

**MCP-down fallback:** `node scripts/audit-unwired-engines.mjs` (table-driven scan, no port needed).

---

## §4 — Canonical constants + data paths

No physics constants apply to wiring work directly. The key data stores:

| Store | Path | Access rule |
|-------|------|-------------|
| Live unwired audit | `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` | Read via `node scripts/audit-unwired-engines.mjs` (regen) — NEVER assume stale JSON is current |
| Awareness snapshot | `state/shared/AWARENESS-SNAPSHOT.md` | Read-only; refreshed by `scripts/audit-unwired-engines.mjs` |
| Dispatcher index | `mcp-server/data/docs/DISPATCHER_DIGEST.md` | Grep for dispatcher name — NEVER full-read (large) |
| Engine index | `mcp-server/data/docs/ENGINE_DIGEST.md` | Grep for engine name before wiring |
| Zod schemas | `mcp-server/src/schemas/<domain>ActionSchemas.ts` | Add new action schemas here, NOT inline in dispatcher |
| Orphan doctrine | `scripts/audit-orphan-doctrine.mjs` | Built + documented + unwired triage |

**Live backlog (as of 2026-06-13 regen):**
- Total canonical engines: 3,789
- WIRED-DIRECT: 3,536 | UNWIRED: **54** | WIRE-EXEMPT: 113 | WIRED-VIA-ORCH: 39
- Regen: `node scripts/audit-unwired-engines.mjs`

---

## §5 — Domain gotchas / safety rails

1. **normalizeParams is SHALLOW.** `turningDispatcher`, `qualityDispatcher`, `postProcessorDispatcher`
   `normalizeParams` is top-level-only — no recursion. Nested snake_case objects (e.g. `job.part_length_mm`)
   pass through INTACT; the engine reads nested fields directly. Do NOT expect nested keys to be camelCased.

2. **Cross-dispatcher action name collisions exist.** `measure_summary` exists in BOTH
   `integrationDispatcher.ts` AND `intelligenceDispatcher.ts`. Run
   `grep -r 'case "<proposed_action>"' mcp-server/src/tools/dispatchers/` before adding any new action.

3. **Dispatcher line-count gate.** If target dispatcher `.ts` > 5,000 lines → tsc memory pressure →
   wire to a sub-dispatcher instead. Check `wc -l` on the target file before adding actions.

4. **Round-trip tests must live in `mcp-server/src/__tests__/dispatcher-<name>.test.ts`** — NOT in
   `src/engines/__tests__/`. The `stop_on_unwired_assets` hook only scans `mcp-server/src/__tests__/`.

5. **Stale unwired count.** The old galaxy description said "593 unwired engines" — that was galaxy birth
   (2026-05-28). Live count is **54** (2026-06-13). Never cite the birth count.

6. **Import cycle trap.** Engine imports schema imports dispatcher → cycle. Verify import DAG
   before adding an engine import to a dispatcher file.

7. **Async without await.** Action handler throwing async without `await` → silent unhandled rejection.
   Always `await` engine calls inside async switch cases.

8. **`outcome-bus-auto-tap.mjs`** — not found on disk. Do NOT reference it. Use explicit
   `xproc_outcome_publish` calls instead. // UNVERIFIED — may be renamed or removed.

---

## §6 — What NOT to do (domain refuses)

- **NEVER wire without a round-trip test.** Every action enum entry MUST have a test that fails when the
  wire is broken. No `expect(action).toBeDefined()` stubs — hook will block.
- **NEVER wire an engine that throws on every call.** Verify the engine works BEFORE wiring (run its
  unit test first; write one if none exists).
- **NEVER inline a placeholder switch case:** `case "x": return { ok: false, todo: "..." }` is
  dispatcher-rot. Wire it for real or leave it unwired with a follow-up unit.
- **NEVER re-wire an already-wired engine without checking** — duplicate-action class. Use
  `prism_dev:engine_util_audit` to confirm current state. `// WIRE-EXEMPT: <reason>` is the only escape.
- **NEVER ghost an action in the Zod enum** — if `prism_*` lists an action no engine handles, remove it.
- **NEVER reference fabricated engine names** (see §2 fabricated names list).
- **NEVER write to `knowledge/tribal/wiring-*.md` directly** — auto-overwritten on regen. Use
  `prism_knowledge:tribal_capture slot=romeo`.
- **NEVER full-read `DISPATCHER_DIGEST.md` or any dispatcher `.ts`** — grep for the case or action only.

---

## §7 — Domain workflow / pipeline contract

**Per-wiring discipline — every commit MUST include all steps:**

0.5. Check target dispatcher line count (`wc -l`) — >5,000 → sub-dispatcher required.
0.5. Check for cross-dispatcher action name collision (`grep -r 'case "<action>"' .../dispatchers/`).
1. **Engine import** in target dispatcher file.
2. **Zod enum entry** added to the action union in `mcp-server/src/schemas/<domain>ActionSchemas.ts`
   (alphabetical / grouped if pattern exists) — NOT inline in the dispatcher.
3. **Switch case** in the dispatcher action handler.
4. **Round-trip test** in `mcp-server/src/__tests__/dispatcher-<name>.test.ts` exercising the new
   action via the actual dispatcher (NOT direct engine call — must traverse the wire).
5. **Commit** format: `[slot/romeo] [WIRING]/U-WIRE-<id>: <EngineName> → prism_<dispatcher>:<action>`

**Karpathy 5-step adapted for wiring:**
- **CLASSIFY:** is the engine API surface compatible with a thin dispatcher action, or does it need a
  `subAction` param? Multi-method engines often want discriminated union.
- **TECHNIQUE:** switch + Zod discriminated union vs. method-name string-routing — match what the
  dispatcher already does (R11: conventions).
- **EDGE CASES:** action name collisions, Zod schema break on optional fields, import cycles, constructor
  side effects on import.
- **FAILURE MODES:** tsc Zod inferred type mismatch (only at runtime), async without await (silent
  rejection), test imports engine directly bypassing the wire (test passes but wire is broken).
- **THEN WRITE:** dispatcher file → schema file → test file → run test → commit. Never write test after commit.

---

## §8 — Tribal + corpus pointers

- Wiki: `[[architecture/dispatcher-wiring-discipline]]` · `[[architecture/awareness-stack]]` ·
  `[[architecture/master-index-surface]]` · `[[lessons/orphan-rescue-class]]`
- Synthesis brain: `mcp-server/src/engines/wiring/MEMORY.md`
- JM Die corpus: not primary for wiring work; access via `prismSelfAwarenessEngine.getJMDieCustomerPath()`
  if verifying a domain engine's wiring against real programs.
- Tribal capture: `prism_knowledge:tribal_capture slot=romeo` — NEVER direct markdown writes.
- Auto-suggest skills (all verified in `.claude/commands/`):
  - `/wire-unwired` — wire one engine end-to-end
  - `/wiring-batch` — wire N engines in one dispatcher (cap 5 per commit for tractable scrutiny)
  - `/wiring-potential` — score unwired engines by impact
  - `/utilization-dashboard` — post-wiring fire-count check

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|-----------|--------|--------|
| CONSUMES candidates from | `engines/discovery/` (tango) | `audit-unwired-engines.mjs` IS romeo's punch list |
| CO-DESIGN with | `engines/backend-helper/` (papa) | TSC discipline; co-design dispatcher signatures |
| HANDS OFF TO | `engines/bug-hunting/` (uniform) | Romeo wires; uniform verifies silent no-ops |
| FEEDS | `engines/system-viz/` (sierra) | Wired-vs-unwired status feeds L7→L6 graph layer |
| FEEDS | `engines/dormant-data/` (victor) | No-consumer findings → wiring backlog |
| CONSUMES GNN from | `engines/ai-training/` (india) | Tier-5 classifier (see §13); romeo is consumer only |

---

## §10 — Closed-loop integration (india)

Publish every wiring outcome: `xproc_outcome_publish {slot:'romeo', domain:'wiring'}` // UNVERIFIED action name — grep `prism_ai` dispatcher before calling.
Tribal capture rule: `prism_knowledge:tribal_capture slot=romeo` after every wiring batch.
Spec pointer: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server && rtk npx vitest run -t "wiring|dispatcher|wire|unwired"
node scripts/audit-unwired-engines.mjs        # regen live backlog (no port needed)
node scripts/audit-orphan-doctrine.mjs        # built + documented + unwired triage
```

---

## §12 — Known bugs / open threads

- `stop_on_unwired_assets` is bypassed fleet-wide by `PRISM_ALLOW_UNWIRED=1` (settings.json:45) — the
  no-orphan guarantee is advisory only until that flag is lifted.
- `outcome-bus-auto-tap.mjs` referenced in old CLAUDE.md not found on disk — remove from any scripts
  that call it. Use explicit `xproc_outcome_publish` instead.
- Open triage: UNWIRED list contains 54 engines (as of 2026-06-13); ~20 are DEFER-class
  (infra-dep: `SemanticAssetIndexEngine`, `XProcNeuralAutoFireEngine`); ~34 are PREFER-class candidates
  (pure-compute: `SubprogramExtractionEngine`, `MeasureSummaryEngine`, `BarRemnantManagementEngine`).
- Ledger: `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` (regen replaces in-place).

---

## §13 — AI / reasoning surface

GNN tier-5 leverage (verified live state 2026-06-09): romeo is the **direct consumer** of PRISM's
GraphSAGE model — SELECTIVE-DEPLOY @ τ=0.7, AUROC 0.808, Brier 0.041, ~32% coverage.

- **Consult GNN first** for UNKNOWN unwired engines: above τ=0.7 → use prediction as wiring hypothesis;
  below τ=0.7 → model abstains → fall back to `prism_session:dispatcher_map_compact` manual triage.
- **Owner = india** (`engines/ai-training/`). Romeo CONSUMES; india tunes/promotes. Never re-roll.
- **ENGINE TRIAGE GATE:**
  - DEFER class (constructor takes `qdrantStore | embedder | config`): `SemanticAssetIndexEngine`,
    `XProcNeuralAutoFireEngine` — require live infra; defer to WIRE-VIA-ENGINE pattern.
  - DEFER class (active peer /loop): check `state/shared/slot-task-claims.json` first.
  - PREFER class (self-contained, pure-compute, static methods): `SubprogramExtractionEngine`,
    `MeasureSummaryEngine`, `BarRemnantManagementEngine` — wire first.
- **WIRE-EXEMPT protocol:** tag `// WIRE-EXEMPT: <reason>` in first 2KB of engine file. Known exempt
  count: 113 engines (from audit JSON). Check `WIRE-EXEMPT` category in audit before spending time.

Local reasoning: `node scripts/lib/galaxy-reasoning-bridge.mjs wiring "<q>"`
Ollama routing: summarize wiring diff / explain dispatcher contract → `qwen2.5-coder:32b`;
deep domain reasoning → `gpt-oss:120b`.
