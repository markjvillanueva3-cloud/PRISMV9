/**
 * CADWorldModelEngine — CAD-COMPLETE-MS0 / U-AI-02
 * =================================================
 *
 * The CAD agent's belief-state of a live CAD document. The agent cannot
 * see the CAD application's document tree directly between calls, so it
 * keeps a world model: the bodies, sketches, features, parameters,
 * selection and active units it *believes* the document contains. Every
 * operation the agent issues is also applied to this model, so the agent
 * can reason about what is valid next, preview a plan (U-AI-07), wrap a
 * sequence in a transaction (U-AI-08), and — critically — detect DRIFT
 * when the model and the real document disagree.
 *
 * The model is a deterministic reducer: applyOp(state, op) → state.
 * Inconsistent operations (deleting an entity that does not exist,
 * creating a duplicate id) THROW rather than silently no-op — a belief
 * error must surface so the agent can re-sync via detectDrift().
 *
 * Documents are keyed by docId so the agent can track several open CAD
 * documents at once (mirrors CADAppCircuitBreakerEngine's per-app keying).
 *
 * @module engines/CADWorldModelEngine
 * @version 1.0.0
 */

export type CADUnits = "mm" | "in";

export type CADEntityKind = "body" | "sketch" | "feature" | "plane" | "axis" | "component";

/** One entity in the believed CAD document tree. */
export interface CADEntity {
  id: string;
  kind: CADEntityKind;
  name: string;
  /** Parent entity id, or null for a top-level entity. */
  parentId: string | null;
  /** 1-based index of the operation that created this entity. */
  createdAtOp: number;
}

/** A serialisable snapshot of one document's believed state. */
export interface CADWorldState {
  docId: string;
  entities: CADEntity[];
  parameters: Record<string, number>;
  selection: string[];
  units: CADUnits;
  /** Count of operations applied since the document was created. */
  opCount: number;
}

/** One operation to apply to the world model. */
export interface CADWorldOp {
  /** Operation kind, e.g. "create_body", "extrude", "delete", "set_parameter". */
  kind: string;
  /** Target / new-entity id. Auto-generated for a create op when omitted. */
  entityId?: string;
  /** Entity kind for a create op (inferred from `kind` tokens when omitted). */
  entityKind?: CADEntityKind;
  /** Display name for a create / feature op. */
  name?: string;
  /** Parent entity id for a create op. */
  parentId?: string;
  /** Parameter name for a set-parameter op. */
  parameter?: string;
  /** Parameter value for a set-parameter op — must be finite. */
  value?: number;
  /** New units for a set-units op. */
  units?: CADUnits;
  /** Selection list for a select op. */
  selection?: string[];
}

/** Difference between two world states. */
export interface CADWorldDiff {
  addedEntities: string[];
  removedEntities: string[];
  parametersChanged: string[];
  selectionChanged: boolean;
  unitsChanged: boolean;
  /** True when nothing changed. */
  identical: boolean;
}

/** What the agent actually observed when it queried the real CAD document. */
export interface CADWorldObservation {
  entityIds: string[];
  parameters?: Record<string, number>;
  units?: CADUnits;
}

/** Result of comparing the believed model against a real observation. */
export interface CADWorldDrift {
  docId: string;
  inSync: boolean;
  /** Entities the model believes exist but the real document does not have. */
  missingFromActual: string[];
  /** Entities the real document has that the model does not know about. */
  extraInActual: string[];
  /** Parameters whose believed value disagrees with the observed value. */
  parameterMismatches: { name: string; believed: number; actual: number }[];
  /** Parameters the real document carries that the model does not know about. */
  unknownParameters: string[];
  unitsMismatch: boolean;
  severity: "none" | "minor" | "major";
  reasoning: string[];
}

/** Parameter comparison epsilon — guards float round-trip noise. */
const PARAM_EPSILON = 1e-9;

type OpCategory = "create" | "delete" | "feature" | "parameter" | "units" | "select" | "noop";

