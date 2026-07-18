#!/usr/bin/env node
/**
 * launch-verify-erp.mjs -- U-WIRE-VERIFY-HARNESS (slot:hotel, LAUNCH-WIRE campaign).
 *
 * Repeatable LIVE verification of the Domain-4 (Business ERP + Employee Portal) backend
 * contract layer against a running :3100 server. Proves, with a REAL token, exactly the
 * launch-wire fix classes this campaign shipped:
 *
 *   1. AUTH GATES  -- anon requests to verifyToken-gated routers 401 (never silent data).
 *   2. ENVELOPE    -- authed responses carry PARSED data, never the bare prism_business
 *                     {type:"text",text} slimResponse (the recurring dead-panel class).
 *   3. ROLE GATES  -- LEAD_ROLES routes 403 a basic user (privilege tiers hold).
 *
 * Credentials: registers/logs-in a DISPOSABLE local test user via the public /auth/register
 * route (the operator-approved harness design; integration tests seed users the same way).
 * It never touches or guesses operator accounts. Idempotent: re-runs reuse the same user
 * (register 4xx on exists -> login proceeds).
 *
 * Scope (honest, R12): this verifies the BACKEND contract layer only. Browser-level page
 * rendering (panels showing the data) is the separate live page-verify layer and needs a
 * FRESH web dist (vite build) -- static files are served per-request, so rebuilding dist/web
 * goes live without a server restart.
 *
 *   node scripts/launch-verify-erp.mjs [--base http://127.0.0.1:3100]
 *
 * Exit 0 = all checks pass. Exit 1 = any check failed (fail loud, per-check report).
 * First live-green run: 2026-07-05 against PID 22796 (fresh Jul-4 dist).
 */

const BASE = (() => {
  const i = process.argv.indexOf("--base");
  return (i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : "http://127.0.0.1:3100").replace(/\/$/, "") + "/api/v1";
})();

