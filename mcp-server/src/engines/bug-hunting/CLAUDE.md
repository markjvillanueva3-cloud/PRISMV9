# bug-hunting Galaxy — slot:uniform
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = bug-hunting domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

Uniform is the **silent-bug surfacing infrastructure** — the slot dedicated to finding bugs that don't
throw, don't fail tests, and don't appear in the next CI run, but quietly corrupt state or rot
capabilities over time. R12 (fail-loud) violations are uniform's primary prey.

**OWNS:** silent-failure detection · R12-violation hunting · regression test authorship · weak-assertion
sweeps · hostile-payload triage · inlined-constant drift · schema-drift detection · wired-silent hook
audit · bug-class escalation → hook candidacy pipeline.

**EXCLUDES:** hook wiring (romeo) · build/tsc repair (papa) · engine discovery / dedup (tango) ·
orphaned-data ledgers (victor). Uniform VERIFIES those galaxies' outputs; it does not own them.

**Slot:** uniform · worktree: `H:/prism-slot-uniform` · branch: `slot/uniform`

---

## §2 — Verified engines

The `bug-hunting/` dir contains **zero local `.ts` engines** (confirmed: Glob returns only `.md` files).
Uniform is a cross-galaxy CONSUMER of regression engines owned elsewhere:

| Role | Engine path | Notes |
|------|-------------|-------|
| Regression baseline | `mcp-server/src/engines/AdvancedRegressionEngine.ts` | PATHS.md name-match; treat as UNVERIFIED until `grep class AdvancedRegressionEngine` confirms |
| Regression baseline | `mcp-server/src/engines/RegressionBaselineEngine.ts` | PATHS.md name-match; // UNVERIFIED |
| CAM-in-host regression | `mcp-server/src/engines/CAMInHostRegressionDetectorEngine.ts` | PATHS.md name-match; // UNVERIFIED |
| Print-to-program regression | `mcp-server/src/engines/PrintToProgramRegressionHarnessEngine.ts` | PATHS.md name-match; // UNVERIFIED |

Previously cited `ErrorPatternLearningEngine.ts`, `RegressionHunterEngine.ts`,
`AntiRegressionGateEngine.ts` — **NOT FOUND** in `mcp-server/src/engines/`; omitted (R12).

---

## §3 — Dispatcher quick-ref

| Dispatcher | Verified actions (daily use) | Source |
|------------|------------------------------|--------|
| `prism_guard` | `error_ledger_append` · `error_ledger_append_and_embed` · `error_ledger_recent` · `error_ledger_recall_similar` · `pattern_scan` · `pattern_history` · `learning_query` | `guardDispatcher.ts:26,45–46` |
| `prism_dev` | `test_generate` · `test_generate_scan` · `test_generate_read` | `devDispatcher.ts:36` |
| `prism_cad_regression` | `cad_regression_run` · `cad_regression_load` · `cad_failure_triage_one` · `cad_failure_triage_group` · `cad_regression_dashboard_snapshot` · `cad_regression_analyzer_diff` · `cad_regression_report_summary` | `cadRegressionDispatcher.ts:78–130` (30 total actions) |

**MCP-down fallback:**
```bash
node .claude/scripts/scrutiny-3way.mjs --session-id <id>   # manual 3-arm reviewer
node scripts/audit-unwired-engines.mjs                       # offline orphan sweep
node scripts/hook-fire-rank.mjs                              # wired-silent hook surface
```

---

## §4 — Canonical constants + data paths

- **Physics constants:** import from `mcp-server/src/physics/constants.ts` — NEVER inline `kc1.1`,
  Taylor `C`/`n`, or material-group values. Bug class #6 is inlined-constant drift.
- **Error ledger:** `mcp-server/data/state/` — query via `prism_guard:error_ledger_recent`; NEVER
  full-read the ledger JSONL directly (can exceed 10MB).
- **Regression tests:** canonical landing zone is `mcp-server/src/__tests__/regression/` (verified: dir
  exists, contains live tests). Every bug uniform finds MUST produce a test here before the fix.
- **Scrutiny ledger:** `mcp-server/data/state/SCRUTINY_LEDGER.json` — keyed by session-id; do NOT
  manually edit; update only via `scrutiny-3way.mjs --mark-*`.

---

