/**
 * Mock cognitive-distortion analysis.
 *
 * `evaluate_cognitive_distortion` takes a free-text trigger event (spoken to an
 * Echo, or typed into the Alexa app) and classifies it against a small library
 * of well-known CBT distortions. This is a deterministic keyword matcher — a
 * stand-in for a model call — so the demo is reproducible and offline.
 *
 * Every analysis carries a `resolution` describing what the flow should do next:
 *   - "hitl"    — a repeat/doubt compulsion → hold an ERP delay (human-in-the-loop
 *                 countdown the user urge-surfs before acting).
 *   - "auto"    — an anchor already shows the action was never warranted → the
 *                 flow auto-resolves; no delay needed.
 *   - "genuine" — real new sensory evidence of danger → act now, not the loop.
 */

export type RiskLevel = "low" | "medium" | "high";
export type Resolution = "hitl" | "auto" | "genuine";

export interface DistortionAnalysis {
  trigger_event: string;
  distortion: string;
  risk: RiskLevel;
  rationale: string;
  /** What the coach should do next. */
  suggested_response: string;
  /** True when the text reads like real, actionable danger, not a loop. */
  genuine_risk_signal: boolean;
  /** How the flow should terminate — HITL delay, auto-resolve, or act now. */
  resolution: Resolution;
}

interface Pattern {
  distortion: string;
  risk: RiskLevel;
  keywords: string[];
  rationale: string;
  suggested_response: string;
}

// A genuine safety signal must break out of the loop framing entirely.
const GENUINE_RISK_KEYWORDS = [
  "smell gas",
  "smell smoke",
  "see smoke",
  "bleeding",
  "chest pain",
  "can't breathe",
  "cant breathe",
];

// Auto-resolve: the trigger is a feeling of contamination/danger that the text
// itself already contradicts ("looks clean", "haven't touched anything"), so an
// anchor settles it and no compulsion is warranted.
const FEELING_KEYWORDS = ["contaminated", "dirty", "germs", "feel", "feels"];
const CLEAN_EVIDENCE_KEYWORDS = [
  "completely clean",
  "look clean",
  "looks clean",
  "look completely clean",
  "actually clean",
  "haven't touched",
  "havent touched",
  "nothing dirty",
  "not actually dirty",
  "no real",
];

const PATTERNS: Pattern[] = [
  {
    distortion: "Catastrophizing",
    risk: "high",
    keywords: [
      "what if",
      "burns down",
      "burn down",
      "die",
      "kill",
      "disaster",
      "worst",
      "everyone will",
    ],
    rationale:
      "The thought leaps to the worst possible outcome and treats it as likely, driving the urge to re-check for certainty.",
    suggested_response:
      "Don't re-check or reassure — that's the compulsion. Hand control to the user: hold a short ERP delay and sit with the uncertainty. Ground them only after they commit.",
  },
  {
    distortion: "Emotional reasoning",
    risk: "medium",
    keywords: ["feel", "feels", "feeling", "contaminated", "dirty", "unsafe"],
    rationale:
      "A feeling (dirty, unsafe, doubtful) is being treated as if it were factual evidence.",
    suggested_response:
      "Separate the feeling from the facts, then offer an ERP delay to let the feeling crest without acting on it.",
  },
  {
    distortion: "Doubt / need for certainty",
    risk: "medium",
    keywords: ["not sure", "what if i didn't", "did i", "check again", "again"],
    rationale:
      "Intolerance of uncertainty: the mind demands 100% certainty and re-checking, which never resolves the doubt.",
    suggested_response:
      "Reassurance on demand is the compulsion; delaying it is the therapy. Hold an ERP delay instead of re-checking.",
  },
];

/** Classify a trigger event against the distortion library. */
export function evaluateCognitiveDistortion(
  triggerEvent: string
): DistortionAnalysis {
  const text = triggerEvent.toLowerCase();

  const genuine = GENUINE_RISK_KEYWORDS.some((k) => text.includes(k));
  if (genuine) {
    return {
      trigger_event: triggerEvent,
      distortion: "None — genuine safety signal",
      risk: "high",
      rationale:
        "This is new, real sensory evidence — not a repeated doubt with nothing changed. It is NOT the OCD loop.",
      suggested_response:
        "Do not delay. Act now — turn it off, get out, and call for help. Knowing when NOT to intervene is what makes the rest trustworthy.",
      genuine_risk_signal: true,
      resolution: "genuine",
    };
  }

  const autoResolve =
    FEELING_KEYWORDS.some((k) => text.includes(k)) &&
    CLEAN_EVIDENCE_KEYWORDS.some((k) => text.includes(k));
  if (autoResolve) {
    return {
      trigger_event: triggerEvent,
      distortion: "Emotional reasoning",
      risk: "low",
      rationale:
        "This is the feeling of contamination, not real dirt — the trigger itself says the hands look clean and nothing dirty was touched.",
      suggested_response:
        "No pause needed. Your anchor already settles this — wash only when hands are actually dirty, not when they feel dirty — so the loop resolves on its own.",
      genuine_risk_signal: false,
      resolution: "auto",
    };
  }

  const match = PATTERNS.find((p) => p.keywords.some((k) => text.includes(k)));
  if (match) {
    return {
      trigger_event: triggerEvent,
      distortion: match.distortion,
      risk: match.risk,
      rationale: match.rationale,
      suggested_response: match.suggested_response,
      genuine_risk_signal: false,
      resolution: "hitl",
    };
  }

  return {
    trigger_event: triggerEvent,
    distortion: "Unclassified rumination",
    risk: "low",
    rationale:
      "No specific distortion pattern matched, but the concern is being revisited without new evidence.",
    suggested_response:
      "Reflect the concern back, then offer a brief ERP delay if the urge to act persists.",
    genuine_risk_signal: false,
    resolution: "hitl",
  };
}
