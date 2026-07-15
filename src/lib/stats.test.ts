import { describe, it, expect } from 'vitest';
import {
  rate, lift, twoProportionZTest, significanceLabel, formatPct, formatLift,
} from './stats';

describe('rate', () => {
  it('computes events / exposures', () => {
    expect(rate(50, 1000)).toBe(0.05);
  });
  it('returns null on missing or invalid inputs', () => {
    expect(rate(null, 1000)).toBeNull();
    expect(rate(50, null)).toBeNull();
    expect(rate(50, 0)).toBeNull();
    expect(rate(50, -10)).toBeNull();
  });
});

describe('lift', () => {
  it('computes relative lift over control', () => {
    expect(lift(0.10, 0.15)).toBeCloseTo(0.5, 10);
    expect(lift(0.20, 0.15)).toBeCloseTo(-0.25, 10);
  });
  it('returns null when control is 0 or inputs missing', () => {
    expect(lift(0, 0.1)).toBeNull();
    expect(lift(null, 0.1)).toBeNull();
    expect(lift(0.1, null)).toBeNull();
  });
});

describe('twoProportionZTest', () => {
  // Reference values cross-checked with scipy.stats:
  //   statsmodels proportions_ztest([150, 100], [1000, 1000]) -> z=3.3806, p=0.000724
  it('matches scipy for 100/1000 vs 150/1000', () => {
    const res = twoProportionZTest(100, 1000, 150, 1000);
    expect(res).not.toBeNull();
    expect(res!.z).toBeCloseTo(3.3806, 3);
    expect(res!.pValue).toBeCloseTo(0.000723, 4);
  });

  it('is symmetric: swapping arms negates z, same p', () => {
    const a = twoProportionZTest(100, 1000, 150, 1000)!;
    const b = twoProportionZTest(150, 1000, 100, 1000)!;
    expect(b.z).toBeCloseTo(-a.z, 10);
    expect(b.pValue).toBeCloseTo(a.pValue, 10);
  });

  it('returns p ≈ 1 for identical arms', () => {
    const res = twoProportionZTest(100, 1000, 100, 1000)!;
    expect(res.z).toBeCloseTo(0, 10);
    expect(res.pValue).toBeCloseTo(1, 6); // erf approx is only good to ~1.5e-7
  });

  it('returns null on insufficient input', () => {
    expect(twoProportionZTest(null, 1000, 150, 1000)).toBeNull();
    expect(twoProportionZTest(100, 0, 150, 1000)).toBeNull();
    expect(twoProportionZTest(100, 1000, 150, null)).toBeNull();
  });

  it('returns null on degenerate pooled rate (0% or 100% everywhere)', () => {
    expect(twoProportionZTest(0, 1000, 0, 1000)).toBeNull();
    expect(twoProportionZTest(1000, 1000, 500, 500)).toBeNull();
  });
});

describe('significanceLabel', () => {
  it('buckets p-values at 0.05 and 0.1', () => {
    expect(significanceLabel(0.01)).toBe('significant');
    expect(significanceLabel(0.07)).toBe('trending');
    expect(significanceLabel(0.5)).toBe('not-significant');
    expect(significanceLabel(0.05)).toBe('trending'); // boundary is exclusive
    expect(significanceLabel(0.1)).toBe('not-significant');
  });
});

describe('formatters', () => {
  it('formatPct renders fractions as percentages', () => {
    expect(formatPct(0.0541)).toBe('5.41%');
    expect(formatPct(null)).toBe('—');
  });
  it('formatLift signs the lift', () => {
    expect(formatLift(0.174)).toBe('+17.4%');
    expect(formatLift(-0.052)).toBe('-5.2%');
    expect(formatLift(null)).toBe('—');
  });
});
