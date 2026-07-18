// scripts/galaxy-verify.mjs — galaxy completeness scorecard (GALAXY-KIT-MS0, slot:bravo 2026-05-29).
// CONTENT-level checks (not just file-existence) for a slot's galaxy, per the canonical kit
// (state/shared/specs/GALAXY-CANONICAL-KIT-2026-05-29.md). Single-sourced slot->galaxy map.
// CLI:  node scripts/galaxy-verify.mjs <slot>     |     node scripts/galaxy-verify.mjs --all
// Exit 0 = PASS, 1 = at least one FAIL. Read-only; never mutates.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SLOT_GALAXY_MAP, galaxyForSlot, UNMAPPED_SLOTS } from './lib/slot-galaxy-map.mjs';

const REPO = process.env.PRISM_REPO || 'H:/prism';
const MASTER_MEM = process.env.PRISM_MASTER_MEM || 'C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md';

const readSafe = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const fileExists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

export function verifyGalaxy(slot) {
  const checks = [];
  const add = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail });
  const g = galaxyForSlot(slot);
  if (!g) {
    add('SLOT_GALAXY_MAP entry', false,
      UNMAPPED_SLOTS.includes(slot) ? `'${slot}' intentionally unmapped (no galaxy assigned)` : `'${slot}' not in map`);
    return { slot, galaxy: null, checks, pass: false };
  }
  add('SLOT_GALAXY_MAP entry', true, g);

  const dir = `${REPO}/mcp-server/src/engines/${g}`;
  for (const f of ['CLAUDE.md', 'MEMORY.md', 'PATHS.md', 'TOOLBELT.md']) {
    add(`engines/${g}/${f} exists`, fileExists(`${dir}/${f}`));
  }
  const mem = readSafe(`${dir}/MEMORY.md`) || '';
  const claude = readSafe(`${dir}/CLAUDE.md`) || '';

  add('MEMORY.md "## Master-brain link"', /##\s*Master-brain link/i.test(mem));
  add('MEMORY.md "Last master-sync" stamp', /Last master-sync/i.test(mem));
  const ptrs = (mem.match(/\[\[[^\]]+\]\]/g) || []).length;
  add('MEMORY.md High-ROI/Indexed pointers >=10', ptrs >= 10, `${ptrs} [[...]] pointers`);
  add('MEMORY.md "## Known failure modes" (non-empty)', /##\s*Known failure modes?\b[\s\S]{40,}/i.test(mem));
  add('MEMORY.md cross-galaxy bridges section', /##\s*(Cross-galaxy bridges|Related galaxies)/i.test(mem));
  add('MEMORY.md "## Initial state"', /##\s*Initial state/i.test(mem));

  add('CLAUDE.md "## Related galaxies"', /##\s*Related galaxies/i.test(claude));
  add('CLAUDE.md closed-loop-with-india block', /Closed-loop integration with india/i.test(claude));

  add(`master MEMORY [galaxy:${g}] back-pointer`, (readSafe(MASTER_MEM) || '').includes(`[galaxy:${g}]`));

  const soul = readSafe(`${REPO}/state/shared/slot-souls/${slot}.md`) || '';
  add(`slot-souls/${slot}.md (domain_filter != any)`, soul.length > 0 && !/domain_filter:\s*any\b/i.test(soul));

  const wikiIdx = readSafe(`${REPO}/knowledge/wiki/index.md`) || '';
  const wikiHits = (wikiIdx.match(new RegExp(`\\b${g.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi')) || []).length;
  add(`>=3 wiki refs for ${g} (heuristic)`, wikiHits >= 3, `${wikiHits} hits in wiki/index.md`);

  return { slot, galaxy: g, checks, pass: checks.every((c) => c.pass) };
}

// ── CLI ──
const isMain = (() => { try { return process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]); } catch { return false; } })();
if (isMain) {
  const arg = process.argv[2];
  if (!arg) { console.error('usage: node scripts/galaxy-verify.mjs <slot>|--all'); process.exit(2); }
  const slots = arg === '--all' ? Object.keys(SLOT_GALAXY_MAP) : [arg];
  let anyFail = false;
  for (const s of slots) {
    const r = verifyGalaxy(s);
    const failed = r.checks.filter((c) => !c.pass).length;
    console.log(`\n=== ${s} -> ${r.galaxy || '(unmapped)'} : ${r.pass ? 'PASS' : `FAIL (${failed})`} ===`);
    for (const c of r.checks) console.log(`  [${c.pass ? 'x' : ' '}] ${c.label}${c.detail ? ' — ' + c.detail : ''}`);
    if (!r.pass) anyFail = true;
  }
  process.exit(anyFail ? 1 : 0);
}
