export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, "") ?? "http://localhost:8787";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ?? "ws://localhost:8787";

/**
 * When true, the app drives the room with an in-browser mock orchestrator and
 * mocks REST endpoints the server stub does not yet implement. The real WS /
 * REST clients are still used whenever the server provides them (e.g.
 * `GET /api/experts`). Set NEXT_PUBLIC_USE_MOCK=false once the real
 * orchestrator implements the full `@echochamber/shared` contract.
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const CATEGORY_COLORS: Record<string, string> = {
  product: "#6366F1",
  design: "#EC4899",
  growth: "#10B981",
  vc: "#F59E0B",
  engineering: "#3B82F6",
  founder: "#8B5CF6",
};

export const CATEGORIES = [
  { id: "product", label: "Product" },
  { id: "design", label: "Design" },
  { id: "growth", label: "Growth" },
  { id: "vc", label: "VC" },
  { id: "engineering", label: "Engineering" },
  { id: "founder", label: "Founders" },
] as const;
