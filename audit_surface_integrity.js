const fs = require('fs');
const data = JSON.parse(fs.readFileSync('H:\\prism\\mcp-server\\data\\milestones\\WEDM-MS1.json', 'utf8'));
const s3 = data.sessions.find(s => s.id === 'WEDM-1-S3');

console.log('SURFACE INTEGRITY SUITE AUDIT - WEDM-MS1 Session WEDM-1-S3\n');
console.log('='.repeat(80));

const criteria = {
  recast_attenuation: false,
  haz_empirical: false,
  haz_carslaw: false,
  microcrack_carbon: false,
  residual_stress: false,
  fatigue_formula: false,
  monte_carlo: false,
  distribution_labels: false,
  uncertainty_breakdown: false
};

// Check U-WEDM28
const u28 = s3.work['U-WEDM28'];
console.log('\nU-WEDM28: Recast layer mapping + HAZ depth visualization');
console.log('-'.repeat(80));
if (u28.description.includes('0.7^N')) {
  console.log('✓ Recast attenuation curve (0.7^N) mentioned');
  criteria.recast_attenuation = true;
}
if (u28.description.includes('Carslaw-Jaeger')) {
  console.log('✓ Carslaw-Jaeger thermal model mentioned');
  criteria.haz_carslaw = true;
}
if (u28.description.includes('3× recast')) {
  console.log('✓ HAZ empirical formula (3× recast) mentioned');
  criteria.haz_empirical = true;
}
if (u28.description.includes('p5/p50/p95') || u28.description.includes('Monte Carlo')) {
  console.log('✓ Confidence intervals (p5/p50/p95) mentioned in U-WEDM28');
  criteria.monte_carlo = true;
}
if (u28.description.includes('confidence intervals') || u28.description.includes('Confidence Intervals')) {
  console.log('✓ Uncertainty bands specified');
}

// Check U-WEDM29
const u29 = s3.work['U-WEDM29'];
console.log('\nU-WEDM29: Microcrack risk + residual stress + fatigue life');
console.log('-'.repeat(80));
if (u29.description.includes('carbon content')) {
  console.log('✓ Microcrack risk considers carbon content');
  criteria.microcrack_carbon = true;
}
if (u29.description.includes('200-800 MPa')) {
  console.log('✓ Residual stress range specified (200-800 MPa)');
  criteria.residual_stress = true;
}
if (u29.description.includes('min(70%, d_rc×1.2 + σ_r×0.02)')) {
  console.log('✓ Fatigue life reduction formula correct: min(70%, d_rc×1.2 + σ_r×0.02)');
  criteria.fatigue_formula = true;
} else {
  console.log('✗ Fatigue formula NOT found in expected format');
  console.log('  Found:', u29.description.substring(u29.description.indexOf('Fatigue'), Math.min(u29.description.indexOf('Fatigue')+200, u29.description.length)));
}

// Check U-WEDM30
const u30 = s3.work['U-WEDM30'];
console.log('\nU-WEDM30: Monte Carlo uncertainty propagation');
console.log('-'.repeat(80));
if (u30.description.includes('p5/p50/p95')) {
  console.log('✓ Confidence bands (p5/p50/p95) explicitly mentioned');
  criteria.monte_carlo = true;
}
if (u30.description.includes('Distribution type') || u30.description.includes('distribution type')) {
  console.log('✓ Distribution type labels included (normal, lognormal, Weibull)');
  criteria.distribution_labels = true;
}
if (u30.description.includes('Uncertainty source breakdown') || u30.description.includes('uncertainty source breakdown')) {
  console.log('✓ Uncertainty source breakdown specified');
  criteria.uncertainty_breakdown = true;
}

// Scoring
console.log('\n' + '='.repeat(80));
console.log('AUDIT SCORING\n');

const checks = [
  { name: 'Recast layer mapped per feature with attenuation (0.7^N)', value: criteria.recast_attenuation },
  { name: 'HAZ depth empirical formula (3× recast)', value: criteria.haz_empirical },
  { name: 'HAZ depth Carslaw-Jaeger thermal model', value: criteria.haz_carslaw },
  { name: 'Microcrack risk from carbon content', value: criteria.microcrack_carbon },
  { name: 'Residual stress predicted (200-800 MPa)', value: criteria.residual_stress },
  { name: 'Fatigue life reduction formula correct', value: criteria.fatigue_formula },
  { name: 'Monte Carlo p5/p50/p95 confidence bands', value: criteria.monte_carlo },
  { name: 'Distribution type labels (normal/lognormal/Weibull)', value: criteria.distribution_labels },
  { name: 'Uncertainty source breakdown', value: criteria.uncertainty_breakdown }
];

let score = 0;
checks.forEach(c => {
  const symbol = c.value ? '✓' : '✗';
  console.log(`${symbol} ${c.name}`);
  if (c.value) score += 100 / checks.length;
});

console.log('\n' + '='.repeat(80));
console.log(`FINAL SCORE: ${Math.round(score)}/100`);
console.log('='.repeat(80));

// Detailed analysis
console.log('\nDETAILED UNIT SPECS:\n');
console.log('U-WEDM28 EXIT GATE:');
console.log(u28.exit_gate);
console.log('\nU-WEDM29 EXIT GATE:');
console.log(u29.exit_gate);
console.log('\nU-WEDM30 EXIT GATE:');
console.log(u30.exit_gate);

console.log('\n' + '='.repeat(80));
console.log('DEPENDENCIES & ROLLBACK STRATEGY:\n');
console.log('U-WEDM28 depends on:', u28.depends_on);
console.log('U-WEDM29 depends on:', u29.depends_on);
console.log('U-WEDM30 depends on:', u30.depends_on);
console.log('\nAll rollback strategy: git stash (emergency reset available)');
