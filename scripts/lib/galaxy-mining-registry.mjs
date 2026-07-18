/**
 * galaxy-mining-registry.mjs -- the single source mapping each PRISM galaxy to
 * how its session transcripts are discovered + mined (GALAXY-TRANSCRIPT-MINE,
 * slot:kilo 2026-06-09).
 *
 * WHY a registry, not 34 cloned scripts: hotel + india each got a hand-cloned
 * per-domain miner (mine-hotel-transcripts.mjs, mine-india-transcripts.mjs).
 * Cloning 32 more would be 32 forks that drift (R8). Instead, ONE generalized
 * miner (mine-galaxy-transcripts.mjs) iterates THIS registry: each galaxy
 * supplies a topic-regex (matches HANDOFF-<id>-<topic>.md filenames + the slot
 * names that own it) and a domain `vocab` line that specializes the Ollama
 * map/reduce/synthesis prompts. The pipeline (stream spine -> map -> reduce ->
 * cross-session synthesis -> per-galaxy vault memory) is identical and proven.
 *
 * Grounded in `state/shared/CHAT-SLOT-DOMAINS.md` (operator-canonical slot->galaxy)
 * + the `mcp-server/src/engines/<galaxy>/` subdir roster (the 34 galaxies that
 * carry MEMORY.md + CLAUDE.md brain files). Each `galaxy` key IS the engine
 * subdir name, so `galaxy-synthesis-refresh.mjs` (which keys on that subdir)
 * compounds the mined memories into the right brain with no extra mapping.
 *
 * The topic-regex is a SUPERSET signal (slot name OR domain keyword), mirroring
 * india's INDIA_TOPIC_RE: AI work done under any slot's handoff is still captured
 * for the ai-training galaxy, etc. A transcript may route to MULTIPLE galaxies
 * (cross-domain sessions) -- that is correct, not a bug.
 *
 * ASCII-only (no em-dashes); regexes use `(^|[-_])...([-_]|$)` word-boundary
 * style so `mill` does not match `millturn`-only-by-accident-inside-another-word.
 */

/**
 * One registry entry per galaxy.
 *   galaxy : engine subdir name == galaxy-synthesis-refresh key (REQUIRED, unique)
 *   slots  : NATO slot names that own this galaxy per CHAT-SLOT-DOMAINS.md (for discovery + provenance)
 *   topic  : RegExp tested against a HANDOFF topic slug (lowercased). Word-boundaried.
 *   vocab  : short domain phrase injected into the Ollama prompts to specialize extraction
 */
