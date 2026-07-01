# MEMORY + WIKI Optimization — Scope & Assessment (2026-05-26, slot:bravo)

**Triggered by:** operator /goal `read both articles, scope and assess current build and what we need to do to optimize memory and wiki usage, memory and wiki generation, allocation of memory when needed`
**Articles this session (4 total, all 2026-05-23 to 05-25):**
1. Tony Simons — *Hermes Dreaming v0.1.0* (scan→stage→diff→validate→apply→discard with receipts)
2. mr-r0b0t / Microsoft — *Webwright* (terminal-native; every browser session → reusable skill; workspace = product)
3. dunik — *The 4 Layers: From Sticky Note to Self-Improving* (L1 sticky, L2 Projects, L3 living file LEAN!, L4 nightly consolidation with NEW file + review)
4. **KSimback — *The Hermes Agent Memory Guidebook* (3-layer Hermes: 2 tiny markdown caps + SQLite archive + 8 MemoryProvider plug-ins)** ← **most actionable**

Companion memory: [[reference_hermes_dreaming_and_webwright_2026_05_26]]

## 1. Measured current state — PRISM is hitting all 5 KSimback warning signs

### Eager-load baseline (per chat, per turn)
| Asset | Size | Auto-loaded? |
|-------|------|-------------|
| `H:/prism/CLAUDE.md` (project) | **73.9 KB** | ✅ every session |
| `C:/.claude/projects/H--prism/memory/MEMORY.md` (auto-memory index) | **24.4 KB** (already over 22 KB ceiling) | ✅ every session |
| `H:/.claude/CLAUDE.md` (global) | 19.7 KB | ✅ every session |
| **Subtotal eager-load** | **~118 KB** | ✅ × 26 chats × N turns |
| Per-prompt injections (15+ hooks) | ~5-10 KB/turn | ✅ every UserPromptSubmit |

### On-disk substrate (already exists, mostly under-used for recall)
| Asset | Size | Usage |
|-------|------|-------|
| Per-file memory dir | 641 files / 4.3 MB | Only top-90 indexed in MEMORY.md; rest accessible via `memory_search` |
| Obsidian memory mirror | 9,753 files / 45 MB | Searchable; rarely queried by chats |
| Wiki | 35,890 files / **273 MB** | Searchable via `master_index_query`; mostly write-only |
| BUILD_STATE.json | 222 KB | 13h stale, keyword-gated inject |

### KSimback's 5 warning signs — PRISM scorecard
- ✅ **Agent feels slower** — every UserPromptSubmit fires 15+ injectors
- ✅ **Token bills creeping up** — 118 KB × 26 chats × every turn ≈ ~3 MB baseline load
- ✅ **Agent contradicting itself** — see CLAUDE.md `## Recent regressions` section (8+ silent-drift incidents in last 7d)
- ✅ **Context overflow mid-conversation** — already in YELLOW zone at 50% this session before real work
- ✅ **Work isn't getting better** — operator asking this exact question proves the diagnostic

**5/5 = textbook "you went too heavy."**

