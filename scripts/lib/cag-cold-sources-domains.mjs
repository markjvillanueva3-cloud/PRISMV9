// scripts/lib/cag-cold-sources-domains.mjs
//
// SIX-DOMAIN-KNOWLEDGE-AUTOPULL / U-AUTOPULL-CAG-DOMAINS (slot:zulu, 2026-06-28)
//
// PURPOSE -- close the uniform CAG cold-anchor gap surfaced by the 6-domain auto-pull
// audit (state/shared/specs/SIX-DOMAIN-KNOWLEDGE-AUTOPULL-2026-06-28.md, correction C4):
// every per-domain galaxy brain (mcp-server/src/engines/<galaxy>/MEMORY.md) exists and is
// curated, but NONE was in the CAG cold-recall tier -- so a domain query ("lathe G50 CSS
// chuck", "wedm wire flush", "trochoidal chip thinning") never auto-recalled the domain's
// own doctrine; the knowledge sat idle on disk. This adds ONE cold-tier entry per domain
// pointing at that domain's canonical MEMORY.md, so the doctrine auto-pulls at inference
// with zero Ollama / zero tool round-trip (sub-ms KV-cache tier).
//
// DESIGN
//  - PURE: a static domain->keywords map + path templates. No I/O at module load (cag-router
//    must stay pure/composable). The file READ happens lazily in the cag-router-inject hook,
//    exactly like every existing COLD_SOURCES entry.
//  - NON-FABRICATING: keywords are STANDARD domain vocabulary (the same terms the per-domain
//    awareness hooks + dispatchers use) + the dispatcher token -- never invented facts. The
//    `path` points at an existing curated file; we do NOT author content.
//  - DELIBERATE (per the COLD_SOURCES doctrine "each entry costs budget on a cold hit"): ONE
//    entry per domain -> its MEMORY.md (the canonical hand-curated per-domain knowledge:
//    landmines, status, atlas). The auto-compounded synthesis is already reachable via the
//    galaxy-cards / galaxy-digest cold entries; MEMORY.md per domain was the genuine gap.
//  - Keywords are domain-DISTINCTIVE compound terms so they do not over-match the generic
//    galaxy-cards entry (which serves cross-galaxy intent, a different shape).
//
// EXTENSIBLE: add a row to DOMAIN_COLD to cover another galaxy (R15 apply-to-all-galaxies).
// Knob: PRISM_CAG_DOMAIN_COLD_DISABLE=1 -> domainColdSources() returns [] (reversible per
//        feedback_never_delete_only_disable; cag-router falls back to the base cold tier).

const ENGINES = "H:/prism/mcp-server/src/engines";

