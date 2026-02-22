/**
 * R5-MS1: Manufacturing Calculator Page
 *
 * 9 interactive formula cards (RPM, Feed Rate, MRR, Power, Torque,
 * Surface Finish Ra, Surface Finish Rz, Cost, Taylor Tool Life).
 *
 * Each card: input fields with validation, live output, equation display.
 * All calculations are client-side, matching FormulaRegistry formulas.
 */
import { FORMULAS } from '../formulas';
import { FormulaCard } from '../components/FormulaCard';

export function CalculatorPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manufacturing Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          9 essential formulas for CNC machining. Adjust inputs for live results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {FORMULAS.map((formula) => (
          <FormulaCard key={formula.id} formula={formula} />
        ))}
      </div>
    </div>
  );
}
