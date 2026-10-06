const { getStore } = require("@netlify/blobs");

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
  const adminPass = process.env.ADMIN_PASSWORD || "K3&GMarketing";

  if (token !== adminPass) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const logStore = getStore("esop-logs");
  const configStore = getStore("esop-config");

  // GET — return analytics + config
  if (event.httpMethod === "GET") {
    try {
      // Load month index
      let monthIndex;
      try { monthIndex = await logStore.get("month-index", { type: "json" }); } catch {}
      if (!monthIndex) monthIndex = [];

      const recentMonths = monthIndex.slice(0, 12);

      // Load summaries
      const summaries = await Promise.all(
        recentMonths.map(async (m) => {
          try {
            const s = await logStore.get(`summary-${m}`, { type: "json" });
            return s || { month: m, total: 0, sessions: [], byTheme: {}, byMode: {}, byLanguage: {}, recentQuestions: [] };
          } catch {
            return { month: m, total: 0, sessions: [], byTheme: {}, byMode: {}, byLanguage: {}, recentQuestions: [] };
          }
        })
      );

      // Aggregate totals
      const agg = { total: 0, uniqueSessions: new Set(), byTheme: {}, byMode: {}, byLanguage: {} };
      summaries.forEach(s => {
        agg.total += s.total || 0;
        (s.sessions || []).forEach(sid => agg.uniqueSessions.add(sid));
        Object.entries(s.byTheme || {}).forEach(([k, v]) => { agg.byTheme[k] = (agg.byTheme[k] || 0) + v; });
        Object.entries(s.byMode || {}).forEach(([k, v]) => { agg.byMode[k] = (agg.byMode[k] || 0) + v; });
        Object.entries(s.byLanguage || {}).forEach(([k, v]) => { agg.byLanguage[k] = (agg.byLanguage[k] || 0) + v; });
      });

      // Load custom questions
      let questions = DEFAULT_QUESTIONS;
      try {
        const custom = await configStore.get("custom-questions", { type: "json" });
        if (custom) questions = custom;
      } catch {}

      // Load doc index
      let docIndex = { docs: [] };
      try {
        const docStore = getStore("esop-docs");
        const di = await docStore.get("doc-index", { type: "json" });
        if (di) docIndex = di;
      } catch {}

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          monthIndex: recentMonths,
          summaries,
          aggregate: {
            total: agg.total,
            uniqueSessions: agg.uniqueSessions.size,
            byTheme: agg.byTheme,
            byMode: agg.byMode,
            byLanguage: agg.byLanguage,
          },
          recentQuestions: summaries.flatMap(s => s.recentQuestions || []).slice(0, 100),
          questions,
          docIndex,
        }),
      };
    } catch (err) {
      console.error("admin GET error:", err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST — save questions or delete doc
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");

      if (body.action === "saveQuestions") {
        await configStore.setJSON("custom-questions", body.questions);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      if (body.action === "deleteDoc") {
        const docStore = getStore("esop-docs");
        let index;
        try { index = await docStore.get("doc-index", { type: "json" }); } catch {}
        if (index) {
          index.docs = (index.docs || []).filter(d => d.id !== body.docId);
          await docStore.setJSON("doc-index", index);
          try { await docStore.delete(`doc-${body.docId}`); } catch {}
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
