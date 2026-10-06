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

// In-memory config store (persists per function instance)
// For questions and docs we use env vars as the persistent layer
const configCache = {};

function getAdminPass() {
  return process.env.ADMIN_PASSWORD || "K3&GMarketing";
}

function getQuestions() {
  try {
    const raw = process.env.CUSTOM_QUESTIONS;
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_QUESTIONS;
}

function getDocs() {
  try {
    const raw = process.env.CUSTOM_DOCS;
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Parse console logs from Netlify function logs for analytics
// Since we always console.log questions, we can read them back
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
  // Convert sets to counts
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

  // Auth check — skip for public questions endpoint
  const auth = event.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const isPublic = token === "__public__";
  const isAdmin = token === getAdminPass();

  if (!isPublic && !isAdmin) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // GET
  if (event.httpMethod === "GET") {
    try {
      const questions = getQuestions();

      // Public endpoint only returns questions
      if (isPublic) {
        return { statusCode: 200, headers, body: JSON.stringify({ questions }) };
      }

      // Admin gets everything
      const logData = await getLogData();
      const docs = getDocs();

      // Build month-by-month summaries from rows
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

      // Aggregate totals
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

  // POST — admin only
  if (!isAdmin) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");

      if (body.action === "saveQuestions") {
        // Save to env var via Netlify API
        const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
        const netlifyToken = process.env.NETLIFY_API_TOKEN;
        if (siteId && netlifyToken) {
          await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/CUSTOM_QUESTIONS`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${netlifyToken}` },
            body: JSON.stringify({ key: "CUSTOM_QUESTIONS", values: [{ value: JSON.stringify(body.questions), context: "all" }] }),
          });
        }
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      if (body.action === "saveDocs") {
        const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
        const netlifyToken = process.env.NETLIFY_API_TOKEN;
        if (siteId && netlifyToken) {
          await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/CUSTOM_DOCS`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${netlifyToken}` },
            body: JSON.stringify({ key: "CUSTOM_DOCS", values: [{ value: JSON.stringify(body.docs), context: "all" }] }),
          });
        }
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
