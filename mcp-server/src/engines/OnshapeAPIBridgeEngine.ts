// WIRE-EXEMPT: U-CAD-APP external-API bridge -- injected OnshapeTransport (REST client w/ credentials), no singleton; awaits an Onshape session host (delta/CAD), not a standalone prism_* dispatcher action.
/**
 * OnshapeAPIBridgeEngine — U-CAD-APP-09 (PHASE-48)
 *
 * REST API bridge between PRISM and Onshape cloud CAD. Provides:
 *
 *   - Document / workspace / version management
 *   - Part studio feature CRUD (via FeatureScript)
 *   - Assembly definition and mate operations
 *   - Configuration management
 *   - Export to STEP / STL / other formats
 *   - Webhook registration for collaboration events
 *   - Mass properties and bounding box queries
 *
 * Transport is injected — typically backed by Onshape's REST API with
 * OAuth2 authentication in production, or an in-memory stub for tests.
 *
 * @module engines/OnshapeAPIBridgeEngine
 */

import {
  OnshapeDocumentSchema,
  OnshapeElementSchema,
  OnshapeFeatureSchema,
  OnshapePartSchema,
  OnshapeAssemblyDefinitionSchema,
  OnshapeMassPropertiesSchema,
  OnshapeBoundingBoxSchema,
  OnshapeVersionSchema,
  OnshapeWorkspaceSchema,
  OnshapeWebhookSchema,
  OnshapeConfigurationSchema,
  OnshapeFeatureScriptResultSchema,
  OnshapeResponseSchema,
  ONSHAPE_COMMANDS,
  type OnshapeDocument,
  type OnshapeElement,
  type OnshapeFeature,
  type OnshapePart,
  type OnshapeAssemblyDefinition,
  type OnshapeMassProperties,
  type OnshapeBoundingBox,
  type OnshapeVersion,
  type OnshapeWorkspace,
  type OnshapeWebhook,
  type OnshapeConfiguration,
  type OnshapeFeatureScriptResult,
  type OnshapeCommand,
  type OnshapeResponse,
  type OnshapeExportOptions,
  type OnshapeCallLogEntry,
  type OnshapeWebhookEvent,
  type OnshapeFeatureType,
  type OnshapeMateType,
} from "../schemas/cadOnshapeSchema.js";

export interface OnshapeClock {
  now(): string;
  monotonicMs(): number;
}

export interface OnshapeTransport {
  /**
   * Send a REST API call to Onshape and return its response.
   */
  send(cmd: OnshapeCommand, args: Record<string, unknown>): OnshapeResponse;
}

function defaultClock(): OnshapeClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

export class OnshapeAPIBridgeEngine {
  private transport: OnshapeTransport;
  private clock: OnshapeClock;
  private log: OnshapeCallLogEntry[] = [];

  constructor(opts: { transport: OnshapeTransport; clock?: OnshapeClock }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
  }

  // ── Document operations ───────────────────────────────────────────────────

  getDocument(documentId: string): OnshapeDocument {
    const res = this.run("get_document", { documentId });
    this.throwIfFailed(res);
    return OnshapeDocumentSchema.parse(res.result);
  }

  listDocuments(opts: { ownerId?: string; filter?: string; limit?: number } = {}): OnshapeDocument[] {
    const res = this.run("list_documents", opts);
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((d) => OnshapeDocumentSchema.parse(d));
  }

  createDocument(name: string, opts: { description?: string; isPublic?: boolean } = {}): OnshapeDocument {
    const res = this.run("create_document", { name, ...opts });
    this.throwIfFailed(res);
    return OnshapeDocumentSchema.parse(res.result);
  }

  deleteDocument(documentId: string): boolean {
    const res = this.run("delete_document", { documentId });
    this.throwIfFailed(res);
    return true;
  }

  // ── Workspace / Version operations ────────────────────────────────────────

  getWorkspaces(documentId: string): OnshapeWorkspace[] {
    const res = this.run("get_workspaces", { documentId });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((w) => OnshapeWorkspaceSchema.parse(w));
  }

  getVersions(documentId: string): OnshapeVersion[] {
    const res = this.run("get_versions", { documentId });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((v) => OnshapeVersionSchema.parse(v));
  }

