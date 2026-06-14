# Business/ERP Galaxy — TOOLBELT (slot:hotel tool-call cheatsheet)

> The exact Grep/Glob/Bash/Read/git/`prism_business` patterns hotel reaches for most. Memoized so future sessions don't re-derive. Each entry saves tokens or time vs. the naive alternative. Pair with [`./PATHS.md`](PATHS.md) (O(1) file lookup) + [`./MEMORY.md`](MEMORY.md).

## Glob patterns (narrow — avoid the 2700-file recursive root glob)
- `mcp-server/src/engines/Employee*.ts` | HR sub-galaxy (22 files) — never recurse from root
- `mcp-server/src/engines/ERP*.ts` | ERP sub-engines (6 files)
- `mcp-server/src/engines/{Customer,Job,Cost}*.ts` | CRM / job / costing families
- `mcp-server/src/engines/business/*.md` | galaxy brain files (4)
- ⚠ NEVER `ls H:/prism/mcp-server/src/engines/*.ts` in bash — 2700+ files → arg-list-too-long → silent empty. Use `ls <dir>/ | grep -iE '...'` (dir-list form) instead.

## Grep patterns
- ⚠ `hotel_tribal_*` is NOT wired — `HotelERPTribalKnowledgeEngine` is an UNWIRED ORPHAN (0 handlers in businessDispatcher); call the engine directly, not via prism_business (see CLAUDE.md §8.5)
- `pattern="case \"<action>\"" path=businessDispatcher.ts` | locate a dispatcher action's handler (879 cases)
- `pattern="debits\|credits\|trial.?balance" path=GeneralLedgerEngine.ts` | find the invariant gate
- `pattern=galaxy:business path=C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` | verify the master back-pointer (CONN-4)

## Bash one-liners (dir-list form beats arg-glob; RTK-wrap noisy ones)
- `ls H:/prism/mcp-server/src/engines/ \| grep -icE 'Business\|ERP\|Employee\|Customer\|Job\|Cost\|...'` | count business engines (355) without arg-glob blowup
- `wc -l H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts` | dispatcher size sanity
- `grep -cE 'case "' businessDispatcher.ts` | action-case count (≈879)
- `git -C H:/prism log --oneline -i --grep=HOTEL -n 30` | the HOTEL-ERP-MARATHON history
- `ls "C:/Users/wompu/.claude/projects/H--prism/memory/" \| grep -iE 'hotel\|erp\|business'` | hotel memories (dir-list form — memory dir is 641 files)

## Read offset+limit cheatsheet
- `businessDispatcher.ts` | use Grep to find the action's `case` line first, then `Read offset=<line-30> limit=80` | never read all 6746 lines
- `EmployeeMachineDomainAcademyEngine.ts` (47K) | Read `offset=1 limit=60` for the JSDoc + Cpk-floor constants only
- `business/CLAUDE.md` | Read `offset=104 limit=53` for §5 gotchas + §6 tribal slice

## git (RTK-wrapped — fleet pattern is `[MAIN] … (slot:hotel)`)
- `rtk git -C H:/prism log --oneline -n 5` | recent integration-tree commits
- `rtk git -C H:/prism status` | working tree (compact)
- commit prefix on shared tree: `[MAIN] [SCOPE]/U-ID (slot:hotel …): title` — peer commits absorb [hotel]-only prefixes on the shared tree (see [[reference_iter10_hotel_absorption_2026_05_26]])

## prism_business dispatcher actions used most (when MCP is up — faster than Grep+compute)
- `prism_business:gl_trial_balance` then `gl_journal_entry` | ALWAYS check balance before posting (invariant gate)
- `prism_business:quote_to_ship_run` | the canonical end-to-end orchestrator — never hand-chain order→WO→traveler→invoice
- `prism_business:actual_cost_variance` | per-category variance (material/labor/machine-hr/overhead/freight), not a single delta
- ⚠ `hotel_tribal_query` is NOT a live prism_business action (HotelERPTribalKnowledgeEngine is an unwired orphan) — call the engine directly until wired · GSD protocol: `./GSD.md`
- `prism_business:customer_credit_check` | gate quotes against credit limit + AR aging
- `prism_business:payroll_compute_gross` / `pto_compute_balance` | FLSA-correct payroll/PTO math (don't reimplement)

## When MCP is offline (banner says `MCP SERVER DISCONNECTED`)
- Fall back to `node H:/prism/scripts/<X>.mjs` and direct fs tools.
- Tribal capture fallback: append to `HotelERPTribalKnowledgeEngine` seed OR `TRIBAL_TIP_INDEX.json` (NOT direct `knowledge/tribal/business-*.md` — auto-regen overwrites).
- Memory recall fallback: `ls memory/ | grep` + `Read` instead of `prism_memory:semantic_search`.

## Self-awareness routes (prefer before Grep/Glob/Agent — when MCP up)
- `prism_session:master_index_query keyword="<business term>"` | ranked top-K over 110K-node graph
- `prism_session:dispatcher_map_compact` | confirm a business action exists before building
- `node scripts/system-viz-query.mjs find <noun>` | graph-grounded file location (MCP-independent adapter)

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[business-foundations]] / [[business-source-atlas]] / [[business-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: hotel).
<!-- /OPERATIONAL-CONTEXT -->
