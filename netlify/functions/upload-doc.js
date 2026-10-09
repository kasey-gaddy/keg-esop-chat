async function netlifyApiRequest(method, path, body, queryParams) {
  const siteId = process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_API_TOKEN
  if (!siteId || !token) return null

  let url = `https://api.netlify.com/api/v1/sites/${siteId}${path}`
  if (queryParams) url += '?' + new URLSearchParams(queryParams).toString()

  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

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

async function getAccountId(token) {
  try {
    const r = await fetch('https://api.netlify.com/api/v1/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) return null
    const accounts = await r.json()
    return accounts?.[0]?.id || null
  } catch (e) {
    return null
  }
}

async function saveCustomDocs(docs) {
  const token = process.env.NETLIFY_API_TOKEN
  const accountId = await getAccountId(token)
  const value = JSON.stringify(docs)
  const payload = {
    key: 'CUSTOM_DOCS',
    scopes: ['builds', 'functions', 'runtime'],
    values: [{ context: 'all', value }],
  }

  // POST requires account_id query param to create; PATCH to update existing
  const postResult = await netlifyApiRequest('POST', '/env', [payload], accountId ? { account_id: accountId } : undefined)
  if (postResult) return true

  const patchResult = await netlifyApiRequest('PATCH', '/env/CUSTOM_DOCS', payload)
  return !!patchResult
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' }

  if (event.httpMethod === 'POST') {
    let body = {}
    try { body = JSON.parse(event.body || '{}') } catch (e) {}

    const { name, content } = body

    if (!name || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing name or content' }) }
    }

    if (content.length > 51200) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'File too large (max 50KB as text)' }) }
    }

    let docs = []
    try {
      const existing = process.env.CUSTOM_DOCS
      if (existing) docs = JSON.parse(existing)
    } catch (e) {}

    if (docs.length >= 10) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Maximum 10 documents reached. Delete one first.' }) }
    }

    docs = docs.filter(d => d.name !== name)
    docs.push({ name, content, uploaded: new Date().toISOString() })

    const ok = await saveCustomDocs(docs)

    if (!ok) {
      console.log('Netlify API not configured or failed — NETLIFY_SITE_ID/NETLIFY_API_TOKEN may be missing')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, error: 'Storage not configured. Check NETLIFY_SITE_ID and NETLIFY_API_TOKEN env vars.' }),
      }
    }

    const docList = docs.map(d => ({ name: d.name, size: (d.content || '').length, uploaded: d.uploaded }))
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, docs: docList }) }
  }

  if (event.httpMethod === 'DELETE') {
    let body = {}
    try { body = JSON.parse(event.body || '{}') } catch (e) {}

    const { name } = body

    let docs = []
    try {
      const existing = process.env.CUSTOM_DOCS
      if (existing) docs = JSON.parse(existing)
    } catch (e) {}

    docs = docs.filter(d => d.name !== name)

    const ok = await saveCustomDocs(docs)
    const docList = docs.map(d => ({ name: d.name, size: (d.content || '').length, uploaded: d.uploaded }))
    return { statusCode: 200, headers, body: JSON.stringify({ success: ok, docs: docList }) }
  }

  return { statusCode: 405, body: 'Method not allowed' }
}
