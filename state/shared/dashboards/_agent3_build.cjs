// Agent-3 Pass-2 enrichment builder. Reads slice-3, writes target JSON.
const fs = require("node:fs");
const { A, S } = require("./_agent3_const.cjs");

const IN  = "H:/prism/state/shared/dashboards/ke-pass2-resume-slice-3.json";
const OUT = "H:/prism/state/shared/dashboards/ke-pass2-resume-agent-3.json";
const SLICE = JSON.parse(fs.readFileSync(IN, "utf8"));

function classify(id) {
  if (id === "COMMAND-KERNEL-MS0::U-CK28") return "ck28";
  if (id === "COMMAND-KERNEL-MS0::U-CK29") return "ck29";
  if (id.startsWith("COST-CASCADE-MS0::U-BUILD-MOA")) return "cmoa";
  if (id.startsWith("COST-CASCADE-MS0::U-CASCADE-CALIBRATE")) return "ccal";
  if (id.startsWith("COST-CASCADE-MS0::U-CASCADE-FALLBACK")) return "cfal";
  if (id.startsWith("COST-CASCADE-MS0::U-COST-ALARM")) return "cala";
  if (id.startsWith("COST-CASCADE-MS0::U-COST-DASHBOARD")) return "cdas";
  if (id.startsWith("CPL")) return "cpl";
  if (id.startsWith("DB-EXP-MS")) return "dbexp";
  if (id.startsWith("DOMAIN-PIPELINE-MS0::U-DPM0-")) {
    if (id.includes("-MILL-")) return "dmill";
    if (id.includes("-LATHE-")) return "dlathe";
    if (id.includes("-WIRE-")) return "dwire";
    if (id.includes("-CAM-")) return "dcam";
    if (id.includes("-CAD-")) return "dcad";
    if (id.includes("-POST-")) return "dpost";
    if (id.includes("-ERP-")) return "derp";
    if (id.includes("-DATABASE-")) return "ddb";
    if (id.includes("-ACADEMY-")) return "dacad";
    if (id.includes("-MISC-")) return "dmisc";
    if (id.includes("-TRIBAL-")) return "dtrib";
    if (id.includes("-PRINT2PROG-")) return "dp2p";
    return "dother";
  }
  if (id.startsWith("EIGC-")) return "eigc";
  if (id.startsWith("ELEC-PIPE-")) return "elec";
  if (id.startsWith("EMP-MS0::")) {
    if (id.includes("U-AUTH")) return "esec";
    if (id.includes("U-SEC") || id.includes("U-SAN")) return "esan";
    if (id.includes("U-CLK")) return "eclk";
    if (id.includes("U-COST")) return "ecst";
    if (id.includes("U-EMP")) return "eemp";
    if (id.includes("U-LEAN")) return "elean";
    if (id.includes("U-MOD")) return "emod";
    if (id.includes("U-PER")) return "eper";
    return "eoth";
  }
  if (id.startsWith("F360-")) return "f360";
  if (id.startsWith("FEATURE-GAP-AUDIT-MS0::")) {
    if (id.includes("ACADEMY")) return "gacad";
    if (id.includes("CAD-")) return "gcad";
    if (id.includes("CAM-")) return "gcam";
    if (id.includes("DB-")) return "gdb";
    if (id.includes("ERP-")) return "gerp";
    if (id.includes("MISC-")) return "gmisc";
    if (id.includes("P2P-")) return "gp2p";
    if (id.includes("POST-")) return "gpost";
    return "goth";
  }
  return "generic";
}

function mkPipelineCell(u, slug, label) {
  const stage = (u.unitId.split("-").pop() || "").toLowerCase();
  return {
    addArchWiki: [A.pipeline, A.dom(slug), A.checkinLoop],
    addSeWiki: [S.engine, S.realTests, S.physicsConst],
    systemImpact:
      "Implements the " + stage.toUpperCase() +
      " stage of the 18-stage Domain Pipeline for the " + label +
      ". Consumers: PrintToProgramOrchestratorEngine (kilo slot) routes through this cell; sibling stages in the same domain depend on the artifact this cell produces. Telemetry feeds DOMAIN-PIPELINE-MS0 cell coverage metrics rendered in /system-viz ghost.domain_pipelines.",
    csDepth: [
      "Pipeline cells must be pure functions of their inputs — hidden state leaks across runs and breaks the digital-twin replay invariant.",
      "Per-cell SLO must be measured (latency + error rate) for the orchestrator adaptive routing; missing telemetry collapses adaptive mode to default.",
      "SAFETY_VALIDATE + OPERATOR_GATE are unconditional invariants — never compose a domain pipeline that skips them.",
    ],
  };
}