/** Op-kind keyword → category. Keyword sets are disjoint; matching is
 *  token-exact (the kind is split into words) so "widget" never matches
 *  the "draw"/"add" create keywords. */
const OP_KEYWORDS: ReadonlyArray<{ category: OpCategory; keywords: readonly string[] }> = [
  { category: "parameter", keywords: ["parameter", "param"] },
  { category: "units", keywords: ["units", "unit"] },
  { category: "select", keywords: ["select", "selection", "deselect"] },
  { category: "delete", keywords: ["delete", "remove", "destroy"] },
  {
    category: "feature",
    keywords: ["extrude", "revolve", "fillet", "chamfer", "hole", "pocket", "pattern", "shell", "loft", "sweep", "mirror", "rib", "draft"],
  },
  { category: "create", keywords: ["create", "add", "new", "insert", "sketch", "draw", "body", "plane", "axis", "component"] },
];

const ENTITY_KIND_TOKENS: readonly CADEntityKind[] = ["body", "sketch", "plane", "axis", "component"];

/** Split an op kind into lowercase word tokens — snake_case, kebab-case,
 *  dotted, and camelCase forms all handled. */
function tokenizeKind(kind: string): string[] {
  return kind
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_\-./]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0);
}

function classifyOp(tokens: string[]): OpCategory {
  for (const rule of OP_KEYWORDS) {
    if (rule.keywords.some((kw) => tokens.includes(kw))) return rule.category;
  }
  return "noop";
}

interface MutableWorld {
  docId: string;
  entities: Map<string, CADEntity>;
  parameters: Map<string, number>;
  selection: string[];
  units: CADUnits;
  opCount: number;
  nextSeq: number;
  checkpoint: CADWorldState;
}

export class CADWorldModelEngine {
  private readonly docs = new Map<string, MutableWorld>();

  /** Get a document's world (created empty if absent). */
  getOrCreate(docId: string, units: CADUnits = "mm"): CADWorldState {
    return this.stateOf(this.ensure(docId, units));
  }

  /**
   * Apply one operation to the document, returning the new believed state.
   * An operation inconsistent with the current model (delete of an unknown
   * entity, duplicate create id, non-finite parameter) THROWS — a belief
   * error must surface, not be silently swallowed.
   */
  applyOp(docId: string, op: CADWorldOp): CADWorldState {
    const w = this.ensure(docId);
    if (!op || typeof op !== "object") throw new Error("CADWorldModelEngine: op must be an object");
    const kind = String(op.kind ?? "").trim();
    if (kind.length === 0) throw new Error("CADWorldModelEngine: op.kind must be a non-empty string");

    const tokens = tokenizeKind(kind);
    const category = classifyOp(tokens);
    // opCount is committed only AFTER the op succeeds — a rejected op must
    // not leave the belief-state's op counter permanently advanced.
    const opIndex = w.opCount + 1;

    switch (category) {
      case "create":
        this.applyCreate(w, op, tokens, opIndex);
        break;
      case "delete":
        this.applyDelete(w, op);
        break;
      case "feature":
        this.applyFeature(w, op, kind, opIndex);
        break;
      case "parameter":
        this.applyParameter(w, op);
        break;
      case "units":
        this.applyUnits(w, op);
        break;
      case "select":
        this.applySelect(w, op);
        break;
      case "noop":
        // A recompute / cosmetic op (rebuild, regenerate, set_color, zoom).
        // It still counts toward opCount — the agent issued it — but the
        // believed entity / parameter set is structurally unchanged.
        break;
    }
    w.opCount = opIndex;
    return this.stateOf(w);
  }

  /** Apply a batch of operations in order; throws on the first inconsistent op. */
  applyOps(docId: string, ops: CADWorldOp[]): CADWorldState {
    if (!Array.isArray(ops)) throw new Error("CADWorldModelEngine: ops must be an array");
    let state = this.getOrCreate(docId);
    for (const op of ops) state = this.applyOp(docId, op);
    return state;
  }

  /** Current believed state of a document (created empty if absent). */
  getState(docId: string): CADWorldState {
    return this.stateOf(this.ensure(docId));
  }

