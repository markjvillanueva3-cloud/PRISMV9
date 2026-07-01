## dormant-data — slot:victor

### Current state

**Size:** ~130 lines / ~6.5 KB  
**Quality grade:** GOOD

The current CLAUDE.md is one of the stronger galaxy files in the fleet. It was hand-authored by slot:alpha at galaxy birth (2026-05-28), contains real operational doctrine, and has been enriched by subsequent cross-cutting passes (galaxy-enrichment-program, AI-systems-state stanza, critic/keep-working contract). The core excavation workflow (strict order → classify → consumer-check → route → record → commit) is accurate and domain-specific.

**Verified accurate content:**
- Excavation roots in strict order (`H:/PRISM/extracted/`, `extracted_modules/`, rest of codebase) — accurate
- `DuplicationGuardEngine.ts` — VERIFIED exists at `mcp-server/src/engines/DuplicationGuardEngine.ts`
- `SourcePoisoningSanitizerEngine.ts` — VERIFIED exists at `mcp-server/src/engines/SourcePoisoningSanitizerEngine.ts`
- `mcp-server/data/state/extraction-log.json` — VERIFIED exists
- `mcp-server/data/state/cross-session-asset-registry.json` — VERIFIED exists
- Skills `/extracted-query`, `/resource-census`, `/wire-unwired` — VERIFIED exist in `.claude/commands/`
- `prism_dev:resource_census` action — VERIFIED in `devDispatcher.ts:2088`
- `scripts/orphan-inventory.mjs` — VERIFIED exists (CLAUDE.md cites `scripts/audit-orphan-inventory.mjs` which is the WRONG name — the real script is `scripts/orphan-inventory.mjs`)

**Stale / inaccurate content found:**
1. **`engines/KnowledgeConversionPipelineEngine.ts`** — DOES NOT EXIST (grep across entire `mcp-server/src/engines/` returned zero matches for `KnowledgeConversion`). The 3-lane router from KNOWLEDGE-CONVERSION-MS0 may be implemented differently or under a different name. Mark `// UNVERIFIED` or replace with verified path.
2. **`scripts/audit-orphan-inventory.mjs`** — WRONG filename. Real script is `scripts/orphan-inventory.mjs` (verified). The `audit-` prefix does not exist.
3. **`state/shared/dormant-data-ledger.jsonl`** — DOES NOT EXIST on disk yet. The CLAUDE.md treats it as a pre-existing infrastructure item; it is actually a to-be-created artifact. Should be flagged as "create-on-first-use."
4. **`prism_knowledge:tribal_capture`** (Bridges OUT section) — `prism_knowledge` dispatcher not verified; `tribal_capture` action not verified in any dispatcher. Marked UNVERIFIED.
5. **`/CHAT-SLOT-DOMAINS.md`** — cited as source for operational scope; path likely `H:/CHAT-SLOT-DOMAINS.md` but not verified.
6. The AI-SYSTEMS-STATE stanza and CRITIC/KEEP-WORKING stanza are cross-cutting boilerplate injected by fleet-wide scripts — they are accurate but add ~25 lines of non-domain content to every galaxy file; they belong as a universal-core pointer, not inline.

---

### KEEP

1. **`## What lives here`** — the mission statement + slot identity paragraph. Load-bearing orientation for every new victor session.
2. **Excavation roots (STRICT ORDER)** — the 3-root strict-order doctrine with its concrete paths. Unique to this domain; not in any universal file.
3. **Per-finding triage (5-step classify → consumer-check → route → record → commit)** — the core workflow. Accurate and domain-specific.
4. **Anti-patterns (victor refuses)** block — highly domain-specific, accurate, and the most token-efficient way to prevent the known failure modes. Keep verbatim.
5. **Karpathy 5-step for excavation work** — the dormant-data–adapted version is meaningfully different from the generic checklist; keep domain-adapted version.
6. **Related galaxies** section — the romeo/tango/knowledge-conversion/india/xray coordination map. Accurate and load-bearing for cross-slot coordination.
7. **Closed-loop integration with india** section — xproc outcome publishing, GNN feature emission, calibration hooks are real infrastructure (verified via india galaxy MEMORY.md). Keep.
8. **Wiki cross-refs** — `[[architecture/knowledge-conversion-ms0]]`, `[[architecture/duplication-guard-discipline]]`, `[[lessons/orphan-rescue-class]]`. Keep as pointers; omit `[[reference/extracted-corpus-map]]` until verified.
9. **Bridges OUT** — `prism_dev:resource_census` (verified) and romeo chat-bus coordination. Keep the verified ones.

