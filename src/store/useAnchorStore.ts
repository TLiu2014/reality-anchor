import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

import {
  evaluateCognitiveDistortion,
  type RiskLevel,
  type Resolution,
} from "@/lib/mcp/distortions";
import { getBaselineRulesForUser } from "@/lib/mcp/baselineRules";

/** The ERP delay is a 3-minute urge-surf window. */
export const ERP_DELAY_SECONDS = 180;

/** Client-side default anchors (mirrors the server-side baseline rules). */
export const DEFAULT_ANCHORS: string[] = getBaselineRulesForUser("demo-user").map(
  (r) => r.rule
);

const ANCHORS_KEY = "realityanchor:anchors";
const SESSION_KEY = "realityanchor:session";
const LAYOUT_KEY = "realityanchor:layout";

// ---- Node data shapes -------------------------------------------------------

export interface TriggerNodeData {
  text: string;
  turn: number;
  [key: string]: unknown;
}

export interface AnalysisNodeData {
  distortion: string;
  risk: RiskLevel;
  rationale: string;
  suggestedResponse: string;
  /** The baseline rule the trigger was compared against. */
  matchedRule?: string;
  /** True when this is a real safety signal, not the loop. */
  genuineRisk: boolean;
  /** Which engine produced this analysis. */
  source: "model" | "heuristic";
  turn: number;
  [key: string]: unknown;
}

/** Shape returned by /api/analyze (and the local heuristic fallback). */
export interface Analysis {
  distortion: string;
  risk: RiskLevel;
  rationale: string;
  suggestedResponse: string;
  genuineRisk: boolean;
  resolution: Resolution;
  source: "model" | "heuristic";
}

export interface ErpDelayNodeData {
  /** Absolute epoch ms when the countdown ends (survives remounts). */
  deadline: number | null;
  committed: boolean;
  delayMinutes: number;
  /** Full length of this delay in seconds — the ring fills relative to this. */
  totalSeconds: number;
  /** Server-side delay id, when Alexa+ handed us one (?delayId=erp-1). */
  delayId?: string;
  turn: number;
  [key: string]: unknown;
}

/** Terminal green node for the auto-resolve flow (anchor settled it, no delay). */
export interface ResolvedNodeData {
  message: string;
  matchedRule?: string;
  turn: number;
  [key: string]: unknown;
}

export type TriggerNode = Node<TriggerNodeData, "trigger">;
export type AnalysisNode = Node<AnalysisNodeData, "analysis">;
export type ErpDelayNode = Node<ErpDelayNodeData, "erpDelay">;
export type ResolvedNode = Node<ResolvedNodeData, "resolved">;
export type AppNode = TriggerNode | AnalysisNode | ErpDelayNode | ResolvedNode;

/** Clamp a requested ERP delay to a sane 1–120 minute window. */
export function clampDelayMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return ERP_DELAY_SECONDS / 60;
  return Math.min(120, Math.max(1, Math.round(minutes)));
}

// ---- Layout -----------------------------------------------------------------
//
// Each conversation turn is its own vertical lane (Trigger → Analysis → Delay);
// successive turns march rightward as columns, so a continued Alexa+ conversation
// grows the diagram sideways while each turn stays readable top-to-bottom.

const TURN_DX = 460;
const TRIGGER_Y = 0;
const ANALYSIS_Y = 250;
const DELAY_Y = 680;
const STEP_Y = [TRIGGER_Y, ANALYSIS_Y, DELAY_Y];

function nodePos(turn: number, step: number) {
  return { x: turn * TURN_DX, y: STEP_Y[step] ?? step * 250 };
}

// ---- Helpers ----------------------------------------------------------------

/**
 * Pacing between reveal steps so the flow builds up node-by-node (Trigger →
 * Analysis → Delay) instead of appearing all at once — matching the reference's
 * streamed reveal. When a real model backs the analysis its network latency
 * overlaps this, so the step still feels naturally paced.
 */
const DEMO_STEP_MS = 750;
const demoDelay = (ms: number = DEMO_STEP_MS) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

