/**
 * DreamArtifactBundleEngine — receipt-bundle format for staged self-improvement.
 *
 * Pure-core writer/reader for the 4-file receipt artifact that wraps a
 * proposed mutation set with provenance + diff metadata.  Format adopted
 * from Hermes Dreaming v0.1.0 (Tony Simons, https://github.com/asimons81/hermes-dreaming)
 * verbatim for cross-tool interop:
 *
 *     <bundle-root>/<artifact-id>/
 *       manifest.json       — run identification, schemaVersion, parent-trace
 *       REPORT.md           — human-readable summary (renders in /system-viz)
 *       sources.jsonl       — what got scanned (handoffs, memories, wiki, transcript)
 *       proposals.jsonl     — proposed mutations, one per line
 *
 * Pure-core only: returns serialized strings.  Filesystem writes are the
 * caller's responsibility (per PRISM convention: pure-core vs I/O wrapper).
 *
 * Composes with:
 *  - DreamLoopProposalEngine (HSE06) — `fromDreamLoopBatch()` adapter
 *  - MemoryDiffEngine        (HMEMV08) — `fromMemoryDiff()` adapter
 *
 * Used by DREAM-RECEIPT-MS0 dispatcher actions:
 *   prism_session:dream_diff, dream_validate, dream_apply, dream_discard, dream_status
 *
 * Spec: state/shared/specs/HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md
 * Memory: [[reference_hermes_dreaming_and_webwright_2026_05_26]]
 *
 * @module engines/DreamArtifactBundleEngine
 */

import { z } from "zod";
import type { DreamProposalBatch } from "./DreamLoopProposalEngine.js";
import type { MemoryDiff } from "./MemoryDiffEngine.js";

/** Schema version for the bundle format.  Minor bumps are forward-compat; major bumps require migration. */
export const BUNDLE_SCHEMA_VERSION = "1.0.0";

// SHA-256 hex = 64 chars; tolerate the "sha256:" prefix some callers use.
const SHA256_RE = /^(sha256:)?[0-9a-fA-F]{64}$/;

export const MutationTypeSchema = z.enum(["write", "patch", "append", "delete"]);
export type MutationType = z.infer<typeof MutationTypeSchema>;

export const RiskClassSchema = z.enum(["memory", "skill", "hook", "engine", "wiki", "other"]);
export type RiskClass = z.infer<typeof RiskClassSchema>;

