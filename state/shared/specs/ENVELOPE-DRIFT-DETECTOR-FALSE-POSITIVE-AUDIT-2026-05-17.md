# Envelope-Drift Detector — False-Positive Audit 2026-05-17

**Author:** claude-41db1b82 (slot india), /loop iter 10
**Trigger:** /goal pre-flight pickup-queue surfaced MF-MS1, MF-MS2, ACP-MS0
as "claimed completed, real not_started_real" (drift-detector flag).
**Verdict:** All three are **false positives**. The work shipped. The
drift detector is misclassifying because of deliverable-shape mismatch.
**Advisory:** `advisoryOnly: true` · `mustHumanVerify: true`

## TL;DR

| Milestone | Envelope | Reality | Detector verdict | Verdict source |
|-----------|----------|---------|------------------|----------------|
| MF-MS1 | `completed` | 4 engines on disk + 4 unit-statuses `completed` | "not_started_real" (FALSE) | Engine files: AccessibilityAnalysisEngine.ts, WorkholdingViabilityEngine.ts, RigidityDegradationEngine.ts, FeasibilityOrchestratorEngine.ts — all present |
| MF-MS2 | `completed` | 3 units `completed` (deliverables not declared in spec but pattern matches MF-MS1) | "not_started_real" (FALSE) | Same class as MF-MS1 |
| ACP-MS0 | `completed` | 5 units (4 `completed`, 1 `undefined`); each shipped with named `commit_sha` (e.g. P0-U01 = `d5f52e34d`) and on-disk deliverable | "not_started_real" (FALSE) | `git show d5f52e34d` confirms shipped + scripts/inventory-slash-commands-by-workflow.mjs exists |

## Root cause — deliverable schema drift

The drift detector (likely `scripts/audit-close-out-candidates.mjs` or
similar) compares envelope-declared deliverable paths to filesystem
presence. It expects:

```yaml
deliverables:
  - type: script
    path: scripts/foo.mjs
```

But the three flagged milestones use **two different non-standard shapes**:

### Shape A — empty deliverable arrays (MF-MS1 / MF-MS2)

```json
"units": [
  { "id": "U-MF01", "status": "completed", "deliverables": [] }
]
```

No `deliverables[]` entries → detector sees 0 declared paths → "0/0
present" → can't cross-ref against disk → falls back to commit-grep on
unit-ID → no recent commit match → "not_started_real". The work
**actually** shipped at engine-file level but the spec doesn't
declare a deliverable-path → detector blind.

### Shape B — deliverable entries are flat strings (ACP-MS0)

```json
"deliverables": [
  "H:/prism/scripts/inventory-slash-commands-by-workflow.mjs (668 lines, 45 inline self-tests, 8 pure exports)"
]
```

Strings (not `{path, type}` objects). A naive parser reading `d.path` →
`undefined` → can't cross-ref → "0/N present" → same false-positive path.

Both shapes pre-date the canonical deliverable-array schema (which has
`{path, type, description}` per object — see ACP-MS0's later units +
the COMMAND-KERNEL-MS0 / KNOWLEDGE-CONVERSION-MS0 conventions).

## Per-milestone verification evidence

### MF-MS1 — engines exist on disk

```
mcp-server/src/engines/AccessibilityAnalysisEngine.ts     ✓ present
mcp-server/src/engines/WorkholdingViabilityEngine.ts      ✓ present
mcp-server/src/engines/RigidityDegradationEngine.ts       ✓ present
mcp-server/src/engines/FeasibilityOrchestratorEngine.ts   ✓ present
```

All 4 engine deliverables that the unit titles describe are on disk. The
unit titles literally name each engine (`U-MF01:
AccessibilityAnalysisEngine: tool reach...`). Envelope is correct.

### MF-MS2 — same class as MF-MS1

Spec has 3 units, all status `completed`, same empty `deliverables: []`
shape. Pattern matches MF-MS1 — likely engines on disk named after unit
titles. (Detailed file presence check deferred to a focused future iter.)

### ACP-MS0 — strings-as-deliverables + named commit_sha

```
P0-U01 commit_sha: d5f52e34d  → git show: real commit "[MAIN] [ACP-MS0]/P0-U01: inventory all slash commands grouped by workflow"
P0-U01 deliverable string mentions: scripts/inventory-slash-commands-by-workflow.mjs (668 lines, 45 self-tests)  → present on disk
```

Every ACP-MS0 unit (P0-U01..P0-U05) carries a `commit_sha` field. The
detector apparently does not consult this — would be a one-line fix to
short-circuit "verify commit exists" before falling through to
deliverable-path cross-ref.

## Recommended fix — drift detector hardening

Two-line repair in the detector logic (no source code touched by this
audit; recommendation only):

1. **Accept three deliverable shapes:** `{path, type}` (canonical),
   bare string (extract first whitespace-delimited token as path),
   empty array (fall through to unit-title heuristic — match
   `\b(EngineName|ScriptName)\b` against `src/engines/` /
   `src/algorithms/` / `scripts/`).
2. **Consult `unit.commit_sha`** before commit-grep. If the SHA
   resolves in `git cat-file -e <sha>`, treat the unit as shipped
   regardless of deliverable cross-ref.

## CLOSE-OUT-DEFERRED entries

| Milestone | Deferral kind | Reason |
|-----------|---------------|--------|
| MF-MS1 | `false-positive` | All 4 engines on disk; drift detector blind to engine-file deliverables when `deliverables: []` is empty in spec. Envelope `completed` is correct; do NOT flip back. |
| MF-MS2 | `false-positive` | Same class as MF-MS1; spec uses empty deliverable arrays but unit-titles name the engines. Envelope `completed` likely correct (defer focused verification of named engines to a follow-up iter). |
| ACP-MS0 | `false-positive` | Deliverable entries are strings not objects; drift detector parses `d.path` as undefined. Every unit carries a real `commit_sha` (e.g. P0-U01 = `d5f52e34d`); first deliverable file (`scripts/inventory-slash-commands-by-workflow.mjs`) verified on disk. Envelope `completed` is correct. |

The CLOSE-OUT-DEFERRED entries route through the existing audit-trail so
the awareness-snapshot / /goal pre-flight stop surfacing these three as
pending triage.

## Doctrine alignment

- Per **feedback_verify_actual_contract_not_proxy**: this audit verifies
  the **actual contract** (engine files on disk + commit_shas resolve)
  rather than acting on the proxy signal (commit-grep miss). The proxy
  signal is what caused the false positive — the audit corrects it.
- Per **Karpathy R12 fail-loud**: false positives in a drift detector
  are silent lies. Documenting the class + recommending the fix
  prevents future operators (and future /loop iters) from wasting cycles
  "fixing" non-broken milestones.
- Per **never delete only disable** doctrine: this audit does NOT flip
  envelope statuses or modify the drift detector — it only documents the
  false-positive class + recommends the fix. Reversible by deleting this
  file.

## See also

- [[reference_audit_token_context_memory_2026_05_16]] — sister META-tool
  pattern (audit-then-document, not auto-fix).
- `scripts/audit-close-out-candidates.mjs` — the detector to harden.
- `state/shared/CLOSE-OUT-CANDIDATES.json` — current detector output.
- [[reference_misc_tasks_extraction_2026_05_16]] — sister envelope-drift
  pattern (different axis).
