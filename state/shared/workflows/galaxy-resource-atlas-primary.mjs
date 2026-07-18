export const meta = {
  name: 'galaxy-resource-atlas-primary',
  description: 'Per-galaxy RESOURCE-ATLAS (fused easy-access index) for the 8 primary manufacturing domains (mill, lathe, wedm, cam, speed-feed, post-processor, cad, blueprint-vision): LOCAL trove pointers (resources/ + JM DIE/ subdirs, pre-seeded verified-on-disk) + curated domain YouTube channels/playlists (WebFetch-verified) + reputable online, cross-linking the domains foundations/source-atlas/applied-practice/advanced-techniques. Operator directive: primary domains EXHAUSTIVELY, all local+youtube+online resources linked. WAVE-CHUNKED 3/wave. R12: cutting numerics stay owner-gated.',
  phases: [
    { title: 'ResourceAtlas', detail: 'waves of 3: local pointers (given) + WebFetch-verified YouTube + online' },
  ],
}

// LOCAL subdirs are pre-seeded from the LIVE 2026-06-10 enumeration (see knowledge/wiki/architecture/primary-domain-resource-map.md) so agents LINK real paths, never fabricate.
const GALAXIES = [
  { g: 'mill', owner: 'foxtrot', local: 'resources/{HYPERMILL(18846), MasterCam(29280), HSMWorks 2027(889), FUSION360(275), POSTS AND MACHINES(3056), MANUFACTURER_CATALOGS(365), WORKHOLDING AND FIXTURE CATALOGS(36), MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION(272)}; JM DIE/{CNC MILL HAAS(533), HAAS-HURCO(1873), ROKU-ROKU(1108), FUSION CAD AND CAM FILES(9746), MATTHEW programs(2422)}', youtube: 'milling technique channels (Haas Automation, NYC CNC, Titans of CNC, CNCCookbook, Helical/Harvey In The Loupe)' },
  { g: 'lathe', owner: 'whiskey', local: 'JM DIE/{CNC LATHE(134485), OKUMA(6276), OKUMA MULTUS PROGRAMS, CNC OKUMA MULTUS(18), LATHE}; resources/{MULTUS PROGRAMS(82), OKUMA MULTUS PDFS}', youtube: 'turning/lathe + mill-turn channels (Okuma, Mazak, Titans of CNC turning, NYC CNC, Sandvik Coromant)' },
  { g: 'wedm', owner: 'mike', local: 'JM DIE/WIRE EDM(4058 -- 99-customer archive); resources/{POSTS AND MACHINES, GENERIC MACHINE MODELS}', youtube: 'wire-EDM channels (Makino EDM, Mitsubishi EDM, Sodick, GF Machining Solutions, Titans of CNC EDM)' },
  { g: 'cam', owner: 'kilo', local: 'resources/{OPEN MIND(54100), MasterCam(29280), HYPERMILL(18846), SOLIDWORKS(14429), HSMWorks 2027(889), FUSION360(275), SOLIDCAM, cimco-2026(2036), cimco-2025(1410)}; JM DIE/{FUSION CAD AND CAM FILES(9746), QUEUE(354)}', youtube: 'CAM channels (Autodesk Fusion, Mastercam, hyperMILL/OPEN MIND, SolidCAM iMachining, Titans of CNC Academy)' },
  { g: 'speed-feed', owner: 'oscar', local: 'resources/{MANUFACTURER_CATALOGS(365 tool/insert catalogs), MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS, TOOL_HOLDER_CAD_FILES(25), WORKHOLDING AND FIXTURE CATALOGS(36)}', youtube: 'speeds-and-feeds channels (CNCCookbook, Harvey Performance In The Loupe, Sandvik Coromant, Kennametal, Destiny Tool)', note: 'R12: cutting numerics (SFM/IPR/chip-load/Taylor) stay owner-gated to oscar + constants.ts; link the catalog SOURCES, never inline a number.' },
  { g: 'post-processor', owner: 'echo', local: 'resources/{FUSION POSTS, FUSION BASIC POSTS(180), POSTS AND MACHINES(3056), MACRO PROGRAMS(7), cimco-2026(2036), cimco-2025(1410), winmax-docs}; JM DIE/{POST PROCESSORS(538), PRISM MODIFIED POST PROCESSORS(18), CONTROLLERS(9), MACRO PROGRAMS}', youtube: 'post-processor/G-code channels (Autodesk Fusion post, CIMCO, LinuxCNC, controller-vendor channels Haas/Fanuc/Heidenhain)' },
  { g: 'cad', owner: 'delta', local: 'resources/{Freecad(30348), SOLIDWORKS(14429), Inventor 2027(3243), DWG TrueView 2027(1571), FUSION360(275), CAD FILES(41), PART MODELS FOR LEARNING ENGINE(31), TOOL_HOLDER_CAD_FILES(25)}; JM DIE/{FUSION CAD AND CAM FILES(9746), REVERSE ENGINEERING(47)}', youtube: 'CAD modeling channels (Autodesk Fusion, SolidWorks, Inventor, FreeCAD, Lars Christensen)' },
  { g: 'blueprint-vision', owner: 'xray', local: 'JM DIE/{Prism JM Die(152960 customer drawings/prints), QUEUE(354), PRISM CAD TESTING}; resources/{RESOURCE PDFS(2929), PDF(13)}', youtube: 'GD&T / blueprint-reading / OCR channels (GD&T Basics, Tec-Ease, ASME, document-AI talks)' },
]

