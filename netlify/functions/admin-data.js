// Admin data function - uses Netlify Blobs via fetch (no npm package needed)
// Password protected via ADMIN_PASSWORD env variable

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Password check
  const auth = event.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPass = process.env.ADMIN_PASSWORD || "K3&GM@rketing";

  if (token !== adminPass) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    // Read from Netlify Blobs using the REST API directly
    const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
    const token2 = process.env.NETLIFY_TOKEN || process.env.TOKEN;

    // If blobs aren't available, return empty dashboard data
    if (!siteId || !token2) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          monthIndex: [],
          summaries: [],
          aggregate: { total: 0, byTheme: {}, byMode: {}, byLanguage: {} },
          recentQuestions: [],
          note: "No log data yet — questions will appear here after users start chatting."
        }),
      };
    }

    // Try to read the month index from blobs
    const baseUrl = `https://api.netlify.com/api/v1/blobs/${siteId}/esop-logs`;
    const fetchBlob = async (key) => {
      const res = await fetch(`${baseUrl}/${encodeURIComponent(key)}`, {
        headers: { "Authorization": `Bearer ${token2}` }
      });
      if (!res.ok) return null;
      return res.json();
    };

    const monthIndex = await fetchBlob("month-index") || [];
    const recentMonths = monthIndex.slice(0, 12);

    const summaries = await Promise.all(
      recentMonths.map(async (m) => {
        const s = await fetchBlob(`summary-${m}`);
        return s || { month: m, total: 0, byTheme: {}, byMode: {}, byLanguage: {}, topQuestions: [] };
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

    const recentQuestions = summaries.flatMap(s => s.topQuestions || []).slice(0, 50);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        monthIndex: recentMonths,
        summaries,
        aggregate: { total: allTotal, byTheme: allThemes, byMode: allModes, byLanguage: allLanguages },
        recentQuestions,
      }),
    };
  } catch (err) {
    console.error("admin-data error:", err.message);
    // Return empty data rather than crashing — admin can still log in
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        monthIndex: [],
        summaries: [],
        aggregate: { total: 0, byTheme: {}, byMode: {}, byLanguage: {} },
        recentQuestions: [],
        note: "Log data unavailable: " + err.message
      }),
    };
  }
};
