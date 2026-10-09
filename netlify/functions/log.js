// Uses Netlify DB - built into every Netlify site, no npm packages needed
// Netlify DB is a managed Postgres instance accessible via REST

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
  if (/rehire|re-hire|come back|return|reemploy|break.in.service/.test(q)) return "Rehire / Return";
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
    const { question, mode, language, sessionId } = JSON.parse(event.body || "{}");
    if (!question?.trim()) return { statusCode: 400, headers, body: JSON.stringify({ error: "No question" }) };

    const theme = classifyTheme(question);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Store in Netlify DB
    const dbUrl = process.env.NETLIFY_DATABASE_URL;
    if (dbUrl) {
      try {
        await fetch(`${dbUrl}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "nf-db-token": process.env.NETLIFY_DB_TOKEN || "" },
          body: JSON.stringify({
            query: `INSERT INTO esop_questions (timestamp, month, mode, language, theme, question, session_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT DO NOTHING`,
            params: [now.toISOString(), monthKey, mode || "unknown", language || "en", theme, question.trim(), sessionId || "unknown"],
          }),
        });
      } catch (dbErr) {
        console.log("DB insert skipped:", dbErr.message);
      }
    }

    // Always log to console as backup (visible in Netlify function logs)
    console.log(JSON.stringify({
      type: "ESOP_QUESTION",
      timestamp: now.toISOString(),
      month: monthKey,
      mode: mode || "unknown",
      language: language || "en",
      theme,
      question: question.trim(),
      sessionId: sessionId || "unknown",
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, theme }) };
  } catch (err) {
    console.error("log error:", err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }
};
