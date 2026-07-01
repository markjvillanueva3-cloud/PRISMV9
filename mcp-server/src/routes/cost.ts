/**
 * PRISM MCP Server — Cost Routes
 * Cost estimation, quoting, comparison, history, + COST-CASCADE-MS0 dashboard.
 */
import { Router } from "express";
import * as path from "node:path";
import type { CallToolFn } from "./index.js";
import { redactInternalMarginFields } from "./quote.js";
import {
  aggregateTelemetry,
  normalizeConfig,
  makeFsDeps,
  type AggregateWindow,
} from "../engines/CostAlarmEngine.js";

/**
 * U-COST-ROUTE-REDACT -- scrub the shop $/hr rate out of `shop_quote`'s customer-facing `notes[]`.
 * ProductEngine.shopQuote (ProductEngine.ts:1929) inlines the rate into a STRING:
 * `"Machine: <name> at $<rate>/hr"` -- a field-name redactor (redactInternalMarginFields) cannot catch
 * a value embedded in a string, so this shop_quote-specific helper filters the notes array, dropping any
 * entry that carries a `$<n>/hr` rate pattern while KEEPING the customer-safe lead-time / "Volume
 * discount" / safety notes. Machine-name-independent (matches the rate pattern, not the name). Pure +
 * total: clones, never mutates; a result without a string `notes` array passes through untouched.
 */
const RATE_PER_HOUR_RE = /\$\s*[\d.,]+\s*\/\s*hr/i;
export function redactShopQuoteNotes(result: unknown): unknown {
  if (typeof result !== "object" || result === null) return result;
  const notes = (result as Record<string, unknown>)["notes"];
  if (!Array.isArray(notes)) return result;
  const cleaned = notes.filter(
    (n) => !(typeof n === "string" && RATE_PER_HOUR_RE.test(n)),
  );
  return { ...(result as Record<string, unknown>), notes: cleaned };
}

/**
 * T-COSTPAGE-SHAPE -- reconcile `process_cost`'s output to the FE `CostEstimate` contract.
 *
 * `prism_intelligence:process_cost` (IntelligenceEngine.processCost) emits a PER-PART cost stack keyed
 * `total_cost_per_part` / `machine_cost` / `tool_cost_per_part` / `setup_cost_per_part` + a per-OPERATION
 * `breakdown` ARRAY + `batch_size`. But `CostEstimatorPage.tsx` derefs `result.per_part_cost`,
 * `result.total_cost`, and `Object.entries(result.breakdown)` (a category MAP). The shapes NEVER matched,
 * so `result.per_part_cost.toFixed(2)` threw `Cannot read properties of undefined` -- the page was dead for
 * EVERY caller since the shapes diverged (a pre-existing crash, independent of the U-COST-ROUTE-REDACT
 * redaction). This pure adapter maps the engine shape to the FE shape:
 *   - per_part_cost <- total_cost_per_part
 *   - total_cost    <- total_cost_per_part * batch_size (the whole-batch total the "Total Cost" card shows)
 *   - breakdown     <- { machine, tooling, setup } -- the THREE components processCost actually computes
 *     (machine_cost / tool_cost_per_part / setup_cost_per_part). The engine computes NO material/labor/
 *     overhead split, so this adapter does NOT fabricate those keys (R12); the FE's breakdown render is
 *     `Object.entries(...)` (shape-agnostic) so 3 keys render as 3 bars cleanly.
 * Pure + total: clones, never mutates; a result missing `total_cost_per_part` (already-FE-shaped, or a
 * redaction-emptied anon result) passes through untouched so the redactor stays the single anon-stripper.
 */
export function adaptCostEstimate(result: unknown): unknown {
  if (typeof result !== "object" || result === null) return result;
  const r = result as Record<string, unknown>;
  const perPart = r["total_cost_per_part"];
  // Only adapt the genuine process_cost shape. If total_cost_per_part is absent (already FE-shaped, or the
  // anon redactor already stripped the cost keys), return as-is -- never invent numbers.
  if (typeof perPart !== "number") return result;
  // batch_size: default a MISSING/non-number/0/negative to 1 (single part). NOTE: on the production wire
  // process_cost already pre-clamps batch (IntelligenceEngine.ts:1052 `Math.max(1, params.batch_size ?? 1)`)
  // and emits the clamped value, so a 0/negative never reaches this adapter via prism_intelligence -- this
  // guard only hardens the adapter as a standalone helper (its direct unit tests exercise that path).
  const rawBatch = r["batch_size"];
  const batch = typeof rawBatch === "number" && rawBatch > 0 ? rawBatch : 1;
  const machine = typeof r["machine_cost"] === "number" ? (r["machine_cost"] as number) : 0;
  const tooling = typeof r["tool_cost_per_part"] === "number" ? (r["tool_cost_per_part"] as number) : 0;
  const setup = typeof r["setup_cost_per_part"] === "number" ? (r["setup_cost_per_part"] as number) : 0;
  return {
    ...r,
    per_part_cost: perPart,
    total_cost: Math.round(perPart * batch * 100) / 100,
    // Category breakdown the FE renders -- only the components the engine actually computes.
    breakdown: { machine, tooling, setup },
  };
}