export const GALAXY_REGISTRY = [
  {
    galaxy: "mill", slots: ["foxtrot", "alpha", "bravo"],
    topic: /(^|[-_])(mill|milling|hsm|trochoidal|adaptive[-_]?mill|mill[-_]?wizard|face[-_]?mill|pocket)([-_]|$)/i,
    vocab: "milling (Mill Wizard, HSM/trochoidal/adaptive, ap/ae engagement, face-mill, pocketing, mill speed/feed)",
  },
  {
    galaxy: "lathe", slots: ["whiskey"],
    topic: /(^|[-_])(lathe|turning|lathe[-_]?wizard|css|g96|g97|boring|grooving|parting|threading[-_]?lathe|tnr)([-_]|$)/i,
    vocab: "turning/lathe (Lathe Wizard, CSS G96/G97, boring, grooving/parting, single-point threading, nose-radius, sub-spindle)",
  },
  {
    galaxy: "wedm", slots: ["mike"],
    topic: /(^|[-_])(wedm|wire[-_]?edm|wire[-_]?wizard|edm|sinker|spark|wire[-_]?break|skim|flush)([-_]|$)/i,
    vocab: "wire EDM (Wire Wizard, multi-pass skim, wire-break prediction, flush, recast/HAZ, tech-tables, E-code families)",
  },
  {
    galaxy: "cam", slots: ["kilo"],
    topic: /(^|[-_])(cam|toolpath|hypermill|mastercam|fusion|esprit|powermill|solidcam|inventor[-_]?hsm|nx[-_]?cam|post[-_]?to[-_]?program|collision[-_]?check)([-_]|$)/i,
    vocab: "CAM cross-vendor strategy + toolpath (Fusion/Mastercam/hyperMILL/Inventor HSM/NX/Esprit/SolidCAM/PowerMill, adaptive pipeline, collision-check, print-to-program)",
  },
  {
    galaxy: "cad", slots: ["delta"],
    topic: /(^|[-_])(cad|geometry|cadquery|f360|fusion360|solidworks|step|iges|brep|feature[-_]?recognit|dfm|gdt|gd[-_]?t)([-_]|$)/i,
    vocab: "CAD geometry (CADQuery/Fusion360/SolidWorks scripting, STEP/IGES, feature recognition, DfM, GD&T, blueprint-to-model)",
  },
  {
    galaxy: "cad-fusion-live", slots: ["delta", "kilo"],
    topic: /(^|[-_])(cad[-_]?fusion[-_]?live|fusion[-_]?live|live[-_]?tooling|f3d[-_]?live)([-_]|$)/i,
    vocab: "live Fusion 360 automation bridge (in-host sketch/extrude/fillet, live geometry mutation, .f3d round-trip)",
  },
  {
    galaxy: "quoting", slots: ["charlie"],
    topic: /(^|[-_])(quoting|quote|quote[-_]?to[-_]?ship|pricing|estimat|margin|nre|bid|rfq|cost[-_]?index)([-_]|$)/i,
    vocab: "quoting (quote-to-ship, instant pricing, margin/NRE amortization, RFQ, bid-win calibration, cost-index)",
  },
  {
    galaxy: "business", slots: ["hotel"],
    topic: /(^|[-_])(business|erp|hr|accounting|payroll|invoice|employee|hotel|gl|ledger|customer|legal|owner|office)([-_]|$)/i,
    vocab: "business operations (ERP, HR/payroll, accounting/GL/AR/AP, customers, legal/compliance, office personnel, owner reporting)",
  },
  {
    galaxy: "ai-training", slots: ["india"],
    topic: /(^|[-_])(india|blackwell[-_]?ai|nn[-_]?graph|nng|gnn|graphsage|lora|rag|psn|ai[-_]?ms|ai[-_]?training|deep[-_]?learning|deep[-_]?reasoning|neural|octopus|consensus|machine[-_]?learning|pattern[-_]?recognition|embedding)([-_]|$)/i,
    vocab: "PRISM AI systems (NN/GNN/GraphSAGE, LoRA, RAG, PSN, deep-learning/reasoning, octopus consensus, AUROC/Brier/F1 deploy gates)",
  },
  {
    galaxy: "system-viz", slots: ["sierra", "papa"],
    topic: /(^|[-_])(system[-_]?viz|viz|graph[-_]?regen|regen[-_]?viz|roost|ghost[-_]?roost|node[-_]?card|canvas|cross[-_]?substrate)([-_]|$)/i,
    vocab: "system-viz (system-graph regen, ghost-roost generators, node-card cheap reads, canvas, cross-substrate edges, the fleet search substrate)",
  },
  {
    galaxy: "post-processor", slots: ["echo"],
    topic: /(^|[-_])(post[-_]?processor|post[-_]?proc|ppg|controller|dialect|fanuc|haas|okuma|siemens|heidenhain|g[-_]?code[-_]?gen|cps)([-_]|$)/i,
    vocab: "post-processors (G-code generation per controller/dialect: Fanuc/Haas/Okuma/Siemens/Heidenhain, .cps, master-post, prove-out)",
  },
  {
    galaxy: "speed-feed", slots: ["oscar"],
    topic: /(^|[-_])(speed[-_]?feed|sfc|sf[-_]?calc|cutting[-_]?data|kienzle|taylor|9[-_]?axis|feeds[-_]?and[-_]?speeds|chip[-_]?load)([-_]|$)/i,
    vocab: "Speed/Feed Calculator (SFC 9-axis, Kienzle/Taylor physics, cutting-data, chip-load, material-aware feeds/speeds)",
  },
  {
    galaxy: "academy", slots: ["lima"],
    topic: /(^|[-_])(academy|course|curriculum|lesson|quiz|instructor|learning[-_]?path|certification|mit[-_]?ocw)([-_]|$)/i,
    vocab: "PRISM Academy (courses, curriculum, quizzes, certification paths, instructor tools, MIT-OCW knowledge conversion)",
  },
  {
    galaxy: "quality", slots: ["hotel", "delta"],
    topic: /(^|[-_])(quality|spc|cpk|cmm|gauge[-_]?rr|fai|gdt[-_]?validat|metrology|tolerance[-_]?stack|as9100|iso[-_]?13485)([-_]|$)/i,
    vocab: "quality/metrology (SPC, Cpk, CMM, gauge R&R, FAI, GD&T validation, tolerance stack, AS9100/ISO13485 compliance)",
  },
  {
    galaxy: "shop-floor", slots: ["hotel"],
    topic: /(^|[-_])(shop[-_]?floor|oee|traveler|dispatch|labor|clock|work[-_]?order|operator[-_]?gate|setup[-_]?sheet)([-_]|$)/i,
    vocab: "shop-floor operations (OEE, travelers, dispatch queue, labor/clock tracking, work-orders, operator gates, setup sheets)",
  },
  {
    galaxy: "compliance-safety", slots: ["hotel", "delta"],
    topic: /(^|[-_])(compliance|safety|itar|ear|osha|loto|sds|nda|export[-_]?control|audit[-_]?trail|cfr820)([-_]|$)/i,
    vocab: "compliance/safety (ITAR/EAR export control, OSHA, LOTO, SDS, NDA lifecycle, audit trail, CFR820 medical)",
  },
  {
    galaxy: "database-expansion", slots: ["juliett"],
    topic: /(^|[-_])(database[-_]?expansion|db[-_]?gen|db[-_]?coverage|registry[-_]?expand|knowledgedb|db[-_]?bridge|jsonl[-_]?db|monolith[-_]?query)([-_]|$)/i,
    vocab: "database expansion (juliett KnowledgeDB intake, registry expansion, DB bridges, JSONL loaders, monolith unified-query)",
  },
  {
    galaxy: "frontend-app", slots: ["quebec"],
    topic: /(^|[-_])(frontend|web[-_]?app|phone[-_]?app|ui|ux|react|next[-_]?js|vite|tsx[-_]?page|quebec)([-_]|$)/i,
    vocab: "frontend (web app + phone app, React/Next.js/Vite, UI/UX, routes, state management, component design)",
  },
  {
    galaxy: "hermes-zulu", slots: ["zebra", "bravo"],
    topic: /(^|[-_])(hermes|zulu|zebra|orchestrat|fleet[-_]?coordinat|agent[-_]?chat|slot[-_]?brief|master[-_]?orchestrator)([-_]|$)/i,
    vocab: "Hermes/Zulu orchestration (agent-chat fleet, slot-brief, master orchestrator, fleet coordination, consensus routing)",
  },
  {
    galaxy: "agent-orchestration", slots: ["bravo", "zebra"],
    topic: /(^|[-_])(agent[-_]?orchestration|subagent|workflow|fan[-_]?out|multi[-_]?agent|swarm|brainstorm[-_]?path)([-_]|$)/i,
    vocab: "agent orchestration (subagent fan-out, Workflow/parallel/pipeline, multi-agent teams, brainstorm-path-forward, fleet-load gating)",
  },
  {
    galaxy: "fleet-hygiene", slots: ["golf"],
    topic: /(^|[-_])(fleet[-_]?hygiene|fleet[-_]?reaper|reaper|orphan|hygiene|zombie|tmp[-_]?orphan|fleet[-_]?task[-_]?health|git[-_]?contention)([-_]|$)/i,
    vocab: "fleet hygiene (golf reaper, orphan/zombie sweep, tmp-orphan janitor, fleet-task-health, git-contention, memory monitor)",
  },
  {
    galaxy: "discovery", slots: ["tango"],
    topic: /(^|[-_])(discovery|algorithm[-_]?discover|engine[-_]?discover|pipeline[-_]?discover|dormant[-_]?activat|tango)([-_]|$)/i,
    vocab: "discovery (tango algorithm/engine/pipeline discovery, dormant-engine activation, capability surfacing)",
  },
  {
    galaxy: "wiring", slots: ["romeo"],
    topic: /(^|[-_])(wiring|dispatcher[-_]?wire|wire[-_]?engine|unwired|orphan[-_]?engine|romeo|corpus[-_]?feed|cam[-_]?corpus)([-_]|$)/i,
    vocab: "wiring (romeo dispatcher-wiring, unwired-engine rescue, orphan-engine activation, corpus feed into dispatchers)",
  },
  {
    galaxy: "tribal-knowledge", slots: ["alpha"],
    topic: /(^|[-_])(tribal|tribal[-_]?knowledge|shop[-_]?knowledge|playbook|tribal[-_]?tip|tribal[-_]?embed|tribal[-_]?index)([-_]|$)/i,
    vocab: "tribal knowledge (shop-floor wisdom, playbook rules, tribal tips, tribal-embed index, per-material tips)",
  },
  {
    galaxy: "token-optimization", slots: ["alpha"],
    topic: /(^|[-_])(token[-_]?optim|token[-_]?savings|efficiency|context[-_]?forge|route[-_]?savings|ollama[-_]?offload|cag|context[-_]?budget)([-_]|$)/i,
    vocab: "token optimization (efficiency hunting, context-forge, route-savings, Ollama offload, CAG cold-cache, context budget)",
  },
  {
    galaxy: "knowledge-conversion", slots: ["lima", "india"],
    topic: /(^|[-_])(knowledge[-_]?conversion|mit[-_]?course|ocw[-_]?extract|course[-_]?forge|lane[-_]?a|lane[-_]?b|lane[-_]?c|algorithm[-_]?port)([-_]|$)/i,
    vocab: "knowledge conversion (MIT-OCW + monolith -> PRISM 3-lane router, course-forge, algorithm porting, Lane A/B/C)",
  },
  {
    galaxy: "blueprint-vision", slots: ["xray"],
    topic: /(^|[-_])(blueprint[-_]?vision|blueprint|ocr|vlm|vision[-_]?extract|drawing[-_]?ocr|print[-_]?ocr|xray|dimension[-_]?extract)([-_]|$)/i,
    vocab: "blueprint vision (xray OCR/VLM ensemble, drawing/print dimension extraction, multi-VLM consensus, blueprint-to-features)",
  },
  {
    galaxy: "pdf-corpus", slots: ["xray", "lima"],
    topic: /(^|[-_])(pdf[-_]?corpus|pdf[-_]?learn|pdf[-_]?ingest|handbook[-_]?extract|catalog[-_]?ingest|pdf[-_]?pipeline)([-_]|$)/i,
    vocab: "PDF corpus (handbook/catalog ingestion, pdf-learn pipeline, table extraction, source registry)",
  },
  {
    galaxy: "pdf-corpus-mill", slots: ["xray", "foxtrot"],
    topic: /(^|[-_])(pdf[-_]?corpus[-_]?mill|mill[-_]?handbook|mill[-_]?catalog|mill[-_]?pdf)([-_]|$)/i,
    vocab: "PDF corpus (mill-specific handbook/catalog ingestion feeding the mill galaxy)",
  },
  {
    galaxy: "corpus-aggregation", slots: ["romeo", "juliett"],
    topic: /(^|[-_])(corpus[-_]?aggregat|corpus[-_]?build|corpus[-_]?harvest|corpus[-_]?index|aggregate[-_]?corpus)([-_]|$)/i,
    vocab: "corpus aggregation (multi-source corpus harvest/build/index, vendor + MIT + online corpus consolidation)",
  },
  {
    galaxy: "dormant-data", slots: ["victor"],
    topic: /(^|[-_])(dormant[-_]?data|dormant|unused[-_]?asset|dead[-_]?data|victor|asset[-_]?surface)([-_]|$)/i,
    vocab: "dormant data (victor unused-asset surfacing, dead-data activation, no-consumer engine routing to wiring)",
  },
  {
    galaxy: "mit-curriculum", slots: ["lima", "india"],
    topic: /(^|[-_])(mit[-_]?curriculum|mit[-_]?ocw|ocw[-_]?course|mit[-_]?2|mit[-_]?6|curriculum[-_]?build)([-_]|$)/i,
    vocab: "MIT curriculum (OCW course extraction, MIT 2.x/6.x manufacturing+CS courses, theory-to-practice mapping)",
  },
  {
    galaxy: "backend-helper", slots: ["papa"],
    topic: /(^|[-_])(backend[-_]?helper|backend[-_]?dev|dev[-_]?loop|papa|backend[-_]?fix|infra[-_]?helper)([-_]|$)/i,
    vocab: "backend helper (papa backend dev-loop, infra fixes, support builds across galaxies)",
  },
  {
    galaxy: "bug-hunting", slots: ["bravo", "uniform"],
    topic: /(^|[-_])(bug[-_]?hunt|stub[-_]?hunt|regression[-_]?hunt|silent[-_]?failure|fail[-_]?loud|r12|stub[-_]?restore)([-_]|$)/i,
    vocab: "bug hunting (stub-hunt restoration, regression hunting, silent-failure detection, R12 fail-loud enforcement)",
  },
];

