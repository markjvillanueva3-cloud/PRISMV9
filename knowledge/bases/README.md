# Obsidian Bases — frontmatter-pivoted vault views (HMEMV08-OBSIDIAN-BASES)

This folder holds Obsidian **Bases** (`.base` files): database-like, frontmatter-pivoted
views over the PRISM knowledge vault. They are **pure config** — valid YAML read directly
by the Obsidian "Bases" core plugin (Obsidian >= 1.9). No engine, dispatcher, or script
generates or consumes them.

> NOTE ON THE UNIT ID: this is **HMEMV08-OBSIDIAN-BASES**. The label `U-HMEMV08`
> already exists in `HERMES-MEMORY-VAULT-MS0.json` as `MemoryDiffEngine` / `memory_diff`
> (an unrelated unit). The distinct suffix avoids envelope confusion.

## The three bases

| File | Pivots | Field | Corpus | Why |
|------|--------|-------|--------|-----|
| `memory-by-type.base` | Memories grouped by kind | `type` | `knowledge/memories/**` | Browse the 4,300+ tagged memories by reference/feedback/tribal-consolidation/project/galaxy-index/user. |
| `wiki-by-domain.base` | Wiki doctrine grouped by domain | `galaxy` | `knowledge/wiki/**` | See per-galaxy doctrine (mill, lathe, wedm, cad, cam, quoting, business, ...). |
| `wiki-by-slot.base` | Wiki doctrine grouped by owning slot | `owner_slot` | `knowledge/wiki/**` | See which NATO slot (golf, delta, lima, ...) owns which doctrine entry. |

`wiki-by-slot` is the **justified 3rd pivot**. The task named "shipped-skills-by-slot
(or a 3rd useful pivot you justify)". Skills are NOT pivotable as a Base: they live at
`.claude/commands/*.md`, **outside the vault root** (`knowledge/`), so Obsidian cannot
index them, and they carry no `slot` frontmatter. `wiki-by-slot` uses the real,
well-distributed `owner_slot` field instead.

## THE LOAD-BEARING RULE: vault root is `knowledge/`

The Obsidian vault root is **`H:/prism/knowledge/`** (its `.obsidian/` config dir lives
there). Inside `.base` files, **all `file.folder` / `file.inFolder()` paths are relative
to `knowledge/`**:

```yaml
# CORRECT — vault-root-relative
- file.inFolder("memories")
- file.inFolder("wiki")

# WRONG — matches ZERO files (silent empty view, the worst failure mode):
- file.inFolder("knowledge/memories")   # double "knowledge/" prefix
- file.inFolder("H:/prism/knowledge")   # absolute path
- 'file.folder == "knowledge"'          # the root itself, never a note's folder
```

The validation test (`scripts/__tests__/hmemv08-bases-validate.test.mjs`) asserts none of
these wrong-root forms appear in any `.base` file.

## How to open / render

These render as interactive tables/cards/lists **only when the Bases core plugin is
enabled** (Settings -> Core plugins -> Bases; Obsidian >= 1.9). It is enabled in this
vault (`.obsidian/core-plugins.json` -> `"bases": true`), verified 2026-06-10.

- Open a `.base` file directly in Obsidian, OR
- Embed a base in any note:

  ```markdown
  ![[memory-by-type.base]]
  ![[wiki-by-domain.base]]
  ![[wiki-by-slot.base#By Owner Slot]]   <!-- a specific named view -->
  ```

Each base also defines a second view (e.g. a `list` or `cards` view) you can switch to
from the view picker in the Bases header.

## Coverage notes (expected, not bugs)

- **Memory `type` coverage:** ~4,300 of the memory files carry a `type:` frontmatter
  field; legacy/un-migrated flat memories without it fall into an empty group in
  `memory-by-type`. As migration progresses, the view auto-benefits — no rebuild needed.
- **Wiki `galaxy` / `owner_slot` coverage:** the wiki tree has tens of thousands of `.md`
  files, but only the curated galaxy-doctrine subset (~180 files each) carries `galaxy` /
  `owner_slot`. The `wiki-by-domain` / `wiki-by-slot` bases **intentionally surface only
  that tagged doctrine subset** — un-tagged pages are suppressed by a
  `galaxy != ""` / `owner_slot != ""` filter so there is no noisy empty group.

## Frontmatter fields used (all verified present in the live corpus 2026-06-10)

| Field | Where | Sample values (count) | Cited example file |
|-------|-------|-----------------------|--------------------|
| `type` | `knowledge/memories/**` | reference (3743), feedback (304), tribal-consolidation (176), project (51), galaxy-index (34), user (6) | `memories/feedback/feedback_ai_first_development.md` |
| `galaxy` | `knowledge/wiki/**` | academy, mill, lathe, wedm, cad, cam, quoting, business, shop-floor, ... (181 files) | `wiki/academy/academy-pedagogy-foundations.md` |
| `owner_slot` | `knowledge/wiki/**` | golf (35), delta (11), zebra/lima (10), ... (179 files) | `wiki/bug-hunting/bug-hunting-source-atlas.md` |

`priority`, `due`, `author` do **not** exist in PRISM frontmatter — never pivot on them.
