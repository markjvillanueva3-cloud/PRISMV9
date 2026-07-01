# Galaxy Doctrine Phase A — completion rollup (2026-05-26, slot:alpha iter17)

**Purpose:** single discoverable index of the 5 Phase-A galactic-center sentinels shipped during alpha's iter12-16 /loop ticks + per-slot refinement-request checklist. Lowers pickup cost for the specialist slots (charlie, hotel, and any future wedm-soul slot) — they get a one-stop pointer instead of having to follow the doctrine spec → 5 per-domain files → cross-refs themselves.

**Parent:** [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md) — 8-pillar × 20-galaxy doctrine; this rollup completes Pillar 1 (galactic center) for galaxies 1-5.

---

## Shipped sentinels (5 of 5, all on shared tree `cad-fusion-live-ms0` branch)

| # | Galaxy | Path | Lines | Shape | Slot affinity | Refiner needed |
|---|--------|------|-------|-------|---------------|----------------|
| 1 | mill | [`mcp-server/src/engines/mill/CLAUDE.md`](../../../mcp-server/src/engines/mill/CLAUDE.md) | 126 | **fully populated** (7 sections all filled) | alpha (canonical) | ❌ no — alpha-authored |
| 2 | lathe | [`mcp-server/src/engines/lathe/CLAUDE.md`](../../../mcp-server/src/engines/lathe/CLAUDE.md) | 137 | **mostly populated** (7 gotchas + named-engine table); R7-flagged as first-pass | none canonical | ⚠ recommended — when lathe-soul slot is assigned per JULIETT-12CHAT-ALLOCATION |
| 3 | wedm | [`mcp-server/src/engines/wedm/CLAUDE.md`](../../../mcp-server/src/engines/wedm/CLAUDE.md) | 96 | **honest stub** (gotchas + tribal left empty per R12) | none canonical | ✅ yes — wedm-soul slot writes sections 5+6 |
| 4 | quoting | [`mcp-server/src/engines/quoting/CLAUDE.md`](../../../mcp-server/src/engines/quoting/CLAUDE.md) | 108 | **honest stub**; points charlie at specific iter43+ commits to refine from | **charlie** | ✅ yes — charlie refines from QUOTING-SYNERGY-MS0 session memory |
| 5 | business | [`mcp-server/src/engines/business/CLAUDE.md`](../../../mcp-server/src/engines/business/CLAUDE.md) | 115 | **honest stub**; broadest galaxy in PRISM (~10 sub-galaxies) | **hotel** | ✅ yes — hotel refines |

**Cumulative output:** 582 lines of doctrine across 5 sentinels + 152 lines parent doctrine + 107 lines noise-paths catalog = **841 lines of context-cascade infrastructure** in one session, 7 commits across 5 iters.

---

## Per-slot refinement checklist (pickup-ready work items)

### For **charlie** (quoting specialist)

Refine [`mcp-server/src/engines/quoting/CLAUDE.md`](../../../mcp-server/src/engines/quoting/CLAUDE.md):
- **§5 Gotchas** — flesh out from QUOTING-SYNERGY-MS0 session memory. Specific commits flagged as hint sources (all from this session):
  - `211ab8e1f` "silent bug caught"
  - `c83111d89` "PRE-FLIGHT discipline"
  - `848e0107a` "BOOTSTRAP-FILTER-EXTEND"
  - `15b09088a` "bootstrap distribution drift"
  - `4f00ed147` "drift-state file freshness"
  - `f46458837` "pipeline single-command healing"
  - `d74521aa4` "alert-banner formatting"
- **§6 Tribal pointers** — link `knowledge/memories/reference/` entries for charlie's QUOTING-SYNERGY-MS0 work.
- **§2 Constants table** — verify the speculative paths (`machine-rates.ts`, `customer-terms.ts`, etc.) and update.
- **§3 Disk anomaly** — verify `ActualCostEngine.ts` vs `ActualCostEngine.ts-1` (which is canonical, which is bak); gate via [[feedback_never_delete_only_disable]].

### For **hotel** (business/ERP specialist)

Refine [`mcp-server/src/engines/business/CLAUDE.md`](../../../mcp-server/src/engines/business/CLAUDE.md):
- **§5 Gotchas** — flesh out per-sub-galaxy (HR / CRM / ERP / Accounting / Vendor). Hint topics in the stub: payroll FLSA rounding, PTO carryover caps, customer credit-limit gates, ERP integration idempotency, AR aging cutoffs.
- **§6 Tribal pointers** — link `knowledge/memories/reference/` for hotel's ERP/HR work.
- **§2 Constants table** — verify all 6 speculative paths (payroll-tax-tables, pto-policies, benefits-plans, customer-terms, vendor-profile, chart-of-accounts) and update. Extraction-first if any don't exist yet.
- **§3 Disk anomaly P0** — `BusinessSyncEngine.ts` is **320 bytes**. Likely a stub-class engine that violates [[feedback_always_build]]. Either ship the real implementation or formally archive per [[feedback_never_delete_only_disable]].

