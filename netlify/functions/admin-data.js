import { getStore } from "@netlify/blobs";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  // Password check via Authorization header
  const auth = event.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPass = process.env.ADMIN_PASSWORD || "K3&GM@rketing";

  if (token !== adminPass) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const store = getStore({ name: "esop-logs", consistency: "strong" });

    // Get month index
    const monthIndex = await store.get("month-index", { type: "json" }) || [];

    // Get summaries for all months (last 12)
    const recentMonths = monthIndex.slice(0, 12);
    const summaries = await Promise.all(
      recentMonths.map(async (m) => {
        const s = await store.get(`summary-${m}`, { type: "json" });
        return s || { month: m, total: 0, byTheme: {}, byMode: {}, byLanguage: {}, topQuestions: [] };
      })
    );

    // Aggregate all-time theme totals
    const allThemes = {};
    const allModes = {};
    const allLanguages = {};
    let allTotal = 0;

    summaries.forEach(s => {
      allTotal += s.total;
      Object.entries(s.byTheme || {}).forEach(([k, v]) => { allThemes[k] = (allThemes[k] || 0) + v; });
      Object.entries(s.byMode || {}).forEach(([k, v]) => { allModes[k] = (allModes[k] || 0) + v; });
      Object.entries(s.byLanguage || {}).forEach(([k, v]) => { allLanguages[k] = (allLanguages[k] || 0) + v; });
    });

    // Collect top questions across all months
    const allQuestions = summaries.flatMap(s => s.topQuestions || []);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        monthIndex: recentMonths,
        summaries,
        aggregate: { total: allTotal, byTheme: allThemes, byMode: allModes, byLanguage: allLanguages },
        recentQuestions: allQuestions.slice(0, 50),
      }),
    };
  } catch (err) {
    console.error("admin-data error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
