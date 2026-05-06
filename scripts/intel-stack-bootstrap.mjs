#!/usr/bin/env node
/**
 * intel-stack-bootstrap — INTEL-OLLAMA-OBSIDIAN-MS0/P17-U02.
 *
 * Validates that docker-compose.intel.yml binds Qdrant + Ollama volumes to
 * absolute H:\prism\state\ paths (cross-PC persistent), creates those state
 * dirs idempotently if missing, and optionally runs the cross-PC parity
 * smoke test:
 *
 *   1. Compose up -f docker-compose.yml -f docker-compose.intel.yml qdrant
 *   2. PUT /collections/{name} with vector size=768
 *   3. Upsert {id:1, vector:[0.1, 0.2, …], payload:{tag:"smoke"}}
 *   4. docker compose stop qdrant   # forces flush to disk
 *   5. docker compose start qdrant  # remounts H:\prism\state\qdrant
 *   6. Search nearest to the same vector → expect id=1, score≈1.0
 *
 * The "cross-PC" eject/remount step is documented but not automated — the
 * stop/start cycle exercises the same code path: data must round-trip
 * through the on-disk H: volume, not RAM.
 *
 * Pure decision/parser functions are exported so vitest can validate
 * the override-file structure without spawning Docker.
 *
 * USAGE
 *   node scripts/intel-stack-bootstrap.mjs                # validate only
 *   node scripts/intel-stack-bootstrap.mjs --ensure-dirs  # also mkdir state dirs
 *   node scripts/intel-stack-bootstrap.mjs --smoke        # full round-trip
 *   node scripts/intel-stack-bootstrap.mjs --json         # machine-readable output
 *
 * Exit codes:
 *   0 = compose file valid + (smoke passed if requested)
 *   1 = compose file missing
 *   2 = volume binding wrong (not pointing at H:\prism\state\…)
 *   3 = state dir mkdir failed
 *   4 = smoke round-trip failed
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import process from "node:process";

export const COMPOSE_OVERRIDE_RELATIVE = "docker-compose.intel.yml";
export const REQUIRED_QDRANT_HOST_PATH = "H:/prism/state/qdrant";
export const REQUIRED_OLLAMA_HOST_PATH = "H:/prism/state/ollama";
export const QDRANT_CONTAINER_PATH = "/qdrant/storage";
export const OLLAMA_CONTAINER_PATH = "/root/.ollama";
export const SMOKE_COLLECTION = "prism_intel_smoke";
export const SMOKE_VECTOR_DIM = 768;
export const QDRANT_BASE_URL_DEFAULT = "http://127.0.0.1:6333";

// ──────────────────────────────────────────────────────────────────────
// Pure logic — directly testable, no I/O
// ──────────────────────────────────────────────────────────────────────

/**
 * Parse a minimal docker-compose YAML override file. We only need the
 * volume bindings under services.<name>.volumes — no full YAML grammar
 * required. Returns:
 *   { ok: true, services: { [name]: { volumes: string[] } } }
 *   { ok: false, reason: "..."}.
 *
 * The parser tolerates `#` comments and blank lines and `services:`
 * with two-space indentation (compose convention). Quoted volume
 * strings are unwrapped. Anything malformed → fail closed.
 *
 * @param {string} src
 */
export function parseComposeOverride(src) {
  if (typeof src !== "string" || src.length === 0) {
    return { ok: false, reason: "empty-source" };
  }

  const services = /** @type {Record<string, {volumes:string[]}>} */ ({});
  const lines = src.split(/\r?\n/);
  let inServices = false;
  /** @type {string|null} */ let currentService = null;
  let inVolumes = false;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trimEnd();
    if (line.trim().length === 0) continue;

    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }

    if (!inServices) continue;

    // Service header — exactly 2 spaces of indent, then `name:`
    const svcMatch = /^ {2}([A-Za-z_][A-Za-z0-9_-]*):\s*$/.exec(line);
    if (svcMatch) {
      currentService = svcMatch[1];
      services[currentService] = services[currentService] ?? { volumes: [] };
      inVolumes = false;
      continue;
    }

    if (currentService === null) continue;

    // Volumes header — 4 spaces indent, then `volumes:`
    if (/^ {4}volumes:\s*$/.test(line)) {
      inVolumes = true;
      continue;
    }

    // Other 4-space-indent keys end the volumes block.
    if (/^ {4}[A-Za-z_]/.test(line)) {
      inVolumes = false;
      continue;
    }

    // Volume entry — 6 spaces indent, then `- "?host:container"?`
    if (inVolumes) {
      const volMatch = /^ {6}-\s*["']?([^"']+)["']?\s*$/.exec(line);
      if (volMatch) {
        services[currentService].volumes.push(volMatch[1].trim());
      }
    }
  }

  if (Object.keys(services).length === 0) {
    return { ok: false, reason: "no-services" };
  }
  return { ok: true, services };
}

