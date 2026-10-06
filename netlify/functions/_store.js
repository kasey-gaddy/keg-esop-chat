// Netlify Blobs via REST API — no @netlify/blobs package needed
// Works with NETLIFY_SITE_ID + NETLIFY_TOKEN injected automatically at runtime

async function blobUrl(store, key) {
  const siteId = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  return `https://api.netlify.com/api/v1/blobs/${siteId}/${store}/${encodeURIComponent(key)}`;
}

function authHeader() {
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_TOKEN;
  return { "Authorization": `Bearer ${token}` };
}

async function getJSON(store, key) {
  try {
    const url = await blobUrl(store, key);
    const res = await fetch(url, { headers: authHeader() });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function setJSON(store, key, value) {
  const url = await blobUrl(store, key);
  await fetch(url, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

async function deleteKey(store, key) {
  const url = await blobUrl(store, key);
  await fetch(url, { method: "DELETE", headers: authHeader() });
}

async function getText(store, key) {
  try {
    const url = await blobUrl(store, key);
    const res = await fetch(url, { headers: authHeader() });
    if (!res.ok) return null;
    return res.text();
  } catch { return null; }
}

async function setText(store, key, value) {
  const url = await blobUrl(store, key);
  await fetch(url, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "text/plain" },
    body: value,
  });
}

module.exports = { getJSON, setJSON, deleteKey, getText, setText };
