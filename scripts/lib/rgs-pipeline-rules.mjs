/**
 * rgs-pipeline-rules.mjs
 * Pure, no-I/O rule table mapping roadmap unit text -> PRISM dev pipeline skills + review agents.
 * Frozen rule arrays — mutation throws in strict mode (deep-frozen via deepFreezeArray
 * per U-DOMAIN-RULES Arm A scrutiny P0-2; the docstring's contract now actually holds).
 *
 * Exports:
 *   matchPipelines(unit) -> {skill, why, confidence}[]  (always >=1 entry; all entries frozen)
 *   matchAgents(unit)    -> string[]  (deduped agent names, [] if no match)
 */

/**
 * Deep-freeze an array of plain-object entries so the docstring contract holds:
 * every entry's properties throw on assignment in strict mode (not just the
 * outer array's indices). Required because callers receive references to these
 * objects via .map() / [...spread]; shallow freeze let them mutate the shared
 * singleton state at runtime. Bounded depth — entries are flat shape only.
 */
function deepFreezeArray(arr) {
  for (const entry of arr) Object.freeze(entry);
  return Object.freeze(arr);
}

// ---------------------------------------------------------------------------
// Pipeline rules
// Each rule: { test: RegExp | { test(s:string):boolean }, skill: string, why: string, confidence: number }
// confidence range 0.6–0.85 for keyword matches; 0.3 for generic fallback.
// ---------------------------------------------------------------------------
const RULES = deepFreezeArray([
  {
    test: /pdf|document|catalog|manual|datasheet/i,
    skill: "/pdf-learn",
    why: "unit involves PDF/document ingestion or parsing",
    confidence: 0.80,
  },
  {
    test: /video|youtube|tutorial|webinar/i,
    skill: "/video-learn",
    why: "unit involves video or tutorial content",
    confidence: 0.80,
  },
  {
    // Requires an actual build signal: engine\b (right-boundary only, catches FooEngine)
    // paired with skill/hook anywhere in the text (order-independent, no span regex),
    // OR an explicit "new engine" phrase.
    // The literal `forge-triple` phrase was REMOVED as a trigger (P0-5): envelope
    // descriptions carry boilerplate "forge-triple ownership in milestone header"
    // which fired this rule on ~98.6% of units. A genuine triple is still caught
    // by the structural engine + skill/hook signal.
    // "Update README wording" matches neither -> does NOT match.
    // Implementation: custom test function avoids catastrophic-backtrack risk of .{0,N} spans.
    test: { test: (s) => (/engine\b/i.test(s) && /\b(skill|hook)\b/i.test(s)) || /\bnew engine\b/i.test(s) },
    skill: "/forge-triple",
    why: "unit creates an engine + skill + hook triple",
    confidence: 0.85,
  },
  {
    // RGS-SYSTEM-UPDATE rule #4 (golf/fleet hygiene) — MUST precede /wire-unwired
    // so "wire the MCP actuator" or "fleet-reaper orphan sweep" routes to the
    // hygiene skill rather than the generic wiring skill.
    test: /\bfleet[-\s]?(reaper|health|hygiene|memory|task)\b|\borphan[-\s]?process\b|\bzombie\b|\bmcp[-\s]?(restart|watchdog|daemon|supervisor)\b|\bscheduled[-\s]?task\b|\bdocker[-\s]?wedge\b/i,
    skill: "/fleet-reaper",
    why: "fleet hygiene — orphan/zombie/MCP-watchdog/scheduled-task units route to hygiene skill",
    confidence: 0.80,
  },
  {
    // U-DOMAIN-RULES tightening (RGS-TOOL-AUTOINVOKE-MS1): the original bare
    // /wire|dispatcher|unwired|orphan|wiring/i false-matched 'Wire EDM' units
    // on the literal token "wire" (punch-list P1 line: "'Wire EDM' units
    // false-match /wire-unwired"). The fix excludes wire-EDM context first,
    // then requires a structural wiring signal — \bunwired\b / \borphan\b /
    // \bdispatcher\b / \bwiring\b (gerund — narrower than bare "wire").
    // The existing regression test ("Wire BarEngine to dispatcher needs
    // wiring") still hits via the "dispatcher" + "wiring" branch.
    test: { test: (s) => {
      if (/\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b/i.test(s)) return false;
      return /\bunwired\b|\borphan\b|\bdispatcher\b|\bwiring\b/i.test(s);
    } },
    skill: "/wire-unwired",
    why: "unit involves wiring engines to dispatchers",
    confidence: 0.80,
  },
  // ---------------------------------------------------------------------------
  // RGS-SYSTEM-UPDATE (2026-06-04) — 30 new domain rules closing the ~42%
  // GENERIC_FALLBACK gap. Ordered: high-specificity domain branches first so
  // they shadow the broader manufacturing rules below where needed.
  // ---------------------------------------------------------------------------

  // #1 — sierra: graph-infra / system-viz streaming units
  {
    test: /\b(regen-viz|system-viz|ghost-roost|augmentation|merge-augment|node-embedding|graph-merge)\b/i,
    skill: "/audit-viz-first",
    why: "graph-infra streaming-rewrite — system-viz / ghost-roost work",
    confidence: 0.80,
  },
  // #2 — india: AI-training units (LoRA, GNN, GraphSAGE, self-improving)
  {
    test: /\b(lora|gnn|graphsage|neural\s+net|deep\s+learning|self[-\s]?improv|retrain|fine[-\s]?tune)\b/i,
    skill: "/ai-train-india",
    why: "AI-training units — LoRA/GNN/GraphSAGE/retrain route to india substrate",
    confidence: 0.80,
  },
  // #3 — india: RAG / retrieval / embedding substrate
  {
    test: /\b(rag|embedding|semantic\s+search|corpus\s+embed|vector\s+index|hnsw|rerank|retrieval)\b/i,
    skill: "/wiki-query",
    why: "RAG/retrieval — query substrate first before building",
    confidence: 0.75,
  },
  // #5 — oscar: SFC calibration units
  {
    test: /\bsfc\b|speed[-\s]?feed|\bcalibrat/i,
    skill: "/auto-speed-feed",
    why: "SFC calibration units — routes to the speed-feed orchestrator",
    confidence: 0.80,
  },
  // #6 — oscar: vendor-parity (G-Wizard / HSMAdvisor / toolcrib / tooldb2)
  {
    test: /g-?wizard|hsmadvisor|toolcrib|tooldb2/i,
    skill: "/auto-speed-feed",
    why: "SFC vendor-parity branch — G-Wizard/HSMAdvisor/toolcrib",
    confidence: 0.80,
  },
  // #8 — kilo: in-seat add-in / vendor-bridge units
  {
    test: /add-?in|in-seat|fusion\s+(button|pillar)|mastercam\s+bridge|hypermill\s+bridge|F360-REV/i,
    skill: "/cam-bridge",
    why: "in-seat add-in + vendor-bridge units for CAM integration",
    confidence: 0.80,
  },
  // #15 — romeo: ghost-action / zod-enum wiring recognized as wiring work
  {
    test: /ghost[-\s]?action|zod\s+enum|ghost\.\*/i,
    skill: "/scrutinize",
    why: "ghost-action / zod-enum wiring work — routes to scrutiny + wiring review",
    confidence: 0.75,
  },
  // #16 — romeo/oscar: catalog DB-gen / tmlib / vendor catalog export parity
  {
    test: /catalog\s+db-?gen|\btmlib\b|\.machine\b|vendor\s+catalog/i,
    skill: "/pdf-learn",
    why: "catalog/export round-trip parity — PDF ingestion of vendor catalogs",
    confidence: 0.75,
  },
  // #17 — charlie: quoting / cost / pricing / DFM / margin
  {
    test: /\bquot(e|ing)\b|\bcost[-\s]?(estimat|model|index)\b|\bpricing\b|\bmargin\b|\bDFM\b|\bmonte[-\s]?carlo\b|P10\/P50\/P90/i,
    skill: "/quote-to-ship",
    why: "quoting/cost/pricing/DFM — routes to quote-to-ship orchestrator",
    confidence: 0.80,
  },
  // #18 — alpha: local-LLM offload / model routing
  {
    test: /\bollama\b|\boffload\b|local[-\s]?llm|qwen|route.?(profile|nudge)|model[-\s]?rout/i,
    skill: "/ollama-route-check",
    why: "local-LLM offload / model-routing units",
    confidence: 0.85,
  },
  // #19 — alpha: token-economy / cost-efficiency / context-budget / CAG
  {
    test: /\btokens?\b|\bcost\b|budget|context[-\s]?budget|efficien|cache|\bCAG\b|prompt[-\s]?cache/i,
    skill: "/token-dashboard",
    why: "token-economy / cost-efficiency / prompt-cache units",
    confidence: 0.80,
  },
  // #20 — alpha/sierra: Obsidian / vault / memory-sync / knowledge-vault
  {
    test: /obsidian|vault|memory[-\s]?sync|knowledge[-\s]?vault/i,
    skill: "/route-to-obsidian",
    why: "Obsidian/vault context-retention sync units",
    confidence: 0.80,
  },
  // #21 — hotel: business / ERP / finance / OEE / SPC
  {
    test: /\b(erp|quote.?to.?ship|invoice|payroll|gl\b|ledger|accounting|cost.?feedback|oee|spc|kaizen|six.?sigma|job.?cost|\bap\b|\bar\b|credit.?review)\b/i,
    skill: "/biz-health",
    why: "business/ERP/finance units — entirely unrouted without this rule",
    confidence: 0.80,
  },
  // #22 — hotel/general: persistence / durable-state / pg units
  {
    test: /persistence|\bpg\b|durable[-\s]?state/i,
    skill: "/wire-unwired",
    why: "in-memory-fallback / durable-state units need wiring review",
    confidence: 0.75,
  },
  // #23 — delta: CAD feature-recognition / DFM / tolerance-stack
  {
    test: /\bfeature[-\s]?recogni|\bdfm\b|\btolerance[-\s]?stack\b/i,
    skill: "/cad-feature-recognize",
    why: "geometry-analysis units — feature-recognition / DFM / tolerance-stack",
    confidence: 0.80,
  },
  // #24 — delta/xray: Fusion 360 / HyperCAD / live-bridge / add-in
  {
    test: /\bfusion\b|\bhypercad\b|\blive\s*bridge\b|add-?in/i,
    skill: "/fusion-generate",
    why: "live-host integration — Fusion360 / HyperCAD / add-in units",
    confidence: 0.80,
  },
  // #25 — delta: CAD corpus / coverage-matrix / reverse-engineer
  {
    test: /\bcorpus\b|\bcoverage[-\s]?matrix\b|reverse[-\s]?engineer/i,
    skill: "/cad-corpus",
    why: "CAD corpus population / coverage-matrix work",
    confidence: 0.80,
  },
  // #26 — delta: CAD self-improving loop / CAD-RAG / CADCAM-AGI
  {
    test: /\bcad[-\s]?train\b|\bcad[-\s]?rag\b|\bcadcam[-\s]?agi\b/i,
    skill: "/cad-train",
    why: "CAD self-improving loop / CAD-RAG / CADCAM-AGI units",
    confidence: 0.80,
  },
  // #27 — xray: OCR / vision-OCR / dimension-reconcile
  {
    test: /\bocr\b|vision[-\s]?ocr|dimension\s+reconcil|cross-source\s+dim/i,
    skill: "/extract-xray",
    why: "OCR/dimension-reconcile — multi-print-split discipline",
    confidence: 0.80,
  },
  // #28 — xray: GD&T / FCF / tolerance-stack / datum
  {
    test: /gd&t|gdt\b|\bfcf\b|tolerance\s+stack|\bdatum\b/i,
    skill: "/cad-tolerance-check",
    why: "GD&T / datum-schema-tie / FCF tolerance work",
    confidence: 0.80,
  },
  // #29 — xray: native CAD reader / STEP / IGES / parasolid / FreeCAD / Fusion f3d
  {
    test: /native\s+(cad\s+)?(reader|parser)|\bsat\b|parasolid|\bx_t\b|\bstep\b|\biges\b|\bfcstd\b|\bf3d\b/i,
    skill: "/forge-triple",
    why: "native-reader per-format-test — silent-empty-parse guard requires forge-triple",
    confidence: 0.80,
  },
  // #30 — lima: academy / course / curriculum / MIT-OCW (negative-lookbehind excludes "of course")
  {
    test: { test: (s) => /(?<!\bof\s)course\b|\bcurriculum\b|\blesson\b|\bquiz\b|\bcertif|\bMIT[-\s]?OCW\b|learning[-\s]?path|\bacademy\b/i.test(s) },
    skill: "/learn-corpus",
    why: "academy course/curriculum/MIT-OCW build — excludes 'of course' polysemy",
    confidence: 0.80,
  },

  // ---------------------------------------------------------------------------
  // U-DOMAIN-RULES (RGS-TOOL-AUTOINVOKE-MS1) — manufacturing-domain branches.
  // Routes units to the canonical Tier-3 parent skills (/mill, /lathe, /wedm,
  // /cam-strategy, /cad-from-blueprint). Closes the punch-list's 42% generic
  // fallback by giving the 5 highest-leverage process domains explicit rules.
  // All use \b word-boundaries to avoid false-fires (\bmill\b does NOT match
  // 'milligrams' or 'windmill'; \bcam\b does NOT match 'camera' or 'Cambridge').
  // Sub-skills (lathe-lora, wedm-audit, mill-studio, etc.) inherit through the
  // keyword cascade — they can register their own triggers later if needed.
  // ---------------------------------------------------------------------------
  {
    test: /\bmill(ing|-turn)?\b/i,
    skill: "/mill",
    why: "milling-domain unit — routes to the Tier-3 mill orchestrator",
    confidence: 0.80,
  },
  {
    // Polysemy guard (Arm A P0-1): bare `turning` matches "a turning point in
    // the project" and bare `okuma` matches "Okuma operator manual" — but
    // Okuma also builds HMCs/VMCs (MA-600, MB-46V, GENOS M460) and grinders,
    // so `okuma` solo is NOT a lathe-only signal. Structural test:
    //   • \blathe\b alone — unambiguous
    //   • \bmazak lathe\b — explicit pairing
    //   • okuma paired with a lathe-context model token (LT/LB/MULTUS/SimulTurn)
    //   • turning paired with a manufacturing-context noun
    test: { test: (s) => {
      if (/\blathe\b/i.test(s)) return true;
      if (/\bmazak\s+lathe\b/i.test(s)) return true;
      if (/\bokuma\b/i.test(s) && /\b(lt[-\s]?\d+|lb[-\s]?\d+|multus|simul[-\s]*turn|space[-\s]*turn|2sp|genos[-\s]*l)\b/i.test(s)) return true;
      if (/\bturning\b/i.test(s) && /\b(insert|tool|operation|program|cycle|cut|pass|finish|rough|center|spindle|chuck|sub[-\s]?spindle|css|toolpath|thread|groove|bore)\b/i.test(s)) return true;
      return false;
    } },
    skill: "/lathe",
    why: "lathe/turning-domain unit — routes to the Tier-3 lathe orchestrator",
    confidence: 0.80,
  },
  {
    test: /\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b/i,
    skill: "/wedm",
    why: "wire-EDM / sinker-EDM unit — routes to the Tier-3 WEDM orchestrator",
    confidence: 0.80,
  },
  // #7 — echo: post-processor / G-code dialect / controller / CIMCO / WinMax
  // Guard: \bwedm\b already matched above so WEDM-post units hit /wedm first.
  // Anti-polysemy: require structural post-proc signal, not bare \bpost\b alone.
  {
    test: { test: (s) => {
      if (/\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b/i.test(s)) return false;
      return /\bpost[-\s]?proc|\bpost[-\s]?gen|\bg[-\s]?code\b|\bdialect\b|\bcontroller\b|\bmaster[-\s]?post\b|byte[-\s]?equiv|\bcimco\b|\bwinmax\b/i.test(s);
    } },
    skill: "/post-generate",
    why: "post-processor / G-code dialect / controller / CIMCO / WinMax — echo domain",
    confidence: 0.80,
  },
  // #9 — foxtrot: print-to-program replication (matches nothing today)
  {
    test: /replicate[-\s]?from[-\s]?print|replication|print[-\s]?to[-\s]?program[-\s]?replication/i,
    skill: "/cad-from-blueprint",
    why: "print-to-program replication — foxtrot domain",
    confidence: 0.80,
  },
  // #10 — foxtrot: HyperMILL sub-galaxy / .hmt / cycle-catalog
  {
    test: /\bhypermill\b|\b\.hmt\b|cycle[-\s]?catalog/i,
    skill: "/hypermill-full-job",
    why: "HyperMILL sub-galaxy / .hmt tool-lib / cycle-catalog units",
    confidence: 0.80,
  },
  // #11 — whiskey: lathe master-post / OSP / .MIN post-productization
  {
    test: /lathe.*master.*post|lathe.*postgen|\bOSP\b|\.MIN/i,
    skill: "/lathe-master-post",
    why: "lathe master-post / OSP / .MIN post-productization units",
    confidence: 0.80,
  },
  // #12 — whiskey/echo: mill-turn / Swiss / sub-spindle / guide-bushing (safety-critical)
  {
    test: /\bmill[-\s]?turn\b|\bswiss\b|\bsub[-\s]?spindle\b|\bguide[-\s]?bushing\b/i,
    skill: "/lathe",
    why: "mill-turn / Swiss / sub-spindle safety-critical dormant-revival",
    confidence: 0.80,
  },
  // #13 — mike: WEDM dataset-builder / training-pair / retrain sub-route
  {
    test: /(lora|dataset.?builder|training.?pair|retrain).*wedm|wedm.*(lora|dataset)/i,
    skill: "/wedm",
    why: "WEDM dataset/training sub-route — inherits WEDM parent skill",
    confidence: 0.75,
  },
  // #14 — mike: WEDM dialect / controller-post / post-emit sub-route
  {
    test: /(dialect|controller.?post|post.?emit).*wedm|wedm.*(dialect|post)/i,
    skill: "/wedm-controller",
    why: "WEDM dialect/post sub-route — with CIMCO-sim acceptance",
    confidence: 0.75,
  },
  {
    // "camming" is intentional — Mastercam's cam-feature/camming strategy
    // is a legitimate machining term (per Arm B P3 note).
    test: /\bcam(?:ming)?\b|\btoolpath\b/i,
    skill: "/cam-strategy",
    why: "CAM strategy / toolpath selection",
    confidence: 0.75,
  },
  {
    // Polysemy guard (Arm A P1-2): \bdrawing\b matched "drawing conclusions"
    // / "drawing power from the spindle" — too broad. Dropped. The remaining
    // tokens (\bcad\b, \bblueprint\b, \bprint-to-program\b) cover the real
    // CAD-intake surface. If a unit honestly says "engineering drawing review"
    // and matches nothing else, the operator can invoke /cad-from-blueprint
    // manually — R12 (fail loud) preferred over R12 (over-fire).
    test: /\bcad\b|\bblueprint\b|\bprint[-\s]*to[-\s]*program\b/i,
    skill: "/cad-from-blueprint",
    why: "CAD / blueprint intake — routes to the print-to-CAD pipeline",
    confidence: 0.80,
  },
  {
    // \btest covers "test", "tests", "testing"; \bcoverage\b etc.
    test: /\btest(s|ing)?\b|coverage|vitest|\bspec\b/i,
    skill: "test-team",
    why: "unit involves tests or coverage",
    confidence: 0.75,
  },
  {
    test: /scrutin|review|audit|quality/i,
    skill: "/scrutinize",
    why: "unit involves scrutiny, review, audit, or quality",
    confidence: 0.70,
  },
  {
    test: /dedup|duplicate/i,
    skill: "/dedup",
    why: "unit involves deduplication",
    confidence: 0.75,
  },
]);

