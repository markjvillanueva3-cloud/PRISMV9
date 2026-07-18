export const meta = {
  name: 'galaxy-resource-atlas-meta',
  description: 'Per-galaxy RESOURCE-ATLAS (fused easy-access index) for the 17 meta/infra galaxies (token-optimization, hermes-zulu, fleet-hygiene, discovery, system-viz, agent-orchestration, wiring, bug-hunting, backend-helper, dormant-data, compliance-safety, knowledge-conversion, corpus-aggregation, mit-curriculum, tribal-knowledge, pdf-corpus, pdf-corpus-mill) -> completes resource-atlas to 34/34. DISTINCT from source-atlas (curriculum): this is the jump-straight-to-the-canonical-tool-repo/paper/standard hub + the LOCAL engine/code/store trove. Online candidates seeded by gpt-oss/qwen2.5-coder (Ollama highest-tier offload) but EVERY url is WebFetch-VERIFIED by the agent (R12: drop hallucinated/dead). WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'ResourceAtlas', detail: 'waves of 3: local engine/store trove + Ollama-seeded candidates WebFetch-verified + cross-links' },
  ],
}

// LOCAL = the galaxy engine dir + its real PRISM stores/scripts. CANDIDATES = Ollama-seeded online resources to VERIFY (some are hallucinated -- agent drops any that 404).
const GALAXIES = [
  { g: 'token-optimization', owner: 'alpha', local: 'mcp-server/src/engines/token-optimization/ engines; scripts/lib/cag-router.mjs; RTK + ollama-offload-stats', cand: 'Anthropic prompt-caching docs; arXiv LoRA 2106.09685; Shannon info-theory; llmlingua github (microsoft/LLMLingua)', focus: 'LLM context engineering / prompt-cache / compaction' },
  { g: 'hermes-zulu', owner: 'zebra', local: 'mcp-server/src/engines/hermes-zulu/ orchestrator engines; .claude/helpers/chat-slots.mjs', cand: 'Google "Tail at Scale" paper (research.google); Reactive Manifesto; Azure Architecture Center patterns', focus: 'multi-agent fleet orchestration / tail-latency' },
  { g: 'fleet-hygiene', owner: 'golf', local: 'mcp-server/src/engines/fleet-hygiene/; .claude/helpers/install-fleet-reaper-task.ps1; fleet-reaper scripts', cand: 'systemd/systemd github; kernel.org cgroup-v2 admin-guide; OSTEP free book (pages.cs.wisc.edu/~remzi/OSTEP)', focus: 'OS process mgmt / cgroups / race-free subtree reaping' },
  { g: 'discovery', owner: 'tango', local: 'mcp-server/src/engines/discovery/; master-index + DuplicationGuardEngine; find-cache.json', cand: 'apache/lucene github; Stanford CS276 IR; Manning IR Book (nlp.stanford.edu/IR-book); RRF paper', focus: 'information retrieval / search / RRF fusion' },
  { g: 'system-viz', owner: 'sierra', local: 'mcp-server/src/engines/system-viz/; scripts/regen-viz + system-graph.json (548MB); node-card offset index', cand: 'gephi/gephi github; Handbook of Graph Drawing; d3/d3-force github; Munzner Visualization Analysis', focus: 'graph drawing / force-layout / large-graph viz' },
  { g: 'agent-orchestration', owner: 'zebra', local: 'mcp-server/src/engines/agent-orchestration/; slot-task-claim + DistributedLockManager', cand: 'MIT 6.824 (pdos.csail.mit.edu/6.824); Raft paper raft.github.io; Kleppmann DDIA fencing-tokens; hashicorp/raft github', focus: 'distributed consensus / Raft / fencing tokens' },
  { g: 'wiring', owner: 'romeo', local: 'mcp-server/src/engines/wiring/; audit-unwired-engines.mjs; dispatcher registry', cand: 'bazelbuild/bazel github; Build Systems a la Carte paper (microsoft.com/research); GNU Make manual', focus: 'build systems / dependency DAG / incremental rebuild' },
  { g: 'bug-hunting', owner: 'golf', local: 'mcp-server/src/engines/bug-hunting/; vitest suites; CIMCO-bridge parity', cand: 'google/oss-fuzz github; AFL++ github (AFLplusplus); MIT 6.031 testing; Hypothesis property-testing docs', focus: 'software testing / fuzzing / differential testing' },
  { g: 'backend-helper', owner: 'papa', local: 'mcp-server/src/engines/backend-helper/; tsconfig + esbuild config; npm run build tiers', cand: 'microsoft/TypeScript github; TypeScript handbook (typescriptlang.org/docs); evanw/esbuild github; tsc --generateTrace docs', focus: 'TypeScript / tsc perf / esbuild / NodeNext' },
  { g: 'dormant-data', owner: 'victor', local: 'mcp-server/src/engines/dormant-data/; tmp-orphan-janitor; dormant-data ledger', cand: 'GC Handbook (gchandbook.org); PostgreSQL MVCC docs; jepsen-io/jepsen github; OSTEP', focus: 'GC / MVCC / RCU reclaim / data lifecycle' },
  { g: 'compliance-safety', owner: 'golf', local: 'mcp-server/src/engines/compliance-safety/; prism_safety dispatcher; omega-thresholds.json', cand: 'MIT STPA Handbook (psas.scripts.mit.edu); IEC 61508 (iec.ch); Leveson Engineering a Safer World (free MIT Press)', focus: 'STPA/STAMP / functional-safety / fail-closed', note: 'R12: NO numeric S(x)/Omega/SIL promoted -- method/standard only, thresholds owner-gated to golf + constants.ts.' },
  { g: 'knowledge-conversion', owner: 'golf', local: 'mcp-server/src/engines/knowledge-conversion/; 6-node forge-queue; SafeExpressionEvaluator', cand: 'huggingface/transformers github; Stanford CS224N; Jurafsky-Martin SLP3 (web.stanford.edu/~jurafsky/slp3); spaCy docs', focus: 'NLP / information extraction / ontology-guided' },
  { g: 'corpus-aggregation', owner: 'golf', local: 'mcp-server/src/engines/corpus-aggregation/; pdf+mit+tribal feeders; tribal-embed-index', cand: 'apache/airflow github; dbt-core github; Designing Data-Intensive Applications (Kleppmann); Debezium CDC docs', focus: 'data engineering / ETL / CDC / idempotent merge' },
  { g: 'mit-curriculum', owner: 'lima', local: 'mcp-server/src/engines/mit-curriculum/; resources/MIT COURSES(1106); academy course ids', cand: 'ocw.mit.edu; MIT OCW github (ocw-mirror); Creative Commons license docs; OER Commons', focus: 'OER / OCW / CC-license aggregation' },
  { g: 'tribal-knowledge', owner: 'golf', local: 'mcp-server/src/engines/tribal-knowledge/; knowledge/wiki/code-tribal/ (4354 tips); tribal-rerank', cand: 'Nonaka SECI The Knowledge-Creating Company (refs); arXiv RAG 2005.11401; knowledge-management literature', focus: 'knowledge management / SECI / retrieval-augmented capture' },
  { g: 'pdf-corpus', owner: 'xray', local: 'mcp-server/src/engines/pdf-corpus/; lima pypdf page-extractor; 8752-page corpus', cand: 'tesseract-ocr/tesseract github; Szeliski Computer Vision (szeliski.org/Book); pypdf docs; PaddleOCR github', focus: 'document AI / OCR / born-digital-vs-scan routing' },
  { g: 'pdf-corpus-mill', owner: 'golf', local: 'mcp-server/src/engines/pdf-corpus-mill/; mill PDF extraction Haas/Mazak; multi-page resumable extractor', cand: 'Layout-Parser/layout-parser github; LayoutLM paper (arXiv 1912.13318); PDFPlumber github; Camelot table-extraction', focus: 'document layout analysis / table-structure / zone routing', note: 'R12: NO inlined cutting numeric (SFM/IPR) -- machine-manual data stays owner-gated.' },
]

phase('ResourceAtlas')

function prompt({ g, owner, local, cand, focus, note }) {
  return `You are creating the RESOURCE-ATLAS wiki for the PRISM "${g}" meta/infra galaxy (owner: ${owner}, focus: ${focus}): knowledge/wiki/${g}/${g}-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[${g}-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
${local}

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): ${cand}
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).${note ? '\n' + note : ''}

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[${g}-foundations]], [[${g}-source-atlas]], [[${g}-applied-practice]], [[${g}-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, numbers stay owner-gated to ${owner} + constants.ts.
4. Sections: Local code+stores / Canonical repos+papers+standards (verified) / Curated video (if any verify) / Cross-links / Keep-fresh cadence. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-resource-atlas-meta (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-resource-atlas.md
CREATED: <yes/no>
LOCAL_POINTERS_LINKED: <count>
ONLINE_VERIFIED: <count of WebFetch-confirmed>
CANDIDATES_DROPPED: <count of seeded urls that failed verification>
NOTE: <one line: the single highest-value canonical resource this atlas surfaces>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `resatlas:${entry.g}`, phase: 'ResourceAtlas' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`resource-atlas-meta complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
