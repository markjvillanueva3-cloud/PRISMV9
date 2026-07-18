export const meta = {
  name: 'galaxy-applied-practice',
  description: 'CREATE a per-galaxy Applied Practice wiki for the 10 manufacturing/shop domains -- cited QUALITATIVE practitioner knowledge: common failure-modes, gotchas, technique decisions that theory does not teach. The "tribal knowledge" layer. R12-CRITICAL: cutting galaxies get qualitative technique + trade-off DIRECTION only, ZERO numeric speeds/feeds/chip-loads/thresholds (gated). WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'Practice', detail: 'waves of 3: WebFetch reputable free practical sources, extract cited gotchas/technique, R12 numerics-gated' },
  ],
}

const GALAXIES = [
  { g: 'mill', owner: 'foxtrot', gated: true, focus: 'milling practitioner technique + common failure modes: chatter/vibration mitigation (stickout, rigidity, RPM/engagement choices DIRECTIONALLY), climb-vs-conventional decision, tool deflection, workholding rigidity, chip evacuation/recutting, surface-finish problems, tramming/squareness. Free practical sources to try: Harvey Performance In The Loupe, CNCCookbook, Machining Doctor articles, NIST/OSHA practical, university lab manuals, LibreTexts/Open-Oregon practical chapters.' },
  { g: 'lathe', owner: 'whiskey', gated: true, focus: 'turning practitioner technique + gotchas: chatter, tool-nose-radius effect on finish (qualitative), chip control/breaking, parting-off problems, threading pitfalls, workholding (chuck/collet/steady-rest), CSS/constant-surface-speed pitfalls near center, tailstock/tang support. Free: Harvey/Helical blogs, CNCCookbook, vendor turning guides, Open Oregon Ch.2.' },
  { g: 'wedm', owner: 'mike', gated: true, focus: 'wire-EDM practitioner technique + gotchas: wire-breakage root causes, flushing/starvation problems, taper error, surface-finish vs cut-speed trade, skim/multi-pass strategy, thermal/recast/HAZ issues, threading/auto-thread fails, fixturing + thermal stability. Free: vendor EDM application guides, NPTEL practical, MDPI/PMC applied reviews.' },
  { g: 'cam', owner: 'kilo', gated: true, focus: 'CAM practitioner technique + gotchas: toolpath selection per feature, gouge/collision avoidance, lead-in/lead-out choice, stock-to-leave/rest-machining, ramp vs plunge entry, simulation/verification discipline, posting/controller mismatch. Free: CNCCookbook CAM-toolpath guide, vendor CAM blogs, NPTEL.' },
  { g: 'speed-feed', owner: 'oscar', gated: true, focus: 'speed/feed practitioner REASONING + gotchas with ZERO numbers: when to derate for stickout/rigidity/thin-wall, recutting chips, work-hardening materials (qualitative), coolant strategy, the DIRECTION of trade-offs (tool life vs MRR vs finish), built-up-edge avoidance, chip-thinning awareness. Free: vendor cutting-strategy guides (qualitative parts only), Harvey In The Loupe, NPTEL metal-cutting.' },
  { g: 'post-processor', owner: 'echo', gated: true, focus: 'post-processor practitioner gotchas: arc IJK vs R, canned-cycle vs longhand, tool-length-offset handling, work-offset G54/G10 issues, modal-state bugs, controller-dialect traps (Fanuc vs Haas vs Okuma vs Siemens), safe-retract/clearance logic, subprogram/macro pitfalls. Free: LinuxCNC docs, GcodeTutor, free controller manuals.' },
  { g: 'cad', owner: 'delta', gated: false, focus: 'CAD practitioner technique + gotchas: robust parametric modeling (avoid over-constraint/fragile feature trees), feature order for editability, sketch-relations discipline, assembly mate strategy, design-for-machining (draft/internal-radii/tolerancing for cost), STEP/IGES export pitfalls + healing. Free: NIST MBE, university CAD courses, vendor modeling best-practice guides.' },
  { g: 'blueprint-vision', owner: 'xray', gated: false, focus: 'drawing-reading + inspection practitioner gotchas: GD&T datum-reference-frame interpretation, MMC/LMC bonus tolerance, tolerance-stack pitfalls, projected/auxiliary view reading, title-block/revision traps, OCR/machine-vision failure-modes on noisy or hand-marked scans. Free: NIST GD&T/metrology, university metrology courses, ASME practical primers.' },
  { g: 'quality', owner: 'quality-owner', gated: true, focus: 'quality practitioner technique + gotchas: gauge R&R pitfalls, control-chart misuse (over-control/under-control, reacting to common-cause), capability-vs-performance confusion (Cp/Cpk vs Pp/Ppk conceptually), sampling-plan traps, measurement-system error, normality assumptions. Free: NIST/SEMATECH e-Handbook, free SPC courses. R12: NO numeric Cpk / control-limit / AQL threshold values (gated).' },
  { g: 'shop-floor', owner: 'shop-floor-owner', gated: true, focus: 'shop-floor practitioner + safety technique: setup-reduction (SMED) practice, 5S, lockout-tagout discipline, tool-presetting + offset management, first-article verification, machine warm-up/thermal-growth, swarf/coolant management, changeover. Free: Lean Enterprise Institute lexicon, OSHA practical, NIST MEP. R12: qualitative; NO numeric safety thresholds.' },
]

