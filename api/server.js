/**
 * server.js
 * ---------
 * API Gateway for the Campus Policies RAG system (Team 18).
 *
 * Sits between the React frontend and the Python FastAPI NLP microservice.
 * Responsibilities:
 *   - Manage conversation sessions (so the frontend doesn't have to track
 *     and resend the full chat history itself)
 *   - Route /api/ask requests to the FastAPI service, attaching the
 *     session's conversation history
 *   - Basic request validation and error handling
 *
 * Requires Node.js 18+ (uses the built-in `fetch` and `crypto.randomUUID`).
 *
 * Setup:
 *   npm install
 *
 * Configure (optional — defaults shown below are used if .env is absent):
 *   Create a .env file in this folder:
 *     PORT=4000
 *     FASTAPI_URL=http://127.0.0.1:8000
 *
 * Run:
 *   npm start        (normal)
 *   npm run dev       (auto-restarts on file changes, Node 18.11+)
 */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const PORT = process.env.PORT || 4000;
const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

const app = express();
app.use(express.json());
app.use(cors()); // tighten origins before deploying (see note near the bottom)

// --------------------------------------------------------------------------
// In-memory session store
// --------------------------------------------------------------------------
// sessionId -> [{ role: "user"|"assistant", content: "..." }, ...]
//
// NOTE: this is intentionally simple (in-memory, resets on server restart)
// — fine for a class project / single-instance deployment. For production,
// this would be swapped for Redis or a database.
const sessions = new Map();

function createSession() {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, []);
  return sessionId;
}

function getHistory(sessionId) {
  return sessions.get(sessionId) || null;
}

function appendTurn(sessionId, role, content) {
  const history = sessions.get(sessionId);
  if (history) {
    history.push({ role, content });
  }
}

// --------------------------------------------------------------------------
// Routes
// --------------------------------------------------------------------------

// Health check — also verifies the FastAPI service is reachable.
app.get("/api/health", async (req, res) => {
  try {
    const response = await fetch(`${FASTAPI_URL}/health`);
    const data = await response.json();
    res.json({ gateway: "ok", nlp_service: data });
  } catch (err) {
    res.status(503).json({
      gateway: "ok",
      nlp_service: "unreachable",
      error: err.message,
    });
  }
});

// Start a new conversation session.
app.post("/api/session", (req, res) => {
  const sessionId = createSession();
  res.json({ sessionId });
});

// Ask a question within a session.
app.post("/api/ask", async (req, res) => {
  const { sessionId, question } = req.body;

  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "`question` is required." });
  }

  // Auto-create a session if the client didn't provide one, so the
  // endpoint is still usable for quick one-off testing (e.g. curl/Postman).
  let activeSessionId = sessionId;
  if (!activeSessionId || !sessions.has(activeSessionId)) {
    activeSessionId = createSession();
  }

  const history = getHistory(activeSessionId);

  try {
    const response = await fetch(`${FASTAPI_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(502).json({
        error: "NLP service returned an error.",
        detail: errorBody,
      });
    }

    const data = await response.json();

    // Update session history for the next turn.
    appendTurn(activeSessionId, "user", question);
    appendTurn(activeSessionId, "assistant", data.answer);

    res.json({
      sessionId: activeSessionId,
      answer: data.answer,
      sources: data.sources,
    });
  } catch (err) {
    res.status(502).json({
      error: "Could not reach the NLP service.",
      detail: err.message,
    });
  }
});

// Clear a session's history (e.g. "start new chat" button in the frontend).
app.delete("/api/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const existed = sessions.delete(sessionId);
  res.json({ deleted: existed });
});

// --------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log(" Campus Policies RAG — API Gateway");
  console.log("=".repeat(60));
  console.log(`🚀 Gateway running at        http://127.0.0.1:${PORT}`);
  console.log(`🔗 Forwarding NLP requests to ${FASTAPI_URL}`);
  console.log("=".repeat(60));
});

// NOTE on CORS: app.use(cors()) above allows requests from any origin,
// which is convenient during development. Before deploying, restrict it:
//   app.use(cors({ origin: "https://your-frontend-domain.com" }));
