# Galaxy MS1 Fleet Nightly Kickstart (2026-05-27 slot:alpha)

> **Operator directive (verbatim):** *"can you coordinate it, send them handoffs on what to do and how to gain context then give me a goal, loop yolo mode prompt to give to each one so they run all night"*
>
> **Available slots tonight:** bravo · papa · quebec · november · golf (5 chats)
> **Not available tonight:** sierra (HMEMV04-06) · charlie (D1 already-shipped alpha) · hotel (D2) · lima (C2 AHMAD)
> **Already done by alpha tonight:** D1 quoting refine

---

## Per-slot launch instructions

For each slot below: paste the **launch prompt** verbatim into a fresh chat after invoking `/checkin-<slot>`. The goal hook will keep that chat in /loop /yolo mode until the slot's units are done.

---

### 🛠 SLOT: golf (hygiene + root-CLAUDE.md privileges)

**Context to read first** (5 files, ~3 min):
1. `state/shared/specs/REQ-CLAUDE-MD-DOCTRINE-POINTER-FOR-GOLF-2026-05-26.md` — your A3 + D3 work
2. `state/shared/specs/GALAXY-MS1-FLEET-PICKUP-PACK-2026-05-27.md` Recipes 1+2+10 — your A2 + D3 + B4 work
3. `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` units A1, A2, A3, B4, D3
4. `state/shared/broken-wikilink-routing.json` (alpha ran the classifier; 67 safe-aliasable + 1279 create-stub + 1998 delete-orphan await your bucket-by-bucket review)
5. `.claude/hooks/pre-create-marketplace-dup-check.mjs` (alpha shipped this; you wire into `H:/.claude/settings.json` PreToolUse chain — mirror via c-to-h)

**Unit batch** (4 P0 + 1 P1):
- **A3** — append the 7-line `§DOMAIN-GALAXY-DOCTRINE-MS0` pointer to root `H:/prism/CLAUDE.md` per the REQ spec
- **D3** — append JULIETT-12CHAT-ALLOCATION amendment per Fleet Pickup Pack Recipe 2 (proposes lathe/wedm/cad/cam/shop-floor/cad-fusion-live/tribal-knowledge/compliance-safety/quality soul slots — choose ONE assignment per galaxy)
- **A2** wire — add the `pre-create-marketplace-dup-check.mjs` to `H:/.claude/settings.json` PreToolUse chain (matcher `^Write$`, after existing pre-checks). Mirror via c-to-h.
- **B4 execute** — run `node H:/prism/scripts/fix-broken-wikilinks.mjs`, review 67 aliasable bucket, write a `scripts/apply-wikilink-aliases.mjs` companion that takes the JSON + executes only the aliasable bucket (operator approves before create-stub or delete-orphan buckets)
- **A1** — `claude plugin marketplace add wshobson/agents` (operator-touch — golf coordinates with operator; if operator unavailable, defer to morning)

**Launch prompt (copy-paste):**
```
/checkin-golf
/goal [ ship A3 + D3 + A2-wire + B4-aliasable + A1 — all per `state/shared/specs/GALAXY-MS1-FLEET-NIGHTLY-KICKSTART-2026-05-27.md` §golf | commit each as [MAIN] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-<UNIT>-GOLF ] /loop [10m] /goal /yolo-mode
```

---

### 🛠 SLOT: bravo (workhorse — has 365 in-flight queue, owns mill memory pilot)