/**
 * U-COST-EST-REQ-BRIDGE (charlie 2026-06-26) -- map the CostEstimatorPage flat request shape to the
 * `prism_intelligence:process_cost` schema, so the page's "Estimate Cost" button actually reaches the
 * engine instead of dying on a Zod reject.
 *
 * THE GAP (real FE<->BE contract mismatch, verified live on :3100): the page (`CostEstimatorPage.tsx`,
 * via `web/src/api/cost.ts` `CostEstimateRequest`) posts a FLAT body:
 *   { material, operation: "milling"|"turning"|..., quantity, setup_time_min?, cycle_time_min?,
 *     tool_cost?, machine_rate_per_hour? }
 * but `process_cost`'s schema (intelligenceActionSchemas.ts:70) REQUIRES
 *   { material, operations: Array<{feature, depth?, width?, length?, diameter?}>, batch_size?, ... }.
 * The route forwarded `req.body` UNCHANGED, so every real submission failed Zod with
 *   "operations: expected array, received undefined" (or "operations.0: expected object, received string").
 * The page was dead for every authenticated caller since the shapes diverged -- the sibling of the
 * RESPONSE-side T-COSTPAGE-SHAPE crash (`adaptCostEstimate`), on the REQUEST side.
 *
 * THE MAP (no fabrication -- R12):
 *   - `operation` is a PROCESS TYPE (milling/turning/...), NOT a job_plan `feature`
 *     (pocket/slot/face/contour/hole/thread). Map each process to a representative machining feature so
 *     job_plan can run a cost-bearing plan. This is a COARSE process->feature heuristic for a cost
 *     estimate, not a per-feature CAM plan -- documented as such, never presented as exact.
 *   - `quantity` -> `batch_size` (the page's "Quantity" field IS the batch; process_cost amortizes setup
 *     over batch_size).
 *   - `setup_time_min` / `tool_cost` / `machine_rate_per_hour` pass through unchanged (same names).
 *   - `cycle_time_min`: process_cost DERIVES cycle time from job_plan per operation and has NO cycle-time
 *     input, so the page's cycle_time_min cannot be honored by this action. Passed through (schema is
 *     .passthrough()) but IGNORED by the engine -- NOT silently faked into the result. (A cycle-time-honoring
 *     path would need a different action; out of scope for the wiring fix.)
 * Non-destructive: if the body ALREADY carries an `operations` array (a non-page caller using the native
 * schema), it is returned untouched -- the bridge only fires for the flat page shape.
 * Pure + total: clones, never mutates.
 */
const PROCESS_TO_FEATURE: Record<string, string> = {
  milling: "pocket",
  turning: "contour",
  drilling: "hole",
  grinding: "face",
  edm: "slot",
  multi_operation: "pocket",
};
export function adaptCostEstimateRequest(body: unknown): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return body;
  const b = body as Record<string, unknown>;
  // Native shape already (operations array present) -> do not touch (non-page caller).
  if (Array.isArray(b["operations"])) return body;
  // Only bridge when the flat page shape is recognizable (a string `operation`); otherwise pass through
  // so we never invent an operations array out of an unrelated body.
  const operation = b["operation"];
  if (typeof operation !== "string") return body;
  const feature = PROCESS_TO_FEATURE[operation] ?? "pocket";
  const bridged: Record<string, unknown> = {
    ...b,
    operations: [{ feature, process: operation }],
  };
  // quantity -> batch_size (only when the caller didn't already set batch_size, and quantity is a positive int).
  if (typeof b["batch_size"] !== "number") {
    const qty = b["quantity"];
    if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) {
      bridged["batch_size"] = Math.max(1, Math.floor(qty));
    }
  }
  return bridged;
}

