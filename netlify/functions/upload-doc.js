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

  const r = await fetch(url, opts)
  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    console.error('Netlify API error:', r.status, txt)
    return null
  }
  return r.json()
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' }

  // Upload
  if (event.httpMethod === 'POST') {
    const { name, content } = JSON.parse(event.body || '{}')

    if (!name || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing name or content' }) }
    }

    if (content.length > 51200) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'File too large (max 50KB)' }) }
    }

    // Get existing docs
    let docs = []
    try {
      const existing = process.env.CUSTOM_DOCS
      if (existing) docs = JSON.parse(existing)
    } catch {}

    if (docs.length >= 10) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Maximum 10 documents reached. Delete one first.' }) }
    }

    // Remove existing doc with same name
    docs = docs.filter(d => d.name !== name)
    docs.push({ name, content, uploaded: new Date().toISOString() })

    const result = await netlifyApiRequest('PATCH', '/env/CUSTOM_DOCS', {
      key: 'CUSTOM_DOCS',
      values: [{ context: 'all', value: JSON.stringify(docs) }],
    })

    if (!result) {
      console.log('Netlify API not configured — NETLIFY_SITE_ID or NETLIFY_API_TOKEN missing')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, error: 'Storage not configured. Add NETLIFY_SITE_ID and NETLIFY_API_TOKEN env vars.' }),
      }
    }

    const docList = docs.map(d => ({ name: d.name, size: (d.content || '').length, uploaded: d.uploaded }))
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, docs: docList }) }
  }

  // Delete
  if (event.httpMethod === 'DELETE') {
    const { name } = JSON.parse(event.body || '{}')

    let docs = []
    try {
      const existing = process.env.CUSTOM_DOCS
      if (existing) docs = JSON.parse(existing)
    } catch {}

    docs = docs.filter(d => d.name !== name)

    const result = await netlifyApiRequest('PATCH', '/env/CUSTOM_DOCS', {
      key: 'CUSTOM_DOCS',
      values: [{ context: 'all', value: JSON.stringify(docs) }],
    })

    const docList = docs.map(d => ({ name: d.name, size: (d.content || '').length, uploaded: d.uploaded }))
    return { statusCode: 200, headers, body: JSON.stringify({ success: !!result, docs: docList }) }
  }

  return { statusCode: 405, body: 'Method not allowed' }
}
