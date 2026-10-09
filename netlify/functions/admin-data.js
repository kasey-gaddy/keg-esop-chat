// Admin data handler — uses Netlify Blobs for storage (free, no API token needed)
const { getStore } = require("@netlify/blobs");

function getBlobStore(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN,
  });
}

const DEFAULT_QUESTIONS = {
  en: {
    employee: ["How does the ESOP work?","When do I start getting vested?","What if I leave before I'm vested?","What could my ESOP be worth?","What is Blue Diamond Legacy Holdings?","When can I collect my money?"],
    prospect: ["What does employee ownership mean for me?","Do I pay anything to get stock?","How long until it's mine to keep?","What could my ESOP be worth?","What kind of work does KE&G do?"],
  },
  es: {
    employee: ["¿Cómo funciona el ESOP?","¿Cuándo empiezo a adquirir derechos?","¿Qué pasa si me voy antes?","¿Cuánto podría valer mi ESOP?","¿Qué es Blue Diamond Legacy Holdings?","¿Cuándo puedo cobrar mi dinero?"],
    prospect: ["¿Qué significa ser propietario empleado?","¿Pago algo por las acciones?","¿Cuánto tiempo hasta que sean mías?","¿Cuánto podría valer mi ESOP?","¿Qué tipo de trabajo hace KE&G?"],
  },
};

function getAdminPass() {
  return process.env.ADMIN_PASSWORD || "K3&GMarketing";
}

async function getQuestions() {
  try {
    const store = getBlobStore("esop-config");
    const raw = await store.get("questions");
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_QUESTIONS;
}

async function getDocs() {
  try {
    const store = getBlobStore("esop-docs");
    const raw = await store.get("index");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function getLogData() {
  const dbUrl = process.env.NETLIFY_DATABASE_URL;
  if (!dbUrl) {
    return { rows: [], summary: { total: 0, byTheme: {}, byMode: {}, byLanguage: {}, byMonth: {}, uniqueSessions: {} } };
  }

  try {
    const res = await fetch(`${dbUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "nf-db-token": process.env.NETLIFY_DB_TOKEN || "" },
      body: JSON.stringify({
        query: `SELECT timestamp, month, mode, language, theme, question, session_id
                FROM esop_questions
                ORDER BY timestamp DESC
                LIMIT 500`,
        params: [],
      }),
    });

    if (!res.ok) return { rows: [], summary: buildSummary([]) };
    const data = await res.json();
    const rows = (data.rows || []).map(r => ({
      timestamp: r.timestamp,
      month: r.month,
      mode: r.mode,
      language: r.language,
      theme: r.theme,
      question: r.question,
      sessionId: r.session_id,
    }));
    return { rows, summary: buildSummary(rows) };
  } catch (err) {
    console.error("getLogData error:", err.message);
    return { rows: [], summary: buildSummary([]) };
  }
}

function buildSummary(rows) {
  const summary = { total: 0, byTheme: {}, byMode: {}, byLanguage: {}, byMonth: {}, uniqueSessions: {} };
  rows.forEach(r => {
    summary.total++;
    summary.byTheme[r.theme] = (summary.byTheme[r.theme] || 0) + 1;
    summary.byMode[r.mode] = (summary.byMode[r.mode] || 0) + 1;
    summary.byLanguage[r.language] = (summary.byLanguage[r.language] || 0) + 1;
    summary.byMonth[r.month] = (summary.byMonth[r.month] || 0) + 1;
    if (!summary.uniqueSessions[r.month]) summary.uniqueSessions[r.month] = new Set();
    summary.uniqueSessions[r.month].add(r.sessionId);
  });
  Object.keys(summary.uniqueSessions).forEach(m => {
    summary.uniqueSessions[m] = summary.uniqueSessions[m].size;
  });
  return summary;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const auth = event.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const isPublic = token === "__public__";
  const isAdmin = token === getAdminPass();

  if (!isPublic && !isAdmin) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (event.httpMethod === "GET") {
    try {
      const questions = await getQuestions();

      if (isPublic) {
        return { statusCode: 200, headers, body: JSON.stringify({ questions }) };
      }

      const logData = await getLogData();
      const docs = await getDocs();

      const monthMap = {};
      logData.rows.forEach(r => {
        if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, total: 0, byTheme: {}, byMode: {}, byLanguage: {}, sessions: new Set(), recentQuestions: [] };
        const m = monthMap[r.month];
        m.total++;
        m.byTheme[r.theme] = (m.byTheme[r.theme] || 0) + 1;
        m.byMode[r.mode] = (m.byMode[r.mode] || 0) + 1;
        m.byLanguage[r.language] = (m.byLanguage[r.language] || 0) + 1;
        m.sessions.add(r.sessionId);
        if (m.recentQuestions.length < 100) m.recentQuestions.push(r);
      });

      const summaries = Object.values(monthMap).map(m => ({ ...m, uniqueSessions: m.sessions.size, sessions: undefined })).sort((a, b) => b.month.localeCompare(a.month));
      const monthIndex = summaries.map(s => s.month);

      const aggregate = {
        total: logData.summary.total,
        uniqueSessions: Object.values(logData.summary.uniqueSessions).reduce((a, b) => a + b, 0),
        byTheme: logData.summary.byTheme,
        byMode: logData.summary.byMode,
        byLanguage: logData.summary.byLanguage,
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          questions,
          docs,
          monthIndex,
          summaries,
          aggregate,
          recentQuestions: logData.rows.slice(0, 100),
          hasDb: !!process.env.NETLIFY_DATABASE_URL,
        }),
      };
    } catch (err) {
      console.error("admin GET error:", err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (!isAdmin) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");

      if (body.action === "saveQuestions") {
        const store = getBlobStore("esop-config");
        await store.set("questions", JSON.stringify(body.questions));
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      if (body.action === "saveDocs") {
        const store = getBlobStore("esop-docs");
        await store.set("index", JSON.stringify(body.docs));
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
