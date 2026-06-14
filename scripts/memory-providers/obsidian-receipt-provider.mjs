/**
 * obsidian-receipt-provider.mjs — receipt-routed memory provider.
 *
 * U-MWO05 (slot:bravo 2026-05-26). Second concrete MemoryProvider. Wraps the
 * U-DR08 dream-receipt staging path: write operations DO NOT mutate directly —
 * they stage proposals under state/shared/dream-artifacts/ for operator
 * review via /dream-review. Read/list/stats behave like ObsidianFeedProvider.
 *
 * Operator value: turn on for high-trust safe-write semantics. Every memory
 * write becomes a reviewable bundle; nothing lands until /dream-review
 * approves. Safer for fleet runs where peer memories must not silently fight.
 *
 * @module scripts/memory-providers/obsidian-receipt-provider
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MemoryProvider } from "./memory-provider-abc.mjs";
import { ObsidianFeedProvider, DEFAULT_MEMORY_DIR } from "./obsidian-feed-provider.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")), "..", "..");
const DEFAULT_ARTIFACTS_ROOT = path.join(PROJECT_ROOT, "state", "shared", "dream-artifacts");

export class ObsidianReceiptProvider extends MemoryProvider {
  constructor({ memoryDir = DEFAULT_MEMORY_DIR, artifactsRoot = DEFAULT_ARTIFACTS_ROOT, fsImpl = fs, now = Date.now } = {}) {
    super();
    this.feed = new ObsidianFeedProvider({ memoryDir, fsImpl });
    this.artifactsRoot = artifactsRoot;
    this.fs = fsImpl;
    this.now = now;
  }
  providerName() { return "obsidian-receipt"; }

  async list(opts) { return this.feed.list(opts); }
  async read(id)   { return this.feed.read(id); }
  async stats()    { return { ...(await this.feed.stats()), providerName: this.providerName() }; }

  /** Writes are STAGED as a single-proposal Hermes-Dreaming bundle. */
  async write(id, content, metadata) {
    const ts = new Date(this.now()).toISOString().replace(/[:.]/g, "-");
    const rand = crypto.randomBytes(3).toString("hex");
    const artifact_id = `receipt-${id.replace(/\.md$/, "").replace(/[^a-z0-9-]/gi, "-")}-${ts}-${rand}`;
    const dir = path.join(this.artifactsRoot, artifact_id);
    this.fs.mkdirSync(dir, { recursive: true });
    const manifest = {
      schemaVersion: "1.0.0",
      artifact_id,
      status: "staged",
      created_at: new Date(this.now()).toISOString(),
      created_by: "obsidian-receipt-provider",
      parent_trace: null,
      source_summary: `receipt-routed write proposal for ${id}`,
      proposal_count: 1,
      source_count: 0,
    };
    const proposal = {
      proposal_id: `mem-write-${id}`,
      target_path: `auto-memory/${id}`,
      mutation_type: "write",
      risk_class: "memory",
      before_sha256: null,
      after_content: content,
      provenance: metadata?.provenance || "obsidian-receipt-provider write()",
      rationale: metadata?.rationale || "deferred write — operator reviews before apply",
    };
    this.fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    this.fs.writeFileSync(path.join(dir, "proposals.jsonl"), JSON.stringify(proposal) + "\n");
    this.fs.writeFileSync(path.join(dir, "sources.jsonl"), "");
    this.fs.writeFileSync(path.join(dir, "REPORT.md"), `# Receipt-write proposal for ${id}\n\nApprove via \`/dream-review ${artifact_id}\``);
    return { id, bytes: Buffer.byteLength(content, "utf8"), written: false, staged: true, artifact_id };
  }

  /** Deletes are also staged as receipt proposals. */
  async delete(id) {
    const ts = new Date(this.now()).toISOString().replace(/[:.]/g, "-");
    const rand = crypto.randomBytes(3).toString("hex");
    const artifact_id = `receipt-del-${id.replace(/\.md$/, "").replace(/[^a-z0-9-]/gi, "-")}-${ts}-${rand}`;
    const dir = path.join(this.artifactsRoot, artifact_id);
    this.fs.mkdirSync(dir, { recursive: true });
    const proposal = {
      proposal_id: `mem-del-${id}`,
      target_path: `auto-memory/${id}`,
      mutation_type: "delete",
      risk_class: "memory",
      before_sha256: null,
      after_content: "",
      provenance: "obsidian-receipt-provider delete()",
      rationale: "deferred delete — operator reviews before apply",
    };
    this.fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
      schemaVersion: "1.0.0", artifact_id, status: "staged", created_at: new Date(this.now()).toISOString(),
      created_by: "obsidian-receipt-provider", parent_trace: null,
      source_summary: `receipt-routed delete proposal for ${id}`, proposal_count: 1, source_count: 0,
    }, null, 2));
    this.fs.writeFileSync(path.join(dir, "proposals.jsonl"), JSON.stringify(proposal) + "\n");
    this.fs.writeFileSync(path.join(dir, "sources.jsonl"), "");
    this.fs.writeFileSync(path.join(dir, "REPORT.md"), `# Receipt-delete proposal for ${id}\n\nApprove via \`/dream-review ${artifact_id}\``);
    return { id, deleted: false, staged: true, artifact_id };
  }
}
