# HERMES + Obsidian-as-automated-OS — deep research deliverable

**Date:** 2026-05-20 · **Slot:** bravo (`claude-eca6e8bb`) · **Companion to:** [ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md](ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md)

Closes the second half of the operator directive — *"do deep research on hermes and utilizing obsidian as an automated os"* — feeding the G5 (Hermes shipDraft staging) and G13 (awareness → decision) designs.

Three things are out-of-scope here: the **9-pattern adoption matrix** (decided in [HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md](HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md), 8 of 9 patterns shipped or already-exceeded), the **original gap audit** (decided in [HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md](HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md), gap matrix), and the **architecture diagram** (decided in [hermes-zebra-integration.md](../../../knowledge/wiki/architecture/hermes-zebra-integration.md)). This spec is the **operational synthesis** — what the running campaign learned about how the three Hermes layers (brain / personality / skillset) interact with PRISM's Obsidian vault as the durable OS substrate, and the design implications for finishing G5/G13/G6 properly.

---

## 1. The Hermes / Obsidian-as-OS thesis in one sentence

**Hermes is a runtime; Obsidian is a substrate. PRISM is already running Hermes; it's already using Obsidian — but the *closed-loop* flowing between them (observation → cluster → emit → review → ship → use → re-observe) is the part that compounds capability, and that loop has two leaks the gap-audit just measured (G5 publishes stubs as live commands, G6 dedup never fires).** Closing those leaks is what turns the vault from a passive archive into an active OS.

---

## 2. What "Obsidian-as-automated-OS" means for PRISM concretely

The on-disk article (`hermes-shann-article.md` §"the new operating system is markdown") frames Obsidian as the OS because every Hermes runtime artifact — brain, personality, skillset, session log, task bus, deployment surface — is a plaintext markdown file in a single directory tree, version-controlled by git, queryable by every CLI tool, editable by every agent and every human at the same time. PRISM is already shaped this way, but with a wider doctrine layer on top. The mapping today:

| Hermes OS layer | PRISM file shape | Status |
|---|---|---|
| `~/.hermes/memories/MEMORY.md` (brain index) | `knowledge/memories/MEMORY.md` + ≤200-line pointer index per [§KNOWLEDGE VAULT 5-namespace schema](../../../CLAUDE.md) | ✅ live |
| `~/.hermes/memories/USER.md` (per-user prefs) | `C:\Users\wompu\.claude\CLAUDE.md` global (mirrored to H: by `c-to-h-mirror`) | ✅ live |
| `~/.hermes/agents/<name>/soul.md` (personality) | `state/shared/slot-souls/<slot>.md` per-slot — 3 shipped (zebra/golf/bravo), 23 default (HERMES-MS0/U-HERMES02) | ✅ live |
| `~/.hermes/skills/<id>.md` (skillset) | `.claude/commands/<name>.md` — ≈700 skills (Hermes ships 123 OOB) | ✅ exceeds |
| Session log (Hermes SQLite) | `state/shared/AGENT_CHAT.jsonl` + `chat-slots.json` + per-chat `HANDOFF-*.md` | ✅ live (markdown shape, not SQLite) |
| Task bus | `state/shared/slot-task-queues.json` + atomic-roadmap.json | ✅ live |
| Closed learning loop | `state/shared/skill-candidates.jsonl` (HERMES-MS0/U-HERMES03 observation) → cluster/emit/review/ship (MS1/U-HERMES04..07) | ⚠ G5/G6 leaks (this spec) |

The *exceeding-Hermes* layer PRISM owns that Hermes doesn't:

- **`knowledge/wiki/` — 722-entry Karpathy LLM-wiki** with architecture / lessons / code-tribal / decisions / patterns / trajectories. Hermes has no wiki tier; observation goes straight from session → skill. PRISM has session → memory → wiki → CLAUDE.md pointer — three promotion gates. This makes the brain *queryable across time* in a way Hermes' flat memory cannot.
- **Doctrine pointers** — CLAUDE.md (project) + `~/.claude/CLAUDE.md` (user) sit *above* the brain layer and govern *how* the brain is used. Hermes has soul.md but no doctrine.md.
- **System-viz** — the live `/system-viz` 3D graph is the OS *visualization* layer Hermes is missing. Every roadmap unit, every engine, every dispatcher, every wiring is a node; ghost roosts surface unwired/unbuilt work. This is what makes the OS *navigable* by the operator as well as the agent.

