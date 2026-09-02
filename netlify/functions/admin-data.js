const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  // Password check
  const auth = event.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPass = process.env.ADMIN_PASSWORD || "K3&GM@rketing";

  if (token !== adminPass) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const store = getStore("esop-logs");

    let monthIndex = null;
    try { monthIndex = await store.get("month-index", { type: "json" }); } catch {}
    if (!monthIndex) monthIndex = [];

    const recentMonths = monthIndex.slice(0, 12);

    const summaries = await Promise.all(
      recentMonths.map(async (m) => {
        try {
          const s = await store.get(`summary-${m}`, { type: "json" });
          return s || { month: m, total: 0, byTheme: {}, byMode: {}, byLanguage: {}, topQuestions: [] };
        } catch {
          return { month: m, total: 0, byTheme: {}, byMode: {}, byLanguage: {}, topQuestions: [] };
        }
      })
    );

    const allThemes = {}, allModes = {}, allLanguages = {};
    let allTotal = 0;

    summaries.forEach(s => {
      allTotal += s.total || 0;
      Object.entries(s.byTheme || {}).forEach(([k, v]) => { allThemes[k] = (allThemes[k] || 0) + v; });
      Object.entries(s.byMode || {}).forEach(([k, v]) => { allModes[k] = (allModes[k] || 0) + v; });
      Object.entries(s.byLanguage || {}).forEach(([k, v]) => { allLanguages[k] = (allLanguages[k] || 0) + v; });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        monthIndex: recentMonths,
        summaries,
        aggregate: { total: allTotal, byTheme: allThemes, byMode: allModes, byLanguage: allLanguages },
        recentQuestions: summaries.flatMap(s => s.topQuestions || []).slice(0, 50),
      }),
    };
  } catch (err) {
    console.error("admin-data error:", err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        monthIndex: [], summaries: [],
        aggregate: { total: 0, byTheme: {}, byMode: {}, byLanguage: {} },
        recentQuestions: [],
        note: err.message
      }),
    };
  }
};
