// Tests for assess-fusion-tool-libraries.mjs -- pure assessment functions, real reference values.
// Run: node scripts/assess-fusion-tool-libraries.test.mjs   (node:test auto-runs on exit)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categorizeLibrary,
  isEndmillOversize,
  summarizeToolsJson,
  summarizeCribCsv,
} from './assess-fusion-tool-libraries.mjs';

test('categorizeLibrary: JM machine crib vs brand vs generic vs other', () => {
  assert.equal(categorizeLibrary('PRISM_JM_VMC-01.tools'), 'jm-machine-crib');
  assert.equal(categorizeLibrary('PRISM_JM_LTH-07.tools'), 'jm-machine-crib');
  assert.equal(categorizeLibrary('PRISM_ISCAR.tools'), 'brand-catalog');
  assert.equal(categorizeLibrary('PRISM_SANDVIK.tools'), 'brand-catalog');
  assert.equal(categorizeLibrary('PRISM-PRISMGeneric-drill.tools'), 'generic');
  assert.equal(categorizeLibrary('PRISM_GENERIC.tools'), 'generic');
  assert.equal(categorizeLibrary('prism-base-tools.tools'), 'generic');
  assert.equal(categorizeLibrary('vendor-misc.tools'), 'other');
});

test('isEndmillOversize: flags only end-mill-TYPE tools above 160mm', () => {
  // real ISCAR mis-parse: flat end mill at 102.67mm (impossible)
  assert.equal(isEndmillOversize({ type: 'flat end mill', unit: 'millimeters', geometry: { DC: 200 } }), true);
  assert.equal(isEndmillOversize({ type: 'bull nose end mill', unit: 'millimeters', geometry: { DC: 311 } }), true);
  // legitimately large tools that are NOT end mills must NOT be flagged
  assert.equal(isEndmillOversize({ type: 'face mill', unit: 'millimeters', geometry: { DC: 250 } }), false);
  assert.equal(isEndmillOversize({ type: 'drill', unit: 'millimeters', geometry: { DC: 101.6 } }), false);
  // real end mills below ceiling
  assert.equal(isEndmillOversize({ type: 'flat end mill', unit: 'millimeters', geometry: { DC: 50 } }), false);
  assert.equal(isEndmillOversize({ type: 'bull nose end mill', unit: 'inches', geometry: { DC: 0.5 } }), false);
  // inch end mill converts: 6.4in = 162.56mm -> flagged; 6.0in = 152.4mm -> ok
  assert.equal(isEndmillOversize({ type: 'flat end mill', unit: 'inches', geometry: { DC: 6.4 } }), true);
  assert.equal(isEndmillOversize({ type: 'flat end mill', unit: 'inches', geometry: { DC: 6.0 } }), false);
  // missing/NaN geometry is never a false positive
  assert.equal(isEndmillOversize({ type: 'flat end mill', unit: 'millimeters', geometry: {} }), false);
  assert.equal(isEndmillOversize({ type: 'flat end mill' }), false);
  assert.equal(isEndmillOversize(null), false);
});

test('summarizeToolsJson: counts, holder coverage, oversize, type distribution', () => {
  const json = {
    version: 1,
    data: [
      { type: 'flat end mill', unit: 'inches', vendor: 'JM', geometry: { DC: 0.5 }, holder: { segments: [1, 2] } },
      { type: 'drill', unit: 'inches', vendor: 'JM', geometry: { DC: 0.25 }, holder: { segments: [] } },
      { type: 'flat end mill', unit: 'millimeters', vendor: 'ISCAR', geometry: { DC: 200 } }, // oversize
      { type: 'face mill', unit: 'millimeters', vendor: 'ISCAR', geometry: { DC: 250 } }, // NOT oversize
    ],
  };
  const s = summarizeToolsJson(json);
  assert.equal(s.count, 4);
  assert.equal(s.withHolderSeg, 1); // only the first has non-empty segments
  assert.equal(s.holderPct, 25);
  assert.equal(s.endmillOversize, 1); // only the 200mm flat end mill
  assert.equal(s.typeDist['flat end mill'], 2);
  assert.deepEqual([...s.units].sort(), ['inches', 'millimeters']);
  assert.equal(s.vendorCount, 2);
});

test('summarizeToolsJson: empty / malformed input is safe', () => {
  assert.deepEqual(summarizeToolsJson({}).count, 0);
  assert.deepEqual(summarizeToolsJson(null).count, 0);
  assert.deepEqual(summarizeToolsJson({ data: 'nope' }).count, 0);
});

test('summarizeCribCsv: distinct tool_index vs total rows', () => {
  const csv = ['"Tool Index","x","CSV_TOOLS_VERSION_1"', '1,"a",1', '1,"b",1', '2,"c",1', ',"blank",1'].join('\n');
  const s = summarizeCribCsv(csv);
  assert.equal(s.rows, 3); // 3 numeric-index data rows (blank-index line ignored)
  assert.equal(s.distinctTools, 2); // indices {1,2}
  assert.deepEqual(summarizeCribCsv('header only'), { rows: 0, distinctTools: 0 });
});
