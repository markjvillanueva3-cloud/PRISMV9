// scripts/lib/academy-approach-knowledge.mjs
//
// PRISM ACADEMY auto-firing "approach knowledge" -- slot:zulu 2026-07-01 (for lima).
//
// The eighth clone of the proven task auto-firing pattern. When a course/lesson is
// built, shipped, or a curriculum topic is taught, this surfaces the SPECIFIC verified
// contract/law the academy build must respect (ship-contract wiring, prerequisite DAG,
// MIT-OCW attribution, no-inline-constants, and the physics laws the lessons teach).
//
// SOURCING (R12 -- no fabrication): mined by the lima-academy domain-soul agent from the
// real academy engines + course DATA files + galaxy CLAUDE.md, then INDEPENDENTLY
// re-verified (waved-mining verify arm PASS, 2026-07-01) against the cited file:line.
// Physics NUMBERS are NEVER inlined -- a lesson cites kc1.1/Taylor from constants.ts.
// Greenfield domain (no prior academy-approach lib); op->gate map, no machine axis.
// This is a FIRST-PASS sample of a deep 28-course + 17-engine corpus (not exhaustive).
//
// ASCII-only (ascii-guard). No em-dashes.

// ---- operation taxonomy (the academy operations a build/lesson encounters) ----
export const ACADEMY_OPERATIONS = Object.freeze([
  "course_build",            // author/assemble a course
  "course_build_from_rules", // auto-generate a course from rules
  "course_ship",             // ship a course (3-leg contract)
  "course_enroll",           // student enrollment
  "course_progress",         // progress / unlock
  "learn_course_from_source",// ingest a lesson from an external source (MIT-OCW etc.)
  "learn_curriculum_force",  // teach cutting-force
  "learn_curriculum_rpm",    // teach speed/rpm
  "learn_curriculum_feedrate", // teach feed
  "learn_curriculum_material", // teach material machinability
  "learn_curriculum_toollife", // teach tool life
]);