  /** Save the document's current state as its diff baseline. */
  checkpoint(docId: string): CADWorldState {
    const w = this.ensure(docId);
    w.checkpoint = this.stateOf(w);
    return w.checkpoint;
  }

  /** Diff the document's current state against its last checkpoint
   *  (the empty creation state until checkpoint() is first called). */
  diffFromCheckpoint(docId: string): CADWorldDiff {
    const w = this.ensure(docId);
    return CADWorldModelEngine.diff(w.checkpoint, this.stateOf(w));
  }

  /** Pure structural diff between two world states. */
  static diff(before: CADWorldState, after: CADWorldState): CADWorldDiff {
    const beforeIds = new Set(before.entities.map((e) => e.id));
    const afterIds = new Set(after.entities.map((e) => e.id));
    const addedEntities = [...afterIds].filter((id) => !beforeIds.has(id));
    const removedEntities = [...beforeIds].filter((id) => !afterIds.has(id));

    const paramKeys = new Set([...Object.keys(before.parameters), ...Object.keys(after.parameters)]);
    const parametersChanged: string[] = [];
    for (const k of paramKeys) {
      const b = before.parameters[k];
      const a = after.parameters[k];
      if (b === undefined || a === undefined || Math.abs(b - a) > PARAM_EPSILON) parametersChanged.push(k);
    }

    const selectionChanged =
      before.selection.length !== after.selection.length ||
      [...before.selection].sort().join(" ") !== [...after.selection].sort().join(" ");
    const unitsChanged = before.units !== after.units;
    const identical =
      addedEntities.length === 0 &&
      removedEntities.length === 0 &&
      parametersChanged.length === 0 &&
      !selectionChanged &&
      !unitsChanged;

    return { addedEntities, removedEntities, parametersChanged, selectionChanged, unitsChanged, identical };
  }

  /** Compare the believed model against a real observation of the document. */
  detectDrift(docId: string, observed: CADWorldObservation): CADWorldDrift {
    const w = this.ensure(docId);
    if (!observed || typeof observed !== "object" || !Array.isArray(observed.entityIds)) {
      throw new Error("CADWorldModelEngine: observation must carry an entityIds array");
    }
    const believed = new Set(w.entities.keys());
    const actual = new Set(observed.entityIds.map((id) => String(id)));
    const missingFromActual = [...believed].filter((id) => !actual.has(id));
    const extraInActual = [...actual].filter((id) => !believed.has(id));

    const parameterMismatches: { name: string; believed: number; actual: number }[] = [];
    const unknownParameters: string[] = [];
    if (observed.parameters && typeof observed.parameters === "object") {
      for (const [name, actualVal] of Object.entries(observed.parameters)) {
        const believedVal = w.parameters.get(name);
        if (believedVal === undefined) {
          // The real document carries a parameter the model never set.
          unknownParameters.push(name);
        } else if (!Number.isFinite(actualVal) || Math.abs(believedVal - actualVal) > PARAM_EPSILON) {
          // A non-finite observed value is itself a divergence — never silently in-sync.
          parameterMismatches.push({ name, believed: believedVal, actual: actualVal });
        }
      }
    }
    const unitsMismatch = observed.units !== undefined && observed.units !== w.units;

    const paramDrift = parameterMismatches.length > 0 || unknownParameters.length > 0;
    const structural = missingFromActual.length > 0 || extraInActual.length > 0 || unitsMismatch;
    const inSync = !structural && !paramDrift;
    const severity: CADWorldDrift["severity"] = inSync ? "none" : structural ? "major" : "minor";

    const reasoning: string[] = [];
    if (inSync) reasoning.push("Believed model matches the observed document.");
    if (missingFromActual.length > 0)
      reasoning.push(`${missingFromActual.length} believed entity(ies) absent from the real document.`);
    if (extraInActual.length > 0)
      reasoning.push(`${extraInActual.length} real entity(ies) the model does not know about.`);
    if (unitsMismatch) reasoning.push(`Units mismatch — model believes ${w.units}, document is ${observed.units}.`);
    if (parameterMismatches.length > 0)
      reasoning.push(`${parameterMismatches.length} parameter value(s) disagree.`);
    if (unknownParameters.length > 0)
      reasoning.push(`${unknownParameters.length} real parameter(s) the model does not know about.`);
    if (!inSync) reasoning.push(`Drift severity ${severity.toUpperCase()} — agent should re-sync before proceeding.`);

    return { docId: w.docId, inSync, missingFromActual, extraInActual, parameterMismatches, unknownParameters, unitsMismatch, severity, reasoning };
  }