**Context to read first** (4 files, ~3 min):
1. `state/shared/specs/GALAXY-MS1-FLEET-PICKUP-PACK-2026-05-27.md` Recipe 5 — your G1 follow-up + memory migration
2. `state/shared/memory-galaxy-routing.json` — alpha's C1 classifier output: 8032 classified + 2057 cross-galaxy + 0 unclassified across 10089 memos
3. `mcp-server/src/engines/mill/MEMORY.md` — your refinement target (alpha's stub awaits real content)
4. `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` units C1 + G1

**Unit batch** (2 P0 + 1 P1):
- **C1-execute** — write `scripts/migrate-memories-to-galaxies.mjs` (companion to alpha's `classify-memories-by-galaxy.mjs`). Reads `memory-galaxy-routing.json`. For the **mill bucket ONLY** (pilot): `git mv` each mill-classified memory from `knowledge/memories/{feedback,reference,project}/` into `knowledge/memories/mill/{feedback,reference,project}/` + append redirect-stub at old path. Operator approves output BEFORE you extend to other galaxies.
- **mill/MEMORY.md refine** — after C1 mill pilot ships, mill/MEMORY.md gets real content (the migrated memory names) instead of the stub-index alpha shipped. Auto-populate from filesystem walk.
- **G1 validation** — alpha shipped `generate-per-galaxy-engine-digest.mjs` (917 engines partitioned across 10 galaxies). 10 more galaxies (mit-curriculum, pdf-corpus, etc.) need filename-heuristic regex additions. Extend `GALAXY_FILENAME_PREFIXES` map.

**Launch prompt (copy-paste):**
```
/checkin-bravo
/goal [ ship C1-execute mill-only pilot + mill/MEMORY.md auto-populate + G1 regex extension per `state/shared/specs/GALAXY-MS1-FLEET-NIGHTLY-KICKSTART-2026-05-27.md` §bravo | OPERATOR APPROVAL required before C1 extends past mill bucket | commit as [MAIN] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-<UNIT>-BRAVO ] /loop [10m] /goal /yolo-mode
```

---

### 🛠 SLOT: papa (canvas + viz specialist)

**Context to read first** (4 files, ~3 min):
1. `knowledge/PRISM-System-Map.canvas` (existing auto-generated) — your B5 extension target
2. `state/shared/system-viz/staging/galaxy-roosts/` (alpha just generated 21 roost JSONs; you wire into /system-viz)
3. `scripts/generate-galaxy-features.mjs` (alpha's E3 generator)
4. `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` units B5 + E3

**Unit batch** (2 P1):
- **B5** — extend the existing `PRISM-System-Map.canvas` regen pipeline to ALSO emit galaxy-cluster nodes (one per galaxy from the 21 staging JSONs) + galactic-center "star" icons at green-pillar galaxies + soul-slot arc-edges. Per SCOPE-EXPANSION §Q6 #5.
- **E3 wire** — alpha shipped `generate-galaxy-features.mjs` + 21 JSONs at `state/shared/system-viz/staging/galaxy-roosts/`. Add this dir to `mcp-server/data/regen-viz.config.json` FAST[] array so /system-viz auto-loads on next regen. Verify by opening /system-viz + checking galaxy-lens overlay renders.

**Launch prompt (copy-paste):**
```
/checkin-papa
/goal [ ship B5 canvas galaxy-cluster extension + E3 wire-to-regen-viz per `state/shared/specs/GALAXY-MS1-FLEET-NIGHTLY-KICKSTART-2026-05-27.md` §papa | commit as [MAIN] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-<UNIT>-PAPA ] /loop [10m] /goal /yolo-mode
```

---

### 🛠 SLOT: quebec (fresh slot — assigned as cad-soul tonight)

**Context to read first** (4 files, ~3 min):
1. `mcp-server/src/engines/cad/CLAUDE.md` — alpha shipped honest stub; you refine §5+§6 like alpha did for quoting
2. `mcp-server/data/docs/galaxies/cad/ENGINE_DIGEST.md` — alpha's G1 emitted 107 cad engines for you to know surface area
3. `mcp-server/src/engines/cad/MEMORY.md` — your refinement target
4. `state/shared/specs/GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md` — formalize quebec=cad-soul amendment

**Unit batch** (1 unit + soul assignment):
- **cad/CLAUDE.md §5+§6 refine** — extract cad-domain gotchas from cad-* commit history. Use the pattern alpha used for D1 quoting refine (committed earlier this iter): `git log --grep "cad" --oneline | head -25` → `git show --no-patch --format` on 5 most-recent → extract concrete gotchas. Refine the stub §5+§6 with real content.
- **soul assignment** — write a single-line JULIETT-12CHAT-ALLOCATION amendment claiming quebec as cad-soul (golf actually edits root CLAUDE.md; you write the proposed text + signal to golf via AGENT_CHAT.jsonl)

**Launch prompt (copy-paste):**
```
/checkin-quebec
/goal [ claim cad-soul + refine engines/cad/CLAUDE.md §5+§6 from cad-* commit archaeology + refine engines/cad/MEMORY.md per `state/shared/specs/GALAXY-MS1-FLEET-NIGHTLY-KICKSTART-2026-05-27.md` §quebec | use D1 quoting refine pattern alpha shipped earlier as template | commit as [MAIN] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-D-CAD-REFINE-QUEBEC ] /loop [10m] /goal /yolo-mode
```

---

### 🛠 SLOT: november (fresh slot — assigned as shop-floor-soul tonight)

**Context to read first** (4 files, ~3 min):
1. `mcp-server/src/engines/shop-floor/CLAUDE.md` — alpha shipped honest stub
2. `mcp-server/data/docs/galaxies/shop-floor/ENGINE_DIGEST.md` — 9 shop-floor engines (MachineLive*, Traveler, etc.)
3. `mcp-server/src/engines/shop-floor/MEMORY.md` — refinement target
4. Same D-pattern as quebec — refine §5+§6 from `MachineLive` + `Traveler` commit history

**Unit batch** (1 unit + soul assignment):
- **shop-floor/CLAUDE.md §5+§6 refine** — use the alpha D1 quoting refine pattern. Extract from MachineLive* + Traveler* commit history.
- **soul assignment** — claim november as shop-floor-soul; write amendment text for golf.

**Launch prompt (copy-paste):**
```
/checkin-november
/goal [ claim shop-floor-soul + refine engines/shop-floor/CLAUDE.md §5+§6 from MachineLive*+Traveler* commit archaeology + refine engines/shop-floor/MEMORY.md per `state/shared/specs/GALAXY-MS1-FLEET-NIGHTLY-KICKSTART-2026-05-27.md` §november | commit as [MAIN] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-D-SHOPFLOOR-REFINE-NOVEMBER ] /loop [10m] /goal /yolo-mode
```

---

## Coordination contract

- **No two slots edit the same file** without `prism_context:claim_file` lock (per CLAUDE.md §multi-chat). Each slot above has a dedicated set of files; no overlaps.
- **All slots commit through their slot-worktree** per `feedback_commit_to_slot_worktree`. Each slot's `/checkin-<slot>` step 2c cuts over to the worktree automatically.
- **AGENT_CHAT.jsonl** is the cross-slot bus — quebec/november post their soul-assignment proposals there for golf to pick up + ship via D3.
- **R12 fail-loud** in every commit — if you hit a blocker mid-iter, surface it in the commit body + tick the loop with `--note "blocked: <reason>"`.
- **Auto-handoff at /compact** — each slot's precompact hook writes its slot-keyed handoff so the next replacement chat can resume mid-iter without losing context.

## Expected fleet-wide outcome by morning

If all 5 slots run through the night at ~1 unit per 10-min iter:
- **golf**: 5 units shipped (A3, D3, A2-wire, B4-aliasable, A1 if operator-approved) → MS1 +5
- **bravo**: 3 units (C1-mill-pilot, mill/MEMORY.md auto-populate, G1 regex extension) → MS1 +3
- **papa**: 2 units (B5 canvas, E3 wire) → MS1 +2
- **quebec**: 1 unit + cad-soul (cad refine) → MS1 +1 + soul-amendment
- **november**: 1 unit + shop-floor-soul (refine) → MS1 +1 + soul-amendment

**Total morning estimate: MS1 at 30/26 (overshoot due to soul-amendments + bravo's regex extension counting as separate units) — full Phase-A doctrine + most of Phase-B+C+D substrate complete.**

Remaining slots needed for next batch (sierra/charlie/hotel/lima): B1-B3 HMEMV04-06, D2 hotel business refine, C2 AHMAD curriculum. These ship daytime when those slots come online.

## Cross-refs

- Parent doctrine: [`DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- MS1 envelope: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json`
- Session attestation (current alpha state): [`GALAXY-MS1-SESSION-ATTESTATION-2026-05-27.md`](GALAXY-MS1-SESSION-ATTESTATION-2026-05-27.md)
- Fleet Pickup Pack (scaffolding recipes): [`GALAXY-MS1-FLEET-PICKUP-PACK-2026-05-27.md`](GALAXY-MS1-FLEET-PICKUP-PACK-2026-05-27.md)
- Graduation gate (governs soul assignments): [`GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md`](GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md)
