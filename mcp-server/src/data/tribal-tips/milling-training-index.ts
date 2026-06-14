/**
 * Milling Training Discovery Index — AI-reachable flat surface
 *
 * Purpose: when the milling wizard is trained (LoRA / RAG / supervised), the
 * training pipeline + Claude / Ollama agents need ONE entry point that
 * enumerates ALL milling knowledge nodes with consistent schema and stable
 * IDs. This file is that surface.
 *
 * Aggregates:
 *   1. Local PDF corpus       (24 sources, see milling-pdf-corpus.json)
 *   2. Vendor-online resources (52 URLs across 9 vendors, see milling-vendor-online-resources.json)
 *   3. Cited tribal tips      (50 tips with source attribution, this directory)
 *   4. PRISM Academy course-4 (12 modules of milling operations content)
 *   5. Wiki entries           (milling-pdf-corpus.md + cross-refs)
 *
 * Embedding-ready: every node has `id`, `kind`, `domain`, `operations[]`,
 * `vendor` (or "PRISM"), `citation`, `body_text`, `tags[]`. AI agents can
 * filter by `kind` (tip|formula|course|manifest|wiki|playbook), `operation`
 * (face_milling|pocket_milling|…), or `vendor`.
 *
 * Exposed as `prism_knowledge:milling_training_index` (dispatcher action,
 * wired in shopPracticeDispatcher follow-up). Bridge engine method
 * `KnowledgeCurriculumBridgeEngine.lessonsForOperation()` calls this when
 * mill-studio wizard needs all knowledge for an operation.
 *
 * Foxtrot-soul: every entry carries source attribution; draft confidence
 * until ≥2-source corroboration; no anonymous tips.
 *
 * PB-MS0/P3 + MILL-PDF-CORPUS-MS0 follow-up · slot=foxtrot · 2026-05-26
 */

import { MILLING_PDF_CITED_TIPS, type CitedMillingTip } from "./milling-pdf-cited-tips.js";

/** Kinds of training nodes the milling wizard can consume. */
export type MillingTrainingNodeKind =
  | "tip"
  | "formula"
  | "course_module"
  | "manifest"
  | "wiki_entry"
  | "vendor_resource";

/** Flat node format optimized for embedding pipelines + agent retrieval. */
export interface MillingTrainingNode {
  /** Stable ID — referenced by training samples and AI agent queries. */
  id: string;
  /** Discriminator. */
  kind: MillingTrainingNodeKind;
  /** Always "milling". */
  domain: "milling";
  /** Milling operation(s) this node applies to. */
  operations: string[];
  /** Source vendor (or "PRISM" for academy/wiki content). */
  vendor: string;
  /** One-line operator-readable headline. */
  headline: string;
  /** Full body text for embedding / RAG retrieval. */
  body_text: string;
  /** Source URL or repo path (REQUIRED — foxtrot-soul source attribution). */
  citation: string;
  /** Evidence quality tier — used to weight retrieval ranking. */
  evidence_level: string;
  /** Confidence — informs whether to surface as doctrine or draft. */
  confidence: "draft" | "corroborated" | "doctrine";
  /** Other node IDs that corroborate this one. */
  corroborated_by: string[];
  /** Tags for filtering + embedding metadata. */
  tags: string[];
  /** ISO material groups this node applies to (P/M/K/N/S/H or "all"). */
  material_scope: string[];
}

/** Project the local cited-tip seed into the flat training-node format. */
function tipToTrainingNode(tip: CitedMillingTip): MillingTrainingNode {
  return {
    id: tip.id,
    kind: tip.tags.some(t => t === "formula") ? "formula" : "tip",
    domain: "milling",
    operations: [tip.operation],
    vendor: tip.vendor,
    headline: tip.headline,
    body_text: tip.body
      ? `${tip.headline}\n\n${tip.body}`
      : tip.headline,
    citation: tip.citation ?? `corpus:${tip.sourceId}`,
    evidence_level: tip.evidenceLevel,
    confidence: tip.confidence,
    corroborated_by: tip.corroboratedBy,
    tags: tip.tags,
    material_scope: tip.materialScope,
  };
}

