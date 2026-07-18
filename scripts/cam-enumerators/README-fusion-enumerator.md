# Fusion 360 live parameter enumerator — operator runbook (slot:kilo, CAM galaxy)

**Goal:** close the Fusion catalog gap (`cam-functions/fusion360/`, currently **59%**, 497/847) with **grounded** parameters pulled straight from your running Fusion 360 seat — the only source that has them (Fusion's defaults are not in any text-parseable local file; see `state/shared/specs/CAM-GALAXY-COMPLETENESS-AUDIT-2026-05-29.md` §"Phase 2 grounded-source FEASIBILITY"). Nothing is invented — every value comes from the live API.

## What you run

1. **`fusion-cam-param-enumerator.py`** — a Fusion 360 *Script* (this folder). Reads the active document's CAM operations and dumps every parameter the API exposes to a JSON file.
2. **`node scripts/ingest-fusion-cam-enum.mjs <dump.json>`** — merges the dump(s) into `cam-functions/fusion360/_live-enum.json` (non-destructive; de-duped; the `CAMCatalogQueryEngine` picks it up automatically).
3. **`node scripts/cam-catalog-completeness-audit.mjs`** — confirms coverage rose.

## Step-by-step

### A. Run the enumerator inside Fusion
1. Launch Fusion 360. **Open a CAM-rich document first** — the script only sees operations that exist in the open doc. Best sources (most strategies → most coverage):
   - `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` (ELECTRODES, JM, MANNY, OKUMA, ROKU ROKU subdirs — real JM Die programs)
2. Switch to the **MANUFACTURE** workspace (the script fails loud with a clear message if there's no CAM product).
3. `Utilities` tab → `ADD-INS` → `Scripts and Add-Ins` → `Scripts` tab → green **`+`** → browse to **this folder** → select `fusion-cam-param-enumerator.py`.
4. Select it in the list → **Run**.
5. A dialog reports the operation/parameter counts and the output path. Default output:
   `H:/prism/scripts/cam-enumerators/_raw/fusion-enum-<doc>-<timestamp>.json` (falls back to your home dir if that path isn't writable).
6. **Repeat against several strategy-diverse documents** — each run adds whatever operation types that doc contains. Adaptive/contour/scallop/parallel/multi-axis/turning docs together cover the universe.

### B. Ingest the dumps
```bash
cd H:/prism                       # or your slot worktree
node scripts/ingest-fusion-cam-enum.mjs scripts/cam-enumerators/_raw/fusion-enum-*.json
```
- Merges all dumps, de-dups by (operation, parameter), writes `mcp-server/data/cam-functions/fusion360/_live-enum.json`.
- A later dump that grounds a value a prior dump couldn't read **upgrades** it.
- Numeric params ship **without** min/max (Fusion's API doesn't expose ranges) — flagged `rangeSource:"not-exposed-by-fusion-api"`, never guessed.

### C. Confirm the gain
```bash
node scripts/cam-catalog-completeness-audit.mjs
# fusion360 coverage % and op/param counts should rise toward 100%.
```

## Grounding guarantees (why this is safe for G-code)
- `default` comes **only** from the live API value.
- min/max are **never fabricated** — absent ranges stay absent (flagged), not invented.
- a param whose value the API wouldn't return ships `unverified:true` with a note.
- `source` records the exact Fusion build string from your seat.

## Files
| File | Role |
|---|---|
| `fusion-cam-param-enumerator.py` | the Fusion Script (read-only enumeration → JSON) |
| `../ingest-fusion-cam-enum.mjs` | dump → catalog merge (pure fns unit-tested in `../ingest-fusion-cam-enum.test.mjs`) |
| `_raw/` | enumerator output lands here (runtime; git-ignored content) |

## Next systems
Same pattern extends to Mastercam (C-Hook/NET-Hook) and is how hyperMILL already reached 152% (structured DB/menu export). Mastercam enumerator is the next build once Fusion coverage is proven on real dumps.
