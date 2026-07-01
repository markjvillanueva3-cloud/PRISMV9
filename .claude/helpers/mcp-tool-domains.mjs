/**
 * mcp-tool-domains.mjs — Tier-1 MCP tool-domain filter map
 * (MCP-CONSOLIDATION-MS0 / U-MCP-TOOL-DOMAINS, slot:alpha 2026-05-28)
 *
 * The operator's "4-5 MCP servers split between the primary chats" idea, realized as a
 * FILTER on the one shared :3100 backend instead of N separate server processes. The
 * mcp-http-bridge narrows its tools/list to the chat's galaxy domains via env, so a mill
 * chat carries ~compute tools (not all ~90 prism_* dispatchers) — the context-tax win
 * with zero extra processes and zero extra RAM (we just consolidated onto :3100 by
 * dropping prism_safe). Process-isolation (Tier-2, 4 ports) was the alternative; the
 * operator chose Tier-1.
 *
 * FAIL-OPEN BY DESIGN (R12) — a filter miss degrades to today's behavior, never to zero:
 *   - MCP_TOOL_DOMAINS unset/empty            -> NO filtering, every tool passes (pre-Tier-1 behavior)
 *   - a prism_* tool not mapped to any domain -> passes (never silently dropped)
 *   - a non-prism tool                        -> passes (only :3100/prism_* is ever filtered)
 *   - ALWAYS dispatchers                       -> pass regardless of domain (session/handoff/scrutiny/build/memory are universal)
 * Only a tool that IS mapped, to a domain the chat did NOT request, is excluded.
 *
 * Because nothing sets MCP_TOOL_DOMAINS until the per-slot launcher rollout (deferred
 * MS0 unit), importing this changes NOTHING today — the bridge takes the fail-open path.
 */

// Universal — every one of the 26 slots needs these regardless of galaxy: session/PSK
// (checkin/handoff), context budget, scrutiny gate, build/test, memory/brain, gsd
// protocol, skill+script, hooks, and cross-cutting registry data lookup.
export const ALWAYS = [
  "prism_session",
  "prism_context",
  "prism_guard",
  "prism_dev",
  "prism_memory",
  "prism_gsd",
  "prism_skill_script",
  "prism_hook",
  "prism_data",
];

// Domain -> prism_* dispatchers. A dispatcher may appear in >1 domain (the allow-set
// is a union). Names verified against the live :3100 tool surface (90 prism_* tools).
export const DOMAIN_DISPATCHERS = {
  // manufacturing physics + geometry + program generation + safety/quality
  compute: [
    "prism_calc", "prism_cad", "prism_cad_drawing_kb", "prism_cad_regression",
    "prism_cam", "prism_turning", "prism_turning_program", "prism_5axis",
    "prism_grinding", "prism_edm", "prism_thread", "prism_threading_pipeline",
    "prism_toolpath", "prism_multiaxis_program", "prism_hole_pattern",
    "prism_secondary_ops", "prism_cnc_ops", "prism_mill", "prism_safety",
    "prism_omega", "prism_machining_kb", "prism_vibration_physics", "prism_forming",
    "prism_welding", "prism_material_processing", "prism_fluid_thermal",
    "prism_mechanical", "prism_feasibility", "prism_multi_op", "prism_machine_live",
    "prism_machine_setup", "prism_adaptive_control", "prism_product",
    "prism_proven_pipeline", "prism_quality", "prism_diagnosis",
    "prism_process_control", "prism_validate",
  ],
  // AI / training / memory / knowledge / reasoning / orchestration
  cognitive: [
    "prism_ai", "prism_intelligence", "prism_knowledge", "prism_knowledge_ext",
    "prism_process", "prism_outcome", "prism_multi", "prism_orchestrate",
    "prism_autopilot_d", "prism_atcs", "prism_autonomous", "prism_sp",
    "prism_ralph", "prism_pfp", "prism_doc_learn", "prism_scientific_math", "prism_l2",
  ],
  // session / dev-infra / hooks / telemetry / hygiene / docs
  devops: [
    "prism_telemetry", "prism_infra", "prism_generator", "prism_manus",
    "prism_realtime", "prism_tenant", "prism_compliance", "prism_monitoring",
    "prism_bridge", "prism_doc", "prism_export", "prism_resource_harvester",
    "prism_nl_hook",
  ],
  // ERP / quoting / shop / scheduling / business operations
  business: [
    "prism_business", "prism_quoting", "prism_shop", "prism_shop_practice",
    "prism_scheduling", "prism_operating_system", "prism_parts", "prism_inbox",
    "prism_industry", "prism_integration", "prism_automation", "prism_auth",
  ],
  // UI / web / phone-app dev — served by the UI MCP cluster (shadcn/figma/playwright/
  // chrome-devtools), NOT the prism dispatcher backend. A frontend chat needs only the
  // ALWAYS core + (optionally) a thin business/compute read-slice for data contracts.
  frontend: [],
};