/** Lowercased galaxy keys, for quick membership checks + completeness asserts. */
export const GALAXY_KEYS = GALAXY_REGISTRY.map((g) => g.galaxy);

// The NATO slot names (+ legacy/domain prefixes) that key a slot-form handoff
// (HANDOFF-golf-<topic>, HANDOFF-lathe-<topic>, etc). The session short-id for
// these is unknowable from the filename, so `id` is null and they are
// CLASSIFY-ONLY (route to a galaxy for coverage accounting) but NOT mineable
// (the miner skips a null id -- it can't find a transcript). Kept distinct from
// the claude-<id> forms so the honesty of "mineable" counts is preserved (R12).
const SLOT_PREFIX_RE =
  /^HANDOFF-(alpha|bravo|charlie|delta|echo|foxtrot|golf|hotel|india|juliett|kilo|lima|mike|november|oscar|papa|quebec|romeo|sierra|tango|uniform|victor|whiskey|xray|yankee|zebra|zulu|ppg|pp|f360|lathe|wedm|mill|cam|cad)-(.+)$/i;

/**
 * Strip handoff extension forms to the bare stem. Two suffix conventions exist:
 *   `<stem>.md`                         (live)
 *   `<stem>.archive.2026-05-19[.md]`    (archived -- the `.md$` anchor missed these)
 * Returns the stem with all trailing extension/archive markers removed.
 */
