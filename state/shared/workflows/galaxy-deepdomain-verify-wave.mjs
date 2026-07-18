export const meta = {
  name: 'galaxy-deepdomain-verify-promote-wave',
  description: 'Verify + promote remaining staged deep-domain packets to live VERIFIED wiki entries (R12-gated, no physics constants) - WAVE-CHUNKED (3/wave) to avoid rate-limit bursts',
  phases: [
    { title: 'VerifyPromote', detail: 'waves of 3 subagents: WebFetch-confirm non-safety claims, write live VERIFIED wiki, flip packet status' },
  ],
}

// academy already done (b7e7e221e0). Remaining 12 domain galaxies.
// physics galaxies: promote ONLY method/geometry/standards context, NEVER cutting constants.
const GALAXIES = [
  { g: 'business', owner: 'hotel', physics: false },
  { g: 'shop-floor', owner: 'shop-floor-owner', physics: false },
  { g: 'blueprint-vision', owner: 'xray', physics: false },
  { g: 'quoting', owner: 'charlie', physics: false },
  { g: 'quality', owner: 'quality-owner', physics: false },
  { g: 'cad', owner: 'delta', physics: false },
  { g: 'post-processor', owner: 'echo', physics: true },
  { g: 'speed-feed', owner: 'oscar', physics: true },
  { g: 'mill', owner: 'foxtrot', physics: true },
  { g: 'lathe', owner: 'whiskey', physics: true },
  { g: 'wedm', owner: 'mike', physics: true },
  { g: 'cam', owner: 'kilo', physics: true },
]

phase('VerifyPromote')

function prompt({ g, owner, physics }) {
  const physicsRule = physics
    ? `SAFETY-CRITICAL GALAXY. You may promote ONLY: formula STRUCTURE/geometry (e.g. Vc = pi*D*N/1000), process METHOD descriptions, vendor/standards POINTERS, and qualitative domain facts. You MUST NEVER promote any numeric cutting constant -- kc1.1 / specific cutting force / Taylor C or n exponents / material constants / specific speeds/feeds/IPM/SFM values. ALL such numbers stay UNVERIFIED in _staging, owner-gated, because PRISM sources them ONLY from mcp-server/src/physics/constants.ts (never from the web). If the packet's best content is all numeric cutting data, promote the METHOD/standards framing only and leave the numbers gated.`
    : `Non-physics galaxy. Promote institutional / standards / methodology / process facts. Leave specific dollar rates, control limits, or any number you cannot confirm against a primary source UNVERIFIED in _staging (owner-gated).`
  return `You are verifying + promoting the deep-domain research packet for the PRISM "${g}" galaxy (owner slot: ${owner}). This mirrors the proven academy slice (knowledge/wiki/academy/academy-pedagogy-foundations.md).

ABSOLUTE RULES (R12 honesty -- violating these is worse than doing nothing):
1. READ the packet: H:/prism/knowledge/wiki/${g}/_staging/deep-domain-research-2026-06-09.md
2. You may ONLY mark a claim VERIFIED if you ACTUALLY call the WebFetch tool on its cited source URL and the page CONFIRMS the claim. Never fabricate a WebFetch result. Never assert a claim you did not confirm. Pick 3-5 of the HIGHEST-VALUE, non-safety, checkable institutional/standards/method claims and WebFetch each cited source to confirm. If a WebFetch fails with a rate-limit or error, wait briefly and retry once; if it still fails, leave that claim gated (do not promote unconfirmed).
3. ${physicsRule}
4. If you cannot confirm a claim, it stays UNVERIFIED in _staging -- do NOT promote it. A small honest VERIFIED set beats a large unverified one.

THEN produce these edits (all ASCII in any code; markdown is fine in the wiki file):
A. WRITE a new live wiki entry at H:/prism/knowledge/wiki/${g}/${g}-foundations.md with YAML frontmatter (title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-workflow (claude-b5de5424, 2026-06-09)", verification_method, tags). Body = the WebFetch-CONFIRMED claims grouped by theme, each with its citation as a markdown link, plus a "## Owner-gate (NOT promoted)" section listing what you left UNVERIFIED in _staging (every numeric physics constant + anything you could not confirm) and why. End with a "## Sources" list of the URLs you actually confirmed.
B. EDIT the packet frontmatter H:/prism/knowledge/wiki/${g}/_staging/deep-domain-research-2026-06-09.md: change "status: UNVERIFIED" to "status: VERIFIED-PARTIAL", add "promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)" line, and replace the top "<!-- UNVERIFIED ... -->" comment with a "<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/${g}/${g}-foundations.md; numeric/safety specifics below stay owner-gated for ${owner}. -->" comment.
C. APPEND one pointer line to H:/prism/mcp-server/src/engines/${g}/MEMORY.md right after the existing "Deep cited domain research" line in its "Authoritative free-source corpus" block, pointing to the new VERIFIED wiki entry and noting the owner-gate split. If that Edit is BLOCKED by a file-claim hook, skip it and report MEMORY_UPDATED: blocked.
D. Do NOT run git. Do NOT commit. The main chat commits the batch.

Return ONLY this exact plain-text block (no other prose):
GALAXY: ${g}
WIKI: <relative path of the file you wrote, or NONE>
PROMOTED: <count of claims you WebFetch-confirmed and promoted>
GATED: <count left owner-gated>
SOURCES_CONFIRMED: <count of distinct URLs you actually WebFetched and that confirmed a claim>
SAFETY_CONSTANTS_LEFT_GATED: <yes if this galaxy had cutting constants you correctly left gated, no, or n/a>
MEMORY_UPDATED: <yes/blocked>
PACKET_FLIPPED: <yes/no>
NOTE: <one line: the single most valuable thing you promoted>`
}

// WAVE-CHUNKED: 3 galaxies per wave, sequential waves (caps concurrent agents at 3, under the server throttle).
const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `verify:${entry.g}`, phase: 'VerifyPromote' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`verify-promote complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