/**
 * COST-CASCADE-MS0/U-COST-DASHBOARD aggregate response shape.
 * Returned by GET /aggregate; consumed by the dashboard HTML.
 */
export interface CostAggregateResponse {
  ok: boolean;
  asOf: string;
  windowHours: number;
  daily: AggregateWindow | null;
  weekly: AggregateWindow | null;
  perTentacle: Record<string, { usd: number; tokens: number; count: number }>;
  hourlyUSD: Array<{ hourStartIso: string; usd: number; tokens: number; count: number }>;
  truncatedTailLines: number;
  source: "cost.aggregate";
  warning?: string;
}

/**
 * Build a CostAggregateResponse from cost-telemetry.jsonl. Pure-ish — only
 * dependency is filesystem via makeFsDeps. Exposed at module scope so the
 * test suite can call it without spinning Express.
 */
export function buildCostAggregate(opts?: {
  prismRoot?: string;
  now?: Date;
  windowHours?: number;
}): CostAggregateResponse {
  const prismRoot = opts?.prismRoot ?? path.resolve(process.env.PRISM_COST_DASHBOARD_ROOT ?? "H:/prism");
  const now = opts?.now ?? new Date();
  const windowHours = Math.max(1, Math.min(24 * 30, Math.floor(opts?.windowHours ?? 24)));
  try {
    const deps = makeFsDeps({ prismRoot, now: () => now });
    const rawConfig = deps.readConfig();
    const config = normalizeConfig(rawConfig, () => undefined);
    const telem = deps.readTelemetry();
    const dailyStart = new Date(now.getTime() - windowHours * 3600 * 1000);
    const weeklyStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const daily = aggregateTelemetry(telem.records, dailyStart, now, config, telem.truncatedTailLines);
    const weekly = aggregateTelemetry(telem.records, weeklyStart, now, config, telem.truncatedTailLines);
    const perTentacle: Record<string, { usd: number; tokens: number; count: number }> = {};
    const hourlyMap = new Map<string, { usd: number; tokens: number; count: number }>();
    for (const rec of telem.records) {
      const ms = Date.parse(rec.ts);
      if (!Number.isFinite(ms) || ms < dailyStart.getTime() || ms > now.getTime()) continue;
      if (config.ignoreTestTentacles && config.testTentaclePrefixes.some((p) => rec.tentacle.startsWith(p))) continue;
      if (config.tentacleAllowList && !config.tentacleAllowList.includes(rec.tentacle)) continue;
      const key = rec.tentacle || "__unknown__";
      const usd = Number.isFinite(rec.costUSD) ? rec.costUSD : 0;
      const tokens =
        (Number.isFinite(rec.inputTokens) ? rec.inputTokens : 0) +
        (Number.isFinite(rec.outputTokens) ? rec.outputTokens : 0);
      if (!perTentacle[key]) perTentacle[key] = { usd: 0, tokens: 0, count: 0 };
      perTentacle[key].usd += usd;
      perTentacle[key].tokens += tokens;
      perTentacle[key].count += 1;
      const hourStart = new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString();
      const slot = hourlyMap.get(hourStart) ?? { usd: 0, tokens: 0, count: 0 };
      slot.usd += usd;
      slot.tokens += tokens;
      slot.count += 1;
      hourlyMap.set(hourStart, slot);
    }
    const hourlyUSD = Array.from(hourlyMap.entries())
      .map(([hourStartIso, v]) => ({ hourStartIso, ...v }))
      .sort((a, b) => a.hourStartIso.localeCompare(b.hourStartIso));
    return {
      ok: true,
      asOf: now.toISOString(),
      windowHours,
      daily,
      weekly,
      perTentacle,
      hourlyUSD,
      truncatedTailLines: telem.truncatedTailLines,
      source: "cost.aggregate",
    };
  } catch (e) {
    return {
      ok: false,
      asOf: new Date(opts?.now ?? new Date()).toISOString(),
      windowHours: opts?.windowHours ?? 24,
      daily: null,
      weekly: null,
      perTentacle: {},
      hourlyUSD: [],
      truncatedTailLines: 0,
      source: "cost.aggregate",
      warning: (e as Error).message,
    };
  }
}

/**
 * Single-page dashboard. Vanilla HTML + inline JS + inline SVG charts —
 * no CDN deps. Same-origin only — relative fetch to ./aggregate. The inline
 * JS uses replaceChildren() / textContent for all DOM updates (no innerHTML
 * sinks; XSS-safe).
 */