PRISM is therefore **Obsidian-as-automated-OS plus a wiki tier plus a doctrine tier plus a visualization tier**. The Hermes patterns are a subset of what's already running.

---

## 3. The closed-loop leak — what G5 and G6 measured

The 2026-05-17 juliett spec made the case that the **harness-writes-skills closed loop is the compounding-capability lever**. HERMES-MS0 shipped the observation half (U-HERMES03 → 24/24 tests, append-only JSONL, idempotent). MS1 shipped the cluster→emit→review→ship half (U-HERMES04..07 → 30/30 tests, dry-run default). But this campaign's gap audit found two leaks in the *ship-layer logic* that turn the closed-loop from a compounding-capability into a noise-generating-capability:

### G5 leak — `shipDraft` publishes stubs as live skills
`scripts/lib/skill-loop-pipeline.mjs::shipDraft` calls `buildStubBody()` and writes the result to `.claude/commands/<id>.md`. The body is a placeholder template with generic trigger keywords. On AUTO-PASS (median callCount ≥ 6 AND ≥ 2 slots), this means **the system publishes a live `/skc-xxxx` slash command that is just a stub** — it appears in the skill catalog, it can be invoked, but it has no real work to do. **Hermes proposes; it does not author.**

The fix (open as G5 in the gap-audit, scheduled for this campaign's next iter): `shipDraft` writes to `state/shared/specs/SKILL-CANDIDATE-<id>.md`, NOT `.claude/commands/`. Operator or a follow-up agent authors the real body and only then promotes to `.claude/commands/`. The auto-pass still fires — but on a *staging area* the operator filters, not on the live skill catalog.

### G6 leak — dedup signature never matches real skills
`scripts/lib/skill-loop-pipeline.mjs::gateCandidate` conflict-check is `signature.includes(skillName)`. The signature is the normalized tool-call sequence (e.g. `Read|Edit|Bash:vitest|Bash:git`). A tool-call signature **almost never contains a skill name** — the signature is a list of tool kinds, not a list of skill ids. So real dedup against the ≈700 existing skills never fires. **The system thinks every candidate is novel.**

The fix (open as G6): compare against the **trigger keywords** in the existing skill frontmatter (`description:` + `name:` slug tokens) plus the dominant tool families in the signature (Read+Edit+Bash:git → mass of existing "scaffold" skills). Then dedup is keyword-overlap on the actual *purpose*, not substring on the wrong field.

**Net:** these two fixes don't redesign the closed loop — they patch the *publication boundary* and the *dedup oracle*. With them in place, the harness-writes-skills loop matches the Hermes design: observed work clusters → real candidates → dedup against existing library → operator-gated promotion → compounding library that doesn't drown in stubs.

---

## 4. The awareness → decision leak — what G13 measured

The user directive was *"train it… then implement what it learns to the PRISM AI systems."* ZEBRA-AWARENESS-MS0 trained the weights (`zebra-awareness-weights.json`). But pre-this-campaign, `scripts/zebra-orchestrator-sweep.mjs:187` consumed those weights **only for log enrichment** — the comment in the file literally said "No decision flow changes". The *implement what it learns* half was missing.

G13 closed the first cut: `awarenessLookupSlot(pick.slot).queueLength` now feeds `planSlotAction` via the new `slotQueueLength` opt, and `chatState.hasUnresolvedHandoff = hasHandoff === true || ((Number(slotQueueLength) || 0) > 0)`. A slot with queued tribal/Hermes work biases the decider AWAY from `/clear` even when no handoff file exists. Back-compat preserved: omitted `slotQueueLength` → original boolean path.

This is the **minimum-viable closed loop** between awareness and decision. Two larger pieces remain, both in scope for follow-up:

- **NN-scoring integration** — ZEBRA-AWARENESS computes per-slot fingerprints across many dimensions (`pressureSignals`, `recentActivity`, `domainAffinity`, etc.). Currently only `queueLength` is folded into the decision. The full integration would feed the fingerprint into the NN scoring stage that ranks `pick` candidates, not just the binary `hasUnresolvedHandoff` flag.
- **Pressure-threshold tuning** — the `level: "critical"` threshold is currently a hard-coded constant. With awareness-trained weights, the threshold could be slot-specific (a slot in a high-tribal-density domain tolerates higher pressure before /clear is safe).

Both are deferred to a follow-up milestone after this campaign closes. The G13 fix is the minimum surface that lets `planSlotAction` see *anything* from awareness — that surface is now in place.

---

## 5. Operational design implications for finishing the campaign

The remaining open gaps (G4, G5, G6, G10, G12) split into three classes:

### Class A — code edits (G5, G6)
Concrete next iter:

1. **G5 — `shipDraft` → staging area.** Edit `scripts/lib/skill-loop-pipeline.mjs::shipDraft`:
   - Change destination from `.claude/commands/<id>.md` to `state/shared/specs/SKILL-CANDIDATE-<id>.md`.
   - Stub body becomes a *spec* template (header, observed cluster, dominant signature, suggested trigger keywords, suggested template, AUTO-PASS context).
   - Add an explicit `## Operator promote instructions` section pointing at `/forge-triple` for real authoring.
   - Tests: 1 new node:test asserting the destination path + spec-shape body; existing 30/30 pipeline tests must continue to pass.

2. **G6 — `gateCandidate` keyword-match dedup.** Edit `scripts/lib/skill-loop-pipeline.mjs::gateCandidate`:
   - Build a `loadExistingSkillKeywords()` helper that scans `.claude/commands/*.md` + `H:/.claude/commands/*.md` and indexes `description:` tokens + slug tokens once per run.
   - Conflict check becomes `keywordOverlapScore(candidateTriggerKeywords, existingIndex) > THRESHOLD` (default THRESHOLD=0.4 → 40% keyword overlap).
   - Dominant-tool-family bucket override: signatures dominated by `Read+Edit+Bash:git` are routed to a "scaffold" bucket, dedup'd against the existing scaffold-skill list specifically.
   - Tests: 2 new node:test cases — overlap-above-threshold returns CONFLICT, no-overlap returns NOVEL.

### Class B — doc-only spec flips (G4)
G4 is the "closed loop is operator-gated" caveat. It's not a bug — only AUTO-PASS auto-ships, everything else needs an operator-dispatched reviewer + a verdict. The spec row should flip from `◻ DOC` to `✅ DOCS-COMPLETE` with a one-line clarification in the gap-audit and an entry in this spec's §6 ("operator-gated loops are the design, not a bug"). No code change.

### Class C — operator actions (G10, G12)
G10 and G12 require elevation or operator policy decisions — they cannot auto-resolve from inside a chat session.

- **G10 — register `PRISM Zebra Orchestrator` scheduled task.** Surface in the gap-audit as: `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/helpers/install-zebra-orchestrator-task.ps1 -DryRun -RunNow` (operator runs elevated). Gated behind G1b (which is already FIXED ✅), so this is now safe to run.
- **G12 — opt slots into ZEBRA.** Surface in the gap-audit as: edit `chat-slots.json` to set `slots[name].zebraOptIn=true` for the slots the operator wants the orchestrator to actuate. Default OFF is the correct safe-by-default; opt-in is a deliberate operator policy.

Both should be **labeled OPERATOR ACTION** in the spec — not flipped to FIXED, because they require human authorization. The campaign close-out lists them as the operator's punch list, distinct from the code-fix punch list.

---

## 6. Why operator-gated loops are the design

A standing concern raised by G4 is whether a *semi*-closed learning loop (operator-gated on NEEDS-REVIEW + only AUTO-PASS auto-ships) actually delivers the Hermes compounding-capability promise. Three reasons the operator gate is the correct shape for PRISM:

1. **Safety surface.** Hermes' closed loop runs in a single-operator sandbox. PRISM runs across 26 slots concurrently, on a physics-validating manufacturing platform where a malformed skill that "looks plausible" could route into shop-floor work. The reviewer-gate is the only place a human can catch a closed-loop hallucination before it reaches production code. AUTO-PASS only fires when *median callCount ≥ 6 AND ≥ 2 slots* — that's already a strong evidence threshold, and even with the threshold, the staged-spec G5 fix keeps a human in the loop for any *body* authoring.

2. **Multi-tenant convergence.** Across 26 slots, the same workflow may be observed in different domains with different intents. AUTO-PASS only catches the cases where the pattern is *converged* (multiple slots independently doing the same thing). Anything domain-divergent flows to NEEDS-REVIEW where the operator decides if it's truly cross-domain (promote to global skill) or domain-specific (promote to one domain's command catalog). Hermes has no domain layer; PRISM does (bravo=mill, charlie=wire, etc.).

