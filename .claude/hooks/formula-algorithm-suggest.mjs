#!/usr/bin/env node
// tier: T4
/**
 * Formula & Algorithm Suggest — UserPromptSubmit Hook
 *
 * When physics/manufacturing calculations are detected, suggests:
 * - Relevant formulas from FormulaRegistry (499 formulas)
 * - Relevant algorithms from AlgorithmRegistry (52 algorithms)
 * - Canonical constants from physics/constants.ts
 *
 * Prevents reinventing the wheel and ensures formula consistency.
 */

import { readFileSync } from 'node:fs';

// Physics domain patterns → formula/algorithm recommendations
const DOMAIN_MAPPINGS = {
  cutting_force: {
    patterns: [/force|kienzle|specific.*cutting|kc1/i],
    formulas: ['kienzle_cutting_force', 'merchant_shear_angle'],
    algorithms: ['KienzleForceModel'],
    constants: 'kc1_1, mc (ISO material groups)'
  },
  tool_life: {
    patterns: [/tool.*life|wear|taylor|flank/i],
    formulas: ['taylor_tool_life', 'archard_wear'],
    algorithms: ['TaylorToolLife', 'ProgressiveWear'],
    constants: 'C, n (Taylor exponents)'
  },
  thermal: {
    patterns: [/thermal|temperature|heat|cutting.*temp/i],
    formulas: ['loewen_shaw_temperature', 'jaeger_moving_heat'],
    algorithms: ['CuttingTemperature', 'ThermalExpansion'],
    constants: 'thermal conductivity, specific heat'
  },
  deflection: {
    patterns: [/deflection|stiffness|cantilever|bend/i],
    formulas: ['euler_bernoulli_deflection', 'tlusty_deflection'],
    algorithms: ['ToolDeflection', 'PartDeflection'],
    constants: 'E (Young modulus), I (moment of inertia)'
  },
  chatter: {
    patterns: [/chatter|vibration|stability.*lobe|regenerative/i],
    formulas: ['stability_lobe_diagram', 'regenerative_chatter'],
    algorithms: ['ChatterStabilityLobe', 'RegenerativeChatter'],
    constants: 'modal stiffness, damping ratio'
  },
  surface: {
    patterns: [/surface.*finish|roughness|Ra|Rz/i],
    formulas: ['theoretical_roughness', 'brammertz_roughness'],
    algorithms: ['SurfaceFinishPredictor'],
    constants: 'nose radius, feed rate'
  },
  power: {
    patterns: [/power|torque|spindle.*load/i],
    formulas: ['cutting_power', 'spindle_torque'],
    algorithms: ['CuttingPower', 'SpindleLoad'],
    constants: 'efficiency, Pc = Fc * Vc'
  },
  mrr: {
    patterns: [/mrr|material.*removal|productivity/i],
    formulas: ['material_removal_rate'],
    algorithms: ['MRR', 'Productivity'],
    constants: 'MRR = ap * ae * Vf'
  },
  thread: {
    patterns: [/thread|pitch|helix|tpi/i],
    formulas: ['thread_minor_diameter', 'thread_pitch_diameter'],
    algorithms: ['ThreadCalculation'],
    constants: 'pitch, thread angle, engagement'
  }
};

function detectDomains(text) {
  const matches = [];
  for (const [domain, config] of Object.entries(DOMAIN_MAPPINGS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        matches.push({ domain, ...config });
        break;
      }
    }
  }
  return matches;
}

async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = input.prompt || '';
  if (!prompt || prompt.length < 10) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const domains = detectDomains(prompt);
  if (domains.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const parts = [];
  parts.push('## Physics Context');

  for (const d of domains.slice(0, 3)) {
    parts.push(`**${d.domain.replace(/_/g, ' ')}**: formulas=${d.formulas.join(', ')} | algos=${d.algorithms.join(', ')} | constants=${d.constants}`);
  }

  parts.push('→ Use prism_calc dispatcher or import from src/physics/constants.ts');

  console.log(JSON.stringify({
    continue: true,
    additionalContext: parts.join('\n')
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
