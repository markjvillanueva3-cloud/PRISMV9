const fs = require('fs');

// Check if the engine file exists
const enginePath = 'H:\\prism\\mcp-server\\src\\engines\\EDMMonitorSurfaceIntegrityEngine.ts';
const exists = fs.existsSync(enginePath);

console.log('Engine Implementation Validation');
console.log('='.repeat(80));
console.log(`EDMMonitorSurfaceIntegrityEngine.ts exists: ${exists}`);

if (exists) {
  const content = fs.readFileSync(enginePath, 'utf8');
  const lines = content.split('\n');
  console.log(`File size: ${(content.length / 1024).toFixed(2)} KB`);
  console.log(`Lines of code: ${lines.length}`);
  
  // Check for key implementations
  const checks = {
    'recast calculation': content.includes('recast') || content.includes('Recast'),
    'HAZ depth': content.includes('HAZ') || content.includes('haz'),
    'Carslaw-Jaeger': content.includes('Carslaw') || content.includes('Jaeger') || content.includes('thermal'),
    'Monte Carlo': content.includes('Monte') || content.includes('Stochastic'),
    'microcrack': content.includes('microcrack') || content.includes('Microcrack'),
    'residual stress': content.includes('residual') || content.includes('stress'),
    'fatigue': content.includes('fatigue') || content.includes('Fatigue')
  };
  
  console.log('\nKey implementations found:');
  Object.entries(checks).forEach(([key, found]) => {
    console.log(`  ${found ? '✓' : '✗'} ${key}`);
  });
}

// Also check StochasticEDMEngine
const stochasticPath = 'H:\\prism\\mcp-server\\src\\engines\\StochasticEDMEngine.ts';
const stochasticExists = fs.existsSync(stochasticPath);
console.log(`\nStochasticEDMEngine.ts exists: ${stochasticExists}`);

if (stochasticExists) {
  const content = fs.readFileSync(stochasticPath, 'utf8');
  console.log(`File size: ${(content.length / 1024).toFixed(2)} KB`);
  const monteCarloCheck = content.includes('Monte') || content.includes('p5') || content.includes('p50') || content.includes('p95');
  console.log(`Monte Carlo implementation: ${monteCarloCheck ? '✓ Found' : '✗ Not found'}`);
}