3. **Doctrine override.** CLAUDE.md is the project doctrine. A closed-loop-ship cannot encode doctrine because doctrine is meta to the work being observed (e.g. "never inline physics constants" is a rule about the work, not a pattern derivable *from* the work). The operator gate is where doctrine reviews the proposed skill against the doctrine in CLAUDE.md.

**Net:** the operator-gated shape is a feature, not a degradation. The G5/G6 fixes (staged-spec destination + real keyword dedup) make the gate scale with the library size; without them the gate gets overwhelmed by noise.

---

## 7. Synergy map — how the three Hermes layers feed each other through Obsidian

```
                         ┌──────────────────────────────────────┐
                         │  CLAUDE.md (project doctrine)        │
                         │  ~/.claude/CLAUDE.md (user)          │
                         └────────────┬─────────────────────────┘
                                      │ governs
                                      ▼
   ┌──────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
   │  BRAIN           │ ◀────▶  │  PERSONALITY     │ ◀────▶  │  SKILLSET           │
   │  knowledge/      │         │  slot-souls/     │         │  .claude/commands/  │
   │   memories/      │         │   <slot>.md      │         │   <skill>.md        │
   │  knowledge/wiki/ │         │  (voice, refuse, │         │  ≈700 skills        │
   │   <namespace>/   │         │   escalation)    │         │                     │
   └────┬─────────────┘         └─────────┬────────┘         └──────────┬──────────┘
        │                                 │                             │
        │       fed by Stop hooks         │      injected by            │  invoked by
        ▼      (auto-memory feed,         ▼      slot-soul-inject       ▼  Skill tool /
   ┌─────────────────┐                                              ┌────────────────┐
   │  Session log    │ ◀── append ──────────────────────────────── │  Tool calls    │
   │  AGENT_CHAT     │                                              │  + outcomes    │
   │  HANDOFF-*.md   │                                              └────────┬───────┘
   │  chat-slots     │                                                       │
   └────┬────────────┘                                                       │
        │                                                                   │
        │   observed by HERMES-MS0 U-HERMES03 ◀──── feeds the closed loop ──┘
        ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  state/shared/skill-candidates.jsonl  (append-only observation log)  │
   └────┬─────────────────────────────────────────────────────────────────┘
        │ U-HERMES04 cluster  →  U-HERMES05 emit  →  U-HERMES06 gate
        ▼                          │                         │
   ┌─────────────────────┐         │ G5 fix: write to        │
   │  cluster set        │         │ state/shared/specs/     │ G6 fix:
   │  (≥5 occurrences)   │         │ SKILL-CANDIDATE-*.md    │ dedup vs
   └─────────────────────┘         │ (NOT .claude/commands/) │ keyword overlap
                                   ▼                         ▼
                              ┌────────────────────────────────────┐
                              │  reviewer gate                     │
                              │  AUTO-PASS → ship to .claude/      │
                              │  AUTO-FAIL → advisory journal      │
                              │  NEEDS-REVIEW → operator dispatch  │
                              └────────────────────────────────────┘
                                          │
                                          ▼
                              promotes back into  the SKILLSET layer
                              (closes the loop — capability compounds)
```