### For any future **wedm-soul slot** (currently unassigned)

Refine [`mcp-server/src/engines/wedm/CLAUDE.md`](../../../mcp-server/src/engines/wedm/CLAUDE.md):
- **§5 Gotchas** — discharge-physics specific (pulse-on/off vs surface-finish, wire-tension/straightness/breakage tradeoff, flushing-pressure adequacy, recast-layer depth budgets, taper-cut wire-deflection compensation, no-core cut sequencing). Hint list is in the stub but UNCITED.
- **§6 Tribal pointers** — link `knowledge/memories/feedback/` entries on wedm + the existing `wedm-studio` skill suite.
- **§2 Constants table** — verify `edm-constants.ts` exists or extract-first.
- **JULIETT-12CHAT-ALLOCATION update** — propose a wedm-soul slot assignment (analog to alpha=mill, charlie=quoting, hotel=business). The skill suite indicates the work has been done; formalizing the slot closes a Pillar 6 (Travel Hub) gap.

### For any future **lathe-soul slot** (currently unassigned)

Refine [`mcp-server/src/engines/lathe/CLAUDE.md`](../../../mcp-server/src/engines/lathe/CLAUDE.md):
- Validate alpha's first-pass §5 gotchas (CSS/RPM cap, boring-bar L^4/D^4 deflection, nose-radius surface finish, threading entry-lock, parting chip evac, sub-spindle handoff phase, live-tool polar mode) against actual lathe-specialist knowledge. Each gotcha is a HYPOTHESIS from alpha — physics-adjacent but unverified for lathe-specific implementation in PRISM.
- Same JULIETT-12CHAT-ALLOCATION proposal as wedm.

---

## What Phase-A unblocks

Per the doctrine spec §Quantified leverage: **~5-8K tokens/chat SessionStart savings × 26 fleet slots ≈ 130-208K tokens/restart-burst** once root CLAUDE.md is compressed (separate work, gated to golf slot per [[reference_claude_md_compress_2026_05_20]]). Phase-A is the prerequisite that makes that compression safe — local doctrine has to exist BEFORE root doctrine can shrink.

**Indirect unlocks:**
- Phase-B (path-scoped skills) becomes viable when `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` is re-enabled (currently set in `~/.claude/settings.json`).
- Phase-C (per-domain counter dim) can now reference 5 concrete galaxy IDs as enum values for the `domain` field.
- Phase-D (galaxy-lens generator) has 5 concrete file-paths to enumerate as roost children.

---

## Remaining Phase-A scope (deferred — 15 galaxies + Pillar 2)

Doctrine enumerated 20 galaxies; Phase A targeted top-5. Remaining 15 are NOT shipped — explicit non-goal for this session:
- cad, cam, post-processor, mit-curriculum, pdf-corpus, pdf-corpus-mill, corpus-aggregation, cad-fusion-live, speed-feed (SFC), shop-floor live, quality/SPC, knowledge-conversion, tribal-knowledge, agent-orchestration, compliance/safety

**Recommendation:** next sessions ship one galaxy-center per /loop iter in their respective specialist slot. The mill template ([`mill/CLAUDE.md`](../../../mcp-server/src/engines/mill/CLAUDE.md)) is the gold-standard pattern to follow for "fully populated"; the wedm template is the gold-standard for "honest stub" when expertise is gap.

**Pillar 2 (Asteroid Belt / noise filter)** also deferred — [`PRISM-NOISE-PATHS-2026-05-26.md`](PRISM-NOISE-PATHS-2026-05-26.md) is the doc-only catalog; operator-touch validation of the `permissions.deny` snippet is the next step (NOT auto-applied due to untested deny-rule syntax + bypassPermissions interaction).

---

## Cross-refs

- Parent doctrine: [`DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- Grandparent: [`BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED-2026-05-26.md`](BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED-2026-05-26.md)
- Sister: [`PRISM-NOISE-PATHS-2026-05-26.md`](PRISM-NOISE-PATHS-2026-05-26.md) — Pillar 2
- CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0 — slot affinity source of truth (proposed lathe + wedm slot assignments are amendments to this)
- [[feedback_conflict_fork_rule]] — R7 surface-don't-average is the reason 4 of 5 sentinels are stubs rather than padded with mill-analog content
- [[reference_claude_md_compress_2026_05_20]] — golf is the only slot allowed to edit root CLAUDE.md; alpha cannot add a §DOMAIN-GALAXY-DOCTRINE pointer in root without filing a golf handoff request (deferred to a future iter)