const RULE_STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "have", "just", "again", "need",
  "feel", "like", "will", "your", "you", "but", "not", "its", "was", "are",
  "what", "didnt", "did", "dont",
]);

/** Distinctive content words in a trigger (lowercased, stopwords removed). */
function contentWords(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter(
      (w) => !RULE_STOPWORDS.has(w)
    )
  );
}

/**
 * Whether a new trigger is about the same case as the ongoing session — i.e.
 * it shares a distinctive content word with any existing trigger. "My hands
 * feel dirty" after "washing my hands" → same case (continue). "Check the door"
 * → no overlap → new case (start over).
 */
function sameCase(trigger: string, existingTriggers: string[]): boolean {
  const now = contentWords(trigger);
  if (now.size === 0) return true; // nothing distinctive — treat as continuation
  const seen = new Set<string>();
  for (const t of existingTriggers) {
    for (const w of contentWords(t)) seen.add(w);
  }
  for (const w of now) if (seen.has(w)) return true;
  return false;
}

/** Pick the anchor most relevant to the trigger (keyword overlap). */
function matchRule(trigger: string, anchors: string[]): string | undefined {
  if (anchors.length === 0) return undefined;
  const words = (trigger.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter(
    (w) => !RULE_STOPWORDS.has(w)
  );
  let best = anchors[0];
  let bestScore = 0;
  for (const r of anchors) {
    const rl = r.toLowerCase();
    let score = 0;
    for (const w of words) if (rl.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

// ---- Node builders ----------------------------------------------------------

function buildTriggerNode(text: string, turn: number): TriggerNode {
  return {
    id: newId(),
    type: "trigger",
    position: nodePos(turn, 0),
    data: { text, turn },
  };
}

function buildAnalysisNode(
  analysis: Analysis,
  matchedRule: string | undefined,
  turn: number
): AnalysisNode {
  return {
    id: newId(),
    type: "analysis",
    position: nodePos(turn, 1),
    data: {
      distortion: analysis.distortion,
      risk: analysis.risk,
      rationale: analysis.rationale,
      suggestedResponse: analysis.suggestedResponse,
      matchedRule,
      genuineRisk: analysis.genuineRisk,
      source: analysis.source,
      turn,
    },
  };
}

/**
 * Get the analysis from the real model via /api/analyze; fall back to the local
 * heuristic if the endpoint is unreachable (e.g. SSR, offline). The endpoint
 * itself prefers the model and only uses the heuristic when no model is
 * configured — so the heuristic is strictly the dev/offline path.
 */
async function fetchAnalysis(
  trigger: string,
  anchors: string[]
): Promise<Analysis> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger, anchors }),
    });
    if (res.ok) {
      const d = await res.json();
      const resolution: Resolution =
        d.resolution === "auto" || d.resolution === "genuine"
          ? d.resolution
          : d.genuine_risk_signal
            ? "genuine"
            : "hitl";
      return {
        distortion: d.distortion,
        risk: d.risk,
        rationale: d.rationale,
        suggestedResponse: d.suggested_response,
        genuineRisk: d.genuine_risk_signal,
        resolution,
        source: d.source === "model" ? "model" : "heuristic",
      };
    }
  } catch {
    /* fall through to local heuristic */
  }
  const a = evaluateCognitiveDistortion(trigger);
  return {
    distortion: a.distortion,
    risk: a.risk,
    rationale: a.rationale,
    suggestedResponse: a.suggested_response,
    genuineRisk: a.genuine_risk_signal,
    resolution: a.resolution,
    source: "heuristic",
  };
}

function buildErpDelayNode(
  delayMinutes: number,
  turn: number,
  delayId?: string
): ErpDelayNode {
  const totalSeconds = delayMinutes * 60;
  return {
    id: newId(),
    type: "erpDelay",
    position: nodePos(turn, 2),
    data: {
      deadline: Date.now() + totalSeconds * 1000,
      committed: false,
      delayMinutes,
      totalSeconds,
      delayId,
      turn,
    },
  };
}