---

### DROP

1. **`## Cross-cutting methodology`** block (~20 lines) — 100% duplicated from the fleet-wide galaxy-enrichment-program cross-cutting stanza. Every galaxy has it identically. Replace with one-line pointer to `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md`.
2. **`<!-- AI-SYSTEMS-STATE:BEGIN/END -->`** stanza — boilerplate injected into all 34 galaxies by `scripts/wire-galaxies-to-operational-context.mjs`. Pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md` is sufficient; the full block wastes ~12 lines per session.
3. **`<!-- CRITIC-KEEPWORKING-STANZA -->`** block — universal R6 + R12 doctrine already in global CLAUDE.md. Duplicate. Replace with universal-core pointer.
4. **`prism_knowledge:tribal_capture`** (Bridges OUT) — unverified dispatcher action. Drop until verified or replace with the verified path (`knowledge/tribal/` + `tribal-by-domain-inject` slot-mapping, which IS documented in MEMORY.md).
5. **Reference to `scripts/audit-orphan-inventory.mjs`** — wrong filename. Drop and replace with `scripts/orphan-inventory.mjs`.
6. **Reference to `engines/KnowledgeConversionPipelineEngine.ts`** — engine does not exist. Drop until verified real implementation path is found (should be traced through `knowledge-conversion/` galaxy CLAUDE.md or wiki `[[architecture/knowledge-conversion-ms0]]`).
7. **`scripts/build-corpus-catalog.mjs` / `harvest-*.mjs`** — cited as "prior extraction harness (do NOT re-run)" but neither path verified. If they exist confirm; if not, drop.

---

### ADD (domain-specific — the heart of this assessment)

**A. Verified dispatcher actions for daily victor work**
```
prism_dev:resource_census          — count + classify a dormant root folder (VERIFIED devDispatcher.ts:2088)
prism_dev:resource_census_read     — read the cached census report (VERIFIED devDispatcher.ts:2097)
prism_dev:resource_census_summary  — summary view of cached census (VERIFIED devDispatcher.ts:2103)
prism_dev:dedup                    — pre-wire duplicate check (cited in TOOLBELT, verify action name in devDispatcher)
```
*Note: `prism_knowledge:tribal_capture` is UNVERIFIED — do not call until confirmed.*

**B. The dormant-data ledger is CREATE-ON-FIRST-USE**
`state/shared/dormant-data-ledger.jsonl` does not exist on disk. Victor must create it on first classification finding. Schema should include: `{schemaVersion, sha, source_path, classification, consumer_found, route, status, prior_sha?, ts}`. Document this explicitly so victor sessions don't block on "ledger not found."

**C. Extraction-log vendor roster (load-bearing — include inline, not by reference)**
The extraction-log is load-bearing enough to state the vendor counts inline so victor doesn't need to open a JSON file to know what's already extracted:
- Mastercam: 45 items · hyperMILL: 25 · Okuma: 63 · Fanuc: 35 · Haas: 28 · Titans: 42
- Location: `mcp-server/data/state/extraction-log.json` (VERIFIED)
- Rule: `DuplicationGuardEngine.mustNotReExtract()` THROWS on any re-extraction attempt

**D. Known dormant-data classes (orient new sessions faster)**
From MEMORY.md and prior audit findings:
- 593 unwired engines (romeo's punch list — significant overlap with victor findings probable)
- 26,051 of 38,035 wiki files lack tribal embedding — this is a dormant-data class in wiki, not just `extracted/`
- 6 ranked synergy units from extracted_modules dormancy audit (2026-05-27) — not yet addressed
- `H:/PRISM/extracted/` contains Mastercam/hyperMILL/Okuma/Fanuc/Haas/Titans subtrees — start with Mastercam (45 items) per MEMORY.md recommendation

**E. Ollama routing for dormant-data tasks**
Victor's work is classify/summarize/triage — exactly the Ollama-first tier:
- Classify a dormant/orphan-data candidate: `gpt-oss:20b` (quick filter/synthesis)
- Summarize a ledger or extracted document: `gpt-oss:20b`
- Deep reasoning about whether to wire vs archive: `gpt-oss:120b`
- Code (wiring PRs, hook edits): `qwen2.5-coder:32b`
- Trivial rename/format: `qwen2.5-coder:1.5b`

**F. Coordination protocol with romeo (wiring) — must be explicit**
Every engine finding requires:
1. Post to `state/shared/AGENT_CHAT.md` tagging romeo before opening wiring PR
2. Check `mcp-server/data/claims/<unit>/claim.json` — if romeo has claimed the file, wait or coordinate
3. Use `DistributedLockManager.withLock(resource, fn)` for dispatcher file edits
Without this, parallel wiring causes lock contention (documented in anti-patterns but the mechanism needs to be spelled out).

**G. What NOT to do (domain-specific "refuses" — expand current list)**
Current anti-patterns are good but missing:
- **Never run the extraction harness scripts (`harvest-*.mjs`, `build-corpus-catalog.mjs`) without verifying they exist** — prior CLAUDE.md cites them unverified
- **Never treat the dormant-data ledger as pre-existing** — create it on first use with correct schema
- **Never bypass `SourcePoisoningSanitizerEngine.ts`** before ingesting any extracted content — poisoned sources are a real risk when ingesting third-party vendor extracts
- **Never assume "no consumer found" from a single Grep** — run cross-domain: `mcp-server/src/`, skills, dispatchers, hooks, wiki — all four, not one

**H. Checkpoint discipline (excavation-specific)**
The depth-first sweep can run indefinitely. Mandate: emit a progress checkpoint every 50 files surveyed (`R10` + MEMORY.md §Standing patterns). Each checkpoint: root-being-swept / files-surveyed / findings-this-batch / ledger-entries-written.

---

### IDEAL SECTION OUTLINE

```
# Dormant-Data Galaxy (VICTOR slot)

