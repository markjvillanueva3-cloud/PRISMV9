import { useMemo, useCallback } from "react";
import { Card, Input } from "../ui";
import { getShapesForMode, type StockShape } from "../../data/stockShapes";

export interface StockDims {
  shapeId: string;
  values: Record<string, number>;
}

interface Props {
  modeShapes: string[];
  value: StockDims;
  onChange: (dims: StockDims) => void;
  imperial: boolean;
}

function mmToIn(mm: number): number { return +(mm / 25.4).toFixed(4); }
function inToMm(inch: number): number { return +(inch * 25.4).toFixed(3); }

export default function StockDimensions({ modeShapes, value, onChange, imperial }: Props) {
  const shapes = useMemo(() => getShapesForMode(modeShapes), [modeShapes]);
  const currentShape = shapes.find((s) => s.id === value.shapeId) ?? shapes[0];

  const selectShape = useCallback((shape: StockShape) => {
    const defaults: Record<string, number> = {};
    for (const f of shape.fields) {
      defaults[f.key] = f.defaultMm;
    }
    onChange({ shapeId: shape.id, values: defaults });
  }, [onChange]);

  const setField = useCallback((key: string, raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    const mmVal = imperial ? inToMm(num) : num;
    onChange({ ...value, values: { ...value.values, [key]: mmVal } });
  }, [value, onChange, imperial]);

  const displayVal = (mm: number) => imperial ? mmToIn(mm).toString() : mm.toString();
  const unit = imperial ? "in" : "mm";

  return (
    <Card title="Stock Dimensions">
      {/* Shape selector buttons */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {shapes.map((shape) => {
          const isActive = value.shapeId === shape.id;
          return (
            <button
              key={shape.id}
              type="button"
              onClick={() => selectShape(shape)}
              className={`flex flex-col items-center gap-0.5 rounded-md border px-3 py-2 text-center transition-all min-w-[60px] ${
                isActive
                  ? "border-primary-500 bg-primary-600/15 text-white"
                  : "border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              <span className="text-lg leading-none">{shape.icon}</span>
              <span className="text-[9px] font-medium">{shape.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dimension inputs for selected shape */}
      {currentShape && (
        <div className="grid grid-cols-2 gap-2">
          {currentShape.fields.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              unit={unit}
              type="number"
              step={imperial ? 0.01 : field.step}
              min={field.min}
              value={displayVal(value.values[field.key] ?? field.defaultMm)}
              onChange={(e) => setField(field.key, e.target.value)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
