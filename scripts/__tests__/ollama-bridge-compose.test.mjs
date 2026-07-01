/**
 * U-OE-DOCKER-COMPOSE — docker-compose.ollama-bridge.yml topology test.
 *
 * Verifies the Layer-2b deployment override merges correctly onto the base
 * docker-compose.yml and wires the ollama-bridge harness to BOTH the live
 * MCP server and Ollama on prism-net, with the read-only invariant enforced.
 *
 * Two arms:
 *   1. DOCKER ARM — runs `docker compose ... config --format json` (the
 *      canonical YAML parse + merge + validate path) and asserts the merged
 *      structure with concrete values. Skip-LOUD (not silent) if docker is
 *      unavailable so an env without docker never reports a false pass (R12).
 *   2. SOURCE ARM — docker-independent. Reads the raw override file and pins
 *      the load-bearing invariants (read-only mount, profile gate, restart:no,
 *      the "why" header citing the index.ts facts) so the test always has
 *      teeth even where the docker arm is skipped.
 *
 * @see docker-compose.ollama-bridge.yml
 * @see scripts/ollama-prism-bridge.mjs (the harness this topology deploys)
 * @see state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md (§Docker topology)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const BASE = resolve(REPO, "docker-compose.yml");
const OVERRIDE = resolve(REPO, "docker-compose.ollama-bridge.yml");

const BASE_SERVICES = ["postgres", "prism-server", "prometheus", "qdrant", "ollama", "grafana"];

/** `docker compose version` is a fast local probe — a short ceiling is enough. */
const DOCKER_PROBE_TIMEOUT_MS = 20_000;
/** `config` parses+merges 2 YAML files + resolves env; allow a cold-daemon margin. */
const DOCKER_CONFIG_TIMEOUT_MS = 90_000;

