// ZULU-AWARENESS-MS0 — synergize zulu with the 10 PRISM knowledge surfaces.
//
// Purpose: zulu (the designated Hermes orchestrator) reads every PRISM
// knowledge surface, builds a per-slot capability fingerprint, learns from
// the outcome ledgers, and emits ranked slot recommendations for any task.
//
// Ten surfaces this pipeline knits together:
//   1. prism-awareness        state/shared/AWARENESS-SNAPSHOT.md
//   2. obsidian brain         knowledge/memories/{feedback,reference}/*.md
//   3. prism os               knowledge/wiki/os/**/*.md
//   4. wiki                   knowledge/wiki/architecture/**/*.md (indexed)
//   5. tribal knowledge       state/shared/tribal-embed-index.json
//   6. neural network         state/shared/nn-graph/graphsage-checkpoint.json
//   7. skills                 .claude/commands/*.md (Hermes-style skillset)
//   8. scripts                scripts/**/*.mjs (PRISM tools)
//   9. hooks                  .claude/hooks/*.mjs + HOOK_REGISTRY.json
//  10. memories               C:/.../memory/MEMORY.md + per-memory files
//  11. system-viz             state/shared/system-viz/system-graph.json (most important)
//
// Pure functions; all I/O is injected via opts. Tests stay hermetic.
//
// Pipeline stages:
//   buildCapabilityFingerprint(slot, soul, ctx)
//     → per-slot fingerprint: domains, refuse_list, queue depth, recent commits,
//       tribal-domain affinity, system-viz neighborhood, historical success rate.
//   scoreSlotForTask(fingerprint, taskDescriptor, opts)
//     → pure ranking score per slot for a candidate task.
//   trainFromOutcomes(verdictLines, taskClaims, opts)
//     → outcome learner — adjusts per-slot weights from success/failure history.
//   rankSlotsForTask(taskDescriptor, fingerprints, weights, opts)
//     → ranked [{slot, score, evidence[]}] list for routing decisions.

export const SCHEMA_VERSION = "1.0.0";

// Weight defaults — tunable via training step.
export const DEFAULT_WEIGHTS = Object.freeze({
  domainMatch: 4.0,       // strong signal — slot soul declares domain affinity
  tribalAffinity: 2.5,    // tribal-knowledge entries matching task domain
  vizNeighborhood: 2.0,   // system-viz node-cluster matches task scope
  successRate: 1.5,       // historical PASS rate for this slot×domain pairing
  queueDepth: -0.5,       // penalize over-loaded slots (negative weight)
  refuseHit: -100.0,      // HARD veto — task hits the slot's refuse_list
});

// ─── stage 1: capability fingerprint ───────────────────────────────────────
// ctx shape (all optional — fingerprint degrades gracefully when surfaces absent):
//   {
//     queueLength: number,             // slot-task-queues.json[slot].length
//     recentCommitScopes: string[],    // last N [SCOPE] tags from git log
//     skillUsageCount: number,         // skills-usage-stats hits this slot
//     tribalDomainScores: {dom→score}, // tribal-embed-index hits per domain
//     vizNodeCount: number,            // system-graph nodes attributed to slot
//     verdictPassCount: number,        // skill-loop-verdicts PASS count
//     verdictTotalCount: number,       // skill-loop-verdicts total count
//   }
export function buildCapabilityFingerprint(slot, soul, ctx = {}) {
  if (typeof slot !== "string" || slot.length === 0) {
    return { slot: null, ok: false, reason: "no-slot" };
  }
  const soulData = soul && typeof soul === "object" ? soul : {};
  const domains = parseDomainFilter(soulData.domain_filter);
  const refuseList = Array.isArray(soulData.refuse_list) ? soulData.refuse_list : [];
  const total = Number(ctx.verdictTotalCount) || 0;
  const passed = Number(ctx.verdictPassCount) || 0;
  const successRate = total > 0 ? passed / total : 0.5;  // 0.5 neutral prior
  return {
    slot,
    ok: true,
    hermesRole: typeof soulData.hermes_role === "string" ? soulData.hermes_role : "specialist",
    domains,
    refuseList,
    queueLength: Number(ctx.queueLength) || 0,
    recentCommitScopes: Array.isArray(ctx.recentCommitScopes) ? ctx.recentCommitScopes : [],
    skillUsageCount: Number(ctx.skillUsageCount) || 0,
    tribalDomainScores: ctx.tribalDomainScores || {},
    vizNodeCount: Number(ctx.vizNodeCount) || 0,
    successRate,
    successSampleSize: total,
  };
}

