import { describe, expect, it } from 'vitest';
import { PROGRAMMING_ENVIRONMENTS } from '../data/calculatorWorkspace';

function hasToolpathMatch(pattern: RegExp) {
  return PROGRAMMING_ENVIRONMENTS.some((environment) =>
    environment.toolpaths.some((toolpath) => pattern.test(`${toolpath.label} ${toolpath.path}`)),
  );
}

describe('calculator strategy registry bridge', () => {
  it('keeps the calculator surfaced against the major normalized strategy families', () => {
    [
      /adaptive|dynamic|volumill|profitmilling|waveform|imachining/i,
      /high feed milling/i,
      /plunge roughing/i,
      /rest roughing/i,
      /spiral roughing/i,
      /trochoidal slot/i,
      /face milling/i,
      /parallel|flowline|flow/i,
      /scallop/i,
      /constant z|constant-z|waterline|z-level/i,
      /geodesic/i,
      /isocurve/i,
      /blend finishing/i,
      /morphed spiral/i,
      /barrel|lens|maxx finishing/i,
      /pencil finishing/i,
      /chamfer|deburr/i,
      /peck drilling/i,
      /helical bore/i,
      /thread milling/i,
      /\btapping\b|live tool tapping/i,
      /\breaming\b/i,
      /od roughing|rough turn|profitturning rough/i,
      /od finishing|finish turn|wave finish turn|profitturning finish/i,
      /rough boring/i,
      /finish boring/i,
      /grooving|groove cycle|parting \/ cutoff/i,
      /threading cycle|thread turning|g76 threading cycle/i,
      /3\+2 indexed/i,
      /drive curve 5-axis/i,
      /multi-axis sweeping/i,
      /simultaneous 5-axis|sim\. 5-axis/i,
      /swarf/i,
      /2-axis profile/i,
      /4-axis taper|ruled cut/i,
      /multi-cut skim|skim pass/i,
      /tabbed slug control|slug control|tab \/ slug/i,
    ].forEach((pattern) => {
      expect(hasToolpathMatch(pattern), `Expected calculator toolpath surface to include ${pattern}`).toBe(true);
    });
  });
});
