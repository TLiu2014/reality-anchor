import type { AppNode } from "@/store/useAnchorStore";

export interface NodeMeta {
  /** Short label for chips / card titles. */
  label: string;
  /** Accent hex for the status dot / border. */
  color: string;
  /** Human status word. */
  state: string;
}

/** Presentation metadata for a node, shared by trace chips and detail cards. */
export function nodeMeta(node: AppNode): NodeMeta {
  switch (node.type) {
    case "trigger":
      return { label: "Trigger", color: "#94a3b8", state: "You said" };
    case "analysis":
      return node.data.genuineRisk
        ? { label: "Reality check", color: "#ef4444", state: "Safety signal" }
        : { label: "Analysis", color: "#3b82f6", state: node.data.distortion };
    case "erpDelay":
      return node.data.committed
        ? { label: "ERP delay", color: "#22c55e", state: "Resolved" }
        : { label: "ERP delay", color: "#eab308", state: "Sit with it" };
    case "resolved":
      return { label: "Resolved", color: "#22c55e", state: "No action needed" };
    default:
      return { label: "Step", color: "#94a3b8", state: "" };
  }
}
