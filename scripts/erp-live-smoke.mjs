#!/usr/bin/env node
/**
 * PRISM business/ERP LIVE round-trip smoke harness (slot:hotel).
 *
 * WHY THIS EXISTS -- the static FE<->BE audits (audit-frontend-backend-contract /
 * audit-fe-route-action-contract / audit-page-wiring) prove that a route is MOUNTED and that its
 * dispatcher action EXISTS. They do NOT prove the endpoint actually returns correct LIVE data.
 * Every recurring "dead wire" regression in this codebase is invisible to the static audits:
 *   - ERP envelope-unwrap silent data-drop (DepartmentDashboard read .result from {ok,data})
 *   - machineLive GET->POST method mismatch
 *   - ppg/history dead wire
 * Those only show up when you actually CALL the endpoint over HTTP and look at the payload. This
 * harness does exactly that for the business/ERP surface (erp.ts, 64 GET reads), so "ready for
 * internal shop-floor testing" is backed by EVIDENCE (R12), not a green static audit.
 *
 * SCOPE -- the DATA surface is READ-ONLY by construction: it probes only `router.get(...)` routes
 * (never POST/PATCH/DELETE), so it cannot mutate shop/job/financial state. Auth is the one exception:
 * the bootstrap registers + logs in a transient probe user to obtain a real bearer token the SERVER
 * accepts (a token minted in this process would not be recognised -- different in-memory AuthEngine
 * instance). That register IS an auth-state write -- it leaves a persistent in-memory admin probe
 * user (`hotel_smoke_probe`) for the server's lifetime. AUTH-classified rows can therefore include
 * role-gated routes when the probe user lacks the required role (not a dead-wire -- read as such).
 *
 * CLASSIFICATION (kept deliberately conservative so the ERROR count means "real bug", not noise):
 *   OK         2xx, parseable, non-empty, no inner error
 *   EMPTY      2xx but empty/null/[]/`data_available:false`, or 404/400 (expected with synthetic params)
 *   DENIED     2xx with inner `success:false` + a business reason (a VALID denial, e.g. out-of-stock)
 *   ERROR      5xx, `{ok:false}`, or an inner error/exception message  <-- the real dead-wire signal
 *   AUTH       401/403 (token rejected or insufficient role)
 *   UNREACHABLE no HTTP response (bridge down / timeout)
 *
 * Exit: 0 when zero ERROR + zero UNREACHABLE; 2 bridge down; 3 auth bootstrap failed; 1 otherwise.
 * Output: state/shared/dashboards/ERP-LIVE-SMOKE.{json,md} + a console summary.
 *
 * Pure helpers (parseGetRoutes / substituteParams / unwrapMcpContent / classifyResponse) are
 * exported for the vitest -- the network parts live only in main().
 *
 * Knobs: PRISM_ERP_SMOKE_BASE (default http://127.0.0.1:3100), _TIMEOUT_MS (8000),
 *        _ROUTE_FILE (mcp-server/src/routes/erp.ts), _USER / _PASS / _EMAIL.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

const BASE = process.env.PRISM_ERP_SMOKE_BASE || "http://127.0.0.1:3100";
const API = `${BASE}/api/v1`;
const TIMEOUT_MS = Number(process.env.PRISM_ERP_SMOKE_TIMEOUT_MS || 8000);
const ROUTE_FILE = process.env.PRISM_ERP_SMOKE_ROUTE_FILE ||
  join(REPO, "mcp-server", "src", "routes", "erp.ts");
const USER = process.env.PRISM_ERP_SMOKE_USER || "hotel_smoke_probe";
const PASS = process.env.PRISM_ERP_SMOKE_PASS || "smoke-probe-pw-123";
const EMAIL = process.env.PRISM_ERP_SMOKE_EMAIL || "smoke@jmdie.test";

/** Sample values substituted for `:param` path segments (read-only probes -- values are synthetic). */
export const SAMPLE_PARAMS = {
  jobId: "JOB-1001", job_id: "JOB-1001", id: "1",
  employeeId: "EMP-001", employee_id: "EMP-001", emp_id: "EMP-001",
  machineId: "VMC-01", machine_id: "VMC-01",
  customerId: "CUST-001", customer_id: "CUST-001",
  poId: "PO-001", po_id: "PO-001", quoteId: "Q-001",
  periodId: "2026-06", workOrderId: "WO-001", assetId: "ASSET-001",
  ncId: "NC-001", faiId: "FAI-001", accountId: "1000",
};

