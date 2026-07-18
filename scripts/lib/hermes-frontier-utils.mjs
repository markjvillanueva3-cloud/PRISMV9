// scripts/lib/hermes-frontier-utils.mjs
//
// U-HFR02..04 + U-HRP07 + U-HOC04 — pure-core helpers for the deeper
// Hermes frontier units. Five thin functions, one file (each <50 LOC; the
// 3x DRY rule is not yet hit per util — they share the rerank/score
// vocabulary but the inputs/outputs diverge enough that forced abstraction
// would be premature). See HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23
// spec §3 for the unit-by-unit contract.

export const CROSS_SLOT_SIMILARITY_FLOOR = 0.55; // HFR02 — pairs above this get "consolidate?" prompt
export const TRIBAL_DISTILL_MIN_SUCCESS = 3;     // HFR03 — need ≥3 success outcomes before proposing a tribal entry
export const SOUL_GRADUATE_MIN_SLOTS = 3;        // HFR04 — refuse-rule present in ≥3 slot souls before fleet-wide promotion
export const HOC04_DISSENT_RATE_FLOOR = 0.7;     // HOC04 — voice with dissentRate > this gets a -weight proposal
export const HOC04_ALIGN_RATE_FLOOR = 0.9;       // HOC04 — voice with alignedCount/totalRuns > this gets a +weight proposal

// ── U-HFR02 — cross-slot skill propagation ────────────────────────────────
//
// Given a cluster from one slot + other slots' recently-shipped clusters,
// surface pairs where signature semantic similarity ≥ floor. Operator
// surfaces "your peer also built this — consolidate?".
export function findCrossSlotMatches(myCluster, otherSlotClusters, opts = {}) {
  const out = [];
  if (!myCluster || typeof myCluster !== "object") return out;
  if (!Array.isArray(otherSlotClusters)) return out;
  const rerank = typeof opts.rerank === "function" ? opts.rerank : null;
  const floor = Number.isFinite(opts.floor) ? opts.floor : CROSS_SLOT_SIMILARITY_FLOOR;
  const query = myCluster.fullSignature || myCluster.signature || "";
  if (!query) return out;
  const candidates = otherSlotClusters
    .map((c) => c?.fullSignature || c?.signature || "")
    .filter((s) => typeof s === "string" && s.length > 0);
  if (candidates.length === 0) return out;
  let results;
  if (rerank) {
    try { results = rerank(query, candidates, 5); } catch { results = null; }
  }
  if (!Array.isArray(results)) {
    // Fallback: substring containment heuristic (degraded path).
    for (let i = 0; i < otherSlotClusters.length; i++) {
      const other = otherSlotClusters[i];
      const otherSig = other?.fullSignature || other?.signature || "";
      if (!otherSig) continue;
      if (otherSig === query) {
        out.push({ peer: other, score: 1, mode: "substring-exact" });
      }
    }
    return out;
  }
  for (const r of results) {
    const score = Number(r?.score);
    if (!Number.isFinite(score) || score < floor) continue;
    const text = typeof r?.candidate === "string" ? r.candidate : "";
    const idx = candidates.indexOf(text);
    if (idx < 0) continue;
    out.push({ peer: otherSlotClusters[idx], score, mode: "rerank" });
  }
  return out;
}

// ── U-HFR03 — tribal-distillation auto-loop ──────────────────────────────
//
// Given a shipped cluster + its outcome record, propose a tribal-knowledge
// markdown when ≥TRIBAL_DISTILL_MIN_SUCCESS successful uses. Returns null
// when threshold not met. Caller writes to knowledge/wiki/code-tribal/.
export function proposeTribalEntry(cluster, outcomes, opts = {}) {
  if (!cluster || typeof cluster !== "object") return null;
  if (!Array.isArray(outcomes)) return null;
  const successCount = outcomes.filter((o) => o?.outcome === "success").length;
  const minSuccess = Number.isFinite(opts.minSuccess) ? opts.minSuccess : TRIBAL_DISTILL_MIN_SUCCESS;
  if (successCount < minSuccess) return null;
  const slug = (cluster.id || "tribal-candidate").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const generated = opts.now || new Date().toISOString();
  const body = [
    "---",
    `slug: tribal-${slug}`,
    "type: code-tribal",
    `generated: ${generated}`,
    "schemaVersion: 1.0.0",
    "kind: hermes-distilled",
    "---",
    "",
    `# Tribal — distilled from Hermes cluster \`${cluster.id || "(no-id)"}\``,
    "",
    `Pattern observed ${cluster.count || 0} times across slots [${Object.keys(cluster.slots || {}).join(", ")}], `,
    `dominant kind: **${cluster.dominantKind || "(unknown)"}**, median call count: ${cluster.medianCallCount || 0}.`,
    `Successful operator uses since ship: ${successCount}.`,
    "",
    "## Tool-call signature",
    "```",
    cluster.signature || "(unknown)",
    "```",
    "",
    "## What this captures",
    "",
    cluster.semanticSummary || "_(operator authors: what does this pattern do?)_",
    "",
    "## Operator promote",
    "",
    "Validate against tribal-knowledge conventions, then merge with adjacent entries via `/dedup`.",
    "",
  ].join("\n");
  return { slug: `tribal-${slug}`, successCount, body };
}