phase('Practice')

function prompt({ g, owner, gated, focus }) {
  const safety = gated
    ? `\nR12 SAFETY-CRITICAL: this is a cutting / safety / capability galaxy. Promote ONLY qualitative technique, failure-mode descriptions, decision-logic, and the DIRECTION of a trade-off ("higher stickout -> more deflection -> lighter engagement"). You may NOT write a numeric cutting value (RPM, SFM/Vc, IPR/IPT/feed, depth-of-cut, chip-load), a numeric Cpk/control-limit/AQL, or a numeric safety threshold. If a source states one, describe the QUALITATIVE relationship and gate the number ("the vendor publishes a specific value -- owner-gated, see constants.ts"). Keep all numbers owner-gated.`
    : `\nNon-cutting galaxy: qualitative practitioner technique + gotchas. Leave any specific dimensional/tolerance numbers owner-gated unless they are a published standard's structural fact.`
  return `You are creating the Applied Practice wiki for the PRISM "${g}" galaxy (owner: ${owner}): knowledge/wiki/${g}/${g}-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE layer -- the hard-won "tribal knowledge" a world-class ${g} expert has that pure theory does not teach: common FAILURE MODES, GOTCHAS, and TECHNIQUE DECISIONS. This is DISTINCT from ${g}-foundations.md (theory) and ${g}-source-atlas.md (link directory). Read both first so you do not repeat them -- this entry is "what goes wrong and how an expert avoids it."

FOCUS for ${g}: ${focus}${safety}

ABSOLUTE RULES (R12 honesty -- a small honest set of cited gotchas beats a large fabricated one):
1. You may ONLY state a practitioner claim you CONFIRM by WebFetch on a reputable free/legal source (vendor technical guide, university course/lab manual, NIST/OSHA, reputable practitioner site like CNCCookbook / Harvey In The Loupe / GcodeTutor / Machining Doctor, NPTEL, open textbook). Never fabricate. If a fetch fails, retry once then drop the claim.
2. Aim for 8-14 cited gotchas/technique notes across 4-6 themed sections (e.g. "## Common failure modes", "## Technique decisions", "## Setup & fixturing gotchas", "## Verification"). Each = the gotcha + WHY + the expert's avoidance, with the source cited inline.
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" listing anything numeric/uncertain the owner must verify, and a "## Sources" list.
5. Do NOT run git/commit, do NOT register in the index (main chat does that). If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-applied-practice.md
CREATED: <yes/no>
CITED_GOTCHAS: <count of WebFetch-confirmed practitioner claims>
SOURCES: <count of distinct source URLs confirmed>
NUMERICS_LEFT_GATED: <yes/no/n_a>
NOTE: <one line: the single most valuable gotcha this entry captures>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `practice:${entry.g}`, phase: 'Practice' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`applied-practice complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