function buildResolvedNode(
  message: string,
  matchedRule: string | undefined,
  turn: number
): ResolvedNode {
  return {
    id: newId(),
    type: "resolved",
    position: nodePos(turn, 2),
    data: { message, matchedRule, turn },
  };
}

function edge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target, animated: true };
}

/** Turn Alexa+'s `?trigger=touched_mail` into readable prose. */
function decodeTriggerParam(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/** Context Alexa+ passes when it opens /mcp-view (via URL search params). */
export interface HydrationContext {
  tool?: string | null;
  trigger?: string | null;
  minutes?: number | null;
  delayId?: string | null;
  /** Groups follow-up hydrations into one growing session. */
  conversationId?: string | null;
  userId?: string | null;
}

// ---- Session persistence ----------------------------------------------------

interface PersistedSession {
  conversationId: string | null;
  turn: number;
  nodes: AppNode[];
  edges: Edge[];
}

function loadSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.nodes)) return parsed as PersistedSession;
  } catch {
    /* ignore */
  }
  return null;
}

function loadAnchors(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ANCHORS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((r) => typeof r === "string");
  } catch {
    /* ignore */
  }
  return null;
}

// ---- Store ------------------------------------------------------------------

export type RightTab = "details" | "anchors" | "map";

/**
 * Which main view is the center (hero):
 *  - "intervention": Node Details is center; the flow map is a side tab.
 *  - "map": the flow diagram is center; Node Details is a side tab.
 */
export type LayoutMode = "intervention" | "map";

interface AnchorState {
  userId: string;
  conversationId: string | null;
  turn: number;
  nodes: AppNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  anchors: string[];
  /** Whether the user has customized anchors (vs. showing defaults). */
  anchorsCustomized: boolean;
  rightTab: RightTab;
  layoutMode: LayoutMode;

  // React Flow wiring
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Selection / tabs / layout
  openDetails: (nodeId: string) => void;
  closeDetails: () => void;
  setRightTab: (tab: RightTab) => void;
  setLayoutMode: (mode: LayoutMode) => void;

  // Flow actions
  /**
   * Run a trigger. Continues the current flow when it's the same case; starts a
   * fresh flow when it's a different case (or `forceNew` is set — e.g. a preset,
   * which is always an independent case).
   */
  addTurn: (text: string, forceNew?: boolean) => void;
  /** Hydrate/continue the flow from Alexa+ context (URL params). */
  hydrateFromContext: (ctx: HydrationContext) => string | null;
  /** Resolve a specific ERP delay node (button press). */
  commitDelay: (nodeId: string) => void;
  reset: () => void;

  // Anchors
  setAnchors: (rules: string[]) => void;
  resetAnchors: () => void;

  // Persistence
  hydrateSettings: () => void;
}

/** The anchors actually in effect (custom set, else defaults). */
export function effectiveAnchors(s: {
  anchors: string[];
  anchorsCustomized: boolean;
}): string[] {
  return s.anchorsCustomized && s.anchors.length > 0 ? s.anchors : DEFAULT_ANCHORS;
}

