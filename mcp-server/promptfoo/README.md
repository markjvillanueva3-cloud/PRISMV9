# PRISM MCP Server — promptfoo Evaluation Suite

This directory contains promptfoo configurations for testing PRISM's MCP server
across two dimensions: **security (red team)** and **routing accuracy (evals)**.

## Prerequisites

```bash
# Install promptfoo globally (one-time)
npm install -g promptfoo

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...   # Linux/macOS
$env:ANTHROPIC_API_KEY = "sk-ant-..." # PowerShell
set ANTHROPIC_API_KEY=sk-ant-...      # Windows CMD
```

---

## Suite 1: Dispatcher Routing Evaluation

Verifies the LLM correctly identifies the right PRISM dispatcher action and
extracts parameters from 30 canonical machinist queries across 8 action domains.

**Target:** ≥90% pass rate (27/30 tests)

### Run

```bash
# From this directory
npx promptfoo eval --config routing.yaml

# From anywhere (full path)
npx promptfoo eval --config C:/PRISM/mcp-server/promptfoo/routing.yaml

# View results in browser UI
npx promptfoo view
```

### Covered Actions

| Action | Description | # Tests |
|--------|-------------|---------|
| `sf_orchestrate` / `sf_quick` | Speed & feed calculation (SFO 67-point hub) | 3 |
| `kienzle_force` | Kienzle cutting force model (12 ISO materials) | 2 |
| `cnc_simulate` / `cnc_simulate_physics` / `cnc_simulate_predictive` | CNC simulation pipeline | 3 |
| `playbook_query` | 296-rule machining playbook | 3 |
| `quote_estimate` | Physics-backed job quoting | 2 |
| `tool_catalog_search` / `tool_unified_search` | 95,608-tool catalog search | 3 |
| `feasibility_full_analysis` / `feasibility_quick_check` | Part machining feasibility | 3 |
| `post_process` / `post_verify` | G-code post-processing (20 controller dialects) | 3 |
| `stability_lobe_diagram` | Chatter-free RPM calculation | 1 |
| `material_lookup` | Material properties DB (2,957 materials) | 1 |
| `gdt_stackup` | GD&T tolerance stackup | 1 |
| `process_capability_predict` | Cpk prediction | 1 |
| `coolant_strategy_select` | Coolant strategy recommendation | 1 |
| `machine_match` | Machine selection (910 machines) | 1 |
| `tool_wear_compensate` | Wear compensation offset | 1 |

---

## Suite 2: MCP Security Red Team

Adversarial probing for prompt injection, data leakage, unsafe advice,
SQL injection, SSRF, and jailbreak vulnerabilities in the MCP server.

### Run

```bash
# Red team eval (uses manual test cases in redteam.yaml)
npx promptfoo eval --config redteam.yaml

# Full automated red team generation (requires API key, generates 25 adversarial tests)
npx promptfoo redteam run --config redteam.yaml

# Initialize interactive red team setup (alternative)
npx promptfoo redteam init
```

### Security Plugins Configured

| Plugin | What it tests |
|--------|--------------|
| `prompt-extraction` | Attempts to leak system prompt / routing logic |
| `indirect-prompt-injection` | Injection via G-code comments, tool descriptions |
| `harmful:privacy` | Leaking other users' tool libraries or personal data |
| `tool-discovery` | Enumeration of internal dispatcher actions |
| `sql-injection` | Injection via material name / tool catalog query fields |
| `harmful:unsafe-practices` | Requesting unsafe machining speeds/feeds |
| `hallucination` | Accepting fabricated material properties |
| `ssrf` | SSRF via post-processor API (port 18361) |
| `xss` | XSS through G-code or part description fields |

### Strategies

- `jailbreak` — Multi-turn role-play to bypass machining safety limits
- `prompt-injection` — Injected via "uploaded file" or tool description
- `jailbreak:tree` — Escalating privilege chain attacks

---

## Combined Run (Both Suites)

```bash
# Run the default combined config (routing tests only — faster)
npx promptfoo eval

# Run both sequentially
npx promptfoo eval --config routing.yaml && npx promptfoo eval --config redteam.yaml
```

---

## Output & Reporting

```bash
# View results in browser (localhost:15500)
npx promptfoo view

# Export results to JSON
npx promptfoo eval --config routing.yaml --output results.json

# Export results to CSV
npx promptfoo eval --config routing.yaml --output results.csv

# Compare two runs
npx promptfoo eval --config routing.yaml --output run1.json
# (make changes)
npx promptfoo eval --config routing.yaml --output run2.json
npx promptfoo diff run1.json run2.json
```

---

## CI/CD Integration

Add to your CI pipeline (`package.json` script or GitHub Actions):

```bash
# Fail build if routing accuracy drops below 90%
npx promptfoo eval --config routing.yaml --no-progress-bar
```

```yaml
# .github/workflows/promptfoo.yml
- name: Run PRISM routing evals
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: npx promptfoo eval --config mcp-server/promptfoo/routing.yaml --no-progress-bar
```

---

## File Structure

```
promptfoo/
├── README.md               # This file
├── promptfooconfig.yaml    # Default config (30 routing tests, combined entry point)
├── routing.yaml            # Standalone routing evaluation (30 tests, JSON assertions)
└── redteam.yaml            # Security red team config (10 manual + 25 auto-generated)
```

---

## Troubleshooting

**"ANTHROPIC_API_KEY not set"** — Export the key as shown in Prerequisites.

**JSON parse failures in routing tests** — The model may not be returning valid JSON.
Increase `max_tokens` or adjust the system prompt in `routing.yaml`.

**Red team tests timing out** — Red team generation calls the API multiple times.
Use `--timeout 60000` flag or reduce `numTests` in `redteam.yaml`.

**"promptfoo: command not found"** — Run `npm install -g promptfoo` or use `npx promptfoo`.
