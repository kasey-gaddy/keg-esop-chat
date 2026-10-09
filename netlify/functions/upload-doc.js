// Document upload handler — uses Netlify Blobs for storage (free, no API token needed)
const { getStore } = require("@netlify/blobs");

function getBlobStore(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN,
  });
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const auth = event.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPass = process.env.ADMIN_PASSWORD || "K3&GMarketing";
  if (token !== adminPass) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };

  const store = getBlobStore("esop-docs");

  if (event.httpMethod === "POST") {
    try {
      const { name, content, fileType } = JSON.parse(event.body || "{}");
      if (!name || !content) return { statusCode: 400, headers, body: JSON.stringify({ error: "Name and content required" }) };

      // Load existing doc list
      let docs = [];
      try {
        const raw = await store.get("index");
        if (raw) docs = JSON.parse(raw);
      } catch {}

      if (docs.length >= 10) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Maximum 10 documents reached. Delete one first." }) };
      }

      const docId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const truncatedContent = content.slice(0, 50000);

      // Store doc content separately
      await store.set(`doc-${docId}`, truncatedContent);

      // Update index
      docs = [{ id: docId, name, fileType, uploadedAt: new Date().toISOString(), size: content.length }, ...docs].slice(0, 10);
      await store.set("index", JSON.stringify(docs));

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, docId, name }) };
    } catch (err) {
      console.error("upload-doc error:", err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === "DELETE") {
    try {
      const { docId } = JSON.parse(event.body || "{}");
      let docs = [];
      try {
        const raw = await store.get("index");
        if (raw) docs = JSON.parse(raw);
      } catch {}

      docs = docs.filter(d => d.id !== docId);
      await store.set("index", JSON.stringify(docs));
      try { await store.delete(`doc-${docId}`); } catch {}

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
