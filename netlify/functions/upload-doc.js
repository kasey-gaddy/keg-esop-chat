const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "" };

  const auth = event.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPass = process.env.ADMIN_PASSWORD || "K3&GMarketing";

  if (token !== adminPass) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const { name, content, fileType } = JSON.parse(event.body || "{}");
    if (!name || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Name and content required" }) };
    }

    const docId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const store = getStore("esop-docs");

    // Store document content as plain text
    await store.set(`doc-${docId}`, content, { metadata: { name, fileType } });

    // Update index
    let index;
    try { index = await store.get("doc-index", { type: "json" }); } catch {}
    if (!index) index = { docs: [] };

    index.docs = [
      { id: docId, name, fileType, uploadedAt: new Date().toISOString(), size: content.length },
      ...index.docs,
    ];
    await store.setJSON("doc-index", index);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, docId, name }),
    };
  } catch (err) {
    console.error("upload error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