function mkF360(u) {
  const id = u.unitId;
  let role = "Fusion 360 milestone cell";
  if (id.includes("REV")) role = "Fusion 360 revenue milestone cell";
  if (id.includes("AP")) role = "Fusion 360 add-in / API milestone cell";
  if (id.includes("FULL")) role = "Fusion 360 full-integration milestone cell";
  if (id.endsWith("U-FXXX01")) {
    return {
      addArchWiki: [],
      addSeWiki: [S.schemaRead],
      systemImpact:
        "Placeholder F360 milestone envelope (U-FXXX01) — coordinator-only stub with no specific deliverable. Treat as documentation or close-out candidate until split into real units.",
      csDepth: [
        "Placeholder envelopes are a documented close-out-debt class — must be resolved by splitting or marking complete with a [SCOPED] commit.",
      ],
    };
  }
  return {
    addArchWiki: [A.dom("fusion"), A.dom("cam"), A.fusionBridge],
    addSeWiki: [S.engine, S.realTests, S.regression],
    systemImpact:
      role +
      " — wires into prism_cad / prism_cam dispatcher actions (cam_fusion_*, fusion360_*, f360_live_*) and the Fusion 360 Python add-in bridge for live geometry + toolpath synchronization.",
    csDepth: [
      "Live-API bridges have a connection-lifecycle invariant — every open() must be paired with close(), and crash-recovery must reset the add-in RPC state.",
      "Fusion 360 API is single-threaded — all script execution must marshal back onto the document thread (no off-thread document mutation).",
      "Add-in version must match server version (semver-pinned) — silent skew causes RPC schema-drift that corrupts geometry round-trips.",
    ],
  };
}