// Galaxy (from SLOT_GALAXY_MAP) -> domains. Lets the bridge self-resolve when
// MCP_TOOL_DOMAINS is absent but PRISM_SLOT_GALAXY is set. papa is "frontend-app"
// post-2026-05-28 re-designation; "backend-helper" kept for back-compat.
export const GALAXY_DOMAINS = {
  "token-optimization": ["devops"],
  "mill": ["compute"],
  "lathe": ["compute"],
  "wedm": ["compute"],
  "cad": ["compute"],
  "cam": ["compute"],
  "post-processor": ["compute"],
  "speed-feed": ["compute"],
  "blueprint-vision": ["compute"],
  "ai-training": ["cognitive"],
  "hermes-zebra": ["cognitive", "devops"],
  "system-viz": ["cognitive", "devops"],
  "academy": ["cognitive"],
  "discovery": ["cognitive", "compute"],
  "fleet-hygiene": ["devops"],
  "wiring": ["devops"],
  "bug-hunting": ["devops"],
  "dormant-data": ["devops", "cognitive"],
  "database-expansion": ["devops", "business"],
  "quoting": ["business", "compute"],
  "business": ["business"],
  "frontend-app": ["frontend", "business"],
  "backend-helper": ["devops", "compute"],
};

// Every prism_* dispatcher that IS mapped to at least one domain. Used to decide
// "is this tool mapped at all?" — unmapped prism_* tools fail-open (pass).
export const MAPPED_UNIVERSE = new Set(
  Object.values(DOMAIN_DISPATCHERS).flat()
);

// Slot name -> galaxy (inverse of slot-context-bundle-inject.mjs SLOT_GALAXY_MAP;
// source of truth H:/CHAT-SLOT-DOMAINS.md). Drives CWD-based self-resolution so a chat
// running in its slot worktree auto-scopes its tools with no env. papa+quebec both ->
// frontend-app (2026-05-28 re-designation). november/yankee omitted (no canonical
// galaxy) -> fail-open to all tools.
export const SLOT_GALAXY = {
  alpha: "token-optimization",
  bravo: "hermes-zebra",
  charlie: "quoting",
  delta: "cad",
  echo: "post-processor",
  foxtrot: "mill",
  golf: "fleet-hygiene",
  hotel: "business",
  india: "ai-training",
  juliett: "database-expansion",
  kilo: "cam",
  lima: "academy",
  mike: "wedm",
  oscar: "speed-feed",
  papa: "frontend-app",
  quebec: "frontend-app",
  romeo: "wiring",
  sierra: "system-viz",
  tango: "discovery",
  uniform: "bug-hunting",
  victor: "dormant-data",
  whiskey: "lathe",
  xray: "blueprint-vision",
  zebra: "hermes-zebra",
  zulu: "hermes-zebra",
};

// Every canonical galaxy name (GALAXY_DOMAINS keys ∪ the live SLOT_GALAXY values).
// Used to VALIDATE an explicit `galaxy:` frontmatter field before per-galaxy memory
// routing — an unknown galaxy name is rejected (falls back to slot-derivation) so a
// typo can't spawn a junk knowledge/memories/galaxies/<typo>/ dir.
export const KNOWN_GALAXIES = new Set([
  ...Object.keys(GALAXY_DOMAINS),
  ...Object.values(SLOT_GALAXY),
]);

/**
 * Canonical slot -> galaxy lookup (null for unknown). The single source of truth for
 * the slot↔galaxy taxonomy, shared by the MCP tool filter AND per-galaxy memory routing
 * (obsidian-memory-sync.mjs) so neither has to keep its own copy of SLOT_GALAXY.
 */
export function galaxyForSlot(slot) {
  if (!slot) return null;
  const s = String(slot).trim().toLowerCase();
  return SLOT_GALAXY[s] || null;
}

/**
 * Parse a slot name from a slot-worktree cwd: "H:/prism-slot-foxtrot" -> "foxtrot".
 * Returns null for the shared tree (H:/prism) or any non-worktree path — the fail-open
 * signal. Tolerant of separators / casing.
 */
