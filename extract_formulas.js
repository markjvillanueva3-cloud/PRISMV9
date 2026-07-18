/**
 * Extract formulas from FORMULA_REGISTRY.json -> individual JSON files
 * for FormulaRegistry to load
 */
const fs = require('fs');
const path = require('path');

const SOURCE = 'C:\\PRISM\\data\\FORMULA_REGISTRY.json';
const OUTPUT = 'C:\\PRISM\\skills-consolidated\\prism-universal-formulas';

const data = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const formulas = data.formulaRegistry?.formulas || {};

// Write all formulas as a single JSON array file
const formulaArray = Object.values(formulas).map(f => ({
  formula_id: f.id,
  name: f.name,
  domain: f.category?.toLowerCase() || 'general',
  category: f.category?.toLowerCase() || 'general', 
  equation: f.formula || f.equation || '',
  equation_plain: f.formula_plain || f.equation_plain || '',
  description: f.description || f.purpose || '',
  parameters: (f.variables || f.parameters || []).map(v => ({
    name: v.symbol || v.name,
    symbol: v.symbol || v.name,
    unit: v.unit || '-',
    description: v.description || v.name,
    type: v.type || 'input'
  })),
  validation: f.validation || {},
  consumers: f.consumers || []
}));

const outputPath = path.join(OUTPUT, 'formulas_extended.json');
fs.writeFileSync(outputPath, JSON.stringify(formulaArray, null, 2));
console.log(`Wrote ${formulaArray.length} formulas to ${outputPath}`);

// Show what was extracted
formulaArray.forEach(f => console.log(`  ${f.formula_id}: ${f.name}`));