// ── U-HFR04 — fleet-wide soul-rule graduation ────────────────────────────
//
// Given a list of slot souls each with their refuse_list, surface refuse-rules
// that appear in ≥SOUL_GRADUATE_MIN_SLOTS souls. These are candidates for
// CLAUDE.md doctrine promotion.
export function findFleetGraduatedRules(slotSouls, opts = {}) {
  const minSlots = Number.isFinite(opts.minSlots) ? opts.minSlots : SOUL_GRADUATE_MIN_SLOTS;
  if (!Array.isArray(slotSouls)) return [];
  const counts = new Map(); // rule → Set<slot>
  for (const soul of slotSouls) {
    if (!soul || typeof soul !== "object") continue;
    const slot = String(soul.slot || "unknown");
    const list = Array.isArray(soul.refuse_list) ? soul.refuse_list : [];
    for (const rule of list) {
      const key = String(rule).toLowerCase().trim();
      if (!key) continue;
      const s = counts.get(key) || new Set();
      s.add(slot);
      counts.set(key, s);
    }
  }
  const out = [];
  for (const [rule, slots] of counts) {
    if (slots.size >= minSlots) {
      out.push({ rule, slotCount: slots.size, slots: [...slots].sort() });
    }
  }
  out.sort((a, b) => b.slotCount - a.slotCount);
  return out;
}

// ── U-HRP07 — AI-generated draft skill body ──────────────────────────────
//
// Given a cluster + its PSN exemplars + an AI generator callback, return a
// drafted skill body string. Caller picks where to write it. R12 fail-loud:
// when aiGenerate throws or returns empty, returns null (never silent
// fallback to the static stub — null signals "no draft, use stub instead").
//
// Budget knob: pass opts.maxDraftBytes to cap output size.
export async function aiGenerateDraftBody({ cluster, psnExemplars, aiGenerate, maxDraftBytes = 8192 }) {
  if (!cluster || typeof cluster !== "object") return null;
  if (typeof aiGenerate !== "function") return null;
  const exemplarsText = psnExemplars && typeof psnExemplars === "object"
    ? JSON.stringify(psnExemplars).slice(0, 2048)
    : "(none)";
  const promptForAi = [
    `Draft a PRISM skill (.claude/commands/<slug>.md) for the observed cluster below.`,
    `Cluster signature: ${cluster.signature || "(unknown)"}.`,
    `Dominant tool: ${cluster.dominantKind || "(unknown)"}; slots observed: ${Object.keys(cluster.slots || {}).join(", ")}.`,
    `Semantic summary: ${cluster.semanticSummary || "(none)"}.`,
    `Closest PSN exemplars: ${exemplarsText}.`,
    `Constraint: real body content only — no toBeDefined() stubs, no TODOs, no placeholder text. Cap output ${maxDraftBytes} bytes.`,
    `Frontmatter required: name, description, allowed-tools.`,
  ].join("\n");
  let result;
  try { result = await aiGenerate(promptForAi); }
  catch { return null; }
  if (typeof result !== "string" || result.length === 0) return null;
  return result.slice(0, maxDraftBytes);
}

// ── U-HOC04 — voice diversity tuning proposals ──────────────────────────
//
// Given the voiceStats Map from octopus-record-lib::computeVoiceStats,
// propose weight adjustments. NEVER auto-applies — emits proposals for
// operator review (operator edits octopus-setup.mjs).
export function proposeVoiceWeightAdjustments(voiceStats, opts = {}) {
  const proposals = [];
  if (!(voiceStats instanceof Map)) return proposals;
  const dissentFloor = Number.isFinite(opts.dissentFloor) ? opts.dissentFloor : HOC04_DISSENT_RATE_FLOOR;
  const alignFloor = Number.isFinite(opts.alignFloor) ? opts.alignFloor : HOC04_ALIGN_RATE_FLOOR;
  for (const [voiceId, stats] of voiceStats) {
    if (!stats || stats.totalRuns < 5) continue; // need enough samples
    if (stats.dissentRate >= dissentFloor) {
      proposals.push({ voiceId, direction: "decrease", reason: `dissent-rate=${stats.dissentRate.toFixed(2)}>=${dissentFloor}`, totalRuns: stats.totalRuns });
    } else if ((stats.alignedCount / stats.totalRuns) >= alignFloor) {
      proposals.push({ voiceId, direction: "increase", reason: `align-rate=${(stats.alignedCount / stats.totalRuns).toFixed(2)}>=${alignFloor}`, totalRuns: stats.totalRuns });
    }
  }
  return proposals;
}
