export const meta = {
  name: 'romeo-remaining-work',
  description: 'Mine all 201 romeo sessions + 12 handoffs + 137 memories for incomplete work, verify vs 132 commits, emit a ranked one-shot punch list',
  phases: [
    { title: 'Split', detail: 'chunk sources into fan-out batches' },
    { title: 'Mine', detail: 'extract incomplete-work items (Ollama-offload transcripts)' },
    { title: 'Verify', detail: 'cross-ref each item vs git history (drop shipped)' },
    { title: 'Synthesize', detail: 'dedup + rank + write the punch list' },
  ],
}

const OUT = 'H:/prism-slot-romeo/.romeo-sources'
const SPEC = 'H:/prism/state/shared/specs/ROMEO-REMAINING-WORK-2026-06-15'

const ITEMS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          title: { type: 'string' }, description: { type: 'string' },
          source: { type: 'string' }, evidence: { type: 'string' },
          unit_id: { type: 'string' }, theme: { type: 'string' },
          claimed_status: { type: 'string' },
        },
        required: ['title', 'description', 'source', 'theme'],
      },
    },
  },
  required: ['items'],
}

// ── Phase 1: split sources into fan-out batches on disk ──────────────────────
phase('Split')
const split = await agent(
  `Prepare mining batches for the ROMEO remaining-work extraction. Run bash from H:/prism:
   1. Confirm these exist: ${OUT}/handoffs.txt , ${OUT}/memories.txt , ${OUT}/transcript-candidates.txt (report line counts).
   2. split -l 35 ${OUT}/memories.txt ${OUT}/mem-batch-   (memory paths, 35 per chunk)
   3. Split ${OUT}/transcript-candidates.txt into AT MOST 12 roughly-equal chunks named ${OUT}/tc-batch-aa, ab, ...
      (compute lines, use split -l <ceil(lines/12)> ${OUT}/transcript-candidates.txt ${OUT}/tc-batch-).
   4. ls the produced batch files. Return JSON {handoffs_path:"${OUT}/handoffs.txt", mem_batches:[abs paths], tc_batches:[abs paths], counts:{handoffs:N,memories:N,tc_lines:N}}`,
  {
    schema: {
      type: 'object', additionalProperties: true,
      properties: {
        handoffs_path: { type: 'string' },
        mem_batches: { type: 'array', items: { type: 'string' } },
        tc_batches: { type: 'array', items: { type: 'string' } },
        counts: { type: 'object', additionalProperties: true },
      },
      required: ['mem_batches', 'tc_batches'],
    },
    phase: 'Split',
  },
)
log(`Split -> ${split.mem_batches.length} memory batches + ${split.tc_batches.length} transcript-candidate batches`)

// ── Phase 2: mine each batch for incomplete-work items ───────────────────────
phase('Mine')
const batches = [
  { kind: 'handoffs', path: split.handoffs_path || `${OUT}/handoffs.txt` },
  ...split.mem_batches.map(p => ({ kind: 'memory', path: p })),
  ...split.tc_batches.map(p => ({ kind: 'transcript', path: p })),
]
const mined = await parallel(batches.map(b => () => agent(
  `Mine for ROMEO (wiring slot) work that was PROMISED or STARTED but NEVER COMPLETED. Be precise, do not invent.
   Batch kind=${b.kind}, file=${b.path}
   - handoffs: the file lists handoff .md paths -> Read each; extract every open-thread / "RESUME / next:" / deferred / queued item.
   - memory: the file lists memory .md paths -> Read each; extract every explicit deferred/pending/queued/follow-up/P1-backlog/v2/"next unit" item.
   - transcript: the file IS prefiltered candidate lines "<session>: <excerpt>". If it has >250 lines, FIRST offload to Ollama: run \`node H:/prism/scripts/ask-ollama.mjs summarize ${b.path}\` to compress, then structure; else read directly. Keep only excerpts describing romeo work left undone.
   For each genuine item return: title, description (what's left to do), source (file/session basename), evidence (quote or unit id), unit_id (U-... or ""), theme (wiring|jm-tool-libraries|fusion-live|hypermill|mastercam|nn-graph|course-forge|rgs|viz|other), claimed_status (deferred|queued|partial|promised|blocked). Dedup within the batch. Empty batch -> items:[].`,
  { schema: ITEMS_SCHEMA, label: `mine:${b.kind}:${b.path.split('/').pop()}`, phase: 'Mine', model: 'sonnet' },
)))
const allItems = mined.filter(Boolean).flatMap(r => r.items || [])
log(`Mined ${allItems.length} raw incomplete-work items across ${batches.length} batches`)

// ── Phase 3: verify each item vs the 132 romeo commits (shipped vs open) ──────
phase('Verify')
function chunk(arr, n) { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o }
const verified = await parallel(chunk(allItems, 18).map((ch, idx) => () => agent(
  `Verify which candidate ROMEO incomplete-work items are STILL OPEN vs already SHIPPED.
   For each item: run \`git -C H:/prism log --oneline --all --grep "<unit_id-or-key-term>"\` and grep the repo for the deliverable. SHIPPED if a commit/file clearly delivers it; OPEN otherwise; UNCERTAIN if unclear.
   Items: ${JSON.stringify(ch)}
   Return the same items, each with added "verdict":"open"|"shipped"|"uncertain" and "verify_evidence":"<sha/file or 'none found'>". Keep ALL (annotated), drop none.`,
  { schema: { type: 'object', additionalProperties: true, properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } }, required: ['items'] }, label: `verify:chunk${idx}`, phase: 'Verify', model: 'sonnet' },
)))
const verifiedItems = verified.filter(Boolean).flatMap(r => r.items || [])
const open = verifiedItems.filter(i => i.verdict !== 'shipped')
log(`Verify -> ${verifiedItems.length} checked, ${open.length} still open/uncertain`)

// ── Phase 4: synthesize -> dedup, rank, write the one-shot punch-list spec ────
phase('Synthesize')
const synth = await agent(
  `You are the synthesis lead. Here are ${open.length} verified-open ROMEO incomplete-work items (JSON):
   ${JSON.stringify(open).slice(0, 140000)}
   Produce the canonical ROMEO REMAINING-WORK punch list, ready to one-shot with hermes agents / crons / harnessed loops:
   1. DEDUP aggressively (the same work surfaced across many sessions = ONE item).
   2. GROUP by theme.
   3. Per item: a stable id (use the real U-... if present, else ROMEO-REM-NN), title, what's-left, evidence, est_effort (S|M|L), suggested_executor (hermes-agent|cron|harnessed-loop|manual), dependencies.
   4. RANK by ROI (high-leverage wiring/integration first).
   Write TWO files with the Write tool:
   - ${SPEC}.md  : human-readable, grouped + ranked, with a "## One-shot launch plan" section mapping items -> hermes-agent / cron / /loop.
   - ${SPEC}.json: {generated_for:"romeo", date:"2026-06-15", advisoryOnly:true, mustHumanVerify:true, total_items:N, items:[...]}
   Both carry advisoryOnly + mustHumanVerify. Return {total:N, themes:[...], spec_md:"${SPEC}.md"}.`,
  { schema: { type: 'object', additionalProperties: true, properties: { total: { type: 'number' }, themes: { type: 'array', items: { type: 'string' } }, spec_md: { type: 'string' } }, required: ['total'] }, phase: 'Synthesize' },
)

return { mined_raw: allItems.length, verified_open: open.length, synthesized: synth.total, themes: synth.themes, spec: synth.spec_md }