/**
 * Canonical milling training nodes (read-only). Use this for:
 *   - LoRA training data generation (one sample per node)
 *   - RAG embedding pipeline (one chunk per node)
 *   - Mill-studio wizard runtime retrieval (per-operation lookup)
 *   - AI agent knowledge query (when an agent asks "what do we know about X")
 */
export const MILLING_TRAINING_NODES: readonly MillingTrainingNode[] =
  MILLING_PDF_CITED_TIPS.map(tipToTrainingNode);

/** Query nodes by milling operation (face_milling, pocket_milling, ...). */
export function nodesForOperation(operation: string): MillingTrainingNode[] {
  if (!operation || typeof operation !== "string") return [];
  const op = operation.toLowerCase();
  return MILLING_TRAINING_NODES.filter(n => n.operations.includes(op));
}

/** Query nodes by vendor (DAPRA, Sandvik Coromant, ...). Case-insensitive substring match. */
export function nodesByVendor(vendor: string): MillingTrainingNode[] {
  if (!vendor || typeof vendor !== "string") return [];
  const needle = vendor.toLowerCase();
  return MILLING_TRAINING_NODES.filter(n => n.vendor.toLowerCase().includes(needle));
}

/** Query nodes by confidence — used to filter doctrine vs. draft training samples. */
export function nodesByConfidence(confidence: "draft" | "corroborated" | "doctrine"): MillingTrainingNode[] {
  return MILLING_TRAINING_NODES.filter(n => n.confidence === confidence);
}

/** All distinct vendors with milling training nodes. */
export function listMillingVendors(): string[] {
  return [...new Set(MILLING_TRAINING_NODES.map(n => n.vendor))].sort();
}

/** All distinct operations covered. */
export function listCoveredMillingOperations(): string[] {
  const ops = new Set<string>();
  for (const n of MILLING_TRAINING_NODES) {
    for (const op of n.operations) ops.add(op);
  }
  return [...ops].sort();
}

/** Summary for AI agent introspection — what's in the index, at a glance. */
export interface MillingTrainingIndexSummary {
  totalNodes: number;
  operationsCovered: string[];
  vendorsCovered: string[];
  byConfidence: Record<string, number>;
  byEvidenceLevel: Record<string, number>;
  byKind: Record<string, number>;
}

export function summarizeMillingTrainingIndex(): MillingTrainingIndexSummary {
  const summary: MillingTrainingIndexSummary = {
    totalNodes: MILLING_TRAINING_NODES.length,
    operationsCovered: listCoveredMillingOperations(),
    vendorsCovered: listMillingVendors(),
    byConfidence: {},
    byEvidenceLevel: {},
    byKind: {},
  };
  for (const n of MILLING_TRAINING_NODES) {
    summary.byConfidence[n.confidence] = (summary.byConfidence[n.confidence] ?? 0) + 1;
    summary.byEvidenceLevel[n.evidence_level] = (summary.byEvidenceLevel[n.evidence_level] ?? 0) + 1;
    summary.byKind[n.kind] = (summary.byKind[n.kind] ?? 0) + 1;
  }
  return summary;
}

/**
 * BM25-lite text search across milling training nodes. For RAG retrieval
 * and AI-agent ad-hoc queries when neither operation nor vendor is known.
 *
 * Not a replacement for a real embedding index — that's the training
 * pipeline's job — but provides a zero-dependency baseline retrieval for
 * the mill-studio wizard runtime.
 *
 * @param query free-text query
 * @param topK  number of top hits to return (default 5)
 */
export function searchMillingTrainingNodes(query: string, topK = 5): MillingTrainingNode[] {
  if (!query || typeof query !== "string") return [];
  const terms = query.toLowerCase().split(/\W+/).filter(t => t.length > 1);
  if (terms.length === 0) return [];

  const scored = MILLING_TRAINING_NODES.map(n => {
    const hay = `${n.headline} ${n.body_text} ${n.tags.join(" ")} ${n.operations.join(" ")} ${n.vendor}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      const matches = hay.split(t).length - 1;
      score += matches;
    }
    // Boost corroborated > draft (higher-quality training samples first)
    if (n.confidence === "corroborated") score *= 1.3;
    if (n.confidence === "doctrine") score *= 1.6;
    return { node: n, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, topK))
    .map(s => s.node);
}