  createVersion(
    documentId: string,
    workspaceId: string,
    name: string,
    opts: { description?: string } = {},
  ): OnshapeVersion {
    const res = this.run("create_version", { documentId, workspaceId, name, ...opts });
    this.throwIfFailed(res);
    return OnshapeVersionSchema.parse(res.result);
  }

  // ── Element operations ────────────────────────────────────────────────────

  getElements(documentId: string, workspaceId: string): OnshapeElement[] {
    const res = this.run("get_elements", { documentId, workspaceId });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((e) => OnshapeElementSchema.parse(e));
  }

  // ── Part Studio operations ────────────────────────────────────────────────

  getPartStudioFeatures(
    documentId: string,
    workspaceId: string,
    elementId: string,
  ): OnshapeFeature[] {
    const res = this.run("get_part_studio_features", { documentId, workspaceId, elementId });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((f) => OnshapeFeatureSchema.parse(f));
  }

  addFeature(
    documentId: string,
    workspaceId: string,
    elementId: string,
    featureType: OnshapeFeatureType,
    parameters: Record<string, unknown>,
    opts: { name?: string } = {},
  ): OnshapeFeature {
    const res = this.run("add_feature", {
      documentId,
      workspaceId,
      elementId,
      featureType,
      parameters,
      ...opts,
    });
    this.throwIfFailed(res);
    return OnshapeFeatureSchema.parse(res.result);
  }

  updateFeature(
    documentId: string,
    workspaceId: string,
    elementId: string,
    featureId: string,
    parameters: Record<string, unknown>,
  ): OnshapeFeature {
    const res = this.run("update_feature", {
      documentId,
      workspaceId,
      elementId,
      featureId,
      parameters,
    });
    this.throwIfFailed(res);
    return OnshapeFeatureSchema.parse(res.result);
  }

  deleteFeature(
    documentId: string,
    workspaceId: string,
    elementId: string,
    featureId: string,
  ): boolean {
    const res = this.run("delete_feature", { documentId, workspaceId, elementId, featureId });
    this.throwIfFailed(res);
    return true;
  }

  getParts(documentId: string, workspaceId: string, elementId: string): OnshapePart[] {
    const res = this.run("get_parts", { documentId, workspaceId, elementId });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((p) => OnshapePartSchema.parse(p));
  }

  getPartMetadata(
    documentId: string,
    workspaceId: string,
    elementId: string,
    partId: string,
  ): Record<string, unknown> {
    const res = this.run("get_part_metadata", { documentId, workspaceId, elementId, partId });
    this.throwIfFailed(res);
    return res.result as Record<string, unknown>;
  }

  // ── Assembly operations ───────────────────────────────────────────────────

  getAssemblyDefinition(
    documentId: string,
    workspaceId: string,
    elementId: string,
  ): OnshapeAssemblyDefinition {
    const res = this.run("get_assembly_definition", { documentId, workspaceId, elementId });
    this.throwIfFailed(res);
    return OnshapeAssemblyDefinitionSchema.parse(res.result);
  }

  addMate(
    documentId: string,
    workspaceId: string,
    elementId: string,
    mateType: OnshapeMateType,
    matedEntities: unknown[],
    opts: { name?: string } = {},
  ): { id: string; name: string } {
    const res = this.run("add_mate", {
      documentId,
      workspaceId,
      elementId,
      mateType,
      matedEntities,
      ...opts,
    });
    this.throwIfFailed(res);
    const result = res.result as { id: string; name: string };
    return result;
  }

  // ── Mass properties / Bounding box ────────────────────────────────────────

  getMassProperties(
    documentId: string,
    workspaceId: string,
    elementId: string,
    partId?: string,
  ): OnshapeMassProperties {
    const res = this.run("get_mass_properties", { documentId, workspaceId, elementId, partId });
    this.throwIfFailed(res);
    return OnshapeMassPropertiesSchema.parse(res.result);
  }