  /** Replace a document's believed state from a prior snapshot (for U-AI-08 rollback). */
  restore(docId: string, state: CADWorldState): CADWorldState {
    const id = this.normalizeDocId(docId);
    if (!state || typeof state !== "object" || !Array.isArray(state.entities)) {
      throw new Error("CADWorldModelEngine: restore requires a valid CADWorldState");
    }
    const w = this.rebuild(id, state);
    // restore establishes a fresh diff baseline — the restored state itself,
    // not the empty creation state — so diffFromCheckpoint() stays meaningful
    // (the U-AI-08 transaction-rollback contract depends on this).
    w.checkpoint = this.stateOf(w);
    this.docs.set(id, w);
    return this.stateOf(w);
  }

  /** List every tracked document id. */
  list(): string[] {
    return [...this.docs.keys()];
  }

  /** Reset one document (or all) back to a fresh empty model. */
  reset(docId?: string): void {
    if (docId === undefined) {
      this.docs.clear();
      return;
    }
    this.docs.delete(this.normalizeDocId(docId));
  }

  // --- internal ---

  private applyCreate(w: MutableWorld, op: CADWorldOp, tokens: string[], opIndex: number): void {
    // Validate before generating an id so a rejected create leaves no
    // gap in the auto-id sequence and no half-applied state.
    const parentId = op.parentId !== undefined ? String(op.parentId).trim() : null;
    if (parentId && !w.entities.has(parentId)) {
      throw new Error(`CADWorldModelEngine: parent entity "${parentId}" does not exist`);
    }
    const explicitId = op.entityId !== undefined ? String(op.entityId).trim() : "";
    if (explicitId.length > 0 && w.entities.has(explicitId)) {
      throw new Error(`CADWorldModelEngine: duplicate entity id "${explicitId}"`);
    }
    const id = explicitId.length > 0 ? explicitId : `ent-${w.nextSeq++}`;
    const kind: CADEntityKind = op.entityKind ?? this.inferEntityKind(tokens);
    const name = op.name !== undefined && String(op.name).trim().length > 0 ? String(op.name).trim() : `${kind}-${id}`;
    w.entities.set(id, { id, kind, name, parentId: parentId || null, createdAtOp: opIndex });
  }

  private applyDelete(w: MutableWorld, op: CADWorldOp): void {
    const id = String(op.entityId ?? "").trim();
    if (id.length === 0) throw new Error("CADWorldModelEngine: a delete op requires entityId");
    if (!w.entities.has(id)) throw new Error(`CADWorldModelEngine: cannot delete unknown entity "${id}"`);
    const toRemove = this.collectSubtree(w, id);
    for (const r of toRemove) w.entities.delete(r);
    w.selection = w.selection.filter((s) => !toRemove.has(s));
  }

  private applyFeature(w: MutableWorld, op: CADWorldOp, kind: string, opIndex: number): void {
    const target = String(op.entityId ?? "").trim();
    if (target.length === 0) throw new Error("CADWorldModelEngine: a feature op requires entityId (the entity it acts on)");
    if (!w.entities.has(target)) throw new Error(`CADWorldModelEngine: feature target "${target}" does not exist`);
    const featureId = `feat-${w.nextSeq++}`;
    const name = op.name !== undefined && String(op.name).trim().length > 0 ? String(op.name).trim() : `${kind}-${featureId}`;
    w.entities.set(featureId, { id: featureId, kind: "feature", name, parentId: target, createdAtOp: opIndex });
  }

