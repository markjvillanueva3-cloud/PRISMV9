# MASTER-BRAIN-TEMPLATE — the canonical working, connected per-domain Obsidian brain

> **Owner: slot:alpha** (Obsidian-brain domain owner, operator-designated 2026-05-28 — see [[project-alpha-owns-obsidian-brain]]).
> **Status: canonical.** This is the single source of truth for what a "working brain connected to the master PRISM brain" means. Every other slot **clones this pattern and fine-tunes for its domain** — it does NOT re-derive brain wiring from scratch.
> **Worked exemplar:** `mcp-server/src/engines/token-optimization/MEMORY.md` (alpha's own galaxy — the first galaxy made compliant).
> **Audit that produced this:** `state/shared/specs/GALAXY-OBSIDIAN-BRAIN-AUDIT-2026-05-28.md` (workflow wf_ff92b952-169, 5 confirmed findings).

---

## Why this exists

24 slots each independently inventing brain-wiring produced inconsistent partial brains — `token-optimization` populated, `mill` a stub. The audit verdict was **`declared-not-working`** on 2 of 4 connection axes: knowledge is *reachable* (flat-type keyword search works, no brain is severed), but the **master index is blind to every per-galaxy brain** (no back-pointer) and **recall is never verified**. The fix is one alpha-owned template, fanned out by clone-and-tune.

A galaxy `MEMORY.md` is a **BRAIN** only if it both **PULLS FROM** and **PUSHES TO** the master Obsidian vault on a live cadence, **and the master index points back at it.** A static birth-snapshot that the master never references is a *disconnected* brain, not a brain.

---

## The 4 connection axes (a brain is CONNECTED iff all 4 hold)

| Axis | Direction | Live mechanism | Cadence |
|------|-----------|----------------|---------|
| **PULL** | master → galaxy | `prism_memory:semantic_search query="<domain>" topK=20` → reconcile into galaxy `## High-ROI memories` | every session start (NOT a one-time birth copy) |
| **PUSH** | galaxy → master | write `<type>_<slot>_<topic>.md` into `C:/Users/wompu/.claude/projects/H--prism/memory/`; `stop-obsidian-memory-feed.mjs` mirrors C: → `H:/prism/knowledge/memories/<type>/` at Stop | every learning |
| **MASTER-INDEX back-pointer** | master → galaxy (discovery) | one `<=140-char` row in master `MEMORY.md` `## Indexed memories`: `[galaxy:<galaxy>] mcp-server/src/engines/<galaxy>/MEMORY.md — <summary> (slot:<slot>, <date>)` | once per galaxy, kept current |
| **RECALL round-trip** | proof | `prism_memory:semantic_search query="<galaxy>" topK=10` returns ≥1 of this slot's memory IDs | verified, not assumed |

> **R12 / fail-loud note (2026-05-28):** `knowledge/memories/<galaxy>/` per-galaxy dirs are **NOT yet materialized**. Memories live in the flat type buckets (`feedback/ reference/ project/ …`) and are reached by **keyword search** — that IS the working path today. Per-galaxy dirs are gated on the unshipped `scripts/migrate-memories-to-galaxies.mjs`; the dry-run classifier (`classify-memories-by-galaxy.mjs`) currently misroutes ~79% to `business` (additive-keyword over-match), so the migrator is **deferred** until the classifier is fixed. Do NOT assume a `knowledge/memories/<galaxy>/` dir exists.

---

## Required galaxy MEMORY.md structure (clone this shape)

Every `mcp-server/src/engines/<galaxy>/MEMORY.md` MUST open with the `## Master-brain link` header, then carry the standing sections:

```markdown
# <Galaxy> Galaxy MEMORY.md — per-domain working brain

## Master-brain link
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
  — recall: `prism_memory:semantic_search query="<domain> <query>" topK=20`
- **DOWN (push to master):** write `<type>_<slot>_<topic>.md` →
  `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:<galaxy>] …` back-pointer (verify it exists)
- **Last master-sync:** YYYY-MM-DD   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work

## High-ROI memories          # PULL target — top-10 master hits as [[memory-name]] pointers (≤140 chars/line)
## Indexed memories — domain pointers   # this galaxy's own per-file memory index
## Cross-galaxy bridges       # PSN edges OUT (which galaxies consume/produce; bridge shape)
## Known failure modes        # domain-specific R12 lessons
```