export function parseDomainFilter(s) {
  if (typeof s !== "string" || s.length === 0) return [];
  return s.split("|").map(d => d.trim().toLowerCase()).filter(Boolean);
}

// ─── stage 2: score per task ───────────────────────────────────────────────
// taskDescriptor shape: { text: string, domain?: string, kind?: string }
export function scoreSlotForTask(fp, taskDescriptor, weights = DEFAULT_WEIGHTS) {
  if (!fp || !fp.ok) return { score: -Infinity, evidence: ["no-fingerprint"] };
  const evidence = [];
  let score = 0;
  const text = (taskDescriptor?.text || "").toLowerCase();
  const domain = (taskDescriptor?.domain || "").toLowerCase();

  // Refuse-list HARD veto — task hits anything the slot refuses.
  for (const refused of fp.refuseList) {
    const tag = String(refused).toLowerCase();
    if (text.includes(tag) || (domain && tag.includes(domain))) {
      score += weights.refuseHit;
      evidence.push(`REFUSE:${refused}`);
      return { score, evidence };  // veto short-circuits — no point scoring further
    }
  }

  // Domain match — slot's domain_filter intersects task domain/text.
  let domainHit = false;
  for (const d of fp.domains) {
    if (domain === d || (domain && d.includes(domain)) || text.includes(d)) {
      score += weights.domainMatch;
      evidence.push(`domain:${d}`);
      domainHit = true;
      break;
    }
  }

  // Tribal affinity — task's domain scored against this slot's tribal hits.
  const tribalScore = domain ? (Number(fp.tribalDomainScores[domain]) || 0) : 0;
  if (tribalScore > 0) {
    const norm = Math.min(1, tribalScore / 10);
    score += norm * weights.tribalAffinity;
    evidence.push(`tribal:${domain}=${tribalScore}`);
  }

  // System-viz neighborhood — slot owns N graph nodes relevant to task.
  if (fp.vizNodeCount > 0) {
    const norm = Math.min(1, fp.vizNodeCount / 50);
    score += norm * weights.vizNeighborhood;
    evidence.push(`viz:${fp.vizNodeCount}-nodes`);
  }

  // Success history — wide-sample rate gets full weight; narrow-sample tempered.
  if (fp.successSampleSize >= 3) {
    score += fp.successRate * weights.successRate;
    evidence.push(`success:${(fp.successRate * 100).toFixed(0)}%/${fp.successSampleSize}`);
  }

  // Queue-depth penalty — over-loaded slots get pushed down. log-scaled.
  if (fp.queueLength > 0) {
    const norm = Math.min(1, Math.log10(1 + fp.queueLength) / 2);
    score += norm * weights.queueDepth;
    evidence.push(`queue:${fp.queueLength}`);
  }

  if (!domainHit && fp.domains.length > 0) {
    evidence.push(`no-domain-match`);
  }

  return { score, evidence };
}