/**
 * Extract READ-ONLY GET route paths from an Express route-file source.
 * Matches `router.get("<path>", ...)` / `router.get('<path>', ...)`. Returns the raw path strings
 * (still containing `:param` tokens) plus whether the route line references requireRole (annotative).
 */
export function parseGetRoutes(src) {
  const out = [];
  const re = /router\.get\(\s*(["'`])([^"'`]+)\1([^\n]*)/g;
  for (const m of src.matchAll(re)) {
    const path = m[2];
    if (!path.startsWith("/")) continue;
    const tail = m[3] || "";
    out.push({ path, requiresRole: /requireRole/.test(tail) });
  }
  return out;
}

/** Replace each `:param` with a sample value; unknown params get a generic token. */
export function substituteParams(path, params = SAMPLE_PARAMS) {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_full, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : "SAMPLE");
}

/**
 * Unwrap the MCP content-wrapper. callTool() results frequently arrive as
 * `{ type:"text", text:"<json-string>" }` (or an array of such blocks). Recursively resolve that
 * to the real payload object so the classifier inspects the ACTUAL data, not the wrapper.
 * Returns the deepest parseable value; falls back to the input on any non-JSON text.
 */
export function unwrapMcpContent(payload, depth = 0) {
  if (depth > 6 || payload == null) return payload;
  if (Array.isArray(payload)) {
    // MCP content arrays: take the first text block if present.
    const textBlock = payload.find((b) => b && b.type === "text" && typeof b.text === "string");
    if (textBlock) return unwrapMcpContent(textBlock, depth + 1);
    return payload;
  }
  if (typeof payload === "object" && payload.type === "text" && typeof payload.text === "string") {
    try { return unwrapMcpContent(JSON.parse(payload.text), depth + 1); }
    catch { return payload.text; }
  }
  return payload;
}

function isEmptyData(d) {
  if (d == null) return true;
  if (Array.isArray(d)) return d.length === 0;
  if (typeof d === "object") return Object.keys(d).length === 0;
  if (typeof d === "string") return d.trim() === "";
  return false;
}

/**
 * Classify one probe result. Pure: takes the HTTP status, parsed body, and a networkError flag.
 * Conservative on purpose -- only genuine backend failures count as ERROR so the headline number
 * is actionable (R12: don't cry wolf with synthetic-param 404s).
 */
export function classifyResponse({ status, body, networkError }) {
  if (networkError) return { status: "UNREACHABLE", reason: String(networkError) };
  if (status === 401 || status === 403) return { status: "AUTH", reason: `HTTP ${status}` };
  if (status >= 500) return { status: "ERROR", reason: `HTTP ${status}` };
  if (status === 404) return { status: "EMPTY", reason: "404 not-found (synthetic param)" };
  if (status === 400 || status === 422) return { status: "EMPTY", reason: `HTTP ${status} (synthetic param)` };
  if (status === 429) return { status: "EMPTY", reason: "429 rate-limited" };
  if (status < 200 || status >= 300) return { status: "ERROR", reason: `HTTP ${status}` };

  // 2xx: inspect the envelope + the (unwrapped) payload.
  if (body == null) return { status: "EMPTY", reason: "2xx empty body" };
  if (body.ok === false || (typeof body.error === "string" && body.error)) {
    return { status: "ERROR", reason: `envelope error: ${body.error || "ok:false"}` };
  }
  let data = body.ok !== undefined ? body.data : ("result" in body ? body.result : body);
  data = unwrapMcpContent(data);

  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (data.success === false) {
      return { status: "DENIED", reason: String(data.message || data.error || "success:false") };
    }
    if (typeof data.error === "string" && data.error) {
      return { status: "ERROR", reason: `inner error: ${data.error}` };
    }
    if (data.data_available === false) return { status: "EMPTY", reason: "data_available:false (honest empty)" };
    // Some engines return { success:true, data:[...] }.
    if ("data" in data && isEmptyData(data.data)) return { status: "EMPTY", reason: "inner data empty" };
  }
  if (isEmptyData(data)) return { status: "EMPTY", reason: "empty payload" };
  return { status: "OK", reason: "" };
}

// ----------------------------- network layer (main only) -----------------------------

async function fetchJson(method, url, { token, bodyObj } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: bodyObj === undefined ? undefined : JSON.stringify(bodyObj),
      signal: controller.signal,
    });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