### Hermes reference sizes (KSimback's measured Hermes defaults)
| File | Hermes cap | PRISM today | Ratio |
|------|-----------|-------------|-------|
| MEMORY.md | **~2.2 KB** | 24.4 KB | **11×** |
| USER.md | ~1.4 KB | (doesn't exist; stuffed in CLAUDE.md) | n/a |
| Combined notebook | ~3.6 KB | 24.4 KB | **6.8×** |

PRISM's own CLAUDE.md says: *"past ~200 lines total, CLAUDE.md compliance collapses."* Current project CLAUDE.md = **880 lines / 74 KB** — **4.4× over our own stated ceiling**.

## 2. The four article frames, distilled to one architecture

All four articles converge on a 4-layer model. PRISM has pieces of each but inverted on size discipline.

| Layer | dunik name | KSimback Hermes | PRISM today | Gap |
|-------|-----------|-----------------|-------------|-----|
| **L1** | Sticky note (Claude memory setting) | (not in Hermes — agent identity is L1.5) | CLAUDE.md identity sections | OK |
| **L2** | Projects (workspace instructions) | (Hermes uses CLAUDE.md as L1+L2) | Slot souls + CLAUDE.md role sections | OK |
| **L3** | Living memory file — **KEEP IT LEAN + STRUCTURED** | `~/.hermes/MEMORY.md` (2.2 KB cap) + `USER.md` (1.4 KB cap) + SQLite session DB | MEMORY.md 24.4 KB + CLAUDE.md 74 KB + (no USER.md) + `.swarm/memory.db` exists but rarely queried | **CATASTROPHICALLY OVER-STUFFED** |
| **L4** | Consolidate while you sleep — **WRITE NEW FILE + REVIEW** | (community/Layer 3: GBrain "dream cycles") | `memory-compress-v2.mjs` + `stop-obsidian-memory-feed.mjs` exist but **DIRECT-MUTATE** — exactly dunik mistake #4 | **Auto-deploy without review = the named anti-pattern** |
| **L2 plug-ins** | (not in dunik) | 8 MemoryProvider providers (Honcho/Mem0/Hindsight/Holographic/OpenViking/RetainDB/ByteRover/Supermemory) — pick ONE | No abstraction; we hard-code Obsidian-feed + `memory_search` + `master_index_query` as bolt-ons | **No MemoryProvider ABC = can't swap providers cleanly** |
| **L3 community** | (not in dunik) | GBrain (KG + dream cycles), Mnemosyne (tiered + temporal recall), PLUR (cross-agent), yantrikdb (explainable) | /system-viz IS a KG; tribal-by-domain IS tiered recall; chat-bus IS cross-agent — but none are wired as "memory providers" | Existing capability sits adjacent, never named/wired into the recall path |

## 3. Concrete optimization plan — 4 shifts, all backward-compatible

### Shift A — Cap & restructure Layer 3 to Hermes sizing (highest leverage, simplest)
Target ratios from Hermes:
- MEMORY.md: 24.4 KB → **3 KB** (8× reduction). Keep ONLY standing doctrine pointers (feedback_*). Move "Recent work" list out.
- NEW `USER.md` at ~1.5 KB — operator preferences, role, escalation paths. Today these are scattered in CLAUDE.md.
- `H:/prism/CLAUDE.md` (project): 74 KB → **~10 KB**. Move all `## Recent regressions`, milestone summaries, and inline architecture sections into `knowledge/wiki/architecture/` (already exists as a pattern). CLAUDE.md becomes the **doctrine pointer index**, not a content store (its own stated charter, see [[KNOWLEDGE VAULT — 5-namespace schema]]).
- The "Recent work" list moves to `state/shared/memory-recent.json` (machine-readable, NOT auto-loaded). SessionStart hook emits ≤1 KB summary on demand.

**Expected fleet savings:** 118 KB → ~15 KB per chat per turn ≈ **8× reduction × 26 chats × N turns**.

### Shift B — Consolidation goes through receipts (Hermes Dreaming + dunik mistake #4)
- `memory-compress-v2.mjs` and `stop-obsidian-memory-feed.mjs` currently direct-write to live state. The dunik article names this as mistake #4: *"Auto-deploying a consolidation you didn't read."*
- Re-route both through the proposed **DREAM-RECEIPT-MS0** (already specced earlier this session in `HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md`). Writes land in `state/shared/dream-artifacts/<id>/` with manifest+REPORT+sources+proposals.jsonl; operator approves via `/dream-review` or `dream_apply --approve all`.
- Backup before apply (Hermes Dreaming default).
- Keep direct-write as the off-ramp behind `PRISM_DREAM_STAGE_MEMORY=0` so the migration is non-breaking.

### Shift C — Introduce MemoryProvider abstraction (Hermes L2 lesson)
- New `mcp-server/src/engines/memory/MemoryProvider.ts` ABC with the Hermes contract: `read()`, `search(query, k)`, `add()`, `replace()`, `remove()`, `consolidate()` (stages to dream-receipt). One named provider per chat (slot config), default = current Obsidian-feed.
- Wrap existing capability as **3 first-class providers**:
  1. **`obsidian-feed`** (default, current behavior — direct vault write)
  2. **`obsidian-receipt`** (dream-receipt staged write, opt-in via slot soul)
  3. **`prism-kg`** (treats /system-viz + master_index as the memory store — closest analog to Hermes' GBrain, since we already HAVE the KG)
- Future-extension hooks: Mnemosyne (tiered+temporal recall — fits PRISM's chat-history scrubber-record-replay surface), PLUR (cross-agent — fits chat-bus + per-slot handoffs), yantrikdb (explainable — fits our 3-of-3 scrutiny gate's rationale need).

### Shift D — Wiki generation via Webwright pattern (273 MB substrate, manual today)
- Wiki entries are currently written by hand on /forge / /scrutinize / /pdf-learn. 35,890 entries; long tail rots.
- **Webwright-style auto-promotion:** every successful `/loop` iteration auto-stages a wiki-entry stub via dream-receipt for operator approval. The skill `/pdf-learn` and `/scrutinize` already produce the raw material — the stub generator just composes that into the wiki format and stages it.
- Existing `WikiIndexMaintainerEngine` becomes the receipt-staging consumer. Wiki index regen also routes through dream-receipt so the index never gets a silent rewrite.

## 4. Format question (HTML vs MD) — settled

**HTML is WORSE.** Confirmed by inspection:
- ~30-40% more bytes per line for markup that the harness ignores (truncation is byte-count, not structure-aware)
- LLM attention is native-MD; HTML tags add noise to retrieval
- The semantic value HTML *could* add (programmatic indexing) is already covered by Obsidian frontmatter + wiki schema + master_index — far cheaper

**Format is not the lever. Eager-load-vs-on-demand-recall is the lever.** Shifts A-D are about flipping that switch.

## 5. Proposed milestone — MEMORY-WIKI-OPTIMIZATION-MS0

**Owner:** golf slot (this is cross-cutting hygiene, not mill-specialist work; bravo can also do it but the soul says specialist-mill). Operator picks. Composes with DREAM-RECEIPT-MS0 + WEBWRIGHT-SKILL-PROMOTION-MS0 (specced same day).

| Unit | Title | Effort | Notes |
|------|-------|--------|-------|
| U-MWO01 | CLAUDE.md compression to ≤10 KB; move sections to wiki | M | Mechanical — already a stated charter, just enforce it |
| U-MWO02 | MEMORY.md compression to ≤3 KB; "Recent work" → `memory-recent.json` | S | Watchdog already exists (`scripts/memory-size-watch.mjs`) |
| U-MWO03 | NEW `USER.md` at ~1.5 KB; auto-load alongside CLAUDE.md | S | Hermes-pattern operator-prefs file |
| U-MWO04 | SessionStart hook `memory-pulse-inject.mjs` — emits ≤1 KB recent-memory summary instead of full MEMORY.md | S | Replaces eager-load with on-demand |
| U-MWO05 | `MemoryProvider` ABC + 3 first-class implementations (`obsidian-feed`, `obsidian-receipt`, `prism-kg`) | L | Real architectural unit; ~30 vitest cases |
| U-MWO06 | Re-route `memory-compress-v2` + `stop-obsidian-memory-feed` through dream-receipt (Shift B) | M | Backward-compat with `PRISM_DREAM_STAGE_MEMORY=0` |
| U-MWO07 | Wiki-entry stub auto-stager hook (Shift D) — on successful /loop iter, prepare wiki dream-receipt | M | Reuses /pdf-learn + /scrutinize raw material |
| U-MWO08 | Per-prompt injection budget cap — measure + enforce ≤3 KB per UserPromptSubmit across all 15+ injectors | M | Dedup-suppression is already in (slot-soul-inject), apply to the rest |
| U-MWO09 | Validation: measure fleet token-save (expected ≥80% baseline reduction) | S | Compare 118 KB → ~15 KB metric |

**Total: 9 units (3 S + 4 M + 1 L + 1 S). ~1-2 days. Composes cleanly with the two milestones I specced earlier this session.**

## 6. Decision points for operator

1. **Approve Shift A immediately?** It's mostly mechanical — CLAUDE.md/MEMORY.md compression is already our stated charter, we just haven't enforced it. Single chat can ship in one /loop. Lowest risk, highest immediate fleet benefit.
2. **Owner for MEMORY-WIKI-OPTIMIZATION-MS0?** Cross-cutting → golf (hygiene) is natural fit. Operator pick.
3. **Compose all three milestones (DREAM-RECEIPT + WEBWRIGHT-SKILL-PROMOTION + MEMORY-WIKI-OPTIMIZATION) into a single super-milestone**, or ship in dependency order (DREAM-RECEIPT first since the other two consume it as the staged-write substrate)?
4. **Adopt Hermes' MemoryProvider naming verbatim** (KSimback names: `MemoryProvider.add/replace/remove/search`) for interop with future community plug-ins, or PRISM-namespace (`prism_memory.*`)? Verbatim = future PLUR/GBrain/Mnemosyne adoption is one config line; namespaced = no naming conflict if PRISM ever links the Hermes SDK directly. Recommend verbatim.

## 7. What this does NOT solve

- The 15+ per-prompt injectors are already firing; this spec only addresses the eager-load CLAUDE.md/MEMORY.md axis. Per-prompt injection budget is U-MWO08, but a deeper audit of which injectors actually change agent behavior (per dunik's filter: "would this change how the agent acts next time?") is a separate spec.
- The 273 MB wiki has a write-only problem (long tail rots) — Shift D adds generation discipline but doesn't sweep existing rot. A separate /wiki-prune skill would do that.
- The MemoryProvider abstraction enables adopting GBrain/Mnemosyne/etc., but actually adopting them is downstream work.

## Citations
- @tonysimons_ Hermes Dreaming v0.1.0 — https://x.com/tonysimons_/status/2059119768662065523 + https://github.com/asimons81/hermes-dreaming
- @mr_r0b0t Microsoft Webwright — https://x.com/mr_r0b0t/status/2059026191646945515 + https://microsoft.github.io/Webwright/ + https://github.com/microsoft/Webwright
- @dunik_7 4-Layer agent memory — https://x.com/dunik_7/status/2058905748579418615
- @KSimback Hermes Agent Memory Guidebook — https://x.com/KSimback/status/2058262328496554021 + https://hermesatlas.com/
