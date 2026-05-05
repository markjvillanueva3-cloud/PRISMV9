---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-056
title: Fanuc G10 programmatic offset setting for automation
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "G10", "offsets", "automation", "probing", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 6394d24bc5e098da10d3cf6d9d90313ca6f2e9dbbf8e48129b534dae32431d83
mirror_ts: 2026-05-05T13:36:03.934Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc G10 programmatic offset setting for automation

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

G10 enables setting tool and work offsets from within the NC program — essential for automated probing and fixture setup. Work offsets: G10 L2 P(n) X__ Y__ Z__ (L2=standard offsets, P1=G54 through P6=G59). G10 L20 P(n) X__ Y__ Z__ (L20=extended offsets, P1-P48 for G54.1). Tool offsets: G10 L10 P(n) R__ (L10=tool length geometry), G10 L11 P(n) R__ (L11=tool length wear), G10 L12 P(n) R__ (L12=tool radius geometry), G10 L13 P(n) R__ (L13=tool radius wear). In G90 mode values are absolute (replace); in G91 mode values are incremental (add). Combine with G31 probing: probe a surface, read #5063, then G10 L2 to set the work offset automatically. This is the foundation of automated setup on Fanuc controls.

## Related tips

- [[ctrl-065|Fanuc Macro B tool breakage detection pattern]] _(category+tag:5)_
- [[ctrl-053|Fanuc probing with G31 skip signal]] _(category+tag:4)_
- [[ctrl-054|Fanuc G37 automatic tool length measurement]] _(category+tag:4)_
- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:3)_
- [[ctrl-155|Fanuc Macro B skip function G31 — probing and in-process gauging]] _(category+tag:3)_

## Tags

#controller #fanuc #g10 #offsets #automation #probing #controller-fanuc