async function bootstrapToken() {
  // register is idempotent for our purpose: a 400 "already exists" is fine, we then log in.
  try {
    await fetchJson("POST", `${API}/auth/register`,
      { bodyObj: { username: USER, email: EMAIL, password: PASS, roles: ["admin"] } });
  } catch { /* ignore -- login is the source of truth */ }
  const login = await fetchJson("POST", `${API}/auth/login`, { bodyObj: { username: USER, password: PASS } });
  const tok = login?.body?.result?.token?.access_token
    || login?.body?.result?.token
    || login?.body?.token?.access_token
    || login?.body?.token;
  if (!tok || typeof tok !== "string") {
    throw new Error(`auth bootstrap failed (login status ${login?.status}): no access_token`);
  }
  return tok;
}

async function pathExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  if (!(await pathExists(ROUTE_FILE))) {
    console.error(`[erp-live-smoke] route file not found: ${ROUTE_FILE}`);
    process.exit(2);
  }
  // Health gate.
  let health;
  try { health = await fetchJson("GET", `${BASE}/health`); }
  catch (e) { console.error(`[erp-live-smoke] bridge unreachable at ${BASE}: ${e.message}`); process.exit(2); }
  if (!health || health.status !== 200) {
    console.error(`[erp-live-smoke] bridge not healthy at ${BASE} (status ${health?.status})`);
    process.exit(2);
  }

  let token;
  try { token = await bootstrapToken(); }
  catch (e) { console.error(`[erp-live-smoke] ${e.message}`); process.exit(3); }

  const routes = parseGetRoutes(await readFile(ROUTE_FILE, "utf8"));
  const records = [];
  for (const r of routes) {
    const probePath = substituteParams(r.path);
    const url = `${API}/erp${probePath}`; // erp router is mounted at /api/v1/erp
    let verdict;
    try {
      const { status, body } = await fetchJson("GET", url, { token });
      verdict = classifyResponse({ status, body });
      verdict.httpStatus = status;
    } catch (e) {
      verdict = classifyResponse({ networkError: e.message });
    }
    records.push({ path: r.path, probePath, requiresRole: r.requiresRole, ...verdict });
  }

  const byStatus = records.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  const errors = records.filter((r) => r.status === "ERROR" || r.status === "UNREACHABLE");

  const dashDir = join(REPO, "state", "shared", "dashboards");
  await mkdir(dashDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const json = { schemaVersion: "1.0.0", generatedAt, base: BASE, routeFile: ROUTE_FILE, total: records.length, byStatus, records };
  await writeFile(join(dashDir, "ERP-LIVE-SMOKE.json"), JSON.stringify(json, null, 2));

  const md = [
    `# ERP/Business LIVE smoke -- ${generatedAt}`,
    ``,
    `Bridge: \`${BASE}\` | route file: \`mcp-server/src/routes/erp.ts\` | probed: **${records.length}** GET reads (read-only).`,
    ``,
    `| status | count |`,
    `|---|---|`,
    ...["OK", "EMPTY", "DENIED", "AUTH", "ERROR", "UNREACHABLE"].map((s) => `| ${s} | ${byStatus[s] || 0} |`),
    ``,
    errors.length
      ? `## ERROR / UNREACHABLE (real dead-wire signal -- ${errors.length})\n` +
        errors.map((e) => `- \`GET /erp${e.probePath}\` -- **${e.status}** -- ${e.reason}`).join("\n")
      : `## OK -- no ERROR / UNREACHABLE endpoints; business/ERP read surface is live.`,
    ``,
    `_Re-run: \`node scripts/erp-live-smoke.mjs\`. EMPTY/DENIED with synthetic params are expected (no seeded resource)._`,
  ].join("\n");
  await writeFile(join(dashDir, "ERP-LIVE-SMOKE.md"), md);

  console.log(`[erp-live-smoke] probed ${records.length} GET reads @ ${BASE}`);
  console.log(`[erp-live-smoke] ` + Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(" "));
  if (errors.length) {
    console.log(`[erp-live-smoke] ${errors.length} ERROR/UNREACHABLE:`);
    for (const e of errors) console.log(`   GET /erp${e.probePath} -> ${e.status}: ${e.reason}`);
  } else {
    console.log(`[erp-live-smoke] no ERROR/UNREACHABLE -- live read surface healthy.`);
  }
  console.log(`[erp-live-smoke] dashboard: state/shared/dashboards/ERP-LIVE-SMOKE.{json,md}`);
  process.exit(errors.length ? 1 : 0);
}

// Run only when invoked directly (not when imported by the test).
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main().catch((e) => { console.error(`[erp-live-smoke] fatal: ${e.stack || e.message}`); process.exit(1); });
}