  getBoundingBox(
    documentId: string,
    workspaceId: string,
    elementId: string,
    partId?: string,
  ): OnshapeBoundingBox {
    const res = this.run("get_bounding_box", { documentId, workspaceId, elementId, partId });
    this.throwIfFailed(res);
    return OnshapeBoundingBoxSchema.parse(res.result);
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  getConfiguration(
    documentId: string,
    workspaceId: string,
    elementId: string,
  ): OnshapeConfiguration {
    const res = this.run("get_configuration", { documentId, workspaceId, elementId });
    this.throwIfFailed(res);
    return OnshapeConfigurationSchema.parse(res.result);
  }

  setConfiguration(
    documentId: string,
    workspaceId: string,
    elementId: string,
    parameters: Array<{ parameterId: string; parameterValue: unknown }>,
  ): OnshapeConfiguration {
    const res = this.run("set_configuration", {
      documentId,
      workspaceId,
      elementId,
      parameters,
    });
    this.throwIfFailed(res);
    return OnshapeConfigurationSchema.parse(res.result);
  }

  // ── FeatureScript ─────────────────────────────────────────────────────────

  evaluateFeatureScript(
    documentId: string,
    workspaceId: string,
    elementId: string,
    script: string,
  ): OnshapeFeatureScriptResult {
    const res = this.run("evaluate_featurescript", {
      documentId,
      workspaceId,
      elementId,
      script,
    });
    this.throwIfFailed(res);
    return OnshapeFeatureScriptResultSchema.parse(res.result);
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportPart(
    documentId: string,
    workspaceId: string,
    elementId: string,
    partId: string,
    options: OnshapeExportOptions,
  ): { translationId: string; status: string } {
    const res = this.run("export_part", {
      documentId,
      workspaceId,
      elementId,
      partId,
      options,
    });
    this.throwIfFailed(res);
    return res.result as { translationId: string; status: string };
  }

  exportAssembly(
    documentId: string,
    workspaceId: string,
    elementId: string,
    options: OnshapeExportOptions,
  ): { translationId: string; status: string } {
    const res = this.run("export_assembly", {
      documentId,
      workspaceId,
      elementId,
      options,
    });
    this.throwIfFailed(res);
    return res.result as { translationId: string; status: string };
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────

  registerWebhook(
    url: string,
    events: OnshapeWebhookEvent[],
    opts: { filter?: string; collapseEvents?: boolean } = {},
  ): OnshapeWebhook {
    const res = this.run("register_webhook", { url, events, ...opts });
    this.throwIfFailed(res);
    return OnshapeWebhookSchema.parse(res.result);
  }

  deleteWebhook(webhookId: string): boolean {
    const res = this.run("delete_webhook", { webhookId });
    this.throwIfFailed(res);
    return true;
  }

  listWebhooks(): OnshapeWebhook[] {
    const res = this.run("list_webhooks", {});
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((w) => OnshapeWebhookSchema.parse(w));
  }

  // ── Thumbnail ─────────────────────────────────────────────────────────────

  getThumbnail(
    documentId: string,
    workspaceId: string,
    elementId: string,
    opts: { size?: "70x40" | "300x170" | "600x340" } = {},
  ): string {
    const res = this.run("get_thumbnail", { documentId, workspaceId, elementId, ...opts });
    this.throwIfFailed(res);
    return String(res.result);
  }

  // ── Logging ───────────────────────────────────────────────────────────────

  getCallLog(): OnshapeCallLogEntry[] {
    return [...this.log];
  }

  clearCallLog(): void {
    this.log = [];
  }

  p50LatencyMs(): number | undefined {
    if (this.log.length === 0) return undefined;
    const sorted = [...this.log].map((e) => e.durationMs).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.5)];
  }

  p95LatencyMs(): number | undefined {
    if (this.log.length === 0) return undefined;
    const sorted = [...this.log].map((e) => e.durationMs).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private run(command: OnshapeCommand, args: Record<string, unknown>): OnshapeResponse {
    const t0 = this.clock.monotonicMs();
    let res: OnshapeResponse;
    try {
      res = this.transport.send(command, args);
    } catch (err) {
      res = OnshapeResponseSchema.parse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        statusCode: 500,
      });
    }
    const durationMs = this.clock.monotonicMs() - t0;
    this.log.push({
      command,
      args,
      ok: res.ok,
      error: res.error,
      statusCode: res.statusCode,
      durationMs,
      at: this.clock.now(),
    });
    return res;
  }

  private throwIfFailed(res: OnshapeResponse): void {
    if (!res.ok) {
      const status = res.statusCode ? ` (HTTP ${res.statusCode})` : "";
      throw new Error((res.error ?? "Onshape API call failed") + status);
    }
  }
}