## §5 — Domain gotchas / safety rails

1. **"No bugs found" is not a result without listing audits run.** Null result must include: which scripts
   ran, which channels were checked, what was the scope. "I looked" ≠ "there are none."
2. **A test that has never failed proves nothing** (R9). If a mutation of the code-under-test does not
   turn the test red, the test is not testing the contract.
3. **Hostile-payload grep requires adversarial inputs, not random.** The `slice(firstBrace, lastBrace+1)`
   class is exploitable with embedded `}{}` — fuzzing with valid JSON misses it entirely
   ([[feedback_scrutiny_gate_finds_hostile_payload_class]]).
4. **Race conditions only surface under load; schema drift only surfaces on minor-version mismatch.**
   Single-threaded repros that pass are insufficient for bug classes #8 (silent clobber) and #7
   (schema-drift). Use `system-graph.json` streaming-IO guard (commit `6ff50d81f`) as the reference fix.
5. **`system-graph.json` is 548MB — NEVER open it directly.** Use
   `node scripts/system-viz-query.mjs node-card <id>` (CHEAP-NODE-ACCESS-MS0, ~200 tokens vs ~186K).
6. **Verify the actual contract, not a proxy.** Repro must check `JSON.parse` output, not byte-length;
   PowerShell 5.1 codepage mangles non-ASCII stdout and can produce false-green repros
   ([[feedback_verify_actual_contract_not_proxy]]).

---

## §6 — What NOT to do (domain refuses)

- **NEVER fix a single instance without sweeping ALL 34 galaxy engine trees** for the same pattern. One
  found = N found; uniform's job is class elimination, not instance patching.
- **NEVER mark a bug "fixed" without a mutation test.** Mutate the fix → verify the test goes red →
  commit. A test that stays green under mutation is not a regression guard.
- **NEVER disable a Stop hook because it's noisy.** Investigate the signal. False-positive class → tune
  threshold + document. Real signal → wire the response. Disabling = burying the finding.
- **NEVER open `system-graph.json` (548MB) directly.** Use `node-card` (§4 above).
- **NEVER report a found bug class without appending to `CLAUDE.md ## Recent regressions` AND filing
  a wiki lesson** under `knowledge/wiki/lessons/` or `knowledge/wiki/code-tribal/`. The
  `stop-bug-finding-wiki-gate.mjs` Stop hook enforces this — comply on first try.
- **NEVER write directly to `knowledge/tribal/bug-hunting-*.md`** — auto-overwritten on regen. Use
  `prism_knowledge:tribal_capture slot=uniform`.
- **NEVER fabricate engine names or script paths in bug reports.** Cite `file:line` or mark
  `// UNVERIFIED`. This galaxy's own CLAUDE.md shipped 3 fabricated engine paths — that is the class.

---

## §7 — Domain workflow / pipeline contract

Bug lifecycle (uniform enforces this order — skipping a stage is a new bug class):

```
CLASSIFY → REPRODUCE (actual contract, not proxy) → RED TEST in src/__tests__/regression/
  → FIX → GREEN TEST → MUTATE-FIX (verify test goes red) → COMMIT
  → CLAUDE.md ## Recent regressions append
  → wiki lesson under knowledge/wiki/lessons/ or code-tribal/
  → if 2+ instances: prism_guard:pattern_scan promotion
  → if recurring post-fix: prism_guard:error_ledger_append_and_embed + Stop hook candidate via /forge-triple
```

**Bug-class escalation tiers:**
- Single instance → regression test in `src/__tests__/regression/`
- Pattern confirmed (2+ instances) → wiki lesson
- Pattern recurs post-fix → error ledger embed + promote to Stop hook candidate (coordinate with golf)

---

## §8 — Tribal + corpus pointers

**Wiki entries:**
- `[[lessons/silent-clobber-prevention]]`
- `[[lessons/weak-assertion-class]]`
- `[[lessons/bug-findings-wiki-gate]]` — Stop hook enforcing the regression flow
- `[[architecture/scrutiny-3way]]` — 3-arm Stop gate, uniform's tool of choice
- `[[feedback/r5_thru_r12_doctrine]]` — R12 is uniform's mandate

**Capture rule:** all learnings via `prism_knowledge:tribal_capture slot=uniform` — NEVER direct
markdown writes to `knowledge/tribal/bug-hunting-*.md` (auto-overwritten on regen).