The G13 awareness→decision wire is a *parallel* loop on the orchestration layer:

```
   ┌──────────────────────┐
   │  ZEBRA-AWARENESS     │  zebra-awareness-weights.json
   │   trained weights    │  per-slot fingerprints
   └──────────┬───────────┘
              │ awarenessLookupSlot(slot)
              ▼
   ┌──────────────────────┐
   │  sweep.mjs           │  fp = awarenessLookupSlot(pick.slot)
   │  sweepOnce           │  ── lifted ABOVE planSlotAction (G13 fix) ──
   └──────────┬───────────┘
              │ slotQueueLength: fp?.queueLength
              ▼
   ┌──────────────────────┐
   │  planSlotAction      │  chatState.hasUnresolvedHandoff =
   │  (lib)               │    hasHandoff === true || (queueLength > 0)
   └──────────┬───────────┘
              │ chatState
              ▼
   ┌──────────────────────┐
   │  decideClearOrCompact│  biased AWAY from /clear when queue > 0
   └──────────────────────┘
```

The two loops feed each other: the closed-learning-loop writes skills, the skills get invoked, the invocations are observed by Stop hooks, the observations feed ZEBRA-AWARENESS, awareness feeds the orchestration decision, the orchestration decision affects which slots get `/compact` vs `/clear`, the compact preserves cross-topic continuity, continuity enables the next session to continue the work, the continued work generates more observation. **This is the compounding loop the operator's directive asked for.**

