/**
 * BR-1: pattern language is descriptive, never causal or about character.
 * Every template is run through this in CI (templates.test.ts).
 */
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /\bbecause\b/i, why: "causal claim" },
  { pattern: /\b(causes?|caused|causing)\b/i, why: "causal claim" },
  { pattern: /\bdue to\b/i, why: "causal claim" },
  { pattern: /\byou are\b|\byou're\b/i, why: "statement about the person" },
  { pattern: /\b(lazy|weak|undisciplined|fail(ed|ure|ing)?|procrastinat\w*)\b/i, why: "judgement of the person" },
  { pattern: /\b(always|never)\b/i, why: "absolute claim from a sample" },
];

export function wordingViolations(text: string): string[] {
  return FORBIDDEN.filter((rule) => rule.pattern.test(text)).map((rule) => `${rule.why}: ${rule.pattern}`);
}

export function wordingGuard(text: string): string {
  const violations = wordingViolations(text);
  if (violations.length > 0) throw new Error(`Pattern wording breaks BR-1 (${violations.join("; ")}): ${text}`);
  return text;
}