// ---- the verified gate map (each gate cites its mined+verify-arm-PASS source) ----
const GATES = Object.freeze({
  three_leg_ship_contract: {
    id: "three_leg_ship_contract",
    rule: "A course is INVISIBLE to the learner unless all 3 legs ship together: LEG1 course-data file, LEG2 CurriculumEngine import + courseDefinitions id wiring, LEG3 web/src/data/academy.ts COURSE_BLUEPRINTS entry",
    enforcedBy: "lima-course-ship-guard.mjs (slot/lima worktree) + CurriculumEngine courseDefinitions",
    cite: "mcp-server/src/engines/academy/CLAUDE.md:38-46",
    ops: ["course_ship", "course_build", "course_build_from_rules"],
    confidence: "verified",
  },
  prereq_completed_before_unlock: {
    id: "prereq_completed_before_unlock",
    rule: "A course's prerequisites[] (course IDs) must each be completed:true in student.courseProgress before that course is unlockable; getRecommendedCourse also filters on prerequisites.every(...completed)",
    enforcedBy: "CurriculumEngine (enrollment gate + getRecommendedCourse)",
    cite: "mcp-server/src/engines/CurriculumEngine.ts:377-382,717-720",
    ops: ["course_enroll", "course_progress", "learn_curriculum_rpm"],
    confidence: "verified",
  },
  prereq_dag_acyclic: {
    id: "prereq_dag_acyclic",
    rule: "The prerequisite graph is a DAG -- a circular prerequisite silently breaks LearningPathEngine traversal, so no course's transitive prerequisite closure may contain itself",
    enforcedBy: "scripts/audit-academy-prereq-chain.mjs (slot/lima worktree; 6 problem classes incl circular)",
    cite: "mcp-server/src/engines/academy/CLAUDE.md:153-154",
    ops: ["course_build", "course_build_from_rules", "course_enroll"],
    confidence: "verified",
  },
  mit_ocw_attribution_required: {
    id: "mit_ocw_attribution_required",
    rule: "Every lesson sourced from MIT-OCW content MUST call the MIT-OCW citation/attribution action (mcdl_cite_sources) before the lesson is shippable -- provenance is not optional",
    enforcedBy: "MITCourseDeepLearningEngine (prism_dev:mcdl_cite_sources)",
    cite: "mcp-server/src/engines/academy/CLAUDE.md:102,193",
    ops: ["course_build", "learn_course_from_source"],
    confidence: "verified",
  },
  no_inline_physics_constants_in_lessons: {
    id: "no_inline_physics_constants_in_lessons",
    rule: "Any lesson teaching speed/feed/force MUST cite kc1.1/Taylor/material values from the canonical constants source, never inline them into lesson body text or course DATA files",
    enforcedBy: "src/physics/constants.ts (canonical) + stop_on_inlined_constants.mjs hook",
    cite: "mcp-server/src/engines/academy/CLAUDE.md:130-132,166",
    ops: ["course_build", "course_build_from_rules", "learn_curriculum_force", "learn_curriculum_rpm", "learn_curriculum_feedrate", "learn_curriculum_material", "learn_curriculum_toollife"],
    confidence: "verified",
  },
  kienzle_force_law: {
    id: "kienzle_force_law",
    rule: "Fc = kc1.1 * ap * fz^(1-mc) (Kienzle 1952) -- cutting force scales linearly with depth ap and as a power-law in chip load fz with exponent (1-mc); kc1.1 and mc are material properties, never course-inlined numbers",
    enforcedBy: "CuttingForceEngine / SpeedFeedOrchestratorEngine (constants.ts is the numeric source)",
    cite: "mcp-server/src/data/academy/course-2-speed-feed-mastery.ts:88-104",
    ops: ["course_build", "learn_curriculum_force"],
    confidence: "verified",
  },
  merchant_shear_angle_law: {
    id: "merchant_shear_angle_law",
    rule: "Merchant's circle (1945): shear angle phi = 45deg - (beta - alpha)/2 (alpha=rake, beta=friction angle=arctan(mu)); Kienzle empirically runs 40-80% above Merchant because Merchant assumes ideal orthogonal cutting while real milling is oblique with rubbing/plowing -- do not conflate the two models' outputs without noting the offset",
    enforcedBy: "course-32 dual-level pedagogy template (documentary; no live engine computes Merchant directly)",
    cite: "mcp-server/src/data/academy/course-32-machining-math-science-deep-dive.ts:44-49,83-88",
    ops: ["course_build", "learn_curriculum_force"],
    confidence: "verified",
  },
  spindle_axial_radial_stiffness_anisotropy: {
    id: "spindle_axial_radial_stiffness_anisotropy",
    rule: "Spindle stiffness is direction-dependent: Kz (axial) >> Kr (radial), typically 5-10x per ISO 230-7; deflection delta=F/K is always larger for radial force at equal magnitude -- bias toolpath force axial where tolerance is tight",
    enforcedBy: "course-29 dual-level pedagogy template (documentary; ToolDeflection/PartDeflection engines compute)",
    cite: "mcp-server/src/data/academy/course-29-toolpath-reasoning-dual-level.ts:51-57",
    ops: ["course_build", "learn_curriculum_force"],
    confidence: "verified",
  },
  stainless_minimum_chip_thickness: {
    id: "stainless_minimum_chip_thickness",
    rule: "Below a minimum chip-thickness the tool RUBS instead of cutting, plastically work-hardening the surface (e.g. 304: HV200 -> HV254, +27%), accelerating wear on the NEXT pass -- never program a finishing pass with chip thickness below the material's minimum-chip floor",
    enforcedBy: "speed_feed_calc / chip_thinning dispatcher actions (course cites these as its enforcing surface)",
    cite: "mcp-server/src/data/academy/course-33-material-machining-atlas.ts:304,309",
    ops: ["course_build", "learn_curriculum_material", "learn_curriculum_feedrate"],
    confidence: "verified",
  },
  magnesium_fire_categorical_hazard: {
    id: "magnesium_fire_categorical_hazard",
    rule: "Magnesium fines are a Class-D fire hazard (ignite ~500C, water reacts explosively with Mg to release H2, ABC extinguishers spread rather than suppress) -- magnesium must never be machined dry; categorical safety doctrine, not a tunable numeric threshold",
    enforcedBy: "MagnesiumMachiningEngine + calcDispatcher magnesium_fire_risk action",
    cite: "mcp-server/src/data/academy/course-33-material-machining-atlas.ts:332,381,387-388,395",
    ops: ["course_build", "learn_curriculum_material"],
    confidence: "verified",
  },
  iso_1832_insert_code_grammar: {
    id: "iso_1832_insert_code_grammar",
    rule: "ISO 1832:2017 insert designation is a fixed POSITIONAL grammar (shape/clearance/tolerance/fixturing/IC/thickness/nose-radius/chip-breaker) -- each position is a categorical lookup, not free text; nose radius + chip-breaker are the two positions that feed numeric speed-feed inputs (Ra ~ f^2/(32*r_eps), Brammertz 1961)",
    enforcedBy: "SpeedFeedOrchestratorEngine consumes nose-radius + feed-range derived from the code; course documents the grammar",
    cite: "mcp-server/src/data/academy/course-17-tooling-codes.ts:36-52,80-85",
    ops: ["course_build", "learn_curriculum_rpm", "learn_curriculum_feedrate"],
    confidence: "verified",
  },
  namespace_course_action_disambiguation: {
    id: "namespace_course_action_disambiguation",
    rule: "prism_knowledge and prism_operating_system both expose course_* shaped actions that are NOT interchangeable -- a course/lesson must NAME which dispatcher namespace it targets, never assume by shape alone",
    enforcedBy: "knowledgeDispatcher.ts vs operatingSystemDispatcher.ts (two distinct action tables)",
    cite: "mcp-server/src/engines/academy/CLAUDE.md:159-160",
    ops: ["course_build", "course_enroll", "course_progress"],
    confidence: "verified",
  },
  dispatcher_citation_must_resolve: {
    id: "dispatcher_citation_must_resolve",
    rule: "Every course DATA file's prismDispatcherActions[] entries (e.g. speed_feed_calc, chip_thinning) must name an action that actually RESOLVES in a live dispatcher -- an aspirational/renamed action silently breaks the course's 'try it live' surface",
    enforcedBy: "scripts/audit-course-dispatcher-citations.mjs (slot/lima worktree; cross-refs prismDispatcherActions[] vs dispatcher source)",
    cite: "mcp-server/src/engines/academy/TOOLBELT.md:17,29 + course-33-material-machining-atlas.ts:309",
    ops: ["course_build", "course_build_from_rules"],
    confidence: "verified",
  },

  // ---- corroborated-promotion gates (soul-verified lima arm, wf_0524c0db-eaa 2026-07-02) ----
  vb_flank_wear_toollife_standard_citation: {
    id: "vb_flank_wear_toollife_standard_citation",
    rule: "Flank-wear VB is the standard tool-change criterion (VB approx 0.3mm per the PRISM wear engines' canonical limit); cite ISO 3685:1993 for single-point TURNING tool-life tests and ISO 8688-1/-2:1989 for MILLING -- never swap the two standards",
    enforcedBy: "ArchardAdhesiveWearEngine / AdvancedWearPhysicsEngine / AdvancedCuttingPhenomenaEngine (VB limit source) + course-5-turning-operations.ts + course-4-milling-operations.ts (course citations)",
    cite: "ISO 3685:1993 + ISO 8688-1/-2:1989 -- course-5-turning-operations.ts:358,389 + course-4-milling-operations.ts:447 + course-2-speed-feed-mastery.ts:727 + ArchardAdhesiveWearEngine.ts:446,515 + AdvancedWearPhysicsEngine.ts:497,597 (soul-verified lima wf_0524c0db-eaa 2026-07-02)",
    ops: ["course_build", "learn_curriculum_toollife"],
    confidence: "verified",
  },
  taylor_toollife_law: {
    id: "taylor_toollife_law",
    rule: "Taylor tool life law Vc*T^n = C (Taylor 1907; ISO 3685:1993) is a required learn_curriculum_toollife topic, distinct from the VB wear-stopping criterion; n and C are material-specific, sourced ONLY from constants.ts CANONICAL_TAYLOR, never inlined as a universal range in course data",
    enforcedBy: "course-2-speed-feed-mastery.ts (Module 3, Taylor Tool Life) + src/physics/constants.ts (taylorLife()/CANONICAL_TAYLOR)",
    cite: "Taylor F.W. 1907 'On the Art of Cutting Metals' ASME Trans. 28 + ISO 3685:1993 -- course-2-speed-feed-mastery.ts:152,157,726,871 + constants.ts:1030-1032,1039-1043 (soul-verified lima wf_0524c0db-eaa 2026-07-02)",
    ops: ["course_build", "learn_curriculum_toollife"],
    confidence: "verified",
  },
  iso_286_tolerance_grade_grammar: {
    id: "iso_286_tolerance_grade_grammar",
    rule: "ISO 286-2:2010 IT tolerance grades (IT01-IT18) plus ISO 286-1 hole/shaft fit letters are a foundational fits-and-limits topic; a lesson may NAME a grade or fit letter (e.g. H7) but must derive the tolerance magnitude only from FitNotationParserEngine's ISO 286-1 table, never inline it",
    enforcedBy: "FitNotationParserEngine (ISO 286-1 IT-grade table + fit-notation parser) + CAMISO286FitClassifierEngine (IT-grade/fit classifier)",
    cite: "ISO 286-1:2010 + ISO 286-2:2010 -- FitNotationParserEngine.ts:21-24,97-120,153 + CAMISO286FitClassifierEngine.ts:5-10,56 + course-0c-blueprint-reading.ts:538 (soul-verified lima wf_0524c0db-eaa 2026-07-02)",
    ops: ["course_build"],
    confidence: "verified",
  },
});

