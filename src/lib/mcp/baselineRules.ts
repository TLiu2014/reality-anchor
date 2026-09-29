/**
 * Mock "calm baseline" rule sets.
 *
 * A baseline rule is a short, pre-committed statement the user wrote (or agreed
 * to) while calm — the ground truth their anxious, looping self can be anchored
 * back to. `get_baseline_rules` returns these so Alexa+ can read the user's own
 * words back to them mid-loop instead of improvising reassurance.
 *
 * In production this would be a per-user store; here it's an in-memory map keyed
 * by userId, with a sensible default so any unknown id still gets a usable set.
 */

export interface BaselineRule {
  id: string;
  /** The user's own calm-state statement. */
  rule: string;
  /** The loop theme this rule anchors (checking, contamination, harm, ...). */
  theme: string;
}

const DEFAULT_RULES: BaselineRule[] = [
  {
    id: "check-once",
    rule: "Checking the lock or stove once, and confirming it, is sufficient.",
    theme: "checking",
  },
  {
    id: "doubt-is-feeling",
    rule: "Doubt is a feeling, not new evidence. A repeated doubt with no new fact is the loop.",
    theme: "checking",
  },
  {
    id: "feel-vs-dirt",
    rule: "Wash when hands are actually dirty — visible grime, soap, food — not just when they feel dirty.",
    theme: "contamination",
  },
  {
    id: "real-evidence",
    rule: "New, real sensory evidence — smelling gas, seeing smoke, an actual injury — is NOT the loop. Act on it.",
    theme: "safety",
  },
  {
    id: "anxiety-not-proof",
    rule: "Anxiety is a feeling, not proof of danger.",
    theme: "general",
  },
];

const RULES_BY_USER: Record<string, BaselineRule[]> = {
  // A demo user with a checking-focused baseline.
  "demo-user": DEFAULT_RULES,
};

/** Return the calm baseline rules for a user, falling back to the default set. */
export function getBaselineRulesForUser(userId: string): BaselineRule[] {
  return RULES_BY_USER[userId] ?? DEFAULT_RULES;
}