export const useAnchorStore = create<AnchorState>((set, get) => {
  function persist() {
    if (typeof window === "undefined") return;
    const { conversationId, turn, nodes, edges } = get();
    try {
      window.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ conversationId, turn, nodes, edges })
      );
    } catch {
      /* ignore quota */
    }
  }

  // In "map" layout, node details live in a side tab, so surface freshly-built
  // nodes there. In "intervention" layout details are the center view (driven by
  // selectedNodeId) — leave the side tab (map / anchors) as the user left it.
  const surfacedTab = (): RightTab =>
    get().layoutMode === "map" ? "details" : get().rightTab;

  /**
   * Append one turn to the given base. The trigger node shows immediately; the
   * analysis is fetched from the real model (via /api/analyze) and the analysis
   * + delay nodes are added when it returns — a progressive reveal.
   */
  async function appendTurn(
    baseNodes: AppNode[],
    baseEdges: Edge[],
    turn: number,
    trigger: string,
    delayId?: string,
    minutesOverride?: number,
    forceDelay?: boolean
  ): Promise<void> {
    const anchors = effectiveAnchors(get());
    const triggerNode = buildTriggerNode(trigger, turn);

    // Step 1) Trigger appears immediately; the analysis fetch runs concurrently
    // with the reveal pause below.
    set({
      nodes: [...baseNodes, triggerNode],
      edges: baseEdges,
      turn,
      selectedNodeId: triggerNode.id,
      rightTab: surfacedTab(),
    });
    persist();

    const analysisPromise = fetchAnalysis(trigger, anchors);
    await demoDelay();
    const analysis = await analysisPromise;
    const matchedRule = matchRule(trigger, anchors);
    const analysisNode = buildAnalysisNode(analysis, matchedRule, turn);

    // Step 2) Analysis appears.
    const nodes2: AppNode[] = [...baseNodes, triggerNode, analysisNode];
    const edges2: Edge[] = [...baseEdges, edge(triggerNode.id, analysisNode.id)];
    set({
      nodes: nodes2,
      edges: edges2,
      turn,
      selectedNodeId: analysisNode.id,
      rightTab: surfacedTab(),
    });
    persist();

    // Step 3) Terminal node. A genuine safety signal ends at the analysis (act,
    // don't delay). Otherwise: "hitl" → an ERP delay to urge-surf; "auto" → the
    // anchor already settles it, so the flow auto-resolves (grounded, no delay).
    // Alexa+ explicitly calling trigger_erp_delay always forces the HITL delay.
    if (!analysis.genuineRisk) {
      const mode: "hitl" | "auto" =
        forceDelay || analysis.resolution !== "auto" ? "hitl" : "auto";
      await demoDelay();
      const node3: AppNode =
        mode === "hitl"
          ? buildErpDelayNode(
              clampDelayMinutes(minutesOverride ?? ERP_DELAY_SECONDS / 60),
              turn,
              delayId
            )
          : buildResolvedNode(
              "No pause, and nothing handed back to you — this is the feeling, not real evidence. Your anchor already settles it, so the loop resolves on its own.",
              matchedRule,
              turn
            );
      set({
        nodes: [...nodes2, node3],
        edges: [...edges2, edge(analysisNode.id, node3.id)],
        turn,
        selectedNodeId: node3.id,
        rightTab: surfacedTab(),
      });
      persist();
    }
  }

  return {
    userId: "demo-user",
    conversationId: null,
    turn: -1,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    anchors: DEFAULT_ANCHORS,
    anchorsCustomized: false,
    rightTab: "map",
    layoutMode: "intervention",

    onNodesChange: (changes) =>
      set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as AppNode[] })),
    onEdgesChange: (changes) =>
      set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
    onConnect: (connection) =>
      set((s) => ({ edges: addEdge(connection, s.edges) })),

    openDetails: (nodeId) =>
      set((s) => ({
        selectedNodeId: nodeId,
        // Details are the center in "intervention"; a side tab in "map".
        rightTab: s.layoutMode === "map" ? "details" : s.rightTab,
      })),
    closeDetails: () => set({ selectedNodeId: null }),
    setRightTab: (tab) => set({ rightTab: tab }),
    setLayoutMode: (mode) => {
      set({ layoutMode: mode });
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LAYOUT_KEY, mode);
        } catch {
          /* ignore */
        }
      }
    },

    addTurn: (text, forceNew = false) => {
      const trigger = text.trim();
      if (!trigger) return;
      const s = get();
      const existingTriggers = s.nodes
        .filter((n): n is TriggerNode => n.type === "trigger")
        .map((n) => n.data.text);

      const startOver =
        forceNew ||
        existingTriggers.length === 0 ||
        !sameCase(trigger, existingTriggers);

      // Fire-and-forget: appendTurn drives the store via set() as it resolves.
      if (startOver) {
        // New case → fresh flow: new conversation, clear the old lanes.
        set({ conversationId: newId(), turn: -1 });
        void appendTurn([], [], 0, trigger);
      } else {
        // Same case → continue: append the next lane.
        void appendTurn(s.nodes, s.edges, s.turn + 1, trigger);
      }
    },

    hydrateFromContext: (ctx) => {
      const tool = ctx.tool ?? undefined;
      const trigger = ctx.trigger ? decodeTriggerParam(ctx.trigger) : "";
      const minutes = ctx.minutes != null ? Number(ctx.minutes) : undefined;
      const delayId = ctx.delayId?.trim() || undefined;
      const convId = ctx.conversationId?.trim() || undefined;
      const userId = ctx.userId?.trim() || get().userId;

      if (!tool && !trigger) return null;

      // Continue an existing session when the conversationId matches; otherwise
      // start fresh. This is how an Alexa+ follow-up grows the same diagram.
      const s = get();
      const continuing = convId != null && convId === s.conversationId;
      const baseNodes = continuing ? s.nodes : [];
      const baseEdges = continuing ? s.edges : [];
      const turn = continuing ? s.turn + 1 : 0;

      set({
        userId,
        conversationId: convId ?? s.conversationId ?? newId(),
      });

      const forceDelay = tool === "trigger_erp_delay";

      // A delay context with no trigger still shows a bare timer.
      if (!trigger && forceDelay) {
        const d = buildErpDelayNode(
          clampDelayMinutes(minutes ?? ERP_DELAY_SECONDS / 60),
          turn,
          delayId
        );
        set({
          nodes: [...baseNodes, d],
          edges: baseEdges,
          turn,
          selectedNodeId: d.id,
          rightTab: surfacedTab(),
        });
        persist();
        return null;
      }

      // Kick off the (async) turn build; return the decoded trigger now so the
      // page can populate the input synchronously.
      void appendTurn(baseNodes, baseEdges, turn, trigger, delayId, minutes, forceDelay);
      return trigger || null;
    },

    commitDelay: (nodeId) => {
      const s = get();
      const node = s.nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== "erpDelay" || node.data.committed) return;

      const erp = node as ErpDelayNode;
      const triggerNode = s.nodes.find(
        (n) => n.type === "trigger" && n.data.turn === erp.data.turn
      ) as TriggerNode | undefined;
      const waitedFully =
        erp.data.deadline == null || Date.now() >= erp.data.deadline;

      set({
        nodes: s.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, committed: true, deadline: null } }
            : n
        ) as AppNode[],
      });
      persist();

      // Close the loop: tell the backend the user delayed successfully.
      fetch("/api/resume-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delayId: erp.data.delayId,
          trigger: triggerNode?.data.text,
          delayMinutes: erp.data.delayMinutes,
          outcome: waitedFully ? "delayed" : "committed_early",
        }),
      }).catch(() => {
        /* the visual win already stands */
      });
    },

    reset: () => {
      set({
        conversationId: null,
        turn: -1,
        nodes: [],
        edges: [],
        selectedNodeId: null,
      });
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(SESSION_KEY);
        } catch {
          /* ignore */
        }
      }
    },

    setAnchors: (rules) => {
      const cleaned = rules.map((r) => r.trim()).filter(Boolean);
      set({ anchors: cleaned, anchorsCustomized: true });
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(ANCHORS_KEY, JSON.stringify(cleaned));
        } catch {
          /* ignore */
        }
      }
    },

    resetAnchors: () => {
      set({ anchors: DEFAULT_ANCHORS, anchorsCustomized: false });
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(ANCHORS_KEY);
        } catch {
          /* ignore */
        }
      }
    },

    hydrateSettings: () => {
      const anchors = loadAnchors();
      if (anchors && anchors.length > 0) {
        set({ anchors, anchorsCustomized: true });
      }
      if (typeof window !== "undefined") {
        try {
          const lm = window.localStorage.getItem(LAYOUT_KEY);
          if (lm === "intervention" || lm === "map") set({ layoutMode: lm });
        } catch {
          /* ignore */
        }
      }
      const session = loadSession();
      if (session && session.nodes.length > 0) {
        set({
          conversationId: session.conversationId,
          turn: session.turn,
          nodes: session.nodes,
          edges: session.edges,
        });
      }
    },
  };
});
