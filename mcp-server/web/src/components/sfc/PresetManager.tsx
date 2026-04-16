import { useState, useCallback } from "react";
import { Card, Button, Badge } from "../ui";
import type { SfcPreset } from "./comparison-types";
import { loadPresets, savePresets } from "./comparison-types";
import type { SfcParams } from "./ParameterPanel";

interface Props {
  materialId: string | null;
  operationId: string | null;
  params: SfcParams;
  onLoad: (preset: SfcPreset) => void;
}

export default function PresetManager({ materialId, operationId, params, onLoad }: Props) {
  const [presets, setPresets] = useState<SfcPreset[]>(loadPresets);
  const [saveName, setSaveName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [search, setSearch] = useState("");

  const handleSave = useCallback(() => {
    if (!saveName.trim() || !materialId || !operationId) return;
    const preset: SfcPreset = {
      id: `preset-${Date.now()}`,
      name: saveName.trim(),
      materialId,
      operationId,
      params: { ...params },
      createdAt: Date.now(),
    };
    const updated = [preset, ...presets];
    setPresets(updated);
    savePresets(updated);
    setSaveName("");
  }, [saveName, materialId, operationId, params, presets]);

  const handleDelete = useCallback((id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    savePresets(updated);
  }, [presets]);

  const handleRename = useCallback((id: string) => {
    if (!editName.trim()) { setEditing(null); return; }
    const updated = presets.map((p) => p.id === id ? { ...p, name: editName.trim() } : p);
    setPresets(updated);
    savePresets(updated);
    setEditing(null);
  }, [presets, editName]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prism-sfc-presets.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [presets]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (!reader.result || typeof reader.result !== "string") return;
        try {
          const raw = JSON.parse(reader.result);
          if (!Array.isArray(raw)) return;
          // Sanitize: allow-list fields, cap at 50, prevent prototype pollution
          const sanitized = raw.slice(0, 50).map((p: unknown): SfcPreset | null => {
            if (!p || typeof p !== "object" || Array.isArray(p)) return null;
            const r = p as Record<string, unknown>;
            if (typeof r.id !== "string" || typeof r.name !== "string") return null;
            if (!r.params || typeof r.params !== "object" || Array.isArray(r.params)) return null;
            // Only copy known primitive param values
            const cleanParams: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(r.params as Record<string, unknown>)) {
              if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
              if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
                cleanParams[k] = v;
              }
            }
            return {
              id: String(r.id).slice(0, 64),
              name: String(r.name).slice(0, 100),
              materialId: typeof r.materialId === "string" ? r.materialId : "",
              operationId: typeof r.operationId === "string" ? r.operationId : "",
              params: cleanParams as unknown as SfcParams,
              createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
            };
          }).filter((p): p is SfcPreset => p !== null);
          const merged = [...sanitized, ...presets];
          const seen = new Set<string>();
          const deduped = merged.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
          setPresets(deduped);
          savePresets(deduped);
        } catch { /* invalid JSON */ }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [presets]);

  const filtered = search.trim()
    ? presets.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : presets;

  return (
    <Card title="Presets">
      {/* Save new preset */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Preset name..."
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm
            dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <Button
          onClick={handleSave}
          disabled={!saveName.trim() || !materialId || !operationId}
          size="sm"
        >
          Save
        </Button>
      </div>
      {!materialId || !operationId ? (
        <p className="mb-3 text-xs text-slate-400">Select material & operation to save a preset</p>
      ) : null}

      {/* Search + import/export */}
      {presets.length > 0 && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presets..."
            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <button type="button" onClick={handleExport} className="text-xs text-primary-600 hover:underline">
            Export
          </button>
          <button type="button" onClick={handleImport} className="text-xs text-primary-600 hover:underline">
            Import
          </button>
        </div>
      )}

      {/* Preset list */}
      {filtered.length === 0 && presets.length > 0 && (
        <p className="text-xs text-slate-400 text-center py-2">No presets match "{search}"</p>
      )}
      {filtered.length === 0 && presets.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">No saved presets yet</p>
      )}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm
              hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {editing === p.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename(p.id)}
                onBlur={() => handleRename(p.id)}
                autoFocus
                className="flex-1 rounded border border-primary-400 px-1 py-0.5 text-xs
                  dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => onLoad(p)}
                className="flex-1 text-left truncate text-slate-700 dark:text-slate-300"
              >
                {p.name}
              </button>
            )}
            <Badge color="blue">
              {p.operationId.replace(/_/g, " ")}
            </Badge>
            <button
              type="button"
              onClick={() => { setEditing(p.id); setEditName(p.name); }}
              className="text-xs text-slate-400 hover:text-primary-600"
              aria-label="Rename preset"
              title="Rename"
            >
              &#9998;
            </button>
            <button
              type="button"
              onClick={() => handleDelete(p.id)}
              className="text-xs text-slate-400 hover:text-red-500"
              aria-label="Delete preset"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