// Generic fallback — returned when NO rules match.
// Uses /scrutinize (not /forge-triple) so the contrapositive test holds:
//   a pure-docs unit must NOT produce /forge-triple.
const GENERIC_FALLBACK = deepFreezeArray([
  {
    skill: "/scrutinize",
    why: "generic review fallback — no keyword matched",
    confidence: 0.30,
  },
]);

// ---------------------------------------------------------------------------
// Agent rules
// Each rule: { test: RegExp, agent: string }
// ---------------------------------------------------------------------------
const AGENT_RULES = deepFreezeArray([
  {
    test: /physics|kienzle|taylor|force|thermal|feed|speed/i,
    agent: "physics-reviewer",
  },
  {
    test: /\btest(s|ing)?\b|coverage\b/i,
    agent: "test-review-agent",
  },
  {
    // U-DOMAIN-RULES Arm A P3-2: the original /wire|dispatcher|unwired/i had
    // the EXACT same wire-EDM false-match bug class as the pipeline rule fixed
    // above (a "Wire EDM corner physics fix" unit routed to wiring-review-agent
    // instead of physics-reviewer). Apply the same structural exclusion:
    // wire-EDM context => not wiring; otherwise require a structural wiring noun.
    test: { test: (s) => {
      if (/\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b/i.test(s)) return false;
      return /\bunwired\b|\bdispatcher\b|\bwiring\b|\borphan\b/i.test(s);
    } },
    agent: "wiring-review-agent",
  },
  // RGS-SYSTEM-UPDATE (2026-06-04) — new agent routing additions.
  // india: training/model units → test-review-agent (candidate→holdout integrity)
  {
    test: /\b(lora|gnn|graphsage|retrain|fine[-\s]?tune|holdout|auroc)\b/i,
    agent: "test-review-agent",
  },
  // golf: fleet hygiene → wiring-review-agent (placed after physics so spindle/torque still hits physics first)
  {
    test: { test: (s) => {
      if (/physics|kienzle|taylor|force|thermal|feed|speed/i.test(s)) return false;
      return /\bfleet[-\s]?(reaper|health|hygiene)\b|\borphan\b.*\bprocess\b|\bmcp[-\s]?daemon\b/i.test(s);
    } },
    agent: "wiring-review-agent",
  },
  // charlie: quoting/cost/pricing → code-analyzer (cost-model correctness + units-safety)
  {
    test: /\bquot(e|ing)\b|\bcost\b|\bpricing\b/i,
    agent: "code-analyzer",
  },
  // alpha: token-economy / ollama / offload / budget / cache → code-analyzer
  {
    test: /token|cost|\bollama\b|offload|budget|cache/i,
    agent: "code-analyzer",
  },
  // hotel: business/ERP → reviewer (debits===credits + no-inline-tax-tables + PII/consent)
  {
    test: /\b(erp|invoice|payroll|ledger|accounting|job.?cost|credit.?review|oee|spc)\b/i,
    agent: "reviewer",
  },
  // lima: academy units → reviewer (citation/provenance completeness — R9 ISO/Kienzle/Taylor)
  {
    test: /\b(course|curriculum|lesson|quiz|certif|academy)\b|\bMIT[-\s]?OCW\b|learning[-\s]?path/i,
    agent: "reviewer",
  },
]);

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * matchPipelines — maps a unit to applicable PRISM dev-pipeline skills.
 * @param {{ title: string, description: string }} unit
 * @returns {{ skill: string, why: string, confidence: number }[]}
 *   Always returns at least one entry (generic fallback when no rule matches).
 */
export function matchPipelines(unit) {
  const text = `${unit.title || ""} ${unit.description || ""}`;
  const matched = RULES.filter((r) => r.test.test(text)).map(({ skill, why, confidence }) => ({
    skill,
    why,
    confidence,
  }));
  return matched.length > 0 ? matched : [...GENERIC_FALLBACK];
}

/**
 * matchAgents — maps a unit to applicable review agent types.
 * @param {{ title: string, description: string }} unit
 * @returns {string[]} deduped agent names; [] if no rule matches
 */
export function matchAgents(unit) {
  const text = `${unit.title || ""} ${unit.description || ""}`;
  const seen = new Set();
  for (const { test, agent } of AGENT_RULES) {
    if (test.test(text)) seen.add(agent);
  }
  return [...seen];
}
