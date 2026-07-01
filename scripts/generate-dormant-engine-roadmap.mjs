#!/usr/bin/env node
/**
 * generate-dormant-engine-roadmap.mjs
 *
 * META artifact for DORMANT-ENGINE-ACTIVATION-ROADMAP (R7, 2026-05-22, slot november).
 * Turns the raw unwired-engine audit into a "true roadmap": domain-batched
 * activation units, split across the 25 work slots, each unit carrying
 * a domain + keyword set so the existing wiki/tribal injectors light up at
 * pickup time.
 *
 * Re-runnable: re-run after `node scripts/audit-unwired-engines.mjs` to refresh
 * the roadmap when the unwired count changes.
 *
 * Usage:  node scripts/generate-dormant-engine-roadmap.mjs [--json]
 * Output: state/shared/specs/DORMANT-ENGINE-ACTIVATION-ROADMAP-2026-05-22.md
 *         state/shared/dormant-engine-roadmap-split.json   (picker-consumable)
 *         mcp-server/data/milestones/DEA-MS0.json          (milestone envelope)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findFreshestUnwiredAuditPath } from './lib/find-freshest-unwired-audit.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// U-AUDIT-FRESHEST-RESOLVER: read the FRESHEST dated audit, not a hardcoded stale date (was pinned
// to ...-2026-05-07.json -> a 40-day-stale dormant list). Fallback keeps the old name if none found.
const AUDIT = findFreshestUnwiredAuditPath({ sharedDir: join(ROOT, 'state', 'shared') })
  || join(ROOT, 'state', 'shared', 'UNWIRED-ENGINE-AUDIT-2026-05-07.json');
const AUDIT_NAME = AUDIT.split(/[\\/]/).pop(); // basename for the provenance fields (honest about which audit fed this)
const OUT_MD = join(ROOT, 'state', 'shared', 'specs', 'DORMANT-ENGINE-ACTIVATION-ROADMAP-2026-05-22.md');
const OUT_JSON = join(ROOT, 'state', 'shared', 'dormant-engine-roadmap-split.json');
const OUT_ENV = join(ROOT, 'mcp-server', 'data', 'milestones', 'DEA-MS0.json');
const SCHEMA_VERSION = '1.0.0';
const BATCH = 6; // engines per wiring unit (NEEDS_WIRING.next_action: "batches of 5-6")

// --- 25 work slots (golf = hygiene, excluded). Domain per JULIETT-12CHAT-ALLOCATION. ---
const SLOTS = {
  alpha:    { domain: 'mill / 5-axis',          tribal: 'mill',   wikiKw: 'milling toolpath' },
  bravo:    { domain: 'lathe / turning',        tribal: 'lathe',  wikiKw: 'lathe turning' },
  charlie:  { domain: 'wire-EDM / electrode',   tribal: 'wedm',   wikiKw: 'wire edm electrode' },
  delta:    { domain: 'CAD / geometry',         tribal: 'cad',    wikiKw: 'cad geometry feature' },
  echo:     { domain: 'CAM / strategy',         tribal: 'cam',    wikiKw: 'cam strategy toolpath' },
  foxtrot:  { domain: 'machining know-how / tribal', tribal: 'mill', wikiKw: 'shop practice tribal' },
  hotel:    { domain: 'ERP / business',         tribal: 'lathe',  wikiKw: 'erp business cost' },
  india:    { domain: 'post-processor / quality', tribal: 'cam',  wikiKw: 'post processor controller' },
  juliett:  { domain: 'speed-feed / physics',   tribal: 'mill',   wikiKw: 'speed feed physics' },
  kilo:     { domain: 'print-to-program',       tribal: 'cam',    wikiKw: 'print to program' },
  lima:     { domain: 'PRISM-academy / AI',     tribal: 'mill',   wikiKw: 'learning academy' },
  mike:     { domain: 'misc / orchestration',   tribal: 'mill',   wikiKw: 'orchestration misc' },
  november: { domain: 'precision / dev-infra',  tribal: 'mill',   wikiKw: 'precision accuracy' },
  oscar:    { domain: 'general / overflow',     tribal: 'mill',   wikiKw: 'milling toolpath' },
  papa:     { domain: 'general / overflow',     tribal: 'lathe',  wikiKw: 'lathe turning' },
  quebec:   { domain: 'general / overflow',     tribal: 'wedm',   wikiKw: 'wire edm electrode' },
  romeo:    { domain: 'general / overflow',     tribal: 'cad',    wikiKw: 'cad geometry feature' },
  sierra:   { domain: 'general / overflow',     tribal: 'cam',    wikiKw: 'cam strategy toolpath' },
  tango:    { domain: 'general / overflow',     tribal: 'mill',   wikiKw: 'milling toolpath' },
  uniform:  { domain: 'general / overflow',     tribal: 'lathe',  wikiKw: 'lathe turning' },
  victor:   { domain: 'general / overflow',     tribal: 'wedm',   wikiKw: 'wire edm electrode' },
  whiskey:  { domain: 'general / overflow',     tribal: 'cad',    wikiKw: 'cad geometry feature' },
  xray:     { domain: 'general / overflow',     tribal: 'cam',    wikiKw: 'cam strategy toolpath' },
  yankee:   { domain: 'general / overflow',     tribal: 'mill',   wikiKw: 'milling toolpath' },
  zulu:     { domain: 'general / overflow',     tribal: 'lathe',  wikiKw: 'lathe turning' },
};
const SLOT_ORDER = Object.keys(SLOTS);
const PRIMARY_SLOT = 'november'; // owns DEA-MS0: re-runs the generator, tracks progress, closes the milestone

// --- suggestedDispatcher -> slot ---
const DISPATCHER_TO_SLOT = {
  prism_turning: 'bravo',
  prism_edm: 'charlie',
  prism_cam: 'echo',
  prism_cad: 'delta',
  prism_5axis: 'alpha',
  prism_calc: 'juliett',
  prism_business: 'hotel',
  prism_quality: 'india',
  prism_safety: 'november',
  prism_dev: 'november',
  prism_session: 'november',
  prism_monitoring: 'november',
  prism_ai: 'mike',
  prism_orchestrate: 'mike',
  prism_diagnosis: 'mike',
  prism_data: 'mike',
  prism_auth: 'mike',
  prism_process_control: 'india',
  prism_scheduling: 'hotel',
};
// --- engine-name prefix -> slot (fallback for UNKNOWN suggestedDispatcher) ---
const NAME_RULES = [
  [/^(Lathe|Turning|Eccentric|Trilobe|ColdHeading|ExpandingMandrel|BarFeed)/i, 'bravo'],
  [/^(Wedm|Wire|EDM|Electrode|Sinker)/i, 'charlie'],
  [/^(Mastercam|HyperMill|Fusion|Cam|Esprit|Camworks|Powermill|SolidCam)/i, 'echo'],
  [/^(Cad|Geometry|Sketch|Brep|Mesh|NURBS|Step)/i, 'delta'],
  [/^(Mill|FiveAxis|Five|Multiaxis)/i, 'alpha'],
  [/^(Post|Controller|Gcode|GCode|Dnc)/i, 'india'],
  [/^(Speed|Feed|Kienzle|Taylor|Chip|Cutting)/i, 'juliett'],
  [/^(ERP|Quote|Invoice|Cost|Payroll|Customer|Inventory)/i, 'hotel'],
  [/^(Tribal|Playbook|Apprentice|Knowledge)/i, 'foxtrot'],
  [/^(Print|Blueprint|OCR)/i, 'kilo'],
  [/^(Academy|Course|Learn|Curriculum|Instructor)/i, 'lima'],
  [/^(Accuracy|Probe|Thermal|Vibration|Calibrat|Metrolog)/i, 'november'],
];

// --- Type-B precision cluster: wired-but-uncalled (F0, MACHINING-MATH-INVENTIONS-AUDIT). ---
// Each is an ACTIVATION (cross-wire) unit, not a dispatcher-wire unit. -> november.
const PRECISION_UNITS = [
  { id: 'U-DEA-november-P01', title: 'Activate acc_thermal_error -> post_inject_motion',
    detail: 'Wire machine-error thermal compensation into the post-processor motion injection so emitted G-code carries thermal-growth offsets.',
    targets: ['acc_thermal_error', 'post_inject_motion', 'post_thermal_compensate'] },
  { id: 'U-DEA-november-P02', title: 'Activate acc_volumetric / acc_abbe / acc_ball_bar -> cad_machine_capability_get',
    detail: 'Feed volumetric/Abbe/ball-bar error envelope into machine-capability lookup so strategy selection sees the real accuracy envelope.',
    targets: ['acc_volumetric', 'acc_abbe_offset', 'acc_ball_bar', 'cad_machine_capability_get'] },
  { id: 'U-DEA-november-P03', title: 'Activate diamond_turning_* -> cam_strategy_recommend',
    detail: 'Wire diamond-turning surface/forces/wear models into CAM strategy recommendation for sub-micron finish operations.',
    targets: ['diamond_turning_surface', 'diamond_turning_forces', 'diamond_turning_wear', 'cam_strategy_recommend'] },
  { id: 'U-DEA-november-P04', title: 'Activate laser_interferometer_* -> machine_warmup_calculate',
    detail: 'Wire laser-interferometer wavelength/deadpath/comp-table into machine warmup + leveling setup.',
    targets: ['laser_interferometer_wavelength', 'laser_interferometer_comp_table', 'machine_warmup_calculate'] },
  { id: 'U-DEA-november-P05', title: 'Activate spm_* -> quality_kpis / spc_calculate',
    detail: 'Wire statistical-process-monitoring (Hotelling T2, PCA, HMM, SPRT) into the quality KPI + SPC surfaces.',
    targets: ['spm_hotelling_t2', 'spm_pca_monitoring', 'spm_combined_spc', 'quality_kpis', 'spc_calculate'] },
  { id: 'U-DEA-november-P06', title: 'Activate cad_probe_drift_* -> probe_routine_generate + wire PrintAccuracyProofEngine',
    detail: 'Wire probe-drift record/analyze/alerts into probe routine generation; wire the unwired PrintAccuracyProofEngine.',
    targets: ['cad_probe_drift_record', 'cad_probe_drift_analyze', 'probe_routine_generate', 'PrintAccuracyProofEngine'] },
];

// --- Trilobe / eccentric turning (user addition 2026-05-22): carve out a named bravo unit. ---
const TRILOBE_ENGINES = ['EccentricTurningEngine', 'TrilobeDeformationEngine', 'ColdHeadingToolConfiguratorEngine', 'ExpandingMandrelEngine'];
// --- Engines that PRECISION_UNITS targets already cover; exclude from generic batching to avoid double-count. ---
const PRECISION_ENGINE_TARGETS = new Set(
  PRECISION_UNITS.flatMap(p => p.targets).filter(t => /^[A-Z]/.test(t)) // CamelCase = engine class
);

function slotFor(eng) {
  const disp = (eng.suggestedDispatcher || '').replace(/\s+—.*/, '').trim();
  if (DISPATCHER_TO_SLOT[disp]) return DISPATCHER_TO_SLOT[disp];
  for (const [rx, slot] of NAME_RULES) if (rx.test(eng.engine)) return slot;
  return null; // triage pool
}