// galaxy -> { keywords: [domain-distinctive vocabulary], approxBytes }.
// keywords MUST be domain-standard terms (cf. the per-domain awareness hooks + prism_* tokens),
// never fabricated facts. Compound/technical anchors preferred (avoid bare English words that
// over-match). Each MEMORY.md is the curated canonical brain confirmed present by the
// 2026-06-28 audit (cad 105L, post 190L, mill 139L, wedm 134L, lathe 124L, cam 91L).
// KEYWORD DISCIPLINE (scrutiny arm C, 2026-06-28 -- the P1 fix): a COLD verdict here has a
// SIDE-EFFECT -- cag-router-inject sets skip.{masterIndex,memory,tribal}Inject=true at conf>=0.4,
// SUPPRESSING those recall surfaces. So an over-broad keyword silently starves recall on an
// innocuous prompt. Every token below MUST be domain-UNAMBIGUOUS: a G-code (g50/g76), a brand
// (sodick/mastercam), a machining compound noun (chip thinning/dielectric flush), or the
// dispatcher token (prism_*). NO bare common-English words (css/turning/groove/chatter/esprit)
// and NO compound that collides with ordinary prose (boring bar -> "boring bar chart", tool crib
// -> "tool crib of utilities", thread pass -> "thread pass the token", skim/spark/boring removed).
// The `*_` dispatcher-prefix tokens were dropped (near-inert: `\bcam_\b` never matches `cam_strategy`).
const DOMAIN_COLD = Object.freeze([
  {
    galaxy: "cad",
    keywords: [
      "cad domain", "cad feature", "cad feature recognition", "step ap242", "ap242", "brep",
      "trilobe creator", "dfm check", "gd&t", "tolerance stack", "cad regeneration",
      "thermal compensation", "prism_cad", "cad kernel",
    ],
    approxBytes: 6000,
  },
  {
    galaxy: "post-processor",
    keywords: [
      "post processor", "post-processor", "postprocessor", "g-code dialect", "gcode dialect",
      "controller dialect", "nc post-processor", "cps file", ".cps", "alarm decoder",
      "tcp cancel", "sub-spindle", "masterpost", "prism_pp",
    ],
    approxBytes: 9000,
  },
  {
    galaxy: "mill",
    // NB: bare "end mill"/"face mill" dropped -- they collide with prose ("end mill the meeting")
    // and a COLD hit SUPPRESSES warm recall (scrutiny arm C). Genuine mill queries still surface
    // via the warm path + the dedicated foxtrot-mill-awareness hook; only the cold fast-path skips.
    keywords: [
      "mill domain", "milling wizard", "chip thinning", "radial engagement", "trochoidal milling",
      "stability lobe", "5-axis mill", "five-axis mill", "spindle power headroom",
      "tool deflection", "prism_mill",
    ],
    approxBytes: 6500,
  },
  {
    galaxy: "wedm",
    // "discharge energy" dropped (collides with "battery discharge energy" prose).
    keywords: [
      "wedm", "wire edm", "wire-edm", "edm wire", "sodick", "agie charmilles", "agiecharmilles",
      "wire break detection", "dielectric flush", "electrode wire", "wire wizard", "prism_wedm",
    ],
    approxBytes: 6500,
  },
  {
    galaxy: "lathe",
    keywords: [
      "lathe domain", "lathe wizard", "turning operation", "g50", "constant surface speed",
      "chuck jaw", "jaw force", "g76 thread", "part-off", "tailstock", "prism_turning",
    ],
    approxBytes: 6000,
  },
  {
    galaxy: "cam",
    // "rest machining" dropped (collides with "rest machining schedule" / "the rest, machining...").
    keywords: [
      "cam domain", "cam toolpath", "toolpath strategy", "mastercam", "hypermill", "solidcam",
      "gouge check", "cam strategy", "collision-free toolpath", "prism_cam",
    ],
    approxBytes: 5500,
  },
]);

/**
 * Build the per-domain cold-tier registry entries (pure; no I/O).
 * Returns [] when PRISM_CAG_DOMAIN_COLD_DISABLE=1 (reversible kill switch).
 * @param {object} [env=process.env]
 * @returns {ReadonlyArray<{id:string,path:string,keywords:string[],coldRationale:string,sizeBytes:number}>}
 */
export function domainColdSources(env = process.env) {
  if (env && env.PRISM_CAG_DOMAIN_COLD_DISABLE === "1") return Object.freeze([]);
  return Object.freeze(
    DOMAIN_COLD.map((d) =>
      Object.freeze({
        id: `${d.galaxy}-doctrine`,
        path: `${ENGINES}/${d.galaxy}/MEMORY.md`,
        keywords: Object.freeze([...d.keywords]),
        coldRationale:
          `Per-domain curated galaxy brain (${d.galaxy} MEMORY.md): landmines + status + atlas. ` +
          `Append-mostly within a session (same 'stable within a session' basis as galaxy-cards); ` +
          `cold-anchored so a ${d.galaxy} query auto-recalls the domain's own doctrine at inference.`,
        sizeBytes: d.approxBytes,
      })
    )
  );
}

// The canonical list of galaxies covered (for tests + extension audits).
export const DOMAIN_COLD_GALAXIES = Object.freeze(DOMAIN_COLD.map((d) => d.galaxy));