## Mission + Slot Identity              ← keep current "What lives here" prose
## Excavation Roots (STRICT ORDER)      ← keep current + add ledger-create-on-first-use note
## Vendor Extraction Registry           ← NEW: inline vendor counts + extraction-log.json path
## Per-Finding Triage Protocol          ← keep current 5-step; fix wrong engine name
## Dormant-Data Ledger Schema           ← NEW: schema + create-on-first-use + append-only rule
## Dispatcher Actions (verified)        ← NEW: prism_dev:resource_census* confirmed actions only
## Ollama Routing for Victor Tasks      ← NEW: classify/summarize -> gpt-oss:20b; deep -> :120b
## Skill Surface                        ← keep current (extracted-query, resource-census, wire-unwired verified)
## Coordination with Romeo              ← expand current anti-pattern with chat-bus + lock mechanism
## Checkpoint Discipline                ← NEW: every 50 files, emit ledger count
## Anti-Patterns (victor refuses)       ← keep current + add 4 new entries listed above
## Karpathy 5-Step for Excavation       ← keep current domain-adapted version
## Known Dormant-Data Classes           ← NEW: 593 unwired engines, 26K wiki gaps, 6 synergy units
## Related Galaxies + Bridges OUT       ← keep current (verified dispatcher actions only)
## Wiki Cross-Refs                      ← keep current (drop unverified extracted-corpus-map)
## Closed-Loop with India               ← keep current (xproc hooks accurate)
## Universal-Core Pointer               ← NEW single line replacing boilerplate stanzas
```

---

### UNIVERSAL-CORE POINTER

The following rules are load-bearing for every slot but must NOT be duplicated into this galaxy file — they rot on duplication:

> Universal doctrine lives in `H:/PRISM/CLAUDE.md`. This galaxy file supplements it; it does not replace it.
> Rules always in effect (read from main): **R1-R15** · **Scrutiny 3-of-3 gate** · **Per-chat handoff** (`per-agent-handoff.mjs`) · **Commit format** `[SCOPE]/U-ID: title` · **Units-first safety rail** · **No-stub enforcement** · **RTK bash prefix** · **Karpathy 5-step** · **HONESTY RULES** (verify before citing, "I don't know" beats fabrication) · **Context growth is NOT a stop signal (R6)** · **Critic discipline (R12)**.

The galaxy CLAUDE.md adds ONLY what is dormant-data–specific and not derivable from the universal core. The cross-cutting boilerplate stanzas (AI-SYSTEMS-STATE, CRITIC-KEEPWORKING, GALAXY-ENRICHMENT cross-cutting methodology) are maintained by fleet scripts — they should appear as a single pointer line, not inline prose.
