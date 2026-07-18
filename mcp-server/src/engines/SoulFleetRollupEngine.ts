/**
 * SoulFleetRollupEngine — HSE05 fleet-wide soul roll-up.
 *
 * Pure-core: given N SlotSouls, produce (a) a JSON rollup of who-refuses-
 * what, who-prefers-which-subagent, domain-coverage matrix; (b) an HTML
 * fleet grid for at-a-glance fleet-wide soul state.
 *
 * @module engines/SoulFleetRollupEngine
 */

import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(s: string): string { return String(s).replace(/[&<>"']/g, (c) => ESC[c] ?? c); }

export interface FleetRollup {
  slot_count: number;
  /** refusal_token → list of slots that refuse it. */
  refusal_coverage: Array<{ refusal: string; slots: string[] }>;
  /** subagent_type → list of slots that prefer it. */
  subagent_preferences: Array<{ subagent_type: string; slots: string[] }>;
  /** hermes_role → list of slots in that role. */
  role_distribution: Array<{ role: string; slots: string[] }>;
  /** Slots with no domain_filter (untargeted by zebra-awareness ranker). */
  slots_without_filter: string[];
  /** Slots with no refuse_list (no hard guardrails declared). */
  slots_without_refuses: string[];
}

const FLEET_CSS = `:root{--bg:#0d1117;--fg:#c9d1d9;--mute:#8b949e;--accent:#58a6ff;--warn:#f0883e;--ok:#3fb950;--bad:#f85149;--card:#161b22;--border:#30363d}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:var(--bg);color:var(--fg);padding:2rem;line-height:1.5}
h1{color:var(--accent);border-bottom:2px solid var(--border);padding-bottom:.5rem}
h2{color:var(--accent);margin-top:2rem}
table{border-collapse:collapse;width:100%;margin:1rem 0;background:var(--card);border:1px solid var(--border)}
th,td{padding:.5rem .75rem;text-align:left;border-bottom:1px solid var(--border)}
th{background:var(--bg);color:var(--accent);font-weight:600}
tr:hover td{background:rgba(88,166,255,0.05)}
.warn{color:var(--warn)}.bad{color:var(--bad)}.ok{color:var(--ok)}
.slot-chip{display:inline-block;padding:.1rem .4rem;margin:.1rem;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-family:monospace;font-size:.85em}`;

export class SoulFleetRollupEngine {
  static rollup(souls: SlotSoul[]): FleetRollup {
    if (!Array.isArray(souls)) throw new Error("SoulFleetRollup.rollup: souls must be array");
    if (souls.length === 0) throw new Error("SoulFleetRollup.rollup: souls must be non-empty");

    const refMap = new Map<string, string[]>();
    const subMap = new Map<string, string[]>();
    const roleMap = new Map<string, string[]>();
    const slots_without_filter: string[] = [];
    const slots_without_refuses: string[] = [];

    for (const s of souls) {
      for (const r of s.refuse_list || []) {
        const list = refMap.get(r) || [];
        if (!list.includes(s.slot)) list.push(s.slot);
        refMap.set(r, list);
      }
      if (s.preferred_subagent_type) {
        const list = subMap.get(s.preferred_subagent_type) || [];
        if (!list.includes(s.slot)) list.push(s.slot);
        subMap.set(s.preferred_subagent_type, list);
      }
      const list = roleMap.get(s.hermes_role) || [];
      if (!list.includes(s.slot)) list.push(s.slot);
      roleMap.set(s.hermes_role, list);

      if (!s.domain_filter || s.domain_filter.length === 0) slots_without_filter.push(s.slot);
      if (!s.refuse_list || s.refuse_list.length === 0) slots_without_refuses.push(s.slot);
    }

    return {
      slot_count: souls.length,
      refusal_coverage: Array.from(refMap.entries())
        .map(([refusal, slots]) => ({ refusal, slots: [...slots].sort() }))
        .sort((a, b) => b.slots.length - a.slots.length),
      subagent_preferences: Array.from(subMap.entries())
        .map(([subagent_type, slots]) => ({ subagent_type, slots: [...slots].sort() }))
        .sort((a, b) => b.slots.length - a.slots.length),
      role_distribution: Array.from(roleMap.entries())
        .map(([role, slots]) => ({ role, slots: [...slots].sort() }))
        .sort((a, b) => b.slots.length - a.slots.length),
      slots_without_filter: slots_without_filter.sort(),
      slots_without_refuses: slots_without_refuses.sort(),
    };
  }

  static renderHtml(r: FleetRollup): string {
    const chip = (s: string) => `<span class="slot-chip">${esc(s)}</span>`;
    const rows = (rows: Array<{ key: string; slots: string[] }>) =>
      rows.map((r) => `<tr><td>${esc(r.key)}</td><td>${r.slots.length}</td><td>${r.slots.map(chip).join("")}</td></tr>`).join("");
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><title>PRISM fleet souls (${r.slot_count})</title><style>${FLEET_CSS}</style></head>
<body><main aria-labelledby="t">
<h1 id="t">PRISM fleet soul rollup — ${r.slot_count} slots</h1>
<section aria-labelledby="role"><h2 id="role">Hermes-role distribution</h2>
<table><thead><tr><th>Role</th><th>#</th><th>Slots</th></tr></thead><tbody>${rows(r.role_distribution.map((x) => ({ key: x.role, slots: x.slots })))}</tbody></table></section>
<section aria-labelledby="ref"><h2 id="ref">Refuse-list coverage</h2>
<table><thead><tr><th>Refusal</th><th>#</th><th>Slots</th></tr></thead><tbody>${rows(r.refusal_coverage.map((x) => ({ key: x.refusal, slots: x.slots })))}</tbody></table></section>
<section aria-labelledby="sub"><h2 id="sub">Preferred subagent_types</h2>
<table><thead><tr><th>Subagent</th><th>#</th><th>Slots</th></tr></thead><tbody>${rows(r.subagent_preferences.map((x) => ({ key: x.subagent_type, slots: x.slots })))}</tbody></table></section>
<section aria-labelledby="gap"><h2 id="gap">Gaps</h2>
<p>Slots without domain_filter (untargeted by zebra-awareness ranker): <span class="warn">${r.slots_without_filter.length}</span></p>
<p>${r.slots_without_filter.map(chip).join("")}</p>
<p>Slots without refuse_list (no hard guardrails): <span class="bad">${r.slots_without_refuses.length}</span></p>
<p>${r.slots_without_refuses.map(chip).join("")}</p>
</section>
</main></body></html>`;
  }

  static renderSummary(r: FleetRollup): string {
    return `[FLEET-SOULS] n=${r.slot_count} refusals=${r.refusal_coverage.length} subagents=${r.subagent_preferences.length} roles=${r.role_distribution.length} unfiltered=${r.slots_without_filter.length} no-refuses=${r.slots_without_refuses.length}`;
  }
}

export const soulFleetRollupEngine = SoulFleetRollupEngine;
