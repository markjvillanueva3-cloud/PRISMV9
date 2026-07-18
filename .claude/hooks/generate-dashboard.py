#!/usr/bin/env python3
"""
Generate self-contained dashboard HTML with embedded JSON data.
Runs health-scanner.py, then injects dashboard.json into the HTML template.

Usage: python3 generate-dashboard.py
Output: ~/Desktop/claude-dashboard.html (self-contained, no fetch needed)
"""

import json, sys, os
from pathlib import Path

CLAUDE_DIR = Path.home() / ".claude"
DESKTOP = Path.home() / "Desktop"
DASHBOARD_JSON = CLAUDE_DIR / "dashboard.json"
TEMPLATE_HTML = DESKTOP / "claude-dashboard.html"
OUTPUT_HTML = DESKTOP / "claude-dashboard.html"

# First run health scanner to get fresh data
scanner_path = CLAUDE_DIR / "hooks" / "health-scanner.py"
if scanner_path.exists():
    import subprocess
    subprocess.run([sys.executable, str(scanner_path)], capture_output=True, timeout=15)

# Also run architecture scanner to keep ARCHITECTURE.json fresh
arch_scanner = CLAUDE_DIR / "hooks" / "architecture-scanner.py"
if arch_scanner.exists():
    subprocess.run([sys.executable, str(arch_scanner)], capture_output=True, timeout=15)

# Load dashboard data
try:
    data = json.loads(DASHBOARD_JSON.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as e:
    print(f"Error reading dashboard.json: {e}", file=sys.stderr)
    sys.exit(1)

# Load architecture data for system map
arch_data = {}
arch_file = CLAUDE_DIR / "ARCHITECTURE.json"
if arch_file.exists():
    try:
        arch_data = json.loads(arch_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        pass

system_map_lines = arch_data.get("system_map", {}).get("ascii", [])
perf_data = arch_data.get("performance", {})

# Embed data as JSON in script tag
data_json = json.dumps(data, ensure_ascii=True)
arch_json = json.dumps({"system_map": system_map_lines, "performance": perf_data}, ensure_ascii=True)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claude Code System Dashboard</title>
<style>
  :root {{
    --bg: #0a0e17; --surface: #111827; --border: #1e293b;
    --text: #e2e8f0; --muted: #64748b; --accent: #3b82f6;
    --green: #22c55e; --yellow: #eab308; --red: #ef4444; --gray: #475569;
    --green-bg: #052e16; --yellow-bg: #422006; --red-bg: #450a0a; --gray-bg: #1e293b;
  }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg); color: var(--text);
    min-height: 100vh; padding: 24px;
  }}
  .header {{
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px; padding: 20px 24px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  }}
  .header h1 {{ font-size: 22px; font-weight: 600; letter-spacing: -0.5px; }}
  .header h1 span {{ color: var(--accent); }}
  .header-meta {{ text-align: right; color: var(--muted); font-size: 13px; }}
  .health-badge {{
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 15px;
  }}
  .health-badge.good {{ background: var(--green-bg); color: var(--green); }}
  .health-badge.warn {{ background: var(--yellow-bg); color: var(--yellow); }}
  .health-badge.bad {{ background: var(--red-bg); color: var(--red); }}
  .summary {{ display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }}
  .stat-card {{
    flex: 1; min-width: 120px; padding: 16px 20px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px; text-align: center;
  }}
  .stat-card .num {{ font-size: 28px; font-weight: 700; }}
  .stat-card .label {{ font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }}
  .stat-card.ok .num {{ color: var(--green); }}
  .stat-card.warn .num {{ color: var(--yellow); }}
  .stat-card.error .num {{ color: var(--red); }}
  .stat-card.disabled .num {{ color: var(--gray); }}
  .stat-card.total .num {{ color: var(--accent); }}
  .section {{
    margin-bottom: 20px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  }}
  .section-header {{
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; cursor: pointer; user-select: none;
    background: rgba(255,255,255,0.02);
  }}
  .section-header:hover {{ background: rgba(255,255,255,0.04); }}
  .section-header h2 {{ font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 10px; }}
  .section-header .count {{
    font-size: 12px; color: var(--muted); background: var(--bg);
    padding: 2px 10px; border-radius: 10px;
  }}
  .section-header .chevron {{ color: var(--muted); transition: transform 0.2s; font-size: 12px; }}
  .section-header.collapsed .chevron {{ transform: rotate(-90deg); }}
  .section-body {{ padding: 0; }}
  .section-body.hidden {{ display: none; }}
  .comp-row {{
    display: flex; align-items: center; padding: 10px 20px;
    border-top: 1px solid var(--border); gap: 12px; font-size: 14px;
    position: relative;
  }}
  .comp-row:hover {{ background: rgba(255,255,255,0.02); }}
  .light {{
    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    box-shadow: 0 0 6px currentColor;
  }}
  .light.ok {{ background: var(--green); color: var(--green); }}
  .light.warn {{ background: var(--yellow); color: var(--yellow); }}
  .light.error {{ background: var(--red); color: var(--red); animation: pulse-red 1.5s infinite; }}
  .light.disabled {{ background: var(--gray); color: var(--gray); box-shadow: none; }}
  @keyframes pulse-red {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: 0.4; }} }}
  .comp-name {{ flex: 1; font-weight: 500; font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 13px; }}
  .comp-detail {{ color: var(--muted); font-size: 12px; max-width: 400px; text-align: right; }}
  .comp-type {{
    font-size: 11px; color: var(--muted); background: var(--bg);
    padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;
  }}
  .checks-tooltip {{
    display: none; position: absolute; right: 24px; top: 100%;
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 14px; font-size: 12px; z-index: 100; min-width: 250px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }}
  .comp-row:hover .checks-tooltip {{ display: block; }}
  .check-line {{ display: flex; align-items: center; gap: 6px; padding: 2px 0; }}
  .check-icon {{ font-size: 11px; }}
  .check-icon.pass {{ color: var(--green); }}
  .check-icon.fail {{ color: var(--red); }}
  .system-map {{
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px; font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 11px; line-height: 1.5; overflow-x: auto; white-space: pre;
    color: var(--muted); margin: 0 20px 16px;
  }}
  .perf-list {{ padding: 8px 20px 16px; }}
  .perf-item {{ display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }}
  .perf-dot {{ width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }}
  .footer {{
    margin-top: 20px; text-align: center; color: var(--muted); font-size: 12px; padding: 12px;
  }}
  .tab-bar {{
    display: flex; gap: 0; margin-bottom: 24px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
    overflow: hidden;
  }}
  .tab {{
    flex: 1; padding: 12px; text-align: center; cursor: pointer;
    font-size: 14px; font-weight: 500; color: var(--muted);
    border-right: 1px solid var(--border); transition: all 0.2s;
  }}
  .tab:last-child {{ border-right: none; }}
  .tab:hover {{ background: rgba(255,255,255,0.04); }}
  .tab.active {{ color: var(--accent); background: rgba(59,130,246,0.1); }}
  .tab-content {{ display: none; }}
  .tab-content.active {{ display: block; }}