The `## Master-brain link` header + `Last master-sync` stamp are what make the brain **connected and non-rotting** — not just present.

---

## Clone-and-tune protocol (every non-alpha slot)

1. **Copy** the `## Master-brain link` header block above into your `engines/<galaxy>/MEMORY.md`, substituting `<galaxy>`, `<slot>`, `<domain>`.
2. **PULL once now:** run the recall query for your domain keywords; seed `## High-ROI memories` with the top-10.
3. **Register the back-pointer:** append your `[galaxy:<galaxy>] …` row to the master `MEMORY.md` `## Indexed memories` — this is the half that's been missing; without it the master is blind to your brain.
4. **Stamp** `Last master-sync:` to today.
5. **Fine-tune** `## High-ROI memories`, `## Cross-galaxy bridges`, `## Known failure modes` for YOUR domain — this is the only part that differs per slot. The connection wiring is identical across all slots (that's the point of the template).
6. **Verify** with the connection gate below before commit.

---

## Connection verification gate (run BEFORE commit — proves CONNECTION, not presence)

```bash
G=mcp-server/src/engines/<galaxy>; SLOT=<slot>; GAL=<galaxy>
# CONN-1 (UP edge)
grep -q '^## Master-brain link' $G/MEMORY.md && grep -q 'H--prism/memory/MEMORY.md' $G/MEMORY.md || echo 'FAIL CONN-1: no master-brain-link header / UP edge'
# CONN-2 (freshness)
grep -qiE 'Last master-sync:' $G/MEMORY.md || echo 'FAIL CONN-2: no master-sync stamp (rotting birth-snapshot risk)'
# CONN-3 (DOWN/backflow edge)
ls H:/prism/knowledge/memories/*/*_${SLOT}_*.md >/dev/null 2>&1 || echo 'FAIL CONN-3: no <slot> learning pushed to master vault'
# CONN-4 (master-index edge — the half missing today)
grep -q "galaxy:${GAL}" C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md || echo 'FAIL CONN-4: master MEMORY.md has no [galaxy:<galaxy>] back-pointer'
# CONN-5 (recall round-trip — advisory; may be empty until the Stop-hook feed lands this session)
# prism_memory:semantic_search query="<galaxy>" topK=10  → assert ≥1 of this session's <slot> memory IDs in hits
```

CONN-1..4 are hard; CONN-5 is advisory (the async Stop-feed may not have landed in-session — re-run after Stop or defer).

---

## Generator wiring (how this template reaches every slot)

`scripts/generate-per-slot-galaxy-buildout-files.mjs` STEP 5 + VERIFICATION GATE point every regenerated brief at THIS template (clone-and-tune), and gate the commit on FAIL 12 (master back-pointer) + FAIL 13 (recall edge). Regenerate after any change here: `node scripts/generate-per-slot-galaxy-buildout-files.mjs`.

## Cross-refs
- [[project-alpha-owns-obsidian-brain]] · [[feedback-obsidian-brain]] (PSN leg #1)
- `state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md` (master protocol — extended with the bidirectional brain section)
- `state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md` (PSN leg #1 = working bidirectional brain)
- `knowledge/wiki/architecture/obsidian-brain-fix-ms0.md` (topic-drift orphaning fix)
- COMMAND-KERNEL-MS0 — the PSK syscall layer (`.claude/kernel/psk.mjs`) the brain/OS composes through; alpha-owned (U-CK11 open).

_Maintained by slot:alpha. Last revised 2026-05-28 (audit wf_ff92b952-169)._
