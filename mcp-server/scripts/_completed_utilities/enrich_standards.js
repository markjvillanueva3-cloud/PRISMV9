/**
 * R4.1: Standards & chip formation gap fill
 * Adds DIN/EN/UNS cross-references for common grades
 * Fixes R1 materials missing chip_formation fields
 */
const fs = require('fs');
const path = require('path');
const DATA_BASE = 'C:\\PRISM\\data\\materials';

// UNS/DIN/EN cross-reference for common steels
const STANDARDS = {
  '1008': { uns: 'G10080', din: 'C10', en: '1.0301' },
  '1010': { uns: 'G10100', din: 'C10E', en: '1.1121' },
  '1015': { uns: 'G10150', din: 'C15', en: '1.0401' },
  '1018': { uns: 'G10180', din: 'C15E', en: '1.1141' },
  '1020': { uns: 'G10200', din: 'C22', en: '1.0402' },
  '1025': { uns: 'G10250', din: 'C25', en: '1.0406' },
  '1030': { uns: 'G10300', din: 'C30', en: '1.0528' },
  '1035': { uns: 'G10350', din: 'C35', en: '1.0501' },
  '1040': { uns: 'G10400', din: 'C40', en: '1.0511' },
  '1045': { uns: 'G10450', din: 'C45', en: '1.0503' },
  '1050': { uns: 'G10500', din: 'C50', en: '1.0540' },
  '1060': { uns: 'G10600', din: 'C60', en: '1.0601' },
  '1070': { uns: 'G10700', din: 'C70', en: '1.0615' },
  '1080': { uns: 'G10800', din: 'C80', en: '1.0616' },
  '1095': { uns: 'G10950', din: 'C100', en: '1.1274' },
  '12L14':{ uns: 'G12144', din: '9SMnPb28', en: '1.0718' },
  '1215': { uns: 'G12150', din: '9SMn28', en: '1.0715' },
  '4130': { uns: 'G41300', din: '25CrMo4', en: '1.7218' },
  '4140': { uns: 'G41400', din: '42CrMo4', en: '1.7225' },
  '4340': { uns: 'G43400', din: '34CrNiMo6', en: '1.6582' },
  '5140': { uns: 'G51400', din: '41Cr4', en: '1.7035' },
  '5160': { uns: 'G51600', din: '60Cr3', en: '1.7177' },
  '6150': { uns: 'G61500', din: '50CrV4', en: '1.8159' },
  '8620': { uns: 'G86200', din: '21NiCrMo2', en: '1.6523' },
  '8640': { uns: 'G86400', din: '40NiCrMo6', en: '1.6565' },
  '9310': { uns: 'G93100', din: '36NiCrMo16', en: '1.6773' },
  '52100':{ uns: 'G52986', din: '100Cr6', en: '1.3505' },
  'A2':   { uns: 'T30102', din: 'X100CrMoV5', en: '1.2363' },
  'D2':   { uns: 'T30402', din: 'X153CrMoV12', en: '1.2379' },
  'H13':  { uns: 'T20813', din: 'X40CrMoV5-1', en: '1.2344' },
  'M2':   { uns: 'T11302', din: 'HS6-5-2', en: '1.3343' },
  'O1':   { uns: 'T31501', din: '100MnCrW4', en: '1.2510' },
  'P20':  { uns: 'T51620', din: '40CrMnNiMo8-6-4', en: '1.2311' },
  'S7':   { uns: 'T41907', din: '45CrSiV7', en: '1.2357' },
  'W1':   { uns: 'T72301', din: 'C105W1', en: '1.1545' },
};