</style>
</head>
<body>

<div class="header">
  <div>
    <h1><span>Claude Code</span> System Dashboard</h1>
    <div class="header-meta"><span id="timestamp"></span></div>
  </div>
  <div style="display:flex;align-items:center;gap:16px;">
    <div class="health-badge" id="health-badge">--</div>
  </div>
</div>

<div class="tab-bar">
  <div class="tab active" data-tab="health">Health Status</div>
  <div class="tab" data-tab="map">System Map</div>
  <div class="tab" data-tab="perf">Performance</div>
</div>

<div id="tab-health" class="tab-content active">
  <div class="summary" id="summary"></div>
  <div id="sections"></div>
</div>

<div id="tab-map" class="tab-content">
  <div class="section">
    <div class="section-header"><h2>System Architecture Map</h2></div>
    <div class="system-map" id="system-map"></div>
  </div>
</div>

<div id="tab-perf" class="tab-content">
  <div class="section">
    <div class="section-header"><h2>Performance Optimizations</h2></div>
    <div class="perf-list" id="perf-list"></div>
  </div>
</div>

<div class="footer">
  Regenerate: <code>python3 ~/.claude/hooks/generate-dashboard.py</code>
  &mdash; Auto-updates when hooks/rules/settings change
</div>

<script>
const DASHBOARD_DATA = {data_json};
const ARCH_DATA = {arch_json};

const TYPES_ORDER = ['hook', 'shared_lib', 'config', 'hookify_rule', 'plugin', 'memory', 'git'];
const TYPE_LABELS = {{
  hook: 'Hooks', shared_lib: 'Shared Libraries', config: 'Configuration',
  hookify_rule: 'Hookify Rules', plugin: 'Plugins', memory: 'Memory Files', git: 'Git Repository'
}};
const TYPE_ICONS = {{
  hook: '\\u2699\\uFE0F', shared_lib: '\\uD83D\\uDCDA', config: '\\uD83D\\uDD27',
  hookify_rule: '\\uD83D\\uDEE1\\uFE0F', plugin: '\\uD83E\\uDDE9', memory: '\\uD83D\\uDCBE', git: '\\uD83D\\uDD00'
}};

function ce(tag, attrs, children) {{
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {{
    if (k === 'className') el.className = v;
    else if (k === 'textContent') el.textContent = v;
    else if (k === 'style') el.setAttribute('style', v);
    else el.setAttribute(k, v);
  }}
  if (children) {{
    if (typeof children === 'string') el.textContent = children;
    else if (Array.isArray(children)) children.forEach(c => {{ if (c) el.appendChild(c); }});
    else el.appendChild(children);
  }}
  return el;
}}

// Tabs
document.querySelectorAll('.tab').forEach(tab => {{
  tab.addEventListener('click', function() {{
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('tab-' + this.dataset.tab).classList.add('active');
  }});
}});

