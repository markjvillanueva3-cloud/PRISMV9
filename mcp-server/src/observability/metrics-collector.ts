/**
 * MetricsCollector — in-process MCP request telemetry (OBSERVABILITY-MS0, slot:bravo 2026-05-30).
 *
 * WHY: chats "disconnecting" from the MCP server was invisible until processes were
 * hand-counted. This makes the contention class measurable — per-tool call counts,
 * latency percentiles (p50/p95/p99), error counts, live + peak concurrency, and a
 * rolling RSS ring. Surfaced via the existing GET /metrics (Prometheus) + ?format=json.
 *
 * DESIGN: bounded memory (per-tool latency reservoir capped; tool cardinality capped;
 * RSS ring capped) and NEVER throws — instrumentation must never break the hot path.
 * Zero PRISM imports → unit-testable in isolation. Singleton export `metrics`.
 */

const LAT_RESERVOIR_CAP = 256; // per-tool last-N latencies (bounded memory)
const RSS_RING_CAP = 240; // ~2h of history at the 30s opportunistic sample cadence
const MAX_TOOLS = 512; // cardinality guard (there are ~90 dispatchers; allow headroom)
const RSS_SAMPLE_INTERVAL_MS = 30_000;

interface ToolStat {
  count: number;
  errors: number;
  lat: number[];
  lastMs: number;
}

export interface ToolSnapshot {
  tool: string;
  count: number;
  errors: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  lastMs: number;
}

export interface MetricsSnapshot {
  uptimeSec: number;
  totalCalls: number;
  totalErrors: number;
  inflight: number;
  peakInflight: number;
  methods: Record<string, number>;
  rss: { last: number; max: number; samples: number };
  tools: ToolSnapshot[];
}

export class MetricsCollector {
  private tools = new Map<string, ToolStat>();
  private methods = new Map<string, number>();
  private rssRing: number[] = [];
  private startedAt = Date.now();
  private lastRssSampleAt = 0;
  inflight = 0;
  peakInflight = 0;
  totalCalls = 0;
  totalErrors = 0;

  incInflight(): void {
    this.inflight++;
    if (this.inflight > this.peakInflight) this.peakInflight = this.inflight;
  }

  decInflight(): void {
    if (this.inflight > 0) this.inflight--;
  }

  recordMethod(method: string): void {
    try {
      if (typeof method !== "string" || method.length === 0) return;
      this.methods.set(method, (this.methods.get(method) || 0) + 1);
    } catch {
      /* never throw */
    }
  }

  /** Record one completed tool call. `durationMs` < 0 or non-finite is clamped to 0. */
  recordTool(tool: string, durationMs: number, ok: boolean): void {
    try {
      const name = typeof tool === "string" && tool.length > 0 ? tool : "(unknown)";
      let s = this.tools.get(name);
      if (!s) {
        if (this.tools.size >= MAX_TOOLS) return; // cardinality guard — drop new keys, keep existing accurate
        s = { count: 0, errors: 0, lat: [], lastMs: 0 };
        this.tools.set(name, s);
      }
      s.count++;
      this.totalCalls++;
      if (!ok) {
        s.errors++;
        this.totalErrors++;
      }
      const d = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
      s.lastMs = d;
      s.lat.push(d);
      if (s.lat.length > LAT_RESERVOIR_CAP) s.lat.shift();
      // Opportunistic, throttled RSS sampling — no timer needed (timers complicate
      // graceful shutdown). History only accrues while there is activity, which is
      // exactly when contention matters.
      const now = Date.now();
      if (now - this.lastRssSampleAt >= RSS_SAMPLE_INTERVAL_MS) {
        this.lastRssSampleAt = now;
        try {
          this.sampleRss(process.memoryUsage().rss);
        } catch {
          /* memoryUsage unavailable — ignore */
        }
      }
    } catch {
      /* never throw */
    }
  }

