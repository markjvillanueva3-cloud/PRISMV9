# PSN Synergy Snapshot

Generated: 2026-06-09T09:29:08.516Z
Source: `scripts/psn-synergy-collect.mjs`

## Per-Leg Inventory

| Leg | Owner | Node Count | Outgoing Refs (top peers) |
|-----|-------|-----------:|---------------------------|
| obsidian_brain | alpha | 5000 | formulas: 8854 · wiki: 7067 · engines: 874 |
| memories | alpha | 229 | wiki: 2226 · engines: 721 · system_viz: 300 |
| wiki | alpha | 5000 | memories: 26263 · obsidian_brain: 26263 · system_viz: 3703 |
| engines | papa | 3633 | memories: 262 · formulas: 202 · wiki: 163 |
| algorithms | tango | 173 | engines: 18 · formulas: 5 · memories: 2 |
| formulas | tango | 5000 | engines: 8 · tribal: 2 |
| tribal | golf | 10555 | memories: 191 · obsidian_brain: 191 · wiki: 190 |
| system_viz | sierra | 20702 | wiki: 19895 · prism_os: 8265 · engines: 3273 |
| nn_gnn | india | 82 | engines: 67 · tribal: 14 · formulas: 7 |
| prism_os | papa | 99 | engines: 11 |
| prism_ai | india | 658 | engines: 551 · nn_gnn: 49 · tribal: 27 |

Pipe this snapshot into `psn_synergy_inspect` to get ranked bridge candidates:

```bash
# via MCP dispatcher (caller passes inventories[] from this snapshot)
# prism_intelligence({ action: 'psn_synergy_inspect', params: { inventories: <snapshot.inventories> } })
```