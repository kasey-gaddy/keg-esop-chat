function classifyTheme(question) {
  const q = question.toLowerCase();
  if (/my (balance|account|shares|statement|value|worth|vested amount|stock)/.test(q) ||
      /how (much do i|many shares do i|much is my|much have i)/.test(q) ||
      /check my|see my account/.test(q)) return "Confidential / Personal";
  if (/how much (will|would|could|can)|what.*worth|project|estimate|calculat|grow|in \d+ years?|at retirement|retire with|cuánto|vale|jubil/.test(q) ||
      /per year|annual.*income|salary|hourly|wealth/.test(q)) return "Theoretical Finance";
  if (/vest|vesting|years of service|how long (until|before|do i)|forfeit|leave (early|before)|quit|resign|adquir/.test(q)) return "Vesting";
  if (/retire|payout|pay out|collect|distribution|when (do i|can i) (get|receive|collect|take)|lump sum|installment|cash out|cobrar/.test(q)) return "Retirement & Payouts";
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
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK;

    if (!webhookUrl) {
      console.log("ESOP_LOG:", JSON.stringify({ theme, mode, language, question }));
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, theme, note: "no webhook configured" }) };
    }

    // Post to Google Apps Script — fire and forget with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          mode: mode || "unknown",
          language: language || "en",
          theme,
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      console.error("Webhook error:", fetchErr.message);
    } finally {
      clearTimeout(timeout);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, theme }) };
  } catch (err) {
    console.error("log handler error:", err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, note: err.message }) };
  }
};