const REC = {
  ck28: {
    addArchWiki: [A.checkinLoop, A.rgsMs1, A.skillAutoLoader, A.masterIdx],
    addSeWiki: [S.recall, S.selfUpdate, S.loopState],
    systemImpact:
      "Closes the command-utilization telemetry loop into auto skill-tier promotion: command-telemetry-record (U-CK26) feeds skillAutoLoader and the ai-auto-command-router so under-used skills demote and high-leverage ones auto-load. Read by /checkin Step 12 autonomous loop and surfaced via priorityQueue picker; without this loop high-ROI skills stay cold while low-value ones consume the per-session injection budget.",
    csDepth: [
      "Telemetry feedback loop must be debounced to avoid oscillation under bursty fleet usage (per-slot 1-min throttle).",
      "Tier-promotion is a monotone state machine — never demote within the same session-window that promoted it (anti-flap invariant).",
      "Skill-utilization read path is O(n_skills) per UserPromptSubmit; cap at top-K (default 20) injection candidates to bound recall cost.",
    ],
  },
  ck29: {
    addArchWiki: [A.rgsMs0, A.knowledgeVault, A.obsidianFeed, A.memConflict],
    addSeWiki: [S.obsidian, S.recall, S.memoryCur],
    systemImpact:
      "Wires outcome telemetry from exception-record-outcome / analytics-update-outcome / roi-log-outcome / cam-feedback-record-outcome / risk-record-outcome into the memory-vault Stop-hook feeder so the psk recommend layer learns from real fleet outcomes. Direct consumers: prism_session:master_index_query, the priorityQueue picker, and the Beta re-rank used by /rgs tool-plan-coverage.",
    csDepth: [
      "Multi-producer single-consumer JSONL append pattern — every producer must use atomic write+rename, never partial writes (jsonl-ledger).",
      "Outcome conflict resolution: same predicate, divergent results — MemoryConflictResolverEngine must pick by recency × confidence, not raw count.",
      "Ledger growth is unbounded in expectation; require time-window rotation (default 30d) to keep query latency sublinear.",
    ],
  },
  cmoa: {
    addArchWiki: [A.costCascade, A.dom("cost"), A.consensusCoord],
    addSeWiki: [S.engine, S.realTests, S.perFile],
    systemImpact:
      "Aggregator engine consuming the three 3-of-3 scrutiny verdicts (Codex + Claude-A + Claude-B / analyst) and emitting a single MoaLayer2 verdict — read by scrutinize-before-stop.mjs Stop hook and the per-file scrutiny gate. Drives cost-savings telemetry into prism_dev:cost_route_infer.",
    csDepth: [
      "Aggregator must be order-independent (commutative across reviewer arms) and idempotent on duplicate verdict feed.",
      "Disagreement metric is a partial order — must escalate when no majority emerges instead of silently picking the first verdict.",
      "Memory of arm latency is O(arms × N) — cap window or use a streaming median to avoid unbounded growth.",
    ],
  },
  ccal: {
    addArchWiki: [A.costCascade, A.dom("cost"), A.dom("calibration")],
    addSeWiki: [S.engine, S.realTests, S.regression],
    systemImpact:
      "Probes the cost vs quality Pareto frontier so the cascade router can pick the cheapest model that still clears the quality gate. Consumers: prism_ai:cascade_calibrate, two_pass dispatcher action, and scrutinize-before-stop gate-threshold tuning.",
    csDepth: [
      "Pareto-front probing is exponential in number of tiers — bound with a budget-capped Bayesian search (cap_calls default 20).",
      "Quality score must be a real-valued metric (AUROC on a held-out oracle), never a stubbed boolean.",
      "Calibration outputs are time-decaying — stale > 7d points must be down-weighted, not deleted (audit trail invariant).",
    ],
  },
  cfal: {
    addArchWiki: [A.costCascade, A.dom("cost")],
    addSeWiki: [S.failLoud, S.engine, S.realTests],
    systemImpact:
      "Fallback chain orchestrator: when the cheapest model returns low-confidence the request escalates to the next tier (FrugalGPT pattern). Consumed by two_pass cascade in prism_ai and every cost-aware route in prism_dev:cost_route.",
    csDepth: [
      "Chain must terminate — bound max-hops (default 3) or recursion exhausts the budget envelope.",
      "Each escalation hop adds latency; total response-time is sum of per-tier latencies, must surface a worst-case SLA bound.",
      "Confidence gate must be fail-loud R12: low-confidence final tier returns error, never silently emits a last-tier result tagged best-effort.",
    ],
  },
  cala: {
    addArchWiki: [A.costCascade, A.dom("cost")],
    addSeWiki: [S.failLoud, S.jsonlLedger, S.cron],
    systemImpact:
      "Alarm signal when cascade spend exceeds a budget threshold. Wired into the token-economy ledger and surfaced via prism_dev:token_ledger_summary plus a Stop-hook advisory.",
    csDepth: [
      "Token-economy budget is a sliding-window counter — must use a monotone clock (process.hrtime) to avoid wall-clock-skew false alarms.",
      "Alarm cooldown required to prevent storm under sustained over-budget burst (default 5m per slot).",
      "Threshold storage must be schema-versioned — operators tune at runtime via prism_dev:token_budget_allocate.",
    ],
  },
  cdas: {
    addArchWiki: [A.costCascade, A.masterIdx],
    addSeWiki: [S.html, S.doc, S.jsonlLedger],
    systemImpact:
      "Operator dashboard rendering the cost-cascade ledger as MD+HTML. Sibling of the high-roi-skill dashboard; read via /system-viz and the operator HTML companion next to every state/shared/dashboards/* JSON.",
    csDepth: [
      "Render must be O(n_events) one-pass — pretty-print of full event log breaks at >100MB (live ledger size class).",
      "HTML companion must escape user-controlled strings (model names, prompt heads) to avoid stored-XSS via the dashboard surface.",
      "Mtime-cache the rendered HTML so dashboards regenerate only on ledger delta.",
    ],
  },
  cpl: {
    addArchWiki: [A.dom("cpl"), A.dom("toolpath"), A.dom("cam")],
    addSeWiki: [S.engine, S.realTests, S.physicsConst],
    systemImpact:
      "CPL (Clothoid Path Library) engines used by prism_toolpath dispatcher actions and the Mill/Lathe master post-processors for G2-continuous corner transitions and feed-rate smoothing. Sibling of the iMachining-spiral and toolpath-morph engines.",
    csDepth: [
      "Clothoid arc-length integral has no closed form — use a 7-term Taylor series, error bounded < 1e-9 over [0, pi/2] (Fresnel integral identity).",
      "Continuous-collision detection between blended paths is O(n^2) naive — accelerate with a swept-AABB BVH (log n per query).",
      "Curvature continuity (G2) constraint must hold across segment boundaries — invariant: |curv_left(t1) - curv_right(t1)| < epsilon.",
    ],
  },
  dbexp: {
    addArchWiki: [],
    addSeWiki: [S.schemaRead],
    systemImpact:
      "Coordinator placeholder envelope — unit body is a milestone-scaffold stub with no specific deliverable. Treat as documentation or close-out candidate; verify against state/shared/MILESTONE_PROGRESS.json before building.",
    csDepth: [
      "Placeholder envelopes are a known close-out-debt class (silent-close-out-drift) — must be resolved by either splitting into real units or marking the milestone complete with a [SCOPED] commit.",
    ],
  },
  elec: {
    addArchWiki: [],
    addSeWiki: [S.schemaRead],
    systemImpact:
      "Electrical / wiring pipeline milestone coordinator stub — no specific engine deliverable. Likely intended for the wiring-batch automation surface; verify status against MILESTONE_PROGRESS before building.",
    csDepth: [
      "Coordinator-placeholder envelopes block silent-close-out-drift detection because path tokens never resolve.",
    ],
  },
  ddb: {
    addArchWiki: [A.pipeline, A.dom("data")],
    addSeWiki: [S.schemaRead, S.atomic, S.regression],
    systemImpact:
      "Database layer feeding every domain pipeline (mill/lathe/wire/cam/cad) at the MATERIAL_SELECT / TOOLING_SELECT / FIXTURE_DESIGN / ALARM stages and the prism_data dispatcher ~700 lookup actions.",
    csDepth: [
      "All catalog reads must be schema-version-checked at load — a silent schema bump corrupts downstream physics (R12 fail-loud).",
      "Catalog writes must be atomic + per-PID temp-file rename to survive multi-chat fleet contention (atomic-write-idempotency).",
      "Lookup hot-path is in the speed-feed inner loop — keep O(1) hash on canonical key, never O(n) linear scan.",
    ],
  },
  dacad: {
    addArchWiki: [A.pipeline, A.knowledgeConv, A.courseForgeStubs],
    addSeWiki: [S.engine, S.realTests, S.physicsConst],
    systemImpact:
      "Academy / training cell — feeds the lima slot learning overlay across every domain pipeline. Consumes routed Lane-A KnowledgeTip[] and Lane-C forge-stubs from KNOWLEDGE-CONVERSION-MS0; renders in the operator-facing PRISM Academy surface.",
    csDepth: [
      "Course content must be license-checked at ingest, not at render (cad_harvest_can_redistribute pattern).",
      "Adaptive quizzing requires a per-student knowledge graph — must use sparse storage to keep memory bounded as student count scales.",
    ],
  },
  dmisc: {
    addArchWiki: [A.pipeline, A.systemViz],
    addSeWiki: [S.jsonlLedger, S.cron, S.failLoud],
    systemImpact:
      "Misc/infrastructure cell (observability or telemetry) — feeds prism_monitoring (Grafana push), prism_telemetry, and the fleet-wide JSONL ledger consumed by Stop-hook scoreboards and /system-viz.",
    csDepth: [
      "Observability metrics must NEVER block the hot path — use fire-and-forget append with an upstream queue to bound producer latency.",
      "Telemetry ledger rotation cadence must be set per-host (24h default) to prevent unbounded growth.",
    ],
  },
  dtrib: {
    addArchWiki: [A.pipeline, A.dom("tribal")],
    addSeWiki: [S.recall, S.obsidian, S.memoryCur],
    systemImpact:
      "Tribal-knowledge support cell — feeds every domain pipeline at every stage. Wired into the tribal-by-domain-inject UserPromptSubmit hook (top-3 hits per slot domain) and the prism_knowledge:tribal_* search/add actions.",
    csDepth: [
      "Tribal-tip retrieval must be domain-weighted — global ranking buries domain-specific insights under generic-popular tips.",
      "Conflicting tips (same predicate, different remedy) must surface via MemoryConflictResolverEngine, not be auto-merged.",
    ],
  },
  dp2p: {
    addArchWiki: [A.pipeline, A.dom("print"), A.dom("blueprint")],
    addSeWiki: [S.engine, S.realTests, S.regression],
    systemImpact:
      "PrintToProgram full-orchestrate cell (kilo slot) — composes all 18 pipeline stages across a domain into a single end-to-end print to NC flow. Direct consumer: print_to_program_full / print_to_program_enhanced dispatcher actions; root of the kilo slot domain ownership.",
    csDepth: [
      "Orchestrator must be fail-loud (R12) — a partially-failed stage cannot silently emit a downgraded program; SAFETY_VALIDATE + OPERATOR_GATE are unconditional.",
      "Stage composition is a DAG, not a chain — implement explicit dependency declaration so adaptive routing can parallelize independent stages.",
      "End-to-end SLO is the sum of per-stage SLOs + queueing — must be measured end-to-end to detect cross-stage contention regressions.",
    ],
  },
  eigc: {
    addArchWiki: [A.dom("calibration"), A.nngStratWire],
    addSeWiki: [S.realTests, S.regression, S.physicsConst],
    systemImpact:
      "Calibration benchmark corpus + performance baselines that feed prism_ai:calibration_kienzle / calibration_taylor / calibration_drift / calibration_model / calibration_surface dispatcher actions. Used by the NN-GRAPH retrain lifecycle to grade candidate checkpoints against the AUROC/macroF1/Brier gate.",
    csDepth: [
      "Benchmark splits must be customer-disjoint to prevent train-test leakage (per cam_ml_split_customer_disjoint pattern).",
      "Baselines need versioning + immutability (write-once corpus) — mutation invalidates every downstream calibration measurement.",
      "Bayesian-update of calibration priors requires conjugate-pair (normal-inverse-gamma) form for O(1) incremental updates.",
    ],
  },
  esec: {
    addArchWiki: [A.dom("auth"), A.dom("session")],
    addSeWiki: [S.safetyTier, S.engine, S.realTests],
    systemImpact:
      "Frontend secure-login context (login/logout, session lifecycle, idle timeout) for the EMP shop-floor UI. Wired to the prism_session dispatcher session API; consumed by ShiftClockWidget and every authenticated EMP route.",
    csDepth: [
      "Session lifecycle must be checked on every protected fetch via a single-source store (avoid stale use-after-free).",
      "Session refresh must be guarded by a single in-flight promise to prevent the thundering-herd refresh class (N concurrent components -> N refresh attempts).",
      "Logout must invalidate server-side as well as client-side — local clearing alone leaves a replay window open until expiry.",
    ],
  },
  esan: {
    addArchWiki: [A.dom("auth"), A.dom("guard")],
    addSeWiki: [S.safetyTier, S.hookSlug, S.failLoud],
    systemImpact:
      "Security/sanitization layer for the EMP shop-floor frontend — input validation, RBAC checks, and audit logging. Wired into the prism_guard dispatcher error-ledger and the audit-harness-security skill.",
    csDepth: [
      "RBAC check must default-deny — a missing role marker never falls through to allow.",
      "Input sanitization must be type-aware (numeric, identifier, free-text) and applied at the API boundary, not the rendering boundary (prevent injection upstream).",
      "Audit log writes must be fire-and-forget but durable (append-only JSONL, fsync on rotate).",
    ],
  },
  eclk: {
    addArchWiki: [A.dom("shop"), A.shopFloor],
    addSeWiki: [S.engine, S.realTests, S.atomic],
    systemImpact:
      "ShiftClock widget for shop-floor clock-in/clock-out — consumed by EMP frontend and writes to the timecard ledger that prism_business:clock_in / clock_out / job_time_* actions read.",
    csDepth: [
      "Clock events MUST use monotonic time (server-side) — relying on client wall-clock allows backdated entries (audit-fail).",
      "Concurrent clock-out from two terminals (one operator, two browsers) must be idempotent via lastWriteWins keyed by terminal id.",
      "Timecard rollups are O(n_events × n_employees) per day — pre-aggregate on event ingest, not at read time.",
    ],
  },
  ecst: {
    addArchWiki: [A.dom("cost"), A.dom("business")],
    addSeWiki: [S.engine, S.realTests],
    systemImpact:
      "Cost-reporting EMP widget tied to prism_business:actual_cost_calculate / actual_cost_variance / actual_cost_profitability and the cost-savings dashboard.",
    csDepth: [
      "Cost rollups must use Decimal arithmetic (never IEEE-754 float) — penny-rounding drift compounds across job-counts and breaks AP reconciliation.",
      "Variance bands need a per-customer baseline — global thresholds false-fire on inherently low-margin lines.",
    ],
  },
  eemp: {
    addArchWiki: [A.dom("business"), A.shopFloor],
    addSeWiki: [S.engine, S.realTests],
    systemImpact:
      "Employee directory + skills matrix UI for EMP. Reads/writes via prism_business:employee_create / employee_update / employee_search / employee_add_skill / employee_utilization actions.",
    csDepth: [
      "Skill-matrix update is concurrent across HR+supervisor sessions — must use optimistic-concurrency revisions to detect lost-update.",
      "Search index must be denormalized — joining employees × skills × certs on every keystroke is O(n_emp × n_skill).",
    ],
  },
  elean: {
    addArchWiki: [A.dom("business"), A.dom("automation")],
    addSeWiki: [S.engine, S.realTests],
    systemImpact:
      "Lean / six-sigma dashboard widgets for EMP — OEE, bottleneck, Pareto, control-chart. Consumes prism_business:reporting_pareto / reporting_dashboard and prism_automation:oee_calc / bottleneck.",
    csDepth: [
      "OEE has three multiplicative factors (Availability × Performance × Quality) — a divide-by-zero on zero-runtime must surface as undefined, not silently render as 0%.",
      "Control-chart 8-rule Nelson detection has overlapping windows — implement as a streaming algorithm to avoid O(n×8) re-scan.",
      "Pareto pre-sort changes only on event ingest — cache the sorted view per shift to keep render O(top_k).",
    ],
  },
  emod: {
    addArchWiki: [A.dom("automation")],
    addSeWiki: [S.engine, S.realTests],
    systemImpact:
      "Modular EMP page/component scaffolding (frontend), consumed by the operating-system shell and the existing EMP route surface.",
    csDepth: [
      "Module-registry lookups need to be ordered (deterministic) so a re-render with the same input gives the same DOM (React reconciliation invariant).",
    ],
  },
  eper: {
    addArchWiki: [A.dom("business")],
    addSeWiki: [S.engine, S.realTests, S.atomic],
    systemImpact:
      "Payroll-period UI tied to prism_business:payroll_create_period / payroll_run / payroll_pay_stub. Read by HR and surfaced via the EMP shell.",
    csDepth: [
      "Payroll-run must be idempotent — accidental double-submit cannot duplicate pay-stubs (enforced via period-id unique constraint).",
      "Tax/withholding tables are time-keyed — must apply the rate effective on the period-end date, not the run date.",
    ],
  },
  eoth: {
    addArchWiki: [],
    addSeWiki: [S.engine, S.realTests],
    systemImpact:
      "Misc EMP support unit — verify scope against the milestone envelope; integrates with the existing EMP page surface and one of the prism_business / prism_automation dispatcher actions.",
    csDepth: [
      "Verify the unit has an acceptanceCriteria block before building — empty AC is a documentation-debt smell.",
    ],
  },
  gacad: {
    addArchWiki: [A.knowledgeConv, A.courseForgeStubs, A.courseForgeConv, A.featureGap],
    addSeWiki: [S.engine, S.realTests, S.physicsConst],
    systemImpact:
      "Academy / training corpus expansion — MIT-OCW courses, MIT kernels, university algorithms — routed through the 6-node-type lane router. Lane-C-eligible items become forge-stubs; Lane-A items emit KnowledgeTip[] for the existing cad-engine/knowledge_store.",
    csDepth: [
      "Course harvesting must respect a redistribution-license check (cad_harvest_can_redistribute) — copyright violation if skipped.",
      "Duplicate-detection across courses uses content-hash + title-normalize; pure-string dedup misses re-uploads with whitespace drift.",
      "Algorithm extraction is bounded — courses with >100 algorithm-candidates need triage to keep the forge queue tractable.",
    ],
  },
  gcad: {
    addArchWiki: [A.dom("cad"), A.featureGap, A.freecadInv],
    addSeWiki: [S.engine, S.realTests, S.regression],
    systemImpact:
      "Re-modularize v8.89 monolith CAD engines into PRISM canonical engines wired into prism_cad / cad-engine. Direct consumers: blueprint-to-cad pipeline, cad_text_to_cad_generate, cad_neural_generate, and the existing prism-complete-cad-generation engine wrapper.",
    csDepth: [
      "Monolith re-modularization risks accidentally splitting two functions sharing private state — must extract via dependency-graph analysis, not regex.",
      "Reverse-engineered JM-DIE prints feed a customer-disjoint train-test split — leakage corrupts the part-similarity index.",
      "Geometry kernel calls are CPU-bound — re-modularization should preserve the worker-thread offload pattern, not collapse into the main thread.",
    ],
  },
  gcam: {
    addArchWiki: [A.dom("cam"), A.featureGap, A.strategyKb],
    addSeWiki: [S.engine, S.realTests, S.physicsConst],
    systemImpact:
      "CAM gap-units: adaptive clearing, air-cut elimination, Clipper2 boolean kernel, hyperMILL SDK, multi-axis toolpath. Consumers: prism_cam dispatcher (~3400 actions), production_toolpath_generate, and every CAM-system bridge (Mastercam/hyperMILL/Fusion/PowerMILL/Esprit).",
    csDepth: [
      "Adaptive clearing is engagement-bounded — the chip-thinning correction must use the true radial engagement, not the nominal stepover (chip-thinning lookup table).",
      "Air-cut elimination requires a 3D stock model (dexel/voxel) — naive linkmove-deletion silently skips real cuts.",
      "Clipper2 polygon-boolean is O(n log n) for n vertices but degenerates near-collinear inputs — round-to-integer prefilter required.",
    ],
  },
  gdb: {
    addArchWiki: [A.dom("data"), A.featureGap],
    addSeWiki: [S.schemaRead, S.atomic, S.regression],
    systemImpact:
      "Database / catalog gap-units: G/M-code dictionary, machine library, master alarm DB, partlib master, tool catalog harvest, verified fix proc. Direct consumers: prism_data dispatcher (~700 actions), alarm_intelligence_*, tool_catalog_*, machine_capability_*.",
    csDepth: [
      "Catalog harvest must dedupe across vendor sources by canonical key (e.g. ISO 13399 tool key) — vendor IDs collide across catalogs.",
      "Master-alarm DB across controllers is a sparse table — column-store / SQLite virtual table avoids 90% empty rows.",
      "Vendor catalog mtime + ETag caching reduces re-harvest cost from O(catalog × day) to O(delta).",
    ],
  },
  gerp: {
    addArchWiki: [A.dom("erp"), A.dom("business"), A.featureGap],
    addSeWiki: [S.engine, S.realTests, S.atomic],
    systemImpact:
      "ERP gap-units: drawing automation, financial analytics, HR/employee, lean six-sigma, purchasing/inventory, quoting/jobcost, subscription system. Consumers: prism_business dispatcher (~480 actions) plus the EMP frontend.",
    csDepth: [
      "ERP money math MUST be Decimal — IEEE-754 float drift across thousands of jobcost rows compounds into multi-dollar variance.",
      "Inventory EOQ is convex in order-size — the closed-form (sqrt(2DK/h)) avoids the iterative solver entirely.",
      "Subscription billing requires idempotency keys on every state-changing webhook (Stripe pattern) — replay attacks otherwise double-charge.",
    ],
  },
  gmisc: {
    addArchWiki: [A.featureGap, A.nnGraphMs0],
    addSeWiki: [S.engine, S.realTests, S.physicsConst],
    systemImpact:
      "Misc gap-units: AI engines (GNN/Transformer/DQN/XAI/TimeSeries), AS9100 trace, data structures. AI engines feed the prism_ai dispatcher deep-reasoning + neural-recommend + agi orchestrate surfaces.",
    csDepth: [
      "GNN re-modularization must preserve the heterophily-aware aggregator pattern — the live link-prediction model is anti-correlated under naive (homophily-assumed) aggregation (NN-EVAL AUROC 0.096 finding).",
      "AS9100 traceability is append-only — any mutation breaks the audit chain (immutable ledger invariant).",
      "Transformer attention is O(seq^2 × d) — must use Flash-Attention or block-sparse for >4k tokens.",
    ],
  },
  gp2p: {
    addArchWiki: [A.dom("print"), A.dom("blueprint"), A.featureGap],
    addSeWiki: [S.engine, S.realTests, S.regression],
    systemImpact:
      "Print-to-Program gap-units: JM-DIE partlib seed, OCR dimension extraction, validation harness. Direct consumers: print_to_program_full, print_to_program_enhanced, blueprint_to_3d_model, and the lathe/mill/wire/cad domain pipelines PRINT_OCR + PRINT_INTAKE stages.",
    csDepth: [
      "OCR dimension extraction must distinguish tolerance bands (e.g. 1.000 +/- 0.005) from plain numerics — confusion drops downstream tolerance-stackup correctness.",
      "Validation-harness must use the JM-DIE customer-disjoint split (no train-test leakage).",
      "Partlib lookup is O(parts × features) — pre-build a feature-vector kd-tree for sub-linear similarity search.",
    ],
  },
  gpost: {
    addArchWiki: [A.dom("post"), A.featureGap],
    addSeWiki: [S.engine, S.realTests, S.physicsConst],
    systemImpact:
      "Post-processor gap-units (JM-DIE learning): mine real shop programs to refine post-processor templates. Consumers: prism_cam:post_* actions and the lathe/mill master-post pipelines.",
    csDepth: [
      "Program-mining for post-processor tuning must preserve customer-disjoint splits — leakage produces a post that overfits one shop idioms.",
      "Pattern frequency tail is long — top-K coverage with O(1) lookup beats full hash-map at scale.",
      "Dialect translation rules must be deterministic AND reversible — non-invertible rules block /post_diff regression-replay.",
    ],
  },
  goth: {
    addArchWiki: [A.featureGap],
    addSeWiki: [S.engine, S.realTests],
    systemImpact:
      "Feature-gap unit surfaced by the 2026-05-17 audit; verify scope against state/shared/specs/FEATURE-GAP-AUDIT-2026-05-17.md before building.",
    csDepth: [
      "Feature-gap units default to wave:GAP (lead each queue) and are addressed before BUILD_STATE NEEDS_BUILDING.",
    ],
  },
  generic: {
    addArchWiki: [],
    addSeWiki: [S.schemaRead],
    systemImpact:
      "Generic unit without clear classification — verify the milestone envelope title and acceptance criteria before building.",
    csDepth: [
      "Missing acceptanceCriteria + missing relatedSubsystems is a documentation-debt smell; raise to a [SCOPED] commit or close as documentation.",
    ],
  },
};

function makeRec(u) {
  const c = classify(u.unitId);
  switch (c) {
    case "dmill":  return mkPipelineCell(u, "mill", "Mill domain (alpha slot)");
    case "dlathe": return mkPipelineCell(u, "lathe", "Lathe domain (bravo slot)");
    case "dwire":  return mkPipelineCell(u, "wire", "Wire-EDM domain (charlie slot)");
    case "dcad":   return mkPipelineCell(u, "cad", "CAD domain (delta slot)");
    case "dcam":   return mkPipelineCell(u, "cam", "CAM domain (echo slot)");
    case "dpost":  return mkPipelineCell(u, "post", "Post-processor domain (india slot)");
    case "derp":   return mkPipelineCell(u, "erp", "ERP/business domain (hotel slot)");
    case "dother": return mkPipelineCell(u, "other", "Misc domain pipeline cell");
    case "f360":   return mkF360(u);
    default: {
      const r = REC[c] || REC.generic;
      return r;
    }
  }
}

const out = {};
for (const k of Object.keys(SLICE)) out[k] = makeRec(SLICE[k]);
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), "utf8");
console.log("Wrote", OUT, "with", Object.keys(out).length, "records");