function dockerAvailable() {
  try {
    execFileSync("docker", ["compose", "version"], { stdio: "pipe", timeout: DOCKER_PROBE_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/** Merged compose config as JSON, or throw with a usable message. */
function mergedConfig() {
  const out = execFileSync(
    "docker",
    [
      "compose",
      "-f", BASE,
      "-f", OVERRIDE,
      // --profile bridge is load-bearing: the ollama-bridge service is
      // profile-gated, so `config` OMITS it entirely without this flag (and
      // the service-count math below would then be wrong).
      "--profile", "bridge",
      "config", "--format", "json",
    ],
    { cwd: REPO, stdio: ["ignore", "pipe", "pipe"], timeout: DOCKER_CONFIG_TIMEOUT_MS, encoding: "utf8" },
  );
  return JSON.parse(out);
}

test("override file exists and is non-empty", () => {
  assert.ok(existsSync(OVERRIDE), "docker-compose.ollama-bridge.yml must exist");
  const txt = readFileSync(OVERRIDE, "utf8");
  assert.ok(txt.length > 800, "override should be a substantive file, not a stub");
});

// ───────────────────────── SOURCE ARM (always-on) ─────────────────────────

test("SOURCE: override is additive — no top-level networks fork, no obsolete version", () => {
  const txt = readFileSync(OVERRIDE, "utf8");
  // A top-level `networks:` block re-declaring prism-net would fork the
  // network and silently break service-to-service DNS. The override may only
  // REFERENCE prism-net under a service, never DEFINE it at the doc root.
  assert.equal(
    /^networks:/m.test(txt), false,
    "override must NOT declare a top-level networks: block (would fork prism-net)",
  );
  assert.equal(
    /^version:/m.test(txt), false,
    "override must NOT carry an obsolete top-level version: key",
  );
});

test("SOURCE: read-only invariant + one-shot + profile gate are pinned in the file", () => {
  const txt = readFileSync(OVERRIDE, "utf8");
  assert.match(txt, /:\/prism:ro\b/, "repo mount MUST be :ro (read-only by construction)");
  assert.match(txt, /profiles:\s*\["bridge"\]/, "bridge service MUST be profile-gated");
  assert.match(txt, /restart:\s*"no"/, "bridge MUST be one-shot (restart: \"no\")");
  assert.match(txt, /image:\s*node:22-alpine\b/, "bridge image MUST be pinned (not :latest)");
});

test("SOURCE: the WHY header documents the two facts that make this required", () => {
  const txt = readFileSync(OVERRIDE, "utf8");
  // Regression guard on the RATIONALE, not on volatile index.ts line numbers
  // (index.ts churns constantly — pinning :1053/:1023 would false-fail on an
  // unrelated edit while the deployment behavior is unchanged). Pin the
  // behavioral tokens instead: the stdio-default fact, the bind-host fact, and
  // the two env vars the override actually sets to fix them.
  assert.match(txt, /stdio/i, "must explain the TRANSPORT stdio default");
  assert.match(txt, /127\.0\.0\.1|bind/i, "must explain the localhost bind default");
  assert.match(txt, /TRANSPORT=http/);
  assert.match(txt, /PRISM_BIND_HOST=0\.0\.0\.0/);
});

// ───────────────────────── DOCKER ARM (skip-loud) ─────────────────────────

test("DOCKER: merged config is valid and adds exactly the bridge service", { skip: dockerAvailable() ? false : "docker not available in this environment (skip-loud, not a pass)" }, () => {
  const cfg = mergedConfig();
  const services = Object.keys(cfg.services).sort();
  for (const s of BASE_SERVICES) {
    assert.ok(services.includes(s), `base service ${s} must survive the merge`);
  }
  assert.ok(services.includes("ollama-bridge"), "ollama-bridge must be added");
  assert.equal(
    services.length, BASE_SERVICES.length + 1,
    `merge must add exactly 1 service (got ${services.join(",")})`,
  );
});

test("DOCKER: ollama-bridge is wired to BOTH ollama and the live MCP server", { skip: dockerAvailable() ? false : "docker not available (skip-loud)" }, () => {
  const b = mergedConfig().services["ollama-bridge"];
  // environment renders as a map in compose v2 `config --format json`.
  assert.equal(b.environment.OLLAMA_URL, "http://ollama:11434");
  assert.equal(b.environment.PRISM_MCP_URL, "http://prism-server:3000/mcp");
  // The exact regression the override fixes — a drift back to localhost would
  // silently break cross-container reachability while still "looking" set.
  assert.doesNotMatch(
    b.environment.PRISM_MCP_URL, /127\.0\.0\.1|localhost/,
    "PRISM_MCP_URL must target the compose DNS name, not localhost",
  );
  const deps = Object.keys(b.depends_on || {}).sort();
  assert.deepEqual(deps, ["ollama", "prism-server"]);
  assert.equal(b.restart, "no", "bridge must be one-shot");
  assert.deepEqual(b.profiles, ["bridge"]);
  assert.ok(Object.keys(b.networks || {}).includes("prism-net"));
});

test("DOCKER: the repo mount is read_only (security invariant at the container boundary)", { skip: dockerAvailable() ? false : "docker not available (skip-loud)" }, () => {
  const b = mergedConfig().services["ollama-bridge"];
  const repoMount = (b.volumes || []).find((v) => v.target === "/prism");
  assert.ok(repoMount, "bridge must mount the repo at /prism");
  assert.equal(
    repoMount.read_only, true,
    "the /prism mount MUST be read-only — enforces the L2 'no write tool' guarantee",
  );
});

test("DOCKER: prism-server is flipped into network-reachable HTTP MCP mode", { skip: dockerAvailable() ? false : "docker not available (skip-loud)" }, () => {
  const p = mergedConfig().services["prism-server"];
  // environment may merge as a map; normalize to a {K:V} view.
  const env = Array.isArray(p.environment)
    ? Object.fromEntries(p.environment.map((kv) => {
        const i = kv.indexOf("=");
        return [kv.slice(0, i), kv.slice(i + 1)];
      }))
    : p.environment;
  assert.equal(env.TRANSPORT, "http", "MCP server must run HTTP transport for /mcp");
  assert.equal(env.PRISM_BIND_HOST, "0.0.0.0", "MCP server must bind all interfaces");
  // The single most dangerous merge failure mode: the override adds a LIST
  // `environment` onto the base's LIST `environment`. Compose merges that
  // per-key (base keys survive), but if a compose upgrade or an override edit
  // ever regressed it to wholesale-replace, the base DATABASE_URL/NODE_ENV
  // would silently vanish and prism-server would boot mis-configured while
  // this test still passed. Assert base keys survived so the test fails loud
  // on that regression (R9 — the assertion that protects the invariant the
  // file's WHY header is most worried about).
  assert.equal(env.NODE_ENV, "production", "base NODE_ENV must survive the env list-merge");
  assert.ok(
    typeof env.DATABASE_URL === "string" && env.DATABASE_URL.includes("postgres://"),
    "base DATABASE_URL must survive the env list-merge (append-by-key, not replace)",
  );
});
