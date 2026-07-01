// Quick test - does prism_safety actually work with right params?
// Test workholding first - it's the simplest
const test = {
  tool: {
    diameter: 10,
    shankDiameter: 10, 
    fluteLength: 22,
    overallLength: 72,
    stickout: 40,
    numberOfFlutes: 4
  },
  forces: {
    Fc: 445,
    Ff: 178,
    Fp: 134
  },
  conditions: {
    feedPerTooth: 0.1,
    axialDepth: 3,
    radialDepth: 6,
    cuttingSpeed: 150,
    spindleSpeed: 4775
  },
  toolMaterial: "carbide"
};
console.log(JSON.stringify(test));