**JM Die corpus:** `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER `Glob` the 24K-file tree.

---

## §9 — Cross-galaxy edges (PSN)

| Edge | Direction | Bridge |
|------|-----------|--------|
| uniform → romeo (wiring) | verifies wirings route end-to-end (not just type-check) | `prism_guard:error_ledger_append` on wire-miss |
| uniform → papa (backend-helper) | papa's green baseline = uniform's drift reference | `prism_dev:test_generate` on gap |
| uniform ← tango (discovery) | tango surfaces what exists; uniform asks "does it do what it claims?" | `audit-unwired-engines.mjs` |
| uniform ← victor (dormant-data) | extracted-but-never-loaded is a bug class | `scripts/declared-vs-actual.mjs` |
| uniform → india (ai-training) | bug findings feed GNN ref-pool via `xproc_kg_project_features` | closed-loop §10 |
| uniform → golf | Stop hook candidacy escalation — golf owns hook wiring lane | coordinate via `AGENT_CHAT.md` |

---

## §10 — Closed-loop integration (india)

On every confirmed bug finding: call `xproc_outcome_publish {slot:'uniform', domain:'bug-hunting'}` and
emit features via `xproc_kg_project_features` for india's GNN tier-5 classifier. // UNVERIFIED action names — grep `prism_ai` dispatcher before first call. Full protocol: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`. Tribal capture: `prism_knowledge:tribal_capture slot=uniform` (NEVER direct markdown write).

---

## §11 — Test commands

```bash
# Domain-filtered regression suite
cd mcp-server && rtk npx vitest run -t "regression|bug|guard|error.ledger|pattern.scan"

# Offline audit scripts (work when port 3100 is down)
node scripts/audit-roadmap-drift.mjs          # envelope vs git reality
node scripts/audit-close-out-candidates.mjs   # shipped-but-pending silent debt
node scripts/audit-unwired-engines.mjs        # ACTION_MAP orphan ghosts
node scripts/declared-vs-actual.mjs           # declared-but-not-configured dormancy
node scripts/hook-fire-rank.mjs               # wired-silent hook surface

# Inlined-constant hunt (bug class #6)
rtk grep -r "kc1\.1\s*=" mcp-server/src/engines --include="*.ts" | grep -v constants.ts
rtk grep -r "Taylor\|C_Taylor\|n_taylor" mcp-server/src/engines --include="*.ts" | grep -v constants.ts

# Weak-assertion sweep (bug class #3)
rtk grep -rn "toBeDefined()\|toBeTruthy()" mcp-server/src/__tests__ --include="*.test.ts" | grep -v "// verified-weak-ok"

# Schema-drift hunt (bug class #7)
rtk grep -rn "schemaVersion" mcp-server/data/state/*.json | head -20
```

---

## §12 — Known bugs / open threads

- **3 phantom engine names** (`ErrorPatternLearningEngine`, `RegressionHunterEngine`,
  `AntiRegressionGateEngine`) were cited in the prior CLAUDE.md — dropped here (R12). If these engines
  exist under a different name, verify + re-add with `file:line` citation.
- **`outcome-bus-auto-tap.mjs`** — referenced in closed-loop section of prior CLAUDE.md; existence
  unverified (`verified absent` per assessment). Do NOT rely on auto-tap; call `xproc_outcome_publish`
  explicitly.
- Open debt queue: `mcp-server/src/__tests__/regression/` (sweep for `toBeDefined` stubs lacking the
  `// verified-weak-ok` exemption comment — these are uniform's standing open work).

---

## §13 — AI / reasoning surface

```bash
# Local reasoning (free, ~0 Claude tokens)
node scripts/lib/galaxy-reasoning-bridge.mjs bug-hunting "<query>"
```

Ollama routing for uniform:
- Triage a stack trace / classify a failure mode → `gpt-oss:20b`
- Summarize a diff for regression risk → `qwen2.5-coder:32b`
- Root-cause reasoning / adversarial scenario generation → Claude (session model)

## AI Synergy (PSN leg #10)

This galaxy is an AI-substrate **consumer** (no dedicated AI engines of its own; `aiEngineCount` 0).
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs bug-hunting "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/bug-hunting_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