function main() {
  const audit = JSON.parse(readFileSync(AUDIT, 'utf8'));
  const engines = audit.unwiredEngines; // [{engine, suggestedDispatcher, ...}]

  // 1. resolve each engine: name + cleaned dispatcher + preferred slot.
  const items = [];
  for (const e of engines) {
    if (TRILOBE_ENGINES.includes(e.engine)) continue; // carved out separately
    if (PRECISION_ENGINE_TARGETS.has(e.engine)) continue; // already covered by PRECISION_UNITS
    const disp = (e.suggestedDispatcher || '').replace(/\s+—.*/, '').trim();
    items.push({
      name: e.engine,
      dispatcher: disp.startsWith('prism_') ? disp : 'UNKNOWN',
      pref: slotFor(e),
    });
  }

  // 2. balanced assignment across all 25 work slots. Domain-routed engines fill
  //    their preferred slot up to TARGET; overflow + UNKNOWN-triage go to the
  //    lightest slot. Result: ~even load (big domains spill, no 4x skew).
  const TARGET = Math.ceil(items.length / SLOT_ORDER.length);
  const bySlot = {}; for (const s of SLOT_ORDER) bySlot[s] = [];
  const load = (s) => bySlot[s].length;
  const lightest = () => SLOT_ORDER.slice().sort((a, b) => load(a) - load(b))[0];
  const domItems = items.filter(i => i.pref).sort((a, b) => a.name.localeCompare(b.name));
  const triItems = items.filter(i => !i.pref).sort((a, b) => a.name.localeCompare(b.name));
  for (const it of domItems) bySlot[load(it.pref) < TARGET ? it.pref : lightest()].push(it);
  for (const it of triItems) bySlot[lightest()].push(it);

  // 3. batch each slot's engines into units of BATCH. Unit title is honest
  //    about the batch's dispatcher composition; every engine carries its
  //    own target dispatcher so a spilled engine still tells the wirer where.
  const units = [];
  for (const s of SLOT_ORDER) {
    const slotItems = bySlot[s].slice().sort((a, b) => a.name.localeCompare(b.name));
    let n = 0;
    for (let i = 0; i < slotItems.length; i += BATCH) {
      n++;
      const batch = slotItems.slice(i, i + BATCH);
      const disps = [...new Set(batch.map(b => b.dispatcher))];
      const known = disps.filter(d => d !== 'UNKNOWN');
      const hasUnknown = disps.includes('UNKNOWN');
      const cnt = `${batch.length} engine${batch.length === 1 ? '' : 's'}`;
      let type, title;
      if (known.length === 0) {
        type = 'triage+wire';
        title = `Triage + wire ${cnt} (suggestedDispatcher UNKNOWN — review before wiring)`;
      } else if (!hasUnknown && disps.length === 1) {
        type = 'wire';
        title = `Wire ${cnt} → ${known[0]}`;
      } else if (!hasUnknown) {
        type = 'wire';
        title = `Wire ${cnt} (mixed dispatchers — see per-engine target)`;
      } else {
        type = 'wire+triage';
        title = `Wire/triage ${cnt} (mixed — review UNKNOWN entries first; see per-engine target)`;
      }
      units.push({
        id: `U-DEA-${s}-${String(n).padStart(2, '0')}`,
        slot: s, type, title,
        engines: batch.map(b => b.name),
        dispatchers: Object.fromEntries(batch.map(b => [b.name, b.dispatcher])),
        domain: SLOTS[s].domain, tribal: SLOTS[s].tribal, wikiKw: SLOTS[s].wikiKw,
      });
    }
  }
  // 3b. trilobe named unit (bravo)
  units.push({
    id: 'U-DEA-bravo-TRILOBE', slot: 'bravo', type: 'wire+codegen',
    title: 'Lathe trilobe / eccentric turning + macro G-code',
    detail: 'Wire the 4 trilobe/eccentric engines into prism_turning AND generate macro-based G-code: ' +
            'X-axis modulation X(C) as a parametric profile for trilobe, eccentric-offset transform, ' +
            'polygon-turning G51.2 synchronization. Math: trochoidal/parametric profile + offset kinematics.',
    engines: TRILOBE_ENGINES,
    domain: SLOTS.bravo.domain, tribal: 'lathe', wikiKw: 'lathe turning trilobe macro',
  });
  // 3c. precision activation units (november)
  for (const p of PRECISION_UNITS) {
    units.push({ ...p, slot: 'november', type: 'activate',
      domain: SLOTS.november.domain, tribal: 'mill', wikiKw: 'precision accuracy metrology',
      engines: p.targets });
  }

  // 4. per-slot rollup
  const slotRollup = {};
  for (const s of SLOT_ORDER) {
    const su = units.filter(u => u.slot === s);
    slotRollup[s] = { domain: SLOTS[s].domain, units: su.length,
      engines: su.reduce((a, u) => a + u.engines.length, 0) };
  }

  const split = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    milestone: 'DEA-MS0',
    owner: PRIMARY_SLOT,
    source: { audit: AUDIT_NAME, typeA_unwired: engines.length },
    advisoryOnly: true, mustHumanVerify: true,
    summary: {
      totalUnits: units.length,
      typeA_wire_units: units.filter(u => u.type === 'wire').length,
      typeB_precision_units: PRECISION_UNITS.length,
      trilobe_units: 1,
    },
    slotRollup,
    units,
  };
  writeFileSync(OUT_JSON, JSON.stringify(split, null, 2));

  // 5. markdown roadmap
  const L = [];
  L.push('# Dormant-Engine Activation Roadmap — DEA-MS0');
  L.push('');
  L.push(`> Generated ${split.generatedAt} · slot november · \`generate-dormant-engine-roadmap.mjs\``);
  L.push('> **Advisory — must human-verify.** Re-run after `audit-unwired-engines.mjs` to refresh.');
  L.push(`> **Primary slot: \`${PRIMARY_SLOT}\`** — owns DEA-MS0: re-runs the generator, tracks progress, closes the milestone.`);
  L.push('');
  L.push('## Scope');
  L.push('');
  L.push(`- **Type A — ${engines.length} unwired engines**: on disk, zero dispatcher reference. Each unit wires a 5-6 engine batch to its dispatcher.`);
  L.push(`- **Type B — ${PRECISION_UNITS.length} precision-cluster activations**: engines wired into dispatchers but never called engine-to-engine (F0, MACHINING-MATH-INVENTIONS-AUDIT). Each unit is a *cross-wire*, not a dispatcher-wire.`);
  L.push('- **Trilobe / eccentric turning**: 4 unwired engines + macro G-code codegen (user addition 2026-05-22).');
  L.push(`- **Total: ${units.length} units across 25 work slots.**`);
  L.push('');
  L.push('## Per-slot split');
  L.push('');
  L.push('| Slot | Domain | Units | Engines |');
  L.push('|------|--------|-------|---------|');
  for (const s of SLOT_ORDER) {
    const r = slotRollup[s];
    L.push(`| \`${s}\` | ${r.domain} | ${r.units} | ${r.engines} |`);
  }
  L.push('');
  L.push(`> The Engines column counts unit engine/target entries. Type-A unwired engines = ${engines.length} total; ` +
         `\`activate\` units additionally count cross-wire dispatcher-action targets (not unwired engines).`);
  L.push('');
  L.push('## Verification channel');
  L.push('');
  L.push('Re-run `node scripts/audit-unwired-engines.mjs` — UNWIRED count must fall by the engine count of every shipped unit. Baseline UNWIRED = ' + engines.length + '.');
  L.push('');
  for (const s of SLOT_ORDER) {
    const su = units.filter(u => u.slot === s);
    if (!su.length) continue;
    L.push(`## Slot \`${s}\` — ${SLOTS[s].domain}`);
    L.push('');
    L.push(`**Wiki & tribal anchors** (auto-injected at pickup): \`/wiki-query ${SLOTS[s].wikiKw}\` · tribal-by-domain = \`${SLOTS[s].tribal}\``);
    L.push('');
    for (const u of su) {
      L.push(`### ${u.id} — ${u.title}`);
      if (u.detail) L.push('', u.detail);
      if (u.dispatchers) {
        L.push('', '- Engines → target dispatcher:');
        for (const e of u.engines) L.push(`  - \`${e}\` → ${u.dispatchers[e]}`);
      } else {
        L.push('', '- Engines/targets: ' + u.engines.map(e => `\`${e}\``).join(', '));
      }
      L.push(`- Type: ${u.type} · domain: ${u.domain} · tribal: \`${u.tribal}\` · wiki: \`${u.wikiKw}\``);
      L.push('');
    }
  }
  writeFileSync(OUT_MD, L.join('\n'));

  // 6. milestone envelope — registers DEA-MS0 into the 748-envelope surface
  //    so build-milestone-progress.mjs + the priority queue pick it up.
  const envelope = {
    id: 'DEA-MS0',
    title: `Dormant-Engine Activation -- ${engines.length} unwired + precision cluster + trilobe`,
    track: 'INFRA',
    owner: PRIMARY_SLOT,
    status: 'not_started',
    generated_at: split.generatedAt,
    brief: `Activate ${engines.length} unwired engines + ${PRECISION_UNITS.length} precision-cluster cross-wires + trilobe/eccentric turning, split across 25 work slots (primary: november).`,
    total_units: units.length,
    completed_units: 0,
    units: units.map(u => ({
      id: u.id, title: u.title, status: 'not_started',
      slot: u.slot, type: u.type, engines: u.engines,
      ...(u.dispatchers ? { dispatchers: u.dispatchers } : {}),
    })),
    resources_utilized: {
      audit: AUDIT_NAME,
      meta_tools: ['scripts/generate-dormant-engine-roadmap.mjs', 'scripts/machining-math-intersection-map.mjs'],
      verification: 'Re-run scripts/audit-unwired-engines.mjs; UNWIRED count must fall by shipped-unit engine counts.',
    },
    summary: `DEA-MS0 turns the raw unwired-engine audit into a pickable roadmap: ${units.length} units across 25 work slots. ` +
      `Commit subject convention [DEA-MS0]/U-DEA-<slot>-NN credits units in build-milestone-progress. Advisory — human-verify each batch before wiring.`,
  };
  writeFileSync(OUT_ENV, JSON.stringify(envelope, null, 2));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(split.summary, null, 2));
  }
  console.log(`dormant-engine roadmap: ${units.length} units · Type-A ${engines.length} engines`);
  for (const s of SLOT_ORDER) console.log(`  ${s.padEnd(9)} ${String(slotRollup[s].units).padStart(2)} units  ${String(slotRollup[s].engines).padStart(3)} engines  ${slotRollup[s].domain}`);
  console.log(`written: ${OUT_MD}`);
  console.log(`written: ${OUT_JSON}`);
  console.log(`written: ${OUT_ENV}  (milestone envelope DEA-MS0)`);
}

main();