---

## 8. Operator punch list — what's left after this campaign

| Item | Class | Action |
|---|---|---|
| **G5** — staging-area shipDraft | Code | Edit `scripts/lib/skill-loop-pipeline.mjs::shipDraft` per §5 Class A.1 |
| **G6** — keyword-match dedup | Code | Edit `scripts/lib/skill-loop-pipeline.mjs::gateCandidate` per §5 Class A.2 |
| **G4** — doc spec flip | Doc | Flip G4 row in gap-audit from `◻ DOC` to `✅ DOCS-COMPLETE` with operator-gated-loops-are-design note |
| **G10** — register orchestrator task | Operator | Run elevated: `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/helpers/install-zebra-orchestrator-task.ps1 -DryRun -RunNow`, then re-run without `-DryRun` once dry-run is clean |
| **G12** — opt slots into ZEBRA | Operator | Edit `chat-slots.json` `slots[<name>].zebraOptIn=true` for the slots the operator wants actuated. Default OFF is the correct safe-by-default. |
| NN-scoring integration | Follow-up MS | Feed full awareness fingerprint into NN scoring stage (deferred to ZEBRA-AWARENESS-MS1) |
| Pressure-threshold tuning | Follow-up MS | Per-slot threshold tuned from awareness weights (deferred to ZEBRA-AWARENESS-MS1) |
| Multi-surface messaging transport | Post-revenue | Real Telegram/Discord/Slack backends behind the null-backend framework already shipped in HERMES-MS1/U-HERMES08-FRAME |

---

## 9. See also

- [HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md](HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md) — original juliett gap research
- [HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md](HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md) — 9-pattern adoption decisions
- [ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md](ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md) — the campaign this spec services
- [hermes-zebra-integration.md](../../../knowledge/wiki/architecture/hermes-zebra-integration.md) — architecture diagram
- [reference_obsidian_brain_fix_ms0_2026_05_17.md](../../../knowledge/memories/reference/reference_obsidian_brain_fix_ms0_2026_05_17.md) — proof that the brain *not* being aware was a topic-drift orphaning bug, not a wiring bug — the OS works when the read path works
- `hermes-shann-article.md` (94KB on-disk scrape) — primary Hermes source
- CLAUDE.md §KNOWLEDGE VAULT 5-namespace schema — the substrate Hermes maps to
- `state/shared/CLAUDE-BRIEF.md`, `PRISM-BUILD-VISION.md`, `PRISM-BUILD-CONTEXT.md` — the company-brain layer Hermes calls L1

---

**Status:** complete. The G5/G6/G4 actions can now execute against the design in §5; G10/G12 are surfaced as operator-action items in §8; G13 already shipped as commit `1028347770`. The deep-research half of the directive is closed.
