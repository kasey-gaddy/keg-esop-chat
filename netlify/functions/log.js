// Question logger - stores to Netlify Blobs via REST API

function classifyTheme(question) {
  const q = question.toLowerCase();
  if (/my (balance|account|shares|statement|value|worth|vested amount|stock)/.test(q) ||
      /how (much do i|many shares do i|much is my|much have i)/.test(q) ||
      /check my|see my account|my specific|my personal/.test(q)) return "Confidential / Personal";
  if (/how much (will|would|could|can)|what.*worth|project|estimate|calculat|grow|in \d+ years?|at retirement|retire with|cuánto|vale|jubil/.test(q) ||
      /per year|annual.*income|salary|hourly|wealth/.test(q)) return "Theoretical Finance";
  if (/vest|vesting|years of service|how long (until|before|do i)|forfeit|leave (early|before)|quit|resign|adquir/.test(q)) return "Vesting";
  if (/retire|payout|pay out|collect|distribution|when (do i|can i) (get|receive|collect|take)|lump sum|installment|cash out|cobrar|jubil/.test(q)) return "Retirement & Payouts";
  if (/tax|taxes|ira|rollover|withhold|penalty|roth|401k|early withdraw|impuesto/.test(q)) return "Taxes & Distributions";
  if (/blue diamond|bdl|holding company|structure|maddux|parent company/.test(q)) return "BDL / Structure";
  if (/diversif/.test(q)) return "Diversification";
  if (/apply|job|career|hire|hiring|work (for|at|there)|position|opening|empleo|trabajo/.test(q)) return "Recruiting / Job Seeker";
  if (/what is|what('s| is) (an|the) esop|how does|explain|tell me|overview|basics|understand|how.*work|what.*mean|employee.?own|qué es|cómo funciona/.test(q)) return "General Education";
  return "Other";
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "" };

  try {
    const { question, mode, language } = JSON.parse(event.body || "{}");
    if (!question?.trim()) return { statusCode: 400, headers, body: JSON.stringify({ error: "No question" }) };

    const theme = classifyTheme(question);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
    const netlifyToken = process.env.NETLIFY_TOKEN || process.env.TOKEN;

    // If no blob credentials, log to console and return success
    if (!siteId || !netlifyToken) {
      console.log(`ESOP_LOG: ${JSON.stringify({ theme, mode, language, question: question.trim(), month: monthKey })}`);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, theme, note: "logged to console" }) };
    }

    const baseUrl = `https://api.netlify.com/api/v1/blobs/${siteId}/esop-logs`;
    const authHeader = { "Authorization": `Bearer ${netlifyToken}`, "Content-Type": "application/json" };

    const fetchBlob = async (key) => {
      const res = await fetch(`${baseUrl}/${encodeURIComponent(key)}`, { headers: { "Authorization": `Bearer ${netlifyToken}` } });
      if (!res.ok) return null;
      return res.json();
    };

    const putBlob = async (key, data) => {
      await fetch(`${baseUrl}/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: authHeader,
        body: JSON.stringify(data),
      });
    };

    // Update monthly summary
    let summary = await fetchBlob(`summary-${monthKey}`) || {
      month: monthKey, total: 0, byTheme: {}, byMode: {}, byLanguage: {}, topQuestions: []
    };

    summary.total += 1;
    summary.byTheme[theme] = (summary.byTheme[theme] || 0) + 1;
    summary.byMode[mode || "unknown"] = (summary.byMode[mode || "unknown"] || 0) + 1;
    summary.byLanguage[language || "en"] = (summary.byLanguage[language || "en"] || 0) + 1;
    summary.topQuestions = [
      { question: question.trim(), theme, mode, language, timestamp: now.toISOString() },
      ...summary.topQuestions,
    ].slice(0, 100);

    await putBlob(`summary-${monthKey}`, summary);

    // Update month index
    let index = await fetchBlob("month-index") || [];
    if (!index.includes(monthKey)) {
      index = [monthKey, ...index].sort().reverse();
      await putBlob("month-index", index);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, theme }) };
  } catch (err) {
    console.error("log error:", err.message);
    // Never fail silently on the user — log errors but return success
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, note: err.message }) };
  }
};