  sampleRss(rss: number): void {
    try {
      if (!Number.isFinite(rss) || rss < 0) return;
      this.rssRing.push(rss);
      if (this.rssRing.length > RSS_RING_CAP) this.rssRing.shift();
    } catch {
      /* never throw */
    }
  }

  private static pct(sorted: number[], q: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
    return sorted[idx];
  }

  snapshot(): MetricsSnapshot {
    const tools: ToolSnapshot[] = [];
    for (const [name, s] of this.tools) {
      const sorted = [...s.lat].sort((a, b) => a - b);
      tools.push({
        tool: name,
        count: s.count,
        errors: s.errors,
        errorRate: s.count > 0 ? s.errors / s.count : 0,
        p50: MetricsCollector.pct(sorted, 0.5),
        p95: MetricsCollector.pct(sorted, 0.95),
        p99: MetricsCollector.pct(sorted, 0.99),
        lastMs: s.lastMs,
      });
    }
    tools.sort((a, b) => b.count - a.count);
    const rssLast = this.rssRing.length ? this.rssRing[this.rssRing.length - 1] : 0;
    const rssMax = this.rssRing.length ? Math.max(...this.rssRing) : 0;
    return {
      uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
      totalCalls: this.totalCalls,
      totalErrors: this.totalErrors,
      inflight: this.inflight,
      peakInflight: this.peakInflight,
      methods: Object.fromEntries(this.methods),
      rss: { last: rssLast, max: rssMax, samples: this.rssRing.length },
      tools,
    };
  }

  /** Prometheus text exposition for the dynamic metrics (appended to the static /metrics block). */
  prometheus(): string {
    try {
      const snap = this.snapshot();
      const lines: string[] = [];
      lines.push("# HELP prism_tool_calls_total MCP tool call count by tool", "# TYPE prism_tool_calls_total counter");
      for (const t of snap.tools) lines.push(`prism_tool_calls_total{tool="${esc(t.tool)}"} ${t.count}`);
      lines.push("# HELP prism_tool_errors_total MCP tool error count by tool", "# TYPE prism_tool_errors_total counter");
      for (const t of snap.tools) lines.push(`prism_tool_errors_total{tool="${esc(t.tool)}"} ${t.errors}`);
      lines.push("# HELP prism_tool_duration_ms MCP tool latency percentiles (ms)", "# TYPE prism_tool_duration_ms gauge");
      for (const t of snap.tools) {
        lines.push(`prism_tool_duration_ms{tool="${esc(t.tool)}",quantile="0.5"} ${t.p50}`);
        lines.push(`prism_tool_duration_ms{tool="${esc(t.tool)}",quantile="0.95"} ${t.p95}`);
        lines.push(`prism_tool_duration_ms{tool="${esc(t.tool)}",quantile="0.99"} ${t.p99}`);
      }
      lines.push("# HELP prism_requests_total JSON-RPC requests by method", "# TYPE prism_requests_total counter");
      for (const [m, c] of Object.entries(snap.methods)) lines.push(`prism_requests_total{method="${esc(m)}"} ${c}`);
      lines.push(
        "# HELP prism_inflight Current in-flight MCP requests",
        "# TYPE prism_inflight gauge",
        `prism_inflight ${snap.inflight}`,
        "# HELP prism_inflight_peak Peak concurrent in-flight MCP requests",
        "# TYPE prism_inflight_peak gauge",
        `prism_inflight_peak ${snap.peakInflight}`,
        "# HELP prism_tool_calls_grand_total Total MCP tool calls since start",
        "# TYPE prism_tool_calls_grand_total counter",
        `prism_tool_calls_grand_total ${snap.totalCalls}`,
        "# HELP prism_rss_max_bytes Max RSS observed over the sampling window",
        "# TYPE prism_rss_max_bytes gauge",
        `prism_rss_max_bytes ${snap.rss.max}`,
      );
      return lines.join("\n");
    } catch {
      return "# prism dynamic metrics unavailable";
    }
  }
}