export function slotFromCwd(cwd) {
  if (!cwd) return null;
  const m = String(cwd).match(/prism-slot-([a-z]+)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Map a slot name -> its galaxy's domains CSV, or "" if the slot/galaxy is unknown
 * (the fail-open signal). Shared by the PRISM_BOOT_SLOT and cwd resolution tiers.
 */
function domainsForSlot(slot) {
  if (!slot) return "";
  const s = String(slot).trim().toLowerCase();
  const galaxy = SLOT_GALAXY[s];
  if (galaxy && GALAXY_DOMAINS[galaxy]) return GALAXY_DOMAINS[galaxy].join(",");
  return "";
}

/**
 * Resolve the active domains CSV. Precedence:
 *   1. explicit MCP_TOOL_DOMAINS env (operator/launcher override)
 *   2. PRISM_SLOT_GALAXY env (launcher-set galaxy)
 *   3. PRISM_BOOT_SLOT env (slot-tab-boot.ps1 sets this per tab BEFORE claude launches;
 *      the MCP bridge child inherits it) -> slot -> galaxy  [the PRODUCTION activation]
 *   4. slot worktree cwd (H:/prism-slot-<name> -> slot -> galaxy)  [worktree-launched chats / tests]
 *   5. "" -> no filter / fail-open
 *
 * Tier 3 is what actually fires in production: every fleet tab is launched by
 * slot-tab-boot.ps1, which exports PRISM_BOOT_SLOT=<slot> in the PowerShell session
 * before invoking claude.exe; claude spawns this bridge as an MCP stdio child, which
 * inherits the env. Tier 4 (cwd) stays as a belt-and-suspenders path for chats launched
 * directly inside a slot worktree (and is exercised by the unit tests), but is inert for
 * the standard launcher because every tab runs cwd=H:/prism (the shared tree).
 */
export function resolveDomainsFromEnv(env = process.env, cwd) {
  if (env.MCP_TOOL_DOMAINS && String(env.MCP_TOOL_DOMAINS).trim()) {
    return String(env.MCP_TOOL_DOMAINS).trim();
  }
  const galaxy = env.PRISM_SLOT_GALAXY && String(env.PRISM_SLOT_GALAXY).trim();
  if (galaxy && GALAXY_DOMAINS[galaxy]) return GALAXY_DOMAINS[galaxy].join(",");
  const bootDomains = domainsForSlot(env.PRISM_BOOT_SLOT);
  if (bootDomains) return bootDomains;
  const resolvedCwd =
    cwd !== undefined
      ? cwd
      : (typeof process !== "undefined" && process.cwd ? process.cwd() : "");
  return domainsForSlot(slotFromCwd(resolvedCwd));
}

/**
 * Build the allow-set context from a domains CSV. Returns null when no filtering
 * should occur (empty/blank input, or no recognized domains) — the fail-open signal.
 */
export function buildAllowSet(domainsCsv) {
  if (!domainsCsv || !String(domainsCsv).trim()) return null;
  const domains = String(domainsCsv)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!domains.length) return null;
  const recognized = domains.filter((d) => Object.prototype.hasOwnProperty.call(DOMAIN_DISPATCHERS, d));
  if (!recognized.length) return null; // unknown domains only -> fail-open rather than exclude everything
  const allow = new Set(ALWAYS);
  for (const d of recognized) {
    for (const t of DOMAIN_DISPATCHERS[d]) allow.add(t);
  }
  return { allow, domains: recognized };
}

/**
 * Decide whether a single tool name passes the filter. Fail-open for: no active
 * filter, ALWAYS/allowed tools, any non-prism_* tool, and any unmapped prism_* tool.
 * Only a mapped prism_* tool whose domain the chat did not request is excluded.
 */
export function isToolAllowed(name, ctx) {
  if (!ctx) return true;
  if (!name) return true;
  if (ctx.allow.has(name)) return true;
  if (!/^prism_/.test(name)) return true;
  if (!MAPPED_UNIVERSE.has(name)) return true;
  return false;
}

/**
 * Filter a tools/list array to the given domains CSV. Returns the input array
 * unchanged when no filter is active (fail-open). Never throws on malformed input.
 */
export function filterToolList(tools, domainsCsv) {
  if (!Array.isArray(tools)) return tools;
  const ctx = buildAllowSet(domainsCsv);
  if (!ctx) return tools;
  return tools.filter((t) => isToolAllowed(t && t.name, ctx));
}
