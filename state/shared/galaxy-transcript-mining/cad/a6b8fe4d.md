# cad session a6b8fe4d (2026-06-10, 8.2MB, spine 78KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U‑ROUTE‑SAVINGS‑BAND‑GATE (+HARDEN)` – fleet‑global state file, 322 B/session saved, 42/42 tests.  
- `U‑INJECTION‑SURFACE‑CENSUS` – live audit of 114 recurring injectors (55 SessionStart + 59 UserPromptSubmit), knob coverage 71.9 %, 17→20 tests.  
- `U‑CENSUS‑KNOB‑ACCURACY` – self‑corrected `detectKnobs`, reduced false positives, 6 real knobless → 3 after measurement fix.  
- `U‑KNOB‑CLOSE` – added disable knobs to the 3 remaining context‑injectors (`slot-domain-awareness-inject`, `chat-state-isolator`, `session-reorient-inject`), 4/4 tests.  
- `U‑INJECTION‑BYTES‑RANK` (awareness‑roadmap #1) – wired real per‑injector byte measurement, produced a data‑driven cut list; 27/27 tests + live validation.  
- `injection-knob-enforce.mjs` – PreToolUse Write gate that hard‑blocks creation of knobless SessionStart/UserPromptSubmit injectors; 11/11 tests, live validated.  
- Assessment spec `AWARENESS-SYSTEM-ASSESSMENT-2026-06-10.md` – current state + 5‑unit roadmap for awareness improvement.

**DECISIONS**  
- Use a fleet‑global JSON state file for the route‑savings banner band gate to avoid per‑slot writes.  
- Separate state from the peer‑written sidecar; own atomic `writeBandState`.  
- Extend `detectKnobs` regex to include `SILENT`, `WARN`, and `=== "0"` gating idiom.  
- Measure first‑emit bytes only; discovered dedup reduces steady‑state cost (1461 B → 126 B).  
- Add a `--repeat` probe mode for accurate steady‑state measurement, then drop it in favor of enforcement.  
- Wire the knob‑enforcement gate into `settings.json`’s PreToolUse Write matcher; fleet‑wide activation.  
- Reuse existing audit scripts (`hook-fire-rank.mjs`, `measure-userpromptsubmit-budget.mjs`) instead of duplicating.

**OPERATOR DIRECTIVES (verbatim)**  
> “improve token efficiency across the entire galaxies, domains and systems … offload to Ollama where sensible … use ultracode to discover high ROI token savings or ollama offloading.”  
> “improve Prism awareness system across all galaxies … incorporate Obsidian vault, Hermes, loop knowledge, harness knowledge, agentic coding practices … closed‑loop self improving/self learning … improve learning from mistakes, gap avoiding, multi‑step ahead downstream/upstream impact reasoning.”

**FINDINGS/BUGS**  
- `detectKnobs` regex falsely matched `.exec(` → fixed.  
- Probe measured first‑emit bytes; dedup reduced steady‑state cost by 11.6× (1461 B → 126 B).  
- Two hooks (`local-compute-intent`, `stale-state-warn`) had hidden knobs (`SILENT`, `WARN`), removed from knobless list.  
- Fire‑rate ledger covers only 12 of 59 injectors; weighted ranking sparse, so fallback to raw bytes used.  
- 3-of-3 scrutiny gate pending due to org bucket rate limiting.

**DOMAIN SPECIFICS**  
- SessionStart/UserPromptSubmit hooks (55 + 59) fire per prompt/slot.  
- Route‑savings banner band gate: `computeRateBand`, `shouldEmitBanner`, fleet‑global state file `route-savings-banner-band.json`.  
- Injection surface census: `hook-fire-rank.mjs` for fires, `measure-userpromptsubmit-budget.mjs` for bytes.  
- PreToolUse Write gate in `settings.json` enforces knob presence.  
- Dedup helper `injection-dedup.mjs` used by `slot-domain-awareness-inject`.  

**TOOLS USED**  
- Ultracode (direct tool sweeps).  
- Ollama qwen2.5‑coder:32b for local review.  
- Node.js `node:test` for unit tests.  
- Scripts: `scripts/lib/ollama-fanout.mjs`, `checkin-bravo` wrapper, `chat-slots.mjs`.  
- Git hooks: `[BOOTSTRAP-SLOT-ENFORCE]` prefix, commit to `cad‑fusion‑live‑ms0`.  

**OPEN THREADS**  
1. Compress the worst‑by‑bytes injector (`slot-domain-awareness-inject`, 1461 B).  
2. Enforce a per‑prompt injection budget cap (≤3 KB) once steady‑state bytes are measured.  
3. Automate memory→wiki promotion (currently advisory).  
4. Per‑edit `/impact` blast‑radius nudge with enforcement.  
5. Complete the 3-of-3 scrutiny gate for all shipped units when org bucket recovers.
