import { describe, expect, it } from 'vitest';
import { evaluateNumericExpression, formatNumericExpressionValue } from '../utils/numericExpression';

describe('numericExpression', () => {
  it('evaluates basic arithmetic expressions', () => {
    expect(evaluateNumericExpression('25.4*2')).toBe(50.8);
    expect(evaluateNumericExpression('48+12')).toBe(60);
    expect(evaluateNumericExpression('(3+1)/8')).toBe(0.5);
  });

  it('supports fractions and mixed fractions', () => {
    expect(evaluateNumericExpression('1/8')).toBe(0.125);
    expect(evaluateNumericExpression('1 1/2')).toBe(1.5);
  });

  it('rejects invalid expressions', () => {
    expect(evaluateNumericExpression('1/')).toBeNull();
    expect(evaluateNumericExpression('abc')).toBeNull();
    expect(evaluateNumericExpression('2**3')).toBeNull();
  });

  it('formats committed values without grouping noise', () => {
    expect(formatNumericExpressionValue(50.8)).toBe('50.8');
    expect(formatNumericExpressionValue(0.125)).toBe('0.125');
  });
});
