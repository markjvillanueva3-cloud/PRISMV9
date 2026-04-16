/**
 * WEDMKnowledgeDistillationEngine — WEDM AGI Phase 2 / U-P2-13
 *
 * Compresses raw WEDM tribal-knowledge tips (wedm-knowledge-tips.ts +
 * WEDM_MIT_TIPS.json and friends) into a tighter set of *actionable rules*.
 * The output is what the runtime consults during advice/guidance calls —
 * it's cheaper to search and more consistent than the raw tip corpus.
 *
 * Distillation scheme:
 *   1. Normalise each tip to a `DistilTip` with category + primary topic.
 *   2. Cluster tips by (category, primary topic) — the primary topic is
 *      extracted from the first tag that is not the engine family
 *      ("wire-edm", "wedm", "edm") or, if tags are missing, a bigram of
 *      significant title words.
 *   3. For every cluster emit one `DistilledRule` whose rationale is the
 *      concatenation of the tips' titles (deduped), whose `action` is the
 *      longest imperative sentence found in the tip bodies, and whose
 *      confidence is the mean of the member confidences.
 *   4. Rules are sorted descending by (confidence × cluster size) so the
 *      most load-bearing rules surface first.
 *
 * Exit gate (P2-MS4): with ≥107 input tips, distill to ≤100 rules while
 * keeping every tip attached to exactly one rule (no tip dropped).
 *
 * Distinct from TribalKnowledgeEngine (search over raw tips) — this engine
 * is the *compression layer* above it.
 */

// ────────────────────────── Types ──────────────────────────

export interface DistilTip {
  id: string;
  title: string;
  body: string;
  category: string;
  tags?: string[];
  confidence?: number; // 0..1 or 0..100 — auto-normalised
  source?: string;
}

export interface DistilledRule {
  id: string;
  category: string;
  topic: string;
  action: string;
  rationale: string;
  member_tip_ids: string[];
  confidence: number; // 0..1
  sources: string[];
}

export interface WEDMDistillationResult {
  rules: DistilledRule[];
  stats: {
    input_tip_count: number;
    rule_count: number;
    compression_ratio: number; // rule_count / input_tip_count
    mean_cluster_size: number;
    max_cluster_size: number;
  };
}

export interface DistillInput {
  tips: DistilTip[];
  /** Max rules to emit (default 100 per U-P2-13 exit gate). */
  max_rules?: number;
}

// ────────────────────────── Engine ──────────────────────────

const NOISE_TAGS = new Set([
  "wire-edm",
  "wedm",
  "edm",
  "cnc",
  "general",
  "wire_edm",
]);

// Words we ignore when deriving a topic from a title bigram.
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "for",
  "with",
  "at",
  "is",
  "are",
  "be",
  "on",
  "by",
  "from",
  "into",
  "as",
  "this",
  "that",
  "can",
  "will",
  "use",
  "when",
  "how",
]);

export class WEDMKnowledgeDistillationEngine {
  distill(input: DistillInput): WEDMDistillationResult {
    this.validate(input);
    const maxRules = input.max_rules ?? 100;

    const clusters = this.cluster(input.tips);

    const rules: DistilledRule[] = [];
    for (const [key, members] of clusters) {
      const [category, topic] = key.split("::");
      const sortedMembers = members.slice().sort((a, b) =>
        (this.normConfidence(b.confidence) -
          this.normConfidence(a.confidence)) || a.id.localeCompare(b.id),
      );
      const action = this.extractAction(sortedMembers);
      const rationale = uniq(sortedMembers.map((t) => t.title)).join("; ");
      const confidence =
        sortedMembers.reduce(
          (sum, t) => sum + this.normConfidence(t.confidence),
          0,
        ) / sortedMembers.length;
      const sources = uniq(
        sortedMembers
          .map((t) => t.source)
          .filter((s): s is string => !!s),
      );
      rules.push({
        id: `rule-${category}-${slug(topic)}`,
        category,
        topic,
        action,
        rationale,
        member_tip_ids: sortedMembers.map((t) => t.id),
        confidence,
        sources,
      });
    }

    rules.sort(
      (a, b) =>
        b.confidence * b.member_tip_ids.length -
        a.confidence * a.member_tip_ids.length,
    );

    // If we overshoot max_rules, merge the smallest low-confidence rules
    // into neighbours of the same category.
    let finalRules = rules;
    if (rules.length > maxRules) {
      finalRules = this.mergeExcessRules(rules, maxRules);
    }

    // Sanity: every input tip must be attached to exactly one rule.
    const attached = new Set<string>();
    for (const r of finalRules) {
      for (const m of r.member_tip_ids) {
        if (attached.has(m)) {
          throw new Error(
            `distillation invariant violated — tip ${m} assigned to multiple rules`,
          );
        }
        attached.add(m);
      }
    }
    if (attached.size !== input.tips.length) {
      throw new Error(
        `distillation invariant violated — ${input.tips.length - attached.size} tips unattached`,
      );
    }

    const sizes = finalRules.map((r) => r.member_tip_ids.length);
    return {
      rules: finalRules,
      stats: {
        input_tip_count: input.tips.length,
        rule_count: finalRules.length,
        compression_ratio: finalRules.length / input.tips.length,
        mean_cluster_size: mean(sizes),
        max_cluster_size: Math.max(...sizes),
      },
    };
  }

  // ─── internals ────────────────────────────────────────────

  private cluster(tips: DistilTip[]): Map<string, DistilTip[]> {
    const clusters = new Map<string, DistilTip[]>();
    for (const t of tips) {
      const key = `${this.normaliseCategory(t.category)}::${this.topicOf(t)}`;
      const bucket = clusters.get(key);
      if (bucket) bucket.push(t);
      else clusters.set(key, [t]);
    }
    return clusters;
  }

