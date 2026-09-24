/** Small, dependency-free statistics for detectors. */

export function rate(hits: number, total: number): number {
  return total === 0 ? 0 : hits / total;
}

/**
 * z for "group A's rate is higher than group B's" (pooled two-proportion test with
 * Yates' continuity correction, which keeps small samples from looking significant).
 * 0 when undefined or not in that direction.
 */
export function twoProportionZ(hitsA: number, totalA: number, hitsB: number, totalB: number): number {
  if (totalA === 0 || totalB === 0) return 0;
  const pooled = (hitsA + hitsB) / (totalA + totalB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / totalA + 1 / totalB));
  if (se === 0) return 0;
  const diff = hitsA / totalA - hitsB / totalB - 0.5 * (1 / totalA + 1 / totalB);
  return Math.max(0, diff) / se;
}

/** P(X ≥ hits) for X ~ Binomial(total, p), computed exactly (log-space, fine for the sizes here). */
export function binomialUpperTail(hits: number, total: number, p: number): number {
  if (hits <= 0) return 1;
  if (hits > total) return 0;
  const logChoose = (n: number, k: number) => {
    let sum = 0;
    for (let i = 1; i <= k; i++) sum += Math.log((n - k + i) / i);
    return sum;
  };
  let tail = 0;
  for (let k = hits; k <= total; k++) tail += Math.exp(logChoose(total, k) + k * Math.log(p) + (total - k) * Math.log(1 - p));
  return Math.min(1, tail);
}

/**
 * z-equivalent for "observed share exceeds the expected share", from the exact
 * binomial tail (normal approximations overstate evidence at small n). 0 when not higher.
 */
export function binomialZ(hits: number, total: number, expected: number): number {
  if (total === 0 || expected <= 0 || expected >= 1 || hits / total <= expected) return 0;
  return criticalZ(binomialUpperTail(hits, total, expected));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Most frequent value; ties go to the smaller value. */
export function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

export function percent(fraction: number): number {
  return Math.round(fraction * 100);
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** The z a one-sided test must reach for significance `alpha` (bisection on the CDF). */
export function criticalZ(alpha: number): number {
  if (alpha >= 0.5) return 0;
  let lo = 0;
  let hi = 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (1 - normalCdf(mid) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