export const SourceTypeSchema = z.enum(["handoff", "memory", "transcript", "wiki", "git-log", "manual", "other"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const ProposalStatusSchema = z.enum(["staged", "validated", "applied", "discarded", "failed"]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

/** ManifestSchema — what bundle this is, schema-versioned. */
export const ManifestSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  artifact_id: z.string().min(3).max(120),
  created_at: z.string().min(10).max(40),
  created_by: z.string().min(3).max(60),
  parent_trace: z.array(z.string().min(1).max(120)).max(20).default([]),
  source_summary: z.string().max(500).default(""),
  proposal_count: z.number().int().min(0).max(10_000),
  status: ProposalStatusSchema.default("staged"),
}).strict();
export type Manifest = z.infer<typeof ManifestSchema>;

/** ProposalSchema — one proposed mutation. */
export const ProposalSchema = z.object({
  proposal_id: z.string().min(3).max(120),
  target_path: z.string().min(1).max(500),
  mutation_type: MutationTypeSchema,
  risk_class: RiskClassSchema,
  before_sha256: z.string().regex(SHA256_RE).nullable(),
  after_content: z.string().max(1_000_000), // 1 MB hard cap per proposal
  provenance: z.string().min(1).max(500),
  rationale: z.string().max(2000).default(""),
}).strict();
export type Proposal = z.infer<typeof ProposalSchema>;

/** SourceSchema — one scanned source that fed the proposal set. */
export const SourceSchema = z.object({
  source_id: z.string().min(1).max(120),
  source_type: SourceTypeSchema,
  source_path: z.string().min(1).max(500),
  scanned_at: z.string().min(10).max(40),
  byte_count: z.number().int().min(0).max(100_000_000),
}).strict();
export type Source = z.infer<typeof SourceSchema>;

/** BundleSchema — the in-memory representation. */
export const BundleSchema = z.object({
  manifest: ManifestSchema,
  sources: z.array(SourceSchema).max(10_000),
  proposals: z.array(ProposalSchema).max(10_000),
  report: z.string().max(100_000),
}).strict();
export type Bundle = z.infer<typeof BundleSchema>;

export interface SerializedBundle {
  manifest: string;
  report: string;
  sources: string;   // jsonl, one Source per line
  proposals: string; // jsonl, one Proposal per line
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Inputs to `createBundle()` — caller supplies identity + summary; counts are derived. */
export const CreateBundleInputSchema = z.object({
  artifact_id: z.string().min(3).max(120),
  created_at: z.string().min(10).max(40),
  created_by: z.string().min(3).max(60),
  parent_trace: z.array(z.string().min(1).max(120)).max(20).optional(),
  source_summary: z.string().max(500).optional(),
  sources: z.array(SourceSchema).max(10_000).optional(),
  proposals: z.array(ProposalSchema).max(10_000).optional(),
}).strict();
export type CreateBundleInput = z.infer<typeof CreateBundleInputSchema>;

export class DreamArtifactBundleEngine {
  static readonly SCHEMA_VERSION = BUNDLE_SCHEMA_VERSION;

  /**
   * Create a new bundle from caller-supplied identity + (optional) initial sources/proposals.
   * Derives proposal_count for the manifest from the proposals array.
   *
   * @param input — bundle identity fields + optional initial source/proposal arrays
   * @returns a validated Bundle ready to serialize
   * @throws ZodError when any input field violates its schema
   */
  static createBundle(input: CreateBundleInput): Bundle {
    const v = CreateBundleInputSchema.parse(input);
    const sources = v.sources ?? [];
    const proposals = v.proposals ?? [];
    const manifest: Manifest = ManifestSchema.parse({
      schemaVersion: BUNDLE_SCHEMA_VERSION,
      artifact_id: v.artifact_id,
      created_at: v.created_at,
      created_by: v.created_by,
      parent_trace: v.parent_trace ?? [],
      source_summary: v.source_summary ?? "",
      proposal_count: proposals.length,
      status: "staged",
    });
    const bundle: Bundle = {
      manifest,
      sources,
      proposals,
      report: DreamArtifactBundleEngine.renderReport({ manifest, sources, proposals, report: "" }),
    };
    return BundleSchema.parse(bundle);
  }

  /**
   * Serialize a bundle into the 4 on-disk file contents.  No I/O — caller writes.
   *
   * @returns object with `manifest` (JSON), `report` (markdown), `sources` (jsonl), `proposals` (jsonl)
   */
  static serializeBundle(bundle: Bundle): SerializedBundle {
    const v = BundleSchema.parse(bundle);
    return {
      manifest: JSON.stringify(v.manifest, null, 2),
      report: v.report,
      sources: v.sources.map((s) => JSON.stringify(s)).join("\n") + (v.sources.length ? "\n" : ""),
      proposals: v.proposals.map((p) => JSON.stringify(p)).join("\n") + (v.proposals.length ? "\n" : ""),
    };
  }

  /**
   * Parse 4 file-content strings back into a Bundle.  Mirrors `serializeBundle()`.
   * Forward-compat: accepts any `schemaVersion` matching the major version (1.x.y).
   *
   * @throws Error on malformed JSON or unparseable jsonl line
   * @throws ZodError on schema-invalid content
   */
  static parseBundle(files: SerializedBundle): Bundle {
    let manifest: Manifest;
    try {
      const raw = JSON.parse(files.manifest) as Record<string, unknown>;
      manifest = ManifestSchema.parse(raw);
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error(`DreamArtifactBundleEngine.parseBundle: malformed manifest JSON — ${e.message}`);
      throw e;
    }
    if (!manifest.schemaVersion.startsWith("1.")) {
      throw new Error(`DreamArtifactBundleEngine.parseBundle: incompatible schemaVersion=${manifest.schemaVersion} (this engine handles 1.x)`);
    }

    const sources: Source[] = [];
    const sLines = files.sources.split("\n").filter((l) => l.length > 0);
    for (let i = 0; i < sLines.length; i++) {
      try {
        sources.push(SourceSchema.parse(JSON.parse(sLines[i])));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`DreamArtifactBundleEngine.parseBundle: malformed sources.jsonl line ${i + 1} — ${msg}`);
      }
    }

    const proposals: Proposal[] = [];
    const pLines = files.proposals.split("\n").filter((l) => l.length > 0);
    for (let i = 0; i < pLines.length; i++) {
      try {
        proposals.push(ProposalSchema.parse(JSON.parse(pLines[i])));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`DreamArtifactBundleEngine.parseBundle: malformed proposals.jsonl line ${i + 1} — ${msg}`);
      }
    }

    return BundleSchema.parse({ manifest, sources, proposals, report: files.report });
  }

  /**
   * Validate a bundle against the schema + cross-field invariants.  Non-throwing
   * — returns a structured result so callers can show all errors at once.
   *
   * Cross-field checks:
   *   - manifest.proposal_count === proposals.length
   *   - all parent_trace entries are well-formed
   *   - status:applied requires every proposal to carry a before_sha256
   */
  static validateBundle(bundle: unknown): ValidationResult {
    const errors: string[] = [];
    const parse = BundleSchema.safeParse(bundle);
    if (!parse.success) {
      for (const issue of parse.error.issues) {
        errors.push(`${issue.path.join(".") || "<root>"}: ${issue.message}`);
      }
      return { ok: false, errors };
    }
    const b = parse.data;
    if (b.manifest.proposal_count !== b.proposals.length) {
      errors.push(`manifest.proposal_count=${b.manifest.proposal_count} but proposals.length=${b.proposals.length}`);
    }
    if (b.manifest.status === "applied") {
      const noSha = b.proposals.filter((p) => p.before_sha256 === null);
      if (noSha.length > 0) {
        errors.push(`status:applied requires before_sha256 on every proposal; ${noSha.length} missing`);
      }
    }
    return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
  }

  /**
   * Append a proposal to a bundle, returning a NEW bundle (immutable update).
   * De-duplicates by proposal_id: if id already present, the existing proposal wins
   * (first-write protection — re-staging the same proposal is a no-op).
   */
  static appendProposal(bundle: Bundle, proposal: Proposal): Bundle {
    const b = BundleSchema.parse(bundle);
    const p = ProposalSchema.parse(proposal);
    const existing = b.proposals.find((x) => x.proposal_id === p.proposal_id);
    const proposals = existing ? b.proposals : [...b.proposals, p];
    const manifest: Manifest = { ...b.manifest, proposal_count: proposals.length };
    const next: Bundle = {
      manifest,
      sources: b.sources,
      proposals,
      report: DreamArtifactBundleEngine.renderReport({ manifest, sources: b.sources, proposals, report: "" }),
    };
    return BundleSchema.parse(next);
  }

  /** Append a source.  De-duplicates by source_id, same first-write-wins semantics. */
  static appendSource(bundle: Bundle, source: Source): Bundle {
    const b = BundleSchema.parse(bundle);
    const s = SourceSchema.parse(source);
    const existing = b.sources.find((x) => x.source_id === s.source_id);
    const sources = existing ? b.sources : [...b.sources, s];
    const next: Bundle = {
      manifest: b.manifest,
      sources,
      proposals: b.proposals,
      report: DreamArtifactBundleEngine.renderReport({ manifest: b.manifest, sources, proposals: b.proposals, report: "" }),
    };
    return BundleSchema.parse(next);
  }

  /** Render REPORT.md content from the manifest + collections.  Deterministic. */
  static renderReport(bundle: Bundle): string {
    const m = bundle.manifest;
    const riskCounts = new Map<RiskClass, number>();
    for (const p of bundle.proposals) {
      riskCounts.set(p.risk_class, (riskCounts.get(p.risk_class) ?? 0) + 1);
    }
    const riskLine = Array.from(riskCounts.entries())
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(" ") || "(none)";
    const sourceTypes = new Map<SourceType, number>();
    for (const s of bundle.sources) sourceTypes.set(s.source_type, (sourceTypes.get(s.source_type) ?? 0) + 1);
    const srcLine = Array.from(sourceTypes.entries()).sort().map(([k, v]) => `${k}=${v}`).join(" ") || "(none)";
    return [
      `# Dream Artifact ${m.artifact_id}`,
      ``,
      `- schemaVersion: ${m.schemaVersion}`,
      `- created_at: ${m.created_at}`,
      `- created_by: ${m.created_by}`,
      `- status: ${m.status}`,
      `- parent_trace: ${m.parent_trace.length ? m.parent_trace.join(" → ") : "(root)"}`,
      ``,
      `## Summary`,
      ``,
      m.source_summary || "(no summary)",
      ``,
      `## Proposals (${bundle.proposals.length})`,
      ``,
      `risk: ${riskLine}`,
      ``,
      `## Sources (${bundle.sources.length})`,
      ``,
      `type: ${srcLine}`,
      ``,
    ].join("\n");
  }

  /**
   * Composition adapter — convert a DreamLoopProposalEngine batch into bundle proposals.
   * Each refuse_rule + skill becomes a Proposal targeting the slot soul file
   * (or `.claude/commands/<skill-name>.md` for skills).
   */
  static fromDreamLoopBatch(
    batch: DreamProposalBatch,
    opts: { artifact_id: string; created_at: string; created_by: string; slot_soul_path: string; skill_root: string }
  ): Bundle {
    const proposals: Proposal[] = [];
    for (const r of batch.refuse_rules) {
      proposals.push(ProposalSchema.parse({
        proposal_id: `refuse-${batch.slot}-${r.rule}`,
        target_path: opts.slot_soul_path,
        mutation_type: "patch",
        risk_class: "memory",
        before_sha256: null,
        after_content: `+ ${r.rule}`,
        provenance: `dream-loop-proposal slot=${batch.slot} observed=${r.observed_count}× source="${r.source_correction.slice(0, 80)}"`,
        rationale: r.source_correction.slice(0, 1000),
      }));
    }
    for (const s of batch.skills) {
      proposals.push(ProposalSchema.parse({
        proposal_id: `skill-${batch.slot}-${s.name}`,
        target_path: `${opts.skill_root}/${s.name}.md`,
        mutation_type: "write",
        risk_class: "skill",
        before_sha256: null,
        after_content: `# ${s.name}\n\n${s.reason}\n\nTrigger: ${s.triggering_pattern}\n`,
        provenance: `dream-loop-proposal slot=${batch.slot} observed=${s.observed_count}× pattern="${s.triggering_pattern.slice(0, 80)}"`,
        rationale: s.reason,
      }));
    }
    return DreamArtifactBundleEngine.createBundle({
      artifact_id: opts.artifact_id,
      created_at: opts.created_at,
      created_by: opts.created_by,
      source_summary: `dream-loop slot=${batch.slot}: ${batch.refuse_rules.length} refuse, ${batch.skills.length} skills, ${batch.filtered_correction_count} filtered`,
      proposals,
    });
  }

  /**
   * Composition adapter — convert a MemoryDiff into bundle proposals.
   * Each added/removed/changed entry becomes one Proposal.
   */
  static fromMemoryDiff(
    diff: MemoryDiff,
    opts: { artifact_id: string; created_at: string; created_by: string; namespace_path: string }
  ): Bundle {
    const proposals: Proposal[] = [];
    for (const id of diff.added) {
      proposals.push(ProposalSchema.parse({
        proposal_id: `mem-add-${id}`,
        target_path: `${opts.namespace_path}/${id}`,
        mutation_type: "write",
        risk_class: "memory",
        before_sha256: null,
        after_content: "",
        provenance: `memory-diff added id=${id}`,
        rationale: "new entry in current snapshot, absent from baseline",
      }));
    }
    for (const id of diff.removed) {
      proposals.push(ProposalSchema.parse({
        proposal_id: `mem-del-${id}`,
        target_path: `${opts.namespace_path}/${id}`,
        mutation_type: "delete",
        risk_class: "memory",
        before_sha256: null,
        after_content: "",
        provenance: `memory-diff removed id=${id}`,
        rationale: "in baseline, absent from current snapshot",
      }));
    }
    for (const id of diff.changed) {
      proposals.push(ProposalSchema.parse({
        proposal_id: `mem-chg-${id}`,
        target_path: `${opts.namespace_path}/${id}`,
        mutation_type: "patch",
        risk_class: "memory",
        before_sha256: null,
        after_content: "",
        provenance: `memory-diff changed id=${id}`,
        rationale: "hash differs between baseline and current",
      }));
    }
    return DreamArtifactBundleEngine.createBundle({
      artifact_id: opts.artifact_id,
      created_at: opts.created_at,
      created_by: opts.created_by,
      source_summary: `memory-diff +${diff.added.length} -${diff.removed.length} ~${diff.changed.length} (=${diff.unchanged_count}) | a=${diff.total_a} b=${diff.total_b}`,
      proposals,
    });
  }

  /**
   * Return the bundle-format capability surface — schemaVersion + every enum
   * a client must understand to construct a valid bundle.  Backs the
   * `prism_session:dream_status` action (U-DR06).
   */
  static getCapabilities(): {
    schemaVersion: string;
    mutationTypes: readonly string[];
    riskClasses: readonly string[];
    sourceTypes: readonly string[];
    proposalStatuses: readonly string[];
  } {
    return {
      schemaVersion: BUNDLE_SCHEMA_VERSION,
      mutationTypes: MutationTypeSchema.options,
      riskClasses: RiskClassSchema.options,
      sourceTypes: SourceTypeSchema.options,
      proposalStatuses: ProposalStatusSchema.options,
    };
  }

  /**
   * Annotate every proposal in a bundle with `would_change` — true if the
   * after_content differs from the live content at the same target_path,
   * false if identical (no-op).  Pure-fn: caller supplies the live-content
   * map; the engine does NOT touch the filesystem.  Backs the
   * `prism_session:dream_diff` action (U-DR02).
   *
   * @param bundle — the artifact bundle
   * @param liveContent — map of `target_path` → live string content (omit if file doesn't exist)
   * @returns array of `{ proposal_id, target_path, mutation_type, would_change, reason }`
   */
  static diffAgainstLive(
    bundle: Bundle,
    liveContent: Readonly<Record<string, string>>
  ): { proposal_id: string; target_path: string; mutation_type: MutationType; would_change: boolean; reason: string }[] {
    const b = BundleSchema.parse(bundle);
    const out: { proposal_id: string; target_path: string; mutation_type: MutationType; would_change: boolean; reason: string }[] = [];
    for (const p of b.proposals) {
      const live = liveContent[p.target_path];
      let would_change = true;
      let reason = "live content differs from after_content";
      if (p.mutation_type === "delete") {
        would_change = live !== undefined;
        reason = would_change ? "live file exists; delete will remove it" : "live file already absent; delete is no-op";
      } else if (p.mutation_type === "write" || p.mutation_type === "append" || p.mutation_type === "patch") {
        if (live === undefined) {
          would_change = true;
          reason = "live file does not exist; mutation will create";
        } else if (live === p.after_content) {
          would_change = false;
          reason = "live content already matches after_content; no-op";
        }
      }
      out.push({
        proposal_id: p.proposal_id,
        target_path: p.target_path,
        mutation_type: p.mutation_type,
        would_change,
        reason,
      });
    }
    return out;
  }

  /**
   * Compute the apply-plan for a bundle without doing any I/O.  Backs the
   * `prism_session:dream_apply` action (U-DR04).
   *
   * Filters proposals by `approveList` ("all" or an explicit string[] of
   * proposal_ids), then for each approved proposal:
   *   - mutation_type write|append|patch → "writes" entry with backup_target
   *   - mutation_type delete → "deletes" entry with backup_target
   *   - unapproved → "skipped" entry with reason
   *
   * The caller (dispatcher) reads each target_path's current content, writes
   * it to backup_target FIRST, then applies the write/delete.  Order matters:
   * backup must succeed before mutation.  This engine just emits the plan.
   *
   * @param bundle — the artifact bundle
   * @param approveList — "all" or an explicit list of proposal_ids to apply
   * @param backupRoot — directory root for live-state backups
   * @returns ApplyPlan with writes/deletes/skipped arrays
   */
  static planApply(
    bundle: Bundle,
    approveList: "all" | readonly string[],
    backupRoot: string
  ): {
    writes: { proposal_id: string; target_path: string; after_content: string; backup_target: string }[];
    deletes: { proposal_id: string; target_path: string; backup_target: string }[];
    skipped: { proposal_id: string; reason: string }[];
  } {
    const b = BundleSchema.parse(bundle);
    if (typeof backupRoot !== "string" || backupRoot.length === 0) {
      throw new Error("DreamArtifactBundleEngine.planApply: backupRoot must be a non-empty string");
    }
    const cleanedRoot = backupRoot.replace(/\/+$/, "");
    const approveSet = approveList === "all" ? null : new Set(approveList);
    const writes: { proposal_id: string; target_path: string; after_content: string; backup_target: string }[] = [];
    const deletes: { proposal_id: string; target_path: string; backup_target: string }[] = [];
    const skipped: { proposal_id: string; reason: string }[] = [];

    for (const p of b.proposals) {
      const approved = approveSet === null || approveSet.has(p.proposal_id);
      if (!approved) {
        skipped.push({ proposal_id: p.proposal_id, reason: "not in approveList" });
        continue;
      }
      const backup_target = `${cleanedRoot}/${b.manifest.artifact_id}/${p.target_path}`;
      if (p.mutation_type === "delete") {
        deletes.push({ proposal_id: p.proposal_id, target_path: p.target_path, backup_target });
      } else {
        writes.push({
          proposal_id: p.proposal_id,
          target_path: p.target_path,
          after_content: p.after_content,
          backup_target,
        });
      }
    }
    return { writes, deletes, skipped };
  }

  /**
   * Mark a bundle as discarded.  Returns a NEW bundle with manifest.status
   * flipped to "discarded" and an `archive_path` computed under `archiveRoot`.
   * The caller is responsible for moving the bundle directory to the archive;
   * this engine only mutates the manifest.  Backs the
   * `prism_session:dream_discard` action (U-DR05).
   */
  static markDiscarded(
    bundle: Bundle,
    archiveRoot: string
  ): { bundle: Bundle; archive_path: string } {
    const b = BundleSchema.parse(bundle);
    if (typeof archiveRoot !== "string" || archiveRoot.length === 0) {
      throw new Error("DreamArtifactBundleEngine.markDiscarded: archiveRoot must be a non-empty string");
    }
    const cleanedRoot = archiveRoot.replace(/\/+$/, "");
    const archive_path = `${cleanedRoot}/${b.manifest.artifact_id}`;
    const next: Bundle = {
      manifest: { ...b.manifest, status: "discarded" },
      sources: b.sources,
      proposals: b.proposals,
      report: b.report,
    };
    return { bundle: BundleSchema.parse(next), archive_path };
  }
}

export const dreamArtifactBundleEngine = DreamArtifactBundleEngine;