/**
 * Decide whether the parsed services contain the cross-PC bindings the
 * milestone requires. Returns a structured report:
 *   { ok: true }
 *   { ok: false, missing: string[], wrong: Array<{service, expected, actual}> }
 *
 * @param {Record<string, {volumes:string[]}>} services
 */
export function validateRequiredBindings(services) {
  /** @type {string[]} */ const missing = [];
  /** @type {Array<{service:string, expected:string, actual:string}>} */ const wrong = [];

  const required = [
    { service: "qdrant", host: REQUIRED_QDRANT_HOST_PATH, container: QDRANT_CONTAINER_PATH },
    { service: "ollama", host: REQUIRED_OLLAMA_HOST_PATH, container: OLLAMA_CONTAINER_PATH },
  ];

  for (const r of required) {
    const svc = services?.[r.service];
    if (!svc) {
      missing.push(r.service);
      continue;
    }
    const expected = `${r.host}:${r.container}`;
    const match = svc.volumes.find((v) => v.endsWith(`:${r.container}`));
    if (!match) {
      missing.push(`${r.service}:${r.container}`);
      continue;
    }
    if (!matchesHostPath(match, r.host, r.container)) {
      wrong.push({ service: r.service, expected, actual: match });
    }
  }

  if (missing.length === 0 && wrong.length === 0) return { ok: true };
  return { ok: false, missing, wrong };
}

/**
 * Compare a raw volume string `host:container` against the required
 * host path, normalizing forward/backslashes and ignoring trailing slashes.
 * Both `H:/prism/state/qdrant:/qdrant/storage` and
 * `H:\\prism\\state\\qdrant:/qdrant/storage` are accepted.
 */
export function matchesHostPath(volumeString, requiredHost, container) {
  if (typeof volumeString !== "string") return false;
  // Split on the LAST `:<container>` — Windows `H:` looks like a colon-separated drive letter
  const tail = `:${container}`;
  if (!volumeString.endsWith(tail)) return false;
  const host = volumeString.slice(0, -tail.length);
  return canonicalizePath(host) === canonicalizePath(requiredHost);
}

