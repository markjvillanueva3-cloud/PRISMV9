/**
 * Tests for mcp-tool-domains.mjs — the Tier-1 MCP tool-domain filter.
 * Run: node --test H:/prism/.claude/helpers/mcp-tool-domains.test.mjs
 *
 * These tests encode the load-bearing INTENT (R9): the filter must FAIL OPEN.
 * The bridge is the sole PRISM surface (prism_safe was dropped 2026-05-28), so an
 * over-aggressive filter = fleet-wide tool loss. Every test below would FAIL if the
 * filter ever dropped a tool it must not — that is the whole point of the suite.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALWAYS,
  DOMAIN_DISPATCHERS,
  GALAXY_DOMAINS,
  SLOT_GALAXY,
  MAPPED_UNIVERSE,
  KNOWN_GALAXIES,
  galaxyForSlot,
  resolveDomainsFromEnv,
  slotFromCwd,
  buildAllowSet,
  isToolAllowed,
  filterToolList,
} from "./mcp-tool-domains.mjs";

const T = (...names) => names.map((name) => ({ name, description: "x" }));

// cwd is pinned to "" in env/galaxy tests so they don't pick up the runner's real cwd
// (which could be a slot worktree and resolve a galaxy — that's tested separately below).
test("resolveDomainsFromEnv: explicit env wins (over galaxy AND cwd)", () => {
  assert.equal(resolveDomainsFromEnv({ MCP_TOOL_DOMAINS: "compute,business" }, "H:/prism-slot-foxtrot"), "compute,business");
});
test("resolveDomainsFromEnv: falls back to galaxy when env absent", () => {
  assert.equal(resolveDomainsFromEnv({ PRISM_SLOT_GALAXY: "mill" }, ""), "compute");
  assert.equal(resolveDomainsFromEnv({ PRISM_SLOT_GALAXY: "hermes-zebra" }, ""), "cognitive,devops");
});
test("resolveDomainsFromEnv: empty when neither env nor cwd resolves (fail-open signal)", () => {
  assert.equal(resolveDomainsFromEnv({}, ""), "");
  assert.equal(resolveDomainsFromEnv({ PRISM_SLOT_GALAXY: "no-such-galaxy" }, ""), "");
  assert.equal(resolveDomainsFromEnv({}, "H:/prism"), "", "shared tree cwd must NOT filter");
});

test("resolveDomainsFromEnv: PRISM_BOOT_SLOT is the PRODUCTION activation tier", () => {
  // slot-tab-boot.ps1 exports PRISM_BOOT_SLOT=<slot> before claude launches; the MCP
  // bridge child inherits it. cwd is the shared tree (H:/prism) in prod, so this tier
  // is what actually fires. foxtrot=mill->compute, alpha=token-optimization->devops.
  assert.equal(resolveDomainsFromEnv({ PRISM_BOOT_SLOT: "foxtrot" }, "H:/prism"), "compute");
  assert.equal(resolveDomainsFromEnv({ PRISM_BOOT_SLOT: "alpha" }, "H:/prism"), "devops");
  assert.equal(resolveDomainsFromEnv({ PRISM_BOOT_SLOT: "papa" }, "H:/prism"), "frontend,business");
  assert.equal(resolveDomainsFromEnv({ PRISM_BOOT_SLOT: "bravo" }, "H:/prism"), "cognitive,devops");
});
test("resolveDomainsFromEnv: PRISM_BOOT_SLOT is case-insensitive + trimmed", () => {
  assert.equal(resolveDomainsFromEnv({ PRISM_BOOT_SLOT: "  Foxtrot " }, "H:/prism"), "compute");
});
test("resolveDomainsFromEnv: unknown PRISM_BOOT_SLOT falls open (no filter)", () => {
  assert.equal(resolveDomainsFromEnv({ PRISM_BOOT_SLOT: "zzznotaslot" }, "H:/prism"), "");
  assert.equal(resolveDomainsFromEnv({ PRISM_BOOT_SLOT: "" }, "H:/prism"), "");
});
test("resolveDomainsFromEnv: precedence MCP_TOOL_DOMAINS > PRISM_SLOT_GALAXY > PRISM_BOOT_SLOT > cwd", () => {
  // explicit env beats boot-slot
  assert.equal(resolveDomainsFromEnv({ MCP_TOOL_DOMAINS: "business", PRISM_BOOT_SLOT: "foxtrot" }, "H:/prism"), "business");
  // galaxy env beats boot-slot
  assert.equal(resolveDomainsFromEnv({ PRISM_SLOT_GALAXY: "mill", PRISM_BOOT_SLOT: "alpha" }, "H:/prism"), "compute");
  // boot-slot beats cwd (boot-slot=foxtrot->compute wins over cwd=alpha-worktree->devops)
  assert.equal(resolveDomainsFromEnv({ PRISM_BOOT_SLOT: "foxtrot" }, "H:/prism-slot-alpha"), "compute");
});

test("slotFromCwd: parses slot from worktree path, null for shared tree", () => {
  assert.equal(slotFromCwd("H:/prism-slot-foxtrot"), "foxtrot");
  assert.equal(slotFromCwd("H:\\prism-slot-whiskey\\mcp-server"), "whiskey");
  assert.equal(slotFromCwd("H:/prism"), null);
  assert.equal(slotFromCwd(""), null);
  assert.equal(slotFromCwd(undefined), null);
});
test("resolveDomainsFromEnv: cwd self-resolution (the no-env activation)", () => {
  // a mill chat in its worktree -> compute, with no env at all
  assert.equal(resolveDomainsFromEnv({}, "H:/prism-slot-foxtrot"), "compute");
  // alpha (token-optimization galaxy) -> devops
  assert.equal(resolveDomainsFromEnv({}, "H:/prism-slot-alpha"), "devops");
  // papa re-designated to frontend-app -> frontend,business
  assert.equal(resolveDomainsFromEnv({}, "H:/prism-slot-papa"), "frontend,business");
  // unknown slot worktree -> fail-open empty
  assert.equal(resolveDomainsFromEnv({}, "H:/prism-slot-zzznotaslot"), "");
});
test("SAFETY INVARIANT: every SLOT_GALAXY entry maps to a real GALAXY_DOMAINS key", () => {
  for (const [slot, galaxy] of Object.entries(SLOT_GALAXY)) {
    assert.ok(GALAXY_DOMAINS[galaxy], `slot ${slot} -> galaxy "${galaxy}" must exist in GALAXY_DOMAINS`);
  }
});

// --- galaxyForSlot + KNOWN_GALAXIES (shared by per-galaxy memory routing) -----------
test("galaxyForSlot: canonical slot -> galaxy, case-insensitive + trimmed, null for unknown", () => {
  assert.equal(galaxyForSlot("foxtrot"), "mill");
  assert.equal(galaxyForSlot("alpha"), "token-optimization");
  assert.equal(galaxyForSlot("  Papa "), "frontend-app");
  assert.equal(galaxyForSlot("zzznotaslot"), null);
  assert.equal(galaxyForSlot(""), null);
  assert.equal(galaxyForSlot(undefined), null);
  assert.equal(galaxyForSlot(null), null);
});
test("KNOWN_GALAXIES: contains every live galaxy, rejects typos (the routing validation gate)", () => {
  // every galaxy a slot maps to must be a known galaxy (so memory routing never rejects a real one)
  for (const g of Object.values(SLOT_GALAXY)) assert.ok(KNOWN_GALAXIES.has(g), `${g} must be known`);
  assert.ok(KNOWN_GALAXIES.has("mill"));
  assert.ok(KNOWN_GALAXIES.has("cross-galaxy") === false, "cross-galaxy is a bridge namespace, not a galaxy");
  assert.ok(!KNOWN_GALAXIES.has("buisness-typo"), "a typo must be rejected so it can't spawn a junk dir");
});

test("buildAllowSet: null (no filter) on blank/empty input", () => {
  assert.equal(buildAllowSet(""), null);
  assert.equal(buildAllowSet("   "), null);
  assert.equal(buildAllowSet(undefined), null);
});
test("buildAllowSet: null (fail-open) when only unknown domains given", () => {
  assert.equal(buildAllowSet("nonsense,alsobogus"), null);
});
test("buildAllowSet: unions valid domains + ALWAYS, ignores unknown", () => {
  const ctx = buildAllowSet("compute,bogus");
  assert.ok(ctx, "should build a context for a partially-valid CSV");
  assert.deepEqual(ctx.domains, ["compute"]);
  for (const a of ALWAYS) assert.ok(ctx.allow.has(a), `ALWAYS tool ${a} must be allowed`);
  assert.ok(ctx.allow.has("prism_calc"), "compute dispatcher must be allowed");
});

test("isToolAllowed: no filter context => everything passes", () => {
  assert.equal(isToolAllowed("prism_quoting", null), true);
});
test("isToolAllowed: ALWAYS tools pass even outside requested domains", () => {
  const ctx = buildAllowSet("compute");
  for (const a of ALWAYS) assert.equal(isToolAllowed(a, ctx), true, `${a} must always pass`);
});
test("isToolAllowed: non-prism tools always pass (fail-open)", () => {
  const ctx = buildAllowSet("compute");
  assert.equal(isToolAllowed("shadcn_get_component", ctx), true);
  assert.equal(isToolAllowed("mcp__claude-flow__memory_store", ctx), true);
});
test("isToolAllowed: unmapped prism_* passes (never silently dropped)", () => {
  const ctx = buildAllowSet("compute");
  // a hypothetical future dispatcher not yet in the map
  assert.ok(!MAPPED_UNIVERSE.has("prism_brand_new_dispatcher"));
  assert.equal(isToolAllowed("prism_brand_new_dispatcher", ctx), true);
});
test("isToolAllowed: mapped tool in a NON-requested domain is excluded", () => {
  const ctx = buildAllowSet("compute");
  assert.equal(isToolAllowed("prism_quoting", ctx), false, "business tool excluded from a compute-only chat");
  assert.equal(isToolAllowed("prism_ai", ctx), false, "cognitive tool excluded from a compute-only chat");
});

test("filterToolList: NO filter => identity (pre-Tier-1 behavior, every tool kept)", () => {
  const all = T("prism_calc", "prism_ai", "prism_quoting", "shadcn_x");
  assert.equal(filterToolList(all, ""), all, "must return the SAME array reference unfiltered");
  assert.equal(filterToolList(all, "   ").length, all.length);
});
test("filterToolList: compute filter keeps compute + ALWAYS, drops other domains", () => {
  const all = T(
    "prism_calc", "prism_cam", "prism_safety", // compute
    "prism_session", "prism_dev", "prism_memory", // ALWAYS
    "prism_ai", "prism_outcome", // cognitive (drop)
    "prism_quoting", "prism_shop", // business (drop)
    "prism_telemetry", // devops (drop)
    "prism_future_unmapped", // unmapped prism_* (keep, fail-open)
    "shadcn_button", // non-prism (keep)
  );
  const kept = filterToolList(all, "compute").map((t) => t.name);
  for (const must of ["prism_calc", "prism_cam", "prism_safety", "prism_session", "prism_dev", "prism_memory", "prism_future_unmapped", "shadcn_button"]) {
    assert.ok(kept.includes(must), `${must} must be kept under compute filter`);
  }
  for (const gone of ["prism_ai", "prism_outcome", "prism_quoting", "prism_shop", "prism_telemetry"]) {
    assert.ok(!kept.includes(gone), `${gone} must be dropped under compute filter`);
  }
});

test("SAFETY INVARIANT: filtering NEVER drops an ALWAYS tool or unmapped tool, for ANY domain combo", () => {
  const everyTool = T(
    ...ALWAYS,
    "prism_unmapped_a", "prism_unmapped_b",
    "shadcn_x", "mcp__claude-flow__y",
    ...MAPPED_UNIVERSE,
  );
  const domainKeys = Object.keys(DOMAIN_DISPATCHERS);
  // try every single domain and a few combos
  const combos = [...domainKeys, "compute,business", "cognitive,devops", "frontend,business"];
  for (const combo of combos) {
    const kept = new Set(filterToolList(everyTool, combo).map((t) => t.name));
    for (const a of ALWAYS) assert.ok(kept.has(a), `ALWAYS ${a} dropped under "${combo}"`);
    assert.ok(kept.has("prism_unmapped_a"), `unmapped prism_* dropped under "${combo}"`);
    assert.ok(kept.has("shadcn_x"), `non-prism dropped under "${combo}"`);
  }
});

test("SAFETY INVARIANT: every galaxy resolves to >=1 recognized domain (no slot filters to ALWAYS-only by accident)", () => {
  for (const [galaxy, domains] of Object.entries(GALAXY_DOMAINS)) {
    const ctx = buildAllowSet(domains.join(","));
    // frontend resolves to [] dispatchers but is a recognized key, so ctx is non-null;
    // every galaxy must at least build a context (i.e. its domains are recognized).
    assert.ok(ctx, `galaxy ${galaxy} -> "${domains.join(",")}" must build a filter context`);
  }
});