  private applyParameter(w: MutableWorld, op: CADWorldOp): void {
    const name = String(op.parameter ?? "").trim();
    if (name.length === 0) throw new Error("CADWorldModelEngine: a parameter op requires a parameter name");
    const value = op.value;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`CADWorldModelEngine: parameter "${name}" requires a finite numeric value`);
    }
    w.parameters.set(name, value);
  }

  private applyUnits(w: MutableWorld, op: CADWorldOp): void {
    const u = op.units;
    if (u !== "mm" && u !== "in") throw new Error('CADWorldModelEngine: a units op requires units "mm" or "in"');
    // Changing units records the active unit only — it does NOT convert
    // parameter values; numeric conversion is UnitOfMeasureDisambiguationEngine's job.
    w.units = u;
  }

  private applySelect(w: MutableWorld, op: CADWorldOp): void {
    const raw = Array.isArray(op.selection)
      ? op.selection
      : op.entityId !== undefined
        ? [op.entityId]
        : [];
    const sel = raw.map((s) => String(s).trim()).filter((s) => s.length > 0);
    for (const s of sel) {
      if (!w.entities.has(s)) throw new Error(`CADWorldModelEngine: cannot select unknown entity "${s}"`);
    }
    w.selection = [...new Set(sel)];
  }

  /** All ids in the subtree rooted at `id`, inclusive. */
  private collectSubtree(w: MutableWorld, id: string): Set<string> {
    const out = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const e of w.entities.values()) {
        if (e.parentId !== null && out.has(e.parentId) && !out.has(e.id)) {
          out.add(e.id);
          grew = true;
        }
      }
    }
    return out;
  }

  private inferEntityKind(tokens: string[]): CADEntityKind {
    for (const k of ENTITY_KIND_TOKENS) if (tokens.includes(k)) return k;
    return "body";
  }

  private ensure(docId: string, units: CADUnits = "mm"): MutableWorld {
    const id = this.normalizeDocId(docId);
    let w = this.docs.get(id);
    if (!w) {
      w = {
        docId: id,
        entities: new Map(),
        parameters: new Map(),
        selection: [],
        units,
        opCount: 0,
        nextSeq: 1,
        checkpoint: { docId: id, entities: [], parameters: {}, selection: [], units, opCount: 0 },
      };
      this.docs.set(id, w);
    }
    return w;
  }

  private normalizeDocId(docId: string): string {
    const id = String(docId ?? "").trim();
    if (id.length === 0) throw new Error("CADWorldModelEngine: docId must be a non-empty string");
    return id;
  }

  /** Rebuild a MutableWorld from a serialised state — used by restore(). */
  private rebuild(id: string, state: CADWorldState): MutableWorld {
    const entities = new Map<string, CADEntity>();
    let maxSeq = 0;
    for (const e of state.entities) {
      entities.set(e.id, { id: e.id, kind: e.kind, name: e.name, parentId: e.parentId ?? null, createdAtOp: e.createdAtOp });
      const m = e.id.match(/^(?:ent|feat)-(\d+)$/);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
    const units: CADUnits = state.units === "in" ? "in" : "mm";
    return {
      docId: id,
      entities,
      parameters: new Map(Object.entries(state.parameters ?? {})),
      selection: [...(state.selection ?? [])],
      units,
      opCount: Number.isFinite(state.opCount) ? state.opCount : 0,
      nextSeq: maxSeq + 1,
      checkpoint: { docId: id, entities: [], parameters: {}, selection: [], units, opCount: 0 },
    };
  }

  /** Deep, serialisable snapshot of a mutable world. */
  private stateOf(w: MutableWorld): CADWorldState {
    return {
      docId: w.docId,
      entities: [...w.entities.values()].map((e) => ({ ...e })),
      parameters: Object.fromEntries(w.parameters),
      selection: [...w.selection],
      units: w.units,
      opCount: w.opCount,
    };
  }
}

export const cadWorldModelEngine = new CADWorldModelEngine();