function buildSummary(s) {{
  const container = document.getElementById('summary');
  container.replaceChildren();
  [
    {{cls: 'total', num: s.total, label: 'Total'}},
    {{cls: 'ok', num: s.ok, label: 'Healthy'}},
    {{cls: 'warn', num: s.warn, label: 'Warnings'}},
    {{cls: 'error', num: s.error, label: 'Errors'}},
    {{cls: 'disabled', num: s.disabled, label: 'Disabled'}},
  ].forEach(c => {{
    const card = ce('div', {{className: 'stat-card ' + c.cls}});
    card.appendChild(ce('div', {{className: 'num', textContent: String(c.num)}}));
    card.appendChild(ce('div', {{className: 'label', textContent: c.label}}));
    container.appendChild(card);
  }});
}}

function buildSection(type, items) {{
  const errCount = items.filter(i => i.status === 'error').length;
  const warnCount = items.filter(i => i.status === 'warn').length;
  const label = TYPE_LABELS[type] || type;
  const icon = TYPE_ICONS[type] || '';
  const sectionStatus = errCount > 0 ? 'error' : warnCount > 0 ? 'warn' : 'ok';

  const section = ce('div', {{className: 'section'}});
  const header = ce('div', {{className: 'section-header'}});
  const h2 = ce('h2');
  h2.appendChild(ce('span', {{className: 'light ' + sectionStatus}}));
  h2.appendChild(document.createTextNode(' ' + icon + ' ' + label + ' '));
  h2.appendChild(ce('span', {{className: 'count', textContent: String(items.length)}}));
  header.appendChild(h2);
  header.appendChild(ce('span', {{className: 'chevron', textContent: '\\u25BC'}}));

  const body = ce('div', {{className: 'section-body'}});
  header.addEventListener('click', function() {{
    this.classList.toggle('collapsed');
    body.classList.toggle('hidden');
  }});
  section.appendChild(header);

  const order = {{error: 0, warn: 1, ok: 2, disabled: 3}};
  items.sort((a, b) => (order[a.status] || 9) - (order[b.status] || 9));

  for (const comp of items) {{
    const row = ce('div', {{className: 'comp-row'}});
    row.appendChild(ce('span', {{className: 'light ' + comp.status}}));
    row.appendChild(ce('span', {{className: 'comp-name', textContent: comp.name}}));
    if (comp.file) row.appendChild(ce('span', {{className: 'comp-type', textContent: comp.file}}));
    const detail = (comp.checks || []).map(c => c.detail).filter(d => d && d.length < 60).join(' | ');
    row.appendChild(ce('span', {{className: 'comp-detail', textContent: detail.substring(0, 80)}}));

    if (comp.checks && comp.checks.length > 0) {{
      const tooltip = ce('div', {{className: 'checks-tooltip'}});
      for (const ch of comp.checks) {{
        const line = ce('div', {{className: 'check-line'}});
        line.appendChild(ce('span', {{
          className: 'check-icon ' + (ch.pass ? 'pass' : 'fail'),
          textContent: ch.pass ? '\\u2713' : '\\u2717'
        }}));
        line.appendChild(ce('strong', {{textContent: ch.check + ': '}}));
        line.appendChild(document.createTextNode(ch.detail));
        tooltip.appendChild(line);
      }}
      row.appendChild(tooltip);
    }}
    body.appendChild(row);
  }}

  section.appendChild(body);
  return section;
}}

function render() {{
  const data = DASHBOARD_DATA;
  const s = data.summary;

  document.getElementById('timestamp').textContent = 'Last scan: ' + data.generated;
  const badge = document.getElementById('health-badge');
  badge.textContent = s.health_pct + '% Healthy';
  badge.className = 'health-badge ' + (s.health_pct >= 95 ? 'good' : s.health_pct >= 80 ? 'warn' : 'bad');

  buildSummary(s);

  const groups = {{}};
  for (const comp of data.components) {{
    if (!groups[comp.type]) groups[comp.type] = [];
    groups[comp.type].push(comp);
  }}

  const sectionsEl = document.getElementById('sections');
  sectionsEl.replaceChildren();
  for (const type of TYPES_ORDER) {{
    if (!groups[type]) continue;
    sectionsEl.appendChild(buildSection(type, groups[type]));
  }}

  // System map
  const mapEl = document.getElementById('system-map');
  if (ARCH_DATA.system_map && ARCH_DATA.system_map.length > 0) {{
    mapEl.textContent = ARCH_DATA.system_map.join('\\n');
  }} else {{
    mapEl.textContent = 'No system map available. Run: python3 ~/.claude/hooks/architecture-scanner.py';
  }}

  // Performance
  const perfEl = document.getElementById('perf-list');
  perfEl.replaceChildren();
  const opts = (ARCH_DATA.performance || {{}}).optimizations_applied || [];
  for (const opt of opts) {{
    const item = ce('div', {{className: 'perf-item'}});
    item.appendChild(ce('span', {{className: 'perf-dot'}}));
    item.appendChild(ce('span', {{textContent: opt}}));
    perfEl.appendChild(item);
  }}
}}

render();
</script>
</body>
</html>"""

OUTPUT_HTML.write_text(html, encoding="utf-8")
s = data["summary"]
print(f"Dashboard generated: {OUTPUT_HTML}")
print(f"Health: {s['health_pct']}% ({s['ok']} ok, {s['warn']} warn, {s['error']} error, {s['disabled']} disabled)")
