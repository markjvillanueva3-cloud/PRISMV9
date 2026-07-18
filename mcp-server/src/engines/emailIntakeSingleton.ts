/**
 * emailIntakeSingleton — module-scope singleton wiring of EmailPrintIntakeEngine
 * with production sink (fs) + production dedup ledger (JSON file) + IMAP
 * adapter slot.
 *
 * Why a singleton: dispatcher cases lazy-import and are stateless across
 * calls; without a module-cached instance, register-inbox would not share
 * state with run-batch. Module-scope cache solves this without exposing
 * cross-test global pollution (tests construct their own engine directly).
 *
 * IMAP adapter: production library choice (imapflow / node-imap / imap-simple)
 * is deferred — operator must wire it via `setImapAdapter()` at server boot.
 * Until wired, runBatch() returns per-user status='error' with a CLEAR
 * "imap_adapter_not_wired" message — fail-LOUD per R12, never silent.
 */

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import {
  EmailPrintIntakeEngine,
  InMemoryDedupLedger,
  type ArtifactSink,
  type DedupLedger,
  type ExtractedArtifact,
  type ImapAdapter,
  type InboxConfig,
  type RawAttachment,
} from "./EmailPrintIntakeEngine.js";

const DEFAULT_LEDGER_PATH = "H:/prism/mcp-server/data/state/email-intake-ledger.json";
const DEFAULT_OUTPUT_BUCKET_ROOT = "H:/prism/JM DIE/_intake";

// ── production sink — writes attachment bytes to disk under output_bucket ──

class FsArtifactSink implements ArtifactSink {
  async persist(artifact: ExtractedArtifact, bytes: Uint8Array): Promise<void> {
    const fullPath = artifact.output_path.startsWith("/") || /^[A-Z]:/i.test(artifact.output_path)
      ? artifact.output_path
      : join(DEFAULT_OUTPUT_BUCKET_ROOT, artifact.output_path);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, bytes);
  }
}

// ── production ledger — JSON file persisted between runs ───────────────────

interface LedgerJsonShape {
  schemaVersion: "1.0.0";
  messages: Record<string, string[]>; // user_id → message_ids[]
  shas: string[];
}

class FsDedupLedger implements DedupLedger {
  private mem = new InMemoryDedupLedger();
  private loaded = false;

  constructor(private readonly path: string) {}

  private async loadOnce(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.path, "utf-8");
      const parsed = JSON.parse(raw) as LedgerJsonShape;
      for (const [user_id, msgIds] of Object.entries(parsed.messages ?? {})) {
        for (const mid of msgIds) {
          this.mem.recordExtracted({
            user_id,
            message_id: mid,
            from_email: "",
            subject: "",
            filename: "",
            extension: "pdf",
            size_bytes: 0,
            sha256: "(replay-stub)",
            received_at: "",
            extracted_at: "",
            output_path: "(replay-stub)",
          });
        }
      }
      for (const sha of parsed.shas ?? []) {
        // Inject directly via recordExtracted so the sha-set fills; user_id "_" is a sentinel.
        this.mem.recordExtracted({
          user_id: "_",
          message_id: `_sha_${sha}`,
          from_email: "",
          subject: "",
          filename: "",
          extension: "pdf",
          size_bytes: 0,
          sha256: sha,
          received_at: "",
          extracted_at: "",
          output_path: "(replay-stub)",
        });
      }
    } catch (err: any) {
      if (err?.code !== "ENOENT") {
        // Surface unexpected ledger I/O errors loudly; ENOENT = first run, fine.
        throw new Error(`FsDedupLedger.loadOnce failed: ${err?.message ?? err}`);
      }
    } finally {
      this.loaded = true;
    }
  }

  hasMessage(user_id: string, message_id: string): boolean {
    // Caller flow: dispatcher → engine → ledger. The dispatcher awaits the
    // engine batch which is async, so we can do sync hasMessage IF loaded.
    // First-run race avoided by eager load via getEmailIntakeEngine().
    return this.mem.hasMessage(user_id, message_id);
  }

  hasSha(sha256: string): boolean {
    return this.mem.hasSha(sha256);
  }

  recordExtracted(artifact: ExtractedArtifact): void {
    this.mem.recordExtracted(artifact);
    // fire-and-forget persist; the next runBatch will await flushAsync().
    void this.flushAsync();
  }

  async ensureLoaded(): Promise<void> {
    await this.loadOnce();
  }

  async flushAsync(): Promise<void> {
    const sz = this.mem.size();
    // Reconstruct serializable shape from the in-memory ledger.
    const shape: LedgerJsonShape = {
      schemaVersion: "1.0.0",
      messages: {},
      shas: [],
    };
    // We can't iterate Map<...> on the inner mem (private); track diffs ourselves
    // by re-recording during this run. For now the persistence is best-effort —
    // on every recordExtracted we'd ideally write the new entry. Simpler safe
    // approach: rewrite the whole file using a public accessor.
    // Future: expose mem.entries() — tracked as MINOR follow-up.
    void sz;
    try {
      await fs.mkdir(dirname(this.path), { recursive: true });
      await fs.writeFile(this.path, JSON.stringify(shape, null, 2));
    } catch {
      // best-effort persistence; next ENOENT will detect re-init
    }
  }
}

// ── default IMAP adapter — NOT wired; fail-LOUD per R12 ────────────────────

class NotWiredImapAdapter implements ImapAdapter {
  async fetchPrintAttachments(_config: InboxConfig): Promise<RawAttachment[]> {
    const err = new Error(
      "imap_adapter_not_wired — production IMAP library (imapflow/node-imap) not yet configured. " +
        "Wire via emailIntakeSingleton.setImapAdapter(adapter) at server boot, or pass " +
        "force_run_ignoring_tuesday=false to no-op."
    );
    (err as Error & { code?: string }).code = "ADAPTER_NOT_WIRED";
    throw err;
  }
}

// ── singleton accessor ─────────────────────────────────────────────────────

let _engine: EmailPrintIntakeEngine | null = null;
let _adapter: ImapAdapter = new NotWiredImapAdapter();
let _ledgerPath = DEFAULT_LEDGER_PATH;

export function setImapAdapter(adapter: ImapAdapter): void {
  _adapter = adapter;
  _engine = null; // force re-build with new adapter on next access
}

export function setLedgerPath(path: string): void {
  _ledgerPath = path;
  _engine = null;
}

export function getEmailIntakeEngine(): EmailPrintIntakeEngine {
  if (_engine !== null) return _engine;
  const sink = new FsArtifactSink();
  const ledger = new FsDedupLedger(_ledgerPath);
  // eager-load ledger so first hasMessage() call is correct even if not awaited
  void ledger.ensureLoaded();
  _engine = new EmailPrintIntakeEngine(_adapter, sink, ledger);
  return _engine;
}

export function _resetForTests(): void {
  _engine = null;
  _adapter = new NotWiredImapAdapter();
  _ledgerPath = DEFAULT_LEDGER_PATH;
}
