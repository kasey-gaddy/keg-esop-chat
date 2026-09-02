import { getStore } from "@netlify/blobs";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function classifyTheme(question) {
  const q = question.toLowerCase();
  if (/my (balance|account|shares|statement|value|worth|vested amount|stock)/.test(q) ||
      /how (much do i|many shares do i|much is my|much have i)/.test(q) ||
      /check my|see my account|my specific|my personal/.test(q)) return "Confidential / Personal";
  if (/how much (will|would|could|can)|what.*worth|project|estimate|calculat|grow|in \d+ years?|at retirement|retire with/.test(q) ||
      /per year|annual.*income|salary|hourly|wealth/.test(q)) return "Theoretical Finance";
  if (/vest|vesting|years of service|how long (until|before|do i)|forfeit|leave (early|before)|quit|resign/.test(q)) return "Vesting";
  if (/retire|payout|pay out|collect|distribution|when (do i|can i) (get|receive|collect|take)|lump sum|installment|cash out/.test(q)) return "Retirement & Payouts";
  if (/tax|taxes|ira|rollover|withhold|penalty|roth|401k|early withdraw/.test(q)) return "Taxes & Distributions";
  if (/blue diamond|bdl|holding company|structure|maddux|parent company/.test(q)) return "BDL / Structure";
  if (/apply|job|career|hire|hiring|work (for|at|there)|position|opening/.test(q)) return "Recruiting / Job Seeker";
  if (/diversif/.test(q)) return "Diversification";
  if (/what is|what('s| is) (an|the) esop|how does|explain|tell me|overview|basics|understand|how.*work|what.*mean|employee.?own/.test(q)) return "General Education";
  return "Other";
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "" };

  try {
    const { question, mode, language } = JSON.parse(event.body || "{}");
    if (!question?.trim()) return { statusCode: 400, headers, body: JSON.stringify({ error: "No question" }) };

    const theme = classifyTheme(question);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const entryKey = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const entry = {
      id: entryKey,
      timestamp: now.toISOString(),
      month: monthKey,
      mode: mode || "unknown",
      language: language || "en",
      theme,
      question: question.trim(),
    };

    const store = getStore({ name: "esop-logs", consistency: "strong" });

    // Save individual entry
    await store.setJSON(entryKey, entry);

    // Update monthly summary
    let summary = await store.get(`summary-${monthKey}`, { type: "json" }) || {
      month: monthKey, total: 0, byTheme: {}, byMode: {}, byLanguage: {}, topQuestions: []
    };

    summary.total += 1;
    summary.byTheme[theme] = (summary.byTheme[theme] || 0) + 1;
    summary.byMode[mode] = (summary.byMode[mode] || 0) + 1;
    summary.byLanguage[language || "en"] = (summary.byLanguage[language || "en"] || 0) + 1;

    // Track top questions (keep latest 100 unique-ish)
    summary.topQuestions = [
      { question: question.trim(), theme, mode, timestamp: now.toISOString() },
      ...summary.topQuestions,
    ].slice(0, 100);

    await store.setJSON(`summary-${monthKey}`, summary);

    // Update index of months
    let index = await store.get("month-index", { type: "json" }) || [];
    if (!index.includes(monthKey)) {
      index = [monthKey, ...index].sort().reverse();
      await store.setJSON("month-index", index);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, theme }) };
  } catch (err) {
    console.error("log error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