// Pre-index ops -> gate ids (cheap lookup, frozen).
const OPS_TO_GATES = (() => {
  const m = {};
  for (const op of ACADEMY_OPERATIONS) m[op] = [];
  for (const g of Object.values(GATES)) {
    for (const op of g.ops) if (m[op]) m[op].push(g.id);
  }
  return Object.freeze(m);
})();

function isStr(s) { return typeof s === "string" && s.length > 0; }

// ---- the firing entry point ----
export function fireForApproach(ctx) {
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const rawOps = Array.isArray(c.operations) ? c.operations : [];
  const ops = [];
  for (const op of rawOps) {
    if (!isStr(op) || !OPS_TO_GATES[op]) continue;
    const gates = OPS_TO_GATES[op]
      .map((id) => GATES[id])
      .map((g) => ({ id: g.id, rule: g.rule, enforcedBy: g.enforcedBy, cite: g.cite }));
    ops.push({ operation: op, gates });
  }
  const summary = `${ops.length} academy operation(s)`;
  return { operations: ops, summary };
}

// UNVERIFIED gaps -- the academy verify-backlog (numeric thresholds + unverified action names).
// NOT fired; surfaced by the autofire coverage worklist. Safety rail: specialist-confirm first.
export const ACADEMY_UNVERIFIED_GAPS = Object.freeze([
  "Cpk qualification floors are NUMERIC (SAFETY carveout): operator>=1.0 / setup>=1.33 / programmer>=1.67 from EmployeeMachineDomainAcademyEngine / business sentinel -- GAP; needs hotel/quality specialist confirm before any academy gate references the number directly rather than by name. cite=mcp-server/src/engines/academy/CLAUDE.md:134-135 (verify PASS)",
  "Certification pass percentages are NUMERIC pedagogy policy: >=70%/80%/85%/90% by level (Foundational/Operator/Programmer/Master) -- owner-adjustable, GAP not GATE. cite=mcp-server/src/engines/CurriculumEngine.ts:26-29 (verify PASS)",
  "Kienzle-vs-Merchant discrepancy MAGNITUDE unverified: the '40-80% above Merchant' offset is asserted in course prose without a cited primary source distinct from the course's own worked example -- the shear-angle LAW is solid, the offset MAGNITUDE is not independently cited; needs a physics-specialist confirm vs a paper. cite=mcp-server/src/data/academy/course-32-machining-math-science-deep-dive.ts:83-88 (verify PASS)",
  "xproc action names UNVERIFIED: xproc_kg_project_features + xproc_calibration_monitor_record are referenced as the closed-loop integration actions but explicitly flagged UNVERIFIED (grep-confirm before calling) -- not opened this session. cite=mcp-server/src/engines/academy/CLAUDE.md:212-213 (verify PASS)",
  "NIMS exam/OJT-hour specifics UNVERIFIED: Level-1 exam question counts, exact OJT-hour figures, and the 'eleven Level-1 certs' claim remain UNVERIFIED per the galaxy's own staging doc; numeric/cert-count specifics need lima verification vs the NIMS primary source before any course cites them as fact. cite=mcp-server/src/engines/academy/MEMORY.md:97 (staging doc not opened this session)",
  "NIMS Machining Level I competency (job planning + benchwork) should be demonstrated before the CNC-milling lab unlocks -- a credential-competency sequencing gate distinct from the generic prereq-DAG (topic ordering, not external-credential competency); cross-refs the existing 'NIMS exam/OJT-hour specifics UNVERIFIED' gap. external-source candidate: NIMS Machining Level I Credentialing Standards (2020); class=categorical (competency-sequencing); lima confirms the NIMS competency->unlock map before firing (slot:zulu phase-2-2B 2026-07-01)",
  "OSHA 1910.212 machine-guarding + emergency-stop verification must be taught + assessed before any student operates a manual lathe/mill -- a categorical shop-safety fact a lab-gating curriculum must enforce, distinct from the magnesium-fire hazard gate. external-source candidate: OSHA 29 CFR 1910.212(a)(1); MIT-OCW 2.008; class=categorical (safety-fact); lima confirms placement before the first machining lab before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Lockout/Tagout (OSHA 1910.147) authorized-employee training is a mandatory prerequisite for any maintenance / tool-change lab -- a categorical procedural safety gate not in the existing safety list. external-source candidate: OSHA 29 CFR 1910.147(c)(7); class=categorical (safety-procedure); lima confirms which lab modules require the LOTO prereq before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Process-capability Cp >= 1.33 in a pilot run before the SPC control-chart lab unlocks -- a curriculum-unlock capability threshold; cross-refs the existing academy Cpk-qualification-floors gap (that is operator/setup/programmer qualification; this is a LAB-unlock pedagogy threshold). external-source candidate: Montgomery Introduction to Statistical Quality Control 7e Ch8; MIT-OCW 2.810; class=numeric-threshold (Cp unlock floor); lima/quality confirm the unlock value before firing (slot:zulu phase-2-2B 2026-07-01)",
]);

