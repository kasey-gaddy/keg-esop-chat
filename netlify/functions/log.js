const { getStore } = require("@netlify/blobs");

function getBlobStore(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { question, mode, language, sessionId, theme } = JSON.parse(event.body);
    const now = new Date();
    const month = now.toISOString().slice(0, 7); // "2026-11"

    const entry = {
      timestamp: now.toISOString(),
      month,
      question,
      mode,
      language,
      sessionId,
      theme: theme || "Other",
    };

    console.log(JSON.stringify({ type: "QUESTION_LOG", ...entry }));

    const store = getBlobStore("esop-logs");

    // 1. Update rolling list (last 500)
    let rows = [];
    try {
      const raw = await store.get("questions");
      if (raw) rows = JSON.parse(raw);
    } catch {}
    rows.unshift(entry);
    if (rows.length > 500) rows = rows.slice(0, 500);
    await store.set("questions", JSON.stringify(rows));

    // 2. Append to monthly archive — survives if rolling list is cleared
    const archiveKey = `archive-${month}`;
    let archive = [];
    try {
      const raw = await store.get(archiveKey);
      if (raw) archive = JSON.parse(raw);
    } catch {}
    archive.push(entry);
    await store.set(archiveKey, JSON.stringify(archive));

    // 3. Fire Google Sheet webhook if configured
    if (process.env.GOOGLE_SHEET_WEBHOOK) {
      fetch(process.env.GOOGLE_SHEET_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch(() => {});
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("Log function error:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: "Log failed" }) };
  }
};