  private normaliseCategory(raw: string | undefined): string {
    if (!raw) return "general";
    const c = raw.toLowerCase().trim().replace(/\s+/g, "_");
    return c || "general";
  }

  private topicOf(t: DistilTip): string {
    const fromTag = (t.tags ?? []).find(
      (tag) => !NOISE_TAGS.has(tag.toLowerCase()),
    );
    if (fromTag) return fromTag.toLowerCase();
    // Fall back to first two significant words of title.
    const words = (t.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOP_WORDS.has(w) && w.length > 2);
    if (words.length === 0) return "misc";
    if (words.length === 1) return words[0];
    return `${words[0]}-${words[1]}`;
  }

  private extractAction(tips: DistilTip[]): string {
    // Preference order: use the title of the highest-confidence tip; if it
    // already reads as an imperative (starts with a verb), it is a good
    // rule action. Else look inside the body for the longest imperative
    // sentence.
    const hi = tips[0];
    if (hi.title && startsLikeImperative(hi.title)) {
      return hi.title.replace(/[.:]$/, "").trim();
    }
    const candidates = tips
      .flatMap((t) => (t.body || "").split(/(?<=[.?!])\s+/))
      .filter((s) => startsLikeImperative(s))
      .sort((a, b) => b.length - a.length);
    if (candidates.length) return candidates[0].trim().replace(/[.;]$/, "");
    return hi.title || "Apply the cluster's best-matching tip.";
  }

  /** Merge the lowest-ranked rules into the next-lowest same-category rule until |rules| ≤ max. */
  private mergeExcessRules(
    rules: DistilledRule[],
    max: number,
  ): DistilledRule[] {
    const working = rules.slice();
    while (working.length > max) {
      const idx = this.findLowestPriority(working);
      const donor = working.splice(idx, 1)[0];
      const hostIdx = this.findMergeHost(working, donor);
      const host = working[hostIdx];
      const merged = [...host.member_tip_ids, ...donor.member_tip_ids];
      const confidence =
        (host.confidence * host.member_tip_ids.length +
          donor.confidence * donor.member_tip_ids.length) /
        merged.length;
      working[hostIdx] = {
        ...host,
        member_tip_ids: merged,
        rationale: [host.rationale, donor.rationale]
          .filter(Boolean)
          .join("; "),
        sources: uniq([...host.sources, ...donor.sources]),
        confidence,
      };
      working.sort(
        (a, b) =>
          b.confidence * b.member_tip_ids.length -
          a.confidence * a.member_tip_ids.length,
      );
    }
    return working;
  }

  private findLowestPriority(rules: DistilledRule[]): number {
    let worst = 0;
    let worstScore = Infinity;
    for (let i = 0; i < rules.length; i++) {
      const s = rules[i].confidence * rules[i].member_tip_ids.length;
      if (s < worstScore) {
        worstScore = s;
        worst = i;
      }
    }
    return worst;
  }

  private findMergeHost(rules: DistilledRule[], donor: DistilledRule): number {
    // Prefer same-category host; fall back to highest-confidence rule.
    let hostIdx = -1;
    let hostScore = -Infinity;
    for (let i = 0; i < rules.length; i++) {
      const sameCat = rules[i].category === donor.category ? 1 : 0;
      const score =
        sameCat * 10 + rules[i].confidence * rules[i].member_tip_ids.length;
      if (score > hostScore) {
        hostScore = score;
        hostIdx = i;
      }
    }
    return hostIdx;
  }

  private normConfidence(raw: number | undefined): number {
    if (raw === undefined) return 0.75;
    if (!Number.isFinite(raw)) return 0.75;
    if (raw < 0) return 0;
    if (raw <= 1) return raw;
    // Assume 0..100 scale.
    return Math.min(1, raw / 100);
  }

  private validate(input: DistillInput): void {
    if (!Array.isArray(input.tips)) {
      throw new Error("tips array required");
    }
    if (input.tips.length === 0) {
      throw new Error("at least one tip required");
    }
    const seen = new Set<string>();
    for (const t of input.tips) {
      if (!t.id) throw new Error("tip requires id");
      if (seen.has(t.id)) throw new Error(`duplicate tip id: ${t.id}`);
      seen.add(t.id);
      if (!t.title) throw new Error(`tip ${t.id} requires title`);
    }
    if (
      input.max_rules !== undefined &&
      (!Number.isFinite(input.max_rules) || input.max_rules < 1)
    ) {
      throw new Error("max_rules must be >= 1 when provided");
    }
  }
}

// ────────────────────────── Helpers ──────────────────────────

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function slug(s: string): string {
  return (s || "misc")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "misc";
}

const IMPERATIVE_VERBS = new Set([
  "add",
  "adjust",
  "avoid",
  "check",
  "clear",
  "cut",
  "decrease",
  "dress",
  "ensure",
  "flush",
  "increase",
  "keep",
  "limit",
  "measure",
  "monitor",
  "never",
  "pre-drill",
  "raise",
  "reduce",
  "re-thread",
  "replace",
  "restart",
  "set",
  "skim",
  "stop",
  "switch",
  "tension",
  "use",
  "verify",
  "wait",
]);

function startsLikeImperative(s: string): boolean {
  const first = s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z-]/g, "");
  if (!first) return false;
  return IMPERATIVE_VERBS.has(first);
}

export const wedmKnowledgeDistillationEngine =
  new WEDMKnowledgeDistillationEngine();