// ---- detect academy operations from a course/lesson prompt ----
export function detectOperations(text) {
  if (!isStr(text)) return [];
  const t = text.toLowerCase();
  const found = new Set();
  if (/ship[\s-]?(?:a )?course|course[\s-]?ship|3[\s-]?leg|three[\s-]?leg/.test(t)) found.add("course_ship");
  if (/build.*course.*from.*rule|auto[\s-]?generate.*course|course[\s-]?from[\s-]?rule/.test(t)) found.add("course_build_from_rules");
  if (/build.*(?:a )?course|author.*lesson|assemble.*curriculum|new lesson|add.*course/.test(t)) found.add("course_build");
  if (/enroll|unlock.*course|prerequisite/.test(t)) found.add("course_enroll");
  if (/course[\s-]?progress|mark.*complete|student.*progress/.test(t)) found.add("course_progress");
  if (/mit[\s-]?ocw|from.*(?:pdf|source|textbook|course material)|ingest.*lesson|attribut/.test(t)) found.add("learn_course_from_source");
  if (/teach.*force|cutting[\s-]?force lesson|merchant|kienzle lesson/.test(t)) found.add("learn_curriculum_force");
  if (/teach.*(?:speed|rpm)|insert[\s-]?code|iso[\s-]?1832/.test(t)) found.add("learn_curriculum_rpm");
  if (/teach.*feed|chip[\s-]?load lesson/.test(t)) found.add("learn_curriculum_feedrate");
  if (/teach.*material|magnesium|machinability lesson/.test(t)) found.add("learn_curriculum_material");
  if (/teach.*tool[\s-]?life|taylor lesson/.test(t)) found.add("learn_curriculum_toollife");
  return [...found];
}

// for tests
export const _internals = { GATES, OPS_TO_GATES };