function canonicalizePath(p) {
  if (typeof p !== "string") return "";
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/**
 * Decide what the bootstrap should do given the validation result and
 * user flags. Pure — no fs/exec involved.
 *
 * @param {object} input
 * @param {boolean} input.composeFileExists
 * @param {boolean} input.bindingsValid
 * @param {boolean} input.ensureDirs
 * @param {boolean} input.runSmoke
 */
export function decideBootstrapPlan({ composeFileExists, bindingsValid, ensureDirs, runSmoke }) {
  if (!composeFileExists) {
    return { plan: "abort", reason: "compose-missing", exitCode: 1 };
  }
  if (!bindingsValid) {
    return { plan: "abort", reason: "bindings-wrong", exitCode: 2 };
  }
  /** @type {string[]} */ const steps = ["validate-ok"];
  if (ensureDirs) steps.push("ensure-state-dirs");
  if (runSmoke) steps.push("compose-up", "qdrant-roundtrip", "compose-stop", "compose-start", "qdrant-recall");
  return { plan: "proceed", steps };
}

/**
 * Parse argv. Mirrors P17-U01's parseArgs but with this script's flags.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const out = {
    ensureDirs: false,
    smoke: false,
    json: false,
    composePath: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ensure-dirs") out.ensureDirs = true;
    else if (a === "--smoke") out.smoke = true;
    else if (a === "--json") out.json = true;
    else if (a === "--compose") out.composePath = argv[++i] ?? "";
    else if (a.startsWith("--compose=")) out.composePath = a.slice("--compose=".length);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// I/O glue — fs + execSync + fetch (live; not exercised in vitest)
// ──────────────────────────────────────────────────────────────────────

function findRepoRoot(startCwd = process.cwd()) {
  let cur = startCwd;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, "docker-compose.yml"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startCwd;
}

function ensureStateDirs() {
  const created = [];
  for (const p of [REQUIRED_QDRANT_HOST_PATH, REQUIRED_OLLAMA_HOST_PATH]) {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
      created.push(p);
    }
  }
  return created;
}

function deterministicSmokeVector() {
  // Reproducible vector for the round-trip — using cosine of index/dim.
  return Array(SMOKE_VECTOR_DIM).fill(0).map((_, i) => Math.cos(i / SMOKE_VECTOR_DIM));
}

async function qdrantRoundTrip(baseUrl) {
  const vector = deterministicSmokeVector();

  await fetch(`${baseUrl}/collections/${SMOKE_COLLECTION}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vectors: { size: SMOKE_VECTOR_DIM, distance: "Cosine" } }),
  });

  await fetch(`${baseUrl}/collections/${SMOKE_COLLECTION}/points`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      points: [{ id: 1, vector, payload: { tag: "intel-stack-bootstrap-smoke" } }],
    }),
  });

  return { upserted: true };
}

async function qdrantRecall(baseUrl) {
  const vector = deterministicSmokeVector();
  const res = await fetch(`${baseUrl}/collections/${SMOKE_COLLECTION}/points/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vector, limit: 1, with_payload: true }),
  });
  if (!res.ok) {
    return { ok: false, reason: `recall HTTP ${res.status}` };
  }
  const json = await res.json();
  const top = json?.result?.[0];
  if (!top) return { ok: false, reason: "no-results" };
  if (top.id !== 1) return { ok: false, reason: `wrong-id:${top.id}` };
  if (typeof top.score !== "number" || top.score < 0.99) {
    return { ok: false, reason: `low-score:${top.score}` };
  }
  return { ok: true, score: top.score, id: top.id };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = findRepoRoot();
  const composePath = args.composePath
    ? path.resolve(args.composePath)
    : path.join(root, COMPOSE_OVERRIDE_RELATIVE);

  /** @type {Record<string, any>} */ const report = {
    composePath,
    composeExists: false,
    services: null,
    bindings: null,
    plan: null,
    createdDirs: [],
    smoke: null,
    error: null,
  };

  if (!fs.existsSync(composePath)) {
    report.error = "compose-missing";
    emit(report, args.json);
    process.exit(1);
  }
  report.composeExists = true;

  const src = fs.readFileSync(composePath, "utf8");
  const parsed = parseComposeOverride(src);
  if (!parsed.ok) {
    report.error = `parse:${parsed.reason}`;
    emit(report, args.json);
    process.exit(1);
  }
  report.services = parsed.services;

  const validation = validateRequiredBindings(parsed.services);
  report.bindings = validation;

  const plan = decideBootstrapPlan({
    composeFileExists: true,
    bindingsValid: validation.ok,
    ensureDirs: args.ensureDirs,
    runSmoke: args.smoke,
  });
  report.plan = plan;

  if (plan.plan === "abort") {
    emit(report, args.json);
    process.exit(plan.exitCode ?? 1);
  }

  if (args.ensureDirs) {
    try {
      report.createdDirs = ensureStateDirs();
    } catch (e) {
      report.error = `mkdir:${e.message}`;
      emit(report, args.json);
      process.exit(3);
    }
  }

  if (args.smoke) {
    const baseUrl = process.env.QDRANT_BASE_URL || QDRANT_BASE_URL_DEFAULT;
    try {
      execSync(`docker compose -f docker-compose.yml -f ${COMPOSE_OVERRIDE_RELATIVE} up -d qdrant`, {
        cwd: root,
        stdio: "ignore",
      });
      await qdrantRoundTrip(baseUrl);

      execSync(`docker compose -f docker-compose.yml -f ${COMPOSE_OVERRIDE_RELATIVE} stop qdrant`, {
        cwd: root,
        stdio: "ignore",
      });
      execSync(`docker compose -f docker-compose.yml -f ${COMPOSE_OVERRIDE_RELATIVE} start qdrant`, {
        cwd: root,
        stdio: "ignore",
      });
      // Qdrant takes a moment to re-open the on-disk store.
      await new Promise((r) => setTimeout(r, 3000));

      const recall = await qdrantRecall(baseUrl);
      report.smoke = recall;
      if (!recall.ok) {
        emit(report, args.json);
        process.exit(4);
      }
    } catch (e) {
      report.error = `smoke:${e.message?.slice(0, 200)}`;
      emit(report, args.json);
      process.exit(4);
    }
  }

  emit(report, args.json);
  process.exit(0);
}

function emit(report, asJson) {
  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }
  const lines = [
    `Compose:    ${report.composePath} (${report.composeExists ? "exists" : "MISSING"})`,
  ];
  if (report.services) {
    lines.push(`Services:   ${Object.keys(report.services).join(", ")}`);
  }
  if (report.bindings?.ok === true) {
    lines.push(`Bindings:   OK (qdrant + ollama on H:\\prism\\state\\)`);
  } else if (report.bindings) {
    lines.push(`Bindings:   FAIL`);
    if (report.bindings.missing?.length) lines.push(`  missing:  ${report.bindings.missing.join(", ")}`);
    if (report.bindings.wrong?.length) {
      for (const w of report.bindings.wrong) {
        lines.push(`  wrong:    ${w.service} expected=${w.expected} actual=${w.actual}`);
      }
    }
  }
  if (report.createdDirs.length > 0) {
    lines.push(`Created:    ${report.createdDirs.join(", ")}`);
  }
  if (report.smoke?.ok) {
    lines.push(`Smoke:      PASS (round-trip via on-disk volume, score=${report.smoke.score.toFixed(4)})`);
  } else if (report.smoke && !report.smoke.ok) {
    lines.push(`Smoke:      FAIL (${report.smoke.reason})`);
  }
  if (report.error) {
    lines.push(`ERROR:      ${report.error}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("intel-stack-bootstrap.mjs");
if (invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`unhandled: ${e?.stack ?? e}\n`);
    process.exit(1);
  });
}