const STAINLESS_STD = {
  '301': { uns: 'S30100', din: 'X5CrNi17-7', en: '1.4310' },
  '303': { uns: 'S30300', din: 'X8CrNiS18-9', en: '1.4305' },
  '304': { uns: 'S30400', din: 'X5CrNi18-10', en: '1.4301' },
  '304L':{ uns: 'S30403', din: 'X2CrNi18-9', en: '1.4307' },
  '309': { uns: 'S30900', din: 'X15CrNiSi25-20', en: '1.4828' },
  '310': { uns: 'S31000', din: 'X8CrNi25-21', en: '1.4845' },
  '316': { uns: 'S31600', din: 'X5CrNiMo17-12-2', en: '1.4401' },
  '316L':{ uns: 'S31603', din: 'X2CrNiMo17-12-2', en: '1.4404' },
  '321': { uns: 'S32100', din: 'X6CrNiTi18-10', en: '1.4541' },
  '347': { uns: 'S34700', din: 'X6CrNiNb18-10', en: '1.4550' },
  '410': { uns: 'S41000', din: 'X12Cr13', en: '1.4006' },
  '416': { uns: 'S41600', din: 'X12CrS13', en: '1.4005' },
  '420': { uns: 'S42000', din: 'X20Cr13', en: '1.4021' },
  '430': { uns: 'S43000', din: 'X6Cr17', en: '1.4016' },
  '440C':{ uns: 'S44004', din: 'X105CrMo17', en: '1.4125' },
  '17-4PH':{ uns: 'S17400', din: 'X5CrNiCuNb16-4', en: '1.4542' },
  '2205': { uns: 'S32205', din: 'X2CrNiMoN22-5-3', en: '1.4462' },
  '2507': { uns: 'S32750', din: 'X2CrNiMoN25-7-4', en: '1.4410' },
};

const NONFERROUS_STD = {
  '6061': { uns: 'A96061', din: 'AlMg1SiCu', en: 'AW-6061' },
  '7075': { uns: 'A97075', din: 'AlZn5.5MgCu', en: 'AW-7075' },
  '2024': { uns: 'A92024', din: 'AlCu4Mg1', en: 'AW-2024' },
  '5083': { uns: 'A95083', din: 'AlMg4.5Mn', en: 'AW-5083' },
  '6082': { uns: 'A96082', din: 'AlSi1MgMn', en: 'AW-6082' },
  'C360': { uns: 'C36000', din: 'CuZn36Pb3', en: 'CW603N' },
  'Ti-6Al-4V': { uns: 'R56400', din: 'TiAl6V4', en: '3.7165' },
};

function matchAndApplyStandards(mat, stdDb) {
  const n = mat.name.toUpperCase().replace(/[-_\s]+/g, '');
  for (const [key, std] of Object.entries(stdDb).sort((a,b) => b[0].length - a[0].length)) {
    const k = key.toUpperCase().replace(/[-_\s]+/g, '');
    if (n.includes(k)) {
      if (!mat.standards) mat.standards = {};
      if (!mat.standards.din) mat.standards.din = std.din;
      if (!mat.standards.en) mat.standards.en = std.en;
      if (!mat.standards.uns) mat.standards.uns = std.uns;
      return true;
    }
  }
  return false;
}

// Fix R1 chip_formation missing
function fixChipFormation(mat) {
  const iso = mat.iso_group || 'P';
  if (!mat.chip_formation) mat.chip_formation = {};
  const cf = mat.chip_formation;
  if (!cf.chip_type) cf.chip_type = iso==='K'?'discontinuous':iso==='S'?'continuous_tough':'continuous';
  if (!cf.chip_breaking) cf.chip_breaking = iso==='K'?'excellent':iso==='S'?'extremely_difficult':'good';
  if (!cf.built_up_edge_tendency) cf.built_up_edge_tendency = iso==='N'?'high':'medium';
  if (!cf.work_hardening_severity) cf.work_hardening_severity = iso==='M'||iso==='S'?'high':'low';
  mat.chip_formation = cf;
}

// Process all files
console.log('=== R4.1: Standards + Chip Formation Fix ===\n');
let stdAdded = 0, cfFixed = 0;
const groups = fs.readdirSync(DATA_BASE).filter(d => fs.statSync(path.join(DATA_BASE, d)).isDirectory());

for (const group of groups) {
  const dir = path.join(DATA_BASE, group);
  const files = fs.readdirSync(dir).filter(f => f.includes('verified') && f.endsWith('.json'));
  for (const file of files) {
    const fp = path.join(dir, file);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const mats = data.materials || [];
      let changed = false;
      for (const mat of mats) {
        const iso = mat.iso_group;
        const db = iso==='P'||iso==='H' ? STANDARDS : iso==='M' ? STAINLESS_STD : iso==='N' ? NONFERROUS_STD : null;
        if (db && matchAndApplyStandards(mat, db)) { stdAdded++; changed = true; }
        if (!mat.chip_formation?.chip_type) { fixChipFormation(mat); cfFixed++; changed = true; }
      }
      if (changed) fs.writeFileSync(fp, JSON.stringify({ materials: mats }, null, 2));
    } catch(e) {}
  }
}
console.log(`Standards added: ${stdAdded}`);
console.log(`Chip formation fixed: ${cfFixed}`);
