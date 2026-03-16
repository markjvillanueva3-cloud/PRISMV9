import { useState, useCallback } from "react";
import { useErpJobPlan } from "../../hooks/useErp";
import type { ErpJobPlanResult, ErpJobOperation } from "../../types/erp";
import Spinner from "../ui/Spinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanForm {
  material: string;
  feature: string;
  quantity: string;
  deadline: string;
  priority: "low" | "normal" | "high" | "urgent";
  dimensions: Record<string, string>;
}

const EMPTY_FORM: PlanForm = {
  material: "",
  feature: "",
  quantity: "1",
  deadline: "",
  priority: "normal",
  dimensions: {},
};

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
void PRIORITY_COLORS; // referenced by priority badge rendering

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function JobPlanner() {
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [dimKeys, setDimKeys] = useState<string[]>(["length", "width", "height"]);
  const [editedOps, setEditedOps] = useState<ErpJobOperation[] | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const jobPlan = useErpJobPlan();

  const canPlan = form.material.trim() !== "" && form.feature.trim() !== "";

  const setField = <K extends keyof PlanForm>(key: K, val: PlanForm[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const parseDimensions = () => {
    const dims: Record<string, number> = {};
    for (const k of dimKeys) {
      const v = form.dimensions[k];
      if (v && !isNaN(Number(v))) dims[k] = Number(v);
    }
    return Object.keys(dims).length ? dims : undefined;
  };

  const handlePlan = async () => {
    const result = await jobPlan.execute({
      material: form.material,
      feature: form.feature,
      dimensions: parseDimensions(),
      quantity: Number(form.quantity) || 1,
      deadline: form.deadline || undefined,
      priority: form.priority,
    });
    if (result) setEditedOps(result.operations);
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setDimKeys(["length", "width", "height"]);
    setEditedOps(null);
    jobPlan.reset();
  };

  // ---- drag-reorder ----

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);

  const handleDrop = useCallback(
    (targetIdx: number) => {
      if (dragIdx === null || !editedOps) return;
      const ops = [...editedOps];
      const [moved] = ops.splice(dragIdx, 1);
      ops.splice(targetIdx, 0, moved);
      // Re-sequence
      setEditedOps(ops.map((op, i) => ({ ...op, sequence: i + 1 })));
      setDragIdx(null);
    },
    [dragIdx, editedOps],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Planning form */}
      {!jobPlan.data && (
        <PlanningForm
          form={form}
          dimKeys={dimKeys}
          setField={setField}
          setDim={(k, v) =>
            setForm((f) => ({ ...f, dimensions: { ...f.dimensions, [k]: v } }))
          }
          onAddDim={(k) => { if (!dimKeys.includes(k)) setDimKeys([...dimKeys, k]); }}
          canPlan={canPlan}
          loading={jobPlan.loading}
          onPlan={handlePlan}
        />
      )}

      {jobPlan.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {jobPlan.error}
        </div>
      )}

      {jobPlan.loading && (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-xs text-slate-500">Planning job...</span>
        </div>
      )}

      {/* Routing display */}
      {jobPlan.data && editedOps && (
        <RoutingDisplay
          plan={jobPlan.data}
          operations={editedOps}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          dragIdx={dragIdx}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planning Form
// ---------------------------------------------------------------------------

function PlanningForm({
  form,
  dimKeys,
  setField,
  setDim,
  onAddDim: _onAddDim,
  canPlan,
  loading,
  onPlan,
}: {
  form: PlanForm;
  dimKeys: string[];
  setField: <K extends keyof PlanForm>(key: K, val: PlanForm[K]) => void;
  setDim: (key: string, val: string) => void;
  onAddDim?: (key: string) => void;
  canPlan: boolean;
  loading: boolean;
  onPlan: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Material & Feature */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Material <span className="text-red-400">*</span>
          </span>
          <input
            type="text"
            value={form.material}
            onChange={(e) => setField("material", e.target.value)}
            placeholder="e.g. 4140 Steel"
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm placeholder:text-slate-400 focus:border-primary-500
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Feature <span className="text-red-400">*</span>
          </span>
          <input
            type="text"
            value={form.feature}
            onChange={(e) => setField("feature", e.target.value)}
            placeholder="e.g. shaft, flange, housing"
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm placeholder:text-slate-400 focus:border-primary-500
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </div>

      {/* Quantity, Deadline, Priority */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Quantity</span>
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setField("quantity", e.target.value)}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm focus:border-primary-500 focus:outline-none
              focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Deadline</span>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setField("deadline", e.target.value)}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm focus:border-primary-500 focus:outline-none
              focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Priority</span>
          <select
            value={form.priority}
            onChange={(e) => setField("priority", e.target.value as PlanForm["priority"])}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm focus:border-primary-500 focus:outline-none
              focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-3 gap-2">
        {dimKeys.map((k) => (
          <label key={k} className="flex flex-col gap-0.5">
            <span className="text-[10px] capitalize text-slate-500">{k} (mm)</span>
            <input
              type="number"
              value={form.dimensions[k] ?? ""}
              onChange={(e) => setDim(k, e.target.value)}
              className="rounded border border-slate-300 px-1.5 py-1 text-[11px]
                focus:border-primary-500 focus:outline-none focus:ring-1
                focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700
                dark:text-slate-100"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={!canPlan || loading}
        onClick={onPlan}
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium
          text-white shadow-sm transition-colors hover:bg-primary-700
          disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Planning..." : "Plan Job"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Routing Display — drag-reorderable operation list
// ---------------------------------------------------------------------------

function RoutingDisplay({
  plan,
  operations,
  onDragStart,
  onDrop,
  dragIdx,
  onReset,
}: {
  plan: ErpJobPlanResult;
  operations: ErpJobOperation[];
  onDragStart: (idx: number) => void;
  onDrop: (idx: number) => void;
  dragIdx: number | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Job {plan.job_id}
          </h3>
          <span className="text-[10px] text-slate-500">
            Confidence: {(plan.confidence * 100).toFixed(0)}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <dt className="text-[10px] text-slate-500">Material</dt>
            <dd className="font-medium text-slate-700 dark:text-slate-300">
              {plan.material.name}
              <span className="ml-1 text-[10px] text-slate-400">{plan.material.iso_group}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-slate-500">Total Time</dt>
            <dd className="font-medium text-slate-700 dark:text-slate-300">
              {plan.total_time_min.toFixed(1)} min
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-slate-500">Est. Cost</dt>
            <dd className="font-medium text-primary-700 dark:text-primary-400">
              ${plan.estimated_cost.toFixed(2)}
            </dd>
          </div>
        </div>

        {plan.warnings.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {plan.warnings.map((w, i) => (
              <p key={i} className="text-[10px] text-amber-600 dark:text-amber-400">{w}</p>
            ))}
          </div>
        )}
      </div>

      {/* Operation routing — draggable */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h4 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          Operation Routing
          <span className="ml-2 text-[10px] font-normal text-slate-400">
            Drag to reorder
          </span>
        </h4>

        <div className="space-y-1" role="list" aria-label="Operation sequence">
          {operations.map((op, idx) => (
            <div
              key={`${op.sequence}-${op.operation}`}
              role="listitem"
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(idx)}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-xs
                transition-colors cursor-grab active:cursor-grabbing ${
                dragIdx === idx
                  ? "border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-800"
              }`}
            >
              {/* Sequence number */}
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                bg-primary-100 text-[10px] font-bold text-primary-700
                dark:bg-primary-900/30 dark:text-primary-400">
                {op.sequence}
              </span>

              {/* Operation info */}
              <div className="flex-1">
                <div className="font-medium text-slate-700 dark:text-slate-300">
                  {op.operation}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>{op.machine}</span>
                  <span>Tool: {op.tool}</span>
                </div>
              </div>

              {/* Times */}
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>{op.cycle_time_min}min cycle</span>
                <span>{op.setup_time_min}min setup</span>
              </div>

              {/* Drag handle */}
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                &#x2630;
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs
            text-slate-600 hover:bg-slate-50 dark:border-slate-600
            dark:text-slate-400 dark:hover:bg-slate-800"
        >
          New Plan
        </button>
      </div>
    </div>
  );
}