phase('ResourceAtlas')

function prompt({ g, owner, local, youtube, note }) {
  return `You are creating the RESOURCE-ATLAS wiki for the PRISM "${g}" galaxy (owner: ${owner}): knowledge/wiki/${g}/${g}-resource-atlas.md.

PURPOSE (operator directive -- primary domains EXHAUSTIVELY): a single EASY-ACCESS index that links EVERY resource for this domain -- the LOCAL on-disk trove, curated YouTube, and reputable online -- so a chat in this galaxy jumps straight to what it needs. This FUSES the local half (given below) with the online/video half.

LOCAL TROVE (pre-verified on disk 2026-06-10 -- LINK these exactly, do NOT fabricate or re-count; the pathway is root+subdir+index per CRITICAL-RESOURCE-ROOTS.json):
${local}
Also point at the root index H:/PRISM/resources/RESOURCES-INDEX.md and (for drawings) the Docustrata manifest.json+.index (never re-OCR).

YOUTUBE + ONLINE to curate (WebFetch-VERIFY each before listing -- channel/playlist must resolve; drop on 404/retry): ${youtube}. Prefer official manufacturer + reputable educator channels; free only.${note ? '\n' + note : ''}

ABSOLUTE RULES (R12):
1. The LOCAL section: reproduce the given subdir pointers verbatim (they are verified). For YouTube/online: ONLY list a source you CONFIRM resolves via WebFetch; drop dead ones (retry once). Never fabricate a URL.
2. Cross-link the sibling wiki layers: [[${g}-foundations]] (theory), [[${g}-source-atlas]] (free courses/books), [[${g}-applied-practice]] (gotchas), and [[${g}-advanced-techniques]] if it exists, plus [[primary-domain-resource-map]] (the master local map).
3. R12 SAFETY: if this is a cutting galaxy, promote NO numeric cutting constant -- link the catalog/source, the number stays owner-gated to ${owner} + constants.ts.
4. Sections: Local trove (CAD/CAM/posts/programs/catalogs) / Curated YouTube / Reputable online / Cross-links / Keep-fresh cadence. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-resource-atlas (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-resource-atlas.md
CREATED: <yes/no>
LOCAL_SUBDIRS_LINKED: <count>
YOUTUBE_VERIFIED: <count of WebFetch-confirmed channels/playlists>
ONLINE_VERIFIED: <count>
NOTE: <one line: the single highest-value resource this atlas surfaces for the domain>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `resatlas:${entry.g}`, phase: 'ResourceAtlas' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`resource-atlas-primary complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