export const COST_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PRISM Cost Dashboard</title>
<style>
  :root { --bg:#0e1116; --fg:#d6deeb; --accent:#82aaff; --warn:#ffcb6b; --err:#f78c6c; --grid:#222831; }
  * { box-sizing:border-box; }
  body { margin:0; padding:1.5rem; background:var(--bg); color:var(--fg); font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif; }
  h1 { font-size:1.4rem; margin:0 0 0.5rem; }
  h2 { font-size:1.05rem; margin:1.4rem 0 0.4rem; color:var(--accent); border-bottom:1px solid var(--grid); padding-bottom:0.3rem; }
  .meta { color:#8a96b5; font-size:0.9rem; margin-bottom:1rem; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; }
  .card { background:#15191f; border:1px solid var(--grid); border-radius:6px; padding:1rem; }
  .stat { display:flex; flex-direction:column; }
  .stat .label { color:#8a96b5; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em; }
  .stat .value { font-size:1.8rem; font-weight:600; color:var(--accent); }
  table { width:100%; border-collapse:collapse; font-size:0.9rem; }
  th, td { text-align:left; padding:0.4rem 0.6rem; border-bottom:1px solid var(--grid); }
  th { color:#8a96b5; font-weight:500; text-transform:uppercase; font-size:0.8rem; letter-spacing:0.05em; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .warn-banner { background:rgba(255,203,107,0.12); border-left:3px solid var(--warn); padding:0.6rem 0.8rem; margin-bottom:1rem; }
  .err-banner { background:rgba(247,140,108,0.15); border-left:3px solid var(--err); padding:0.6rem 0.8rem; margin-bottom:1rem; }
  svg { display:block; width:100%; height:120px; }
  svg .bar { fill:var(--accent); }
  svg .bar:hover { fill:#c792ea; }
  svg .axis { stroke:#3a4453; stroke-width:1; }
  svg text { fill:#8a96b5; font-size:10px; }
</style>
</head>
<body>
<h1>PRISM Cost Dashboard <small style="font-size:0.7em;color:#8a96b5;">- COST-CASCADE-MS0</small></h1>
<div class="meta" id="meta">loading...</div>
<div id="banner"></div>

<div class="grid">
  <div class="card stat"><div class="label">Daily USD (24h)</div><div class="value" id="dailyUsd">-</div></div>
  <div class="card stat"><div class="label">Weekly USD (7d)</div><div class="value" id="weeklyUsd">-</div></div>
  <div class="card stat"><div class="label">Daily Tokens</div><div class="value" id="dailyTokens">-</div></div>
  <div class="card stat"><div class="label">Records (24h)</div><div class="value" id="recordCount">-</div></div>
</div>

<h2>Hourly USD (24h)</h2>
<div class="card"><svg id="hourlyChart" viewBox="0 0 800 120" preserveAspectRatio="none"></svg></div>

<h2>Per-Tentacle (24h)</h2>
<div class="card"><table id="tentacleTable"><thead><tr><th>Tentacle</th><th class="num">USD</th><th class="num">Tokens</th><th class="num">Calls</th></tr></thead><tbody></tbody></table></div>

<h2>Per-Task-Class (24h)</h2>
<div class="card"><table id="taskClassTable"><thead><tr><th>Task Class</th><th class="num">USD</th><th class="num">Tokens</th><th class="num">Calls</th></tr></thead><tbody></tbody></table></div>

<script>
(function() {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function fmtUsd(n){return '$'+(n||0).toFixed(2);}
  function fmtNum(n){return (Math.round(n||0)).toLocaleString('en-US');}
  function el(id){return document.getElementById(id);}
  function mkTd(text, isNum){var td=document.createElement('td');td.textContent=text;if(isNum)td.className='num';return td;}
  function row(cells){var tr=document.createElement('tr');cells.forEach(function(c){tr.appendChild(mkTd(c.t, !!c.num));});return tr;}
  function emptyRow(colspan, msg){var tr=document.createElement('tr');var td=document.createElement('td');td.colSpan=colspan;td.style.color='#8a96b5';td.textContent=msg;tr.appendChild(td);return tr;}
  function setBanner(level, msg){
    var holder=el('banner');holder.replaceChildren();
    var div=document.createElement('div');div.className=(level==='err'?'err-banner':'warn-banner');div.textContent=msg;holder.appendChild(div);
  }
  function clearBanner(){el('banner').replaceChildren();}
  function renderHourly(data){
    var svg=el('hourlyChart');svg.replaceChildren();
    var W=800,H=120,P=16,bars=data||[];
    if(!bars.length){
      var t=document.createElementNS(SVG_NS,'text');t.setAttribute('x','400');t.setAttribute('y','60');t.setAttribute('text-anchor','middle');t.textContent='no data';svg.appendChild(t);return;
    }
    var max=Math.max.apply(null,bars.map(function(b){return b.usd;}).concat([0.01]));
    var bw=(W-2*P)/bars.length;
    bars.forEach(function(b,i){
      var h=(H-2*P)*(b.usd/max);
      var rect=document.createElementNS(SVG_NS,'rect');
      rect.setAttribute('class','bar');
      rect.setAttribute('x',String(P+i*bw));
      rect.setAttribute('y',String(H-P-h));
      rect.setAttribute('width',String(Math.max(1,bw-2)));
      rect.setAttribute('height',String(h));
      var title=document.createElementNS(SVG_NS,'title');
      title.textContent=b.hourStartIso+'  '+fmtUsd(b.usd)+'  '+fmtNum(b.tokens)+' tok';
      rect.appendChild(title);
      svg.appendChild(rect);
    });
    var ax=document.createElementNS(SVG_NS,'line');
    ax.setAttribute('class','axis');ax.setAttribute('x1',String(P));ax.setAttribute('y1',String(H-P));ax.setAttribute('x2',String(W-P));ax.setAttribute('y2',String(H-P));
    svg.appendChild(ax);
  }
  function renderTable(bodyEl, entries){
    bodyEl.replaceChildren();
    if(!entries.length){bodyEl.appendChild(emptyRow(4,'no records in window'));return;}
    entries.forEach(function(e){bodyEl.appendChild(row([{t:e[0]},{t:fmtUsd(e[1].usd),num:1},{t:fmtNum(e[1].tokens),num:1},{t:fmtNum(e[1].count),num:1}]));});
  }
  function load(){
    fetch('./aggregate?windowHours=24').then(function(r){return r.json();}).then(function(d){
      el('meta').textContent='as of '+d.asOf+' - window '+d.windowHours+'h - truncatedTailLines='+d.truncatedTailLines;
      clearBanner();
      if(d.warning){setBanner('err','aggregator warning: '+d.warning);}
      else if(d.truncatedTailLines>0){setBanner('warn',d.truncatedTailLines+' corrupt JSONL line(s) skipped (telemetry tail race).');}
      el('dailyUsd').textContent=fmtUsd(d.daily&&d.daily.totalUSD);
      el('weeklyUsd').textContent=fmtUsd(d.weekly&&d.weekly.totalUSD);
      el('dailyTokens').textContent=fmtNum(d.daily&&d.daily.totalTokens);
      el('recordCount').textContent=fmtNum(d.daily&&d.daily.recordCount);
      renderHourly(d.hourlyUSD);
      var tentEntries=Object.entries(d.perTentacle||{}).sort(function(a,b){return b[1].usd-a[1].usd;});
      renderTable(document.querySelector('#tentacleTable tbody'), tentEntries);
      var clsEntries=Object.entries((d.daily&&d.daily.perTaskClass)||{}).sort(function(a,b){return b[1].usd-a[1].usd;});
      renderTable(document.querySelector('#taskClassTable tbody'), clsEntries);
    }).catch(function(err){
      el('meta').textContent='aggregate fetch FAILED';
      setBanner('err','fetch error: '+err.message);
    });
  }
  load();
  setInterval(load, 60000);
})();
</script>
</body>
</html>`;

/** Creates cost router.
 * @param callTool - call tool
 * @returns router
 */
export function createCostRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/cost/estimate — Per-part cost estimation
  router.post("/estimate", async (req, res, next) => {
    try {
      // U-COST-EST-REQ-BRIDGE: the CostEstimatorPage posts a FLAT { operation, quantity, ... } shape that
      // does NOT match process_cost's { operations: [...], batch_size } schema -> map it at the boundary
      // BEFORE the dispatcher Zod-rejects it. Non-page callers (native operations[] shape) pass through
      // untouched. This is the request-side sibling of adaptCostEstimate (the response-side T-COSTPAGE-SHAPE).
      const bridged = adaptCostEstimateRequest(req.body);
      const result = await callTool("prism_intelligence", "process_cost", bridged);
      // U-COST-ROUTE-REDACT: process_cost is PURE internal cost basis (total/machine/tool/setup cost +
      // inputs.machine_rate_per_hour, breakdown). Mounted under /api optionalToken (never rejects anon),
      // so an unauthenticated caller would get the full shop cost stack. Strip it when anon (req.userId
      // unset); an authenticated caller gets the full breakdown. Process metrics (cycle/tool-life) survive.
      // ORDER (T-COSTPAGE-SHAPE): REDACT first, ADAPT second. For anon the redactor removes
      // total_cost_per_part etc., so adaptCostEstimate sees no per-part number and passes through
      // (no fabricated FE cost keys -> no leak, secure-by-default empty panel). For an authed caller no
      // redaction runs, so the adapter maps the engine shape to the FE CostEstimate contract the page
      // derefs (per_part_cost / total_cost / breakdown{machine,tooling,setup}).
      const redacted = !req.userId ? redactInternalMarginFields(result) : result;
      const safe = adaptCostEstimate(redacted);
      res.json({ result: safe });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cost/quote — Generate customer quote
  router.post("/quote", async (req, res, next) => {
    try {
      const result = await callTool("prism_intelligence", "shop_quote", req.body);
      // U-COST-ROUTE-REDACT: shop_quote returns the customer `pricing` (survives) PLUS the internal
      // `cost_breakdown` block AND a $/hr rate inlined into `notes[0]`. When anon (req.userId unset),
      // empty cost_breakdown (redactInternalMarginFields) AND scrub the rate-string from notes
      // (redactShopQuoteNotes); customer pricing + lead-time + volume-discount notes are preserved.
      const safe = !req.userId
        ? redactShopQuoteNotes(redactInternalMarginFields(result))
        : result;
      res.json({ result: safe });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cost/compare -> 501 (U-FE-COST-ACTION-FIX, slot:sierra). There is NO cost_compare
  // action on prism_intelligence (601 actions) -> the prior call hit z.enum reject -> silent HTTP
  // 200 + {error}. The nearest candidate, prism_intelligence:shop_compare, REQUIRES a specific
  // { scenarios: [...] } payload AND this endpoint has no live SPA caller committing a body shape
  // (costApi.compare body is typed `unknown`; only useCostCompare wraps it, no page sends a payload).
  // Mapping it would re-create the silent footgun the moment a caller sends a non-scenarios shape
  // (shop_compare is not in ACTION_INTELLIGENCE_SCHEMAS, so the dispatcher would pass undefined
  // scenarios straight to the engine). Fail loud + name the candidate rather than fake the contract (R12).
  router.post("/compare", (_req, res) => {
    res.status(501).json({
      message: "cost compare not yet wired -- no cost_compare action exists; candidate prism_intelligence:shop_compare needs a { scenarios: [...] } payload. Build a cost_compare action or have the SPA commit to the shop_compare scenarios shape.",
      error: "not_implemented",
    });
  });

  // GET /api/v1/cost/history/:jobId -> 501 (U-FE-COST-ACTION-FIX, slot:sierra). There is NO
  // cost_history action -> the prior call was a silent 200 + {error}. The nearest candidate,
  // prism_intelligence:erp_cost_history, IGNORES any wo_number/job id and returns GLOBAL cost-feedback
  // history (ERPIntegrationEngine.ts:567 returns the whole costFeedback array unfiltered). Wiring it to
  // a :jobId route would silently drop the job filter and feed the SPA every job's data under one job's
  // view -- a 200 + wrong-scope footgun. Fail loud until a job-scoped cost-history action exists (R12).
  router.get("/history/:jobId", (_req, res) => {
    res.status(501).json({
      message: "per-job cost history not yet wired -- no job-scoped cost_history action exists; erp_cost_history returns GLOBAL cost-feedback (ignores jobId). Add a job-scoped cost-history action to enable this endpoint.",
      error: "not_implemented",
    });
  });

  // GET /api/v1/cost/aggregate — COST-CASCADE-MS0/U-COST-DASHBOARD JSON feed
  router.get("/aggregate", (req, res) => {
    const windowHours = typeof req.query.windowHours === "string" ? Number(req.query.windowHours) : 24;
    const result = buildCostAggregate({ windowHours });
    if (!result.ok) {
      res.status(503).json(result);
      return;
    }
    res.json(result);
  });

  // GET /api/v1/cost/dashboard — COST-CASCADE-MS0/U-COST-DASHBOARD HTML
  router.get("/dashboard", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(COST_DASHBOARD_HTML);
  });

  return router;
}
