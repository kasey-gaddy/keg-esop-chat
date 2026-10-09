async function netlifyApiRequest(method, path, body) {
  const siteId = process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_API_TOKEN
  if (!siteId || !token) return null

  const url = `https://api.netlify.com/api/v1/sites/${siteId}${path}`
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  try {
    const r = await fetch(url, opts)
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      console.error('Netlify API error:', r.status, txt)
      return null
    }
    return r.json()
  } catch (e) {
    console.error('Netlify API fetch error:', e.message)
    return null
  }
}

async function upsertEnvVar(key, value) {
  const siteId = process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_API_TOKEN
  if (!siteId || !token) return false

  const payload = {
    key,
    scopes: ['builds', 'functions', 'runtime'],
    values: [{ context: 'all', value }],
  }

  // Try POST first (create), then PATCH (update) if it already exists
  const postResult = await netlifyApiRequest('POST', '/env', [payload])
  if (postResult) return true

  const patchResult = await netlifyApiRequest('PATCH', `/env/${key}`, payload)
  return !!patchResult
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers }
  }

  if (event.httpMethod === 'GET') {
    let questions = null
    let docs = []

    try {
      const savedQ = process.env.SAVED_QUESTIONS
      if (savedQ) questions = JSON.parse(savedQ)
    } catch (e) {}

    try {
      const customDocs = process.env.CUSTOM_DOCS
      if (customDocs) {
        const parsed = JSON.parse(customDocs)
        docs = parsed.map(d => ({ name: d.name, size: (d.content || '').length, uploaded: d.uploaded }))
      }
    } catch (e) {}

    const analytics = {
      total: 0,
      uniqueUsers: 0,
      employeePct: 0,
      spanishPct: 0,
      monthly: [],
      themes: [],
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analytics, questions, docs }),
    }
  }

  if (event.httpMethod === 'POST') {
    let body = {}
    try { body = JSON.parse(event.body || '{}') } catch (e) {}

    if (body.action === 'login') {
      const correct = body.password === process.env.ADMIN_PASSWORD
      return { statusCode: 200, headers, body: JSON.stringify({ success: correct }) }
    }

    if (body.action === 'saveQuestions') {
      const ok = await upsertEnvVar('SAVED_QUESTIONS', JSON.stringify(body.questions))
      return { statusCode: 200, headers, body: JSON.stringify({ success: ok }) }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}
