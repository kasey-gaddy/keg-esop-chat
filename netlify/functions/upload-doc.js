// Document upload handler
// Stores document text content via Netlify API env vars
// No @netlify/blobs — just fetch calls

async function getAccountId(token) {
  try {
    const r = await fetch("https://api.netlify.com/api/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const accounts = await r.json();
    return accounts?.[0]?.id || null;
  } catch (e) {
    return null;
  }
}

async function upsertEnvVar(siteId, token, key, value) {
  const accountId = await getAccountId(token);
  const payload = { key, scopes: ["builds", "functions", "runtime"], values: [{ context: "all", value }] };

  // POST to create (requires account_id), PATCH to update existing
  const postUrl = accountId
    ? `https://api.netlify.com/api/v1/sites/${siteId}/env?account_id=${accountId}`
    : `https://api.netlify.com/api/v1/sites/${siteId}/env`;
  const postRes = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify([payload]),
  });
  if (postRes.ok) return true;

  const patchRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return patchRes.ok;
}

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
  if (token !== adminPass) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };

  try {
    const { name, content, fileType } = JSON.parse(event.body || "{}");
    if (!name || !content) return { statusCode: 400, headers, body: JSON.stringify({ error: "Name and content required" }) };

    // Load existing docs from env var
    let docs = [];
    try {
      const raw = process.env.CUSTOM_DOCS;
      if (raw) docs = JSON.parse(raw);
    } catch {}

    // Add new doc (store up to 10 docs, truncate content to 50KB each to stay under env var limits)
    const docId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const truncatedContent = content.slice(0, 50000);
    docs = [
      { id: docId, name, fileType, uploadedAt: new Date().toISOString(), size: content.length, content: truncatedContent },
      ...docs,
    ].slice(0, 10);

    // Save back to Netlify env var
    const siteId = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
    const netlifyToken = process.env.NETLIFY_API_TOKEN;

    if (!siteId || !netlifyToken) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Add NETLIFY_SITE_ID and NETLIFY_API_TOKEN to your environment variables to enable document storage.",
        }),
      };
    }

    const saved = await upsertEnvVar(siteId, netlifyToken, "CUSTOM_DOCS", JSON.stringify(docs.map(d => ({ ...d, content: d.content }))));
    if (!saved) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: "Failed to save document." }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, docId, name }) };
  } catch (err) {
    console.error("upload-doc error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