/** Escape a Prometheus label value (backslash, double-quote, newline). */
function esc(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

/**
 * Self-contained auto-refreshing HTML dashboard for GET /metrics/view.
 * The page JS builds the DOM with createElement + textContent ONLY (no innerHTML),
 * so client-controlled tool names cannot inject markup — XSS-safe by construction.
 */
export function metricsViewHtml(): string {
  return [
    "<!doctype html><html><head><meta charset=\"utf-8\"><title>PRISM MCP /metrics</title>",
    "<style>",
    "body{background:#0d1117;color:#c9d1d9;font:13px/1.5 ui-monospace,Consolas,monospace;margin:0;padding:16px}",
    "h1{font-size:16px;color:#58a6ff;margin:0 0 8px}",
    "#summary{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:10px;margin-bottom:8px;white-space:pre-wrap}",
    "#methods{color:#8b949e}",
    "table{border-collapse:collapse;width:100%;margin-top:10px}",
    "th,td{text-align:right;padding:4px 10px;border-bottom:1px solid #21262d}",
    "th{color:#8b949e;position:sticky;top:0;background:#0d1117}",
    "td:first-child,th:first-child{text-align:left}",
    "tr:hover td{background:#161b22}",
    ".err{color:#f85149}",
    "#meta{color:#8b949e;margin-top:10px;font-size:11px}",
    "</style></head><body>",
    "<h1>PRISM MCP &mdash; live /metrics</h1>",
    "<div id=\"summary\">loading&hellip;</div>",
    "<div>methods: <span id=\"methods\"></span></div>",
    "<table><thead><tr><th>tool</th><th>calls</th><th>errors</th><th>err%</th><th>p50ms</th><th>p95ms</th><th>p99ms</th><th>last</th></tr></thead><tbody id=\"tbody\"></tbody></table>",
    "<div id=\"meta\">auto-refresh 3s &middot; updated <span id=\"ts\">&mdash;</span> &middot; source GET /metrics?format=json</div>",
    "<script>",
    "function fmtMB(b){return Math.round((b||0)/1048576)+'MB';}",
    "function cell(text,cls){var td=document.createElement('td');td.textContent=text;if(cls)td.className=cls;return td;}",
    "async function refresh(){",
    " try{",
    "  var r=await fetch('/metrics?format=json'); var d=await r.json();",
    "  document.getElementById('summary').textContent='calls '+d.totalCalls+'   in-flight '+d.inflight+' (peak '+d.peakInflight+')   errors '+d.totalErrors+'   RSS '+fmtMB(d.rss.last)+' (max '+fmtMB(d.rss.max)+')   uptime '+d.uptimeSec+'s';",
    "  document.getElementById('methods').textContent=Object.entries(d.methods||{}).map(function(e){return e[0]+'='+e[1];}).join('   ')||'(none)';",
    "  var tb=document.getElementById('tbody'); tb.textContent='';",
    "  var tools=d.tools||[];",
    "  if(!tools.length){var tr0=document.createElement('tr');var td0=document.createElement('td');td0.colSpan=8;td0.textContent='no tool calls recorded yet';tr0.appendChild(td0);tb.appendChild(tr0);}",
    "  tools.forEach(function(t){",
    "   var tr=document.createElement('tr');",
    "   tr.appendChild(cell(t.tool));",
    "   tr.appendChild(cell(t.count));",
    "   tr.appendChild(cell(t.errors,t.errors>0?'err':''));",
    "   tr.appendChild(cell((t.errorRate*100).toFixed(1)+'%',t.errors>0?'err':''));",
    "   tr.appendChild(cell(t.p50));tr.appendChild(cell(t.p95));tr.appendChild(cell(t.p99));tr.appendChild(cell(t.lastMs));",
    "   tb.appendChild(tr);",
    "  });",
    "  document.getElementById('ts').textContent=new Date().toLocaleTimeString();",
    " }catch(e){ document.getElementById('summary').textContent='fetch error: '+e; }",
    "}",
    "refresh(); setInterval(refresh,3000);",
    "</script></body></html>",
  ].join("\n");
}

/** Process-wide singleton. */
export const metrics = new MetricsCollector();
