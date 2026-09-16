import { agenticApi } from "./api";
import { askChat as askDemoChat } from "./chatService";

// agentic-core keeps per-session conversation state (session_manager.py),
// so we need a stable id that survives page reloads but is unique per
// browser/device. Persist it in localStorage instead of minting a fresh
// one on every chat call.
const SESSION_STORAGE_KEY = "jalsetu-agentic-session-id";

function generateSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAgenticSessionId() {
  if (typeof window === "undefined") return generateSessionId();
  try {
    let id = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = generateSessionId();
      window.localStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to an
    // id that's at least stable for the lifetime of this module load.
    return generateSessionId();
  }
}

const AGENT_LABELS = {
  weather_agent: "Weather",
  ocean_agent: "Ocean",
  risk_agent: "Risk",
  route_agent: "Route",
  hazard_agent: "Hazard",
  welfare_agent: "Welfare",
  emergency_agent: "Emergency",
};

function agentLabel(agent) {
  return AGENT_LABELS[agent] || agent;
}

function confidenceLevel(avg) {
  if (avg >= 0.75) return "High";
  if (avg >= 0.5) return "Moderate";
  return "Low";
}

// Turns agentic-core's generic { agent, ok, data, confidence, stale, error }
// AgentResult array into the sources/confidence/reasoning shape ChatWindow
// already knows how to render for a chat turn.
function buildLiveMessage(question, chatResponse) {
  const agentResults = chatResponse.agent_results || [];
  const okResults = agentResults.filter((r) => r.ok);

  const sources = [...new Set(okResults.map((r) => agentLabel(r.agent)))];

  const numericConfidences = okResults
    .map((r) => r.confidence)
    .filter((c) => typeof c === "number");

  const confidence = numericConfidences.length
    ? {
        level: confidenceLevel(
          numericConfidences.reduce((sum, c) => sum + c, 0) / numericConfidences.length
        ),
        score: Math.round(
          (numericConfidences.reduce((sum, c) => sum + c, 0) / numericConfidences.length) * 100
        ),
      }
    : undefined;

  const reasoning = agentResults.length
    ? agentResults
        .map((r) => {
          const status = r.ok ? (r.stale ? "stale" : "live") : "unavailable";
          const pct = typeof r.confidence === "number" ? ` · ${Math.round(r.confidence * 100)}%` : "";
          const errNote = r.error ? ` — ${r.error}` : "";
          return `${agentLabel(r.agent)}: ${status}${pct}${errNote}`;
        })
        .join("\n")
    : undefined;

  return {
    id: `agentic-${chatResponse.session_id}-${Date.now()}`,
    role: "assistant",
    question,
    answer: chatResponse.answer,
    sources,
    confidence,
    reasoning,
    live: true,
    degraded: chatResponse.degraded,
  };
}

/**
 * Sends a question to the real agentic-core `/chat` pipeline and returns a
 * message object shaped for ChatWindow/AppDataProvider's `chat` list.
 *
 * If agentic-core is unreachable (not running, network error, timeout),
 * falls back to the canned demo template response (`askChat`) so the UI
 * keeps working, but tags the message `live: false` so the caller can show
 * that it's a demo/offline answer rather than pretending it's live.
 */
export async function sendAgenticChat({ question, language, location, demoContext }) {
  const sessionId = getAgenticSessionId();

  try {
    const { data } = await agenticApi.post("/chat", {
      session_id: sessionId,
      text: question,
      language,
      location: location || undefined,
    });

    return buildLiveMessage(question, data);
  } catch (err) {
    console.warn(
      "agentic-core /chat unavailable, falling back to demo response:",
      err?.message || err
    );
    const fallback = askDemoChat(question, demoContext);
    return { ...fallback, live: false };
  }
}