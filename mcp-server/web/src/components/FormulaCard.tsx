/**
 * R5-MS1: Interactive Formula Card Component
 *
 * Renders a single manufacturing formula with input fields,
 * live calculation, equation display, and input validation.
 * Red borders on out-of-range inputs (R5 mandatory: input validation).
 */
import { useState, useCallback } from 'react';
import type { FormulaDefinition } from '../formulas';

interface Props {
  formula: FormulaDefinition;
}

export function FormulaCard({ formula }: Props) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const input of formula.inputs) {
      initial[input.name] = input.defaultValue;
    }
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(
    (name: string, value: number) => {
      const input = formula.inputs.find((i) => i.name === name);
      if (!input) return '';
      if (isNaN(value)) return 'Required';
      if (value < input.min) return `Min ${input.min}`;
      if (value > input.max) return `Max ${input.max}`;
      return '';
    },
    [formula.inputs],
  );

  function handleChange(name: string, raw: string) {
    const value = parseFloat(raw);
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  }

  // Compute result (only if all inputs are valid numbers)
  const hasErrors = Object.values(errors).some((e) => e !== '');
  const allValid = !hasErrors && formula.inputs.every((i) => !isNaN(values[i.name]));
  let result: number | null = null;
  if (allValid) {
    try {
      result = formula.compute(values);
      if (!isFinite(result)) result = null;
    } catch {
      result = null;
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col">
      {/* Header */}
      <h3 className="text-base font-semibold text-gray-900 mb-1">{formula.name}</h3>
      <p className="text-xs text-gray-500 mb-3">{formula.description}</p>

      {/* Equation display */}
      <div
        className="bg-gray-50 border border-gray-100 rounded px-3 py-2 mb-4 text-center font-mono text-sm text-gray-700"
        aria-label={`Formula: ${formula.equation}`}
      >
        {formula.equationSymbols}
      </div>

      {/* Input fields */}
      <div className="space-y-3 flex-1">
        {formula.inputs.map((input) => {
          const err = errors[input.name];
          const borderClass = err ? 'border-red-500 ring-1 ring-red-300' : 'border-gray-300';
          return (
            <div key={input.name}>
              <label
                htmlFor={`${formula.id}-${input.name}`}
                className="block text-xs font-medium text-gray-600 mb-0.5"
              >
                {input.label}
                {input.unit && <span className="text-gray-400 ml-1">({input.unit})</span>}
              </label>
              <input
                id={`${formula.id}-${input.name}`}
                type="number"
                value={isNaN(values[input.name]) ? '' : values[input.name]}
                onChange={(e) => handleChange(input.name, e.target.value)}
                step={input.step}
                min={input.min}
                max={input.max}
                className={`w-full rounded px-2 py-1.5 text-sm ${borderClass} focus:ring-2 focus:ring-prism-500 focus:border-prism-500`}
                aria-invalid={!!err}
                aria-describedby={err ? `${formula.id}-${input.name}-err` : undefined}
              />
              {err && (
                <p id={`${formula.id}-${input.name}-err`} className="text-xs text-red-600 mt-0.5">
                  {err}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Result */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-gray-500">{formula.outputName}</span>
          <span className="text-lg font-bold text-prism-700">
            {result !== null ? (
              <>
                {result < 0.01 ? result.toExponential(3) : result.toFixed(result > 100 ? 0 : 2)}
                <span className="text-xs font-normal text-gray-500 ml-1">{formula.outputUnit}</span>
              </>
            ) : (
              <span className="text-gray-300">&mdash;</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