// ─── stage 3: training step ────────────────────────────────────────────────
// Reads outcome ledger lines + slot-task claims, returns adjusted weights.
// Conservative — weight deltas bounded ±0.5 per training run; total change
// per weight bounded to ±50% of default. Stable convergence over many runs.
export function trainFromOutcomes(verdictLines, taskClaims, opts = {}) {
  const base = opts.baseWeights || DEFAULT_WEIGHTS;
  const maxDelta = typeof opts.maxDelta === "number" ? opts.maxDelta : 0.5;
  const stats = analyzeOutcomes(verdictLines, taskClaims);
  const adjustments = {};
  // Adjust successRate weight up if PASS-rate-when-recommended is high;
  // adjust down if AUTO-PASS verdicts often turn out to be regressions.
  const recommendedPassRate = stats.recommendedPassRate;
  if (Number.isFinite(recommendedPassRate)) {
    const direction = recommendedPassRate >= 0.7 ? +1 : recommendedPassRate <= 0.3 ? -1 : 0;
    adjustments.successRate = clamp(direction * maxDelta, -maxDelta, maxDelta);
  }
  // Adjust queueDepth penalty: if heavy-queue slots are completing successfully,
  // soften the penalty; if they're failing, harden it.
  if (Number.isFinite(stats.heavyQueueFailRate) && stats.heavyQueueSampleSize >= 3) {
    const direction = stats.heavyQueueFailRate >= 0.5 ? -1 : +1;
    adjustments.queueDepth = clamp(direction * maxDelta * 0.5, -maxDelta, maxDelta);
  }
  // Always bound the final weight ±50% of default.
  const tuned = { ...base };
  for (const [k, delta] of Object.entries(adjustments)) {
    const def = base[k];
    if (typeof def !== "number") continue;
    const cap = Math.abs(def) * 0.5;
    tuned[k] = clamp(def + delta, def - cap, def + cap);
  }
  return { weights: tuned, stats, adjustments };
}

function analyzeOutcomes(verdictLines, taskClaims) {
  let recommendedTotal = 0;
  let recommendedPass = 0;
  let heavyQueueTotal = 0;
  let heavyQueueFail = 0;
  if (Array.isArray(verdictLines)) {
    for (const raw of verdictLines) {
      if (typeof raw !== "string" || !raw.trim()) continue;
      let v;
      try { v = JSON.parse(raw); } catch { continue; }
      const verdict = v?.verdict?.verdict || v?.verdict;
      if (verdict === "AUTO-PASS" || verdict === "PASS") {
        recommendedPass++;
        recommendedTotal++;
      } else if (verdict === "AUTO-FAIL" || verdict === "FAIL") {
        recommendedTotal++;
      }
    }
  }
  if (taskClaims && typeof taskClaims === "object") {
    for (const claim of Object.values(taskClaims.claims || {})) {
      const q = Number(claim?.queueDepthAtClaim) || 0;
      if (q < 5) continue;
      heavyQueueTotal++;
      if (claim?.outcome === "fail" || claim?.outcome === "abandoned") heavyQueueFail++;
    }
  }
  return {
    recommendedTotal,
    recommendedPass,
    recommendedPassRate: recommendedTotal > 0 ? recommendedPass / recommendedTotal : NaN,
    heavyQueueSampleSize: heavyQueueTotal,
    heavyQueueFailRate: heavyQueueTotal > 0 ? heavyQueueFail / heavyQueueTotal : NaN,
  };
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

// ─── stage 4: rank slots ──────────────────────────────────────────────────
// Returns [{slot, score, evidence, fingerprint}] sorted desc by score.
// Slots scoring at the refuseHit veto level are dropped from results.
export function rankSlotsForTask(taskDescriptor, fingerprints, weights = DEFAULT_WEIGHTS) {
  if (!Array.isArray(fingerprints)) return [];
  const VETO_FLOOR = (weights.refuseHit || -100) + 1;  // anything ≤ veto floor is refused
  const scored = fingerprints
    .map(fp => {
      const { score, evidence } = scoreSlotForTask(fp, taskDescriptor, weights);
      return { slot: fp.slot, score, evidence, fingerprint: fp };
    })
    .filter(r => r.score > VETO_FLOOR);
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// Convenience: build a single-line summary for log/audit.
export function summarizeRanking(ranking, top = 3) {
  if (!Array.isArray(ranking) || ranking.length === 0) return "(no slots ranked)";
  const head = ranking.slice(0, top);
  return head.map(r => `${r.slot}=${r.score.toFixed(2)}[${r.evidence.slice(0, 2).join(",")}]`).join("  ");
}