const TEST_USER = {
  username: "launch-verify-hotel",
  email: "launch-verify-hotel@test.local",
  // Deterministic so re-runs log into the SAME disposable user. Local test server only.
  password: "Lv-2026-07-05-hotel!x9",
};

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " -- " + detail : ""}`);
}

async function json(r) {
  try { return await r.json(); } catch { return {}; }
}

/** The dead-panel signature: a bare prism_business slimResponse that reached the client. */
function isEnvelope(v) {
  return !!(v && typeof v === "object" && v.type === "text" && typeof v.text === "string");
}

async function main() {
  // 0. Server reachable at all (any HTTP status = alive; ECONNREFUSED throws).
  let r;
  try {
    r = await fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  } catch (e) {
    console.error(`FATAL: server unreachable at ${BASE} (${e?.cause?.code ?? e?.message}). Start :3100 first.`);
    process.exit(1);
  }

  // 1. Register (idempotent) + login the disposable test user.
  await fetch(`${BASE}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(TEST_USER),
  }); // 200 first run; 4xx on exists -- either way login decides.
  r = await fetch(`${BASE}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: TEST_USER.username, password: TEST_USER.password }),
  });
  const lb = await json(r);
  const token = lb?.result?.token?.access_token;
  check("login yields access_token", r.status === 200 && typeof token === "string" && token.length > 20, `status=${r.status}`);
  if (!token) return finish();

  const H = { Authorization: `Bearer ${token}` };
  const HP = { ...H, "Content-Type": "application/json" };

  // 2. ANON GATES -- verifyToken routers must 401 without a Bearer.
  for (const path of ["/erp/job-dashboard", "/hotel-portal/digest"]) {
    const rr = await fetch(`${BASE}${path}`, path.includes("digest") ? { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" } : undefined);
    check(`anon ${path} -> 401`, rr.status === 401, `status=${rr.status}`);
  }

  // 3. ERP ENVELOPE PEEL -- authed GET /erp/job-dashboard returns PARSED dashboard data.
  r = await fetch(`${BASE}/erp/job-dashboard`, { headers: H });
  const jd = await json(r);
  check("authed /erp/job-dashboard -> 200 parsed (not {type,text})",
    r.status === 200 && jd?.ok === true && !isEnvelope(jd?.data) && jd?.data && typeof jd.data.total_jobs !== "undefined",
    `status=${r.status} keys=${Object.keys(jd?.data ?? {}).slice(0, 5).join(",")}`);

  // 4. ERP tool-usage (the dashboard-auth route) -- parsed, not envelope.
  r = await fetch(`${BASE}/erp/tool-usage`, { method: "POST", headers: HP, body: "{}" });
  const tu = await json(r);
  check("authed /erp/tool-usage -> 200 parsed",
    r.status === 200 && !isEnvelope(tu?.data) && tu?.data && typeof tu.data.tools_used !== "undefined",
    `status=${r.status} keys=${Object.keys(tu?.data ?? {}).slice(0, 4).join(",")}`);

  // 5. BUSINESS DISPATCH -- allowlisted read, peeled (any parsed shape, never the envelope).
  r = await fetch(`${BASE}/business/dispatch`, {
    method: "POST", headers: HP, body: JSON.stringify({ action: "vendor_catalog_query", params: { query: "carbide", limit: 1 } }),
  });
  const bd = await json(r);
  check("authed /business/dispatch vendor_catalog_query -> 200 not-envelope", r.status === 200 && !isEnvelope(bd), `status=${r.status}`);

  // 6. HOTEL-PORTAL ENVELOPE PEEL -- POST /digest parsed (self-gate degrades gracefully for
  //    an auth_user_id-unmapped user, per the documented scaffolding behavior).
  r = await fetch(`${BASE}/hotel-portal/digest`, { method: "POST", headers: HP, body: "{}" });
  const dg = await json(r);
  check("authed POST /hotel-portal/digest -> 200 parsed", r.status === 200 && !isEnvelope(dg?.data ?? dg), `status=${r.status}`);

  // 7. ROLE GATE -- /hotel-portal/dashboard is LEAD_ROLES; the basic test user must be 403.
  //    (If register ever starts granting lead+, this fails LOUD -- that would itself be a
  //    privilege-escalation regression worth failing on.)
  r = await fetch(`${BASE}/hotel-portal/dashboard`, { method: "POST", headers: HP, body: "{}" });
  check("basic user POST /hotel-portal/dashboard -> 403 (LEAD_ROLES holds)", r.status === 403, `status=${r.status}`);

  // 8. EMPLOYEE PORTAL DISPATCH (U-PORTAL-EXPRESS-ROUTES, commit 23a1ff4a60) -- the phone
  //    portal's REST bridge, hard-404 from 2026-05-24 until this route shipped. Anon -> 401;
  //    authed allowlisted read -> 200 VERBATIM {ok,...} (never a wrapper/envelope);
  //    non-allowlisted emp_* -> 403 (deny-by-default holds on the live wire).
  r = await fetch(`${BASE}/employee-portal/dispatch`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "emp_rank_jobs", params: {} }),
  });
  check("anon /employee-portal/dispatch -> 401", r.status === 401, `status=${r.status}`);

  r = await fetch(`${BASE}/employee-portal/dispatch`, {
    method: "POST", headers: HP, body: JSON.stringify({ action: "emp_rank_jobs", params: {} }),
  });
  const ep = await json(r);
  check("authed emp_rank_jobs -> 200 verbatim {ok,...} (not envelope, no wrapper)",
    r.status === 200 && ep?.ok === true && !isEnvelope(ep) && typeof ep?.result === "undefined",
    `status=${r.status} ok=${ep?.ok} keys=${Object.keys(ep ?? {}).slice(0, 4).join(",")}`);

  r = await fetch(`${BASE}/employee-portal/dispatch`, {
    method: "POST", headers: HP, body: JSON.stringify({ action: "emp_acl_attach_employee_engine", params: {} }),
  });
  check("authed non-allowlisted emp_* -> 403 (deny-by-default live)", r.status === 403, `status=${r.status}`);

  // 9. WEDM LIVE STATUS (U-WEDM-LIVE-ROUTES) -- WireEdmWizardPage's 4 indicator polls,
  //    404 (silently swallowed -> eternal "loading") from U-P2PFS32/33 ship until this route.
  r = await fetch(`${BASE}/wedm-live/rul`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("anon /wedm-live/rul -> 401", r.status === 401, `status=${r.status}`);

  r = await fetch(`${BASE}/wedm-live/safety-envelope`, { method: "POST", headers: HP, body: JSON.stringify({ reading: { gap_V: 10 } }) });
  const se = await json(r);
  check("authed safety-envelope gap_V=10 -> critical (real DEFAULT_ENVELOPE min 20)",
    r.status === 200 && se?.data?.level === "critical" && se?.data?.score === 0,
    `status=${r.status} level=${se?.data?.level}`);

  r = await fetch(`${BASE}/wedm-live/rul`, { method: "POST", headers: HP, body: "{}" });
  const rl = await json(r);
  check("authed /wedm-live/rul -> 5 degradation components",
    r.status === 200 && Array.isArray(rl?.data?.components) && rl.data.components.length === 5,
    `status=${r.status} n=${rl?.data?.components?.length}`);

  r = await fetch(`${BASE}/wedm-live/autonomy`, { method: "POST", headers: HP, body: "{}" });
  const au = await json(r);
  check("authed /wedm-live/autonomy -> adapted level (200) or clean 502 (gate offline)",
    (r.status === 200 && typeof au?.data?.level === "number") || (r.status === 502 && typeof au?.error === "string"),
    `status=${r.status}`);

  finish();
}

function finish() {
  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main();