function stripHandoffExt(filename) {
  return filename
    .replace(/\.md$/i, "")
    .replace(/\.archive\.[0-9T:.\-Z]+$/i, "");
}

/**
 * Classify a HANDOFF filename to the set of galaxies it belongs to.
 * Returns { id, topic, galaxies: string[], mineable } or null if no topic is
 * extractable (pid/session/timestamp-only forms carry NO galaxy signal -- an
 * honest drop, not a silent one). `id` is the 8-hex session short-id when the
 * filename carries one (claude-<id> / Agent@HOST_<uuid> forms), else null.
 * `mineable` is true only when a short-id is present (the miner needs it to find
 * the .jsonl). A transcript routes to EVERY galaxy whose topic-regex OR
 * owning-slot matches -- cross-domain sessions legitimately fan to multiple.
 *
 * Handled id schemes (in priority order):
 *   HANDOFF-claude-<8hex>-<4>-<4>-<4>-<12>-<topic>   (long full-UUID)
 *   HANDOFF-claude-<8hex>-<topic>                    (short 8-hex -- the common case)
 *   HANDOFF-Agent@HOST_<8hex>-<4>-<4>-<4>-<12>-<topic> (agent-fleet UUID)
 *   HANDOFF-<slot>-<topic>                            (slot-keyed; id unknown -> classify-only)
 */
