/**
 * Pure stats helpers for A/B test results. No dependencies.
 * Conventions: control is always index 0 of the variants array.
 */

/** Conversion rate: events / exposures. Null when inputs missing or invalid. */
export function rate(events: number | null, exposures: number | null): number | null {
  if (events == null || exposures == null || exposures <= 0) return null;
  return events / exposures;
}

/** Relative lift of variant over control, as a fraction (0.174 = +17.4%). */
export function lift(control: number | null, variant: number | null): number | null {
  if (control == null || variant == null || control === 0) return null;
  return (variant - control) / control;
}

/** Abramowitz & Stegun 7.1.26 erf approximation (|error| < 1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Standard normal CDF. */
function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export interface ZTestResult {
  z: number;
  pValue: number; // two-tailed
}

/**
 * Two-proportion z-test (pooled). Returns null when inputs are insufficient
 * (missing counts, zero exposures, or degenerate pooled rate).
 */
export function twoProportionZTest(
  controlEvents: number | null,
  controlExposures: number | null,
  variantEvents: number | null,
  variantExposures: number | null,
): ZTestResult | null {
  if (
    controlEvents == null || controlExposures == null ||
    variantEvents == null || variantExposures == null ||
    controlExposures <= 0 || variantExposures <= 0
  ) return null;

  const p1 = controlEvents / controlExposures;
  const p2 = variantEvents / variantExposures;
  const pPool = (controlEvents + variantEvents) / (controlExposures + variantExposures);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / controlExposures + 1 / variantExposures));
  if (se === 0 || !Number.isFinite(se)) return null;

  const z = (p2 - p1) / se;
  const pValue = 2 * (1 - normCdf(Math.abs(z)));
  return { z, pValue };
}

export type Significance = 'significant' | 'trending' | 'not-significant';

export function significanceLabel(pValue: number): Significance {
  if (pValue < 0.05) return 'significant';
  if (pValue < 0.1) return 'trending';
  return 'not-significant';
}

export function formatPct(fraction: number | null, digits = 2): string {
  if (fraction == null) return '—';
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatLift(l: number | null): string {
  if (l == null) return '—';
  const pct = (l * 100).toFixed(1);
  return `${l >= 0 ? '+' : ''}${pct}%`;
}
