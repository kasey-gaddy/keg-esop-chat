const { getStore } = require("@netlify/blobs");

// Simple keyword search across document chunks
function searchDocs(docs, question) {
  if (!docs || docs.length === 0) return "";
  const q = question.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 3);

  const scored = docs.map(doc => {
    const text = (doc.content || "").toLowerCase();
    let score = 0;
    words.forEach(w => { if (text.includes(w)) score++; });
    return { ...doc, score };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) return "";

  // Return top 2 most relevant docs, truncated
  return scored.slice(0, 2).map(d =>
    `--- Document: ${d.name} ---\n${d.content.slice(0, 3000)}`
  ).join("\n\n");
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { system, messages } = JSON.parse(event.body || "{}");
    const lastQuestion = messages?.[messages.length - 1]?.content || "";

    // Load reference documents and inject relevant ones
    let docContext = "";
    try {
      const store = getStore("esop-docs");
      const indexData = await store.get("doc-index", { type: "json" });
      if (indexData?.docs?.length > 0) {
        const docs = await Promise.all(
          indexData.docs.map(async (meta) => {
            try {
              const content = await store.get(`doc-${meta.id}`, { type: "text" });
              return { ...meta, content: content || "" };
            } catch { return { ...meta, content: "" }; }
          })
        );
        docContext = searchDocs(docs, lastQuestion);
      }
    } catch (e) {
      console.log("Doc load skipped:", e.message);
    }

    // Inject doc context into system prompt if relevant
    const fullSystem = docContext
      ? `${system}\n\nREFERENCE DOCUMENTS (use these to answer accurately — cite the document name when you use them):\n\n${docContext}`
      : system;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: fullSystem,
        messages,
      }),
    });

    const data = await response.json();
    return { statusCode: response.status, headers, body: JSON.stringify(data) };
  } catch (err) {
    console.error("chat error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