export function classifyHandoff(filename, registry = GALAXY_REGISTRY) {
  if (typeof filename !== "string" || !/^HANDOFF-/i.test(filename)) return null;
  const stem = stripHandoffExt(filename);

  let id = null, topicRaw = null;
  let m;
  if ((m = /^HANDOFF-claude-([0-9a-f]{8})(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-(.+)$/i.exec(stem))) { id = m[1]; topicRaw = m[2]; }
  else if ((m = /^HANDOFF-claude-([0-9a-f]{8})-(.+)$/i.exec(stem))) { id = m[1]; topicRaw = m[2]; }
  else if ((m = /^HANDOFF-Agent@[^_]+_([0-9a-f]{8})(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-(.+)$/i.exec(stem))) { id = m[1]; topicRaw = m[2]; }
  else if ((m = SLOT_PREFIX_RE.exec(stem))) { id = null; topicRaw = `${m[1]}-${m[2]}`; } // keep the slot token in the topic as a routing signal
  else return null; // pid/session/timestamp-only -> no topic -> honest drop

  if (!topicRaw || topicRaw.length < 3) return null;
  const topic = topicRaw.toLowerCase();
  const galaxies = [];
  for (const g of registry) {
    const slotHit = g.slots.some((s) => new RegExp(`(^|[-_])${s}([-_]|$)`, "i").test(topic));
    if (slotHit || g.topic.test(topic)) galaxies.push(g.galaxy);
  }
  return { id: id ? id.toLowerCase() : null, topic, galaxies, mineable: id !== null };
}

/** Look up a single galaxy entry by key (null if absent). */
export function getGalaxy(key, registry = GALAXY_REGISTRY) {
  return registry.find((g) => g.galaxy === key) || null;
}

// Map a slot name -> the galaxies it owns (inverse of registry.slots). Built once.
const SLOT_TO_GALAXIES = (() => {
  const m = new Map();
  for (const g of GALAXY_REGISTRY) for (const s of g.slots) {
    if (!m.has(s)) m.set(s, []);
    m.get(s).push(g.galaxy);
  }
  return m;
})();

/**
 * Classify a transcript by its OWN CONTENT, not a handoff filename (user directive
 * 2026-06-09: the handoff system generates stubs; read the full transcripts). Two
 * independent signals, combined:
 *
 *   1. SLOT signal (strong): the transcript's internal `slot/<name>` git-branch or
 *      `H--prism-slot-<name>` cwd reveals which slot ran it -> that slot's owned
 *      galaxies get a strong base score. Pass via `slotHint` (the miner extracts it
 *      while streaming the spine -- cheap, no extra pass).
 *   2. TOPIC signal: how many DISTINCT galaxy topic-keywords appear in the spine.
 *      A galaxy whose regex matches the spine scores by match strength. This catches
 *      cross-domain work the slot alone misses (a bravo session that did cam work).
 *
 * Returns { galaxies: [{galaxy, score}], slotHint } sorted by score desc. A galaxy
 * is included only if score >= `minScore` (default 1) -- so a transcript that merely
 * MENTIONS a domain once in passing doesn't get a full synthesis written for it.
 * The slot's owned galaxies always clear the bar (they ran the session).
 *
 * `spine` is the role-labeled conversational text (same the miner builds). We test
 * the per-galaxy topic regex GLOBALLY against a lowercased sample (capped for speed).
 */
export function classifyTranscriptContent(spine, { slotHint = null, registry = GALAXY_REGISTRY, minScore = 1, sampleCap = 200000 } = {}) {
  const text = (typeof spine === "string" ? spine : "").slice(0, sampleCap).toLowerCase();
  const slotGalaxies = slotHint ? new Set(SLOT_TO_GALAXIES.get(slotHint) || []) : new Set();
  const scored = [];
  for (const g of registry) {
    let score = 0;
    // topic-keyword density over PROSE. The registry topic regexes use slug
    // boundaries `(^|[-_])...([-_]|$)` which only fire on hyphen/underscore-joined
    // handoff slugs -- they do NOT match space-separated prose ("wedm strategy").
    // For content classification we rebuild the keyword alternation with PROSE word
    // boundaries (`\b`) so a keyword surrounded by spaces/punctuation counts. Cap the
    // contribution at 5 so one keyword spammed 500x can't dominate (breadth > spam).
    const prose = proseTopicRegex(g.topic.source);
    if (prose) {
      const matches = text.match(prose);
      if (matches) score += Math.min(matches.length, 5);
    }
    // slot ownership: the slot that ran this session owns this galaxy -> strong base.
    if (slotGalaxies.has(g.galaxy)) score += 3;
    if (score >= minScore) scored.push({ galaxy: g.galaxy, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return { galaxies: scored, slotHint };
}

// Cache: slug-regex source -> compiled prose regex (rebuilt once per source).
const _proseCache = new Map();

/**
 * Convert a registry slug topic regex source into a PROSE-matching global regex:
 * strips the leading `(^|[-_])` and trailing `([-_]|$)` slug boundaries and wraps the
 * inner keyword alternation in `\b...\b`, so it matches keywords in space-separated
 * prose. Returns a `/gi` RegExp or null if the source doesn't fit the expected shape.
 */
export function proseTopicRegex(source) {
  if (_proseCache.has(source)) return _proseCache.get(source);
  let re = null;
  const m = /^\(\^\|\[-_\]\)(.*)\(\[-_\]\|\$\)$/s.exec(source);
  if (m) {
    // inner alternation, e.g. (wedm|wire[-_]?edm|...). Allow [-_]? in keywords to also
    // match a space (people write "wire edm" not just "wire-edm").
    const inner = m[1].replace(/\[-_\]\?/g, "[-_ ]?");
    try { re = new RegExp(`\\b${inner}\\b`, "gi"); } catch { re = null; }
  }
  _proseCache.set(source, re);
  return re;
}

/**
 * Extract a slot hint from a line of transcript content. Looks for the strong
 * internal signals: `slot/<name>` (git branch) or `H--prism-slot-<name>` (cwd).
 * Returns the lowercased slot name or null. Exported for the miner + tests.
 */
export function extractSlotHint(line) {
  if (typeof line !== "string") return null;
  let m = /H--prism-slot-([a-z]+)/i.exec(line);
  if (m) return m[1].toLowerCase();
  m = /(?:^|[^a-z])slot\/([a-z]+)/i.exec(line);
  if (m) return m[1].toLowerCase();
  return null;
}
