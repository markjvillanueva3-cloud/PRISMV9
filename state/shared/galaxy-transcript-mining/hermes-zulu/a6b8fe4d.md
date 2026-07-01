# hermes-zulu session a6b8fe4d (2026-06-10, 8.2MB, spine 78KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U‑ROUTE‑SAVINGS‑BAND‑GATE (+HARDEN)` – rate‑band gate on SessionStart banner, fleet‑global state file, 322 B/session saved.  
- `U‑INJECTION‑SURFACE‑CENSUS` – audit of all recurring injectors (55 SS + 59 UPS), knob coverage 71.9 %.  
- `U‑CENSUS‑KNOB‑ACCURACY` – self‑corrected detector, reduced false positives from 6→3 knobless context injectors.  
- `U‑KNOB‑CLOSE` – added disable knobs to the 3 real knobless injectors (slot‑domain‑awareness‑inject, auto‑consensus‑userprompt, chat‑state‑isolator).  
- `U‑INJECTION‑BYTES‑RANK` – wired byte measurement into census, produced top‑by‑bytes list (slot‑domain‑awareness‑inject 1461 B, etc.).  
- `injection‑knob‑enforce.mjs` – PreToolUse Write gate that hard‑blocks creation of knobless context injectors.  
- `U‑AWARENESS‑ASSESS` spec – first assessment and roadmap for PRISM awareness system.

**DECISIONS**  
- Use a fleet‑global state file (not sidecar) to avoid race conditions on banner gating.  
- Separate rate‑band logic from formatting to keep `formatBanner` byte‑identical.  
- Measure raw bytes first; fall back to bytes×fires only when fire data exists.  
- Dedup measurement must include session ID; otherwise overestimates steady‑state cost.  
- Convert advisory knobs list into a hard enforcement gate (PreToolUse Write) to prevent regression.  
- Keep all new tooling within existing PRISM toolset; no forks of proven modules.

**OPERATOR DIRECTIVES**  
- “Improve token efficiency across galaxies/domains/systems – reduce auto‑injected context without quality loss, offload to Ollama where sensible.”  
- “Improve the PRISM AWARENESS system across all galaxies: domain‑specific per galaxy but carrying overall PRISM app knowledge + dev tools + improved Ollama offload; incorporate Obsidian vault, Hermes, loop knowledge, harness knowledge, agentic coding practices; full PRISM AI + closed‑loop self‑improving/self‑learning; improve learning‑from‑mistakes, gap‑avoiding, multi‑step‑ahead downstream/upstream impact reasoning.”  
- `/checkin-bravo` slot‑binding wrapper for forced bravo slot usage.  
- Rate‑limit guard: no bursts, ≤3–4 concurrent agents, prefer direct tools + `ollama-fanout.mjs`.

**FINDINGS/BUGS**  
- DetectKnobs regex missed SILENT/WARN and `=== "0"` gating → 33 % false positives.  
- Probe bytes overestimated due to missing session ID (1461 B vs 126 B steady‑state).  
- Fire‑counter ledger covers only 12 hooks; most injectors lack fire data, so weighted ranking sparse.  
- Org bucket rate‑limiting blocked all 3‑of‑3 scrutiny agents; local Ollama used for review.  

**DOMAIN SPECIFICS**  
- Hooks: `route-savings-session-start-inject.mjs`, `audit-injection-surface.mjs`, `measure-userpromptsubmit-budget.mjs`, `hook-fire-rank.mjs`.  
- Metrics: rate band (5 pp), bytes per prompt, fire‑rate ledger.  
- State paths: `H:/prism/state/shared/route-savings-banner-band.json`.  
- Dispatchers: PreToolUse Write gate for injection knob enforcement.  

**TOOLS USED**  
- PRISM core tools: `.claude/hooks/*`, `.claude/scripts/*`, `ollama-fanout.mjs`.  
- Testing: Node.js `node:test` framework, hermetic subprocess tests.  
- Review: local Ollama `qwen2.5-coder:32b`.  

**OPEN THREADS**  
- Compress the top‑by‑bytes injector (`slot-domain-awareness-inject`) to reduce payload further.  
- Implement per‑prompt injection‑budget cap (≤3 KB) as a hard enforcement gate.  
- Automate memory→wiki promotion (currently advisory).  
- Integrate Obsidian vault, Hermes loop knowledge, harness knowledge into awareness roadmap.  
- Continue building the remaining awareness‑system units (roadmap #2–#5).
